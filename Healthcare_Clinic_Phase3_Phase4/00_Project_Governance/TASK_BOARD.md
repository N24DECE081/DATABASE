# Task board triển khai

Trạng thái dùng một trong: `Not started`, `In progress`, `In review`, `Blocked`, `Done`, `Not run`. Chỉ chuyển `Done` sau khi reviewer chạy hoặc kiểm tra artefact.

| ID | Công việc rõ ràng | Owner | Reviewer | Đầu ra | Trạng thái |
|---|---|---|---|---|---|
| DB-01 | Tạo schema manifest: 13 relations, columns, keys, BR/IC mapping | Tiến | Mai | `docs/module_manifest.json`, `requirements/BUSINESS_RULES_TRACE.md` | In review |
| DB-02 | Chốt MySQL version, schema name, charset/collation, run order | Tiến | Mai | `04_DataGrip_and_Database_Operations/` | In review |
| DB-03 | Viết DDL core + clinical schema | Tiến | Mai | `database/migrations/` | In review |
| DB-04 | Viết constraints/indexes theo baseline | Tiến | Mai | `database/constraints/`, `database/indexes/` | In review |
| DB-05 | Viết seed account/profile/base reference data | Tiến | Tuyền | `scripts/seed_demo.py`, `database/seeds/README.md` | In review |
| DB-06 | Viết seed schedule/appointment/session/history/prescription | Mai | Tiến | `scripts/seed_demo.py`, `database/seeds/README.md` | In review |
| DB-07 | Trigger schedule ownership/time/overlap | Mai | Tiến | `database/triggers/schedules/`, `appointments/` | In review |
| DB-08 | Trigger clinical completed/modality workflow | Mai | Tiến | `database/triggers/consultations/`, `medical_history/`, `prescriptions/` | In review |
| DB-09 | Views operational + clinical | Mai | Tuyền | `database/views/` | In review |
| DB-10 | Q01–Q04 | Tiến | Mai | `database/queries/appointments/` | In review |
| DB-11 | Q05–Q08 | Mai | Tiến | `database/queries/appointments/`, `medical_history/`, `prescriptions/` | In review |
| DB-12 | Q09–Q12 | Tuyền | Mai | `database/queries/appointments/`, `prescriptions/`, `consultations/` | In review |
| DB-13 | SQL test matrix, positive/negative tests, EXPLAIN | Mai | Tiến, Tuyền | `backend/tests/integration/`, `database/tests/README.md`, `docs/verification/` | In review |
| SEC-01 | DB roles, GRANT/REVOKE, authorization matrix | Tuyền | Tiến | `database/security/` | In review |
| APP-01 | Flask app factory/config/.env.example | Tuyền | Tiến | `backend/app/__init__.py`, `backend/config/` | In review |
| APP-02 | Auth/session/CSRF/error handling | Tuyền | Mai | `backend/app/blueprints/auth/`, `forms/`, `errors/` | In review |
| APP-03 | Repository foundation: account/patient/doctor | Tiến | Tuyền | `backend/app/repositories/` | In review |
| APP-04 | Appointment/schedule/consultation transaction services | Mai | Tuyền | `backend/app/services/` | In review |
| APP-05 | Role pages/routes/templates and ownership checks | Tuyền | Mai | `backend/app/blueprints/`, `templates/` | In review |
| APP-06 | Unit/integration/smoke test and demo run | Tuyền | Cả nhóm | `backend/tests/`, `docs/verification/`; rehearsal còn lại | In review |
| DOC-01 | Dictionary + physical diagram mapping | Tiến | Mai | `05.../data_dictionary`, `diagrams` | In progress |
| DOC-02 | Report section 1 and 5, evidence index | Tuyền | Tiến | `05.../report/working_draft` | Not started |
| DOC-03 | Report section 2–4 and evidence | Tiến/Mai | Tuyền | `05.../report/working_draft` | Not started |
| REL-01 | Release candidate, reviewer checklist, slides/defense | Tuyền | Tiến, Mai | `07.../release_candidate`, `06.../` | Not started |

Ghi đường dẫn file/commit và ngày cập nhật trong `WEEKLY_PROGRESS_LOG.md`; task board chỉ phản ánh trạng thái hiện thời.

## Task cấu trúc bổ sung ngày 2026-10-05

| ID | Công việc | Owner | Reviewer | Đầu ra | Trạng thái |
|---|---|---|---|---|---|
| STRUCT-01 | Thống nhất cây và chia module theo entity | Cập nhật workspace | Nhóm | FOLDER_STRUCTURE, docs/modules/manifest, backend packages | In review |
| STRUCT-02 | Đối chiếu 13 entity/77 field với Phase 2 | Cập nhật workspace | Tiến/Mai | verify_structure.py, STRUCTURE_AUDIT | In review |
| BASELINE-01 | Chốt EndTime nullable EER vs NOT NULL Phase 2 | Tiến | Nhóm/người dùng | DECISION_LOG, manifest; DDL/validation đã áp dụng | Done |

DB/APP/SEC có implementation và evidence thật, chuyển In review để owner/reviewer nghiệm thu; không gán đóng góp workspace cho từng sinh viên. BASELINE-01 Done vì người dùng đã chốt. DOC-01 có manifest dictionary và sơ đồ DOCTOR, chưa có toàn bộ bản báo cáo theo template. DOC-02/03 và REL-01 vẫn Not started cho giao phẩm cuối. Evidence: docs/verification/RESULTS.md.
