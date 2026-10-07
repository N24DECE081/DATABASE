# Quy tắc nhánh và Pull Request

## Quyền quyết định cuối

`main` là nhánh được bảo vệ. Không thành viên nào được tự ý push, force-push, xóa lịch sử hoặc merge trực tiếp vào `main`. **Chỉ chủ repository `N24DECE081` được approve và merge Pull Request.** Approval của reviewer chuyên môn là ý kiến kỹ thuật, không thay thế approval cuối của chủ repository.

## Quy trình bắt buộc

1. Nhận task theo `WORK_ASSIGNMENT.md`/`TASK_BOARD.md`.
2. Đồng bộ `main` và tạo nhánh cá nhân: `feat/`, `fix/`, `docs/`, `test/` hoặc `chore/`.
3. Commit nhỏ, rõ nghĩa; không trộn task không liên quan.
4. Chạy test phù hợp và lưu observed result.
5. Push nhánh cá nhân, mở PR vào `main`, điền đầy đủ template và yêu cầu `@N24DECE081` review.
6. Reviewer chuyên môn kiểm tra artefact theo phân công; tác giả sửa trên cùng nhánh PR.
7. Khi checks đạt và trao đổi đã resolved, `N24DECE081` quyết định approve/merge hoặc yêu cầu sửa tiếp.

## Điều kiện từ chối PR

- Push/merge trực tiếp hoặc cố bypass bảo vệ `main`.
- Thay đổi EER, entity, attribute, relationship, cardinality, PK/FK/UNIQUE/domain/default Phase 1–2 khi chưa có quyết định bằng văn bản. Ngoại lệ hiện tại duy nhất là EndTime NULL.
- Có secret, credential, dữ liệu bệnh nhân thật, dump/log/database local.
- Không có test evidence phù hợp hoặc ghi kết quả chưa chạy là PASS.
- Phạm vi vượt task, không có traceability hoặc không xử lý review comment.

## Xử lý trường hợp khẩn cấp

Không dùng push thẳng `main`. Tạo nhánh `fix/<ten-ngan>`, mở PR nhỏ, ghi rõ tác động và rollback. Chỉ `N24DECE081` quyết định merge. Sau merge phải cập nhật weekly log/decision log nếu ảnh hưởng baseline hoặc release.

Quy tắc cấp repository nằm tại `CONTRIBUTING.md`, `.github/CODEOWNERS` và `.github/pull_request_template.md`.
