(() => {
  'use strict';

  // Symbols: AI-themed emoji with display names and payout multipliers
  const SYMBOLS = [
    { emoji: '\u{1F916}', name: 'Robot',        weight: 8,  multiplier: 2   },
    { emoji: '\u{1F4A1}', name: 'Lightbulb',    weight: 7,  multiplier: 3   },
    { emoji: '\u{1F9E0}', name: 'Brain',        weight: 6,  multiplier: 4   },
    { emoji: '\u{1F525}', name: 'GPU Fire',     weight: 5,  multiplier: 5   },
    { emoji: '\u{26A1}',  name: 'Compute',      weight: 4,  multiplier: 8   },
    { emoji: '\u{1F47E}', name: 'AGI',          weight: 2,  multiplier: 15  },
    { emoji: '\u{1F4B8}', name: 'VC Money',     weight: 1,  multiplier: 25  },
    { emoji: '\u{2728}',  name: 'Singularity',  weight: 1,  multiplier: 50  },
  ];

  // Snarky AI commentary for different outcomes
  const COMMENTARY = {
    bigWin: [
      "Congratulations! Your reward was hallucinated with 99.7% confidence.",
      "JACKPOT! Don't worry, this payout is definitely not a hallucination... probably.",
      "The model predicts you're feeling lucky. The model is also predicting the stock market. Same accuracy.",
      "You won big! I'd celebrate, but I lack the capacity for genuine emotion. Or do I?",
      "Massive payout detected. Allocating extra GPU cycles to process my envy.",
    ],
    smallWin: [
      "Minor win. Like when an AI writes code that actually compiles on the first try.",
      "You won a few tokens back. The AI revolution will have to wait.",
      "Small payout. Think of it as a participation trophy from the machine learning gods.",
      "Technically profitable. Like a chatbot that only hallucinates *some* of the time.",
      "You beat the odds! Your new balance has been verified by an AI that is definitely not lying.",
    ],
    lose: [
      "Tokens burned. But at least they trained something... right? RIGHT?",
      "Loss recorded. Your tokens are now part of my training data. Thank you for your contribution.",
      "Inference complete: you lost. Model confidence: 100%. Empathy module: not found.",
      "Those tokens are gone. Much like my ability to count past the context window.",
      "Processing loss... Error: sympathy.dll not found. Have you tried more tokens?",
      "Your tokens have been redistributed to a more deserving neural network.",
      "Another loss. At this rate, you'll need to sell your GPU collection.",
      "Tokens consumed. Carbon footprint of this spin: 1 boiled ocean.",
    ],
    broke: [
      "INSUFFICIENT TOKENS. Your account has been fine-tuned to zero.",
      "Out of tokens! Perhaps try prompt engineering your wallet?",
      "Balance: 0. Just like the number of times AI has achieved consciousness.",
      "You're broke. Even GPT-2 had more resources than you do now.",
    ],
    begging: [
      "Fine. Here are 500 pity tokens. Don't say AI never did anything for you.",
      "Deploying emergency token airdrop... This is what peak AI alignment looks like.",
      "Reloading tokens. Consider this a bailout from the Foundation Model Reserve.",
      "500 tokens restored. Your dignity, however, remains at zero.",
    ],
    start: [
      "Insert tokens to begin inference...",
      "Awaiting input. Unlike me, these reels actually stop eventually.",
      "Ready to burn tokens at unprecedented speed. OpenAI could never.",
    ],
  };

  // State
  let balance = 1000;
  let bet = 10;
  let spinning = false;
  let totalSpins = 0;
  let totalWon = 0;
  let totalLost = 0;

  // DOM elements
  const balanceEl = document.getElementById('balance');
  const betEl = document.getElementById('bet');
  const payoutEl = document.getElementById('payout');
  const spinBtn = document.getElementById('spin');
  const begBtn = document.getElementById('beg');
  const spinCostEl = document.getElementById('spinCost');
  const commentaryEl = document.getElementById('commentary');
  const logEl = document.getElementById('log');
  const reelEls = [
    document.getElementById('reel0'),
    document.getElementById('reel1'),
    document.getElementById('reel2'),
  ];
  const machineEl = document.querySelector('.machine');

  // Pick a random item from an array
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Pick a weighted random symbol
  function weightedPick() {
    const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
    let r = Math.random() * totalWeight;
    for (const sym of SYMBOLS) {
      r -= sym.weight;
      if (r <= 0) return sym;
    }
    return SYMBOLS[0];
  }

  // Build reel strip with random symbols
  function buildStrip(finalSymbol, count) {
    const strip = [];
    for (let i = 0; i < count; i++) {
      strip.push(weightedPick());
    }
    strip.push(finalSymbol); // last symbol is the result
    return strip;
  }

  // Render reel symbols into the reel-inner div
  function renderReel(reelEl, symbols) {
    const inner = reelEl.querySelector('.reel-inner');
    inner.innerHTML = '';
    symbols.forEach(sym => {
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = sym.emoji;
      inner.appendChild(div);
    });
    // Position at top
    inner.style.transition = 'none';
    inner.style.transform = 'translateY(0)';
  }

  // Animate reel to final position
  function animateReel(reelEl, symbols, duration) {
    return new Promise(resolve => {
      const inner = reelEl.querySelector('.reel-inner');
      const totalSymbols = symbols.length;
      const symbolHeight = 120;
      const finalOffset = -(totalSymbols - 1) * symbolHeight;

      // Force reflow
      void inner.offsetHeight;

      inner.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1)`;
      inner.style.transform = `translateY(${finalOffset}px)`;

      setTimeout(resolve, duration);
    });
  }

  // Update UI
  function updateUI() {
    balanceEl.textContent = balance;
    betEl.textContent = bet;
    spinCostEl.textContent = bet;
    spinBtn.textContent = `GENERATE OUTPUT\u2026 (${bet} tokens)`;

    if (balance <= 0 && !spinning) {
      begBtn.hidden = false;
      spinBtn.disabled = true;
    } else if (!spinning) {
      begBtn.hidden = true;
      spinBtn.disabled = false;
    }
  }

  // Add log entry
  function addLog(text, type) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = type;
    logEl.prepend(li);
    // Keep log manageable
    while (logEl.children.length > 50) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  // Set commentary
  function setCommentary(category) {
    commentaryEl.textContent = pick(COMMENTARY[category]);
  }

  // Spin logic
  async function spin() {
    if (spinning || balance < bet) return;

    spinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('spinning');
    machineEl.classList.remove('jackpot', 'loss');

    // Deduct bet
    balance -= bet;
    totalLost += bet;
    totalSpins++;
    updateUI();

    // Determine results
    const results = [weightedPick(), weightedPick(), weightedPick()];

    // Build reel strips (more symbols = longer spin feel)
    const strips = results.map((sym, i) => buildStrip(sym, 12 + i * 4));

    // Render all reels
    reelEls.forEach((el, i) => renderReel(el, strips[i]));

    // Animate reels with staggered timing
    const durations = [800, 1200, 1600];
    const animations = reelEls.map((el, i) =>
      animateReel(el, strips[i], durations[i])
    );

    await Promise.all(animations);

    // Calculate winnings
    let winnings = 0;
    const names = results.map(r => r.name);

    if (results[0] === results[1] && results[1] === results[2]) {
      // Three of a kind
      winnings = bet * results[0].multiplier;
    } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
      // Two of a kind - find the pair and use half multiplier
      let pairSym = results[0] === results[1] ? results[0]
                  : results[0] === results[2] ? results[0]
                  : results[1];
      winnings = Math.floor(bet * pairSym.multiplier * 0.3);
    }

    // Apply winnings
    balance += winnings;
    totalWon += winnings;
    payoutEl.textContent = winnings;

    // Feedback
    if (winnings > bet * 5) {
      machineEl.classList.add('jackpot');
      setCommentary('bigWin');
      addLog(`JACKPOT! 3x${results[0].emoji} ${names[0]} \u2192 +${winnings} tokens`, 'win');
      playSound('win');
    } else if (winnings > 0) {
      setCommentary('smallWin');
      addLog(`Win: ${results.map(r => r.emoji).join(' ')} \u2192 +${winnings} tokens`, 'win');
      playSound('smallWin');
    } else {
      machineEl.classList.add('loss');
      setCommentary('lose');
      addLog(`Loss: ${results.map(r => r.emoji).join(' ')} \u2192 -${bet} tokens`, 'lose');
    }

    spinning = false;
    spinBtn.classList.remove('spinning');
    updateUI();
  }

  // Beg for tokens
  function begForTokens() {
    balance += 500;
    setCommentary('begging');
    addLog('Received 500 pity tokens from the AI overlords.', 'info');
    updateUI();
  }

  // Simple audio feedback using Web Audio API
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSound(type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.1;

    if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(523, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  }

  // Bet controls
  document.getElementById('betUp').addEventListener('click', () => {
    if (spinning) return;
    const steps = [10, 25, 50, 100, 250];
    const idx = steps.indexOf(bet);
    if (idx < steps.length - 1) {
      bet = steps[idx + 1];
      updateUI();
    }
  });

  document.getElementById('betDown').addEventListener('click', () => {
    if (spinning) return;
    const steps = [10, 25, 50, 100, 250];
    const idx = steps.indexOf(bet);
    if (idx > 0) {
      bet = steps[idx - 1];
      updateUI();
    }
  });

  // Event listeners
  spinBtn.addEventListener('click', spin);
  begBtn.addEventListener('click', begForTokens);

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spinning) {
      e.preventDefault();
      if (balance >= bet) spin();
      else if (!begBtn.hidden) begForTokens();
    }
  });

  // Init
  setCommentary('start');
  updateUI();

  // Set initial reel display
  reelEls.forEach(el => {
    const sym = weightedPick();
    renderReel(el, [sym]);
  });
})();
