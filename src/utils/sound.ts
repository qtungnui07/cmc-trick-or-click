class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTimeOffset = 0, gainVal = 0.12) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime + startTimeOffset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTimeOffset);
    osc.stop(ctx.currentTime + startTimeOffset + duration);
  }

  public click() {
    this.playTone(520, 'square', 0.05, 0, 0.08);
  }

  public swipe() {
    this.playTone(300, 'triangle', 0.07, 0, 0.08);
    this.playTone(440, 'square', 0.06, 0.04, 0.06);
  }

  public swapAlert() {
    // 8-bit surprise warble sound when buttons swap positions
    this.playTone(350, 'sawtooth', 0.06, 0, 0.12);
    this.playTone(650, 'sawtooth', 0.07, 0.06, 0.14);
    this.playTone(480, 'square', 0.08, 0.13, 0.13);
  }

  public correct() {
    this.playTone(523.25, 'square', 0.09, 0, 0.12); // C5
    this.playTone(659.25, 'square', 0.09, 0.08, 0.12); // E5
    this.playTone(783.99, 'square', 0.16, 0.16, 0.14); // G5
    this.playTone(1046.5, 'square', 0.22, 0.24, 0.14); // C6
  }

  public wrong() {
    this.playTone(220, 'sawtooth', 0.14, 0, 0.15);
    this.playTone(164.81, 'sawtooth', 0.18, 0.12, 0.15);
    this.playTone(110, 'square', 0.28, 0.24, 0.16);
  }

  public winSticker() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.1, 0.2, 0.3, 0.45, 0.58];
    const durs = [0.09, 0.09, 0.09, 0.14, 0.11, 0.35];
    notes.forEach((n, idx) => {
      this.playTone(n, 'square', durs[idx], times[idx], 0.14);
    });
  }

  public gameOver() {
    const notes = [392.0, 369.99, 349.23, 329.63, 261.63];
    const times = [0, 0.14, 0.28, 0.42, 0.6];
    const durs = [0.12, 0.12, 0.12, 0.16, 0.4];
    notes.forEach((n, idx) => {
      this.playTone(n, 'sawtooth', durs[idx], times[idx], 0.13);
    });
  }
}

export const soundFX = new SoundEngine();
