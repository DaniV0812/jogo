import { W, H, clamp, lerp, rand, TAU } from '../utils.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.x = W / 2;
    this.y = H - 160;
    this.r = 13;
    this.speed = 460;
    this.lives = 3;
    this.maxLives = 5;

    this.tilt = 0;
    this.invuln = 1.5; // invencibilidade ao nascer
    this.fireCd = 0;
    this.rapid = 0; // segundos restantes de tiro rápido
    this.double = 0; // segundos restantes de tiro duplo
    this.shield = 0; // 1 carga de escudo
    this.thrusterT = 0;
  }

  update(dt, input) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.rapid = Math.max(0, this.rapid - dt);
    this.double = Math.max(0, this.double - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);

    let dx = input.moveX;
    let dy = input.moveY;
    let speed = this.speed;

    // Controle por mouse/touch: a nave segue o ponteiro enquanto pressionado.
    if (input.pointer.down) {
      const px = input.pointer.x;
      const py = input.pointer.y - 40; // dedo não cobre a nave
      const ddx = px - this.x;
      const ddy = py - this.y;
      const mag = Math.hypot(ddx, ddy);
      if (mag > 6) {
        dx = ddx / mag;
        dy = ddy / mag;
        speed *= Math.min(1, mag / 80) * 1.4;
      } else {
        dx = 0;
        dy = 0;
      }
    }

    this.x = clamp(this.x + dx * speed * dt, 24, W - 24);
    this.y = clamp(this.y + dy * speed * dt, 120, H - 40);
    this.tilt = lerp(this.tilt, dx * 0.22, Math.min(1, dt * 12));

    // Rastro do motor
    this.thrusterT -= dt;
    if (this.thrusterT <= 0) {
      this.thrusterT = 0.02;
      this.game.particles.burst(this.x + rand(-4, 4), this.y + 20, {
        count: 1,
        color: Math.random() < 0.5 ? '#22d3ee' : '#67e8f9',
        speed: [30, 90],
        angle: Math.PI / 2,
        spread: 0.6,
        size: [1, 2.4],
        life: [0.15, 0.35],
        drag: 0.92,
      });
    }

    if (input.firing) this.tryShoot();
  }

  tryShoot() {
    if (this.fireCd > 0) return;
    this.fireCd = this.rapid > 0 ? 0.075 : 0.16;

    const offsets = this.double > 0 ? [-9, 9] : [0];
    for (const off of offsets) {
      this.game.addBullet({
        x: this.x + off,
        y: this.y - 18,
        vy: -920,
        r: 4,
        damage: 1,
        friendly: true,
        color: '#7df9ff',
      });
    }

    this.game.particles.burst(this.x, this.y - 22, {
      count: 4,
      color: '#a5f3fc',
      speed: [20, 90],
      angle: -Math.PI / 2,
      spread: 0.9,
      size: [1, 2.4],
      life: [0.08, 0.2],
    });
    this.game.audio.shoot();
  }

  hit() {
    if (this.invuln > 0) return false;

    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 1;
      this.game.audio.shieldBreak();
      this.game.particles.burst(this.x, this.y, {
        count: 26,
        color: '#b39dff',
        speed: [80, 340],
        size: [1.5, 3.5],
        life: [0.3, 0.7],
      });
      this.game.shake = Math.max(this.game.shake, 8);
      return false;
    }

    this.lives--;
    this.invuln = 2.2;
    this.game.audio.hit();
    this.game.flash = 0.35;
    this.game.shake = Math.max(this.game.shake, 14);
    this.game.particles.burst(this.x, this.y, {
      count: 22,
      color: '#ff6b81',
      speed: [60, 300],
      size: [1.5, 4],
      life: [0.3, 0.8],
    });

    if (this.lives <= 0) this.game.gameOver();
    return true;
  }

  draw(ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0) return;

    if (this.shield > 0) {
      const pulse = 0.75 + Math.sin(performance.now() / 200) * 0.15;
      ctx.save();
      ctx.strokeStyle = 'rgba(179, 157, 255, 0.9)';
      ctx.shadowColor = '#b39dff';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 27 * pulse, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    // Chama do motor
    const flame = 12 + Math.random() * 10;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(0, 14 + flame);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(224, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.lineTo(0, 14 + flame * 0.55);
    ctx.lineTo(3, 14);
    ctx.closePath();
    ctx.fill();

    // Casco
    const grad = ctx.createLinearGradient(0, -22, 0, 20);
    grad.addColorStop(0, '#e0ffff');
    grad.addColorStop(0.45, '#22d3ee');
    grad.addColorStop(1, '#0e7490');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -6);
    ctx.lineTo(20, 10);
    ctx.lineTo(7, 8);
    ctx.lineTo(5, 15);
    ctx.lineTo(-5, 15);
    ctx.lineTo(-7, 8);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cabine
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#083344';
    ctx.beginPath();
    ctx.ellipse(0, -6, 4, 7, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.ellipse(0, -7, 2, 4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
