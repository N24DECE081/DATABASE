-- Purpose: conditional aggregation and ratio. Owner: Nguyen Thanh Tuyen. BR30/34.
-- Requires: seed. Expected: non-zero completed count for GP, all status totals remain auditable.
SELECT d.doctor_id, d.full_name, COUNT(a.appointment_id) AS total_visits,
       SUM(a.status = 'Completed') AS completed_visits,
       SUM(a.status = 'Cancelled') AS cancelled_visits, SUM(a.status = 'No-show') AS missed_visits,
       ROUND(SUM(a.status = 'Completed') / NULLIF(COUNT(a.appointment_id), 0), 3) AS completion_ratio
FROM doctor d LEFT JOIN appointment a ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name;
