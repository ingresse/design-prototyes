/* movimento-sucesso.js: o filme do pagamento ao sucesso (Isadora Nogueira, 27/10/2026; pedido do Wander: "TEM QUE SER FODA AQUI").
   Fonte: tools/previa/movimento-sucesso.js; o gerador copia para previa/movimento-sucesso.js e a tag entra só em Pagamento.dc.html.
   Documento: docs/design/MOVIMENTO-SUCESSO-PAGAMENTO.md (linha do tempo, tokens, medições, riscos). CSS: movimento-sucesso.css.

   Quatro atos, do toque em "Pagar" até a tela de sucesso assentada (ms a partir do toque, medidos; --motion-duration-slow = 480):
     1. O mergulho    0 a 480      uma cortina de tinta (a ilha escura) abre em clip-path circular a partir do botão; o conteúdo recua.
     2. O progresso   430 a 2160   Circle Loading + anel de progresso REAL (stroke-dashoffset, curva não linear) e três frases que trocam.
     3. O clímax      2160         o anel fecha, o recibo se desenha (Receipt bill success), e no estalo (quadro 46, ~2800): estouro, onda, vibração.
     4. A chegada     2880 a 4100  a cortina se recolhe para o centro, o ícone voa (FLIP) até o cartão de sucesso, o título entra palavra a palavra,
                                   o resto em cascata, um pulso no botão da Carteira e o foco no título.
   Só anima transform, opacity, clip-path e stroke-dashoffset (mais a cor do ícone em voo, uma exceção deliberada: ver o documento).
   Durações e curvas vêm dos tokens --motion-* de :root; em movimento reduzido (prefers-reduced-motion ou data-motion="reduce") não há cortina,
   estouro nem voo: troca direta com um fade curto e o ícone parado no quadro final. */
(function () {
  // o motor de templates do v5.3 pode executar o <script> da helmet duas vezes
  if (window.MovSucesso) return;
  var root = document.documentElement;
  if (root.getAttribute('data-pagina') !== 'pagamento') return;

  var URL_PROC = './assets/icones/processando.json'; // Circle Loading 3875: laço de 1,5 s, quadros 0 e 89 iguais
  var URL_OK = './assets/icones/sucesso.json';       // Receipt bill success 3062: 90 quadros a 60 fps; toca do 8 ao 89
  var Q_INI = 8, Q_FIM = 89, Q_ESTALO = 46;          // quadro 46 = o check termina de ser desenhado (0,63 s depois do quadro 8)
  var Q_ESP = 'esportes';                            // perfil da Ingresse Sports (a jornada de inscrição liga com ?esporte=<id>; ver jornada-esporte.js)

  /* ---------- tokens (motion.* de :root); em movimento reduzido valem 0 ---------- */
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
      instant: num('--motion-duration-instant', 80), fast: num('--motion-duration-fast', 160), base: num('--motion-duration-base', 280), slow: num('--motion-duration-slow', 480), hero: num('--motion-duration-hero', 800),
      stagger: num('--motion-stagger', 40),
      // tokens do filme (docs/design/TOKENS-INGRESSE-SPORTS.md, 2.4): o fade do movimento reduzido, a fase de progresso, o escalonamento da cascata, das palavras e dos dígitos
      reducedFade: num('--motion-duration-reduced-fade', 120), film: num('--motion-duration-film', 0),
      stCascade: num('--motion-stagger-cascade', 60), stWord: num('--motion-stagger-word', 50), stDigit: num('--motion-stagger-digit', 50),
      sm: num('--motion-distance-sm', 8), md: num('--motion-distance-md', 16),
      enter: tok('--motion-ease-enter') || 'cubic-bezier(.2,.7,.2,1)',
      exit: tok('--motion-ease-exit') || 'cubic-bezier(.4,0,1,1)',
      move: tok('--motion-ease-move') || 'cubic-bezier(.4,0,.2,1)'
    };
  }
  var mqReduzido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mqReduzido.matches || root.getAttribute('data-motion') === 'reduce'; }
  // a vertical esportiva: o filme de «Sua largada» (cartão de número de peito no lugar do recibo); fora dela, tudo igual ao filme do pagamento
  function perfilEsporte() { return !!(window.JornadaEsporte && window.JornadaEsporte.ativo && window.JornadaEsporte.ativo()); }
  var TXT_APROVADO = 'Pagamento aprovado';
  var temWAAPI = typeof Element !== 'undefined' && !!Element.prototype.animate;

  function anima(el, quadros, opcoes) { return el && temWAAPI ? el.animate(quadros, opcoes) : null; }
  function translada(dx, dy) { return 'translate(' + dx + 'px,' + dy + 'px)'; }

  /* ---------- Lottie: carrega uma vez, instancia onde precisar ---------- */
  var cache = {};
  function carregar(url) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache[url];
  }
  function lottieEm(el, url, laco) {
    return carregar(url).then(function (dados) {
      if (!dados || !window.lottie) return null;
      var anim = window.lottie.loadAnimation({
        container: el, renderer: 'svg', loop: !!laco, autoplay: false,
        animationData: JSON.parse(JSON.stringify(dados)), // o lottie altera os dados; cada instância leva uma cópia
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
      });
      return anim;
    });
  }
  // o check do recibo: os caminhos 1 e 2 em ordem de DOM (o 0 é o corpo). Sem exigir o atributo stroke: o Lottie só o escreve quando a camada aparece
  function marcarCheck(el) {
    var ps = el.querySelectorAll('path');
    for (var i = 1; i < ps.length && i <= 2; i++) ps[i].classList.add('ms-check');
  }
  function paraQuadro(anim, q) {
    if (!anim) return;
    var ir = function () { try { anim.goToAndStop(q, true); } catch (e) {} };
    if (anim.isLoaded) ir(); else anim.addEventListener('DOMLoaded', ir);
  }
  // pré-carrega os dois arquivos assim que a tela existe (34 KB + 1 KB): o clímax não espera a rede
  carregar(URL_PROC); carregar(URL_OK);

  /* ---------- estado do filme ---------- */
  var MS = window.MovSucesso = { ativo: false, disponivel: disponivel, rodar: rodar, aoAprovar: aoAprovar, cancelar: cancelar, trilha: [], t0: 0 };
  // marcos de tempo do filme (ms desde o toque), para medir e documentar: MovSucesso.trilha
  function marca(nome) { MS.trilha.push({ n: nome, ms: Math.round(performance.now() - MS.t0) }); }
  var filme = null;      // o filme em curso (limpeza em cancelar)
  var dormir = function (ms) { return new Promise(function (ok) { setTimeout(ok, Math.max(0, ms)); }); };

  function disponivel() { return !reduzido() && temWAAPI && !!window.lottie && !!document.getElementById('dc-root'); }

  /* ---------- anúncio e bloqueio ---------- */
  function regiaoViva() {
    var r = document.getElementById('ms-live');
    if (!r) {
      r = document.createElement('div');
      r.id = 'ms-live';
      r.className = 'sr-only';
      r.setAttribute('role', 'status');
      r.setAttribute('aria-live', 'polite');
      document.body.appendChild(r);
    }
    return r;
  }
  function anunciar(texto) { var r = regiaoViva(); r.textContent = ''; setTimeout(function () { r.textContent = texto; }, 30); }

  var TECLAS_ROLAGEM = { ' ': 1, PageUp: 1, PageDown: 1, Home: 1, End: 1, ArrowUp: 1, ArrowDown: 1 };
  function travarRolagem(ligar) {
    var f = travarRolagem.f || (travarRolagem.f = {
      parar: function (e) { e.preventDefault(); },
      tecla: function (e) { if (TECLAS_ROLAGEM[e.key] && e.target === document.body) e.preventDefault(); }
    });
    var m = ligar ? 'addEventListener' : 'removeEventListener';
    window[m]('wheel', f.parar, { passive: false });
    window[m]('touchmove', f.parar, { passive: false });
    window[m]('keydown', f.tecla);
  }
  function inerte(ligar) {
    var dc = document.getElementById('dc-root');
    if (!dc) return;
    if (ligar) dc.setAttribute('inert', ''); else dc.removeAttribute('inert');
  }

  /* ---------- peças da cena ---------- */
  function NS(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function criarCena(esp) {
    var raiz = document.createElement('div');
    raiz.className = 'ms-raiz ilha';
    raiz.setAttribute('data-ms-raiz', '');
    if (esp) raiz.setAttribute('data-perfil', Q_ESP);
    // a borda (um tom acima da cortina) vai um pouco à frente dela: o contorno do círculo aparece também no tema escuro, onde página e cortina quase se igualam
    var borda = document.createElement('div');
    borda.className = 'ms-borda';
    var cortina = document.createElement('div');
    cortina.className = 'ms-cortina';
    var palco = document.createElement('div');
    palco.className = 'ms-palco';
    var anel = document.createElement('div');
    anel.className = 'ms-anel';
    anel.style.opacity = '0';
    var prog = NS('svg', { 'class': 'ms-prog', viewBox: '0 0 200 200', 'aria-hidden': 'true' });
    prog.appendChild(NS('circle', { 'class': 'ms-trilha', cx: 100, cy: 100, r: 96 }));
    var barra = NS('circle', { 'class': 'ms-barra', cx: 100, cy: 100, r: 96, pathLength: 100 });
    prog.appendChild(barra);
    var proc = document.createElement('span');
    proc.className = 'ms-ic ms-proc';
    proc.setAttribute('aria-hidden', 'true');
    var hero = document.createElement('span');
    hero.className = 'ms-ic ms-hero';
    hero.setAttribute('aria-hidden', 'true');
    anel.appendChild(prog); anel.appendChild(proc); anel.appendChild(hero);
    var frases = document.createElement('div');
    frases.className = 'ms-frases';
    frases.setAttribute('aria-hidden', 'true');
    palco.appendChild(anel); palco.appendChild(frases);
    raiz.appendChild(borda); raiz.appendChild(cortina); raiz.appendChild(palco);
    document.body.appendChild(raiz);
    return { raiz: raiz, borda: borda, cortina: cortina, palco: palco, anel: anel, prog: prog, barra: barra, proc: proc, hero: hero, frases: frases };
  }

  /* ---------- as partes da página que recuam (e as que entram) ---------- */
  function partesDaPagina() {
    var dc = document.getElementById('dc-root');
    var p = [];
    if (!dc) return p;
    var h = dc.querySelector('.hdr');
    if (h) p.push({ el: h, so: true });
    var m = dc.querySelectorAll('main, aside.aside-sum, .cbar');
    for (var i = 0; i < m.length; i++) p.push({ el: m[i], so: false });
    return p;
  }

  /* ---------- as frases (cada uma entra e sai com o movimento da casa) ---------- */
  function criarFrases(lugar, t) {
    var atual = null;
    return function mostrar(texto, final) {
      var velha = atual;
      var novo = document.createElement('p');
      novo.className = 'ms-frase';
      if (final) novo.setAttribute('data-final', '');
      novo.textContent = texto;
      lugar.appendChild(novo);
      atual = novo;
      anima(novo, [{ opacity: 0, transform: translada(0, t.md) }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: velha ? t.fast : 0, easing: t.enter, fill: 'both' });
      if (velha) {
        var a = anima(velha, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
        if (a) a.finished.then(function () { velha.remove(); }, function () { velha.remove(); }); else velha.remove();
      }
    };
  }

  /* ---------- estouro: traços e pontos nos tons da identidade, num canvas centrado no ícone ---------- */
  function estouro(cena, t, esp) {
    var anel = cena.anel;
    var cv = document.createElement('canvas');
    cv.className = 'ms-estouro';
    cv.setAttribute('aria-hidden', 'true');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var L = 640;
    cv.width = L * dpr; cv.height = L * dpr;
    anel.appendChild(cv);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    var cs = getComputedStyle(cena.raiz);
    var cores = [cs.getPropertyValue('--color-text-primary').trim() || '#FAFAFA', cs.getPropertyValue('--color-fg-brand').trim() || '#FF4A40', cs.getPropertyValue('--color-alert-success-fg').trim() || '#4ADE80'];
    // esportes: branco 50%, vermelho claro da marca 33% (token do filme esportivo) e cinza claro 17% (a "tinta" visível sobre a cortina de tinta)
    if (esp) cores = [cs.getPropertyValue('--color-sport-film-particle-white').trim() || cores[0], cs.getPropertyValue('--color-sport-film-particle-accent').trim() || cores[1], cs.getPropertyValue('--color-text-tertiary').trim() || '#A3A3A3'];
    var pesos = [0, 0, 0, 1, 1, 2]; // 50% branco, 33% vermelho da marca, 17% verde de sucesso (esportes: cinza claro)
    var estreito = window.innerWidth < 640;
    var alcance = estreito ? 150 : 250, raio0 = estreito ? 66 : 74;
    var N = estreito ? 28 : 36, ps = [];
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.28;
      // a frase "Pagamento aprovado" mora logo abaixo do anel: as partículas que descem morrem antes de chegar nela
      var baixo = Math.abs(Math.sin(ang) - 1) < 0.2 ? 0.46 : 1;
      ps.push({ a: ang, cos: Math.cos(ang), sen: Math.sin(ang), ponto: i % 3 === 0, cor: cores[pesos[i % pesos.length] === 0 ? 0 : pesos[(i * 5 + 1) % pesos.length]],
        d: alcance * baixo * (0.62 + Math.random() * 0.38), dur: t.base * (2.1 + Math.random() * 0.7), len: 9 + Math.random() * 14, tam: 2.4 + Math.random() * 2.2 });
    }
    var ini = performance.now(), c = L / 2;
    (function quadro(agora) {
      ctx.clearRect(0, 0, L, L);
      var vivo = false;
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j], u = (agora - ini) / p.dur;
        if (u >= 1) continue;
        vivo = true;
        var e = 1 - Math.pow(1 - u, 3);                // ease de saída: arranca rápido e assenta
        var r = raio0 + (p.d - raio0) * e;
        ctx.globalAlpha = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
        ctx.fillStyle = p.cor; ctx.strokeStyle = p.cor;
        if (p.ponto) {
          ctx.beginPath(); ctx.arc(c + p.cos * r, c + p.sen * r, p.tam * (1 - 0.55 * u), 0, Math.PI * 2); ctx.fill();
        } else {
          var l = p.len * (1 - 0.7 * u);
          ctx.lineWidth = 3; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(c + p.cos * (r - l), c + p.sen * (r - l)); ctx.lineTo(c + p.cos * r, c + p.sen * r); ctx.stroke();
        }
      }
      if (vivo) requestAnimationFrame(quadro); else cv.remove();
    })(ini);
  }

  // onda: um anel que se expande a partir do anel de progresso e some
  function onda(cena, t) {
    var s = NS('svg', { 'class': 'ms-onda', viewBox: '0 0 200 200', 'aria-hidden': 'true' });
    s.appendChild(NS('circle', { cx: 100, cy: 100, r: 96 }));
    cena.anel.appendChild(s);
    var a = anima(s, [{ opacity: 0.85, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.5)' }], { duration: t.base * 2.5, easing: t.enter, fill: 'forwards' });
    if (a) a.finished.then(function () { s.remove(); }, function () { s.remove(); }); else s.remove();
  }

  /* =============================================================================================================
     O FILME
     op = { origem: botão de onde a cortina nasce, frases: [3 textos], decidir(): Promise<'ok'|'recusado'>,
            aprovar(): troca a página para o sucesso (quando o banco aprova), recusar(): mostra o aviso de recusa }
     No protótipo a decisão é imediata e o filme dura o mesmo; no site de verdade o anel espera em 62% até o banco responder.
     ============================================================================================================= */
  function rodar(op) {
    if (MS.ativo) return;
    MS.ativo = true;
    var t = T();
    var esp = perfilEsporte();
    var JE = esp ? window.JornadaEsporte : null;
    var APROVADO = esp ? JE.textoAprovado : TXT_APROVADO;
    var t0 = performance.now();
    MS.t0 = t0; MS.trilha = []; MS.epoca = performance.timeOrigin + t0;
    marca('toque');
    var ate = function (ms) { return dormir(ms - (performance.now() - t0)); };
    var vw = window.innerWidth, vh = window.innerHeight;
    var r = op.origem ? op.origem.getBoundingClientRect() : { left: vw / 2, top: vh, width: 0, height: 0 };
    var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    var R = Math.ceil(Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy))) + 2;
    var cena = criarCena(esp);
    var F = filme = { cena: cena, anims: [], recuo: [], vivo: true, estalou: false, esp: esp };

    // cronograma (ms desde o toque), tudo derivado de --motion-duration-slow: não há número solto
    var S = t.slow;
    var tMergulho = S;                     // a cortina cobre a tela
    var tPalco = S * 0.5;                  // o anel entra quando a cortina já passou da metade
    var tProg = S * 0.9;                   // o progresso começa quando a cortina quase fechou
    var film = t.film || S * 3.6;          // token motion.duration.film (= 3,6 x slow): as duas fases de progresso
    var dA = film * 0.625;                 // fase A: de 0 a 62% (arranca, depois desacelera: "conferindo com o banco")
    var dB = film * 0.375;                 // fase B: de 62 a 100% (acelera)
    var tFrases = [S * 1.1, S * 2.4, S * 3.4];
    var tAprova = tProg + dA;              // início da fase B: o banco respondeu
    var tClimax = tProg + dA + dB;
    var tChegada = tClimax + t.hero - t.instant; // o recibo está assentando (quadro 62 = 0,9 s): o voo começa nos últimos quadros dele
    // esportes: contorno do cartão (slow), dígitos em escalonamento (stDigit) e o estalo; a chegada vem logo depois (~3080 ms, a tela assenta em ~4,3 s)
    var NDIG = 5;
    var tEstalo = tClimax + t.slow + (NDIG - 1) * t.stDigit + t.fast;
    if (esp) tChegada = tEstalo + t.instant;
    var recolhe = S + t.fast;              // cortina e voo
    var Z = 62;                            // % do anel ao fim da fase A

    // bloqueio: nada é clicado nem focado atrás da cortina; o leitor de tela ouve o andamento
    inerte(true); travarRolagem(true);
    anunciar('Processando o pagamento');

    // a cena começa com o círculo zerado no botão
    var origemClip = 'circle(0px at ' + cx + 'px ' + cy + 'px)';
    cena.cortina.style.clipPath = origemClip; cena.borda.style.clipPath = origemClip;
    var folga = Math.round(t.instant / 4); // a cortina segue a borda com esta folga (e, ao se recolher, a borda segue a cortina): 20 ms, uma faixa de uns 80 px no pico da velocidade
    var pleno = 'circle(' + R + 'px at ' + cx + 'px ' + cy + 'px)';
    F.anims.push(anima(cena.borda, [{ clipPath: origemClip }, { clipPath: pleno }], { duration: tMergulho, easing: t.move, fill: 'forwards' }));
    F.anims.push(anima(cena.cortina, [{ clipPath: origemClip }, { clipPath: pleno }], { duration: tMergulho, delay: folga, easing: t.move, fill: 'forwards' }));

    // a página recua: só transform e opacity, e volta se a cortina se recolher de volta (cartão recusado)
    partesDaPagina().forEach(function (p) {
      var a = anima(p.el, [{ opacity: 1, transform: 'none' }, { opacity: p.so ? 0.5 : 0.4, transform: p.so ? 'none' : 'scale(0.97)' }], { duration: tMergulho, easing: t.move, fill: 'forwards' });
      if (a) F.recuo.push(a);
    });

    // o anel entra
    anima(cena.anel, [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: tPalco, easing: t.enter, fill: 'forwards' });

    // ícones: o laço de processamento e o herói (que fica pronto, parado e invisível, para o clímax não esperar)
    var proc = null, hero = null;
    lottieEm(cena.proc, URL_PROC, true).then(function (a) {
      if (!a || !F.vivo) return;
      proc = a;
      a.addEventListener('DOMLoaded', function () { a.goToAndPlay(0, true); });
      if (a.isLoaded) a.goToAndPlay(0, true);
    });
    if (!esp) lottieEm(cena.hero, URL_OK, false).then(function (a) {
      if (!a || !F.vivo) return;
      hero = a;
      paraQuadro(a, Q_INI);
      var pintar = function () { marcarCheck(cena.hero); };
      if (a.isLoaded) pintar(); else a.addEventListener('DOMLoaded', pintar);
    });
    // o herói nasce na caixa do cartão (--ms-slot) e cresce por escala até a caixa da cortina (--ms-box), centrado no anel
    var slotPx = parseFloat(getComputedStyle(root).getPropertyValue('--ms-slot')) || 144;
    var boxPx = cena.anel.offsetWidth || 200;
    var k0 = boxPx / slotPx;
    cena.hero.style.transform = 'scale(' + k0 + ')';

    // frases
    var mostrar = criarFrases(cena.frases, t);
    var frases = esp ? JE.frases(!!(op.frases && op.frases[0] === 'Conferindo o Pix'), JE.numeroInscricoes()) : (op.frases || []);
    frases.forEach(function (txt, i) { ate(tFrases[i]).then(function () { if (F.vivo && !F.final) mostrar(txt); }); });

    // progresso real: fase A (0 a 62%), depois B (62 a 100%) quando o banco responder
    var decisao = Promise.resolve(op.decidir ? op.decidir() : 'ok').catch(function () { return 'recusado'; });
    var faseA = anima(cena.barra, [
      { strokeDashoffset: 100, easing: 'cubic-bezier(0.15, 0.85, 0.3, 1)' },                  // arranca
      { strokeDashoffset: 100 - 44, offset: 0.34, easing: 'linear' },                         // 44% em um terço do tempo
      { strokeDashoffset: 100 - Z }                                                          // e desacelera: confere com o banco
    ], { duration: dA, delay: tProg, fill: 'forwards' });
    F.anims.push(faseA);

    ate(tProg + dA).then(function () { return decisao; }).then(function (resultado) {
      if (!F.vivo) return;
      return resultado === 'recusado' ? recusado() : aprovado();
    });

    /* ---------- cartão recusado: o anel para, a cortina se recolhe de volta ao botão, o botão treme ---------- */
    function recusado() {
      cena.anel.setAttribute('data-falha', '');
      F.final = true;
      if (faseA) faseA.pause();
      anima(cena.proc, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      mostrar('O pagamento não foi aprovado');
      anunciar('O pagamento não foi aprovado');
      return dormir(S * 1.25).then(function () {
        if (!F.vivo) return;
        try { op.recusar && op.recusar(); } catch (e) {}
        // a cortina volta ao botão e a página volta ao lugar
        var de = 'circle(' + R + 'px at ' + cx + 'px ' + cy + 'px)', para = 'circle(0px at ' + cx + 'px ' + cy + 'px)';
        var fecha = anima(cena.cortina, [{ clipPath: de }, { clipPath: para }], { duration: S, easing: t.move, fill: 'forwards' });
        anima(cena.borda, [{ clipPath: de }, { clipPath: para }], { duration: S, delay: folga, easing: t.move, fill: 'forwards' });
        anima(cena.palco, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
        F.recuo.forEach(function (a) { try { a.reverse(); } catch (e) {} });
        return dormir(S + folga);
      }).then(function () {
        if (!F.vivo) return;
        var alvo = (op.origem && op.origem.isConnected) ? op.origem : null;
        encerrar();
        if (alvo) {
          alvo.focus({ preventScroll: true });
          anima(alvo, [{ transform: 'none' }, { transform: translada(-t.sm, 0) }, { transform: translada(t.sm, 0) }, { transform: translada(-t.sm * 0.75, 0) }, { transform: translada(t.sm * 0.75, 0) }, { transform: translada(-t.sm * 0.375, 0) }, { transform: translada(t.sm * 0.375, 0) }, { transform: 'none' }], { duration: t.base * 1.3, easing: t.move });
        }
      });
    }

    /* ---------- aprovado: fase B, clímax, chegada ---------- */
    function aprovado() {
      // o banco respondeu: a página troca por baixo da cortina (no começo da fase B, quando o anel é mais lento)
      try { op.aprovar && op.aprovar(); } catch (e) {}
      marca('aprovado');
      var faseB = anima(cena.barra, [{ strokeDashoffset: 100 - Z }, { strokeDashoffset: 0 }], { duration: dB, easing: 'cubic-bezier(0.55, 0, 0.9, 0.45)', fill: 'forwards' });
      F.anims.push(faseB);
      var preparado = prepararChegada(F, t, esp);
      if (esp) {
        return ate(tClimax).then(function () { return preparado; }).then(function (p) {
          if (!F.vivo) return;
          F.final = true;
          marca('climax');
          anima(cena.proc, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
          var estalar = function () {
            if (F.estalou) return;
            F.estalou = true;
            marca('estalo');
            estouro(cena, t, true); onda(cena, t);
            if (navigator.vibrate) { try { navigator.vibrate([18, 40, 24]); } catch (e) {} }
            anunciar(APROVADO);
            mostrar(APROVADO, true);
          };
          if (p) formarNumeroDePeito(F, t, p, NDIG, estalar); else estalar();
          return ate(tChegada).then(function () { return p; });
        }).then(function (p) {
          if (!F.vivo) return;
          return chegar(F, t, p, recolhe, cx, cy, R, op);
        });
      }
      return ate(tClimax).then(function () {
        if (!F.vivo) return;
        F.final = true;
        marca('climax');
        // o laço de processamento sai e o recibo começa a se desenhar (o anel acabou de fechar)
        anima(cena.proc, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
        cena.hero.style.opacity = '1';
        if (hero) {
          var estalou = function () {
            if (F.estalou) return;
            F.estalou = true;
            marca('estalo');
            estouro(cena, t); onda(cena, t);
            if (navigator.vibrate) { try { navigator.vibrate([18, 40, 24]); } catch (e) {} }
            anunciar('Pagamento aprovado');
            mostrar('Pagamento aprovado', true);
          };
          hero.addEventListener('enterFrame', function (e) { if (e.currentTime >= Q_ESTALO - Q_INI) estalou(); });
          hero.playSegments([Q_INI, Q_FIM], true);
          // rede de segurança: se o laço de quadros engasgar, o estalo vem do relógio (quadro 46 = 38 quadros a 60 fps)
          setTimeout(estalou, ((Q_ESTALO - Q_INI) / 60) * 1000 + 250);
        } else {
          F.estalou = true; anunciar('Pagamento aprovado'); mostrar('Pagamento aprovado', true);
        }
        return ate(tChegada);
      }).then(function () { return preparado; }).then(function (p) {
        if (!F.vivo) return;
        return chegar(F, t, p, recolhe, cx, cy, R, op);
      });
    }
    return;
  }

  /* ---------- prepara a chegada: espera a página de sucesso existir e põe o ícone parado no cartão ---------- */
  function esperarSlot(esp) {
    return new Promise(function (ok) {
      var fim = performance.now() + 1500;
      (function t() {
        var s = document.querySelector(esp ? '.je-bib[data-primeiro="true"]' : '[data-ms-slot]'), h = document.getElementById('done-title');
        if (s && h) ok({ slot: s, titulo: h });
        else if (performance.now() < fim) requestAnimationFrame(t);
        else ok(null);
      })();
    });
  }
  function prepararChegada(F, t, esp) {
    // a página vai ao topo sem animar (tudo ainda está atrás da cortina) e o slot é medido já no lugar final
    return esperarSlot(esp).then(function (p) {
      if (!p) return null;
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (esp) { p.slot.style.opacity = '0'; p.esp = true; return p; }   // o cartão de largada fica invisível até o cartão do filme pousar nele
      return montarSlot(p.slot, false).then(function (slotAnim) { p.slotAnim = slotAnim; return p; });
    });
  }
  /* ---------- esportes: o número de peito se forma ----------
     O cartão de largada da página (já montado por baixo da cortina) é copiado para a cena: o contorno se desenha (stroke-dashoffset, slow), a faixa vermelha
     de 4 px entra no topo (clip-path), os textos aparecem e os dígitos entram rolando atrás de uma máscara (clip-path + transform), um a um (stagger-digit).
     No fim dos dígitos, o estalo (estouro, onda verde, vibração). Só transform, opacity, clip-path e stroke-dashoffset. */
  function formarNumeroDePeito(F, t, p, ndig, estalar) {
    var cena = F.cena, slot = p.slot;
    var r = slot.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
    var vw = window.innerWidth;
    var k0 = Math.min((cena.anel.offsetWidth || 200) * 2 / w, (vw - 32) / w);   // até 2x o anel (400 px) ou a largura da tela menos as margens
    var copia = slot.cloneNode(true);
    copia.removeAttribute('data-primeiro'); copia.removeAttribute('role'); copia.setAttribute('aria-hidden', 'true'); copia.style.opacity = '1';
    var el = document.createElement('div');
    el.className = 'ms-bib';
    el.setAttribute('data-desenha', '');
    el.style.cssText = 'width:' + w + 'px;height:' + h + 'px;margin:' + (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px;transform:scale(' + k0 + ');color:var(--color-text-primary)';
    var svg = NS('svg', { 'class': 'ms-bib-contorno', viewBox: '0 0 ' + w + ' ' + h });
    var rect = NS('rect', { x: 1, y: 1, width: w - 2, height: h - 2, rx: 8, pathLength: 100 });
    svg.appendChild(rect);
    el.appendChild(copia); el.appendChild(svg);
    ['.je-bib-topo', '.je-bib-rot', '.je-bib-pe'].forEach(function (sel) { var n = copia.querySelector(sel); if (n) n.setAttribute('data-ms-oculto', ''); });
    var faixa = copia.querySelector('.je-bib-faixa');
    if (faixa) faixa.style.clipPath = 'inset(0 100% 0 0)';
    cena.anel.appendChild(el);
    F.bib = { el: el, card: copia, k0: k0, w: w, h: h };
    // o anel de progresso e a frase descem do caminho do cartão: o anel some e a frase passa para baixo do cartão
    anima(cena.prog, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
    cena.frases.style.top = 'calc(50% + ' + Math.round(h * k0 / 2 + 32) + 'px)';
    anima(el, [{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' });
    anima(rect, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: t.slow, easing: t.move, fill: 'forwards' });
    if (faixa) anima(faixa, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: t.base, delay: Math.round(t.slow * 0.5), easing: t.enter, fill: 'both' });
    var textos = [].slice.call(copia.querySelectorAll('[data-ms-oculto]'));
    textos.forEach(function (n) { anima(n, [{ opacity: 0 }, { opacity: n.classList.contains('je-bib-rot') || n.classList.contains('je-bib-pe') ? 0.84 : 1 }], { duration: t.fast, delay: Math.round(t.slow * 0.6), easing: t.enter, fill: 'forwards' }); });
    setTimeout(function () { if (F.vivo) { el.removeAttribute('data-desenha'); svg.remove(); } }, t.slow);
    var ds = [].slice.call(copia.querySelectorAll('.je-d > span'));
    ds.forEach(function (d, i) { anima(d, [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: t.fast, delay: t.slow + i * t.stDigit, easing: t.enter, fill: 'forwards' }); });
    var n = Math.max(1, ds.length || ndig);
    setTimeout(function () { if (F.vivo) estalar(); }, t.slow + (n - 1) * t.stDigit + t.fast);
  }
  // o ícone herói do cartão: Lottie parado no quadro final; sem Lottie, um recibo em SVG
  function montarSlot(slot, visivel) {
    if (slot.querySelector('.ms-ic, .ms-fallback')) return Promise.resolve(null);
    var ic = document.createElement('span');
    ic.className = 'ms-ic';
    ic.style.opacity = visivel ? '1' : '0';
    slot.appendChild(ic);
    return lottieEm(ic, URL_OK, false).then(function (a) {
      if (!a) {
        ic.remove();
        var s = NS('svg', { 'class': 'ms-fallback', viewBox: '0 0 24 24' });
        s.appendChild(NS('path', { d: 'M6 3h12v18l-3-2-3 2-3-2-3 2z' }));
        s.appendChild(NS('path', { d: 'm9 11 2 2 4-4', 'class': 'ms-check' }));
        slot.appendChild(s);
        return null;
      }
      paraQuadro(a, Q_FIM);
      var pintar = function () { marcarCheck(ic); };
      if (a.isLoaded) pintar(); else a.addEventListener('DOMLoaded', pintar);
      return { anim: a, el: ic };
    });
  }

  /* ---------- Ato 4: a cortina se recolhe, o ícone voa, a página entra em cascata ---------- */
  function chegar(F, t, p, recolhe, cx, cy, R, op) {
    var cena = F.cena;
    var vw = window.innerWidth, vh = window.innerHeight;
    marca('chegada');
    if (!p) { encerrar(); return; } // a página de sucesso não veio: sem voo, a cortina some
    // o cartão já está montado por baixo: mede o lugar do ícone
    window.scrollTo({ top: 0, behavior: 'instant' });
    var rs = p.slot.getBoundingClientRect();
    var dx = Math.round((rs.left + rs.width / 2) - vw / 2), dy = Math.round((rs.top + rs.height / 2) - vh / 2);
    var esp = !!(p.esp && F.bib);
    var herdado = esp ? F.bib.el : cena.hero;
    var k0 = esp ? F.bib.k0 : (cena.anel.offsetWidth || 200) / (rs.width || 144);

    // as animações de recuo e de abertura saem (a página nova é outra árvore, mas o cabeçalho pode ser o mesmo nó)
    F.recuo.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    F.recuo = [];

    // 1. a cortina se recolhe para o centro (a página de sucesso aparece de fora para dentro)
    var de = 'circle(' + R + 'px at ' + cx + 'px ' + cy + 'px)', para = 'circle(0px at 50% 50%)';
    anima(cena.cortina, [{ clipPath: de }, { clipPath: para }], { duration: recolhe, easing: t.move, fill: 'forwards' });
    anima(cena.borda, [{ clipPath: de }, { clipPath: para }], { duration: recolhe, delay: Math.round(t.instant / 4), easing: t.move, fill: 'forwards' });
    // o anel de progresso, a onda e a frase saem de cena logo no começo
    anima(cena.prog, [{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
    anima(cena.frases, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' });

    // 2. o herói voa (FLIP: do centro, em escala k0, até o lugar e o tamanho do ícone do cartão); a cor acompanha a superfície em que ele está
    var corCortina = getComputedStyle(esp ? F.bib.card : herdado).color;
    var corCartao = getComputedStyle(p.slot).color;
    var paths = esp ? [] : herdado.querySelectorAll('.ms-check');
    // o instante em que o ícone sai da cortina e passa a estar sobre a página (cortina e voo usam a mesma curva, então o instante é o mesmo em "progresso"):
    // até aí o tom é o da cortina (claro), depois o do cartão (escuro no tema claro); a troca leva um intervalo curto em torno do cruzamento
    var pc = cruzamento(vw, vh, cx, cy, R, dx, dy, 0);
    var o1 = Math.max(0.04, pc - 0.03), o2 = Math.min(0.96, Math.max(o1 + 0.04, pc + 0.05));
    var voo = anima(herdado, esp ? [
      { transform: 'translate(0px, 0px) scale(' + k0 + ')', offset: 0 },
      { transform: translada(dx, dy) + ' scale(1)', offset: 1 }
    ] : [
      { transform: 'translate(0px, 0px) scale(' + k0 + ')', color: corCortina, offset: 0 },
      { color: corCortina, offset: o1 },
      { color: corCartao, offset: o2 },
      { transform: translada(dx, dy) + ' scale(1)', color: corCartao, offset: 1 }
    ], { duration: recolhe, easing: t.move, fill: 'forwards' });
    // esportes: o cartão passa do tom da cortina para o da página no cruzamento (cor, fundo e borda de um só elemento; mesma exceção do ícone em voo)
    if (esp) {
      var csA = getComputedStyle(F.bib.card), csB = getComputedStyle(p.slot);
      [['color', 'color', 'color'], ['backgroundColor', 'backgroundColor', 'backgroundColor'], ['borderColor', 'borderTopColor', 'borderTopColor']].forEach(function (x) {
        var a = csA[x[1]], b = csB[x[2]];
        if (a === b) return;
        var k1 = {}, k2 = {}, k3 = {}, k4 = {}; k1[x[0]] = a; k1.offset = 0; k2[x[0]] = a; k2.offset = o1; k3[x[0]] = b; k3.offset = o2; k4[x[0]] = b; k4.offset = 1;
        anima(F.bib.card, [k1, k2, k3, k4], { duration: recolhe, easing: t.move, fill: 'forwards' });
      });
      // a linha de percurso fecha em 100% e a bandeira ganha o vermelho junto da chegada
      try { window.JornadaEsporte.animarPercurso(4); } catch (e) {}
    }
    // (a cor do check: verde da cortina (#4ADE80) para o verde do cartão claro (#15803D); no escuro os dois são o mesmo)
    var verdeCartao = p.slotAnim ? getComputedStyle(p.slotAnim.el.querySelector('.ms-check') || p.slotAnim.el).stroke : '';
    paths.forEach(function (c) {
      var verdeCortina = getComputedStyle(c).stroke;
      if (verdeCartao && verdeCartao !== verdeCortina) anima(c, [{ stroke: verdeCortina, offset: 0 }, { stroke: verdeCortina, offset: o1 }, { stroke: verdeCartao, offset: o2 }, { stroke: verdeCartao, offset: 1 }], { duration: recolhe, easing: t.move, fill: 'forwards' });
    });

    // 3. a cascata da página de sucesso, com o movimento da casa (cada peça: translateY pequeno + opacidade)
    var seq = cascata(t, recolhe, esp);

    // 4. o fim do voo: o ícone do cartão (idêntico, no mesmo lugar) assume e a cena sai
    var fim = (voo ? voo.finished.then(function () {}, function () {}) : dormir(recolhe)).then(function () {
      if (p.slotAnim) p.slotAnim.el.style.opacity = '1';
      if (p.esp) p.slot.style.opacity = '1';
      return new Promise(function (ok) { requestAnimationFrame(function () { ok(); }); });
    }).then(function () {
      encerrar();
      marca('cortina-fora');
      // o foco vai ao título no fim da cascata; o botão da Carteira dá um pulso para chamar a ação (e o ícone da carteira faz o seu gesto)
      return dormir(Math.max(0, seq.fim - recolhe)).then(function () {
        var tt = document.getElementById('done-title');
        if (tt) tt.focus({ preventScroll: true });
        marca('foco-e-pulso');
        pulso(t);
      });
    });
    return fim;
  }

  // o primeiro "progresso" (0 a 1) em que o ícone em voo já saiu da cortina que se recolhe (círculo de centro e raio em movimento)
  function cruzamento(vw, vh, cx, cy, R, dx, dy, meio) {
    for (var i = 0; i <= 100; i++) {
      var q = i / 100;
      if (Math.hypot(dx * q - (cx - vw / 2) * (1 - q), dy * q - (cy - vh / 2) * (1 - q)) + meio > R * (1 - q)) return q;
    }
    return 1;
  }

  // peças da página de sucesso, em ordem de entrada: [elemento ou lista, atraso em ms desde o começo do recolhimento]
  function cascata(t, recolhe, esp) {
    var d = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    var passo = t.stCascade != null ? Math.round(t.stCascade) : Math.round(t.stagger * 1.5);   // token motion.stagger-cascade (60 ms)
    var palavra = t.stWord != null ? Math.round(t.stWord) : Math.round(t.stagger * 1.25);      // token motion.stagger-word (50 ms)
    var fim = 0;
    function entra(el, atraso, opcoes) {
      if (!el) return;
      opcoes = opcoes || {};
      var q = opcoes.quadros || [{ opacity: 0, transform: translada(0, opcoes.dy == null ? t.md : opcoes.dy) }, { opacity: 1, transform: 'none' }];
      anima(el, q, { duration: opcoes.dur || t.base, delay: atraso, easing: opcoes.ease || t.enter, fill: 'backwards' });
      fim = Math.max(fim, atraso + (opcoes.dur || t.base));
    }
    var base = Math.round(recolhe * 0.4);              // o título começa quando a cortina já abriu boa parte da tela
    // cabeçalho: só opacidade
    d('#dc-root .hdr').forEach(function (h) { entra(h, Math.round(recolhe * 0.3), { quadros: [{ opacity: 0 }, { opacity: 1 }], dur: t.fast }); });
    // título: palavra a palavra
    d('#done-title .ms-w').forEach(function (w, i) { entra(w, base + i * palavra, { dy: Math.round(t.md * 1.5) }); });
    var i0 = base + 2 * palavra;
    if (esp) {
      // esportes: os dígitos do número de peito já estão no cartão que pousou (não redigitam); o resto entra em cascata
      var k0 = 0;
      d('[data-je-cascata]').forEach(function (e) {
        if (e.matches('.je-atleta-bib[data-primeiro="true"]')) { var st = e.querySelector('.je-bib-st'); if (st) { entra(st, i0 + passo * k0); k0++; } return; }
        entra(e, i0 + passo * k0); k0++;
      });
      return { fim: fim };
    }
    // número do pedido: "digita" (revelação em passos, só clip-path)
    d('.done-burst .over').forEach(function (o) {
      var n = (o.textContent || '').length || 12;
      entra(o, i0 + passo, { quadros: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], dur: t.base, ease: 'steps(' + n + ', end)' });
    });
    d('.done-burst > p').forEach(function (e) { entra(e, i0 + passo * 2); });
    d('.done-acoes > *').forEach(function (e, i) { entra(e, i0 + passo * (3 + i)); });
    var k = 5;
    d('.done-pend').forEach(function (e) { entra(e, i0 + passo * k); k++; });
    d('.done-info').forEach(function (e) { entra(e, i0 + passo * k); });
    d('.done-info > div').forEach(function (e, i) { entra(e, i0 + passo * (k + 1 + i)); });
    return { fim: fim };
  }

  function pulso(t) {
    var b = document.getElementById('done-carteira');
    if (!b) return;
    anima(b, [{ transform: 'none' }, { transform: 'scale(' + (1 + (t.base ? 0.06 : 0)) + ')', offset: 0.4 }, { transform: 'none' }], { duration: t.slow, easing: t.move });
    var ic = b.querySelector('.btn-ic');
    if (ic && ic.__anim) { try { ic.__anim.setLoop(false); ic.__anim.goToAndPlay(0, true); } catch (e) {} } // a carteira faz o gesto uma vez
  }

  /* ---------- fim e limpeza ---------- */
  function encerrar() {
    var F = filme;
    if (F) {
      F.vivo = false;
      F.recuo.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      try { F.cena.raiz.remove(); } catch (e) {}
      filme = null;
    }
    inerte(false); travarRolagem(false);
    MS.ativo = false;
  }
  function cancelar() { if (filme) encerrar(); }

  /* ---------- sem filme (movimento reduzido ou script de cena indisponível): troca direta, fade curto, ícone no quadro final ---------- */
  function aoAprovar() {
    if (filme && filme.vivo) return;                   // o filme conduz a chegada
    window.scrollTo({ top: 0, behavior: 'instant' });
    var esp = perfilEsporte();
    esperarSlot(esp).then(function (p) {
      if (!p) return;
      if (!esp) montarSlot(p.slot, true);
      var main = p.slot.closest('main');
      if (main && temWAAPI) anima(main, [{ opacity: 0 }, { opacity: 1 }], { duration: T().reducedFade, easing: 'linear', fill: 'backwards' });
      anunciar(perfilEsporte() ? window.JornadaEsporte.textoAprovado : TXT_APROVADO);
      p.titulo.focus({ preventScroll: true });
    });
  }
})();
