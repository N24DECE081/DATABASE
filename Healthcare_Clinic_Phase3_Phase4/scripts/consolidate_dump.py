"""Build the handover from the supplied mysqldump and current clinic rules."""
import re
import sys
from pathlib import Path

from sql_runner import ROOT


database = ROOT / "database"
source = Path(sys.argv[1]).read_text(encoding="utf-8-sig")
source = re.sub(r"^(?:CREATE DATABASE |USE |DROP TABLE IF EXISTS ).*\n", "", source, flags=re.M)
sections = ["-- Import into an explicitly selected empty MySQL database.", source,
            "SET NAMES utf8mb4;\nSET time_zone = '+07:00';"]
sections.append((database / "migrations/002_doctor_birth_date.sql").read_text(encoding="utf-8"))
for relative in (
    "appointments/001_appointment_integrity.sql",
    "consultations/001_session_integrity.sql",
    "medical_history/001_clinical_integrity.sql",
):
    rules = (database / "triggers" / relative).read_text(encoding="utf-8")
    objects = re.findall(r"^CREATE (TRIGGER|PROCEDURE) (\w+)", rules, flags=re.M)
    for kind, name in sorted(objects, key=lambda item: item[0] != "TRIGGER"):
        sections.append(f"DROP {kind} IF EXISTS `{name}`;")
    sections.append(rules)
sections.append("""INSERT INTO specialty (specialty_id, specialty_name, description)
SELECT 'SPC-000', 'Đa khoa', 'Khám và chăm sóc sức khỏe ban đầu tổng quát.'
WHERE NOT EXISTS (SELECT 1 FROM specialty WHERE specialty_name = 'Đa khoa');""")
(database / "healthcare_clinic_final.sql").write_text("\n\n".join(sections) + "\n", encoding="utf-8")
