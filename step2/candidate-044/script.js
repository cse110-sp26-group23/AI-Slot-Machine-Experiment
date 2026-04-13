(() => {
  "use strict";

  const SYMBOLS = [
    { emoji: "\u{1F916}", name: "robot", multiplier: 50 },
    { emoji: "\u{1F4B8}", name: "money", multiplier: 25 },
    { emoji: "\u{1F525}", name: "fire",  multiplier: 15 },
    { emoji: "\u{1F4A1}", name: "bulb",  multiplier: 10 },
    { emoji: "\u{1F9E0}", name: "brain", multiplier: 8  },
    { emoji: "\u26A0\uFE0F", name: "warn", multiplier: 5 },
  ];

  const WIN_MESSAGES = {
    robot: "JACKPOT — AGI achieved",
    money: "Big win — VC funded",
    fire:  "Big win — GPU meltdown",
    bulb:  "Nice — hallucination jackpot",
    brain: "Nice — neural overload",
    warn:  "Win — safety bypassed",
  };

  const LOSE_MESSAGES = [
    "No win. Try again.",
    "So close.",
    "Better luck next spin.",
    "The model says no.",
  ];

  const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500];
  let tokens = 1000;
  let betIndex = 2;
  let spinning = false;

  const $ = id => document.getElementById(id);
  const tokenCountEl = $("token-count");
  const betAmountEl = $("bet-amount");
  const spinBtn = $("spin-btn");
  const betUpBtn = $("bet-up");
  const betDownBtn = $("bet-down");
  const messageEl = $("message");
  const infoBtn = $("info-btn");
  const infoClose = $("info-close");
  const paytableEl = $("paytable");
  const reelEls = [$("reel-0"), $("reel-1"), $("reel-2")];
  const confettiCanvas = $("confetti");
  const cctx = confettiCanvas.getContext("2d");

  // --- Audio ---
  let audioCtx = null;
  function ac() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone({ freq = 440, dur = 0.1, type = "sine", gain = 0.08, attack = 0.005, freqEnd }) {
    try {
      const ctx = ac();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (_) {}
  }

  const playTick = () => tone({ freq: 900 + Math.random() * 300, dur: 0.03, type: "square", gain: 0.025 });
  const playReelStop = () => {
    tone({ freq: 180, dur: 0.18, type: "sine", gain: 0.12 });
    tone({ freq: 90, dur: 0.2, type: "triangle", gain: 0.08 });
  };
  const playSpinStart = () => tone({ freq: 200, freqEnd: 600, dur: 0.25, type: "sawtooth", gain: 0.06 });
  const playLose = () => tone({ freq: 260, freqEnd: 120, dur: 0.4, type: "triangle", gain: 0.08 });
  function playWin(big = false) {
    const scale = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    scale.forEach((f, i) => {
      setTimeout(() => {
        tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.1 });
        tone({ freq: f * 2, dur: 0.22, type: "sine", gain: 0.05 });
      }, i * 90);
    });
  }

  // --- Reel ---
  const SYMBOL_H_PX = 160;

  function buildReelStrip(reel, finalSymbol) {
    reel.innerHTML = "";
    const strip = document.createElement("div");
    strip.className = "reel-strip";
    const count = 40;
    for (let i = 0; i < count; i++) {
      const sym = (i === count - 5) ? finalSymbol : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const div = document.createElement("div");
      div.className = "reel-symbol";
      div.style.setProperty("--symbol-h", SYMBOL_H_PX + "px");
      div.textContent = sym.emoji;
      strip.appendChild(div);
    }
    reel.appendChild(strip);
    return strip;
  }

  function getSymbolHeight() {
    const reel = reelEls[0];
    return reel.clientHeight;
  }

  // --- Display ---
  const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function updateDisplay() {
    tokenCountEl.textContent = fmt(tokens);
    while (BET_STEPS[betIndex] > tokens && betIndex > 0) betIndex--;
    betAmountEl.textContent = BET_STEPS[betIndex];
    spinBtn.disabled = spinning || tokens < BET_STEPS[betIndex];
    betUpBtn.disabled = spinning || betIndex >= BET_STEPS.length - 1 || BET_STEPS[betIndex + 1] > tokens;
    betDownBtn.disabled = spinning || betIndex <= 0;
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "message show " + type;
  }
  function clearMessage() { messageEl.className = "message"; }

  function pickSymbol() {
    const weights = SYMBOLS.map(s => 100 / s.multiplier);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= weights[i];
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  // --- Spin ---
  async function spin() {
    if (spinning || tokens < BET_STEPS[betIndex]) return;
    const bet = BET_STEPS[betIndex];
    spinning = true;
    clearMessage();
    reelEls.forEach(r => r.classList.remove("win-flash"));
    spinBtn.classList.add("spinning");
    updateDisplay();

    tokens -= bet;
    tokenCountEl.textContent = fmt(tokens);
    playSpinStart();

    const results = [pickSymbol(), pickSymbol(), pickSymbol()];

    await Promise.all(reelEls.map((r, i) => animateReel(r, results[i], i)));

    evaluate(results, bet);
    spinning = false;
    spinBtn.classList.remove("spinning");
    updateDisplay();
  }

  function animateReel(reelEl, finalSymbol, index) {
    return new Promise(resolve => {
      const strip = buildReelStrip(reelEl, finalSymbol);
      const symH = getSymbolHeight();
      // scale symbol heights to match container
      [...strip.children].forEach(c => c.style.setProperty("--symbol-h", symH + "px"));

      const finalPos = 35;
      const totalDistance = finalPos * symH - symH / 2 - reelEl.clientHeight / 2 + symH;
      // center the final symbol on the payline
      const centerOffset = finalPos * symH - (reelEl.clientHeight / 2) + (symH / 2);
      const duration = 1200 + index * 450;
      const start = performance.now();
      let lastTick = 0;

      function frame(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const pos = eased * centerOffset;
        strip.style.transform = `translateY(${-pos}px)`;

        if (progress < 0.9) {
          const tickInterval = 40 + progress * 180;
          if (now - lastTick > tickInterval) { playTick(); lastTick = now; }
        }

        if (progress < 1) requestAnimationFrame(frame);
        else {
          strip.style.transform = `translateY(${-centerOffset}px)`;
          playReelStop();
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function flashTokenCount() {
    tokenCountEl.classList.remove("flash");
    void tokenCountEl.offsetWidth;
    tokenCountEl.classList.add("flash");
  }

  function evaluate(results, bet) {
    const names = results.map(r => r.name);

    if (names[0] === names[1] && names[1] === names[2]) {
      const sym = results[0];
      const winnings = bet * sym.multiplier;
      tokens += winnings;
      showMessage(`${WIN_MESSAGES[sym.name]} · +${winnings}`, "win");
      playWin(sym.multiplier >= 15);
      reelEls.forEach(r => r.classList.add("win-flash"));
      launchConfetti(sym.multiplier >= 15 ? 180 : 90);
      flashTokenCount();
      return;
    }

    if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
      const winnings = bet * 2;
      tokens += winnings;
      showMessage(`Pair · +${winnings}`, "win");
      playWin(false);
      flashTokenCount();
      return;
    }

    if (tokens <= 0) {
      showMessage("Out of tokens — refresh to reset.", "broke");
      playLose();
    } else {
      showMessage(LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)], "lose");
      playLose();
    }
  }

  // --- Confetti ---
  let confettiParticles = [];
  let confettiRAF = null;

  function resizeConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeConfetti);
  resizeConfetti();

  function launchConfetti(count) {
    const colors = ["#00e701", "#ffd700", "#ff8c00", "#00c4ff", "#ff4d8c"];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: cx + (Math.random() - 0.5) * 200,
        y: cy,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        g: 0.35,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 120 + Math.random() * 60,
      });
    }
    if (!confettiRAF) tickConfetti();
  }

  function tickConfetti() {
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles = confettiParticles.filter(p => p.life < p.maxLife);
    confettiParticles.forEach(p => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      const alpha = 1 - p.life / p.maxLife;
      cctx.save();
      cctx.globalAlpha = alpha;
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      cctx.restore();
    });
    if (confettiParticles.length) confettiRAF = requestAnimationFrame(tickConfetti);
    else { confettiRAF = null; cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); }
  }

  // --- Events ---
  spinBtn.addEventListener("click", spin);
  betUpBtn.addEventListener("click", () => {
    if (betIndex < BET_STEPS.length - 1 && BET_STEPS[betIndex + 1] <= tokens) {
      betIndex++; updateDisplay();
      tone({ freq: 600, dur: 0.05, type: "square", gain: 0.04 });
    }
  });
  betDownBtn.addEventListener("click", () => {
    if (betIndex > 0) {
      betIndex--; updateDisplay();
      tone({ freq: 400, dur: 0.05, type: "square", gain: 0.04 });
    }
  });

  infoBtn.addEventListener("click", () => paytableEl.hidden = false);
  infoClose.addEventListener("click", () => paytableEl.hidden = true);
  paytableEl.addEventListener("click", e => { if (e.target === paytableEl) paytableEl.hidden = true; });

  document.addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); spin(); }
    else if (e.key === "ArrowUp") betUpBtn.click();
    else if (e.key === "ArrowDown") betDownBtn.click();
    else if (e.key === "Escape") paytableEl.hidden = true;
  });

  // --- Init ---
  function initReels() {
    reelEls.forEach(reel => {
      const strip = buildReelStrip(reel, SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      const symH = reel.clientHeight;
      [...strip.children].forEach(c => c.style.setProperty("--symbol-h", symH + "px"));
      const centerOffset = 35 * symH - (reel.clientHeight / 2) + (symH / 2);
      strip.style.transform = `translateY(${-centerOffset}px)`;
    });
  }
  window.addEventListener("resize", () => { if (!spinning) initReels(); });
  requestAnimationFrame(initReels);
  updateDisplay();
})();
