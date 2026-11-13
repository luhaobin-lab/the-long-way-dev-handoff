/** Linear-light paint palettes for the Painted Valley finish. Source meadow/tree shaders use their own shared original palettes. */
export type RGB = readonly [number, number, number];
export interface Palette { light: RGB; mid: RGB; shade: RGB; }
export const PALETTES = {
  grass: { light: [.54,.66,.31], mid: [.33,.49,.27], shade: [.17,.32,.27] },
  asphalt: { light: [.24,.285,.29], mid: [.20,.24,.25], shade: [.13,.18,.205] },
  shoulder: { light: [.46,.435,.30], mid: [.32,.34,.21], shade: [.20,.27,.20] },
  bark: { light: [.55,.48,.29], mid: [.35,.36,.23], shade: [.19,.27,.23] },
  leaf: { light: [.69,.75,.32], mid: [.38,.57,.29], shade: [.15,.33,.28] },
  rock: { light: [.64,.67,.56], mid: [.46,.52,.49], shade: [.29,.40,.43] },
  cream: { light: [.89,.83,.65], mid: [.71,.68,.53], shade: [.40,.49,.44] },
  teal: { light: [.36,.57,.49], mid: [.20,.40,.36], shade: [.12,.26,.25] },
  wood: { light: [.62,.40,.23], mid: [.43,.28,.19], shade: [.25,.21,.18] },
  rubber: { light: [.25,.30,.27], mid: [.15,.21,.20], shade: [.09,.15,.15] },
  metal: { light: [.72,.72,.61], mid: [.46,.52,.48], shade: [.25,.34,.32] },
  white: { light: [.96,.91,.73], mid: [.81,.80,.65], shade: [.58,.65,.58] },
  flower: { light: [.94,.79,.35], mid: [.83,.60,.25], shade: [.58,.39,.25] },
  lavender: { light: [.76,.66,.83], mid: [.56,.48,.69], shade: [.35,.38,.53] },
  red: { light: [.82,.39,.25], mid: [.62,.27,.20], shade: [.39,.22,.22] },
} satisfies Record<string,Palette>;
export type PaletteName = keyof typeof PALETTES;
export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];
export const paletteIndex = (name: PaletteName) => PALETTE_NAMES.indexOf(name);
export const glslColor = (v: RGB) => `vec3(${v.map(n=>n.toFixed(4)).join(',')})`;
export const PALETTE_GLSL = ['light','mid','shade'].map((key,i)=>
 `const vec3 PAINT_${['L','M','S'][i]}[${PALETTE_NAMES.length}] = vec3[${PALETTE_NAMES.length}](${PALETTE_NAMES.map(name=>glslColor(PALETTES[name][key as keyof Palette]))});`).join('\n');
