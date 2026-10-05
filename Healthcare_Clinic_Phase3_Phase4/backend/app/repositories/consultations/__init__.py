"""Session persistence and appointment context."""
from ...db import query
from ...entities import ConsultationSession
from ..base import get, insert, update


def for_appointment(appointment_id):
    row = query("SELECT * FROM consultation_session WHERE appointment_id = %s", (appointment_id,), one=True)
    return ConsultationSession(**row) if row else None
