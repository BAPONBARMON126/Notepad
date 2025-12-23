/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

/* =========================================================
   SAVE INDICATOR (SAFE)
========================================================= */
function showSaving() {
  const el = document.getElementById("save-indicator");
  if (el) {
    el.textContent = "⏳ Saving…";
    el.style.opacity = "1";
  }
}
function showSaved() {
  const el = document.getElementById("save-indicator");
  if (el) {
    el.textContent = "✅ Saved";
    setTimeout(() => (el.style.opacity = "0"), 1200);
  }
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
   RENDER NOTES LIST
========================================================= */
function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const pinned = notes.filter(n => n.pinned);
  const normal = notes.filter(n => !n.pinned);
  [...pinned, ...normal].forEach(note => {
    const div = document.createElement("div");
    div.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    div.onclick = () => openNote(note.id);

    div.innerHTML = `
      <div style="flex:1">
        <strong>${note.title || "Untitled"}</strong><br>
        <small>${note.updated || ""}</small>
      </div>
      <span onclick="event.stopPropagation();togglePin('${note.id}')">
        ${note.pinned ? "📌" : "📍"}
      </span>
      <span onclick="event.stopPropagation();deleteNote('${note.id}')">🗑️</span>
    `;
    list.appendChild(div);
  });
}

/* =========================================================
   ADD NEW NOTE (SIDEBAR)
========================================================= */
function addNewNote() {
  const title = prompt("Enter note title");
  if (!title) return;

  activeNoteId = null;
  document.getElementById("note-title").value = title;
  document.getElementById("rich-editor").innerHTML = "";
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
   SAVE NOTE (FINAL SAFE VERSION)
========================================================= */
async function saveNote(showAlert = true) {
  const titleEl = document.getElementById("note-title");
  const editorEl = document.getElementById("rich-editor");

  const title = titleEl.value.trim();
  const content = editorEl.innerHTML.trim();

  if (!title && !content) return;

  showSaving();

  // CREATE NOTE IF NONE ACTIVE
  if (!activeNoteId) {
    const newNote = {
      id: "note-" + Date.now(),
      title: title || "Untitled",
      content: content,
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
   AUTO SAVE (SAFE)
========================================================= */
function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1200);
}
document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

/* =========================================================
   DELETE / PIN
========================================================= */
async function deleteNote(id) {
  if (!confirm("Delete note?")) return;
  await fetch(`${BACKEND_URL}/api/delete/${id}`, { method: "DELETE" });
  notes = notes.filter(n => n.id !== id);
  if (activeNoteId === id) activeNoteId = null;
  renderNotesList();
}

function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  saveNote(false);
                     }
