-- Purpose: 13 baseline relations; approved EndTime NULL override.
-- Owner: La Vinh Tien. Source: Phase 2 dictionary + user decision 2026-10-05.
-- Requires: MySQL 8.0.16+; InnoDB; strict SQL mode; empty project schema.
-- Verify: scripts/verify_database.py; pytest integration suite.
SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE `user_account` (
  `user_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`user_id`),
  `username` VARCHAR(50) NOT NULL,
  UNIQUE KEY `uq_user_account_username` (`username`),
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(10) NOT NULL,
  CONSTRAINT `ck_user_account_role` CHECK (`role` IN ('ADMIN', 'DOCTOR', 'PATIENT')),
  `account_status` VARCHAR(15) NOT NULL DEFAULT 'Active',
  CONSTRAINT `ck_user_account_account_status` CHECK (`account_status` IN ('Active', 'Locked', 'Suspended')),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patient` (
  `patient_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`patient_id`),
  `user_id` VARCHAR(20) NOT NULL,
  UNIQUE KEY `uq_patient_user_id` (`user_id`),
  CONSTRAINT `fk_patient_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `full_name` VARCHAR(100) NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `gender` VARCHAR(10) NOT NULL,
  CONSTRAINT `ck_patient_gender` CHECK (`gender` IN ('Male', 'Female', 'Other')),
  `phone` VARCHAR(15) NOT NULL,
  `email` VARCHAR(100) NULL DEFAULT NULL,
  `address` VARCHAR(255) NULL DEFAULT NULL,
  `blood_type` VARCHAR(5) NULL DEFAULT NULL,
  CONSTRAINT `ck_patient_blood_type` CHECK (`blood_type` IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  `allergies` TEXT NULL DEFAULT NULL,
  `chronic_diseases` TEXT NULL DEFAULT NULL,
  `emergency_contact_name` VARCHAR(100) NOT NULL,
  `emergency_contact_phone` VARCHAR(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `specialty` (
  `specialty_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`specialty_id`),
  `specialty_name` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uq_specialty_specialty_name` (`specialty_name`),
  `description` TEXT NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctor` (
  `doctor_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`doctor_id`),
  `user_id` VARCHAR(20) NOT NULL,
  UNIQUE KEY `uq_doctor_user_id` (`user_id`),
  CONSTRAINT `fk_doctor_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uq_doctor_email` (`email`),
  `license_number` VARCHAR(50) NOT NULL,
  UNIQUE KEY `uq_doctor_license_number` (`license_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `general_practitioner` (
  `doctor_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`doctor_id`),
  CONSTRAINT `fk_general_practitioner_doctor_id` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`doctor_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `specialist` (
  `doctor_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`doctor_id`),
  CONSTRAINT `fk_specialist_doctor_id` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`doctor_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  `specialty_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_specialist_specialty_id` FOREIGN KEY (`specialty_id`) REFERENCES `specialty` (`specialty_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctor_schedule` (
  `schedule_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`schedule_id`),
  `doctor_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_doctor_schedule_doctor_id` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`doctor_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `schedule_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `availability_status` VARCHAR(15) NOT NULL DEFAULT 'Available',
  CONSTRAINT `ck_doctor_schedule_availability_status` CHECK (`availability_status` IN ('Available', 'Busy', 'On Leave')),
  CONSTRAINT `ck_schedule_time` CHECK (`end_time` > `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointment` (
  `appointment_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`appointment_id`),
  `patient_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_appointment_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `doctor_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_appointment_doctor_id` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`doctor_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `schedule_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_appointment_schedule_id` FOREIGN KEY (`schedule_id`) REFERENCES `doctor_schedule` (`schedule_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `booked_by_user_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_appointment_booked_by_user_id` FOREIGN KEY (`booked_by_user_id`) REFERENCES `user_account` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `follow_up_from_appt_id` VARCHAR(20) NULL DEFAULT NULL,
  CONSTRAINT `fk_appointment_follow_up_from_appt_id` FOREIGN KEY (`follow_up_from_appt_id`) REFERENCES `appointment` (`appointment_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `appointment_date_time` DATETIME NOT NULL,
  `estimated_duration_minutes` INT NOT NULL DEFAULT 30,
  CONSTRAINT `ck_appointment_estimated_duration_minutes` CHECK (`estimated_duration_minutes` IN (15, 30, 45, 60)),
  `appointment_type` VARCHAR(15) NOT NULL DEFAULT 'In-person',
  CONSTRAINT `ck_appointment_appointment_type` CHECK (`appointment_type` IN ('In-person', 'Telemedicine')),
  `status` VARCHAR(15) NOT NULL DEFAULT 'Scheduled',
  CONSTRAINT `ck_appointment_status` CHECK (`status` IN ('Scheduled', 'Checked-In', 'Completed', 'Cancelled', 'No-show')),
  `reason` TEXT NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `consultation_session` (
  `session_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`session_id`),
  `appointment_id` VARCHAR(20) NOT NULL,
  UNIQUE KEY `uq_consultation_session_appointment_id` (`appointment_id`),
  CONSTRAINT `fk_consultation_session_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`appointment_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NULL DEFAULT NULL,
  `actual_duration_minutes` INT NOT NULL,
  CONSTRAINT `ck_consultation_session_actual_duration_minutes` CHECK (`actual_duration_minutes` BETWEEN 5 AND 120),
  `session_type` VARCHAR(15) NOT NULL,
  CONSTRAINT `ck_consultation_session_session_type` CHECK (`session_type` IN ('In-person', 'Virtual')),
  `meeting_url` VARCHAR(255) NULL DEFAULT NULL,
  `diagnosis_notes` TEXT NULL DEFAULT NULL,
  CONSTRAINT `ck_session_time` CHECK (`end_time` IS NULL OR `end_time` > `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medical_history` (
  `medical_history_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`medical_history_id`),
  `session_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_medical_history_session_id` FOREIGN KEY (`session_id`) REFERENCES `consultation_session` (`session_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `record_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `diagnosis` VARCHAR(255) NOT NULL,
  `symptoms` TEXT NOT NULL,
  `progress_notes` TEXT NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medication` (
  `medication_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`medication_id`),
  `medication_name` VARCHAR(100) NOT NULL,
  UNIQUE KEY `uq_medication_medication_name` (`medication_name`),
  `description` TEXT NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `prescription` (
  `prescription_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`prescription_id`),
  `session_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_prescription_session_id` FOREIGN KEY (`session_id`) REFERENCES `consultation_session` (`session_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `diagnosis_icd` VARCHAR(20) NULL DEFAULT NULL,
  `prescription_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `instructions` TEXT NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `prescription_item` (
  `prescription_item_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`prescription_item_id`),
  `prescription_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_prescription_item_prescription_id` FOREIGN KEY (`prescription_id`) REFERENCES `prescription` (`prescription_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `medication_id` VARCHAR(20) NOT NULL,
  CONSTRAINT `fk_prescription_item_medication_id` FOREIGN KEY (`medication_id`) REFERENCES `medication` (`medication_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  `dosage` VARCHAR(50) NOT NULL,
  `frequency` VARCHAR(50) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `special_instructions` VARCHAR(255) NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
