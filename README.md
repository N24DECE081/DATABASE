# Healthcare Clinic & Telemedicine Portal (TiTiMi)

> **Project ID & Title:** `#5: Healthcare Clinic & Telemedicine Portal`  
> A centralized relational database system and multi-portal web application for managing outpatient clinic operations, appointment scheduling, in-person & telemedicine consultations, longitudinal medical histories, and digital prescriptions.

---

## 1. Course & Team Members

- **Course Name / Class Code:** `INT1313 - Databases`
- **Instructor:** Lê Hà Thanh
- **Academic Term:** Semester 1, Academic Year 2026–2027 (`Team TiTiMi`)

| No. | Full Name | Student ID (MSSV) | Email / GitHub | Role & Assigned Responsibilities (Balanced 3-Pillar Split) |
|---:|---|---|---|---|
| 1 | Nguyễn Dương Thanh Mai | `N24DECE081` | `n24dece081@student.ptithcm.edu.vn` / [`@N24DECE081`](https://github.com/N24DECE081) | **Repository Owner, Clinical Data Integrity & DB Security** — PR review & `main` governance; **Tables (5):** `consultation_session`, `medical_history`, `medication`, `prescription`, `prescription_item`; **Design & BCNF:** Clinical BCNF proof (deriving patient/doctor via `session_id` with zero redundancy), nullable `end_time` consultation lifecycle, `>= 1` prescription item invariant & append-only history; **SQL & Security:** `001_session_integrity.sql` (`validate_session` / HTTPS Telemedicine), `001_clinical_integrity.sql`, views `v_patient_history` & `v_prescription_details`, least-privilege role `clinic_application` (`001_application_role.sql` with `DELETE` denied) & Flask RBAC; **Queries:** `Q03`, `Q10`, `Q11`, `Q12` |
| 2 | La Vĩnh Tiến | `N24DECE095` | `n24dece095@student.ptithcm.edu.vn` | **Identity, Conflict-Free Booking & Appointment BCNF** — **Tables (3):** `user_account`, `patient`, `appointment` (including recursive `follow_up_from_appt_id`); **Design & BCNF:** ISO/IEC 11179 Data Dictionary & domain constraints (`VARCHAR + CHECK`), appointment state lifecycle, recursive 1:1 follow-ups & `appointment` BCNF guard (`doctor_id` synced with `doctor_schedule`); **SQL & Concurrency:** Account/patient triggers (`000_profile_subtype_integrity.sql`), booking triggers & procedure (`001_appointment_integrity.sql`: `validate_appointment`, `sp_auto_noshow_appointments`), `SELECT ... FOR UPDATE` row locking & view `v_appointment_details`; **Queries:** `Q04`, `Q06`, `Q08`, `Q09` |
| 3 | Nguyễn Thanh Tuyền | `N24DECE103` | `n24dece103@student.ptithcm.edu.vn` | **EER Specialization (Option 8A), Shifts & Query Optimization** — **Tables (5):** `specialty`, `doctor`, `general_practitioner`, `specialist`, `doctor_schedule`; **Design & BCNF:** Elmasri **Option 8A Total & Disjoint Specialization** (`doctor` supertype → `general_practitioner` / `specialist` `N:1` `specialty`), minimum doctor age (`>= 25`) & non-overlapping 30-min shift rules (`08:00–12:00`, `13:00–17:00`); **SQL & Optimization:** Subtype/age/shift triggers (`002_doctor_birth_date.sql`, `000_profile_subtype_integrity.sql`, `001_schedule_integrity.sql`: `validate_schedule`), **4 Composite Indexes** (`001_workflow_indexes.sql`) & `EXPLAIN` execution plan analysis; **Queries:** `Q01`, `Q02`, `Q05`, `Q07` |

---

## 2. Project Overview

### Objectives & Problem Statement

Outpatient clinics that operate both in-person visits and remote telemedicine consultations must coordinate schedules, prevent double bookings, keep clinical records tamper-evident, and enforce strict role boundaries across administrative staff, physicians, and patients.

**Healthcare Clinic & Telemedicine Portal** addresses this by implementing a **BCNF-normalized MySQL 8.0+ database** backed by defensive RDBMS triggers, stored procedures, views, and least-privilege database roles, paired with a **Python Flask** backend and **three React + TypeScript portals** (`Admin`, `Doctor`, and `Patient`).

### Key Features

- **Role-Based Access Control (RBAC):** Three strictly separated roles (`ADMIN`, `DOCTOR`, `PATIENT`) enforced at both the Flask session/API layer (CSRF-protected, Argon2/PBKDF2 password hashing via Werkzeug) and the MySQL privilege layer (`clinic_application` role with `SELECT`, `INSERT`, `UPDATE`, `EXECUTE` only; `DELETE` denied).
- **EER Total & Disjoint Doctor Specialization (Option 8A):** Supertype `DOCTOR` specialized into `GENERAL_PRACTITIONER` and `SPECIALIST` (linked `N:1` to `SPECIALTY`), enforced via database triggers and atomic transactions.
- **Conflict-Free Clinic Scheduling:**
  - Clinic operating hours `08:00–12:00` and `13:00–17:00` (excluding `12:00–13:00` lunch break) with standardized **30-minute aligned slots** (`:00` / `:30`).
  - Pessimistic row locking (`SELECT ... FOR UPDATE`) and triggers preventing overlapping shifts, overlapping doctor appointments, and overlapping patient appointments.
  - Recursive follow-up appointments (`FollowUpFromApptID`) restricted to concluded `Completed` consultation sessions (maximum 1 active follow-up per completed session) and automated `No-show` sweeping (`sp_auto_noshow_appointments`).
- **In-Person & Telemedicine Consultations:**
  - Two-phase session lifecycle (`EndTime` nullable while ongoing; upon completion `ActualDurationMinutes` computed and bounded to `5–30` minutes).
  - Strict modality alignment (`Telemedicine` ↔ `Virtual`, `In-person` ↔ `In-person`) with mandatory `https://` meeting URL validation.
- **Append-Only Medical History & Digital Prescriptions:**
  - `MEDICAL_HISTORY` records are immutable (`UPDATE` and `DELETE` blocked by DB triggers) and support **patient-scoped cross-specialty read access** for attending doctors caring for that patient (alongside read-only medication context).
  - `PRESCRIPTION` and `PRESCRIPTION_ITEM` enforce `>= 1` medication item, `UNIQUE(PrescriptionID, MedicationID)` anti-duplication, and normalized derivation of patient/doctor identities through `SessionID`.

### Tech Stack

| Layer | Technologies & Versions |
|---|---|
| **Backend** | Python `3.11+` (tested on `3.12.10` / `3.11.9`), Flask `3.1.3`, Flask-WTF `1.3.0`, WTForms `3.2.2`, Jinja2 `3.1.6`, Werkzeug `3.1.9`, python-dotenv `1.2.4` |
| **Frontend SPAs** | React `19.0`, TypeScript `5.7`, Vite `8.0`, Tailwind CSS `4.0` (`admin-portal-frontend`, `doctor-portal-frontend`, `patient-portal-frontend`) |
| **Database** | MySQL `8.0.16+` / `26.x` (InnoDB, `utf8mb4_0900_ai_ci`, `mysql-connector-python 9.7.0`), Stored Procedures, Triggers, Views, Composite Indexes, SQL Roles |
| **Testing & QA** | `pytest 8.4.2`, isolated MySQL schema fixtures, `scripts/verify_structure.py`, `scripts/verify_database.py`, optional `scripts/verify_ui.mjs` (Node.js + Chrome CDP) |

---

## 3. Repository Structure

```text
DATABASE/
├── README.md                                          # Project documentation (this file)
├── CONTRIBUTING.md                                    # Branching, PR review & merge workflow rules
├── Project progress report Phase 1.docx               # Phase 1 report (Requirements, BR1–BR57, EER diagrams)
├── Project progress report Phase 2.docx               # Phase 2 report (Logical Schema, BCNF, Data Dictionary)
├── Project progress report Phase 3.docx               # Phase 3 report (DDL, Triggers, Views, Q01–Q12, RBAC)
├── Healthcare_Clinic_Complete_Report_Phase1_2_3.docx  # Combined Phase 1 + Phase 2 + Phase 3 report
├── Build TiTiMi Admin Portal.zip                      # Standalone Admin UI prototype archive
├── TiTiMi Doctor Portal.zip                           # Standalone Doctor UI prototype archive
├── TiTiMi Patient Portal.zip                          # Standalone Patient UI prototype archive
├── .github/
│   ├── CODEOWNERS                                     # Code ownership rules (main approval by @N24DECE081)
│   └── pull_request_template.md                       # Standard PR checklist template
└── Healthcare_Clinic_Phase3_Phase4/                   # Main application & database workspace
    ├── 00_Project_Governance/                         # Master plan, RACI, traceability, decision & weekly logs
    ├── 01_Reference_and_Baseline/                     # Read-only Phase 2 baseline (.docx) locked via SHA-256
    ├── 02_Phase3_MySQL_Implementation/                # Phase 3 SQL delivery contract
    ├── 03_Phase4_Python_Flask_Integration/            # Phase 4 Flask integration architecture contract
    ├── backend/
    │   ├── admin-portal-frontend/                     # React + TS + Vite source for Admin Portal
    │   ├── doctor-portal-frontend/                    # React + TS + Vite source for Doctor Portal
    │   ├── patient-portal-frontend/                   # React + TS + Vite source for Patient Portal
    │   ├── shared/                                    # Shared TypeScript clinic slot & validation rules
    │   ├── app/
    │   │   ├── blueprints/                            # 14 SSR & JSON API blueprints (admin, doctor, patient, clinical)
    │   │   ├── entities/                              # 13 dataclass domain entities matching DB tables
    │   │   ├── forms/                                 # WTForms with CSRF protection
    │   │   ├── repositories/                          # Parameterized SQL data-access layer
    │   │   ├── services/                              # Transactional business logic & ownership checks
    │   │   ├── static/                                # Built SPA bundles & shared CSS/JS assets
    │   │   ├── templates/                             # Jinja2 templates for SSR & auth routes
    │   │   ├── errors/ & utils/                       # Error handlers, validators, date/form helpers
    │   │   ├── db.py & security.py                    # Request-scoped DB transactions, auth & RBAC guards
    │   ├── config/                                    # Environment loader (dotenv + port/DB config)
    │   ├── tests/                                     # 76 unit & MySQL integration tests
    │   ├── requirements.txt & requirements-lock.txt   # Pinned Python dependencies
    │   ├── .env.example                               # Template environment variables
    │   └── run.py                                     # Local Flask entry point
    ├── database/
    │   ├── migrations/                                # 001_initial_schema.sql, 002_doctor_birth_date.sql
    │   ├── indexes/                                   # 001_workflow_indexes.sql (4 composite indexes)
    │   ├── triggers/                                  # Integrity triggers & stored procedures (appointments, consultations, history, schedules)
    │   ├── views/                                     # 3 business views (v_appointment_details, v_patient_history, v_prescription_details)
    │   ├── queries/                                   # 12 analytical & operational SQL queries (Q01–Q12)
    │   ├── security/roles/                            # 001_application_role.sql (clinic_application GRANT/REVOKE)
    │   ├── seeds/                                     # 2,000-row Vietnamese synthetic SQL seed
    │   ├── dumps/                                     # Database dump snapshot
    │   └── tests/                                     # SQL verification test matrix documentation
    ├── docs/
    │   ├── setup.md, architecture.md, modules.md      # Technical guides, module mapping & EER audit
    │   ├── module_manifest.json                       # Canonical 10-module / 13-entity / 78-column manifest
    │   ├── diagrams/                                  # SVG/DOT specialization & portal data-flow diagrams
    │   └── verification/                              # Captured evidence (database.json, pytest.xml, RESULTS.md, UI screenshots)
    └── scripts/                                       # Local MySQL startup, bootstrap, seeders, build & verifiers
```

---

## 4. Documentation, Datasets & Reports

### Reports & Specifications

| Document | Description | Path |
|---|---|---|
| **Complete Combined Report (Phase 1–3)** | Merged Word report combining Phase 1, Phase 2, and Phase 3 in order | [Healthcare_Clinic_Complete_Report_Phase1_2_3.docx](Healthcare_Clinic_Complete_Report_Phase1_2_3.docx) |
| **Phase 1 Report** | Conceptual model, `BR1–BR57`, `IC1–IC11`, and redrawn high-res EER diagrams | [Project progress report Phase 1.docx](Project%20progress%20report%20Phase%201.docx) |
| **Phase 2 Report** | Logical schema mapping, 1NF→BCNF proofs, and ISO/IEC 11179 Data Dictionary | [Project progress report Phase 2.docx](Project%20progress%20report%20Phase%202.docx) |
| **Phase 2 Read-only Baseline** | SHA-256-locked Phase 2 baseline document for audit verification | [Phase2_DB_Project_RP2_BASELINE_READ_ONLY.docx](Healthcare_Clinic_Phase3_Phase4/01_Reference_and_Baseline/Phase2_DB_Project_RP2_BASELINE_READ_ONLY.docx) |
| **Phase 3 Report** | DDL, triggers, views, indexes, `Q01–Q12`, test matrix & RBAC aligned with code | [Project progress report Phase 3.docx](Project%20progress%20report%20Phase%203.docx) |
| **Presentation Slides / Demo Video** | `[Link to Presentation Slides (if applicable)]` · `[Link to Demo Video (if applicable)]` | — |

### Architecture, Diagrams & Governance

- **Architecture & Data Flow Diagrams:** [Doctor Specialization SVG](Healthcare_Clinic_Phase3_Phase4/docs/diagrams/doctor_specialization.svg) · [Doctor Data Flow SVG](Healthcare_Clinic_Phase3_Phase4/docs/diagrams/doctor_data_flow.svg) · [Patient Data Flow SVG](Healthcare_Clinic_Phase3_Phase4/docs/diagrams/patient_data_flow.svg)
- **Technical Architecture & Module Mapping:** [architecture.md](Healthcare_Clinic_Phase3_Phase4/docs/architecture.md) · [modules.md](Healthcare_Clinic_Phase3_Phase4/docs/modules.md) · [eer_baseline_audit.md](Healthcare_Clinic_Phase3_Phase4/docs/eer_baseline_audit.md) · [setup.md](Healthcare_Clinic_Phase3_Phase4/docs/setup.md)
- **Requirements & Traceability:** [BUSINESS_RULES_TRACE.md](Healthcare_Clinic_Phase3_Phase4/00_Project_Governance/requirements/BUSINESS_RULES_TRACE.md) · [TRACEABILITY_MATRIX.md](Healthcare_Clinic_Phase3_Phase4/00_Project_Governance/TRACEABILITY_MATRIX.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
- **Verification Evidence:** [RESULTS.md](Healthcare_Clinic_Phase3_Phase4/docs/verification/RESULTS.md) · [database.json](Healthcare_Clinic_Phase3_Phase4/docs/verification/database.json)

### Datasets & Data Origin

All data in this project is **100% synthetically generated for academic coursework** — zero real patient PII or clinical records are used:

- **Small Demo Seed (`scripts/seed_demo.py`):** Deterministic fixture set (5 accounts, 2 patients, 2 doctors, 8 shifts, 7 appointments, 1 completed session, 1 history record, 1 prescription with 2 items, 2 medications).
- **2,000-Row Vietnamese Synthetic Dataset (`scripts/seed_vietnamese_dataset.py` & [healthcare_clinic_portal_vietnamese_seed.sql](Healthcare_Clinic_Phase3_Phase4/database/seeds/healthcare_clinic_portal_vietnamese_seed.sql)):** 92 accounts, 80 patients, 11 doctors (4 GPs + 7 Specialists), 6 specialties, 112 shifts, 650 appointments, 400 sessions, 300 medical histories, 24 medications, 150 prescriptions, and 164 prescription items. Includes synthetic Vietnamese names, 10-digit mobile formats, masked Gmail-style placeholders, and mock Google Meet URLs.
- **Full SQL Dump:** [healthcare_clinic_portal_full_dump.sql](Healthcare_Clinic_Phase3_Phase4/database/dumps/healthcare_clinic_portal_full_dump.sql).

---

## 5. Installation, Deployment & Operation

### Prerequisites

- **Python:** `3.11+` (verified on Python `3.11.9` and `3.12.10`)
- **MySQL Server:** `8.0.16+` or `26.x` (with `CHECK` constraint & SQL `ROLE` support; local helper targets port `3307` in `.local/mysql` so system MySQL on `3306` is untouched)
- **Node.js & npm:** `Node 20+` (only required if modifying and rebuilding the React SPA frontends; prebuilt static assets are already committed in `backend/app/static/`)
- **OS / Shell:** Windows PowerShell (or compatible bash/PowerShell with Python venv)

### Installation

#### 1. Clone the repository & enter the workspace

```bash
git clone https://github.com/N24DECE081/DATABASE.git
cd DATABASE/Healthcare_Clinic_Phase3_Phase4
```

#### 2. Create a Python virtual environment & install dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-lock.txt
```

#### 3. (Optional) Rebuild React SPA portals

Prebuilt production bundles already exist in `backend/app/static/`. If you edit any React source, rebuild them:

```powershell
foreach ($portal in @("admin-portal-frontend", "doctor-portal-frontend", "patient-portal-frontend")) {
    Push-Location "backend\$portal"
    npm ci
    npm run typecheck
    npm run build
    Pop-Location
}
```

#### 4. Start isolated MySQL (Port `3307`) & bootstrap the database

`scripts/start-local-mysql.ps1` defaults to `C:\Program Files\MySQL\MySQL Server 26.7`; pass `-MySqlHome` if your MySQL Server is installed in a different path (e.g., `26.10` or `8.0`). `scripts/bootstrap_local.py` initializes schema `healthcare_clinic_portal`, applies all migrations/indexes/triggers/views, seeds data, creates the restricted `healthcare_app` user (`clinic_application` role), and generates `backend/.env` from `backend/.env.example`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-local-mysql.ps1 -MySqlHome "C:\Program Files\MySQL\MySQL Server 26.10"

# Option A: Default small demo dataset
.\.venv\Scripts\python.exe -X utf8 scripts\bootstrap_local.py

# Option B: 2,000-row Vietnamese realistic dataset (use on an empty schema)
.\.venv\Scripts\python.exe -X utf8 scripts\bootstrap_local.py --dataset vietnamese
```

If configuring `backend/.env` manually instead of `bootstrap_local.py`, copy `backend/.env.example` to `backend/.env`:

```ini
FLASK_SECRET_KEY=replace-with-a-long-random-local-secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_DATABASE=healthcare_clinic_portal
MYSQL_USER=healthcare_app
MYSQL_PASSWORD=replace-with-local-password
APP_PORT=5000
COOKIE_SECURE=0
```

### Usage & Operation

#### Development Mode

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-local-mysql.ps1 -MySqlHome "C:\Program Files\MySQL\MySQL Server 26.10"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-local.ps1
```

Or run `backend/run.py` directly with your virtual environment:

```powershell
$env:APP_PORT = "5000"
$env:FLASK_DEBUG = "true"
.\.venv\Scripts\python.exe backend\run.py
```

- **Login Page:** http://127.0.0.1:5000/auth/login
- **Portals:** `/admin/portal` · `/doctors/portal` · `/patients/portal`
- **Health Checks:** `/health` (process) · `/ready` (database connectivity)

#### Production-Like Deployment

- Set `FLASK_DEBUG=false` and `COOKIE_SECURE=1` (when serving behind HTTPS/TLS reverse proxy such as Nginx).
- Supply a strong random `FLASK_SECRET_KEY` via environment / `.env`.
- Run behind a production WSGI server (e.g., `waitress-serve --host=127.0.0.1 --port=5000 backend.run:app` on Windows or `gunicorn` on Linux), connecting to MySQL via the least-privilege `healthcare_app` account.

#### Sample Test Accounts

**2,000-Row Vietnamese Dataset (`--dataset vietnamese`) — Shared Password:** `BenhVien!2026`

| Role | Username(s) | Portal URL |
|---|---|---|
| `ADMIN` | `admin` | http://127.0.0.1:5000/admin/portal |
| `DOCTOR` | `bacsi001` – `bacsi011` (`bacsi001`: BS. Nguyễn Minh Quân) | http://127.0.0.1:5000/doctors/portal |
| `PATIENT` | `benhnhan001` – `benhnhan080` (`benhnhan009`: Võ Văn Hòa) | http://127.0.0.1:5000/patients/portal |

**Small Demo Dataset (default `bootstrap_local.py`) — Shared Password:** `ClinicDemo!2026`

| Role | Username(s) |
|---|---|
| `ADMIN` | `admin` |
| `DOCTOR` | `doctor_gp`, `doctor_specialist` |
| `PATIENT` | `patient_one`, `patient_two` |

### Verification & Testing

Run from `Healthcare_Clinic_Phase3_Phase4/` with local MySQL running on port `3307`:

```powershell
# 1. Verify Phase 1/2 baseline hashes, modules, and entity structure
.\.venv\Scripts\python.exe -X utf8 scripts\verify_structure.py

# 2. Verify live MySQL schema, 13 tables, 78 fields, 3 views, and execute Q01–Q12 + EXPLAIN
.\.venv\Scripts\python.exe -X utf8 scripts\verify_database.py

# 3. Run unit & MySQL integration test suite (uses isolated temporary schemas)
.\.venv\Scripts\python.exe -X utf8 -m pytest -q -c backend\pytest.ini backend\tests
```
