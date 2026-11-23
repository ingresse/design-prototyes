/* catalogo-busca.js: window.IngresseCatalogo, o acesso único da Home e da Busca aos dados de gêneros, artistas, locais e do sorteio (Iara Menezes, 29/10/2026).
   Contrato e esquemas: docs/produto/BUSCA-ARTISTAS-LOCAIS-DADOS.md. A fonte dos dados é tools/previa/busca-dados.mjs; o gerador copia este arquivo para previa/catalogo-busca.js.

   Não duplica o catálogo: os EVENTOS vêm de /api/eventos (a mesma resposta que a Busca e a Home já leem); os índices (previa/dados/busca-*.json, catalogo-indice.json,
   sorteio-pool.json) só trazem ids, contagens e o que não cabe no evento. Nada é carregado até alguém chamar uma função (zero custo para quem não usa).
   Todas as funções devolvem Promise. ES5, sem dependências. */
(function () {
  if (window.IngresseCatalogo) return;

  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  var cache = {};
  function json(url) {
    if (!cache[url]) cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ': ' + r.status); return r.json(); });
    return cache[url];
  }
  var URL_EVENTOS = '/api/eventos';
  var DADOS = './dados/';

  /** Todos os eventos do catálogo único, o mesmo formato da Busca e da Home (id, name, iso, date, venue, state, img, cats, situacao, fromCents, tags, lineup…). */
  function eventos() { return json(URL_EVENTOS).then(function (d) { return d.events || []; }); }
  function indice() { return json(DADOS + 'catalogo-indice.json'); }
  function porId(lista) { var m = {}; lista.forEach(function (e) { m[e.id] = e; }); return m; }

  /** Gêneros musicais na ordem dos chips da Home: [{ id, rotulo, href, total, aVenda, extraNaBusca, artistas, ids }]. O rótulo é o da folksonomia (uma fonte só). */
  function generos(opcoes) {
    var o = opcoes || {};
    return indice().then(function (d) { return d.generos.filter(function (g) { return g.total >= (o.minimo || 1); }); });
  }

  /** Eventos de um gênero, prontos para o carrossel: à venda primeiro, depois por data. opcoes: { limite, soAVenda, uf, cidade }. */
  function eventosDoGenero(id, opcoes) {
    var o = opcoes || {};
    return Promise.all([indice(), eventos()]).then(function (r) {
      var g = r[0].generos.filter(function (x) { return x.id === id; })[0];
      if (!g) return [];
      var mapa = porId(r[1]);
      var lista = g.ids.map(function (i) { return mapa[i]; }).filter(Boolean);
      if (o.soAVenda) lista = lista.filter(function (e) { return e.situacao === 'venda' || e.situacao === 'pre'; });
      if (o.uf) lista = lista.filter(function (e) { return e.state === o.uf; });
      if (o.cidade) lista = lista.filter(function (e) { return norm(e.venue.split(' · ')[1] || '').indexOf(norm(o.cidade)) === 0; });
      return o.limite ? lista.slice(0, o.limite) : lista;
    });
  }

  /* ---- busca de artistas e de locais: sem acento, por nome e por alias ---- */
  function pontuar(item, termos) {
    var texto = item.busca, nome = norm(item.nome), nota = 0;
    for (var i = 0; i < termos.length; i++) {
      var t = termos[i], p = texto.indexOf(t);
      if (p < 0) return 0;
      var inicioDePalavra = p === 0 || texto.charAt(p - 1) === ' ';
      nota += nome === t ? 100 : nome.indexOf(t) === 0 ? 60 : inicioDePalavra ? 30 : 10;
    }
    return nota;
  }
  function procurar(lista, q, o) {
    var termos = norm(q).split(' ').filter(Boolean);
    if (!termos.length) return [];
    var achados = lista.map(function (x) { return { x: x, n: pontuar(x, termos) }; }).filter(function (r) { return r.n > 0; });
    achados.sort(function (a, b) { return b.n - a.n || b.x.eventos - a.x.eventos || a.x.nome.localeCompare(b.x.nome, 'pt-BR'); });
    var saida = achados.map(function (r) { return r.x; });
    return o && o.limite ? saida.slice(0, o.limite) : saida;
  }
  /** Artistas que casam com o texto (nome ou alias, sem acento). opcoes: { limite, genero, soComEventos }. Sem texto, devolve a lista toda (já ordenada). */
  function artistas(q, opcoes) {
    var o = opcoes || {};
    return json(DADOS + 'busca-artistas.json').then(function (d) {
      var l = d.artistas;
      if (o.genero) l = l.filter(function (a) { return a.generos.indexOf(o.genero) >= 0; });
      if (o.soComEventos) l = l.filter(function (a) { return a.eventos > 0; });
      return q == null || q === '' ? (o.limite ? l.slice(0, o.limite) : l) : procurar(l, q, o);
    });
  }
  /** Locais que casam com o texto. opcoes: { limite, cidade, uf, soComEventos }. Sem texto, devolve a lista toda (já ordenada). */
  function locais(q, opcoes) {
    var o = opcoes || {};
    return json(DADOS + 'busca-locais.json').then(function (d) {
      var l = d.locais;
      if (o.cidade) l = l.filter(function (v) { return norm(v.cidade) === norm(o.cidade); });
      if (o.uf) l = l.filter(function (v) { return v.uf === o.uf; });
      if (o.soComEventos) l = l.filter(function (v) { return v.eventos > 0; });
      return q == null || q === '' ? (o.limite ? l.slice(0, o.limite) : l) : procurar(l, q, o);
    });
  }

  /* ---- sorteio ---- */
  function intersecta(a, b) { for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) >= 0) return true; return false; }
  /** Pool filtrado. Os grupos se somam com E; dentro de cada grupo basta um (OU).
      filtro: { tags: [], categorias: [], artistas: [], uf: [], cidades: [], grupos: [], excluir: [ids] }.
      O que a pessoa escolheu como tag (gênero, ocasião, esporte) casa com `tags`; o tipo de evento (shows, baladas…) com `categorias`. */
  function pool(filtro) {
    var f = filtro || {};
    return json(DADOS + 'sorteio-pool.json').then(function (d) {
      var ex = f.excluir || [];
      var cid = (f.cidades || []).map(norm);
      return d.eventos.filter(function (e) {
        if (ex.indexOf(e.id) >= 0) return false;
        if (f.tags && f.tags.length && !intersecta(f.tags, e.tags)) return false;
        if (f.categorias && f.categorias.length && !intersecta(f.categorias, e.categorias)) return false;
        if (f.artistas && f.artistas.length && !intersecta(f.artistas, e.artistas)) return false;
        if (f.uf && f.uf.length && f.uf.indexOf(e.uf) < 0) return false;
        if (cid.length && cid.indexOf(norm(e.cidade)) < 0) return false;
        if (f.grupos && f.grupos.length && f.grupos.indexOf(e.grupo) < 0) return false;
        return true;
      });
    });
  }
  /** Sorteia um evento do pool filtrado. Devolve { evento, exato, total }: exato = false quando o filtro não achou nada e o sorteio relaxou para o pool inteiro (cabe ao chamador avisar). */
  function sortear(filtro, aleatorio) {
    var r = aleatorio || Math.random;
    return pool(filtro).then(function (lista) {
      if (lista.length) return { evento: lista[Math.floor(r() * lista.length)], exato: true, total: lista.length };
      return pool({ excluir: (filtro && filtro.excluir) || [] }).then(function (todos) { return { evento: todos.length ? todos[Math.floor(r() * todos.length)] : null, exato: false, total: todos.length }; });
    });
  }
  /** Lista para a «roleta»: até n eventos diversos (um por categoria e UF enquanto der), sem repetir. */
  function roleta(filtro, n, aleatorio) {
    var r = aleatorio || Math.random, quero = n || 12;
    return pool(filtro).then(function (lista) {
      var emb = lista.slice();
      for (var i = emb.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = emb[i]; emb[i] = emb[j]; emb[j] = t; }
      var vistos = {}, saida = [];
      emb.forEach(function (e) { var k = e.categorias[0] + '|' + e.uf; if (!vistos[k] && saida.length < quero) { vistos[k] = 1; saida.push(e); } });
      emb.forEach(function (e) { if (saida.length < quero && saida.indexOf(e) < 0) saida.push(e); });
      return saida;
    });
  }

  window.IngresseCatalogo = { versao: 1, norm: norm, eventos: eventos, generos: generos, eventosDoGenero: eventosDoGenero, artistas: artistas, locais: locais, pool: pool, sortear: sortear, roleta: roleta, indice: indice };
})();
