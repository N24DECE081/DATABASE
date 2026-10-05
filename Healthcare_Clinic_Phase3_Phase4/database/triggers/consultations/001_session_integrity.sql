-- Purpose: BR37-41,56 / IC7-8,11: nullable ongoing end time and session modality.
-- Owner: Nguyen Duong Thanh Mai. Requires: schema. Verify: session integration tests.
DELIMITER $$
CREATE PROCEDURE validate_session(IN aid VARCHAR(20), IN starts DATETIME, IN ends DATETIME,
                                 IN minutes_value INT, IN modality VARCHAR(15))
SQL SECURITY DEFINER
BEGIN
    DECLARE appointment_modality VARCHAR(15);
    DECLARE appointment_state VARCHAR(15);
    SELECT appointment_type, status INTO appointment_modality, appointment_state
        FROM appointment WHERE appointment_id = aid FOR UPDATE;
    IF appointment_state NOT IN ('Checked-In','Completed') OR appointment_state IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Consultation requires a checked-in or completed appointment.';
    END IF;
    IF (appointment_modality = 'Telemedicine' AND modality <> 'Virtual')
       OR (appointment_modality = 'In-person' AND modality <> 'In-person') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Consultation modality does not match appointment.';
    END IF;
    IF ends IS NOT NULL AND (ends <= starts OR TIMESTAMPDIFF(MINUTE, starts, ends) <> minutes_value) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Session duration must match its timestamps.';
    END IF;
END$$
CREATE TRIGGER session_before_insert BEFORE INSERT ON consultation_session FOR EACH ROW
BEGIN
    CALL validate_session(NEW.appointment_id, NEW.start_time, NEW.end_time, NEW.actual_duration_minutes, NEW.session_type);
END$$
CREATE TRIGGER session_before_update BEFORE UPDATE ON consultation_session FOR EACH ROW
BEGIN
    IF NEW.appointment_id <> OLD.appointment_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Session appointment cannot be reassigned.';
    END IF;
    IF OLD.end_time IS NOT NULL AND (NEW.start_time <> OLD.start_time OR NOT (NEW.end_time <=> OLD.end_time)
                                   OR NEW.actual_duration_minutes <> OLD.actual_duration_minutes) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Completed session timestamps are archived.';
    END IF;
    CALL validate_session(NEW.appointment_id, NEW.start_time, NEW.end_time, NEW.actual_duration_minutes, NEW.session_type);
END$$
DELIMITER ;
