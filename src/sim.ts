// Simulation pure (aucun DOM) : le pingouin glisse le long de la pente, x = distance, y = hauteur au-dessus de la glace.
import {
  ACCEL, BACK_MALUS, BASE_SPEED, BOOST_BONUS, BOOST_TIME, COYOTE, GRAVITY, JUMP_BUFFER, JUMP_V, MAX_BASE_SPEED,
  PENGU_H, START_X, TUCK_BONUS, U_PER_M,
} from './config';
import { makeRng, type Rng } from './rng';

export type Kind = 'rock' | 'seal' | 'hole' | 'fish' | 'pad';
export interface Obj {
  kind: Kind;
  x: number; // centre (hole : centre du trou)
  w: number; // largeur
  y: number; // fish : hauteur du centre
  taken?: boolean;
}
export type Cause = 'rock' | 'seal' | 'hole';
export interface Input {
  jump: boolean; // appui ce pas
  lean: number; // -1 (en arrière) .. 1 (en avant)
}
export type Event = 'jump' | 'fish' | 'boost' | 'land' | 'hit';

export interface Game {
  x: number;
  y: number;
  vy: number;
  speed: number;
  lean: number;
  fish: number;
  boost: number;
  buffer: number;
  coyote: number;
  grounded: boolean;
  falling: boolean;
  over: Cause | null;
  t: number;
  genX: number;
  objs: Obj[];
  rng: Rng;
  events: Event[];
}

export const distM = (x: number) => Math.floor(Math.max(0, x) / U_PER_M);
export const difficulty = (x: number) => Math.min(1, distM(x) / 1500);
export const baseSpeed = (x: number) => BASE_SPEED + (MAX_BASE_SPEED - BASE_SPEED) * Math.min(1, distM(x) / 1500);

export function newGame(seed: number): Game {
  const g: Game = {
    x: 0, y: 0, vy: 0, speed: BASE_SPEED, lean: 0, fish: 0, boost: 0, buffer: 0, coyote: 0,
    grounded: true, falling: false, over: null, t: 0, genX: START_X, objs: [], rng: makeRng(seed), events: [],
  };
  generate(g);
  return g;
}

/** Portée d'un saut au pire cas (vitesse de base + glace). */
const worstRange = (x: number) => (baseSpeed(x) + BOOST_BONUS) * ((2 * JUMP_V) / GRAVITY);

function generate(g: Game): void {
  const r = g.rng;
  while (g.genX < g.x + 1600) {
    const d = difficulty(g.x + 1600);
    const roll = r();
    let x = g.genX;
    const safe = worstRange(x) + 130 + r() * 260 * (1 - d);
    if (roll < 0.22) {
      g.objs.push({ kind: 'rock', x, w: 34, y: 0 });
      arc(g, x, 3);
      x += 20;
    } else if (roll < 0.4) {
      g.objs.push({ kind: 'seal', x, w: 56, y: 0 });
      arc(g, x, 4);
      x += 30;
    } else if (roll < 0.58) {
      const w = 80 + r() * 50;
      g.objs.push({ kind: 'hole', x, w, y: 0 });
      arc(g, x, 4);
      x += w / 2;
    } else if (roll < 0.7 && d > 0.15) {
      // paire rocher + phoque très rapprochés : un seul saut les couvre
      g.objs.push({ kind: 'rock', x, w: 34, y: 0 }, { kind: 'seal', x: x + 70, w: 56, y: 0 });
      arc(g, x + 35, 4);
      x += 100;
    } else if (roll < 0.85) {
      const n = 4 + Math.floor(r() * 4);
      const h = r() < 0.5 ? 14 : 70;
      for (let i = 0; i < n; i++) g.objs.push({ kind: 'fish', x: x + i * 46, y: h + 12, w: 22 });
      x += n * 46 - 100;
    } else {
      g.objs.push({ kind: 'pad', x: x + 40, w: 80, y: 0 });
      x += 60;
    }
    g.genX = x + safe;
  }
}

/** Poissons en arc au-dessus d'un danger : récompense le saut. */
function arc(g: Game, cx: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    g.objs.push({ kind: 'fish', x: cx + (t - 0.5) * 150, y: 18 + Math.sin(t * Math.PI) * 120, w: 22 });
  }
}

export function inHole(g: Game, x: number): Obj | null {
  for (const o of g.objs) if (o.kind === 'hole' && Math.abs(x - o.x) < o.w / 2 - 6) return o;
  return null;
}

export function step(g: Game, dt: number, inp: Input): void {
  g.events.length = 0;
  if (g.over) return;
  g.t += dt;
  g.lean += (inp.lean - g.lean) * Math.min(1, dt * 14);
  if (inp.jump) g.buffer = JUMP_BUFFER;
  else g.buffer = Math.max(0, g.buffer - dt);
  g.boost = Math.max(0, g.boost - dt);

  const target =
    baseSpeed(g.x) +
    (g.grounded ? (g.lean > 0 ? TUCK_BONUS * g.lean : BACK_MALUS * g.lean) : 0) +
    (g.boost > 0 ? BOOST_BONUS * Math.min(1, g.boost / 0.5) : 0);
  const dv = ACCEL * dt;
  g.speed += Math.max(-dv, Math.min(dv, target - g.speed));
  g.x += g.speed * dt;

  const hole = g.y <= 0 && !g.falling ? inHole(g, g.x) : null;
  if (hole) g.falling = true;
  g.coyote = g.grounded && !g.falling ? COYOTE : Math.max(0, g.coyote - dt);
  if (g.buffer > 0 && (g.grounded || g.coyote > 0) && g.vy <= 0) {
    g.vy = JUMP_V;
    g.grounded = false;
    g.coyote = 0;
    g.buffer = 0;
    g.events.push('jump');
  }
  if (!g.grounded || g.falling) {
    const k = g.falling ? 1 : inp.lean > 0.3 ? 1.45 : inp.lean < -0.3 ? 0.82 : 1;
    g.vy -= GRAVITY * k * dt;
    g.y += g.vy * dt;
    if (g.falling) {
      if (g.y < -160) {
        g.over = 'hole';
        g.events.push('hit');
      }
    } else if (g.y <= 0) {
      g.y = 0;
      g.vy = 0;
      g.grounded = true;
      g.events.push('land');
    }
  }
  if (g.falling) return;

  for (const o of g.objs) {
    const dx = Math.abs(o.x - g.x);
    if (o.kind === 'rock' || o.kind === 'seal') {
      const top = o.kind === 'rock' ? 32 : 28;
      if (dx < o.w / 2 + 10 && g.y < top - 4) {
        g.over = o.kind;
        g.events.push('hit');
        return;
      }
    } else if (o.kind === 'fish' && !o.taken) {
      if (dx < 26 && Math.abs(g.y + PENGU_H / 2 - o.y) < 28) {
        o.taken = true;
        g.fish++;
        g.events.push('fish');
      }
    } else if (o.kind === 'pad' && g.grounded && dx < o.w / 2 && g.boost < BOOST_TIME - 0.3) {
      g.boost = BOOST_TIME;
      g.events.push('boost');
    }
  }
  g.objs = g.objs.filter((o) => o.x + o.w > g.x - 600);
  generate(g);
}
