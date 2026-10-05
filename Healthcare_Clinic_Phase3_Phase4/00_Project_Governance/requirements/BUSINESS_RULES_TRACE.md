# Business rule trace guide

Dùng Phase 1/2 làm danh sách đầy đủ BR1–BR57 và IC1–IC11. Với từng rule, ghi: mô tả gốc, lớp thi hành (DDL / trigger / transaction-service / authorization / audit query), case hợp lệ, case bị từ chối, test ID, evidence. Nếu rule không thể được DB đảm bảo toàn diện, ghi chính xác giới hạn và ranh giới đảm bảo; không xóa, gộp hoặc diễn giải lại rule.

| Range | Chủ đề | Tầng cần đối chiếu |
|---|---|---|
| BR1–5 | account/role | DDL, auth, DB/app permissions |
| BR6–12 | patient | DDL, patient ownership, record links |
| BR13–20 | doctor/subtype/specialty | DDL, subtype rule tests |
| BR21–25 | schedules | DDL + temporal/overlap enforcement |
| BR26–36 | appointments/status/follow-up/overlap | DDL + trigger/service transaction |
| BR37–41 | consultation | FK/unique + session time/modality tests |
| BR42–45 | medical history/archive | workflow/ownership tests |
| BR46–50 | prescription/items/medication | FK/workflow/item transaction |
| BR51–57 | cross-entity/workflow/telemedicine | trigger/service/audit/UI tests |
| IC1–IC11 | global integrity | test matrix + evidence |
