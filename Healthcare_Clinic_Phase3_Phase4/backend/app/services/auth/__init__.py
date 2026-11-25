"""Validate active accounts; passwords are never stored or compared in clear text."""
import re
from werkzeug.security import check_password_hash, generate_password_hash
from ...db import transaction
from ...entities import UserAccount, Patient
from ...repositories.auth import find_by_username
from ...repositories.base import insert
from ..common import ensure, found, identity, now, format_person_name
from ...utils.validators import (
    ensure_unique_email,
    ensure_unique_phone,
    validate_dob,
    validate_email,
    validate_person_name,
    validate_phone,
    validate_text,
)


def authenticate(username, password):
    user = find_by_username(username.strip())
    if user and user.account_status == "Active" and check_password_hash(user.password_hash, password):
        return user
    return None


def register_patient(data):
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    ensure(username, "Tên đăng nhập không được để trống.")
    ensure(len(username) <= 50, "Tên đăng nhập không được vượt quá 50 ký tự.")
    ensure(re.match(r'^[a-zA-Z0-9_]+$', username), "Tên đăng nhập viết liền không dấu, chỉ gồm chữ cái, chữ số và dấu gạch dưới (_).")
    ensure(not find_by_username(username), "Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.")
    ensure(len(password) >= 8, "Mật khẩu phải có ít nhất 8 ký tự.")
    ensure(password == confirm_password, "Mật khẩu xác nhận không khớp.")

    full_name = validate_person_name(data.get("full_name"), "Họ và tên")
    dob = validate_dob(data.get("date_of_birth"), "Ngày sinh")

    gender = data.get("gender")
    ensure(gender in ("Male", "Female", "Other"), "Giới tính không hợp lệ.")

    phone = validate_phone(data.get("phone"), "Số điện thoại")
    ensure_unique_phone(phone)

    emergency_name = validate_person_name(data.get("emergency_contact_name"), "Tên người liên hệ khẩn cấp")
    emergency_phone = validate_phone(data.get("emergency_contact_phone"), "Số điện thoại khẩn cấp")

    blood_type = data.get("blood_type") or None
    if blood_type:
        ensure(blood_type in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"), "Nhóm máu không hợp lệ.")

    email = validate_email(data.get("email"), "Email", required=False) or None
    if email:
        ensure_unique_email(email, scope="patient")

    address = validate_text(data.get("address"), "Địa chỉ", max_len=255)
    allergies = validate_text(data.get("allergies"), "Tiền sử dị ứng", max_len=4000)
    chronic = validate_text(data.get("chronic_diseases"), "Bệnh lý nền", max_len=4000)

    created_time = now()
    user_id = identity("USER-PAT-")
    patient_id = identity("PAT-")
    password_hash = generate_password_hash(password, method="pbkdf2:sha256:600000")

    with transaction():
        user = insert(UserAccount(
            user_id=user_id,
            username=username,
            password_hash=password_hash,
            role="PATIENT",
            account_status="Active",
            created_at=created_time,
        ))
        patient = insert(Patient(
            patient_id=patient_id,
            user_id=user_id,
            full_name=full_name,
            date_of_birth=dob,
            gender=gender,
            phone=phone,
            email=email,
            address=address,
            blood_type=blood_type,
            allergies=allergies,
            chronic_diseases=chronic,
            emergency_contact_name=emergency_name,
            emergency_contact_phone=emergency_phone,
        ))
        return user, patient

