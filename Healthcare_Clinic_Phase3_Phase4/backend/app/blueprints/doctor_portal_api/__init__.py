"""JSON API for the authenticated doctor portal."""

from urllib.parse import urlsplit

from flask import Blueprint, abort, g, jsonify, request

from ...db import query, transaction
from ...repositories import appointments, doctors, medical_history, patients, prescriptions, schedules
from ...security import require_roles
from ...services import consultations as consultation_service, doctors as doctor_service, appointments as appointment_service, medical_history as history_service, prescriptions as prescription_service
from ...services.common import now


bp = Blueprint("doctor_portal_api", __name__, url_prefix="/api/doctor")

APPOINTMENT_STATUS_LABELS = {
    "Scheduled": "Chờ xác nhận",
    "Checked-In": "Đã xác nhận",
    "Completed": "Hoàn thành",
    "Cancelled": "Đã hủy",
    "No-show": "Vắng mặt",
}


@bp.before_request
def require_authenticated_user():
    if g.user is None:
        abort(401, description="Vui lòng đăng nhập để tiếp tục.")


def _iso(value):
    return value.isoformat() if value is not None else None


def _appointment(row):
    starts = row["appointment_date_time"]
    return {
        "id": row["appointment_id"],
        "patientId": row["patient_id"],
        "patient": row["patient_name"],
        "date": starts.date().isoformat(),
        "time": starts.strftime("%H:%M"),
        "reason": row["reason"] or "",
        "type": "Tái khám" if row["follow_up_from_appt_id"] else "Khám mới",
        "modality": "Tư vấn trực tuyến" if row["appointment_type"] == "Telemedicine" else "Khám trực tiếp",
        "status": APPOINTMENT_STATUS_LABELS[row["status"]],
        "sessionId": row["session_id"],
    }


def _clinical_fields(notes):
    labels = {
        "Lý do khám": "complaint",
        "Triệu chứng": "symptoms",
        "Chẩn đoán": "diagnosis",
        "Ghi chú của bác sĩ": "notes",
        "Kế hoạch điều trị": "plan",
    }
    values = {key: "" for key in labels.values()}
    current = None
    has_labels = False
    for raw_line in (notes or "").splitlines():
        line = raw_line.strip()
        label = next((name for name in labels if line == f"{name}:"), None)
        if label:
            current = labels[label]
            has_labels = True
        elif current:
            values[current] = f"{values[current]}\n{raw_line}".strip()
    if notes and not has_labels and not any(values.values()):
        values["notes"] = notes
    return values


def _consultation(row, follow_up_by_parent=None):
    fields = _clinical_fields(row["diagnosis_notes"])
    follow_up_id = (follow_up_by_parent or {}).get(row["appointment_id"])
    return {
        "id": row["session_id"],
        "appointmentId": row["appointment_id"],
        "patientId": row["patient_id"],
        "patient": row["patient_name"],
        "appointment": _iso(row["appointment_date_time"].date()),
        "date": _iso(row["start_time"].date()),
        **fields,
        "diagnosis": fields["diagnosis"],
        "status": "Hoàn thành" if row["end_time"] else "Đang khám",
        "meetingUrl": row["meeting_url"],
        "modality": "Tư vấn trực tuyến" if row["appointment_type"] == "Telemedicine" else "Khám trực tiếp",
        "startedAt": _iso(row["start_time"]),
        "endedAt": _iso(row["end_time"]),
        "hasFollowUp": bool(follow_up_id),
        "followUpAppointmentId": follow_up_id,
    }


@bp.get("/portal")
@require_roles("DOCTOR")
def portal_data():
    appointment_service.auto_noshow_appointments()
    doctor = doctor_service.own_doctor(g.user)
    appointment_rows = appointments.list_for(g.user)
    patient_ids = list(dict.fromkeys(row["patient_id"] for row in appointment_rows))

    patient_rows = []
    if patient_ids:
        placeholders = ", ".join(["%s"] * len(patient_ids))
        patient_rows = query(
            f"""SELECT patient_id, full_name, gender, date_of_birth, phone, email,
                       blood_type, allergies, chronic_diseases
                FROM patient WHERE patient_id IN ({placeholders}) ORDER BY full_name""",
            tuple(patient_ids),
        )
    latest_by_patient = {}
    for row in appointment_rows:
        latest_by_patient.setdefault(row["patient_id"], row["appointment_date_time"])
    patient_data = [
        {
            "id": row["patient_id"],
            "name": row["full_name"],
            "gender": {"Male": "Nam", "Female": "Nữ", "Other": "Khác"}.get(row["gender"], row["gender"]),
            "dob": _iso(row["date_of_birth"]),
            "phone": row["phone"],
            "email": row["email"] or "",
            "latest": _iso(latest_by_patient.get(row["patient_id"])),
            "blood": row["blood_type"] or "Chưa ghi nhận",
            "allergies": row["allergies"] or "Chưa ghi nhận",
            "chronicDiseases": row["chronic_diseases"] or "Chưa ghi nhận",
        }
        for row in patient_rows
    ]

    session_rows = query(
        """SELECT cs.session_id, cs.appointment_id, cs.start_time, cs.end_time,
                  cs.diagnosis_notes, cs.meeting_url, a.appointment_type,
                  a.patient_id, p.full_name AS patient_name,
                  a.appointment_date_time
           FROM consultation_session cs
           JOIN appointment a ON a.appointment_id = cs.appointment_id
           JOIN patient p ON p.patient_id = a.patient_id
           WHERE a.doctor_id = %s ORDER BY cs.start_time DESC""",
        (doctor.doctor_id,),
    )
    follow_up_rows = query(
        """SELECT appointment_id, follow_up_from_appt_id
           FROM appointment
           WHERE doctor_id = %s
             AND follow_up_from_appt_id IS NOT NULL
             AND status <> 'Cancelled'
           ORDER BY appointment_date_time DESC""",
        (doctor.doctor_id,),
    )
    follow_up_by_parent = {}
    for row in follow_up_rows:
        follow_up_by_parent.setdefault(row["follow_up_from_appt_id"], row["appointment_id"])
    session_data = [_consultation(row, follow_up_by_parent) for row in session_rows]

    history_data = [
        {
            "id": row["medical_history_id"],
            "sessionId": row["session_id"],
            "patientId": row["patient_id"],
            "patient": row["patient_name"],
            "date": _iso(row["record_date"]),
            "diagnosis": row["diagnosis"],
            "symptoms": row["symptoms"],
            "notes": row["progress_notes"] or "",
            "doctor": row["doctor_name"],
        }
        for row in medical_history.list_for(g.user)
    ]
    prescription_data = []
    for row in prescriptions.list_for(g.user):
        items = prescriptions.items(row["prescription_id"])
        prescription_data.append({
            "id": row["prescription_id"],
            "sessionId": row["session_id"],
            "patient": row["patient_name"],
            "patientId": next(
                (session["patientId"] for session in session_data if session["id"] == row["session_id"]),
                "",
            ),
            "date": _iso(row["prescription_date"]),
            "count": row["item_count"],
            "status": "Đã kê",
            "diagnosis": row["diagnosis_icd"] or "",
            "instructions": row["instructions"] or "",
            "items": [
                {
                    "name": item["medication_name"],
                    "dosage": item["dosage"],
                    "frequency": item["frequency"],
                    "duration": item["duration"],
                    "instructions": item["special_instructions"] or "",
                }
                for item in items
            ],
        })

    directory_row = next(
        (row for row in doctors.directory() if row["doctor_id"] == doctor.doctor_id),
        None,
    )
    return jsonify(
        profile={
            "id": doctor.doctor_id,
            "name": doctor.full_name,
            "email": doctor.email,
            "phone": doctor.phone,
            "license": doctor.license_number,
            "specialty": (
                "Bác sĩ đa khoa"
                if not directory_row or directory_row["specialty_name"] == "General Practitioner"
                else directory_row["specialty_name"]
            ),
        },
        appointments=[_appointment(row) for row in appointment_rows],
        patients=patient_data,
        consultations=session_data,
        records=history_data,
        prescriptions=prescription_data,
        schedules=[
            {
                "id": row["schedule_id"],
                "date": _iso(row["schedule_date"]),
                "start": row["start_time"].strftime("%H:%M"),
                "end": row["end_time"].strftime("%H:%M"),
                "status": row["availability_status"],
            }
            for row in schedules.list_schedules(doctor.doctor_id)
        ],
    )


@bp.post("/appointments/<appointment_id>/consultation")
@require_roles("DOCTOR")
def create_consultation(appointment_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, description="Thông tin phiên khám không hợp lệ.")
    meeting_url = data.get("meeting_url") or ""
    notes = data.get("diagnosis_notes") or ""
    if not isinstance(meeting_url, str) or len(meeting_url) > 255:
        abort(400, description="Liên kết cuộc gọi không hợp lệ.")
    if meeting_url:
        parsed_url = urlsplit(meeting_url)
        if parsed_url.scheme != "https" or not parsed_url.netloc:
            abort(400, description="Liên kết cuộc gọi phải sử dụng HTTPS.")
    else:
        appointment = appointment_service.accessible(g.user, appointment_id)
        if appointment.appointment_type == "Telemedicine":
            abort(400, description="Phiên khám online cần liên kết cuộc gọi HTTPS.")
    if not isinstance(notes, str) or len(notes) > 8000:
        abort(400, description="Ghi chú phiên khám vượt quá giới hạn.")
    session = consultation_service.create(g.user, appointment_id, {
        "start_time": now(),
        "end_time": None,
        "actual_duration_minutes": None,
        "meeting_url": meeting_url.strip() or None,
        "diagnosis_notes": notes.strip() or None,
    })
    appointment_row = appointments.details(appointment_id)
    return jsonify(consultation=_consultation({
        **session.__dict__,
        "patient_id": appointment_row["patient_id"],
        "patient_name": appointment_row["patient_name"],
        "appointment_date_time": appointment_row["appointment_date_time"],
        "appointment_type": appointment_row["appointment_type"],
    })), 201


@bp.patch("/consultations/<session_id>")
@require_roles("DOCTOR")
def update_consultation(session_id):
    data = request.get_json(silent=True)
    notes = data.get("diagnosis_notes") if isinstance(data, dict) else None
    meeting_url = data.get("meeting_url") if isinstance(data, dict) else None
    if not isinstance(notes, str) or len(notes) > 8000:
        abort(400, description="Ghi chú phiên khám không hợp lệ.")
    if meeting_url is not None:
        if not isinstance(meeting_url, str) or len(meeting_url) > 255:
            abort(400, description="Liên kết cuộc gọi không hợp lệ.")
        if meeting_url:
            parsed_url = urlsplit(meeting_url)
            if parsed_url.scheme != "https" or not parsed_url.netloc:
                abort(400, description="Liên kết cuộc gọi phải sử dụng HTTPS.")
    session = consultation_service.update_notes(
        g.user,
        session_id,
        notes.strip(),
        meeting_url.strip() if meeting_url is not None else None,
    )
    return jsonify(session_id=session.session_id, diagnosis_notes=session.diagnosis_notes or "")


@bp.post("/consultations/<session_id>/finish")
@require_roles("DOCTOR")
def finish_consultation(session_id):
    data = request.get_json(silent=True) or {}
    prescription_data = data.get("prescription")
    history_data = data.get("medical_history")
    if prescription_data is not None and not isinstance(prescription_data, dict):
        abort(400, description="Dữ liệu đơn thuốc không hợp lệ.")
    if not isinstance(history_data, dict):
        abort(400, description="Bệnh sử là bắt buộc khi kết thúc phiên khám.")
    with transaction():
        session = consultation_service.finish(g.user, session_id, now())
        history_service.create(g.user, session_id, history_data)
        prescription = (
            prescription_service.create(g.user, session_id, prescription_data)
            if prescription_data is not None else None
        )
    return jsonify(
        session_id=session.session_id,
        status="Hoàn thành",
        prescription_id=prescription.prescription_id if prescription else None,
    )


@bp.get("/medications")
@require_roles("DOCTOR")
def list_medications():
    medications_data = query(
        "SELECT medication_id AS id, medication_name AS name, description FROM medication ORDER BY medication_name"
    )
    return jsonify(medications=medications_data)


@bp.post("/consultations/<session_id>/prescription")
@require_roles("DOCTOR")
def add_prescription(session_id):
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        abort(400, description="Dữ liệu đơn thuốc không hợp lệ.")
    rx = prescription_service.create(g.user, session_id, data)
    items = prescriptions.items(rx.prescription_id)
    return jsonify(
        message="Kê đơn thuốc thành công.",
        prescription={
            "id": rx.prescription_id,
            "sessionId": session_id,
            "date": _iso(rx.prescription_date),
            "count": len(items),
            "status": "Đã kê",
            "diagnosis": rx.diagnosis_icd or "",
            "instructions": rx.instructions or "",
            "items": [
                {
                    "name": item["medication_name"],
                    "dosage": item["dosage"],
                    "frequency": item["frequency"],
                    "duration": item["duration"],
                    "instructions": item["special_instructions"] or "",
                }
                for item in items
            ],
        },
    ), 201


@bp.patch("/profile")
@require_roles("DOCTOR")
def update_profile():
    from ...utils.validators import validate_email, validate_person_name, validate_phone, validate_text

    data = request.get_json(silent=True)
    fields = ("full_name", "phone", "email", "license_number")
    if not isinstance(data, dict) or set(data) != set(fields):
        abort(400, description="Thông tin hồ sơ bác sĩ không hợp lệ.")
    if any(not isinstance(data[key], str) or not data[key].strip() for key in fields):
        abort(400, description="Vui lòng nhập đầy đủ thông tin hồ sơ hợp lệ.")
    doctor = doctor_service.own_doctor(g.user)
    clean_name = validate_person_name(data["full_name"], "Họ và tên bác sĩ", normalize_case=False)
    raw_phone = data["phone"].strip()
    clean_phone = raw_phone if raw_phone == doctor.phone else validate_phone(raw_phone, "Số điện thoại bác sĩ")
    clean_email = validate_email(data["email"], "Email bác sĩ", required=True)
    clean_license = validate_text(data["license_number"], "Số giấy phép hành nghề", required=True, max_len=50)
    updated = doctor_service.update_profile(
        g.user,
        doctor.doctor_id,
        {
            "full_name": clean_name,
            "phone": clean_phone,
            "email": clean_email,
            "license_number": clean_license,
        },
    )
    return jsonify(profile={
        "id": updated.doctor_id,
        "name": updated.full_name,
        "email": updated.email,
        "phone": updated.phone,
        "license": updated.license_number,
    })
