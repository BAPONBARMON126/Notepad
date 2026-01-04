/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-delta.vercel.app/";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

/* =========================================================
   SAVE INDICATOR
========================================================= */
function showSaving() {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  el.textContent = "⏳ Saving…";
  el.style.opacity = "1";
}
function showSaved() {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  el.textContent = "✅ Saved";
  setTimeout(() => (el.style.opacity = "0"), 1200);
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
   SIDEBAR
========================================================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("mobileOverlay").classList.remove("active");
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
   RENDER NOTES LIST (TITLE TOP, PIN–DATE–DELETE BELOW)
========================================================= */
function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const pinned = notes.filter(n => n.pinned);
  const normal = notes.filter(n => !n.pinned);
  [...pinned, ...normal].forEach(note => {
    const row = document.createElement("div");
    row.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    row.style.userSelect = "none";
    row.style.padding = "8px 10px";

    row.onclick = () => {
      openNote(note.id);
      if (window.innerWidth <= 900) closeSidebar();
    };

    /* TITLE */
    const title = document.createElement("div");
    title.innerHTML = `<strong>${note.title || "Untitled"}</strong>`;

    /* META ROW */
    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.alignItems = "center";
    meta.style.justifyContent = "space-between";
    meta.style.marginTop = "4px";
    meta.style.fontSize = "12px";
    meta.style.opacity = "0.8";

    /* PIN (LEFT) */
    const pin = document.createElement("span");
    pin.innerHTML = note.pinned ? "📌" : "📍";
    pin.style.cursor = "pointer";
    pin.style.userSelect = "none";
    pin.onclick = (e) => {
      e.stopPropagation();
      togglePinOnly(note.id);
    };

    /* DATE (CENTER) */
    const date = document.createElement("span");
    date.textContent = note.updated || "";

    /* DELETE (RIGHT) */
    const del = document.createElement("span");
    del.innerHTML = "🗑️";
    del.style.cursor = "pointer";
    del.style.userSelect = "none";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    };

    meta.appendChild(pin);
    meta.appendChild(date);
    meta.appendChild(del);

    row.appendChild(title);
    row.appendChild(meta);
    list.appendChild(row);
  });
}

/* =========================================================
   ADD NEW NOTE
========================================================= */
function addNewNote() {
  const title = prompt("Enter note title");
  if (!title || !title.trim()) return;

  activeNoteId = null;
  document.getElementById("note-title").value = title.trim();
  document.getElementById("rich-editor").innerHTML = "";
  if (window.innerWidth <= 900) closeSidebar();
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

    renderNotesList();
  } catch {
    alert("Failed to load note");
  }
}

/* =========================================================
   SAVE NOTE (ONLY FOR SAVE BUTTON / AUTOSAVE)
========================================================= */
async function saveNote(showAlert = true) {
  const titleEl = document.getElementById("note-title");
  const editorEl = document.getElementById("rich-editor");

  const title = titleEl.value.trim();
  const content = editorEl.innerHTML.trim();

  if (!title && !content) {
    alert("❗ First write something");
    return;
  }

  showSaving();

  if (!activeNoteId) {
    const newNote = {
      id: "note-" + Date.now(),
      title: title || "Untitled",
      content,
      updated: new Date().toLocaleString(),
      pinned: false
    };
    notes.unshift(newNote);
    activeNoteId = newNote.id;
  }

  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  note.title = title || "Untitled";
  note.content = content;
  note.updated = new Date().toLocaleString();

  await fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
  showSaved();
  if (showAlert) alert("Note saved successfully");
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
   DELETE
========================================================= */
async function deleteNote(id) {
  if (!confirm("Delete note?")) return;
  await fetch(`${BACKEND_URL}/api/delete/${id}`, { method: "DELETE" });
  notes = notes.filter(n => n.id !== id);
  if (activeNoteId === id) {
    activeNoteId = null;
    document.getElementById("note-title").value = "";
    document.getElementById("rich-editor").innerHTML = "";
  }
  renderNotesList();
}

/* =========================================================
   PIN / UNPIN (NO SAVE WARNING)
========================================================= */
async function togglePinOnly(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updated = new Date().toLocaleString();

  await fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
}
