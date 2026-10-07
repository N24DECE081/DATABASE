## Nội dung thay đổi

Mô tả ngắn vấn đề và kết quả sau thay đổi.

## Phạm vi

- Module/task:
- Business rule hoặc requirement liên quan:
- File baseline/EER bị thay đổi (nếu có):

## Kiểm chứng

Checklist dưới đây là khuyến nghị, không phải điều kiện bắt buộc để merge.

- [ ] Đã tự xem toàn bộ diff
- [ ] Không commit secret, `.env`, dữ liệu thật, `.venv`, `.local`, dump hoặc log
- [ ] Đã đối chiếu yêu cầu thiết kế khi thay đổi EER/baseline Phase 1–2
- [ ] Đã chạy `scripts/verify_structure.py`
- [ ] Đã chạy test phù hợp và ghi kết quả thật bên dưới
- [ ] Đã cập nhật tài liệu/traceability nếu hành vi thay đổi

Kết quả test:

```text
Ghi lệnh và observed result tại đây.
```

## Review và merge

Mọi thành viên được review, approve và merge PR này, kể cả tác giả. Không cần approval riêng của `N24DECE081` hoặc code owner. Thành viên khác chủ repository không được ghi trực tiếp lên `main`.

- [ ] Đã xem và xử lý review comment nếu có (khuyến nghị)
