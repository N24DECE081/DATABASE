"""Session authentication, role checks, ownership and bounded login throttling."""
from collections import deque
from functools import wraps
from time import monotonic
from urllib.parse import urlsplit

from flask import abort, current_app, g, redirect, request, session, url_for

from .repositories.auth import find_by_id


def load_user():
    g.user = None
    if request.endpoint in ("static", "health", "ready"):
        return
    user_id = session.get("user_id")
    if user_id:
        user = find_by_id(user_id)
        if user and user.account_status == "Active":
            g.user = user
        else:
            session.clear()


def require_roles(*roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if g.user is None:
                return redirect(url_for("auth.login", next=request.path))
            if roles and g.user.role not in roles:
                abort(403)
            return view(*args, **kwargs)
        return wrapped
    return decorator


def safe_next(target):
    if target and ("\\" in target or any(ord(char) < 32 for char in target)):
        return None
    parts = urlsplit(target or "")
    return target if target and target.startswith("/") and not target.startswith("//") and not parts.netloc and not parts.scheme else None


def login_allowed(key):
    attempts = current_app.extensions.setdefault("login_attempts", {})
    now = monotonic()
    # Bound process memory; this is prototype throttling, not a distributed limiter.
    for address in list(attempts):
        while attempts[address] and attempts[address][0] < now - 300:
            attempts[address].popleft()
        if not attempts[address]:
            del attempts[address]
    if len(attempts) >= 1000 and key not in attempts:
        return False
    queue = attempts.setdefault(key, deque())
    if len(queue) >= 8:
        return False
    queue.append(now)
    return True
