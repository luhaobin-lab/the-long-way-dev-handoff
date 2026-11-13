// The sky and the light that goes with it, from one number: the hour, from noon to sunset. The dome is a painted
// gradient, deep blue overhead and pale at the horizon, with the clouds laid over it from their cube map and the
// far mountains over those; the same colours light the grass, the far land, the clouds and the mountains.
// Colours are in linear light and meant to be seen as written: the frame's tone curve leaves everything below
// white alone.
import * as THREE from 'three';
import { COMMON } from '../lib/glsl.js';
import { createBackdrop } from './backdrop.js';
import { createClouds } from './clouds.js';
import { HERO } from './world.js';

// e: degrees the sun is above the horizon
const KEYS = [
  {
    // sunset
    e: 2,
    sun: [2.5, 0.95, 0.34],
    amb: [0.2, 0.24, 0.5],
    bounce: [0.08, 0.06, 0.04],
    zenith: [0.028, 0.085, 0.36],
    mid: [0.34, 0.33, 0.56],
    horizon: [1.12, 0.56, 0.24],
    glow: [2.2, 0.9, 0.3],
    fog: [0.6, 0.42, 0.42],
    fogSun: [1.8, 0.8, 0.3],
    haze: 0.00017,
    cloudLit: [1.6, 0.74, 0.4],
    cloudMid: [0.82, 0.4, 0.42],
    cloudShade: [0.27, 0.22, 0.45],
    cloudUnder: [0.16, 0.14, 0.34],
    exposure: 1.12,
  },
  {
    // golden hour
    e: 11,
    sun: [3.0, 1.9, 0.9],
    amb: [0.3, 0.36, 0.62],
    bounce: [0.12, 0.11, 0.05],
    zenith: [0.03, 0.14, 0.46],
    mid: [0.2, 0.4, 0.66],
    horizon: [1.0, 0.76, 0.44],
    glow: [1.6, 0.9, 0.35],
    fog: [0.66, 0.6, 0.58],
    fogSun: [1.5, 0.95, 0.5],
    haze: 0.0002,
    cloudLit: [1.5, 1.1, 0.7],
    cloudMid: [0.84, 0.64, 0.56],
    cloudShade: [0.34, 0.34, 0.52],
    cloudUnder: [0.22, 0.22, 0.42],
    exposure: 1,
  },
  {
    e: 27,
    sun: [2.75, 2.4, 1.8],
    amb: [0.3, 0.45, 0.78],
    bounce: [0.1, 0.15, 0.05],
    zenith: [0.04, 0.26, 0.62],
    mid: [0.095, 0.4, 0.72],
    horizon: [0.46, 0.7, 0.82],
    glow: [0.7, 0.62, 0.42],
    fog: [0.42, 0.68, 0.84],
    fogSun: [0.85, 0.84, 0.78],
    haze: 0.00017,
    cloudLit: [1.26, 1.2, 1.08],
    cloudMid: [0.62, 0.74, 0.86],
    cloudShade: [0.37, 0.51, 0.7],
    cloudUnder: [0.3, 0.44, 0.64],
    exposure: 1,
  },
  {
    e: 50,
    sun: [2.7, 2.55, 2.2],
    amb: [0.3, 0.47, 0.82],
    bounce: [0.1, 0.16, 0.05],
    zenith: [0.035, 0.25, 0.62],
    mid: [0.08, 0.39, 0.72],
    horizon: [0.38, 0.7, 0.84],
    glow: [0.5, 0.5, 0.45],
    fog: [0.4, 0.67, 0.85],
    fogSun: [0.66, 0.78, 0.9],
    haze: 0.00017,
    cloudLit: [1.24, 1.22, 1.16],
    cloudMid: [0.62, 0.74, 0.86],
    cloudShade: [0.37, 0.51, 0.7],
    cloudUnder: [0.3, 0.44, 0.64],
    exposure: 1,
  },
];

function blend(e) {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (e >= KEYS[i].e && e <= KEYS[i + 1].e) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  if (e <= KEYS[0].e) b = a;
  if (e >= b.e) a = b;
  const t = a === b ? 0 : (e - a.e) / (b.e - a.e);
  const out = {};
  for (const k of Object.keys(a)) out[k] = Array.isArray(a[k]) ? a[k].map((v, i) => v + (b[k][i] - v) * t) : a[k] + (b[k] - a[k]) * t;
  return out;
}

/** The last hour there is: sunset. */
export const SUNSET = 20.4;

/**
 * The sun at an hour, 12 to sunset: sets `out` to its direction and returns its degrees above the horizon. It
 * comes down on the left of the way the valley runs and swings round towards it, so by evening it stands low over
 * the mountains.
 */
function sunAt(hour, out) {
  const [dx, dz] = HERO;
  const t = THREE.MathUtils.clamp((hour - 12) / 8.5, 0, 1);
  const e = 64 - 62 * t ** 1.25;
  const left = THREE.MathUtils.degToRad(88 - 64 * t);
  const el = THREE.MathUtils.degToRad(e);
  const hx = Math.cos(left) * dx + Math.sin(left) * dz;
  const hz = Math.cos(left) * dz - Math.sin(left) * dx;
  out.set(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  return e;
}

const vertex = /* glsl */ `
out vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}
`;

const fragment = /* glsl */ `
${COMMON}
precision highp samplerCube;
layout(location = 0) out vec4 outC;
in vec3 vDir;
uniform vec3 uZenith, uMid, uHorizon, uGlow;
uniform samplerCube tClouds;
uniform sampler2D tBack0, tBack1, tBack2;
uniform vec3 uBankLit, uBankShade;
uniform vec2 uBackdropEl;
uniform vec3 uBackdropClimate;
uniform vec3 uBackdropBiome;

// The Long Way nocturnal extension. Direction-space stars stay fixed while the camera translates.
vec3 nightSkyDetails(vec3 d) {
  vec2 uv = vec2(atan(d.z, d.x) / TAU + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
  vec2 grid = uv * vec2(720.0, 360.0);
  vec2 cell = floor(grid); vec4 random = hash42(cell + 17.3);
  vec2 p = fract(grid) - (0.18 + 0.64 * random.xy);
  p.x *= max(0.18, cos(asin(clamp(d.y, -1.0, 1.0))));
  float footprint = max(length(fwidth(grid)), 0.12);
  float radius = 0.035 + 0.055 * pow(random.z, 8.0);
  float star = (1.0 - smoothstep(radius, radius + footprint * 0.72, length(p))) * step(0.987, random.w);
  star *= (0.14 + 0.56 * pow(random.z, 4.0)) * uStarIntensity * smoothstep(-0.02, 0.15, d.y);
  vec3 col = mix(vec3(0.60, 0.74, 1.0), vec3(1.0, 0.88, 0.66), random.x) * star;
  float md = dot(d, normalize(uMoonDir));
  float disk = smoothstep(cos(0.0155), cos(0.0145), md) * uNight;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir) + vec3(1e-5));
  vec3 up = normalize(cross(uMoonDir, right));
  vec2 moonUv = vec2(dot(d, right), dot(d, up)) / 0.015;
  float craters = texture(tNoise, moonUv * 0.7 + 0.37).r * 0.65 + texture(tNoise, moonUv * 2.7 + 0.71).g * 0.35;
  vec3 moon = vec3(0.56, 0.66, 0.82) * (0.82 + craters * 0.18);
  col = mix(col, moon, disk);
  col += vec3(0.06, 0.09, 0.16) * exp(-max(0.0, 1.0 - md) * 320.0) * uNight * 0.28;
  return col;
}
vec3 backdropPigment(vec3 c, float kind) {
  float green = smoothstep(0.0, 0.15, c.g - max(c.r, c.b));
  if (kind > 4.5 && kind < 5.5) return mix(c, vec3(0.66,0.49,0.27) * (0.74 + c.g * 0.52), green * 0.9 + 0.08);
  if (kind > 5.5 && kind < 6.5) return mix(c, vec3(0.16,0.15,0.16) * (0.72 + c.g * 0.6), 0.87);
  if (kind > 6.5 && kind < 7.5) return mix(c, vec3(0.68,0.80,0.90) * (0.78 + c.g * 0.3), 0.9);
  return c;
}
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.3, pow(h, 0.8)));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, h));
  float sd = max(dot(d, uSolarDir), 0.0);
  col += uGlow * (pow(sd, 6.0) * 0.05 + pow(sd, 90.0) * 0.3 + pow(sd, 1400.0) * 1.4) + uSunColor * smoothstep(0.99988, 0.99996, sd) * 8.0 * uSunVisibility;
  col += nightSkyDetails(d);
  vec4 c = texture(tClouds, d);
  // towards the sun a cloud's edge is lit through
  c.rgb += uGlow * pow(sd, 40.0) * 0.5 * c.a * (1.0 - c.a) * 4.0;
  col = col * (1.0 - c.a) + c.rgb;
  // the far country stands in front of the clouds, mixed from its paint with this hour's light
  float v = (asin(clamp(d.y, -1.0, 1.0)) - uBackdropEl.x) / (uBackdropEl.y - uBackdropEl.x);
  float done = 0.0;
  if (v < 1.0) {
    vec2 uv = vec2(atan(d.z, d.x) / TAU + 0.5, max(v, 0.0));
    vec4 b0 = textureLod(tBack0, uv, 0.0);
    if (b0.a > 0.002) {
      vec4 b1 = textureLod(tBack1, uv, 0.0);
      vec4 b2 = textureLod(tBack2, uv, 0.0);
      float inv = 1.0 / b0.a;
      // how much of what is here is the bank of cloud, and how much the land behind it
      float bank = clamp(b2.b * inv, 0.0, 1.0);
      float w = inv / max(1.0 - bank, 1e-3);
      vec3 ambient = uSkyColor * 0.6 + dot(uSkyColor, vec3(0.38));
      vec3 inLight = b0.rgb * w;
      vec3 inShade = b1.rgb * w;
      // The source panorama is still matte paint. Its seasonal/biome pigments share the nearby world's climate.
      float greenPaint = smoothstep(0.01, 0.16, inLight.g - max(inLight.r, inLight.b));
      vec3 fallL = vec3(0.57, 0.38, 0.15) * (0.75 + inLight.g * 0.5);
      vec3 fallS = vec3(0.20, 0.14, 0.12) * (0.7 + inShade.g * 0.7);
      inLight = mix(inLight, fallL, greenPaint * uSeasonWeights.z * 0.72);
      inShade = mix(inShade, fallS, greenPaint * uSeasonWeights.z * 0.72);
      float winterSnow = climateSnow(uBackdropClimate) * greenPaint * 0.9;
      inLight = mix(inLight, vec3(0.88, 0.94, 0.98), winterSnow);
      inShade = mix(inShade, vec3(0.45, 0.59, 0.74), winterSnow);
      inLight = mix(backdropPigment(inLight, uBackdropBiome.x), backdropPigment(inLight, uBackdropBiome.y), uBackdropBiome.z);
      inShade = mix(backdropPigment(inShade, uBackdropBiome.x), backdropPigment(inShade, uBackdropBiome.y), uBackdropBiome.z);
      vec3 land = mix(inShade * inShade * ambient, inLight * inLight * (uSunColor * 0.42 + uSkyColor * 0.35), clamp(b1.a * w, 0.0, 1.0));
      // (towards a low sun the far country warms, but it is not set alight)
      vec3 air = mix(uFogColor, uFogSunColor, pow(sd, 6.0) * 0.45);
      land = mix(land, air, 1.0 - pow(1.0 - clamp(b2.r * w, 0.0, 0.996), uFogDensity / 0.00015));
      land = mix(land, vec3(0.86, 0.92, 1.0) * (uSkyColor * 0.5 + uSunColor * 0.26), clamp(b2.g * w, 0.0, 1.0));
      vec3 cloud = mix(uBankShade, uBankLit, clamp(b2.a * inv / max(bank, 1e-3), 0.0, 1.0) * (0.2 + 0.8 * smoothstep(0.04, 0.4, uSunDir.y)));
      land = mix(land, mix(cloud, air, 0.18), bank);
      col = mix(col, land, b0.a);
      done = b0.a * (1.0 - bank);
    }
  }
  // (alpha marks what is painted already and wants no more of the brush: the far country)
  outC = vec4(col, 1.0 - 0.75 * done);
}
`;

/** @param options.cloudSize, options.cloudSteps, options.liveClouds see clouds.js; options.backdropWidth backdrop.js */
const colour = () => new THREE.Color();

/**
 * The sky's two pictures, the clouds and the far mountains, which need nothing from the land: make them first and
 * the graphics card can be painting them while the land is worked out. `light(hour)` paints the clouds for an hour.
 */
export function createSkyParts(renderer, { cloudSize = 1024, cloudSteps = 110, liveClouds = true, backdropWidth = 8192 } = {}) {
  const clouds = createClouds(renderer, HERO, { size: cloudSize, steps: cloudSteps, live: liveClouds });
  const afternoon = new THREE.Vector3();
  sunAt(16, afternoon);
  const backdrop = createBackdrop(renderer, HERO, [afternoon.x, afternoon.z], { width: backdropWidth, ground: backdropWidth > 4096 ? 4096 : 2048 });
  const sunDir = new THREE.Vector3();
  const c = { fog: colour(), lit: colour(), mid: colour(), shade: colour(), under: colour() };
  const parts = {
    clouds,
    backdrop,
    /** The hour the clouds were last painted whole for, so the same hour isn't painted twice. */
    drawn: Number.NaN,
    light(hour) {
      const k = blend(sunAt(hour, sunDir));
      clouds.setLight({ sunDir, lit: c.lit.setRGB(...k.cloudLit), mid: c.mid.setRGB(...k.cloudMid), shade: c.shade.setRGB(...k.cloudShade), under: c.under.setRGB(...k.cloudUnder), haze: c.fog.setRGB(...k.fog) });
      clouds.drawAll();
      parts.drawn = hour;
    },
  };
  return parts;
}

/** @param options.parts what createSkyParts made, if the sky's pictures were begun early */
export function createSky(renderer, field, { parts = null, ...options } = {}) {
  parts ??= createSkyParts(renderer, options);
  const { clouds, backdrop } = parts;
  const uniforms = {
    ...field.uniforms,
    uZenith: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    tClouds: { value: clouds.texture },
    tBack0: { value: backdrop.textures[0] },
    tBack1: { value: backdrop.textures[1] },
    tBack2: { value: backdrop.textures[2] },
    uBackdropEl: { value: new THREE.Vector2(backdrop.el[0], backdrop.el[1]) },
    uBankLit: { value: new THREE.Color() },
    uBankShade: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vertex, fragmentShader: fragment, uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;

  const sunDir = new THREE.Vector3();
  const c = { sun: colour(), amb: colour(), bounce: colour(), fog: colour(), fogSun: colour(), lit: colour(), mid: colour(), shade: colour(), under: colour() };
  const sky = {
    mesh,
    uniforms,
    clouds,
    backdrop,
    hour: 15.5,
    exposure: 1,
    sunDir,
    elevation: 0,
    /**
     * hour: 12 to sunset. `soft` for a small step, as time passing makes: the clouds then take the new light a
     * strip at a time as they billow, and nothing is drawn again at once.
     */
    setHour(hour, soft = false) {
      sky.hour = hour;
      const e = sunAt(hour, sunDir);
      sky.elevation = e;
      const k = blend(e);
      field.setLight({
        sunDir,
        sunColor: c.sun.setRGB(...k.sun),
        skyColor: c.amb.setRGB(...k.amb),
        bounceColor: c.bounce.setRGB(...k.bounce),
        fogColor: c.fog.setRGB(...k.fog),
        fogSunColor: c.fogSun.setRGB(...k.fogSun),
        fogDensity: k.haze,
        cloudShade: 0.15,
      });
      uniforms.uZenith.value.setRGB(...k.zenith);
      uniforms.uMid.value.setRGB(...k.mid);
      uniforms.uHorizon.value.setRGB(...k.horizon);
      uniforms.uGlow.value.setRGB(...k.glow);
      uniforms.uBankLit.value.setRGB(...k.cloudLit);
      uniforms.uBankShade.value.setRGB(...k.cloudMid.map((m, i) => m * 0.35 + k.cloudShade[i] * 0.65));
      clouds.setLight({ sunDir, lit: c.lit.setRGB(...k.cloudLit), mid: c.mid.setRGB(...k.cloudMid), shade: c.shade.setRGB(...k.cloudShade), under: c.under.setRGB(...k.cloudUnder), haze: c.fog });
      if (soft) parts.drawn = Number.NaN;
      else if (parts.drawn !== hour) {
        clouds.drawAll();
        parts.drawn = hour;
      }
      sky.exposure = k.exposure;
    },
    // The Long Way: authored morning/night/calendar extension drives the same original cloud and sky pipeline.
    applyClimate(light, immediate = false) {
      sky.hour = light.hour;
      sky.elevation = light.elevation;
      sunDir.fromArray(light.keyDir ?? light.sunDir).normalize();
      field.setLight({ sunDir, sunColor: c.sun.setRGB(...light.sun), skyColor: c.amb.setRGB(...light.amb), bounceColor: c.bounce.setRGB(...light.bounce), fogColor: c.fog.setRGB(...light.fog), fogSunColor: c.fogSun.setRGB(...light.fogSun), fogDensity: light.haze, cloudShade: 0.15 * (1.0 - light.night * 0.7) });
      uniforms.uZenith.value.setRGB(...light.zenith); uniforms.uMid.value.setRGB(...light.mid);
      uniforms.uHorizon.value.setRGB(...light.horizon); uniforms.uGlow.value.setRGB(...light.glow);
      uniforms.uBankLit.value.setRGB(...light.cloudLit);
      uniforms.uBankShade.value.setRGB(...light.cloudMid.map((m, i) => m * 0.35 + light.cloudShade[i] * 0.65));
      clouds.setLight({ sunDir, lit: c.lit.setRGB(...light.cloudLit), mid: c.mid.setRGB(...light.cloudMid), shade: c.shade.setRGB(...light.cloudShade), under: c.under.setRGB(...light.cloudUnder), haze: c.fog });
      if (immediate) clouds.drawAll(); else clouds.requestRefresh();
      sky.exposure = light.exposure;
    },
    update(dt, camera) {
      mesh.position.copy(camera.position);
      mesh.scale.setScalar(camera.far * 0.5);
      clouds.update(dt);
    },
  };
  return sky;
}

// The Long Way extension: retain the original authored daytime color keys for the full calendar.
export { blend as sampleDayLight };
