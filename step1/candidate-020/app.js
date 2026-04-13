const SYMBOLS = [
  { icon: "🧠", name: "Brain",       weight: 22, payout: 2 },
  { icon: "🤖", name: "Bot",         weight: 18, payout: 3 },
  { icon: "💾", name: "Dataset",     weight: 14, payout: 5 },
  { icon: "📎", name: "Clippy",      weight: 12, payout: 8 },
  { icon: "🔥", name: "GPU Fire",    weight: 10, payout: 12 },
  { icon: "💸", name: "VC Bag",      weight: 8,  payout: 20 },
  { icon: "🦄", name: "AGI",         weight: 3,  payout: 100 },
  { icon: "⚠️", name: "Hallucination", weight: 13, payout: 0 },
];

const WIN_QUIPS = {
  "🧠": "Your model learned something! (Probably overfitting.)",
  "🤖": "Three bots agree. Consensus achieved. Alignment unclear.",
  "💾": "Triple dataset! Ethically sourced from... somewhere.",
  "📎": "It looks like you're trying to win. Would you like help?",
  "🔥": "GPUs melting. Power grid weeping. Payout secured.",
  "💸": "A VC just wired you money for saying 'agentic'.",
  "🦄": "AGI ACHIEVED!!! (in this specific slot machine, on this specific spin)",
};

const LOSS_QUIPS = [
  "Model returned: 'I cannot assist with that request.'",
  "Context window exceeded. Tokens vaporized.",
  "The AI confidently hallucinated a loss.",
  "Rate limited. Try again in 0ms.",
  "Your prompt was not engineered hard enough.",
  "Temperature was too high. Or too low. We're not sure.",
  "The model is down for 'training'. Tokens consumed anyway.",
  "Output: 'As an AI language model, I cannot pay you.'",
  "Alignment team says no.",
  "Tokens used for RLHF instead. You're welcome.",
];

const HALLUCINATION_QUIPS = [
  "⚠️ Hallucination detected. Payout was imaginary.",
  "⚠️ The reels confidently showed wrong numbers.",
  "⚠️ Citation needed. Tokens revoked.",
];

const BEG_QUIPS = [
  "Fine. Here's 100 tokens. Don't tell the board.",
  "Investor relations approved an emergency round. +100.",
  "Found 100 tokens between the couch cushions of the server rack.",
];

const weightedBag = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
const pickSymbol = () => weightedBag[Math.floor(Math.random() * weightedBag.length)];

const state = {
  balance: 1000,
  bet: 10,
  spinning: false,
};

const el = {
  balance: document.getElementById("balance"),
  bet: document.getElementById("bet"),
  payout: document.getElementById("payout"),
  spin: document.getElementById("spin"),
  betUp: document.getElementById("betUp"),
  betDown: document.getElementById("betDown"),
  beg: document.getElementById("beg"),
  log: document.getElementById("log"),
  reels: Array.from(document.querySelectorAll(".reel")),
};

function render() {
  el.balance.textContent = state.balance;
  el.bet.textContent = state.bet;
  el.spin.textContent = `SPIN ($${state.bet})`;
  el.spin.disabled = state.spinning || state.balance < state.bet;
  el.beg.hidden = state.balance >= state.bet;
}

function log(message, type = "") {
  const li = document.createElement("li");
  li.textContent = message;
  if (type) li.classList.add(type);
  el.log.prepend(li);
  while (el.log.children.length > 30) el.log.lastChild.remove();
}

function buildStrip(reelEl, finalSymbol, extraCells = 20) {
  const strip = reelEl.querySelector(".strip");
  strip.innerHTML = "";
  const cells = [];
  for (let i = 0; i < extraCells; i++) cells.push(pickSymbol());
  cells.push(finalSymbol);
  for (const s of cells) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = s.icon;
    strip.appendChild(cell);
  }
  return strip;
}

function spinReel(reelEl, finalSymbol, duration) {
  return new Promise(resolve => {
    const strip = buildStrip(reelEl, finalSymbol);
    const cellCount = strip.children.length;
    const cellHeight = strip.children[0].getBoundingClientRect().height;
    const endOffset = (cellCount - 1) * cellHeight;

    strip.style.transition = "none";
    strip.style.transform = `translateY(0px)`;
    void strip.offsetHeight;
    strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.65, 0.25, 1)`;
    strip.style.transform = `translateY(-${endOffset}px)`;

    setTimeout(resolve, duration);
  });
}

function calcPayout(results) {
  const [a, b, c] = results;
  el.reels.forEach(r => r.classList.remove("winning", "jackpot"));

  if (a.name === "Hallucination" || b.name === "Hallucination" || c.name === "Hallucination") {
    if (a.icon === b.icon && b.icon === c.icon) {
      log(HALLUCINATION_QUIPS[Math.floor(Math.random() * HALLUCINATION_QUIPS.length)], "loss");
    }
    return 0;
  }

  if (a.icon === b.icon && b.icon === c.icon) {
    const win = state.bet * a.payout;
    el.reels.forEach(r => r.classList.add("winning"));
    if (a.name === "AGI") el.reels.forEach(r => r.classList.add("jackpot"));
    return win;
  }

  if (a.icon === b.icon || b.icon === c.icon || a.icon === c.icon) {
    const matched = a.icon === b.icon ? a : (b.icon === c.icon ? b : a);
    const win = Math.floor(state.bet * matched.payout * 0.25);
    [el.reels[0], el.reels[1], el.reels[2]].forEach((r, i) => {
      if (results[i].icon === matched.icon) r.classList.add("winning");
    });
    return win;
  }

  return 0;
}

async function spin() {
  if (state.spinning || state.balance < state.bet) return;
  state.spinning = true;
  state.balance -= state.bet;
  el.payout.textContent = "0";
  render();

  const results = [pickSymbol(), pickSymbol(), pickSymbol()];
  const durations = [900, 1200, 1500];

  await Promise.all(results.map((s, i) => spinReel(el.reels[i], s, durations[i])));

  const payout = calcPayout(results);
  state.balance += payout;
  el.payout.textContent = payout;

  if (payout > 0) {
    const top = results[0].icon === results[1].icon && results[1].icon === results[2].icon
      ? results[0] : null;
    if (top && top.name === "AGI") {
      log(`🦄 JACKPOT! ${WIN_QUIPS[top.icon]} +${payout} tokens`, "big");
    } else if (top) {
      log(`${WIN_QUIPS[top.icon]} +${payout} tokens`, "win");
    } else {
      log(`Partial match. The model gave you ${payout} tokens out of pity.`, "win");
    }
  } else {
    log(LOSS_QUIPS[Math.floor(Math.random() * LOSS_QUIPS.length)], "loss");
  }

  state.spinning = false;
  render();
}

function beg() {
  state.balance += 100;
  log(BEG_QUIPS[Math.floor(Math.random() * BEG_QUIPS.length)], "win");
  render();
}

function adjustBet(delta) {
  const steps = [1, 5, 10, 25, 50, 100, 250];
  const idx = steps.indexOf(state.bet);
  if (idx === -1) {
    state.bet = 10;
  } else {
    const next = idx + delta;
    if (next >= 0 && next < steps.length) state.bet = steps[next];
  }
  render();
}

el.spin.addEventListener("click", spin);
el.beg.addEventListener("click", beg);
el.betUp.addEventListener("click", () => adjustBet(1));
el.betDown.addEventListener("click", () => adjustBet(-1));
document.addEventListener("keydown", e => {
  if (e.code === "Space") { e.preventDefault(); spin(); }
});

// Initial fill
el.reels.forEach(r => buildStrip(r, pickSymbol(), 0));
log("Hallucin-o-Matic booted. Model weights loaded. Dignity: not found.");
render();
