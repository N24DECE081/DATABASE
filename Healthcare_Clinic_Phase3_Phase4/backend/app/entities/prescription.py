"""Row representation of baseline PRESCRIPTION; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar


@dataclass(kw_only=True)
class Prescription:
    """PRESCRIPTION using the approved joined-table mapping."""

    table_name: ClassVar[str] = "prescription"
    prescription_id: str
    session_id: str
    diagnosis_icd: str | None = None
    prescription_date: datetime
    instructions: str | None = None
