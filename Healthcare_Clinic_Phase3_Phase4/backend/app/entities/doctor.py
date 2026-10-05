"""Row representation of baseline DOCTOR; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class Doctor:
    """DOCTOR using the approved joined-table mapping."""

    table_name: ClassVar[str] = "doctor"
    doctor_id: str
    user_id: str
    full_name: str
    phone: str
    email: str
    license_number: str
