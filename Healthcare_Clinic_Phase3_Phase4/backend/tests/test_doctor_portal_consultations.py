from datetime import datetime
from types import SimpleNamespace

from app import create_app
from app.blueprints import doctor_portal_api


def doctor_client(monkeypatch):
    doctor = SimpleNamespace(user_id="DOCTOR-1", role="DOCTOR", account_status="Active")
    monkeypatch.setattr("app.security.find_by_id", lambda _user_id: doctor)
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test-key",
        "WTF_CSRF_ENABLED": False,
    })
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = doctor.user_id
    return client


def test_create_consultation_serializes_clinical_fields_and_online_call(monkeypatch):
    client = doctor_client(monkeypatch)
    start_time = datetime(2026, 11, 17, 9, 30)
    session = SimpleNamespace(
        session_id="CONSULT-1",
        appointment_id="APT-1",
        start_time=start_time,
        end_time=None,
        actual_duration_minutes=5,
        meeting_url="https://meet.example.test/room",
        diagnosis_notes="Lý do khám:\nĐau bụng\n\nChẩn đoán:\nViêm dạ dày",
    )
    appointment = {
        "appointment_id": "APT-1",
        "patient_id": "PAT-1",
        "patient_name": "Bệnh nhân Kiểm thử",
        "appointment_date_time": start_time,
        "appointment_type": "Telemedicine",
    }
    monkeypatch.setattr(doctor_portal_api, "now", lambda: start_time)
    monkeypatch.setattr(doctor_portal_api.appointments, "details", lambda _id: appointment)
    monkeypatch.setattr(
        doctor_portal_api.consultation_service,
        "create",
        lambda *_args: session,
    )

    response = client.post(
        "/api/doctor/appointments/APT-1/consultation",
        json={
            "meeting_url": session.meeting_url,
            "diagnosis_notes": session.diagnosis_notes,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["consultation"]
    assert data["id"] == "CONSULT-1"
    assert data["complaint"] == "Đau bụng"
    assert data["diagnosis"] == "Viêm dạ dày"
    assert data["meetingUrl"] == session.meeting_url
    assert data["modality"] == "Tư vấn trực tuyến"


def test_create_consultation_rejects_non_https_meeting_url(monkeypatch):
    client = doctor_client(monkeypatch)
    service_called = False

    def create(*_args):
        nonlocal service_called
        service_called = True

    monkeypatch.setattr(doctor_portal_api.consultation_service, "create", create)

    response = client.post(
        "/api/doctor/appointments/APT-1/consultation",
        json={"meeting_url": "http://meet.example.test/room", "diagnosis_notes": ""},
    )

    assert response.status_code == 400
    assert not service_called


def test_update_consultation_saves_notes_and_meeting_url(monkeypatch):
    client = doctor_client(monkeypatch)
    session = SimpleNamespace(
        session_id="CONSULT-1",
        diagnosis_notes="Chẩn đoán:\nĐau đầu",
        meeting_url="https://meet.example.test/updated",
    )
    calls = []

    def update_notes(*args):
        calls.append(args)
        return session

    monkeypatch.setattr(doctor_portal_api.consultation_service, "update_notes", update_notes)

    response = client.patch(
        "/api/doctor/consultations/CONSULT-1",
        json={
            "diagnosis_notes": session.diagnosis_notes,
            "meeting_url": session.meeting_url,
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "session_id": "CONSULT-1",
        "diagnosis_notes": session.diagnosis_notes,
    }
    assert calls[0][1:] == (
        "CONSULT-1",
        session.diagnosis_notes,
        session.meeting_url,
    )


def test_consultation_finish_under_5m_and_over_30m_and_duplicate_medication(app, monkeypatch):
    from datetime import timedelta, time
    import pytest
    from conftest import sql
    from app.services.common import BusinessError, identity, now
    from app.services import consultations as consultation_service, prescriptions as prescription_service
    from app.repositories import auth

    if not app.config.get("MYSQL_DATABASE"):
        pytest.skip("Requires MySQL fixture")

    current = now()
    today = current.date()

    with app.app_context():
        doc_user = auth.find_by_username("doctor_gp")

        # 1. Duration calculation: < 5m returns 5m, 5..30m returns exact minutes, >30m raises BusinessError
        assert consultation_service.duration(current - timedelta(minutes=1), current) == 5
        assert consultation_service.duration(current - timedelta(seconds=10), current) == 5
        assert consultation_service.duration(current - timedelta(minutes=12), current) == 12
        with pytest.raises(BusinessError):
            consultation_service.duration(current - timedelta(minutes=31), current)

        # 2. Overdue (>30m after appointment start): finish() MUST NOT complete and MUST mark appointment No-show
        past_day = today - timedelta(days=1)
        appt_late = identity("APT-")
        sess_late = identity("SES-")
        late_begin = datetime.combine(past_day, time(10, 0))
        sql(
            app,
            """INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id,
                                        appointment_date_time, estimated_duration_minutes, appointment_type, status, reason)
               VALUES (%s, 'PAT-001', 'DOC-001', 'SCH-001', 'USER-001', %s, 30, 'In-person', 'Checked-In', 'Late session')""",
            (appt_late, late_begin),
        )
        # Insert unclosed session directly via Completed->Checked-In workaround? No: simulate overdue appointment at finish()
        # by inserting session while temporarily skipping trigger? Wait: create on yesterday's window isn't allowed by trigger,
        # so test finish() overdue via monkeypatching consultations.get + appointments.get? No: test real DB with current slot if in clinic hours OR test create() directly on overdue Checked-In!
        with pytest.raises(BusinessError) as exc_create_late:
            consultation_service.create(doc_user, appt_late, {
                "start_time": late_begin + timedelta(minutes=2),
                "end_time": None,
                "actual_duration_minutes": None,
                "meeting_url": None,
                "diagnosis_notes": "Late check",
            })
        assert "No-show" in str(exc_create_late.value) or "Vắng mặt" in str(exc_create_late.value)
        assert sql(app, "SELECT status FROM appointment WHERE appointment_id=%s", (appt_late,), one=True)["status"] == "No-show"

        # 3. End-to-end DB test of <5m finish + duplicate medication check using an active office-hour slot covering now()
        slot_start = current.replace(minute=0 if current.minute < 30 else 30, second=0, microsecond=0)
        slot_end = slot_start + timedelta(minutes=30)
        in_office_hours = (
            (time(8, 0) <= slot_start.time() and slot_end.time() <= time(12, 0))
            or (time(13, 0) <= slot_start.time() and slot_end.time() <= time(17, 0))
        )
        if in_office_hours:
            sched_now = identity("SCH-")
            appt_fast = identity("APT-")
            sql(
                app,
                "INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, 'DOC-001', %s, '08:00:00', '17:00:00', 'Available')",
                (sched_now, today),
            )
            sql(
                app,
                """INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id,
                                            appointment_date_time, estimated_duration_minutes, appointment_type, status, reason)
                   VALUES (%s, 'PAT-001', 'DOC-001', %s, 'USER-001', %s, 30, 'In-person', 'Checked-In', 'Fast session')""",
                (appt_fast, sched_now, slot_start),
            )
            sess_start = max(current - timedelta(seconds=10), slot_start)
            sess_fast = consultation_service.create(doc_user, appt_fast, {
                "start_time": sess_start,
                "end_time": None,
                "actual_duration_minutes": None,
                "meeting_url": None,
                "diagnosis_notes": "Fast check",
            })
            finished = consultation_service.finish(doc_user, sess_fast.session_id)
            assert finished.actual_duration_minutes == 5
            assert sql(app, "SELECT status FROM appointment WHERE appointment_id=%s", (appt_fast,), one=True)["status"] == "Completed"
            assert sql(app, "SELECT actual_duration_minutes FROM consultation_session WHERE session_id=%s", (sess_fast.session_id,), one=True)["actual_duration_minutes"] == 5

            # Also verify overdue finish() marks No-show and persists even across transaction boundary (using DOC-002)
            doc_spec = auth.find_by_username("doctor_specialist")
            sched_now_2 = identity("SCH-")
            appt_late2 = identity("APT-")
            sql(
                app,
                "INSERT INTO doctor_schedule (schedule_id, doctor_id, schedule_date, start_time, end_time, availability_status) VALUES (%s, 'DOC-002', %s, '08:00:00', '17:00:00', 'Available')",
                (sched_now_2, today),
            )
            sql(
                app,
                """INSERT INTO appointment (appointment_id, patient_id, doctor_id, schedule_id, booked_by_user_id,
                                            appointment_date_time, estimated_duration_minutes, appointment_type, status, reason)
                   VALUES (%s, 'PAT-002', 'DOC-002', %s, 'USER-001', %s, 30, 'In-person', 'Checked-In', 'Late finish test')""",
                (appt_late2, sched_now_2, slot_start),
            )
            sess_late2 = consultation_service.create(doc_spec, appt_late2, {
                "start_time": sess_start,
                "end_time": None,
                "actual_duration_minutes": None,
                "meeting_url": None,
                "diagnosis_notes": "Late finish check",
            })
            monkeypatch.setattr(consultation_service, "now", lambda: slot_end + timedelta(minutes=1))
            with pytest.raises(BusinessError) as exc_fin_late:
                consultation_service.finish(doc_spec, sess_late2.session_id)
            assert "No-show" in str(exc_fin_late.value) or "Vắng mặt" in str(exc_fin_late.value)
            assert sql(app, "SELECT status FROM appointment WHERE appointment_id=%s", (appt_late2,), one=True)["status"] == "No-show"
            assert sql(app, "SELECT end_time FROM consultation_session WHERE session_id=%s", (sess_late2.session_id,), one=True)["end_time"] is None

        # 4. Duplicate medication by ID or normalized name is rejected on completed SES-001
        with pytest.raises(BusinessError):
            prescription_service.create(doc_user, "SES-001", {
                "items": [
                    {"medication_id": "MED-001", "dosage": "1v", "frequency": "2/d", "duration": "5d"},
                    {"medication_id": "MED-001", "dosage": "1v", "frequency": "2/d", "duration": "5d"},
                ]
            })
        med_dup = identity("MED-")
        sql(app, "INSERT INTO medication (medication_id, medication_name) VALUES (%s, '  cetirizine   10 mg (demo) ')", (med_dup,))
        with pytest.raises(BusinessError) as exc_dup_name:
            prescription_service.create(doc_user, "SES-001", {
                "items": [
                    {"medication_id": "MED-001", "dosage": "1v", "frequency": "2/d", "duration": "5d"},
                    {"medication_id": med_dup, "dosage": "1v", "frequency": "2/d", "duration": "5d"},
                ]
            })
        assert "trùng" in str(exc_dup_name.value).lower()
