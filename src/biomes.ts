import { BIOME_M, U_PER_M } from './config';

export interface Palette {
  name: string;
  sky: string;
  far: string;
  near: string;
  ground: string;
  edge: string;
  pit: string;
  accent: string;
  snow: string;
}

export const BIOMES: Palette[] = [
  { name: 'Banquise', sky: '#cdeeff', far: '#9fd3f2', near: '#7fbeea', ground: '#f4fbff', edge: '#a9d8f0', pit: '#14213d', accent: '#ffffff', snow: '#ffffff' },
  { name: 'Aurore', sky: '#1b1f4b', far: '#2e3a82', near: '#3f54b0', ground: '#e3eeff', edge: '#8fa6e8', pit: '#0a0d26', accent: '#3dffb0', snow: '#ffffff' },
  { name: 'Grotte de glace', sky: '#0e3b52', far: '#145a7a', near: '#1b7da3', ground: '#c9f6f7', edge: '#6fd0d6', pit: '#04161f', accent: '#8fe6ea', snow: '#d9fbff' },
];

export function biomeIndexAt(x: number): number {
  return Math.floor(Math.max(0, x) / U_PER_M / BIOME_M) % BIOMES.length;
}

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}
