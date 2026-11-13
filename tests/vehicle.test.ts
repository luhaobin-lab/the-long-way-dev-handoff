import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorldField } from '../src/world/field';
import { Vehicle } from '../src/vehicle/Vehicle';

test('W accelerates smoothly, brake stops, reset returns to the right lane', () => {
  const car = new Vehicle(new WorldField('wildflower'), 240);
  for (let n = 0; n < 1200; n++) car.step(1 / 120, { throttle: 1, brake: 0, steer: 0 });
  assert.ok(car.state.speed > 15 && car.state.speed <= 25);
  for (let n = 0; n < 600; n++) car.step(1 / 120, { throttle: 0, brake: 1, steer: 0 });
  assert.equal(car.state.speed, 0);
  const travelled = car.state.distance;
  car.reset();
  assert.ok(Math.abs(car.state.lateral - 1.8) < 1e-6);
  assert.equal(car.state.speed, 0);
  assert.equal(car.state.distance, travelled);
});

test('scenic driver uses the same steering model and stays on the road over 12 km', () => {
  let maximumLaneError = 0, totalDistance = 0;
  for (const [seed, start] of [['wildflower', 240], ['valley-17', 47000], ['summer', 99900]] as const) {
    const car = new Vehicle(new WorldField(seed), start);
    for (let n = 0; n < 120 * 260; n++) {
      car.step(1 / 120, car.scenicInput());
      const v = car.state;
      maximumLaneError = Math.max(maximumLaneError, Math.abs(v.lateral - 1.8));
      assert.ok(Number.isFinite(v.y) && Number.isFinite(v.heading));
      assert.ok(Math.abs(v.pitch) <= .25 && Math.abs(v.roll) <= .17);
      assert.ok(Math.abs(v.lateral - 1.8) < 1.2, `${seed} at ${v.s}: lateral=${v.lateral}`);
    }
    totalDistance += car.state.distance;
  }
  assert.ok(totalDistance > 12000);
  console.log(JSON.stringify({ vehiclePhysicsDistanceMetres: totalDistance, maximumLaneError, evidence: 'accelerated numerical simulation, not browser FPS or human play' }));
});

test('a tree contact moves the camper out of penetration and slows it without non-finite state', () => {
  const car = new Vehicle(new WorldField('collision'));
  car.state.speed = 12;
  const obstacle = { x: car.state.x + .7, z: car.state.z, radius: .5 };
  car.collide([obstacle]);
  assert.ok(car.state.speed < 3);
  assert.ok(Math.hypot(car.state.x - obstacle.x, car.state.z - obstacle.z) >= 1.3999);
  assert.equal(car.state.collision, 1);
});
