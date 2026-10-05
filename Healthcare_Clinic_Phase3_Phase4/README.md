# Healthcare Clinic & Telemedicine Portal

Đồ án Phase 3/4 đã triển khai bằng Flask và MySQL: 10 module chức năng, 13 lớp entity và 77 thuộc tính theo thiết kế Phase 1/2. `CONSULTATION_SESSION.EndTime` cho phép NULL theo quyết định của người dùng ngày 2026-10-05; các file baseline nguồn được giữ nguyên.

Ứng dụng local: **http://127.0.0.1:5000**. MySQL riêng của dự án chạy tại `127.0.0.1:3307`, schema `healthcare_clinic_portal`.

| Vai trò | Tài khoản demo |
|---|---|
| ADMIN | `admin` |
| DOCTOR | `doctor_gp`, `doctor_specialist` |
| PATIENT | `patient_one`, `patient_two` |

Mật khẩu chung cho dữ liệu giả lập: `ClinicDemo!2026`.

Patient tìm bác sĩ/chuyên khoa, xem ca và giờ khả dụng, đặt hoặc hủy lịch của mình, cập nhật hồ sơ và xem kết quả khám/đơn thuốc. Doctor quản lý ca, xem lịch được phân công, tạo lịch tái khám, bắt đầu/kết thúc phiên khám, bổ sung bệnh sử và kê đơn. Admin quản lý tài khoản, hồ sơ, danh mục và lịch hẹn; quyền đọc hồ sơ lâm sàng được giới hạn cho Patient/Doctor theo phạm vi sở hữu.

Xem [hướng dẫn chạy](docs/setup.md), [module và entity](docs/modules.md), [cây thư mục](00_Project_Governance/FOLDER_STRUCTURE.md), [bằng chứng kiểm thử](docs/verification/RESULTS.md) và [thay đổi báo cáo/sơ đồ DOCTOR](docs/report_changes.md).

| Nguồn | Nội dung |
|---|---|
| `backend/` | Flask, entity, forms/services/repositories, templates và app tests |
| `database/` | DDL, 23 triggers, 4 procedures, 3 views, 12 queries, quyền DB và indexes |
| `scripts/` | Khởi tạo MySQL riêng, bootstrap/seed, chạy app và kiểm chứng |
| `docs/` | Mapping baseline, setup, kiến trúc, sơ đồ, evidence |
| `00_Project_Governance/` | Phân công, truy vết, quyết định và trạng thái review |
| `01_Reference_and_Baseline/` | Nguồn chỉ đọc |
| `02.../`, `03.../` | Hợp đồng bàn giao trỏ tới code thực thi |
| `04.../`–`07.../` | Vận hành, báo cáo cuối, demo/defense và đóng gói |

Cây module và ứng dụng đã có code chạy thật. Báo cáo cuối theo template, slides, đánh giá đóng góp và nghiệm thu của ba thành viên vẫn cần hoàn tất; không coi toàn bộ đồ án đã đạt 100% chỉ từ số file hoặc kết quả test. `.env`, `.venv`, `.local`, dữ liệu máy chủ và credentials local được loại khỏi Git.
