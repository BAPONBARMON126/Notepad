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
  } catch (e) {
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
   LOAD NOTES LIST
========================================================= */

async function loadNotes() {
  try {
    const r = await fetch(BACKEND_URL + "/api/index");
    notes = await r.json();
    renderNotesList();
  } catch (e) {
    console.error("Failed to load notes list");
  }
}

loadNotes();

/* =========================================================
   RENDER NOTES LIST
========================================================= */

function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  notes.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    div.innerHTML = `
      <strong>${note.title || "Untitled"}</strong><br>
      <small>${note.updated || ""}</small>
    `;
    div.onclick = () => openNote(note.id);
    list.appendChild(div);
  });
}

/* =========================================================
   ADD NEW NOTE
========================================================= */

function addNewNote() {
  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  notes.unshift({
    id,
    title: "",
    updated: now
  });

  activeNoteId = id;

  document.getElementById("note-title").value = "";
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
  saveNote();
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
    document.getElementById("rich-editor").focus();
  } catch (e) {
    alert("Failed to load note");
  }
}

/* =========================================================
   SAVE NOTE
========================================================= */

function saveNote() {
  if (!activeNoteId) return;

  const title = document.getElementById("note-title").value;
  const content = document.getElementById("rich-editor").innerHTML;
  const updated = new Date().toLocaleString();

  const noteData = {
    id: activeNoteId,
    title,
    content,
    updated
  };

  const idx = notes.findIndex(n => n.id === activeNoteId);
  if (idx !== -1) {
    notes[idx].title = title;
    notes[idx].updated = updated;
  }

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noteData)
  });

  renderNotesList();
}

/* =========================================================
   AUTO SAVE
========================================================= */

function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveNote, 1200);
}

document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

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
  const spans = editor.querySelectorAll(".find-highlight");

  spans.forEach(span => {
    span.replaceWith(span.textContent);
  });
}

/* =========================================================
   CLICK OUTSIDE FIND BOX CLOSE
========================================================= */

document.addEventListener("click", e => {
  if (
    !e.target.closest(".find-box") &&
    !e.target.closest(".fa-magnifying-glass")
  ) {
    document.getElementById("findBox").style.display = "none";
  }
});
