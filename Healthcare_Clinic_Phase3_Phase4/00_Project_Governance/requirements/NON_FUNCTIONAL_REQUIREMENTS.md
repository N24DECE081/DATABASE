# Yêu cầu phi chức năng

Các mục dưới đây là mục tiêu prototype cần đo hoặc mô tả giới hạn; không khẳng định đã đạt trước khi kiểm tra.

| ID | Yêu cầu | Cách kiểm chứng / báo cáo |
|---|---|---|
| NFR-01 Security | Password lưu dạng hash; query parameterized; secrets ngoài Git; role/ownership kiểm ở server | Code review, secret scan thủ công, auth/authorization tests |
| NFR-02 Integrity | DB constraints/transactions bảo vệ các quy tắc baseline | Positive/negative SQL tests |
| NFR-03 Usability | Luồng demo chính có nhãn/trạng thái/lỗi dễ hiểu | Task walkthrough với 3 role |
| NFR-04 Maintainability | Module tách routes/services/repositories; SQL format thống nhất | Review checklist |
| NFR-05 Reproducibility | Một nhóm khác có thể dựng schema, seed và chạy app theo hướng dẫn | Clean setup rehearsal |
| NFR-06 Performance | Đo các query đại diện với EXPLAIN trên dataset demo; ghi kích thước dataset/cấu hình | Kết quả thật; không bịa ngưỡng hay benchmark |
| NFR-07 Privacy | Chỉ dữ liệu tổng hợp/giả lập; giới hạn hồ sơ theo role/ownership | Kiểm tra seed và negative access tests |

Không biến mục tiêu ví dụ từ tài liệu giáo viên thành cam kết hiệu năng nếu không có phép đo và môi trường kiểm chứng.
