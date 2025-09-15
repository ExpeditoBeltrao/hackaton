import json, os, shutil, base64
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")


def analyze_image(image_path, analysis_id=None):
    # Converte a imagem para base64
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

    try:
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
            max_tokens=600
        )

        content = response.choices[0].message.content.strip()

        # Garante que seja JSON válido
        try:
            data = json.loads(content)
        except Exception:
            # Se não for JSON válido, salva como erro
            data = {
                "components": [],
                "graph": {"nodes": [], "edges": []},
                "error": f"Resposta não pôde ser parseada como JSON. Conteúdo bruto: {content}"
            }

        # Adiciona metadados
        data["analysis_id"] = analysis_id
        data["image_url"] = f"/static/{os.path.basename(image_path)}"

        # Salva resultado
        out = os.path.join("data", f"{analysis_id}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        os.makedirs("static", exist_ok=True)
        shutil.copy(image_path, os.path.join("static", os.path.basename(image_path)))

        return data

    except Exception as e:
        return {
            "analysis_id": analysis_id,
            "components": [],
            "graph": {"nodes": [], "edges": []},
            "error": f"Falha na análise da imagem: {e}"
        }


STRIDE_MAP = {
    "web_server": ["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"],
    "database": ["Information Disclosure", "Tampering", "Elevation of Privilege"],
    "service": ["Tampering", "Information Disclosure", "Elevation of Privilege"],
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


def generate_stride_report(analysis):
    threats = []
    for comp in analysis.get("components", []):
        typ = comp.get("type", "default")
        candidates = STRIDE_MAP.get(typ, STRIDE_MAP["default"])
        for t in candidates:
            enriched = enrich_with_openai(t, comp)
            threats.append({
                "title": f"{t} on {comp.get('label')}",
                "component": comp.get("label"),
                "threat_type": t,
                "severity": SEVERITY_MAP.get(t, "Medium"),
                "description": enriched["description"],
                "mitigation": enriched["mitigation"]
            })
    return {
        "analysis_id": analysis.get("analysis_id"),
        "components_count": len(analysis.get("components", [])),
        "threats": threats,
        "graph": analysis.get("graph")
    }


def enrich_with_openai(threat_type, component):
    prompt = f"""
    Você é um especialista em segurança. Descreva:
    1. O risco da ameaça {threat_type} no componente {component.get('label')} (tipo={component.get('type')}).
    2. Estratégias práticas de mitigação.
    Responda em português, no formato:
    Descrição: ...
    Mitigação: ...
    """
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )
        text = response.choices[0].message.content.strip()
        desc, mit = "", ""
        for line in text.splitlines():
            if line.lower().startswith("descrição"):
                desc = line.split(":", 1)[1].strip()
            elif line.lower().startswith("mitigação"):
                mit = line.split(":", 1)[1].strip()
        return {"description": desc, "mitigation": mit}
    except Exception as e:
        return {
            "description": f"Descrição não disponível ({e})",
            "mitigation": "Mitigação não disponível"
        }
