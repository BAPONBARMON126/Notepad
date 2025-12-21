/* =========================================================
   CONFIG
========================================================= */
const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

/* =========================================================
   CONNECTION INDICATOR (UNCHANGED)
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
   LOAD NOTES
========================================================= */
async function loadNotes(){
  const r = await fetch(BACKEND_URL + "/api/index");
  notes = await r.json();
  renderNotesList();
}
loadNotes();

/* =========================================================
   RENDER NOTES (PIN FIRST)
========================================================= */
function renderNotesList(){
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  const pinned = notes.filter(n=>n.pinned);
  const normal = notes.filter(n=>!n.pinned);
  const finalNotes = [...pinned, ...normal];

  finalNotes.forEach(note=>{
    const div = document.createElement("div");
    div.className = "note-item" + (note.id===activeNoteId?" active":"");

    div.innerHTML = `
      <strong>${note.title}</strong> ${note.pinned?"📌":""}
      <br><small>${note.updated||""}</small>
    `;

    div.onclick = ()=>openNote(note.id);

    // right-click / long-press → pin
    div.oncontextmenu = (e)=>{
      e.preventDefault();
      togglePin(note.id);
    };

    list.appendChild(div);
  });
}

/* =========================================================
   ADD / OPEN NOTE
========================================================= */
function addNewNote(){
  const title = prompt("Enter note title");
  if(!title) return;

  const id = "note-"+Date.now();
  const now = new Date().toLocaleString();

  notes.unshift({
    id,
    title,
    content:"",
    updated:now,
    pinned:false
  });

  activeNoteId = id;
  document.getElementById("note-title").value = title;
  document.getElementById("rich-editor").innerHTML = "";

  renderNotesList();
}

async function openNote(id){
  activeNoteId = id;

  const r = await fetch(`${BACKEND_URL}/api/note/${id}`);
  const note = await r.json();

  document.getElementById("note-title").value = note.title||"";
  document.getElementById("rich-editor").innerHTML = note.content||"";

  renderNotesList();

  if(window.innerWidth<=768){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("mobileOverlay").classList.remove("active");
  }
}

/* =========================================================
   SAVE (MANUAL + AUTO)
========================================================= */
function saveNote(showAlert=true){
  if(!activeNoteId) return;

  const note = {
    id:activeNoteId,
    title:document.getElementById("note-title").value,
    content:document.getElementById("rich-editor").innerHTML,
    updated:new Date().toLocaleString(),
    pinned:notes.find(n=>n.id===activeNoteId)?.pinned||false
  };

  fetch(BACKEND_URL+"/api/save",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(note)
  });

  const i = notes.findIndex(n=>n.id===activeNoteId);
  if(i!==-1) notes[i]=note;

  renderNotesList();
  if(showAlert) alert("Note saved");
}

function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(()=>saveNote(false),1500);
}
document.getElementById("note-title").addEventListener("input",autoSave);
document.getElementById("rich-editor").addEventListener("input",autoSave);

/* =========================================================
   DELETE (PERMANENT)
========================================================= */
async function deleteNote(id){
  if(!confirm("Delete this note permanently?")) return;

  await fetch(`${BACKEND_URL}/api/delete/${id}`,{ method:"DELETE" });
  notes = notes.filter(n=>n.id!==id);

  if(activeNoteId===id){
    activeNoteId=null;
    document.getElementById("note-title").value="";
    document.getElementById("rich-editor").innerHTML="";
  }
  renderNotesList();
}

/* =========================================================
   TEXT FORMATTING (FIXED)
========================================================= */
function toggleFormat(cmd,btn){
  const sel = window.getSelection();
  if(!sel || sel.isCollapsed){
    alert("Select text first");
    return;
  }
  document.execCommand(cmd,false,null);
  btn.classList.toggle("active-btn");
}

/* =========================================================
   PIN (PERMANENT)
========================================================= */
function togglePin(id){
  const note = notes.find(n=>n.id===id);
  if(!note) return;

  note.pinned = !note.pinned;
  saveNote(false);
  alert(note.pinned ? "📌 Note pinned" : "📌 Note unpinned");
}

/* =========================================================
   FIND
========================================================= */
function toggleFind(){
  const box = document.getElementById("findBox");
  box.style.display = box.style.display==="block"?"none":"block";
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
