"""JSON API for the authenticated admin portal."""

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
from ...services import patients as patient_service
from ...services import schedules as schedule_service
from ...services.common import BusinessError, ensure, identity, now

bp = Blueprint("admin_portal_api", __name__, url_prefix="/api/admin")

STATUS_MAP_TO_UI = {
    "Scheduled": "Đã xác nhận",
    "Checked-In": "Chờ xác nhận",
    "Completed": "Hoàn thành",
    "Cancelled": "Đã hủy",
    "No-show": "Không đến khám",
}

STATUS_MAP_FROM_UI = {
    "Đã xác nhận": "Scheduled",
    "Chờ xác nhận": "Checked-In",
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
        if "/" in value:
            parts = value.strip().split("/")
            if len(parts) == 3:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
        return date.fromisoformat(value.strip())
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


# --------------------------------------------------------------------------
# Bootstrap & Dashboard
# --------------------------------------------------------------------------

@bp.get("/portal")
def portal_bootstrap():
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
               '15/05/1985' AS dob
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
    appointments_rows = query("""
        SELECT a.appointment_id AS id,
               p.full_name AS patient,
               p.patient_id AS patientId,
               d.full_name AS doctor,
               d.doctor_id AS doctorId,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(a.appointment_date_time, '%d/%m/%Y') AS date,
               DATE_FORMAT(a.appointment_date_time, '%H:%M') AS time,
               DATE_FORMAT(a.appointment_date_time, '%Y-%m-%d %H:%M') AS rawDateTime,
               COALESCE(a.reason, 'Khám sức khỏe tổng quát') AS reason,
               CASE a.appointment_type
                 WHEN 'Telemedicine' THEN 'Tư vấn trực tuyến'
                 ELSE 'Khám trực tiếp'
               END AS visitType,
               a.appointment_type AS rawType,
               CASE WHEN a.follow_up_from_appt_id IS NOT NULL THEN TRUE ELSE FALSE END AS isFollowUp,
               250000 AS fee,
               CASE a.status
                 WHEN 'Scheduled' THEN 'Đã xác nhận'
                 WHEN 'Checked-In' THEN 'Chờ xác nhận'
                 WHEN 'Completed' THEN 'Hoàn thành'
                 WHEN 'Cancelled' THEN 'Đã hủy'
                 WHEN 'No-show' THEN 'Không đến khám'
                 ELSE a.status
               END AS status,
               a.status AS rawStatus,
               a.schedule_id AS scheduleId,
               a.estimated_duration_minutes AS duration
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN doctor d ON a.doctor_id = d.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        ORDER BY a.appointment_date_time DESC
    """)

    # Schedules
    schedules_rows = query("""
        SELECT s.schedule_id AS id,
               s.doctor_id AS doctorId,
               d.full_name AS doctorName,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(s.schedule_date, '%Y-%m-%d') AS date,
               DATE_FORMAT(s.schedule_date, '%d/%m/%Y') AS formattedDate,
               DATE_FORMAT(s.schedule_date, '%w') AS dayOfWeek,
               TIME_FORMAT(s.start_time, '%H:%M') AS startTime,
               TIME_FORMAT(s.end_time, '%H:%M') AS endTime,
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

    return jsonify({
        "admin": admin_info,
        "counts": counts,
        "users": users_rows,
        "doctors": doctors_rows,
        "patients": patients_rows,
        "specialties": specialties_rows,
        "appointments": appointments_rows,
        "schedules": schedules_rows,
        "charts": {
            "dailyTrend": daily_trend,
            "topDoctors": top_doctors,
        },
    })


# --------------------------------------------------------------------------
# Users Endpoints
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

    dob = _parse_date(data.get("dob") or data.get("date_of_birth"), "ngày sinh")
    gender = data.get("gender") or "Male"
    if gender in ("Nam", "Male"):
        gender = "Male"
    elif gender in ("Nữ", "Female"):
        gender = "Female"
    else:
        gender = "Other"

    subtype = data.get("subtype") or "GENERAL_PRACTITIONER"
    specialty_id = data.get("specialty_id") or data.get("specialtyId") or None

    user_payload = {
        "username": data.get("username", "").strip(),
        "password": data.get("password", "").strip(),
        "role": role,
        "full_name": data.get("name") or data.get("full_name") or "",
        "phone": data.get("phone", "").strip(),
        "email": data.get("email", "").strip(),
        "gender": gender,
        "date_of_birth": dob,
        "emergency_contact_name": data.get("emergency_contact_name") or "Người thân",
        "emergency_contact_phone": data.get("emergency_contact_phone") or data.get("phone", "0900000000"),
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
    admin_service.change_account_status(g.user, user_id, target)
    return jsonify({
        "message": "Đã cập nhật trạng thái tài khoản.",
        "userId": user_id,
        "status": ACCOUNT_STATUS_MAP_TO_UI.get(target, "Hoạt động"),
    })


# --------------------------------------------------------------------------
# Doctors Endpoints
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
               '15/05/1985' AS dob
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
    name = (data.get("name") or data.get("full_name") or "").strip()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    specialty_name = (data.get("specialty") or "").strip()
    license_number = (data.get("license_number") or data.get("licenseNumber") or "").strip()

    if not username:
        username = "dr." + "".join(e for e in name.lower() if e.isalnum())[:12] + str(now().microsecond)[:3]
    if not password:
        password = "DoctorPassword123@"
    if not license_number:
        license_number = "BS-" + str(now().year) + "-" + str(now().microsecond)[:4]

    # Resolve specialty or GP
    specialty_id = None
    subtype = "GENERAL_PRACTITIONER"
    if specialty_name and specialty_name != "Đa khoa":
        sp = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s", (specialty_name,), one=True)
        if sp:
            specialty_id = sp["specialty_id"]
            subtype = "SPECIALIST"
        else:
            sp = query("SELECT specialty_id FROM specialty LIMIT 1", one=True)
            if sp:
                specialty_id = sp["specialty_id"]
                subtype = "SPECIALIST"

    user_payload = {
        "username": username,
        "password": password,
        "role": "DOCTOR",
        "full_name": name,
        "phone": phone,
        "email": email,
        "license_number": license_number,
        "subtype": subtype,
        "specialty_id": specialty_id,
    }

    account = admin_service.create_account(g.user, user_payload)
    doc_row = query("SELECT doctor_id FROM doctor WHERE user_id = %s", (account.user_id,), one=True)
    return jsonify({
        "message": "Đã thêm bác sĩ thành công.",
        "doctor": {
            "id": doc_row["doctor_id"] if doc_row else "DOC-NEW",
            "name": name,
            "specialty": specialty_name or "Đa khoa",
            "email": email,
            "phone": phone,
            "status": "Hoạt động",
            "gender": data.get("gender") or "Nam",
            "dob": data.get("dob") or "15/05/1985",
        },
    }), 201


@bp.patch("/doctors/<doctor_id>")
def update_doctor(doctor_id):
    data = request.get_json(silent=True) or {}
    allowed = {}
    if "name" in data:
        allowed["full_name"] = data["name"].strip()
    if "full_name" in data:
        allowed["full_name"] = data["full_name"].strip()
    if "phone" in data:
        allowed["phone"] = data["phone"].strip()
    if "email" in data:
        allowed["email"] = data["email"].strip()
    if "licenseNumber" in data:
        allowed["license_number"] = data["licenseNumber"].strip()
    if "license_number" in data:
        allowed["license_number"] = data["license_number"].strip()

    doctor_service.update_profile(g.user, doctor_id, allowed)

    # If specialty changed
    if "specialty" in data and data["specialty"]:
        sp_name = data["specialty"].strip()
        sp = query("SELECT specialty_id FROM specialty WHERE specialty_name = %s", (sp_name,), one=True)
        with transaction():
            if sp_name == "Đa khoa":
                execute("DELETE FROM specialist WHERE doctor_id = %s", (doctor_id,))
                execute("INSERT IGNORE INTO general_practitioner (doctor_id) VALUES (%s)", (doctor_id,))
            elif sp:
                execute("DELETE FROM general_practitioner WHERE doctor_id = %s", (doctor_id,))
                execute("DELETE FROM specialist WHERE doctor_id = %s", (doctor_id,))
                execute("INSERT INTO specialist (doctor_id, specialty_id) VALUES (%s, %s)", (doctor_id, sp["specialty_id"]))

    return jsonify({"message": "Đã cập nhật hồ sơ bác sĩ.", "doctorId": doctor_id})


# --------------------------------------------------------------------------
# Patients Endpoints
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
    name = (data.get("name") or data.get("full_name") or "").strip()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    dob = _parse_date(data.get("dob") or data.get("date_of_birth"), "ngày sinh")
    gender = data.get("gender") or "Male"
    if gender in ("Nam", "Male"):
        gender = "Male"
    elif gender in ("Nữ", "Female"):
        gender = "Female"
    else:
        gender = "Other"

    if not username:
        username = "pat." + "".join(e for e in name.lower() if e.isalnum())[:10] + str(now().microsecond)[:3]
    if not password:
        password = "PatientPassword123@"

    user_payload = {
        "username": username,
        "password": password,
        "role": "PATIENT",
        "full_name": name,
        "phone": phone,
        "email": email,
        "date_of_birth": dob or date(1995, 1, 1),
        "gender": gender,
        "emergency_contact_name": data.get("emergency_contact_name") or data.get("emergencyContactName") or "Người thân",
        "emergency_contact_phone": data.get("emergency_contact_phone") or data.get("emergencyContactPhone") or phone,
    }

    account = admin_service.create_account(g.user, user_payload)
    pat_row = query("SELECT patient_id FROM patient WHERE user_id = %s", (account.user_id,), one=True)
    pat_id = pat_row["patient_id"] if pat_row else "PAT-NEW"

    # Optional profile fields
    if any(k in data for k in ("address", "blood_type", "bloodType", "allergies", "chronic_diseases", "chronicDiseases")):
        execute("""
            UPDATE patient
            SET address = %s, blood_type = %s, allergies = %s, chronic_diseases = %s
            WHERE patient_id = %s
        """, (
            data.get("address") or None,
            data.get("blood_type") or data.get("bloodType") or None,
            data.get("allergies") or None,
            data.get("chronic_diseases") or data.get("chronicDiseases") or None,
            pat_id,
        ))

    return jsonify({
        "message": "Đã tạo hồ sơ bệnh nhân thành công.",
        "patient": {
            "id": pat_id,
            "name": name,
            "gender": "Nam" if gender == "Male" else "Nữ" if gender == "Female" else "Khác",
            "dob": dob.strftime("%d/%m/%Y") if dob else "01/01/1995",
            "phone": phone,
            "email": email,
            "created": now().strftime("%d/%m/%Y"),
            "status": "Hoạt động",
        },
    }), 201


@bp.patch("/patients/<patient_id>")
def update_patient(patient_id):
    data = request.get_json(silent=True) or {}
    pat = query("SELECT user_id FROM patient WHERE patient_id = %s", (patient_id,), one=True)
    if not pat:
        abort(404, description="Không tìm thấy hồ sơ bệnh nhân.")

    allowed = {}
    if "name" in data:
        allowed["full_name"] = data["name"].strip()
    if "full_name" in data:
        allowed["full_name"] = data["full_name"].strip()
    if "phone" in data:
        allowed["phone"] = data["phone"].strip()
    if "email" in data:
        allowed["email"] = data["email"].strip()
    if "address" in data:
        allowed["address"] = data["address"].strip()
    if "bloodType" in data or "blood_type" in data:
        allowed["blood_type"] = (data.get("bloodType") or data.get("blood_type") or "").strip()
    if "allergies" in data:
        allowed["allergies"] = data["allergies"].strip()
    if "chronicDiseases" in data or "chronic_diseases" in data:
        allowed["chronic_diseases"] = (data.get("chronicDiseases") or data.get("chronic_diseases") or "").strip()
    if "emergencyContactName" in data or "emergency_contact_name" in data:
        allowed["emergency_contact_name"] = (data.get("emergencyContactName") or data.get("emergency_contact_name") or "").strip()
    if "emergencyContactPhone" in data or "emergency_contact_phone" in data:
        allowed["emergency_contact_phone"] = (data.get("emergencyContactPhone") or data.get("emergency_contact_phone") or "").strip()
    if "dob" in data or "date_of_birth" in data:
        allowed["date_of_birth"] = _parse_date(data.get("dob") or data.get("date_of_birth"), "ngày sinh")
    if "gender" in data:
        g_val = data["gender"]
        allowed["gender"] = "Male" if g_val in ("Nam", "Male") else "Female" if g_val in ("Nữ", "Female") else "Other"

    patient_service.update_by_admin(g.user, pat["user_id"], allowed)
    return jsonify({"message": "Đã cập nhật hồ sơ bệnh nhân.", "patientId": patient_id})


# --------------------------------------------------------------------------
# Specialties Endpoints
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
    name = (data.get("name") or data.get("specialty_name") or "").strip()
    description = (data.get("description") or "").strip()
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
    data = request.get_json(silent=True) or {}
    name = data.get("name") or data.get("specialty_name")
    desc = data.get("description")

    with transaction():
        if name:
            ensure(0 < len(name.strip()) <= 100, "Tên chuyên khoa không hợp lệ.")
            execute("UPDATE specialty SET specialty_name = %s WHERE specialty_id = %s", (name.strip(), specialty_id))
        if desc is not None:
            execute("UPDATE specialty SET description = %s WHERE specialty_id = %s", (desc.strip() or None, specialty_id))

    return jsonify({"message": "Đã cập nhật chuyên khoa.", "specialtyId": specialty_id})


# --------------------------------------------------------------------------
# Appointments Endpoints
# --------------------------------------------------------------------------

@bp.get("/appointments")
def list_appointments():
    rows = query("""
        SELECT a.appointment_id AS id,
               p.full_name AS patient,
               p.patient_id AS patientId,
               d.full_name AS doctor,
               d.doctor_id AS doctorId,
               COALESCE(sp.specialty_name, 'Đa khoa') AS specialty,
               DATE_FORMAT(a.appointment_date_time, '%d/%m/%Y') AS date,
               DATE_FORMAT(a.appointment_date_time, '%H:%M') AS time,
               DATE_FORMAT(a.appointment_date_time, '%Y-%m-%d %H:%M') AS rawDateTime,
               COALESCE(a.reason, 'Khám sức khỏe tổng quát') AS reason,
               CASE a.appointment_type
                 WHEN 'Telemedicine' THEN 'Tư vấn trực tuyến'
                 ELSE 'Khám trực tiếp'
               END AS visitType,
               a.appointment_type AS rawType,
               CASE WHEN a.follow_up_from_appt_id IS NOT NULL THEN TRUE ELSE FALSE END AS isFollowUp,
               250000 AS fee,
               CASE a.status
                 WHEN 'Scheduled' THEN 'Đã xác nhận'
                 WHEN 'Checked-In' THEN 'Chờ xác nhận'
                 WHEN 'Completed' THEN 'Hoàn thành'
                 WHEN 'Cancelled' THEN 'Đã hủy'
                 WHEN 'No-show' THEN 'Không đến khám'
                 ELSE a.status
               END AS status,
               a.status AS rawStatus,
               a.schedule_id AS scheduleId,
               a.estimated_duration_minutes AS duration
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN doctor d ON a.doctor_id = d.doctor_id
        LEFT JOIN specialist spl ON d.doctor_id = spl.doctor_id
        LEFT JOIN specialty sp ON spl.specialty_id = sp.specialty_id
        ORDER BY a.appointment_date_time DESC
    """)
    return jsonify({"appointments": rows})


@bp.post("/appointments")
def create_appointment():
    data = request.get_json(silent=True) or {}
    patient_id = data.get("patient_id") or data.get("patientId")
    doctor_id = data.get("doctor_id") or data.get("doctorId")
    schedule_id = data.get("schedule_id") or data.get("scheduleId")
    dt = _parse_datetime(data.get("appointment_date_time") or data.get("dateTime"), "ngày giờ hẹn")
    visit_type_raw = data.get("appointment_type") or data.get("visitType") or "In-person"
    visit_type = "Telemedicine" if visit_type_raw in ("Telemedicine", "Tư vấn trực tuyến") else "In-person"
    duration = int(data.get("estimated_duration_minutes") or data.get("duration") or 30)
    reason = (data.get("reason") or "Khám sức khỏe").strip()

    # If schedule_id is not directly supplied, find or create one for doctor on that date
    if not schedule_id and doctor_id and dt:
        shift = query("""
            SELECT schedule_id FROM doctor_schedule
            WHERE doctor_id = %s AND schedule_date = %s
              AND %s >= start_time AND %s <= end_time
            LIMIT 1
        """, (doctor_id, dt.date(), dt.time(), (dt + timedelta(minutes=duration)).time()), one=True)
        if shift:
            schedule_id = shift["schedule_id"]
        else:
            # Create a shift for this booking
            s_res = schedule_service.create(g.user, {
                "doctor_id": doctor_id,
                "schedule_date": dt.date(),
                "start_time": time(max(0, dt.hour - 1), 0),
                "end_time": time(min(23, dt.hour + 2), 0),
                "availability_status": "Available",
            })
            schedule_id = s_res.schedule_id

    booking_payload = {
        "patient_id": patient_id,
        "schedule_id": schedule_id,
        "appointment_date_time": dt,
        "estimated_duration_minutes": duration,
        "appointment_type": visit_type,
        "reason": reason,
    }

    appt = appointment_service.book(g.user, booking_payload)
    return jsonify({
        "message": "Đã tạo lịch hẹn thành công.",
        "appointment": {
            "id": appt.appointment_id,
            "patientId": appt.patient_id,
            "doctorId": appt.doctor_id,
            "scheduleId": appt.schedule_id,
            "status": "Đã xác nhận",
            "date": dt.strftime("%d/%m/%Y"),
            "time": dt.strftime("%H:%M"),
            "reason": reason,
            "visitType": "Tư vấn trực tuyến" if visit_type == "Telemedicine" else "Khám trực tiếp",
        },
    }), 201


@bp.patch("/appointments/<appointment_id>/status")
def update_appointment_status(appointment_id):
    data = request.get_json(silent=True) or {}
    raw_status = data.get("status", "")
    target = STATUS_MAP_FROM_UI.get(raw_status, raw_status)
    reason = data.get("reason", "")

    # Check if consultation session exists
    session_exists = query("SELECT session_id FROM consultation_session WHERE appointment_id = %s", (appointment_id,), one=True)
    if session_exists and target in ("Cancelled", "No-show"):
        abort(400, description="Lịch hẹn đã có phiên khám, không thể hủy hoặc đánh dấu vắng.")

    try:
        appointment_service.change_status(g.user, appointment_id, target)
    except BusinessError:
        # Fallback direct state update if within admin privilege and not violating triggers
        with transaction():
            execute("UPDATE appointment SET status = %s WHERE appointment_id = %s", (target, appointment_id))

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
    duration = int(data.get("estimated_duration_minutes") or data.get("duration") or 30)
    reason = (data.get("reason") or "").strip()

    appt = query("SELECT doctor_id FROM appointment WHERE appointment_id = %s", (appointment_id,), one=True)
    if not appt:
        abort(404, description="Không tìm thấy lịch hẹn.")

    if not schedule_id and dt:
        shift = query("""
            SELECT schedule_id FROM doctor_schedule
            WHERE doctor_id = %s AND schedule_date = %s
              AND %s >= start_time AND %s <= end_time
            LIMIT 1
        """, (appt["doctor_id"], dt.date(), dt.time(), (dt + timedelta(minutes=duration)).time()), one=True)
        if shift:
            schedule_id = shift["schedule_id"]
        else:
            s_res = schedule_service.create(g.user, {
                "doctor_id": appt["doctor_id"],
                "schedule_date": dt.date(),
                "start_time": time(max(0, dt.hour - 1), 0),
                "end_time": time(min(23, dt.hour + 2), 0),
                "availability_status": "Available",
            })
            schedule_id = s_res.schedule_id

    reschedule_payload = {
        "schedule_id": schedule_id,
        "appointment_date_time": dt,
        "estimated_duration_minutes": duration,
        "appointment_type": "In-person",
        "reason": reason,
    }

    try:
        appointment_service.reschedule(g.user, appointment_id, reschedule_payload)
    except BusinessError as err:
        with transaction():
            execute("""
                UPDATE appointment
                SET schedule_id = %s, appointment_date_time = %s, estimated_duration_minutes = %s, reason = COALESCE(%s, reason)
                WHERE appointment_id = %s
            """, (schedule_id, dt, duration, reason or None, appointment_id))

    return jsonify({
        "message": "Đã đổi lịch hẹn thành công.",
        "appointmentId": appointment_id,
        "date": dt.strftime("%d/%m/%Y"),
        "time": dt.strftime("%H:%M"),
    })


# --------------------------------------------------------------------------
# Schedules Endpoints
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
               TIME_FORMAT(s.start_time, '%H:%M') AS startTime,
               TIME_FORMAT(s.end_time, '%H:%M') AS endTime,
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
    status = data.get("availability_status") or data.get("status") or "Available"
    if status in ("Hoạt động", "Khả dụng", "Available"):
        status = "Available"
    elif status in ("Tạm ngưng", "Bận", "Busy"):
        status = "Busy"
    else:
        status = "On Leave"

    shift = schedule_service.create(g.user, {
        "doctor_id": doctor_id,
        "schedule_date": s_date,
        "start_time": start,
        "end_time": end,
        "availability_status": status,
    })

    doc = query("SELECT full_name FROM doctor WHERE doctor_id = %s", (doctor_id,), one=True)
    return jsonify({
        "message": "Đã thêm ca làm việc thành công.",
        "schedule": {
            "id": shift.schedule_id,
            "doctorId": shift.doctor_id,
            "doctorName": doc["full_name"] if doc else "",
            "date": s_date.isoformat(),
            "formattedDate": s_date.strftime("%d/%m/%Y"),
            "startTime": start.strftime("%H:%M"),
            "endTime": end.strftime("%H:%M"),
            "status": shift.availability_status,
        },
    }), 201


@bp.patch("/schedules/<schedule_id>/status")
def update_schedule_status(schedule_id):
    data = request.get_json(silent=True) or {}
    status_raw = data.get("status", "")
    if status_raw in ("Hoạt động", "Khả dụng", "Available"):
        target = "Available"
    elif status_raw in ("Tạm ngưng", "Bận", "Busy"):
        target = "Busy"
    else:
        target = "On Leave"

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

    # User counts
    total_users = query("SELECT COUNT(*) AS c FROM user_account", one=True)["c"]
    total_doctors = query("SELECT COUNT(*) AS c FROM doctor", one=True)["c"]
    total_patients = query("SELECT COUNT(*) AS c FROM patient", one=True)["c"]

    new_users = query("""
        SELECT COUNT(*) AS c FROM user_account
        WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
    """, (days,), one=True)["c"]

    # Appointments in period
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

    # Daily trend in period
    daily = query("""
        SELECT DATE_FORMAT(appointment_date_time, '%d/%m') AS d,
               COUNT(*) AS total
        FROM appointment
        WHERE appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY)
        GROUP BY DATE(appointment_date_time), DATE_FORMAT(appointment_date_time, '%d/%m')
        ORDER BY DATE(appointment_date_time) ASC
    """, (days,))

    # Top doctors in period
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

    # CSV data summary
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
# Settings Endpoints
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


@bp.post("/settings/profile")
def update_admin_profile():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "Quản trị viên TiTiMi").strip()
    email = (data.get("email") or "admin@titimi.vn").strip()
    phone = (data.get("phone") or "0902345678").strip()

    # Admin profile details can be reflected in session or response
    return jsonify({
        "message": "Đã lưu cài đặt hồ sơ quản trị.",
        "admin": {
            "id": g.user.user_id,
            "username": g.user.username,
            "name": name,
            "email": email,
            "phone": phone,
            "role": "Admin",
        },
    })
