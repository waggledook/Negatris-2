let score = 0;
let lives = 3;
let correctStreak = 0;
let words = [];               // active FallingWord instances
let bucketEls = [];           // DOM .bucket elements

let lastTimestamp = null;     // for delta-time
let gameLoopId = null;        // requestAnimationFrame handle
let wordSpawner = null;



const wordToPrefix = {
    "responsible": "ir-",
    "thoughtful": "un-",
    "polite": "im-",
    "patient": "im-",
    "correct": "in-",
    "respectful": "dis-",
    "advantage": "dis-",
    "relevant": "ir-",
    "faithful": "un-",
    "perfect": "im-",
    "usual": "un-",
    "rational": "ir-",
    "loyal": "dis-",
    "like": "dis-",
    "honest": "dis-",
    "mortal": "im-",
    "possible": "im-",
    "separable": "in-",
    "resistible": "ir-",
    "comfortable": "un-",
    "happy": "un-",
    "informed": "un-",
    "helpful": "un-",
    "healthy": "un-",
    "real": "un-",
    "fair": "un-",
    "considerate": "in-",
    "agreement": "dis-",
    "thinkable": "un-",
    "legal": "il-",
    "mature": "im-",
    "literate": "il-",
    "fortunate": "un-",
    "logical": "il-",
    "moral": "im-",
    "practical": "im-",
    "safe": "un-",
    "surprising": "un-",
    "tidy": "un-",
    "regular": "ir-",
    "legitimate": "il-",
    "attractive": "un-",
    "appropriate": "in-",
    "mobile": "im-",
    "hospitable": "in-",
    "personal": "im-",
    "embark": "dis-",
    "official": "un-",
    "easy": "un-",
    "coherent": "in-",
    "continue": "dis-",
    "replaceable": "ir-",
    "capable": "in-",
    "do": "un-",
    "competent": "in-"
  };




// show the start screen overlay
function showStartScreen() {
  const wrapper = document.getElementById('game-wrapper');
  const overlay = document.createElement('div');
  overlay.id = 'start-screen';
  overlay.innerHTML = `
    <h1>Negatris</h1>
    <section id="high-scores">
      <h2>High Scores</h2>
      ${getHighScoresHTML()}
    </section>
    <button id="start-btn">Start Game</button>
  `;
  wrapper.appendChild(overlay);

  document.getElementById('start-btn').addEventListener('click', () => {
    wrapper.removeChild(overlay);
    startGame();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadHighScores();
  updateTopScoreDisplay();
  showStartScreen();
});

  function flashBucket(prefix, correct) {
    const bucket = bucketEls.find(b => b.dataset.prefix === prefix);
    if (!bucket) return;
    const cls = correct ? 'correct' : 'incorrect';
    bucket.classList.add(cls);
    setTimeout(() => bucket.classList.remove(cls), 300);
  }

// ——————————————————————————
// 1) Utility: pick a random word
// ——————————————————————————
function getRandomWord() {
  const keys = Object.keys(wordToPrefix);
  return keys[Math.floor(Math.random() * keys.length)];
}

// ——————————————————————————
// 2) Track active words, and grab your bucket elements
// ——————————————————————————


// High‐score persistence
const HIGH_SCORE_KEY = 'negatrisHighScores';
let highScores = [];

// Load from localStorage (or initialize empty)
function loadHighScores() {
  const stored = localStorage.getItem(HIGH_SCORE_KEY);
  highScores = stored ? JSON.parse(stored) : [];
}

// Write back to localStorage
function saveHighScores() {
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
}

// Insert the latest score, sort desc, keep top 5
function recordHighScore(score) {
  highScores.push(score);
  highScores.sort((a, b) => b - a);
  highScores.length = Math.min(highScores.length, 5);
  saveHighScores();
}

// Render as an ordered list (or a placeholder if empty)
function getHighScoresHTML() {
  if (highScores.length === 0) {
    return '<p>No high scores yet.</p>';
  }
  return (
    '<ol>' +
    highScores.map((s) => `<li>${s}</li>`).join('') +
    '</ol>'
  );
}


function gameLoop(timestamp) {
  // first call: stash the timestamp and return without moving anything
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    gameLoopId = requestAnimationFrame(gameLoop);
    return;
  }

  // check for game over
  if (lives <= 0) {
    return gameOver();
  }

  // compute delta‐time in seconds
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  // clear & draw
  ctx.clearRect(0, 0, gameWidth, gameHeight);
  words.forEach(w => {
    w.update(dt);
    w.draw();
  });

  // prune inactive
  words = words.filter(w => w.isActive);

  // schedule next frame
  gameLoopId = requestAnimationFrame(gameLoop);
}

function spawnFallingWord() {
    const text = getRandomWord();
    const fontSize = Math.round(gameHeight * 0.06);
    ctx.font = `${fontSize}px sans-serif`;
    const wordWidth = ctx.measureText(text).width + fontSize * 0.4;
  
    // Only spawn where the word fully fits in game area
    const x = Math.random() * Math.max(0, gameWidth - wordWidth);
  
    const baseSpeed = gameHeight * 0.004;
    const speed = baseSpeed * (1 + score * 0.005);
    words.push(new FallingWord(text, x, speed, ctx, bucketEls));
  }

  function handleResult(correct, wordText, chosenPrefix) {
    // 1) bucket flash
    flashBucket(chosenPrefix, correct);
  
    // 2) word effect
    const inst = words.find(w => w.text === wordText && !w._flashed);
    if (inst) {
      animateWordEffect(inst, correct);
      inst._flashed = true;
    }
  
    // 3) particle burst on correct
    if (correct) {
      const bucket = bucketEls.find(b => b.dataset.prefix === chosenPrefix);
      if (bucket) {
        const bRect = bucket.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        const x = (bRect.left + bRect.right)/2 - cRect.left;
        const y = bRect.top - cRect.top + 10;
        launchParticles(x, y);
      }
    }
  
    // 4) score, lives, and extra‐life streak
    if (correct) {
      score += 10;
  
      // streak logic
      correctStreak = (correctStreak || 0) + 1;
      if (correctStreak >= 5) {
        correctStreak = 0;
        lives += 1;
        updateLivesDisplay();
        showExtraLifeGraphic();
      }
    } else {
      lives -= 1;
      correctStreak = 0;
    }
  
    // 5) update displays
    updateScoreDisplay();
    updateLivesDisplay();
  }

function launchParticles(x, y) {
    const particles = [];
    for (let i = 0; i < 15; i++) {
      particles.push({ x, y, vx:(Math.random()-0.5)*4, vy:-Math.random()*3, alpha:1 });
    }
    function draw() {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.alpha -= 0.02;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#8aff8a';
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;
      if (particles.some(p => p.alpha > 0)) requestAnimationFrame(draw);
    }
    draw();
  }
  

  function animateWordEffect(wordInstance, correct) {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    const div  = document.createElement('div');
    div.className = 'word-effect ' + (correct ? 'correct' : 'incorrect');
    div.textContent = wordInstance.text;
    // position it over the falling word
    div.style.left = rect.left + wordInstance.x + 'px';
    div.style.top  = rect.top  + wordInstance.y + 'px';
    div.style.fontSize = wordInstance.fontSize + 'px'; // <-- set font size
    document.body.appendChild(div);
  
    // clean up after animation
    div.addEventListener('animationend', () => div.remove());
  }

  function updateLivesDisplay() {
    document.getElementById('lives').textContent = lives;
  }

  // ← Insert it right after those:
function updateTopScoreDisplay() {
  // show the highest score (or 0 if none yet)
  document.getElementById('top-score').textContent = highScores[0] || 0;
}
  
  function showExtraLifeGraphic() {
    const wrapper = document.getElementById('game-wrapper');
    const badge   = document.createElement('div');
    badge.id      = 'extra-life';
    badge.textContent = '❤️ +1 life!';
    wrapper.appendChild(badge);
    setTimeout(() => {
      wrapper.removeChild(badge);
    }, 1200);
  }

function gameOver() {
  recordHighScore(score);
  // cancel the animation frame
  if (gameLoopId) cancelAnimationFrame(gameLoopId);

  // build the overlay
  const wrapper = document.getElementById('game-wrapper');
  const overlay = document.createElement('div');
  overlay.id = 'game-over';
  overlay.innerHTML = `
    <h1>Game Over</h1>
    <p>Your score: <strong>${score}</strong></p>
    <section id="high-scores-end">
      <h2>Top Scores</h2>
      ${getHighScoresHTML()}
    </section>
    <button id="restart-btn">Play Again</button>
  `;
  wrapper.appendChild(overlay);

  // restart handler
  document.getElementById('restart-btn').addEventListener('click', () => {
    wrapper.removeChild(overlay);
    // reset game state
    score = 0;
    lives = 3;
    correctStreak = 0;
    words = [];
    updateScoreDisplay();
    updateLivesDisplay();
    // restart loop
    gameLoopId = requestAnimationFrame(gameLoop);
  });
}
// --- FallingWord class ---
class FallingWord {
  constructor(text, x, speed, ctx, buckets) {
    this.text    = text;
    this.x       = x;
    this.y       = -gameHeight * 0.08; // start just above the top
    this.speed   = speed;                     // in pixels per second
    this.ctx     = ctx;
    this.buckets = buckets;
    this.isActive = true;

    // ① Compute fontSize & word dimensions
    this.fontSize = Math.round(gameHeight * 0.06); // 6% of height
    ctx.font      = `${this.fontSize}px sans-serif`;
    this.width    = ctx.measureText(text).width + this.fontSize * 0.4;
    this.height   = this.fontSize + 6; 

    // Track whether we've flashed this word yet
    this._flashed = false;
  }

  /** 
   * @param {number} dt  elapsed seconds since last frame 
   */
  update(dt) {
    if (!this.isActive) return;

    // ② Move down by speed * dt
    this.y += this.speed * dt * 60;   // treats speed as “px per frame at 60fps”

    // ③ When the bottom of the word hits the bucket line
    if (this.y + this.height >= gameHeight) {
      this.checkBucketCollision();
      this.isActive = false;
    }
  }

  draw() {
    if (!this.isActive) return;
    const { ctx, text, x, y, fontSize } = this;
    ctx.save();
    ctx.font          = `${fontSize}px sans-serif`;
    ctx.fillStyle     = '#00FFFF';
    ctx.textBaseline  = 'top';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  
    checkBucketCollision() {
        // 1) center of the word in your logical canvas coords
        const wordCenterX = this.x + this.width / 2;
      
        // 2) how many buckets do we have?
        const bucketCount = this.buckets.length;
      
        // 3) each bucket’s zone width in logical pixels
        const zoneWidth = gameWidth / bucketCount;
      
        // 4) pick the index [0…bucketCount-1]
        let idx = Math.floor(wordCenterX / zoneWidth);
        idx = Math.max(0, Math.min(bucketCount - 1, idx));
      
        // 5) test prefix
        const chosenPrefix = this.buckets[idx].dataset.prefix;
        const correct      = wordToPrefix[this.text] === chosenPrefix;
        handleResult(correct, this.text, chosenPrefix);
      }
    }
      
// Dynamically inject CSS
const styles = `
/* ensure the page itself is dark and flush to the viewport */
html, body {
  margin: 0;
  padding: 0;
  background: #111 !important;
  /* allow content below the fold so status-bar shows */
  overflow: auto;
}
  /* --- Game wrapper and container --- */
  #game-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  /* min-height: 100vh; <-- REMOVE THIS LINE */
  background: #111;
  position: relative;
  overflow: visible;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 0;
}
#game-container {
  width: 100vw;
  max-width: 100vw;
  aspect-ratio: 10/9; /* Or something similar: width:height */
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.8);
  border-radius: 1rem;
  overflow: hidden;
}
canvas#game-canvas {
  flex: 1 1 auto;
  width: 100vw;              /* Always fills viewport width */
  max-width: 100vw;          /* Never wider than viewport */
  height: auto;              /* Height will be controlled by aspect-ratio or container */
  background: #111;
  border-radius: 0.5rem 0.5rem 0 0;
  display: block;            /* Removes unwanted inline gaps */
  touch-action: none;        /* Ensures smooth mobile touch input */
}
/* replace your existing .buckets + .bucket blocks with: */
.buckets {
  display: flex;
  width: 100%;           /* span 100% of the #game-container */
  margin: 0;             /* no extra gutters at the ends */
  padding: 0;            /* nothing inside the row */
  gap: 0.25rem;          /* <— you can tweak this smaller if you still see overflow */
  background: rgba(0,0,0,0.8);
  box-sizing: border-box;
}
.bucket {
  flex: 1;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  /* dynamic font sizing and lowercase */
  font-size: calc(0.8 * var(--bucket-height));
  font-weight: bold;
  text-transform: lowercase;
  font-family: 'Segoe UI', sans-serif;

  /* subtler two-tone gradient */
  background: linear-gradient(135deg,
    #4ade80 0%,   /* soft green */
    #339af0 100%  /* sky blue */
  );

  color: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.bucket:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* mobile arrow controls container: always float just below the buckets */
#controls {
  width: 100%;
  display: flex;
  justify-content: space-between;    /* <--- Key line: pushes buttons to the sides */
  align-items: center;
  margin-top: 2.5rem;
  margin-bottom: 0.5rem;
  padding: 0 1.5rem;                 /* <--- Horizontal padding/margin for comfort */
  box-sizing: border-box;
}

#controls button {
  width: 3.5rem;                /* bigger hit area */
  height: 3.5rem;
  font-size: 2.2rem;            /* bigger arrow */
  border-radius: 50%;
  background: linear-gradient(135deg, #72e0ff 40%, #2196f3 100%);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: manipulation;
  box-shadow: 0 4px 16px #2196f355;
  transition: transform 0.08s, box-shadow 0.08s, background 0.18s;
}

  /* ─── Bucket pop & flash ─── */
  @keyframes bucket-pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes bucket-flash {
    0%,100% { filter: none; }
    50%     { filter: brightness(2); }
  }
  .bucket.correct {
    animation: bucket-pop 0.3s ease-out, bucket-flash 0.3s ease-in-out;
  }
  .bucket.incorrect {
    animation: bucket-pop 0.3s ease-out, bucket-flash 0.3s ease-in-out;
    filter: hue-rotate(90deg);
  }

  /* ─── Word pop/fade & shake ─── */
  @keyframes word-pop {
    0%   { transform: scale(1); opacity: 1; }
    50%  { transform: scale(1.4); opacity: 0.7; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes word-shake {
    0%   { transform: translateX(0); }
    25%  { transform: translateX(-5px); }
    75%  { transform: translateX(5px); }
    100% { transform: translateX(0); }
  }
  .word-effect.correct {
    animation: word-pop 0.5s ease-out forwards;
    position: absolute;
    pointer-events: none;
    font: 20px sans-serif;
    color: #0f0;
  }
  .word-effect.incorrect {
    animation: word-shake 0.4s ease-in-out;
    position: absolute;
    pointer-events: none;
    font: 20px sans-serif;
    color: #f00;
  }

#status-bar {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 200;
  white-space: nowrap;
}
button,
.buckets .bucket {
  touch-action: manipulation;
  -ms-touch-action: manipulation;
}
#controls button:active {
  transform: scale(0.93);
  box-shadow: 0 2px 6px #2196f344;
  background: linear-gradient(135deg, #2196f3 60%, #72e0ff 100%);
}
#controls button:hover {
  background: linear-gradient(135deg, #a6e1fa 0%, #1e90ff 100%);
  color: #ffff99;
}
#controls button {
  border: 2.5px solid #fff4;
}
#extra-life {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  padding: 0.5rem 1rem;
  background: #4ade80;
  color: #111;
  font-size: 1.5rem;
  font-weight: 700;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  opacity: 0;
  animation: popLife 1.2s ease-out forwards;
  z-index: 300;
}

@keyframes popLife {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1);   opacity: 0; }
}
/* ─── Game Over Overlay ─── */
#game-over {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  z-index: 500;
}
#game-over h1 {
  margin: 0 0 1rem;
  font-size: 2.5rem;
}
#game-over p {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
}
#game-over button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  background: #339af0;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
#game-over button:hover {
  background: #1c7ed6;
}
/* ─── Start Screen Overlay ─── */
#start-screen {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  z-index: 500;
}
#start-screen h1 {
  margin: 0 0 1rem;
  font-size: 2.5rem;
}
#start-screen button {
  padding: 0.75rem 1.5rem;
  font-size: 1.25rem;
  font-weight: bold;
  background: #4ade80;
  color: #111;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
#start-screen button:hover {
  background: #34d399;
}
`;


const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Create HTML structure
document.body.innerHTML = `
  <div id="game-wrapper">
    <div id="game-container">
      <canvas id="game-canvas"></canvas>
      <div class="buckets" id="canvas-buckets">
        <div class="bucket" data-prefix="un-">un-</div>
        <div class="bucket" data-prefix="in-">in-</div>
        <div class="bucket" data-prefix="im-">im-</div>
        <div class="bucket" data-prefix="il-">il-</div>
        <div class="bucket" data-prefix="ir-">ir-</div>
        <div class="bucket" data-prefix="dis-">dis-</div>
      </div>
    </div>
    <div id="controls">
      <button id="left-btn">◀</button>
      <button id="right-btn">▶</button>
    </div>
    <div id="status-bar" style="display:flex; justify-content:space-between; margin:10px 0;">
      <span>Score: <span id="score">0</span></span>
      <span>Top:   <span id="top-score">0</span></span>
      <span>Lives: <span id="lives">3</span></span>
    </div>
  </div>
`;

// 1.3 — Canvas references
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let gameWidth, gameHeight;    // updated in resizeCanvas()

window.focus();

// Get references
const buckets = Array.from(document.querySelectorAll('.bucket')).map(el => ({
  prefix: el.dataset.prefix,
  el,
  x: 0,
  width: 0
}));
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');


leftBtn.addEventListener('click',  () => moveWord(-1));
rightBtn.addEventListener('click', () => moveWord( 1));
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
    e.preventDefault();
    moveWord(-1);
  }
  if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
    e.preventDefault();
    moveWord(1);
  }
});


function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;

    // Grab the wrapper and container
    const wrapper   = document.getElementById('game-wrapper');
    const container = document.getElementById('game-container');

    // Determine desired width/height (fill screen, minus a bit for safe area)
    const availableWidth  = window.innerWidth;
    const availableHeight = window.innerHeight * 0.85; // leave 15% for controls/status

    // Maintain a 4:3 ratio
    let width  = availableWidth;
    let height = width * 0.75;
    if (height > availableHeight) {
      height = availableHeight;
      width  = height * (4/3);
    }

    // Compute bucketHeight (12% of canvas height)
    const bucketHeight = Math.round(height * 0.12);

    // Optionally expose it as a CSS var if you still need it
    wrapper.style.setProperty('--bucket-height', `${bucketHeight}px`);

    // Size the #game-container (canvas + buckets)
    container.style.width  = `${width}px`;
    container.style.height = `${height + bucketHeight}px`;

    // Set the buckets DIV height
    const bucketsDiv = document.getElementById('canvas-buckets');
    if (bucketsDiv) {
      bucketsDiv.style.height = `${bucketHeight}px`;
    }

    // Size and scale the canvas
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width  = Math.floor(width  * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Update your internal game dimensions
    gameWidth  = width;
    gameHeight = height;
}

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function moveWord(dx) {
    // Nothing to do if no words
    if (!words.length) return;
  
    // Find the active (lowest) falling word
    let activeWord = null;
    let maxY = -Infinity;
    for (let w of words) {
      if (w.isActive && w.y > maxY) {
        maxY = w.y;
        activeWord = w;
      }
    }
    if (!activeWord) return;
  
    // Step size proportional to word width or gameWidth
    const step = Math.round(gameWidth * 0.09); // 9% of game width
    activeWord.x += dx * step;
  
    // seamless horizontal wrap (preserves any overshoot)
    const total = gameWidth + activeWord.width;
    activeWord.x = ((activeWord.x + activeWord.width) % total + total) % total - activeWord.width;
  }
  
  let touchStartX = null;
  canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  });
  canvas.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - touchStartX;
    if (dx > 30) moveWord(1);
    if (dx < -30) moveWord(-1);
    touchStartX = e.touches[0].clientX;
  });
  



function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    updateTopScoreDisplay();
  }

  function initGame() {
    // 1) Kill any existing word spawner!
    if (wordSpawner) clearInterval(wordSpawner);

    // 2) Grab your buckets now that they're in the DOM
    bucketEls = Array.from(document.querySelectorAll('.bucket'));
  
    // 3) Initialize HUD
    score = 0;
    lives = 3;
    updateScoreDisplay();
  
    // 4) Size the canvas container
    resizeCanvas();
}


function startGame() {
  // clear any previous interval
  if (wordSpawner) clearInterval(wordSpawner);

  // reset game state
  score = 0;
  lives = 3;
  words = [];
  bucketEls = Array.from(document.querySelectorAll('.bucket'));
  updateScoreDisplay();
  updateLivesDisplay();

  // reset the frame timer
  lastTimestamp = null;

  // optional: spawn a word immediately so they're not staring at blank
  spawnFallingWord();

  // then every 2s (or whatever your cadence is)
  wordSpawner = setInterval(spawnFallingWord, 2000);

  // kick off the loop properly
  gameLoopId = requestAnimationFrame(gameLoop);
}
  
