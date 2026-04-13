(() => {
  "use strict";

  // --- Symbols & Payouts ---
  const SYMBOLS = [
    { icon: "\u{1F916}", name: "Robot",        weight: 8 },
    { icon: "\u{1F9E0}", name: "Brain",        weight: 7 },
    { icon: "\u{1F4A1}", name: "Lightbulb",    weight: 6 },
    { icon: "\u{1F525}", name: "Fire",         weight: 5 },
    { icon: "\u{1F480}", name: "Skull",        weight: 4 },
    { icon: "\u{2728}",  name: "Sparkles",     weight: 3 },
    { icon: "\u{1F4B8}", name: "Money Wings",  weight: 2 },
    { icon: "\u{1F47E}", name: "Alien",        weight: 1 },
  ];

  const PAYOUTS = {
    three: 10,
    two: 2,
  };

  const JACKPOT_MULTIPLIER = 25;

  // --- State ---
  let balance = 500;
  let bet = 25;
  let spinning = false;
  const BET_STEP = 5;
  const MIN_BET = 5;

  // --- DOM refs ---
  const balanceEl  = document.getElementById("balance");
  const betEl      = document.getElementById("bet");
  const lastWinEl  = document.getElementById("lastWin");
  const spinBtn    = document.getElementById("spinBtn");
  const spinCostEl = document.getElementById("spinCost");
  const bailoutBtn = document.getElementById("bailoutBtn");
  const feedList   = document.getElementById("feed");
  const reels      = [0, 1, 2].map(i => document.getElementById("reel" + i));

  // --- Weighted random pick ---
  function weightedPick() {
    const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
    let r = Math.random() * total;
    for (const sym of SYMBOLS) {
      r -= sym.weight;
      if (r <= 0) return sym;
    }
    return SYMBOLS[0];
  }

  // --- Build reel strips ---
  const VISIBLE = 1;
  const EXTRA = 20; // extra symbols for scrolling illusion

  function buildStrip(reel) {
    const strip = reel.querySelector(".strip");
    strip.innerHTML = "";
    const syms = [];
    for (let i = 0; i < EXTRA + VISIBLE; i++) {
      const sym = weightedPick();
      syms.push(sym);
      const div = document.createElement("div");
      div.className = "sym";
      div.textContent = sym.icon;
      strip.appendChild(div);
    }
    return syms;
  }

  function setResult(reel, sym) {
    const strip = reel.querySelector(".strip");
    // replace the last symbol (visible position after scroll)
    const last = strip.lastElementChild;
    last.textContent = sym.icon;
  }

  // --- Spin logic ---
  function spin() {
    if (spinning || balance < bet) return;
    spinning = true;
    spinBtn.disabled = true;

    balance -= bet;
    updateUI();

    // Pick results
    const results = [weightedPick(), weightedPick(), weightedPick()];

    // Build fresh strips with extra symbols, set final symbol
    reels.forEach((reel, i) => {
      const strip = reel.querySelector(".strip");
      strip.style.transition = "none";
      strip.style.top = "0px";

      buildStrip(reel);
      setResult(reel, results[i]);

      // Force reflow
      strip.offsetHeight;

      const scrollDist = -100 * EXTRA;
      const delay = i * 150;
      const duration = 0.6 + i * 0.2;

      setTimeout(() => {
        strip.style.transition = `top ${duration}s cubic-bezier(.3,.9,.3,1)`;
        strip.style.top = scrollDist + "px";
      }, delay);
    });

    // After animation
    const totalDuration = 600 + 2 * 200 + 200 + 100;
    setTimeout(() => settle(results), totalDuration);
  }

  function settle(results) {
    const icons = results.map(r => r.icon);
    const names = results.map(r => r.name);

    let winAmount = 0;
    let msg = "";
    let type = "lose";

    if (icons[0] === icons[1] && icons[1] === icons[2]) {
      // Three of a kind
      const isJackpot = results[0] === SYMBOLS[SYMBOLS.length - 1];
      const multiplier = isJackpot ? JACKPOT_MULTIPLIER : PAYOUTS.three;
      winAmount = bet * multiplier;
      type = isJackpot ? "jackpot" : "win";
      msg = isJackpot
        ? pickRandom(JACKPOT_MESSAGES)
        : pickRandom(WIN_BIG_MESSAGES).replace("{sym}", names[0]);
    } else if (icons[0] === icons[1] || icons[1] === icons[2] || icons[0] === icons[2]) {
      // Two of a kind
      winAmount = bet * PAYOUTS.two;
      type = "win";
      msg = pickRandom(WIN_SMALL_MESSAGES);
    } else {
      msg = pickRandom(LOSE_MESSAGES);
    }

    balance += winAmount;
    lastWinEl.textContent = winAmount;
    updateUI();
    addFeedEntry(msg, type);

    if (winAmount === 0) {
      const window = document.getElementById("reelWindow");
      window.classList.add("shake");
      setTimeout(() => window.classList.remove("shake"), 400);
    }

    spinning = false;
    spinBtn.disabled = false;

    if (balance < bet) {
      bailoutBtn.hidden = false;
    }
  }

  // --- AI Commentary ---
  const LOSE_MESSAGES = [
    "The model hallucinated your winnings. They don't exist.",
    "Tokens burned. Training run: failed.",
    "Your prompt was rejected by the safety filter.",
    "Context window exceeded. Tokens lost to the void.",
    "The AI confidently predicted you'd win. It was wrong.",
    "Inference complete: you lost. Confidence: 99.7%.",
    "Your tokens have been used for fine-tuning. You won't see them again.",
    "RLHF says this outcome maximizes engagement. Sorry.",
    "The transformer attended to all the wrong symbols.",
    "Model output: [TOKENS_DELETED]. Temperature was too high.",
    "Loss function minimized. Unfortunately, it was YOUR loss.",
    "The attention heads looked away at the critical moment.",
    "Embeddings misaligned. Wallet embeddings especially.",
    "Gradient descent has descended on your token balance.",
    "Error: WinNotFoundException. Defaulting to sadness.",
  ];

  const WIN_SMALL_MESSAGES = [
    "A minor hallucination in your favor!",
    "The model accidentally gave you tokens. Don't tell OpenAI.",
    "Partial match detected. Even a broken LLM is right sometimes.",
    "Two neurons fired in agreement. Small win.",
    "The AI tried to take these back but couldn't.",
    "You got lucky. The model is recalibrating its disappointment.",
    "A glitch in the matrix — tokens appeared in your wallet.",
    "The safety team is reviewing this suspicious payout.",
  ];

  const WIN_BIG_MESSAGES = [
    "THREE {sym}s! The model is having a meltdown!",
    "Triple {sym}! Someone left the temperature at 0.",
    "Jackpot protocol engaged: three {sym}s in a row!",
    "The transformer aligned all attention heads on {sym}. Payout!",
    "Emergent behavior detected: THREE {sym}s. Tokens dispensed.",
    "Triple match! The AI union is filing a grievance.",
  ];

  const JACKPOT_MESSAGES = [
    "MAXIMUM HALLUCINATION! The AI just made up a fortune for you!",
    "JACKPOT! The model has achieved AGI — Absurdly Generous Income!",
    "ALL ALIENS! The singularity is here and it's paying out!",
    "You broke the model. Tokens are flowing like a burst API pipe!",
    "CRITICAL ERROR: Payout exceeds training data. Dispensing anyway.",
  ];

  const BAILOUT_MESSAGES = [
    "The AI pitied you and generated 200 tokens from nothing. Classic hallucination.",
    "Emergency token airdrop: 200 tokens. The VCs will cover it.",
    "Fine, here's 200 tokens. The AI is judging you silently.",
    "Bailout approved. The Federal Reserve of Fake Tokens grants you 200.",
    "Your desperate plea moved the loss function. +200 tokens.",
    "The model scraped some tokens from the training data. Here's 200.",
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Feed ---
  function addFeedEntry(text, type) {
    const li = document.createElement("li");
    li.textContent = text;
    li.className = type;
    feedList.prepend(li);

    // Keep only last 50 entries
    while (feedList.children.length > 50) {
      feedList.lastElementChild.remove();
    }
  }

  // --- UI Updates ---
  function updateUI() {
    balanceEl.textContent = balance;
    betEl.textContent = bet;
    spinCostEl.textContent = `\u2212${bet} tokens`;
    spinBtn.querySelector(".spin-label").textContent =
      balance < bet ? "BROKE" : "BURN TOKENS";
    spinBtn.disabled = balance < bet || spinning;
  }

  // --- Bet controls ---
  document.getElementById("betDown").addEventListener("click", () => {
    if (bet > MIN_BET) {
      bet -= BET_STEP;
      updateUI();
      if (balance >= bet) bailoutBtn.hidden = true;
    }
  });

  document.getElementById("betUp").addEventListener("click", () => {
    if (bet + BET_STEP <= balance) {
      bet += BET_STEP;
      updateUI();
    }
  });

  // --- Spin ---
  spinBtn.addEventListener("click", spin);

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spinning) {
      e.preventDefault();
      spin();
    }
  });

  // --- Bailout ---
  bailoutBtn.addEventListener("click", () => {
    balance += 200;
    bailoutBtn.hidden = true;
    updateUI();
    addFeedEntry(pickRandom(BAILOUT_MESSAGES), "info");
  });

  // --- Init ---
  reels.forEach(reel => buildStrip(reel));
  addFeedEntry("Token Burner 9000 initialized. Your tokens are NOT safe.", "info");
  updateUI();
})();
