# Yêu cầu người dùng

Nguồn gốc scope là Phase 1/2; đây là cách mô tả nhu cầu của ba vai trò, không tạo thêm quyền/nghiệp vụ.

- **ADMIN:** quản lý tài khoản và hoạt động hành chính được nêu trong baseline; xử lý bác sĩ, lịch và lịch hẹn.
- **DOCTOR:** xem lịch được phân công; quản lý ca làm của mình theo quyền; ghi consultation session, medical history, prescription và follow-up.
- **PATIENT:** quản lý thông tin cá nhân; tìm dịch vụ/bác sĩ; đặt và xem lịch hẹn của mình; xem hồ sơ y tế của chính mình; tham gia telemedicine.

Mỗi yêu cầu khi triển khai phải liên kết BR/IC trong Phase 1/2, SQL object hoặc route/UI tương ứng và test. Không bổ sung tính năng ngoài scope.
