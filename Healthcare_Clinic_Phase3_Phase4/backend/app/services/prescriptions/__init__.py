"""Atomic prescription + items workflow. Empty headers never commit through the app."""
import re
from flask import abort
from ...db import transaction
from ...entities import Prescription, PrescriptionItem, Medication
from ...repositories import prescriptions, medications
from ..consultations import accessible_session
from ..appointments import accessible
from ..common import ensure, found, identity, now


def list_for(user):
    if user.role not in ("PATIENT", "DOCTOR"):
        abort(403)
    return prescriptions.list_for(user)


def details(user, prescription_id):
    if user.role not in ("PATIENT", "DOCTOR"):
        abort(403)
    prescription = found(prescriptions.get(Prescription, prescription_id))
    accessible_session(user, prescription.session_id)
    return prescription, prescriptions.items(prescription_id)


def create(user, session_id, data):
    if user.role != "DOCTOR":
        abort(403)
    items = data.get("items", [])
    ensure(1 <= len(items) <= 10, "Đơn thuốc cần từ 1 đến 10 mục thuốc.")
    ensure(len({item["medication_id"] for item in items}) == len(items), "Mỗi thuốc chỉ xuất hiện một lần trong đơn.")
    icd = (data.get("diagnosis_icd") or "").strip().upper() or None
    if icd:
        ensure(bool(re.match(r'^[A-Z][0-9]{2}(\.[0-9]{1,2})?$', icd)), "Mã chẩn đoán ICD-10 không đúng định dạng (Ví dụ: J02.9, E11, I10, K29, M54.5).")
    with transaction():
        session = accessible_session(user, session_id)
        appointment = accessible(user, session.appointment_id, lock=True)
        ensure(appointment.status == "Completed", "Chỉ kê đơn thuốc sau khi phiên khám đã hoàn thành.")
        prescription = prescriptions.insert(Prescription(prescription_id=identity("RX-"), session_id=session_id,
            diagnosis_icd=icd, prescription_date=now(),
            instructions=data.get("instructions") or None))
        seen_names = set()
        for item in items:
            med = found(medications.get(Medication, item["medication_id"]))
            norm_name = " ".join(med.medication_name.split()).lower()
            ensure(norm_name not in seen_names, f"Thuốc '{med.medication_name}' không được trùng lặp trong cùng đơn thuốc.")
            seen_names.add(norm_name)
            ensure(all(item.get(k) for k in ("dosage", "frequency", "duration")), "Thiếu thông tin mục thuốc.")
            prescriptions.insert(PrescriptionItem(prescription_item_id=identity("RXI-"),
                prescription_id=prescription.prescription_id, medication_id=item["medication_id"],
                dosage=item["dosage"], frequency=item["frequency"], duration=item["duration"],
                special_instructions=item.get("special_instructions") or None))
        return prescription
