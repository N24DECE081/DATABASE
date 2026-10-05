-- Purpose: normalized clinical history chain / Q07. Owner: Nguyen Duong Thanh Mai.
-- Requires: schema. Verify: SELECT * FROM v_patient_history.
CREATE VIEW v_patient_history AS
SELECT mh.*, a.patient_id, a.doctor_id, a.appointment_id, d.full_name AS doctor_name
FROM medical_history mh JOIN consultation_session cs ON cs.session_id = mh.session_id
JOIN appointment a ON a.appointment_id = cs.appointment_id
JOIN doctor d ON d.doctor_id = a.doctor_id;
