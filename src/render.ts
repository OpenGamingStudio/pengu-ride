// Dessin Canvas : aplats vifs, contour encre. Le monde est tourné de la pente, la simulation reste « à plat ».
import { BIOMES, mix, type Palette } from './biomes';
import { SLOPE_DEG } from './config';
import type { Game } from './sim';
import type { Skin } from './skins';

const INK = '#14213d';
const SLOPE = (SLOPE_DEG * Math.PI) / 180;
const GROUND_Y = 0;

export interface Fx { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number }
export interface View {
  w: number;
  h: number;
  scale: number;
  reduced: boolean;
  pal: Palette; // palette courante (mélange en cours)
  skin: Skin;
  fx: Fx[];
  shake: number;
}

export function palette(a: number, b: number, t: number): Palette {
  const A = BIOMES[a];
  const B = BIOMES[b];
  if (t >= 1 || a === b) return B;
  return {
    ...B,
    sky: mix(A.sky, B.sky, t), far: mix(A.far, B.far, t), near: mix(A.near, B.near, t), ground: mix(A.ground, B.ground, t),
    edge: mix(A.edge, B.edge, t), pit: mix(A.pit, B.pit, t), accent: mix(A.accent, B.accent, t), snow: mix(A.snow, B.snow, t),
  };
}

export function computeScale(w: number, h: number): number {
  return w < h ? w / 500 : Math.min(w / 560, h / 300);
}

function mountains(c: CanvasRenderingContext2D, v: View, par: number, camX: number, base: number, amp: number, col: string, seed: number): void {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(0, v.h);
  const step = 40;
  const off = v.reduced ? 0 : camX * par;
  for (let sx = -step; sx <= v.w + step; sx += step) {
    const wx = (sx + off) / v.scale;
    const hgt = (Math.sin(wx * 0.011 + seed) * 0.5 + Math.sin(wx * 0.027 + seed * 2.3) * 0.3 + 0.8) * amp;
    c.lineTo(sx, base - hgt * v.scale);
  }
  c.lineTo(v.w + step, v.h);
  c.closePath();
  c.fill();
}

export function draw(c: CanvasRenderingContext2D, g: Game, v: View): void {
  const { w, h, scale } = v;
  const p = v.pal;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = p.sky;
  c.fillRect(0, 0, w, h);
  // décor lointain (non tourné, défile moins vite)
  const horizon = h * 0.55;
  if (p.name === 'Aurore' || v.pal === BIOMES[1]) {
    c.fillStyle = p.accent;
    for (let i = 0; i < 3; i++) {
      const x0 = ((i * 0.37 + 0.1) * w - (v.reduced ? 0 : g.x * 0.01 * scale)) % (w * 1.2);
      c.globalAlpha = 0.28;
      c.beginPath();
      c.moveTo(x0, 0);
      c.lineTo(x0 + 70 * scale, 0);
      c.lineTo(x0 + 130 * scale, horizon * 0.8);
      c.lineTo(x0 + 40 * scale, horizon * 0.8);
      c.closePath();
      c.fill();
    }
    c.globalAlpha = 1;
  }
  mountains(c, v, 0.06 * scale, g.x, horizon, 120, p.far, 1);
  mountains(c, v, 0.14 * scale, g.x, horizon + 60 * scale, 80, p.near, 4);
  if (p.accent === BIOMES[2].accent || v.pal === BIOMES[2]) {
    // stalactites
    c.fillStyle = p.accent;
    for (let i = 0; i < 9; i++) {
      const x0 = (i * 0.14 * w * 1.1 + 20) - (v.reduced ? 0 : (g.x * 0.2 * scale) % (w * 1.26));
      const xx = ((x0 % (w * 1.26)) + w * 1.26) % (w * 1.26) - 40;
      const len = (30 + ((i * 37) % 50)) * scale;
      c.beginPath();
      c.moveTo(xx - 18 * scale, 0);
      c.lineTo(xx + 18 * scale, 0);
      c.lineTo(xx, len);
      c.closePath();
      c.fill();
    }
  }

  // monde incliné, pingouin à (30 % , 58 %)
  let sx = 0;
  let sy = 0;
  if (v.shake > 0 && !v.reduced) {
    sx = (Math.random() - 0.5) * v.shake * 14;
    sy = (Math.random() - 0.5) * v.shake * 14;
  }
  const px = w * (w < h ? 0.3 : 0.28) + sx;
  const py = h * 0.58 + sy;
  c.save();
  c.translate(px, py);
  c.rotate(SLOPE);
  c.scale(scale, scale);
  c.translate(-g.x, 0);
  const left = g.x - (px / scale) * 1.6 - 200;
  const right = g.x + ((w - px) / scale) * 1.6 + 400;

  // glace : bande par segments entre les trous
  const holes = g.objs.filter((o) => o.kind === 'hole').sort((a, b) => a.x - b.x);
  const seg: [number, number][] = [];
  let cur = left;
  for (const hl of holes) {
    seg.push([cur, hl.x - hl.w / 2]);
    cur = hl.x + hl.w / 2;
  }
  seg.push([cur, right]);
  c.fillStyle = p.pit;
  for (const hl of holes) c.fillRect(hl.x - hl.w / 2, GROUND_Y, hl.w, 2000);
  for (const [a, b] of seg) {
    if (b <= a) continue;
    c.fillStyle = p.edge;
    c.fillRect(a, GROUND_Y, b - a, 2000);
    c.fillStyle = p.ground;
    c.fillRect(a, GROUND_Y, b - a, 26);
  }
  // bords des trous
  c.fillStyle = INK;
  for (const hl of holes) {
    c.fillRect(hl.x - hl.w / 2 - 3, GROUND_Y, 3, 36);
    c.fillRect(hl.x + hl.w / 2, GROUND_Y, 3, 36);
  }

  for (const o of g.objs) {
    if (o.x < left - 100 || o.x > right) continue;
    if (o.kind === 'rock') rock(c, o.x);
    else if (o.kind === 'seal') seal(c, o.x);
    else if (o.kind === 'pad') pad(c, o.x, o.w, p, g.t);
    else if (o.kind === 'fish' && !o.taken) fish(c, o.x, -o.y, g.t, v.reduced);
  }

  // pingouin
  const falling = g.falling && g.y < 0;
  c.save();
  c.translate(g.x, -g.y);
  if (!g.over || g.over !== 'hole') pengu(c, g, v.skin, v.reduced);
  else if (falling) pengu(c, g, v.skin, true);
  c.restore();

  for (const f of v.fx) {
    c.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
    c.fillStyle = f.c;
    c.fillRect(f.x - f.r, -f.y - f.r, f.r * 2, f.r * 2);
  }
  c.globalAlpha = 1;
  c.restore();

  // neige (aplats carrés)
  if (!v.reduced) {
    c.fillStyle = p.snow;
    const t = g.t;
    for (let i = 0; i < 28; i++) {
      const x = (((i * 97.3 + t * (30 + (i % 5) * 12) * -1 - g.x * 0.3 * scale) % (w + 20)) + w + 20) % (w + 20);
      const y = ((i * 53.7 + t * (40 + (i % 4) * 16) * scale) % (h + 20));
      c.fillRect(x, y, 3 * scale + (i % 3), 3 * scale + (i % 3));
    }
  }
}

function rock(c: CanvasRenderingContext2D, x: number): void {
  c.fillStyle = '#6d7a8c';
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - 20, 2);
  c.lineTo(x - 13, -26);
  c.lineTo(x + 2, -36);
  c.lineTo(x + 17, -24);
  c.lineTo(x + 21, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#9aa7b8';
  c.beginPath();
  c.moveTo(x - 9, -22);
  c.lineTo(x + 1, -31);
  c.lineTo(x + 7, -20);
  c.closePath();
  c.fill();
}

function seal(c: CanvasRenderingContext2D, x: number): void {
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.fillStyle = '#9c8b7a';
  c.beginPath();
  c.ellipse(x, -14, 31, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath(); // tête
  c.arc(x + 24, -26, 11, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.fillRect(x + 27, -30, 4, 4);
  c.fillRect(x + 30, -24, 5, 3);
  c.fillStyle = '#9c8b7a';
  c.beginPath(); // nageoire arrière
  c.moveTo(x - 28, -14);
  c.lineTo(x - 40, -24);
  c.lineTo(x - 40, -6);
  c.closePath();
  c.fill();
  c.stroke();
}

function pad(c: CanvasRenderingContext2D, x: number, w: number, p: Palette, t: number): void {
  c.fillStyle = '#35c8ff';
  c.fillRect(x - w / 2, 0, w, 7);
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const a = x - w / 2 + 8 + i * 24 + ((t * 40) % 8);
    c.beginPath();
    c.moveTo(a, 1);
    c.lineTo(a + 12, 3.5);
    c.lineTo(a, 6);
    c.closePath();
    c.fill();
  }
  void p;
}

function fish(c: CanvasRenderingContext2D, x: number, y: number, t: number, reduced: boolean): void {
  const bob = reduced ? 0 : Math.sin(t * 5 + x * 0.05) * 2;
  c.save();
  c.translate(x, y + bob);
  c.fillStyle = '#ff7a59';
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.lineJoin = 'round';
  c.beginPath();
  c.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(10, 0);
  c.lineTo(19, -7);
  c.lineTo(19, 7);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.fillRect(-7, -3, 3, 3);
  c.restore();
}

/** Pingouin qui glisse sur le ventre, tête vers la droite (l'avant). */
export function pengu(c: CanvasRenderingContext2D, g: Pick<Game, 'vy' | 'lean' | 'grounded' | 't' | 'speed'>, s: Skin, calm: boolean): void {
  c.save();
  const tilt = g.grounded ? g.lean * 0.12 : -Math.max(-1, Math.min(1, g.vy / 900)) * 0.5 + g.lean * 0.15;
  c.translate(0, -2);
  c.rotate(calm ? 0 : -tilt);
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  // pattes arrière
  c.fillStyle = '#ff8a1f';
  c.beginPath();
  c.moveTo(-24, -4);
  c.lineTo(-36, -9);
  c.lineTo(-36, 1);
  c.closePath();
  c.fill();
  c.stroke();
  // écharpe (queue)
  if (s.scarf) {
    c.fillStyle = s.scarf;
    const fl = calm ? 0 : Math.sin(g.t * 14) * 3;
    c.beginPath();
    c.moveTo(6, -22);
    c.lineTo(-18, -26 + fl);
    c.lineTo(-18, -16 + fl);
    c.lineTo(6, -14);
    c.closePath();
    c.fill();
    c.stroke();
  }
  // corps
  c.fillStyle = s.body;
  c.beginPath();
  c.ellipse(-2, -14, 27, 14, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = s.belly;
  c.beginPath();
  c.ellipse(0, -8, 20, 7, 0, 0, Math.PI);
  c.fill();
  // tête
  c.fillStyle = s.body;
  c.beginPath();
  c.arc(16, -24, 11, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(20, -26, 4.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = INK;
  c.fillRect(20, -28, 3, 4);
  // bec
  c.fillStyle = '#ff8a1f';
  c.beginPath();
  c.moveTo(25, -24);
  c.lineTo(35, -21);
  c.lineTo(25, -18);
  c.closePath();
  c.fill();
  c.stroke();
  // chapeau
  hat(c, s);
  c.restore();
}

function hat(c: CanvasRenderingContext2D, s: Skin): void {
  c.fillStyle = s.hatColor;
  c.strokeStyle = INK;
  c.lineWidth = 3;
  switch (s.hat) {
    case 'beanie':
      c.beginPath(); c.arc(15, -29, 11, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(15, -41, 3.5, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.stroke();
      break;
    case 'crown':
      c.beginPath(); c.moveTo(7, -33); c.lineTo(8, -45); c.lineTo(12, -38); c.lineTo(16, -47); c.lineTo(20, -38); c.lineTo(24, -45); c.lineTo(25, -33); c.closePath(); c.fill(); c.stroke();
      break;
    case 'party':
      c.beginPath(); c.moveTo(8, -33); c.lineTo(17, -52); c.lineTo(24, -33); c.closePath(); c.fill(); c.stroke();
      break;
    case 'helmet':
      c.beginPath(); c.arc(16, -26, 13, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.stroke();
      break;
    case 'band':
      c.fillRect(5, -34, 22, 5); c.strokeRect(5, -34, 22, 5);
      break;
    default:
  }
}
