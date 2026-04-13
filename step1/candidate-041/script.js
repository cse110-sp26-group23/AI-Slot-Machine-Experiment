(() => {
  "use strict";

  const SYMBOLS = [
    { emoji: "\u{1F916}", name: "Sentient AI", multiplier: 10 },
    { emoji: "\u{1F9E0}", name: "Neural Net", multiplier: 8 },
    { emoji: "\u{1F4A1}", name: "Bright Idea", multiplier: 6 },
    { emoji: "\u{1F4BB}", name: "Code Monkey", multiplier: 5 },
    { emoji: "\u26A0\uFE0F", name: "Hallucination", multiplier: 4 },
    { emoji: "\u{1F525}", name: "GPU Fire", multiplier: 3 },
  ];

  const PAIR_MULTIPLIER = 1.5;
  const SPIN_DURATION_MS = 1800;
  const REEL_STAGGER_MS = 300;
  const SYMBOL_SWAP_MS = 80;
  const BET_STEP = 5;
  const MIN_BET = 5;

  const SNARK = {
    win: [
      "The AI overlords smile upon you.",
      "Tokens generated. No GPUs were harmed... probably.",
      "You just out-predicted a language model. Barely.",
      "Prompt accepted. Tokens dispensed.",
      "The model hallucinated in your favour!",
    ],
    lose: [
      "Your tokens have been used for training data.",
      "Error 402: Insufficient luck.",
      "The AI decided you don't deserve tokens today.",
      "Tokens lost in the latent space.",
      "Model confidence: 99%. Actual result: nope.",
      "Your request has been rate-limited by fate.",
    ],
    jackpot: [
      "JACKPOT! The singularity is here and it's paying out!",
      "AGI ACHIEVED... in slot machine form!",
      "You broke the model. Congratulations!",
    ],
    broke: [
      "Out of tokens. Just like a free-tier API key.",
      "Budget exhausted. Time to beg for more credits.",
      "0 tokens remaining. The AI laughs in binary.",
    ],
  };

  let tokens = 100;
  let bet = 10;
  let spinning = false;

  const $tokens = document.getElementById("tokens");
  const $bet = document.getElementById("bet-amount");
  const $spinBtn = document.getElementById("spin-btn");
  const $message = document.getElementById("message");
  const $machine = document.querySelector(".machine");
  const reels = [
    document.getElementById("reel0"),
    document.getElementById("reel1"),
    document.getElementById("reel2"),
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function updateUI() {
    $tokens.textContent = tokens;
    $bet.textContent = bet;
    $spinBtn.disabled = spinning || tokens <= 0;
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = "message " + (type || "");
  }

  function animateReel(reel, finalSymbol, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        reel.classList.add("spinning");
        const symbolEl = reel.querySelector(".symbol");
        const swapInterval = setInterval(() => {
          symbolEl.textContent = pick(SYMBOLS).emoji;
        }, SYMBOL_SWAP_MS);

        setTimeout(() => {
          clearInterval(swapInterval);
          reel.classList.remove("spinning");
          symbolEl.textContent = finalSymbol.emoji;
          resolve();
        }, SPIN_DURATION_MS);
      }, delay);
    });
  }

  function evaluateSpin(results) {
    const [a, b, c] = results;

    if (a === b && b === c) {
      return { type: "jackpot", multiplier: a.multiplier };
    }
    if (a === b || b === c || a === c) {
      return { type: "pair", multiplier: PAIR_MULTIPLIER };
    }
    return { type: "loss", multiplier: 0 };
  }

  async function spin() {
    if (spinning || tokens <= 0) return;
    if (bet > tokens) {
      bet = Math.max(MIN_BET, Math.floor(tokens / BET_STEP) * BET_STEP);
      if (bet > tokens) bet = tokens;
      updateUI();
    }

    spinning = true;
    tokens -= bet;
    updateUI();
    showMessage("Generating response...", "");

    const results = [pick(SYMBOLS), pick(SYMBOLS), pick(SYMBOLS)];

    await Promise.all(
      reels.map((reel, i) => animateReel(reel, results[i], i * REEL_STAGGER_MS))
    );

    const outcome = evaluateSpin(results);

    if (outcome.multiplier > 0) {
      const winnings = Math.round(bet * outcome.multiplier);
      tokens += winnings;

      if (outcome.type === "jackpot") {
        $machine.classList.add("shake");
        setTimeout(() => $machine.classList.remove("shake"), 600);
        showMessage(
          pick(SNARK.jackpot) + ` (+${winnings} tokens)`,
          "jackpot"
        );
      } else {
        showMessage(
          pick(SNARK.win) + ` (+${winnings} tokens)`,
          "win"
        );
      }
    } else {
      showMessage(pick(SNARK.lose), "lose");
    }

    if (tokens <= 0) {
      tokens = 0;
      showMessage(pick(SNARK.broke), "lose");
    }

    spinning = false;
    updateUI();
  }

  document.getElementById("bet-up").addEventListener("click", () => {
    if (!spinning && bet + BET_STEP <= tokens) {
      bet += BET_STEP;
      updateUI();
    }
  });

  document.getElementById("bet-down").addEventListener("click", () => {
    if (!spinning && bet - BET_STEP >= MIN_BET) {
      bet -= BET_STEP;
      updateUI();
    }
  });

  $spinBtn.addEventListener("click", spin);

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      spin();
    }
  });

  updateUI();
})();
