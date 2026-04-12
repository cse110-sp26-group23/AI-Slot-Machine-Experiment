// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const SYMBOLS = ["🤖", "🧠", "💀", "💬", "🔥", "📉"];

const PAYOUTS = {
  "🤖🤖🤖": { mult: 1000, text: "Full sentience achieved. Investors panic." },
  "🧠🧠🧠": { mult: 500, text: "Big brain move. Still no profit." },
  "💀💀💀": { mult: 250, text: "Alignment failed successfully." },
  "💬💬💬": { mult: 100, text: "Confidently incorrect output generated." },
  "🔥🔥🔥": { mult: 75, text: "GPU cluster is now molten slag." },
  "📉📉📉": { mult: 50, text: "Market loved it. Stock still down." }
};

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let balance = 1_000_000;
let burned = 0;
let currentBet = 500;
let spinning = false;

// ─────────────────────────────────────────
// DOM
// ─────────────────────────────────────────
const tokenCountEl = document.getElementById("tokenCount");
const burnedEl = document.getElementById("tokensBurned");
const resultText = document.getElementById("resultText");
const spinBtn = document.getElementById("spinBtn");
const lever = document.getElementById("lever");
const historyList = document.getElementById("historyList");

const modal = document.getElementById("winModal");
const modalEmoji = document.getElementById("modalEmoji");
const modalTitle = document.getElementById("modalTitle");
const modalAmount = document.getElementById("modalAmount");
const modalFlavor = document.getElementById("modalFlavor");
const modalClose = document.getElementById("modalClose");

const reels = [
  document.getElementById("reelInner0"),
  document.getElementById("reelInner1"),
  document.getElementById("reelInner2")
];

// ─────────────────────────────────────────
// INIT REELS
// ─────────────────────────────────────────
function populateReel(reel) {
  reel.innerHTML = "";
  for (let i = 0; i < 30; i++) {
    const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const div = document.createElement("div");
    div.className = "reel-symbol";
    div.textContent = sym;
    reel.appendChild(div);
  }
}

reels.forEach(populateReel);

// ─────────────────────────────────────────
// UTIL
// ─────────────────────────────────────────
function format(num) {
  return num.toLocaleString();
}

function updateDisplay() {
  tokenCountEl.textContent = format(balance);
  burnedEl.textContent = format(burned);
}

function bump(el) {
  el.classList.add("bump");
  setTimeout(() => el.classList.remove("bump"), 150);
}

// ─────────────────────────────────────────
// SPIN LOGIC
// ─────────────────────────────────────────
function spin() {
  if (spinning) return;
  if (balance < currentBet) {
    resultText.textContent = "Insufficient tokens. Please acquire funding.";
    resultText.className = "lose";
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  spinBtn.classList.add("pressed");
  lever.classList.add("pulled");

  // burn tokens
  balance -= currentBet;
  burned += currentBet;
  updateDisplay();
  bump(tokenCountEl);

  resultText.textContent = "Inferring...";
  resultText.className = "";

  const results = [];

  reels.forEach((reel, i) => {
    const offset = Math.floor(Math.random() * 20 + 20) * 90;
    reel.style.transition = "transform 1s cubic-bezier(.2,.8,.3,1)";
    reel.style.transform = `translateY(-${offset}px)`;

    setTimeout(() => {
      const symbols = reel.children;
      const index = Math.floor(offset / 90) % symbols.length;
      const symbol = symbols[index].textContent;
      results[i] = symbol;

      if (i === 2) finishSpin(results);
    }, 1000 + i * 200);
  });
}

// ─────────────────────────────────────────
// RESULT EVAL
// ─────────────────────────────────────────
function finishSpin(results) {
  spinning = false;
  spinBtn.disabled = false;
  spinBtn.classList.remove("pressed");
  lever.classList.remove("pulled");

  const combo = results.join("");

  let winnings = 0;
  let flavor = "";
  let emoji = "🤡";

  if (PAYOUTS[combo]) {
    winnings = currentBet * PAYOUTS[combo].mult;
    flavor = PAYOUTS[combo].text;
    emoji = results[0];
  } else if (
    results[0] === results[1] ||
    results[1] === results[2] ||
    results[0] === results[2]
  ) {
    winnings = currentBet * 2;
    flavor = "Partial credit. Model almost converged.";
    emoji = "⚠️";
  } else {
    flavor = randomLossText();
  }

  if (winnings > 0) {
    balance += winnings;
    resultText.textContent = `+${format(winnings)} tokens`;
    resultText.className = "win";

    showModal(emoji, "OUTPUT ACCEPTED", winnings, flavor);
  } else {
    resultText.textContent = "No useful output generated.";
    resultText.className = "lose";
  }

  updateDisplay();
  addHistory(results, winnings);
}

// ─────────────────────────────────────────
// FLAVOR
// ─────────────────────────────────────────
function randomLossText() {
  const lines = [
    "Model drift detected.",
    "Your prompt was ignored.",
    "Token burn successful.",
    "Output truncated.",
    "Hallucination discarded.",
    "Retry with more compute."
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// ─────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────
function addHistory(results, win) {
  const li = document.createElement("li");

  const left = document.createElement("span");
  left.textContent = results.join(" ");

  const right = document.createElement("span");
  right.textContent = win > 0 ? `+${format(win)}` : `-${format(currentBet)}`;
  right.className = win > 0 ? "h-win" : "h-lose";

  li.appendChild(left);
  li.appendChild(right);

  historyList.prepend(li);

  if (historyList.children.length > 20) {
    historyList.removeChild(historyList.lastChild);
  }
}

// ─────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────
function showModal(emoji, title, amount, flavor) {
  modalEmoji.textContent = emoji;
  modalTitle.textContent = title;
  modalAmount.textContent = `+${format(amount)} tokens`;
  modalFlavor.textContent = flavor;

  modal.classList.add("show");
}

modalClose.onclick = () => modal.classList.remove("show");

// ─────────────────────────────────────────
// BETTING
// ─────────────────────────────────────────
document.querySelectorAll(".bet-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bet-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentBet = parseInt(btn.dataset.bet);
  });
});

// ─────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────
spinBtn.addEventListener("click", spin);
lever.addEventListener("click", spin);

// init display
updateDisplay();
