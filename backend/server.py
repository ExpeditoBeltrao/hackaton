from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image 
from reportlab.lib import colors
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid, os, json
from collections import defaultdict
from processing import analyze_image, generate_stride_report, generate_stride_for_component
import tempfile
from fastapi.staticfiles import StaticFiles

# Diretório temporário do sistema
TEMP_DIR = tempfile.gettempdir()
UPLOADS_DIR = os.path.join(TEMP_DIR, "uploads")
REPORTS_DIR = os.path.join(TEMP_DIR, "reports")
DATA_DIR = os.path.join(TEMP_DIR, "data")
STATIC_DIR = os.path.join(TEMP_DIR, "static")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = FastAPI()

analyses = {}

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "https://fiapswsecurity.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --------------------
# Step 1: Upload
# --------------------
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    analysis_id = str(uuid.uuid4())
    try:
        file_path = os.path.join(UPLOADS_DIR, f"{analysis_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(await file.read())

        analyses[analysis_id] = {"filename": file.filename, "file_path": file_path, "components": {}, "stride_report": None}
        return {"analysis_id": analysis_id, "filename": file.filename, "message": "Upload realizado com sucesso"}
    except Exception as e:
        return {"analysis_id": analysis_id, "error": str(e)}
    
# --------------------
# Step 2: Componentes
# --------------------
@app.get("/api/components/{analysis_id}")
async def identify_components(analysis_id: str):
    analysis = analyses.get(analysis_id)
    if not analysis: 
        raise HTTPException(status_code=404, detail="Analysis not found")

    print(f"[LOG] Iniciando identificação de componentes para analysis_id={analysis_id}")

    # Executa a análise da imagem
    result = analyze_image(analysis["file_path"], analysis_id)
    raw_components = result.get("components", [])

    # Agrupa por tipo
    grouped_components = defaultdict(list)
    for comp in raw_components:
        comp_id = comp.get("id", str(uuid.uuid4()))
        label = comp.get("label", "Sem nome")
        typ = comp.get("type", "default").lower().replace(" ", "_")
        grouped_components[typ].append({
            "id": comp_id,
            "label": label,
            "type": typ
        })
        print(f"[LOG] Componente identificado: id={comp_id}, label='{label}', type='{typ}'")

    # Converte defaultdict para dict e garante fallback
    grouped_components = dict(grouped_components) if grouped_components else {"default": []}

    # Salva no objeto de análise
    analyses[analysis_id]["components"] = grouped_components

    print(f"[LOG] Finalizada identificação de componentes. Total de tipos: {len(grouped_components)}")
    for typ, comps in grouped_components.items():
        print(f"[LOG] Tipo '{typ}' -> {len(comps)} componente(s)")

    # Retorna o formato que o front espera
    return {"analysis_id": analysis_id, "components": grouped_components, "message": "Componentes identificados"}

# --------------------
# Step 3: STRIDE completo
# --------------------
@app.get("/api/stride/{analysis_id}")
async def run_stride(analysis_id: str):
    analysis = analyses.get(analysis_id)
    if not analysis: raise HTTPException(status_code=404)
    all_comps = [c for comps in analysis.get("components", {}).values() for c in comps]
    stride_report = generate_stride_report({"components": all_comps, "analysis_id": analysis_id})
    analyses[analysis_id]["stride_report"] = stride_report
    return stride_report

# --------------------
# STRIDE incremental
# --------------------
@app.post("/api/stride_incremental")
async def stride_incremental_post(data: dict):
    analysis_id = data.get("analysis_id")
    component_payload = data.get("component")
    if not component_payload: raise HTTPException(status_code=400, detail="Componente não enviado")
    analysis = analyses.get(analysis_id)
    if not analysis: raise HTTPException(status_code=404, detail="Analysis not found")

    # Procura componente pelo id
    components = [c for comps in analysis.get("components", {}).values() for c in comps]
    comp = next((c for c in components if c["id"] == component_payload.get("id")), None)
    if not comp: raise HTTPException(status_code=400, detail="Componente não encontrado")

    # Gera STRIDE incremental
    result = generate_stride_for_component(comp, analysis_id)
    if "stride_report_incremental" not in analysis:
        analysis["stride_report_incremental"] = []
    analysis["stride_report_incremental"].append(result)

    # Retorna apenas o array de threats para o frontend
    return {"threats": result["threats"]}

# --------------------
# Download de relatório
# --------------------
@app.get("/api/report/{analysis_id}/download")
async def download_report(analysis_id: str, format: str = Query("json")):
    """
    Download de relatório em JSON ou PDF.
    Ex.: /api/report/123/download?format=json ou format=pdf
    """

    # Caminhos de saída
    json_path = os.path.join(REPORTS_DIR, f"{analysis_id}_report.json")
    pdf_path = os.path.join(REPORTS_DIR, f"{analysis_id}_report.pdf")

    # Recupera análise em memória
    analysis = analyses.get(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    # --- Monta o relatório a partir do incremental ---
    # Se a análise incremental existir, usamos ela; caso contrário, gera STRIDE completo
    if "stride_report_incremental" in analysis and analysis["stride_report_incremental"]:
        # Junta todas as ameaças dos componentes incrementais
        all_threats = []
        for inc in analysis["stride_report_incremental"]:
            all_threats.extend(inc.get("threats", []))
        report = {
            "analysis_id": analysis_id,
            "components_count": len([c for comps in analysis.get("components", {}).values() for c in comps]),
            "threats": all_threats,
            "graph": {},  # se tiver grafo, pode incluir
        }
    else:
        # fallback: STRIDE completo
        all_comps = [c for comps in analysis.get("components", {}).values() for c in comps]
        report = generate_stride_report({"components": all_comps, "analysis_id": analysis_id})

    # Salva JSON atualizado em disco
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # --- Retorna JSON ---
    if format.lower() == "json":
        response = FileResponse(
            json_path,
            media_type="application/json",
            filename=f"report_{analysis_id}.json"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    # --- Retorna PDF ---
    elif format.lower() == "pdf":
        doc = SimpleDocTemplate(pdf_path, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Título
        elements.append(Paragraph(f"Relatório STRIDE - Análise {analysis_id}", styles["Title"]))
        elements.append(Spacer(1, 12))

        # Resumo
        threats = report.get("threats", [])
        grouped = defaultdict(list)
        for t in threats:
            grouped[t.get("component", "Sem nome")].append(t)

        total_comps = len(grouped)
        total_threats = len(threats)
        elements.append(Paragraph(f"Total de componentes: {total_comps}", styles["Normal"]))
        elements.append(Paragraph(f"Total de ameaças: {total_threats}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Tabelas por componente
        if grouped:
            for comp_name, comp_threats in grouped.items():
                elements.append(Paragraph(f"Componente: {comp_name}", styles["Heading2"]))
                data = [["Tipo", "Descrição", "Mitigação"]]
                for idx, t in enumerate(comp_threats, start=1):
                    data.append([
                        Paragraph(f"{idx}. {t.get('threat_type', '-')}", styles["Normal"]),
                        Paragraph(t.get("description", "-"), styles["Normal"]),
                        Paragraph(t.get("mitigation", "-"), styles["Normal"]),
                    ])
                table = Table(data, colWidths=[100, "*", 150])
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,0), colors.grey),
                    ("TEXTCOLOR", (0,0), (-1,0), colors.whitesmoke),
                    ("ALIGN", (0,0), (-1,-1), "LEFT"),
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                    ("FONTSIZE", (0,0), (-1,0), 10),
                    ("BOTTOMPADDING", (0,0), (-1,0), 8),
                    ("BACKGROUND", (0,1), (-1,-1), colors.beige),
                    ("GRID", (0,0), (-1,-1), 0.5, colors.black),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 12))
        else:
            elements.append(Paragraph("Nenhuma ameaça detectada.", styles["Normal"]))

        # Gera PDF
        doc.build(elements)

        response = FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"report_{analysis_id}.pdf"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    else:
        raise HTTPException(status_code=400, detail="Formato inválido (use json ou pdf)")
