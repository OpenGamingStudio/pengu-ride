import { describe, expect, it } from 'vitest';
import { distance, earned, launch, newSim, predictBounce, step, tap, type Sim } from '../src/sim';
import { generate, newWorld, obstacleAt, surface } from '../src/world';

const up = () => ({ power: 0, bounce: 0, glide: 0, magnet: 0, fishx: 0 });

/** Joue une partie : `auto` tape au bon moment grâce à la prédiction. */
function play(seed: number, angle: number, power: number, auto: boolean, u = up()): Sim {
  const s = newSim(seed, u);
  launch(s, angle, power);
  for (let i = 0; i < 120 * 200 && s.phase === 'fly'; i++) {
    if (auto) {
      const p = predictBounce(s);
      if (p && p.t < 0.1) tap(s);
    }
    step(s);
  }
  return s;
}

describe('piste', () => {
  it('est déterministe et triée, sans chevauchement', () => {
    const a = newWorld(7);
    const b = newWorld(7);
    generate(a, 6000);
    generate(b, 6000);
    expect(a.items).toEqual(b.items);
    for (let i = 1; i < a.items.length; i++) expect(a.items[i].x0).toBeGreaterThan(a.items[i - 1].x1);
    for (let i = 1; i < a.fish.length; i++) expect(a.fish[i].x).toBeGreaterThanOrEqual(a.fish[i - 1].x);
  });

  it('commence par un phoque, les dangers arrivent plus tard et restent rares', () => {
    const w = newWorld(3);
    generate(w, 30000);
    expect(w.items[0].kind).toBe('seal');
    const pud = w.items.filter((o) => o.kind === 'puddle');
    expect(pud.length / w.items.length).toBeLessThan(0.2);
    expect(Math.min(...pud.map((o) => o.x0))).toBeGreaterThan(1500);
  });

  it('surface : plate sur la glace, rampe sur l\'iceberg', () => {
    const w = newWorld(11);
    generate(w, 12000);
    const berg = w.items.find((o) => o.kind === 'berg')!;
    expect(surface(w, berg.x0 - 5).h).toBe(0);
    expect(surface(w, berg.x0 + 60).slope).toBeGreaterThan(0.4);
    expect(surface(w, berg.x1).h).toBe(berg.h);
    expect(obstacleAt(w, berg.x1 + 1)).toBeNull();
  });
});

describe('carte aléatoire et équitable', () => {
  it('deux graines donnent deux parcours différents', () => {
    const a = newWorld(1);
    const b = newWorld(2);
    generate(a, 8000);
    generate(b, 8000);
    expect(a.items.map((o) => Math.round(o.x0))).not.toEqual(b.items.map((o) => Math.round(o.x0)));
    expect(a.items.map((o) => o.kind)).not.toEqual(b.items.map((o) => o.kind));
  });

  it('espacement minimum de 260 de glace libre, jamais deux flaques de suite, obstacles peu denses', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const w = newWorld(seed);
      generate(w, 40000);
      for (let i = 1; i < w.items.length; i++) {
        expect(w.items[i].x1 - w.items[i - 1].x1).toBeGreaterThanOrEqual(260);
        if (w.items[i].kind === 'puddle') expect(w.items[i - 1].kind).not.toBe('puddle');
      }
      const covered = w.items.reduce((n, o) => n + (o.x1 - o.x0), 0) / w.genX;
      expect(covered).toBeLessThan(0.4);
    }
  });
});

describe('partie', () => {
  it('aucune relance : sans rebond parfait, la partie finit vite et un tap en l\'air ne change rien', () => {
    const s = newSim(4, up());
    launch(s, 0.8, 1);
    for (let i = 0; i < 30; i++) step(s);
    const { vx, vy } = s;
    tap(s);
    expect(s.vx).toBe(vx);
    expect(s.vy).toBe(vy);
  });

  it('le multiplicateur de poissons augmente les gains', () => {
    const a = newSim(1, up());
    a.fish = 10;
    const b = newSim(1, { ...up(), fishx: 3 });
    b.fish = 10;
    expect(earned(a)).toBe(10);
    expect(earned(b)).toBe(19);
  });

  it('le lancer est impossible hors de la visée et la partie se termine', () => {
    const s = newSim(1, up());
    step(s);
    expect(s.x).toBe(0);
    launch(s, 0.8, 1);
    expect(s.phase).toBe('fly');
    for (let i = 0; i < 120 * 200 && s.phase === 'fly'; i++) step(s);
    expect(s.phase).toBe('over');
  });

  it('parties courtes : moins de 60 s sans taper, 90 s au plus en visant juste', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const lazy = play(seed, 0.8, 0.9, false);
      expect(lazy.t).toBeGreaterThan(1.5);
      expect(lazy.t).toBeLessThan(60);
      const pro = play(seed, 0.8, 0.9, true);
      expect(pro.t).toBeLessThanOrEqual(40);
      expect(pro.perfects).toBeGreaterThan(0);
    }
  });

  it('un rebond parfait va plus loin qu\'un rebond raté', () => {
    let better = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      if (distance(play(seed, 0.8, 0.9, true)) > distance(play(seed, 0.8, 0.9, false))) better++;
    }
    expect(better).toBeGreaterThanOrEqual(6);
  });

  it('les améliorations aident (distance moyenne)', { timeout: 60000 }, () => {
    const seeds = [1, 2, 3, 4];
    const avg = (u: ReturnType<typeof up>) => seeds.reduce((n, sd) => n + distance(play(sd, 0.8, 0.9, true, u)), 0) / seeds.length;
    expect(avg({ power: 5, bounce: 5, glide: 3, magnet: 0, fishx: 0 })).toBeGreaterThan(avg(up()));
  });

  it('spammer ne sert à rien : un appui verrouille les suivants 0,4 s', () => {
    const s = newSim(1, up());
    launch(s, 0.8, 0.9);
    tap(s);
    const at = s.tapAt;
    step(s);
    tap(s);
    expect(s.tapAt).toBe(at);
    for (let i = 0; i < 60; i++) step(s);
    tap(s);
    expect(s.tapAt).toBeGreaterThan(at);
  });

  it('tap un peu tard améliore le rebond', () => {
    const s = newSim(1, up());
    launch(s, 0.8, 0.9);
    let done = false;
    for (let i = 0; i < 120 * 30 && !done; i++) {
      step(s);
      if (s.late) {
        const vy = s.vy;
        tap(s);
        expect(s.vy).toBeGreaterThan(vy);
        expect(s.perfects).toBe(1);
        done = true;
      }
    }
    expect(done).toBe(true);
  });

  it('les poissons se ramassent une seule fois, l\'aimant en attrape plus', () => {
    const a = play(2, 0.8, 0.9, true);
    const b = play(2, 0.8, 0.9, true, { power: 0, bounce: 0, glide: 0, magnet: 5, fishx: 0 });
    expect(earned(a)).toBeGreaterThan(0);
    expect(a.world.fish.filter((f) => f.taken).length).toBe(a.fish + a.gold);
    expect(earned(b)).toBeGreaterThanOrEqual(earned(a));
  });
});
