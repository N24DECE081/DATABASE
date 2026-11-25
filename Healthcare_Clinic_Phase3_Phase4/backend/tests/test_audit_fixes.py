"""Tests verifying all fixes for issues 1-10 and doctor/patient management."""
from datetime import datetime, timedelta
import pytest
from app.entities import Appointment, DoctorSchedule, Patient, UserAccount
from app.services.common import BusinessError, identity, now
from app.services import appointments as appointment_service
from app.services import admin as admin_service
from app.services import medical_history as history_service
from app.services import prescriptions as prescription_service
from app.services import consultations as consultation_service
from app.repositories import appointments, schedules, patients, doctors, auth


def test_patient_cannot_have_overlapping_appointments(app):
    """Issue 1: A patient cannot book overlapping appointments with different doctors."""
    with app.app_context():
        # Get patient and admin from demo seed
        patient_user = auth.find_by_username("patient_one")
        assert patient_user is not None
        pat = patients.for_user(patient_user.user_id)

        # Find 2 different doctors with shifts
        all_schedules = schedules.list_schedules(available_only=True)
        assert len(all_schedules) >= 2

        # Create fresh future shifts for 2 doctors
        from app.db import execute
        d1 = all_schedules[0]["doctor_id"]
        d2 = [s["doctor_id"] for s in all_schedules if s["doctor_id"] != d1][0]
        future_date = (now() + timedelta(days=10)).date()
        sid1 = identity("SCH-")
        execute("INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, %s, %s, %s, %s, 'Available')",
                (sid1, d1, future_date, "08:00:00", "12:00:00"))
        from app.db import get_db
        get_db().commit()
        sid2 = identity("SCH-")
        execute("INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, %s, %s, %s, %s, 'Available')",
                (sid2, d2, future_date, "08:00:00", "12:00:00"))
        get_db().commit()
        appt_time = datetime.combine(future_date, datetime.strptime("09:00:00", "%H:%M:%S").time())

        # Book first appointment
        appt1 = appointment_service.book(patient_user, {
            "schedule_id": sid1,
            "appointment_date_time": appt_time,
            "estimated_duration_minutes": 30,
            "appointment_type": "In-person",
        })
        assert appt1.appointment_id

        # Try to book second appointment for same patient at overlapping time with different doctor shift
        with pytest.raises((BusinessError, Exception)) as exc:
            appointment_service.book(patient_user, {
                "schedule_id": sid2,
                "appointment_date_time": appt_time + timedelta(minutes=10),
                "estimated_duration_minutes": 30,
                "appointment_type": "In-person",
            })
        assert "bệnh nhân" in str(exc.value).lower() or "patient" in str(exc.value).lower()


def test_admin_can_book_follow_up(app):
    """Issue 4: Admin can create follow-up appointments with preceding parent."""
    with app.app_context():
        admin_user = auth.find_by_username("admin")
        patient_user = auth.find_by_username("patient_one")
        pat = patients.for_user(patient_user.user_id)

        # Follow-ups may only reference a completed appointment.
        all_appts = appointments.list_for(admin_user)
        valid_parent = None
        for a in all_appts:
            if a["patient_id"] == pat.patient_id and a["status"] == "Completed":
                valid_parent = a
                break

        if not valid_parent:
            # Create a previous appointment for doctor 1
            doc_id = "DOC-001"
            past_date = (now() - timedelta(days=2)).date()
            sid_prev = identity("SCH-")
            from app.db import execute
            execute("INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, %s, %s, %s, %s, 'Available')",
                    (sid_prev, doc_id, past_date, "08:00:00", "12:00:00"))
            prev_appt_id = identity("APT-")
            execute("INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id, appointment_date_time, estimated_duration_minutes, appointment_type, status) VALUES (%s, %s, %s, %s, %s, %s, 30, 'In-person', 'Completed')",
                    (prev_appt_id, pat.patient_id, doc_id, sid_prev, admin_user.user_id, datetime.combine(past_date, datetime.strptime("09:00:00", "%H:%M:%S").time())))
            valid_parent = {"appointment_id": prev_appt_id, "patient_id": pat.patient_id, "doctor_id": doc_id}

        # Create a shift in the future for this doctor
        doc_id = valid_parent["doctor_id"]
        future_date = (now() + timedelta(days=15)).date()
        sid = identity("SCH-")
        from app.db import execute
        execute("INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, %s, %s, %s, %s, 'Available')",
                (sid, doc_id, future_date, "08:00:00", "12:00:00"))
        future_time = datetime.combine(future_date, datetime.strptime("09:00:00", "%H:%M:%S").time())

        # Admin books follow-up
        followup = appointment_service.book(admin_user, {
            "patient_id": valid_parent["patient_id"],
            "schedule_id": sid,
            "appointment_date_time": future_time,
            "estimated_duration_minutes": 30,
            "appointment_type": "In-person",
            "follow_up_from_appt_id": valid_parent["appointment_id"],
        })
        assert followup.follow_up_from_appt_id == valid_parent["appointment_id"]


def test_admin_create_doctor_and_patient(app, client):
    """Verify adding doctor and adding patient works with password >= 8 characters and account fields."""
    with app.app_context():
        admin_user = auth.find_by_username("admin")
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.user_id

        # Get CSRF token
        csrf_res = client.get("/api/csrf").get_json()
        headers = {"X-CSRFToken": csrf_res["csrf_token"]}

        # 1. Add doctor with 8-character password
        res = client.post("/api/admin/doctors", json={
            "name": "BS Test Audit",
            "username": "dr.testaudit",
            "password": "password8",
            "phone": "0912999888",
            "email": "dr.testaudit@clinic.vn",
            "specialty": "Đa khoa",
            "license_number": "BS-AUDIT-999",
            "gender": "Nam",
            "dob": "15/05/1985",
        }, headers=headers)
        assert res.status_code == 201, res.get_json()
        doc_data = res.get_json()["doctor"]
        assert doc_data["id"].startswith("DOC-")
        assert doc_data["name"] == "BS Test Audit"
        assert doc_data["userId"].startswith("USER-")

        # 2. Add patient with username and password
        res_pat = client.post("/api/admin/patients", json={
            "name": "Bệnh Nhân Audit",
            "username": "pat_audit_test",
            "password": "patientpwd8",
            "confirm_password": "patientpwd8",
            "phone": "0987111222",
            "email": "pat.audit@clinic.vn",
            "dob": "1990-05-20",
            "gender": "Male",
            "address": "123 Đường Test, Quận 1, TP.HCM",
            "blood_type": "O+",
            "allergies": "Không",
            "chronic_diseases": "Không",
            "emergency_contact_name": "Người Thân Audit",
            "emergency_contact_phone": "0987111333",
        }, headers=headers)
        assert res_pat.status_code == 201, res_pat.get_json()
        pat_data = res_pat.get_json()["patient"]
        assert pat_data["id"].startswith("PAT-")
        assert pat_data["userId"].startswith("USER-")
        assert pat_data["name"] == "Bệnh Nhân Audit"
