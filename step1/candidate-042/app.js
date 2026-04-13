(() => {
  "use strict";

  const SYMBOLS = [
    { emoji: "\u{1F916}", name: "robot" },      // Robot
    { emoji: "\u{1F525}", name: "fire" },        // GPU Fire
    { emoji: "\u{1F4A1}", name: "bulb" },        // Hallucination
    { emoji: "\u{1F4B0}", name: "money" },       // VC Money
    { emoji: "\u{1F92F}", name: "mindblown" },   // Mind Blown
    { emoji: "\u{1F9E0}", name: "brain" },       // Brain
  ];

  // Multipliers for triple matches, keyed by symbol name
  const TRIPLE_PAYOUTS = {
    robot: 20,
    fire: 10,
    bulb: 8,
    money: 6,
    mindblown: 5,
    brain: 4,
  };

  const PAIR_PAYOUT = 2;

  // Funny messages
  const WIN_MESSAGES = {
    robot:    "JACKPOT! AGI achieved!\n(Results may be hallucinated.)",
    fire:     "Your GPU is literally on fire!\nBut hey, tokens!",
    bulb:     "Hallucination trifecta!\nThe AI confidently made this up.",
    money:    "VC funding secured!\nNo product needed!",
    mindblown:"Mind blown, context window lost!\nWait, what were we doing?",
    brain:    "Big brain energy!\nStill cheaper than GPT-5.",
  };

  const PAIR_MESSAGES = [
    "A pair! The AI almost got it right.",
    "Two out of three — close enough for a demo!",
    "Partial match. Like AI-generated code that almost compiles.",
    "The model predicted 2/3 correctly. Ship it!",
  ];

  const LOSE_MESSAGES = [
    "Tokens burned. Just like a training run.",
    "Nothing. Your prompt wasn't good enough.",
    "Loss! Try adding 'please' to your next spin.",
    "The AI says: 'I'm sorry, I can't spin that for you.'",
    "Context window exceeded. Tokens gone.",
    "That spin was AI-generated slop. No payout.",
    "Error 429: Too many spin requests.",
    "Model refused to align your reels.",
    "Your tokens were used for fine-tuning. Gone forever.",
    "Catastrophic forgetting — the machine forgot to pay you.",
  ];

  const BROKE_MESSAGES = [
    "You're out of tokens!\nJust like after a month of API calls.",
    "Bankrupt! Time to write a grant proposal.",
    "Zero tokens. The AI has achieved its true purpose:\ndraining your resources.",
  ];

  // State
  let tokens = 100;
  let bet = 5;
  let spinning = false;

  // DOM
  const tokenCountEl = document.getElementById("token-count");
  const betAmountEl = document.getElementById("bet-amount");
  const spinBtn = document.getElementById("spin-btn");
  const messageEl = document.getElementById("message");
  const reelEls = [
    document.getElementById("reel-0"),
    document.getElementById("reel-1"),
    document.getElementById("reel-2"),
  ];
  const reelWindows = document.querySelectorAll(".reel-window");

  // Helpers
  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function updateDisplay() {
    tokenCountEl.textContent = tokens;
    betAmountEl.textContent = bet;
    spinBtn.disabled = spinning || tokens <= 0;
  }

  function setMessage(text, cls) {
    messageEl.textContent = text;
    messageEl.className = "message" + (cls ? " " + cls : "");
  }

  function clearWinHighlights() {
    reelWindows.forEach((w) => w.classList.remove("winner"));
  }

  // Sound via Web Audio API
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {
      // Audio not supported — no problem
    }
  }

  function playSpinTick() {
    playTone(300 + Math.random() * 200, 0.05, "square");
  }

  function playWinSound() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.15, "sine"), i * 100);
    });
  }

  function playLoseSound() {
    playTone(180, 0.3, "sawtooth");
  }

  // Spin animation
  function animateReel(reelEl, finalSymbol, duration) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const tickInterval = 70; // ms between symbol changes
      let lastTick = 0;

      function frame(now) {
        const elapsed = now - startTime;
        if (elapsed - lastTick > tickInterval) {
          lastTick = elapsed;
          const sym = randomSymbol();
          reelEl.querySelector(".symbol").textContent = sym.emoji;
          playSpinTick();
        }
        if (elapsed < duration) {
          requestAnimationFrame(frame);
        } else {
          reelEl.querySelector(".symbol").textContent = finalSymbol.emoji;
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  // Evaluate result
  function evaluate(results) {
    const names = results.map((r) => r.name);

    // Triple
    if (names[0] === names[1] && names[1] === names[2]) {
      const multiplier = TRIPLE_PAYOUTS[names[0]];
      return {
        multiplier,
        message: WIN_MESSAGES[names[0]],
        type: "win",
      };
    }

    // Pair
    if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
      return {
        multiplier: PAIR_PAYOUT,
        message: pick(PAIR_MESSAGES),
        type: "win",
      };
    }

    // Loss
    return { multiplier: 0, message: pick(LOSE_MESSAGES), type: "lose" };
  }

  // Spin
  async function spin() {
    if (spinning || tokens <= 0) return;
    spinning = true;
    clearWinHighlights();
    setMessage("");
    spinBtn.disabled = true;

    // Deduct bet
    tokens -= bet;
    updateDisplay();

    // Determine outcome
    const results = [randomSymbol(), randomSymbol(), randomSymbol()];

    // Stagger reel animations
    await Promise.all([
      animateReel(reelEls[0], results[0], 600),
      animateReel(reelEls[1], results[1], 900),
      animateReel(reelEls[2], results[2], 1200),
    ]);

    // Evaluate
    const outcome = evaluate(results);

    if (outcome.multiplier > 0) {
      const winnings = bet * outcome.multiplier;
      tokens += winnings;
      playWinSound();
      setMessage(outcome.message + "\n+" + winnings + " tokens!", "win");

      // Highlight reels
      reelWindows.forEach((w) => w.classList.add("winner"));
    } else {
      playLoseSound();
      setMessage(outcome.message, "lose");
    }

    // Check if broke
    if (tokens <= 0) {
      tokens = 0;
      setTimeout(() => {
        setMessage(pick(BROKE_MESSAGES), "broke");
        // Give mercy tokens after a delay
        setTimeout(() => {
          tokens = 25;
          updateDisplay();
          setMessage(
            pick(BROKE_MESSAGES) +
              "\n\n...Fine, here's 25 mercy tokens.\nThe AI feels generous (for now).",
            "broke"
          );
        }, 2000);
      }, 1500);
    }

    spinning = false;
    updateDisplay();
  }

  // Bet controls
  document.getElementById("bet-down").addEventListener("click", () => {
    if (bet > 1) {
      bet -= 1;
      updateDisplay();
    }
  });

  document.getElementById("bet-up").addEventListener("click", () => {
    if (bet < tokens && bet < 50) {
      bet += 1;
      updateDisplay();
    }
  });

  // Spin on button click or spacebar
  spinBtn.addEventListener("click", spin);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spinning) {
      e.preventDefault();
      spin();
    }
  });

  // Init
  updateDisplay();
  setMessage('Press SPIN or hit Space to play!\nEach spin costs tokens. Just like real AI.');
})();
