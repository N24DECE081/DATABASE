# Synthetic seed thực thi

Nguồn duy nhất là `scripts/seed_demo.py`, dùng parameterized INSERT và hash password Werkzeug; ngày seed tương đối theo giờ clinic +07. Bootstrap gọi seed sau khi schema/triggers/views sẵn sàng. Seed cần user_account rỗng, chạy trong transaction và không xóa/reset dữ liệu hiện có.

Gồm ADMIN/DOCTOR/PATIENT, GP/Specialist, specialty, lịch làm việc, Scheduled/Completed/Cancelled/No-show, In-person/Telemedicine/follow-up, history, prescription có 2 items và 2 thuốc giả lập. Baseline relation/column không đổi. ID demo deterministic, ngày phụ thuộc lúc seed.

Chi tiết counts/accounts ở [setup](../../docs/setup.md). Các thư mục module giữ chỗ cho seed mở rộng nếu cần; không có INSERT SQL riêng trùng nguồn Python. Muốn chạy lại demo mà giữ dữ liệu đã nhập, tạo lịch mới qua giao diện. Tests tự tạo schema tạm riêng và không reset DB demo.
