-- Purpose: normalized appointment-session-history join. Owner: Nguyen Duong Thanh Mai. BR42-45/55.
-- Requires: seed. Expected: P1 synthetic diagnosis; no redundant patient/doctor columns in history table.
SELECT p.patient_id, p.full_name, mh.record_date, mh.diagnosis, mh.symptoms, d.full_name AS doctor_name
FROM medical_history mh JOIN consultation_session cs ON cs.session_id = mh.session_id
JOIN appointment a ON a.appointment_id = cs.appointment_id
JOIN patient p ON p.patient_id = a.patient_id JOIN doctor d ON d.doctor_id = a.doctor_id
ORDER BY p.patient_id, mh.record_date;
