"""medications: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("medications", __name__, url_prefix="/medications")

from flask import g, flash, redirect, render_template, request, url_for
from ...forms.medications import MedicationForm
from ...repositories.medications import list_medications
from ...security import require_roles
from ...services.medications import create as create_medication


@bp.get("/")
@require_roles("DOCTOR", "ADMIN")
def index():
    return render_template("medications/index.html", medications=list_medications(request.args.get("q", "")[:100]))


@bp.route("/new", methods=["GET", "POST"])
@require_roles("ADMIN")
def create():
    form = MedicationForm()
    if form.validate_on_submit():
        create_medication(g.user, form.medication_name.data, form.description.data)
        flash("Đã thêm thuốc vào danh mục.", "success")
        return redirect(url_for("medications.index"))
    return render_template("shared/form.html", title="Thêm thuốc", subtitle="Danh mục thuốc dùng khi lập đơn thuốc.", form=form)
