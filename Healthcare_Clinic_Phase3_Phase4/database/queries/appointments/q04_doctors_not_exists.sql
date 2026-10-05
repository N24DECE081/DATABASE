-- Purpose: NOT EXISTS conflict search. Owner: La Vinh Tien. BR35-36.
-- Requires: seed. Expected: both demo doctors free tomorrow 14:00-14:30 initially.
SET @range_start = TIMESTAMP(DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '14:00:00');
SET @range_end = DATE_ADD(@range_start, INTERVAL 30 MINUTE);
SELECT d.doctor_id, d.full_name FROM doctor d
WHERE NOT EXISTS (SELECT 1 FROM appointment a WHERE a.doctor_id = d.doctor_id
    AND a.status NOT IN ('Cancelled','No-show') AND a.appointment_date_time < @range_end
    AND DATE_ADD(a.appointment_date_time, INTERVAL a.estimated_duration_minutes MINUTE) > @range_start);
