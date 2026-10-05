"""Prescription headers/items persisted as one service transaction."""
from ...db import query
from ...entities import Prescription, PrescriptionItem
from ..base import get, insert
from ..scope import appointment_filter


def list_for(user):
    clause, params = appointment_filter(user, "a")
    return query(f"""SELECT rx.*, d.full_name AS doctor_name, p.full_name AS patient_name,
                     COUNT(pi.prescription_item_id) AS item_count
        FROM prescription rx JOIN consultation_session cs ON cs.session_id = rx.session_id
        JOIN appointment a ON a.appointment_id = cs.appointment_id
        JOIN doctor d ON d.doctor_id = a.doctor_id JOIN patient p ON p.patient_id = a.patient_id
        JOIN prescription_item pi ON pi.prescription_id = rx.prescription_id
        WHERE {clause} GROUP BY rx.prescription_id, d.full_name, p.full_name ORDER BY rx.prescription_date DESC""", params)


def items(prescription_id):
    return query("""SELECT pi.*, m.medication_name FROM prescription_item pi
                    JOIN medication m ON m.medication_id = pi.medication_id
                    WHERE pi.prescription_id = %s ORDER BY m.medication_name""", (prescription_id,))
