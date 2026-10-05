"""Row representation of baseline DOCTOR_SCHEDULE; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import date, time
from typing import ClassVar, Literal


@dataclass(kw_only=True)
class DoctorSchedule:
    """DOCTOR_SCHEDULE using the approved joined-table mapping."""

    table_name: ClassVar[str] = "doctor_schedule"
    schedule_id: str
    doctor_id: str
    schedule_date: date
    start_time: time
    end_time: time
    availability_status: Literal['Available', 'Busy', 'On Leave']
