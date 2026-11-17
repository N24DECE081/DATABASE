"""JaaS room creation and short-lived, role-scoped meeting tokens."""

import re
import secrets
from datetime import timedelta, timezone
from urllib.parse import urlencode, urlsplit

import jwt
from flask import abort, current_app

from .common import now


_CLINIC_TIMEZONE = timezone(timedelta(hours=7))
_ROOM_PATTERN = re.compile(r"titimi-[a-f0-9]{32}\Z")
_IDENTIFIER_PATTERN = re.compile(r"[A-Za-z0-9_-]+\Z")


def _clinic_naive(value):
    if value.tzinfo is None:
        return value
    return value.astimezone(_CLINIC_TIMEZONE).replace(tzinfo=None)


def _credentials():
    app_id = current_app.config.get("JAAS_APP_ID", "")
    key_id = current_app.config.get("JAAS_API_KEY_ID", "")
    private_key = current_app.config.get("JAAS_PRIVATE_KEY", "")
    if (
        not isinstance(app_id, str)
        or not _IDENTIFIER_PATTERN.fullmatch(app_id)
        or not isinstance(key_id, str)
        or not _IDENTIFIER_PATTERN.fullmatch(key_id)
        or not isinstance(private_key, str)
        or not private_key.strip()
    ):
        abort(503, description="Dịch vụ phòng họp JaaS chưa được cấu hình đầy đủ.")
    return app_id, key_id, private_key.replace("\\n", "\n")


def is_configured():
    """Return whether the minimum JaaS credentials are present and well-formed."""
    app_id = current_app.config.get("JAAS_APP_ID", "")
    key_id = current_app.config.get("JAAS_API_KEY_ID", "")
    private_key = current_app.config.get("JAAS_PRIVATE_KEY", "")
    return (
        isinstance(app_id, str)
        and bool(_IDENTIFIER_PATTERN.fullmatch(app_id))
        and isinstance(key_id, str)
        and bool(_IDENTIFIER_PATTERN.fullmatch(key_id))
        and isinstance(private_key, str)
        and bool(private_key.strip())
    )


def new_room_url():
    app_id, _, _ = _credentials()
    room_name = f"titimi-{secrets.token_hex(16)}"
    return f"https://8x8.vc/{app_id}/{room_name}"


def is_room_url(meeting_url):
    app_id = current_app.config.get("JAAS_APP_ID", "")
    if not isinstance(app_id, str) or not _IDENTIFIER_PATTERN.fullmatch(app_id):
        return False
    parsed = urlsplit(meeting_url or "")
    parts = parsed.path.strip("/").split("/")
    return (
        parsed.scheme == "https"
        and parsed.netloc == "8x8.vc"
        and len(parts) == 2
        and parts[0] == app_id
        and bool(_ROOM_PATTERN.fullmatch(parts[1]))
        and not parsed.query
        and not parsed.fragment
    )


def room_name(meeting_url):
    if not is_room_url(meeting_url):
        abort(409, description="Phòng họp JaaS chưa được tạo hợp lệ.")
    return urlsplit(meeting_url).path.strip("/").split("/")[1]


def join_window(appointment):
    if isinstance(appointment, dict):
        starts = appointment["appointment_date_time"]
        duration_minutes = appointment["estimated_duration_minutes"]
    else:
        starts = appointment.appointment_date_time
        duration_minutes = appointment.estimated_duration_minutes
    early_minutes = current_app.config["JAAS_JOIN_EARLY_MINUTES"]
    grace_minutes = current_app.config["JAAS_JOIN_GRACE_MINUTES"]
    ends = starts + timedelta(minutes=duration_minutes + grace_minutes)
    return starts - timedelta(minutes=early_minutes), ends


def may_join(appointment, at=None):
    opens, closes = join_window(appointment)
    current_time = _clinic_naive(at or now())
    return opens <= current_time <= closes


def issue_token(meeting_url, user_id, display_name, *, moderator, expires_at):
    app_id, key_id, private_key = _credentials()
    room = room_name(meeting_url)
    current_time = _clinic_naive(now()).replace(tzinfo=_CLINIC_TIMEZONE)
    expiry = expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=_CLINIC_TIMEZONE)
    else:
        expiry = expiry.astimezone(_CLINIC_TIMEZONE)
    expires_timestamp = int(expiry.timestamp())
    if expires_timestamp <= int(current_time.timestamp()):
        abort(403, description="Phòng họp đã hết thời gian tham gia.")

    claims = {
        "aud": "jitsi",
        "iss": "chat",
        "sub": app_id,
        "room": room,
        "nbf": int((current_time - timedelta(seconds=30)).timestamp()),
        "exp": expires_timestamp,
        "context": {
            "user": {
                "id": str(user_id),
                "name": display_name[:100],
                "moderator": "true" if moderator else "false",
            },
            "room": {"regex": False},
            "features": {
                "recording": False,
                "livestreaming": False,
                "transcription": False,
            },
        },
    }
    try:
        return jwt.encode(
            claims,
            private_key,
            algorithm="RS256",
            headers={"kid": f"{app_id}/{key_id}", "typ": "JWT"},
        )
    except NotImplementedError:
        current_app.logger.error("JaaS RS256 signing is unavailable; install PyJWT[crypto].")
        abort(503, description="Thiếu thư viện cryptography để ký JWT JaaS.")
    except (jwt.PyJWTError, ValueError):
        current_app.logger.error("JaaS private key is invalid; meeting token was not issued.")
        abort(503, description="Khóa ký JWT JaaS không hợp lệ.")


def iframe_url(meeting_url, token):
    room = room_name(meeting_url)
    app_id, _, _ = _credentials()
    return f"https://8x8.vc/{app_id}/{room}?{urlencode({'jwt': token})}"
