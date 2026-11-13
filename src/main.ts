import * as THREE from 'three';
import { WorldField } from './world/field';
import { WorldStream } from './world/stream';
import { ValleyPainter } from './render/ValleyPainter';
import { Vehicle } from './vehicle/Vehicle';
import { Cabin } from './vehicle/Cabin';
import { Input } from './vehicle/Input';
import { RoadAudio } from './vehicle/Audio';
import { buildUI, type Quality } from './ui';
import './style.css';

const VERSION = 'painted-valley-0.2.0';
const params = new URLSearchParams(location.search);
const testMode = params.get('test') === '1';
const seed = params.get('seed') || 'wildflower';
const initialS = Number.isFinite(Number(params.get('s'))) && params.has('s') ? Number(params.get('s')) : 240;
const { get, canvas } = buildUI(document.getElementById('app')!);
const show = (id: string, visible: boolean) => get(id).classList.toggle('hidden', !visible);
function loading(progress: number, label: string) { get('load-bar').style.width = `${Math.round(progress * 100)}%`; get('load-label').textContent = label; }
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: testMode }); }
catch (error) { show('loading', false); show('error', true); get('error-message').textContent = 'This journey needs WebGL2. Please open it in a current Chrome or Safari browser with graphics acceleration enabled.'; throw error; }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(63, innerWidth / innerHeight, .075, 24000);
camera.rotation.order = 'YXZ';
let quality: Quality = (params.get('quality') as Quality) || 'adaptive';
const nativeDpr = Math.min(devicePixelRatio || 1, 2.5);
let pixelRatio = quality === 'balanced' ? Math.min(1.25, nativeDpr) : nativeDpr;
if (params.has('dpr')) pixelRatio = Math.max(.75, Math.min(2.5, Number(params.get('dpr')) || 1));
renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight);
const painter = new ValleyPainter(renderer);
const field = new WorldField(seed);
const vehicle = new Vehicle(field, initialS);
const input = new Input(canvas);
const audio = new RoadAudio();
let world: WorldStream;
let cabin: Cabin;
let ground: ReturnType<ValleyPainter['createGroundPaint']>;
let sky: ReturnType<ValleyPainter['createSky']>;
let origin = { x: Math.round(vehicle.state.x / 512) * 512, z: Math.round(vehicle.state.z / 512) * 512 };
let ready = false, started = false, paused = false, automatic = params.get('autodrive') === '1', exterior = false, manualClock = testMode;
let clock = 0, accumulator = 0, previous = 0, frameCount = 0, obstacleTick = 0, hudTick = 0, resizeTick = 0, adaptiveTick = 0;
let samples: number[] = [], renderSamples: number[] = [], lastPerformance: Record<string, unknown> = {};
let toastTimer = 0;
let obstacles: { x: number; z: number; radius: number }[] = [];
const eye = new THREE.Vector3(), target = new THREE.Vector3();
const look = new THREE.Quaternion(), body = new THREE.Quaternion();
const camPos = new THREE.Vector3();
const percentile = (list: number[], p: number) => { const a = [...list].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 0; };

function toast(text: string) { get('toast').textContent = text; show('toast', true); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => show('toast', false), 2600); }
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight); painter.resize();
}
window.addEventListener('resize', () => { clearTimeout(resizeTick); resizeTick = window.setTimeout(resize, 60); });
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); paused = true; show('error', true); get('error-message').textContent = 'The graphics context was interrupted. Reload to return to this road.'; });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !testMode) setPause(true); previous = 0; });
function setPause(next: boolean) {
  if (!ready) return;
  paused = next;
  show('menu-shade', next);
  input.keys.clear();
  if (next) {
    const m = metrics();
    get('performance-note').textContent = `${m.resolution} · ${Math.round(Number(m.fps))} fps average · ${quality === 'adaptive' ? 'Adaptive resolution' : quality === 'retina' ? 'Native Retina' : 'Balanced'}\nSeed: ${seed}`;
    get('resume-button').focus();
  }
  previous = 0;
}
async function start(auto = false) {
  if (!ready) return;
  started = true; automatic = auto; paused = false;
  show('welcome', false); show('journey', true); show('drive-controls', true); show('menu-shade', false);
  get('auto-button').classList.toggle('engaged', automatic);
  try { await audio.start(); } catch { /* Sound is optional; drive remains available. */ }
  get('drive-hint').style.opacity = '.7';
  window.setTimeout(() => { get('drive-hint').style.opacity = '0'; }, 14000);
}
function resetCar() {
  vehicle.reset(); input.center();
  updateView(true);
  toast('Back on the open road.');
}
async function fullscreen() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
  catch { toast('Fullscreen is unavailable in this window.'); }
}
input.onAction = action => {
  if (!ready) return;
  switch (action) {
    case 'reset': resetCar(); break;
    case 'camera': exterior = !exterior; input.center(); updateView(true); toast(exterior ? 'A little view from outside.' : 'Back behind the wheel.'); break;
    case 'auto': if (!started) void start(true); else { automatic = !automatic; get('auto-button').classList.toggle('engaged', automatic); toast(automatic ? 'Scenic drive · the road will lead.' : 'The wheel is yours.'); } break;
    case 'pause': setPause(!paused); break;
    case 'fullscreen': void fullscreen(); break;
    case 'audio': audio.muted = !audio.muted; get('sound-button').style.opacity = audio.muted ? '.4' : '1'; break;
    case 'center': input.center(); break;
    case 'help': setPause(true); get<HTMLDetailsElement>('controls-details').open = true; break;
    case 'start': if (!started) void start(false); else if (paused) setPause(false); break;
    case 'blur': if (started && !testMode) setPause(true); break;
  }
};
get('start-button').onclick = () => void start(false);
get('scenic-button').onclick = () => void start(true);
get('auto-button').onclick = () => input.onAction('auto');
get('sound-button').onclick = () => input.onAction('audio');
get('menu-button').onclick = () => setPause(true);
get('home').onclick = e => { e.preventDefault(); setPause(true); };
get('close-menu').onclick = get('resume-button').onclick = () => setPause(false);
get('reset-button').onclick = () => { resetCar(); setPause(false); };
get('fullscreen-button').onclick = () => void fullscreen();
get<HTMLSelectElement>('quality').value = quality;
get<HTMLSelectElement>('quality').onchange = () => {
  quality = get<HTMLSelectElement>('quality').value as Quality;
  pixelRatio = quality === 'balanced' ? Math.min(1.25, nativeDpr) : nativeDpr;
  resize(); samples = []; adaptiveTick = clock;
};
get<HTMLSelectElement>('hour').onchange = async () => {
  const hour = Number(get<HTMLSelectElement>('hour').value);
  loading(.5, 'Changing the afternoon light…'); show('loading', true);
  try { await painter.setHour(hour); get('time-label').textContent = hour > 18 ? 'The golden hour' : hour < 14 ? 'A clear summer noon' : 'A summer afternoon'; }
  finally { show('loading', false); }
};
get<HTMLInputElement>('seed').value = seed;
get('new-road').onclick = () => { const value = get<HTMLInputElement>('seed').value.trim(); if (value) { const url = new URL(location.href); url.searchParams.set('seed', value); url.searchParams.delete('s'); location.href = url.toString(); } };

function step(dt: number) {
  clock += dt;
  if (!started || paused) return;
  const direct = input.drive;
  if (automatic && (direct.brake > 0 || direct.throttle > 0 || direct.steer !== 0)) {
    automatic = false; get('auto-button').classList.remove('engaged');
  }
  vehicle.step(dt, automatic ? vehicle.scenicInput() : direct);
  obstacleTick += dt;
  if (obstacleTick > .2) { obstacleTick = 0; obstacles = field.treesIn(vehicle.state.x, vehicle.state.z, 18); }
  vehicle.collide(obstacles);
}
function updateView(snap = false) {
  if (!cabin || !world) return;
  const v = vehicle.state;
  if (Math.abs(v.x - origin.x) > 400 || Math.abs(v.z - origin.z) > 400) {
    origin = { x: Math.round(v.x / 512) * 512, z: Math.round(v.z / 512) * 512 };
    // Rebase every render object in the same frame as the seat and paint coordinates.
    world.update(v, origin, 0);
    snap = true;
  }
  painter.setWorldOrigin(origin.x, origin.z);
  cabin.update(v, origin, automatic);
  if (exterior) {
    const az = v.heading - input.lookYaw + .27;
    camera.position.set(v.x - origin.x - Math.sin(az) * 9, v.y + 4.5 + input.lookPitch * 3, v.z - origin.z + Math.cos(az) * 9);
    target.set(v.x - origin.x, v.y + 1.05, v.z - origin.z);
    camera.lookAt(target);
  } else {
    eye.copy(cabin.eye).applyMatrix4(cabin.group.matrixWorld);
    // Follow the physical seat, while keeping the view mostly level. No uncontrolled head bob.
    camera.position.copy(eye);
    body.setFromEuler(new THREE.Euler(v.pitch * .50, -v.heading, v.roll * .20, 'YXZ'));
    look.setFromEuler(new THREE.Euler(input.lookPitch - .012, input.lookYaw, 0, 'YXZ'));
    camera.quaternion.copy(body).multiply(look);
  }
  camera.updateMatrixWorld(true);
  ground.follow(camera.position.x, camera.position.z);
  painter.update(camera, clock);
}
function render() {
  if (!ready) return;
  const start = performance.now();
  updateView();
  painter.render(scene, camera);
  renderSamples.push(performance.now() - start); if (renderSamples.length > 3600) renderSamples.shift();
  frameCount++;
}
function updateHud() {
  const v = vehicle.state;
  get('odometer').textContent = `${(v.distance / 1000).toFixed(1)} km of open road`;
  get('place-name').textContent = field.openness(v.s) > .55 ? 'The open meadows' : 'Greenbriar Valley';
}
function metrics() {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
  return {
    version: VERSION, reference: 'blendi/painted-valley', seed, simulatedSeconds: clock,
    measurement: manualClock ? 'deterministic stepping; FPS invalid' : 'real-time requestAnimationFrame',
    frames: frameCount, sampleCount: samples.length, fps: avg ? 1000 / avg : 0,
    frameMs: { mean: avg, p50: percentile(samples, .5), p95: percentile(samples, .95), p99: percentile(samples, .99) },
    submitMs: { p50: percentile(renderSamples, .5), p95: percentile(renderSamples, .95) },
    resolution: `${size.x} × ${size.y}`, cssResolution: `${innerWidth} × ${innerHeight}`, nativeDpr, pixelRatio, quality,
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    memory: { ...renderer.info.memory }, world: world?.diagnostics(), origin: { ...origin },
    vehicle: { ...vehicle.state }, userAgent: navigator.userAgent,
  };
}
function frame(now: number) {
  requestAnimationFrame(frame);
  if (!ready) { previous = now; return; }
  if (!previous) previous = now;
  const elapsed = now - previous; previous = now;
  if (!manualClock) {
    if (elapsed > 0 && elapsed < 1000 && frameCount > 90 && !paused && started) { samples.push(elapsed); if (samples.length > 3600) samples.shift(); }
    accumulator += Math.min(elapsed / 1000, .08);
    while (accumulator >= 1 / 120) { step(1 / 120); accumulator -= 1 / 120; }
    world.update(vehicle.state, origin, 3);
    render();
    if (clock - hudTick > .2) { updateHud(); hudTick = clock; }
    if (quality === 'adaptive' && !params.has('dpr') && samples.length > 180 && clock - adaptiveTick > 6) {
      adaptiveTick = clock; const p95 = percentile(samples.slice(-180), .95);
      const next = p95 > 22 ? Math.max(.9, pixelRatio * .91) : p95 < 16.5 ? Math.min(nativeDpr, pixelRatio + .05) : pixelRatio;
      if (Math.abs(next - pixelRatio) > .025) { pixelRatio = next; resize(); }
    }
  }
  audio.update(vehicle.state.speed, input.drive.throttle, paused || !started);
}

async function advanceTime(ms: number) {
  if (!ready) return;
  manualClock = true;
  const total = Math.max(0, Math.min(ms, 30000));
  const count = Math.round(total / (1000 / 120));
  for (let i = 0; i < count; i++) {
    step(1 / 120);
    if (i % 12 === 0) { updateView(); world.update(vehicle.state, origin, 3); }
    if (i % 480 === 479) await new Promise<void>(r => setTimeout(r, 0));
  }
  updateView(); world.update(vehicle.state, origin, 6); render(); updateHud();
}
function stateText() {
  return JSON.stringify({ ready, mode: paused ? 'paused' : started ? 'driving' : 'parked', camera: exterior ? 'exterior' : 'driver seat', seed, coordinates: '+Y up,+X east,forward -Z; metres', automatic, muted: audio.muted, car: { ...vehicle.state }, look: { yaw: input.lookYaw, pitch: input.lookPitch }, origin, stream: world?.diagnostics(), renderer: VERSION });
}
(window as any).render_game_to_text = stateText;
(window as any).advanceTime = advanceTime;
if (testMode) {
  (window as any).__roadtrip = {
    get ready() { return ready; }, get version() { return VERSION; }, state: () => JSON.parse(stateText()), metrics,
    start: (auto = false) => start(auto), pause: setPause,
    auto: (value: boolean) => { automatic = value; get('auto-button').classList.toggle('engaged', value); },
    step: advanceTime,
    realTime: (value = true) => { manualClock = !value; samples = []; renderSamples = []; frameCount = 0; previous = 0; },
    seek: async (s: number, lateral = 1.8) => {
      vehicle.reset(s); const r = field.roadAt(s);
      vehicle.state.x = r.position.x + r.right.x * lateral; vehicle.state.z = r.position.z + r.right.z * lateral;
      origin = { x: Math.round(vehicle.state.x / 512) * 512, z: Math.round(vehicle.state.z / 512) * 512 };
      painter.setWorldOrigin(origin.x, origin.z); await world.seek(vehicle.state.x, vehicle.state.z, origin); updateView(true); render();
    },
    look: (yaw: number, pitch = 0) => { input.lookYaw = yaw; input.lookPitch = pitch; updateView(true); render(); },
    camera: (kind: string) => { exterior = kind === 'exterior'; updateView(true); render(); },
    render, setHour: (hour: number) => painter.setHour(hour),
    rendererInfo: () => ({ gl: renderer.getContext().getParameter(renderer.getContext().RENDERER), vendor: renderer.getContext().getParameter(renderer.getContext().VENDOR) }),
  };
}
requestAnimationFrame(frame);

async function boot() {
  const startTime = performance.now();
  loading(.05, 'Painting the summer sky…');
  sky = painter.createSky(field.seed); scene.add(sky.group);
  await painter.ready();
  loading(.26, 'Finding a road through the hills…');
  painter.setWorldOrigin(origin.x, origin.z);
  world = new WorldStream(scene, field, painter);
  await world.warmup(vehicle.state.x, vehicle.state.z, origin, p => loading(.26 + p * .53, p < .3 ? 'Growing the meadows…' : 'Letting the mountains fade into blue…'));
  loading(.82, 'A map, a mug, and a place by the window…');
  ground = painter.createGroundPaint(); scene.add(ground.group);
  cabin = new Cabin(painter); scene.add(cabin.group);
  updateView(true);
  loading(.94, 'Opening the windows…');
  await renderer.compileAsync(scene, camera);
  ready = true;
  render(); show('loading', false); show('welcome', true);
  if (params.get('autodrive') === '1' || params.get('start') === '1') await start(automatic);
  if (testMode) (window as any).__roadtrip.bootMs = performance.now() - startTime;
}
boot().catch(error => {
  console.error(error); show('loading', false); show('error', true);
  get('error-message').textContent = `The scenery could not finish loading.\n${error instanceof Error ? error.message : String(error)}`;
});
