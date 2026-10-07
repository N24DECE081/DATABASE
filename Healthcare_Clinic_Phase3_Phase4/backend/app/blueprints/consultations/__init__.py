"""consultations: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("consultations", __name__, url_prefix="/consultations")

from flask import g, flash, redirect, render_template, url_for
from ...forms.consultations import SessionForm, FinishForm
from ...repositories import appointments, consultations
from ...security import require_roles
from ...services import consultations as service
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
        session = service.create(g.user, appointment_id, data_for(form, "start_time end_time actual_duration_minutes meeting_url diagnosis_notes"))
        flash("Đã lưu phiên khám.", "success")
        return redirect(url_for("consultations.detail", session_id=session.session_id))
    return render_template("shared/form.html", title="Ghi phiên khám", subtitle="Để trống giờ kết thúc nếu đang khám. Khi đóng phiên, thời lượng được tính từ hai mốc giờ.", form=form)


@bp.get("/<session_id>")
@require_roles("PATIENT", "DOCTOR")
def detail(session_id):
    record = service.accessible_session(g.user, session_id)
    return render_template("consultations/detail.html", record=record,
        appointment=appointments.details(record.appointment_id), form=FinishForm(end_time=now()))


@bp.post("/<session_id>/finish")
@require_roles("DOCTOR")
def finish(session_id):
    form = FinishForm()
    if form.validate_on_submit():
        service.finish(g.user, session_id, form.end_time.data)
        flash("Phiên khám đã kết thúc, lịch hẹn chuyển Completed.", "success")
    return redirect(url_for("consultations.detail", session_id=session_id))
