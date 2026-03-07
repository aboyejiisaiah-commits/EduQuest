// ============================================================
// EDUQUEST — Quiz Logic
// ============================================================

// Automatically use local server when testing, Vercel function when live
const AI_ENDPOINT = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3001/api/ai"
  : "/api/ai";

let state = {
  subject: "", questions: [], current: 0, score: 0,
  selected: null, answered: false, timer: null,
  timeLeft: 0, startTime: null,
  tutorHistory: [],
};

const subjects = [
  { name: "Mathematics", icon: "➕" },
  { name: "English",     icon: "📝" },
  { name: "Biology",     icon: "🌱" },
  { name: "Physics",     icon: "⚡" },
  { name: "Chemistry",   icon: "🧪" },
  { name: "Government",  icon: "🏛️" },
];

function createOverlay() {
  if (document.getElementById("eq-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "eq-overlay";
  overlay.innerHTML = `
    <div id="eq-modal">
      <button id="eq-close" onclick="closeModal()">✕</button>
      <div id="eq-content"></div>
    </div>`;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.textContent = `
    #eq-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;animation:eqFadeIn 0.25s ease}
    @keyframes eqFadeIn{from{opacity:0}to{opacity:1}}
    @keyframes eqSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    #eq-modal{background:#fff;border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:32px 28px;position:relative;animation:eqSlideUp 0.3s ease;box-shadow:0 20px 60px rgba(0,0,0,0.25)}
    #eq-close{position:absolute;top:16px;right:16px;background:#f0f0f0;border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;color:#333;transition:background 0.2s;font-family:inherit}
    #eq-close:hover{background:#e0e0e0}
    .eq-subject-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
    .eq-subject-btn{background:#f5f5f5;border:2px solid transparent;border-radius:14px;padding:16px 12px;text-align:center;cursor:pointer;transition:all 0.2s;font-weight:700;font-size:15px;color:#333}
    .eq-subject-btn:hover{border-color:#635BFF;background:#f0efff}
    .eq-icon{font-size:28px;display:block;margin-bottom:6px}
    .eq-loading{text-align:center;padding:40px 20px}
    .eq-spinner{width:48px;height:48px;border:5px solid #f0efff;border-top-color:#635BFF;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px}
    @keyframes spin{to{transform:rotate(360deg)}}
    .eq-progress-bar{height:8px;background:#e5e5e5;border-radius:999px;overflow:hidden;margin:12px 0 8px}
    .eq-progress-fill{height:100%;background:#635BFF;border-radius:999px;transition:width 0.4s ease}
    .eq-meta{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:#888;margin-bottom:20px}
    .eq-timer{background:#635BFF;color:white;padding:4px 14px;border-radius:999px;font-size:13px;font-weight:800}
    .eq-timer.danger{background:#e53935}
    .eq-question{font-size:17px;font-weight:800;color:#1a1a1a;line-height:1.6;margin-bottom:22px}
    .eq-option{border:2px solid #e5e5e5;border-radius:12px;padding:14px 18px;margin-bottom:10px;cursor:pointer;font-weight:700;font-size:14px;color:#333;transition:all 0.18s;display:flex;align-items:center;gap:12px}
    .eq-option:hover{border-color:#635BFF;background:#f0efff}
    .eq-opt-letter{width:30px;height:30px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;transition:all 0.18s}
    .eq-option.selected{border-color:#635BFF;background:#f0efff}
    .eq-option.selected .eq-opt-letter{background:#635BFF;color:white}
    .eq-option.correct{border-color:#00C853;background:#F0FFF4}
    .eq-option.correct .eq-opt-letter{background:#00C853;color:white}
    .eq-option.wrong{border-color:#e53935;background:#FFF5F5}
    .eq-option.wrong .eq-opt-letter{background:#e53935;color:white}
    .eq-option.disabled{pointer-events:none;opacity:0.65}
    .eq-feedback{text-align:center;padding:10px;border-radius:12px;font-weight:700;font-size:14px;margin-top:12px;line-height:1.5}
    .eq-feedback.correct-fb{background:#F0FFF4;color:#00C853}
    .eq-feedback.wrong-fb{background:#FFF5F5;color:#e53935}
    .eq-btn-row{display:flex;gap:10px;margin-top:20px}
    .eq-btn{flex:1;padding:13px;border-radius:25px;border:none;font-weight:800;font-size:15px;cursor:pointer;transition:all 0.2s;font-family:inherit}
    .eq-btn-primary{background:#635BFF;color:white;box-shadow:0 4px 15px rgba(99,91,255,0.3)}
    .eq-btn-primary:hover{background:#3d369a;transform:translateY(-2px)}
    .eq-btn-secondary{background:#f0f0f0;color:#333}
    .eq-btn-secondary:hover{background:#e0e0e0;transform:translateY(-2px)}
    .eq-result-circle{width:120px;height:120px;border-radius:50%;border:6px solid #635BFF;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 20px}
    .eq-pct{font-size:32px;font-weight:900;color:#635BFF}
    .eq-pct-label{font-size:12px;color:#888;font-weight:700}
    .eq-result-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0}
    .eq-stat-box{background:#f5f5f5;border-radius:14px;padding:14px;text-align:center}
    .eq-stat-num{font-size:26px;font-weight:900}
    .eq-stat-label{font-size:12px;color:#888;font-weight:700;margin-top:2px}
    .eq-badge{text-align:center;padding:12px;border-radius:14px;font-weight:800;font-size:14px;margin-bottom:16px}
    .eq-chat-box{display:flex;flex-direction:column;gap:12px;max-height:340px;overflow-y:auto;padding:4px 2px;margin-bottom:12px}
    .eq-bubble{border-radius:16px;padding:12px 16px;font-size:14px;font-weight:600;line-height:1.6;max-width:88%}
    .eq-bubble-ai{background:#f5f5f5;color:#1a1a1a;border-bottom-left-radius:4px;align-self:flex-start}
    .eq-bubble-user{background:#635BFF;color:white;border-bottom-right-radius:4px;align-self:flex-end;text-align:right}
    .eq-chat-input-row{display:flex;gap:8px}
    .eq-chat-input{flex:1;padding:12px 16px;border:2px solid #e5e5e5;border-radius:25px;font-family:inherit;font-size:14px;font-weight:600;outline:none;transition:border-color 0.2s}
    .eq-chat-input:focus{border-color:#635BFF}
    .eq-typing{display:flex;gap:5px;align-items:center;padding:12px 16px}
    .eq-dot{width:8px;height:8px;background:#aaa;border-radius:50%;animation:dotBounce 1.2s ease-in-out infinite}
    .eq-dot:nth-child(2){animation-delay:.2s}
    .eq-dot:nth-child(3){animation-delay:.4s}
    @keyframes dotBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    .eq-error{background:#FFF5F5;border:1px solid #fca5a5;border-radius:12px;padding:12px 16px;color:#e53935;font-weight:700;font-size:14px;margin-top:8px}
    @media(max-width:500px){#eq-modal{padding:24px 16px}}
  `;
  document.head.appendChild(style);
}

function closeModal() {
  clearInterval(state.timer);
  const o = document.getElementById("eq-overlay");
  if (o) o.remove();
}

function setContent(html) {
  document.getElementById("eq-content").innerHTML = html;
}

// ============================================================
// AI API CALL — goes through proxy server
// ============================================================
async function callAI(messages, systemPrompt) {
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages: messages }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.content.map(b => b.text || "").join("");
}

// ============================================================
// QUIZ
// ============================================================
function openQuiz() {
  createOverlay();
  showSubjectPicker("quiz");
}

function openLesson() {
  createOverlay();
  showSubjectPicker("lesson");
}

function showSubjectPicker(mode) {
  clearInterval(state.timer);
  const title = mode === "quiz" ? "🧠 Choose a Subject" : "📖 Choose a Subject";
  const sub   = mode === "quiz" ? "EduQuest AI will generate 10 fresh questions just for you." : "EduQuest AI will create a lesson summary for you.";
  setContent(`
    <h2 style="font-size:22px;font-weight:900;margin-bottom:4px;">${title}</h2>
    <p style="color:#888;font-weight:600;font-size:14px;">${sub}</p>
    <div class="eq-subject-grid">
      ${subjects.map(s => `
        <div class="eq-subject-btn" onclick="${mode === "quiz" ? "fetchQuizQuestions" : "fetchLesson"}('${s.name}')">
          <span class="eq-icon">${s.icon}</span>${s.name}
        </div>`).join("")}
    </div>
  `);
}

async function fetchQuizQuestions(subject) {
  setContent(`
    <div class="eq-loading">
      <div class="eq-spinner"></div>
      <div style="font-weight:800;font-size:17px;margin-bottom:6px;">Generating your ${subject} quiz...</div>
      <div style="color:#888;font-weight:600;font-size:14px;">EduQuest AI is writing 10 fresh questions for you</div>
    </div>`);

  const systemPrompt = `You are an educational quiz generator for Nigerian secondary school students (JSS1-SS3).
Generate questions relevant to the Nigerian curriculum and WAEC/JAMB standards.
Always respond with ONLY valid JSON — no extra text, no markdown, no backticks.`;

  const topics = {
    Mathematics: ["algebra","geometry","statistics","fractions","percentages","trigonometry","number theory","sequences","probability","mensuration"],
    English: ["comprehension","letter writing","grammar","vocabulary","figures of speech","essay writing","oral English","summary","tenses","punctuation"],
    Biology: ["cell biology","genetics","ecology","human body systems","photosynthesis","evolution","reproduction","nutrition","respiration","classification"],
    Physics: ["mechanics","electricity","waves","optics","thermodynamics","magnetism","nuclear physics","motion","energy","pressure"],
    Chemistry: ["organic chemistry","atomic structure","bonding","acids and bases","electrochemistry","kinetics","periodic table","stoichiometry","gases","reactions"],
    Government: ["Nigerian constitution","arms of government","federalism","democracy","electoral system","international relations","human rights","political parties","ECOWAS","local government"],
  };
  const subjectTopics = topics[subject] || [];
  const randomTopic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
  const randomSeed = Math.floor(Math.random() * 10000);

  const userPrompt = `Generate 10 multiple choice questions focusing on "${randomTopic}" in ${subject} for Nigerian secondary school students. Seed: ${randomSeed}.
Return ONLY a JSON array like this:
[{"q":"question","opts":["A","B","C","D"],"ans":0,"explanation":"why this answer is correct"}]
Rules:
- "ans" is the index (0-3) of the correct answer
- Match Nigerian WAEC/JAMB curriculum
- Mix easy, medium and hard questions
- Use Nigerian context where relevant (₦, Nigerian cities, etc.)
- Make all 10 questions DIFFERENT from each other`;

  try {
    const raw = await callAI([{ role: "user", content: userPrompt }], systemPrompt);
    const clean = raw.replace(/```json|```/gi, "").trim();
    const questions = JSON.parse(clean);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error("Invalid format");

    state.subject   = subject;
    state.questions = questions;
    state.current   = 0;
    state.score     = 0;
    state.selected  = null;
    state.answered  = false;
    state.timeLeft  = 15 * 60;
    state.startTime = Date.now();

    renderQuestion();
    startTimer();

  } catch (err) {
    console.error("Quiz error:", err);
    setContent(`
      <div class="eq-error">⚠️ Something went wrong generating your quiz. Please check your connection and try again.</div>
      <div class="eq-btn-row" style="margin-top:16px;">
        <button class="eq-btn eq-btn-primary" onclick="fetchQuizQuestions('${subject}')">🔁 Retry</button>
        <button class="eq-btn eq-btn-secondary" onclick="showSubjectPicker('quiz')">← Back</button>
      </div>`);
  }
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    const el = document.getElementById("eq-timer");
    if (el) {
      el.textContent = formatTime(state.timeLeft);
      if (state.timeLeft <= 60) el.classList.add("danger");
    }
    if (state.timeLeft <= 0) { clearInterval(state.timer); showResults(); }
  }, 1000);
}

function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function renderQuestion() {
  const q       = state.questions[state.current];
  const letters = ["A", "B", "C", "D"];
  const pct     = ((state.current + 1) / state.questions.length) * 100;

  setContent(`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span style="font-weight:800;font-size:14px;color:#635BFF;">${state.subject}</span>
      <span class="eq-timer" id="eq-timer">${formatTime(state.timeLeft)}</span>
    </div>
    <div class="eq-progress-bar"><div class="eq-progress-fill" style="width:${pct}%"></div></div>
    <div class="eq-meta">
      <span>Question ${state.current + 1} of ${state.questions.length}</span>
      <span>Score: ${state.score} ✅</span>
    </div>
    <div class="eq-question">${q.q}</div>
    <div id="eq-options">
      ${q.opts.map((opt, i) => `
        <div class="eq-option" id="opt-${i}" onclick="selectOption(${i})">
          <div class="eq-opt-letter">${letters[i]}</div>
          <span>${opt}</span>
        </div>`).join("")}
    </div>
    <div id="eq-feedback"></div>
    <div class="eq-btn-row">
      <button class="eq-btn eq-btn-secondary" onclick="skipQuestion()">Skip</button>
      <button class="eq-btn eq-btn-primary" id="eq-submit-btn" onclick="submitAnswer()">Submit Answer</button>
    </div>
  `);
  state.selected = null;
  state.answered = false;
}

function selectOption(idx) {
  if (state.answered) return;
  state.selected = idx;
  document.querySelectorAll(".eq-option").forEach(o => o.classList.remove("selected"));
  document.getElementById(`opt-${idx}`).classList.add("selected");
}

function submitAnswer() {
  if (state.answered) { nextQuestion(); return; }
  if (state.selected === null) {
    const btn = document.getElementById("eq-submit-btn");
    btn.style.background = "#e53935";
    btn.textContent = "Select an answer first!";
    setTimeout(() => { btn.style.background = "#635BFF"; btn.textContent = "Submit Answer"; }, 1200);
    return;
  }
  state.answered = true;
  const q       = state.questions[state.current];
  const correct = q.ans;
  const isRight = state.selected === correct;
  if (isRight) state.score++;

  document.querySelectorAll(".eq-option").forEach(o => o.classList.add("disabled"));
  document.getElementById(`opt-${correct}`).classList.add("correct");
  if (!isRight) document.getElementById(`opt-${state.selected}`).classList.add("wrong");

  const letters = ["A","B","C","D"];
  const explanation = q.explanation ? `<br/><span style="color:#555;font-weight:600">${q.explanation}</span>` : "";
  document.getElementById("eq-feedback").innerHTML = isRight
    ? `<div class="eq-feedback correct-fb">✅ Correct!${explanation}</div>`
    : `<div class="eq-feedback wrong-fb">❌ Wrong. Correct: <strong>${letters[correct]}) ${q.opts[correct]}</strong>${explanation}</div>`;

  const btn = document.getElementById("eq-submit-btn");
  btn.textContent = state.current + 1 >= state.questions.length ? "See Results →" : "Next Question →";
}

function skipQuestion() {
  if (!state.answered) { state.answered = true; nextQuestion(); }
}

function nextQuestion() {
  state.current++;
  if (state.current >= state.questions.length) { clearInterval(state.timer); showResults(); }
  else renderQuestion();
}

function showResults() {
  clearInterval(state.timer);
  const total   = state.questions.length;
  const pct     = Math.round((state.score / total) * 100);
  const elapsed = Math.round((Date.now() - state.startTime) / 1000);
  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, "0")}`;

  const [badge, color, msg] =
    pct >= 80 ? ["🏆 Excellent!",  "#F0FFF4", "Outstanding! You're well prepared."] :
    pct >= 60 ? ["👍 Good Job!",   "#FFF9E6", "Solid effort! Keep practicing."] :
    pct >= 40 ? ["📚 Keep Going!", "#FFF0E6", "You're getting there. Review missed topics."] :
                ["🔁 Try Again",   "#FFF5F5", "Don't give up! Every attempt makes you stronger."];

  setContent(`
    <h2 style="font-size:22px;font-weight:900;text-align:center;margin-bottom:16px;">Quiz Complete! ${pct >= 60 ? "🎉" : "💪"}</h2>
    <div class="eq-result-circle">
      <span class="eq-pct">${pct}%</span>
      <span class="eq-pct-label">Score</span>
    </div>
    <div class="eq-badge" style="background:${color};">${badge} — ${msg}</div>
    <div class="eq-result-stats">
      <div class="eq-stat-box"><div class="eq-stat-num" style="color:#00C853;">${state.score}</div><div class="eq-stat-label">Correct</div></div>
      <div class="eq-stat-box"><div class="eq-stat-num" style="color:#e53935;">${total - state.score}</div><div class="eq-stat-label">Wrong</div></div>
      <div class="eq-stat-box"><div class="eq-stat-num" style="color:#635BFF;">${timeStr}</div><div class="eq-stat-label">Time</div></div>
    </div>
    <div class="eq-btn-row" style="flex-direction:column;">
      <button class="eq-btn eq-btn-primary" onclick="fetchQuizQuestions('${state.subject}')">🔁 New ${state.subject} Quiz</button>
      <button class="eq-btn eq-btn-secondary" onclick="openTutorFromResult('${state.subject}')">🤖 Discuss with AI Tutor</button>
      <button class="eq-btn eq-btn-secondary" onclick="showSubjectPicker('quiz')">🎯 Try Another Subject</button>
    </div>
  `);
}

function openTutorFromResult(subject) {
  state.tutorHistory = [];
  openTutor(subject);
}

// ============================================================
// LESSON
// ============================================================
async function fetchLesson(subject) {
  setContent(`
    <div class="eq-loading">
      <div class="eq-spinner"></div>
      <div style="font-weight:800;font-size:17px;margin-bottom:6px;">Generating your ${subject} lesson...</div>
      <div style="color:#888;font-weight:600;font-size:14px;">EduQuest AI is writing a lesson tailored for you</div>
    </div>`);

  const systemPrompt = `You are a friendly, expert teacher for Nigerian secondary school students (JSS1-SS3).
Write engaging, clear lesson summaries aligned with the Nigerian curriculum and WAEC/JAMB standards.
Use simple language. Format your response in clean HTML only using <p>, <ul>, <li>, <strong>, <em> tags only. No markdown, no backticks.`;

  const userPrompt = `Write a concise lesson summary on "${subject}" for a Nigerian secondary school student preparing for WAEC/JAMB.
Structure:
1. Short intro paragraph (2-3 sentences)
2. Key Concepts — bullet list of 6-8 important points
3. A "Remember This!" WAEC/JAMB exam tip
Keep it encouraging and easy to understand.`;

  try {
    const html = await callAI([{ role: "user", content: userPrompt }], systemPrompt);
    setContent(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="showSubjectPicker('lesson')" style="background:#f0f0f0;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#333;font-family:inherit;">←</button>
        <h2 style="font-size:19px;font-weight:900;margin:0;">📖 ${subject} Lesson</h2>
      </div>
      <div style="background:#f8f8ff;border-radius:14px;padding:20px;margin-bottom:20px;font-size:14px;line-height:1.8;color:#333;">${html}</div>
      <div class="eq-btn-row">
        <button class="eq-btn eq-btn-primary" onclick="fetchQuizQuestions('${subject}')">🧠 Test Yourself Now</button>
        <button class="eq-btn eq-btn-secondary" onclick="openTutorFromResult('${subject}')">🤖 Ask AI Tutor</button>
      </div>
    `);
  } catch (err) {
    console.error("Lesson error:", err);
    setContent(`
      <div class="eq-error">⚠️ Something went wrong loading your lesson. Please check your connection and try again.</div>
      <div class="eq-btn-row" style="margin-top:16px;">
        <button class="eq-btn eq-btn-primary" onclick="fetchLesson('${subject}')">🔁 Retry</button>
        <button class="eq-btn eq-btn-secondary" onclick="showSubjectPicker('lesson')">← Back</button>
      </div>`);
  }
}

// ============================================================
// AI TUTOR
// ============================================================
function openTutor(preselectedSubject = "") {
  createOverlay();
  state.tutorHistory = [];

  const subjectOptions = subjects.map(s =>
    `<option value="${s.name}" ${s.name === preselectedSubject ? "selected" : ""}>${s.icon} ${s.name}</option>`
  ).join("");

  const welcome = preselectedSubject
    ? `Hi! I'm your EduQuest AI Tutor 👋 I see you just finished a <strong>${preselectedSubject}</strong> quiz. Ask me to explain anything you found difficult!`
    : `Hi! I'm your EduQuest AI Tutor 👋 Ask me anything — I can explain topics, solve problems step by step, and help you prepare for WAEC and JAMB!`;

  setContent(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <div style="width:40px;height:40px;background:#635BFF;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🤖</div>
      <div>
        <div style="font-weight:900;font-size:16px;">EduQuest AI Tutor</div>
        <div style="font-size:12px;color:#00C853;font-weight:700;">● Online · Powered by EduQuest AI</div>
      </div>
      <select id="tutor-subject" style="margin-left:auto;padding:6px 12px;border-radius:25px;border:2px solid #e5e5e5;font-family:inherit;font-weight:700;font-size:13px;outline:none;cursor:pointer;">
        <option value="">All Subjects</option>
        ${subjectOptions}
      </select>
    </div>
    <div class="eq-chat-box" id="eq-chat-box">
      <div class="eq-bubble eq-bubble-ai">${welcome}</div>
    </div>
    <div class="eq-chat-input-row">
      <input id="tutor-input" class="eq-chat-input" type="text"
        placeholder="Ask anything e.g. Explain photosynthesis..."
        onkeydown="if(event.key==='Enter') sendTutorMessage()" />
      <button class="eq-btn eq-btn-primary" style="flex:none;padding:12px 20px;border-radius:25px;" onclick="sendTutorMessage()">Send →</button>
    </div>
    <div style="text-align:center;margin-top:10px;font-size:12px;color:#bbb;font-weight:600;">Powered by EduQuest AI · Free for Nigerian students</div>
  `);
}

async function sendTutorMessage() {
  const input   = document.getElementById("tutor-input");
  const subject = document.getElementById("tutor-subject")?.value || "";
  const text    = input.value.trim();
  if (!text) return;

  input.value = "";
  appendBubble(text, "user");
  state.tutorHistory.push({ role: "user", content: text });

  const chatBox = document.getElementById("eq-chat-box");
  const typing  = document.createElement("div");
  typing.id = "eq-typing";
  typing.className = "eq-bubble eq-bubble-ai eq-typing";
  typing.innerHTML = `<span class="eq-dot"></span><span class="eq-dot"></span><span class="eq-dot"></span>`;
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
  input.disabled = true;

  const systemPrompt = `You are a friendly, encouraging AI tutor for Nigerian secondary school students (JSS1-SS3).
${subject ? `The student is currently studying ${subject}.` : ""}
- Explain concepts clearly and simply like a great teacher
- Use simple English a Nigerian student can easily understand
- Give examples using Nigerian context where helpful (₦, Nigerian cities, local scenarios)
- Keep responses concise — 3 to 6 sentences unless a longer explanation is truly needed
- For maths problems, show clear step-by-step working
- Always be encouraging and positive
- Align with WAEC and JAMB standards`;

  try {
    const reply = await callAI(state.tutorHistory, systemPrompt);
    typing.remove();
    state.tutorHistory.push({ role: "assistant", content: reply });
    appendBubble(reply, "ai");
  } catch (err) {
    console.error("Tutor error:", err);
    typing.remove();
    appendBubble("⚠️ Something went wrong. Please check your connection and try again.", "ai");
  }

  input.disabled = false;
  input.focus();
}

function appendBubble(text, role) {
  const chatBox = document.getElementById("eq-chat-box");
  const div     = document.createElement("div");
  div.className = `eq-bubble eq-bubble-${role}`;
  div.innerHTML = role === "ai" ? text.replace(/\n/g, "<br>") : escapeHtml(text);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}