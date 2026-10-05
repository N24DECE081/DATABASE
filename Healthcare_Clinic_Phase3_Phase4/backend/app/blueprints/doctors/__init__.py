"""doctors: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("doctors", __name__, url_prefix="/doctors")

from flask import g, flash, redirect, render_template, request, url_for
from ...repositories import doctors
from ...security import require_roles


@bp.get("/")
@require_roles()
def index():
    search = request.args.get("q", "")[:100]
    specialty = request.args.get("specialty", "")[:20]
    return render_template("doctors/index.html", doctors=doctors.directory(search, specialty),
                           specialties=doctors.specialties(), search=search, specialty=specialty)


@bp.route("/<doctor_id>/edit", methods=["GET", "POST"])
@require_roles("ADMIN", "DOCTOR")
def edit(doctor_id):
    from ...forms.doctors import DoctorForm
    from ...services import doctors as service
    from ...utils.forms import data_for
    from flask import abort
    if g.user.role == "DOCTOR" and service.own_doctor(g.user).doctor_id != doctor_id:
        abort(403)
    form = DoctorForm(obj=service.classified_doctor(doctor_id))
    if form.validate_on_submit():
        service.update_profile(g.user, doctor_id, data_for(form, "full_name phone email license_number"))
        flash("Đã cập nhật thông tin bác sĩ.", "success")
        return redirect(url_for("doctors.index"))
    return render_template("shared/form.html", title="Thông tin bác sĩ", subtitle="Cập nhật thông tin liên hệ và giấy phép.", form=form)
