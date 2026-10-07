from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, time
from threading import Barrier

import pytest
import mysql.connector
from conftest import login, post, sql
from app.services.common import now, BusinessError

pytestmark = pytest.mark.mysql


def booking(**overrides):
    data = {"schedule_id":"SCH-002", "patient_id":"PAT-001",
            "appointment_date_time":datetime.combine(now().date()+timedelta(days=1),time(14)).strftime("%Y-%m-%dT%H:%M"),
            "estimated_duration_minutes":"30", "appointment_type":"In-person", "follow_up_from_appt_id":"", "reason":"Synthetic booking"}
    return {**data, **overrides}


def test_patient_booking_ignores_forged_patient_id(app, client):
    login(client,"patient_one")
    # The form also rejects a patient outside its choices; service never trusts the submitted ID.
    response = post(client,"/appointments/new",booking(patient_id="PAT-002"))
    assert response.status_code == 200
    response = post(client,"/appointments/new",booking())
    assert response.status_code == 302
    created=sql(app,"SELECT * FROM appointment WHERE reason=%s",("Synthetic booking",),one=True)
    assert created["patient_id"] == "PAT-001" and created["follow_up_from_appt_id"] is None


def test_overlap_and_outside_shift_leave_database_unchanged(app, client):
    login(client,"patient_one")
    day=now().date()+timedelta(days=1)
    assert post(client,"/appointments/new",booking(appointment_date_time=f"{day}T09:15")).status_code == 400
    assert post(client,"/appointments/new",booking(appointment_date_time=f"{day}T17:00")).status_code == 400
    assert sql(app,"SELECT COUNT(*) AS n FROM appointment",one=True)["n"] == 7


def test_cancelled_visit_is_retained_and_slot_can_be_rebooked(app, client):
    login(client,"patient_one")
    assert post(client,"/appointments/APT-002/status",{"status":"Cancelled"}).status_code == 302
    day=now().date()+timedelta(days=1)
    assert post(client,"/appointments/new",booking(appointment_date_time=f"{day}T09:00")).status_code == 302
    assert sql(app,"SELECT status FROM appointment WHERE appointment_id='APT-002'",one=True)["status"] == "Cancelled"


def test_database_rejects_mismatched_doctor_and_invalid_followup(app):
    template="""INSERT INTO appointment(appointment_id,patient_id,doctor_id,schedule_id,booked_by_user_id,
        appointment_date_time,estimated_duration_minutes,appointment_type,status,follow_up_from_appt_id)
        VALUES(%s,'PAT-001',%s,%s,'USER-001',%s,30,'In-person','Scheduled',%s)"""
    begins=datetime.combine(now().date()+timedelta(days=1),time(14))
    with pytest.raises(mysql.connector.Error) as mismatch:
        sql(app,template,("APT-901","DOC-002","SCH-002",begins,None))
    assert mismatch.value.errno == 1644
    with pytest.raises(mysql.connector.Error) as bad_parent:
        sql(app,template,("APT-902","DOC-001","SCH-002",begins,"APT-999"))
    assert bad_parent.value.errno == 1644


def test_concurrent_bookings_serialize_on_doctor_lock(app):
    from app.repositories.auth import find_by_id
    from app.services.appointments import book
    barrier=Barrier(2)
    def run(user_id):
        with app.app_context():
            user=find_by_id(user_id)
            data=booking()
            data["appointment_date_time"]=datetime.fromisoformat(data["appointment_date_time"])
            data["estimated_duration_minutes"]=30
            barrier.wait(timeout=10)
            try:
                book(user,data)
                return "booked"
            except (BusinessError,mysql.connector.Error):
                return "conflict"
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(run,("USER-004","USER-005")))
    assert sorted(results) == ["booked","conflict"]
    assert sql(app,"SELECT COUNT(*) AS n FROM appointment WHERE HOUR(appointment_date_time)=14",one=True)["n"] == 1


def test_direct_sql_concurrent_writes_with_old_read_snapshot_do_not_double_book(app):
    barrier=Barrier(2)
    begins=datetime.combine(now().date()+timedelta(days=1),time(14))
    def run(number):
        connection=mysql.connector.connect(host='127.0.0.1',port=3307,user='root',password='',
                                           database=app.config['MYSQL_DATABASE'],autocommit=False)
        try:
            with connection.cursor() as cursor:
                cursor.execute('SET innodb_lock_wait_timeout=5')
                cursor.execute('SELECT COUNT(*) FROM appointment')
                cursor.fetchone()
                barrier.wait(timeout=10)
                try:
                    cursor.execute("""INSERT INTO appointment(appointment_id,patient_id,doctor_id,schedule_id,
                        booked_by_user_id,appointment_date_time,estimated_duration_minutes,appointment_type,status)
                        VALUES(%s,%s,'DOC-001','SCH-002','USER-001',%s,30,'In-person','Scheduled')""",
                                   (f'APT-{900+number}',f'PAT-{number:03}',begins))
                    connection.commit()
                    return 'booked'
                except mysql.connector.Error as error:
                    connection.rollback()
                    assert error.errno in (1644,1213,1205)
                    return 'conflict'
        finally:
            connection.close()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(run,(1,2)))
    assert sorted(results)==['booked','conflict']


def test_admin_reschedule_preserves_creator_and_rejects_outside_shift(app,client):
    login(client,'admin')
    original=sql(app,"SELECT * FROM appointment WHERE appointment_id='APT-002'",one=True)
    data=booking()
    assert post(client,'/appointments/APT-002/reschedule',data).status_code==302
    updated=sql(app,"SELECT * FROM appointment WHERE appointment_id='APT-002'",one=True)
    assert updated['booked_by_user_id']==original['booked_by_user_id']
    assert updated['appointment_date_time'].hour==14
    day=now().date()+timedelta(days=1)
    assert post(client,'/appointments/APT-002/reschedule',booking(appointment_date_time=f'{day}T17:00')).status_code==400
    assert sql(app,"SELECT HOUR(appointment_date_time) AS h FROM appointment WHERE appointment_id='APT-002'",one=True)['h']==14
