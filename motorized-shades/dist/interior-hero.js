(() => {
  const hero = document.querySelector('.paper-hero');
  const video = hero?.querySelector('.hero-video');
  const toggle = hero?.querySelector('.hero-video-toggle');
  if (!video || !toggle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 700px)');
  const connection = navigator.connection;
  // Autoplay on every connection speed; preserve existing device preferences.
  const canAutoplay = () => !reducedMotion.matches && !connection?.saveData;
  let wantsPlayback = canAutoplay();
  let userChoice = false;
  let ready = false;
  let inView = hero.getBoundingClientRect().bottom > 0;

  function updateButton() {
    toggle.textContent = wantsPlayback ? 'Pause video' : 'Play video';
    toggle.setAttribute('aria-label', wantsPlayback ? 'Pause video (background)' : 'Play video (background)');
  }

  function syncPlayback() {
    updateButton();
    if (!ready || !wantsPlayback || !inView || document.hidden) {
      video.pause();
      return;
    }
    // Select once, avoiding a second download when the phone rotates.
    if (!video.getAttribute('src')) {
      video.src = mobileViewport.matches && video.dataset.mobileSrc
        ? video.dataset.mobileSrc : video.dataset.src;
    }
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
    ready = true;
    userChoice = true;
    wantsPlayback = !wantsPlayback;
    syncPlayback();
  });
  function respectPreferences() {
    userChoice = false;
    wantsPlayback = canAutoplay();
    syncPlayback();
  }
  reducedMotion.addEventListener('change', respectPreferences);
  connection?.addEventListener('change', () => {
    // Connection estimates must not undo an explicit pause or play choice.
    if (!userChoice) wantsPlayback = canAutoplay();
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, {threshold: 0}).observe(hero);
  }
  toggle.hidden = false;
  syncPlayback();
  // The poster and fonts get the initial bandwidth. Video is an enhancement.
  const start = () => {
    ready = true;
    syncPlayback();
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, {once: true});
})();
