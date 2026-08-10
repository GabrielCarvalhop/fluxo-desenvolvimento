(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 640px)');

  /* Curvas em espaço normalizado (0-1), no espírito do traço do logo da Vertex.
     Reaproveitadas por todas as instâncias — cada canvas as redimensiona ao seu próprio tamanho. */
  const FLOW_PATHS = [
    [[-0.1, 0.15], [0.30, 0.90], [0.55, -0.15], [1.1, 0.55]],
    [[-0.1, 0.65], [0.38, -0.10], [0.62, 1.10], [1.1, 0.30]],
    [[-0.1, 0.90], [0.45, 0.35], [0.55, 0.55], [1.1, 0.05]],
    [[1.1, 0.15], [0.60, 0.95], [0.32, -0.10], [-0.1, 0.50]],
    [[-0.1, 0.40], [0.40, 0.75], [0.65, 0.15], [1.1, 0.75]],
  ];

  function cubicPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
    return {
      x: a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      y: a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
    };
  }

  function fadeAlpha(t) {
    const edge = 0.1;
    if (t < edge) return t / edge;
    if (t > 1 - edge) return (1 - t) / edge;
    return 1;
  }

  function makeGlowSprite() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 235, 233, .95)');
    g.addColorStop(0.28, 'rgba(255, 90, 82, .85)');
    g.addColorStop(0.62, 'rgba(228, 35, 43, .35)');
    g.addColorStop(1, 'rgba(228, 35, 43, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  const sprite = makeGlowSprite();

  const TRAIL_STEPS = 4;
  const TRAIL_GAP = 0.014;

  class FlowLayer {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({
        countDesktop: 14,
        countMobile: 6,
        sizeMin: 2.4,
        sizeMax: 5,
        speedMin: 0.012,
        speedMax: 0.026,
        opacity: 0.55,
      }, opts);

      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.particles = [];
      this.running = false;
      this.visible = true;
      this.lastTime = 0;

      this.onResize = this.onResize.bind(this);
      this.tick = this.tick.bind(this);

      this.resize();
      this.buildParticles();

      window.addEventListener('resize', debounce(this.onResize, 150));
      mobileQuery.addEventListener ? mobileQuery.addEventListener('change', () => this.buildParticles()) : mobileQuery.addListener(() => this.buildParticles());

      document.addEventListener('visibilitychange', () => {
        this.visible = !document.hidden;
        this.syncRunning();
      });

      if (prefersReducedMotion) {
        this.drawStaticFrame();
      } else {
        this.observeVisibility();
        this.syncRunning();
      }
    }

    isMobile() {
      return mobileQuery.matches;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile() ? 1 : 1.5);
      this.w = Math.max(1, Math.round(rect.width));
      this.h = Math.max(1, Math.round(rect.height));
      this.canvas.width = this.w * this.dpr;
      this.canvas.height = this.h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    onResize() {
      this.resize();
      if (prefersReducedMotion) this.drawStaticFrame();
    }

    buildParticles() {
      const count = this.isMobile() ? this.opts.countMobile : this.opts.countDesktop;
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push(this.makeParticle(i, count));
      }
      this.particles = list;
      if (prefersReducedMotion) this.drawStaticFrame();
    }

    makeParticle(i, count) {
      const { sizeMin, sizeMax, speedMin, speedMax } = this.opts;
      return {
        pathIndex: i % FLOW_PATHS.length,
        t: (i / Math.max(1, count)) % 1,
        speed: speedMin + Math.random() * (speedMax - speedMin),
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
      };
    }

    observeVisibility() {
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.visible = entry.isIntersecting;
          this.syncRunning();
        });
      }, { threshold: 0.01 });
      io.observe(this.canvas);
    }

    syncRunning() {
      const shouldRun = this.visible && !document.hidden;
      if (shouldRun && !this.running) {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.tick);
      } else if (!shouldRun) {
        this.running = false;
      }
    }

    drawStaticFrame() {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      this.particles.forEach((p) => {
        const path = FLOW_PATHS[p.pathIndex];
        const pt = cubicPoint(path[0], path[1], path[2], path[3], p.t);
        const alpha = fadeAlpha(p.t) * this.opts.opacity * 0.7;
        if (alpha <= 0.01) return;
        ctx.globalAlpha = alpha;
        const s = p.size * 2.2;
        ctx.drawImage(sprite, pt.x * w - s / 2, pt.y * h - s / 2, s, s);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      this.particles.forEach((p) => {
        p.t += p.speed * dt;
        if (p.t > 1) p.t -= 1;

        const path = FLOW_PATHS[p.pathIndex];
        for (let k = 0; k < TRAIL_STEPS; k++) {
          const t = p.t - k * TRAIL_GAP;
          if (t < 0 || t > 1) continue;
          const pt = cubicPoint(path[0], path[1], path[2], path[3], t);
          const alpha = fadeAlpha(t) * this.opts.opacity * (1 - k / TRAIL_STEPS);
          if (alpha <= 0.01) continue;
          ctx.globalAlpha = alpha;
          const s = p.size * (2.2 - k * 0.28);
          ctx.drawImage(sprite, pt.x * w - s / 2, pt.y * h - s / 2, s, s);
        }
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      requestAnimationFrame(this.tick);
    }
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function init(id, opts) {
    const canvas = document.getElementById(id);
    if (canvas) new FlowLayer(canvas, opts);
  }

  init('flowAmbient', { countDesktop: 12, countMobile: 5, sizeMin: 2, sizeMax: 3.6, speedMin: 0.008, speedMax: 0.016, opacity: 0.4 });
  init('flowHero', { countDesktop: 20, countMobile: 8, sizeMin: 2.6, sizeMax: 5.6, speedMin: 0.014, speedMax: 0.03, opacity: 0.8 });
  init('flowCta', { countDesktop: 18, countMobile: 7, sizeMin: 2.6, sizeMax: 5.2, speedMin: 0.014, speedMax: 0.03, opacity: 0.8 });
})();
