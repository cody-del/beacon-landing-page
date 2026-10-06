(() => {
  const hero = document.querySelector('.paper-hero');
  const video = hero?.querySelector('.hero-video');
  const toggle = hero?.querySelector('.hero-video-toggle');
  if (!video || !toggle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let wantsPlayback = !reducedMotion.matches && !connection?.saveData;
  let inView = hero.getBoundingClientRect().bottom > 0;

  function updateButton() {
    toggle.textContent = wantsPlayback ? 'Pause video' : 'Play video';
    toggle.setAttribute('aria-label', wantsPlayback ? 'Pause background video' : 'Play background video');
  }

  function syncPlayback() {
    updateButton();
    if (!wantsPlayback || !inView || document.hidden) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.muted = true;
    video.play().catch(error => {
      // A pause while loading is expected when the visitor scrolls away.
      if (error.name === 'AbortError') return;
      wantsPlayback = false;
      updateButton();
    });
  }

  video.addEventListener('playing', () => hero.classList.add('hero-video-ready'));
  video.addEventListener('error', () => {
    hero.classList.remove('hero-video-ready');
    toggle.hidden = true;
    wantsPlayback = false;
  });
  toggle.addEventListener('click', () => {
    wantsPlayback = !wantsPlayback;
    syncPlayback();
  });
  function respectPreferences() {
    wantsPlayback = !reducedMotion.matches && !connection?.saveData;
    syncPlayback();
  }
  reducedMotion.addEventListener('change', respectPreferences);
  connection?.addEventListener('change', respectPreferences);
  document.addEventListener('visibilitychange', syncPlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, {threshold: 0}).observe(hero);
  }
  toggle.hidden = false;
  syncPlayback();
})();
