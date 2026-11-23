/* transicao-evento.js: do cartão de evento à página do Evento, em elemento compartilhado (Rafael Morinaga, 16/11/2026).
   Pedido do Wander: «A transição entre o clique em um card de evento e a página de evento deve ser fluida, faça uma transição mais rica que a atual.»
   Fonte: tools/previa/transicao-evento.js; o gerador (tools/previa/transicao-evento.mjs) copia para previa/ e liga como <script> SÍNCRONO no <head> de
   cada tela (precisa existir antes do primeiro quadro da tela nova e antes de movimento-navegacao.js, que carrega na helmet).

   TÉCNICA (e por que não a View Transitions API entre documentos): as telas desta prévia são montadas no navegador pelo motor de templates, 80 a 400 ms depois
   do primeiro quadro. A API entre documentos captura o estado novo no primeiro quadro: nesse instante o Evento ainda está vazio, o pôster novo não existe
   e o par «pôster do cartão -> pôster do Evento» não se forma (medido, ver o relatório). Por isso a passagem é a mesma ideia feita à mão (FLIP com clone),
   em cima da base que já existe: o padrão «poster-hero» de movimento-navegacao.js (ponte do cabeçalho, portão, fundo, regras de clique). Este arquivo
   SUBSTITUI, por dentro, as quatro funções desse padrão (guardar, saida, pronto, entrada) e acrescenta a volta; o resto do motor segue igual.

   COREOGRAFIA (tudo com os tokens motion.* de :root; em movimento reduzido os tokens valem 0 e nada anima, a navegação é a troca simples do motor):
   1. SAÍDA (tela do cartão, motion.duration.fast): o pôster do cartão e o título ficam (clones por cima) e todo o resto se despede.
   2. PASSAGEM: o motor navega; a tela nova nasce com o fundo, a ponte do cabeçalho e os mesmos clones, no mesmo lugar (sem piscada, sem tela vazia).
   3. ENTRADA (tela do Evento, motion.duration.slow, curva move): o clone do pôster cresce e se move até o lugar e o tamanho do pôster do Evento (o do cartão de compra
      no MVP, a partir de 1024 px; o do herói nas demais larguras e no modo completo) e se dissolve nele; o título do cartão acompanha até o título do herói e se
      dissolve; o fundo do herói, as informações, o cartão de compra e as seções entram em cascata (motion.stagger, no máximo 4 degraus).
   4. VOLTA (botão Voltar): a mesma coisa ao contrário. O pôster do Evento volta para o cartão de onde saiu (e o carrossel se ajusta a ele); com o cache de
      páginas (bfcache) a tela da lista volta como estava e o clone que ficou nela faz o caminho de volta.
   Só transform, opacity (e o raio e a cor de UM clone) animam; a rota por largura e altura só existe para pôster de proporção diferente da do destino.
   Duração total: 160 ms (saída) + 480 ms (entrada) = 640 ms, dentro de 400 a 700 ms. Nada aparece, some ou troca sem passagem. */
(function () {
  if (window.TransicaoEvento) return;
  var root = document.documentElement;
  var K_NAV = 'te:nav', K_ORIGEM = 'te:origem', K_VOLTA = 'te:volta';
  var VALE = 6000;        // ms: depois disso o registro é de outra visita
  var VALE_ORIGEM = 600000;
  var ESTAVEL = 32;       // ms com o destino parado (pronto): não é movimento, é a espera por layout assentado
  var EVENTO = /\/Evento\.dc\.html$/;
  var temWAAPI = typeof Element !== 'undefined' && !!Element.prototype.animate;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mq.matches || root.getAttribute('data-motion') === 'reduce' || /[?&]movimento=reduzido/.test(location.search); }
  function aqui() { return location.pathname + location.search; }
  var trilha = []; // marcos (ms desde o início desta tela): TransicaoEvento.trilha, para medir
  function marco(nome, extra) { trilha.push([nome, Math.round(performance.now()), extra]); }
  /* inspeção (só para testar): com sessionStorage «te:inspecionar» = 1 as animações da chegada ficam paradas no quadro inicial, e quem testa percorre
     document.getAnimations() (currentTime) para capturar quadros exatos. Fora disso não tem efeito. */
  function inspecionando() { try { return sessionStorage.getItem('te:inspecionar') === '1'; } catch (e) { return false; } }
  function congelar() { if (inspecionando()) document.getAnimations().forEach(function (a) { try { a.pause(); } catch (e) {} }); }
  function px(n) { return n + 'px'; }
  function translada(dx, dy) { return 'translate(' + dx + 'px,' + dy + 'px)'; }

  /* ---------- registros (sessionStorage) ---------- */
  function ler(k, vale) {
    try {
      var j = sessionStorage.getItem(k);
      if (!j) return null;
      var o = JSON.parse(j);
      if (!o || o.v !== 1 || Date.now() - o.t > vale) return null;
      return o;
    } catch (e) { return null; }
  }
  function gravar(k, o) { try { o.v = 1; o.t = Date.now(); sessionStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  function apagar(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  /* ---------- geometria ---------- */
  function visivelEm(r) { return r && r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; }
  function rv(el) { // retângulo na janela, só se o elemento está à vista (a tela nova fica com visibility:hidden no portão: o que vale é a caixa, não a visibilidade)
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return visivelEm(r) ? r : null;
  }
  function raios(cs) { return [parseFloat(cs.borderTopLeftRadius) || 0, parseFloat(cs.borderTopRightRadius) || 0, parseFloat(cs.borderBottomRightRadius) || 0, parseFloat(cs.borderBottomLeftRadius) || 0]; }
  function raiosPx(a, f) { return a.map(function (x) { return px(Math.round(x * (f || 1) * 100) / 100); }).join(' '); }
  /* posição de um elemento como centro, tamanho próprio e ângulo: o pôster do herói da Home é uma pilha de cartas giradas, e o retângulo da janela de uma carta
     girada (getBoundingClientRect) é maior que ela; só o tamanho de layout e o ângulo dos ancestrais com transform dão o clone certo */
  function giro(el) {
    var ang = 0, esc = 1;
    for (var n = el; n && n !== root; n = n.parentElement) {
      var t = getComputedStyle(n).transform;
      if (t && t !== 'none') { var m = new DOMMatrixReadOnly(t); ang += Math.atan2(m.b, m.a); esc *= Math.sqrt(m.a * m.a + m.b * m.b); }
    }
    return { ang: ang, esc: esc };
  }
  function geom(el) {
    var r = el.getBoundingClientRect(), g = giro(el), c = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    if (Math.abs(g.ang) < 0.002) { c.w = r.width; c.h = r.height; c.ang = 0; }
    else { c.w = el.offsetWidth * g.esc; c.h = el.offsetHeight * g.esc; c.ang = g.ang; }
    return c;
  }
  function zAbaixoDoCabecalho() {
    var h = document.querySelector('.hdr'), z = h ? parseInt(getComputedStyle(h).zIndex, 10) : NaN;
    return isNaN(z) ? 1 : Math.max(1, z - 1);
  }

  /* =============================================================================================================
     1. O que fica no cartão: pôster e título (medidos no clique)
     ============================================================================================================= */
  function cartaoDe(a) { return a.closest('.ev-card, article, li, .card') || a; }
  function acharImagem(a, cartao) {
    var imgs = Array.prototype.slice.call(a.querySelectorAll('img'));
    if (!imgs.length && cartao !== a) imgs = Array.prototype.slice.call(cartao.querySelectorAll('img'));
    var melhor = null;
    imgs.forEach(function (im) {
      if (im.closest('.ev-card__placa, .ev-card__fundo, .ev-card__escudo')) return; // jogo: a placa tem escudos e texto, não é um pôster
      var r = im.getBoundingClientRect();
      if (r.width < 60 || r.height < r.width * 0.9 || !visivelEm(r)) return; // pôster é retrato (ou quase quadrado)
      if (!melhor || r.width * r.height > melhor.r.width * melhor.r.height) melhor = { el: im, r: r };
    });
    return melhor;
  }
  function recorteDe(im, a) { // o elemento que recorta a imagem (a mídia do cartão): é a caixa visível do pôster
    for (var n = im.parentElement; n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return n;
      if (n === a) break;
    }
    return null;
  }
  function especificarPoster(a, cartao) {
    var p = acharImagem(a, cartao);
    if (!p) return null;
    var rec = recorteDe(p.el, a), csi = getComputedStyle(p.el), csr = rec ? getComputedStyle(rec) : csi, rr = raios(csr);
    if (!rr.some(function (v) { return v > 0; })) rr = raios(csi);
    var base = { rr: rr, src: p.el.currentSrc || p.el.src, fit: csi.objectFit, pos: csi.objectPosition, z: zAbaixoDoCabecalho() };
    var g = geom(rec || p.el);
    if (g.ang) { // carta girada: a caixa é a do recorte, no tamanho de layout, com o ângulo
      base.x = g.cx - g.w / 2; base.y = g.cy - g.h / 2; base.w = g.w; base.h = g.h; base.ang = g.ang;
      return base;
    }
    var ri = p.r, rc = rec ? rec.getBoundingClientRect() : ri;
    var x0 = Math.max(ri.left, rc.left), y0 = Math.max(ri.top, rc.top), x1 = Math.min(ri.right, rc.right), y1 = Math.min(ri.bottom, rc.bottom);
    if (x1 - x0 < 8 || y1 - y0 < 8) return null;
    base.x = x0; base.y = y0; base.w = x1 - x0; base.h = y1 - y0; base.ix = ri.left - x0; base.iy = ri.top - y0; base.iw = ri.width; base.ih = ri.height;
    return base;
  }
  function especificarTitulo(a, cartao) {
    var el = a.querySelector('.ev-card__titulo, h1, h2, h3, h4') || cartao.querySelector('.ev-card__titulo, h1, h2, h3, h4');
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!visivelEm(r) || !(el.textContent || '').trim()) return null;
    var cs = getComputedStyle(el), alt = parseFloat(cs.lineHeight);
    return { x: r.left, y: r.top, w: r.width, h: r.height, texto: el.textContent.trim(), fam: cs.fontFamily, tam: parseFloat(cs.fontSize), peso: cs.fontWeight, alt: isNaN(alt) ? 0 : alt,
      esp: cs.letterSpacing, caixa: cs.textTransform, cor: cs.color, linhas: parseInt(cs.webkitLineClamp, 10) || 0, z: zAbaixoDoCabecalho() };
  }
  function tituloDoCartao(a) {
    var c = cartaoDe(a), el = c.querySelector('.ev-card__titulo, h1, h2, h3, h4');
    return ((el && el.textContent) || a.getAttribute('aria-label') || '').trim();
  }
  function ordinalDoLink(a, titulo) {
    var todos = document.querySelectorAll('a[href*="Evento.dc.html"]'), n = 0;
    for (var i = 0; i < todos.length; i++) { if (todos[i] === a) return n; if (tituloDoCartao(todos[i]) === titulo) n++; }
    return 0;
  }

  /* =============================================================================================================
     2. Clones (a mesma construção na saída, no primeiro quadro da tela nova e na volta)
     ============================================================================================================= */
  function criarPoster(d) {
    var w = document.createElement('div');
    w.id = 'te-poster';
    w.setAttribute('aria-hidden', 'true');
    w.style.cssText = 'position:fixed;margin:0;overflow:hidden;pointer-events:none;transform-origin:50% 50%';
    w.style.left = px(d.x); w.style.top = px(d.y); w.style.width = px(d.w); w.style.height = px(d.h);
    w.style.borderRadius = raiosPx(d.rr);
    if (d.ang) { w.style.transform = 'rotate(' + d.ang + 'rad)'; w.setAttribute('data-ang', String(d.ang)); }
    w.style.zIndex = String(d.z);
    var im = document.createElement('img');
    im.alt = '';
    im.src = d.src;
    im.style.cssText = 'position:absolute;display:block;max-width:none;margin:0;transform-origin:0 0;border-radius:0';
    im.style.left = px(d.ix || 0); im.style.top = px(d.iy || 0); im.style.width = px(d.iw === undefined ? d.w : d.iw); im.style.height = px(d.ih === undefined ? d.h : d.ih);
    im.style.objectFit = d.fit || 'cover';
    im.style.objectPosition = d.pos || '50% 50%';
    w.appendChild(im);
    return w;
  }
  function criarTitulo(d) {
    var e = document.createElement('div');
    e.id = 'te-titulo';
    e.setAttribute('aria-hidden', 'true');
    e.textContent = d.texto;
    // ElzaPonte é a fonte que o motor de navegação registra no primeiro quadro (movimento-navegacao-cedo.js); a Elza real vem depois
    e.style.cssText = 'position:fixed;margin:0;overflow:hidden;pointer-events:none;transform-origin:0 0;white-space:normal;overflow-wrap:anywhere';
    e.style.fontFamily = 'ElzaPonte, ' + d.fam;
    e.style.left = px(d.x); e.style.top = px(d.y); e.style.width = px(d.w + 1); e.style.height = px(d.h);
    e.style.fontSize = px(d.tam); e.style.fontWeight = d.peso; e.style.letterSpacing = d.esp; e.style.textTransform = d.caixa; e.style.color = d.cor;
    e.style.lineHeight = d.alt ? px(d.alt) : 'normal';
    if (d.linhas) { e.style.display = '-webkit-box'; e.style.webkitBoxOrient = 'vertical'; e.style.webkitLineClamp = String(d.linhas); }
    e.style.zIndex = String(d.z);
    return e;
  }
  function criarFundo(d) { // a faixa escura do herói do Evento: na volta, é o que esmaece no lugar dela (sem ela o herói sumiria de um quadro para o outro)
    var f = document.createElement('div');
    f.id = 'te-fundo';
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;margin:0;pointer-events:none';
    f.style.left = px(d.x); f.style.top = px(d.y); f.style.width = px(d.w); f.style.height = px(d.h);
    f.style.backgroundColor = d.cor;
    f.style.zIndex = String(d.z);
    return f;
  }
  function montar(poster, titulo, fundo) {
    var a = [];
    if (fundo) a.push(criarFundo(fundo));
    if (poster) a.push(criarPoster(poster));
    if (titulo) a.push(criarTitulo(titulo));
    a.forEach(function (n) { (document.body || root).appendChild(n); });
    return a;
  }
  function limpar() {
    ['te-fundo', 'te-poster', 'te-titulo'].forEach(function (id) { var n = document.getElementById(id); if (n && n.parentNode) n.remove(); });
  }
  function terminaCom(P, T, F) { // remove os clones quando todas as animações deles terminam (ou já, se não houve nenhuma)
    var alvos = [P, T, F].filter(Boolean), esperas = [];
    alvos.forEach(function (n) { (n.getAnimations ? n.getAnimations({ subtree: true }) : []).forEach(function (an) { esperas.push(an.finished); }); });
    var fim = function () { limpar(); };
    if (!esperas.length) { fim(); return; }
    Promise.all(esperas).then(fim, fim);
  }

  /* =============================================================================================================
     3. Destino: o pôster e o título do Evento (qual deles está à vista depende da largura e do modo)
     ============================================================================================================= */
  function acharAlvo(seletores) {
    for (var i = 0; i < seletores.length; i++) {
      var el = document.querySelector(seletores[i]);
      if (el && rv(el)) return el;
    }
    return null;
  }
  function posterDoEvento() { return acharAlvo(['.mvp-buy-img', '.ev-hero .ev-poster', '.ev-poster', '.ee-hero img', '.ef-hero img']); }
  function tituloDoEvento() { return acharAlvo(['.ev-hero h1.ev-title', 'h1.ev-title', '.ev-title-m h2', '.ee-hero h1', '.ef-hero h1']); }

  /* o clone do pôster (em `d`) vai até a geometria `g` do destino {cx, cy, w, h, ang}: transform, ou largura e altura se a proporção for outra */
  function voarPoster(P, d, g, alvo, raioEl, t) {
    if (!(t.slow > 0) || !P.animate) return;
    var im = P.firstElementChild, sx = g.w / d.w, sy = g.h / d.h, dcx = d.x + d.w / 2, dcy = d.y + d.h / 2, a0 = d.ang || 0;
    var raio1 = raios(getComputedStyle(raioEl || alvo)), raio0 = d.rr;
    var posAlvo = getComputedStyle(alvo).objectPosition;
    var opc = { duration: t.slow, easing: t.move, fill: 'forwards' };
    var mesmaForma = Math.abs((d.w / d.h) / (g.w / g.h) - 1) < 0.06;
    var iw = d.iw === undefined ? d.w : d.iw, ih = d.ih === undefined ? d.h : d.ih, ix = d.ix || 0, iy = d.iy || 0;
    if (mesmaForma) {
      var f = (sx + sy) / 2;
      P.animate([{ transform: 'translate(0px,0px) rotate(' + a0 + 'rad) scale(1,1)', borderRadius: raiosPx(raio0) },
        { transform: translada(g.cx - dcx, g.cy - dcy) + ' rotate(' + g.ang + 'rad) scale(' + sx + ',' + sy + ')', borderRadius: raiosPx(raio1, 1 / f) }], opc);
      // dentro do clone, a imagem assenta na caixa (o zoom do hover do cartão sai) enquanto a caixa cresce
      im.animate([{ transform: 'none', objectPosition: d.pos || '50% 50%' }, { transform: translada(-ix, -iy) + ' scale(' + (d.w / iw) + ',' + (d.h / ih) + ')', objectPosition: posAlvo }], opc);
    } else {
      P.animate([{ left: px(d.x), top: px(d.y), width: px(d.w), height: px(d.h), transform: 'rotate(' + a0 + 'rad)', borderRadius: raiosPx(raio0) },
        { left: px(g.cx - g.w / 2), top: px(g.cy - g.h / 2), width: px(g.w), height: px(g.h), transform: 'rotate(' + g.ang + 'rad)', borderRadius: raiosPx(raio1) }], opc);
      im.animate([{ left: px(ix), top: px(iy), width: px(iw), height: px(ih), objectPosition: d.pos || '50% 50%' }, { left: px(0), top: px(0), width: px(g.w), height: px(g.h), objectPosition: posAlvo }], opc);
    }
    // o real já está embaixo: o clone se dissolve nele no último trecho do voo
    P.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, delay: Math.max(0, t.slow - t.fast), easing: t.exit, fill: 'forwards' });
  }

  /* o título do cartão (ou do herói, na volta) acompanha até o título de destino: escala o tamanho da fonte, troca a cor e se dissolve no caminho */
  function voarTitulo(T, d, r, alvo, t) {
    if (!(t.slow > 0) || !T.animate) return;
    var cs = getComputedStyle(alvo), s = (parseFloat(cs.fontSize) || d.tam) / d.tam;
    T.animate([{ transform: 'none', color: d.cor }, { transform: translada(r.left - d.x, r.top - d.y) + ' scale(' + s + ')', color: cs.color }], { duration: t.slow, easing: t.move, fill: 'forwards' });
    T.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0, offset: 0.7 }, { opacity: 0, offset: 1 }], { duration: t.slow, easing: t.move, fill: 'forwards' });
  }

  /* ---------- cascata do Evento: o cabeçalho já está lá (ponte); depois o fundo do herói, as informações, o cartão de compra e as seções ---------- */
  function itensDoEvento(t) {
    var itens = [], vistos = [];
    function add(el, n, opc) {
      if (!el || vistos.indexOf(el) > -1 || !rv(el)) return;
      vistos.push(el);
      itens.push({ el: el, n: n, so: opc && opc.so, dx: opc && opc.dx, dy: opc && opc.dy });
    }
    var hero = document.querySelector('.ev-hero');
    add(hero, 0, { so: 'opacidade' });
    Array.prototype.slice.call(document.querySelectorAll('.ev-hero-info > *')).forEach(function (el, i) { add(el, Math.min(i + 1, 3)); });
    add(document.querySelector('aside.buy'), 2, { dx: t.md, dy: 0 });
    add(document.querySelector('.mvp-evbar'), 2, { so: 'opacidade' });
    var secoes = Array.prototype.slice.call(document.querySelectorAll('main > *'));
    var k = 0;
    secoes.forEach(function (el) { if (rv(el) && k < 3) { add(el, 3 + k); k++; } });
    add(document.querySelector('.mbar'), 4, { so: 'opacidade' });
    return itens;
  }
  function cascata(ctx, itens) {
    var t = ctx.t;
    itens.forEach(function (it) {
      var n = Math.min(it.n, 4), atraso = it.n === 0 ? 0 : t.instant + n * t.stagger;
      var q = it.so === 'opacidade' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: translada(it.dx || 0, it.dy === undefined ? t.md : it.dy) }, { opacity: 1, transform: 'none' }];
      ctx.anima(it.el, q, { duration: t.base, delay: atraso, easing: t.enter, fill: 'backwards' });
    });
  }

  /* =============================================================================================================
     4. Primeiro quadro da tela nova: os clones já estão no lugar de onde a tela anterior os deixou
     ============================================================================================================= */
  var navAtual = null;     // o registro da ida, lido no primeiro quadro e consumido (vale uma vez: recarregar o Evento não repinta clones velhos)
  var vindoDeVolta = null; // { poster, titulo, origem } quando a chegada é a volta do Evento para a lista
  function porHistorico() { // chegada pelo botão Voltar ou Avançar (e não por link, URL digitada ou recarga)
    try { var n = performance.getEntriesByType('navigation')[0]; return !!n && n.type === 'back_forward'; } catch (e) { return false; }
  }
  (function cedo() {
    if (!temWAAPI || reduzido()) { if (EVENTO.test(location.pathname)) apagar(K_NAV); return; }
    var nav = EVENTO.test(location.pathname) ? ler(K_NAV, VALE) : null;
    if (nav) apagar(K_NAV);
    if (nav && nav.para === location.pathname && (nav.poster || nav.titulo)) {
      navAtual = nav;
      montar(nav.poster, nav.titulo);
      marco('ida:primeiro-quadro', { poster: !!nav.poster, titulo: !!nav.titulo });
    } else {
      var v = porHistorico() ? ler(K_VOLTA, VALE) : null, org = v ? ler(K_ORIGEM, VALE_ORIGEM) : null;
      if (v) apagar(K_VOLTA);
      if (v && org && v.para === aqui() && org.url === aqui() && (v.poster || v.titulo)) {
        vindoDeVolta = { poster: v.poster, titulo: v.titulo, fundo: v.fundo, origem: org };
        montar(v.poster, v.titulo, v.fundo);
        marco('volta:primeiro-quadro', { poster: !!v.poster, titulo: !!v.titulo, fundo: !!v.fundo });
      }
    }
    setTimeout(function () { if (!inspecionando()) limpar(); }, 3500); // rede de segurança: nada fica por cima da tela
  })();

  /* =============================================================================================================
     5. Padrão «poster-hero» do motor de navegação: o cartão vira o Evento
     ============================================================================================================= */
  function instalar(M) {
    var def = M.padroes['poster-hero'];
    if (!def || def.__te) return;
    def.__te = true;

    def.guardar = function (ctx, dados) {
      if (reduzido() || !temWAAPI) return;
      var a = ctx.ancora, cartao = cartaoDe(a), titulo = tituloDoCartao(a);
      var poster = especificarPoster(a, cartao); // sem pôster (botão de uma linha da turnê, chip) o título não acompanha: só a cascata da página nova
      var spec = { para: ctx.url.pathname, poster: poster, titulo: poster ? especificarTitulo(a, cartao) : null };
      ctx.te = spec;
      gravar(K_NAV, spec);
      gravar(K_ORIGEM, { url: aqui(), href: a.getAttribute('href'), titulo: titulo, ordinal: ordinalDoLink(a, titulo), poster: !!spec.poster });
      apagar(K_VOLTA);
    };

    def.saida = function (ctx) {
      var spec = ctx.te;
      if (spec && (spec.poster || spec.titulo)) montar(spec.poster, spec.titulo); // ficam por cima do cartão que esmaece
      return ctx.sairConteudo();
    };

    var visto = '', desde = 0, inicio = 0, motivo = '';
    function esperando(m) { if (m !== motivo) { motivo = m; marco('ida:espera:' + m); } return false; }
    def.pronto = function () {
      var spec = navAtual;
      if (!spec || !spec.poster) return true;
      if (!inicio) inicio = Date.now();
      if (root.getAttribute('data-evbff') === 'pend') return Date.now() - inicio > 1500 ? true : esperando('bff'); // o Evento real do BFF ainda não chegou: a página muda de conteúdo
      var alvo = posterDoEvento();
      if (!alvo) return Date.now() - inicio > 600 ? true : esperando('sem-destino'); // sem pôster à vista nesta variante: não espera mais que isso
      if (alvo.tagName === 'IMG' && !(alvo.complete && alvo.naturalWidth > 0)) return Date.now() - inicio > 1200 ? true : esperando('imagem');
      var r = alvo.getBoundingClientRect(), sig = [r.left, r.top, r.width, r.height].map(Math.round).join(',');
      if (sig !== visto) { visto = sig; desde = Date.now(); marco('ida:layout', sig); return esperando('layout'); } // o layout (o cartão de compra sobe para dentro do herói) ainda mexe
      if (Date.now() - desde < ESTAVEL) return esperando('assentando');
      return true;
    };

    def.entrada = function (ctx) {
      var t = ctx.t, spec = navAtual;
      var P = document.getElementById('te-poster'), T = document.getElementById('te-titulo');
      var alvoP = posterDoEvento(), alvoT = tituloDoEvento();
      var rp = alvoP && geom(alvoP), rt = alvoT && alvoT.getBoundingClientRect(); // ANTES de qualquer animação (cada uma já aplica o quadro inicial)
      var itens = itensDoEvento(t);
      if (P && spec && spec.poster && rp && alvoP) voarPoster(P, spec.poster, rp, alvoP, alvoP, t);
      else if (P && P.animate && t.fast > 0) P.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      if (T && spec && spec.titulo && rt && alvoT) voarTitulo(T, spec.titulo, rt, alvoT, t);
      else if (T && T.animate && t.fast > 0) T.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      if (itens.length < 3) { // variante do Evento sem a estrutura padrão (esporte, jogo): completa com os blocos que o motor acha, sem repetir nenhum
        ctx.alvos().forEach(function (g) {
          var coberto = itens.some(function (it) { return it.el === g.el || it.el.contains(g.el) || g.el.contains(it.el); });
          if (!coberto) itens.push({ el: g.el, n: Math.min(g.n + 1, 4), so: g.so });
        });
      }
      cascata(ctx, itens);
      marco('ida:entrada', { voo: !!(P && spec && spec.poster && rp), titulo: !!(T && rt), itens: itens.length, destino: alvoP ? (alvoP.className || alvoP.tagName) : null });
      congelar();
      terminaCom(P, T);
      navAtual = null;
    };

    var depoisOrig = def.depois;
    def.depois = function (ctx) {
      if (depoisOrig) depoisOrig(ctx);
      // movimento reduzido: o motor não chama a entrada; sem animação os clones saem na hora
      if (reduzido()) { limpar(); navAtual = null; }
    };

    // qualquer link para o Evento (com ou sem pôster) usa o padrão: sem pôster, o padrão cai na saída e na cascata
    M.regras.unshift({ para: EVENTO, padrao: 'poster-hero' });

    instalarVolta(M);
  }

  /* =============================================================================================================
     6. Volta: do Evento para o cartão de onde saiu
     ============================================================================================================= */
  var saiuPorClique = false;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a) { saiuPorClique = true; setTimeout(function () { saiuPorClique = false; }, 1500); } // o motor despede a tela por clique: o pôster já esmaeceu, não há o que devolver (âncora na mesma tela: libera depois)
  }, true);

  // sai do Evento sem clique (botão Voltar, atalho do teclado): guarda onde o pôster e o título estão agora
  window.addEventListener('pagehide', function () {
    if (!EVENTO.test(location.pathname) || saiuPorClique || reduzido() || !temWAAPI) return;
    var org = ler(K_ORIGEM, VALE_ORIGEM);
    if (!org || !org.poster) return;
    var alvoP = posterDoEvento();
    if (!alvoP) return;
    var ga = geom(alvoP), cs = getComputedStyle(alvoP), pAlvo = { x: ga.cx - ga.w / 2, y: ga.cy - ga.h / 2, w: ga.w, h: ga.h, ang: ga.ang, rr: raios(cs), ix: 0, iy: 0, iw: ga.w, ih: ga.h,
      src: alvoP.currentSrc || alvoP.src, fit: cs.objectFit, pos: cs.objectPosition, z: zAbaixoDoCabecalho() };
    var alvoT = tituloDoEvento(), tAlvo = null;
    if (alvoT) {
      var rt = alvoT.getBoundingClientRect(), ct = getComputedStyle(alvoT), alt = parseFloat(ct.lineHeight);
      tAlvo = { x: rt.left, y: rt.top, w: rt.width, h: rt.height, texto: alvoT.textContent.trim(), fam: ct.fontFamily, tam: parseFloat(ct.fontSize), peso: ct.fontWeight, alt: isNaN(alt) ? 0 : alt,
        esp: ct.letterSpacing, caixa: ct.textTransform, cor: ct.color, linhas: 0, z: zAbaixoDoCabecalho() };
    }
    var hero = document.querySelector('.ev-hero'), fundo = null;
    if (hero) {
      var rh = hero.getBoundingClientRect(), ch = getComputedStyle(hero).backgroundColor;
      if (visivelEm(rh) && ch && ch !== 'rgba(0, 0, 0, 0)' && ch !== 'transparent') fundo = { x: rh.left, y: rh.top, w: rh.width, h: rh.height, cor: ch, z: zAbaixoDoCabecalho() };
    }
    gravar(K_VOLTA, { para: org.url, poster: pAlvo, titulo: tAlvo, fundo: fundo });
  });

  function acharCartaoOrigem(org) {
    var todos = document.querySelectorAll('a[href*="Evento.dc.html"]'), iguais = [];
    for (var i = 0; i < todos.length; i++) if (tituloDoCartao(todos[i]) === org.titulo) iguais.push(todos[i]);
    return iguais.length ? iguais[Math.min(org.ordinal || 0, iguais.length - 1)] : null;
  }
  function seguraCartaoNaTela(a) { // o cartão fica à vista (a tela ainda está escondida ou a cascata ainda não começou: o salto não aparece)
    var r = a.getBoundingClientRect(), h = document.querySelector('.hdr'), topo = h ? h.getBoundingClientRect().bottom : 0;
    if (r.top < topo || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) a.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  }
  function posterDoCartao(a) {
    var cartao = cartaoDe(a), im = acharImagemSemFiltroDeTela(a, cartao);
    return im;
  }
  function acharImagemSemFiltroDeTela(a, cartao) { // como acharImagem, mas o cartão pode estar um pouco fora da janela
    var imgs = Array.prototype.slice.call(a.querySelectorAll('img')), melhor = null;
    imgs.forEach(function (im) {
      if (im.closest('.ev-card__placa, .ev-card__fundo, .ev-card__escudo')) return;
      var r = im.getBoundingClientRect();
      if (r.width < 60 || r.height < r.width * 0.9) return;
      if (!melhor || r.width * r.height > melhor.r.width * melhor.r.height) melhor = { el: im, r: r };
    });
    return melhor;
  }
  function instalarVolta(M) {
    ['conteudo', 'direta'].forEach(function (nome) { if (M.padroes[nome]) instalarVoltaEm(M.padroes[nome]); });
  }
  function instalarVoltaEm(cont) {
    if (cont.__te) return;
    cont.__te = true;
    var prontoOrig = cont.pronto, entradaOrig = cont.entrada;
    cont.pronto = function (ctx) {
      if (vindoDeVolta) { // espera o cartão existir (a lista monta depois do primeiro quadro) e a imagem dele estar pronta
        var v = vindoDeVolta;
        v.espera = v.espera || Date.now();
        var a = acharCartaoOrigem(v.origem);
        if (!a) { if (Date.now() - v.espera < 1200) return false; }
        else {
          var p = posterDoCartao(a);
          if (p) {
            p.el.loading = 'eager'; // imagem preguiçosa fora da janela nunca carregaria enquanto a tela está escondida
            if (!(p.el.complete && p.el.naturalWidth > 0) && Date.now() - v.espera < 900) return false;
          }
        }
      }
      return prontoOrig ? prontoOrig(ctx) : true;
    };
    cont.entrada = function (ctx) {
      var v = vindoDeVolta, P = document.getElementById('te-poster'), T = document.getElementById('te-titulo'), F = document.getElementById('te-fundo'), t = ctx.t, alvo = null;
      if (v) {
        var a = acharCartaoOrigem(v.origem);
        if (a) { seguraCartaoNaTela(a); alvo = { a: a, p: posterDoCartao(a), cartao: cartaoDe(a) }; if (alvo.p) alvo.rec = recorteDe(alvo.p.el, a); }
      }
      // medir ANTES de a cascata da lista aplicar o quadro inicial dela
      var rp = alvo && alvo.p ? alvo.p.r : null, rc = null, alvoTit = null, rt = null;
      if (alvo && alvo.p) {
        rc = geom(alvo.rec || alvo.p.el);
        alvoTit = alvo.a.querySelector('.ev-card__titulo, h1, h2, h3, h4') || alvo.cartao.querySelector('.ev-card__titulo, h1, h2, h3, h4');
        rt = alvoTit ? alvoTit.getBoundingClientRect() : null;
      }
      if (entradaOrig) entradaOrig(ctx);
      if (!v) return;
      vindoDeVolta = null;
      if (P && rc && alvo && alvo.p && t.slow > 0) {
        voarPoster(P, v.poster, rc, alvo.p.el, alvo.rec || alvo.p.el, t); // a mesma conta da ida: o clone parte do pôster do Evento e assenta no recorte do cartão
      } else if (P && P.animate && t.fast > 0) {
        P.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      }
      if (T && rt && alvoTit && t.slow > 0 && v.titulo) voarTitulo(T, v.titulo, rt, alvoTit, t);
      else if (T && T.animate && t.fast > 0) T.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      if (F && F.animate && t.base > 0) F.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.base, easing: t.exit, fill: 'forwards' });
      marco('volta:entrada', { voo: !!(P && rc), titulo: !!(T && rt), fundo: !!F });
      congelar();
      terminaCom(P, T, F);
      apagar(K_VOLTA);
    };
  }

  // volta pelo cache de páginas: a lista voltou como estava ao sair, com os clones ainda por cima do cartão; eles fazem o caminho de volta
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var P = document.getElementById('te-poster'), T = document.getElementById('te-titulo');
    var v = ler(K_VOLTA, VALE), org = ler(K_ORIGEM, VALE_ORIGEM), M = window.MovNav, t = M && M.tokens ? M.tokens() : null, F = null;
    if (!P && !T) return;
    if (!v || !org || v.para !== aqui() || reduzido() || !t || !(t.slow > 0)) { limpar(); return; }
    var opc = { duration: t.slow, easing: t.move, fill: 'backwards' };
    if (v.fundo) { F = criarFundo(v.fundo); (P || T).parentNode.insertBefore(F, P || T); F.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.base, easing: t.exit, fill: 'forwards' }); }
    if (P && v.poster) {
      var d = { x: parseFloat(P.style.left), y: parseFloat(P.style.top), w: parseFloat(P.style.width), h: parseFloat(P.style.height) }, im = P.firstElementChild, a0 = parseFloat(P.getAttribute('data-ang')) || 0;
      var ini = translada((v.poster.x + v.poster.w / 2) - (d.x + d.w / 2), (v.poster.y + v.poster.h / 2) - (d.y + d.h / 2)) + ' rotate(' + (v.poster.ang || 0) + 'rad) scale(' + (v.poster.w / d.w) + ',' + (v.poster.h / d.h) + ')';
      var iw = parseFloat(im.style.width), ih = parseFloat(im.style.height), ix = parseFloat(im.style.left), iy = parseFloat(im.style.top);
      P.animate([{ transform: ini }, { transform: 'translate(0px,0px) rotate(' + a0 + 'rad) scale(1,1)' }], opc);
      im.animate([{ transform: translada(-ix, -iy) + ' scale(' + (d.w / iw) + ',' + (d.h / ih) + ')' }, { transform: 'none' }], opc);
      P.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, delay: Math.max(0, t.slow - t.fast), easing: t.exit, fill: 'forwards' });
    }
    if (T) T.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.base, easing: t.exit, fill: 'forwards' });
    congelar();
    terminaCom(P, T, F);
    apagar(K_VOLTA);
  });

  /* ---------- instalação: o motor de navegação define window.MovNav logo antes de chegar(); o padrão precisa estar trocado nesse instante ---------- */
  if (window.MovNav) instalar(window.MovNav);
  else {
    var guardado;
    try {
      Object.defineProperty(window, 'MovNav', {
        configurable: true, enumerable: true,
        get: function () { return guardado; },
        set: function (v) {
          guardado = v;
          try { instalar(v); } catch (e) {}
          try { Object.defineProperty(window, 'MovNav', { value: v, writable: true, configurable: true, enumerable: true }); } catch (e) {}
        }
      });
    } catch (e) {}
  }

  window.TransicaoEvento = { montar: montar, limpar: limpar, instalar: instalar, trilha: trilha };
})();
