// Hallucinator 3000 — a slot machine that roasts AI
(() => {
  const SYMBOLS = [
    { icon: "🧠", name: "Brain",       weight: 5,  payout: 3  },
    { icon: "🤖", name: "Bot",         weight: 5,  payout: 4  },
    { icon: "📎", name: "Clippy",      weight: 4,  payout: 5  },
    { icon: "💾", name: "Training",    weight: 4,  payout: 6  },
    { icon: "🔮", name: "Oracle",      weight: 3,  payout: 10 },
    { icon: "🌀", name: "Hallucinate", weight: 6,  payout: 2  }, // common but low
    { icon: "⚠️", name: "ContentFilter",weight: 3, payout: 0  }, // BUST
    { icon: "👑", name: "AGI",         weight: 1,  payout: 50 }, // jackpot
  ];

  const WIN_QUIPS = {
    "🧠": ["Your model gained emergent common sense!", "A rare moment of lucidity."],
    "🤖": ["Beep boop. You win.", "The bot approves this transaction."],
    "📎": ["It looks like you're winning. Want help?", "Clippy pays dividends."],
    "💾": ["Trained on your data. Returned with interest.", "Epoch complete."],
    "🔮": ["The oracle prefers paying customers.", "Predicted: profit."],
    "🌀": ["Confabulated a payout out of thin air.", "The facts are made up but the tokens are real."],
    "👑": ["⚡ AGI ACHIEVED ⚡ Tell the board.", "Singularity jackpot! Please sit down."],
  };

  const LOSE_QUIPS = [
    "As a large language model, I cannot give you tokens.",
    "I apologize for the confusion. You lose.",
    "Let me rephrase that: broke.",
    "I'm just an AI, but even I can see that was bad.",
    "Refining your query would not have helped.",
    "Based on my training data, you should've quit.",
    "Hallucinated a win. It wasn't real. Sorry.",
    "Token-efficient response: no.",
  ];

  const BUST_QUIPS = [
    "⚠️ Content filter activated. Tokens confiscated.",
    "⚠️ This response has been withheld for safety.",
    "⚠️ Request flagged by alignment team.",
  ];

  const BEG_QUIPS = [
    "A charitable donor (OpenPocket) tops you up.",
    "Grant approved: seed round of pity.",
    "VC liquidity event. Don't ask questions.",
    "Found loose change in the cloud.",
  ];

  // --- State ---
  const state = {
    tokens: 1000,
    bet: 10,
    spinning: false,
    context: 100, // "context window" cosmetic drain
  };

  // --- DOM ---
  const $tokens = document.getElementById("tokens");
  const $bet = document.getElementById("bet");
  const $message = document.getElementById("message");
  const $log = document.getElementById("log");
  const $spin = document.getElementById("spin");
  const $betUp = document.getElementById("betUp");
  const $betDown = document.getElementById("betDown");
  const $beg = document.getElementById("beg");
  const $contextFill = document.getElementById("contextFill");
  const reels = Array.from(document.querySelectorAll(".reel"));
  const strips = Array.from(document.querySelectorAll(".strip"));

  // --- Build weighted pool ---
  const pool = [];
  for (const s of SYMBOLS) {
    for (let i = 0; i < s.weight; i++) pool.push(s);
  }
  const pickSymbol = () => pool[Math.floor(Math.random() * pool.length)];

  // --- Build reel strips ---
  const STRIP_LENGTH = 30;
  const SYMBOL_H = 60;
  const VISIBLE_CENTER_INDEX = 1; // middle row

  function buildStrip(strip, finalSymbol) {
    strip.innerHTML = "";
    const items = [];
    for (let i = 0; i < STRIP_LENGTH; i++) {
      items.push(pickSymbol());
    }
    // Place the final symbol at a known slot
    const landIndex = STRIP_LENGTH - 3;
    items[landIndex] = finalSymbol;
    for (const sym of items) {
      const el = document.createElement("div");
      el.className = "symbol";
      el.textContent = sym.icon;
      strip.appendChild(el);
    }
    return landIndex;
  }

  function seedIdle() {
    for (const strip of strips) {
      strip.style.transition = "none";
      strip.style.transform = "translateY(0px)";
      strip.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const el = document.createElement("div");
        el.className = "symbol";
        el.textContent = pickSymbol().icon;
        strip.appendChild(el);
      }
    }
  }

  // --- Render ---
  function render() {
    $tokens.textContent = state.tokens;
    $bet.textContent = state.bet;
    $contextFill.style.width = state.context + "%";
    $spin.disabled = state.spinning || state.tokens < state.bet;
    $betUp.disabled = state.spinning;
    $betDown.disabled = state.spinning;
    $beg.disabled = state.spinning || state.tokens > 0;
  }

  function logLine(text) {
    const li = document.createElement("li");
    li.textContent = text;
    $log.prepend(li);
    while ($log.children.length > 20) $log.removeChild($log.lastChild);
  }

  function setMessage(text, kind = "") {
    $message.textContent = text;
    $message.className = "message " + kind;
  }

  // --- Spin logic ---
  function spin() {
    if (state.spinning || state.tokens < state.bet) return;
    state.spinning = true;
    state.tokens -= state.bet;
    state.context = Math.max(5, state.context - 3);
    for (const r of reels) r.classList.remove("win");
    setMessage("Inferencing…");
    render();

    const finals = [pickSymbol(), pickSymbol(), pickSymbol()];

    const promises = strips.map((strip, i) => {
      const landIndex = buildStrip(strip, finals[i]);
      // offset so center row = landIndex
      const targetY = -(landIndex - VISIBLE_CENTER_INDEX) * SYMBOL_H;
      strip.style.transition = "none";
      strip.style.transform = `translateY(${SYMBOL_H * 2}px)`;
      // force reflow
      void strip.offsetHeight;
      const duration = 1400 + i * 400;
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.7, 0.2, 1)`;
      strip.style.transform = `translateY(${targetY}px)`;
      return new Promise(res => {
        strip.addEventListener("transitionend", res, { once: true });
      });
    });

    Promise.all(promises).then(() => resolve(finals));
  }

  function resolve(finals) {
    const [a, b, c] = finals;
    let payout = 0;
    let kind = "";
    let msg = "";

    const allSame = a.icon === b.icon && b.icon === c.icon;
    const twoSame = a.icon === b.icon || b.icon === c.icon || a.icon === c.icon;

    // Bust: any content filter on the line = lose everything bet (already taken)
    const hasBust = finals.some(s => s.name === "ContentFilter");

    if (hasBust && !allSame) {
      msg = BUST_QUIPS[Math.floor(Math.random() * BUST_QUIPS.length)];
      kind = "lose";
    } else if (allSame) {
      payout = state.bet * a.payout;
      const quips = WIN_QUIPS[a.icon] || ["You win."];
      msg = `${quips[Math.floor(Math.random() * quips.length)]} +${payout} tokens`;
      kind = "win";
      reels.forEach(r => r.classList.add("win"));
      if (a.name === "AGI") celebrate();
    } else if (twoSame) {
      // Small consolation: find the matching pair
      const pair = (a.icon === b.icon) ? a : (b.icon === c.icon ? b : a);
      payout = Math.floor(state.bet * pair.payout * 0.3);
      msg = `Partial credit. The model is "mostly right". +${payout} tokens`;
      kind = payout > 0 ? "win" : "lose";
    } else {
      msg = LOSE_QUIPS[Math.floor(Math.random() * LOSE_QUIPS.length)];
      kind = "lose";
    }

    state.tokens += payout;
    setMessage(msg, kind);
    logLine(`${a.icon}${b.icon}${c.icon}  bet ${state.bet} → ${payout > 0 ? "+" + payout : "−" + state.bet}`);
    state.spinning = false;
    render();

    if (state.tokens <= 0) {
      setMessage("Out of tokens. Upgrade to Hallucinator Pro. Or beg.", "lose");
    }
  }

  function celebrate() {
    // Lightweight confetti using emoji
    const host = document.body;
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("div");
      c.textContent = ["👑","✨","💎","🎉","⚡"][i % 5];
      c.style.position = "fixed";
      c.style.left = Math.random() * 100 + "vw";
      c.style.top = "-30px";
      c.style.fontSize = (16 + Math.random() * 18) + "px";
      c.style.transition = `transform ${1500 + Math.random() * 1500}ms ease-in, opacity 500ms`;
      c.style.zIndex = 9999;
      c.style.pointerEvents = "none";
      host.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translateY(110vh) rotate(${Math.random()*720-360}deg)`;
      });
      setTimeout(() => { c.style.opacity = "0"; }, 2500);
      setTimeout(() => c.remove(), 3200);
    }
  }

  // --- Controls ---
  const BET_STEPS = [1, 5, 10, 25, 50, 100, 250];
  function nudgeBet(dir) {
    const i = BET_STEPS.indexOf(state.bet);
    const next = Math.max(0, Math.min(BET_STEPS.length - 1, i + dir));
    state.bet = BET_STEPS[next];
    render();
  }

  $spin.addEventListener("click", spin);
  $betUp.addEventListener("click", () => nudgeBet(1));
  $betDown.addEventListener("click", () => nudgeBet(-1));
  $beg.addEventListener("click", () => {
    if (state.tokens > 0) return;
    state.tokens += 100;
    state.context = 100;
    const q = BEG_QUIPS[Math.floor(Math.random() * BEG_QUIPS.length)];
    setMessage(q);
    logLine("Begged for tokens. +100");
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); spin(); }
    if (e.key === "ArrowUp")   nudgeBet(1);
    if (e.key === "ArrowDown") nudgeBet(-1);
  });

  // --- Init ---
  seedIdle();
  render();
})();
