"""Account lookup through parameterized SQL."""
from ...db import query
from ...entities import UserAccount
from ..base import get


def find_by_id(user_id):
    return get(UserAccount, user_id)


def find_by_username(username):
    row = query("SELECT * FROM user_account WHERE username = %s", (username,), one=True)
    return UserAccount(**row) if row else None
