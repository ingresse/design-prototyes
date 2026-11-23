/* regras.js: as regras PURAS da jornada de compra de futebol (Mariana Teixeira, 29/10/2026; módulo M2, docs/produto/JORNADA-FUTEBOL-PROTOTIPO.md).
   Sem DOM, sem relógio próprio, sem armazenamento: cada função recebe o jogo, a pessoa e o instante e devolve um fato. Serve ao runtime (jornada-futebol.js, no navegador:
   window.JF_REGRAS) e ao teste de Node (teste-regras.mjs: `require`). Nenhum clube é codificado: tudo que varia (limites, meia, criança, visitante, PCD, plano, entrada, reserva) vem do
   bloco do jogo (previa/dados/futebol-jornada.json, empacotado em previa/jornada-futebol-dados.js).

   Convenções:
   - preço em REAIS inteiros (o dado vem em centavos com taxa; `reais()` arredonda para cima, como o cartão da categoria);
   - `jogo` é o bloco compacto do pacote de dados: { id, perfilPadrao?, kickoff, doorsAt, lifecycle, mapa, facial, reservaMin, limitePorPessoa, entrada, regras, planos, limites, carteira,
       waves[{ id, aud[], abre, fecha, quota, vendidos, limite }], setores[{ id, nome, tipo, assento, portao, ordem, preco, estoque, vendidos, estadoBase, tags?, assentos?: { fileiras[], porFileira, mapa[], pares? } }] };
   - `ctx` é a pessoa que compra: { perfil: 'socio'|'geral'|'visitante'|'familia'|'pcd', plano: 'socio-ouro'|…|null, pcd: { validado, acompanhante }|null };
   - `itens` é a lista de ingressos escolhidos: [{ setor, tipo, fileira?, assento? }] (um por pessoa).
   Tipos de ingresso: inteira · meia · socio · checkin · crianca · pcd · acompanhante · visitante. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.JF_REGRAS = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TIPOS = ['inteira', 'meia', 'socio', 'checkin', 'crianca', 'pcd', 'acompanhante', 'visitante'];
  var PERFIS = ['socio', 'geral', 'visitante', 'familia', 'pcd'];
  var RESERVA_URGENTE_MS = 60000;

  /* ------------------------------------------------------------------------------------------ pequenos auxiliares */
  function reais(cents) { return Math.ceil(cents / 100 - 1e-9); }
  function conta(lista, fn) { var n = 0; for (var i = 0; i < lista.length; i++) if (fn(lista[i])) n++; return n; }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function unicos(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  /* ------------------------------------------------------------------------------------------ perfil e plano */
  /** Padroniza a pessoa que compra a partir do perfil pedido (URL) e da tabela de perfis da conta de exemplo. */
  function pessoa(contaDados, perfil, plano) {
    var p = PERFIS.indexOf(perfil) >= 0 ? perfil : 'geral';
    var t = (contaDados && contaDados.perfis && contaDados.perfis[p]) || {};
    var planos = t.planosPossiveis || [];
    var pl = p === 'socio' ? (plano && (planos.length ? planos.indexOf(plano) >= 0 : true) ? plano : (t.plano || 'socio-ouro')) : null;
    return { perfil: p, plano: pl, rosto: t.rosto || 'pendente', deps: !!t.deps, pcd: t.pcd || null };
  }
  function planoDe(jogo, chave) { return (chave && jogo.planos && jogo.planos[chave]) || null; }
  /** O plano cobre o setor? (plano sem lista = cobre tudo). */
  function planoCobre(jogo, chave, setorId) { var p = planoDe(jogo, chave); return !!p && (!p.setores || p.setores.indexOf(setorId) >= 0); }
  function setoresDoPlano(jogo, chave) { var p = planoDe(jogo, chave); return p && p.setores ? p.setores.slice() : []; }
  /** O perfil visitante vem sozinho quando o cliente joga fora; um perfil já pedido vence. */
  function perfilDaPonte(jogo, quem, perfilPedido) {
    if (perfilPedido && PERFIS.indexOf(perfilPedido) >= 0) return perfilPedido;
    if (jogo && jogo.clienteVisitante) return 'visitante';
    if (quem === 'socio') return 'socio';
    return 'geral';
  }

  /* ------------------------------------------------------------------------------------------ limites */
  function limitePorPessoa(jogo, ctx) {
    var l = (jogo.limites && jogo.limites.porPerfil) || {}, base = jogo.limitePorPessoa || 4;
    if (ctx.perfil === 'visitante') return (jogo.regras && jogo.regras.visitante && jogo.regras.visitante.porPessoa) || 1;
    var v = l[ctx.perfil];
    if (ctx.perfil === 'socio') v = v && typeof v === 'object' ? v[ctx.plano] : v;
    return typeof v === 'number' ? v : base;
  }
  function limiteMeia(jogo) { return (jogo.regras && jogo.regras.meia && jogo.regras.meia.porConta) || (jogo.limites && jogo.limites.meiaPorConta) || 2; }

  /* ------------------------------------------------------------------------------------------ janela de venda (quem pode comprar agora) */
  /** Estado da venda para a pessoa, no instante `agora` (ms): 'ok' | 'antes' (abre em `abreEm`) | 'depois' (terminou) | 'esgotada' | 'sem-janela'. */
  function janelaDeVenda(jogo, ctx, agora) {
    var aud = ctx.perfil === 'socio' ? ['plan:' + ctx.plano, 'general'] : ctx.perfil === 'visitante' ? ['visitor'] : ['general'];
    var ws = (jogo.waves || []).filter(function (w) { return w.aud.some(function (a) { return aud.indexOf(a) >= 0; }); });
    if (ctx.perfil === 'visitante' && !ws.length) {            // visitante sem janela própria (o cliente joga em casa): vale até o fechamento da venda do visitante
      var fecha = jogo.regras && jogo.regras.visitante && jogo.regras.visitante.fechaAs ? Date.parse(jogo.regras.visitante.fechaAs) : Date.parse(jogo.kickoff) - 2 * 3600000;
      return agora < fecha ? { estado: 'ok', fechaEm: fecha } : { estado: 'depois', fechaEm: fecha };
    }
    if (!ws.length) return { estado: 'sem-janela' };
    var abertas = ws.filter(function (w) { return Date.parse(w.abre) <= agora && agora < Date.parse(w.fecha); });
    if (abertas.length) {
      var livre = abertas.filter(function (w) { return w.vendidos < w.quota; });
      if (livre.length) return { estado: 'ok', fechaEm: Math.max.apply(null, livre.map(function (w) { return Date.parse(w.fecha); })), janela: livre[0].id };
      return { estado: 'esgotada' };
    }
    var futuras = ws.filter(function (w) { return Date.parse(w.abre) > agora; }).sort(function (a, b) { return Date.parse(a.abre) - Date.parse(b.abre); });
    if (futuras.length) return { estado: 'antes', abreEm: Date.parse(futuras[0].abre), janela: futuras[0].id };
    return { estado: 'depois', fechaEm: Math.max.apply(null, ws.map(function (w) { return Date.parse(w.fecha); })) };
  }

  /** O jogo mudou (E-23): `ciclo` da URL vence o ciclo do dado. Devolve null | 'adiado' | 'cancelado' | 'estadio' | 'portoes'. */
  function cicloDoJogo(jogo, cicloUrl) {
    if (['adiado', 'cancelado', 'estadio', 'portoes'].indexOf(cicloUrl) >= 0) return cicloUrl;
    return jogo.lifecycle === 'postponed' ? 'adiado' : jogo.lifecycle === 'cancelled' ? 'cancelado' : null;
  }

  /* ------------------------------------------------------------------------------------------ assentos */
  function ehAssento(setor) { return setor && setor.assento === 'numerado'; }
  function idAssento(fileira, n) { return fileira + '-' + n; }
  function lerAssento(id) { var m = /^([A-Z]+)-(\d+)$/.exec(id || ''); return m ? { fileira: m[1], n: +m[2] } : null; }
  /** Assento vendido na grade (`"1"` vendido, `"0"` livre; `ocupados` = os tomados por simulação ou escolhidos por outro tipo de ingresso). */
  function assentoLivre(setor, fileira, n, ocupados) {
    var g = setor.assentos || setor, i = g.fileiras ? g.fileiras.indexOf(fileira) : -1;
    if (i < 0 || n < 1 || n > g.porFileira) return false;
    if ((ocupados || []).indexOf(idAssento(fileira, n)) >= 0) return false;
    return g.mapa[i].charAt(n - 1) === '0';
  }
  function livresDaGrade(setor, ocupados) {
    var g = setor.assentos || setor, total = 0, i, j;
    for (i = 0; i < g.fileiras.length; i++) for (j = 1; j <= g.porFileira; j++) if (assentoLivre(setor, g.fileiras[i], j, ocupados)) total++;
    return total;
  }
  /** Papel do assento no setor acessível: 1, 3, 5… cadeira acessível; 2, 4, 6… acompanhante. */
  function papelDoAssento(setor, n) { var g = setor.assentos || setor; return g.pares ? (n % 2 === 1 ? 'pcd' : 'acompanhante') : null; }
  /** N lugares lado a lado, na mesma fileira. Prefere as fileiras do meio. `pares`: o grupo começa num assento ímpar (cadeira + acompanhante). Devolve { fileira, assentos:[n…] } ou null. */
  function encontrarJuntos(setor, n, ocupados) {
    var g = setor.assentos || setor, ordem = g.fileiras.map(function (_, i) { return i; });
    var meio = (g.fileiras.length - 1) / 2;
    ordem.sort(function (a, b) { return Math.abs(a - meio) - Math.abs(b - meio) || a - b; });
    for (var k = 0; k < ordem.length; k++) {
      var f = g.fileiras[ordem[k]], passo = g.pares ? 2 : 1;
      for (var ini = 1; ini + n - 1 <= g.porFileira; ini += passo) {
        var ok = true;
        for (var j = 0; j < n; j++) if (!assentoLivre(setor, f, ini + j, ocupados)) { ok = false; break; }
        if (ok) { var as = []; for (var q = 0; q < n; q++) as.push(ini + q); return { fileira: f, assentos: as }; }
      }
    }
    return null;
  }
  /** Lugares vizinhos (E-01): o mesmo `encontrarJuntos`, para a quantidade que falta. */
  function sugerirVizinhos(setor, n, ocupados) { return encontrarJuntos(setor, n, ocupados); }

  /* ------------------------------------------------------------------------------------------ setor: estado, preço, tipos */
  function precoCents(setor, tipo, jogo, plano) {
    var p = setor.preco || {};
    if (tipo === 'inteira' || tipo === 'visitante' && p.visitante == null) return p.inteira;
    if (tipo === 'visitante') return p.visitante;
    if (tipo === 'meia') return p.meia;
    if (tipo === 'crianca') return p.crianca;
    if (tipo === 'pcd') return p.pcd != null ? p.pcd : p.meia;
    if (tipo === 'acompanhante') return p.acompanhante != null ? p.acompanhante : p.meia;
    if (tipo === 'socio') {
      if (p.socio && p.socio[plano] != null) return p.socio[plano];
      var pl = planoDe(jogo, plano);
      return pl && pl.percentual ? Math.round(p.inteira * pl.percentual / 100 / 100) * 100 : null;      // jogo derivado: percentual do plano sobre a inteira, ao real mais próximo
    }
    if (tipo === 'checkin') { var pl2 = planoDe(jogo, plano); return pl2 && pl2.checkin && pl2.checkin.setores.indexOf(setor.id) >= 0 ? (pl2.checkin.precoCents || 0) : null; }
    return null;
  }
  function precoReais(setor, tipo, jogo, plano) { var c = precoCents(setor, tipo, jogo, plano); return c == null ? null : reais(c); }
  /** Menor preço que a pessoa pode pagar no setor («a partir de»). Considera só tipos que existem para o perfil, não os gratuitos. */
  function aPartirDe(setor, jogo, ctx) {
    var ts = tiposDoSetor(jogo, setor, ctx, []), min = null;
    ts.forEach(function (t) { if (t.preco != null && t.preco > 0 && (min == null || t.preco < min)) min = t.preco; });
    if (min == null) { var c = setor.preco && setor.preco.inteira; min = c == null ? null : reais(c); }
    return min;
  }
  function livresDoSetor(setor, ocupados) {
    if (ehAssento(setor) && setor.assentos) return livresDaGrade(setor, ocupados);
    return Math.max(0, (setor.estoque || 0) - (setor.vendidos || 0));
  }
  /** Estado do setor para a pessoa: k = ok | poucos | esgotado | plano | direito | visitante | fora. `disabled` = não se escolhe. `motivo` = chave do texto (com `vars`). */
  function estadoSetor(jogo, setor, ctx, ocupados, sobrescreve) {
    var tipo = setor.tipo;
    if (sobrescreve === 'setor-esgotado') return { k: 'esgotado', disabled: true, livres: 0 };
    if (ctx.perfil === 'visitante' && tipo !== 'visitante') return { k: 'fora', disabled: true, oculto: true };
    if (tipo === 'visitante' && ctx.perfil !== 'visitante') return { k: 'visitante', disabled: true, motivo: 'visitante-info', livres: livresDoSetor(setor, ocupados) };
    var livres = livresDoSetor(setor, ocupados);
    if (tipo === 'pcd' && !(ctx.pcd && ctx.pcd.validado)) return { k: 'direito', disabled: true, motivo: 'direito', livres: livres };
    if (setor.estadoBase === 'esgotado' || livres <= 0) return { k: 'esgotado', disabled: true, livres: 0 };
    if (ctx.perfil === 'socio' && tipo !== 'visitante' && tipo !== 'pcd' && !planoCobre(jogo, ctx.plano, setor.id)) return { k: 'plano', disabled: true, motivo: 'plano', livres: livres };
    var total = setor.estoque || 0;
    if (setor.estadoBase === 'poucos' || (total > 0 && livres / total <= 0.1)) return { k: 'poucos', disabled: false, livres: livres };
    return { k: 'ok', disabled: false, livres: livres };
  }

  /** Tipos de ingresso do setor para a pessoa, com o que o carrinho atual já consumiu (limites). Cada tipo: { id, preco, ok, motivo, vars }. */
  function tiposDoSetor(jogo, setor, ctx, itens) {
    var out = [], tipo = setor.tipo, nMeia = conta(itens, function (i) { return i.tipo === 'meia'; });
    var temCheckin = conta(itens, function (i) { return i.tipo === 'checkin'; }) > 0, temSocio = conta(itens, function (i) { return i.tipo === 'socio'; }) > 0;
    var add = function (id, extra) { var p = precoReais(setor, id, jogo, ctx.plano); if (p == null) return; out.push(Object.assign({ id: id, preco: p, ok: true, motivo: null }, extra || {})); };
    if (tipo === 'visitante') { if (ctx.perfil === 'visitante') add('visitante'); return out; }
    if (tipo === 'pcd') {
      if (ctx.pcd && ctx.pcd.validado) { add('pcd'); if (ctx.pcd.acompanhante !== false) add('acompanhante'); }
      return out;
    }
    add('inteira');
    if (setor.preco && setor.preco.meia != null) {
      var lim = limiteMeia(jogo);
      add('meia', nMeia >= lim ? { ok: false, motivo: 'meia-limite', vars: { n: lim } } : {});
    }
    if (ctx.perfil === 'socio' && planoCobre(jogo, ctx.plano, setor.id)) {
      add('socio', temCheckin ? { ok: false, motivo: 'checkin-socio' } : {});
      add('checkin', temSocio ? { ok: false, motivo: 'checkin-socio' } : {});
    }
    if (setor.preco && setor.preco.crianca === 0 && ctx.perfil !== 'visitante') add('crianca');
    return out;
  }

  /* ------------------------------------------------------------------------------------------ carrinho: totais e validações */
  function totais(itens, setoresPorId, jogo, ctx, produtosTotal) {
    var sub = 0;
    var linhas = itens.map(function (i) { var s = setoresPorId[i.setor], p = s ? precoReais(s, i.tipo, jogo, ctx.plano) : 0; sub += p || 0; return Object.assign({}, i, { preco: p || 0 }); });
    return { linhas: linhas, subtotal: sub, taxas: 0, totalIngressos: sub, total: sub + (produtosTotal || 0), n: itens.length };
  }
  /** Violações do carrinho como lista de { id, vars } (ids de texto): limite total, meia por conta, check-in com benefício, visitante, criança sem responsável no setor. */
  function validarCarrinho(jogo, itens, ctx) {
    var erros = [], lim = limitePorPessoa(jogo, ctx);
    if (itens.length > lim) erros.push({ id: ctx.perfil === 'visitante' ? 'limite-visitante' : 'limite-pessoa', vars: { n: lim } });
    var nm = conta(itens, function (i) { return i.tipo === 'meia'; }), lm = limiteMeia(jogo);
    if (nm > lm) erros.push({ id: 'meia-limite', vars: { n: lm } });
    if (conta(itens, function (i) { return i.tipo === 'checkin'; }) && conta(itens, function (i) { return i.tipo === 'socio'; })) erros.push({ id: 'checkin-socio' });
    unicos(itens.filter(function (i) { return i.tipo === 'crianca'; }).map(function (i) { return i.setor; })).forEach(function (s) {
      if (!conta(itens, function (i) { return i.setor === s && i.tipo !== 'crianca'; })) erros.push({ id: 'responsavel-setor', vars: { setor: s } });
    });
    return erros;
  }
  /** Pode seguir da etapa 1? Devolve { ok, motivo }. Ordem: ciclo, venda, vazio, validação, rosto de quem compra. */
  function podeSeguirDeSetor(jogo, itens, ctx, o) {
    o = o || {};
    if (o.ciclo) return { ok: false, motivo: 'ciclo' };
    if (o.venda && o.venda.estado !== 'ok') return { ok: false, motivo: 'venda' };
    if (!itens.length) return { ok: false, motivo: 'vazio' };
    var er = validarCarrinho(jogo, itens, ctx);
    if (er.length) return { ok: false, motivo: 'regra', erros: er };
    if (o.reserva === 'acabou') return { ok: false, motivo: 'reserva' };
    if (o.exigeRosto && o.rostoCompradorOk === false) return { ok: false, motivo: 'rosto' };
    return { ok: true };
  }

  /* ------------------------------------------------------------------------------------------ rosto e entrada */
  /** O jogo trabalha com rosto? (`facial: 'nao'` = o jogo nem menciona rosto). */
  function usaRosto(jogo) { return jogo.facial !== 'nao'; }
  /** Rosto bloqueia a compra (antes)? 'depois' deixa seguir e vira pendência na Carteira. */
  function rostoBloqueia(jogo) { return jogo.facial === 'antes'; }
  function metodoDeEntrada(jogo, sobrescreve) {
    var m = sobrescreve || (jogo.entrada && jogo.entrada.metodo) || 'face';
    if (jogo.facial === 'nao' && m === 'face') m = 'qr';             // sem rosto, nunca entrada só pelo rosto
    return m;
  }
  function entradaUsaRosto(m) { return m === 'face' || m === 'face+qr'; }
  function entradaUsaQr(m) { return m === 'qr' || m === 'face+qr'; }
  function qrLiberadoEm(jogo) { var h = (jogo.entrada && jogo.entrada.qrAntesHoras) || 2; return Date.parse(jogo.kickoff) - h * 3600000; }
  /** Estado do rosto da conta a partir do parâmetro `rosto=`: → 'cadastrado' | 'pendente' | 'em-analise' | 'expirado' | 'erro'. */
  function estadoDoRosto(param) {
    return { ok: 'cadastrado', ja: 'cadastrado', feito: 'cadastrado', pendente: 'pendente', aguardando: 'em-analise', expirado: 'expirado', erro: 'erro' }[param] || 'pendente';
  }
  function rostoOk(estado) { return estado === 'cadastrado'; }

  /* ------------------------------------------------------------------------------------------ dependentes e titulares */
  function idadeEm(nascimentoIso, refIso) {
    var n = new Date(nascimentoIso + 'T12:00:00Z'), r = new Date(refIso + 'T12:00:00Z');
    var anos = r.getUTCFullYear() - n.getUTCFullYear();
    if (r.getUTCMonth() < n.getUTCMonth() || (r.getUTCMonth() === n.getUTCMonth() && r.getUTCDate() < n.getUTCDate())) anos--;
    return anos;
  }
  /** O dependente serve para o ingresso? Devolve { ok, motivo } (motivo: 'faixa' | 'atribuido' | 'ja-tem' | 'tipo'). `idade` já calculada na data do jogo. */
  function dependenteServe(jogo, dep, idade, ingresso, atribuidos, o) {
    var r = (jogo.regras && jogo.regras.dependentes) || {};
    if (r.permitido === false) return { ok: false, motivo: 'faixa' };
    if (r.idadeMax != null && idade >= r.idadeMax) return { ok: false, motivo: 'faixa' };
    if (ingresso && ingresso.tipo === 'crianca' && r.idadeMax != null && idade >= r.idadeMax) return { ok: false, motivo: 'faixa' };
    if ((atribuidos || []).indexOf(dep.id) >= 0) return { ok: false, motivo: 'atribuido' };
    if (o && o.temIngresso && o.temIngresso.indexOf(dep.id) >= 0) return { ok: false, motivo: 'ja-tem' };
    return { ok: true };
  }
  /** Responsável no mesmo setor (E-15): o ingresso gratuito de criança só sai com um ingresso de adulto, de quem compra, no mesmo setor. */
  function responsavelNoSetor(jogo, itens, titulares, i) {
    var r = (jogo.regras && jogo.regras.dependentes) || {};
    if (!r.responsavelMesmoSetor || itens[i].tipo !== 'crianca') return true;
    for (var j = 0; j < itens.length; j++) if (j !== i && itens[j].setor === itens[i].setor && itens[j].tipo !== 'crianca' && titulares[j] && titulares[j].quem === 'eu') return true;
    return false;
  }

  /* ------------------------------------------------------------------------------------------ reserva */
  /** Estado da reserva: { estado: 'ok'|'urgente'|'acabou', restanteMs }. */
  function reserva(fimMs, agora) {
    if (!fimMs) return { estado: 'ok', restanteMs: 0, sem: true };
    var r = Math.max(0, fimMs - agora);
    return { estado: r === 0 ? 'acabou' : r <= RESERVA_URGENTE_MS ? 'urgente' : 'ok', restanteMs: r };
  }
  /** Texto do cronômetro: minutos inteiros até o último minuto; no último, m:ss (a reserva tem sujeito e não vira contagem nervosa). */
  function textoReserva(restanteMs) {
    var s = Math.ceil(restanteMs / 1000);
    if (restanteMs > RESERVA_URGENTE_MS) return Math.ceil(s / 60) + ' min';
    return '0:' + (s < 10 ? '0' : '') + s;
  }
  /** O relógio não reinicia: o fim vale do primeiro lugar escolhido. Devolve o novo fim (ou 0 sem itens). */
  function fimDaReserva(fimAtual, nItens, agora, reservaMin) {
    if (!nItens) return 0;
    if (fimAtual && fimAtual > 0) return fimAtual;
    return agora + (reservaMin || 10) * 60000;
  }

  /* ------------------------------------------------------------------------------------------ Carteira */
  /** Ações que a Carteira mostra (só as que o jogo permite). */
  function acoesDaCarteira(jogo, tipo) {
    var a = (jogo.carteira && jogo.carteira.acoes) || {}, t = a.transferir;
    return {
      transferir: !!t && (!t.tipos || t.tipos.indexOf(tipo) >= 0),
      revender: !!a.revender,
      trocarSetor: !!a.trocarSetor,
      cancelar: a.cancelar || null
    };
  }

  return {
    TIPOS: TIPOS, PERFIS: PERFIS, RESERVA_URGENTE_MS: RESERVA_URGENTE_MS,
    reais: reais, pessoa: pessoa, planoDe: planoDe, planoCobre: planoCobre, setoresDoPlano: setoresDoPlano, perfilDaPonte: perfilDaPonte,
    limitePorPessoa: limitePorPessoa, limiteMeia: limiteMeia, janelaDeVenda: janelaDeVenda, cicloDoJogo: cicloDoJogo,
    ehAssento: ehAssento, idAssento: idAssento, lerAssento: lerAssento, assentoLivre: assentoLivre, livresDaGrade: livresDaGrade, papelDoAssento: papelDoAssento,
    encontrarJuntos: encontrarJuntos, sugerirVizinhos: sugerirVizinhos,
    precoCents: precoCents, precoReais: precoReais, aPartirDe: aPartirDe, livresDoSetor: livresDoSetor, estadoSetor: estadoSetor, tiposDoSetor: tiposDoSetor,
    totais: totais, validarCarrinho: validarCarrinho, podeSeguirDeSetor: podeSeguirDeSetor,
    usaRosto: usaRosto, rostoBloqueia: rostoBloqueia, metodoDeEntrada: metodoDeEntrada, entradaUsaRosto: entradaUsaRosto, entradaUsaQr: entradaUsaQr, qrLiberadoEm: qrLiberadoEm,
    estadoDoRosto: estadoDoRosto, rostoOk: rostoOk,
    idadeEm: idadeEm, dependenteServe: dependenteServe, responsavelNoSetor: responsavelNoSetor,
    reserva: reserva, textoReserva: textoReserva, fimDaReserva: fimDaReserva, acoesDaCarteira: acoesDaCarteira
  };
});
