import { W, H, TAU } from '../utils.js';

export class Bullet {
  constructor(game, opts) {
    this.game = game;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.r = 4;
    this.damage = 1;
    this.color = '#7df9ff';
    this.friendly = true;
    this.life = 4;
    this.dead = false;

    Object.assign(this, opts);
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (
      this.life <= 0 ||
      this.x < -40 ||
      this.x > W + 40 ||
      this.y < -40 ||
      this.y > H + 40
    ) {
      this.dead = true;
    }
  }

  draw(ctx) {
    const len = this.friendly ? 16 : 8;
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.friendly ? 3.5 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.friendly ? 2.2 : 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
