"""auth: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("auth", __name__, url_prefix="/auth")

from flask import flash, g, redirect, render_template, request, session, url_for
from ...forms.auth import LoginForm, PatientRegistrationForm
from ...forms.common import ActionForm
from ...security import login_allowed, safe_next
from ...services.auth import authenticate, register_patient
from ...services.common import BusinessError


@bp.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        if not login_allowed(request.remote_addr or "local"):
            form.username.errors.append("Quá nhiều lần thử. Hãy thử lại sau 5 phút.")
            return render_template("auth/login.html", form=form), 429
        user = authenticate(form.username.data, form.password.data)
        if user:
            session.clear()
            session["user_id"] = user.user_id
            session.permanent = True
            return redirect(safe_next(request.args.get("next")) or url_for("index"))
        form.password.errors.append("Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.")
    return render_template("auth/login.html", form=form)


@bp.route("/register", methods=["GET", "POST"])
def register():
    if g.user:
        return redirect(url_for("index"))
    form = PatientRegistrationForm()
    if form.validate_on_submit():
        try:
            user, patient = register_patient(form.data)
            session.clear()
            session["user_id"] = user.user_id
            session.permanent = True
            flash(f"Chào mừng {patient.full_name}! Hồ sơ bệnh nhân của bạn đã được khởi tạo thành công.", "success")
            return redirect(url_for("patients.portal"))
        except BusinessError as exc:
            msg = str(exc)
            if "Tên đăng nhập" in msg:
                form.username.errors.append(msg)
            elif "Ngày sinh" in msg:
                form.date_of_birth.errors.append(msg)
            elif "Mật khẩu" in msg:
                form.password.errors.append(msg)
            else:
                flash(msg, "error")
    return render_template("auth/register.html", form=form)


@bp.post("/logout")
def logout():
    form = ActionForm()
    if form.validate_on_submit():
        session.clear()
    return redirect(url_for("auth.login"))
