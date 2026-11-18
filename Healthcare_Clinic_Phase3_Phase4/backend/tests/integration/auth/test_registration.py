from datetime import date, timedelta
import pytest
from conftest import post

pytestmark = pytest.mark.mysql


def test_patient_registration_page_loads(client):
    response = client.get("/auth/register")
    assert response.status_code == 200
    assert "Đăng ký bệnh nhân" in response.get_data(as_text=True)
    assert "Tài khoản đăng nhập" in response.get_data(as_text=True)


def test_patient_registration_success_and_auto_login(client):
    reg_data = {
        "username": "benhnhan_moi",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Trần Thị Mai Anh",
        "date_of_birth": "1995-06-15",
        "gender": "Female",
        "phone": "0912345678",
        "email": "maianh@example.com",
        "address": "123 Nguyễn Huệ, Q.1, TP.HCM",
        "emergency_contact_name": "Trần Văn Ba",
        "emergency_contact_phone": "0987654321",
        "blood_type": "O+",
        "allergies": "Không có",
        "chronic_diseases": "Không có",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 302
    assert "/patients" in response.headers["Location"]

    # Check dashboard loads with logged-in user
    dash = client.get("/patients/")
    assert dash.status_code == 200
    assert "Trần Thị Mai Anh" in dash.get_data(as_text=True)


def test_patient_registration_normalizes_name_casing(app, client):
    from conftest import sql
    reg_data = {
        "username": "patient_casing_test",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "  nGuyen   vaN    cu  ",
        "date_of_birth": "1998-08-20",
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "  tRan   vAn   b  ",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 302
    patient = sql(app, "SELECT full_name, emergency_contact_name FROM patient WHERE full_name='Nguyen Van Cu'", one=True)
    assert patient is not None
    assert patient["full_name"] == "Nguyen Van Cu"
    assert patient["emergency_contact_name"] == "Tran Van B"


def test_patient_registration_fails_duplicate_username(client):
    reg_data = {
        "username": "patient_one",  # already exists in demo seed
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Lê Văn C",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "Lê Văn B",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 200
    assert "Tên đăng nhập đã được sử dụng" in response.get_data(as_text=True)


def test_patient_registration_fails_mismatched_password(client):
    reg_data = {
        "username": "benhnhan_test_pwd",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "full_name": "Lê Văn D",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "Lê Văn B",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 200
    assert "Mật khẩu xác nhận không khớp" in response.get_data(as_text=True)


def test_patient_registration_fails_invalid_phone_format(client):
    reg_data = {
        "username": "benhnhan_phone_err",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Nguyễn Văn Test",
        "date_of_birth": "1992-05-10",
        "gender": "Male",
        "phone": "12345",  # Invalid format
        "emergency_contact_name": "Người Thân",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 200
    assert "Số điện thoại phải là số di động Việt Nam" in response.get_data(as_text=True)


def test_patient_registration_fails_future_or_today_date_of_birth(client):
    today_date = date.today().isoformat()
    reg_data_today = {
        "username": "benhnhan_today_dob",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Nguyễn Văn Test",
        "date_of_birth": today_date,
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "Người Thân",
        "emergency_contact_phone": "0987654321",
    }
    response_today = post(client, "/auth/register", reg_data_today)
    assert response_today.status_code == 200
    assert "Ngày sinh phải trước ngày hiện tại" in response_today.get_data(as_text=True)

    future_date = (date.today() + timedelta(days=5)).isoformat()
    reg_data_future = {
        "username": "benhnhan_future_dob",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Nguyễn Văn Test",
        "date_of_birth": future_date,
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "Người Thân",
        "emergency_contact_phone": "0987654321",
    }
    response_future = post(client, "/auth/register", reg_data_future)
    assert response_future.status_code == 200
    assert "Ngày sinh phải trước ngày hiện tại" in response_future.get_data(as_text=True)


def test_patient_registration_fails_invalid_email_format(client):
    reg_data = {
        "username": "benhnhan_bad_email",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Nguyễn Văn Test",
        "date_of_birth": "1992-05-10",
        "gender": "Male",
        "phone": "0912345678",
        "email": "not-an-email",
        "emergency_contact_name": "Người Thân",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 200
    assert "Địa chỉ email không đúng định dạng" in response.get_data(as_text=True)


def test_patient_registration_fails_invalid_username_characters(client):
    reg_data = {
        "username": "user name có dấu",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "full_name": "Nguyễn Văn Test",
        "date_of_birth": "1992-05-10",
        "gender": "Male",
        "phone": "0912345678",
        "emergency_contact_name": "Người Thân",
        "emergency_contact_phone": "0987654321",
    }
    response = post(client, "/auth/register", reg_data)
    assert response.status_code == 200
    assert "Tên đăng nhập viết liền không dấu" in response.get_data(as_text=True)
