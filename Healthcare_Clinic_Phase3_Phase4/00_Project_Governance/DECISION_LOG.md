# Nhật ký quyết định

| Ngày | Vấn đề | Quyết định/trạng thái | Người chốt | Ảnh hưởng |
|---|---|---|---|---|
| 2026-09-30 | Overview RP2 ghi 12 bảng, schema/dictionary định nghĩa 13 quan hệ | Dùng đủ 13 quan hệ; 12 là lỗi đếm văn bản | Cần nhóm xác nhận | Không đổi schema |
| 2026-09-30 | Tên logic uppercase, SQL standard yêu cầu lowercase snake_case | Lập mapping tên vật lý nhất quán, ý nghĩa schema bất biến | Cần nhóm xác nhận | Chỉ ánh xạ vật lý |
| 2026-09-30 | Phiên bản DBMS và khả năng constraint/trigger | Chưa chốt; ghi phiên bản và kiểm chứng trước khi kết luận | Nhóm | Ảnh hưởng cách enforce |
| 2026-09-30 | Hoán đổi phạm vi công việc Mai và Tiến theo yêu cầu nhóm | Tiến phụ trách data model/persistence; Mai phụ trách integrity/clinical workflows | Nhóm | Đã đồng bộ Work Assignment, Task Board, WBS và execution guide |

Ghi mọi khác biệt giữa yêu cầu và baseline trước khi thay đổi. Log này không cho phép tự sửa thiết kế đã nộp.

## Quyết định tổ chức module ngày 2026-10-05

| ID | Vấn đề | Kết quả | Ảnh hưởng |
|---|---|---|---|
| STRUCTURE-01 | Cây tài liệu 02/03 khác code backend/database | backend/database là nguồn thực thi; 02/03 giữ hợp đồng | Đồng bộ tài liệu/task paths, dọn scaffold Phase rỗng |
| STRUCTURE-02 | Thiếu entity và module | 9 module nghiệp vụ + admin, 13 entity/77 field Phase 2 | Không thêm/xóa relation/cột/role |
| BASELINE-01 | EER EndTime nullable, Phase 2 NOT NULL | Resolved: người dùng cho phép NULL ngày 2026-10-05 | Entity, DDL và validation áp dụng override; metadata/file nguồn giữ nguyên |

Quyết định cấu trúc thuộc yêu cầu chia module. BASELINE-01 là ngoại lệ NULLability được người dùng cho phép rõ ràng; không tự đổi các thuộc tính khác.

| ID | Vấn đề | Kết quả | Ảnh hưởng |
|---|---|---|---|
| IMPLEMENTATION-01 | Người dùng yêu cầu triển khai cây thành đồ án chạy thật | Flask 3.1.3, Python 3.11.9, MySQL 26.7.0; DB riêng localhost:3307 | Code thật, dependencies pin, bootstrap giữ dữ liệu hiện có |
| SECURITY-01 | App DB privileges | clinic_application chỉ SELECT/INSERT/UPDATE; DELETE probe bị từ chối | Flask không dùng root, password/secret ở .env local |
| REPORT-01 | Giữ mô tả PATIENT và bỏ mục bổ sung follow-up | PATIENT baseline đã có định nghĩa; không nhân đôi. BR32/FK follow-up hiện hữu vẫn thi hành | docs/report_changes.md; không ghi đè báo cáo nguồn |
| EER-01 | DOCTOR Disjoint + Total | DOT/SVG dùng D/T, joined-table, chỉ SPECIALIST nối SPECIALTY | Sơ đồ để đưa vào báo cáo mới |
