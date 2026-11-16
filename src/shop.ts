import { MAX_LEVEL } from './config';

export type Shelf = 'hat' | 'scarf' | 'glasses';
export type UpgradeId = 'power' | 'bounce' | 'magnet';

export interface Cosmetic {
  id: string;
  shelf: Shelf;
  name: string;
  desc: string;
  price: number;
}

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  base: number;
}

export const SHELVES: { id: Shelf; label: string }[] = [
  { id: 'hat', label: 'Bonnets' },
  { id: 'scarf', label: 'Écharpes' },
  { id: 'glasses', label: 'Lunettes' },
];

export const UPGRADES: Upgrade[] = [
  { id: 'power', name: 'Fronde costaude', desc: 'Ton lancer part 10 % plus vite à chaque niveau.', base: 25 },
  { id: 'bounce', name: 'Rebonds élastiques', desc: 'Les rebonds gardent plus d\'élan et le bon moment dure plus longtemps.', base: 30 },
  { id: 'magnet', name: 'Aimant à poissons', desc: 'Les poissons viennent à toi de plus loin.', base: 20 },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'hat.none', shelf: 'hat', name: 'Tête nue', desc: 'Le pingouin au naturel.', price: 0 },
  { id: 'hat.red', shelf: 'hat', name: 'Bonnet rouge', desc: 'Bien chaud pour les longues glissades.', price: 40 },
  { id: 'hat.pompom', shelf: 'hat', name: 'Bonnet à pompon', desc: 'Un gros pompon jaune qui rebondit avec toi.', price: 70 },
  { id: 'hat.stripe', shelf: 'hat', name: 'Bonnet rayé', desc: 'Vert et blanc, comme une friandise.', price: 90 },
  { id: 'hat.chef', shelf: 'hat', name: 'Toque de chef', desc: 'Pour un pingouin qui cuisine ses poissons.', price: 130 },
  { id: 'scarf.none', shelf: 'scarf', name: 'Cou libre', desc: 'Pas d\'écharpe, tout léger.', price: 0 },
  { id: 'scarf.red', shelf: 'scarf', name: 'Écharpe rouge', desc: 'Un classique qui claque au vent.', price: 40 },
  { id: 'scarf.stripe', shelf: 'scarf', name: 'Écharpe rayée', desc: 'Orange et jaune, impossible de te rater.', price: 70 },
  { id: 'scarf.pink', shelf: 'scarf', name: 'Écharpe rose', desc: 'Douce comme un nuage de neige.', price: 90 },
  { id: 'scarf.long', shelf: 'scarf', name: 'Écharpe interminable', desc: 'Elle flotte loin derrière toi.', price: 140 },
  { id: 'glasses.none', shelf: 'glasses', name: 'Yeux nus', desc: 'Pas de lunettes.', price: 0 },
  { id: 'glasses.round', shelf: 'glasses', name: 'Lunettes rondes', desc: 'Un air de pingouin savant.', price: 40 },
  { id: 'glasses.sun', shelf: 'glasses', name: 'Lunettes de soleil', desc: 'La glace brille fort, protège-toi.', price: 80 },
  { id: 'glasses.ski', shelf: 'glasses', name: 'Masque de ski', desc: 'Un grand verre jaune pour foncer.', price: 110 },
  { id: 'glasses.heart', shelf: 'glasses', name: 'Lunettes cœur', desc: 'Tout te paraît adorable.', price: 150 },
];

export const DEFAULTS: Record<Shelf, string> = { hat: 'hat.none', scarf: 'scarf.none', glasses: 'glasses.none' };

export function itemById(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function upgradeById(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}

export function upgradeCost(id: UpgradeId, level: number): number {
  const u = upgradeById(id)!;
  return Math.round(u.base * Math.pow(1.75, level));
}

/** Les données dont la boutique a besoin (sous-ensemble de la sauvegarde). */
export interface Wallet {
  coins: number;
  owned: string[];
  equipped: Record<Shelf, string>;
  up: Record<UpgradeId, number>;
}

export function buyUpgrade(s: Wallet, id: UpgradeId): 'ok' | 'poor' | 'max' {
  const lvl = s.up[id];
  if (lvl >= MAX_LEVEL) return 'max';
  const cost = upgradeCost(id, lvl);
  if (s.coins < cost) return 'poor';
  s.coins -= cost;
  s.up[id] = lvl + 1;
  return 'ok';
}

export function buy(s: Wallet, id: string): 'ok' | 'poor' | 'owned' | 'unknown' {
  const it = itemById(id);
  if (!it) return 'unknown';
  if (s.owned.includes(id)) return 'owned';
  if (s.coins < it.price) return 'poor';
  s.coins -= it.price;
  s.owned.push(id);
  s.equipped[it.shelf] = id;
  return 'ok';
}

export function equip(s: Wallet, id: string): boolean {
  const it = itemById(id);
  if (!it || !s.owned.includes(id)) return false;
  s.equipped[it.shelf] = id;
  return true;
}

/** Le moins cher des achats encore possibles avec `coins` (pour le message de fin de partie). */
export function nextAffordable(s: Wallet): string | null {
  let best: { label: string; cost: number } | null = null;
  for (const u of UPGRADES) {
    if (s.up[u.id] >= MAX_LEVEL) continue;
    const cost = upgradeCost(u.id, s.up[u.id]);
    if (cost <= s.coins && (!best || cost < best.cost)) best = { label: u.name, cost };
  }
  for (const c of COSMETICS) {
    if (s.owned.includes(c.id) || c.price > s.coins) continue;
    if (!best || c.price < best.cost) best = { label: c.name, cost: c.price };
  }
  return best ? best.label : null;
}
