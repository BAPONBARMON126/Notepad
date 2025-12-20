let notes = [];
let activeId = null;

const apiBase = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${NOTES_FOLDER}`;
const encode = d => btoa(unescape(encodeURIComponent(JSON.stringify(d))));
const decode = d => JSON.parse(decodeURIComponent(escape(atob(d))));

/* ========== LOAD NOTES ========== */
async function loadNotes(){
  const r = await fetch(`${apiBase}/index.json`,{
    headers:{ Authorization:`token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();
  notes = decode(f.content);
  renderSidebar();
}

/* ========== SIDEBAR ========== */
function renderSidebar(){
  const list = document.getElementById("notesList");
  list.innerHTML = "";
  notes.forEach(n=>{
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

/* ========== CREATE NOTE (INTERNAL) ========== */
async function createNote(){
  const id = "note-" + Date.now();
  const note = {
    id,
    title: "",
    content: "",
    updated: new Date().toLocaleString()
  };

  notes.unshift(note);
  activeId = id;

  await fetch(`${apiBase}/${id}.json`,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      message:"create note",
      content: encode(note)
    })
  });

  await updateIndex();
  renderSidebar();
}

/* ========== ADD NOTE BUTTON ========== */
async function addNewNote(){
  await createNote();
  document.getElementById("note-title").value = "";
  document.getElementById("rich-editor").innerHTML = "";
  document.getElementById("note-title").focus();
}

/* ========== OPEN NOTE ========== */
async function openNote(id){
  activeId = id;
  const r = await fetch(`${apiBase}/${id}.json`,{
    headers:{ Authorization:`token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();
  const n = decode(f.content);

  document.getElementById("note-title").value = n.title || "";
  document.getElementById("rich-editor").innerHTML = n.content || "";
  renderSidebar();
}

/* ========== SAVE NOTE (AUTO CREATE FIX) ========== */
async function saveNote(){
  // 🔥 AUTO CREATE NOTE IF NONE SELECTED
  if(!activeId){
    await createNote();
  }

  const titleInput = document.getElementById("note-title");
  const editor = document.getElementById("rich-editor");

  const title = titleInput.value.trim();
  const content = editor.innerHTML;

  const r = await fetch(`${apiBase}/${activeId}.json`,{
    headers:{ Authorization:`token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();

  const note = {
    id: activeId,
    title: title || "Untitled",
    content,
    updated: new Date().toLocaleString()
  };

  await fetch(`${apiBase}/${activeId}.json`,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      message:"save note",
      content: encode(note),
      sha: f.sha
    })
  });

  const i = notes.findIndex(n=>n.id === activeId);
  notes[i] = note;

  await updateIndex();
  renderSidebar();

  alert("Saved to cloud ✅");
}

/* ========== UPDATE INDEX ========== */
async function updateIndex(){
  const r = await fetch(`${apiBase}/index.json`,{
    headers:{ Authorization:`token ${GITHUB_TOKEN}` }
  });
  const f = await r.json();

  await fetch(`${apiBase}/index.json`,{
    method:"PUT",
    headers:{
      Authorization:`token ${GITHUB_TOKEN}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      message:"update index",
      content: encode(notes),
      sha: f.sha
    })
  });
}

/* ========== FIND ========== */
function toggleFind(){
  const box = document.getElementById("findBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function findText(){
  const q = document.getElementById("findInput").value;
  const ed = document.getElementById("rich-editor");
  const text = ed.innerText;

  if(q.length < 2){
    ed.innerHTML = text;
    return;
  }

  ed.innerHTML = text.replaceAll(
    q,
    `<span class="find-highlight">${q}</span>`
  );
}

/* ========== FORMAT ========== */
function applyFormat(cmd){
  document.execCommand(cmd,false,null);
  document.getElementById("rich-editor").focus();
}

/* ========== MOBILE ========== */
function toggleSidebar(){
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* ========== INIT ========== */
loadNotes();
