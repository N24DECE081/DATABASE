import { useEffect, useMemo, useState } from "react";
import titimiHatLogo from "./assets/titimi-hat-logo.png";
import * as api from "./api";
import type {
  AdminConsultationDetail,
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
import {
  assistEmail,
  clinicTodayIso,
  filterValidSlots,
  isCompletedAppointmentStatus,
  maxDoctorDobIso,
  maxPatientDobIso,
  minDoctorDobIso,
  minPatientDobIso,
  normalizePhone,
  normalizeVietnameseName,
  validateDob,
  validateEmail,
  validatePersonName,
  validatePhone,
} from "../../shared/clinicRules";

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: "dashboard", label: "Dashboard", icon: "grid" },
  { page: "users", label: "Quản lý người dùng", icon: "users" },
  { page: "doctors", label: "Quản lý bác sĩ", icon: "doctor" },
  { page: "patients", label: "Quản lý bệnh nhân", icon: "heart" },
  { page: "specialties", label: "Chuyên khoa", icon: "briefcase" },
  { page: "medications", label: "Danh mục thuốc", icon: "pill" },
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
    pill: (
      <>
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </>
    ),
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
  style,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} type={type} disabled={disabled} style={style}>
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

function formatApptTime(a?: { time?: string; rawDateTime?: string } | null): string {
  if (!a) return "--:--";
  // 1. If a.time is a valid HH:mm format (e.g. "08:30", "13:00")
  if (a.time && /^\d{1,2}:\d{2}$/.test(a.time.trim())) {
    const [h, m] = a.time.trim().split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  // 2. Extract HH:mm from rawDateTime if available (e.g. "2026-11-18 08:30" or "2026-11-18T08:30:00")
  if (a.rawDateTime) {
    const match = a.rawDateTime.match(/(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
  }
  // 3. Fallback: if a.time has an hour like "08:November" or "08"
  if (a.time) {
    const hourMatch = a.time.match(/(\d{1,2})/);
    if (hourMatch) {
      return `${hourMatch[1].padStart(2, "0")}:00`;
    }
  }
  return "--:--";
}

function getAppointmentHour(a: { time?: string; rawDateTime?: string }): number {
  const formatted = formatApptTime(a);
  if (formatted !== "--:--") {
    const h = parseInt(formatted.split(":")[0], 10);
    if (!isNaN(h)) return h;
  }
  return -1;
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
      <div className="data-header-text">
        <span className="data-header-eyebrow">{eyebrow}</span>
        <h1 className="data-header-title">{title}</h1>
        <p className="data-header-desc">{description}</p>
      </div>
      {action && onAction && (
        <div className="data-header-action">
          <button type="button" className="data-header-btn" onClick={onAction}>
            <Icon name="plus" size={17} />
            <span>{action}</span>
          </button>
        </div>
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
            ["pill", "Danh mục thuốc", "medications"],
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
                <small>{a.date} lúc {formatApptTime(a)} · {a.specialty} ({a.reason})</small>
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
    const cleanName = normalizeVietnameseName(name);
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = assistEmail(email);
    const nameErr = validatePersonName(cleanName, "Họ và tên");
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = validateEmail(cleanEmail, "Email", true);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const phoneErr = validatePhone(cleanPhone, "Số điện thoại");
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (!initial && (!username.trim() || password.length < 10 || password.length > 128)) {
      setError("Tên đăng nhập và mật khẩu (từ 10 đến 128 ký tự) là bắt buộc khi tạo tài khoản mới.");
      return;
    }
    setEmail(cleanEmail);
    setPhone(cleanPhone);
    setName(cleanName);
    onSave({ name: cleanName, email: cleanEmail, phone: cleanPhone, role, status, username: username.trim(), password });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="span-2">
          Họ và tên *
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(normalizeVietnameseName(name))}
            placeholder="Nguyễn Văn A"
            required
          />
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
                placeholder="Từ 10 đến 128 ký tự"
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
            onBlur={() => setEmail(assistEmail(email))}
            placeholder="ten@gmail.com"
          />
        </label>
        <label>
          Số điện thoại *
          <Input
            value={phone}
            maxLength={15}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone(normalizePhone(phone))}
            placeholder="0901234567"
            required
          />
        </label>
        <label>
          Vai trò
          <Select value={role} disabled={Boolean(initial)} onChange={(e) => setRole(e.target.value as User["role"])}>
            {initial?.role === "Admin" && <option>Admin</option>}
            <option>Bác sĩ</option>
            <option>Bệnh nhân</option>
          </Select>
          {initial && (
            <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>
              🔒 Vai trò tài khoản gắn với hồ sơ không thể thay đổi (BR3–4).
            </small>
          )}
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
  specialties,
  onAddDoctor,
  onAddPatient,
}: {
  users: User[];
  onAddUser: (payload: any) => Promise<void>;
  onToggleStatus: (user: User) => Promise<void>;
  specialties: Specialty[];
  onAddDoctor: (payload: any) => Promise<void>;
  onAddPatient: (payload: any) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [modal, setModal] = useState<"choice" | "doctor" | "patient" | "confirm" | null>(null);
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
        onAction={() => setModal("choice")}
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
                <th style={{ minWidth: "120px" }}>Thao tác</th>
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
                  <td style={{ minWidth: "120px", whiteSpace: "nowrap" }}>
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

      {modal === "choice" && (
        <Modal title="Thêm người dùng mới vào hệ thống" onClose={() => setModal(null)}>
          <div style={{ padding: "0.5rem 0" }}>
            <p style={{ color: "#475569", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
              Vui lòng chọn vai trò người dùng cần thêm để khởi tạo đồng bộ tài khoản truy cập và hồ sơ chuyên môn tương ứng:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div
                style={{
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  cursor: "pointer",
                  background: "#f8fafc",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onClick={() => setModal("doctor")}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
                  <Icon name="doctor" size={24} />
                </div>
                <b style={{ color: "#0f172a", fontSize: "1rem" }}>Bác sĩ (Doctor)</b>
                <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.35rem" }}>
                  Khởi tạo tài khoản bác sĩ kèm chuyên khoa, chứng chỉ hành nghề và hồ sơ chuyên môn.
                </span>
                <Button variant="primary" style={{ marginTop: "1rem", width: "100%" }}>
                  Thêm Bác sĩ
                </Button>
              </div>

              <div
                style={{
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  cursor: "pointer",
                  background: "#f8fafc",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
                onClick={() => setModal("patient")}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce7f3", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
                  <Icon name="heart" size={24} />
                </div>
                <b style={{ color: "#0f172a", fontSize: "1rem" }}>Bệnh nhân (Patient)</b>
                <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.35rem" }}>
                  Đăng ký tài khoản người bệnh kèm thông tin cá nhân, liên hệ khẩn cấp và tiền sử y tế.
                </span>
                <Button variant="primary" style={{ marginTop: "1rem", width: "100%" }}>
                  Thêm Bệnh nhân
                </Button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "doctor" && (
        <Modal title="Thêm bác sĩ mới (Tạo tài khoản & Hồ sơ)" onClose={() => setModal(null)}>
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

      {modal === "patient" && (
        <Modal title="Thêm bệnh nhân mới (Tạo tài khoản & Hồ sơ)" onClose={() => setModal(null)}>
          <PatientForm
            onSave={async (payload) => {
              await onAddPatient(payload);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
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
  }) => Promise<void> | void;
  onClose: () => void;
}) {
  const isGP = Boolean(initial && (initial.subtype === "GENERAL_PRACTITIONER" || initial.specialty === "Đa khoa"));
  const isSpecialist = Boolean(initial && !isGP);
  const [name, setName] = useState(initial?.name || "");
  const [specialty, setSpecialty] = useState(
    initial?.specialty || (specialties[0]?.name ? specialties[0]?.name : "Đa khoa")
  );
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber || "");
  const [gender, setGender] = useState(initial?.gender || "Nam");
  const [dob, setDob] = useState(
    initial?.rawDob || (initial?.dob && initial.dob.includes("/") ? initial.dob.split("/").reverse().join("-") : "")
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeVietnameseName(name);
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = assistEmail(email);
    const nameErr = validatePersonName(cleanName, "Họ và tên bác sĩ");
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = validateEmail(cleanEmail, "Email bác sĩ", true);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const phoneErr = initial && cleanPhone === initial.phone
      ? null
      : validatePhone(cleanPhone, "Số điện thoại bác sĩ");
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (password && (password.length < 8 || password.length > 128)) {
      setError("Mật khẩu phải từ 8 đến 128 ký tự.");
      return;
    }
    if (!initial) {
      const dobErr = validateDob(dob, {
        required: true,
        minAge: 22,
        maxAge: 80,
        field: "Ngày sinh bác sĩ",
      });
      if (dobErr) {
        setError(dobErr);
        return;
      }
    }
    setName(cleanName);
    setEmail(cleanEmail);
    setPhone(cleanPhone);
    setError("");
    setSaving(true);
    try {
      await onSave({
        name: cleanName,
        specialty: isGP ? "Đa khoa" : specialty,
        email: cleanEmail,
        phone: cleanPhone,
        licenseNumber: licenseNumber.trim(),
        gender,
        dob,
        username: username.trim(),
        password,
      });
    } catch (err: any) {
      setError(err?.message || "Không thể lưu thông tin bác sĩ. Vui lòng kiểm tra lại dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="span-2">
          Họ và tên bác sĩ *
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(normalizeVietnameseName(name))}
            placeholder="BS. Nguyễn Văn A"
          />
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
                placeholder="Tối thiểu 8 ký tự (Mặc định: DoctorPassword123@)"
              />
            </label>
          </>
        )}
        <label>
          Chuyên khoa *
          {isGP ? (
            <div>
              <Select value="Đa khoa" disabled>
                <option value="Đa khoa">Đa khoa</option>
              </Select>
              <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>
                🔒 Bác sĩ Đa khoa (GP) cố định phân loại theo quy tắc toàn vẹn cơ sở dữ liệu.
              </small>
            </div>
          ) : isSpecialist ? (
            <div>
              <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                {specialties.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </Select>
              <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem" }}>
                Bác sĩ Chuyên khoa có thể chuyển đổi giữa các chuyên khoa chuyên môn.
              </small>
            </div>
          ) : (
            <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="Đa khoa">Đa khoa (General Practitioner)</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </Select>
          )}
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
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmail(assistEmail(email))}
            placeholder="bacsi@gmail.com"
          />
        </label>
        <label>
          Số điện thoại *
          <Input
            required
            maxLength={15}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone(normalizePhone(phone))}
            placeholder="0901234567"
          />
        </label>
        <label>
          Số giấy phép hành nghề
          <Input maxLength={50} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="GP-2024-001" />
        </label>
        <label>
          Ngày sinh {initial ? "" : "*"}
          <Input
            type="date"
            min={minDoctorDobIso()}
            max={maxDoctorDobIso()}
            required={!initial}
            disabled={Boolean(initial)}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu thông tin"}
        </Button>
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
                <th style={{ minWidth: "160px" }}>Thao tác</th>
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
                  <td style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Xem hồ sơ"
                        onClick={() => {
                          setSelected(d);
                          setModal("detail");
                        }}
                      >
                        <Icon name="eye" size={17} />
                      </button>
                      <button
                        className="icon-btn"
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
  onSave: (payload: any) => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState(initial?.gender || "Nam");
  const [dob, setDob] = useState(
    initial?.rawDob || (initial?.dob && initial.dob.includes("/") ? initial.dob.split("/").reverse().join("-") : "1995-01-01")
  );
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [bloodType, setBloodType] = useState(initial?.bloodType || "");
  const [allergies, setAllergies] = useState(initial?.allergies || "Không");
  const [chronicDiseases, setChronicDiseases] = useState(initial?.chronicDiseases || "Không");
  const [emergencyName, setEmergencyName] = useState(initial?.emergencyContactName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initial?.emergencyContactPhone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeVietnameseName(name);
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = assistEmail(email);
    const cleanEmName = normalizeVietnameseName(emergencyName);
    const cleanEmPhone = normalizePhone(emergencyPhone);

    const nameErr = validatePersonName(cleanName, "Họ và tên bệnh nhân");
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const dobErr = validateDob(dob, { required: true, minAge: 0, maxAge: 130, field: "Ngày sinh bệnh nhân" });
    if (dobErr) {
      setError(dobErr);
      return;
    }
    const phoneErr = initial && cleanPhone === initial.phone
      ? null
      : validatePhone(cleanPhone, "Số điện thoại bệnh nhân");
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    const emailErr = validateEmail(cleanEmail, "Email", false);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (cleanEmName) {
      const emNameErr = validatePersonName(cleanEmName, "Người liên hệ khẩn cấp", false);
      if (emNameErr) {
        setError(emNameErr);
        return;
      }
    }
    if (cleanEmPhone) {
      const emPhoneErr = validatePhone(cleanEmPhone, "Số điện thoại khẩn cấp", false);
      if (emPhoneErr) {
        setError(emPhoneErr);
        return;
      }
    }

    if (!initial) {
      if (password && (password.length < 8 || password.length > 128)) {
        setError("Mật khẩu phải từ 8 đến 128 ký tự.");
        return;
      }
      if (password && password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
    }
    setName(cleanName);
    setEmail(cleanEmail);
    setPhone(cleanPhone);
    setEmergencyName(cleanEmName);
    setEmergencyPhone(cleanEmPhone);
    setError("");
    setSaving(true);
    try {
      await onSave({
        name: cleanName,
        username: username.trim() || undefined,
        password: password || undefined,
        confirmPassword: confirmPassword || undefined,
        gender,
        dob,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        address: address.trim(),
        bloodType,
        allergies: allergies.trim(),
        chronicDiseases: chronicDiseases.trim(),
        emergencyContactName: cleanEmName,
        emergencyContactPhone: cleanEmPhone,
      });
    } catch (err: any) {
      setError(err?.message || "Không thể lưu thông tin bệnh nhân. Vui lòng kiểm tra lại dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {!initial && (
          <>
            <div className="span-2" style={{ borderBottom: "1.5px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.25rem" }}>
              <b style={{ color: "#1e293b", fontSize: "0.95rem" }}>1. Tài khoản đăng nhập bệnh nhân</b>
            </div>
            <label className="span-2">
              Tên đăng nhập
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: nguyen_van_b (tùy chọn, để trống sẽ tạo tự động)"
              />
            </label>
            <label>
              Mật khẩu tạm thời
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự (Mặc định: PatientPassword123@)"
              />
            </label>
            <label>
              Xác nhận mật khẩu
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
            </label>
            <div className="span-2" style={{ borderBottom: "1.5px solid #e2e8f0", paddingBottom: "0.35rem", margin: "0.5rem 0 0.25rem 0" }}>
              <b style={{ color: "#1e293b", fontSize: "0.95rem" }}>2. Thông tin cá nhân & Liên hệ</b>
            </div>
          </>
        )}
        <label className="span-2">
          Họ và tên bệnh nhân *
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(normalizeVietnameseName(name))}
            placeholder="Nguyễn Văn A"
          />
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
          Ngày sinh *
          <Input
            type="date"
            min={minPatientDobIso()}
            max={maxPatientDobIso()}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />
        </label>
        <label>
          Số điện thoại *
          <Input
            required
            maxLength={15}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone(normalizePhone(phone))}
            placeholder="0901234567"
          />
        </label>
        <label>
          Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmail(assistEmail(email))}
            placeholder="benhnhan@gmail.com"
          />
        </label>
        <label className="span-2">
          Địa chỉ
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
        </label>
        {!initial && (
          <div className="span-2" style={{ borderBottom: "1.5px solid #e2e8f0", paddingBottom: "0.35rem", margin: "0.5rem 0 0.25rem 0" }}>
            <b style={{ color: "#1e293b", fontSize: "0.95rem" }}>3. Người liên hệ khẩn cấp & Thông tin y tế</b>
          </div>
        )}
        <label>
          Người liên hệ khẩn cấp
          <Input
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            onBlur={() => setEmergencyName(normalizeVietnameseName(emergencyName))}
            placeholder="Họ tên người thân"
          />
        </label>
        <label>
          Số điện thoại khẩn cấp
          <Input
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            onBlur={() => setEmergencyPhone(normalizePhone(emergencyPhone))}
            placeholder="091 234 5678"
          />
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
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu thông tin"}
        </Button>
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
                <th style={{ minWidth: "160px" }}>Thao tác</th>
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
                  <td style={{ minWidth: "160px", whiteSpace: "nowrap" }}>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Xem hồ sơ"
                        onClick={() => {
                          setSelected(p);
                          setModal("detail");
                        }}
                      >
                        <Icon name="eye" size={17} />
                      </button>
                      <button
                        className="icon-btn"
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
    const cleanName = normalizeVietnameseName(name);
    if (!cleanName) {
      setError("Tên chuyên khoa không được để trống.");
      return;
    }
    onSave({ name: cleanName, description: description.trim() });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid one">
        <label>
          Tên chuyên khoa *
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(normalizeVietnameseName(name))}
            placeholder="Tai Mũi Họng, Răng Hàm Mặt..."
          />
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
                <th style={{ minWidth: "120px" }}>Thao tác</th>
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
                  <td style={{ minWidth: "120px", whiteSpace: "nowrap" }}>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Xem danh sách bác sĩ"
                        onClick={() => {
                          setSelected(s);
                          setModal("doctors");
                        }}
                      >
                        <Icon name="users" size={17} />
                      </button>
                      <button
                        className="icon-btn"
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
// MedicationForm & MedicationsPage (Table 3.11 & BR46–BR50)
// --------------------------------------------------------------------------

function MedicationForm({
  onSave,
  onClose,
}: {
  onSave: (payload: { name: string; description: string }) => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeVietnameseName(name);
    if (!cleanName) {
      setError("Vui lòng nhập tên thuốc / biệt dược.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ name: cleanName, description: description.trim() });
    } catch (err: any) {
      setError(err?.message || "Không thể lưu thông tin thuốc.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid one">
        <label>
          Tên thuốc / Biệt dược & Hàm lượng *
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(normalizeVietnameseName(name))}
            placeholder="Ví dụ: Paracetamol 500 mg, Amoxicillin 500 mg..."
          />
        </label>
        <label>
          Mô tả / Thông tin dược lý & Hướng dẫn sử dụng
          <textarea
            className="field"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Chỉ định, chống chỉ định, dạng bào chế và hướng dẫn bảo quản..."
          />
        </label>
      </div>
      {error && <p className="form-error" style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
      <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Thêm thuốc"}
        </Button>
      </div>
    </form>
  );
}

function MedicationsPage({
  medications,
  onAddMedication,
}: {
  medications: api.Medication[];
  onAddMedication: (payload: { name: string; description: string }) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.id.toLowerCase().includes(q.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(q.toLowerCase()))
    );
  }, [medications, q]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <div className="page-stack">
      <DataPageHeader
        eyebrow="Danh mục dược phẩm chuẩn hóa (Table 3.11 & BR46–BR50)"
        title="Danh mục thuốc"
        description="Quản lý danh mục biệt dược, hoạt chất và thông tin hướng dẫn sử dụng trong phòng khám."
        action="Thêm thuốc mới"
        onAction={() => setAdding(true)}
      />

      <div className="stat-grid three">
        <StatCard
          label="Tổng số thuốc"
          value={medications.length.toLocaleString("vi-VN")}
          detail="Thuốc trong danh mục CSDL"
          icon="pill"
        />
        <StatCard
          label="Đang lưu hành"
          value={medications.filter((m) => m.status === "Hoạt động").length.toLocaleString("vi-VN")}
          detail="Khả dụng để kê đơn"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Đạt chuẩn DDL"
          value="100%"
          detail="Chuẩn hóa PK MedicationID & Unique Name"
          icon="shield"
          tone="blue"
        />
      </div>

      <div className="card table-card">
        <div className="toolbar">
          <SearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Tìm theo tên thuốc, biệt dược hoặc mã thuốc..."
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã thuốc</th>
                <th>Tên biệt dược / Hoạt chất</th>
                <th>Mô tả / Hướng dẫn chỉ định</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.id}</b></td>
                  <td>
                    <div className="person">
                      <div className="avatar-chip" style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 700 }}>
                        Rx
                      </div>
                      <b>{m.name}</b>
                    </div>
                  </td>
                  <td>{m.description || "Danh mục minh họa; không phải chỉ định điều trị."}</td>
                  <td><StatusBadge status={m.status || "Hoạt động"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pagedList.length && <EmptyState />}
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </div>

      {adding && (
        <Modal title="Thêm thuốc mới vào danh mục" onClose={() => setAdding(false)}>
          <MedicationForm
            onSave={async (payload) => {
              await onAddMedication(payload);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
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
  schedules,
  appointments,
  onClose,
  onConfirm,
}: {
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  schedules: Schedule[];
  appointments?: Appointment[];
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
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [followUpParentId, setFollowUpParentId] = useState("");
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

  const doctorDayShifts = useMemo(() => {
    if (!doctor || !date) return [];
    return schedules.filter(
      (s) => s.doctorId === doctor.id && s.date === date && (s.status === "Available" || s.status === "Khả dụng")
    );
  }, [schedules, doctor, date]);

  const [filteredSlots, setFilteredSlots] = useState<Array<{ starts_at: string; schedule_id: string }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const doctorId = doctor?.id;
  useEffect(() => {
    setFilteredSlots([]);
    setTime("");
    if (!doctorId || !date || date < clinicTodayIso()) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    api.fetchBookingSlots(doctorId, date, {
      signal: controller.signal,
      followUpFromApptId: isFollowUp && followUpParentId ? followUpParentId : undefined,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        const valid = filterValidSlots(res.slots || [], res.server_now);
        setFilteredSlots(valid);
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setFilteredSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => { controller.abort(); };
  }, [doctorId, date, isFollowUp, followUpParentId]);

  const selectedSlotObj = filteredSlots.find((s) => s.starts_at.slice(11, 16) === time);
  const canContinue =
    (step === 1 && Boolean(patient)) ||
    (step === 2 && Boolean(visitType)) ||
    (step === 3 && Boolean(specialty)) ||
    (step === 4 && Boolean(doctor)) ||
    (step === 5 && Boolean(date && date >= clinicTodayIso() && time && selectedSlotObj));

  const handleCreate = async () => {
    if (!patient || !doctor || !date || !selectedSlotObj) return;
    setSubmitting(true);
    setError("");
    try {
      if (isFollowUp && !followUpParentId) {
        setError("Vui lòng chọn ca khám gốc đã hoàn thành của bệnh nhân để đặt lịch tái khám.");
        return;
      }
      const dateTime = `${date} ${time}:00`;
      await onConfirm({
        patientId: patient.id,
        doctorId: doctor.id,
        scheduleId: selectedSlotObj.schedule_id,
        dateTime,
        duration: 30,
        visitType,
        reason: reason.trim() || (isFollowUp ? "Tái khám theo hẹn." : "Khám sức khỏe tổng quát"),
        followUpFromApptId: isFollowUp && followUpParentId ? followUpParentId : undefined,
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
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>Bước 1: Chọn bệnh nhân</h4>
            <SearchBar value={patientQuery} onChange={setPatientQuery} placeholder="Tìm tên, mã hoặc SĐT bệnh nhân..." />
            <div className="select-list" style={{ maxHeight: "260px", overflowY: "auto", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {patientResults.map((p) => {
                const initials = p.name.split(" ").filter(Boolean).slice(-2).map((w: string) => w[0]).join("").toUpperCase() || "BN";
                const isSelected = patient?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (patient?.id !== p.id) {
                        setIsFollowUp(false);
                        setFollowUpParentId("");
                      }
                      setPatient(p);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1rem",
                      border: "1.5px solid",
                      borderColor: isSelected ? "var(--primary)" : "#e2e8f0",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isSelected ? "#f0f7fc" : "#fff",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--primary)" : "var(--light-blue)",
                          color: isSelected ? "#fff" : "var(--navy)",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <b style={{ fontSize: "13.5px", color: "var(--text)" }}>{p.name}</b>
                          <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "4px", background: "#e2e8f0", color: "#334155", fontWeight: 600 }}>
                            {p.id}
                          </span>
                        </div>
                        <small style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", fontSize: "12px" }}>
                          <span>📞 {p.phone || "Chưa có SĐT"}</span>
                          {p.email && <span>· ✉️ {p.email}</span>}
                        </small>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: isSelected ? "var(--primary)" : "#cbd5e1",
                        background: isSelected ? "var(--primary)" : "transparent",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
              {!patientResults.length && (
                <p style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: "13px" }}>
                  Không tìm thấy bệnh nhân đang hoạt động phù hợp với từ khóa.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>Bước 2: Chọn hình thức khám</h4>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              {(["Khám trực tiếp", "Tư vấn trực tuyến"] as const).map((vt) => {
                const isSelected = visitType === vt;
                return (
                  <div
                    key={vt}
                    onClick={() => setVisitType(vt)}
                    style={{
                      flex: 1,
                      padding: "1.5rem",
                      border: "2px solid",
                      borderColor: isSelected ? "var(--primary)" : "#e2e8f0",
                      borderRadius: "12px",
                      cursor: "pointer",
                      background: isSelected ? "#f0f7fc" : "#fff",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: isSelected ? "var(--light-blue)" : "#f8fafc",
                        color: isSelected ? "var(--primary)" : "var(--muted)",
                        display: "grid",
                        placeItems: "center",
                        margin: "0 auto 0.75rem",
                      }}
                    >
                      <Icon name={vt === "Khám trực tiếp" ? "doctor" : "calendar"} size={26} />
                    </div>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{vt}</h4>
                    <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                      {vt === "Khám trực tiếp" ? "Khám trực tiếp tại TiTiMi Medical Centre" : "Tư vấn video call y tế từ xa bảo mật"}
                    </small>
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: isSelected ? "var(--primary)" : "#cbd5e1",
                        background: isSelected ? "var(--primary)" : "transparent",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>Bước 3: Chọn chuyên khoa</h4>
            <div className="grid-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
              <div
                onClick={() => {
                  if (specialty !== "Đa khoa") {
                    setDoctor(undefined);
                    setDate("");
                    setTime("");
                  }
                  setSpecialty("Đa khoa");
                }}
                style={{
                  padding: "1rem 1.2rem",
                  border: "1.5px solid",
                  borderColor: specialty === "Đa khoa" ? "var(--primary)" : "#e2e8f0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: specialty === "Đa khoa" ? "#f0f7fc" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <b style={{ fontSize: "13.5px", color: "var(--text)", display: "block" }}>Đa khoa</b>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>Khám sức khỏe ban đầu và chăm sóc tổng quát</p>
                </div>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: specialty === "Đa khoa" ? "var(--primary)" : "#cbd5e1",
                    background: specialty === "Đa khoa" ? "var(--primary)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {specialty === "Đa khoa" ? "✓" : ""}
                </div>
              </div>
              {specialties.map((s) => {
                const isSelected = specialty === s.name;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (specialty !== s.name) {
                        setDoctor(undefined);
                        setDate("");
                        setTime("");
                      }
                      setSpecialty(s.name);
                    }}
                    style={{
                      padding: "1rem 1.2rem",
                      border: "1.5px solid",
                      borderColor: isSelected ? "var(--primary)" : "#e2e8f0",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isSelected ? "#f0f7fc" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <b style={{ fontSize: "13.5px", color: "var(--text)", display: "block" }}>{s.name}</b>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>{s.description || "Chuyên khoa TiTiMi"}</p>
                    </div>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: isSelected ? "var(--primary)" : "#cbd5e1",
                        background: isSelected ? "var(--primary)" : "transparent",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>Bước 4: Chọn bác sĩ</h4>
            <SearchBar value={doctorQuery} onChange={setDoctorQuery} placeholder="Tìm tên bác sĩ..." />
            <div style={{ maxHeight: "260px", overflowY: "auto", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {doctorResults.map((d) => {
                const isSelected = doctor?.id === d.id;
                const initials = d.name.split(" ").filter(Boolean).slice(-2).map((w: string) => w[0]).join("").toUpperCase() || "BS";
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      if (doctor?.id !== d.id) {
                        setDate("");
                        setTime("");
                      }
                      setDoctor(d);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1rem",
                      border: "1.5px solid",
                      borderColor: isSelected ? "var(--primary)" : "#e2e8f0",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isSelected ? "#f0f7fc" : "#fff",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--primary)" : "var(--light-blue)",
                          color: isSelected ? "#fff" : "var(--navy)",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <b style={{ fontSize: "13.5px", color: "var(--text)" }}>{d.name}</b>
                          <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "4px", background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                            {d.specialty}
                          </span>
                        </div>
                        <small style={{ color: "var(--muted)", display: "block", marginTop: "2px", fontSize: "12px" }}>
                          📞 {d.phone || "Chưa có SĐT"} · ✉️ {d.email || "TiTiMi Medical"}
                        </small>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: isSelected ? "var(--primary)" : "#cbd5e1",
                        background: isSelected ? "var(--primary)" : "transparent",
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
              {!doctorResults.length && (
                <p style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: "13px" }}>
                  Không tìm thấy bác sĩ phù hợp trong chuyên khoa này.
                </p>
              )}
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
                  <Input
                    type="date"
                    min={clinicTodayIso()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime("");
                      setError("");
                    }}
                    style={{ marginTop: "0.5rem" }}
                  />
                </label>
                {date && date < clinicTodayIso() && (
                  <small style={{ color: "#b91c1c", display: "block", marginTop: "0.4rem" }}>
                    Không thể chọn ngày khám trong quá khứ.
                  </small>
                )}
                {date && doctor && date >= clinicTodayIso() && (
                  <div style={{ marginTop: "0.75rem" }}>
                    {doctorDayShifts.length > 0 ? (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#166534" }}>
                        ✓ Ca trực khả dụng: {doctorDayShifts.map((s) => `${s.startTime} - ${s.endTime}`).join(", ")}
                      </div>
                    ) : (
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#991b1b" }}>
                        ⚠️ Bác sĩ chưa có ca trực khả dụng vào ngày này. Vui lòng chọn ngày khác hoặc tạo ca trực trước trong tab Quản lý lịch làm việc.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <b>Khung giờ khám trong ca trực:</b>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {filteredSlots.map((slot) => {
                    const s = slot.starts_at.slice(11, 16);
                    return (
                      <button
                        key={slot.starts_at}
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
                    );
                  })}
                </div>
                {loadingSlots ? (
                  <small style={{ color: "#64748b", display: "block", marginTop: "0.5rem" }}>
                    Đang tải khung giờ khả dụng...
                  </small>
                ) : !filteredSlots.length && (
                  <small style={{ color: "#64748b", display: "block", marginTop: "0.5rem" }}>
                    {date ? "Không còn khung giờ khả dụng trong ngày này." : "Vui lòng chọn ngày khám trước."}
                  </small>
                )}
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
            {patient && appointments && (
              <div style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isFollowUp}
                    onChange={(e) => {
                      setIsFollowUp(e.target.checked);
                      if (!e.target.checked) setFollowUpParentId("");
                    }}
                  />
                  <span>Đặt lịch tái khám từ ca khám trước (Follow-up)</span>
                </label>
                {isFollowUp && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <small style={{ color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
                      Chọn phiên khám đã hoàn thành của bệnh nhân (tối đa 1 lịch tái khám / phiên khám):
                    </small>
                    {(() => {
                      const eligibleParents = appointments.filter(
                        (a) =>
                          (a.patientId === patient.id || a.patient === patient.name) &&
                          (a.status === "Hoàn thành" || a.rawStatus === "Completed") &&
                          (a.hasCompletedSession ?? Boolean(a.hasSession || a.sessionId)) &&
                          !a.hasFollowUp,
                      );
                      if (!eligibleParents.length) {
                        return (
                          <small style={{ color: "#b91c1c", display: "block", marginTop: "0.25rem" }}>
                            Bệnh nhân chưa có phiên khám đã hoàn thành nào khả dụng để đặt tái khám (mỗi phiên khám đã hoàn thành chỉ đặt tối đa 1 lịch tái khám).
                          </small>
                        );
                      }
                      return (
                        <Select value={followUpParentId} onChange={(e) => setFollowUpParentId(e.target.value)}>
                          <option value="">-- Chọn lịch hẹn gốc --</option>
                          {eligibleParents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.id} - Ngày {a.date} (BS. {a.doctor}) - {a.reason || "Đã hoàn thành"}
                            </option>
                          ))}
                        </Select>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
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
  onViewSession,
}: {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: (status: string) => Promise<void>;
  onReschedule?: () => void;
  onViewSession?: (sessionId: string) => void;
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
          ["Giờ khám", formatApptTime(appointment)],
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

      {Boolean(appointment.hasSession) && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.75rem 1rem", borderRadius: "8px", margin: "1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: "#1e40af", fontSize: "0.85rem" }}>
          <span>ℹ️</span>
          <span><b>Lịch hẹn đã gắn với phiên khám:</b> Để bảo toàn tính toàn vẹn y khoa (BR26–36 & trigger toàn vẹn), không thể hủy hoặc dời lịch khi phiên khám đã khởi tạo.</span>
        </div>
      )}

      <div className="privacy-note">
        <Icon name="heart" />
        <div>
          <b>Quyền quản trị & Điều phối</b>
          <p>Quản trị viên có thể cập nhật trạng thái lịch hẹn hoặc dời lịch trực tiếp vào cơ sở dữ liệu tuân thủ quy tắc BR26–36.</p>
        </div>
      </div>

      <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onStatusChange && appointment.status !== "Hoàn thành" && appointment.status !== "Đã hủy" && appointment.status !== "Không đến khám" && (
            <>
              {appointment.status !== "Đã xác nhận" && (
                <Button variant="primary" onClick={() => onStatusChange("Đã xác nhận")}>
                  Xác nhận lịch
                </Button>
              )}
              {!appointment.hasSession && (
                <Button variant="danger" onClick={() => onStatusChange("Đã hủy")}>
                  Hủy lịch hẹn
                </Button>
              )}
            </>
          )}
          {onReschedule && !appointment.hasSession && appointment.status === "Chờ xác nhận" && (
            <Button variant="secondary" onClick={onReschedule}>
              Đổi lịch khám
            </Button>
          )}
          {isCompletedAppointmentStatus(appointment.status) && (
            appointment.sessionId && onViewSession ? (
              <Button variant="primary" onClick={() => onViewSession(appointment.sessionId!)}>
                Xem phiên khám
              </Button>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Chưa có phiên khám liên kết
              </span>
            )
          )}
        </div>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}

function ConsultationSessionModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<AdminConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.fetchAdminConsultation(sessionId, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setSession(res.consultation);
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setError(err?.message || "Không tìm thấy chi tiết phiên khám.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => { controller.abort(); };
  }, [sessionId]);

  return (
    <Modal title={`Chi tiết phiên khám · ${sessionId}`} onClose={onClose} wide>
      {loading ? (
        <p style={{ padding: "1.5rem 0", color: "#64748b" }}>Đang tải thông tin phiên khám...</p>
      ) : error || !session ? (
        <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b" }}>
          {error || "Không tìm thấy thông tin phiên khám."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="detail-grid">
            <div><small>Mã phiên khám</small><b>{session.id}</b></div>
            <div><small>Mã lịch hẹn</small><b>{session.appointmentId}</b></div>
            <div><small>Bệnh nhân</small><b>{session.patientName} ({session.patientId})</b></div>
            <div><small>Bác sĩ</small><b>BS. {session.doctorName} ({session.specialty})</b></div>
            <div><small>Thời gian khám</small><b>{session.startedAt}{session.endedAt ? ` → ${session.endedAt}` : ""}</b></div>
            <div><small>Hình thức & Trạng thái</small><b>{session.modality} · {session.status}</b></div>
          </div>
          {session.diagnosisNotes && (
            <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <small style={{ color: "#64748b", display: "block", marginBottom: "0.25rem" }}>Ghi chú phiên khám</small>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem" }}>{session.diagnosisNotes}</pre>
            </div>
          )}
          {session.histories.length > 0 && (
            <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <small style={{ color: "#166534", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>Bệnh sử ghi nhận</small>
              {session.histories.map((h) => (
                <div key={h.id} style={{ fontSize: "0.9rem", marginBottom: "0.35rem" }}>
                  <b>{h.diagnosis}</b> — Triệu chứng: {h.symptoms}
                  {h.progressNotes && <div style={{ color: "#475569" }}>Ghi chú: {h.progressNotes}</div>}
                </div>
              ))}
            </div>
          )}
          {session.prescriptions.length > 0 && (
            <div style={{ padding: "0.75rem 1rem", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
              <small style={{ color: "#1e40af", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>Đơn thuốc ({session.prescriptions[0].id})</small>
              {session.prescriptions.map((rx) => (
                <ul key={rx.id} style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                  {rx.items.map((it, idx) => (
                    <li key={idx}><b>{it.name}</b>: {it.dosage} · {it.frequency} · {it.duration}</li>
                  ))}
                </ul>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions" style={{ marginTop: "1rem" }}>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
}

function AppointmentsPage({
  appointments,
  patients,
  doctors,
  specialties,
  schedules,
  onCreate,
  onStatusChange,
  onReschedule,
  notify,
}: {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  specialties: Specialty[];
  schedules: Schedule[];
  onCreate: (payload: any) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onReschedule: (id: string, payload: any) => Promise<void>;
  notify: (message: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [specialty, setSpecialty] = useState("Tất cả");
  const [selected, setSelected] = useState<Appointment>();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ starts_at: string; schedule_id: string }>>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setRescheduleSlots([]);
    setNewTime("");
    if (!rescheduling?.doctorId || !newDate || newDate < clinicTodayIso()) return;
    const controller = new AbortController();
    setLoadingRescheduleSlots(true);
    api.fetchBookingSlots(rescheduling.doctorId, newDate, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        const valid = filterValidSlots(res.slots || [], res.server_now);
        setRescheduleSlots(valid);
      })
      .catch((err) => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setRescheduleSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRescheduleSlots(false);
      });
    return () => { controller.abort(); };
  }, [rescheduling?.doctorId, newDate]);

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
    const slotMatch = rescheduleSlots.find((s) => s.starts_at.slice(11, 16) === newTime);
    if (!rescheduling || !newDate || newDate < clinicTodayIso() || !newTime || !slotMatch) {
      notify("Vui lòng chọn ngày và khung giờ khả dụng hợp lệ.");
      return;
    }
    await onReschedule(rescheduling.id, {
      scheduleId: slotMatch.schedule_id,
      dateTime: `${newDate} ${newTime}:00`,
      duration: 30,
    });
    setRescheduling(null);
    setNewDate("");
    setNewTime("");
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
                <th style={{ minWidth: "200px" }}>Thao tác</th>
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
                    <small className="block" style={{ color: "#64748b" }}>{formatApptTime(a)}</small>
                  </td>
                  <td>
                    {(Boolean(a.isFollowUp) || (a.reason && a.reason.toLowerCase().includes("tái khám"))) && (
                      <span className="follow-up-tag">Tái khám</span>
                    )}
                    {a.reason}
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ minWidth: "200px", whiteSpace: "nowrap" }}>
                    <div className="row-actions">
                      <button className="icon-btn" title="Xem chi tiết" onClick={() => setSelected(a)}>
                        <Icon name="eye" size={17} />
                      </button>
                      {a.status !== "Hoàn thành" && a.status !== "Đã hủy" && a.status !== "Không đến khám" && (
                        <>
                          {a.status === "Chờ xác nhận" && (
                            <Button variant="secondary" onClick={() => onStatusChange(a.id, "Đã xác nhận")}>
                              Xác nhận
                            </Button>
                          )}
                          {!a.hasSession && a.status === "Chờ xác nhận" && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setNewDate("");
                                setNewTime("");
                                setRescheduling(a);
                              }}
                            >
                              Dời lịch
                            </Button>
                          )}
                        </>
                      )}
                      {isCompletedAppointmentStatus(a.status) && (
                        a.sessionId ? (
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedSessionId(a.sessionId!)}
                          >
                            Xem phiên khám
                          </Button>
                        ) : (
                          <small style={{ color: "#64748b" }}>Chưa có phiên</small>
                        )
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
            setNewDate("");
            setNewTime("");
            setRescheduling(current);
          }}
          onViewSession={(sessionId) => {
            setSelected(undefined);
            setSelectedSessionId(sessionId);
          }}
        />
      )}

      {selectedSessionId && (
        <ConsultationSessionModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}

      {creating && (
        <CreateAppointmentModal
          patients={patients}
          doctors={doctors}
          specialties={specialties}
          schedules={schedules}
          appointments={appointments}
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
                <Input
                  type="date"
                  min={clinicTodayIso()}
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setNewTime("");
                  }}
                  required
                />
              </label>
              <label>
                Giờ hẹn mới *
                <Select value={newTime} onChange={(e) => setNewTime(e.target.value)} disabled={loadingRescheduleSlots || !rescheduleSlots.length}>
                  <option value="">{loadingRescheduleSlots ? "Đang tải khung giờ..." : rescheduleSlots.length ? "-- Chọn khung giờ --" : "Không có khung giờ trống"}</option>
                  {rescheduleSlots.map((slot) => {
                    const t = slot.starts_at.slice(11, 16);
                    return <option key={slot.starts_at} value={t}>{t}</option>;
                  })}
                </Select>
              </label>
            </div>
            {newDate && (
              <div style={{ marginTop: "0.75rem" }}>
                {newDate < clinicTodayIso() ? (
                  <small style={{ color: "#991b1b" }}>⚠️ Không thể dời lịch về ngày trong quá khứ.</small>
                ) : rescheduleSlots.length > 0 ? (
                  <small style={{ color: "#166534" }}>✓ Có {rescheduleSlots.length} khung giờ trống khả dụng vào ngày này.</small>
                ) : !loadingRescheduleSlots ? (
                  <small style={{ color: "#991b1b" }}>⚠️ Bác sĩ chưa có khung giờ khả dụng vào ngày này (BR26–36).</small>
                ) : null}
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => setRescheduling(null)}>
                Hủy
              </Button>
              <Button onClick={handleExecuteReschedule} disabled={!newTime}>
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

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

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
  const [doctorSearch, setDoctorSearch] = useState("");
  const [newDoctorId, setNewDoctorId] = useState(doctors[0]?.id || "");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newStatus, setNewStatus] = useState("Available");
  const [addError, setAddError] = useState("");

  const filteredModalDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors;
    const q = doctorSearch.toLowerCase();
    return doctors.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.specialty && d.specialty.toLowerCase().includes(q))
    );
  }, [doctors, doctorSearch]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedDoctor !== "Tất cả bác sĩ" && s.doctorName !== selectedDoctor.replace("BS. ", "")) return false;
      if (selectedSpecialty !== "Tất cả chuyên khoa") {
        const spec = s.specialty || "Đa khoa";
        if (spec !== selectedSpecialty) return false;
      }
      return true;
    });
  }, [schedules, selectedDoctor, selectedSpecialty]);

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
        dayName: names[i],
        dateStr: formatted,
        iso,
        isToday: d.toDateString() === new Date().toDateString(),
      };
    });
  }, [offset]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!newDoctorId || !newDate) return;
    if (newEnd <= newStart) {
      setAddError("Giờ kết thúc ca trực phải sau giờ bắt đầu (BR21).");
      return;
    }
    if (newStart < "08:00" || newEnd > "17:00") {
      setAddError("Ca trực phải nằm trong giờ hành chính phòng khám (08:00–17:00).");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (newDate < today) {
      setAddError("Không thể tạo ca trực trong quá khứ.");
      return;
    }
    try {
      await onAddSchedule({
        doctorId: newDoctorId,
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        status: newStatus,
      });
      setAdding(false);
    } catch (err: any) {
      setAddError(err.message || "Không thể tạo ca trực.");
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (a.status === "Đã hủy" || a.status === "Không đến khám") return false;
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
          <div className="week-calendar-container">
            <table className="week-calendar-table">
              <thead>
                <tr>
                  <th className="time-header-col">Khung giờ</th>
                  {weekDays.map((d) => {
                    const daySchedules = schedules.filter((s) => {
                      if (selectedDoctor !== "Tất cả bác sĩ" && s.doctorName !== selectedDoctor.replace("BS. ", "")) return false;
                      if (selectedSpecialty !== "Tất cả chuyên khoa" && s.specialty !== selectedSpecialty) return false;
                      return s.date === d.iso || s.formattedDate?.startsWith(d.dateStr);
                    });
                    return (
                      <th key={d.label} className={d.isToday ? "today-header" : ""}>
                        <div className={`day-header-cell ${d.isToday ? "is-today" : ""}`}>
                          <b>{d.dayName}</b>
                          <span>{d.dateStr}</span>
                          {daySchedules.length > 0 ? (
                            <span
                              className="day-shift-pill"
                              title={daySchedules.map((s) => `${s.doctorName} (${s.startTime} - ${s.endTime})`).join(", ")}
                            >
                              ⏰ {daySchedules.length} ca trực
                            </span>
                          ) : (
                            <span className="day-shift-pill off">Không có ca</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => {
                  const slotHour = parseInt(slot.split(":")[0], 10);
                  return (
                    <tr key={slot}>
                      <td className="time-label-cell">
                        <span>{slot}</span>
                      </td>
                      {weekDays.map((d) => {
                        const dayAppts = filteredAppointments.filter((a) => {
                          if (a.rawDateTime && a.rawDateTime.startsWith(d.iso)) return true;
                          if (a.date && (a.date.startsWith(d.dateStr) || a.date === d.iso)) return true;
                          return false;
                        });
                        const slotAppts = dayAppts.filter((a) => getAppointmentHour(a) === slotHour);
                        return (
                          <td key={d.label} className={`slot-cell ${d.isToday ? "today-slot" : ""}`}>
                            {slotAppts.length > 0 ? (
                              <div className="slot-cell-inner">
                                {slotAppts.map((a) => {
                                  const statusClass =
                                    a.status === "Chờ xác nhận"
                                      ? "pending"
                                      : a.status === "Hoàn thành"
                                      ? "done"
                                      : a.status === "Đã xác nhận"
                                      ? "confirmed"
                                      : "other";
                                  const formattedTime = formatApptTime(a);
                                  return (
                                    <div
                                      key={a.id}
                                      className={`cal-slot-card ${statusClass}`}
                                      onClick={() => onViewAppointment(a)}
                                      title={`${formattedTime} - ${a.patient} (BS. ${a.doctor}) - ${a.status}`}
                                    >
                                      <div className="cal-card-top">
                                        <span className="cal-time-tag">{formattedTime}</span>
                                        <span className="cal-status-dot" />
                                      </div>
                                      <strong className="cal-patient-name">{a.patient}</strong>
                                      <span className="cal-doctor-name">BS. {a.doctor}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  <th style={{ minWidth: "130px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.id}</b></td>
                    <td>{s.doctorName}</td>
                    <td>{s.specialty || "Đa khoa"}</td>
                    <td>{s.formattedDate}</td>
                    <td>{s.startTime} – {s.endTime}</td>
                    <td><StatusBadge status={s.status === "Available" ? "Khả dụng" : s.status} /></td>
                    <td style={{ minWidth: "130px", whiteSpace: "nowrap" }}>
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
        <Modal title="Thêm ca trực bác sĩ" onClose={() => { setAdding(false); setDoctorSearch(""); }}>
          <form onSubmit={handleAddSubmit}>
            <div className="form-grid">
              <div className="span-2">
                <label>
                  Tìm kiếm bác sĩ hoặc chuyên khoa
                  <Input
                    placeholder="🔍 Nhập tên bác sĩ hoặc chuyên khoa để tìm nhanh..."
                    value={doctorSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDoctorSearch(val);
                      const q = val.toLowerCase();
                      const matches = doctors.filter(
                        (d) => d.name.toLowerCase().includes(q) || (d.specialty && d.specialty.toLowerCase().includes(q))
                      );
                      if (matches.length > 0 && !matches.some((d) => d.id === newDoctorId)) {
                        setNewDoctorId(matches[0].id);
                      }
                    }}
                  />
                </label>
              </div>
              <label className="span-2">
                Bác sĩ trực * {doctorSearch ? `(Tìm thấy ${filteredModalDoctors.length}/${doctors.length} bác sĩ)` : ""}
                <Select value={newDoctorId} onChange={(e) => setNewDoctorId(e.target.value)}>
                  {filteredModalDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty || "Đa khoa"})
                    </option>
                  ))}
                  {!filteredModalDoctors.length && <option value="">Không tìm thấy bác sĩ phù hợp</option>}
                </Select>
              </label>
              <label>
                Ngày trực *
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
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
            {addError && <p style={{ color: "red", marginTop: "0.5rem" }}>{addError}</p>}
            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <Button variant="secondary" onClick={() => { setAdding(false); setDoctorSearch(""); }}>
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
    const cleanName = normalizeVietnameseName(name);
    const cleanEmail = assistEmail(email);
    const cleanPhone = normalizePhone(phone);
    const nameErr = validatePersonName(cleanName, "Họ và tên");
    const emailErr = validateEmail(cleanEmail, "Email", true);
    const phoneErr = validatePhone(cleanPhone, "Số điện thoại");
    if (nameErr || emailErr || phoneErr) {
      notify(nameErr || emailErr || phoneErr || "Dữ liệu hồ sơ không hợp lệ.");
      return;
    }
    setName(cleanName);
    setEmail(cleanEmail);
    setPhone(cleanPhone);
    try {
      await onUpdateProfile({ name: cleanName, email: cleanEmail, phone: cleanPhone });
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
  const [medications, setMedications] = useState<api.Medication[]>([]);
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
      if (data.medications) {
        setMedications(data.medications);
      } else {
        try {
          const medRes = await api.fetchMedications();
          setMedications(medRes.medications);
        } catch {}
      }
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
    const newUser: User = {
      id: res.doctor.userId || ("USER-" + res.doctor.id),
      name: res.doctor.name,
      email: res.doctor.email,
      phone: res.doctor.phone,
      role: "Bác sĩ",
      rawRole: "DOCTOR",
      status: "Hoạt động",
      created: new Date().toLocaleDateString("vi-VN"),
    };
    setUsers((curr) => [newUser, ...curr]);
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
    const newUser: User = {
      id: res.patient.userId || ("USER-" + res.patient.id),
      name: res.patient.name,
      email: res.patient.email,
      phone: res.patient.phone,
      role: "Bệnh nhân",
      rawRole: "PATIENT",
      status: "Hoạt động",
      created: new Date().toLocaleDateString("vi-VN"),
    };
    setUsers((curr) => [newUser, ...curr]);
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

  const handleAddMedication = async (payload: { name: string; description: string }) => {
    const res = await api.createMedication(payload);
    setMedications((curr) => [...curr, res.medication]);
    notify(res.message || "Đã thêm thuốc mới vào danh mục thành công.");
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
      reason: res.appointment?.reason || payload.reason || (payload.followUpFromApptId ? "Tái khám theo hẹn." : "Khám sức khỏe tổng quát"),
      visitType: payload.visitType || "Khám trực tiếp",
      status: (res.appointment?.status as Appointment["status"]) || "Chờ xác nhận",
      fee: 250000,
      isFollowUp: Boolean(res.appointment?.isFollowUp || payload.followUpFromApptId),
      sessionId: res.appointment?.sessionId ?? null,
    };
    setAppointments((curr) => [
      newAppt,
      ...curr.map((a) =>
        payload.followUpFromApptId && a.id === payload.followUpFromApptId
          ? { ...a, hasFollowUp: true, followUpAppointmentId: newAppt.id }
          : a,
      ),
    ]);
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
            specialties={specialties}
            onAddDoctor={handleAddDoctor}
            onAddPatient={handleAddPatient}
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
      case "medications":
        return (
          <MedicationsPage
            medications={medications}
            onAddMedication={handleAddMedication}
          />
        );
      case "appointments":
        return (
          <AppointmentsPage
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            specialties={specialties}
            schedules={schedules}
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
  }, [page, loading, counts, users, doctors, patients, specialties, medications, appointments, schedules, charts, adminProfile]);

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
