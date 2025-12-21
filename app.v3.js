/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

/* =========================================================
   STYLISH TOAST POPUP (CUSTOM)
========================================================= */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.textContent = message;

  toast.style.position = "fixed";
  toast.style.bottom = "25px";
  toast.style.right = "25px";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "10px";
  toast.style.fontSize = "14px";
  toast.style.color = "#fff";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,.25)";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(15px)";
  toast.style.transition = "all .3s ease";
  toast.style.background =
    type === "delete" ? "#d32f2f" : "#2e7d32";

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(15px)";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/* =========================================================
   CONNECTION INDICATOR
========================================================= */
const indicator = document.getElementById("conn-indicator");

async function pingBackend() {
  try {
    indicator.className = "conn-spinner";
    indicator.innerHTML = "";
    await fetch(BACKEND_URL + "/", { cache: "no-store" });
    indicator.className = "conn-online";
    indicator.innerHTML = "✓";
  } catch {
    indicator.className = "conn-spinner";
    indicator.innerHTML = "";
  }
}
pingBackend();
setInterval(pingBackend, 25000);

/* =========================================================
   SIDEBAR (MOBILE)
========================================================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =========================================================
   LOAD NOTES
========================================================= */
async function loadNotes() {
  try {
    const r = await fetch(BACKEND_URL + "/api/index");
    notes = await r.json();
    renderNotesList();
  } catch (e) {
    console.error("Failed to load notes", e);
  }
}
loadNotes();

/* =========================================================
   RENDER NOTES LIST (PINNED ON TOP)
========================================================= */
function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const pinnedNotes = notes.filter(n => n.pinned === true);
  const normalNotes = notes.filter(n => !n.pinned);
  const orderedNotes = [...pinnedNotes, ...normalNotes];

  orderedNotes.forEach(note => {
    const div = document.createElement("div");
    div.className =
      "note-item" + (note.id === activeNoteId ? " active" : "");
    div.style.userSelect = "none"; // 🔴 TEXT SELECTION FIX
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";

    const info = document.createElement("div");
    info.style.flex = "1";
    info.innerHTML = `
      <strong>${note.title || "Untitled"}</strong><br>
      <small>${note.updated || ""}</small>
    `;

    /* 📌 PIN ICON */
    const pinBtn = document.createElement("span");
    pinBtn.innerHTML = note.pinned ? "📌" : "📍";
    pinBtn.title = note.pinned ? "Unpin note" : "Pin note";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.fontSize = "22px";
    pinBtn.style.marginRight = "10px";

    pinBtn.onclick = (e) => {
      e.stopPropagation();
      togglePin(note.id);
    };

    /* 🗑️ DELETE */
    const del = document.createElement("span");
    del.innerHTML = "🗑️";
    del.style.cursor = "pointer";
    del.title = "Delete note";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    };

    div.onclick = () => openNote(note.id);

    div.appendChild(info);
    div.appendChild(pinBtn);
    div.appendChild(del);
    list.appendChild(div);
  });
}

/* =========================================================
   ADD NEW NOTE
========================================================= */
function addNewNote() {
  const title = prompt("Enter note title");
  if (!title || !title.trim()) return;

  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  const newNote = {
    id,
    title: title.trim(),
    content: "",
    updated: now,
    pinned: false
  };

  notes.unshift(newNote);
  activeNoteId = id;

  document.getElementById("note-title").value = newNote.title;
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
}

/* =========================================================
   OPEN NOTE
========================================================= */
async function openNote(id) {
  try {
    activeNoteId = id;

    const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
    const note = await r.json();

    document.getElementById("note-title").value = note.title || "";
    document.getElementById("rich-editor").innerHTML = note.content || "";

    const local = notes.find(n => n.id === id);
    if (local) Object.assign(local, note);

    renderNotesList();

    if (window.innerWidth <= 768) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("mobileOverlay").classList.remove("active");
    }
  } catch {
    alert("Failed to load note");
  }
}

/* =========================================================
   SAVE NOTE
========================================================= */
function saveNote(showAlert = true) {
  if (!activeNoteId) return;

  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  note.title = document.getElementById("note-title").value;
  note.content = document.getElementById("rich-editor").innerHTML;
  note.updated = new Date().toLocaleString();

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
  if (showAlert) showToast("✔ Note saved successfully");
}

/* =========================================================
   AUTO SAVE
========================================================= */
function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1200);
}
document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

/* =========================================================
   DELETE NOTE
========================================================= */
async function deleteNote(id) {
  if (!confirm("Are you sure you want to delete this note?")) return;

  try {
    await fetch(`${BACKEND_URL}/api/delete/${id}`, { method: "DELETE" });
    notes = notes.filter(n => n.id !== id);

    if (activeNoteId === id) {
      activeNoteId = null;
      document.getElementById("note-title").value = "";
      document.getElementById("rich-editor").innerHTML = "";
    }

    renderNotesList();
    showToast("🗑️ Note deleted successfully", "delete");
  } catch {
    alert("Failed to delete note");
  }
}

/* =========================================================
   PIN / UNPIN
========================================================= */
function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updated = new Date().toLocaleString();

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
}

/* =========================================================
   TEXT FORMAT
========================================================= */
function applyFormat(cmd) {
  document.getElementById("rich-editor").focus();
  document.execCommand(cmd, false, null);
}

/* =========================================================
   FIND TEXT
========================================================= */
function toggleFind() {
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function findText() {
  const input = document.getElementById("findInput").value.toLowerCase();
  const editor = document.getElementById("rich-editor");

  removeHighlights();
  if (!input) return;

  const regex = new RegExp(`(${input})`, "gi");
  editor.innerHTML = editor.innerHTML.replace(
    regex,
    `<span class="find-highlight">$1</span>`
  );
}

function removeHighlights() {
  const editor = document.getElementById("rich-editor");
  editor.querySelectorAll(".find-highlight").forEach(span => {
    span.replaceWith(span.textContent);
  });
}
