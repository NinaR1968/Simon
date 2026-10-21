import { COLORS, type ColorId } from './colors';

// Game-only randomness; repeats are allowed (ARCHITECTURE §2.3 rule 1).
export function randomColor(): ColorId {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
