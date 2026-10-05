-- Purpose: least-privilege app role; GRANT and REVOKE demonstration. Owner: Nguyen Thanh Tuyen.
-- Requires: bootstrap-created healthcare_app@127.0.0.1; run as local DBA, not Flask.
-- Scope: isolated project schema only. Passwords remain outside SQL/source control.
CREATE ROLE IF NOT EXISTS 'clinic_application';
GRANT SELECT, INSERT, UPDATE ON healthcare_clinic_portal.* TO 'clinic_application';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'healthcare_app'@'127.0.0.1';
GRANT 'clinic_application' TO 'healthcare_app'@'127.0.0.1';
SET DEFAULT ROLE 'clinic_application' TO 'healthcare_app'@'127.0.0.1';
