// Board logic for Alchemist's Cascade: 8x8 gems, 6 types, specials.
// Cell: { t: 0..5 type, s: 0 none | 1 bomb flask | 2 rainbow elixir }
import { randInt } from './rng.js';
export const COLS = 8, ROWS = 8, TYPES = 6;

export function findMatches(b) {
  const hit = new Set(); const groups = [];
  for (let y = 0; y < ROWS; y++) {
    let x = 0;
    while (x < COLS) {
      const t = b[y][x]?.t; let x2 = x;
      while (x2 + 1 < COLS && b[y][x2 + 1]?.t === t) x2++;
      if (t !== undefined && x2 - x + 1 >= 3) { const g = []; for (let i = x; i <= x2; i++) { hit.add(i + ',' + y); g.push([i, y]); } groups.push(g); }
      x = x2 + 1;
    }
  }
  for (let x = 0; x < COLS; x++) {
    let y = 0;
    while (y < ROWS) {
      const t = b[y][x]?.t; let y2 = y;
      while (y2 + 1 < ROWS && b[y2 + 1][x]?.t === t) y2++;
      if (t !== undefined && y2 - y + 1 >= 3) { const g = []; for (let j = y; j <= y2; j++) { if (!hit.has(x + ',' + j)) g.push([x, j]); hit.add(x + ',' + j); } if (g.length) groups.push(g); }
      y = y2 + 1;
    }
  }
  return { hit, groups };
}
export function hasMove(b) {
  const dirs = [[1, 0], [0, 1]];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy; if (nx >= COLS || ny >= ROWS) continue;
    [b[y][x], b[ny][nx]] = [b[ny][nx], b[y][x]];
    const ok = findMatches(b).hit.size > 0;
    [b[y][x], b[ny][nx]] = [b[ny][nx], b[y][x]];
    if (ok) return true;
  }
  return false;
}
export function newBoard(rng) {
  let b;
  do {
    b = [];
    for (let y = 0; y < ROWS; y++) {
      b.push([]);
      for (let x = 0; x < COLS; x++) {
        let t;
        do { t = randInt(rng, TYPES); }
        while ((x >= 2 && b[y][x - 1].t === t && b[y][x - 2].t === t) || (y >= 2 && b[y - 1][x].t === t && b[y - 2][x].t === t));
        b[y].push({ t, s: 0 });
      }
    }
  } while (!hasMove(b));
  return b;
}
export function collapse(b, rng) {
  for (let x = 0; x < COLS; x++) {
    const stack = [];
    for (let y = ROWS - 1; y >= 0; y--) if (b[y][x]) stack.push(b[y][x]);
    for (let y = ROWS - 1; y >= 0; y--) b[y][x] = stack[ROWS - 1 - y] ?? { t: randInt(rng, TYPES), s: 0 };
  }
}
