-- Purpose: prescription-session-appointment-item-medication join. Owner: Nguyen Duong Thanh Mai. BR46-50/55.
-- Requires: seed. Expected: two items in R_DEMO with synthetic dose/frequency/course text.
SELECT rx.prescription_id, a.patient_id, rx.prescription_date, m.medication_name,
       pi.dosage, pi.frequency, pi.duration, pi.special_instructions
FROM prescription rx JOIN consultation_session cs ON cs.session_id = rx.session_id
JOIN appointment a ON a.appointment_id = cs.appointment_id
JOIN prescription_item pi ON pi.prescription_id = rx.prescription_id
JOIN medication m ON m.medication_id = pi.medication_id ORDER BY rx.prescription_id, m.medication_name;
