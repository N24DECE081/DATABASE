# Quy tắc nhánh và Pull Request

## Giới hạn quyền duy nhất

Thành viên khác chủ repository `N24DECE081` không được ghi trực tiếp lên `main`: push, force-push, ghi đè hoặc xóa nhánh, kể cả bằng quyền bypass. Những thành viên này đưa thay đổi vào `main` qua Pull Request. Chủ repository được thao tác trực tiếp lên `main`.

## Các quyền được cho phép

Mọi thành viên được sửa code/tài liệu, chạy lệnh/demo/test, tạo hoặc sửa nhánh khác `main`, commit, push, force-push, xóa nhánh khác `main`, mở PR, review, approve và merge PR. Tác giả được merge PR của chính mình. Mọi công việc còn lại đều được cho phép mà không cần xin phép trước; quyền quản trị không được dùng để bỏ qua giới hạn ghi trực tiếp lên `main` của thành viên khác chủ repository.

Không yêu cầu approval riêng của `N24DECE081`, approval của code owner, số lượng review tối thiểu, checks bắt buộc hoặc resolved conversations làm điều kiện merge. Phân công owner/reviewer là hướng dẫn phối hợp, không giới hạn quyền đóng góp.

## Quy trình khuyến nghị

1. Đồng bộ `main` và tạo nhánh riêng, ví dụ `feat/`, `fix/`, `docs/`, `test/` hoặc `chore/`.
2. Thực hiện thay đổi, kiểm tra diff và chạy test phù hợp.
3. Push nhánh, mở PR vào `main` và mô tả kết quả kiểm tra thực tế.
4. Review hoặc trao đổi khi cần; bất kỳ thành viên nào cũng có thể merge PR.

Khuyến nghị giữ credentials/dữ liệu thật ngoài Git và đối chiếu yêu cầu thiết kế của dự án. Checklist và review hỗ trợ chất lượng, không bổ sung rào cản cấp quyền.

## Xử lý trường hợp khẩn cấp

Thành viên khác `N24DECE081` vẫn dùng nhánh và PR; được tự merge PR mà không cần chờ chủ repository approve. Chủ repository có thể sửa trực tiếp `main`. Khuyến nghị ghi rõ tác động và cách rollback.

Quy tắc cấp repository nằm tại `CONTRIBUTING.md`, `.github/CODEOWNERS` và `.github/pull_request_template.md`.
