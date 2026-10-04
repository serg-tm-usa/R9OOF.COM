// Радиоволны: фронты расходятся от Inverted V, на фронтах вспыхивают «кванты»,
// а пакет сигнала скачками через ионосферу уходит к дальнему корреспонденту.
import { startLoop, readVar } from './loop';

// Детерминированный «шум»: одна и та же точка мерцает одинаково, без Math.random в кадре.
function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function mountRadioWaves(root: HTMLElement): void {
  const wave = readVar(root, '--fx-wave', '#f2a65a');
  const sky = readVar(root, '--fx-wave-2', '#6cb6ff');
  const dim = readVar(root, '--line', '#2a323d');
  const period = 1.1;   // секунд между фронтами
  const speed = 0.16;   // доля диагонали в секунду
  const trail: { x: number; y: number }[] = [];

  startLoop(
    root,
    ({ ctx, width: W, height: H, scale }, t) => {
      ctx.clearRect(0, 0, W, H);
      const ground = H * 0.94;
      const iono = H * 0.16;
      const sx = W * 0.12;
      const mastTop = ground - H * 0.36;
      const diag = Math.hypot(W, H);

      // ионосфера: мягкая полоса с медленной рябью
      const band = ctx.createLinearGradient(0, iono - H * 0.1, 0, iono + H * 0.06);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(0.6, sky + '40');
      band.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, iono - H * 0.1, W, H * 0.16);

      // земля, мачта и Inverted V
      ctx.strokeStyle = dim;
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(0, ground); ctx.lineTo(W, ground);
      ctx.moveTo(sx, ground); ctx.lineTo(sx, mastTop);
      ctx.moveTo(sx - H * 0.2, ground - H * 0.04); ctx.lineTo(sx, mastTop); ctx.lineTo(sx + H * 0.2, ground - H * 0.04);
      ctx.stroke();

      // волновые фронты: полные окружности, обрезанные землёй
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, ground);
      ctx.clip();
      const count = Math.ceil(1 / (speed * period)) + 1;
      for (let k = 0; k < count; k++) {
        const born = Math.floor(t / period) - k;
        const age = t - born * period;
        const r = age * speed * diag;
        const fade = Math.max(0, 1 - r / (diag * 0.95));
        if (fade <= 0) continue;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45 * fade;
        ctx.strokeStyle = wave;
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.arc(sx, mastTop, r, 0, Math.PI * 2);
        ctx.stroke();

        // кванты: точки на фронте, каждая мерцает по своему расписанию
        const dots = Math.min(420, Math.round((r * 2 * Math.PI) / (6 * scale)));
        ctx.fillStyle = wave;
        for (let i = 0; i < dots; i++) {
          const ang = (Math.PI * 2 * (i + hash(born, i) * 0.8)) / dots;
          const px = sx + Math.cos(ang) * r;
          const py = mastTop + Math.sin(ang) * r;
          if (py < iono - H * 0.04 || py > ground || px < 0 || px > W) continue;
          const blink = Math.sin(t * (3 + hash(i, born) * 5) + hash(born, i) * 6.28);
          if (blink < 0.1) continue;
          ctx.globalAlpha = Math.min(1, fade * blink * 1.1);
          const sz = (hash(i * 3, born) > 0.88 ? 2.8 : 1.6) * scale;
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();

      // пакет сигнала: два скачка через ионосферу к правому краю
      const path = [
        [sx, mastTop], [W * 0.36, iono], [W * 0.6, ground], [W * 0.82, iono], [W * 1.02, ground * 0.98],
      ];
      const seg: number[] = [];
      let total = 0;
      for (let i = 1; i < path.length; i++) {
        const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
        seg.push(d); total += d;
      }
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = sky;
      ctx.setLineDash([4 * scale, 6 * scale]);
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
      ctx.stroke();
      ctx.setLineDash([]);

      let dist = ((t * 0.22) % 1) * total;
      let i = 0;
      while (i < seg.length - 1 && dist > seg[i]) { dist -= seg[i]; i++; }
      const f = Math.min(1, dist / seg[i]);
      const x = path[i][0] + (path[i + 1][0] - path[i][0]) * f;
      const y = path[i][1] + (path[i + 1][1] - path[i][1]) * f;
      if (trail.length && Math.hypot(trail[0].x - x, trail[0].y - y) > W * 0.3) trail.length = 0;
      trail.unshift({ x, y });
      if (trail.length > 26) trail.pop();
      ctx.globalCompositeOperation = 'lighter';
      trail.forEach((p, n) => {
        const k = 1 - n / trail.length;
        ctx.globalAlpha = 0.7 * k * k;
        ctx.fillStyle = n === 0 ? '#ffffff' : sky;
        const sz = (n === 0 ? 5 : 3.2 * k + 0.8) * scale;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
    { maxScale: 2 },
  );
}
