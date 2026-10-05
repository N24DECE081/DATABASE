# Healthcare Clinic & Telemedicine Portal — Phase 3 & 4 Work Plan

## Mục tiêu và thứ tự ưu tiên

Kế hoạch triển khai cho đồ án #5 Healthcare Clinic & Telemedicine Portal dựa trên báo cáo Phase 1 và `01_Reference_and_Baseline/Phase2_DB_Project_RP2_BASELINE_READ_ONLY.docx`. Bốn tài liệu giảng viên quy định milestone, đánh giá, chuẩn tài liệu và mẫu báo cáo. Đây là kế hoạch triển khai/kiểm chứng, không phải thiết kế lại.

1. Phase 1/2 đã nộp là nguồn chuẩn của mô hình, schema, business rules.
2. Tài liệu giảng viên là nguồn chuẩn về đầu ra, quy trình, chuẩn viết và chấm điểm.
3. Nếu thấy mâu thuẫn, ghi vào `DECISION_LOG.md` và xin quyết định phù hợp; không tự đổi thiết kế đã chốt.

## Baseline thiết kế bất biến

Giữ đầy đủ các quan hệ: `USER_ACCOUNT`, `PATIENT`, `SPECIALTY`, `DOCTOR`, `GENERAL_PRACTITIONER`, `SPECIALIST`, `DOCTOR_SCHEDULE`, `APPOINTMENT`, `CONSULTATION_SESSION`, `MEDICAL_HISTORY`, `MEDICATION`, `PRESCRIPTION`, `PRESCRIPTION_ITEM` — tổng cộng **13**, dù overview RP2 có câu ghi “12 tables”. Danh sách schema và 13 mục từ điển dữ liệu là nguồn đếm chuẩn; ghi nhận “12” là lỗi đếm văn bản để tránh bỏ bảng.

- Giữ `DOCTOR` là supertype, GP và SPECIALIST là subtype **total, disjoint**, mapping joined tables/Option 8A.
- Mỗi specialist thuộc đúng một specialty; giữ nguyên việc GP không tham chiếu specialty trong schema.
- Không thêm/xóa bảng, cột, role, quan hệ, nghiệp vụ, cardinality; không sửa PK/FK, UNIQUE, NULLability, domain, DEFAULT và quy tắc lịch sử ngoài quyết định BASELINE-01: người dùng đã cho phép CONSULTATION_SESSION.EndTime NULL/default NULL ngày 2026-10-05. Metadata và baseline nguồn vẫn giữ nguyên.
- Có thể thêm constraint, index, view, trigger nhằm thi hành quy tắc đã có, miễn không đổi schema/ngữ nghĩa. Constraint nhiều dòng/đa bảng cần kiểm chứng thực tế trên MySQL.
- SQL style yêu cầu tên vật lý lowercase snake_case trong khi báo cáo dùng tên logic uppercase. Lập mapping nhất quán tới baseline, không biến việc đặt tên vật lý thành thay đổi mô hình.
- Baseline nguồn/bản sao mang nhãn `BASELINE_READ_ONLY`; không ghi đè. Mọi thay đổi tài liệu phải là artefact mới có truy vết.

## Yêu cầu của giảng viên

**Phase 3 (Weeks 9–10, 30%)**: DDL, mock DML, tối thiểu 10 truy vấn phức tạp (joins, subqueries, aggregations), 2 triggers/views; ràng buộc/index/trigger chạy đúng; SQL readable theo SQLStyle.guide hoặc Google SQL Style Guide. Báo cáo phải có test cases constraint chặn dữ liệu sai và RBAC GRANT/REVOKE.

**Phase 4 (Weeks 11–12, 30%)**: tích hợp UI/backend đơn giản với MySQL bằng Python/Flask, Node.js hoặc Java; chọn Python/Flask theo yêu cầu đồ án. Live presentation và peer evaluation. Phần điểm nhóm gồm modeling 25%, normalization/optimization 15%, SQL rigor 20%, functionality 10%; cá nhân SQL defense 15%, peer evaluation 15%. Phân công và đóng góp phải rõ cho cả ba thành viên.

**Chuẩn tài liệu**: SRS theo ISO/IEC/IEEE 29148 tách user requirements/system capabilities, business rules, NFR; mô hình ISO/IEC 19505 UML hoặc IE Crow’s Foot (nếu giữ Elmasri EER phải có mapping appendix); data dictionary theo ISO/IEC 11179 cho mọi bảng; lowercase snake_case identifier, uppercase SQL keyword; báo cáo theo đúng template; báo cáo tiến độ hàng tuần.

## Phase 3 — MySQL implementation (Weeks 9–10)

### A. Baseline và môi trường

1. Lập schema manifest cho đủ 13 quan hệ, thuộc tính, khóa, null/default/domain, BR/IC; đối chiếu báo cáo RP2 và Phase 1.
2. Chốt/ghi phiên bản MySQL, InnoDB, `utf8mb4`, collation, timezone, SQL mode; DataGrip profile local.
3. Ghi quy ước ánh xạ tên logic→tên vật lý và cách biểu diễn ID/time. Không đưa password/secrets vào Git.

**Đầu ra:** manifest/traceability matrix, setup note, connection instructions.

### B. DDL theo thứ tự FK

Tạo DDL theo dependency: user_account, patient, specialty, doctor, GP/specialist, doctor_schedule, appointment, consultation_session, medical_history, medication, prescription, prescription_item. Cung cấp script khởi tạo từ database rỗng và thứ tự chạy rõ; dùng FK, PK, UNIQUE, CHECK/NOT NULL/DEFAULT phù hợp MySQL phiên bản đã chốt.

Bảo đảm và kiểm chứng: uniqueness/profile linkage; domain role/status/gender/blood type/modality; duration; end sau start; subtype PK cũng là FK; session appointment FK unique; recursive follow-up; các FK còn lại.

Các rule vượt khả năng CHECK cần trigger hoặc transaction service được kiểm tra: schedule thuộc đúng doctor và ngày/giờ hẹn nằm trong ca; doctor không có schedule/appointment active overlap (cancelled/no-show được loại khỏi conflict theo BR35–36); MedicalHistory/Prescription chỉ khi appointment Completed; telemedicine/session modality khớp; session chỉ tồn tại cho appointment hợp lệ.

Total/disjoint subtype không được tuyên bố đảm bảo chỉ bằng FK subtype riêng. Thiết kế biện pháp trigger/transaction hoặc kiểm tra trạng thái trước khi doctor được dùng; test trường hợp không subtype và cả hai subtype. Prescription cần ≥1 item cũng là quy tắc nhiều dòng: bảo vệ qua transaction/workflow hoặc cơ chế DB khả thi và nêu rõ phạm vi bảo đảm. Không tuyên bố DB enforce nếu chỉ Flask kiểm tra.

**Đầu ra:** `database/migrations/001_initial_schema.sql`, rebuild guide, tên mapping, checklist DDL.

### C. Mock DML

Seed chỉ dữ liệu giả lập: ADMIN/DOCTOR/PATIENT, cả hai subtype, nhiều specialty/schedule, appointments nhiều status, in-person/telemedicine, follow-up, sessions/history/medications/prescriptions nhiều item. Có data cho case biên: schedule sai ngày/doctor, overlap, cancelled/no-show, appointment chưa Completed, modality không khớp, doctor subtype thiếu/trùng. Có reset/reseed rõ và expected row counts; không dùng PII/bệnh án thật.

**Đầu ra:** seed/reset scripts, data map.

### D. Triggers, views, indexes

Rubric yêu cầu “2 Triggers/Views”. Mục tiêu chắc chắn: **2 triggers và 3 views**, có test cho mỗi trigger. Hai triggers tối thiểu nên bao phủ (1) appointment–schedule ownership/date/time/overlap, (2) workflow completed + modality/time validation; xét cả INSERT và UPDATE. Views gợi ý: appointment với bệnh nhân/bác sĩ/lịch, clinical history chain, prescription với medication items. Indexes dựa trên truy vấn thật (doctor/date/status, patient/date, các FK); tránh trùng PK/unique index và lưu `EXPLAIN`/lý do. Kiểm chứng thứ tự lock/transaction cho xung đột đồng thời; không giả định trigger đơn giản miễn nhiễm race condition.

### E. 10+ truy vấn phức tạp

Viết tối thiểu 10; mục tiêu 12, mỗi query có câu hỏi nghiệp vụ, kỹ thuật SQL và kết quả kỳ vọng:

1. Appointment theo ngày với patient/doctor/specialty/schedule (multi-join).
2. Số appointment theo doctor/status/khoảng ngày (GROUP BY).
3. Patient có số completed visit lớn hơn ngưỡng (HAVING).
4. Doctor không có lịch hẹn active trong khung giờ (NOT EXISTS).
5. Schedule và appointment hiện có để xem slot khả dụng, giải thích giả thiết đúng baseline.
6. Follow-up với appointment gốc qua recursive self join.
7. Diagnosis/history theo bệnh nhân, sắp thời gian (JOIN appointment-session-history).
8. Prescription, medication, dose/frequency/duration (4-table join).
9. Thuốc được kê nhiều nhất theo tháng (aggregate).
10. Doctor workload cao hơn trung bình (subquery/derived aggregation).
11. Status ratio theo doctor (conditional aggregation).
12. Audit query phát hiện telemedicine thiếu meeting URL hoặc modality không khớp.

Không diễn giải slot query thành capacity hay chức năng mới.

### F. Test, security, performance

Test matrix ghi precondition/input/expected/observed/pass-fail/link BR-IC; positive và negative cho keys/domains/FKs/scheduling/subtype/workflow/RBAC. Thử trường hợp đồng thời cho xung đột lịch nếu có thể. Lưu output/screenshot/log; chưa chạy ghi `Not run`. Chạy `EXPLAIN` cho truy vấn đại diện, không bịa benchmark.

RBAC: role DB app least privilege, không dùng root trong Flask; scripts GRANT/REVOKE riêng; phân quyền app theo vai trò và ownership ở backend. Password hash, parameterized SQL, secrets qua `.env` ngoài Git. Thuyết minh bảo vệ dữ liệu ở mức prototype; không đưa thông tin y tế thật.

**Đầu ra Phase 3:** DDL, DML, ≥10 complex query, 2+ tested trigger/view, index rationale/EXPLAIN, test evidence, RBAC, báo cáo phần 2–5.

## Phase 4 — Python/Flask integration (Weeks 11–12)

### Tầng UI

Templates/CSS/JS cho đăng nhập, dashboard role, xem bác sĩ/specialty/schedule, patient book/view own appointment, admin quản lý hẹn, doctor xem assigned appointments và ghi session/history/prescription, patient xem hồ sơ của chính mình. Đây là giao diện use case đã có, không mở rộng nghiệp vụ. Form validation cải thiện UX; DB vẫn là nguồn kiểm soát cuối.

### Tầng Flask/backend

- `routes`: auth, patient, doctor/schedule, appointment, consultation/prescription.
- `services`: use case, role/ownership authorization, transactions.
- `repositories`: parameterized MySQL access, row mapping.
- `templates`, `static`, `config`, `tests`: tách theo trách nhiệm.
- Password hash, session auth, CSRF cho form write, lỗi DB thân thiện, không trả SQL trace.
- Patient chỉ truy cập hồ sơ mình; doctor truy cập phạm vi assignment; admin theo quyền baseline.
- Tạo encounter/history/prescription/items theo transaction, rollback nếu bước sau lỗi. Không thêm bảng hoặc cột để tiện app.

### MySQL, DataGrip, test/demo

Chốt một driver/ORM Python và pin dependency; `.env.example`, `requirements.txt`, DB creation/app user, setup/run/reset guide. DataGrip để chạy DDL/DML/query, kiểm schema và `EXPLAIN`; app phải chạy độc lập IDE. Health check không lộ secrets.

Smoke flow: login → xem doctor/schedule → patient đặt appointment → doctor hoàn tất session → ghi history/prescription → patient xem hồ sơ. Negative demo: hẹn ngoài schedule/overlap, ghi history trước Completed, patient đọc hồ sơ người khác; thông báo rõ và DB không đổi. Seed/reset cho demo lặp, lưu ảnh/video nếu phù hợp.

### Defense và nhóm

Mỗi thành viên chuẩn bị trình bày EER total/disjoint, mapping/normalization, 1 trigger, 1 query complex, index/EXPLAIN và 1 negative test. Slide: scope → design/schema → normalization → DB → live app flow → constraints → teamwork/limitations. Rehearsal, máy MySQL sẵn sàng, backup seed và checklist.

## Phân công ba thành viên

Phân công module, giao phẩm, reviewer, SQL defense và các cổng bàn giao được chuẩn hóa tại `WORK_ASSIGNMENT.md` và `planning/WORK_BREAKDOWN_AND_RACI.md`. Dùng hai tài liệu đó làm nguồn phân công hiện hành để tránh trùng/chênh bảng. Mỗi thành viên sở hữu artefact ở cả database và integration/documentation, review chéo và tham gia SQL defense.

## Báo cáo cuối theo template

1. Introduction & Project Scope: objective, user requirements, functional/system requirements, measurable appropriate NFR, business rules/constraints.
2. Database Design: EER baseline, Crow’s Foot/UML physical mapping, logical schema, normalization proofs. Sơ đồ mới phải đối chiếu chứ không thay design Phase 1–2.
3. Data Dictionary: từng bảng, attribute/type/key/null/default/constraints/meaning, phải khớp DDL.
4. Database Implementation: DDL, DML, views, triggers, indexes, 10+ query, performance cases theo style.
5. Verification & Security: test cases chặn bad insert, GRANT/REVOKE, integration evidence.

Phân biệt rõ yêu cầu giảng viên và quyết định thiết kế nhóm. Chỉ báo cáo test đã thực sự chạy.

## Definition of Done

- [ ] Baseline không bị sửa; đúng 13 quan hệ theo danh sách; mọi tên vật lý có mapping.
- [ ] DDL khởi tạo lại được; keys/domains/constraints khớp baseline.
- [ ] Synthetic seed có hai subtype, roles, statuses/modalities/workflows/edge cases.
- [ ] ≥10 complex SQL queries; mục tiêu 12.
- [ ] ≥2 triggers/views; mục tiêu 2 triggers + 3 views và test từng rule.
- [ ] Test matrix/evidence gồm total/disjoint, multi-row và temporal rules.
- [ ] RBAC least privilege; không secrets/real patient data.
- [ ] Flask nối MySQL thật; demo role-based end-to-end.
- [ ] Setup/reset/run instructions; báo cáo theo template và data dictionary khớp.
- [ ] Ba thành viên có đóng góp và SQL defense; submission package sạch.

## Timeline

| Tuần | Trọng tâm | Gate |
|---|---|---|
| 9 đầu | Freeze baseline, manifest, setup, DDL draft | Đối chiếu đủ bảng/cột/key |
| 9 cuối | DDL, seed, trigger/view | Rebuild sạch và negative tests đầu |
| 10 đầu | Hoàn thành trigger/view/query/index | ≥10 query chạy được |
| 10 cuối | Test, RBAC, EXPLAIN, report Phase 3 | Mỗi người SQL defense rehearsal |
| 11 đầu | Flask config/repository/service/auth | Kết nối MySQL + role smoke test |
| 11 cuối | Use case UI và transactions | Demo end-to-end đầu tiên |
| 12 đầu | Regression, evidence, report, slides | Rubric/consistency review |
| 12 cuối | Rehearsal, peer evaluation, freeze | Mỗi thành viên defense được |

Cây folder: xem `FOLDER_STRUCTURE.md`; chi tiết đối chiếu ở `TRACEABILITY_MATRIX.md`.

## Đường dẫn và module cập nhật 2026-10-05

Executable SQL tại database/, Python/Flask/tests tại backend/ theo FOLDER_STRUCTURE.md. Folder 02/03 chứa hợp đồng/hướng dẫn bàn giao. Mapping owner/entity/path tại docs/modules.md, module_manifest.json và WORK_ASSIGNMENT.md.

10 module/13 entity/77 field đã có implementation Flask/MySQL thật. BASELINE-01 đã chốt và kiểm thử. 34 pytest tests đạt, schema/12 queries/3 EXPLAIN và giao diện desktop/mobile có evidence tại docs/verification/RESULTS.md. DB/APP/SEC chuyển In review; checklist Definition of Done là gate nghiệm thu nhóm, chưa đánh dấu thay reviewer. Báo cáo cuối theo template, dictionary/physical mapping đầy đủ, slides, rehearsal/peer evaluation và submission package còn lại.
