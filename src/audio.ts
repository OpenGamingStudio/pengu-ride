/** Petits sons synthétisés (aucun fichier). Le contexte audio ne démarre qu'après un geste du joueur. */
let ctx: AudioContext | null = null;
let on = true;

export function setSound(v: boolean): void {
  on = v;
}

function ac(): AudioContext | null {
  if (!on) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  unlock: () => void ac(),
  launch: () => tone(180, 620, 0.22, 'triangle', 0.18),
  boing: () => tone(260, 520, 0.16, 'sine', 0.2),
  /** Le son monte d'un demi-ton environ à chaque rebond parfait d'affilée. */
  perfect: (combo = 1) => {
    const k = Math.pow(1.06, Math.min(Math.max(combo, 1) - 1, 18));
    tone(420 * k, 840 * k, 0.14, 'triangle', 0.22);
    tone(630 * k, 1260 * k, 0.18, 'triangle', 0.18, 0.08);
  },
  record: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.01, 0.22, 'triangle', 0.2, i * 0.09));
  },
  fish: () => tone(880, 1320, 0.08, 'square', 0.07),
  gold: () => { tone(988, 1480, 0.1, 'square', 0.08); tone(1480, 1976, 0.14, 'square', 0.08, 0.07); },
  thud: () => tone(140, 60, 0.12, 'sine', 0.18),
  splash: () => tone(500, 120, 0.25, 'sawtooth', 0.07),
  buy: () => { tone(520, 780, 0.1, 'triangle', 0.2); tone(780, 1040, 0.14, 'triangle', 0.2, 0.09); },
  no: () => tone(220, 160, 0.14, 'square', 0.08),
};
