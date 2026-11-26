"""JSON API for the authenticated patient portal."""

from datetime import date, datetime, timedelta
from flask import Blueprint, abort, g, jsonify, request

from ...db import query
from ...repositories import appointments, doctors, medical_history, patients, prescriptions
from ...security import require_roles
from ...services import patients as patient_service, appointments as appointment_service
from ...services.common import now

bp = Blueprint("patient_portal_api", __name__, url_prefix="/api/patient")

APPOINTMENT_STATUS_LABELS = {
    "Scheduled": "Đã xác nhận",
    "Checked-In": "Đã tiếp nhận",
    "Completed": "Đã hoàn thành",
    "Cancelled": "Đã hủy",
    "No-show": "Không đến khám",
}


@bp.before_request
def require_authenticated_patient():
    if g.user is None:
        abort(401, description="Vui lòng đăng nhập để tiếp tục.")
    if g.user.role != "PATIENT":
        abort(403, description="Chỉ bệnh nhân mới có quyền truy cập.")


def _iso(value):
    return value.isoformat() if value is not None else None


def _format_date_vi(dt):
    if not dt:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%d/%m/%Y")
    if isinstance(dt, date):
        return dt.strftime("%d/%m/%Y")
    return str(dt)


def _format_time_vi(dt):
    if not dt:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%H:%M")
    return str(dt)


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
    for line in (notes or "").splitlines():
        label = next((name for name in labels if line.strip() == f"{name}:"), None)
        if label:
            current = labels[label]
        elif current:
            values[current] = f"{values[current]}\n{line}".strip()
    if notes and not any(values.values()):
        values["notes"] = notes
    return values


@bp.get("/portal")
@require_roles("PATIENT")
def portal_data():
    appointment_service.auto_noshow_appointments()
    patient = patient_service.own_profile(g.user)
    appointment_rows = appointments.list_for(g.user)

    # 1. Profile
    profile_data = {
        "id": patient.patient_id,
        "name": patient.full_name,
        "dob": _iso(patient.date_of_birth),
        "gender": {"Male": "Nam", "Female": "Nữ", "Other": "Khác"}.get(patient.gender, patient.gender),
        "phone": patient.phone,
        "email": patient.email or "",
        "address": patient.address or "",
        "blood": patient.blood_type or "Chưa ghi nhận",
        "allergies": patient.allergies or "Không có dị ứng đã biết",
        "chronicDiseases": patient.chronic_diseases or "Không có",
        "emergencyContactName": patient.emergency_contact_name or "",
        "emergencyContactPhone": patient.emergency_contact_phone or "",
    }

    # 2. Doctors directory with GP / Specialist and dynamic live shifts
    all_doctors = doctors.directory()
    upcoming_shifts = query(
        """SELECT s.doctor_id, s.schedule_date, s.start_time, s.end_time
           FROM (
               SELECT doctor_id, schedule_date, start_time, end_time,
                      ROW_NUMBER() OVER (PARTITION BY doctor_id ORDER BY schedule_date ASC, start_time ASC) as rn
               FROM doctor_schedule
               WHERE schedule_date >= CURRENT_DATE() AND availability_status = 'Available'
           ) s
           WHERE s.rn = 1"""
    )
    shift_by_doc = {r["doctor_id"]: r for r in upcoming_shifts}
    today = now().date()

    doctor_list = []
    for d in all_doctors:
        sp_name = d["specialty_name"]
        if d["subtype"] == "GENERAL_PRACTITIONER" or sp_name in ("General Practitioner", "General Practice"):
            specialty_display = "Đa khoa"
        else:
            specialty_display = sp_name

        shift = shift_by_doc.get(d["doctor_id"])
        if shift:
            s_date = shift["schedule_date"]
            s_time = shift["start_time"]
            time_str = s_time.strftime("%H:%M") if hasattr(s_time, "strftime") else str(s_time)[:5]
            if s_date == today:
                next_display = f"Hôm nay, {time_str}"
            elif s_date == today + timedelta(days=1):
                next_display = f"Ngày mai, {time_str}"
            else:
                next_display = f"{s_date.strftime('%d/%m/%Y')}, {time_str}"
            is_available = True
        else:
            next_display = "Tạm thời hết lịch"
            is_available = False

        doctor_list.append({
            "id": d["doctor_id"],
            "name": d["full_name"],
            "specialty": specialty_display,
            "subtype": d["subtype"],
            "experience": "10 năm kinh nghiệm",
            "next": next_display,
            "available": is_available,
            "rating": "4.9",
            "phone": d["phone"],
            "email": d["email"],
        })

    # 3. Appointments
    appointment_list = []
    for a in appointment_rows:
        starts = a["appointment_date_time"]
        sp_name = a.get("specialty_name") or "Đa khoa"
        if sp_name in ("General Practitioner", "General Practice"):
            sp_name = "Đa khoa"
        appointment_list.append({
            "id": a["appointment_id"],
            "doctor": a["doctor_name"],
            "doctorId": a["doctor_id"],
            "specialty": sp_name,
            "date": _format_date_vi(starts),
            "rawDate": _iso(starts.date()) if starts else "",
            "time": _format_time_vi(starts),
            "type": "Tư vấn trực tuyến" if a["appointment_type"] == "Telemedicine" else "Khám trực tiếp",
            "status": APPOINTMENT_STATUS_LABELS.get(a["status"], a["status"]),
            "rawStatus": a["status"],
            "reason": a.get("reason") or "Khám sức khỏe tổng quát",
            "sessionId": a.get("session_id"),
        })

    # 4. Consultation sessions for this patient
    session_rows = query(
        """SELECT cs.session_id, cs.appointment_id, cs.start_time, cs.end_time,
                  cs.actual_duration_minutes, cs.session_type, cs.meeting_url,
                  cs.diagnosis_notes, a.appointment_date_time, a.appointment_type,
                  a.reason AS appt_reason,
                  d.doctor_id, d.full_name AS doctor_name,
                  CASE WHEN gp.doctor_id IS NOT NULL THEN 'Đa khoa'
                       WHEN sp.specialty_name = 'General Practitioner' THEN 'Đa khoa'
                       ELSE COALESCE(sp.specialty_name, 'Đa khoa') END AS specialty_name
           FROM consultation_session cs
           JOIN appointment a ON a.appointment_id = cs.appointment_id
           JOIN doctor d ON d.doctor_id = a.doctor_id
           LEFT JOIN general_practitioner gp ON gp.doctor_id = d.doctor_id
           LEFT JOIN specialist st ON st.doctor_id = d.doctor_id
           LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
           WHERE a.patient_id = %s
           ORDER BY cs.start_time DESC""",
        (patient.patient_id,),
    )

    # Cross references: find prescriptions by session_id
    prescriptions_by_session = {}
    for rx in prescriptions.list_for(g.user):
        prescriptions_by_session[rx["session_id"]] = rx

    consultation_list = []
    for s in session_rows:
        fields = _clinical_fields(s["diagnosis_notes"])
        is_active = s["end_time"] is None
        rx_match = prescriptions_by_session.get(s["session_id"])
        consultation_list.append({
            "id": s["session_id"],
            "appointmentId": s["appointment_id"],
            "doctor": s["doctor_name"],
            "doctorId": s["doctor_id"],
            "specialty": s["specialty_name"],
            "date": _format_date_vi(s["start_time"]),
            "rawDate": _iso(s["start_time"].date()) if s["start_time"] else "",
            "time": _format_time_vi(s["start_time"]),
            "startedAt": _iso(s["start_time"]),
            "endedAt": _iso(s["end_time"]),
            "duration": s["actual_duration_minutes"] if s["actual_duration_minutes"] is not None else 5,
            "status": "Đang khám" if is_active else "Đã hoàn thành",
            "isActive": is_active,
            "modality": "Tư vấn trực tuyến" if s["session_type"] == "Virtual" else "Khám trực tiếp",
            "sessionType": s["session_type"],
            "meetingUrl": s["meeting_url"] or "",
            "complaint": fields["complaint"] or s.get("appt_reason") or "Theo dõi sức khỏe",
            "symptoms": fields["symptoms"] or ("Không ghi nhận bất thường đặc biệt." if not is_active else ""),
            "diagnosis": fields["diagnosis"] if is_active else (fields["diagnosis"] or "Khám và tư vấn sức khỏe"),
            "notes": fields["notes"] if is_active else (fields["notes"] or s["diagnosis_notes"] or "Đã tư vấn chế độ sinh hoạt và theo dõi định kỳ."),
            "plan": fields["plan"] or "",
            "prescriptionId": rx_match["prescription_id"] if (rx_match and not is_active) else None,
            "prescriptionSummary": f"{rx_match['item_count']} loại thuốc" if (rx_match and not is_active) else None,
        })

    # 5. Medical records / history
    doctor_map = {d["name"]: d["specialty"] for d in doctor_list}
    history_list = []
    for h in medical_history.list_for(g.user):
        history_list.append({
            "id": h["medical_history_id"],
            "sessionId": h["session_id"],
            "date": _format_date_vi(h["record_date"]),
            "rawDate": _iso(h["record_date"]),
            "diagnosis": h["diagnosis"],
            "symptoms": h["symptoms"],
            "notes": h["progress_notes"] or "Các chỉ số ổn định, tiếp tục theo dõi.",
            "doctor": h["doctor_name"],
            "specialty": doctor_map.get(h["doctor_name"], "Đa khoa"),
        })

    # 6. Prescriptions
    prescription_list = []
    for rx in prescriptions.list_for(g.user):
        items = prescriptions.items(rx["prescription_id"])
        prescription_list.append({
            "id": rx["prescription_id"],
            "sessionId": rx["session_id"],
            "date": _format_date_vi(rx["prescription_date"]),
            "rawDate": _iso(rx["prescription_date"]),
            "doctor": rx["doctor_name"],
            "specialty": doctor_map.get(rx["doctor_name"], "Đa khoa"),
            "diagnosis": rx["diagnosis_icd"] or "Kê đơn theo phác đồ điều trị",
            "count": rx["item_count"],
            "status": "Đang dùng",
            "notes": rx.get("instructions") or "Uống thuốc đúng giờ và đủ liều theo hướng dẫn.",
            "items": [
                {
                    "name": it["medication_name"],
                    "dosage": it["dosage"],
                    "frequency": it["frequency"],
                    "duration": f"{str(it['duration']).strip()} ngày" if str(it["duration"]).strip().isdigit() else str(it["duration"]).strip(),
                    "instructions": it["special_instructions"] or "Uống sau ăn",
                }
                for it in items
            ],
        })

    specialty_rows = query(
        "SELECT specialty_id AS id, specialty_name AS name, COALESCE(description, '') AS description FROM specialty ORDER BY specialty_id ASC"
    )

    return jsonify(
        profile=profile_data,
        doctors=doctor_list,
        specialties=specialty_rows,
        appointments=appointment_list,
        consultations=consultation_list,
        records=history_list,
        prescriptions=prescription_list,
    )


@bp.patch("/profile")
@require_roles("PATIENT")
def update_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, description="Dữ liệu cập nhật hồ sơ không hợp lệ.")
    allowed_fields = (
        "full_name", "date_of_birth", "gender", "phone", "email",
        "address", "blood_type", "allergies", "chronic_diseases",
        "emergency_contact_name", "emergency_contact_phone"
    )
    update_data = {}
    for key in allowed_fields:
        if key in data:
            val = data[key]
            update_data[key] = val.strip() if isinstance(val, str) else val

    patient_service.update_profile(g.user, update_data)
    patient = patient_service.own_profile(g.user)
    return jsonify(profile={
        "id": patient.patient_id,
        "name": patient.full_name,
        "phone": patient.phone,
        "email": patient.email or "",
        "address": patient.address or "",
    })
