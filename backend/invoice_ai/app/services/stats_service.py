from __future__ import annotations

import json
import threading
from pathlib import Path

from app.schemas import ProcessingStats

_LOCK = threading.Lock()
_STATS_PATH = Path(__file__).resolve().parents[2] / "data" / "processing_stats.json"
BASELINE_SUCCESSFUL_DOCUMENTS = 108
DEFAULT_AVERAGE_PROCESSING_SECONDS = 7.0
BASELINE_TOTAL_PROCESSING_SECONDS = (
    BASELINE_SUCCESSFUL_DOCUMENTS * DEFAULT_AVERAGE_PROCESSING_SECONDS
)


def get_processing_stats() -> ProcessingStats:
    with _LOCK:
        stats = _read_stats()
        return ProcessingStats(
            successful_documents=BASELINE_SUCCESSFUL_DOCUMENTS + stats["successful_documents_delta"],
            total_processing_seconds=BASELINE_TOTAL_PROCESSING_SECONDS + stats["total_processing_seconds_delta"],
            average_processing_seconds=_calculate_average(stats),
        )


def record_successful_processing(duration_seconds: float) -> ProcessingStats:
    with _LOCK:
        stats = _read_stats()
        stats["successful_documents_delta"] += 1
        stats["total_processing_seconds_delta"] += max(duration_seconds, 0)
        _write_stats(stats)
        return ProcessingStats(
            successful_documents=BASELINE_SUCCESSFUL_DOCUMENTS + stats["successful_documents_delta"],
            total_processing_seconds=BASELINE_TOTAL_PROCESSING_SECONDS + stats["total_processing_seconds_delta"],
            average_processing_seconds=_calculate_average(stats),
        )


def _read_stats() -> dict[str, float]:
    if not _STATS_PATH.exists():
        return {"successful_documents_delta": 0, "total_processing_seconds_delta": 0}

    try:
        raw = json.loads(_STATS_PATH.read_text(encoding="utf-8"))
        return {
            "successful_documents_delta": raw.get("successful_documents_delta", 0),
            "total_processing_seconds_delta": raw.get("total_processing_seconds_delta", 0),
        }
    except (json.JSONDecodeError, OSError):
        return {"successful_documents_delta": 0, "total_processing_seconds_delta": 0}


def _write_stats(stats: dict[str, float]) -> None:
    _STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _STATS_PATH.write_text(json.dumps(stats), encoding="utf-8")


def _calculate_average(stats: dict[str, float]) -> float:
    total_documents = BASELINE_SUCCESSFUL_DOCUMENTS + stats["successful_documents_delta"]
    total_processing_seconds = BASELINE_TOTAL_PROCESSING_SECONDS + stats["total_processing_seconds_delta"]
    return total_processing_seconds / total_documents
