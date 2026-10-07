"""prescriptions: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("prescriptions", __name__, url_prefix="/prescriptions")

from flask import g, flash, redirect, render_template, url_for
from ...forms.prescriptions import PrescriptionForm
from ...repositories.medications import list_medications
from ...security import require_roles
from ...services import prescriptions as service
from ...services.consultations import accessible_session
from ...utils.forms import data_for, run_form_action


@bp.get("/")
@require_roles("PATIENT", "DOCTOR")
def index():
    return render_template("prescriptions/index.html", prescriptions=service.list_for(g.user))


@bp.get("/<prescription_id>")
@require_roles("PATIENT", "DOCTOR")
def detail(prescription_id):
    record, items = service.details(g.user, prescription_id)
    return render_template("prescriptions/detail.html", record=record, items=items)


@bp.route("/new/<session_id>", methods=["GET", "POST"])
@require_roles("DOCTOR")
def create(session_id):
    accessible_session(g.user, session_id)
    form = PrescriptionForm()
    catalog = [(m["medication_id"], m["medication_name"]) for m in list_medications()]
    for entry in form.items:
        entry.form.medication_id.choices = catalog
    if form.validate_on_submit():
        values = data_for(form, "diagnosis_icd instructions")
        values["items"] = [entry.form.data for entry in form.items]
        ok, record = run_form_action(form, lambda: service.create(g.user, session_id, values))
        if ok:
            flash("Đã lưu đơn thuốc và các mục thuốc.", "success")
            return redirect(url_for("prescriptions.detail", prescription_id=record.prescription_id))
    return render_template("prescriptions/form.html", form=form)
