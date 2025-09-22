import os
import uuid
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from processing import analyze_image, generate_stride_report

app = FastAPI()

# Permitir CORS para localhost frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Armazenamento simples de análises em memória (substituir por DB se necessário)
analyses = {}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    analysis_id = str(uuid.uuid4())
    try:
        # Salva temporariamente o arquivo
        os.makedirs("uploads", exist_ok=True)
        file_path = os.path.join("uploads", f"{analysis_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Analisa a imagem com OpenAI
        analysis_result = analyze_image(file_path, analysis_id)

        # Gera relatório STRIDE detalhado
        stride_report = generate_stride_report(analysis_result)

        # Armazena em memória
        analyses[analysis_id] = {
            "stride_analysis": stride_report,
            "filename": file.filename
        }

        return JSONResponse(content={"analysis_id": analysis_id, "message": "Análise STRIDE gerada com sucesso"})

    except Exception as e:
        # Retorna erro detalhado sem quebrar frontend
        return JSONResponse(content={
            "analysis_id": analysis_id,
            "error": f"Falha ao processar o arquivo: {str(e)}"
        })

@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    if analysis_id not in analyses:
        return JSONResponse(status_code=404, content={"error": "Análise não encontrada"})
    return analyses[analysis_id]
