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
    // design-prototypes: 12 px menor que o maior tamanho que cabe (o título estava grande demais), sem passar do mínimo
    el.style.fontSize = Math.max(parseFloat(cs.getPropertyValue('--mvp-titulo-min')) || 30, Math.floor(lo) - 12) + 'px';
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
      '<div class="mvp-hero__txt" data-txt aria-live="off"><a class="bp bp-lg mvp-hero__cta" data-cta href="#"></a></div>' +
      '<div class="mvp-hero__pilha" data-pilha></div>' +
      '<div class="mvp-hero__ctrl" role="group" aria-label="Controles dos destaques">' +
        '<button type="button" class="bs mvp-hero__b" data-ant aria-label="Destaque anterior">' + ICO.ant + '</button>' +
        '<span class="mvp-hero__cont" aria-hidden="true"><b data-num>01</b> / ' + String(n).padStart(2, '0') + '</span>' +
        '<button type="button" class="bs mvp-hero__b" data-prox aria-label="Próximo destaque">' + ICO.prox + '</button>' +
        '<button type="button" class="bs mvp-hero__b" data-pausa></button>' +
        '<span class="mvp-hero__prog" aria-hidden="true"><i data-prog></i></span>' +
      '</div>';
    var cta = raiz.querySelector('[data-cta]');
    // o botão fixo fica no pé do texto; os blocos reservam o espaço dele (altura + o espaço que o separava do texto)
    function reservarCta() {
      var b = txt.querySelector('.mvp-hero__bloco:not([data-estado="sai"])');
      var gap = b ? parseFloat(getComputedStyle(b).rowGap) || 0 : 0;
      txt.style.setProperty('--mvp-cta-reserva', (cta.offsetHeight + gap) + 'px');
    }
    window.addEventListener('resize', reservarCta);
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
        '<p class="mvp-hero__desc">' + esc(it.texto) + '</p>'; // design-prototypes: o botão do destaque é fixo (data-cta), fora da transição
      return el;
    }
    function carta(idx, pos) {
      var it = itens[(idx + n) % n], a = document.createElement('a');
      a.className = 'mvp-hero__carta'; a.href = it.href; a.tabIndex = -1; a.setAttribute('aria-hidden', 'true');
      a.setAttribute('data-pos', pos);
      a.innerHTML = '<img src="' + esc(it.img) + '" alt="" decoding="async" width="560" height="560">';
      return a;
    }
    /* design-prototypes: a cada troca a carta da frente dá a volta e vai para o fundo do baralho (e as de trás sobem); voltando, a do
       fundo dá a volta e vem para a frente. A carta que viaja troca de imagem no meio do caminho, fora da pilha: o baralho continua
       mostrando o atual na frente e os dois seguintes atrás. Devolve false se a pilha não estiver completa (quem chama remonta). */
    var VIAGEM_MS = 900, ladoDoArraste = 0;
    function embaralhar(cartas, idx, sentido) {
      var por = {};
      for (var i = 0; i < cartas.length; i++) { if (cartas[i]._fim) cartas[i]._fim(); por[cartas[i].getAttribute('data-pos')] = cartas[i]; }
      var frente = por['0'], meio = por['1'], fundo = por['2'];
      if (!frente || !meio || !fundo) return false;
      var viaja = sentido > 0 ? frente : fundo, it = itens[((sentido > 0 ? idx + 2 : idx) % n + n) % n];
      if (sentido > 0) { meio.setAttribute('data-pos', '0'); fundo.setAttribute('data-pos', '1'); }
      else { frente.setAttribute('data-pos', '1'); meio.setAttribute('data-pos', '2'); }
      var img = viaja.querySelector('img');
      function trocar() { img.setAttribute('src', it.img); viaja.href = it.href; }
      if (reduz() || !viaja.animate) { viaja.setAttribute('data-pos', sentido > 0 ? '2' : '0'); trocar(); return true; }
      new Image().src = it.img;
      var de = getComputedStyle(viaja).transform;
      viaja.style.transform = ''; // se veio de um arraste, a carta parte de onde o dedo/mouse a deixou (de) e o resto é da animação
      viaja.style.transition = 'none';
      viaja.setAttribute('data-pos', sentido > 0 ? '2' : '0');
      var para = getComputedStyle(viaja).transform;
      // sai pelo lado (por cima da pilha indo, por baixo voltando), troca de camada fora da pilha e encaixa no lugar novo
      var paraDireita = ladoDoArraste ? ladoDoArraste > 0 : sentido > 0; ladoDoArraste = 0; // arrastada, sai para o lado em que foi jogada
      var fora = paraDireita ? 'translate(82%, -12%) rotate(16deg)' : 'translate(-82%, -12%) rotate(-16deg)';
      var zIda = sentido > 0 ? 4 : 0, zVolta = sentido > 0 ? 0 : 4;
      var anim = viaja.animate([
        { transform: de, zIndex: zIda, offset: 0, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
        { transform: fora, zIndex: zIda, offset: 0.46 },
        { transform: fora, zIndex: zVolta, offset: 0.47, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
        { transform: para, zIndex: zVolta, offset: 1 }
      ], { duration: VIAGEM_MS });
      var tTroca = setTimeout(trocar, VIAGEM_MS * 0.46);
      viaja._fim = function () { viaja._fim = null; clearTimeout(tTroca); trocar(); anim.cancel(); viaja.style.transition = ''; };
      anim.onfinish = function () { if (viaja._fim) { viaja._fim = null; viaja.style.transition = ''; } };
      return true;
    }
    /* design-prototypes: no desktop (texto e pilha lado a lado), o centro da pilha fica no centro do CONTÊINER do texto (a área reservada
       ao texto, com o botão «Ver evento» no pé), que tem a mesma altura em todo destaque: a pilha não pula quando o nome muda de tamanho.
       Desloca a pilha com translate; no celular, empilhado, não mexe. */
    var mqLado = window.matchMedia('(min-width: 1024px)');
    function centrarPilha() {
      if (!mqLado.matches) { pilha.style.translate = ''; return; }
      var rt = txt.getBoundingClientRect(), topo = rt.top, pe = rt.bottom;
      var atualY = parseFloat((pilha.style.translate || '0 0').split(' ')[1]) || 0, rp = pilha.getBoundingClientRect();
      var centroPilha = rp.top + rp.height / 2 - atualY;
      pilha.style.translate = '0 ' + Math.round((topo + pe) / 2 - centroPilha) + 'px';
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
      cta.href = itens[idx].href; cta.textContent = itens[idx].cta;
      reservarCta();
      ajustar(novo.querySelector('.mvp-hero__titulo'));
      centrarPilha(novo);
      requestAnimationFrame(function () { requestAnimationFrame(function () { novo.setAttribute('data-estado', 'fica'); }); });
      // pilha: a carta de cima sai voando por um lado, as de trás sobem e uma nova entra no fundo
      var cartas = pilha.querySelectorAll('.mvp-hero__carta:not([data-pos="sai"])');
      var prox = idx === (atual + 1) % n, ant = idx === (atual - 1 + n) % n;
      if (!cartas.length || !(prox || ant) || !embaralhar(cartas, idx, prox ? 1 : -1)) {
        for (var c = 0; c < cartas.length; c++) (function (v) { v.setAttribute('data-pos', 'sai'); v.setAttribute('data-lado', saida); setTimeout(function () { v.remove(); }, reduz() ? 0 : 700); })(cartas[c]);
        for (var p = 2; p >= 0; p--) pilha.appendChild(carta(idx + p, String(p)));
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
    // toque: arrastar para os lados no texto troca a chamada
    var x0 = null;
    raiz.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' && !e.target.closest('[data-pilha]')) x0 = e.clientX; });
    raiz.addEventListener('pointerup', function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 48) ir(atual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
    /* design-prototypes: clicar (ou tocar) e arrastar a carta da frente. Ela segue o ponteiro, inclinando; solta além do limite (ou num
       gesto rápido), a pilha sempre avança (a carta vai para o fundo e a próxima aparece), e a carta sai para o lado em que foi
       jogada. Antes do limite, volta ao lugar. Um arraste não abre o link da carta; um clique sem arrastar abre. */
    (function () {
      var LIMITE = 32, arr = null, arrastou = false; // 32 px já trocam; um peteleco (velocidade recente) troca com menos
      pilha.style.touchAction = 'pan-y'; pilha.style.userSelect = 'none'; pilha.style.webkitUserSelect = 'none';
      pilha.addEventListener('dragstart', function (e) { e.preventDefault(); });
      pilha.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var c = e.target.closest('.mvp-hero__carta[data-pos="0"]'); if (!c || c._fim) return;
        arr = { c: c, x: e.clientX, y: e.clientY, t: performance.now(), base: getComputedStyle(c).transform, dx: 0, ativo: false, id: e.pointerId };
        arrastou = false;
      });
      pilha.addEventListener('pointermove', function (e) {
        if (!arr || e.pointerId !== arr.id) return;
        var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
        if (!arr.ativo) {
          if (Math.abs(dx) < 6) return;
          if (Math.abs(dy) > Math.abs(dx)) { arr = null; return; } // gesto vertical: é rolagem
          arr.ativo = true; arrastou = true;
          try { pilha.setPointerCapture(e.pointerId); } catch (er) {}
          arr.c.style.transition = 'none'; raiz.setAttribute('data-arrastando', '');
          pausado = true; agendar();
        }
        arr.dx = dx;
        var agora = performance.now(); arr.hist = (arr.hist || []).concat([[agora, dx]]).filter(function (p) { return agora - p[0] < 120; });
        arr.c.style.transform = 'translate(' + dx + 'px, ' + (dy * 0.25) + 'px) rotate(' + (dx * 0.06) + 'deg) ' + (arr.base === 'none' ? '' : arr.base);
      });
      function soltar(e) {
        if (!arr || (e && e.pointerId !== arr.id)) return;
        var a = arr; arr = null;
        if (!a.ativo) return;
        raiz.removeAttribute('data-arrastando');
        // velocidade dos últimos ~120 ms (px/ms), não do gesto inteiro: um peteleco rápido conta mesmo depois de segurar a carta
        var h0 = (a.hist && a.hist[0]) || [a.t, 0], v = Math.abs(a.dx - h0[1]) / Math.max(16, performance.now() - h0[0]);
        pausado = raiz.matches(':hover');
        if (Math.abs(a.dx) > LIMITE || (Math.abs(a.dx) > 12 && v > 0.3)) {
          var s = 1; // para qualquer lado: a carta da frente vai para trás e a próxima aparece (só o lado da saída segue a jogada)
          ladoDoArraste = a.dx < 0 ? -1 : 1;
          if (s < 0) { a.c.style.transform = ''; a.c.style.transition = ''; } // voltando: a da frente desce para trás pela transição do CSS
          ir(atual + s, s);
        } else { a.c.style.transition = ''; a.c.style.transform = ''; agendar(); }
      }
      pilha.addEventListener('pointerup', soltar);
      pilha.addEventListener('pointercancel', soltar);
      // na janela, em captura: o clique que fecha um arraste é barrado antes de qualquer outro script do site (transições de página)
      window.addEventListener('click', function (e) { if (arrastou && pilha.contains(e.target)) { e.preventDefault(); e.stopPropagation(); arrastou = false; } }, true);
    })();
    var tRes = 0;
    var blocoAtual = function () { return txt.querySelector('.mvp-hero__bloco:not([data-estado="sai"])'); };
    window.addEventListener('resize', function () { clearTimeout(tRes); tRes = setTimeout(function () { var b = blocoAtual(); if (b) { ajustar(b.querySelector('.mvp-hero__titulo')); centrarPilha(b); } }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var b = blocoAtual(); if (b) { ajustar(b.querySelector('.mvp-hero__titulo')); centrarPilha(b); } });
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
  /* design-prototypes: tema das partículas pelo FUNDO de verdade (o primeiro fundo não transparente subindo a árvore, ou o da página):
     fundo claro, partículas pretas; fundo escuro, brancas. A cor de texto não serve: o topo herda texto claro mesmo no tema claro. */
  function fundoEscuro(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var m = (getComputedStyle(e).backgroundColor.match(/[\d.]+/g) || []).map(Number);
      if (m.length >= 3 && (m.length < 4 || m[3] > 0.5)) return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 128;
    }
    return false;
  }
  function corDoTema(el, alfa) { return fundoEscuro(el) ? 'rgba(255,255,255,' + alfa + ')' : 'rgba(0,0,0,' + alfa + ')'; }
  /** Chama fn quando o tema muda (o site aplica data-theme depois de carregar, e o sistema pode trocar claro/escuro). */
  function aoMudarTema(fn) {
    var q = 0, chamar = function () { cancelAnimationFrame(q); q = requestAnimationFrame(fn); };
    new MutationObserver(chamar).observe(raizDoc, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', chamar); }
    setTimeout(chamar, 300); setTimeout(chamar, 1500); // o tema do site pode chegar depois do primeiro desenho
  }
  /* design-prototypes: área limpa no centro da primeira dobra (as partículas só aparecem ao redor). Medida em pixels da dobra: o retângulo
     base (14% das laterais, 13% do topo, 66% da altura) cresce 88 px para cima e para cada lado e 32 px para baixo; borda desfocada (feGaussianBlur).
     Vai para --mvp-buraco, que o mvp.css soma ao degradê de baixo. Refaz ao redimensionar. */
  var BURACO_EXTRA = { cima: 56 + 32, lados: 56 + 32, baixo: 32 };
  function mascaraDoTopo(cv) {
    var feito = '';
    function desenhar() {
      var W = Math.round(cv.clientWidth), H = Math.round(cv.clientHeight);
      if (!W || !H || feito === W + 'x' + H) return;
      feito = W + 'x' + H;
      var x = Math.max(0, W * 0.14 - BURACO_EXTRA.lados), y = Math.max(0, H * 0.13 - BURACO_EXTRA.cima);
      var w = Math.min(W - x, W * 0.72 + 2 * BURACO_EXTRA.lados), h = Math.min(H - y, H * 0.79 + BURACO_EXTRA.baixo - y);
      var b = Math.round(Math.min(W, H) * 0.06);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
        '<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + b + '"/></filter>' +
        '<mask id="m"><rect width="' + W + '" height="' + H + '" fill="#fff"/><rect x="' + Math.round(x) + '" y="' + Math.round(y) + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" fill="#000" filter="url(#b)"/></mask></defs>' +
        '<rect width="' + W + '" height="' + H + '" fill="#000" mask="url(#m)"/></svg>';
      cv.style.setProperty('--mvp-buraco', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
    }
    desenhar();
    if (window.ResizeObserver) new ResizeObserver(desenhar).observe(cv); else window.addEventListener('resize', desenhar);
  }
  /* design-prototypes: o banner da home mostra os próximos eventos do Backstage (catálogo da ponte-backstage.js), não mais os destaques
     fixos do protótipo. Os 8 primeiros por data, à venda ou com venda para abrir, com capa. Sem catálogo, ficam os destaques fixos. */
  function destaquesDoBackstage() {
    return fetch('/api/eventos').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var evs = (d && d.events || []).filter(function (e) { return e.img && (e.situacao === 'venda' || e.situacao === 'nao-aberto' || e.situacao === 'esgotado'); });
      if (!evs.length) return;
      var nomes = {}; (d.categories || []).forEach(function (c) { nomes[c.slug] = c.name; });
      // sugestões da busca («Experimente buscar…»): artistas e eventos do catálogo, e categoria + cidade
      var sug = [];
      (d.artists || []).slice(0, 4).forEach(function (a) { sug.push(a.name); });
      evs.slice(0, 12).forEach(function (e) {
        var cidade = String(e.venue || '').split(' · ').pop().replace(/, [A-Z]{2}$/, '');
        var cat = nomes[(e.cats || [])[0]];
        if (cat && cidade && sug.length < 9) sug.push(cat + ' em ' + cidade);
      });
      sug = sug.filter(function (x, i) { return x && sug.indexOf(x) === i; });
      if (sug.length >= 3) { EXEMPLOS.length = 0; Array.prototype.push.apply(EXEMPLOS, sug); }
      DADOS.itens = evs.slice(0, 8).map(function (e) {
        var href = window.IngresseDestinos ? window.IngresseDestinos.evento(e) : 'Evento.dc.html';
        var sit = e.situacao === 'esgotado' ? 'Esgotado' : e.situacao === 'nao-aberto' ? 'Venda em breve' : null;
        return { tipo: 'evento', selo: sit || nomes[(e.cats || [])[0]] || 'Evento', nome: e.name, texto: e.resumo || '', data: e.date, local: e.venue, img: e.img, href: href, cta: 'Ver evento', estilo: 'festival' };
      });
    }).catch(function () {});
  }
  function produtores() {
    var sec = document.querySelector('[data-mvp="produtores"]');
    if (!sec) return;
    // design-prototypes: no lugar da areia, o campo de partículas do Backstage (campo-de-particulas.js); a cor segue o tema pelo fundo (fundoEscuro), como
    // useCorDeParticulas (preto translúcido no claro, branco no escuro), e o botão puxa para o vermelho da marca enquanto está em foco
    var cta = sec.querySelector('.bp');
    if (window.IngresseParticulas) {
      var cv = document.createElement('canvas');
      cv.className = 'mvp-particulas'; cv.setAttribute('aria-hidden', 'true');
      sec.insertBefore(cv, sec.firstChild);
      var base = corDoTema(sec, 0.16), marca = 'rgba(' + MARCA.join(',') + ',0.34)', acesa = false;
      var campo = window.IngresseParticulas.criar(cv, { cor: base, densidade: 0.9 });
      aoMudarTema(function () { base = corDoTema(sec, 0.16); if (!acesa) campo.cor(base); });
      if (cta) {
        var liga = function () { acesa = true; campo.cor(marca); }, desliga = function () { acesa = false; campo.cor(base); };
        cta.addEventListener('mouseenter', liga); cta.addEventListener('focus', liga);
        cta.addEventListener('mouseleave', desliga); cta.addEventListener('blur', desliga);
      }
    }
    parallaxProdutores(sec);
  }
  /* design-prototypes: parallax das fotos de «Para produtores». Na rolagem, cada foto anda numa velocidade e num sentido (as de cima e as de
     baixo se afastam do centro em ritmos diferentes), por transform; a flutuação (mvp-boia) segue no translate. Só calcula com a seção perto
     da tela, um quadro por vez; com movimento reduzido fica parado. */
  var VELOCIDADES = [0.22, -0.12, 0.16, -0.2, 0.1, -0.16];
  function parallaxProdutores(sec) {
    if (reduz()) return;
    var fotos = sec.querySelectorAll('.mvp-prod__f'), perto = false, pend = false;
    if (!fotos.length) return;
    function aplicar() {
      pend = false;
      var r = sec.getBoundingClientRect(), vh = window.innerHeight || 1;
      // -1 quando o centro da seção está no pé da tela, 0 no meio, 1 no topo
      var p = Math.max(-1.5, Math.min(1.5, (vh / 2 - (r.top + r.height / 2)) / vh));
      for (var i = 0; i < fotos.length; i++) fotos[i].style.setProperty('--py', (p * VELOCIDADES[i % VELOCIDADES.length] * vh).toFixed(1) + 'px');
    }
    function pedir() { if (perto && !pend) { pend = true; requestAnimationFrame(aplicar); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { perto = es[0].isIntersecting; pedir(); }, { rootMargin: '200px' }).observe(sec);
    else perto = true;
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    aplicar();
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
    // design-prototypes: a frase digitada vai para DENTRO do campo, no lugar do placeholder (que sai; o nome acessível segue no aria-label).
    // Fica por cima do input, sem receber clique, alinhada ao texto; some quando há termo (mvp.css, .mvp-hb__dica--dentro).
    var dica = f.querySelector('.mvp-hb__dica'), barra = f.querySelector('.hb-bar');
    if (dica && barra) {
      barra.appendChild(dica);
      dica.classList.add('mvp-hb__dica--dentro');
      inp.setAttribute('placeholder', '');
      var alinhar = function () {
        var csI = getComputedStyle(inp);
        dica.style.left = (inp.offsetLeft + (parseFloat(csI.paddingLeft) || 0)) + 'px';
        dica.style.right = (barra.clientWidth - inp.offsetLeft - inp.offsetWidth + (parseFloat(csI.paddingRight) || 0)) + 'px';
        dica.style.fontSize = csI.fontSize;
        dica.style.top = (inp.offsetTop + inp.offsetHeight / 2) + 'px'; // no celular a barra empilha campo e botão: centra na linha do input
      };
      alinhar();
      window.addEventListener('resize', alinhar);
      if (window.ResizeObserver) new ResizeObserver(alinhar).observe(barra);
    }
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
    // design-prototypes: no lugar da areia, a faixa do título do Guia de configuração do Backstage: campo de partículas com as mesmas
    // opções (densidade 2, escala 3, sem pausa), apagando para a esquerda, onde fica o texto (máscara no mvp.css). A cor segue o fundo.
    var a = { excitar: function () {} };
    if (window.IngresseParticulas) {
      var cvEv = hero.querySelector(':scope > canvas.mvp-areia');
      if (!cvEv) { cvEv = document.createElement('canvas'); cvEv.className = 'mvp-areia mvp-particulas-guia'; cvEv.setAttribute('aria-hidden', 'true'); hero.insertBefore(cvEv, hero.firstChild); }
      var corEv = corDoTema(hero, 0.16), marcaEv = 'rgba(' + MARCA.join(',') + ',0.34)', tEv = 0, acesoEv = false;
      var campoEv = window.IngresseParticulas.criar(cvEv, { cor: corEv, densidade: 2, escala: 3, parada: 0 });
      aoMudarTema(function () { corEv = corDoTema(hero, 0.16); if (!acesoEv) campoEv.cor(corEv); });
      a = { excitar: function () { if (reduz()) return; acesoEv = true; campoEv.cor(marcaEv); clearTimeout(tEv); tEv = setTimeout(function () { acesoEv = false; campoEv.cor(corEv); }, 700); } };
    } else a = areiaEm(hero, { estilo: 'pagode', semente: 29, tinta: [229, 229, 229], cor: [255, 74, 64], alfa: 0.34, densidade: 85, max: 12000 });
    document.addEventListener('mouseover', function (e) { var b = e.target.closest && e.target.closest('.ev-hero-cta .bp'); if (b && !b.contains(e.relatedTarget)) a.excitar(); });
    // o cartão de compra sobe para dentro do hero: a altura do hero vai para o CSS (mvp.css, «hero invertido»)
    var medirHero = function () { raizDoc.style.setProperty('--mvp-hero-alt', hero.offsetHeight + 'px'); };
    medirHero(); window.addEventListener('resize', medirHero); if (window.ResizeObserver) new ResizeObserver(medirHero).observe(hero);
    // design-prototypes: o cartão de compra ocupa a altura da tela menos o cabeçalho e 2× a margem que o separa do cabeçalho (a mesma
    // margem em cima e embaixo). Mede a margem e a altura do cabeçalho (--mvp-buy-margem, --mvp-cab-alt); a altura está no mvp.css.
    var cartao = document.querySelector('aside.buy .card'), cab = document.querySelector('.hdr');
    var medirMargem = function () {
      if (!cartao || !cab) return;
      var aside = cartao.closest('aside') || cartao;
      if (window.scrollY > 0) return; // o cartão é sticky: só mede com a página no topo (posição natural)
      // mede na posição natural: preso (sticky) ele ficaria no «top» que depende da própria margem e a medida entraria em laço
      var pos = aside.style.getPropertyValue('position'), pri = aside.style.getPropertyPriority('position');
      aside.style.setProperty('position', 'static', 'important'); // static, não relative: relative deslocaria pelo «top»
      // a entrada do cartão anima um deslocamento (transform): a medida desconta, senão pegaria a posição de partida
      var desloca = 0; try { desloca = new DOMMatrixReadOnly(getComputedStyle(aside).transform).m42 || 0; } catch (e) {}
      var topo = cartao.getBoundingClientRect().top - desloca, dentro = topo - (aside.getBoundingClientRect().top - desloca); // o cartão começa um pouco abaixo do aside
      if (pos) aside.style.setProperty('position', pos, pri); else aside.style.removeProperty('position');
      raizDoc.style.setProperty('--mvp-cab-alt', cab.offsetHeight + 'px');
      // a margem é a metade da natural (24/11/2026): o cartão sobe o que falta (--mvp-buy-recuo). A natural soma o recuo já aplicado,
      // senão cada nova medida cortaria pela metade de novo.
      var recuo = parseFloat(getComputedStyle(raizDoc).getPropertyValue('--mvp-buy-recuo')) || 0;
      var natural = Math.max(0, topo + recuo - cab.getBoundingClientRect().bottom), margem = Math.round(natural / 2);
      raizDoc.style.setProperty('--mvp-buy-recuo', (natural - margem) + 'px');
      raizDoc.style.setProperty('--mvp-buy-margem', margem + 'px');
      raizDoc.style.setProperty('--mvp-buy-topo', Math.round(cab.offsetHeight + margem - dentro) + 'px'); // «top» do sticky: o cartão preso fica à mesma margem
      larguraDoCartao();
    };
    // a largura do cartão acompanha o pôster: com a altura do cartão fixa, o pôster fica com o que sobra depois de preço e botão; a largura
    // é a que deixa o pôster na proporção dele (sem recorte). Preço e botão mudam de altura com a largura (o preço quebra linha), então
    // repete até assentar. Vai para --layout-aside-width, que o site usa para o cartão e para a folga do texto do hero.
    var larguraDoCartao = function () {
      var img = cartao && cartao.querySelector('.mvp-buy-img');
      if (!img || !window.matchMedia('(min-width: 1024px)').matches) { raizDoc.style.removeProperty('--layout-aside-width'); return; }
      var prop = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 810 / 1080;
      var borda = cartao.offsetWidth - cartao.clientWidth;
      for (var i = 0; i < 3; i++) {
        var alt = cartao.getBoundingClientRect().height, fixo = alt - img.getBoundingClientRect().height;
        var w = Math.round(Math.max(280, Math.min(416, (alt - fixo) * prop + borda)));
        if (Math.abs(w - cartao.offsetWidth) < 2) break;
        raizDoc.style.setProperty('--layout-aside-width', w + 'px');
      }
    };
    if (cartao) { var imgC = cartao.querySelector('.mvp-buy-img'); if (imgC) imgC.addEventListener('load', function () { requestAnimationFrame(larguraDoCartao); }); }
    // mede quadro a quadro até a posição do cartão parar de mudar (o hero e a largura do cartão se ajustam em cadeia), no máximo ~1 s
    var laco = 0;
    var medirDepois = function () {
      cancelAnimationFrame(laco); var ultimo = null, iguais = 0, n = 0;
      (function passo() {
        medirMargem();
        var a = cartao ? Math.round(cartao.getBoundingClientRect().top) + ':' + cartao.offsetWidth + ':' + Math.round(cartao.getBoundingClientRect().height) : '';
        iguais = a === ultimo ? iguais + 1 : 0; ultimo = a;
        if (iguais < 3 && ++n < 60) laco = requestAnimationFrame(passo);
      })();
    };
    medirDepois(); window.addEventListener('resize', medirDepois); if (window.ResizeObserver) new ResizeObserver(medirDepois).observe(hero);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirDepois);
    [400, 1200, 2500].forEach(function (ms) { setTimeout(medirDepois, ms); }); // a página monta em etapas (motor de templates, dados do BFF)
    window.addEventListener('scroll', function () { if (window.scrollY === 0) medirMargem(); }, { passive: true });
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
      var cv = topo.querySelector('canvas.mvp-areia'), areia = null;
      // design-prototypes: no fundo da primeira dobra, o campo de partículas do Backstage (campo-de-particulas.js) no lugar da areia; a cada
      // troca de destaque as partículas puxam para o vermelho da marca e voltam (o papel que o «excitar» da areia fazia). Sem o script, a areia.
      if (cv && window.IngresseParticulas) {
        var corBase = corDoTema(topo, 0.22), corMarca = 'rgba(' + MARCA.join(',') + ',0.5)', pulsando = false; // mais opacas que as de «Para produtores»
        var campo = window.IngresseParticulas.criar(cv, { cor: corBase, densidade: 3.6, parada: 0, ciclo: 4000, repeticoes: 2 }), tVolta = 0; // quatro vezes as de «Para produtores»; parada 0: a figura nunca para; ciclo 4 s: troca 4x mais rápido que no Backstage (16 s); repeticoes 2: o dobro de células da figura em cada direção
        aoMudarTema(function () { corBase = corDoTema(topo, 0.22); if (!pulsando) campo.cor(corBase); });
        areia = { excitar: function () { if (reduz()) return; pulsando = true; campo.cor(corMarca); clearTimeout(tVolta); tVolta = setTimeout(function () { pulsando = false; campo.cor(corBase); }, 700); } };
        mascaraDoTopo(cv);
      } else if (cv) areia = Areia(cv, { estilo: 'festival', semente: 11 });
      var hero = topo.querySelector('[data-mvp-hero]');
      if (hero) destaquesDoBackstage().then(function () { montarHero(hero, areia); });
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
