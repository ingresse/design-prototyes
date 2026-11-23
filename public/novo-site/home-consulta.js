/* home-consulta.js: a CONSULTA que a modal «O que você curte ao vivo?» faz ao catálogo (Edu do Udi, 29/10/2026). Fica POR CIMA de window.IngresseCatalogo (Iara, previa/catalogo-busca.js): não guarda dado.
   Os dados vêm pelos mesmos caminhos que a Busca lê:
     1. IngresseCatalogo.eventos()    /api/eventos, o catálogo único (inclui os eventos de gênero e o `lineup` de cada evento)
     2. IngresseCatalogo.artistas()   o índice de artistas (previa/dados/busca-artistas.json)
     3. dados/esportes-lista.json     as provas do Ingresse Sports (as mesmas que a Busca mostra em «Tudo» e em «Ingresse Sports»)
     4. dados/home-reais.json         o pool fixo do v5.3 e os eventos do grupo que a Busca ainda embute em busca/geral-pool.js (derivado dele na geração; sem cópia à mão)
   O cálculo espelha o da Busca «Tudo» (calcTudo e facetar: OU dentro de um grupo de filtro, E entre grupos; a cidade é a «de verdade», de «Casa · Cidade, UF») e o do Ingresse Sports (casa(): modalidade, distância, público em OU),
   para o «Ver N eventos» ser o número que a Busca vai mostrar. O sorteio usa o pool do Iara (IngresseCatalogo.pool/roleta) e esta consulta só para ler as escolhas da modal.
   API: window.IngresseConsulta = { carregar(), norm, eventosDe(selecao, opcoes), ehEscopoEsportes(selecao) }. */
(function () {
  'use strict';
  if (window.IngresseConsulta) return;

  var UF = { SP: 'São Paulo', RJ: 'Rio de Janeiro', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', MG: 'Minas Gerais', BA: 'Bahia', PR: 'Paraná', PE: 'Pernambuco', CE: 'Ceará', DF: 'Distrito Federal', GO: 'Goiás', ES: 'Espírito Santo', AL: 'Alagoas' };
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var norm = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var uniq = function (a) { var m = {}; return a.filter(function (x) { return m[x] ? false : (m[x] = true); }); };
  var VENDA = { venda: 1, pre: 1 }; // só o que se pode comprar entra no sorteio (HR: «à venda ou em pré-venda»)

  /* a cidade «de verdade» do evento: «Casa · Cidade, UF» (a mesma conta da Busca, buCidadeDe) */
  function cidadeDe(venue, fallback) { var v = (String(venue || '').split(' · ').pop() || '').trim(), m = /^(.+),\s*([A-Z]{2})$/.exec(v); return m ? m[1].trim() : (fallback || ''); }
  function ufDe(venue) { var m = /,\s*([A-Z]{2})\s*$/.exec(String(venue || '')); return m ? m[1] : ''; }
  function json(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  function dataCurta(iso, fallback) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return fallback || '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    return SEM[d.getUTCDay()] + ' ' + (+m[3]) + ' ' + MES[+m[2] - 1];
  }

  /* ---- 1. catálogo geral: o mesmo que a Busca monta em `catalog` ---- */
  function deApi(e) {
    var href = window.IngresseDestinos ? window.IngresseDestinos.evento(e) : 'Evento.dc.html';
    return {
      id: 'g' + e.id, rid: e.id, nome: e.name, data: e.date, iso: e.iso || '', local: e.venue, regiao: cidadeDe(e.venue, UF[e.state] || e.state || 'Outros'), uf: e.state || '',
      cats: e.cats || [], tags: e.tags || [], lineup: e.lineup || [], situacao: e.situacao || 'venda', rotulo: e.situacaoRotulo || '', preco: e.fromCents != null ? Math.ceil(e.fromCents / 100) : 0,
      img: e.img, href: href, origem: 'Ingresse', tipo: 'geral', flag: e.flag || '', m: !!e.m
    };
  }
  /* ---- 3. reais e grupo (home-reais.json) ---- */
  function deReal(e) {
    return { id: 'r' + norm(e.name).replace(/[^a-z0-9]+/g, '-'), nome: e.name, data: e.date, iso: e.iso || '', local: e.venue, regiao: cidadeDe(e.venue, e.city), uf: ufDe(e.venue), cats: e.cats || [], tags: e.tags || [], lineup: [], situacao: 'venda', rotulo: 'À venda', preco: e.preco || 0,
      img: e.img, href: e.href || 'Evento.dc.html', origem: e.origin || 'Ingresse', tipo: 'geral', flag: e.status || '', ext: !!e.ext };
  }
  /* ---- 2. provas do Ingresse Sports (esportes-lista.json) ---- */
  function deProva(p) {
    var tags = uniq((p.m || []).concat(p.db || [], (p.pu || []).indexOf('kids') >= 0 ? ['kids'] : []));
    return {
      id: 'p' + p.i, rid: p.i, nome: p.n, data: dataCurta(p.iso) + (p.c ? ' · ' + p.c : ''), iso: p.iso || '', local: p.l, regiao: p.c, uf: p.u, cidade: p.c, cats: ['esportes'].concat((p.m || []).some(function (m) { return m === 'corrida' || m === 'trail-run' || m === 'caminhada'; }) ? ['corridas'] : []), tags: tags, lineup: [], situacao: p.s, rotulo: p.s === 'pre' ? 'Pré-venda' : 'Inscrições abertas',
      preco: p.p || 0, img: p.cv ? './assets/ticketsports/' + p.cv + '.webp' : './cymatics-cat/' + p.i + '.png', href: 'Evento.dc.html?esporte=' + p.i, origem: 'Ingresse', tipo: 'prova',
      prova: { mod: p.m || [], db: p.db || [], tr: p.tr || [], pu: p.pu || [], sv: p.sv || [], cidade: p.c, fim: p.s === 'encerrado' || p.s === 'cancelado', virtual: !!p.v, rd: p.rd || [] },
      regiaoCidade: p.c
    };
  }

  function catalogoIara() { return window.IngresseCatalogo; }
  var FONTES = [
    { ler: function () { return catalogoIara().eventos().then(function (l) { return l.filter(function (e) { return (e.cats || []).indexOf('corridas') < 0; }).map(deApi); }); } }, // a Busca tira as corridas do geral: são provas nativas do Sports
    { ler: function () { return json('./dados/home-reais.json').then(function (d) { var hoje = new Date(); hoje.setHours(0, 0, 0, 0); // como a Busca: o que sobra do pool fixo do v5.3 só vale se ainda for futuro
      return d && d.eventos ? d.eventos.filter(function (e) { return e.origin !== 'TicketSports' && e.iso && new Date(String(e.iso).slice(0, 10) + 'T12:00:00') >= hoje; }).map(deReal) : []; }); } },
    { ler: function () { return json('./dados/esportes-lista.json').then(function (d) { return d && d.e ? d.e.map(deProva).filter(function (e) { return !e.prova.fim; }) : []; }); } }
  ];

  var memo = null;
  function carregar() {
    if (memo) return memo;
    var c = { eventos: [] };
    memo = Promise.all(FONTES.map(function (f) { return f.ler(); })).then(function (listas) {
      // o catálogo manda (como na Busca, geral-pool.js): um evento fixo do v5.3 cujo nome já está no catálogo não entra de novo
      var nomes = {}; listas[0].forEach(function (e) { nomes[norm(e.nome).replace(/[^a-z0-9]+/g, ' ').trim()] = 1; });
      listas[1] = listas[1].filter(function (e) { return !nomes[norm(e.nome).replace(/[^a-z0-9]+/g, ' ').trim()]; });
      listas.forEach(function (l) { c.eventos = c.eventos.concat(l); });
    }).then(function () { return catalogoIara().artistas('', { soComEventos: true }).then(function (a) { c.artistasIara = a; }); }).then(function () {
      c.eventos.forEach(function (e) {
        e.ts = Date.parse(e.iso) || 0;
        e.txt = norm([e.nome, e.local, e.regiao, e.cidade || ''].join(' ')); // a Busca procura no nome, no local e na cidade (e nos rótulos das tags)
      });
      c.artistas = (c.artistasIara || []).map(function (a) { return { id: a.id, nome: a.nome, norm: norm(a.nome), busca: a.busca, generos: a.generos || [], eventoIds: a.eventoIds || [], foto: a.foto || a.avatar || null }; });
      return c;
    });
    return memo;
  }

  /* ---- seleção -> eventos ----
     selecao = { categoria:[slugs], tags:[ids], mod:[], dist:[], terr:[], pub:[], serv:[], regiao:[cidades], q:'texto' (casa), artistas:[{id,norm}] }
     A REGRA É A DA BUSCA «TUDO» (calcTudo/facetar): OU dentro de um grupo, E entre grupos. Os grupos de tag vêm da faceta da folksonomia:
     genero -> gen; ocasiao e datas -> oca; esporte -> mod; distancia -> dis; o resto -> ext. Categoria: o tipo do evento (as provas valem `esportes` e, se corrida, `corridas`).
     `facetaDe(id)` é posto por home-curte.js (o grafo sabe a faceta de cada tag). */
  var FG = { genero: 'gen', ocasiao: 'oca', datas: 'oca', esporte: 'mod', distancia: 'dis' };
  var facetaDe = function () { return ''; };
  function grupoTag(id) { return FG[facetaDe(id)] || 'ext'; }
  function tagsOk(e, tags) {
    var por = {};
    tags.forEach(function (t) { var g = grupoTag(t); (por[g] = por[g] || []).push(t); });
    return Object.keys(por).every(function (g) { return e.tags.some(function (t) { return grupoTag(t) === g && por[g].indexOf(t) >= 0; }); });
  }
  var CAT_ESPORTE = { esportes: 1, corridas: 1 };
  function ehEscopoEsportes(s) {
    return !!((s.categoria || []).some(function (c) { return CAT_ESPORTE[c]; }) || (s.mod || []).length || (s.dist || []).length || (s.terr || []).length || (s.serv || []).length || (s.pub || []).length);
  }
  /* Ingresse Sports (esportes-logica.js, casa()): modalidade, distância, terreno e público em OU; serviços em E; cidade e texto */
  /* o lugar do cabeçalho (IngresseLocal.contem, hierárquico: o estado inclui as cidades, o país inclui tudo) */
  function noLugar(e, lugar) { return !window.IngresseLocal || window.IngresseLocal.contem({ id: e.rid, uf: e.uf, cidade: e.cidade || e.regiao, pais: e.pais }, lugar); }
  function casaProva(e, s) {
    var p = e.prova;
    if (s.lugar && !noLugar(e, s.lugar)) return false;
    var mods = (s.mod || []).slice(); if ((s.categoria || []).indexOf('corridas') >= 0 && !mods.length) mods.push('corrida');
    if (mods.length && !mods.some(function (v) { return p.mod.indexOf(v) >= 0; })) return false;
    if ((s.dist || []).length && !s.dist.some(function (v) { return p.db.indexOf(v) >= 0; })) return false;
    if ((s.terr || []).length && !s.terr.some(function (v) { return p.tr.indexOf(String(v).replace(/^terreno-/, '')) >= 0; })) return false;
    if ((s.pub || []).length && !s.pub.some(function (v) { return p.pu.indexOf(v) >= 0; })) return false;
    if ((s.serv || []).length && !s.serv.every(function (v) { return p.sv.indexOf(v) >= 0; })) return false;
    if ((s.regiao || []).length && s.regiao.indexOf(p.cidade) < 0) return false;
    if ((s.tags || []).length && !tagsOk(e, s.tags)) return false;
    if (s.q && e.txt.indexOf(norm(s.q)) < 0) return false;
    return true;
  }
  function casaTudo(e, s) {
    if (s.lugar && !noLugar(e, s.lugar)) return false;
    if (e.situacao === 'cancelado' || e.situacao === 'encerrado') return false; // como na Busca (29/10): fora por padrão; «Incluir eventos encerrados e cancelados» os traz
    var cats = (s.categoria || []).filter(function (c) { return !CAT_ESPORTE[c]; });
    if (e.tipo === 'geral' && cats.length && !e.cats.some(function (c) { return cats.indexOf(c) >= 0; })) return false;
    if (e.tipo === 'prova' && (s.categoria || []).length && !e.cats.some(function (c) { return s.categoria.indexOf(c) >= 0; })) return false;
    if ((s.regiao || []).length && s.regiao.indexOf(e.regiao) < 0) return false;
    if ((s.tags || []).length && !tagsOk(e, s.tags)) return false;
    if (s.q && e.txt.indexOf(norm(s.q)) < 0) return false;
    if ((s.artistas || []).length && !s.artistas.some(function (a) { return e.lineup.indexOf(a.id) >= 0 || (e.id.charAt(0) === 'r' && e.txt.indexOf(a.norm) >= 0); })) return false; // ?artista=<id>: o lineup do evento; os fixos do v5.3 (sem lineup) casam pelo nome do artista, como a Busca (29/10)
    return true;
  }
  function eventosDe(c, s, o) {
    o = o || {};
    // o lugar do cabeçalho vale em TODA consulta (como na Busca); `s.lugar = null` consulta sem lugar (o sorteio é sobre todos os eventos)
    if (s.lugar === undefined) s = Object.assign({}, s, { lugar: window.IngresseLocal ? window.IngresseLocal.get() : null });
    var lista = ehEscopoEsportes(s)
      ? c.eventos.filter(function (e) { return e.tipo === 'prova' && casaProva(e, s); })
      : c.eventos.filter(function (e) { return casaTudo(e, s); });
    if (o.apenasVenda) lista = lista.filter(function (e) { return VENDA[e.situacao]; });
    return lista;
  }

  window.IngresseConsulta = { carregar: carregar, norm: norm, eventosDe: eventosDe, ehEscopoEsportes: ehEscopoEsportes, VENDA: VENDA, UF: UF, facetas: function (fn) { facetaDe = fn; }, grupoTag: grupoTag };
})();
