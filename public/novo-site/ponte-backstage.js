/* ponte-backstage.js: liga o novo site (protótipo estático copiado de ingresse-novo-site-prototipo.vercel.app) ao banco
   unificado do design-prototypes (src/plataforma), o mesmo que o Backstage grava.

   O site novo já tem um modo «BFF» (?dados=bff, guardado em localStorage 'previa-dados'): nele, os scripts de cada página
   trocam /api/eventos por /api/bff/eventos e os índices de dados/ por /api/bff/dados/*, e a página do evento abre com
   Evento.dc.html?bff=<id>, lendo /api/bff/evento/<id>. Esta ponte responde essas rotas no navegador, a partir do banco:

     /api/eventos                  catálogo fixo do protótipo (_api/eventos.json, cópia do deploy original)
     /api/bff/eventos              catálogo fixo + eventos PUBLICADOS do Backstage
     /api/bff/dados/categoria-*    categoria fixa + eventos publicados do Backstage daquela categoria
     /api/bff/dados/*              o arquivo fixo de dados/ (índices de busca, sorteio…)
     /api/bff/evento/<id>          o evento do Backstage (mesmo privado: a página abre por link)

   Banco: GET /api/db (compartilhado, na Vercel) e, sem API (npm run dev), o localStorage 'plataforma:db:v1' deste navegador,
   como faz src/plataforma/db. Sem banco nenhum (o Backstage nunca foi aberto neste navegador), o BFF responde 503 e o site
   mostra só o catálogo fixo.

   Ids: o site usa ids numéricos e trata como «do BFF» os ids de 10000 para cima. O id do Backstage vira 100000 + hash
   (estável), e Evento.dc.html?ev=<id do Backstage> é aceito e trocado pelo ?bff= certo (o link «Ver no site» do Backstage).
   Este arquivo é nosso, não veio do deploy: ao atualizar a cópia do site, mantenha-o e a <script> no topo de cada .dc.html. */
(function () {
  if (window.__ponteBackstage) return;
  window.__ponteBackstage = true;

  var f0 = window.fetch.bind(window);
  var BASE = new URL('./', (document.currentScript && document.currentScript.src) || location.href).href;
  var LOCAL_KEY = 'plataforma:db:v1';

  /* ---------- ids ---------- */
  function idDoSite(id) {
    var h = 0x811c9dc5;
    for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 100000 + (h % 899999);
  }

  /* ---------- banco ---------- */
  var bancoP = null;
  function banco() {
    if (bancoP) return bancoP;
    bancoP = f0('/api/db', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok || (r.headers.get('content-type') || '').indexOf('json') < 0) throw new Error('sem api');
        return r.json();
      })
      .then(function (r) { var c = r.colecoes || {}; return { eventos: c.eventos || [], ingressos: c.ingressos || [], historico: c.historico || [] }; })
      .catch(function () {
        try {
          var p = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
          var t = p && p.tabelas;
          if (!t) return null;
          var vals = function (o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); };
          return { eventos: vals(t.eventos), ingressos: vals(t.ingressos), historico: vals(t.historico) };
        } catch (e) { return null; }
      });
    return bancoP;
  }

  var fixoP = null;
  function catalogoFixo() {
    if (!fixoP) fixoP = f0(BASE + '_api/eventos.json').then(function (r) { return r.json(); });
    return fixoP;
  }
  var lugaresP = null;
  function lugares() {
    if (!lugaresP) lugaresP = f0(BASE + 'dados/lugares.json').then(function (r) { return r.json(); }).catch(function () { return { lugares: [] }; });
    return lugaresP;
  }

  /* ---------- regras (as mesmas de src/plataforma/regras.ts) ---------- */
  function vendidosPorLote(b) {
    var m = {};
    (b.historico || []).forEach(function (h) { Object.keys(h.porLote || {}).forEach(function (l) { m[l] = (m[l] || 0) + h.porLote[l]; }); });
    (b.ingressos || []).forEach(function (i) { if (i.status !== 'cancelado') m[i.loteId] = (m[i.loteId] || 0) + 1; });
    return m;
  }
  function precoMinimo(e, vendidos) {
    var min = null;
    (e.sessoes || []).forEach(function (s) {
      (s.grupos || []).forEach(function (g) {
        (g.ingressos || []).forEach(function (t) {
          if (!t.ativo) return;
          var l = (t.lotes || []).filter(function (x) { return !x.pausado && (vendidos[x.id] || 0) < x.quantidade; })[0];
          if (l && (min === null || l.preco < min)) min = l.preco;
        });
      });
    });
    return min;
  }

  /* ---------- conversão ---------- */
  var CATEGORIA = {
    // coleção categorias da plataforma (src/plataforma/categorias-catalogo.ts)
    shows: 'shows', festivais: 'festivais', 'festas-e-baladas': 'baladas', universitario: 'universitario', futebol: 'futebol',
    esportes: 'esportes', 'artes-cenicas': 'teatro', humor: 'stand-up', 'kids-e-familia': 'infantil', 'feiras-e-exposicoes': 'feiras',
    // vitrine antiga (eventos da seed)
    eletronica: 'musica-eletronica', sertanejo: 'shows', rock: 'shows', rap: 'shows', teatro: 'teatro', standup: 'stand-up', festival: 'festivais',
  };
  var NOME_CATEGORIA = {};
  function categoriasDoEvento(e) {
    var c = CATEGORIA[e.categoria] || CATEGORIA[(e.vitrine || {}).categoria];
    if (!c && e.tipo === 'futebol') c = 'futebol';
    if (!c && e.tipo === 'esportivo') c = e.modalidade === 'corrida' ? 'corridas' : 'esportes';
    return [c || 'shows'];
  }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function slug(t) { return norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function lugarDe(cidade, ls) {
    var n = norm(cidade);
    var c = n && ls.filter(function (l) { return l.nivel === 'cidade' && (norm(l.nome) === n || (l.chaves || []).indexOf(n) >= 0); })[0];
    if (!c) return null;
    return { lugar: { cidade: c.id, uf: c.uf, regiao: c.regiao, pais: c.pais, continente: c.continente }, sigla: c.sigla, geo: { lat: c.lat, lng: c.lng } };
  }
  var SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function comFuso(iso) { return iso && !/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? (iso.length === 16 ? iso + ':00' : iso) + '-03:00' : iso; }
  function dataCurta(isoLocal) {
    var m = /^(\d{4})-(\d\d)-(\d\d)T?(\d\d)?:?(\d\d)?/.exec(isoLocal || '');
    if (!m) return '';
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    var h = m[4] ? Number(m[4]) + 'h' + (m[5] && m[5] !== '00' ? m[5] : '') : '';
    return SEM[d.getDay()] + ' ' + Number(m[3]) + ' ' + MES[d.getMonth()] + (h ? ' · ' + h : '');
  }
  // como apareceNoSite (src/plataforma/regras.ts): quem decide é o status do Backstage, não a data (a seed tem datas passadas)
  function situacao(e, min) {
    if (e.status === 'encerrado') return 'encerrado';
    return min === null ? 'esgotado' : 'venda';
  }
  var ROTULO = { venda: 'À venda', esgotado: 'Esgotado', encerrado: 'Encerrado' };
  function rotuloDaTag(id, cat) { var t = cat && cat.c && cat.c[id]; return (t && t.pt) || id.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function tagsDoEvento(e) { return (e.tags && e.tags.length ? e.tags : (e.vitrine || {}).tags || []).map(slug).filter(Boolean); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function paraCatalogo(e, vendidos, ls) {
    var min = precoMinimo(e, vendidos), sit = situacao(e, min), onde = lugarDe(e.cidade, ls);
    var cidade = e.cidade ? e.cidade + (onde && onde.sigla ? ', ' + onde.sigla : '') : '';
    return {
      id: idDoSite(e.id), name: e.nome, iso: comFuso(e.data), date: dataCurta(e.data),
      venue: [e.local, cidade].filter(Boolean).join(' · '), state: onde ? onde.sigla : '',
      img: e.capa || BASE + 'assets/brand/venue-pista.avif', url: '#', flag: '',
      cats: categoriasDoEvento(e), situacao: sit, situacaoRotulo: ROTULO[sit],
      fromCents: min === null ? null : Math.round(min * 100),
      tags: tagsDoEvento(e), tagsOrigem: {}, lineup: [],
      lugar: onde ? onde.lugar : undefined,
      backstage: { id: e.id, produtora: e.produtora },
    };
  }

  function contexto() {
    return Promise.all([banco(), catalogoFixo(), lugares()]).then(function (r) {
      var b = r[0], fixo = r[1], ls = (r[2] && r[2].lugares) || [];
      (fixo.categories || []).forEach(function (c) { NOME_CATEGORIA[c.slug] = c.name; });
      return { b: b, fixo: fixo, ls: ls, vendidos: b ? vendidosPorLote(b) : {} };
    });
  }

  /* ---------- rotas ---------- */
  function json(d, status) { return new Response(JSON.stringify(d), { status: status || 200, headers: { 'content-type': 'application/json' } }); }
  function semBanco() { return json({ error: 'sem banco do Backstage neste navegador (abra o Backstage uma vez)' }, 503); }

  function bffEventos() {
    return contexto().then(function (x) {
      if (!x.b) return semBanco();
      var novos = x.b.eventos.filter(function (e) { return e.status === 'publicado'; })
        .map(function (e) { return paraCatalogo(e, x.vendidos, x.ls); })
        .sort(function (a, z) { return Date.parse(a.iso) - Date.parse(z.iso); });
      var c = Object.assign({}, x.fixo, { events: novos.concat(x.fixo.events || []), backstage: novos.length });
      return json(c);
    });
  }

  function bffCategoria(nome) {
    var slugCat = nome.replace(/^categoria-|\.json$/g, '');
    return Promise.all([contexto(), f0(BASE + 'dados/' + nome).then(function (r) { return r.ok ? r.json() : null; })]).then(function (r) {
      var x = r[0], fixo = r[1];
      if (!fixo || !Array.isArray(fixo.e)) return json({ error: 'categoria indisponível' }, 404);
      if (!x.b) return json(fixo);
      var novos = x.b.eventos.filter(function (e) { return e.status === 'publicado'; })
        .map(function (e) { return paraCatalogo(e, x.vendidos, x.ls); })
        .filter(function (c) { return c.cats.indexOf(slugCat) >= 0 && c.situacao !== 'encerrado'; })
        .map(function (c) {
          var p = c.venue.split(' · ');
          return { i: c.id, n: c.name, d: c.iso, l: p[0] || '', c: (p[1] || '').replace(/, [A-Z]{2}$/, ''), u: c.state, s: c.situacao, p: c.fromCents || 0, t: c.tags, k: c.cats, lg: c.lugar && c.lugar.cidade, img: c.img };
        });
      var cidades = (fixo.cidades || []).slice();
      novos.forEach(function (n) { if (n.c && !cidades.some(function (c) { return c.v === n.c; })) cidades.push({ v: n.c, l: n.c }); });
      return json(Object.assign({}, fixo, { e: novos.concat(fixo.e), total: (fixo.total || fixo.e.length) + novos.length, cidades: fixo.cidades ? cidades : undefined }));
    });
  }

  function bffEvento(idSite) {
    return contexto().then(function (x) {
      if (!x.b) return semBanco();
      var e = x.b.eventos.filter(function (ev) { return idDoSite(ev.id) === idSite; })[0];
      if (!e) return json({ error: 'evento ' + idSite + ' não está no banco do Backstage' }, 404);
      var c = paraCatalogo(e, x.vendidos, x.ls), onde = lugarDe(e.cidade, x.ls), v = e.vitrine || {};
      var descricao = v.descricaoHtml || (v.descricao || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      var sessoes = (e.sessoes || []).slice().sort(function (a, z) { return a.inicio < z.inicio ? -1 : 1; });
      return json({
        evento: Object.assign({}, c, { bff: { timezone: 'America/Sao_Paulo' } }),
        detalhe: {
          timezone: 'America/Sao_Paulo',
          venue: { name: e.local, city: e.cidade || '', state: onde ? onde.sigla : '', address: '', geo: onde ? onde.geo : null },
          artists: v.artista ? [{ name: v.artista }] : [],
          description: descricao,
          sessionsCount: sessoes.length,
          endsAt: sessoes[0] && sessoes[0].fim ? comFuso(sessoes[0].fim) : null,
          ageRating: '',
          categories: c.cats.map(function (s) { return { slug: s, name: NOME_CATEGORIA[s] || s }; }),
        },
        tags: c.tags.map(function (t) { return { id: t, rotulo: rotuloDaTag(t, x.fixo.tagCatalog) }; }),
        backstage: { id: e.id, slug: e.slug, compra: '/comprar/' + e.id },
      });
    });
  }

  window.fetch = function (u, o) {
    var url = typeof u === 'string' ? u : (u && u.url) || '';
    var p;
    try { p = new URL(url, location.href).pathname; } catch (err) { return f0(u, o); }
    var m;
    if (/^\/api\/eventos(\.json)?$/.test(p)) return f0(BASE + '_api/eventos.json', o);
    if (p === '/api/bff/eventos') return bffEventos();
    if ((m = /^\/api\/bff\/evento\/(\d+)$/.exec(p))) return bffEvento(Number(m[1]));
    if ((m = /^\/api\/bff\/dados\/(categoria-[a-z0-9-]+\.json)$/.exec(p))) return bffCategoria(m[1]);
    if ((m = /^\/api\/bff\/dados\/([a-z0-9-]+\.json)$/.exec(p))) return f0(BASE + 'dados/' + m[1], o);
    if (/^\/api\/bff\//.test(p)) return Promise.resolve(json({ error: 'sem esta rota na ponte' }, 404));
    return f0(u, o);
  };

  /* ---------- link do Backstage: Evento.dc.html?ev=<id do Backstage> ---------- */
  var qs = new URLSearchParams(location.search);
  if (qs.get('ev') && !qs.get('bff') && /Evento\.dc\.html$/.test(location.pathname)) {
    qs.set('bff', String(idDoSite(qs.get('ev'))));
    qs.delete('ev');
    history.replaceState(history.state, '', location.pathname + '?' + qs.toString() + location.hash);
  }

  /* ---------- compra: na página do evento do Backstage, o botão de compra vai para a seleção de ingressos da plataforma ---------- */
  var bff = /[?&]bff=(\d+)/.exec(location.search);
  if (bff && /Evento\.dc\.html$/.test(location.pathname)) {
    bffEvento(Number(bff[1])).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.backstage) return;
      var alvo = d.backstage.compra;
      function hora(iso) {
        var p = {};
        new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
        return Number(p.hour) + 'h' + (p.minute && p.minute !== '00' ? p.minute : '');
      }
      // «Sobre o evento» do modo MVP (evento-bff.js só conhece o «Sobre» do layout completo): descrição e horário do Backstage
      function sobreMvp() {
        var card = document.querySelector('.mvp-sobre__card');
        if (!card || card.getAttribute('data-ponte') === bff[1]) return;
        card.setAttribute('data-ponte', bff[1]);
        var doc = new DOMParser().parseFromString(String(d.detalhe.description || ''), 'text/html');
        var blocos = doc.body.querySelectorAll('p, li, h1, h2, h3, h4');
        var textos = (blocos.length ? Array.prototype.map.call(blocos, function (b) { return b.textContent; }) : [doc.body.textContent])
          .map(function (t) { return t.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
        if (!textos.length) textos = [d.evento.name + (d.detalhe.venue.name ? ', em ' + d.detalhe.venue.name : '') + '.'];
        var h3 = card.querySelector('h3');
        Array.prototype.slice.call(card.children).forEach(function (el) { if (el.tagName === 'P' && (!h3 || el.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING)) el.remove(); });
        textos.forEach(function (t, i) { var p = document.createElement('p'); if (!i) p.className = 'mvp-sobre__abre'; p.textContent = t; card.insertBefore(p, h3 || null); });
        card.querySelectorAll('.mvp-sobre__info > div').forEach(function (row) {
          var k = (row.querySelector('dt') || {}).textContent, dd = row.querySelector('dd');
          if (k === 'Horários') dd.textContent = 'Início às ' + hora(d.evento.iso) + (d.detalhe.endsAt ? ' · fim previsto às ' + hora(d.detalhe.endsAt) : '');
          else if (k === 'Classificação') dd.textContent = d.detalhe.ageRating || 'A confirmar';
          else if (k === 'Acessibilidade') row.hidden = true;
        });
      }
      function trocar() {
        document.querySelectorAll('a[href*="Ingressos.dc.html"]').forEach(function (a) { if (a.getAttribute('href') !== alvo) a.setAttribute('href', alvo); });
        // pôster do card de compra do MVP
        document.querySelectorAll('img.mvp-buy-img').forEach(function (img) {
          if (img.getAttribute('src') !== d.evento.img) { img.setAttribute('src', d.evento.img); img.removeAttribute('srcset'); img.setAttribute('alt', 'Pôster de ' + d.evento.name); }
        });
        sobreMvp();
      }
      document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest && ev.target.closest('a[href*="Ingressos.dc.html"], a[href="' + alvo + '"]');
        if (a) { ev.preventDefault(); ev.stopPropagation(); location.href = alvo; }
      }, true);
      new MutationObserver(trocar).observe(document.documentElement, { childList: true, subtree: true });
      trocar();
    });
  }

  window.__ponteBackstageApi = { idDoSite: idDoSite, banco: banco };
})();
