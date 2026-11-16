from datetime import date

from seed_vietnamese_dataset import TABLES, build_dataset


def test_vietnamese_dataset_has_2000_relationally_consistent_rows():
    rows = build_dataset(date(2026, 1, 1))
    assert sum(len(rows[table]) for table in TABLES) == 2000
    text_values = [value for table_rows in rows.values() for row in table_rows
                   for value in row.values() if isinstance(value, str)]
    assert not any(term in value.casefold() for value in text_values
                   for term in ("giả lập", "mô phỏng", "demo"))
    assert {
        table: len(rows[table]) for table in TABLES
    } == {
        "user_account": 92, "patient": 80, "specialty": 6, "doctor": 11,
        "general_practitioner": 4, "specialist": 7, "doctor_schedule": 112,
        "appointment": 650, "consultation_session": 400, "medical_history": 300,
        "medication": 24, "prescription": 150, "prescription_item": 164,
    }

    appointments = {row["appointment_id"]: row for row in rows["appointment"]}
    sessions = {row["session_id"]: row for row in rows["consultation_session"]}
    assert all(appointments[row["appointment_id"]]["status"] == "Completed"
               for row in sessions.values())

    patients = rows["patient"]
    phones = [row["phone"] for row in patients]
    phones.extend(row["emergency_contact_phone"] for row in patients)
    phones.extend(row["phone"] for row in rows["doctor"])
    assert all(len(phone) == 10 and phone.isdigit() for phone in phones)
    assert len(set(phones)) == len(phones)
    assert all(row["email"].endswith("@gmail.com") for row in patients + rows["doctor"])
    assert all("." not in row["email"].split("@")[0] for row in patients + rows["doctor"])
    assert len({row["email"] for row in patients + rows["doctor"]}) == (
        len(patients) + len(rows["doctor"])
    )
    assert all("đường" in row["address"] for row in patients)
    assert all(len(row["emergency_contact_name"].split()) == 3 for row in patients)
    assert all(row["meeting_url"] is None or row["meeting_url"].startswith("https://meet.google.com/")
               for row in sessions.values())

    follow_ups = [row for row in rows["appointment"] if row["follow_up_from_appt_id"]]
    assert len(follow_ups) == 40
    for appointment in follow_ups:
        parent = appointments[appointment["follow_up_from_appt_id"]]
        assert appointment["patient_id"] == parent["patient_id"]
        assert appointment["doctor_id"] == parent["doctor_id"]
        assert appointment["appointment_date_time"] > parent["appointment_date_time"]
