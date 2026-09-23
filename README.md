# Healthcare Clinic & Telemedicine Portal

## Team

**Team Name:** TiTiMi

* Nguyễn Dương Thanh Mai – MSSV: N24DECE081
* La Vĩnh Tiến – MSSV: N24DECE095
* Nguyễn Thanh Tuyền – MSSV: N24DECE103

---

## Project Overview

The Healthcare Clinic & Telemedicine Portal is a centralized database system designed to support comprehensive healthcare information management, clinical workflow coordination, and administrative operations for a clinic providing both traditional in-person consultations and telemedicine services.

The system manages multi-role user authentication and access control, patient profiles, doctor information, doctor schedules, appointment booking, follow-up appointments, consultation sessions, medical histories, and digital prescriptions.

The primary objective is to provide a centralized and normalized database that maintains healthcare information in a consistent, secure, accurate, and reliable manner. The system must prevent scheduling conflicts and enforce strong relationships between doctors, schedules, appointments, consultation sessions, medical histories, and prescriptions.

---

## User Roles

The system applies Role-Based Access Control (RBAC) with three main roles:

### ADMIN

Responsible for system administration and clinic administrative operations, including managing user accounts, doctors, schedules, and appointments.

### DOCTOR

Responsible for clinical activities, including managing schedules, conducting consultation sessions, recording medical histories, issuing prescriptions, and creating follow-up appointments.

### PATIENT

A person who has healthcare needs and uses healthcare services. Patients can manage their personal information, search for available healthcare services, book appointments based on their preferred time or doctor, and access their personal medical information.

---

## Main Objectives

1. To manage user credentials and enforce Role-Based Access Control (RBAC) across ADMIN, DOCTOR, and PATIENT roles.
2. To maintain centralized patient profiles containing demographic, contact, emergency contact, and baseline clinical information.
3. To manage doctor information and professional credentials.
4. To distinguish General Practitioners from Specialists using Total and Disjoint EER specialization.
5. To link medical specialists to their corresponding clinical specialties.
6. To manage doctors' working schedules and availability while preventing overlapping schedule slots.
7. To coordinate appointment bookings and support patient self-booking, administrator-assisted booking, and doctor-created follow-up appointments.
8. To manage consultation sessions and enforce that each consultation session is based on a valid appointment.
9. To record actual consultation start time, end time, duration, modality, and clinical notes.
10. To maintain longitudinal medical history and diagnosis records.
11. To manage prescriptions issued by attending doctors during valid clinical sessions.
12. To maintain data integrity and prevent inconsistent healthcare records.
13. To provide a rigorous conceptual database model for later logical design, SQL implementation, and Python web development.

---

## System Scope

### User & Access Management

Storing and managing user accounts, authentication data, account status, and role assignments for ADMIN, DOCTOR, and PATIENT roles.

### Patient Profile Management

Storing patient identification, contact information, emergency contacts, blood type, allergies, and chronic diseases.

### Doctor Management

Storing doctor information, medical license numbers, professional credentials, and the EER specialization between General Practitioners and Specialists.

### Schedule Management

Recording doctors' available working periods, duty schedules, and preventing overlapping schedule slots.

### Appointment Management

Managing appointment booking, estimated consultation duration, appointment modality, operational status, self-booking, administrator-assisted booking, and doctor-created follow-up appointments.

### Consultation Session Management

Recording actual clinical encounters, validating prior appointments, tracking start/end timestamps and actual duration, and supporting both in-person and telemedicine consultations.

### Medical History

Maintaining longitudinal diagnoses, symptoms, clinical observations, and consultation notes.

### Digital Prescription

Recording prescriptions issued during valid consultation sessions, including medication, dosage, frequency, treatment duration, and special instructions.
