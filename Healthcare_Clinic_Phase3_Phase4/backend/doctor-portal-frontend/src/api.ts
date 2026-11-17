export type AppointmentStatus =
  | "Chờ xác nhận"
  | "Đã xác nhận"
  | "Hoàn thành"
  | "Đã hủy"
  | "Vắng mặt";

export type Appointment = {
  id: string;
  patientId: string;
  patient: string;
  date: string;
  time: string;
  reason: string;
  type: string;
  modality?: "Khám trực tiếp" | "Tư vấn trực tuyến";
  status: AppointmentStatus;
  sessionId?: string | null;
};

export type Patient = {
  id: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  latest: string | null;
  blood: string;
  allergies: string;
  chronicDiseases?: string;
};

export type Consultation = {
  id: string;
  appointmentId: string;
  patientId: string;
  patient: string;
  appointment: string;
  date: string;
  complaint: string;
  symptoms: string;
  diagnosis: string;
  notes: string;
  plan: string;
  status: string;
  meetingUrl: string | null;
  modality: "Khám trực tiếp" | "Tư vấn trực tuyến";
  startedAt: string;
  endedAt: string | null;
};

export type Prescription = {
  id: string;
  sessionId: string;
  patient: string;
  patientId: string;
  date: string;
  count: number;
  status: string;
  diagnosis: string;
  instructions: string;
  items: Medication[];
};

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type Schedule = {
  id: string;
  date: string;
  start: string;
  end: string;
  status: string;
};

export type MedicalRecord = {
  id: string;
  sessionId: string;
  patientId: string;
  patient: string;
  date: string;
  diagnosis: string;
  symptoms: string;
  notes: string;
  doctor: string;
};

export type DoctorProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  license: string;
  specialty: string;
};

export type DoctorPortalData = {
  profile: DoctorProfile;
  appointments: Appointment[];
  patients: Patient[];
  consultations: Consultation[];
  records: MedicalRecord[];
  prescriptions: Prescription[];
  schedules: Schedule[];
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
    window.location.assign("/auth/login?next=%2Fdoctors%2Fportal");
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

export const loadDoctorPortal = () => request<DoctorPortalData>("/api/doctor/portal");

const appointmentStatusValues: Record<AppointmentStatus, string> = {
  "Chờ xác nhận": "Scheduled",
  "Đã xác nhận": "Checked-In",
  "Hoàn thành": "Completed",
  "Đã hủy": "Cancelled",
  "Vắng mặt": "No-show",
};

export function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return request<{ appointment: unknown }>(`/api/appointments/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: appointmentStatusValues[status] }),
  });
}

export function createConsultation(appointmentId: string, meetingUrl: string, diagnosisNotes: string) {
  return request<{ consultation: Consultation }>(
    `/api/doctor/appointments/${encodeURIComponent(appointmentId)}/consultation`,
    {
      method: "POST",
      body: JSON.stringify({ meeting_url: meetingUrl, diagnosis_notes: diagnosisNotes }),
    },
  );
}

export function updateConsultationNotes(sessionId: string, diagnosisNotes: string, meetingUrl: string) {
  return request<{ session_id: string; diagnosis_notes: string }>(
    `/api/doctor/consultations/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ diagnosis_notes: diagnosisNotes, meeting_url: meetingUrl }),
    },
  );
}

export function finishConsultation(sessionId: string) {
  return request<{ session_id: string; status: string }>(
    `/api/doctor/consultations/${encodeURIComponent(sessionId)}/finish`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function updateDoctorProfile(profile: DoctorProfile) {
  return request<{ profile: Partial<DoctorProfile> }>("/api/doctor/profile", {
    method: "PATCH",
    body: JSON.stringify({
      full_name: profile.name,
      email: profile.email,
      phone: profile.phone,
      license_number: profile.license,
    }),
  });
}

export async function logoutDoctor() {
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
