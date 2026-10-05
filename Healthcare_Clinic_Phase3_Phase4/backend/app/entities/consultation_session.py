"""Row representation of baseline CONSULTATION_SESSION; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar, Literal


@dataclass(kw_only=True)
class ConsultationSession:
    """CONSULTATION_SESSION using the approved joined-table mapping."""

    table_name: ClassVar[str] = "consultation_session"
    session_id: str
    appointment_id: str
    start_time: datetime
    end_time: datetime | None = None
    actual_duration_minutes: int
    session_type: Literal['In-person', 'Virtual']
    meeting_url: str | None = None
    diagnosis_notes: str | None = None
