# Ma trận truy vết yêu cầu

| Nguồn | Yêu cầu | Nơi quản lý/thực hiện | Bằng chứng |
|---|---|---|---|
| Phase 1–2 baseline | 13 relations, keys, subtype total/disjoint, BR/IC | `01_Reference_and_Baseline/`, `database/migrations/`, `requirements/` | schema manifest, tests |
| Milestone Phase 3 | DDL, mock DML | `database/migrations/`, `database/seeds/` | rebuild + synthetic seed |
| Milestone Phase 3 | 10+ queries có JOIN/subquery/aggregation | `database/queries/` | query outputs/expected results |
| Milestone Phase 3 | 2 triggers/views | `database/triggers/`, `database/views/` | object scripts + tests |
| Documentation standards | ISO/IEC/IEEE 29148 requirements | `00.../requirements`, report | user/system/NFR/BR sections |
| Documentation standards | IE Crow’s Foot/UML; mapping appendix nếu EER | `05.../diagrams/physical_mapping` | diagram khớp schema |
| Documentation standards | ISO/IEC 11179 data dictionary mọi relation | `05.../data_dictionary` | logical + physical mapping |
| Documentation standards | SQL style | `database/` scripts | SQL review checklist |
| Report template | Các mục báo cáo 1–5 | `05.../report` | template review |
| Milestone Phase 4 | Python/Flask kết nối DB | `backend/` | end-to-end smoke evidence |
| Evaluation | Data modeling/normalization/optimization | report, diagrams, DDL, performance | BR trace, proof, EXPLAIN |
| Evaluation | SQL rigor/integrity/security | DDL/triggers/tests/security | negative/positive cases |
| Evaluation | App talks to DB | blueprints/services/repositories | live/demo flow |
| Evaluation | SQL defense, peer evaluation | `06...` | individual prep/contribution log |
| Project Topics | Team of 3, weekly reporting | `WORK_ASSIGNMENT`, `WEEKLY_PROGRESS_LOG` | commits/weekly updates |

Tests chưa chạy phải ghi `Not run`; ma trận này truy vết yêu cầu, không tuyên bố hoàn thành.

## Truy vết implementation ngày 2026-10-05

Đường dẫn tính từ project root. Các test listed đã chạy trong bộ 34 pytest, xem docs/verification/pytest.xml; tài liệu cuối/slides/peer evaluation chưa nghiệm thu.

| Entity/role | Module | Implementation và evidence |
|---|---|---|
| USER_ACCOUNT | auth | Login/hash/session/CSRF/locked account/injection/role tests: tests/integration/auth/test_security.py |
| PATIENT | patients | Profile own/admin, forged identity bị bỏ qua: tests/integration/patients/test_profiles.py |
| DOCTOR, GP, SPECIALIST, SPECIALTY | doctors | Account/profile/subtype atomic; disjoint/orphan/use checks: tests/integration/doctors/test_subtypes.py; DOT/SVG D/T |
| DOCTOR_SCHEDULE | schedules | Ca riêng, overlap/time/reference immutability: tests/integration/schedules/test_constraints.py |
| APPOINTMENT | appointments | Scope, booking/follow-up, cancellation/reschedule, concurrent overlap: tests/integration/appointments/test_booking.py |
| CONSULTATION_SESSION | consultations | EndTime NULL → finish/Completed, modality và unique appointment: tests/integration/consultations/test_clinical.py |
| MEDICAL_HISTORY | medical_history | Completed gate, ownership, append-only: tests/integration/consultations/test_clinical.py |
| PRESCRIPTION, PRESCRIPTION_ITEM | prescriptions | ≥1 item qua service transaction, rollback nếu item sau lỗi; scoped reads: cùng clinical test |
| MEDICATION | medications | Admin catalog; FK medication và usage queries Q08–Q09 |
| ADMIN | admin | Account/profile atomic, status, catalog/reschedule; không có ADMIN entity |
| 13 relations/77 fields | Tất cả | scripts/verify_structure.py so dictionary nguồn; scripts/verify_database.py so live schema với override |
| Phase 3 SQL | database | 23 triggers/4 procedures, 3 views, 16 FK, Q01–Q12 chạy; database.json |
| Phase 4 UI | backend | 6 screenshots browser: login, patient desktop/mobile, doctor, admin, DOCTOR diagram |

Test paths trong bảng có prefix `backend/`. Mapping column/type/default/constraints: docs/module_manifest.json. Không tuyên bố mỗi module đều có một test file riêng; clinical end-to-end bao phủ nhiều module.

Total subtype tại commit và ≥1 prescription item tại commit được service bảo đảm; direct DBA writes có thể tạo trạng thái trung gian sai, audit phát hiện. App role không có DELETE/DDL/GRANT; docs/verification/database.json ghi active role và DELETE bị từ chối. Giới hạn/evidence đầy đủ: docs/verification/RESULTS.md.
