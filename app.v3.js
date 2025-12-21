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
   SIDEBAR (MOBILE)
========================================================= */
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =========================================================
   LOAD NOTES
========================================================= */
async function loadNotes(){
  try{
    const r = await fetch(BACKEND_URL + "/api/index");
    notes = await r.json();
    renderNotesList();
  }catch(e){
    console.error("Failed to load notes", e);
  }
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
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.gap = "6px";

    const info = document.createElement("div");
    info.style.flex = "1";
    info.innerHTML = `
      <strong>${note.title || "Untitled"}</strong>
      <br>
      <small>${note.updated || ""}</small>
    `;

    // 📌 PIN BUTTON (NEW – beside delete)
    const pin = document.createElement("span");
    pin.innerHTML = note.pinned ? "📌" : "📍";
    pin.style.cursor = "pointer";
    pin.title = note.pinned ? "Unpin note" : "Pin note";

    pin.onclick = (e) => {
      e.stopPropagation();
      togglePin(note.id);
    };

    // 🗑️ DELETE BUTTON
    const del = document.createElement("span");
    del.innerHTML = "🗑️";
    del.style.cursor = "pointer";
    del.title = "Delete note";

    del.onclick = (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    };

    // open note on click
    div.onclick = () => openNote(note.id);

    div.appendChild(info);
    div.appendChild(pin);
    div.appendChild(del);
    list.appendChild(div);
  });
}

/* =========================================================
   ADD NEW NOTE
========================================================= */
function addNewNote(){
  const title = prompt("Enter note title");
  if(!title || !title.trim()) return;

  const id = "note-" + Date.now();
  const now = new Date().toLocaleString();

  notes.unshift({
    id,
    title: title.trim(),
    content: "",
    updated: now,
    pinned: false
  });

  activeNoteId = id;

  document.getElementById("note-title").value = title.trim();
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
}

/* =========================================================
   OPEN NOTE
========================================================= */
async function openNote(id){
  try{
    activeNoteId = id;

    const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
    const note = await r.json();

    document.getElementById("note-title").value = note.title || "";
    document.getElementById("rich-editor").innerHTML = note.content || "";

    // sync pin state
    const local = notes.find(n => n.id === id);
    if(local) local.pinned = note.pinned || false;

    renderNotesList();

    // auto close sidebar on mobile
    if(window.innerWidth <= 768){
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("mobileOverlay").classList.remove("active");
    }
  }catch(e){
    alert("Failed to load note");
  }
}

/* =========================================================
   SAVE NOTE (MANUAL + AUTO, NO POPUP ERROR)
========================================================= */
function saveNote(showAlert = true){
  if(!activeNoteId) return;

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
  if(idx !== -1){
    notes[idx] = noteData;
  }

  fetch(BACKEND_URL + "/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noteData)
  });

  renderNotesList();
  if(showAlert) alert("✅ Note saved");
}

function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveNote(false), 1200);
}

document.getElementById("note-title").addEventListener("input", autoSave);
document.getElementById("rich-editor").addEventListener("input", autoSave);

/* =========================================================
   DELETE NOTE (PERMANENT)
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
   PIN / UNPIN (PERMANENT)
========================================================= */
function togglePin(id){
  const note = notes.find(n => n.id === id);
  if(!note) return;

  note.pinned = !note.pinned;

  // save pin state silently
  saveNote(false);
  renderNotesList();
}

/* =========================================================
   FIND
========================================================= */
function toggleFind(){
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
  if(box.style.display === "block"){
    document.getElementById("findInput").focus();
  }
}

function findText(){
  const text = document.getElementById("findInput").value.toLowerCase();
  const editor = document.getElementById("rich-editor");

  removeHighlights();
  if(!text) return;

  const regex = new RegExp(`(${text})`, "gi");
  editor.innerHTML = editor.innerHTML.replace(
    regex,
    `<span class="find-highlight">$1</span>`
  );
}

function removeHighlights(){
  const editor = document.getElementById("rich-editor");
  editor.querySelectorAll(".find-highlight").forEach(span=>{
    span.replaceWith(span.textContent);
  });
}
