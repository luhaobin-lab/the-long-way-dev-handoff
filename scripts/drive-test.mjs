import { launchBrowser } from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((x, i, all) => x.startsWith('--') ? [x.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true] : []).filter(x => x.length));
const base = args.url || 'http://127.0.0.1:5173';
const mode = args.mode || 'all';
const out = path.resolve(args.out || `artifacts/${mode}`);
const dpr = Number(args.dpr || 1.5);
const width = Number(args.width || 1440), height = Number(args.height || 900);
await fs.mkdir(out, { recursive: true });
const browser = await launchBrowser({ headless: !args.headed, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
const page = await context.newPage();
const errors = [], checks = [], frames = [];
page.on('pageerror', e => errors.push({ type: 'pageerror', message: e.message }));
page.on('console', msg => { if (msg.type() === 'error') errors.push({ type: 'console', message: msg.text() }); });
const check = (name, passed, details = '') => { checks.push({ name, passed: Boolean(passed), details }); if (!passed) console.error(`FAIL ${name}: ${details}`); };
async function state() { return page.evaluate(() => window.__roadtrip.state()); }
async function shot(name) {
  await page.evaluate(() => window.__roadtrip.render());
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(out, filename) });
  const s = await state(); frames.push({ filename, state: s });
  await fs.writeFile(path.join(out, `${name}.json`), JSON.stringify(s, null, 2));
  return s;
}
async function step(ms) { await page.evaluate(ms => window.__roadtrip.step(ms), ms); }
async function settle() {
  // Let background sampling finish, while rendering uses the old complete map.
  for (let i = 0; i < 90; i++) {
    await step(0);
    const diag = await page.evaluate(() => window.__roadtrip.metrics().world);
    if (diag.pendingChunks === 0 && !diag.mapBuilding && !diag.farBuilding) break;
    await page.waitForTimeout(30);
  }
}
let result;
try {
  const url = new URL(base); url.searchParams.set('test', '1'); url.searchParams.set('seed', args.seed || 'wildflower');
  url.searchParams.set('quality', args.quality || 'retina');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__roadtrip?.ready, { timeout: 180000 });
  const initial = await state(); check('correct candidate and art reference', initial.renderer.startsWith('painted-valley-'), initial.renderer);
  await shot('00-arrival');
  await page.click('#start-button');
  await step(0);
  if (mode === 'smoke' || mode === 'all') {
    await shot('01-driver-seat');
    await page.keyboard.down('w'); await step(5000); await page.keyboard.up('w');
    const accelerating = await shot('02-accelerating'); check('W accelerates and travels', accelerating.car.speed > 7 && accelerating.car.distance > 20, JSON.stringify(accelerating.car));
    const heading = accelerating.car.heading;
    await page.keyboard.down('d'); await page.keyboard.down('w'); await step(500); await page.keyboard.up('d'); await page.keyboard.up('w');
    const steering = await state(); check('D turns vehicle and wheel', steering.car.heading > heading && steering.car.steering > .2);
    await page.keyboard.down('s'); await step(4500); await page.keyboard.up('s');
    const braked = await state(); check('S stops vehicle', braked.car.speed < .1, braked.car.speed);
    await page.keyboard.press('r'); await step(0); const reset = await state(); check('R resets to right lane', Math.abs(reset.car.lateral - 1.8) < .01 && reset.car.speed === 0);
    await page.mouse.move(width * .7, height * .4); await page.mouse.down(); await page.mouse.move(width * .47, height * .46, { steps: 14 }); await page.mouse.up(); await step(0);
    const looked = await shot('03-side-look'); check('mouse drag free look', Math.abs(looked.look.yaw) > .2);
    await page.keyboard.press('Space'); await step(0); check('Space recentres view', (await state()).look.yaw === 0);
    await page.keyboard.press('c'); await step(0); check('C selects exterior camera', (await shot('04-exterior')).camera === 'exterior');
    await page.keyboard.press('c'); await step(0);
    await page.keyboard.press('Escape'); check('Escape pauses', (await state()).mode === 'paused');
    await page.selectOption('#quality', 'balanced'); await shot('05-settings');
    await page.click('#resume-button'); check('Resume returns to drive', (await state()).mode === 'driving');
    await page.keyboard.press('m'); check('M toggles sound', (await state()).muted === true);
    await page.keyboard.press('e'); check('E enables scenic drive', (await state()).automatic);
    await step(12000); const driven = await state(); check('autodrive follows same road physics', driven.car.speed > 10 && Math.abs(driven.car.lateral - 1.8) < .6, JSON.stringify(driven.car));
    await page.keyboard.down('a'); await step(100); await page.keyboard.up('a'); check('manual steering takes over from autodrive', !(await state()).automatic);
    await page.keyboard.press('r'); await step(0);
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(150); await step(0); await shot('06-resize-1280x720');
    check('resize adjusts drawing buffer', (await page.evaluate(() => window.__roadtrip.metrics())).cssResolution === '1280 × 720');
    await page.setViewportSize({ width, height }); await page.waitForTimeout(150); await step(0);
  }
  if (mode === 'journey' || mode === 'all') {
    for (const s of [240, 1100, 2700, 5800, 12000, 100000]) {
      await page.evaluate(s => window.__roadtrip.seek(s), s); await settle();
      await shot(`vista-${s}-cabin`);
      await page.evaluate(() => window.__roadtrip.camera('exterior')); await shot(`vista-${s}-exterior`);
      await page.evaluate(() => window.__roadtrip.camera('cabin'));
      const st = await state(); check(`route ${s} is finite and drivable`, Number.isFinite(st.car.y) && Math.abs(st.car.lateral - 1.8) < .01);
    }
    await page.evaluate(() => window.__roadtrip.seek(240));
    await page.evaluate(() => window.__roadtrip.auto(true));
    const streamSamples = [];
    const loops = Number(args.loops || 14);
    for (let i = 0; i < loops; i++) {
      await step(30000); await settle();
      const m = await page.evaluate(() => window.__roadtrip.metrics()); streamSamples.push(m);
      check(`continuous traversal segment ${i + 1}`, Math.abs(m.vehicle.lateral - 1.8) < .7 && m.vehicle.speed > 8, `s=${m.vehicle.s.toFixed(2)},lane=${m.vehicle.lateral.toFixed(3)}`);
      if (i % 4 === 0) await shot(`continuous-${String(i).padStart(2, '0')}`);
      console.log(`driving segment ${i + 1}/${loops}: ${(m.vehicle.s / 1000).toFixed(2)} km; geometries ${m.memory.geometries}`);
    }
    await fs.writeFile(path.join(out, 'continuous-metrics.json'), JSON.stringify(streamSamples, null, 2));
    for (let i = 0; i < 12; i++) { await step(100); await shot(`sequence-${String(i).padStart(2, '0')}`); }
  }
  if (mode === 'performance' || mode === 'all') {
    await page.evaluate(() => window.__roadtrip.seek(240)); await page.evaluate(() => window.__roadtrip.auto(true));
    await page.evaluate(() => window.__roadtrip.realTime(true));
    const seconds = Number(args.duration || 60);
    const timeline = [];
    for (let elapsed = 0; elapsed < seconds; elapsed += 10) {
      await page.waitForTimeout(Math.min(10, seconds - elapsed) * 1000);
      const m = await page.evaluate(() => window.__roadtrip.metrics()); timeline.push(m);
      console.log(`real-time ${Math.min(elapsed + 10, seconds)}s: ${m.fps.toFixed(1)} fps, p95 ${m.frameMs.p95.toFixed(2)}ms; ${m.resolution}; geometries ${m.memory.geometries}`);
    }
    await fs.writeFile(path.join(out, 'performance-timeline.json'), JSON.stringify(timeline, null, 2));
    await shot('performance-final');
  }
  const metrics = await page.evaluate(() => window.__roadtrip.metrics());
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), version: gl.getParameter(gl.VERSION) };
  });
  check('no browser/shader errors', errors.length === 0, JSON.stringify(errors));
  result = { url: page.url(), mode, timestamp: new Date().toISOString(), viewport: { width, height }, dpr, renderer, checks, passed: checks.every(c => c.passed), errors, metrics, frames };
} catch (error) {
  errors.push({ type: 'harness', message: error.stack || String(error) });
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  result = { passed: false, checks, errors, frames };
} finally {
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: result.passed, checks: checks.length, errors: errors.length, out }));
  await browser.close();
}
if (!result.passed) process.exitCode = 1;
