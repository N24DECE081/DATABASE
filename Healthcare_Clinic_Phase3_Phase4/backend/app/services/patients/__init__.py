"""Patient profile access and updates with ownership enforced before persistence."""
from dataclasses import replace
from ...db import transaction
from ...repositories import patients
from ...utils.validators import (
    ensure_unique_email,
    ensure_unique_phone,
    validate_dob,
    validate_email,
    validate_person_name,
    validate_phone,
    validate_text,
)
from ..common import found, ensure, now


def own_profile(user):
    ensure(user.role == "PATIENT", "Chỉ bệnh nhân được truy cập hồ sơ cá nhân tại đây.")
    return found(patients.for_user(user.user_id))


def update_profile(user, data):
    profile = own_profile(user)
    return _save_profile(profile, data)


def _save_profile(profile, data):
    allowed = {"full_name", "date_of_birth", "gender", "phone", "email", "address", "blood_type",
               "allergies", "chronic_diseases", "emergency_contact_name", "emergency_contact_phone"}
    ensure(set(data) <= allowed, "Trường hồ sơ không hợp lệ.")
    cleaned = dict(data)
    if "full_name" in cleaned and cleaned["full_name"] is not None:
        cleaned["full_name"] = validate_person_name(cleaned["full_name"], "Họ và tên")
    if "date_of_birth" in cleaned and cleaned["date_of_birth"] is not None:
        cleaned["date_of_birth"] = validate_dob(cleaned["date_of_birth"], "Ngày sinh")
    if "gender" in cleaned and cleaned["gender"] is not None:
        ensure(cleaned["gender"] in ("Male", "Female", "Other"), "Giới tính không hợp lệ.")
    if "phone" in cleaned and cleaned["phone"] is not None:
        raw_phone = str(cleaned["phone"]).strip()
        if raw_phone != profile.phone:
            cleaned["phone"] = validate_phone(raw_phone, "Số điện thoại")
            ensure_unique_phone(cleaned["phone"], exclude_patient_id=profile.patient_id)
        else:
            cleaned["phone"] = raw_phone
    if "email" in cleaned:
        email_val = validate_email(cleaned["email"], "Email", required=False)
        cleaned["email"] = email_val or None
        if cleaned["email"] and cleaned["email"] != (profile.email or "").lower():
            ensure_unique_email(cleaned["email"], exclude_patient_id=profile.patient_id, scope="patient")
    if "address" in cleaned:
        cleaned["address"] = validate_text(cleaned["address"], "Địa chỉ", max_len=255)
    if "allergies" in cleaned:
        cleaned["allergies"] = validate_text(cleaned["allergies"], "Tiền sử dị ứng", max_len=4000)
    if "chronic_diseases" in cleaned:
        cleaned["chronic_diseases"] = validate_text(cleaned["chronic_diseases"], "Bệnh nền", max_len=4000)
    if "emergency_contact_name" in cleaned and cleaned["emergency_contact_name"] is not None:
        cleaned["emergency_contact_name"] = validate_person_name(cleaned["emergency_contact_name"], "Tên người liên hệ khẩn cấp")
    if "emergency_contact_phone" in cleaned and cleaned["emergency_contact_phone"] is not None:
        raw_em_phone = str(cleaned["emergency_contact_phone"]).strip()
        if raw_em_phone != profile.emergency_contact_phone:
            cleaned["emergency_contact_phone"] = validate_phone(raw_em_phone, "Số điện thoại khẩn cấp")
        else:
            cleaned["emergency_contact_phone"] = raw_em_phone
    if "blood_type" in cleaned:
        cleaned["blood_type"] = cleaned["blood_type"] or None
        if cleaned["blood_type"]:
            ensure(cleaned["blood_type"] in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"), "Nhóm máu không hợp lệ.")
    with transaction():
        return patients.update(replace(profile, **cleaned))


def update_by_admin(user, account_id, data):
    from flask import abort
    if user.role != "ADMIN":
        abort(403)
    return _save_profile(found(patients.for_user(account_id)), data)
