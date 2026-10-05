"""Row representation of baseline PRESCRIPTION_ITEM; integrity is enforced by DB/services."""

from dataclasses import dataclass
from typing import ClassVar


@dataclass(kw_only=True)
class PrescriptionItem:
    """PRESCRIPTION_ITEM using the approved joined-table mapping."""

    table_name: ClassVar[str] = "prescription_item"
    prescription_item_id: str
    prescription_id: str
    medication_id: str
    dosage: str
    frequency: str
    duration: str
    special_instructions: str | None = None
