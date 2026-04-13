const SYMBOLS = [
  { icon: "🤖", name: "AGI",          weight: 1,  payout: 100, quip: "AGI ACHIEVED (internally). Payout: {n} tokens." },
  { icon: "🧠", name: "Brain",        weight: 3,  payout: 25,  quip: "You out-thought the model. +{n} tokens." },
  { icon: "💭", name: "Hallucination",weight: 6,  payout: 10,  quip: "Three confident lies in a row. +{n} tokens." },
  { icon: "📊", name: "Benchmark",    weight: 5,  payout: 15,  quip: "SOTA on a benchmark nobody uses. +{n} tokens." },
  { icon: "🔥", name: "GPU",          weight: 4,  payout: 20,  quip: "Melted an H100. Somehow +{n} tokens." },
  { icon: "📎", name: "Paperclip",    weight: 2,  payout: 50,  quip: "Maximizing paperclips. +{n} tokens." },
  { icon: "⚠️", name: "Bias",         weight: 7,  payout: 5,   quip: "Detected in training data. +{n} tokens." },
  { icon: "💸", name: "Burn Rate",    weight: 8,  payout: 3,   quip: "Series C closed. +{n} tokens." },
];

const LOSS_QUIPS = [
  "As a large language model, I cannot confirm you won.",
  "Hallucinated a win. Rolling back.",
  "Your prompt was not engineered well enough.",
  "RLHF says: try harder, human.",
  "The model was distilled. So were your tokens.",
  "Gradient descent, meet token descent.",
  "Temperature was too high. Try again.",
  "Context window overflowed. Tokens evicted.",
  "Your alignment is off. Literally.",
  "Please subscribe to Pro for better luck.",
];

const NEAR_MISS_QUIPS = [
  "Two of three. The model ALMOST understood.",
  "Close. But AI doesn't do 'close'.",
  "Would've won in a parallel universe (or a demo video).",
];

const INTRO_QUIPS = [
  "Insert tokens. Trust the process. Ignore the bias.",
  "Disclaimer: this machine was trained on itself.",
  "Now with 100% more attention heads.",
  "Warning: may generate confident nonsense.",
];

const STORAGE_KEY = "hallucin8bit:v1";

const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
  context: 100,
};

const reelsEl = document.querySelector(".reels");
const reelEls = [...document.querySelectorAll(".reel")];
const stripEls = reelEls.map(r => r.querySelector(".strip"));
const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const contextEl = document.getElementById("context");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin");
const betUpBtn = document.getElementById("bet-up");
const betDownBtn = document.getElementById("bet-down");
const maxBetBtn = document.getElementById("max-bet");
const resetBtn = document.getElementById("reset");
const paytableEl = document.getElementById("paytable");

const BET_STEPS = [1, 5, 10, 25, 50, 100, 250];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.balance === "number") {
      state.balance = saved.balance;
      state.bet = saved.bet ?? 10;
    }
  } catch {}
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    balance: state.balance,
    bet: state.bet,
  }));
}

function render() {
  balanceEl.textContent = state.balance.toLocaleString();
  betEl.textContent = state.bet.toLocaleString();
  contextEl.textContent = Math.max(0, Math.round(state.context)) + "%";
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUpBtn.disabled = state.spinning;
  betDownBtn.disabled = state.spinning;
  maxBetBtn.disabled = state.spinning;
}

function buildPaytable() {
  paytableEl.innerHTML = SYMBOLS
    .slice()
    .sort((a, b) => b.payout - a.payout)
    .map(s => `
      <li>
        <span><span class="sym">${s.icon}</span> ${s.name}</span>
        <span class="mult">×${s.payout}</span>
      </li>
    `).join("");
}

function buildStrip(reelIndex, finalSymbol) {
  const cells = [];
  const spinLength = 20 + reelIndex * 6;
  for (let i = 0; i < spinLength; i++) {
    cells.push(weightedPick());
  }
  cells.push(finalSymbol);
  return cells;
}

function weightedPick() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[0];
}

function renderStrip(stripEl, cells) {
  stripEl.innerHTML = cells.map(c => `<div class="cell">${c.icon}</div>`).join("");
  stripEl.style.transform = "translateY(0)";
}

function spinReel(reelIndex, finalSymbol, durationMs) {
  return new Promise(resolve => {
    const reel = reelEls[reelIndex];
    const strip = stripEls[reelIndex];
    const cells = buildStrip(reelIndex, finalSymbol);
    renderStrip(strip, cells);
    reel.classList.add("spinning");

    const cellHeight = reel.clientHeight;
    const totalDistance = (cells.length - 1) * cellHeight;

    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";
    void strip.offsetHeight;

    strip.style.transition = `transform ${durationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
    strip.style.transform = `translateY(-${totalDistance}px)`;

    setTimeout(() => {
      reel.classList.remove("spinning");
      resolve();
    }, durationMs + 20);
  });
}

function floatText(text, kind) {
  const el = document.createElement("div");
  el.className = `float ${kind}`;
  el.textContent = text;
  const rect = reelsEl.getBoundingClientRect();
  el.style.left = (rect.left + rect.width / 2 - 40) + "px";
  el.style.top = (rect.top + rect.height / 2 - 20) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function setMessage(text) {
  messageEl.textContent = text;
}

function evaluate(results) {
  const [a, b, c] = results;
  if (a.name === b.name && b.name === c.name) {
    return { kind: "jackpot", symbol: a, multiplier: a.payout };
  }
  if (a.name === b.name || b.name === c.name || a.name === c.name) {
    const sym = a.name === b.name ? a : (b.name === c.name ? b : a);
    return { kind: "pair", symbol: sym, multiplier: Math.max(1, Math.floor(sym.payout / 10)) };
  }
  return { kind: "loss" };
}

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  state.spinning = true;
  state.balance -= state.bet;
  state.context = Math.max(0, state.context - 1.5);
  setMessage("Thinking step by step...");
  render();

  const results = [weightedPick(), weightedPick(), weightedPick()];
  const durations = [900, 1200, 1500];

  await Promise.all(results.map((sym, i) => spinReel(i, sym, durations[i])));

  const outcome = evaluate(results);

  if (outcome.kind === "jackpot") {
    const win = state.bet * outcome.multiplier;
    state.balance += win;
    state.context = Math.min(100, state.context + 10);
    reelsEl.classList.add("win");
    setTimeout(() => reelsEl.classList.remove("win"), 1800);
    setMessage(outcome.symbol.quip.replace("{n}", win.toLocaleString()));
    floatText(`+${win}`, "win");
  } else if (outcome.kind === "pair") {
    const win = state.bet * outcome.multiplier;
    state.balance += win;
    setMessage(pick(NEAR_MISS_QUIPS) + ` Consolation: +${win} tokens.`);
    floatText(`+${win}`, "win");
  } else {
    setMessage(pick(LOSS_QUIPS));
    floatText(`−${state.bet}`, "loss");
  }

  state.spinning = false;
  if (state.balance <= 0) {
    setTimeout(() => setMessage("You are out of tokens. The model has been fine-tuned on your suffering."), 1500);
  }
  save();
  render();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function adjustBet(dir) {
  const idx = BET_STEPS.indexOf(state.bet);
  const next = Math.min(BET_STEPS.length - 1, Math.max(0, (idx < 0 ? 2 : idx) + dir));
  state.bet = BET_STEPS[next];
  save();
  render();
}

function maxBet() {
  const affordable = BET_STEPS.filter(b => b <= state.balance).pop();
  state.bet = affordable ?? BET_STEPS[0];
  save();
  render();
}

function resetBalance() {
  state.balance = 1000;
  state.bet = 10;
  state.context = 100;
  setMessage("Dev took pity. Fresh 1000 tokens. Don't get attached.");
  save();
  render();
}

function initReelsVisual() {
  stripEls.forEach(strip => {
    strip.innerHTML = `<div class="cell">🎰</div>`;
  });
}

spinBtn.addEventListener("click", spin);
betUpBtn.addEventListener("click", () => adjustBet(1));
betDownBtn.addEventListener("click", () => adjustBet(-1));
maxBetBtn.addEventListener("click", maxBet);
resetBtn.addEventListener("click", resetBalance);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    spin();
  } else if (e.key === "ArrowUp") {
    adjustBet(1);
  } else if (e.key === "ArrowDown") {
    adjustBet(-1);
  }
});

load();
buildPaytable();
initReelsVisual();
setMessage(pick(INTRO_QUIPS));
render();
