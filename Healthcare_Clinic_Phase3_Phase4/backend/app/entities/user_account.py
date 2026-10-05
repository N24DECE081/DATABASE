"""Row representation of baseline USER_ACCOUNT; integrity is enforced by DB/services."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import ClassVar, Literal


@dataclass(kw_only=True)
class UserAccount:
    """USER_ACCOUNT using the approved joined-table mapping."""

    table_name: ClassVar[str] = "user_account"
    user_id: str
    username: str
    password_hash: str = field(repr=False)
    role: Literal['ADMIN', 'DOCTOR', 'PATIENT']
    account_status: Literal['Active', 'Locked', 'Suspended']
    created_at: datetime
