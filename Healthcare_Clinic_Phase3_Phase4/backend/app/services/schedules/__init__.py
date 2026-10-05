"""Working shift management and available starts for a requested duration."""
from datetime import datetime, timedelta
from flask import abort
from ...db import transaction
from ...entities import DoctorSchedule
from ...repositories import schedules
from ..doctors import classified_doctor, own_doctor
from ..common import ensure, found, identity, now


def create(user, data):
    if user.role not in ("ADMIN", "DOCTOR"):
        abort(403)
    if user.role == "DOCTOR" and own_doctor(user).doctor_id != data["doctor_id"]:
        abort(403)
    ensure(data["end_time"] > data["start_time"], "Giờ kết thúc ca phải sau giờ bắt đầu.")
    ensure(data["schedule_date"] >= now().date(), "Không thể tạo ca làm trong quá khứ.")
    with transaction():
        classified_doctor(data["doctor_id"], lock=True)
        return schedules.insert(DoctorSchedule(schedule_id=identity("S"), **data))


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


def available_starts(shift, minutes=30, *, clock=None):
    ensure(minutes in (15, 30, 45, 60), "Thời lượng khám không hợp lệ.")
    if shift.availability_status != "Available":
        return []
    busy = schedules.busy_intervals(shift.schedule_id)
    starts, current = [], datetime.combine(shift.schedule_date, shift.start_time)
    end = datetime.combine(shift.schedule_date, shift.end_time)
    clock = clock or now()
    duration = timedelta(minutes=minutes)
    while current + duration <= end:
        if current >= clock and not any(current < b["appointment_date_time"] + timedelta(minutes=b["estimated_duration_minutes"])
                                        and current + duration > b["appointment_date_time"] for b in busy):
            starts.append(current)
        current += timedelta(minutes=15)
    return starts
