import { W, H } from './utils.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');

const input = new Input(canvas);
const audio = new Audio();
const game = new Game(canvas, input, audio);

// Navegadores exigem um gesto do usuário antes de liberar o áudio.
window.addEventListener('keydown', () => audio.ensure(), { once: true });
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });

// Ajusta o canvas ao tamanho da janela mantendo a proporção 9:16.
function resize() {
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const pad = isMobile ? 0 : 12;
  const vw = stage.clientWidth - pad * 2;
  const vh = stage.clientHeight - pad * 2;
  const scale = Math.max(0.2, Math.min(vw / W, vh / H));
  canvas.style.width = `${Math.round(W * scale)}px`;
  canvas.style.height = `${Math.round(H * scale)}px`;
}

window.addEventListener('resize', resize);
resize();

// Pausa sozinho quando a aba perde o foco.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.state = 'paused';
});

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  game.update(dt);
  game.render();
  input.endFrame();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
