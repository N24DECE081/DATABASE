"""Row representation of baseline APPOINTMENT; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar, Literal


@dataclass(kw_only=True)
class Appointment:
    """APPOINTMENT using the approved joined-table mapping."""

    table_name: ClassVar[str] = "appointment"
    appointment_id: str
    patient_id: str
    doctor_id: str
    schedule_id: str
    booked_by_user_id: str
    follow_up_from_appt_id: str | None = None
    appointment_date_time: datetime
    estimated_duration_minutes: Literal[15, 30, 45, 60]
    appointment_type: Literal['In-person', 'Telemedicine']
    status: Literal['Scheduled', 'Checked-In', 'Completed', 'Cancelled', 'No-show']
    reason: str | None = None
