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
   SIDEBAR (MOBILE TOGGLE)
========================================================= */

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =========================================================
   LOAD NOTES LIST ON PAGE LOAD
========================================================= */

async function loadNotes() {
  try {
    const r = await fetch(BACKEND_URL + "/api/index");
    notes = await r.json();
    renderNotesList();
  } catch {
    console.error("Failed to load notes list");
  }
}

loadNotes();

/* =========================================================
   RENDER NOTES LIST (PINNED FIRST)
========================================================= */

function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  // 📌 pinned notes first
  const pinnedNotes = notes.filter(n => n.pinned);
  const normalNotes = notes.filter(n => !n.pinned);
  const finalNotes = [...pinnedNotes, ...normalNotes];

  finalNotes.forEach(note => {
    const div = document.createElement("div");
    div.className =
      "note-item" + (note.id === activeNoteId ? " active" : "");

    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";

    const info = document.createElement("div");
    info.innerHTML = `
      <strong>${note.title || "Untitled"}</strong>
      ${note.pinned ? " 📌" : ""}
      <br>
      <small>${note.updated || ""}</small>
    `;

    const del = document.createElement("span");
    del.innerHTML = "🗑️";
    del.style.cursor = "pointer";
    del.title = "Delete note";

    del.onclick = (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    };

    // LEFT CLICK → open note
    div.onclick = () => openNote(note.id);

    // RIGHT CLICK / LONG PRESS → pin / unpin
    div.oncontextmenu = (e) => {
      e.preventDefault();
      togglePin(note.id);
    };

    div.appendChild(info);
    div.appendChild(del);
    list.appendChild(div);
  });
}

/* =========================================================
   ADD NEW NOTE (TITLE FIRST)
========================================================= */

function addNewNote() {
  const title = prompt("Enter note title");
  if (!title || !title.trim()) return;

  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  notes.unshift({
    id,
    title: title.trim(),
    updated: now,
    pinned: false
  });

  activeNoteId = id;

  document.getElementById("note-title").value = title.trim();
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
}

/* =========================================================
   OPEN NOTE (AUTO CLOSE SIDEBAR ON MOBILE)
========================================================= */

async function openNote(id) {
  try {
    activeNoteId = id;

    const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
    const note = await r.json();

    document.getElementById("note-title").value = note.title || "";
    document.getElementById("rich-editor").innerHTML = note.content || "";

    // ensure pinned state sync
    const local = notes.find(n => n.id === id);
    if (local) local.pinned = note.pinned || false;

    renderNotesList();
    document.getElementById("rich-editor").focus();

    if (window.innerWidth <= 768) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("mobileOverlay").classList.remove("active");
    }

  } catch {
    alert("Failed to load note");
  }
}

/* =========================================================
   DELETE NOTE
========================================================= */

async function deleteNote(id) {
  const yes = confirm("Are you sure you want to delete this note?");
  if (!yes) return;

  try {
    await fetch(`${BACKEND_URL}/api/delete/${id}`, {
      method: "DELETE"
    });

    notes = notes.filter(n => n.id !== id);

    if (activeNoteId === id) {
      activeNoteId = null;
      document.getElementById("note-title").value = "";
      document.getElementById("rich-editor").innerHTML = "";
    }

    renderNotesList();
    alert("🗑️ Note deleted successfully");
  } catch {
    alert("Failed to delete note");
  }
}

/* =========================================================
   SAVE NOTE (MANUAL)
========================================================= */

function saveNote(showAlert = true) {
  if (!activeNoteId) {
    alert("No note selected");
    return;
  }

  const title = document.getElementById("note-title").value;
  const content = document.getElementById("rich-editor").innerHTML;
  const updated = new Date().toLocaleString();

  const pinned =
    notes.find(n => n.id === activeNoteId)?.pinned || false;

  const noteData = {
    id: activeNoteId,
    title,
    content,
    updated,
    pinned
  };

  const idx = notes.findIndex(n => n.id === activeNoteId);
  if (idx !== -1) {
    notes[idx].title = title;
    notes[idx].updated = updated;
    notes[idx].pinned = pinned;
  }

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noteData)
  });

  renderNotesList();

  if (showAlert) {
    alert("✅ Note saved successfully");
  }
}

/* =========================================================
   AUTO SAVE (NO POPUP)
========================================================= */

function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1200);
}

document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

/* =========================================================
   TEXT FORMATTING (UNCHANGED)
========================================================= */

function applyFormat(cmd) {
  const editor = document.getElementById("rich-editor");
  editor.focus();
  document.execCommand(cmd, false, null);
}

/* =========================================================
   PIN / UNPIN (PERMANENT)
========================================================= */

function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note.pinned = !note.pinned;

  // save pin state to backend
  saveNote(false);

  alert(note.pinned ? "📌 Note pinned" : "📌 Note unpinned");
}

/* =========================================================
   FIND TEXT
========================================================= */

function toggleFind() {
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
  if (box.style.display === "block") {
    document.getElementById("findInput").focus();
  }
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

/* =========================================================
   CLOSE FIND BOX ON OUTSIDE CLICK
========================================================= */

document.addEventListener("click", e => {
  if (
    !e.target.closest(".find-box") &&
    !e.target.closest(".fa-magnifying-glass")
  ) {
    document.getElementById("findBox").style.display = "none";
  }
});
