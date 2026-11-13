import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ValleyPainter } from '../render/ValleyPainter';
import type { PaletteName } from '../render/palettes';
import type { VehicleState } from './Vehicle';

const UP = new THREE.Vector3(0, 1, 0);

/** Every solid is authored in metres, then shaded with the Painted Valley palette.
 * Geometry is merged by pigment. The wheel alone has a moving local transform. */
export class Cabin {
  readonly group = new THREE.Group();
  readonly wheel = new THREE.Group();
  readonly eye = new THREE.Vector3(-.47, 1.74, .36);
  private readonly batches = new Map<PaletteName, THREE.BufferGeometry[]>();
  private readonly dialCanvas = document.createElement('canvas');
  private readonly dialTexture: THREE.CanvasTexture;
  private lastDial = -1;
  private readonly wheels: THREE.Group[] = [];
  private readonly bobble = new THREE.Group();
  private disposed: (() => void)[] = [];
  constructor(private readonly painter: ValleyPainter) {
    this.group.name = 'Camper — painted cream and sage';
    this.buildBody();
    for (const [palette, geometries] of this.batches) {
      this.addPainted(mergeGeometries(geometries, false), palette, this.group, palette === 'cream' ? [.055, .17] : [.04, .11]);
      geometries.forEach(g => g.dispose());
    }
    this.batches.clear();
    this.buildWheel();
    this.dialCanvas.width = 768; this.dialCanvas.height = 320;
    this.dialTexture = new THREE.CanvasTexture(this.dialCanvas);
    this.dialTexture.colorSpace = THREE.NoColorSpace;
    this.dialTexture.anisotropy = 4;
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(.62, .258), new THREE.MeshBasicMaterial({ map: this.dialTexture, toneMapped: false, side: THREE.DoubleSide }));
    dial.position.set(-.53, 1.20, -1.426);
    dial.rotation.x = -.13;
    dial.renderOrder = 6;
    this.group.add(dial);
    this.buildMap();
    this.updateDial(0, 0, false);
  }
  private addPainted(g: THREE.BufferGeometry, palette: PaletteName, parent: THREE.Group, stroke: [number, number] = [.045, .13]) {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    parent.add(m);
    const painted = this.painter.paintMesh(m, palette, { stroke, density: 1.05, grain: new THREE.Vector3(1, .18, 0), seed: 547 + parent.children.length * 91, maxCount: 14000 });
    if (!painted.strokes.parent) parent.add(painted.strokes);
    this.disposed.push(() => { painted.dispose(); g.dispose(); });
    return m;
  }
  private shape(g: THREE.BufferGeometry, palette: PaletteName, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
    if (!g.attributes.normal) g.computeVertexNormals();
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    // Merge only attributes that every procedural primitive owns.
    flat.deleteAttribute('uv');
    if (!this.batches.has(palette)) this.batches.set(palette, []);
    this.batches.get(palette)!.push(flat);
  }
  private box(p: PaletteName, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0) { this.shape(new THREE.BoxGeometry(w, h, d), p, x, y, z, rx, ry, rz); }
  private round(p: PaletteName, x: number, y: number, z: number, r: number, h: number, rx = 0, rz = 0, top = r) { this.shape(new THREE.CylinderGeometry(top, r, h, 16, 1), p, x, y, z, rx, 0, rz); }
  private beam(p: PaletteName, a: number[], b: number[], r: number) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(r, r, direction.length(), 9);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
    this.shape(g, p, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  }
  private buildBody() {
    // Lower body and an open, real window volume. No transparent glass or screen-space cabin image.
    this.box('teal', 0, .36, .15, 2.36, .6, 4.55);
    this.box('rubber', 0, .075, .15, 2.1, .15, 4.1);
    this.box('wood', 0, .52, .2, 2.13, .045, 3.95);
    this.box('cream', 0, .91, -2.05, 2.36, .58, .22);
    this.box('cream', 0, 2.49, .1, 2.43, .14, 4.36);
    this.box('cream', 0, 1.48, 2.31, 2.35, 1.91, .12);
    this.box('wood', 0, 1.43, 2.235, 2.15, 1.65, .028);
    for (const side of [-1, 1]) {
      this.box('cream', side * 1.17, .97, .12, .13, .72, 4.1);
      // A pillars lean backward at the top, preserving a generous windshield.
      this.beam('cream', [side * 1.14, 1.14, -2.02], [side * 1.13, 2.45, -1.73], .067);
      this.beam('rubber', [side * 1.06, 1.14, -2.035], [side * 1.055, 2.42, -1.74], .019);
      this.box('cream', side * 1.16, 1.82, .92, .11, 1.27, .16);
      this.box('cream', side * 1.16, 1.82, 2.18, .11, 1.27, .12);
      this.box('cream', side * 1.15, 2.35, -.47, .12, .12, 2.6);
      this.box('rubber', side * 1.16, 1.20, -.43, .145, .055, 2.75);
      this.box('teal', side * 1.08, .94, -.15, .12, .34, 1.53);
      this.box('wood', side * 1.035, 1.0, -.03, .14, .07, .56);
      this.beam('metal', [side * 1.0, 1.08, -.3], [side * 1.0, 1.08, -.08], .02);
      // Rear window is a real opening framed by the shell.
      this.box('cream', side * 1.17, 1.45, 1.52, .1, .14, 1.22);
      // Exterior mirror frame (stylized painted mirror, no expensive reflection).
      this.beam('metal', [side * 1.17, 1.36, -1.55], [side * 1.48, 1.42, -1.64], .018);
      this.box('rubber', side * 1.48, 1.55, -1.64, .18, .3, .045, 0, -side * .2);
      this.box('metal', side * 1.48, 1.55, -1.61, .14, .25, .015, 0, -side * .2);
      // A pair of low leather seats. Driver is intentionally not a floating character model.
      this.box('wood', side * .53, .72, .22, .69, .22, .67);
      this.box('wood', side * .53, 1.02, .61, .67, .78, .14, -.12);
      this.box('cream', side * .53, 1.40, .67, .38, .23, .14, -.12);
      this.beam('metal', [side * .53 - .16, .54, .2], [side * .53 - .16, .67, .2], .018);
      // Actual rubber wheels with painted hubs for the exterior/debug camera.
      for (const z of [-1.38, 1.43]) {
        this.round('rubber', side * 1.17, .13, z, .38, .22, 0, Math.PI / 2);
        this.round('metal', side * 1.294, .13, z, .21, .022, 0, Math.PI / 2);
        this.round('cream', side * 1.31, .13, z, .115, .027, 0, Math.PI / 2);
      }
    }
    // Window rails. The absence of glass is deliberate: painterly depth stays crisp.
    this.box('cream', 0, 2.43, -1.75, 2.30, .13, .13);
    this.box('cream', 0, 1.15, -2.01, 2.30, .12, .14);
    this.box('rubber', 0, 1.20, -2.002, 2.18, .025, .035);
    this.box('rubber', 0, 2.36, -1.785, 2.16, .025, .035);

    // Dashboard: sage enamel with a cream lip and small wooden fascia.
    this.box('teal', 0, 1.0, -1.58, 2.13, .28, .83);
    this.box('cream', 0, 1.12, -1.58, 2.17, .062, .86);
    this.box('wood', .48, 1.01, -1.143, 1.06, .18, .04);
    this.box('rubber', -.53, 1.205, -1.45, .68, .29, .075, -.13);
    this.box('teal', -.53, 1.37, -1.49, .75, .045, .20, -.13);
    // Passenger glove box, brass latch, four physical vents and radio knobs.
    this.box('cream', .65, .99, -1.112, .64, .12, .018);
    this.box('metal', .65, 1.02, -1.095, .13, .018, .015);
    for (const x of [-.96, .04]) {
      this.box('rubber', x, 1.04, -1.13, .13, .075, .022);
      for (let j = 0; j < 3; j++) this.box('metal', x, 1.022 + j * .022, -1.11, .105, .006, .012);
    }
    this.box('rubber', .20, .98, -1.11, .24, .075, .022);
    for (const x of [.09, .31]) this.round('metal', x, .98, -1.075, .025, .03, Math.PI / 2);
    this.beam('rubber', [-.53, .84, -1.40], [-.53, 1.10, -1.05], .06);
    // Centre gear lever and its ivory knob.
    this.beam('metal', [.02, .55, -.54], [.10, .96, -.67], .014);
    this.shape(new THREE.SphereGeometry(.043, 12, 8), 'cream', .10, .96, -.67);

    // A small ceramic mug and a thermos, painted in the same language as the landscape.
    this.round('red', .83, 1.235, -1.5, .065, .17, 0, 0, .060);
    this.round('rubber', .83, 1.325, -1.5, .048, .008);
    this.shape(new THREE.TorusGeometry(.055, .012, 8, 16), 'red', .91, 1.245, -1.5, 0, Math.PI / 2);
    this.round('metal', .98, 1.29, -1.81, .055, .29);
    this.round('teal', .98, 1.445, -1.81, .057, .035);

    // Rear camper furniture visible in free look and the exterior view.
    this.box('teal', -.65, .88, 1.76, .84, .57, .72);
    this.box('cream', -.65, 1.18, 1.76, .86, .08, .77);
    this.box('wood', .57, .88, 1.69, .73, .55, .84);
    this.box('cream', .57, 1.17, 1.69, .76, .06, .89);
    // Slim luggage rails on top; a muted ochre travel case.
    for (const x of [-.82, .82]) this.beam('metal', [x, 2.60, -.8], [x, 2.60, 1.8], .025);
    for (const z of [-.8, .5, 1.8]) this.beam('metal', [-.85, 2.62, z], [.85, 2.62, z], .025);
    this.box('wood', -.2, 2.79, 1.15, 1.25, .31, .75);
    for (const x of [-.63, .23]) this.box('rubber', x, 2.96, 1.15, .052, .018, .77);
    // Front bumper, lamps and grille.
    this.box('metal', 0, .40, -2.24, 2.28, .12, .13);
    for (const x of [-.84, .84]) this.round('white', x, .82, -2.18, .13, .035, Math.PI / 2);
    for (let j = 0; j < 4; j++) this.box('rubber', 0, .70 + j * .065, -2.18, .74, .025, .018);
  }
  private buildWheel() {
    this.wheel.position.set(-.53, 1.09, -1.035);
    this.wheel.rotation.x = -.35;
    this.group.add(this.wheel);
    this.addPainted(new THREE.TorusGeometry(.29, .026, 9, 44), 'wood', this.wheel, [.018, .055]);
    const spokes: THREE.BufferGeometry[] = [];
    for (const a of [0, Math.PI, -Math.PI / 2]) {
      const g = new THREE.BoxGeometry(.235, .031, .016);
      g.translate(.15, 0, 0); g.rotateZ(a); spokes.push(g);
    }
    this.addPainted(mergeGeometries(spokes, false), 'metal', this.wheel, [.015, .048]);
    spokes.forEach(g => g.dispose());
    const hub = new THREE.CylinderGeometry(.075, .075, .04, 24); hub.rotateX(Math.PI / 2);
    this.addPainted(hub, 'teal', this.wheel, [.018, .042]);
    const badge = new THREE.CylinderGeometry(.028, .028, .007, 16); badge.rotateX(Math.PI / 2); badge.translate(0, 0, .026);
    this.addPainted(badge, 'cream', this.wheel, [.01, .026]);
  }
  private buildMap() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#d3bf8d'; c.fillRect(0, 0, 512, 320);
    for (let i = 0; i < 26; i++) {
      c.strokeStyle = i % 3 ? '#a8aa7b' : '#919b6d'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-20, i * 15);
      c.bezierCurveTo(120, i * 10 - 50, 220, i * 15 + 100, 540, i * 12); c.stroke();
    }
    c.strokeStyle = '#e4d7b0'; c.lineWidth = 14; c.beginPath(); c.moveTo(230, 340); c.bezierCurveTo(80, 250, 410, 160, 290, -20); c.stroke();
    c.strokeStyle = '#a36948'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#57664f'; c.font = '20px Georgia'; c.fillText('THE LONG WAY', 25, 38);
    c.font = '14px Georgia'; c.fillText('Somewhere beautiful', 25, 60);
    c.strokeStyle = '#b49f74'; c.lineWidth = 2; c.beginPath(); c.moveTo(256, 0); c.lineTo(256, 320); c.stroke();
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.36, .225), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    m.rotation.set(-Math.PI / 2, 0, -.14); m.position.set(.48, 1.154, -1.57);
    this.group.add(m);
  }
  update(state: VehicleState, origin: { x: number; z: number }, automatic: boolean) {
    this.group.position.set(state.x - origin.x, state.y, state.z - origin.z);
    this.group.rotation.set(state.pitch, -state.heading, state.roll, 'YXZ');
    this.wheel.rotation.z = -state.steering * 1.75;
    const kmh = Math.round(state.speed * 3.6);
    if (kmh !== this.lastDial || Math.round(state.distance / 10) % 10 === 0) this.updateDial(kmh, state.distance, automatic);
    this.group.updateMatrixWorld(true);
  }
  private updateDial(speed: number, distance: number, auto: boolean) {
    this.lastDial = speed;
    const c = this.dialCanvas.getContext('2d')!, w = this.dialCanvas.width, h = this.dialCanvas.height;
    c.fillStyle = '#203c35'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#9d9e7c'; c.lineWidth = 3; c.strokeRect(8, 8, w - 16, h - 16);
    const cx = 286, cy = 165, radius = 133;
    c.strokeStyle = '#bec4a0'; c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, radius, Math.PI * .78, Math.PI * 2.22); c.stroke();
    c.font = '20px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ddd4ab';
    for (let i = 0; i <= 100; i += 10) {
      const a = Math.PI * .78 + i / 100 * Math.PI * 1.44;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120); c.lineTo(cx + Math.cos(a) * 108, cy + Math.sin(a) * 108); c.stroke();
      c.fillText(String(i), cx + Math.cos(a) * 87, cy + Math.sin(a) * 87);
    }
    const needle = Math.PI * .78 + speed / 100 * Math.PI * 1.44;
    c.strokeStyle = '#dca274'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - Math.cos(needle) * 16, cy - Math.sin(needle) * 16); c.lineTo(cx + Math.cos(needle) * 101, cy + Math.sin(needle) * 101); c.stroke();
    c.fillStyle = '#e0c58f'; c.beginPath(); c.arc(cx, cy, 9, 0, Math.PI * 2); c.fill();
    c.font = '18px Georgia'; c.fillStyle = '#b5bd9c'; c.fillText('km / h', cx, cy + 52);
    c.textAlign = 'left'; c.font = '18px Georgia'; c.fillText('WANDERER', 470, 70);
    c.font = '48px Georgia'; c.fillStyle = '#e4d8ab'; c.fillText(speed.toString().padStart(2, '0'), 470, 127);
    c.font = '17px Georgia'; c.fillStyle = '#b8c39d'; c.fillText(`${(distance / 1000).toFixed(1)} km`, 470, 182);
    c.fillText(auto ? 'SCENIC DRIVE' : 'HAPPY WANDERING', 470, 229);
    c.fillStyle = '#bbca9a'; c.beginPath(); c.arc(480, 265, 4, 0, Math.PI * 2); c.fill();
    c.font = '14px Georgia'; c.fillText('HOME IS A DIRECTION', 497, 265);
    if (this.dialTexture) this.dialTexture.needsUpdate = true;
  }
  dispose() { this.disposed.forEach(f => f()); this.dialTexture.dispose(); }
}
