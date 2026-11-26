# Khóa thiết kế EER Phase 1–2

EER chính thức được giữ nguyên tại [Healthcare_EER.png](../../Healthcare_EER.png). Đây là ảnh Phase 1 trên nhánh `main`, không phải ảnh được sinh lại trong Phase 3/4.

| Kiểm tra | Kết quả |
|---|---|
| SHA-256 EER Phase 1 | `1dc9dff60a49b0a853d82673647f42b419218d01237008580fabeea444c78811` |
| Git blob trên `origin/main` và nhánh implementation | `6e366480cdb25c71c5780c924a8783dcef39b725` — giống nhau |
| Kích thước file | 579,307 bytes — giống bản repo Phase 1 |
| Entity/relation | 13 — không thêm, không xóa |
| Attribute | 78 — đồng bộ theo dictionary Phase 2 cập nhật (bao gồm `DOCTOR.DateOfBirth`) |
| Specialization | DOCTOR → GENERAL_PRACTITIONER/SPECIALIST, Disjoint + Total (dùng `ON DELETE RESTRICT`) |
| Quan hệ/cardinality | Giữ nguyên theo ảnh EER và dictionary đã cập nhật |
| Ngoại lệ duy nhất | `CONSULTATION_SESSION.EndTime` cho phép `NULL`/default `NULL` theo xác nhận của người dùng (`ActualDurationMinutes` giữ `NOT NULL DEFAULT 5` với `BETWEEN 5 AND 30`) |

`docs/diagrams/doctor_specialization.svg` và `.dot` là hình phóng to giải thích specialization đã có, không phải EER thay thế. Khi viết báo cáo hoặc làm slide, dùng ảnh EER gốc làm sơ đồ thiết kế; hình phóng to chỉ đặt ở phần giải thích nếu cần.

Ràng buộc `UNIQUE(doctor_id, schedule_date, start_time)` không có trong dictionary Phase 2 nên tiếp tục được thi hành qua trigger `validate_schedule`; trong khi `UNIQUE(prescription_id, medication_id)` khớp với chứng minh BCNF (`CK2`) trong Phase 2 nên được giữ tại `uq_prescription_item_medication`.

`scripts/verify_structure.py` khóa đồng thời hash ảnh EER, hash DOCX Phase 2, đúng 13 relation/77 field và chỉ chấp nhận một override EndTime. Nếu ảnh EER hoặc baseline bị thay đổi, verifier sẽ thất bại.
