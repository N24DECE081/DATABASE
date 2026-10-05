"""medical_history: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("medical_history", __name__, url_prefix="/medical-history")

from flask import g, flash, redirect, render_template, url_for
from ...forms.medical_history import HistoryForm
from ...security import require_roles
from ...services import medical_history as service
from ...services.consultations import accessible_session
from ...utils.forms import data_for


@bp.get("/")
@require_roles("PATIENT", "DOCTOR")
def index():
    return render_template("medical_history/index.html", records=service.list_for(g.user))


@bp.route("/new/<session_id>", methods=["GET", "POST"])
@require_roles("DOCTOR")
def create(session_id):
    accessible_session(g.user, session_id)
    form = HistoryForm()
    if form.validate_on_submit():
        service.create(g.user, session_id, data_for(form, "diagnosis symptoms progress_notes"))
        flash("Đã ghi bệnh sử vào hồ sơ.", "success")
        return redirect(url_for("medical_history.index"))
    return render_template("shared/form.html", title="Ghi bệnh sử", subtitle="Bệnh sử chỉ ghi sau khi lịch hẹn Completed; bản ghi được lưu trong hồ sơ lâu dài.", form=form)
