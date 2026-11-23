/* modal-uui.js: o MODAL do protótipo (componente `uui-modal`, anatomia do Untitled UI `modal`: ModalOverlay, Modal, Dialog). UM só, para a Home: «O que você curte ao vivo?» (inclui o Primeiro acesso) e a modal simples do resultado do sorteio (a faixa do sorteio vive no bloco da busca, não aqui).
   Mapa: docs/design/COMPATIBILIDADE-UNTITLED-UI.md, itens 57 e 59. CSS: tools/previa/identidade-componentes.css §6e.
   Comportamento (o do React Aria Dialog): `role="dialog"` `aria-modal="true"` com título e descrição; foco preso (Tab e Shift+Tab); Esc fecha; clique no véu fecha;
   o foco volta ao botão que abriu; a rolagem do fundo fica travada; o resto da página fica `inert`. A entrada e a saída (opacidade e deslocamento) vêm da camada de movimento
   do protótipo (movimento-navegacao.js, §5d), que anima qualquer [role=dialog] dentro de um véu `position: fixed` e deixa o fantasma de saída: aqui não há animação própria.
   O modal mora no <html>, fora do <body>: o motor de templates do v5.3 refaz o corpo e levaria o modal junto (mesmo cuidado do menu da conta).
   API: IngresseModal.abrir({ id, titulo, descricao, classe, gatilho, gatilhoSeletor, rotuloFechar, aoFechar, interceptaEsc(e), foco, montar(c) }) -> { el, dialog, cabecalho, corpo, rodape, fechar(), titulo(txt), descricao(txt) }
        IngresseModal.aberto() -> o modal do topo ou null. */
(function () {
  'use strict';
  if (window.IngresseModal) return;

  var root = document.documentElement;
  var FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var pilha = [];
  var NS = 'http://www.w3.org/2000/svg';
  var X = 'M18 6 6 18M6 6l12 12'; // XClose (Untitled UI), 24 px, traço 2

  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function icone(d) {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'ico');
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); return s;
  }
  function visiveis(raiz) {
    return [].slice.call(raiz.querySelectorAll(FOCAVEIS)).filter(function (f) { return f.offsetParent !== null || f === document.activeElement; });
  }
  function larguraBarra() { return Math.max(0, window.innerWidth - root.clientWidth); }

  /* rolagem do fundo e inércia: uma contagem, para dois modais empilhados não soltarem a rolagem cedo */
  var travas = 0, guardado = null;
  function travar(ligar) {
    if (ligar) {
      if (travas++ === 0) {
        guardado = { overflow: root.style.overflow, padding: root.style.paddingRight };
        var b = larguraBarra();
        root.style.overflow = 'hidden';
        if (b) root.style.paddingRight = b + 'px';
        document.body.inert = true;
        root.setAttribute('data-modal-aberto', '');
      }
    } else if (--travas <= 0) {
      travas = 0;
      if (guardado) { root.style.overflow = guardado.overflow; root.style.paddingRight = guardado.padding; }
      document.body.inert = false;
      root.removeAttribute('data-modal-aberto');
    }
  }

  function abrir(o) {
    o = o || {};
    var id = o.id || 'uui-modal-' + (pilha.length + 1);
    var veu = el('div', 'uui-modal' + (o.classe ? ' ' + o.classe : ''));
    veu.setAttribute('data-modal', id);
    var dialog = el('div', 'uui-modal__dialog');
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', id + '-t'); dialog.setAttribute('aria-describedby', id + '-d');
    dialog.id = id;
    var cab = el('div', 'uui-modal__cab');
    var txt = el('div', 'uui-modal__txt');
    var tit = el('h2', 'uui-modal__titulo', o.titulo || ''); tit.id = id + '-t'; tit.tabIndex = -1;
    var desc = el('p', 'uui-modal__descricao', o.descricao || ''); desc.id = id + '-d';
    if (!o.descricao) desc.hidden = true;
    txt.appendChild(tit); txt.appendChild(desc);
    var fechar = el('button', 'bs bs-icone uui-modal__fechar'); fechar.type = 'button'; fechar.setAttribute('aria-label', o.rotuloFechar || 'Fechar'); fechar.appendChild(icone(X));
    cab.appendChild(txt); cab.appendChild(fechar);
    var corpo = el('div', 'uui-modal__corpo');
    var rodape = el('div', 'uui-modal__rodape');
    dialog.appendChild(cab); dialog.appendChild(corpo); dialog.appendChild(rodape);
    veu.appendChild(dialog);

    var gatilho = o.gatilho || document.activeElement;
    var c = { el: veu, dialog: dialog, cabecalho: cab, corpo: corpo, rodape: rodape, id: id, aberto: true,
      titulo: function (t) { tit.textContent = t; }, descricao: function (t) { desc.textContent = t; desc.hidden = !t; } };

    function tecla(e) {
      if (pilha[pilha.length - 1] !== c) return;
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (o.interceptaEsc && o.interceptaEsc(e)) return; c.fechar(true); return; } // `interceptaEsc`: quem tem algo a desfazer antes (o campo do combobox) trata o Esc e devolve true
      if (e.key !== 'Tab') return;
      var fs = visiveis(dialog);
      if (!fs.length) { e.preventDefault(); tit.focus(); return; }
      var i = fs.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && (i === fs.length - 1 || i < 0)) { e.preventDefault(); fs[0].focus(); }
    }
    function clique(e) { if (e.target === veu) c.fechar(true); }
    c.fechar = function (devolverFoco) {
      if (!c.aberto) return;
      c.aberto = false;
      document.removeEventListener('keydown', tecla, true);
      veu.removeEventListener('mousedown', clique);
      pilha.splice(pilha.indexOf(c), 1);
      veu.remove(); // a camada de movimento deixa o fantasma de saída
      travar(false);
      if (devolverFoco !== false) {
        var g = gatilho && document.contains(gatilho) ? gatilho : (o.gatilhoSeletor ? document.querySelector(o.gatilhoSeletor) : null);
        if (g && g.focus) g.focus({ preventScroll: true });
      }
      if (o.aoFechar) o.aoFechar(c);
    };
    fechar.addEventListener('click', function () { c.fechar(true); });
    veu.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla, true);

    travar(true);
    root.appendChild(veu);
    pilha.push(c);
    if (o.montar) o.montar(c);
    // foco: o que o chamador pediu; senão o título (o leitor de tela lê o nome da caixa de diálogo)
    var f = o.foco ? (typeof o.foco === 'function' ? o.foco(c) : dialog.querySelector(o.foco)) : null;
    (f || tit).focus({ preventScroll: true });
    return c;
  }

  window.IngresseModal = { abrir: abrir, aberto: function () { return pilha[pilha.length - 1] || null; }, icone: icone, el: el };
})();
