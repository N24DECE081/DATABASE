# Phân công chuyên môn và phối hợp ba thành viên

## Nguyên tắc

Phân công theo module và đầu ra kiểm tra được. Mỗi người có phần SQL/database, phần Flask/integration hoặc security, một phần báo cáo, một tập truy vấn và một nhiệm vụ kiểm thử/review. Owner chịu trách nhiệm hoàn thiện; reviewer kiểm tra độc lập. Nhóm có thể đổi owner theo năng lực/thời gian nhưng ghi lại thay đổi trong decision log và weekly log.

Phân công owner/reviewer dùng để phối hợp, không giới hạn quyền sửa code hoặc đóng góp. Mọi thành viên được review, approve và merge Pull Request, kể cả PR của mình; không cần approval riêng của `N24DECE081`. Thành viên khác chủ repository không được ghi trực tiếp lên `main`, theo `BRANCH_AND_PULL_REQUEST_RULES.md`.

## Phạm vi sở hữu theo thành viên

| Thành viên | Gói việc sở hữu | Giao phẩm | Reviewer chính |
|---|---|---|---|
| **La Vĩnh Tiến — Data model & persistence** | Khóa baseline/schema manifest; DDL và logical→physical mapping; dictionary; MySQL/DataGrip setup; DB connection/repositories cho account, patient, doctor; truy vấn Q01–Q04; báo cáo phần database design | DDL 13 quan hệ; schema/keys checklist; tên mapping; dictionary khớp DDL; config/repository parameterized; Q01–Q04 có expected output; phần 2–3 report | Mai rà DDL/rules/query; Tuyền rà config/privacy/report consistency |
| **Nguyễn Dương Thanh Mai — Integrity & clinical workflows** | Triggers/views/index; DML synthetic clinical/scheduling seed; rule/transaction tests; services/repositories cho schedule, appointment, consultation, prescription; queries Q05–Q08; phần SQL implementation/performance report | ≥2 trigger/view (mục tiêu 2 trigger + 3 view); seed workflows; negative/positive tests; services giao dịch; Q05–Q08; index rationale/EXPLAIN; phần 4 report | Tiến rà schema/transaction; Tuyền rà use case và lỗi hiển thị |
| **Nguyễn Thanh Tuyền — Application, security & integration delivery** | Flask app factory/blueprints/forms/templates/static; authentication, authorization/ownership; DB role GRANT/REVOKE phối hợp Tiến; queries Q09–Q12 analytics/audit; end-to-end smoke tests; SRS/RBAC report sections, report merge, demo/slides/release | UI/auth/role checks; app permission script; Q09–Q12; integration test evidence; phần 1/5 report; demo guide/slides; release checklist | Tiến rà DB privilege/config; Mai rà workflow/query/tests |

Seed account/base records do Tiến chuẩn bị theo DDL; Mai bổ sung schedule/appointment/session/clinical seed; Tuyền bổ sung role/authorization cases và audit expectations. Các script vẫn được review chung để đảm bảo seed có thể chạy theo một run order.

## Chia truy vấn ≥10 có kiểm soát

Dùng bộ 12 query mục tiêu trong master plan; mã hóa file `q01_...sql` đến `q12_...sql` và đặt theo nhóm nghiệp vụ trong `database/queries/`.

- **Tiến — Q01–Q04:** appointment multi-join; count/group by; patient HAVING; NOT EXISTS cho doctor rảnh.
- **Mai — Q05–Q08:** schedule/appointment availability audit; recursive follow-up join; patient history join chain; prescription-medication join.
- **Tuyền — Q09–Q12:** medication aggregate theo tháng; workload trên trung bình; status ratio; telemedicine integrity audit.

Mỗi truy vấn phải có mục đích, JOIN/subquery/aggregate được sử dụng, dữ liệu seed tương ứng và kết quả mong đợi; owner viết, reviewer khác kiểm tra logic và chạy cùng bộ seed.

## Phân chia report/test/defense

| Phần | Tác giả chính | Xác minh chéo |
|---|---|---|
| 1. SRS, user/system/NFR, business rules | Tuyền, bám yêu cầu gốc | Tiến |
| 2. EER baseline, logical/physical mapping, normalization | Tiến | Mai |
| 3. Data dictionary | Tiến; Mai xác nhận trigger-specific metadata không làm lệch schema | Tuyền |
| 4.1 DDL/DML, query, trigger/view/index | Mai; Tiến cung cấp schema/mapping; Tuyền security script | Tiến + Tuyền |
| 4.2 Performance cases/EXPLAIN | Mai | Tiến |
| 5. Verification/security/RBAC/integration evidence | Tuyền điều phối; mỗi test owner viết evidence | Tiến + Mai |
| Report merge/template/references | Tuyền điều phối; mỗi owner cập nhật section mình | Cả ba sign-off |
| Demo/slides/peer contribution | Mỗi người chuẩn bị phần sở hữu; Tuyền ráp | Cả ba rehearsal |

## SQL defense cá nhân

- **Tiến:** Option 8A, total/disjoint mapping, candidate keys/normalization, Q01 hoặc Q02.
- **Mai:** trigger scheduling/workflow, transaction/overlap case, Q06 hoặc Q08, EXPLAIN/index.
- **Tuyền:** GRANT/REVOKE, role/ownership boundary, Q10 hoặc Q12, test âm.
- Cả ba luyện một query ngẫu nhiên, giải thích một test constraint bị từ chối và lần theo luồng UI → Flask → MySQL.

## RACI nhẹ

R = thực hiện; A = chịu trách nhiệm chốt; C = review/đóng góp; I = được cập nhật.

| Deliverable | Mai | Tiến | Tuyền |
|---|---:|---:|---:|
| Baseline freeze/schema manifest | C | A/R | C |
| DDL/name mapping/dictionary | C | A/R | C |
| Seed cơ sở/schema data | C | A/R | C |
| Workflow seed/triggers/views/index | A/R | C | C |
| Q01–Q04 / Q05–Q08 / Q09–Q12 | R | R | R |
| SQL tests (schema / workflow / security) | A/R | R | R |
| Flask connection/profile repositories | C | A/R | C |
| Appointment/clinical services | A/R | C | C |
| Flask auth/UI/ownership + DB role | C | C | A/R |
| E2E integration/demo/release | C | C | A/R |
| Final report sections/submission | R | R | A (coordination) |
| SQL defense and peer evidence | R | R | R |

## Cổng phối hợp

1. **Tuần 9 đầu — baseline/schema:** Tiến giao manifest, mapping, DDL draft; Mai rà rules; Tuyền khởi tạo Flask/config/auth skeleton.
2. **Tuần 9 cuối — seed/integration:** Tiến chạy clean build và repository connection; Mai thêm workflow seed/rules; Tuyền kết nối app tới MySQL.
3. **Tuần 10 đầu — SQL gate:** mỗi người hoàn thành query batch; Mai ráp trigger/view/index; Tiến/Tuyền review và chạy cùng dataset.
4. **Tuần 10 cuối — verification:** chạy ma trận test, RBAC và EXPLAIN; owner lưu evidence thật, reviewer xác nhận.
5. **Tuần 11 — app gate:** ghép services, routes/templates/auth; ba người chạy happy path và negative cases.
6. **Tuần 12 — release gate:** hoàn tất section report/evidence; mỗi người review artefact chéo; cả nhóm rehearsal/SQL defense; Tuyền đóng gói sau sign-off.

## Theo dõi công bằng

Đầu tuần ghi task nhỏ, owner, reviewer và deadline; cuối tuần liên kết commit/artefact trong weekly log. Chia nhỏ commit, review chéo. Đánh giá đóng góp theo độ khó, thời gian, chất lượng và defense, không chỉ số file. Chuyển task khi workload lệch/blocker kéo dài và ghi owner mới trung thực.

## Phân công module hiện hành từ 2026-10-05

Python tại backend/, SQL tại database/; 02/03 chỉ chứa hợp đồng. Bảng cụ thể hóa phạm vi ba thành viên ở trên; đường dẫn chi tiết tại docs/modules.md và module_manifest.json.

| Module | Entity sở hữu | Owner entity/persistence/nghiệp vụ | Reviewer |
|---|---|---|---|
| `auth` | `USER_ACCOUNT` | Tuyền | Tiến |
| `patients` | `PATIENT` | Tiến | Tuyền |
| `doctors` | `DOCTOR`, `GENERAL_PRACTITIONER`, `SPECIALIST`, `SPECIALTY` | Tiến | Mai |
| `schedules` | `DOCTOR_SCHEDULE` | Mai | Tiến |
| `appointments` | `APPOINTMENT` | Mai | Tiến |
| `consultations` | `CONSULTATION_SESSION` | Mai | Tiến |
| `medical_history` | `MEDICAL_HISTORY` | Mai | Tiến |
| `prescriptions` | `PRESCRIPTION`, `PRESCRIPTION_ITEM` | Mai | Tiến |
| `medications` | `MEDICATION` | Tiến | Mai |
| `admin` | Dùng entity hiện có, không tạo bảng ADMIN | Tuyền | Tiến |

Tuyền phụ trách routes/forms/templates/static/auth/authorization và tích hợp xuyên 10 module. Tiến phụ trách entity/schema/dictionary và persistence account/patient/doctor/subtype/specialty/medication. Mai phụ trách repository/service schedules/appointments/consultations/history/prescriptions/items, temporal/workflow rules và transaction rollback.

Code đã triển khai trong workspace theo yêu cầu người dùng, BASELINE-01 đã chốt. Tiến review DDL/manifest/persistence và đưa dictionary vào report; Mai review locks/triggers/clinical transactions, negative tests và EXPLAIN; Tuyền review auth/CSRF/ownership/UI, chạy lại demo và ráp evidence vào report. Không gán công việc tự động này thành đóng góp cá nhân nếu thành viên chưa thực hiện review/thay đổi.

Q01–Q12 giữ owner cũ; nơi lưu: appointments Q01–Q06/Q10–Q11, medical_history Q07, prescriptions Q08–Q09, consultations Q12. Không tạo bản thứ hai trong nhóm analytics cũ. Đã có ứng dụng/MySQL/test evidence thật; task DB/APP/SEC đang In review, reviewer nghiệm thu tại docs/verification/RESULTS.md. Báo cáo cuối, slides và defense do ba thành viên tiếp tục hoàn tất.
