const form = document.getElementById("birthday-form");
const nameInput = document.getElementById("name");
const dateInput = document.getElementById("date");
const list = document.getElementById("birthday-list");
const emptyState = document.getElementById("empty-state");
const clearAllButton = document.getElementById("clear-all");
const exportJsonButton = document.getElementById("export-json");
const exportCsvButton = document.getElementById("export-csv");
const importJsonInput = document.getElementById("import-json");
const importCsvInput = document.getElementById("import-csv");
const notifyWindowSelect = document.getElementById("notify-window");
const enableNotificationsButton = document.getElementById("enable-notifications");
const toast = document.getElementById("toast");
const template = document.getElementById("birthday-item");

const STORAGE_KEY = "birthday-reminder.items";
const NOTIFY_KEY = "birthday-reminder.last-notified";
const NOTIFY_WINDOW_KEY = "birthday-reminder.notify-window";

let toastTimer = null;

const loadBirthdays = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBirthdays = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const normalizeDate = (dateString) => {
  const date = new Date(dateString + "T00:00:00");
  return {
    full: dateString,
    month: date.getMonth(),
    day: date.getDate(),
    year: date.getFullYear(),
  };
};

const getNextOccurrence = (item, today = new Date()) => {
  const currentYear = today.getFullYear();
  let next = new Date(currentYear, item.month, item.day);

  if (next < startOfDay(today)) {
    next = new Date(currentYear + 1, item.month, item.day);
  }

  return next;
};

const startOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (date) => {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
};

const formatCountdown = (days) => {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
};

const formatAge = (item, nextDate) => {
  if (!item.year || Number.isNaN(item.year)) return null;
  const age = nextDate.getFullYear() - item.year;
  return `Turns ${age}`;
};

const getNotifyWindow = () => {
  const stored = Number(localStorage.getItem(NOTIFY_WINDOW_KEY));
  return [7, 14, 30].includes(stored) ? stored : 30;
};

const setNotifyWindow = (value) => {
  localStorage.setItem(NOTIFY_WINDOW_KEY, String(value));
};

const updateNotificationButton = () => {
  if (!("Notification" in window)) {
    enableNotificationsButton.style.display = "none";
    return;
  }

  if (Notification.permission === "granted") {
    enableNotificationsButton.textContent = "Notifications on";
    enableNotificationsButton.disabled = true;
    return;
  }

  enableNotificationsButton.textContent = "Enable notifications";
  enableNotificationsButton.disabled = false;
};

const maybeSendNotification = (sorted) => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today = startOfDay(new Date());
  const todayKey = today.toISOString().slice(0, 10);
  if (localStorage.getItem(NOTIFY_KEY) === todayKey) return;

  const windowDays = getNotifyWindow();
  const upcoming = sorted.filter((item) => item.daysAway <= windowDays).slice(0, 3);
  if (upcoming.length === 0) return;

  const lines = upcoming.map((item) => {
    const ageText = formatAge(item, item.next);
    const ageSuffix = ageText ? ` · ${ageText}` : "";
    return `${item.name} — ${formatDate(item.next)} (${formatCountdown(item.daysAway)})${ageSuffix}`;
  });

  new Notification("Upcoming birthdays", {
    body: lines.join("\n"),
  });

  localStorage.setItem(NOTIFY_KEY, todayKey);
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
};

const makeKey = (item) => {
  const base = `${item.name}`.trim().toLowerCase();
  const year = item.year ? String(item.year) : "";
  return `${base}|${item.month}|${item.day}|${year}`;
};

const mergeDeduped = (existing, incoming) => {
  const map = new Map();
  for (const item of existing) {
    map.set(makeKey(item), item);
  }
  let skipped = 0;
  for (const item of incoming) {
    const key = makeKey(item);
    if (map.has(key)) {
      skipped += 1;
    } else {
      map.set(key, item);
    }
  }
  return { merged: Array.from(map.values()), skipped };
};

const buildDateString = (item) => {
  const year = item.year || new Date().getFullYear();
  const month = String(item.month + 1).padStart(2, "0");
  const day = String(item.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const render = () => {
  const items = loadBirthdays();
  list.innerHTML = "";

  if (items.length === 0) {
    emptyState.style.display = "block";
    updateNotificationButton();
    return;
  }

  emptyState.style.display = "none";

  const today = startOfDay(new Date());

  const sorted = items
    .map((item) => {
      const next = getNextOccurrence(item, today);
      const daysAway = Math.round((next - today) / (1000 * 60 * 60 * 24));
      return { ...item, next, daysAway };
    })
    .sort((a, b) => a.daysAway - b.daysAway);

  for (const item of sorted) {
    const clone = template.content.cloneNode(true);
    const row = clone.querySelector(".item");
    const nameEl = clone.querySelector(".item__name");
    const metaEl = clone.querySelector(".item__meta");
    const editWrap = clone.querySelector(".item__edit");
    const editName = clone.querySelector(".edit-name");
    const editDate = clone.querySelector(".edit-date");
    const saveEdit = clone.querySelector(".save-edit");
    const cancelEdit = clone.querySelector(".cancel-edit");
    const editBtn = clone.querySelector(".edit");
    const removeBtn = clone.querySelector(".remove");

    nameEl.textContent = item.name;
    const ageText = formatAge(item, item.next);
    metaEl.textContent = `${formatDate(item.next)} · ${formatCountdown(item.daysAway)}${ageText ? ` · ${ageText}` : ""}`;

    editBtn.addEventListener("click", () => {
      editName.value = item.name;
      editDate.value = buildDateString(item);
      editWrap.hidden = false;
      editName.focus();
    });

    cancelEdit.addEventListener("click", () => {
      editWrap.hidden = true;
    });

    saveEdit.addEventListener("click", () => {
      const updatedName = editName.value.trim();
      const updatedDate = editDate.value;
      if (!updatedName || !updatedDate) return;

      const normalized = normalizeDate(updatedDate);
      const updated = loadBirthdays().map((b) =>
        b.id === item.id
          ? {
              ...b,
              name: updatedName,
              month: normalized.month,
              day: normalized.day,
              year: normalized.year,
            }
          : b
      );
      saveBirthdays(updated);
      render();
    });

    removeBtn.addEventListener("click", () => {
      const updated = loadBirthdays().filter((b) => b.id !== item.id);
      saveBirthdays(updated);
      render();
    });

    list.appendChild(row);
  }

  updateNotificationButton();
  maybeSendNotification(sorted);
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const dateValue = dateInput.value;

  if (!name || !dateValue) return;

  const { month, day, year } = normalizeDate(dateValue);

  const items = loadBirthdays();
  items.push({
    id: crypto.randomUUID(),
    name,
    month,
    day,
    year,
  });

  saveBirthdays(items);
  form.reset();
  nameInput.focus();
  render();
});

clearAllButton.addEventListener("click", () => {
  saveBirthdays([]);
  render();
});

exportJsonButton.addEventListener("click", () => {
  const items = loadBirthdays();
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "birthdays.json";
  a.click();
  URL.revokeObjectURL(url);
});

exportCsvButton.addEventListener("click", () => {
  const items = loadBirthdays();
  const lines = ["name,month,day,year"];
  for (const item of items) {
    const year = item.year ? item.year : "";
    const safeName = String(item.name).replace(/"/g, '""');
    lines.push(`"${safeName}",${item.month},${item.day},${year}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "birthdays.csv";
  a.click();
  URL.revokeObjectURL(url);
});

importJsonInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) return;

    const cleaned = incoming
      .filter((item) => item && item.name && Number.isInteger(item.month) && Number.isInteger(item.day))
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: String(item.name),
        month: Number(item.month),
        day: Number(item.day),
        year: item.year ? Number(item.year) : undefined,
      }));

    const existing = loadBirthdays();
    const { merged, skipped } = mergeDeduped(existing, cleaned);
    saveBirthdays(merged);
    render();

    if (skipped > 0) {
      showToast(`Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`);
    }
  } catch {
    // Ignore invalid JSON
  } finally {
    importJsonInput.value = "";
  }
});

const parseCsvRows = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("name") && (header.includes("month") || header.includes("date"));
  const startIndex = hasHeader ? 1 : 0;
  const rows = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const parts = lines[i].split(",");
    rows.push(parts.map((part) => part.replace(/^"|"$/g, "").trim()));
  }

  return rows;
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

importCsvInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCsvRows(text);
    const incoming = [];

    for (const row of rows) {
      if (row.length < 2) continue;

      if (isIsoDate(row[1])) {
        const [name, dateValue] = row;
        if (!name) continue;
        const normalized = normalizeDate(dateValue);
        incoming.push({
          id: crypto.randomUUID(),
          name: String(name),
          month: normalized.month,
          day: normalized.day,
          year: normalized.year,
        });
        continue;
      }

      if (row.length >= 4) {
        const [name, month, day, year] = row;
        incoming.push({
          id: crypto.randomUUID(),
          name: String(name),
          month: Number(month),
          day: Number(day),
          year: year ? Number(year) : undefined,
        });
      } else {
        const [name, dateValue, year] = row;
        if (!name || !dateValue) continue;
        const normalized = normalizeDate(dateValue);
        incoming.push({
          id: crypto.randomUUID(),
          name: String(name),
          month: normalized.month,
          day: normalized.day,
          year: year ? Number(year) : normalized.year,
        });
      }
    }

    const cleaned = incoming.filter(
      (item) => item.name && Number.isInteger(item.month) && Number.isInteger(item.day)
    );

    const existing = loadBirthdays();
    const { merged, skipped } = mergeDeduped(existing, cleaned);
    saveBirthdays(merged);
    render();

    if (skipped > 0) {
      showToast(`Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`);
    }
  } catch {
    // Ignore invalid CSV
  } finally {
    importCsvInput.value = "";
  }
});

notifyWindowSelect.addEventListener("change", (event) => {
  const value = Number(event.target.value);
  if ([7, 14, 30].includes(value)) {
    setNotifyWindow(value);
  }
});

enableNotificationsButton.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    render();
  }
  updateNotificationButton();
});

notifyWindowSelect.value = String(getNotifyWindow());
render();
