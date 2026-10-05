# Kiến trúc và hợp đồng bàn giao Flask

Nguồn Python duy nhất tại `backend/`. [Kiến trúc](../docs/architecture.md), [module/entity](../docs/modules.md), [manifest](../docs/module_manifest.json).

Blueprint → form → service/transaction → repository/parameterized SQL → MySQL. Entity tại app/entities giữ đủ baseline. Tuyền review HTTP/forms/templates/auth/authorization; Tiến và Mai review persistence/nghiệp vụ theo WORK_ASSIGNMENT.

Routes hiện đã có authentication/role/ownership, validation/CSRF, transaction/rollback và lỗi DB an toàn. Happy/negative/concurrency paths đã chạy trong pytest trên MySQL riêng. Browser screenshots kiểm viewport desktop/mobile. [Evidence](../docs/verification/RESULTS.md) là đầu vào review, không thay chữ ký nghiệm thu của nhóm.
