/* menu-conta.js: o avatar do cabeçalho e o menu da conta, UM componente em todas as telas com cabeçalho (pedido do Wander, 28/10/2026; Mariana, Edu do Udi).
   Substitui o `.pv-menu` de previa.js (§7) e o `.acct`/`#menu-conta` da Carteira. Anatomia e comportamento do Untitled UI `dropdown-avatar` (React Aria):
     - gatilho: <button data-menu-conta aria-haspopup="menu" aria-expanded aria-controls> só com o avatar (foto; genérico para visitante), nome acessível «Minha conta»
       (com novas: «Minha conta, 3 notificações novas»; 1 «1 notificação nova»; 10 ou mais «mais de 9 notificações novas»);
     - popover no <html> (o motor de templates do v5.3 refaz o <body>): role=menu, itens role=menuitem / menuitemradio; ↑ ↓ Home End, digitar letras (1 s), Enter/Espaço ativam,
       Esc fecha e devolve o foco ao avatar, Tab fecha e segue, clique fora fecha sem agir na página; mouse abre sem item destacado, teclado no primeiro (↑ abre no último);
       o destaque segue o ponteiro; vira para cima se faltar espaço; até 640 px é folha de baixo modal (foco preso, corpo rola, página travada).
   A BOLINHA do avatar conta as NOVAS notificações (IngresseLembretes.novas()): 1 a 9, «9+» de 10 em diante, some sem novas; `aria-hidden`; só o nome do botão leva o número real;
   um `role=status` anuncia só quando a contagem SOBE com a página aberta. O item «Notificações» do menu abre o painel de lembretes que já existe (IngresseLembretes.abrirPainel),
   ancorado ao avatar; abrir o PAINEL marca as novas como vistas, abrir o menu não.
   Estado: conta (IngresseLembretes.conta(); null = visitante: avatar genérico, menu com Entrar, Notificações e Idioma), novas e ingressos da Carteira (IX.store 'contaIngressos').
   API: window.IngresseConta = { abrir, fechar, aberto, sincronizar }.
   Engrenagem do protótipo: este módulo também acrescenta à engrenagem de cada tela o grupo «Conta e notificações» (relógio, conta, +N novas), e cria a engrenagem onde não há. */
(function () {
  'use strict';
  if (window.IngresseConta) return;

  var root = document.documentElement;
  var FOTO = './assets/pessoas/pessoa-exemplo.jpg', FOTO2 = './assets/pessoas/pessoa-exemplo@2x.jpg';
  var NOME = 'Pessoa Exemplo', EMAIL = 'pessoa@exemplo.com';
  var POP = '.mc-pop:not([data-saindo])';
  var T = {
    conta: 'Minha conta', menu: 'Menu da conta', notificacoes: 'Notificações', carteira: 'Carteira', idioma: 'Idioma', sair: 'Sair', fechar: 'Fechar',
    entrar: 'Entrar ou criar conta', dev: 'Opções de desenvolvedor', saiu: 'Você saiu da conta.'
  };
  var ITENS = [
    ['Carteira.dc.html', 'Carteira', 'carteira'], ['Compras.dc.html', 'Minhas compras'], ['Conta.dc.html', 'Meus dados'],
    ['Dependentes.dc.html', 'Dependentes'], ['Seguranca.dc.html', 'Privacidade e segurança']
  ]; // «Meios de pagamento» e «Dispositivos» saíram do menu de vez (pedido do Wander, 15/11/2026); seguem no menu da área logada (conta.js).
  // design-prototypes (24/11/2026): os itens levam às páginas da área logada recriadas do site_next (scripts/paginas-da-conta.py).
  function mvp() { return document.documentElement.getAttribute('data-modo') === 'mvp'; } // MODO MVP: sem notificações no menu nem bolinha no avatar (pedido do Wander, 15/11/2026)

  /* ---------- estado ---------- */
  function L() { return window.IngresseLembretes || null; }
  function conta() { var l = L(); return l ? l.conta() : { email: EMAIL }; }
  function novas() { if (mvp()) return 0; var l = L(); return l ? l.novas() : 0; }
  function ingressos() {
    try { var v = window.IX && IX.store ? IX.store.get('contaIngressos', null) : null; if (typeof v === 'number') return v; } catch (e) {}
    return 4;
  }
  function reduzido() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; }
  function ms(token, padrao) { var v = parseFloat(getComputedStyle(root).getPropertyValue(token)); return isNaN(v) ? padrao : v; }
  function ehFolha() { return !!(window.matchMedia && matchMedia('(max-width: 640px)').matches); }

  function ariaNovas(n) { return n === 1 ? '1 notificação nova' : n > 9 ? 'mais de 9 notificações novas' : n + ' notificações novas'; }
  function rotuloGatilho(n) { return n > 0 ? T.conta + ', ' + ariaNovas(n) : T.conta; }
  function textoBolinha(n) { return n > 9 ? '9+' : String(n); }
  function textoNovas(n) { return n === 1 ? '1 nova' : n > 9 ? '9+ novas' : n + ' novas'; }

  /* ---------- DOM ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function svg(d, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', cls || ''); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    d.split('|').forEach(function (x) { var p = document.createElementNS(NS, 'path'); p.setAttribute('d', x); s.appendChild(p); });
    return s;
  }
  var D_CHEV = 'm9 18 6-6-6-6', D_X = 'M18 6 6 18M6 6l12 12', D_GEN = 'M20 21a8 8 0 0 0-16 0|M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z';
  function foto(tam) { // foto da pessoa sobre as iniciais (reserva); previa.js §9b esconde a foto se ela falhar
    var c = el('span', 'uui-avatar__content');
    var ini = el('span', 'mc-ini', 'PE'); ini.setAttribute('aria-hidden', 'true'); c.appendChild(ini);
    c.appendChild(svg(D_GEN, 'mc-gen'));
    var im = el('img'); im.src = FOTO; im.setAttribute('srcset', FOTO + ' 96w, ' + FOTO2 + ' 192w'); im.setAttribute('sizes', tam + 'px'); im.width = tam; im.height = tam; im.alt = ''; c.appendChild(im);
    return c;
  }

  /* ---------- gatilho: rótulo, bolinha e anúncio ---------- */
  var anterior = null, avisoEl = null;
  function aviso(txt) {
    if (!avisoEl || !document.contains(avisoEl)) { avisoEl = el('div', 'sr-only'); avisoEl.setAttribute('role', 'status'); avisoEl.setAttribute('aria-live', 'polite'); avisoEl.setAttribute('aria-atomic', 'true'); root.appendChild(avisoEl); }
    avisoEl.textContent = '';
    setTimeout(function () { if (avisoEl) avisoEl.textContent = txt; }, 60); // a região precisa estar vazia antes: o leitor anuncia a mudança
  }
  var baseAviso = null, timerAviso = 0;
  function anunciarSubida(n, antes) { // agrupa: várias chegadas em sequência viram UM anúncio (o leitor de tela não repete cada uma)
    if (baseAviso === null) baseAviso = antes;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () {
      var atualN = novas(), sobe = atualN - baseAviso; baseAviso = null;
      if (sobe <= 0) return;
      var l = L(), novos = l && l.itens ? l.itens().filter(function (i) { return i.nova; }) : [];
      if (sobe === 1 && novos.length) { var it = novos[novos.length - 1]; aviso('A venda' + (it.praca ? ' de ' + it.praca : '') + ' abriu.'); } // MC-54
      else aviso(ariaNovas(sobe).replace('mais de 9', String(sobe)));
    }, 500);
  }
  function sincronizar() {
    var n = novas(), c = conta();
    var gs = document.querySelectorAll('[data-menu-conta]');
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i], b = g.querySelector('[data-mc-n]'), r = rotuloGatilho(n), cc = c ? 'true' : 'false';
      if (g.getAttribute('aria-label') !== r) g.setAttribute('aria-label', r);
      if (g.getAttribute('data-conta') !== cc) g.setAttribute('data-conta', cc);
      if (g.getAttribute('aria-haspopup') !== 'menu') g.setAttribute('aria-haspopup', 'menu');
      if (!g.id) g.id = 'mc-gatilho' + (i ? '-' + i : '');
      if (b) {
        var t = textoBolinha(n), vz = n === 0 ? 'true' : 'false';
        if (n && b.textContent !== t) b.textContent = t; // zerando, o número fica até a bolinha sumir (sem piscar o «0»)
        if (b.getAttribute('data-vazio') !== vz) b.setAttribute('data-vazio', vz);
      }
    }
    if (anterior !== null && n > anterior) anunciarSubida(n, anterior);
    anterior = n;
    if (atual && !document.contains(atual.gat)) { // o motor de templates refez o cabeçalho com o menu aberto: o gatilho novo assume
      var novo = document.querySelector('[data-menu-conta]');
      if (novo) { atual.gat = novo; novo.setAttribute('aria-expanded', 'true'); novo.setAttribute('aria-controls', 'mc-pop'); posicionar(atual.pop, novo); }
    }
    var pop = document.querySelector(POP);
    if (pop && pop._atualizar) pop._atualizar();
  }
  var agendado = false;
  function agendar() { if (agendado) return; agendado = true; requestAnimationFrame(function () { agendado = false; sincronizar(); }); }

  /* ---------- o menu ---------- */
  var atual = null; // { pop, scrim, gat, modal, teclas, fora, tipo }
  var digitado = '', digitadoT = 0, suprimeClique = false, ultimoInput = 'mouse';

  function visitaveis(pop) {
    return [].slice.call(pop.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')).filter(function (i) { return !i.closest('[hidden]') && i.getAttribute('aria-disabled') !== 'true'; });
  }
  function focar(i) { if (i) { i.focus({ preventScroll: false }); } }

  function item(rotulo, o) {
    o = o || {};
    var a = el(o.href ? 'a' : 'button', 'mc-item');
    if (o.href) a.setAttribute('href', o.href); else a.type = 'button';
    a.setAttribute('role', 'menuitem'); a.tabIndex = -1;
    a.appendChild(el('span', 'mc-it', rotulo));
    if (o.nome) a.setAttribute('aria-label', o.nome);
    return a;
  }
  var langAberto = false; // o grupo de idiomas aberto sobrevive ao redesenho do menu (pop._atualizar); cada abertura do menu começa fechada
  function idiomas() { var P = window.IngressePrefs; return P ? P.idiomas : [['PT', 'pt-BR', 'Português (Brasil)', 'PT-BR', 'br'], ['PT-PT', 'pt-PT', 'Português (Portugal)', 'PT-PT', 'pt'], ['ES', 'es', 'Español', 'ES', 'es'], ['EN', 'en', 'English', 'EN', 'us']]; }
  function bandeira(b) { var f = el('img', 'rp-band'); f.src = './assets/flags/' + b + '.svg'; f.alt = ''; f.width = 24; f.height = 18; return f; } // a bandeira do rodapé (.rp-band, 24 px)
  function sep() { var s = el('div', 'mc-sep'); s.setAttribute('role', 'separator'); return s; }
  function arquivoAtual() { var m = /([A-Za-z0-9_\-]+\.dc\.html)$/.exec(location.pathname); return m ? m[1] : 'Main.dc.html'; }
  function hrefEntrar() {
    var volta = arquivoAtual() + (location.search || ''), marca = /Esportes|esporte/.test(arquivoAtual()) || root.hasAttribute('data-marca-fixa') ? 'esportes' : '';
    if (!/^[A-Za-z0-9_\-]+\.dc\.html(\?[A-Za-z0-9_\-=&%.:+,]*)?$/.test(volta)) volta = arquivoAtual();
    return 'Login.dc.html?volta=' + encodeURIComponent(volta) + (marca ? '&marca=' + marca : '');
  }

  function montar(pop, gat) {
    var c = conta(), n = novas(), foco = document.activeElement && pop.contains(document.activeElement) ? document.activeElement.getAttribute('data-mc-id') : null;
    while (pop.firstChild) pop.removeChild(pop.firstChild);
    var cab = el('div', 'mc-cab');
    if (c) {
      var cartao = el('figure', 'mc-card'); cartao.setAttribute('data-conta', 'true');
      var av = el('span', 'uui-avatar uui-avatar--lg'); av.setAttribute('aria-hidden', 'true'); av.appendChild(foto(48)); cartao.appendChild(av);
      var tx = el('figcaption', 'mc-card-tx'); tx.appendChild(el('p', 'mc-card-nome', NOME)); tx.appendChild(el('p', 'mc-card-mail', c.email || EMAIL)); cartao.appendChild(tx);
      cab.appendChild(cartao);
    } else cab.setAttribute('data-sem-cartao', 'true');
    var fx = el('button', 'mc-fechar'); fx.type = 'button'; fx.setAttribute('aria-label', T.fechar); fx.setAttribute('data-mc-fechar', ''); fx.appendChild(svg(D_X)); cab.appendChild(fx);
    pop.appendChild(cab);

    var menu = el('div', 'mc-menu'); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', T.menu); menu.tabIndex = -1;
    if (!c) {
      var w = el('div', 'mc-entrar-w');
      var en = el('a', 'bp mc-entrar', T.entrar); en.href = hrefEntrar(); en.setAttribute('role', 'menuitem'); en.tabIndex = -1; en.setAttribute('data-mc-id', 'entrar');
      w.appendChild(en); menu.appendChild(w); menu.appendChild(sep());
    }
    if (!mvp()) {
      var nt = item(T.notificacoes, { nome: n ? T.notificacoes + ', ' + textoNovas(n) : T.notificacoes });
      nt.setAttribute('aria-haspopup', 'dialog'); nt.setAttribute('data-mc-acao', 'notificacoes'); nt.setAttribute('data-mc-id', 'notificacoes');
      var nn = el('span', 'mc-it-n', n ? textoNovas(n) : ''); nn.setAttribute('aria-hidden', 'true'); nt.appendChild(nn); nt.appendChild(svg(D_CHEV, 'mc-chev'));
      menu.appendChild(nt);
    }
    if (c) {
      if (!mvp()) menu.appendChild(sep());
      var ing = ingressos();
      ITENS.forEach(function (d) {
        var cur = d[0] === arquivoAtual();
        var it = item(d[1], { href: d[0], nome: d[2] === 'carteira' ? 'Carteira, ' + ing + (ing === 1 ? ' ingresso' : ' ingressos') : '' });
        it.setAttribute('data-mc-id', d[1]);
        if (cur) it.setAttribute('aria-current', 'page');
        if (d[2] === 'carteira') { var bd = el('span', 'badge', String(ing)); bd.setAttribute('aria-hidden', 'true'); it.appendChild(bd); }
        if (d[0] === '#') it.setAttribute('data-mc-sem-destino', '');
        menu.appendChild(it);
      });
    }
    menu.appendChild(sep());
    /* idioma (15/11/2026, Alê): item de menu «Idioma» que mostra o idioma ativo (bandeira + nome) e abre, no próprio menu, o grupo de seleção única
       do Untitled UI Dropdown (menuitemradio): bandeira, nome por extenso e o tique no escolhido, o mesmo item do seletor do rodapé (rodape.mjs). */
    var P = window.IngressePrefs, IDS = idiomas(), cod = P && P.idioma ? P.idioma() : 'PT', ativo = IDS.filter(function (d) { return d[0] === cod; })[0] || IDS[0];
    var lw = el('div', 'mc-lang-w');
    var lt = item(T.idioma); lt.classList.add('mc-lang-b'); lt.setAttribute('data-mc-tx', T.idioma); lt.setAttribute('aria-expanded', String(langAberto)); lt.setAttribute('aria-controls', 'mc-idiomas'); lt.setAttribute('data-mc-acao', 'idioma'); lt.setAttribute('data-mc-id', 'idioma');
    var lv = el('span', 'mc-lang-v'); lv.setAttribute('aria-hidden', 'true'); lv.appendChild(bandeira(ativo[4])); lv.appendChild(el('span', 'mc-lang-n', ativo[2])); lt.appendChild(lv);
    lt.setAttribute('aria-label', T.idioma + ': ' + ativo[2]);
    lt.appendChild(svg(D_CHEV, 'mc-chev mc-chev-b')); lw.appendChild(lt);
    var lg = el('div', 'mc-idiomas'); lg.id = 'mc-idiomas'; lg.hidden = !langAberto; lg.setAttribute('role', 'group'); lg.setAttribute('aria-label', T.idioma);
    IDS.forEach(function (d) {
      var b = el('button', 'mc-item mc-lang-op'); b.type = 'button'; b.tabIndex = -1; b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(d[0] === ativo[0]));
      b.setAttribute('lang', d[1]); b.setAttribute('data-pv-lang', d[0]); b.setAttribute('data-mc-id', 'lang:' + d[0]);
      b.appendChild(bandeira(d[4])); b.appendChild(el('span', 'mc-it', d[2])); // nome acessível = o nome do idioma por extenso
      lg.appendChild(b);
    });
    lw.appendChild(lg); menu.appendChild(lw);
    if (c) {
      menu.appendChild(sep());
      var sa = item(T.sair); sa.setAttribute('data-mc-acao', 'sair'); sa.setAttribute('data-mc-id', 'sair'); menu.appendChild(sa);
      var dv = el('div', 'mc-dev'); dv.setAttribute('data-so-prototipo', ''); // só no protótipo: não vai à produção
      var db = item(T.dev); db.classList.add('mc-dev-b'); db.setAttribute('aria-expanded', 'false'); db.setAttribute('aria-controls', 'mc-dev-in'); db.setAttribute('data-mc-acao', 'dev'); db.setAttribute('data-mc-id', 'dev');
      db.appendChild(svg(D_CHEV, 'mc-chev mc-chev-b')); dv.appendChild(db);
      var di = el('div', 'mc-dev-in'); di.id = 'mc-dev-in'; di.hidden = true; di.setAttribute('role', 'group'); di.setAttribute('aria-label', T.dev);
      if (P) for (var k in P.dev) {
        di.appendChild(el('span', 'pv-l', P.dev[k][0]));
        P.dev[k][1].forEach(function (o) {
          var b = el('button', 'chip', o[1]); b.type = 'button'; b.tabIndex = -1; b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('data-pv', k + ':' + o[0]); b.setAttribute('data-mc-id', 'dev:' + k + ':' + o[0]);
          di.appendChild(b);
        });
      }
      dv.appendChild(di); menu.appendChild(sep()); menu.appendChild(dv);
    }
    pop.appendChild(menu);
    if (foco) { var f = pop.querySelector('[data-mc-id="' + foco + '"]'); if (f) f.focus(); }
  }
  function assinatura() { return (conta() ? 'c' : 's') + novas() + '|' + ingressos(); }

  function posicionar(pop, gat) {
    if (pop.getAttribute('data-modo') === 'folha') { pop.style.top = ''; pop.style.left = ''; pop.style.bottom = ''; pop.style.maxHeight = ''; return; }
    var r = gat.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, mn = pop.querySelector('.mc-menu'), rolou = mn ? mn.scrollTop : 0;
    pop.style.maxHeight = ''; pop.style.top = '0px'; pop.style.bottom = 'auto';
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var abaixo = vh - r.bottom - 8 - 12, acima = r.top - 8 - 12;
    var cima = h > abaixo && acima > abaixo; // vira para cima só se faltar espaço embaixo e sobrar em cima
    var esp = Math.max(160, cima ? acima : abaixo);
    pop.style.maxHeight = Math.floor(esp) + 'px';
    pop.setAttribute('data-lado', cima ? 'cima' : 'baixo');
    if (cima) { pop.style.top = 'auto'; pop.style.bottom = Math.round(vh - r.top + 8) + 'px'; } else { pop.style.top = Math.round(r.bottom + 8) + 'px'; pop.style.bottom = 'auto'; }
    pop.style.left = Math.max(8, Math.min(Math.round(r.right - w), vw - w - 8)) + 'px';
    if (mn) mn.scrollTop = rolou;
  }

  function aberto() { return !!document.querySelector(POP); }
  function abrir(gat, como) { // como: 'mouse' | 'toque' | 'teclado' | 'ultimo'
    if (atual) fechar({ foco: false });
    langAberto = false;
    if (L() && L().painelAberto && L().painelAberto()) L().fecharPainel();
    var folha = ehFolha();
    var pop = el('div', 'mc-pop'); pop.id = 'mc-pop'; pop.setAttribute('data-modo', folha ? 'folha' : 'popover'); pop.setAttribute('data-lado', 'baixo');
    pop._assin = assinatura();
    pop._atualizar = function () { var a = assinatura(); if (a !== pop._assin) { pop._assin = a; montar(pop, gat); if (window.IngressePrefs) window.IngressePrefs.atualizar(); posicionar(pop, gat); } };
    montar(pop, gat);
    var scrim = null;
    if (folha) { scrim = el('div', 'mc-scrim'); scrim.setAttribute('aria-hidden', 'true'); root.appendChild(scrim); }
    root.appendChild(pop);
    atual = { pop: pop, scrim: scrim, gat: gat, folha: folha };
    if (window.IngressePrefs) window.IngressePrefs.atualizar(); // marca o idioma e as opções de desenvolvedor já escolhidos (o menu precisa estar no documento)
    if (folha) { document.body.inert = true; root.style.overflow = 'hidden'; }
    posicionar(pop, gat);
    gat.setAttribute('aria-expanded', 'true'); gat.setAttribute('aria-controls', 'mc-pop');
    var menu = pop.querySelector('.mc-menu'), its = visitaveis(pop);
    if (como === 'teclado') focar(its[0]); else if (como === 'ultimo') focar(its[its.length - 1]); else menu.focus({ preventScroll: true });
    // eventos do menu aberto
    pop.addEventListener('keydown', teclas);
    pop.addEventListener('click', clique);
    pop.addEventListener('pointermove', function (e) { // o destaque segue o ponteiro (só quando o último gesto foi do mouse)
      if (e.pointerType === 'touch') return;
      var i = e.target.closest && e.target.closest('[role="menuitem"], [role="menuitemradio"]');
      if (i && document.activeElement !== i) i.focus({ preventScroll: true });
    });
    pop.addEventListener('focusout', function (e) {
      if (!atual || atual.pop !== pop || atual.folha) return;
      var p = e.relatedTarget;
      if (p && !pop.contains(p) && p !== gat) fechar({ foco: false });
    });
  }
  function fechar(o) {
    o = o || {};
    if (!atual) return;
    var a = atual; atual = null;
    var d = reduzido() ? 0 : a.folha ? ms('--motion-duration-fast', 160) : ms('--motion-duration-instant', 80);
    [a.pop, a.scrim].forEach(function (n) {
      if (!n) return;
      if (!d) { n.remove(); return; }
      n.removeAttribute('id'); n.setAttribute('data-saindo', 'true'); n.setAttribute('aria-hidden', 'true'); n.setAttribute('inert', '');
      setTimeout(function () { n.remove(); }, d + 20);
    });
    if (a.folha) { document.body.inert = false; root.style.overflow = ''; }
    a.gat.setAttribute('aria-expanded', 'false'); a.gat.removeAttribute('aria-controls');
    if (o.foco !== false && document.contains(a.gat)) a.gat.focus();
  }

  /* ---------- teclado dentro do menu ---------- */
  function mover(its, atualEl, passo) {
    var i = its.indexOf(atualEl); // sem dar a volta: no fim da lista para
    var j = i < 0 ? (passo > 0 ? 0 : its.length - 1) : Math.max(0, Math.min(its.length - 1, i + passo));
    focar(its[j]);
  }
  function teclas(e) {
    if (!atual) return;
    var pop = atual.pop, its = visitaveis(pop), cur = document.activeElement, k = e.key;
    var noDev = cur && cur.closest && cur.closest('.mc-dev-in');
    var naLingua = cur && cur.classList && cur.classList.contains('mc-lang-op'), noBotaoLingua = cur && cur.classList && cur.classList.contains('mc-lang-b');
    if (k === 'ArrowDown') { e.preventDefault(); mover(its, cur, 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); mover(its, cur, -1); }
    else if (k === 'ArrowRight' && noBotaoLingua) { e.preventDefault(); alternarIdioma(true, true); } // → abre o grupo de idiomas e foca o escolhido (convenção de submenu)
    else if (k === 'ArrowLeft' && naLingua) { e.preventDefault(); alternarIdioma(false); var bl = pop.querySelector('.mc-lang-b'); if (bl) focar(bl); } // ← fecha e volta ao item «Idioma»
    else if (k === 'ArrowRight' && noDev) { e.preventDefault(); mover(its, cur, 1); }
    else if (k === 'ArrowLeft' && noDev) { e.preventDefault(); mover(its, cur, -1); }
    else if (k === 'Home') { e.preventDefault(); focar(its[0]); }
    else if (k === 'End') { e.preventDefault(); focar(its[its.length - 1]); }
    else if (k === 'Enter' || k === ' ') { if (cur && cur.closest && cur.closest('[role^="menuitem"]')) { e.preventDefault(); cur.click(); } }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar({ foco: true }); }
    else if (k === 'Tab') {
      if (atual.folha) { // folha modal: o foco fica preso (botão de fechar e lista)
        e.preventDefault();
        var fx = pop.querySelector('.mc-fechar'), emFx = cur === fx;
        if (emFx) focar(e.shiftKey ? its[its.length - 1] : its[0]); else fx.focus();
      } else { atual.gat.focus(); fechar({ foco: false }); } // popover: um só ponto de tabulação; o foco volta ao gatilho e o Tab segue dali
    }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { // digitar letras salta ao item que começa por elas (1 s entre teclas)
      var t = Date.now(); if (t - digitadoT > 1000) digitado = ''; digitadoT = t; digitado += k.toLowerCase();
      var txt = function (i) { return (i.getAttribute('data-mc-tx') || i.textContent || '').trim().toLowerCase(); };
      var ordem = its.slice(Math.max(0, its.indexOf(cur) + (digitado.length === 1 ? 1 : 0))).concat(its);
      var achou = ordem.filter(function (i) { return txt(i).indexOf(digitado) === 0; })[0];
      if (achou) { e.preventDefault(); focar(achou); }
    }
  }

  function alternarIdioma(abre, focarEscolhido) { // abre ou fecha o grupo de idiomas dentro do menu
    if (!atual) return;
    var g = atual.pop.querySelector('.mc-idiomas'), b = atual.pop.querySelector('.mc-lang-b'); if (!g || !b) return;
    langAberto = !!abre; g.hidden = !abre; b.setAttribute('aria-expanded', String(!!abre));
    posicionar(atual.pop, atual.gat);
    if (abre && focarEscolhido) focar(g.querySelector('[aria-checked="true"]') || g.querySelector('[role="menuitemradio"]'));
  }

  /* ---------- clique nos itens ---------- */
  function clique(e) {
    var i = e.target.closest ? e.target.closest('[role="menuitem"], [role="menuitemradio"], [data-mc-fechar]') : null;
    if (!i || !atual) return;
    var gat = atual.gat;
    if (i.hasAttribute('data-mc-fechar')) { fechar({ foco: true }); return; }
    var acao = i.getAttribute('data-mc-acao');
    if (acao === 'notificacoes') {
      e.preventDefault();
      fechar({ foco: false });
      if (L() && L().abrirPainel) L().abrirPainel(gat); // o painel que já existe, ancorado ao avatar; abrir o painel é que marca as novas como vistas
      return;
    }
    if (acao === 'dev') {
      e.preventDefault();
      var di = atual.pop.querySelector('.mc-dev-in'), abre = di.hidden;
      di.hidden = !abre; i.setAttribute('aria-expanded', String(abre));
      posicionar(atual.pop, gat);
      return;
    }
    if (acao === 'sair') {
      e.preventDefault();
      var l = L(); if (l && l.definirConta) l.definirConta(false);
      fechar({ foco: true });
      if (window.IX && IX.toast) IX.toast(T.saiu, 'info'); // MC-17
      if (arquivoAtual() === 'Carteira.dc.html') location.href = 'Main.dc.html';
      return;
    }
    if (acao === 'idioma') { e.preventDefault(); alternarIdioma(!langAberto, e.detail === 0) /* teclado (Enter/Espaço: clique sem ponteiro) leva o foco ao idioma escolhido */; return; }
    if (i.hasAttribute('data-pv-lang')) { // o previa.js aplica e guarda (ouve o clique no documento); aqui o item «Idioma» passa a mostrar o novo, o grupo fecha e o foco volta a ele
      var d = idiomas().filter(function (x) { return x[0] === i.getAttribute('data-pv-lang'); })[0], bt = atual.pop.querySelector('.mc-lang-b');
      if (d && bt) {
        bt.setAttribute('aria-label', T.idioma + ': ' + d[2]);
        var n = bt.querySelector('.mc-lang-n'), f = bt.querySelector('.rp-band'); if (n) n.textContent = d[2]; if (f) f.src = './assets/flags/' + d[4] + '.svg';
        var ops = atual.pop.querySelectorAll('.mc-lang-op'); for (var q = 0; q < ops.length; q++) ops[q].setAttribute('aria-checked', String(ops[q] === i));
        alternarIdioma(false); focar(bt);
      }
      return; // o menu continua aberto
    }
    if (i.getAttribute('role') === 'menuitemradio') return; // opções de desenvolvedor: o previa.js aplica; o menu continua aberto
    if (i.hasAttribute('data-mc-sem-destino')) { e.preventDefault(); fechar({ foco: true }); return; } // áreas que ainda não têm tela no protótipo
    if (i.tagName === 'A' && i.getAttribute('aria-current') === 'page') { e.preventDefault(); fechar({ foco: true }); return; }
    fechar({ foco: false }); // item de navegação: segue o link
  }

  /* ---------- gatilho: abrir e fechar ---------- */
  document.addEventListener('pointerdown', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    ultimoInput = e.pointerType || 'mouse';
    var gat = t.closest('[data-menu-conta]');
    if (gat) {
      if (e.pointerType === 'mouse' && e.button === 0) { // o mouse abre ao pressionar, sem item destacado
        suprimeClique = true; setTimeout(function () { suprimeClique = false; }, 600);
        e.preventDefault();
        alternar(gat, 'mouse');
      }
      return;
    }
    if (atual && !t.closest('.mc-pop')) { // clique fora: só fecha, não age na página
      var alvo = t;
      fechar({ foco: !!atual.folha }); // folha modal: o foco volta ao avatar; popover: fica onde a pessoa clicou
      var engole = function (ev) { if (alvo.contains(ev.target) || ev.target.contains(alvo)) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); } window.removeEventListener('click', engole, true); };
      window.addEventListener('click', engole, true); // na janela: roda antes dos ouvintes de captura do documento (a transição entre telas navega neles)
      setTimeout(function () { window.removeEventListener('click', engole, true); }, 700);
    }
  }, true);
  function alternar(gat, como) {
    if (atual) { fechar({ foco: false }); gat.focus(); return; }
    var l = L();
    if (l && l.painelAberto && l.painelAberto()) { l.fecharPainel(); return; }
    abrir(gat, como);
  }
  document.addEventListener('click', function (e) {
    var gat = e.target && e.target.closest ? e.target.closest('[data-menu-conta]') : null;
    if (!gat) return;
    e.preventDefault(); e.stopPropagation();
    if (suprimeClique) { suprimeClique = false; return; }
    alternar(gat, ultimoInput === 'touch' || ultimoInput === 'pen' ? 'toque' : 'teclado'); // toque e leitor de tela/teclado (clique sem ponteiro) abrem; o primeiro item só no teclado
    ultimoInput = 'mouse';
  }, true);
  document.addEventListener('keydown', function (e) {
    var gat = e.target && e.target.closest ? e.target.closest('[data-menu-conta]') : null;
    if (!gat) return;
    ultimoInput = 'teclado';
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!atual) abrir(gat, e.key === 'ArrowUp' ? 'ultimo' : 'teclado'); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && atual) { e.stopPropagation(); fechar({ foco: true }); } }, true); // Esc fecha de qualquer ponto e devolve o foco ao avatar
  window.addEventListener('resize', function () {
    if (!atual) return;
    if (ehFolha() !== atual.folha) fechar({ foco: false }); else posicionar(atual.pop, atual.gat);
  });
  window.addEventListener('scroll', function (e) { if (atual && !atual.folha && !(e.target && e.target.nodeType === 1 && atual.pop.contains(e.target))) posicionar(atual.pop, atual.gat); }, true); // rolar a lista do menu não reposiciona

  /* a Carteira publica quantos ingressos tem (o item «Carteira» do menu mostra o contador em qualquer tela; sem a Carteira, o valor padrão) */
  function definirIngressos(n) { try { if (window.IX && IX.store && IX.store.get('contaIngressos', null) !== n) IX.store.set('contaIngressos', n); } catch (e) {} return n; }
  window.IngresseConta = { definirIngressos: definirIngressos, abrir: function (g) { abrir(g || document.querySelector('[data-menu-conta]'), 'teclado'); }, fechar: function () { fechar({ foco: true }); }, aberto: aberto, sincronizar: sincronizar };

  /* ---------- engrenagem do protótipo: grupo «Conta e notificações» (relógio, conta, +N novas) ---------- */
  var SIM_HTML = '<div class="over" data-mc-sim>Conta e notificações</div>' +
    '<p class="proto-agora" data-mc-sim-agora></p>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="agora">Agora</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="+1min">+1 min</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="faltar">Faltar 10 s</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="abrir">Abrir</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="com" aria-pressed="false">Com conta</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="sem" aria-pressed="false">Sem conta</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="n1">+1 nova</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="n3">+3 novas</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="n12">+12 novas</button>' +
    '<button type="button" class="chip chip-sm" data-mc-sim-acao="limpar">Limpar notificações</button>';
  function proximaAbertura() { // o próximo lembrete que ainda não abriu
    var l = L(); if (!l) return null;
    var t = l.agora(), a = l.lista().filter(function (x) { return l.liberaEm(x) > t; }).sort(function (x, y) { return l.liberaEm(x) - l.liberaEm(y); });
    return a[0] || null;
  }
  function simular(acao) {
    var l = L(); if (!l) return;
    var r = l.relogio, p = proximaAbertura();
    if (acao === 'agora') r.reiniciar();
    else if (acao === '+1min') r.avancar(60000);
    else if (acao === 'faltar' && p) r.ajustarPara(l.liberaEm(p) - 10000);
    else if (acao === 'abrir' && p) r.ajustarPara(l.liberaEm(p) + 1000);
    else if (acao === 'com') l.definirConta(true);
    else if (acao === 'sem') l.definirConta(false);
    else if (acao === 'n1') l.simularNovas(1);
    else if (acao === 'n3') l.simularNovas(3);
    else if (acao === 'n12') l.simularNovas(12);
    else if (acao === 'limpar') l.limpar();
    sincronizar(); pintarSim();
  }
  function pintarSim() {
    var l = L(); if (!l) return;
    var c = !!l.conta(), p = proximaAbertura();
    document.querySelectorAll('[data-mc-sim-acao]').forEach(function (b) {
      var a = b.getAttribute('data-mc-sim-acao');
      if (a === 'com') b.setAttribute('aria-pressed', String(c)); else if (a === 'sem') b.setAttribute('aria-pressed', String(!c));
      else if (a === 'faltar' || a === 'abrir') b.setAttribute('aria-disabled', String(!p));
    });
    document.querySelectorAll('[data-mc-sim-agora]').forEach(function (n) { var t = 'Agora: ' + l.momento(l.agora()); if (n.textContent !== t) n.textContent = t; });
  }
  function engrenagem() { // acrescenta o grupo à engrenagem existente ou cria a engrenagem (as 9 telas com avatar têm uma só)
    if (!document.querySelector('[data-menu-conta]') || !document.body) return;
    var dentro = document.querySelector('.proto .proto-in');
    if (!dentro) {
      if (document.querySelector('.proto')) return;
      var d = el('details', 'proto'); d.setAttribute('data-mc-engrenagem', '');
      d.innerHTML = '<summary>Simulação</summary><div class="proto-in" role="group" aria-label="Simulação"></div>';
      document.body.appendChild(d); dentro = d.querySelector('.proto-in');
    }
    if (dentro.querySelector('[data-mc-sim]')) return;
    var f = document.createElement('div'); f.style.display = 'contents'; f.setAttribute('data-mc-sim-grupo', ''); f.innerHTML = SIM_HTML;
    dentro.insertBefore(f, dentro.firstChild); pintarSim(); // no começo: é o grupo de todas as telas; o das paradas e da turnê (Coleção) vem depois
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-mc-sim-acao]') : null;
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault(); e.stopPropagation(); simular(b.getAttribute('data-mc-sim-acao'));
  }, true);

  /* ---------- início: o motor de templates refaz partes do corpo; o estado do gatilho é reposto a cada mudança (barato: só escreve se mudou) ---------- */
  function iniciar() {
    sincronizar(); engrenagem();
    new MutationObserver(function () { agendar(); engrenagem(); }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('previa:lembretes', function () { sincronizar(); pintarSim(); });
    setInterval(function () { sincronizar(); pintarSim(); }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
