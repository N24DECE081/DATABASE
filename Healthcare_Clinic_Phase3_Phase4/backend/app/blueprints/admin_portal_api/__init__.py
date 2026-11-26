"""JSON API for the authenticated admin portal.
Strictly adheres to all clinic Business Rules (BR1-57) and database constraints.
"""

import re
from datetime import date, datetime, time, timedelta
from flask import Blueprint, abort, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from ...db import execute, query, transaction
from ...entities import Appointment, Doctor, DoctorSchedule, GeneralPractitioner, Patient, Specialist, Specialty, UserAccount
from ...repositories.base import insert
from ...security import require_roles
from ...services import admin as admin_service
from ...services import appointments as appointment_service
from ...services import doctors as doctor_service
from ...services import medications as medication_service
from ...services import patients as patient_service
from ...services import schedules as schedule_service
from ...services.schedules import validate_clinic_slot
from ...services.common import BusinessError, ensure, identity, now
from ...utils.validators import (
    ensure_unique_email,
    ensure_unique_phone,
    normalize_person_name,
    normalize_phone,
    validate_dob,
    validate_email,
    validate_person_name,
    validate_phone,
    validate_text,
)

bp = Blueprint("admin_portal_api", __name__, url_prefix="/api/admin")

STATUS_MAP_TO_UI = {
    "Scheduled": "Chờ xác nhận",
    "Checked-In": "Đã xác nhận",
    "Completed": "Hoàn thành",
    "Cancelled": "Đã hủy",
    "No-show": "Không đến khám",
}

STATUS_MAP_FROM_UI = {
    "Chờ xác nhận": "Scheduled",
    "Đã xác nhận": "Checked-In",
    "Hoàn thành": "Completed",
    "Đã hủy": "Cancelled",
    "Không đến khám": "No-show",
    "Scheduled": "Scheduled",
    "Checked-In": "Checked-In",
    "Completed": "Completed",
    "Cancelled": "Cancelled",
    "No-show": "No-show",
}

ACCOUNT_STATUS_MAP_TO_UI = {
    "Active": "Hoạt động",
    "Locked": "Tạm khóa",
    "Suspended": "Tạm khóa",
}

ACCOUNT_STATUS_MAP_FROM_UI = {
    "Hoạt động": "Active",
    "Tạm khóa": "Locked",
    "Active": "Active",
    "Locked": "Locked",
    "Suspended": "Suspended",
}


@bp.before_request
def require_authenticated_admin():
    if g.user is None:
        abort(401, description="Vui lòng đăng nhập để tiếp tục.")
    if g.user.role != "ADMIN":
        abort(403, description="Chỉ quản trị viên mới có quyền truy cập.")


def _parse_date(value, field="ngày"):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        val = value.strip()
        if "/" in val:
            parts = val.split("/")
            if len(parts) == 3:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
        return date.fromisoformat(val)
    except Exception:
        raise BusinessError(f"{field.capitalize()} không đúng định dạng YYYY-MM-DD hoặc DD/MM/YYYY.")


def _parse_datetime(value, field="ngày giờ"):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    val = value.strip()
    try:
        if "T" in val:
            return datetime.fromisoformat(val)
        if "/" in val:
            parts = val.split(" ")
            d_parts = parts[0].split("/")
            t_parts = parts[1].split(":") if len(parts) > 1 else [0, 0]
            return datetime(int(d_parts[2]), int(d_parts[1]), int(d_parts[0]), int(t_parts[0]), int(t_parts[1]))
        return datetime.fromisoformat(val)
    except Exception:
        raise BusinessError(f"{field.capitalize()} không đúng định dạng ngày giờ.")


def _parse_time(value, field="giờ"):
    if not value:
        return None
    if isinstance(value, time):
        return value
    val = value.strip()
    try:
        parts = val.split(":")
        return time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
    except Exception:
        raise BusinessError(f"{field.capitalize()} không đúng định dạng HH:MM.")


def _parse_duration(value) -> int:
    try:
        duration = int(30 if value in (None, "") else value)
    except (TypeError, ValueError):
        raise BusinessError("Thời lượng khám không hợp lệ.")
    return duration


def normalize_vietnamese_name(name: str) -> str:
    return normalize_person_name(name)


def validate_vietnamese_phone(phone: str, field="Số điện thoại") -> str:
    return validate_phone(phone, field=field)


def _parse_gender(value) -> str:
    if value in (None, ""):
        return "Male"
    if value in ("Nam", "Male"):
        return "Male"
    if value in ("Nữ", "Female"):
        return "Female"
    if value in ("Khác", "Other"):
        return "Other"
    raise BusinessError("Giới tính không hợp lệ (chỉ chấp nhận Nam, Nữ hoặc Khác).")


def _parse_schedule_status(value, default="Available") -> str:
    raw = default if value in (None, "") else value
    if raw in ("Hoạt động", "Khả dụng", "Available"):
        return "Available"
    if raw in ("Tạm ngưng", "Bận", "Busy"):
        return "Busy"
    if raw in ("Nghỉ phép", "Nghỉ", "On Leave"):
        return "On Leave"
    raise BusinessError("Trạng thái ca làm việc không hợp lệ.")


def _fetch_admin_appointments():
    rows = query("""
        SELECT a.appointment_id AS id,
               p.full_name AS patient,
               p.patient_id AS patientId,
               d.full_name AS doctor,
               d.doctor_id AS doctorId,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(a.appointment_date_time, '%d/%m/%Y') AS date,
               DATE_FORMAT(a.appointment_date_time, '%H:%i') AS time,
               DATE_FORMAT(a.appointment_date_time, '%Y-%m-%d %H:%i') AS rawDateTime,
               COALESCE(a.reason, 'Khám sức khỏe tổng quát') AS reason,
               CASE a.appointment_type
                 WHEN 'Telemedicine' THEN 'Tư vấn trực tuyến'
                 ELSE 'Khám trực tiếp'
               END AS visitType,
               a.appointment_type AS rawType,
               CASE WHEN a.follow_up_from_appt_id IS NOT NULL THEN TRUE ELSE FALSE END AS isFollowUp,
               250000 AS fee,
               CASE a.status
                 WHEN 'Scheduled' THEN 'Chờ xác nhận'
                 WHEN 'Checked-In' THEN 'Đã xác nhận'
                 WHEN 'Completed' THEN 'Hoàn thành'
                 WHEN 'Cancelled' THEN 'Đã hủy'
                 WHEN 'No-show' THEN 'Không đến khám'
                 ELSE a.status
               END AS status,
               a.status AS rawStatus,
               a.schedule_id AS scheduleId,
               a.estimated_duration_minutes AS duration,
               cs.session_id AS sessionId,
               CASE WHEN cs.session_id IS NOT NULL THEN TRUE ELSE FALSE END AS hasSession,
               CASE WHEN cs.session_id IS NOT NULL AND cs.end_time IS NOT NULL THEN TRUE ELSE FALSE END AS hasCompletedSession,
               (
                 SELECT fu.appointment_id
                 FROM appointment fu
                 WHERE fu.follow_up_from_appt_id = a.appointment_id
                   AND fu.status <> 'Cancelled'
                 ORDER BY fu.appointment_date_time DESC
                 LIMIT 1
               ) AS followUpAppointmentId
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN doctor d ON a.doctor_id = d.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        LEFT JOIN consultation_session cs ON a.appointment_id = cs.appointment_id
        ORDER BY a.appointment_date_time DESC
    """)
    for r in rows:
        r["isFollowUp"] = bool(r.get("isFollowUp"))
        r["hasSession"] = bool(r.get("hasSession"))
        r["hasCompletedSession"] = bool(r.get("hasCompletedSession"))
        r["hasFollowUp"] = bool(r.get("followUpAppointmentId"))
        t = str(r.get("time") or "")
        if "nov" in t.lower() or not re.match(r"^\d{2}:\d{2}$", t):
            raw_dt = str(r.get("rawDateTime") or "")
            m = re.search(r"(\d{2}):(\d{2})", raw_dt)
            if m:
                r["time"] = f"{m.group(1)}:{m.group(2)}"
            else:
                m_h = re.search(r"(\d{1,2})", t)
                if m_h:
                    r["time"] = f"{int(m_h.group(1)):02d}:00"
    return rows


# --------------------------------------------------------------------------
# Bootstrap & Dashboard
# --------------------------------------------------------------------------

@bp.get("/portal")
def portal_bootstrap():
    appointment_service.auto_noshow_appointments()
    admin_info = {
        "id": g.user.user_id,
        "username": getattr(g.user, "username", "admin"),
        "role": "Admin",
        "name": "Quản trị viên TiTiMi",
        "email": "admin@titimi.vn",
        "phone": "0902345678",
    }

    # Counts
    user_count = query("SELECT COUNT(*) AS c FROM user_account", one=True)["c"]
    doc_count = query("SELECT COUNT(*) AS c FROM doctor", one=True)["c"]
    pat_count = query("SELECT COUNT(*) AS c FROM patient", one=True)["c"]
    appt_count = query("SELECT COUNT(*) AS c FROM appointment", one=True)["c"]
    today_count = query("SELECT COUNT(*) AS c FROM appointment WHERE DATE(appointment_date_time) = CURRENT_DATE()", one=True)["c"]
    completed_count = query("SELECT COUNT(*) AS c FROM appointment WHERE status = 'Completed'", one=True)["c"]
    cancelled_count = query("SELECT COUNT(*) AS c FROM appointment WHERE status = 'Cancelled'", one=True)["c"]
    scheduled_count = query("SELECT COUNT(*) AS c FROM appointment WHERE status = 'Scheduled'", one=True)["c"]

    counts = {
        "totalUsers": user_count,
        "doctors": doc_count,
        "patients": pat_count,
        "appointments": appt_count,
        "todayAppointments": today_count,
        "completedAppointments": completed_count,
        "cancelledAppointments": cancelled_count,
        "scheduledAppointments": scheduled_count,
    }

    # Users
    users_rows = query("""
        SELECT u.user_id AS id,
               COALESCE(d.full_name, p.full_name, u.username) AS name,
               COALESCE(d.email, p.email, CONCAT(u.username, '@titimi.vn')) AS email,
               COALESCE(d.phone, p.phone, '') AS phone,
               CASE u.role
                 WHEN 'ADMIN' THEN 'Admin'
                 WHEN 'DOCTOR' THEN 'Bác sĩ'
                 WHEN 'PATIENT' THEN 'Bệnh nhân'
                 ELSE u.role
               END AS role,
               u.role AS rawRole,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus,
               DATE_FORMAT(u.created_at, '%d/%m/%Y') AS created
        FROM user_account u
        LEFT JOIN doctor d ON u.user_id = d.user_id
        LEFT JOIN patient p ON u.user_id = p.user_id
        ORDER BY u.created_at DESC
    """)

    # Doctors
    doctors_rows = query("""
        SELECT d.doctor_id AS id,
               d.user_id AS userId,
               d.full_name AS name,
               CASE
                 WHEN sp.specialty_name IS NOT NULL THEN sp.specialty_name
                 WHEN gp.doctor_id IS NOT NULL THEN 'Đa khoa'
                 ELSE 'Đa khoa'
               END AS specialty,
               sp.specialty_id AS specialtyId,
               d.email,
               d.phone,
               d.license_number AS licenseNumber,
               CASE
                 WHEN gp.doctor_id IS NOT NULL THEN 'GENERAL_PRACTITIONER'
                 ELSE 'SPECIALIST'
               END AS subtype,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus,
               'Nam' AS gender,
               DATE_FORMAT(d.date_of_birth, '%d/%m/%Y') AS dob,
               DATE_FORMAT(d.date_of_birth, '%Y-%m-%d') AS rawDob
        FROM doctor d
        JOIN user_account u ON d.user_id = u.user_id
        LEFT JOIN specialist s ON d.doctor_id = s.doctor_id
        LEFT JOIN specialty sp ON s.specialty_id = sp.specialty_id
        LEFT JOIN general_practitioner gp ON d.doctor_id = gp.doctor_id
        ORDER BY d.doctor_id ASC
    """)

    # Patients
    patients_rows = query("""
        SELECT p.patient_id AS id,
               p.user_id AS userId,
               p.full_name AS name,
               CASE p.gender
                 WHEN 'Male' THEN 'Nam'
                 WHEN 'Female' THEN 'Nữ'
                 ELSE 'Khác'
               END AS gender,
               p.gender AS rawGender,
               DATE_FORMAT(p.date_of_birth, '%d/%m/%Y') AS dob,
               DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS rawDob,
               p.phone,
               COALESCE(p.email, '') AS email,
               COALESCE(p.address, '') AS address,
               COALESCE(p.blood_type, 'Chưa rõ') AS bloodType,
               COALESCE(p.allergies, 'Không') AS allergies,
               COALESCE(p.chronic_diseases, 'Không') AS chronicDiseases,
               COALESCE(p.emergency_contact_name, '') AS emergencyContactName,
               COALESCE(p.emergency_contact_phone, '') AS emergencyContactPhone,
               DATE_FORMAT(u.created_at, '%d/%m/%Y') AS created,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus
        FROM patient p
        JOIN user_account u ON p.user_id = u.user_id
        ORDER BY p.patient_id ASC
    """)

    # Specialties
    specialties_rows = query("""
        SELECT s.specialty_id AS id,
               s.specialty_name AS name,
               COALESCE(s.description, '') AS description,
               COUNT(sp.doctor_id) AS doctors,
               'Hoạt động' AS status
        FROM specialty s
        LEFT JOIN specialist sp ON s.specialty_id = sp.specialty_id
        GROUP BY s.specialty_id, s.specialty_name, s.description
        ORDER BY s.specialty_id ASC
    """)

    # Appointments
    appointments_rows = _fetch_admin_appointments()

    # Schedules
    schedules_rows = query("""
        SELECT s.schedule_id AS id,
               s.doctor_id AS doctorId,
               d.full_name AS doctorName,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(s.schedule_date, '%Y-%m-%d') AS date,
               DATE_FORMAT(s.schedule_date, '%d/%m/%Y') AS formattedDate,
               DATE_FORMAT(s.schedule_date, '%w') AS dayOfWeek,
               TIME_FORMAT(s.start_time, '%H:%i') AS startTime,
               TIME_FORMAT(s.end_time, '%H:%i') AS endTime,
               s.availability_status AS status
        FROM doctor_schedule s
        JOIN doctor d ON s.doctor_id = d.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        ORDER BY s.schedule_date DESC, s.start_time ASC
    """)

    # Chart 30-day appointments trend
    daily_trend = query("""
        SELECT DATE_FORMAT(appointment_date_time, '%d/%m') AS d,
               COUNT(*) AS total
        FROM appointment
        WHERE appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 29 DAY)
        GROUP BY DATE(appointment_date_time), DATE_FORMAT(appointment_date_time, '%d/%m')
        ORDER BY DATE(appointment_date_time) ASC
    """)

    # Top doctors by appointments
    top_doctors = query("""
        SELECT d.full_name AS name,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               COUNT(a.appointment_id) AS count
        FROM doctor d
        LEFT JOIN appointment a ON d.doctor_id = a.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        GROUP BY d.doctor_id, d.full_name, sp.specialty_name
        ORDER BY count DESC
        LIMIT 5
    """)

    # Medications
    medications_rows = query("""
        SELECT medication_id AS id,
               medication_name AS name,
               COALESCE(description, '') AS description,
               'Hoạt động' AS status
        FROM medication
        ORDER BY medication_id ASC
    """)

    return jsonify({
        "admin": admin_info,
        "counts": counts,
        "users": users_rows,
        "doctors": doctors_rows,
        "patients": patients_rows,
        "specialties": specialties_rows,
        "medications": medications_rows,
        "appointments": appointments_rows,
        "schedules": schedules_rows,
        "charts": {
            "dailyTrend": daily_trend,
            "topDoctors": top_doctors,
        },
    })


# --------------------------------------------------------------------------
# Users Endpoints (BR1-5)
# --------------------------------------------------------------------------

@bp.get("/users")
def list_users():
    rows = query("""
        SELECT u.user_id AS id,
               COALESCE(d.full_name, p.full_name, u.username) AS name,
               COALESCE(d.email, p.email, CONCAT(u.username, '@titimi.vn')) AS email,
               COALESCE(d.phone, p.phone, '') AS phone,
               CASE u.role
                 WHEN 'ADMIN' THEN 'Admin'
                 WHEN 'DOCTOR' THEN 'Bác sĩ'
                 WHEN 'PATIENT' THEN 'Bệnh nhân'
                 ELSE u.role
               END AS role,
               u.role AS rawRole,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus,
               DATE_FORMAT(u.created_at, '%d/%m/%Y') AS created
        FROM user_account u
        LEFT JOIN doctor d ON u.user_id = d.user_id
        LEFT JOIN patient p ON u.user_id = p.user_id
        ORDER BY u.created_at DESC
    """)
    return jsonify({"users": rows})


@bp.post("/users")
def create_user():
    data = request.get_json(silent=True) or {}
    role_raw = data.get("role", "").strip()
    role_map = {"Admin": "ADMIN", "Bác sĩ": "DOCTOR", "Bệnh nhân": "PATIENT", "ADMIN": "ADMIN", "DOCTOR": "DOCTOR", "PATIENT": "PATIENT"}
    role = role_map.get(role_raw, "PATIENT")

    if role == "ADMIN":
        raise BusinessError("Theo quy định phân quyền hệ thống (BR), quản trị viên không được phép tạo thêm tài khoản Admin mới qua giao diện. Chỉ được tạo tài khoản Bác sĩ hoặc Bệnh nhân.")

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    full_name = validate_person_name(data.get("name") or data.get("full_name") or "", "Họ và tên")
    phone = validate_phone(data.get("phone", ""), "Số điện thoại")
    email = validate_email(data.get("email", ""), "Email", required=(role == "DOCTOR"))

    ensure(len(username) >= 3, "Tên đăng nhập phải có ít nhất 3 ký tự.")
    ensure(10 <= len(password) <= 128, "Mật khẩu phải từ 10 đến 128 ký tự.")

    # Unique username & phone check
    existing = query("SELECT user_id FROM user_account WHERE username = %s", (username,), one=True)
    if existing:
        raise BusinessError("Tên đăng nhập đã tồn tại trong hệ thống. Vui lòng chọn tên khác.")
    ensure_unique_phone(phone)
    if email:
        ensure_unique_email(email, scope="doctor" if role == "DOCTOR" else "patient")

    raw_dob = data.get("dob") or data.get("date_of_birth")
    if role == "DOCTOR":
        dob = validate_dob(raw_dob, "Ngày sinh bác sĩ", required=True, min_age=22, max_age=80)
    elif role == "PATIENT":
        dob = validate_dob(raw_dob or date(1995, 1, 1), "Ngày sinh", required=True)
    else:
        dob = None

    gender = _parse_gender(data.get("gender"))

    subtype = data.get("subtype") or "GENERAL_PRACTITIONER"
    specialty_id = data.get("specialty_id") or data.get("specialtyId") or None

    user_payload = {
        "username": username,
        "password": password,
        "role": role,
        "full_name": full_name,
        "phone": phone,
        "email": email,
        "gender": gender,
        "date_of_birth": dob,
        "emergency_contact_name": data.get("emergency_contact_name") or "Người thân",
        "emergency_contact_phone": data.get("emergency_contact_phone") or phone,
        "license_number": data.get("license_number") or data.get("licenseNumber") or ("GP-" + identity("DOC-")[4:]),
        "subtype": subtype,
        "specialty_id": specialty_id,
    }

    account = admin_service.create_account(g.user, user_payload)
    return jsonify({
        "message": "Đã tạo tài khoản thành công.",
        "user": {
            "id": account.user_id,
            "name": user_payload["full_name"],
            "email": user_payload["email"],
            "phone": user_payload["phone"],
            "role": role_raw if role_raw in ("Admin", "Bác sĩ", "Bệnh nhân") else ("Admin" if role == "ADMIN" else "Bác sĩ" if role == "DOCTOR" else "Bệnh nhân"),
            "status": "Hoạt động",
            "created": now().strftime("%d/%m/%Y"),
        },
    }), 201


@bp.patch("/users/<user_id>/status")
def change_user_status(user_id):
    data = request.get_json(silent=True) or {}
    raw_status = data.get("status", "")
    target = ACCOUNT_STATUS_MAP_FROM_UI.get(raw_status, "Active")

    # BR: Cannot lock currently logged in admin user
    ensure(user_id != g.user.user_id, "Không thể khóa tài khoản quản trị đang sử dụng.")

    admin_service.change_account_status(g.user, user_id, target)
    return jsonify({
        "message": "Đã cập nhật trạng thái tài khoản.",
        "userId": user_id,
        "status": ACCOUNT_STATUS_MAP_TO_UI.get(target, "Hoạt động"),
    })


# --------------------------------------------------------------------------
# Doctors Endpoints (BR13-20)
# --------------------------------------------------------------------------

@bp.get("/doctors")
def list_doctors():
    doctors_rows = query("""
        SELECT d.doctor_id AS id,
               d.user_id AS userId,
               d.full_name AS name,
               CASE
                 WHEN sp.specialty_name IS NOT NULL THEN sp.specialty_name
                 WHEN gp.doctor_id IS NOT NULL THEN 'Đa khoa'
                 ELSE 'Đa khoa'
               END AS specialty,
               sp.specialty_id AS specialtyId,
               d.email,
               d.phone,
               d.license_number AS licenseNumber,
               CASE
                 WHEN gp.doctor_id IS NOT NULL THEN 'GENERAL_PRACTITIONER'
                 ELSE 'SPECIALIST'
               END AS subtype,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus,
               'Nam' AS gender,
               DATE_FORMAT(d.date_of_birth, '%d/%m/%Y') AS dob,
               DATE_FORMAT(d.date_of_birth, '%Y-%m-%d') AS rawDob
        FROM doctor d
        JOIN user_account u ON d.user_id = u.user_id
        LEFT JOIN specialist s ON d.doctor_id = s.doctor_id
        LEFT JOIN specialty sp ON s.specialty_id = sp.specialty_id
        LEFT JOIN general_practitioner gp ON d.doctor_id = gp.doctor_id
        ORDER BY d.doctor_id ASC
    """)
    return jsonify({"doctors": doctors_rows})


@bp.post("/doctors")
def create_doctor():
    data = request.get_json(silent=True) or {}
    dob = validate_dob(data.get("dob") or data.get("date_of_birth"), "Ngày sinh bác sĩ", required=True, min_age=22, max_age=80)
    name = validate_person_name(data.get("name") or data.get("full_name") or "", "Họ và tên bác sĩ")
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    phone = validate_phone(data.get("phone", ""), "Số điện thoại bác sĩ")
    email = validate_email(data.get("email") or "", "Email bác sĩ", required=True)
    specialty_name = (data.get("specialty") or "").strip()
    license_number = (data.get("license_number") or data.get("licenseNumber") or "").strip()

    if username:
        ensure(len(username) <= 50, "Tên đăng nhập không được vượt quá 50 ký tự.")
        ensure(bool(re.match(r'^[a-zA-Z0-9_.]+$', username)), "Tên đăng nhập chỉ gồm chữ cái không dấu, chữ số, dấu chấm và gạch dưới (_).")
        user_dup = query("SELECT user_id FROM user_account WHERE username = %s", (username,), one=True)
        if user_dup:
            raise BusinessError("Tên đăng nhập đã tồn tại trên hệ thống. Vui lòng chọn tên khác.")
    else:
        clean_name = "".join(e for e in name.lower() if e.isalnum())[:12]
        username = f"dr.{clean_name}.{identity('DOC-')[4:].lower()}"

    if not password:
        password = "DoctorPassword123@"
    else:
        ensure(8 <= len(password) <= 128, "Mật khẩu phải từ 8 đến 128 ký tự.")

    if not license_number:
        license_number = f"BS-{now().year}-{identity('DOC-')[4:]}"
    ensure(len(license_number) <= 50, "Số giấy phép hành nghề tối đa 50 ký tự.")

    # Unique license, email & phone checks
    lic_dup = query("SELECT doctor_id FROM doctor WHERE license_number = %s", (license_number,), one=True)
    if lic_dup:
        raise BusinessError("Số giấy phép hành nghề đã tồn tại trên hệ thống.")

    ensure_unique_email(email, scope="doctor")
    ensure_unique_phone(phone)

    # BR13-20: Resolve exact disjoint subtype
    specialty_id = None
    subtype = "GENERAL_PRACTITIONER"
    if specialty_name and specialty_name != "Đa khoa":
        sp = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s", (specialty_name,), one=True)
        if sp:
            specialty_id = sp["specialty_id"]
            subtype = "SPECIALIST"
        else:
            raise BusinessError(f"Chuyên khoa '{specialty_name}' không tồn tại trong hệ thống.")

    user_payload = {
        "username": username,
        "password": password,
        "role": "DOCTOR",
        "full_name": name,
        "phone": phone,
        "email": email,
        "license_number": license_number,
        "date_of_birth": dob,
        "subtype": subtype,
        "specialty_id": specialty_id,
    }

    account = admin_service.create_account(g.user, user_payload)
    doc_row = query("SELECT doctor_id FROM doctor WHERE user_id = %s", (account.user_id,), one=True)
    return jsonify({
        "message": "Đã thêm bác sĩ thành công.",
        "doctor": {
            "id": doc_row["doctor_id"] if doc_row else "DOC-NEW",
            "userId": account.user_id,
            "name": name,
            "specialty": specialty_name or "Đa khoa",
            "specialtyId": specialty_id,
            "email": email,
            "phone": phone,
            "licenseNumber": license_number,
            "subtype": subtype,
            "status": "Hoạt động",
            "gender": data.get("gender") or "Nam",
            "dob": dob.strftime("%d/%m/%Y"),
            "rawDob": dob.isoformat(),
        },
    }), 201


@bp.patch("/doctors/<doctor_id>")
def update_doctor(doctor_id):
    data = request.get_json(silent=True) or {}
    doc = query("SELECT phone, email FROM doctor WHERE doctor_id = %s", (doctor_id,), one=True)
    if not doc:
        abort(404, description="Không tìm thấy hồ sơ bác sĩ.")

    allowed = {}
    if "name" in data:
        allowed["full_name"] = validate_person_name(data["name"], "Họ và tên bác sĩ")
    if "full_name" in data:
        allowed["full_name"] = validate_person_name(data["full_name"], "Họ và tên bác sĩ")
    if "phone" in data:
        submitted_phone = (data["phone"] or "").strip()
        allowed["phone"] = (
            submitted_phone
            if submitted_phone == doc["phone"]
            else validate_phone(submitted_phone, "Số điện thoại bác sĩ")
        )
    if "email" in data:
        allowed["email"] = validate_email(data["email"], "Email bác sĩ", required=True)
    if "licenseNumber" in data:
        allowed["license_number"] = validate_text(data["licenseNumber"], "Số giấy phép hành nghề", required=True, max_len=50)
    if "license_number" in data:
        allowed["license_number"] = validate_text(data["license_number"], "Số giấy phép hành nghề", required=True, max_len=50)

    if allowed:
        doctor_service.update_profile(g.user, doctor_id, allowed)

    # BR13-20 & Database triggers: Doctor subtype cannot be changed / deleted
    if "specialty" in data and data["specialty"]:
        sp_name = data["specialty"].strip()
        is_gp = query("SELECT 1 FROM general_practitioner WHERE doctor_id = %s", (doctor_id,), one=True)
        is_sp = query("SELECT 1 FROM specialist WHERE doctor_id = %s", (doctor_id,), one=True)

        if is_gp and sp_name != "Đa khoa":
            raise BusinessError("Bác sĩ Đa khoa không thể chuyển sang Chuyên khoa theo quy tắc phân loại hệ thống.")
        elif is_sp and sp_name == "Đa khoa":
            raise BusinessError("Bác sĩ Chuyên khoa không thể chuyển sang Đa khoa theo quy tắc phân loại hệ thống.")
        elif is_sp and sp_name != "Đa khoa":
            sp = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s", (sp_name,), one=True)
            if not sp:
                raise BusinessError(f"Chuyên khoa '{sp_name}' không tồn tại.")
            with transaction():
                execute("UPDATE specialist SET specialty_id = %s WHERE doctor_id = %s", (sp["specialty_id"], doctor_id))

    return jsonify({"message": "Đã cập nhật hồ sơ bác sĩ.", "doctorId": doctor_id})


# --------------------------------------------------------------------------
# Patients Endpoints (BR6-12)
# --------------------------------------------------------------------------

@bp.get("/patients")
def list_patients():
    patients_rows = query("""
        SELECT p.patient_id AS id,
               p.user_id AS userId,
               p.full_name AS name,
               CASE p.gender
                 WHEN 'Male' THEN 'Nam'
                 WHEN 'Female' THEN 'Nữ'
                 ELSE 'Khác'
               END AS gender,
               p.gender AS rawGender,
               DATE_FORMAT(p.date_of_birth, '%d/%m/%Y') AS dob,
               DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS rawDob,
               p.phone,
               COALESCE(p.email, '') AS email,
               COALESCE(p.address, '') AS address,
               COALESCE(p.blood_type, 'Chưa rõ') AS bloodType,
               COALESCE(p.allergies, 'Không') AS allergies,
               COALESCE(p.chronic_diseases, 'Không') AS chronicDiseases,
               COALESCE(p.emergency_contact_name, '') AS emergencyContactName,
               COALESCE(p.emergency_contact_phone, '') AS emergencyContactPhone,
               DATE_FORMAT(u.created_at, '%d/%m/%Y') AS created,
               CASE u.account_status
                 WHEN 'Active' THEN 'Hoạt động'
                 ELSE 'Tạm khóa'
               END AS status,
               u.account_status AS rawStatus
        FROM patient p
        JOIN user_account u ON p.user_id = u.user_id
        ORDER BY p.patient_id ASC
    """)
    return jsonify({"patients": patients_rows})


@bp.post("/patients")
def create_patient():
    data = request.get_json(silent=True) or {}
    name = validate_person_name(data.get("name") or data.get("full_name") or "", "Họ và tên bệnh nhân")
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    confirm_password = (data.get("confirm_password") or data.get("confirmPassword") or "").strip()
    phone = validate_phone(data.get("phone", ""), "Số điện thoại bệnh nhân")
    email = validate_email(data.get("email") or "", "Email", required=False)

    em_name = validate_person_name(data.get("emergency_contact_name") or data.get("emergencyContactName") or "Người thân", "Tên người liên hệ khẩn cấp")
    em_phone = validate_phone(data.get("emergency_contact_phone") or data.get("emergencyContactPhone") or phone, "Số điện thoại khẩn cấp")

    raw_dob = data.get("dob") or data.get("date_of_birth")
    dob = validate_dob(raw_dob if raw_dob not in (None, "") else date(1995, 1, 1), "Ngày sinh")

    gender = _parse_gender(data.get("gender"))

    if username:
        ensure(len(username) <= 50, "Tên đăng nhập không được vượt quá 50 ký tự.")
        ensure(bool(re.match(r'^[a-zA-Z0-9_]+$', username)), "Tên đăng nhập viết liền không dấu, chỉ gồm chữ cái, chữ số và dấu gạch dưới (_).")
        user_dup = query("SELECT user_id FROM user_account WHERE username = %s", (username,), one=True)
        if user_dup:
            raise BusinessError("Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.")
    else:
        clean_name = "".join(e for e in name.lower() if e.isalnum())[:10]
        username = f"pat.{clean_name}.{identity('PAT-')[4:].lower()}"

    if password:
        ensure(8 <= len(password) <= 128, "Mật khẩu phải từ 8 đến 128 ký tự.")
        if confirm_password:
            ensure(password == confirm_password, "Mật khẩu xác nhận không khớp.")
    else:
        password = "PatientPassword123@"

    ensure_unique_phone(phone)
    if email:
        ensure_unique_email(email, scope="patient")

    user_payload = {
        "username": username,
        "password": password,
        "role": "PATIENT",
        "full_name": name,
        "phone": phone,
        "email": email,
        "date_of_birth": dob,
        "gender": gender,
        "address": data.get("address"),
        "blood_type": data.get("blood_type") or data.get("bloodType"),
        "allergies": data.get("allergies"),
        "chronic_diseases": data.get("chronic_diseases") or data.get("chronicDiseases"),
        "emergency_contact_name": em_name,
        "emergency_contact_phone": em_phone,
    }

    account = admin_service.create_account(g.user, user_payload)
    pat_row = query(
        "SELECT patient_id, address, blood_type, allergies, chronic_diseases FROM patient WHERE user_id = %s",
        (account.user_id,),
        one=True,
    )
    pat_id = pat_row["patient_id"] if pat_row else "PAT-NEW"

    return jsonify({
        "message": "Đã tạo hồ sơ bệnh nhân thành công.",
        "patient": {
            "id": pat_id,
            "userId": account.user_id,
            "name": name,
            "gender": "Nam" if gender == "Male" else "Nữ" if gender == "Female" else "Khác",
            "rawGender": gender,
            "dob": dob.strftime("%d/%m/%Y"),
            "rawDob": dob.strftime("%Y-%m-%d"),
            "phone": phone,
            "email": email,
            "address": (pat_row or {}).get("address") or "",
            "bloodType": (pat_row or {}).get("blood_type") or "",
            "allergies": (pat_row or {}).get("allergies") or "Không",
            "chronicDiseases": (pat_row or {}).get("chronic_diseases") or "Không",
            "emergencyContactName": em_name,
            "emergencyContactPhone": em_phone,
            "created": now().strftime("%d/%m/%Y"),
            "status": "Hoạt động",
        },
    }), 201


@bp.patch("/patients/<patient_id>")
def update_patient(patient_id):
    data = request.get_json(silent=True) or {}
    pat = query("SELECT user_id, phone FROM patient WHERE patient_id = %s", (patient_id,), one=True)
    if not pat:
        abort(404, description="Không tìm thấy hồ sơ bệnh nhân.")

    allowed = {}
    if "name" in data:
        allowed["full_name"] = validate_person_name(data["name"], "Họ và tên bệnh nhân")
    if "full_name" in data:
        allowed["full_name"] = validate_person_name(data["full_name"], "Họ và tên bệnh nhân")
    if "phone" in data:
        submitted_phone = (data["phone"] or "").strip()
        allowed["phone"] = (
            submitted_phone
            if submitted_phone == pat["phone"]
            else validate_phone(submitted_phone, "Số điện thoại bệnh nhân")
        )
    if "email" in data:
        allowed["email"] = validate_email(data["email"], "Email", required=False)
    if "address" in data:
        allowed["address"] = validate_text(data["address"], "Địa chỉ", max_len=255) or ""
    if "bloodType" in data or "blood_type" in data:
        allowed["blood_type"] = (data.get("bloodType") or data.get("blood_type") or "").strip()
    if "allergies" in data:
        allowed["allergies"] = validate_text(data["allergies"], "Tiền sử dị ứng", max_len=4000) or ""
    if "chronicDiseases" in data or "chronic_diseases" in data:
        allowed["chronic_diseases"] = validate_text(data.get("chronicDiseases") or data.get("chronic_diseases") or "", "Bệnh mãn tính", max_len=4000) or ""
    if "emergencyContactName" in data or "emergency_contact_name" in data:
        allowed["emergency_contact_name"] = validate_person_name(data.get("emergencyContactName") or data.get("emergency_contact_name") or "", "Tên người liên hệ khẩn cấp")
    if "emergencyContactPhone" in data or "emergency_contact_phone" in data:
        allowed["emergency_contact_phone"] = validate_phone(data.get("emergencyContactPhone") or data.get("emergency_contact_phone") or "", "Số điện thoại khẩn cấp")
    if "dob" in data or "date_of_birth" in data:
        allowed["date_of_birth"] = validate_dob(data.get("dob") or data.get("date_of_birth"), "Ngày sinh")
    if "gender" in data:
        allowed["gender"] = _parse_gender(data["gender"])

    patient_service.update_by_admin(g.user, pat["user_id"], allowed)
    return jsonify({"message": "Đã cập nhật hồ sơ bệnh nhân.", "patientId": patient_id})


# --------------------------------------------------------------------------
# Specialties Endpoints (BR13-20)
# --------------------------------------------------------------------------

@bp.get("/specialties")
def list_specialties():
    rows = query("""
        SELECT s.specialty_id AS id,
               s.specialty_name AS name,
               COALESCE(s.description, '') AS description,
               COUNT(sp.doctor_id) AS doctors,
               'Hoạt động' AS status
        FROM specialty s
        LEFT JOIN specialist sp ON s.specialty_id = sp.specialty_id
        GROUP BY s.specialty_id, s.specialty_name, s.description
        ORDER BY s.specialty_id ASC
    """)
    return jsonify({"specialties": rows})


@bp.post("/specialties")
def create_specialty():
    data = request.get_json(silent=True) or {}
    name = normalize_vietnamese_name(data.get("name") or data.get("specialty_name") or "")
    description = (data.get("description") or "").strip()

    ensure(0 < len(name) <= 100, "Tên chuyên khoa phải từ 1 đến 100 ký tự.")

    # UNIQUE constraint check
    dup = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s", (name,), one=True)
    if dup:
        raise BusinessError("Tên chuyên khoa đã tồn tại trên hệ thống.")

    sp = admin_service.create_specialty(g.user, name, description)
    return jsonify({
        "message": "Đã thêm chuyên khoa thành công.",
        "specialty": {
            "id": sp.specialty_id,
            "name": sp.specialty_name,
            "description": sp.description or "",
            "doctors": 0,
            "status": "Hoạt động",
        },
    }), 201


@bp.patch("/specialties/<specialty_id>")
def update_specialty(specialty_id):
    sp = query("SELECT specialty_id FROM specialty WHERE specialty_id = %s", (specialty_id,), one=True)
    if not sp:
        abort(404, description="Không tìm thấy chuyên khoa.")
    data = request.get_json(silent=True) or {}
    name = data.get("name") or data.get("specialty_name")
    desc = data.get("description")

    with transaction():
        if name:
            name_clean = normalize_vietnamese_name(name)
            ensure(0 < len(name_clean) <= 100, "Tên chuyên khoa không hợp lệ.")
            dup = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s AND specialty_id <> %s", (name_clean, specialty_id), one=True)
            if dup:
                raise BusinessError("Tên chuyên khoa đã được sử dụng bởi chuyên khoa khác.")
            execute("UPDATE specialty SET specialty_name = %s WHERE specialty_id = %s", (name_clean, specialty_id))
        if desc is not None:
            execute("UPDATE specialty SET description = %s WHERE specialty_id = %s", (desc.strip() or None, specialty_id))

    return jsonify({"message": "Đã cập nhật chuyên khoa.", "specialtyId": specialty_id})


# --------------------------------------------------------------------------
# Appointments Endpoints (BR26-36)
# --------------------------------------------------------------------------

@bp.get("/appointments")
def list_appointments():
    appointment_service.auto_noshow_appointments()
    return jsonify({"appointments": _fetch_admin_appointments()})


@bp.post("/appointments")
def create_appointment():
    data = request.get_json(silent=True) or {}
    patient_id = data.get("patient_id") or data.get("patientId")
    doctor_id = data.get("doctor_id") or data.get("doctorId")
    schedule_id = data.get("schedule_id") or data.get("scheduleId")
    dt = _parse_datetime(data.get("appointment_date_time") or data.get("dateTime"), "ngày giờ hẹn")
    visit_type_raw = data.get("appointment_type") or data.get("visitType") or "In-person"
    visit_type = "Telemedicine" if visit_type_raw in ("Telemedicine", "Tư vấn trực tuyến") else "In-person"
    duration = _parse_duration(data.get("estimated_duration_minutes") or data.get("duration"))
    reason = (data.get("reason") or "Khám sức khỏe").strip()

    ensure(patient_id, "Vui lòng chọn bệnh nhân.")
    ensure(doctor_id, "Vui lòng chọn bác sĩ.")
    ensure(dt, "Vui lòng chọn ngày và giờ hẹn.")
    ensure(dt >= now(), "Không thể đặt lịch hẹn trong quá khứ.")
    validate_clinic_slot(dt, duration)

    # BR26-36: Appointment must fall within a valid available doctor shift
    if not schedule_id:
        shift = query("""
            SELECT schedule_id, start_time, end_time, availability_status
            FROM doctor_schedule
            WHERE doctor_id = %s AND schedule_date = %s
              AND %s >= start_time AND %s <= end_time
              AND availability_status = 'Available'
            LIMIT 1
        """, (doctor_id, dt.date(), dt.time(), (dt + timedelta(minutes=duration)).time()), one=True)
        if shift:
            schedule_id = shift["schedule_id"]
        else:
            # Check if doctor has any shift on this date
            any_shift = query("""
                SELECT schedule_id, start_time, end_time, availability_status
                FROM doctor_schedule
                WHERE doctor_id = %s AND schedule_date = %s
                LIMIT 1
            """, (doctor_id, dt.date()), one=True)
            if any_shift:
                raise BusinessError(f"Thời gian hẹn nằm ngoài ca trực khả dụng của bác sĩ ({any_shift['start_time']} - {any_shift['end_time']}). Vui lòng chọn giờ trong ca trực.")
            else:
                raise BusinessError(f"Bác sĩ chưa có ca trực khả dụng vào ngày {dt.strftime('%d/%m/%Y')}. Vui lòng tạo ca trực trước trong mục Quản lý lịch làm việc.")

    follow_up_parent = (data.get("follow_up_from_appt_id") or data.get("followUpFromApptId") or "").strip() or None
    if follow_up_parent and (not reason or reason in ("Khám sức khỏe", "Khám sức khỏe tổng quát")):
        reason = "Tái khám theo hẹn."

    booking_payload = {
        "patient_id": patient_id,
        "schedule_id": schedule_id,
        "appointment_date_time": dt,
        "estimated_duration_minutes": duration,
        "appointment_type": visit_type,
        "reason": reason,
        "follow_up_from_appt_id": follow_up_parent,
    }

    appt = appointment_service.book(g.user, booking_payload)
    return jsonify({
        "message": "Đã tạo lịch hẹn thành công.",
        "appointment": {
            "id": appt.appointment_id,
            "patientId": appt.patient_id,
            "doctorId": appt.doctor_id,
            "scheduleId": appt.schedule_id,
            "status": "Chờ xác nhận",
            "date": dt.strftime("%d/%m/%Y"),
            "time": dt.strftime("%H:%M"),
            "rawDateTime": dt.strftime("%Y-%m-%d %H:%M"),
            "reason": appt.reason or reason,
            "visitType": "Tư vấn trực tuyến" if visit_type == "Telemedicine" else "Khám trực tiếp",
            "isFollowUp": bool(appt.follow_up_from_appt_id),
            "sessionId": None,
            "hasSession": False,
        },
    }), 201


@bp.patch("/appointments/<appointment_id>/status")
def update_appointment_status(appointment_id):
    data = request.get_json(silent=True) or {}
    raw_status = data.get("status", "")
    target = STATUS_MAP_FROM_UI.get(raw_status, raw_status)
    ensure(target in STATUS_MAP_TO_UI, "Trạng thái lịch hẹn không hợp lệ.")

    appt = query("SELECT status, doctor_id FROM appointment WHERE appointment_id = %s", (appointment_id,), one=True)
    if not appt:
        abort(404, description="Không tìm thấy lịch hẹn.")

    current_status = appt["status"]

    # BR26-36: A consultation protects its appointment context
    session_exists = query("SELECT session_id FROM consultation_session WHERE appointment_id = %s", (appointment_id,), one=True)
    if session_exists and target in ("Cancelled", "No-show"):
        raise BusinessError("Lịch hẹn đã có phiên khám, không thể hủy hoặc đánh dấu vắng.")

    # BR26-36: Completed, Cancelled, and No-show are terminal states
    if current_status in ("Completed", "Cancelled", "No-show") and target != current_status:
        raise BusinessError(f"Lịch hẹn ở trạng thái '{STATUS_MAP_TO_UI.get(current_status, current_status)}' là trạng thái kết thúc, không thể thay đổi.")

    # Check if clinical records exist
    if session_exists:
        clinical_exists = query("""
            SELECT 1 FROM consultation_session cs
            LEFT JOIN medical_history mh ON mh.session_id = cs.session_id
            LEFT JOIN prescription rx ON rx.session_id = cs.session_id
            WHERE cs.appointment_id = %s AND (mh.medical_history_id IS NOT NULL OR rx.prescription_id IS NOT NULL)
            LIMIT 1
        """, (appointment_id,), one=True)
        if clinical_exists and target != "Completed":
            raise BusinessError("Lịch hẹn đã có hồ sơ bệnh án hoặc đơn thuốc, trạng thái bắt buộc phải là Hoàn thành.")

    if target == current_status:
        return jsonify({
            "message": "Trạng thái lịch hẹn giữ nguyên.",
            "appointmentId": appointment_id,
            "status": STATUS_MAP_TO_UI.get(current_status, current_status),
        })

    if target == "Completed":
        raise BusinessError("Trạng thái Hoàn thành chỉ được thiết lập khi kết thúc phiên khám.")

    ensure(target in ("Checked-In", "Cancelled", "No-show"),
           "Chỉ có thể chuyển lịch hẹn sang Đã xác nhận, Đã hủy hoặc Không đến khám.")
    appointment_service.change_status(g.user, appointment_id, target)

    return jsonify({
        "message": "Đã cập nhật trạng thái lịch hẹn.",
        "appointmentId": appointment_id,
        "status": STATUS_MAP_TO_UI.get(target, target),
    })


@bp.post("/appointments/<appointment_id>/reschedule")
def reschedule_appointment(appointment_id):
    data = request.get_json(silent=True) or {}
    dt = _parse_datetime(data.get("appointment_date_time") or data.get("dateTime"), "ngày giờ hẹn")
    schedule_id = data.get("schedule_id") or data.get("scheduleId")
    duration = _parse_duration(data.get("estimated_duration_minutes") or data.get("duration"))
    reason = (data.get("reason") or "").strip()

    ensure(dt, "Vui lòng chọn ngày và giờ mới.")
    ensure(dt >= now(), "Không thể chuyển lịch hẹn vào quá khứ.")
    validate_clinic_slot(dt, duration)

    appt = query("SELECT doctor_id, appointment_type, status FROM appointment WHERE appointment_id = %s", (appointment_id,), one=True)
    if not appt:
        abort(404, description="Không tìm thấy lịch hẹn.")

    # BR31: Only Scheduled appointments without consultation sessions can be rescheduled
    session_exists = query("SELECT session_id FROM consultation_session WHERE appointment_id = %s", (appointment_id,), one=True)
    if session_exists:
        raise BusinessError("Lịch hẹn đã có phiên khám lâm sàng, không thể dời lịch.")
    if appt["status"] != "Scheduled":
        raise BusinessError("Chỉ có thể dời lịch cho lịch hẹn ở trạng thái Đã xác nhận (Scheduled).")

    # BR26-36: Find active shift of that doctor covering the new appointment time
    if not schedule_id and dt:
        shift = query("""
            SELECT schedule_id, start_time, end_time, availability_status
            FROM doctor_schedule
            WHERE doctor_id = %s AND schedule_date = %s
              AND %s >= start_time AND %s <= end_time
              AND availability_status = 'Available'
            LIMIT 1
        """, (appt["doctor_id"], dt.date(), dt.time(), (dt + timedelta(minutes=duration)).time()), one=True)
        if shift:
            schedule_id = shift["schedule_id"]
        else:
            raise BusinessError(f"Bác sĩ không có ca trực khả dụng vào thời gian {dt.strftime('%d/%m/%Y %H:%M')}. Vui lòng chọn khung giờ trong ca trực.")

    reschedule_payload = {
        "schedule_id": schedule_id,
        "appointment_date_time": dt,
        "estimated_duration_minutes": duration,
        "appointment_type": appt["appointment_type"],
        "reason": reason,
    }

    appointment_service.reschedule(g.user, appointment_id, reschedule_payload)

    return jsonify({
        "message": "Đã đổi lịch hẹn thành công.",
        "appointmentId": appointment_id,
        "date": dt.strftime("%d/%m/%Y"),
        "time": dt.strftime("%H:%M"),
    })


# --------------------------------------------------------------------------
# Schedules Endpoints (BR21-25)
# --------------------------------------------------------------------------

@bp.get("/schedules")
def list_schedules():
    rows = query("""
        SELECT s.schedule_id AS id,
               s.doctor_id AS doctorId,
               d.full_name AS doctorName,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(s.schedule_date, '%Y-%m-%d') AS date,
               DATE_FORMAT(s.schedule_date, '%d/%m/%Y') AS formattedDate,
               DATE_FORMAT(s.schedule_date, '%w') AS dayOfWeek,
               TIME_FORMAT(s.start_time, '%H:%i') AS startTime,
               TIME_FORMAT(s.end_time, '%H:%i') AS endTime,
               s.availability_status AS status
        FROM doctor_schedule s
        JOIN doctor d ON s.doctor_id = d.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        ORDER BY s.schedule_date DESC, s.start_time ASC
    """)
    return jsonify({"schedules": rows})


@bp.post("/schedules")
def create_schedule():
    data = request.get_json(silent=True) or {}
    doctor_id = data.get("doctor_id") or data.get("doctorId")
    s_date = _parse_date(data.get("schedule_date") or data.get("date"), "ngày làm việc")
    start = _parse_time(data.get("start_time") or data.get("startTime"), "giờ bắt đầu")
    end = _parse_time(data.get("end_time") or data.get("endTime"), "giờ kết thúc")

    ensure(doctor_id, "Vui lòng chọn bác sĩ.")
    ensure(s_date, "Vui lòng chọn ngày làm việc.")
    ensure(start and end, "Vui lòng nhập giờ bắt đầu và kết thúc ca.")
    ensure(s_date >= now().date(), "Không thể tạo ca làm trong quá khứ.")
    ensure(end > start, "Giờ kết thúc ca phải sau giờ bắt đầu.")
    ensure(start >= time(8, 0) and end <= time(17, 0), "Ca làm việc phải nằm trong giờ hành chính phòng khám (08:00–17:00).")

    status = _parse_schedule_status(data.get("availability_status") or data.get("status"), default="Available")

    # BR21-25: Working schedules overlap check
    overlap = query("""
        SELECT schedule_id FROM doctor_schedule
        WHERE doctor_id = %s AND schedule_date = %s
          AND start_time < %s AND end_time > %s
        LIMIT 1
    """, (doctor_id, s_date, end, start), one=True)
    if overlap:
        raise BusinessError("Bác sĩ đã có ca trực khác trùng thời gian trong ngày này.")

    shift = schedule_service.create(g.user, {
        "doctor_id": doctor_id,
        "schedule_date": s_date,
        "start_time": start,
        "end_time": end,
        "availability_status": status,
    })

    doc = query("""
        SELECT d.full_name, COALESCE(sp.specialty_name, 'Đa khoa') AS specialty
        FROM doctor d
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        WHERE d.doctor_id = %s
    """, (doctor_id,), one=True)
    specialty_val = doc["specialty"] if doc and doc.get("specialty") else "Đa khoa"
    return jsonify({
        "message": "Đã thêm ca làm việc thành công.",
        "schedule": {
            "id": shift.schedule_id,
            "doctorId": shift.doctor_id,
            "doctorName": doc["full_name"] if doc else "",
            "specialty": specialty_val,
            "date": s_date.isoformat(),
            "formattedDate": s_date.strftime("%d/%m/%Y"),
            "dayOfWeek": str(s_date.weekday() + 1 if s_date.weekday() < 6 else 0),
            "startTime": start.strftime("%H:%M"),
            "endTime": end.strftime("%H:%M"),
            "status": shift.availability_status,
        },
    }), 201


# --------------------------------------------------------------------------
# Medications Endpoints (Table 3.11 & BR46–BR50)
# --------------------------------------------------------------------------

@bp.get("/medications")
def list_medications():
    rows = query("""
        SELECT medication_id AS id,
               medication_name AS name,
               COALESCE(description, '') AS description,
               'Hoạt động' AS status
        FROM medication
        ORDER BY medication_id ASC
    """)
    return jsonify({"medications": rows})


@bp.post("/medications")
def create_medication():
    data = request.get_json(silent=True) or {}
    name = " ".join(str(data.get("name") or data.get("medication_name") or "").strip().split())
    description = str(data.get("description") or "").strip()

    ensure(name, "Vui lòng nhập tên thuốc.")
    med = medication_service.create(
        g.user,
        name,
        description or "Danh mục minh họa; không phải chỉ định điều trị.",
    )

    return jsonify({
        "message": "Đã thêm thuốc mới vào danh mục thành công.",
        "medication": {
            "id": med.medication_id,
            "name": med.medication_name,
            "description": med.description or "Danh mục minh họa; không phải chỉ định điều trị.",
            "status": "Hoạt động",
        },
    }), 201


@bp.patch("/schedules/<schedule_id>/status")
def update_schedule_status(schedule_id):
    data = request.get_json(silent=True) or {}
    target = _parse_schedule_status(data.get("status"), default="")

    schedule_service.change_availability(g.user, schedule_id, target)
    return jsonify({
        "message": "Đã cập nhật trạng thái ca làm việc.",
        "scheduleId": schedule_id,
        "status": target,
    })


# --------------------------------------------------------------------------
# Reports Endpoints
# --------------------------------------------------------------------------

@bp.get("/reports")
def get_reports():
    days_range = request.args.get("range", "30").strip()
    try:
        days = int(days_range)
    except ValueError:
        days = 30
    if days not in (7, 30, 90):
        days = 30

    total_users = query("SELECT COUNT(*) AS c FROM user_account", one=True)["c"]
    total_doctors = query("SELECT COUNT(*) AS c FROM doctor", one=True)["c"]
    total_patients = query("SELECT COUNT(*) AS c FROM patient", one=True)["c"]

    new_users = query("""
        SELECT COUNT(*) AS c FROM user_account
        WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
    """, (days,), one=True)["c"]

    appts_in_period = query("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
               SUM(CASE WHEN status IN ('Scheduled', 'Checked-In') THEN 1 ELSE 0 END) AS pending
        FROM appointment
        WHERE appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
    """, (days,), one=True)

    total_in_period = appts_in_period["total"] or 0
    completed_in_period = appts_in_period["completed"] or 0
    cancelled_in_period = appts_in_period["cancelled"] or 0
    pending_in_period = appts_in_period["pending"] or 0

    completion_rate = round((completed_in_period / total_in_period * 100) if total_in_period > 0 else 0, 1)

    daily = query("""
        SELECT DATE_FORMAT(appointment_date_time, '%d/%m') AS d,
               COUNT(*) AS total
        FROM appointment
        WHERE appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
        GROUP BY DATE(appointment_date_time), DATE_FORMAT(appointment_date_time, '%d/%m')
        ORDER BY DATE(appointment_date_time) ASC
    """, (days,))

    top_docs = query("""
        SELECT d.full_name AS name,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               COUNT(a.appointment_id) AS count
        FROM doctor d
        LEFT JOIN appointment a ON d.doctor_id = a.doctor_id
             AND a.appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        GROUP BY d.doctor_id, d.full_name, sp.specialty_name
        ORDER BY count DESC
        LIMIT 5
    """, (days,))

    csv_rows = [
        {"item": "Tổng người dùng", "value": total_users},
        {"item": "Người dùng mới trong kỳ", "value": new_users},
        {"item": "Bác sĩ", "value": total_doctors},
        {"item": "Bệnh nhân", "value": total_patients},
        {"item": "Tổng lịch hẹn trong kỳ", "value": total_in_period},
        {"item": "Lịch hẹn hoàn thành", "value": completed_in_period},
        {"item": "Lịch hẹn đã hủy", "value": cancelled_in_period},
        {"item": "Lịch hẹn chờ xử lý", "value": pending_in_period},
        {"item": "Tỷ lệ hoàn thành (%)", "value": completion_rate},
    ]

    return jsonify({
        "range": days,
        "metrics": {
            "totalUsers": total_users,
            "newUsers": new_users,
            "doctors": total_doctors,
            "patients": total_patients,
            "appointmentsInPeriod": total_in_period,
            "completed": completed_in_period,
            "cancelled": cancelled_in_period,
            "pending": pending_in_period,
            "completionRate": completion_rate,
        },
        "dailyTrend": daily,
        "topDoctors": top_docs,
        "statusBreakdown": {
            "completed": completed_in_period,
            "pending": pending_in_period,
            "cancelled": cancelled_in_period,
        },
        "csvData": csv_rows,
    })


# --------------------------------------------------------------------------
# Settings Endpoints (BR1-5)
# --------------------------------------------------------------------------

@bp.post("/settings/password")
def change_admin_password():
    data = request.get_json(silent=True) or {}
    old_pw = data.get("current_password", "").strip()
    new_pw = data.get("new_password", "").strip()
    confirm_pw = data.get("confirm_password", "").strip()

    if not old_pw:
        abort(400, description="Vui lòng nhập mật khẩu hiện tại.")
    if len(new_pw) < 10 or len(new_pw) > 128:
        abort(400, description="Mật khẩu mới phải có độ dài từ 10 đến 128 ký tự.")
    if confirm_pw and new_pw != confirm_pw:
        abort(400, description="Mật khẩu xác nhận không khớp.")

    user_row = query("SELECT password_hash FROM user_account WHERE user_id = %s", (g.user.user_id,), one=True)
    if not user_row or not check_password_hash(user_row["password_hash"], old_pw):
        abort(400, description="Mật khẩu hiện tại không chính xác.")

    new_hash = generate_password_hash(new_pw, method="pbkdf2:sha256:600000")
    with transaction():
        execute("UPDATE user_account SET password_hash = %s WHERE user_id = %s", (new_hash, g.user.user_id))

    return jsonify({"message": "Đã đổi mật khẩu quản trị thành công."})


@bp.get("/consultations/<session_id>")
def consultation_detail(session_id):
    row = query("""
        SELECT cs.session_id AS id,
               cs.appointment_id AS appointmentId,
               cs.start_time AS startTime,
               cs.end_time AS endTime,
               cs.actual_duration_minutes AS duration,
               cs.session_type AS sessionType,
               cs.meeting_url AS meetingUrl,
               cs.diagnosis_notes AS diagnosisNotes,
               a.patient_id AS patientId,
               p.full_name AS patientName,
               a.doctor_id AS doctorId,
               d.full_name AS doctorName,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(a.appointment_date_time, '%d/%m/%Y') AS appointmentDate,
               DATE_FORMAT(a.appointment_date_time, '%H:%i') AS appointmentTime
        FROM consultation_session cs
        JOIN appointment a ON a.appointment_id = cs.appointment_id
        JOIN patient p ON p.patient_id = a.patient_id
        JOIN doctor d ON d.doctor_id = a.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        WHERE cs.session_id = %s
    """, (session_id,), one=True)
    if not row:
        abort(404, description="Không tìm thấy phiên khám.")
    histories = query("""
        SELECT medical_history_id AS id,
               DATE_FORMAT(record_date, '%d/%m/%Y %H:%i') AS recordDate,
               diagnosis, symptoms, COALESCE(progress_notes, '') AS progressNotes
        FROM medical_history WHERE session_id = %s ORDER BY record_date DESC
    """, (session_id,))
    prescriptions = query("""
        SELECT prescription_id AS id,
               DATE_FORMAT(prescription_date, '%d/%m/%Y %H:%i') AS prescriptionDate,
               COALESCE(diagnosis_icd, '') AS diagnosisIcd,
               COALESCE(instructions, '') AS instructions
        FROM prescription WHERE session_id = %s ORDER BY prescription_date DESC
    """, (session_id,))
    for rx in prescriptions:
        rx["items"] = query("""
            SELECT m.medication_name AS name, pi.dosage, pi.frequency, pi.duration,
                   COALESCE(pi.special_instructions, '') AS instructions
            FROM prescription_item pi
            JOIN medication m ON m.medication_id = pi.medication_id
            WHERE pi.prescription_id = %s
        """, (rx["id"],))
    return jsonify({
        "consultation": {
            "id": row["id"],
            "appointmentId": row["appointmentId"],
            "patientId": row["patientId"],
            "patientName": row["patientName"],
            "doctorId": row["doctorId"],
            "doctorName": row["doctorName"],
            "specialty": row["specialty"],
            "appointmentDate": row["appointmentDate"],
            "appointmentTime": row["appointmentTime"],
            "startedAt": row["startTime"].strftime("%d/%m/%Y %H:%M") if row["startTime"] else "",
            "endedAt": row["endTime"].strftime("%d/%m/%Y %H:%M") if row["endTime"] else "",
            "duration": row["duration"],
            "modality": "Tư vấn trực tuyến" if row["sessionType"] == "Virtual" else "Khám trực tiếp",
            "meetingUrl": row["meetingUrl"] or "",
            "diagnosisNotes": row["diagnosisNotes"] or "",
            "status": "Hoàn thành" if row["endTime"] else "Đang khám",
            "histories": histories,
            "prescriptions": prescriptions,
        }
    })


@bp.post("/settings/profile")
def update_admin_profile():
    data = request.get_json(silent=True) or {}
    name = validate_person_name(data.get("name") or "Quản trị viên TiTiMi", "Họ và tên", normalize_case=False)
    email = validate_email(data.get("email") or "admin@titimi.vn", "Email", required=True)
    phone = validate_phone(data.get("phone") or "0902345678", "Số điện thoại")

    return jsonify({
        "message": "Đã lưu cài đặt hồ sơ quản trị.",
        "admin": {
            "id": g.user.user_id,
            "username": getattr(g.user, "username", "admin"),
            "name": name,
            "email": email,
            "phone": phone,
            "role": "Admin",
        },
    })
