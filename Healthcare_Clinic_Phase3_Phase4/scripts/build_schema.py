"""Generate physical DDL from retained dictionary metadata and approved overrides."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ORDER = ["user_account", "patient", "specialty", "doctor", "general_practitioner", "specialist",
         "doctor_schedule", "appointment", "consultation_session", "medical_history",
         "medication", "prescription", "prescription_item"]


def generate():
    manifest = json.loads((ROOT / "docs/module_manifest.json").read_text(encoding="utf-8"))
    entities = {e["table"]: e for e in manifest["entities"]}
    overrides = {(o["entity"], o["field"]): o for o in manifest.get("approved_overrides", [])}
    names = {(e["logical_name"], c["logical_name"]): c["field"] for e in entities.values() for c in e["columns"]}
    blocks = ["-- Purpose: 13 baseline relations; approved EndTime NULL override.\n"
              "-- Owner: La Vinh Tien. Source: Phase 2 dictionary + user decision 2026-10-05.\n"
              "-- Requires: MySQL 8.0.16+; InnoDB; strict SQL mode; empty project schema.\n"
              "-- Verify: scripts/verify_database.py; pytest integration suite.\n"
              "SET NAMES utf8mb4;\nSET time_zone = '+07:00';"]
    for table in ORDER:
        entity = entities[table]
        definitions = []
        for col in entity["columns"]:
            name = col["field"]
            override = overrides.get((entity["logical_name"], col["logical_name"]), {})
            nullable = override.get("nullable", col["nullable"])
            default = override.get("default", col["default"])
            definition = f"  `{name}` {col['sql_type']} {'NULL' if nullable else 'NOT NULL'}"
            if default != "None":
                definition += " DEFAULT " + default
            definitions.append(definition)
            if "PK" in col["constraints"]:
                definitions.append(f"  PRIMARY KEY (`{name}`)")
            if "Unique" in col["constraints"] and "PK" not in col["constraints"]:
                definitions.append(f"  UNIQUE KEY `uq_{table}_{name}` (`{name}`)")
            reference = re.search(r"References\s+(\w+)\((\w+)\)", col["constraints"])
            if table == "appointment" and name == "follow_up_from_appt_id":
                reference = re.match(r"(APPOINTMENT)\((AppointmentID)\)", "APPOINTMENT(AppointmentID)")
            if reference:
                parent, logical_key = reference.groups()
                cascade = "CASCADE" if table in ("general_practitioner", "specialist") and name == "doctor_id" else "RESTRICT"
                definitions.append(f"  CONSTRAINT `fk_{table}_{name}` FOREIGN KEY (`{name}`) "
                                   f"REFERENCES `{parent.lower()}` (`{names[parent, logical_key]}`) "
                                   f"ON DELETE {cascade} ON UPDATE RESTRICT")
            domain = re.search(r"CHECK\s*\((.*)\)\s*\.", col["constraints"])
            if domain:
                expression = domain.group(1).replace(col["logical_name"], f"`{name}`")
                definitions.append(f"  CONSTRAINT `ck_{table}_{name}` CHECK ({expression})")
        if table == "doctor_schedule":
            definitions += ["  UNIQUE KEY `uq_schedule_natural` (`doctor_id`, `schedule_date`, `start_time`)",
                            "  CONSTRAINT `ck_schedule_time` CHECK (`end_time` > `start_time`)"]
        elif table == "consultation_session":
            definitions.append("  CONSTRAINT `ck_session_time` CHECK (`end_time` IS NULL OR `end_time` > `start_time`)")
        elif table == "prescription_item":
            definitions.append("  UNIQUE KEY `uq_prescription_medication` (`prescription_id`, `medication_id`)")
        blocks.append(f"CREATE TABLE `{table}` (\n" + ",\n".join(definitions) +
                      "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;")
    output = ROOT / "database/migrations/001_initial_schema.sql"
    output.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    print(f"Generated {len(ORDER)} CREATE TABLE statements: {output}")


if __name__ == "__main__":
    generate()
