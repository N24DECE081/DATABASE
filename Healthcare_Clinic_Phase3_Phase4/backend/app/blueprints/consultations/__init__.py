"""consultations: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("consultations", __name__, url_prefix="/consultations")

from datetime import timedelta
from flask import abort, current_app, g, flash, redirect, render_template, url_for
from ...forms.consultations import SessionForm, FinishForm
from ...repositories import appointments, consultations
from ...security import require_roles
from ...services import consultations as service
from ...services import jaas
from ...services.appointments import accessible
from ...services.common import now
from ...utils.forms import data_for


@bp.get("/")
@require_roles("PATIENT", "DOCTOR")
def index():
    records = [a for a in appointments.list_for(g.user) if a["session_id"]]
    return render_template("consultations/index.html", sessions=records)


@bp.route("/new/<appointment_id>", methods=["GET", "POST"])
@require_roles("DOCTOR")
def create(appointment_id):
    accessible(g.user, appointment_id)
    form = SessionForm()
    if form.validate_on_submit():
        session = service.create(g.user, appointment_id, data_for(form, "start_time end_time actual_duration_minutes diagnosis_notes"))
        flash("Đã lưu phiên khám.", "success")
        return redirect(url_for("consultations.detail", session_id=session.session_id))
    return render_template("shared/form.html", title="Ghi phiên khám", subtitle="Để trống giờ kết thúc nếu đang khám. Khi đóng phiên, thời lượng được tính từ hai mốc giờ.", form=form)


@bp.get("/<session_id>")
@require_roles("PATIENT", "DOCTOR")
def detail(session_id):
    record = service.accessible_session(g.user, session_id)
    appointment = appointments.details(record.appointment_id)
    meeting_join_available = (
        record.session_type == "Virtual"
        and jaas.is_room_url(record.meeting_url)
        and record.end_time is None
        and appointment["status"] == "Checked-In"
        and jaas.may_join(appointment)
    )
    return render_template("consultations/detail.html", record=record,
        appointment=appointment, meeting_join_available=meeting_join_available,
        form=FinishForm(end_time=now()))


@bp.get("/<session_id>/meeting")
@require_roles("PATIENT", "DOCTOR")
def meeting(session_id):
    record = service.accessible_session(g.user, session_id)
    if record.session_type != "Virtual" or record.end_time is not None or not record.meeting_url:
        abort(403, description="Phiên khám chưa có phòng họp đang hoạt động.")
    appointment = accessible(g.user, record.appointment_id)
    if appointment.status != "Checked-In" or not jaas.may_join(appointment):
        abort(403, description="Phòng họp chỉ khả dụng trong khung giờ khám đã đặt.")
    appointment_end = appointment.appointment_date_time + timedelta(
        minutes=appointment.estimated_duration_minutes
        + current_app.config["JAAS_JOIN_GRACE_MINUTES"]
    )
    details = appointments.details(record.appointment_id)
    display_name = details["doctor_name"] if g.user.role == "DOCTOR" else details["patient_name"]
    token = jaas.issue_token(
        record.meeting_url,
        g.user.user_id,
        display_name,
        moderator=g.user.role == "DOCTOR",
        expires_at=appointment_end,
    )
    return render_template(
        "consultations/meeting.html",
        iframe_url=jaas.iframe_url(record.meeting_url, token),
        appointment=details,
        session_id=session_id,
    )


@bp.post("/<session_id>/finish")
@require_roles("DOCTOR")
def finish(session_id):
    form = FinishForm()
    if form.validate_on_submit():
        service.finish(g.user, session_id, form.end_time.data)
        flash("Phiên khám đã kết thúc, lịch hẹn chuyển Completed.", "success")
    return redirect(url_for("consultations.detail", session_id=session_id))
