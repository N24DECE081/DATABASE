"""Create ongoing sessions (EndTime NULL) and close them with computed duration."""
from datetime import timedelta
from flask import abort
from ...db import get_db, transaction
from ...entities import ConsultationSession
from ...repositories import consultations, appointments
from ..appointments import accessible
from ..doctors import classified_doctor
from ..common import BusinessError, ensure, found, identity, now


def accessible_session(user, session_id, *, lock=False):
    session = found(consultations.get(ConsultationSession, session_id, lock=lock))
    accessible(user, session.appointment_id)
    return session


def duration(starts, ends, reported=None):
    ensure(starts <= now(), "Giờ bắt đầu thực tế không được ở tương lai.")
    if ends is not None:
        ensure(ends <= now() and ends > starts, "Giờ kết thúc phải sau bắt đầu và không ở tương lai.")
        calc_minutes = int((ends - starts).total_seconds() // 60)
        ensure(calc_minutes <= 30, "Thời lượng thực tế tối đa 30 phút.")
        # Consultations completed before 5 minutes are recorded as 5 minutes.
        return 5 if calc_minutes < 5 else calc_minutes
    if reported is not None:
        ensure(reported in range(5, 31), "Thời lượng thực tế phải từ 5 đến 30 phút.")
        return reported
    return None


def _mark_overdue_noshow(appointment, reason_msg):
    if appointment.status in ("Scheduled", "Checked-In"):
        appointment.status = "No-show"
        appointments.update(appointment)
        get_db().commit()
    raise BusinessError(reason_msg)


def create(user, appointment_id, data):
    if user.role != "DOCTOR":
        abort(403)
    appointment = accessible(user, appointment_id)
    minutes = duration(data["start_time"], data.get("end_time"), data.get("actual_duration_minutes"))
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, appointment_id, lock=True)
        window_end = appointment.appointment_date_time + timedelta(minutes=appointment.estimated_duration_minutes)
        current_time = now()
        if current_time > window_end:
            _mark_overdue_noshow(
                appointment,
                "Đã quá thời hạn 30 phút của lịch hẹn, không thể ghi nhận phiên khám. Lịch hẹn đã được chuyển sang Vắng mặt (No-show).",
            )
        ensure(appointment.status in ("Checked-In", "Completed"), "Cần check-in trước khi tạo phiên khám.")
        ensure(consultations.for_appointment(appointment_id) is None, "Lịch hẹn đã có một phiên khám.")
        ensure(appointment.appointment_date_time <= data["start_time"] <= current_time <= window_end,
               "Chỉ được bắt đầu phiên khám trong cửa sổ thời gian của lịch hẹn.")
        ensure(data.get("end_time") is None or data["end_time"] <= window_end,
               "Giờ kết thúc vượt quá cửa sổ thời gian của lịch hẹn.")
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
    auto_end = ends is None
    if auto_end:
        ends = now()
    session = accessible_session(user, session_id)
    appointment = accessible(user, session.appointment_id)
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        appointment = accessible(user, session.appointment_id, lock=True)
        session = accessible_session(user, session_id, lock=True)
        ensure(session.end_time is None, "Phiên khám đã kết thúc.")

        window_end = appointment.appointment_date_time + timedelta(minutes=appointment.estimated_duration_minutes)
        current_time = now()
        if current_time > window_end or ends > window_end:
            _mark_overdue_noshow(
                appointment,
                "Đã quá thời hạn 30 phút của lịch hẹn, không thể ghi nhận phiên khám hoàn thành. Lịch hẹn đã được chuyển sang Vắng mặt (No-show).",
            )
        ensure(appointment.status == "Checked-In", "Lịch hẹn phải ở trạng thái đã tiếp nhận.")
        if auto_end and ends <= session.start_time:
            candidate = session.start_time + timedelta(seconds=1)
            if candidate <= window_end and candidate <= current_time + timedelta(seconds=1):
                ends = candidate
        ensure(appointment.appointment_date_time <= ends <= window_end and current_time <= window_end,
               "Chỉ được kết thúc phiên khám trong cửa sổ thời gian của lịch hẹn.")
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
