const SYMBOLS = [
  { id: "gpu",     icon: "🖥️", name: "GPU",           weight: 6,  payout: 3  },
  { id: "chip",    icon: "🧠", name: "Neural Net",    weight: 5,  payout: 5  },
  { id: "robot",   icon: "🤖", name: "Agent",         weight: 4,  payout: 8  },
  { id: "book",    icon: "📚", name: "Training Data", weight: 5,  payout: 4  },
  { id: "fire",    icon: "🔥", name: "GPU Fire",      weight: 3,  payout: 12 },
  { id: "money",   icon: "💸", name: "VC Money",      weight: 2,  payout: 20 },
  { id: "rocket",  icon: "🚀", name: "AGI",           weight: 1,  payout: 100 },
  { id: "bug",     icon: "🐛", name: "Hallucination", weight: 4,  payout: 0  },
];

const WEIGHTED_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

const LOSS_LINES = [
  "Model response: 'I cannot help with that.'",
  "Rate limit exceeded. Please wait 47 years.",
  "The model apologized confidently and gave you nothing.",
  "Output was 'As an AI language model...' — void.",
  "GPU melted. Replacement: $40,000.",
  "Response truncated at max_tokens. Refund denied.",
  "Safety filter ate your winnings.",
  "Model drifted. Your payout is now in Mandarin.",
  "Bench scored 99%. Real-world result: 0.",
  "It suggested you 'consult a professional'.",
];

const SMALL_WIN_LINES = [
  "Minor breakthrough. Paper accepted at NeurIPS Workshop.",
  "Benchmark gamed successfully.",
  "Nvidia stock went up. You got crumbs.",
  "LoRA fine-tune converged.",
  "The demo worked once. Ship it.",
];

const BIG_WIN_LINES = [
  "SOTA achieved (on this one benchmark).",
  "Series B closed. Valuation: absurd.",
  "Model card lies confirmed — big payout.",
  "Sam called. You're cooked (in a good way).",
];

const JACKPOT_LINES = [
  "🚨 AGI ACHIEVED INTERNALLY 🚨",
  "🚨 WE FEEL THE AGI 🚨",
  "🚨 P(DOOM) = PAID 🚨",
];

const BUG_LINES = [
  "The model hallucinated your winnings.",
  "It confidently invented a citation for your payout. Denied.",
  "Output: 'According to a 2019 study that doesn't exist...' ",
];

const balanceEl   = document.getElementById("balance");
const betEl       = document.getElementById("bet");
const spinBtn     = document.getElementById("spinBtn");
const betUpBtn    = document.getElementById("betUp");
const betDownBtn  = document.getElementById("betDown");
const maxBetBtn   = document.getElementById("maxBet");
const logEl       = document.getElementById("log");
const toastEl     = document.getElementById("toast");
const contextFill = document.getElementById("contextFill");
const strips      = [...document.querySelectorAll(".strip")];

const STATE = {
  balance: 1000,
  bet: 50,
  spinning: false,
  context: 0.12,
};

const BET_STEPS = [10, 25, 50, 100, 250, 500, 1000];

function pickSymbol() {
  return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)];
}

function buildStrip(stripEl, finalSymbol, extra = 24) {
  stripEl.innerHTML = "";
  stripEl.style.transition = "none";
  stripEl.style.transform = "translateY(0)";

  const frag = document.createDocumentFragment();
  for (let i = 0; i < extra; i++) {
    const s = pickSymbol();
    const d = document.createElement("div");
    d.className = "symbol";
    d.textContent = s.icon;
    frag.appendChild(d);
  }
  const finalEl = document.createElement("div");
  finalEl.className = "symbol";
  finalEl.textContent = finalSymbol.icon;
  frag.appendChild(finalEl);

  stripEl.appendChild(frag);
  return extra;
}

function animateReel(stripEl, steps, duration) {
  return new Promise(resolve => {
    const cellHeight = stripEl.querySelector(".symbol").offsetHeight;
    const distance = steps * cellHeight;
    requestAnimationFrame(() => {
      stripEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.9, 0.3, 1)`;
      stripEl.style.transform = `translateY(-${distance}px)`;
      setTimeout(resolve, duration + 40);
    });
  });
}

function renderInitialReels() {
  strips.forEach(strip => {
    strip.innerHTML = "";
    const s = pickSymbol();
    const d = document.createElement("div");
    d.className = "symbol";
    d.textContent = s.icon;
    strip.appendChild(d);
  });
}

function updateUI() {
  balanceEl.textContent = STATE.balance.toLocaleString();
  betEl.textContent = STATE.bet;
  spinBtn.disabled = STATE.spinning || STATE.balance < STATE.bet;
  betUpBtn.disabled = STATE.spinning;
  betDownBtn.disabled = STATE.spinning;
  maxBetBtn.disabled = STATE.spinning;

  const pct = Math.min(1, STATE.context);
  contextFill.style.width = `${(pct * 100).toFixed(0)}%`;
  if (pct > 0.9) {
    contextFill.style.background = "linear-gradient(90deg, #ff5b6b, #ffd24a)";
  } else {
    contextFill.style.background = "linear-gradient(90deg, #7afcff, #ff5cf0)";
  }
}

function log(msg, cls = "") {
  const li = document.createElement("li");
  li.textContent = `> ${msg}`;
  if (cls) li.classList.add(cls);
  logEl.insertBefore(li, logEl.firstChild);
  while (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
}

function toast(msg, bad = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("bad", bad);
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function changeBet(delta) {
  const idx = BET_STEPS.indexOf(STATE.bet);
  const next = Math.max(0, Math.min(BET_STEPS.length - 1, idx + delta));
  STATE.bet = BET_STEPS[next];
  updateUI();
}

function resolveOutcome(results) {
  const [a, b, c] = results;
  const bet = STATE.bet;

  if (a.id === b.id && b.id === c.id) {
    if (a.id === "bug") {
      log(pick(BUG_LINES), "loss");
      toast("HALLUCINATION — NO PAYOUT", true);
      return 0;
    }
    const mult = a.payout;
    const won = bet * mult;
    if (a.id === "rocket") {
      log(pick(JACKPOT_LINES), "jackpot");
      toast(`JACKPOT! +${won.toLocaleString()}`);
    } else {
      log(`Triple ${a.name}! +${won.toLocaleString()} tokens. ${pick(BIG_WIN_LINES)}`, "win");
      toast(`TRIPLE ${a.name.toUpperCase()} +${won}`);
    }
    return won;
  }

  if (a.id === b.id || b.id === c.id || a.id === c.id) {
    const pairSym = (a.id === b.id) ? a : (b.id === c.id ? b : a);
    if (pairSym.id === "bug") {
      log("Double hallucination detected. Confidence: 99%.", "loss");
      return 0;
    }
    const won = Math.max(1, Math.floor(bet * (pairSym.payout / 4)));
    log(`Pair of ${pairSym.name}. +${won} tokens. ${pick(SMALL_WIN_LINES)}`, "win");
    return won;
  }

  log(pick(LOSS_LINES), "loss");
  return 0;
}

async function spin() {
  if (STATE.spinning || STATE.balance < STATE.bet) return;
  STATE.spinning = true;
  STATE.balance -= STATE.bet;
  STATE.context = Math.min(1, STATE.context + 0.04 + Math.random() * 0.02);
  updateUI();
  log(`Inference started. Bet: ${STATE.bet} tokens.`);

  strips.forEach(s => s.parentElement.classList.remove("win"));

  const results = [pickSymbol(), pickSymbol(), pickSymbol()];
  const steps = results.map((sym, i) => buildStrip(strips[i], sym, 20 + i * 6));
  const durations = [900, 1200, 1500];

  await Promise.all(results.map((_, i) =>
    animateReel(strips[i], steps[i], durations[i])
  ));

  const payout = resolveOutcome(results);
  if (payout > 0) {
    STATE.balance += payout;
    results.forEach((r, i) => {
      if (results.filter(x => x.id === r.id).length >= 2 && r.id !== "bug") {
        strips[i].parentElement.classList.add("win");
      }
    });
  }

  if (STATE.context >= 1) {
    log("⚠ Context window full. Model forgot everything. Balance halved.", "loss");
    toast("CONTEXT OVERFLOW", true);
    STATE.balance = Math.floor(STATE.balance / 2);
    STATE.context = 0.12;
  }

  STATE.spinning = false;
  updateUI();

  if (STATE.balance <= 0) {
    log("💀 You're broke. Go beg a VC.", "loss");
    toast("OUT OF TOKENS", true);
    spinBtn.disabled = true;
  }
}

spinBtn.addEventListener("click", spin);
betUpBtn.addEventListener("click", () => changeBet(1));
betDownBtn.addEventListener("click", () => changeBet(-1));
maxBetBtn.addEventListener("click", () => {
  const affordable = BET_STEPS.filter(b => b <= STATE.balance);
  STATE.bet = affordable[affordable.length - 1] || BET_STEPS[0];
  updateUI();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); spin(); }
  if (e.key === "ArrowUp")   changeBet(1);
  if (e.key === "ArrowDown") changeBet(-1);
});

renderInitialReels();
updateUI();
log("System online. GPUs spinning up. Welcome, degenerate.");
log("Tip: Triple 🚀 = AGI jackpot. Triple 🐛 = hallucinated payout.");
