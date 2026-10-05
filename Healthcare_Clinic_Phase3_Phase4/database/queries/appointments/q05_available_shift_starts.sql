-- Purpose: recursive 15-minute candidate grid, NOT EXISTS overlaps for 30-minute visits.
-- Owner: Nguyen Duong Thanh Mai. BR25/35/51-52. Expected: only available starts within tomorrow's shifts.
-- Grid is a search convention, not a capacity field or new entity.
SET @report_date = DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY);
WITH RECURSIVE candidates AS (
    SELECT schedule_id, doctor_id, TIMESTAMP(schedule_date, start_time) AS starts,
           TIMESTAMP(schedule_date, end_time) AS ends FROM doctor_schedule
    WHERE schedule_date = @report_date AND availability_status = 'Available'
    UNION ALL
    SELECT schedule_id, doctor_id, DATE_ADD(starts, INTERVAL 15 MINUTE), ends FROM candidates
    WHERE DATE_ADD(starts, INTERVAL 45 MINUTE) <= ends
)
SELECT c.schedule_id, c.doctor_id, c.starts FROM candidates c
WHERE DATE_ADD(c.starts, INTERVAL 30 MINUTE) <= c.ends AND NOT EXISTS (
    SELECT 1 FROM appointment a WHERE a.doctor_id = c.doctor_id AND a.status NOT IN ('Cancelled','No-show')
    AND a.appointment_date_time < DATE_ADD(c.starts, INTERVAL 30 MINUTE)
    AND DATE_ADD(a.appointment_date_time, INTERVAL a.estimated_duration_minutes MINUTE) > c.starts
) ORDER BY c.doctor_id, c.starts;
