import { W, H, TAU, rand, clamp, pick, weightedPick, dist2, circleHit } from './utils.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Bullet } from './entities/bullet.js';
import { PowerUp, POWERUPS } from './entities/powerup.js';
import { Particles } from './particles.js';

const HISCORE_KEY = 'defensor-do-espaco:hiscore';

function loadHiscore() {
  try {
    return Number(localStorage.getItem(HISCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHiscore(value) {
  try {
    localStorage.setItem(HISCORE_KEY, String(value));
  } catch {
    // armazenamento indisponível (modo privado etc.) — ignora
  }
}

export class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;

    this.state = 'menu'; // menu | playing | paused | gameover
    this.hiscore = loadHiscore();
    this.menuT = 0;
    this.gameOverT = 0;
    this.shake = 0;
    this.flash = 0;

    this.reset();
    this.stars = this.createStars();

    this.menuShip = new Player(this);
    this.menuShip.invuln = 0;
  }

  reset() {
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.particles = new Particles();
    this.score = 0;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnInterval = 1;
    this.spawnTimer = 0;
    this.interWave = 0;
    this.bossSpawned = false;
    this.banner = null;
    this.time = 0;
    this.newRecord = false;
  }

  createStars() {
    const layers = [
      { n: 70, speed: 18, size: [0.6, 1.1], alpha: [0.15, 0.4] },
      { n: 45, speed: 42, size: [0.8, 1.6], alpha: [0.25, 0.6] },
      { n: 24, speed: 80, size: [1, 2.2], alpha: [0.4, 0.9] },
    ];
    const stars = [];
    for (const layer of layers) {
      for (let i = 0; i < layer.n; i++) {
        stars.push({
          x: rand(0, W),
          y: rand(0, H),
          speed: layer.speed * rand(0.8, 1.2),
          size: rand(layer.size[0], layer.size[1]),
          alpha: rand(layer.alpha[0], layer.alpha[1]),
          twinkle: rand(0, TAU),
        });
      }
    }
    return stars;
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.player = new Player(this);
    this.audio.ensure();
    this.startWave(1);
  }

  gameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.gameOverT = 0;
    this.explode(this.player.x, this.player.y, '#7df9ff', 4);
    this.audio.explosion(true);
    this.audio.gameOver();
    this.shake = 24;

    this.newRecord = this.score > this.hiscore;
    if (this.newRecord) {
      this.hiscore = this.score;
      saveHiscore(this.hiscore);
    }
  }

  // ---------- ondas e spawn ----------

  startWave(n) {
    this.wave = n;
    this.bossSpawned = false;
    this.spawnQueue = [];
    this.spawnTimer = 0.6;

    if (n % 5 === 0) {
      this.setBanner(`ONDA ${n} — CHEFE`, 2.2, '#ff4757');
      this.audio.bossAlarm();
      return;
    }

    const count = Math.min(6 + n * 2, 26);
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push(this.rollEnemyType(n));
    }
    this.spawnInterval = clamp(1.15 - n * 0.05, 0.34, 1.15);
    this.setBanner(`ONDA ${n}`, 1.6, '#7df9ff');
    if (n > 1) this.audio.waveClear();
  }

  rollEnemyType(n) {
    if (n <= 2) return pick(['drone', 'drone', 'kamikaze']);
    if (n <= 5) return weightedPick([['drone', 4], ['kamikaze', 2], ['gunner', 2]]);
    if (n <= 8) {
      return weightedPick([['drone', 3], ['kamikaze', 2], ['gunner', 3], ['tank', 1]]);
    }
    return weightedPick([['drone', 2], ['kamikaze', 2], ['gunner', 3], ['tank', 2]]);
  }

  spawnEnemy(kind) {
    if (kind === 'boss') {
      this.enemies.push(new Enemy(this, 'boss', W / 2, -80, this.wave));
      this.bossSpawned = true;
      return;
    }
    const x = kind === 'tank' ? rand(90, W - 90) : rand(50, W - 50);
    this.enemies.push(new Enemy(this, kind, x, -40, this.wave));
  }

  updateSpawner(dt) {
    if (this.interWave > 0) {
      this.interWave -= dt;
      if (this.interWave <= 0) this.startWave(this.wave + 1);
      return;
    }

    if (this.wave % 5 === 0) {
      if (!this.bossSpawned) this.spawnEnemy('boss');
      return;
    }

    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = this.spawnInterval * rand(0.75, 1.25);
      }
    }
  }

  checkWaveEnd() {
    if (this.state !== 'playing' || this.interWave > 0) return;

    const bossWave = this.wave % 5 === 0;
    if (!bossWave && this.spawnQueue.length > 0) return;
    if (bossWave && !this.bossSpawned) return;
    if (this.enemies.length > 0) return;

    const bonus = 25 * this.wave;
    this.score += bonus;
    this.interWave = 2.0;
    this.setBanner(
      bossWave ? `CHEFE DESTRUÍDO!  +${bonus}` : `ONDA ${this.wave} LIMPA  +${bonus}`,
      1.8,
      '#7df9ff'
    );
    this.audio.waveClear();
  }

  // ---------- criação de entidades ----------

  addBullet(opts) {
    this.bullets.push(new Bullet(this, opts));
  }

  dropPowerUp(x, y, forcedType = null) {
    const type =
      forcedType ||
      weightedPick([['rapid', 30], ['double', 30], ['shield', 28], ['life', 8]]);
    this.powerups.push(new PowerUp(x, y, type));
  }

  explode(x, y, color, scale = 1) {
    this.particles.burst(x, y, {
      count: Math.round(16 * scale),
      colors: [color, '#ffffff', '#ffe066'],
      speed: [40, 300 * scale],
      size: [1.5, 3.5 * scale],
      life: [0.25, 0.8],
      gravity: 30,
    });
    this.shake = Math.max(this.shake, 4 * scale);
  }

  setBanner(text, time, color = '#7df9ff') {
    this.banner = { text, time, color };
  }

  applyPowerUp(type) {
    const p = this.player;
    switch (type) {
      case 'rapid':
        p.rapid = Math.min(20, p.rapid + 8);
        break;
      case 'double':
        p.double = Math.min(25, p.double + 12);
        break;
      case 'shield':
        p.shield = 1;
        break;
      case 'life':
        p.lives = Math.min(p.maxLives, p.lives + 1);
        break;
    }
    this.score += 25;
    this.audio.powerup();
    this.setBanner(POWERUPS[type].label, 1.1, POWERUPS[type].color);
    this.particles.burst(p.x, p.y, {
      count: 20,
      color: POWERUPS[type].color,
      speed: [50, 240],
      size: [1.2, 3],
      life: [0.3, 0.7],
    });
  }

  // ---------- loop ----------

  update(dt) {
    this.time += dt;
    this.menuT += dt;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }
    if (this.state !== 'paused') this.updateStars(dt);

    const input = this.input;
    if (input.wasPressed('KeyM')) this.audio.toggleMute();

    switch (this.state) {
      case 'menu':
        if (this.startPressed()) this.start();
        break;

      case 'playing':
        if (input.wasPressed('Escape', 'KeyP')) {
          this.state = 'paused';
          break;
        }
        this.updatePlaying(dt);
        break;

      case 'paused':
        if (input.wasPressed('Escape', 'KeyP', 'Enter')) this.state = 'playing';
        break;

      case 'gameover':
        this.gameOverT += dt;
        this.particles.update(dt);
        if (this.gameOverT > 0.8 && this.startPressed()) this.start();
        break;
    }
  }

  startPressed() {
    return (
      this.input.wasPressed('Enter', 'Space') ||
      this.input.pointerPressed
    );
  }

  updatePlaying(dt) {
    this.player.update(dt, this.input);
    if (this.state !== 'playing') return;

    this.updateSpawner(dt);

    for (const b of this.bullets) b.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const pu of this.powerups) pu.update(dt);
    this.particles.update(dt);

    this.collide();

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.powerups = this.powerups.filter((pu) => !pu.dead);

    this.checkWaveEnd();
  }

  updateStars(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > H + 4) {
        s.y = -6;
        s.x = rand(0, W);
      }
    }
  }

  collide() {
    const p = this.player;

    // Tiros do jogador x inimigos
    for (const b of this.bullets) {
      if (b.dead || !b.friendly) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (!circleHit(b, e)) continue;

        b.dead = true;
        let dmg = b.damage;
        const coreHit =
          e.kind === 'boss' && dist2(b.x, b.y, e.x, e.y + 2) < 22 * 22;

        if (coreHit) {
          dmg *= 2;
          this.particles.burst(b.x, b.y, {
            count: 6,
            color: '#ffd93d',
            speed: [30, 160],
            size: [1, 2.5],
            life: [0.1, 0.3],
          });
        } else {
          this.particles.burst(b.x, b.y, {
            count: 5,
            color: '#a5f3fc',
            speed: [30, 140],
            size: [1, 2.4],
            life: [0.1, 0.3],
          });
        }

        e.takeDamage(dmg);
        break;
      }
    }

    // Tiros inimigos x jogador
    for (const b of this.bullets) {
      if (b.dead || b.friendly) continue;
      if (circleHit(b, p)) {
        b.dead = true;
        p.hit();
        if (this.state !== 'playing') return;
      }
    }

    // Corpo de inimigo x jogador
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (circleHit(e, p)) {
        if (e.kind === 'boss') {
          p.hit();
        } else {
          e.takeDamage(999);
          p.hit();
        }
        if (this.state !== 'playing') return;
      }
    }

    // Power-ups x jogador
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      if (circleHit(pu, p)) {
        pu.dead = true;
        this.applyPowerUp(pu.type);
      }
    }
  }

  // ---------- renderização ----------

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    this.drawBackground(ctx);

    if (this.state === 'menu') {
      this.drawMenu(ctx);
      return;
    }

    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }
    for (const pu of this.powerups) pu.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.player && this.state !== 'gameover') this.player.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    this.drawHUD(ctx);
    if (this.flash > 0) this.drawFlash(ctx);
    if (this.state === 'paused') this.drawPaused(ctx);
    if (this.state === 'gameover') this.drawGameOver(ctx);
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070b1d');
    g.addColorStop(0.6, '#050814');
    g.addColorStop(1, '#02040c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const neb1 = ctx.createRadialGradient(W * 0.18, H * 0.22, 0, W * 0.18, H * 0.22, 300);
    neb1.addColorStop(0, 'rgba(56, 189, 248, 0.07)');
    neb1.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, W, H);

    const neb2 = ctx.createRadialGradient(W * 0.85, H * 0.7, 0, W * 0.85, H * 0.7, 340);
    neb2.addColorStop(0, 'rgba(167, 139, 250, 0.06)');
    neb2.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#cfe9ff';
    for (const s of this.stars) {
      const tw = 0.65 + Math.sin(this.time * 2 + s.twinkle) * 0.35;
      ctx.globalAlpha = s.alpha * tw;
      ctx.fillRect(s.x, s.y, s.size, s.size * 2.2);
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx) {
    ctx.save();
    ctx.textBaseline = 'top';

    // Pontuação
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px Consolas, "Courier New", monospace';
    ctx.fillStyle = '#e0f2fe';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.fillText(String(this.score).padStart(6, '0'), 22, 16);

    ctx.shadowBlur = 0;
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = 'rgba(148, 197, 224, 0.75)';
    ctx.fillText(`RECORDE ${String(this.hiscore).padStart(6, '0')}`, 22, 44);

    // Vidas
    const p = this.player;
    if (p) {
      for (let i = 0; i < p.lives; i++) {
        ctx.save();
        ctx.translate(27 + i * 22, 74);
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Onda
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.fillStyle = '#ffd9a8';
    ctx.shadowColor = '#ff9f43';
    ctx.shadowBlur = 8;
    ctx.fillText(`ONDA ${this.wave}`, W - 22, 20);

    if (this.audio.muted) {
      ctx.shadowBlur = 0;
      ctx.font = '11px Consolas, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.fillText('SOM OFF (M)', W - 22, 44);
    }

    // Buffs ativos
    if (p) {
      const chips = [];
      if (p.rapid > 0) chips.push([POWERUPS.rapid.color, `RAPID ${Math.ceil(p.rapid)}s`]);
      if (p.double > 0) chips.push([POWERUPS.double.color, `DUPLO ${Math.ceil(p.double)}s`]);
      if (p.shield > 0) chips.push([POWERUPS.shield.color, 'ESCUDO']);

      let x = 20;
      const y = H - 34;
      ctx.textBaseline = 'middle';
      for (const [color, label] of chips) {
        ctx.font = 'bold 11px Consolas, monospace';
        const w = ctx.measureText(label).width + 30;
        ctx.fillStyle = 'rgba(8, 15, 30, 0.72)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, 22, 11);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + 12, y + 11, 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 20, y + 11.5);
        x += w + 8;
      }
    }
    ctx.restore();

    const boss = this.enemies.find((e) => e.kind === 'boss' && !e.dead);
    if (boss) this.drawBossBar(ctx, boss);
    if (this.banner) this.drawBanner(ctx);
  }

  drawBossBar(ctx, boss) {
    const w = 320;
    const h = 12;
    const x = (W - w) / 2;
    const y = 86;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.8)';
    ctx.strokeStyle = 'rgba(255, 71, 87, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    const frac = clamp(boss.hp / boss.maxHp, 0, 1);
    if (frac > 0) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ff4757');
      g.addColorStop(1, '#ff9f43');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, (w - 4) * frac, h - 4, 4);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = '#ffc2c8';
    ctx.fillText('DESTRUIDOR', W / 2, y - 4);
    ctx.restore();
  }

  drawBanner(ctx) {
    const b = this.banner;
    const alpha = Math.min(1, b.time * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 18;
    ctx.fillText(b.text, W / 2, H * 0.28);
    ctx.restore();
  }

  drawFlash(ctx) {
    const a = clamp(this.flash, 0, 1) * 0.45;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
    g.addColorStop(0, 'rgba(255, 0, 60, 0)');
    g.addColorStop(1, `rgba(255, 30, 70, ${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(3, 6, 15, 0.72)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 22;
    ctx.fillText('PAUSADO', W / 2, H * 0.42);

    ctx.shadowBlur = 0;
    ctx.font = '15px Consolas, monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.fillText('P / ESC PARA CONTINUAR', W / 2, H * 0.42 + 62);
    ctx.restore();
  }

  drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(3, 6, 15, 0.78)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ff6b81';
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 24;
    ctx.fillText('FIM DE JOGO', W / 2, H * 0.32);

    ctx.shadowBlur = 0;
    ctx.font = '13px Consolas, monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.fillText('PONTUAÇÃO', W / 2, H * 0.42);

    ctx.font = 'bold 48px Consolas, monospace';
    ctx.fillStyle = '#e0f2fe';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 16;
    ctx.fillText(String(this.score).padStart(6, '0'), W / 2, H * 0.48);

    ctx.shadowBlur = 0;
    if (this.newRecord) {
      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillStyle = '#ffd93d';
      ctx.shadowColor = '#ffd93d';
      ctx.shadowBlur = 12;
      ctx.fillText('★ NOVO RECORDE ★', W / 2, H * 0.55);
    } else {
      ctx.font = '14px Consolas, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.fillText(`RECORDE  ${String(this.hiscore).padStart(6, '0')}`, W / 2, H * 0.55);
    }

    if (this.gameOverT > 0.8 && Math.sin(this.gameOverT * 4) > -0.3) {
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#7df9ff';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.fillText('ENTER / CLIQUE PARA JOGAR DE NOVO', W / 2, H * 0.72);
    }
    ctx.restore();
  }

  drawMenu(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    ctx.textBaseline = 'middle';
    ctx.font = '12px Consolas, monospace';
    ctx.fillStyle = 'rgba(148, 197, 224, 0.7)';
    ctx.fillText('U M   A R C A D E   E S P A C I A L', W / 2, 190);

    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#e0ffff';
    ctx.fillText('DEFENSOR', W / 2, 262);

    const grad = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
    grad.addColorStop(0, '#22d3ee');
    grad.addColorStop(1, '#a78bfa');
    ctx.shadowBlur = 18;
    ctx.fillStyle = grad;
    ctx.font = 'bold 46px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('DO ESPAÇO', W / 2, 314);

    ctx.save();
    ctx.translate(W / 2, 430 + Math.sin(this.menuT * 1.6) * 9);
    ctx.scale(1.8, 1.8);
    this.menuShip.x = 0;
    this.menuShip.y = 0;
    this.menuShip.tilt = Math.sin(this.menuT * 1.1) * 0.1;
    this.menuShip.draw(ctx);
    ctx.restore();

    ctx.shadowBlur = 0;
    const px = 90;
    const py = 528;
    const pw = W - 180;
    const ph = 116;
    ctx.fillStyle = 'rgba(8, 16, 32, 0.55)';
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.fill();
    ctx.stroke();

    const lines = [
      ['MOVER', 'WASD / SETAS'],
      ['ATIRAR', 'ESPAÇO / CLIQUE'],
      ['PAUSAR', 'P / ESC'],
      ['SOM', 'M'],
    ];
    ctx.font = '14px Consolas, monospace';
    lines.forEach(([label, keys], i) => {
      const y = py + 28 + i * 22;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.fillText(label, px + 26, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c7f9ff';
      ctx.fillText(keys, px + pw - 26, y);
    });

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 10;
    ctx.fillText(`RECORDE  ${String(this.hiscore).padStart(6, '0')}`, W / 2, 700);

    const blink = 0.55 + Math.sin(this.menuT * 3) * 0.45;
    ctx.globalAlpha = blink;
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, 780);
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
    ctx.font = '12px Consolas, monospace';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
    ctx.fillText('SOBREVIVA ÀS ONDAS · DERRUBE O CHEFE A CADA 5', W / 2, H - 48);

    ctx.restore();
  }
}
