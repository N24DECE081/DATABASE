"""All 13 baseline relation entities. No database or Flask dependency."""

from .user_account import UserAccount
from .patient import Patient
from .doctor import Doctor
from .general_practitioner import GeneralPractitioner
from .specialty import Specialty
from .specialist import Specialist
from .doctor_schedule import DoctorSchedule
from .appointment import Appointment
from .consultation_session import ConsultationSession
from .medical_history import MedicalHistory
from .medication import Medication
from .prescription import Prescription
from .prescription_item import PrescriptionItem

__all__ = ['UserAccount', 'Patient', 'Doctor', 'GeneralPractitioner', 'Specialty', 'Specialist', 'DoctorSchedule', 'Appointment', 'ConsultationSession', 'MedicalHistory', 'Medication', 'Prescription', 'PrescriptionItem']
