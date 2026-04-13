(() => {
  const SYMBOLS = [
    { icon: '🧠', name: 'AGI',          mult: 100, weight: 1 },
    { icon: '🤖', name: 'Model',        mult: 50,  weight: 2 },
    { icon: '📎', name: 'Clippy',       mult: 25,  weight: 3 },
    { icon: '🔥', name: 'GPU',          mult: 15,  weight: 4 },
    { icon: '💸', name: 'VC Cash',      mult: 10,  weight: 5 },
    { icon: '🌀', name: 'Hallucination',mult: 5,   weight: 7 },
  ];

  const WIN_QUIPS = {
    100: [
      "AGI ACHIEVED. The singularity wires you tokens directly.",
      "You've solved alignment. The board approves a bonus.",
    ],
    50: [
      "Three models collapsed into one big one. Jackpot.",
      "Mixture of Experts agrees: you win.",
    ],
    25: [
      "It looks like you're winning tokens. Would you like help?",
      "Clippy has returned from exile, bearing gifts.",
    ],
    15: [
      "GPUs melted gracefully into cold hard tokens.",
      "NVIDIA thanks you for your service.",
    ],
    10: [
      "A VC slides you a SAFE note. No dilution. Probably.",
      "Series Z funding secured. Burn rate increased.",
    ],
    5: [
      "You hallucinated a winning combination. It's real this time.",
      "Confidently wrong AND profitable. A first.",
    ],
    2: [
      "Two of a kind. Technically a win, statistically a cope.",
      "Partial credit, like a well-prompted homework answer.",
    ],
  };

  const LOSE_QUIPS = [
    "Nothing. Just like your model's understanding of truth.",
    "The context window ate your winnings.",
    "Rate limited. Try again in 1-7 business days.",
    "Your bet was flagged as potentially harmful. Denied.",
    "Model refused to respond. Tokens burned anyway.",
    "Fine-tuned on losses. Spectacular performance.",
    "Gradient vanished. So did your tokens.",
    "Output was politely corporate and completely empty.",
    "Prompt injection detected: it was just vibes.",
    "The attention mechanism attended to your wallet.",
  ];

  const BROKE_QUIPS = [
    "You've been laid off by your own slot machine.",
    "Insufficient tokens. Consider selling equity in yourself.",
    "Bankrupt. Pivot to blockchain?",
  ];

  const BET_STEPS = [1, 5, 10, 25, 50, 100];
  const START_BALANCE = 1000;
  const REEL_COUNT = 3;
  const STRIP_LENGTH = 30;

  const state = {
    balance: START_BALANCE,
    bet: 10,
    spinning: false,
  };

  const $ = (id) => document.getElementById(id);
  const balanceEl = $('balance');
  const betEl = $('bet');
  const payoutEl = $('payout');
  const messageEl = $('message');
  const spinBtn = $('spin');
  const maxBtn = $('maxBet');
  const resetBtn = $('reset');
  const betUpBtn = $('betUp');
  const betDownBtn = $('betDown');
  const strips = Array.from(document.querySelectorAll('.strip'));
  const reelEls = Array.from(document.querySelectorAll('.reel'));

  const weightedPool = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
  const pickWeighted = () => weightedPool[Math.floor(Math.random() * weightedPool.length)];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function buildStrip(stripEl, finalSymbol) {
    stripEl.innerHTML = '';
    stripEl.style.transition = 'none';
    stripEl.style.transform = 'translateY(0)';

    const symbols = [];
    for (let i = 0; i < STRIP_LENGTH - 1; i++) symbols.push(pickWeighted());
    symbols.push(finalSymbol);

    for (const sym of symbols) {
      const div = document.createElement('div');
      div.className = 'sym';
      div.textContent = sym.icon;
      stripEl.appendChild(div);
    }
  }

  function renderInitial() {
    strips.forEach((strip) => {
      strip.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'sym';
      div.textContent = '❓';
      strip.appendChild(div);
    });
  }

  function updateHUD() {
    balanceEl.textContent = state.balance;
    betEl.textContent = state.bet;
    betUpBtn.disabled = state.spinning || BET_STEPS.indexOf(state.bet) === BET_STEPS.length - 1;
    betDownBtn.disabled = state.spinning || BET_STEPS.indexOf(state.bet) === 0;
    spinBtn.disabled = state.spinning || state.balance < state.bet;
    maxBtn.disabled = state.spinning;
  }

  function setMessage(text, kind = '') {
    messageEl.textContent = text;
    messageEl.className = 'message' + (kind ? ' ' + kind : '');
  }

  function evaluate(results) {
    const [a, b, c] = results;
    if (a.icon === b.icon && b.icon === c.icon) {
      return { mult: a.mult, tier: a.mult, label: a.name };
    }
    if (a.icon === b.icon || b.icon === c.icon || a.icon === c.icon) {
      return { mult: 2, tier: 2, label: 'pair' };
    }
    return { mult: 0, tier: 0, label: 'miss' };
  }

  function spin() {
    if (state.spinning || state.balance < state.bet) return;

    state.balance -= state.bet;
    state.spinning = true;
    updateHUD();
    setMessage('Spinning up GPU cluster...');

    const results = Array.from({ length: REEL_COUNT }, pickWeighted);

    reelEls.forEach(r => r.classList.remove('win'));

    strips.forEach((strip, i) => {
      buildStrip(strip, results[i]);

      requestAnimationFrame(() => {
        const symHeight = strip.firstChild.offsetHeight;
        const distance = (STRIP_LENGTH - 1) * symHeight;
        const duration = 1600 + i * 400;
        strip.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.65, 0.2, 1)`;
        strip.style.transform = `translateY(-${distance}px)`;
      });
    });

    const totalDuration = 1600 + (REEL_COUNT - 1) * 400 + 100;
    setTimeout(() => finishSpin(results), totalDuration);
  }

  function finishSpin(results) {
    const outcome = evaluate(results);
    const winnings = outcome.mult * state.bet;
    state.balance += winnings;
    payoutEl.textContent = winnings;

    if (winnings > 0) {
      const quips = WIN_QUIPS[outcome.tier] || WIN_QUIPS[2];
      setMessage(`+${winnings} tokens! ${pick(quips)}`, 'win');
      if (outcome.mult >= 5) {
        reelEls.forEach(r => r.classList.add('win'));
      }
    } else {
      setMessage(pick(LOSE_QUIPS), 'lose');
    }

    state.spinning = false;
    updateHUD();

    if (state.balance < BET_STEPS[0]) {
      setMessage(pick(BROKE_QUIPS), 'lose');
    } else if (state.balance < state.bet) {
      state.bet = BET_STEPS.slice().reverse().find(b => b <= state.balance) || BET_STEPS[0];
      updateHUD();
    }
  }

  betUpBtn.addEventListener('click', () => {
    const i = BET_STEPS.indexOf(state.bet);
    if (i < BET_STEPS.length - 1 && BET_STEPS[i + 1] <= state.balance) {
      state.bet = BET_STEPS[i + 1];
      updateHUD();
    }
  });
  betDownBtn.addEventListener('click', () => {
    const i = BET_STEPS.indexOf(state.bet);
    if (i > 0) {
      state.bet = BET_STEPS[i - 1];
      updateHUD();
    }
  });
  maxBtn.addEventListener('click', () => {
    const max = BET_STEPS.slice().reverse().find(b => b <= state.balance);
    if (max) {
      state.bet = max;
      updateHUD();
    }
  });
  spinBtn.addEventListener('click', spin);
  resetBtn.addEventListener('click', () => {
    state.balance = START_BALANCE;
    state.bet = 10;
    payoutEl.textContent = '0';
    setMessage("Fresh seed round secured. Don't spend it all in one prompt.");
    updateHUD();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !state.spinning) {
      e.preventDefault();
      spin();
    }
  });

  renderInitial();
  updateHUD();
})();
