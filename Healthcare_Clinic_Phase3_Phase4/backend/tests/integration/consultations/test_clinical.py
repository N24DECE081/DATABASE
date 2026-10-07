from datetime import timedelta
import pytest
import mysql.connector
from conftest import login, post, sql
from app.services.common import now

pytestmark = pytest.mark.mysql


def test_end_to_end_ongoing_session_finish_history_prescription_and_patient_read(app, client):
    login(client,"doctor_gp")
    assert post(client,"/appointments/A_GP/status",{"status":"Checked-In"}).status_code == 302
    begins=now()-timedelta(minutes=10)
    response=post(client,"/consultations/new/A_GP",{"start_time":begins.strftime("%Y-%m-%dT%H:%M"),
        "end_time":"", "actual_duration_minutes":"10", "meeting_url":"", "diagnosis_notes":"Synthetic E2E notes"})
    assert response.status_code == 302
    session=sql(app,"SELECT * FROM consultation_session WHERE appointment_id='A_GP'",one=True)
    assert session["end_time"] is None
    response = post(client,f"/medical-history/new/{session['session_id']}",{"diagnosis":"E2E synthetic diagnosis","symptoms":"Synthetic symptoms"})
    assert response.status_code == 200
    assert "Completed" in response.get_data(as_text=True)
    assert post(client,f"/consultations/{session['session_id']}/finish",{"end_time":now().strftime("%Y-%m-%dT%H:%M")}).status_code == 302
    assert sql(app,"SELECT status FROM appointment WHERE appointment_id='A_GP'",one=True)["status"] == "Completed"
    assert post(client,f"/medical-history/new/{session['session_id']}",{"diagnosis":"E2E synthetic diagnosis","symptoms":"Synthetic symptoms"}).status_code == 302
    response=post(client,f"/prescriptions/new/{session['session_id']}",{"instructions":"Synthetic instructions",
        "items-0-medication_id":"M_A","items-0-dosage":"Demo dose","items-0-frequency":"Demo frequency","items-0-duration":"Demo course"})
    assert response.status_code == 302
    assert post(client,"/auth/logout").status_code == 302
    login(client,"patient_one")
    assert "E2E synthetic diagnosis" in client.get("/medical-history/").get_data(as_text=True)
    assert "Synthetic instructions" in client.get(response.headers["Location"]).get_data(as_text=True)


def test_prescription_failure_rolls_back_header_and_previous_items(app):
    from app.repositories.auth import find_by_id
    from app.services.prescriptions import create
    from werkzeug.exceptions import NotFound
    before=sql(app,"SELECT COUNT(*) AS n FROM prescription",one=True)["n"]
    with app.app_context():
        user=find_by_id("U_GP")
        with pytest.raises(NotFound):
            create(user,"C_COMPLETED",{"items":[
                {"medication_id":"M_A","dosage":"Demo","frequency":"Demo","duration":"Demo"},
                {"medication_id":"MISSING","dosage":"Demo","frequency":"Demo","duration":"Demo"}]})
    assert sql(app,"SELECT COUNT(*) AS n FROM prescription",one=True)["n"] == before
    assert sql(app,"SELECT COUNT(*) AS n FROM prescription_item",one=True)["n"] == 2


def test_database_blocks_wrong_modality_duplicate_session_and_history_delete(app):
    sql(app,"UPDATE appointment SET status='Checked-In' WHERE appointment_id='A_VIRTUAL'")
    with pytest.raises(mysql.connector.Error) as invalid:
        sql(app,"""INSERT INTO consultation_session(session_id,appointment_id,start_time,end_time,
            actual_duration_minutes,session_type) VALUES('C_BAD','A_VIRTUAL',%s,NULL,10,'In-person')""",(now()-timedelta(minutes=10),))
    assert invalid.value.errno == 1644
    with pytest.raises(mysql.connector.Error) as duplicate:
        sql(app,"""INSERT INTO consultation_session(session_id,appointment_id,start_time,end_time,
            actual_duration_minutes,session_type) SELECT 'C_DUP',appointment_id,start_time,end_time,
            actual_duration_minutes,session_type FROM consultation_session WHERE session_id='C_COMPLETED'""")
    assert duplicate.value.errno == 1062
    with pytest.raises(mysql.connector.Error) as archived:
        sql(app,"DELETE FROM medical_history WHERE medical_history_id='H_DEMO'")
    assert archived.value.errno == 1644


def test_virtual_session_uses_virtual_type_and_patient_can_open_meeting_link(app,client):
    login(client,'doctor_specialist')
    assert post(client,'/appointments/A_VIRTUAL/status',{'status':'Checked-In'}).status_code==302
    response=post(client,'/consultations/new/A_VIRTUAL',{'start_time':(now()-timedelta(minutes=10)).strftime('%Y-%m-%dT%H:%M'),
        'end_time':'','actual_duration_minutes':'10','meeting_url':'https://example.invalid/demo-room','diagnosis_notes':'Synthetic virtual notes'})
    assert response.status_code==302
    row=sql(app,"SELECT * FROM consultation_session WHERE appointment_id='A_VIRTUAL'",one=True)
    assert row['session_type']=='Virtual' and row['end_time'] is None
    login(client,'patient_two')
    html=client.get(response.headers['Location']).get_data(as_text=True)
    assert 'https://example.invalid/demo-room' in html and 'noopener noreferrer' in html
