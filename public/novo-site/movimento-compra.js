/* movimento-compra.js: camada de movimento da compra (Isadora Nogueira, 26/10/2026).
   Fonte: tools/previa/movimento-compra.js; o gerador copia para previa/movimento-compra.js. Carregado por último, depois do previa.js.
   Documento: docs/design/MOVIMENTO-EVENTO-COMPRA.md. As regras sem script (sticky, teto do resumo, portão) estão em movimento-compra.css.

   Faz três coisas, só nas telas Evento, Ingressos e Checkout:
   1. Transição entre telas do fluxo, sem corte seco: a tela que sai se despede em 160 ms (opacidade e 8 px de deslocamento) e a que chega
      entra em 280 ms (16 px), com escalonamento de 40 ms entre os blocos. Ingressos <-> Quem vai (checkout) <-> Como pagar (pagamento) é um eixo horizontal (etapa 1 -> 2 -> 3 -> 4);
      Evento <-> Ingressos é vertical. O resumo não sai nem entra entre Ingressos e Checkout: ele fica e só muda de altura.
      Também esconde o flash sem estilo da chegada (portão em CSS) e respeita movimento reduzido.
   2. Resumo vivo (Ingressos, Checkout e o cartão de compra do Evento): linhas que entram aparecem, linhas que saem se despedem, o resto
      desliza para o novo lugar, a altura do cartão anima e o valor que troca entra sem pulo (o antigo sai, o novo entra).
   3. Teto do resumo grudado: se o cartão é mais alto que a janela, o topo fica negativo e o fim do cartão permanece à vista.

   Só anima transform e opacity, com uma exceção deliberada: a altura do cartão do resumo (um elemento, 280 ms, subárvore pequena).
   Tudo lê os tokens motion.* de :root; em movimento reduzido (prefers-reduced-motion ou data-motion="reduce") os tokens valem 0 e nada anima. */
(function () {
  // o motor de templates do v5.3 pode executar o <script> da helmet duas vezes
  if (window.__movCompraCarregado) return;
  window.__movCompraCarregado = true;

  var root = document.documentElement;
  var ORDEM = { evento: 0, ingressos: 1, checkout: 2, pagamento: 3 };
  var pagina = root.getAttribute('data-pagina');
  if (!(pagina in ORDEM)) return;

  var CHAVE = 'mov:de'; // sessionStorage: de onde o visitante veio e o que a tela anterior deixou (altura do resumo)
  var VALIDADE = 6000; // ms: depois disso a "origem" é de outra visita
  var FLUXO = /\/(Evento|Ingressos|Checkout|Pagamento)\.dc\.html$/;
  var NOME_PAGINA = { Evento: 'evento', Ingressos: 'ingressos', Checkout: 'checkout', Pagamento: 'pagamento' };

  /* ---------- tokens (motion.* de :root). Em movimento reduzido valem 0: as funções devolvem 0 e nada anima ---------- */
  function tok(nome) { return getComputedStyle(root).getPropertyValue(nome).trim(); }
  function num(nome, padrao) {
    var v = tok(nome);
    if (v === '') return padrao;
    var x = parseFloat(v);
    if (isNaN(x)) return padrao;
    return /ms$/.test(v) ? x : /s$/.test(v) ? x * 1000 : x;
  }
  function T() {
    return {
      fast: num('--motion-duration-fast', 160), base: num('--motion-duration-base', 280), slow: num('--motion-duration-slow', 480),
      stagger: num('--motion-stagger', 40),
      sm: num('--motion-distance-sm', 8), md: num('--motion-distance-md', 16), lg: num('--motion-distance-lg', 32),
      enter: tok('--motion-ease-enter') || 'cubic-bezier(.2,.7,.2,1)',
      exit: tok('--motion-ease-exit') || 'cubic-bezier(.4,0,1,1)',
      move: tok('--motion-ease-move') || 'cubic-bezier(.4,0,.2,1)'
    };
  }
  var mqReduzido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mqReduzido.matches || root.getAttribute('data-motion') === 'reduce'; }
  var temWAAPI = typeof Element !== 'undefined' && !!Element.prototype.animate;

  var vivas = []; // animações de transição de tela (para limpar ao voltar do bfcache)
  function anima(el, quadros, opcoes, guardar) {
    if (!el || !temWAAPI || !(opcoes.duration > 0)) return null;
    var a = el.animate(quadros, opcoes);
    if (guardar) vivas.push(a);
    return a;
  }
  function translada(dx, dy) { return 'translate(' + dx + 'px,' + dy + 'px)'; }

  /* ---------- estrutura da página montada ---------- */
  function ancora() { return document.querySelector('#dc-root > .sc-host') || document.getElementById('dc-root'); }
  function embrulho() { var h = ancora(); return h ? h.firstElementChild : null; }
  function partes() {
    var w = embrulho();
    var p = { wrap: w, hdr: null, container: null, main: null, aside: null, hero: null };
    if (!w) return p;
    p.hdr = w.querySelector(':scope > .hdr');
    p.hero = w.querySelector(':scope > .ev-hero');
    var cs = w.querySelectorAll(':scope > div');
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].matches('.cbar, .mbar')) continue;
      if (cs[i].querySelector(':scope > main')) { p.container = cs[i]; break; }
    }
    if (p.container) {
      p.main = p.container.querySelector(':scope > main');
      p.aside = p.container.querySelector(':scope > aside');
    }
    return p;
  }
  function cartaoDe(aside) { return aside ? aside.querySelector(':scope > .card') : null; }

  /* ---------- origem guardada pela tela anterior ---------- */
  function lerOrigem() {
    try {
      var j = sessionStorage.getItem(CHAVE);
      if (!j) return null;
      sessionStorage.removeItem(CHAVE); // vale uma vez
      var o = JSON.parse(j);
      if (!o || !ORDEM.hasOwnProperty(o.p) || Date.now() - o.t > VALIDADE || o.p === pagina) return null;
      return o;
    } catch (e) { return null; }
  }
  function gravarOrigem(h) {
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ p: pagina, t: Date.now(), h: h || 0 })); } catch (e) {}
  }
  function ehPasso(a, b) { return Math.abs(ORDEM[a] - ORDEM[b]) === 1 && a !== 'evento' && b !== 'evento'; } // Ingressos, Quem vai (checkout) e Como pagar (pagamento): eixo horizontal

  /* =============================================================================================================
     1a. SAÍDA: acontece na tela que está indo embora, antes de navegar
     ============================================================================================================= */
  var saindo = false;
  var contornar = false;

  function alvosDeSaida(destino) {
    var p = partes(), a = [];
    if (!p.wrap) return a;
    if (pagina === 'evento') {
      if (p.hdr) a.push(p.hdr);
      if (p.hero) a.push(p.hero);
      if (p.container) a.push(p.container);
      var ef = p.wrap.querySelector(':scope > #ef-root'); // página de confronto de futebol: a tela de verdade é a #ef-root (o hero e o corpo originais ficam escondidos)
      if (ef) a.push(ef);
    } else {
      if (p.hdr) a.push(p.hdr);
      if (p.main) a.push(p.main);
      if (p.aside) a.push(p.aside);
    }
    return a;
  }

  function sair(destino) {
    var t = T();
    var alvos = alvosDeSaida(destino);
    var p = partes();
    var cartao = cartaoDe(p.aside);
    gravarOrigem(cartao ? cartao.getBoundingClientRect().height : 0);
    if (!alvos.length || !(t.fast > 0) || !temWAAPI) return Promise.resolve();
    var avanca = ORDEM[destino] > ORDEM[pagina];
    var horizontal = ehPasso(pagina, destino);
    var d = avanca ? -t.sm : t.sm;
    var dx = horizontal ? d : 0, dy = horizontal ? 0 : d;
    var iniciou = false;
    alvos.forEach(function (el) {
      var soOpacidade = el.matches('.hdr'); // a barra do cabeçalho não anda: só some e volta
      var a = anima(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: soOpacidade ? 'none' : translada(dx, dy) }], { duration: t.fast, easing: t.exit, fill: 'forwards' }, true);
      if (a) iniciou = true;
    });
    // a navegação começa na metade da saída: a rede e a montagem da próxima tela correm por baixo do esmaecer (a nova tela só pinta
    // depois do portão, com tudo em opacidade 0, então não há corte mesmo que ela chegue antes do fim da saída)
    return iniciou ? new Promise(function (ok) { setTimeout(ok, Math.round(t.fast * 0.5)); }) : Promise.resolve();
  }

  function destinoDoFluxo(urlStr) {
    try {
      var u = new URL(urlStr, location.href);
      if (u.origin !== location.origin) return null;
      var m = FLUXO.exec(u.pathname);
      if (!m) return null;
      var d = NOME_PAGINA[m[1]];
      return d === pagina ? null : d;
    } catch (e) { return null; }
  }

  if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigate', function (e) {
      if (contornar) { contornar = false; return; }
      if (saindo || !e.cancelable || e.hashChange || e.downloadRequest !== null || e.formData) return;
      if (e.navigationType !== 'push' && e.navigationType !== 'replace') return;
      if (reduzido()) return;
      var destino = destinoDoFluxo(e.destination.url);
      if (!destino) return;
      var url = e.destination.url;
      e.preventDefault();
      saindo = true;
      sair(destino).then(function () {
        contornar = true;
        location.href = url;
      });
    });
  }

  /* voltar do cache de páginas (botão Voltar do navegador): a tela volta como estava ao sair, ou seja, apagada */
  window.addEventListener('pageshow', function (e) {
    saindo = false;
    contornar = false;
    if (!e.persisted) return;
    vivas.forEach(function (a) { try { a.cancel(); } catch (x) {} });
    vivas = [];
    entrar(null, true);
  });

  /* =============================================================================================================
     1b. ENTRADA: acontece na tela que chega, assim que está montada, estilizada e com a fonte pronta
     ============================================================================================================= */
  function alvosDeEntrada(origem) {
    var p = partes(), a = [];
    if (!p.wrap) return a;
    var i, filhos;
    if (pagina === 'evento') {
      // o pôster do hero é o LCP e nunca anima: só o texto do hero e o que está abaixo
      if (p.hdr) a.push({ el: p.hdr, so: 'opacidade', n: 0 });
      var info = p.wrap.querySelector('.ev-hero-info');
      if (info) a.push({ el: info, n: 0 });
      var tm = p.wrap.querySelector('.ev-title-m');
      if (tm) a.push({ el: tm, n: 1 });
      if (p.main) {
        filhos = p.main.children;
        for (i = 0; i < filhos.length && i < 3; i++) if (!filhos[i].matches('.ev-title-m')) a.push({ el: filhos[i], n: Math.min(i + 1, 4) });
      }
      if (p.aside) a.push({ el: p.aside, n: 2 });
      return a;
    }
    if (p.hdr) a.push({ el: p.hdr, so: 'opacidade', n: 0 });
    if (p.main) {
      filhos = p.main.children;
      for (i = 0; i < filhos.length; i++) a.push({ el: filhos[i], n: Math.min(i, 4) });
    }
    if (p.aside) a.push({ el: p.aside, n: 2 });
    return a;
  }

  function entrar(origem, rapido) {
    var t = T();
    if (!temWAAPI || !(t.base > 0)) return;
    var passo = origem && ehPasso(origem.p, pagina);
    var avanca = !origem || ORDEM[pagina] > ORDEM[origem.p];
    var d = avanca ? t.md : -t.md;
    var dx = passo ? d : 0, dy = passo ? 0 : (avanca ? t.md : -t.sm);
    var lista = alvosDeEntrada(origem);
    lista.forEach(function (it) {
      var atraso = rapido ? 0 : it.n * t.stagger;
      var quadros = it.so === 'opacidade'
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: translada(dx, dy) }, { opacity: 1, transform: 'none' }];
      anima(it.el, quadros, { duration: it.so === 'opacidade' ? t.fast : t.base, delay: atraso, easing: t.enter, fill: 'backwards' }, true);
    });
  }

  /* ---------- portão: espera montar, estilos e fonte; depois libera e entra ---------- */
  // theme, base, ux e ds vêm do v5.3 e a identidade por último; o motor de templates os (re)insere no <head> depois de montar,
  // então só vale quando todos existem, carregaram e a lista parou de mudar (senão aparece o v5.3 sem a identidade por 1 ou 2 quadros)
  var ESPERADOS = ['theme.css', 'base.css', 'ux.css', 'ds.css', 'identidade-v1.css'];
  var assinatura = '', desde = 0;
  function estilosProntos() {
    var ls = document.querySelectorAll('link[rel="stylesheet"]');
    var achados = {}, i, j, sig = '';
    for (i = 0; i < ls.length; i++) {
      if (!ls[i].sheet) return false;
      for (j = 0; j < ESPERADOS.length; j++) if (ls[i].href.indexOf(ESPERADOS[j]) > -1) achados[ESPERADOS[j]] = true;
      sig += ls[i].href + '|';
    }
    for (j = 0; j < ESPERADOS.length; j++) if (!achados[ESPERADOS[j]]) return false;
    if (!tok('--motion-duration-base')) return false; // tokens da identidade já valem
    if (sig !== assinatura) { assinatura = sig; desde = Date.now(); return false; }
    return Date.now() - desde >= 40;
  }
  function montada() {
    var w = embrulho();
    return !!w && w.children.length >= 2 && !!w.querySelector('.hdr');
  }

  function iniciarChegada() {
    var origem = lerOrigem();
    // o Evento só ganha o portão e a entrada quando se chega do fluxo (o resto do site não é desta camada)
    var usaPortao = pagina !== 'evento' || !!origem;
    var liberada = false;
    function liberar(animar) {
      if (liberada) return;
      liberada = true;
      if (animar && usaPortao) entrar(origem, false);
      root.removeAttribute('data-mov-gate');
      var pg = document.getElementById('mov-portao');
      if (pg) pg.remove();
      iniciarResumo();
    }
    if (!usaPortao) { aguardar(function () { liberar(false); }, 1500); return; }
    // a regra do portão é inline de propósito: identidade-v1.css chega depois do primeiro quadro com conteúdo e não serviria
    var portao = document.createElement('style');
    portao.id = 'mov-portao';
    portao.textContent = 'html[data-mov-gate] #dc-root{visibility:hidden}';
    document.head.appendChild(portao);
    root.setAttribute('data-mov-gate', '');
    var limite = Date.now() + 1500;
    (function tentar() {
      if (liberada) return;
      if (montada() && estilosProntos()) {
        var pronto = function () { requestAnimationFrame(function () { liberar(true); }); setTimeout(function () { liberar(true); }, 120); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(pronto, pronto); else pronto();
        return;
      }
      if (Date.now() > limite) { liberar(false); return; }
      setTimeout(tentar, 24);
    })();
    setTimeout(function () { liberar(false); }, 1600); // rede de segurança: a página nunca fica escondida
  }
  function aguardar(fn, limiteMs) {
    var fim = Date.now() + limiteMs;
    (function t() { if (montada()) fn(); else if (Date.now() < fim) setTimeout(t, 40); })();
  }

  /* =============================================================================================================
     2. RESUMO VIVO: o cartão do resumo (Ingressos, Checkout) e o de compra (Evento) reagem ao conteúdo que muda
     ============================================================================================================= */
  var observados = []; // [{ card, aside, mo, snap, animAltura }]

  function relativo(el, card) {
    var top = 0, left = 0, n = el;
    while (n && n !== card) { top += n.offsetTop; left += n.offsetLeft; n = n.offsetParent; }
    return n === card ? { top: top, left: left, w: el.offsetWidth, h: el.offsetHeight } : null;
  }
  function tirarFoto(card) {
    var m = new Map();
    var filhos = card.children, i, j, f, g;
    for (i = 0; i < filhos.length; i++) {
      f = filhos[i];
      if (f.classList.contains('mov-ghost-bloco')) continue;
      var r = relativo(f, card);
      if (r) m.set(f, r);
      for (j = 0; j < f.children.length; j++) { g = f.children[j]; var s = relativo(g, card); if (s) m.set(g, s); }
    }
    return m;
  }
  function alturaNatural(card) { return card.scrollHeight + (card.offsetHeight - card.clientHeight); }
  function translacaoAtual(el) {
    var m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform || '');
    return m ? parseFloat(m[1].split(',')[5]) || 0 : 0;
  }
  function dentroDe(no, sel, limite) {
    var el = no.nodeType === 1 ? no : no.parentElement;
    var c = el && el.closest ? el.closest(sel) : null;
    return c && limite.contains(c) ? c : null;
  }

  function fantasma(no) { return no.classList.contains('mov-ghost') || no.classList.contains('mov-ghost-bloco'); }

  function atualizarTopo(o) {
    if (!o.aside || pagina === 'evento') return;
    var natural = alturaNatural(o.card);
    var topo = Math.min(96, Math.round(window.innerHeight - natural - 24));
    o.aside.style.setProperty('--resumo-top', topo + 'px');
  }

  function valorTrocou(span, antes) {
    var t = T();
    var depois = span.textContent;
    if (antes === depois) return;
    var total = span.closest('.total');
    if (total && t.base > 0) {
      var g = document.createElement('span');
      g.className = 'mov-ghost';
      g.setAttribute('aria-hidden', 'true');
      g.textContent = antes;
      total.appendChild(g);
      anima(g, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' }).finished.then(function () { g.remove(); }, function () { g.remove(); });
      span.style.display = 'inline-block';
      var a = anima(span, [{ opacity: 0, transform: translada(0, t.sm) }, { opacity: 1, transform: 'none' }], { duration: t.base, easing: t.enter, fill: 'backwards' });
      if (a) a.finished.then(function () { span.style.display = ''; }, function () { span.style.display = ''; });
      else span.style.display = '';
    } else {
      anima(span, [{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' });
    }
  }

  function lote(o, registros) {
    var t = T();
    var card = o.card;
    if (!card.isConnected) return;
    var antes = o.snap;
    var meus = [];
    var novos = [], saiu = [], textos = [];
    var relevante = false;
    registros.forEach(function (r) {
      var i, no;
      if (r.type === 'childList') {
        // o que este script mesmo insere e remove (fantasmas) não conta
        for (i = 0; i < r.addedNodes.length && !relevante; i++) if (r.addedNodes[i].nodeType !== 1 || !fantasma(r.addedNodes[i])) relevante = true;
        for (i = 0; i < r.removedNodes.length && !relevante; i++) if (r.removedNodes[i].nodeType !== 1 || !fantasma(r.removedNodes[i])) relevante = true;
        for (i = 0; i < r.addedNodes.length; i++) {
          no = r.addedNodes[i];
          if (no.nodeType === 1 && !fantasma(no) && (no.classList.contains('hold') || !dentroDe(no, '.hold', card))) novos.push(no);
        }
        for (i = 0; i < r.removedNodes.length; i++) {
          no = r.removedNodes[i];
          if (no.nodeType === 1 && !fantasma(no) && antes.has(no)) saiu.push(no);
        }
      } else if (r.type === 'characterData') {
        var span = r.target.parentElement;
        if (span && !dentroDe(span, '.hold', card)) relevante = true; // o relógio da reserva (1 Hz) não conta
        if (span && span.classList.contains('sc-interp') && !dentroDe(span, '.hold, .trust', card)) textos.push({ span: span, antes: r.oldValue });
      }
    });
    if (!relevante) return;

    /* 1. medir: altura visual de agora (pode estar no meio de uma animação) e a natural, depois de cancelar a animação de altura */
    // (a altura "de antes" não se mede agora, o React já mudou o layout: vem da última medição, ou do quadro em curso se havia animação)
    var visual = o.animAltura ? card.getBoundingClientRect().height : o.altura;
    var translacoes = new Map();
    Array.prototype.forEach.call(card.children, function (f) { translacoes.set(f, translacaoAtual(f)); });
    if (o.animAltura) { o.animAltura.cancel(); o.animAltura = null; }
    var natural = card.offsetHeight;
    o.altura = natural;
    var depois = tirarFoto(card);

    if (t.base > 0 && temWAAPI) {
      /* 2. blocos que continuam e mudaram de lugar deslizam (FLIP, só transform) */
      Array.prototype.forEach.call(card.children, function (f) {
        var a = antes.get(f), b = depois.get(f);
        if (!a || !b || novos.indexOf(f) > -1) return;
        var delta = a.top + (translacoes.get(f) || 0) - b.top;
        if (Math.abs(delta) > 0.5) anima(f, [{ transform: translada(0, delta) }, { transform: 'none' }], { duration: t.base, easing: t.move });
      });
      /* 3. blocos e linhas novos entram */
      var jaEntrou = [];
      novos.forEach(function (no) {
        for (var k = 0; k < jaEntrou.length; k++) if (jaEntrou[k].contains(no)) return;
        if (!no.isConnected) return;
        jaEntrou.push(no);
        // se algo está saindo, o novo espera meio "fast" para os dois textos não se sobreporem
        anima(no, [{ opacity: 0, transform: translada(0, t.sm / 2) }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: saiu.length ? Math.round(t.fast / 2) : 0, easing: t.enter, fill: 'backwards' });
      });
      /* 4. blocos e linhas que saíram se despedem (fantasma na posição antiga) */
      saiu.forEach(function (no) {
        var r = antes.get(no);
        if (!r) return;
        var g = no.cloneNode(true);
        g.classList.add('mov-ghost-bloco');
        g.setAttribute('aria-hidden', 'true');
        g.removeAttribute('id');
        g.style.cssText += ';top:' + r.top + 'px;left:' + r.left + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
        card.appendChild(g);
        var a = anima(g, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
        if (a) a.finished.then(function () { g.remove(); }, function () { g.remove(); }); else g.remove();
        meus.push(g);
      });
      /* 5. a altura do cartão acompanha */
      if (Math.abs(visual - natural) > 1) {
        o.animAltura = card.animate([{ height: visual + 'px' }, { height: natural + 'px' }], { duration: t.base, easing: t.move });
        var av = o.animAltura;
        av.finished.then(function () { if (o.animAltura === av) o.animAltura = null; }, function () {});
      }
      /* 6. valores que trocaram */
      textos.forEach(function (x) { if (x.span.isConnected) valorTrocou(x.span, x.antes); });
    }
    atualizarTopo(o);
    o.snap = depois;
    o.mo.takeRecords(); // descarta o que o próprio script acabou de inserir (fantasmas)
  }

  function ligar(card, aside) {
    for (var i = 0; i < observados.length; i++) if (observados[i].card === card) return;
    var o = { card: card, aside: aside, mo: null, snap: tirarFoto(card), animAltura: null, altura: card.offsetHeight };
    o.mo = new MutationObserver(function (registros) { lote(o, registros); });
    o.mo.observe(card, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });
    observados.push(o);
    atualizarTopo(o);
    window.addEventListener('resize', function () { atualizarTopo(o); });
  }

  function procurarCartoes() {
    var p = partes();
    var c = cartaoDe(p.aside);
    if (c) ligar(c, p.aside);
    observados = observados.filter(function (o) { if (o.card.isConnected) return true; o.mo.disconnect(); return false; });
  }

  var agendadoProcura = false;
  function iniciarResumo() {
    procurarCartoes();
    var raiz = document.getElementById('dc-root');
    if (!raiz) return;
    new MutationObserver(function () {
      if (agendadoProcura) return;
      agendadoProcura = true;
      requestAnimationFrame(function () { agendadoProcura = false; procurarCartoes(); });
    }).observe(raiz, { childList: true, subtree: true });
    iniciarBarraMovel();
  }

  /* barra de total do celular (cbar): só o valor que troca */
  function iniciarBarraMovel() {
    var barra = document.querySelector('.cbar');
    if (!barra) return;
    new MutationObserver(function (registros) {
      registros.forEach(function (r) {
        if (r.type !== 'characterData') return;
        var span = r.target.parentElement;
        if (span && span.classList.contains('sc-interp') && r.oldValue !== r.target.nodeValue) {
          var t = T();
          anima(span, [{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' });
        }
      });
    }).observe(barra, { subtree: true, characterData: true, characterDataOldValue: true });
  }

  /* ---------- partida ---------- */
  iniciarChegada();
})();
