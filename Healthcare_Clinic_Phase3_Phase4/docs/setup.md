# Chạy đồ án local

Đã kiểm chứng trên Windows, Python 3.11.9, MySQL 26.7.0, Flask 3.1.3. Các lệnh dưới đây chạy từ `Healthcare_Clinic_Phase3_Phase4/`. MySQL của dự án dùng cổng 3307 và dữ liệu riêng `.local/mysql`; không thay cấu hình service MySQL hệ thống.

## Chạy lại trên máy hiện tại

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1
```

Mở http://127.0.0.1:5000. `/health` kiểm process; `/ready` kiểm kết nối DB. `backend/.env` đã được tạo local và không được đưa vào Git. `bootstrap_local.py` từ chối ghi đè `.env` hoặc schema sẵn có.

## Khởi tạo bản checkout mới

Cài Python 3.11+ và MySQL có CHECK/roles; phiên bản đã chạy ở đây là 26.7.0. Script MySQL mặc định tìm `C:/Program Files/MySQL/MySQL Server 26.7`; có thể truyền `-MySqlHome` cho vị trí khác. Không khởi động một DB thứ hai nếu cổng 3307 đang được ứng dụng khác dùng.

```powershell
python -m venv .venv
```

Dùng đường dẫn Python mà venv thực tế tạo ra: Windows Python thông thường là `.venv/Scripts/python.exe`; môi trường hiện tại là `.venv/bin/python.exe`. Ví dụ cho môi trường hiện tại:

```powershell
.venv/bin/python.exe -m pip install -r backend/requirements-lock.txt
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
.venv/bin/python.exe -X utf8 scripts/bootstrap_local.py
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1
```

`ExecutionPolicy Bypass` chỉ áp dụng process chạy script này. Bootstrap chỉ dùng root của MySQL riêng trên loopback để tạo schema/user/role. Root local này được khởi tạo không có mật khẩu; Flask dùng `healthcare_app` với password ngẫu nhiên lưu trong `.env`, chỉ được SELECT/INSERT/UPDATE qua role `clinic_application`.

Dữ liệu khởi tạo: 5 accounts, 2 patients, 2 doctors (GP/Specialist), 1 specialty, 8 shifts, 7 appointments, 1 completed session, 1 history, 1 prescription/2 items, 2 thuốc giả lập. Các ngày seed tương đối theo ngày bootstrap để có lịch cho demo. Seed không xóa dữ liệu; test dùng schema tạm riêng.

| Role | Username | Password |
|---|---|---|
| ADMIN | `admin` | `ClinicDemo!2026` |
| DOCTOR | `doctor_gp`, `doctor_specialist` | `ClinicDemo!2026` |
| PATIENT | `patient_one`, `patient_two` | `ClinicDemo!2026` |

## Luồng demo

1. Patient xem bác sĩ/chuyên khoa và ca khả dụng, chọn giờ hoặc bác sĩ mong muốn, đặt lịch.
2. Doctor xem lịch được phân công, check-in, bắt đầu phiên khám với EndTime NULL.
3. Doctor kết thúc phiên khám: EndTime được ghi, thời lượng tính lại, appointment chuyển Completed.
4. Doctor thêm bệnh sử và đơn thuốc có ít nhất một item. Patient xem kết quả của chính mình.
5. Thử đặt trùng giờ, đặt ngoài ca, đọc hồ sơ người khác hoặc thêm bệnh sử trước Completed: yêu cầu bị chặn.

Hồ sơ bệnh án dùng dữ liệu giả lập; thuốc demo là danh mục mẫu. Các trạng thái lịch hẹn được giữ lại, không hard-delete.

## Kiểm chứng

```powershell
.venv/bin/python.exe -X utf8 scripts/verify_structure.py
.venv/bin/python.exe -X utf8 scripts/verify_database.py
.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini --junitxml=docs/verification/pytest.xml backend/tests
```

Pytest cần MySQL riêng đã chạy trên 3307 để tạo/cleanup schema test. [Kết quả và giới hạn](verification/RESULTS.md). Script `verify_ui.mjs` dùng Node 24 và Chrome CDP trên 9223 để chụp viewport desktop/mobile; đây là công cụ kiểm chứng tùy chọn, không phải dependency để chạy Flask.
