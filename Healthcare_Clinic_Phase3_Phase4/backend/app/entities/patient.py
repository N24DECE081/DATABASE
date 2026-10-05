"""Row representation of baseline PATIENT; integrity is enforced by DB/services."""

from dataclasses import dataclass
from datetime import date
from typing import ClassVar, Literal


@dataclass(kw_only=True)
class Patient:
    """PATIENT using the approved joined-table mapping."""

    table_name: ClassVar[str] = "patient"
    patient_id: str
    user_id: str
    full_name: str
    date_of_birth: date
    gender: Literal['Male', 'Female', 'Other']
    phone: str
    email: str | None = None
    address: str | None = None
    blood_type: Literal['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] | None = None
    allergies: str | None = None
    chronic_diseases: str | None = None
    emergency_contact_name: str
    emergency_contact_phone: str
