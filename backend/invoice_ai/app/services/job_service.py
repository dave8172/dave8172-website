from __future__ import annotations

import json
import threading
import uuid
from pathlib import Path

from app.schemas import InvoiceExtraction, JobStatusResponse

_LOCK = threading.Lock()
_JOBS_PATH = Path(__file__).resolve().parents[2] / "data" / "jobs"


def create_job(filename: str) -> JobStatusResponse:
    job = JobStatusResponse(
        job_id=uuid.uuid4().hex,
        filename=filename,
        status="queued",
    )
    _write_job(job)
    return job


def get_job(job_id: str) -> JobStatusResponse | None:
    path = _job_path(job_id)
    if not path.exists():
        return None

    with _LOCK:
        try:
            return JobStatusResponse(**json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            return None


def update_job(
    job_id: str,
    *,
    status: str,
    processing_mode: str | None = None,
    duration_seconds: float | None = None,
    error: str = "",
    result: InvoiceExtraction | None = None,
) -> JobStatusResponse:
    existing = get_job(job_id)
    if existing is None:
        raise KeyError(f"Unknown job id: {job_id}")

    updated = existing.model_copy(
        update={
            "status": status,
            "processing_mode": processing_mode if processing_mode is not None else existing.processing_mode,
            "duration_seconds": duration_seconds if duration_seconds is not None else existing.duration_seconds,
            "error": error,
            "result": result,
        }
    )
    _write_job(updated)
    return updated


def _write_job(job: JobStatusResponse) -> None:
    _JOBS_PATH.mkdir(parents=True, exist_ok=True)
    with _LOCK:
        _job_path(job.job_id).write_text(
            job.model_dump_json(),
            encoding="utf-8",
        )


def _job_path(job_id: str) -> Path:
    return _JOBS_PATH / f"{job_id}.json"
