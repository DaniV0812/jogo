// Constantes e funções de apoio usadas no jogo inteiro.

export const W = 540;
export const H = 960;
export const TAU = Math.PI * 2;

export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// Colisão círculo x círculo (usa .x, .y e .r dos objetos)
export function circleHit(a, b) {
  const rr = a.r + b.r;
  return dist2(a.x, a.y, b.x, b.y) <= rr * rr;
}

// Sorteio ponderado: weightedPick([['drone', 4], ['tank', 1]])
export function weightedPick(entries) {
  let total = 0;
  for (const [, weight] of entries) total += weight;
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
