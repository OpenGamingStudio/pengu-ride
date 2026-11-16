import { MAX_LEVEL, SAVE_KEY, SAVE_VERSION } from './config';
import { DEFAULTS, itemById, type Shelf, type UpgradeId } from './shop';

export interface SaveData {
  v: number;
  best: number;
  coins: number;
  totalFish: number;
  games: number;
  owned: string[];
  equipped: Record<Shelf, string>;
  up: Record<UpgradeId, number>;
  tutoSeen: boolean;
  settings: { sound: boolean };
}

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function freshSave(): SaveData {
  return {
    v: SAVE_VERSION,
    best: 0,
    coins: 0,
    totalFish: 0,
    games: 0,
    owned: Object.values(DEFAULTS),
    equipped: { ...DEFAULTS },
    up: { power: 0, bounce: 0, glide: 0, magnet: 0, fishx: 0 },
    tutoSeen: false,
    settings: { sound: true },
  };
}

const int = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

/** Nettoie un objet lu : entiers >= 0, ids inconnus retirés, équipement non possédé remis au défaut. */
export function sanitize(raw: Record<string, unknown>): SaveData {
  const s = freshSave();
  s.best = int(raw.best);
  s.coins = int(raw.coins);
  s.totalFish = int(raw.totalFish);
  s.games = int(raw.games);
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) if (typeof id === 'string' && itemById(id) && !s.owned.includes(id)) s.owned.push(id);
  }
  const eq = (raw.equipped ?? {}) as Record<string, unknown>;
  for (const shelf of Object.keys(DEFAULTS) as Shelf[]) {
    const id = eq[shelf];
    if (typeof id === 'string' && s.owned.includes(id) && itemById(id)?.shelf === shelf) s.equipped[shelf] = id;
  }
  const up = (raw.up ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(s.up) as UpgradeId[]) s.up[k] = Math.min(MAX_LEVEL, int(up[k]));
  s.tutoSeen = raw.tutoSeen === true;
  const st = (raw.settings ?? {}) as Record<string, unknown>;
  if (typeof st.sound === 'boolean') s.settings.sound = st.sound;
  return s;
}

export interface Loaded {
  data: SaveData;
  /** false : version future, on n'écrit pas pour ne rien abîmer. */
  writable: boolean;
  /** false : stockage indisponible (navigation privée) : « progression non sauvegardée ». */
  persistent: boolean;
}

export function load(store: Store | null): Loaded {
  if (!store) return { data: freshSave(), writable: true, persistent: false };
  let text: string | null;
  try {
    text = store.getItem(SAVE_KEY);
  } catch {
    return { data: freshSave(), writable: true, persistent: false };
  }
  if (text === null) return { data: freshSave(), writable: true, persistent: true };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('forme');
  } catch {
    try {
      store.setItem(SAVE_KEY + '.corrupt', text);
    } catch {
      /* rien de plus à faire */
    }
    return { data: freshSave(), writable: true, persistent: true };
  }
  const obj = raw as Record<string, unknown>;
  const v = int(obj.v) || 1;
  const data = sanitize(obj);
  if (v > SAVE_VERSION) return { data, writable: false, persistent: true };
  data.v = SAVE_VERSION;
  return { data, writable: true, persistent: true };
}

export function write(store: Store | null, loaded: Loaded): boolean {
  if (!store || !loaded.writable) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(loaded.data));
    return true;
  } catch {
    return false;
  }
}
