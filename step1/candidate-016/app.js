const SYMBOLS = [
  { emoji: "🤖", name: "AGI",          payout: 100, tagline: "AGI achieved internally" },
  { emoji: "🧠", name: "Context",      payout: 25,  tagline: "Context window expanded" },
  { emoji: "🔮", name: "Hallucination",payout: 10,  tagline: "Confidently wrong" },
  { emoji: "💸", name: "Burn Rate",    payout: 5,   tagline: "GPU go brrr" },
  { emoji: "⚠️", name: "Rate Limit",   payout: 3,   tagline: "429 Too Many Requests" },
  { emoji: "📉", name: "Loss Curve",   payout: 2,   tagline: "Gradient vanished" },
  { emoji: "♾️", name: "Tokens",       payout: 50,  tagline: "Infinite tokens glitch" },
];

const WIN_MESSAGES = {
  jackpot: [
    "🚨 AGI ACHIEVED. Please update your LinkedIn bio.",
    "The model is sentient. Sam is calling. You win BIG.",
    "Singularity unlocked. Jensen weeps tears of joy.",
  ],
  big: [
    "Your prompt was, uh, adequate. Big win!",
    "The stochastic parrot squawked correctly this time.",
    "GPU brrr. Tokens go up.",
  ],
  small: [
    "A few tokens leaked out of the transformer. You'll take it.",
    "Minor hallucination in your favor.",
    "The RLHF gods smile faintly upon you.",
  ],
  twoMatch: [
    "Two out of three. Close enough for a Series C.",
    "Partial credit — like a model on a benchmark it was trained on.",
  ],
};

const LOSS_MESSAGES = [
  "Model hallucinated. No tokens for you.",
  "Rate limited. Try again in 1 millisecond. Or 1 year.",
  "Context window full. Thoughts evicted.",
  "Your prompt was filtered for safety. (It wasn't.)",
  "The model is currently overloaded. (With your money.)",
  "Inference error: reasoning not found.",
  "Alignment tax collected. Thank you for your contribution.",
  "Training data exhausted. So is your wallet.",
  "The attention heads were looking elsewhere.",
  "Your prompt engineering degree has been revoked.",
];

const state = {
  balance: 1000,
  bet: 25,
  spins: 0,
  spinning: false,
  reels: [0, 0, 0],
};

const $ = (id) => document.getElementById(id);
const balanceEl = $("balance");
const betEl = $("bet");
const spinsEl = $("spins");
const messageEl = $("message");
const spinBtn = $("spin-btn");
const betUp = $("bet-up");
const betDown = $("bet-down");
const refillBtn = $("refill-btn");
const reelEls = [$("reel-0"), $("reel-1"), $("reel-2")];
const reelFrames = document.querySelectorAll(".reel-frame");

const BET_STEPS = [5, 10, 25, 50, 100, 250];

function init() {
  reelEls.forEach((reel, i) => buildReelStrip(reel, i));
  renderPaytable();
  render();
  spinBtn.addEventListener("click", spin);
  betUp.addEventListener("click", () => adjustBet(1));
  betDown.addEventListener("click", () => adjustBet(-1));
  refillBtn.addEventListener("click", refill);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); spin(); }
  });
}

function buildReelStrip(reelEl, reelIdx) {
  const strip = [];
  for (let i = 0; i < 30; i++) {
    strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  strip.push(SYMBOLS[state.reels[reelIdx]]);
  reelEl.innerHTML = strip
    .map((s) => `<div class="symbol">${s.emoji}</div>`)
    .join("");
  reelEl.style.transform = `translateY(-${(strip.length - 1) * 120}px)`;
}

function renderPaytable() {
  const list = $("paytable-list");
  list.innerHTML = SYMBOLS
    .slice()
    .sort((a, b) => b.payout - a.payout)
    .map((s) =>
      `<li><span>${s.emoji}${s.emoji}${s.emoji}</span>` +
      `<span class="label">${s.name} — ${s.tagline}</span>` +
      `<span class="payout">${s.payout}x</span></li>`
    )
    .join("");
}

function render() {
  balanceEl.textContent = state.balance.toLocaleString();
  betEl.textContent = state.bet;
  spinsEl.textContent = `${state.spins} / ∞`;
  spinBtn.disabled = state.spinning || state.balance < state.bet;
  betUp.disabled = state.spinning;
  betDown.disabled = state.spinning;
  refillBtn.disabled = state.spinning;
  if (state.balance < state.bet && !state.spinning) {
    spinBtn.textContent = "BROKE";
  } else {
    spinBtn.textContent = "SPIN";
  }
}

function adjustBet(direction) {
  const idx = BET_STEPS.indexOf(state.bet);
  const next = Math.max(0, Math.min(BET_STEPS.length - 1, idx + direction));
  state.bet = BET_STEPS[next];
  render();
}

function refill() {
  state.balance += 500;
  showMessage("VC term sheet signed. 500 tokens wired. (Dilution: severe.)", "");
  flash(balanceEl, "flash");
  render();
}

function showMessage(text, kind) {
  messageEl.textContent = text;
  messageEl.className = "message" + (kind ? " " + kind : "");
}

function flash(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function pickRandomResult() {
  const r = Math.random();
  if (r < 0.05) {
    const sym = Math.floor(Math.random() * SYMBOLS.length);
    return [sym, sym, sym];
  }
  if (r < 0.22) {
    const sym = Math.floor(Math.random() * SYMBOLS.length);
    const other = Math.floor(Math.random() * SYMBOLS.length);
    const pos = Math.floor(Math.random() * 3);
    const result = [sym, sym, sym];
    result[pos] = other === sym ? (other + 1) % SYMBOLS.length : other;
    return result;
  }
  return [
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
  ];
}

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  state.spinning = true;
  state.balance -= state.bet;
  state.spins += 1;
  flash(balanceEl, "flash-loss");
  showMessage("Running inference...", "");
  reelFrames.forEach((f) => f.classList.remove("winner"));
  render();

  const result = pickRandomResult();

  const spinPromises = reelEls.map((reel, i) =>
    spinReel(reel, i, result[i], 1200 + i * 350)
  );
  await Promise.all(spinPromises);

  state.reels = result;
  evaluate(result);
  state.spinning = false;
  render();
}

function spinReel(reelEl, reelIdx, finalSymbolIdx, duration) {
  return new Promise((resolve) => {
    const stripLength = 40;
    const strip = [];
    for (let i = 0; i < stripLength - 1; i++) {
      strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    strip.push(SYMBOLS[finalSymbolIdx]);

    reelEl.innerHTML = strip
      .map((s) => `<div class="symbol">${s.emoji}</div>`)
      .join("");
    reelEl.style.transition = "none";
    reelEl.style.transform = "translateY(0)";
    reelEl.classList.add("spinning");

    void reelEl.offsetWidth;

    const finalOffset = (stripLength - 1) * 120;
    reelEl.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
    reelEl.style.transform = `translateY(-${finalOffset}px)`;

    setTimeout(() => {
      reelEl.classList.remove("spinning");
      resolve();
    }, duration);
  });
}

function evaluate(result) {
  const [a, b, c] = result;
  let winnings = 0;
  let kind = "";
  let message = "";

  if (a === b && b === c) {
    const sym = SYMBOLS[a];
    winnings = state.bet * sym.payout;
    if (sym.payout >= 100) {
      kind = "jackpot";
      message = pick(WIN_MESSAGES.jackpot);
      reelFrames.forEach((f) => f.classList.add("winner"));
    } else if (sym.payout >= 10) {
      kind = "win";
      message = `${pick(WIN_MESSAGES.big)} (${sym.name} x${sym.payout})`;
      reelFrames.forEach((f) => f.classList.add("winner"));
    } else {
      kind = "win";
      message = `${pick(WIN_MESSAGES.small)} (${sym.name} x${sym.payout})`;
      reelFrames.forEach((f) => f.classList.add("winner"));
    }
  } else if (a === b || b === c || a === c) {
    winnings = Math.floor(state.bet * 1.5);
    kind = "win";
    message = pick(WIN_MESSAGES.twoMatch) + ` (+${winnings})`;
  } else {
    kind = "loss";
    message = pick(LOSS_MESSAGES);
  }

  if (winnings > 0) {
    state.balance += winnings;
    flash(balanceEl, "flash");
    if (kind !== "jackpot") message += ` +${winnings} tokens`;
    else message += ` +${winnings.toLocaleString()} TOKENS`;
  }

  showMessage(message, kind);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

init();
