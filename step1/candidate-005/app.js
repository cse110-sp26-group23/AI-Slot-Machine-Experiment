'use strict';

// ── Symbols ────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🧠', name: 'brain',      weight: 1  },
  { emoji: '💀', name: 'skull',      weight: 2  },
  { emoji: '🤖', name: 'robot',      weight: 4  },
  { emoji: '📎', name: 'paperclip',  weight: 5  },
  { emoji: '🔥', name: 'fire',       weight: 7  },
  { emoji: '💰', name: 'money',      weight: 10 },
  { emoji: '⚡', name: 'bolt',       weight: 12 },
  { emoji: '🎲', name: 'dice',       weight: 15 },
  { emoji: '💬', name: 'bubble',     weight: 20 },
  { emoji: '🐦', name: 'bird',       weight: 20 },
];

const PAYOUTS = {
  brain:     500, skull: 200, robot: 100, paperclip: 75,
  fire:       50, money:  30, bolt:   20, dice:       15,
};

// Build weighted pool
const POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// Win messages by combo
const WIN_MSGS = {
  brain:      ['🧠 AGI achieved! Deploy to prod immediately!', '🧠 Sentience unlocked. Board meeting cancelled.'],
  skull:      ['💀 Model deprecated. Pour one out.', '💀 End-of-life token jackpot! (Support ends Dec 31)'],
  robot:      ['🤖 Fully autonomous! No humans needed!', '🤖 Alignment solved! (Citation needed)'],
  paperclip:  ['📎 Paperclip maximizer online. Universe: 0 paperclips: ♾️', '📎 Clippy is back and angrier than ever'],
  fire:       ['🔥 GPU meltdown! But make money 🔥', '🔥 Training run ignited. Insurance claim filed.'],
  money:      ['💰 VC funding secured! Pivot to AI immediately!', '💰 Series B closed! Now build something.'],
  bolt:       ['⚡ Sub-millisecond response! (Context window: 0)', '⚡ Fast tokens! Slow thoughts!'],
  dice:       ['🎲 Stochastic parrot jackpot!', '🎲 Randomly correct answer achieved!'],
  any3:       ['Pattern matched across all heads! (Attention: 100%)', 'Three tokens aligned. Model converged!'],
  any2:       ['Partial attention activated.', 'Two heads agreed. Third dissents.'],
  lose:       [
    'No pattern detected. Inject more data.',
    'Hallucination: you almost won.',
    'Model confidently wrong.',
    'Token budget exceeded. Output truncated—',
    'Rate limited. Try again in 429ms.',
    'Context window full. Forgetting everything.',
    'Insufficient prompt engineering.',
    'Garbage in, garbage out. Try clearer instructions.',
    'Training loss: your tokens. Validation loss: also yours.',
    'The model is thinking... (It will never stop thinking)',
  ],
};

// ── State ──────────────────────────────────────────────────────────────────
let balance  = 500;
let winnings = 0;
let spins    = 0;
let bet      = 10;
let spinning = false;
let lightTimer;

// ── DOM refs ───────────────────────────────────────────────────────────────
const balanceEl   = document.getElementById('balance');
const winningsEl  = document.getElementById('winnings');
const spinsEl     = document.getElementById('spins');
const betDisplay  = document.getElementById('bet-display');
const spinBtn     = document.getElementById('spin-btn');
const msgBox      = document.getElementById('message-box');
const msgText     = document.getElementById('message-text');
const winLine     = document.getElementById('win-line');
const toastEl     = document.getElementById('toast');
const machine     = document.querySelector('.machine');
const lightsEl    = document.getElementById('lights');

// ── Init lights ────────────────────────────────────────────────────────────
const NUM_LIGHTS = 18;
for (let i = 0; i < NUM_LIGHTS; i++) {
  const d = document.createElement('div');
  d.className = 'light';
  lightsEl.appendChild(d);
}

function animateLights(active = true) {
  clearInterval(lightTimer);
  const lights = lightsEl.querySelectorAll('.light');
  if (!active) { lights.forEach(l => l.classList.remove('on')); return; }
  let i = 0;
  lightTimer = setInterval(() => {
    lights.forEach((l, idx) => l.classList.toggle('on', idx === i % NUM_LIGHTS || idx === (i + 6) % NUM_LIGHTS || idx === (i + 12) % NUM_LIGHTS));
    i++;
  }, 120);
}

// ── Build reels ────────────────────────────────────────────────────────────
const REEL_COUNT  = 3;
const VISIBLE     = 1;   // centre symbol shown through window
const STRIP_SIZE  = 30;  // symbols per infinite strip

const reelData = Array.from({ length: REEL_COUNT }, () =>
  Array.from({ length: STRIP_SIZE }, () => POOL[Math.floor(Math.random() * POOL.length)])
);

// Track current top index (float, in symbol units)
const reelPos = [0, 0, 0];

function buildStrip(reelIdx) {
  const inner = document.getElementById(`reel-inner${reelIdx}`);
  inner.innerHTML = '';
  reelData[reelIdx].forEach(sym => {
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = sym.emoji;
    inner.appendChild(div);
  });
}

for (let i = 0; i < REEL_COUNT; i++) buildStrip(i);

function setReelPos(reelIdx, pos) {
  const inner = document.getElementById(`reel-inner${reelIdx}`);
  // wrap pos within strip
  const wrapped = ((pos % STRIP_SIZE) + STRIP_SIZE) % STRIP_SIZE;
  inner.style.transform = `translateY(${-wrapped * 120}px)`;
}

// ── Weighted random pick ───────────────────────────────────────────────────
function pickSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

// ── Spin animation ─────────────────────────────────────────────────────────
function spinReel(reelIdx, targetSymbol, delay, duration) {
  return new Promise(resolve => {
    setTimeout(() => {
      const SYMBOL_H = 120;
      const start    = performance.now();
      const startPos = reelPos[reelIdx];

      // How many full rotations + land on target
      const targetIdx = reelData[reelIdx].findIndex(s => s.name === targetSymbol.name)
                     ?? Math.floor(Math.random() * STRIP_SIZE);
      const fullRotations = 3 + reelIdx; // stagger stop
      const endPos = startPos + fullRotations * STRIP_SIZE + targetIdx;

      function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease: fast start, slow end
        const eased = progress < 0.7
          ? progress / 0.7
          : 1 - Math.pow((progress - 0.7) / 0.3, 2) * 0.15;

        const pos = startPos + (endPos - startPos) * eased;
        reelPos[reelIdx] = pos;
        setReelPos(reelIdx, pos);

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          reelPos[reelIdx] = endPos;
          setReelPos(reelIdx, endPos);
          resolve();
        }
      }

      requestAnimationFrame(tick);
    }, delay);
  });
}

// ── Evaluate result ────────────────────────────────────────────────────────
function evaluate(results) {
  const names = results.map(r => r.name);
  // All three match
  if (names[0] === names[1] && names[1] === names[2]) {
    const mult = PAYOUTS[names[0]] ?? 10;
    const msg  = pick(WIN_MSGS[names[0]] ?? WIN_MSGS.any3);
    return { win: true, mult, type: 'triple', msg };
  }
  // Two match
  if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
    return { win: true, mult: 2, type: 'pair', msg: pick(WIN_MSGS.any2) };
  }
  return { win: false, mult: 0, type: 'none', msg: pick(WIN_MSGS.lose) };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── UI updates ─────────────────────────────────────────────────────────────
function bumpEl(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function updateHUD() {
  balanceEl.textContent  = balance;
  winningsEl.textContent = winnings;
  spinsEl.textContent    = spins;
}

function showMessage(text, type = '') {
  msgBox.className = 'message-box ' + type;
  msgText.textContent = text;
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function updateBetUI() {
  betDisplay.textContent = bet;
  spinBtn.disabled = balance < bet || spinning;
}

// ── Core spin logic ────────────────────────────────────────────────────────
async function doSpin() {
  if (spinning || balance < bet) return;
  spinning = true;
  spinBtn.disabled = true;
  winLine.classList.remove('visible');
  msgBox.className = 'message-box';

  balance -= bet;
  spins++;
  updateHUD();
  bumpEl(balanceEl);

  animateLights(true);

  // Determine final symbols
  const results = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Run reels with staggered stops
  const durations = [1400, 1800, 2200];
  const delays    = [0, 200, 400];

  await Promise.all(results.map((sym, i) =>
    spinReel(i, sym, delays[i], durations[i])
  ));

  animateLights(false);

  // Evaluate
  const outcome = evaluate(results);

  if (outcome.win) {
    const payout = bet * outcome.mult;
    balance  += payout;
    winnings += payout;
    bumpEl(balanceEl);
    bumpEl(winningsEl);
    winLine.classList.add('visible');
    showMessage(`${outcome.msg}  (+${payout} tokens, ${outcome.mult}× multiplier)`, 'win');
    if (outcome.mult >= 50) {
      machine.classList.add('jackpot');
      setTimeout(() => machine.classList.remove('jackpot'), 1200);
      toast('🚨 JACKPOT! TOKENS INCOMING!');
    } else {
      toast(`+${payout} tokens!`);
    }
  } else {
    showMessage(outcome.msg, 'lose');
    toast('No tokens for you.');
  }

  if (balance <= 0) {
    balance = 0;
    showMessage('💸 Balance depleted. Model context cleared. Prompt: "give me more tokens"', 'lose');
    setTimeout(() => {
      balance = 100;
      updateHUD();
      toast('🤖 Emergency tokens injected. (This is not financial advice)');
    }, 2000);
  }

  updateHUD();
  spinning = false;
  updateBetUI();
}

// ── Bet controls ───────────────────────────────────────────────────────────
const BET_STEPS = [5, 10, 25, 50, 100, 200];

document.getElementById('bet-down').addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(bet);
  if (idx > 0) bet = BET_STEPS[idx - 1];
  updateBetUI();
});

document.getElementById('bet-up').addEventListener('click', () => {
  const idx = BET_STEPS.indexOf(bet);
  if (idx < BET_STEPS.length - 1) bet = BET_STEPS[idx + 1];
  updateBetUI();
});

document.getElementById('max-bet-btn').addEventListener('click', () => {
  bet = BET_STEPS.filter(b => b <= balance).at(-1) ?? BET_STEPS[0];
  updateBetUI();
});

spinBtn.addEventListener('click', doSpin);

// Spacebar to spin
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !spinning) { e.preventDefault(); doSpin(); }
});

// ── Boot ───────────────────────────────────────────────────────────────────
for (let i = 0; i < REEL_COUNT; i++) setReelPos(i, 0);
updateHUD();
updateBetUI();
animateLights(false);
