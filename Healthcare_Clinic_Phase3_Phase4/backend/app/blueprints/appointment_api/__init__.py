"""JSON endpoints used by the Patient, Admin, and Doctor portal interfaces."""

from calendar import monthrange
from datetime import date, datetime

from flask import Blueprint, abort, g, jsonify, request
from flask_wtf.csrf import generate_csrf

from ...db import query
from ...entities import DoctorSchedule
from ...repositories import appointments, doctors, patients, schedules
from ...security import require_roles
from ...services import appointments as appointment_service
from ...services.schedules import available_starts


bp = Blueprint("appointment_api", __name__, url_prefix="/api")
APPOINTMENT_STATUSES = {"Scheduled", "Checked-In", "Completed", "Cancelled", "No-show"}
APPOINTMENT_TYPES = {
    "In-person": "In-person",
    "Telemedicine": "Telemedicine",
    "Khám trực tiếp": "In-person",
    "Tại phòng khám": "In-person",
    "Tư vấn trực tuyến": "Telemedicine",
    "Khám từ xa": "Telemedicine",
}
VALID_DURATIONS = {15, 30, 45, 60}


@bp.before_request
def require_authenticated_user():
    if g.user is None:
        abort(401, description="Vui lòng đăng nhập để tiếp tục.")


def _parse_duration(value):
    try:
        duration = int(value or 30)
    except (TypeError, ValueError):
        abort(400, description="Thời lượng khám không hợp lệ.")
    if duration not in VALID_DURATIONS:
        abort(400, description="Thời lượng khám không hợp lệ.")
    return duration


def _parse_day(value, field):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        abort(400, description=f"Ngày {field} không hợp lệ.")


def _json_time(value):
    return value.isoformat(timespec="minutes") if value is not None else None


def _serialize_appointment(row):
    if not row:
        return None
    appointment_time = row.get("appointment_date_time")
    schedule_date = row.get("schedule_date")
    return {
        "appointment_id": row.get("appointment_id"),
        "patient_id": row.get("patient_id"),
        "patient_name": row.get("patient_name"),
        "doctor_id": row.get("doctor_id"),
        "doctor_name": row.get("doctor_name"),
        "specialty_name": row.get("specialty_name"),
        "schedule_id": row.get("schedule_id"),
        "schedule_date": schedule_date.isoformat() if schedule_date else None,
        "shift_start": _json_time(row.get("shift_start")),
        "shift_end": _json_time(row.get("shift_end")),
        "appointment_date_time": appointment_time.isoformat(timespec="minutes") if appointment_time else None,
        "estimated_duration_minutes": row.get("estimated_duration_minutes"),
        "appointment_type": row.get("appointment_type"),
        "status": row.get("status"),
        "reason": row.get("reason"),
        "follow_up_from_appt_id": row.get("follow_up_from_appt_id"),
        "session_id": row.get("session_id"),
    }


def _schedule_entity(row):
    return DoctorSchedule(
        schedule_id=row["schedule_id"],
        doctor_id=row["doctor_id"],
        schedule_date=row["schedule_date"],
        start_time=row["start_time"],
        end_time=row["end_time"],
        availability_status=row["availability_status"],
    )


@bp.get("/csrf")
def csrf_token():
    return jsonify(csrf_token=generate_csrf())


@bp.get("/portal/me")
def current_profile():
    user = {"user_id": g.user.user_id, "username": g.user.username, "role": g.user.role}
    profile = None
    if g.user.role == "PATIENT":
        profile = patients.for_user(g.user.user_id)
        if profile:
            profile = {
                "patient_id": profile.patient_id,
                "full_name": profile.full_name,
                "phone": profile.phone,
                "email": profile.email,
                "date_of_birth": profile.date_of_birth.isoformat(),
            }
    elif g.user.role == "DOCTOR":
        profile = doctors.for_user(g.user.user_id)
        if profile:
            profile = {"doctor_id": profile.doctor_id, "full_name": profile.full_name}
    return jsonify(user=user, profile=profile)


@bp.get("/patients")
@require_roles("ADMIN")
def search_patients():
    search = request.args.get("q", "").strip()[:100]
    if not search:
        return jsonify(patients=[])
    pattern = f"%{search}%"
    rows = query(
        """SELECT patient_id, full_name, phone, email FROM patient
           WHERE patient_id LIKE %s OR full_name LIKE %s OR phone LIKE %s OR email LIKE %s
           ORDER BY full_name LIMIT 30""",
        (pattern, pattern, pattern, pattern),
    )
    return jsonify(patients=rows)


@bp.get("/appointments/options")
@require_roles("PATIENT", "ADMIN")
def booking_options():
    duration = _parse_duration(request.args.get("duration", "30"))
    requested_day = _parse_day(request.args.get("day"), "khám")
    month_value = request.args.get("month", "")[:7]
    month_start = None
    month_end = None
    if month_value:
        try:
            month_start = date.fromisoformat(f"{month_value}-01")
            month_end = month_start.replace(day=monthrange(month_start.year, month_start.month)[1])
        except ValueError:
            abort(400, description="Tháng khám không hợp lệ.")
    specialty_id = request.args.get("specialty_id", "")[:20]
    doctor_id = request.args.get("doctor_id", "")[:20]
    schedule_id = request.args.get("schedule_id", "")[:20]
    selected_schedule = schedules.get(DoctorSchedule, schedule_id) if schedule_id else None
    if schedule_id and selected_schedule is None:
        abort(404)
    if selected_schedule:
        if requested_day and requested_day != selected_schedule.schedule_date:
            return jsonify(specialties=[], doctors=[], available_dates=[], slots=[], duration_minutes=duration,
                           appointment_types=["In-person", "Telemedicine"])
        requested_day = selected_schedule.schedule_date
        if not doctor_id:
            doctor_id = selected_schedule.doctor_id
    search = request.args.get("q", "").strip()[:100]

    all_directory = doctors.directory()
    matching_directory = doctors.directory(search)
    if specialty_id == "__gp__":
        doctor_rows = [row for row in matching_directory if row["subtype"] == "GENERAL_PRACTITIONER"]
    elif specialty_id:
        doctor_rows = [row for row in matching_directory if row["specialty_id"] == specialty_id]
    else:
        doctor_rows = matching_directory
    if doctor_id:
        doctor_rows = [row for row in doctor_rows if row["doctor_id"] == doctor_id]

    active_schedules = schedules.list_schedules(available_only=True)
    if schedule_id:
        active_schedules = [row for row in active_schedules if row["schedule_id"] == schedule_id]
    if requested_day:
        active_schedules = [row for row in active_schedules if row["schedule_date"] == requested_day]
    elif month_start:
        active_schedules = [row for row in active_schedules
                            if month_start <= row["schedule_date"] <= month_end]

    doctor_ids = {row["doctor_id"] for row in all_directory}
    active_schedules = [row for row in active_schedules if row["doctor_id"] in doctor_ids]
    opens_by_schedule = {}
    available_doctor_ids = set()
    for row in active_schedules:
        starts = available_starts(_schedule_entity(row), duration)
        if starts:
            available_doctor_ids.add(row["doctor_id"])
            opens_by_schedule[row["schedule_id"]] = (row, starts)

    available_specialty_ids = {
        row["specialty_id"] for row in all_directory
        if row["doctor_id"] in available_doctor_ids and row["subtype"] == "SPECIALIST"
    }
    specialty_rows = [row for row in doctors.specialties()
                      if row["specialty_id"] in available_specialty_ids]
    if any(row["doctor_id"] in available_doctor_ids and row["subtype"] == "GENERAL_PRACTITIONER"
           for row in all_directory):
        specialty_rows.insert(0, {"specialty_id": "__gp__", "specialty_name": "Bác sĩ đa khoa"})
    available_doctors = [
        {
            "doctor_id": row["doctor_id"],
            "full_name": row["full_name"],
            "specialty_id": row["specialty_id"],
            "subtype": row["subtype"],
            "specialty_name": row["specialty_name"],
        }
        for row in doctor_rows if row["doctor_id"] in available_doctor_ids
    ]
    selected_doctor_ids = {row["doctor_id"] for row in available_doctors}
    open_dates = set()
    open_slots = []
    for row, starts in opens_by_schedule.values():
        if row["doctor_id"] not in selected_doctor_ids:
            continue
        open_dates.add(row["schedule_date"].isoformat())
        if requested_day:
            open_slots.extend({
                "schedule_id": row["schedule_id"],
                "doctor_id": row["doctor_id"],
                "starts_at": value.isoformat(timespec="minutes"),
                "duration_minutes": duration,
            } for value in starts)
    open_slots.sort(key=lambda slot: slot["starts_at"])
    return jsonify(
        specialties=[{"specialty_id": row["specialty_id"], "specialty_name": row["specialty_name"]}
                     for row in specialty_rows],
        doctors=available_doctors,
        available_dates=sorted(open_dates),
        slots=open_slots,
        duration_minutes=duration,
        appointment_types=["In-person", "Telemedicine"],
    )


@bp.get("/appointments")
def list_appointments():
    status = request.args.get("status", "")
    day = _parse_day(request.args.get("day"), "lọc")
    if status and status not in APPOINTMENT_STATUSES:
        abort(400, description="Trạng thái lịch hẹn không hợp lệ.")
    return jsonify(appointments=[_serialize_appointment(row) for row in
                                 appointments.list_for(g.user, status, day)])


@bp.post("/appointments")
@require_roles("PATIENT", "ADMIN", "DOCTOR")
def create_appointment():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, description="Nội dung đặt lịch không hợp lệ.")
    type_value = APPOINTMENT_TYPES.get(data.get("appointment_type"))
    if not type_value:
        abort(400, description="Hình thức khám không hợp lệ.")
    try:
        begins = datetime.fromisoformat(data.get("appointment_date_time", ""))
        duration = int(data.get("estimated_duration_minutes", 30))
    except (TypeError, ValueError):
        abort(400, description="Ngày giờ hoặc thời lượng khám không hợp lệ.")
    if begins.tzinfo is not None:
        abort(400, description="Ngày giờ phải theo múi giờ phòng khám (+07:00) và không có hậu tố UTC.")
    if duration not in VALID_DURATIONS:
        abort(400, description="Thời lượng khám không hợp lệ.")
    schedule_id = data.get("schedule_id", "")
    if not isinstance(schedule_id, str) or not schedule_id:
        abort(400, description="Vui lòng chọn ca làm của bác sĩ.")
    reason = data.get("reason") or ""
    if not isinstance(reason, str):
        abort(400, description="Lý do khám không hợp lệ.")
    patient_id = data.get("patient_id", "")
    if not isinstance(patient_id, str):
        abort(400, description="Bệnh nhân không hợp lệ.")
    parent_id = data.get("follow_up_from_appt_id") or ""
    if not isinstance(parent_id, str):
        abort(400, description="Lịch hẹn trước không hợp lệ.")

    booking = {
        "schedule_id": schedule_id[:20],
        "patient_id": patient_id[:20],
        "appointment_date_time": begins,
        "estimated_duration_minutes": duration,
        "appointment_type": type_value,
        "follow_up_from_appt_id": parent_id[:20],
        "reason": reason[:4000],
    }
    if g.user.role == "PATIENT":
        booking["patient_id"] = ""
    elif g.user.role == "ADMIN" and (not isinstance(booking["patient_id"], str) or not booking["patient_id"]):
        abort(400, description="Vui lòng chọn bệnh nhân.")

    created = appointment_service.book(g.user, booking)
    return jsonify(appointment=_serialize_appointment(appointments.details(created.appointment_id))), 201


@bp.get("/appointments/<appointment_id>")
def appointment_detail(appointment_id):
    appointment_service.accessible(g.user, appointment_id)
    return jsonify(appointment=_serialize_appointment(appointments.details(appointment_id)))


@bp.patch("/appointments/<appointment_id>/status")
@require_roles("PATIENT", "ADMIN", "DOCTOR")
def update_appointment_status(appointment_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get("status") not in APPOINTMENT_STATUSES:
        abort(400, description="Trạng thái lịch hẹn không hợp lệ.")
    appointment_service.change_status(g.user, appointment_id, data["status"])
    return jsonify(appointment=_serialize_appointment(appointments.details(appointment_id)))


@bp.patch("/appointments/<appointment_id>")
@require_roles("ADMIN")
def reschedule_appointment(appointment_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, description="Thông tin điều chỉnh lịch không hợp lệ.")
    type_value = APPOINTMENT_TYPES.get(data.get("appointment_type"))
    try:
        begins = datetime.fromisoformat(data.get("appointment_date_time", ""))
        duration = int(data.get("estimated_duration_minutes", 30))
    except (TypeError, ValueError):
        abort(400, description="Ngày giờ hoặc thời lượng khám không hợp lệ.")
    if not type_value or duration not in VALID_DURATIONS:
        abort(400, description="Hình thức hoặc thời lượng khám không hợp lệ.")
    if begins.tzinfo is not None:
        abort(400, description="Ngày giờ phải theo múi giờ phòng khám (+07:00) và không có hậu tố UTC.")
    reason = data.get("reason") or ""
    schedule_id = data.get("schedule_id", "")
    if not isinstance(reason, str) or not isinstance(schedule_id, str):
        abort(400, description="Thông tin điều chỉnh lịch không hợp lệ.")
    appointment_service.reschedule(g.user, appointment_id, {
        "schedule_id": schedule_id[:20],
        "appointment_date_time": begins,
        "estimated_duration_minutes": duration,
        "appointment_type": type_value,
        "reason": reason[:4000],
    })
    return jsonify(appointment=_serialize_appointment(appointments.details(appointment_id)))
