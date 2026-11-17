# Flask backend

Ứng dụng gồm các blueprint có routes thật, 13 entity baseline, forms WTForms/CSRF, services giao dịch và repositories dùng parameterized SQL. Giao diện bác sĩ React được lưu tại `doctor-portal-frontend/`, build vào `app/static/doctor-portal/` và dùng chung session Flask với các trang nghiệp vụ hiện có.

Khi cập nhật giao diện bác sĩ, chạy từ project root:

```powershell
Push-Location backend/doctor-portal-frontend
npm ci
npm run typecheck
npm run build
Pop-Location
```

Sau khi đăng nhập, bác sĩ được chuyển đến `/doctors/portal`. Dữ liệu tải từ `/api/doctor/portal`; thao tác hồ sơ dùng `/api/doctor/profile`, còn trạng thái lịch hẹn dùng API lịch hẹn sẵn có. Mở phiếu khám ở ngay trong React Portal; tạo phiên dùng `POST /api/doctor/appointments/<appointment_id>/consultation`, lưu nội dung dùng `PATCH /api/doctor/consultations/<session_id>`, và kết thúc phiên dùng `POST /api/doctor/consultations/<session_id>/finish`. Liên kết cuộc gọi chỉ hiện cho phiên trực tuyến và phải dùng HTTPS. API kiểm tra role/ownership và dùng CSRF cùng session của Flask.

`config/environment_config()` đọc cấu hình sau dotenv; `app/db.py` quản lý kết nối theo request và commit/rollback; `app/security.py` kiểm session, role, trạng thái tài khoản và redirect an toàn. Service kiểm ownership trước khi dùng repository. ADMIN không có quyền đọc bệnh sử/đơn thuốc qua ứng dụng.

Từ project root chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1`. Hướng dẫn môi trường và tài khoản demo: [setup](../docs/setup.md). Phiên bản dependencies cố định tại `requirements.txt`; toàn bộ môi trường đã kiểm chứng tại `requirements-lock.txt`.

Kiểm thử: `.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini --junitxml=docs/verification/pytest.xml backend/tests` từ project root. Tests tích hợp tạo schema/user tạm riêng trên MySQL local 3307 và dọn đúng tài nguyên đó; không reset schema demo. [Kết quả](../docs/verification/RESULTS.md).
