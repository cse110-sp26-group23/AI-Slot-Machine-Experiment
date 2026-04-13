(() => {
  const SYMBOLS = [
    { id: 'gpu',   emoji: '🖥️', name: 'GPU',          weight: 3,  payout: 50 },
    { id: 'brain', emoji: '🧠', name: 'Neural Net',   weight: 5,  payout: 25 },
    { id: 'robot', emoji: '🤖', name: 'Agent',        weight: 7,  payout: 15 },
    { id: 'chart', emoji: '📈', name: 'Loss Curve',   weight: 9,  payout: 10 },
    { id: 'fire',  emoji: '🔥', name: 'Hot Take',     weight: 11, payout: 6  },
    { id: 'bug',   emoji: '🐛', name: 'Hallucination',weight: 13, payout: 3  },
  ];

  const WIN_LINES = [
    "✨ EMERGENT CAPABILITY UNLOCKED: +{n} tokens",
    "🎉 Your model achieved AGI (temporarily): +{n} tokens",
    "📊 Benchmark saturated: +{n} tokens",
    "🚀 Series B closed on the vibes alone: +{n} tokens",
    "🏆 Beat humans on MMLU (maybe): +{n} tokens",
  ];

  const NEAR_MISS_LINES = [
    "💭 Model was 'almost certain' it would win.",
    "📉 Gradient vanished right at the finish line.",
    "🤷 It hallucinated a jackpot that wasn't there.",
    "⚠️ Close, but the reward model disagreed.",
  ];

  const LOSS_LINES = [
    "🔻 Overfit to the training distribution. −{n} tokens",
    "🫠 Prompt injected by the casino. −{n} tokens",
    "💸 Inference cost exceeded revenue. −{n} tokens",
    "📉 RLHF'd into oblivion. −{n} tokens",
    "🧊 Cold start problem. −{n} tokens",
    "🪤 Fell for the classic 'ignore previous instructions'. −{n} tokens",
    "⛔ Rate limited by reality. −{n} tokens",
  ];

  const BROKE_LINES = [
    "💀 Out of tokens. The model has been deprecated.",
    "🪦 You burned through your context window. GG.",
    "📜 Your weights have been open-sourced out of pity.",
  ];

  const BET_STEPS = [5, 10, 25, 50, 100];
  const START_BALANCE = 1000;
  const SYMBOL_HEIGHT = 80;

  // Weighted pool for RNG
  const pool = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
  const pickSymbol = () => pool[Math.floor(Math.random() * pool.length)];

  // State
  const state = {
    balance: START_BALANCE,
    betIdx: 1,
    spinning: false,
    reels: [null, null, null],
  };

  // DOM
  const $ = (id) => document.getElementById(id);
  const reelEls = [...document.querySelectorAll('.reel')];
  const stripEls = reelEls.map(r => r.querySelector('.strip'));
  const balanceEl = $('balance');
  const betEl = $('bet');
  const tempEl = $('temp');
  const spinBtn = $('spin');
  const betUpBtn = $('bet-up');
  const betDownBtn = $('bet-down');
  const resetBtn = $('reset');
  const logEl = $('log');
  const toastEl = $('toast');

  // Build initial strips (each strip has many random symbols for spin illusion)
  const STRIP_LEN = 30;
  function buildStrip(stripEl, finalSymbol) {
    stripEl.innerHTML = '';
    for (let i = 0; i < STRIP_LEN - 1; i++) {
      stripEl.appendChild(makeSymbolEl(pickSymbol()));
    }
    stripEl.appendChild(makeSymbolEl(finalSymbol));
  }

  function makeSymbolEl(sym) {
    const d = document.createElement('div');
    d.className = 'symbol';
    d.textContent = sym.emoji;
    d.dataset.id = sym.id;
    return d;
  }

  function currentBet() { return BET_STEPS[state.betIdx]; }

  function render() {
    balanceEl.textContent = state.balance;
    betEl.textContent = currentBet();
    // "Temperature" tied to bet for flavor
    tempEl.textContent = (0.2 + state.betIdx * 0.3).toFixed(1);
    spinBtn.disabled = state.spinning || state.balance < currentBet();
    betUpBtn.disabled = state.spinning || state.betIdx >= BET_STEPS.length - 1;
    betDownBtn.disabled = state.spinning || state.betIdx <= 0;
  }

  function log(msg, kind = '') {
    const line = document.createElement('div');
    line.className = `log-line ${kind}`;
    const ts = new Date().toLocaleTimeString([], { hour12: false });
    line.textContent = `[${ts}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    // Trim log
    while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
  }

  function toast(msg, bad = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('bad', bad);
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function spinReel(i, finalSymbol, duration) {
    return new Promise(resolve => {
      const strip = stripEls[i];
      const reelEl = reelEls[i];
      buildStrip(strip, finalSymbol);
      reelEl.classList.add('spinning');

      // Start position: strip top at 0 (showing first symbol)
      // End position: translate so the final (last) symbol centers on payline.
      // Reel height is 180 - 20 padding = 160; center of viewport at 80 from top.
      // Symbol height 80, so center a symbol by translating -(index * 80 - 40).
      const finalIndex = STRIP_LEN - 1;
      const centerOffset = (180 - 20) / 2 - SYMBOL_HEIGHT / 2; // 40
      const endY = -(finalIndex * SYMBOL_HEIGHT - centerOffset);

      strip.style.transform = `translateY(${centerOffset}px)`;
      // Force reflow then animate
      strip.getBoundingClientRect();
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.45, 0.2, 1)`;
      strip.style.transform = `translateY(${endY}px)`;

      const onEnd = () => {
        strip.removeEventListener('transitionend', onEnd);
        reelEl.classList.remove('spinning');
        resolve();
      };
      strip.addEventListener('transitionend', onEnd);
    });
  }

  async function spin() {
    if (state.spinning) return;
    const bet = currentBet();
    if (state.balance < bet) return;

    state.spinning = true;
    state.balance -= bet;
    render();
    log(`>>> inference.spin(bet=${bet}, temp=${tempEl.textContent})`, 'info');

    // Decide outcome (weighted random per reel)
    const results = [pickSymbol(), pickSymbol(), pickSymbol()];
    state.reels = results;

    // Stagger reel stops
    await Promise.all([
      spinReel(0, results[0], 1200),
      spinReel(1, results[1], 1600),
      spinReel(2, results[2], 2000),
    ]);

    // Evaluate
    evaluate(results, bet);
    state.spinning = false;
    render();

    if (state.balance < BET_STEPS[0]) {
      setTimeout(() => {
        log(pick(BROKE_LINES), 'loss');
        toast("You're out of tokens. Reinitialize?", true);
      }, 400);
    }
  }

  function evaluate(results, bet) {
    const [a, b, c] = results;
    let payout = 0;

    if (a.id === b.id && b.id === c.id) {
      payout = bet * a.payout;
      state.balance += payout;
      reelEls.forEach(r => {
        r.classList.add('win');
        setTimeout(() => r.classList.remove('win'), 2000);
      });
      const msg = pick(WIN_LINES).replace('{n}', payout);
      log(`✅ JACKPOT: 3× ${a.name} → +${payout}`, 'win');
      log(msg, 'win');
      toast(`JACKPOT! +${payout} tokens`);
    } else if (a.id === b.id || b.id === c.id || a.id === c.id) {
      // Pair: small payout
      const pairSym = a.id === b.id ? a : (b.id === c.id ? b : a);
      payout = Math.floor(bet * (pairSym.payout / 10));
      if (payout > 0) {
        state.balance += payout;
        log(`🎯 Pair of ${pairSym.name} → +${payout}`, 'win');
        toast(`Pair! +${payout}`);
      } else {
        log(pick(NEAR_MISS_LINES), 'info');
      }
    } else {
      log(pick(LOSS_LINES).replace('{n}', bet), 'loss');
    }
  }

  function placeholderSpin() {
    // Show starting symbols (no animation)
    for (let i = 0; i < 3; i++) {
      const sym = pickSymbol();
      state.reels[i] = sym;
      const strip = stripEls[i];
      buildStrip(strip, sym);
      const finalIndex = STRIP_LEN - 1;
      const centerOffset = (180 - 20) / 2 - SYMBOL_HEIGHT / 2;
      const endY = -(finalIndex * SYMBOL_HEIGHT - centerOffset);
      strip.style.transition = 'none';
      strip.style.transform = `translateY(${endY}px)`;
    }
  }

  function reset() {
    state.balance = START_BALANCE;
    state.betIdx = 1;
    logEl.innerHTML = '';
    log('Model weights reinitialized. Fresh from pretraining.', 'info');
    log('Place your bet. Remember: AGI is just one spin away.', 'info');
    render();
    toast('Weights reset. Good luck!');
  }

  // Events
  spinBtn.addEventListener('click', spin);
  betUpBtn.addEventListener('click', () => {
    if (state.betIdx < BET_STEPS.length - 1) { state.betIdx++; render(); }
  });
  betDownBtn.addEventListener('click', () => {
    if (state.betIdx > 0) { state.betIdx--; render(); }
  });
  resetBtn.addEventListener('click', reset);

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); spin(); }
    else if (e.code === 'ArrowUp') { betUpBtn.click(); }
    else if (e.code === 'ArrowDown') { betDownBtn.click(); }
  });

  // Init
  placeholderSpin();
  render();
  log('Booting Hallucinator 3000...', 'info');
  log('Loading 175B parameters... (just kidding, it\'s Math.random)', 'info');
  log('Press INFER or [Space] to spin. ↑/↓ adjusts bet.', 'info');
})();
