-- Purpose: BR21-25 / IC5-6: valid subtype, ordered non-overlapping shifts.
-- Owner: Nguyen Duong Thanh Mai. Requires: initial schema. Verify: integration tests.
DELIMITER $$
CREATE PROCEDURE validate_schedule(IN sid VARCHAR(20), IN did VARCHAR(20), IN day_value DATE,
                                  IN starts TIME, IN ends TIME)
SQL SECURITY DEFINER
BEGIN
    DECLARE doctor_lock VARCHAR(20);
    SELECT doctor_id INTO doctor_lock FROM doctor WHERE doctor_id = did FOR UPDATE;
    IF (SELECT COUNT(*) FROM general_practitioner WHERE doctor_id = did)
       + (SELECT COUNT(*) FROM specialist WHERE doctor_id = did) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor must have exactly one subtype.';
    END IF;
    IF ends <= starts THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Schedule end must follow start.';
    END IF;
    IF EXISTS (SELECT 1 FROM doctor_schedule WHERE doctor_id = did AND schedule_date = day_value
               AND schedule_id <> sid AND start_time < ends AND end_time > starts) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Working schedules overlap.';
    END IF;
END$$
CREATE TRIGGER schedule_before_insert BEFORE INSERT ON doctor_schedule FOR EACH ROW
BEGIN
    CALL validate_schedule(NEW.schedule_id, NEW.doctor_id, NEW.schedule_date, NEW.start_time, NEW.end_time);
END$$
CREATE TRIGGER schedule_before_update BEFORE UPDATE ON doctor_schedule FOR EACH ROW
BEGIN
    IF (NEW.doctor_id <> OLD.doctor_id OR NEW.schedule_date <> OLD.schedule_date
        OR NEW.start_time <> OLD.start_time OR NEW.end_time <> OLD.end_time)
       AND EXISTS (SELECT 1 FROM appointment WHERE schedule_id = OLD.schedule_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Referenced schedule times cannot be changed.';
    END IF;
    CALL validate_schedule(NEW.schedule_id, NEW.doctor_id, NEW.schedule_date, NEW.start_time, NEW.end_time);
END$$
DELIMITER ;
