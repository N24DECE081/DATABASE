# Work Breakdown Structure & RACI

Các gói dưới đây là checklist phân rã; owner/reviewer chi tiết tại `WORK_ASSIGNMENT.md`. Mỗi đầu ra chỉ được đánh `Done` khi artefact tồn tại, chạy/đọc được và reviewer đã kiểm tra.

| ID | Gói công việc | Owner | Reviewer | Phụ thuộc | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|
| G0 | Freeze baseline, inventory 13 quan hệ, BR/IC trace | Tiến | Mai, Tuyền | — | Khớp Phase 1/2; file nguồn nguyên vẹn |
| G1 | Chốt MySQL/runtime config, name mapping, run order | Tiến | Mai | G0 | Fresh setup tái lập được, không lộ secrets |
| P3.1 | DDL schema/FK/unique/domain và rebuild | Tiến | Mai | G0–G1 | Tạo DB rỗng thành công; schema đối chiếu baseline |
| P3.2 | Synthetic seed/reset covering states & subtypes | Mai | Tiến | P3.1 | Tải lại lặp được; không có dữ liệu thật |
| P3.3 | Triggers/views và scheduling/clinical rules | Mai | Tiến | P3.1–P3.2 | Pass/fail evidence; không tuyên bố chưa chứng minh |
| P3.4 | Bộ 12 complex queries chia Q01–Q04/Q05–Q08/Q09–Q12 | Cả ba theo batch | Review chéo | P3.2 | ≥10 query chạy; JOIN/subquery/aggregation hiện diện |
| P3.5 | SQL security roles, GRANT/REVOKE | Tuyền | Tiến | P3.1 | App không dùng root; permission cases được kiểm |
| P3.6 | SQL tests, EXPLAIN, index review | Mai | Tiến, Tuyền | P3.2–P3.5 | Case âm/dương; evidence và query plan thật |
| P4.1 | Flask app factory, config, auth, templates shell | Tuyền | Tiến | G1 | App chạy local; secret qua env; auth/CSRF |
| P4.2 | DB connector/repository foundation & profile read | Tiến | Tuyền | P3.1, P4.1 | Flask truy vấn MySQL qua parameterized SQL |
| P4.3 | Appointment/schedule/consultation workflows | Mai | Tuyền | P3.3, P4.2 | Transaction/rollback; validation lỗi từ DB rõ |
| P4.4 | Role-specific routes/UI and ownership boundaries | Tuyền | Mai | P4.1–P4.3 | Patient/doctor/admin đúng quyền baseline |
| P4.5 | Unit/integration/smoke tests and demo flow | Tuyền | Cả nhóm | P4.2–P4.4 | Happy + negative flow chạy lặp được |
| DOC.1 | Final report, dictionary, diagrams, evidence | Mỗi owner section; Tuyền điều phối | Cả nhóm | P3/P4 | Theo template; khớp implementation thật |
| DEF.1 | Slides, rehearsal, individual SQL defense | Cả nhóm | Cả nhóm | DOC.1 | Mỗi thành viên trình bày và giải thích truy vấn |
| REL.1 | Candidate review và final submission package | Tuyền | Mai, Tiến | Tất cả | Checklist ký; chỉ artefact cần nộp |

## Trạng thái

Task board sống nên theo dõi trong `WEEKLY_PROGRESS_LOG.md` hoặc công cụ nhóm. Không đánh dấu task hoàn tất chỉ vì thư mục/file placeholder đã được tạo.

## Mapping module hiện hành

Từ 2026-10-05, Python/tests tại backend/, SQL tại database/. Owner theo 10 module/13 entity tại WORK_ASSIGNMENT.md và docs/modules.md. G0/P3.1 cần chốt BASELINE-01 EndTime. Scaffold không đóng các gate P3/P4.
