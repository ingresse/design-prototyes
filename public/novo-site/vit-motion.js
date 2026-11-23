(function () {
  var lastSrc = null;
  var lastNum = null;

  function readNum(vit) {
    var b = vit.querySelector('.vit-count b');
    var total = vit.querySelector('.vit-count');
    var n = b ? parseInt(b.textContent, 10) : NaN;
    var t = total ? parseInt((total.textContent.split('/')[1] || '').trim(), 10) : NaN;
    return { n: n, t: t };
  }

  function play(vit) {
    var cur = readNum(vit);
    var rev = false;
    if (lastNum !== null && !isNaN(cur.n)) {
      var wrapFwd = lastNum === cur.t && cur.n === 1;
      var wrapRev = lastNum === 1 && cur.n === cur.t;
      rev = wrapRev || (!wrapFwd && cur.n < lastNum);
    }
    lastNum = cur.n;
    vit.classList.remove('is-moving', 'is-rev');
    void vit.offsetWidth;
    if (rev) vit.classList.add('is-rev');
    vit.classList.add('is-moving');
  }

  function check() {
    var vit = document.querySelector('.vit');
    var img = vit && vit.querySelector('.vit-poster img');
    if (!img) return;
    var src = img.getAttribute('src');
    if (!src || src.indexOf('{{') !== -1) return;
    if (lastSrc === null) {
      lastSrc = src;
      lastNum = readNum(vit).n;
      return;
    }
    if (src !== lastSrc) {
      lastSrc = src;
      play(vit);
    }
  }

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      check();
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
})();
