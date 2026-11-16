// Sons synthétisés (Web Audio) : aucun fichier. Le contexte naît au premier geste du joueur.
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  on = true;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, when = 0): void {
    const c = this.ctx;
    if (!this.on || !c || !this.master) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click(): void { this.tone(520, 0.06, 'square', 0.12); }
  jump(): void { this.tone(300, 0.16, 'triangle', 0.3, 640); }
  land(): void { this.tone(150, 0.07, 'sine', 0.22, 90); }
  fish(): void { this.tone(880, 0.07, 'square', 0.14); this.tone(1320, 0.1, 'square', 0.14, undefined, 0.06); }
  boost(): void { this.tone(260, 0.4, 'sawtooth', 0.16, 900); }
  hit(): void { this.tone(220, 0.35, 'sawtooth', 0.28, 60); }
  biome(): void { [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.22, undefined, i * 0.1)); }
  buy(): void { [660, 880, 1100].forEach((f, i) => this.tone(f, 0.12, 'square', 0.14, undefined, i * 0.07)); }
}
