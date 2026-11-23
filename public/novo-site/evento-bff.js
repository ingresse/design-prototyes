/* evento.js (BFF): a página do Evento com os dados de um evento real do BFF de descoberta (Wander, 03/11/2026).
   Vale só em Evento.dc.html?bff=<id> (o link que destinos.js dá aos eventos do BFF no modo «Dados dos eventos › BFF»). O gerador copia para previa/evento-bff.js.
   A página é o modelo do v5.3 (Sorriso Maroto) desenhado pelo motor de templates; este script troca o que é do evento depois de cada desenho
   (o motor redesenha a cada mudança de estado, então um MutationObserver reaplica). Só textContent e atributos: o HTML da descrição do BFF
   é lido num documento inerte (DOMParser) e vira parágrafos de texto; nada do BFF entra como HTML.
   O que o BFF não tem (Quem vai, Instagram, mesma turnê, portões, como chegar, foto do local) sai da página; a lista está em docs/produto/BFF-LACUNAS.md.
   Falhou (sem servidor, BFF fora): a página mostra o modelo e um aviso. */
(function () {
  var root = document.documentElement;
  var m = /[?&]bff=(\d+)/.exec(location.search);
  if (!m) return;
  var ID = m[1];
  var dados = null, pend = false;

  function revelar(estado) { root.setAttribute('data-evbff', estado); }
  var seguro = setTimeout(function () { if (root.getAttribute('data-evbff') === 'pend') revelar('falha'); }, 12000);

  // ---------- formatação ----------
  var SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function partes(iso, tz) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    var p = {};
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz || 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d).forEach(function (x) { p[x.type] = x.value.replace('.', ''); });
    p.hora = Number(p.hour) + 'h' + (p.minute !== '00' ? p.minute : '');
    p.sem = p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1);
    return p;
  }
  function quando(iso, tz) { var p = partes(iso, tz); return p ? p.sem + ' ' + p.day + ' ' + p.month + ' ' + p.year + ' · ' + p.hora : ''; }
  function dia(iso, tz) { var p = partes(iso, tz); return p ? p.sem + ' ' + p.day + ' ' + p.month : ''; }
  function hora(iso, tz) { var p = partes(iso, tz); return p ? p.hora : ''; }
  function stub(iso, tz) { var p = partes(iso, tz); return p ? (p.sem + ' ' + ('0' + p.day).slice(-2) + ' ' + p.month + ' · ' + p.hora).toUpperCase() : ''; }
  function reais(c) { return 'R$ ' + (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }); }
  function paragrafos(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var blocos = doc.body.querySelectorAll('p, li, h1, h2, h3, h4');
    var lista = blocos.length ? Array.prototype.map.call(blocos, function (b) { return b.textContent; }) : [doc.body.textContent];
    return lista.map(function (t) { return t.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  }

  // ---------- escrita idempotente ----------
  function txt(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function attr(el, k, v) { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); }
  function some(el) { if (el && !el.hidden) el.hidden = true; }
  function secaoPorTitulo(t) {
    var os = document.querySelectorAll('main .over');
    for (var i = 0; i < os.length; i++) if (os[i].textContent.trim() === t) return os[i].closest('section');
    return null;
  }

  // a situação do BFF escolhe o estado do modelo (o chip do painel do protótipo, o mesmo que a pessoa clicaria)
  var ESTADO = { venda: 'À venda', esgotado: 'Esgotado', 'nao-aberto': 'Venda não aberta', encerrado: 'Encerrado', cancelado: 'Cancelado', adiado: 'Adiado', pre: 'Pré-venda' };
  var estadoFeito = false;
  function escolherEstado(sit) {
    if (estadoFeito) return;
    var alvo = ESTADO[sit] || 'À venda';
    var bs = document.querySelectorAll('.proto-in .chip');
    for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === alvo) { estadoFeito = true; if (bs[i].getAttribute('aria-pressed') !== 'true') bs[i].click(); return; }
  }

  function aplicar() {
    pend = false;
    if (!dados) return;
    var e = dados.evento, d = dados.detalhe || {}, v = d.venue || {}, tz = d.timezone || (e.bff && e.bff.timezone);
    var artistas = (d.artists || []).map(function (a) { return a.name; });
    var cidade = [v.city, v.state].filter(Boolean).join(', ');
    var q = quando(e.iso, tz);
    var preco = e.situacao === 'encerrado' ? 'Este evento já aconteceu' : e.situacao === 'esgotado' ? 'Esgotado' : e.situacao === 'nao-aberto' ? 'Venda ainda não aberta' : e.fromCents != null ? 'a partir de ' + reais(e.fromCents) : 'Preço a confirmar';
    var curto = e.fromCents != null && (e.situacao === 'venda' || e.situacao === 'pre') ? 'A partir de ' + reais(e.fromCents) : preco;
    var nSess = d.sessionsCount || (d.sessions || []).length || 1;

    escolherEstado(e.situacao);
    if (document.title !== e.name + ' · Ingresse') document.title = e.name + ' · Ingresse';

    // hero
    ['.ev-hero-bg', '.ev-reflect'].forEach(function (s) { attr(document.querySelector(s), 'src', e.img); });
    var po = document.querySelector('.ev-poster'); attr(po, 'src', e.img); attr(po, 'alt', 'Pôster de ' + e.name);
    txt(document.querySelector('h1.ev-title'), e.name);
    var tm = document.querySelector('.ev-title-m'); if (tm) txt(tm.querySelector('h2'), e.name);
    var st = document.querySelector('.ev-stub'); attr(st, 'data-event-date', e.iso);
    var sd = st && st.querySelector('.ev-stub-date');
    if (sd) { // «<small>Entrada</small>DATA»: troca tudo o que não é o <small>
      var alvo = stub(e.iso, tz), resto = Array.prototype.filter.call(sd.childNodes, function (n) { return !(n.nodeType === 1 && n.tagName === 'SMALL'); });
      if (resto.map(function (n) { return n.textContent; }).join('').trim() !== alvo) { resto.forEach(function (n) { sd.removeChild(n); }); sd.appendChild(document.createTextNode(alvo)); }
    }
    var fatos = document.querySelectorAll('.ev-facts > div');
    if (fatos[0]) txt(fatos[0].querySelector('.ev-v'), q);
    var ondeCurto = v.name && v.city && v.name !== v.city ? v.name + ' · ' + v.city : (v.name || v.city || '');
    if (fatos[1]) txt(fatos[1].querySelector('.ev-v'), ondeCurto);
    if (fatos[2]) { if (artistas.length) { txt(fatos[2].querySelector('.ev-v'), artistas.join(', ')); fatos[2].hidden = false; } else some(fatos[2]); }
    if (tm) { var sub = tm.querySelectorAll(':scope > div'); txt(sub[0], [artistas.join(', '), v.name, q].filter(Boolean).join(' · ')); txt(sub[1], preco); }
    txt(document.querySelector('.ev-price'), preco);

    // compra e barra do celular
    var buy = document.querySelector('aside.buy .card');
    if (buy) { var bd = buy.querySelectorAll(':scope > div'); txt(bd[1], preco); txt(bd[2], nSess > 1 ? nSess + ' datas · preço final antes do pagamento' : 'Preço final antes do pagamento'); }
    var mb = document.querySelector('.mbar > div'); if (mb) { var mbd = mb.querySelectorAll(':scope > div'); txt(mbd[0], dia(e.iso, tz) + ' · ' + (v.name || '')); txt(mbd[1], curto); }
    some(document.querySelector('.buy-social'));

    // avisos de estado do modelo (cancelado, adiado, alterado) citam o Sorriso Maroto: o BFF não tem esses estados
    Array.prototype.forEach.call(document.querySelectorAll('.ev-aviso'), some);

    // Antes de ir
    var antes = secaoPorTitulo('Antes de ir');
    if (antes) {
      Array.prototype.forEach.call(antes.querySelectorAll('dl.facts > div'), function (row) {
        var k = (row.querySelector('dt') || {}).textContent, dd = row.querySelector('dd');
        if (k === 'Portões') { txt(row.querySelector('dt'), 'Horário'); txt(dd, 'Início às ' + hora(e.iso, tz) + (d.endsAt ? ' · fim previsto ' + hora(d.endsAt, tz) : '')); }
        else if (k === 'Horário') txt(dd, 'Início às ' + hora(e.iso, tz) + (d.endsAt ? ' · fim previsto ' + hora(d.endsAt, tz) : ''));
        else if (k === 'Atração') { if (artistas.length) txt(dd, artistas.join(', ')); else some(row); }
        else if (k === 'Onde') txt(dd, [v.name !== v.city ? v.name : '', v.address, cidade].filter(Boolean).join(' · '));
        else if (k === 'Classificação') txt(dd, d.ageRating ? (/^\d+$/.test(d.ageRating) ? d.ageRating + '+' : d.ageRating) : 'A confirmar');
        else if (k === 'Como chegar') some(row);
      });
    }

    // Sobre: a descrição do BFF em parágrafos de texto
    var sobre = secaoPorTitulo('Sobre');
    var caixa = sobre && sobre.querySelector('.card');
    if (caixa && caixa.getAttribute('data-bff') !== ID) {
      var ps = paragrafos(d.description);
      while (caixa.firstChild) caixa.removeChild(caixa.firstChild);
      (ps.length ? ps : ['Descrição a confirmar.']).forEach(function (t, i) { var p = document.createElement('p'); p.textContent = t; p.style.margin = i ? 'var(--space-3) 0 0' : '0'; caixa.appendChild(p); });
      caixa.setAttribute('data-bff', ID);
    }

    // O que rola: as tags que dá para deduzir das categorias do BFF
    var rola = secaoPorTitulo('O que rola');
    var chips = rola && rola.querySelector('div:last-child');
    if (chips && chips.getAttribute('data-bff') !== ID) {
      while (chips.firstChild) chips.removeChild(chips.firstChild);
      (dados.tags || []).forEach(function (t) { var a = document.createElement('a'); a.className = 'chip'; a.href = 'Busca.dc.html?tags=' + encodeURIComponent(t.id); a.textContent = t.rotulo; chips.appendChild(a); });
      chips.setAttribute('data-bff', ID);
      rola.hidden = !(dados.tags || []).length;
    }

    // sem dado no BFF: sai
    ['Quem vai', 'Instagram do evento', 'Mesma turnê'].forEach(function (t) { some(secaoPorTitulo(t)); });

    // Local: mapa pelas coordenadas, endereço; a foto e o texto de como chegar são do Anhembi
    var loc = document.getElementById('local');
    if (loc) {
      var ifr = loc.querySelector('iframe');
      if (ifr && v.geo) { attr(ifr, 'src', 'https://maps.google.com/maps?ll=' + v.geo.lat + ',' + v.geo.lng + '&z=16&hl=pt-BR&output=embed'); attr(ifr, 'title', 'Mapa: ' + v.name); }
      var ab = loc.querySelector('.mapa-cinza__abrir'); if (ab) { attr(ab, 'href', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([v.name, v.address, cidade].filter(Boolean).join(', '))); attr(ab, 'aria-label', 'Abrir ' + v.name + ' no mapa'); }
      some(loc.querySelector('.loc-foto'));
      var info = loc.querySelectorAll('.loc-info > div:last-child > div');
      txt(info[0], v.name || ''); txt(info[1], [v.address, cidade].filter(Boolean).join(' · ')); some(info[2]);
    }

    // trilha: a categoria do evento (a primeira do BFF) e o nome
    var cat = (d.categories || [])[0], volta = document.querySelector('.crumbs .crumb-back');
    txt(document.querySelector('.crumbs [aria-current="page"]'), e.name);
    if (volta && cat) { txt(volta, cat.name); if (volta.tagName === 'A') attr(volta, 'href', 'Categoria.dc.html?c=' + encodeURIComponent((e.cats || [])[0] || cat.slug)); }
    // compartilhar: o texto do convite
    Array.prototype.forEach.call(document.querySelectorAll('[data-share]'), function (b) { attr(b, 'data-share', 'Bora no ' + e.name + '? ' + dia(e.iso, tz) + (v.name ? ' em ' + v.name : '')); });
  }

  function agendar() { if (!pend && dados) { pend = true; requestAnimationFrame(aplicar); } }

  fetch('/api/bff/evento/' + ID).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.error || 'HTTP ' + r.status); return j; }); })
    .then(function (j) {
      dados = j;
      var go = function () { aplicar(); clearTimeout(seguro); revelar('ok'); new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true }); };
      if (document.querySelector('h1.ev-title')) go();
      else { var mo = new MutationObserver(function () { if (document.querySelector('h1.ev-title')) { mo.disconnect(); go(); } }); mo.observe(document.documentElement, { childList: true, subtree: true }); }
    })
    .catch(function (err) {
      clearTimeout(seguro); revelar('falha');
      var msg = 'Evento do BFF indisponível (' + err.message + '). Mostrando o evento modelo.';
      if (window.console) console.warn('[prévia] ' + msg);
      (function tentar(n) { if (window.IX && IX.toast) IX.toast(msg); else if (n < 40) setTimeout(function () { tentar(n + 1); }, 100); })(0);
    });
})();
