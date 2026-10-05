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
    if user.role not in ("ADMIN", "DOCTOR"):
        abort(403)
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != doctor_id:
        abort(403)
    ensure(set(data) <= {"full_name", "phone", "email", "license_number"}, "Trường bác sĩ không hợp lệ.")
    with transaction():
        doctor = classified_doctor(doctor_id, lock=True)
        return doctors.update(replace(doctor, **data))
