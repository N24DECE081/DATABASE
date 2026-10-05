"""Validate active accounts; passwords are never stored or compared in clear text."""
from werkzeug.security import check_password_hash
from ...repositories.auth import find_by_username


def authenticate(username, password):
    user = find_by_username(username.strip())
    if user and user.account_status == "Active" and check_password_hash(user.password_hash, password):
        return user
    return None
