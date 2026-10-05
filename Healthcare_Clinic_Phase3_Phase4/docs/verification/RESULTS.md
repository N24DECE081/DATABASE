# Bằng chứng triển khai và kiểm thử — 2026-10-05

Ứng dụng Flask/MySQL chạy thật tại http://127.0.0.1:5000. MySQL riêng localhost:3307, schema healthcare_clinic_portal. Kết quả dưới đây là observed output của lần chạy trong workspace; không thay việc nghiệm thu của nhóm.

| Kiểm tra | Kết quả | Evidence |
|---|---|---|
| Structural baseline/module | PASS: 10 modules, 13 entities, 77 fields, 80 Python files | scripts/verify_structure.py; baseline SHA-256 bất biến |
| Live schema | PASS: 13 tables, 77 fields, 16 FKs, 3 views | [database.json](database.json) |
| DB object inventory | 23 triggers, 4 procedures; InnoDB/utf8mb4 | [database_objects.json](database_objects.json), DBA read trên DB riêng |
| Unit/integration | **34 passed**, 0 failures/errors/skips; 25.90s trong JUnit | [pytest.xml](pytest.xml) |
| SQL complex queries | Q01–Q12 thực thi; output synthetic và row counts lưu | [database.json](database.json) → queries |
| Performance | EXPLAIN FORMAT=JSON Q01/Q07/Q08 | database.json → plans |
| Privileges | clinic_application Active; app DELETE bị từ chối errno 1142 | database.json → app_grants/active_role/delete_denied |
| Audit nhiều dòng | 0 doctor sai subtype, 0 prescription rỗng | database.json |
| Browser render | 6 screenshots PASS; desktop/mobile không overflow body | [ui/results.json](ui/results.json) |
| Test cleanup | 0 schema/user test còn lại | database_objects.json |
| App readiness | /health và /ready HTTP 200 sau khi khởi động bản cuối | [http.json](http.json) |

Môi trường: Python 3.11.9, Flask 3.1.3, MySQL 26.7.0, timezone +07:00, SQL mode `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. Pin dependencies ở backend/requirements.txt/requirements-lock.txt.

## Case đã kiểm chứng

- Login/hash/session, Active/Locked, CSRF, role/ownership và SQL injection username; patient/doctor không đọc clinical records ngoài scope.
- Booking patient identity không lấy từ payload; ngoài ca/trùng ca/sai doctor/follow-up không hợp lệ bị từ chối. Cancelled giữ lịch sử và cho giờ được tái sử dụng; Admin reschedule giữ BookedByUserID.
- Booking concurrent bằng service và direct SQL, gồm transaction đã có read snapshot: hai yêu cầu cùng khung giờ chỉ có một thành công.
- DOCTOR subtype disjoint, orphan operational use và role/profile linkage; tạo account/profile/subtype trong transaction và rollback nếu lỗi.
- Clinical end-to-end: Patient đặt → Doctor check-in → session EndTime NULL → history trước Completed bị chặn → kết thúc/Completed → history + prescription → Patient xem đúng scope.
- Telemedicine matching modality/MeetingURL và session UNIQUE; history append-only. Prescription item sau lỗi FK làm rollback header và item đầu.
- Patient own profile/admin update, ID/link account bất biến; DOB tương lai và duration ngoài domain bị DB chặn; schedule referenced không được đổi context.

[Ma trận input/expected/test paths](../../database/tests/README.md). Các assertions nằm trong test code; JUnit ghi observed pass/fail.

## SQL outputs đã ghi

| Query | File | Số dòng observed |
|---|---|---:|
| Q01 | `database/queries/appointments/q01_daily_appointments.sql` | 5 |
| Q02 | `database/queries/appointments/q02_doctor_status_counts.sql` | 5 |
| Q03 | `database/queries/appointments/q03_patients_completed_having.sql` | 1 |
| Q04 | `database/queries/appointments/q04_doctors_not_exists.sql` | 2 |
| Q05 | `database/queries/appointments/q05_available_shift_starts.sql` | 58 |
| Q06 | `database/queries/appointments/q06_recursive_followups.sql` | 7 |
| Q07 | `database/queries/medical_history/q07_patient_history.sql` | 1 |
| Q08 | `database/queries/prescriptions/q08_prescription_medications.sql` | 2 |
| Q09 | `database/queries/prescriptions/q09_monthly_medication_usage.sql` | 2 |
| Q10 | `database/queries/appointments/q10_above_average_workload.sql` | 1 |
| Q11 | `database/queries/appointments/q11_doctor_status_ratios.sql` | 2 |
| Q12 | `database/queries/consultations/q12_telemedicine_audit.sql` | 0 |

Counts/output phụ thuộc dữ liệu và ngày chạy; không dùng các con số này làm expected bất biến cho DB mà người dùng tiếp tục nhập liệu. Q12 trả 0 dòng trong seed hiện tại nghĩa là audit không tìm ra modality sai/missing URL trong phiên mẫu. MeetingURL vẫn optional theo BR57; query audit không biến URL thành NOT NULL.

## Giao diện và sơ đồ

| Trang | Viewport | Ảnh |
|---|---|---|
| login-desktop | 1440x1000 | [PNG](ui/login-desktop.png) |
| patient-desktop | 1440x1000 | [PNG](ui/patient-desktop.png) |
| patient-mobile | 390x844 | [PNG](ui/patient-mobile.png) |
| doctor-desktop | 1440x1000 | [PNG](ui/doctor-desktop.png) |
| admin-desktop | 1440x1000 | [PNG](ui/admin-desktop.png) |
| diagram-doctor | 1000x840 | [PNG](ui/diagram-doctor.png) |

Đã mở và kiểm tra ảnh trực quan. Browser dùng real CSRF login cho demo accounts; không tắt authentication. [DOT](../diagrams/doctor_specialization.dot) và [SVG](../diagrams/doctor_specialization.svg) biểu diễn DOCTOR → D/T → GENERAL_PRACTITIONER/SPECIALIST → SPECIALTY. Định nghĩa PATIENT giữ nội dung gốc; [report changes](../report_changes.md).

## Phạm vi và giới hạn

Total specialization được service bảo đảm ở commit khi tạo doctor; DB chặn disjoint và sử dụng orphan, audit phát hiện. DBA chèn riêng DOCTOR vẫn có thể tạo trạng thái trung gian chưa có subtype. Tương tự, service bảo đảm ≥1 prescription item khi commit; DBA chèn bare header có thể tạo prescription rỗng. FK không tự bảo đảm hai quy tắc nhiều dòng này.

App user không có TRIGGER metadata privilege; database.json ghi 0 visible-to-app, inventory DBA ở database_objects.json xác nhận 23 triggers thực tế. Test helpers dùng DBA để dựng/cleanup fixture; ứng dụng live dùng account least privilege. Password/secret không có trong evidence.

Chưa benchmark production, chưa nghiệm thu toàn bộ màn hình/use case ngoài các case listed, chưa hoàn tất report theo template, slides/SQL defense/peer evaluation/submission. DB/APP/SEC đang In review theo task board; không quy đóng góp tự động cho sinh viên.

## Tái chạy

Theo [setup](../setup.md), từ project root:

```powershell
.venv/bin/python.exe -X utf8 scripts/verify_structure.py
.venv/bin/python.exe -X utf8 scripts/verify_database.py
.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini --junitxml=docs/verification/pytest.xml backend/tests
```

Dùng .venv/Scripts/python.exe nếu venv tạo theo Windows Python thông thường. UI evidence optional dùng Node/Chrome CDP; Flask không cần Node/Chrome để vận hành. MySQL/app local được giữ chạy cho demo; baseline nguồn chỉ đọc.
