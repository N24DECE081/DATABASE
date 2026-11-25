/**
 * Shared medical-grade validation, formatting, timezone, and slot rules
 * across Admin, Doctor, and Patient portals (Single Source of Truth).
 */

const CLINIC_TIMEZONE = "Asia/Bangkok";

const HONORIFICS: Record<string, string> = {
  BS: "BS",
  "BS.": "BS.",
  TS: "TS",
  "TS.": "TS.",
  THS: "ThS",
  "THS.": "ThS.",
  PGS: "PGS",
  "PGS.": "PGS.",
  GS: "GS",
  "GS.": "GS.",
};

function clinicDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value || "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute"),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function clinicTodayIso(): string {
  const { year, month, day } = clinicDateParts();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function clinicNowHHMM(): string {
  const { hour, minute } = clinicDateParts();
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function clinicNowIsoMinute(): string {
  return `${clinicTodayIso()}T${clinicNowHHMM()}`;
}

export function clinicDateOffsetIso(daysDelta: number): string {
  const { year, month, day } = clinicDateParts();
  const d = new Date(Date.UTC(year, month - 1, day + daysDelta));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function clinicYearsAgoIso(years: number): string {
  const { year, month, day } = clinicDateParts();
  const d = new Date(Date.UTC(year - years, month - 1, day));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function maxPatientDobIso(): string {
  return clinicDateOffsetIso(-1);
}

export function minPatientDobIso(): string {
  return clinicYearsAgoIso(130);
}

export function maxDoctorDobIso(): string {
  return clinicYearsAgoIso(22);
}

export function minDoctorDobIso(): string {
  return clinicYearsAgoIso(80);
}

export function normalizeVietnameseName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (HONORIFICS[upper]) return HONORIFICS[upper];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function validatePersonName(
  name: string,
  field = "Họ và tên",
  required = true,
  maxLen = 100,
): string | null {
  const cleaned = normalizeVietnameseName(name);
  if (!cleaned) {
    return required ? `${field} không được để trống.` : null;
  }
  if (cleaned.length < 2 || cleaned.length > maxLen) {
    return `${field} phải có từ 2 đến ${maxLen} ký tự.`;
  }
  if (/\d/.test(cleaned)) {
    return `${field} không được chứa chữ số.`;
  }
  return null;
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const noSpaces = phone.replace(/\s+/g, "");
  return noSpaces.startsWith("+84") ? `0${noSpaces.slice(3)}` : noSpaces;
}

export function isValidVietnamesePhone(phone: string): boolean {
  return /^0\d{9}$/.test(normalizePhone(phone));
}

export function validatePhone(
  phone: string,
  field = "Số điện thoại",
  required = true,
): string | null {
  const cleaned = normalizePhone(phone);
  if (!cleaned) {
    return required ? `${field} không được để trống.` : null;
  }
  if (!/^0\d{9}$/.test(cleaned)) {
    return `${field} phải gồm đúng 10 chữ số (bắt đầu bằng 0).`;
  }
  return null;
}

export function assistEmail(email: string): string {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (!trimmed.includes("@") && /^[a-z0-9._%+-]+$/.test(trimmed)) {
    return `${trimmed}@gmail.com`;
  }
  return trimmed;
}

export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((email || "").trim());
}

export function validateEmail(
  email: string,
  field = "Email",
  required = false,
): string | null {
  const assisted = assistEmail(email);
  if (!assisted) {
    return required ? `${field} không được để trống.` : null;
  }
  if (assisted.length > 100) {
    return `${field} tối đa 100 ký tự.`;
  }
  if (!isValidEmail(assisted)) {
    return "Địa chỉ email không đúng định dạng (ví dụ: ten@gmail.com).";
  }
  return null;
}

export function validateDob(
  dob: string,
  options: { required?: boolean; minAge?: number; maxAge?: number; field?: string } = {},
): string | null {
  const { required = true, minAge = 0, maxAge = 130, field = "Ngày sinh" } = options;
  const raw = (dob || "").trim();
  if (!raw) {
    return required ? `Vui lòng nhập ${field.toLowerCase()}.` : null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    return `${field} không đúng định dạng YYYY-MM-DD.`;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return `${field} không phải ngày hợp lệ.`;
  }
  const todayIso = clinicTodayIso();
  if (raw >= todayIso) {
    return `${field} phải trước ngày hiện tại (không thể là hôm nay hoặc tương lai).`;
  }
  const nowParts = clinicDateParts();
  const birthdayPending =
    nowParts.month < m || (nowParts.month === m && nowParts.day < d);
  const age = nowParts.year - y - Number(birthdayPending);
  if (age < minAge || age > maxAge) {
    return minAge > 0 || maxAge < 130
      ? `Tuổi hợp lệ phải từ ${minAge} đến ${maxAge} tuổi.`
      : `${field} không hợp lệ (tuổi không vượt quá ${maxAge} tuổi).`;
  }
  return null;
}

export const CLINIC_SLOT_MINUTES = 30;

export function isValidClinicSlotTime(startsAtOrTime: string): boolean {
  const raw = (startsAtOrTime || "").trim();
  const hhmm = raw.length >= 16 && raw[10] === "T" ? raw.slice(11, 16) : raw.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return false;
  const mm = hhmm.slice(3, 5);
  if (mm !== "00" && mm !== "30") return false;
  // Morning: 08:00-12:00 (last slot 11:30); Afternoon: 13:00-17:00 (last slot 16:30)
  return (hhmm >= "08:00" && hhmm <= "11:30") || (hhmm >= "13:00" && hhmm <= "16:30");
}

export function isPastSlot(startsAtIso: string, serverNowIso?: string): boolean {
  const slotKey = (startsAtIso || "").slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(slotKey)) return true;
  if (!isValidClinicSlotTime(slotKey)) return true;
  const localNow = clinicNowIsoMinute();
  const serverNow = serverNowIso ? serverNowIso.slice(0, 16) : "";
  const effectiveNow = serverNow > localNow ? serverNow : localNow;
  if (slotKey < effectiveNow) return true;
  return false;
}

export function filterValidSlots<T extends { starts_at: string }>(
  slots: T[],
  serverNowIso?: string,
  minStartsAtIso?: string,
): T[] {
  return (slots || []).filter((slot) => {
    if (isPastSlot(slot.starts_at, serverNowIso)) return false;
    if (minStartsAtIso && slot.starts_at.slice(0, 16) <= minStartsAtIso.slice(0, 16)) {
      return false;
    }
    return true;
  });
}

export function isCompletedAppointmentStatus(status?: string): boolean {
  return status === "Hoàn thành" || status === "Đã hoàn thành" || status === "Completed";
}
