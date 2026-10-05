# Khóa thiết kế EER Phase 1–2

EER chính thức được giữ nguyên tại [Healthcare_EER.png](../../Healthcare_EER.png). Đây là ảnh Phase 1 trên nhánh `main`, không phải ảnh được sinh lại trong Phase 3/4.

| Kiểm tra | Kết quả |
|---|---|
| SHA-256 EER Phase 1 | `1dc9dff60a49b0a853d82673647f42b419218d01237008580fabeea444c78811` |
| Git blob trên `origin/main` và nhánh implementation | `6e366480cdb25c71c5780c924a8783dcef39b725` — giống nhau |
| Kích thước file | 579,307 bytes — giống bản repo Phase 1 |
| Entity/relation | 13 — không thêm, không xóa |
| Attribute | 77 — tên, kiểu, PK/FK/UNIQUE/domain/default giữ theo dictionary Phase 2 |
| Specialization | DOCTOR → GENERAL_PRACTITIONER/SPECIALIST, Disjoint + Total — giữ nguyên |
| Quan hệ/cardinality | Giữ nguyên theo ảnh EER và dictionary đã nộp |
| Ngoại lệ duy nhất | `CONSULTATION_SESSION.EndTime` cho phép `NULL`/default `NULL` theo xác nhận của người dùng |

`docs/diagrams/doctor_specialization.svg` và `.dot` là hình phóng to giải thích specialization đã có, không phải EER thay thế. Khi viết báo cáo hoặc làm slide, dùng ảnh EER gốc làm sơ đồ thiết kế; hình phóng to chỉ đặt ở phần giải thích nếu cần.

Hai UNIQUE tổng hợp từng được thêm trong bản triển khai (`doctor_id + schedule_date + start_time` và `prescription_id + medication_id`) đã được loại bỏ vì không có trong dictionary Phase 2. Quy tắc chống trùng lịch tiếp tục được thi hành bởi business rules/trigger/service mà không thay candidate key của thiết kế.

`scripts/verify_structure.py` khóa đồng thời hash ảnh EER, hash DOCX Phase 2, đúng 13 relation/77 field và chỉ chấp nhận một override EndTime. Nếu ảnh EER hoặc baseline bị thay đổi, verifier sẽ thất bại.
