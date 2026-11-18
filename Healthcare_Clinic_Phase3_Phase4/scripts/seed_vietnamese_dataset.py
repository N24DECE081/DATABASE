"""Seed 2,000 fictional Vietnamese clinic records into an empty schema."""
from datetime import date, datetime, time, timedelta, timezone
import argparse
import os
from pathlib import Path
import re
import unicodedata

from dotenv import load_dotenv
import mysql.connector
from werkzeug.security import generate_password_hash
from sql_runner import schema_files, statements

ROOT = Path(__file__).resolve().parents[1]
DATASET_PASSWORD = "BenhVien!2026"
TABLES = (
    "user_account", "patient", "specialty", "doctor", "general_practitioner",
    "specialist", "doctor_schedule", "appointment", "consultation_session",
    "medical_history", "medication", "prescription", "prescription_item",
)

SURNAMES = (
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
    "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đoàn", "Trương", "Đinh", "Mai",
)
MIDDLE_NAMES = ("Văn", "Thị", "Minh", "Ngọc", "Hoàng", "Gia", "Thanh", "Quốc", "Bảo", "Khánh")
GIVEN_NAMES = (
    "An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hạnh", "Hiếu", "Hòa", "Hùng",
    "Khang", "Lan", "Linh", "Long", "Mai", "Minh", "Nam", "Nga", "Phúc", "Quân",
)
DISTRICTS = (
    "Ba Đình, Hà Nội", "Cầu Giấy, Hà Nội", "Đống Đa, Hà Nội", "Quận 3, TP Hồ Chí Minh",
    "Bình Thạnh, TP Hồ Chí Minh", "Hải Châu, Đà Nẵng", "Ninh Kiều, Cần Thơ",
    "Lê Chân, Hải Phòng",
)
STREETS = (
    "Nguyễn Trãi", "Trần Phú", "Lê Lợi", "Hai Bà Trưng", "Nguyễn Văn Cừ",
    "Phan Chu Trinh", "Lý Thường Kiệt", "Hoàng Diệu", "Điện Biên Phủ", "Nguyễn Huệ",
)
MOBILE_PREFIXES = (
    "032", "033", "034", "035", "036", "037", "038", "039", "056", "058",
    "070", "076", "077", "078", "079", "081", "082", "083", "084", "085",
    "086", "088", "089", "090", "091", "093", "094", "096", "097", "098", "099",
)
SPECIALTIES = (
    ("SPC-001", "Tim mạch", "Khám và theo dõi các bệnh lý tim mạch."),
    ("SPC-002", "Nhi khoa", "Khám và chăm sóc sức khỏe trẻ em."),
    ("SPC-003", "Da liễu", "Khám và điều trị các bệnh về da."),
    ("SPC-004", "Cơ xương khớp", "Khám các bệnh về cơ, xương và khớp."),
    ("SPC-005", "Tai Mũi Họng", "Khám các bệnh về tai, mũi và họng."),
    ("SPC-006", "Nội tổng quát", "Khám và theo dõi sức khỏe nội khoa."),
)
MEDICATIONS = (
    "Paracetamol 500 mg", "Cetirizine 10 mg", "Natri clorid 0,9%",
    "Amoxicillin 500 mg", "Omeprazole 20 mg", "Loratadine 10 mg",
    "Ibuprofen 200 mg", "Vitamin C 500 mg", "Metformin 500 mg",
    "Amlodipine 5 mg", "Losartan 50 mg", "Atorvastatin 10 mg",
    "Azithromycin 250 mg", "Dextromethorphan 15 mg", "Oral rehydration salts",
    "Calcium carbonate 500 mg", "Vitamin D3 1000 IU", "Clotrimazole 1%",
    "Hydrocortisone 1%", "Salbutamol 100 mcg", "Folic acid 5 mg",
    "Ferrous sulfate 325 mg", "Famotidine 20 mg", "Mupirocin 2%",
)
DIAGNOSES = (
    ("Viêm mũi dị ứng theo mùa", "Hắt hơi, nghẹt mũi theo mùa"),
    ("Rối loạn tiêu hóa nhẹ", "Đau bụng thoáng qua, ăn uống kém"),
    ("Đau đầu căng cơ", "Đau đầu mức độ nhẹ sau ngày làm việc dài"),
    ("Viêm họng cấp", "Đau họng và ho khan"),
    ("Đau lưng cơ học", "Đau vùng thắt lưng khi vận động"),
    ("Viêm da tiếp xúc", "Vùng da kích ứng khu trú"),
    ("Tăng huyết áp cần theo dõi", "Chỉ số huyết áp cao khi đo tại phòng khám"),
    ("Rối loạn giấc ngủ thoáng qua", "Khó ngủ trong một vài ngày gần đây"),
)
DIAGNOSIS_CODES = ("J30.1", "K30", "G44.2", "J02.9", "M54.5", "L23.9", "I10", "G47.0")


def vietnamese_name(index):
    position = index - 1
    return " ".join((
        SURNAMES[position % len(SURNAMES)],
        MIDDLE_NAMES[(position // len(SURNAMES)) % len(MIDDLE_NAMES)],
        GIVEN_NAMES[position % len(GIVEN_NAMES)],
    ))


def mobile_phone(index, group):
    prefix = MOBILE_PREFIXES[(index + group) % len(MOBILE_PREFIXES)]
    suffix = 1_000_000 + (index * 7919 + group * 104729) % 8_000_000
    return f"{prefix}{suffix:07d}"


def email_address(name, ordinal):
    normalized = unicodedata.normalize("NFKD", name.replace("Đ", "D").replace("đ", "d"))
    slug = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "", slug)
    return f"{slug}{ordinal:03d}@gmail.com"


def build_dataset(today=None):
    """Return all rows in FK-safe insert order without connecting to a database."""
    today = today or datetime.now(timezone(timedelta(hours=7))).date()
    now = datetime.combine(today, time(9))
    password_hash = generate_password_hash(DATASET_PASSWORD, method="pbkdf2:sha256:600000")
    rows = {table: [] for table in TABLES}

    rows["user_account"].append({
        "user_id": "USER-ADM-001", "username": "admin", "password_hash": password_hash,
        "role": "ADMIN", "account_status": "Active", "created_at": now,
    })
    for index in range(1, 12):
        rows["user_account"].append({
            "user_id": f"USER-DOC-{index:03}", "username": f"bacsi{index:03}",
            "password_hash": password_hash, "role": "DOCTOR", "account_status": "Active",
            "created_at": now,
        })
    for index in range(1, 81):
        rows["user_account"].append({
            "user_id": f"USER-PAT-{index:03}", "username": f"benhnhan{index:03}",
            "password_hash": password_hash, "role": "PATIENT", "account_status": "Active",
            "created_at": now,
        })

    for index in range(1, 81):
        age = 18 + (index * 7 % 63)
        patient_id = f"PAT-{index:03}"
        full_name = vietnamese_name(index)
        rows["patient"].append({
            "patient_id": patient_id, "user_id": f"USER-PAT-{index:03}",
            "full_name": full_name,
            "date_of_birth": today - timedelta(days=365 * age + index * 11),
            "gender": "Female" if index % 2 == 0 else "Male",
            "phone": mobile_phone(index, 0), "email": email_address(full_name, index),
            "address": (
                f"Số {12 + index}, đường {STREETS[(index - 1) % len(STREETS)]}, "
                f"{DISTRICTS[(index - 1) % len(DISTRICTS)]}"
            ),
            "blood_type": ("A+", "B+", "O+", "AB+", "A-", "O-")[index % 6],
            "allergies": "Không ghi nhận" if index % 4 else "Phấn hoa",
            "chronic_diseases": "Không ghi nhận" if index % 5 else "Tăng huyết áp",
            "emergency_contact_name": vietnamese_name(index + 80),
            "emergency_contact_phone": mobile_phone(index, 1000),
        })

    for specialty_id, name, description in SPECIALTIES:
        rows["specialty"].append({
            "specialty_id": specialty_id, "specialty_name": name, "description": description,
        })
    doctor_names = (
        "Nguyễn Minh Quân", "Lê Bảo Ngọc", "Trần Quốc Khánh", "Phạm Thu Hà",
        "Vũ Thanh Bình", "Hoàng Gia Hân", "Đặng Minh Tâm", "Bùi Ngọc Anh",
        "Đỗ Văn Phúc", "Phan Khánh Linh", "Hồ Quốc Bảo",
    )
    doctor_specialties = (None, "SPC-001", "SPC-002", "SPC-003", "SPC-004",
                          "SPC-005", "SPC-006", "SPC-001", "SPC-002", "SPC-003", "SPC-004")
    for index, name in enumerate(doctor_names, 1):
        doctor_id = f"DOC-{index:03}"
        rows["doctor"].append({
            "doctor_id": doctor_id, "user_id": f"USER-DOC-{index:03}",
            "full_name": name, "phone": mobile_phone(index, 2000),
            "email": email_address(name, index + 300),
            "license_number": f"LIC-{index:03}",
        })
        if index <= 4:
            rows["general_practitioner"].append({"doctor_id": doctor_id})
        else:
            rows["specialist"].append({
                "doctor_id": doctor_id, "specialty_id": doctor_specialties[index - 1],
            })

    past_offsets = (-40, -35, -30, -25, -20, -15, -10, -5)
    future_offsets = (1, 4)
    schedules = []
    for doctor_index in range(1, 12):
        offsets = list(past_offsets) + list(future_offsets)
        if doctor_index <= 2:
            offsets.append(7)
        for offset in offsets:
            schedule_id = f"SCH-{len(schedules) + 1:03}"
            schedule_date = today + timedelta(days=offset)
            schedule = {
                "schedule_id": schedule_id, "doctor_id": f"DOC-{doctor_index:03}",
                "schedule_date": schedule_date, "start_time": time(8),
                "end_time": time(17), "availability_status": "Available",
            }
            rows["doctor_schedule"].append(schedule)
            schedules.append((schedule_id, doctor_index, schedule_date, offset < 0))

    for index, name in enumerate(MEDICATIONS, 1):
        rows["medication"].append({
            "medication_id": f"MED-{index:03}", "medication_name": name,
            "description": "Danh mục minh họa; không phải chỉ định điều trị.",
        })

    completed_by_doctor = {index: [] for index in range(1, 12)}
    appointment_number = 0
    past_schedule_number = 0
    for schedule_id, doctor_index, schedule_date, is_past in schedules:
        if not is_past:
            continue
        past_schedule_number += 1
        daily_count = 5 if past_schedule_number <= 48 else 4
        for slot in range(daily_count):
            appointment_number += 1
            patient_number = (appointment_number * 7 + doctor_index) % 80 + 1
            patient_id = f"PAT-{patient_number:03}"
            appointment_id = f"APT-{appointment_number:03}"
            begins = datetime.combine(schedule_date, time(8)) + timedelta(minutes=slot * 30)
            rows["appointment"].append({
                "appointment_id": appointment_id, "patient_id": patient_id,
                "doctor_id": f"DOC-{doctor_index:03}", "schedule_id": schedule_id,
                "booked_by_user_id": f"USER-PAT-{patient_number:03}",
                "appointment_date_time": begins, "estimated_duration_minutes": 30,
                "appointment_type": "Telemedicine" if appointment_number % 4 == 0 else "In-person",
                "status": "Completed", "reason": "Khám theo lịch hẹn.",
                "follow_up_from_appt_id": None,
            })
            completed_by_doctor[doctor_index].append((appointment_id, patient_id, begins))

    future_statuses = (
        ["Scheduled"] * 90 + ["Checked-In"] * 70 + ["Cancelled"] * 55 + ["No-show"] * 35
    )
    future_number = 0
    future_schedule_number = 0
    for schedule_id, doctor_index, schedule_date, is_past in schedules:
        if is_past:
            continue
        future_schedule_number += 1
        daily_count = 11 if future_schedule_number <= 10 else 10
        for slot in range(daily_count):
            future_number += 1
            status = future_statuses[future_number - 1]
            appointment_number += 1
            appointment_id = f"APT-{appointment_number:03}"
            begins = datetime.combine(schedule_date, time(8)) + timedelta(minutes=slot * 30)
            parent_id = None
            if future_number <= 40:
                parent_id, patient_id, _ = completed_by_doctor[doctor_index][(future_number - 1) % len(completed_by_doctor[doctor_index])]
            else:
                patient_number = (appointment_number * 11 + doctor_index) % 80 + 1
                patient_id = f"PAT-{patient_number:03}"
            patient_number = int(patient_id[-3:])
            rows["appointment"].append({
                "appointment_id": appointment_id, "patient_id": patient_id,
                "doctor_id": f"DOC-{doctor_index:03}", "schedule_id": schedule_id,
                "booked_by_user_id": f"USER-PAT-{patient_number:03}",
                "follow_up_from_appt_id": parent_id, "appointment_date_time": begins,
                "estimated_duration_minutes": 30,
                "appointment_type": "Telemedicine" if appointment_number % 4 == 0 else "In-person",
                "status": status, "reason": "Tái khám theo hẹn." if parent_id
                else "Khám tổng quát.",
            })

    for index, appointment in enumerate(rows["appointment"][:400], 1):
        start = appointment["appointment_date_time"]
        duration = 20 if index % 3 == 0 else 30
        end = start + timedelta(minutes=duration)
        session_id = f"SES-{index:03}"
        rows["consultation_session"].append({
            "session_id": session_id, "appointment_id": appointment["appointment_id"],
            "start_time": start, "end_time": end, "actual_duration_minutes": duration,
            "session_type": "Virtual" if appointment["appointment_type"] == "Telemedicine" else "In-person",
            "meeting_url": None,
            "diagnosis_notes": "Bác sĩ đã trao đổi triệu chứng, tiền sử và kế hoạch theo dõi.",
        })
        if index <= 300:
            diagnosis, symptoms = DIAGNOSES[(index - 1) % len(DIAGNOSES)]
            rows["medical_history"].append({
                "medical_history_id": f"HIS-{index:03}", "session_id": session_id,
                "record_date": end + timedelta(minutes=5),
                "diagnosis": diagnosis,
                "symptoms": symptoms,
                "progress_notes": "Đã tư vấn theo dõi và hẹn tái khám nếu cần.",
            })
        if index <= 150:
            prescription_id = f"RX-{index:03}"
            rows["prescription"].append({
                "prescription_id": prescription_id, "session_id": session_id,
                "diagnosis_icd": DIAGNOSIS_CODES[(index - 1) % len(DIAGNOSIS_CODES)],
                "prescription_date": end + timedelta(minutes=5),
                "instructions": "Dùng thuốc theo hướng dẫn của bác sĩ.",
            })
            item_count = 2 if index <= 14 else 1
            for item_number in range(item_count):
                medication_number = (index * 3 + item_number) % len(MEDICATIONS) + 1
                rows["prescription_item"].append({
                    "prescription_item_id": f"RXI-{len(rows['prescription_item']) + 1:04}",
                    "prescription_id": prescription_id,
                    "medication_id": f"MED-{medication_number:03}",
                    "dosage": "Theo chỉ định của bác sĩ",
                    "frequency": "Theo hướng dẫn của bác sĩ",
                    "duration": "Theo đơn thuốc",
                    "special_instructions": "Tái khám theo lịch hẹn.",
                })

    return rows


def seed(connection, today=None):
    rows = build_dataset(today)
    with connection.cursor() as cursor:
        for table in TABLES:
            cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
            count = cursor.fetchone()[0]
            if count:
                raise ValueError(f"Seed yêu cầu schema rỗng; bảng {table} hiện có {count} dòng. Không có dữ liệu bị thay đổi.")

    connection.start_transaction()
    try:
        for table in TABLES:
            table_rows = rows[table]
            if not table_rows:
                continue
            columns = tuple(table_rows[0])
            sql = (f"INSERT INTO `{table}` ({', '.join(f'`{column}`' for column in columns)}) "
                   f"VALUES ({', '.join('%s' for _ in columns)})")
            values = [tuple(row[column] for column in columns) for row in table_rows]
            with connection.cursor() as cursor:
                cursor.executemany(sql, values)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    counts = {table: len(rows[table]) for table in TABLES}
    counts["total_rows"] = sum(counts.values())
    return counts


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, datetime):
        return "'" + value.strftime("%Y-%m-%d %H:%M:%S") + "'"
    if isinstance(value, (date, time)):
        return "'" + value.isoformat() + "'"
    if isinstance(value, str):
        escaped = (value.replace("\\", "\\\\").replace("\0", "\\0")
                   .replace("\n", "\\n").replace("\r", "\\r").replace("'", "''"))
        return "'" + escaped + "'"
    return str(value)


def insert_statements(rows):
    inserts = []
    for table in TABLES:
        table_rows = rows[table]
        columns = tuple(table_rows[0])
        column_sql = ", ".join(f"`{column}`" for column in columns)
        values_sql = ",\n".join(
            "  (" + ", ".join(sql_literal(row[column]) for column in columns) + ")"
            for row in table_rows
        )
        inserts.append(f"INSERT INTO `{table}` ({column_sql}) VALUES\n{values_sql};")
    return inserts


def export_replace_existing(path, schema="healthcare_clinic_portal"):
    rows = build_dataset()
    protected_delete_triggers = (
        "history_before_delete", "prescription_item_before_delete",
        "gp_before_delete", "specialist_before_delete",
    )
    trigger_definitions = {}
    for schema_path in schema_files():
        for statement in statements(schema_path.read_text(encoding="utf-8")):
            parts = statement.split(None, 2)
            if len(parts) == 3 and parts[0].upper() == "CREATE" and parts[1].upper() == "TRIGGER":
                name = parts[2].split(None, 1)[0].strip("`")
                if name in protected_delete_triggers:
                    trigger_definitions[name] = statement
    missing = set(protected_delete_triggers) - set(trigger_definitions)
    if missing:
        raise ValueError(f"Could not find trigger definitions to restore: {sorted(missing)}")

    tables_to_clear = (
        "prescription_item", "prescription", "medical_history", "consultation_session",
        "appointment", "doctor_schedule", "general_practitioner", "specialist",
        "doctor", "patient", "specialty", "medication", "user_account",
    )
    parts = [
        "-- WARNING: replaces all rows in the 13 project tables; make a backup first.",
        "-- Preserves tables, views, procedures, and other triggers.",
        f"USE `{schema}`;",
    ]
    parts.extend(f"DROP TRIGGER IF EXISTS `{name}`;" for name in protected_delete_triggers)
    parts.append("SET @previous_sql_safe_updates = @@SQL_SAFE_UPDATES;")
    parts.append("SET SQL_SAFE_UPDATES = 0;")
    parts.append("SET FOREIGN_KEY_CHECKS = 0;")
    parts.append("START TRANSACTION;")
    parts.extend(f"DELETE FROM `{table}`;" for table in tables_to_clear)
    parts.append("SET FOREIGN_KEY_CHECKS = 1;")
    parts.extend(insert_statements(rows))
    parts.append("COMMIT;")
    parts.append("SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;")
    for name in protected_delete_triggers:
        parts.append(f"DELIMITER $$\n{trigger_definitions[name]}$$\nDELIMITER ;")
    parts.extend([
        "SELECT "
        + " + ".join(f"(SELECT COUNT(*) FROM `{table}`)" for table in TABLES)
        + " AS total_rows;",
        "SELECT `status`, COUNT(*) AS row_count FROM `appointment` GROUP BY `status` ORDER BY `status`;",
    ])

    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n\n".join(parts) + "\n", encoding="utf-8")
    return sum(len(table_rows) for table_rows in rows.values()), output


def main():
    parser = argparse.ArgumentParser(description="Nạp 2.000 dòng dữ liệu bệnh viện tiếng Việt.")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--dry-run", action="store_true",
                         help="Tạo và đếm dữ liệu nhưng không kết nối MySQL.")
    actions.add_argument(
        "--export-replace", nargs="?",
        const=str(ROOT / "database/seeds/healthcare_clinic_portal_vietnamese_seed.sql"),
        metavar="PATH", help="Xuất SQL thay dòng dữ liệu hiện có, giữ nguyên cấu trúc schema.",
    )
    args = parser.parse_args()
    if args.export_replace:
        row_count, output = export_replace_existing(args.export_replace)
        print(f"Đã xuất script thay dữ liệu {row_count} dòng vào {output}")
        return
    if args.dry_run:
        counts = {table: len(table_rows) for table, table_rows in build_dataset().items()}
        counts["total_rows"] = sum(counts.values())
        print(counts)
        return

    load_dotenv(ROOT / "backend/.env")
    connection = mysql.connector.connect(
        host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        user=os.environ["MYSQL_USER"], password=os.environ["MYSQL_PASSWORD"],
        database=os.environ["MYSQL_DATABASE"], autocommit=True,
    )
    try:
        print("Đã nạp dữ liệu:", seed(connection))
        print(f"Mật khẩu dùng chung: {DATASET_PASSWORD}")
        print("Tài khoản: admin, bacsi001–bacsi011, benhnhan001–benhnhan080")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
