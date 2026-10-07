import pytest
from conftest import login, post, sql

pytestmark = pytest.mark.mysql


def profile_data(**overrides):
    return {"full_name":"Updated Synthetic Patient","date_of_birth":"2000-01-01","gender":"Other",
            "phone":"0000000000","email":"patient.demo@gmail.com","address":"Synthetic address",
            "blood_type":"","allergies":"","chronic_diseases":"","emergency_contact_name":"Demo Contact",
            "emergency_contact_phone":"0000000001", **overrides}


def test_patient_profile_update_cannot_change_patient_identity_or_other_account(app,client):
    login(client,'patient_one')
    assert client.get('/patients/account/USER-005/edit').status_code==403
    assert post(client,'/patients/profile',profile_data(patient_id='PAT-002',user_id='USER-005')).status_code==302
    own=sql(app,"SELECT * FROM patient WHERE patient_id='PAT-001'",one=True)
    other=sql(app,"SELECT * FROM patient WHERE patient_id='PAT-002'",one=True)
    assert own['user_id']=='USER-004' and own['full_name']=='Updated Synthetic Patient'
    assert own['blood_type'] is None and other['full_name']=='Trần Thu Hà'


def test_administrator_can_update_registered_patient_profile(app,client):
    login(client,'admin')
    assert post(client,'/patients/account/USER-005/edit',profile_data()).status_code==302
    assert sql(app,"SELECT full_name FROM patient WHERE patient_id='PAT-002'",one=True)['full_name']=='Updated Synthetic Patient'


@pytest.mark.parametrize(("overrides", "message"), [
    ({"date_of_birth":"2999-01-01"}, "Ngày sinh không được ở tương lai."),
    ({"phone":"09ab!"}, "Số điện thoại phải gồm đúng 10 chữ số"),
    ({"email":"email-khong-hop-le"}, "Email phải đúng định dạng"),
    ({"email":"patient@yahoo.com"}, "Email phải đúng định dạng"),
    ({"emergency_contact_phone":"123-abc"}, "Số điện thoại phải gồm đúng 10 chữ số"),
])
def test_invalid_profile_input_stays_on_form_and_preserves_values(app, client, overrides, message):
    login(client, "patient_one")
    submitted = profile_data(**overrides)
    response = post(client, "/patients/profile", submitted)
    html = response.get_data(as_text=True)
    assert response.status_code == 200
    assert message in html
    assert submitted["full_name"] in html
    assert sql(app, "SELECT full_name FROM patient WHERE patient_id='PAT-001'", one=True)["full_name"] == "Nguyễn Minh An"
