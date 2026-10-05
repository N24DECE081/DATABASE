"""Initialize only the isolated project MySQL, preserving any existing schema/data."""
from pathlib import Path
import secrets

import mysql.connector
from seed_demo import seed
from sql_runner import install, statements

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "healthcare_clinic_portal"


def main():
    if not (ROOT / ".local/mysql/data/mysql").is_dir():
        raise SystemExit("Start scripts/start-local-mysql.ps1 first; this helper targets the isolated project server.")
    env_path = ROOT / "backend/.env"
    if env_path.exists():
        raise SystemExit("backend/.env already exists; credentials/config were preserved. Use the existing setup.")
    db_password = secrets.token_urlsafe(32)
    connection = mysql.connector.connect(host="127.0.0.1", port=3307, user="root", password="", autocommit=True)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SHOW DATABASES LIKE %s", (SCHEMA,))
            if cursor.fetchone():
                raise SystemExit("Project schema already exists; no data or credentials were replaced.")
            cursor.execute(f"CREATE DATABASE `{SCHEMA}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci")
        connection.database = SCHEMA
        install(connection)
        counts = seed(connection)
        with connection.cursor() as cursor:
            cursor.execute("CREATE USER 'healthcare_app'@'127.0.0.1' IDENTIFIED BY %s", (db_password,))
            for statement in statements((ROOT / "database/security/roles/001_application_role.sql").read_text(encoding="utf-8")):
                cursor.execute(statement)
        env_path.write_text("FLASK_SECRET_KEY=" + secrets.token_urlsafe(48) +
            "\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3307\nMYSQL_DATABASE="+SCHEMA+
            "\nMYSQL_USER=healthcare_app\nMYSQL_PASSWORD="+db_password+"\nAPP_PORT=5000\nCOOKIE_SECURE=0\n", encoding="utf-8")
        print("Initialized isolated demo database:", counts)
        print("App credentials written to untracked backend/.env; app DB account has SELECT/INSERT/UPDATE only.")
        print("Demo login: admin / ClinicDemo!2026 (synthetic demonstration accounts only).")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
