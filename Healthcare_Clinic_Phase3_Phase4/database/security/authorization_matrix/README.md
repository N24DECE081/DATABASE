# Ma trận quyền đã triển khai

| Chức năng | PATIENT | DOCTOR | ADMIN |
|---|---|---|---|
| Bác sĩ/chuyên khoa/ca khả dụng | Xem | Xem; sửa hồ sơ/ca của mình | Quản lý danh mục/ca |
| Patient profile | Xem/sửa của mình | Thông tin trong assigned appointment | Cập nhật hành chính |
| Appointment | Đặt/xem; hủy Scheduled của mình | Xem assigned; tạo follow-up; check-in/status | Hỗ trợ đặt/reschedule/status |
| Consultation | Xem trong phạm vi mình | Tạo/kết thúc assigned | Không truy cập clinical |
| Medical history | Xem của mình | Thêm/xem assigned, chỉ Completed | Không truy cập clinical |
| Prescription | Xem của mình | Tạo/xem assigned, chỉ Completed | Không truy cập clinical |
| Account/status/medication | Không quản trị | Không quản trị | Quản trị; không tự khóa mình |

Role/account/profile và assignment kiểm ở backend. App DB user là một account kỹ thuật có SELECT/INSERT/UPDATE qua role clinic_application; không phải DB user riêng cho từng người. DB không tự phân biệt patient identity của browser. DELETE/DDL/GRANT/TRIGGER không cấp cho app; negative DELETE đã bị từ chối errno 1142. Evidence SHOW GRANTS/current role ở docs/verification/database.json.
