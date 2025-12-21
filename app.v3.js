/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;
let currentView = "home"; // home | editor

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
   LOAD NOTES
========================================================= */
async function loadNotes() {
  try {
    const r = await fetch(BACKEND_URL + "/api/index");
    notes = await r.json();
    renderNotesList();
    renderHomeGrid();
  } catch (e) {
    console.error("Failed to load notes", e);
  }
}
loadNotes();

/* =========================================================
   SIDEBAR TOGGLE
========================================================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =========================================================
   RENDER SIDEBAR LIST (PINNED TOP)
========================================================= */
function renderNotesList() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const ordered = [
    ...notes.filter(n => n.pinned),
    ...notes.filter(n => !n.pinned)
  ];

  ordered.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    div.style.userSelect = "none";

    const title = document.createElement("strong");
    title.textContent = note.title || "Untitled";

    const pin = document.createElement("span");
    pin.textContent = note.pinned ? " 📌" : "";
    pin.style.float = "right";

    div.appendChild(title);
    div.appendChild(pin);

    div.onclick = () => openNote(note.id);

    list.appendChild(div);
  });
}

/* =========================================================
   HOME GRID VIEW (NEW)
========================================================= */
function renderHomeGrid() {
  const editor = document.querySelector(".editor");
  editor.innerHTML = "";

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px,1fr))";
  grid.style.gap = "15px";
  grid.style.padding = "20px";
  grid.style.overflowY = "auto";

  const ordered = [
    ...notes.filter(n => n.pinned),
    ...notes.filter(n => !n.pinned)
  ];

  ordered.forEach(note => {
    const card = document.createElement("div");
    card.style.border = "1px solid #ddd";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.background = "#fff";
    card.style.cursor = "pointer";

    const t = document.createElement("div");
    t.innerHTML = `<strong>${note.title || "Untitled"}</strong>`;
    t.style.marginBottom = "6px";

    const c = document.createElement("div");
    c.innerText = (note.content || "")
      .replace(/<[^>]*>/g, "")
      .slice(0, 120);
    c.style.fontSize = "14px";
    c.style.color = "#555";

    if (note.pinned) {
      const p = document.createElement("div");
      p.textContent = "📌";
      p.style.textAlign = "right";
      card.appendChild(p);
    }

    card.appendChild(t);
    card.appendChild(c);

    card.onclick = () => openNote(note.id);

    grid.appendChild(card);
  });

  editor.appendChild(grid);
  currentView = "home";
}

/* =========================================================
   OPEN NOTE (EDITOR VIEW)
========================================================= */
async function openNote(id) {
  try {
    activeNoteId = id;
    const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
    const note = await r.json();

    const editor = document.querySelector(".editor");
    editor.innerHTML = `
      <div class="editor-header">
        <div class="icon-btn" onclick="renderHomeGrid()">←</div>
        <div class="toolbar">
          <div class="icon-btn" onclick="applyFormat('bold')"><b>B</b></div>
          <div class="icon-btn" onclick="applyFormat('italic')"><i>I</i></div>
          <div class="icon-btn" onclick="applyFormat('underline')"><u>U</u></div>
          <div class="icon-btn" onclick="saveNote()">💾</div>
        </div>
      </div>
      <input id="note-title" value="${note.title || ""}" placeholder="Note title">
      <div id="rich-editor" contenteditable="true">${note.content || ""}</div>
    `;

    document.getElementById("note-title").addEventListener("input", autoSave);
    document.getElementById("rich-editor").addEventListener("input", autoSave);

    renderNotesList();
    currentView = "editor";

    if (window.innerWidth <= 768) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("mobileOverlay").classList.remove("active");
    }
  } catch {
    alert("Failed to load note");
  }
}

/* =========================================================
   ADD NEW NOTE
========================================================= */
function addNewNote() {
  const title = prompt("Enter note title");
  if (!title) return;

  const note = {
    id: "note-" + Date.now(),
    title,
    content: "",
    pinned: false,
    updated: new Date().toLocaleString()
  };

  notes.unshift(note);
  saveRaw(note);
  openNote(note.id);
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

  saveRaw(note);
  renderNotesList();
  if (showAlert) toast("Saved");
}

function saveRaw(note) {
  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });
}

/* =========================================================
   AUTO SAVE
========================================================= */
function autoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1000);
}

/* =========================================================
   PIN / UNPIN
========================================================= */
function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  note.pinned = !note.pinned;
  saveRaw(note);
  renderNotesList();
  renderHomeGrid();
}

/* =========================================================
   TEXT FORMAT
========================================================= */
function applyFormat(cmd) {
  document.execCommand(cmd, false, null);
}

/* =========================================================
   TOAST (CUSTOM POPUP)
========================================================= */
function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.bottom = "30px";
  t.style.right = "30px";
  t.style.background = "#323232";
  t.style.color = "#fff";
  t.style.padding = "12px 18px";
  t.style.borderRadius = "8px";
  t.style.zIndex = 9999;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
  }
