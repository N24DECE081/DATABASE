-- Purpose: BR45,53-54 / IC7: completed appointments and permanent history.
-- Owner: Nguyen Duong Thanh Mai. Requires: schema. Verify: clinical transaction tests.
DELIMITER $$
CREATE PROCEDURE validate_completed_session(IN sid VARCHAR(20))
SQL SECURITY DEFINER
BEGIN
    DECLARE state_value VARCHAR(15);
    SELECT a.status INTO state_value FROM appointment a JOIN consultation_session cs
        ON cs.appointment_id = a.appointment_id WHERE cs.session_id = sid FOR UPDATE;
    IF state_value IS NULL OR state_value <> 'Completed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Clinical records require a completed appointment.';
    END IF;
END$$
CREATE TRIGGER history_before_insert BEFORE INSERT ON medical_history FOR EACH ROW
BEGIN CALL validate_completed_session(NEW.session_id); END$$
CREATE TRIGGER history_before_update BEFORE UPDATE ON medical_history FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Medical history is an append-only archive.';
END$$
CREATE TRIGGER history_before_delete BEFORE DELETE ON medical_history FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Medical history cannot be deleted.';
END$$
CREATE TRIGGER prescription_before_insert BEFORE INSERT ON prescription FOR EACH ROW
BEGIN CALL validate_completed_session(NEW.session_id); END$$
CREATE TRIGGER prescription_before_update BEFORE UPDATE ON prescription FOR EACH ROW
BEGIN
    CALL validate_completed_session(NEW.session_id);
    IF NEW.session_id <> OLD.session_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Prescription session cannot be reassigned.';
    END IF;
END$$
CREATE TRIGGER prescription_item_before_delete BEFORE DELETE ON prescription_item FOR EACH ROW
BEGIN
    IF (SELECT COUNT(*) FROM prescription_item WHERE prescription_id = OLD.prescription_id) <= 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: A prescription must retain at least one item.';
    END IF;
END$$
DELIMITER ;
