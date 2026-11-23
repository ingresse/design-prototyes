/* local-ui.js: a MODAL «Onde você quer ver seus eventos?», a primeira visita e o aviso de lugar (pedido do Wander, 29/10/2026; Edu do Udi).
   Uma só modal para todas as telas: o IngresseModal (modal-uui.js), com o COMBOBOX acessível de lugares (role=combobox, listbox, setas, Enter, Esc, anúncio da contagem).
   O estado é o IngresseLocal (local.js); o botão do cabeçalho (cidade-cabecalho.js) abre esta modal; o antigo popover de cidades saiu.
   Primeira visita (sem lugar guardado) em Home, Busca, Categoria e Esportes: pede a localização do navegador; se aceitar, o lugar conhecido mais próximo vira o lugar (origem 'geo') e um aviso
   discreto diz «Mostrando eventos perto de {cidade}»; se negar, ignorar ou não houver geolocalização, abre a modal. Fechar a modal mantém o lugar padrão do protótipo (São Paulo).
   Textos: provisórios, no tom do Guia (a Luíza revisa: docs/design/LOCALIZACAO-SISTEMA.md lista todos).
   API: window.IngresseLocalUI = { abrir({ gatilho, primeira, motivo }), T }. */
(function () {
  'use strict';
  if (window.IngresseLocalUI) return;
  var L = window.IngresseLocal, M = window.IngresseModal;
  if (!L || !M) return;

  var T = {
    titulo: 'Onde você quer ver seus eventos?',
    sub: 'Digite um país, região, estado ou cidade.',
    campo: 'Buscar lugar', placeholder: 'País, região, estado ou cidade',
    iniciais: 'Mais eventos', recentes: 'Recentes',
    geo: 'Usar minha localização', geoBuscando: 'Buscando a sua localização…',
    geoFalha: { negada: 'Sem a sua localização, escolha onde você quer ver os eventos.', indisponivel: 'Não conseguimos acessar a sua localização. Escolha onde você quer ver os eventos.', tempo: 'A localização demorou para responder. Escolha onde você quer ver os eventos.', erro: 'Não conseguimos usar a sua localização. Escolha onde você quer ver os eventos.' },
    eventos: function (n) { return n === 1 ? '1 evento' : n + ' eventos'; },
    vazio: function (q) { return 'Não encontramos “' + q + '”. Tente outro nome de país, região, estado ou cidade.'; },
    contagem: function (n) { return n === 1 ? '1 lugar encontrado.' : n + ' lugares encontrados.'; }, semResultado: 'Nenhum lugar encontrado.',
    lista: 'Lugares', atual: 'Lugar atual',
    aviso: function (l) { return l.nivel === 'cidade' ? 'Mostrando eventos perto de ' + l.nome : 'Mostrando eventos em ' + l.nome; }
  };
  var PAGINAS_DE_DESCOBERTA = { home: 1, busca: 1, categoria: 1, esportes: 1 };

  var $ = M.el;
  var NS = 'http://www.w3.org/2000/svg';
  function svg(d, cls) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', cls || 'ico'); var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); return s; }
  var PIN = 'M12 22c4-4 8-7.582 8-12a8 8 0 1 0-16 0c0 4.418 4 8 8 12Z';
  var CHECK = 'M20 6 9 17l-5-5';

  var aberta = null;

  function toast(msg) { try { if (window.IX && window.IX.toast) window.IX.toast(msg, 'ok'); } catch (e) {} }

  function opcao(item, i, atualId) {
    var li = $('li', 'loc-op'); li.setAttribute('role', 'option'); li.id = 'loc-o-' + i; li.setAttribute('data-id', item.id);
    li.setAttribute('aria-selected', item.id === atualId ? 'true' : 'false');
    li.appendChild($('span', 'loc-op__nome', item.nome));
    li.appendChild($('span', 'loc-op__ctx', item.contexto));
    if (item.eventos > 0) li.appendChild($('span', 'loc-op__n', T.eventos(item.eventos)));
    li.appendChild(svg(CHECK, 'uui-ico loc-ok'));
    return li;
  }

  function abrir(o) {
    o = o || {};
    if (aberta) return aberta;
    var estado = { q: '', itens: [], ativa: -1, anunciar: 0 };
    var refs = {};
    var c = M.abrir({
      id: 'loc-modal', classe: 'loc-modal', titulo: T.titulo, descricao: T.sub, gatilho: o.gatilho, gatilhoSeletor: '[data-cidade-btn]',
      foco: '#loc-q',
      interceptaEsc: function () { // Esc com texto ou com a lista de sugestões ativa limpa o campo primeiro; só depois fecha o modal
        if (estado.q) { refs.input.value = ''; estado.q = ''; estado.ativa = -1; render(); return true; }
        return false;
      },
      aoFechar: function () {
        aberta = null;
        if (!L.visto()) L.limpar(); // primeira visita: fechar mantém o lugar padrão e registra que a pergunta foi feita
        if (o.aoFechar) o.aoFechar();
      },
      montar: function (m) {
        var corpo = m.corpo, rod = m.rodape;
        if (o.motivo && T.geoFalha[o.motivo]) { refs.aviso = $('p', 'loc-aviso', T.geoFalha[o.motivo]); corpo.appendChild(refs.aviso); }
        // campo + combobox
        var campo = $('div', 'field loc-campo');
        var lab = $('label', '', T.campo); lab.setAttribute('for', 'loc-q');
        var wrap = $('div', 'loc-combo');
        var inp = $('input'); inp.type = 'text'; inp.id = 'loc-q'; inp.placeholder = T.placeholder; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'off'); inp.spellcheck = false;
        inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'true'); inp.setAttribute('aria-controls', 'loc-lista'); inp.setAttribute('enterkeyhint', 'search');
        wrap.appendChild(inp);
        campo.appendChild(lab); campo.appendChild(wrap); corpo.appendChild(campo);
        var tit = $('h3', 'loc-t', T.iniciais); tit.id = 'loc-t'; corpo.appendChild(tit);
        var ul = $('ul', 'loc-lista'); ul.id = 'loc-lista'; ul.setAttribute('role', 'listbox'); ul.setAttribute('aria-labelledby', 'loc-t'); corpo.appendChild(ul);
        var vazio = $('p', 'loc-vazio'); vazio.hidden = true; corpo.appendChild(vazio);
        var rec = $('section', 'loc-rec'); rec.hidden = true;
        var rt = $('h3', 'loc-t', T.recentes); rt.id = 'loc-rt'; rec.appendChild(rt);
        var rl = $('div', 'loc-rec__chips'); rl.setAttribute('role', 'group'); rl.setAttribute('aria-labelledby', 'loc-rt'); rec.appendChild(rl);
        corpo.appendChild(rec);
        var vivo = $('div', 'sr-only'); vivo.setAttribute('role', 'status'); vivo.setAttribute('aria-live', 'polite'); corpo.appendChild(vivo);
        // rodapé: usar minha localização
        var geo = $('button', 'bs loc-geo'); geo.type = 'button'; geo.appendChild(svg(PIN, 'ico')); var gt = $('span', '', T.geo); geo.appendChild(gt);
        rod.appendChild(geo);
        refs = { input: inp, titulo: tit, lista: ul, vazio: vazio, rec: rec, recChips: rl, vivo: vivo, geo: geo, geoTxt: gt, aviso: refs.aviso };

        inp.addEventListener('input', function () { estado.q = inp.value; estado.ativa = estado.q.trim() ? 0 : -1; render(); anunciarContagem(); });
        inp.addEventListener('keydown', function (e) {
          var n = estado.itens.length;
          if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { estado.ativa = (estado.ativa + 1) % n; marcarAtiva(); } }
          else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { estado.ativa = (estado.ativa - 1 + n) % n; marcarAtiva(); } }
          else if (e.key === 'Home' && estado.ativa >= 0) { e.preventDefault(); estado.ativa = 0; marcarAtiva(); }
          else if (e.key === 'End' && estado.ativa >= 0) { e.preventDefault(); estado.ativa = n - 1; marcarAtiva(); }
          else if (e.key === 'Enter') { e.preventDefault(); var i = estado.ativa >= 0 ? estado.ativa : (estado.q.trim() && n ? 0 : -1); if (i >= 0) escolher(estado.itens[i].id); }
        });
        ul.addEventListener('mousedown', function (e) { e.preventDefault(); }); // o clique na opção não tira o foco do campo
        ul.addEventListener('click', function (e) { var li = e.target.closest && e.target.closest('[role="option"]'); if (li) escolher(li.getAttribute('data-id')); });
        rl.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[data-id]'); if (b) escolher(b.getAttribute('data-id')); });
        geo.addEventListener('click', function () {
          geo.disabled = true; gt.textContent = T.geoBuscando;
          L.pedirGeo().then(function (l) { avisoGeo(l); m.fechar(true); }, function (motivo) {
            geo.disabled = false; gt.textContent = T.geo;
            if (!refs.aviso) { refs.aviso = $('p', 'loc-aviso'); refs.aviso.setAttribute('role', 'status'); corpo.insertBefore(refs.aviso, corpo.firstChild); }
            refs.aviso.textContent = T.geoFalha[motivo] || T.geoFalha.erro;
            inp.focus();
          });
        });
        L.pronto().then(function () { if (aberta === c || m.aberto) render(); });
        render();
      }
    });
    aberta = c;

    function atualId() { return L.get().id; }
    function render() {
      var q = estado.q.trim();
      var itens = q ? L.sugerir(q, { limite: 8 }) : L.iniciais();
      var curto = !!q && !itens.length && L.norm(q).length < 3; // 1 ou 2 letras que não são apelido de nenhum lugar: segue a lista inicial, sem «não encontramos»
      if (curto) itens = L.iniciais();
      estado.itens = itens;
      if (estado.ativa >= itens.length) estado.ativa = itens.length - 1;
      refs.titulo.hidden = (!!q && !curto) || !itens.length;
      while (refs.lista.firstChild) refs.lista.removeChild(refs.lista.firstChild);
      itens.forEach(function (it, i) { refs.lista.appendChild(opcao(it, i, atualId())); });
      refs.vazio.hidden = !(q && !itens.length);
      if (q && !itens.length) refs.vazio.textContent = T.vazio(q);
      if (q) refs.lista.setAttribute('aria-label', T.lista); else refs.lista.removeAttribute('aria-label');
      // recentes: só sem texto
      var rs = q ? [] : L.recentes().filter(function (r) { return r.id !== atualId(); });
      refs.rec.hidden = !rs.length;
      while (refs.recChips.firstChild) refs.recChips.removeChild(refs.recChips.firstChild);
      rs.forEach(function (r) { var b = $('button', 'chip', r.rotulo); b.type = 'button'; b.setAttribute('data-id', r.id); refs.recChips.appendChild(b); });
      marcarAtiva();
    }
    function marcarAtiva() {
      var ops = refs.lista.children;
      for (var i = 0; i < ops.length; i++) { if (i === estado.ativa) ops[i].setAttribute('data-ativa', 'true'); else ops[i].removeAttribute('data-ativa'); }
      if (estado.ativa >= 0 && ops[estado.ativa]) { refs.input.setAttribute('aria-activedescendant', ops[estado.ativa].id); if (ops[estado.ativa].scrollIntoView) ops[estado.ativa].scrollIntoView({ block: 'nearest' }); }
      else refs.input.removeAttribute('aria-activedescendant');
    }
    function anunciarContagem() {
      clearTimeout(estado.anunciar);
      estado.anunciar = setTimeout(function () { if (!refs.vivo) return; refs.vivo.textContent = ''; var n = estado.itens.length; setTimeout(function () { if (refs.vivo) refs.vivo.textContent = estado.q.trim() ? (n ? T.contagem(n) : T.semResultado) : ''; }, 30); }, 500);
    }
    function escolher(id) { L.set(id, 'escolha'); c.fechar(true); }
    return c;
  }

  function avisoGeo(l) { toast(T.aviso(l)); }

  /* ---------- primeira visita ---------- */
  function primeiraVisita() {
    var pag = document.documentElement.getAttribute('data-pagina');
    if (!PAGINAS_DE_DESCOBERTA[pag]) return;
    if (L.visto() && !L.pedirParametro()) return;
    if (L.semPergunta()) return;
    var feito = false;
    function pedir() {
      if (feito) return; feito = true;
      L.pronto().then(function () {
        return L.pedirGeo().then(function (l) { avisoGeo(l); }, function (motivo) { abrir({ primeira: true, motivo: motivo, gatilho: document.querySelector('[data-cidade-btn]') }); });
      });
    }
    // espera o motor de templates montar a tela (o botão do cabeçalho existe) para a modal ter para onde devolver o foco
    var t = 0;
    (function esperar() { if (document.querySelector('[data-cidade-btn]') || t++ > 40) pedir(); else setTimeout(esperar, 100); })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', primeiraVisita); else primeiraVisita();

  window.IngresseLocalUI = { abrir: abrir, T: T };
})();
