import type { DriveInput } from './Vehicle';

export class Input {
  readonly keys = new Set<string>();
  lookYaw = 0;
  lookPitch = 0;
  private dragging = false;
  private previous = { x: 0, y: 0 };
  onAction: (action: string) => void = () => {};
  constructor(readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      const actions: Record<string, string> = { KeyR: 'reset', KeyC: 'camera', KeyE: 'auto', Escape: 'pause', KeyF: 'fullscreen', KeyM: 'audio', Space: 'center', KeyH: 'help', Enter: 'start' };
      if (actions[e.code]) this.onAction(actions[e.code]);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.dragging = false; this.onAction('blur'); });
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      this.dragging = true; this.previous = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    window.addEventListener('mousemove', e => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !this.dragging) return;
      const dx = locked ? e.movementX : e.clientX - this.previous.x;
      const dy = locked ? e.movementY : e.clientY - this.previous.y;
      this.previous = { x: e.clientX, y: e.clientY };
      this.lookYaw = Math.max(-1.95, Math.min(1.95, this.lookYaw - dx * .0022));
      this.lookPitch = Math.max(-.48, Math.min(.5, this.lookPitch - dy * .0017));
    });
    canvas.addEventListener('dblclick', () => this.center());
  }
  center() { this.lookYaw = 0; this.lookPitch = 0; }
  get drive(): DriveInput {
    return {
      throttle: Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')),
      brake: Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')),
      steer: Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')),
    };
  }
}
