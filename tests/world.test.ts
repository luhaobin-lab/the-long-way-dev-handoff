import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { WorldField, ROAD_HALF_WIDTH } from '../src/world/field.ts';

const seeds = ['wildflower', 'long-way-2026', 'valley', 'aeolian', '0', '1', '你好'];
test('world reconstruction is independent of request order and new instances', () => {
  for (const seed of seeds) {
    const a = new WorldField(seed), b = new WorldField(seed);
    const positions = Array.from({ length: 80 }, (_, i) => ({ x: Math.sin(i * 1.17) * 1200, z: i * -1643.713 + 500 }));
    const expected = positions.map(p => a.height(p.x, p.z));
    for (let i = positions.length - 1; i >= 0; i--) assert.equal(b.height(positions[i].x, positions[i].z), expected[i]);
    assert.deepEqual(a.roadAt(123456.78), b.roadAt(123456.78));
    assert.deepEqual(a.treesIn(80, -120, 50), b.treesIn(80, -120, 50));
  }
});
test('different seeds produce materially different roads and landscape', () => {
  const a = new WorldField('wildflower'), b = new WorldField('aeolian');
  assert.ok(Math.abs(a.roadAt(500).position.x - b.roadAt(500).position.x) > 5);
  assert.ok(Math.abs(a.height(500, -1000) - b.height(500, -1000)) > 1);
});
test('100 km per seed: route monotonicity, finite geometry, gentle grade and bounded curvature', () => {
  let worstGrade = 0, worstCurvature = 0;
  for (const seed of seeds) {
    const field = new WorldField(seed);
    for (let s = -1000; s <= 100000; s += 10) {
      const p = field.roadAt(s), q = field.roadAt(s + 10);
      assert.equal(p.position.z, -s);
      assert.ok(q.position.z < p.position.z, 'strictly monotonic Z prevents road self-intersection');
      assert.ok(Object.values(p.position).every(Number.isFinite));
      assert.ok(Math.abs(p.grade) < .08, `${seed} grade at ${s}: ${p.grade}`);
      assert.ok(Math.abs(p.curvature) < .006, `${seed} curvature at ${s}: ${p.curvature}`);
      assert.ok(Math.abs(Math.hypot(p.tangent.x, p.tangent.y, p.tangent.z) - 1) < 1e-12);
      assert.ok(Math.abs(p.tangent.x * p.right.x + p.tangent.z * p.right.z) < 1e-12);
      worstGrade = Math.max(worstGrade, Math.abs(p.grade)); worstCurvature = Math.max(worstCurvature, Math.abs(p.curvature));
    }
  }
  console.log(JSON.stringify({ checkedKilometresPerSeed: 101, seeds: seeds.length, worstGrade, minimumTurnRadiusMetres: 1 / worstCurvature }));
});
test('road and terrain meet at exact lane and shoulder samples, including chunk joins', () => {
  for (const seed of seeds) {
    const f = new WorldField(seed);
    for (let s = -128; s < 15000; s += 127.999) for (const lateral of [-f.roadAt(s).halfWidth, -1.9, 0, 1.9, f.roadAt(s).halfWidth]) {
      const r = f.roadAt(s), x = r.position.x + r.right.x * lateral, z = r.position.z + r.right.z * lateral;
      const p = f.project(x, z);
      assert.ok(Math.abs(p.s - s) < 1e-7);
      assert.ok(Math.abs(p.lateral - lateral) < 1e-7);
      assert.ok(Math.abs(f.height(x, z) - r.position.y) < 1e-8, `${seed}/${s}/${lateral}`);
    }
  }
});
test('terrain continuity at grid borders and road transitions', () => {
  const f = new WorldField('wildflower');
  for (let tile = -40; tile <= 40; tile++) {
    for (let j = 0; j <= 24; j++) {
      const x = tile * 256, z = j / 24 * 256 - 1200;
      assert.ok(Math.abs(f.height(x - 1e-5, z) - f.height(x + 1e-5, z)) < .001);
    }
  }
  for (let s = 0; s < 20000; s += 71.3) {
    const r = f.roadAt(s);
    for (const u of [3.8, 5.45, 30, 61.99, 62.01]) {
      const a = f.height(r.position.x + r.right.x * (u - 1e-5), r.position.z + r.right.z * (u - 1e-5));
      const b = f.height(r.position.x + r.right.x * (u + 1e-5), r.position.z + r.right.z * (u + 1e-5));
      assert.ok(Math.abs(a - b) < .001, `transition discontinuity at ${s},${u}: ${a-b}`);
    }
  }
});
test('vegetation keeps the entire driving corridor clear', () => {
  for (const seed of seeds) {
    const f = new WorldField(seed);
    for (let s = 0; s < 3000; s += 160) {
      const p = f.roadAt(s);
      for (const tree of f.treesIn(p.position.x, p.position.z, 100)) assert.ok(Math.abs(f.project(tree.x, tree.z).lateral) > 9.5);
    }
  }
});
