-- Purpose: modality mismatch/missing-link audit. Owner: Nguyen Thanh Tuyen. BR56-57/IC11.
-- Requires: seed. Expected: zero findings for correctly seeded completed sessions.
-- Telemedicine / Virtual sessions require a valid HTTPS meeting URL.
SELECT a.appointment_id, cs.session_id, a.appointment_type, cs.session_type,
       CASE WHEN a.appointment_type = 'Telemedicine' AND cs.session_type <> 'Virtual' THEN 'Modality mismatch'
            WHEN a.appointment_type = 'In-person' AND cs.session_type <> 'In-person' THEN 'Modality mismatch'
            ELSE 'Required HTTPS meeting URL missing' END AS finding
FROM appointment a JOIN consultation_session cs ON cs.appointment_id = a.appointment_id
WHERE (a.appointment_type = 'Telemedicine' AND cs.session_type <> 'Virtual')
   OR (a.appointment_type = 'In-person' AND cs.session_type <> 'In-person')
   OR (cs.session_type = 'Virtual' AND (cs.meeting_url IS NULL OR cs.meeting_url = ''));
