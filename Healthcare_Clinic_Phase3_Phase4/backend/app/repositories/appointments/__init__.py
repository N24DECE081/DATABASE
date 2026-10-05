"""Appointment persistence and role-scoped operational reads."""
from ...db import query
from ...entities import Appointment
from ..base import get, insert, update
from ..scope import appointment_filter


def list_for(user, status="", day=None):
    clause, params = appointment_filter(user, "v")
    sql = f"SELECT v.* FROM v_appointment_details v WHERE {clause}"
    if status:
        sql += " AND v.status = %s"
        params += (status,)
    if day:
        sql += " AND DATE(v.appointment_date_time) = %s"
        params += (day,)
    return query(sql + " ORDER BY v.appointment_date_time DESC", params)


def details(appointment_id):
    return query("SELECT * FROM v_appointment_details WHERE appointment_id = %s", (appointment_id,), one=True)


def overlap(doctor_id, begins, ends, exclude=""):
    return query("""SELECT appointment_id FROM appointment WHERE doctor_id = %s
                    AND appointment_id <> %s AND status NOT IN ('Cancelled','No-show')
                    AND appointment_date_time < %s
                    AND DATE_ADD(appointment_date_time, INTERVAL estimated_duration_minutes MINUTE) > %s
                    LIMIT 1""", (doctor_id, exclude, ends, begins), one=True)
