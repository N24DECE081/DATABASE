"""Create account + exactly one required profile/subtype in a single transaction."""
from flask import abort
from werkzeug.security import generate_password_hash
from ...db import transaction
from ...entities import UserAccount, Patient, Doctor, GeneralPractitioner, Specialist, Specialty
from ...repositories import admin, doctors, patients
from ...repositories.base import insert
from ...utils.validators import (
    ensure_unique_email,
    ensure_unique_phone,
    validate_dob,
    validate_email,
    validate_person_name,
    validate_phone,
    validate_text,
)
from ..common import ensure, identity, now


def create_account(user, data):
    if user.role != "ADMIN":
        abort(403)
    role = data["role"]
    ensure(role in ("ADMIN", "DOCTOR", "PATIENT"), "Role không hợp lệ.")
    ensure(8 <= len(data["password"]) <= 128, "Mật khẩu cần từ 8 đến 128 ký tự.")
    with transaction():
        account = insert(UserAccount(user_id=identity("U", role=role), username=data["username"].strip(),
            password_hash=generate_password_hash(data["password"], method="pbkdf2:sha256:600000"),
            role=role, account_status="Active", created_at=now()))
        if role != "ADMIN":
            full_name = validate_person_name(data.get("full_name"), "Họ và tên")
            phone = validate_phone(data.get("phone"), "Số điện thoại")
            ensure_unique_phone(phone)
        if role == "PATIENT":
            dob = validate_dob(data.get("date_of_birth"), "Ngày sinh")
            ensure(data.get("gender") in ("Male", "Female", "Other"), "Giới tính không hợp lệ.")
            em_name = validate_person_name(data.get("emergency_contact_name"), "Tên người liên hệ khẩn cấp")
            em_phone = validate_phone(data.get("emergency_contact_phone"), "Số điện thoại khẩn cấp")
            email = validate_email(data.get("email"), "Email", required=False) or None
            if email:
                ensure_unique_email(email, scope="patient")
            address = validate_text(data.get("address"), "Địa chỉ", required=False, max_len=255)
            blood_type = (data.get("blood_type") or "").strip() or None
            if blood_type:
                ensure(blood_type in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"), "Nhóm máu không hợp lệ.")
            allergies = validate_text(data.get("allergies"), "Tiền sử dị ứng", required=False, max_len=4000)
            chronic_diseases = validate_text(data.get("chronic_diseases"), "Bệnh lý nền", required=False, max_len=4000)
            insert(Patient(patient_id=identity("PAT-"), user_id=account.user_id, full_name=full_name,
                date_of_birth=dob, gender=data["gender"], phone=phone,
                email=email, address=address, blood_type=blood_type,
                allergies=allergies, chronic_diseases=chronic_diseases,
                emergency_contact_name=em_name,
                emergency_contact_phone=em_phone))
        elif role == "DOCTOR":
            email = validate_email(data.get("email"), "Email bác sĩ", required=True)
            ensure_unique_email(email, scope="doctor")
            ensure(data.get("license_number"), "Cần email và số giấy phép bác sĩ.")
            dob = validate_dob(data.get("date_of_birth"), "Ngày sinh bác sĩ", required=False, min_age=22, max_age=80)
            doctor = insert(Doctor(doctor_id=identity("DOC-"), user_id=account.user_id,
                full_name=full_name, phone=phone, email=email, license_number=data["license_number"].strip(),
                date_of_birth=dob))
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
        return insert(Specialty(specialty_id=identity("SPC-"), specialty_name=name.strip(), description=description or None))
