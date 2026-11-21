"""Shared validation helpers; persistent entities remain unchanged."""
from datetime import datetime
from uuid import uuid4

from flask import abort


class BusinessError(ValueError):
    pass


PREFIX_MAP = {
    # Appointments -> APT-001, APT-002, ...
    "A": ("appointment", "appointment_id", "APT-", 3),
    "APT": ("appointment", "appointment_id", "APT-", 3),
    "APT-": ("appointment", "appointment_id", "APT-", 3),

    # Consultations -> SES-001, SES-002, ...
    "C": ("consultation_session", "session_id", "SES-", 3),
    "SES": ("consultation_session", "session_id", "SES-", 3),
    "SES-": ("consultation_session", "session_id", "SES-", 3),

    # Patients -> PAT-001, PAT-002, ...
    "P": ("patient", "patient_id", "PAT-", 3),
    "PAT": ("patient", "patient_id", "PAT-", 3),
    "PAT-": ("patient", "patient_id", "PAT-", 3),

    # Doctors -> DOC-001, DOC-002, ...
    "D": ("doctor", "doctor_id", "DOC-", 3),
    "DOC": ("doctor", "doctor_id", "DOC-", 3),
    "DOC-": ("doctor", "doctor_id", "DOC-", 3),

    # Users -> USER-PAT-001, USER-DOC-001, USER-ADM-001, ...
    "USER-PAT-": ("user_account", "user_id", "USER-PAT-", 3),
    "USER-DOC-": ("user_account", "user_id", "USER-DOC-", 3),
    "USER-ADM-": ("user_account", "user_id", "USER-ADM-", 3),
    "USER-": ("user_account", "user_id", "USER-PAT-", 3),
    "USER": ("user_account", "user_id", "USER-PAT-", 3),
    "U": ("user_account", "user_id", "USER-PAT-", 3),

    # Doctor Schedules -> SCH-001, SCH-002, ...
    "S": ("doctor_schedule", "schedule_id", "SCH-", 3),
    "SCH": ("doctor_schedule", "schedule_id", "SCH-", 3),
    "SCH-": ("doctor_schedule", "schedule_id", "SCH-", 3),

    # Medical History -> HIS-001, HIS-002, ...
    "H": ("medical_history", "medical_history_id", "HIS-", 3),
    "HIS": ("medical_history", "medical_history_id", "HIS-", 3),
    "HIS-": ("medical_history", "medical_history_id", "HIS-", 3),

    # Medications -> MED-001, MED-002, ...
    "M": ("medication", "medication_id", "MED-", 3),
    "MED": ("medication", "medication_id", "MED-", 3),
    "MED-": ("medication", "medication_id", "MED-", 3),

    # Prescriptions -> RX-001, RX-002, ...
    "R": ("prescription", "prescription_id", "RX-", 3),
    "RX": ("prescription", "prescription_id", "RX-", 3),
    "RX-": ("prescription", "prescription_id", "RX-", 3),

    # Prescription Items -> RXI-0001, RXI-0002, ...
    "I": ("prescription_item", "prescription_item_id", "RXI-", 4),
    "RXI": ("prescription_item", "prescription_item_id", "RXI-", 4),
    "RXI-": ("prescription_item", "prescription_item_id", "RXI-", 4),

    # Specialties -> SPC-001, SPC-002, ...
    "T": ("specialty", "specialty_id", "SPC-", 3),
    "SPC": ("specialty", "specialty_id", "SPC-", 3),
    "SPC-": ("specialty", "specialty_id", "SPC-", 3),
}


def identity(prefix, role=None):
    """Generate the next sequential ID based on current database state.
    For example: SES-296 -> SES-297 (or SES-401 -> SES-402),
    APT-656 -> APT-657, PAT-083 -> PAT-084, etc.
    """
    if role and prefix in ("U", "USER", "USER-", "USER-PAT-", "USER-DOC-", "USER-ADM-"):
        std_prefix = f"USER-{role[:3]}-"
        table, col, pad = "user_account", "user_id", 3
    elif prefix in PREFIX_MAP:
        table, col, std_prefix, pad = PREFIX_MAP[prefix]
    else:
        table, col, pad = None, None, 3
        std_prefix = prefix if prefix.endswith("-") else f"{prefix}-"

    if table and col:
        try:
            from ..db import get_db
            conn = get_db()
            with conn.cursor() as cur:
                start_pos = len(std_prefix) + 1
                cur.execute(
                    f"SELECT MAX(CAST(SUBSTRING({col}, {start_pos}) AS UNSIGNED)) "
                    f"FROM `{table}` WHERE `{col}` REGEXP '^{std_prefix}[0-9]+$'"
                )
                row = cur.fetchone()
                current_max = row[0] if (row and row[0] is not None) else 0
                next_val = current_max + 1
                while True:
                    candidate = f"{std_prefix}{next_val:0{pad}d}"
                    cur.execute(f"SELECT 1 FROM `{table}` WHERE `{col}` = %s LIMIT 1", (candidate,))
                    if not cur.fetchone():
                        return candidate
                    next_val += 1
        except Exception:
            pass

    return std_prefix + uuid4().hex[:19 - len(std_prefix)]


def now():
    # Clinic DATETIME values use Asia/Bangkok (+07:00), matching the DB session.
    from datetime import timezone, timedelta
    return datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None, microsecond=0)


def ensure(condition, message):
    if not condition:
        raise BusinessError(message)


def found(value):
    if value is None:
        abort(404)
    return value


def format_person_name(name):
    """Normalize names to Title Case, stripping extra spaces (e.g. 'nGuyen vaN cu' -> 'Nguyen Van Cu')."""
    if not name:
        return ""
    return " ".join(word.capitalize() for word in str(name).strip().split())

