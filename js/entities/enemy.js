import { W, H, clamp, rand, pick, TAU } from '../utils.js';

const CFG = {
  drone: { hp: 1, r: 14, score: 10, color: '#ff6b81', speed: 150 },
  kamikaze: { hp: 1, r: 13, score: 15, color: '#f368e0', speed: 170 },
  gunner: { hp: 3, r: 17, score: 25, color: '#ff9f43', speed: 120, stopY: 190 },
  tank: { hp: 6, r: 23, score: 45, color: '#b39dff', speed: 65 },
  boss: { hp: 90, r: 46, score: 500, color: '#ff4757', speed: 70 },
};

export class Enemy {
  constructor(game, kind, x, y, wave = 1) {
    this.game = game;
    this.kind = kind;
    this.cfg = CFG[kind];
    this.x = x;
    this.y = y;
    this.r = this.cfg.r;
    this.color = this.cfg.color;
    this.score = this.cfg.score;

    const bonusHp = kind === 'boss' ? wave * 10 : Math.floor(wave / 6);
    this.hp = this.cfg.hp + bonusHp;
    this.maxHp = this.hp;

    this.t = rand(0, TAU);
    this.baseX = x;
    this.flash = 0;
    this.dead = false;
    this.fireCd = rand(1.2, 2.0);
    this.pattern = 0;
    this.phase2 = false;
    this.speedMul = 1 + Math.min(0.6, wave * 0.02);

    this.dir = 0;
    this.speedNow = 90;
    if (kind === 'kamikaze') {
      const p = game.player;
      const tx = p ? p.x : W / 2;
      const ty = p ? p.y : H;
      this.dir = Math.atan2(ty - y, tx - x);
    }
  }

  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);

    switch (this.kind) {
      case 'drone': {
        this.y += this.cfg.speed * this.speedMul * dt;
        this.x = this.baseX + Math.sin(this.t * 2.2) * 34;
        break;
      }

      case 'kamikaze': {
        const p = this.game.player;
        if (p) {
          const target = Math.atan2(p.y - this.y, p.x - this.x);
          let diff = target - this.dir;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          this.dir += clamp(diff, -1.6 * dt, 1.6 * dt);
        }
        this.speedNow = Math.min(420, this.speedNow + 90 * dt);
        this.x += Math.cos(this.dir) * this.speedNow * dt;
        this.y += Math.sin(this.dir) * this.speedNow * dt;
        break;
      }

      case 'gunner': {
        if (this.y < this.cfg.stopY) {
          this.y += this.cfg.speed * dt;
        } else {
          this.x = clamp(
            this.baseX + Math.sin(this.t * 1.4) * 60,
            30,
            W - 30
          );
          this.y = this.cfg.stopY + Math.sin(this.t * 2.1) * 12;
        }
        this.fireCd -= dt;
        if (this.fireCd <= 0 && this.y > 40) {
          this.fireCd = Math.max(0.7, rand(1.3, 2.1) - this.game.wave * 0.03);
          this.shootAimed(1, 0, 270);
        }
        break;
      }

      case 'tank': {
        this.y += this.cfg.speed * dt;
        this.x = clamp(
          this.baseX + Math.sin(this.t * 0.9) * 60,
          34,
          W - 34
        );
        this.fireCd -= dt;
        if (this.fireCd <= 0 && this.y > 60) {
          this.fireCd = 1.9;
          this.shootAimed(3, 0.5, 250);
        }
        break;
      }

      case 'boss': {
        this.updateBoss(dt);
        break;
      }
    }

    // Saiu da tela: remove sem pontuar (chefe e atirador ficam na tela)
    if (this.kind !== 'gunner' && this.kind !== 'boss') {
      if (this.y > H + 90 || this.x < -110 || this.x > W + 110) {
        this.dead = true;
      }
    }
  }

  updateBoss(dt) {
    if (this.y < 150) {
      this.y += 90 * dt;
      return;
    }

    this.phase2 = this.hp / this.maxHp < 0.5;
    this.x = W / 2 + Math.sin(this.t * 0.75) * (W / 2 - 110);
    this.y = 158 + Math.sin(this.t * 1.7) * 12;

    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      this.fireCd = this.phase2 ? 1.15 : 1.9;
      this.bossAttack();
    }
  }

  bossAttack() {
    const g = this.game;
    const p = g.player;
    const pattern = this.pattern;
    this.pattern = (this.pattern + 1) % 3;
    g.audio.enemyShoot();

    if (pattern === 0) {
      // Leque amplo mirado no jogador
      const base = Math.atan2((p ? p.y : H) - this.y, (p ? p.x : W / 2) - this.x);
      for (let i = -3; i <= 3; i++) {
        const a = base + i * 0.16;
        g.addBullet({
          x: this.x,
          y: this.y + 30,
          vx: Math.cos(a) * 300,
          vy: Math.sin(a) * 300,
          r: 6,
          friendly: false,
          color: '#ff4757',
        });
      }
    } else if (pattern === 1) {
      // Chuva de projéteis
      for (let i = 0; i < 7; i++) {
        g.addBullet({
          x: this.x + (i - 3) * 26,
          y: this.y + 26,
          vx: rand(-40, 40),
          vy: rand(240, 330),
          r: 5,
          friendly: false,
          color: '#ff9f43',
        });
      }
    } else {
      // Rajadas miradas em 3 direções
      const base = Math.atan2((p ? p.y : H) - this.y, (p ? p.x : W / 2) - this.x);
      const speed = this.phase2 ? 380 : 340;
      for (let k = -1; k <= 1; k++) {
        for (let i = 0; i < 2; i++) {
          const a = base + k * 0.5 + (i - 0.5) * 0.1;
          g.addBullet({
            x: this.x,
            y: this.y + 30,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: 5,
            friendly: false,
            color: '#f368e0',
          });
        }
      }
    }

    // Na segunda fase, chama um drone de escolta de vez em quando
    if (this.phase2 && Math.random() < 0.35) {
      g.spawnEnemy('drone');
    }
  }

  shootAimed(count = 1, spread = 0, speed = 270) {
    const p = this.game.player;
    if (!p) return;
    const base = Math.atan2(p.y - this.y, p.x - this.x);

    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      this.game.addBullet({
        x: this.x,
        y: this.y + 10,
        vx: Math.cos(base + off) * speed,
        vy: Math.sin(base + off) * speed,
        r: 5,
        friendly: false,
        color: this.kind === 'tank' ? '#c9b8ff' : '#ff9f43',
        life: 6,
      });
    }
    this.game.audio.enemyShoot();
  }

  takeDamage(dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.06;
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;

    const g = this.game;
    g.score += this.score;

    if (this.kind === 'boss') {
      g.explode(this.x, this.y, this.color, 3);
      g.audio.explosion(true);
      g.shake = 22;
      g.dropPowerUp(this.x - 30, this.y, 'life');
      g.dropPowerUp(this.x + 30, this.y, pick(['rapid', 'double', 'shield']));
      g.setBanner('CHEFE DESTRUÍDO!', 2.4, '#ffd93d');
    } else {
      g.explode(this.x, this.y, this.color, this.kind === 'tank' ? 1.6 : 1);
      g.audio.explosion(this.kind === 'tank');
      if (Math.random() < (this.kind === 'tank' ? 1 : 0.12)) {
        g.dropPowerUp(this.x, this.y);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.kind === 'kamikaze') {
      ctx.rotate(this.dir - Math.PI / 2);
    }

    const flashing = this.flash > 0;
    const flashColor = this.kind === 'boss' ? this.color : '#ffffff';
    const color = flashing ? flashColor : this.color;

    ctx.shadowColor = color;
    ctx.shadowBlur = this.kind === 'boss' ? 26 : 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (this.kind) {
      case 'drone':
        this.drawDrone(ctx, flashing);
        break;
      case 'kamikaze':
        this.drawKamikaze(ctx, flashing);
        break;
      case 'gunner':
        this.drawGunner(ctx, flashing);
        break;
      case 'tank':
        this.drawTank(ctx, flashing);
        break;
      case 'boss':
        this.drawBoss(ctx, flashing);
        break;
    }

    ctx.restore();
  }

  drawDrone(ctx, flashing) {
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(15, -8);
    ctx.lineTo(6, -13);
    ctx.lineTo(0, -5);
    ctx.lineTo(-6, -13);
    ctx.lineTo(-15, -8);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : 'rgba(255, 107, 129, 0.22)';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flashing ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 2, 3.5, 0, TAU);
    ctx.fill();
  }

  drawKamikaze(ctx, flashing) {
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.lineTo(9, -4);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, -13);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-9, -4);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : 'rgba(243, 104, 224, 0.24)';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flashing ? '#ffffff' : '#ffb8f4';
    ctx.beginPath();
    ctx.arc(0, 4, 3 + Math.sin(this.t * 12) * 1.2, 0, TAU);
    ctx.fill();
  }

  drawGunner(ctx, flashing) {
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(19, 2);
    ctx.lineTo(13, -13);
    ctx.lineTo(-13, -13);
    ctx.lineTo(-19, 2);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : 'rgba(255, 159, 67, 0.22)';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flashing ? '#ffffff' : this.color;
    ctx.fillRect(-3, 6, 6, 11);
    ctx.beginPath();
    ctx.arc(0, -2, 4.5, 0, TAU);
    ctx.fill();
  }

  drawTank(ctx, flashing) {
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(20, 10);
    ctx.lineTo(25, -8);
    ctx.lineTo(12, -16);
    ctx.lineTo(-12, -16);
    ctx.lineTo(-25, -8);
    ctx.lineTo(-20, 10);
    ctx.closePath();
    ctx.fillStyle = flashing ? '#ffffff' : 'rgba(179, 157, 255, 0.22)';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flashing ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = flashing ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.moveTo(-16, 12);
    ctx.lineTo(-16, 18);
    ctx.moveTo(16, 12);
    ctx.lineTo(16, 18);
    ctx.stroke();
  }

  drawBoss(ctx, flashing) {
    // Cima
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(30, 30);
    ctx.lineTo(58, 34);
    ctx.lineTo(50, -8);
    ctx.lineTo(26, -22);
    ctx.lineTo(12, -44);
    ctx.lineTo(-12, -44);
    ctx.lineTo(-26, -22);
    ctx.lineTo(-50, -8);
    ctx.lineTo(-58, 34);
    ctx.lineTo(-30, 30);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 71, 87, 0.18)';
    ctx.fill();
    ctx.stroke();

    // Núcleo pulsante (ponto fraco: dano em dobro)
    const pulse = 10 + Math.sin(this.t * 4) * 3;
    ctx.fillStyle = flashing ? '#ffffff' : this.phase2 ? '#ffd93d' : '#ff6b81';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(0, 2, pulse, 0, TAU);
    ctx.fill();

    // Canhões laterais
    ctx.shadowBlur = 12;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-24, 26);
    ctx.lineTo(-24, 38);
    ctx.moveTo(24, 26);
    ctx.lineTo(24, 38);
    ctx.stroke();
  }
}
