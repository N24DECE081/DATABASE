"""Read-only JSON data for the Figma admin portal."""

from flask import Blueprint, abort, g, jsonify

from ...db import query
from ...security import require_roles


bp = Blueprint("admin_portal_api", __name__, url_prefix="/api/admin")


@bp.before_request
def require_admin_session():
    if g.user is None:
        abort(401, description="Vui lòng đăng nhập để xem dữ liệu quản trị.")


def _date(value):
    return value.isoformat() if value is not None else None


def _datetime(value):
    return value.isoformat(timespec="minutes") if value is not None else None


def _time(value):
    return value.isoformat(timespec="minutes") if value is not None else None


def _account_status(value):
    return "Hoạt động" if value == "Active" else "Tạm khóa"


def _appointment_status(value):
    return {
        "Scheduled": "Chờ xác nhận",
        "Checked-In": "Đã xác nhận",
        "Completed": "Hoàn thành",
        "Cancelled": "Đã hủy",
        "No-show": "Vắng mặt",
    }.get(value, value)


@bp.get("/portal-data")
@require_roles("ADMIN")
def portal_data():
    """Return current database records; this endpoint never writes to the database."""
    users = query(
        """SELECT u.user_id, u.username, u.role, u.account_status, u.created_at,
                  COALESCE(p.full_name, d.full_name, u.username) AS full_name,
                  COALESCE(p.email, d.email) AS email,
                  COALESCE(p.phone, d.phone) AS phone
           FROM user_account u
           LEFT JOIN patient p ON p.user_id = u.user_id
           LEFT JOIN doctor d ON d.user_id = u.user_id
           ORDER BY u.created_at DESC, u.user_id"""
    )
    doctors = query(
        """SELECT d.doctor_id, d.full_name, d.email, d.phone, u.account_status,
                  COALESCE(sp.specialty_name, 'General Practitioner') AS specialty_name
           FROM doctor d
           JOIN user_account u ON u.user_id = d.user_id
           LEFT JOIN specialist st ON st.doctor_id = d.doctor_id
           LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
           ORDER BY d.full_name, d.doctor_id"""
    )
    patients = query(
        """SELECT p.patient_id, p.full_name, p.gender, p.date_of_birth,
                  p.phone, p.email, u.created_at, u.account_status
           FROM patient p
           JOIN user_account u ON u.user_id = p.user_id
           ORDER BY p.full_name, p.patient_id"""
    )
    specialties = query(
        """SELECT s.specialty_id, s.specialty_name, s.description,
                  COUNT(DISTINCT st.doctor_id) AS doctor_count
           FROM specialty s
           LEFT JOIN specialist st ON st.specialty_id = s.specialty_id
           GROUP BY s.specialty_id, s.specialty_name, s.description
           ORDER BY s.specialty_name, s.specialty_id"""
    )
    appointment_rows = query(
        """SELECT appointment_id, patient_id, patient_name, doctor_id, doctor_name,
                  specialty_name, appointment_date_time, appointment_type, status,
                  reason, follow_up_from_appt_id, estimated_duration_minutes,
                  session_id
           FROM v_appointment_details
           ORDER BY appointment_date_time DESC, appointment_id DESC"""
    )
    schedules = query(
        """SELECT ds.schedule_id, ds.doctor_id, d.full_name AS doctor_name,
                  ds.schedule_date, ds.start_time, ds.end_time, ds.availability_status
           FROM doctor_schedule ds
           JOIN doctor d ON d.doctor_id = ds.doctor_id
           ORDER BY ds.schedule_date DESC, ds.start_time, ds.schedule_id"""
    )
    counts = query(
        """SELECT
              (SELECT COUNT(*) FROM user_account) AS users,
              (SELECT COUNT(*) FROM user_account WHERE role = 'ADMIN') AS admins,
              (SELECT COUNT(*) FROM user_account WHERE role = 'DOCTOR') AS doctors,
              (SELECT COUNT(*) FROM user_account WHERE role = 'PATIENT') AS patients,
              (SELECT COUNT(*) FROM user_account WHERE account_status = 'Active') AS active_accounts,
              (SELECT COUNT(*) FROM user_account WHERE account_status <> 'Active') AS inactive_accounts,
              (SELECT COUNT(*) FROM appointment) AS appointments,
              (SELECT COUNT(*) FROM appointment WHERE status = 'Scheduled') AS scheduled_appointments,
              (SELECT COUNT(*) FROM appointment WHERE status = 'Checked-In') AS checked_in_appointments,
              (SELECT COUNT(*) FROM appointment WHERE status = 'Completed') AS completed_appointments,
              (SELECT COUNT(*) FROM appointment WHERE status = 'Cancelled') AS cancelled_appointments,
              (SELECT COUNT(*) FROM appointment WHERE status = 'No-show') AS no_show_appointments""",
        one=True,
    )
    daily = query(
        """SELECT DATE(appointment_date_time) AS report_date, COUNT(*) AS total
           FROM appointment
           WHERE appointment_date_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 29 DAY)
           GROUP BY DATE(appointment_date_time)
           ORDER BY report_date"""
    )
    by_specialty = query(
        """SELECT COALESCE(sp.specialty_name, 'General Practitioner') AS specialty_name,
                  COUNT(*) AS total
           FROM appointment a
           JOIN doctor d ON d.doctor_id = a.doctor_id
           LEFT JOIN specialist st ON st.doctor_id = d.doctor_id
           LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
           GROUP BY specialty_name
           ORDER BY total DESC, specialty_name
           LIMIT 5"""
    )

    return jsonify(
        user={"user_id": g.user.user_id, "username": g.user.username, "role": g.user.role},
        counts=counts,
        users=[
            {
                "id": row["user_id"],
                "name": row["full_name"],
                "email": row["email"] or "",
                "phone": row["phone"] or "",
                "role": {"ADMIN": "Admin", "DOCTOR": "Bác sĩ", "PATIENT": "Bệnh nhân"}[row["role"]],
                "status": _account_status(row["account_status"]),
                "created": _date(row["created_at"]),
            }
            for row in users
        ],
        doctors=[
            {
                "id": row["doctor_id"],
                "name": row["full_name"],
                "specialty": row["specialty_name"],
                "email": row["email"] or "",
                "phone": row["phone"] or "",
                "status": _account_status(row["account_status"]),
                # The database does not store doctor birth date or gender.
                "gender": "",
                "dob": "",
            }
            for row in doctors
        ],
        patients=[
            {
                "id": row["patient_id"],
                "name": row["full_name"],
                "gender": row["gender"],
                "dob": _date(row["date_of_birth"]),
                "phone": row["phone"],
                "email": row["email"] or "",
                "created": _date(row["created_at"]),
                "status": _account_status(row["account_status"]),
            }
            for row in patients
        ],
        specialties=[
            {
                "id": row["specialty_id"],
                "name": row["specialty_name"],
                "description": row["description"] or "",
                "doctors": row["doctor_count"],
            }
            for row in specialties
        ],
        appointments=[
            {
                "id": row["appointment_id"],
                "patient": row["patient_name"],
                "patientId": row["patient_id"],
                "doctor": row["doctor_name"],
                "specialty": row["specialty_name"],
                "date": row["appointment_date_time"].date().isoformat(),
                "time": row["appointment_date_time"].strftime("%H:%M"),
                "reason": row["reason"] or "",
                "visitType": "Tư vấn trực tuyến" if row["appointment_type"] == "Telemedicine" else "Khám trực tiếp",
                "isFollowUp": row["follow_up_from_appt_id"] is not None,
                "status": _appointment_status(row["status"]),
                "sessionId": row["session_id"],
            }
            for row in appointment_rows
        ],
        schedules=[
            {
                "id": row["schedule_id"],
                "doctorId": row["doctor_id"],
                "doctor": row["doctor_name"],
                "date": _date(row["schedule_date"]),
                "start": _time(row["start_time"]),
                "end": _time(row["end_time"]),
                "status": row["availability_status"],
            }
            for row in schedules
        ],
        reports={
            "daily": [{"date": _date(row["report_date"]), "total": row["total"]} for row in daily],
            "bySpecialty": [{"name": row["specialty_name"], "total": row["total"]} for row in by_specialty],
        },
    )
