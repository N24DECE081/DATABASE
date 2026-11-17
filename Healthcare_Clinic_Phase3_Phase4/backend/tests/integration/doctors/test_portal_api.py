from datetime import date, datetime
from types import SimpleNamespace

import pytest

from app import create_app
from app.blueprints import doctor_portal_api
from conftest import login, sql


pytestmark = pytest.mark.mysql


def test_doctor_portal_returns_only_doctor_scoped_database_data(client, app):
    login(client, "doctor_gp")

    response = client.get("/api/doctor/portal")

    assert response.status_code == 200
    data = response.get_json()
    assert set(data) == {
        "profile", "appointments", "patients", "consultations",
        "records", "prescriptions", "schedules",
    }
    assert data["profile"]["id"] == "DOC-001"
    assert all(appointment["patientId"] in {patient["id"] for patient in data["patients"]}
               for appointment in data["appointments"])
    expected_ids = {
        row["appointment_id"]
        for row in sql(
            app,
            "SELECT appointment_id FROM appointment WHERE doctor_id = %s",
            (data["profile"]["id"],),
        )
    }
    assert {appointment["id"] for appointment in data["appointments"]} == expected_ids


def test_doctor_portal_api_requires_doctor_role(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    patient = SimpleNamespace(user_id="PATIENT-1", role="PATIENT", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: patient)
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = patient.user_id

    response = client.get("/api/doctor/portal")

    assert response.status_code == 403
    assert response.is_json


def test_doctor_portal_api_returns_json_401_without_a_session(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: None)

    response = app.test_client().get("/api/doctor/portal")

    assert response.status_code == 401
    assert response.is_json


def test_doctor_portal_route_serves_the_built_react_entrypoint(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    doctor = SimpleNamespace(user_id="DOCTOR-1", role="DOCTOR", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: doctor)
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = doctor.user_id

    response = client.get("/doctors/portal")

    assert response.status_code == 200
    assert b"Doctor Portal | TiTiMi" in response.data
    assert b"/static/doctor-portal/assets/" in response.data


def test_doctor_portal_serializes_appointments_and_patient_data(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    doctor_user = SimpleNamespace(user_id="DOCTOR-1", role="DOCTOR", account_status="Active")
    doctor = SimpleNamespace(
        doctor_id="DOC-1",
        full_name="Bác sĩ Kiểm thử",
        email="doctor@example.test",
        phone="0900000000",
        license_number="LIC-1",
    )
    appointment = {
        "appointment_id": "APT-1",
        "patient_id": "PAT-1",
        "patient_name": "Bệnh nhân Kiểm thử",
        "appointment_date_time": datetime(2026, 11, 17, 9, 30),
        "reason": "Tái khám",
        "follow_up_from_appt_id": None,
        "appointment_type": "In-person",
        "status": "Scheduled",
        "session_id": None,
    }
    patient = {
        "patient_id": "PAT-1",
        "full_name": "Bệnh nhân Kiểm thử",
        "gender": "Female",
        "date_of_birth": date(1990, 1, 1),
        "phone": "0910000000",
        "email": None,
        "blood_type": None,
        "allergies": None,
        "chronic_diseases": None,
    }
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: doctor_user)
    monkeypatch.setattr(doctor_portal_api.doctor_service, "own_doctor", lambda _user: doctor)
    monkeypatch.setattr(doctor_portal_api.appointments, "list_for", lambda _user: [appointment])
    monkeypatch.setattr(
        doctor_portal_api,
        "query",
        lambda _statement, _params=(): [patient] if "FROM patient WHERE" in _statement else [],
    )
    monkeypatch.setattr(doctor_portal_api.doctors, "directory", lambda: [{
        "doctor_id": "DOC-1",
        "specialty_name": "General Practitioner",
    }])
    monkeypatch.setattr(doctor_portal_api.medical_history, "list_for", lambda _user: [])
    monkeypatch.setattr(doctor_portal_api.prescriptions, "list_for", lambda _user: [])
    monkeypatch.setattr(doctor_portal_api.prescriptions, "items", lambda _prescription_id: [])
    monkeypatch.setattr(doctor_portal_api.schedules, "list_schedules", lambda _doctor_id: [])
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = doctor_user.user_id

    response = client.get("/api/doctor/portal")

    assert response.status_code == 200
    data = response.get_json()
    assert data["profile"]["specialty"] == "Bác sĩ đa khoa"
    assert data["appointments"][0] == {
        "id": "APT-1",
        "patientId": "PAT-1",
        "patient": "Bệnh nhân Kiểm thử",
        "date": "2026-11-17",
        "time": "09:30",
        "reason": "Tái khám",
        "type": "Khám mới",
        "modality": "Khám trực tiếp",
        "status": "Chờ xác nhận",
        "sessionId": None,
    }
    assert data["patients"][0]["gender"] == "Nữ"
    assert data["patients"][0]["blood"] == "Chưa ghi nhận"


def test_doctor_can_update_only_their_own_profile(client, app):
    login(client, "doctor_gp")
    csrf_token = client.get("/api/csrf").get_json()["csrf_token"]

    response = client.patch(
        "/api/doctor/profile",
        json={
            "full_name": "Bác sĩ API kiểm thử",
            "phone": "0900000000",
            "email": "doctor.api@example.test",
            "license_number": "TEST-LICENSE",
        },
        headers={"X-CSRFToken": csrf_token},
    )

    assert response.status_code == 200
    assert response.get_json()["profile"]["name"] == "Bác sĩ API kiểm thử"
    with app.test_root.cursor(dictionary=True) as cursor:
        cursor.execute("SELECT full_name, email FROM doctor WHERE doctor_id = %s", ("DOC-001",))
        doctor = cursor.fetchone()
    assert doctor == {
        "full_name": "Bác sĩ API kiểm thử",
        "email": "doctor.api@example.test",
    }


def test_doctor_profile_api_rejects_missing_fields(client):
    login(client, "doctor_gp")
    csrf_token = client.get("/api/csrf").get_json()["csrf_token"]

    response = client.patch(
        "/api/doctor/profile",
        json={"full_name": "Incomplete"},
        headers={"X-CSRFToken": csrf_token},
    )

    assert response.status_code == 400
    assert response.is_json
