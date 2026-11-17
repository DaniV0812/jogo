import { rand, TAU } from '../utils.js';

export const POWERUPS = {
  rapid: { color: '#ffd93d', glyph: 'R', label: 'TIRO RÁPIDO' },
  double: { color: '#4dd6ff', glyph: 'D', label: 'TIRO DUPLO' },
  shield: { color: '#b39dff', glyph: 'S', label: 'ESCUDO' },
  life: { color: '#ff7b9c', glyph: '+', label: 'VIDA EXTRA' },
};

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.r = 16;
    this.vy = 90;
    this.vx = rand(-30, 30);
    this.t = rand(0, TAU);
    this.dead = false;
  }

  update(dt) {
    this.t += dt * 3;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t) * 40 * dt + this.vx * dt;
    if (this.y > 1020) this.dead = true;
  }

  draw(ctx) {
    const cfg = POWERUPS[this.type];
    const pulse = 0.85 + Math.sin(this.t * 3) * 0.15;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.t * 1.3) * 0.15);
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = cfg.color;
    ctx.fillStyle = 'rgba(5, 10, 25, 0.85)';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -this.r * pulse);
    ctx.lineTo(this.r * pulse, 0);
    ctx.lineTo(0, this.r * pulse);
    ctx.lineTo(-this.r * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.fillStyle = cfg.color;
    ctx.font = 'bold 15px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.glyph, 0, 1);
    ctx.restore();
  }
}
