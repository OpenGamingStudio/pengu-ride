import { ANCHOR_Y, GRAVITY, LATE_WINDOW, MAX_TIME, PERFECT_WINDOW, STEP } from './config';
import { generate, newWorld, surface, type World } from './world';
import type { UpgradeId } from './shop';

export type Phase = 'aim' | 'fly' | 'over';
export type Ev =
  | { type: 'launch' }
  | { type: 'bounce'; kind: 'seal' | 'berg' | 'ice'; perfect: boolean; x: number; y: number; combo: number }
  | { type: 'late'; x: number; y: number }
  | { type: 'fish'; gold: boolean; x: number; y: number }
  | { type: 'splash'; x: number; y: number }
  | { type: 'over'; reason: EndReason };

/** Pourquoi la partie s'arrête : plus d'élan, bloqué (iceberg, micro-rebonds), flaque, temps écoulé. */
export type EndReason = 'stop' | 'stuck' | 'splash' | 'time';

export interface Sim {
  phase: Phase;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  t: number;
  world: World;
  up: Record<UpgradeId, number>;
  fish: number;
  gold: number;
  bounces: number;
  perfects: number;
  /** Rebonds parfaits d'affilée (retombe à 0 sur un rebond raté). */
  combo: number;
  /** Détection d'enlisement (collé contre un iceberg, micro-rebonds) : dernier point de progression. */
  stallX: number;
  stallT: number;
  maxCombo: number;
  tapAt: number;
  /** Anti-spam : après un appui, les suivants sont ignorés un court instant. */
  lockUntil: number;
  /** Rebond « parfait » possible encore un court instant après le contact (tap un peu tard). */
  late: { until: number; vx: number; vy: number } | null;
  endReason: EndReason | null;
  events: Ev[];
}

export function newSim(seed: number, up: Record<UpgradeId, number>): Sim {
  const world = newWorld(seed);
  generate(world, 2400);
  return {
    phase: 'aim', x: 0, y: ANCHOR_Y, vx: 0, vy: 0, grounded: false, t: 0, world, up,
    fish: 0, gold: 0, bounces: 0, perfects: 0, combo: 0, maxCombo: 0, stallX: 0, stallT: 0, tapAt: -9, lockUntil: 0, late: null, endReason: null, events: [],
  };
}

export const distance = (s: Pick<Sim, 'x'>): number => Math.max(0, Math.floor(s.x / 40));
export const launchSpeed = (power: number, level: number): number => (330 + 250 * power) * (1 + 0.55 * level);
/** Frottement : chaque niveau de glisse garde plus de vitesse (au sol et dans l'air). */
export const glideFactor = (level: number): number => Math.pow(0.5, level);
export const fishMult = (level: number): number => 1 + 0.3 * level;
export const magnetRadius = (level: number): number => (level === 0 ? 0 : 45 + 25 * level);
export const PICKUP = 34;
/** Seuils de repos : sous cette vitesse d'impact (ou cette vitesse contre un iceberg) il n'y a plus de rebond. */
export const REST_IMPACT = 70;
export const REST_SPEED = 120;

export function launch(s: Sim, angle: number, power: number): void {
  if (s.phase !== 'aim') return;
  const p = Math.max(0, Math.min(1, power));
  const sp = launchSpeed(p, s.up.power);
  s.vx = Math.cos(angle) * sp;
  s.vy = Math.sin(angle) * sp;
  s.phase = 'fly';
  s.events.push({ type: 'launch' });
}

/** Un appui : bon moment avant le contact (mémorisé) ou un peu après (le rebond est amélioré). */
export function tap(s: Sim): void {
  if (s.phase !== 'fly' || s.t < s.lockUntil) return;
  s.tapAt = s.t;
  s.lockUntil = s.t + 0.4;
  if (s.late && s.t <= s.late.until) {
    s.vx = s.late.vx;
    s.vy = s.late.vy;
    s.late = null;
    s.perfects++;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.events.push({ type: 'late', x: s.x, y: s.y });
  }
}

export const window_ = (level: number): number => PERFECT_WINDOW + 0.03 * level;

function airDrag(vx: number, t: number, dt: number, glide: number): number {
  const k = (0.05 + (t > 120 ? (t - 120) * 0.035 : 0)) * glideFactor(glide);
  return vx - vx * k * dt;
}

/** Un pas de simulation (dt = 1/120 s). */
export function step(s: Sim, dt = STEP): void {
  if (s.phase !== 'fly') return;
  s.t += dt;
  const e = s.up.bounce;
  s.vx = airDrag(s.vx, s.t, dt, s.up.glide);
  if (!s.grounded) s.vy -= GRAVITY * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  generate(s.world, s.x + 2200);

  const sf = surface(s.world, s.x);
  if (s.grounded) {
    if (s.y > sf.h + 0.5) s.grounded = false;
    else if (s.y >= sf.h - 0.01) s.y = sf.h;
    if (s.grounded) s.vx -= (s.vx * 0.45 + 22) * glideFactor(s.up.glide) * dt;
  }
  if (s.y <= sf.h && (s.vy <= 0 || s.grounded)) {
    // en glissant contre un phoque, la vitesse horizontale compte comme choc (un petit glissement s'arrête dessus)
    const impact = s.grounded ? (sf.o?.kind === 'seal' ? s.vx * 0.45 : 0) : -s.vy;
    const wanted = s.t - s.tapAt <= window_(e);
    const eN = 0.48 + 0.065 * e;
    const o = sf.o;
    if (impact < REST_IMPACT && !(sf.slope > 0.2 && !s.grounded)) {
      // trop faible pour rebondir : le pingouin se pose et glisse (jamais de micro-rebonds sur place)
      s.y = sf.h;
      s.vy = 0;
      s.grounded = true;
      s.late = null;
    } else if (sf.slope > 0.2 && Math.hypot(s.vx, s.vy) < REST_SPEED) {
      // trop lent contre la pente d'un iceberg : il s'arrête au pied (pas d'élan offert par le plancher de vitesse)
      s.y = sf.h;
      s.vx = 0;
      s.vy = 0;
      s.grounded = true;
      s.late = null;
    } else if (o && o.kind === 'seal') {
      const nv = { vx: s.vx * (0.88 + 0.015 * e), vy: Math.min(impact * eN, 1000) };
      const pv = { vx: s.vx * (1.04 + 0.018 * e) + 20, vy: Math.min(impact * (eN + 0.38), 1000) };
      bounce(s, 'seal', wanted, nv, pv, sf.h);
      o.squash = s.t;
    } else if (sf.slope > 0.2) {
      const sp = Math.hypot(s.vx, s.vy);
      const th = Math.atan(sf.slope) + 0.18;
      const nsp = Math.max(sp * (0.66 + 0.04 * e), 200);
      const psp = Math.min(sp * (0.98 + 0.03 * e) + 30, 1300);
      bounce(s, 'berg', wanted, { vx: nsp * Math.cos(th), vy: nsp * Math.sin(th) }, { vx: psp * Math.cos(th), vy: psp * Math.sin(th) }, sf.h);
    } else if (impact > 110) {
      s.y = sf.h;
      s.vy = impact * 0.38;
      s.vx *= 0.9 + 0.02 * Math.min(s.up.glide, 5);
      s.grounded = false;
      s.bounces++;
      s.events.push({ type: 'bounce', kind: 'ice', perfect: false, x: s.x, y: s.y, combo: s.combo });
    } else {
      s.y = sf.h;
      s.vy = 0;
      s.grounded = true;
    }
  }

  const o = surface(s.world, s.x).o;
  if (o && o.kind === 'puddle' && !o.hit && s.grounded) {
    o.hit = true;
    s.vx *= 0.5;
    s.events.push({ type: 'splash', x: s.x, y: s.y });
  }

  collect(s, dt);
  if (s.x - s.stallX > 30) { s.stallX = s.x; s.stallT = s.t; }
  const stalled = s.t - s.stallT > 1.2;
  const slow = s.grounded && s.vx < 40;
  if (slow || stalled || s.t > MAX_TIME) {
    s.phase = 'over';
    const inWater = o?.kind === 'puddle' && s.grounded;
    s.endReason = s.t > MAX_TIME ? 'time' : inWater ? 'splash' : slow ? 'stop' : 'stuck';
    s.events.push({ type: 'over', reason: s.endReason });
  }
}

function bounce(
  s: Sim, kind: 'seal' | 'berg', wanted: boolean,
  nv: { vx: number; vy: number }, pv: { vx: number; vy: number }, h: number,
): void {
  s.y = h + 0.01;
  s.grounded = false;
  s.bounces++;
  const use = wanted ? pv : nv;
  s.vx = use.vx;
  s.vy = use.vy;
  if (wanted) {
    s.perfects++;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
  } else s.combo = 0;
  s.late = wanted ? null : { until: s.t + LATE_WINDOW, vx: pv.vx, vy: pv.vy };
  s.tapAt = -9;
  s.lockUntil = 0;
  s.events.push({ type: 'bounce', kind, perfect: wanted, x: s.x, y: s.y, combo: s.combo });
}

function collect(s: Sim, dt: number): void {
  const mr = magnetRadius(s.up.magnet);
  const reach = Math.max(mr, PICKUP) + 4;
  const fish = s.world.fish;
  // les poissons sont triés par x : on ne regarde que ceux proches
  let lo = 0;
  let hi = fish.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (fish[mid].x < s.x - reach) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < fish.length && fish[i].x <= s.x + reach; i++) {
    const f = fish[i];
    if (f.taken) continue;
    const dx = s.x - f.x;
    const dy = s.y + 14 - f.y;
    const d = Math.hypot(dx, dy);
    if (d < PICKUP) {
      f.taken = true;
      if (f.gold) s.gold++;
      else s.fish++;
      s.events.push({ type: 'fish', gold: f.gold, x: f.x, y: f.y });
    } else if (mr > 0 && d < mr) {
      const m = Math.min(d, 900 * dt);
      f.x += (dx / d) * m;
      f.y += (dy / d) * m;
    }
  }
}

/** Poissons gagnés dans la partie : les dorés valent 5. */
export const earned = (s: Sim): number => Math.round((s.fish + s.gold * 5) * fishMult(s.up.fishx));

/** Temps avant le prochain rebond sur phoque / iceberg si le pingouin est en l'air (null sinon). */
export function predictBounce(s: Sim): { t: number; x: number; y: number; kind: 'seal' | 'berg' } | null {
  if (s.phase !== 'fly' || s.grounded) return null;
  let { x, y, vx, vy } = s;
  let t = 0;
  for (let i = 0; i < 360; i++) {
    vy -= GRAVITY * STEP;
    x += vx * STEP;
    y += vy * STEP;
    t += STEP;
    const sf = surface(s.world, x);
    if (y <= sf.h && vy <= 0) {
      if (sf.o && sf.o.kind === 'seal') return { t, x, y: sf.h, kind: 'seal' };
      if (sf.slope > 0.2) return { t, x, y: sf.h, kind: 'berg' };
      return null;
    }
  }
  return null;
}
