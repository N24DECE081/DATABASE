# Risk and issue log

| ID | Rủi ro | Tác động | Giảm thiểu/trigger hành động | Owner |
|---|---|---|---|---|
| R-01 | 12 vs 13 bảng trong phần overview/schema | Bỏ sót entity | Đóng băng manifest đủ 13 relations, đối chiếu dictionary | Tiến |
| R-02 | Constraint temporal/multi-row khó thực thi nguyên tử | Integrity lỗi hoặc false claim | Chốt DB version; test transactions/concurrency; ghi enforcement boundary | Mai |
| R-03 | Schema physical naming khác baseline presentation | Drift giữa report/code | Duy trì name mapping và compare checklist | Tiến |
| R-04 | App dùng DB root hoặc secret bị commit | Security/demo thất bại | Least privilege, `.env.example`, review `.gitignore` | Tuyền |
| R-05 | Mỗi thành viên chỉ hiểu module riêng | SQL defense/peer score thấp | Cross-review, luyện truy vấn ngẫu nhiên, rehearsal | Cả nhóm |
| R-06 | Scope creep làm thay thiết kế đã nộp | Mất nhất quán | Từ chối thay schema tùy tiện; ghi decision/escalate | Cả nhóm |
| R-07 | Bằng chứng ghi trước khi chạy | Báo cáo không đáng tin | Chỉ lưu observed output và trạng thái `Not run` khi chưa chạy | Owner test |
