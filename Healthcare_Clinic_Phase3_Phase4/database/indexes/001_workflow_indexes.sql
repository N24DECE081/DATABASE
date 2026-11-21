-- Purpose: booking locks, clinical lookup and assessed query indexes. Owner: Nguyen Duong Thanh Mai.
-- Requires: schema. Verify: EXPLAIN Q01/Q07/Q08; no duplicate PK/UNIQUE indexes.
CREATE INDEX ix_appointment_doctor_time_status ON appointment(doctor_id, appointment_date_time, status);
CREATE INDEX ix_appointment_patient_time ON appointment(patient_id, appointment_date_time);
CREATE INDEX ix_history_session_record ON medical_history(session_id, record_date);
CREATE INDEX ix_prescription_session_date ON prescription(session_id, prescription_date);
