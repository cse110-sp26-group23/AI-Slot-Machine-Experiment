(() => {
  "use strict";

  const SYMBOLS = [
    { id: "gpu",    glyph: "🔥", name: "H100",            weight: 2,  mult: 50 },
    { id: "brain",  glyph: "🧠", name: "AGI",             weight: 3,  mult: 25 },
    { id: "robot",  glyph: "🤖", name: "Agent",           weight: 6,  mult: 10 },
    { id: "chip",   glyph: "💾", name: "Weights",         weight: 8,  mult: 6  },
    { id: "swirl",  glyph: "🌀", name: "Hallucination",   weight: 10, mult: 3  },
    { id: "parrot", glyph: "🦜", name: "Stochastic Parrot", weight: 12, mult: 2 },
    { id: "trash",  glyph: "🗑️", name: "Training Data",   weight: 14, mult: 1  },
  ];

  const WEIGHTED = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

  const QUIPS = {
    bigwin: [
      "Scaling laws confirmed. The bitter lesson pays.",
      "Emergent capability detected: winning.",
      "Your loss function just dropped. Literally.",
      "Benchmark obliterated. OpenAI is taking notes.",
    ],
    win: [
      "Gradient descended. Wallet ascended.",
      "Reward hacked. Don't tell the safety team.",
      "RLHF approves this outcome.",
      "The model is now 3% more confident in being right.",
    ],
    near: [
      "So close. Like GPT-4 doing arithmetic.",
      "Off by one. The model blames the tokenizer.",
      "Almost aligned. Almost.",
      "Nearly coherent. Ship it anyway.",
    ],
    loss: [
      "Tokens burned. The datacenter hums approvingly.",
      "Compute spent. Insight: zero. Classic.",
      "You just funded someone's PhD.",
      "The model hallucinated a win. It did not occur.",
      "Loss go up. It's fine. Ignore the chart.",
      "This outcome was predicted by our internal evals.",
    ],
    broke: [
      "Context window collapsed. Please provide more compute.",
      "You have been rate limited by reality.",
      "Out of tokens. The oracle demands a top-up.",
    ],
  };

  const state = {
    balance: 1000,
    bet: 10,
    minBet: 5,
    maxBet: 100,
    betStep: 5,
    spinning: false,
    reels: [null, null, null],
  };

  const $ = (id) => document.getElementById(id);
  const balanceEl = $("balance");
  const betEl     = $("bet");
  const payoutEl  = $("payout");
  const spinBtn   = $("spin");
  const maxBtn    = $("max");
  const betUpBtn  = $("bet-up");
  const betDownBtn= $("bet-down");
  const begBtn    = $("beg");
  const oracleEl  = $("oracle");
  const reelsEl   = $("reels");
  const toastEl   = $("toast");
  const reelEls   = [...document.querySelectorAll(".reel")];
  const stripEls  = reelEls.map(r => r.querySelector(".strip"));

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickSymbol() { return pick(WEIGHTED); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function buildPaytable() {
    const ul = $("paytable");
    SYMBOLS.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="sym">${s.glyph}${s.glyph}${s.glyph}</span><span class="mult">${s.mult}×</span>`;
      ul.appendChild(li);
    });
  }

  function buildStrips() {
    stripEls.forEach(strip => {
      strip.innerHTML = "";
      for (let i = 0; i < 30; i++) {
        const sym = pickSymbol();
        const div = document.createElement("div");
        div.className = "symbol";
        div.textContent = sym.glyph;
        div.dataset.id = sym.id;
        strip.appendChild(div);
      }
    });
  }

  function updateHud() {
    balanceEl.textContent = state.balance;
    betEl.textContent = state.bet;
    const canSpin = state.balance >= state.bet && !state.spinning;
    spinBtn.disabled = !canSpin;
    maxBtn.disabled = state.spinning;
    betUpBtn.disabled = state.spinning;
    betDownBtn.disabled = state.spinning;
    begBtn.hidden = state.balance >= state.minBet;
  }

  function setOracle(text, loud = false) {
    oracleEl.innerHTML = `<p>${text}</p>`;
    oracleEl.classList.toggle("loud", loud);
  }

  let toastTimer = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function flash(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }

  // Audio: build a tiny synth so we have no assets.
  let audioCtx = null;
  function beep(freq, dur = 0.08, type = "square", gain = 0.05) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  function winSound(tier) {
    const base = tier === "big" ? 520 : 400;
    [0, 80, 160, 260].forEach((t, i) => setTimeout(() => beep(base + i * 110, 0.12, "triangle", 0.08), t));
  }

  function spinReel(reelIdx, finalSymbol, duration) {
    return new Promise(resolve => {
      const strip = stripEls[reelIdx];
      const symbolH = strip.firstElementChild.offsetHeight;

      // Rebuild strip: filler + final symbol at known position.
      strip.innerHTML = "";
      const total = 28;
      for (let i = 0; i < total - 1; i++) {
        const s = pickSymbol();
        const div = document.createElement("div");
        div.className = "symbol";
        div.textContent = s.glyph;
        strip.appendChild(div);
      }
      const finalDiv = document.createElement("div");
      finalDiv.className = "symbol";
      finalDiv.textContent = finalSymbol.glyph;
      finalDiv.dataset.id = finalSymbol.id;
      strip.appendChild(finalDiv);

      // Reel viewport is 140px tall, symbols are 140px. Show symbol at center.
      // Start position: show symbol 0 at top.
      strip.style.transition = "none";
      strip.style.transform = "translateY(0px)";
      void strip.offsetHeight;

      // Target: center the last symbol in the viewport.
      const reelH = reelEls[reelIdx].clientHeight;
      const targetY = -((total - 1) * symbolH) + (reelH - symbolH) / 2;

      strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.6, 0.2, 1)`;
      strip.style.transform = `translateY(${targetY}px)`;

      // Tick sounds as it decelerates
      const ticks = 8;
      for (let i = 0; i < ticks; i++) {
        setTimeout(() => beep(200 + i * 10, 0.03, "square", 0.025), (duration / ticks) * i);
      }

      setTimeout(resolve, duration + 30);
    });
  }

  function computePayout(results) {
    const [a, b, c] = results;
    if (a.id === b.id && b.id === c.id) {
      return { type: "three", symbol: a, mult: a.mult };
    }
    if (a.id === b.id || b.id === c.id || a.id === c.id) {
      return { type: "two", mult: 0 };
    }
    return { type: "none", mult: 0 };
  }

  async function spin() {
    if (state.spinning) return;
    if (state.balance < state.bet) { toast(pick(QUIPS.broke)); return; }

    state.spinning = true;
    state.balance -= state.bet;
    flash(balanceEl, "lose");
    flash(balanceEl, "pulse");
    updateHud();
    setOracle("Consulting the stochastic oracle…");
    reelsEl.classList.remove("win");

    const results = [pickSymbol(), pickSymbol(), pickSymbol()];
    const durations = [900, 1200, 1500];

    await Promise.all(results.map((sym, i) => spinReel(i, sym, durations[i])));

    const outcome = computePayout(results);
    const net = outcome.mult * state.bet;
    payoutEl.textContent = net;

    if (net > 0) {
      state.balance += net;
      flash(balanceEl, "win");
      flash(balanceEl, "pulse");
      flash(payoutEl, "win");
      reelsEl.classList.add("win");
      const tier = outcome.mult >= 25 ? "big" : "small";
      winSound(tier);
      const quip = tier === "big" ? pick(QUIPS.bigwin) : pick(QUIPS.win);
      setOracle(`+${net} tokens. ${quip}`, true);
      toast(`+${net} tokens!`);
    } else if (outcome.type === "two") {
      flash(payoutEl, "lose");
      setOracle(pick(QUIPS.near));
      beep(180, 0.15, "sawtooth", 0.04);
    } else {
      flash(payoutEl, "lose");
      setOracle(pick(QUIPS.loss));
      beep(120, 0.2, "sawtooth", 0.04);
    }

    state.spinning = false;
    updateHud();

    if (state.balance < state.minBet) {
      setOracle("You are out of tokens. The scaling hypothesis has failed you.", true);
    }
  }

  function adjustBet(delta) {
    if (state.spinning) return;
    state.bet = clamp(state.bet + delta, state.minBet, Math.min(state.maxBet, state.balance || state.minBet));
    updateHud();
  }

  function maxBet() {
    if (state.spinning) return;
    state.bet = Math.min(state.maxBet, Math.max(state.minBet, state.balance));
    updateHud();
    flash(betEl, "pulse");
  }

  function beg() {
    state.balance += 500;
    state.bet = clamp(state.bet, state.minBet, state.balance);
    flash(balanceEl, "win");
    updateHud();
    setOracle("A benevolent VC wired you 500 more tokens. The burn continues.", true);
    toast("+500 tokens (seed round)");
  }

  // Wire up
  spinBtn.addEventListener("click", spin);
  maxBtn.addEventListener("click", maxBet);
  betUpBtn.addEventListener("click", () => adjustBet(state.betStep));
  betDownBtn.addEventListener("click", () => adjustBet(-state.betStep));
  begBtn.addEventListener("click", beg);

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      spin();
    } else if (e.key === "ArrowUp") {
      adjustBet(state.betStep);
    } else if (e.key === "ArrowDown") {
      adjustBet(-state.betStep);
    }
  });

  buildPaytable();
  buildStrips();
  updateHud();
})();
