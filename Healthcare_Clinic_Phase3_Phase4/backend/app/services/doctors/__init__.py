"""Validate total/disjoint classification whenever a doctor is used operationally."""
from flask import abort
from ...repositories import doctors
from ...entities import Doctor
from ..common import found, ensure


def own_doctor(user):
    if user.role != "DOCTOR":
        abort(403)
    return found(doctors.for_user(user.user_id))


def classified_doctor(doctor_id, *, lock=False):
    doctor = found(doctors.get(Doctor, doctor_id, lock=lock))
    ensure(doctors.subtype_count(doctor_id) == 1, "Bác sĩ phải thuộc đúng một subtype.")
    return doctor


def update_profile(user, doctor_id, data):
    from dataclasses import replace
    from ...db import transaction
    from ...utils.validators import (
        ensure_unique_email,
        ensure_unique_phone,
        validate_email,
        validate_person_name,
        validate_phone,
        validate_text,
    )
    if user.role not in ("ADMIN", "DOCTOR"):
        abort(403)
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != doctor_id:
        abort(403)
    ensure(set(data) <= {"full_name", "phone", "email", "license_number"}, "Trường bác sĩ không hợp lệ.")
    with transaction():
        doctor = classified_doctor(doctor_id, lock=True)
        cleaned = {}
        if "full_name" in data and data["full_name"] is not None:
            cleaned["full_name"] = validate_person_name(data["full_name"], "Họ và tên bác sĩ", normalize_case=False)
        if "phone" in data and data["phone"] is not None:
            raw_phone = str(data["phone"]).strip()
            if raw_phone != doctor.phone:
                cleaned["phone"] = validate_phone(raw_phone, "Số điện thoại bác sĩ")
                ensure_unique_phone(cleaned["phone"], exclude_doctor_id=doctor_id)
            else:
                cleaned["phone"] = raw_phone
        if "email" in data and data["email"] is not None:
            cleaned["email"] = validate_email(data["email"], "Email bác sĩ", required=True)
            if cleaned["email"] != (doctor.email or "").lower():
                ensure_unique_email(cleaned["email"], exclude_doctor_id=doctor_id, scope="doctor")
        if "license_number" in data and data["license_number"] is not None:
            cleaned["license_number"] = validate_text(
                data["license_number"], "Số giấy phép hành nghề", required=True, max_len=50
            )
        return doctors.update(replace(doctor, **cleaned))
