-- Purpose: recursive follow-up traversal. Owner: Nguyen Duong Thanh Mai. BR31-32.
-- Requires: seed. Expected: APT-005 appears at depth=1 below APT-001.
WITH RECURSIVE visits AS (
    SELECT appointment_id, follow_up_from_appt_id, patient_id, 0 AS depth
    FROM appointment WHERE follow_up_from_appt_id IS NULL
    UNION ALL
    SELECT a.appointment_id, a.follow_up_from_appt_id, a.patient_id, v.depth + 1
    FROM appointment a JOIN visits v ON a.follow_up_from_appt_id = v.appointment_id
)
SELECT * FROM visits ORDER BY patient_id, depth, appointment_id;
