"""Idempotently sync 002_doctor_birth_date.sql and database/triggers/* onto an existing DB without losing data."""
import argparse
import os
from pathlib import Path
import re

from dotenv import load_dotenv
import mysql.connector

from sql_runner import ROOT, statements

OBJECT_RE = re.compile(
    r"^\s*CREATE\s+(?:DEFINER\s*=\s*\S+\s+)?(TRIGGER|PROCEDURE|EVENT)\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?",
    flags=re.IGNORECASE | re.MULTILINE,
)


def _column_exists(cursor, schema: str, table: str, column: str) -> bool:
    cursor.execute(
        """SELECT 1 FROM information_schema.columns
           WHERE table_schema = %s AND table_name = %s AND column_name = %s LIMIT 1""",
        (schema, table, column),
    )
    return cursor.fetchone() is not None


def _drop_objects(cursor, sql_text: str) -> list[tuple[str, str]]:
    objects = [(kind.upper(), name) for kind, name in OBJECT_RE.findall(sql_text)]
    # Drop triggers and events before procedures they reference.
    order = {"TRIGGER": 0, "EVENT": 1, "PROCEDURE": 2}
    for kind, name in sorted(objects, key=lambda item: order.get(item[0], 9)):
        cursor.execute(f"DROP {kind} IF EXISTS `{name}`")
    return objects


def sync_routines(connection, schema: str) -> dict:
    applied_files = []
    synced_objects = []

    with connection.cursor() as cursor:
        cursor.execute("SET NAMES utf8mb4")
        cursor.execute("SET time_zone = '+07:00'")

        # 1. Apply 002_doctor_birth_date.sql safely
        mig_path = ROOT / "database/migrations/002_doctor_birth_date.sql"
        mig_text = mig_path.read_text(encoding="utf-8")
        has_dob = _column_exists(cursor, schema, "doctor", "date_of_birth")
        synced_objects.extend(_drop_objects(cursor, mig_text))
        for stmt in statements(mig_text):
            if has_dob and re.match(r"^\s*ALTER\s+TABLE\s+`?doctor`?\s+ADD\s+COLUMN\s+`?date_of_birth`?", stmt, re.I):
                continue
            cursor.execute(stmt)
        applied_files.append(mig_path.relative_to(ROOT).as_posix())

        # 2. Apply all database/triggers/**/*.sql cleanly
        for path in sorted((ROOT / "database/triggers").rglob("*.sql")):
            text = path.read_text(encoding="utf-8")
            synced_objects.extend(_drop_objects(cursor, text))
            for stmt in statements(text):
                cursor.execute(stmt)
            applied_files.append(path.relative_to(ROOT).as_posix())

        # 3. Ensure MySQL event_scheduler is ON so ev_auto_noshow_appointments runs periodically
        try:
            cursor.execute("SET GLOBAL event_scheduler = ON")
        except mysql.connector.Error:
            pass

    return {"files": applied_files, "objects": synced_objects}


def main():
    load_dotenv(ROOT / "backend/.env")
    parser = argparse.ArgumentParser(
        description="Đồng bộ migration 002_doctor_birth_date.sql và database/triggers/* lên DB hiện có mà không mất dữ liệu."
    )
    parser.add_argument("--host", default=os.environ.get("MYSQL_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("MYSQL_PORT", "3307")))
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="")
    parser.add_argument("--database", default=os.environ.get("MYSQL_DATABASE", "healthcare_clinic_portal"))
    parser.add_argument(
        "--run-noshow",
        action="store_true",
        help="Chạy ngay CALL sp_auto_noshow_appointments() sau khi đồng bộ và in thống kê trạng thái lịch hẹn.",
    )
    args = parser.parse_args()

    connection = mysql.connector.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.database,
        autocommit=True,
    )
    try:
        result = sync_routines(connection, args.database)
        print(f"Synced {len(result['files'])} SQL files and {len(result['objects'])} routines/triggers/events into '{args.database}':")
        for f in result["files"]:
            print(f"  - {f}")
        with connection.cursor() as cursor:
            if args.run_noshow:
                cursor.execute("CALL sp_auto_noshow_appointments()")
                while cursor.nextset():
                    pass
            cursor.execute("SHOW VARIABLES LIKE 'event_scheduler'")
            ev_var = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = %s", (args.database,))
            trig_count = cursor.fetchone()[0]
            cursor.execute("SELECT EVENT_NAME, STATUS, INTERVAL_VALUE, INTERVAL_FIELD FROM information_schema.EVENTS WHERE EVENT_SCHEMA = %s", (args.database,))
            events = cursor.fetchall()
            cursor.execute("SELECT status, COUNT(*) FROM appointment GROUP BY status ORDER BY status")
            statuses = cursor.fetchall()
            print(f"Verify: event_scheduler={ev_var[1] if ev_var else 'N/A'}, triggers={trig_count}, events={events}")
            print("Appointment statuses:", dict(statuses))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
