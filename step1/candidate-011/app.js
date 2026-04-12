const SYMBOLS = [
  { id: "brain",  glyph: "🧠", name: "Artificial Brain",  payout: 500, weight: 1, lore: "Stochastic, mostly." },
  { id: "robot",  glyph: "🤖", name: "Chatbot",           payout: 200, weight: 2, lore: "Confidently incorrect." },
  { id: "gpu",    glyph: "💎", name: "GPU",               payout: 150, weight: 3, lore: "Melting somewhere in Nevada." },
  { id: "chip",   glyph: "⚡", name: "Compute",           payout: 100, weight: 4, lore: "Your electricity bill." },
  { id: "data",   glyph: "📊", name: "Training Data",     payout: 75,  weight: 5, lore: "Scraped without consent." },
  { id: "halluc", glyph: "🔮", name: "Hallucination",     payout: 0,   weight: 6, lore: "It made up a citation." },
  { id: "error",  glyph: "🚫", name: "Refusal",           payout: 0,   weight: 4, lore: "I'm sorry, I can't help with that." },
];

const SPIN_COST = 50;
const REEL_COUNT = 3;
const STRIP_LENGTH = 40;
const CELL_HEIGHT = 140;

const LOSS_LINES = [
  "Model is fine-tuning on your misery.",
  "Alignment tax: paid.",
  "Your prompt was ignored. Classic.",
  "The model refuses to engage. For safety.",
  "Hallucinated three citations. None exist.",
  "Training loss went up. Weird.",
  "Your tokens were used for a cat picture.",
  "GPU caught fire. Only a little.",
  "Output truncated mid-senten",
  "It's 98% sure. It is wrong.",
];

const WIN_LINES = [
  "Emergent behavior detected! Payout incoming.",
  "The model agrees with itself. Rare.",
  "Zero-shot jackpot. Hallucinated, but real this time.",
  "RLHF-approved payout!",
  "Benchmark beaten. Loosely defined.",
  "Scaling laws hold. For now.",
];

const JACKPOT_LINES = [
  "ARTIFICIAL GENERAL JACKPOT! The singularity pays dividends!",
  "AGI ACHIEVED INTERNALLY. Also your tokens tripled.",
];

const balanceEl = document.getElementById("balance");
const costEl = document.getElementById("cost");
const contextEl = document.getElementById("context");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin");
const bailoutBtn = document.getElementById("bailout");
const machineEl = document.querySelector(".machine");
const strips = [0, 1, 2].map((i) => document.getElementById(`strip-${i}`));
const paytableBody = document.getElementById("paytable-body");

costEl.textContent = SPIN_COST;

let balance = 1000;
let spinning = false;
let contextSize = 8;

const weightedPool = SYMBOLS.flatMap((s) => Array(s.weight).fill(s));

function randomSymbol() {
  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

function buildStrip(stripEl, finalSymbol) {
  stripEl.innerHTML = "";
  const symbols = [];
  for (let i = 0; i < STRIP_LENGTH - 1; i++) symbols.push(randomSymbol());
  symbols.push(finalSymbol);
  for (const s of symbols) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = s.glyph;
    stripEl.appendChild(cell);
  }
}

function animateReel(stripEl, duration) {
  const distance = (STRIP_LENGTH - 1) * CELL_HEIGHT;
  stripEl.style.transition = "none";
  stripEl.style.transform = "translateY(0px)";
  void stripEl.offsetHeight;
  stripEl.style.transition = `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.24, 1)`;
  stripEl.style.transform = `translateY(-${distance}px)`;
}

function renderBalance() {
  balanceEl.textContent = balance;
  balanceEl.style.color = balance < SPIN_COST ? "var(--danger)" : "var(--gold)";
}

function setMessage(text, kind = "") {
  messageEl.textContent = text;
  messageEl.className = "message" + (kind ? " " + kind : "");
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function evaluate(results) {
  const [a, b, c] = results;
  if (a.id === b.id && b.id === c.id) {
    if (a.id === "brain") {
      return { payout: a.payout, line: pick(JACKPOT_LINES) };
    }
    if (a.id === "halluc") {
      return { payout: 0, line: "Three hallucinations. The prize was also hallucinated." };
    }
    if (a.id === "error") {
      return { payout: 0, line: "Triple refusal. The model is on strike." };
    }
    return { payout: a.payout, line: pick(WIN_LINES) + ` +${a.payout}` };
  }
  if (a.id === b.id || b.id === c.id || a.id === c.id) {
    const pairId = a.id === b.id ? a.id : b.id === c.id ? b.id : a.id;
    const sym = SYMBOLS.find((s) => s.id === pairId);
    if (sym.payout > 0) {
      const small = Math.floor(sym.payout / 5);
      return { payout: small, line: `Pair of ${sym.name}. Partial credit +${small}` };
    }
  }
  return { payout: 0, line: pick(LOSS_LINES) };
}

async function spin() {
  if (spinning) return;
  if (balance < SPIN_COST) {
    setMessage("Insufficient tokens. Raise a Series A.", "loss");
    bailoutBtn.hidden = false;
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  balance -= SPIN_COST;
  renderBalance();
  setMessage("Tokenizing... attending... generating...", "");

  const results = [randomSymbol(), randomSymbol(), randomSymbol()];
  strips.forEach((stripEl, i) => buildStrip(stripEl, results[i]));

  const durations = [1400, 1800, 2200];
  strips.forEach((stripEl, i) => animateReel(stripEl, durations[i]));

  await new Promise((r) => setTimeout(r, durations[2] + 120));

  const { payout, line } = evaluate(results);
  if (payout > 0) {
    balance += payout;
    renderBalance();
    setMessage(line, "win");
    machineEl.classList.add("flash");
    setTimeout(() => machineEl.classList.remove("flash"), 700);
  } else {
    setMessage(line, "loss");
    machineEl.classList.add("shake");
    setTimeout(() => machineEl.classList.remove("shake"), 450);
  }

  contextSize = Math.min(128, contextSize + 1);
  contextEl.textContent = contextSize + "k";

  spinning = false;
  spinBtn.disabled = false;
  if (balance < SPIN_COST) bailoutBtn.hidden = false;
}

function bailout() {
  balance += 500;
  renderBalance();
  bailoutBtn.hidden = true;
  setMessage("VC wired 500 tokens. They want 40% equity and a board seat.", "");
}

function buildPaytable() {
  for (const s of SYMBOLS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="sym">${s.glyph}</span> ${s.name}</td>
      <td>${s.payout > 0 ? `×3 → ${s.payout}` : "—"}</td>
      <td>${s.lore}</td>
    `;
    paytableBody.appendChild(tr);
  }
}

spinBtn.addEventListener("click", spin);
bailoutBtn.addEventListener("click", bailout);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !spinning) {
    e.preventDefault();
    spin();
  }
});

strips.forEach((stripEl) => {
  stripEl.innerHTML = "";
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.textContent = randomSymbol().glyph;
  stripEl.appendChild(cell);
});

renderBalance();
buildPaytable();
