# Chạy đồ án local

Đã kiểm chứng trên Windows, Python 3.11.9, MySQL 26.7.0, Flask 3.1.3. Các lệnh dưới đây chạy từ `Healthcare_Clinic_Phase3_Phase4/`. MySQL của dự án dùng cổng 3307 và dữ liệu riêng `.local/mysql`; không thay cấu hình service MySQL hệ thống.

## Chạy lại trên máy hiện tại

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1
```

Mở http://127.0.0.1:5000. `/health` kiểm process; `/ready` kiểm kết nối DB. `backend/.env` đã được tạo local và không được đưa vào Git. `bootstrap_local.py` từ chối ghi đè `.env` hoặc schema sẵn có.

Giao diện doctor được đóng gói sẵn trong `backend/app/static/doctor-portal/`. Nếu chỉnh sửa React source, chạy `npm ci`, `npm run typecheck` và `npm run build` trong `backend/doctor-portal-frontend/` trước khi khởi động lại Flask.

## Khởi tạo bản checkout mới

Cài Python 3.11+ và MySQL có CHECK/roles; phiên bản đã chạy ở đây là 26.7.0. Script MySQL mặc định tìm `C:/Program Files/MySQL/MySQL Server 26.7`; có thể truyền `-MySqlHome` cho vị trí khác. Không khởi động một DB thứ hai nếu cổng 3307 đang được ứng dụng khác dùng.

```powershell
python -m venv .venv
```

Dùng đường dẫn Python mà venv thực tế tạo ra: Windows Python thông thường là `.venv/Scripts/python.exe`; môi trường hiện tại là `.venv/bin/python.exe`. Ví dụ cho môi trường hiện tại, chọn **một** trong hai lệnh bootstrap:

```powershell
.venv/bin/python.exe -m pip install -r backend/requirements-lock.txt
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
# Bộ nhỏ mặc định:
.venv/bin/python.exe -X utf8 scripts/bootstrap_local.py
# Hoặc thay bằng bộ dữ liệu tiếng Việt 2.000 dòng:
.venv/bin/python.exe -X utf8 scripts/bootstrap_local.py --dataset vietnamese
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-local.ps1
```

`ExecutionPolicy Bypass` chỉ áp dụng process chạy script này. Bootstrap chỉ dùng root của MySQL riêng trên loopback để tạo schema/user/role. Root local này được khởi tạo không có mật khẩu; Flask dùng `healthcare_app` với password ngẫu nhiên lưu trong `.env`, chỉ được SELECT/INSERT/UPDATE qua role `clinic_application`.

Dữ liệu mặc định gồm 5 accounts, 2 patients, 2 doctors (GP/Specialist), 1 specialty, 8 shifts, 7 appointments, 1 completed session, 1 history, 1 prescription/2 items và 2 thuốc. Muốn dùng bộ lớn, truyền `--dataset vietnamese` **ngay khi bootstrap schema mới**; seed từ chối chạy nếu bất kỳ bảng nào đã có dữ liệu. Không xóa/reset database. Có thể kiểm tra số dòng trước đó bằng `.venv/bin/python.exe -X utf8 scripts/seed_vietnamese_dataset.py --dry-run`.

Bộ tiếng Việt có tổng cộng **2.000 dòng**:

| Bảng | Dòng |
|---|---:|
| user_account / patient | 92 / 80 |
| specialty / doctor / general_practitioner / specialist | 6 / 11 / 4 / 7 |
| doctor_schedule / appointment | 112 / 650 |
| consultation_session / medical_history | 400 / 300 |
| medication / prescription / prescription_item | 24 / 150 / 164 |

Tài khoản dùng chung mật khẩu `BenhVien!2026`: admin `admin`, bác sĩ `bacsi001`–`bacsi011`, bệnh nhân `benhnhan001`–`benhnhan080`. Bộ dữ liệu được tạo tự động cho bài tập, không phải hồ sơ bệnh nhân thật. Số điện thoại có 10 chữ số theo định dạng di động Việt Nam; email tạo từ tên người dùng theo định dạng Gmail nhưng chưa xác minh và không dùng để gửi thư. Địa chỉ có số nhà, tên đường và quận/thành phố; tên người liên hệ là tên tiếng Việt đầy đủ. Link khám trực tuyến theo định dạng Google Meet nhưng không phải cuộc họp thật. Danh mục thuốc và hướng dẫn không thay thế tư vấn y tế. Cả hai seed giữ nguyên 13 bảng hiện có và không thêm cột hay thay đổi baseline.

### Thay dữ liệu hiện có bằng MySQL Workbench

Đã sao lưu xong thì từ thư mục dự án xuất file dữ liệu cho schema `healthcare_clinic_portal`:

```powershell
.\.venv\Scripts\python.exe -X utf8 scripts\seed_vietnamese_dataset.py --export-replace
```

Trong Workbench đang kết nối tới đúng server/schema, mở `database/seeds/healthcare_clinic_portal_vietnamese_seed.sql` và bấm **Execute All**. Script xóa các dòng trong 13 bảng dự án, nạp 2.000 dòng mới, khôi phục các trigger xóa tạm thời và trả về tổng dòng để kiểm tra. Dừng ứng dụng trước khi chạy để tránh ghi dữ liệu đồng thời. Chỉ dùng khi đã sao lưu và muốn thay toàn bộ dữ liệu của các bảng này.

`admin`, `bacsi001`... là tài khoản ứng dụng, không phải tài khoản kết nối MySQL Workbench. Kết nối Workbench cần user MySQL có quyền xóa/chèn dữ liệu và tạo trigger.

Tài khoản cho bộ nhỏ mặc định:

| Role | Username | Password |
|---|---|---|
| ADMIN | `admin` | `ClinicDemo!2026` |
| DOCTOR | `doctor_gp`, `doctor_specialist` | `ClinicDemo!2026` |
| PATIENT | `patient_one`, `patient_two` | `ClinicDemo!2026` |

## Luồng chức năng

1. Patient xem bác sĩ/chuyên khoa và ca khả dụng, chọn giờ hoặc bác sĩ mong muốn, đặt lịch.
2. Doctor xem lịch được phân công, check-in, bắt đầu phiên khám với EndTime NULL.
3. Doctor kết thúc phiên khám: EndTime được ghi, thời lượng tính lại, appointment chuyển Completed.
4. Doctor thêm bệnh sử và đơn thuốc có ít nhất một item. Patient xem kết quả của chính mình.
5. Thử đặt trùng giờ, đặt ngoài ca, đọc hồ sơ người khác hoặc thêm bệnh sử trước Completed: yêu cầu bị chặn.

Dữ liệu hồ sơ được sinh tự động cho bài tập, không phải hồ sơ bệnh nhân thật. Danh mục thuốc chỉ phục vụ vận hành phần mềm. Các trạng thái lịch hẹn được giữ lại, không hard-delete.

## Kiểm chứng

```powershell
.venv/bin/python.exe -X utf8 scripts/verify_structure.py
.venv/bin/python.exe -X utf8 scripts/verify_database.py
.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini --junitxml=docs/verification/pytest.xml backend/tests
```

Pytest cần MySQL riêng đã chạy trên 3307 để tạo/cleanup schema test. [Kết quả và giới hạn](verification/RESULTS.md). Script `verify_ui.mjs` dùng Node 24 và Chrome CDP trên 9223 để chụp viewport desktop/mobile; đây là công cụ kiểm chứng tùy chọn, không phải dependency để chạy Flask.
