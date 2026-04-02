from __future__ import annotations

import asyncio
import base64
import io
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from fastapi import HTTPException
from fastapi import UploadFile

MAX_RENDERED_PAGES = 5
MIN_EMBEDDED_TEXT_CHARS = 80
PDF_RENDER_SCALE = 2.0
JPEG_QUALITY = 85
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


@dataclass
class PreparedDocument:
    filename: str
    content_type: str
    processing_mode: str
    extracted_text: str = ""
    page_images: list[str] = field(default_factory=list)


async def prepare_document(file: UploadFile) -> PreparedDocument:
    content = await file.read()
    return await prepare_document_from_bytes(
        content=content,
        filename=file.filename or "document",
        content_type=file.content_type,
    )


async def prepare_document_from_bytes(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
) -> PreparedDocument:
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    content_type = _normalize_content_type(content_type, filename)

    if _is_pdf(content_type, filename):
        extracted_text = await asyncio.to_thread(_extract_pdf_text, content)
        if _has_usable_text(extracted_text):
            return PreparedDocument(
                filename=filename,
                content_type="application/pdf",
                processing_mode="embedded_text",
                extracted_text=extracted_text.strip(),
            )

        page_images = await asyncio.to_thread(_render_pdf_pages_as_images, content)
        if not page_images:
            raise HTTPException(status_code=400, detail="Unable to read the PDF pages.")

        return PreparedDocument(
            filename=filename,
            content_type="application/pdf",
            processing_mode="vision_ocr",
            page_images=page_images,
        )

    if content_type in SUPPORTED_IMAGE_TYPES:
        return PreparedDocument(
            filename=filename,
            content_type=content_type,
            processing_mode="vision_ocr",
            page_images=[_to_data_url(content, content_type)],
        )

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Please upload a PDF, PNG, JPG, or WEBP document.",
    )


def _extract_pdf_text(content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return "\n".join(
            page.extract_text() or ""
            for page in pdf.pages
        )


def _render_pdf_pages_as_images(content: bytes) -> list[str]:
    pdf = pdfium.PdfDocument(content)
    image_urls: list[str] = []

    try:
        total_pages = min(len(pdf), MAX_RENDERED_PAGES)
        for page_index in range(total_pages):
            page = pdf[page_index]
            bitmap = page.render(scale=PDF_RENDER_SCALE)
            image = bitmap.to_pil()
            buffer = io.BytesIO()
            image = image.convert("RGB")
            image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            image_urls.append(_to_data_url(buffer.getvalue(), "image/jpeg"))

            image.close()
            page.close()
            bitmap.close()
    finally:
        pdf.close()

    return image_urls


def _has_usable_text(text: str) -> bool:
    compact_text = " ".join(text.split())
    alphanumeric_count = sum(character.isalnum() for character in compact_text)
    return len(compact_text) >= MIN_EMBEDDED_TEXT_CHARS and alphanumeric_count >= 40


def _normalize_content_type(content_type: str | None, filename: str) -> str:
    if content_type:
        return content_type.lower()

    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    return "application/octet-stream"


def _is_pdf(content_type: str, filename: str) -> bool:
    return content_type == "application/pdf" or Path(filename).suffix.lower() == ".pdf"


def _to_data_url(content: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"
