// Общий цикл для canvas-эффектов: размер, плотность пикселей, пауза вне экрана,
// пауза на скрытой вкладке и статичный кадр при «уменьшении движения».

export interface FxContext {
  ctx: CanvasRenderingContext2D;
  width: number;   // ширина холста во внутренних пикселях
  height: number;  // высота холста во внутренних пикселях
  scale: number;   // внутренних пикселей на один CSS-пиксель
}

export type DrawFn = (fx: FxContext, time: number, dt: number) => void;
export type ResizeFn = (fx: FxContext) => void;

interface Options {
  maxScale?: number;   // потолок плотности: экономит видеокарту на телефонах
  onResize?: ResizeFn;
}

export function readVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function startLoop(root: HTMLElement, draw: DrawFn, opts: Options = {}): void {
  const canvas = root.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx: FxContext = { ctx, width: 0, height: 0, scale: 1 };
  let visible = true;
  let raf = 0;
  let last = 0;
  let clock = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    fx.scale = Math.min(window.devicePixelRatio || 1, opts.maxScale ?? 2);
    fx.width = Math.max(1, Math.round(rect.width * fx.scale));
    fx.height = Math.max(1, Math.round(rect.height * fx.scale));
    canvas.width = fx.width;
    canvas.height = fx.height;
    opts.onResize?.(fx);
    if (reduced) draw(fx, 4, 0);
  };

  const frame = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    clock += dt;
    draw(fx, clock, dt);
    raf = requestAnimationFrame(frame);
  };

  const play = () => {
    if (reduced || raf || !visible || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }).observe(root);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));

  resize();
  play();
}
