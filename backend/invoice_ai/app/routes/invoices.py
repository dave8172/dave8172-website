from fastapi import APIRouter, UploadFile, File
from app.services.pdf_parser import extract_text
from app.services.ai_extractor import analyze_invoice

router = APIRouter()

@router.post("/upload-invoice")
async def upload_invoice(file: UploadFile = File(...)):
    text = await extract_text(file)
    insights = await analyze_invoice(text)
    return insights
