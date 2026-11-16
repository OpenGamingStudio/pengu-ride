import { describe, expect, it } from 'vitest';
import { newGame, step, inHole, distM, type Game } from '../src/sim';
import { biomeIndexAt } from '../src/biomes';
import { parseSave, buy, defaults } from '../src/save';
import { SKINS } from '../src/skins';

const DT = 1 / 60;

/** Robot : saute au bon moment devant chaque danger. */
function bot(g: Game): boolean {
  let near = Infinity;
  for (const o of g.objs) {
    if (o.kind !== 'rock' && o.kind !== 'seal' && o.kind !== 'hole') continue;
    const d = o.x - g.x;
    if (d > -o.w / 2 - 10 && d < near) near = d;
  }
  return near < g.speed * 0.34 && near > g.speed * 0.2 && g.grounded;
}

function run(seed: number, seconds: number): Game {
  const g = newGame(seed);
  for (let i = 0; i < seconds * 60 && !g.over; i++) step(g, DT, { jump: bot(g), lean: 0 });
  return g;
}

describe('simulation', () => {
  it('est déterministe pour une graine', () => {
    const a = run(7, 30);
    const b = run(7, 30);
    expect(a.x).toBe(b.x);
    expect(a.fish).toBe(b.fish);
  });

  it('avance et accélère', () => {
    const g = newGame(1);
    for (let i = 0; i < 120; i++) step(g, DT, { jump: false, lean: 1 });
    expect(g.x).toBeGreaterThan(500);
  });

  it('un rocher non sauté termine la partie', () => {
    const g = newGame(3);
    for (let i = 0; i < 60 * 20 && !g.over; i++) step(g, DT, { jump: false, lean: 0 });
    expect(g.over).not.toBeNull();
  });

  it('le robot survit 90 s sur 20 graines (jeu équitable)', () => {
    for (let s = 1; s <= 20; s++) {
      const g = run(s, 90);
      expect(g.over, `graine ${s} à ${distM(g.x)} m`).toBeNull();
    }
  });

  it('le robot ramasse des poissons', () => {
    expect(run(2, 60).fish).toBeGreaterThan(5);
  });

  it('un trou fait tomber, un saut le franchit', () => {
    const g = newGame(1);
    g.objs = [{ kind: 'hole', x: 600, w: 110, y: 0 }];
    g.genX = 1e9;
    for (let i = 0; i < 60 * 6 && !g.over; i++) step(g, DT, { jump: false, lean: 0 });
    expect(g.over).toBe('hole');
    expect(inHole(g, 600)).not.toBeNull();
  });

  it('les biomes s’enchaînent tous les 400 m', () => {
    expect(biomeIndexAt(0)).toBe(0);
    expect(biomeIndexAt(401 * 25)).toBe(1);
    expect(biomeIndexAt(801 * 25)).toBe(2);
    expect(biomeIndexAt(1201 * 25)).toBe(0);
  });
});

describe('sauvegarde et boutique', () => {
  it('ignore un contenu abîmé', () => {
    expect(parseSave('{pas du json')).toEqual(defaults());
    expect(parseSave(JSON.stringify({ best: -3, fish: 'x', owned: ['zzz'], equipped: 'gold' }))).toEqual(defaults());
  });
  it('achète seulement avec assez de poissons', () => {
    const s = { ...defaults(), fish: 40 };
    expect(buy(s, 'beanie')?.fish).toBe(10);
    expect(buy(s, 'gold')).toBeNull();
    expect(buy({ ...s, owned: ['classic', 'beanie'] }, 'beanie')).toBeNull();
  });
  it('catalogue : ids uniques, premier skin gratuit', () => {
    expect(new Set(SKINS.map((k) => k.id)).size).toBe(SKINS.length);
    expect(SKINS[0].price).toBe(0);
  });
});
