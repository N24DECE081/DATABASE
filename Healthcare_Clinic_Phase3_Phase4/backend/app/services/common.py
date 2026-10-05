"""Shared validation helpers; persistent entities remain unchanged."""
from datetime import datetime
from uuid import uuid4

from flask import abort


class BusinessError(ValueError):
    pass


def identity(prefix):
    return prefix + uuid4().hex[:19 - len(prefix)]


def now():
    # Clinic DATETIME values use Asia/Bangkok (+07:00), matching the DB session.
    from datetime import timezone, timedelta
    return datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None, microsecond=0)


def ensure(condition, message):
    if not condition:
        raise BusinessError(message)


def found(value):
    if value is None:
        abort(404)
    return value
