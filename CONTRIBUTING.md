# Quy trình đóng góp của nhóm

Repository dùng Pull Request để bảo vệ `main`. Mọi thành viên, kể cả người phụ trách module, phải tuân thủ quy trình dưới đây.

1. Không commit hoặc push trực tiếp lên `main`.
2. Cập nhật `main`, sau đó tạo nhánh riêng theo dạng `feat/<ten-ngan>`, `fix/<ten-ngan>`, `docs/<ten-ngan>`, `test/<ten-ngan>` hoặc `chore/<ten-ngan>`.
3. Chỉ thay đổi đúng phạm vi task được giao. Không sửa EER/baseline Phase 1–2; ngoại lệ duy nhất hiện được duyệt là `CONSULTATION_SESSION.EndTime` cho phép `NULL`.
4. Không commit `.env`, mật khẩu, token, dữ liệu bệnh nhân thật, `.venv`, `.local`, database dump hoặc log local.
5. Chạy kiểm tra phù hợp, commit rõ nghĩa, push nhánh riêng và mở Pull Request vào `main`.
6. Tác giả tự kiểm tra diff, điền checklist PR và xử lý mọi review comment. Không tự merge Pull Request của mình.
7. Chỉ tài khoản chủ repository **N24DECE081** được chấp nhận và merge Pull Request vào `main`.
8. PR chỉ được merge sau khi `@N24DECE081` approve, các cuộc trao đổi đã resolved và kiểm tra bắt buộc đạt. Thành viên khác không được dùng quyền admin/bypass để merge.
9. Không force-push hoặc xóa `main`. Nếu cần sửa lịch sử nhánh cá nhân, phải báo reviewer khi PR đã được review.
10. Trường hợp khẩn cấp vẫn phải dùng nhánh và PR; chỉ `N24DECE081` quyết định ngoại lệ và ghi lý do trong PR.

Quy trình ngắn:

```text
main → nhánh cá nhân → commit → push nhánh → Pull Request
     → review/checks → N24DECE081 approve → N24DECE081 merge
```

Các lệnh kiểm tra chính của Phase 3/4:

```powershell
.venv/bin/python.exe -X utf8 scripts/verify_structure.py
.venv/bin/python.exe -X utf8 scripts/verify_database.py
.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini backend/tests
```

Chạy từ `Healthcare_Clinic_Phase3_Phase4/`; xem thêm `docs/setup.md`. Nếu chưa có MySQL local, ghi rõ test nào chưa chạy trong PR, không ghi `PASS` thay cho kết quả chưa quan sát.
