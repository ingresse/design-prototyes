(function () {
  // Delegated on document because the template engine re-renders section markup.
  function track(btn) {
    var wrap = btn.closest('.scr-wrap');
    return wrap && wrap.querySelector('[data-scroller]');
  }

  function sync(el) {
    var wrap = el.closest('.scr-wrap');
    if (!wrap) return;
    var max = el.scrollWidth - el.clientWidth - 2;
    var prev = wrap.querySelector('.scr-btn[data-dir="-1"]');
    var next = wrap.querySelector('.scr-btn[data-dir="1"]');
    if (prev) prev.disabled = el.scrollLeft <= 2;
    if (next) next.disabled = el.scrollLeft >= max;
    wrap.toggleAttribute('data-overflow', max > 0);
  }

  function syncAll() {
    document.querySelectorAll('[data-scroller]').forEach(sync);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.scr-btn');
    if (!btn) return;
    var el = track(btn);
    if (!el) return;
    var step = Math.max(el.clientWidth * 0.85, 220);
    el.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
  });

  document.addEventListener('scroll', function (e) {
    if (e.target && e.target.matches && e.target.matches('[data-scroller]')) sync(e.target);
  }, true);

  window.addEventListener('resize', syncAll);
  new MutationObserver(function () { requestAnimationFrame(syncAll); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', syncAll);
})();
