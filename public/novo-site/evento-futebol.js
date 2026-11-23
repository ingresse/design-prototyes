/* evento-futebol.js: variante de FUTEBOL (página de confronto) de Evento.dc.html (DE-35; Mariana, 28/10/2026).
   Fonte: tools/previa/futebol/evento.js; o gerador (tools/previa/evento-futebol.mjs) copia para previa/evento-futebol.js.
   Documento: docs/produto/FUTEBOL-CONFRONTO-PROTOTIPO.md. Decisões de design: docs/design/FUTEBOL-CONFRONTO-PARECER-2D.md (18 decisões, condições C1 a C7).
   Marcação e CSS dos componentes: tools/previa/futebol/confronto-componentes.html e confronto.css (Edu); camada da página: tools/previa/futebol/pagina.css.

   Ativação: Evento.dc.html?jogo=<id> (jogos 42 e 3001 a 3005 de previa/dados/futebol-confronto.json). Sem o parâmetro este arquivo não faz nada: a Evento geral e a
   variante esportiva (?esporte=, evento-esportes.js) seguem como estão. Parâmetros de teste (a engrenagem os grava na URL):
     quem=anonima|socio|logada   plano=<chave do plano>   agora=<ISO>|agora   ciclo=adiado|cancelado|estadio|mandante|portoes
     vendas=sem-data|acessibilidade|esgotado|sem-precos   confirma=1s|3s|sem-resposta
   O que faz quando ativo: esconde o hero e o conteúdo da Evento geral (CSS no <head>, antes do primeiro quadro) e monta o cabeçalho do confronto, a coluna de compra
   (resposta, contador, botão principal, aberturas por janela), o que há para saber do jogo, o local e a barra móvel. A hora é a do servidor (relógio de futebol-ondas.js);
   a próxima abertura vem de derivar(), nunca de conta no aparelho; em zero o aparelho pergunta ao servidor (simulado) antes de virar.
   Textos: docs/conteudo/FUTEBOL-CONFRONTO-VOZ-E-MICROCOPY.md. O que o microcopy não cobre leva a marca `[texto provisório]` no comentário (nunca colchete na interface). */
(function () {
  'use strict';
  if (window.__efCarregado) return; // o motor de templates pode executar o <script> da helmet duas vezes
  window.__efCarregado = true;

  var qs = new URLSearchParams(location.search);
  var QJOGO = qs.get('jogo');
  if (!QJOGO) return;
  var root = document.documentElement;

  /* ------------------------------------------------------------------ constantes e textos */
  // Constante única do termo da venda da pessoa (LF-12; o Wander ainda não decidiu; alternativa: «Sua abertura» e «Suas aberturas»). Trocar aqui, em duas linhas.
  var SUA_JANELA = 'Sua abertura';
  var SUAS_JANELAS = 'Suas aberturas';

  var T = {
    agenda: 'Agenda de vendas', proxima: 'Próxima abertura', outras: 'Outras aberturas',
    avisar: 'Me avisar quando abrir', ativado: 'Aviso ativado', avisoNota: 'Avisamos você por e-mail quando a venda abrir.', compra: 'Compra', quemVai: 'Quem vai', queroIr: 'Quero ir', compartilhar: 'Compartilhar', chamar: 'Chamar a torcida', abrindo: 'Abrindo…', conferindo: 'Estamos conferindo se a venda já abriu.',
    escolher: 'Escolher setor', escolherVisitante: 'Escolher setor visitante', verDatas: 'Ver datas de venda', verMudou: 'Ver o que mudou', verDetalhes: 'Ver detalhes',
    verReembolso: 'Ver meu reembolso', verProximo: 'Ver próximo jogo em casa', entrarFila: 'Entrar na fila', tentar: 'Tentar de novo',
    entrarConta: 'Entrar na conta', entrarPlano: 'Entrar para ver o seu plano', comoSocio: 'Ver como ser sócio', verOutras: 'Ver outras aberturas', verIngresso: 'Ver meu ingresso',
    trocarEmail: 'Trocar e-mail', email: 'E-mail', emailPh: 'Digite seu e-mail', emailAjuda: 'Usamos para avisar sobre a abertura da venda.', emailBotao: 'Me avisar',
    erroVazio: 'Digite um e-mail.', erroFormato: 'Confira o e-mail: falta o @ ou o final, como .com.', erroSalvar: 'Não foi possível salvar o aviso. Tente de novo em alguns minutos.',
    mandante: 'Mandante', visitante: 'Visitante',
    // [texto provisório] não cobertos pelo microcopy: títulos de seção da página, rótulos da lista de fatos e do bloco de preços, link da lista de jogos
    sobre: 'Antes de ir', setores: 'Setores e preços', local: 'Estádio · como chegar', maisJogos: 'Ver todos os jogos de futebol',
    fPortoes: 'Portões', fFim: 'Fim previsto', fQuando: 'Quando', fCampeonato: 'Campeonato', fEstadio: 'Estádio', fVisitante: 'Torcida visitante',
    precoNota: 'Preço final, com taxa de serviço.',
    // voz do torcedor (29/10/2026, Luíza): o bloco «Quem vai» e as garantias falam de torcida e de clube, não de show e produtora
    quemVaiJogo: 'Quem vai ao jogo', torcedores: 'torcedores', garantiaIngresso: 'Ingresso oficial, emitido pelo clube', paginaIndisponivel: 'Esta página ainda não está disponível.'
  };

  var IC = {
    clock: 'M12 6v6l4 2m6-2c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    open: 'm7.5 12 3 3 6-6m5.5 3c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    soldout: 'm4.93 4.93 14.14 14.14M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    lock: 'M17 10V8A5 5 0 0 0 7 8v2m5 4.5v2M8.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 18.72 20 17.88 20 16.2v-1.4c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.72 10 16.88 10 15.2 10H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 12.28 4 13.12 4 14.8v1.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C6.28 21 7.12 21 8.8 21Z',
    mine: 'M12 15.5H7.5c-1.396 0-2.093 0-2.661.172a4 4 0 0 0-2.667 2.667C2 18.907 2 19.604 2 21m14-3 2 2 4-4m-7.5-8.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z',
    flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19',
    bell: 'M9.354 21c.705.622 1.632 1 2.646 1s1.94-.378 2.646-1M18 8A6 6 0 1 0 6 8c0 3.09-.78 5.206-1.65 6.605-.735 1.18-1.102 1.771-1.089 1.936.015.182.054.252.2.36.133.099.732.099 1.928.099H18.61c1.196 0 1.795 0 1.927-.098.147-.11.186-.179.2-.361.014-.165-.353-.755-1.088-1.936C18.78 13.206 18 11.09 18 8Z',
    check: 'M20 6 9 17l-5-5',
    chev: 'm6 9 6 6 6-6',
    alert: 'M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    info: 'M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    clockw: 'M12 6v6l4 2m6-2c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    ext: 'M7 17 17 7M8 7h9v9'
  };
  var SIT = { // ícones do selo de situação (os mesmos de previa.js §3)
    venda: '<path d="M3 9a2 2 0 0 0 0 4v3h18v-3a2 2 0 0 1 0-4V6H3v3Z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    pre: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    'nao-aberto': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    esgotado: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    cancelado: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    encerrado: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    adiado: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alterado: '<path d="M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/>'
  };

  /* ------------------------------------------------------------------ utilidades */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ico(d, cls) { return '<svg class="uui-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function sitIco(k) { return '<svg class="ico sit-ico" data-ico="' + k + '" viewBox="0 0 24 24" aria-hidden="true">' + SIT[k] + '</svg>'; }
  function reduzido() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; }
  function tok(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function msTok(n, d) { var v = parseFloat(tok(n)); return isNaN(v) ? d : v; }
  /** Tempos e curvas do movimento (tokens motion.*): com movimento reduzido tudo é 0 e nenhuma animação é criada. */
  function Tm() {
    if (reduzido()) return { fast: 0, base: 0, slow: 0, dist: 0, stagger: 0, enter: 'linear', exit: 'linear', move: 'linear' };
    return { fast: msTok('--motion-duration-fast', 160), base: msTok('--motion-duration-base', 280), slow: msTok('--motion-duration-slow', 480), dist: msTok('--motion-distance-sm', 8), stagger: msTok('--motion-stagger', 40), enter: tok('--motion-ease-enter') || 'ease-out', exit: tok('--motion-ease-exit') || 'ease-in', move: tok('--motion-ease-move') || 'ease' };
  }

  var ONDAS = window.IngresseFutebolOndas; // futebol-ondas.js (derivar, relógio, conferência)
  var S = { // estado da simulação e da tela
    dados: null, ev: null, M: null, R: null, rel: null,
    viewer: { kind: 'anonymous', plan: null, entry: null },
    ov: { ciclo: '', vendas: '' }, confirma: '1s', atraso: { atrasoMs: 1000, falhar: false },
    virada: null, outras: false, quero: {}, subscribed: false,
    ultimoTick: 0, ultimaReval: 0, sig: '', un: '', msPassouZero: false, btn: null, rodando: false
  };

  /* ------------------------------------------------------------------ datas (sempre no fuso do estádio, escrito) */
  function tzDe() { return (S.M && S.M.venue && S.M.venue.timezone) || 'America/Sao_Paulo'; }
  function tzRotulo() { return (S.M && S.M.venue && S.M.venue.timezoneLabel) || 'horário de Brasília'; }
  function partes(iso, o) { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: tzDe() }, o)).formatToParts(new Date(iso)); }
  function pt(ps, t) { var p = ps.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; }
  function sp(s) { return String(s).replace('.', ''); }
  function diaCurto(iso) { var p = partes(iso, { weekday: 'short', day: 'numeric', month: 'short' }); return sp(pt(p, 'weekday')) + ' ' + pt(p, 'day') + ' ' + sp(pt(p, 'month')); }
  function diaMes(iso) { var p = partes(iso, { day: 'numeric', month: 'short' }); return pt(p, 'day') + ' ' + sp(pt(p, 'month')); }
  function hora(iso) { var p = partes(iso, { hour: 'numeric', minute: '2-digit', hour12: false }); var h = String(Number(pt(p, 'hour')) % 24), m = pt(p, 'minute'); return m === '00' ? h + 'h' : h + 'h' + m; }
  function aHora(iso) { var h = hora(iso); return (h === '1h' || /^1h\d\d$/.test(h) ? 'à ' : 'às ') + h; }
  function quandoTitulo(iso) { return diaCurto(iso) + ', ' + aHora(iso); }          // seg 2 nov, às 10h
  function quandoLista(iso) { return diaCurto(iso) + ' · ' + hora(iso); }           // seg 2 nov · 10h
  function quandoBarra(iso) { return diaCurto(iso) + ', ' + hora(iso); }            // seg 2 nov, 10h
  function extenso(iso) { var p = partes(iso, { weekday: 'long', day: 'numeric', month: 'long' }); return pt(p, 'weekday') + ', ' + pt(p, 'day') + ' de ' + pt(p, 'month') + ', ' + aHora(iso); }
  function diaLocal(ms) { return new Intl.DateTimeFormat('en-CA', { timeZone: tzDe(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); }
  function fusoFrase() { return 'Todos os horários são ' + tzRotulo().replace(/^horário /, '') + '.'; } // «Todos os horários são de Brasília.»
  function brl(c) { return 'R$ ' + new Intl.NumberFormat('pt-BR').format(Math.ceil(c / 100)); } // sem centavos, arredonda para cima

  /* ------------------------------------------------------------------ contador (referência do Edu: cfContador, com a correção do Bessa: segundos limitados a 59) */
  var Cont = (function () {
    var plural = function (n, s, p) { return n + ' ' + (n === 1 ? s : p); };
    function faixa(ms, limiteHoras) {
      var lim = (limiteHoras == null ? 24 : limiteHoras) * 3600000;
      if (ms == null || isNaN(ms)) return 'data';
      if (ms <= 0) return 'zero';
      if (ms >= lim) return 'data';
      if (lim > 86400000 && ms >= 86400000) return 'dias';
      if (ms >= 3600000) return 'horas';
      if (ms >= 60000) return 'minutos';
      return 'segundos';
    }
    function partesDe(ms, f) {
      var d, h, m, s;
      if (f === 'dias') { d = Math.floor(ms / 86400000); h = Math.floor((ms % 86400000) / 3600000); return [{ n: d, un: d === 1 ? 'dia' : 'dias' }].concat(h ? [{ n: h, un: h === 1 ? 'hora' : 'horas' }] : []); }
      if (f === 'horas') { h = Math.floor(ms / 3600000); m = Math.floor((ms % 3600000) / 60000); return [{ n: h, un: h === 1 ? 'hora' : 'horas' }].concat(m ? [{ n: m, un: m === 1 ? 'minuto' : 'minutos' }] : []); }
      if (f === 'minutos') { m = Math.floor(ms / 60000); return [{ n: m, un: m === 1 ? 'minuto' : 'minutos' }]; }
      if (f === 'segundos') { s = Math.min(59, Math.max(1, Math.ceil(ms / 1000))); return [{ n: s, un: s === 1 ? 'segundo' : 'segundos' }]; } // Math.min(59): o teto mostraria «60 segundos» entre 59,001 e 59,999 s
      return [];
    }
    function barra(curto, ms, f, quando) {
      if (f === 'data') return curto + ' abre ' + quando;
      if (f === 'zero') return T.abrindo;
      if (f === 'segundos') return curto + ' abre em instantes';
      var ab = { hora: 'h', horas: 'h', minuto: 'min', minutos: 'min', dia: 'd', dias: 'd' };
      return curto + ' abre em ' + partesDe(ms, f).map(function (p) { return p.n + ' ' + ab[p.un]; }).join(' e ');
    }
    return { faixa: faixa, partes: partesDe, barra: barra, plural: plural };
  })();

  /* ------------------------------------------------------------------ dados: jogo efetivo (o dado + as sobrescritas da engrenagem) */
  var ESCUDOS = null, ESTADIOS = null;
  function carregarJson(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function ancoraMs() { return Date.parse(S.dados.clock.serverNow); }

  function jogoEfetivo() {
    var m = clone(S.ev.match);
    var ov = S.ov, a = ancoraMs();
    m.__alt = null;
    if (ov.ciclo === 'adiado') { m.lifecycle = 'postponed'; m.__novaData = new Date(Date.parse(m.kickoff) + 7 * 864e5).toISOString(); m.__novaDataLocal = shiftIso(m.kickoff, 7); }
    else if (ov.ciclo === 'cancelado') m.lifecycle = 'cancelled';
    else if (ov.ciclo === 'estadio' || ov.ciclo === 'mandante' || ov.ciclo === 'portoes') { m.lifecycle = 'changed'; m.__alt = ov.ciclo; }
    if (ov.vendas === 'sem-data') m.waves = m.waves.map(function (w) { return Object.assign({}, w, { opensAt: null, soldOutAt: null }); });
    if (ov.vendas === 'acessibilidade') {
      var futuras = m.waves.filter(function (w) { return !w.opensAt || Date.parse(w.opensAt) > a; });
      m.waves = [{
        id: 'w-acc', label: 'Venda de acessibilidade', displayName: 'Venda de acessibilidade', audienceLabel: 'Acessibilidade', priorityInName: false, shortName: null, plan: null, priority: 1,
        audiences: ['accessibility'], opensAt: new Date(a - 864e5).toISOString().replace('Z', '+00:00'), closesAt: shiftIso(m.kickoff, 0, -1), quota: 200, sold: 20, remaining: 180, limitPerPerson: 2, state: 'open', soldOutAt: null,
        access: { kind: 'none', verifiedAt: null }, change: null
      }].concat(futuras);
    }
    if (ov.vendas === 'esgotado') {
      var jaAbertas = m.waves.filter(function (w) { return w.opensAt && Date.parse(w.opensAt) <= a; });
      if (jaAbertas.length) m.waves = jaAbertas.map(function (w) { return Object.assign({}, w, { soldOutAt: w.opensAt }); });
    }
    if (ov.vendas === 'sem-precos') m.degraded = true;
    return m;
  }
  function shiftIso(iso, dias, horas) { // mantém o offset do estádio no texto (o Date de saída é só para somar)
    var off = /([+-]\d\d:\d\d)$/.exec(iso); var t = Date.parse(iso) + (dias || 0) * 864e5 + (horas || 0) * 36e5;
    var o = off ? off[1] : '+00:00', sign = o[0] === '-' ? -1 : 1, mins = sign * (Number(o.slice(1, 3)) * 60 + Number(o.slice(4, 6)));
    var d = new Date(t + mins * 6e4); var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + o;
  }
  function planos() { // rótulos de plano do jogo (para a engrenagem)
    var vistos = {}, out = [];
    S.ev.match.waves.forEach(function (w) { if (w.plan && !vistos[w.plan]) { vistos[w.plan] = 1; out.push(w.plan); } });
    return out;
  }
  function chavePlano(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function recalcular(animar) {
    S.M = jogoEfetivo();
    S.R = ONDAS.derivar(S.M, S.rel.agora(), S.viewer);
    S.ultimaReval = Date.now();
    S.virada = limparVirada(); S.espera4 = false; clearTimeout(S.t4); if (elA) elA.style.minHeight = '';
    S.subscribed = lembreteAtivo();
    renderTudo(!!animar);
    atualizarPainel();
  }
  function limparVirada() { if (S.virada) { if (S.virada.poll) clearInterval(S.virada.poll); if (S.virada.hold) clearTimeout(S.virada.hold); } return null; }

  /* ------------------------------------------------------------------ vista: tudo que a tela mostra, derivado de S.R, do jogo e do relógio */
  function ehSocioAud(a) { return a === 'members' || a.indexOf('plan:') === 0; }
  function ondaPorId(id) { return S.M.waves.filter(function (w) { return w.id === id; })[0] || null; }
  function janelaPorId(id) { return S.R.windows.filter(function (w) { return w.id === id; })[0] || null; }
  function soAud(w, f) { return w.audiences.length > 0 && w.audiences.every(f); }
  function publicoCurto(w) { // rótulo curto do público para a linha fixa do cabeçalho
    if (w.audiences.indexOf('general') >= 0) return 'venda geral';
    if (soAud(w, function (a) { return a === 'visitor'; })) return 'torcida visitante';
    if (soAud(w, function (a) { return a === 'accessibility'; })) return 'acessibilidade';
    return 'sócios';
  }
  function sujeitoDa(w) { // { l: «A venda geral», c: «Geral» }
    var j = janelaPorId(w.id), k = S.viewer.kind;
    if (k === 'member' && j && j.mine) return { l: 'Sua venda', c: 'Sua venda', clube: false };
    if (soAud(w, function (a) { return a === 'visitor'; })) return { l: 'A venda para a torcida visitante', c: 'Visitante' };
    if (soAud(w, function (a) { return a === 'accessibility'; })) return { l: 'A venda de acessibilidade', c: 'Acessibilidade' };
    if (w.audiences.indexOf('general') >= 0) return { l: 'A venda geral', c: 'Geral' };
    if (k === 'anonymous') return { l: 'A próxima venda', c: 'Próxima venda', clube: true };
    return { l: 'A venda para sócios', c: 'Sócios' };
  }
  function ordinal(r) { return r && r.number != null ? r.number + 'ª rodada' : (r && r.label) || ''; }
  function precoMin(m) { return m.sectors && m.sectors.length ? Math.min.apply(null, m.sectors.map(function (s) { return s.totalCents; })) : null; }
  function selosDe(R, M, m) { // selo da situação do cabeçalho (até 20 caracteres): { sit, texto }
    var s = R.saleSummary, b = s.badge || {};
    switch (s.code) {
      case 'cancelled': return { sit: 'cancelado', texto: 'Cancelado' };
      case 'postponed': return { sit: 'adiado', texto: 'Adiado' };
      case 'changed': return { sit: 'alterado', texto: { estadio: 'Estádio alterado', mandante: 'Mandante alterado', portoes: 'Portões fechados' }[M.__alt] || 'Estádio alterado' };
      case 'ended': return { sit: 'encerrado', texto: 'Jogo realizado' };
      case 'degraded': return { sit: 'nao-aberto', texto: 'Venda não aberta' };
      case 'on_sale': return b.kind === 'members_sale' ? { sit: 'pre', texto: 'Venda para sócios' } : R.saleSummary.primaryAction === 'buy_accessibility' ? { sit: 'venda', texto: 'Acessibilidade' } : { sit: 'venda', texto: 'À venda' };
      case 'members_only': return { sit: 'pre', texto: 'Venda para sócios' };
      case 'scheduled': if (!b.local) return { sit: 'nao-aberto', texto: 'Venda não aberta' }; return { sit: 'nao-aberto', texto: (b.kind === 'general_soon' ? 'Geral abre ' : 'Abre ') + diaMes(b.local) };
      case 'sold_out': return { sit: 'esgotado', texto: 'Esgotado' };
      case 'closed': return { sit: 'encerrado', texto: 'Vendas encerradas' };
    }
    return { sit: 'venda', texto: 'À venda' };
  }
  function algumaAberta(pred) { return S.M.waves.some(function (w) { var j = janelaPorId(w.id); return j && j.state === 'open' && pred(w); }); }
  function algumaEsgotadaSocio() { return S.M.waves.some(function (w) { var j = janelaPorId(w.id); return j && j.state === 'soldOut' && w.audiences.some(ehSocioAud); }); }

  var ACAO = { // código de previa/futebol-ondas.js (primaryAction) -> rótulo (microcopy §2.1)
    see_refund: T.verReembolso, see_options: T.verDetalhes, see_changes: T.verMudou, see_next_home_game: T.verProximo, see_next_home_games: T.verProximo,
    choose_sector: T.escolher, buy_members: T.escolher, buy_visitor: T.escolherVisitante, buy_accessibility: T.escolher, see_dates: T.verDatas,
    notify_me: T.avisar, join_queue: T.entrarFila, retry: T.tentar
  };

  function vista() {
    var R = S.R, M = S.M, sum = R.saleSummary, code = sum.code, acao = sum.primaryAction, k = S.viewer.kind;
    var no = R.nextOpening, agora = S.rel.agora();
    var v = { code: code, acao: acao, selo: selosDe(R, M), linha: '', titulo: '', apoio: [], links: [], contador: null, lista: null, notas: [], aviso: null };
    var nomeJogo = M.title;

    // contador: só abaixo de 24 h (saleDisplay.countdownFromHours), com a próxima abertura que o servidor derivou
    var limite = M.saleDisplay && M.saleDisplay.countdownFromHours != null ? M.saleDisplay.countdownFromHours : 24;
    var wNo = no && no.waveId ? ondaPorId(no.waveId) : null;
    var msAte = no && no.at ? Date.parse(no.at) - agora : null;
    var emZero = !!S.virada && S.virada.fase !== 'confirmado';
    var f = emZero ? 'zero' : Cont.faixa(msAte, limite);
    var suj = wNo ? sujeitoDa(wNo) : null;
    var temContador = !!(wNo && no.at && f !== 'data' && !S.espera4 && (code === 'scheduled' || code === 'on_sale' || code === 'members_only' || emZero));
    if (temContador) {
      var rotuloAria = cap(suj.l.replace(/^A /, '')) + ' abre ' + extenso(no.local) + ', ' + tzRotulo();
      v.contador = { faixa: f, ms: msAte, suj: suj, wave: wNo, local: no.local, aria: rotuloAria, partes: Cont.partes(msAte, f), clube: !!suj.clube, nomeClube: wNo.displayName || wNo.label };
    }

    // linha fixa do cabeçalho
    if (k === 'member' && S.viewer.plan && (code === 'scheduled' || code === 'on_sale')) v.linha = 'Seu plano: ' + S.viewer.plan;
    else if (code === 'scheduled' && wNo && no.local) v.linha = 'Próxima abertura: ' + publicoCurto(wNo) + ' · ' + quandoBarra(no.local);

    // título e apoio da coluna
    var fuso = fusoFrase();
    function apoioData(prefixo, extra) { // abaixo de 24 h a data vai ao apoio, com o fuso; senão só o fuso (a data está no título)
      if (f !== 'data' && no && no.local) return [cap(quandoTitulo(no.local)) + ' (' + tzRotulo() + ').'].concat(prefixo || [], extra || []);
      return (prefixo || []).concat([fuso], extra || []);
    }
    var notaPlano = k === 'anonymous' && M.memberProgram && M.memberProgram.enabled ? ['Entre na conta para ver as datas do seu plano.'] : [];
    switch (code) {
      case 'cancelled':
        v.titulo = 'O jogo ' + nomeJogo + ' foi cancelado.'; v.apoio = ['Quem comprou recebe o reembolso na forma de pagamento original, em até 10 dias úteis, sem precisar pedir.']; break;
      case 'postponed':
        v.titulo = 'O jogo foi adiado.';
        v.apoio = [M.__novaDataLocal ? 'Nova data: ' + extenso(M.__novaDataLocal) + ' (' + tzRotulo() + '). Seu ingresso continua válido. Se não puder ir, peça reembolso até ' + diaMes(shiftIso(M.__novaDataLocal, -4)) + '.' : 'A nova data ainda não foi definida.']; break;
      case 'changed':
        // sem artigo antes do nome do clube («o Ponte Preta» e «a Ponte Preta» não se resolvem por regra) e sem artigo antes do estádio antigo («na Maracanã»)
        if (M.__alt === 'mandante') { v.titulo = 'O mandante mudou: ' + M.awayTeam.name + ' passa a ser o mandante.'; v.apoio = ['Seu ingresso segue válido. Você não precisa fazer nada.']; }
        else if (M.__alt === 'portoes') { v.titulo = 'O jogo será com portões fechados.'; v.apoio = ['A venda de ingressos está suspensa.']; }
        else { v.titulo = 'O jogo mudou de estádio: agora é no Estádio Pampa, em Campo Largo (antes: ' + M.venue.name + ').'; v.apoio = ['Seu ingresso segue válido. Você não precisa fazer nada.']; }
        break;
      case 'ended': v.titulo = 'Este jogo já aconteceu.'; break;
      case 'degraded': v.titulo = 'Não foi possível carregar os preços agora.'; v.apoio = ['Tente de novo em alguns minutos.']; break;
      case 'sold_out': v.titulo = 'Os ingressos esgotaram.'; v.apoio = ['Entre na fila e avisamos se aparecer ingresso. Também dá para ver a Revenda Oficial.']; break; // [texto provisório] título; apoio: microcopy V11
      case 'closed': {
        var fim = lastCloses(); v.titulo = 'As vendas terminaram em ' + diaMes(fim) + ', ' + aHora(fim) + '.';
        v.apoio = sum.matchDay ? ['O jogo é hoje, ' + extenso(M.kickoff) + ' (' + tzRotulo() + ').'] : []; break;
      }
      case 'members_only': v.titulo = 'Neste momento a venda é para sócios.'; v.apoio = ['Esta conta não tem plano de sócio.']; v.links.push({ k: 'comoSocio', t: T.comoSocio }); break;
      case 'on_sale': {
        var fecha = R.nextClosing && R.nextClosing.local;
        var minhaAberta = k === 'member' && algumaAberta(function (w) { var j = janelaPorId(w.id); return j && j.mine; });
        var proxGeral = (R.nextOpening && R.nextOpening.audiences.indexOf('general') >= 0) ? R.nextOpening.local : null;
        if (acao === 'buy_visitor') {
          v.titulo = 'A venda para a torcida visitante está aberta';
          var lim = ondaAberta(function (w) { return soAud(w, function (a) { return a === 'visitor'; }); }), gate = M.visitorSector && M.visitorSector.gate;
          v.apoio = ['Limite de ' + Cont.plural(lim && lim.limitPerPerson || 1, 'ingresso', 'ingressos') + ' por pessoa. ' + (gate ? 'Entrada pelo ' + gate.charAt(0).toLowerCase() + gate.slice(1) + '.' : 'Ainda não temos o portão da torcida visitante.')];
          if (precoMin(M)) v.apoio.push('Setor visitante: ' + brl(precoMin(M)) + '.');
        } else if (acao === 'buy_accessibility') {
          v.titulo = 'A venda de acessibilidade está aberta'; v.apoio = ['Leve o documento que o clube pedir na entrada.'];
        } else if (acao === 'see_dates') {
          v.titulo = 'Há ' + M.waves.length + ' datas de venda para este jogo'; v.apoio = [];
        } else if (minhaAberta) {
          v.titulo = 'Sua venda está aberta'; v.apoio = [];
          if (fecha) v.apoio.push('Fecha ' + quandoTitulo(fecha) + ' (' + tzRotulo() + ').');
          if (proxGeral) v.apoio.push('Venda geral: ' + quandoTitulo(proxGeral) + '.');
        } else if (acao === 'buy_members') { // anônima com venda de sócios aberta (V06)
          v.titulo = 'A venda para sócios está aberta';
          v.apoio = ['O clube confirma seu acesso na compra.' + (proxGeral ? ' A venda geral abre ' + quandoTitulo(proxGeral) + ' (' + tzRotulo() + ').' : ''), 'Sócios compram antes.'];
          v.links.push({ k: 'entrarPlano', t: T.entrarPlano });
        } else { // venda geral aberta (V01)
          v.titulo = 'A venda geral está aberta';
          var lg = ondaAberta(function (w) { return w.audiences.indexOf('general') >= 0; });
          v.apoio = [];
          if (precoMin(M)) v.apoio.push('A partir de ' + brl(precoMin(M)) + ', taxa incluída.');
          if (lg && lg.limitPerPerson) v.apoio.push('Limite de ' + Cont.plural(lg.limitPerPerson, 'ingresso', 'ingressos') + ' por pessoa.');
          if (fecha) v.apoio.push('A venda fecha em ' + diaMes(fecha) + ', ' + aHora(fecha) + '.');
        }
        break;
      }
      case 'scheduled': {
        if (!no || !no.local) { v.titulo = 'A abertura das vendas ainda não tem data.'; v.apoio = []; break; }
        var prefixo = [];
        if (sum.badge && sum.badge.kind === 'general_soon' && algumaEsgotadaSocio()) prefixo.push('Os ingressos para sócios esgotaram.');
        var extra = k === 'anonymous' ? notaPlano : k === 'member' ? ['Veja também as outras datas.'] : [algumaAberta(function (w) { return w.audiences.some(ehSocioAud); }) ? 'Neste momento a venda é para sócios. Esta conta não tem plano de sócio.' : 'Esta conta não tem plano de sócio, e sócios compram antes.'];
        if (!v.contador) v.titulo = suj.l + ' abre ' + quandoTitulo(no.local);
        v.apoio = apoioData(prefixo, extra);
        if (k === 'anonymous' && notaPlano.length) v.links.push({ k: 'entrarConta', t: T.entrarConta });
        if (k === 'member') v.links.push({ k: 'verOutras', t: T.verOutras });
        if (k === 'notMember') v.links.push({ k: 'comoSocio', t: T.comoSocio });
        break;
      }
    }
    // com contador, o título é o próprio cronômetro e o apoio vai dentro dele (a data nunca em dois lugares)
    if (v.contador && code === 'scheduled') { v.contador.apoio = v.apoio; v.contador.ehTitulo = true; v.titulo = ''; v.apoio = []; }
    else if (v.contador) { v.contador.apoio = [cap(quandoTitulo(no.local)) + ' (' + tzRotulo() + ').']; }
    v.rotuloBotao = emZero && S.virada.fase === 'abrindo' ? T.abrindo : (ACAO[acao] || T.escolher);
    v.lista = listaAberturas(v);
    v.barra = barraTexto(v, suj, f, msAte, no);
    return v;
  }
  function ondaAberta(pred) { var r = null; S.M.waves.forEach(function (w) { var j = janelaPorId(w.id); if (!r && j && j.state === 'open' && pred(w)) r = w; }); return r; }
  function lastCloses() { var m = 0, iso = S.M.waves[0] && S.M.waves[0].closesAt; S.M.waves.forEach(function (w) { var t = Date.parse(w.closesAt); if (t > m) { m = t; iso = w.closesAt; } }); return iso; }

  /* barra móvel: texto curto, sem segundos, aria-hidden */
  function barraTexto(v, suj, f, ms, no) {
    if (v.code === 'on_sale') return v.selo.texto === 'À venda' && precoMin(S.M) ? 'A partir de ' + brl(precoMin(S.M)) : v.selo.texto;
    if (v.code === 'scheduled' && no && no.local && suj) return Cont.barra(suj.c, ms, f, quandoBarra(no.local));
    if (v.code === 'scheduled') return 'Venda não aberta';
    return v.selo.texto;
  }

  /* ------------------------------------------------------------------ lista de aberturas (linha do tempo) */
  var ESTADO_ROTULO = { scheduled: 'Ainda não abriu', open: 'Aberta', soldout: 'Esgotada', closed: 'Encerrada' };
  var ESTADO_ICO = { scheduled: IC.clock, open: IC.open, soldout: IC.soldout, closed: IC.lock };
  function chaveEstado(s) { return s === 'soldOut' ? 'soldout' : s; }
  function listaAberturas(v) {
    var code = v.code;
    if (['on_sale', 'scheduled', 'members_only', 'sold_out', 'closed', 'degraded'].indexOf(code) < 0 || !S.M.waves.length) return null;
    var k = S.viewer.kind, ordem = S.R.windows, noId = S.R.nextOpening && S.R.nextOpening.waveId;
    var excluir = v.contador ? v.contador.wave.id : (code === 'scheduled' && S.R.nextOpening && S.R.nextOpening.local ? S.R.nextOpening.waveId : null); // C2: o contador, ou o título e a linha do cabeçalho, já nomeiam a próxima abertura: a lista não a repete (o estado e a ação ficam no título e no botão)
    var visiveis = [], outras = [];
    ordem.forEach(function (j) {
      var w = ondaPorId(j.id); if (!w) return;
      var linha = { w: w, j: j, mine: false };
      if (k === 'member') { linha.mine = !!j.mine || (j.eligible && j.isGeneral && false); (j.mine || (j.eligible && j.isGeneral)) ? visiveis.push(linha) : outras.push(linha); }
      else if (k === 'notMember') { linha.mine = !!(j.eligible && j.isGeneral); (j.eligible && j.isGeneral) ? visiveis.push(linha) : outras.push(linha); }
      else { // anônima: as abertas e, se nada está aberta, a próxima; o resto recolhido
        var destaque = j.state === 'open' || (!ordem.some(function (x) { return x.state === 'open'; }) && j.id === (noId || ordem[0].id));
        destaque ? visiveis.push(linha) : outras.push(linha);
      }
    });
    if (excluir) { visiveis = visiveis.filter(function (l) { return l.w.id !== excluir; }); outras = outras.filter(function (l) { return l.w.id !== excluir; }); }
    // «Outras aberturas» só recolhe o que sobra; sem nada visível e sem outras, não há lista
    if (!visiveis.length && !outras.length) return null;
    var titulo = T.agenda;
    if (k === 'anonymous') titulo = ordem.some(function (x) { return x.state === 'open'; }) ? T.agenda : T.proxima;
    else if (k === 'member' && visiveis.some(function (l) { return l.mine; })) titulo = SUAS_JANELAS;
    return { titulo: titulo, visiveis: visiveis, outras: outras };
  }

  function linhaQuando(w, st) { // «Abre seg 2 nov · 10h», «Fecha …», «Fechou …», «Sem data de abertura»
    if (st === 'scheduled') return w.opensAt ? 'Abre ' + quandoLista(w.opensAt) : 'Sem data de abertura';
    if (st === 'open') return 'Fecha ' + quandoLista(w.closesAt);
    if (st === 'closed') return 'Fechou ' + quandoLista(w.closesAt);
    return '';
  }
  /** Rótulo de público: texto nosso, vindo do dado estruturado (`audiences`), nunca do nome do clube (microcopy §3). «Público geral» não é rótulo: é «venda geral». */
  function rotuloPublico(w) {
    var a = w.audiences || [], socio = a.some(ehSocioAud), geral = a.indexOf('general') >= 0;
    if (socio && geral) return 'Venda para sócios e venda geral';
    if (socio) return 'Venda para sócios';
    if (geral) return 'Venda geral';
    if (a.indexOf('visitor') >= 0) return 'Torcida visitante';
    if (a.indexOf('accessibility') >= 0) return 'Venda de acessibilidade';
    return w.audienceLabel || '';
  }
  function rotuloJanela(w) {
    var r = rotuloPublico(w);
    if (r && String(w.displayName || w.label).toLowerCase() === r.toLowerCase()) return ''; // o nome do clube já diz o público: uma informação, um lugar
    if (w.priorityInName === false && w.priority && w.plan) r += (r ? ' · ' : '') + 'Prioridade ' + w.priority;
    return r;
  }
  function badgeEstado(st) { return '<span class="uui-badge" data-state="' + st + '">' + ico(ESTADO_ICO[st]) + ESTADO_ROTULO[st] + '</span>'; }
  function htmlLinha(l) {
    var w = l.w, st = chaveEstado(l.j.state), q = linhaQuando(w, st);
    var iso = st === 'scheduled' ? w.opensAt : w.closesAt;
    var dataHtml = q ? '<span class="cf-janela__data">' + (iso ? '<time datetime="' + esc(iso) + '">' + esc(q) + '</time>' : esc(q)) + '</span>' : '';
    var rot = rotuloJanela(w);
    return '<li class="uui-timeline-item cf-janela" data-state="' + st + '"' + (l.mine ? ' data-mine' : '') + ' data-wave="' + esc(w.id) + '">' +
      '<span class="uui-timeline-item__trilho" aria-hidden="true"><span class="uui-timeline-item__marcador"></span></span>' +
      '<div class="cf-janela__card">' +
      (l.mine ? '<span class="uui-badge" data-kind="mine">' + ico(IC.mine) + esc(SUA_JANELA) + '</span>' : '') +
      '<p class="cf-janela__nome">' + esc(w.displayName || w.label) + '</p>' +
      (rot ? '<p class="cf-janela__rotulo">' + esc(rot) + '</p>' : '') +
      '<p class="cf-janela__quando" data-k="row-' + esc(w.id) + '">' + dataHtml + badgeEstado(st) + '</p>' +
      '</div></li>';
  }
  function htmlAberturas(v) {
    var L = v.lista; if (!L) return '';
    var h = '<section class="cf-aberturas" id="ef-aberturas"' + (L.visiveis.length ? ' aria-labelledby="ef-ab-t"' : ' aria-label="' + T.outras + '"') + '>' + (L.visiveis.length ? '<h3 class="cf-aberturas__titulo" id="ef-ab-t">' + esc(L.titulo) + ' · ' + esc(tzRotulo()) + '</h3>' : '') + ''; // o fuso vai no rótulo da lista [texto provisório]
    if (L.visiveis.length) h += '<ul class="uui-timeline" aria-label="Aberturas de venda">' + L.visiveis.map(htmlLinha).join('') + '</ul>';
    if (L.outras.length) {
      var ab = S.outras;
      h += '<div class="cf-outras"><button type="button" class="cf-outras__gatilho" id="ef-outras-b" aria-expanded="' + ab + '" aria-controls="ef-outras-p" data-ef="outras"><span>' + T.outras + ' (' + L.outras.length + ')</span>' + ico(IC.chev) + '</button>' +
        '<div class="cf-outras__painel" id="ef-outras-p" data-aberto="' + ab + '"' + (ab ? '' : ' inert') + '><div class="cf-outras__conteudo"><ul class="uui-timeline" aria-label="' + T.outras + '">' + L.outras.map(htmlLinha).join('') + '</ul></div></div></div>';
    }
    return h + '</section>';
  }

  /* ------------------------------------------------------------------ cabeçalho do confronto (decisões do parecer 2d) */
  function nomeTime(t, passoMenor) {
    var curto = t.shortName || t.name;
    return '<span class="cf-time__nome">' + (curto !== t.name ? '<span aria-hidden="true">' + esc(curto) + '</span><span class="cf-vh">' + esc(t.name) + '</span>' : '<span>' + esc(curto) + '</span>') + '</span>';
  }
  function htmlTime(t, papel) {
    var src = t.crest && (t.crest.srcOnDark || t.crest.src);
    var escudo = '<span class="cf-escudo' + (src ? ' cf-escudo--img' : '') + '" aria-hidden="true"><span class="cf-escudo__content">' + (src ? '<img class="cf-escudo__img" src="' + esc(src) + '" alt="' + esc(t.name || '') + '" width="64" height="64">' : esc(t.monogram || '')) + '</span></span>';
    return '<span class="cf-time" data-papel="' + papel + '">' + escudo + '<span class="cf-time__texto">' + nomeTime(t) + '<span class="cf-time__papel" aria-hidden="true">' + (papel === 'mandante' ? T.mandante : T.visitante) + '</span></span></span>';
  }
  function htmlCabecalho(v) {
    var M = S.M, c = M.competition || {}, home = M.homeTeam, away = M.awayTeam;
    if (M.__alt === 'mandante') { var x = home; home = away; away = x; }
    var passo = [home, away].some(function (t) { return t.shortNameStep === 'small'; });
    var contexto = esc(c.name || '') + (c.phase ? '' : (ordinal(c.round) ? ' · ' + esc(ordinal(c.round)) : ''));
    var topo = '<div class="ef-cab__topo"><p class="cf-confronto__contexto">' + contexto + '</p>' +
      (c.phase ? '<span class="ef-fase">' + esc(c.round && c.round.label || c.phase) + '</span>' : '') +
      (M.clientSide === 'away' ? '<span class="uui-badge" data-kind="away">' + ico(IC.flag) + 'Torcida visitante' + (M.visitorSector && M.visitorSector.gate ? ' · ' + esc(M.visitorSector.gate) : '') + '</span>' : '') + '</div>';
    var tz = tzRotulo();
    var estadio = M.__alt === 'estadio' ? 'Estádio Pampa, Campo Largo (RS)' : (M.venue.name + ', ' + M.venue.city + ' (' + M.venue.state + ')');
    var quando;
    if (M.lifecycle === 'postponed' && M.__novaDataLocal) quando = '<time class="cf-confronto__quando" datetime="' + esc(M.__novaDataLocal) + '">Nova data: ' + esc(quandoLista(M.__novaDataLocal)) + '</time>';
    else if (v.code === 'closed' && S.R.saleSummary.matchDay) quando = '<time class="cf-confronto__quando" datetime="' + esc(M.kickoff) + '">Hoje, ' + esc(quandoLista(M.kickoff)) + '</time> (' + esc(tz) + ')';
    else quando = '<time class="cf-confronto__quando" datetime="' + esc(M.kickoff) + '">' + esc(quandoLista(M.kickoff)) + '</time> (' + esc(tz) + ')';
    if (M.lifecycle === 'postponed') quando = quando; // adiado: sem o fuso na linha (V16; o fuso fica escrito na coluna)
    var apoio = '<ul class="cf-confronto__apoio"><li>' + esc(estadio) + '</li><li class="cf-confronto__quando-li">' + quando + '</li></ul>';
    var estado = '<div class="cf-confronto__estado"><span class="tag tag-lg" data-sit="' + v.selo.sit + '" data-k="cab-selo">' + sitIco(v.selo.sit) + esc(v.selo.texto) + '</span>' + (v.linha ? '<span class="cf-confronto__linha" data-k="cab-linha">' + esc(v.linha) + '</span>' : '') + '</div>';
    return '<header class="cf-confronto ef-cab" data-estado="' + esc(v.code) + '"' + (passo ? ' data-passo="menor"' : '') + '>' + topo +
      '<h1 class="cf-confronto__titulo">' + htmlTime(home, 'mandante') + '<span class="cf-confronto__x" aria-hidden="true">x</span>' + htmlTime(away, 'visitante') + '</h1>' + apoio + estado + '</header>';
  }

  /* ------------------------------------------------------------------ contador, resposta e botão */
  function htmlContador(v) {
    var C = v.contador; if (!C) return '';
    var zero = C.faixa === 'zero', nomeClube = C.clube ? '<span class="cf-contador__clube">' + esc(C.nomeClube) + '</span>' : '';
    var suj = zero ? (C.suj.l + ' abre agora') : (C.suj.l + ' abre em');
    var valor = zero ? '<span class="cf-contador__abrindo">' + T.abrindo + '</span>' : C.partes.map(function (p) { return '<span class="cf-contador__parte"><span class="cf-contador__num" data-cf="n">' + p.n + '</span><span class="cf-contador__un" data-cf="un">' + p.un + '</span></span>'; }).join('');
    var apoio = (C.apoio || []).length ? '<p class="cf-contador__fixo" data-k="cont-fixo"><time datetime="' + esc(C.local) + '">' + esc(C.apoio[0]) + '</time>' + (C.apoio.length > 1 ? ' ' + esc(C.apoio.slice(1).join(' ')) : '') + '</p>' : '';
    // a linha de aviso existe sempre (oculta até o servidor demorar): a caixa reserva a altura do maior estado e o botão não se mexe
    var conf = zero && S.virada && S.virada.fase === 'conferindo';
    var aviso = '<p class="cf-contador__aviso" data-k="cont-aviso"' + (conf ? '' : ' aria-hidden="true" style="visibility:hidden"') + '>' + (conf ? T.conferindo : T.conferindo) + '</p>';
    return '<div class="cf-contador" role="timer" aria-live="off" aria-atomic="true" aria-label="' + esc(C.aria) + '" data-faixa="' + C.faixa + '" data-sujeito="' + (C.suj.c === 'Sua venda' ? 'sua' : 'geral') + '"' + (zero ? ' aria-busy="true"' : '') + ' data-k-box="cont">' +
      '<p class="cf-contador__sujeito" data-k="cont-sujeito">' + nomeClube + esc(suj) + '</p>' +
      '<p class="cf-contador__valor" data-k="cont-valor">' + valor + '</p>' + aviso + apoio + '</div>';
  }
  function htmlResposta(v) {
    if (!v.titulo) return '';
    return '<div class="cf-resposta"><h2 class="cf-resposta__titulo" data-k="resp-titulo">' + esc(v.titulo) + '</h2>' +
      (v.apoio.length ? '<p class="cf-resposta__apoio" data-k="resp-apoio">' + v.apoio.map(esc).join('<br>') + '</p>' : '') + '</div>';
  }
  function lembreteItem() {
    var no = S.R && S.R.nextOpening, M = S.M;
    var w = no && no.waveId ? ondaPorId(no.waveId) : null;
    return { id: 'futebol:' + M.id + ':' + (w ? w.id : 'sem-data'), evento: M.title, praca: w ? (w.displayName || w.label) : '', abreEm: no && no.local ? new Date(Date.parse(no.local) + DELTA).toISOString() : '2099-01-01T00:00:00-03:00', anunciadoEm: no && no.local ? no.local : '', antecipaMs: 0, href: 'Evento.dc.html?jogo=' + M.id }; // a abertura vem do servidor: sem antecipação de 5 min
  }
  function notaAviso() { // «Aviso ativado. Avisamos você no WhatsApp quando a venda abrir.» (o canal é o do lembrete; WhatsApp primeiro, decisão de 28/10)
    var L = window.IngresseLembretes, id = lembreteItem().id, it = L && L.lista ? L.lista().filter(function (x) { return x.id === id; })[0] : null;
    return 'Aviso ativado. Avisamos você ' + (it && it.canal === 'whatsapp' ? 'no WhatsApp' : 'por e-mail') + ' quando a venda abrir.';
  }
  function lembreteAtivo() { var L = window.IngresseLembretes; return !!(L && S.R && S.R.saleSummary.primaryAction === 'notify_me' && L.tem(lembreteItem().id)); }

  function htmlAcao(v) {
    var notificar = v.acao === 'notify_me';
    var h = '';
    if (notificar) {
      var ativo = S.subscribed;
      h += '<p class="cf-acao__estado" role="status" aria-live="polite" id="ef-aviso-estado"></p>';
      if (ativo) h += '<p class="cf-acao__conta">' + notaAviso() + '</p>';
      else if (S.viewer.kind === 'anonymous') h += '<a href="' + hrefLogin() + '" class="linkbtn cf-acao__secundario" data-ef-link="entrarConta">' + T.entrarConta + '</a>';
    }
    v.links.forEach(function (l) { if (notificar && l.k === 'entrarConta') return; h += '<a href="' + (l.k === 'verOutras' ? '#ef-aberturas' : (l.k === 'entrarConta' || l.k === 'entrarPlano') ? hrefLogin() : 'Carteira.dc.html') + '" class="linkbtn cf-acao__secundario" data-ef-link="' + l.k + '">' + esc(l.t) + '</a>'; });
    if (v.code === 'closed' && S.R.saleSummary.matchDay) h += '<a href="Carteira.dc.html" class="linkbtn cf-acao__secundario">' + T.verIngresso + '</a>';
    return h;
  }
  function htmlColA(v) { // resposta e contador (juntos são a resposta), e a nota de preço
    var preco = v.code === 'scheduled' && precoMin(S.M) ? '<p class="cf-resposta__apoio ef-preco-nota">Preços na abertura da venda.</p>' : '';
    return (v.contador && v.contador.ehTitulo ? '' : htmlResposta(v)) + htmlContador(v) + preco;
  }

  /* botão principal: um nó só, que nunca troca de lugar nem perde o foco (aria-disabled, nunca disabled) */
  /* «Quero ir», «Compartilhar» e «Quem vai»: o MESMO cartão da Evento (classes qvai-*, .bs, ícones animados quero-ir e compartilhar; texto e avatares iguais) */
  function htmlQuero() { return '<button type="button" class="bs" data-ef="quero" aria-pressed="false">' + lottie('btn-ic-heart', 'quero-ir') + T.queroIr + '</button>'; }
  function av(nome, sigla, img) { return '<span class="uui-avatar uui-avatar--md' + (nome === 'Você' ? ' uui-avatar--voce' : '') + '" role="img" aria-label="' + nome + '"><span class="uui-avatar__content">' + sigla + (img ? '<img src="./assets/pessoas/' + img + '.jpg" alt="" width="160" height="160" loading="lazy">' : '') + '</span></span>'; }
  function quemVaiConteudo(on) {
    var grupo = on
      ? '<span class="uui-avatar-group" role="group" aria-label="Torcedores que vão: Você, Ju, Pedro e mais 3">' + av('Você', 'PE') + av('Ju', 'JU', 'ju') + av('Pedro', 'PD', 'pedro') + av('Mais 3 torcedores', '+3') + '</span>'
      : '<span class="uui-avatar-group" role="group" aria-label="Torcedores que vão: Ju, Pedro, Lari e mais 2">' + av('Ju', 'JU', 'ju') + av('Pedro', 'PD', 'pedro') + av('Lari', 'LA', 'lari') + av('Mais 2 torcedores', '+2') + '</span>';
    return grupo + '<div class="qvai-text"><span class="qvai-title" aria-live="polite">' + (on ? 'Você, Ju, Pedro e mais 3 torcedores vão' : 'Ju, Pedro, Lari e mais 2 torcedores vão') + '</span><span class="qvai-sub">' + (on ? '1.249' : '1.248') + ' ' + T.torcedores + ' marcaram “Quero ir”</span></div>';
  }
  function htmlQuemVai() {
    return '<section aria-labelledby="ef-quemvai"><div class="over" id="ef-quemvai" style="margin-bottom: 12px">' + T.quemVaiJogo + '</div><div class="card qvai-card"><div class="qvai-who" data-ef="quemvai">' + quemVaiConteudo(!!S.quero[S.M.id]) + '</div>' +
      '<div class="qvai-actions">' + htmlQuero() + '<button type="button" class="bs bs-ink" data-ef="compartilhar" data-share="">' + lottie('btn-ic-share', 'compartilhar') + ' ' + T.chamar + '</button></div></div></section>';
  }
  function atualizarQuero(animar) { // em lugar, sem refazer os botões: o coração e o compartilhar não perdem a animação que está tocando
    if (!raiz) return;
    var on = !!S.quero[S.M.id];
    raiz.querySelectorAll('[data-ef="quero"]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var txt = 'Vamos ao jogo? ' + S.M.title + ', ' + quandoBarra(S.M.kickoff) + ', ' + S.M.venue.name + '.';
    raiz.querySelectorAll('[data-ef="compartilhar"]').forEach(function (b) { b.setAttribute('data-share', txt); });
    var who = raiz.querySelector('[data-ef="quemvai"]'), h = quemVaiConteudo(on);
    if (who && who.getAttribute('data-on') !== String(on)) { var primeira = who.getAttribute('data-on') === null; who.innerHTML = h; who.setAttribute('data-on', String(on)); if (animar && !primeira) entrada(who); }
  }

  function criarBotao() {
    var b = document.createElement('button'); b.type = 'button'; b.id = 'ef-botao'; b.setAttribute('data-ef', 'botao');
    b.innerHTML = '<span class="cf-aviso__ic" data-k="botao-ic"></span><span data-cf="aviso-rotulo" data-k="botao-rot"></span>';
    S.btn = b; return b;
  }
  /* os MESMOS botões do cartão de compra da Evento: mesma classe (.bp, .bp-lg, .bp-ink), mesmos ícones animados (Iconly Motion), mesmo aviso (lembretes.js: toast, folha de e-mail, desfazer) */
  var LOGO_ING = '<img class="ef-marca" src="./assets/5e6864b6ac2cc4ced2d84c5a16a3ae48.svg" alt="" aria-hidden="true">';
  function lottie(cls, arq) { return '<span class="btn-ic ' + cls + '" aria-hidden="true" data-lottie="./assets/icones/' + arq + '.json" data-repouso="0" data-loop="0"></span>'; }
  function iconeAcao(acao) {
    if (acao === 'notify_me') return lottie('btn-ic-bell', 'avisar');
    if (acao === 'join_queue') return lottie('btn-ic-queue', 'fila');
    if (acao === 'see_dates' || acao === 'see_next_home_game' || acao === 'see_next_home_games') return lottie('btn-ic-next', 'proximas-datas');
    if (acao === 'see_refund' || acao === 'see_options') return lottie('btn-ic-refund', 'reembolso');
    if (acao === 'retry' || acao === 'see_changes') return '';
    return LOGO_ING;
  }
  function classeAcao(acao) { return /^(choose_sector|buy_members|buy_visitor|buy_accessibility)$/.test(acao) ? 'bp bp-lg' : 'bp bp-lg bp-ink'; }
  function marcarLembrete(b, v, zero) { // o clique é delegado por lembretes.js (data-lembrete-id)
    var L = window.IngresseLembretes, it = v.acao === 'notify_me' && !zero && L ? lembreteItem() : null;
    if (it) { L.registrar(it); b.setAttribute('data-lembrete-id', it.id); b.setAttribute('data-track-lembrete', 'alternar'); } else { b.removeAttribute('data-lembrete-id'); b.removeAttribute('data-track-lembrete'); }
  }
  function ajustarBotao(v) {
    var b = S.btn || criarBotao(), notificar = v.acao === 'notify_me', zero = !!S.virada && S.virada.fase === 'abrindo';
    var ativo = notificar && S.subscribed && !zero;
    b.className = classeAcao(v.acao) + (notificar ? ' cf-aviso' : '');
    b.setAttribute('data-acao', v.acao);
    if (notificar) b.setAttribute('aria-pressed', ativo ? 'true' : 'false'); else b.removeAttribute('aria-pressed');
    marcarLembrete(b, v, zero);
    if (zero) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-busy', 'true'); } else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-busy'); }
    var ic = b.querySelector('[data-k="botao-ic"]'), rot = b.querySelector('[data-k="botao-rot"]');
    if (ic.getAttribute('data-ic') !== v.acao) { ic.innerHTML = iconeAcao(v.acao); ic.setAttribute('data-ic', v.acao); }
    ic.hidden = !ic.innerHTML;
    return rot;
  }
  /** Rótulo do botão da barra do celular: «Ver próximo jogo em casa» (24 caracteres) passa da borda em 390 px ao lado da data; na barra vale a forma curta (a coluna de compra mantém a do guia). */
  function rotuloBarra(v) { return /^see_next_home_games?$/.test(v.acao) ? 'Ver próximo jogo' : rotuloFinal(v); }
  function rotuloFinal(v) { return v.acao === 'notify_me' && S.subscribed && !(S.virada && S.virada.fase === 'abrindo') ? T.ativado : v.rotuloBotao; }

  /* ------------------------------------------------------------------ montagem do DOM */
  var raiz = null, elLocal = null, elCab = null, elCol = null, elA = null, elB = null, elC = null, elMain = null, elBarra = null, elTopo = null, anuncio = null, painel = null;

  function htmlMain(v) {
    var M = S.M, h = '';
    var c = M.competition || {};
    var fatos = [];
    fatos.push([T.fCampeonato, '<strong>' + esc(c.name || '') + '</strong>' + (c.season ? ' · temporada ' + esc(c.season) : '')]);
    if (M.doorsAt) fatos.push([T.fPortoes, 'Abrem ' + esc(aHora(M.doorsAt)) + ' · fim previsto ' + esc(aHora(M.endsAt)) + ' (' + esc(tzRotulo()) + ')']);
    if (M.clientSide === 'away') fatos.push([T.fVisitante, (M.visitorSector && M.visitorSector.gate ? '<strong>' + esc(M.visitorSector.gate) + '</strong> · ' : '') + 'Os ingressos para a torcida visitante são limitados.']);
    h += htmlQuemVai();
    h += '<section aria-labelledby="ef-sobre"><div class="over" id="ef-sobre" style="margin-bottom: 12px">' + T.sobre + '</div><div class="card" style="padding: 8px 24px"><dl class="facts">' +
      fatos.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + f[1] + '</dd></div>'; }).join('') + '</dl></div></section>';
    if (M.sectors && M.sectors.length && ['on_sale', 'sold_out'].indexOf(v.code) >= 0) {
      h += '<section aria-labelledby="ef-setores"><div class="over" id="ef-setores" style="margin-bottom: 12px">' + T.setores + '</div><div class="card" style="padding: 8px 24px"><dl class="facts">' +
        M.sectors.map(function (s) { return '<div><dt>' + esc(s.name) + '</dt><dd><strong>' + esc(brl(s.totalCents)) + '</strong></dd></div>'; }).join('') + '</dl></div><p class="cf-resposta__apoio ef-nota">' + T.precoNota + '</p></section>';
    }
    return h;
  }
  /* o mapa embutido (a exceção de terceiros do projeto) é o MESMO componente do Evento e do Local (mapa-embed.mjs): `src` direto, sem esperar, para o auditor e o navegador o tratarem igual */
  function armarMapa() { /* nada a armar: o iframe já nasce com `src` */ }
  function htmlLocal(M) { // o mapa e a arte do estádio: montados uma vez por estádio (o iframe não recarrega a cada troca de estado)
    var h = '';
    var ph = M.venue.photo, g = M.venue.geo || {};
    h += '<section id="local" aria-labelledby="ef-local"><div class="over" id="ef-local" style="margin-bottom: 12px">' + T.local + '</div><div class="card" style="display: flex; flex-wrap: wrap">' +
      '<div class="mapa-cinza"><iframe class="mapa-cinza__frame" src="https://maps.google.com/maps?ll=' + g.lat + ',' + g.lon + '&z=13&hl=pt-BR&output=embed" title="Mapa: ' + esc(M.venue.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' +
      '<svg class="mapa-cinza__pin" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-5.6 7-12a7 7 0 1 0-14 0c0 6.4 7 12 7 12Z" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>' +
      '<a class="bs mapa-cinza__abrir" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(M.venue.name + ' ' + M.venue.city) + '" target="_blank" rel="noopener" aria-label="Abrir ' + esc(M.venue.name) + ' no mapa">Abrir no mapa ' + ico(IC.ext, 'ico-14') + '</a></div>' +
      '<div class="loc-info" style="flex: 1 1 240px">' + (ph ? '<div class="loc-foto"><img src="' + esc(ph.src) + '" srcset="' + esc(ph.srcSm) + ' 680w, ' + esc(ph.src) + ' 1280w" sizes="(max-width: 640px) 100vw, 300px" loading="lazy" decoding="async" alt="' + esc(ph.alt) + '"></div>' : '') +
      '<div style="padding: 24px"><div style="font-size: 18px; font-weight: 700">' + esc(M.venue.name) + '</div><div style="font-size: 14px; color: var(--muted); margin: 4px 0 0">' + esc(M.venue.city) + ', ' + esc(M.venue.state) + '</div></div></div></div></section>';
    return h;
  }
  function htmlTopo(v) { // aviso em linha: ciclo de vida e janela alterada (no registro «Data ou horário alterado» que o Evento já tem)
    var h = '', M = S.M;
    function alerta(cls, d, titulo, texto) { return '<div class="uui-alert uui-alert--' + cls + ' ev-aviso" role="status"><span class="uui-alert__icon">' + ico(d) + '</span><div class="uui-alert__body">' + (titulo ? '<p class="uui-alert__title">' + esc(titulo) + '</p>' : '') + '<p class="uui-alert__text">' + esc(texto) + '</p></div></div>'; }
    if (v.code === 'cancelled') h += alerta('error', IC.alert, M.title + ' foi cancelado', 'Quem comprou recebe o reembolso na forma de pagamento original, em até 10 dias úteis, sem precisar pedir.');
    if (v.code === 'postponed') h += alerta('warning', IC.clockw, 'O jogo foi adiado', M.__novaDataLocal ? 'Nova data: ' + extenso(M.__novaDataLocal) + ' (' + tzRotulo() + '). Seu ingresso continua válido.' : 'A nova data ainda não foi definida.');
    (S.R.saleSummary.notices || []).forEach(function (n) {
      if (n.code !== 'sales_window_changed' || v.code === 'cancelled' || v.code === 'postponed') return;
      var w = ondaPorId(n.waveId); if (!w || !w.opensAt) return;
      var depois = n.kind === 'later', sub = suj(w);
      h += alerta('neutral', IC.info, '', sub + ' abre ' + (depois ? 'depois' : 'antes') + ' do previsto: agora é ' + extenso(w.opensAt) + ' (' + tzRotulo() + '), e não ' + (diaLocal(Date.parse(n.previousOpensAt)) === diaLocal(Date.parse(w.opensAt)) ? aHora(n.previousOpensAt) : quandoTitulo(n.previousOpensAt)) + '. Você não precisa fazer nada.');
    });
    function suj(w) { return sujeitoDa(w).l; }
    return h;
  }

  function htmlBarra(v) { // a mesma barra da Evento: «dia · estádio» e a frase do estado à esquerda, o botão do cartão (mesma classe, mesmo ícone) à direita
    if (v.code === 'ended') return '';
    var M = S.M, notificar = v.acao === 'notify_me', zero = !!S.virada && S.virada.fase === 'abrindo', ativo = notificar && S.subscribed && !zero;
    var compra = /^(choose_sector|buy_members|buy_visitor|buy_accessibility)$/.test(v.acao), min = precoMin(M);
    var frase = compra && min != null ? 'a partir de ' + brl(min) : v.barra;
    var it = notificar && !zero && window.IngresseLembretes ? lembreteItem() : null;
    var btn = notificar
      ? '<button type="button" class="bp bp-ink bp-icone" data-ef="barra-acao" data-acao="notify_me" aria-label="' + esc(rotuloFinal(v)) + '" aria-pressed="' + (ativo ? 'true' : 'false') + '"' + (it ? ' data-lembrete-id="' + esc(it.id) + '" data-track-lembrete="alternar"' : '') + (zero ? ' aria-disabled="true" aria-busy="true"' : '') + '>' + iconeAcao('notify_me') + '</button>' // só o sino (decisão do Wander)
      : '<button type="button" class="' + classeAcao(v.acao).replace(' bp-lg', '') + '" data-ef="barra-acao" data-acao="' + esc(v.acao) + '">' + iconeAcao(v.acao) + esc(rotuloBarra(v)) + '</button>';
    return '<div class="cf-barra__bloco" aria-hidden="true"><div class="cf-barra__dia">' + esc(diaCurto(M.kickoff)) + ' · ' + esc(M.venue.name) + '</div><div class="cf-barra__frase" data-k="barra-t">' + esc(frase) + '</div></div>' + btn;
  }

  function montarRaiz() {
    var wrap = document.querySelector('#dc-root .hdr'); wrap = wrap && wrap.parentElement; if (!wrap) return false;
    wrap.classList.add('ef-wrap');
    if (raiz && raiz.isConnected) return true;
    raiz = document.createElement('div'); raiz.id = 'ef-root'; raiz.className = 'ef-root';
    raiz.innerHTML = '<section class="ef-hero ilha" data-ef="hero"><img class="ef-hero__arte" alt="" aria-hidden="true" data-ef="arte"><div class="ef-hero__veu"></div><div class="ef-hero-in" data-ef="cab"></div></section>' +
      '<div class="ef-in ef-corpo"><div class="ef-topo" data-ef="topo"></div><main class="ef-corpo-main"><div class="ef-body"><aside class="ef-aside" aria-label="Compra"><div class="card ef-compra" data-ef="col"><div class="over ef-compra__rot">' + T.compra + '</div><div class="cf-venda" data-ef="coluna"><div class="ef-col-a" data-ef="col-a"></div><div class="cf-acao" data-ef="acao"><div class="ef-col-b" data-ef="col-b"></div></div><div class="ef-col-c" data-ef="col-c"></div><ul class="trust" aria-label="Garantias da compra"><li>Preço final mostrado antes do pagamento, sem surpresas</li><li>' + T.garantiaIngresso + '</li><li>Revenda Oficial pela Ingresse, se você não puder ir</li></ul></div></div></aside><div class="ef-main" data-ef="main"><div class="ef-main-a" data-ef="main-a"></div><div data-ef="main-l"></div><p class="ef-mais"><a class="linkbtn" href="Categoria.dc.html?c=futebol">' + T.maisJogos + '</a></p></div></div></main></div>' +
      '<div class="mbar cf-barra" data-ef="barra"></div>' +
      '<p class="cf-vh" role="status" aria-live="polite" id="ef-anuncio"></p>';
    wrap.appendChild(raiz);
    elCab = raiz.querySelector('[data-ef="cab"]'); elCol = raiz.querySelector('[data-ef="col"]'); elA = raiz.querySelector('[data-ef="col-a"]'); elB = raiz.querySelector('[data-ef="col-b"]'); elC = raiz.querySelector('[data-ef="col-c"]'); (S.btn || criarBotao()); elB.parentNode.insertBefore(S.btn, elB); elMain = raiz.querySelector('[data-ef="main-a"]'); elLocal = raiz.querySelector('[data-ef="main-l"]'); elBarra = raiz.querySelector('[data-ef="barra"]'); elTopo = raiz.querySelector('[data-ef="topo"]'); anuncio = raiz.querySelector('#ef-anuncio');
    return true;
  }

  /* troca animada de um nó com chave (o gesto do Total: o antigo vira fantasma e sai 8 px para cima em 160 ms; o novo entra de baixo em 280 ms; só opacity e transform).
     O nó novo já está no lugar; o fantasma é uma cópia do conteúdo antigo na mesma posição. Movimento reduzido ou aba oculta: nada é criado. */
  function fantasma(no, htmlAntigo, atraso) {
    var t = Tm(); if (!t.fast || document.hidden || !no.animate) return;
    var op = no.offsetParent || raiz, fant = no.cloneNode(false);
    fant.innerHTML = htmlAntigo; fant.removeAttribute('data-k'); fant.removeAttribute('id'); fant.setAttribute('aria-hidden', 'true'); fant.classList.add('ef-fantasma');
    fant.style.cssText = 'position:absolute;pointer-events:none;margin:0;top:' + no.offsetTop + 'px;left:' + no.offsetLeft + 'px;width:' + no.offsetWidth + 'px';
    op.appendChild(fant);
    var a = fant.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-' + t.dist + 'px)' }], { duration: t.fast, delay: atraso || 0, easing: t.exit, fill: 'both' });
    a.finished.then(function () { fant.remove(); }, function () { fant.remove(); });
    no.animate([{ opacity: 0, transform: 'translateY(' + t.dist + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: t.base, delay: t.fast + (atraso || 0), easing: t.enter, fill: 'backwards' });
  }
  function entrada(no, atraso) {
    var t = Tm(); if (!t.fast || document.hidden || !no.animate) return;
    no.animate([{ opacity: 0, transform: 'translateY(' + t.dist + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: t.base, delay: atraso || 0, easing: t.enter, fill: 'backwards' });
  }
  /* ---- o que muda de lugar e o que aparece ou some (painel de e-mail, avisos, lista de aberturas, blocos do jogo).
     Cada bloco novo entra (8 px de baixo, 280 ms); cada bloco que sai vira um fantasma e se despede (8 px para cima, 160 ms); o que continua mas
     mudou de posição desliza do lugar antigo ao novo (FLIP, só transform); o cartão da compra cresce ou encolhe até a altura nova (alturaSuave).
     Só opacity e transform nos blocos; durações e curvas dos tokens motion.*; movimento reduzido ou aba oculta: nada é criado. */
  function semIds(g) { g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); }); g.querySelectorAll('a,button,input,summary').forEach(function (x) { x.setAttribute('tabindex', '-1'); }); g.querySelectorAll('iframe').forEach(function (x) { x.remove(); }); g.setAttribute('aria-hidden', 'true'); g.classList.add('ef-fantasma'); }
  function fantasmaDe(no, rect, ref, atraso) { // cópia do nó que saiu, na posição antiga, que se despede e some
    var t = Tm(); if (!t.fast || !ref || !ref.isConnected) return;
    var rr = ref.getBoundingClientRect(), g = no.cloneNode(true); semIds(g);
    g.style.cssText = 'position:absolute;pointer-events:none;margin:0;top:' + (rect.top - rr.top - ref.clientTop) + 'px;left:' + (rect.left - rr.left - ref.clientLeft) + 'px;width:' + rect.width + 'px';
    ref.appendChild(g);
    var a = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-' + t.dist + 'px)' }], { duration: t.fast, delay: atraso || 0, easing: t.exit, fill: 'both' });
    a.finished.then(function () { g.remove(); }, function () { g.remove(); });
  }
  function blocos(cont) { // os blocos de uma coluna: filhos diretos; seção e lista com mais de um filho se abrem
    var out = [];
    (function ir(n) { Array.prototype.forEach.call(n.children, function (c) { if (/^(SECTION|UL|OL)$/.test(c.tagName) && c.children.length > 1) ir(c); else out.push(c); }); })(cont);
    return out;
  }
  function filhosDiff(cont, html) {
    var t = Tm();
    var velhos = blocos(cont).map(function (n) { return { n: n, sig: n.outerHTML, r: n.getBoundingClientRect(), ref: n.offsetParent }; });
    cont.innerHTML = html;
    var pool = {};
    velhos.forEach(function (v) { (pool[v.sig] = pool[v.sig] || []).push(v); });
    blocos(cont).forEach(function (n) {
      var l = pool[n.outerHTML] && pool[n.outerHTML].shift();
      if (!l) { entrada(n, Math.round(t.base * 0.4)); return; } // bloco novo: entra depois que o resto começou a se mexer (o que desliza já saiu de cima dele)
      var dy = l.r.top - n.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) n.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: t.base, easing: t.move });
    });
    Object.keys(pool).forEach(function (k) { pool[k].forEach(function (v) { fantasmaDe(v.n, v.r, v.ref); }); });
  }
  function alturaSuave(el, h0) { // o cartão da compra: da altura de antes à de agora (o .card já esconde o que passa)
    var t = Tm(); if (!el || h0 == null || !t.base || document.hidden || !el.animate) return;
    var h1 = el.offsetHeight; if (Math.abs(h1 - h0) < 2) return;
    el.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: t.base, easing: t.move });
  }
  function fantasmasDaPagina() { // trocar de jogo: o hero e o corpo antigos viram fantasmas (copiados antes de montar o novo)
    var t = Tm(); if (!t.fast || document.hidden || !raiz) return [];
    return [raiz.querySelector('.ef-hero-in'), raiz.querySelector('.ef-corpo')].filter(Boolean).map(function (el) { return { n: el, r: el.getBoundingClientRect(), ref: el.offsetParent || raiz, g: el.cloneNode(true) }; });
  }
  function despedirPagina(fs) {
    var t = Tm(); if (!t.fast) return;
    fs.forEach(function (f) {
      var rr = f.ref.getBoundingClientRect(); semIds(f.g);
      f.g.style.cssText = 'position:absolute;pointer-events:none;margin:0;top:' + (f.r.top - rr.top - f.ref.clientTop) + 'px;left:' + (f.r.left - rr.left - f.ref.clientLeft) + 'px;width:' + f.r.width + 'px';
      f.ref.appendChild(f.g);
      var a = f.g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-' + t.dist + 'px)' }], { duration: t.fast, easing: t.exit, fill: 'both' });
      a.finished.then(function () { f.g.remove(); }, function () { f.g.remove(); });
    });
  }
  /** Troca o conteúdo de `cont` pelo `html` novo, animando os nós com chave (data-k) cujo conteúdo mudou. `grupoB` = chaves do segundo grupo (40 ms depois).
      `porBlocos`: sem chaves; entram os blocos novos, saem os que sumiram, deslizam os que mudaram de lugar. */
  function morph(cont, html, animar, grupoB, porBlocos) {
    if (animar && porBlocos && Tm().base && !document.hidden) { filhosDiff(cont, html); return; }
    var antigos = {};
    if (animar) cont.querySelectorAll('[data-k]').forEach(function (n) { antigos[n.getAttribute('data-k')] = n.innerHTML; });
    cont.innerHTML = html;
    if (!animar) return;
    var t = Tm();
    cont.querySelectorAll('[data-k]').forEach(function (n) {
      var k = n.getAttribute('data-k'), b = grupoB && grupoB.indexOf(k) >= 0 ? t.stagger : 0;
      if (!(k in antigos)) { if (k.indexOf('barra') < 0) entrada(n, b); return; }
      if (antigos[k] !== n.innerHTML) fantasma(n, antigos[k], b);
    });
  }

  function renderTudo(animar) {
    if (!montarRaiz()) return;
    var v = vista(); S.v = v;
    var rot = null;
    // hero e cabeçalho
    var ph = S.M.venue.photo, arte = raiz.querySelector('[data-ef="arte"]');
    var h0 = animar && elCol ? elCol.offsetHeight : null; // altura do cartão da compra antes de montar o estado novo
    if (arte && ph && arte.getAttribute('data-src') !== ph.src) {
      var velha = arte.getAttribute('data-src') && !document.hidden && Tm().slow ? arte.cloneNode(false) : null; // a arte do estádio antigo fica por baixo até a nova aparecer
      if (velha) { velha.removeAttribute('data-ef'); arte.parentNode.insertBefore(velha, arte); }
      arte.setAttribute('data-src', ph.src); arte.src = ph.src; arte.srcset = ph.srcSm + ' 680w, ' + ph.src + ' 1280w, ' + ph.srcLg + ' 1920w'; arte.sizes = '100vw';
      if (velha) {
        var tk = Tm(), solta = function () { velha.remove(); };
        var entra = function () { if (!arte.animate) { solta(); return; } var an = arte.animate([{ opacity: 0 }, { opacity: getComputedStyle(arte).opacity }], { duration: tk.slow, easing: tk.enter }); an.finished.then(solta, solta); };
        if (arte.complete && arte.naturalWidth) entra(); else { arte.addEventListener('load', entra, { once: true }); arte.addEventListener('error', solta, { once: true }); setTimeout(solta, 4000); }
      }
    }
    morph(elCab, htmlCabecalho(v), animar);
    morph(elTopo, htmlTopo(v), animar, null, true);
    var sm = [S.M.id, v.code, S.M.__alt, S.ov.ciclo, S.ov.vendas].join('|');
    if (S.sigMain !== sm) { S.sigMain = sm; morph(elMain, htmlMain(v), animar, null, true); }
    atualizarQuero(false);
    if (S.sigLocal !== S.M.venue.id + '|' + S.M.venue.name) { S.sigLocal = S.M.venue.id + '|' + S.M.venue.name; elLocal.innerHTML = htmlLocal(S.M); armarMapa(); }
    // coluna
    rot = ajustarBotao(v);
    var rotAntigo = rot.textContent;
    morph(elA, htmlColA(v), animar);
    morph(elB, htmlAcao(v), animar, null, true);
    morph(elC, htmlAberturas(v), animar, null, true);
    rot = S.btn.querySelector('[data-k="botao-rot"]');
    var novoRot = rotuloFinal(v);
    if (rot.textContent !== novoRot) {
      var antes = rot.textContent; rot.textContent = novoRot;
      if (animar && antes) fantasma(rot, esc(antes), Tm().stagger);
    }
    if (animar) alturaSuave(elCol, h0);
    // barra
    elBarra.classList.toggle('ef-barra--sem', v.code === 'ended');
    morph(elBarra, htmlBarra(v), false);
    S.sig = assinatura(v); S.un = unidades(v);
    document.title = S.M.title + ' — ' + ((S.M.competition || {}).name || 'Futebol') + ', ingressos e informações | Ingresse';
    migalhas();
  }
  function assinatura(v) { return [v.code, v.acao, v.selo.texto, v.contador ? v.contador.faixa + v.contador.wave.id : '-', S.R.windows.map(function (w) { return w.id + w.state; }).join(','), S.subscribed, S.viewer.kind, S.virada ? S.virada.fase : ''].join('|'); }
  function unidades(v) { return v.contador ? v.contador.partes.map(function (p) { return p.un; }).join(',') : ''; }
  function migalhas() {
    var c = document.querySelector('.ef-crumbs'); if (!c) return;
    var h = '<span class="crumb-mid"><a href="Main.dc.html" style="color: var(--muted)">Início</a> / </span><a href="Categoria.dc.html?c=futebol" class="crumb-back" style="color: var(--muted)">Futebol</a><span class="crumb-mid"> / <span style="color: var(--ink)" aria-current="page">' + esc(S.M.title) + '</span></span>';
    if (c.innerHTML !== h) c.innerHTML = h;
  }

  /* ------------------------------------------------------------------ contador por segundo, virada e conferência */
  function atualizarContador() {
    var v = S.v; if (!v || !v.contador || S.virada) return;
    var C = v.contador, agora = S.rel.agora(), ms = Date.parse(S.R.nextOpening.at) - agora;
    var f = Cont.faixa(ms, S.M.saleDisplay && S.M.saleDisplay.countdownFromHours);
    var ps = Cont.partes(ms, f), un = ps.map(function (p) { return p.un; }).join(',');
    C.ms = ms;
    if (f !== C.faixa) { renderTudo(true); return; } // mudou de faixa (horas, minutos, segundos): o gesto do Total, uma vez
    if (un !== S.un) { var vv = raiz.querySelector('[data-k="cont-valor"]'); if (vv) { C.partes = ps; vv.innerHTML = ps.map(function (p) { return '<span class="cf-contador__parte"><span class="cf-contador__num" data-cf="n">' + p.n + '</span><span class="cf-contador__un" data-cf="un">' + p.un + '</span></span>'; }).join(''); S.un = un; } }
    else {
      var nums = raiz.querySelectorAll('.cf-contador [data-cf="n"]');
      ps.forEach(function (p, i) { if (nums[i] && nums[i].textContent !== String(p.n)) nums[i].textContent = String(p.n); }); // minuto ou segundo que passa: troca direta, sem animar
    }
    var bt = raiz.querySelector('[data-k="barra-t"]');
    var suj = C.suj; if (bt) { var txt = Cont.barra(suj.c, ms, f, quandoBarra(C.local)); if (bt.textContent !== txt) bt.textContent = txt; }
  }

  function opcoesConferencia(waveId) { return { waveId: waveId, atrasoMs: S.atraso.atrasoMs, falhar: S.atraso.falhar }; }
  function anunciar(txt) { if (!anuncio) return; anuncio.textContent = ''; setTimeout(function () { anuncio.textContent = txt; }, 30); }

  function iniciarVirada() {
    var no = S.R.nextOpening; if (!no || S.virada) return;
    var vi = S.virada = { waveId: no.waveId, fase: 'abrindo', sujeito: sujeitoDa(ondaPorId(no.waveId)), poll: 0, hold: 0 };
    renderTudo(true); // «Abrindo…» no contador e no botão (aria-disabled, foco intacto)
    var p = ONDAS.conferirEstado(S.M, function () { return S.rel.agora(); }, S.viewer, opcoesConferencia(no.waveId));
    ONDAS.aguardarConfirmacao(p, 3000).then(function (r) {
      if (S.virada !== vi) return;
      if (r.confirmed) { confirmar(r.estado); return; }
      vi.fase = 'conferindo'; renderTudo(true); // sem confirmação em 3 s: o botão volta ao aviso e o texto diz que ainda confere (sem erro, sem recarregar)
      if (r.late) r.late.then(function (est) { if (S.virada === vi) confirmar(est); }, function () {});
      // confirmação tardia: continua conferindo a cada 5 s por até 2 minutos e vira com o mesmo gesto, sem recarregar
      var n = 0;
      vi.poll = setInterval(function () {
        if (S.virada !== vi || ++n > 24) { clearInterval(vi.poll); return; }
        ONDAS.conferirEstado(S.M, function () { return S.rel.agora(); }, S.viewer, opcoesConferencia(vi.waveId)).then(function (est) { if (S.virada === vi && est.opened) confirmar(est); }, function () {});
      }, 5000);
    });
  }
  function confirmar(estado) {
    var vi = S.virada; if (!vi) return;
    if (vi.poll) clearInterval(vi.poll);
    var suj = vi.sujeito, t = Tm();
    S.R = estado; S.ultimaReval = Date.now();
    vi.fase = 'confirmado';
    // «A venda geral abriu.» (uma vez, polite, no fim do gesto de 480 ms)
    var anun = { 'Sua venda': 'Sua venda abriu.', 'A venda geral': 'A venda geral abriu.', 'A venda para a torcida visitante': 'A venda para a torcida visitante abriu.', 'A venda de acessibilidade': 'A venda de acessibilidade abriu.' }[suj.l] || 'A venda para sócios abriu.';
    S.virada = null; // renderTudo precisa ver o estado novo
    if (elA) elA.style.minHeight = elA.offsetHeight + 'px'; // o botão não muda de lugar: a coluna guarda a altura até o contador passar à próxima venda
    S.subscribed = lembreteAtivo();
    renderTudo(true);
    setTimeout(function () { anunciar(anun); }, t.fast + t.base + t.stagger);
    // 4 s depois da virada, o contador passa à próxima venda (a regra é um contador por página): a caixa só reaparece se a próxima já estiver abaixo de 24 h
    S.espera4 = true; clearTimeout(S.t4);
    S.t4 = setTimeout(function () { S.espera4 = false; if (elA) elA.style.minHeight = ''; if (!S.virada) renderTudo(true); }, 4000);
    atualizarPainel();
  }

  function tick() {
    var agoraReal = Date.now(), gap = S.ultimoTick ? agoraReal - S.ultimoTick : 0; S.ultimoTick = agoraReal;
    if (!S.R || !raiz) return;
    if (gap > 2500) { recalcular(false); return; } // voltou do segundo plano ou do repouso: o estado atual direto, sem animar a virada perdida
    if (agoraReal - S.ultimaReval > 300000) { recalcular(true); return; } // revalidateAfterSeconds (300)
    if (S.virada) return;
    var no = S.R.nextOpening;
    if (!no || !no.at) return;
    var ms = Date.parse(no.at) - S.rel.agora();
    if (ms <= 0 && ['scheduled', 'on_sale', 'members_only'].indexOf(S.R.saleSummary.code) >= 0) {
      if (document.hidden) { recalcular(false); return; }
      iniciarVirada(); return;
    }
    atualizarContador();
  }

  /* ------------------------------------------------------------------ aviso: lembretes.js (toast, folha de e-mail, desfazer), o mesmo da Coleção e da Evento; o clique é delegado por data-lembrete-id */
  /* A ponte para a jornada de compra (Ingressos.dc.html?jogo=): o perfil vem de quem olha a página (sócio → socio; anônima ou logada → geral; o cliente joga fora → visitante;
     um perfil já presente na URL vence), mais plano, ciclo e, quando é uma data, o relógio (DE-43, 2.1). */
  function hrefCompra(acao) {
    var M = S.M, sv = S.viewer || {};
    var perfil = qs.get('perfil') || (acao === 'buy_visitor' || M.clientSide === 'away' ? 'visitante' : (sv.kind === 'member' ? 'socio' : 'geral'));
    var u = 'Ingressos.dc.html?jogo=' + encodeURIComponent(M.id) + '&perfil=' + perfil;
    var plano = qs.get('plano') || (sv.plan ? chavePlano(sv.plan) : '');
    if (perfil === 'socio' && plano) u += '&plano=' + encodeURIComponent(plano);
    var ag = qs.get('agora'); if (ag && ag !== 'agora' && !isNaN(Date.parse(ag))) u += '&agora=' + encodeURIComponent(ag);
    var ci = qs.get('ciclo'); if (['adiado', 'cancelado', 'estadio', 'portoes'].indexOf(ci) >= 0) u += '&ciclo=' + ci;
    return u;
  }
  function hrefLogin() { return 'Login.dc.html?marca=ingresse&volta=' + encodeURIComponent('Evento.dc.html' + location.search); }
  function acaoDoBotao() {
    var v = S.v, a = v.acao;
    if (S.virada && S.virada.fase === 'abrindo') return; // aria-disabled: não faz nada
    if (a === 'notify_me') return; // o aviso é do lembretes.js (delegado por data-lembrete-id)
    if (a === 'see_dates') { var al = document.getElementById('ef-aberturas'); if (al) { S.outras = true; renderTudo(true); al.scrollIntoView({ behavior: reduzido() ? 'auto' : 'smooth', block: 'start' }); } return; }
    if (a === 'retry') { S.ov.vendas = ''; recalcular(true); return; }
    if (a === 'see_refund' || a === 'see_options' || a === 'see_changes') { var topo = raiz.querySelector('.ef-topo .uui-alert'); (topo || elMain).scrollIntoView({ behavior: reduzido() ? 'auto' : 'smooth', block: 'center' }); return; }
    if (a === 'see_next_home_game' || a === 'see_next_home_games') { location.href = 'Categoria.dc.html?c=futebol'; return; }
    if (a === 'join_queue') { if (window.IX && IX.toast) IX.toast('Você está na fila. Se aparecer um ingresso, você fica sabendo primeiro.', 'ok'); return; }
    location.href = hrefCompra(a); // escolher setor: abre a jornada de compra DO JOGO (mapa, rosto, dependentes), com o perfil de quem olha a página (DE-43)
  }

  function aoClicar(e) {
    var t = e.target; if (!t.closest || !raiz) return;
    var b = t.closest('[data-ef="botao"]');
    if (b) { e.preventDefault(); acaoDoBotao(); return; }
    var bc = t.closest('[data-ef="barra-acao"]');
    if (bc) { e.preventDefault(); acaoDoBotao(); return; }
    var qi = t.closest('[data-ef="quero"]');
    if (qi) { e.preventDefault(); var id = S.M.id; S.quero[id] = !S.quero[id]; atualizarQuero(true); if (window.IX && IX.toast) IX.toast(S.quero[id] ? 'Você entrou na lista de quem vai.' : 'Você saiu da lista de quem vai.', S.quero[id] ? 'ok' : 'info'); return; }
    var og = t.closest('[data-ef="outras"]');
    if (og) { S.outras = og.getAttribute('aria-expanded') !== 'true'; og.setAttribute('aria-expanded', String(S.outras)); var pn = document.getElementById('ef-outras-p'); if (pn) { pn.setAttribute('data-aberto', String(S.outras)); if (S.outras) pn.removeAttribute('inert'); else pn.setAttribute('inert', ''); } return; }
    var lk = t.closest('[data-ef-link]');
    if (lk) {
      var k = lk.getAttribute('data-ef-link');
      if (k === 'verOutras') { e.preventDefault(); S.outras = true; renderTudo(true); var al2 = document.getElementById('ef-aberturas'); if (al2) al2.scrollIntoView({ behavior: reduzido() ? 'auto' : 'smooth', block: 'start' }); }
      else if (k === 'entrarConta' || k === 'entrarPlano') return; // vai para o Login (volta= a esta página)
      else if (k !== 'comoSocio') return;
      else { e.preventDefault(); if (window.IX && IX.toast) IX.toast(T.paginaIndisponivel, 'info'); } // o login do clube não é desenhado aqui: mesmo aviso de link sem tela (GL-01), sem falar de protótipo
    }
  }
  /* ------------------------------------------------------------------ painel de simulação (a engrenagem; uma só) */
  var JOGOS = [[42, '42 · 7 janelas, 3 planos'], [3001, '3001 · só a geral aberta'], [3002, '3002 · sócios esgotado, geral por abrir'], [3003, '3003 · torcida visitante'], [3004, '3004 · jogo hoje, vendas encerradas'], [3005, '3005 · jogo realizado']];
  function chip(attr, val, rot, on) { return '<button type="button" class="chip chip-sm" ' + attr + '="' + esc(val) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(rot) + '</button>'; }
  function montarPainel() {
    if (painel && painel.isConnected) return;
    var d = document.createElement('details'); d.className = 'proto ef-proto';
    d.innerHTML = '<summary>Protótipo · simulação do jogo</summary><div class="proto-in" role="group" aria-label="Simulação do jogo" data-ef-painel></div>';
    var wrap = document.querySelector('.ef-wrap') || raiz.parentNode; wrap.appendChild(d); painel = d;
    atualizarPainel(true);
  }
  function atualizarPainel(fixo) {
    if (!painel) return;
    var alvo = painel.querySelector('[data-ef-painel]'), M = S.ev.match, a = S.viewer.kind;
    var h = '<div class="over">Jogo</div>' + JOGOS.map(function (j) { return chip('data-ef-jogo', j[0], j[1], j[0] === Number(S.ev.id)); }).join('');
    h += '<div class="over">Quem vê</div>' + chip('data-ef-quem', 'anonima', 'Anônima', a === 'anonymous') + chip('data-ef-quem', 'socio', 'Sócio com plano', a === 'member') + chip('data-ef-quem', 'logada', 'Logada sem plano', a === 'notMember');
    if (a === 'member') h += '<div class="over">Plano do sócio</div>' + planos().map(function (p) { return chip('data-ef-plano', chavePlano(p), p, S.viewer.plan === p); }).join('');
    h += '<div class="over">Relógio</div>' + [['agora', 'Agora'], ['+1m', '+1 min'], ['+1h', '+1 h'], ['+1d', '+1 dia'], ['f5h', 'Faltam 5 h 12 min'], ['f10s', 'Faltam 10 s'], ['zero', 'Zerar'], ['abrir', 'Abrir']].map(function (r) { return chip('data-ef-rel', r[0], r[1], false); }).join('');
    h += '<div class="over">Estado do jogo</div>' + [['', 'Jogo como no dado'], ['adiado', 'Adiado'], ['cancelado', 'Cancelado'], ['estadio', 'Estádio alterado'], ['mandante', 'Mandante alterado'], ['portoes', 'Portões fechados']].map(function (r) { return chip('data-ef-ciclo', r[0], r[1], S.ov.ciclo === r[0]); }).join('');
    h += '<div class="over">Vendas</div>' + [['', 'Vendas como no dado'], ['sem-data', 'Sem data de abertura'], ['acessibilidade', 'Só acessibilidade aberta'], ['esgotado', 'Tudo esgotado'], ['sem-precos', 'Sem preços']].map(function (r) { return chip('data-ef-vendas', r[0], r[1], S.ov.vendas === r[0]); }).join('');
    h += '<div class="over">Confirmação depois do zero</div>' + [['1s', 'Confirma em 1 s'], ['3s', 'Confirma depois de 3 s'], ['sem-resposta', 'Servidor sem resposta']].map(function (r) { return chip('data-ef-conf', r[0], r[1], S.confirma === r[0]); }).join('');
    h += '<p class="ef-proto__nota">Relógio simulado: <b data-ef-hora></b></p>';
    var tmp = document.createElement('div'); tmp.innerHTML = h;
    var velhos = alvo.querySelectorAll('button.chip'), novos = tmp.querySelectorAll('button.chip');
    var semPress = function (b) { return b.outerHTML.replace(/ aria-pressed="[a-z]+"/, ''); };
    var igual = !fixo && velhos.length && velhos.length === novos.length && Array.prototype.every.call(novos, function (n, i) { return semPress(n) === semPress(velhos[i]); });
    if (igual) Array.prototype.forEach.call(novos, function (n, i) { velhos[i].setAttribute('aria-pressed', n.getAttribute('aria-pressed')); }); // só muda o selecionado: o chip troca de cor (transição do componente) e o foco fica
    else {
      var af = document.activeElement, sigFoco = af && alvo.contains(af) && af.matches('button.chip') ? semPress(af) : '';
      alvo.innerHTML = h;
      if (sigFoco) Array.prototype.some.call(alvo.querySelectorAll('button.chip'), function (c) { if (semPress(c) === sigFoco) { c.focus({ preventScroll: true }); return true; } return false; }); // o foco continua no mesmo chip
    }
    horaPainel();
  }
  function horaPainel() { var el = painel && painel.querySelector('[data-ef-hora]'); if (!el || !S.rel) return; el.textContent = diaCurto(new Date(S.rel.agora()).toISOString()) + ', ' + hora(new Date(S.rel.agora()).toISOString()); }
  function gravarUrl() {
    try {
      var u = new URL(location.href), q = u.searchParams;
      q.set('jogo', S.ev.id);
      var qm = { anonymous: 'anonima', member: 'socio', notMember: 'logada' }[S.viewer.kind];
      if (qm !== 'anonima') q.set('quem', qm); else q.delete('quem');
      if (S.viewer.kind === 'member' && S.viewer.plan) q.set('plano', chavePlano(S.viewer.plan)); else q.delete('plano');
      S.ov.ciclo ? q.set('ciclo', S.ov.ciclo) : q.delete('ciclo'); S.ov.vendas ? q.set('vendas', S.ov.vendas) : q.delete('vendas');
      S.confirma !== '1s' ? q.set('confirma', S.confirma) : q.delete('confirma');
      history.replaceState(history.state, '', u);
    } catch (e) {}
  }
  function aplicarConfirma() { S.atraso = S.confirma === '3s' ? { atrasoMs: 3500, falhar: false } : S.confirma === 'sem-resposta' ? { atrasoMs: 300, falhar: true } : { atrasoMs: 1000, falhar: false }; }
  function trocarJogo(id) {
    var ev = S.dados.events.filter(function (e) { return e.id === Number(id); })[0]; if (!ev) return;
    S.ev = ev; S.rel.zerar(); S.outras = false; S.ov = { ciclo: '', vendas: '' };
    if (S.viewer.kind === 'member') S.viewer.plan = S.viewer.plan && planos().indexOf(S.viewer.plan) >= 0 ? S.viewer.plan : planos()[0] || null;
    var fant = fantasmasDaPagina();
    recalcular(false); gravarUrl();
    despedirPagina(fant); entradaPagina(Math.round(Tm().fast * 0.5)); // o jogo antigo se despede enquanto o novo entra
  }
  function aoClicarPainel(e) {
    var t = e.target; if (!t.closest || !painel || !painel.contains(t)) return;
    var c, ms;
    if ((c = t.closest('[data-ef-jogo]'))) { trocarJogo(c.getAttribute('data-ef-jogo')); return; }
    if ((c = t.closest('[data-ef-quem]'))) {
      var q = c.getAttribute('data-ef-quem');
      S.viewer = q === 'socio' ? { kind: 'member', plan: planos()[0] || null, entry: 'club-site' } : q === 'logada' ? { kind: 'notMember', plan: null, entry: 'ingresse-login' } : { kind: 'anonymous', plan: null, entry: null };
      recalcular(true); gravarUrl(); return;
    }
    if ((c = t.closest('[data-ef-plano]'))) { var k = c.getAttribute('data-ef-plano'); S.viewer.plan = planos().filter(function (p) { return chavePlano(p) === k; })[0] || S.viewer.plan; recalcular(true); gravarUrl(); return; }
    if ((c = t.closest('[data-ef-ciclo]'))) { S.ov.ciclo = c.getAttribute('data-ef-ciclo'); recalcular(true); gravarUrl(); return; }
    if ((c = t.closest('[data-ef-vendas]'))) { S.ov.vendas = c.getAttribute('data-ef-vendas'); recalcular(true); gravarUrl(); return; }
    if ((c = t.closest('[data-ef-conf]'))) { S.confirma = c.getAttribute('data-ef-conf'); aplicarConfirma(); gravarUrl(); atualizarPainel(); return; }
    if ((c = t.closest('[data-ef-rel]'))) {
      var r = c.getAttribute('data-ef-rel'), no = S.R && S.R.nextOpening, alvo = no && no.at ? Date.parse(no.at) : null;
      if (r === 'agora') { S.rel.zerar(); recalcular(true); }
      else if (r === '+1m') { S.rel.avancar(60000); recalcular(true); }
      else if (r === '+1h') { S.rel.avancar(3600000); recalcular(true); }
      else if (r === '+1d') { S.rel.avancar(864e5); recalcular(true); }
      else if (alvo != null) {
        if (r === 'f5h') { S.rel.definir(alvo - (5 * 3600 + 12 * 60) * 1000); recalcular(true); }
        else if (r === 'f10s') { S.rel.definir(alvo - 10000); recalcular(true); }
        else if (r === 'zero') { S.virada = limparVirada(); S.rel.definir(alvo); if (!S.v.contador) renderTudo(false); setTimeout(tick, 60); } // o estado do servidor segue «por abrir»: o próximo quadro chega a zero e faz a virada
        else if (r === 'abrir') { S.rel.definir(alvo + 1000); recalcular(true); }
      }
      horaPainel(); return;
    }
  }

  /* ------------------------------------------------------------------ relógio: o MESMO do protótipo (IX.store «relogio», lembretes.js), com a hora do servidor deslocada
     O relógio do protótipo começa em 28/10/2026 10h e vale para a Coleção, o sino e esta página; os jogos sintéticos foram derivados para 27/10/2026 12h (clock.serverNow).
     A página usa o relógio compartilhado MENOS essa diferença: com o relógio no começo, ela está no «agora» do dado; quando alguém avança o relógio (aqui ou na Coleção), os dois andam juntos.
     Sem o lembretes.js (não deveria acontecer), cai no relógio próprio de futebol-ondas.js. */
  var DEMO_INICIO = Date.parse('2026-10-28T10:00:00-03:00');
  var DELTA = 0;
  function criarRelogioCompartilhado() {
    var L = window.IngresseLembretes;
    if (!(L && L.relogio)) return ONDAS.criarRelogio(S.dados.clock.serverNow);
    DELTA = DEMO_INICIO - Date.parse(S.dados.clock.serverNow);
    return { compartilhado: true, agora: function () { return L.relogio.agora() - DELTA; }, avancar: function (ms) { L.relogio.avancar(ms); }, definir: function (alvo) { L.relogio.ajustarPara(alvo + DELTA); }, zerar: function () { L.relogio.reiniciar(); } };
  }

  /* ------------------------------------------------------------------ início */
  function lerUrl() {
    var q = qs.get('quem'), pl = qs.get('plano');
    var ev = S.dados.events.filter(function (e) { return String(e.id) === String(QJOGO); })[0];
    if (!ev) return false;
    S.ev = ev;
    if (q === 'socio') { var ps = planos(), plano = ps.filter(function (p) { return chavePlano(p) === pl; })[0] || ps[0] || null; S.viewer = { kind: 'member', plan: plano, entry: 'club-site' }; }
    else if (q === 'logada') S.viewer = { kind: 'notMember', plan: null, entry: 'ingresse-login' };
    var c = qs.get('ciclo'); if (['adiado', 'cancelado', 'estadio', 'mandante', 'portoes'].indexOf(c) >= 0) S.ov.ciclo = c;
    var vv = qs.get('vendas'); if (['sem-data', 'acessibilidade', 'esgotado', 'sem-precos'].indexOf(vv) >= 0) S.ov.vendas = vv;
    var cf = qs.get('confirma'); if (['3s', 'sem-resposta'].indexOf(cf) >= 0) S.confirma = cf; aplicarConfirma();
    return true;
  }
  function falhou() {
    root.removeAttribute('data-ef'); var s = document.getElementById('ef-cedo'); if (s) s.remove(); // jogo que não existe: devolve a tela à Evento geral
  }
  function iniciar() {
    var tentativas = 0;
    var espera = function (fn) { if (document.querySelector('#dc-root .hdr')) return fn(); if (tentativas++ < 80) setTimeout(function () { espera(fn); }, 100); };
    Promise.all([carregarJson('./dados/futebol-confronto.json')]).then(function (r) {
      S.dados = r[0];
      if (!S.dados || !ONDAS || !lerUrl()) { espera(falhou); return; }
      S.rel = criarRelogioCompartilhado();
      var ag = qs.get('agora'); if (ag === 'agora') S.rel.zerar(); else if (ag && !isNaN(Date.parse(ag))) S.rel.definir(Date.parse(ag)); // agora=agora volta o relógio compartilhado ao começo
      espera(function () {
        root.setAttribute('data-ef', 'on');
        montarRaiz(); recalcular(false); montarPainel();
        S.ultimoTick = Date.now();
        setInterval(tick, 1000);
        entradaPagina();
      });
    });
  }
  function entradaPagina(atraso) {
    var t = Tm(); if (!t.fast || !raiz.animate) return;
    [raiz.querySelector('.ef-hero-in'), raiz.querySelector('.ef-aside'), raiz.querySelector('.ef-main')].forEach(function (el, i) { if (el) el.animate([{ opacity: 0, transform: 'translateY(' + msTok('--motion-distance-md', 16) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: (atraso || 0) + i * t.stagger, easing: t.enter, fill: 'backwards' }); });
  }

  document.addEventListener('click', aoClicar);
  document.addEventListener('click', aoClicarPainel);
  document.addEventListener('previa:lembretes', function (e) {
    if (!S.R || !raiz) return;
    var novo = lembreteAtivo(); if (novo !== S.subscribed) { S.subscribed = novo; renderTudo(true); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.R) { S.ultimoTick = Date.now(); recalcular(false); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.IngresseFutebolConfronto = { estado: S, vista: function () { return S.v; }, recalcular: recalcular, tick: tick, relogio: function () { return S.rel; } };
})();
