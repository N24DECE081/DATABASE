"""Row representation of baseline SPECIALIST; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class Specialist:
    """SPECIALIST using the approved joined-table mapping."""

    table_name: ClassVar[str] = "specialist"
    doctor_id: str
    specialty_id: str
