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
  return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

document.querySelectorAll('input[name="full_name"], input[name="emergency_contact_name"]').forEach(input => {
  input.addEventListener("blur", () => {
    if (input.value.trim()) {
      input.value = formatPersonName(input.value);
    }
  });
  input.addEventListener("change", () => {
    if (input.value.trim()) {
      input.value = formatPersonName(input.value);
    }
  });
});

// Restrict date of birth to past dates only (cannot be today or future)
const dobInput = document.querySelector('input[name="date_of_birth"]');
if (dobInput) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
  const dd = String(yesterday.getDate()).padStart(2, "0");
  dobInput.max = `${yyyy}-${mm}-${dd}`;
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
