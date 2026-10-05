"""Row representation of baseline SPECIALTY; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class Specialty:
    """SPECIALTY using the approved joined-table mapping."""

    table_name: ClassVar[str] = "specialty"
    specialty_id: str
    specialty_name: str
    description: str | None = None
