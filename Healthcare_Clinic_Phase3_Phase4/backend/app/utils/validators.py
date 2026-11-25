"""Shared medical-grade input normalizers and validators (Single Source of Truth)."""
from datetime import date, datetime, timedelta, timezone
import re

from ..services.common import BusinessError, ensure

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_10_RE = re.compile(r"^0\d{9}$")

HONORIFICS = {
    "BS": "BS",
    "BS.": "BS.",
    "TS": "TS",
    "TS.": "TS.",
    "THS": "ThS",
    "THS.": "ThS.",
    "PGS": "PGS",
    "PGS.": "PGS.",
    "GS": "GS",
    "GS.": "GS.",
}


def clinic_now() -> datetime:
    """Return current naive datetime in clinic timezone (+07:00)."""
    return datetime.now(timezone(timedelta(hours=7))).replace(tzinfo=None, microsecond=0)


def normalize_person_name(name: str | None) -> str:
    """Trim extra spaces and normalize Vietnamese/standard person names to Title Case."""
    if not name:
        return ""
    words = []
    for word in str(name).strip().split():
        upper = word.upper()
        if upper in HONORIFICS:
            words.append(HONORIFICS[upper])
        else:
            words.append(word[0].upper() + word[1:].lower())
    return " ".join(words)


def validate_person_name(
    name: str | None,
    field: str = "Họ và tên",
    *,
    required: bool = True,
    min_len: int = 2,
    max_len: int = 100,
    normalize_case: bool = True,
) -> str:
    cleaned = normalize_person_name(name) if normalize_case else " ".join(str(name or "").strip().split())
    if not cleaned:
        ensure(not required, f"{field} không được để trống.")
        return ""
    ensure(min_len <= len(cleaned) <= max_len, f"{field} phải có từ {min_len} đến {max_len} ký tự.")
    ensure(not any(ch.isdigit() for ch in cleaned), f"{field} không được chứa chữ số.")
    return cleaned


def normalize_phone(phone: str | None) -> str:
    """Strip whitespace and convert leading +84 to 0 without stripping non-digits."""
    if not phone:
        return ""
    cleaned = re.sub(r"\s+", "", str(phone))
    if cleaned.startswith("+84"):
        cleaned = "0" + cleaned[3:]
    return cleaned


def validate_phone(
    phone: str | None,
    field: str = "Số điện thoại",
    *,
    required: bool = True,
) -> str:
    cleaned = normalize_phone(phone)
    if not cleaned:
        ensure(not required, f"{field} không được để trống.")
        return ""
    ensure(
        bool(PHONE_10_RE.match(cleaned)),
        f"{field} phải là số di động Việt Nam gồm 10 chữ số (bắt đầu bằng 0).",
    )
    return cleaned


def normalize_email(email: str | None) -> str:
    if not email:
        return ""
    return str(email).strip().lower()


def validate_email(
    email: str | None,
    field: str = "Email",
    *,
    required: bool = False,
    max_len: int = 100,
) -> str:
    cleaned = normalize_email(email)
    if not cleaned:
        ensure(not required, f"{field} không được để trống.")
        return ""
    ensure(len(cleaned) <= max_len, f"{field} tối đa {max_len} ký tự.")
    ensure(bool(EMAIL_RE.match(cleaned)), "Địa chỉ email không đúng định dạng (ví dụ: ten@gmail.com).")
    return cleaned


def parse_dob(value, field: str = "Ngày sinh") -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    try:
        if "/" in raw:
            parts = raw.split("/")
            if len(parts) == 3:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
        return date.fromisoformat(raw)
    except Exception:
        raise BusinessError(f"{field} không hợp lệ (định dạng YYYY-MM-DD hoặc DD/MM/YYYY).")


def validate_dob(
    value,
    field: str = "Ngày sinh",
    *,
    required: bool = True,
    min_age: int = 0,
    max_age: int = 130,
) -> date | None:
    dob = parse_dob(value, field=field)
    if dob is None:
        ensure(not required, f"{field} không được để trống.")
        return None
    today = clinic_now().date()
    ensure(
        dob < today,
        f"{field} không được ở tương lai — {field} phải trước ngày hiện tại (không thể là hôm nay hoặc tương lai).",
    )
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if min_age > 0 or max_age < 130:
        ensure(min_age <= age <= max_age, f"Tuổi hợp lệ phải từ {min_age} đến {max_age} tuổi.")
    else:
        ensure(0 <= age <= max_age and dob >= date(today.year - max_age, 1, 1),
               f"{field} không hợp lệ (tuổi không vượt quá {max_age} tuổi).")
    return dob


def validate_text(
    value: str | None,
    field: str,
    *,
    required: bool = False,
    min_len: int = 0,
    max_len: int = 255,
) -> str | None:
    cleaned = str(value or "").strip()
    if not cleaned:
        ensure(not required, f"{field} không được để trống.")
        return None
    ensure(len(cleaned) >= min_len, f"{field} phải có ít nhất {min_len} ký tự.")
    ensure(len(cleaned) <= max_len, f"{field} không được vượt quá {max_len} ký tự.")
    return cleaned


def ensure_unique_phone(
    phone: str,
    *,
    exclude_patient_id: str | None = None,
    exclude_doctor_id: str | None = None,
) -> None:
    """Prevent duplicate phone numbers across patient and doctor records."""
    from ..repositories import doctors, patients

    if patients.find_by_phone(phone, exclude_patient_id=exclude_patient_id):
        raise BusinessError("Số điện thoại này đã được sử dụng bởi hồ sơ khác trong hệ thống.")
    if doctors.find_by_phone(phone, exclude_doctor_id=exclude_doctor_id):
        raise BusinessError("Số điện thoại này đã được sử dụng bởi bác sĩ khác trong hệ thống.")


def ensure_unique_email(
    email: str | None,
    *,
    exclude_patient_id: str | None = None,
    exclude_doctor_id: str | None = None,
    scope: str = "both",
) -> None:
    """Prevent duplicate email addresses across doctor/patient records."""
    if not email:
        return
    from ..repositories import doctors, patients

    if scope in ("patient", "both") and patients.find_by_email(email, exclude_patient_id=exclude_patient_id):
        raise BusinessError("Email này đã được sử dụng bởi bệnh nhân khác.")
    if scope in ("doctor", "both") and doctors.find_by_email(email, exclude_doctor_id=exclude_doctor_id):
        raise BusinessError("Email này đã được sử dụng bởi bác sĩ khác.")
