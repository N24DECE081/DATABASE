# Khả năng hệ thống / yêu cầu chức năng

Dùng các mã FR để liên kết giữa báo cáo, endpoint, DDL, query và test. Mô tả dưới đây triển khai scope baseline, không sửa mô hình.

| ID | Khả năng hệ thống | Vai trò | Liên kết baseline cần tra | Bằng chứng |
|---|---|---|---|---|
| FR-01 | Xác thực tài khoản và role | All | BR1–5 | Auth + role tests |
| FR-02 | Đọc/cập nhật patient profile theo quyền | Patient/Admin | BR6–12 | Route/repository tests |
| FR-03 | Tra cứu doctor, subtype, specialty | All | BR13–20 | Query/UI |
| FR-04 | Quản lý doctor schedules | Admin/Doctor | BR21–25 | DDL/trigger/UI tests |
| FR-05 | Đặt/quản lý appointment, modality/status/follow-up | Patient/Admin/Doctor | BR26–36 | SQL/service tests |
| FR-06 | Tạo consultation chỉ từ appointment hợp lệ | Doctor | BR37–41 | FK/unique/workflow tests |
| FR-07 | Ghi và xem medical history | Doctor/Patient | BR42–45, BR53, BR55 | Workflow/ownership tests |
| FR-08 | Kê đơn và xem prescription/items | Doctor/Patient | BR46–50, BR54–55 | Workflow/ownership tests |
| FR-09 | Bảo vệ lịch/role/clinical integrity | All | BR51–57, IC1–IC11 | Constraint/negative tests |

Xác minh số/mô tả BR/IC với tài liệu gốc trước khi nộp báo cáo; bảng này không thay thế baseline.
