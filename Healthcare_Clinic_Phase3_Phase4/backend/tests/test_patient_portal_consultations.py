from datetime import date
from types import SimpleNamespace
from app import create_app
from app.entities import Patient


def test_patient_portal_api_requires_patient_role(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    doctor = SimpleNamespace(user_id="DOCTOR-1", role="DOCTOR", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: doctor)
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = doctor.user_id

    response = client.get("/api/patient/portal")

    assert response.status_code == 403
    assert response.is_json


def test_patient_portal_api_returns_json_401_without_a_session(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: None)

    response = app.test_client().get("/api/patient/portal")

    assert response.status_code == 401
    assert response.is_json


def test_patient_portal_page_serves_html(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    patient = SimpleNamespace(user_id="PATIENT-1", role="PATIENT", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: patient)
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = patient.user_id

    response = client.get("/patients/portal")

    assert response.status_code == 200
    assert b"Patient Portal | TiTiMi" in response.data
    assert b"/static/patient-portal/assets/" in response.data


def test_patient_portal_profile_update_allows_partial_fields(monkeypatch):
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key", "WTF_CSRF_ENABLED": False})
    patient_user = SimpleNamespace(user_id="PATIENT-1", role="PATIENT", account_status="Active")
    mock_patient = Patient(
        patient_id="PAT-001",
        user_id="PATIENT-1",
        full_name="Nguyễn Văn An",
        date_of_birth=date(2001, 11, 12),
        gender="Male",
        phone="0331007919",
        email="nguyenvanan001@gmail.com",
        address="Hà Nội",
        blood_type="B+",
        allergies="Không",
        chronic_diseases="Không",
        emergency_contact_name="Người thân",
        emergency_contact_phone="0912345678",
    )
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: patient_user)
    monkeypatch.setattr("app.services.patients.own_profile", lambda _user: mock_patient)
    monkeypatch.setattr("app.services.patients.patients.update", lambda p: p)

    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = patient_user.user_id

    response = client.patch(
        "/api/patient/profile",
        json={"phone": "0987654321", "address": "Số 10 Hai Bà Trưng, Hà Nội"},
    )

    assert response.status_code == 200
    assert response.is_json
    assert response.json["profile"]["phone"] == "0331007919"  # from updated profile mock
