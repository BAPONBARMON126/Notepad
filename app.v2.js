/**************************************************
 * Cloud Notepad – FINAL app.js (Stable)
 **************************************************/

let notes = [];
let activeId = null;

const apiBase = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${NOTES_FOLDER}`;

const encode = (data) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(data))));
const decode = (data) =>
  JSON.parse(decodeURIComponent(escape(atob(data))));

/* =================================================
   LOAD NOTES FROM index.json
================================================= */
async function loadNotes() {
  try {
    const res = await fetch(`${apiBase}/index.json`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const file = await res.json();
    notes = decode(file.content);

    if (!Array.isArray(notes)) notes = [];
    renderSidebar();
  } catch (e) {
    console.error("Load notes failed", e);
    notes = [];
    renderSidebar();
  }
}

/* =================================================
   RENDER SIDEBAR
================================================= */
function renderSidebar() {
  const list = document.getElementById("notesList");
  list.innerHTML = "";

  notes.forEach((n) => {
    const div = document.createElement("div");
    div.className =
      "note-item" + (n.id === activeId ? " active" : "");

    div.innerHTML = `
      <h4>${n.title || "Untitled"}</h4>
      <p style="font-size:11px">${n.updated || ""}</p>
    `;

    div.onclick = () => openNote(n.id);
    list.appendChild(div);
  });
}

/* =================================================
   CREATE NOTE (INTERNAL USE)
================================================= */
async function createNote() {
  const id = "note-" + Date.now();

  const note = {
    id,
    title: "",
    content: "",
    updated: new Date().toLocaleString()
  };

  notes.unshift(note);
  activeId = id;

  await fetch(`${apiBase}/${id}.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "create note",
      content: encode(note)
    })
  });

  await updateIndex();
  renderSidebar();
}

/* =================================================
   ADD NOTE BUTTON
================================================= */
async function addNewNote() {
  await createNote();
  document.getElementById("note-title").value = "";
  document.getElementById("rich-editor").innerHTML = "";
  document.getElementById("note-title").focus();
}

/* =================================================
   OPEN NOTE
================================================= */
async function openNote(id) {
  try {
    activeId = id;

    const res = await fetch(`${apiBase}/${id}.json`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    const file = await res.json();
    const note = decode(file.content);

    document.getElementById("note-title").value =
      note.title || "";
    document.getElementById("rich-editor").innerHTML =
      note.content || "";

    renderSidebar();
  } catch (e) {
    console.error("Open note failed", e);
  }
}

/* =================================================
   SAVE NOTE (AUTO CREATE IF NONE)
================================================= */
async function saveNote() {
  try {
    // 🔥 auto-create note if user directly saves
    if (!activeId) {
      await createNote();
    }

    const titleInput = document.getElementById("note-title");
    const editor = document.getElementById("rich-editor");

    const title = titleInput.value.trim();
    const content = editor.innerHTML;

    const res = await fetch(`${apiBase}/${activeId}.json`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const file = await res.json();

    const note = {
      id: activeId,
      title: title || "Untitled",
      content,
      updated: new Date().toLocaleString()
    };

    await fetch(`${apiBase}/${activeId}.json`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "save note",
        content: encode(note),
        sha: file.sha
      })
    });

    const index = notes.findIndex((n) => n.id === activeId);
    if (index !== -1) {
      notes[index] = note;
    } else {
      notes.unshift(note);
    }

    await updateIndex();
    renderSidebar();

    alert("Saved to cloud ✅");
  } catch (e) {
    console.error("Save failed", e);
    alert("Save failed ❌");
  }
}

/* =================================================
   UPDATE index.json (MOST IMPORTANT)
================================================= */
async function updateIndex() {
  const res = await fetch(`${apiBase}/index.json`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
  const file = await res.json();

  await fetch(`${apiBase}/index.json`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update notes index",
      content: encode(notes),
      sha: file.sha
    })
  });
}

/* =================================================
   FIND TEXT
================================================= */
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

/* =================================================
   FORMAT
================================================= */
function applyFormat(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById("rich-editor").focus();
}

/* =================================================
   MOBILE SIDEBAR
================================================= */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("mobileOverlay").classList.toggle("active");
}

/* =================================================
   INIT
================================================= */
loadNotes();
