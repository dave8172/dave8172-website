# backend/main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from pathlib import Path
from converter import pdf_to_excel
import shutil

app = FastAPI()

UPLOAD_FOLDER = Path("uploads")
OUTPUT_FOLDER = Path("outputs")
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    # Save uploaded PDF
    pdf_path = UPLOAD_FOLDER / file.filename
    with pdf_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Convert PDF → Excel
    excel_filename = file.filename.replace(".pdf", ".xlsx")
    excel_path = OUTPUT_FOLDER / excel_filename
    pdf_to_excel(str(pdf_path), str(excel_path))

    return FileResponse(str(excel_path), filename=excel_filename)
