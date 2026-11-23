/* icones-motion.js: ícones animados (Iconly Motion, Lottie) das "ocasiões" da Home e dos botões Quero ir, Compartilhar e Chamar a galera. Fonte: tools/previa/icones-motion.js; o gerador copia para previa/.
   Cada .oc-ic[data-lottie] fica PARADO no quadro de repouso e anima enquanto o mouse (ou o foco) está sobre o cartão .oc.
   Ao sair, o laço termina o ciclo em curso e volta ao repouso (sem pulo). Em movimento reduzido nada anima. Os arquivos vêm do mesmo domínio
   (assets/icones/<tag>.json, baixados por tools/buscar-icones.mjs); o traço é pintado de currentColor por CSS. Player: vendor/lottie_svg.min.js (lottie-web, MIT). */
(function () {
  // o motor de templates do v5.3 pode executar o <script> da helmet duas vezes
  if (window.__iconesMotion) return;
  window.__iconesMotion = true;

  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mq.matches || root.getAttribute('data-motion') === 'reduce'; }

  var cache = {};
  function carregar(url) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache[url];
  }

  function iniciar(el) {
    if (!window.lottie) return;
    var url = el.getAttribute('data-lottie');
    // o motor de templates REAPROVEITA o elemento quando a lista muda (Busca: Sports ↔ Tudo; filtros que reordenam) e só troca o atributo:
    // sem esta troca o ícone ficava o da lista anterior (29/10/2026: «Shows» com o cronômetro da corrida). Desfaz o anterior e refaz.
    if (el.__lt) {
      if (el.__ltUrl === url) return;
      if (el.__off) el.__off();
      if (el.__anim) { try { el.__anim.destroy(); } catch (e) {} el.__anim = null; }
      el.innerHTML = '';
    }
    el.__lt = true;
    el.__ltUrl = url;
    var repouso = parseInt(el.getAttribute('data-repouso') || '0', 10) || 0;
    var laco = el.getAttribute('data-loop') === '1';
    var cartao = el.closest('.oc, .cat-id, .esp-mod, .fac, .esp-perto, .esp-h2-ic'); // .esp-*: Home e filtros da Ingresse Sports (Esportes.dc.html) // .cat-id: título das páginas de categoria (Categoria.dc.html)
    var botao = el.classList.contains('btn-ic') ? el.closest('button, a') : null; // ícone de botão: um gesto no hover e no foco
    carregar(url).then(function (dados) {
      if (!dados || !document.contains(el)) { el.__lt = false; return; }
      if (el.getAttribute('data-lottie') !== url) return; // trocou de ícone enquanto o arquivo carregava: a nova leitura cuida
      var anim = window.lottie.loadAnimation({
        container: el, renderer: 'svg', loop: false, autoplay: false,
        animationData: JSON.parse(JSON.stringify(dados)),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false }
      });
      el.__anim = anim;
      var sobre = false;
      function repousar() { anim.goToAndStop(repouso, true); }
      anim.addEventListener('DOMLoaded', repousar);
      // ciclo terminou: se o mouse saiu (ou a animação é de um gesto só), volta ao quadro de repouso
      anim.addEventListener('complete', function () { if (!sobre || !laco) repousar(); });
      function entrar() {
        if (reduzido()) return;
        sobre = true;
        anim.setLoop(laco);
        if (anim.isPaused) anim.goToAndPlay(0, true);
      }
      function sair() {
        sobre = false;
        anim.setLoop(false); // termina o ciclo em curso e então repousa
        if (anim.isPaused) repousar();
      }
      var ouvintes = [];
      function ouvir(alvo, tipo, fn) { alvo.addEventListener(tipo, fn); ouvintes.push([alvo, tipo, fn]); }
      el.__off = function () { ouvintes.forEach(function (o) { o[0].removeEventListener(o[1], o[2]); }); ouvintes = []; };
      if (botao) {
        ouvir(botao, 'mouseenter', entrar);
        ouvir(botao, 'mouseleave', sair);
        ouvir(botao, 'focusin', entrar);
        ouvir(botao, 'focusout', sair);
        // "Quero ir": ligar toca o gesto uma vez (o preenchimento vem do CSS); desligar volta ao repouso sem animar
        if (botao.hasAttribute('aria-pressed')) {
          var ligado = botao.getAttribute('aria-pressed') === 'true';
          new MutationObserver(function () {
            var agora = botao.getAttribute('aria-pressed') === 'true';
            if (agora === ligado) return;
            ligado = agora;
            if (agora && !reduzido()) { anim.setLoop(false); anim.goToAndPlay(0, true); } else repousar();
          }).observe(botao, { attributes: true, attributeFilter: ['aria-pressed'] });
        }
      }
      if (cartao) {
        ouvir(cartao, 'mouseenter', entrar);
        ouvir(cartao, 'mouseleave', sair);
        ouvir(cartao, 'focusin', entrar);
        ouvir(cartao, 'focusout', sair);
      }
    });
  }

  function varrer() {
    var els = document.querySelectorAll('.oc-ic[data-lottie], .btn-ic[data-lottie], .cat-ic[data-lottie], .esp-lic[data-lottie]');
    for (var i = 0; i < els.length; i++) iniciar(els[i]);
  }

  // espera o player e o motor de templates; reaplica se a tela for refeita
  var tentativas = 0;
  (function esperar() {
    if (window.lottie) varrer();
    else if (tentativas++ < 100) { setTimeout(esperar, 100); return; }
    new MutationObserver(function () { varrer(); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lottie'] });
  })();
})();
