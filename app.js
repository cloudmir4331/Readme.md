const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.events";

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const connectGoogleBtn = document.getElementById("connectGoogleBtn");
const extractBtn = document.getElementById("extractBtn");
const clearBtn = document.getElementById("clearBtn");
const transcriptEl = document.getElementById("transcript");
const taskListEl = document.getElementById("taskList");

let recognition;
let googleAccessToken = null;
let tasks = loadTasks();
renderTasks();

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Use Chrome or Edge.");
    recordBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    let fullText = "";
    for (let i = 0; i < event.results.length; i += 1) {
      fullText += `${event.results[i][0].transcript} `;
    }
    transcriptEl.value = fullText.trim();
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onend = () => {
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  };
}

function splitIntoTasks(text) {
  return text
    .split(/[.\n,;]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 3)
    .map((chunk) => ({
      id: crypto.randomUUID(),
      text: chunk,
      score: scoreTask(chunk),
      priority: toPriority(scoreTask(chunk)),
      createdAt: new Date().toISOString(),
    }));
}

function scoreTask(text) {
  const lowered = text.toLowerCase();
  let score = 1;

  const boost3 = ["urgent", "asap", "today", "now"];
  const boost2 = ["important", "critical", "must", "deadline", "submit"];
  const boost1 = ["project", "plan", "prepare", "meeting", "review"];
  const minus2 = ["someday", "later", "maybe", "eventually"];

  boost3.forEach((w) => {
    if (lowered.includes(w)) score += 3;
  });
  boost2.forEach((w) => {
    if (lowered.includes(w)) score += 2;
  });
  boost1.forEach((w) => {
    if (lowered.includes(w)) score += 1;
  });
  minus2.forEach((w) => {
    if (lowered.includes(w)) score -= 2;
  });

  return Math.max(score, 0);
}

function toPriority(score) {
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function renderTasks() {
  taskListEl.innerHTML = "";

  const sorted = [...tasks].sort((a, b) => b.score - a.score);

  if (!sorted.length) {
    taskListEl.innerHTML = "<li>No tasks yet. Record a voice note and extract tasks.</li>";
    return;
  }

  sorted.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <span class="priority ${task.priority}">${task.priority.toUpperCase()}</span>
      <span>${task.text}</span>
      <small>Score ${task.score}</small>
      <span class="task-actions">
        <button data-action="calendar" data-id="${task.id}">Add to Calendar</button>
        <button data-action="delete" data-id="${task.id}" class="ghost">Delete</button>
      </span>
    `;
    taskListEl.appendChild(li);
  });
}

function saveTasks() {
  localStorage.setItem("voicePlannerTasks", JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem("voicePlannerTasks");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function connectGoogleCalendar() {
  if (!window.google?.accounts?.oauth2) {
    alert("Google Identity Services failed to load.");
    return;
  }

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (tokenResponse) => {
      googleAccessToken = tokenResponse.access_token;
      connectGoogleBtn.textContent = "Google Connected ✅";
    },
  });

  tokenClient.requestAccessToken({ prompt: "consent" });
}

async function addTaskToCalendar(task) {
  if (!googleAccessToken) {
    alert("Please connect Google Calendar first.");
    return;
  }

  const start = new Date();
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  const eventBody = {
    summary: `Task: ${task.text}`,
    description: `Priority: ${task.priority.toUpperCase()} (score ${task.score})`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(errorText);
    alert("Failed to add event. Verify OAuth client ID and Calendar API setup.");
    return;
  }

  alert("Event added to Google Calendar.");
}

recordBtn.addEventListener("click", () => {
  if (!recognition) return;
  transcriptEl.value = "";
  recognition.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
  recognition?.stop();
});

connectGoogleBtn.addEventListener("click", connectGoogleCalendar);

extractBtn.addEventListener("click", () => {
  const extracted = splitIntoTasks(transcriptEl.value);
  if (!extracted.length) {
    alert("No tasks detected. Try speaking clear task statements.");
    return;
  }

  tasks = [...tasks, ...extracted];
  saveTasks();
  renderTasks();
});

clearBtn.addEventListener("click", () => {
  transcriptEl.value = "";
});

taskListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { id, action } = button.dataset;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  if (action === "delete") {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    renderTasks();
  }

  if (action === "calendar") {
    await addTaskToCalendar(task);
  }
});

setupSpeechRecognition();
