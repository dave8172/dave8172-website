from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import shutil
import os

app = FastAPI()

@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    input_path = f"temp_{file.filename}"
    output_path = "output.xlsx"

    # save uploaded file
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # TODO: your OCR + conversion logic here
    # For now: dummy Excel file
    with open(output_path, "wb") as f:
        f.write(b"Excel placeholder")

    return FileResponse(output_path, filename="converted.xlsx")
