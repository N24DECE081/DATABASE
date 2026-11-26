"""Append-only history and role-scoped clinical reads."""
from ...db import query
from ...entities import MedicalHistory
from ..base import insert
from ..scope import appointment_filter


def list_for(user):
    if user.role == "DOCTOR":
        clause = """p.patient_id IN (
            SELECT DISTINCT a_scope.patient_id
            FROM appointment a_scope
            JOIN doctor d_scope ON d_scope.doctor_id = a_scope.doctor_id
            WHERE d_scope.user_id = %s
              AND a_scope.status <> 'Cancelled'
        )"""
        params = (user.user_id,)
    else:
        clause, params = appointment_filter(user, "a")
    return query(f"""SELECT mh.*, d.doctor_id, d.full_name AS doctor_name, p.full_name AS patient_name,
        p.patient_id, a.appointment_type,
        COALESCE(sp.specialty_name, 'Đa khoa') AS specialty_name
        FROM medical_history mh JOIN consultation_session cs ON cs.session_id = mh.session_id
        JOIN appointment a ON a.appointment_id = cs.appointment_id
        JOIN patient p ON p.patient_id = a.patient_id JOIN doctor d ON d.doctor_id = a.doctor_id
        LEFT JOIN specialist spl ON spl.doctor_id = d.doctor_id
        LEFT JOIN specialty sp ON sp.specialty_id = spl.specialty_id
        WHERE {clause} ORDER BY mh.record_date DESC""", params)
