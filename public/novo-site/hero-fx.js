(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;

  // Dominant vivid color of the poster drives the hero ambient light.
  function extractAmbient(img) {
    try {
      var c = document.createElement('canvas');
      c.width = 24; c.height = 32;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 24, 32);
      var d = ctx.getImageData(0, 0, 24, 32).data;
      var best = null, second = null;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var sat = max ? (max - min) / max : 0;
        var score = sat * (max / 255);
        if (max < 40 || max > 250 && sat < .1) continue;
        if (!best || score > best.s) { second = best; best = { s: score, c: [r, g, b] }; }
        else if (!second || score > second.s) { second = { s: score, c: [r, g, b] }; }
      }
      if (best) root.style.setProperty('--amb', best.c.join(' '));
      if (second) root.style.setProperty('--amb2', second.c.join(' '));
    } catch (e) { /* cross-origin images keep the brand fallback */ }
  }

  function initAmbient() {
    var img = document.querySelector('.ev-poster');
    if (!img) return false;
    if (img.complete && img.naturalWidth) extractAmbient(img);
    else img.addEventListener('load', function () { extractAmbient(img); }, { once: true });
    return true;
  }

  function initCountdown() {
    var stub = document.querySelector('[data-event-date]');
    var out = stub && stub.querySelector('[data-countdown]');
    if (!out) return false;
    var diff = new Date(stub.getAttribute('data-event-date')) - new Date();
    var days = Math.ceil(diff / 86400000);
    // contagem pelo estado do evento (revisão de textos EV-18): cancelado não tem contagem; encerrado diz "Já aconteceu"
    var tagSit = document.querySelector('.ev-hero-info .tag-lg[data-sit], .ev-title-m .tag-lg[data-sit]');
    var sit = tagSit && tagSit.getAttribute('data-sit');
    out.style.display = sit === 'cancelado' ? 'none' : '';
    var label = sit === 'encerrado' ? 'Já aconteceu' : diff <= 0 ? 'Hoje' : days === 1 ? 'Amanhã' : 'Faltam ' + days + ' dias';
    if (out.textContent !== label) out.textContent = label;
    return true;
  }

  var tries = 0;
  (function boot() {
    if (!initAmbient() && tries++ < 60) setTimeout(boot, 100);
  })();

  // The template engine re-renders the stub, so keep the countdown label applied.
  initCountdown();
  setInterval(initCountdown, 1000);

  if (reduceMotion || !finePointer) return;

  var frame = 0;
  document.addEventListener('pointermove', function (e) {
    var tilt = e.target.closest && e.target.closest('.ev-tilt');
    if (!tilt) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      tilt.classList.add('is-live');
      tilt.style.setProperty('--ry', ((x - .5) * 14).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', ((.5 - y) * 12).toFixed(2) + 'deg');
      tilt.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      tilt.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
  });

  document.addEventListener('pointerout', function (e) {
    var tilt = e.target.closest && e.target.closest('.ev-tilt');
    if (!tilt || tilt.contains(e.relatedTarget)) return;
    cancelAnimationFrame(frame);
    tilt.classList.remove('is-live');
    tilt.style.setProperty('--rx', '0deg');
    tilt.style.setProperty('--ry', '0deg');
  });
})();
