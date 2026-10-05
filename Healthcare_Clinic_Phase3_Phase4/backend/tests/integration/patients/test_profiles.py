import pytest
from conftest import login, post, sql

pytestmark = pytest.mark.mysql


def profile_data(**overrides):
    return {"full_name":"Updated Synthetic Patient","date_of_birth":"2000-01-01","gender":"Other",
            "phone":"0000000000","email":"patient@example.invalid","address":"Synthetic address",
            "blood_type":"","allergies":"","chronic_diseases":"","emergency_contact_name":"Demo Contact",
            "emergency_contact_phone":"0000000001", **overrides}


def test_patient_profile_update_cannot_change_patient_identity_or_other_account(app,client):
    login(client,'patient_one')
    assert client.get('/patients/account/U_PATIENT2/edit').status_code==403
    assert post(client,'/patients/profile',profile_data(patient_id='P2',user_id='U_PATIENT2')).status_code==302
    own=sql(app,"SELECT * FROM patient WHERE patient_id='P1'",one=True)
    other=sql(app,"SELECT * FROM patient WHERE patient_id='P2'",one=True)
    assert own['user_id']=='U_PATIENT1' and own['full_name']=='Updated Synthetic Patient'
    assert own['blood_type'] is None and other['full_name']=='Demo Patient 2'


def test_administrator_can_update_registered_patient_profile(app,client):
    login(client,'admin')
    assert post(client,'/patients/account/U_PATIENT2/edit',profile_data()).status_code==302
    assert sql(app,"SELECT full_name FROM patient WHERE patient_id='P2'",one=True)['full_name']=='Updated Synthetic Patient'
