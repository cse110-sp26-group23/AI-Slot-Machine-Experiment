(() => {
  "use strict";

  // Symbols with AI-themed humor
  const SYMBOLS = [
    { emoji: "\u{1F916}", name: "Robot" },       // Robot face
    { emoji: "\u{1F4B0}", name: "Money" },        // Money bag (VC funding)
    { emoji: "\u{1F525}", name: "Fire" },          // GPU meltdown
    { emoji: "\u{1F9E0}", name: "Brain" },         // Big brain
    { emoji: "\u{1F4A9}", name: "Hallucination" }, // AI hallucination
    { emoji: "\u{26A0}\uFE0F", name: "Warning" },  // Safety filter
    { emoji: "\u{1F4C9}", name: "Stonks" },        // Falling chart
  ];

  const SPIN_DURATION = 2000;      // ms total spin time
  const REEL_STAGGER = 300;        // ms delay between each reel stopping
  const ITEMS_PER_REEL = 40;       // symbols generated per spin

  // AI-themed flavor text
  const WIN_MESSAGES = [
    "The model hallucinated in your favor!",
    "Somehow the loss function minimized YOUR losses!",
    "Training complete. Result: profit.",
    "The neural net says you're a winner. (p=0.51)",
    "Emergent behavior detected: winning.",
    "You've been upsampled!",
    "RLHF optimized for YOUR reward.",
    "The attention mechanism focused on your wallet!",
  ];

  const LOSE_MESSAGES = [
    "Tokens burned. Latency: infinite. Output: nothing.",
    "Your prompt was mid. No completions found.",
    "The model confidently lost your money.",
    "Training data corrupted. Funds not found.",
    "Context window exceeded. Tokens gone.",
    "Rate limited by reality.",
    "That request cost $0.47 and returned sadness.",
    "Safety filter blocked your winnings.",
    "Catastrophic forgetting... of your balance.",
    "The AI decided this was an unsafe output (your money).",
  ];

  const JACKPOT_MESSAGES = [
    "AGI ACHIEVED! (At losing your money slower.)",
    "You just fine-tuned the JACKPOT!",
    "OpenAI wants to acquire your spin history.",
    "GPU cluster allocated just for your winnings!",
  ];

  const BROKE_MESSAGES = [
    "Token limit reached. Please upgrade your plan.",
    "Error 402: Payment Required. No tokens remaining.",
    "The AI ate all your tokens. Classic.",
    "Model collapsed. Zero tokens in the embedding.",
  ];

  // State
  let tokens = 100;
  let bet = 10;
  let spinning = false;

  // DOM refs
  const reelEls = [0, 1, 2].map((i) => document.getElementById(`reel-${i}`));
  const tokenCountEl = document.getElementById("token-count");
  const betDisplayEl = document.getElementById("bet-display");
  const spinBtn = document.getElementById("spin-btn");
  const messageEl = document.getElementById("message");
  const machineEl = document.querySelector(".machine");

  // Bet controls
  document.getElementById("bet-down").addEventListener("click", () => {
    if (spinning) return;
    bet = Math.max(5, bet - 5);
    betDisplayEl.textContent = bet;
  });

  document.getElementById("bet-up").addEventListener("click", () => {
    if (spinning) return;
    bet = Math.min(tokens, Math.min(50, bet + 5));
    betDisplayEl.textContent = bet;
  });

  // Build a reel strip of random symbols
  function buildStrip(count, finalSymbol) {
    const strip = [];
    for (let i = 0; i < count - 1; i++) {
      strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    strip.push(finalSymbol);
    return strip;
  }

  // Render reel HTML
  function renderReel(el, strip) {
    el.innerHTML = strip.map((s) => `<span>${s.emoji}</span>`).join("");
  }

  // Animate a single reel
  function animateReel(el, strip, duration) {
    return new Promise((resolve) => {
      const itemHeight = 100;
      const totalHeight = strip.length * itemHeight;
      const finalOffset = -(totalHeight - itemHeight);

      renderReel(el, strip);
      el.style.transition = "none";
      el.style.transform = "translateY(0)";

      // Force reflow
      el.offsetHeight;

      el.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.8, 0.3, 1)`;
      el.style.transform = `translateY(${finalOffset}px)`;

      setTimeout(resolve, duration);
    });
  }

  // Pick final symbols (weighted randomness)
  function pickResults() {
    return [0, 1, 2].map(() => {
      const roll = Math.random();
      // Weight toward less valuable symbols
      if (roll < 0.05) return SYMBOLS[0]; // Robot (jackpot symbol) - rare
      if (roll < 0.12) return SYMBOLS[1]; // Money
      if (roll < 0.22) return SYMBOLS[2]; // Fire
      if (roll < 0.35) return SYMBOLS[3]; // Brain
      // Junk symbols more common
      return SYMBOLS[4 + Math.floor(Math.random() * 3)];
    });
  }

  // Calculate winnings
  function calcWin(results, currentBet) {
    const names = results.map((r) => r.name);

    // Three of a kind
    if (names[0] === names[1] && names[1] === names[2]) {
      switch (names[0]) {
        case "Robot":
          return { multiplier: 50, label: "JACKPOT" };
        case "Money":
          return { multiplier: 20, label: "VC FUNDING SECURED" };
        case "Fire":
          return { multiplier: 10, label: "GPU MELTDOWN" };
        case "Brain":
          return { multiplier: 5, label: "BIG BRAIN ENERGY" };
        default:
          return { multiplier: 3, label: "THREE OF A KIND" };
      }
    }

    // Two of a kind
    if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
      return { multiplier: 2, label: "PAIR MATCH" };
    }

    return { multiplier: 0, label: null };
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function updateUI() {
    tokenCountEl.textContent = tokens;
    if (bet > tokens) {
      bet = Math.max(5, Math.floor(tokens / 5) * 5);
      betDisplayEl.textContent = bet;
    }
    machineEl.classList.toggle("broke", tokens <= 0);
  }

  // Play sound using Web Audio API
  function playTone(freq, duration, type = "square") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {
      // Audio not available
    }
  }

  function playSpinSound() {
    playTone(220, 0.1);
  }

  function playWinSound() {
    [0, 100, 200, 300].forEach((delay, i) => {
      setTimeout(() => playTone(440 + i * 110, 0.2, "sine"), delay);
    });
  }

  function playLoseSound() {
    playTone(150, 0.3, "sawtooth");
  }

  // Main spin
  async function spin() {
    if (spinning || tokens < bet) return;
    spinning = true;
    spinBtn.disabled = true;
    messageEl.textContent = "Inference in progress...";
    messageEl.className = "message";

    // Deduct bet
    tokens -= bet;
    updateUI();

    const results = pickResults();

    playSpinSound();

    // Animate reels with stagger
    const promises = reelEls.map((el, i) => {
      const strip = buildStrip(ITEMS_PER_REEL + i * 5, results[i]);
      const duration = SPIN_DURATION + i * REEL_STAGGER;
      return animateReel(el, strip, duration);
    });

    await Promise.all(promises);

    // Evaluate result
    const { multiplier, label } = calcWin(results, bet);

    if (multiplier > 0) {
      const winnings = bet * multiplier;
      tokens += winnings;
      updateUI();

      if (multiplier >= 50) {
        messageEl.textContent = `${label}!\n+${winnings} tokens\n${pickRandom(JACKPOT_MESSAGES)}`;
      } else {
        messageEl.textContent = `${label}! +${winnings} tokens\n${pickRandom(WIN_MESSAGES)}`;
      }
      messageEl.className = "message win";
      playWinSound();
    } else {
      messageEl.textContent = pickRandom(LOSE_MESSAGES);
      messageEl.className = "message lose";
      playLoseSound();
    }

    if (tokens <= 0) {
      tokens = 0;
      updateUI();
      messageEl.textContent = pickRandom(BROKE_MESSAGES);
      messageEl.className = "message lose";
      spinBtn.textContent = "OUT OF TOKENS";

      // Auto-refill after delay
      setTimeout(() => {
        tokens = 100;
        bet = 10;
        betDisplayEl.textContent = bet;
        updateUI();
        spinBtn.textContent = "SPEND TOKENS";
        messageEl.textContent = "Free tier refilled. You're welcome.";
        messageEl.className = "message";
      }, 3000);
    }

    spinning = false;
    spinBtn.disabled = false;
  }

  spinBtn.addEventListener("click", spin);

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      spin();
    }
  });

  // Initialize reels with random symbols
  reelEls.forEach((el) => {
    const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    renderReel(el, [sym]);
  });

  updateUI();
})();
