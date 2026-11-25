"use strict";
document.querySelectorAll(".password-toggle").forEach(passwordToggle => {
  const targetId = passwordToggle.dataset.target;
  const passwordInput = document.getElementById(targetId);
  if (passwordInput) {
    passwordToggle.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      passwordToggle.textContent = isHidden ? "Ẩn" : "Hiện";
      passwordToggle.setAttribute("aria-label", isHidden ? "Ẩn mật khẩu" : "Hiện mật khẩu");
      passwordToggle.setAttribute("aria-pressed", String(isHidden));
    });
  }
});
// Auto-format personal names to Title Case (e.g. 'nGuyen vaN cu' -> 'Nguyen Van Cu')
const formatPersonName = str => {
  if (!str) return "";
  const honorifics = { BS: "BS", "BS.": "BS.", TS: "TS", "TS.": "TS.", THS: "ThS", "THS.": "ThS.", PGS: "PGS", "PGS.": "PGS.", GS: "GS", "GS.": "GS." };
  return str.trim().split(/\s+/).map(w => honorifics[w.toUpperCase()] || (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ");
};

document.querySelectorAll('input[name="full_name"], input[name="emergency_contact_name"]').forEach(input => {
  const syncName = () => {
    if (input.value.trim()) input.value = formatPersonName(input.value);
  };
  input.addEventListener("blur", syncName);
  input.addEventListener("change", syncName);
});

// Auto-assist @gmail.com when typing local part without '@' and trim/lowercase
document.querySelectorAll('input[name="email"]').forEach(input => {
  const assistEmail = () => {
    const val = input.value.trim().toLowerCase();
    if (!val) {
      input.value = "";
      return;
    }
    input.value = (!val.includes("@") && /^[a-z0-9._%+-]+$/i.test(val)) ? `${val}@gmail.com` : val;
  };
  input.addEventListener("blur", assistEmail);
  input.addEventListener("change", assistEmail);
});

// Strip stray spaces on phone inputs
document.querySelectorAll('input[name="phone"], input[name="emergency_contact_phone"]').forEach(input => {
  const cleanPhone = () => {
    const val = input.value.replace(/\s+/g, "");
    input.value = val.startsWith("+84") ? `0${val.slice(3)}` : val;
  };
  input.addEventListener("blur", cleanPhone);
  input.addEventListener("change", cleanPhone);
});

// Restrict date of birth to past dates only (cannot be today or future, max 130 yrs)
const dobInput = document.querySelector('input[name="date_of_birth"]');
if (dobInput) {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const minDate = new Date(now.getFullYear() - 130, now.getMonth(), now.getDate());
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  dobInput.max = fmt(yesterday);
  dobInput.min = fmt(minDate);
}


const role = document.querySelector('select[name="role"]');
if (role) {
  const sections = {
    PATIENT: ["full_name", "phone", "email", "date_of_birth", "gender", "emergency_contact_name", "emergency_contact_phone"],
    DOCTOR: ["full_name", "phone", "email", "license_number", "subtype", "specialty_id"],
    ADMIN: [],
  };
  const profileNames = [...new Set(Object.values(sections).flat())];
  const toggle = () => profileNames.forEach(name => {
    const input = document.querySelector(`[name="${name}"]`);
    input.closest(".field").hidden = !sections[role.value].includes(name);
  });
  role.addEventListener("change", toggle);
  toggle();
}
const items = document.getElementById("prescription-items");
if (items) {
  const renumber = () => [...items.children].forEach((entry, index) => {
    entry.querySelector("legend").textContent = `Mục thuốc ${index + 1}`;
    entry.querySelectorAll("[name],[id],[for]").forEach(element => {
      ["name", "id", "for"].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, value.replace(/items-\d+-/g, `items-${index}-`));
      });
    });
    entry.querySelector(".remove-item").hidden = items.children.length === 1;
  });
  document.getElementById("add-item").addEventListener("click", () => {
    if (items.children.length >= 10) return;
    const entry = items.children[0].cloneNode(true);
    entry.querySelectorAll("input").forEach(input => { input.value = ""; });
    entry.querySelectorAll("select").forEach(select => { select.selectedIndex = 0; });
    entry.querySelectorAll(".field-error").forEach(error => error.remove());
    items.append(entry);
    renumber();
  });
  items.addEventListener("click", event => {
    if (event.target.matches(".remove-item") && items.children.length > 1) {
      event.target.closest("fieldset").remove();
      renumber();
    }
  });
  renumber();
}
