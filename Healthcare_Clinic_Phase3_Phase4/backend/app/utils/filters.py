from datetime import date
from flask import abort, request


def filter_day():
    value = request.args.get("day", "")
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        abort(400)
