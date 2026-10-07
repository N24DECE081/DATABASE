import pytest
import mysql.connector
from conftest import login, post, sql

pytestmark = pytest.mark.mysql


def test_disjoint_subtypes_are_enforced_in_database(app):
    with pytest.raises(mysql.connector.Error) as error:
        sql(app,"INSERT INTO specialist(doctor_id,specialty_id) VALUES('D_GP','T_DEMO')")
    assert error.value.errno == 1644


def test_missing_subtype_is_detected_before_doctor_can_be_used(app):
    sql(app,"""INSERT INTO user_account VALUES('U_ORPHAN','orphan','test-hash','DOCTOR','Active',CURRENT_TIMESTAMP)""")
    sql(app,"INSERT INTO doctor VALUES('D_ORPHAN','U_ORPHAN','Orphan Demo','0000','orphan@example.invalid','DEMO-ORPHAN')")
    with pytest.raises(mysql.connector.Error) as error:
        sql(app,"""INSERT INTO doctor_schedule VALUES('S_ORPHAN','D_ORPHAN',CURRENT_DATE(),'08:00','09:00','Available')""")
    assert error.value.errno == 1644


def test_account_profile_subtype_creation_is_atomic(app,client):
    login(client,"admin")
    response=post(client,"/admin/accounts/new",{"username":"new_gp","password":"StrongDemo!2026","role":"DOCTOR",
        "full_name":"New Demo GP","phone":"0000000004","email":"new.demo.gp@gmail.com","license_number":"DEMO-NEW",
        "subtype":"GENERAL_PRACTITIONER","specialty_id":"","gender":"Other"})
    assert response.status_code == 302
    row=sql(app,"""SELECT d.doctor_id FROM doctor d JOIN user_account u ON u.user_id=d.user_id
        JOIN general_practitioner gp ON gp.doctor_id=d.doctor_id WHERE u.username='new_gp'""",one=True)
    assert row
    duplicate=post(client,"/admin/accounts/new",{"username":"new_gp","password":"StrongDemo!2026","role":"DOCTOR",
        "full_name":"Duplicate Demo GP","phone":"0000000005","email":"duplicate.demo.gp@gmail.com","license_number":"DEMO-DUP",
        "subtype":"GENERAL_PRACTITIONER","specialty_id":"","gender":"Other"})
    assert duplicate.status_code == 200
    assert "Thông tin đã tồn tại" in duplicate.get_data(as_text=True)
    response=post(client,"/admin/accounts/new",{"username":"bad_gp","password":"StrongDemo!2026","role":"DOCTOR",
        "full_name":"Bad Demo GP","phone":"0000000004","email":"bad.demo.gp@gmail.com","license_number":"",
        "subtype":"GENERAL_PRACTITIONER","specialty_id":"","gender":"Other"})
    assert response.status_code == 200
    assert "Cần email và số giấy phép bác sĩ." in response.get_data(as_text=True)
    assert not sql(app,"SELECT user_id FROM user_account WHERE username='bad_gp'")


def test_doctor_can_update_only_own_profile(client):
    login(client,'doctor_gp')
    assert client.get('/doctors/D_SP/edit').status_code==403
    response=post(client,'/doctors/D_GP/edit',{'full_name':'Updated Demo GP','phone':'0000000002',
        'email':'gp.demo@gmail.com','license_number':'DEMO-GP-001'})
    assert response.status_code==302
    assert 'Updated Demo GP' in client.get('/doctors/').get_data(as_text=True)
