-- Purpose: monthly medication aggregate. Owner: Nguyen Thanh Tuyen. BR49-50.
-- Requires: seed. Expected: both demo formulary items have usage_count=1 in seed month.
SELECT DATE_FORMAT(rx.prescription_date, '%Y-%m') AS prescription_month,
       m.medication_id, m.medication_name, COUNT(*) AS usage_count
FROM prescription rx JOIN prescription_item pi ON pi.prescription_id = rx.prescription_id
JOIN medication m ON m.medication_id = pi.medication_id
GROUP BY prescription_month, m.medication_id, m.medication_name ORDER BY prescription_month, usage_count DESC;
