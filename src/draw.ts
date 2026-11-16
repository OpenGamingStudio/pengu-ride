/** Dessin du jeu : aplats vifs, contour encre, aucun dégradé. Le même code sert au canvas du jeu et aux icônes. */
import { BERG_H, BERG_RISE, SEAL_H, type Fish, type Obstacle, type World } from './world';
import type { Shelf, UpgradeId } from './shop';

export const INK = '#14284B';
export const COL = {
  sky: '#9FE3FF', sun: '#FFE066', far: '#6FBDEB', near: '#C9F0FF', cloud: '#FFFFFF',
  ice: '#F4FBFF', iceDark: '#CFEFFF', body: '#2F5DA8', belly: '#FFFFFF', beak: '#FF7A1A',
  seal: '#5ED6B0', fish: '#FF9F1C', gold: '#FFD23F', water: '#3AA0E0', wood: '#B5651D', band: '#E63946',
};

export interface Outfit { hat: string; scarf: string; glasses: string }
export const NAKED: Outfit = { hat: 'hat.none', scarf: 'scarf.none', glasses: 'glasses.none' };

type Ctx = CanvasRenderingContext2D;

function ell(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = 3, rot = 0): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
}

function poly(c: Ctx, pts: number[], fill: string, lw = 3): void {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (lw) { c.lineWidth = lw; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(); }
}

function heart(c: Ctx, x: number, y: number, s: number, fill: string): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = INK;
  c.stroke();
}

/** Le pingouin couché, tête à droite, centré sur le corps. `mood` : 0 yeux ouverts, 1 yeux plissés (visée). */
export function drawPenguin(c: Ctx, o: Outfit, rot = 0, mood = 0, tail = 0): void {
  c.save();
  c.rotate(rot);
  // pieds et aileron arrière
  poly(c, [-28, 4, -40, -2, -40, 12], COL.beak, 2.5);
  ell(c, -4, 6, 18, 6, COL.body, 3, 0.3);
  // écharpe (derrière le corps pour la queue)
  drawScarf(c, o.scarf, tail, true);
  ell(c, -4, 2, 28, 19, COL.body);
  ell(c, -4, 9, 20, 8, COL.belly, 0);
  ell(c, 15, -4, 15, 14.5, COL.body);
  ell(c, 20, -1, 9, 9, COL.belly, 0);
  poly(c, [28, -3, 40, 1, 28, 6], COL.beak, 2.5);
  ell(c, 14, 3, 3.5, 2.5, '#FF8FB0', 0);
  if (mood === 1) {
    c.beginPath();
    c.moveTo(16, -7); c.lineTo(23, -6);
    c.lineWidth = 3; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
  } else {
    ell(c, 20, -7, 3.2, 3.8, INK, 0);
    ell(c, 21, -8.2, 1.1, 1.1, '#FFFFFF', 0);
  }
  // aileron avant
  ell(c, -2, 6, 12, 5.5, COL.body, 3, -0.45);
  drawScarf(c, o.scarf, tail, false);
  drawGlasses(c, o.glasses);
  drawHat(c, o.hat, tail);
  c.restore();
}

function scarfColors(id: string): string[] {
  switch (id) {
    case 'scarf.red': return ['#E63946'];
    case 'scarf.stripe': return ['#FF7A1A', '#FFD23F'];
    case 'scarf.pink': return ['#FF8FB0'];
    case 'scarf.long': return ['#8ED84A', '#FFFFFF'];
    case 'scarf.rainbow': return ['#E63946', '#FF9F1C', '#FFD23F', '#5ED6B0', '#3AA0E0'];
    case 'scarf.bow': return ['#B05CFF'];
    default: return [];
  }
}

function drawScarf(c: Ctx, id: string, wave: number, back: boolean): void {
  const cols = scarfColors(id);
  if (!cols.length) return;
  if (id === 'scarf.bow') {
    if (back) return;
    c.save(); c.translate(6, 7);
    poly(c, [0, 0, -11, -8, -11, 8], cols[0], 3);
    poly(c, [0, 0, 11, -8, 11, 8], cols[0], 3);
    ell(c, 0, 0, 4.2, 4.6, '#7A2FD0', 2.5);
    c.restore();
    return;
  }
  if (back) {
    const len = id === 'scarf.long' ? 62 : 28;
    const n = Math.round(len / 7);
    for (let i = 0; i < n; i++) {
      const x = 4 - (i + 1) * 7;
      const y = 4 + Math.sin(wave * 6 + i * 0.7) * (2 + i * 0.7);
      c.beginPath();
      c.rect(x, y, 8, 10);
      c.fillStyle = cols[i % cols.length];
      c.fill();
      c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    }
    return;
  }
  c.save();
  c.translate(5, -2);
  c.rotate(0.18);
  c.beginPath();
  c.roundRect(-5, -17, 11, 36, 4);
  c.fillStyle = cols[0];
  c.fill();
  if (id === 'scarf.rainbow') {
    c.save(); c.clip();
    cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-6, -17 + i * 7.2, 13, 7.3); });
    c.restore();
  } else if (cols[1]) {
    c.save(); c.clip();
    c.fillStyle = cols[1];
    for (let y = -13; y < 18; y += 10) c.fillRect(-6, y, 13, 4.5);
    c.restore();
  }
  c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.restore();
}

function drawGlasses(c: Ctx, id: string): void {
  switch (id) {
    case 'glasses.round':
      c.beginPath(); c.moveTo(6, -9); c.lineTo(14, -7); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      ell(c, 21, -7, 7, 7, 'rgba(255,255,255,0.0)', 3);
      ell(c, 21, -7, 7, 7, '#FFFFFF55', 0);
      break;
    case 'glasses.sun':
      c.beginPath(); c.moveTo(4, -10); c.lineTo(14, -8); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.roundRect(13, -14, 15, 12, 4); c.fillStyle = INK; c.fill();
      ell(c, 17, -11, 1.8, 1.2, '#FFFFFF', 0);
      break;
    case 'glasses.ski':
      c.beginPath(); c.moveTo(0, -9); c.lineTo(10, -8); c.lineWidth = 5; c.strokeStyle = COL.band; c.stroke();
      c.beginPath(); c.roundRect(10, -16, 20, 17, 6); c.fillStyle = '#FFD23F'; c.fill();
      c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      break;
    case 'glasses.star': {
      c.beginPath(); c.moveTo(4, -9); c.lineTo(13, -7); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4.6 : 10; const a = -Math.PI / 2 + i * Math.PI / 5;
        c[i ? 'lineTo' : 'moveTo'](22 + Math.cos(a) * r, -8 + Math.sin(a) * r);
      }
      c.closePath(); c.fillStyle = '#FFD23F'; c.fill(); c.lineWidth = 2.8; c.strokeStyle = INK; c.stroke();
      break;
    }
    case 'glasses.mono':
      ell(c, 21, -7, 7.5, 7.5, '#FFFFFF66', 3);
      c.beginPath(); c.moveTo(21, 0); c.quadraticCurveTo(24, 8, 17, 14); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      poly(c, [26, 5, 36, 3, 36, 8, 26, 9], '#3B2A1A', 2);
      break;
    case 'glasses.heart':
      c.beginPath(); c.moveTo(4, -9); c.lineTo(13, -7); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      heart(c, 22, -8, 6, '#FF4F9A');
      break;
  }
}

function drawHat(c: Ctx, id: string, wave = 0): void {
  if (id === 'hat.none') return;
  const cx = 14;
  const base = -15;
  const band = (col: string, w = 30) => {
    c.beginPath(); c.roundRect(cx - w / 2, base - 3, w, 8, 3.5);
    c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  };
  const dome = (col: string) => {
    c.beginPath(); c.arc(cx, base, 13, Math.PI, Math.PI * 2); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  };
  switch (id) {
    case 'hat.chef':
      ell(c, cx - 8, base - 15, 8, 9, '#FFFFFF');
      ell(c, cx + 8, base - 15, 8, 9, '#FFFFFF');
      ell(c, cx, base - 20, 9, 10, '#FFFFFF');
      c.beginPath(); c.roundRect(cx - 12, base - 8, 24, 10, 3); c.fillStyle = '#FFFFFF'; c.fill();
      c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      return;
    case 'hat.crown':
      poly(c, [cx - 13, base + 3, cx - 14, base - 17, cx - 7, base - 8, cx, base - 21, cx + 7, base - 8, cx + 14, base - 17, cx + 13, base + 3], COL.gold, 3);
      ell(c, cx, base - 8, 2.6, 2.6, COL.band, 1.8);
      ell(c, cx - 8, base - 2, 2, 2, '#3AA0E0', 1.5);
      ell(c, cx + 8, base - 2, 2, 2, '#5ED6B0', 1.5);
      return;
    case 'hat.party':
      poly(c, [cx - 11, base + 3, cx + 11, base + 3, cx + 1, base - 30], '#B05CFF', 3);
      ell(c, cx - 2, base - 10, 2.6, 2.6, '#FFE066', 0);
      ell(c, cx + 3, base - 2, 2.6, 2.6, '#FFFFFF', 0);
      ell(c, cx - 6, base - 1, 2.2, 2.2, '#FF8FB0', 0);
      ell(c, cx + 1 + Math.sin(wave * 6) * 2, base - 32, 5, 5, '#FFE066', 2.5);
      return;
    case 'hat.viking':
      for (const d of [-1, 1]) {
        poly(c, [cx + d * 11, base - 4, cx + d * 22, base - 9, cx + d * 19, base - 24, cx + d * 14, base - 10], '#FFFFFF', 2.8);
      }
      dome('#8A97A8');
      band('#B5651D');
      ell(c, cx, base - 9, 3, 3, COL.gold, 1.8);
      return;
    case 'hat.duck': {
      const bob = Math.sin(wave * 6) * 1.2;
      c.save(); c.translate(0, bob);
      ell(c, cx - 2, base - 6, 11, 8, '#FFD23F');
      ell(c, cx + 6, base - 15, 6.5, 6.5, '#FFD23F');
      poly(c, [cx + 11, base - 15, cx + 18, base - 13, cx + 11, base - 11], COL.beak, 2.2);
      ell(c, cx + 7, base - 17, 1.4, 1.4, INK, 0);
      ell(c, cx - 7, base - 6, 5, 3, '#FFB300', 1.8, -0.4);
      c.restore();
      return;
    }
  }
  dome(id === 'hat.red' ? '#E63946' : id === 'hat.pompom' ? '#FF7A1A' : '#8ED84A');
  if (id === 'hat.stripe') {
    c.save();
    c.beginPath(); c.arc(cx, base, 13, Math.PI, Math.PI * 2); c.closePath(); c.clip();
    c.fillStyle = '#FFFFFF';
    for (let x = cx - 14; x < cx + 14; x += 9) c.fillRect(x, base - 14, 4.5, 15);
    c.restore();
    c.beginPath(); c.arc(cx, base, 13, Math.PI, Math.PI * 2); c.closePath(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  }
  band(id === 'hat.pompom' ? '#FFD23F' : '#FFFFFF', 30);
  if (id === 'hat.pompom') ell(c, cx + Math.sin(wave * 6) * 2, base - 17, 6.5, 6.5, '#FFD23F', 2.5);
  if (id === 'hat.red') ell(c, cx, base - 15, 4, 4, '#FFFFFF', 2.5);
}

export function drawFish(c: Ctx, gold: boolean, wob = 0): void {
  c.save();
  c.rotate(Math.sin(wob) * 0.18);
  const s = gold ? 1.35 : 1;
  c.scale(s, s);
  poly(c, [-8, 0, -19, -8, -19, 8], gold ? '#FFB300' : '#FF7A1A', 2.5);
  ell(c, 0, 0, 12, 8, gold ? COL.gold : COL.fish, 2.5);
  ell(c, 5, -2, 2, 2, INK, 0);
  if (gold) {
    ell(c, -3, -3, 3, 1.5, '#FFFFFF', 0, -0.5);
  }
  c.restore();
}

export function drawSeal(c: Ctx, squash = 0): void {
  c.save();
  c.scale(1 + squash * 0.18, 1 - squash * 0.35);
  poly(c, [60, -18, 84, -4, 62, -2], COL.seal, 3);
  poly(c, [60, -14, 82, -26, 74, -10], COL.seal, 3);
  ell(c, 0, -20, 66, 22, COL.seal);
  ell(c, 4, -12, 52, 10, '#FFFFFF', 0);
  ell(c, -52, -36, 17, 15, COL.seal);
  ell(c, -62, -32, 6, 4.5, INK, 0);
  ell(c, -50, -42, 3.2, 3.8, INK, 0);
  ell(c, -49.5, -43, 1, 1, '#FFFFFF', 0);
  for (const dy of [-5, 0, 5]) {
    c.beginPath(); c.moveTo(-68, -30); c.lineTo(-86, -30 + dy * 1.4);
    c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  }
  ell(c, -10, -14, 12, 6, COL.seal, 3, 0.5);
  c.restore();
}

export function drawBerg(c: Ctx, o: Obstacle): void {
  const x0 = o.x0;
  const x1 = o.x1;
  poly(c, [x0, 0, x0 + BERG_RISE, o.h, x1, o.h, x1, 0], '#FFFFFF', 3.5);
  poly(c, [x0 + 70, 0, x0 + BERG_RISE, o.h, x1, o.h, x1, 0], COL.iceDark, 0);
  c.beginPath();
  c.moveTo(x0 + 70, 0); c.lineTo(x0 + BERG_RISE, o.h); c.lineTo(x1, o.h); c.lineTo(x1, 0);
  c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + BERG_RISE, o.h); c.lineTo(x1, o.h); c.lineTo(x1, 0);
  c.stroke();
}

export function drawPuddle(c: Ctx, o: Obstacle): void {
  const cx = (o.x0 + o.x1) / 2;
  ell(c, cx, 2, (o.x1 - o.x0) / 2, 9, COL.water, 3);
  ell(c, cx - 14, 0, 14, 3, '#FFFFFF', 0);
}

export function drawSling(c: Ctx): void {
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 44); c.lineWidth = 14; c.strokeStyle = INK; c.stroke();
  c.lineWidth = 8; c.strokeStyle = COL.wood; c.stroke();
  for (const dx of [-20, 20]) {
    c.beginPath(); c.moveTo(0, 40); c.lineTo(dx, 70); c.lineWidth = 14; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 8; c.strokeStyle = COL.wood; c.stroke();
  }
}

export function drawBand(c: Ctx, px: number, py: number): void {
  for (const dx of [-20, 20]) {
    c.beginPath(); c.moveTo(dx, 70); c.lineTo(px, py);
    c.lineWidth = 9; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
    c.lineWidth = 5; c.strokeStyle = COL.band; c.stroke();
  }
}

/** Décor lointain en aplats : soleil, montagnes, nuages (parallaxe). */
export function drawBackdrop(c: Ctx, w: number, h: number, groundY: number, camX: number, camY: number, scale: number): void {
  c.fillStyle = COL.sky;
  c.fillRect(0, 0, w, h);
  ell(c, w * 0.82, h * 0.14, Math.min(w, h) * 0.09, Math.min(w, h) * 0.09, COL.sun, 3);
  const mount = (par: number, col: string, hgt: number, period: number, lw: number) => {
    const off = (camX * par * scale) % period;
    const peaks = [0.6, 1, 0.45, 0.85, 0.7];
    c.beginPath();
    c.moveTo(-period, groundY + camY * scale * 0.2);
    for (let i = -1; i <= Math.ceil(w / period) + 1; i++) {
      for (let k = 0; k < peaks.length; k++) {
        const x = i * period - off + (k / peaks.length) * period;
        c.lineTo(x + period / peaks.length / 2, groundY + camY * scale * 0.2 - hgt * peaks[k]);
        c.lineTo(x + period / peaks.length, groundY + camY * scale * 0.2);
      }
    }
    c.lineTo(w + period, groundY + 40);
    c.lineTo(-period, groundY + 40);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
  };
  mount(0.08, COL.far, h * 0.3, 900 * scale + 200, 0);
  mount(0.2, COL.near, h * 0.16, 620 * scale + 140, 0);
  c.fillStyle = COL.cloud;
  const cloudPeriod = 700 * scale + 300;
  const co = (camX * 0.35 * scale) % cloudPeriod;
  for (let i = -1; i <= Math.ceil(w / cloudPeriod) + 1; i++) {
    for (const [dx, y, s] of [[0.1, 0.22, 1], [0.6, 0.35, 0.7]] as const) {
      const x = i * cloudPeriod - co + dx * cloudPeriod;
      const yy = h * y - camY * scale * 0.1;
      const r = 26 * s * Math.max(scale, 0.6);
      ell(c, x, yy, r * 2.2, r, COL.cloud, 0);
      ell(c, x - r, yy - r * 0.5, r * 1.1, r * 0.9, COL.cloud, 0);
      ell(c, x + r * 0.8, yy - r * 0.6, r * 1.2, r * 1.0, COL.cloud, 0);
    }
  }
}

/** Monde en coordonnées « monde » : l'origine est le point de la glace sous la fronde, y vers le haut. */
export function drawWorld(
  c: Ctx, w: World, camX: number, viewW: number, t: number,
  opts: { sling: boolean },
): void {
  // obstacles visibles
  for (const o of w.items) {
    if (o.x1 < camX - 100 || o.x0 > camX + viewW + 100) continue;
    if (o.kind === 'berg') drawBerg(c, o);
    else if (o.kind === 'puddle') drawPuddle(c, o);
    else {
      c.save();
      c.translate((o.x0 + o.x1) / 2, 0);
      c.scale(1, -1);
      drawSeal(c, Math.max(0, 1 - (t - o.squash) / 0.25));
      c.restore();
    }
  }
  if (opts.sling) drawSling(c);
  for (const f of w.fish) {
    if (f.taken || f.x < camX - 40 || f.x > camX + viewW + 40) continue;
    drawFishAt(c, f, t);
  }
}

function drawFishAt(c: Ctx, f: Fish, t: number): void {
  c.save();
  c.translate(f.x, f.y + Math.sin(t * 4 + f.x * 0.05) * 3);
  c.scale(1, -1);
  drawFish(c, f.gold, t * 5 + f.x);
  c.restore();
}

/** Sol de glace : aplat clair sous la ligne, bandes plus foncées, contour encre. */
export function drawGround(c: Ctx, w: number, h: number, groundY: number, camX: number, scale: number): void {
  c.fillStyle = COL.ice;
  c.fillRect(0, groundY, w, h - groundY);
  c.fillStyle = COL.iceDark;
  const period = 260 * scale;
  const off = (camX * scale) % period;
  for (let i = -1; i < w / period + 2; i++) {
    const x = i * period - off;
    c.beginPath();
    c.moveTo(x, groundY + 22 * scale);
    c.lineTo(x + 120 * scale, groundY + 22 * scale);
    c.lineTo(x + 90 * scale, groundY + 40 * scale);
    c.lineTo(x - 20 * scale, groundY + 40 * scale);
    c.closePath();
    c.fill();
  }
  c.beginPath(); c.moveTo(0, groundY); c.lineTo(w, groundY);
  c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
}

export function drawRing(c: Ctx, x: number, y: number, k: number, perfect: boolean): void {
  c.beginPath();
  c.arc(x, y, 18 + k * 70, 0, Math.PI * 2);
  c.lineWidth = perfect ? 5 : 4;
  c.strokeStyle = perfect ? COL.band : '#FFFFFF';
  c.stroke();
  c.beginPath();
  c.arc(x, y, 18 + k * 70, 0, Math.PI * 2);
  c.lineWidth = 1.5;
  c.strokeStyle = INK;
  c.stroke();
}

/** Aperçu animé du pingouin équipé (boutique) : respire, penche la tête, l'écharpe flotte. */
export function paintOutfit(cv: HTMLCanvasElement, o: Outfit, size: number, t: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.round(size * dpr);
  if (cv.width !== w) { cv.width = w; cv.height = w; }
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, size, size);
  c.translate(size / 2, size * 0.62);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const k = size / 120;
  c.scale(k * 1.7, k * 1.7);
  c.translate(-8, Math.sin(t * 2.2) * 2);
  drawPenguin(c, o, -0.12 + Math.sin(t * 1.6) * 0.04, Math.sin(t * 0.9) > 0.96 ? 1 : 0, t);
}

// ---- icônes de la boutique et du tuto (canvas pré-rendus) -------------------------------------------

export function paintIcon(cv: HTMLCanvasElement, kind: 'item' | 'upgrade' | 'fish' | 'seal' | 'berg' | 'sling' | 'penguin', id: string, size: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(size * dpr);
  cv.height = Math.round(size * dpr);
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, size, size);
  c.save();
  c.translate(size / 2, size / 2);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const k = size / 100;
  c.scale(k, k);
  if (kind === 'item') {
    const shelf = id.split('.')[0] as Shelf;
    const o: Outfit = { ...NAKED, [shelf]: id };
    const sc = shelf === 'hat' ? 1.25 : 1.7;
    c.scale(sc, sc);
    c.translate(shelf === 'hat' ? -12 : shelf === 'scarf' ? -2 : -18, shelf === 'hat' ? 20 : 0);
    drawPenguin(c, o, 0, 0);
  } else if (kind === 'upgrade') {
    drawUpgradeIcon(c, id as UpgradeId);
  } else if (kind === 'fish') {
    c.scale(2.1, 2.1);
    drawFish(c, id === 'gold', 0);
  } else if (kind === 'seal') {
    c.scale(0.55, 0.55); c.translate(0, 30);
    drawSeal(c, 0);
  } else if (kind === 'berg') {
    c.scale(0.6, 0.6); c.translate(-80, 40);
    c.scale(1, -1);
    drawBerg(c, { kind: 'berg', x0: 0, x1: 190, h: BERG_H, squash: 0, hit: false });
  } else if (kind === 'sling') {
    c.scale(0.9, 0.9); c.translate(0, 40);
    c.scale(1, -1);
    drawSling(c);
    c.scale(1, -1);
  } else {
    c.scale(1.6, 1.6); c.translate(-8, 0);
    drawPenguin(c, NAKED, -0.3, 0);
  }
  c.restore();
}

function drawUpgradeIcon(c: Ctx, id: UpgradeId): void {
  if (id === 'power') {
    c.save(); c.translate(0, 34); c.scale(0.95, 0.95); c.scale(1, -1);
    drawSling(c);
    c.restore();
    poly(c, [-6, -42, 12, -16, 2, -16, 8, 6, -14, -22, -3, -22], COL.gold, 3);
  } else if (id === 'bounce') {
    c.beginPath();
    c.moveTo(-26, 34); c.lineTo(26, 34);
    c.lineWidth = 10; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 5; c.strokeStyle = COL.band; c.stroke();
    c.beginPath();
    c.moveTo(-16, 26); c.lineTo(16, 16); c.lineTo(-16, 6); c.lineTo(16, -4); c.lineTo(-16, -14); c.lineTo(0, -20);
    c.lineWidth = 9; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 4.5; c.strokeStyle = '#FFFFFF'; c.stroke();
    ell(c, 0, -34, 11, 11, COL.seal, 3);
  } else if (id === 'glide') {
    c.beginPath();
    c.moveTo(-30, 30); c.lineTo(30, 30);
    c.lineWidth = 10; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 5; c.strokeStyle = '#FFFFFF'; c.stroke();
    poly(c, [-22, 18, 22, 18, 30, 4, -26, 4], COL.band, 3.5);
    for (const y of [-10, -22, -34]) {
      c.beginPath(); c.moveTo(-30, y); c.lineTo(-8, y);
      c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#FFFFFF'; c.stroke();
    }
  } else if (id === 'fishx') {
    c.save(); c.translate(-8, 4); c.scale(1.5, 1.5); drawFish(c, true, 0); c.restore();
    poly(c, [14, -34, 20, -22, 34, -20, 24, -10, 27, 4, 14, -3, 1, 4, 4, -10, -6, -20, 8, -22], COL.sun, 3);
  } else {
    c.beginPath();
    c.arc(0, 4, 26, Math.PI, 0);
    c.lineTo(26, 30); c.lineTo(12, 30); c.lineTo(12, 4); c.arc(0, 4, 12, 0, Math.PI, true);
    c.lineTo(-12, 30); c.lineTo(-26, 30); c.closePath();
    c.fillStyle = COL.band; c.fill();
    c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#FFFFFF';
    c.fillRect(-26, 20, 14, 10); c.fillRect(12, 20, 14, 10);
    c.strokeRect(-26, 20, 14, 10); c.strokeRect(12, 20, 14, 10);
    c.save(); c.translate(0, -34); c.scale(0.9, 0.9); drawFish(c, false, 0); c.restore();
  }
}
