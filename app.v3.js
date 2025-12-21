const BACKEND_URL = "https://notepad-backend-n5nc.onrender.com";

let notes = [];
let activeNoteId = null;
let autoSaveTimer = null;

/* ===== CONNECTION ===== */
const indicator = document.getElementById("conn-indicator");
async function pingBackend(){
  try{
    indicator.className="conn-spinner";
    indicator.innerHTML="";
    await fetch(BACKEND_URL+"/",{cache:"no-store"});
    indicator.className="conn-online";
    indicator.innerHTML="✓";
  }catch{
    indicator.className="conn-spinner";
    indicator.innerHTML="";
  }
}
pingBackend();
setInterval(pingBackend,25000);

/* ===== SIDEBAR ===== */
function toggleSidebar(){
  sidebar.classList.toggle("open");
  mobileOverlay.classList.toggle("active");
}

/* ===== LOAD NOTES ===== */
async function loadNotes(){
  const r = await fetch(BACKEND_URL+"/api/index");
  notes = await r.json();
  renderNotesList();
}
loadNotes();

/* ===== RENDER NOTES (GRID + PIN TOP) ===== */
function renderNotesList(){
  const list = document.getElementById("notesList");
  list.innerHTML="";

  const ordered=[
    ...notes.filter(n=>n.pinned),
    ...notes.filter(n=>!n.pinned)
  ];

  ordered.forEach(note=>{
    const div=document.createElement("div");
    div.className="note-item"+(note.id===activeNoteId?" active":"");

    div.innerHTML=`
      <strong>${note.title||"Untitled"}</strong>
      <div class="note-preview">
        ${(note.content||"").replace(/<[^>]*>/g,"").slice(0,140)}
      </div>
    `;

    div.onclick=()=>openNote(note.id);
    list.appendChild(div);
  });
}

/* ===== ADD NOTE ===== */
function addNewNote(){
  const title=prompt("Enter note title");
  if(!title) return;

  const note={
    id:"note-"+Date.now(),
    title:title,
    content:"",
    pinned:false,
    updated:new Date().toLocaleString()
  };

  notes.unshift(note);
  activeNoteId=note.id;
  saveRaw(note);

  noteTitle.value=title;
  richEditor.innerHTML="";
  renderNotesList();
}

/* ===== OPEN NOTE ===== */
async function openNote(id){
  activeNoteId=id;
  const r=await fetch(`${BACKEND_URL}/api/note/${id}`);
  const note=await r.json();

  noteTitle.value=note.title||"";
  richEditor.innerHTML=note.content||"";
  renderNotesList();

  if(window.innerWidth<=768){
    sidebar.classList.remove("open");
    mobileOverlay.classList.remove("active");
  }
}

/* ===== SAVE ===== */
function saveNote(show=true){
  if(!activeNoteId) return;
  const note=notes.find(n=>n.id===activeNoteId);
  if(!note) return;

  note.title=noteTitle.value;
  note.content=richEditor.innerHTML;
  note.updated=new Date().toLocaleString();

  saveRaw(note);
  renderNotesList();
}

/* ===== RAW SAVE ===== */
function saveRaw(note){
  fetch(BACKEND_URL+"/api/save",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(note)
  });
}

/* ===== AUTO SAVE ===== */
noteTitle.oninput=richEditor.oninput=()=>{
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>saveNote(false),1200);
};

/* ===== FORMAT ===== */
function applyFormat(cmd){
  richEditor.focus();
  document.execCommand(cmd,false,null);
}

/* ===== SEARCH (placeholder, already wired) ===== */
function toggleFind(){}
