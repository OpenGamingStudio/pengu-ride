/** Panneaux : fin de partie, boutique, mini-tuto. DOM construit sans innerHTML (aucun texte non fiable). */
import { MAX_LEVEL, VERSION } from './config';
import { paintIcon, paintOutfit } from './draw';
import type { SaveData } from './save';
import {
  buy, buyUpgrade, COSMETICS, cheapestUpgrade, equip, rarity, SHELVES, UPGRADES, upgradeCost, type Shelf, type UpgradeId,
} from './shop';
import { sfx } from './audio';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function icon(kind: Parameters<typeof paintIcon>[1], id: string, size: number, cls = ''): HTMLCanvasElement {
  const c = el('canvas', cls);
  c.style.width = c.style.height = size + 'px';
  paintIcon(c, kind, id, size);
  c.setAttribute('aria-hidden', 'true');
  return c;
}

function fishCost(n: number): HTMLElement {
  const s = el('span', 'inline-flex items-center gap-1');
  s.append(icon('fish', 'fish', 22), el('b', '', String(n)));
  return s;
}

function dialog(title: string, label: string): { box: HTMLElement; head: HTMLElement } {
  const box = el('section', 'panel pop my-auto w-full max-w-md landscape:max-w-3xl landscape:p-3');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', label);
  const head = el('div', 'mb-3 flex items-center justify-between gap-2');
  head.append(el('h2', 'text-3xl font-bold leading-none', title));
  box.append(head);
  return { box, head };
}

export interface ResultInfo {
  dist: number;
  fish: number;
  gold: number;
  /** Poissons gagnés (multiplicateur compris). */
  gained: number;
  perfects: number;
  maxCombo: number;
  record: boolean;
  best: number;
  coins: number;
}

export function resultPanel(r: ResultInfo, save: SaveData, onAgain: () => void, onShop: (highlight: UpgradeId | null) => void): HTMLElement {
  const { box, head } = dialog('Glissade finie !', 'Résultat de la partie');
  head.firstElementChild!.className = 'text-3xl font-bold leading-none';
  const body = el('div', 'flex flex-col gap-3 landscape:flex-row landscape:items-center');
  const left = el('div', 'flex flex-1 flex-col items-center gap-2 rounded-2xl border-[3px] border-ink bg-sky p-3');
  const big = el('b', 'text-6xl font-bold leading-none text-white [text-shadow:0_4px_0_var(--color-ink)]', r.dist + ' m');
  left.append(big);
  if (r.record) {
    const tag = el('span', 'wiggle rounded-full border-[3px] border-ink bg-sun px-3 py-1 text-lg font-bold', 'Nouveau record !');
    left.append(tag);
  } else {
    left.append(el('span', 'rounded-full border-[3px] border-ink bg-white px-3 py-1 text-base font-semibold', 'Record : ' + r.best + ' m'));
  }
  const right = el('div', 'flex flex-1 flex-col gap-3');
  const stats = el('ul', 'flex flex-col gap-1.5 text-lg font-semibold');
  const li = (txt: string, extra?: HTMLElement) => {
    const l = el('li', 'flex items-center justify-between gap-2 rounded-xl border-[3px] border-ink bg-white px-3 py-1.5');
    l.append(el('span', '', txt));
    if (extra) l.append(extra);
    stats.append(l);
  };
  li('Poissons gagnés', fishCost(r.gained));
  if (r.gold) li('Dont poissons dorés', el('b', '', '×' + r.gold));
  li('Rebonds parfaits', el('b', '', r.perfects + ' (combo max ×' + r.maxCombo + ')'));
  li('Tes poissons en tout', fishCost(r.coins));
  right.append(stats);
  const next = cheapestUpgrade(save);
  if (next) {
    const ok = save.coins >= next.cost;
    const wrap = el('div', 'rounded-xl border-[3px] border-ink bg-white px-3 py-2');
    wrap.append(el('p', 'text-center text-base font-semibold', (ok ? 'Tu peux acheter : ' : 'Prochain achat : ') + next.name));
    const bar = el('div', 'mt-1 h-5 overflow-hidden rounded-full border-[3px] border-ink bg-white');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(next.cost));
    bar.setAttribute('aria-valuenow', String(Math.min(save.coins, next.cost)));
    const fill = el('i', 'block h-full ' + (ok ? 'bg-mint' : 'bg-orange'));
    fill.style.width = Math.min(100, Math.round((save.coins / next.cost) * 100)) + '%';
    bar.append(fill);
    wrap.append(bar, el('p', 'mt-1 text-center text-sm font-semibold', Math.min(save.coins, next.cost) + ' / ' + next.cost + ' poissons'));
    right.append(wrap);
  }
  body.append(left, right);
  const actions = el('div', 'mt-4 flex flex-col gap-3 landscape:flex-row landscape:mt-3');
  const again = el('button', 'btn btn-main w-full landscape:flex-[2] landscape:!min-h-14', 'Rejouer');
  again.type = 'button';
  again.addEventListener('click', onAgain);
  const shop = el('button', 'btn btn-sun w-full landscape:flex-1', next && save.coins >= next.cost ? 'Améliorer !' : 'Boutique');
  shop.type = 'button';
  shop.addEventListener('click', () => onShop(next && save.coins >= next.cost ? next.id : null));
  actions.append(again, shop);
  box.append(body, actions);
  return box;
}

type Tab = 'up' | Shelf;

export function shopPanel(save: SaveData, onChange: () => void, onClose: () => void, highlight: UpgradeId | null = null): HTMLElement {
  const { box, head } = dialog('Boutique', 'Boutique');
  const coins = el('span', 'pill');
  const close = el('button', 'btn btn-ice !px-0 w-12', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer la boutique');
  close.addEventListener('click', onClose);
  const right = el('div', 'flex items-center gap-2');
  right.append(coins, close);
  head.append(right);

  const tabs = el('div', 'mb-3 grid grid-cols-2 gap-2 min-[480px]:grid-cols-4');
  tabs.setAttribute('role', 'tablist');
  const list = el('ul', 'flex max-h-[52dvh] flex-col gap-2 overflow-y-auto pr-1 landscape:max-h-[44dvh]');
  const tabDefs: { id: Tab; label: string }[] = [{ id: 'up', label: 'Améliorations' }, ...SHELVES];
  let tab: Tab = 'up';

  const render = () => {
    coins.replaceChildren(icon('fish', 'fish', 22), el('b', '', String(save.coins)));
    for (const b of Array.from(tabs.children)) {
      const on = (b as HTMLElement).dataset.tab === tab;
      b.setAttribute('aria-selected', String(on));
      b.className = 'tab btn !min-h-11 !px-2 !text-base ' + (on ? 'btn-sun' : 'btn-ice');
    }
    list.replaceChildren();
    if (tab === 'up') {
      for (const u of UPGRADES) {
        const lvl = save.up[u.id];
        const maxed = lvl >= MAX_LEVEL;
        const cost = upgradeCost(u.id, lvl);
        const btn = el('button', 'btn btn-sun w-full min-[420px]:w-auto');
        btn.type = 'button';
        if (maxed) { btn.textContent = 'Niveau max'; btn.disabled = true; }
        else {
          btn.append(el('span', '', 'Améliorer'), fishCost(cost));
          btn.disabled = save.coins < cost;
          btn.addEventListener('click', () => {
            if (buyUpgrade(save, u.id) === 'ok') { sfx.buy(); onChange(); render(); } else sfx.no();
          });
        }
        const pips = el('span', 'flex gap-1');
        for (let i = 0; i < MAX_LEVEL; i++) pips.append(el('i', 'h-3 w-5 rounded-full border-2 border-ink ' + (i < lvl ? 'bg-orange' : 'bg-white')));
        const li = row(icon('upgrade', u.id, 60), u.name, u.desc, btn, pips);
        if (u.id === highlight) { li.classList.add('!bg-sun'); queueMicrotask(() => li.scrollIntoView({ block: 'nearest' })); }
        list.append(li);
      }
    } else {
      for (const c of COSMETICS.filter((x) => x.shelf === tab)) {
        const owned = save.owned.includes(c.id);
        const worn = save.equipped[c.shelf] === c.id;
        const btn = el('button', 'btn w-full min-[420px]:w-auto ' + (owned ? 'btn-ice' : 'btn-sun'));
        btn.type = 'button';
        if (worn) { btn.textContent = 'Porté'; btn.disabled = true; }
        else if (owned) {
          btn.textContent = 'Porter';
          btn.addEventListener('click', () => { equip(save, c.id); sfx.buy(); onChange(); render(); });
        } else {
          btn.append(el('span', '', 'Acheter'), fishCost(c.price));
          btn.disabled = save.coins < c.price;
          btn.addEventListener('click', () => {
            if (buy(save, c.id) === 'ok') { sfx.buy(); onChange(); render(); } else sfx.no();
          });
        }
        list.append(row(icon('item', c.id, 60), c.name, c.desc, btn, el('span', 'inline-block rounded-full border-2 border-ink bg-sun px-2 text-sm font-semibold', rarity(c.price))));
      }
    }
  };

  for (const t of tabDefs) {
    const b = el('button', 'tab btn', t.label);
    b.type = 'button';
    b.dataset.tab = t.id;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { tab = t.id; render(); });
    tabs.append(b);
  }
  // aperçu du pingouin équipé, animé tant que la boutique est ouverte
  const view = el('div', 'mb-3 flex items-center justify-center rounded-2xl border-[3px] border-ink bg-sky');
  const pv = el('canvas', 'h-28 w-28 landscape:h-24 landscape:w-24');
  pv.setAttribute('role', 'img');
  pv.setAttribute('aria-label', 'Ton pingouin avec sa tenue');
  view.append(pv);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false;
  const t0 = performance.now();
  const loop = () => {
    if (started && !pv.isConnected) return;
    started = true;
    const px = pv.clientWidth || 112;
    paintOutfit(pv, save.equipped, px, still ? 0 : (performance.now() - t0) / 1000);
    if (!still) requestAnimationFrame(loop);
  };
  const redraw = () => { if (still) loop(); };
  box.append(view, tabs, list, el('p', 'mt-2 text-center text-sm opacity-70', 'Pengu Ride v' + VERSION));
  render();
  requestAnimationFrame(loop);
  list.addEventListener('click', () => queueMicrotask(redraw));
  return box;
}

function row(ic: HTMLElement, name: string, desc: string, action: HTMLElement, extra?: HTMLElement): HTMLElement {
  const li = el('li', 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-[3px] border-ink bg-white p-2');
  const wrap = el('span', 'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-[3px] border-ink bg-sky');
  wrap.append(ic);
  const txt = el('div', 'min-w-[9rem] flex-1');
  txt.append(el('b', 'block text-lg leading-tight', name), el('span', 'block text-base leading-snug', desc));
  if (extra) { extra.classList.add('mt-1'); txt.append(extra); }
  li.append(wrap, txt, action);
  return li;
}

const STEPS: { icon: Parameters<typeof paintIcon>[1]; id: string; title: string; text: string }[] = [
  { icon: 'sling', id: '', title: 'Tire en arrière', text: 'Pose le doigt n\'importe où, tire vers le bas puis lâche. Plus tu tires, plus le pingouin part fort. Les points montrent le trajet.' },
  { icon: 'seal', id: '', title: 'Touche au bon moment', text: 'Sur un phoque ou un iceberg, un cercle se resserre. Touche l\'écran juste avant l\'impact : rebond parfait, plus haut et plus loin ! Un seul lancer par partie : pour aller loin, enchaîne les rebonds parfaits.' },
  { icon: 'fish', id: 'gold', title: 'Ramasse des poissons', text: 'Un poisson vaut 1, un poisson doré vaut 5. C\'est ta monnaie pour la boutique.' },
  { icon: 'upgrade', id: 'power', title: 'Prépare la prochaine', text: 'À la boutique, améliore ta fronde, tes patins, tes rebonds, ton aimant et tes gains de poissons, puis habille ton pingouin de bonnets, écharpes et lunettes.' },
];

export function tutoPanel(onClose: () => void): HTMLElement {
  const { box, head } = dialog('Comment jouer', 'Comment jouer');
  const close = el('button', 'btn btn-ice !px-0 w-12', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer l\'aide');
  close.addEventListener('click', onClose);
  head.append(close);
  const card = el('div', 'flex flex-col items-center gap-3 landscape:flex-row');
  const stage = el('div', 'flex h-36 w-full shrink-0 items-center justify-center rounded-2xl border-[3px] border-ink bg-sky landscape:w-56');
  const info = el('div', 'text-center landscape:text-left');
  const title = el('h3', 'text-2xl font-bold leading-tight');
  const text = el('p', 'mt-1 text-lg leading-snug');
  info.append(title, text);
  card.append(stage, info);
  const dots = el('div', 'mt-3 flex justify-center gap-2');
  const nav = el('div', 'mt-3 flex gap-3');
  const prev = el('button', 'btn btn-ice flex-1', 'Retour');
  const next = el('button', 'btn btn-main !min-h-14 !text-xl flex-[2] !px-4');
  prev.type = next.type = 'button';
  nav.append(prev, next);
  let i = 0;
  const render = () => {
    const s = STEPS[i];
    stage.replaceChildren(icon(s.icon, s.id, 112));
    title.textContent = s.title;
    text.textContent = s.text;
    dots.replaceChildren(...STEPS.map((_, k) => el('i', 'h-3 w-3 rounded-full border-2 border-ink ' + (k === i ? 'bg-orange' : 'bg-white'))));
    prev.style.visibility = i === 0 ? 'hidden' : 'visible';
    next.textContent = i === STEPS.length - 1 ? 'C\'est parti !' : 'Suivant';
  };
  prev.addEventListener('click', () => { i = Math.max(0, i - 1); render(); });
  next.addEventListener('click', () => { if (i === STEPS.length - 1) onClose(); else { i++; render(); } });
  box.append(card, dots, nav);
  render();
  return box;
}
