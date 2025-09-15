from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import uuid, os, json
from processing import analyze_image, generate_stride_report

app = FastAPI()
STORAGE = "data"
os.makedirs(STORAGE, exist_ok=True)


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    uid = str(uuid.uuid4())
    path = os.path.join(STORAGE, uid + ext)
    with open(path, "wb") as f:
        f.write(await file.read())

    result = analyze_image(path, analysis_id=uid)

    # Se houve erro de JSON, tenta reparar minimamente
    if "error" in result and "Conteúdo bruto" in result["error"]:
        try:
            raw_content = result["error"].split("Conteúdo bruto:")[-1].strip()
            data = json.loads(raw_content)  # tenta parsear de novo
            data["analysis_id"] = uid
            data["image_url"] = f"/static/{os.path.basename(path)}"
            with open(os.path.join(STORAGE, f"{uid}.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            result = data
        except Exception:
            pass

    return JSONResponse({"analysis_id": uid})


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    p = os.path.join(STORAGE, f"{analysis_id}.json")
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Analysis not found")
    with open(p, "r", encoding="utf-8") as f:
        return JSONResponse(json.load(f))


@app.get("/api/stride/{analysis_id}")
async def get_stride(analysis_id: str):
    p = os.path.join(STORAGE, f"{analysis_id}_stride.json")
    if not os.path.exists(p):
        with open(os.path.join(STORAGE, f"{analysis_id}.json"), "r", encoding="utf-8") as f:
            analysis = json.load(f)
        report = generate_stride_report(analysis)
        return JSONResponse(report)
    with open(p, "r", encoding="utf-8") as f:
        return JSONResponse(json.load(f))


@app.get("/api/report/{analysis_id}")
async def get_report(analysis_id: str):
    p = os.path.join(STORAGE, f"{analysis_id}_report.json")
    if not os.path.exists(p):
        with open(os.path.join(STORAGE, f"{analysis_id}.json"), "r", encoding="utf-8") as f:
            analysis = json.load(f)
        report = generate_stride_report(analysis)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        return JSONResponse(report)
    return FileResponse(p, media_type="application/json")


@app.get("/api/report/{analysis_id}/download")
async def download_report(analysis_id: str):
    p = os.path.join(STORAGE, f"{analysis_id}_report.json")
    if not os.path.exists(p):
        await get_report(analysis_id)
    return FileResponse(p, media_type="application/json", filename=f"report_{analysis_id}.json")
