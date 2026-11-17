"""Patient profile persistence."""
from ...db import query
from ...entities import Patient
from ..base import get, insert, update


def for_user(user_id):
    row = query("SELECT * FROM patient WHERE user_id = %s", (user_id,), one=True)
    return Patient(**row) if row else None


def list_patients(search=""):
    sql = """SELECT p.patient_id, p.user_id, p.full_name, p.phone, p.email,
                    p.date_of_birth, p.gender
             FROM patient p JOIN user_account u ON u.user_id = p.user_id"""
    params = ()
    if search:
        pattern = f"%{search[:100]}%"
        sql += " WHERE p.patient_id LIKE %s OR p.full_name LIKE %s OR p.phone LIKE %s OR p.email LIKE %s"
        params = (pattern, pattern, pattern, pattern)
    return query(sql + " ORDER BY p.full_name LIMIT 200", params)
