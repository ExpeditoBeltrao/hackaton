# processing.py
import json, os, shutil, base64, re
import openai
from collections import defaultdict
import tempfile

openai.api_key = os.getenv("OPENAI_API_KEY")

TEMP_DIR = tempfile.gettempdir()
DATA_DIR = os.path.join(TEMP_DIR, "data")
STATIC_DIR = os.path.join(TEMP_DIR, "static")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# --------------------
# Análise da imagem
# --------------------
def analyze_image(image_path, analysis_id=None):
    """
    Identifica os componentes do diagrama a partir da imagem.
    Retorna um JSON estruturado com components e graph.
    """
    try:
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = """
        Você é um especialista em arquitetura de software e segurança.
        Analise a imagem do diagrama de arquitetura e extraia os componentes principais.
        Retorne o resultado em JSON estrito no formato:
        {
            "components": [
                {"id": "c1", "label": "nome do componente", "type": "tipo_ex: web_server, database, service", "bbox": [x,y,w,h]}
            ],
            "graph": {
            "nodes": ["c1","c2",...],
            "edges": [["c1","c2"],["c2","c3"],...]
            }
        }
        Se não souber a posição (bbox), coloque [0,0,0,0].
        """

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você retorna sempre JSON válido."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
                    ]
                }
            ],
            max_tokens=2000
        )

        content = response.choices[0].message.content.strip()
        content_clean = re.sub(r"^```(json)?\n", "", content)
        content_clean = re.sub(r"\n```$", "", content_clean)

        try:
            data = json.loads(content_clean)
        except:
            data = {"components": [], "graph": {"nodes": [], "edges": []}, "error": f"Falha no parse JSON: {content}"}

        data["analysis_id"] = analysis_id
        data["image_url"] = f"/static/{os.path.basename(image_path)}"

        # Salvar JSON de análise
        with open(os.path.join(DATA_DIR, f"{analysis_id}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Copiar imagem para pasta estática temporária
        shutil.copy(image_path, os.path.join(STATIC_DIR, os.path.basename(image_path)))

        # Atualize a URL da imagem para refletir o novo caminho (se necessário)
        data["image_url"] = f"/static/{os.path.basename(image_path)}"

        return data
    except Exception as e:
        return {"analysis_id": analysis_id, "components": [], "graph": {"nodes": [], "edges": []}, "error": str(e)}

# --------------------
# STRIDE Mapping
# --------------------
STRIDE_MAP = {
    "user": ["Spoofing", "Repudiation", "Information Disclosure", "Elevation of Privilege"],
    "web_server": ["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"],
    "api_gateway": ["Tampering", "Information Disclosure", "Denial of Service", "Elevation of Privilege"],
    "database": ["Information Disclosure", "Tampering", "Elevation of Privilege", "Denial of Service"],
    "service": ["Tampering", "Information Disclosure", "Elevation of Privilege"],
    "storage": ["Information Disclosure", "Tampering", "Denial of Service"],
    "load_balancer": ["Denial of Service", "Tampering"],
    "identity_provider": ["Spoofing", "Repudiation", "Elevation of Privilege"],
    "default": ["Tampering", "Information Disclosure"]
}

SEVERITY_MAP = {
    "Spoofing": "High",
    "Tampering": "High",
    "Repudiation": "Medium",
    "Information Disclosure": "High",
    "Denial of Service": "Medium",
    "Elevation of Privilege": "High"
}

# --------------------
# Função STRIDE completa
# --------------------
def generate_stride_report(analysis):
    threats = []
    for comp in analysis.get("components", []):
        typ = comp.get("type", "default")
        label = comp.get("label", "Sem nome")
        candidates = STRIDE_MAP.get(typ, STRIDE_MAP["default"])
        for t in candidates:
            enriched = enrich_with_openai(t, {"label": label, "type": typ})
            threats.append({
                "title": f"{t} on {label}",
                "component": label,
                "threat_type": t,
                "severity": SEVERITY_MAP.get(t, "Medium"),
                "description": enriched["description"],
                "mitigation": enriched["mitigation"]
            })
    return {
        "analysis_id": analysis.get("analysis_id"),
        "components_count": len(analysis.get("components", [])),
        "threats": threats,
        "graph": analysis.get("graph", {})
    }

# --------------------
# STRIDE incremental
# --------------------
def generate_stride_for_component(component, analysis_id=None):
    typ = component.get("type", "default")
    label = component.get("label", "Sem nome")
    candidates = STRIDE_MAP.get(typ, STRIDE_MAP["default"])
    threats = []
    for t in candidates:
        enriched = enrich_with_openai(t, {"label": label, "type": typ})
        threats.append({
            "title": f"{t} on {label}",
            "component": label,
            "threat_type": t,
            "severity": SEVERITY_MAP.get(t, "Medium"),
            "description": enriched["description"],
            "mitigation": enriched["mitigation"]
        })
    return {"analysis_id": analysis_id, "component": label, "threats": threats}

# --------------------
# Enriquecimento com OpenAI
# --------------------
def enrich_with_openai(threat_type, component):
    """
    Retorna description e mitigation de forma robusta.
    """
    prompt = f"""
    Você é um especialista em segurança de sistemas. Para o componente "{component.get('label')}" (tipo={component.get('type')}), 
    descreva o risco da ameaça "{threat_type}" e indique estratégias de mitigação. 
    Retorne a resposta **somente** em JSON válido no seguinte formato:

    {{
      "description": "Descrição detalhada do risco da ameaça.",
      "mitigation": "Estratégias práticas de mitigação."
    }}

    Seja conciso mas completo.
    """
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            max_tokens=4000
        )
        text = response.choices[0].message.content.strip()
        text_clean = re.sub(r"^```(json)?\n","", text)
        text_clean = re.sub(r"\n```$","", text_clean)
        data = json.loads(text_clean)
        return {"description": data.get("description","").strip(), "mitigation": data.get("mitigation","").strip()}
    except:
        return {"description":"Descrição não disponível","mitigation":"Mitigação não disponível"}
