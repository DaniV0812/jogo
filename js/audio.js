// Efeitos sonoros gerados na hora com WebAudio: nenhum arquivo de áudio necessário.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.8);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.05, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, from), t0);
    if (to !== from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    }
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.4, vol = 0.25, from = 1200, to = 120 } = {}) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    this.tone({ type: 'square', from: 880, to: 260, dur: 0.08, vol: 0.03 });
  }

  enemyShoot() {
    this.tone({ type: 'sawtooth', from: 300, to: 120, dur: 0.12, vol: 0.025 });
  }

  explosion(big = false) {
    this.noise({ dur: big ? 0.7 : 0.35, vol: big ? 0.5 : 0.3, from: big ? 1500 : 1000, to: 80 });
  }

  hit() {
    this.tone({ type: 'sawtooth', from: 220, to: 60, dur: 0.22, vol: 0.09 });
  }

  shieldBreak() {
    this.tone({ type: 'triangle', from: 520, to: 120, dur: 0.35, vol: 0.09 });
  }

  powerup() {
    this.tone({ type: 'triangle', from: 520, dur: 0.08, vol: 0.06 });
    this.tone({ type: 'triangle', from: 780, dur: 0.09, vol: 0.06, delay: 0.07 });
    this.tone({ type: 'triangle', from: 1040, dur: 0.12, vol: 0.06, delay: 0.14 });
  }

  waveClear() {
    this.tone({ type: 'triangle', from: 440, dur: 0.09, vol: 0.05 });
    this.tone({ type: 'triangle', from: 660, dur: 0.12, vol: 0.05, delay: 0.09 });
  }

  bossAlarm() {
    this.tone({ type: 'square', from: 120, to: 90, dur: 0.25, vol: 0.12 });
    this.tone({ type: 'square', from: 120, to: 90, dur: 0.25, vol: 0.12, delay: 0.35 });
  }

  gameOver() {
    this.tone({ type: 'triangle', from: 440, to: 440, dur: 0.18, vol: 0.08 });
    this.tone({ type: 'triangle', from: 330, to: 330, dur: 0.2, vol: 0.08, delay: 0.2 });
    this.tone({ type: 'triangle', from: 220, to: 110, dur: 0.5, vol: 0.09, delay: 0.42 });
  }
}
