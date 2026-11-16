# Synthetic seed thực thi

Bootstrap hỗ trợ hai bộ seed, chạy sau khi schema/triggers/views sẵn sàng:

| Bộ dữ liệu | Nguồn | Quy mô |
|---|---|---:|
| Mặc định (nhỏ) | `scripts/seed_demo.py` | 33 dòng |
| Bệnh viện tiếng Việt | `scripts/seed_vietnamese_dataset.py` | **2.000 dòng** |

Cả hai bộ dùng INSERT có tham số, mật khẩu đã hash bằng Werkzeug và ngày tương đối theo giờ Việt Nam. Bộ tiếng Việt được tạo tự động cho bài tập, không chứa hồ sơ bệnh nhân thật. Bộ này có 80 bệnh nhân, 11 bác sĩ, 112 ca làm, 650 lịch hẹn, 400 phiên khám, bệnh sử/đơn thuốc và danh mục thuốc; có nhiều trạng thái lịch hẹn, khám trực tiếp/từ xa và 40 lượt tái khám liên kết. Chi tiết số dòng từng bảng và cách khởi tạo ở [setup](../../docs/setup.md).

Mỗi seed chỉ chạy trên schema rỗng, trong một transaction; từ chối nếu bất kỳ bảng nào đã có dữ liệu và không xóa/reset database. Chọn bộ seed lúc khởi tạo checkout mới: `scripts/bootstrap_local.py` mặc định dùng bộ nhỏ; thêm `--dataset vietnamese` để dùng bộ 2.000 dòng. Có thể kiểm tra số dòng dự kiến bằng `scripts/seed_vietnamese_dataset.py --dry-run`. Không chạy bootstrap lên schema hoặc `.env` đã tồn tại.

Tên bệnh nhân và người liên hệ là tên tiếng Việt đầy đủ; địa chỉ có số nhà, đường và quận/thành phố. Số điện thoại có 10 chữ số theo định dạng di động Việt Nam. Email dạng Gmail được ghép từ tên không dấu và số thứ tự để tránh trùng; địa chỉ chưa xác minh và không dùng để liên lạc. Link khám trực tuyến có định dạng Google Meet nhưng chưa phải cuộc họp thật. Dữ liệu được tạo tự động cho bài tập, không phải hồ sơ bệnh nhân thật. Danh mục thuốc và hướng dẫn không thay thế tư vấn y tế. Tests tự tạo schema tạm riêng và không reset database mẫu.

Để thay dữ liệu trong schema `healthcare_clinic_portal` bằng MySQL Workbench, chạy `scripts/seed_vietnamese_dataset.py --export-replace` để xuất `database/seeds/healthcare_clinic_portal_vietnamese_seed.sql`. File giữ nguyên cấu trúc schema, thay dữ liệu ở 13 bảng và khôi phục các trigger xóa tạm thời. Sao lưu database trước khi chạy; không chỉnh tay file SQL, hãy xuất lại sau khi thay đổi seed.
