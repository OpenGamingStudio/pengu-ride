// Sauvegarde locale (localStorage) : lue avec validation, jamais de crash si le contenu est abîmé.
import { SKINS } from './skins';

export interface Save {
  best: number;
  fish: number;
  owned: string[];
  equipped: string;
  sound: boolean;
  reduced: boolean;
}

export const SAVE_KEY = 'pengu-ride-save-v1';
export const defaults = (): Save => ({ best: 0, fish: 0, owned: ['classic'], equipped: 'classic', sound: true, reduced: false });

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

export function parseSave(raw: string | null): Save {
  const d = defaults();
  if (!raw) return d;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object') return d;
    const ids = new Set(SKINS.map((s) => s.id));
    const owned = Array.isArray(o.owned) ? o.owned.filter((s): s is string => typeof s === 'string' && ids.has(s)) : [];
    if (!owned.includes('classic')) owned.unshift('classic');
    const equipped = typeof o.equipped === 'string' && owned.includes(o.equipped) ? o.equipped : 'classic';
    return {
      best: num(o.best),
      fish: num(o.fish),
      owned: [...new Set(owned)],
      equipped,
      sound: o.sound !== false,
      reduced: o.reduced === true,
    };
  } catch {
    return d;
  }
}

export function load(): Save {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return defaults();
  }
}

export function store(s: Save): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* stockage plein ou interdit : on joue quand même */
  }
}

/** Achat : renvoie la sauvegarde mise à jour, ou null si impossible. */
export function buy(s: Save, id: string): Save | null {
  const sk = SKINS.find((k) => k.id === id);
  if (!sk || s.owned.includes(id) || s.fish < sk.price) return null;
  return { ...s, fish: s.fish - sk.price, owned: [...s.owned, id], equipped: id };
}
