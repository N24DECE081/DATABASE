"""Administrative account and operational aggregate reads."""
from ...db import query, execute


def accounts():
    return query("SELECT user_id, username, role, account_status, created_at FROM user_account ORDER BY created_at DESC")


def counts():
    return query("""SELECT (SELECT COUNT(*) FROM patient) AS patients,
         (SELECT COUNT(*) FROM doctor) AS doctors,
         (SELECT COUNT(*) FROM appointment WHERE DATE(appointment_date_time) = CURRENT_DATE()) AS today,
         (SELECT COUNT(*) FROM appointment WHERE status = 'Scheduled') AS scheduled""", one=True)


def set_status(user_id, status):
    return execute("UPDATE user_account SET account_status = %s WHERE user_id = %s", (status, user_id))
