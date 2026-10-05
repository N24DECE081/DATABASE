# Hợp đồng bàn giao MySQL

SQL thực thi tại `database/`, đường dẫn tính từ project root. Không tạo object hai lần trong migration và script bổ sung.

1. Manifest giữ dictionary gốc và override EndTime NULL đã được người dùng duyệt.
2. `database/migrations/001_initial_schema.sql` tạo 13 relation theo FK dependency; `scripts/build_schema.py` tái sinh từ manifest.
3. `scripts/sql_runner.py` chạy migration → indexes → triggers/procedures → views, có hỗ trợ DELIMITER.
4. `scripts/seed_demo.py` tạo synthetic data theo FK order và hash password. `database/seeds/` trỏ tới nguồn Python này; không nhân bản INSERT với password plaintext.
5. `database/security/roles/001_application_role.sql` cấp SELECT/INSERT/UPDATE cho role và gán account ứng dụng; credentials chỉ ở `.env` local.
6. `scripts/verify_database.py` kiểm schema, views/FK, audit nhiều dòng, chạy Q01–Q12 và lưu EXPLAIN. `backend/tests/integration/` thực thi positive/negative/concurrency SQL cases với schema/user tạm.

Q01–Q06/Q10–Q11 ở queries/appointments; Q07 medical_history; Q08–Q09 prescriptions; Q12 consultations. Owner giữ nguyên: Tiến Q01–Q04, Mai Q05–Q08, Tuyền Q09–Q12. Mỗi query chỉ có một file dù JOIN nhiều module.

Evidence thực tế tại `docs/verification/`; [kết quả](../docs/verification/RESULTS.md) phân biệt DB enforcement và service transaction cho total subtype/ít nhất một item. `.local` chứa server riêng, không commit data/dump/credential. Bootstrap từ chối ghi đè DB/.env, không tự reset demo.
