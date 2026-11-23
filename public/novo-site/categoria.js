/* categoria.js: a parte "de DOM" das páginas de categoria (Categoria.dc.html). Fonte: tools/previa/categoria/categoria.js; o gerador copia para previa/.
   1. Cymatics do hero: a placa de Chladni na cor da categoria, desenhada pelo MESMO desenhador da prévia (previa.js §6, window.IngresseCym).
      A semente vem do destaque em cena (data-seed): ao trocar o destaque, a placa nova entra por cima (crossfade) e a antiga sai. Sem desfoque.
   2. Scroll infinito: um IntersectionObserver vigia a sentinela (#cat-sentinela) e avisa a página com o evento "cat:mais".
      A cada lote novo a sentinela é observada de novo (o navegador só avisa na mudança; sem isto, numa tela alta o lote seguinte não vinha).
   Movimento reduzido: o cymatics aparece já pronto (sem fade) e nada mais anima aqui. */
(function () {
  if (window.__categoriaJs) return; // o motor de templates pode executar o <script> da helmet duas vezes
  window.__categoriaJs = true;
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mq.matches || root.getAttribute('data-motion') === 'reduce'; }

  /* ---------- 1. cymatics do hero ---------- */
  function hero() { return document.querySelector('.cat-hero[data-cym="categoria"]'); }
  function rgb(s) { var p = (s || '').split(','); return p.length === 3 ? p.map(Number) : null; }
  function chave(h) { return [h.getAttribute('data-seed'), h.getAttribute('data-cor'), h.getAttribute('data-estilo')].join('|'); }
  function desenhar(cv, h) {
    if (!window.IngresseCym) return false;
    window.IngresseCym.desenhar(cv, Number(h.getAttribute('data-seed')) || 1, h.getAttribute('data-estilo'), rgb(h.getAttribute('data-cor')));
    return true;
  }
  var tentativasCym = 0;
  function atualizarCym() {
    var h = hero();
    if (!h || !h.getAttribute('data-seed')) return;
    if (!window.IngresseCym) { if (tentativasCym++ < 50) setTimeout(atualizarCym, 100); return; }
    var k = chave(h);
    var atual = h.querySelector(':scope > canvas.cat-cym:not(.is-out)');
    if (atual && atual.getAttribute('data-chave') === k) return;
    // Dois canvases por hero, RECICLADOS (nunca `.remove()`): o motor de templates (React) é dono dos filhos do hero e, ao trocar o esqueleto pelo destaque, ainda tentava tirar
    // um canvas que este script já havia removido (NotFoundError «removeChild … not a child of this node», intermitente, visto pela Mabi em 390 claro; 28/10/2026).
    var cv = h.querySelector(':scope > canvas.cat-cym.is-out');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      h.insertBefore(cv, h.firstChild);
    }
    cv.className = 'cat-cym';
    cv.setAttribute('data-chave', k);
    desenhar(cv, h);
    if (window.ResizeObserver && !h._obsCym) {
      h._obsCym = new ResizeObserver(function () {
        clearTimeout(h._tc);
        h._tc = setTimeout(function () { var c = h.querySelector(':scope > canvas.cat-cym:not(.is-out)'); if (c) desenhar(c, h); }, 120);
      });
      h._obsCym.observe(h);
    }
    if (atual) { atual.classList.remove('is-on'); atual.classList.add('is-out'); }
    if (reduzido()) cv.classList.add('is-on'); else setTimeout(function () { cv.classList.add('is-on'); }, 60);
  }

  /* ---------- 2. scroll infinito ---------- */
  var io = null, observada = null, ultima = '';
  function avisar(entradas) {
    for (var i = 0; i < entradas.length; i++) if (entradas[i].isIntersecting) document.dispatchEvent(new CustomEvent('cat:mais'));
  }
  function armar() {
    var s = document.getElementById('cat-sentinela');
    if (!window.IntersectionObserver) return; // sem o observador, fica o botão "Carregar mais eventos" (sempre presente)
    if (!io) io = new IntersectionObserver(avisar, { rootMargin: '0px 0px 640px 0px' });
    if (!s) { if (observada) { io.unobserve(observada); observada = null; ultima = ''; } return; }
    var k = s.getAttribute('data-lotes') + '/' + s.getAttribute('data-estado');
    if (observada === s && ultima === k) return;
    if (observada) io.unobserve(observada);
    observada = s; ultima = k;
    io.observe(s);
  }

  var agendado = false;
  function agendar() {
    if (agendado) return;
    agendado = true;
    var feito = false;
    function rodar() { if (feito) return; feito = true; agendado = false; atualizarCym(); armar(); }
    requestAnimationFrame(rodar);
    setTimeout(rodar, 150); // plano B: aba em segundo plano não dispara rAF (e sem isto a trava `agendado` ficaria presa)
  }
  new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-seed', 'data-cor', 'data-lotes', 'data-estado'] });
  agendar();
})();
