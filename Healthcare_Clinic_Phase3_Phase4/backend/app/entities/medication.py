"""Row representation of baseline MEDICATION; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class Medication:
    """MEDICATION using the approved joined-table mapping."""

    table_name: ClassVar[str] = "medication"
    medication_id: str
    medication_name: str
    description: str | None = None
