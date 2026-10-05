# Cây thư mục chuẩn và mức hoàn thiện

Cập nhật 2026-10-05: cây đã chia 10 module với 13 entity/77 field và code Flask/MySQL chạy thật. Nguồn Python/SQL thống nhất tại backend/database; đã dọn 56 thư mục scaffold Phase rỗng. Cây và chức năng có bằng chứng kiểm thử; báo cáo cuối/defense/đóng gói vẫn cần nhóm nghiệm thu.

## Nguồn sở hữu duy nhất

Python/tests tại `backend/`; executable SQL tại `database/`; quản trị tại `00`; baseline chỉ đọc tại `01`. Folder `02`/`03` giữ hợp đồng bàn giao, không có code thứ hai. `04` hướng dẫn vận hành; `05` báo cáo/dictionary/diagrams/evidence; `06` demo/defense; `07` đóng gói artefact đã review.

## Cây hiện hành

`<module>`, `<table>` và dấu ngoặc nhọn là ký hiệu rút gọn, không phải tên folder thật. Đường dẫn đầy đủ nằm trong `docs/module_manifest.json`.

```text
Healthcare_Clinic_Phase3_Phase4/
├── README.md
├── .gitignore
├── 00_Project_Governance/
│   ├── PHASE3_PHASE4_MASTER_PLAN.md
│   ├── FOLDER_STRUCTURE.md
│   ├── WORK_ASSIGNMENT.md
│   ├── TRACEABILITY_MATRIX.md
│   ├── STRUCTURE_AUDIT.md
│   ├── DECISION_LOG.md
│   ├── TASK_BOARD.md
│   ├── TEAM_EXECUTION_GUIDE.md
│   ├── WEEKLY_PROGRESS_LOG.md
│   ├── requirements/
│   ├── planning/
│   └── reviews/
├── 01_Reference_and_Baseline/                 # nguồn chỉ đọc
├── 02_Phase3_MySQL_Implementation/
│   ├── README.md
│   └── SQL_DELIVERY_CONTRACT.md
├── 03_Phase4_Python_Flask_Integration/
│   ├── README.md
│   └── APPLICATION_ARCHITECTURE.md
├── 04_DataGrip_and_Database_Operations/
├── 05_Documentation_and_Report/
├── 06_Demo_and_Defense/
├── 07_Submission_Package/
├── backend/
│   ├── README.md
│   ├── requirements-lock.txt
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── .env.example
│   ├── run.py
│   ├── config/__init__.py                 # môi trường/session limits
│   ├── app/
│   │   ├── __init__.py                       # factory + 10 blueprint
│   │   ├── db.py                           # connection/transaction
│   │   ├── security.py                     # session/role guards
│   │   ├── entities/
│   │   │   ├── __init__.py
│   │   │   ├── user_account.py
│   │   │   ├── patient.py
│   │   │   ├── doctor.py
│   │   │   ├── general_practitioner.py
│   │   │   ├── specialist.py
│   │   │   ├── specialty.py
│   │   │   ├── doctor_schedule.py
│   │   │   ├── appointment.py
│   │   │   ├── consultation_session.py
│   │   │   ├── medical_history.py
│   │   │   ├── medication.py
│   │   │   ├── prescription.py
│   │   │   └── prescription_item.py
│   │   ├── blueprints/<module>/
│   │   ├── forms/<module>/
│   │   ├── services/<module>/
│   │   ├── repositories/<module>/
│   │   ├── templates/<module>/
│   │   ├── templates/errors/
│   │   ├── static/{css,js,img}/
│   │   ├── utils/
│   │   └── errors/
│   └── tests/
│       ├── unit/<module>/
│       ├── integration/<module>/
│       └── smoke/
├── database/
│   ├── README.md
│   ├── migrations/001_initial_schema.sql   # DDL 13 bảng
│   ├── constraints/
│   ├── indexes/
│   ├── seeds/<module>/
│   ├── reset/
│   ├── queries/<module>/
│   ├── views/{appointments,medical_history,prescriptions}/
│   ├── triggers/{schedules,appointments,consultations,medical_history,prescriptions}/
│   ├── security/{roles,authorization_matrix}/
│   ├── tests/<module>/
│   └── performance/{explain_plans,index_review}/
├── docs/
│   ├── architecture.md
│   ├── modules.md
│   ├── module_manifest.json
│   ├── setup.md
│   ├── report_changes.md
│   ├── diagrams/doctor_specialization.{dot,svg}
│   └── verification/                      # JSON/JUnit/screenshots/RESULTS
└── scripts/
    ├── start-local-mysql.ps1
    ├── bootstrap_local.py
    ├── seed_demo.py
    ├── build_schema.py
    ├── sql_runner.py
    ├── run-local.ps1
    ├── verify_structure.py
    ├── verify_database.py
    └── verify_ui.mjs
```

10 module: auth, patients, doctors, schedules, appointments, consultations, medical_history, prescriptions, medications, admin. Mỗi entity sở hữu đúng một lần; admin không tạo entity mới. Trách nhiệm/liên kết tại docs/modules.md.

## Quy tắc và trạng thái

Baseline không sửa; không chép code/SQL sang folder Phase. Thư mục rỗng dùng .gitkeep; package dùng __init__.py. Git theo dõi governance và hợp đồng Phase 3/4; baseline binary và release material vẫn theo chính sách loại trừ hiện có. Secrets/.env, dữ liệu bệnh nhân thật, dump/.venv/cache/log/build không đưa vào Git.

DDL/rules/seed/query/auth/ownership/service/repository/UI đã triển khai. EndTime NULL đã được chốt và áp dụng. Test thực tế: 34 pytest, 12 SQL queries, schema 13 bảng/77 cột/16 FK, 3 views, ảnh desktop/mobile. Xem STRUCTURE_AUDIT.md và docs/verification/RESULTS.md. `database/seeds` và `database/tests` trỏ tới nguồn Python thực thi; không tạo bản seed/test SQL thứ hai chỉ để lấp thư mục.
