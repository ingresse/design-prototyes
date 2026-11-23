/* cidade-cabecalho.js: o seletor de LUGAR do cabeçalho (pedido do Wander, 27/10/2026; refeito em 29/10/2026 sobre o sistema de localização).
   Mostra o lugar escolhido (nome curto; PINO CHEIO = a pessoa escolheu ou aceitou a localização, SÓ TRAÇO = é o lugar padrão do protótipo) e, no clique, abre a MODAL
   «Onde você quer ver seus eventos?» (tools/previa/local/local-ui.js): um só componente, o IngresseModal. O popover antigo de cidades saiu.
   O estado é o IngresseLocal (tools/previa/local/local.js); window.IngresseCidade, que as telas antigas leem, é uma fachada dele (definida lá).
   Duas apresentações (só CSS, em cidade-cabecalho.css): completo (pino + nome + seta) e pino (celular). O motor de templates do v5.3 refaz partes do corpo: o botão é reposto a cada mudança do DOM. */
(function () {
  'use strict';
  if (window.__cidadeCabecalho) return;
  window.__cidadeCabecalho = true;
  var L = window.IngresseLocal;
  if (!L) return;

  var T = { escolher: 'Escolher lugar', trocar: function (n) { return 'Lugar: ' + n + '. Trocar'; } };

  function sincronizar() {
    var l = L.get();
    var bs = document.querySelectorAll('[data-cidade-btn]');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], nome = b.querySelector('[data-cidade-nome]');
      var marcado = l.origem !== 'padrao' ? 'true' : 'false';
      var rotulo = T.trocar(l.nome);
      if (b.getAttribute('data-marcado') !== marcado) b.setAttribute('data-marcado', marcado);
      if (nome && nome.textContent !== l.nome) nome.textContent = l.nome;
      if (b.getAttribute('aria-label') !== rotulo) b.setAttribute('aria-label', rotulo);
      if (b.getAttribute('aria-haspopup') !== 'dialog') b.setAttribute('aria-haspopup', 'dialog');
      if (b.hasAttribute('aria-expanded')) b.removeAttribute('aria-expanded'); // o botão abre um modal, não um popover
    }
  }
  var agendado = false;
  function agendar() { if (agendado) return; agendado = true; requestAnimationFrame(function () { agendado = false; sincronizar(); }); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var gat = t && t.closest ? t.closest('[data-cidade-btn]') : null;
    if (!gat) return;
    e.preventDefault();
    if (window.IngresseLocalUI) window.IngresseLocalUI.abrir({ gatilho: gat });
  }, true);
  document.addEventListener('ingresse:local', sincronizar);

  function iniciar() {
    sincronizar();
    new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
