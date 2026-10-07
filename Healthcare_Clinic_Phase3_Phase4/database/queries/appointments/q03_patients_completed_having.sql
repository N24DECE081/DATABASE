-- Purpose: HAVING threshold for completed visits. Owner: La Vinh Tien. BR9-12.
-- Requires: seed. Expected: PAT-001 has at least one completed visit when threshold=0.
SET @minimum_visits = 0;
SELECT p.patient_id, p.full_name, COUNT(a.appointment_id) AS completed_visits
FROM patient p JOIN appointment a ON a.patient_id = p.patient_id AND a.status = 'Completed'
GROUP BY p.patient_id, p.full_name HAVING COUNT(a.appointment_id) > @minimum_visits;
