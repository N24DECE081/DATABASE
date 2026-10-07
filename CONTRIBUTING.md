# Quy trình đóng góp của nhóm

Giới hạn quyền duy nhất: thành viên khác chủ repository `N24DECE081` không được ghi trực tiếp lên `main`. Mọi quyền làm việc còn lại đều được cho phép.

1. Thành viên khác `N24DECE081` đưa thay đổi vào `main` qua Pull Request; không push, force-push, ghi đè hoặc xóa trực tiếp `main`, kể cả bằng quyền bypass.
2. Mọi thành viên được tạo, sửa, push, force-push và xóa nhánh khác `main`; được sửa code/tài liệu, chạy demo/test và thực hiện các công việc dự án mà không cần xin phép trước.
3. Mọi thành viên được mở, review, approve và merge Pull Request vào `main`, bao gồm PR của chính mình. Không cần approval riêng của `N24DECE081`, code owner hoặc reviewer được chỉ định.
4. Review, checklist, test và xử lý trao đổi là khuyến nghị chất lượng; không phải điều kiện cấp quyền hay điều kiện bắt buộc để merge.
5. Chủ repository `N24DECE081` được thao tác trực tiếp lên `main` và sử dụng các quyền quản trị.

Quy trình ngắn:

```text
main → nhánh cá nhân → commit → push nhánh → Pull Request
     → review/checks (khuyến nghị) → bất kỳ thành viên nào merge
```

Khuyến nghị kiểm tra diff, tránh đưa credentials/dữ liệu thật hoặc dữ liệu local vào Git, và đối chiếu yêu cầu thiết kế khi sửa code. Phân công module dùng để phối hợp, không giới hạn quyền sửa của thành viên.

Các lệnh kiểm tra chính của Phase 3/4:

```powershell
.venv/bin/python.exe -X utf8 scripts/verify_structure.py
.venv/bin/python.exe -X utf8 scripts/verify_database.py
.venv/bin/python.exe -X utf8 -m pytest -q -c backend/pytest.ini backend/tests
```

Chạy từ `Healthcare_Clinic_Phase3_Phase4/`; xem thêm `docs/setup.md`. Nếu chưa có MySQL local, ghi rõ test nào chưa chạy trong PR, không ghi `PASS` thay cho kết quả chưa quan sát.
