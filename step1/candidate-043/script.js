(() => {
  const SYMBOLS = [
    { emoji: '\u{1F916}', name: 'AI Overlord', multiplier: 10 },
    { emoji: '\u{1F4B0}', name: 'VC Funding', multiplier: 8 },
    { emoji: '\u26A1',    name: 'GPU Meltdown', multiplier: 6 },
    { emoji: '\u{1F4C8}', name: 'Stonks', multiplier: 5 },
    { emoji: '\u{1F680}', name: 'To The Moon', multiplier: 4 },
    { emoji: '\u{1F984}', name: 'Unicorn Startup', multiplier: 3 },
  ];

  const WIN_MESSAGES = [
    'The model hallucinated in your favor!',
    'You passed the Turing test of luck!',
    'AGI achieved... in your wallet!',
    'Training complete. Result: PROFIT.',
    'Your prompt returned GOLD.',
    'The neural net likes you today.',
    'Backpropagation of wealth!',
  ];

  const LOSE_MESSAGES = [
    'Tokens burned. Just like a real API call.',
    'Your inference was... incorrect.',
    'Model collapsed. Tokens lost.',
    'That prompt cost you. Try fine-tuning your luck.',
    'Hallucination detected: you thought you\'d win.',
    'Out of context window. Out of tokens.',
    'The AI giveth, the AI taketh away.',
    'Error 402: Payment required.',
    'Loss function working as intended.',
    'Rate limited by bad luck.',
    'Your request was rejected by the model.',
    'Garbage in, garbage out.',
  ];

  const BROKE_MESSAGES = [
    'You\'ve been deprecated. No tokens remain.',
    'Token limit exceeded. Session terminated.',
    'Bankrupt. Just like that AI startup.',
    'You\'ve reached the free tier limit of luck.',
  ];

  const BET_STEPS = [5, 10, 25, 50];

  let tokens = 100;
  let betIndex = 1;
  let spinning = false;

  const tokenCountEl = document.getElementById('token-count');
  const betAmountEl = document.getElementById('bet-amount');
  const spinBtn = document.getElementById('spin-btn');
  const messageEl = document.getElementById('message');
  const reelEls = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
  ];

  function getBet() {
    return BET_STEPS[betIndex];
  }

  function updateDisplay() {
    tokenCountEl.textContent = tokens;
    betAmountEl.textContent = getBet();
    spinBtn.disabled = spinning || tokens <= 0;
    if (tokens <= 0) {
      spinBtn.textContent = 'OUT OF TOKENS';
    } else {
      spinBtn.textContent = 'PROMPT THE MACHINE';
    }
  }

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'spin') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'land') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'lose') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Web Audio not available
    }
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
  }

  async function spinReels() {
    const results = [randomSymbol(), randomSymbol(), randomSymbol()];

    // Cycle through random symbols rapidly for each reel
    const spinDurations = [800, 1100, 1400];

    const promises = reelEls.map((reel, i) => {
      return new Promise((resolve) => {
        reel.classList.add('spinning');
        reel.classList.remove('landed');

        const interval = setInterval(() => {
          reel.querySelector('.symbol').textContent = randomSymbol().emoji;
        }, 80);

        setTimeout(() => {
          clearInterval(interval);
          reel.querySelector('.symbol').textContent = results[i].emoji;
          reel.classList.remove('spinning');
          reel.classList.add('landed');
          playSound('land');
          resolve();
        }, spinDurations[i]);
      });
    });

    await Promise.all(promises);
    return results;
  }

  function evaluateResults(results) {
    const bet = getBet();
    const [a, b, c] = results;

    if (a.name === b.name && b.name === c.name) {
      // Triple match
      const winnings = bet * a.multiplier;
      tokens += winnings;
      playSound('win');
      showMessage(`${a.name}! +${winnings} tokens! ${pick(WIN_MESSAGES)}`, 'win');
    } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
      // Pair match
      const winnings = bet * 2;
      tokens += winnings;
      playSound('win');
      showMessage(`Pair! +${winnings} tokens. ${pick(WIN_MESSAGES)}`, 'win');
    } else {
      // No match
      playSound('lose');
      showMessage(pick(LOSE_MESSAGES), 'lose');
    }

    if (tokens <= 0) {
      tokens = 0;
      showMessage(pick(BROKE_MESSAGES), 'broke');
    }
  }

  async function spin() {
    if (spinning || tokens <= 0) return;

    const bet = getBet();
    if (bet > tokens) {
      showMessage('Not enough tokens! Lower your bet.', 'broke');
      return;
    }

    spinning = true;
    tokens -= bet;
    updateDisplay();
    showMessage('Generating response...', '');
    playSound('spin');

    const results = await spinReels();
    evaluateResults(results);

    spinning = false;
    updateDisplay();
  }

  document.getElementById('bet-up').addEventListener('click', () => {
    if (betIndex < BET_STEPS.length - 1) {
      betIndex++;
      updateDisplay();
    }
  });

  document.getElementById('bet-down').addEventListener('click', () => {
    if (betIndex > 0) {
      betIndex--;
      updateDisplay();
    }
  });

  spinBtn.addEventListener('click', spin);

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      spin();
    }
  });

  updateDisplay();
})();
