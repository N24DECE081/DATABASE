-- Purpose: BR26-36,51-52 / IC6,8-9: schedule ownership, timing, follow-up and overlap.
-- Owner: Nguyen Duong Thanh Mai. Requires: schema. Verify: overlap and follow-up tests.
DELIMITER $$
CREATE PROCEDURE validate_appointment(IN aid VARCHAR(20), IN pid VARCHAR(20), IN did VARCHAR(20),
    IN sid VARCHAR(20), IN begins DATETIME, IN minutes_value INT, IN state_value VARCHAR(15),
    IN parent_id VARCHAR(20))
SQL SECURITY DEFINER
BEGIN
    DECLARE doctor_lock VARCHAR(20);
    DECLARE schedule_doctor VARCHAR(20);
    DECLARE schedule_day DATE;
    DECLARE schedule_start TIME;
    DECLARE schedule_end TIME;
    DECLARE schedule_state VARCHAR(15);
    SELECT doctor_id INTO doctor_lock FROM doctor WHERE doctor_id = did FOR UPDATE;
    SELECT doctor_id, schedule_date, start_time, end_time, availability_status
      INTO schedule_doctor, schedule_day, schedule_start, schedule_end, schedule_state
      FROM doctor_schedule WHERE schedule_id = sid FOR UPDATE;
    IF schedule_doctor IS NULL OR schedule_doctor <> did THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Schedule belongs to a different doctor.';
    END IF;
    IF DATE(begins) <> schedule_day OR TIME(begins) < schedule_start
       OR DATE(DATE_ADD(begins, INTERVAL minutes_value MINUTE)) <> schedule_day
       OR TIME(DATE_ADD(begins, INTERVAL minutes_value MINUTE)) > schedule_end THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Appointment is outside the working shift.';
    END IF;
    IF state_value NOT IN ('Cancelled', 'No-show') THEN
        IF schedule_state <> 'Available' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Working schedule is unavailable.';
        END IF;
        IF EXISTS (SELECT 1 FROM appointment WHERE doctor_id = did AND appointment_id <> aid
                   AND status NOT IN ('Cancelled', 'No-show')
                   AND appointment_date_time < DATE_ADD(begins, INTERVAL minutes_value MINUTE)
                   AND DATE_ADD(appointment_date_time, INTERVAL estimated_duration_minutes MINUTE) > begins) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor already has an overlapping appointment.';
        END IF;
    END IF;
    IF parent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM appointment WHERE appointment_id = parent_id AND appointment_id <> aid
        AND patient_id = pid AND doctor_id = did AND appointment_date_time < begins
        AND status NOT IN ('Cancelled', 'No-show')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Follow-up must reference a valid preceding appointment.';
    END IF;
END$$
CREATE TRIGGER appointment_before_insert BEFORE INSERT ON appointment FOR EACH ROW
BEGIN
    CALL validate_appointment(NEW.appointment_id, NEW.patient_id, NEW.doctor_id, NEW.schedule_id,
        NEW.appointment_date_time, NEW.estimated_duration_minutes, NEW.status, NEW.follow_up_from_appt_id);
END$$
CREATE TRIGGER appointment_before_update BEFORE UPDATE ON appointment FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM consultation_session WHERE appointment_id = OLD.appointment_id)
       AND (NEW.patient_id <> OLD.patient_id OR NEW.doctor_id <> OLD.doctor_id
            OR NEW.appointment_type <> OLD.appointment_type OR NEW.status IN ('Cancelled','No-show')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: A consultation protects its appointment context.';
    END IF;
    IF EXISTS (SELECT 1 FROM consultation_session cs JOIN medical_history mh ON mh.session_id = cs.session_id
               WHERE cs.appointment_id = OLD.appointment_id)
       OR EXISTS (SELECT 1 FROM consultation_session cs JOIN prescription rx ON rx.session_id = cs.session_id
                  WHERE cs.appointment_id = OLD.appointment_id) THEN
        IF NEW.status <> 'Completed' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Clinical records require a completed appointment.';
        END IF;
    END IF;
    CALL validate_appointment(NEW.appointment_id, NEW.patient_id, NEW.doctor_id, NEW.schedule_id,
        NEW.appointment_date_time, NEW.estimated_duration_minutes, NEW.status, NEW.follow_up_from_appt_id);
END$$
DELIMITER ;
