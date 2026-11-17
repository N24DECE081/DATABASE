from datetime import datetime
from types import SimpleNamespace

from app import create_app
from app.blueprints import doctor_portal_api


def doctor_client(monkeypatch):
    doctor = SimpleNamespace(user_id="DOCTOR-1", role="DOCTOR", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: doctor)
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-key",
        "WTF_CSRF_ENABLED": False,
        "JAAS_APP_ID": "test-app",
        "JAAS_API_KEY_ID": "test-key",
        "JAAS_PRIVATE_KEY": "test-private-key",
    })
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = doctor.user_id
    return client


def test_create_consultation_serializes_clinical_fields_and_online_call(monkeypatch):
    client = doctor_client(monkeypatch)
    start_time = datetime(2026, 11, 17, 9, 30)
    session = SimpleNamespace(
        session_id="CONSULT-1",
        appointment_id="APT-1",
        start_time=start_time,
        end_time=None,
        actual_duration_minutes=5,
        meeting_url="https://8x8.vc/test-app/titimi-0123456789abcdef0123456789abcdef",
        diagnosis_notes="Lý do khám:\nĐau bụng\n\nChẩn đoán:\nViêm dạ dày",
    )
    appointment = {
        "appointment_id": "APT-1",
        "patient_id": "PAT-1",
        "patient_name": "Bệnh nhân Kiểm thử",
        "appointment_date_time": start_time,
        "appointment_type": "Telemedicine",
    }
    monkeypatch.setattr(doctor_portal_api, "now", lambda: start_time)
    monkeypatch.setattr(doctor_portal_api.appointments, "details", lambda _id: appointment)
    monkeypatch.setattr(
        doctor_portal_api.consultation_service,
        "create",
        lambda *_args: session,
    )

    response = client.post(
        "/api/doctor/appointments/APT-1/consultation",
        json={
            "diagnosis_notes": session.diagnosis_notes,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["consultation"]
    assert data["id"] == "CONSULT-1"
    assert data["complaint"] == "Đau bụng"
    assert data["diagnosis"] == "Viêm dạ dày"
    assert data["meetingUrl"] == session.meeting_url
    assert data["modality"] == "Tư vấn trực tuyến"


def test_create_consultation_rejects_client_supplied_meeting_url(monkeypatch):
    client = doctor_client(monkeypatch)
    service_called = False

    def create(*_args):
        nonlocal service_called
        service_called = True

    monkeypatch.setattr(doctor_portal_api.consultation_service, "create", create)

    response = client.post(
        "/api/doctor/appointments/APT-1/consultation",
        json={"meeting_url": "https://8x8.vc/test-app/titimi-forged", "diagnosis_notes": ""},
    )

    assert response.status_code == 400
    assert not service_called


def test_update_consultation_saves_notes_without_changing_meeting_url(monkeypatch):
    client = doctor_client(monkeypatch)
    session = SimpleNamespace(
        session_id="CONSULT-1",
        diagnosis_notes="Chẩn đoán:\nĐau đầu",
        meeting_url="https://8x8.vc/test-app/titimi-0123456789abcdef0123456789abcdef",
    )
    calls = []

    def update_notes(*args):
        calls.append(args)
        return session

    monkeypatch.setattr(doctor_portal_api.consultation_service, "update_notes", update_notes)

    response = client.patch(
        "/api/doctor/consultations/CONSULT-1",
        json={
            "diagnosis_notes": session.diagnosis_notes,
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "session_id": "CONSULT-1",
        "diagnosis_notes": session.diagnosis_notes,
    }
    assert calls[0][1:] == (
        "CONSULT-1",
        session.diagnosis_notes,
    )
