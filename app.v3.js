/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

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
   RENDER NOTES LIST
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

    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.userSelect = "none";

    const info = document.createElement("div");
    info.style.flex = "1";
    info.style.userSelect = "none";
    info.innerHTML = `
      <strong>${note.title || "Untitled"}</strong><br>
      <small>${note.updated || ""}</small>
    `;

    const pinBtn = document.createElement("span");
    pinBtn.innerHTML = note.pinned ? "📌" : "📍";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.fontSize = "22px";
    pinBtn.style.marginRight = "10px";
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      togglePin(note.id);
    };

    const del = document.createElement("span");
    del.innerHTML = "🗑️";
    del.style.cursor = "pointer";
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
   ADD NEW NOTE (SIDEBAR)
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

  saveNote(false);
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
    if (local) {
      local.title = note.title;
      local.content = note.content;
      local.pinned = note.pinned;
      local.updated = note.updated;
    }

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
   SAVE NOTE (🔥 HOME SCREEN FIX INCLUDED)
========================================================= */
function saveNote(showAlert = true) {
  const titleEl = document.getElementById("note-title");
  const editorEl = document.getElementById("rich-editor");

  const title = titleEl.value.trim();
  const content = editorEl.innerHTML.trim();

  if (!title && !content) return;

  // 🔥 IF NO ACTIVE NOTE → CREATE ONE
  if (!activeNoteId) {
    const id = "note-" + Date.now();
    const now = new Date().toLocaleString();

    const newNote = {
      id,
      title: title || "Untitled",
      content: content,
      updated: now,
      pinned: false
    };

    notes.unshift(newNote);
    activeNoteId = id;
  }

  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;

  note.title = title || "Untitled";
  note.content = content;
  note.updated = new Date().toLocaleString();

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
  if (showAlert) alert("✅ Note saved successfully");
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
  const yes = confirm("Are you sure you want to delete this note?");
  if (!yes) return;

  try {
    await fetch(`${BACKEND_URL}/api/delete/${id}`, { method: "DELETE" });
    notes = notes.filter(n => n.id !== id);

    if (activeNoteId === id) {
      activeNoteId = null;
      document.getElementById("note-title").value = "";
      document.getElementById("rich-editor").innerHTML = "";
    }

    renderNotesList();
    alert("Note deleted successfully");
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
   TEXT FORMATTING
========================================================= */
function applyFormat(cmd) {
  const editor = document.getElementById("rich-editor");
  editor.focus();
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
