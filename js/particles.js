import { rand, TAU } from './utils.js';

// Sistema simples de partículas com pooling por array (remove no update).
export class Particles {
  constructor() {
    this.items = [];
  }

  burst(x, y, opts = {}) {
    const {
      count = 14,
      color = '#ffffff',
      colors = null,
      speed = [60, 320],
      size = [1.5, 4],
      life = [0.25, 0.7],
      angle = 0,
      spread = TAU,
      gravity = 0,
      drag = 0.9,
    } = opts;

    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const sp = rand(speed[0], speed[1]);
      const lifeSpan = rand(life[0], life[1]);

      this.items.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: lifeSpan,
        maxLife: lifeSpan,
        size: rand(size[0], size[1]),
        color: colors ? colors[Math.floor(Math.random() * colors.length)] : color,
        gravity,
        drag,
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const t = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.items.length = 0;
  }
}
