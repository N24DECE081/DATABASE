# Kiểm chứng SQL và integrity trên MySQL thật

Nguồn kiểm thử chạy được tại `backend/tests/integration/`, gồm direct SQL negative cases và service/HTTP flows. Fixture `backend/tests/conftest.py` tạo schema/user tạm riêng cho từng test, cài cùng SQL bằng `scripts/sql_runner.py`, seed và cleanup đúng tài nguyên vừa tạo. Không có bản SQL test thứ hai trong module folders.

| Rule/phạm vi | File thực thi | Input sai/expected |
|---|---|---|
| Assignment/FK/time/overlap/follow-up | appointments/test_booking.py | Sai doctor, ngoài ca, trùng giờ hoặc parent không hợp lệ bị từ chối; DB giữ dữ liệu cũ |
| Booking đồng thời | appointments/test_booking.py | Hai connection đặt cùng giờ: chỉ một thành công, kể cả snapshot đã mở trước |
| Schedule/reference/DOB/domain | schedules/test_constraints.py | Ca chồng, sửa ca đã có hẹn, DOB tương lai, duration ngoài domain bị chặn |
| Subtype/role/profile | doctors/test_subtypes.py | Doctor hai subtype hoặc doctor thiếu subtype được sử dụng bị chặn; tạo profile lỗi rollback |
| Session/Completed/history | consultations/test_clinical.py | Sai modality/duplicate session/history trước Completed/history DELETE bị chặn |
| Prescription transaction | consultations/test_clinical.py | Item thứ hai có FK sai: header và item đầu đều rollback |
| RBAC/CSRF/ownership | auth/test_security.py | Đọc sai scope, tài khoản Locked, SQL injection, thiếu CSRF và app DELETE bị từ chối |
| Patient identity | patients/test_profiles.py | Payload giả patient_id/user_id không đổi identity; Admin update hợp lệ thành công |

Đường dẫn test có prefix `backend/tests/integration/`. Các expected outcomes được assert trong test, observed pass/fail ở [JUnit](../../docs/verification/pytest.xml); [RESULTS](../../docs/verification/RESULTS.md). Tests là bằng chứng cho case đã chạy, không tuyên bố bao phủ mọi trạng thái trực tiếp của DBA.
