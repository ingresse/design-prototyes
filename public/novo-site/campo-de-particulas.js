/* campo-de-particulas.js: porte em JavaScript puro do CampoDeParticulas do Backstage
   (src/produtos/backstage/components/campo-de-particulas.tsx), para o site estático. Arquivo do design-prototypes, não veio do deploy.

   Figura de Chladni: cada partícula dá um passo aleatório de amplitude proporcional a |f(x,y)|,
     f(x,y) = a·sin(πnx)·sin(πmy) + b·sin(πmx)·sin(πny)
   Onde a placa vibra forte ela é chutada longe; na linha nodal quase para. Com o tempo todas escorrem para as linhas paradas e a figura
   aparece sozinha; a placa troca de modo aos poucos. Mesmas constantes do Backstage. Canvas 2D nativo; respeita reduzir movimento (pinta a
   figura já assentada), só anima visível e com a aba à vista, e nunca derruba a tela: qualquer falha só deixa de desenhar.

   window.IngresseParticulas.criar(canvas, { cor, densidade, escala, parada, ciclo, repeticoes }) -> { cor(novaCor), parar() }
   ciclo: duração de cada figura em ms (16000, como no Backstage); menor troca mais rápido.
   repeticoes: multiplica as frequências da placa (1, como no Backstage); 2 = o dobro de células da figura em cada direção.
   A cor muda sem reiniciar a figura, misturando em 250 ms (como o hover do banner da criação de evento). */
(function () {
  if (window.IngresseParticulas) return;
  var MAX = 24000, MIN = 2000, PX_POR_PARTICULA = 14, V = 0.02, PASSO_MINIMO = 0.002, CICLO_MS = 16000, PARADA = 0.72, TROCA_DE_COR_MS = 250;
  var MODOS = [[3, 5, 1, 1], [4, 7, 1, -1], [2, 5, 1, 1], [5, 8, -1, 1], [3, 8, 1, 1], [4, 6, 1, -1]];
  function suavizar(t) { return t * t * (3 - 2 * t); }
  function lerCor(cor) {
    var c = document.createElement('canvas').getContext('2d');
    if (!c) return [255, 255, 255, 0.15];
    c.fillStyle = cor;
    var n = c.fillStyle;
    if (n.charAt(0) === '#') return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16), 1];
    var m = (n.match(/[\d.]+/g) || [255, 255, 255, 0.15]).map(Number);
    return [m[0], m[1], m[2], m[3] == null ? 1 : m[3]];
  }
  function aleatorio(semente) {
    return function () {
      semente = (semente + 0x6d2b79f5) | 0;
      var t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function criar(canvas, opt) {
    opt = opt || {};
    var densidade = opt.densidade || 1, escala = opt.escala || 1, parada = opt.parada == null ? PARADA : opt.parada, ciclo = opt.ciclo || CICLO_MS, repeticoes = opt.repeticoes || 1;
    var corPedida = opt.cor || 'rgba(255,255,255,0.15)';
    var ctx;
    try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return { cor: function () {}, parar: function () {} };

    var reduzir = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    var rand = aleatorio(0x9e3779b9);
    var largura = 0, altura = 0, proporcao = 1, quadro = 0, rodando = false, visivel = false, vivo = true;
    var r0 = canvas.getBoundingClientRect();
    var total = Math.round(densidade * Math.min(MAX, Math.max(MIN, Math.round((Math.max(1, r0.width) * Math.max(1, r0.height)) / PX_POR_PARTICULA))));
    var xs = new Float32Array(total), ys = new Float32Array(total);
    for (var i = 0; i < total; i++) { xs[i] = rand(); ys[i] = rand(); }

    function redimensionar() {
      var r = canvas.getBoundingClientRect();
      largura = Math.max(1, Math.floor(r.width)); altura = Math.max(1, Math.floor(r.height));
      proporcao = largura / altura;
      canvas.width = largura; canvas.height = altura;
    }
    function modoEm(indice) {
      var md = MODOS[((indice % MODOS.length) + MODOS.length) % MODOS.length], d = Math.max(1, escala) / Math.max(1, repeticoes);
      return { m: Math.max(1, Math.round(md[0] / d)), n: Math.max(1, Math.round(md[1] / d)), a: md[2], b: md[3],
        mx: Math.max(1, Math.round((md[0] * proporcao) / d)), nx: Math.max(1, Math.round((md[1] * proporcao) / d)) };
    }
    var modo = modoEm(0);
    function definirModo(tempo) {
      var c = tempo / ciclo, indice = Math.floor(c), fase = c - indice, de = modoEm(indice), pausa = Math.min(Math.max(parada, 0), 0.99);
      if (fase <= pausa) { modo = de; return; }
      var para = modoEm(indice + 1), k = suavizar((fase - pausa) / (1 - pausa));
      var mix = function (x, y) { return x + (y - x) * k; };
      modo = { m: mix(de.m, para.m), n: mix(de.n, para.n), a: mix(de.a, para.a), b: mix(de.b, para.b), mx: mix(de.mx, para.mx), nx: mix(de.nx, para.nx) };
    }
    function chladni(x, y) {
      return modo.a * Math.sin(Math.PI * modo.nx * x) * Math.sin(Math.PI * modo.m * y) + modo.b * Math.sin(Math.PI * modo.mx * x) * Math.sin(Math.PI * modo.n * y);
    }
    function passo() {
      for (var i = 0; i < total; i++) {
        var amp = V * Math.abs(chladni(xs[i], ys[i]));
        if (amp <= PASSO_MINIMO) amp = PASSO_MINIMO;
        var nx = xs[i] + (rand() * 2 - 1) * amp, ny = ys[i] + (rand() * 2 - 1) * amp;
        xs[i] = nx < 0 ? 0 : nx > 1 ? 1 : nx; ys[i] = ny < 0 ? 0 : ny > 1 ? 1 : ny;
      }
    }
    var mostrada = lerCor(corPedida), alvo = mostrada, origem = mostrada, pedidaVista = corPedida, inicioDaTroca = 0;
    function corDoQuadro(tempo) {
      if (corPedida !== pedidaVista) { pedidaVista = corPedida; origem = mostrada; alvo = lerCor(corPedida); inicioDaTroca = tempo; }
      var k = reduzir ? 1 : suavizar(Math.min(1, (tempo - inicioDaTroca) / TROCA_DE_COR_MS));
      mostrada = origem.map(function (v, i) { return v + (alvo[i] - v) * k; });
      return 'rgba(' + Math.round(mostrada[0]) + ',' + Math.round(mostrada[1]) + ',' + Math.round(mostrada[2]) + ',' + mostrada[3].toFixed(3) + ')';
    }
    function pintar(tempo) {
      tempo = tempo == null ? performance.now() : tempo;
      ctx.clearRect(0, 0, largura, altura);
      ctx.fillStyle = corDoQuadro(tempo);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < total; i++) ctx.fillRect(xs[i] * largura, ys[i] * altura, 1, 1);
      ctx.globalCompositeOperation = 'source-over';
    }
    function desenhar(tempo) {
      try { definirModo(tempo); passo(); pintar(tempo); if (rodando) quadro = requestAnimationFrame(desenhar); }
      catch (e) { rodando = false; }
    }
    function iniciar() { if (rodando || reduzir || !vivo || !visivel || document.hidden) return; rodando = true; quadro = requestAnimationFrame(desenhar); }
    function parar() { rodando = false; cancelAnimationFrame(quadro); }

    redimensionar();
    definirModo(0);
    if (window.ResizeObserver) new ResizeObserver(redimensionar).observe(canvas);
    document.addEventListener('visibilitychange', function () { if (document.hidden) parar(); else iniciar(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel) iniciar(); else parar(); }, { rootMargin: '80px' }).observe(canvas);
    else visivel = true;

    if (reduzir) { try { for (var k = 0; k < 600; k++) passo(); pintar(); } catch (e) { /* decoração: falhar não leva a tela junto */ } }
    else iniciar();

    return {
      cor: function (nova) { corPedida = nova; if (reduzir) pintar(); },
      parar: function () { vivo = false; parar(); }
    };
  }

  window.IngresseParticulas = { criar: criar };
})();
