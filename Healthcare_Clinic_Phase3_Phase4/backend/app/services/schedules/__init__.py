"""Working shift management and available starts for standard 30-minute clinic slots."""
from datetime import datetime, time, timedelta
from flask import abort
from ...db import transaction
from ...entities import DoctorSchedule
from ...repositories import schedules
from ..doctors import classified_doctor, own_doctor
from ..common import ensure, found, identity, now

CLINIC_SLOT_MINUTES = 30
CLINIC_MORNING_START = time(8, 0)
CLINIC_MORNING_END = time(12, 0)
CLINIC_AFTERNOON_START = time(13, 0)
CLINIC_AFTERNOON_END = time(17, 0)


def create(user, data):
    if user.role not in ("ADMIN", "DOCTOR"):
        abort(403)
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != data["doctor_id"]:
        abort(403)
    ensure(data["end_time"] > data["start_time"], "Giờ kết thúc ca phải sau giờ bắt đầu.")
    ensure(
        data["start_time"] >= CLINIC_MORNING_START and data["end_time"] <= CLINIC_AFTERNOON_END,
        "Ca làm việc phải nằm trong giờ hành chính phòng khám (08:00–17:00).",
    )
    ensure(data["schedule_date"] >= now().date(), "Không thể tạo ca làm trong quá khứ.")
    with transaction():
        classified_doctor(data["doctor_id"], lock=True)
        return schedules.insert(DoctorSchedule(schedule_id=identity("SCH-"), **data))


def change_availability(user, schedule_id, status):
    if user.role not in ("ADMIN", "DOCTOR"):
        abort(403)
    shift = found(schedules.get(DoctorSchedule, schedule_id))
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != shift.doctor_id:
        abort(403)
    ensure(status in ("Available", "Busy", "On Leave"), "Trạng thái ca không hợp lệ.")
    with transaction():
        classified_doctor(shift.doctor_id, lock=True)
        shift = found(schedules.get(DoctorSchedule, schedule_id, lock=True))
        shift.availability_status = status
        return schedules.update(shift)


def outside_lunch(begins, ends):
    lunch = begins.replace(hour=12, minute=0, second=0, microsecond=0)
    return ends <= lunch or begins >= lunch.replace(hour=13)


def in_clinic_hours_slot(begins, minutes=CLINIC_SLOT_MINUTES):
    if minutes != CLINIC_SLOT_MINUTES:
        return False
    if begins.second != 0 or begins.microsecond != 0 or begins.minute not in (0, 30):
        return False
    ends = begins + timedelta(minutes=minutes)
    if ends.date() != begins.date():
        return False
    start_t, end_t = begins.time(), ends.time()
    return (
        (CLINIC_MORNING_START <= start_t and end_t <= CLINIC_MORNING_END)
        or (CLINIC_AFTERNOON_START <= start_t and end_t <= CLINIC_AFTERNOON_END)
    )


def validate_clinic_slot(begins, minutes=CLINIC_SLOT_MINUTES):
    ensure(minutes == CLINIC_SLOT_MINUTES, "Mỗi phiên khám có thời lượng cố định 30 phút.")
    ensure(
        begins.second == 0 and begins.microsecond == 0 and begins.minute in (0, 30),
        "Giờ khám phải theo khung 30 phút (:00 hoặc :30), ví dụ 08:00, 08:30, 13:00, 13:30.",
    )
    ends = begins + timedelta(minutes=minutes)
    ensure(outside_lunch(begins, ends), "Lịch hẹn không được chồng lấn giờ nghỉ trưa 12:00-13:00.")
    ensure(
        in_clinic_hours_slot(begins, minutes),
        "Lịch hẹn phải nằm trong giờ hành chính: Sáng 08:00–12:00 (lịch cuối 11:30) và Chiều 13:00–17:00 (lịch cuối 16:30).",
    )


def _snap_to_slot_boundary(value):
    remainder = value.minute % CLINIC_SLOT_MINUTES
    clean = value.replace(second=0, microsecond=0)
    if remainder or value.second or value.microsecond:
        clean += timedelta(minutes=CLINIC_SLOT_MINUTES - remainder if remainder else CLINIC_SLOT_MINUTES)
    return clean


def available_starts(shift, minutes=CLINIC_SLOT_MINUTES, *, clock=None):
    ensure(minutes == CLINIC_SLOT_MINUTES, "Mỗi phiên khám có thời lượng cố định 30 phút.")
    if shift.availability_status != "Available":
        return []
    busy = schedules.busy_intervals(shift.schedule_id)
    starts = []
    current = _snap_to_slot_boundary(datetime.combine(shift.schedule_date, shift.start_time))
    end = datetime.combine(shift.schedule_date, shift.end_time)
    clock = clock or now()
    duration = timedelta(minutes=CLINIC_SLOT_MINUTES)
    while current + duration <= end:
        if (
            current >= clock
            and in_clinic_hours_slot(current, CLINIC_SLOT_MINUTES)
            and not any(
                current < b["appointment_date_time"] + timedelta(minutes=b["estimated_duration_minutes"])
                and current + duration > b["appointment_date_time"]
                for b in busy
            )
        ):
            starts.append(current)
        current += duration
    return starts
