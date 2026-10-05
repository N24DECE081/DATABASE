"""Row representation of baseline GENERAL_PRACTITIONER; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class GeneralPractitioner:
    """GENERAL_PRACTITIONER using the approved joined-table mapping."""

    table_name: ClassVar[str] = "general_practitioner"
    doctor_id: str
