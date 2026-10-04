// Северное сияние: занавесы из вертикальных лучей вдоль плавающей кривой
// и «квантовые» искры, которые вспыхивают и гаснут внутри занавеса.
import { startLoop, readVar, type FxContext } from './loop';

interface Curtain {
  strip: HTMLCanvasElement; // заранее нарисованный градиент одного луча
  base: number;             // высота нижней кромки, доля от высоты
  amp: number;              // размах волны
  freq: number;
  speed: number;
  phase: number;
  reach: number;            // длина лучей, доля от высоты
}

interface Spark {
  x: number; y: number; vy: number;
  age: number; life: number; size: number;
}

function makeStrip(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.55, color + '33');
  grad.addColorStop(0.9, color + 'cc');
  grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, 256);
  return c;
}

// Цвета приходят из global.css в виде #rrggbb.
function hex(el: Element, name: string, fallback: string): string {
  const v = readVar(el, name, fallback);
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

export function mountAurora(root: HTMLElement): void {
  const colors = [
    hex(root, '--fx-aurora-1', '#3ddc97'),
    hex(root, '--fx-aurora-2', '#29c6c9'),
    hex(root, '--fx-aurora-3', '#9b6bff'),
  ];
  const curtains: Curtain[] = [
    { strip: makeStrip(colors[2]), base: 0.42, amp: 0.07, freq: 1.3, speed: 0.11, phase: 2.0, reach: 0.38 },
    { strip: makeStrip(colors[1]), base: 0.55, amp: 0.09, freq: 1.9, speed: 0.17, phase: 0.7, reach: 0.42 },
    { strip: makeStrip(colors[0]), base: 0.62, amp: 0.08, freq: 2.6, speed: 0.23, phase: 4.1, reach: 0.5 },
  ];
  const sparks: Spark[] = [];
  let stars: HTMLCanvasElement | null = null;
  let sparkCap = 0;

  const edge = (c: Curtain, nx: number, t: number) =>
    c.base +
    c.amp * Math.sin(nx * Math.PI * c.freq + t * c.speed * 6 + c.phase) +
    c.amp * 0.45 * Math.sin(nx * Math.PI * c.freq * 2.7 - t * c.speed * 9);

  const onResize = (fx: FxContext) => {
    stars = document.createElement('canvas');
    stars.width = fx.width;
    stars.height = fx.height;
    const s = stars.getContext('2d')!;
    const count = Math.round((fx.width * fx.height) / (2600 * fx.scale * fx.scale));
    for (let i = 0; i < count; i++) {
      s.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`;
      const r = (Math.random() < 0.08 ? 1.4 : 0.8) * fx.scale;
      s.fillRect(Math.random() * fx.width, Math.random() * fx.height * 0.8, r, r);
    }
    sparkCap = Math.min(220, Math.round((fx.width * fx.height) / (3500 * fx.scale * fx.scale)));
    sparks.length = 0;
  };

  startLoop(
    root,
    ({ ctx, width: W, height: H, scale }, t, dt) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (stars) ctx.drawImage(stars, 0, 0);

      ctx.globalCompositeOperation = 'lighter';
      const step = Math.max(2, Math.round(3 * scale));
      for (const c of curtains) {
        for (let x = 0; x < W; x += step) {
          const nx = x / W;
          const y = edge(c, nx, t) * H;
          // яркость «дышит» вдоль занавеса, отсюда складки и лучи
          const fold = 0.5 + 0.5 * Math.sin(nx * 38 + t * 1.3 + c.phase * 3);
          const pulse = 0.5 + 0.5 * Math.sin(nx * 9 - t * 0.8 + c.phase);
          const a = 0.06 + 0.32 * fold * fold * pulse;
          const reach = H * c.reach * (0.65 + 0.35 * Math.sin(nx * 23 + t * 0.6 + c.phase));
          ctx.globalAlpha = a;
          ctx.drawImage(c.strip, x, y - reach, step + 1, reach);
        }
      }

      // квантовые искры: рождаются внутри занавеса, живут доли секунды
      while (sparks.length < sparkCap) {
        const c = curtains[(Math.random() * curtains.length) | 0];
        const nx = Math.random();
        const y = edge(c, nx, t) * H - Math.random() * H * c.reach * 0.8;
        sparks.push({
          x: nx * W, y, vy: -(4 + Math.random() * 10) * scale,
          age: 0, life: 0.5 + Math.random() * 1.6,
          size: (Math.random() < 0.15 ? 2 : 1.1) * scale,
        });
      }
      ctx.fillStyle = '#eafff6';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.age += dt || 0.016;
        if (p.age >= p.life) { sparks.splice(i, 1); continue; }
        p.y += p.vy * (dt || 0.016);
        const k = Math.sin((Math.PI * p.age) / p.life);
        ctx.globalAlpha = 0.85 * k * k;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
    { maxScale: 1.25, onResize },
  );
}
