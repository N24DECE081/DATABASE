-- Purpose: daily appointment multi-join. Owner: La Vinh Tien. BR26-29/51.
-- Requires: synthetic seed. Expected: tomorrow's booked patient/doctor/specialty/shift records.
SET @report_date = DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY);
SELECT a.appointment_id, p.full_name AS patient_name, d.full_name AS doctor_name,
       COALESCE(sp.specialty_name, 'General Practitioner') AS specialty_name,
       a.appointment_date_time, ds.start_time, ds.end_time, a.status
FROM appointment a JOIN patient p ON p.patient_id = a.patient_id
JOIN doctor d ON d.doctor_id = a.doctor_id JOIN doctor_schedule ds ON ds.schedule_id = a.schedule_id
LEFT JOIN specialist st ON st.doctor_id = d.doctor_id LEFT JOIN specialty sp ON sp.specialty_id = st.specialty_id
WHERE DATE(a.appointment_date_time) = @report_date ORDER BY a.appointment_date_time;
