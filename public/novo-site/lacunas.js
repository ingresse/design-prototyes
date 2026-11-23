/* lacunas.js: gaveta lateral com os dados que faltam em cada página (Wander, 03/11/2026). Abre e fecha com Shift+C, pelo botão da engrenagem «Simulação» ou com ?lacunas no endereço, em todas as telas do protótipo.
   Fonte única: docs/produto/lacunas-por-pagina.json (o gerador copia para previa/dados/lacunas.json); contrato e contexto: docs/produto/BFF-LACUNAS.md.
   A página vem de <html data-pagina>; no Evento, ?jogo= e ?esporte= escolhem as variantes de futebol e de prova.
   Ferramenta do protótipo (como a engrenagem), não texto de produto. Acessível: role=dialog + aria-modal, foco preso na gaveta, Esc fecha, o foco volta para onde estava.
   Anatomia do Untitled UI `slideout-menu` (SlideoutMenu: ModalOverlay + Modal + Dialog; Header com CloseButton, Content rolável): como no React Aria,
   o fundo fica `inert` e a rolagem da página trava enquanto a gaveta está aberta. Selos: o `Badge` da identidade (.tag.tag-sm), cor por situação (Edu do Udi, 04/11/2026).
   API: window.IngresseLacunas = { abrir(), fechar(), alternar() }. ES5, sem dependências; os textos entram por textContent. */
(function () {
  if (window.IngresseLacunas) return;
  var root = document.documentElement;
  var dados = null, gaveta = null, veu = null, antes = null, travados = [], rolagem = null;

  function chave() {
    var p = root.getAttribute('data-pagina') || '';
    if (p === 'evento') { if (/[?&]jogo=/.test(location.search)) return 'evento-futebol'; if (/[?&]esporte=/.test(location.search)) return 'evento-esportes'; }
    return p;
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function carregar() {
    if (dados) return Promise.resolve(dados);
    return fetch('./dados/lacunas.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) { dados = d; return d; });
  }

  var ORDEM = { falta: 0, parcial: 1, fora: 2 };
  function montar(d) {
    var k = chave(), pg = d.paginas[k];
    var g = el('aside', 'lac'); g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'lac-t'); g.tabIndex = -1;
    var topo = el('div', 'lac-topo');
    var tit = el('div', 'lac-tit');
    tit.appendChild(el('p', 'over', 'Dados que faltam · Shift+C'));
    tit.appendChild(el('h2', 'lac-h', pg ? pg.nome : 'Esta página')).id = 'lac-t';
    var fonte = root.getAttribute('data-dados') === 'bff' ? 'BFF (ingr-mock)' : 'Mock fixo';
    tit.appendChild(el('p', 'lac-fonte', 'Dados desta tela: ' + fonte));
    topo.appendChild(tit);
    var x = el('button', 'bs bs-icone lac-x'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    x.addEventListener('click', fechar);
    topo.appendChild(x);
    g.appendChild(topo);

    var corpo = el('div', 'lac-corpo');
    if (!pg) {
      corpo.appendChild(el('p', 'lac-vazio', 'Ainda não há lacunas registradas para esta página.'));
    } else {
      var itens = pg.itens.slice().sort(function (a, b) { return ORDEM[a.situacao] - ORDEM[b.situacao]; });
      var cont = { falta: 0, parcial: 0, fora: 0 };
      itens.forEach(function (i) { cont[i.situacao]++; });
      var resumo = el('ul', 'lac-resumo'); resumo.setAttribute('aria-label', 'Resumo');
      ['falta', 'parcial', 'fora'].forEach(function (s) { if (!cont[s]) return; var li = el('li', 'tag tag-sm lac-sit', cont[s] + ' · ' + d.legenda[s]); li.setAttribute('data-sit', s); resumo.appendChild(li); });
      corpo.appendChild(resumo);
      var lista = el('ol', 'lac-lista');
      itens.forEach(function (i) {
        var li = el('li', 'lac-item'); li.setAttribute('data-sit', i.situacao);
        var cab = el('div', 'lac-item__cab');
        cab.appendChild(el('h3', 'lac-item__t', i.titulo));
        var s = el('span', 'tag tag-sm lac-sit', d.legenda[i.situacao]); s.setAttribute('data-sit', i.situacao); cab.appendChild(s);
        li.appendChild(cab);
        var dl = el('dl', 'lac-item__dl');
        [['Onde', i.onde], ['Precisa', i.precisa], ['Quem responde', i.dono]].forEach(function (p) { if (!p[1]) return; var w = el('div'); w.appendChild(el('dt', null, p[0])); w.appendChild(el('dd', null, p[1])); dl.appendChild(w); });
        li.appendChild(dl);
        lista.appendChild(li);
      });
      corpo.appendChild(lista);
      if (pg.temNoBff && pg.temNoBff.length) {
        var det = el('details', 'lac-tem');
        det.appendChild(el('summary', null, 'Já vem do BFF (' + pg.temNoBff.length + ')'));
        var ul = el('ul'); pg.temNoBff.forEach(function (t) { ul.appendChild(el('li', null, t)); }); det.appendChild(ul);
        corpo.appendChild(det);
      }
    }
    var pe = el('p', 'lac-pe', 'Fonte: docs/produto/lacunas-por-pagina.json · contrato em docs/produto/BFF-LACUNAS.md · atualizado em ' + d.atualizado.split('-').reverse().join('/'));
    corpo.appendChild(pe);
    g.appendChild(corpo);
    return g;
  }

  function focaveis() { return Array.prototype.filter.call(gaveta.querySelectorAll('button, [href], summary, [tabindex]:not([tabindex="-1"])'), function (e) { return e.offsetParent !== null; }); }
  function prender(e) {
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
    if (e.key !== 'Tab') return;
    var f = focaveis(); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }

  function abrir() {
    if (gaveta) return;
    antes = document.activeElement;
    carregar().then(function (d) {
      if (gaveta) return;
      veu = el('div', 'lac-veu'); veu.addEventListener('click', fechar);
      gaveta = montar(d);
      gaveta.addEventListener('keydown', prender);
      // fundo inerte e rolagem travada (Modal do React Aria, como o IngresseModal): só a gaveta e o véu ficam vivos
      travados = Array.prototype.filter.call(document.body.children, function (c) { return !c.inert; });
      travados.forEach(function (c) { c.inert = true; });
      rolagem = root.style.overflow; root.style.overflow = 'hidden';
      document.body.appendChild(veu); document.body.appendChild(gaveta);
      root.setAttribute('data-lacunas', 'aberta');
      requestAnimationFrame(function () { gaveta.classList.add('is-on'); veu.classList.add('is-on'); gaveta.focus(); });
    }).catch(function (err) {
      var msg = 'Lacunas indisponíveis (' + err.message + '). Rode o gerador da prévia.';
      if (window.IX && IX.toast) IX.toast(msg); else if (window.console) console.warn('[prévia] ' + msg);
    });
  }
  function fechar() {
    if (!gaveta) return;
    var g = gaveta, v = veu; gaveta = null; veu = null;
    root.removeAttribute('data-lacunas');
    travados.forEach(function (c) { c.inert = false; }); travados = [];
    if (rolagem !== null) { root.style.overflow = rolagem; rolagem = null; }
    if (g.parentNode) g.parentNode.removeChild(g);
    if (v && v.parentNode) v.parentNode.removeChild(v);
    if (antes && antes.focus && document.contains(antes)) antes.focus();
  }
  function alternar() { if (gaveta) fechar(); else abrir(); }

  // Shift+C, fora de campos de texto (digitar «C» maiúsculo num campo não abre a gaveta)
  document.addEventListener('keydown', function (e) {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.code !== 'KeyC' && e.key !== 'C') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    alternar();
  });

  // Engrenagem «Simulação»: grupo «Dados que faltam» com um botão, para quem não tem teclado (celular, link publicado).
  // O motor de templates refaz partes do corpo, então o grupo é reposto a cada mudança (só escreve se faltar).
  function naEngrenagem() {
    var dentro = document.querySelector('.proto .proto-in');
    if (!dentro || dentro.querySelector('[data-lac-grupo]')) return;
    var f = document.createElement('div'); f.style.display = 'contents'; f.setAttribute('data-lac-grupo', '');
    f.appendChild(el('div', 'over', 'Dados que faltam'));
    var b = el('button', 'chip chip-sm', 'Ver o que falta nesta página'); b.type = 'button'; b.setAttribute('data-lac-abrir', '');
    f.appendChild(b);
    dentro.appendChild(f);
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-lac-abrir]') : null;
    if (!b) return;
    e.preventDefault();
    var d = b.closest('details'); if (d) d.open = false;
    abrir();
  });
  function iniciar() {
    naEngrenagem();
    new MutationObserver(naEngrenagem).observe(document.body, { childList: true, subtree: true });
    // ?lacunas no endereço abre a gaveta ao carregar (link direto para a revisão)
    if (/[?&]lacunas(=|&|$)/.test(location.search)) setTimeout(abrir, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  window.IngresseLacunas = { abrir: abrir, fechar: fechar, alternar: alternar };
})();
