"""Joined-table doctor/subtype/specialty directory."""
from ...db import query
from ...entities import Doctor
from ..base import get, insert, update


def for_user(user_id):
    row = query("SELECT * FROM doctor WHERE user_id = %s", (user_id,), one=True)
    return Doctor(**row) if row else None


def directory(search="", specialty_id=""):
    sql = """SELECT d.*, CASE WHEN st.doctor_id IS NOT NULL THEN 'SPECIALIST' ELSE 'GENERAL_PRACTITIONER' END AS subtype,
                    COALESCE(sp.specialty_name, 'General Practitioner') AS specialty_name
             FROM doctor d JOIN user_account u ON u.user_id = d.user_id
             LEFT JOIN general_practitioner gp ON gp.doctor_id = d.doctor_id
             LEFT JOIN specialist st ON st.doctor_id = d.doctor_id
             LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
             WHERE u.account_status = 'Active' AND ((gp.doctor_id IS NOT NULL) + (st.doctor_id IS NOT NULL)) = 1"""
    params = []
    if search:
        sql += " AND (d.full_name LIKE %s OR sp.specialty_name LIKE %s)"
        params += [f"%{search}%", f"%{search}%"]
    if specialty_id:
        sql += " AND sp.specialty_id = %s"
        params.append(specialty_id)
    return query(sql + " ORDER BY d.full_name", tuple(params))


def specialties():
    return query("SELECT * FROM specialty ORDER BY specialty_name")


def subtype_count(doctor_id):
    row = query("""SELECT (SELECT COUNT(*) FROM general_practitioner WHERE doctor_id = %s)
                    + (SELECT COUNT(*) FROM specialist WHERE doctor_id = %s) AS count_value""",
                (doctor_id, doctor_id), one=True)
    return row["count_value"]
