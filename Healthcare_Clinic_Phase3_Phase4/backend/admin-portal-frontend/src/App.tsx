import { useEffect, useMemo, useState } from "react";
import titimiHatLogo from "./assets/titimi-hat-logo.png";
import * as api from "./api";
import type {
  AdminProfile,
  Appointment,
  Counts,
  Doctor,
  Page,
  Patient,
  Schedule,
  Specialty,
  User,
} from "./api";

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: "dashboard", label: "Dashboard", icon: "grid" },
  { page: "users", label: "Quản lý người dùng", icon: "users" },
  { page: "doctors", label: "Quản lý bác sĩ", icon: "doctor" },
  { page: "patients", label: "Quản lý bệnh nhân", icon: "heart" },
  { page: "specialties", label: "Chuyên khoa", icon: "briefcase" },
  { page: "appointments", label: "Quản lý lịch hẹn", icon: "calendar" },
  { page: "schedule", label: "Quản lý lịch làm việc", icon: "clock" },
  { page: "reports", label: "Báo cáo hệ thống", icon: "chart" },
  { page: "settings", label: "Cài đặt", icon: "settings" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    doctor: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21a6.5 6.5 0 0 1 13 0M12 14v7M9 18h6" />
      </>
    ),
    heart: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 16 4-5 3 3 5-7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-1.6-1H2.4v-4h.1A1.7 1.7 0 0 0 4.1 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.5 4.6a1.7 1.7 0 0 0 1-1.6v-.1h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 18.9 9a1.7 1.7 0 0 0 1.6 1h.1v4h-.1a1.7 1.7 0 0 0-1.1 1z" />
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
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" />
      </>
    ),
  };
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
      {paths[name] || paths.grid}
    </svg>
  );
}

function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="field select">
      {props.children}
    </select>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <Icon name="search" size={18} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button aria-label="Xóa tìm kiếm" onClick={() => onChange("")}>
          <Icon name="close" size={15} />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status.includes("Hoạt động") || status.includes("Hoàn thành") || status.includes("Available")
      ? "success"
      : status.includes("xác nhận") || status.includes("Scheduled")
        ? "warning"
        : status.includes("hủy") || status.includes("khóa") || status.includes("ngưng") || status.includes("Locked")
          ? "danger"
          : "info";
  return (
    <span className={`badge badge-${tone}`}>
      <span />
      {status}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const parts = (name || "AD").trim().split(" ");
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return <div className={`avatar avatar-${size}`}>{initials}</div>;
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  tone?: string;
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className={`stat-icon tone-${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function EmptyState() {
  return <div className="empty">Không tìm thấy dữ liệu phù hợp. Hãy thử thay đổi bộ lọc.</div>;
}

function Pagination({
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
}: {
  page?: number;
  pageSize?: number;
  total: number;
  onPageChange?: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <span>
        Hiển thị {start}–{end} trong {total} kết quả
      </span>
      <div>
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange && onPageChange(page - 1)}
        >
          Trước
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPages > 5 && page > 3) {
            pageNum = Math.min(totalPages - 4 + i, page - 2 + i);
          }
          return (
            <button
              key={pageNum}
              className={page === pageNum ? "page-active" : ""}
              onClick={() => onPageChange && onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange && onPageChange(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onClose,
  confirmText = "Xác nhận",
  variant = "danger",
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-dialog">
        <p>{message}</p>
        <div className="modal-actions confirm-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MiniLineChart({ points }: { points?: Array<{ d: string; total: number }> }) {
  const data = useMemo(() => {
    if (points && points.length > 0) {
      return points.map((p) => p.total);
    }
    return [12, 19, 15, 25, 22, 30, 28, 35, 42, 38, 45, 52];
  }, [points]);

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const polyPoints = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1 || 1)) * 360;
      const y = 90 - ((val - min) / range) * 70;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mini-chart">
      <svg viewBox="0 0 360 100" preserveAspectRatio="none">
        <polyline fill="none" stroke="#286A9B" strokeWidth="2.5" points={polyPoints} />
      </svg>
    </div>
  );
}

function Donut({
  center,
  parts,
}: {
  center: string;
  parts: { label: string; value: number; color: string }[];
}) {
  const sum = parts.reduce((acc, p) => acc + p.value, 0) || 1;
  let accumulated = 0;
  const segments = parts.map((p) => {
    const strokeDasharray = `${(p.value / sum) * 283} 283`;
    const strokeDashoffset = -accumulated;
    accumulated += (p.value / sum) * 283;
    return { ...p, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="donut-wrap">
      <div className="donut-svg">
        <svg viewBox="0 0 100 100">
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              transform="rotate(-90 50 50)"
            />
          ))}
        </svg>
        <div className="donut-center">
          <strong>{center}</strong>
          <small>Tổng cộng</small>
        </div>
      </div>
      <div className="donut-legend">
        {parts.map((p) => (
          <div key={p.label}>
            <span style={{ background: p.color }} />
            <small>{p.label}</small>
            <b>{p.value.toLocaleString("vi-VN")}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ doctors }: { doctors?: Array<{ name: string; specialty: string; count: number }> }) {
  const data = useMemo(() => {
    if (doctors && doctors.length > 0) return doctors;
    return [
      { name: "BS. Trần Văn An", count: 24 },
      { name: "BS. Maya Okafor", count: 19 },
      { name: "BS. Daniel Chen", count: 18 },
      { name: "BS. Noah Williams", count: 14 },
      { name: "BS. Lê Bảo Ngọc", count: 12 },
    ];
  }, [doctors]);

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div className="bar-row" key={d.name}>
          <small className="bar-name">{d.name.replace("BS. ", "")}</small>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.max(8, (d.count / max) * 100)}%` }}
            />
          </div>
          <b>{d.count}</b>
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// DataPageHeader
// --------------------------------------------------------------------------

function DataPageHeader({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="data-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && onAction && (
        <Button onClick={onAction}>
          <Icon name="plus" size={18} />
          {action}
        </Button>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------------

function Dashboard({
  counts,
  appointments,
  charts,
  setPage,
  onViewAppointment,
}: {
  counts: Counts;
  appointments: Appointment[];
  charts: api.ChartData;
  setPage: (p: Page) => void;
  onViewAppointment: (a: Appointment) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    return `${days[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  }, []);

  return (
    <div className="page-stack">
      <section className="welcome">
        <div>
          <span className="eyebrow">{today}</span>
          <h2>Tổng quan hệ thống</h2>
          <p>Xin chào, Quản trị viên. Hệ thống phòng khám đang kết nối trực tiếp cơ sở dữ liệu MySQL.</p>
        </div>
        <div className="system-status">
          <span />
          <div>
            <b>Cơ sở dữ liệu đang kết nối</b>
            <small>Cập nhật tức thời</small>
          </div>
        </div>
      </section>

      <div className="stat-grid six">
        <StatCard
          label="Tổng người dùng"
          value={counts.totalUsers.toLocaleString("vi-VN")}
          detail="Tài khoản hệ thống"
          icon="users"
        />
        <StatCard
          label="Tổng bác sĩ"
          value={counts.doctors.toLocaleString("vi-VN")}
          detail="Bác sĩ đang công tác"
          icon="doctor"
          tone="blue"
        />
        <StatCard
          label="Tổng bệnh nhân"
          value={counts.patients.toLocaleString("vi-VN")}
          detail="Hồ sơ bệnh nhân"
          icon="heart"
          tone="violet"
        />
        <StatCard
          label="Tổng lịch hẹn"
          value={counts.appointments.toLocaleString("vi-VN")}
          detail="Lịch khám đã đặt"
          icon="calendar"
          tone="orange"
        />
        <StatCard
          label="Lịch hôm nay"
          value={counts.todayAppointments.toLocaleString("vi-VN")}
          detail="Cần phục vụ hôm nay"
          icon="clock"
          tone="yellow"
        />
        <StatCard
          label="Đã hoàn thành"
          value={counts.completedAppointments.toLocaleString("vi-VN")}
          detail={`Tỷ lệ ${Math.round((counts.completedAppointments / (counts.appointments || 1)) * 100)}%`}
          icon="check"
          tone="green"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card chart-large">
          <div className="card-head">
            <div>
              <h3>Thống kê lịch hẹn theo ngày</h3>
              <p>Dữ liệu lịch hẹn gần đây từ MySQL</p>
            </div>
          </div>
          <MiniLineChart points={charts.dailyTrend} />
          <div className="axis">
            {charts.dailyTrend && charts.dailyTrend.length > 0
              ? charts.dailyTrend.slice(-7).map((pt) => <span key={pt.d}>{pt.d}</span>)
              : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Phân bổ người dùng</h3>
              <p>Theo vai trò thực tế</p>
            </div>
          </div>
          <Donut
            center={counts.totalUsers.toString()}
            parts={[
              { label: "Bệnh nhân", value: counts.patients, color: "#286A9B" },
              { label: "Bác sĩ", value: counts.doctors, color: "#438FC2" },
              { label: "Quản trị viên", value: Math.max(1, counts.totalUsers - counts.patients - counts.doctors), color: "#E98DAE" },
            ]}
          />
        </div>
      </div>

      <div className="dashboard-grid three">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Trạng thái lịch hẹn</h3>
              <p>Phân bổ toàn bộ lịch khám</p>
            </div>
          </div>
          <Donut
            center={counts.appointments.toString()}
            parts={[
              { label: "Hoàn thành", value: counts.completedAppointments, color: "#286A9B" },
              { label: "Đã xác nhận", value: counts.scheduledAppointments, color: "#438FC2" },
              { label: "Đã hủy", value: counts.cancelledAppointments, color: "#DF6B68" },
            ]}
          />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Lịch hẹn theo bác sĩ</h3>
              <p>Top bác sĩ có nhiều lịch hẹn nhất</p>
            </div>
          </div>
          <BarChart doctors={charts.topDoctors} />
        </div>
        <div className="card quick">
          <div className="card-head">
            <div>
              <h3>Thao tác nhanh</h3>
              <p>Lối tắt quản trị</p>
            </div>
          </div>
          {[
            ["doctor", "Quản lý bác sĩ", "doctors"],
            ["users", "Quản lý người dùng", "users"],
            ["briefcase", "Quản lý chuyên khoa", "specialties"],
            ["calendar", "Xem lịch hẹn", "appointments"],
          ].map((x) => (
            <button key={x[1]} onClick={() => setPage(x[2] as Page)}>
              <span>
                <Icon name={x[0]} />
              </span>
              {x[1]}
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Lịch khám gần đây</h3>
            <p>Các lịch hẹn mới nhất được ghi nhận</p>
          </div>
          <Button variant="ghost" onClick={() => setPage("appointments")}>
            Xem tất cả
          </Button>
        </div>
        <div className="activity-list">
          {appointments.slice(0, 4).map((a) => (
            <div
              className="activity"
              key={a.id}
              style={{ cursor: "pointer" }}
              onClick={() => onViewAppointment(a)}
            >
              <span className="activity-icon a0">
                <Icon name="calendar" size={18} />
              </span>
              <div>
                <b>{a.patient} · BS. {a.doctor}</b>
                <small>{a.date} lúc {a.time} · {a.specialty} ({a.reason})</small>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
          {appointments.length === 0 && (
            <p style={{ padding: "1rem", color: "#666" }}>Chưa có lịch hẹn nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// UserForm & UsersPage
// --------------------------------------------------------------------------

function UserForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: User;
  onSave: (payload: {
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    username?: string;
    password?: string;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [role, setRole] = useState(initial?.role || "Bệnh nhân");
  const [status, setStatus] = useState(initial?.status || "Hoạt động");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!initial && (!username.trim() || password.length < 10)) {
      setError("Tên đăng nhập và mật khẩu (tối thiểu 10 ký tự) là bắt buộc khi tạo tài khoản mới.");
      return;
    }
    onSave({ name, email, phone, role, status, username, password });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="span-2">
          Họ và tên *
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" required />
        </label>
        {!initial && (
          <>
            <label>
              Tên đăng nhập *
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username_titimi"
                required
              />
            </label>
            <label>
              Mật khẩu khởi tạo *
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 10 ký tự"
                required
              />
            </label>
          </>
        )}
        <label>
          Email *
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@titimi.vn"
          />
        </label>
        <label>
          Số điện thoại *
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090 123 4567" required />
        </label>
        <label>
          Vai trò
          <Select value={role} onChange={(e) => setRole(e.target.value as User["role"])}>
            <option>Admin</option>
            <option>Bác sĩ</option>
            <option>Bệnh nhân</option>
          </Select>
        </label>
        <label>
          Trạng thái
          <Select value={status} onChange={(e) => setStatus(e.target.value as User["status"])}>
            <option>Hoạt động</option>
            <option>Tạm khóa</option>
          </Select>
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit">{initial ? "Lưu thay đổi" : "Tạo người dùng"}</Button>
      </div>
    </form>
  );
}

function UsersPage({
  users,
  onAddUser,
  onToggleStatus,
}: {
  users: User[];
  onAddUser: (payload: any) => Promise<void>;
  onToggleStatus: (user: User) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [modal, setModal] = useState<"add" | "confirm" | null>(null);
  const [selected, setSelected] = useState<User>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return users.filter(
      (u) =>
        `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q.toLowerCase()) &&
        (role === "Tất cả" || u.role === role) &&
        (status === "Tất cả" || u.status === status),
    );
  }, [users, q, role, status]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const handleSave = async (payload: any) => {
    await onAddUser(payload);
    setModal(null);
  };

  const handleToggle = async () => {
    if (selected) {
      await onToggleStatus(selected);
      setSelected(undefined);
      setModal(null);
    }
  };

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow={`${users.length.toLocaleString("vi-VN")} tài khoản`}
        title="Quản lý người dùng"
        description="Quản lý tài khoản và quyền truy cập trên toàn hệ thống."
        action="Thêm người dùng"
        onAction={() => setModal("add")}
      />

      <div className="stat-grid three">
        <StatCard
          label="Tổng người dùng"
          value={users.length.toLocaleString("vi-VN")}
          detail="Tài khoản trong CSDL"
          icon="users"
        />
        <StatCard
          label="Đang hoạt động"
          value={users.filter((u) => u.status === "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Tài khoản hoạt động"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Tạm khóa"
          value={users.filter((u) => u.status !== "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Tài khoản bị khóa"
          icon="clock"
          tone="orange"
        />
      </div>

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tên, email hoặc mã người dùng" />
          <div className="filters">
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Admin</option>
              <option>Bác sĩ</option>
              <option>Bệnh nhân</option>
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Hoạt động</option>
              <option>Tạm khóa</option>
            </Select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã người dùng</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.id}</b></td>
                  <td>
                    <div className="person">
                      <Avatar name={u.name} size="sm" />
                      <b>{u.name}</b>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td><span className="badge badge-info">{u.role}</span></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>{u.created}</td>
                  <td>
                    <div className="row-actions">
                      <Button
                        variant={u.status === "Hoạt động" ? "secondary" : "primary"}
                        onClick={() => {
                          setSelected(u);
                          setModal("confirm");
                        }}
                      >
                        {u.status === "Hoạt động" ? "Khóa" : "Mở khóa"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </div>

      {modal === "add" && (
        <Modal title="Thêm người dùng mới" onClose={() => setModal(null)}>
          <UserForm onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}

      {modal === "confirm" && selected && (
        <ConfirmDialog
          title={selected.status === "Hoạt động" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          message={`Bạn có chắc chắn muốn ${selected.status === "Hoạt động" ? "khóa" : "mở khóa"} tài khoản ${selected.name} (${selected.id})?`}
          onConfirm={handleToggle}
          onClose={() => setModal(null)}
          confirmText={selected.status === "Hoạt động" ? "Khóa ngay" : "Mở khóa ngay"}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// DoctorForm & DoctorsPage
// --------------------------------------------------------------------------

function DoctorForm({
  initial,
  specialties,
  onSave,
  onClose,
}: {
  initial?: Doctor;
  specialties: Specialty[];
  onSave: (payload: {
    name: string;
    username?: string;
    password?: string;
    phone: string;
    email: string;
    specialty: string;
    licenseNumber?: string;
    gender?: string;
    dob?: string;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [specialty, setSpecialty] = useState(initial?.specialty || specialties[0]?.name || "Đa khoa");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber || "");
  const [gender, setGender] = useState(initial?.gender || "Nam");
  const [dob, setDob] = useState(initial?.dob || "15/05/1985");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError("Vui lòng điền họ tên, số điện thoại và email bác sĩ.");
      return;
    }
    onSave({ name, specialty, email, phone, licenseNumber, gender, dob, username, password });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="span-2">
          Họ và tên bác sĩ *
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="BS. Nguyễn Văn A" />
        </label>
        {!initial && (
          <>
            <label>
              Tên đăng nhập
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="bs.nguyenvana (tùy chọn)"
              />
            </label>
            <label>
              Mật khẩu tạm thời
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mặc định: DoctorPassword123@"
              />
            </label>
          </>
        )}
        <label>
          Chuyên khoa
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option>Đa khoa</option>
            {specialties.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </Select>
        </label>
        <label>
          Giới tính
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option>Nam</option>
            <option>Nữ</option>
            <option>Khác</option>
          </Select>
        </label>
        <label>
          Email *
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Số điện thoại *
          <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090 123 4567" />
        </label>
        <label>
          Số giấy phép hành nghề
          <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="GP-2024-001" />
        </label>
        <label>
          Ngày sinh
          <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="15/05/1985" />
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit">Lưu thông tin</Button>
      </div>
    </form>
  );
}

function ProfileDetail({
  title,
  data,
  onClose,
}: {
  title: string;
  data: [string, string][];
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="detail-grid">
        {data.map((x) => (
          <div key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1] || "—"}</b>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}

function DoctorsPage({
  doctors,
  specialties,
  onAddDoctor,
  onUpdateDoctor,
  onToggleStatus,
}: {
  doctors: Doctor[];
  specialties: Specialty[];
  onAddDoctor: (payload: any) => Promise<void>;
  onUpdateDoctor: (doctorId: string, payload: any) => Promise<void>;
  onToggleStatus: (userId: string, targetStatus: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("Tất cả");
  const [modal, setModal] = useState<"add" | "edit" | "detail" | null>(null);
  const [selected, setSelected] = useState<Doctor>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = useMemo(() => {
    return doctors.filter(
      (d) =>
        (d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.id.toLowerCase().includes(q.toLowerCase()) ||
          d.phone.includes(q)) &&
        (specialty === "Tất cả" || d.specialty === specialty),
    );
  }, [doctors, q, specialty]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page]);

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Danh mục nhân sự y tế"
        title="Quản lý bác sĩ"
        description="Theo dõi hồ sơ, chuyên khoa và trạng thái hoạt động của đội ngũ bác sĩ."
        action="Thêm bác sĩ"
        onAction={() => { setSelected(undefined); setModal("add"); }}
      />

      <div className="stat-grid three">
        <StatCard
          label="Tổng bác sĩ"
          value={doctors.length.toLocaleString("vi-VN")}
          detail={`Phục vụ ${specialties.length} chuyên khoa`}
          icon="doctor"
        />
        <StatCard
          label="Đang hoạt động"
          value={doctors.filter((d) => d.status === "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Sẵn sàng tiếp nhận bệnh nhân"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Tạm khóa"
          value={doctors.filter((d) => d.status === "Tạm khóa").length.toLocaleString("vi-VN")}
          detail="Đang tạm ngưng ca"
          icon="clock"
          tone="orange"
        />
      </div>

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tên hoặc mã bác sĩ..." />
          <div className="filters">
            <Select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Đa khoa</option>
              {specialties.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã bác sĩ</th>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Số GPLX</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.id}</b></td>
                  <td>
                    <div className="person">
                      <Avatar name={d.name} size="sm" />
                      <b>{d.name}</b>
                    </div>
                  </td>
                  <td><span className="badge badge-info">{d.specialty}</span></td>
                  <td>{d.email}</td>
                  <td>{d.phone}</td>
                  <td>{d.licenseNumber || "Chưa cấp"}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="Xem hồ sơ"
                        onClick={() => {
                          setSelected(d);
                          setModal("detail");
                        }}
                      >
                        <Icon name="eye" size={17} />
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => {
                          setSelected(d);
                          setModal("edit");
                        }}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      {d.userId && (
                        <Button
                          variant={d.status === "Hoạt động" ? "secondary" : "primary"}
                          onClick={() => onToggleStatus(d.userId!, d.status === "Hoạt động" ? "Tạm khóa" : "Hoạt động")}
                        >
                          {d.status === "Hoạt động" ? "Khóa" : "Mở"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
      </div>

      {modal === "add" && (
        <Modal title="Thêm bác sĩ mới" onClose={() => setModal(null)}>
          <DoctorForm
            specialties={specialties}
            onSave={async (payload) => {
              await onAddDoctor(payload);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title="Chỉnh sửa hồ sơ bác sĩ" onClose={() => setModal(null)}>
          <DoctorForm
            initial={selected}
            specialties={specialties}
            onSave={async (payload) => {
              await onUpdateDoctor(selected.id, payload);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal === "detail" && selected && (
        <ProfileDetail
          title={`Hồ sơ bác sĩ - ${selected.name}`}
          data={[
            ["Mã bác sĩ", selected.id],
            ["Họ và tên", selected.name],
            ["Chuyên khoa", selected.specialty],
            ["Email", selected.email],
            ["Số điện thoại", selected.phone],
            ["Số giấy phép", selected.licenseNumber || "BS-2024-CLINIC"],
            ["Phân loại", selected.subtype === "GENERAL_PRACTITIONER" ? "Bác sĩ Đa khoa" : "Bác sĩ Chuyên khoa"],
            ["Trạng thái", selected.status],
          ]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// PatientForm & PatientsPage
// --------------------------------------------------------------------------

function PatientForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Patient;
  onSave: (payload: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [gender, setGender] = useState(initial?.gender || "Nam");
  const [dob, setDob] = useState(initial?.dob || "01/01/1995");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [bloodType, setBloodType] = useState(initial?.bloodType || "");
  const [allergies, setAllergies] = useState(initial?.allergies || "Không");
  const [chronicDiseases, setChronicDiseases] = useState(initial?.chronicDiseases || "Không");
  const [emergencyName, setEmergencyName] = useState(initial?.emergencyContactName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initial?.emergencyContactPhone || "");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Họ và tên và số điện thoại là bắt buộc.");
      return;
    }
    onSave({
      name,
      gender,
      dob,
      phone,
      email,
      address,
      bloodType,
      allergies,
      chronicDiseases,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="span-2">
          Họ và tên bệnh nhân *
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
        </label>
        <label>
          Giới tính
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option>Nam</option>
            <option>Nữ</option>
            <option>Khác</option>
          </Select>
        </label>
        <label>
          Ngày sinh
          <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="dd/mm/yyyy" />
        </label>
        <label>
          Số điện thoại *
          <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090 123 4567" />
        </label>
        <label>
          Email
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="span-2">
          Địa chỉ
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
        </label>
        <label>
          Nhóm máu
          <Select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
            <option value="">Chưa rõ</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </Select>
        </label>
        <label>
          Tiền sử dị ứng
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Thuốc kháng sinh, hải sản..." />
        </label>
        <label className="span-2">
          Bệnh mãn tính
          <Input value={chronicDiseases} onChange={(e) => setChronicDiseases(e.target.value)} placeholder="Cao huyết áp, tiểu đường..." />
        </label>
        <label>
          Người liên hệ khẩn cấp
          <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Họ tên người thân" />
        </label>
        <label>
          Số điện thoại khẩn cấp
          <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="091 234 5678" />
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit">Lưu thông tin</Button>
      </div>
    </form>
  );
}

function PatientsPage({
  patients,
  onAddPatient,
  onUpdatePatient,
  onToggleStatus,
}: {
  patients: Patient[];
  onAddPatient: (payload: any) => Promise<void>;
  onUpdatePatient: (patientId: string, payload: any) => Promise<void>;
  onToggleStatus: (userId: string, targetStatus: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("Tất cả");
  const [modal, setModal] = useState<"add" | "edit" | "detail" | null>(null);
  const [selected, setSelected] = useState<Patient>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = useMemo(() => {
    return patients.filter(
      (p) =>
        `${p.name} ${p.id} ${p.phone} ${p.email}`.toLowerCase().includes(q.toLowerCase()) &&
        (gender === "Tất cả" || p.gender === gender),
    );
  }, [patients, q, gender]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page]);

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow={`${patients.length.toLocaleString("vi-VN")} hồ sơ bệnh nhân`}
        title="Quản lý bệnh nhân"
        description="Quản lý thông tin y tế cơ bản và hồ sơ liên hệ của bệnh nhân."
        action="Thêm bệnh nhân"
        onAction={() => { setSelected(undefined); setModal("add"); }}
      />

      <div className="stat-grid three">
        <StatCard
          label="Tổng bệnh nhân"
          value={patients.length.toLocaleString("vi-VN")}
          detail="Hồ sơ trong hệ thống"
          icon="heart"
        />
        <StatCard
          label="Đang hoạt động"
          value={patients.filter((p) => p.status === "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Đủ điều kiện đặt lịch"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Tạm khóa"
          value={patients.filter((p) => p.status !== "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Hồ sơ bị tạm ngưng"
          icon="clock"
          tone="orange"
        />
      </div>

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tên, mã hoặc số điện thoại..." />
          <div className="filters">
            <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Nam</option>
              <option>Nữ</option>
            </Select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã bệnh nhân</th>
                <th>Họ và tên</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Nhóm máu</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.id}</b></td>
                  <td>
                    <div className="person">
                      <Avatar name={p.name} size="sm" />
                      <b>{p.name}</b>
                    </div>
                  </td>
                  <td>{p.gender}</td>
                  <td>{p.dob}</td>
                  <td>{p.phone}</td>
                  <td>{p.email || "—"}</td>
                  <td><span className="badge badge-info">{p.bloodType || "Chưa rõ"}</span></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="Xem hồ sơ"
                        onClick={() => {
                          setSelected(p);
                          setModal("detail");
                        }}
                      >
                        <Icon name="eye" size={17} />
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => {
                          setSelected(p);
                          setModal("edit");
                        }}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      {p.userId && (
                        <Button
                          variant={p.status === "Hoạt động" ? "secondary" : "primary"}
                          onClick={() => onToggleStatus(p.userId!, p.status === "Hoạt động" ? "Tạm khóa" : "Hoạt động")}
                        >
                          {p.status === "Hoạt động" ? "Khóa" : "Mở"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
      </div>

      {modal === "add" && (
        <Modal title="Thêm bệnh nhân mới" onClose={() => setModal(null)}>
          <PatientForm
            onSave={async (payload) => {
              await onAddPatient(payload);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title="Chỉnh sửa hồ sơ bệnh nhân" onClose={() => setModal(null)}>
          <PatientForm
            initial={selected}
            onSave={async (payload) => {
              await onUpdatePatient(selected.id, payload);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal === "detail" && selected && (
        <ProfileDetail
          title={`Chi tiết bệnh nhân - ${selected.name}`}
          data={[
            ["Mã bệnh nhân", selected.id],
            ["Họ và tên", selected.name],
            ["Giới tính", selected.gender],
            ["Ngày sinh", selected.dob],
            ["Số điện thoại", selected.phone],
            ["Email", selected.email],
            ["Địa chỉ", selected.address || "Chưa cung cấp"],
            ["Nhóm máu", selected.bloodType || "Chưa rõ"],
            ["Dị ứng", selected.allergies || "Không"],
            ["Bệnh mãn tính", selected.chronicDiseases || "Không"],
            ["Người liên hệ khẩn cấp", selected.emergencyContactName || "Chưa cung cấp"],
            ["SĐT khẩn cấp", selected.emergencyContactPhone || "Chưa cung cấp"],
            ["Trạng thái", selected.status],
          ]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// SpecialtyForm & SpecialtiesPage
// --------------------------------------------------------------------------

function SpecialtyForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Specialty;
  onSave: (payload: { name: string; description: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Tên chuyên khoa không được để trống.");
      return;
    }
    onSave({ name, description });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid one">
        <label>
          Tên chuyên khoa *
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tai Mũi Họng, Răng Hàm Mặt..." />
        </label>
        <label>
          Mô tả chuyên môn
          <textarea
            className="field"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả phạm vi khám và điều trị của chuyên khoa..."
          />
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit">Lưu chuyên khoa</Button>
      </div>
    </form>
  );
}

function SpecialtiesPage({
  items,
  doctors,
  onAddSpecialty,
  onUpdateSpecialty,
  onSelectDoctor,
}: {
  items: Specialty[];
  doctors: Doctor[];
  onAddSpecialty: (payload: { name: string; description: string }) => Promise<void>;
  onUpdateSpecialty: (id: string, payload: { name: string; description: string }) => Promise<void>;
  onSelectDoctor: (d: Doctor) => void;
}) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"form" | "doctors" | null>(null);
  const [selected, setSelected] = useState<Specialty>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = useMemo(() => {
    return items.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  }, [items, q]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page]);

  const assignedDoctors = useMemo(() => {
    if (!selected) return [];
    return doctors.filter((d) => d.specialty === selected.name);
  }, [doctors, selected]);

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow={`${items.length} chuyên khoa y tế`}
        title="Quản lý chuyên khoa"
        description="Cấu hình danh mục chuyên môn và theo dõi phân bổ bác sĩ tại phòng khám."
        action="Thêm chuyên khoa"
        onAction={() => {
          setSelected(undefined);
          setModal("form");
        }}
      />

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tìm tên chuyên khoa..." />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã chuyên khoa</th>
                <th>Tên chuyên khoa</th>
                <th>Mô tả</th>
                <th>Số lượng bác sĩ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.id}</b></td>
                  <td><b>{s.name}</b></td>
                  <td className="description-cell">{s.description || "Chưa có mô tả"}</td>
                  <td>
                    <button
                      className="link-btn"
                      style={{ textDecoration: "underline", color: "#286A9B", cursor: "pointer" }}
                      onClick={() => {
                        setSelected(s);
                        setModal("doctors");
                      }}
                    >
                      {s.doctors} bác sĩ
                    </button>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button
                        title="Xem danh sách bác sĩ"
                        onClick={() => {
                          setSelected(s);
                          setModal("doctors");
                        }}
                      >
                        <Icon name="users" size={17} />
                      </button>
                      <button
                        title="Chỉnh sửa"
                        onClick={() => {
                          setSelected(s);
                          setModal("form");
                        }}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
      </div>

      {modal === "form" && (
        <Modal title={selected ? "Chỉnh sửa chuyên khoa" : "Thêm chuyên khoa mới"} onClose={() => setModal(null)}>
          <SpecialtyForm
            initial={selected}
            onSave={async (payload) => {
              if (selected) {
                await onUpdateSpecialty(selected.id, payload);
              } else {
                await onAddSpecialty(payload);
              }
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {modal === "doctors" && selected && (
        <Modal title={`Bác sĩ chuyên khoa: ${selected.name}`} onClose={() => setModal(null)} wide>
          <div style={{ padding: "0.5rem 0" }}>
            <p style={{ marginBottom: "1rem" }}>
              Danh sách bác sĩ thuộc chuyên khoa <b>{selected.name}</b> ({assignedDoctors.length} bác sĩ):
            </p>
            {assignedDoctors.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Họ và tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedDoctors.map((doc) => (
                      <tr key={doc.id} style={{ cursor: "pointer" }} onClick={() => { onSelectDoctor(doc); setModal(null); }}>
                        <td><b>{doc.id}</b></td>
                        <td>{doc.name}</td>
                        <td>{doc.email}</td>
                        <td>{doc.phone}</td>
                        <td><StatusBadge status={doc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#777", fontStyle: "italic" }}>Chưa có bác sĩ nào được phân công vào chuyên khoa này.</p>
            )}
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// CreateAppointmentModal & AppointmentsPage
// --------------------------------------------------------------------------

function CreateAppointmentModal({
  patients,
  doctors,
  specialties,
  onClose,
  onConfirm,
}: {
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  onClose: () => void;
  onConfirm: (payload: any) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [patient, setPatient] = useState<Patient>();
  const [visitType, setVisitType] = useState<"Khám trực tiếp" | "Tư vấn trực tuyến">("Khám trực tiếp");
  const [specialty, setSpecialty] = useState("");
  const [doctor, setDoctor] = useState<Doctor>();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepLabels = ["Bệnh nhân", "Hình thức", "Chuyên khoa", "Bác sĩ", "Ngày & giờ", "Xác nhận"];

  const patientResults = useMemo(() => {
    return patients.filter(
      (item) =>
        item.status === "Hoạt động" &&
        `${item.name} ${item.id} ${item.phone}`.toLowerCase().includes(patientQuery.toLowerCase()),
    );
  }, [patients, patientQuery]);

  const doctorResults = useMemo(() => {
    return doctors.filter(
      (item) =>
        item.status === "Hoạt động" &&
        (!specialty || item.specialty === specialty) &&
        item.name.toLowerCase().includes(doctorQuery.toLowerCase()),
    );
  }, [doctors, specialty, doctorQuery]);

  const slots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

  const canContinue =
    (step === 1 && Boolean(patient)) ||
    (step === 2 && Boolean(visitType)) ||
    (step === 3 && Boolean(specialty)) ||
    (step === 4 && Boolean(doctor)) ||
    (step === 5 && Boolean(date && time));

  const handleCreate = async () => {
    if (!patient || !doctor || !date || !time) return;
    setSubmitting(true);
    setError("");
    try {
      const dateTime = `${date} ${time}:00`;
      await onConfirm({
        patientId: patient.id,
        doctorId: doctor.id,
        dateTime,
        duration: 30,
        visitType,
        reason: reason.trim() || "Khám sức khỏe tổng quát",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Không thể tạo lịch hẹn.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Đặt lịch hẹn khám mới" onClose={onClose} wide>
      <div className="stepper">
        {stepLabels.map((lbl, idx) => (
          <div key={lbl} className={`step-item ${step === idx + 1 ? "active" : step > idx + 1 ? "done" : ""}`}>
            <span className="step-circle">{step > idx + 1 ? "✓" : idx + 1}</span>
            <small>{lbl}</small>
          </div>
        ))}
      </div>

      <div style={{ minHeight: "320px", marginTop: "1rem" }}>
        {step === 1 && (
          <div>
            <h4>Bước 1: Chọn bệnh nhân</h4>
            <SearchBar value={patientQuery} onChange={setPatientQuery} placeholder="Tìm tên, mã hoặc SĐT bệnh nhân..." />
            <div className="select-list" style={{ maxHeight: "240px", overflowY: "auto", marginTop: "0.75rem" }}>
              {patientResults.map((p) => (
                <div
                  key={p.id}
                  className={`select-item ${patient?.id === p.id ? "selected" : ""}`}
                  onClick={() => setPatient(p)}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid",
                    borderColor: patient?.id === p.id ? "#286A9B" : "#e2e8f0",
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    background: patient?.id === p.id ? "#f0f7fc" : "#fff",
                  }}
                >
                  <b>{p.name}</b> ({p.id}) · SĐT: {p.phone}
                </div>
              ))}
              {!patientResults.length && <p>Không tìm thấy bệnh nhân đang hoạt động.</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h4>Bước 2: Chọn hình thức khám</h4>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              {(["Khám trực tiếp", "Tư vấn trực tuyến"] as const).map((vt) => (
                <div
                  key={vt}
                  onClick={() => setVisitType(vt)}
                  style={{
                    flex: 1,
                    padding: "1.5rem",
                    border: "2px solid",
                    borderColor: visitType === vt ? "#286A9B" : "#e2e8f0",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: visitType === vt ? "#f0f7fc" : "#fff",
                    textAlign: "center",
                  }}
                >
                  <Icon name={vt === "Khám trực tiếp" ? "doctor" : "calendar"} size={32} />
                  <h4 style={{ marginTop: "0.5rem" }}>{vt}</h4>
                  <small>{vt === "Khám trực tiếp" ? "Khám tại phòng khám TiTiMi" : "Video call bảo mật từ xa"}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h4>Bước 3: Chọn chuyên khoa</h4>
            <div className="grid-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
              <div
                onClick={() => setSpecialty("Đa khoa")}
                style={{
                  padding: "1rem",
                  border: "1px solid",
                  borderColor: specialty === "Đa khoa" ? "#286A9B" : "#e2e8f0",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: specialty === "Đa khoa" ? "#f0f7fc" : "#fff",
                }}
              >
                <b>Đa khoa</b>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>Khám và chăm sóc tổng quát</p>
              </div>
              {specialties.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSpecialty(s.name)}
                  style={{
                    padding: "1rem",
                    border: "1px solid",
                    borderColor: specialty === s.name ? "#286A9B" : "#e2e8f0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: specialty === s.name ? "#f0f7fc" : "#fff",
                  }}
                >
                  <b>{s.name}</b>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>{s.description || "Chuyên khoa TiTiMi"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h4>Bước 4: Chọn bác sĩ</h4>
            <SearchBar value={doctorQuery} onChange={setDoctorQuery} placeholder="Tìm tên bác sĩ..." />
            <div style={{ maxHeight: "240px", overflowY: "auto", marginTop: "0.75rem" }}>
              {doctorResults.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDoctor(d)}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid",
                    borderColor: doctor?.id === d.id ? "#286A9B" : "#e2e8f0",
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    background: doctor?.id === d.id ? "#f0f7fc" : "#fff",
                  }}
                >
                  <b>{d.name}</b> · {d.specialty} ({d.phone})
                </div>
              ))}
              {!doctorResults.length && <p>Không tìm thấy bác sĩ phù hợp.</p>}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h4>Bước 5: Chọn ngày và khung giờ khám</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
              <div>
                <label>
                  <b>Ngày khám:</b>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginTop: "0.5rem" }} />
                </label>
              </div>
              <div>
                <b>Khung giờ khám còn trống:</b>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      style={{
                        padding: "0.5rem",
                        border: "1px solid",
                        borderColor: time === s ? "#286A9B" : "#cbd5e1",
                        background: time === s ? "#286A9B" : "#fff",
                        color: time === s ? "#fff" : "#1e293b",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h4>Bước 6: Xác nhận thông tin lịch hẹn</h4>
            <div className="detail-grid" style={{ marginTop: "1rem" }}>
              <div><small>Bệnh nhân</small><b>{patient?.name} ({patient?.id})</b></div>
              <div><small>Bác sĩ</small><b>{doctor?.name} ({doctor?.specialty})</b></div>
              <div><small>Hình thức</small><b>{visitType}</b></div>
              <div><small>Thời gian</small><b>{date} lúc {time}</b></div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <label>
                Lý do khám / Triệu chứng
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Khám định kỳ, đau họng, sốt nhẹ..."
                />
              </label>
            </div>
            {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
          </div>
        )}
      </div>

      <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Quay lại
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
        )}
        {step < 6 ? (
          <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
            Tiếp tục
          </Button>
        ) : (
          <Button disabled={submitting} onClick={handleCreate}>
            {submitting ? "Đang tạo..." : "Xác nhận tạo lịch hẹn"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function AppointmentDetail({
  appointment,
  onClose,
  onStatusChange,
  onReschedule,
}: {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: (status: string) => Promise<void>;
  onReschedule?: () => void;
}) {
  return (
    <Modal title="Chi tiết lịch hẹn" onClose={onClose} wide>
      <div className="appointment-code">
        <span>
          <Icon name="calendar" />
        </span>
        <div>
          <small>Mã lịch hẹn</small>
          <h3>{appointment.id}</h3>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="detail-grid">
        {[
          ["Bệnh nhân", appointment.patient],
          ["Mã bệnh nhân", appointment.patientId || "—"],
          ["Bác sĩ", `BS. ${appointment.doctor}`],
          ["Chuyên khoa", appointment.specialty],
          ["Ngày khám", appointment.date],
          ["Giờ khám", appointment.time],
          ["Hình thức", appointment.visitType || "Khám trực tiếp"],
          ["Loại lịch", appointment.isFollowUp ? "Tái khám" : "Khám thông thường"],
          ["Phí khám", appointment.fee ? `${appointment.fee.toLocaleString("vi-VN")} ₫` : "250.000 ₫"],
          ["Lý do khám", appointment.reason || "Khám sức khỏe tổng quát"],
        ].map((x) => (
          <div key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1]}</b>
          </div>
        ))}
      </div>

      <div className="privacy-note">
        <Icon name="heart" />
        <div>
          <b>Quyền quản trị & Điều phối</b>
          <p>Quản trị viên có thể cập nhật trạng thái lịch hẹn hoặc dời lịch trực tiếp vào cơ sở dữ liệu.</p>
        </div>
      </div>

      <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onStatusChange && appointment.status !== "Hoàn thành" && appointment.status !== "Đã hủy" && (
            <>
              {appointment.status !== "Đã xác nhận" && (
                <Button variant="primary" onClick={() => onStatusChange("Đã xác nhận")}>
                  Xác nhận lịch
                </Button>
              )}
              <Button variant="secondary" onClick={() => onStatusChange("Hoàn thành")}>
                Đánh dấu Hoàn thành
              </Button>
              <Button variant="danger" onClick={() => onStatusChange("Đã hủy")}>
                Hủy lịch hẹn
              </Button>
            </>
          )}
          {onReschedule && appointment.status !== "Hoàn thành" && appointment.status !== "Đã hủy" && (
            <Button variant="secondary" onClick={onReschedule}>
              Đổi lịch khám
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}

function AppointmentsPage({
  appointments,
  patients,
  doctors,
  specialties,
  onCreate,
  onStatusChange,
  onReschedule,
  notify,
}: {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  onCreate: (payload: any) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onReschedule: (id: string, payload: any) => Promise<void>;
  notify: (message: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [specialty, setSpecialty] = useState("Tất cả");
  const [selected, setSelected] = useState<Appointment>();
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return appointments.filter(
      (a) =>
        `${a.id} ${a.patient} ${a.doctor}`.toLowerCase().includes(q.toLowerCase()) &&
        (status === "Tất cả" || a.status === status) &&
        (specialty === "Tất cả" || a.specialty === specialty),
    );
  }, [appointments, q, status, specialty]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const countsByStatus = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "Chờ xác nhận").length,
      confirmed: appointments.filter((a) => a.status === "Đã xác nhận").length,
      completed: appointments.filter((a) => a.status === "Hoàn thành").length,
      cancelled: appointments.filter((a) => a.status === "Đã hủy").length,
    };
  }, [appointments]);

  const handleExecuteReschedule = async () => {
    if (!rescheduling || !newDate || !newTime) {
      notify("Vui lòng chọn ngày và giờ mới.");
      return;
    }
    await onReschedule(rescheduling.id, {
      dateTime: `${newDate} ${newTime}:00`,
      duration: 30,
    });
    setRescheduling(null);
  };

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Theo dõi toàn hệ thống"
        title="Quản lý lịch hẹn"
        description="Tra cứu, cập nhật trạng thái và điều phối lịch khám các chuyên khoa."
        action="Tạo lịch hẹn"
        onAction={() => setCreating(true)}
      />

      <div className="stat-grid five">
        <StatCard
          label="Tổng lịch hẹn"
          value={countsByStatus.total.toLocaleString("vi-VN")}
          detail="Từ trước đến nay"
          icon="calendar"
        />
        <StatCard
          label="Chờ xác nhận"
          value={countsByStatus.pending.toLocaleString("vi-VN")}
          detail="Cần xác nhận"
          icon="clock"
          tone="yellow"
        />
        <StatCard
          label="Đã xác nhận"
          value={countsByStatus.confirmed.toLocaleString("vi-VN")}
          detail="Sắp diễn ra"
          icon="check"
          tone="blue"
        />
        <StatCard
          label="Hoàn thành"
          value={countsByStatus.completed.toLocaleString("vi-VN")}
          detail={`Tỷ lệ ${Math.round((countsByStatus.completed / (countsByStatus.total || 1)) * 100)}%`}
          icon="check"
          tone="green"
        />
        <StatCard
          label="Đã hủy"
          value={countsByStatus.cancelled.toLocaleString("vi-VN")}
          detail="Đã bị hủy"
          icon="close"
          tone="red"
        />
      </div>

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Mã lịch hẹn, bệnh nhân hoặc bác sĩ..." />
          <div className="filters">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Chờ xác nhận</option>
              <option>Đã xác nhận</option>
              <option>Hoàn thành</option>
              <option>Đã hủy</option>
            </Select>
            <Select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}>
              <option>Tất cả</option>
              <option>Đa khoa</option>
              {specialties.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã lịch hẹn</th>
                <th>Bệnh nhân</th>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Ngày & giờ</th>
                <th>Lý do khám</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.id}</b></td>
                  <td>{a.patient}</td>
                  <td>BS. {a.doctor}</td>
                  <td>
                    {a.specialty}
                    {a.visitType && <small className="block" style={{ color: "#64748b" }}>{a.visitType}</small>}
                  </td>
                  <td>
                    <b>{a.date}</b>
                    <small className="block" style={{ color: "#64748b" }}>{a.time}</small>
                  </td>
                  <td>
                    {a.isFollowUp && <span className="follow-up-tag">Tái khám</span>}
                    {a.reason}
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button title="Xem chi tiết" onClick={() => setSelected(a)}>
                        <Icon name="eye" size={17} />
                      </button>
                      {a.status !== "Hoàn thành" && a.status !== "Đã hủy" && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => onStatusChange(a.id, a.status === "Đã xác nhận" ? "Hoàn thành" : "Đã xác nhận")}
                          >
                            {a.status === "Đã xác nhận" ? "Hoàn thành" : "Xác nhận"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setRescheduling(a)}
                          >
                            Dời lịch
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </div>

      {selected && (
        <AppointmentDetail
          appointment={selected}
          onClose={() => setSelected(undefined)}
          onStatusChange={async (newSt) => {
            await onStatusChange(selected.id, newSt);
            setSelected((prev) => prev ? { ...prev, status: newSt as any } : undefined);
          }}
          onReschedule={() => {
            const current = selected;
            setSelected(undefined);
            setRescheduling(current);
          }}
        />
      )}

      {creating && (
        <CreateAppointmentModal
          patients={patients}
          doctors={doctors}
          specialties={specialties}
          onClose={() => setCreating(false)}
          onConfirm={onCreate}
        />
      )}

      {rescheduling && (
        <Modal title={`Đổi lịch hẹn - ${rescheduling.id}`} onClose={() => setRescheduling(null)}>
          <div style={{ padding: "0.5rem 0" }}>
            <p>Bệnh nhân: <b>{rescheduling.patient}</b> · Bác sĩ: <b>BS. {rescheduling.doctor}</b></p>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <label>
                Ngày hẹn mới *
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </label>
              <label>
                Giờ hẹn mới *
                <Select value={newTime} onChange={(e) => setNewTime(e.target.value)}>
                  {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => setRescheduling(null)}>
                Hủy
              </Button>
              <Button onClick={handleExecuteReschedule}>
                Lưu lịch hẹn mới
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// SchedulePage (Work Shifts)
// --------------------------------------------------------------------------

function SchedulePage({
  schedules,
  appointments,
  doctors,
  specialties,
  onAddSchedule,
  onToggleStatus,
  onViewAppointment,
}: {
  schedules: Schedule[];
  appointments: Appointment[];
  doctors: Doctor[];
  specialties: Specialty[];
  onAddSchedule: (payload: any) => Promise<void>;
  onToggleStatus: (id: string, status: string) => Promise<void>;
  onViewAppointment: (a: Appointment) => void;
}) {
  const [view, setView] = useState("Tuần");
  const [offset, setOffset] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState("Tất cả bác sĩ");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Tất cả chuyên khoa");
  const [adding, setAdding] = useState(false);
  const [newDoctorId, setNewDoctorId] = useState(doctors[0]?.id || "");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newStatus, setNewStatus] = useState("Available");

  // Generate week dates based on offset
  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const dayOfWeek = base.getDay(); // 0 is Sunday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + distanceToMonday);

    const names = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayStr = String(d.getDate()).padStart(2, "0");
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const iso = `${d.getFullYear()}-${monthStr}-${dayStr}`;
      const formatted = `${dayStr}/${monthStr}`;
      return {
        label: `${names[i]}, ${formatted}`,
        dateStr: formatted,
        iso,
        isToday: d.toDateString() === new Date().toDateString(),
      };
    });
  }, [offset]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorId || !newDate) return;
    await onAddSchedule({
      doctorId: newDoctorId,
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      status: newStatus,
    });
    setAdding(false);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (selectedDoctor !== "Tất cả bác sĩ" && a.doctor !== selectedDoctor.replace("BS. ", "")) return false;
      if (selectedSpecialty !== "Tất cả chuyên khoa" && a.specialty !== selectedSpecialty) return false;
      return true;
    });
  }, [appointments, selectedDoctor, selectedSpecialty]);

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Lịch trực và làm việc toàn phòng khám"
        title="Quản lý lịch làm việc"
        description="Theo dõi ca trực bác sĩ, thời gian khả dụng và các lịch khám theo ngày."
        action="Thêm ca trực"
        onAction={() => setAdding(true)}
      />

      <div className="card calendar-card">
        <div className="calendar-toolbar">
          <div className="cal-nav">
            <button onClick={() => setOffset(offset - 1)}>‹</button>
            <button onClick={() => setOffset(offset + 1)}>›</button>
            <Button variant="secondary" onClick={() => setOffset(0)}>
              Hôm nay
            </Button>
            <h3>
              {weekDays[0].dateStr} – {weekDays[6].dateStr} {offset !== 0 && `(${offset > 0 ? "+" : ""}${offset} tuần)`}
            </h3>
          </div>
          <div className="segmented">
            {["Tuần", "Danh sách ca trực"].map((v) => (
              <button className={view === v ? "active" : ""} onClick={() => setView(v)} key={v}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar sub">
          <div className="filters">
            <Select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
              <option>Tất cả bác sĩ</option>
              {doctors.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
            <Select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
              <option>Tất cả chuyên khoa</option>
              <option>Đa khoa</option>
              {specialties.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div className="schedule-legend">
            <span>
              <i className="confirmed" />
              Đã xác nhận
            </span>
            <span>
              <i className="pending" />
              Chờ xác nhận
            </span>
            <span>
              <i className="done" />
              Hoàn thành
            </span>
          </div>
        </div>

        {view === "Tuần" ? (
          <div className="week-grid">
            <div className="time-col">
              <span />
              {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((t) => (
                <small key={t}>{t}</small>
              ))}
            </div>
            {weekDays.map((d, i) => {
              const dayAppts = filteredAppointments.filter((a) => a.date === d.dateStr || a.date.endsWith(`/${d.dateStr}`));
              return (
                <div className={`day-col ${d.isToday ? "today" : ""}`} key={d.label}>
                  <div>
                    <b>{d.label.split(", ")[0]}</b>
                    <span>{d.label.split(", ")[1]}</span>
                  </div>
                  {dayAppts.slice(0, 5).map((a, j) => (
                    <button
                      key={a.id}
                      className={`cal-event ${a.status === "Chờ xác nhận" ? "pending" : a.status === "Hoàn thành" ? "done" : ""}`}
                      style={{ top: `${66 + j * 75}px` }}
                      onClick={() => onViewAppointment(a)}
                    >
                      <b>{a.time} · {a.patient}</b>
                      <span>BS. {a.doctor}</span>
                    </button>
                  ))}
                  {dayAppts.length === 0 && (
                    <small style={{ display: "block", marginTop: "1rem", color: "#94a3b8", textAlign: "center" }}>
                      Trống
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-wrap" style={{ padding: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Mã ca</th>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Ngày làm việc</th>
                  <th>Khung giờ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.id}</b></td>
                    <td>{s.doctorName}</td>
                    <td>{s.specialty}</td>
                    <td>{s.formattedDate}</td>
                    <td>{s.startTime} – {s.endTime}</td>
                    <td><StatusBadge status={s.status === "Available" ? "Khả dụng" : s.status} /></td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => onToggleStatus(s.id, s.status === "Available" ? "Busy" : "Available")}
                      >
                        {s.status === "Available" ? "Đặt bận" : "Kích hoạt"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <Modal title="Thêm ca trực bác sĩ" onClose={() => setAdding(false)}>
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <label className="span-2">
                Bác sĩ *
                <Select value={newDoctorId} onChange={(e) => setNewDoctorId(e.target.value)}>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </Select>
              </label>
              <label>
                Ngày trực *
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </label>
              <label>
                Trạng thái
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="Available">Khả dụng (Available)</option>
                  <option value="Busy">Bận (Busy)</option>
                  <option value="On Leave">Nghỉ phép (On Leave)</option>
                </Select>
              </label>
              <label>
                Giờ bắt đầu *
                <Input value={newStart} onChange={(e) => setNewStart(e.target.value)} placeholder="08:00" required />
              </label>
              <label>
                Giờ kết thúc *
                <Input value={newEnd} onChange={(e) => setNewEnd(e.target.value)} placeholder="17:00" required />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => setAdding(false)}>
                Hủy
              </Button>
              <Button type="submit">Lưu ca trực</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// ReportsPage
// --------------------------------------------------------------------------

function ReportsPage({ notify }: { notify: (s: string) => void }) {
  const [range, setRange] = useState("30");
  const [report, setReport] = useState<api.ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.fetchReports(range)
      .then((res) => {
        if (active) setReport(res);
      })
      .catch((err) => {
        if (active) notify(err.message || "Lỗi tải báo cáo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [range]);

  const exportCsv = () => {
    if (!report) {
      notify("Dữ liệu báo cáo chưa sẵn sàng.");
      return;
    }
    const headers = "Hạng mục,Số liệu\n";
    const rows = report.csvData.map((r) => `"${r.item}",${r.value}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `titimi-bao-cao-${range}ngay.csv`;
    a.click();
    notify(`Đã xuất báo cáo CSV thực tế (${range} ngày)`);
  };

  const metrics = report?.metrics || {
    totalUsers: 0,
    newUsers: 0,
    doctors: 0,
    patients: 0,
    appointmentsInPeriod: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    completionRate: 0,
  };

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Báo cáo hệ thống phòng khám TiTiMi"
        title="Báo cáo & Phân tích"
        description="Theo dõi lưu lượng bệnh nhân, tiến độ điều trị và năng suất bác sĩ."
      />

      <div className="report-filter card">
        <div>
          <label>
            Khoảng thời gian:
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7">7 ngày gần nhất</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="90">90 ngày gần nhất</option>
            </Select>
          </label>
        </div>
        <Button onClick={exportCsv} disabled={loading}>
          <Icon name="download" size={18} />
          Xuất báo cáo CSV
        </Button>
      </div>

      <div className="section-label">
        <h3>Báo cáo người dùng & Nhân sự</h3>
        <span>{loading ? "Đang tải số liệu..." : "Dữ liệu thực tế từ MySQL"}</span>
      </div>

      <div className="stat-grid three">
        <StatCard
          label="Tổng người dùng"
          value={metrics.totalUsers.toLocaleString("vi-VN")}
          detail={`+${metrics.newUsers} người dùng mới trong kỳ`}
          icon="users"
        />
        <StatCard
          label="Bác sĩ"
          value={metrics.doctors}
          detail="Đội ngũ chuyên môn"
          icon="doctor"
          tone="blue"
        />
        <StatCard
          label="Bệnh nhân"
          value={metrics.patients.toLocaleString("vi-VN")}
          detail="Hồ sơ bệnh nhân ghi nhận"
          icon="heart"
          tone="violet"
        />
      </div>

      <div className="section-label" style={{ marginTop: "1rem" }}>
        <h3>Báo cáo lịch hẹn & Hiệu suất</h3>
      </div>

      <div className="stat-grid three">
        <StatCard
          label="Lịch hẹn trong kỳ"
          value={metrics.appointmentsInPeriod.toLocaleString("vi-VN")}
          detail={`${metrics.completed} lượt khám hoàn thành`}
          icon="calendar"
          tone="teal"
        />
        <StatCard
          label="Tỷ lệ hoàn thành"
          value={`${metrics.completionRate}%`}
          detail={`${metrics.cancelled} lịch bị hủy`}
          icon="check"
          tone="green"
        />
        <StatCard
          label="Lịch chờ xử lý"
          value={metrics.pending}
          detail="Cần phục vụ tiếp theo"
          icon="clock"
          tone="yellow"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card chart-large">
          <div className="card-head">
            <div>
              <h3>Xu hướng lịch hẹn theo ngày</h3>
              <p>Khối lượng đặt hẹn trong {range} ngày gần nhất</p>
            </div>
          </div>
          <MiniLineChart points={report?.dailyTrend} />
          <div className="axis">
            {report?.dailyTrend && report.dailyTrend.length > 0 ? (
              report.dailyTrend.slice(-6).map((pt) => <span key={pt.d}>{pt.d}</span>)
            ) : (
              <span>Đang tải...</span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Trạng thái lịch hẹn trong kỳ</h3>
              <p>Tỷ lệ giải quyết ca khám</p>
            </div>
          </div>
          <Donut
            center={metrics.appointmentsInPeriod.toString()}
            parts={[
              { label: "Hoàn thành", value: metrics.completed, color: "#286A9B" },
              { label: "Chờ xử lý", value: metrics.pending, color: "#E9A23B" },
              { label: "Đã hủy", value: metrics.cancelled, color: "#DF6B68" },
            ]}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-head">
          <div>
            <h3>Top 5 bác sĩ có nhiều ca khám nhất</h3>
            <p>Xếp hạng hiệu suất phục vụ bệnh nhân trong kỳ</p>
          </div>
        </div>
        <BarChart doctors={report?.topDoctors} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// SettingsPage
// --------------------------------------------------------------------------

function SettingsPage({
  adminProfile,
  onUpdateProfile,
  notify,
}: {
  adminProfile: AdminProfile;
  onUpdateProfile: (payload: { name: string; email: string; phone: string }) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState<"account" | "notifications" | "ui">("account");
  const [name, setName] = useState(adminProfile.name);
  const [email, setEmail] = useState(adminProfile.email);
  const [phone, setPhone] = useState(adminProfile.phone);
  const [theme, setTheme] = useState("Sáng");
  const [notifyAppt, setNotifyAppt] = useState(true);
  const [notifyReport, setNotifyReport] = useState(true);

  // Change password modal
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await onUpdateProfile({ name, email, phone });
    } catch (err: any) {
      notify(err.message || "Lỗi lưu thông tin hồ sơ.");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw) {
      setPwError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPw.length < 10) {
      setPwError("Mật khẩu mới phải từ 10 ký tự trở lên.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPwLoading(true);
    setPwError("");
    try {
      await api.changeAdminPassword({
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmPw,
      });
      notify("Đã đổi mật khẩu quản trị viên thành công!");
      setPwModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwError(err.message || "Không thể đổi mật khẩu.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Tùy chỉnh hệ thống"
        title="Cài đặt quản trị"
        description="Quản lý hồ sơ cá nhân quản trị viên, thông báo và cấu hình hệ thống."
      />

      <div className="settings-layout">
        <div className="settings-nav">
          <button className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}>
            <Icon name="settings" />
            Tài khoản
          </button>
          <button className={tab === "notifications" ? "active" : ""} onClick={() => setTab("notifications")}>
            <Icon name="bell" />
            Thông báo
          </button>
          <button className={tab === "ui" ? "active" : ""} onClick={() => setTab("ui")}>
            <Icon name="grid" />
            Giao diện
          </button>
        </div>

        <div className="settings-content">
          {tab === "account" && (
            <>
              <div className="card settings-section">
                <div className="card-head">
                  <div>
                    <h3>Hồ sơ quản trị</h3>
                    <p>Thông tin quản trị viên hiển thị trong hệ thống TiTiMi</p>
                  </div>
                </div>
                <div className="avatar-edit">
                  <Avatar name={name} size="lg" />
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = () => notify("Đã cập nhật ảnh đại diện quản trị");
                        input.click();
                      }}
                    >
                      Thay ảnh đại diện
                    </Button>
                    <small>JPG hoặc PNG, tối đa 2MB</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="span-2">
                    Họ và tên
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label>
                    Email
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label>
                    Số điện thoại
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label>
                    Vai trò
                    <Input value="System Administrator (ADMIN)" disabled />
                  </label>
                  <label>
                    Mã tài khoản
                    <Input value={adminProfile.id} disabled />
                  </label>
                </div>
                <div className="settings-save">
                  <Button onClick={handleSaveProfile}>Lưu thay đổi</Button>
                </div>
              </div>

              <div className="card settings-section">
                <div className="card-head">
                  <div>
                    <h3>Bảo mật & Mật khẩu</h3>
                    <p>Cập nhật mật khẩu bảo vệ tài khoản quản trị</p>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <b>Đổi mật khẩu quản trị</b>
                    <p>Được mã hóa PBKDF2:SHA256 với 600.000 vòng lặp bảo mật cao trong MySQL</p>
                  </div>
                  <Button variant="secondary" onClick={() => setPwModal(true)}>
                    Đổi mật khẩu
                  </Button>
                </div>
              </div>
            </>
          )}

          {tab === "notifications" && (
            <div className="card settings-section">
              <div className="card-head">
                <div>
                  <h3>Cài đặt thông báo</h3>
                  <p>Tùy chọn nhận cảnh báo và tổng kết hoạt động phòng khám</p>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <b>Thông báo lịch hẹn mới</b>
                  <p>Nhận thông báo khi bệnh nhân đặt lịch hẹn hoặc hủy lịch</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifyAppt}
                    onChange={(e) => {
                      setNotifyAppt(e.target.checked);
                      notify(e.target.checked ? "Đã bật thông báo lịch hẹn" : "Đã tắt thông báo lịch hẹn");
                    }}
                  />
                  <span />
                </label>
              </div>
              <div className="setting-row">
                <div>
                  <b>Báo cáo tổng kết tuần</b>
                  <p>Nhận bản tổng hợp số liệu vào mỗi sáng Thứ Hai</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notifyReport}
                    onChange={(e) => {
                      setNotifyReport(e.target.checked);
                      notify(e.target.checked ? "Đã bật báo cáo tuần" : "Đã tắt báo cáo tuần");
                    }}
                  />
                  <span />
                </label>
              </div>
            </div>
          )}

          {tab === "ui" && (
            <div className="card settings-section">
              <div className="card-head">
                <div>
                  <h3>Giao diện & Hệ thống</h3>
                  <p>Tùy chọn hiển thị và thông tin kết nối</p>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <b>Chế độ hiển thị</b>
                  <p>Sử dụng giao diện chuẩn TiTiMi Healthcare Portal</p>
                </div>
                <Select
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    notify(`Đã chuyển sang chế độ hiển thị: ${e.target.value}`);
                  }}
                >
                  <option>Sáng</option>
                  <option>Tự động</option>
                </Select>
              </div>
              <div className="system-info">
                <div>
                  <small>Ứng dụng</small>
                  <b>TiTiMi Healthcare Admin Portal</b>
                </div>
                <div>
                  <small>Cơ sở dữ liệu</small>
                  <b>MySQL 8.4 (healthcare_clinic_portal)</b>
                </div>
                <div>
                  <small>Phiên bản</small>
                  <b>v2.5.0 (Sản xuất)</b>
                </div>
                <div>
                  <small>Quy tắc mã hóa ID</small>
                  <b>Tuần tự (Sequential ID Generation)</b>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {pwModal && (
        <Modal title="Đổi mật khẩu quản trị viên" onClose={() => setPwModal(false)}>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-grid one">
              <label>
                Mật khẩu hiện tại *
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </label>
              <label>
                Mật khẩu mới (tối thiểu 10 ký tự) *
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </label>
              <label>
                Xác nhận mật khẩu mới *
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </label>
            </div>
            {pwError && <p style={{ color: "red", marginTop: "0.5rem" }}>{pwError}</p>}
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => setPwModal(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Sidebar & Header
// --------------------------------------------------------------------------

function Sidebar({
  page,
  setPage,
  open,
  setOpen,
  adminProfile,
  onLogout,
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  adminProfile: AdminProfile;
  onLogout: () => void;
}) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src={titimiHatLogo} alt="TiTiMi" />
          </div>
          <div>
            <b>TiTiMi</b>
            <small>ADMIN PORTAL</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.page}
              className={page === n.page ? "active" : ""}
              onClick={() => {
                setPage(n.page);
                setOpen(false);
              }}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {page === n.page && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-profile">
          <Avatar name={adminProfile.name} />
          <div>
            <b>{adminProfile.name}</b>
            <small>{adminProfile.role}</small>
          </div>
          <button onClick={() => setPage("settings")}>
            <Icon name="settings" size={17} />
          </button>
        </div>
        <button className="logout" onClick={onLogout}>
          <Icon name="logout" size={18} />
          Đăng xuất
        </button>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}

function Header({
  page,
  onMenu,
  globalSearch,
  setGlobalSearch,
  adminProfile,
  onLogout,
  onNavigate,
  notify,
}: {
  page: Page;
  onMenu: () => void;
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  adminProfile: AdminProfile;
  onLogout: () => void;
  onNavigate: (p: Page) => void;
  notify: (s: string) => void;
}) {
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const title = NAV.find((n) => n.page === page)?.label;

  const todayFormatted = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  }, []);

  return (
    <header>
      <div className="header-title">
        <button className="menu-btn" onClick={onMenu}>
          <Icon name="menu" />
        </button>
        <div>
          <small>TiTiMi / {title}</small>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-actions">
        <div className="global-search">
          <SearchBar
            value={globalSearch}
            onChange={setGlobalSearch}
            placeholder="Tìm kiếm bác sĩ, bệnh nhân, lịch hẹn..."
          />
        </div>
        <span className="date">
          <Icon name="calendar" size={16} />
          {todayFormatted}
        </span>
        <div className="popover-wrap">
          <button
            className="header-icon"
            onClick={() => {
              setNotifications(!notifications);
              setProfile(false);
            }}
          >
            <Icon name="bell" />
            {unreadCount > 0 && <i />}
          </button>
          {notifications && (
            <div className="popover notifications">
              <div>
                <b>Thông báo</b>
                <button
                  onClick={() => {
                    setUnreadCount(0);
                    notify("Đã đánh dấu tất cả thông báo là đã đọc");
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              </div>
              {[
                ["Lịch hẹn mới", "Hệ thống vừa tiếp nhận lịch khám mới", "appointments"],
                ["Hồ sơ bác sĩ", "Bác sĩ đã cập nhật lịch làm việc", "doctors"],
                ["Báo cáo định kỳ", "Báo cáo thống kê đã sẵn sàng", "reports"],
              ].map((x) => (
                <button
                  key={x[0]}
                  onClick={() => {
                    onNavigate(x[2] as Page);
                    setNotifications(false);
                  }}
                >
                  <span />
                  <div>
                    <b>{x[0]}</b>
                    <small>{x[1]}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="popover-wrap">
          <button
            className="profile-trigger"
            onClick={() => {
              setProfile(!profile);
              setNotifications(false);
            }}
          >
            <Avatar name={adminProfile.name} size="sm" />
            <div>
              <b>{adminProfile.name.split(" ").slice(-1)[0]}</b>
              <small>Quản trị viên</small>
            </div>
            <span>⌄</span>
          </button>
          {profile && (
            <div className="popover profile-menu">
              <button
                onClick={() => {
                  onNavigate("settings");
                  setProfile(false);
                }}
              >
                <Icon name="users" />
                Hồ sơ cá nhân
              </button>
              <button
                onClick={() => {
                  onNavigate("settings");
                  setProfile(false);
                }}
              >
                <Icon name="settings" />
                Cài đặt tài khoản
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

// --------------------------------------------------------------------------
// Root App Component
// --------------------------------------------------------------------------

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedApptDetail, setSelectedApptDetail] = useState<Appointment>();

  // Live Database State
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    id: "USER-ADM-001",
    username: "admin",
    name: "Quản trị viên TiTiMi",
    email: "admin@titimi.vn",
    phone: "0902345678",
    role: "Admin",
  });
  const [counts, setCounts] = useState<Counts>({
    totalUsers: 0,
    doctors: 0,
    patients: 0,
    appointments: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    scheduledAppointments: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [charts, setCharts] = useState<api.ChartData>({
    dailyTrend: [],
    topDoctors: [],
  });

  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 2800);
  };

  // Initial Data Load
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.fetchPortalData();
      setAdminProfile(data.admin);
      setCounts(data.counts);
      setUsers(data.users);
      setDoctors(data.doctors);
      setPatients(data.patients);
      setSpecialties(data.specialties);
      setAppointments(data.appointments);
      setSchedules(data.schedules);
      setCharts(data.charts);
    } catch (err: any) {
      notify(err.message || "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CRUD Operations Handlers
  const handleAddUser = async (payload: any) => {
    const res = await api.createUser(payload);
    setUsers((curr) => [res.user, ...curr]);
    setCounts((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
    notify(res.message || "Đã tạo tài khoản người dùng thành công.");
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === "Hoạt động" ? "Tạm khóa" : "Hoạt động";
    const res = await api.toggleUserStatus(user.id, newStatus);
    setUsers((curr) => curr.map((u) => (u.id === user.id ? { ...u, status: res.status } : u)));
    notify(`Đã cập nhật trạng thái ${user.name} thành ${res.status}.`);
  };

  const handleAddDoctor = async (payload: any) => {
    const res = await api.createDoctor(payload);
    setDoctors((curr) => [...curr, res.doctor]);
    setCounts((prev) => ({ ...prev, doctors: prev.doctors + 1, totalUsers: prev.totalUsers + 1 }));
    notify(res.message || "Đã thêm bác sĩ mới thành công.");
  };

  const handleUpdateDoctor = async (doctorId: string, payload: any) => {
    const res = await api.updateDoctor(doctorId, payload);
    setDoctors((curr) =>
      curr.map((d) => (d.id === doctorId ? { ...d, ...payload } : d)),
    );
    notify(res.message || "Đã cập nhật thông tin bác sĩ.");
  };

  const handleAddPatient = async (payload: any) => {
    const res = await api.createPatient(payload);
    setPatients((curr) => [...curr, res.patient]);
    setCounts((prev) => ({ ...prev, patients: prev.patients + 1, totalUsers: prev.totalUsers + 1 }));
    notify(res.message || "Đã tạo hồ sơ bệnh nhân thành công.");
  };

  const handleUpdatePatient = async (patientId: string, payload: any) => {
    const res = await api.updatePatient(patientId, payload);
    setPatients((curr) =>
      curr.map((p) => (p.id === patientId ? { ...p, ...payload } : p)),
    );
    notify(res.message || "Đã cập nhật hồ sơ bệnh nhân.");
  };

  const handleAddSpecialty = async (payload: { name: string; description: string }) => {
    const res = await api.createSpecialty(payload);
    setSpecialties((curr) => [...curr, res.specialty]);
    notify(res.message || "Đã thêm chuyên khoa mới thành công.");
  };

  const handleUpdateSpecialty = async (specialtyId: string, payload: { name: string; description: string }) => {
    const res = await api.updateSpecialty(specialtyId, payload);
    setSpecialties((curr) =>
      curr.map((s) => (s.id === specialtyId ? { ...s, ...payload } : s)),
    );
    notify(res.message || "Đã cập nhật chuyên khoa.");
  };

  const handleCreateAppointment = async (payload: any) => {
    const res = await api.createAppointment(payload);
    // Find patient and doctor names
    const pat = patients.find((p) => p.id === payload.patientId);
    const doc = doctors.find((d) => d.id === payload.doctorId);
    const newAppt: Appointment = {
      id: res.appointment.id,
      patient: pat ? pat.name : "Bệnh nhân mới",
      patientId: payload.patientId,
      doctor: doc ? doc.name : "Bác sĩ TiTiMi",
      doctorId: payload.doctorId,
      specialty: doc ? doc.specialty : "Đa khoa",
      date: res.appointment.date,
      time: res.appointment.time,
      reason: payload.reason || "Khám sức khỏe tổng quát",
      visitType: payload.visitType || "Khám trực tiếp",
      status: "Đã xác nhận",
      fee: 250000,
    };
    setAppointments((curr) => [newAppt, ...curr]);
    setCounts((prev) => ({
      ...prev,
      appointments: prev.appointments + 1,
      scheduledAppointments: prev.scheduledAppointments + 1,
    }));
    notify(`Đã tạo lịch hẹn ${res.appointment.id} thành công.`);
  };

  const handleAppointmentStatusChange = async (appointmentId: string, targetStatus: string) => {
    const res = await api.updateAppointmentStatus(appointmentId, targetStatus);
    setAppointments((curr) =>
      curr.map((a) => (a.id === appointmentId ? { ...a, status: res.status as any } : a)),
    );
    if (res.status === "Hoàn thành") {
      setCounts((prev) => ({ ...prev, completedAppointments: prev.completedAppointments + 1 }));
    }
    notify(`Đã cập nhật trạng thái lịch hẹn ${appointmentId} thành ${res.status}.`);
  };

  const handleRescheduleAppointment = async (appointmentId: string, payload: any) => {
    const res = await api.rescheduleAppointment(appointmentId, payload);
    setAppointments((curr) =>
      curr.map((a) => (a.id === appointmentId ? { ...a, date: res.date, time: res.time } : a)),
    );
    notify(`Đã dời lịch hẹn ${appointmentId} sang ${res.date} lúc ${res.time}.`);
  };

  const handleAddSchedule = async (payload: any) => {
    const res = await api.createSchedule(payload);
    setSchedules((curr) => [res.schedule, ...curr]);
    notify(res.message || "Đã thêm ca trực làm việc thành công.");
  };

  const handleToggleScheduleStatus = async (scheduleId: string, targetStatus: string) => {
    const res = await api.updateScheduleStatus(scheduleId, targetStatus);
    setSchedules((curr) =>
      curr.map((s) => (s.id === scheduleId ? { ...s, status: res.status } : s)),
    );
    notify(`Đã cập nhật trạng thái ca trực thành ${res.status}.`);
  };

  const handleUpdateAdminProfile = async (payload: { name: string; email: string; phone: string }) => {
    const res = await api.updateAdminProfile(payload);
    setAdminProfile(res.admin);
    notify("Đã lưu thông tin hồ sơ quản trị viên.");
  };

  const handleLogout = async () => {
    try {
      await api.logoutAdmin();
    } catch {
      window.location.assign("/auth/login");
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ display: "inline-block", width: "36px", height: "36px", border: "4px solid #e2e8f0", borderTopColor: "#286A9B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: "1rem", color: "#64748b" }}>Đang đồng bộ dữ liệu quản trị từ MySQL...</p>
        </div>
      );
    }

    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            counts={counts}
            appointments={appointments}
            charts={charts}
            setPage={setPage}
            onViewAppointment={setSelectedApptDetail}
          />
        );
      case "users":
        return (
          <UsersPage
            users={users}
            onAddUser={handleAddUser}
            onToggleStatus={handleToggleUserStatus}
          />
        );
      case "doctors":
        return (
          <DoctorsPage
            doctors={doctors}
            specialties={specialties}
            onAddDoctor={handleAddDoctor}
            onUpdateDoctor={handleUpdateDoctor}
            onToggleStatus={async (userId, st) => {
              const res = await api.toggleUserStatus(userId, st);
              setDoctors((curr) =>
                curr.map((d) => (d.userId === userId ? { ...d, status: res.status } : d)),
              );
              notify(`Đã cập nhật trạng thái tài khoản bác sĩ thành ${res.status}.`);
            }}
          />
        );
      case "patients":
        return (
          <PatientsPage
            patients={patients}
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
            onToggleStatus={async (userId, st) => {
              const res = await api.toggleUserStatus(userId, st);
              setPatients((curr) =>
                curr.map((p) => (p.userId === userId ? { ...p, status: res.status } : p)),
              );
              notify(`Đã cập nhật trạng thái tài khoản bệnh nhân thành ${res.status}.`);
            }}
          />
        );
      case "specialties":
        return (
          <SpecialtiesPage
            items={specialties}
            doctors={doctors}
            onAddSpecialty={handleAddSpecialty}
            onUpdateSpecialty={handleUpdateSpecialty}
            onSelectDoctor={() => setPage("doctors")}
          />
        );
      case "appointments":
        return (
          <AppointmentsPage
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            specialties={specialties}
            onCreate={handleCreateAppointment}
            onStatusChange={handleAppointmentStatusChange}
            onReschedule={handleRescheduleAppointment}
            notify={notify}
          />
        );
      case "schedule":
        return (
          <SchedulePage
            schedules={schedules}
            appointments={appointments}
            doctors={doctors}
            specialties={specialties}
            onAddSchedule={handleAddSchedule}
            onToggleStatus={handleToggleScheduleStatus}
            onViewAppointment={setSelectedApptDetail}
          />
        );
      case "reports":
        return <ReportsPage notify={notify} />;
      case "settings":
        return (
          <SettingsPage
            adminProfile={adminProfile}
            onUpdateProfile={handleUpdateAdminProfile}
            notify={notify}
          />
        );
    }
  }, [page, loading, counts, users, doctors, patients, specialties, appointments, schedules, charts, adminProfile]);

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebar}
        setOpen={setSidebar}
        adminProfile={adminProfile}
        onLogout={handleLogout}
      />
      <main>
        <Header
          page={page}
          onMenu={() => setSidebar(true)}
          globalSearch={globalSearch}
          setGlobalSearch={(v) => {
            setGlobalSearch(v);
            if (v.length > 2) notify(`Tìm kiếm “${v}” trên toàn hệ thống`);
          }}
          adminProfile={adminProfile}
          onLogout={handleLogout}
          onNavigate={setPage}
          notify={notify}
        />
        <div className="content">{content}</div>
      </main>

      {selectedApptDetail && (
        <AppointmentDetail
          appointment={selectedApptDetail}
          onClose={() => setSelectedApptDetail(undefined)}
          onStatusChange={async (newSt) => {
            await handleAppointmentStatusChange(selectedApptDetail.id, newSt);
            setSelectedApptDetail((prev) => prev ? { ...prev, status: newSt as any } : undefined);
          }}
          onReschedule={() => {
            const current = selectedApptDetail;
            setSelectedApptDetail(undefined);
            setPage("appointments");
          }}
        />
      )}

      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
