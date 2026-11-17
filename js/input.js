import { W, H, clamp } from './utils.js';

const BLOCKED = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.pointer = { x: W / 2, y: H - 170, down: false };
    this.pointerPressed = false;

    window.addEventListener('keydown', (e) => {
      if (BLOCKED.has(e.code)) e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.down = false;
    });

    const updatePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      this.pointer.x = clamp((e.clientX - rect.left) * sx, 0, W);
      this.pointer.y = clamp((e.clientY - rect.top) * sy, 0, H);
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      this.pointer.down = true;
      this.pointerPressed = true;
      updatePointer(e);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.pointer.down) updatePointer(e);
    });

    const release = () => {
      this.pointer.down = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    window.addEventListener('pointerup', release);
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.justPressed.has(code));
  }

  // Chamado pelo loop principal no fim de cada frame
  endFrame() {
    this.justPressed.clear();
    this.pointerPressed = false;
  }

  get moveX() {
    return (this.isDown('ArrowRight', 'KeyD') ? 1 : 0) -
      (this.isDown('ArrowLeft', 'KeyA') ? 1 : 0);
  }

  get moveY() {
    return (this.isDown('ArrowDown', 'KeyS') ? 1 : 0) -
      (this.isDown('ArrowUp', 'KeyW') ? 1 : 0);
  }

  get firing() {
    return this.isDown('Space') || this.pointer.down;
  }
}
