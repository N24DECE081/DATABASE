"""patients: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("patients", __name__, url_prefix="/patients")

from flask import flash, g, redirect, render_template, url_for
from ...forms.patients import ProfileForm
from ...security import require_roles
from ...services import patients, appointments, medical_history, prescriptions
from ...repositories.appointments import list_for
from ...utils.forms import data_for, run_form_action


@bp.get("/")
@require_roles("PATIENT")
def dashboard():
    profile = patients.own_profile(g.user)
    visits = list_for(g.user)
    return render_template("patients/dashboard.html", profile=profile, appointments=visits,
        history_count=len(medical_history.list_for(g.user)), prescription_count=len(prescriptions.list_for(g.user)))


@bp.route("/profile", methods=["GET", "POST"])
@require_roles("PATIENT")
def profile():
    form = ProfileForm(obj=patients.own_profile(g.user))
    if form.validate_on_submit():
        values = data_for(form, "full_name date_of_birth gender phone email address blood_type allergies chronic_diseases emergency_contact_name emergency_contact_phone")
        for name in ("email", "address", "blood_type", "allergies", "chronic_diseases"):
            values[name] = values[name] or None
        ok, _ = run_form_action(form, lambda: patients.update_profile(g.user, values))
        if ok:
            flash("Đã cập nhật hồ sơ cá nhân.", "success")
            return redirect(url_for("patients.dashboard"))
    return render_template("shared/form.html", title="Hồ sơ cá nhân", subtitle="Thông tin liên hệ và sức khỏe nền của bạn.", form=form)


@bp.route("/account/<account_id>/edit", methods=["GET", "POST"])
@require_roles("ADMIN")
def edit_by_admin(account_id):
    from ...repositories import patients as repository
    from ...services.common import found
    form = ProfileForm(obj=found(repository.for_user(account_id)))
    if form.validate_on_submit():
        values = data_for(form, "full_name date_of_birth gender phone email address blood_type allergies chronic_diseases emergency_contact_name emergency_contact_phone")
        for name in ("email", "address", "blood_type", "allergies", "chronic_diseases"):
            values[name] = values[name] or None
        ok, _ = run_form_action(form, lambda: patients.update_by_admin(g.user, account_id, values))
        if ok:
            flash("Đã cập nhật hồ sơ bệnh nhân.", "success")
            return redirect(url_for("admin.dashboard"))
    return render_template("shared/form.html", title="Hồ sơ bệnh nhân", subtitle="Cập nhật thông tin hồ sơ đã đăng ký.", form=form)
