/** Soft, procedural engine and tyre sound. Starts only after the player's gesture. */
export class RoadAudio {
  private ctx?: AudioContext;
  private gain?: GainNode;
  private engine?: OscillatorNode;
  private overtone?: OscillatorNode;
  private tyre?: GainNode;
  muted = false;
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const ctx = this.ctx;
      this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(ctx.destination);
      this.engine = ctx.createOscillator(); this.engine.type = 'sine'; this.engine.frequency.value = 38;
      const eg = ctx.createGain(); eg.gain.value = .16; this.engine.connect(eg); eg.connect(this.gain); this.engine.start();
      this.overtone = ctx.createOscillator(); this.overtone.type = 'triangle';
      const og = ctx.createGain(); og.gain.value = .025; this.overtone.connect(og); og.connect(this.gain); this.overtone.start();
      const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const a = noise.getChannelData(0); let last = 0, seed = 17;
      for (let i = 0; i < a.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; last = (last + (seed / 4294967296 * 2 - 1) * .02) / 1.02; a[i] = last * 3; }
      const source = ctx.createBufferSource(); source.buffer = noise; source.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
      this.tyre = ctx.createGain(); source.connect(filter); filter.connect(this.tyre); this.tyre.connect(this.gain); source.start();
    }
    await this.ctx.resume();
  }
  update(speed: number, throttle: number, paused: boolean) {
    if (!this.ctx || !this.gain || !this.engine || !this.overtone || !this.tyre) return;
    const t = this.ctx.currentTime;
    this.gain.gain.setTargetAtTime(this.muted || paused ? 0 : .48, t, .3);
    const hz = 31 + speed * 1.8 + throttle * 5;
    this.engine.frequency.setTargetAtTime(hz, t, .2); this.overtone.frequency.setTargetAtTime(hz * 2, t, .2);
    this.tyre.gain.setTargetAtTime(Math.min(speed / 25, 1) * .22, t, .2);
  }
}
