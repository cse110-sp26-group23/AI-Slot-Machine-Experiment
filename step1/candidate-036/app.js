"use strict";

/* ── Symbols ── */
const SYMBOLS = [
  { emoji: "🤖", name: "AGI",       triple: 5000, pair: 200, weight: 1 },
  { emoji: "🧠", name: "Brain",     triple: 2000, pair: 100, weight: 2 },
  { emoji: "⚡", name: "GPU",       triple: 800,  pair: 50,  weight: 3 },
  { emoji: "💾", name: "VRAM",      triple: 400,  pair: 30,  weight: 4 },
  { emoji: "📊", name: "Data",      triple: 200,  pair: 20,  weight: 5 },
  { emoji: "🔥", name: "Overfit",   triple: 100,  pair: 10,  weight: 5 },
  { emoji: "💭", name: "Halluc",    triple: -200, pair: 0,   weight: 3 },
];

const POOL = [];
SYMBOLS.forEach((s, i) => {
  for (let w = 0; w < s.weight; w++) POOL.push(i);
});

/* ── State ── */
const INITIAL_TOKENS = 1000;
let balance = INITIAL_TOKENS;
let bet = 10;
let spinning = false;
let totalSpins = 0;
let totalWins = 0;
let totalBurned = 0;
let bailoutCount = 0;

const BET_STEPS = [5, 10, 25, 50, 100, 250];
const CELL_HEIGHT = 100;

/* ── DOM refs ── */
const $balance   = document.getElementById("balance");
const $bet       = document.getElementById("betDisplay");
const $net       = document.getElementById("net");
const $message   = document.getElementById("message");
const $spinBtn   = document.getElementById("spinBtn");
const $bailBtn   = document.getElementById("bailoutBtn");
const $betUp     = document.getElementById("betUp");
const $betDown   = document.getElementById("betDown");
const $spins     = document.getElementById("statSpins");
const $wins      = document.getElementById("statWins");
const $winRate   = document.getElementById("statWinRate");
const $burned    = document.getElementById("statBurned");

/* ── Helpers ── */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randIdx()  { return POOL[Math.floor(Math.random() * POOL.length)]; }
function fmt(n)     { return n.toLocaleString(); }

/* ── Build a cell element ── */
function makeCell(symbolIdx) {
  const s = SYMBOLS[symbolIdx];
  const div = document.createElement("div");
  div.className = "cell";
  div.innerHTML = `<span class="cell-emoji">${s.emoji}</span><span class="cell-label">${s.name}</span>`;
  return div;
}

/* ── Init reels with random symbols ── */
function initReels() {
  for (let r = 0; r < 3; r++) {
    const strip = document.getElementById(`strip${r}`);
    strip.innerHTML = "";
    for (let i = 0; i < 9; i++) strip.appendChild(makeCell(randIdx()));
    strip.style.transition = "none";
    strip.style.transform = `translateY(-${CELL_HEIGHT * 3}px)`;
  }
}

/* ── Animate one reel ── */
function animateReel(reelIdx, targetSymbol, duration) {
  return new Promise(resolve => {
    const strip = document.getElementById(`strip${reelIdx}`);
    strip.innerHTML = "";

    const COUNT = 20;
    for (let i = 0; i < COUNT; i++) strip.appendChild(makeCell(randIdx()));
    strip.appendChild(makeCell(targetSymbol));
    for (let i = 0; i < 4; i++) strip.appendChild(makeCell(randIdx()));

    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";

    const finalY = -((COUNT - 1) * CELL_HEIGHT);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.8, 0.2, 1)`;
      strip.style.transform = `translateY(${finalY}px)`;
      setTimeout(resolve, duration + 30);
    }));
  });
}

/* ── Evaluate result ── */
function evaluate(a, b, c) {
  if (a === b && b === c) {
    const s = SYMBOLS[a];
    if (s.triple < 0) return { payout: s.triple, type: "curse" };
    return { payout: s.triple, type: "jackpot" };
  }
  const pairIdx = (a === b) ? a : (b === c) ? b : (a === c) ? a : -1;
  if (pairIdx >= 0 && SYMBOLS[pairIdx].pair > 0) {
    return { payout: SYMBOLS[pairIdx].pair, type: "pair" };
  }
  return { payout: 0, type: "miss" };
}

/* ── Lose messages ── */
const LOSE_LINES = [
  "Model confidently predicted a win. It was wrong. As usual.",
  "Your prompt was rejected by the safety filter: 'wanting to win'.",
  "Inference complete. Result: disappointment. Cost: {bet} tokens.",
  "The AI considered your request and said no.",
  "Attention layers attended to everything except your luck.",
  "Loss function working as intended. Yours, not the model's.",
  "Chain-of-thought: Step 1: Spin. Step 2: Lose. Step 3: Cope.",
  "Context window full of L's. No room for W's.",
  "The model hallucinated that you won. You didn't.",
  "Reinforcement learning update: don't do that again.",
  "Your tokens were used to fine-tune the house's advantage.",
  "Token limit reached. Achievement unlocked: poverty.",
  "Benchmarks show you lose 100% of the time. N={spins}.",
  "Error 402: Payment required. Also, you lost.",
  "The gradient vanished. So did your tokens.",
];

const WIN_LINES = [
  "Reward signal detected. +{win} tokens. The RLHF worked for once.",
  "Positive output! +{win} tokens. Don't get used to it.",
  "The model aligned with your interests. Temporarily. +{win}.",
  "Sparse reward achieved. +{win} tokens. Publish the finding.",
  "Against all probability: +{win} tokens. Bug report filed.",
];

const JACKPOT_LINES = {
  0: "AGI ACHIEVED. +{win} tokens. Sam Altman wants his cut.",
  1: "NEURAL NETWORK PEAKED. +{win} tokens. Consciousness is debatable.",
  2: "GPU GO BRRR. +{win} tokens. NVIDIA stock up 3%.",
  3: "VRAM OVERFLOW. +{win} tokens spilled into your account.",
  4: "DATA MONOPOLY. +{win} tokens. Terms of service? Never heard of it.",
  5: "MAXIMUM OVERFIT. +{win} tokens. Works on your machine.",
};

const CURSE_LINE = "TRIPLE HALLUCINATION. The model made up {loss} tokens and deleted them.";

function getMessage(type, symbolIdx, amount) {
  if (type === "curse") return CURSE_LINE.replace("{loss}", fmt(Math.abs(amount)));
  if (type === "jackpot") return (JACKPOT_LINES[symbolIdx] || "JACKPOT! +{win} tokens!").replace("{win}", fmt(amount));
  if (type === "pair") return pick(WIN_LINES).replace("{win}", fmt(amount));
  return pick(LOSE_LINES).replace("{bet}", fmt(bet)).replace("{spins}", fmt(totalSpins));
}

/* ── Update UI ── */
function updateUI() {
  $balance.textContent = fmt(balance);
  $bet.textContent = fmt(bet);

  const net = balance - INITIAL_TOKENS;
  $net.textContent = (net >= 0 ? "+" : "") + fmt(net);
  $net.className = "wallet-value" + (net > 0 ? " positive" : net < 0 ? " negative" : "");

  $spins.textContent = fmt(totalSpins);
  $wins.textContent = fmt(totalWins);
  $winRate.textContent = totalSpins ? Math.round((totalWins / totalSpins) * 100) + "%" : "0%";
  $burned.textContent = fmt(totalBurned);

  $spinBtn.disabled = spinning || balance < bet;
}

function setMessage(text, type) {
  $message.textContent = text;
  $message.className = "message-bar" + (type ? " " + type : "");
}

/* ── Particles ── */
function spawnParticles() {
  const frame = document.querySelector(".reels-frame");
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.className = "particle";
      el.textContent = pick(["🪙", "✨", "💰", "⚡", "💎"]);
      el.style.left = (10 + Math.random() * 80) + "%";
      el.style.top = (30 + Math.random() * 40) + "%";
      frame.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }, i * 80);
  }
}

/* ── Spin ── */
async function spin() {
  if (spinning || balance < bet) return;
  spinning = true;

  balance -= bet;
  totalBurned += bet;
  totalSpins++;
  updateUI();

  document.querySelectorAll(".reel").forEach(r => r.classList.remove("winning"));
  setMessage("Inferencing... please hold while we burn your tokens...", "info");
  $spinBtn.disabled = true;

  const results = [randIdx(), randIdx(), randIdx()];

  await Promise.all([
    animateReel(0, results[0], 800),
    animateReel(1, results[1], 1200),
    animateReel(2, results[2], 1600),
  ]);

  const outcome = evaluate(results[0], results[1], results[2]);

  if (outcome.type === "curse") {
    balance = Math.max(0, balance + outcome.payout);
    setMessage(getMessage("curse", results[0], outcome.payout), "lose");
  } else if (outcome.payout > 0) {
    balance += outcome.payout;
    totalWins++;

    if (results[0] === results[1]) { document.getElementById("reel0").classList.add("winning"); document.getElementById("reel1").classList.add("winning"); }
    if (results[1] === results[2]) { document.getElementById("reel1").classList.add("winning"); document.getElementById("reel2").classList.add("winning"); }
    if (results[0] === results[2]) { document.getElementById("reel0").classList.add("winning"); document.getElementById("reel2").classList.add("winning"); }

    if (outcome.type === "jackpot") {
      setMessage(getMessage("jackpot", results[0], outcome.payout), "jackpot");
      spawnParticles();
    } else {
      setMessage(getMessage("pair", results[0], outcome.payout), "win");
    }
  } else {
    setMessage(getMessage("miss", results[0], 0), "lose");
  }

  updateUI();
  spinning = false;

  if (balance < bet) {
    if (balance > 0 && balance >= BET_STEPS[0]) {
      bet = BET_STEPS.filter(b => b <= balance).pop();
      updateUI();
    }
    if (balance < BET_STEPS[0]) {
      setTimeout(() => setMessage("Token budget depleted. Click Bailout to request emergency VC funding.", "lose"), 1500);
    }
  }
}

/* ── Bet controls ── */
$betUp.addEventListener("click", () => {
  const idx = BET_STEPS.indexOf(bet);
  if (idx < BET_STEPS.length - 1) {
    const next = BET_STEPS[idx + 1];
    if (next <= balance) { bet = next; updateUI(); }
  }
});

$betDown.addEventListener("click", () => {
  const idx = BET_STEPS.indexOf(bet);
  if (idx > 0) { bet = BET_STEPS[idx - 1]; updateUI(); }
});

/* ── Bailout ── */
const BAILOUT_MSGS = [
  [500,  "Seed round closed. +500 tokens. Valuation based on vibes."],
  [1000, "Series A! +1,000 tokens. Investor asked 'but what about AGI?'"],
  [2000, "Series B! +2,000 tokens. Pitch deck was 40 slides of emojis."],
  [5000, "Series C! +5,000 tokens. Board meeting is just a group chat."],
  [10000,"Series D! +10,000 tokens. IPO roadshow is a TikTok."],
  [25000,"Government bailout! +25,000 tokens. Too big to fail, apparently."],
];

$bailBtn.addEventListener("click", () => {
  const round = Math.min(bailoutCount, BAILOUT_MSGS.length - 1);
  const [amount, msg] = BAILOUT_MSGS[round];
  balance += amount;
  bailoutCount++;
  if (bet < BET_STEPS[0]) bet = BET_STEPS[0];
  setMessage(msg, "info");
  updateUI();
});

/* ── Spin button + keyboard ── */
$spinBtn.addEventListener("click", spin);

document.addEventListener("keydown", e => {
  if ((e.code === "Space" || e.code === "Enter") && !e.target.matches("button, input")) {
    e.preventDefault();
    spin();
  }
});

/* ── Paytable ── */
function buildPaytable() {
  const grid = document.getElementById("paytableGrid");
  SYMBOLS.forEach(s => {
    const isNeg = s.triple < 0;
    let row = document.createElement("div");
    row.className = "pt-row";
    row.innerHTML = `
      <span class="pt-symbols">${s.emoji}${s.emoji}${s.emoji}</span>
      <span class="pt-name">${s.name} x3</span>
      <span class="pt-payout${isNeg ? " bad" : ""}">${isNeg ? "" : "+"}${fmt(s.triple)}</span>
    `;
    grid.appendChild(row);

    if (s.pair > 0) {
      row = document.createElement("div");
      row.className = "pt-row";
      row.innerHTML = `
        <span class="pt-symbols" style="font-size:0.85rem">${s.emoji}${s.emoji} ✦</span>
        <span class="pt-name">${s.name} x2</span>
        <span class="pt-payout">+${fmt(s.pair)}</span>
      `;
      grid.appendChild(row);
    }
  });
}

/* ── Boot ── */
initReels();
buildPaytable();
updateUI();
