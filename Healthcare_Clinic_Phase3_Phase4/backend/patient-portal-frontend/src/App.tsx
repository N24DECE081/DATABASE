import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import titimiLogo from "./assets/titimi-logo.png";
import {
  Appointment,
  AppointmentSlot,
  AppointmentStatus,
  Consultation,
  Doctor,
  MedicalRecord,
  PatientProfile,
  Prescription,
  bookAppointment,
  cancelAppointment,
  fetchBookingOptions,
  loadPatientPortalData,
  logoutPatient,
  updateProfile,
} from "./api";
import {
  assistEmail,
  clinicTodayIso,
  filterValidSlots,
  isCompletedAppointmentStatus,
  isPastSlot,
  normalizePhone,
  validateEmail,
  validatePhone,
} from "../../shared/clinicRules";

type Page =
  | "dashboard"
  | "doctors"
  | "doctor-detail"
  | "booking"
  | "appointments"
  | "appointment-detail"
  | "consultations"
  | "consultation-detail"
  | "history"
  | "history-detail"
  | "prescriptions"
  | "prescription-detail"
  | "profile";

type IconName =
  | "grid"
  | "search"
  | "calendar"
  | "chat"
  | "history"
  | "pill"
  | "user"
  | "bell"
  | "chevron"
  | "arrow"
  | "clock"
  | "video"
  | "building"
  | "stethoscope"
  | "file"
  | "plus"
  | "check"
  | "close"
  | "menu"
  | "logout"
  | "edit"
  | "phone"
  | "mail"
  | "map"
  | "activity"
  | "alert";

const paths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  pill: (
    <>
      <path d="m10.5 4.5 9 9a4.2 4.2 0 0 1-6 6l-9-9a4.2 4.2 0 0 1 6-6Z" />
      <path d="m8 14 6-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: (
    <>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  video: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M4.5 3v5a5.5 5.5 0 0 0 11 0V3M10 13.5V18a3 3 0 0 0 6 0v-2.5" />
      <circle cx="16" cy="15.5" r="2" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  menu: (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  map: (
    <>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </>
  ),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// 11 Real Doctors Fallback (from Database)
const defaultDoctors: Doctor[] = [
  {
    id: "DOC-001",
    name: "Nguyễn Minh Quân",
    specialty: "Đa khoa",
    subtype: "GENERAL_PRACTITIONER",
    experience: "12 năm kinh nghiệm",
    next: "Hôm nay, 2:30 PM",
    available: true,
    rating: "4.9",
    phone: "0901234568",
  },
  {
    id: "DOC-002",
    name: "Lê Bảo Ngọc",
    specialty: "Đa khoa",
    subtype: "GENERAL_PRACTITIONER",
    experience: "10 năm kinh nghiệm",
    next: "Hôm nay, 2:30 PM",
    available: true,
    rating: "4.9",
    phone: "0902513431",
  },
  {
    id: "DOC-003",
    name: "Trần Quốc Khánh",
    specialty: "Đa khoa",
    subtype: "GENERAL_PRACTITIONER",
    experience: "8 năm kinh nghiệm",
    next: "Ngày mai, 9:00 AM",
    available: true,
    rating: "4.8",
    phone: "0903513432",
  },
  {
    id: "DOC-004",
    name: "Phạm Thu Hà",
    specialty: "Đa khoa",
    subtype: "GENERAL_PRACTITIONER",
    experience: "9 năm kinh nghiệm",
    next: "Hôm nay, 4:00 PM",
    available: true,
    rating: "4.8",
    phone: "0904513433",
  },
  {
    id: "DOC-008",
    name: "Bùi Ngọc Anh",
    specialty: "Tim mạch",
    subtype: "SPECIALIST",
    experience: "11 năm kinh nghiệm",
    next: "Hôm nay, 2:30 PM",
    available: true,
    rating: "4.9",
    phone: "0912521352",
  },
  {
    id: "DOC-007",
    name: "Đặng Minh Tâm",
    specialty: "Nội tổng quát",
    subtype: "SPECIALIST",
    experience: "10 năm kinh nghiệm",
    next: "Ngày mai, 10:00 AM",
    available: true,
    rating: "4.8",
    phone: "0902513433",
  },
  {
    id: "DOC-009",
    name: "Đỗ Văn Phúc",
    specialty: "Nhi khoa",
    subtype: "SPECIALIST",
    experience: "10 năm kinh nghiệm",
    next: "Hôm nay, 3:30 PM",
    available: true,
    rating: "4.8",
    phone: "0932529271",
  },
  {
    id: "DOC-010",
    name: "Phan Khánh Linh",
    specialty: "Da liễu",
    subtype: "SPECIALIST",
    experience: "14 năm kinh nghiệm",
    next: "Ngày mai, 2:00 PM",
    available: false,
    rating: "4.9",
    phone: "0942529272",
  },
  {
    id: "DOC-006",
    name: "Hoàng Gia Hân",
    specialty: "Tai Mũi Họng",
    subtype: "SPECIALIST",
    experience: "7 năm kinh nghiệm",
    next: "Ngày mai, 8:30 AM",
    available: true,
    rating: "4.7",
    phone: "0901513432",
  },
  {
    id: "DOC-011",
    name: "Hồ Quốc Bảo",
    specialty: "Cơ xương khớp",
    subtype: "SPECIALIST",
    experience: "12 năm kinh nghiệm",
    next: "Hôm nay, 4:30 PM",
    available: true,
    rating: "4.9",
    phone: "0952529273",
  },
  {
    id: "DOC-005",
    name: "Vũ Thanh Bình",
    specialty: "Cơ xương khớp",
    subtype: "SPECIALIST",
    experience: "8 năm kinh nghiệm",
    next: "Ngày mai, 9:30 AM",
    available: false,
    rating: "4.7",
    phone: "0905513434",
  },
];

const defaultProfile: PatientProfile = {
  id: "PAT-001",
  name: "Nguyễn Văn An",
  dob: "1985-05-15",
  gender: "Nam",
  phone: "0901234567",
  email: "nguyenvanan@gmail.com",
  address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  blood: "O+",
  allergies: "Dị ứng Penicillin",
  chronicDiseases: "Không có",
  emergencyContactName: "Trần Thị Lan",
  emergencyContactPhone: "0909876543",
};

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "grid" },
  { id: "doctors", label: "Tìm bác sĩ", icon: "search" },
  { id: "appointments", label: "Lịch hẹn của tôi", icon: "calendar" },
  { id: "consultations", label: "Phiên khám", icon: "chat" },
  { id: "history", label: "Bệnh sử", icon: "history" },
  { id: "prescriptions", label: "Đơn thuốc", icon: "pill" },
  { id: "profile", label: "Hồ sơ cá nhân", icon: "user" },
];

const pageTitles: Partial<Record<Page, string>> = {
  dashboard: "Tổng quan",
  doctors: "Tìm bác sĩ",
  "doctor-detail": "Hồ sơ bác sĩ",
  booking: "Đặt lịch khám",
  appointments: "Lịch hẹn của tôi",
  "appointment-detail": "Chi tiết lịch hẹn",
  consultations: "Phiên khám",
  "consultation-detail": "Chi tiết phiên khám",
  history: "Bệnh sử",
  "history-detail": "Hồ sơ bệnh án",
  prescriptions: "Đơn thuốc",
  "prescription-detail": "Chi tiết đơn thuốc",
  profile: "Hồ sơ cá nhân",
};

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  className = "",
  type = "button",
  disabled = false,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: IconName;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      style={style}
    >
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </button>
  );
}

function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "amber" | "red" | "gray";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function BackButton({ onClick, label = "Quay lại" }: { onClick: () => void; label?: string }) {
  return (
    <button className="back-button" onClick={onClick}>
      <Icon name="arrow" size={18} />
      {label}
    </button>
  );
}

function DoctorAvatar({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  return (
    <span className={`doctor-avatar doctor-avatar-${size}`} aria-hidden="true">
      <Icon name="stethoscope" size={size === "large" ? 32 : size === "small" ? 17 : 22} />
    </span>
  );
}

function EmptyState({ onClear, message }: { onClear?: () => void; message?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="search" size={26} />
      </div>
      <h3>Không tìm thấy dữ liệu</h3>
      <p>{message || "Không tìm thấy dữ liệu phù hợp với bộ lọc. Hãy thử chuyên khoa hoặc từ khóa khác."}</p>
      {onClear && (
        <Button variant="secondary" onClick={onClear}>
          Xóa tất cả bộ lọc
        </Button>
      )}
    </div>
  );
}

// ---------------- DASHBOARD ----------------
function Dashboard({
  go,
  profile,
  appointments,
  records,
  prescriptions,
  onSelectAppointment,
}: {
  go: (p: Page) => void;
  profile: PatientProfile;
  appointments: Appointment[];
  records: MedicalRecord[];
  prescriptions: Prescription[];
  onSelectAppointment: (a: Appointment) => void;
}) {
  const quickActions: { title: string; text: string; icon: IconName; page: Page }[] = [
    { title: "Tìm bác sĩ", text: "Tìm theo chuyên khoa", icon: "stethoscope", page: "doctors" },
    { title: "Đặt lịch khám", text: "Chọn thời gian khám", icon: "calendar", page: "booking" },
    { title: "Bệnh sử", text: "Xem hồ sơ bệnh án", icon: "file", page: "history" },
    { title: "Đơn thuốc", text: "Xem danh sách thuốc", icon: "pill", page: "prescriptions" },
  ];

  const todayIso = new Date().toISOString().split("T")[0];
  const upcomingAppts = useMemo(() => {
    return appointments
      .filter((a) => {
        const isFuture = !a.rawDate || a.rawDate >= todayIso;
        return isFuture && (a.status === "Đã xác nhận" || a.status === "Đã tiếp nhận");
      })
      .sort((a, b) => (a.rawDate || "").localeCompare(b.rawDate || "") || a.time.localeCompare(b.time));
  }, [appointments, todayIso]);
  const nextAppt = upcomingAppts[0] || appointments.find((a) => a.status === "Đã xác nhận" || a.status === "Đã tiếp nhận") || appointments[0];
  const activeRxCount = prescriptions.filter((p) => p.status === "Đang dùng").length;

  return (
    <>
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">HÔM NAY · TI-TI-MI HEALTHCARE</span>
          <h1>Xin chào, {profile.name}!</h1>
          <p>Dưới đây là tổng quan hoạt động sức khỏe và kế hoạch chăm sóc sắp tới của bạn.</p>
        </div>
        <Button icon="plus" onClick={() => go("booking")}>
          Đặt lịch khám
        </Button>
      </div>

      <div className="demo-note">
        <Icon name="file" size={16} />
        <span>Bạn đang kết nối trực tiếp với hệ thống hồ sơ bệnh nhân TiTiMi Medical Centre.</span>
      </div>

      <div className="stats-grid">
        {[
          ["calendar", "Tổng số lịch hẹn", appointments.length.toString(), `${upcomingAppts.length} lịch sắp tới`],
          ["file", "Hồ sơ bệnh án", records.length.toString(), records.length > 0 ? `Cập nhật ${records[0].date}` : "Chưa có hồ sơ"],
          ["pill", "Đơn thuốc", prescriptions.length.toString(), `${activeRxCount} đơn đang dùng`],
        ].map(([icon, label, value, meta]) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon">
              <Icon name={icon as IconName} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{meta}</small>
            </div>
          </div>
        ))}
      </div>

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>Thao tác nhanh</h2>
            <p>Truy cập nhanh các chức năng bạn cần.</p>
          </div>
        </div>
        <div className="quick-grid">
          {quickActions.map((a) => (
            <button key={a.title} className="quick-card" onClick={() => go(a.page)}>
              <span className="quick-icon">
                <Icon name={a.icon} />
              </span>
              <span>
                <strong>{a.title}</strong>
                <small>{a.text}</small>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card upcoming-card">
          <div className="section-title">
            <div>
              <h2>Lịch hẹn sắp tới</h2>
              <p>Lịch khám tiếp theo của bạn trong hệ thống</p>
            </div>
            <button className="text-button" onClick={() => go("appointments")}>
              Xem tất cả ({appointments.length})
            </button>
          </div>

          {nextAppt ? (
            <div className="appointment-feature">
              <div className="doctor-line">
                <DoctorAvatar />
                <div>
                  <h3>{nextAppt.doctor}</h3>
                  <p>{nextAppt.specialty}</p>
                </div>
                <Badge
                  tone={
                    nextAppt.status === "Đã hoàn thành"
                      ? "blue"
                      : nextAppt.status === "Đã hủy"
                        ? "red"
                        : "green"
                  }
                >
                  {nextAppt.status}
                </Badge>
              </div>
              <div className="appointment-meta">
                <span>
                  <Icon name="calendar" size={18} />
                  {nextAppt.date}
                </span>
                <span>
                  <Icon name="clock" size={18} />
                  {nextAppt.time}
                </span>
                <span>
                  <Icon
                    name={nextAppt.type.includes("tuyến") ? "video" : "building"}
                    size={18}
                  />
                  {nextAppt.type}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  onSelectAppointment(nextAppt);
                  go("appointment-detail");
                }}
              >
                Chi tiết lịch hẹn
              </Button>
            </div>
          ) : (
            <div className="appointment-feature">
              <p style={{ color: "var(--muted)", margin: "16px 0" }}>
                Hiện tại bạn chưa có lịch hẹn sắp tới nào.
              </p>
              <Button onClick={() => go("booking")}>Đặt lịch ngay</Button>
            </div>
          )}
        </section>

        <section className="card health-card">
          <div className="section-title">
            <div>
              <h2>Nhắc nhở sức khỏe</h2>
              <p>Chăm sóc sức khỏe chủ động định kỳ</p>
            </div>
          </div>
          <div className="reminder-visual">
            <div className="pulse-ring">
              <Icon name="stethoscope" size={28} />
            </div>
            <div>
              <h3>Khám sức khỏe tổng quát định kỳ</h3>
              <p>
                Các bác sĩ Đa khoa TiTiMi khuyến nghị tái khám sức khỏe mỗi 6 tháng để theo dõi các
                chỉ số sinh hóa và huyết áp.
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => go("doctors")}>
            Tìm bác sĩ chăm sóc ban đầu <Icon name="chevron" size={16} />
          </Button>
        </section>
      </div>

      <section className="card table-card">
        <div className="section-title">
          <div>
            <h2>Lịch hẹn gần đây</h2>
            <p>Các lịch hẹn và phiên khám gần đây của bạn</p>
          </div>
          <button className="text-button" onClick={() => go("appointments")}>
            Xem tất cả
          </button>
        </div>
        <AppointmentTable
          rows={appointments.slice(0, 4)}
          onView={(appt) => {
            onSelectAppointment(appt);
            go("appointment-detail");
          }}
        />
      </section>
    </>
  );
}

function AppointmentTable({
  rows,
  onView,
  onViewSession,
}: {
  rows: Appointment[];
  onView: (a: Appointment) => void;
  onViewSession?: (a: Appointment) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>BÁC SĨ</th>
            <th>NGÀY VÀ GIỜ</th>
            <th>HÌNH THỨC</th>
            <th>TRẠNG THÁI</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id || a.date + a.doctor}>
              <td>
                <strong>{a.doctor}</strong>
                <small>{a.specialty}</small>
              </td>
              <td>
                <strong>{a.date}</strong>
                <small>{a.time}</small>
              </td>
              <td>{a.type}</td>
              <td>
                <Badge
                  tone={
                    a.status === "Đã hoàn thành"
                      ? "blue"
                      : a.status === "Đã hủy" || a.status === "Không đến khám"
                        ? "red"
                        : "green"
                  }
                >
                  {a.status}
                </Badge>
              </td>
              <td>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button className="table-action" onClick={() => onView(a)}>
                    Xem chi tiết
                  </button>
                  {isCompletedAppointmentStatus(a.status) && onViewSession && (
                    a.sessionId ? (
                      <button className="table-action" onClick={() => onViewSession(a)}>
                        Xem phiên khám
                      </button>
                    ) : (
                      <small style={{ color: "var(--muted)", fontSize: "12px" }}>Chưa có phiên khám</small>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- FIND DOCTORS ----------------
function FindDoctors({
  go,
  doctors,
  onSelectDoctor,
  onBookDoctor,
}: {
  go: (p: Page) => void;
  doctors: Doctor[];
  onSelectDoctor: (d: Doctor) => void;
  onBookDoctor: (d: Doctor) => void;
}) {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("Tất cả chuyên khoa");
  const [availability, setAvailability] = useState("Mọi lịch trống");

  const specialtiesList = useMemo(() => {
    const list = Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean))).sort();
    return ["Tất cả chuyên khoa", ...list];
  }, [doctors]);

  const filtered = useMemo(
    () =>
      doctors.filter(
        (d) =>
          (d.name.toLowerCase().includes(query.toLowerCase()) ||
            d.specialty.toLowerCase().includes(query.toLowerCase())) &&
          (specialty === "Tất cả chuyên khoa" || d.specialty === specialty) &&
          (availability === "Mọi lịch trống" ||
            (availability === "Có lịch hôm nay" ? d.next.includes("Hôm nay") : d.available))
      ),
    [doctors, query, specialty, availability]
  );

  const clear = () => {
    setQuery("");
    setSpecialty("Tất cả chuyên khoa");
    setAvailability("Mọi lịch trống");
  };

  return (
    <>
      <PageHeader
        title="Tìm bác sĩ"
        description="Tìm bác sĩ chuyên khoa phù hợp và đặt lịch khám thuận tiện."
        action={
          <Button icon="calendar" variant="secondary" onClick={() => go("appointments")}>
            Lịch hẹn của tôi
          </Button>
        }
      />
      <div className="card filter-bar">
        <label className="search-field">
          <span>Tìm kiếm bác sĩ</span>
          <div>
            <Icon name="search" size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên bác sĩ hoặc chuyên khoa"
            />
          </div>
        </label>
        <label>
          <span>Chuyên khoa</span>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {specialtiesList.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lịch trống</span>
          <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option>Mọi lịch trống</option>
            <option>Có lịch hôm nay</option>
            <option>Lịch gần nhất</option>
          </select>
        </label>
        <Button icon="search">Tìm kiếm</Button>
      </div>

      <div className="results-head">
        <div>
          <h2>{filtered.length} bác sĩ có lịch trống</h2>
          <p>Hiển thị các bác sĩ trong cơ sở dữ liệu TiTiMi</p>
        </div>
        <select aria-label="Sắp xếp bác sĩ">
          <option>Đề xuất</option>
          <option>Lịch gần nhất</option>
          <option>Kinh nghiệm</option>
        </select>
      </div>

      {filtered.length ? (
        <div className="doctor-grid">
          {filtered.map((d) => (
            <article className="doctor-card card" key={d.id || d.name}>
              <div className="doctor-avatar-panel">
                <DoctorAvatar size="large" />
                <span className={d.available ? "online-dot" : "online-dot offline"} />
              </div>
              <div className="doctor-card-body">
                <div className="doctor-top">
                  <span className="specialty-tag">{d.specialty}</span>
                  <span className="rating">★ {d.rating || "4.9"}</span>
                </div>
                <h3>{d.name}</h3>
                <p>{d.experience || "10 năm kinh nghiệm"}</p>
                <div className="next-slot">
                  <Icon name="calendar" size={18} />
                  <span>
                    <small>Lịch gần nhất</small>
                    <strong>{d.next || "Hôm nay, 2:30 PM"}</strong>
                  </span>
                </div>
                <div className="doctor-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onSelectDoctor(d);
                      go("doctor-detail");
                    }}
                  >
                    Xem hồ sơ
                  </Button>
                  <Button
                    onClick={() => {
                      onBookDoctor(d);
                      go("booking");
                    }}
                  >
                    Đặt lịch
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState onClear={clear} />
      )}
    </>
  );
}

// ---------------- DOCTOR DETAIL ----------------
function DoctorDetail({
  go,
  doctor,
  onBookDoctor,
}: {
  go: (p: Page) => void;
  doctor: Doctor;
  onBookDoctor: (d: Doctor) => void;
}) {
  return (
    <>
      <BackButton onClick={() => go("doctors")} label="Quay lại danh sách bác sĩ" />
      <section className="card doctor-hero">
        <DoctorAvatar size="large" />
        <div className="doctor-hero-copy">
          <span className="specialty-tag">{doctor.specialty}</span>
          <h1>{doctor.name}</h1>
          <p>Bác sĩ Chuyên khoa {doctor.specialty} · TiTiMi Medical Centre</p>
          <div className="hero-facts">
            <span>
              <strong>10+</strong> Năm kinh nghiệm
            </span>
            <span>
              <strong>★ {doctor.rating || "4.9"}</strong> Đánh giá
            </span>
            <span>
              <strong>1.2k</strong> Lượt khám
            </span>
          </div>
        </div>
        <Button
          icon="calendar"
          onClick={() => {
            onBookDoctor(doctor);
            go("booking");
          }}
        >
          Đặt lịch khám
        </Button>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card content-card">
            <h2>Giới thiệu bác sĩ {doctor.name}</h2>
            <p>
              Bác sĩ {doctor.name} là bác sĩ chuyên môn giàu kinh nghiệm trong lĩnh vực {doctor.specialty},
              tập trung vào chẩn đoán chính xác, điều trị dự phòng và chăm sóc sức khỏe toàn diện cho
              người bệnh. Bác sĩ được đánh giá cao nhờ sự tận tâm, chuyên nghiệp và phong thái ân cần.
            </p>
          </section>
          <section className="card content-card">
            <h2>Thông tin chuyên môn</h2>
            <div className="info-rows">
              <div>
                <Icon name="stethoscope" />
                <span>
                  <small>Chuyên khoa chính</small>
                  <strong>{doctor.specialty}</strong>
                </span>
              </div>
              <div>
                <Icon name="building" />
                <span>
                  <small>Cơ sở công tác</small>
                  <strong>TiTiMi Medical Centre, Cơ sở Trung tâm</strong>
                </span>
              </div>
              <div>
                <Icon name="phone" />
                <span>
                  <small>Điện thoại phòng khám</small>
                  <strong>{doctor.phone || "0901234568"}</strong>
                </span>
              </div>
            </div>
          </section>
        </div>
        <aside className="card schedule-card">
          <h2>Lịch khám còn trống</h2>
          <p>Chọn khung giờ để bắt đầu đặt lịch.</p>
          {["Hôm nay", "Ngày mai", "Ngày kia"].map((d, i) => (
            <button
              key={d}
              onClick={() => {
                onBookDoctor(doctor);
                go("booking");
              }}
            >
              <span>
                <strong>{d}</strong>
                <small>{i === 0 ? "Còn 3 khung giờ" : "Còn 5 khung giờ"}</small>
              </span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          <div className="consult-fee">
            <span>Phí tư vấn</span>
            <strong>150.000 đ</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

// ---------------- BOOKING (Strict Schedule & Constraints Bound) ----------------
function Booking({
  go,
  showToast,
  doctors,
  profile,
  initialDoctor,
  onAppointmentBooked,
}: {
  go: (p: Page) => void;
  showToast: (s: string) => void;
  doctors: Doctor[];
  profile: PatientProfile;
  initialDoctor: Doctor | null;
  onAppointmentBooked: (appt: Appointment) => void;
}) {
  const [step, setStep] = useState(1);
  const [bookingMode, setBookingMode] = useState<"choose" | "doctor" | "time">(
    initialDoctor ? "doctor" : "choose",
  );
  const [timeFilterPeriod, setTimeFilterPeriod] = useState<"all" | "morning" | "afternoon">("all");
  const [timeFilterSpecialty, setTimeFilterSpecialty] = useState<string>("Tất cả");
  const [allDaySlots, setAllDaySlots] = useState<{
    slot: AppointmentSlot;
    doc: { doctor_id: string; full_name: string; specialty_name: string; subtype: string };
  }[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [type, setType] = useState<"Khám trực tiếp" | "Tư vấn trực tuyến">("Khám trực tiếp");
  const [specialty, setSpecialty] = useState(initialDoctor ? initialDoctor.specialty : "");
  const [doctor, setDoctor] = useState(initialDoctor ? initialDoctor.name : "");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [reason, setReason] = useState("Khám sức khỏe tổng quát");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookedAppt, setBookedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (initialDoctor) {
      setBookingMode("doctor");
      setStep(1);
      setSpecialty(initialDoctor.specialty);
      setDoctor(initialDoctor.name);
    }
  }, [initialDoctor]);

  // Month navigation & dynamic doctor working shifts (clinic timezone +07:00)
  const todayIso = clinicTodayIso();
  const [initYear, initMonth] = todayIso.split("-").map(Number);
  const [calendarYear, setCalendarYear] = useState(initYear);
  const [calendarMonth, setCalendarMonth] = useState(initMonth);
  const currentYearMonth = `${calendarYear}-${calendarMonth < 10 ? "0" + calendarMonth : calendarMonth}`;
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const slotsAbortRef = useRef<AbortController | null>(null);
  const timeSlotsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      slotsAbortRef.current?.abort();
      timeSlotsAbortRef.current?.abort();
    };
  }, []);

  const handlePrevMonth = () => {
    slotsAbortRef.current?.abort();
    if (calendarMonth === 1) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    slotsAbortRef.current?.abort();
    if (calendarMonth === 12) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const startDayOfWeek = new Date(calendarYear, calendarMonth - 1, 1).getDay();

  // Selected date & doctor slots
  const [selectedDateIso, setSelectedDateIso] = useState<string>("");
  const [dateDisplay, setDateDisplay] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [time, setTime] = useState("");

  const specialties: { name: string; description: string; icon: IconName; available: boolean }[] = [
    {
      name: "Đa khoa",
      description: "Khám sức khỏe ban đầu, tổng quát và tầm soát",
      icon: "stethoscope",
      available: true,
    },
    {
      name: "Nội tổng quát",
      description: "Khám và điều trị các bệnh nội khoa",
      icon: "stethoscope",
      available: true,
    },
    {
      name: "Tim mạch",
      description: "Chăm sóc tim mạch và kiểm soát huyết áp",
      icon: "activity",
      available: true,
    },
    {
      name: "Da liễu",
      description: "Chẩn đoán và điều trị bệnh lý về da",
      icon: "user",
      available: true,
    },
    {
      name: "Nhi khoa",
      description: "Khám và chăm sóc sức khỏe trẻ em",
      icon: "user",
      available: true,
    },
    {
      name: "Tai Mũi Họng",
      description: "Khám và điều trị các bệnh tai, mũi, họng",
      icon: "activity",
      available: true,
    },
    {
      name: "Cơ xương khớp",
      description: "Khám và điều trị bệnh cơ xương khớp",
      icon: "history",
      available: true,
    },
  ];

  const availableDoctors = useMemo(() => {
    return doctors.filter(
      (item) =>
        (!specialty || item.specialty === specialty) &&
        item.name.toLowerCase().includes(doctorQuery.toLowerCase())
    );
  }, [doctors, specialty, doctorQuery]);

  const selectedDoctorObj = useMemo(() => {
    if (!doctor) return null;
    return (
      doctors.find((item) => item.name === doctor) ||
      (initialDoctor && initialDoctor.name === doctor ? initialDoctor : null)
    );
  }, [doctor, doctors, initialDoctor]);

  // Lấy các ngày có ca làm việc thực tế của bác sĩ trong tháng đã chọn
  useEffect(() => {
    if (!selectedDoctorObj) {
      setAvailableDates([]);
      return;
    }
    const controller = new AbortController();
    setLoadingDates(true);
    fetchBookingOptions({
      doctor_id: selectedDoctorObj.id,
      month: currentYearMonth,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setAvailableDates((data.available_dates || []).filter((d) => d >= todayIso));
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        console.warn("Lỗi tải ca làm việc của bác sĩ:", err);
        setAvailableDates([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDates(false);
      });
    return () => {
      controller.abort();
    };
  }, [selectedDoctorObj, currentYearMonth, todayIso]);

  const handleSelectDate = (dayIso: string, dayFormatted: string) => {
    slotsAbortRef.current?.abort();
    setSelectedDateIso(dayIso);
    setDateDisplay(dayFormatted);
    setTime("");
    setSelectedSlot(null);
    setBookingError("");
    if (!selectedDoctorObj || dayIso < todayIso) {
      setAvailableSlots([]);
      setLoadingSlots(false);
      return;
    }

    const controller = new AbortController();
    slotsAbortRef.current = controller;
    setLoadingSlots(true);
    fetchBookingOptions({
      doctor_id: selectedDoctorObj.id,
      day: dayIso,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setAvailableSlots(filterValidSlots(data.slots || [], data.server_now));
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        console.warn("Lỗi tải khung giờ trống:", err);
        setAvailableSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
  };

  const morningSlots = useMemo(() => {
    return availableSlots.filter((s) => {
      const slotTime = s.starts_at.slice(11, 16);
      return slotTime < "12:00";
    });
  }, [availableSlots]);

  const afternoonSlots = useMemo(() => {
    return availableSlots.filter((s) => {
      const slotTime = s.starts_at.slice(11, 16);
      return slotTime >= "12:00";
    });
  }, [availableSlots]);

  const loadSlotsForDate = (dayIso: string) => {
    timeSlotsAbortRef.current?.abort();
    setSelectedDateIso(dayIso);
    setSelectedSlot(null);
    setTime("");
    const parts = dayIso.split("-");
    if (parts.length === 3) {
      setDateDisplay(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
    if (!dayIso || dayIso < todayIso) {
      setAllDaySlots([]);
      setLoadingTimeSlots(false);
      if (dayIso) setBookingError("Không thể chọn ngày khám trong quá khứ.");
      return;
    }
    setBookingError("");
    const controller = new AbortController();
    timeSlotsAbortRef.current = controller;
    setLoadingTimeSlots(true);
    fetchBookingOptions({ day: dayIso, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const docMap = new Map<string, { doctor_id: string; full_name: string; specialty_name: string; subtype: string }>();
        (data.doctors || []).forEach((d) => {
          const isGP = d.subtype === "GENERAL_PRACTITIONER" || d.specialty_name === "General Practitioner" || d.specialty_name === "General Practice" || d.specialty_name === "Bác sĩ đa khoa";
          const sp = isGP ? "Đa khoa" : d.specialty_name;
          docMap.set(d.doctor_id, { ...d, specialty_name: sp });
        });
        doctors.forEach((d) => {
          if (!docMap.has(d.id)) {
            const isGP = d.subtype === "GENERAL_PRACTITIONER" || d.specialty === "General Practitioner" || d.specialty === "General Practice" || d.specialty === "Bác sĩ đa khoa" || d.specialty === "Đa khoa";
            const sp = isGP ? "Đa khoa" : (d.specialty || "Đa khoa");
            docMap.set(d.id, { doctor_id: d.id, full_name: d.name, specialty_name: sp, subtype: isGP ? "GENERAL_PRACTITIONER" : (d.subtype || "SPECIALIST") });
          }
        });
        const validSlots = filterValidSlots(data.slots || [], data.server_now);
        const combined = validSlots.map((s) => ({
          slot: s,
          doc: docMap.get(s.doctor_id) || {
            doctor_id: s.doctor_id,
            full_name: "Bác sĩ TiTiMi",
            specialty_name: "Đa khoa",
            subtype: "GENERAL_PRACTITIONER",
          },
        }));
        setAllDaySlots(combined);
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        console.warn("Lỗi tải khung giờ theo ngày:", err);
        setAllDaySlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTimeSlots(false);
      });
  };

  const filteredTimeSlots = useMemo(() => {
    return allDaySlots.filter(({ slot, doc }) => {
      const timeStr = slot.starts_at.slice(11, 16);
      if (timeFilterPeriod === "morning" && timeStr >= "12:00") return false;
      if (timeFilterPeriod === "afternoon" && timeStr < "12:00") return false;
      if (timeFilterSpecialty !== "Tất cả") {
        const isFilterGP = timeFilterSpecialty === "Đa khoa" || timeFilterSpecialty === "Bác sĩ đa khoa";
        const isDocGP = doc.specialty_name === "Đa khoa" || doc.specialty_name === "Bác sĩ đa khoa" || doc.specialty_name === "General Practitioner" || doc.specialty_name === "General Practice" || doc.subtype === "GENERAL_PRACTITIONER";
        if (isFilterGP) {
          if (!isDocGP) return false;
        } else {
          if (doc.specialty_name !== timeFilterSpecialty) return false;
        }
      }
      return true;
    });
  }, [allDaySlots, timeFilterPeriod, timeFilterSpecialty]);

  const handlePickSlotAndDoctor = (item: {
    slot: AppointmentSlot;
    doc: { doctor_id: string; full_name: string; specialty_name: string; subtype: string };
  }) => {
    const matchedDoctor = doctors.find((d) => d.id === item.doc.doctor_id) || {
      id: item.doc.doctor_id,
      name: item.doc.full_name,
      specialty: item.doc.specialty_name,
      rating: 4.9,
      experience: "Chuyên khoa",
      nextAvailable: "Hôm nay",
    };
    setDoctor(matchedDoctor.name);
    setSpecialty(matchedDoctor.specialty);
    setSelectedSlot(item.slot);
    setTime(item.slot.starts_at.slice(11, 16));
    setStep(5);
  };

  const canContinue =
    bookingMode === "time"
      ? Boolean(selectedDoctorObj && selectedSlot && time)
      : (step === 1 && Boolean(type)) ||
        (step === 2 && Boolean(specialty)) ||
        (step === 3 && Boolean(doctor)) ||
        (step === 4 && Boolean(selectedDateIso && selectedSlot)) ||
        step === 5;

  const chooseType = (value: "Khám trực tiếp" | "Tư vấn trực tuyến") => {
    setType(value);
  };

  const chooseSpecialty = (value: string) => {
    if (value !== specialty) {
      setDoctor("");
      setSelectedDateIso("");
      setDateDisplay("");
      setTime("");
      setSelectedSlot(null);
      setDoctorQuery("");
      setBookingError("");
    }
    setSpecialty(value);
  };

  const chooseDoctor = (value: string) => {
    if (value !== doctor) {
      setSelectedDateIso("");
      setDateDisplay("");
      setTime("");
      setSelectedSlot(null);
      setBookingError("");
    }
    setDoctor(value);
  };

  const enterBookingMode = (mode: "choose" | "doctor" | "time") => {
    slotsAbortRef.current?.abort();
    timeSlotsAbortRef.current?.abort();
    setBookingMode(mode);
    setStep(1);
    setSelectedSlot(null);
    setTime("");
    setBookingError("");
    if (mode === "choose") {
      setDoctor("");
      setSpecialty("");
      setSelectedDateIso("");
      setDateDisplay("");
      setAvailableSlots([]);
      setAllDaySlots([]);
    } else if (mode === "doctor") {
      setAllDaySlots([]);
      if (initialDoctor && !doctor) {
        setSpecialty(initialDoctor.specialty);
        setDoctor(initialDoctor.name);
      }
    } else if (mode === "time") {
      setDoctor("");
      setSpecialty("");
      setAvailableSlots([]);
      const targetDay = selectedDateIso && selectedDateIso >= todayIso ? selectedDateIso : todayIso;
      loadSlotsForDate(targetDay);
    }
  };

  const next = () => canContinue && setStep((current) => Math.min(5, current + 1));
  const back = () => {
    slotsAbortRef.current?.abort();
    timeSlotsAbortRef.current?.abort();
    if (bookingMode === "choose") {
      go("doctors");
      return;
    }
    if (bookingMode === "time") {
      if (step === 5) {
        setStep(1);
        setSelectedSlot(null);
        setTime("");
        setDoctor("");
        setSpecialty("");
      } else {
        enterBookingMode("choose");
      }
    } else {
      if (step === 1) {
        enterBookingMode("choose");
      } else {
        setStep((current) => current - 1);
      }
    }
  };

  const confirm = async () => {
    if (!selectedDoctorObj || !selectedSlot || isPastSlot(selectedSlot.starts_at)) {
      const msg = "Khung giờ đã chọn không hợp lệ hoặc đã qua. Vui lòng chọn khung giờ khác.";
      setBookingError(msg);
      showToast(msg);
      return;
    }
    setSubmitting(true);
    setBookingError("");
    try {
      const formattedTimeStr =
        selectedSlot.starts_at.length === 16 ? `${selectedSlot.starts_at}:00` : selectedSlot.starts_at;

      const res = await bookAppointment({
        doctor_id: selectedDoctorObj.id,
        schedule_id: selectedSlot.schedule_id,
        appointment_date_time: formattedTimeStr,
        appointment_type: type.includes("tuyến") ? "Telemedicine" : "In-person",
        reason: reason || "Khám sức khỏe",
      });

      const newAppt: Appointment = {
        id: res.appointment.appointment_id,
        doctor: res.appointment.doctor_name || selectedDoctorObj.name,
        doctorId: selectedDoctorObj.id,
        specialty: selectedDoctorObj.specialty,
        date: dateDisplay,
        time: time,
        type: type,
        status: "Đã xác nhận",
        reason: reason,
        sessionId: null,
      };

      setBookedAppt(newAppt);
      onAppointmentBooked(newAppt);
      setStep(6);
      showToast("Đặt lịch khám thành công!");
    } catch (err: any) {
      const errorMsg =
        err.message || "Đặt lịch thất bại do vi phạm ràng buộc hệ thống. Vui lòng chọn khung giờ khác.";
      setBookingError(errorMsg);
      showToast(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {step < 6 && (
        <div className="booking-top-nav">
          <BackButton
            onClick={back}
            label={
              bookingMode === "choose"
                ? "Quay lại danh sách bác sĩ"
                : step === 1
                  ? "Chọn lại phương thức đặt lịch"
                  : "Bước trước"
            }
          />
          {bookingMode !== "choose" && (
            <button
              type="button"
              className="booking-switch-mode"
              onClick={() => enterBookingMode("choose")}
            >
              Đổi phương thức ({bookingMode === "doctor" ? "Đang đặt theo bác sĩ" : "Đang đặt theo giờ"})
            </button>
          )}
        </div>
      )}
      <PageHeader
        title={step === 6 ? "Đặt lịch thành công" : "Đặt lịch khám"}
        description={
          step === 6
            ? "Lịch hẹn của bạn đã được ghi nhận vào hệ thống TiTiMi."
            : bookingMode === "choose"
              ? "Chọn một trong hai phương thức bên dưới để bắt đầu đặt lịch khám."
              : bookingMode === "doctor"
                ? "Đặt lịch theo Bác sĩ & Chuyên khoa — hoàn thành từng bước để chọn ngày và khung giờ phù hợp."
                : "Đặt theo Giờ mong muốn — chọn ngày, buổi khám và lọc ngay các bác sĩ còn lịch trống."
        }
      />

      {step < 6 && bookingMode === "choose" ? (
        <div className="booking-entry-grid">
          <button
            type="button"
            className="card booking-entry-card"
            onClick={() => enterBookingMode("doctor")}
          >
            <span className="booking-entry-badge">Lựa chọn 1</span>
            <div className="booking-entry-icon">
              <Icon name="stethoscope" size={26} />
            </div>
            <h2>Đặt theo Bác sĩ &amp; Chuyên khoa</h2>
            <p>
              Phù hợp khi bạn đã có bác sĩ quen hoặc muốn chọn đúng chuyên khoa trước rồi xem các ngày bác sĩ có ca trực.
            </p>
            <ul className="booking-entry-points">
              <li>Chọn hình thức khám &amp; chuyên khoa phù hợp</li>
              <li>Xem hồ sơ bác sĩ và lịch trực theo tháng</li>
              <li>Chọn khung giờ 30 phút còn trống của bác sĩ đó</li>
            </ul>
            <span className="booking-entry-cta">
              Chọn bác sĩ &amp; đặt lịch <Icon name="chevron" size={16} />
            </span>
          </button>

          <button
            type="button"
            className="card booking-entry-card"
            onClick={() => enterBookingMode("time")}
          >
            <span className="booking-entry-badge booking-entry-badge--time">Lựa chọn 2</span>
            <div className="booking-entry-icon booking-entry-icon--time">
              <Icon name="clock" size={26} />
            </div>
            <h2>Đặt theo Giờ mong muốn</h2>
            <p>
              Phù hợp khi bạn ưu tiên khung giờ rảnh trong ngày; hệ thống tự động tìm toàn bộ bác sĩ còn trống vào giờ đó.
            </p>
            <ul className="booking-entry-points">
              <li>Chọn ngày khám &amp; buổi Sáng (8–12h) / Chiều (13–17h)</li>
              <li>Lọc nhanh theo chuyên khoa và hình thức khám</li>
              <li>Chọn ngay slot 30 phút &amp; bác sĩ đang rảnh</li>
            </ul>
            <span className="booking-entry-cta">
              Tìm khung giờ trống <Icon name="chevron" size={16} />
            </span>
          </button>
        </div>
      ) : (
        <>
          {step < 6 && bookingMode === "doctor" && (
            <div className="booking-steps">
              {["Hình thức khám", "Chuyên khoa", "Bác sĩ", "Ngày & giờ", "Xác nhận"].map(
                (label, index) => (
                  <div
                    key={label}
                    className={step > index + 1 ? "done" : step === index + 1 ? "active" : ""}
                  >
                    <span>{step > index + 1 ? <Icon name="check" size={15} /> : index + 1}</span>
                    <small>{label}</small>
                  </div>
                )
              )}
            </div>
          )}
          {step < 6 && bookingMode === "time" && (
            <div className="booking-steps booking-steps--compact">
              {[
                { label: "Tìm khung giờ & bác sĩ trống", activeAt: 1, doneAt: 5 },
                { label: "Xác nhận thông tin đặt lịch", activeAt: 5, doneAt: 6 },
              ].map((item, index) => {
                const isDone = step >= item.doneAt;
                const isActive = !isDone && step === item.activeAt;
                return (
                  <div
                    key={item.label}
                    className={isDone ? "done" : isActive ? "active" : ""}
                  >
                    <span>{isDone ? <Icon name="check" size={15} /> : index + 1}</span>
                    <small>{item.label}</small>
                  </div>
                );
              })}
            </div>
          )}

      {step === 6 ? (
        <div className="confirmation-card card">
          <div className="success-mark">
            <Icon name="check" size={36} />
          </div>
          <span className="eyebrow">ĐẶT LỊCH THÀNH CÔNG</span>
          <h2>{profile.name}, lịch hẹn của bạn đã được xác nhận.</h2>
          <p>
            Mã lịch hẹn: <strong>{bookedAppt?.id || "APT-001"}</strong>
          </p>
          <div className="confirmation-summary booking-confirmation-summary">
            <DoctorAvatar />
            <div>
              <small>Bác sĩ</small>
              <strong>{selectedDoctorObj?.name}</strong>
              <span>Chuyên khoa {specialty}</span>
            </div>
            <div>
              <small>Ngày và giờ</small>
              <strong>
                {dateDisplay} · {time}
              </strong>
            </div>
            <div>
              <small>Hình thức khám</small>
              <strong>{type}</strong>
              <span>Trạng thái: Đã xác nhận</span>
            </div>
          </div>
          <div className="confirmation-actions">
            <Button onClick={() => go("appointments")}>Xem lịch hẹn của tôi</Button>
            <Button variant="secondary" onClick={() => go("dashboard")}>
              Quay về tổng quan
            </Button>
          </div>
        </div>
      ) : (
        <div className="booking-layout">
          <section className="card booking-panel">
            {bookingMode === "time" && step < 5 ? (
              <div className="time-search-panel">
                <h2>Tìm kiếm theo khung giờ mong muốn</h2>
                <p>Hệ thống tự động tra cứu tất cả ca trực khả dụng của đội ngũ bác sĩ theo khung thời gian bạn chọn (Q05).</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                      1. Chọn ngày khám mong muốn:
                    </label>
                    <input
                      type="date"
                      min={todayIso}
                      value={selectedDateIso || todayIso}
                      onChange={(e) => loadSlotsForDate(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                      2. Lọc theo chuyên khoa:
                    </label>
                    <select
                      value={timeFilterSpecialty}
                      onChange={(e) => setTimeFilterSpecialty(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }}
                    >
                      <option value="Tất cả">Tất cả chuyên khoa</option>
                      {specialties.map((s) => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                      3. Buổi khám trong ngày:
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["all", "morning", "afternoon"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setTimeFilterPeriod(period)}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid",
                            borderColor: timeFilterPeriod === period ? "var(--primary)" : "#cbd5e1",
                            background: timeFilterPeriod === period ? "var(--primary)" : "#fff",
                            color: timeFilterPeriod === period ? "#fff" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          {period === "all" ? "Cả ngày" : period === "morning" ? "Sáng (8-12h)" : "Chiều (13-17h)"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                      4. Hình thức khám:
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(["Khám trực tiếp", "Tư vấn trực tuyến"] as const).map((vt) => (
                        <button
                          key={vt}
                          type="button"
                          onClick={() => setType(vt)}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid",
                            borderColor: type === vt ? "var(--primary)" : "#cbd5e1",
                            background: type === vt ? "var(--primary)" : "#fff",
                            color: type === vt ? "#fff" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          {vt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Các khung giờ và bác sĩ trực khả dụng ({filteredTimeSlots.length} lựa chọn):
                  </h3>

                  {loadingTimeSlots ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                      Đang tìm kiếm ca trực khả dụng...
                    </div>
                  ) : filteredTimeSlots.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxHeight: "360px", overflowY: "auto" }}>
                      {filteredTimeSlots.map(({ slot, doc }) => {
                        const slotTime = slot.starts_at.slice(11, 16);
                        return (
                          <div
                            key={`${slot.schedule_id}-${slot.starts_at}`}
                            style={{
                              padding: "0.75rem 1rem",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)" }}>⏰ {slotTime}</span>
                                <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#475569" }}>
                                  30 phút
                                </span>
                              </div>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                                {doc.full_name}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                Chuyên khoa {doc.specialty_name}
                              </div>
                            </div>
                            <Button
                              onClick={() => handlePickSlotAndDoctor({ slot, doc })}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              Chọn lịch này
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "2rem", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "13.5px" }}>
                      Không có khung giờ hoặc bác sĩ trực phù hợp trong ngày này ({dateDisplay || selectedDateIso}).<br />
                      Vui lòng thử chọn một ngày khác hoặc đổi điều kiện lọc.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {step === 1 && (
              <>
                <h2>Chọn hình thức khám</h2>
                <p>Chọn hình thức phù hợp với nhu cầu thăm khám của bạn.</p>
                <div className="type-options booking-type-options">
                  {[
                    ["building", "Khám trực tiếp", "Người bệnh đến phòng khám TiTiMi để gặp trực tiếp bác sĩ."],
                    [
                      "video",
                      "Tư vấn trực tuyến",
                      "Tư vấn y tế từ xa với bác sĩ qua phòng họp video bảo mật.",
                    ],
                  ].map(([icon, title, text]) => (
                    <button
                      key={title}
                      className={type === title ? "selected" : ""}
                      onClick={() => chooseType(title as any)}
                    >
                      <span className="type-icon">
                        <Icon name={icon as IconName} />
                      </span>
                      <span>
                        <strong>{title}</strong>
                        <small>{text}</small>
                      </span>
                      <span className="radio" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Chọn chuyên khoa</h2>
                <p>Chọn chuyên khoa phù hợp với tình trạng sức khỏe của bạn.</p>
                <div className="specialty-grid">
                  {specialties.map((item) => (
                    <button
                      key={item.name}
                      disabled={!item.available}
                      className={specialty === item.name ? "selected" : ""}
                      onClick={() => chooseSpecialty(item.name)}
                    >
                      <span className="specialty-icon">
                        <Icon name={item.icon} />
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </span>
                      <span className="radio" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2>Chọn bác sĩ</h2>
                <p>
                  Danh sách bác sĩ chuyên khoa {specialty || "đã chọn"} hỗ trợ {type.toLowerCase()}.
                </p>
                <label className="booking-doctor-search">
                  <Icon name="search" size={18} />
                  <input
                    value={doctorQuery}
                    onChange={(event) => setDoctorQuery(event.target.value)}
                    placeholder="Tìm bác sĩ theo tên"
                  />
                </label>
                <div className="selection-list doctor-selection-list">
                  {availableDoctors.length > 0 ? (
                    availableDoctors.map((item) => (
                      <button
                        key={item.name}
                        className={doctor === item.name ? "selection-row selected" : "selection-row"}
                        onClick={() => chooseDoctor(item.name)}
                      >
                        <DoctorAvatar />
                        <span>
                          <strong>{item.name}</strong>
                          <small>BS · Chuyên khoa {item.specialty}</small>
                        </span>
                        <span className="select-doctor-label">
                          {doctor === item.name ? "Đã chọn" : "Chọn bác sĩ"}
                        </span>
                        <span className="radio" />
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                      Không tìm thấy bác sĩ phù hợp trong chuyên khoa này.
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2>Chọn ngày và giờ khám</h2>
                <p>
                  Hệ thống kiểm tra trực tiếp ca làm việc và lịch trống của bác sĩ{" "}
                  <strong>{selectedDoctorObj?.name}</strong>.
                </p>
                <div className="date-time-layout">
                  <div className="mini-calendar">
                    <div className="calendar-head">
                      <button aria-label="Tháng trước" onClick={handlePrevMonth}>‹</button>
                      <strong>{`Tháng ${calendarMonth}, ${calendarYear}`}</strong>
                      <button aria-label="Tháng sau" onClick={handleNextMonth}>›</button>
                    </div>
                    <div className="calendar-grid">
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, index) => (
                        <b key={`${day}-${index}`}>{day}</b>
                      ))}
                      {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <span key={`empty-${i}`} className="calendar-empty" />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                        const dayStr = day < 10 ? "0" + day : `${day}`;
                        const monthStr = calendarMonth < 10 ? "0" + calendarMonth : `${calendarMonth}`;
                        const dayIso = `${calendarYear}-${monthStr}-${dayStr}`;
                        const dayFormatted = `${dayStr}/${monthStr}/${calendarYear}`;
                        const isPast = dayIso < todayIso;
                        const isAvailable = !isPast && availableDates.includes(dayIso);
                        const isSelected = selectedDateIso === dayIso;
                        return (
                          <button
                            key={day}
                            disabled={!isAvailable}
                            className={`${isSelected ? "selected" : ""} ${isAvailable ? "available" : "unavailable"}`}
                            onClick={() => handleSelectDate(dayIso, dayFormatted)}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div className="calendar-legend">
                      <span>
                        <i className="available" />
                        Bác sĩ có ca làm
                      </span>
                      <span>
                        <i className="unavailable" />
                        Không có ca / Đã kín
                      </span>
                    </div>
                  </div>

                  <div className="slot-group compact-slots">
                    {!selectedDateIso ? (
                      <div className="slot-placeholder">
                        <Icon name="calendar" />
                        <span>Vui lòng bấm chọn ngày bác sĩ có ca làm (chữ đậm) trên lịch.</span>
                      </div>
                    ) : loadingSlots ? (
                      <div className="slot-placeholder">
                        <Icon name="clock" />
                        <span>Đang kiểm tra khung giờ trống thực tế...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="slot-placeholder">
                        <Icon name="close" />
                        <span>Bác sĩ đã kín lịch hoặc không còn khung giờ trống trong ngày này.</span>
                      </div>
                    ) : (
                      <>
                        {morningSlots.length > 0 && (
                          <>
                            <h3>Khung giờ buổi sáng ({morningSlots.length} khung giờ)</h3>
                            <div className="slots">
                              {morningSlots.map((slot) => {
                                const slotTime = slot.starts_at.slice(11, 16);
                                return (
                                  <button
                                    key={slot.starts_at}
                                    className={time === slotTime ? "selected" : ""}
                                    onClick={() => {
                                      setTime(slotTime);
                                      setSelectedSlot(slot);
                                    }}
                                  >
                                    {slotTime}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {afternoonSlots.length > 0 && (
                          <>
                            <h3>Khung giờ buổi chiều ({afternoonSlots.length} khung giờ)</h3>
                            <div className="slots">
                              {afternoonSlots.map((slot) => {
                                const slotTime = slot.starts_at.slice(11, 16);
                                return (
                                  <button
                                    key={slot.starts_at}
                                    className={time === slotTime ? "selected" : ""}
                                    onClick={() => {
                                      setTime(slotTime);
                                      setSelectedSlot(slot);
                                    }}
                                  >
                                    {slotTime}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

            {step === 5 && (
              <>
                <h2>Xác nhận thông tin đặt lịch</h2>
                <p>Kiểm tra thông tin chi tiết trước khi xác nhận đặt lịch khám.</p>
                <div className="review-doctor">
                  <DoctorAvatar />
                  <div>
                    <strong>{selectedDoctorObj?.name}</strong>
                    <span>Chuyên khoa {specialty} · TiTiMi Medical Centre</span>
                  </div>
                </div>
                <div className="review-list booking-review-list">
                  <div>
                    <span>Hình thức khám</span>
                    <strong>{type}</strong>
                  </div>
                  <div>
                    <span>Chuyên khoa</span>
                    <strong>{specialty}</strong>
                  </div>
                  <div>
                    <span>Bác sĩ phụ trách</span>
                    <strong>{selectedDoctorObj?.name}</strong>
                  </div>
                  <div>
                    <span>Ngày khám</span>
                    <strong>{dateDisplay}</strong>
                  </div>
                  <div>
                    <span>Giờ khám</span>
                    <strong>{time}</strong>
                  </div>
                  <div>
                    <span>Thời lượng</span>
                    <strong>{selectedSlot?.duration_minutes || 30} phút</strong>
                  </div>
                  <div>
                    <span>Phí khám dự kiến</span>
                    <strong>150.000 đ</strong>
                  </div>
                </div>

                <div className="patient-booking-info">
                  <div className="patient-info-head">
                    <span className="quick-icon">
                      <Icon name="user" />
                    </span>
                    <div>
                      <strong>Thông tin người bệnh</strong>
                      <small>Tự động đồng bộ từ hồ sơ cá nhân</small>
                    </div>
                  </div>
                  <div className="patient-info-grid">
                    <span>
                      <small>Họ và tên</small>
                      <strong>{profile.name}</strong>
                    </span>
                    <span>
                      <small>Số điện thoại</small>
                      <strong>{profile.phone}</strong>
                    </span>
                    <span>
                      <small>Ngày sinh</small>
                      <strong>{profile.dob}</strong>
                    </span>
                    <span>
                      <small>Email</small>
                      <strong>{profile.email}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Lý do khám / Triệu chứng ban đầu
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "13px",
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                {bookingError && (
                  <div
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #ef4444",
                      color: "#b91c1c",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginTop: "16px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Icon name="close" size={16} />
                    <span>
                      <strong>Không thể đặt lịch:</strong> {bookingError}
                    </span>
                  </div>
                )}

                <div className="review-note">
                  <Icon name="check" size={18} />
                  Lịch hẹn sẽ được kiểm tra ràng buộc ca làm việc và ghi trực tiếp vào cơ sở dữ liệu TiTiMi.
                </div>
              </>
            )}

            {(bookingMode === "doctor" || step === 5) && (
              <div className="booking-buttons">
                <Button variant="secondary" onClick={back} disabled={submitting}>
                  Quay lại
                </Button>
                <Button
                  disabled={!canContinue || submitting}
                  onClick={step === 5 ? confirm : next}
                >
                  {submitting ? "Đang xác nhận với máy chủ..." : step === 5 ? "Xác nhận đặt lịch" : "Tiếp tục"}
                </Button>
              </div>
            )}
          </section>

          <aside className="card booking-summary">
            <h3>Tóm tắt lịch hẹn</h3>
            {selectedDoctorObj ? (
              <div className="summary-doctor">
                <DoctorAvatar size="small" />
                <span>
                  <strong>{selectedDoctorObj.name}</strong>
                  <small>{specialty || selectedDoctorObj.specialty}</small>
                </span>
              </div>
            ) : (
              <div className="summary-empty">
                <Icon name="stethoscope" />
                <span>Chưa chọn bác sĩ</span>
              </div>
            )}
            <div className="summary-lines">
              <span>
                <Icon name={type.includes("tuyến") ? "video" : "building"} size={18} />
                {type || "Chọn hình thức khám"}
              </span>
              <span>
                <Icon name="stethoscope" size={18} />
                {specialty || "Chọn chuyên khoa"}
              </span>
              <span>
                <Icon name="calendar" size={18} />
                {dateDisplay || "Chọn ngày khám"}
              </span>
              <span>
                <Icon name="clock" size={18} />
                {time || "Chọn giờ khám"}
              </span>
            </div>
          </aside>
        </div>
      )}
        </>
      )}
    </>
  );
}

// ---------------- APPOINTMENTS ----------------
function Appointments({
  go,
  appointments,
  onSelectAppointment,
  onViewSession,
  askCancel,
}: {
  go: (p: Page) => void;
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
  onViewSession: (a: Appointment) => void;
  askCancel: (a: Appointment) => void;
}) {
  const [filter, setFilter] = useState("Tất cả");
  const tabs = [
    "Tất cả",
    "Đã xác nhận",
    "Đã tiếp nhận",
    "Đã hoàn thành",
    "Đã hủy",
    "Không đến khám",
  ];

  const rows = filter === "Tất cả" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <>
      <PageHeader
        title="Lịch hẹn của tôi"
        description="Xem và quản lý các lịch hẹn sắp tới và đã qua."
        action={
          <Button icon="plus" onClick={() => go("booking")}>
            Đặt lịch khám
          </Button>
        }
      />
      <div className="status-tabs">
        {tabs.map((t) => {
          const count = t === "Tất cả" ? appointments.length : appointments.filter((a) => a.status === t).length;
          return (
            <button key={t} className={filter === t ? "active" : ""} onClick={() => setFilter(t)}>
              {t}
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {rows.length ? (
        <section className="card table-card appointments-card">
          <AppointmentTable
            rows={rows}
            onView={(appt) => {
              onSelectAppointment(appt);
              go("appointment-detail");
            }}
            onViewSession={onViewSession}
          />
          {filter === "Đã xác nhận" && rows.length > 0 && (
            <div className="cancel-row">
              <span>Chỉ có thể hủy lịch hẹn ở tương lai chưa diễn ra và chưa bắt đầu khám.</span>
            </div>
          )}
        </section>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">
            <Icon name="calendar" size={26} />
          </div>
          <h3>Không có lịch hẹn ở trạng thái {filter.toLowerCase()}</h3>
          <p>Các lịch hẹn có trạng thái này sẽ hiển thị tại đây.</p>
          <Button variant="secondary" onClick={() => setFilter("Tất cả")}>
            Xem tất cả lịch hẹn
          </Button>
        </div>
      )}
    </>
  );
}

// ---------------- APPOINTMENT DETAIL ----------------
function AppointmentDetail({
  go,
  appointment,
  askCancel,
  onViewDoctor,
  onViewConsultation,
}: {
  go: (p: Page) => void;
  appointment: Appointment | null;
  askCancel: (a: Appointment) => void;
  onViewDoctor: (docName: string) => void;
  onViewConsultation: (sessionId: string) => void;
}) {
  if (!appointment) {
    return (
      <>
        <BackButton onClick={() => go("appointments")} label="Quay lại lịch hẹn" />
        <p>Không tìm thấy thông tin lịch hẹn.</p>
      </>
    );
  }

  // Ràng buộc hủy lịch hẹn theo quy tắc y khoa (BR26-36 & service.change_status):
  // 1. Chỉ lịch "Đã xác nhận" (Scheduled) mới được hủy
  // 2. Thời gian khám phải ở tương lai (> now)
  // 3. Chưa có phiên khám liên kết
  const isPast = useMemo(() => {
    if (!appointment.rawDate) return false;
    const apptDateTimeStr = `${appointment.rawDate}T${appointment.time || "00:00"}:00`;
    return new Date(apptDateTimeStr) <= new Date();
  }, [appointment.rawDate, appointment.time]);

  const canCancel = appointment.status === "Đã xác nhận" && !appointment.sessionId && !isPast;

  return (
    <>
      <BackButton onClick={() => go("appointments")} label="Quay lại lịch hẹn" />
      <PageHeader
        title="Chi tiết lịch hẹn"
        description={`Mã lịch hẹn: ${appointment.id || "TIT-250522-1042"}`}
      />
      <div className="detail-grid">
        <section className="card content-card">
          <div className="doctor-line large">
            <DoctorAvatar size="large" />
            <div>
              <h2>{appointment.doctor}</h2>
              <p>Chuyên khoa {appointment.specialty} · TiTiMi Medical Centre</p>
            </div>
            <Badge
              tone={
                appointment.status === "Đã hoàn thành"
                  ? "blue"
                  : appointment.status === "Đã hủy"
                    ? "red"
                    : "green"
              }
            >
              {appointment.status}
            </Badge>
          </div>
          <div className="detail-facts">
            <div>
              <Icon name="calendar" />
              <span>
                <small>Ngày khám</small>
                <strong>{appointment.date}</strong>
              </span>
            </div>
            <div>
              <Icon name="clock" />
              <span>
                <small>Giờ khám</small>
                <strong>{appointment.time}</strong>
              </span>
            </div>
            <div>
              <Icon name="building" />
              <span>
                <small>Hình thức khám</small>
                <strong>{appointment.type}</strong>
              </span>
            </div>
            <div>
              <Icon name="map" />
              <span>
                <small>Địa điểm / Kênh</small>
                <strong>
                  {appointment.type.includes("tuyến")
                    ? "Phòng tư vấn trực tuyến TiTiMi Telemedicine"
                    : "TiTiMi Medical Centre, Tầng 2"}
                </strong>
              </span>
            </div>
          </div>
          <div className="visit-note">
            <h3>Lưu ý trước khi đến khám</h3>
            <p>
              Vui lòng đến sớm 10 phút trước giờ hẹn, mang theo CMND/CCCD hoặc thẻ BHYT và các đơn
              thuốc hoặc kết quả xét nghiệm đã thực hiện trước đây (nếu có).
            </p>
          </div>
        </section>

        <aside className="card content-card">
          <h2>Thao tác lịch hẹn</h2>
          <Button
            className="full-btn"
            onClick={() => {
              onViewDoctor(appointment.doctor);
              go("doctor-detail");
            }}
          >
            Xem hồ sơ bác sĩ
          </Button>

          {appointment.sessionId ? (
            <Button
              className="full-btn"
              variant="secondary"
              onClick={() => onViewConsultation(appointment.sessionId!)}
            >
              Xem phiên khám liên quan
            </Button>
          ) : isCompletedAppointmentStatus(appointment.status) ? (
            <div style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0", lineHeight: "1.5" }}>
              ℹ️ Lịch hẹn đã hoàn thành nhưng chưa có phiên khám liên kết.
            </div>
          ) : null}

          {canCancel ? (
            <Button
              className="full-btn"
              variant="danger"
              onClick={() => askCancel(appointment)}
            >
              Hủy lịch hẹn này
            </Button>
          ) : appointment.status === "Đã xác nhận" ? (
            <div style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0", lineHeight: "1.5" }}>
              {isPast
                ? "ℹ️ Lịch hẹn đã qua giờ khám theo lịch, không thể hủy."
                : "ℹ️ Lịch hẹn đã gắn với phiên khám, không thể hủy trên cổng bệnh nhân."}
            </div>
          ) : null}

          <hr />
          <small className="support-copy">
            Bạn cần trợ giúp thêm? Hãy liên hệ bộ phận hỗ trợ bệnh nhân TiTiMi qua hotline: 1900 6868.
          </small>
        </aside>
      </div>
    </>
  );
}

// ---------------- CONSULTATIONS (Phương án 1) ----------------
function Consultations({
  go,
  consultations,
  onSelectConsultation,
}: {
  go: (p: Page) => void;
  consultations: Consultation[];
  onSelectConsultation: (c: Consultation) => void;
}) {
  const activeConsultation = consultations.find((c) => c.isActive);
  const completedList = consultations.filter((c) => !c.isActive);

  return (
    <>
      <PageHeader
        title="Phiên khám"
        description="Theo dõi phiên khám đang diễn ra và ghi chú lâm sàng từ các phiên khám đã hoàn thành."
      />

      {/* PHƯƠNG ÁN 1: Banner phiên khám đang diễn ra */}
      {activeConsultation && (
        <div className="active-consultation-banner">
          <div className="active-banner-left">
            <div className="active-banner-icon">
              <Icon name="video" size={24} />
            </div>
            <div>
              <span className="active-banner-tag">PHIÊN KHÁM ĐANG DIỄN RA</span>
              <h3 className="active-banner-title">
                {activeConsultation.doctor} · {activeConsultation.specialty}
              </h3>
              <p className="active-banner-desc">
                Bắt đầu lúc: {activeConsultation.time} · {activeConsultation.modality}
              </p>
            </div>
          </div>
          <div className="active-banner-actions">
            {activeConsultation.meetingUrl && (
              <Button
                onClick={() => window.open(activeConsultation.meetingUrl, "_blank")}
                icon="video"
              >
                Vào phòng khám từ xa
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                onSelectConsultation(activeConsultation);
                go("consultation-detail");
              }}
            >
              Xem chi tiết phiên khám
            </Button>
          </div>
        </div>
      )}

      {/* Danh sách phiên khám hoàn thành */}
      <div className="results-head" style={{ marginBottom: "14px" }}>
        <div>
          <h2>Lịch sử phiên khám ({completedList.length})</h2>
          <p>Hồ sơ và kết quả chẩn đoán từ bác sĩ chuyên khoa</p>
        </div>
      </div>

      {completedList.length > 0 ? (
        <div className="list-stack">
          {completedList.map((c) => (
            <article className="card consultation-row" key={c.id}>
              <div className="consult-icon">
                <Icon name={c.modality.includes("tuyến") ? "video" : "chat"} />
              </div>
              <div className="consult-main">
                <span className="consult-date">{c.date}</span>
                <h3>{c.doctor}</h3>
                <p>
                  {c.specialty} · {c.modality} · Thời lượng: {c.duration} phút
                </p>
              </div>
              <Badge tone="blue">{c.status}</Badge>
              <Button
                variant="secondary"
                onClick={() => {
                  onSelectConsultation(c);
                  go("consultation-detail");
                }}
              >
                Xem chi tiết
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">
            <Icon name="chat" size={26} />
          </div>
          <h3>Chưa có phiên khám đã hoàn thành</h3>
          <p>Sau khi bác sĩ hoàn thành thăm khám, kết quả và ghi chú sẽ hiển thị tại đây.</p>
        </div>
      )}
    </>
  );
}

// ---------------- CONSULTATION DETAIL (Phương án 1) ----------------
function ConsultationDetail({
  go,
  consultation,
  prescriptions,
  onSelectPrescription,
}: {
  go: (p: Page) => void;
  consultation: Consultation | null;
  prescriptions: Prescription[];
  onSelectPrescription: (p: Prescription) => void;
}) {
  if (!consultation) {
    return (
      <>
        <BackButton onClick={() => go("consultations")} label="Quay lại phiên khám" />
        <p>Không tìm thấy thông tin phiên khám.</p>
      </>
    );
  }

  // CHỈ lấy đơn thuốc gắn với đúng mã phiên khám này, tuyệt đối không lấy bừa đơn thuốc khác
  const matchingRx = prescriptions.find(
    (p) =>
      p.sessionId === consultation.id ||
      (consultation.prescriptionId && p.id === consultation.prescriptionId)
  );

  return (
    <>
      <BackButton onClick={() => go("consultations")} label="Quay lại phiên khám" />
      <PageHeader
        title={consultation.isActive ? "Phiên khám đang diễn ra" : "Chi tiết phiên khám"}
        description={
          consultation.isActive
            ? `Phiên khám đang được thực hiện bởi ${consultation.doctor} (${consultation.specialty})`
            : `Phiên khám ${consultation.status.toLowerCase()} ngày ${consultation.date}`
        }
      />
      <div className="record-layout">
        <section className="card record-card">
          <div className="record-head">
            <div>
              <span className="eyebrow">
                {consultation.specialty.toUpperCase()}
                {consultation.isActive ? " · ĐANG DIỄN RA" : ""}
              </span>
              <h2>
                {consultation.isActive
                  ? `Phiên khám ${consultation.modality.toLowerCase()} đang thực hiện`
                  : consultation.diagnosis || "Phiên khám chuyên khoa"}
              </h2>
              <p>
                {consultation.doctor} · {consultation.modality}
              </p>
            </div>
            <Badge tone={consultation.isActive ? "amber" : "blue"}>{consultation.status}</Badge>
          </div>

          {/* Banner kết nối nếu đang trong phiên khám */}
          {consultation.isActive && (
            <div
              style={{
                background: "var(--mint)",
                border: "1.5px solid var(--primary)",
                borderRadius: "10px",
                padding: "16px 20px",
                margin: "18px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Icon name="video" size={24} />
                <div>
                  <strong style={{ display: "block", color: "var(--primary)", fontSize: "14px" }}>
                    Bác sĩ đang trong phiên khám
                  </strong>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                    {consultation.modality.includes("tuyến")
                      ? "Bạn có thể kết nối ngay vào phòng tư vấn trực tuyến để gặp bác sĩ qua cuộc gọi video."
                      : "Buổi khám trực tiếp đang được tiến hành tại phòng khám."}
                  </span>
                </div>
              </div>
              {consultation.meetingUrl && (
                <Button onClick={() => window.open(consultation.meetingUrl, "_blank")} icon="video">
                  Vào phòng khám từ xa
                </Button>
              )}
            </div>
          )}

          <div className="record-section">
            <h3>Lý do khám ban đầu</h3>
            <p>
              <strong>Lý do:</strong> {consultation.complaint || "Khám và tư vấn sức khỏe"}
            </p>
            {consultation.symptoms && (
              <p style={{ marginTop: "6px" }}>
                <strong>Triệu chứng ban đầu:</strong> {consultation.symptoms}
              </p>
            )}
          </div>

          <div className="record-section">
            <h3>Đánh giá và chẩn đoán của bác sĩ</h3>
            {consultation.isActive ? (
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg)",
                  borderRadius: "8px",
                  border: "1px dashed var(--border)",
                  color: "var(--muted)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                <strong style={{ color: "var(--text)", display: "block", marginBottom: "4px" }}>
                  ⏳ Bác sĩ đang tiến hành thăm khám
                </strong>
                {consultation.diagnosis ? (
                  <p style={{ margin: "4px 0", color: "var(--text)" }}>
                    <strong>Ghi chú sơ bộ:</strong> {consultation.diagnosis}
                  </p>
                ) : null}
                Kết luận chẩn đoán, đánh giá lâm sàng và dặn dò chi tiết sẽ được bác sĩ{" "}
                {consultation.doctor} ghi nhận và cập nhật vào hồ sơ ngay sau khi hoàn thành phiên
                khám.
              </div>
            ) : (
              <>
                <p>
                  <strong>{consultation.diagnosis || "Khám và tư vấn chuyên khoa"}</strong>
                </p>
                <p>{consultation.notes || "Các chỉ số sức khỏe của bệnh nhân ổn định."}</p>
              </>
            )}
          </div>

          <div className="record-section">
            <h3>Kế hoạch điều trị & Dặn dò</h3>
            {consultation.isActive ? (
              <p style={{ color: "var(--muted)", fontStyle: "italic", margin: 0, fontSize: "13px" }}>
                {consultation.plan ||
                  "Kế hoạch điều trị và hướng dẫn chăm sóc sẽ được bác sĩ chỉ định khi kết thúc buổi khám."}
              </p>
            ) : (
              <p>
                {consultation.plan ||
                  "Duy trì chế độ ăn uống khoa học, vận động nhẹ nhàng và tái khám định kỳ theo lịch hẹn."}
              </p>
            )}
          </div>

          <div className="record-section">
            <h3>Đơn thuốc liên quan</h3>
            {matchingRx && !consultation.isActive ? (
              <button
                className="related-link"
                onClick={() => {
                  onSelectPrescription(matchingRx);
                  go("prescription-detail");
                }}
              >
                <span className="quick-icon">
                  <Icon name="pill" />
                </span>
                <span>
                  <strong>{matchingRx.diagnosis || "Đơn thuốc chỉ định"}</strong>
                  <small>
                    {matchingRx.count} loại thuốc · Bác sĩ {matchingRx.doctor}
                  </small>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            ) : consultation.isActive ? (
              <p style={{ color: "var(--muted)", fontStyle: "italic", margin: 0, fontSize: "13px" }}>
                Chưa có đơn thuốc (bác sĩ sẽ kê đơn nếu có chỉ định dùng thuốc sau khi kết thúc buổi khám).
              </p>
            ) : (
              <p style={{ color: "var(--muted)", fontStyle: "italic", margin: 0, fontSize: "13px" }}>
                Phiên khám này không có kê đơn thuốc.
              </p>
            )}
          </div>
        </section>

        <aside className="card patient-mini">
          <h3>Thông tin phiên khám</h3>
          <div>
            <span>Mã tham chiếu</span>
            <strong>{consultation.id}</strong>
          </div>
          <div>
            <span>Lịch hẹn liên quan</span>
            <strong>{consultation.appointmentId}</strong>
          </div>
          <div>
            <span>Ngày khám</span>
            <strong>{consultation.date}</strong>
          </div>
          <div>
            <span>Thời lượng</span>
            <strong>{consultation.duration} phút</strong>
          </div>
          <div>
            <span>Hình thức</span>
            <strong>{consultation.modality}</strong>
          </div>
          <div>
            <span>Bác sĩ phụ trách</span>
            <strong>{consultation.doctor}</strong>
          </div>
        </aside>
      </div>
    </>
  );
}

// ---------------- MEDICAL HISTORY ----------------
function MedicalHistory({
  go,
  records,
  onSelectRecord,
}: {
  go: (p: Page) => void;
  records: MedicalRecord[];
  onSelectRecord: (r: MedicalRecord) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return records.filter(
      (r) =>
        r.diagnosis.toLowerCase().includes(query.toLowerCase()) ||
        r.doctor.toLowerCase().includes(query.toLowerCase())
    );
  }, [records, query]);

  return (
    <>
      <PageHeader
        title="Bệnh sử"
        description="Theo dõi hồ sơ bệnh án rõ ràng theo trình tự thời gian."
      />
      <div className="history-summary card">
        <div className="stat-icon">
          <Icon name="file" />
        </div>
        <div>
          <strong>{records.length}</strong>
          <span>Tổng số hồ sơ bệnh án</span>
        </div>
        <label>
          <Icon name="search" size={18} />
          <input
            placeholder="Tìm kiếm hồ sơ theo chẩn đoán hoặc bác sĩ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select>
          <option>Tất cả năm</option>
          <option>2026</option>
          <option>2025</option>
        </select>
      </div>

      <div className="timeline">
        {filtered.map((r) => (
          <article key={r.id}>
            <div className="timeline-dot" />
            <div className="card history-record">
              <div>
                <span className="record-date">{r.date}</span>
                <h3>{r.diagnosis}</h3>
                <p>{r.notes || "Hồ sơ bệnh án ghi nhận sau phiên khám lâm sàng."}</p>
                <span className="doctor-ref">
                  <Icon name="stethoscope" size={16} />
                  {r.doctor} · {r.specialty}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  onSelectRecord(r);
                  go("history-detail");
                }}
              >
                Xem hồ sơ
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ---------------- HISTORY DETAIL ----------------
function HistoryDetail({
  go,
  record,
  profile,
}: {
  go: (p: Page) => void;
  record: MedicalRecord | null;
  profile: PatientProfile;
}) {
  if (!record) {
    return (
      <>
        <BackButton onClick={() => go("history")} label="Quay lại bệnh sử" />
        <p>Không tìm thấy thông tin hồ sơ bệnh án.</p>
      </>
    );
  }

  return (
    <>
      <BackButton onClick={() => go("history")} label="Quay lại bệnh sử" />
      <PageHeader title="Hồ sơ bệnh án" description={`Được ghi nhận vào ${record.date}`} />
      <section className="card record-card">
        <div className="record-head">
          <div>
            <span className="eyebrow">HỒ SƠ BỆNH ÁN · {record.id}</span>
            <h2>{record.diagnosis}</h2>
            <p>
              Được ghi nhận bởi {record.doctor}, {record.specialty}
            </p>
          </div>
          <Badge tone="blue">Hoàn tất</Badge>
        </div>
        <div className="patient-strip">
          <div>
            <small>Bệnh nhân</small>
            <strong>{profile.name}</strong>
          </div>
          <div>
            <small>Ngày sinh</small>
            <strong>{profile.dob}</strong>
          </div>
          <div>
            <small>Phiên khám</small>
            <strong>{record.sessionId || "TiTiMi Clinic"}</strong>
          </div>
        </div>
        <div className="record-section">
          <h3>Triệu chứng ghi nhận</h3>
          <p>{record.symptoms || "Không có triệu chứng cảnh báo đặc biệt."}</p>
        </div>
        <div className="record-section">
          <h3>Chẩn đoán</h3>
          <p>
            <strong>{record.diagnosis}</strong>
          </p>
        </div>
        <div className="record-section">
          <h3>Ghi chú lâm sàng & Dặn dò</h3>
          <p>
            {record.notes ||
              "Bệnh nhân có thể trạng ổn định. Đã tư vấn chế độ dinh dưỡng và theo dõi các chỉ số sinh hóa định kỳ."}
          </p>
        </div>
      </section>
    </>
  );
}

// ---------------- PRESCRIPTIONS ----------------
function Prescriptions({
  go,
  prescriptions,
  onSelectPrescription,
}: {
  go: (p: Page) => void;
  prescriptions: Prescription[];
  onSelectPrescription: (p: Prescription) => void;
}) {
  return (
    <>
      <PageHeader
        title="Đơn thuốc"
        description="Xem hướng dẫn sử dụng thuốc và liều lượng từ đội ngũ chăm sóc."
      />
      <div className="prescription-grid">
        {prescriptions.map((r) => {
          const firstMed = r.items && r.items.length > 0 ? r.items[0].name : r.diagnosis;
          return (
            <article className="card rx-card" key={r.id}>
              <div className="rx-top">
                <span className="rx-icon">
                  <Icon name="pill" />
                </span>
                <Badge tone={r.status === "Đang dùng" ? "green" : "gray"}>{r.status}</Badge>
              </div>
              <span className="record-date">KÊ ĐƠN NGÀY {r.date.toUpperCase()}</span>
              <h3>{firstMed}</h3>
              <p>{r.count} loại thuốc · Phiên khám liên quan</p>
              <div className="rx-doctor">
                <Icon name="stethoscope" size={17} />
                {r.doctor}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  onSelectPrescription(r);
                  go("prescription-detail");
                }}
              >
                Xem chi tiết
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ---------------- PRESCRIPTION DETAIL ----------------
function PrescriptionDetail({
  go,
  prescription,
}: {
  go: (p: Page) => void;
  prescription: Prescription | null;
}) {
  if (!prescription) {
    return (
      <>
        <BackButton onClick={() => go("prescriptions")} label="Quay lại đơn thuốc" />
        <p>Không tìm thấy thông tin đơn thuốc.</p>
      </>
    );
  }

  return (
    <>
      <BackButton onClick={() => go("prescriptions")} label="Quay lại đơn thuốc" />
      <PageHeader title="Chi tiết đơn thuốc" description={`Mã đơn thuốc: ${prescription.id}`} />
      <section className="card rx-detail">
        <div className="rx-detail-head">
          <div>
            <span className="eyebrow">KÊ ĐƠN NGÀY {prescription.date.toUpperCase()}</span>
            <h2>{prescription.diagnosis}</h2>
            <p>
              Kê bởi {prescription.doctor} · {prescription.specialty}
            </p>
          </div>
          <Badge>{prescription.status}</Badge>
        </div>

        <div className="med-table">
          <div className="med-head">
            <span>Thuốc</span>
            <span>Liều lượng</span>
            <span>Tần suất sử dụng</span>
            <span>Thời gian sử dụng</span>
          </div>
          {prescription.items && prescription.items.length > 0 ? (
            prescription.items.map((it, idx) => (
              <div className="med-row" key={idx}>
                <span>
                  <strong>{it.name}</strong>
                  <small>{it.instructions}</small>
                </span>
                <strong>{it.dosage}</strong>
                <strong>{it.frequency}</strong>
                <strong>{it.duration}</strong>
              </div>
            ))
          ) : (
            <div className="med-row">
              <span>
                <strong>{prescription.diagnosis}</strong>
                <small>Uống theo chỉ định</small>
              </span>
              <strong>Theo phác đồ</strong>
              <strong>Mỗi ngày</strong>
              <strong>7 ngày</strong>
            </div>
          )}
        </div>

        <div className="instruction-box">
          <h3>Hướng dẫn sử dụng chung</h3>
          <p>
            {prescription.notes ||
              "Uống thuốc đúng giờ và đủ liều theo hướng dẫn của bác sĩ. Không tự ý ngưng hoặc thay đổi liều lượng thuốc khi chưa có ý kiến của nhân viên y tế."}
          </p>
        </div>

        <div className="safety-note">
          <strong>Lưu ý:</strong> Hãy làm theo hướng dẫn của bác sĩ. Thông tin trên cổng thông tin
          này không thay thế tư vấn y tế trực tiếp từ đội ngũ chuyên khoa TiTiMi.
        </div>
      </section>
    </>
  );
}

// ---------------- PROFILE ----------------
function Profile({
  profile,
  onProfileUpdated,
  showToast,
}: {
  profile: PatientProfile;
  onProfileUpdated: (p: PatientProfile) => void;
  showToast: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(profile);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const initials = useMemo(() => {
    return (
      form.name
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "BN"
    );
  }, [form.name]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = assistEmail(form.email);
    const cleanPhone = normalizePhone(form.phone);
    const emailErr = validateEmail(cleanEmail, "Email", false);
    const phoneErr = cleanPhone === profile.phone ? null : validatePhone(cleanPhone, "Số điện thoại");
    if (emailErr || phoneErr) {
      const msg = emailErr || phoneErr || "Dữ liệu không hợp lệ.";
      setError(msg);
      showToast(msg);
      return;
    }
    const nextForm = { ...form, email: cleanEmail, phone: cleanPhone };
    setForm(nextForm);
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        email: cleanEmail,
        phone: cleanPhone,
        address: nextForm.address.trim(),
        allergies: nextForm.allergies.trim(),
        chronicDiseases: nextForm.chronicDiseases.trim(),
        emergencyContactName: nextForm.emergencyContactName,
        emergencyContactPhone: nextForm.emergencyContactPhone,
      });
      onProfileUpdated(nextForm);
      setEditing(false);
      setSaved(true);
      showToast("Đã lưu thay đổi hồ sơ cá nhân!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.";
      setError(msg);
      showToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Xem và cập nhật thông tin cá nhân của bạn trên hệ thống TiTiMi."
        action={
          !editing ? (
            <Button
              icon="edit"
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              Chỉnh sửa hồ sơ
            </Button>
          ) : undefined
        }
      />

      {saved && (
        <div className="inline-success">
          <Icon name="check" size={19} />
          <div>
            <strong>Hồ sơ đã cập nhật</strong>
            <span>Các thay đổi của bạn đã được đồng bộ với cơ sở dữ liệu TiTiMi.</span>
          </div>
          <button onClick={() => setSaved(false)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="inline-alert" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b", marginBottom: "1.25rem" }}>
          <Icon name="alert" size={19} />
          <div>
            <strong>Không thể lưu thay đổi</strong>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <div className="profile-layout">
        <aside className="card profile-card">
          <div className="profile-avatar">{initials}</div>
          <h2>{form.name}</h2>
          <p>Bệnh nhân</p>
          <span className="patient-id">Mã bệnh nhân · {form.id}</span>
          <div className="profile-contact">
            <span>
              <Icon name="mail" size={17} />
              {form.email || "Chưa cập nhật email"}
            </span>
            <span>
              <Icon name="phone" size={17} />
              {form.phone}
            </span>
            <span>
              <Icon name="map" size={17} />
              {form.address || "Chưa có địa chỉ"}
            </span>
          </div>
        </aside>

        <form className="card profile-form" onSubmit={submit}>
          <div className="profile-form-head">
            <div>
              <h2>Thông tin cá nhân</h2>
              <p>
                {editing
                  ? "Cập nhật các trường bên dưới, sau đó nhấn lưu thay đổi."
                  : "Thông tin bệnh nhân đã đăng ký trong hồ sơ y tế."}
              </p>
            </div>
            {editing && <Badge tone="amber">Đang chỉnh sửa</Badge>}
          </div>

          <div className="form-grid">
            <label>
              <span>Họ và tên</span>
              <input
                disabled
                value={form.name}
              />
            </label>
            <label>
              <span>Mã hồ sơ bệnh nhân</span>
              <input
                disabled
                value={form.id}
              />
            </label>
            <label>
              <span>Địa chỉ email</span>
              <input
                type="email"
                disabled={!editing}
                maxLength={100}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={() => setForm((prev) => ({ ...prev, email: assistEmail(prev.email) }))}
                placeholder="benhnhan@gmail.com"
              />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input
                disabled={!editing}
                maxLength={15}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={() => setForm((prev) => ({ ...prev, phone: normalizePhone(prev.phone) }))}
                placeholder="0901234567"
              />
            </label>
            <label>
              <span>Ngày sinh</span>
              <input
                type="date"
                disabled
                value={form.dob}
              />
            </label>
            <label>
              <span>Giới tính</span>
              <select
                disabled
                value={form.gender}
              >
                <option>Nam</option>
                <option>Nữ</option>
                <option>Khác</option>
              </select>
            </label>
            <label className="full-field">
              <span>Địa chỉ thường trú</span>
              <textarea
                disabled={!editing}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label>
              <span>Nhóm máu</span>
              <input
                disabled
                value={form.blood || "Chưa ghi nhận"}
              />
            </label>
            <label>
              <span>Dị ứng thuốc</span>
              <input
                disabled={!editing}
                value={form.allergies || ""}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </label>
          </div>

          {editing && (
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

// ---------------- MAIN APP SHELL ----------------
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Live Data States
  const [profile, setProfile] = useState<PatientProfile>(defaultProfile);
  const [doctors, setDoctors] = useState<Doctor[]>(defaultDoctors);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Selected Detail Entities
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(defaultDoctors[0]);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [targetCancelAppt, setTargetCancelAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    loadPatientPortalData()
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        if (data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          setSelectedDoctor(data.doctors[0]);
        }
        if (data.appointments) {
          setAppointments(data.appointments);
          if (data.appointments.length > 0) setSelectedAppointment(data.appointments[0]);
        }
        if (data.consultations) {
          setConsultations(data.consultations);
          if (data.consultations.length > 0) setSelectedConsultation(data.consultations[0]);
        }
        if (data.records) {
          setRecords(data.records);
          if (data.records.length > 0) setSelectedRecord(data.records[0]);
        }
        if (data.prescriptions) {
          setPrescriptions(data.prescriptions);
          if (data.prescriptions.length > 0) setSelectedPrescription(data.prescriptions[0]);
        }
      })
      .catch((err) => {
        console.warn("Lỗi nạp dữ liệu từ backend, dùng dữ liệu mặc định:", err);
      });
  }, []);

  const go = (p: Page) => {
    setPage(p);
    setMobileOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  const handleAskCancel = (appt: Appointment) => {
    setTargetCancelAppt(appt);
    setCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!targetCancelAppt) return;
    try {
      await cancelAppointment(targetCancelAppt.id, "Bệnh nhân yêu cầu hủy qua cổng trực tuyến");
      setAppointments((prev) =>
        prev.map((a) => (a.id === targetCancelAppt.id ? { ...a, status: "Đã hủy" } : a))
      );
      if (selectedAppointment?.id === targetCancelAppt.id) {
        setSelectedAppointment((prev) => prev ? { ...prev, status: "Đã hủy" } : null);
      }
      showToast("Đã hủy lịch hẹn thành công");
    } catch (err: any) {
      showToast(err.message || "Không thể hủy lịch hẹn này.");
    } finally {
      setCancelOpen(false);
      setTargetCancelAppt(null);
    }
  };

  const handleLogout = async () => {
    await logoutPatient();
  };

  const patientInitials = useMemo(() => {
    return (
      profile.name
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "BN"
    );
  }, [profile.name]);

  const currentNav =
    page.includes("doctor") || page === "booking"
      ? "doctors"
      : page.includes("appointment")
        ? "appointments"
        : page.includes("consultation")
          ? "consultations"
          : page.includes("history")
            ? "history"
            : page.includes("prescription")
              ? "prescriptions"
              : page;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src={titimiLogo} alt="TiTiMi" />
          <div>
            <strong>TiTiMi</strong>
            <small>PHÒNG KHÁM & Y TẾ TỪ XA</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav>
          <span className="nav-label">CỔNG THÔNG TIN BỆNH NHÂN</span>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={currentNav === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {currentNav === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <div className="help-icon">
            <Icon name="chat" />
          </div>
          <strong>Bạn cần hỗ trợ?</strong>
          <p>Đội ngũ hỗ trợ bệnh nhân luôn sẵn sàng giúp đỡ.</p>
          <button onClick={() => showToast("Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ liên hệ lại ngay!")}>
            Liên hệ hỗ trợ
          </button>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <Icon name="logout" />
          <span>Đăng xuất</span>
        </button>
      </aside>

      {mobileOpen && (
        <button
          className="scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng điều hướng"
        />
      )}

      <div className="main-shell">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở điều hướng"
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>Cổng thông tin bệnh nhân</span>
            <Icon name="chevron" size={14} />
            <strong>{pageTitles[page]}</strong>
          </div>
          <div className="top-actions">
            <button
              className="notification-button"
              onClick={() => setNoticeOpen(!noticeOpen)}
              aria-label="Thông báo"
            >
              <Icon name="bell" />
              <span />
            </button>
            <button className="user-button" onClick={() => setProfileOpen(!profileOpen)}>
              <span className="avatar">{patientInitials}</span>
              <span className="user-copy">
                <strong>{profile.name}</strong>
                <small>Bệnh nhân</small>
              </span>
              <Icon name="chevron" size={15} />
            </button>
          </div>

          {noticeOpen && (
            <div className="popover notifications">
              <div>
                <h3>Thông báo</h3>
                <button onClick={() => setNoticeOpen(false)}>Đánh dấu đã đọc</button>
              </div>
              <article>
                <span className="notice-icon">
                  <Icon name="calendar" size={18} />
                </span>
                <p>
                  <strong>Lịch hẹn gần nhất</strong>
                  {appointments.length > 0
                    ? `Lịch khám với bác sĩ ${appointments[0].doctor} vào ${appointments[0].date}.`
                    : "Không có thông báo mới."}
                </p>
              </article>
              <article>
                <span className="notice-icon">
                  <Icon name="pill" size={18} />
                </span>
                <p>
                  <strong>Đơn thuốc điều trị</strong>
                  {prescriptions.length > 0
                    ? `Bạn có ${prescriptions.length} đơn thuốc trong hồ sơ.`
                    : "Chưa có đơn thuốc mới."}
                </p>
              </article>
            </div>
          )}

          {profileOpen && (
            <div className="popover profile-menu">
              <button onClick={() => go("profile")}>
                <Icon name="user" size={18} />
                Xem hồ sơ cá nhân
              </button>
              <button onClick={handleLogout}>
                <Icon name="logout" size={18} />
                Đăng xuất
              </button>
            </div>
          )}
        </header>

        <main className="main-content">
          {page === "dashboard" && (
            <Dashboard
              go={go}
              profile={profile}
              appointments={appointments}
              records={records}
              prescriptions={prescriptions}
              onSelectAppointment={(a) => setSelectedAppointment(a)}
            />
          )}

          {page === "doctors" && (
            <FindDoctors
              go={go}
              doctors={doctors}
              onSelectDoctor={(d) => setSelectedDoctor(d)}
              onBookDoctor={(d) => {
                setSelectedDoctor(d);
                setBookingDoctor(d);
                go("booking");
              }}
            />
          )}

          {page === "doctor-detail" && (
            <DoctorDetail
              go={go}
              doctor={selectedDoctor}
              onBookDoctor={(d) => {
                setSelectedDoctor(d);
                setBookingDoctor(d);
                go("booking");
              }}
            />
          )}

          {page === "booking" && (
            <Booking
              go={go}
              showToast={showToast}
              doctors={doctors}
              profile={profile}
              initialDoctor={bookingDoctor}
              onAppointmentBooked={(newAppt) => {
                setAppointments((prev) => [newAppt, ...prev]);
                setSelectedAppointment(newAppt);
              }}
            />
          )}

          {page === "appointments" && (
            <Appointments
              go={go}
              appointments={appointments}
              onSelectAppointment={(a) => setSelectedAppointment(a)}
              onViewSession={(a) => {
                if (!a.sessionId) {
                  showToast("Lịch hẹn này chưa có phiên khám liên kết.");
                  return;
                }
                const found = consultations.find((c) => c.id === a.sessionId);
                if (!found) {
                  showToast("Không tìm thấy chi tiết phiên khám tương ứng.");
                  return;
                }
                setSelectedConsultation(found);
                go("consultation-detail");
              }}
              askCancel={handleAskCancel}
            />
          )}

          {page === "appointment-detail" && (
            <AppointmentDetail
              go={go}
              appointment={selectedAppointment}
              askCancel={handleAskCancel}
              onViewDoctor={(docName) => {
                const found = doctors.find((d) => d.name === docName);
                if (found) setSelectedDoctor(found);
              }}
              onViewConsultation={(sId) => {
                const found = consultations.find((c) => c.id === sId);
                if (!found) {
                  showToast("Không tìm thấy chi tiết phiên khám tương ứng.");
                  return;
                }
                setSelectedConsultation(found);
                go("consultation-detail");
              }}
            />
          )}

          {page === "consultations" && (
            <Consultations
              go={go}
              consultations={consultations}
              onSelectConsultation={(c) => setSelectedConsultation(c)}
            />
          )}

          {page === "consultation-detail" && (
            <ConsultationDetail
              go={go}
              consultation={selectedConsultation}
              prescriptions={prescriptions}
              onSelectPrescription={(p) => setSelectedPrescription(p)}
            />
          )}

          {page === "history" && (
            <MedicalHistory
              go={go}
              records={records}
              onSelectRecord={(r) => setSelectedRecord(r)}
            />
          )}

          {page === "history-detail" && (
            <HistoryDetail
              go={go}
              record={selectedRecord}
              profile={profile}
            />
          )}

          {page === "prescriptions" && (
            <Prescriptions
              go={go}
              prescriptions={prescriptions}
              onSelectPrescription={(p) => setSelectedPrescription(p)}
            />
          )}

          {page === "prescription-detail" && (
            <PrescriptionDetail
              go={go}
              prescription={selectedPrescription}
            />
          )}

          {page === "profile" && (
            <Profile
              profile={profile}
              onProfileUpdated={(updated) => setProfile(updated)}
              showToast={showToast}
            />
          )}
        </main>

        <nav className="mobile-tabs">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className={currentNav === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} />
              <small>{item.label.replace("My ", "")}</small>
            </button>
          ))}
          <button onClick={() => setMobileOpen(true)}>
            <Icon name="menu" />
            <small>Thêm</small>
          </button>
        </nav>
      </div>

      {cancelOpen && targetCancelAppt && (
        <div className="modal-layer">
          <button className="modal-scrim" onClick={() => setCancelOpen(false)} />
          <div className="modal">
            <div className="modal-icon">
              <Icon name="calendar" />
            </div>
            <h2>Hủy lịch hẹn này?</h2>
            <p>
              Lịch khám với bác sĩ {targetCancelAppt.doctor} vào {targetCancelAppt.date} lúc {targetCancelAppt.time} sẽ bị hủy. Bạn có chắc chắn muốn thực hiện?
            </p>
            <div>
              <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                Giữ lịch hẹn
              </Button>
              <Button variant="danger" onClick={handleConfirmCancel}>
                Có, xác nhận hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={18} />
          </span>
          <div>
            <strong>{toast}</strong>
            <small>Hệ thống TiTiMi đã đồng bộ thông tin của bạn.</small>
          </div>
          <button onClick={() => setToast("")}>
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
