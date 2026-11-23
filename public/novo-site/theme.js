(function () {
  var KEY = 'prototipo-theme';
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  // O padrão é sempre claro; o escuro só aparece se o usuário escolher.
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0B0D' : '#F5F4F2');
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
      btn.title = btn.getAttribute('aria-label');
    }
  }

  apply(stored() === 'dark' ? 'dark' : 'light');

  function toggle() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next);
  }

  var LANG_KEY = 'prototipo-lang';
  var LANGS = [
    { code: 'PT', hreflang: 'pt-BR', label: 'Português' },
    { code: 'EN', hreflang: 'en', label: 'English' },
    { code: 'ES', hreflang: 'es', label: 'Español' }
  ];

  function currentLang() {
    try { return localStorage.getItem(LANG_KEY) || 'PT'; } catch (e) { return 'PT'; }
  }

  function setLang(code, group) {
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    var item = LANGS.filter(function (l) { return l.code === code; })[0];
    if (item) root.setAttribute('lang', item.hreflang);
    group.querySelectorAll('button').forEach(function (b) {
      var on = b.dataset.lang === code;
      b.setAttribute('aria-pressed', String(on));
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function buildLang() {
    var group = document.createElement('div');
    group.className = 'lang-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Idioma');
    LANGS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.lang = l.code;
      b.textContent = l.code;
      b.setAttribute('aria-label', l.label);
      b.addEventListener('click', function () {
        setLang(l.code, group);
        if (l.code !== 'PT' && window.IX && window.IX.toast) window.IX.toast('Tradução para ' + l.label + ' ainda não faz parte do protótipo.');
      });
      group.appendChild(b);
    });
    setLang(currentLang(), group);
    return group;
  }

  function mount() {
    if (document.querySelector('.theme-toggle')) return;
    var row = document.querySelector('.hdr .hdr-row') || document.querySelector('.hdr > div');
    if (!row) return;
    var lang = buildLang();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/></svg>';
    btn.addEventListener('click', toggle);
    var actions = row.lastElementChild;
    // Na Carteira o último filho é o menu da conta (.acct, position relative): montar dentro dele quebrava a linha.
    var host = actions && actions.tagName === 'DIV' && !actions.classList.contains('acct') ? actions : row;
    var tools = document.createElement('div');
    tools.className = 'hdr-tools';
    tools.appendChild(lang);
    tools.appendChild(btn);
    host.appendChild(tools);
    apply(root.getAttribute('data-theme'));
  }

  function start() {
    mount();
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
