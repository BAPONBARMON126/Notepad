/*********************************
 * Cloud Notepad - FINAL app.js
 * Backend: Render
 *********************************/

const BACKEND = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeId = null;
let autoSaveTimer = null;

/* ================= LOAD ALL NOTES ================= */
async function loadNotes() {
  try {
    const r = await fetch(`${BACKEND}/api/index`);
    notes = await r.json();
    if (!Array.isArray(notes)) notes = [];
    renderSidebar();
  } catch (e) {
    alert("Backend not reachable");
  }
}

/* ================= SIDEBAR ================= */
function renderSidebar() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  notes.forEach(n => {
    const div = document.createElement("div");
    div.className = "note-item" + (n.id === activeId ? " active" : "");
    div.innerHTML = `
      <h4>${n.title || "Untitled"}</h4>
      <p style="font-size:11px">${n.updated || ""}</p>
    `;
    div.onclick = () => openNote(n.id);
    list.appendChild(div);
  });
}

/* ================= ADD NEW NOTE ================= */
function addNewNote() {
  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  const note = {
    id,
    title: "",
    content: "",
    updated: now
  };

  notes.unshift({ id, title: "", updated: now });
  activeId = id;

  document.getElementById("note-title").value = "";
  document.getElementById("rich-editor").innerHTML = "";
  renderSidebar();

  saveToServer(note);
}

/* ================= OPEN NOTE ================= */
async function openNote(id) {
  try {
    activeId = id;
    const r = await fetch(`${BACKEND}/api/note/${id}`);
    const note = await r.json();

    document.getElementById("note-title").value = note.title || "";
    document.getElementById("rich-editor").innerHTML = note.content || "";

    renderSidebar();
  } catch {
    alert("Failed to load note");
  }
}

/* ================= SAVE TO SERVER ================= */
async function saveToServer(note) {
  await fetch(`${BACKEND}/api/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });
}

/* ================= MANUAL SAVE ================= */
function saveNote() {
  if (!activeId) {
    alert("No note selected");
    return;
  }

  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("rich-editor").innerHTML;
  const updated = new Date().toLocaleString();

  const note = {
    id: activeId,
    title: title || "Untitled",
    content,
    updated
  };

  const i = notes.findIndex(n => n.id === activeId);
  if (i !== -1) {
    notes[i] = { id: activeId, title: note.title, updated };
  }

  renderSidebar();
  saveToServer(note);

  alert("Saved to cloud ☁️");
}

/* ================= AUTO SAVE ================= */
function setupAutoSave() {
  const title = document.getElementById("note-title");
  const editor = document.getElementById("rich-editor");

  function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      if (activeId) saveNoteSilently();
    }, 1200);
  }

  title.addEventListener("input", triggerAutoSave);
  editor.addEventListener("input", triggerAutoSave);
}

function saveNoteSilently() {
  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("rich-editor").innerHTML;
  const updated = new Date().toLocaleString();

  const note = {
    id: activeId,
    title: title || "Untitled",
    content,
    updated
  };

  const i = notes.findIndex(n => n.id === activeId);
  if (i !== -1) {
    notes[i] = { id: activeId, title: note.title, updated };
  }

  renderSidebar();
  saveToServer(note);
}

/* ================= FIND TEXT ================= */
function toggleFind() {
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function findText() {
  const q = document.getElementById("findInput").value;
  const editor = document.getElementById("rich-editor");

  if (q.length < 2) {
    editor.innerHTML = editor.innerText;
    return;
  }

  editor.innerHTML = editor.innerText.replaceAll(
    q,
    `<span class="find-highlight">${q}</span>`
  );
}

/* ================= TEXT FORMAT ================= */
function applyFormat(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById("rich-editor").focus();
}

/* ================= MOBILE SIDEBAR ================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* ================= INIT ================= */
loadNotes();
setupAutoSave();
