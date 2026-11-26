"""Attending doctors append history only to a completed encounter."""
from flask import abort
from ...db import transaction
from ...entities import MedicalHistory
from ...repositories import medical_history
from ...utils.validators import validate_text
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
    ensure(isinstance(data, dict), "Dữ liệu bệnh sử không hợp lệ.")
    diagnosis = validate_text(data.get("diagnosis"), "Chẩn đoán", required=True, max_len=255)
    symptoms = validate_text(data.get("symptoms"), "Triệu chứng", required=True, max_len=8000)
    progress_notes = validate_text(data.get("progress_notes"), "Ghi chú diễn tiến", required=False, max_len=8000)
    with transaction():
        session = accessible_session(user, session_id)
        appointment = accessible(user, session.appointment_id, lock=True)
        ensure(appointment.status == "Completed", "Chỉ ghi bệnh sử sau khi phiên khám đã hoàn thành.")
        return medical_history.insert(MedicalHistory(medical_history_id=identity("HIS-"), session_id=session_id,
            record_date=now(), diagnosis=diagnosis, symptoms=symptoms,
            progress_notes=progress_notes))
