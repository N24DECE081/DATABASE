"use strict";
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
