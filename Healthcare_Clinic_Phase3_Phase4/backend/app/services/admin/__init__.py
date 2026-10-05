"""Create account + exactly one required profile/subtype in a single transaction."""
from flask import abort
from werkzeug.security import generate_password_hash
from ...db import transaction
from ...entities import UserAccount, Patient, Doctor, GeneralPractitioner, Specialist, Specialty
from ...repositories import admin, doctors, patients
from ...repositories.base import insert
from ..common import ensure, identity, now


def create_account(user, data):
    if user.role != "ADMIN":
        abort(403)
    role = data["role"]
    ensure(role in ("ADMIN", "DOCTOR", "PATIENT"), "Role không hợp lệ.")
    ensure(10 <= len(data["password"]) <= 128, "Mật khẩu cần từ 10 đến 128 ký tự.")
    with transaction():
        account = insert(UserAccount(user_id=identity("U"), username=data["username"].strip(),
            password_hash=generate_password_hash(data["password"], method="pbkdf2:sha256:600000"),
            role=role, account_status="Active", created_at=now()))
        if role != "ADMIN":
            ensure(data.get("full_name") and data.get("phone"), "Cần họ tên và số điện thoại cho hồ sơ.")
        if role == "PATIENT":
            ensure(data.get("date_of_birth") and data["date_of_birth"] <= now().date(), "Ngày sinh không hợp lệ.")
            ensure(data.get("emergency_contact_name") and data.get("emergency_contact_phone"), "Cần thông tin liên hệ khẩn cấp.")
            insert(Patient(patient_id=identity("P"), user_id=account.user_id, full_name=data["full_name"],
                date_of_birth=data["date_of_birth"], gender=data["gender"], phone=data["phone"],
                email=data.get("email") or None, emergency_contact_name=data["emergency_contact_name"],
                emergency_contact_phone=data["emergency_contact_phone"]))
        elif role == "DOCTOR":
            ensure(data.get("email") and data.get("license_number"), "Cần email và số giấy phép bác sĩ.")
            doctor = insert(Doctor(doctor_id=identity("D"), user_id=account.user_id,
                full_name=data["full_name"], phone=data["phone"], email=data["email"], license_number=data["license_number"]))
            if data["subtype"] == "GENERAL_PRACTITIONER":
                insert(GeneralPractitioner(doctor_id=doctor.doctor_id))
            else:
                ensure(data.get("specialty_id"), "Bác sĩ chuyên khoa cần chọn specialty.")
                insert(Specialist(doctor_id=doctor.doctor_id, specialty_id=data["specialty_id"]))
            ensure(doctors.subtype_count(doctor.doctor_id) == 1, "Bác sĩ phải thuộc đúng một subtype.")
        return account


def change_account_status(user, user_id, status):
    if user.role != "ADMIN":
        abort(403)
    ensure(status in ("Active", "Locked", "Suspended"), "Trạng thái tài khoản không hợp lệ.")
    ensure(user_id != user.user_id, "Không thể khóa tài khoản quản trị đang sử dụng.")
    with transaction():
        ensure(admin.set_status(user_id, status) == 1, "Không tìm thấy tài khoản.")


def create_specialty(user, name, description):
    if user.role != "ADMIN":
        abort(403)
    ensure(0 < len(name.strip()) <= 100, "Tên chuyên khoa không hợp lệ.")
    with transaction():
        return insert(Specialty(specialty_id=identity("T"), specialty_name=name.strip(), description=description or None))
