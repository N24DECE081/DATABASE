"""Verification tests for targeted issues #1-#5."""
from datetime import date, datetime, time, timedelta
import pytest

from conftest import login, sql
from app.services.common import BusinessError, identity, now
from app.utils.validators import (
    normalize_person_name,
    normalize_phone,
    validate_dob,
    validate_email,
    validate_person_name,
    validate_phone,
)


# ---------------------------------------------------------------------------
# Unit tests for shared validators (#1, #2)
# ---------------------------------------------------------------------------

def test_validators_name_phone_email_dob_unit():
    # Name normalization
    assert normalize_person_name("  nGuyen   vAn   cu ") == "Nguyen Van Cu"
    assert normalize_person_name("bs.  trần   thị  lan") == "BS. Trần Thị Lan"
    assert validate_person_name("  lÊ   vĂn  bÉ ") == "Lê Văn Bé"
    with pytest.raises(BusinessError):
        validate_person_name("   ")
    with pytest.raises(BusinessError):
        validate_person_name("Nguyen Van 123")

    # Phone normalization & validation (10 digits, 0 + 9 digits, strip spaces, reject non-digits/excess)
    assert normalize_phone(" 0912 345 678 ") == "0912345678"
    assert validate_phone("0912 345 678") == "0912345678"
    assert validate_phone("+84 912 345 678") == "0912345678"
    for bad_phone in ("09123456789", "0912abc678", "0912-345-678", "1234567890", "0123"):
        with pytest.raises(BusinessError):
            validate_phone(bad_phone)

    # Email normalization & validation
    assert validate_email("  Dr.An@Clinic.VN  ") == "dr.an@clinic.vn"
    with pytest.raises(BusinessError):
        validate_email("not-an-email")
    with pytest.raises(BusinessError):
        validate_email("", required=True)

    # DOB validation: reject today, future, invalid date, unrealistic ages
    today = now().date()
    with pytest.raises(BusinessError):
        validate_dob(today.isoformat())
    with pytest.raises(BusinessError):
        validate_dob((today + timedelta(days=1)).isoformat())
    with pytest.raises(BusinessError):
        validate_dob("2026-02-30")
    with pytest.raises(BusinessError):
        validate_dob(date(today.year - 140, 1, 1).isoformat())
    # Doctor age bounds 22-80
    with pytest.raises(BusinessError):
        validate_dob(date(today.year - 20, today.month, today.day).isoformat(), min_age=22, max_age=80)
    with pytest.raises(BusinessError):
        validate_dob(date(today.year - 85, today.month, today.day).isoformat(), min_age=22, max_age=80)
    valid_doc_dob = date(today.year - 35, 5, 15)
    assert validate_dob(valid_doc_dob.isoformat(), min_age=22, max_age=80) == valid_doc_dob


# ---------------------------------------------------------------------------
# Integration tests (#1, #2, #3, #4, #5)
# ---------------------------------------------------------------------------

@pytest.mark.mysql
def test_doctor_dob_and_medical_input_rules_integration(app, client):
    login(client, "admin")
    csrf = client.get("/api/csrf").get_json()["csrf_token"]
    headers = {"X-CSRFToken": csrf}

    today = now().date()

    # #1: Doctor DOB invalid/today/future/underage rejected
    for bad_dob in (
        today.isoformat(),
        (today + timedelta(days=3)).isoformat(),
        date(today.year - 19, 1, 1).isoformat(),
        "2025-02-30",
    ):
        res = client.post("/api/admin/doctors", json={
            "name": "bs.  nguyễn   văn  test",
            "phone": "0911222333",
            "email": "test.bad.dob@gmail.com",
            "specialty": "Đa khoa",
            "dob": bad_dob,
        }, headers=headers)
        assert res.status_code == 400

    # #1 & #2: Create doctor with valid DOB, messy name & phone spaces
    res_doc = client.post("/api/admin/doctors", json={
        "name": "  bs.   trần   minh   tâm  ",
        "username": "dr.tam_qa",
        "password": "Password123",
        "phone": "0911 222 333",
        "email": "  Dr.Tam@Clinic.VN ",
        "specialty": "Đa khoa",
        "dob": "1988-04-20",
    }, headers=headers)
    assert res_doc.status_code == 201, res_doc.get_json()
    doc = res_doc.get_json()["doctor"]
    assert doc["name"] == "BS. Trần Minh Tâm"
    assert doc["phone"] == "0911222333"
    assert doc["email"] == "dr.tam@clinic.vn"
    assert doc["rawDob"] == "1988-04-20"
    assert doc["dob"] == "20/04/1988"

    # #2: Duplicate phone in DB rejected across doctor & patient creation
    res_dup_phone_doc = client.post("/api/admin/doctors", json={
        "name": "Bác sĩ Trùng SĐT",
        "phone": "0911222333",
        "email": "other.doc@gmail.com",
        "specialty": "Đa khoa",
        "dob": "1985-01-10",
    }, headers=headers)
    assert res_dup_phone_doc.status_code == 400
    assert "điện thoại" in res_dup_phone_doc.get_json()["error"].lower()

    res_dup_phone_pat = client.post("/api/admin/patients", json={
        "name": "bệnh   nhân  trùng",
        "phone": "0911 222 333",
        "dob": "1995-05-10",
        "gender": "Nam",
    }, headers=headers)
    assert res_dup_phone_pat.status_code == 400
    assert "điện thoại" in res_dup_phone_pat.get_json()["error"].lower()

    # #2: Patient today DOB rejected, valid patient succeeds with normalized name/phone
    res_today_pat = client.post("/api/admin/patients", json={
        "name": "Bệnh Nhân Hôm Nay",
        "phone": "0922333444",
        "dob": today.isoformat(),
    }, headers=headers)
    assert res_today_pat.status_code == 400

    res_pat = client.post("/api/admin/patients", json={
        "name": "  nguyễn   thị   hoa ",
        "phone": "0922 333 444",
        "email": " Hoa.Nguyen@Gmail.COM ",
        "dob": "1996-03-15",
        "gender": "Nữ",
    }, headers=headers)
    assert res_pat.status_code == 201, res_pat.get_json()
    pat = res_pat.get_json()["patient"]
    assert pat["name"] == "Nguyễn Thị Hoa"
    assert pat["phone"] == "0922333444"
    assert pat["email"] == "hoa.nguyen@gmail.com"


@pytest.mark.mysql
def test_3_role_slot_sync_and_doctor_followup_and_session_link(app, client):
    # Create an active shift today with morning + afternoon hours + a fresh completed session for follow-up test
    today = now().date()
    current_dt = now()
    yesterday_10 = datetime.combine(today - timedelta(days=1), time(10, 0))
    with app.app_context():
        sid_today = identity("SCH-")
        sql(
            app,
            """INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status)
               VALUES (%s, 'DOC-001', %s, '08:00:00', '17:00:00', 'Available')""",
            (sid_today, today),
        )
        parent_appt_id = identity("APT-")
        parent_sess_id = identity("SES-")
        sql(
            app,
            """INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id,
                                        appointment_date_time, estimated_duration_minutes, appointment_type, status, reason)
               VALUES (%s, 'PAT-001', 'DOC-001', 'SCH-001', 'USER-001', %s, 30, 'In-person', 'Completed', 'Completed parent')""",
            (parent_appt_id, yesterday_10),
        )
        sql(
            app,
            """INSERT INTO consultation_session (session_id, appointment_id, start_time, end_time, actual_duration_minutes, session_type)
               VALUES (%s, %s, %s, %s, 30, 'In-person')""",
            (parent_sess_id, parent_appt_id, yesterday_10, yesterday_10 + timedelta(minutes=30)),
        )

    # #3 & #4: Doctor can call /api/appointments/options for own slots & follow-up on completed session without follow-up
    login(client, "doctor_gp")
    res_doc_opts = client.get(f"/api/appointments/options?day={today.isoformat()}&follow_up_from_appt_id={parent_appt_id}")
    assert res_doc_opts.status_code == 200
    doc_data = res_doc_opts.get_json()
    for slot in doc_data["slots"]:
        slot_dt = datetime.fromisoformat(slot["starts_at"])
        assert slot_dt >= current_dt
        assert slot_dt.minute in (0, 30)
        assert (time(8, 0) <= slot_dt.time() <= time(11, 30)) or (time(13, 0) <= slot_dt.time() <= time(16, 30))

    # Rejects duration != 30 and non-30m / outside-hours booking
    csrf = client.get("/api/csrf").get_json()["csrf_token"]
    headers = {"X-CSRFToken": csrf}
    tomorrow = today + timedelta(days=1)
    assert client.get(f"/api/appointments/options?day={tomorrow.isoformat()}&duration=15").status_code == 400
    assert client.post("/api/appointments", json={
        "schedule_id": "SCH-002",
        "patient_id": "PAT-001",
        "appointment_date_time": datetime.combine(tomorrow, time(15, 15)).isoformat(timespec="minutes"),
        "estimated_duration_minutes": 30,
        "appointment_type": "In-person",
        "follow_up_from_appt_id": parent_appt_id,
        "reason": "Khung giờ 15 phút không hợp lệ",
    }, headers=headers).status_code == 400
    assert client.post("/api/appointments", json={
        "schedule_id": "SCH-002",
        "patient_id": "PAT-001",
        "appointment_date_time": datetime.combine(tomorrow, time(16, 45)).isoformat(timespec="minutes"),
        "estimated_duration_minutes": 30,
        "appointment_type": "In-person",
        "follow_up_from_appt_id": parent_appt_id,
        "reason": "Ngoài giờ hành chính",
    }, headers=headers).status_code == 400

    # Doctor cannot query another doctor's slots
    res_other_doc = client.get(f"/api/appointments/options?day={today.isoformat()}&doctor_id=DOC-002")
    assert res_other_doc.status_code == 403

    # Doctor follow-up booking rejects past slot & accepts 1st valid future slot (15:00)
    past_dt = (current_dt - timedelta(hours=2)).replace(minute=0, second=0, microsecond=0)
    res_past_fu = client.post("/api/appointments", json={
        "schedule_id": sid_today,
        "patient_id": "PAT-001",
        "appointment_date_time": past_dt.isoformat(timespec="minutes"),
        "estimated_duration_minutes": 30,
        "appointment_type": "In-person",
        "follow_up_from_appt_id": parent_appt_id,
        "reason": "Tái khám quá khứ",
    }, headers=headers)
    assert res_past_fu.status_code == 400

    # Book valid 1st follow-up slot on tomorrow's SCH-002 (15:00)
    res_ok_fu = client.post("/api/appointments", json={
        "schedule_id": "SCH-002",
        "patient_id": "PAT-001",
        "appointment_date_time": datetime.combine(tomorrow, time(15, 0)).isoformat(timespec="minutes"),
        "estimated_duration_minutes": 30,
        "appointment_type": "In-person",
        "follow_up_from_appt_id": parent_appt_id,
        "reason": "Tái khám định kỳ",
    }, headers=headers)
    assert res_ok_fu.status_code == 201, res_ok_fu.get_json()

    # Booking a 2nd follow-up for the same completed session MUST be rejected (max 1 follow-up per completed session)
    res_second_fu = client.post("/api/appointments", json={
        "schedule_id": "SCH-002",
        "patient_id": "PAT-001",
        "appointment_date_time": datetime.combine(tomorrow, time(15, 30)).isoformat(timespec="minutes"),
        "estimated_duration_minutes": 30,
        "appointment_type": "In-person",
        "follow_up_from_appt_id": parent_appt_id,
        "reason": "Tái khám lần 2",
    }, headers=headers)
    assert res_second_fu.status_code == 400
    assert client.get(f"/api/appointments/options?day={tomorrow.isoformat()}&follow_up_from_appt_id={parent_appt_id}").status_code == 400

    # #3: Patient sees identical filtered slots for today
    login(client, "patient_one")
    res_pat_opts = client.get(f"/api/appointments/options?doctor_id=DOC-001&day={today.isoformat()}")
    assert res_pat_opts.status_code == 200
    assert [s["starts_at"] for s in res_pat_opts.get_json()["slots"]] == [s["starts_at"] for s in doc_data["slots"]]

    # #5: Completed appointment session link across portals & admin consultation detail
    login(client, "admin")
    res_admin_appts = client.get("/api/admin/appointments")
    assert res_admin_appts.status_code == 200
    apt_001 = next(a for a in res_admin_appts.get_json()["appointments"] if a["id"] == "APT-001")
    assert apt_001["status"] == "Hoàn thành"
    assert apt_001["sessionId"] == "SES-001"

    res_session = client.get("/api/admin/consultations/SES-001")
    assert res_session.status_code == 200
    assert res_session.get_json()["consultation"]["appointmentId"] == "APT-001"

    res_missing_session = client.get("/api/admin/consultations/SES-999")
    assert res_missing_session.status_code == 404

    # SSR appointment detail renders session link for admin too
    detail_html = client.get("/appointments/APT-001").get_data(as_text=True)
    assert "/consultations/SES-001" in detail_html

    # Completed appointment without session handles missing gracefully
    with app.app_context():
        sid_completed = identity("APT-")
        sql(
            app,
            """INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id,
                                        appointment_date_time, estimated_duration_minutes, appointment_type, status, reason)
               VALUES (%s, 'PAT-001', 'DOC-001', 'SCH-001', 'USER-001', %s, 30, 'In-person', 'Completed', 'No session')""",
            (sid_completed, datetime.combine(today - timedelta(days=1), time(11, 0))),
        )
    missing_html = client.get(f"/appointments/{sid_completed}").get_data(as_text=True)
    assert "Chưa có phiên khám liên kết" in missing_html
