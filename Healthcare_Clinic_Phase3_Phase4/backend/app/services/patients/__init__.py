"""Patient profile access and updates with ownership enforced before persistence."""
from dataclasses import replace
from ...db import transaction
from ...repositories import patients
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
    ensure(data["date_of_birth"] <= now().date(), "Ngày sinh không được ở tương lai.")
    with transaction():
        return patients.update(replace(profile, **data))


def update_by_admin(user, account_id, data):
    from flask import abort
    if user.role != "ADMIN":
        abort(403)
    return _save_profile(found(patients.for_user(account_id)), data)
