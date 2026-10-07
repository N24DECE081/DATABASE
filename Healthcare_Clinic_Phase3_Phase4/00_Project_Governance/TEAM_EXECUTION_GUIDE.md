# Hướng dẫn thực thi theo vai trò

Tài liệu này là điểm bắt đầu cho từng thành viên. Làm theo thứ tự phụ thuộc bên dưới; không sửa trực tiếp tài liệu trong `01_Reference_and_Baseline`.

## La Vĩnh Tiến — Data model & persistence

1. Hoàn tất `requirements/BUSINESS_RULES_TRACE.md`: đối chiếu 13 quan hệ, thuộc tính, PK/FK, domain, BR/IC với Phase 1–2.
2. Viết các script DDL trong `database/migrations/ (constraints/indexes riêng tại database/)` theo thứ tự thực thi: schema → constraints → indexes. Mỗi script phải chạy được lại từ database rỗng.
3. Lập dictionary logic và dictionary physical MySQL trong `05_Documentation_and_Report/data_dictionary/`; mọi tên vật lý phải ánh xạ về tên logic baseline.
4. Tạo connection/config foundation và repository cho account, patient, doctor trong `backend/app/repositories/`.
5. Viết Q01–Q04 và SQL test schema/constraint. Reviewer: Mai.

**Bàn giao khi:** DDL build sạch; dictionary khớp `SHOW CREATE TABLE`; app kết nối database qua parameterized queries; Q01–Q04 có expected output.

## Nguyễn Dương Thanh Mai — Integrity & clinical workflows

1. Hoàn thiện synthetic seed/reset trong `database/seeds/` và `database/reset/`, dựa trên DDL đã được Tiến chốt.
2. Viết trigger/view/index vào đúng nhóm trong `triggers/`, `views/`, `performance/`; bao phủ lịch, appointment, completed clinical workflow và telemedicine.
3. Viết Q05–Q08, test workflow/negative test và `EXPLAIN` evidence.
4. Cài đặt transaction service/repository cho schedule, appointment, consultation, history, prescription và prescription items trong Flask.
5. Viết phần report về implementation/performance. Reviewer: Tiến.

**Bàn giao khi:** seed chạy lặp; các test sai bị DB từ chối; trigger/view hoạt động; Q05–Q08 chạy trên seed; service rollback được khi một bước lỗi.

## Nguyễn Thanh Tuyền — Application, security & release

1. Dựng Flask app factory, config, blueprints, forms, templates, static assets trong `backend/app/`.
2. Xây authentication, CSRF, role/ownership authorization và error handling. Patient không thể xem dữ liệu patient khác; doctor chỉ thao tác scope được giao.
3. Phối hợp tạo DB role/GRANT/REVOKE trong `database/security/`; Flask không dùng MySQL root.
4. Viết Q09–Q12, tích hợp smoke tests, demo script, report sections 1/5, slides và release package.
5. Review các luồng app của Mai/Tiến. Reviewer: Mai cho workflow, Tiến cho DB permissions/config.

**Bàn giao khi:** app start từ hướng dẫn sạch; UI gọi MySQL thật; có happy path và negative path; Q09–Q12 có expected output; report/release checklist đầy đủ.

## Quy tắc handoff

- Không push hoặc merge trực tiếp vào `main`. Mọi thay đổi đi qua nhánh riêng và Pull Request theo `BRANCH_AND_PULL_REQUEST_RULES.md`.
- Reviewer chuyên môn kiểm tra phần được phân công; chỉ chủ repository `N24DECE081` được approve cuối và merge Pull Request.
- Owner gửi commit/artefact và cách chạy cho reviewer; reviewer chạy lại trước khi đánh dấu `Done`.
- Dùng `WEEKLY_PROGRESS_LOG.md` để ghi owner, reviewer, link artefact, trạng thái `Done`, `In review`, `Blocked` hoặc `Not run`.
- Nếu DDL thay đổi, Tiến thông báo cả nhóm trước khi Mai cập nhật seed/trigger và Tuyền cập nhật repository/form.
- Nếu route/UI thay đổi, Tuyền nêu rõ BR/IC liên quan; database là lớp quyết định cuối cho integrity.
