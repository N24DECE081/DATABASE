-- Purpose: BR3-4,15-20 / IC5: role/profile matching and disjoint subtype writes.
-- Total specialization is guaranteed at application transaction commit and checked before doctor use.
-- Direct DBA INSERT DOCTOR without a subtype is detectable by the subtype audit, not blocked at INSERT.
-- Owner: La Vinh Tien. Requires: schema. Verify: subtype integration tests.
DELIMITER $$
CREATE TRIGGER patient_before_insert BEFORE INSERT ON patient FOR EACH ROW
BEGIN
    IF (SELECT role FROM user_account WHERE user_id = NEW.user_id) <> 'PATIENT' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Patient profile requires PATIENT account.';
    END IF;
    IF NEW.date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Date of birth cannot be in the future.';
    END IF;
END$$
CREATE TRIGGER patient_before_update BEFORE UPDATE ON patient FOR EACH ROW
BEGIN
    IF NEW.user_id <> OLD.user_id OR NEW.date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Invalid patient account or date of birth.';
    END IF;
END$$
CREATE TRIGGER doctor_before_insert BEFORE INSERT ON doctor FOR EACH ROW
BEGIN
    IF (SELECT role FROM user_account WHERE user_id = NEW.user_id) <> 'DOCTOR' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor profile requires DOCTOR account.';
    END IF;
END$$
CREATE TRIGGER doctor_before_update BEFORE UPDATE ON doctor FOR EACH ROW
BEGIN
    IF NEW.user_id <> OLD.user_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor account cannot be reassigned.';
    END IF;
END$$
CREATE TRIGGER account_before_update BEFORE UPDATE ON user_account FOR EACH ROW
BEGIN
    IF NEW.role <> OLD.role AND (EXISTS (SELECT 1 FROM patient WHERE user_id = OLD.user_id)
                               OR EXISTS (SELECT 1 FROM doctor WHERE user_id = OLD.user_id)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Profile account role cannot be changed.';
    END IF;
END$$
CREATE TRIGGER gp_before_insert BEFORE INSERT ON general_practitioner FOR EACH ROW
BEGIN
    DECLARE mutex VARCHAR(20);
    SELECT doctor_id INTO mutex FROM doctor WHERE doctor_id = NEW.doctor_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM specialist WHERE doctor_id = NEW.doctor_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor subtypes are disjoint.';
    END IF;
END$$
CREATE TRIGGER specialist_before_insert BEFORE INSERT ON specialist FOR EACH ROW
BEGIN
    DECLARE mutex VARCHAR(20);
    SELECT doctor_id INTO mutex FROM doctor WHERE doctor_id = NEW.doctor_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM general_practitioner WHERE doctor_id = NEW.doctor_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor subtypes are disjoint.';
    END IF;
END$$
CREATE TRIGGER gp_before_update BEFORE UPDATE ON general_practitioner FOR EACH ROW
BEGIN
    IF NEW.doctor_id <> OLD.doctor_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Subtype identity cannot be reassigned.';
    END IF;
END$$
CREATE TRIGGER specialist_before_update BEFORE UPDATE ON specialist FOR EACH ROW
BEGIN
    IF NEW.doctor_id <> OLD.doctor_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Subtype identity cannot be reassigned.';
    END IF;
END$$
CREATE TRIGGER gp_before_delete BEFORE DELETE ON general_practitioner FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor must retain its subtype.'; END$$
CREATE TRIGGER specialist_before_delete BEFORE DELETE ON specialist FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Doctor must retain its subtype.'; END$$
DELIMITER ;
