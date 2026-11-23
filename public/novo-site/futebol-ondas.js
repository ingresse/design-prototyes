/* futebol-ondas.js (GERADO por tools/previa/gerar-dados-futebol-confronto.mjs; não edite à mão)
   Contrato: docs/produto/FUTEBOL-CONFRONTO-DADOS.md.
   window.IngresseFutebolOndas.derivar(jogo, agoraMs, viewer) -> { asOf, viewer, windows[{id,state,eligible,isGeneral,mine,group}], saleSummary, nextOpening, nextClosing, notifyByEmail }
     viewer = { kind: "anonymous" | "member" | "notMember", plan: "<rótulo do plano na API do clube>", entry: "club-site" | "ingresse-login" | null }  (omitido = anonymous)
   window.IngresseFutebolOndas.conferirEstado(jogo, agoraMs|()=>agoraMs, viewer, {waveId, atrasoMs, falhar}) -> Promise do estado novo (a conferência depois do zero)
   window.IngresseFutebolOndas.aguardarConfirmacao(promessa, limiteMs = 3000) -> Promise { confirmed, timedOut, late | estado | failed }
   window.IngresseFutebolOndas.criarRelogio(serverNowIso) -> { agora(), reajustar(serverNowIso), simular(ms), avancar(ms), definir(ms), zerar(), diferenca() }
   A hora é a do servidor: o aparelho só mede o intervalo (diferença guardada ao abrir e reajustada ao voltar à aba). Nunca use Date.now() sozinho.
   simular/avancar/definir existem para o painel da demonstração (relógio simulado). */
(function (root) {
  "use strict";
  var derivar = function(jogo, agoraMs, viewer) {
  viewer = viewer || { kind: "anonymous", plan: null, entry: null };
  var chave = function (t) { return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var meuPlano = viewer.kind === "member" && viewer.plan ? "plan:" + chave(viewer.plan) : null;
  var ms = function (iso) { return Date.parse(iso); };
  var fim = ms(jogo.endsAt);
  var limite = (jogo.saleDisplay && jogo.saleDisplay.countdownFromHours != null ? jogo.saleDisplay.countdownFromHours : 24) * 3600000;
  var ehSocio = function (a) { return a === "members" || a.indexOf("plan:") === 0; };
  var estadoOnda = function (w) {
    if (!w.opensAt) return "scheduled"; // sem data de abertura ainda (V03)
    if (w.soldOutAt && agoraMs >= ms(w.soldOutAt) && agoraMs >= ms(w.opensAt)) return "soldOut"; // esgotou depois de abrir
    if (agoraMs < ms(w.opensAt)) return "scheduled";
    if (agoraMs >= ms(w.closesAt)) return "closed"; // a janela fechou sem esgotar
    return "open";
  };
  // quem pode comprar na janela (nulo = ainda não sabemos quem é a pessoa)
  var elegivel = function (w) {
    if (viewer.kind === "anonymous") return null;
    return w.audiences.some(function (a) {
      if (a === "general") return true; // a venda ao público geral é sempre da pessoa
      if (a === "visitor") return jogo.clientSide === "away";
      if (viewer.kind !== "member") return false;
      return a === "members" || a === meuPlano;
    });
  };
  var minha = function (w) { return viewer.kind === "member" && w.audiences.some(function (a) { return a === "members" || a === meuPlano; }); };
  var todas = jogo.waves.map(function (w) {
    return { id: w.id, label: w.label, displayName: w.displayName || w.label, audienceLabel: w.audienceLabel || null, shortName: w.shortName || null, audiences: w.audiences, plan: w.plan, priority: w.priority, opensAt: w.opensAt, closesAt: w.closesAt, state: estadoOnda(w), eligible: elegivel(w), isGeneral: w.audiences.indexOf("general") >= 0, mine: minha(w), change: w.change };
  });
  var porHora = function (a, b) { var ta = a.opensAt ? ms(a.opensAt) : Infinity, tb = b.opensAt ? ms(b.opensAt) : Infinity; return (ta === tb ? 0 : ta < tb ? -1 : 1) || (a.priority || 0) - (b.priority || 0); };
  var cand = viewer.kind === "anonymous" ? todas : todas.filter(function (w) { return w.eligible; });
  var abertas = cand.filter(function (w) { return w.state === "open"; });
  var porAbrir = cand.filter(function (w) { return w.state === "scheduled"; }).sort(porHora);
  var esgotadas = cand.filter(function (w) { return w.state === "soldOut"; });
  // para o resumo, só contam como "por abrir" as janelas de sócios e do público geral (a do visitante conta na página do visitante)
  var relevantes = porAbrir.filter(function (w) { return jogo.clientSide === "away" || w.audiences.some(function (a) { return a === "general" || ehSocio(a); }); });
  var tz = jogo.venue.timezone, tzLabel = jogo.venue.timezoneLabel;
  var abertura = function (w) {
    if (!w) return null;
    if (!w.opensAt) return { waveId: w.id, label: w.label, displayName: w.displayName || w.label, audienceLabel: w.audienceLabel || null, shortName: w.shortName || null, audiences: w.audiences, plan: w.plan, priority: w.priority, at: null, local: null, timezone: tz, timezoneLabel: tzLabel, msUntil: null, showCountdown: false, countdownFromHours: limite / 3600000 };
    var falta = ms(w.opensAt) - agoraMs;
    return { waveId: w.id, label: w.label, displayName: w.displayName || w.label, audienceLabel: w.audienceLabel || null, shortName: w.shortName || null, audiences: w.audiences, plan: w.plan, priority: w.priority, at: new Date(ms(w.opensAt)).toISOString(), local: w.opensAt, timezone: tz, timezoneLabel: tzLabel, msUntil: falta, showCountdown: falta < limite, countdownFromHours: limite / 3600000 };
  };
  var fechamento = abertas.slice().sort(function (a, b) { return ms(a.closesAt) - ms(b.closesAt); })[0];
  var diaLocal = function (t) { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); };
  var proxima = abertura(porAbrir[0]);
  var proximaRel = abertura(relevantes[0]);
  // ordem de exibição: as janelas da pessoa primeiro, a do público geral sempre visível, as demais depois
  var grupo = function (w) {
    if (viewer.kind === "anonymous") return "all";
    if (w.mine) return "mine";
    if (w.eligible && w.isGeneral) return "general";
    if (w.eligible) return "eligible";
    return "other";
  };
  var ordem = { all: 0, mine: 0, general: 1, eligible: 2, other: 3 };
  var janelas = todas.map(function (w) { return { id: w.id, state: w.state, eligible: w.eligible, isGeneral: w.isGeneral, mine: w.mine, group: grupo(w) }; })
    .sort(function (a, b) { var wa = todas.filter(function (x) { return x.id === a.id; })[0], wb = todas.filter(function (x) { return x.id === b.id; })[0]; return ordem[a.group] - ordem[b.group] || porHora(wa, wb); });
  var resumo, acao, avisos = [];
  var vivo = jogo.lifecycle === "scheduled" && agoraMs < fim;
  var haSocios = jogo.waves.some(function (w) { return w.audiences.some(ehSocio); });
  if (jogo.lifecycle === "cancelled") { resumo = { code: "cancelled", badge: { kind: "cancelled" } }; acao = "see_refund"; }
  else if (jogo.lifecycle === "postponed") { resumo = { code: "postponed", badge: { kind: "postponed" } }; acao = "see_options"; }
  else if (jogo.lifecycle === "changed") { resumo = { code: "changed", badge: { kind: "changed" } }; acao = "see_changes"; } // V18: estádio, mando ou portões mudaram
  else if (agoraMs >= fim) { resumo = { code: "ended", badge: { kind: "match_played" } }; acao = "see_next_home_game"; }
  else if (jogo.degraded) { resumo = { code: "degraded", badge: { kind: "degraded" } }; acao = "retry"; } // V21: o ticket-backend não respondeu
  else if (abertas.length) {
    var geral = abertas.some(function (w) { return w.isGeneral; });
    var soSocios = abertas.every(function (w) { return w.audiences.every(ehSocio); });
    var soVisitante = abertas.every(function (w) { return w.audiences.every(function (a) { return a === "visitor"; }); });
    var soAcessib = abertas.every(function (w) { return w.audiences.every(function (a) { return a === "accessibility"; }); });
    resumo = { code: "on_sale", badge: { kind: geral ? "on_sale" : soSocios ? "members_sale" : soVisitante ? "visitor_sale" : soAcessib ? "accessibility_sale" : "on_sale", openWaves: abertas.map(function (w) { return w.id; }) } };
    // um botão principal só; mais de uma janela restrita aberta e a geral ainda não = "Ver datas de venda" (V07)
    acao = geral ? "choose_sector" : abertas.length > 1 ? "see_dates" : soSocios ? "buy_members" : soVisitante ? "buy_visitor" : soAcessib ? "buy_accessibility" : "choose_sector";
  } else if (relevantes.length) {
    // "Venda geral em X": a venda geral por abrir depois de a dos sócios já ter começado (esgotada, aberta ou encerrada)
    var geralDepois = relevantes[0].isGeneral && jogo.waves.some(function (w) { return w.audiences.some(ehSocio) && estadoOnda(w) !== "scheduled"; });
    resumo = { code: "scheduled", badge: { kind: geralDepois ? "general_soon" : "sale_soon", at: proximaRel.at, local: proximaRel.local } };
    acao = "notify_me";
  } else if (viewer.kind === "notMember" && haSocios && !cand.length) { resumo = { code: "members_only", badge: { kind: "members_only" } }; acao = "notify_me"; } // V05 sem janela do geral
  else if (!jogo.waves.length) { resumo = { code: "scheduled", badge: { kind: "sale_soon", at: null, local: null } }; acao = "notify_me"; } // V03: sem data de abertura
  else if (esgotadas.length) { resumo = { code: "sold_out", badge: { kind: "sold_out" } }; acao = "join_queue"; } // só quando nenhuma janela está aberta com estoque nem por abrir
  else { resumo = { code: "closed", badge: { kind: "sales_closed" }, matchDay: diaLocal(agoraMs) === diaLocal(ms(jogo.kickoff)) }; acao = "see_next_home_games"; } // V22 quando matchDay; plural, como no escopo (o singular fica só para o jogo realizado, V15)
  cand.forEach(function (w) { if (w.change && w.state === "scheduled") avisos.push({ code: "sales_window_changed", waveId: w.id, kind: w.change.kind, previousOpensAt: w.change.previousOpensAt, changedAt: w.change.changedAt }); });
  resumo.primaryAction = acao;
  resumo.notices = avisos;
  return {
    asOf: new Date(agoraMs).toISOString(),
    viewer: { kind: viewer.kind, plan: viewer.kind === "member" ? viewer.plan || null : null, entry: viewer.entry || null },
    windows: janelas,
    saleSummary: resumo,
    nextOpening: vivo ? proxima : null,
    nextClosing: fechamento && vivo ? { waveId: fechamento.id, label: fechamento.label, at: new Date(ms(fechamento.closesAt)).toISOString(), local: fechamento.closesAt, timezone: tz, timezoneLabel: tzLabel } : null,
    notifyByEmail: { available: !!(jogo.notifyByEmail && jogo.notifyByEmail.available), needsEmailField: viewer.kind === "anonymous", subscribed: false },
  };
};
  function criarRelogio(serverNowIso) {
    var diferenca = Date.parse(serverNowIso) - Date.now(); // servidor menos aparelho
    var sim = 0;
    return {
      agora: function () { return Date.now() + diferenca + sim; },
      reajustar: function (iso) { diferenca = Date.parse(iso) - Date.now(); },
      simular: function (ms) { sim = ms; },
      avancar: function (ms) { sim += ms; },
      definir: function (alvoMs) { sim = alvoMs - (Date.now() + diferenca); },
      zerar: function () { sim = 0; },
      diferenca: function () { return diferenca; }
    };
  }
  var ESPERA_MAXIMA_MS = 3000; // o "Abrindo…" espera a confirmação por até 3 s
  // Em zero o cliente pergunta ao servidor "e agora?". Aqui o servidor é simulado: devolve (numa Promise) o estado novo calculado no instante pedido.
  //   agoraMs: número, ou função que devolve o instante QUANDO a resposta sai (o relógio simulado continua andando durante o atraso)
  //   opcoes.waveId: a janela que acabou de zerar (devolve opened e waveState); opcoes.atrasoMs: atraso da confirmação (teste do caso "chega depois de 3 s");
  //   opcoes.falhar: o servidor não responde (a Promise é rejeitada depois do atraso)
  function conferirEstado(jogo, agoraMs, viewer, opcoes) {
    opcoes = opcoes || {};
    var atraso = Math.max(0, opcoes.atrasoMs || 0);
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        if (opcoes.falhar) { reject(new Error("sem resposta do servidor")); return; }
        var t = typeof agoraMs === "function" ? agoraMs() : agoraMs;
        var estado = derivar(jogo, t, viewer);
        var janela = opcoes.waveId ? estado.windows.filter(function (w) { return w.id === opcoes.waveId; })[0] : null;
        estado.confirmed = true;
        estado.delayMs = atraso;
        estado.waveId = opcoes.waveId || null;
        estado.waveState = janela ? janela.state : null;
        estado.opened = janela ? janela.state === "open" : null;
        resolve(estado);
      }, atraso);
    });
  }
  // Espera a confirmação até o limite (padrão 3 s). Dentro do limite: { confirmed: true, estado }. Passou do limite: { confirmed: false, timedOut: true, late }
  // (o botão volta ao "Avise-me" com "Estamos conferindo" e, quando "late" chegar, a tela atualiza). Servidor sem resposta: { confirmed: false, failed: true }.
  function aguardarConfirmacao(promessa, limiteMs) {
    var limite = limiteMs == null ? ESPERA_MAXIMA_MS : limiteMs;
    return new Promise(function (resolve) {
      var fim = false;
      var relogio = setTimeout(function () { if (!fim) { fim = true; resolve({ confirmed: false, timedOut: true, late: promessa }); } }, limite);
      promessa.then(function (estado) { if (!fim) { fim = true; clearTimeout(relogio); resolve({ confirmed: true, timedOut: false, estado: estado }); } },
        function () { if (!fim) { fim = true; clearTimeout(relogio); resolve({ confirmed: false, timedOut: false, failed: true }); } });
    });
  }
  root.IngresseFutebolOndas = { versao: "0.2", derivar: derivar, criarRelogio: criarRelogio, conferirEstado: conferirEstado, aguardarConfirmacao: aguardarConfirmacao, ESPERA_MAXIMA_MS: ESPERA_MAXIMA_MS };
})(typeof window !== "undefined" ? window : globalThis);
