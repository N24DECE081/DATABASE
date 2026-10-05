"""Append-only history and role-scoped clinical reads."""
from ...db import query
from ...entities import MedicalHistory
from ..base import insert
from ..scope import appointment_filter


def list_for(user):
    clause, params = appointment_filter(user, "a")
    return query(f"""SELECT mh.*, d.full_name AS doctor_name, p.full_name AS patient_name
        FROM medical_history mh JOIN consultation_session cs ON cs.session_id = mh.session_id
        JOIN appointment a ON a.appointment_id = cs.appointment_id
        JOIN patient p ON p.patient_id = a.patient_id JOIN doctor d ON d.doctor_id = a.doctor_id
        WHERE {clause} ORDER BY mh.record_date DESC""", params)
