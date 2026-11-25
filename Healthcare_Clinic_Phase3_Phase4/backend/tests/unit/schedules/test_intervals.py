from datetime import date, datetime, time, timedelta
from app.entities import DoctorSchedule
from app.services.schedules import available_starts


def test_slots_exclude_partial_overlap_and_include_adjacent_start(monkeypatch):
    monkeypatch.setattr("app.services.schedules.schedules.busy_intervals", lambda _sid: [
        {"appointment_date_time": datetime(2026,10,6,9), "estimated_duration_minutes":30}])
    shift = DoctorSchedule(schedule_id="S", doctor_id="D", schedule_date=date(2026,10,6),
                           start_time=time(8), end_time=time(10), availability_status="Available")
    starts = available_starts(shift, 30, clock=datetime(2026,10,5,12))
    assert datetime(2026,10,6,8,30) in starts
    assert datetime(2026,10,6,8,45) not in starts
    assert datetime(2026,10,6,9,15) not in starts
    assert datetime(2026,10,6,9,30) in starts
    assert all(t >= datetime(2026,10,6,8) and t + timedelta(minutes=30) <= datetime(2026,10,6,10) for t in starts)


def test_slots_follow_30_min_step_and_clinic_office_hours(monkeypatch):
    monkeypatch.setattr("app.services.schedules.schedules.busy_intervals", lambda _sid: [
        {"appointment_date_time": datetime(2026, 10, 6, 11, 0), "estimated_duration_minutes": 30}])
    shift = DoctorSchedule(schedule_id="S2", doctor_id="D", schedule_date=date(2026, 10, 6),
                           start_time=time(7, 0), end_time=time(19, 0), availability_status="Available")
    starts = available_starts(shift, 30, clock=datetime(2026, 10, 5, 12))
    hhmm = [t.strftime("%H:%M") for t in starts]
    assert hhmm == [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    ]
