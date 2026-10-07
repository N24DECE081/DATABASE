# Healthcare Clinic & Telemedicine Portal

Đồ án Phase 3/4 đã triển khai bằng Flask và MySQL: 10 module chức năng, 13 lớp entity và 77 thuộc tính theo thiết kế Phase 1/2. EER Phase 1 được giữ nguyên và khóa hash; không thêm/bớt entity, attribute, relationship, cardinality hoặc key thiết kế. Ngoại lệ duy nhất là `CONSULTATION_SESSION.EndTime` cho phép NULL theo quyết định của người dùng ngày 2026-10-05.

Ứng dụng local: **http://127.0.0.1:5000**. MySQL riêng của dự án chạy tại `127.0.0.1:3307`, schema `healthcare_clinic_portal`.

| Vai trò | Tài khoản demo |
|---|---|
| ADMIN | `admin` |
| DOCTOR | `doctor_gp`, `doctor_specialist` |
| PATIENT | `patient_one`, `patient_two` |

Mật khẩu chung cho dữ liệu giả lập: `ClinicDemo!2026`.

Patient tìm bác sĩ/chuyên khoa, xem ca và giờ khả dụng, đặt hoặc hủy lịch của mình, cập nhật hồ sơ và xem kết quả khám/đơn thuốc. Doctor quản lý ca, xem lịch được phân công, tạo lịch tái khám, bắt đầu/kết thúc phiên khám, bổ sung bệnh sử và kê đơn. Admin quản lý tài khoản, hồ sơ, danh mục và lịch hẹn; quyền đọc hồ sơ lâm sàng được giới hạn cho Patient/Doctor theo phạm vi sở hữu.

Xem [hướng dẫn chạy](docs/setup.md), [module và entity](docs/modules.md), [khóa EER Phase 1–2](docs/eer_baseline_audit.md), [cây thư mục](00_Project_Governance/FOLDER_STRUCTURE.md), [bằng chứng kiểm thử](docs/verification/RESULTS.md) và [ghi chú báo cáo](docs/report_changes.md).

Thành viên khác chủ repository `N24DECE081` không được ghi trực tiếp lên `main`; thay đổi vào `main` qua Pull Request. Mọi thành viên được sửa code, thao tác trên nhánh khác, review, approve và merge PR, kể cả PR của mình, mà không cần xin phép trước. Chủ repository được thao tác trực tiếp lên `main`. Xem [quy tắc nhánh/PR](00_Project_Governance/BRANCH_AND_PULL_REQUEST_RULES.md) và `CONTRIBUTING.md` ở root repository.

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

Bản nội dung Phase 2 chính thức được theo dõi tại `01_Reference_and_Baseline/Phase2_DB_Project_RP2_BASELINE_READ_ONLY.docx`; verifier khóa SHA-256 để ngăn chỉnh sửa ngoài ý muốn.
