"use strict";
// Immediate feedback; the server repeats every rule for security and consistency.
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
document.querySelectorAll('input[name="date_of_birth"]').forEach(input => {
  input.max = localToday;
  input.addEventListener("change", () => {
    input.setCustomValidity(input.value && input.value > localToday ? "Ngày sinh không được ở tương lai." : "");
    input.reportValidity();
  });
});
document.querySelectorAll('input[name="phone"], input[name="emergency_contact_phone"]').forEach(input => {
  input.pattern = "[0-9]{10}";
  input.maxLength = 10;
  input.title = "Nhập đúng 10 chữ số.";
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 10);
  });
});
document.querySelectorAll('input[name="email"]').forEach(input => {
  input.pattern = "[A-Za-z0-9._%+\\-]+@gmail\\.com";
  input.title = "Email phải có dạng tennguoidung@gmail.com.";
  input.addEventListener("change", () => {
    const valid = !input.value || /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(input.value);
    input.setCustomValidity(valid ? "" : "Email phải có đuôi @gmail.com.");
    input.reportValidity();
  });
});
// Toggle role-specific profile fields without changing server-side validation.
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
