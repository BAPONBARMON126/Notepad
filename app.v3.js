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

async function pingBackend(){
  try{
    indicator.className = "conn-spinner";
    indicator.innerHTML = "";
    await fetch(BACKEND_URL + "/", { cache:"no-store" });
    indicator.className = "conn-online";
    indicator.innerHTML = "✓";
  }catch{
    indicator.className = "conn-spinner";
    indicator.innerHTML = "";
  }
}
pingBackend();
setInterval(pingBackend, 25000);

/* =========================================================
   SIDEBAR
========================================================= */
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =========================================================
   LOAD NOTES LIST
========================================================= */
async function loadNotes(){
  const r = await fetch(BACKEND_URL + "/api/index");
  notes = await r.json();
  renderNotesList();
}
loadNotes();

/* =========================================================
   RENDER NOTES LIST (PIN FIRST)
========================================================= */
function renderNotesList(){
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const pinned = notes.filter(n => n.pinned);
  const normal = notes.filter(n => !n.pinned);
  const finalNotes = [...pinned, ...normal];

  finalNotes.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "6px";

    const info = document.createElement("div");
    info.style.flex = "1";
    info.innerHTML = `
      <strong>${note.title}</strong>
      <br><small>${note.updated || ""}</small>
    `;

    /* PIN / UNPIN TEXT BUTTON */
    const pinBtn = document.createElement("button");
    pinBtn.textContent = note.pinned ? "Unpin" : "Pin";
    pinBtn.style.cursor = "pointer";
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      togglePin(note.id);
    };

    /* DELETE BUTTON */
    const del = document.createElement("button");
    del.textContent = "Delete";
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
function addNewNote(){
  const title = prompt("Enter note title");
  if(!title) return;

  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  const note = {
    id,
    title: title.trim(),
    content: "",
    pinned: false,
    updated: now
  };

  notes.unshift(note);
  activeNoteId = id;

  document.getElementById("note-title").value = note.title;
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
}

/* =========================================================
   OPEN NOTE
========================================================= */
async function openNote(id){
  activeNoteId = id;

  const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
  const note = await r.json();

  document.getElementById("note-title").value = note.title || "";
  document.getElementById("rich-editor").innerHTML = note.content || "";

  const local = notes.find(n => n.id === id);
  if(local) local.pinned = note.pinned || false;

  renderNotesList();

  if(window.innerWidth <= 768){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("mobileOverlay").classList.remove("active");
  }
}

/* =========================================================
   SAVE NOTE (FIXED)
========================================================= */
async function saveNote(showAlert = true){
  if(!activeNoteId) return;

  const title = document.getElementById("note-title").value;
  const content = document.getElementById("rich-editor").innerHTML;

  const note = notes.find(n => n.id === activeNoteId);
  if(!note) return;

  note.title = title;
  note.content = content;
  note.updated = new Date().toLocaleString();

  await fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
  if(showAlert) alert("Note saved");
}

/* =========================================================
   AUTO SAVE
========================================================= */
function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1200);
}
document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

/* =========================================================
   PIN / UNPIN (PERMANENT + FIXED)
========================================================= */
async function togglePin(id){
  const note = notes.find(n => n.id === id);
  if(!note) return;

  note.pinned = !note.pinned;
  note.updated = new Date().toLocaleString();

  await fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note)
  });

  renderNotesList();
}

/* =========================================================
   DELETE NOTE
========================================================= */
async function deleteNote(id){
  if(!confirm("Delete this note permanently?")) return;

  await fetch(`${BACKEND_URL}/api/delete/${id}`, { method:"DELETE" });

  notes = notes.filter(n => n.id !== id);
  if(activeNoteId === id){
    activeNoteId = null;
    document.getElementById("note-title").value = "";
    document.getElementById("rich-editor").innerHTML = "";
  }
  renderNotesList();
}

/* =========================================================
   FIND
========================================================= */
function toggleFind(){
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}
function findText(){
  const text = document.getElementById("findInput").value.toLowerCase();
  const editor = document.getElementById("rich-editor");
  editor.innerHTML = editor.innerHTML.replace(/<mark>|<\/mark>/g,"");
  if(!text) return;
  editor.innerHTML = editor.innerHTML.replace(
    new RegExp(`(${text})`,"gi"),"<mark>$1</mark>"
  );
}
