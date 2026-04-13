(() => {
  "use strict";

  // --- Symbol definitions ---
  const SYMBOLS = [
    { emoji: "\u{1F916}", name: "robot",   multiplier: 50 },  // Robot - AGI
    { emoji: "\u{1F4B8}", name: "money",   multiplier: 25 },  // Money wings - VC
    { emoji: "\u{1F525}", name: "fire",    multiplier: 15 },  // Fire - GPU meltdown
    { emoji: "\u{1F4A1}", name: "bulb",    multiplier: 10 },  // Lightbulb - hallucination
    { emoji: "\u{1F9E0}", name: "brain",   multiplier: 8  },  // Brain - neural overload
    { emoji: "\u26A0\uFE0F", name: "warn", multiplier: 5  },  // Warning - safety bypass
  ];

  const WIN_MESSAGES = {
    robot: "AGI ACHIEVED! The machines are pleased.",
    money: "VC FUNDED! $50B valuation, no revenue!",
    fire:  "GPU MELTDOWN! Your H100s are toast!",
    bulb:  "HALLUCINATION JACKPOT! It's confidently wrong!",
    brain: "NEURAL OVERLOAD! Too many parameters!",
    warn:  "SAFETY BYPASSED! The guardrails are off!",
  };

  const LOSE_MESSAGES = [
    "Your tokens vanished into the latent space...",
    "Model confidently predicts: you lost.",
    "Training complete. Loss: all your tokens.",
    "Attention mechanism focused on your wallet.",
    "Tokens successfully tokenized into nothing.",
    "The AI thanks you for the compute.",
    "Error 402: Payment required. Oh wait, you paid.",
    "Gradient descent... into poverty.",
    "Your tokens have been fine-tuned away.",
    "Context window closed on your fingers.",
    "Prompt: give me tokens. Response: no.",
    "The transformer transformed your tokens into air.",
  ];

  const PAIR_MESSAGES = [
    "Two outta three! The AI is being generous... for now.",
    "A pair! The model hallucinated half a win.",
    "Almost! Like AI-generated hands, close but off.",
  ];

  // --- State ---
  const BET_STEPS = [5, 10, 25, 50, 100, 250];
  let tokens = 1000;
  let betIndex = 1; // starts at 10
  let spinning = false;

  // --- DOM refs ---
  const tokenCountEl = document.getElementById("token-count");
  const betAmountEl = document.getElementById("bet-amount");
  const spinBtn = document.getElementById("spin-btn");
  const betUpBtn = document.getElementById("bet-up");
  const betDownBtn = document.getElementById("bet-down");
  const messageEl = document.getElementById("message");
  const machineEl = document.querySelector(".machine");
  const reelEls = [
    document.getElementById("reel-0"),
    document.getElementById("reel-1"),
    document.getElementById("reel-2"),
  ];

  // --- Audio via Web Audio API ---
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = "square", gain = 0.08) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {
      // Audio not supported—silent fallback
    }
  }

  function playSpinTick() {
    playTone(800 + Math.random() * 400, 0.05, "square", 0.04);
  }

  function playReelStop() {
    playTone(300, 0.15, "triangle", 0.1);
  }

  function playWin() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, "square", 0.07), i * 120);
    });
  }

  function playLose() {
    playTone(200, 0.4, "sawtooth", 0.05);
  }

  // --- Reel setup ---
  function buildReelStrip(reel) {
    reel.innerHTML = "";
    const strip = document.createElement("div");
    strip.className = "reel-strip";
    // Create enough symbols for smooth animation (40 items)
    for (let i = 0; i < 40; i++) {
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const div = document.createElement("div");
      div.className = "reel-symbol";
      div.textContent = sym.emoji;
      div.dataset.name = sym.name;
      strip.appendChild(div);
    }
    reel.appendChild(strip);
    return strip;
  }

  // --- Display update ---
  function updateDisplay() {
    tokenCountEl.textContent = tokens;
    betAmountEl.textContent = BET_STEPS[betIndex];
    // Clamp bet if tokens too low
    while (BET_STEPS[betIndex] > tokens && betIndex > 0) {
      betIndex--;
    }
    betAmountEl.textContent = BET_STEPS[betIndex];
    spinBtn.disabled = spinning || tokens <= 0;
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "message show " + type;
  }

  function clearMessage() {
    messageEl.className = "message";
  }

  // --- Pick random symbol (weighted: lower-value symbols more common) ---
  function pickSymbol() {
    // Weights inversely proportional to multiplier
    const weights = SYMBOLS.map(s => 100 / s.multiplier);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= weights[i];
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  // --- Spin logic ---
  async function spin() {
    if (spinning || tokens <= 0) return;

    const bet = BET_STEPS[betIndex];
    if (bet > tokens) return;

    spinning = true;
    clearMessage();
    updateDisplay();

    tokens -= bet;
    tokenCountEl.textContent = tokens;

    // Pick final results
    const results = [pickSymbol(), pickSymbol(), pickSymbol()];

    // Animate each reel
    const reelPromises = reelEls.map((reel, i) => {
      return animateReel(reel, results[i], i);
    });

    await Promise.all(reelPromises);

    // Evaluate
    evaluate(results, bet);

    spinning = false;
    updateDisplay();
  }

  function animateReel(reelEl, finalSymbol, index) {
    return new Promise((resolve) => {
      const strip = buildReelStrip(reelEl);
      // Place final symbol at a known position
      const finalPos = 35;
      const finalDiv = strip.children[finalPos];
      finalDiv.textContent = finalSymbol.emoji;
      finalDiv.dataset.name = finalSymbol.name;

      const symbolHeight = 120;
      let currentPos = 0;
      const totalDistance = finalPos * symbolHeight;
      const duration = 1200 + index * 400; // staggered stops
      const startTime = performance.now();

      // Tick sound interval
      let lastTick = 0;

      function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        currentPos = eased * totalDistance;
        strip.style.transform = `translateY(${-currentPos}px)`;

        // Tick sounds during spin
        if (progress < 0.85) {
          const tickInterval = 60 + progress * 200;
          if (now - lastTick > tickInterval) {
            playSpinTick();
            lastTick = now;
          }
        }

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          strip.style.transform = `translateY(${-totalDistance}px)`;
          playReelStop();
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function evaluate(results, bet) {
    const names = results.map(r => r.name);

    // Check triple
    if (names[0] === names[1] && names[1] === names[2]) {
      const sym = results[0];
      const winnings = bet * sym.multiplier;
      tokens += winnings;
      showMessage(
        `${WIN_MESSAGES[sym.name]} +${winnings} tokens!`,
        "win"
      );
      playWin();
      machineEl.classList.add("shake");
      tokenCountEl.classList.add("token-pop");
      setTimeout(() => {
        machineEl.classList.remove("shake");
        tokenCountEl.classList.remove("token-pop");
      }, 500);
      return;
    }

    // Check pair
    if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
      const winnings = bet * 2;
      tokens += winnings;
      const msg = PAIR_MESSAGES[Math.floor(Math.random() * PAIR_MESSAGES.length)];
      showMessage(`${msg} +${winnings} tokens!`, "win");
      playWin();
      tokenCountEl.classList.add("token-pop");
      setTimeout(() => tokenCountEl.classList.remove("token-pop"), 500);
      return;
    }

    // Lose
    if (tokens <= 0) {
      showMessage(
        "BANKRUPT! The AI has consumed all your tokens. Refresh to beg for more.",
        "broke"
      );
      playLose();
      machineEl.classList.add("shake");
      setTimeout(() => machineEl.classList.remove("shake"), 500);
    } else {
      const msg = LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)];
      showMessage(msg, "lose");
      playLose();
    }
  }

  // --- Event listeners ---
  spinBtn.addEventListener("click", spin);

  betUpBtn.addEventListener("click", () => {
    if (betIndex < BET_STEPS.length - 1 && BET_STEPS[betIndex + 1] <= tokens) {
      betIndex++;
      updateDisplay();
    }
  });

  betDownBtn.addEventListener("click", () => {
    if (betIndex > 0) {
      betIndex--;
      updateDisplay();
    }
  });

  // Keyboard: space to spin
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !spinning) {
      e.preventDefault();
      spin();
    }
  });

  // --- Init ---
  // Set initial reel display
  reelEls.forEach((reel) => {
    const strip = buildReelStrip(reel);
    strip.style.transform = `translateY(${-35 * 120}px)`;
  });

  updateDisplay();
})();
