/* Camada de experiência compartilhada: feedback (toast), compartilhamento,
   links ainda não construídos e armazenamento seguro entre telas do funil. */
(function () {
  var IX = window.IX = window.IX || {};

  IX.store = {
    get: function (k, fallback) {
      try { var v = sessionStorage.getItem('ix:' + k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { sessionStorage.setItem('ix:' + k, JSON.stringify(v)); } catch (e) { /* modo privado: segue sem persistir */ }
    },
    del: function (k) { try { sessionStorage.removeItem('ix:' + k); } catch (e) {} }
  };

  IX.brl = function (v) {
    var n = Math.round(Number(v || 0) * 100) / 100;
    var s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
    return 'R$ ' + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  var host = null, timer = 0;
  IX.toast = function (msg, kind) {
    if (!host) {
      host = document.createElement('div');
      host.className = 'ix-toast';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    host.textContent = msg;
    host.dataset.kind = kind || 'info';
    host.classList.remove('is-on');
    void host.offsetWidth;
    host.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { host.classList.remove('is-on'); }, 3200);
  };

  IX.share = function (title) {
    var data = { title: title || document.title, url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    var done = function () { IX.toast('Link copiado.', 'ok'); };
    if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(done, function () { IX.toast(data.url); });
    else IX.toast(data.url);
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-share],[data-toast]:not([data-toast=""]),a[href="#"]');
    if (!t) return;
    if (t.hasAttribute('data-share')) { e.preventDefault(); IX.share(t.getAttribute('data-share')); return; }
    if (t.getAttribute('data-toast')) { if (t.getAttribute('href') === '#') e.preventDefault(); IX.toast(t.getAttribute('data-toast'), t.getAttribute('data-toast-kind')); return; }
    // Links que ainda não têm tela: em vez de pular pro topo, explicamos.
    e.preventDefault();
    IX.toast('Esta página ainda não está disponível.');
  });

  // Atalho para esconder/mostrar os controles de protótipo (Shift + P).
  document.addEventListener('keydown', function (e) {
    if (e.shiftKey && (e.key === 'P' || e.key === 'p') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      document.documentElement.toggleAttribute('data-hide-proto');
    }
  });
})();
