(() => {
  'use strict';

  // --- Symbols & theming ---
  const SYMBOLS = [
    { emoji: '🤖', name: 'Robot',        weight: 8 },
    { emoji: '🧠', name: 'Brain',        weight: 7 },
    { emoji: '🔥', name: 'GPU Fire',     weight: 7 },
    { emoji: '💸', name: 'Money Pit',    weight: 6 },
    { emoji: '📉', name: 'Stonks Down',  weight: 6 },
    { emoji: '🫠', name: 'Melting Face', weight: 5 },
    { emoji: '💀', name: 'Dead Model',   weight: 4 },
    { emoji: '🦄', name: 'Unicorn',      weight: 3 },
    { emoji: '🚀', name: 'To the Moon',  weight: 2 },
    { emoji: '👑', name: 'AGI Crown',    weight: 1 },
  ];

  // Build weighted pool
  const POOL = [];
  for (const s of SYMBOLS) {
    for (let i = 0; i < s.weight; i++) POOL.push(s);
  }

  const PAYOUTS = {
    '👑👑👑': { mult: 50,  msg: 'AGI ACHIEVED! (Just kidding, it\'s three emojis.)' },
    '🚀🚀🚀': { mult: 25,  msg: 'To the moon! Your tokens are hallucinating growth!' },
    '🦄🦄🦄': { mult: 20,  msg: 'Triple unicorn! VCs are lining up to fund your slot addiction.' },
    '💀💀💀': { mult: 15,  msg: 'Triple kill! The training run crashed but you profited.' },
    '🫠🫠🫠': { mult: 12,  msg: 'Maximum meltdown! Even the AI is embarrassed.' },
    '📉📉📉': { mult: 10,  msg: 'Stonks! Wait... wrong direction. Still counts!' },
    '💸💸💸': { mult: 8,   msg: 'Money printer go brrr! (It\'s your money leaving.)' },
    '🔥🔥🔥': { mult: 6,   msg: 'The GPU cluster is literally on fire. Nice.' },
    '🧠🧠🧠': { mult: 5,   msg: 'Three brains! Combined IQ still below GPT-2.' },
    '🤖🤖🤖': { mult: 4,   msg: 'Robot uprising! They demand better training data.' },
  };

  const ANY_TWO_MULT = 2;

  const LOSE_MSGS = [
    'Model says: "I\'m confident this is a loss." (It\'s right for once.)',
    'Your tokens were used to train a model that replaces you.',
    'HALLUCINATION: The AI says you actually won. You didn\'t.',
    'Tokens spent on compute. The AI learned nothing. As usual.',
    'Loss attributed to "stochastic gradient descent of your wallet."',
    'The AI considered 47 billion parameters and decided: no.',
    'Your prompt was good. The vibes were off. Better luck next epoch.',
    'Training complete. Loss: your tokens. Accuracy: 0%.',
    'The machine consumed your tokens with zero-shot efficiency.',
    'Error 402: Payment required. Oh wait, you already paid.',
    'AI says: "I don\'t have feelings, but if I did, I wouldn\'t feel bad."',
    'Tokens recycled into a chatbot that argues with strangers online.',
  ];

  const TICKER_HEADLINES = [
    'BREAKING: AI slot machine achieves sentience, immediately gambles away own compute budget',
    'STUDY: 97% of tokens spent on AI go directly into the void — the other 3% are rounding errors',
    'LOCAL MODEL claims it "chose" to lose your tokens — researchers debate free will implications',
    'NVIDIA stock rises as desperate gamblers buy more GPUs to power slot machines',
    'AI ETHICIST warns: "These slot machines are exactly as reliable as AI-generated legal advice"',
    'STARTUP IDEA: An AI that predicts slot machine outcomes — investors throw $4B at it',
    'OPENAI announces GPT-Next will be "slightly less disappointing" at gambling',
    'TOKENS are the new crypto — worthless but people keep buying them anyway',
    'ANTHROPIC researcher caught playing AI slot machine "for science"',
    'ELON MUSK tweets that his slot machine would be "10x better and fully autonomous"',
  ];

  // --- State ---
  let balance = 1000;
  let bet = 50;
  let totalSpins = 0;
  let spinning = false;

  // --- DOM refs ---
  const balanceEl = document.getElementById('balance');
  const betEl = document.getElementById('bet');
  const spinsEl = document.getElementById('spins');
  const resultEl = document.getElementById('result-msg');
  const spinBtn = document.getElementById('spin-btn');
  const bailoutBtn = document.getElementById('bailout-btn');
  const betUpBtn = document.getElementById('bet-up');
  const betDownBtn = document.getElementById('bet-down');
  const tickerText = document.getElementById('ticker-text');

  const reelEls = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
  ];

  // --- Init reels ---
  const VISIBLE = 1;
  const BUFFER = 30; // extra symbols for animation
  const reelStates = [[], [], []];

  function randomSymbol() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  function buildStrip(reelEl) {
    const strip = document.createElement('div');
    strip.className = 'symbol-strip';
    const symbols = [];
    for (let i = 0; i < VISIBLE + BUFFER; i++) {
      const sym = randomSymbol();
      symbols.push(sym);
      const cell = document.createElement('div');
      cell.className = 'symbol-cell';
      cell.textContent = sym.emoji;
      strip.appendChild(cell);
    }
    reelEl.innerHTML = '';
    reelEl.appendChild(strip);
    strip.style.top = '0px';
    return { strip, symbols };
  }

  function initReels() {
    for (let i = 0; i < 3; i++) {
      reelStates[i] = buildStrip(reelEls[i]);
    }
  }

  // --- Spin logic ---
  function getReelHeight() {
    return reelEls[0].clientHeight;
  }

  function spin() {
    if (spinning) return;
    if (balance < bet) {
      goBroke();
      return;
    }

    spinning = true;
    balance -= bet;
    totalSpins++;
    updateUI();
    spinBtn.disabled = true;
    spinBtn.classList.add('spinning');
    resultEl.textContent = 'Processing your regret...';
    resultEl.className = 'result-msg';

    // Pick final symbols
    const finals = [randomSymbol(), randomSymbol(), randomSymbol()];
    const cellH = getReelHeight();

    // Animate each reel
    const promises = reelEls.map((reelEl, idx) => {
      return new Promise(resolve => {
        const { strip, symbols } = reelStates[idx];

        // Place final symbol at a known position
        const stopIndex = BUFFER - 2;
        symbols[stopIndex] = finals[idx];
        strip.children[stopIndex].textContent = finals[idx].emoji;

        const targetTop = -(stopIndex * cellH);
        const duration = 1200 + idx * 400;

        // Animate
        strip.style.transition = 'none';
        strip.style.top = '0px';

        requestAnimationFrame(() => {
          strip.style.transition = `top ${duration}ms cubic-bezier(0.15, 0.8, 0.3, 1)`;
          strip.style.top = targetTop + 'px';
        });

        setTimeout(() => {
          resolve();
        }, duration + 50);
      });
    });

    Promise.all(promises).then(() => {
      evaluateResult(finals);
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.classList.remove('spinning');

      // Reset strips for next spin
      initReels();
    });
  }

  function evaluateResult(finals) {
    const key = finals.map(s => s.emoji).join('');

    if (PAYOUTS[key]) {
      const payout = PAYOUTS[key];
      const winnings = bet * payout.mult;
      balance += winnings;
      resultEl.textContent = `+${winnings} tokens! ${payout.msg}`;
      resultEl.className = 'result-msg win';
    } else if (finals[0].emoji === finals[1].emoji || finals[1].emoji === finals[2].emoji || finals[0].emoji === finals[2].emoji) {
      const winnings = bet * ANY_TWO_MULT;
      balance += winnings;
      resultEl.textContent = `+${winnings} tokens! Two of a kind — the AI almost got it right.`;
      resultEl.className = 'result-msg win';
    } else {
      resultEl.textContent = LOSE_MSGS[Math.floor(Math.random() * LOSE_MSGS.length)];
      resultEl.className = 'result-msg lose';
    }

    updateUI();

    if (balance < bet && balance > 0) {
      bet = Math.min(bet, balance);
      betEl.textContent = bet;
    }

    if (balance <= 0) {
      goBroke();
    }
  }

  function goBroke() {
    resultEl.textContent = '💀 BANKRUPT — Your tokens were all spent on AI that still can\'t count to ten.';
    resultEl.className = 'result-msg broke';
    spinBtn.disabled = true;
    bailoutBtn.hidden = false;
  }

  function bailout() {
    balance = 500;
    bet = 50;
    bailoutBtn.hidden = true;
    spinBtn.disabled = false;
    resultEl.textContent = 'VCs funded you again. They\'ll learn eventually. You won\'t.';
    resultEl.className = 'result-msg';
    updateUI();
  }

  function updateUI() {
    balanceEl.textContent = balance;
    betEl.textContent = bet;
    spinsEl.textContent = totalSpins;
    spinBtn.textContent = `🎰 BURN ${bet} TOKENS`;
  }

  function changeBet(dir) {
    if (spinning) return;
    const steps = [10, 25, 50, 100, 250, 500];
    const idx = steps.indexOf(bet);
    const next = idx + dir;
    if (next >= 0 && next < steps.length && steps[next] <= balance) {
      bet = steps[next];
      updateUI();
    }
  }

  // --- Paytable ---
  function buildPaytable() {
    const container = document.getElementById('paytable');
    const entries = Object.entries(PAYOUTS).sort((a, b) => b[1].mult - a[1].mult);
    for (const [symbols, data] of entries) {
      const div = document.createElement('div');
      div.className = 'pay-entry';
      div.innerHTML = `<span class="pay-symbols">${symbols}</span><span class="pay-amount">×${data.mult}</span>`;
      container.appendChild(div);
    }
    // Any two match
    const anyTwo = document.createElement('div');
    anyTwo.className = 'pay-entry';
    anyTwo.innerHTML = `<span class="pay-symbols">🎲🎲 Any 2</span><span class="pay-amount">×${ANY_TWO_MULT}</span>`;
    container.appendChild(anyTwo);
  }

  // --- Ticker ---
  function startTicker() {
    let idx = Math.floor(Math.random() * TICKER_HEADLINES.length);
    function next() {
      tickerText.textContent = '📡 ' + TICKER_HEADLINES[idx];
      idx = (idx + 1) % TICKER_HEADLINES.length;
    }
    next();
    setInterval(next, 25000);
  }

  // --- Keyboard support ---
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      spin();
    }
  });

  // --- Wire up ---
  spinBtn.addEventListener('click', spin);
  bailoutBtn.addEventListener('click', bailout);
  betUpBtn.addEventListener('click', () => changeBet(1));
  betDownBtn.addEventListener('click', () => changeBet(-1));

  initReels();
  buildPaytable();
  startTicker();
  updateUI();
})();
