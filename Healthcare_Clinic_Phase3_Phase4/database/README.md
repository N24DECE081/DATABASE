# MySQL database

DDL thực thi tại `migrations/001_initial_schema.sql`: 13 relation, 77 cột, 16 FK, keys/domains theo Phase 2 và override EndTime nullable đã được người dùng chốt. Chạy thực tế trên MySQL 26.7.0, InnoDB, utf8mb4/utf8mb4_0900_ai_ci. Không đổi ID VARCHAR(20), không thêm entity/role mới.

| Folder | Artefact thực tế |
|---|---|
| `migrations/` | DDL theo thứ tự FK, sinh từ manifest có override |
| `indexes/` | 4 indexes bổ sung cho workflow/query |
| `triggers/` | 23 triggers và 4 procedures, bảo vệ profile/subtype/lịch/phiên khám/lịch sử |
| `views/` | appointment details, patient history, prescription details |
| `queries/` | Q01–Q12 theo module, JOIN/aggregate/subquery/recursive CTE |
| `security/` | DB role SELECT/INSERT/UPDATE và ma trận quyền ứng dụng |
| `seeds/` | Chỉ dẫn seed Python có hash mật khẩu và thời gian tương đối |
| `tests/` | Chỉ dẫn tới test tích hợp thực thi SQL trên schema tạm |
| `performance/` | Lý do indexes và đường dẫn EXPLAIN JSON đã chạy |
| `constraints/`, `reset/` | Ràng buộc đã nằm trong DDL; hướng dẫn bảo toàn dữ liệu demo |

Run order chuẩn do `scripts/sql_runner.py::schema_files()` quản lý: migration → indexes → triggers/procedures → views. Bootstrap tạo schema rỗng, chạy các file trên, seed theo dependency, tạo app user và gán role. Không chạy seed theo alphabet module. Xem [setup](../docs/setup.md) và [hợp đồng SQL](../02_Phase3_MySQL_Implementation/SQL_DELIVERY_CONTRACT.md).

DOCTOR + đúng một subtype được tạo atomic trong service; disjoint và việc sử dụng doctor thiếu subtype bị DB chặn. Total tại thời điểm DBA chèn trực tiếp DOCTOR không được bảo đảm chỉ bởi FK. Prescription có ít nhất một item được bảo đảm lúc commit qua service, cùng audit phát hiện header rỗng. Đây là hai quy tắc nhiều dòng cần phân biệt phạm vi app/DB.

`verify_database.py` dùng account ứng dụng để đối chiếu schema, chạy 12 queries, 3 EXPLAIN và thử DELETE bị từ chối. Xem [evidence](../docs/verification/RESULTS.md); không suy ra benchmark production từ dataset demo nhỏ.
