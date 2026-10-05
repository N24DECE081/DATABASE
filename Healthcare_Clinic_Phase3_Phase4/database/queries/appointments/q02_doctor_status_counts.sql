-- Purpose: GROUP BY workload by doctor/status. Owner: La Vinh Tien. BR30-36.
-- Requires: synthetic seed. Expected: multiple status groups with retained historical visits.
SELECT d.doctor_id, d.full_name, a.status, COUNT(*) AS appointment_count
FROM doctor d JOIN appointment a ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name, a.status ORDER BY d.doctor_id, a.status;
