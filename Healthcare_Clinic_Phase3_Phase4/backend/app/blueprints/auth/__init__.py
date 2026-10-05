"""auth: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("auth", __name__, url_prefix="/auth")

from flask import flash, redirect, render_template, request, session, url_for
from ...forms.auth import LoginForm
from ...forms.common import ActionForm
from ...security import login_allowed, safe_next
from ...services.auth import authenticate


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


@bp.post("/logout")
def logout():
    form = ActionForm()
    if form.validate_on_submit():
        session.clear()
    return redirect(url_for("auth.login"))
