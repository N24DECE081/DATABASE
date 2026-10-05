"""Attending doctors append history only to a completed encounter."""
from flask import abort
from ...db import transaction
from ...entities import MedicalHistory
from ...repositories import medical_history
from ..consultations import accessible_session
from ..appointments import accessible
from ..common import ensure, identity, now


def list_for(user):
    if user.role not in ("PATIENT", "DOCTOR"):
        abort(403)
    return medical_history.list_for(user)


def create(user, session_id, data):
    if user.role != "DOCTOR":
        abort(403)
    with transaction():
        session = accessible_session(user, session_id)
        appointment = accessible(user, session.appointment_id, lock=True)
        ensure(appointment.status == "Completed", "Chỉ ghi bệnh sử sau khi lịch hẹn Completed.")
        return medical_history.insert(MedicalHistory(medical_history_id=identity("H"), session_id=session_id,
            record_date=now(), diagnosis=data["diagnosis"], symptoms=data["symptoms"],
            progress_notes=data.get("progress_notes") or None))
