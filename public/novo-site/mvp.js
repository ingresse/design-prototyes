/* mvp.js: camada do MODO MVP (tools/previa/mvp.mjs copia para previa/mvp.js; só age com <html data-modo="mvp">).
   1. Areia: cymatics em grãos (placa de Chladni com partículas). Os grãos assentam nas linhas nodais; a cada «excitar» ganham um pouco de vermelho,
      escorrem com suavidade e reassentam em outro desenho; em repouso ficam imóveis. Mesma família de frequências do desenhador da prévia (window.IngresseCym.estilos).
   2. Topo da Home: chamadas em pôster (título grande que se ajusta ao nome, pilha de imagens quadradas, entradas e saídas por lados diferentes).
   3. Cabeçalho transparente sobre o topo da Home, com fundo ao rolar.
   4. Topo das categorias e seção de produtores: a mesma areia.
   5. Carrosséis da Home: marca início e fim da rolagem para o degradê das laterais (mvp.css).
   6. Trilha da Categoria: menu das categorias. 6b. Typewriter da busca (código único). 7. Busca dentro da barra de navegação e (7b) na Home. 8. Evento: areia em escuro e cabeçalho mínimo fixo.
   Movimento reduzido: nada roda sozinho; a areia aparece assentada e as trocas viram corte seco. */
(function () {
  'use strict';
  var raizDoc = document.documentElement;
  /* chave do modo no painel do protótipo (vale nos DOIS modos, por isso antes do «return»): o chip do modo atual leva o estado marcado
     do componente chip (.is-on, como os chips do painel) e aria-current; o desenho invertido vem do CSS do chip marcado (mvp.css §0) */
  (function marcarChave(n) {
    var l = document.querySelectorAll('.mvp-chave [data-modo-alvo]');
    if (!l.length || document.querySelector('sc-if, sc-for')) { if (n < 200) setTimeout(function () { marcarChave(n + 1); }, 50); return; }
    var modo = raizDoc.getAttribute('data-modo') === 'mvp' ? 'mvp' : 'completo';
    for (var i = 0; i < l.length; i++) { var on = l[i].getAttribute('data-modo-alvo') === modo; l[i].classList.toggle('is-on', on); if (on) l[i].setAttribute('aria-current', 'true'); else l[i].removeAttribute('aria-current'); }
  })(0);
  if (raizDoc.getAttribute('data-modo') !== 'mvp') return;
  if (window.IngresseMvpLigado) return; window.IngresseMvpLigado = true; // o modelo move os <script> da helmet para o <head> e eles rodam de novo: uma vez só
  var DADOS = {"duracaoMs":8000,"itens":[{"tipo":"evento","selo":"Festival","nome":"Primavera Sound São Paulo 2026","texto":"Dois dias de palcos no autódromo, do indie ao pop.","data":"Sáb 5 e dom 6 dez","local":"Autódromo de Interlagos · São Paulo","img":"./assets/real/93986.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"festival"},{"tipo":"campanha","selo":"Campanha","nome":"Réveillon 2027","texto":"Praia, pista ou rooftop: escolha onde virar o ano.","img":"./assets/real/94183.avif","href":"Busca.dc.html?q=r%C3%A9veillon","cta":"Ver réveillons","estilo":"reveillon"},{"tipo":"evento","selo":"Eletrônica","nome":"Rave the World by Alok","texto":"Alok comanda a pista do Laroc do fim de tarde à madrugada.","data":"Sáb 17 out · 16h","local":"Laroc Club · Valinhos, SP","img":"./assets/real/104600.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"eletronica"},{"tipo":"evento","selo":"Turnê","nome":"Sorriso Eu Gosto no Pagode","texto":"A roda de pagode que virou turnê chega a São Paulo.","data":"Dom 8 nov · 13h","local":"Arena Anhembi · São Paulo","img":"./assets/real/104717.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"pagode"},{"tipo":"evento","selo":"Eletrônica","nome":"Solomun :: CWB","texto":"Set longo de Solomun a céu aberto, na pedreira.","data":"Sáb 31 out · 14h","local":"Pedreira Paulo Leminski · Curitiba","img":"./assets/real/92947.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"eletronica"},{"tipo":"campanha","selo":"Campanha","nome":"Festivais de verão","texto":"Os festivais da temporada em um só lugar.","img":"./assets/real/108882.avif","href":"Categoria.dc.html?c=festivais","cta":"Ver festivais","estilo":"festival"},{"tipo":"evento","selo":"Eletrônica","nome":"Boris Brejcha","texto":"High-tech minimal no Laroc, com a máscara e tudo.","data":"Sex 13 nov · 21h","local":"Laroc Club · Valinhos, SP","img":"./assets/real/103645.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"eletronica"},{"tipo":"evento","selo":"Samba","nome":"Juntô · Roda de samba","texto":"Roda aberta, de tarde, no meio da cidade.","data":"Dom 25 out · 15h","local":"Casa Tupi · São Paulo","img":"./assets/real/107033.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"pagode"},{"tipo":"evento","selo":"Turnê","nome":"Turnê Dominguinho","texto":"Data extra no Rio para quem ficou de fora.","data":"Dom 15 nov · 15h","local":"Cidade das Artes · Rio de Janeiro","img":"./assets/real/108421.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"jazz"},{"tipo":"evento","selo":"Festa","nome":"Arena Paraíso Edição Paris","texto":"A festa veste Paris por uma noite.","data":"Sáb 24 out · 22h","local":"Arena Paraíso · Rio de Janeiro","img":"./assets/real/105388.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"pista"},{"tipo":"evento","selo":"Samba","nome":"Gávea Samba Clube","texto":"Samba de sexta com vista para a Gávea.","data":"Sex 16 out · 22h","local":"Planetário da Gávea · Rio de Janeiro","img":"./assets/real/108325.avif","href":"Evento.dc.html","cta":"Ver evento","estilo":"pagode"}]};
  var mqReduz = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduz = function () { return mqReduz.matches; };
  var MARCA = [229, 38, 25]; // --color-fg-brand (claro)

  /* ------------------------------------------------------------------ 1. areia */
  var FAMILIAS = { festival: { m: [6, 7], n: [4, 5], b: 0.6 } };
  function modoDe(estilo, semente) {
    var fam = (window.IngresseCym && window.IngresseCym.estilos) || FAMILIAS;
    var E = fam[estilo] || fam.festival || FAMILIAS.festival, s = semente >>> 0;
    var m = E.m[0] + (s % (E.m[1] - E.m[0] + 1)), n = E.n[0] + ((s >> 3) % (E.n[1] - E.n[0] + 1));
    // a areia pede frequências mais baixas que a linha fina: comprime a faixa (frações dão curvas assimétricas, de areia de verdade)
    return { m: 1.4 + m * 0.34, n: 1.1 + n * 0.3, b: E.b, ph: (s % 97) * 0.37 };
  }
  function Areia(cv, opt) {
    opt = opt || {};
    var ctx = cv.getContext('2d'), W = 0, H = 0, S = 1, dpr = 1, P = null, V = null, N = 0;
    var modo = modoDe(opt.estilo || 'festival', opt.semente || 7), cor = opt.cor || MARCA, tinta = opt.tinta || [38, 38, 38];
    var t0 = performance.now(), visivel = false, raf = 0, ultimo = 0, vivo = true;
    function medir() {
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return false;
      if (w === W && h === H && P) return true;
      W = w; H = h; S = Math.max(H, 380); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var alvo = Math.min(opt.max || 16000, Math.round(W * H / (opt.densidade || 75)));
      if (!P || alvo !== N) { N = alvo; P = new Float32Array(N * 2); V = new Float32Array(N * 2); for (var i = 0; i < N; i++) { P[2 * i] = Math.random() * W; P[2 * i + 1] = Math.random() * H; } }
      return true;
    }
    /* Movimento suave: cada grão tem velocidade com atrito (nada de saltos). A agitação é proporcional à vibração do ponto e à energia,
       que cai sozinha; quando ela zera, a areia fica imóvel até a próxima chamada (sem cintilar em repouso). */
    function passo(energia) {
      var m = modo.m * Math.PI / S, n = modo.n * Math.PI / S, b = modo.b, ph = modo.ph, g = Math.sqrt(energia);
      for (var i = 0; i < N; i++) {
        var x = P[2 * i], y = P[2 * i + 1];
        var a = Math.abs(Math.cos(n * x + ph) * Math.cos(m * y) + b * Math.cos(m * x + ph) * Math.cos(n * y));
        var acc = (0.04 + a * 4) * g, ang = Math.random() * 6.2832;
        var vx = V[2 * i] * 0.9 + Math.cos(ang) * acc, vy = V[2 * i + 1] * 0.9 + Math.sin(ang) * acc;
        x += vx; y += vy;
        if (x < 0) { x = -x; vx = -vx; } else if (x > W) { x = 2 * W - x; vx = -vx; }
        if (y < 0) { y = -y; vy = -vy; } else if (y > H) { y = 2 * H - y; vy = -vy; }
        P[2 * i] = x; P[2 * i + 1] = y; V[2 * i] = vx; V[2 * i + 1] = vy;
      }
    }
    function desenhar(energia) {
      // o vermelho entra de leve e some junto com a energia; a opacidade não muda (sem piscar)
      var e = Math.min(0.75, energia * 1.1), r = Math.round(tinta[0] + (cor[0] - tinta[0]) * e), g = Math.round(tinta[1] + (cor[1] - tinta[1]) * e), bl = Math.round(tinta[2] + (cor[2] - tinta[2]) * e);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (opt.alfa || 0.4) + ')';
      var s = Math.max(1, dpr * 1.15);
      for (var i = 0; i < N; i++) ctx.fillRect(P[2 * i] * dpr, P[2 * i + 1] * dpr, s, s);
    }
    function energiaEm(agora) { return Math.exp(-(agora - t0) / 1100); }
    function quadro(agora) {
      raf = 0;
      if (!vivo || !visivel || document.hidden) return;
      var e = energiaEm(agora);
      if (!medir()) { raf = requestAnimationFrame(quadro); return; }
      if (e < 0.004) { passo(0); desenhar(0); return; } // assentou: último quadro e o laço para
      passo(e); desenhar(e);
      raf = requestAnimationFrame(quadro);
    }
    function parado() { if (!medir()) return; for (var i = 0; i < 320; i++) passo(Math.exp(-i / 60)); V.fill(0); desenhar(0); }
    function ligar() { if (reduz()) { parado(); return; } if (!raf) raf = requestAnimationFrame(quadro); }
    var api = {
      excitar: function (estilo, semente, novaCor) {
        if (estilo) modo = modoDe(estilo, semente || Math.floor(Math.random() * 1e6));
        if (novaCor) cor = novaCor;
        t0 = performance.now();
        if (reduz()) parado(); else ligar();
      },
      parar: function () { vivo = false; if (raf) cancelAnimationFrame(raf); }
    };
    var margemIO = { rootMargin: '80px' }; // começa a animar a areia 80 px antes de entrar na tela (= --space-10; rootMargin só aceita px ou %, não lê var() nem rem)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel) ligar(); }, margemIO).observe(cv);
    else { visivel = true; ligar(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visivel) ligar(); });
    var tRes = 0;
    window.addEventListener('resize', function () { clearTimeout(tRes); tRes = setTimeout(function () { if (cv.clientWidth !== W || cv.clientHeight !== H) api.excitar(); }, 200); });
    return api;
  }
  function areiaEm(el, opt) {
    var cv = el.querySelector(':scope > canvas.mvp-areia');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'mvp-areia'; cv.setAttribute('aria-hidden', 'true'); el.appendChild(cv); }
    return Areia(cv, opt);
  }

  /* ------------------------------------------------------------------ texto de pôster */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function palavras(texto) {
    return String(texto).split(/\s+/).filter(Boolean).map(function (p, i) { return '<span class="mvp-w" style="--i:' + i + '">' + esc(p) + '</span>'; }).join(' ');
  }
  /** Ajusta o corpo do título ao nome: o maior tamanho em que nenhuma palavra estoura a coluna e o bloco cabe na altura reservada. */
  function ajustar(el) {
    if (!el || !el.clientWidth) return;
    var cs = getComputedStyle(el), maxH = parseFloat(cs.getPropertyValue('--mvp-titulo-alt')) || 280, lo = parseFloat(cs.getPropertyValue('--mvp-titulo-min')) || 30, hi = parseFloat(cs.getPropertyValue('--mvp-titulo-max')) || 150;
    hi = Math.min(hi, el.clientWidth * 0.32);
    for (var k = 0; k < 9; k++) {
      var meio = (lo + hi) / 2;
      el.style.fontSize = meio + 'px';
      if (el.scrollWidth <= el.clientWidth + 1 && el.offsetHeight <= maxH) lo = meio; else hi = meio;
    }
    el.style.fontSize = Math.floor(lo) + 'px';
  }

  /* ------------------------------------------------------------------ 2. topo da Home */
  var ICO = {
    ant: '<svg class="ico ico-16" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    prox: '<svg class="ico ico-16" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    pausa: '<svg class="ico ico-16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    toca: '<svg class="ico ico-16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
  };
  var ENTRADAS = ['esq', 'baixo', 'dir', 'cima'];
  function montarHero(raiz, areia) {
    var itens = DADOS.itens || [], n = itens.length, dur = DADOS.duracaoMs || 8000;
    if (!n) return;
    var atual = 0, vez = 0, parouUsuario = reduz(), pausado = false, timer = 0;
    raiz.innerHTML =
      '<div class="mvp-hero__txt" data-txt aria-live="off"></div>' +
      '<div class="mvp-hero__pilha" data-pilha></div>' +
      '<div class="mvp-hero__ctrl" role="group" aria-label="Controles dos destaques">' +
        '<button type="button" class="bs mvp-hero__b" data-ant aria-label="Destaque anterior">' + ICO.ant + '</button>' +
        '<span class="mvp-hero__cont" aria-hidden="true"><b data-num>01</b> / ' + String(n).padStart(2, '0') + '</span>' +
        '<button type="button" class="bs mvp-hero__b" data-prox aria-label="Próximo destaque">' + ICO.prox + '</button>' +
        '<button type="button" class="bs mvp-hero__b" data-pausa></button>' +
        '<span class="mvp-hero__prog" aria-hidden="true"><i data-prog></i></span>' +
      '</div>';
    var txt = raiz.querySelector('[data-txt]'), pilha = raiz.querySelector('[data-pilha]'), num = raiz.querySelector('[data-num]'), prog = raiz.querySelector('[data-prog]'), bPausa = raiz.querySelector('[data-pausa]');
    raiz.style.setProperty('--mvp-dur', dur + 'ms');

    function bloco(it, lado) {
      var el = document.createElement('div');
      el.className = 'mvp-hero__bloco';
      el.setAttribute('data-tipo', it.tipo);
      el.setAttribute('data-lado', lado);
      var meta = it.tipo === 'evento' ? '<p class="mvp-hero__meta"><span>' + esc(it.data) + '</span><span>' + esc(it.local) + '</span></p>' : '';
      el.innerHTML =
        '<p class="over mvp-hero__selo">' + esc(it.selo) + '</p>' +
        '<h2 class="mvp-poster mvp-hero__titulo"><a href="' + esc(it.href) + '">' + palavras(it.nome) + '</a></h2>' +
        meta +
        '<p class="mvp-hero__desc">' + esc(it.texto) + '</p>' +
        '<a class="bp bp-lg mvp-hero__cta" href="' + esc(it.href) + '">' + esc(it.cta) + '</a>';
      return el;
    }
    function carta(idx, pos) {
      var it = itens[(idx + n) % n], a = document.createElement('a');
      a.className = 'mvp-hero__carta'; a.href = it.href; a.tabIndex = -1; a.setAttribute('aria-hidden', 'true');
      a.setAttribute('data-pos', pos);
      a.innerHTML = '<img src="' + esc(it.img) + '" alt="" decoding="async" width="560" height="560">';
      return a;
    }
    function reiniciarProg() { prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = ''; }
    function agendar() {
      clearTimeout(timer);
      var roda = !parouUsuario && !pausado && !reduz() && !document.hidden;
      raiz.setAttribute('data-roda', roda ? 'sim' : 'nao');
      txt.setAttribute('aria-live', roda ? 'off' : 'polite');
      if (roda) { reiniciarProg(); timer = setTimeout(function () { ir(atual + 1, 1); }, dur); }
    }
    function pintarPausa() {
      bPausa.innerHTML = parouUsuario ? ICO.toca : ICO.pausa;
      bPausa.setAttribute('aria-label', parouUsuario ? 'Retomar a troca automática dos destaques' : 'Pausar a troca automática dos destaques');
    }
    function ir(idx, sentido) {
      idx = (idx + n) % n;
      var lado = ENTRADAS[vez % ENTRADAS.length], saida = ENTRADAS[(vez + 2 + (sentido < 0 ? 1 : 0)) % ENTRADAS.length]; vez++;
      // texto: o bloco atual sai por um lado e o novo entra por outro
      var velhos = txt.querySelectorAll('.mvp-hero__bloco');
      for (var i = 0; i < velhos.length; i++) (function (v) { v.setAttribute('data-estado', 'sai'); v.setAttribute('data-lado', saida); v.setAttribute('aria-hidden', 'true'); v.inert = true; setTimeout(function () { v.remove(); }, reduz() ? 0 : 520); })(velhos[i]);
      var novo = bloco(itens[idx], lado);
      novo.setAttribute('data-estado', 'entra');
      txt.appendChild(novo);
      ajustar(novo.querySelector('.mvp-hero__titulo'));
      requestAnimationFrame(function () { requestAnimationFrame(function () { novo.setAttribute('data-estado', 'fica'); }); });
      // pilha: a carta de cima sai voando por um lado, as de trás sobem e uma nova entra no fundo
      var cartas = pilha.querySelectorAll('.mvp-hero__carta:not([data-pos="sai"])');
      if (!cartas.length || idx !== (atual + 1) % n) {
        for (var c = 0; c < cartas.length; c++) (function (v) { v.setAttribute('data-pos', 'sai'); v.setAttribute('data-lado', saida); setTimeout(function () { v.remove(); }, reduz() ? 0 : 700); })(cartas[c]);
        for (var p = 2; p >= 0; p--) pilha.appendChild(carta(idx + p, String(p)));
      } else {
        var topo = cartas[cartas.length - 1];
        topo.setAttribute('data-pos', 'sai'); topo.setAttribute('data-lado', saida);
        setTimeout(function () { topo.remove(); }, reduz() ? 0 : 700);
        for (var q = 0; q < cartas.length - 1; q++) cartas[q].setAttribute('data-pos', String(Number(cartas[q].getAttribute('data-pos')) - 1));
        var nova = carta(idx + 2, 'entra');
        pilha.insertBefore(nova, pilha.firstChild);
        requestAnimationFrame(function () { requestAnimationFrame(function () { nova.setAttribute('data-pos', '2'); }); });
      }
      atual = idx;
      num.textContent = String(idx + 1).padStart(2, '0');
      if (areia) areia.excitar(itens[idx].estilo, 11 + idx * 37);
      agendar();
    }
    raiz.querySelector('[data-ant]').addEventListener('click', function () { ir(atual - 1, -1); });
    raiz.querySelector('[data-prox]').addEventListener('click', function () { ir(atual + 1, 1); });
    bPausa.addEventListener('click', function () { parouUsuario = !parouUsuario; pintarPausa(); agendar(); });
    var pausar = function (v) { return function () { if (pausado !== v) { pausado = v; agendar(); } }; };
    raiz.addEventListener('mouseenter', pausar(true)); raiz.addEventListener('mouseleave', pausar(false));
    raiz.addEventListener('focusin', pausar(true)); raiz.addEventListener('focusout', function (e) { if (!raiz.contains(e.relatedTarget)) pausar(false)(); });
    raiz.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') ir(atual - 1, -1); else if (e.key === 'ArrowRight') ir(atual + 1, 1); });
    document.addEventListener('visibilitychange', agendar);
    // toque: arrastar para os lados troca a chamada
    var x0 = null;
    raiz.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    raiz.addEventListener('pointerup', function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 48) ir(atual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
    var tRes = 0;
    window.addEventListener('resize', function () { clearTimeout(tRes); tRes = setTimeout(function () { ajustar(txt.querySelector('.mvp-hero__bloco:not([data-estado="sai"]) .mvp-hero__titulo')); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ajustar(txt.querySelector('.mvp-hero__bloco:not([data-estado="sai"]) .mvp-hero__titulo')); });
    pintarPausa();
    ir(0, 1);
  }

  /* ------------------------------------------------------------------ 3. cabeçalho sobre o topo */
  function cabecalho() {
    var rolou = null;
    var ver = function () { var r = window.scrollY > 8; if (r !== rolou) { rolou = r; raizDoc.toggleAttribute('data-mvp-rolou', r); } };
    window.addEventListener('scroll', ver, { passive: true }); ver();
  }

  /* ------------------------------------------------------------------ 4. categorias e produtores */
  function rgb(s) { var p = String(s || '').split(',').map(Number); return p.length === 3 && p.every(function (v) { return v >= 0 && v <= 255; }) ? p : null; }
  /* o ícone do título da categoria passa a ser o do MVP (os «mvp-cat-*»); o icones-motion.js refaz o desenho quando o atributo muda */
  var ICONES_MVP = { 'cat-festivais': 'mvp-cat-festivais', 'cat-festa-e-balada': 'mvp-cat-festas', 'cat-futebol': 'mvp-cat-futebol', 'cat-esportes': 'mvp-cat-esportes', 'cat-teatro': 'mvp-cat-teatro' };
  function trocarIconeTitulo() {
    var l = document.querySelectorAll('.cat-ic[data-lottie]');
    for (var i = 0; i < l.length; i++) {
      var m = /icones\/([a-z-]+)\.json$/.exec(l[i].getAttribute('data-lottie') || '');
      if (m && ICONES_MVP[m[1]]) l[i].setAttribute('data-lottie', './assets/icones/' + ICONES_MVP[m[1]] + '.json');
    }
  }
  /* topo das páginas de categoria (Wander, 15/11/2026): preto, com a MESMA areia do hero do Evento (tinta clara, toque de vermelho, alfa .34; ver evento()).
     Sem cor por categoria: só o estilo (frequência e simetria da placa) e a semente mudam de uma para outra. Anima só visível; movimento reduzido nasce parado (Areia). */
  function areiaCategoria(h, estilo) {
    return areiaEm(h, { estilo: estilo, semente: Number(h.getAttribute('data-seed')) || 29, tinta: [229, 229, 229], cor: [255, 74, 64], alfa: 0.34, densidade: 85, max: 12000 });
  }
  function topoCategoria() {
    var feito = null;
    var tentar = function () {
      var h = document.querySelector('.cat-hero[data-cym="categoria"]');
      if (!h || h === feito) return;
      var cor = rgb(h.getAttribute('data-cor')), estilo = h.getAttribute('data-estilo');
      if (!cor || !estilo || /\{\{/.test(estilo)) return;
      feito = h;
      trocarIconeTitulo();
      var a = areiaCategoria(h, estilo); // topo preto com a areia do hero do Evento (Wander, 15/11/2026; antes: areia na cor da categoria sobre fundo claro)
      h.addEventListener('mouseenter', function () { a.excitar(estilo); });
    };
    tentar();
    new MutationObserver(function () { tentar(); trocarIconeTitulo(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-cor', 'data-estilo'] });
  }
  function produtores() {
    var sec = document.querySelector('[data-mvp="produtores"]');
    if (!sec) return;
    var a = areiaEm(sec, { estilo: 'pista', semente: 23, densidade: 130, max: 8000 });
    var cta = sec.querySelector('.bp');
    if (cta) { cta.addEventListener('mouseenter', function () { a.excitar('festival'); }); cta.addEventListener('focus', function () { a.excitar('festival'); }); }
  }

  /* ------------------------------------------------------------------ 6. trilha da Categoria: menu das categorias do mesmo nível */
  function trilhaCategoria() {
    var pega = function () { var t = document.querySelector('[data-mvp-trilha]'); return t ? { b: t.querySelector('.mvp-trilha__b'), m: t.querySelector('.mvp-trilha__m'), t: t } : null; };
    var abrir = function (v, focar) {
      var x = pega(); if (!x) return;
      if (v) { // marca a categoria atual a cada abertura (a página troca de categoria sem recarregar o modelo)
        var atual = x.t.getAttribute('data-atual') || new URLSearchParams(location.search).get('c'), links = x.m.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) { if (links[i].getAttribute('data-slug') === atual) links[i].setAttribute('aria-current', 'page'); else links[i].removeAttribute('aria-current'); }
      }
      if (v) { x.m.hidden = false; void x.m.offsetWidth; } // sai do display:none sem animar; a abertura e o fechamento animam por CSS (data-aberto), o menu fechado fica invisível e fora do foco
      x.m.toggleAttribute('data-aberto', v); x.b.setAttribute('aria-expanded', v ? 'true' : 'false'); raizDoc.toggleAttribute('data-mvp-menu-aberto', v); // no celular o menu é tela inteira: a página não rola por baixo
      if (v && focar) { var alvo = x.m.querySelector('a[aria-current]') || x.m.querySelector('a'); if (alvo) alvo.focus(); }
    };
    var aberto = function () { var x = pega(); return !!x && x.m.hasAttribute('data-aberto'); };
    var ultimoClique = 0;
    document.addEventListener('click', function (e) {
      var x = pega(); if (!x) return;
      if (x.b.contains(e.target)) {
        // a prévia reenvia o clique de alguns botões: dois cliques em menos de 300 ms contam como um só
        var agora = Date.now(); if (agora - ultimoClique < 300) return; ultimoClique = agora;
        abrir(!aberto(), e.detail === 0); return; // e.detail 0 = teclado: o foco entra no menu
      }
      if (aberto() && e.target.closest && e.target.closest('.mvp-trilha__fechar')) { abrir(false); x.b.focus(); return; }
      if (aberto() && !x.m.contains(e.target)) abrir(false);
    });
    document.addEventListener('keydown', function (e) {
      var x = pega(); if (!x || !aberto()) return;
      if (e.key === 'Escape') { abrir(false); x.b.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      var l = Array.prototype.slice.call(x.m.querySelectorAll('a')), i = l.indexOf(document.activeElement);
      e.preventDefault();
      (e.key === 'Home' ? l[0] : e.key === 'End' ? l[l.length - 1] : l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length]).focus();
    });
    document.addEventListener('focusin', function (e) { var x = pega(); if (x && aberto() && !x.t.contains(e.target)) abrir(false); });
  }

  /* ------------------------------------------------------------------ 6b. typewriter da busca (UM código para a barra de navegação e para a busca da Home)
     Frases de exemplo «digitadas» e apagadas, uma por vez; com movimento reduzido, a frase só troca, devagar, sem digitar. `alvo`: o elemento que recebe o texto;
     `ativa()`: enquanto devolver verdadeiro a máquina continua (campo aberto e vazio, página visível); ao devolver falso ela para sozinha. */
  var EXEMPLOS = ['Bahia e Botafogo', 'Anitta no Rio', 'Madcool Madrid', 'Sorriso Maroto em São Paulo', 'Stand-up hoje à noite', 'Corrida de rua em Curitiba', 'Festival de jazz', 'Flamengo e Palmeiras'];
  function digitador(alvo, ativa) {
    var tw = { t: 0, n: 0 };
    function parar() { clearTimeout(tw.t); tw.t = 0; }
    function digitar() {
      parar(); var txt = EXEMPLOS[tw.n % EXEMPLOS.length], k = 0, apagando = false;
      if (reduz()) { alvo.textContent = txt; tw.n++; tw.t = setTimeout(function () { if (ativa()) digitar(); }, 3200); return; }
      (function passo() {
        if (!ativa()) return;
        alvo.textContent = txt.slice(0, k);
        if (!apagando && k < txt.length) { k++; tw.t = setTimeout(passo, 55 + Math.random() * 45); }
        else if (!apagando) { apagando = true; tw.t = setTimeout(passo, 1500); }
        else if (k > 0) { k--; tw.t = setTimeout(passo, 26); }
        else { tw.n++; tw.t = setTimeout(digitar, 380); }
      })();
    }
    return { iniciar: function () { alvo.textContent = ''; digitar(); }, parar: parar };
  }

  /* ------------------------------------------------------------------ 7. busca na barra de navegação */
  function buscaNav() {
    var pega = function () { var f = document.querySelector('[data-mvp-nb]'); return f ? { f: f, b: f.querySelector('.mvp-nb__abrir'), c: f.querySelector('.mvp-nb__campo'), i: f.querySelector('.mvp-nb__in'), tw: f.querySelector('.mvp-nb__tw') } : null; };
    var aberta = function (x) { return x.f.hasAttribute('data-aberta'); };
    // mede a barra: o campo ocupa o miolo (alinhado ao conteúdo da página), no máximo 48rem e centrado (mvp.css)
    var medir = function (x) {
      var h = x.f.closest('.hdr'), row = x.f.parentElement, hb = h.getBoundingClientRect(), rb = row.getBoundingClientRect(), cs = getComputedStyle(row);
      var st = h.style;
      st.setProperty('--mvp-nb-esq', (rb.left + (parseFloat(cs.paddingLeft) || 0) - hb.left) + 'px'); st.setProperty('--mvp-nb-dir', (hb.right - (rb.right - (parseFloat(cs.paddingRight) || 0))) + 'px');
    };
    // typewriter: as dicas «digitadas» sob o campo (digitador, seção 6b); só enquanto a busca está aberta e vazia
    var dig = null;
    var digitarNav = function (x) { if (!dig || dig.alvo !== x.tw) { if (dig) dig.parar(); dig = digitador(x.tw, function () { return aberta(x); }); dig.alvo = x.tw; } dig.iniciar(); };
    var abrir = function (v, semFoco) {
      var x = pega(); if (!x) return;
      if (v) medir(x);
      x.f.toggleAttribute('data-aberta', v); x.b.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) { x.i.focus({ preventScroll: true }); if (x.tw) digitarNav(x); }
      else { if (dig) dig.parar(); if (!semFoco) x.b.focus({ preventScroll: true }); }
    };
    document.addEventListener('click', function (e) {
      var x = pega(); if (!x) return;
      if (x.b.contains(e.target)) { abrir(true); return; }
      if (e.target.closest && e.target.closest('.mvp-nb__fechar')) { abrir(false); return; }
      if (e.target.closest && e.target.closest('.mvp-nb__veu')) { abrir(false); return; } // clique no véu: fecha
      if (aberta(x) && !x.f.contains(e.target) && !x.i.value) abrir(false, true);
    });
    document.addEventListener('input', function (e) { var x = pega(); if (x && e.target === x.i) x.f.toggleAttribute('data-tem-termo', !!x.i.value); }); // com termo digitado, a dica sai de cena
    document.addEventListener('focusin', function (e) { var x = pega(); if (x && aberta(x) && !x.f.contains(e.target) && !x.i.value) abrir(false, true); });
    document.addEventListener('keydown', function (e) { var x = pega(); if (x && aberta(x) && e.key === 'Escape' && x.f.contains(document.activeElement)) abrir(false); });
    window.addEventListener('resize', function () { var x = pega(); if (x && aberta(x)) medir(x); });
    // campo vazio não leva a lugar nenhum: a pessoa só segue para os resultados com um termo
    document.addEventListener('submit', function (e) { var x = pega(); if (x && e.target === x.f && !x.i.value.trim()) { e.preventDefault(); x.i.focus(); } });
  }

  /* ------------------------------------------------------------------ 7b. busca da Home: o mesmo typewriter da barra de navegação (digitador, seção 6b)
     A dica fica logo abaixo do campo, enquanto ele está vazio; com termo digitado ela some (transição de opacidade, o espaço fica reservado: nada salta). */
  function buscaHome() {
    var f = document.querySelector('[data-mvp="topo"] .hb-form'); if (!f) return;
    var tw = f.querySelector('.mvp-nb__tw'), inp = f.querySelector('.hb-in'); if (!tw || !inp) return;
    var visivel = true;
    var roda = function () { return visivel && !document.hidden && !inp.value; };
    var dig = digitador(tw, roda);
    var religar = function () { if (roda()) dig.iniciar(); else dig.parar(); };
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { var v = es[es.length - 1].isIntersecting; if (v !== visivel) { visivel = v; religar(); } }).observe(f); // fora da tela, sem relógio rodando
    document.addEventListener('visibilitychange', religar);
    inp.addEventListener('input', function () { f.toggleAttribute('data-tem-termo', !!inp.value); religar(); });
    religar();
  }

  /* ------------------------------------------------------------------ 8. Evento: areia em escuro no hero e cabeçalho mínimo fixo */
  function evento() {
    var hero = document.querySelector('.ev-hero');
    if (!hero) return;
    var a = areiaEm(hero, { estilo: 'pagode', semente: 29, tinta: [229, 229, 229], cor: [255, 74, 64], alfa: 0.34, densidade: 85, max: 12000 });
    document.addEventListener('mouseover', function (e) { var b = e.target.closest && e.target.closest('.ev-hero-cta .bp'); if (b && !b.contains(e.relatedTarget)) a.excitar(); });
    // o cartão de compra sobe para dentro do hero: a altura do hero vai para o CSS (mvp.css, «hero invertido»)
    var medirHero = function () { raizDoc.style.setProperty('--mvp-hero-alt', hero.offsetHeight + 'px'); };
    medirHero(); window.addEventListener('resize', medirHero); if (window.ResizeObserver) new ResizeObserver(medirHero).observe(hero);
    var ligado = null;
    var ver = function () { var on = hero.getBoundingClientRect().bottom < 8; if (on !== ligado) { ligado = on; raizDoc.toggleAttribute('data-mvp-evbar-on', on); } };
    window.addEventListener('scroll', ver, { passive: true }); window.addEventListener('resize', ver); ver();
    // o ícone do botão de compra faz o gesto ao chegar e, de tempos em tempos, de novo (no hover quem toca é o icones-motion.js)
    var tocar = function () {
      if (reduz() || document.hidden) return;
      var l = document.querySelectorAll('.btn-ic-ticket');
      for (var i = 0; i < l.length; i++) { var el = l[i], an = el.__anim; if (an && el.offsetParent && an.isPaused) { try { an.goToAndPlay(0, true); } catch (e) {} } }
    };
    setTimeout(tocar, 1400); setInterval(tocar, 9000);
  }

  /* ------------------------------------------------------------------ 5. carrosséis: cartão fora do carrossel fica com blur e transparência */
  function carrosseis() {
    // --mvp-fora por cartão: quanto dele está fora da faixa do carrossel (a coluna de conteúdo, .scr-wrap): 0 todo dentro, 1 todo fora; o CSS troca por blur e opacidade (mvp.css)
    var medir = function (sc) {
      var w = sc.parentElement.getBoundingClientRect(), fi = sc.children;
      for (var i = 0; i < fi.length; i++) {
        var r = fi[i].getBoundingClientRect(), dentro = Math.max(0, Math.min(r.right, w.right + 0.5) - Math.max(r.left, w.left - 0.5)), f = r.width ? Math.min(1, dentro / r.width) : 1;
        fi[i].style.setProperty('--mvp-fora', (1 - f).toFixed(3));
      }
    };
    var todos = function () { var l = document.querySelectorAll('.scr-wrap > [data-scroller]'); for (var i = 0; i < l.length; i++) medir(l[i]); };
    var quadro = 0;
    var agendar = function () { if (!quadro) quadro = requestAnimationFrame(function () { quadro = 0; todos(); }); };
    document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.nodeType === 1 && t.matches('.scr-wrap > [data-scroller]')) agendar(); }, { capture: true, passive: true });
    window.addEventListener('resize', agendar);
    if (window.MutationObserver) { // os cartões chegam depois do catálogo e trocam com os chips
      var mo = new MutationObserver(agendar), ligar = function () { var l = document.querySelectorAll('.scr-wrap > [data-scroller]'); for (var i = 0; i < l.length; i++) mo.observe(l[i], { childList: true }); };
      ligar(); setTimeout(ligar, 1500); setTimeout(ligar, 4000);
    }
    todos(); setTimeout(todos, 600); setTimeout(todos, 1500); setTimeout(todos, 4000);
  }

  function iniciar() {
    var topo = document.querySelector('[data-mvp="topo"]');
    if (topo) {
      var cv = topo.querySelector('canvas.mvp-areia'), areia = cv ? Areia(cv, { estilo: 'festival', semente: 11 }) : null;
      var hero = topo.querySelector('[data-mvp-hero]');
      if (hero) montarHero(hero, areia);
      cabecalho();
      buscaHome();
    }
    if (raizDoc.getAttribute('data-pagina') === 'categoria') { topoCategoria(); trilhaCategoria(); }
    if (raizDoc.getAttribute('data-pagina') === 'evento') trilhaCategoria();
    produtores();
    if (raizDoc.getAttribute('data-pagina') === 'home') carrosseis();
    if (raizDoc.getAttribute('data-pagina') === 'evento') evento();
    buscaNav();
  }
  // as telas são montadas pelo modelo (support.js): espera o topo existir
  function esperar(n) {
    var pag = raizDoc.getAttribute('data-pagina');
    var pronto = pag === 'home' ? document.querySelector('[data-mvp="topo"]') : document.querySelector('header.hdr');
    // o HTML chega com o modelo cru (<sc-if>, <sc-for>) e o React assume depois: mexer antes disso quebra a montagem
    if (pronto && !document.querySelector('sc-if, sc-for')) return iniciar();
    if (n < 200) setTimeout(function () { esperar(n + 1); }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { esperar(0); }); else esperar(0);
})();
