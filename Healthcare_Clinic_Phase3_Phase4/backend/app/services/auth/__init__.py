"""Validate active accounts; passwords are never stored or compared in clear text."""
import re
from werkzeug.security import check_password_hash, generate_password_hash
from ...db import transaction
from ...entities import UserAccount, Patient
from ...repositories.auth import find_by_username
from ...repositories.base import insert
from ..common import ensure, found, identity, now, format_person_name


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

    full_name = format_person_name(data.get("full_name"))
    ensure(full_name, "Họ và tên không được để trống.")
    ensure(len(full_name) <= 100, "Họ và tên không được vượt quá 100 ký tự.")
    ensure(not any(c.isdigit() for c in full_name), "Họ và tên không được chứa chữ số.")

    dob = data.get("date_of_birth")
    ensure(dob is not None, "Ngày sinh không được để trống.")
    ensure(dob < now().date(), "Ngày sinh phải trước ngày hiện tại (không thể là hôm nay hoặc tương lai).")

    gender = data.get("gender")
    ensure(gender in ("Male", "Female", "Other"), "Giới tính không hợp lệ.")

    phone = (data.get("phone") or "").strip()
    ensure(phone, "Số điện thoại không được để trống.")
    ensure(re.match(r'^0[35789]\d{8}$', phone), "Số điện thoại phải gồm 10 chữ số di động Việt Nam (bắt đầu bằng 03, 05, 07, 08, 09).")

    emergency_name = format_person_name(data.get("emergency_contact_name"))
    emergency_phone = (data.get("emergency_contact_phone") or "").strip()
    ensure(emergency_name, "Tên người liên hệ khẩn cấp không được để trống.")
    ensure(not any(c.isdigit() for c in emergency_name), "Tên người liên hệ khẩn cấp không được chứa chữ số.")
    ensure(emergency_phone, "Số điện thoại khẩn cấp không được để trống.")
    ensure(re.match(r'^0[35789]\d{8}$', emergency_phone), "Số điện thoại khẩn cấp phải gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).")

    blood_type = data.get("blood_type") or None
    if blood_type:
        ensure(blood_type in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"), "Nhóm máu không hợp lệ.")

    email = (data.get("email") or "").strip() or None
    if email:
        ensure(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email), "Địa chỉ email không đúng định dạng.")

    address = (data.get("address") or "").strip() or None
    allergies = (data.get("allergies") or "").strip() or None
    chronic = (data.get("chronic_diseases") or "").strip() or None

    created_time = now()
    user_id = identity("USER-")
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

