"""Booking and status workflows; doctor row locks serialize conflicting bookings."""
from datetime import datetime, timedelta
from flask import abort
from ...db import transaction
from ...entities import Appointment, DoctorSchedule, Patient
from ...repositories import appointments, patients, consultations, schedules
from ..doctors import own_doctor, classified_doctor
from ..common import ensure, found, identity, now


def accessible(user, appointment_id, *, lock=False):
    appointment = found(appointments.get(Appointment, appointment_id, lock=lock))
    if user.role == "PATIENT":
        profile = found(patients.for_user(user.user_id))
        if profile.patient_id != appointment.patient_id:
            abort(403)
    elif user.role == "DOCTOR":
        if own_doctor(user).doctor_id != appointment.doctor_id:
            abort(403)
    elif user.role != "ADMIN":
        abort(403)
    return appointment


def book(user, data):
    if user.role not in ("PATIENT", "ADMIN", "DOCTOR"):
        abort(403)
    if user.role == "PATIENT":
        patient_id = found(patients.for_user(user.user_id)).patient_id
        ensure(not data.get("follow_up_from_appt_id"), "Follow-up phải do bác sĩ tạo.")
    else:
        patient_id = data["patient_id"]
    shift = found(schedules.get(DoctorSchedule, data["schedule_id"]))
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != shift.doctor_id:
        abort(403)
    parent = data.get("follow_up_from_appt_id") or None
    if user.role == "DOCTOR":
        ensure(parent is not None, "Bác sĩ đặt hẹn tái khám cần chọn lịch hẹn trước đó.")
    elif parent:
        ensure(False, "Follow-up phải do bác sĩ tạo.")
    begins, minutes = data["appointment_date_time"], data["estimated_duration_minutes"]
    ensure(begins >= now(), "Không thể đặt lịch hẹn trong quá khứ.")
    ensure(minutes in (15, 30, 45, 60), "Thời lượng khám không hợp lệ.")
    ensure(data["appointment_type"] in ("In-person", "Telemedicine"), "Hình thức khám không hợp lệ.")
    with transaction():
        classified_doctor(shift.doctor_id, lock=True)
        shift = found(schedules.get(DoctorSchedule, shift.schedule_id, lock=True))
        found(patients.get(Patient, patient_id))
        end = begins + timedelta(minutes=minutes)
        ensure(shift.availability_status == "Available", "Ca làm không còn khả dụng.")
        ensure(begins.date() == shift.schedule_date
               and begins >= datetime.combine(shift.schedule_date, shift.start_time)
               and end <= datetime.combine(shift.schedule_date, shift.end_time), "Lịch hẹn phải nằm trong ca làm đã chọn.")
        ensure(not appointments.overlap(shift.doctor_id, begins, end), "Bác sĩ đã có lịch hẹn trong thời gian này.")
        if parent:
            preceding = accessible(user, parent, lock=True)
            ensure(preceding.patient_id == patient_id and preceding.doctor_id == shift.doctor_id
                   and preceding.appointment_date_time < begins and preceding.status not in ("Cancelled", "No-show"),
                   "Lịch tái khám phải tham chiếu lần hẹn trước hợp lệ của cùng bệnh nhân/bác sĩ.")
        return appointments.insert(Appointment(appointment_id=identity("A"), patient_id=patient_id,
            doctor_id=shift.doctor_id, schedule_id=shift.schedule_id, booked_by_user_id=user.user_id,
            follow_up_from_appt_id=parent, appointment_date_time=begins, estimated_duration_minutes=minutes,
            appointment_type=data["appointment_type"], status="Scheduled", reason=data.get("reason") or None))


def change_status(user, appointment_id, target):
    current = accessible(user, appointment_id)
    if user.role == "PATIENT" and target != "Cancelled":
        abort(403)
    transitions = {"Scheduled": {"Checked-In", "Cancelled", "No-show"},
                   "Checked-In": {"Cancelled", "No-show"}, "Completed": set(),
                   "Cancelled": set(), "No-show": set()}
    with transaction():
        classified_doctor(current.doctor_id, lock=True)
        current = accessible(user, appointment_id, lock=True)
        ensure(target in transitions[current.status], "Không thể chuyển trạng thái lịch hẹn như đã yêu cầu.")
        if user.role == "PATIENT":
            ensure(current.status == "Scheduled" and current.appointment_date_time > now(), "Chỉ hủy được lịch hẹn sắp tới chưa check-in.")
        ensure(consultations.for_appointment(appointment_id) is None, "Lịch hẹn đã có phiên khám, không thể hủy hoặc đánh dấu vắng.")
        current.status = target
        return appointments.update(current)


def reschedule(user, appointment_id, data):
    if user.role != "ADMIN":
        abort(403)
    appointment = accessible(user, appointment_id)
    ensure(data["appointment_date_time"] >= now(), "Không thể chuyển lịch vào quá khứ.")
    ensure(data["estimated_duration_minutes"] in (15,30,45,60), "Thời lượng không hợp lệ.")
    with transaction():
        classified_doctor(appointment.doctor_id, lock=True)
        shift = found(schedules.get(DoctorSchedule, data["schedule_id"], lock=True))
        appointment = accessible(user, appointment_id, lock=True)
        ensure(appointment.status == "Scheduled" and consultations.for_appointment(appointment_id) is None,
               "Chỉ điều chỉnh lịch hẹn Scheduled chưa có phiên khám.")
        ensure(shift.doctor_id == appointment.doctor_id and shift.availability_status == "Available", "Ca làm không hợp lệ cho bác sĩ đã chọn.")
        begins=data["appointment_date_time"]
        ends=begins+timedelta(minutes=data["estimated_duration_minutes"])
        ensure(begins >= datetime.combine(shift.schedule_date,shift.start_time)
               and ends <= datetime.combine(shift.schedule_date,shift.end_time), "Lịch hẹn phải nằm trong ca làm.")
        ensure(not appointments.overlap(appointment.doctor_id,begins,ends,appointment_id), "Lịch hẹn chồng với lịch đã có.")
        for name in ("schedule_id","appointment_date_time","estimated_duration_minutes","appointment_type","reason"):
            setattr(appointment,name,data[name] or None)
        return appointments.update(appointment)
