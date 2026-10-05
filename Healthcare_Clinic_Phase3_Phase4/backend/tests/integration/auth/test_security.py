import pytest
from conftest import login, post, sql

pytestmark = pytest.mark.mysql


def test_csrf_is_required_and_headers_protect_authenticated_pages(client):
    assert client.post("/auth/login", data={"username":"admin","password":"ClinicDemo!2026"}).status_code == 400
    login(client, "patient_one")
    response = client.get("/patients/")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_patient_cannot_access_other_patient_or_administration(client):
    login(client, "patient_two")
    assert client.get("/appointments/A_GP").status_code == 403
    assert client.get("/consultations/C_COMPLETED").status_code == 403
    assert client.get("/prescriptions/R_DEMO").status_code == 403
    assert client.get("/admin/").status_code == 403
    assert "Synthetic diagnosis" not in client.get("/medical-history/").get_data(as_text=True)


def test_doctor_cannot_access_other_doctors_assigned_appointment(client):
    login(client, "doctor_specialist")
    assert client.get("/appointments/A_GP").status_code == 403
    assert client.get("/consultations/C_COMPLETED").status_code == 403


def test_locked_account_cannot_login_or_keep_old_session(app, client):
    login(client,"patient_one")
    sql(app,"UPDATE user_account SET account_status='Locked' WHERE user_id='U_PATIENT1'")
    assert client.get("/patients/").status_code == 302
    response = post(client,"/auth/login",{"username":"patient_one","password":"ClinicDemo!2026"})
    assert response.status_code == 200
    with client.session_transaction() as state:
        assert "user_id" not in state


def test_sql_injection_username_does_not_authenticate(client):
    response=post(client,"/auth/login",{"username":"admin' OR 1=1 --","password":"ClinicDemo!2026"})
    assert response.status_code == 200
    with client.session_transaction() as state:
        assert "user_id" not in state


def test_app_database_account_cannot_drop_or_delete(app):
    from app.db import execute
    import mysql.connector
    with app.app_context():
        with pytest.raises(mysql.connector.Error) as denied:
            execute("DELETE FROM user_account WHERE user_id = %s", ("U_ADMIN",))
        assert denied.value.errno == 1142
