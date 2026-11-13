import { WorldField } from '../world/field';

export interface DriveInput { throttle: number; brake: number; steer: number }
export interface VehicleState {
  x: number; y: number; z: number; s: number; heading: number;
  speed: number; steering: number; pitch: number; roll: number;
  distance: number; lateral: number; offroad: boolean; collision: number;
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const angle = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));

/** Lightweight, fixed-step bicycle dynamics with four independent height contacts.
 * Global doubles are the authority; no render object feeds back into simulation.
 * This is a peaceful road vehicle, not a rigid-body stunt or damage simulation. */
export class Vehicle {
  readonly state: VehicleState;
  private vy = 0;
  private pitchV = 0;
  private rollV = 0;
  private elapsed = 0;
  private lastAccel = 0;
  private collisionCooldown = 0;
  constructor(readonly field: WorldField, s = 240) {
    this.state = { x: 0, y: 0, z: 0, s, heading: 0, speed: 0, steering: 0, pitch: 0, roll: 0, distance: 0, lateral: 1.8, offroad: false, collision: 0 };
    this.reset(s);
  }
  reset(s = this.state.s) {
    const r = this.field.roadAt(s);
    Object.assign(this.state, {
      x: r.position.x + r.right.x * 1.8,
      z: r.position.z + r.right.z * 1.8,
      y: r.position.y + .42,
      heading: r.heading, s, speed: 0, steering: 0,
      pitch: Math.atan(r.grade), roll: 0, lateral: 1.8, offroad: false,
    });
    this.vy = this.pitchV = this.rollV = this.lastAccel = 0;
  }
  scenicInput(): DriveInput {
    const v = this.state;
    const lookahead = 12 + v.speed * .85;
    const r = this.field.roadAt(v.s + lookahead);
    const targetX = r.position.x + r.right.x * 1.8;
    const targetZ = r.position.z + r.right.z * 1.8;
    const error = angle(Math.atan2(targetX - v.x, -(targetZ - v.z)) - v.heading);
    const wheel = Math.atan2(2 * 2.7 * Math.sin(error), lookahead);
    const steerLimit = .48 / (1 + Math.abs(v.speed) * .055);
    const bend = Math.max(Math.abs(r.curvature), Math.abs(this.field.roadAt(v.s + 45).curvature));
    const targetSpeed = Math.min(16.7, Math.sqrt(1.5 / Math.max(.002, bend)));
    return { steer: clamp(wheel / steerLimit, -1, 1), throttle: clamp((targetSpeed - v.speed) * .5 + .4, 0, 1), brake: clamp((v.speed - targetSpeed - .4) * .6, 0, 1) };
  }
  step(dt: number, input: DriveInput) {
    const v = this.state;
    this.elapsed += dt;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    v.steering += (clamp(input.steer, -1, 1) - v.steering) * (1 - Math.exp(-dt * 5.5));
    const off = v.offroad ? 1 : 0;
    const accel = input.throttle * (3.3 - Math.max(v.speed - 15, 0) * .11)
      - input.brake * 7.5 - .32 - v.speed * .045 - v.speed * v.speed * .002
      - off * (.55 + v.speed * .13) - Math.sin(v.pitch) * 3;
    v.speed = clamp(v.speed + accel * dt, 0, 25);
    this.lastAccel += (accel - this.lastAccel) * (1 - Math.exp(-dt * 3));
    const wheel = v.steering * (.48 / (1 + v.speed * .055));
    const yawRate = v.speed / 2.7 * Math.tan(wheel);
    v.heading = angle(v.heading + yawRate * dt);
    const sn = Math.sin(v.heading), cs = Math.cos(v.heading);
    const dx = sn * v.speed * dt, dz = -cs * v.speed * dt;
    v.x += dx; v.z += dz;
    v.distance += Math.hypot(dx, dz);
    const road = this.field.project(v.x, v.z);
    v.s = road.s;
    v.lateral = road.lateral;
    v.offroad = Math.abs(road.lateral) > road.halfWidth + .4;

    // Four wheel contacts keep the body tied to the same surface that is rendered.
    const fx = sn * 1.35, fz = -cs * 1.35, rx = cs * .77, rz = sn * .77;
    const fl = this.field.height(v.x + fx - rx, v.z + fz - rz);
    const fr = this.field.height(v.x + fx + rx, v.z + fz + rz);
    const bl = this.field.height(v.x - fx - rx, v.z - fz - rz);
    const br = this.field.height(v.x - fx + rx, v.z - fz + rz);
    const ground = (fl + fr + bl + br) * .25;
    const roadRipple = Math.sin(v.distance * 1.8) * .0025 * Math.min(v.speed / 12, 1);
    const rough = off * Math.sin(v.distance * 3.7) * .012 * Math.min(v.speed / 8, 1);
    const targetY = ground + .42 + roadRipple + rough;
    this.vy += ((targetY - v.y) * 80 - this.vy * 16) * dt;
    v.y += this.vy * dt;
    v.y = Math.max(v.y, ground + .25);
    const targetPitch = clamp(Math.atan2((fl + fr - bl - br) * .5, 2.7) - this.lastAccel * .004, -.24, .24);
    const targetRoll = clamp(Math.atan2((fr + br - fl - bl) * .5, 1.54) + yawRate * v.speed * .007, -.16, .16);
    this.pitchV += ((targetPitch - v.pitch) * 55 - this.pitchV * 14) * dt;
    this.rollV += ((targetRoll - v.roll) * 45 - this.rollV * 13) * dt;
    v.pitch += this.pitchV * dt; v.roll += this.rollV * dt;
  }
  /** Broad-phase obstacle query is performed outside the hot physics loop. */
  collide(obstacles: readonly { x: number; z: number; radius: number }[]) {
    const v = this.state;
    for (const o of obstacles) {
      const dx = v.x - o.x, dz = v.z - o.z, dist = Math.hypot(dx, dz);
      const limit = .9 + o.radius;
      if (dist < limit && dist > .0001) {
        v.x = o.x + dx / dist * limit; v.z = o.z + dz / dist * limit;
        v.speed *= .18;
        if (!this.collisionCooldown) { v.collision++; this.collisionCooldown = 1; }
      }
    }
  }
}
