(() => {
  'use strict';

  const stage = document.getElementById('carousel3d');
  const cylinder = document.getElementById('carousel3dCylinder');
  if (!stage || !cylinder) return;

  const faces = Array.from(cylinder.querySelectorAll('.carousel3d__face'));
  const faceCount = faces.length;
  if (!faceCount) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 640px)');

  const SENSITIVITY = 0.28;
  const FRICTION = 0.94;
  const AUTO_SPEED = 0.045; // deg per ~16.7ms frame
  const IDLE_DELAY = 700;   // ms after last interaction before auto-rotate resumes
  const MAX_MOMENTUM = 2.5; // deg per ~16.7ms frame — caps runaway spins from noisy/very-fast pointer events

  const DIRECTION_THRESHOLD = 6; // px moved before we decide "rotate" vs "let the page scroll"

  let rotation = 0;
  let momentum = 0;
  let dragging = false;
  let hovering = false;
  let lastX = 0;
  let lastMoveTime = 0;
  let totalMove = 0;
  let suppressNextClick = false;
  let lastInteraction = 0;
  let lastFrameTime = performance.now();

  // pointerState: 'idle' -> 'pending' (touch started, direction not yet known)
  // -> 'dragging' (horizontal: spin the carousel) or 'scrolling' (vertical: let the page scroll)
  let pointerState = 'idle';
  let startX = 0;
  let startY = 0;

  let cylinderWidth = 0;
  let radius = 0;

  function computeDims() {
    cylinderWidth = mobileQuery.matches ? 1150 : 1950;
    radius = cylinderWidth / (2 * Math.PI);
    const faceWidth = cylinderWidth / faceCount;
    const angleStep = 360 / faceCount;

    cylinder.style.width = cylinderWidth + 'px';
    faces.forEach((face, i) => {
      face.style.width = faceWidth + 'px';
      face.style.marginLeft = (-faceWidth / 2) + 'px';
      face.style.transform = `translateY(-50%) rotateY(${i * angleStep}deg) translateZ(${radius}px)`;
    });
  }

  function applyRotation() {
    cylinder.style.transform = `rotateY(${rotation}deg)`;
  }

  function tick(now) {
    const dt = Math.min(50, now - lastFrameTime) || 16.7;
    lastFrameTime = now;
    const frames = dt / 16.7;

    if (!dragging) {
      momentum *= Math.pow(FRICTION, frames);
      if (Math.abs(momentum) < 0.001) momentum = 0;

      const idle = !hovering && (now - lastInteraction > IDLE_DELAY);
      const autoAmt = (!prefersReducedMotion && idle) ? AUTO_SPEED * frames : 0;

      rotation += momentum * frames + autoAmt;
    }

    applyRotation();
    requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    pointerState = 'pending';
    momentum = 0;
    totalMove = 0;
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastMoveTime = performance.now();
  }

  function onPointerMove(e) {
    if (pointerState === 'idle' || pointerState === 'scrolling') return;

    if (pointerState === 'pending') {
      const dxTotal = e.clientX - startX;
      const dyTotal = e.clientY - startY;
      if (Math.abs(dxTotal) < DIRECTION_THRESHOLD && Math.abs(dyTotal) < DIRECTION_THRESHOLD) return;

      if (Math.abs(dyTotal) > Math.abs(dxTotal)) {
        // predominantly vertical: hand the gesture back to the page (native scroll)
        pointerState = 'scrolling';
        return;
      }
      pointerState = 'dragging';
      dragging = true;
      try { cylinder.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released/invalid — safe to ignore */ }
    }

    const now = performance.now();
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    totalMove += Math.abs(dx);
    rotation += dx * SENSITIVITY;

    const dt = Math.max(8, now - lastMoveTime);
    const rawMomentum = (dx * SENSITIVITY) * (16.7 / dt);
    momentum = Math.max(-MAX_MOMENTUM, Math.min(MAX_MOMENTUM, rawMomentum));
    lastMoveTime = now;

    applyRotation(); // reflect the drag immediately, without waiting for the next animation frame
  }

  function onPointerUp() {
    if (pointerState === 'dragging') {
      dragging = false;
      lastInteraction = performance.now();
      if (totalMove >= 6) suppressNextClick = true;
    }
    pointerState = 'idle';
  }

  cylinder.addEventListener('pointerdown', onPointerDown);
  cylinder.addEventListener('pointermove', onPointerMove);
  cylinder.addEventListener('pointerup', onPointerUp);
  cylinder.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('mouseenter', () => { hovering = true; });
  stage.addEventListener('mouseleave', () => { hovering = false; });

  faces.forEach((face) => {
    face.addEventListener('click', () => {
      if (suppressNextClick) { suppressNextClick = false; return; }
      const targetId = face.getAttribute('data-target');
      const target = targetId && document.getElementById(targetId);
      target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  window.addEventListener('resize', debounce(computeDims, 150));

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  computeDims();
  applyRotation();
  requestAnimationFrame(tick);
})();
