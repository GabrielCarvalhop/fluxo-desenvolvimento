(() => {
  'use strict';

  /* ---------------- header: sólido ao rolar ---------------- */
  const header = document.getElementById('siteHeader');
  const heroEl = document.querySelector('.hero');
  const scrollThreshold = () => Math.max((heroEl?.offsetHeight || 500) - 120, 60);

  const onScroll = () => {
    if (window.scrollY > scrollThreshold()) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- menu mobile ---------------- */
  const navToggle = document.getElementById('navToggle');
  const drawer = document.getElementById('mobileDrawer');
  const scrim = document.getElementById('navScrim');

  function closeDrawer() {
    document.documentElement.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    onScroll();
  }
  function openDrawer() {
    document.documentElement.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    header.classList.add('is-scrolled');
  }
  function toggleDrawer() {
    document.documentElement.classList.contains('nav-open') ? closeDrawer() : openDrawer();
  }

  navToggle?.addEventListener('click', toggleDrawer);
  scrim?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  /* ---------------- reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger > *');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------- FAB do WhatsApp ---------------- */
  const fab = document.getElementById('waFab');
  if (fab) {
    const showAfter = 400;
    const onFabScroll = () => {
      const nearFooter = document.body.scrollHeight - window.innerHeight - window.scrollY < 260;
      fab.classList.toggle('is-visible', window.scrollY > showAfter && !nearFooter);
    };
    onFabScroll();
    window.addEventListener('scroll', onFabScroll, { passive: true });
  }
})();
