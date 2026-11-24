/* ponte-backstage.js: liga o novo site (protótipo estático copiado de ingresse-novo-site-prototipo.vercel.app) ao banco
   unificado do design-prototypes (src/plataforma), o mesmo que o Backstage grava.

   O site novo já tem um modo «BFF» (?dados=bff, guardado em localStorage 'previa-dados'): nele, os scripts de cada página
   trocam /api/eventos por /api/bff/eventos e os índices de dados/ por /api/bff/dados/*, e a página do evento abre com
   Evento.dc.html?bff=<id>, lendo /api/bff/evento/<id>. Esta ponte responde essas rotas no navegador, a partir do banco:

     /api/eventos, /api/bff/eventos    só os eventos do Backstage publicados e por acontecer (o catálogo fixo saiu em 24/11/2026)
     /api/bff/dados/categoria-*        só os eventos do Backstage daquela categoria (também ./dados/categoria-*.json)
     /api/bff/dados/*              o arquivo fixo de dados/ (índices de busca, sorteio…)
     /api/bff/evento/<id>          o evento do Backstage (mesmo privado: a página abre por link)

   Banco: GET /api/db (compartilhado, na Vercel) e, sem API (npm run dev), o localStorage 'plataforma:db:v1' deste navegador,
   como faz src/plataforma/db, completados com a seed (_api/seed-backstage.json, `npm run seed:site` depois de mudar a seed).

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
      .then(function (r) { var c = r.colecoes || {}; return { eventos: c.eventos || [], ingressos: c.ingressos || [], historico: c.historico || [], pedidos: c.pedidos || [] }; })
      .catch(function () {
        try {
          var p = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
          var t = p && p.tabelas;
          if (!t) return null;
          var vals = function (o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); };
          return { eventos: vals(t.eventos), ingressos: vals(t.ingressos), historico: vals(t.historico), pedidos: vals(t.pedidos) };
        } catch (e) { return null; }
      })
      // completa com a seed (_api/seed-backstage.json, gerada por `npm run seed:site`): o que o banco já tem vence, como no
      // lerLocal de src/plataforma/db. Assim o site mostra os eventos do Backstage mesmo onde o Backstage nunca abriu.
      .then(function (b) {
        return f0(BASE + '_api/seed-backstage.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (seed) {
          if (!seed) return b;
          b = b || { eventos: [], ingressos: [], historico: [], pedidos: [] };
          ['eventos', 'historico', 'pedidos', 'ingressos'].forEach(function (col) {
            var tem = {}; (b[col] || []).forEach(function (d) { tem[d.id] = true; });
            b[col] = (b[col] || []).concat((seed[col] || []).filter(function (d) { return !tem[d.id]; }));
          });
          // campos que a seed traz para eventos já gravados sem eles (como instagramDaSeed em src/plataforma/db)
          var daSeed = {}; (seed.eventos || []).forEach(function (e) { daSeed[e.id] = e; });
          b.eventos = b.eventos.map(function (e) {
            if (e.instagram === 'primaverasound') e = Object.assign({}, e, { instagram: undefined }); // perfil errado de uma seed anterior
            var s0 = daSeed[e.id];
            if (!s0 || !s0.instagram) return e;
            return e.instagram === undefined ? Object.assign({}, e, { instagram: s0.instagram }) : e;
          });
          return b;
        });
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
  /** Ingresso à venda agora: ativo, dentro da janela de vendas (vendas.inicio / vendas.fim) e com lote com saldo. */
  function janela(t, agora) {
    var v = t.vendas || {};
    if (v.inicio && Date.parse(comFuso(v.inicio)) > agora) return 'antes';
    if (v.fim && Date.parse(comFuso(v.fim)) <= agora) return 'depois';
    return 'aberta';
  }
  function precoMinimo(e, vendidos) {
    var min = null, agora = Date.now();
    (e.sessoes || []).forEach(function (s) {
      if (Date.parse(comFuso(s.fim || s.inicio)) < agora) return; // sessão que já passou não vende
      (s.grupos || []).forEach(function (g) {
        (g.ingressos || []).forEach(function (t) {
          if (!t.ativo || janela(t, agora) !== 'aberta') return;
          var l = (t.lotes || []).filter(function (x) { return !x.pausado && (vendidos[x.id] || 0) < x.quantidade; })[0];
          if (l && (min === null || l.preco < min)) min = l.preco;
        });
      });
    });
    return min;
  }
  /** Algum ingresso ainda vai abrir vendas (venda não aberta)? */
  function abreDepois(e) {
    var agora = Date.now();
    return (e.sessoes || []).some(function (s) { return (s.grupos || []).some(function (g) { return (g.ingressos || []).some(function (t) { return t.ativo && janela(t, agora) === 'antes'; }); }); });
  }
  /** Fim da última sessão: o evento sai do site quando ela passa. */
  function fimDoEvento(e) { return (e.sessoes || []).map(function (s) { return s.fim || s.inicio; }).sort().pop() || e.data; }
  function noSite(e) { return e.status === 'publicado' && Date.parse(comFuso(fimDoEvento(e))) >= Date.now(); }

  /* ---------- conversão ---------- */
  var CATEGORIA = {
    // coleção categorias da plataforma (src/plataforma/categorias-catalogo.ts)
    shows: 'shows', festivais: 'festivais', 'festas-e-baladas': 'baladas', universitario: 'universitario', futebol: 'futebol',
    esportes: 'esportes', 'artes-cenicas': 'teatro', humor: 'stand-up', 'kids-e-familia': 'infantil', 'feiras-e-exposicoes': 'feiras',
    // vitrine antiga (eventos da seed)
    eletronica: 'musica-eletronica', sertanejo: 'shows', rock: 'shows', rap: 'shows', teatro: 'teatro', standup: 'stand-up', festival: 'festivais',
  };
  var NOME_CATEGORIA = {};
  // categorias que só o site tem (sem par na coleção da plataforma) saem das tags e do tipo do evento
  var POR_TAG = { eletronica: 'musica-eletronica', gastronomia: 'gastronomia', museu: 'museus', turismo: 'turismo', corrida: 'corridas' };
  function categoriasDoEvento(e) {
    var c = CATEGORIA[e.categoria] || CATEGORIA[(e.vitrine || {}).categoria];
    if (!c && e.tipo === 'futebol') c = 'futebol';
    if (!c && e.tipo === 'esportivo') c = 'esportes';
    var out = [c || 'shows'];
    if (e.tipo === 'esportivo' && e.modalidade === 'corrida') out.push('corridas');
    tagsDoEvento(e).forEach(function (t) { var x = POR_TAG[t]; if (x && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function slug(t) { return norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function lugarDe(cidade, ls) {
    var n = norm(cidade);
    var c = n && ls.filter(function (l) { return l.nivel === 'cidade' && (norm(l.nome) === n || (l.chaves || []).indexOf(n) >= 0); })[0];
    if (!c) {
      var sigla = UF[n];
      var est = sigla && ls.filter(function (l) { return l.nivel === 'estado' && l.sigla === sigla; })[0];
      if (!est) return null;
      return { lugar: { cidade: 'br-' + sigla.toLowerCase() + '-' + slug(cidade), uf: est.id, regiao: est.regiao, pais: est.pais, continente: est.continente }, sigla: sigla, geo: { lat: est.lat, lng: est.lng } };
    }
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
  // status do Backstage + datas + regras de venda: encerrado (status ou última sessão passou), à venda (há ingresso aberto com
  // saldo), venda não aberta (nada aberto, mas algum ingresso abre depois) ou esgotado
  function situacao(e, min) {
    if (e.status === 'encerrado' || Date.parse(comFuso(fimDoEvento(e))) < Date.now()) return 'encerrado';
    if (min !== null) return 'venda';
    return abreDepois(e) ? 'nao-aberto' : 'esgotado';
  }
  var ROTULO = { venda: 'À venda', esgotado: 'Esgotado', encerrado: 'Encerrado', 'nao-aberto': 'Venda não aberta' };
  // cidades da seed que o lugares.json do site não conhece: pelo menos o estado, para o filtro de lugar
  var UF = { 'japaratinga': 'AL', 'armacao dos buzios': 'RJ', 'buzios': 'RJ', 'ribeirao preto': 'SP', 'recife': 'PE', 'fortaleza': 'CE', 'belo horizonte': 'MG', 'valinhos': 'SP', 'salvador': 'BA', 'rio de janeiro': 'RJ', 'sao paulo': 'SP', 'campinas': 'SP', 'santos': 'SP', 'natal': 'RN', 'londrina': 'PR', 'porto alegre': 'RS', 'uberlandia': 'MG' };
  function rotuloDaTag(id, cat) { var t = cat && cat.c && cat.c[id]; return (t && t.pt) || id.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function tagsDoEvento(e) { return (e.tags && e.tags.length ? e.tags : (e.vitrine || {}).tags || []).map(slug).filter(Boolean); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- várias datas: resumo e situação de cada sessão ---------- */
  var SEM_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  function partesLocal(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(iso || ''); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return { ano: +m[1], mes: +m[2] - 1, dia: +m[3], sem: d.getDay(), h: +m[4], min: +m[5], dia0: m[1] + '-' + m[2] + '-' + m[3], t: d.getTime() }; }
  function hora(p) { return p.h + 'h' + (p.min ? String(p.min).padStart(2, '0') : ''); }
  function diaMes(p) { return p.dia + ' ' + MES[p.mes]; }
  /** Sessões que ainda não acabaram, em ordem (se todas passaram, todas). */
  function sessoesFuturas(e) {
    var agora = Date.now(), todas = (e.sessoes || []).slice().sort(function (a, z) { return a.inicio < z.inicio ? -1 : 1; });
    var fut = todas.filter(function (s) { return Date.parse(comFuso(s.fim || s.inicio)) >= agora; });
    return fut.length ? fut : todas;
  }
  /** { curto, longo }: «Sáb 5 dez · 21h» numa sessão; «5 e 6 dez», «26 dez a 3 jan», «Toda quinta, 26 nov a 17 dez» em várias. */
  function resumoDasDatas(e) {
    var ss = sessoesFuturas(e), ps = ss.map(function (s) { return partesLocal(s.inicio); }).filter(Boolean);
    if (!ps.length) return { curto: dataCurta(e.data), longo: '' , n: 0 };
    var dias = []; ps.forEach(function (p) { if (dias.indexOf(p.dia0) < 0) dias.push(p.dia0); });
    var a = ps[0], z = ps[ps.length - 1], n = ss.length;
    if (dias.length === 1) {
      if (n === 1) return { curto: dataCurta(ss[0].inicio), longo: '', n: 1 };
      var hs = ps.map(hora); var hTxt = hs.length > 3 ? hs.length + ' horários' : hs.slice(0, -1).join(', ') + ' e ' + hs[hs.length - 1];
      return { curto: SEM[a.sem] + ' ' + diaMes(a) + ', ' + hTxt, longo: SEM_LONGO[a.sem] + ', ' + diaMes(a) + ' de ' + a.ano + ', às ' + hTxt, n: n };
    }
    var porDia = dias.map(function (d) { return partesLocal(d + 'T12:00'); });
    var semanal = porDia.length >= 3 && porDia.every(function (p, i) { return !i || Math.round((p.t - porDia[i - 1].t) / 864e5) === 7; });
    var mesmoMes = a.mes === z.mes && a.ano === z.ano;
    var intervalo = (mesmoMes ? a.dia : diaMes(a)) + ' a ' + diaMes(z);
    var mesmaHora = ps.every(function (p) { return p.h === a.h && p.min === a.min; });
    if (semanal) {
      var ini = mesmoMes ? a.dia : diaMes(a);
      return { curto: 'Toda ' + SEM_LONGO[a.sem] + ', ' + ini + ' a ' + diaMes(z), longo: 'Toda ' + SEM_LONGO[a.sem] + ', de ' + diaMes(a) + ' a ' + diaMes(z) + ' de ' + z.ano + (mesmaHora ? ', às ' + hora(a) : '') + ' (' + dias.length + ' datas)', n: n };
    }
    var curto = dias.length === 2 && Math.round((porDia[1].t - porDia[0].t) / 864e5) === 1 ? (mesmoMes ? a.dia : diaMes(a)) + ' e ' + diaMes(z) : intervalo;
    var longo = 'De ' + SEM_LONGO[a.sem] + ', ' + diaMes(a) + (a.ano !== z.ano ? ' de ' + a.ano : '') + ' a ' + SEM_LONGO[z.sem] + ', ' + diaMes(z) + ' de ' + z.ano +
      ' (' + (n === dias.length ? dias.length + ' datas' : n + ' sessões em ' + dias.length + ' dias') + ')';
    return { curto: curto, longo: longo, n: n };
  }
  /** Cada sessão por acontecer: horário, situação (venda, esgotado, nao-aberto) e o menor preço à venda. */
  function sessoesDoEvento(e, vendidos) {
    var agora = Date.now();
    return sessoesFuturas(e).map(function (s) {
      var min = null, abre = null;
      (s.grupos || []).forEach(function (g) { (g.ingressos || []).forEach(function (t) {
        if (!t.ativo) return;
        var j = janela(t, agora);
        if (j === 'antes') { var ab = (t.vendas || {}).inicio; if (!abre || ab < abre) abre = ab; return; }
        if (j !== 'aberta') return;
        var l = (t.lotes || []).filter(function (x) { return !x.pausado && (vendidos[x.id] || 0) < x.quantidade; })[0];
        if (l && (min === null || l.preco < min)) min = l.preco;
      }); });
      var p = partesLocal(s.inicio), f = partesLocal(s.fim || '');
      return { id: s.id, inicio: comFuso(s.inicio), fim: s.fim ? comFuso(s.fim) : null,
        sem: p ? SEM[p.sem] : '', dia: p ? p.dia : '', mes: p ? MES[p.mes] : '', mesLongo: p ? MES_LONGO[p.mes] : '', ano: p ? p.ano : '', horario: p ? hora(p) + (f ? ' às ' + hora(f) : '') : '',
        situacao: min !== null ? 'venda' : abre ? 'nao-aberto' : 'esgotado', fromCents: min === null ? null : Math.round(min * 100),
        abre: abre ? (function (q) { return q ? diaMes(q) + ', ' + hora(q) : ''; })(partesLocal(abre)) : '' };
    });
  }

  function paraCatalogo(e, vendidos, ls) {
    var min = precoMinimo(e, vendidos), sit = situacao(e, min), onde = lugarDe(e.cidade, ls);
    var cidade = e.cidade ? e.cidade + (onde && onde.sigla ? ', ' + onde.sigla : '') : '';
    return {
      id: idDoSite(e.id), name: e.nome, iso: comFuso((sessoesFuturas(e)[0] || {}).inicio || e.data), date: resumoDasDatas(e).curto,
      venue: [e.local, cidade].filter(Boolean).join(' · '), state: onde ? onde.sigla : '',
      img: e.capa || BASE + 'assets/brand/venue-pista.avif', url: '#', flag: '',
      cats: categoriasDoEvento(e), situacao: sit, situacaoRotulo: ROTULO[sit],
      fromCents: min === null ? null : Math.round(min * 100),
      tags: tagsDoEvento(e), tagsOrigem: {}, lineup: artistasDe(e).map(function (a) { return a.id; }),
      lugar: onde ? onde.lugar : undefined,
      resumo: resumoDe(e),
      backstage: { id: e.id, produtora: e.produtora },
    };
  }

  /** A primeira frase da descrição (para o banner da home), até ~110 caracteres. */
  function resumoDe(e) {
    var t = ((e.vitrine || {}).descricao || [])[0] || '';
    var f = (t.match(/^[^.!?]+[.!?]/) || [t])[0].trim();
    return f.length > 110 ? f.slice(0, 107).replace(/\s+\S*$/, '') + '…' : f;
  }
  var COMPRA = {}; // id do site -> link de compra da plataforma (destinos.js pergunta por compraDe)
  function artistasDe(e) {
    return String((e.vitrine || {}).artista || '').split(/,| e /).map(function (n) { return n.trim(); }).filter(Boolean).map(function (n) { return { id: slug(n), name: n }; });
  }
  function contexto() {
    return Promise.all([banco(), catalogoFixo(), lugares()]).then(function (r) {
      var b = r[0], fixo = r[1], ls = (r[2] && r[2].lugares) || [];
      if (b) b.eventos.forEach(function (e) { COMPRA[idDoSite(e.id)] = '/comprar/' + encodeURIComponent(e.id); });
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
      // só os eventos do Backstage: publicados e ainda por acontecer (o catálogo fixo do protótipo original saiu)
      var publicados = x.b.eventos.filter(noSite);
      var novos = publicados.map(function (e) { return paraCatalogo(e, x.vendidos, x.ls); })
        .sort(function (a, z) { return Date.parse(a.iso) - Date.parse(z.iso); });
      // artistas: os da vitrine dos eventos (o índice de artistas do protótipo original saiu com o catálogo)
      var art = {};
      publicados.forEach(function (e) {
        var c = novos.filter(function (n) { return n.backstage.id === e.id; })[0];
        artistasDe(e).forEach(function (a) {
          var x0 = art[a.id] || (art[a.id] = { id: a.id, name: a.name, genre: '', count: 0, first: c.iso, img: '' });
          x0.count++; if (c.iso < x0.first) x0.first = c.iso;
          x0.genre = (NOME_CATEGORIA[c.cats[0]] || '') + ' · ' + x0.count + (x0.count > 1 ? ' datas' : ' data');
        });
      });
      var c = Object.assign({}, x.fixo, { events: novos, artists: Object.keys(art).map(function (k) { return art[k]; }), backstage: novos.length });
      return json(c);
    });
  }

  function bffCategoria(nome) {
    var slugCat = nome.replace(/^categoria-|\.json$/g, '');
    return Promise.all([contexto(), f0(BASE + 'dados/' + nome).then(function (r) { return r.ok ? r.json() : null; })]).then(function (r) {
      var x = r[0], fixo = r[1];
      if (!fixo || !Array.isArray(fixo.e)) return json({ error: 'categoria indisponível' }, 404);
      if (!x.b) return json(Object.assign({}, fixo, { e: [], total: 0 }));
      var novos = x.b.eventos.filter(noSite)
        .map(function (e) { return paraCatalogo(e, x.vendidos, x.ls); })
        .filter(function (c) { return c.cats.indexOf(slugCat) >= 0; })
        .map(function (c) {
          var p = c.venue.split(' · ');
          return { i: c.id, n: c.name, d: c.iso, l: p[0] || '', c: (p[1] || '').replace(/, [A-Z]{2}$/, ''), u: c.state, s: c.situacao, p: c.fromCents || 0, t: c.tags, k: c.cats, lg: c.lugar && c.lugar.cidade, img: c.img };
        });
      // só os eventos do Backstage daquela categoria (as listas fixas do protótipo original saíram)
      var cidades = [];
      novos.forEach(function (n) { if (n.c && !cidades.some(function (c) { return c.v === n.c; })) cidades.push({ v: n.c, l: n.c }); });
      return json(Object.assign({}, fixo, { e: novos, total: novos.length, cidades: fixo.cidades ? cidades : undefined }));
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
          // várias datas: o resumo (cartões, «Quando», barras) e cada sessão por acontecer (seção «Datas e horários»)
          datas: resumoDasDatas(e),
          sessoes: sessoesDoEvento(e, x.vendidos),
          endsAt: sessoes[0] && sessoes[0].fim ? comFuso(sessoes[0].fim) : null,
          // classificação é obrigatória: o que o Backstage gravou; sem o dado (eventos antigos), 18 anos
          ageRating: (function (i) { i = i == null ? 18 : Number(i); return i > 0 ? i + ' anos. Menores de ' + i + ' não entram.' : 'Livre para todos os públicos.'; })(e.idadeMinima),
          categories: c.cats.map(function (s) { return { slug: s, name: NOME_CATEGORIA[s] || s }; }),
          // por onde se entra: os grupos de ingressos (setores) do evento e o acesso de cada um, sem repetir entre sessões
          entradas: (function () {
            var vistos = {}, out = [];
            (e.sessoes || []).forEach(function (s) { (s.grupos || []).forEach(function (g) { var k = g.nome + '|' + (g.acesso || ''); if (!vistos[k]) { vistos[k] = 1; out.push({ nome: g.nome, acesso: g.acesso || '' }); } }); });
            return out;
          })(),
          // há ingresso do tipo meia-entrada (ativo) em alguma sessão?
          temMeia: (e.sessoes || []).some(function (s) { return (s.grupos || []).some(function (g) { return (g.ingressos || []).some(function (t) { return t.ativo && t.beneficio === 'meia-entrada'; }); }); }),
          instagram: e.instagram || '',
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
    if (/^\/api\/eventos(\.json)?$/.test(p)) return bffEventos(); // mesmo sem o modo BFF: só eventos do Backstage
    if ((m = /\/dados\/(categoria-[a-z0-9-]+\.json)$/.exec(p)) && p.indexOf(new URL(BASE).pathname) === 0) return bffCategoria(m[1]);
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
          else if (k === 'Classificação') dd.textContent = d.detalhe.ageRating;
          else if (k === 'Acessibilidade') row.hidden = true;
          else if (k === 'Meia-entrada') row.hidden = !d.detalhe.temMeia;
        });
      }
      // seção «Datas e horários» (várias datas): cada sessão por acontecer com horário, situação e preço, antes do «Sobre o evento»
      function datasMvp() {
        var ss = d.detalhe.sessoes || [], sobre = document.querySelector('.mvp-sobre');
        if (ss.length < 2 || !sobre) return;
        var ex = document.querySelector('.ev-datas');
        if (ex && ex.getAttribute('data-ponte') === bff[1] && ex.nextElementSibling === sobre) return;
        if (ex) ex.remove();
        var sec = document.createElement('section'); sec.className = 'mvp-so ev-datas'; sec.setAttribute('data-ponte', bff[1]); sec.setAttribute('aria-labelledby', 'ev-datas-h');
        var h = document.createElement('h2'); h.className = 'over'; h.id = 'ev-datas-h'; h.textContent = 'Datas e horários'; sec.appendChild(h);
        var res = document.createElement('p'); res.className = 'ev-datas__resumo'; res.textContent = d.detalhe.datas.longo || ''; sec.appendChild(res);
        var lista = document.createElement('ul'); lista.className = 'ev-datas__lista';
        var mesAtual = '';
        ss.forEach(function (x) {
          var mes = x.mes + ' ' + x.ano;
          if (mes !== mesAtual) { mesAtual = mes; var lm = document.createElement('li'); lm.className = 'ev-datas__mes'; lm.textContent = x.mesLongo + ' de ' + x.ano; lista.appendChild(lm); }
          var li = document.createElement('li'); li.className = 'ev-datas__item'; li.setAttribute('data-sit', x.situacao);
          var data = document.createElement('span'); data.className = 'ev-datas__dia';
          data.innerHTML = '<small></small><b></b>'; data.querySelector('small').textContent = x.sem; data.querySelector('b').textContent = x.dia;
          var info = document.createElement('span'); info.className = 'ev-datas__info';
          var hr = document.createElement('span'); hr.className = 'ev-datas__hora'; hr.textContent = x.dia + ' ' + x.mes + ', ' + x.horario;
          var st = document.createElement('span'); st.className = 'ev-datas__sit';
          st.textContent = x.situacao === 'venda' ? 'a partir de R$ ' + (x.fromCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: x.fromCents % 100 ? 2 : 0 }) : x.situacao === 'nao-aberto' ? 'Vendas abrem em ' + x.abre : 'Esgotado';
          info.appendChild(hr); info.appendChild(st);
          li.appendChild(data); li.appendChild(info);
          if (x.situacao === 'venda') { var a = document.createElement('a'); a.className = 'bs ev-datas__bt'; a.href = alvo; a.textContent = 'Escolher'; a.setAttribute('aria-label', 'Escolher ingressos para ' + hr.textContent); li.appendChild(a); }
          lista.appendChild(li);
        });
        sec.appendChild(lista);
        sobre.parentNode.insertBefore(sec, sobre);
      }
      function trocar() {
        document.querySelectorAll('a[href*="Ingressos.dc.html"]').forEach(function (a) { if (a.getAttribute('href') !== alvo) a.setAttribute('href', alvo); });
        // pôster do card de compra do MVP
        document.querySelectorAll('img.mvp-buy-img').forEach(function (img) {
          if (img.getAttribute('src') !== d.evento.img) { img.setAttribute('src', d.evento.img); img.removeAttribute('srcset'); img.setAttribute('alt', 'Pôster de ' + d.evento.name); }
        });
        sobreMvp();
        datasMvp();
      }
      document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest && ev.target.closest('a[href*="Ingressos.dc.html"], a[href="' + alvo + '"]');
        if (a) { ev.preventDefault(); ev.stopPropagation(); location.href = alvo; }
      }, true);
      new MutationObserver(trocar).observe(document.documentElement, { childList: true, subtree: true });
      trocar();
    });
  }

  window.__ponteBackstageApi = { idDoSite: idDoSite, banco: banco, compraDe: function (idSite) { return COMPRA[idSite] || null; } };
})();
