ALTER TABLE doctor ADD COLUMN date_of_birth DATE NULL;

DELIMITER $$
CREATE TRIGGER doctor_birth_date_before_insert BEFORE INSERT ON doctor FOR EACH ROW
BEGIN
    IF NEW.date_of_birth IS NOT NULL AND
       (YEAR(NEW.date_of_birth) = 0 OR MONTH(NEW.date_of_birth) = 0
        OR DAY(NEW.date_of_birth) = 0 OR LAST_DAY(NEW.date_of_birth) IS NULL
        OR DAY(NEW.date_of_birth) > DAY(LAST_DAY(NEW.date_of_birth))
        OR TIMESTAMPDIFF(YEAR, NEW.date_of_birth, DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)) NOT BETWEEN 22 AND 80) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Invalid doctor birth date.';
    END IF;
END$$
CREATE TRIGGER doctor_birth_date_before_update BEFORE UPDATE ON doctor FOR EACH ROW
BEGIN
    IF NEW.date_of_birth IS NOT NULL AND
       (YEAR(NEW.date_of_birth) = 0 OR MONTH(NEW.date_of_birth) = 0
        OR DAY(NEW.date_of_birth) = 0 OR LAST_DAY(NEW.date_of_birth) IS NULL
        OR DAY(NEW.date_of_birth) > DAY(LAST_DAY(NEW.date_of_birth))
        OR TIMESTAMPDIFF(YEAR, NEW.date_of_birth, DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)) NOT BETWEEN 22 AND 80) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CLINIC: Invalid doctor birth date.';
    END IF;
END$$
DELIMITER ;
