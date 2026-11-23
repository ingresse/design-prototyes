/* cartao.js: o DADO do jogo de futebol, parte do navegador (Mariana, com a Iara e a Isadora; 28/10/2026). Copiado para previa/futebol-cartao.js.
   Desde 30/10/2026 não há mais cartão próprio do jogo: a marcação é o `.ev-card` único (tools/previa/cartao-evento.mjs) e o texto vem de window.IngresseCartao.jogo(vista(...)) (cartao-evento.js).
   Quem usa (cada tela só adapta o seu dado e passa por aqui): Categoria (desktop e celular), Home (carrosséis) e Busca.

   API (window.IngresseJogo):
     deCompacto(e, fut, href)  jogo no formato compacto de previa/dados/categoria-futebol.json (i n d l c u s p r m j) -> jogo normalizado
     deApi(ev, fut)            evento de /api/eventos (catálogo sintético) com `m` -> jogo normalizado
     vista(jogo)               o que window.IngresseCartao.jogo() lê (nome, local, escudos, campeonato, estado)
     seloDaVenda(sit, rotulo, m)  só o estado { sit, texto, icone } (o texto é o do selosDe() da página de confronto: tools/previa/futebol/evento.js); o cartão só mostra o que muda a ação */
(function () {
  if (window.IngresseJogo) return;
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var qs = new URLSearchParams(location.search);

  /* ---------- datas: o instante é lido NO FUSO DO ESTÁDIO (o ISO traz o deslocamento), como a página de confronto ---------- */
  function partes(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}):?(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var off = (m[6][0] === '-' ? -1 : 1) * (Math.abs(+m[6]) * 60 + (+m[7]));
    return { a: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], off: off };
  }
  var diaMes = function (iso) { var p = partes(iso); return p ? p.d + ' ' + MESES[p.m - 1] : ''; };
  var hora = function (p) { return p.h + 'h' + (p.mi ? ('0' + p.mi).slice(-2) : ''); };
  function ehHoje(p) {
    var agora = new Date(Date.now() + p.off * 60000); // «agora» no relógio do estádio
    return agora.getUTCFullYear() === p.a && agora.getUTCMonth() + 1 === p.m && agora.getUTCDate() === p.d;
  }
  /** «Dom 21 mar · 16h»; «Hoje · 20h»; adiado: «Nova data a confirmar» [texto provisório]; sem data: «Data a confirmar». Devolve { texto, aria }. */
  function quando(iso, sit) {
    var p = partes(iso);
    if (sit === 'adiado') return { texto: 'Nova data a confirmar', aria: 'nova data a confirmar' };
    if (!p) return { texto: 'Data a confirmar', aria: 'data a confirmar' };
    var h = hora(p);
    if (ehHoje(p)) return { texto: 'Hoje · ' + h, aria: 'hoje, ' + h };
    var dia = DIAS[new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay()];
    return { texto: dia + ' ' + p.d + ' ' + MESES[p.m - 1] + ' · ' + h, aria: p.d + ' ' + MESES[p.m - 1] + ', ' + h };
  }

  /* ---------- selo da situação: os textos do selosDe() da página de confronto (evento.js). Fonte única para todos os cartões. ---------- */
  var ICONE = { pre: 'pre', 'nao-aberto': 'nao-aberto', esgotado: 'esgotado', cancelado: 'cancelado', encerrado: 'encerrado', adiado: 'adiado' };
  function seloDaVenda(sit, rotulo, m) {
    var x = m && m.x ? diaMes(m.x) : '';
    switch (sit) {
      case 'pre': return { sit: 'pre', texto: 'Venda para sócios', icone: 'pre', aria: 'venda para sócios' };
      case 'nao-aberto': return x ? { sit: 'nao-aberto', texto: (m.xg ? 'Geral abre ' : 'Abre ') + x, icone: 'nao-aberto', aria: (m.xg ? 'venda geral abre ' : 'venda abre ') + x }
        : { sit: 'nao-aberto', texto: 'Venda não aberta', icone: 'nao-aberto', aria: 'venda não aberta' };
      case 'esgotado': return { sit: 'esgotado', texto: 'Esgotado', icone: 'esgotado', aria: 'esgotado' };
      case 'cancelado': return { sit: 'cancelado', texto: 'Cancelado', icone: 'cancelado', aria: 'cancelado' };
      case 'adiado': return { sit: 'adiado', texto: 'Adiado', icone: 'adiado', aria: 'adiado' };
      case 'encerrado': { var t = rotulo || 'Jogo realizado'; return { sit: 'encerrado', texto: t, icone: 'encerrado', aria: t.toLowerCase() }; }
    }
    return { sit: '', texto: '', icone: '', aria: 'à venda' }; // à venda: sem selo (a etiqueta «À venda» fica no rodapé)
  }

  /* ---------- escudos: arquivo do clube (fonte única: previa/assets/futebol/escudos.json), ou monograma de 3 letras na mesma caixa (seleção, ou escudo ausente) ---------- */
  function escudo(t) {
    var usa = t && t.e;
    return { src: usa ? t.e : '', mono: usa ? '' : (t && t.m) || '···', alt: (t && t.n) || '' };
  }

  /** Nome curto sem quebra no meio: a linha só quebra DEPOIS do «x» (entre os dois times), nunca antes dele nem dentro de um nome (até 16 letras cada: cabe em 222 px). */
  function colar(nome) { return String(nome).replace(/ /g, '\u00A0'); }

  /* ---------- jogo normalizado: { id, href, iso, local, cidade, uf, s, r, cents, m, fut } ---------- */
  function deCompacto(e, fut, href) { return { id: e.i, href: href || 'Evento.dc.html', iso: e.d, localNome: e.l, local: e.l + ' · ' + e.c + ', ' + e.u, s: e.s, r: e.r, cents: e.p, m: e.m, fut: fut }; }
  function deApi(ev, fut) {
    var partesLocal = String(ev.venue || '').split(' · ');
    return { id: ev.id, href: window.IngresseDestinos ? window.IngresseDestinos.evento(ev) : (ev.jogo ? 'Evento.dc.html?jogo=' + ev.id : 'Evento.dc.html'), /* destinos.js: jogo sem página própria vai ao jogo-modelo da mesma situação (28/10) */ iso: ev.iso, localNome: partesLocal[0], local: ev.venue || '', s: ev.situacao, r: ev.situacaoRotulo, cents: ev.fromCents, m: ev.m, fut: fut };
  }

  /** O jogo que window.IngresseCartao.jogo() transforma nos campos do cartão (`.ev-card`): nome sem quebra, local, data, escudos, campeonato, estado. Sem preço, sem fase, sem torcida visitante:
   *  esses não são mais mostrados no cartão (pedido do Wander, 30/10/2026). Um jogo sem `m` não vira cartão de partida (quem chama decide). */
  function vista(j) {
    var m = j.m, T = (j.fut && j.fut.times) || {}, C = (j.fut && j.fut.camps) || {};
    var th = T[m.h] || { n: m.h, s: m.h, m: '···' }, ta = T[m.a] || { n: m.a, s: m.a, m: '···' };
    var camp = m.c ? C[m.c] : null;
    var s = j.s || 'venda';
    var selo = seloDaVenda(s, j.r, m);
    var e1 = escudo(th), e2 = escudo(ta);
    return {
      jogo: true, id: j.id, href: j.href, iso: j.iso, sit: selo.sit, selo: selo.texto,
      arte: camp && camp.p ? camp.p : '', temArte: !!(camp && camp.p),
      c1src: e1.src, c1mono: e1.mono, c1alt: e1.alt, c1tem: !!e1.src, c1mon: !e1.src, c2src: e2.src, c2mono: e2.mono, c2alt: e2.alt, c2tem: !!e2.src, c2mon: !e2.src,
      camp: camp ? camp.s : '', nome: colar(th.s) + '\u00A0x ' + colar(ta.s), local: j.local ? j.local : ''
    };
  }

  window.IngresseJogo = { deCompacto: deCompacto, deApi: deApi, vista: vista, seloDaVenda: seloDaVenda, quando: quando };
})();
