export type Page =
  | "dashboard"
  | "users"
  | "doctors"
  | "patients"
  | "specialties"
  | "medications"
  | "appointments"
  | "schedule"
  | "reports"
  | "settings";

export type Medication = {
  id: string;
  name: string;
  description: string;
  status: "Hoạt động" | "Ngừng dùng";
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Admin" | "Bác sĩ" | "Bệnh nhân";
  rawRole?: string;
  status: "Hoạt động" | "Tạm khóa";
  rawStatus?: string;
  created: string;
};

export type Doctor = {
  id: string;
  userId?: string;
  name: string;
  specialty: string;
  specialtyId?: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  subtype?: string;
  status: "Hoạt động" | "Tạm khóa";
  rawStatus?: string;
  gender: string;
  dob: string;
  rawDob?: string;
};

export type Patient = {
  id: string;
  userId?: string;
  name: string;
  gender: string;
  rawGender?: string;
  dob: string;
  rawDob?: string;
  phone: string;
  email: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  created: string;
  status: "Hoạt động" | "Tạm khóa";
  rawStatus?: string;
};

export type Specialty = {
  id: string;
  name: string;
  description: string;
  doctors: number;
  status: "Hoạt động" | "Tạm ngưng";
};

export type Appointment = {
  id: string;
  patient: string;
  patientId?: string;
  doctor: string;
  doctorId?: string;
  specialty: string;
  date: string;
  time: string;
  rawDateTime?: string;
  reason: string;
  visitType?: "Khám trực tiếp" | "Tư vấn trực tuyến";
  rawType?: string;
  isFollowUp?: boolean;
  fee?: number;
  status: "Chờ xác nhận" | "Đã xác nhận" | "Hoàn thành" | "Đã hủy" | "Không đến khám";
  rawStatus?: string;
  scheduleId?: string;
  duration?: number;
  sessionId?: string | null;
  hasSession?: boolean;
  hasCompletedSession?: boolean;
  hasFollowUp?: boolean;
  followUpAppointmentId?: string | null;
};

export type AdminConsultationDetail = {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  startedAt: string;
  endedAt: string;
  duration: number | null;
  modality: string;
  meetingUrl: string;
  diagnosisNotes: string;
  status: string;
  histories: Array<{
    id: string;
    recordDate: string;
    diagnosis: string;
    symptoms: string;
    progressNotes: string;
  }>;
  prescriptions: Array<{
    id: string;
    prescriptionDate: string;
    diagnosisIcd: string;
    instructions: string;
    items: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>;
  }>;
};

export type Schedule = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type AdminProfile = {
  id: string;
  username: string;
  role: string;
  name: string;
  email: string;
  phone: string;
};

export type Counts = {
  totalUsers: number;
  doctors: number;
  patients: number;
  appointments: number;
  todayAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  scheduledAppointments: number;
};

export type ChartData = {
  dailyTrend: Array<{ d: string; total: number }>;
  topDoctors: Array<{ name: string; specialty: string; count: number }>;
};

export type AdminPortalData = {
  admin: AdminProfile;
  counts: Counts;
  users: User[];
  doctors: Doctor[];
  patients: Patient[];
  specialties: Specialty[];
  medications?: Medication[];
  appointments: Appointment[];
  schedules: Schedule[];
  charts: ChartData;
};

export type ReportMetrics = {
  totalUsers: number;
  newUsers: number;
  doctors: number;
  patients: number;
  appointmentsInPeriod: number;
  completed: number;
  cancelled: number;
  pending: number;
  completionRate: number;
};

export type ReportResponse = {
  range: number;
  metrics: ReportMetrics;
  dailyTrend: Array<{ d: string; total: number }>;
  topDoctors: Array<{ name: string; specialty: string; count: number }>;
  statusBreakdown: {
    completed: number;
    pending: number;
    cancelled: number;
  };
  csvData: Array<{ item: string; value: string | number }>;
};

let csrfToken: string | null = null;

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (init.method && init.method !== "GET") {
    if (!csrfToken) {
      const response = await fetch("/api/csrf", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Không lấy được mã bảo mật CSRF. Vui lòng thử lại.");
      const data: { csrf_token?: unknown } = await response.json();
      if (typeof data.csrf_token !== "string") throw new Error("Mã bảo mật không hợp lệ.");
      csrfToken = data.csrf_token;
    }
    headers.set("X-CSRFToken", csrfToken);
  }

  const response = await fetch(url, { ...init, headers, credentials: "same-origin" });
  let data: { error?: unknown; message?: string };
  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new Error("Phản hồi từ máy chủ không hợp lệ.");
    data = {};
  }

  if (response.status === 401) {
    window.location.assign("/auth/login?next=%2Fadmin%2Fportal");
  }

  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "";
    if (response.status === 400 && /csrf|bảo mật/i.test(message)) {
      csrfToken = null;
    }
    throw new Error(message || `Yêu cầu thất bại (HTTP ${response.status}).`);
  }

  return data as T;
}

export const fetchPortalData = () => request<AdminPortalData>("/api/admin/portal");

export const fetchUsers = () => request<{ users: User[] }>("/api/admin/users");

export const createUser = (payload: {
  username?: string;
  password?: string;
  role: string;
  name: string;
  phone: string;
  email: string;
  dob?: string;
  gender?: string;
  licenseNumber?: string;
  specialtyId?: string;
}) => request<{ message: string; user: User }>("/api/admin/users", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const toggleUserStatus = (userId: string, status: string) =>
  request<{ message: string; userId: string; status: "Hoạt động" | "Tạm khóa" }>(
    `/api/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

export const fetchDoctors = () => request<{ doctors: Doctor[] }>("/api/admin/doctors");

export const createDoctor = (payload: {
  name: string;
  username?: string;
  password?: string;
  phone: string;
  email: string;
  specialty: string;
  licenseNumber?: string;
  gender?: string;
  dob?: string;
}) => request<{ message: string; doctor: Doctor }>("/api/admin/doctors", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateDoctor = (doctorId: string, payload: {
  name?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  licenseNumber?: string;
}) => request<{ message: string; doctorId: string }>(`/api/admin/doctors/${encodeURIComponent(doctorId)}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

export const fetchPatients = () => request<{ patients: Patient[] }>("/api/admin/patients");

export const createPatient = (payload: {
  name: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  confirm_password?: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}) => request<{ message: string; patient: Patient }>("/api/admin/patients", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updatePatient = (patientId: string, payload: Partial<Patient>) =>
  request<{ message: string; patientId: string }>(`/api/admin/patients/${encodeURIComponent(patientId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const fetchSpecialties = () => request<{ specialties: Specialty[] }>("/api/admin/specialties");

export const createSpecialty = (payload: { name: string; description: string }) =>
  request<{ message: string; specialty: Specialty }>("/api/admin/specialties", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateSpecialty = (specialtyId: string, payload: { name?: string; description?: string }) =>
  request<{ message: string; specialtyId: string }>(`/api/admin/specialties/${encodeURIComponent(specialtyId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const fetchAppointments = () => request<{ appointments: Appointment[] }>("/api/admin/appointments");
export const fetchBookingSlots = (
  doctorId: string,
  day: string,
  options: { signal?: AbortSignal; followUpFromApptId?: string; duration?: number } = {},
) => {
  const params = new URLSearchParams({
    doctor_id: doctorId,
    day,
    duration: String(options.duration || 30),
  });
  if (options.followUpFromApptId) {
    params.set("follow_up_from_appt_id", options.followUpFromApptId);
  }
  return request<{
    slots: Array<{ schedule_id: string; doctor_id: string; starts_at: string; duration_minutes: number }>;
    available_dates: string[];
    server_now?: string;
  }>(`/api/appointments/options?${params.toString()}`, { signal: options.signal });
};

export const fetchAdminConsultation = (sessionId: string, signal?: AbortSignal) =>
  request<{ consultation: AdminConsultationDetail }>(
    `/api/admin/consultations/${encodeURIComponent(sessionId)}`,
    { signal },
  );

export const createAppointment = (payload: {
  patientId: string;
  doctorId: string;
  scheduleId?: string;
  dateTime: string;
  duration?: number;
  visitType?: string;
  reason?: string;
  followUpFromApptId?: string;
}) => request<{ message: string; appointment: Appointment }>("/api/admin/appointments", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateAppointmentStatus = (appointmentId: string, status: string, reason?: string) =>
  request<{ message: string; appointmentId: string; status: string }>(
    `/api/admin/appointments/${encodeURIComponent(appointmentId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    }
  );

export const rescheduleAppointment = (appointmentId: string, payload: {
  scheduleId?: string;
  dateTime: string;
  duration?: number;
  reason?: string;
}) => request<{ message: string; appointmentId: string; date: string; time: string }>(
  `/api/admin/appointments/${encodeURIComponent(appointmentId)}/reschedule`,
  {
    method: "POST",
    body: JSON.stringify(payload),
  }
);

export const fetchSchedules = () => request<{ schedules: Schedule[] }>("/api/admin/schedules");

export const createSchedule = (payload: {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
}) => request<{ message: string; schedule: Schedule }>("/api/admin/schedules", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateScheduleStatus = (scheduleId: string, status: string) =>
  request<{ message: string; scheduleId: string; status: string }>(
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

export const fetchMedications = () =>
  request<{ medications: Medication[] }>("/api/admin/medications");

export const createMedication = (payload: { name: string; description?: string }) =>
  request<{ message: string; medication: Medication }>("/api/admin/medications", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchReports = (range: string | number) =>
  request<ReportResponse>(`/api/admin/reports?range=${range}`);

export const changeAdminPassword = (payload: {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}) => request<{ message: string }>("/api/admin/settings/password", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateAdminProfile = (payload: {
  name: string;
  email: string;
  phone: string;
}) => request<{ message: string; admin: AdminProfile }>("/api/admin/settings/profile", {
  method: "POST",
  body: JSON.stringify(payload),
});

export async function logoutAdmin() {
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
