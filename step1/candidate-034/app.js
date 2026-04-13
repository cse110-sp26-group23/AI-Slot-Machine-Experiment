(function () {
  'use strict';

  // --- Symbols & payouts ---
  const SYMBOLS = [
    { emoji: '🤖', name: 'Robot',        weight: 8 },
    { emoji: '🧠', name: 'Brain',        weight: 7 },
    { emoji: '💬', name: 'Chatbot',      weight: 7 },
    { emoji: '🔥', name: 'GPU Fire',     weight: 5 },
    { emoji: '📉', name: 'Stonks Down',  weight: 5 },
    { emoji: '💸', name: 'Money Wings',  weight: 4 },
    { emoji: '✨', name: 'Hallucination', weight: 3 },
    { emoji: '🦾', name: 'Singularity',  weight: 2 },
  ];

  // Three-of-a-kind multipliers (index into SYMBOLS)
  const TRIPLE_MULTIPLIER = [3, 4, 4, 6, 6, 8, 12, 25];
  // Two-of-a-kind pays 1.5× bet for any match
  const PAIR_MULTIPLIER = 1.5;

  const AI_JOKES = {
    win: [
      "The AI has decided to be generous… for now.",
      "Congratulations! Your prompt was well-engineered.",
      "The model predicts you'll lose it all next spin.",
      "Tokens acquired! (Not tax advice.)",
      "Even a hallucinating AI gets it right sometimes.",
      "Your context window is looking profitable!",
    ],
    lose: [
      "Your tokens have been used for training data.",
      "Prompt rejected. Tokens burned.",
      "The AI thanks you for your donation.",
      "Error 402: Insufficient luck.",
      "Your request exceeded the token budget.",
      "Those tokens are in a better place now (OpenAI's servers).",
      "Rate limited by bad luck.",
      "The AI giveth, the AI taketh away.",
    ],
    jackpot: [
      "🚨 ALIGNMENT ACHIEVED! Maximum token payout! 🚨",
      "🚨 AGI UNLOCKED! The tokens are yours! 🚨",
      "🚨 SINGULARITY BONUS! You broke the model! 🚨",
    ],
    broke: [
      "Context window exhausted. No more tokens remain.",
      "Model collapsed. You've been fine-tuned into poverty.",
      "All tokens hallucinated away. Game over.",
    ],
  };

  // --- State ---
  let tokens = 1000;
  let bet = 100;
  let spinning = false;

  // --- DOM refs ---
  const tokenCountEl = document.getElementById('token-count');
  const betAmountEl = document.getElementById('bet-amount');
  const spinBtn = document.getElementById('spin-btn');
  const messageEl = document.getElementById('message');
  const historyList = document.getElementById('history-list');
  const reels = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
  ];

  // --- Weighted random pick ---
  function weightedPick() {
    const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= SYMBOLS[i].weight;
      if (r <= 0) return i;
    }
    return SYMBOLS.length - 1;
  }

  function randomJoke(category) {
    const arr = AI_JOKES[category];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Build reel strip ---
  function buildReelStrip(reel, count) {
    reel.innerHTML = '';
    const indices = [];
    for (let i = 0; i < count; i++) {
      const idx = weightedPick();
      indices.push(idx);
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = SYMBOLS[idx].emoji;
      reel.appendChild(div);
    }
    return indices;
  }

  // --- Animate a single reel ---
  function animateReel(reel, finalIdx, duration) {
    return new Promise((resolve) => {
      const totalSymbols = 20 + Math.floor(Math.random() * 10);
      const indices = buildReelStrip(reel, totalSymbols);

      // Set the last symbol to our desired result
      const lastDiv = reel.children[totalSymbols - 1];
      lastDiv.textContent = SYMBOLS[finalIdx].emoji;
      indices[totalSymbols - 1] = finalIdx;

      const symbolHeight = 120;
      const totalDistance = (totalSymbols - 1) * symbolHeight;

      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0)';

      // Force reflow
      reel.offsetHeight;

      reel.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.8, 0.3, 1)`;
      reel.style.transform = `translateY(-${totalDistance}px)`;

      setTimeout(resolve, duration);
    });
  }

  // --- Evaluate result ---
  function evaluate(results) {
    const [a, b, c] = results;

    // Three of a kind
    if (a === b && b === c) {
      const multiplier = TRIPLE_MULTIPLIER[a];
      const winnings = bet * multiplier;
      const isJackpot = multiplier >= 12;
      return {
        type: isJackpot ? 'jackpot' : 'win',
        winnings,
        label: `${SYMBOLS[a].name} x3 → ${multiplier}× (${winnings > 0 ? '+' : ''}${winnings} tokens)`,
      };
    }

    // Two of a kind
    if (a === b || b === c || a === c) {
      const winnings = Math.floor(bet * PAIR_MULTIPLIER);
      const matchSym = a === b ? a : (b === c ? b : a);
      return {
        type: 'win',
        winnings,
        label: `${SYMBOLS[matchSym].name} pair → ${PAIR_MULTIPLIER}× (${winnings > 0 ? '+' : ''}${winnings} tokens)`,
      };
    }

    // No match
    return {
      type: 'lose',
      winnings: 0,
      label: `No match (−${bet} tokens)`,
    };
  }

  // --- Spin ---
  async function spin() {
    if (spinning) return;
    if (tokens <= 0) {
      messageEl.textContent = randomJoke('broke');
      messageEl.className = 'message lose';
      document.querySelector('.machine').classList.add('shake');
      setTimeout(() => document.querySelector('.machine').classList.remove('shake'), 500);
      return;
    }

    if (bet > tokens) bet = tokens;
    updateBetDisplay();

    spinning = true;
    spinBtn.disabled = true;
    messageEl.textContent = '⏳ Processing prompt...';
    messageEl.className = 'message';

    // Deduct bet
    tokens -= bet;
    updateTokenDisplay();

    // Generate results
    const results = [weightedPick(), weightedPick(), weightedPick()];

    // Animate reels with staggered timing
    await Promise.all([
      animateReel(reels[0], results[0], 800),
      animateReel(reels[1], results[1], 1100),
      animateReel(reels[2], results[2], 1400),
    ]);

    // Evaluate
    const outcome = evaluate(results);
    tokens += outcome.winnings;
    updateTokenDisplay();

    // Show message
    if (outcome.type === 'jackpot') {
      messageEl.textContent = randomJoke('jackpot');
      messageEl.className = 'message jackpot';
    } else if (outcome.type === 'win') {
      messageEl.textContent = randomJoke('win');
      messageEl.className = 'message win';
    } else {
      messageEl.textContent = randomJoke('lose');
      messageEl.className = 'message lose';
    }

    // Add to history
    addHistory(outcome);

    // Check if broke
    if (tokens <= 0) {
      tokens = 0;
      updateTokenDisplay();
      spinBtn.textContent = 'OUT OF TOKENS 💀';
      spinBtn.classList.add('broke');
    }

    spinning = false;
    spinBtn.disabled = false;
  }

  // --- UI helpers ---
  function updateTokenDisplay() {
    tokenCountEl.textContent = tokens.toLocaleString();
  }

  function updateBetDisplay() {
    betAmountEl.textContent = bet;
  }

  function addHistory(outcome) {
    const li = document.createElement('li');
    li.textContent = outcome.label;
    li.className = outcome.type === 'lose' ? 'lose-entry' : 'win-entry';
    historyList.prepend(li);

    // Keep last 50 entries
    while (historyList.children.length > 50) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  // --- Bet adjustment ---
  document.querySelectorAll('.bet-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (spinning) return;
      const delta = parseInt(btn.dataset.delta, 10);
      bet = Math.max(10, Math.min(tokens, bet + delta));
      updateBetDisplay();
    });
  });

  // --- Spin handler ---
  spinBtn.addEventListener('click', spin);

  // --- Keyboard: spacebar to spin ---
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      spin();
    }
  });

  // --- Init reels with random symbols ---
  reels.forEach((reel) => buildReelStrip(reel, 1));
})();
