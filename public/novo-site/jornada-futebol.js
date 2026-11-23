/* jornada-futebol.js: a jornada de compra de futebol como UMA CAMADA sobre as telas da compra (Mariana Teixeira, 29/10/2026; módulo M2).
   Fonte: tools/previa/jornada-futebol/jornada-futebol.js; o gerador (tools/previa/jornada-futebol.mjs) copia para previa/jornada-futebol.js e grava os dados em
   previa/jornada-futebol-dados.js (window.JF_DADOS, vindo de previa/dados/futebol-jornada.json e futebol-confronto.json).
   Ativa só com ?jogo=<id> (Ingressos.dc.html?jogo=3011); sem o parâmetro nada daqui roda e as telas de show seguem idênticas.
   Documento: docs/produto/JORNADA-FUTEBOL-PROTOTIPO.md (decisões D1 a D16, critérios AC-01 a AC-60). Textos: textos.js (ids JF-… da Luíza). Regras: regras.js (puras, testadas em Node).

   As etapas (a barra tem 4; o rosto é uma folha, não uma etapa):
     1 Setor e lugares   Ingressos.dc.html?jogo=<id>   setores (lista e mapa), tipos de ingresso, lugares, produtos, reserva
     2 Quem vai          Checkout.dc.html?jogo=<id>    um cartão por ingresso: Meu ingresso, Meu dependente, Outra pessoa; estado do rosto de cada um
     3 Como pagar        Pagamento.dc.html?jogo=<id>   recapitulação por pessoa com Editar e o acordeão de pagamento que já existe
     4 Pronto            Pagamento.dc.html?jogo=<id>&etapa=4 (ou depois de pagar)   um cartão de ingresso por pessoa e o que vem agora
     C Carteira          Carteira.dc.html?jogo=<id>    o cartão de cada ingresso, com o método de entrada
   Módulos vizinhos (contratos da seção 4.6): M1 `window.IngresseMapaEstadio` (mapa e grade de assentos), M3 `window.IngresseRosto` e `window.IngresseDependentes` (cadastro de rosto e dependentes).
   Enquanto M1 e M3 não chegam, este arquivo traz PLACEHOLDERS CONTRATUAIS (seção «stubs»): a lista de setores assume o lugar do mapa e uma folha mínima faz o cadastro de rosto. */
(function () {
  'use strict';
  if (window.IngresseJornadaFutebol) return;

  var D = window.JF_DADOS || null;
  var R = window.JF_REGRAS;
  var T = window.JF_T || function () { return ''; };
  var qs = new URLSearchParams(location.search);
  var ID = qs.get('jogo');
  var BASE = D && R && ID && D.jogos && D.jogos[ID] ? D.jogos[ID] : null;
  var root = document.documentElement;
  var PAG = root.getAttribute('data-pagina') || '';

  /* ---------------------------------------------------------------------------------------------------------------
     1. Utilitários
     --------------------------------------------------------------------------------------------------------------- */
  function ix() { return window.IX || { store: { get: function (k, d) { return d; }, set: function () {}, del: function () {} }, toast: function () {} }; }
  var store = { get: function (k, d) { return ix().store.get(k, d); }, set: function (k, v) { ix().store.set(k, v); }, del: function (k) { ix().store.del(k); } };
  var TZ = 'America/Sao_Paulo';
  var fWd = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short' });
  var fWdL = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' });
  var fDia = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric' });
  var fMes = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: 'short' });
  var fMesL = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: 'long' });
  var fHm = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: false });
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var sem = function (s) { return String(s).replace('.', ''); };
  var ms = function (iso) { return iso ? Date.parse(iso) : 0; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var digits = function (v) { return String(v || '').replace(/\D/g, ''); };
  var reduzido = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; };
  var brl = function (v) { return 'R$ ' + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  function hora(t) {
    var p = fHm.formatToParts(new Date(t)), h = '', m = '';
    p.forEach(function (x) { if (x.type === 'hour') h = String(Number(x.value)); if (x.type === 'minute') m = x.value; });
    return m === '00' ? h + 'h' : h + 'h' + m;
  }
  function dataCurta(t) { var d = new Date(t); return cap(sem(fWd.format(d))) + ' ' + fDia.format(d) + ' ' + sem(fMes.format(d)); }            // Dom 8 nov
  function quando(t) { return dataCurta(t) + ' · ' + hora(t); }                                                                                 // Dom 8 nov · 16h
  function diaMes(t) { var d = new Date(t); return fDia.format(d) + ' ' + sem(fMes.format(d)); }                                                 // 8 nov
  function dataLonga(t) { var d = new Date(t); return fWdL.format(d) + ', ' + fDia.format(d) + ' de ' + fMesL.format(d); }                       // domingo, 8 de novembro
  function agoraSessao() { return Date.now(); }
  var plural = function (n, um, varios) { return n === 1 ? um : varios; };
  function txt(id, v, k) { return T(id, v, k); }

  /* O relógio do jogo é o MESMO da página do jogo (IX.store «relogio»; evento.js): o relógio compartilhado do protótipo MENOS a diferença entre o começo dele (28/10 10h) e a hora do servidor dos dados. */
  var DEMO_INICIO = Date.parse('2026-10-28T10:00:00-03:00');
  var SERVER_NOW = D && D.relogio && D.relogio.serverNow ? Date.parse(D.relogio.serverNow) : Date.parse('2026-10-27T12:00:00-03:00');
  function relogioD() {
    var L = window.IngresseLembretes;
    if (L && L.relogio) return L.relogio.agora() - Date.now();
    var v = store.get('relogio', null);
    if (v && typeof v.d === 'number') return v.d;
    var d = DEMO_INICIO - Date.now(); store.set('relogio', { d: d }); return d;
  }
  function agoraJogo() { return Date.now() + relogioD() + (SERVER_NOW - DEMO_INICIO); }
  function aplicarAgoraUrl() {
    var ag = qs.get('agora'); if (!ag) return;
    var L = window.IngresseLembretes;
    if (ag === 'agora') { if (L && L.relogio) L.relogio.reiniciar(); else store.set('relogio', { d: DEMO_INICIO - Date.now() }); return; }
    var alvo = Date.parse(ag); if (isNaN(alvo)) return;
    var delta = DEMO_INICIO - SERVER_NOW;                     // o mesmo ajuste da página do jogo
    if (L && L.relogio) L.relogio.ajustarPara(alvo + delta); else store.set('relogio', { d: alvo + delta - Date.now() });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     2. Configuração do jogo e da pessoa: URL, depois a sessão (IX.store), depois o bloco do jogo, depois o padrão
     --------------------------------------------------------------------------------------------------------------- */
  var CHAVES_SESSAO = ['jfCart', 'jfHold', 'jfQuemvai', 'jfTomados', 'jfEstadoFeito', 'jfCtx'];
  function limparSessaoDeOutroJogo() {
    CHAVES_SESSAO.forEach(function (k) { var v = store.get(k, null); if (v && v.jogo != null && String(v.jogo) !== String(ID)) store.del(k); });
  }
  var CTX_URL = ['perfil', 'plano', 'facial', 'mapa', 'deps', 'ciclo', 'entrada'];
  function lerCtxSessao() {
    var st = store.get('jfCtx', null), mudou = false;
    if (!st || String(st.jogo) !== String(ID)) { st = { jogo: ID, p: {} }; mudou = true; }
    CTX_URL.forEach(function (k) { var v = qs.get(k); if (v !== null && st.p[k] !== v) { st.p[k] = v; mudou = true; } });
    if (mudou) store.set('jfCtx', st);
    return st.p;
  }
  var CTX = {}, J = null, PESSOA = null, MAPA = 'livre', SETORES = [], POR_ID = {};
  function iniciarConfig() {
    if (!BASE) return;
    limparSessaoDeOutroJogo();
    CTX = lerCtxSessao();
    J = JSON.parse(JSON.stringify(BASE));                                // cópia: os parâmetros sobrescrevem o jogo sem tocar nos dados
    if (['antes', 'depois', 'nao'].indexOf(CTX.facial) >= 0) J.facial = CTX.facial;
    var m = ['assento', 'ilustrativo', 'livre'].indexOf(CTX.mapa) >= 0 ? CTX.mapa : J.mapa;
    var temEsquema = !!(D.estadios && J.estadioId && D.estadios[J.estadioId]);
    MAPA = (m === 'assento' || m === 'ilustrativo') && !temEsquema ? 'livre' : m;
    J.mapaExplicitoLivre = CTX.mapa === 'livre';
    if (['face', 'qr', 'face+qr'].indexOf(CTX.entrada) >= 0) J.entrada = Object.assign({}, J.entrada, { metodo: CTX.entrada });
    J.entrada = Object.assign({}, J.entrada, { metodo: R.metodoDeEntrada(J, J.entrada && J.entrada.metodo) });
    var perfil = R.perfilDaPonte(J, null, CTX.perfil);
    PESSOA = R.pessoa(D.conta, perfil, CTX.plano);
    if (CTX.deps === '1') PESSOA.deps = true;
    if (CTX.deps === '0') PESSOA.deps = false;
    SETORES = (J.setores || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    POR_ID = {}; SETORES.forEach(function (s) { POR_ID[s.id] = s; });
  }
  /* O runtime carrega no <head>, antes do ux.js (IX.store) e do lembretes.js (relógio): a configuração só nasce quando a tela pede (estado, vals, montou). */
  var CONFIGURADO = false;
  function garantirConfig() { if (CONFIGURADO || !BASE) return; CONFIGURADO = true; aplicarAgoraUrl(); iniciarConfig(); }

  function perfil() { return PESSOA.perfil; }
  function ctxPessoa() { return { perfil: PESSOA.perfil, plano: PESSOA.plano, pcd: PESSOA.pcd }; }
  function numerado(s) { return R.ehAssento(s) && MAPA !== 'ilustrativo' && !J.mapaExplicitoLivre; }
  function planoRotulo() { var p = R.planoDe(J, PESSOA.plano); return p ? p.rotulo : ''; }
  function clubeDoJogo() { return J.clienteVisitante ? J.visitante.curto : J.mandante.curto; }

  /* ---------------------------------------------------------------------------------------------------------------
     3. Navegação entre as etapas
     --------------------------------------------------------------------------------------------------------------- */
  var PASSO_ARQ = ['', 'Ingressos', 'Checkout', 'Pagamento'];
  function passoHref(p, ancora) { return PASSO_ARQ[p] + '.dc.html?jogo=' + ID + (ancora ? '#' + ancora : ''); }
  function jogoHref() { return 'Evento.dc.html?jogo=' + ID; }
  function carteiraHref() { return 'Carteira.dc.html?jogo=' + ID; }
  function irPara(url) { window.location.href = url; }
  function urlCom(params) {
    var u = new URL(location.href);
    Object.keys(params).forEach(function (k) { if (params[k] == null || params[k] === '') u.searchParams.delete(k); else u.searchParams.set(k, params[k]); });
    u.hash = '';
    return u.toString();
  }
  function foca(id, o) {
    setTimeout(function () {
      var el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) return;
      if (o && o.semRolar) { el.focus({ preventScroll: true }); return; }
      if (window.IX && window.IX.revelar) window.IX.revelar(el, { foco: true, espera: 0 }); else el.focus();
    }, (o && o.atraso) || 60);
  }

  /* ---------------------------------------------------------------------------------------------------------------
     4. Rosto e dependentes: os módulos do M3 (window.IngresseRosto e window.IngresseDependentes; tools/previa/jornada-futebol/rosto/)
     Uma implementação só: a folha de rosto, o banner da etapa 1, o cartão de estado do rosto, o cartão de pessoa e a etapa «Quem vai» são DELES; aqui só o contrato.
     O estado do rosto vive na conta (jfConta, IX.store), nunca no carrinho: feito uma vez, vale para os próximos jogos.
     --------------------------------------------------------------------------------------------------------------- */
  var ICO = { ok: 'ok', info: 'info', erro: 'erro', atencao: 'atencao', relogio: 'relogio', rosto: 'rosto', qr: 'qr', flag: 'flag', bloqueio: 'bloqueio' };
  function modalDisponivel() { return !!window.IngresseModal; }
  var M3R = function () { return window.IngresseRosto || null; };
  var M3D = function () { return window.IngresseDependentes || null; };
  /** Estado inicial da conta de exemplo (perfil, ?rosto=, ?deps=). Com `rosto=` na URL a conta recomeça dali; sem ele o que a pessoa fez nas telas anteriores continua. */
  function semearConta() {
    var M = M3R(); if (!M) return;
    if (qs.get('rosto') !== null) store.del('jfConta');
    M.semear(PESSOA.perfil, { rosto: CTX.rosto || '', deps: CTX.deps === '1' ? '1' : '', facial: J.facial });
  }
  function rostoDe(id) { var M = M3R(); return M ? M.estado(id) : 'pendente'; }
  function marcarRosto(id, est) { var M = M3R(); if (M) M.marcar(id, est); }
  function dependentes() { var M = M3D(); return M ? M.listar() : []; }
  function prazoRosto() { return quando(ms(J.doorsAt || J.kickoff)); }
  /** A folha de cadastro de rosto (IngresseRosto.abrir). `depois()` roda ao concluir; `adiar()` quando a pessoa escolhe cadastrar depois (só com facial: 'depois'). */
  function abrirFolha(pessoa, gatilho, depois, adiar) {
    var M = M3R(); if (!M) return null;
    return M.abrir({ pessoa: pessoa, gatilho: gatilho, facial: J.facial, clube: clubeDoJogo(), prazo: prazoRosto(),
      aoConcluir: function (e) { if (depois) depois(e); }, aoAdiar: function () { if (adiar) adiar(); } });
  }
  var PESSOA_EU = function () { return { id: 'eu', nome: D.conta.pessoa.nome, tipo: 'eu' }; };
  function clicaRosto(pessoa, gatilho, depois, adiar) { abrirFolha(pessoa, gatilho, depois, adiar); }
  /** `abrir=rosto` e `rosto=<estado>` na URL: a folha abre como o link pede (IngresseRosto.abrirDaUrl). */
  function abrirFolhaDaUrl(gatilho, depois) {
    var M = M3R(); if (!M) return;
    if (M.abrirDaUrl) M.abrirDaUrl({ pessoa: PESSOA_EU(), gatilho: gatilho, facial: J.facial, clube: clubeDoJogo(), prazo: prazoRosto(), aoConcluir: depois });
  }
  function nomeDeContato(v) {
    var s = String(v || '').toLowerCase();
    if (/@/.test(s)) { var p = s.split('@')[0].split(/[._\-+0-9]/)[0] || s; return p.charAt(0).toUpperCase() + p.slice(1); }
    return 'Pessoa do ' + (digits(s).length === 11 ? 'CPF' : 'passaporte') + ' final ' + s.slice(-2);
  }
  function convidado(valor) {
    var M = M3R(), cv = (M && M.conta().convidados) || {}, k = cv[valor];
    if (k) return { valor: valor, chave: 'c:' + valor, nome: k.nome || (k.conta === false ? valor : nomeDeContato(valor)), conta: k.conta !== false };
    return { valor: valor, chave: 'c:' + valor, nome: nomeDeContato(valor), conta: true };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     5. Carrinho, reserva e titulares (IX.store: jfCart, jfHold, jfQuemvai, jfTomados, jfOrder)
     --------------------------------------------------------------------------------------------------------------- */
  function cartLer() {
    var c = store.get('jfCart', null);
    if (c && String(c.jogo) === String(ID)) return c;
    return { jogo: ID, itens: [], seq: 1, prd: null, semente: '' };
  }
  function cartGravar(c) { store.set('jfCart', c); }
  function tomadosLer() { var t = store.get('jfTomados', null); return t && String(t.jogo) === String(ID) ? t.ids : []; }
  function tomadosGravar(ids) { store.set('jfTomados', { jogo: ID, ids: ids }); }
  function ocupados(c, setorId) {
    var o = tomadosLer().slice();
    c.itens.forEach(function (i) { if (i.fileira && (!setorId || i.setor === setorId)) o.push(setorId ? R.idAssento(i.fileira, i.assento) : i.setor + ':' + R.idAssento(i.fileira, i.assento)); });
    return o;
  }
  function assentoId(i) { return R.idAssento(i.fileira, i.assento); }
  function tipoPadrao(s, seatN) {
    var ts = R.tiposDoSetor(J, s, ctxPessoa(), []);
    if (s.tipo === 'pcd' && seatN) { var papel = R.papelDoAssento(s, seatN); if (papel && ts.some(function (t) { return t.id === papel; })) return papel; }
    var pref = PESSOA.perfil === 'socio' ? 'socio' : PESSOA.perfil === 'visitante' ? 'visitante' : 'inteira';
    var t = ts.filter(function (x) { return x.id === pref && x.ok; })[0] || ts.filter(function (x) { return x.ok; })[0];
    return t ? t.id : 'inteira';
  }
  function novoItem(c, setor, tipo, fileira, assento) { var it = { uid: c.seq++, setor: setor, tipo: tipo }; if (fileira) { it.fileira = fileira; it.assento = assento; } return it; }

  /** O que o bloco do jogo diz para `escolhidos=1`: lugares de exemplo do perfil (ou, nos jogos derivados, um conjunto coerente). */
  function itensDeExemplo(c) {
    var ex = J.exemplos && J.exemplos[PESSOA.perfil], out = [];
    if (ex) {
      var s = POR_ID[ex.setor];
      if (s) {
        if (ex.lugares && numerado(s)) ex.lugares.forEach(function (l, k) { var a = R.lerAssento(l); out.push(novoItem(c, s.id, ex.tipos[k] || tipoPadrao(s, a.n), a.fileira, a.n)); });
        else { var n = ex.quantidade || (ex.lugares ? ex.lugares.length : 1); for (var k = 0; k < n; k++) out.push(novoItem(c, s.id, (ex.tipos && ex.tipos[k]) || tipoPadrao(s), null, null)); }
        return out;
      }
    }
    // jogo sem exemplos: o primeiro setor que a pessoa pode escolher
    var ctx = ctxPessoa(), alvo = SETORES.filter(function (x) { var e = R.estadoSetor(J, x, ctx, [], null); return !e.disabled && x.tipo !== 'pcd'; })[0] || SETORES.filter(function (x) { return !R.estadoSetor(J, x, ctx, [], null).disabled; })[0];
    if (!alvo) return out;
    var qtd = PESSOA.perfil === 'visitante' ? 1 : 2;
    if (numerado(alvo)) {
      var f = R.encontrarJuntos(alvo, qtd, ocupados(c, alvo.id));
      if (f) f.assentos.forEach(function (a) { out.push(novoItem(c, alvo.id, tipoPadrao(alvo, a), f.fileira, a)); });
    } else {
      for (var q = 0; q < qtd; q++) out.push(novoItem(c, alvo.id, tipoPadrao(alvo), null, null));
    }
    if (PESSOA.perfil === 'familia' && out.length === 2) { var ts = R.tiposDoSetor(J, alvo, ctx, []); if (ts.some(function (t) { return t.id === 'crianca'; })) out[1].tipo = 'crianca'; }
    return out;
  }
  function sementeAssinatura() { return [PESSOA.perfil, PESSOA.plano || '', J.facial, MAPA, qs.get('setor') || ''].join('|'); }
  /** Estado inicial do carrinho: o guardado (do mesmo jogo) ou, com `escolhidos=1`, o de exemplo. Tira o que a pessoa não pode mais ter (perfil trocado). */
  function carrinhoInicial() {
    var c = cartLer(), ctx = ctxPessoa();
    var sig = sementeAssinatura();
    if (qs.get('escolhidos') === '1' && (c.semente !== sig || FORCAM_SEMENTE.indexOf(qs.get('estado') || '') >= 0)) {
      c = { jogo: ID, itens: [], seq: 1, prd: null, semente: sig };
      c.itens = itensDeExemplo(c);
      if (qs.get('estado') === 'meia-limite') {
        var s0 = SETORES.filter(function (x) { return !R.estadoSetor(J, x, ctx, [], null).disabled && R.tiposDoSetor(J, x, ctx, []).some(function (t) { return t.id === 'meia'; }) && !numerado(x); })[0];
        if (s0) { c.itens = []; for (var k = 0; k < R.limiteMeia(J); k++) c.itens.push(novoItem(c, s0.id, 'meia', null, null)); }
      }
      var m = qs.get('produtos'); void m;
      var P = window.IngresseProdutos;
      if (P) { var est = P.estadoVazio(), pc = ctxProdutos(); est.sel = P.selecaoDemo(pc, P.catalogo(pc)); c.prd = { sel: est.sel, opc: est.opc }; }
    }
    var tom = tomadosLer();
    var antes = c.itens.length;
    c.itens = c.itens.filter(function (i) {
      var s = POR_ID[i.setor]; if (!s) return false;
      var e = R.estadoSetor(J, s, ctx, [], null);
      if (e.disabled && e.k !== 'esgotado') return false;
      if (i.fileira && tom.indexOf(assentoId(i)) >= 0) return false;
      return R.tiposDoSetor(J, s, ctx, []).some(function (t) { return t.id === i.tipo; });
    });
    if (c.itens.length !== antes || qs.get('escolhidos') === '1') cartGravar(c);
    return c;
  }

  function holdLer() { var h = store.get('jfHold', null); return h && String(h.jogo) === String(ID) ? h : { jogo: ID, fim: 0 }; }
  function holdGravar(fim) { store.set('jfHold', { jogo: ID, fim: fim }); }
  /** A reserva nasce do primeiro lugar escolhido e não reinicia ao mexer em produtos, reabrir ou recarregar. */
  function sincronizarReserva(c) {
    var h = holdLer(), fim = R.fimDaReserva(h.fim, c.itens.length, Date.now(), J.reservaMin);
    if (fim !== h.fim) holdGravar(fim);
    return fim;
  }
  function reservaVals(fim, agora) {
    var r = R.reserva(fim, agora || Date.now());
    return { estado: r.estado, restanteMs: r.restanteMs, texto: R.textoReserva(r.restanteMs), sem: !!r.sem };
  }

  function quemLer() { var q = store.get('jfQuemvai', null); return q && String(q.jogo) === String(ID) ? q : { jogo: ID, t: {} }; }
  function quemGravar(q) { store.set('jfQuemvai', q); }

  /* ---------------------------------------------------------------------------------------------------------------
     6. Produtos (módulo comum previa/produtos.js; o contexto é o do jogo)
     --------------------------------------------------------------------------------------------------------------- */
  var PRD = function () { return window.IngresseProdutos; };
  function ctxProdutos() { return { tipo: 'jogo', id: String(ID), visitante: PESSOA.perfil === 'visitante' || !!J.clienteVisitante, titulo: J.titulo }; }
  function ingressosParaProdutos(n) { return { n: n, porData: {}, tipos: {}, vaga: {} }; }

  /* ---------------------------------------------------------------------------------------------------------------
     7. Linhas, totais e nomes
     --------------------------------------------------------------------------------------------------------------- */
  function tipoRotulo(id) { return id === 'socio' ? txt('JF-1-22', { plano: planoRotulo() }, 'socio').replace('{plano}', planoRotulo()) : txt('JF-1-22', null, id); }
  function rotuloDoTipo(id) { var r = txt('JF-1-22', { plano: planoRotulo() }, id); return r; }
  function nomeSetor(id) { return POR_ID[id] ? POR_ID[id].nome : id; }
  function linhaDoItem(i, curta) {
    var s = POR_ID[i.setor], tipo = rotuloDoTipo(i.tipo);
    if (i.fileira) return txt(curta === 'q' ? 'JF-2-03' : 'JF-1-41', { setor: s.nome, fileira: i.fileira, assento: i.assento, tipo: tipo });
    return txt('JF-1-41L', { setor: s.nome, tipo: tipo });
  }
  function linhasResumo(itens) {
    var out = [], grupos = {};
    itens.forEach(function (i) {
      var s = POR_ID[i.setor], p = R.precoReais(s, i.tipo, J, PESSOA.plano) || 0;
      if (i.fileira) out.push({ qty: 1, label: linhaDoItem(i), total: brl(p) });
      else { var k = i.setor + '|' + i.tipo; if (!grupos[k]) { grupos[k] = { qty: 0, label: linhaDoItem(i), p: p, ord: out.length }; out.push(grupos[k]); } grupos[k].qty++; }
    });
    return out.map(function (l) { return l.p != null ? { qty: l.qty, label: l.label, total: brl(l.qty * l.p) } : l; });
  }
  function totaisDoCarrinho(c) {
    var t = R.totais(c.itens, POR_ID, J, ctxPessoa(), 0);
    return t;
  }
  /** O carrinho que atravessa as telas (mesmo formato do carrinho esportivo: o que produtos.js e o fechamento do pedido leem). */
  function carrinhoCompleto(c) {
    var t = totaisDoCarrinho(c), P = PRD(), pc = ctxProdutos(), prd = c.prd || (P ? P.estadoVazio() : null), prods = null;
    var est = P && prd ? Object.assign(P.estadoVazio(), prd) : null;
    if (P && est) {
      var res = P.resolver(pc, P.catalogo(pc), est, ingressosParaProdutos(c.itens.length));
      prods = res.n > 0 ? P.produtosDoCarrinho(pc, res, est) : null;
      var linhas = linhasResumo(c.itens).concat(res.resumo || []);
      return { jogo: ID, lugares: c.itens.map(function (i) { return { setor: i.setor, fileira: i.fileira || null, assento: i.assento || null, tipo: i.tipo, precoReais: R.precoReais(POR_ID[i.setor], i.tipo, J, PESSOA.plano) || 0 }; }),
        itens: c.itens, lines: linhas, subtotal: t.subtotal, fees: 0, discount: 0, total: t.subtotal + (res.total || 0), totalIngressos: t.subtotal, n: c.itens.length, produtos: prods };
    }
    return { jogo: ID, lugares: [], itens: c.itens, lines: linhasResumo(c.itens), subtotal: t.subtotal, fees: 0, discount: 0, total: t.subtotal, totalIngressos: t.subtotal, n: c.itens.length, produtos: null };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     8. Cabeçalho (o mesmo nas quatro telas), avisos e engrenagem
     --------------------------------------------------------------------------------------------------------------- */
  function jogoTitulo() { return J.titulo; }
  function jogoQuando() { return quando(ms(J.kickoff)); }
  function rodadaTx() { return J.rodada ? J.rodada + 'ª rodada' : (J.fase || ''); }
  function linhaCampeonato() {
    var partes = [J.campeonato, rodadaTx(), jogoQuando(), J.estadio.nome].filter(Boolean);
    return partes.join(' · ');
  }
  function cabecalho(passo, back, backAria) {
    var rot = txt('JF-ET-ROTULOS');
    return {
      jfPasso: passo, jfBack: back, jfBackAria: backAria, jfTitulo: jogoTitulo(), jfQuando: linhaCampeonato(), jfEtapasAria: txt('JF-ET-ARIA'),
      jfMandSrc: J.mandante.escudo, jfMandSrcEsc: J.mandante.escudoEscuro || J.mandante.escudo, jfVisSrc: J.visitante.escudo, jfVisSrcEsc: J.visitante.escudoEscuro || J.visitante.escudo,
      jfPassos: rot.map(function (r, i) { var n = i + 1; return { n: n, rot: r, cls: n === passo ? 'stp-on' : '', cur: n === passo ? 'step' : 'false', feito: n < passo, aFazer: n >= passo }; }),
      jfMob: txt('JF-ET-MOB', { n: passo, rotulo: rot[passo - 1] }),
      jfOver: txt('JF-ET-DE', { n: passo, jogo: jogoTitulo() })
    };
  }
  var ICONE_AVISO = { neutral: ICO.info, success: ICO.ok, warning: ICO.atencao, error: ICO.erro };
  function aviso(id, variante, texto, o) {
    o = o || {};
    var acoes = (o.acoes || []).map(function (a) { return { txt: a.txt, cls: a.cls || 'linkbtn', isLink: !!a.href, isBtn: !a.href, href: a.href || '#', pick: a.pick || function () {} }; });
    return { id: id, variante: variante, role: o.role || (variante === 'error' || variante === 'warning' ? 'alert' : 'status'), ic: o.icone || ICONE_AVISO[variante] || ICO.info,
      titulo: o.titulo || '', temTitulo: !!o.titulo, texto: texto, acoes: acoes, temAcoes: acoes.length > 0 };
  }
  /** O aviso do jogo (E-23): adiado, cancelado, estádio ou portões; vence a venda e não deixa pagar. */
  function cicloAtual() { return R.cicloDoJogo(J, CTX.ciclo); }
  function avisoDeCiclo() {
    var c = cicloAtual(); if (!c) return null;
    return aviso('jf-aviso-ciclo', 'warning', txt('JF-E-23-' + c), { acoes: [{ txt: txt('JF-E-23a'), href: jogoHref() }] });
  }
  /** A janela de venda para a pessoa agora (venda por abrir, encerrada, esgotada). */
  function vendaAtual() { return R.janelaDeVenda(J, ctxPessoa(), agoraJogo()); }
  function avisoDeVenda(v) {
    if (v.estado === 'ok') return null;
    var quem = txt('JFX-V-QUEM', null, PESSOA.perfil);
    var acoes = [{ txt: txt('JFX-V-VOLTAR-JOGO'), href: jogoHref() }];
    if (v.estado === 'antes') return aviso('jf-aviso-venda', 'neutral', txt('JFX-V-ANTES', { quem: quem, quando: quando(v.abreEm) }), { titulo: txt('JFX-V-ANTES-T'), acoes: acoes });
    if (v.estado === 'esgotada') return aviso('jf-aviso-venda', 'warning', txt('JFX-V-ESGOTADA'), { titulo: txt('JFX-V-ESGOTADA-T'), acoes: acoes });
    if (v.estado === 'depois') return aviso('jf-aviso-venda', 'neutral', txt('JFX-V-DEPOIS'), { titulo: txt('JFX-V-DEPOIS-T'), acoes: [{ txt: txt('JFX-V-VER-JOGOS'), href: 'Categoria.dc.html?c=futebol' }] });
    return aviso('jf-aviso-venda', 'neutral', txt('JFX-V-SEMJANELA'), { acoes: acoes });
  }
  function rostoBloqueiaCompra() { return R.usaRosto(J) && R.rostoBloqueia(J) && R.entradaUsaRosto(J.entrada.metodo); }

  /** A engrenagem (uma só por tela): cada chip regrava a URL e recarrega no lugar; os de reserva e cartão agem na própria tela. */
  function protoGrupos(extra) {
    var G = txt('JFX-PROTO-GRUPOS'), grupos = [];
    var chip = function (rotulo, params, ligado) { return { label: rotulo, on: ligado ? 'true' : 'false', pick: function () { irPara(urlCom(params)); } }; };
    var porChave = function (tabela, param, atual, vazio) { return Object.keys(tabela).map(function (k) { return chip(tabela[k], (function () { var o = {}; o[param] = k === '' ? null : k; return o; })(), (atual || '') === k || (vazio && !atual && k === vazio)); }); };
    grupos.push({ rot: G.perfil, chips: porChave(txt('JFX-PROTO-PERFIL'), 'perfil', PESSOA.perfil) });
    var rostoAtual = qs.get('rosto') || '';
    var simu = txt('JFX-PROTO-SIMULAR'), chipsRosto = porChave(txt('JFX-PROTO-ROSTO'), 'rosto', rostoAtual);
    ['concluir', 'falhar', 'expirar'].forEach(function (k, n) { chipsRosto.push({ label: simu[n], on: 'false', pick: function () { var M = M3R(); if (M && M.simular) M.simular(k); } }); });
    grupos.push({ rot: G.rosto, chips: chipsRosto });
    grupos.push({ rot: G.facial, chips: porChave(txt('JFX-PROTO-FACIAL'), 'facial', J.facial) });
    grupos.push({ rot: G.mapa, chips: porChave(txt('JFX-PROTO-MAPA'), 'mapa', CTX.mapa || BASE.mapa) });
    grupos.push({ rot: G.deps, chips: porChave(txt('JFX-PROTO-DEPS'), 'deps', CTX.deps === '1' ? '1' : '') });
    grupos.push({ rot: G.estado, chips: porChave(txt('JFX-PROTO-ESTADO'), 'estado', qs.get('estado') || '') });
    grupos.push({ rot: G.ciclo, chips: porChave(txt('JFX-PROTO-CICLO'), 'ciclo', CTX.ciclo || '') });
    (extra || []).forEach(function (g) { grupos.push(g); });
    grupos.push({ rot: G.limpar, chips: [{ label: txt('JFX-PROTO-LIMPAR'), on: 'false', pick: function () { CHAVES_SESSAO.concat(['jfContaStub', 'jfOrder']).forEach(function (k) { store.del(k); }); var u = new URL(location.href); ['perfil', 'plano', 'rosto', 'motivo', 'facial', 'mapa', 'deps', 'estado', 'ciclo', 'setor', 'escolhidos', 'entrada', 'sit', 'qr', 'abrir', 'etapa', 'vista'].forEach(function (k) { u.searchParams.delete(k); }); u.hash = ''; irPara(u.toString()); } }] });
    return grupos;
  }
  function protoBase(extra) {
    return { jfProtoResumo: txt('JFX-PROTO-RESUMO'), jfProtoTitulo: txt('JFX-PROTO-TITULO'), jfProtoAria: txt('JFX-PROTO-ARIA'), jfProtoGrupos: protoGrupos(extra) };
  }
  function protoReserva(fnFaltar, fnExpirar) {
    var r = txt('JFX-PROTO-RESERVA'), G = txt('JFX-PROTO-GRUPOS');
    return { rot: G.reserva, chips: [{ label: r[0], on: 'false', pick: fnFaltar }, { label: r[1], on: 'false', pick: fnExpirar }] };
  }


  /* ---------------------------------------------------------------------------------------------------------------
     9. Etapa 1 · Setor e lugares
     --------------------------------------------------------------------------------------------------------------- */
  var FORCAM_SEMENTE = ['assento-tomado', 'reserva-acabando', 'reserva-acabou', 'meia-limite', 'lugares-nao-conferem', 'outro-aparelho'];
  var SELO_SIT = { ok: 'venda', poucos: 'ultima', esgotado: 'esgotado', plano: 'nao-aberto', direito: 'nao-aberto', visitante: 'encerrado', escolhido: 'venda' };
  var SELO_ICO = { ok: ICO.ok, poucos: ICO.relogio, esgotado: ICO.bloqueio, plano: ICO.info, direito: ICO.info, visitante: ICO.flag, escolhido: ICO.ok };
  var milhar = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  function limiteTotal() { return R.limitePorPessoa(J, ctxPessoa()); }
  function mapaDisponivel() { return !!(window.IngresseMapaEstadio && MAPA !== 'livre' && D.estadios && J.estadioId && D.estadios[J.estadioId]); }
  function partesReserva() { var p = txt('JF-1-39', { tempo: '\u0001' }).split('\u0001'); return [p[0], p[1] || '']; }
  function ehDesktop() { return !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches); }

  function estadoIngressos() {
    var est = qs.get('estado') || '';
    var c = carrinhoInicial();
    // estados da URL que mexem no relógio da reserva (cada abertura da URL parte do mesmo ponto)
    var h = holdLer();
    if (qs.get('escolhidos') === '1' || !h.fim) { h = { jogo: ID, fim: R.fimDaReserva(0, c.itens.length, Date.now(), J.reservaMin) }; holdGravar(h.fim); }
    var ui = { setorAberto: null, setorUrl: qs.get('setor') || null, vista: qs.get('vista') || (ehDesktop() ? 'mapa' : 'lista'), quantos: {}, res: {}, filtroPcd: PESSOA.perfil === 'pcd', erros: [], vivo: '', rostoDepois: false, mapaFalhou: est === 'reserva-indisponivel', tomado: null, urgenteVisto: false, dispensaUrgente: false, outro: est === 'outro-aparelho' };
    if (est === 'reserva-acabando' && c.itens.length) { holdGravar(Date.now() + 60000); }
    if (est === 'reserva-acabou' && c.itens.length) { holdGravar(Date.now() - 1); }
    var feito = store.get('jfEstadoFeito', null);
    if (est === 'assento-tomado') {
      var forcou = qs.get('escolhidos') === '1';
      if (forcou || !(feito && feito.jogo === ID && feito.chave === est)) {
        var alvo = c.itens.filter(function (i) { return i.fileira; })[0];
        if (alvo) {
          var ids = tomadosLer(); ids.push(assentoId(alvo)); tomadosGravar(ids);
          c.itens = c.itens.filter(function (i) { return i !== alvo; }); cartGravar(c);
          ui.tomado = { fileira: alvo.fileira, assento: alvo.assento, setor: alvo.setor };
          store.set('jfEstadoFeito', { jogo: ID, chave: est });
        }
      }
    }
    if (ui.setorUrl && POR_ID[ui.setorUrl]) {
      var e0 = R.estadoSetor(J, POR_ID[ui.setorUrl], ctxPessoa(), [], est === 'setor-esgotado' ? 'setor-esgotado' : null);
      if (!e0.disabled) ui.setorAberto = ui.setorUrl;
    }
    return { jf: ui, jfNow: Date.now() };
  }
  function sobrescreveSetor(s, ui) {
    if (qs.get('estado') === 'setor-esgotado') {
      var alvoId = ui.setorUrl && POR_ID[ui.setorUrl] ? ui.setorUrl : null;
      if (!alvoId) { var p = SETORES.filter(function (x) { return !R.estadoSetor(J, x, ctxPessoa(), [], null).disabled; })[0]; alvoId = p && p.id; }
      if (s.id === alvoId) return 'setor-esgotado';
    }
    return null;
  }
  function ingressosVals(comp) {
    var ui = comp.state.jf, c = cartLer(), ctx = ctxPessoa(), now = comp.state.jfNow || Date.now();
    var P = PRD(), lim = limiteTotal();
    var venda = vendaAtual(), ciclo = cicloAtual();
    var fim = sincronizarReserva(c);
    var rv = reservaVals(fim, now);
    // reserva que acabou (E-05): os lugares voltam à venda; setor, tipos e quantidades dos setores livres ficam
    if (rv.estado === 'acabou' && c.itens.length && !c.liberado) {
      var perdidos = c.itens.filter(function (i) { return i.fileira; });
      c.perdidos = perdidos.length; c.itens = c.itens.filter(function (i) { return !i.fileira; }); c.liberado = true; c.avisoAcabou = true; cartGravar(c);
      var fim2 = sincronizarReserva(c); rv = reservaVals(fim2 || fim, now);
    }
    if (rv.estado === 'acabou' && !c.liberado && !c.itens.length && fim) { c.liberado = true; c.avisoAcabou = true; cartGravar(c); }
    var mutar = function (fn, vivo) {
      var cc = cartLer(); fn(cc); cartGravar(cc); sincronizarReserva(cc);
      var u = Object.assign({}, comp.state.jf, { vivo: vivo || '', erros: [] }); comp.setState({ jf: u, jfNow: Date.now() });
    };
    var setUi = function (patch) { comp.setState({ jf: Object.assign({}, comp.state.jf, patch), jfNow: Date.now() }); };
    var total = c.itens.length, hasItems = total > 0;
    var tot = totaisDoCarrinho(c);
    var oc = tomadosLer();
    var numeradoAlgum = SETORES.some(function (s) { return numerado(s); });

    /* ---- setores (lista e painel) ---- */
    var setoresVals = [];
    SETORES.forEach(function (s) {
      var ocS = ocupados(c, s.id);
      var e = R.estadoSetor(J, s, ctx, ocS, sobrescreveSetor(s, ui));
      if (e.oculto) return;
      if (ui.filtroPcd && s.tipo !== 'pcd') return;
      var meus = c.itens.filter(function (i) { return i.setor === s.id; });
      var aberto = ui.setorAberto === s.id && !e.disabled;
      var k = meus.length ? 'escolhido' : e.k;
      var ts = R.tiposDoSetor(J, s, ctx, c.itens);
      var aPartir = R.aPartirDe(s, J, ctx);
      var livresTx = e.livres ? (e.livres === 1 ? txt('JFX-LIVRES', null, 'um') : txt('JFX-LIVRES', { n: milhar(e.livres) }, 'varios')) : txt('JFX-LIVRES', null, 'esgotado');
      var info = [s.portao, (e.k === 'esgotado' || aPartir == null) ? livresTx : txt('JF-1-15', { livres: livresTx, preco: milhar(aPartir) })].filter(Boolean).join(' · ');
      var motivo = '';
      if (e.k === 'plano') motivo = txt('JF-1-16', { lista: listaNomes(R.setoresDoPlano(J, ctx.plano)) });
      else if (e.k === 'direito') motivo = txt('JF-1-47');
      else if (e.k === 'visitante') motivo = txt('JFX-VISITANTE-INFO');
      else if (e.k === 'esgotado') motivo = txt('JF-E-21a');
      var selo = k === 'escolhido' ? txt('JF-1-14', null, 'escolhido') : txt('JF-1-14', null, e.k);
      var fatos = [];
      if (s.tipo === 'visitante') fatos.push(txt('JF-1-19', { portao: s.portao || '', n: (J.regras.visitante && J.regras.visitante.porPessoa) || 1 }));
      if (s.tipo === 'visitante' && J.regras.visitante && J.regras.visitante.fechaAs) fatos.push(txt('JFX-FATO-VISITANTE-FECHA', { quando: quando(ms(J.regras.visitante.fechaAs)) }));
      if (ts.some(function (t) { return t.id === 'meia'; })) fatos.push(txt('JFX-FATO-MEIA', { n: R.limiteMeia(J) }));
      if (ts.some(function (t) { return t.id === 'crianca'; }) && J.regras.dependentes) fatos.push(txt('JF-1-26', { idade: J.regras.dependentes.idadeMax, colo: (J.regras.crianca && J.regras.crianca.colo && J.regras.crianca.colo.ateAnos) || 2 }));
      if (ctx.perfil === 'socio' && ts.some(function (t) { return t.id === 'socio'; })) fatos.push(txt('JFX-FATO-PLANO'));
      if (s.tipo === 'pcd') { fatos.push(txt('JF-1-29')); fatos.push(txt('JF-1-28')); }
      var item = {
        id: s.id, idItem: 'jf-setor-' + s.id, idBt: 'jf-setor-bt-' + s.id, idPainel: 'jf-painel-' + s.id, idMotivo: 'jf-motivo-' + s.id, idTitulo: 'jf-painel-t-' + s.id, idResultado: 'jf-res-' + s.id,
        nome: s.nome, info: info, k: k, sel: meus.length ? 'true' : 'false', soPainel: 'false', comCartao: true, aberto: aberto ? 'true' : 'false', fechado: !aberto, off: e.disabled ? 'true' : 'false',
        selo: selo, seloSit: SELO_SIT[k], temIco: true, ic: SELO_ICO[k], motivo: motivo,
        alternar: function () {
          if (e.disabled) return;
          var abre = ui.setorAberto === s.id ? null : s.id;
          setUi({ setorAberto: abre });
          if (abre) foca('jf-painel-t-' + s.id, { atraso: reduzido() ? 20 : 340 });
        },
        sub: info, temFatos: fatos.length > 0, fatosAria: txt('JFX-FATOS-ARIA'), fatos: fatos.map(function (t) { return { t: t }; }),
        temTipos: false, tipos: [], tiposAria: txt('JF-1-21'), tiposNota: txt('JFX-TIPOS-NOTA'), temAssentos: false
      };
      if (numerado(s)) montarAssentosStub(item, s, e, ocS, ui, c, ctx, lim, mutar, setUi);
      else montarTipos(item, s, e, ts, ui, c, lim, mutar);
      setoresVals.push(item);
    });
    // Mapa do estádio (Wander, 31/10/2026): no protótipo é só a IMAGEM, sempre acima da lista; o sistema de mapas vai embutir o mapa real.
    // A escolha de setor é sempre pela lista completa (sem alternância mapa/lista, sem o desenho interativo do M1).
    var vistaMapa = false;
    var listaFinal = setoresVals;
    if (vistaMapa) listaFinal = setoresVals.filter(function (s) { return s.aberto === 'true'; }).map(function (s) { return Object.assign({}, s, { comCartao: false, soPainel: 'true' }); });

    /* ---- avisos ---- */
    var avisos = [];
    var ac = avisoDeCiclo(); if (ac) avisos.push(ac);
    var av = avisoDeVenda(venda); if (av) avisos.push(av);
    // rosto de quem compra (E-07): o banner é do M3 (IngresseRosto.montarBanner, no encaixe da tela); aqui só o botão da etapa muda de rótulo
    var rostoEu = rostoDe('eu');
    if (ui.tomado) avisos.push(aviso('jf-aviso-tomado', 'warning', txt('JF-E-01', { assento: ui.tomado.assento, fileira: ui.tomado.fileira }), { acoes: [
      { txt: txt('JF-E-01a'), cls: 'linkbtn', pick: function () { setUi({ tomado: null, setorAberto: ui.tomado.setor }); foca('jf-painel-t-' + ui.tomado.setor, { atraso: 60 }); } },
      { txt: txt('JF-E-01b'), cls: 'linkbtn', pick: function () { var q = comp.state.jf; var t = ui.tomado; var sT = POR_ID[t.setor]; var f = R.sugerirVizinhos(sT, 1, ocupados(cartLer(), sT.id)); if (f) { mutar(function (cc) { cc.itens.push(novoItem(cc, sT.id, tipoPadrao(sT, f.assentos[0]), f.fileira, f.assentos[0])); }, ''); } setUi({ tomado: null, setorAberto: t.setor }); void q; } }] }));
    if (c.liberado && (rv.estado === 'acabou' || c.avisoAcabou)) avisos.push(aviso('jf-aviso-acabou', 'warning', txt('JF-E-05'), { acoes: [{ txt: txt('JF-E-05a'), cls: 'bs bs-sm', pick: function () { var cc = cartLer(); cc.liberado = false; cc.avisoAcabou = false; cc.perdidos = 0; cartGravar(cc); holdGravar(0); sincronizarReserva(cc); setUi({ vivo: '' }); } }] }));
    else if (rv.estado === 'urgente' && hasItems && !ui.dispensaUrgente) avisos.push(aviso('jf-aviso-urgente', 'warning', txt('JF-E-04'), { role: 'status', acoes: [{ txt: txt('JF-E-04a'), cls: 'linkbtn', pick: function () { setUi({ dispensaUrgente: true }); } }] }));
    if (qs.get('estado') === 'lugares-nao-conferem' && !ui.dispensaNaoConferem) avisos.push(aviso('jf-aviso-nao-confere', 'warning', txt('JF-E-02'), { acoes: [{ txt: txt('JF-E-02a'), cls: 'bs bs-sm', pick: function () { mutar(function (cc) { cc.itens = cc.itens.filter(function (i) { return !i.fileira; }); }, ''); setUi({ dispensaNaoConferem: true }); } }] }));
    if (qs.get('estado') === 'reserva-indisponivel') avisos.push(aviso('jf-aviso-reserva-indisp', 'warning', txt('JF-E-03'), { acoes: [{ txt: txt('JF-E-03a'), cls: 'linkbtn', pick: function () { setUi({ mapaFalhou: true }); } }, { txt: txt('JF-E-03b'), cls: 'linkbtn', pick: function () { irPara(urlCom({ estado: null })); } }] }));
    if (ui.mapaFalhou && qs.get('estado') !== 'reserva-indisponivel') avisos.push(aviso('jf-aviso-mapa', 'neutral', txt('JF-E-22'), { acoes: [{ txt: txt('JF-E-03b'), cls: 'linkbtn', pick: function () { irPara(urlCom({ estado: null })); } }] }));   // o M1 falou («mapa lento» ou «falha»): a lista assume e o aviso diz o que fazer
    if (ui.setorUrl && POR_ID[ui.setorUrl]) {
      var eU = R.estadoSetor(J, POR_ID[ui.setorUrl], ctx, ocupados(c, ui.setorUrl), sobrescreveSetor(POR_ID[ui.setorUrl], ui));
      if (eU.k === 'plano') avisos.push(aviso('jf-aviso-setor-url', 'neutral', txt('JF-E-18', { lista: listaNomes(R.setoresDoPlano(J, ctx.plano)) })));
      else if (eU.k === 'esgotado') avisos.push(aviso('jf-aviso-setor-url', 'neutral', txt('JF-E-21a')));
      else if (eU.k === 'direito') avisos.push(aviso('jf-aviso-setor-url', 'neutral', txt('JF-1-47')));
    }
    (ui.erros || []).forEach(function (er, n) { avisos.push(aviso('jf-aviso-erro-' + n, 'warning', er.texto, er.acao ? { acoes: [er.acao] } : {})); });

    /* ---- resumo, produtos e botão ---- */
    var pc = ctxProdutos();
    var cat = P ? P.catalogo(pc) : [], prdEst = c.prd ? Object.assign(P ? P.estadoVazio() : {}, c.prd) : (P ? P.estadoVazio() : null), ing = ingressosParaProdutos(total);
    var mp = null, resumoPrd = {};
    if (P && prdEst) {
      if (total === 0) comp.__prdEntra = false; else if (comp.__prdTinha === false) comp.__prdEntra = true;
      comp.__prdTinha = total > 0;
      mp = P.montar({ ctx: pc, cat: cat, est: prdEst, ing: ing, numero: '2', entra: !!comp.__prdEntra, atual: function () { var x = cartLer(); return Object.assign(P.estadoVazio(), x.prd || {}); },
        atualizar: function (patch) { mutar(function (cc) { cc.prd = Object.assign({}, Object.assign(P.estadoVazio(), cc.prd || {}), patch); }, ''); } });
      if (mp.res.mudou && !comp.__prdPend) {
        comp.__prdPend = true;
        setTimeout(function () { comp.__prdPend = false; mutar(function (cc) { cc.prd = Object.assign({}, Object.assign(P.estadoVazio(), cc.prd || {}), { sel: mp.res.sel, avisos: mp.res.avisos }); }, ''); }, 0);
      }
      var cartP = carrinhoCompleto(c);
      resumoPrd = P.resumoVals({ produtos: cartP.produtos }, P.hrefEditar(pc));
    }
    var cartFull = carrinhoCompleto(c);
    var passa = R.podeSeguirDeSetor(J, c.itens, ctx, { ciclo: ciclo, venda: venda, reserva: rv.estado, exigeRosto: rostoBloqueiaCompra(), rostoCompradorOk: R.rostoOk(rostoEu) });
    var bloqueado = !!ciclo || venda.estado !== 'ok' || !hasItems || rv.estado === 'acabou';
    var goNext = function (e) {
      if (ciclo || venda.estado !== 'ok') { foca(ciclo ? 'jf-aviso-ciclo' : 'jf-aviso-venda'); return; }
      if (!hasItems) { ix().toast(numeradoAlgum ? txt('JF-1-44a') : txt('JF-1-44')); return; }
      if (rv.estado === 'acabou') { foca('jf-aviso-acabou'); return; }
      var er = R.validarCarrinho(J, c.itens, ctx);
      if (er.length) { setUi({ erros: er.map(erroRegra) }); foca('jf-aviso-erro-0'); return; }
      if (passa.motivo === 'rosto') { clicaRosto(PESSOA_EU(), e && e.currentTarget, function () { setUi({}); }); return; }
      if (P) {
        var rvp = P.revalidar(pc, cat, prdEst, ing, {});
        if (rvp.ajustou) { mutar(function (cc) { cc.prd = Object.assign({}, Object.assign(P.estadoVazio(), cc.prd || {}), { sel: rvp.sel, avisos: rvp.avisos, erroUsado: (cc.prd && cc.prd.erroUsado) || rvp.usouErro }); }, ''); if (window.IX && window.IX.revelar) window.IX.revelar('prd-aviso-0', { foco: true, espera: 80 }); return; }
      }
      var cc2 = cartLer(); cartGravar(cc2);
      store.del(P ? P.chavePagErro : 'prdPagErro');
      irPara(passoHref(2));
    };
    var pr = partesReserva();
    var holdOn = hasItems && fim > 0;
    var expiradoHold = rv.estado === 'acabou';
    var nIng = total + ' ' + plural(total, 'ingresso', 'ingressos');
    var peopleLine = P && cartFull.produtos ? P.fraseProdutos(['ingresso', 'ingressos'], total, cartFull.produtos.n) : nIng;
    var cbarNote = hasItems ? (cartFull.produtos && P ? P.fraseProdutos(['ingresso', 'ingressos'], total, cartFull.produtos.n, ' e ') : nIng) : txt('JF-1-45');
    var ctaTx = passa.motivo === 'rosto' ? txt('JF-1-10') : txt('JF-1-43');
    var v = Object.assign(cabecalho(1, jogoHref(), txt('JF-ET-VOLTAR-JOGO', { jogo: jogoTitulo() })), {
      jfOn: true, jfOff: false, jfH1: txt(numeradoAlgum ? 'JF-1-02' : 'JF-1-01'), jfLead: txt('JF-1-03', { jogo: jogoTitulo(), quando: jogoQuando(), estadio: J.estadio.nome }),
      jfTemAvisos: avisos.length > 0, jfAvisos: avisos,
      jfSetorAberto: true, jfSecTitulo: txt('JFX-SETOR-ESCOLHA'),
      jfTemFiltro: SETORES.some(function (s) { return s.tipo === 'pcd'; }) && PESSOA.perfil !== 'visitante', jfFiltroOn: ui.filtroPcd ? 'true' : 'false', jfFiltroTx: txt('JF-1-17'),
      jfFiltroPick: function () { setUi({ filtroPcd: !ui.filtroPcd }); },
      jfTemMapa: false, jfMapaAlt: txt('JFX-MAPA-IMG'), jfVistaAria: txt('JFX-VISTA-ARIA'), jfVistaMapaTx: txt('JF-1-11', null, 0), jfVistaListaTx: txt('JF-1-11', null, 1),
      jfVistaMapaOn: ui.vista === 'mapa' ? 'true' : 'false', jfVistaListaOn: ui.vista === 'lista' ? 'true' : 'false',
      jfVistaMapaPick: function () { setUi({ vista: 'mapa' }); }, jfVistaListaPick: function () { setUi({ vista: 'lista' }); },
      jfMapaVisivel: true, jfOrientaMapa: ehDesktop() ? txt('JF-1-12d') : txt('JF-1-12'), jfLegendaAria: txt('JFX-LEGENDA-ARIA'),
      jfLegenda: ['ok', 'poucos', 'esgotado', 'plano', 'visitante', 'acessivel'].map(function (k) { return { k: k, tx: txt('JF-1-14', null, k) }; }),
      jfSetores: listaFinal, jfSemSetores: !vistaMapa && listaFinal.length === 0, jfSemSetoresTx: txt('JFX-SEM-SETORES'),
      jfResumoTitulo: txt('JF-1-40'), jfTotalRot: txt('JF-1-42'), jfVazioResumo: txt('JF-1-45'), jfDicaVazio: txt('JFX-RESUMO-DICA'),
      lines: cartFull.lines, hasItems: hasItems, noItems: !hasItems, subtotal: brl(tot.subtotal), fees: txt('JFX-TAXA-VALOR'), total: brl(cartFull.total), lblSub: txt('JFX-ING-ROT'), lblTaxa: txt('JFX-TAXA-ROT'),
      peopleLine: peopleLine, holdOn: holdOn, holdExpired: expiradoHold, holdState: expiradoHold ? 'expired' : rv.estado === 'urgente' ? 'urgent' : 'ok',
      holdLeft: expiradoHold ? '' : rv.texto, holdMsgA: expiradoHold ? txt('JF-E-05') : pr[0].replace(/\s+$/, ''), holdMsgB: expiradoHold ? '' : pr[1],
      goNext: goNext, ctaDisabled: bloqueado ? 'true' : 'false', ctaLabel: ctaTx, ctaShort: passa.motivo === 'rosto' ? txt('JF-1-06') : ctaTx,
      cbarNote: cbarNote, cbarTotal: hasItems ? brl(cartFull.total) : '', jfCbarAria: txt('JFX-CBAR-ARIA'),
      jfGarantias: txt('JFX-GARANTIAS', { entrada: entradaTexto() }).map(function (t) { return { t: t }; }), jfGarantiasAria: txt('JFX-GARANTIAS-ARIA'),
      jfVivo: ui.vivo || ''
    }, protoBase([protoReserva(function () { holdGravar(Date.now() + 60000); setUi({}); }, function () { holdGravar(Date.now() - 1); setUi({}); })]), mp ? mp.vm : {}, resumoPrd);
    return v;
  }
  function entradaTexto() { var m = J.entrada.metodo; return txt(m === 'face' ? 'JFX-ENTRADA-FACE' : m === 'qr' ? 'JFX-ENTRADA-QR' : 'JFX-ENTRADA-AMBOS'); }
  function listaNomes(ids) { var n = ids.map(nomeSetor); return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1]; }
  function erroRegra(er) {
    var v = er.vars || {};
    switch (er.id) {
      case 'limite-pessoa': return { texto: txt('JF-E-16', v) };
      case 'limite-visitante': return { texto: txt('JF-E-16v', v) };
      case 'meia-limite': return { texto: txt('JF-E-17', v) };
      case 'checkin-socio': return { texto: txt('JF-E-19') };
      case 'responsavel-setor': return { texto: txt('JFX-E15-RESP'), acao: { txt: txt('JFX-E15-ACAO'), cls: 'linkbtn', pick: function () { var u = (v.setor && POR_ID[v.setor]) ? v.setor : null; if (u) foca('jf-setor-bt-' + u); } } };
    }
    return { texto: '' };
  }

  /** Setor sem assento marcado: uma linha por tipo, com o degrau de quantidade (limite diz o motivo). */
  function montarTipos(item, s, e, ts, ui, c, lim, mutar) {
    var total = c.itens.length, naSetor = c.itens.filter(function (i) { return i.setor === s.id; }).length;
    item.temTipos = true;
    item.tipos = ts.map(function (t) {
      var q = c.itens.filter(function (i) { return i.setor === s.id && i.tipo === t.id; }).length;
      var porLimite = total >= lim, porEstoque = e.livres != null && naSetor >= e.livres;
      var noInc = !t.ok || porLimite || porEstoque;
      var rot = rotuloDoTipo(t.id);
      var motivo = !t.ok ? txt(t.motivo === 'meia-limite' ? 'JF-E-17' : 'JF-E-19', t.vars || {}) : porLimite ? txt(PESSOA.perfil === 'visitante' ? 'JF-E-16v' : 'JF-E-16', { n: lim }) : porEstoque ? txt('JF-E-21b') : '';
      var nota = t.id === 'meia' ? txt('JF-1-24') : t.id === 'crianca' ? '' : t.id === 'pcd' ? txt('JF-1-28') : t.id === 'acompanhante' ? txt('JF-1-29') : t.id === 'socio' ? planoRotulo() : txt('JF-1-23');
      return { rot: rot, nota: nota, motivo: motivo, preco: brl(t.preco), qty: q, off: t.ok ? 'false' : 'true', noDec: q === 0, noInc: noInc,
        grupoLabel: rot + ', ' + s.nome, qtyLabel: q + (q === 1 ? ' escolhido' : ' escolhidos'), decLabel: 'Remover ' + rot + ', ' + s.nome, incLabel: 'Adicionar ' + rot + ', ' + s.nome,
        dec: function () { mutar(function (cc) { for (var k = cc.itens.length - 1; k >= 0; k--) if (cc.itens[k].setor === s.id && cc.itens[k].tipo === t.id) { cc.itens.splice(k, 1); break; } }, rot + ': ' + Math.max(0, q - 1)); },
        inc: function () { if (noInc) return; mutar(function (cc) { cc.itens.push(novoItem(cc, s.id, t.id, null, null)); }, rot + ': ' + (q + 1)); } };
    });
  }

  /** Setor numerado: «Encontrar lugares» devolve N lugares lado a lado; a lista «Seus lugares» troca o tipo por assento. A grade de assentos é do M1 (contrato montarAssentos). */
  function montarAssentosStub(item, s, e, ocS, ui, c, ctx, lim, mutar, setUi) {
    var meus = c.itens.filter(function (i) { return i.setor === s.id; });
    var total = c.itens.length, restante = Math.max(0, lim - total);
    var padraoN = s.tipo === 'pcd' ? 2 : Math.min(2, Math.max(1, restante));
    var n = Math.min(ui.quantos[s.id] || padraoN, Math.max(1, lim));
    var maxN = s.tipo === 'pcd' ? Math.min(2, lim) : lim;
    item.temAssentos = true; item.temStub = !window.IngresseMapaEstadio;
    item.orientaAssentos = txt('JF-1-31', { n: n, lugar: txt(n === 1 ? 'JF-1-31u' : 'JF-1-31p') });
    item.quantosGrupo = txt('JFX-QUANTOS'); item.quantos = n; item.quantosNoDec = n <= 1; item.quantosNoInc = n >= maxN;
    item.quantosLabel = txt('JFX-QUANTOS-N', { n: n, ingresso: txt('JFX-INGRESSO')[n === 1 ? 0 : 1] });
    item.quantosDecLabel = 'Diminuir a quantidade de ingressos'; item.quantosIncLabel = 'Aumentar a quantidade de ingressos';
    item.quantosDec = function () { var q = Object.assign({}, ui.quantos); q[s.id] = Math.max(1, n - 1); setUi({ quantos: q }); };
    item.quantosInc = function () { var q = Object.assign({}, ui.quantos); q[s.id] = Math.min(maxN, n + 1); setUi({ quantos: q }); };
    item.encontrarTx = txt('JF-1-32');
    var r = ui.res[s.id];
    item.temResultado = !!r; item.resultado = r ? r.txt : '';
    item.encontrar = function () {
      var cc = cartLer(), res = Object.assign({}, comResUi());
      if (cc.itens.length + n > lim) { var erros = [{ texto: txt(PESSOA.perfil === 'visitante' ? 'JF-E-16v' : 'JF-E-16', { n: lim }) }]; setUi({ erros: erros }); foca('jf-aviso-erro-0'); return; }
      var f = R.encontrarJuntos(s, n, ocupados(cc, s.id));
      if (!f) { res[s.id] = { txt: txt('JF-1-34', { n: n }) }; setUi({ res: res }); return; }
      mutar(function (c2) { f.assentos.forEach(function (a) { c2.itens.push(novoItem(c2, s.id, tipoPadrao(s, a), f.fileira, a)); }); }, '');
      res[s.id] = { txt: f.assentos.length === 1 ? txt('JF-1-33u', { fileira: f.fileira, de: f.assentos[0] }) : txt('JF-1-33', { n: f.assentos.length, fileira: f.fileira, de: f.assentos[0], ate: f.assentos[f.assentos.length - 1] }) };
      setUi({ res: res, vivo: res[s.id].txt });
    };
    function comResUi() { return ui.res || {}; }
    item.temLugares = meus.length > 0;
    item.lugaresTitulo = txt('JFX-LUGARES-TITULO'); item.lugaresAria = txt('JFX-LUGARES-TITULO');
    item.lugares = meus.map(function (i) {
      var tipos = R.tiposDoSetor(J, s, ctx, c.itens.filter(function (x) { return x.uid !== i.uid; }));
      var papel = s.tipo === 'pcd' ? txt(R.papelDoAssento(s, i.assento) === 'pcd' ? 'JFX-PAPEL-PCD' : 'JFX-PAPEL-ACOMP') : '';
      var tx = txt('JF-1-38', { fileira: i.fileira, assento: i.assento, setor: s.nome, portao: s.portao || '' });
      var curto = 'Fileira ' + i.fileira + ' · Assento ' + i.assento;
      return { texto: curto, papel: papel || (s.portao || ''), idSelect: 'jf-tipo-' + i.uid, selectRotulo: txt('JFX-LUGAR-TIPO'), tipo: i.tipo,
        opcoes: tipos.map(function (t) { return { v: t.id, label: rotuloDoTipo(t.id) + ' · ' + brl(t.preco), off: !t.ok && t.id !== i.tipo }; }),
        muda: function (ev) { var novo = ev.target.value; mutar(function (cc) { cc.itens.forEach(function (x) { if (x.uid === i.uid) x.tipo = novo; }); }, ''); },
        removeTx: txt('JFX-LUGAR-REMOVER'), removeAria: txt('JFX-LUGAR-REMOVER-ARIA', { lugar: curto + ', ' + s.nome }),
        remove: function () { mutar(function (cc) { cc.itens = cc.itens.filter(function (x) { return x.uid !== i.uid; }); }, ''); } };
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     10. Etapa 2 · Quem vai
     A etapa é do M3 (IngresseDependentes.montar: um cartão por ingresso com Meu ingresso, Meu dependente e Outra pessoa, e o estado do rosto de cada um).
     Aqui: o contrato (os ingressos que entram, os titulares que voltam), o botão da etapa (resumo.botao) e o modal «Ir para o pagamento?».
     --------------------------------------------------------------------------------------------------------------- */
  function carrinhoDaEtapa() {
    var c = cartLer();
    if (c.itens.length) return c;
    var demo = { jogo: ID, itens: [], seq: 1, prd: null, semente: '' };
    demo.itens = itensDeExemplo(demo);
    return demo;
  }
  /** Titulares de exemplo para as etapas abertas direto com `escolhidos=1` (a criança é de Pedro; o primeiro adulto é de quem compra; os outros, de Ana). */
  function titularesDeExemplo(itens, est) {
    var t = {}, jaEu = false;
    itens.forEach(function (it, k) {
      if (it.tipo === 'crianca') t[it.uid] = { quem: 'dep', pessoaId: 'dep-pedro' };
      else if (!jaEu) { t[it.uid] = { quem: 'eu', pessoaId: 'eu' }; jaEu = true; }
      else t[it.uid] = { quem: 'outra', contato: est === 'convidado-sem-rosto' ? 'bia@exemplo.test' : 'ana@exemplo.test' };
    });
    return t;
  }
  function estadoQuem() {
    var c = carrinhoInicial();
    if (!c.itens.length) c = carrinhoDaEtapa();
    var h = holdLer(), est = qs.get('estado') || '';
    if (qs.get('escolhidos') === '1' || !h.fim) holdGravar(R.fimDaReserva(0, c.itens.length, Date.now(), J.reservaMin));
    if (est === 'reserva-acabando') holdGravar(Date.now() + 60000);
    if (est === 'reserva-acabou') holdGravar(Date.now() - 1);
    if (qs.get('escolhidos') === '1') {                       // cada abertura da URL de exemplo parte dos mesmos titulares (só a criança já vem com o dependente; o resto o M3 propõe)
      var sig = sementeAssinatura() + '|' + est, q = quemLer();
      if (q.semente !== sig) {
        var nq = { jogo: ID, t: {}, semente: sig };
        c.itens.forEach(function (it) { if (it.tipo === 'crianca' && PESSOA.perfil === 'familia') nq.t[it.uid] = { quem: 'dep', pessoaId: 'dep-pedro' }; });
        quemGravar(nq);
      }
    }
    return { jf: { aviso: '', vivo: '', resumo: null, dispensaUrgente: false }, jfNow: Date.now(), cart: carrinhoCompleto(c) };
  }
  function iniciaisDe(nome) { return String(nome || '').trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '?'; }
  /** O link que a pessoa recebe para cadastrar o rosto (copiável). */
  function linkConvite(nome, chave) { return location.origin + '/Convite.dc.html?jogo=' + ID + '&pessoa=' + encodeURIComponent(chave || nome || ''); }
  function copiar(texto, msg) {
    var ok = function () { ix().toast(msg, 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { selecionarTexto(texto); ok(); });
    else { selecionarTexto(texto); ok(); }
  }
  function selecionarTexto(t) { try { var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } catch (e) {} }

  /** Os titulares que o M3 devolveu, guardados por ingresso (uid): quem é, o id da pessoa, o contato. O rosto NÃO se guarda aqui (é da conta). */
  function salvarTitulares(itens, tit) {
    var q = quemLer(), nq = { jogo: ID, t: {}, semente: q.semente };
    tit.forEach(function (x, i) { if (!x.tipo || !itens[i]) return; nq.t[itens[i].uid] = { quem: x.tipo === 'dependente' ? 'dep' : x.tipo, pessoaId: x.pessoaId || null, nome: x.nome || '', contato: x.contato || null }; });
    quemGravar(nq);
  }
  /** O titular de um ingresso em pessoa, para as etapas 3 e 4 e a Carteira: { quem, nome, idade, pessoaId, rosto, falta, semConta, ok, contato }. */
  function resolverTitular(itens, i, q) {
    var it = itens[i], rec = q.t[it.uid], usaRosto = R.usaRosto(J) && R.entradaUsaRosto(J.entrada.metodo), bloqueia = usaRosto && R.rostoBloqueia(J);
    if (!rec) rec = it.tipo === 'crianca' ? { quem: 'dep' } : (itens.filter(function (o) { return o.tipo !== 'crianca'; })[0] === it ? { quem: 'eu', pessoaId: 'eu' } : { quem: 'outra' });
    if (rec.quem === 'eu') {
      var rEu = rostoDe('eu');
      return { quem: 'eu', nome: D.conta.pessoa.nome, pessoaId: 'eu', rosto: rEu, ok: !bloqueia || rEu === 'cadastrado', falta: usaRosto && rEu !== 'cadastrado' };
    }
    if (rec.quem === 'dep') {
      var d = dependentes().filter(function (x) { return x.id === rec.pessoaId; })[0];
      if (!d) return { quem: 'dep', nome: '', pessoaId: null, rosto: null, ok: false, falta: false, semTitular: true };
      var rD = rostoDe(d.id);
      return { quem: 'dep', nome: d.nome, idade: d.idade, pessoaId: d.id, rosto: rD, ok: !bloqueia || rD === 'cadastrado', falta: usaRosto && rD !== 'cadastrado' };
    }
    if (!rec.contato) return { quem: 'outra', nome: '', pessoaId: null, rosto: null, ok: false, falta: false, semTitular: true };
    var ct = convidado(rec.contato), rC = ct.conta ? rostoDe(ct.chave) : 'pendente';
    return { quem: 'outra', nome: rec.nome || ct.nome, pessoaId: ct.chave, rosto: rC, ok: !bloqueia || (ct.conta && rC === 'cadastrado'), falta: usaRosto && (!ct.conta || rC !== 'cadastrado'), semConta: !ct.conta, contato: ct };
  }
  function ingressosDoM3(itens) {
    return itens.map(function (it, i) {
      var s = POR_ID[it.setor];
      return { n: i + 1, setor: s.nome, setorId: s.id, fileira: it.fileira || '', assento: it.assento || '', tipo: rotuloDoTipo(it.tipo), gratuito: it.tipo === 'crianca' };
    });
  }
  function titularesParaM3(itens, q) {
    return itens.map(function (it, i) {
      var r = q.t[it.uid]; if (!r) return null;
      return { n: i + 1, tipo: r.quem === 'dep' ? 'dependente' : r.quem, pessoaId: r.pessoaId, contato: r.contato };
    });
  }
  function abrirModalPagamento(gatilho) {
    if (!modalDisponivel()) { irPara(passoHref(3)); return; }
    var bt = txt('JF-3-11');
    window.IngresseModal.abrir({ id: 'jf-modal-pag', titulo: txt('JF-3-09'), descricao: txt('JF-3-10'), gatilho: gatilho, classe: 'jf-folha',
      montar: function (m) {
        var el = window.IngresseModal.el, ir = el('button', 'bp', bt[0]), rev = el('button', 'bs', bt[1]); ir.type = 'button'; rev.type = 'button';
        ir.addEventListener('click', function () { irPara(passoHref(3)); }); rev.addEventListener('click', function () { m.fechar(true); });
        m.rodape.appendChild(ir); m.rodape.appendChild(rev);
      } });
  }
  /** Monta a etapa do M3 no encaixe (uma vez por tela) e liga o que ele devolve ao botão e ao resumo. */
  function montarQuem(comp) {
    var slot = document.querySelector('[data-jf-slot="quemvai"]'), M = M3D();
    if (!slot || !M || slot.__jfq) return;
    var c = carrinhoDaEtapa(), q = quemLer();
    slot.__jfq = M.montar(slot, {
      ingressos: ingressosDoM3(c.itens), titulares: titularesParaM3(c.itens, q), config: J, jogo: API.jogo(), facial: J.facial, regras: J.regras && J.regras.dependentes, estado: qs.get('estado') || '',
      contaEmail: 'pessoa@exemplo.com',
      aoMudar: function (tit, resumo) { var cc = carrinhoDaEtapa(); salvarTitulares(cc.itens, tit); comp.__jfResumo = resumo; comp.setState({ jfNow: Date.now() }); emitir('titulares', tit); },
      aoResponsavel: function (r) { irPara('Ingressos.dc.html?jogo=' + ID + (r && r.setorId ? '&setor=' + r.setorId : '') + '#lugares'); }
    });
    comp.__jfQuemCtl = slot.__jfq;
    comp.__jfResumo = slot.__jfq.resumo ? slot.__jfq.resumo() : null;
    if (comp.__jfResumo) comp.setState({ jfNow: Date.now() });
  }
  function quemVals(comp, base) {
    var ui = comp.state.jf, c = carrinhoDaEtapa(), now = comp.state.jfNow || Date.now();
    var itens = c.itens;
    var fim = holdLer().fim, rv = reservaVals(fim, now), ciclo = cicloAtual(), venda = vendaAtual();
    var setUi = function (patch) { comp.setState({ jf: Object.assign({}, comp.state.jf, patch), jfNow: Date.now() }); };
    var resumo = comp.__jfResumo, botao = resumo ? resumo.botao : { acao: 'bloqueado', rotulo: txt('JF-2-19'), motivo: '' };
    var fluxoBloqueado = !!ciclo || venda.estado !== 'ok' || rv.estado === 'acabou';
    var avisos = [];
    var ac = avisoDeCiclo(); if (ac) avisos.push(ac);
    var av = avisoDeVenda(venda); if (av) avisos.push(av);
    if (rv.estado === 'acabou') avisos.push(aviso('jf-aviso-acabou', 'warning', txt('JF-3-13'), { acoes: [{ txt: txt('JF-E-05a'), cls: 'bs bs-sm', href: passoHref(1) }] }));
    else if (rv.estado === 'urgente' && !ui.dispensaUrgente) avisos.push(aviso('jf-aviso-urgente', 'warning', txt('JF-E-04'), { role: 'status', acoes: [{ txt: txt('JF-E-04a'), cls: 'linkbtn', pick: function () { setUi({ dispensaUrgente: true }); } }] }));
    var continuar = function (e) {
      if (fluxoBloqueado) { foca(ciclo ? 'jf-aviso-ciclo' : venda.estado !== 'ok' ? 'jf-aviso-venda' : 'jf-aviso-acabou'); return; }
      if (!resumo) return;
      if (botao.acao === 'cadastrar') { if (comp.__jfQuemCtl && comp.__jfQuemCtl.cadastrarPendentes) comp.__jfQuemCtl.cadastrarPendentes(); return; }
      if (botao.acao === 'bloqueado') { ix().toast(botao.motivo); return; }
      abrirModalPagamento(e && e.currentTarget);
    };
    var cartFull = carrinhoCompleto(c), pr = partesReserva(), expiradoHold = rv.estado === 'acabou';
    var escolhidos = resumo ? resumo.escolhidos : 0;
    var contaSub = itens.length === 1 ? txt('JFX-CONTA-SUB-1') : txt('JFX-CONTA-SUB', { total: itens.length });
    var pagar = botao.acao === 'pagar' || botao.acao === 'cadastrar';
    return Object.assign(base || {}, cabecalho(2, passoHref(1), txt('JF-ET-VOLTAR-ETAPA', { etapa: txt('JF-ET-ROTULOS', null, 0) })), {
      jfOn: true, jfOff: false, rootStyle: 'min-height:100vh;background:var(--pagina-bg);--prog:50%',
      jfH1: txt('JF-2-01'), jfLead: txt('JF-2-02'), jfContaIniciais: D.conta.pessoa.iniciais || 'PE', jfContaTitulo: txt('JFX-CONTA-TITULO', { nome: D.conta.pessoa.nome }), jfContaSub: contaSub,
      jfTemAvisos: avisos.length > 0, jfAvisos: avisos,
      lines: cartFull.lines, subtotal: brl(cartFull.subtotal), discount: brl(0), hasDiscount: false, coupon: '', fees: txt('JFX-TAXA-VALOR'), total: brl(cartFull.total), lblSub: txt('JFX-ING-ROT'), lblTaxa: txt('JFX-TAXA-ROT'), ingressosHref: passoHref(1),
      holdState: expiradoHold ? 'expired' : rv.estado === 'urgente' ? 'urgent' : 'ok', holdExpired: expiradoHold, holdLeft: expiradoHold ? '' : rv.texto, holdMsgA: expiradoHold ? txt('JF-3-13') : pr[0].replace(/\s+$/, ''), holdMsgB: '',
      protectB: false, protectFmt: '', instLine: botao.acao === 'bloqueado' && botao.motivo ? botao.motivo : txt('JF-3-07'), busy: false, pay: continuar,
      payDisabled: fluxoBloqueado || botao.acao === 'bloqueado' ? 'true' : 'false', payLabel: botao.rotulo, payShort: botao.rotulo,
      cbarNote: expiradoHold ? txt('JF-E-05a') : txt(itens.length === 1 ? 'JF-2-18u' : 'JF-2-18', { n: escolhidos, total: itens.length }), jfCbarAria: txt('JFX-CBAR-ARIA'),
      jfGarantias: txt('JFX-GARANTIAS', { entrada: entradaTexto() }).map(function (t) { return { t: t }; }), jfGarantiasAria: txt('JFX-GARANTIAS-ARIA'),
      jfVivo: ui.vivo || '',
      simPerguntas: [], expireNow: function () {}, expireAll: function () {}
    }, protoBase([protoReserva(function () { holdGravar(Date.now() + 60000); setUi({}); }, function () { holdGravar(Date.now() - 1); setUi({}); })]), pagar ? {} : {});
  }

  /* ---------------------------------------------------------------------------------------------------------------
     11. Pedido: titulares resolvidos, cartão de ingresso (Pronto e Carteira) e fechamento
     --------------------------------------------------------------------------------------------------------------- */
  function pedidoDosItens(c, q, id) {
    var itens = c.itens;
    return {
      jogo: ID, id: id, at: Date.now(), perfil: PESSOA.perfil, plano: PESSOA.plano,
      tk: itens.map(function (it, i) {
        var t = resolverTitular(itens, i, q), s = POR_ID[it.setor];
        return { uid: it.uid, setor: it.setor, setorNome: s.nome, portao: s.portao || '', tipo: it.tipo, fileira: it.fileira || null, assento: it.assento || null, preco: R.precoReais(s, it.tipo, J, PESSOA.plano) || 0,
          quem: t.quem, nome: t.nome || '', idade: t.idade || null, pessoaId: t.pessoaId || null, depId: t.quem === 'dep' ? t.pessoaId : null, contato: t.contato ? { chave: t.contato.chave, valor: t.contato.valor, nome: t.contato.nome, conta: t.contato.conta } : null };
      })
    };
  }
  function pedidoAtual() {
    var o = store.get('jfOrder', null);
    if (o && String(o.jogo) === String(ID)) return o;
    return null;
  }
  function pedidoDemo(id) {
    var c = carrinhoInicial();
    if (!c.itens.length) { c = { jogo: ID, itens: [], seq: 1 }; c.itens = itensDeExemplo(c); }
    var q = quemLer(), ex = titularesDeExemplo(c.itens, qs.get('sit') === 'convite' ? 'convidado-sem-rosto' : '');
    var qq = { jogo: ID, t: Object.assign({}, ex, q.t) };
    var od = pedidoDosItens(c, qq, id || '#IG-482130');
    if (qs.get('escolhidos') === '1' && c.prd) od.produtos = carrinhoCompleto(c).produtos;
    return od;
  }
  function fecharPedido(comp) {
    if (comp.__jfFechado || comp.state.stage !== 'done' || qs.get('etapa') === '4') return;
    comp.__jfFechado = true;
    var c = cartLer(), q = quemLer();
    if (!c.itens.length) return;
    var o = pedidoDosItens(c, q, comp.state.orderId);
    o.total = carrinhoCompleto(c).total; o.produtos = carrinhoCompleto(c).produtos;
    store.set('jfOrder', o);
    var base = store.get('order', null); if (base && base.id === comp.state.orderId) store.del('order');
    ['jfCart', 'jfHold', 'jfQuemvai', 'jfTomados', 'jfEstadoFeito'].forEach(function (k) { store.del(k); });
  }

  function entradaVals(tk, k, modo) {
    var m = J.entrada.metodo, usaRosto = R.usaRosto(J) && R.entradaUsaRosto(m), usaQr = R.entradaUsaQr(m);
    var qrLib = usaQr && (qs.get('qr') === '1' || R.qrLiberadoEm(J) <= agoraJogo());
    var rosto = tk._rosto;
    var meia = tk.tipo === 'meia';
    var titulo, texto;
    if (usaRosto) { titulo = txt('JF-C-05'); texto = txt('JF-C-06') + (meia ? ' ' + txt('JF-C-06m') : ''); }
    else { titulo = txt('JF-C-07', null, 'titulo'); texto = txt('JF-C-07', null, 'texto'); }
    void rosto; void modo;
    return { metodo: m, titulo: titulo, texto: texto, ico: usaRosto ? ICO.rosto : ICO.qr, qrLib: qrLib, usaQr: usaQr, usaRosto: usaRosto };
  }
  /** Um cartão de ingresso por pessoa (o mesmo componente no Pronto e na Carteira). `modo`: 'pronto' | 'carteira'. */
  function cartaoIngresso(o, k, modo, rerender) {
    var tk = o.tk[k], s = POR_ID[tk.setor] || { nome: tk.setorNome, portao: tk.portao };
    var ent = entradaVals(tk, k, modo), sit = qs.get('sit') || '', primeiro = k === 0;
    var pessoaId = tk.quem === 'eu' ? 'eu' : tk.quem === 'dep' ? tk.depId : (tk.contato ? tk.contato.chave : null);
    var rosto = pessoaId ? rostoDe(pessoaId) : 'pendente';
    if (primeiro && sit === 'rosto-pendente') rosto = 'pendente';
    var convidado = tk.quem === 'outra', semConta = convidado && tk.contato && !tk.contato.conta;
    if (primeiro && sit === 'convite') { convidado = true; semConta = true; }
    var pendRosto = ent.usaRosto && rosto !== 'cadastrado';
    var chave = 'pronto', kb = 'ok';
    if (primeiro && sit === 'usado') { chave = 'usado'; kb = 'sold'; }
    else if (primeiro && sit === 'revenda') { chave = 'revenda'; kb = 'resale'; }
    else if (convidado && (semConta || pendRosto)) { chave = 'aguardando'; kb = 'trans'; }
    else if (pendRosto && rosto === 'em-analise') { chave = 'analise'; kb = 'trans'; }
    else if (pendRosto) { chave = 'falta'; kb = 'pend'; }
    var nome = tk.nome || (tk.quem === 'eu' ? D.conta.pessoa.nome : '');
    var status = txt('JF-C-08', { nome: nome }, chave);
    var hAbre = J.doorsAt ? hora(ms(J.doorsAt)) : '';
    var portaoTx = hAbre ? txt('JF-C-03p', { portao: s.portao, hora: hAbre }) : s.portao;
    var rot = txt('JF-C-03');
    var fatos = [{ rot: rot.setor, val: s.nome }];
    if (tk.fileira) { fatos.push({ rot: rot.fileira, val: tk.fileira }); fatos.push({ rot: rot.assento, val: String(tk.assento) }); }
    fatos.push({ rot: rot.portao, val: portaoTx }); fatos.push({ rot: rot.tipo, val: rotuloDoTipo(tk.tipo) });
    var papel = tk.quem === 'dep' ? txt('JF-C-04d', { nome: tk.nome, idade: tk.idade }) : tk.quem === 'outra' ? '' : '';
    var nota = '';
    if (modo === 'carteira') nota = tk.quem === 'dep' ? txt('JF-C-10', { nome: tk.nome }) : tk.quem === 'outra' ? txt('JF-C-11', { nome: tk.nome }) : (s.tipo === 'visitante' ? txt('JF-C-15', { portao: s.portao }) : txt('JF-C-14', { portao: s.portao, hora: hAbre }));
    var rEstado = '', rRotulo = tk.nome || D.conta.pessoa.nome, rTipo = tk.quem === 'dep' ? 'dependente' : tk.quem === 'outra' ? 'outra' : 'eu', pendRee = false;
    if (chave === 'falta' || chave === 'analise' || chave === 'aguardando') {
      rEstado = chave === 'analise' ? 'em-analise' : chave === 'aguardando' ? (semConta ? 'falta' : 'convite') : 'falta';
      pendRee = chave === 'aguardando' && modo === 'pronto' && semConta;
    }
    var acoes = [];
    if (modo === 'carteira') {
      var A = R.acoesDaCarteira(J, tk.tipo), tx = txt('JF-C-12');
      if (ent.qrLib && ent.usaQr) acoes.push({ txt: tx.qr, pick: function () { telaCheiaQr(tk, k); } });
      if (A.transferir && tk.quem !== 'dep' && chave === 'pronto') acoes.push({ txt: tx.transferir, pick: function (e) { abrirTransferir(tk, e && e.currentTarget, rerender); } });
      if (A.revender && chave === 'pronto') acoes.push({ txt: tx.revender, pick: function () { ix().toast(txt('JFX-SEM-TELA')); } });
      if (A.trocarSetor) acoes.push({ txt: tx.trocar, pick: function () { ix().toast(txt('JFX-SEM-TELA')); } });
      if (A.cancelar) acoes.push({ txt: tx.cancelar, pick: function () { ix().toast(txt('JFX-SEM-TELA')); } });
    }
    var qrUri = ent.qrLib && ent.usaQr && window.IngresseQR ? (window.IngresseQR.uri('jf' + tk.uid, 'INGRESSE-FUTEBOL-' + ID + '-' + tk.uid) || '') : '';
    var antesH = (J.entrada && J.entrada.qrAntesHoras) || 2;
    return {
      idTit: 'jf-ing-t-' + modo + '-' + k, k: chave, kb: kb, status: status, pend: (pendRosto || convidado && (semConta || pendRosto)) ? 'true' : 'false', nome: tk.quem === 'dep' ? tk.nome : (nome || D.conta.pessoa.nome),
      jogoLinha: jogoTitulo() + ' · ' + jogoQuando(), temPapel: !!papel, papel: papel, fatos: fatos, metodo: ent.metodo, entradaIc: ent.ico, entradaTitulo: ent.titulo, entradaTexto: ent.texto,
      qrLiberado: !!qrUri, qrUri: qrUri, qrAria: 'QR do ingresso ' + (k + 1), qrTxt: txt('JF-C-07', null, 'texto'), qrTrava: ent.usaQr && !ent.qrLib, qrTravaTxt: txt('JF-C-16', { antes: antesH + ' horas' }),
      temPend: !!rEstado, rEstado: rEstado, rNome: rRotulo, rTipo: rTipo, rPessoa: pessoaId || 'eu', rSemConta: semConta ? 'true' : 'false', pendReenviar: pendRee, reenviarTx: txt('JFX-REENVIAR-CONVITE'),
      reenviar: function () { ix().toast(txt('JF-2-12', { nome: tk.nome || '' }), 'ok'); },
      temNota: !!nota, nota: nota, temAcoes: acoes.length > 0, acoes: acoes
    };
  }
  function abrirTransferir(tk, gatilho, rerender) {
    if (!modalDisponivel()) return;
    var X = txt('JFX-C-TRANSFERIR');
    window.IngresseModal.abrir({ id: 'jf-modal-transferir', titulo: X.titulo, descricao: txt('JF-C-13'), gatilho: gatilho, classe: 'jf-folha',
      montar: function (m) {
        var el = window.IngresseModal.el, f = el('div', 'field'), l = el('label', '', X.campo); l.setAttribute('for', 'jf-transf'); var i = el('input'); i.id = 'jf-transf'; i.type = 'text'; i.autocomplete = 'off';
        var e = el('span', 'err'); e.setAttribute('aria-live', 'polite'); f.appendChild(l); f.appendChild(i); f.appendChild(e); m.corpo.appendChild(f);
        var ok = el('button', 'bp', X.botao), vol = el('button', 'bs', X.voltar); ok.type = 'button'; vol.type = 'button';
        vol.addEventListener('click', function () { m.fechar(true); });
        ok.addEventListener('click', function () { var v0 = i.value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v0) && digits(v0).length !== 11) { e.textContent = X.erro; f.setAttribute('data-err', 'true'); i.focus(); return; } m.fechar(true); ix().toast(X.feito, 'ok'); void rerender; });
        m.rodape.appendChild(ok); m.rodape.appendChild(vol);
      } });
  }
  function telaCheiaQr(tk, k) {
    if (!modalDisponivel() || !window.IngresseQR) return;
    var uri = window.IngresseQR.uri('jf' + tk.uid, 'INGRESSE-FUTEBOL-' + ID + '-' + tk.uid) || '';
    window.IngresseModal.abrir({ id: 'jf-modal-qr', titulo: txt('JF-C-07', null, 'titulo'), descricao: txt('JF-C-07', null, 'texto'), classe: 'jf-folha',
      montar: function (m) { var im = document.createElement('img'); im.src = uri; im.alt = 'QR do ingresso ' + (k + 1); im.className = 'jf-qr__grande'; m.corpo.appendChild(im); } });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     12. Etapa 3 · Como pagar (o acordeão de pagamento é o da tela comum) e etapa 4 · Pronto
     --------------------------------------------------------------------------------------------------------------- */
  function estadoPagamento() {
    var c = carrinhoInicial();
    if (!c.itens.length) c = carrinhoDaEtapa();
    var h = holdLer(), est = qs.get('estado') || '';
    if (qs.get('escolhidos') === '1' || !h.fim) holdGravar(R.fimDaReserva(0, c.itens.length, Date.now(), J.reservaMin));
    if (est === 'reserva-acabando') holdGravar(Date.now() + 60000);
    if (est === 'reserva-acabou') holdGravar(Date.now() - 1);
    var full = carrinhoCompleto(c);
    var q = quemLer();
    if (qs.get('escolhidos') === '1' && q.semente !== sementeAssinatura() + '|' + est) {
      // sem passar pelo Quem vai: titulares de exemplo para a recapitulação
      var qq = { jogo: ID, t: titularesDeExemplo(c.itens, est), semente: sementeAssinatura() + '|' + est };
      quemGravar(qq);
    }
    var cartCompat = { day: 'dom', coupon: '', lines: full.lines, holders: c.itens.map(function (i) { return { label: linhaDoItem(i), meia: i.tipo === 'meia' }; }), subtotal: full.subtotal, discount: 0, fees: 0, total: full.total, totalIngressos: full.totalIngressos, produtos: full.produtos };
    var st = { cart: cartCompat, holdEnd: holdLer().fim || Date.now() + J.reservaMin * 60000, jfNow: Date.now() };
    if (qs.get('etapa') === '4') { st.stage = 'done'; st.orderId = (pedidoAtual() && qs.get('escolhidos') !== '1' ? pedidoAtual().id : '#IG-482130'); }
    return st;
  }
  var DIAS_ROT = function (t) { return dataLonga(t) + ', às ' + hora(t); };
  function pagamentoVals(comp, base) {
    var st = comp.state, done = st.stage === 'done', c = carrinhoDaEtapa(), q = quemLer(), itens = c.itens;
    var usaRosto = R.usaRosto(J) && R.entradaUsaRosto(J.entrada.metodo);
    var ciclo = cicloAtual(), venda = vendaAtual(), now = comp.state.jfNow || Date.now();
    var fim = holdLer().fim, rv = reservaVals(fim, now), pr = partesReserva(), expiradoHold = rv.estado === 'acabou';
    var titulares = itens.map(function (it, i) { return resolverTitular(itens, i, q); });
    var etapa = done ? 4 : 3;
    var v = Object.assign(base, cabecalho(etapa, done ? jogoHref() : passoHref(2), done ? txt('JF-ET-VOLTAR-JOGO', { jogo: jogoTitulo() }) : txt('JF-ET-VOLTAR-ETAPA', { etapa: txt('JF-ET-ROTULOS', null, 1) })), {
      jfOn: true, jfOff: false, jfDone: done, isDone: false, jfH1: txt('JF-3-01'), jfOver: txt('JF-ET-DE', { n: 3, jogo: jogoTitulo() }),
      jfRecapTitulo: txt('JFX-PAG-RECAP-TITULO'), jfRecapJogo: txt('JFX-PAG-JOGO', { jogo: jogoTitulo(), quando: jogoQuando(), estadio: J.estadio.nome }), jfRecapAria: txt('JFX-ORDEM-ARIA'),
      jfEditarLugaresHref: passoHref(1, 'lugares'), jfEditarQuemHref: passoHref(2), jfEditarTx: txt('JF-3-05'), jfEditarQuemTx: txt('JFX-PAG-EDITAR-QUEM'),
      jfRecap: itens.map(function (it, i) {
        var t = titulares[i], s = POR_ID[it.setor];
        var holder = t.quem === 'eu' ? txt('JFX-VOCE', { nome: t.nome }) : t.quem === 'dep' ? txt('JF-3-03d', { nome: t.nome }) : (t.nome || 'A definir');
        var linha = it.fileira ? txt('JF-3-03', { setor: s.nome, fileira: it.fileira, assento: it.assento, tipo: rotuloDoTipo(it.tipo) }) : txt('JF-3-03L', { setor: s.nome, tipo: rotuloDoTipo(it.tipo) });
        var temSelo = usaRosto && !!t.pessoaId, ok = t.rosto === 'cadastrado';
        return { holder: holder, linha: linha, preco: brl(R.precoReais(s, it.tipo, J, PESSOA.plano) || 0), temSelo: temSelo, sit: ok ? 'rosto-ok' : 'rosto-falta', ic: ok ? ICO.ok : ICO.atencao, selo: txt('JF-3-04', null, ok ? 'ok' : 'falta') };
      }),
      jfPlanoAplicado: !!(PESSOA.plano && itens.some(function (i) { return i.tipo === 'socio'; })), jfPlanoAplicadoTx: txt('JF-3-06', { plano: planoRotulo() }),
      jfTemPend: usaRosto && J.facial === 'depois' && titulares.some(function (t) { return t.falta; }), jfPendTx: txt('JFX-PAG-PEND'),
      lblSub: txt('JFX-ING-ROT'), lblTaxa: txt('JFX-TAXA-ROT'), ingressosHref: passoHref(1), fees: txt('JFX-TAXA-VALOR'), protectB: false,
      txtRecusa: txt('JFX-PAG-RECUSA'), txtPixSub: txt('JFX-PAG-PIX-SUB'), txtPixSaem: txt('JFX-PAG-PIX-SAEM'), txtPixExpirou: txt('JFX-PAG-PIX-EXPIROU'),
      holdState: expiradoHold ? 'expired' : rv.estado === 'urgente' ? 'urgent' : 'ok', holdExpired: expiradoHold, holdLeft: expiradoHold ? '' : rv.texto, holdMsgA: expiradoHold ? txt('JF-3-13') : pr[0].replace(/\s+$/, ''), holdMsgB: '',
      cbarNote: expiradoHold ? txt('JF-E-05a') : pr[0].replace(/\s+$/, '').replace(/\.$/, '') + ' ' + rv.texto,
      backHref: passoHref(2), backAria: txt('JF-ET-VOLTAR-ETAPA', { etapa: txt('JF-ET-ROTULOS', null, 1) }),
      jfCbarAria: txt('JFX-CBAR-ARIA'), jfGarantias: txt('JFX-GARANTIAS', { entrada: entradaTexto() }).map(function (t) { return { t: t }; }), jfGarantiasAria: txt('JFX-GARANTIAS-ARIA')
    });
    // aviso do pagamento: o jogo mudou, a reserva acabou ou o assento deixou de estar disponível (nada foi cobrado)
    var av = null;
    if (ciclo) av = { var: 'warning', ico: ICO.atencao, tx: txt('JF-E-23-' + ciclo), href: jogoHref(), acao: txt('JF-E-23a') };
    else if (expiradoHold) av = { var: 'warning', ico: ICO.atencao, tx: txt('JF-3-13'), href: passoHref(1), acao: txt('JF-E-05a') };
    else if (qs.get('estado') === 'assento-tomado' && itens.some(function (i) { return i.fileira; })) { var al = itens.filter(function (i) { return i.fileira; })[0]; av = { var: 'warning', ico: ICO.atencao, tx: txt('JF-3-14', { assento: al.assento, fileira: al.fileira }), href: passoHref(1), acao: txt('JF-3-14a') }; }
    v.jfTemAvisoPag = !!av && !done; v.jfAvisoPagVar = av ? av.var : 'warning'; v.jfAvisoPagIc = av ? av.ico : ICO.atencao; v.jfAvisoPagTx = av ? av.tx : ''; v.jfAvisoPagHref = av ? av.href : '#'; v.jfAvisoPagAcao = av ? av.acao : '';
    if ((ciclo || expiradoHold) && !done) {
      v.payDisabled = 'true';
      v.pay = function () { foca('jf-aviso-pag'); };
    }
    if (!v.busy && (v.showCardForm || v.showSavedCvv) && !(ciclo || expiradoHold)) { var tp = txt('JF-3-12', { total: String(Math.round(c.itens.reduce(function (n, i) { return n + (R.precoReais(POR_ID[i.setor], i.tipo, J, PESSOA.plano) || 0); }, 0) + ((carrinhoCompleto(c).produtos && carrinhoCompleto(c).produtos.total) || 0))) }); v.payLabel = tp; v.payShort = tp; }
    v.jfProtoResumo = txt('JFX-PROTO-RESUMO');
    var G = txt('JFX-PROTO-GRUPOS'), cartaoOpt = txt('JFX-PROTO-CARTAO');
    var extra = [protoReserva(v.expireNow, v.expireAll), { rot: G.cartao, chips: ['ok', 'declined'].map(function (k) { return { label: cartaoOpt[k], on: st.sim === k ? 'true' : 'false', pick: function () { comp.setState({ sim: k }); } }; }) }];
    Object.assign(v, protoBase(extra));
    if (done) Object.assign(v, prontoVals(comp, v));
    return v;
  }
  function prontoVals(comp) {
    var o = (qs.get('etapa') === '4' && qs.get('escolhidos') === '1') ? pedidoDemo(comp.state.orderId) : (pedidoAtual() || pedidoDemo(comp.state.orderId));
    var rerender = function () { comp.setState({ jfNow: Date.now() }); };
    var ings = o.tk.map(function (_, k) { return cartaoIngresso(o, k, 'pronto', rerender); });
    var pendentes = ings.filter(function (i) { return i.temPend; }).length;
    var t0 = ms(J.kickoff), m = J.entrada.metodo;
    var palavras = txt('JF-4-01');
    var agoraFatos = [{ t: txt('JF-4-08', { como: txt(R.entradaUsaRosto(m) ? 'JF-4-08f' : 'JF-4-08q') }) }];
    if (PESSOA.perfil === 'visitante' || J.clienteVisitante) { var sv = SETORES.filter(function (s) { return s.tipo === 'visitante'; })[0]; if (sv) agoraFatos.push({ t: txt('JF-4-11', { portao: sv.portao || '', hora: J.doorsAt ? hora(ms(J.doorsAt)) : '' }) }); }
    var prodPedido = o.produtos || (comp.state.cart && comp.state.cart.produtos);
    if (prodPedido && prodPedido.n > 0) agoraFatos.push({ t: txt('JF-4-12') });
    var convite = txt('JF-4-10', { mandante: J.mandante.curto, visitante: J.visitante.curto, quando: quando(t0), estadio: J.estadio.nome });
    return {
      jfPedido: txt('JFX-PRONTO-PEDIDO', { numero: o.id }), jfPalavra1: palavras[0], jfPalavra2: palavras[1], jfPalavra3: palavras[2],
      jfFrase: txt('JF-4-02', { mandante: J.mandante.curto, visitante: J.visitante.curto, dia: DIAS_ROT(t0), estadio: J.estadio.nome }),
      jfMsg: txt('JF-4-03', { numero: o.id, contato: 'pessoa@exemplo.com' }), jfNadaFalta: pendentes === 0, jfNadaFaltaTx: txt('JF-4-07'),
      jfIngs: ings, jfAgoraTitulo: txt('JF-4-AGORA'), jfAgora: agoraFatos, jfCarteiraHref: carteiraHref(), jfVerIngressos: txt('JF-4-09', null)[0], jfChamarTx: txt('JF-4-09', null)[1],
      jfChamar: function () {
        var url = location.origin + '/' + jogoHref(), data = { title: jogoTitulo(), text: convite, url: url };
        if (navigator.share) { navigator.share(data).catch(function () {}); return; }
        copiar(convite + ' ' + url, txt('JFX-COMPARTILHADO'));
      }
    };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     13. Carteira
     --------------------------------------------------------------------------------------------------------------- */
  function estadoCarteira() { return { jf: { v: 0 }, jfNow: Date.now() }; }
  function carteiraVals(comp, base) {
    var vazio = qs.get('sit') === 'vazio';
    var o = (qs.get('escolhidos') === '1') ? pedidoDemo() : (pedidoAtual() || pedidoDemo());
    var rerender = function () { comp.setState({ jfNow: Date.now() }); };
    var ings = vazio ? [] : o.tk.map(function (_, k) { return cartaoIngresso(o, k, 'carteira', rerender); });
    var avisos = [], ciclo = cicloAtual(), t0 = ms(J.kickoff);
    if (ciclo === 'adiado') avisos.push(aviso('jf-aviso-ciclo', 'warning', txt('JF-C-18s')));
    else if (ciclo === 'cancelado') avisos.push(aviso('jf-aviso-ciclo', 'warning', txt('JF-C-19')));
    else if (ciclo === 'estadio') avisos.push(aviso('jf-aviso-ciclo', 'warning', txt('JF-C-20', { mudou: txt('JF-C-20e') })));
    else if (ciclo === 'portoes') avisos.push(aviso('jf-aviso-ciclo', 'warning', txt('JF-C-21')));
    var G = txt('JFX-PROTO-GRUPOS'), qrO = txt('JFX-PROTO-QR'), sitO = txt('JFX-PROTO-SIT');
    var chipP = function (tab, param, atual) { return Object.keys(tab).map(function (k) { return { label: tab[k], on: (atual || '') === k ? 'true' : 'false', pick: function () { var p = {}; p[param] = k === '' ? null : k; irPara(urlCom(p)); } }; }); };
    var extra = [{ rot: G.qr, chips: chipP(qrO, 'qr', qs.get('qr') || '') }, { rot: G.sit, chips: chipP(sitO, 'sit', qs.get('sit') || '') }];
    var P = PRD();
    return Object.assign(base, P ? P.pedidoVals(o.produtos || null) : {}, cabecalho(1, jogoHref(), txt('JF-ET-VOLTAR-JOGO', { jogo: jogoTitulo() })), {
      jfOn: true, jfOff: false, jfOver: txt('JFX-CARTEIRA'), jfH1: txt('JF-C-01', { mandante: J.mandante.curto, visitante: J.visitante.curto }), jfLead: txt('JF-C-02', { campeonato: J.campeonato, rodada: rodadaTx(), quando: quando(t0), estadio: J.estadio.nome }),
      jfTemAvisos: avisos.length > 0, jfAvisos: avisos, jfIngs: ings, jfVazio: ings.length === 0,
      jfVazioT: txt('JF-C-17', null, 'titulo'), jfVazioP: txt('JF-C-17', null, 'texto'), jfVazioAcao: txt('JF-C-17', null, 'botao'), jfVazioHref: 'Categoria.dc.html?c=futebol', jfVivo: ''
    }, protoBase(extra));
  }

  /* ---------------------------------------------------------------------------------------------------------------
     14. O mapa do estádio e a grade de assentos do M1 (window.IngresseMapaEstadio: montarMapa e montarAssentos; contrato 4.6)
     O M1 não sabe de preço por perfil, plano nem carrinho: recebe estados prontos por setor e por assento e devolve escolhas. Os encaixes (data-jf-slot) ficam vazios no
     modelo e o motor de templates não os toca; a cada desenho confere se continuam montados, atualiza o que mudou e desmonta o que saiu da tela.
     --------------------------------------------------------------------------------------------------------------- */
  function mutarCarrinho(comp, fn, vivo) {
    var cc = cartLer(); fn(cc); cartGravar(cc); sincronizarReserva(cc);
    comp.setState({ jf: Object.assign({}, comp.state.jf, { vivo: vivo || '', erros: [] }), jfNow: Date.now() });
    emitir('lugares', cc.itens);
  }
  function setoresParaMapa(c, ui) {
    var ctx = ctxPessoa();
    return SETORES.map(function (s) {
      var e = R.estadoSetor(J, s, ctx, ocupados(c, s.id), sobrescreveSetor(s, ui));
      var q = c.itens.filter(function (i) { return i.setor === s.id; }).length;
      var estado = e.k === 'ok' || e.k === 'fora' ? 'com-lugares' : e.k;
      var semPreco = e.k === 'esgotado' || e.k === 'visitante' || e.k === 'fora';
      return { id: s.id, nome: s.nome, tipo: s.tipo, estado: estado, motivo: e.motivo === 'visitante-info' ? 'visitante' : (e.k === 'esgotado' ? 'esgotado' : (e.motivo || '')),
        preco: semPreco ? null : R.aPartirDe(s, J, ctx), livres: e.livres, portao: s.portao, qtdEscolhida: q, oculto: !!e.oculto };
    });
  }
  function rotulosDoMapa(ctx) {
    var est = txt('JF-1-14'), km = txt('JF-1-13');
    return {
      estados: { 'com-lugares': est.ok, poucos: est.poucos, esgotado: est.esgotado, plano: est.plano, direito: est.direito, visitante: est.visitante, escolhido: est.escolhido },
      motivos: { plano: txt('JF-1-16', { lista: listaNomes(R.setoresDoPlano(J, ctx.plano)) }), direito: txt('JF-1-47'), visitante: txt('JFX-VISITANTE-INFO'), esgotado: txt('JF-E-21a') },
      ampliar: km[0], reduzir: km[1], restaurar: km[2], dicaToque: txt('JF-1-12'), dicaMouse: txt('JF-1-12d'), mapaLento: txt('JF-1-18'), verLista: txt('JF-E-22a'),
      encontrar: txt('JF-1-32'), quantos: txt('JFX-QUANTOS'), verOutrosSetores: txt('JF-1-34a'), escolherOutro: txt('JF-E-01a'),
      semJuntos: function (n) { return txt('JF-1-34', { n: n }); },
      encontramos: function (n, f, a, b) { return n === 1 ? txt('JF-1-33u', { fileira: f, de: a }) : txt('JF-1-33', { n: n, fileira: f, de: a, ate: b }); },
      escolhaAnuncio: function (f, n, qtd, max) { return txt('JFX-ASSENTO-ESCOLHIDO', { fileira: f, assento: n, n: qtd, max: max }); },
      limite: function (max) { return txt(PESSOA.perfil === 'visitante' ? 'JF-E-16v' : 'JF-E-16', { n: max }); },
      tomado: function (n, f) { return txt('JF-E-01', { assento: n, fileira: f }); }
    };
  }
  /** A grade do setor como o M1 a quer: um assento por posição (id «F-12»; `1` vendido, `0` livre; papel acessível e acompanhante nos pares). */
  function assentosParaM1(s) {
    var g = s.assentos, out = [];
    g.fileiras.forEach(function (f, i) {
      for (var n = 1; n <= g.porFileira; n++) out.push({ id: f + '-' + n, fileira: f, numero: n, estado: g.mapa[i].charAt(n - 1) === '1' ? 'indisponivel' : 'livre', papel: g.pares ? (n % 2 === 1 ? 'acessivel' : 'acompanhante') : 'cadeira' });
    });
    return out;
  }
  var mapaMontado = null, compIng = null;
  function atualizarModulos(pagina, comp) {
    if (pagina === 'ingressos') { montarBannerRosto(comp); montarMapaEAssentos(comp); }
    if (pagina === 'checkout') montarQuem(comp);
    if (pagina === 'pagamento' || pagina === 'carteira') montarCartoesDeRosto(comp);
  }
  function montarBannerRosto(comp) {
    var slot = document.querySelector('[data-jf-slot="banner-rosto"]'), M = M3R();
    if (!slot || !M || !M.montarBanner) return;
    if (!slot.__jfb) slot.__jfb = M.montarBanner(slot, { facial: J.facial, aoMudar: function () { comp.setState({ jfNow: Date.now() }); }, clube: clubeDoJogo(), prazo: prazoRosto() });
  }
  function montarMapaEAssentos(comp) {
    var M1 = window.IngresseMapaEstadio; if (!M1) return;
    var c = cartLer(), ctx = ctxPessoa(), ui = comp.state.jf;
    // ---- o mapa
    var slot = document.querySelector('[data-jf-slot="mapa"]');
    if (!slot && mapaMontado) { try { mapaMontado.inst.destruir(); } catch (e) {} mapaMontado = null; }
    if (slot && mapaMontado && mapaMontado.slot !== slot) { try { mapaMontado.inst.destruir(); } catch (e) {} mapaMontado = null; }
    if (slot && M1.montarMapa) { // sem efeito desde 31/10/2026: o quadro do mapa não tem mais o encaixe `data-jf-slot="mapa"` (é a imagem)
      var est = qs.get('estado'), dados = { setores: setoresParaMapa(c, ui), selecionado: ui.setorAberto, estadoMapa: est === 'mapa-lento' ? 'lento' : est === 'mapa-falha' ? 'falha' : 'ok',
        destaque: ui.filtroPcd ? SETORES.filter(function (x) { return x.tipo === 'pcd'; }).map(function (x) { return x.id; }) : null };
      if (!mapaMontado) {
        try {
          var inst = M1.montarMapa(slot, Object.assign({ estadio: D.estadios[J.estadioId], rotulos: rotulosDoMapa(ctx), formatarPreco: function (v) { return brl(v); },
            aoEscolher: function (id) { comp.setState({ jf: Object.assign({}, comp.state.jf, { setorAberto: id }), jfNow: Date.now() }); foca('jf-painel-t-' + id, { atraso: reduzido() ? 20 : 340 }); },
            aoFechar: function () { var id = comp.state.jf.setorAberto; comp.setState({ jf: Object.assign({}, comp.state.jf, { setorAberto: null }), jfNow: Date.now() }); if (id && mapaMontado) mapaMontado.inst.focar(id); },
            aoFalhar: function () { comp.setState({ jf: Object.assign({}, comp.state.jf, { mapaFalhou: true }), jfNow: Date.now() }); } }, dados));
          mapaMontado = { slot: slot, inst: inst, sig: '' };
        } catch (e) { comp.setState({ jf: Object.assign({}, comp.state.jf, { mapaFalhou: true }), jfNow: Date.now() }); }
      }
      if (mapaMontado) { var sig = JSON.stringify(dados); if (mapaMontado.sig !== sig) { mapaMontado.sig = sig; mapaMontado.inst.atualizar(dados); } }
    }
    // ---- a grade de assentos do setor aberto
    document.querySelectorAll('[data-jf-slot="assentos"]').forEach(function (el) {
      var id = el.getAttribute('data-setor'), s = POR_ID[id];
      if (!s || !numerado(s) || !M1.montarAssentos) return;
      var aberto = ui.setorAberto === id;
      if (!aberto) { if (el.__jfa) { try { el.__jfa.destruir(); } catch (e) {} el.__jfa = null; el.textContent = ''; } return; }
      var meus = c.itens.filter(function (i) { return i.setor === id; }), outros = c.itens.length - meus.length, lim = limiteTotal();
      var dados = { escolhidos: meus.filter(function (i) { return i.fileira; }).map(assentoId), max: Math.max(0, lim - outros), tomados: tomadosLer() };
      if (!el.__jfa) {
        el.__jfa = M1.montarAssentos(el, Object.assign({ setor: { id: id, nome: s.nome, portao: s.portao, pares: !!(s.assentos && s.assentos.pares) }, assentos: assentosParaM1(s), rotulos: rotulosDoMapa(ctx), formatarPreco: function (v) { return brl(v); },
          preco: function (a) { var n = typeof a === 'object' ? a.numero : +String(a).split('-')[1]; return R.precoReais(s, tipoPadrao(s, n), J, PESSOA.plano); },
          limiteMotivo: txt(PESSOA.perfil === 'visitante' ? 'JF-E-16v' : 'JF-E-16', { n: lim }),
          aoAlternar: function (aid, escolhido) {
            var a = R.lerAssento(aid); if (!a) return;
            mutarCarrinho(comp, function (cc) {
              var ja = cc.itens.filter(function (i) { return i.setor === id && i.fileira === a.fileira && i.assento === a.n; })[0];
              if (escolhido && !ja) { if (cc.itens.length >= limiteTotal()) return; cc.itens.push(novoItem(cc, id, tipoPadrao(s, a.n), a.fileira, a.n)); }
              else if (!escolhido && ja) cc.itens = cc.itens.filter(function (i) { return i !== ja; });
            }, '');
          },
          aoVerOutrosSetores: function () { comp.setState({ jf: Object.assign({}, comp.state.jf, { setorAberto: null }), jfNow: Date.now() }); foca('jf-t-setor', { atraso: 20 }); } }, dados));
        el.__jfSig = JSON.stringify(dados);
      } else { var sg = JSON.stringify(dados); if (el.__jfSig !== sg) { el.__jfSig = sg; el.__jfa.atualizar(dados); } }
    });
  }
  /** Cartão de estado do rosto (73) nos cartões de ingresso do Pronto e da Carteira: o M3 desenha, os cliques são daqui. */
  function montarCartoesDeRosto(comp) {
    var M = M3R(); if (!M || !M.cartaoEstadoHtml) return;
    document.querySelectorAll('[data-jf-slot="rosto-estado"]').forEach(function (el) {
      var sig = [el.getAttribute('data-estado'), el.getAttribute('data-nome'), el.getAttribute('data-tipo'), el.getAttribute('data-pessoa'), el.getAttribute('data-sem-conta')].join('|');
      if (el.__jfSig === sig) return;
      el.__jfSig = sig;
      el.innerHTML = M.cartaoEstadoHtml({ estado: el.getAttribute('data-estado'), nome: el.getAttribute('data-nome'), tipo: el.getAttribute('data-tipo'), id: el.getAttribute('data-pessoa'), semConta: el.getAttribute('data-sem-conta') === 'true' });
    });
    if (document.__jfRostoClique) return;
    document.__jfRostoClique = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-jf-slot="rosto-estado"] [data-jf-acao]'); if (!b) return;
      var el = b.closest('[data-jf-slot="rosto-estado"]'), acao = b.getAttribute('data-jf-acao'), nome = el.getAttribute('data-nome'), tipo = el.getAttribute('data-tipo'), id = el.getAttribute('data-pessoa');
      if (acao === 'cadastrar') abrirFolha({ id: id, nome: nome, tipo: tipo === 'dependente' ? 'dependente' : 'eu' }, b, function () { comp.setState({ jfNow: Date.now() }); });
      else if (acao === 'link') copiar(linkConvite(nome, id), txt('JF-2-12', { nome: nome }));
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     15. API: o subtipo de cada Component (o módulo .mjs o acrescenta ao fim do script da tela)
     --------------------------------------------------------------------------------------------------------------- */
  var ouvintes = {};
  function emitir(ev, dado) { (ouvintes[ev] || []).forEach(function (fn) { try { fn(dado); } catch (e) {} }); }
  var TITULOS = { ingressos: 'Escolha seu lugar', checkout: 'Quem vai ao jogo', pagamento: 'Confira e pague', pronto: 'Você está no jogo', carteira: 'Seus ingressos' };
  function tituloDaPagina(pagina) { return txt('JFX-TITULOS', null, pagina) + ' — ' + BASE.titulo + ' | Ingresse'; }
  var API = {
    ativo: function () { return !!BASE; },
    id: function () { return ID; },
    jogo: function () { garantirConfig(); return { id: ID, titulo: J.titulo, mandante: J.mandante, visitante: J.visitante, escudos: [J.mandante.escudo, J.visitante.escudo], campeonato: J.campeonato, rodada: J.rodada, quando: J.kickoff, estadio: J.estadio, tz: J.estadio.tz }; },
    config: function () { garantirConfig(); return Object.assign({}, J, { mapa: MAPA, params: CTX }); },
    perfil: function () { garantirConfig(); return perfil(); },
    conta: function () { garantirConfig(); return { nome: D.conta.pessoa.nome, plano: PESSOA.plano, pcd: PESSOA.pcd, dependentes: dependentes() }; },
    setores: function () { garantirConfig(); var c = cartLer(), ctx = ctxPessoa(); return SETORES.map(function (s) { return Object.assign({}, s, { estado: R.estadoSetor(J, s, ctx, ocupados(c, s.id), null) }); }); },
    estadio: function () { garantirConfig(); return D.estadios && D.estadios[J.estadioId] || null; },
    carrinho: function () { garantirConfig(); return carrinhoCompleto(cartLer().itens.length ? cartLer() : carrinhoDaEtapa()); },
    titulares: function () { garantirConfig(); var c = carrinhoDaEtapa(), q = quemLer(); return c.itens.map(function (it, i) { var t = resolverTitular(c.itens, i, q); return { n: i + 1, tipo: t.quem === 'eu' ? 'eu' : t.quem === 'dep' ? 'dependente' : 'outra', pessoaId: t.pessoaId, nome: t.nome, rosto: t.rosto, ok: t.ok, motivo: t.erro || '' }; }); },
    reserva: function () { garantirConfig(); var r = reservaVals(holdLer().fim, Date.now()); return { fim: holdLer().fim, restanteMs: r.restanteMs, estado: r.estado }; },
    contextoProdutos: function () { garantirConfig(); var x = ctxProdutos(); return { tipo: 'jogo', id: x.id, visitante: x.visitante }; },
    ingressosParaProdutos: function () { garantirConfig(); return ingressosParaProdutos((cartLer().itens.length ? cartLer() : carrinhoDaEtapa()).itens.length); },
    on: function (ev, fn) { (ouvintes[ev] = ouvintes[ev] || []).push(fn); },
    numeroIngressos: function () { garantirConfig(); return (cartLer().itens.length ? cartLer() : carrinhoDaEtapa()).itens.length; },
    frases: function (pix, n) { return txt(pix ? 'JFX-PAG-FRASES-PIX' : n === 1 ? 'JFX-PAG-FRASES-1' : 'JFX-PAG-FRASES'); },
    textoAprovado: 'Você está no jogo',
    tituloInicial: function (pagina) { return BASE ? tituloDaPagina(pagina) : ''; },
    estado: function (pagina) {
      garantirConfig();
      semearConta();
      if (pagina === 'ingressos') return estadoIngressos();
      if (pagina === 'checkout') return estadoQuem();
      if (pagina === 'pagamento') return estadoPagamento();
      if (pagina === 'carteira') return estadoCarteira();
      return {};
    },
    vals: function (pagina, comp, base) {
      garantirConfig();
      if (pagina === 'ingressos') return ingressosVals(comp);
      if (pagina === 'checkout') return quemVals(comp, base);
      if (pagina === 'pagamento') return pagamentoVals(comp, base);
      if (pagina === 'carteira') return carteiraVals(comp, base);
      return base;
    },
    montou: function (pagina, comp) {
      garantirConfig();
      var pg = pagina === 'pagamento' && comp.state.stage === 'done' ? 'pronto' : pagina;
      document.title = tituloDaPagina(pg);
      root.setAttribute('data-jogo-futebol', ID);
      if (pagina === 'ingressos') {
        compIng = comp;
        // `#lugares` (voltar e editar): chega ao bloco sem animar a entrada; o motor de templates monta depois do primeiro desenho
        if (location.hash === '#lugares') { var tentas = 0; (function ir() { var el = document.getElementById('lugares'); if (!el && tentas++ < 40) { setTimeout(ir, 60); return; } if (el) setTimeout(function () { el.scrollIntoView({ block: 'start', behavior: 'auto' }); }, 120); })(); }
        // Esc no painel de um setor fecha o painel e devolve o foco ao setor (no mapa, ao setor do mapa)
        if (!document.__jfEsc) {
          document.__jfEsc = true;
          document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || (window.IngresseModal && window.IngresseModal.aberto && window.IngresseModal.aberto())) return;
            var p = e.target.closest && e.target.closest('.jf-painel'); if (!p || !compIng) return;
            var item = p.closest('.jf-setor'), id = item && item.id ? item.id.replace('jf-setor-', '') : null; if (!id) return;
            e.preventDefault();
            compIng.setState({ jf: Object.assign({}, compIng.state.jf, { setorAberto: null }), jfNow: Date.now() });
            setTimeout(function () { var bt = document.getElementById('jf-setor-bt-' + id); if (bt) bt.focus(); else if (mapaMontado) mapaMontado.inst.focar(id); }, 60);
          });
        }
      }
      var abrir = qs.get('abrir'), est = qs.get('estado');
      var depois = function (fn) { setTimeout(fn, 400); };
      var rerender = function () { comp.setState({ jfNow: Date.now() }); };
      var M = M3R();
      if (M && M.on && !comp.__jfOuveRosto) { comp.__jfOuveRosto = true; M.on(rerender); }
      if (abrir === 'rosto') depois(function () { abrirFolhaDaUrl(null, rerender); });
      if (abrir === 'dependente' && pagina === 'checkout') depois(function () { var D3 = M3D(); if (D3) D3.abrirCadastro({ gatilho: null, regras: J.regras && J.regras.dependentes, jogo: API.jogo(), aoSalvar: rerender }); });
      if (abrir === 'transferir' && pagina === 'carteira') depois(function () { var o = qs.get('escolhidos') === '1' ? pedidoDemo() : (pedidoAtual() || pedidoDemo()); abrirTransferir(o.tk[0], null); });
      if (est === 'outro-aparelho' && pagina === 'ingressos') depois(function () {
        if (!modalDisponivel()) return;
        window.IngresseModal.abrir({ id: 'jf-outro-aparelho', titulo: txt('JF-E-06t'), descricao: txt('JF-E-06'), classe: 'jf-folha',
          montar: function (m) { var el = window.IngresseModal.el, a = el('button', 'bp', txt('JF-E-06a')), b = el('button', 'bs', txt('JF-E-06b')); a.type = 'button'; b.type = 'button';
            a.addEventListener('click', function () { m.fechar(true); }); b.addEventListener('click', function () { irPara(jogoHref()); }); m.rodape.appendChild(a); m.rodape.appendChild(b); } });
      });
    },
    atualizou: atualizarModulos,
    fecharPedido: fecharPedido
  };
  void TITULOS;
  window.IngresseJornadaFutebol = API;
  if (BASE) { root.setAttribute('data-jogo-futebol', ID); document.title = tituloDaPagina(PAG === 'pagamento' && qs.get('etapa') === '4' ? 'pronto' : PAG); }
})();
