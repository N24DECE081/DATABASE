"""Create ongoing sessions (EndTime NULL) and close them with computed duration."""
from datetime import timedelta
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


def duration(starts, ends, reported=None):
    ensure(starts <= now(), "Giờ bắt đầu thực tế không được ở tương lai.")
    if ends is not None:
        ensure(ends <= now() and ends > starts, "Giờ kết thúc phải sau bắt đầu và không ở tương lai.")
        calc_minutes = int((ends - starts).total_seconds() // 60)
        ensure(calc_minutes in range(5, 31), "Thời lượng thực tế phải từ 5 đến 30 phút.")
        return calc_minutes
    if reported is not None:
        ensure(reported in range(5, 31), "Thời lượng thực tế phải từ 5 đến 30 phút.")
        return reported
    return None


def create(user, appointment_id, data):
    if user.role != "DOCTOR":
        abort(403)
    appointment = accessible(user, appointment_id)
    minutes = duration(data["start_time"], data.get("end_time"), data.get("actual_duration_minutes"))
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, appointment_id, lock=True)
        ensure(appointment.status in ("Checked-In", "Completed"), "Cần check-in trước khi tạo phiên khám.")
        ensure(consultations.for_appointment(appointment_id) is None, "Lịch hẹn đã có một phiên khám.")
        session = consultations.insert(ConsultationSession(session_id=identity("SES-"), appointment_id=appointment_id,
            start_time=data["start_time"], end_time=data.get("end_time"), actual_duration_minutes=minutes,
            session_type="Virtual" if appointment.appointment_type == "Telemedicine" else "In-person",
            meeting_url=data.get("meeting_url") or None, diagnosis_notes=data.get("diagnosis_notes") or None))
        if session.end_time is not None:
            appointment.status = "Completed"
            appointments.update(appointment)
        return session


def finish(user, session_id, ends=None):
    if user.role != "DOCTOR":
        abort(403)
    if ends is None:
        ends = now()
    session = accessible_session(user, session_id)
    appointment = accessible(user, session.appointment_id)
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, session.appointment_id, lock=True)
        session = accessible_session(user, session_id, lock=True)
        ensure(session.end_time is None, "Phiên khám đã kết thúc.")

        current_now = now()
        raw_minutes = int((ends - session.start_time).total_seconds() // 60)
        if raw_minutes < 5:
            # Finished very quickly (e.g. testing / demo click) -> normalize to valid minimum 5 mins
            actual_minutes = 5
            ends = current_now
            session.start_time = ends - timedelta(minutes=5)
        elif raw_minutes > 30 or ends.date() > session.start_time.date():
            # Tối đa 30 phút theo yêu cầu
            actual_minutes = min(30, max(5, appointment.estimated_duration_minutes or 30))
            ends = session.start_time + timedelta(minutes=actual_minutes)
        else:
            actual_minutes = raw_minutes

        session.actual_duration_minutes = duration(session.start_time, ends)
        session.end_time = ends
        consultations.update(session)
        appointment.status = "Completed"
        appointments.update(appointment)
        return session


def update_notes(user, session_id, notes, meeting_url=None):
    if user.role != "DOCTOR":
        abort(403)
    with transaction():
        session = accessible_session(user, session_id, lock=True)
        ensure(session.end_time is None, "Phiên khám đã kết thúc, không thể sửa ghi chú.")
        session.diagnosis_notes = notes or None
        if meeting_url is not None:
            session.meeting_url = meeting_url or None
        return consultations.update(session)
