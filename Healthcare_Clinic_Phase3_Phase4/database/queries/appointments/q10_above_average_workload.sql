-- Purpose: aggregate CTE + scalar subquery. Owner: Nguyen Thanh Tuyen. BR35-36.
-- Requires: seed. Expected: GP workload above the two-doctor average initially.
WITH workload AS (
    SELECT d.doctor_id, d.full_name, COUNT(a.appointment_id) AS active_visits
    FROM doctor d LEFT JOIN appointment a ON a.doctor_id = d.doctor_id AND a.status NOT IN ('Cancelled','No-show')
    GROUP BY d.doctor_id, d.full_name
)
SELECT * FROM workload WHERE active_visits > (SELECT AVG(active_visits) FROM workload);
