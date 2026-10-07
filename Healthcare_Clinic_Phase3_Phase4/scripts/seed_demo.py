"""Deterministic, fictional clinic records with clinic-local relative demo dates."""
from datetime import datetime, timedelta, time, timezone
from pathlib import Path
import os

from dotenv import load_dotenv
import mysql.connector
from werkzeug.security import generate_password_hash

ROOT = Path(__file__).resolve().parents[1]
DEMO_PASSWORD = "ClinicDemo!2026"
ACCOUNTS = [("USER-001", "admin", "ADMIN"), ("USER-002", "doctor_gp", "DOCTOR"),
            ("USER-003", "doctor_specialist", "DOCTOR"),
            ("USER-004", "patient_one", "PATIENT"), ("USER-005", "patient_two", "PATIENT")]


def seed_status_examples(connection):
    """Add only missing, explicitly named synthetic status fixtures; never reset data."""
    for aid,pid,did,sid,hour,state in (
        ("APT-006","PAT-001","DOC-001","SCH-002",12,"Cancelled"),
        ("APT-007","PAT-002","DOC-002","SCH-005",11,"No-show"),
    ):
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM appointment WHERE appointment_id=%s",(aid,))
            if cursor.fetchone()[0]:
                continue
            cursor.execute("SELECT schedule_date FROM doctor_schedule WHERE schedule_id=%s",(sid,))
            day=cursor.fetchone()[0]
            cursor.execute("""INSERT INTO appointment(appointment_id,patient_id,doctor_id,schedule_id,
                booked_by_user_id,appointment_date_time,estimated_duration_minutes,appointment_type,status,reason)
                VALUES(%s,%s,%s,%s,'USER-001',%s,30,'In-person',%s,%s)""",
                (aid,pid,did,sid,datetime.combine(day,time(hour)),state,
                 "Patient cancelled in advance" if state == "Cancelled" else "Patient did not attend"))


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
        patients = [
            ("PAT-001", "USER-004", "Nguyễn Minh An", today.replace(year=today.year-32, month=4, day=12),
             "Male", "09xx-xxx-101", "minh.an@example.invalid", "Ba Đình, Hà Nội (demo)", "O+",
             "Không ghi nhận (demo)", "Không ghi nhận (demo)", "Nguyễn Văn Bình (demo)", "09xx-xxx-201"),
            ("PAT-002", "USER-005", "Trần Thu Hà", today.replace(year=today.year-38, month=9, day=23),
             "Female", "09xx-xxx-102", "thu.ha@example.invalid", "Cầu Giấy, Hà Nội (demo)", "A+",
             "Phấn hoa (demo)", "Không ghi nhận (demo)", "Trần Thị Mai (demo)", "09xx-xxx-202"),
        ]
        for patient in patients:
            add("patient", patient_id=patient[0], user_id=patient[1], full_name=patient[2],
                date_of_birth=patient[3], gender=patient[4], phone=patient[5], email=patient[6],
                address=patient[7], blood_type=patient[8], allergies=patient[9], chronic_diseases=patient[10],
                emergency_contact_name=patient[11], emergency_contact_phone=patient[12])
        add("specialty", specialty_id="SPC-001", specialty_name="Tim mạch",
            description="Chuyên khoa tim mạch (dữ liệu giả lập)")
        add("doctor", doctor_id="DOC-001", user_id="USER-002", full_name="Nguyễn Minh Quân",
            phone="09xx-xxx-301", email="minh.quan@example.invalid", license_number="DEMO-LIC-001")
        add("general_practitioner", doctor_id="DOC-001")
        add("doctor", doctor_id="DOC-002", user_id="USER-003", full_name="Lê Bảo Ngọc",
            phone="09xx-xxx-302", email="bao.ngoc@example.invalid", license_number="DEMO-LIC-002")
        add("specialist", doctor_id="DOC-002", specialty_id="SPC-001")
        schedule_ids = {}
        schedule_number = 1
        for doctor_id in ("DOC-001", "DOC-002"):
            for offset in (-1, 1, 2, 3):
                schedule_id = f"SCH-{schedule_number:03}"
                schedule_ids[(doctor_id, offset)] = schedule_id
                add("doctor_schedule", schedule_id=schedule_id, doctor_id=doctor_id,
                    schedule_date=today+timedelta(days=offset), start_time=time(8), end_time=time(17),
                    availability_status="Available")
                schedule_number += 1
        add("medication", medication_id="MED-001", medication_name="Cetirizine 10 mg (DEMO)",
            description="Thuốc kháng histamine; dữ liệu danh mục giả lập, không dùng điều trị")
        add("medication", medication_id="MED-002", medication_name="Natri clorid 0,9% dạng xịt (DEMO)",
            description="Sản phẩm vệ sinh mũi; dữ liệu danh mục giả lập, không dùng điều trị")

        past = datetime.combine(today-timedelta(days=1), time(9))
        add("appointment", appointment_id="APT-001", patient_id="PAT-001", doctor_id="DOC-001",
            schedule_id=schedule_ids[("DOC-001", -1)], booked_by_user_id="USER-001", appointment_date_time=past,
            estimated_duration_minutes=30, appointment_type="In-person", status="Checked-In",
            reason="Tái khám dị ứng theo lịch (giả lập)")
        add("consultation_session", session_id="SES-001", appointment_id="APT-001", start_time=past,
            end_time=past+timedelta(minutes=30), actual_duration_minutes=30, session_type="In-person",
            diagnosis_notes="Viêm mũi dị ứng theo mùa (tình huống giả lập)")
        with connection.cursor() as cursor:
            cursor.execute("UPDATE appointment SET status = 'Completed' WHERE appointment_id = %s", ("APT-001",))
        add("medical_history", medical_history_id="HIS-001", session_id="SES-001",
            record_date=past+timedelta(minutes=30), diagnosis="Viêm mũi dị ứng theo mùa (giả lập)",
            symptoms="Hắt hơi, nghẹt mũi theo mùa (giả lập)",
            progress_notes="Đã tư vấn theo dõi và tái khám; hồ sơ hoàn toàn giả lập.")
        add("prescription", prescription_id="RX-001", session_id="SES-001",
            prescription_date=past+timedelta(minutes=30),
            instructions="Dữ liệu đơn thuốc giả lập, không sử dụng thay cho chỉ định y tế.")
        for item_id, medication_id, dosage, frequency, duration in (
            ("RXI-001", "MED-001", "10 mg", "Theo hướng dẫn bác sĩ (giả lập)", "5 ngày (giả lập)"),
            ("RXI-002", "MED-002", "Dạng xịt", "Theo hướng dẫn bác sĩ (giả lập)", "3 ngày (giả lập)"),
        ):
            add("prescription_item", prescription_item_id=item_id, prescription_id="RX-001",
                medication_id=medication_id, dosage=dosage, frequency=frequency, duration=duration,
                special_instructions="Chỉ là dữ liệu mẫu; không dùng lâm sàng.")
        future = today+timedelta(days=1)
        for aid, pid, did, hour, modality, parent, creator in [
            ("APT-002", "PAT-001", "DOC-001", 9, "In-person", None, "USER-004"),
            ("APT-003", "PAT-002", "DOC-002", 10, "Telemedicine", None, "USER-005"),
            ("APT-004", "PAT-001", "DOC-002", 13, "In-person", None, "USER-001"),
            ("APT-005", "PAT-001", "DOC-001", 11, "In-person", "APT-001", "USER-002"),
        ]:
            add("appointment", appointment_id=aid, patient_id=pid, doctor_id=did,
                schedule_id=schedule_ids[(did, 1)],
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
