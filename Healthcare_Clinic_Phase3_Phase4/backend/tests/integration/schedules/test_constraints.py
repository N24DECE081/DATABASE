from datetime import timedelta
import mysql.connector
import pytest
from conftest import sql
from app.services.common import now

pytestmark = pytest.mark.mysql


def test_database_rejects_overlapping_shift_and_changes_to_referenced_shift(app):
    day=now().date()+timedelta(days=1)
    with pytest.raises(mysql.connector.Error) as overlap:
        sql(app,"INSERT INTO doctor_schedule VALUES('S_OVERLAP','D_GP',%s,'09:00','11:00','Available')",(day,))
    assert overlap.value.errno == 1644
    with pytest.raises(mysql.connector.Error) as referenced:
        sql(app,"UPDATE doctor_schedule SET start_time='08:30' WHERE schedule_id='S_D_GP_1'")
    assert referenced.value.errno == 1644


def test_patient_future_birth_and_invalid_domain_are_rejected(app):
    with pytest.raises(mysql.connector.Error) as future:
        sql(app,"UPDATE patient SET date_of_birth=DATE_ADD(CURRENT_DATE(),INTERVAL 1 DAY) WHERE patient_id='P1'")
    assert future.value.errno == 1644
    with pytest.raises(mysql.connector.Error) as domain:
        sql(app,"UPDATE appointment SET estimated_duration_minutes=20 WHERE appointment_id='A_GP'")
    assert domain.value.errno == 3819
