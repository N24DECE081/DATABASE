"""Administrative formulary creation without stock/inventory features."""
from flask import abort
from ...db import transaction
from ...entities import Medication
from ...repositories import medications
from ..common import ensure, identity


def create(user, name, description):
    if user.role != "ADMIN":
        abort(403)
    ensure(0 < len(name.strip()) <= 100, "Tên thuốc không hợp lệ.")
    with transaction():
        return medications.insert(Medication(medication_id=identity("M"), medication_name=name.strip(),
                                              description=description or None))
