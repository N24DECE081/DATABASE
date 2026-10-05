"""Create ongoing sessions (EndTime NULL) and close them with computed duration."""
from flask import abort
from ...db import transaction
from ...entities import ConsultationSession
from ...repositories import consultations, appointments
from ..appointments import accessible
from ..doctors import classified_doctor
from ..common import ensure, found, identity, now


def accessible_session(user, session_id, *, lock=False):
    session = found(consultations.get(ConsultationSession, session_id, lock=lock))
    accessible(user, session.appointment_id)
    return session


def duration(starts, ends, reported):
    ensure(starts <= now(), "Giờ bắt đầu thực tế không được ở tương lai.")
    if ends is not None:
        ensure(ends <= now() and ends > starts, "Giờ kết thúc phải sau bắt đầu và không ở tương lai.")
        reported = int((ends - starts).total_seconds() // 60)
    ensure(reported in range(5, 121), "Thời lượng thực tế phải từ 5 đến 120 phút.")
    return reported


def create(user, appointment_id, data):
    if user.role != "DOCTOR":
        abort(403)
    appointment = accessible(user, appointment_id)
    minutes = duration(data["start_time"], data.get("end_time"), data["actual_duration_minutes"])
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, appointment_id, lock=True)
        ensure(appointment.status in ("Checked-In", "Completed"), "Cần check-in trước khi tạo phiên khám.")
        ensure(consultations.for_appointment(appointment_id) is None, "Lịch hẹn đã có một phiên khám.")
        session = consultations.insert(ConsultationSession(session_id=identity("C"), appointment_id=appointment_id,
            start_time=data["start_time"], end_time=data.get("end_time"), actual_duration_minutes=minutes,
            session_type="Virtual" if appointment.appointment_type == "Telemedicine" else "In-person",
            meeting_url=data.get("meeting_url") or None, diagnosis_notes=data.get("diagnosis_notes") or None))
        if session.end_time is not None:
            appointment.status = "Completed"
            appointments.update(appointment)
        return session


def finish(user, session_id, ends):
    if user.role != "DOCTOR":
        abort(403)
    session = accessible_session(user, session_id)
    appointment = accessible(user, session.appointment_id)
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, session.appointment_id, lock=True)
        session = accessible_session(user, session_id, lock=True)
        ensure(session.end_time is None, "Phiên khám đã kết thúc.")
        session.actual_duration_minutes = duration(session.start_time, ends, session.actual_duration_minutes)
        session.end_time = ends
        consultations.update(session)
        appointment.status = "Completed"
        appointments.update(appointment)
        return session
