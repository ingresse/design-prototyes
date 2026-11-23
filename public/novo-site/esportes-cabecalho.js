/* esportes-cabecalho.js: a navegação do Ingresse Sports (só as modalidades) rola na horizontal quando não cabe; as pontas ganham um esmaecer (data-ini e data-fim em .esp-nav) e a modalidade
   ativa é trazida para a vista ao carregar. Fonte: tools/previa/esportes/cabecalho.js; o gerador copia para previa/esportes-cabecalho.js. Compartilhado com a página de evento esportivo.
   Delegado no document porque o motor de templates refaz o cabeçalho; só lê e escreve atributos (não anima nada: o esmaecer é CSS). */
(function () {
  'use strict';
  if (window.__espCabecalho) return;
  window.__espCabecalho = true;
  function atualizar(ul) {
    var nav = ul.closest('.esp-nav'); if (!nav) return;
    var ini = ul.scrollLeft > 2, fim = ul.scrollLeft < ul.scrollWidth - ul.clientWidth - 2;
    if (nav.getAttribute('data-ini') !== String(ini)) nav.setAttribute('data-ini', String(ini));
    if (nav.getAttribute('data-fim') !== String(fim)) nav.setAttribute('data-fim', String(fim));
  }
  function todas() { document.querySelectorAll('.esp-nav .esp-sub-links').forEach(atualizar); }
  document.addEventListener('scroll', function (e) { if (e.target && e.target.classList && e.target.classList.contains('esp-sub-links')) atualizar(e.target); }, true);
  window.addEventListener('resize', todas);
  var agendado = 0, jaCentrou = false, tentativas = 0;
  function iniciar() {
    todas();
    if (jaCentrou) return;
    var a = document.querySelector('.esp-nav [aria-current]'), ul = a && a.closest('.esp-sub-links');
    if (!ul || !a.offsetWidth || ul.scrollWidth <= ul.clientWidth) { if (a && tentativas++ < 40) agendado = requestAnimationFrame(function () { agendado = 0; iniciar(); }); return; } // espera o layout assentar
    jaCentrou = true;
    ul.scrollTo({ left: Math.max(0, a.offsetLeft - (ul.clientWidth - a.offsetWidth) / 2), behavior: 'instant' });
    todas();
  }
  new MutationObserver(function () { if (agendado) return; agendado = requestAnimationFrame(function () { agendado = 0; iniciar(); }); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
