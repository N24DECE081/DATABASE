import { useEffect, useMemo, useState } from "react";
import {
  createConsultation,
  finishConsultation,
  loadDoctorPortal,
  logoutDoctor,
  updateAppointmentStatus,
  updateConsultationNotes,
  updateDoctorProfile,
  type Appointment,
  type AppointmentStatus,
  type Consultation,
  type DoctorPortalData,
  type DoctorProfile,
  type MedicalRecord,
  type Patient,
  type Prescription,
  type Schedule,
} from "./api";
import titimiLogo from "./assets/titimi-logo.png";

type Page =
  | "dashboard"
  | "appointments"
  | "schedule"
  | "patients"
  | "consultations"
  | "records"
  | "prescriptions"
  | "profile";
type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "appointments", label: "Lịch hẹn", icon: "calendar" },
  { id: "schedule", label: "Lịch làm việc", icon: "clock" },
  { id: "patients", label: "Bệnh nhân", icon: "users" },
  { id: "consultations", label: "Phiên khám", icon: "stethoscope" },
  { id: "records", label: "Hồ sơ bệnh án", icon: "file" },
  { id: "prescriptions", label: "Đơn thuốc", icon: "pill" },
  { id: "profile", label: "Hồ sơ cá nhân", icon: "user" },
];

const initialAppointments: Appointment[] = [
  {
    id: "LH-240612",
    patientId: "BN-1024",
    patient: "Trần Thu Hà",
    date: "2025-06-18",
    time: "08:30",
    reason: "Đau đầu kéo dài, mất ngủ",
    type: "Khám mới",
    status: "Đã xác nhận",
  },
  {
    id: "LH-240613",
    patientId: "BN-1031",
    patient: "Nguyễn Hoàng Nam",
    date: "2025-06-18",
    time: "09:15",
    reason: "Tái khám huyết áp",
    type: "Tái khám",
    status: "Chờ xác nhận",
  },
  {
    id: "LH-240614",
    patientId: "BN-0988",
    patient: "Lê Minh Tuấn",
    date: "2025-06-18",
    time: "10:00",
    reason: "Đau dạ dày",
    type: "Khám mới",
    status: "Hoàn thành",
  },
  {
    id: "LH-240615",
    patientId: "BN-1042",
    patient: "Phạm Ngọc Mai",
    date: "2025-06-18",
    time: "10:45",
    reason: "Tái khám sau điều trị",
    type: "Tái khám",
    status: "Đã xác nhận",
  },
  {
    id: "LH-240616",
    patientId: "BN-1017",
    patient: "Vũ Hải Yến",
    date: "2025-06-19",
    time: "08:00",
    reason: "Dị ứng thời tiết",
    type: "Khám mới",
    status: "Chờ xác nhận",
  },
  {
    id: "LH-240617",
    patientId: "BN-1050",
    patient: "Đỗ Quang Huy",
    date: "2025-06-19",
    time: "09:30",
    reason: "Kiểm tra sức khỏe",
    type: "Khám định kỳ",
    status: "Đã xác nhận",
  },
  {
    id: "LH-240618",
    patientId: "BN-1002",
    patient: "Bùi Thanh Lan",
    date: "2025-06-20",
    time: "14:00",
    reason: "Đau lưng kéo dài",
    type: "Tái khám",
    status: "Đã hủy",
  },
];

const patients: Patient[] = [
  {
    id: "BN-1024",
    name: "Trần Thu Hà",
    gender: "Nữ",
    dob: "12/04/1991",
    phone: "090 321 4588",
    email: "thuha@example.com",
    latest: "18/06/2025",
    blood: "O+",
    allergies: "Penicillin",
  },
  {
    id: "BN-1031",
    name: "Nguyễn Hoàng Nam",
    gender: "Nam",
    dob: "28/09/1984",
    phone: "091 775 2031",
    email: "hoangnam@example.com",
    latest: "18/06/2025",
    blood: "A+",
    allergies: "Không ghi nhận",
  },
  {
    id: "BN-0988",
    name: "Lê Minh Tuấn",
    gender: "Nam",
    dob: "03/02/1978",
    phone: "098 220 1198",
    email: "minhtuan@example.com",
    latest: "18/06/2025",
    blood: "B+",
    allergies: "Hải sản",
  },
  {
    id: "BN-1042",
    name: "Phạm Ngọc Mai",
    gender: "Nữ",
    dob: "19/11/1995",
    phone: "093 842 6651",
    email: "ngocmai@example.com",
    latest: "18/06/2025",
    blood: "AB+",
    allergies: "Không ghi nhận",
  },
  {
    id: "BN-1017",
    name: "Vũ Hải Yến",
    gender: "Nữ",
    dob: "07/07/1989",
    phone: "097 314 9270",
    email: "haiyen@example.com",
    latest: "22/05/2025",
    blood: "O-",
    allergies: "Bụi nhà",
  },
  {
    id: "BN-1050",
    name: "Đỗ Quang Huy",
    gender: "Nam",
    dob: "15/01/1990",
    phone: "086 525 1790",
    email: "quanghuy@example.com",
    latest: "03/06/2025",
    blood: "A-",
    allergies: "Không ghi nhận",
  },
];

const consultations = [
  {
    id: "PK-25061801",
    patientId: "BN-0988",
    patient: "Lê Minh Tuấn",
    appointment: "18/06/2025",
    date: "18/06/2025",
    diagnosis: "Viêm dạ dày cấp",
    status: "Hoàn thành",
  },
  {
    id: "PK-25061204",
    patientId: "BN-1024",
    patient: "Trần Thu Hà",
    appointment: "12/06/2025",
    date: "12/06/2025",
    diagnosis: "Rối loạn giấc ngủ",
    status: "Đã lưu",
  },
  {
    id: "PK-25060302",
    patientId: "BN-1050",
    patient: "Đỗ Quang Huy",
    appointment: "03/06/2025",
    date: "03/06/2025",
    diagnosis: "Khám sức khỏe định kỳ",
    status: "Hoàn thành",
  },
  {
    id: "PK-25052203",
    patientId: "BN-1017",
    patient: "Vũ Hải Yến",
    appointment: "22/05/2025",
    date: "22/05/2025",
    diagnosis: "Viêm mũi dị ứng",
    status: "Hoàn thành",
  },
];

const initialPrescriptions = [
  {
    id: "DT-25061801",
    patientId: "BN-0988",
    patient: "Lê Minh Tuấn",
    date: "18/06/2025",
    count: 2,
    status: "Đã kê",
  },
  {
    id: "DT-25061202",
    patientId: "BN-1024",
    patient: "Trần Thu Hà",
    date: "12/06/2025",
    count: 1,
    status: "Đã kê",
  },
  {
    id: "DT-25052201",
    patientId: "BN-1017",
    patient: "Vũ Hải Yến",
    date: "22/05/2025",
    count: 2,
    status: "Hết hạn",
  },
];

type IconName =
  | "grid"
  | "calendar"
  | "calendarPlus"
  | "clock"
  | "users"
  | "stethoscope"
  | "file"
  | "pill"
  | "user"
  | "search"
  | "bell"
  | "chevron"
  | "menu"
  | "x"
  | "arrow"
  | "check"
  | "plus"
  | "trash"
  | "edit"
  | "settings"
  | "logout"
  | "more"
  | "phone"
  | "mail"
  | "heart"
  | "briefcase";

const iconPaths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  calendarPlus: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 3v5a6 6 0 0 0 12 0V3M4 3h4M16 3h4M12 14v2a4 4 0 0 0 8 0v-1" />
      <circle cx="20" cy="12" r="2" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </>
  ),
  pill: (
    <>
      <path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z" />
      <path d="m7 10 7 7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  arrow: <path d="m15 18-6-6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .slice(-2)
    .map((x) => x[0])
    .join("");
  return <span className={`avatar avatar-${size}`}>{initials}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const kind =
    status.includes("Hoàn") || status === "Đã kê"
      ? "success"
      : status.includes("Chờ")
        ? "pending"
        : status.includes("hủy") || status === "Hết hạn"
          ? "danger"
          : "confirmed";
  return (
    <span className={`status status-${kind}`}>
      <i />
      {status}
    </span>
  );
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      {label && (
        <span>
          {label}
          {required && <b> *</b>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </label>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-box">
      <Icon name="search" size={17} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast">
      <span className="toast-icon">
        <Icon name="check" size={15} />
      </span>
      <div>
        <strong>Thông báo</strong>
        <p>{message}</p>
      </div>
      <button onClick={onClose} aria-label="Đóng">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-danger">
          <Icon name="trash" />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Xác nhận hủy
          </Button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  profile,
  onLogout,
  page,
  setPage,
  open,
  onClose,
}: {
  profile: DoctorProfile;
  onLogout: () => void;
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = (p: Page) => {
    setPage(p);
    onClose();
  };
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src={titimiLogo} alt="TiTiMi" />
          <div>
            <strong>TiTiMi</strong>
            <small>DOCTOR PORTAL</small>
          </div>
          <button className="mobile-close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <nav>
          <span className="nav-label">KHÔNG GIAN LÀM VIỆC</span>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {page === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="side-action">
            <Icon name="settings" />
            <span>Cài đặt</span>
          </button>
          <button className="side-action" onClick={onLogout}>
            <Icon name="logout" />
            <span>Đăng xuất</span>
          </button>
          <div className="doctor-mini">
            <Avatar name={profile.name} />
            <div>
              <strong>BS. {profile.name}</strong>
              <span>{profile.specialty}</span>
            </div>
            <Icon name="more" />
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({
  title,
  profile,
  appointments,
  onNavigate,
  onLogout,
  onMenu,
}: {
  title: string;
  profile: DoctorProfile;
  appointments: Appointment[];
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onMenu: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const pending = appointments.filter((appointment) => appointment.status === "Chờ xác nhận");
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="menu-btn" onClick={onMenu}>
          <Icon name="menu" />
        </button>
        <div>
          <span>Doctor Portal&nbsp; / &nbsp;</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="header-actions">
        <div className="date-display">
          <Icon name="calendar" size={17} />
          <span>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date())}</span>
        </div>
        <div className="dropdown-wrap">
          <button
            className="icon-btn"
            onClick={() => setNotiOpen(!notiOpen)}
            aria-label="Thông báo"
          >
            <Icon name="bell" />
            <i />
          </button>
          {notiOpen && (
            <div className="popover notifications">
              <strong>Thông báo</strong>
              <p>Lịch chờ xác nhận: {pending.length}</p>
            </div>
          )}
        </div>
        <div className="divider" />
        <div className="dropdown-wrap">
          <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
            <Avatar name={profile.name} size="sm" />
            <div>
              <strong>{profile.name}</strong>
              <span>Bác sĩ</span>
            </div>
            <Icon name="chevron" size={15} />
          </button>
          {profileOpen && (
            <div className="popover profile-pop">
              <button onClick={() => onNavigate("profile")}>
                <Icon name="user" />
                Hồ sơ cá nhân
              </button>
              <button>
                <Icon name="settings" />
                Cài đặt
              </button>
              <button onClick={onLogout}>
                <Icon name="logout" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  note: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function AppointmentTable({
  items,
  onView,
  compact = false,
}: {
  items: Appointment[];
  onView: (a: Appointment) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {!compact && <th>MÃ LỊCH HẸN</th>}
            <th>BỆNH NHÂN</th>
            <th>NGÀY & GIỜ</th>
            <th>LÝ DO KHÁM</th>
            <th>TRẠNG THÁI</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              {!compact && (
                <td>
                  <b>{a.id}</b>
                </td>
              )}
              <td>
                <div className="patient-cell">
                  <Avatar name={a.patient} size="sm" />
                  <div>
                    <strong>{a.patient}</strong>
                    <span>{a.patientId}</span>
                  </div>
                </div>
              </td>
              <td>
                <strong>{a.time}</strong>
                <span>{a.date.split("-").reverse().join("/")}</span>
              </td>
              <td>
                <strong>{a.reason}</strong>
                <span className={`type-pill ${a.type === "Tái khám" ? "type-follow-up" : ""}`}>
                  {a.type}
                </span>
              </td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              <td>
                <button className="view-link" onClick={() => onView(a)}>
                  Chi tiết <Icon name="chevron" size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <div className="empty">Không tìm thấy lịch hẹn phù hợp.</div>}
    </div>
  );
}

function Dashboard({
  appointments,
  profile,
  navigate,
  viewAppointment,
}: {
  appointments: Appointment[];
  profile: DoctorProfile;
  navigate: (p: Page) => void;
  viewAppointment: (a: Appointment) => void;
}) {
  const todayKey = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const today = appointments.filter((a) => a.date === todayKey);
  const next = today.filter((a) => a.status === "Chờ xác nhận" || a.status === "Đã xác nhận");
  const completed = appointments.filter((a) => a.status === "Hoàn thành").length;
  const patientCount = new Set(appointments.map((a) => a.patientId)).size;
  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <div className="page">
      <section className="welcome">
        <div>
          <span>{todayLabel.toLocaleUpperCase("vi-VN")}</span>
          <h1>Xin chào, Bác sĩ {profile.name}</h1>
          <p>Hôm nay bác sĩ có <b>{today.length} lịch hẹn</b>{next[0] ? `, ca tiếp theo lúc ${next[0].time}.` : "."}</p>
        </div>
        <div className="welcome-calendar">
          <Icon name="calendar" />
          <div>
            <span>LỊCH HÔM NAY</span>
            <strong>{new Date().getDate()}</strong>
            <small>{new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date())}</small>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        <StatCard
          icon="calendar"
          label="Lịch hẹn hôm nay"
          value={today.length}
          note={`${next.length} ca đang chờ`}
          tone="teal"
        />
        <StatCard
          icon="clock"
          label="Chờ xác nhận"
          value={appointments.filter((a) => a.status === "Chờ xác nhận").length}
          note="Cần xử lý"
          tone="amber"
        />
        <StatCard
          icon="check"
          label="Đã hoàn thành"
          value={completed}
          note="Tổng số lịch đã hoàn thành"
          tone="green"
        />
        <StatCard
          icon="users"
          label="Tổng bệnh nhân"
          value={patientCount}
          note="Bệnh nhân có lịch được phân công"
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card appointments-card">
          <div className="card-header">
            <div>
              <h2>Lịch hẹn hôm nay</h2>
              <p>Các lịch khám trong ngày của bác sĩ</p>
            </div>
            <button onClick={() => navigate("appointments")}>
              Xem tất cả <Icon name="chevron" size={14} />
            </button>
          </div>
          <AppointmentTable items={today.slice(0, 4)} onView={viewAppointment} compact />
        </section>
        <aside className="dashboard-side">
          <section className="card upcoming">
            <div className="card-header">
              <div>
                <h2>Sắp tới</h2>
                <p>Lịch khám tiếp theo</p>
              </div>
            </div>
            {next.slice(0, 3).map((a, i) => (
              <button key={a.id} className="upcoming-item" onClick={() => viewAppointment(a)}>
                <div className={i === 0 ? "time active-time" : "time"}>
                  <strong>{a.time}</strong>
                  <span>{i === 0 ? "Sắp tới" : "Hôm nay"}</span>
                </div>
                <div>
                  <strong>{a.patient}</strong>
                  <span>{a.reason}</span>
                </div>
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </section>
          <section className="card quick">
            <div className="card-header">
              <div>
                <h2>Truy cập nhanh</h2>
              </div>
            </div>
            <button onClick={() => navigate("appointments")}>
              <span>
                <Icon name="calendar" />
              </span>
              <div>
                <strong>Tất cả lịch hẹn</strong>
                <small>Quản lý và cập nhật lịch khám</small>
              </div>
              <Icon name="chevron" />
            </button>
            <button onClick={() => navigate("schedule")}>
              <span>
                <Icon name="clock" />
              </span>
              <div>
                <strong>Lịch làm việc</strong>
                <small>Xem lịch hôm nay</small>
              </div>
              <Icon name="chevron" />
            </button>
            <button onClick={() => navigate("patients")}>
              <span>
                <Icon name="users" />
              </span>
              <div>
                <strong>Danh sách bệnh nhân</strong>
                <small>{patientCount} bệnh nhân có lịch</small>
              </div>
              <Icon name="chevron" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AppointmentsPage({
  appointments,
  updateStatus,
  viewAppointment,
  toast,
}: {
  appointments: Appointment[];
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  viewAppointment: (a: Appointment) => void;
  toast: (m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [date, setDate] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const filtered = appointments.filter(
    (a) =>
      (status === "Tất cả" || a.status === status) &&
      (!date || a.date === date) &&
      `${a.patient} ${a.patientId} ${a.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const update = async (id: string, next: AppointmentStatus) => {
    try {
      await updateStatus(id, next);
      setCancelId(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không thể cập nhật lịch hẹn.");
    }
  };
  return (
    <div className="page">
      <PageHeading
        title="Quản lý lịch hẹn"
        description="Theo dõi và xử lý các lịch hẹn với bệnh nhân."
      />
      <div className="tabs">
        {["Tất cả", "Chờ xác nhận", "Đã xác nhận", "Hoàn thành", "Đã hủy"].map((x) => (
          <button className={status === x ? "active" : ""} onClick={() => setStatus(x)} key={x}>
            {x}
            <span>
              {x === "Tất cả"
                ? appointments.length
                : appointments.filter((a) => a.status === x).length}
            </span>
          </button>
        ))}
      </div>
      <section className="card">
        <div className="filter-bar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, mã bệnh nhân..."
          />
          <label className="select-field">
            <Icon name="calendar" size={17} />
            <input
              aria-label="Lọc theo ngày"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Trạng thái"
          >
            <option>Tất cả</option>
            <option>Chờ xác nhận</option>
            <option>Đã xác nhận</option>
            <option>Hoàn thành</option>
            <option>Đã hủy</option>
          </select>
          {(date || search) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDate("");
                setSearch("");
              }}
            >
              Xóa lọc
            </Button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MÃ LỊCH HẸN</th>
                <th>BỆNH NHÂN</th>
                <th>NGÀY & GIỜ</th>
                <th>LÝ DO KHÁM</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.id}</b>
                  </td>
                  <td>
                    <div className="patient-cell">
                      <Avatar name={a.patient} size="sm" />
                      <div>
                        <strong>{a.patient}</strong>
                        <span>{a.patientId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{a.date.split("-").reverse().join("/")}</strong>
                    <span>{a.time}</span>
                  </td>
                  <td>
                    <strong>{a.reason}</strong>
                    <span className={`type-pill ${a.type === "Tái khám" ? "type-follow-up" : ""}`}>
                      {a.type}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => viewAppointment(a)}>Xem</button>
                      {a.status === "Chờ xác nhận" && (
                        <button
                          className="confirm-link"
                          onClick={() => update(a.id, "Đã xác nhận")}
                        >
                          Xác nhận
                        </button>
                      )}
                      {a.status !== "Hoàn thành" && a.status !== "Đã hủy" && (
                        <button className="cancel-link" onClick={() => setCancelId(a.id)}>
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty">Không có lịch hẹn phù hợp với bộ lọc.</div>
          )}
        </div>
      </section>
      {cancelId && (
        <ConfirmDialog
          title="Hủy lịch hẹn?"
          message="Hành động này sẽ cập nhật trạng thái lịch hẹn thành Đã hủy. Bạn có chắc chắn muốn tiếp tục?"
          onClose={() => setCancelId(null)}
          onConfirm={() => update(cancelId, "Đã hủy")}
        />
      )}
    </div>
  );
}

function AppointmentDetail({
  appointment,
  patients,
  consultation,
  updateStatus,
  back,
  toast,
  startConsultation,
  startMeeting,
  openMeeting,
}: {
  appointment: Appointment;
  patients: Patient[];
  consultation?: Consultation;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  back: () => void;
  toast: (m: string) => void;
  startConsultation: () => void;
  startMeeting: (appointmentId: string) => Promise<string>;
  openMeeting: (sessionId: string) => void;
}) {
  const [item, setItem] = useState(appointment);
  const [cancel, setCancel] = useState(false);
  const [meetingBusy, setMeetingBusy] = useState(false);
  const patient = patients.find((p) => p.id === item.patientId);
  const update = async (status: AppointmentStatus) => {
    try {
      await updateStatus(item.id, status);
      setItem({ ...item, status });
      setCancel(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không thể cập nhật lịch hẹn.");
    }
  };
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" /> Quay lại danh sách lịch hẹn
      </button>
      <PageHeading
        eyebrow="CHI TIẾT LỊCH HẸN"
        title={item.id}
        description="Thông tin lịch hẹn và bệnh nhân."
        action={<StatusBadge status={item.status} />}
      />
      <div className="detail-layout">
        <main>
          <section className="card detail-card">
            <div className="section-title">
              <span>
                <Icon name="calendar" />
              </span>
              <div>
                <h2>Thông tin lịch hẹn</h2>
                <p>Chi tiết về thời gian và nội dung khám</p>
              </div>
            </div>
            <div className="info-grid">
              <Info label="Ngày hẹn" value={item.date.split("-").reverse().join("/")} />
              <Info label="Thời gian" value={item.time} />
              <Info label="Hình thức" value={item.modality || "Khám trực tiếp"} />
              <Info label="Loại lịch hẹn" value={item.type} />
              <Info label="Lý do khám" value={item.reason} wide />
              <Info label="Trạng thái" value={item.status} />
            </div>
          </section>
          <section className="card detail-card">
            <div className="section-title">
              <span>
                <Icon name="user" />
              </span>
              <div>
                <h2>Thông tin bệnh nhân</h2>
                <p>Thông tin cá nhân và liên hệ</p>
              </div>
            </div>
            <div className="patient-hero">
              <Avatar name={patient?.name || item.patient} size="lg" />
              <div>
                <h3>{patient?.name || item.patient}</h3>
                <p>
                  {item.patientId}{patient ? ` · Nhóm máu ${patient.blood}` : ""}
                </p>
              </div>
            </div>
            <div className="info-grid">
              <Info label="Giới tính" value={patient?.gender || "Chưa ghi nhận"} />
              <Info label="Ngày sinh" value={patient?.dob ? new Date(`${patient.dob}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa ghi nhận"} />
              <Info label="Số điện thoại" value={patient?.phone || "Chưa ghi nhận"} />
              <Info label="Email" value={patient?.email || "Chưa ghi nhận"} />
            </div>
          </section>
        </main>
        <aside className="card action-panel">
          <h2>Thao tác</h2>
          <p>Cập nhật trạng thái hoặc bắt đầu phiên khám.</p>
          {item.modality === "Tư vấn trực tuyến" && (
            <section className="meeting-action">
              <h3>Cuộc họp khám từ xa</h3>
              {consultation?.meetingUrl && !consultation.endedAt ? (
                <>
                  <Button
                    variant="secondary"
                    icon="phone"
                    disabled={!consultation.canJoinMeeting}
                    onClick={() => openMeeting(consultation.id)}
                  >
                    Mở cuộc họp
                  </Button>
                  {!consultation.canJoinMeeting && (
                    <p className="action-note">Phòng chỉ mở được sau check-in và trong khung giờ khám.</p>
                  )}
                </>
              ) : !consultation ? (
                <>
                  <Button
                    variant="secondary"
                    icon="phone"
                    disabled={!item.meetingStartAvailable || meetingBusy}
                    onClick={async () => {
                      setMeetingBusy(true);
                      try {
                        const sessionId = await startMeeting(item.id);
                        openMeeting(sessionId);
                      } catch (error) {
                        toast(error instanceof Error ? error.message : "Không thể tạo và mở phòng họp.");
                      } finally {
                        setMeetingBusy(false);
                      }
                    }}
                  >
                    {meetingBusy ? "Đang mở phòng..." : "Tạo phòng & mở cuộc họp"}
                  </Button>
                  {!item.meetingStartAvailable && item.meetingStartReason && (
                    <p className="action-note">{item.meetingStartReason}</p>
                  )}
                </>
              ) : (
                <p className="action-note">Phiên khám đã kết thúc hoặc chưa có phòng họp hoạt động.</p>
              )}
            </section>
          )}
          {item.status === "Chờ xác nhận" && (
            <Button icon="check" onClick={() => update("Đã xác nhận")}>
              Xác nhận lịch hẹn
            </Button>
          )}
          {item.status === "Đã xác nhận" && (
            <Button variant="secondary" icon="stethoscope" onClick={startConsultation}>
              Bắt đầu phiên khám
            </Button>
          )}
          {item.status !== "Đã hủy" && item.status !== "Hoàn thành" && (
            <Button variant="ghost" icon="x" onClick={() => setCancel(true)}>
              Hủy lịch hẹn
            </Button>
          )}
          <div className="action-note">
            <Icon name="file" />
            <p>Mọi thay đổi trạng thái đều được lưu trong phiên làm việc này.</p>
          </div>
        </aside>
      </div>
      {cancel && (
        <ConfirmDialog
          title="Hủy lịch hẹn?"
          message={`Bạn sắp hủy lịch hẹn ${item.id} của ${item.patient}.`}
          onClose={() => setCancel(false)}
          onConfirm={() => update("Đã hủy")}
        />
      )}
    </div>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`info ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SchedulePage({
  appointments,
  schedules,
  viewAppointment,
}: {
  appointments: Appointment[];
  schedules: Schedule[];
  viewAppointment: (a: Appointment) => void;
}) {
  const [view, setView] = useState("Tuần");
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const mapped = (day: string) => appointments.filter((appointment) => appointment.date === day);
  const weekLabel = `${new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long" }).format(new Date(`${week[0]}T00:00:00`))} – ${new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${week[6]}T00:00:00`))}`;
  const selectedSchedules = schedules.filter((schedule) => schedule.date === selectedDay);
  const dayAppointments = mapped(selectedDay);
  return (
    <div className="page">
      <PageHeading
        title="Lịch làm việc"
        description="Theo dõi lịch khám và khung giờ làm việc của bác sĩ."
      />
      <div className="calendar-toolbar">
        <div>
          <Button variant="secondary" onClick={() => setWeekOffset((x) => x - 1)}>
            <Icon name="arrow" />
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset(0)}>
            Hôm nay
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset((x) => x + 1)}>
            <span className="flip">
              <Icon name="arrow" />
            </span>
          </Button>
          <strong>{weekLabel}</strong>
        </div>
        <div className="segmented">
          {["Ngày", "Tuần", "Tháng"].map((x) => (
            <button key={x} onClick={() => setView(x)} className={view === x ? "active" : ""}>
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="schedule-layout">
        <section className="card calendar-card">
          <div className="week-head">
            <span>GMT+7</span>
            {week.map((d, i) => (
              <button
                key={d}
                className={selectedDay === d ? "today" : ""}
                onClick={() => setSelectedDay(d)}
              >
                <small>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}</small>
                <strong>{new Date(`${d}T00:00:00`).getDate()}</strong>
              </button>
            ))}
          </div>
          <div className="week-body">
            {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map(
              (time, row) => (
                <div className="time-row" key={time}>
                  <span>{time}</span>
                  {week.map((d) => (
                    <div className="day-cell" key={d}>
                      {mapped(d)
                        .filter((a) => Number(a.time.slice(0, 2)) === 8 + row)
                        .map((a) => (
                          <button
                            key={a.id}
                            className={`event event-${a.status === "Hoàn thành" ? "done" : a.status === "Chờ xác nhận" ? "pending" : a.status === "Đã hủy" ? "cancelled" : "confirmed"}`}
                            onClick={() => viewAppointment(a)}
                          >
                            <b>{a.time}</b>
                            <span>{a.patient}</span>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </section>
        <aside>
          <section className="card day-summary">
            <h2>Lịch ngày {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("vi-VN")}</h2>
            <p>{dayAppointments.length} lịch hẹn</p>
            {dayAppointments.map((a) => (
              <button key={a.id} onClick={() => viewAppointment(a)}>
                <time>{a.time}</time>
                <div>
                  <strong>{a.patient}</strong>
                  <span>{a.reason}</span>
                </div>
                <StatusBadge status={a.status} />
              </button>
            ))}
            {dayAppointments.length === 0 && (
              <div className="empty-small">Không có lịch hẹn.</div>
            )}
          </section>
          <section className="card slots">
            <h2>Ca làm việc</h2>
            {selectedSchedules.length ? selectedSchedules.map((schedule) => (
              <p key={schedule.id}>{schedule.start}–{schedule.end} · {schedule.status}</p>
            )) : <div className="empty-small">Không có ca làm việc.</div>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function PatientsPage({
  patients,
  openPatient,
}: {
  patients: Patient[];
  openPatient: (p: Patient) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = patients.filter((p) =>
    `${p.name} ${p.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeading
        title="Danh sách bệnh nhân"
        description="Tra cứu và quản lý hồ sơ bệnh nhân đang theo dõi."
      />
      <section className="card">
        <div className="filter-bar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên hoặc mã bệnh nhân..."
          />
          <span className="result-count">{filtered.length} bệnh nhân</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>BỆNH NHÂN</th>
                <th>GIỚI TÍNH</th>
                <th>NGÀY SINH</th>
                <th>LIÊN HỆ</th>
                <th>LẦN KHÁM GẦN NHẤT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="patient-cell">
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>{p.gender}</td>
                  <td>{new Date(`${p.dob}T00:00:00`).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <strong>{p.phone}</strong>
                    <span>{p.email}</span>
                  </td>
                  <td>{p.latest ? new Date(p.latest).toLocaleDateString("vi-VN") : "Chưa có"}</td>
                  <td>
                    <button className="view-link" onClick={() => openPatient(p)}>
                      Xem hồ sơ <Icon name="chevron" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PatientDetail({
  patient,
  appointments,
  consultations,
  prescriptions,
  records,
  back,
  openConsultations,
  openRecords,
  openPrescriptions,
}: {
  patient: Patient;
  appointments: Appointment[];
  consultations: Consultation[];
  prescriptions: Prescription[];
  records: MedicalRecord[];
  back: () => void;
  openConsultations: () => void;
  openRecords: () => void;
  openPrescriptions: () => void;
}) {
  const [tab, setTab] = useState("Tổng quan");
  const tabs = ["Tổng quan", "Lịch sử hẹn", "Phiên khám", "Đơn thuốc"];
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" /> Quay lại danh sách bệnh nhân
      </button>
      <section className="card patient-profile-head">
        <Avatar name={patient.name} size="lg" />
        <div>
          <span>{patient.id}</span>
          <h1>{patient.name}</h1>
          <p>
            {patient.gender} · {new Date(`${patient.dob}T00:00:00`).toLocaleDateString("vi-VN")} · Nhóm máu {patient.blood}
          </p>
        </div>
        <div className="profile-contact">
          <span>
            <Icon name="phone" />
            {patient.phone}
          </span>
          <span>
            <Icon name="mail" />
            {patient.email}
          </span>
        </div>
      </section>
      <div className="tabs detail-tabs">
        {tabs.map((x) => (
          <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      {tab === "Tổng quan" && (
        <div className="two-col">
          <section className="card detail-card">
            <div className="section-title">
              <span>
                <Icon name="user" />
              </span>
              <div>
                <h2>Thông tin cơ bản</h2>
              </div>
            </div>
            <div className="info-grid">
              <Info label="Họ và tên" value={patient.name} />
              <Info label="Mã bệnh nhân" value={patient.id} />
              <Info label="Giới tính" value={patient.gender} />
              <Info label="Ngày sinh" value={new Date(`${patient.dob}T00:00:00`).toLocaleDateString("vi-VN")} />
              <Info label="Số điện thoại" value={patient.phone} />
              <Info label="Email" value={patient.email} />
            </div>
          </section>
          <section className="card detail-card">
            <div className="section-title">
              <span>
                <Icon name="heart" />
              </span>
              <div>
                <h2>Thông tin y khoa</h2>
              </div>
            </div>
            <div className="medical-summary">
              <div>
                <span>Nhóm máu</span>
                <strong>{patient.blood}</strong>
              </div>
              <div>
                <span>Dị ứng đã ghi nhận</span>
                <strong>{patient.allergies}</strong>
              </div>
              <div>
                <span>Bệnh nền</span>
                <strong>{patient.chronicDiseases || "Chưa ghi nhận"}</strong>
              </div>
              <div>
                <span>Ghi nhận bệnh sử</span>
                <strong>{records.length} mục</strong>
              </div>
            </div>
            <Button variant="secondary" onClick={openRecords}>
              Xem hồ sơ bệnh án
            </Button>
          </section>
        </div>
      )}
      {tab === "Lịch sử hẹn" && (
        <section className="card list-panel">
          <h2>Lịch sử lịch hẹn</h2>
          {appointments.map((a) => (
              <div className="list-row" key={a.id}>
                <span className="list-icon">
                  <Icon name="calendar" />
                </span>
                <div>
                  <strong>
                    {a.date.split("-").reverse().join("/")} · {a.time}
                  </strong>
                  <p>{a.reason}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
        </section>
      )}
      {tab === "Phiên khám" && (
        <section className="card list-panel">
          <div className="card-header">
            <h2>Phiên khám trước đây</h2>
            <Button variant="secondary" onClick={openConsultations}>
              Xem tất cả
            </Button>
          </div>
          {consultations.map((c) => (
              <div className="list-row" key={c.id}>
                <span className="list-icon">
                  <Icon name="stethoscope" />
                </span>
                <div>
                  <strong>
                    {c.id} · {new Date(`${c.date}T00:00:00`).toLocaleDateString("vi-VN")}
                  </strong>
                  <p>{c.diagnosis}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
        </section>
      )}
      {tab === "Đơn thuốc" && (
        <section className="card list-panel">
          <div className="card-header">
            <h2>Đơn thuốc</h2>
            <Button variant="secondary" onClick={openPrescriptions}>
              Quản lý đơn thuốc
            </Button>
          </div>
          {prescriptions.map((r) => (
              <div className="list-row" key={r.id}>
                <span className="list-icon">
                  <Icon name="pill" />
                </span>
                <div>
                  <strong>
                    {r.id} · {r.date}
                  </strong>
                  <p>{r.count} loại thuốc</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
        </section>
      )}
    </div>
  );
}

function ConsultationsPage({
  consultations,
  appointments,
  selected,
  setSelected,
  onSave,
  onStartMeeting,
  openMeeting,
  onFinish,
  toast,
  createFollowUp,
}: {
  consultations: Consultation[];
  appointments: Appointment[];
  selected: string | null;
  setSelected: (id: string | null) => void;
  onSave: (appointmentId: string, sessionId: string | null, notes: string) => Promise<void>;
  onStartMeeting: (appointmentId: string) => Promise<string>;
  openMeeting: (sessionId: string) => void;
  onFinish: (sessionId: string) => Promise<void>;
  toast: (m: string) => void;
  createFollowUp: (appointment: Appointment) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [date, setDate] = useState("");
  if (selected) {
    const c = consultations.find((x) => x.id === selected || x.appointmentId === selected);
    const appointment = appointments.find((x) => x.id === (c?.appointmentId || selected));
    if (!appointment) return <div className="page"><div className="empty">Không tìm thấy lịch hẹn.</div></div>;
    return (
      <ConsultationDetail
        appointment={appointment}
        consultation={c}
        back={() => setSelected(null)}
        onSave={onSave}
        onStartMeeting={onStartMeeting}
        openMeeting={openMeeting}
        onFinish={onFinish}
        toast={toast}
        createFollowUp={createFollowUp}
      />
    );
  }
  const displayDate = date ? date.split("-").reverse().join("/") : "";
  const filtered = consultations.filter(
    (c) =>
      `${c.id} ${c.patient}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === "Tất cả" || c.status === status) &&
      (!date || c.date === date),
  );
  return (
    <div className="page">
      <PageHeading
        title="Quản lý phiên khám"
        description="Xem và cập nhật các phiếu khám của bệnh nhân."
      />
      <section className="card">
        <div className="filter-bar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm bệnh nhân hoặc mã phiên khám..."
          />
          <input
            className="date-input"
            type="date"
            aria-label="Lọc ngày"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Tất cả</option>
            <option>Hoàn thành</option>
            <option>Đang khám</option>
          </select>
          {(date || search) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDate("");
                setSearch("");
              }}
            >
              Xóa lọc
            </Button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MÃ PHIÊN KHÁM</th>
                <th>BỆNH NHÂN</th>
                <th>NGÀY HẸN</th>
                <th>NGÀY KHÁM</th>
                <th>CHẨN ĐOÁN TÓM TẮT</th>
                <th>TRẠNG THÁI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.id}</b>
                  </td>
                  <td>
                    <div className="patient-cell">
                      <Avatar name={c.patient} size="sm" />
                      <div>
                        <strong>{c.patient}</strong>
                        <span>{c.patientId}</span>
                      </div>
                    </div>
                  </td>
                  <td>{c.appointment}</td>
                  <td>{c.date}</td>
                  <td>{c.diagnosis}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <button className="view-link" onClick={() => setSelected(c.appointmentId)}>
                      Mở phiếu <Icon name="chevron" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty">Không tìm thấy phiên khám phù hợp.</div>}
        </div>
      </section>
    </div>
  );
}

function ConsultationDetail({
  appointment,
  consultation,
  back,
  onSave,
  onStartMeeting,
  openMeeting,
  onFinish,
  toast,
  createFollowUp,
}: {
  appointment: Appointment;
  consultation?: Consultation;
  back: () => void;
  onSave: (appointmentId: string, sessionId: string | null, notes: string) => Promise<void>;
  onStartMeeting: (appointmentId: string) => Promise<string>;
  openMeeting: (sessionId: string) => void;
  onFinish: (sessionId: string) => Promise<void>;
  toast: (m: string) => void;
  createFollowUp: (appointment: Appointment) => void;
}) {
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [form, setForm] = useState({
    complaint: consultation?.complaint || appointment.reason,
    symptoms: consultation?.symptoms || "",
    diagnosis: consultation?.diagnosis || "",
    notes: consultation?.notes || "",
    plan: consultation?.plan || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const isComplete = consultation?.status === "Hoàn thành";
  const isOnline = appointment.modality === "Tư vấn trực tuyến";
  const diagnosisNotes = [
    `Lý do khám:\n${form.complaint.trim()}`,
    `Triệu chứng:\n${form.symptoms.trim()}`,
    `Chẩn đoán:\n${form.diagnosis.trim()}`,
    `Ghi chú của bác sĩ:\n${form.notes.trim()}`,
    `Kế hoạch điều trị:\n${form.plan.trim()}`,
  ].join("\n\n");
  const displayId = consultation?.id || appointment.id;
  const displayStatus = consultation?.status || appointment.status;
  const displayDate = consultation?.date || appointment.date;
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" /> Quay lại danh sách phiên khám
      </button>
      <PageHeading
        eyebrow="PHIÊN KHÁM"
        title={displayId}
        description={`Bệnh nhân ${appointment.patient} · ${displayDate}`}
        action={<StatusBadge status={displayStatus} />}
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isComplete) return;
          setSaving(true);
          setError("");
          try {
            await onSave(appointment.id, consultation?.id || null, diagnosisNotes);
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Không thể lưu phiếu khám.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="consult-layout">
          <main>
            <section className="card form-card">
              <h2>Thông tin thăm khám</h2>
              <p>Ghi nhận thông tin lâm sàng trong phiên khám.</p>
              <label className="field">
                <span>Lý do khám</span>
                <textarea
                  value={form.complaint}
                  onChange={(e) => set("complaint", e.target.value)}
                  readOnly={isComplete}
                  maxLength={1500}
                />
              </label>
              <label className="field">
                <span>Triệu chứng</span>
                <textarea
                  value={form.symptoms}
                  onChange={(e) => set("symptoms", e.target.value)}
                  readOnly={isComplete}
                  maxLength={1500}
                />
              </label>
              <label className="field">
                <span>
                  Chẩn đoán <b>*</b>
                </span>
                <textarea
                  value={form.diagnosis}
                  required
                  onChange={(e) => set("diagnosis", e.target.value)}
                  readOnly={isComplete}
                  maxLength={1500}
                />
              </label>
              <label className="field">
                <span>Ghi chú của bác sĩ</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  readOnly={isComplete}
                  maxLength={1500}
                />
              </label>
              <label className="field">
                <span>Kế hoạch điều trị</span>
                <textarea
                  value={form.plan}
                  onChange={(e) => set("plan", e.target.value)}
                  readOnly={isComplete}
                  maxLength={1500}
                />
              </label>
              <div className="follow-up-action">
                <div>
                  <strong>Lịch tái khám</strong>
                  <span>Tạo lịch hẹn tiếp theo cho bệnh nhân sau phiên khám này.</span>
                </div>
                <Button
                  variant="secondary"
                  icon="calendarPlus"
                  disabled={!consultation}
                  onClick={() => setFollowUpOpen(true)}
                >
                  Đặt lịch tái khám
                </Button>
              </div>
            </section>
          </main>
          <aside>
            <section className="card patient-side">
              <h2>Thông tin bệnh nhân</h2>
              <Avatar name={appointment.patient} size="lg" />
              <strong>{appointment.patient}</strong>
              <span>{appointment.patientId}</span>
              <hr />
              <Info label="Ngày hẹn" value={appointment.date} />
              <Info label="Ngày khám" value={displayDate} />
              <Info label="Trạng thái" value={displayStatus} />
            </section>
            {isOnline && (
              <section className="card patient-side">
                <h2>Cuộc gọi trực tuyến</h2>
                {consultation?.meetingUrl && !isComplete ? (
                  <>
                  <Button
                    variant="secondary"
                    icon="phone"
                    disabled={!consultation.canJoinMeeting}
                    onClick={() => openMeeting(consultation.id)}
                  >
                    Mở cuộc họp
                  </Button>
                  {!consultation.canJoinMeeting && <p className="action-note">Phòng chỉ mở sau check-in và trong khung giờ khám.</p>}
                  </>
                ) : !consultation ? (
                  <>
                    {appointment.meetingStartReason && <p>{appointment.meetingStartReason}</p>}
                    <Button
                      variant="secondary"
                      icon="phone"
                      disabled={saving || !appointment.meetingStartAvailable}
                      onClick={async () => {
                        setSaving(true);
                        setError("");
                        try {
                          const sessionId = await onStartMeeting(appointment.id);
                          openMeeting(sessionId);
                        } catch (startError) {
                          setError(
                            startError instanceof Error
                              ? startError.message
                              : "Không thể tạo và mở phòng họp.",
                          );
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? "Đang mở phòng..." : "Tạo phòng & mở cuộc họp"}
                    </Button>
                  </>
                ) : (
                  <p>Phiên khám đã kết thúc hoặc chưa có phòng họp hợp lệ.</p>
                )}
              </section>
            )}
            {error && <div className="form-error">{error}</div>}
            <Button type="submit" icon="check" disabled={saving || isComplete}>
              {saving ? "Đang lưu..." : "Lưu phiếu khám"}
            </Button>
            {consultation && !isComplete && (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    await onSave(appointment.id, consultation.id, diagnosisNotes);
                    await onFinish(consultation.id);
                  } catch (finishError) {
                    setError(finishError instanceof Error ? finishError.message : "Không thể kết thúc phiên khám.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Kết thúc phiên khám
              </Button>
            )}
          </aside>
        </div>
      </form>
      {followUpOpen && consultation && (
        <FollowUpModal
          consultation={consultation}
          onClose={() => setFollowUpOpen(false)}
          onCreate={(appointment) => {
            createFollowUp(appointment);
            setFollowUpOpen(false);
            toast("Đã tạo lịch tái khám. Lịch mới đã được thêm vào mục Lịch hẹn.");
          }}
        />
      )}
    </div>
  );
}

function FollowUpModal({
  consultation,
  onClose,
  onCreate,
}: {
  consultation: Consultation;
  onClose: () => void;
  onCreate: (appointment: Appointment) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [modality, setModality] = useState<"Khám trực tiếp" | "Tư vấn trực tuyến">(
    "Khám trực tiếp",
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const timeSlots = ["08:00", "08:30", "09:30", "10:30", "14:00", "15:00", "16:00"];

  const submit = () => {
    if (!date || !time) {
      setError("Vui lòng chọn ngày và giờ tái khám.");
      return;
    }
    onCreate({
      id: `LH-${Date.now().toString().slice(-6)}`,
      patientId: consultation.patientId,
      patient: consultation.patient,
      date,
      time,
      reason: reason.trim() || "Tái khám theo kế hoạch điều trị",
      type: "Tái khám",
      modality,
      status: "Chờ xác nhận",
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="follow-up-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="follow-up-modal-head">
          <span>
            <Icon name="calendarPlus" />
          </span>
          <div>
            <h3 id="follow-up-title">Đặt lịch tái khám</h3>
            <p>Tạo lịch hẹn tiếp theo từ phiên khám hiện tại.</p>
          </div>
          <button onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>

        <div className="follow-up-patient">
          <Avatar name={consultation.patient} size="md" />
          <div>
            <span>BỆNH NHÂN</span>
            <strong>{consultation.patient}</strong>
            <small>{consultation.patientId}</small>
          </div>
          <span className="locked-label">Đã chọn từ phiên khám</span>
        </div>

        <div className="follow-up-fields">
          <label className="field">
            <span>
              Ngày tái khám <b>*</b>
            </span>
            <input
              type="date"
              min="2025-06-19"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError("");
              }}
            />
          </label>

          <fieldset className="slot-field">
            <legend>
              Giờ tái khám <b>*</b>
            </legend>
            <div className="time-slots">
              {timeSlots.map((slot) => (
                <button
                  type="button"
                  className={time === slot ? "selected" : ""}
                  onClick={() => {
                    setTime(slot);
                    setError("");
                  }}
                  key={slot}
                >
                  {slot}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="modality-field">
            <legend>Hình thức khám</legend>
            <div>
              {(["Khám trực tiếp", "Tư vấn trực tuyến"] as const).map((option) => (
                <label className={modality === option ? "selected" : ""} key={option}>
                  <input
                    type="radio"
                    name="follow-up-modality"
                    value={option}
                    checked={modality === option}
                    onChange={() => setModality(option)}
                  />
                  <span>
                    <Icon name={option === "Khám trực tiếp" ? "stethoscope" : "phone"} />
                  </span>
                  <strong>{option}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Lý do tái khám</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Đánh giá đáp ứng điều trị"
              maxLength={120}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="follow-up-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button icon="calendarPlus" onClick={submit}>
            Xác nhận tạo lịch
          </Button>
        </div>
      </div>
    </div>
  );
}

function MedicalRecordsPage({ patients, records }: { patients: Patient[]; records: MedicalRecord[] }) {
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const selected = patients.find((p) => p.id === patientId);
  const choices = patients.filter((p) =>
    `${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const patientRecords = records.filter((record) => record.patientId === selected?.id);
  return (
    <div className="page">
      <PageHeading
        title="Hồ sơ bệnh án"
        description="Tra cứu lịch sử sức khỏe và quá trình điều trị của bệnh nhân."
      />
      <div className="records-layout">
        <aside className="card patient-selector">
          <SearchBox value={query} onChange={setQuery} placeholder="Tìm bệnh nhân..." />
          <div>
            {choices.map((p) => (
              <button
                className={p.id === patientId ? "active" : ""}
                onClick={() => setPatientId(p.id)}
                key={p.id}
              >
                <Avatar name={p.name} size="sm" />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.id}</small>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        </aside>
        {selected ? <main>
          <section className="card record-header">
            <Avatar name={selected.name} size="lg" />
            <div>
              <span>HỒ SƠ BỆNH NHÂN</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.id} · {selected.gender} · {new Date(`${selected.dob}T00:00:00`).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="record-facts">
              <div>
                <span>Nhóm máu</span>
                <strong>                {selected.blood}</strong>
              </div>
              <div>
                <span>Dị ứng</span>
                <strong>                {selected.allergies}</strong>
              </div>
            </div>
          </section>
          <section className="card timeline-card">
            <div className="card-header">
              <div>
                <h2>Dòng thời gian y khoa</h2>
                <p>Các sự kiện sức khỏe đã được ghi nhận</p>
              </div>
            </div>
            {patientRecords.length ? <div className="timeline">
              {patientRecords.map((record) => (
                <div key={record.id}>
                  <i />
                  <time>{new Date(record.date).toLocaleDateString("vi-VN")}</time>
                  <section>
                    <span className="timeline-type">BỆNH SỬ</span>
                    <h3>{record.diagnosis}</h3>
                    <p>{record.symptoms}{record.notes ? ` · ${record.notes}` : ""}</p>
                    <small>{record.doctor} · TiTiMi Clinic</small>
                  </section>
                </div>
              ))}
            </div> : <div className="empty">Chưa có bệnh sử được ghi nhận cho bệnh nhân này.</div>}
          </section>
        </main> : <main className="card"><div className="empty">Chọn bệnh nhân có lịch hẹn được phân công để xem hồ sơ.</div></main>}
      </div>
    </div>
  );
}

function PrescriptionsPage({
  prescriptions,
  profile,
}: {
  prescriptions: Prescription[];
  profile: DoctorProfile;
}) {
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const filtered = prescriptions.filter(
    (r) =>
      `${r.id} ${r.patient}`.toLowerCase().includes(search.toLowerCase()) &&
      (!date || r.date.slice(0, 10) === date) &&
      (status === "Tất cả trạng thái" || r.status === status),
  );
  if (selected)
    return <PrescriptionDetail prescription={selected} profile={profile} back={() => setSelected(null)} />;
  return (
    <div className="page">
      <PageHeading
        title="Quản lý đơn thuốc"
        description="Theo dõi các đơn thuốc đã được lưu trong hồ sơ."
        action={
          <Button icon="plus" onClick={() => window.location.assign("/prescriptions/")}>
            Mở quản lý đơn thuốc
          </Button>
        }
      />
      <section className="card">
        <div className="filter-bar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm bệnh nhân hoặc mã đơn thuốc..."
          />
          <input
            className="date-input"
            type="date"
            aria-label="Lọc ngày"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <select
            aria-label="Trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Tất cả trạng thái</option>
            <option>Đã kê</option>
            <option>Hết hạn</option>
          </select>
          {(date || search) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDate("");
                setSearch("");
              }}
            >
              Xóa lọc
            </Button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MÃ ĐƠN THUỐC</th>
                <th>BỆNH NHÂN</th>
                <th>NGÀY TẠO</th>
                <th>SỐ LOẠI THUỐC</th>
                <th>TRẠNG THÁI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.id}</b>
                  </td>
                  <td>
                    <div className="patient-cell">
                      <Avatar name={r.patient} size="sm" />
                      <div>
                        <strong>{r.patient}</strong>
                        <span>{r.patientId}</span>
                      </div>
                    </div>
                  </td>
                  <td>{r.date}</td>
                  <td>{r.count} loại</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <button
                      className="view-link"
                      onClick={() => {
                        setSelected(r);
                        setSelected(r);
                      }}
                    >
                      Xem chi tiết <Icon name="chevron" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty">Không tìm thấy đơn thuốc phù hợp.</div>}
        </div>
      </section>
      <p className="disclaimer">
        Đơn thuốc được lấy từ hồ sơ khám của bác sĩ trong hệ thống TiTiMi.
      </p>
    </div>
  );
}

function PrescriptionDetail({
  prescription,
  profile,
  back,
}: {
  prescription: Prescription;
  profile: DoctorProfile;
  back: () => void;
}) {
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" /> Quay lại danh sách đơn thuốc
      </button>
      <PageHeading
        eyebrow="ĐƠN THUỐC"
        title={prescription.id}
        description={`Ngày kê: ${new Date(prescription.date).toLocaleDateString("vi-VN")}`}
        action={<StatusBadge status={prescription.status} />}
      />
      <div className="two-col prescription-detail">
        <section className="card detail-card">
          <div className="section-title">
            <span>
              <Icon name="pill" />
            </span>
            <div>
              <h2>Danh sách thuốc</h2>
              <p>{prescription.count} loại thuốc trong đơn</p>
            </div>
          </div>
          <div className="med-list">
            {prescription.items.map((item, index) => (
              <div key={`${prescription.id}-${index}`}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <section>
                  <h3>{item.name}</h3>
                  <p>{item.dosage} · {item.frequency} · {item.duration}</p>
                  {item.instructions && <small>{item.instructions}</small>}
                </section>
              </div>
            ))}
          </div>
        </section>
        <aside className="card detail-card">
          <h2>Thông tin kê đơn</h2>
          <div className="prescription-people">
            <Avatar name={prescription.patient} />
            <div>
              <span>Bệnh nhân</span>
              <strong>{prescription.patient}</strong>
              <small>{prescription.patientId}</small>
            </div>
          </div>
          <div className="prescription-people">
            <Avatar name={profile.name} />
            <div>
              <span>Bác sĩ kê đơn</span>
              <strong>BS. {profile.name}</strong>
              <small>{profile.specialty} · {profile.id}</small>
            </div>
          </div>
          <Info label="Ngày kê đơn" value={new Date(prescription.date).toLocaleDateString("vi-VN")} />
          {prescription.diagnosis && <Info label="Chẩn đoán" value={prescription.diagnosis} />}
          {prescription.instructions && <Info label="Hướng dẫn" value={prescription.instructions} />}
        </aside>
      </div>
    </div>
  );
}

function PrescriptionForm({ back, toast }: { back: () => void; toast: (m: string) => void }) {
  const empty: Medication = { name: "", dosage: "", frequency: "", duration: "", instructions: "" };
  const [patient, setPatient] = useState("");
  const [meds, setMeds] = useState<Medication[]>([
    {
      name: "Omeprazole 20mg",
      dosage: "1 viên",
      frequency: "1 lần/ngày",
      duration: "14 ngày",
      instructions: "Uống trước bữa sáng 30 phút",
    },
  ]);
  const [error, setError] = useState("");
  const update = (i: number, key: keyof Medication, value: string) =>
    setMeds(meds.map((m, index) => (index === i ? { ...m, [key]: value } : m)));
  const save = () => {
    if (!patient || meds.some((m) => !m.name || !m.dosage || !m.frequency || !m.duration)) {
      setError("Vui lòng chọn bệnh nhân và điền đủ các trường bắt buộc.");
      return;
    }
    setError("");
    toast("Đã lưu đơn thuốc mới trong phiên làm việc.");
    back();
  };
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" /> Quay lại danh sách đơn thuốc
      </button>
      <PageHeading
        title="Tạo đơn thuốc mới"
        description="Điền thông tin bệnh nhân và chỉ định thuốc."
      />
      <section className="card form-card prescription-form">
        <h2>Thông tin chung</h2>
        <div className="form-grid">
          <label className="field">
            <span>
              Bệnh nhân <b>*</b>
            </span>
            <select value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="">Chọn bệnh nhân</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.id}
                </option>
              ))}
            </select>
          </label>
          <Field label="Ngày kê đơn" value="18/06/2025" onChange={() => {}} />
        </div>
      </section>
      <section className="card form-card prescription-form">
        <div className="card-header">
          <div>
            <h2>Thuốc kê đơn</h2>
            <p>Thêm thuốc và hướng dẫn sử dụng.</p>
          </div>
          <Button variant="secondary" icon="plus" onClick={() => setMeds([...meds, { ...empty }])}>
            Thêm thuốc
          </Button>
        </div>
        {meds.map((med, i) => (
          <div className="med-row" key={i}>
            <div className="med-row-head">
              <strong>Thuốc {String(i + 1).padStart(2, "0")}</strong>
              {meds.length > 1 && (
                <button onClick={() => setMeds(meds.filter((_, index) => index !== i))}>
                  <Icon name="trash" /> Xóa
                </button>
              )}
            </div>
            <div className="med-fields">
              <Field
                label="Tên thuốc"
                value={med.name}
                required
                onChange={(v) => update(i, "name", v)}
                placeholder="Ví dụ: Omeprazole 20mg"
              />
              <Field
                label="Liều dùng"
                value={med.dosage}
                required
                onChange={(v) => update(i, "dosage", v)}
                placeholder="Ví dụ: 1 viên"
              />
              <Field
                label="Tần suất"
                value={med.frequency}
                required
                onChange={(v) => update(i, "frequency", v)}
                placeholder="Ví dụ: 2 lần/ngày"
              />
              <Field
                label="Thời gian"
                value={med.duration}
                required
                onChange={(v) => update(i, "duration", v)}
                placeholder="Ví dụ: 7 ngày"
              />
              <div className="wide-field">
                <Field
                  label="Hướng dẫn sử dụng"
                  value={med.instructions}
                  onChange={(v) => update(i, "instructions", v)}
                  placeholder="Uống sau bữa ăn..."
                />
              </div>
            </div>
          </div>
        ))}
      </section>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <Button variant="secondary" onClick={back}>
          Hủy
        </Button>
        <Button icon="check" onClick={save}>
          Lưu đơn thuốc
        </Button>
      </div>
      <p className="disclaimer">
        Chỉ sử dụng dữ liệu mẫu. Prototype không cung cấp tư vấn y khoa hoặc kết nối nhà thuốc.
      </p>
    </div>
  );
}

function ProfilePage({
  profile,
  onSaved,
  toast,
}: {
  profile: DoctorProfile;
  onSaved: () => Promise<unknown>;
  toast: (m: string) => void;
}) {
  const [data, setData] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setData(profile), [profile]);
  const set = (key: keyof DoctorProfile, value: string) => setData({ ...data, [key]: value });
  const save = async () => {
    if (!data.name || !data.email.includes("@") || !data.phone) {
      setError("Vui lòng nhập họ tên, email và số điện thoại hợp lệ.");
      return;
    }
    try {
      await updateDoctorProfile(data);
      await onSaved();
      setError("");
      setEditing(false);
      toast("Đã cập nhật hồ sơ cá nhân.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể cập nhật hồ sơ.");
    }
  };
  return (
    <div className="page">
      <PageHeading
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin cá nhân và chuyên môn của bác sĩ."
        action={
          !editing ? (
            <Button icon="edit" onClick={() => setEditing(true)}>
              Chỉnh sửa hồ sơ
            </Button>
          ) : undefined
        }
      />
      <section className="card profile-hero">
        <Avatar name={data.name} size="lg" />
        <div>
          <span>BÁC SĨ PHỤ TRÁCH</span>
          <h2>BS. {data.name}</h2>
          <p>{data.specialty} · Mã bác sĩ {data.id}</p>
        </div>
      </section>
      <div className="profile-grid">
        <section className="card form-card">
          <div className="section-title">
            <span>
              <Icon name="user" />
            </span>
            <div>
              <h2>Thông tin cá nhân</h2>
              <p>Thông tin định danh của bác sĩ</p>
            </div>
          </div>
          <div className="form-grid">
            <Field
              label="Họ và tên"
              value={data.name}
              disabled={!editing}
              onChange={(v) => set("name", v)}
            />
            <Field label="Mã bác sĩ" value={data.id} disabled onChange={() => {}} />
          </div>
        </section>
        <section className="card form-card">
          <div className="section-title">
            <span>
              <Icon name="mail" />
            </span>
            <div>
              <h2>Thông tin liên hệ</h2>
              <p>Kênh liên lạc tại phòng khám</p>
            </div>
          </div>
          <div className="form-grid">
            <Field
              label="Email"
              type="email"
              value={data.email}
              disabled={!editing}
              onChange={(v) => set("email", v)}
            />
            <Field
              label="Số điện thoại"
              value={data.phone}
              disabled={!editing}
              onChange={(v) => set("phone", v)}
            />
          </div>
        </section>
        <section className="card form-card wide-card">
          <div className="section-title">
            <span>
              <Icon name="briefcase" />
            </span>
            <div>
              <h2>Thông tin chuyên môn</h2>
              <p>Thông tin hành nghề trong hồ sơ hệ thống</p>
            </div>
          </div>
          <div className="form-grid thirds">
            <Field
              label="Chuyên khoa"
              value={data.specialty}
              disabled
              onChange={() => {}}
            />
            <Field
              label="Chứng chỉ hành nghề"
              value={data.license}
              disabled={!editing}
              onChange={(v) => set("license", v)}
            />
          </div>
        </section>
      </div>
      {error && <div className="form-error">{error}</div>}
      {editing && (
        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setData(profile);
              setEditing(false);
              setError("");
            }}
          >
            Hủy thay đổi
          </Button>
          <Button icon="check" onClick={save}>
            Lưu thay đổi
          </Button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [portal, setPortal] = useState<DoctorPortalData | null>(null);
  const [appointmentDetail, setAppointmentDetail] = useState<Appointment | null>(null);
  const [patientDetail, setPatientDetail] = useState<Patient | null>(null);
  const [consultationDetail, setConsultationDetail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const title = useMemo(() => navItems.find((n) => n.id === page)?.label || "Dashboard", [page]);
  const refreshPortal = async () => {
    const data = await loadDoctorPortal();
    setPortal(data);
    return data;
  };
  useEffect(() => {
    refreshPortal().catch((error: unknown) => {
      setToastMessage(error instanceof Error ? error.message : "Không tải được dữ liệu bác sĩ.");
    });
  }, []);
  const navigate = (p: Page) => {
    setPage(p);
    setAppointmentDetail(null);
    setPatientDetail(null);
    if (p !== "consultations") setConsultationDetail(null);
  };
  const toast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3500);
  };
  const viewAppointment = (a: Appointment) => {
    setPage("appointments");
    setAppointmentDetail(a);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status);
    await refreshPortal();
    toast(`Đã cập nhật trạng thái lịch hẹn thành "${status}".`);
  };
  const openConsultation = (appointment: Appointment) => {
    setPage("consultations");
    setAppointmentDetail(null);
    setPatientDetail(null);
    setConsultationDetail(appointment.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveConsultation = async (
    appointmentId: string,
    sessionId: string | null,
    diagnosisNotes: string,
  ) => {
    if (sessionId) {
      await updateConsultationNotes(sessionId, diagnosisNotes);
    } else {
      await createConsultation(appointmentId, diagnosisNotes);
    }
    await refreshPortal();
    toast("Đã lưu nội dung phiếu khám.");
  };
  const startMeeting = async (appointmentId: string) => {
    const result = await createConsultation(appointmentId, "");
    try {
      await refreshPortal();
    } catch {
      setToastMessage("Phòng họp đã tạo; không tải lại được dữ liệu bác sĩ.");
    }
    return result.consultation.id;
  };
  const openMeeting = (sessionId: string) => {
    window.location.assign(`/consultations/${encodeURIComponent(sessionId)}/meeting`);
  };
  const completeConsultation = async (sessionId: string) => {
    await finishConsultation(sessionId);
    await refreshPortal();
    toast("Đã kết thúc phiên khám.");
  };
  if (!portal)
    return (
      <div className="app-shell">
        <main className="content">
          <div className="page">
            <section className="card">
              <h1>Đang tải dữ liệu bác sĩ</h1>
              <p>{toastMessage || "Đang đồng bộ với hệ thống TiTiMi…"}</p>
              {toastMessage && (
                <Button onClick={() => refreshPortal().catch((error: Error) => setToastMessage(error.message))}>
                  Thử tải lại
                </Button>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  const { appointments, patients, consultations, records, prescriptions, schedules, profile } = portal;
  const render = () => {
    if (appointmentDetail)
      return (
        <AppointmentDetail
          appointment={appointmentDetail}
          patients={patients}
          consultation={consultations.find((item) => item.appointmentId === appointmentDetail.id)}
          updateStatus={saveAppointmentStatus}
          back={() => setAppointmentDetail(null)}
          toast={toast}
          startConsultation={() => openConsultation(appointmentDetail)}
          startMeeting={startMeeting}
          openMeeting={openMeeting}
        />
      );
    if (patientDetail)
      return (
        <PatientDetail
          patient={patientDetail}
          appointments={appointments.filter((a) => a.patientId === patientDetail.id)}
          consultations={consultations.filter((c) => c.patientId === patientDetail.id)}
          prescriptions={prescriptions.filter((r) => r.patientId === patientDetail.id)}
          records={records.filter((r) => r.patientId === patientDetail.id)}
          back={() => setPatientDetail(null)}
          openConsultations={() => {
            setPatientDetail(null);
            setPage("consultations");
          }}
          openRecords={() => {
            setPatientDetail(null);
            setPage("records");
          }}
          openPrescriptions={() => {
            setPatientDetail(null);
            setPage("prescriptions");
          }}
        />
      );
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            appointments={appointments}
            profile={profile}
            navigate={navigate}
            viewAppointment={viewAppointment}
          />
        );
      case "appointments":
        return (
          <AppointmentsPage
            appointments={appointments}
            updateStatus={saveAppointmentStatus}
            viewAppointment={viewAppointment}
            toast={toast}
          />
        );
      case "schedule":
        return <SchedulePage appointments={appointments} schedules={schedules} viewAppointment={viewAppointment} />;
      case "patients":
        return <PatientsPage patients={patients} openPatient={setPatientDetail} />;
      case "consultations":
        return (
          <ConsultationsPage
            consultations={consultations}
            appointments={appointments}
            selected={consultationDetail}
            setSelected={setConsultationDetail}
            onSave={saveConsultation}
            onStartMeeting={startMeeting}
            openMeeting={openMeeting}
            onFinish={completeConsultation}
            toast={toast}
            createFollowUp={(appointment) => {
              const previous = appointments.find((item) => item.patientId === appointment.patientId);
              if (!previous) {
                toast("Không tìm thấy lịch khám trước để tạo lịch tái khám.");
                return;
              }
              window.location.assign(`/appointments/new?follow_up=${encodeURIComponent(previous.id)}`);
            }}
          />
        );
      case "records":
        return <MedicalRecordsPage patients={patients} records={records} />;
      case "prescriptions":
        return <PrescriptionsPage prescriptions={prescriptions} profile={profile} />;
      case "profile":
        return <ProfilePage profile={profile} onSaved={refreshPortal} toast={toast} />;
    }
  };
  return (
    <div className="app-shell">
      <Sidebar
        profile={profile}
        onLogout={() => logoutDoctor().catch((error: Error) => toast(error.message))}
        page={page}
        setPage={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-shell">
        <Header
          title={title}
          profile={profile}
          appointments={appointments}
          onNavigate={navigate}
          onLogout={() => logoutDoctor().catch((error: Error) => toast(error.message))}
          onMenu={() => setSidebarOpen(true)}
        />
        <main className="content">{render()}</main>
      </div>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage("")} />}
    </div>
  );
}
