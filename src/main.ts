import './style.css';
import { ANCHOR_Y, GRAVITY, STEP } from './config';
import { setSound, sfx } from './audio';
import {
  COL, drawBackdrop, drawBand, drawGround, drawPenguin, drawRing, drawWorld, INK, paintIcon, type Outfit,
} from './draw';
import { freshSave, load, write, type Loaded } from './save';
import { nextAffordable, type UpgradeId } from './shop';
import { distance, earned, launch, launchSpeed, newSim, predictBounce, step, tap, window_, type Sim } from './sim';
import { el, resultPanel, shopPanel, tutoPanel } from './ui';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('game');
const g = cv.getContext('2d')!;
const layer = $('layer');

let store: Storage | null = null;
try {
  store = window.localStorage;
} catch {
  store = null;
}
const saved: Loaded = load(store);
const save = saved.data ?? freshSave();
const persist = () => write(store, saved);
setSound(save.settings.sound);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---- état de partie ---------------------------------------------------------------------------------
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; r: number }
interface Floater { x: number; y: number; text: string; life: number; col: string }
let sim: Sim = newSim(1, save.up);
let particles: Particle[] = [];
let floaters: Floater[] = [];
let shake = 0;
/** Animation de fin : temps écoulé depuis l'arrêt, et plouf (flaque) ou étourdi (étoiles). */
let endT = 0;
let endSink = false;
let camX = 0;
let camY = 0;
let paused = false;
let aim: { sx: number; sy: number; angle: number; power: number; id: number } | null = null;
let acc = 0;
let last = 0;
let resultTimer = 0;
let recordShown = false;
let lastCombo = 0;

let W = 0;
let H = 0;
let dpr = 1;
let scale = 1;
let groundY = 0;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  scale = Math.min(H / 560, W / 420);
  groundY = H * (W > H ? 0.8 : 0.74);
}
window.addEventListener('resize', resize);
resize();

const outfit = (): Outfit => ({ ...save.equipped });

// ---- HUD --------------------------------------------------------------------------------------------
function paintStatic(): void {
  paintIcon($('fish-ico') as HTMLCanvasElement, 'fish', 'fish', 28);
  paintIcon($('shop-ico') as HTMLCanvasElement, 'fish', 'fish', 20);
  const s = $('snd-ico') as HTMLCanvasElement;
  const c = s.getContext('2d')!;
  s.width = s.height = 56;
  c.clearRect(0, 0, 56, 56);
  c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = INK; c.fillStyle = INK;
  c.beginPath(); c.moveTo(8, 21); c.lineTo(18, 21); c.lineTo(30, 10); c.lineTo(30, 46); c.lineTo(18, 35); c.lineTo(8, 35); c.closePath(); c.fill();
  if (save.settings.sound) {
    c.beginPath(); c.arc(32, 28, 10, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(32, 28, 19, -0.9, 0.9); c.stroke();
  } else {
    c.strokeStyle = COL.band;
    c.beginPath(); c.moveTo(38, 19); c.lineTo(52, 37); c.moveTo(52, 19); c.lineTo(38, 37); c.stroke();
  }
  $('b-sound').setAttribute('aria-pressed', String(save.settings.sound));
}

function refreshHud(): void {
  $('fish-n').textContent = String(earned(sim));
  $('dist').textContent = distance(sim) + ' m';
  $('rec').textContent = 'Record : ' + save.best + ' m';
  $('shop-n').textContent = String(save.coins);
  $('shop-dot').classList.toggle('hidden', nextAffordable(save) === null);
}

function setDock(visible: boolean): void {
  $('dock').classList.toggle('hidden', !visible);
}

// ---- panneaux ---------------------------------------------------------------------------------------
function openLayer(node: HTMLElement): void {
  layer.replaceChildren(node);
  layer.classList.remove('hidden');
  layer.classList.add('flex');
  paused = true;
  const f = node.querySelector<HTMLElement>('button');
  (node.querySelector<HTMLElement>('.btn-main') ?? f)?.focus();
}
function closeLayer(): void {
  layer.replaceChildren();
  layer.classList.add('hidden');
  layer.classList.remove('flex');
  paused = false;
  last = performance.now();
}

function openTuto(): void {
  openLayer(tutoPanel(() => {
    save.tutoSeen = true;
    persist();
    closeLayer();
  }));
}

function openShop(highlight: UpgradeId | null = null): void {
  openLayer(shopPanel(save, () => { persist(); refreshHud(); }, () => {
    closeLayer();
    refreshHud();
    if (sim.phase === 'over') startAim();
  }, highlight));
}

function showResult(): void {
  const gained = earned(sim);
  const dist = distance(sim);
  const record = dist > save.best;
  if (record) save.best = dist;
  save.coins += gained;
  save.totalFish += gained;
  save.games++;
  persist();
  refreshHud();
  openLayer(resultPanel(
    { dist, fish: sim.fish, gold: sim.gold, gained, perfects: sim.perfects, maxCombo: sim.maxCombo, record, best: save.best, coins: save.coins },
    save,
    () => { closeLayer(); startAim(); },
    (id) => { openShop(id); },
  ));
}

function startAim(): void {
  sim = newSim((Math.random() * 2 ** 31) | 0, save.up);
  particles = [];
  floaters = [];
  endT = 0;
  endSink = false;
  aim = null;
  recordShown = false;
  lastCombo = 0;
  $('combo').classList.add('hidden');
  $('rec').classList.remove('wiggle', '!bg-orange', 'text-white');
  setDock(true);
  $('hint').classList.remove('hidden');
  refreshHud();
}

// ---- entrées ----------------------------------------------------------------------------------------
const MAX_PULL = 120;

function aimFrom(sx: number, sy: number, x: number, y: number): { angle: number; power: number } {
  const px = sx - x;
  const py = y - sy;
  const len = Math.hypot(px, py);
  const angle = Math.max(0.12, Math.min(1.4, Math.atan2(py, px)));
  return { angle, power: Math.min(1, len / MAX_PULL) };
}

cv.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (paused) return;
  if (sim.phase === 'aim') {
    cv.setPointerCapture(e.pointerId);
    aim = { sx: e.clientX, sy: e.clientY, angle: 0.8, power: 0, id: e.pointerId };
    $('hint').classList.add('invisible');
  } else if (sim.phase === 'fly') {
    tap(sim);
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!aim || e.pointerId !== aim.id) return;
  const a = aimFrom(aim.sx, aim.sy, e.clientX, e.clientY);
  aim.angle = a.angle;
  aim.power = a.power;
});
const release = (e: PointerEvent) => {
  if (!aim || e.pointerId !== aim.id) return;
  const a = aim;
  aim = null;
  $('hint').classList.remove('invisible');
  if (e.type === 'pointerup' && a.power >= 0.15 && sim.phase === 'aim') doLaunch(a.angle, a.power);
};
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('contextmenu', (e) => e.preventDefault());

function doLaunch(angle: number, power: number): void {
  launch(sim, angle, Math.max(0.35, power));
  $('hint').classList.add('hidden');
  setDock(false);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !layer.classList.contains('hidden')) {
    if (sim.phase === 'over' && layer.querySelector('[aria-label="Résultat de la partie"]')) return;
    if (layer.querySelector('[aria-label="Boutique"]')) { closeLayer(); refreshHud(); if (sim.phase === 'over') startAim(); return; }
    if (layer.querySelector('[aria-label="Comment jouer"]')) { save.tutoSeen = true; persist(); closeLayer(); }
    return;
  }
  const a = document.activeElement;
  if (a && a !== document.body && a !== cv) return;
  if (paused) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
    e.preventDefault();
    if (e.repeat) return;
    if (sim.phase === 'aim') doLaunch(0.85, 0.9);
    else if (sim.phase === 'fly') tap(sim);
  }
});

$('b-help').addEventListener('click', openTuto);
$('b-shop').addEventListener('click', () => openShop());
$('b-sound').addEventListener('click', () => {
  save.settings.sound = !save.settings.sound;
  setSound(save.settings.sound);
  persist();
  paintStatic();
  sfx.unlock();
});

// ---- événements du jeu : sons, particules -----------------------------------------------------------
function burst(x: number, y: number, n: number, col: string, power = 160): void {
  const count = reduced.matches ? Math.ceil(n / 3) : n;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = power * (0.4 + Math.random() * 0.6);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 60, life: 0.5, max: 0.5, col, r: 3 + Math.random() * 3 });
  }
}

function handleEvents(): void {
  for (const ev of sim.events) {
    if (ev.type === 'launch') sfx.launch();
    else if (ev.type === 'bounce') {
      if (ev.kind === 'ice') sfx.thud();
      else if (ev.perfect) {
        const c = Math.min(ev.combo, 12);
        sfx.perfect(ev.combo);
        burst(ev.x, ev.y + 10, 16 + c * 4, c >= 5 ? '#E63946' : COL.sun, 240 + c * 20);
        floaters.push({ x: ev.x, y: ev.y + 60, text: ev.combo > 1 ? 'Parfait ×' + ev.combo + ' !' : 'Parfait !', life: 1, col: c >= 5 ? '#E63946' : COL.sun });
        if (!reduced.matches) shake = 0.18 + c * 0.02;
      } else {
        sfx.boing();
        burst(ev.x, ev.y + 6, 7, '#FFFFFF', 140);
      }
    } else if (ev.type === 'late') {
      sfx.perfect(sim.combo);
      burst(ev.x, ev.y, 14, COL.sun, 240);
      floaters.push({ x: ev.x, y: ev.y + 60, text: 'Bien joué !', life: 1, col: COL.sun });
    } else if (ev.type === 'fish') {
      if (ev.gold) { sfx.gold(); floaters.push({ x: ev.x, y: ev.y + 30, text: '+5', life: 0.8, col: COL.gold }); }
      else sfx.fish();
      burst(ev.x, ev.y, 4, ev.gold ? COL.gold : COL.fish, 90);
    } else if (ev.type === 'splash') {
      sfx.splash();
      burst(ev.x, ev.y + 4, 14, COL.water, 200);
    } else if (ev.type === 'over') {
      endT = 0;
      endSink = ev.reason === 'splash';
      if (endSink) { sfx.splash(); burst(sim.x, sim.y + 8, 26, COL.water, 280); burst(sim.x, sim.y + 8, 10, '#FFFFFF', 200); }
      else sfx.boing();
      resultTimer = window.setTimeout(showResult, 1200);
    }
  }
  sim.events.length = 0;
}

// ---- boucle -----------------------------------------------------------------------------------------
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) {
    acc += dt;
    while (acc >= STEP) {
      step(sim);
      acc -= STEP;
      if (sim.events.length) handleEvents();
    }
  } else acc = 0;
  update(dt);
  render(now / 1000);
}

function update(dt: number): void {
  const viewW = W / scale;
  const targetX = sim.phase === 'aim' ? -viewW * 0.26 : Math.max(-viewW * 0.26, sim.x - viewW * 0.26);
  camX += (targetX - camX) * Math.min(1, dt * (sim.phase === 'aim' ? 8 : 7));
  const hs = (groundY - H * 0.28) / scale;
  const targetY = Math.max(0, sim.y - hs);
  camY += (targetY - camY) * Math.min(1, dt * 4);
  for (const p of particles) {
    p.life -= dt;
    p.vy -= GRAVITY * 0.5 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const f of floaters) { f.life -= dt; f.y += 40 * dt; }
  floaters = floaters.filter((f) => f.life > 0);
  shake = Math.max(0, shake - dt);
  if (sim.phase === 'over') {
    endT += dt;
    // il glisse en ralentissant doucement jusqu'à l'arrêt (aucun rebond, aucun tremblement)
    if (!endSink) { sim.x += sim.vx * dt; sim.vx *= Math.exp(-7 * dt); }
  }
  if (sim.phase === 'fly') {
    $('fish-n').textContent = String(earned(sim));
    const d = distance(sim);
    $('dist').textContent = d + ' m';
    if (sim.combo !== lastCombo) {
      lastCombo = sim.combo;
      const cb = $('combo');
      cb.textContent = 'Combo ×' + sim.combo;
      cb.classList.toggle('hidden', sim.combo < 2);
      if (sim.combo >= 2 && !reduced.matches) { cb.classList.remove('wiggle'); void cb.offsetWidth; cb.classList.add('wiggle'); }
    }
    if (!recordShown && save.best > 0 && d > save.best) {
      recordShown = true;
      sfx.record();
      burst(sim.x, sim.y + 20, 60, COL.sun, 380);
      burst(sim.x, sim.y + 20, 30, COL.fish, 300);
      floaters.push({ x: sim.x, y: sim.y + 90, text: 'NOUVEAU RECORD !', life: 2, col: COL.sun });
      if (!reduced.matches) shake = 0.5;
      $('rec').textContent = 'Record battu !';
      $('rec').classList.add('wiggle', '!bg-orange', 'text-white');
    }
  }
}

function render(t: number): void {
  const c = g;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gy = groundY + camY * scale;
  c.save();
  if (shake > 0) c.translate((Math.random() - 0.5) * 8 * shake * 5, (Math.random() - 0.5) * 8 * shake * 5);
  drawBackdrop(c, W, H, gy, camX, camY, scale);
  drawGround(c, W, H, gy, camX, scale);
  c.save();
  c.translate(-camX * scale, gy);
  c.scale(scale, -scale);
  c.lineJoin = 'round';
  const viewW = W / scale;
  drawWorld(c, sim.world, camX, viewW, sim.t, { sling: true });

  if (sim.phase === 'aim') drawAim(c);
  else drawFlight(c, t);

  for (const p of particles) {
    c.globalAlpha = Math.max(0, p.life / p.max);
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = p.col;
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();

  for (const f of floaters) {
    const sx = (f.x - camX) * scale;
    const sy = gy - f.y * scale;
    c.globalAlpha = Math.min(1, f.life * 2);
    c.font = '700 ' + Math.round(26 * Math.max(scale, 0.8)) + 'px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 6;
    c.strokeStyle = INK;
    c.lineJoin = 'round';
    c.strokeText(f.text, sx, sy);
    c.fillStyle = f.col;
    c.fillText(f.text, sx, sy);
  }
  c.globalAlpha = 1;
  c.restore();
}

function drawAim(c: CanvasRenderingContext2D): void {
  const a = aim ?? { angle: 0.85, power: 0 };
  const pull = a.power;
  // le pingouin recule dans la fronde, à l'opposé du tir
  const px = -Math.cos(a.angle) * pull * 46;
  const py = ANCHOR_Y - Math.sin(a.angle) * pull * 46;
  // le dessin du pingouin est en y vers le bas
  drawBand(c, px, py);
  c.save();
  c.translate(px, py);
  c.scale(1, -1);
  c.scale(1, 1);
  drawPenguin(c, outfit(), -a.angle, pull > 0.05 ? 1 : 0);
  c.restore();
  if (pull > 0.1) {
    const sp = launchSpeed(Math.max(0.35, pull), save.up.power);
    const vx = Math.cos(a.angle) * sp;
    const vy = Math.sin(a.angle) * sp;
    for (let i = 1; i <= 14; i++) {
      const tt = i * 0.07;
      const x = vx * tt;
      const y = ANCHOR_Y + vy * tt - 0.5 * GRAVITY * tt * tt;
      if (y < 4) break;
      c.beginPath();
      c.arc(x, y, Math.max(2.5, 7 - i * 0.3), 0, Math.PI * 2);
      c.fillStyle = '#FFFFFF';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = INK;
      c.stroke();
    }
  }
}

/** Petites étoiles qui tournent au-dessus de la tête du pingouin étourdi. */
function drawStars(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const fade = Math.max(0, Math.min(1, (1.2 - t) * 4));
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + (i * Math.PI * 2) / 3;
    const sx = x + Math.cos(a) * 26;
    const sy = y + Math.sin(a) * 8;
    c.save();
    c.globalAlpha = fade;
    c.translate(sx, sy);
    c.rotate(a);
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 4 : 9;
      c.lineTo(Math.cos((k * Math.PI) / 5) * r, Math.sin((k * Math.PI) / 5) * r);
    }
    c.closePath();
    c.fillStyle = COL.sun;
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    c.restore();
  }
}

function drawFlight(c: CanvasRenderingContext2D, t: number): void {
  if (sim.phase === 'fly' && !sim.grounded) {
    const p = predictBounce(sim);
    if (p && p.t < 0.7) {
      const ready = p.t < window_(save.up.bounce);
      drawRing(c, p.x, p.y + (p.kind === 'seal' ? 24 : 40), p.t / 0.7, ready);
    }
  }
  const rot = sim.grounded ? 0 : -Math.max(-0.9, Math.min(0.9, Math.atan2(sim.vy, sim.vx) * 0.8));
  c.save();
  c.translate(sim.x, sim.y + 20);
  c.scale(1, -1);
  c.scale(1, 1);
  const over = sim.phase === 'over';
  if (over && endSink) {
    const k = Math.min(1, endT / 0.7);
    c.globalAlpha = 1 - k;
    c.translate(0, -34 * k);
  }
  drawPenguin(c, outfit(), rot, over ? 1 : 0, over ? 0 : t * 3);
  c.restore();
  if (over && !endSink) drawStars(c, sim.x, sim.y + 62, endT);
}

// ---- démarrage --------------------------------------------------------------------------------------
paintStatic();
refreshHud();
if (!saved.persistent) $('hint').textContent = 'Tire en arrière, puis lâche ! (progression non sauvegardée)';
last = performance.now();
requestAnimationFrame(frame);
if (!save.tutoSeen) openTuto();
window.addEventListener('pagehide', () => window.clearTimeout(resultTimer));
