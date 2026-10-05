-- Purpose: operational multi-join view / Q01. Owner: Nguyen Duong Thanh Mai.
-- Requires: schema. Verify: SELECT * FROM v_appointment_details.
CREATE VIEW v_appointment_details AS
SELECT a.*, p.full_name AS patient_name, d.full_name AS doctor_name,
       COALESCE(sp.specialty_name, 'General Practitioner') AS specialty_name,
       ds.schedule_date, ds.start_time AS shift_start, ds.end_time AS shift_end,
       cs.session_id, cs.end_time AS session_end_time
FROM appointment a
JOIN patient p ON p.patient_id = a.patient_id
JOIN doctor d ON d.doctor_id = a.doctor_id
JOIN doctor_schedule ds ON ds.schedule_id = a.schedule_id
LEFT JOIN specialist st ON st.doctor_id = d.doctor_id
LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
LEFT JOIN consultation_session cs ON cs.appointment_id = a.appointment_id;
