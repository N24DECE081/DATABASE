"""admin: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("admin", __name__, url_prefix="/admin")

from flask import g, flash, redirect, render_template, url_for
from ...forms.admin import AccountForm, AccountStatusForm, SpecialtyForm
from ...repositories import admin, doctors, appointments
from ...security import require_roles
from ...services import admin as service
from ...utils.forms import data_for


@bp.get("/")
@require_roles("ADMIN")
def dashboard():
    return render_template("admin/dashboard.html", counts=admin.counts(), accounts=admin.accounts(),
                           appointments=appointments.list_for(g.user)[:8], form=AccountStatusForm())


@bp.route("/accounts/new", methods=["GET", "POST"])
@require_roles("ADMIN")
def create_account():
    form = AccountForm()
    form.specialty_id.choices += [(s["specialty_id"], s["specialty_name"]) for s in doctors.specialties()]
    if form.validate_on_submit():
        service.create_account(g.user, data_for(form, "username password role full_name phone email date_of_birth gender emergency_contact_name emergency_contact_phone license_number subtype specialty_id"))
        flash("Đã tạo tài khoản cùng hồ sơ theo vai trò.", "success")
        return redirect(url_for("admin.dashboard"))
    return render_template("shared/form.html", title="Tạo tài khoản", subtitle="Chọn vai trò và điền các trường hồ sơ tương ứng. Bác sĩ cần đúng một phân loại.", form=form)


@bp.post("/accounts/<user_id>/status")
@require_roles("ADMIN")
def account_status(user_id):
    form = AccountStatusForm()
    if form.validate_on_submit():
        service.change_account_status(g.user, user_id, form.account_status.data)
        flash("Đã cập nhật trạng thái tài khoản.", "success")
    return redirect(url_for("admin.dashboard"))


@bp.route("/specialties/new", methods=["GET", "POST"])
@require_roles("ADMIN")
def create_specialty():
    form = SpecialtyForm()
    if form.validate_on_submit():
        service.create_specialty(g.user, form.specialty_name.data, form.description.data)
        flash("Đã thêm chuyên khoa.", "success")
        return redirect(url_for("doctors.index"))
    return render_template("shared/form.html", title="Thêm chuyên khoa", subtitle="Chuyên khoa được gán cho bác sĩ chuyên khoa.", form=form)
