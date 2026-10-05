-- Purpose: prescription medication join / Q08. Owner: Nguyen Duong Thanh Mai.
-- Requires: schema. Verify: SELECT * FROM v_prescription_details.
CREATE VIEW v_prescription_details AS
SELECT rx.*, a.patient_id, a.doctor_id, d.full_name AS doctor_name,
       pi.prescription_item_id, pi.medication_id, m.medication_name,
       pi.dosage, pi.frequency, pi.duration, pi.special_instructions
FROM prescription rx JOIN consultation_session cs ON cs.session_id = rx.session_id
JOIN appointment a ON a.appointment_id = cs.appointment_id
JOIN doctor d ON d.doctor_id = a.doctor_id
JOIN prescription_item pi ON pi.prescription_id = rx.prescription_id
JOIN medication m ON m.medication_id = pi.medication_id;
