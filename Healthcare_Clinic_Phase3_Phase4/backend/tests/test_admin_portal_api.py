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
