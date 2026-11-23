/* home-curte.js: a modal «O que você curte ao vivo?» da Home (pedido do Wander, 29/10/2026; Edu do Udi). Textos: docs/produto/PEDIDO-29-10-COPY.md (HC-01 a HC-34).
   Substitui a modal de «Primeiro acesso» (a mesma modal abre sozinha no estado «Primeiro acesso», com «Pular»).
   Peças: o MODAL é o IngresseModal (modal-uui.js); o chip é o `.chip` de sempre (aria-pressed); o dado é o catálogo da Busca (home-consulta.js, por cima do IngresseCatalogo da Iara) e o GRAFO DE RELAÇÕES
   (dados/home-grafo.json, gerado de tools/previa/home/grafo-de-tags.json + folksonomia + categorias). Nenhuma regra de relação mora aqui.
   Como funciona o «progressivo»: a cada escolha o grafo diz quais tags se relacionam com ela (bloco «Relacionadas a “X”», no topo, com ponto nos chips novos e anúncio ao leitor de tela);
   só entra tag com pelo menos 1 evento depois das escolhas já feitas; o botão «Ver N eventos» mostra a contagem ao vivo, do mesmo cálculo da Busca.
   «Ver N eventos» leva à Busca (?q= ?tipo= ?tags= ?artista=; o LUGAR não vai no link: é o do seletor do cabeçalho, IngresseLocal, e a Busca o lê de lá) ou, se a escolha for só de esporte, à Busca do Ingresse Sports (?escopo=esportes&modalidade=…).
   API: window.IngresseCurte = { abrir(o), href(escolhas?, extra?), estado(), selecao() , rotulos() }. */
(function () {
  'use strict';
  if (window.IngresseCurte) return;
  var C = window.IngresseConsulta, M = window.IngresseModal;
  if (!C || !M) return;

  /* ---------- textos (PEDIDO-29-10-COPY.md, seção 5.1) ---------- */
  var T = {
    titulo: 'O que você curte ao vivo?',
    sub: 'Escolha quantos quiser. Mostramos só os eventos que combinam.',
    primeiro: 'Primeiro acesso',
    carregando: 'Carregando opções…',
    erro: 'Não conseguimos carregar as opções. Tente de novo.', tentar: 'Tentar de novo',
    ver: function (n) { return n === 1 ? 'Ver 1 evento' : 'Ver ' + n + ' eventos'; }, verTodos: 'Ver todos os eventos', verVazio: 'Ver eventos',
    limpar: 'Limpar escolhas', limparCurto: 'Limpar', pular: 'Pular',
    escolhas: function (n) { return n === 1 ? '1 escolha' : n + ' escolhas'; },
    vazio: 'Nenhum evento combina com todas essas escolhas. Tire uma para ver mais.', tirar: 'Tirar a última escolha',
    maisOpcoes: 'Mostrar mais opções', menosOpcoes: 'Mostrar menos opções',
    relacionadas: function (n) { return 'Relacionadas a “' + n + '”'; }, relacionadasVarias: 'Relacionadas às suas escolhas',
    novas: function (nomes, resto) { return 'Novas opções: ' + nomes.join(', ') + (resto ? ' e mais ' + resto : '') + '.'; },
    removidas: function (n) { return 'Opções relacionadas a “' + n + '” removidas.'; },
    buscarArtista: 'Buscar artista', phArtista: 'Nome do artista', semArtista: 'Nenhum artista com esse nome.',
    novoRotulo: 'novo',
    contagemAnuncio: function (n) { return n === 1 ? '1 evento combina.' : n + ' eventos combinam.'; }
  };
  var GRUPOS_BASE = ['categoria', 'ocasiao', 'genero', 'artista']; // modalidade e as demais só entram como «Relacionadas» (pedido do Wander: escolheu Esportes, aparecem modalidades)
  var CHAVE = 'previa-curte';

  var $ = function (tag, cls, txt) { return M.el(tag, cls, txt); };
  var uniq = function (a) { var m = {}; return a.filter(function (x) { return m[x] ? false : (m[x] = true); }); };
  var NS = 'http://www.w3.org/2000/svg';
  function svg(d, cls) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', cls || 'ico'); var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); return s; }
  var CHECK = 'M20 6 9 17l-5-5';

  /* ---------- estado ---------- */
  var grafo = null, cat = null, falhou = false;
  var estado = { esc: [], mais: {}, busca: '' };
  try { var g0 = JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); if (g0 && Array.isArray(g0.esc)) estado.esc = g0.esc.filter(function (e) { return e.grupo !== 'proximidade'; }); } catch (e) {}
  function guardar() { try { sessionStorage.setItem(CHAVE, JSON.stringify({ esc: estado.esc })); } catch (e) {} }

  function carregar() {
    if (grafo && cat) return Promise.resolve();
    return Promise.all([fetch('./dados/home-grafo.json').then(function (r) { if (!r.ok) throw new Error('grafo'); return r.json(); }), C.carregar()]).then(function (v) { grafo = v[0]; cat = v[1]; falhou = false; indexar(); });
  }
  var NOS = {}, GRP = {}, REL = [];
  function indexar() {
    NOS = grafo.nos; GRP = {}; grafo.grupos.forEach(function (g) { GRP[g.id] = g; }); REL = grafo.relacoes;
    cat.artistaPorId = {}; cat.artistas.forEach(function (a) { cat.artistaPorId[a.id] = a; });
    C.facetas(function (id) { return (NOS[id] || {}).faceta || ''; });
  }

  /* O LUGAR não é uma escolha da modal: é o do seletor do cabeçalho (IngresseLocal). A contagem e o «Ver N eventos» valem para esse lugar, como a Busca (home-consulta.js aplica IngresseLocal.get() em toda consulta). */
  function rotuloDe(e) {
    if (e.grupo === 'artista') { var a = cat && cat.artistaPorId[e.id]; return a ? a.nome : e.rotulo || e.id; }
    if (e.grupo === 'casa') return e.rotulo || e.id;
    return (NOS[e.id] && NOS[e.id].rotulo) || e.rotulo || e.id;
  }

  /* ---------- escolhas -> seleção do catálogo ---------- */
  var PUB_ESP = { feminino: 1, inclusivo: 1, estreantes: 1 };
  function paraSelecao(esc) {
    var s = { categoria: [], tags: [], mod: [], dist: [], terr: [], pub: [], serv: [], regiao: [], q: '', artistas: [] }, kids = false, escopoDe = (GRP.modalidade && GRP.modalidade.escopoDe) || [];
    esc.forEach(function (e) {
      var n = NOS[e.id] || {};
      if (e.grupo === 'categoria') s.categoria.push(e.id.replace(/^cat:/, ''));
      else if (e.grupo === 'ocasiao' || e.grupo === 'genero') s.tags.push(e.id);
      else if (e.grupo === 'artista') { var ar = cat && cat.artistaPorId[e.id]; if (ar) s.artistas.push(ar); }
      else if (e.grupo === 'casa') s.q = rotuloDe(e);
      else if (e.grupo === 'modalidade') (escopoDe.indexOf(e.id) >= 0 ? s.mod : s.tags).push(e.id);
      else { // relacionada
        if (n.faceta === 'distancia') s.dist.push(e.id);
        else if (n.faceta === 'terreno') s.terr.push(e.id);
        else if (n.faceta === 'servico') s.serv.push(e.id);
        else if (PUB_ESP[e.id]) s.pub.push(e.id);
        else if (e.id === 'kids') kids = true;
        else s.tags.push(e.id);
      }
    });
    if (kids) (C.ehEscopoEsportes(s) ? s.pub : s.tags).push('kids');
    return s;
  }
  var contar = function (esc) { return C.eventosDe(cat, paraSelecao(esc)).length; };

  function href(esc, extra) {
    esc = esc || estado.esc; extra = extra || {};
    var s = paraSelecao(esc), ps = [], enc = encodeURIComponent, csv = function (a) { return a.map(enc).join(','); };
    var q = extra.q != null && String(extra.q).trim() ? String(extra.q).trim() : (s.q || ''), art = s.artistas.map(function (a) { return a.id; });
    if (C.ehEscopoEsportes(s)) {
      ps.push('escopo=esportes');
      var mods = s.mod.slice(); if (s.categoria.indexOf('corridas') >= 0 && !mods.length) mods.push('corrida');
      if (q) ps.push('q=' + enc(q));
      if (mods.length) ps.push('modalidade=' + csv(mods));
      if (s.dist.length) ps.push('distancia=' + csv(s.dist));
      if (s.terr.length) ps.push('terreno=' + csv(s.terr.map(function (t) { return t.replace(/^terreno-/, ''); })));
      if (s.pub.length) ps.push('publico=' + csv(s.pub));
      if (s.serv.length) ps.push('servico=' + csv(s.serv));
      return 'Busca.dc.html?' + ps.join('&');
    }
    if (q) ps.push('q=' + enc(q));
    if (art.length) ps.push('artista=' + csv(art));
    if (s.categoria.length) ps.push('tipo=' + csv(s.categoria));
    if (s.tags.length) ps.push('tags=' + csv(s.tags));
    return 'Busca.dc.html' + (ps.length ? '?' + ps.join('&') : '');
  }

  /* ---------- candidatos de cada grupo, já com a contagem ---------- */
  /* Quem decide se duas escolhas se somam (OU) ou se restringem (E) é o grupo LÓGICO, o da Busca: categoria (OU), cidade (OU), texto (artista ou casa: um só),
     e as tags por grupo de faceta (gênero; ocasião e datas; esporte; distância; o resto), OU dentro do grupo e E entre grupos. */
  var SPORTS_FACETAS = { distancia: 1, terreno: 1, servico: 1 };
  function chave(e) {
    if (e.grupo === 'categoria') return 'cat';
    if (e.grupo === 'artista') return 'art'; // ?artista=<id>,<id>: OU entre artistas, E com o resto (a Busca aceita desde 29/10)
    if (e.grupo === 'casa') return 'q';
    var n = NOS[e.id] || {};
    if (SPORTS_FACETAS[n.faceta] || (n.faceta === 'segmento' && PUB_ESP[e.id])) return 'f:' + n.faceta;
    return 't:' + C.grupoTag(e.id);
  }
  function candidata(g, id, rotulo) { // as escolhas que valeriam se a pessoa marcasse `id` sozinha no grupo lógico dela (a contagem de cada opção ignora o próprio grupo, como na Busca)
    var novo = { grupo: g, id: id, rotulo: rotulo }, k = chave(novo);
    return estado.esc.filter(function (e) { return chave(e) !== k; }).concat([novo]);
  }
  var marcada = function (g, id) { return estado.esc.some(function (e) { return e.grupo === g && e.id === id; }); };

  function itensDoGrupo(g) {
    var gr = GRP[g], out = [];
    if (g === 'artista') {
      var q = cat ? C.norm(estado.busca) : '';
      var base = estado.esc.filter(function (e) { return chave(e) !== 'art'; });
      cat.artistas.forEach(function (a) {
        var sel = marcada('artista', a.id);
        if (q && a.norm.indexOf(q) < 0 && !sel) return;
        var n = contar(base.concat([{ grupo: 'artista', id: a.id }]));
        if (n > 0 || sel) out.push({ g: g, id: a.id, rotulo: a.nome, n: n, sel: sel });
      });
      out.sort(function (a, b) { return (b.sel - a.sel) || (b.n - a.n) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'); });
      return out;
    }
    var ids = gr.itens || [];
    ids.forEach(function (id) {
      var sel = marcada(g, id), n = contar(candidata(g, id));
      if (n > 0 || sel) out.push({ g: g, id: id, rotulo: (NOS[id] || {}).rotulo || id, n: n, sel: sel, icone: (NOS[id] || {}).icone });
    });
    return out;
  }

  /* o bloco «Relacionadas»: o que o grafo liga às escolhas, mais o que já está marcado dali */
  function relacionadas() {
    var origens = [], ids = [], vistos = {};
    estado.esc.forEach(function (e) {
      var nome = rotuloDe(e), nG = (NOS[e.id] || {}).grupo || e.grupo;
      REL.forEach(function (r) {
        var casa = (r.de.ids && r.de.ids.indexOf(e.id) >= 0) || (r.de.grupo && (r.de.grupo === e.grupo || r.de.grupo === nG));
        if (!casa) return;
        var lista = [];
        if (r.para.ids) lista = r.para.ids.slice();
        else if (r.para.grupo) lista = ((GRP[r.para.grupo] || {}).itens || []).slice();
        else if (r.para.dinamico === 'casas') lista = casasDa(e).map(function (c) { return 'casa:' + c; });
        else if (r.para.dinamico === 'artistas') lista = cat.artistas.map(function (a) { return 'a:' + a.id; });
        lista.forEach(function (id) { if (!vistos[id]) { vistos[id] = true; ids.push({ id: id, de: nome, grupoPara: r.para.grupo || '' }); } });
        if (lista.length && origens.indexOf(nome) < 0) origens.push(nome);
      });
    });
    var itens = [];
    ids.forEach(function (x) {
      var id = x.id, g, rot;
      if (id.indexOf('casa:') === 0) { g = 'casa'; rot = id.slice(5); id = 'casa:' + rot; }
      else if (id.indexOf('a:') === 0) { return; } // artistas já têm o seu grupo, que se estreita sozinho
      else { var n = NOS[id]; if (!n) return; g = x.grupoPara === 'modalidade' || n.grupo === 'modalidade' ? 'modalidade' : (n.grupo === 'categoria' ? 'categoria' : (n.grupo === 'ocasiao' || n.grupo === 'genero' ? n.grupo : 'rel')); rot = n.rotulo; }
      var gb = GRP[g]; if (gb && GRUPOS_BASE.indexOf(g) >= 0 && (gb.itens || []).indexOf(id) >= 0 && (gb.itens || []).indexOf(id) < (gb.visiveis || 8)) return; // já está à vista no grupo dele: não repete
      if (marcada(g, id)) { itens.push({ g: g, id: id, rotulo: rot, n: 0, sel: true, icone: (NOS[id] || {}).icone }); return; }
      if (estado.esc.some(function (e) { return e.id === id; })) return;
      var nn = contar(candidata(g, id, rot));
      if (nn > 0) itens.push({ g: g, id: id, rotulo: rot, n: nn, sel: false, icone: (NOS[id] || {}).icone });
    });
    // o que já está marcado e veio de uma relação que não vale mais continua à vista (HC-33)
    estado.esc.forEach(function (e) { if ((e.grupo === 'rel' || e.grupo === 'casa' || (e.grupo === 'modalidade' && GRP.modalidade.base === false)) && !itens.some(function (i) { return i.id === e.id; })) itens.push({ g: e.grupo, id: e.id, rotulo: rotuloDe(e), n: 0, sel: true }); });
    return { itens: itens, origens: origens };
  }
  function casasDa() { return []; } // as «casas» de uma região eram a relação do antigo grupo «Perto de mim» (saiu: o lugar é o do cabeçalho)

  /* ---------- DOM ---------- */
  var ui = null; // { c, grupos:{id:{sec,chips,cache,mais}}, rel, rodape:{...}, vivo, vivoN, primeiro }
  var novos = {}, anteriorRel = [], timerN = 0, anunciadoN = -1, lembrar = null;

  function chip(item) {
    var b = $('button', 'chip hc-chip'); b.type = 'button'; b.setAttribute('data-id', item.id); b.setAttribute('data-g', item.g);
    if (item.icone) { var ic = $('span', 'oc-ic'); ic.setAttribute('aria-hidden', 'true'); ic.setAttribute('data-lottie', item.icone.src); ic.setAttribute('data-repouso', item.icone.repouso || 0); ic.setAttribute('data-loop', item.icone.laco ? 1 : 0); b.appendChild(ic); b.setAttribute('data-icone', ''); }
    b.appendChild($('span', 'hc-chip__t', item.rotulo));
    b.addEventListener('click', function () { alternar(item.g, item.id, item.rotulo, b); });
    return b;
  }
  function pintar(b, item) {
    b.setAttribute('aria-pressed', item.sel ? 'true' : 'false');
    var t = b.querySelector('.hc-chip__t'); if (t.textContent !== item.rotulo) t.textContent = item.rotulo;
    var ok = b.querySelector('.hc-ok');
    if (item.sel && b.hasAttribute('data-icone') && !ok) { ok = svg(CHECK, 'ico ico-14 hc-ok'); b.appendChild(ok); }
    if ((!item.sel || !b.hasAttribute('data-icone')) && ok) ok.remove();
    var dot = b.querySelector('.hc-novo');
    if (novos[item.g + ':' + item.id] && !dot) { dot = $('i', 'hc-novo'); dot.setAttribute('aria-hidden', 'true'); b.appendChild(dot); }
    if (!novos[item.g + ':' + item.id] && dot) dot.remove();
  }

  function secao(id, titulo) {
    var sec = $('section', 'hc-grupo'); sec.setAttribute('data-grupo', id);
    var h = $('h3', 'hc-grupo__t', titulo); h.id = 'hc-t-' + id; sec.appendChild(h);
    var lista = $('div', 'hc-chips'); lista.setAttribute('role', 'group'); lista.setAttribute('aria-labelledby', h.id); sec.appendChild(lista);
    return { sec: sec, titulo: h, lista: lista, cache: {}, mais: null, id: id };
  }
  function maisBotao(g) {
    var b = $('button', 'chip hd-mais hc-mais'); b.type = 'button';
    var s = $('span', '', '+'); s.setAttribute('aria-hidden', 'true'); b.appendChild(s);
    b.addEventListener('click', function () { estado.mais[g.id] = !estado.mais[g.id]; renderizar(); });
    return b;
  }
  function reconciliar(g, itens, visiveis) {
    var abertoMais = !!estado.mais[g.id];
    var mostrar = itens.filter(function (it, i) { return abertoMais || i < visiveis || it.sel; });
    var chave = {}; mostrar.forEach(function (it) { chave[it.id] = it; });
    Object.keys(g.cache).forEach(function (k) { if (!chave[k]) { g.cache[k].remove(); delete g.cache[k]; } });
    var ant = null;
    mostrar.forEach(function (it) {
      var b = g.cache[it.id] || (g.cache[it.id] = chip(it));
      pintar(b, it);
      var alvo = ant ? ant.nextSibling : g.lista.firstChild;
      if (b !== alvo) g.lista.insertBefore(b, alvo);
      ant = b;
    });
    var temMais = itens.length > visiveis && itens.some(function (it, i) { return i >= visiveis && !it.sel; });
    if (temMais) {
      if (!g.mais) g.mais = maisBotao(g);
      g.mais.setAttribute('aria-expanded', abertoMais ? 'true' : 'false');
      g.mais.setAttribute('aria-label', abertoMais ? T.menosOpcoes : T.maisOpcoes);
      g.mais.firstChild.textContent = abertoMais ? '−' : '+';
      g.lista.appendChild(g.mais);
    } else if (g.mais && g.mais.parentNode) g.mais.remove();
    return mostrar.length;
  }

  function alternar(g, id, rotulo, botao) {
    // quem escolhe limpa os pontos de «novo» anteriores (HC-31: até o primeiro toque)
    novos = {};
    var ja = marcada(g, id), gr = GRP[g] || {};
    var removidoDe = '';
    if (ja) { estado.esc = estado.esc.filter(function (e) { return !(e.grupo === g && e.id === id); }); removidoDe = rotulo; }
    else {
      if (g === 'casa') estado.esc = estado.esc.filter(function (e) { return e.grupo !== 'casa'; }); // um local por vez (vai em ?q=)
      estado.esc.push({ grupo: g, id: id, rotulo: rotulo });
    }
    guardar();
    renderizar(removidoDe, botao);
  }

  function anunciar(txt) { if (!ui) return; ui.vivo.textContent = ''; setTimeout(function () { if (ui) ui.vivo.textContent = txt; }, 30); }

  function renderizar(removidoDe, botao) {
    if (!ui || !cat) return;
    // 1. relacionadas
    var r = relacionadas(), ids = r.itens.map(function (i) { return i.g + ':' + i.id; });
    var surgiram = r.itens.filter(function (i) { return !i.sel && anteriorRel.indexOf(i.g + ':' + i.id) < 0; });
    surgiram.forEach(function (i) { novos[i.g + ':' + i.id] = true; });
    var tinha = anteriorRel.length > 0;
    anteriorRel = ids;
    var tituloRel = r.origens.length === 1 ? T.relacionadas(r.origens[0]) : T.relacionadasVarias;
    ui.rel.titulo.textContent = tituloRel;
    var estavaOculta = ui.rel.sec.hidden;
    ui.rel.sec.hidden = !r.itens.length;
    if (r.itens.length) { reconciliar(ui.rel, r.itens, 8); if (estavaOculta) { ui.rel.sec.classList.remove('hc-entra'); void ui.rel.sec.offsetWidth; ui.rel.sec.classList.add('hc-entra'); } }
    else { Object.keys(ui.rel.cache).forEach(function (k) { ui.rel.cache[k].remove(); delete ui.rel.cache[k]; }); }
    // 2. grupos base
    GRUPOS_BASE.forEach(function (id) {
      var g = ui.grupos[id], gr = GRP[id];
      var itens = itensDoGrupo(id);
      g.sec.hidden = !itens.length && id !== 'artista';
      var n = reconciliar(g, itens, gr.visiveis || 8);
      if (id === 'artista') { g.vazio.hidden = !!itens.length || !estado.busca; }
    });
    // 3. rodapé
    var nEsc = estado.esc.length, n = contar(estado.esc), total = nEsc ? n : C.eventosDe(cat, paraSelecao([])).length;
    var vazio = nEsc > 0 && n === 0;
    var a = ui.rodape.ver;
    a.textContent = vazio ? T.verVazio : nEsc ? T.ver(n) : T.verTodos;
    a.setAttribute('href', vazio ? '#' : href());
    a.setAttribute('aria-disabled', vazio ? 'true' : 'false');
    ui.rodape.resumo.textContent = nEsc ? T.escolhas(nEsc) : '';
    ui.rodape.resumo.hidden = !nEsc;
    ui.rodape.vazio.hidden = !vazio; ui.rodape.tirar.hidden = !vazio;
    ui.rodape.limpar.hidden = !nEsc; ui.rodape.pular.hidden = !(ui.primeiro && !nEsc); // sem escolha não há o que limpar: o botão sai (não fica desabilitado); no primeiro acesso, «Pular» ocupa o lugar
    atualizarBotoes();
    // 4. anúncios (HC-32 a HC-34), sem mover o foco
    if (surgiram.length && !removidoDe) { var nomes = surgiram.slice(0, 3).map(function (i) { return i.rotulo; }); anunciar(T.novas(nomes, surgiram.length - nomes.length)); }
    else if (removidoDe && tinha && !r.itens.length) anunciar(T.removidas(removidoDe));
    clearTimeout(timerN);
    timerN = setTimeout(function () { if (ui && anunciadoN !== n) { anunciadoN = n; ui.vivoN.textContent = ''; setTimeout(function () { if (ui) ui.vivoN.textContent = vazio ? T.vazio : T.contagemAnuncio(n); }, 30); } }, 650);
  }

  function atualizarBotoes() {
    var bs = document.querySelectorAll('[data-hc-n]'), n = estado.esc.length, txt = n ? String(n) : '';
    for (var i = 0; i < bs.length; i++) { if (bs[i].textContent !== txt) bs[i].textContent = txt; if (bs[i].hidden !== !n) bs[i].hidden = !n; } // só escreve quando muda: o observador abaixo vê qualquer escrita
    var ab = document.querySelectorAll('[data-hc-abrir]');
    for (var j = 0; j < ab.length; j++) if (ab[j].getAttribute('data-escolhas') !== String(n)) ab[j].setAttribute('data-escolhas', String(n));
  }

  function limpar() { estado.esc = []; novos = {}; anteriorRel = []; guardar(); renderizar(); if (ui) anunciar(T.escolhas(0).replace('0 escolhas', 'Escolhas limpas.')); }

  /* ---------- montagem do modal ---------- */
  function montarCorpo(c, primeiro) {
    ui = { c: c, grupos: {}, primeiro: primeiro };
    var corpo = c.corpo;
    var vivo = $('div', 'sr-only'); vivo.setAttribute('role', 'status'); vivo.setAttribute('aria-live', 'polite');
    var vivoN = $('div', 'sr-only'); vivoN.setAttribute('role', 'status'); vivoN.setAttribute('aria-live', 'polite');
    ui.vivo = vivo; ui.vivoN = vivoN; corpo.appendChild(vivo); corpo.appendChild(vivoN);
    ui.rel = secao('rel', ''); ui.rel.sec.classList.add('hc-grupo--rel'); ui.rel.sec.hidden = true; corpo.appendChild(ui.rel.sec);
    GRUPOS_BASE.forEach(function (id) {
      var g = secao(id, GRP[id].titulo); ui.grupos[id] = g; corpo.appendChild(g.sec);
      if (id === 'artista') {
        var campo = $('div', 'field hc-busca'); var lab = $('label', '', T.buscarArtista); lab.setAttribute('for', 'hc-busca-artista');
        var inp = $('input'); inp.type = 'search'; inp.id = 'hc-busca-artista'; inp.placeholder = T.phArtista; inp.autocomplete = 'off'; inp.setAttribute('enterkeyhint', 'search');
        inp.addEventListener('input', function () { estado.busca = inp.value; renderizar(); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
        campo.appendChild(lab); campo.appendChild(inp); g.sec.insertBefore(campo, g.lista);
        g.vazio = $('p', 'hc-apoio', T.semArtista); g.vazio.hidden = true; g.sec.appendChild(g.vazio);
      }
    });
    // rodapé
    var rod = c.rodape;
    var resumo = $('p', 'hc-resumo'); resumo.hidden = true;
    var vazio = $('p', 'hc-vazio', T.vazio); vazio.hidden = true;
    var tirar = $('button', 'linkbtn hc-tirar', T.tirar); tirar.type = 'button'; tirar.hidden = true;
    tirar.addEventListener('click', function () { var u = estado.esc.pop(); novos = {}; guardar(); renderizar(u ? rotuloDe(u) : ''); });
    var acoes = $('div', 'hc-acoes');
    var limp = $('button', 'bs', T.limpar); limp.type = 'button'; limp.addEventListener('click', limpar);
    // celular: o rótulo visível é «Limpar» (HC-16: «se o espaço pedir»); o nome acessível segue «Limpar escolhas»
    limp.setAttribute('aria-label', T.limpar);
    var mq = window.matchMedia ? matchMedia('(max-width: 640px)') : { matches: false };
    var rotuloLimpar = function () { limp.textContent = mq.matches ? T.limparCurto : T.limpar; }; rotuloLimpar();
    if (mq.addEventListener) mq.addEventListener('change', rotuloLimpar);
    var pular = $('button', 'bs', T.pular); pular.type = 'button'; pular.hidden = true; pular.addEventListener('click', function () { c.fechar(true); });
    var ver = $('a', 'bp', T.verTodos); ver.setAttribute('href', 'Busca.dc.html');
    ver.addEventListener('click', function (e) { if (ver.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    acoes.appendChild(pular); acoes.appendChild(limp); acoes.appendChild(ver);
    rod.appendChild(resumo); rod.appendChild(vazio); rod.appendChild(tirar); rod.appendChild(acoes);
    ui.rodape = { resumo: resumo, vazio: vazio, tirar: tirar, limpar: limp, pular: pular, ver: ver };
  }

  function abrir(o) {
    o = o || {};
    var primeiro = !!o.primeiro;
    var c = M.abrir({
      id: 'hc-modal', classe: 'hc-modal', titulo: T.titulo, descricao: T.sub, gatilho: o.gatilho, gatilhoSeletor: '[data-hc-abrir]',
      aoFechar: function () { ui = null; if (o.aoFechar) o.aoFechar(); },
      montar: function (m) {
        if (primeiro) { var k = $('p', 'over hc-kicker', T.primeiro); m.cabecalho.querySelector('.uui-modal__txt').insertBefore(k, m.cabecalho.querySelector('h2')); }
        var carregando = $('p', 'hc-apoio hc-carregando', T.carregando); m.corpo.appendChild(carregando);
        carregar().then(function () {
          if (!m.aberto) return;
          carregando.remove(); montarCorpo(m, primeiro); novos = {}; anteriorRel = []; renderizar();
        }).catch(function () {
          if (!m.aberto) return;
          falhou = true; carregando.textContent = T.erro;
          var t = $('button', 'bs', T.tentar); t.type = 'button'; t.addEventListener('click', function () { m.fechar(false); abrir(o); });
          m.corpo.appendChild(t);
        });
      }
    });
    return c;
  }

  /* ---------- gatilhos ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hc-abrir]');
    if (b) { e.preventDefault(); abrir({ gatilho: b }); return; }
    // «Buscar»: leva as escolhas da modal junto com o texto digitado
    var ir = e.target.closest && e.target.closest('.hb-ir');
    if (ir && estado.esc.length && grafo && cat) {
      var campo = document.querySelector('.hb-in');
      ir.setAttribute('href', href(estado.esc, { q: campo ? campo.value : '' }));
    }
  }, true);
  // as escolhas guardadas pintam o contador do botão já no primeiro quadro
  var tent = 0; (function marcar() { if (document.querySelector('[data-hc-n]')) atualizarBotoes(); else if (tent++ < 60) setTimeout(marcar, 150); })();
  new MutationObserver(function () { atualizarBotoes(); }).observe(document.documentElement, { childList: true, subtree: true });

  window.IngresseCurte = {
    abrir: abrir, href: href, contar: function (esc) { return contar(esc); }, estado: function () { return estado; }, carregar: carregar,
    selecao: function () { return cat ? paraSelecao(estado.esc) : null; },
    rotulos: function () { return estado.esc.map(rotuloDe); },
    limpar: function () { estado.esc = []; guardar(); atualizarBotoes(); }
  };
})();
