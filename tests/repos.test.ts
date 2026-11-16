import { describe, expect, it } from 'vitest';
import { STEP } from '../src/config';
import { newSim, step, type Sim } from '../src/sim';
import { generate, obstacleAt, type Obstacle } from '../src/world';

const up = () => ({ power: 0, bounce: 0, glide: 0, magnet: 0, fishx: 0 });

/** Pose le pingouin à (x, y) avec une vitesse donnée, en plein vol. */
function drop(x: number, y: number, vx: number, vy: number): Sim {
  const s = newSim(7, up());
  generate(s.world, 40000);
  s.phase = 'fly';
  s.x = x; s.y = y; s.vx = vx; s.vy = vy;
  return s;
}

function runUntilOver(s: Sim, maxSec: number): { t: number; bounces: number; flips: number } {
  let flips = 0;
  let last = s.grounded;
  const t0 = s.t;
  for (let i = 0; i < maxSec / STEP && s.phase === 'fly'; i++) {
    step(s);
    if (s.grounded !== last) flips++;
    last = s.grounded;
  }
  return { t: s.t - t0, bounces: s.bounces, flips };
}

function first(s: Sim, kind: Obstacle['kind']): Obstacle {
  const o = s.world.items.find((i) => i.kind === kind);
  if (!o) throw new Error('aucun obstacle ' + kind);
  return o;
}

describe('repos : plus de vibration, fin de partie en temps borné', () => {
  it('petits rebonds sur un phoque : la partie se termine vite, sans série de rebonds', () => {
    for (const vx of [0, 15, 60, 150, 260]) {
      for (const vy of [-20, -60, -100]) {
        const s0 = newSim(7, up());
    generate(s0.world, 40000);
        const o = first(s0, 'seal');
        const s = drop((o.x0 + o.x1) / 2, o.h + 4, vx, vy);
        const r = runUntilOver(s, 8);
        expect(s.phase, `vx=${vx} vy=${vy}`).toBe('over');
        expect(r.t).toBeLessThan(5);
        expect(r.bounces).toBeLessThanOrEqual(4);
        expect(r.flips).toBeLessThanOrEqual(6);
      }
    }
  });

  it('pingouin posé lentement au sommet d\'un phoque : s\'arrête en < 1,5 s', () => {
    const s0 = newSim(7, up());
    generate(s0.world, 40000);
    const o = first(s0, 'seal');
    const s = drop((o.x0 + o.x1) / 2, o.h, 20, 0);
    const r = runUntilOver(s, 3);
    expect(s.phase).toBe('over');
    expect(r.t).toBeLessThan(1.5);
    expect(s.endReason).not.toBeNull();
  });

  it('contre un iceberg, lent : il s\'arrête au pied, sans élan gratuit', () => {
    const s0 = newSim(7, up());
    generate(s0.world, 40000);
    const o = first(s0, 'berg');
    const s = drop(o.x0 + 20, 2, 90, 0);
    const r = runUntilOver(s, 4);
    expect(s.phase).toBe('over');
    expect(r.t).toBeLessThan(2.5);
    expect(r.bounces).toBeLessThanOrEqual(1);
  });

  it('sur la glace plate, petits rebonds : repos immédiat', () => {
    const s = drop(10, 3, 100, -90);
    expect(obstacleAt(s.world, s.x)).toBeNull();
    const r = runUntilOver(s, 5);
    expect(s.phase).toBe('over');
    expect(r.t).toBeLessThan(3);
    expect(r.bounces).toBeLessThanOrEqual(1);
  });

  it('raison de fin : flaque = splash', () => {
    const s0 = newSim(7, up());
    generate(s0.world, 40000);
    const o = s0.world.items.find((i) => i.kind === 'puddle');
    expect(o).toBeDefined();
    const s = drop((o!.x0 + o!.x1) / 2, 0, 30, 0);
    s.grounded = true;
    runUntilOver(s, 4);
    expect(s.endReason).toBe('splash');
  });

  it('longue série de petits chocs aléatoires : toujours fini en temps borné', () => {
    let seed = 12345;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let n = 0; n < 300; n++) {
      const s = drop(r() * 6000, 2 + r() * 60, r() * 220, -r() * 120);
      const out = runUntilOver(s, 12);
      expect(s.phase, 'cas ' + n).toBe('over');
      expect(out.t).toBeLessThan(10);
      expect(out.flips).toBeLessThanOrEqual(30);
    }
  });
});
