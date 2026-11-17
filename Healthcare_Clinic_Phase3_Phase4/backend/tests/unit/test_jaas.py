from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from werkzeug.exceptions import Conflict, ServiceUnavailable

from app import create_app
from app.services import jaas


@pytest.fixture
def jaas_app():
    return create_app({
        "TESTING": True,
        "SECRET_KEY": "test-key",
        "JAAS_APP_ID": "test-app",
        "JAAS_API_KEY_ID": "key-123",
        "JAAS_PRIVATE_KEY": "test-private-key",
        "JAAS_JOIN_EARLY_MINUTES": 10,
        "JAAS_JOIN_GRACE_MINUTES": 15,
    })


def test_room_url_is_unpredictable_and_scoped_to_app(jaas_app):
    with jaas_app.app_context():
        first = jaas.new_room_url()
        second = jaas.new_room_url()
        assert jaas.is_room_url(first)

    assert first.startswith("https://8x8.vc/test-app/titimi-")
    assert first != second


def test_join_window_includes_configured_early_and_late_allowances(jaas_app):
    start = datetime(2026, 11, 17, 10, 0)
    appointment = SimpleNamespace(
        appointment_date_time=start,
        estimated_duration_minutes=30,
    )
    with jaas_app.app_context():
        assert not jaas.may_join(appointment, start - timedelta(minutes=11))
        assert jaas.may_join(appointment, start - timedelta(minutes=10))
        assert jaas.may_join(appointment, start + timedelta(minutes=45))
        assert not jaas.may_join(appointment, start + timedelta(minutes=46))


def test_join_window_compares_aware_time_in_clinic_timezone(jaas_app, monkeypatch):
    start = datetime(2026, 11, 17, 10, 0)
    appointment = SimpleNamespace(
        appointment_date_time=start,
        estimated_duration_minutes=30,
    )
    with jaas_app.app_context():
        clinic_time = timezone(timedelta(hours=7))
        monkeypatch.setattr(jaas, "now", lambda: start.replace(tzinfo=clinic_time))
        assert jaas.may_join(appointment)
        assert jaas.may_join(appointment, start.replace(tzinfo=clinic_time))


def test_token_has_room_scope_and_doctor_only_moderator_claim(jaas_app, monkeypatch):
    issued = []

    def encode(payload, key, *, algorithm, headers):
        issued.append({"payload": payload, "key": key, "algorithm": algorithm, "headers": headers})
        return "signed-token"

    monkeypatch.setattr(jaas.jwt, "encode", encode)
    monkeypatch.setattr(jaas, "now", lambda: datetime(2026, 11, 17, 10, 0))
    meeting_url = "https://8x8.vc/test-app/titimi-0123456789abcdef0123456789abcdef"
    with jaas_app.app_context():
        doctor_token = jaas.issue_token(
            meeting_url,
            "USER-DOCTOR",
            "Bác sĩ",
            moderator=True,
            expires_at=datetime(2026, 11, 17, 10, 45),
        )
        patient_token = jaas.issue_token(
            meeting_url,
            "USER-PATIENT",
            "Bệnh nhân",
            moderator=False,
            expires_at=datetime(2026, 11, 17, 10, 45),
        )

    assert doctor_token == patient_token == "signed-token"
    assert all(item["algorithm"] == "RS256" for item in issued)
    assert all(item["headers"]["kid"] == "test-app/key-123" for item in issued)
    assert all(item["payload"]["room"] == "titimi-0123456789abcdef0123456789abcdef" for item in issued)
    assert issued[0]["payload"]["context"]["user"]["moderator"] == "true"
    assert issued[0]["payload"]["context"]["user"]["id"] == "USER-DOCTOR"
    assert issued[1]["payload"]["context"]["user"]["moderator"] == "false"
    assert issued[1]["payload"]["context"]["user"]["id"] == "USER-PATIENT"
    assert all(item["payload"]["context"]["room"]["regex"] is False for item in issued)


def test_token_rejects_room_outside_configured_tenant(jaas_app):
    with jaas_app.app_context(), pytest.raises(Conflict):
        jaas.room_name("https://8x8.vc/other-app/titimi-0123456789abcdef0123456789abcdef")


def test_token_reports_missing_rs256_implementation(jaas_app, monkeypatch):
    def unavailable(*_args, **_kwargs):
        raise NotImplementedError

    monkeypatch.setattr(jaas.jwt, "encode", unavailable)
    monkeypatch.setattr(jaas, "now", lambda: datetime(2026, 11, 18, 0, 0))
    with jaas_app.app_context(), pytest.raises(ServiceUnavailable):
        jaas.issue_token(
            "https://8x8.vc/test-app/titimi-0123456789abcdef0123456789abcdef",
            "USER-DOCTOR",
            "Bác sĩ",
            moderator=True,
            expires_at=datetime(2026, 11, 18, 1, 0),
        )
