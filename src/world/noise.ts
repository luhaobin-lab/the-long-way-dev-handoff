/** Small coordinate-hashed noise library. No shared random state and no load-order dependence. */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const fadeD = (t: number) => 30 * t * t * (t - 1) * (t - 1);
const fadeDD = (t: number) => 60 * t * (2 * t * t - 3 * t + 1);
export function seedHash(seed: string | number): number {
  const s = String(seed); let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function hash(x: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function noise1(x: number, seed: number): number {
  const i = Math.floor(x), t = fade(x - i);
  return mix(hash(i, 0, seed), hash(i + 1, 0, seed), t) * 2 - 1;
}
export function noise1D(x: number, seed: number): [number, number, number] {
  const i = Math.floor(x), t = x - i, a = hash(i, 0, seed) * 2 - 1, b = hash(i + 1, 0, seed) * 2 - 1;
  return [mix(a, b, fade(t)), (b - a) * fadeD(t), (b - a) * fadeDD(t)];
}
export function noise2(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), fx = fade(x - ix), fz = fade(z - iz);
  return mix(mix(hash(ix, iz, seed), hash(ix + 1, iz, seed), fx), mix(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), fx), fz) * 2 - 1;
}
