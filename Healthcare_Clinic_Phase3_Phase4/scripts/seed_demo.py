"""Deterministic synthetic identities with clinic-local relative demo dates."""
from datetime import datetime, timedelta, time, timezone
from pathlib import Path
import os

from dotenv import load_dotenv
import mysql.connector
from werkzeug.security import generate_password_hash

ROOT = Path(__file__).resolve().parents[1]
DEMO_PASSWORD = "ClinicDemo!2026"
ACCOUNTS = [("U_ADMIN", "admin", "ADMIN"), ("U_GP", "doctor_gp", "DOCTOR"),
            ("U_SPECIALIST", "doctor_specialist", "DOCTOR"),
            ("U_PATIENT1", "patient_one", "PATIENT"), ("U_PATIENT2", "patient_two", "PATIENT")]


def seed_status_examples(connection):
    """Add only missing, explicitly named synthetic status fixtures; never reset data."""
    for aid,pid,did,sid,hour,state in (
        ("A_CANCELLED","P1","D_GP","S_D_GP_1",12,"Cancelled"),
        ("A_MISSED","P2","D_SP","S_D_SP_PAST",11,"No-show"),
    ):
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM appointment WHERE appointment_id=%s",(aid,))
            if cursor.fetchone()[0]:
                continue
            cursor.execute("SELECT schedule_date FROM doctor_schedule WHERE schedule_id=%s",(sid,))
            day=cursor.fetchone()[0]
            cursor.execute("""INSERT INTO appointment(appointment_id,patient_id,doctor_id,schedule_id,
                booked_by_user_id,appointment_date_time,estimated_duration_minutes,appointment_type,status,reason)
                VALUES(%s,%s,%s,%s,'U_ADMIN',%s,30,'In-person',%s,'Synthetic status example')""",
                (aid,pid,did,sid,datetime.combine(day,time(hour)),state))


def seed(connection, clock=None):
    clock = clock or datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None, microsecond=0)
    today = clock.date()
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM user_account")
        if cursor.fetchone()[0]:
            raise ValueError("Seed requires empty user_account; existing project data was preserved.")
    connection.start_transaction()
    try:
        def add(table, **row):
            with connection.cursor() as cursor:
                cursor.execute(f"INSERT INTO `{table}` ({', '.join('`'+c+'`' for c in row)}) "
                               f"VALUES ({', '.join('%s' for _ in row)})", tuple(row.values()))

        password_hash = generate_password_hash(DEMO_PASSWORD, method="pbkdf2:sha256:600000")
        for uid, username, role in ACCOUNTS:
            add("user_account", user_id=uid, username=username, password_hash=password_hash,
                role=role, account_status="Active", created_at=clock)
        for number in (1, 2):
            add("patient", patient_id=f"P{number}", user_id=f"U_PATIENT{number}", full_name=f"Demo Patient {number}",
                date_of_birth=today.replace(year=today.year-25, month=1, day=1), gender="Other", phone="0000000000",
                email=f"patient{number}@example.invalid", emergency_contact_name="Synthetic Emergency Contact",
                emergency_contact_phone="0000000001")
        add("specialty", specialty_id="T_DEMO", specialty_name="Demo Specialty", description="Synthetic catalog for assessment")
        add("doctor", doctor_id="D_GP", user_id="U_GP", full_name="Demo General Practitioner",
            phone="0000000002", email="gp@example.invalid", license_number="DEMO-GP-001")
        add("general_practitioner", doctor_id="D_GP")
        add("doctor", doctor_id="D_SP", user_id="U_SPECIALIST", full_name="Demo Specialist",
            phone="0000000003", email="specialist@example.invalid", license_number="DEMO-SP-001")
        add("specialist", doctor_id="D_SP", specialty_id="T_DEMO")
        for did in ("D_GP", "D_SP"):
            for offset in (-1, 1, 2, 3):
                suffix = "PAST" if offset == -1 else str(offset)
                add("doctor_schedule", schedule_id=f"S_{did}_{suffix}", doctor_id=did,
                    schedule_date=today+timedelta(days=offset), start_time=time(8), end_time=time(17), availability_status="Available")
        for mid in ("M_A", "M_B"):
            add("medication", medication_id=mid, medication_name=f"Demo Formulary {mid[-1]}",
                description="Synthetic demonstration medication; no clinical use")

        past = datetime.combine(today-timedelta(days=1), time(9))
        add("appointment", appointment_id="A_COMPLETED", patient_id="P1", doctor_id="D_GP",
            schedule_id="S_D_GP_PAST", booked_by_user_id="U_ADMIN", appointment_date_time=past,
            estimated_duration_minutes=30, appointment_type="In-person", status="Checked-In", reason="Synthetic visit")
        add("consultation_session", session_id="C_COMPLETED", appointment_id="A_COMPLETED", start_time=past,
            end_time=past+timedelta(minutes=30), actual_duration_minutes=30, session_type="In-person", diagnosis_notes="Synthetic demonstration encounter")
        with connection.cursor() as cursor:
            cursor.execute("UPDATE appointment SET status = 'Completed' WHERE appointment_id = %s", ("A_COMPLETED",))
        add("medical_history", medical_history_id="H_DEMO", session_id="C_COMPLETED", record_date=past+timedelta(minutes=30),
            diagnosis="Synthetic diagnosis", symptoms="Synthetic symptoms", progress_notes="Demonstration record")
        add("prescription", prescription_id="R_DEMO", session_id="C_COMPLETED", prescription_date=past+timedelta(minutes=30), instructions="Synthetic demonstration only")
        for mid in ("M_A", "M_B"):
            add("prescription_item", prescription_item_id=f"I_{mid}", prescription_id="R_DEMO", medication_id=mid,
                dosage="Demo dose", frequency="Demo frequency", duration="Demo course", special_instructions="Not for clinical use")
        future = today+timedelta(days=1)
        for aid, pid, did, hour, modality, parent, creator in [
            ("A_GP", "P1", "D_GP", 9, "In-person", None, "U_PATIENT1"),
            ("A_VIRTUAL", "P2", "D_SP", 10, "Telemedicine", None, "U_PATIENT2"),
            ("A_SP", "P1", "D_SP", 13, "In-person", None, "U_ADMIN"),
            ("A_FOLLOWUP", "P1", "D_GP", 11, "In-person", "A_COMPLETED", "U_GP"),
        ]:
            add("appointment", appointment_id=aid, patient_id=pid, doctor_id=did, schedule_id=f"S_{did}_1",
                booked_by_user_id=creator, follow_up_from_appt_id=parent,
                appointment_date_time=datetime.combine(future,time(hour)), estimated_duration_minutes=30,
                appointment_type=modality, status="Scheduled", reason="Synthetic demo booking")
        seed_status_examples(connection)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    return {"accounts": 5, "patients": 2, "doctors": 2, "schedules": 8, "appointments": 7,
            "sessions": 1, "histories": 1, "prescriptions": 1, "items": 2, "medications": 2}


if __name__ == "__main__":
    load_dotenv(ROOT / "backend/.env")
    connection = mysql.connector.connect(host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        port=int(os.environ.get("MYSQL_PORT", "3306")), user=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"], database=os.environ["MYSQL_DATABASE"], autocommit=True)
    try:
        print("Seeded synthetic demo:", seed(connection))
        print("Demo accounts: admin, doctor_gp, doctor_specialist, patient_one, patient_two")
        print("Demo-only password:", DEMO_PASSWORD)
    finally:
        connection.close()
