"""Patient profile persistence."""
from ...db import query
from ...entities import Patient
from ..base import get, insert, update


def for_user(user_id):
    row = query("SELECT * FROM patient WHERE user_id = %s", (user_id,), one=True)
    return Patient(**row) if row else None


def list_patients():
    return query("SELECT patient_id, full_name, phone FROM patient ORDER BY full_name")
