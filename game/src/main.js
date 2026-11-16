// Alchemist's Cascade — potion match-3 in a cozy night workshop.
// Swap adjacent gems, match 3+, burst them into the cauldron, chain cascades.
// ?shot=title|play|feature|end&seed=N stages a deterministic scene and sets window.__shotReady.
import { createRandom, randInt } from './rng.js';
import { COLS, ROWS, TYPES, findMatches, hasMove, newBoard, collapse } from './board.js';

const W = 1280, H = 800;
const CELL = 60, GAP = 4, STEP = CELL + GAP;
const BX = 250, BY = 168; // board origin
const TARGET = 1500, MAXMOVES = 30;
const COLORS = [
  { name: 'herb', main: '#37d353', dark: '#147a2e', light: '#a7f3b8' },
  { name: 'crystal', main: '#22c8e5', dark: '#0e6e8c', light: '#b3f0ff' },
  { name: 'mushroom', main: '#ef4444', dark: '#991b1b', light: '#fecaca' },
  { name: 'flame', main: '#f97316', dark: '#9a3412', light: '#fed7aa' },
  { name: 'droplet', main: '#3b82f6', dark: '#1e3a8a', light: '#bfdbfe' },
  { name: 'star vial', main: '#a855f7', dark: '#6b21a8', light: '#e9d5ff' },
];
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seedParam = parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 12345;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
let viewW = W, viewH = H;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  viewW = innerWidth; viewH = innerHeight;
}
addEventListener('resize', resize); resize();

const S = {
  screen: 'title', board: null, rng: createRandom(seed),
  score: 0, moves: MAXMOVES, combo: 0, comboTimer: 0,
  selected: null, cursor: { x: 3, y: 4 }, particles: [], floats: [],
  busy: false, message: '', brewGlow: 0, time: 0, endKind: 'win',
};
function reset(seedVal) {
  S.rng = createRandom(seedVal);
  S.board = newBoard(S.rng);
  S.score = 0; S.moves = MAXMOVES; S.combo = 0; S.selected = null;
  S.particles = []; S.floats = []; S.busy = false; S.message = ''; S.endKind = 'win';
}
reset(seed);

// ---------- particles ----------
function burst(x, y, color, n = 14, spread = 3) {
  for (let i = 0; i < n; i++) {
    const a = S.rng() * Math.PI * 2, v = 0.6 + S.rng() * spread;
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, decay: 0.014 + S.rng() * 0.02, r: 2 + S.rng() * 4, color });
  }
}
function updateParticles() {
  for (const p of S.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= p.decay; }
  S.particles = S.particles.filter(p => p.life > 0);
  for (const f of S.floats) { f.y -= 0.7; f.life -= 0.012; }
  S.floats = S.floats.filter(f => f.life > 0);
}

// ---------- game flow ----------
function cellCenter(x, y) { return [BX + x * STEP + CELL / 2, BY + y * STEP + CELL / 2]; }
async function resolveBoard(firstSwap) {
  S.busy = true; let cascade = 0;
  while (true) {
    const { hit, groups } = findMatches(S.board);
    if (hit.size === 0) break;
    cascade++; S.combo = cascade; S.comboTimer = 140;
    // specials created
    let spawnAt = firstSwap && cascade === 1 ? firstSwap : null;
    const toClear = new Set(hit);
    for (const g of groups) {
      if (g.length >= 5 && spawnAt) { /* rainbow placed after clear */ }
    }
    // bomb / rainbow effects
    for (const key of [...toClear]) {
      const [x, y] = key.split(',').map(Number); const c = S.board[y][x];
      if (!c) continue;
      if (c.s === 1) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) toClear.add(nx + ',' + ny); }
      if (c.s === 2) for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) if (S.board[yy][xx]?.t === c.t) toClear.add(xx + ',' + yy);
    }
    let gained = 0;
    for (const key of toClear) {
      const [x, y] = key.split(',').map(Number); const c = S.board[y][x]; if (!c) continue;
      const [cx, cy] = cellCenter(x, y);
      burst(cx, cy, COLORS[c.t].main, 10, 2.6); burst(cx, cy, COLORS[c.t].light, 5, 1.6);
      gained += 10 * cascade; S.board[y][x] = null;
    }
    // create special from longest group
    let best = null; for (const g of groups) if (!best || g.length > best.length) best = g;
    S.score += gained; S.brewGlow = 1;
    S.floats.push({ x: BX + 240, y: BY + 200, text: `+${gained}`, life: 1, color: '#ffd166', size: 30 });
    if (cascade > 1) S.floats.push({ x: BX + 240, y: BY + 150, text: `COMBO x${cascade}`, life: 1, color: '#ff9ff3', size: 36 });
    draw(); await wait(260);
    collapse(S.board, S.rng);
    if (best && best.length >= 4 && spawnAt) {
      const [sx, sy] = spawnAt;
      if (S.board[sy][sx]) S.board[sy][sx].s = best.length >= 5 ? 2 : 1;
    }
    firstSwap = null;
    draw(); await wait(180);
  }
  S.busy = false;
  if (S.score >= TARGET) { S.screen = 'end'; S.endKind = 'win'; announce('Brew complete! You win. Press R to play again.'); }
  else if (S.moves <= 0) { S.screen = 'end'; S.endKind = 'lose'; announce('Out of moves. Press R to try again.'); }
  else if (!hasMove(S.board)) { S.message = 'No moves left — the board reshuffles!'; S.board = newBoard(S.rng); setTimeout(() => S.message = '', 2200); }
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function trySwap(a, b) {
  if (S.busy || S.screen !== 'play') return;
  [S.board[a.y][a.x], S.board[b.y][b.x]] = [S.board[b.y][b.x], S.board[a.y][a.x]];
  if (findMatches(S.board).hit.size === 0) {
    [S.board[a.y][a.x], S.board[b.y][b.x]] = [S.board[b.y][b.x], S.board[a.y][a.x]];
    S.selected = b; return;
  }
  S.moves--; S.selected = null;
  resolveBoard([b.x, b.y]);
}
function announce(m) { status.textContent = m; }

// ---------- input ----------
function toCell(e) {
  const r = canvas.getBoundingClientRect();
  const sx = W / r.width, sy = H / r.height;
  const mx = (e.clientX - r.left) * sx, my = (e.clientY - r.top) * sy;
  const x = Math.floor((mx - BX) / STEP), y = Math.floor((my - BY) / STEP);
  return (x >= 0 && y >= 0 && x < COLS && y < ROWS) ? { x, y } : null;
}
let dragStart = null;
canvas.addEventListener('pointerdown', e => {
  if (S.screen === 'title') { S.screen = 'play'; announce('Swap gems to match three.'); return; }
  if (S.screen === 'end') { reset((Math.random() * 1e9) | 0); S.screen = 'play'; return; }
  const c = toCell(e); dragStart = c;
  if (!c) return;
  if (S.selected && Math.abs(S.selected.x - c.x) + Math.abs(S.selected.y - c.y) === 1) { trySwap(S.selected, c); }
  else S.selected = c;
  S.cursor = c;
});
canvas.addEventListener('pointermove', e => {
  if (!dragStart || S.busy) return;
  const c = toCell(e); if (!c || (c.x === dragStart.x && c.y === dragStart.y)) return;
  if (Math.abs(c.x - dragStart.x) + Math.abs(c.y - dragStart.y) === 1) { trySwap(dragStart, c); dragStart = null; }
});
addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') { reset((Math.random() * 1e9) | 0); S.screen = 'play'; return; }
  if (S.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) { S.screen = 'play'; return; }
  if (S.screen === 'end' && (e.key === 'Enter' || e.key === ' ')) { reset((Math.random() * 1e9) | 0); S.screen = 'play'; return; }
  if (S.screen !== 'play') return;
  const k = e.key;
  if (k.startsWith('Arrow')) {
    e.preventDefault();
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    S.cursor.x = Math.max(0, Math.min(COLS - 1, S.cursor.x + d[0]));
    S.cursor.y = Math.max(0, Math.min(ROWS - 1, S.cursor.y + d[1]));
  } else if (k === 'Enter' || k === ' ') {
    e.preventDefault();
    if (S.selected && Math.abs(S.selected.x - S.cursor.x) + Math.abs(S.selected.y - S.cursor.y) === 1) trySwap(S.selected, { ...S.cursor });
    else S.selected = { ...S.cursor };
  }
});

// ---------- rendering ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b1a10'); g.addColorStop(0.6, '#1d110a'); g.addColorStop(1, '#120906');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // wood planks
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 86) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  // shelves with bottles (left + top-right areas)
  drawShelf(28, 150, 190); drawShelf(28, 330, 190); drawShelf(28, 510, 190);
  drawShelf(830, 96, 400);
  // candles
  drawCandle(96, 640); drawCandle(160, 652); drawCandle(1180, 640);
  // warm candle glow
  const glow = ctx.createRadialGradient(640, 400, 60, 640, 400, 760);
  glow.addColorStop(0, 'rgba(255,170,60,0.14)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // floor
  ctx.fillStyle = '#241207'; ctx.fillRect(0, 716, W, 84);
  ctx.strokeStyle = 'rgba(255,190,90,0.15)'; ctx.beginPath(); ctx.moveTo(0, 716); ctx.lineTo(W, 716); ctx.stroke();
}
function drawShelf(x, y, w) {
  const rngB = createRandom(x * 31 + y);
  ctx.fillStyle = '#4a2c14'; rr(x - 8, y + 52, w + 16, 12, 4); ctx.fill();
  ctx.fillStyle = '#5d3a1c'; rr(x - 8, y + 52, w + 16, 5, 3); ctx.fill();
  let bx = x;
  while (bx < x + w - 26) {
    const bw = 18 + rngB() * 14, bh = 32 + rngB() * 20;
    const col = COLORS[randInt(rngB, 6)];
    ctx.fillStyle = col.dark; rr(bx, y + 52 - bh, bw, bh, 6); ctx.fill();
    ctx.fillStyle = col.main; rr(bx + 3, y + 55 - bh, bw - 6, bh - 10, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; rr(bx + bw * 0.62, y + 48 - bh, 4, bh - 18, 2); ctx.fill();
    ctx.fillStyle = '#c9a06a'; ctx.fillRect(bx + bw / 2 - 4, y + 48 - bh, 8, 6);
    bx += bw + 8 + rngB() * 10;
  }
}
function drawCandle(x, y) {
  const fl = 3 + Math.sin(S.time * 0.11 + x) * 1.6;
  ctx.fillStyle = '#e8dcc0'; rr(x - 7, y, 14, 44, 4); ctx.fill();
  const fg = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 30 + fl);
  fg.addColorStop(0, 'rgba(255,220,120,0.95)'); fg.addColorStop(0.35, 'rgba(255,150,40,0.55)'); fg.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y - 14, 30 + fl, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffdf7e'; ctx.beginPath(); ctx.ellipse(x, y - 12, 5, 9 + fl, 0, 0, 7); ctx.fill();
}
function drawGem(cx, cy, cell, scale = 1) {
  const { t, s } = cell; const c = COLORS[t]; const R = 24 * scale;
  ctx.save(); ctx.translate(cx, cy);
  // flask body glow
  ctx.shadowColor = c.main; ctx.shadowBlur = 12;
  const body = ctx.createRadialGradient(-8, -10, 4, 0, 0, R + 4);
  body.addColorStop(0, c.light); body.addColorStop(0.45, c.main); body.addColorStop(1, c.dark);
  ctx.fillStyle = body;
  if (t === 0) { // herb leaf
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(R, -R * 0.4, 0, R); ctx.quadraticCurveTo(-R, -R * 0.4, 0, -R); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = c.dark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -R + 5); ctx.lineTo(0, R - 5); ctx.stroke();
  } else if (t === 1) { // crystal diamond
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(R * 0.85, -R * 0.25); ctx.lineTo(0, R); ctx.lineTo(-R * 0.85, -R * 0.25); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.moveTo(-R * 0.85, -R * 0.25); ctx.lineTo(R * 0.85, -R * 0.25); ctx.stroke();
  } else if (t === 2) { // mushroom
    ctx.beginPath(); ctx.arc(0, -4, R, Math.PI, 0); ctx.quadraticCurveTo(R * 0.4, 6, R * 0.35, 10); ctx.lineTo(-R * 0.35, 10); ctx.quadraticCurveTo(-R * 0.4, 6, -R, -4); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#f7ead2'; rr(-6, 9, 12, 11, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [[-11, -13, 4.5], [7, -18, 3.6], [13, -8, 3]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.fill(); }
  } else if (t === 3) { // flame
    ctx.beginPath(); ctx.moveTo(0, -R - 2); ctx.quadraticCurveTo(R * 0.9, R * 0.25, R * 0.45, R * 0.7); ctx.quadraticCurveTo(0, R + 4, -R * 0.45, R * 0.7); ctx.quadraticCurveTo(-R * 0.9, R * 0.25, 0, -R - 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(10, 8, 0, 17); ctx.quadraticCurveTo(-10, 8, 0, -6); ctx.fill();
  } else if (t === 4) { // droplet
    ctx.beginPath(); ctx.moveTo(0, -R - 2); ctx.quadraticCurveTo(R * 0.95, R * 0.35, R * 0.55, R * 0.72); ctx.quadraticCurveTo(0, R + 5, -R * 0.55, R * 0.72); ctx.quadraticCurveTo(-R * 0.95, R * 0.35, 0, -R - 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-8, 4, 5, 9, 0.4, 0, 7); ctx.fill();
  } else { // star vial
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? R * 0.48 : R; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-6, -8, 4, 0, 7); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(-9, -13, 8, 5, -0.6, 0, 7); ctx.fill();
  if (s === 1) { // bomb flask ring
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('💣', 0, -R - 6);
  } else if (s === 2) { // rainbow elixir ring
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, 7);
    ctx.strokeStyle = `hsl(${(S.time * 4) % 360} 90% 65%)`; ctx.stroke();
    ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🌈', 0, -R - 6);
  }
  ctx.restore();
}
function drawBoard() {
  // board frame: wooden table + parchment inset
  ctx.fillStyle = '#3a2110'; rr(BX - 18, BY - 18, COLS * STEP + 14, ROWS * STEP + 14, 16); ctx.fill();
  ctx.fillStyle = '#170d06'; rr(BX - 10, BY - 10, COLS * STEP - 2, ROWS * STEP - 2, 12); ctx.fill();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = BX + x * STEP, py = BY + y * STEP;
    ctx.fillStyle = (x + y) % 2 ? 'rgba(255,205,120,0.07)' : 'rgba(255,205,120,0.13)';
    rr(px, py, CELL, CELL, 10); ctx.fill();
    const cell = S.board[y][x]; if (!cell) continue;
    const [cx, cy] = cellCenter(x, y);
    drawGem(cx, cy, cell);
    if (S.selected && S.selected.x === x && S.selected.y === y) {
      ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 4; ctx.shadowColor = '#ffe66d'; ctx.shadowBlur = 16;
      rr(px + 2, py + 2, CELL - 4, CELL - 4, 10); ctx.stroke(); ctx.shadowBlur = 0;
    }
    if (S.screen === 'play' && S.cursor.x === x && S.cursor.y === y) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; rr(px + 5, py + 5, CELL - 10, CELL - 10, 8); ctx.stroke();
    }
  }
}
function drawCauldron() {
  const cx = 972, cy = 560; const fill = Math.min(1, S.score / TARGET);
  // side table
  ctx.fillStyle = '#4a2c14'; rr(838, 636, 268, 14, 5); ctx.fill(); ctx.fillRect(856, 650, 14, 66); ctx.fillRect(1074, 650, 14, 66);
  // brew glow under pot
  const bg = ctx.createRadialGradient(cx, cy + 60, 8, cx, cy + 60, 120);
  bg.addColorStop(0, 'rgba(255,120,30,0.75)'); bg.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy + 60, 120, 0, 7); ctx.fill();
  // fire
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i % 2 ? '#f97316' : '#fbbf24';
    const fh = 22 + Math.sin(S.time * 0.2 + i * 1.7) * 6;
    ctx.beginPath(); ctx.ellipse(cx + i * 24, cy + 66 - fh / 3, 13, fh, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#5b3413'; rr(cx - 78, cy + 58, 156, 14, 7); ctx.fill(); // logs bar
  // pot body
  const pot = ctx.createRadialGradient(cx - 30, cy - 30, 16, cx, cy, 105);
  pot.addColorStop(0, '#5a5f6e'); pot.addColorStop(0.5, '#2c2f38'); pot.addColorStop(1, '#101116');
  ctx.fillStyle = pot; ctx.beginPath(); ctx.arc(cx, cy, 96, 0, 7); ctx.fill();
  ctx.fillStyle = '#17181d'; ctx.beginPath(); ctx.ellipse(cx, cy - 78, 84, 22, 0, 0, 7); ctx.fill();
  // brew surface — color mixes toward rainbow as it fills
  const hue = 95 + fill * 180 + Math.sin(S.time * 0.05) * 12;
  ctx.fillStyle = `hsl(${hue} 85% ${52 + S.brewGlow * 12}%)`;
  ctx.beginPath(); ctx.ellipse(cx, cy - 78, 74, 17, 0, 0, 7); ctx.fill();
  // bubbles
  const rngB = createRandom(99);
  for (let i = 0; i < 9; i++) {
    const bx = cx - 58 + rngB() * 116, by = cy - 84 + rngB() * 10, br = 3 + rngB() * 6;
    const bob = Math.sin(S.time * 0.09 + i * 2.1) * 3;
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(bx, by + bob, br, 0, 7); ctx.fill();
  }
  if (S.brewGlow > 0.4) { // bubbling over in feature/win moments
    ctx.fillStyle = `hsla(${hue} 90% 65% / 0.85)`;
    for (let i = 0; i < 5; i++) { const bx = cx - 70 + i * 34; ctx.beginPath(); ctx.arc(bx, cy - 58 + Math.sin(S.time * 0.12 + i) * 4, 10 - (i % 3) * 2, 0, 7); ctx.fill(); }
  }
  // brew meter (right of cauldron)
  const mx = 1096, my = 300, mh = 250;
  ctx.fillStyle = '#170d06'; rr(mx, my, 30, mh, 14); ctx.fill();
  ctx.strokeStyle = '#8a6a3b'; ctx.lineWidth = 2.5; rr(mx, my, 30, mh, 14); ctx.stroke();
  const fh2 = mh * fill;
  const mg = ctx.createLinearGradient(0, my + mh, 0, my);
  mg.addColorStop(0, '#37d353'); mg.addColorStop(0.6, '#a855f7'); mg.addColorStop(1, '#ffd166');
  ctx.fillStyle = mg; if (fh2 > 4) { rr(mx + 4, my + mh - fh2 + 4, 22, fh2 - 6, 10); ctx.fill(); }
  ctx.fillStyle = '#ffe9b8'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('BREW', mx + 15, my - 12);
  ctx.font = 'bold 16px system-ui'; ctx.fillText(`${Math.round(fill * 100)}%`, mx + 15, my + mh + 24);
}
function drawHUD() {
  ctx.fillStyle = 'rgba(16,8,3,0.82)'; rr(232, 26, 816, 104, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,90,0.4)'; ctx.lineWidth = 2; rr(232, 26, 816, 104, 16); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd166';
  ctx.font = '900 34px system-ui'; ctx.fillText("ALCHEMIST'S CASCADE", 256, 66);
  ctx.font = '600 17px system-ui'; ctx.fillStyle = '#ffe9b8';
  ctx.fillText(`Score  ${S.score} / ${TARGET}`, 256, 102);
  ctx.fillText(`Moves  ${S.moves}`, 520, 102);
  if (S.combo > 1 && S.comboTimer > 0) { ctx.fillStyle = '#ff9ff3'; ctx.font = '900 22px system-ui'; ctx.fillText(`COMBO x${S.combo}`, 660, 102); }
  ctx.fillStyle = '#ffe9b8'; ctx.font = '600 17px system-ui';
  ctx.fillText('Match 4 = 💣 bomb flask · Match 5 = 🌈 rainbow', 730, 66);
  if (S.message) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center'; ctx.fillText(S.message, 640, 152); }
}
function drawParticles() {
  for (const p of S.particles) {
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of S.floats) {
    ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.color;
    ctx.font = `900 ${f.size}px system-ui`; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5; ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function panel(title, sub, lines, accent, dim = true) {
  if (dim) { ctx.fillStyle = 'rgba(10,5,2,0.62)'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = '#241207'; rr(330, 218, 620, 330, 22); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 3; rr(330, 218, 620, 330, 22); ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = accent; ctx.font = '900 52px system-ui';
  ctx.fillText(title, 640, 308);
  ctx.fillStyle = '#ffe9b8'; ctx.font = '700 24px system-ui'; ctx.fillText(sub, 640, 352);
  ctx.font = '600 20px system-ui'; let y = 402;
  for (const l of lines) { ctx.fillText(l, 640, y); y += 34; }
}
function draw() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  S.time++;
  drawBackground(); drawBoard(); drawCauldron(); drawHUD(); drawParticles();
  if (S.comboTimer > 0) S.comboTimer--;
  if (S.screen === 'title') panel("ALCHEMIST'S CASCADE", 'A potion match-3 — brew the great elixir!',
    ['Click a gem, then a neighbour — or drag — to swap.', 'Match 3+ to burst ingredients into the cauldron.', 'Cascades multiply your combo. Reach 1,500 in 30 moves!', 'Keys: arrows + Enter to swap · R restarts', 'Click anywhere to start brewing'], '#ffd166', false);
  if (S.screen === 'end' && S.endKind === 'win') panel('BREW COMPLETE!', `The great elixir is ready — score ${S.score}!`,
    [`Target ${TARGET} reached with ${S.moves} moves to spare.`, 'The cauldron bubbles over with rainbow brew.', 'Press R or click to brew again'], '#7CFC9A');
  if (S.screen === 'end' && S.endKind === 'lose') panel('THE BREW FIZZLED…', `Out of moves at ${S.score} / ${TARGET}.`,
    ['So close — the cauldron cools and the candles dim.', 'Chain cascades and bomb flasks to score faster.', 'Press R or click to try again'], '#fca5a5');
}

// ---------- staged screenshots ----------
function stageShot(name) {
  reset(seed);
  if (name === 'title') { S.screen = 'title'; S.score = 0; }
  if (name === 'play') {
    S.screen = 'play'; S.score = 620; S.moves = 21; S.combo = 2; S.comboTimer = 999;
    S.selected = { x: 3, y: 4 }; S.cursor = { x: 3, y: 4 };
    S.board[2][5].s = 1;
    const [cx, cy] = cellCenter(5, 1); burst(cx, cy, COLORS[S.board[1][5].t].main, 8, 1.6);
    S.floats.push({ x: BX + 240, y: BY + 130, text: 'COMBO x2', life: 1, color: '#ff9ff3', size: 34 });
  }
  if (name === 'feature') {
    S.screen = 'play'; S.score = 1180; S.moves = 12; S.combo = 4; S.comboTimer = 0; S.brewGlow = 1;
    S.board[6][1].s = 1; S.board[5][6].s = 2;
    // mid-cascade: clear a cluster visually + dense particles
    for (const [x, y] of [[3, 3], [4, 3], [5, 3], [4, 2], [4, 4]]) {
      const [cx, cy] = cellCenter(x, y); const t = S.board[y][x].t;
      burst(cx, cy, COLORS[t].main, 22, 3.6); burst(cx, cy, COLORS[t].light, 10, 2.2); burst(cx, cy, '#ffffff', 5, 1.6);
      S.board[y][x] = null;
    }
    S.floats.push({ x: 640, y: 160, text: '✦ CASCADE COMBO x4 ✦', life: 1, color: '#ffd166', size: 40 });
    S.floats.push({ x: BX + 240, y: BY + 110, text: '+480', life: 1, color: '#7CFC9A', size: 34 });
  }
  if (name === 'end') {
    S.screen = 'end'; S.endKind = 'win'; S.score = 1740; S.moves = 6; S.brewGlow = 1;
    const rngC = createRandom(seed + 7);
    for (let i = 0; i < 60; i++) S.particles.push({ x: 200 + rngC() * 880, y: 120 + rngC() * 300, vx: (rngC() - 0.5) * 1.4, vy: 0.4 + rngC(), life: 1, decay: 0.004, r: 2.5 + rngC() * 3.5, color: COLORS[randInt(rngC, 6)].main });
  }
  // step particles a few frames so bursts are mid-flight, deterministically
  for (let i = 0; i < 7; i++) updateParticles();
  draw(); draw();
}
if (shot) { stageShot(shot); requestAnimationFrame(() => { draw(); window.__shotReady = true; }); }
else {
  (function loop() { updateParticles(); S.brewGlow = Math.max(0, S.brewGlow - 0.01); draw(); requestAnimationFrame(loop); })();
  announce("Alchemist's Cascade. Click to start, swap gems to match three or more.");
}
