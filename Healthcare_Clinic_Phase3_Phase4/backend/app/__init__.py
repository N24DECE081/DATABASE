from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, redirect, render_template, url_for
from flask_wtf.csrf import CSRFProtect, CSRFError
from mysql.connector import Error as MySQLError
from config import environment_config

from .blueprints import register_blueprints
from .db import close_db
from .security import load_user
from .services.common import BusinessError


def create_app(test_config=None) -> Flask:
    """Create a configured app; no DB work is performed until a request/CLI call."""
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    app = Flask(__name__)
    app.config.from_mapping(environment_config())
    if test_config:
        app.config.update(test_config)
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("Set FLASK_SECRET_KEY in backend/.env before starting the app.")
    CSRFProtect(app)
    app.teardown_appcontext(close_db)
    app.before_request(load_user)

    @app.context_processor
    def shared_forms():
        from .forms.common import ActionForm
        return {"logout_form": ActionForm()}

    @app.after_request
    def response_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        if g.get("user"):
            response.headers["Cache-Control"] = "no-store"
        return response

    register_blueprints(app)

    @app.get("/")
    def index():
        if g.user is None:
            return redirect(url_for("auth.login"))
        target = {"ADMIN": "admin.dashboard", "DOCTOR": "appointments.index", "PATIENT": "patients.dashboard"}
        return redirect(url_for(target[g.user.role]))

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/ready")
    def ready():
        from .db import query
        query("SELECT 1 AS ready", one=True)
        return {"status": "ready"}

    @app.errorhandler(BusinessError)
    def business_error(error):
        return render_template("errors/error.html", code=400, message=str(error)), 400

    @app.errorhandler(CSRFError)
    def csrf_error(_error):
        return render_template("errors/error.html", code=400, message="Phiên biểu mẫu hết hạn. Hãy tải lại trang và thử lại."), 400

    @app.errorhandler(MySQLError)
    def db_error(error):
        app.logger.warning("Database operation failed (errno=%s)", error.errno)
        messages = {1062: "Dữ liệu đã tồn tại hoặc vi phạm khóa duy nhất.",
                    1451: "Bản ghi đang được tham chiếu, không thể xóa.",
                    1452: "Bản ghi tham chiếu không tồn tại.",
                    3819: "Dữ liệu không đáp ứng ràng buộc của hệ thống.",
                    1205: "Dữ liệu đang được xử lý. Hãy thử lại.",
                    1213: "Có thao tác đồng thời. Hãy thử lại."}
        if error.errno == 1644 and error.msg.startswith("CLINIC: "):
            message, status = error.msg[8:], 400
        else:
            status = 400 if error.errno in messages else 503
            message = messages.get(error.errno, "Không thể kết nối dữ liệu. Hãy thử lại sau.")
        return render_template("errors/error.html", code=status, message=message), status

    for code in (400, 403, 404, 413, 500):
        def handler(_error, status=code):
            message = {400: "Dữ liệu yêu cầu không hợp lệ.", 403: "Bạn không có quyền truy cập dữ liệu này.", 404: "Không tìm thấy nội dung.",
                       413: "Nội dung gửi lên quá lớn.", 500: "Không thể hoàn thành yêu cầu."}[status]
            return render_template("errors/error.html", code=status, message=message), status
        app.register_error_handler(code, handler)
    return app
