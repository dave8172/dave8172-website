from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from app.schemas import JobCreateResponse, JobStatusResponse, ProcessingStats
from app.services.ai_extractor import analyze_invoice
from app.services.job_service import create_job, get_job, update_job
from app.services.pdf_parser import prepare_document_from_bytes
from app.services.stats_service import get_processing_stats, record_successful_processing

router = APIRouter()


@router.post("/upload-invoice")
async def upload_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> JobCreateResponse:
    content = await file.read()
    job = create_job(file.filename or "document")
    background_tasks.add_task(
        process_document_job,
        job.job_id,
        content,
        file.filename or "document",
        file.content_type,
    )
    return JobCreateResponse(job_id=job.job_id, status=job.status)


@router.get("/jobs/{job_id}")
async def job_status(job_id: str) -> JobStatusResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.get("/processing-stats")
async def processing_stats() -> ProcessingStats:
    return get_processing_stats()


async def process_document_job(
    job_id: str,
    content: bytes,
    filename: str,
    content_type: str | None,
) -> None:
    started_at = time.perf_counter()
    try:
        update_job(job_id, status="extracting")
        document = await prepare_document_from_bytes(
            content=content,
            filename=filename,
            content_type=content_type,
        )
        update_job(
            job_id,
            status="extracting",
            processing_mode=document.processing_mode,
        )

        update_job(job_id, status="analyzing")
        extraction = await analyze_invoice(document)

        duration_seconds = time.perf_counter() - started_at
        update_job(job_id, status="finalizing")
        record_successful_processing(duration_seconds)
        update_job(job_id, status="completed", result=extraction, duration_seconds=duration_seconds)
    except Exception as exc:
        update_job(job_id, status="failed", error=str(exc))
