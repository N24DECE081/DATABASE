export type AppointmentStatus =
  | "Đã xác nhận"
  | "Đã tiếp nhận"
  | "Đã hoàn thành"
  | "Đã hủy"
  | "Không đến khám";

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  subtype?: string;
  experience: string;
  next: string;
  available: boolean;
  rating: string;
  phone?: string;
  email?: string;
};

export type Appointment = {
  id: string;
  doctor: string;
  doctorId?: string;
  specialty: string;
  date: string;
  rawDate?: string;
  time: string;
  type: string;
  status: AppointmentStatus;
  rawStatus?: string;
  reason: string;
  sessionId?: string | null;
};

export type Consultation = {
  id: string;
  appointmentId: string;
  doctor: string;
  doctorId?: string;
  specialty: string;
  date: string;
  rawDate?: string;
  time: string;
  startedAt?: string;
  endedAt?: string | null;
  duration: number;
  status: string;
  isActive: boolean;
  modality: string;
  sessionType: string;
  meetingUrl: string;
  complaint: string;
  symptoms: string;
  diagnosis: string;
  notes: string;
  plan: string;
  prescriptionId?: string | null;
  prescriptionSummary?: string | null;
};

export type MedicalRecord = {
  id: string;
  sessionId: string;
  date: string;
  rawDate?: string;
  diagnosis: string;
  symptoms: string;
  notes: string;
  doctor: string;
  specialty: string;
};

export type MedicationItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type Prescription = {
  id: string;
  sessionId: string;
  date: string;
  rawDate?: string;
  doctor: string;
  specialty?: string;
  diagnosis: string;
  count: number;
  status: string;
  notes: string;
  items: MedicationItem[];
};

export type PatientProfile = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  blood: string;
  allergies: string;
  chronicDiseases: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export type SpecialtyOption = {
  id: string;
  name: string;
  description: string;
};

export type PatientPortalData = {
  profile: PatientProfile;
  doctors: Doctor[];
  specialties?: SpecialtyOption[];
  appointments: Appointment[];
  consultations: Consultation[];
  records: MedicalRecord[];
  prescriptions: Prescription[];
};

let csrfToken: string | null = null;

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.method && init.method !== "GET") {
    if (!csrfToken) {
      const response = await fetch("/api/csrf", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Không lấy được mã bảo mật. Hãy tải lại trang.");
      const data: { csrf_token?: unknown } = await response.json();
      if (typeof data.csrf_token !== "string") throw new Error("Mã bảo mật không hợp lệ.");
      csrfToken = data.csrf_token;
    }
    headers.set("X-CSRFToken", csrfToken);
  }
  const response = await fetch(url, { ...init, headers, credentials: "same-origin" });
  let data: { error?: unknown };
  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new Error("Phản hồi từ máy chủ không hợp lệ.");
    data = {};
  }
  if (response.status === 401) {
    window.location.assign("/auth/login?next=%2Fpatients%2Fportal");
  }
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "";
    if (response.status === 400 && /csrf|bảo mật/i.test(message)) csrfToken = null;
    throw new Error(
      message || `Yêu cầu thất bại (HTTP ${response.status}).`,
    );
  }
  return data as T;
}

export const loadPatientPortal = () => request<PatientPortalData>("/api/patient/portal");
export const loadPatientPortalData = loadPatientPortal;

export function updatePatientProfile(profile: Partial<PatientProfile>) {
  return request<{ profile: Partial<PatientProfile> }>("/api/patient/profile", {
    method: "PATCH",
    body: JSON.stringify({
      full_name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      blood_type: profile.blood,
      allergies: profile.allergies,
      chronic_diseases: profile.chronicDiseases,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_phone: profile.emergencyContactPhone,
    }),
  });
}
export const updateProfile = updatePatientProfile;

export type AppointmentSlot = {
  doctor_id: string;
  schedule_id: string;
  starts_at: string;
  duration_minutes: number;
};

export type BookingOptionsResponse = {
  specialties: Array<{ specialty_id: string; specialty_name: string }>;
  doctors: Array<{ doctor_id: string; full_name: string; specialty_name: string; subtype: string }>;
  available_dates: string[];
  slots: AppointmentSlot[];
  duration_minutes: number;
  appointment_types: string[];
  server_now?: string;
};

export async function fetchBookingOptions(params: {
  doctor_id?: string;
  specialty_id?: string;
  day?: string;
  month?: string;
  duration?: number;
  signal?: AbortSignal;
}): Promise<BookingOptionsResponse> {
  const query = new URLSearchParams();
  if (params.doctor_id) query.set("doctor_id", params.doctor_id);
  if (params.specialty_id) query.set("specialty_id", params.specialty_id);
  if (params.day) query.set("day", params.day);
  if (params.month) query.set("month", params.month);
  if (params.duration) query.set("duration", String(params.duration));
  return await request<BookingOptionsResponse>(`/api/appointments/options?${query.toString()}`, {
    signal: params.signal,
  });
}

export type BookAppointmentPayload = {
  doctor_id: string;
  schedule_id: string;
  appointment_date_time: string;
  appointment_type: "In-person" | "Telemedicine";
  estimated_duration_minutes?: number;
  reason?: string;
};

export type BookAppointmentResponse = {
  appointment: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    doctor_id: string;
    doctor_name: string;
    specialty_name: string;
    schedule_id: string;
    schedule_date: string;
    shift_start: string;
    shift_end: string;
    appointment_date_time: string;
    estimated_duration_minutes: number;
    appointment_type: string;
    status: AppointmentStatus;
    reason: string;
    session_id?: string | null;
  };
};

export async function bookAppointment(payload: BookAppointmentPayload): Promise<BookAppointmentResponse> {
  return await request<BookAppointmentResponse>("/api/appointments", {
    method: "POST",
    body: JSON.stringify({
      schedule_id: payload.schedule_id,
      appointment_date_time: payload.appointment_date_time,
      estimated_duration_minutes: payload.estimated_duration_minutes || 30,
      appointment_type: payload.appointment_type,
      reason: payload.reason || "Khám sức khỏe",
    }),
  });
}

export function cancelAppointment(appointmentId: string, reason?: string) {
  return request<{ appointment: unknown }>(`/api/appointments/${encodeURIComponent(appointmentId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Cancelled", reason: reason || "" }),
  });
}

export async function logoutPatient() {
  if (!csrfToken) {
    const response = await fetch("/api/csrf", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Không lấy được mã bảo mật để đăng xuất.");
    const data: { csrf_token?: unknown } = await response.json();
    if (typeof data.csrf_token !== "string") throw new Error("Mã bảo mật không hợp lệ.");
    csrfToken = data.csrf_token;
  }
  const response = await fetch("/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!response.ok) throw new Error("Không thể đăng xuất. Hãy thử lại.");
  window.location.assign("/auth/login");
}
