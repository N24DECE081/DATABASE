"""Administrative formulary creation without stock/inventory features."""
from flask import abort
from ...db import query, transaction
from ...entities import Medication
from ...repositories import medications
from ...utils.validators import validate_text
from ..common import ensure, identity


def create(user, name, description):
    if user.role != "ADMIN":
        abort(403)
    clean_name = " ".join(str(name or "").strip().split())
    ensure(0 < len(clean_name) <= 100, "Tên thuốc phải từ 1 đến 100 ký tự.")
    clean_desc = validate_text(description, "Mô tả thuốc", required=False, max_len=4000)
    existing = query("SELECT medication_id FROM medication WHERE LOWER(medication_name) = LOWER(%s) LIMIT 1", (clean_name,), one=True)
    ensure(existing is None, f"Thuốc '{clean_name}' đã tồn tại trong danh mục thuốc.")
    with transaction():
        return medications.insert(Medication(medication_id=identity("MED-"), medication_name=clean_name,
                                              description=clean_desc))
