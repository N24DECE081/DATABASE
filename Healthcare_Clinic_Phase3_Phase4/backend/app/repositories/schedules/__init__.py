"""Working shifts and available intervals."""
from ...db import query
from ...entities import DoctorSchedule
from ..base import get, insert, update


def list_schedules(doctor_id="", day=None, *, available_only=False):
    sql = """SELECT ds.*, d.full_name AS doctor_name FROM doctor_schedule ds
             JOIN doctor d ON d.doctor_id = ds.doctor_id WHERE 1=1"""
    params = []
    if doctor_id:
        sql += " AND ds.doctor_id = %s"
        params.append(doctor_id)
    if day:
        sql += " AND ds.schedule_date = %s"
        params.append(day)
    if available_only:
        sql += " AND ds.availability_status = 'Available' AND ds.schedule_date >= CURRENT_DATE()"
    return query(sql + " ORDER BY ds.schedule_date, ds.start_time", tuple(params))


def busy_intervals(schedule_id):
    return query("""SELECT appointment_date_time, estimated_duration_minutes FROM appointment
                    WHERE schedule_id = %s AND status NOT IN ('Cancelled','No-show')
                    ORDER BY appointment_date_time""", (schedule_id,))
