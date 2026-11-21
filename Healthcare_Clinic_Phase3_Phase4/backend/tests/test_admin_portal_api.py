from types import SimpleNamespace
from datetime import date, datetime
import pytest
from app import create_app
from app.entities import UserAccount


@pytest.fixture
def app_client():
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key-admin", "WTF_CSRF_ENABLED": False})
    return app


def test_admin_portal_api_requires_admin_role(app_client, monkeypatch):
    patient_user = SimpleNamespace(user_id="PATIENT-1", role="PATIENT", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: patient_user)
    client = app_client.test_client()
    with client.session_transaction() as session:
        session["user_id"] = patient_user.user_id

    response = client.get("/api/admin/portal")
    assert response.status_code == 403
    assert response.is_json


def test_admin_portal_api_returns_401_without_session(app_client, monkeypatch):
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: None)
    response = app_client.test_client().get("/api/admin/portal")
    assert response.status_code == 401
    assert response.is_json


def test_admin_portal_html_serves_spa(app_client, monkeypatch):
    admin_user = SimpleNamespace(user_id="USER-ADM-001", username="admin", role="ADMIN", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: admin_user)
    client = app_client.test_client()
    with client.session_transaction() as session:
        session["user_id"] = admin_user.user_id

    response = client.get("/admin/portal")
    assert response.status_code == 200
    assert b"Admin Portal | TiTiMi" in response.data
    assert b"/static/admin-portal/assets/" in response.data


def test_admin_portal_bootstrap_and_crud(app_client, monkeypatch):
    admin_user = SimpleNamespace(user_id="USER-ADM-001", username="admin", role="ADMIN", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: admin_user)
    client = app_client.test_client()
    with client.session_transaction() as session:
        session["user_id"] = admin_user.user_id

    # 1. Test portal bootstrap endpoint
    res = client.get("/api/admin/portal")
    assert res.status_code == 200
    assert res.is_json
    data = res.json
    assert "admin" in data
    assert "counts" in data
    assert "users" in data
    assert "doctors" in data
    assert "patients" in data
    assert "specialties" in data
    assert "appointments" in data
    assert "schedules" in data
    assert data["counts"]["totalUsers"] >= 1
    assert data["counts"]["doctors"] >= 1
    assert data["counts"]["patients"] >= 1

    # 2. Test users list & status toggle
    users_res = client.get("/api/admin/users")
    assert users_res.status_code == 200
    target_user = users_res.json["users"][1]  # Pick non-admin
    toggle_res = client.patch(f"/api/admin/users/{target_user['id']}/status", json={"status": "Tạm khóa"})
    assert toggle_res.status_code == 200
    # Toggle back to Active
    client.patch(f"/api/admin/users/{target_user['id']}/status", json={"status": "Hoạt động"})

    # 3. Test doctors list & update
    docs_res = client.get("/api/admin/doctors")
    assert docs_res.status_code == 200
    target_doc = docs_res.json["doctors"][0]
    doc_update_res = client.patch(f"/api/admin/doctors/{target_doc['id']}", json={
        "phone": target_doc["phone"],
        "email": target_doc["email"],
    })
    assert doc_update_res.status_code == 200

    # 4. Test patients list & update
    pats_res = client.get("/api/admin/patients")
    assert pats_res.status_code == 200
    target_pat = pats_res.json["patients"][0]
    pat_update_res = client.patch(f"/api/admin/patients/{target_pat['id']}", json={
        "phone": target_pat["phone"],
    })
    assert pat_update_res.status_code == 200

    # 5. Test specialties list, create & update
    spec_res = client.get("/api/admin/specialties")
    assert spec_res.status_code == 200
    assert len(spec_res.json["specialties"]) >= 1

    from uuid import uuid4
    unique_spec_name = f"Chuyên khoa {uuid4().hex[:6]}"
    create_spec = client.post("/api/admin/specialties", json={
        "name": unique_spec_name,
        "description": "Chuyên khoa răng hàm mặt và thẩm mỹ nụ cười",
    })
    assert create_spec.status_code == 201
    new_spec_id = create_spec.json["specialty"]["id"]
    assert new_spec_id.startswith("SPC-")

    update_spec = client.patch(f"/api/admin/specialties/{new_spec_id}", json={
        "description": "Mô tả chuyên khoa đã cập nhật",
    })
    assert update_spec.status_code == 200

    # 6. Test appointments list
    appts_res = client.get("/api/admin/appointments")
    assert appts_res.status_code == 200
    assert len(appts_res.json["appointments"]) >= 1

    # 7. Test schedules list & status update
    scheds_res = client.get("/api/admin/schedules")
    assert scheds_res.status_code == 200
    if len(scheds_res.json["schedules"]) > 0:
        first_shift = scheds_res.json["schedules"][0]
        shift_toggle = client.patch(f"/api/admin/schedules/{first_shift['id']}/status", json={"status": "Available"})
        assert shift_toggle.status_code == 200

    # 8. Test reports endpoint
    for r in (7, 30, 90):
        rep_res = client.get(f"/api/admin/reports?range={r}")
        assert rep_res.status_code == 200
        assert "metrics" in rep_res.json
        assert "csvData" in rep_res.json
        assert rep_res.json["range"] == r

    # 9. Test admin profile update
    prof_res = client.post("/api/admin/settings/profile", json={
        "name": "Quản trị viên Trưởng",
        "email": "chief_admin@titimi.vn",
        "phone": "0987654321",
    })
    assert prof_res.status_code == 200
    assert prof_res.json["admin"]["name"] == "Quản trị viên Trưởng"


def test_business_rules_and_integrity_constraints(app_client, monkeypatch):
    admin_user = SimpleNamespace(user_id="USER-ADM-001", username="admin", role="ADMIN", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: admin_user)
    client = app_client.test_client()
    with client.session_transaction() as session:
        session["user_id"] = admin_user.user_id

    # BR1-5: Cannot lock currently active admin user
    lock_self_res = client.patch(f"/api/admin/users/{admin_user.user_id}/status", json={"status": "Tạm khóa"})
    assert lock_self_res.status_code == 400
    assert "Không thể khóa tài khoản quản trị đang sử dụng" in lock_self_res.json.get("error", "")

    # BR6-12: Patient DOB in the future must be rejected
    future_pat_res = client.post("/api/admin/patients", json={
        "name": "Bệnh Nhân Tương Lai",
        "phone": "0909999888",
        "dob": "2099-01-01",
    })
    assert future_pat_res.status_code == 400
    assert "Ngày sinh không được ở tương lai" in future_pat_res.json.get("error", "")

    # BR13-20: Doctor subtype cannot be switched
    docs_res = client.get("/api/admin/doctors")
    assert docs_res.status_code == 200
    gp_doc = next((d for d in docs_res.json["doctors"] if d["subtype"] == "GENERAL_PRACTITIONER"), None)
    if gp_doc:
        invalid_switch = client.patch(f"/api/admin/doctors/{gp_doc['id']}", json={"specialty": "Tim mạch"})
        assert invalid_switch.status_code == 400
        assert "không thể chuyển sang Chuyên khoa" in invalid_switch.json.get("error", "")

    sp_doc = next((d for d in docs_res.json["doctors"] if d["subtype"] == "SPECIALIST"), None)
    if sp_doc:
        invalid_sp_switch = client.patch(f"/api/admin/doctors/{sp_doc['id']}", json={"specialty": "Đa khoa"})
        assert invalid_sp_switch.status_code == 400
        assert "không thể chuyển sang Đa khoa" in invalid_sp_switch.json.get("error", "")

    # BR21-25: Schedule validation
    if len(docs_res.json["doctors"]) > 0:
        d_id = docs_res.json["doctors"][0]["id"]
        # In past
        past_sched = client.post("/api/admin/schedules", json={
            "doctorId": d_id,
            "date": "2020-01-01",
            "startTime": "08:00",
            "endTime": "12:00",
        })
        assert past_sched.status_code == 400
        assert "quá khứ" in past_sched.json.get("error", "")

        # End time before start time
        inv_time_sched = client.post("/api/admin/schedules", json={
            "doctorId": d_id,
            "date": "2030-01-01",
            "startTime": "12:00",
            "endTime": "08:00",
        })
        assert inv_time_sched.status_code == 400
        assert "sau giờ bắt đầu" in inv_time_sched.json.get("error", "")

    # BR26-36: Appointment validation
    pats_res = client.get("/api/admin/patients")
    if len(pats_res.json["patients"]) > 0 and len(docs_res.json["doctors"]) > 0:
        p_id = pats_res.json["patients"][0]["id"]
        d_id = docs_res.json["doctors"][0]["id"]

        # Past appointment booking
        past_appt = client.post("/api/admin/appointments", json={
            "patientId": p_id,
            "doctorId": d_id,
            "dateTime": "2020-01-01 09:00:00",
            "duration": 30,
        })
        assert past_appt.status_code == 400
        assert "quá khứ" in past_appt.json.get("error", "")

        # Booking without doctor shift on that date
        no_shift_appt = client.post("/api/admin/appointments", json={
            "patientId": p_id,
            "doctorId": d_id,
            "dateTime": "2030-06-15 09:00:00",
            "duration": 30,
        })
        assert no_shift_appt.status_code == 400
        assert "ca trực" in no_shift_appt.json.get("error", "")

    # BR26-36: Appointment with consultation session cannot be Cancelled
    appts_res = client.get("/api/admin/appointments")
    session_appt = next((a for a in appts_res.json["appointments"] if a.get("hasSession")), None)
    if session_appt:
        cancel_attempt = client.patch(f"/api/admin/appointments/{session_appt['id']}/status", json={"status": "Đã hủy"})
        assert cancel_attempt.status_code == 400
        assert "phiên khám" in cancel_attempt.json.get("error", "")

