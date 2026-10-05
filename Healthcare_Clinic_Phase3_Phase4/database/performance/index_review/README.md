# Indexes và EXPLAIN

`indexes/001_workflow_indexes.sql` bổ sung indexes cho lịch theo patient/time, doctor/time/status, history theo session/record date và prescriptions theo session/date. PK/UNIQUE/FK có indexes riêng trong DDL; không thêm lại chỉ để tăng số lượng.

`scripts/verify_database.py` đã chạy EXPLAIN FORMAT=JSON cho Q01, Q07, Q08, lưu trong `docs/verification/database.json`. Dataset demo nhỏ nên optimizer có thể chọn table scan; chưa chạy benchmark tải lớn và không kết luận tốc độ production. Mai review selectivity, Tiến review trùng indexes/schema trước khi freeze.
