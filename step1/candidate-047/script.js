const SYMBOLS = [
  { icon: "🤖", name: "Bot",          weight: 20, payout: 5   },
  { icon: "💭", name: "Hallucination", weight: 25, payout: 3   },
  { icon: "📝", name: "Prompt",        weight: 18, payout: 8   },
  { icon: "⚡", name: "GPU",           weight: 12, payout: 15  },
  { icon: "🧠", name: "LLM",           weight: 10, payout: 25  },
  { icon: "🎲", name: "RNG",           weight: 8,  payout: 50  },
  { icon: "💸", name: "Funding Round", weight: 5,  payout: 100 },
  { icon: "👁️", name: "Sentience",    weight: 2,  payout: 500 },
];

const WEIGHTED = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

const LOSE_MESSAGES = [
  "Model collapsed. Tokens incinerated.",
  "Our CEO thanks you for the compute.",
  "Gradient descended. So did your wallet.",
  "404: Payout not found. Maybe next epoch.",
  "You've been rate-limited by fate.",
  "Hallucinated a win. It wasn't real.",
  "Your loss is training data now. Thanks!",
  "The attention heads weren't paying attention.",
];

const SMALL_WIN_MESSAGES = [
  "A modest payout. Sam Altman frowns slightly.",
  "You won! (Minus a 97% compute fee.)",
  "Temperature=0.7, vibes=positive.",
  "Inference successful. Barely.",
];

const BIG_WIN_MESSAGES = [
  "JACKPOT! You've achieved synthetic wealth!",
  "SINGULARITY HIT! The machine loves you.",
  "AGI ACHIEVED (for you, specifically).",
  "Series Z funding unlocked!",
];

const BET_STEPS = [5, 10, 25, 50, 100, 250, 500];

const state = {
  balance: 1000,
  betIdx: 1,
  spinning: false,
  bailoutsUsed: 0,
};

const $ = id => document.getElementById(id);
const balanceEl = $("balance");
const betEl = $("bet");
const spinBtn = $("spin");
const tickerEl = $("ticker");
const gpuEl = $("gputemp");
const ctxEl = $("context");
const reelEls = Array.from(document.querySelectorAll(".reel"));
const stripEls = reelEls.map(r => r.querySelector(".strip"));

const REEL_HEIGHT = 110;
const STRIP_LENGTH = 30;

function buildStrip(idx) {
  const strip = stripEls[idx];
  strip.innerHTML = "";
  const symbols = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    const s = WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)];
    symbols.push(s);
    const cell = document.createElement("div");
    cell.textContent = s.icon;
    strip.appendChild(cell);
  }
  strip.style.transform = "translateY(0)";
  return symbols;
}

function renderHud() {
  balanceEl.textContent = state.balance;
  betEl.textContent = BET_STEPS[state.betIdx];
  const temp = 42 + Math.floor(Math.random() * 40) + (state.spinning ? 20 : 0);
  gpuEl.textContent = temp + "°C";
  const ctx = Math.min(99, Math.floor((1000 - state.balance) / 15 + Math.random() * 8));
  ctxEl.textContent = Math.max(0, ctx) + "%";
}

function setTicker(msg, cls = "") {
  tickerEl.innerHTML = `<p class="${cls}">${msg}</p>`;
}

function randMsg(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function spin() {
  if (state.spinning) return;
  const bet = BET_STEPS[state.betIdx];
  if (state.balance < bet) {
    setTicker("Insufficient tokens. Have you tried prompt engineering a loan?", "lose");
    return;
  }

  state.spinning = true;
  state.balance -= bet;
  spinBtn.disabled = true;
  reelEls.forEach(r => r.classList.remove("winner"));
  setTicker("Running inference... please wait for the oracle.");
  renderHud();

  const results = [];
  const durations = [900, 1300, 1700];

  stripEls.forEach((strip, i) => {
    const symbols = buildStrip(i);
    const finalIdx = STRIP_LENGTH - 3;
    results.push(symbols[finalIdx]);
    const targetY = -(finalIdx * REEL_HEIGHT);
    strip.style.transition = "none";
    strip.style.transform = `translateY(${REEL_HEIGHT * 3}px)`;

    void strip.offsetHeight;

    strip.style.transition = `transform ${durations[i]}ms cubic-bezier(0.15, 0.6, 0.2, 1)`;
    strip.style.transform = `translateY(${targetY}px)`;
  });

  setTimeout(() => finishSpin(results, bet), durations[2] + 50);
}

function finishSpin(results, bet) {
  state.spinning = false;
  spinBtn.disabled = false;

  const [a, b, c] = results;
  let winnings = 0;
  let msg = "";
  let cls = "lose";

  if (a.icon === b.icon && b.icon === c.icon) {
    winnings = bet * a.payout;
    reelEls.forEach(r => r.classList.add("winner"));
    const list = a.payout >= 50 ? BIG_WIN_MESSAGES : SMALL_WIN_MESSAGES;
    msg = `${randMsg(list)} +${winnings} tokens (${a.name} x3)`;
    cls = "win";
  } else if (a.icon === b.icon || b.icon === c.icon || a.icon === c.icon) {
    const pair = a.icon === b.icon ? a : (b.icon === c.icon ? b : a);
    winnings = Math.floor(bet * pair.payout / 10);
    msg = `Two ${pair.name}s. ${winnings > 0 ? `Consolation: +${winnings}.` : "Close, yet financially ruinous."}`;
    cls = winnings > 0 ? "win" : "lose";
  } else {
    msg = randMsg(LOSE_MESSAGES);
  }

  state.balance += winnings;
  setTicker(msg, cls);
  renderHud();

  if (state.balance <= 0) {
    setTicker("You're bankrupt. The model has consumed you. Beg for a bailout.", "lose");
    spinBtn.disabled = true;
  }
}

function changeBet(delta) {
  const next = state.betIdx + delta;
  if (next < 0 || next >= BET_STEPS.length) return;
  state.betIdx = next;
  renderHud();
}

function bailout() {
  state.bailoutsUsed++;
  const amount = Math.max(100, Math.floor(500 / state.bailoutsUsed));
  state.balance += amount;
  spinBtn.disabled = false;
  const msgs = [
    `OpenAI pities you. +${amount} tokens. Don't make it weird.`,
    `Anthropic sighs. +${amount} tokens wired to your wallet.`,
    `A VC throws ${amount} tokens at you out of FOMO.`,
    `Bailout #${state.bailoutsUsed}: ${amount} tokens. Diminishing returns detected.`,
  ];
  setTicker(randMsg(msgs), "win");
  renderHud();
}

$("spin").addEventListener("click", spin);
$("betUp").addEventListener("click", () => changeBet(1));
$("betDown").addEventListener("click", () => changeBet(-1));
$("bailout").addEventListener("click", bailout);

document.addEventListener("keydown", e => {
  if (e.code === "Space" && !state.spinning) {
    e.preventDefault();
    spin();
  } else if (e.code === "ArrowUp") {
    changeBet(1);
  } else if (e.code === "ArrowDown") {
    changeBet(-1);
  }
});

stripEls.forEach((_, i) => buildStrip(i));
stripEls.forEach(s => { s.style.transform = `translateY(-${(STRIP_LENGTH - 3) * REEL_HEIGHT}px)`; });
renderHud();
setInterval(() => { if (!state.spinning) renderHud(); }, 2000);
