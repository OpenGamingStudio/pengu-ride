/** Version du jeu (semver), alignée sur package.json (test dans tests/version.test.ts). */
export const VERSION = '1.1.2';
export const SAVE_KEY = 'pengu-ride:save';
export const SAVE_VERSION = 1;

/** Physique (unités du monde : 1 unité = 1 px à l'échelle 1). */
export const GRAVITY = 900;
export const STEP = 1 / 120;
export const ANCHOR_Y = 64;
export const PERFECT_WINDOW = 0.2;
export const LATE_WINDOW = 0.12;
export const MAX_LEVEL = 8;
export const MAX_TIME = 300;
