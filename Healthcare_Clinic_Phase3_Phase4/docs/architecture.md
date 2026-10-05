# Kiến trúc ứng dụng

```text
Browser/template → Blueprint → Form → Service → Repository → MySQL
                                      ↓             ↓
                                   Entity ← row mapping
```

10 module cùng có tầng HTTP/forms/services/repositories/templates. Entity là 13 dataclass/77 field theo Phase 2, không phụ thuộc Flask hoặc driver. `config/` đọc biến môi trường; app factory khởi tạo CSRF, security headers, error handlers và đăng ký blueprints. `db.py` quản lý connection theo request, parameterized SQL và transaction commit/rollback.

Auth lưu user ID trong session và kiểm lại trạng thái Active mỗi request. Decorator kiểm role; service/repository giới hạn theo patient profile hoặc doctor được phân công. Admin quản lý dữ liệu hành chính, không có route đọc clinical history/prescription. Mọi form ghi có CSRF. Lỗi DB không trả SQL/credentials; redirect sau login phải là đường dẫn local.

Appointment đặt qua transaction, khóa doctor rồi schedule, kiểm ownership/khung giờ/trùng lịch. Trigger sử dụng lock cùng doctor và locking reads để tránh hai transaction đều nhận giờ trống. Cancelled/No-show được loại khỏi xung đột; lịch cũ vẫn giữ. Clinical flow: check-in → session EndTime NULL → kết thúc session/Completed atomic → history/prescription. Prescription header/items cùng transaction; item lỗi làm rollback toàn bộ.

DOCTOR/GP/SPECIALIST dùng joined-table/Option 8A. Service tạo account/doctor/đúng một subtype atomic. DB chặn disjoint, thay đổi subtype identity và việc dùng doctor không có đúng một subtype. FK không thể bảo đảm Total ngay khi DBA chèn riêng supertype; audit phát hiện orphan. Service bảo đảm prescription có ≥1 item lúc commit; DB bảo vệ việc xóa item cuối nhưng DBA vẫn có thể chèn header rỗng. Phạm vi này được nêu trong evidence.

EndTime nullable là override BASELINE-01 đã được người dùng chốt. Metadata gốc vẫn giữ, verifier áp dụng `approved_overrides`; không sửa nguồn Phase 1/2. ActualDurationMinutes giữ NOT NULL/domain 5–120. Telemedicine dùng các cột AppointmentType/SessionType/MeetingURL sẵn có, không tạo entity mới.

Python chỉ ở `backend/`, SQL chỉ ở `database/`; 02/03 là hợp đồng bàn giao. [Modules](modules.md), [setup](setup.md), [verification](verification/RESULTS.md).
