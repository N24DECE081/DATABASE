"""Row representation of baseline MEDICAL_HISTORY; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar


@dataclass(kw_only=True)
class MedicalHistory:
    """MEDICAL_HISTORY using the approved joined-table mapping."""

    table_name: ClassVar[str] = "medical_history"
    medical_history_id: str
    session_id: str
    record_date: datetime
    diagnosis: str
    symptoms: str
    progress_notes: str | None = None
