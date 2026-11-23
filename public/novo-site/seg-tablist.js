/* seg-tablist.js: teclado do segmentado (.seg com role="tablist"), uma implementação para a Busca e a Carteira. Fonte: tools/previa/busca/seg-tablist.js; o gerador copia para previa/.
   Esquerda e Direita (e Cima e Baixo) trocam e ATIVAM a aba (o painel é local e barato), Home e End vão à primeira e à última; só a aba ativa entra na ordem de Tab (tabindex móvel).
   Delegado no document: o motor de templates refaz o DOM. Só lê e escreve atributos; não anima nada. */
(function () {
  'use strict';
  if (window.__segTablist) return;
  window.__segTablist = true;
  function abas(l) { return [].slice.call(l.children).filter(function (x) { return x.getAttribute('role') === 'tab'; }); }
  function sincronizar(l) {
    var t = abas(l); if (!t.length) return;
    var sel = t.filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0] || t[0];
    t.forEach(function (x) { var v = x === sel ? '0' : '-1'; if (x.getAttribute('tabindex') !== v) x.setAttribute('tabindex', v); });
  }
  /* indicador deslizante (.seg[data-desliza]): abas de larguras livres, então o indicador é medido (posição e largura da aba ativa); a tela só anima transform */
  function medir(l) {
    if (!l.hasAttribute('data-desliza')) return;
    var a = abas(l).filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0], ind = l.querySelector('.seg__ind');
    if (!a || !ind || !a.offsetWidth) return;
    l.style.setProperty('--ind-x', a.offsetLeft + 'px'); l.style.setProperty('--ind-w', String(a.offsetWidth));
    if (!l.hasAttribute('data-pronto')) requestAnimationFrame(function () { requestAnimationFrame(function () { l.setAttribute('data-pronto', ''); }); }); // a 1ª posição não anima
  }
  var ro = window.ResizeObserver ? new ResizeObserver(function () { [].forEach.call(document.querySelectorAll('.seg[data-desliza]'), medir); }) : null;
  function todas() { [].forEach.call(document.querySelectorAll('.seg[role="tablist"]'), function (l) { sincronizar(l); medir(l); if (ro && l.hasAttribute('data-desliza') && !l.__ro) { l.__ro = true; ro.observe(l); } }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { todas(); });
  document.addEventListener('keydown', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.seg[role="tablist"] > [role="tab"]') : null;
    if (!a || e.altKey || e.ctrlKey || e.metaKey) return;
    var ts = abas(a.parentElement), i = ts.indexOf(a), j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % ts.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + ts.length) % ts.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = ts.length - 1;
    if (j < 0) return;
    e.preventDefault();
    ts[j].focus();
    if (ts[j].getAttribute('aria-selected') !== 'true') ts[j].click();
  });
  var agendado = 0;
  new MutationObserver(function () { if (agendado) return; agendado = requestAnimationFrame(function () { agendado = 0; todas(); }); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', todas); else todas();
})();
