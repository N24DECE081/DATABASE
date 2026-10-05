# Flask backend

Ứng dụng gồm 10 blueprint có routes thật, 13 entity baseline, forms WTForms/CSRF, services giao dịch và repositories dùng parameterized SQL. Giao diện tiếng Việt dùng templates/CSS/JS local, hỗ trợ desktop/mobile.

`config/environment_config()` đọc cấu hình sau dotenv; `app/db.py` quản lý kết nối theo request và commit/rollback; `app/security.py` kiểm session, role, trạng thái tài khoản và redirect an toàn. Service kiểm ownership trước khi dùng repository. ADMIN không có quyền đọc bệnh sử/đơn thuốc qua ứng dụng.

Từ project root chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1`. Hướng dẫn môi trường và tài khoản demo: [setup](../docs/setup.md). Phiên bản dependencies cố định tại `requirements.txt`; toàn bộ môi trường đã kiểm chứng tại `requirements-lock.txt`.

Kiểm thử: `.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini --junitxml=docs/verification/pytest.xml backend/tests` từ project root. Tests tích hợp tạo schema/user tạm riêng trên MySQL local 3307 và dọn đúng tài nguyên đó; không reset schema demo. [Kết quả](../docs/verification/RESULTS.md).
