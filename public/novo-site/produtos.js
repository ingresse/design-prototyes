/* produtos.js: produtos depois da escolha dos ingressos (DE-41; docs/produto/PRODUTOS-APOS-INGRESSOS.md). Isadora Nogueira, 29/10/2026.
   Fonte: tools/previa/produtos/produtos.js; o gerador (tools/previa/produtos.mjs) copia para previa/produtos.js e grava o catálogo em previa/produtos-dados.js
   (window.PRD_DADOS, vindo de tools/previa/produtos/produtos.json). UM módulo para os três fluxos: show (Ingressos.dc.html), esporte (?esporte=<id>) e
   jogo de futebol (?jogo=<id>). A marcação é uma só (tools/previa/produtos/bloco.html) e o componente de linha é `.prd` (identidade-componentes.css).

   O que este arquivo faz:
     1. catálogo normalizado (show e jogo vêm de PRD_DADOS; esporte vem de JE_DADOS.eventos[id].extras, o que já existia);
     2. regras: limite fixo, limite que acompanha os ingressos (por pedido, por data, por tipo), estoque, prazo, obrigatório, dependência;
     3. o resultado (linhas do resumo, total, itens para o carrinho, avisos de ajuste) e o modelo de tela (prd*) que a marcação consome;
     4. três subtipos do Component (Ingressos, Checkout, Pagamento) para o fluxo de shows e de jogos; o esporte usa as mesmas funções (jornada-esporte.js).
   Preços em reais inteiros (sem centavos). Produto não é ingresso: não conta no limite de ingressos, não gera titular e não muda `sig` do Quem vai.
   Parâmetros de URL: produtos=1|0|esgotado|obrigatorio|prazo|erro · escolhidos=1 · jogo=<id> · esporte=<id> · #produtos. */
(function () {
  'use strict';
  if (window.IngresseProdutos) return;

  var D = window.PRD_DADOS || { show: { produtos: [] }, jogo: { produtos: [] }, esporte: { regras: {}, fora: [] }, jogos: {} };
  var qs = new URLSearchParams(location.search);
  var MODO = qs.get('produtos') || '1';
  var ESCOLHIDOS = qs.get('escolhidos') === '1';
  var root = document.documentElement;

  /* ---------------------------------------------------------------------------------------------------------------
     1. Utilitários
     --------------------------------------------------------------------------------------------------------------- */
  function ix() { return window.IX || { store: { get: function (k, d) { return d; }, set: function () {}, del: function () {} }, toast: function () {} }; }
  var brl = function (v) { return 'R$ ' + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  // o total do show mostra centavos só quando o cupom os cria (o mesmo formato do modelo do v5.3 em Ingressos, Quem vai e Como pagar); os produtos são sempre inteiros
  var brlc = function (v) { var n = Math.round(v * 100) / 100; return 'R$ ' + (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var reais = function (cents) { return Math.ceil(cents / 100 - 1e-9); };
  var cap1 = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var copia = function (o) { var n = {}; Object.keys(o || {}).forEach(function (k) { n[k] = o[k]; }); return n; };
  var soma = function (o) { var n = 0; Object.keys(o).forEach(function (k) { n += o[k]; }); return n; };
  function agora() { return window.IngresseLembretes && window.IngresseLembretes.agora ? window.IngresseLembretes.agora() : Date.now(); }
  var TZ = 'America/Sao_Paulo';
  var fDia = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric' });
  var fMes = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: 'short' });
  var diaMes = function (t) { var d = new Date(t); return fDia.format(d) + ' ' + String(fMes.format(d)).replace('.', ''); };
  var reduzido = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; };
  var plural = function (n, um, varios) { return n === 1 ? um : varios; };
  var CHAVE_PAG_ERRO = 'prdPagErro';           // «Simular: produto esgotou» em Como pagar (store: id do produto que esgotou)

  /* ---------------------------------------------------------------------------------------------------------------
     2. Contexto e catálogo
     --------------------------------------------------------------------------------------------------------------- */
  function JE() { return window.JornadaEsporte && window.JornadaEsporte.ativo() ? window.JornadaEsporte : null; }
  /** A jornada de compra de futebol (?jogo=; tools/previa/jornada-futebol.mjs): ela monta a seleção, o carrinho e o resumo; este módulo só dá o catálogo, as regras e o bloco. */
  function JF() { return window.IngresseJornadaFutebol && window.IngresseJornadaFutebol.ativo() ? window.IngresseJornadaFutebol : null; }
  /** Onde estamos: esporte (?esporte=), jogo (?jogo=) ou show (padrão). */
  function contexto() {
    var je = JE();
    if (je) return { tipo: 'esporte', id: String(je.id()) };
    var jf = JF();
    if (jf) { var cj = jf.contextoProdutos(); var jj = D.jogos && D.jogos[cj.id]; return { tipo: 'jogo', id: String(cj.id), visitante: !!cj.visitante, titulo: jj ? jj.titulo : '' }; }
    var jg = qs.get('jogo');
    if (jg) { var j = D.jogos && D.jogos[jg]; return { tipo: 'jogo', id: String(jg), visitante: !!(j && j.visitante), titulo: j ? j.titulo : '' }; }
    return { tipo: 'show', id: 'sorriso-maroto' };
  }
  function ctxIgual(a, b) { return !!a && !!b && a.tipo === b.tipo && String(a.id) === String(b.id); }

  function normal(p) {
    var o = copia(p);
    o.tipo = p.tipo || 'qtd';
    o.curto = p.curto || p.nome;
    o.ref = p.ref || ('o produto ' + p.nome);
    o.plural = p.plural || 'unidades';
    o.msg = p.msg || {};
    return o;
  }

  /** O catálogo do esporte: o que já existia em esportes.json (sport.extras[]), normalizado; camiseta extra ganha tamanho e modelo. */
  function catalogoEsporte(EV) {
    var R = (D.esporte && D.esporte.regras) || {}, fora = (D.esporte && D.esporte.fora) || [];
    var lim = (EV.reg && EV.reg.limite) || 10;
    var lista = (EV.extras || []).filter(function (x) { return fora.indexOf(x.id) < 0; }).map(function (x) {
      var r = R[x.id] || {};
      var p = { id: x.id, nome: x.rotulo, curto: r.curto, ref: r.ref, plural: r.plural, preco: reais(x.centavos), msg: r.msg || {}, retirada: r.retirada || '', img: null, ate: r.ate || null,
        nota: (r.nota || '').replace('{limite}', lim), notaLimite: (r.notaLimite || '').replace('{limite}', lim) };
      if (x.opcoes) { p.tipo = 'doacao'; p.valores = x.opcoes.map(reais); p.preco = 0; p.nota = r.nota || 'Opcional.'; }
      if (x.prazoDias) { p.prazoDias = x.prazoDias; p.nota = ''; }
      if (x.id === 'camiseta-extra' && EV.kit && EV.kit.camiseta && EV.kit.camiseta.tamanhos && EV.kit.camiseta.tamanhos.length) {
        p.opcoes = { tipo: 'tamanho', rotulo: 'Escolher tamanho', itens: EV.kit.camiseta.tamanhos.map(function (t) { return { id: t, rotulo: t }; }) };
        var ms = (EV.kit.camiseta.modelos || []);
        if (ms.length > 1) p.modelos = ms.map(function (m) { return { id: m, rotulo: m === 'unissex' ? 'Unissex' : m === 'feminino-babylook' ? 'Feminino' : cap1(m) }; });
      }
      return normal(p);
    });
    // prova virtual: o kit pelo correio é do produtor e já está no pedido (obrigatório por inscrição)
    var ob = ((D.esporte && D.esporte.obrigatorios) || {})[EV.id];
    var kit = lista.filter(function (p) { return p.id === 'kit-pelo-correio'; })[0];
    if (EV.virtual && !kit && ob && ob.adiciona) {
      var a = ob.adiciona, r = R[a.id] || {};
      kit = normal({ id: a.id, nome: a.nome, curto: r.curto, ref: r.ref, plural: r.plural, preco: a.preco, msg: r.msg || {}, retirada: r.retirada || '', ate: 'ingressos', nota: '', img: null });
      lista.splice(Math.min(1, lista.length), 0, kit);
    }
    if (EV.virtual && kit) { kit.obrigatorio = true; kit.nota = 'Prova virtual: o kit sai pelo correio e já está no seu pedido.'; }
    return lista;
  }
  /** O catálogo do contexto, normalizado e na ordem de exibição. */
  function catalogo(ctx) {
    if (!ctx) ctx = contexto();
    if (MODO === '0') return [];                                   // `produtos=0`: sem catálogo, a página é a de hoje (4.1)
    if (ctx.tipo === 'esporte') { var je = JE(); return je && je.evento() ? catalogoEsporte(je.evento()) : []; }
    var base = ctx.tipo === 'jogo' ? D.jogo : D.show;
    return ((base && base.produtos) || []).map(normal);
  }

  /* ---------------------------------------------------------------------------------------------------------------
     3. O que os ingressos dizem sobre o pedido
     `ing`: { n: ingressos (pessoas), porData: {sab: n, dom: n}, tipos: {idDoIngresso: pessoas}, vaga: {data: n} (combos que já trazem vaga) }
     --------------------------------------------------------------------------------------------------------------- */
  function ingressosDoCarrinho(cart) {
    var T = (D.show && D.show.ingressos) || {};
    var ing = { n: (cart.holders || []).length, porData: {}, tipos: {}, vaga: {} };
    var q = cart.q || {};
    Object.keys(q).forEach(function (k) {
      var parts = k.split('|'), id = parts.pop(), dia = parts[0] || '', t = T[id] || {}, pes = (t.pessoas || 1) * q[k];
      (dia ? [dia] : (t.dias || ['sab', 'dom'])).forEach(function (d) { ing.porData[d] = (ing.porData[d] || 0) + pes; if (t.vaga) ing.vaga[d] = (ing.vaga[d] || 0) + t.vaga * q[k]; });
      ing.tipos[id] = (ing.tipos[id] || 0) + pes;
    });
    (cart.seats || []).forEach(function (s) { var d = String(s).split('|')[0]; ing.porData[d] = (ing.porData[d] || 0) + 1; });
    return ing;
  }
  function ingressosDeInscricoes(n) { return { n: n, porData: {}, tipos: {}, vaga: {} }; }

  /* ---------------------------------------------------------------------------------------------------------------
     4. Regras: o resultado de uma seleção
     `est`: { sel: {"id": qtd | "id|opcao": qtd | doação: valor}, opc: {id: modelo}, aberto: {id: bool}, mais: bool, avisos: [], erroUsado: bool }
     --------------------------------------------------------------------------------------------------------------- */
  function estadoVazio() { return { sel: {}, opc: {}, aberto: {}, mais: false, avisos: [], erroUsado: false }; }
  var chave = function (p, it) { return it ? p.id + '|' + it.id : p.id; };
  var temOpcoes = function (p) { return !!(p.opcoes && p.opcoes.itens && p.opcoes.itens.length); };

  /** Quem o modo da URL escolhe (esgotado: um produto sem variação e uma opção de tamanho; obrigatório e prazo: o primeiro elegível). */
  function alvosDoModo(cat, modo) {
    var o = { prodEsgotado: null, opcEsgotada: null, obrigatorio: null, prazo: null };
    if (modo === 'esgotado') {
      var sv = cat.filter(function (p) { return !temOpcoes(p) && p.tipo === 'qtd' && !p.obrigatorio; });
      o.prodEsgotado = sv.length ? sv[sv.length - 1].id : null;
      var tm = cat.filter(function (p) { return temOpcoes(p) && p.opcoes.tipo === 'tamanho'; })[0];
      if (tm) o.opcEsgotada = tm.id + '|' + tm.opcoes.itens[tm.opcoes.itens.length - 1].id;
    }
    if (modo === 'obrigatorio') { var el = cat.filter(function (p) { return p.tipo === 'qtd' && !(temOpcoes(p) && p.opcoes.tipo === 'tamanho') && !p.obrigatorio; })[0]; o.obrigatorio = el ? el.id : null; }
    if (modo === 'prazo') o.prazo = cat.length ? cat[0].id : null;
    return o;
  }

  /** Aplica as regras à seleção, nesta ordem: dependência, prazo, estoque, limite. Devolve a seleção ajustada, os avisos, as linhas de tela, os itens e o total. */
  function resolver(ctx, cat, est, ing, o) {
    o = o || {};
    var modo = o.modo || MODO, alvo = alvosDoModo(cat, modo), EV = JE() && JE().evento(), lim = (EV && EV.reg && EV.reg.limite) || 10;
    var sel = {}, avisos = [], mudou = false, linhas = [], itens = [], total = 0, n = 0;
    var aviso = function (tipo, texto) { avisos.push({ tipo: tipo, texto: texto }); };

    cat.forEach(function (p) {
      var L = { p: p, oculto: false, estado: 'padrao', ops: [], total: 0, noLimite: false, capTotal: Infinity, forcado: false };
      var obrig = !!p.obrigatorio || alvo.obrigatorio === p.id;
      var exigeN = null;
      if (p.exige) { exigeN = 0; (p.exige.tipos || []).forEach(function (t) { exigeN += (ing.tipos && ing.tipos[t]) || 0; }); }
      if ((p.exige && exigeN === 0) || (p.soCasa && ctx.visitante)) L.oculto = true;
      var encerrado = !!p.prazoDias && EV && (Date.parse(EV.iso) - p.prazoDias * 86400000) <= agora();
      if (alvo.prazo === p.id) encerrado = true;
      var prodEsg = (p.estoque === 0) || alvo.prodEsgotado === p.id;

      // tetos do produto (no pedido)
      var capTotal = Infinity;
      if (p.maxEscopo !== 'variacao' && p.max != null) capTotal = Math.min(capTotal, p.max);
      if (p.ate === 'ingressos') capTotal = Math.min(capTotal, ing.n);
      if (p.ate === 'compra') capTotal = Math.min(capTotal, lim);
      if (p.exige) capTotal = Math.min(capTotal, (exigeN || 0) * (p.porPessoa || 1));
      var capPedido = capTotal;                                     // sem estoque: o motivo «é um por ingresso» (a regra), não «restam só»
      if (p.estoque != null && p.estoque > 0) capTotal = Math.min(capTotal, p.estoque);
      L.capTotal = capTotal;

      // opções (variação) ou uma opção só
      var itensOp = temOpcoes(p) ? p.opcoes.itens : [null];
      var visiveis = 0, somaQ = 0;
      itensOp.forEach(function (it) {
        var op = { it: it, chave: chave(p, it), qty: 0, esgotado: false, cap: Infinity, oculto: false };
        var estoque = it && it.estoque != null ? it.estoque : null;
        if (alvo.opcEsgotada === op.chave) estoque = 0;
        op.esgotado = prodEsg || estoque === 0;
        var capRegra = Infinity;
        if (it && p.opcoes.tipo === 'data') {
          var dia = (ing.porData && ing.porData[it.id]) || 0, vaga = (ing.vaga && ing.vaga[it.id]) || 0;
          if (!dia) op.oculto = true;
          capRegra = p.maxEscopo === 'variacao' && p.max != null ? Math.min(p.max - vaga, dia) : dia;
          capRegra = Math.max(0, capRegra);
        }
        var capEst = estoque != null ? estoque : Infinity;
        op.capRegra = capRegra; op.cap = Math.max(0, Math.min(capRegra, capEst));
        if (p.tipo === 'qtd' && p.maxEscopo === 'variacao') op.cap = Math.max(0, Math.min(op.cap, p.max == null ? Infinity : p.max));
        if (L.oculto || encerrado || op.esgotado) op.cap = 0;
        // quantidade pedida e quantidade que fica
        var pedida = est.sel[op.chave] || 0, fica = pedida;
        if (p.tipo === 'doacao') fica = pedida;
        else if (obrig) { fica = it ? Math.min((ing.porData && ing.porData[it.id]) || 0, 99) : ing.n; op.forcado = true; }
        else {
          fica = Math.min(pedida, op.cap);
          if (pedida > fica) {
            mudou = true;
            var nome = cap1(p.ref);
            if (L.oculto) aviso('warning', p.soCasa && ctx.visitante ? nome + ' não vale para a torcida visitante e saiu do seu pedido.' : (p.msg.saiu || nome + ' saiu do seu pedido: ele depende dos ingressos que você escolheu.'));
            else if (encerrado) aviso('warning', nome + ' saiu do seu pedido: o prazo acabou.');
            else if (op.esgotado || estoque === 0 || (p.estoque === 0)) aviso('warning', nome + (it ? ' (' + it.rotulo + ')' : '') + ' esgotou e saiu do seu pedido.');
            else if (pedida > capRegra && capRegra <= (estoque != null ? estoque : Infinity)) aviso('warning', (p.msg.ingressos || 'Ajustamos ' + p.ref + ': o limite acompanha os ingressos.').replace('{var}', it ? it.rotulo : ''));
            else aviso('warning', 'Restam só ' + fica + ' ' + p.plural + '. Deixamos ' + fica + ' no pedido.');
          }
        }
        op.qty = fica; somaQ += fica;
        if (!op.oculto) visiveis++;
        L.ops.push(op);
      });
      if (p.tipo === 'qtd' && !obrig && somaQ > capTotal && capTotal !== Infinity) {
        // o teto do pedido manda: tira das últimas opções
        var excesso = somaQ - capTotal;
        for (var k = L.ops.length - 1; k >= 0 && excesso > 0; k--) { var tira = Math.min(excesso, L.ops[k].qty); L.ops[k].qty -= tira; excesso -= tira; }
        mudou = true;
        var ate = Math.max(0, capTotal);
        if (p.maxEscopo !== 'variacao') aviso('warning', capTotal < capPedido ? 'Restam só ' + ate + ' ' + p.plural + '. Deixamos ' + ate + ' no pedido.' : (p.msg.ingressos || 'Ajustamos ' + p.ref + ': o limite acompanha os ingressos.').replace('{var}', ''));
        somaQ = ate;
      }
      L.total = L.ops.reduce(function (s, x) { return s + x.qty; }, 0);
      L.somaQ = somaQ;
      // estado da linha
      var todasEsg = L.ops.every(function (x) { return x.esgotado; });
      L.estado = obrig ? 'obrigatorio' : encerrado ? 'encerrado' : (prodEsg || (todasEsg && L.ops.length)) ? 'esgotado' : 'padrao';
      L.noLimite = !obrig && L.estado === 'padrao' && p.tipo === 'qtd' && ((capTotal !== Infinity && capTotal > 0 && L.total >= capTotal) ||
        L.ops.some(function (x) { return !x.oculto && !x.esgotado && x.capRegra !== Infinity && x.capRegra > 0 && x.qty >= x.capRegra; }));
      L.obrig = obrig; L.encerrado = encerrado;
      if (L.oculto || (temOpcoes(p) && !visiveis)) L.oculto = true;
      // saída: seleção, itens e resumo
      L.ops.forEach(function (op) {
        if (op.qty > 0 && !L.oculto) {
          if (!obrig) sel[op.chave] = op.qty;
          var mod = p.modelos && est.opc && est.opc[p.id] ? p.modelos.filter(function (m) { return m.id === est.opc[p.id]; })[0] : null;
          var rotulo = p.curto + (op.it ? ' · ' + op.it.rotulo : '') + (mod ? ' · ' + mod.rotulo : '');
          var valor = p.tipo === 'doacao' ? op.qty : op.qty * p.preco;
          itens.push({ id: p.id, nome: p.nome, curto: p.curto, variacao: op.it ? { id: op.it.id, rotulo: op.it.rotulo } : null, modelo: mod ? mod.rotulo : '', qty: p.tipo === 'doacao' ? 1 : op.qty,
            preco: p.tipo === 'doacao' ? op.qty : p.preco, total: valor, rotulo: rotulo, retirada: p.retirada || '', obrigatorio: obrig });
          total += valor; n += p.tipo === 'doacao' ? 1 : op.qty;
        }
      });
      if (p.tipo === 'doacao' && est.sel[p.id]) sel[p.id] = est.sel[p.id];
      linhas.push(L);
    });
    var resumo = itens.map(function (i) { return { qty: i.qty, label: i.rotulo, total: brl(i.total) }; });
    return { sel: sel, avisos: avisos, mudou: mudou, linhas: linhas, itens: itens, total: total, n: n, resumo: resumo, alvo: alvo };
  }

  /** O que vai no carrinho (cart.produtos e, no esporte, espCart.produtos). */
  function produtosDoCarrinho(ctx, res, est) {
    return { ctx: ctx, sel: res.sel, opc: copia(est.opc), itens: res.itens, total: res.total, n: res.n, linhas: res.resumo };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     5. Revalidar ao tocar o CTA (4.7): o que esgotou entre a escolha e o toque sai, o aviso vai ao topo do bloco, a etapa não avança.
     Com `produtos=erro` o primeiro produto escolhido esgota no primeiro toque (o segundo toque segue).
     --------------------------------------------------------------------------------------------------------------- */
  function revalidar(ctx, cat, est, ing, o) {
    var res = resolver(ctx, cat, est, ing, o);
    var sel = res.sel, avisos = res.avisos.slice(), ajustou = res.mudou;
    if (MODO === 'erro' && !est.erroUsado && res.itens.length) {
      var p = cat.filter(function (x) { return x.id === res.itens[0].id; })[0], novo = {};
      Object.keys(sel).forEach(function (k) { if (k !== p.id && k.indexOf(p.id + '|') !== 0) novo[k] = sel[k]; });
      sel = novo; ajustou = true; avisos.push({ tipo: 'warning', texto: cap1(p.ref) + ' esgotou e saiu do seu pedido.' });
    }
    return { sel: sel, avisos: avisos, ajustou: ajustou, usouErro: MODO === 'erro' && ajustou };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     6. Modelo de tela (o que bloco.html lê). `cfg`: { ctx, cat, est, ing, atualizar(patch), atual(), numero, entra }
     --------------------------------------------------------------------------------------------------------------- */
  function montar(cfg) {
    var ctx = cfg.ctx, cat = cfg.cat, est = cfg.est, ing = cfg.ing;
    var res = resolver(ctx, cat, est, ing, cfg);
    var atualizar = cfg.atualizar;
    var fresco = function () { return cfg.atual ? cfg.atual() : est; };         // o estado de agora (um segundo toque antes do desenho não pode usar o da renderização)
    var visiveis = res.linhas.filter(function (L) { return !L.oculto; });
    var temObrig = visiveis.some(function (L) { return L.obrig; });
    var mudar = function (p, it, d, cap) {
      var k = chave(p, it), s = copia(fresco().sel), v = Math.max(0, Math.min(cap, (s[k] || 0) + d));
      if (v > 0) s[k] = v; else delete s[k];
      atualizar({ sel: s, avisos: [] });
    };
    var linhasUI = visiveis.map(function (L, i) {
      var p = L.p, qtd = L.total, isDoacao = p.tipo === 'doacao', isVar = temOpcoes(p) && !L.obrig, aberto = !!est.aberto[p.id];
      var restoTotal = L.capTotal === Infinity ? Infinity : L.capTotal - L.somaQ;
      var grupo = function (extra) { return p.nome + (extra ? ', ' + extra : ''); };
      var degrau = function (it, op) {
        var q = op.qty, topo = Math.min(op.cap, q + (restoTotal === Infinity ? 99 : Math.max(0, restoTotal)));
        var nm = grupo(it ? it.rotulo : '');
        return { qty: q, noDec: q === 0, noInc: L.estado !== 'padrao' || op.esgotado || q >= topo, qtyLabel: q + ' no pedido', grupoLabel: 'Quantidade: ' + nm,
          decLabel: 'Remover ' + nm, incLabel: 'Adicionar ' + nm,
          dec: function () { mudar(p, it, -1, op.cap); }, inc: function () { mudar(p, it, 1, topo); } };
      };
      var nota = p.nota || '';
      if (L.obrig) nota = p.nota && p.obrigatorio ? p.nota : '1 por inscrição. Já está no seu pedido.';
      else if (L.estado === 'encerrado') nota = 'Prazo encerrado.';
      else if (L.estado === 'esgotado') nota = p.nota || '';
      else if (L.noLimite && p.notaLimite) nota = p.notaLimite;
      else if (p.prazoDias && EVprazo(p)) nota = 'Peça até ' + EVprazo(p) + '.';
      var selo = { tem: false, classe: 'tag', sit: '', rot: '' };
      if (L.estado === 'esgotado') selo = { tem: true, classe: 'tag', sit: 'esgotado', rot: 'Esgotado' };
      else if (L.estado === 'encerrado') selo = { tem: true, classe: 'tag', sit: 'encerrado', rot: 'Encerrado' };
      else if (L.obrig) selo = { tem: true, classe: 'tag tag-ink', sit: '', rot: 'Obrigatório' };
      else if (isVar && qtd > 0) selo = { tem: true, classe: 'tag tag-ink', sit: '', rot: qtd + ' no pedido' };
      var linha = { id: 'prd-' + p.id, estado: L.estado, nome: p.nome, nota: nota, hasNota: !!nota, preco: isDoacao ? '' : brl(p.preco),
        temSelo: selo.tem, seloClasse: selo.classe, seloSit: selo.sit, selo: selo.rot,
        isQtd: !isDoacao && !isVar && !L.obrig, isFixa: L.obrig && !isDoacao, isDoacao: isDoacao, isVar: isVar,
        mais: i >= 4 && !est.mais ? 'true' : 'false' };
      if (linha.isQtd) Object.assign(linha, degrau(null, L.ops[0]));
      if (isDoacao) {
        var cur = est.sel[p.id] || 0;
        linha.grupoLabel = p.nome;
        linha.valores = [{ v: 0, label: 'Não quero doar' }].concat((p.valores || []).map(function (v) { return { v: v, label: brl(v) }; })).map(function (o) { return { label: o.label, on: cur === o.v ? 'true' : 'false', pick: function () { var s = copia(fresco().sel); if (o.v) s[p.id] = o.v; else delete s[p.id]; atualizar({ sel: s, avisos: [] }); } }; });
      }
      if (isVar) {
        linha.varRot = p.opcoes.rotulo; linha.varOff = L.estado !== 'padrao'; linha.idVar = 'prd-var-' + p.id; linha.aberto = aberto ? 'true' : 'false'; linha.fechado = !aberto;
        linha.alternar = function () { var a = copia(fresco().aberto); a[p.id] = !a[p.id]; atualizar({ aberto: a }, true); };
        linha.temModelo = !!p.modelos; linha.modelos = (p.modelos || []).map(function (m) { var on = (est.opc && est.opc[p.id] ? est.opc[p.id] : p.modelos[0].id) === m.id; return { label: m.rotulo, on: on ? 'true' : 'false', pick: function () { var o2 = copia(fresco().opc); o2[p.id] = m.id; atualizar({ opc: o2, avisos: [] }); } }; });
        linha.modeloLabel = 'Modelo: ' + p.nome;
        linha.opcoes = L.ops.filter(function (op) { return !op.oculto; }).map(function (op) {
          var d = degrau(op.it, op), n2 = op.esgotado ? 'Esgotado' : '';
          return Object.assign({ rot: op.it.rotulo, esgotado: op.esgotado, temSelo: op.esgotado, selo: n2, idOp: 'prd-op-' + p.id + '-' + op.it.id, estado: op.esgotado ? 'esgotado' : 'padrao' }, d);
        });
      }
      return linha;
    });
    var avisos = (est.avisos || []).map(function (a, i) { return { id: 'prd-aviso-' + i, tipo: 'warning', texto: a.texto }; });
    var temMais = linhasUI.length > 4;
    var vm = {
      prdBloco: visiveis.length > 0, prdTitulo: (cfg.numero || '3') + ' · Produtos', prdApoio: temObrig ? 'O que está marcado como obrigatório já entra no pedido.' : 'Opcionais. Dá para seguir sem eles.',
      prdAvisos: avisos, prdTemAvisos: avisos.length > 0, prdLinhas: linhasUI, prdEntra: cfg.entra ? 'true' : 'false',
      prdTemMais: temMais, prdMaisAberto: !!est.mais, prdMaisTxt: est.mais ? 'Ver menos' : 'Ver mais ' + (linhasUI.length - 4) + ' ' + plural(linhasUI.length - 4, 'produto', 'produtos'),
      prdMaisPick: function () { atualizar({ mais: !fresco().mais }, true); }
    };
    return { vm: vm, res: res };
  }
  function EVprazo(p) { var je = JE(); var EV = je && je.evento(); return EV && p.prazoDias ? diaMes(Date.parse(EV.iso) - p.prazoDias * 86400000) : ''; }

  /* ---------------------------------------------------------------------------------------------------------------
     7. Valores do resumo (os mesmos nas quatro telas: Ingressos, Quem vai, Como pagar e Pronto)
     --------------------------------------------------------------------------------------------------------------- */
  function resumoVals(cart, editHref) {
    var pr = cart && cart.produtos;
    var on = !!(pr && pr.n > 0);
    return { prdOn: on, prdFmt: on ? brl(pr.total) : '', prdEditHref: editHref || 'Ingressos.dc.html#produtos', prdN: on ? pr.n : 0, prdRascunho: function () {} };
  }
  /** «Produtos do pedido» (Pronto e Carteira, show e esporte): uma lista só, com a retirada de cada um. Sem QR próprio nesta versão. */
  function pedidoVals(pr) {
    var on = !!(pr && pr.n > 0);
    return { prdPedido: on, prdLista: on ? pr.itens.map(function (i) { return { linha: i.qty + '× ' + i.rotulo, valor: brl(i.total), retirada: i.retirada || '' }; }) : [] };
  }
  /** «2 ingressos · 1 produto» / «2 ingressos e 1 produto» (barra do celular). */
  function fraseProdutos(unidade, nIng, n, sep) {
    var ing = nIng + ' ' + plural(nIng, unidade[0], unidade[1]);
    return n > 0 ? ing + (sep || ' · ') + n + ' ' + plural(n, 'produto', 'produtos') : ing;
  }
  /** Para onde «Editar produtos» leva (Ingressos do contexto, rolado até #produtos). */
  function hrefEditar(ctx) {
    if (!ctx) ctx = contexto();
    return 'Ingressos.dc.html' + (ctx.tipo === 'esporte' ? '?esporte=' + ctx.id : ctx.tipo === 'jogo' ? '?jogo=' + ctx.id : '') + '#produtos';
  }
  function hrefEditarDoCarrinho(cart) { return hrefEditar(cart && cart.produtos && cart.produtos.ctx ? cart.produtos.ctx : null); }

  /** A seleção de exemplo (`escolhidos=1`): produtos baratos e que existem em todo contexto. */
  function selecaoDemo(ctx, cat) {
    var sel = {}, p0 = cat.filter(function (p) { return p.tipo === 'qtd' && !p.obrigatorio && !p.exige && !(p.prazoDias) && !(p.soCasa && ctx && ctx.visitante); });
    var alvo = alvosDoModo(cat, MODO);
    p0 = p0.filter(function (p) { return alvo.prodEsgotado !== p.id && alvo.prazo !== p.id && alvo.obrigatorio !== p.id; });
    if (!p0.length) return sel;
    var a = p0[0];
    if (temOpcoes(a)) { var it = a.opcoes.itens.filter(function (x) { return x.id === 'dom'; })[0] || a.opcoes.itens.filter(function (x) { return x.id === 'M'; })[0] || a.opcoes.itens.filter(function (x) { return x.estoque !== 0; })[0] || a.opcoes.itens[0]; sel[a.id + '|' + it.id] = 1; } else sel[a.id] = 1;
    var b = p0[1];
    if (b) { if (temOpcoes(b)) { var it2 = b.opcoes.itens.filter(function (x) { return x.id === 'M'; })[0] || b.opcoes.itens[0]; sel[b.id + '|' + it2.id] = 1; } else sel[b.id] = 1; }
    return sel;
  }
  /** Carrinho de exemplo do fluxo de shows (Quem vai e Como pagar abertos direto com `?escolhidos=1`). */
  function carrinhoDemoShow() {
    var ctx = contexto(), cat = catalogo(ctx), est = Object.assign(estadoVazio(), { sel: selecaoDemo(ctx, cat) });
    var cart = { day: 'dom', q: { 'dom|pista-int': 2 }, seats: [], coupon: '', lines: [{ qty: 2, label: 'Dom 8 nov · Pista · Inteira', total: brl(396) }],
      holders: [{ label: 'Dom 8 nov · Pista', meia: false }, { label: 'Dom 8 nov · Pista', meia: false }], subtotal: 360, discount: 0, fees: 36, total: 396 };
    var res = resolver(ctx, cat, est, ingressosDoCarrinho(cart));
    return aplicarAoCarrinho(cart, ctx, res, est);
  }
  /** Junta os produtos a um carrinho de ingressos (linhas, total e ctx). `cart.subtotal` e `cart.fees` continuam só de ingressos. */
  function aplicarAoCarrinho(cart, ctx, res, est) {
    var c = copia(cart);
    c.totalIngressos = cart.total;
    c.produtos = res.n > 0 ? produtosDoCarrinho(ctx, res, est) : null;
    if (c.produtos) { c.lines = (cart.lines || []).concat(res.resumo); c.total = cart.total + res.total; }
    return c;
  }

  /* ---------------------------------------------------------------------------------------------------------------
     8. Subtipos do Component (fluxo de shows e de jogos). O esporte não passa por aqui: jornada-esporte.js chama montar() e resolver().
     --------------------------------------------------------------------------------------------------------------- */
  function subtipoIngressos(Base) {
    return class extends Base {
      constructor(props) {
        super(props);
        if (JE() || JF()) return;
        var ctx = contexto(), cat = catalogo(ctx), saved = ix().store.get('cart', null);
        var est = estadoVazio();
        if (ESCOLHIDOS) {
          var q = { 'dom|pista-int': 2 };
          est.sel = selecaoDemo(ctx, cat);
          var holdEnd = Date.now() + 10 * 60 * 1000; ix().store.set('holdEnd', holdEnd);
          this.state = Object.assign({}, this.state, { q: q, seats: [], day: 'dom', holdEnd: holdEnd, prd: est });
          return;
        }
        if (saved && saved.produtos && ctxIgual(saved.produtos.ctx, ctx)) { est.sel = copia(saved.produtos.sel); est.opc = copia(saved.produtos.opc); }
        this.state = Object.assign({}, this.state, { prd: est });
      }
      componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        if (JE() || JF()) return;
        // «Editar produtos»: rola até o bloco (o React o monta depois do primeiro desenho)
        if (location.hash === '#produtos') {
          var tenta = 0;
          (function ir() {
            var el = document.getElementById('produtos');
            var portao = root.hasAttribute('data-mov-gate') || root.hasAttribute('data-mov-nav-gate');
            if ((!el || portao) && tenta++ < 40) { setTimeout(ir, 60); return; }
            if (el && window.IX && window.IX.revelar) window.IX.revelar(el, { modo: 'inicio', espera: 360 });
          })();
        }
      }
      renderVals() {
        var v = super.renderVals();
        if (JE() || JF() || !v.cart || !this.state.prd) return v;
        var self = this, ctx = contexto(), cat = catalogo(ctx), ing = ingressosDoCarrinho(v.cart), est = this.state.prd, IX = ix();
        var temIng = ing.n > 0;
        // o primeiro ingresso acaba de ser escolhido: o bloco entra com a coreografia (o atributo fica até o bloco sair, para uma nova renderização não cortar a entrada)
        if (!temIng) this.__prdEntra = false; else if (this.__prdTinha === false) this.__prdEntra = true;
        this.__prdTinha = temIng;
        var entra = !!this.__prdEntra;
        var atualizar = function (patch, soUI) { self.setState({ prd: Object.assign({}, self.state.prd, patch) }); };
        var m = montar({ ctx: ctx, cat: cat, est: est, ing: ing, atualizar: atualizar, atual: function () { return self.state.prd; }, numero: '3', entra: entra });
        var res = m.res;
        // a seleção que não cabe mais (menos ingressos, outro dia, outro tipo) é ajustada e explicada
        if (res.mudou && !this.__prdPend) {
          this.__prdPend = true;
          setTimeout(function () { self.__prdPend = false; self.setState({ prd: Object.assign({}, self.state.prd, { sel: res.sel, avisos: res.avisos }) }); }, 0);
        }
        var cart = aplicarAoCarrinho(v.cart, ctx, res, est);
        var n = res.n, hasItems = v.hasItems;
        var out = Object.assign({}, v, m.vm, resumoVals(cart, hrefEditar(ctx)));
        out.prdBloco = m.vm.prdBloco && temIng;
        out.lines = cart.lines;
        out.total = brlc(cart.total);
        out.cbarTotal = hasItems ? brlc(cart.total) : '';
        if (hasItems && n > 0) {
          out.peopleLine = fraseProdutos(['ingresso', 'ingressos'], ing.n, n);        // o modelo acrescenta « · ou em até 6× no cartão»
          out.cbarNote = fraseProdutos(['ingresso', 'ingressos'], ing.n, n, ' e ');
        }
        var base = v.goNext;
        out.goNext = function () {
          if (!hasItems || v.holdExpired) return base();                 // os avisos de «escolha um ingresso» e de reserva são os de sempre
          var r = revalidar(ctx, cat, self.state.prd, ing, {});
          if (r.ajustou) {
            self.setState({ prd: Object.assign({}, self.state.prd, { sel: r.sel, avisos: r.avisos, erroUsado: self.state.prd.erroUsado || r.usouErro }) });
            if (window.IX && window.IX.revelar) window.IX.revelar('prd-aviso-0', { foco: true, espera: 80 });
            return;
          }
          IX.store.set('cart', cart);
          IX.store.del(CHAVE_PAG_ERRO);
          window.location.href = 'Checkout.dc.html';
        };
        return out;
      }
    };
  }

  function subtipoCheckout(Base) {
    return class extends Base {
      constructor(props) {
        super(props);
        if (!JE() && !JF() && ESCOLHIDOS) this.state = Object.assign({}, this.state, { cart: carrinhoDemoShow() });
      }
      renderVals() {
        var v = super.renderVals();
        var self = this, je = JE(), cart = je ? je.carrinho() : this.state.cart, out = Object.assign({}, v, resumoVals(cart, hrefEditarDoCarrinho(cart)));
        // «Editar produtos» sai da etapa sem «Ir para o pagamento»: o que já foi digitado é guardado como o botão guardaria (o esporte já guarda a cada toque)
        if (!je) out.prdRascunho = function () {
          var hs = (self.state.cart && self.state.cart.holders) || [];
          ix().store.set('quemvai', { later: !!(self.state.later && hs.length > 1), f: self.state.f, paisTel: self.state.paisTel, sig: JSON.stringify(hs.map(function (h) { return h.label; })) });
        };
        return out;
      }
    };
  }

  function subtipoPagamento(Base) {
    return class extends Base {
      constructor(props) {
        super(props);
        if (!JE() && !JF() && ESCOLHIDOS) this.state = Object.assign({}, this.state, { cart: carrinhoDemoShow() });
      }
      renderVals() {
        var v = super.renderVals();
        var self = this, IX = ix(), cart = this.state.cart, pr = cart && cart.produtos;
        var out = Object.assign({}, v, resumoVals(cart, hrefEditarDoCarrinho(cart)));
        Object.assign(out, pedidoVals(this.state.stage === 'done' ? pr : null));
        // 4.8: o produto esgotou antes do pagamento (única exceção que bloqueia: há dinheiro). URL `produtos=erro` ou a chave do painel.
        var marcado = IX.store.get(CHAVE_PAG_ERRO, null) || (MODO === 'erro' ? '*' : null);
        var item = pr && pr.n > 0 && marcado ? (marcado === '*' ? pr.itens[0] : pr.itens.filter(function (i) { return i.id === marcado; })[0]) : null;
        var bloq = !!item && this.state.stage !== 'done';
        var ctx = pr && pr.ctx ? pr.ctx : contexto(), cat = catalogo(ctx);
        var prod = item ? cat.filter(function (p) { return p.id === item.id; })[0] : null;
        out.prdErroPag = bloq;
        out.prdErroTexto = bloq ? cap1(prod ? prod.ref : 'o produto') + ' esgotou antes do pagamento. Nada foi cobrado. Tire o produto do pedido para seguir.' : '';
        out.prdSimOpts = [[false, 'Estoque normal'], [true, 'Produto esgotou']].map(function (a) {
          var ligado = !!IX.store.get(CHAVE_PAG_ERRO, null);
          return { label: a[1], on: ligado === a[0] ? 'true' : 'false', pick: function () { if (a[0] && pr && pr.n > 0) IX.store.set(CHAVE_PAG_ERRO, pr.itens[0].id); else IX.store.del(CHAVE_PAG_ERRO); self.setState({ prdTick: Date.now() }); } };
        });
        out.prdTemSim = !!(pr && pr.n > 0);
        if (bloq) {
          out.payDisabled = 'true';
          out.pay = function () { IX.toast('Tire o produto que esgotou do pedido para seguir. Nada foi cobrado.', 'warn'); if (window.IX && window.IX.revelar) window.IX.revelar('prd-erro-pag', { foco: true, espera: 0 }); };
        }
        return out;
      }
    };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     9. Acabamento da tela: `inert` no acordeão fechado (o motor de templates não liga atributos booleanos desconhecidos) e a chave «Produtos» na engrenagem de
     Ingressos (no mesmo padrão da chave «Perguntas do produtor» do Quem vai): cada chip recarrega a tela no estado pedido (`produtos=` e `escolhidos=1`).
     --------------------------------------------------------------------------------------------------------------- */
  var MODOS = [['1', 'Com produtos'], ['0', 'Sem produtos'], ['esgotado', 'Esgotado'], ['obrigatorio', 'Obrigatório'], ['prazo', 'Prazo vencido'], ['erro', 'Erro de estoque']];
  function sincronizarInert() {
    document.querySelectorAll('.acd').forEach(function (a) {
      var fechado = a.getAttribute('data-aberto') !== 'true';
      if (fechado && !a.hasAttribute('inert')) a.setAttribute('inert', '');
      else if (!fechado && a.hasAttribute('inert')) a.removeAttribute('inert');
    });
  }
  function chaveNoPainel() {
    if (root.getAttribute('data-pagina') !== 'ingressos') return;
    document.querySelectorAll('.proto .proto-in').forEach(function (painel) {
      if (painel.querySelector(':scope > [data-prd-chave]')) return;
      var g = document.createElement('div'); g.setAttribute('data-prd-chave', ''); g.className = 'prd-chave';
      g.innerHTML = '<div class="over">Produtos</div>' + MODOS.map(function (m) { return '<button type="button" class="chip chip-sm" data-modo="' + m[0] + '" aria-pressed="' + (MODO === m[0] ? 'true' : 'false') + '">' + m[1] + '</button>'; }).join('');
      g.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-modo]'); if (!b) return;
        var u = new URL(location.href); u.searchParams.set('produtos', b.getAttribute('data-modo')); if (!u.searchParams.get('escolhidos')) u.searchParams.set('escolhidos', '1'); u.hash = '';
        location.href = u.toString();
      });
      var ir = painel.querySelector(':scope > [data-ir-para]');
      painel.insertBefore(g, ir ? ir.nextSibling : painel.firstChild);
    });
  }
  var agendado = 0;
  function acabamento() { if (agendado) return; agendado = setTimeout(function () { agendado = 0; sincronizarInert(); chaveNoPainel(); }, 40); }
  function iniciar() { acabamento(); new MutationObserver(acabamento).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-aberto'] }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  function subtipoCarteira(Base) {
    return class extends Base {
      renderVals() {
        var v = super.renderVals();
        if (JE() || JF()) return v;                                    // a Carteira esportiva e a de futebol montam os dela (jornada-esporte.js, jornada-futebol.js)
        var order = this.state.order, pr = order && order.produtos ? order.produtos : null;
        if (!pr && ESCOLHIDOS && !order) pr = carrinhoDemoShow().produtos;
        return Object.assign({}, v, pedidoVals(pr));
      }
    };
  }

  var API = {
    contexto: contexto, catalogo: catalogo, normal: normal, estadoVazio: estadoVazio, resolver: resolver, montar: montar, revalidar: revalidar,
    ingressosDoCarrinho: ingressosDoCarrinho, ingressosDeInscricoes: ingressosDeInscricoes, produtosDoCarrinho: produtosDoCarrinho, aplicarAoCarrinho: aplicarAoCarrinho,
    resumoVals: resumoVals, pedidoVals: pedidoVals, fraseProdutos: fraseProdutos, hrefEditar: hrefEditar, selecaoDemo: selecaoDemo, carrinhoDemoShow: carrinhoDemoShow, brl: brl,
    modo: function () { return MODO; }, escolhidos: function () { return ESCOLHIDOS; }, chavePagErro: CHAVE_PAG_ERRO,
    subtipo: function (pagina) { return { ingressos: subtipoIngressos, checkout: subtipoCheckout, pagamento: subtipoPagamento, carteira: subtipoCarteira }[pagina]; }
  };
  window.IngresseProdutos = API;
})();
