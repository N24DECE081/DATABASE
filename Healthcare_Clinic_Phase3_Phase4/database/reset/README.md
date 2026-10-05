# Bảo toàn dữ liệu demo

Không cung cấp reset tự động cho schema healthcare_clinic_portal đang dùng. Bootstrap và seed từ chối ghi đè dữ liệu hiện có. Các integration tests tạo và dọn schema/user có tên ngẫu nhiên riêng, không tác động DB demo.

Dùng UI để thêm ca/lịch demo mới khi các ngày seed cũ đã qua. Nếu cần rebuild một DB khác, tạo schema mới có tên rõ ràng và áp dụng run order trong docs/setup.md; không xóa schema đang dùng để làm mới ngày demo.
