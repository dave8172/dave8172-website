from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str = ""
    quantity: str = ""
    unit_price: str = ""
    amount: str = ""


class InvoiceExtraction(BaseModel):
    document_type: Literal["invoice", "receipt", "other"] = "other"
    processing_mode: Literal["embedded_text", "vision_ocr"] = "embedded_text"
    vendor: str = ""
    document_number: str = ""
    purchase_order_number: str = ""
    date: str = ""
    due_date: str = ""
    currency: str = ""
    subtotal: str = ""
    tax: str = ""
    total: str = ""
    category: str = ""
    payment_method: str = ""
    line_items: list[LineItem] = Field(default_factory=list)
    summary: str = ""


class ProcessingStats(BaseModel):
    successful_documents: int = 0
    total_processing_seconds: float = 0
    average_processing_seconds: float = 0


class JobCreateResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    filename: str = ""
    status: Literal["queued", "extracting", "analyzing", "finalizing", "completed", "failed"]
    processing_mode: str = ""
    duration_seconds: float = 0
    error: str = ""
    result: InvoiceExtraction | None = None
