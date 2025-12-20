/***********************
 * Cloud Notepad FINAL
 * app.v4.js
 ***********************/

let notes = [];          // index list
let activeId = null;
let autoSaveTimer = null;

const apiBase =
  `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${NOTES_FOLDER}`;

const encode = (d) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(d))));
const decode = (d) =>
  JSON.parse(decodeURIComponent(escape(atob(d))));

/* ================= LOAD ================= */
async function loadNotes() {
  try {
    const r = await fetch(`${apiBase}/index.json`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const f = await r.json();
    notes = decode(f.content);
    if (!Array.isArray(notes)) notes = [];
  } catch {
    notes = [];
  }
  renderSidebar();
}

/* ================= SIDEBAR ================= */
function renderSidebar() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  notes.forEach(n => {
    const d = document.createElement("div");
    d.className = "note-item" + (n.id === activeId ? " active" : "");
    d.innerHTML = `
      <h4>${n.title || "Untitled"}</h4>
      <p style="font-size:11px">${n.updated || ""}</p>
    `;
    d.onclick = () => openNote(n.id);
    list.appendChild(d);
  });
}

/* ================= CREATE NOTE ================= */
async function createNote() {
  const id = "note-" + Date.now();

  const noteFile = {
    id,
    title: "",
    content: "",
    updated: new Date().toLocaleString()
  };

  // index entry
  notes.unshift({
    id,
    title: "",
    updated: noteFile.updated
  });

  activeId = id;

  // create note file
  await fetch(`${apiBase}/${id}.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "create note",
      content: encode(noteFile)
    })
  });

  await updateIndex();
  renderSidebar();
}

/* ================= ADD NOTE ================= */
async function addNewNote() {
  await createNote();
  document.getElementById("note-title").value = "";
  document.getElementById("rich-editor").innerHTML = "";
  document.getElementById("note-title").focus();
}

/* ================= OPEN NOTE ================= */
async function openNote(id) {
  activeId = id;

  const r = await fetch(`${apiBase}/${id}.json`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();
  const note = decode(f.content);

  document.getElementById("note-title").value = note.title || "";
  document.getElementById("rich-editor").innerHTML = note.content || "";

  renderSidebar();
}

/* ================= SAVE (CORE) ================= */
async function saveCurrentNote(showAlert = false) {
  if (!activeId) await createNote();

  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("rich-editor").innerHTML;

  const r = await fetch(`${apiBase}/${activeId}.json`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();

  const noteFile = {
    id: activeId,
    title: title || "Untitled",
    content,
    updated: new Date().toLocaleString()
  };

  // save note file
  await fetch(`${apiBase}/${activeId}.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "save note",
      content: encode(noteFile),
      sha: f.sha
    })
  });

  // update index entry
  const i = notes.findIndex(n => n.id === activeId);
  notes[i] = {
    id: activeId,
    title: noteFile.title,
    updated: noteFile.updated
  };

  await updateIndex();
  renderSidebar();

  if (showAlert) alert("Saved to cloud ✅");
}

/* ================= MANUAL SAVE ================= */
function saveNote() {
  saveCurrentNote(true);
}

/* ================= AUTO SAVE ================= */
function setupAutoSave() {
  const title = document.getElementById("note-title");
  const editor = document.getElementById("rich-editor");

  function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveCurrentNote(false);
    }, 1500);
  }

  title.addEventListener("input", triggerAutoSave);
  editor.addEventListener("input", triggerAutoSave);
}

/* ================= UPDATE INDEX ================= */
async function updateIndex() {
  const r = await fetch(`${apiBase}/index.json`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();

  await fetch(`${apiBase}/index.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update notes index",
      content: encode(notes),
      sha: f.sha
    })
  });
}

/* ================= FIND ================= */
function toggleFind() {
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function findText() {
  const q = document.getElementById("findInput").value;
  const ed = document.getElementById("rich-editor");
  const text = ed.innerText;

  if (q.length < 2) {
    ed.innerHTML = text;
    return;
  }
  ed.innerHTML = text.replaceAll(
    q,
    `<span class="find-highlight">${q}</span>`
  );
}

/* ================= FORMAT ================= */
function applyFormat(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById("rich-editor").focus();
}

/* ================= MOBILE ================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* ================= INIT ================= */
loadNotes();
setupAutoSave();
