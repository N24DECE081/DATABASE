(() => {
  const root = document.getElementById("booking-wizard");
  if (!root) return;

  const admin = root.dataset.role === "ADMIN";
  const steps = admin
    ? [
        ["patient", "Bệnh nhân"],
        ["type", "Hình thức"],
        ["specialty", "Chuyên khoa"],
        ["doctor", "Bác sĩ"],
        ["datetime", "Ngày & giờ"],
        ["review", "Xác nhận"],
      ]
    : [
        ["type", "Hình thức"],
        ["specialty", "Chuyên khoa"],
        ["doctor", "Bác sĩ"],
        ["datetime", "Ngày & giờ"],
        ["review", "Xác nhận"],
      ];
  const state = {
    index: 0,
    patient: null,
    profile: null,
    type: "",
    specialty: "",
    doctor: null,
    date: "",
    slot: null,
    duration: 30,
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    csrf: "",
  };
  const $ = (selector) => root.querySelector(selector);
  const message = $("#booking-message");
  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Không thể tải dữ liệu. Hãy thử lại.");
    return payload;
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function currentStep() {
    return steps[state.index][0];
  }

  function canContinue() {
    switch (currentStep()) {
      case "patient":
        return Boolean(state.patient);
      case "type":
        return Boolean(state.type);
      case "specialty":
        return Boolean(state.specialty);
      case "doctor":
        return Boolean(state.doctor);
      case "datetime":
        return Boolean(state.slot && state.date && (!admin || $("#appointment-reason").value.trim()));
      default:
        return true;
    }
  }

  function renderProgress() {
    const list = $("#booking-progress");
    list.replaceChildren();
    steps.forEach(([key, label], index) => {
      const item = document.createElement("li");
      item.className = index < state.index ? "done" : index === state.index ? "active" : "";
      const number = document.createElement("span");
      number.className = "progress-index";
      number.textContent = index < state.index ? "✓" : String(index + 1);
      const text = document.createElement("span");
      text.textContent = label;
      item.append(number, text);
      item.dataset.stepKey = key;
      list.append(item);
    });
  }

  function renderSummary() {
    const items = [
      ["Hình thức", state.type === "In-person" ? "Khám trực tiếp" : state.type === "Telemedicine" ? "Tư vấn trực tuyến" : "Chưa chọn"],
      ["Chuyên khoa", state.specialty ? $("#specialty-options").querySelector(`[data-id="${CSS.escape(state.specialty)}"] .booking-option-copy strong`)?.textContent || "Đã chọn" : "Chưa chọn"],
      ["Bác sĩ", state.doctor?.full_name || "Chưa chọn"],
      ["Ngày & giờ", state.slot ? `${state.date} · ${state.slot.starts_at.slice(11, 16)}` : "Chưa chọn"],
      ["Thời lượng", `${state.duration} phút`],
    ];
    $("#booking-summary-items").replaceChildren(...items.map(([label, value]) => {
      const row = document.createElement("div");
      row.className = "booking-summary-item";
      const small = document.createElement("small");
      small.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      row.append(small, strong);
      return row;
    }));

    const patient = $("#booking-summary-patient");
    const selectedPatient = admin ? state.patient : state.profile;
    patient.hidden = !selectedPatient;
    patient.textContent = selectedPatient
      ? `Bệnh nhân: ${selectedPatient.full_name || selectedPatient.name}`
      : "";
  }

  function renderReview() {
    const selectedPatient = admin ? state.patient : state.profile;
    const rows = [
      ["Bệnh nhân", selectedPatient?.full_name || selectedPatient?.name || "Chưa có hồ sơ"],
      ["Hình thức khám", state.type === "In-person" ? "Khám trực tiếp" : "Tư vấn trực tuyến"],
      ["Chuyên khoa", $("#specialty-options").querySelector(`[data-id="${CSS.escape(state.specialty)}"] .booking-option-copy strong`)?.textContent || ""],
      ["Bác sĩ", state.doctor?.full_name || ""],
      ["Ngày khám", state.date ? new Date(`${state.date}T12:00:00`).toLocaleDateString("vi-VN") : ""],
      ["Giờ khám", state.slot?.starts_at.slice(11, 16) || ""],
      ["Thời lượng", `${state.duration} phút`],
    ];
    if (admin) rows.push(["Lý do khám", $("#appointment-reason").value.trim()]);
    const dl = $("#booking-review");
    dl.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value || "—";
      row.append(dt, dd);
      return row;
    }));

    const profileBox = $("#patient-profile-review");
    const profile = state.profile;
    profileBox.hidden = admin || !profile;
    if (!admin && profile) {
      const fields = [
        ["Họ và tên", profile.full_name],
        ["Số điện thoại", profile.phone],
        ["Ngày sinh", profile.date_of_birth],
        ["Email", profile.email || "Chưa cập nhật"],
      ];
      $("#patient-profile-fields").replaceChildren(...fields.map(([label, value]) => {
        const wrapper = document.createElement("span");
        const small = document.createElement("small");
        small.textContent = label;
        const strong = document.createElement("strong");
        strong.textContent = value || "—";
        wrapper.append(small, strong);
        return wrapper;
      }));
    }
  }

  function render() {
    renderProgress();
    root.querySelectorAll(".booking-step").forEach((section) => {
      section.hidden = section.dataset.step !== currentStep();
    });
    const isReview = currentStep() === "review";
    $("#booking-previous").textContent = state.index === 0 ? "Quay lại" : "Bước trước";
    $("#booking-next").hidden = isReview;
    $("#booking-confirm").hidden = !isReview;
    $("#booking-next").disabled = !canContinue();
    $("#booking-confirm").disabled = !canContinue();
    root.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("selected", button.dataset.type === state.type));
    if (isReview) renderReview();
    renderSummary();
  }

  function closeModal() {
    const modal = document.getElementById("booking-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("booking-modal-open");
  }

  function addEmpty(container, text) {
    const item = document.createElement("div");
    item.className = "booking-option-empty";
    item.textContent = text;
    container.replaceChildren(item);
  }

  function optionButton({ id, title, subtitle, selected, onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `booking-option${selected ? " selected" : ""}`;
    button.dataset.id = id;
    const mark = document.createElement("span");
    mark.className = "booking-option-mark";
    mark.textContent = selected ? "✓" : "";
    const copy = document.createElement("span");
    copy.className = "booking-option-copy";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("small");
    small.textContent = subtitle || "";
    copy.append(strong, small);
    button.append(mark, copy);
    button.addEventListener("click", onClick);
    return button;
  }

  async function loadSpecialties() {
    const list = $("#specialty-options");
    addEmpty(list, "Đang tải chuyên khoa có giờ khám trống…");
    try {
      const data = await api(`/api/appointments/options?duration=${state.duration}`);
      if (!data.specialties.length) return addEmpty(list, "Chưa có chuyên khoa với ca khám còn trống.");
      list.replaceChildren(...data.specialties.map((item) => optionButton({
        id: item.specialty_id,
        title: item.specialty_name,
        subtitle: "Có bác sĩ với ca làm còn khả dụng",
        selected: state.specialty === item.specialty_id,
        onClick: () => {
          if (state.specialty !== item.specialty_id) {
            state.doctor = null;
            state.date = "";
            state.slot = null;
          }
          state.specialty = item.specialty_id;
          list.querySelectorAll(".booking-option").forEach((button) => button.classList.toggle("selected", button.dataset.id === state.specialty));
          render();
        },
      })));
    } catch (error) {
      showMessage(error.message);
      addEmpty(list, "Không tải được chuyên khoa.");
    }
  }

  let doctorsRequest = 0;
  async function loadDoctors(search = "") {
    const requestId = ++doctorsRequest;
    const list = $("#doctor-options");
    addEmpty(list, "Đang tìm bác sĩ còn giờ khám trống…");
    const params = new URLSearchParams({ duration: String(state.duration), specialty_id: state.specialty, q: search });
    try {
      const data = await api(`/api/appointments/options?${params}`);
      if (requestId !== doctorsRequest) return;
      if (!data.doctors.length) return addEmpty(list, "Không có bác sĩ khả dụng phù hợp với lựa chọn này.");
      list.replaceChildren(...data.doctors.map((item) => optionButton({
        id: item.doctor_id,
        title: item.full_name,
        subtitle: item.specialty_name,
        selected: state.doctor?.doctor_id === item.doctor_id,
        onClick: () => {
          if (state.doctor?.doctor_id !== item.doctor_id) {
            state.date = "";
            state.slot = null;
          }
          state.doctor = item;
          list.querySelectorAll(".booking-option").forEach((button) => button.classList.toggle("selected", button.dataset.id === item.doctor_id));
          render();
        },
      })));
    } catch (error) {
      if (requestId !== doctorsRequest) return;
      showMessage(error.message);
      addEmpty(list, "Không tải được danh sách bác sĩ.");
    }
  }

  function monthKey() {
    return `${state.month.getFullYear()}-${String(state.month.getMonth() + 1).padStart(2, "0")}`;
  }

  async function loadCalendar() {
    $("#month-label").textContent = state.month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    const params = new URLSearchParams({
      month: monthKey(),
      duration: String(state.duration),
      specialty_id: state.specialty,
      doctor_id: state.doctor?.doctor_id || "",
    });
    $("#booking-calendar").replaceChildren();
    $("#time-options").replaceChildren();
    try {
      const data = await api(`/api/appointments/options?${params}`);
      drawCalendar(new Set(data.available_dates));
      if (state.date) await loadSlots();
    } catch (error) {
      showMessage(error.message);
      drawCalendar(new Set());
    }
  }

  function drawCalendar(availableDates) {
    const grid = $("#booking-calendar");
    grid.replaceChildren();
    ["CN", "T2", "T3", "T4", "T5", "T6", "T7"].forEach((day) => {
      const label = document.createElement("span");
      label.className = "weekday";
      label.textContent = day;
      grid.append(label);
    });
    const year = state.month.getFullYear();
    const month = state.month.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let blank = 0; blank < offset; blank += 1) {
      const cell = document.createElement("span");
      cell.className = "blank";
      grid.append(cell);
    }
    for (let day = 1; day <= lastDay; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(day);
      const canBook = availableDates.has(key);
      button.disabled = !canBook;
      if (canBook) button.classList.add("available-day");
      if (state.date === key) button.classList.add("selected");
      button.setAttribute("aria-label", `${day}/${month + 1}/${year}${canBook ? ", còn giờ trống" : ", không có giờ trống"}`);
      button.addEventListener("click", async () => {
        state.date = key;
        state.slot = null;
        drawCalendar(availableDates);
        render();
        await loadSlots();
      });
      grid.append(button);
    }
  }

  async function loadSlots() {
    const heading = $("#time-heading");
    const list = $("#time-options");
    heading.textContent = state.date ? `Giờ còn trống · ${new Date(`${state.date}T12:00:00`).toLocaleDateString("vi-VN")}` : "Chọn một ngày để xem giờ trống";
    if (!state.date) return list.replaceChildren();
    addEmpty(list, "Đang kiểm tra giờ còn trống…");
    const params = new URLSearchParams({
      day: state.date,
      duration: String(state.duration),
      specialty_id: state.specialty,
      doctor_id: state.doctor?.doctor_id || "",
    });
    try {
      const data = await api(`/api/appointments/options?${params}`);
      if (!data.slots.length) return addEmpty(list, "Ngày này không còn giờ phù hợp. Hãy chọn ngày khác.");
      list.replaceChildren(...data.slots.map((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `booking-time-option${state.slot?.starts_at === slot.starts_at ? " selected" : ""}`;
        button.textContent = slot.starts_at.slice(11, 16);
        button.addEventListener("click", () => {
          state.slot = slot;
          list.querySelectorAll(".booking-time-option").forEach((item) => item.classList.toggle("selected", item === button));
          render();
        });
        return button;
      }));
    } catch (error) {
      showMessage(error.message);
      addEmpty(list, "Không tải được giờ khám.");
    }
  }

  async function loadPatients(search) {
    const list = $("#patient-options");
    if (search.trim().length < 2) return addEmpty(list, "Nhập ít nhất 2 ký tự để tìm hồ sơ.");
    addEmpty(list, "Đang tìm bệnh nhân…");
    try {
      const data = await api(`/api/patients?q=${encodeURIComponent(search.trim())}`);
      if (!data.patients.length) return addEmpty(list, "Không tìm thấy bệnh nhân phù hợp.");
      list.replaceChildren(...data.patients.map((item) => optionButton({
        id: item.patient_id,
        title: item.full_name,
        subtitle: `${item.patient_id} · ${item.phone}`,
        selected: state.patient?.patient_id === item.patient_id,
        onClick: () => {
          state.patient = item;
          list.querySelectorAll(".booking-option").forEach((button) => button.classList.toggle("selected", button.dataset.id === item.patient_id));
          render();
        },
      })));
    } catch (error) {
      showMessage(error.message);
      addEmpty(list, "Không tải được hồ sơ bệnh nhân.");
    }
  }

  function renderPatientProfile() {
    const profile = state.profile;
    if (!profile) return;
    $("#patient-profile-fields").replaceChildren(...[
      ["Họ và tên", profile.full_name],
      ["Số điện thoại", profile.phone],
      ["Ngày sinh", profile.date_of_birth],
      ["Email", profile.email || "Chưa cập nhật"],
    ].map(([label, value]) => {
      const wrapper = document.createElement("span");
      const small = document.createElement("small");
      const strong = document.createElement("strong");
      small.textContent = label;
      strong.textContent = value || "—";
      wrapper.append(small, strong);
      return wrapper;
    }));
  }

  async function confirmBooking() {
    const button = $("#booking-confirm");
    button.disabled = true;
    showMessage("");
    try {
      const payload = {
        appointment_type: state.type,
        schedule_id: state.slot.schedule_id,
        appointment_date_time: state.slot.starts_at,
        estimated_duration_minutes: state.duration,
        reason: admin ? $("#appointment-reason").value.trim() : "",
      };
      if (admin) payload.patient_id = state.patient.patient_id;
      const result = await api("/api/appointments", {
        method: "POST",
        headers: { "X-CSRFToken": state.csrf },
        body: JSON.stringify(payload),
      });
      if (admin) {
        window.location.assign(`/appointments/?created=${encodeURIComponent(result.appointment.appointment_id)}`);
      } else {
        window.location.assign(`/appointments/${encodeURIComponent(result.appointment.appointment_id)}`);
      }
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
    }
  }

  async function enterStep(key) {
    showMessage("");
    if (key === "specialty") await loadSpecialties();
    if (key === "doctor") await loadDoctors($("#doctor-search").value);
    if (key === "datetime") await loadCalendar();
    render();
  }

  $("#booking-previous").addEventListener("click", async () => {
    if (state.index === 0) {
      if (root.dataset.modal === "true") return closeModal();
      return window.location.assign(root.dataset.backUrl);
    }
    state.index -= 1;
    await enterStep(currentStep());
  });
  $("#booking-next").addEventListener("click", async () => {
    if (!canContinue()) return;
    state.index += 1;
    await enterStep(currentStep());
  });
  $("#booking-confirm").addEventListener("click", confirmBooking);
  const closeButton = $("#booking-close");
  if (closeButton) closeButton.addEventListener("click", closeModal);
  const modal = document.getElementById("booking-modal");
  const openButton = document.getElementById("open-booking-modal");
  if (modal && openButton) {
    openButton.addEventListener("click", () => {
      modal.hidden = false;
      document.body.classList.add("booking-modal-open");
      window.setTimeout(() => $("#patient-search")?.focus(), 0);
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeModal();
    });
  }
  root.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.type;
      state.specialty = "";
      state.doctor = null;
      state.date = "";
      state.slot = null;
      root.querySelectorAll("[data-type]").forEach((choice) => choice.classList.toggle("selected", choice === button));
      render();
    });
  });
  $("#appointment-duration").addEventListener("change", async (event) => {
    state.duration = Number(event.target.value);
    state.date = "";
    state.slot = null;
    await loadCalendar();
    render();
  });
  $("#month-prev").addEventListener("click", async () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    state.date = "";
    state.slot = null;
    await loadCalendar();
  });
  $("#month-next").addEventListener("click", async () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    state.date = "";
    state.slot = null;
    await loadCalendar();
  });

  let searchTimer;
  const doctorSearch = $("#doctor-search");
  doctorSearch.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => loadDoctors(doctorSearch.value), 220);
  });
  if (admin) {
    const patientSearch = $("#patient-search");
    patientSearch.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => loadPatients(patientSearch.value), 220);
    });
  }
  if (admin) $("#appointment-reason").addEventListener("input", render);

  async function initialize() {
    try {
      const [csrf] = await Promise.all([api("/api/csrf")]);
      state.csrf = csrf.csrf_token;
      if (!admin) {
        const result = await api("/api/portal/me");
        state.profile = result.profile;
        if (!state.profile) throw new Error("Tài khoản chưa có hồ sơ bệnh nhân.");
        renderPatientProfile();
        const initialSchedule = root.dataset.initialSchedule;
        if (initialSchedule) {
          const options = new URLSearchParams({ schedule_id: initialSchedule, duration: String(state.duration) });
          const available = await api(`/api/appointments/options?${options}`);
          const doctor = available.doctors[0];
          const preferredTime = root.dataset.initialTime.slice(0, 16);
          const slot = available.slots.find((item) => item.starts_at === preferredTime) || available.slots[0];
          if (doctor && slot) {
            state.type = "In-person";
            state.specialty = doctor.subtype === "GENERAL_PRACTITIONER" ? "__gp__" : doctor.specialty_id;
            state.doctor = doctor;
            state.date = slot.starts_at.slice(0, 10);
            state.slot = slot;
            state.month = new Date(`${state.date}T12:00:00`);
            state.month.setDate(1);
          }
        }
      }
      render();
    } catch (error) {
      showMessage(error.message);
      $("#booking-next").disabled = true;
    }
  }

  initialize();
})();
