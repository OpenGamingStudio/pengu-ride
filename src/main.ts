import './style.css';
import { Sound } from './audio';
import { BIOMES, biomeIndexAt } from './biomes';
import { computeScale, draw, palette, pengu, type Fx, type View } from './render';
import { buy, load, store, type Save } from './save';
import { distM, newGame, step, type Cause, type Game } from './sim';
import { SKINS, skinById } from './skins';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} manquant`);
  return el as T;
};

type Mode = 'menu' | 'shop' | 'play' | 'pause' | 'over';
const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const sound = new Sound();
const save: Save = load();
sound.on = save.sound;
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let mode: Mode = 'menu';
let prevMode: Mode = 'menu'; // d'où l'on est venu dans la boutique
let game: Game = newGame(1);
let seed = (Date.now() & 0xffff) + 1;
let lean = 0;
let jumpQueued = false;
let holdTimer = 0;
const keys = new Set<string>();
const fx: Fx[] = [];
let shake = 0;
let shownBiome = 0;
let fromBiome = 0;
let blend = 1;
let lastFishAnnounce = 0;
let lastMilestone = 0;

const reduced = () => save.reduced || motionQuery.matches;
const view: View = { w: 0, h: 0, scale: 1, reduced: false, pal: BIOMES[0], skin: skinById(save.equipped), fx, shake: 0 };

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  view.w = canvas.width = Math.round(canvas.clientWidth * dpr);
  view.h = canvas.height = Math.round(canvas.clientHeight * dpr);
  view.scale = computeScale(view.w, view.h);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

function live(msg: string): void {
  $('live').textContent = msg;
}

function setMode(m: Mode): void {
  mode = m;
  const show = (id: string, on: boolean) => ($(id).hidden = !on);
  show('menu', m === 'menu');
  show('shop', m === 'shop');
  show('hud', m === 'play' || m === 'pause');
  show('pause', m === 'pause');
  show('over', m === 'over');
  $('hint-box').hidden = true;
  const focusId = { menu: 'menu-title', shop: 'shop-title', pause: 'pause-title', over: 'over-title', play: '' }[m];
  if (focusId) $(focusId).focus({ preventScroll: true });
  if (m === 'menu') refreshMenu();
  if (m === 'shop') renderShop();
}

function refreshMenu(): void {
  $('menu-best').textContent = String(save.best);
  $('menu-fish').textContent = String(save.fish);
  const s = $('btn-sound');
  s.textContent = `Sons : ${save.sound ? 'oui' : 'non'}`;
  s.setAttribute('aria-pressed', String(save.sound));
  const m = $('btn-motion');
  m.textContent = `Mouvements réduits : ${save.reduced ? 'oui' : 'non'}`;
  m.setAttribute('aria-pressed', String(save.reduced));
  document.documentElement.classList.toggle('rm', reduced());
}

function startGame(): void {
  seed = (seed * 1103515245 + 12345) >>> 0;
  game = newGame(seed);
  fx.length = 0;
  lean = 0;
  jumpQueued = false;
  shownBiome = fromBiome = 0;
  blend = 1;
  lastFishAnnounce = 0;
  lastMilestone = 0;
  view.skin = skinById(save.equipped);
  $('hud-dist').textContent = '0';
  $('hud-fish').textContent = '0';
  $('hud-biome').textContent = BIOMES[0].name;
  setMode('play');
  $('hint-box').hidden = false;
  window.setTimeout(() => ($('hint-box').hidden = true), 3500);
  live('C\'est parti ! Touche pour sauter, maintiens pour foncer.');
}

const CAUSE: Record<Cause, string> = { rock: 'Tu as heurté un rocher.', seal: 'Un phoque t\'a arrêté.', hole: 'Tu es tombé dans un trou.' };

function endGame(): void {
  const d = distM(game.x);
  const record = d > save.best;
  if (record) save.best = d;
  save.fish += game.fish;
  store(save);
  $('over-cause').textContent = game.over ? CAUSE[game.over] : '';
  $('over-dist').textContent = String(d);
  $('over-fish').textContent = String(game.fish);
  $('over-record').textContent = record ? 'Nouveau record !' : `Record : ${save.best} m`;
  setMode('over');
  live(`Fin de partie. ${d} mètres, ${game.fish} poissons. ${CAUSE[game.over ?? 'rock']}`);
}

function pauseGame(): void {
  if (mode !== 'play') return;
  setMode('pause');
  live('Pause');
}
function resumeGame(): void {
  if (mode !== 'pause') return;
  setMode('play');
  last = performance.now();
}

// --- boutique ---
function renderShop(): void {
  $('shop-fish').textContent = String(save.fish);
  const list = $('shop-list');
  list.replaceChildren();
  for (const sk of SKINS) {
    const owned = save.owned.includes(sk.id);
    const on = save.equipped === sk.id;
    const li = document.createElement('li');
    const card = document.createElement('div');
    card.className = `card${on ? ' on' : ''}`;
    const cv = document.createElement('canvas');
    cv.width = 160;
    cv.height = 100;
    cv.className = 'h-20 w-32';
    cv.setAttribute('aria-hidden', 'true');
    const c = cv.getContext('2d');
    if (c) {
      c.fillStyle = '#cdeeff';
      c.fillRect(0, 0, 160, 100);
      c.fillStyle = '#f4fbff';
      c.fillRect(0, 76, 160, 24);
      c.translate(70, 78);
      c.scale(1.3, 1.3);
      pengu(c, { vy: 0, lean: 0, grounded: true, t: 0, speed: 0 }, sk, true);
    }
    const name = document.createElement('p');
    name.className = 'text-lg font-bold leading-tight';
    name.textContent = sk.name;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sun w-full text-base';
    if (on) {
      btn.textContent = 'Équipé';
      btn.disabled = true;
      btn.setAttribute('aria-label', `${sk.name} : équipé`);
    } else if (owned) {
      btn.textContent = 'Équiper';
      btn.className = 'btn btn-sky w-full text-base';
      btn.setAttribute('aria-label', `Équiper ${sk.name}`);
      btn.addEventListener('click', () => {
        save.equipped = sk.id;
        store(save);
        sound.click();
        renderShop();
        $(`skin-${sk.id}`)?.focus();
      });
    } else {
      btn.textContent = `Acheter ${sk.price} poissons`;
      btn.setAttribute('aria-label', `Acheter ${sk.name} pour ${sk.price} poissons`);
      btn.disabled = save.fish < sk.price;
      btn.addEventListener('click', () => {
        const next = buy(save, sk.id);
        if (!next) return;
        Object.assign(save, next);
        store(save);
        sound.buy();
        live(`${sk.name} acheté et équipé.`);
        renderShop();
        $(`skin-${sk.id}`)?.focus();
      });
    }
    btn.id = `skin-${sk.id}`;
    card.append(cv, name, btn);
    li.append(card);
    list.append(li);
  }
}

// --- entrées ---
let downAt = 0;
let downX = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  e.preventDefault();
  sound.unlock();
  canvas.setPointerCapture(e.pointerId);
  downAt = performance.now();
  downX = e.clientX;
  jumpQueued = true;
  window.clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => (lean = Math.max(lean, 1)), 160);
});
canvas.addEventListener('pointermove', (e) => {
  if (mode !== 'play' || !downAt) return;
  const dx = e.clientX - downX;
  if (dx < -24) {
    window.clearTimeout(holdTimer);
    lean = -1;
  } else if (dx > 24) lean = 1;
});
const release = () => {
  window.clearTimeout(holdTimer);
  downAt = 0;
  lean = 0;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.repeat && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) return;
  if (mode === 'play') {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      sound.unlock();
      jumpQueued = true;
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'KeyA', 'KeyD', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    } else if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
  } else if (mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resumeGame();
  if (e.code === 'KeyM' && (mode === 'play' || mode === 'pause')) toggleSound();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); release(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

function keyLean(): number {
  const back = keys.has('ArrowLeft') || keys.has('KeyA');
  const fwd = keys.has('ArrowRight') || keys.has('ArrowDown') || keys.has('KeyD') || keys.has('KeyS');
  return back ? -1 : fwd ? 1 : 0;
}

function toggleSound(): void {
  save.sound = !save.sound;
  sound.on = save.sound;
  store(save);
  sound.unlock();
  sound.click();
  refreshMenu();
  live(save.sound ? 'Sons activés' : 'Sons coupés');
}

$('btn-play').addEventListener('click', () => { sound.unlock(); sound.click(); startGame(); });
$('btn-shop').addEventListener('click', () => { sound.unlock(); sound.click(); prevMode = 'menu'; setMode('shop'); });
$('btn-over-shop').addEventListener('click', () => { sound.click(); prevMode = 'over'; setMode('shop'); });
$('btn-shop-back').addEventListener('click', () => { sound.click(); setMode(prevMode === 'over' ? 'over' : 'menu'); });
$('btn-sound').addEventListener('click', toggleSound);
$('btn-motion').addEventListener('click', () => { save.reduced = !save.reduced; store(save); sound.unlock(); sound.click(); refreshMenu(); });
$('btn-pause').addEventListener('click', () => { sound.click(); pauseGame(); });
$('btn-resume').addEventListener('click', () => { sound.click(); resumeGame(); });
$('btn-pause-menu').addEventListener('click', () => { sound.click(); endRun(); });
$('btn-retry').addEventListener('click', () => { sound.click(); startGame(); });
$('btn-over-menu').addEventListener('click', () => { sound.click(); setMode('menu'); });
motionQuery.addEventListener('change', refreshMenu);

/** Quitter en cours de partie : les poissons ramassés sont gardés. */
function endRun(): void {
  save.fish += game.fish;
  const d = distM(game.x);
  if (d > save.best) save.best = d;
  store(save);
  setMode('menu');
}

// --- boucle ---
let last = performance.now();
let acc = 0;
const DT = 1 / 60;

function burst(x: number, n: number, c: string, up: number): void {
  if (reduced()) return;
  for (let i = 0; i < n; i++) fx.push({ x: x - 20 + Math.random() * 10, y: 2, vx: -60 - Math.random() * 120, vy: up * (0.3 + Math.random()), life: 0.5, c, r: 2 + Math.random() * 2 });
}

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (mode === 'play') {
    acc += dt;
    while (acc >= DT && mode === 'play') {
      acc -= DT;
      const l = keyLean() || lean;
      step(game, DT, { jump: jumpQueued, lean: l });
      jumpQueued = false;
      handle();
    }
  }
  for (const f of fx) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy -= 500 * dt;
    f.life -= dt;
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  shake = Math.max(0, shake - dt * 2.5);
  if (blend < 1) blend = reduced() ? 1 : Math.min(1, blend + dt / 0.9);
  view.pal = palette(fromBiome, shownBiome, blend);
  view.reduced = reduced();
  view.shake = shake;
  draw(ctx, game, view);
  requestAnimationFrame(frame);
}

function handle(): void {
  for (const ev of game.events) {
    if (ev === 'jump') { sound.jump(); burst(game.x, 5, '#ffffff', 160); }
    else if (ev === 'land') { sound.land(); burst(game.x, 4, '#ffffff', 90); }
    else if (ev === 'fish') sound.fish();
    else if (ev === 'boost') { sound.boost(); live('Glace turbo !'); }
    else if (ev === 'hit') { sound.hit(); shake = 1; burst(game.x, 12, '#14213d', 260); }
  }
  if (game.t * 60 % 6 < 1 && game.grounded && game.speed > 0 && !reduced()) burst(game.x, 1, '#ffffff', 40);
  $('hud-dist').textContent = String(distM(game.x));
  $('hud-fish').textContent = String(game.fish);
  const b = biomeIndexAt(game.x);
  if (b !== shownBiome) {
    fromBiome = shownBiome;
    shownBiome = b;
    blend = 0;
    $('hud-biome').textContent = BIOMES[b].name;
    banner(BIOMES[b].name);
    sound.biome();
    live(`Nouvelle zone : ${BIOMES[b].name}`);
  }
  const m = Math.floor(distM(game.x) / 100);
  if (m > lastMilestone && m % 2 === 0) { lastMilestone = m; live(`${m * 100} mètres`); }
  if (game.fish - lastFishAnnounce >= 10) { lastFishAnnounce = game.fish; live(`${game.fish} poissons`); }
  if (game.over) endGame();
}

function banner(text: string): void {
  const el = $('banner');
  el.replaceChildren();
  const p = document.createElement('p');
  p.className = 'banner panel px-6 py-2 text-3xl font-bold';
  p.textContent = text;
  el.append(p);
  el.hidden = false;
  window.setTimeout(() => (el.hidden = true), 1800);
}

resize();
setMode('menu');
requestAnimationFrame(frame);

