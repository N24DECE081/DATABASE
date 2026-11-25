-- Purpose: BR26-36,51-52 / IC6,8-9: schedule ownership, timing, follow-up and overlap.
-- Owner: Nguyen Duong Thanh Mai. Requires: schema. Verify: overlap and follow-up tests.
DELIMITER $$
CREATE PROCEDURE validate_appointment(IN aid VARCHAR(20), IN pid VARCHAR(20), IN did VARCHAR(20),
    IN sid VARCHAR(20), IN begins DATETIME, IN minutes_value INT, IN state_value VARCHAR(15),
    IN parent_id VARCHAR(20), IN enforce_slot_rules TINYINT, IN enforce_followup_limit TINYINT)
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
    IF state_value NOT IN ('Cancelled', 'No-show')
       AND TIME(begins) < '13:00:00'
       AND TIME(DATE_ADD(begins, INTERVAL minutes_value MINUTE)) > '12:00:00' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Appointment overlaps lunch break 12:00-13:00.';
    END IF;
    IF state_value NOT IN ('Cancelled', 'No-show') AND enforce_slot_rules = 1 THEN
        IF minutes_value IN (15, 45, 60) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Consultation slot duration must be 30 minutes.';
        END IF;
        IF SECOND(begins) <> 0 OR MINUTE(begins) NOT IN (0, 30) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Appointment start time must align to 30-minute slots.';
        END IF;
        IF NOT (
            (TIME(begins) >= '08:00:00' AND TIME(DATE_ADD(begins, INTERVAL 30 MINUTE)) <= '12:00:00')
            OR (TIME(begins) >= '13:00:00' AND TIME(DATE_ADD(begins, INTERVAL 30 MINUTE)) <= '17:00:00')
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Appointment must be within clinic hours (08:00-12:00 or 13:00-17:00).';
        END IF;
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
        IF EXISTS (SELECT 1 FROM appointment WHERE patient_id = pid AND appointment_id <> aid
                   AND status NOT IN ('Cancelled', 'No-show')
                   AND appointment_date_time < DATE_ADD(begins, INTERVAL minutes_value MINUTE)
                   AND DATE_ADD(appointment_date_time, INTERVAL estimated_duration_minutes MINUTE) > begins) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Patient already has an overlapping appointment.';
        END IF;
    END IF;
    IF parent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM appointment a
        JOIN consultation_session cs ON cs.appointment_id = a.appointment_id AND cs.end_time IS NOT NULL
        WHERE a.appointment_id = parent_id AND a.appointment_id <> aid
          AND a.patient_id = pid AND a.doctor_id = did AND a.appointment_date_time < begins
          AND a.status = 'Completed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Follow-up must reference a valid completed consultation session.';
    END IF;
    IF parent_id IS NOT NULL AND enforce_followup_limit = 1 AND state_value <> 'Cancelled' AND EXISTS (
        SELECT 1 FROM appointment WHERE follow_up_from_appt_id = parent_id
          AND appointment_id <> aid AND status <> 'Cancelled') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Each completed consultation session allows at most 1 follow-up appointment.';
    END IF;
END$$
CREATE TRIGGER appointment_before_insert BEFORE INSERT ON appointment FOR EACH ROW
BEGIN
    CALL validate_appointment(NEW.appointment_id, NEW.patient_id, NEW.doctor_id, NEW.schedule_id,
        NEW.appointment_date_time, NEW.estimated_duration_minutes, NEW.status, NEW.follow_up_from_appt_id, 1, 1);
END$$
CREATE TRIGGER appointment_before_update BEFORE UPDATE ON appointment FOR EACH ROW
BEGIN
    DECLARE enforce_slot TINYINT DEFAULT 0;
    DECLARE enforce_followup TINYINT DEFAULT 0;
    IF NEW.schedule_id <> OLD.schedule_id OR NEW.appointment_date_time <> OLD.appointment_date_time
       OR NEW.estimated_duration_minutes <> OLD.estimated_duration_minutes
       OR (OLD.status IN ('Cancelled', 'No-show') AND NEW.status NOT IN ('Cancelled', 'No-show')) THEN
        SET enforce_slot = 1;
    END IF;
    IF COALESCE(NEW.follow_up_from_appt_id, '') <> COALESCE(OLD.follow_up_from_appt_id, '')
       OR (OLD.status = 'Cancelled' AND NEW.status <> 'Cancelled') THEN
        SET enforce_followup = 1;
    END IF;
    IF NEW.status = 'Completed' AND OLD.status <> 'Completed'
       AND (OLD.status <> 'Checked-In'
            OR UTC_TIMESTAMP() + INTERVAL 7 HOUR < NEW.appointment_date_time
            OR UTC_TIMESTAMP() + INTERVAL 7 HOUR > DATE_ADD(NEW.appointment_date_time, INTERVAL NEW.estimated_duration_minutes MINUTE)
            OR NOT EXISTS (SELECT 1 FROM consultation_session cs
                           WHERE cs.appointment_id = OLD.appointment_id AND cs.end_time IS NOT NULL)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Completion requires a finished session inside the appointment window.';
    END IF;
    IF EXISTS (SELECT 1 FROM consultation_session WHERE appointment_id = OLD.appointment_id)
       AND (NEW.patient_id <> OLD.patient_id OR NEW.doctor_id <> OLD.doctor_id
            OR NEW.appointment_type <> OLD.appointment_type OR NEW.status = 'Cancelled') THEN
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
        NEW.appointment_date_time, NEW.estimated_duration_minutes, NEW.status, NEW.follow_up_from_appt_id,
        enforce_slot, enforce_followup);
END$$
CREATE PROCEDURE sp_auto_noshow_appointments()
SQL SECURITY DEFINER
BEGIN
    UPDATE appointment
    SET status = 'No-show'
    WHERE status IN ('Scheduled', 'Checked-In')
      AND DATE_ADD(appointment_date_time, INTERVAL 30 MINUTE) < UTC_TIMESTAMP() + INTERVAL 7 HOUR
      AND NOT EXISTS (SELECT 1 FROM consultation_session cs
                      WHERE cs.appointment_id = appointment.appointment_id AND cs.end_time IS NOT NULL);
END$$
CREATE EVENT IF NOT EXISTS ev_auto_noshow_appointments
ON SCHEDULE EVERY 1 MINUTE
DO CALL sp_auto_noshow_appointments()$$
DELIMITER ;
