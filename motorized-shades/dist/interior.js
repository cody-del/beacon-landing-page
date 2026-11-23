(() => {
  // Load the map library only when the map is close to the viewport.
  const map = document.querySelector('#coverage-map');
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.append(script);
  });
  const loadMap = async () => {
    try {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css';
      const styled = new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; });
      document.head.append(css);
      await Promise.all([styled, loadScript('vendor/leaflet/leaflet.js')]);
      await loadScript('service-area.js');
    } catch {
      map.hidden = true;
      document.querySelector('#map-fallback').hidden = false;
    }
  };
  if (map && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadMap(); }
    }, {rootMargin: '300px'});
    observer.observe(map);
  } else if (map) loadMap();

  const bar = document.querySelector('.interior-mobile-contact');
  const hero = document.querySelector('.paper-hero');
  const form = document.querySelector('#consultation');
  let heroVisible = true;
  let formVisible = false;
  const updateBar = () => {
    bar.hidden = heroVisible || formVisible || !!document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === form) formVisible = entry.isIntersecting;
      }
      updateBar();
    });
    observer.observe(hero); observer.observe(form);
    document.addEventListener('focusin', updateBar);
    document.addEventListener('focusout', () => setTimeout(updateBar, 0));
    new MutationObserver(updateBar).observe(document.querySelector('#review-dialog'), {attributes:true, attributeFilter:['open']});
  }
})();
