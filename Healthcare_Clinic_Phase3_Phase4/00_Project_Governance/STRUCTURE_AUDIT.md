# Rà soát cấu trúc và thực thi ngày 2026-10-05

Cây đã chia module và triển khai thành ứng dụng Flask/MySQL chạy thật. Các nguồn code được thống nhất và đối chiếu entity với baseline. Toàn bộ đồ án còn cần nghiệm thu nhóm, báo cáo cuối, slides và defense.

| Hạng mục | Kết quả hiện tại |
|---|---|
| Python/SQL | backend/database là nguồn duy nhất; 02/03 là hợp đồng |
| Module/entity | 10 module, 13 dataclass, 77 field; mỗi entity sở hữu một lần |
| Baseline | SHA-256 Phase 2 giữ nguyên; original dictionary so trực tiếp với manifest |
| EndTime | NULL/default NULL theo quyết định người dùng, override có truy vết |
| Live schema | 13 bảng/77 cột/16 FK, 3 views; MySQL 26.7.0 |
| Integrity scripts | 23 triggers/4 procedures; tested temporal/concurrency/clinical/subtype cases |
| Queries/performance | Q01–Q12 chạy; EXPLAIN JSON Q01/Q07/Q08 lưu thật |
| App | Routes/forms/service/repository/UI thật; 3 roles, auth/CSRF/ownership |
| Test | 34 passed; desktop/mobile và diagram có 6 ảnh browser |
| Privileges | App dùng healthcare_app/clinic_application; SELECT/INSERT/UPDATE, DELETE bị từ chối |
| Governance | DB/APP/SEC In review; chưa giả định reviewer đã sign-off |

## Bằng chứng

[RESULTS](../docs/verification/RESULTS.md), [JUnit](../docs/verification/pytest.xml), [live DB/queries/EXPLAIN](../docs/verification/database.json), [UI checks](../docs/verification/ui/results.json). Structural check PASS 10 modules/13 entities/77 fields/80 Python files. Hash baseline Phase 2: c61e01650630cba70f956e42efdf7fbf128e88bc8d7eb38a2c1a0cbf2e50168f.

Live DB verification dùng app privileges nên không đọc được trigger metadata; số 23 triggers/4 procedures đã đối chiếu bằng account setup của MySQL riêng, các negative tests dùng account app. Không coi 0 trigger visible-to-app là thiếu triggers.

## Phạm vi bảo đảm và phần còn lại

Total doctor subtype và prescription ≥1 item được service transaction bảo đảm lúc commit; DB chặn disjoint/orphan operational use/xóa item cuối, audit phát hiện trạng thái sai. DBA chèn trực tiếp supertype/header có thể tạo trạng thái trung gian; không tuyên bố FK tự bảo đảm hai quy tắc nhiều dòng này.

Dataset giả lập, EXPLAIN dùng số dòng nhỏ; chưa benchmark tải production. Browser checks xác nhận render/overflow ở các viewport đã ghi, không thay việc review mọi màn hình. Tiến/Mai/Tuyền review phần sở hữu và hoàn tất report theo template, physical mapping/dictionary xuất bản, rehearsal/SQL defense, peer evaluation và submission package.
