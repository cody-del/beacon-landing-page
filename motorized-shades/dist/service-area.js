(() => {
  const element = document.querySelector('#coverage-map');
  if (!element) return;
  const fallback = document.querySelector('#map-fallback');
  const reset = document.querySelector('.map-reset');
  async function initialize() {
    try {
      if (!window.L) throw new Error('Map library unavailable');
      const response = await fetch('assets/map/service-area.geojson');
      if (!response.ok) throw new Error('Boundary unavailable');
      const data = await response.json();
      if (data.features?.length !== 1 || data.features[0].geometry?.type !== 'Polygon') throw new Error('Invalid service boundary');
      const map = L.map(element, {
        scrollWheelZoom:false, zoomControl:true, zoomSnap:0.1,
        minZoom:6, maxZoom:14, attributionControl:true,
      });
      map.attributionControl.setPrefix(false);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom:19, keepBuffer:1,
      }).addTo(map);
      const coverage = L.geoJSON(data, {interactive:false, style:{
        color:'#ed8c19', weight:3, opacity:1, fillColor:'#ed9a32', fillOpacity:0.09,
        lineJoin:'round', className:'beacon-coverage-outline',
      }}).addTo(map);
      const fit = () => {
        map.invalidateSize({pan:false});
        map.fitBounds(coverage.getBounds(), {paddingTopLeft:[35,35],paddingBottomRight:[35,35],animate:false});
      };
      fit();
      reset.hidden = false;
      reset.addEventListener('click', fit);
      new ResizeObserver(fit).observe(element);
      tiles.on('tileerror', () => { element.dataset.backgroundError = 'true'; });
      element.dataset.loaded = 'true';
      fallback.hidden = true;
    } catch {
      element.hidden = true;
      reset.hidden = true;
      fallback.hidden = false;
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); initialize(); }
    }, {rootMargin:'250px'});
    observer.observe(element);
  } else initialize();
})();
