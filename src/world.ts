import { rng } from './rng';

export type Kind = 'seal' | 'berg' | 'puddle';

export interface Obstacle {
  kind: Kind;
  /** Début et fin de l'obstacle sur l'axe x. */
  x0: number;
  x1: number;
  /** Hauteur du sommet (phoque, iceberg) ; 0 pour une flaque. */
  h: number;
  /** Pour les phoques : instant du dernier rebond (animation). */
  squash: number;
  hit: boolean;
}

export interface Fish {
  x: number;
  y: number;
  gold: boolean;
  taken: boolean;
}

export const SEAL_W = 140;
export const SEAL_H = 36;
export const BERG_RISE = 150;
export const BERG_TOP = 40;
export const BERG_H = 84;
export const PUDDLE_W = 120;

export interface World {
  items: Obstacle[];
  fish: Fish[];
  genX: number;
  rand: () => number;
}

export function newWorld(seed: number): World {
  return { items: [], fish: [], genX: 0, rand: rng(seed) };
}

function arc(w: World, from: number, to: number, base: number, peak: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    w.fish.push({ x: from + (to - from) * u, y: base + Math.sin(u * Math.PI) * peak, gold: false, taken: false });
  }
}

/** Génère la piste jusqu'à `limit` (ajoute des obstacles et des poissons, jamais en arrière). */
export function generate(w: World, limit: number): void {
  while (w.genX < limit) {
    const first = w.items.length === 0;
    const d = w.genX / 1000;
    const gap = first ? 520 : 170 + w.rand() * 170 + Math.min(d * 30, 100);
    const start = w.genX === 0 ? 0 : w.genX;
    const r = w.rand();
    let kind: Kind = 'seal';
    if (!first) {
      if (w.genX > 1500 && r > 0.88) kind = 'puddle';
      else if (w.genX > 900 && r > 0.6) kind = 'berg';
    }
    const cx = start + gap;
    let o: Obstacle;
    if (kind === 'seal') {
      o = { kind, x0: cx - SEAL_W / 2, x1: cx + SEAL_W / 2, h: SEAL_H, squash: -9, hit: false };
    } else if (kind === 'berg') {
      o = { kind, x0: cx - BERG_RISE, x1: cx + BERG_TOP, h: BERG_H, squash: -9, hit: false };
    } else {
      o = { kind, x0: cx - PUDDLE_W / 2, x1: cx + PUDDLE_W / 2, h: 0, squash: -9, hit: false };
    }
    // poissons : un arc dans l'air entre l'obstacle précédent et celui-ci, des poissons au sol avant une flaque
    const prevEnd = w.items.length ? w.items[w.items.length - 1].x1 : 120;
    const a = prevEnd + 50;
    const b = o.x0 - 30;
    if (b - a > 80) {
      if (kind === 'puddle') arc(w, a + 30, b - 30, 24, 0, 4);
      else arc(w, a, b, 70 + w.rand() * 40, 70 + w.rand() * 70, 5 + Math.floor(w.rand() * 3));
    }
    if (kind !== 'puddle' && w.rand() > 0.72) {
      w.fish.push({ x: (o.x0 + o.x1) / 2, y: o.h + 260 + w.rand() * 60, gold: true, taken: false });
    }
    w.items.push(o);
    w.genX = o.x1;
  }
  w.fish.sort((p, q) => p.x - q.x);
}

/** L'obstacle qui couvre x, s'il y en a un (recherche dichotomique, la liste est triée et sans chevauchement). */
export function obstacleAt(w: World, x: number): Obstacle | null {
  let lo = 0;
  let hi = w.items.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const o = w.items[mid];
    if (x < o.x0) hi = mid - 1;
    else if (x > o.x1) lo = mid + 1;
    else return o;
  }
  return null;
}

/** Hauteur de la surface en x, et sa pente. */
export function surface(w: World, x: number): { h: number; slope: number; o: Obstacle | null } {
  const o = obstacleAt(w, x);
  if (!o || o.kind === 'puddle') return { h: 0, slope: 0, o };
  if (o.kind === 'seal') {
    const u = (x - (o.x0 + o.x1) / 2) / ((o.x1 - o.x0) / 2);
    return { h: o.h * Math.sqrt(Math.max(0, 1 - u * u)), slope: 0, o };
  }
  if (x < o.x0 + BERG_RISE) return { h: ((x - o.x0) / BERG_RISE) * o.h, slope: o.h / BERG_RISE, o };
  return { h: o.h, slope: 0, o };
}
