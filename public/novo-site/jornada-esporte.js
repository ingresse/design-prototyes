/* jornada-esporte.js: a jornada de inscrição da Ingresse Sports (Mariana Teixeira, 28/10/2026), como UMA CAMADA sobre as telas da compra.
   Fonte: tools/previa/jornada-esporte/jornada-esporte.js; o gerador (tools/previa/jornada-esporte.mjs) copia para previa/jornada-esporte.js
   e grava os dados em previa/jornada-esporte-dados.js (window.JE_DADOS, vindo de previa/dados/esportes.json e tools/previa/paises.json).
   Ativa só com ?esporte=<id> (por exemplo, Ingressos.dc.html?esporte=2001); sem o parâmetro nada daqui roda e o fluxo de shows segue como está.
   Documento: docs/produto/JORNADA-ESPORTIVA-PROTOTIPO.md. Escopo: docs/produto/INGRESSE-SPORTS-ESCOPO-E-IA.md (seção 4).

   As quatro etapas (a compra de shows continua em Ingressos > Quem vai > Como pagar > Pronto):
     E1 Sua prova          Ingressos.dc.html?esporte=<id>[&prova=<id da prova>]   provas, tipo de inscrição, quantidade, produtos, cupom, botão de grupo
     E2 Quem vai <verbo>   Checkout.dc.html?esporte=<id>                           um cartão por inscrição, dados do atleta e perguntas do produtor
     E3 Como pagar         Pagamento.dc.html?esporte=<id>                          recapitulação com Editar e o acordeão de pagamento que já existe
     E4 Sua largada        Pagamento.dc.html?esporte=<id> (estado final)           o filme, o cartão de número de peito, a Carteira
   Cada tela é um subtipo do Component da tela comum (o módulo .mjs acrescenta o subtipo ao fim do script): o que não é esporte volta ao comum. */
(function () {
  'use strict';
  if (window.JornadaEsporte) return;

  var D = window.JE_DADOS || null;
  var qs = new URLSearchParams(location.search);
  var ID = qs.get('esporte');
  var EV = D && ID && D.eventos && D.eventos[ID] ? D.eventos[ID] : null;
  var root = document.documentElement;
  var PAG = root.getAttribute('data-pagina') || '';

  var HOLD_MS = 20 * 60 * 1000;                 // 20 minutos na compra esportiva (escopo 1.5; marcação a confirmar com o Marcelino)
  var CPF_CONTA = '52998224725';                // CPF fictício da conta de exemplo: só para a regra de "CPF repetido na mesma prova"
  var TEL_CONTA = '+55 11 91234-5678';          // telefone fictício da conta de exemplo
  var ARREPENDIMENTO_DIAS = 7;                  // janela provisória do arrependimento (valor do Jurídico: pergunta 4 da Helena)
  var LINK_DIAS_PADRAO = 7;                     // prazo para o participante completar os dados, em dias antes da retirada (padrão do escopo)

  /* ---------------------------------------------------------------------------------------------------------------
     1. Utilitários
     --------------------------------------------------------------------------------------------------------------- */
  function ix() { return window.IX || { store: { get: function (k, d) { return d; }, set: function () {}, del: function () {} }, toast: function () {} }; }
  var TZ = 'America/Sao_Paulo';
  var fWd = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short' });
  var fWdL = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' });
  var fDia = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric' });
  var fMes = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: 'short' });
  var fMesL = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, month: 'long' });
  var fAno = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, year: 'numeric' });
  var fHm = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: false });
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var sem = function (s) { return String(s).replace('.', ''); };
  var ms = function (iso) { return iso ? Date.parse(iso) : 0; };
  function agora() { return window.IngresseLembretes && window.IngresseLembretes.agora ? window.IngresseLembretes.agora() : Date.now(); }
  function hora(t) {
    var p = fHm.formatToParts(new Date(t)), h = '', m = '';
    p.forEach(function (x) { if (x.type === 'hour') h = String(Number(x.value)); if (x.type === 'minute') m = x.value; });
    return m === '00' ? h + 'h' : h + 'h' + m;
  }
  function dataCurta(t) { var d = new Date(t); return cap(sem(fWd.format(d))) + ' ' + fDia.format(d) + ' ' + sem(fMes.format(d)); }       // Dom 6 jun
  function diaMes(t) { var d = new Date(t); return fDia.format(d) + ' ' + sem(fMes.format(d)); }                                          // 6 jun
  function dataLonga(t) { var d = new Date(t); return fWdL.format(d) + ', ' + fDia.format(d) + ' de ' + fMesL.format(d); }                 // domingo, 6 de junho
  function diaMesLongo(t) { var d = new Date(t); return fDia.format(d) + ' de ' + fMesL.format(d); }                                       // 6 de junho
  function ano(t) { return fAno.format(new Date(t)); }
  function somaDias(t, n) { return t + n * 86400000; }
  var reais = function (cents) { return Math.ceil(cents / 100 - 1e-9); };             // preço sem centavos (arredonda para cima, como o cartão da categoria)
  var brl = function (v) { return 'R$ ' + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var km = function (m) { var n = m / 1000; return Number.isInteger(n) ? String(n) : String(+n.toFixed(1)).replace('.', ','); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var digits = function (v) { return String(v || '').replace(/\D/g, ''); };
  var unicos = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
  var mmss = function (left) { var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000); return mm + ':' + pad(ss); };
  var reduzido = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; };

  /* ---------------------------------------------------------------------------------------------------------------
     2. Vocabulário por modalidade (escopo 4.2, com a decisão do Wander de 27/10: triathlon e aventura são "participar")
     --------------------------------------------------------------------------------------------------------------- */
  var VERBOS = { corrida: 'correr', 'trail-run': 'correr', caminhada: 'caminhar', ciclismo: 'pedalar', 'mountain-bike': 'pedalar', natacao: 'nadar', 'canoagem-va-a': 'remar', 'beach-tennis': 'jogar', futevolei: 'jogar' };
  function vocab() {
    if (!EV) return { verbo: 'participar', etapa4: 'Sua largada' };
    var m = EV.modalidade;
    return { verbo: EV.virtual ? 'participar' : (VERBOS[m] || 'participar'), etapa4: EV.virtual ? 'Sua inscrição' : (m === 'beach-tennis' || m === 'futevolei') ? 'Seu torneio' : 'Sua largada' };
  }
  var TIPOS = { geral: 'Geral', pcd: 'Inclusiva (PcD)', kids: 'Kids', acompanhante: 'Acompanhante', meia: 'Meia-entrada', estreante: 'Estreante', filiado: 'Filiado', beneficente: 'Beneficente' };
  var GENEROS = { F: 'Feminino', M: 'Masculino', NB: 'Não binário', ND: 'Prefiro não dizer' };

  /* ---------------------------------------------------------------------------------------------------------------
     3. A prova, o lote e os totais
     --------------------------------------------------------------------------------------------------------------- */
  function prova(id) { return EV ? EV.provas.filter(function (r) { return r.id === id; })[0] || null : null; }
  function loteAtual(r) { for (var i = 0; i < r.lotes.length; i++) if (r.lotes[i].estado === 'open') return r.lotes[i]; return null; }
  function loteSeguinte(r, atual) { var i = atual ? r.lotes.indexOf(atual) : -1; for (var j = i + 1; j < r.lotes.length; j++) if (r.lotes[j].estado === 'upcoming') return r.lotes[j]; return null; }
  function selecionavel(r) { return r.estado === 'open' || r.estado === 'presale'; }
  function precoUn(r) { var l = loteAtual(r); return l ? reais(l.total) : 0; }
  function faceUn(r) { var l = loteAtual(r); return l ? Math.min(reais(l.total), Math.round(l.face / 100)) : 0; }
  // distância em destaque: número e unidade; nas provas que não se medem em km (triathlon, aventura, quadra), o nome da prova
  function destaque(r) {
    var m = EV.modalidade;
    var semKm = !r.metros || m === 'triathlon' || m === 'corrida-de-aventura' || m === 'beach-tennis' || m === 'futevolei' || m === 'canoagem-va-a';
    if (semKm) return { big: r.nome.replace(/\s*\(.*\)$/, ''), unidade: '' };
    return r.metros < 1000 ? { big: String(r.metros), unidade: 'm' } : { big: km(r.metros), unidade: 'km' };
  }
  function restantes(r) { return r.capacidade ? Math.max(0, r.capacidade - r.vendidas) : null; }
  function limiteCompra() { return (EV.reg && EV.reg.limite) || 10; }
  /* Produtos (antes «Extras»; DE-41): o catálogo, os limites, as variações e o estoque são do módulo comum previa/produtos.js (window.IngresseProdutos),
     o mesmo do show e do jogo. O pacote de fotos (fase 2, escopo 1.2 bloco C) fica fora do catálogo. */
  var PRD = function () { return window.IngresseProdutos; };
  var CTX_PRD = function () { return { tipo: 'esporte', id: String(ID) }; };
  function contar(sel) { var n = 0; Object.keys(sel).forEach(function (k) { n += sel[k]; }); return n; }

  /** Linhas, inscrições individuais e totais a partir da seleção. Tudo em reais inteiros (sem centavos). Os produtos não entram na taxa nem no cupom. */
  function calcular(sel, prd, cupom) {
    var insc = [], linhas = [], face = 0, totalInsc = 0;
    EV.provas.forEach(function (r) {
      r.tipos.forEach(function (t) {
        var q = sel[r.id + '|' + t] || 0;
        if (!q) return;
        var pu = precoUn(r), fu = faceUn(r);
        for (var k = 0; k < q; k++) insc.push({ raceId: r.id, rn: r.nome, tipo: t, tipoRot: TIPOS[t] || t, preco: pu, face: fu });
        linhas.push({ qty: q, label: r.nome + ' · ' + (TIPOS[t] || t), total: brl(q * pu) });
        face += q * fu; totalInsc += q * pu;
      });
    });
    var P = PRD(), est = prd || P.estadoVazio();
    var produtos = P.resolver(CTX_PRD(), P.catalogo(CTX_PRD()), est, P.ingressosDeInscricoes(insc.length));
    var taxa = totalInsc - face;
    var desconto = cupom ? Math.round(totalInsc * 0.1) : 0;
    var totalIng = totalInsc - desconto;
    return { insc: insc, linhas: linhas.concat(produtos.resumo), subtotal: face, taxa: taxa, desconto: desconto, total: totalIng + produtos.total, totalIngressos: totalIng, produtos: produtos, est: est, n: insc.length };
  }
  /** O carrinho que atravessa as telas (IX.store 'espCart'). `produtos` guarda a seleção, os itens e o total (o que o Quem vai, o Como pagar e o Pronto leem). */
  function carrinhoDe(st) {
    var c = calcular(st.sel, st.prd, st.coupon), P = PRD();
    return { ev: ID, sel: st.sel, coupon: st.coupon, insc: c.insc, lines: c.linhas, subtotal: c.subtotal, fees: c.taxa, discount: c.desconto, total: c.total, totalIngressos: c.totalIngressos, n: c.n,
      produtos: c.produtos.n > 0 ? P.produtosDoCarrinho(CTX_PRD(), c.produtos, c.est) : null };
  }
  /** Sem carrinho (a tela aberta direto pela URL): duas inscrições da primeira prova à venda. */
  function carrinhoDemo() {
    var r = EV.provas.filter(selecionavel)[0] || EV.provas[0];
    var tipo = r.tipos[0];
    var sel = {}; sel[r.id + '|' + tipo] = 2;
    var P = PRD(), prd = P.estadoVazio();
    if (qs.get('escolhidos') === '1') prd.sel = P.selecaoDemo(CTX_PRD(), P.catalogo(CTX_PRD()));       // `escolhidos=1`: produtos de exemplo, para ver o resumo e as etapas seguintes
    return carrinhoDe({ sel: sel, prd: prd, coupon: '' });
  }
  function carrinho() {
    var c = ix().store.get('espCart', null);
    return c && c.ev === ID && c.insc && c.insc.length ? c : carrinhoDemo();
  }
  function eventoHref() { return 'Evento.dc.html?esporte=' + ID; }
  function passoHref(p) { return ['', 'Ingressos', 'Checkout', 'Pagamento'][p] + '.dc.html?esporte=' + ID; }
  var PARECIDAS = 'Esportes.dc.html';

  /* ---------------------------------------------------------------------------------------------------------------
     4. Cabeçalho com a linha de percurso (docs/design/INGRESSE-SPORTS-DIRECAO-DE-ARTE-E-MOVIMENTO.md, 2.5)
     Barra de 4 px sob as etapas: avanço, nós e bandeira em vermelho da marca; 12,5 / 37,5 / 62,5 / 100 % por etapa.
     --------------------------------------------------------------------------------------------------------------- */
  var PROG = [0, 0.125, 0.375, 0.625, 1];
  function cabecalho(passo, back, backAria) {
    var v = vocab();
    var rot = ['Sua prova', 'Quem vai ' + v.verbo, 'Como pagar', v.etapa4];
    var antes = 0;
    try { var o = JSON.parse(sessionStorage.getItem('je:passo') || 'null'); if (o && o.ev === ID && Date.now() - o.t < 600000) antes = o.p; } catch (e) {}
    return {
      jePasso: passo, jeBack: back, jeBackAria: backAria, jeLogoHref: 'Esportes.dc.html',
      jeTitulo: EV.titulo, jeQuando: dataCurta(ms(EV.iso)) + ' · ' + hora(ms(EV.iso)) + ' · ' + EV.local.split(' · ')[0],
      jePassos: rot.map(function (r, i) {
        var n = i + 1;
        return { n: n, rot: r, cls: n === passo ? 'stp-on' : '', cur: n === passo ? 'step' : 'false', feito: n < passo, aFazer: n >= passo };
      }),
      jeMob: passo + ' de 4 · ' + rot[passo - 1],
      jeEstilo: '--je-p:' + PROG[passo],
      jeDe: String(PROG[antes] || 0), jeAte: String(PROG[passo]),
      jeNos: [1, 2, 3].map(function (n) { return { e: n < passo ? 'feito' : n === passo ? 'atual' : 'futuro', left: (PROG[n] * 100) + '%' }; }),
      jeChegou: passo === 4 ? 'true' : 'false'
    };
  }
  /** A barra avança do valor da etapa anterior ao da etapa atual, junto da entrada da etapa; o nó novo é "carimbado" (ES-14). */
  function animarPercurso(passo) {
    try { sessionStorage.setItem('je:passo', JSON.stringify({ ev: ID, p: passo, t: Date.now() })); } catch (e) {}
    var tentativas = 0;
    (function tenta() {
      var el = document.querySelector('.je-percurso');
      var portao = root.hasAttribute('data-mov-gate') || root.hasAttribute('data-mov-nav-gate');
      if ((!el || portao) && tentativas++ < 60) { setTimeout(tenta, 50); return; }
      if (!el || !el.animate || reduzido()) return;
      var cs = getComputedStyle(root);
      var num = function (n, d) { var x = parseFloat(cs.getPropertyValue(n)); return isNaN(x) ? d : x; };
      var base = num('--motion-duration-base', 280), fast = num('--motion-duration-fast', 160);
      if (!base) return;
      var de = parseFloat(el.getAttribute('data-de')) || 0, ate = parseFloat(el.getAttribute('data-ate')) || 0;
      var av = el.querySelector('.je-avanco');
      var ease = cs.getPropertyValue('--motion-ease-move').trim() || 'cubic-bezier(.4,0,.2,1)';
      var easeIn = cs.getPropertyValue('--motion-ease-enter').trim() || 'cubic-bezier(.2,.7,.2,1)';
      if (av && de !== ate) av.animate([{ transform: 'scaleX(' + de + ')' }, { transform: 'scaleX(' + ate + ')' }], { duration: base, easing: ease });
      var band = el.querySelector('.je-bandeira[data-on="true"]');
      if (band && de !== ate) band.animate([{ transform: 'translateY(-50%) scale(.6)', opacity: 0.4 }, { transform: 'translateY(-50%) scale(1)', opacity: 1 }], { duration: fast, delay: base * 0.6, easing: easeIn, fill: 'backwards' });
      var atual = el.querySelector('.je-no[data-e="atual"]');
      if (atual && de !== ate) atual.animate([{ transform: 'translate(-50%, -50%) scale(.6)', opacity: 0.4 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }], { duration: fast, delay: base * 0.6, easing: easeIn, fill: 'backwards' });
    })();
  }

  /* ---------------------------------------------------------------------------------------------------------------
     5. E1 · Sua prova
     --------------------------------------------------------------------------------------------------------------- */
  function estadoIngressos() {
    var IX = ix(), salvo = IX.store.get('espCart', null);
    var P = PRD(), sel = {}, prd = P.estadoVazio(), coupon = '';
    if (salvo && salvo.ev === ID) {
      sel = salvo.sel || {}; coupon = salvo.coupon || '';
      if (salvo.produtos) { prd.sel = Object.assign({}, salvo.produtos.sel); prd.opc = Object.assign({}, salvo.produtos.opc); }       // voltar e editar: as escolhas ficam
    }
    else if (qs.get('escolhidos') === '1' && !qs.get('prova')) {
      var rd = EV.provas.filter(selecionavel)[0] || EV.provas[0];
      sel[rd.id + '|' + rd.tipos[0]] = 2; prd.sel = P.selecaoDemo(CTX_PRD(), P.catalogo(CTX_PRD()));
    }
    else if (qs.get('prova') && prova(qs.get('prova')) && selecionavel(prova(qs.get('prova')))) { var r0 = prova(qs.get('prova')); sel[r0.id + '|' + r0.tipos[0]] = 1; }
    var hold = IX.store.get('espHold', null), holdEnd = hold && hold.ev === ID ? hold.end : 0;
    if (!holdEnd && contar(sel) > 0) { holdEnd = Date.now() + HOLD_MS; IX.store.set('espHold', { ev: ID, end: holdEnd }); }
    return { sel: sel, prd: prd, coupon: coupon, couponDraft: '', couponErr: '', couponOpen: false, holdEnd: holdEnd, msg: '' };
  }
  function mensagemFechado() {
    var ab = EV.reg && EV.reg.abre ? ms(EV.reg.abre) : 0, fe = EV.reg && EV.reg.fecha ? ms(EV.reg.fecha) : 0;
    switch (EV.situacao) {
      case 'nao-aberto': return { t: 'As inscrições ainda não abriram', p: ab ? 'As inscrições abrem em ' + diaMes(ab) + ', às ' + hora(ab) + '.' : 'As inscrições ainda não têm data para abrir.' };
      case 'esgotado': return { t: 'Esta prova esgotou', p: 'Esta prova esgotou. Veja provas parecidas ou volte à prova para pedir aviso se abrir vaga.' };
      case 'encerrado': return { t: 'Inscrições encerradas', p: 'Inscrições encerradas em ' + (fe ? diaMes(fe) : 'breve') + '. A prova acontece em ' + diaMes(ms(EV.iso)) + '.' };
      case 'adiado': return { t: 'Prova adiada', p: EV.novaData ? 'Prova adiada. Nova data: ' + diaMes(ms(EV.novaData)) + ', às ' + hora(ms(EV.novaData)) + '. As inscrições estão suspensas.' : 'Prova adiada. Data a confirmar. As inscrições estão suspensas.' };
      case 'cancelado': return { t: 'Prova cancelada', p: 'Prova cancelada. Quem se inscreveu recebe o reembolso automático, em até 10 dias úteis.' };
      default: return { t: 'Inscrições fechadas', p: 'As inscrições desta prova não estão abertas agora.' };
    }
  }
  function ingressosVals(c) {
    var IX = ix(), st = c.state.je, now = c.state.jeNow || Date.now();
    var v = vocab();
    var aberto = (EV.situacao === 'venda' || EV.situacao === 'pre') && EV.ciclo === 'scheduled';
    var lim = limiteCompra();
    var calc = calcular(st.sel, st.prd, st.coupon);
    var total = contar(st.sel);
    var atLimit = total >= lim;

    var guardar = function (next) { IX.store.set('espCart', carrinhoDe(next)); };
    var comHold = function (patch) {
      var next = Object.assign({}, c.state.je, patch);
      var n = contar(next.sel), holdEnd = c.state.je.holdEnd;
      if (n > 0 && (!holdEnd || holdEnd < Date.now())) holdEnd = Date.now() + HOLD_MS;
      if (n === 0) holdEnd = 0;
      next.holdEnd = holdEnd;
      IX.store.set('espHold', { ev: ID, end: holdEnd });
      guardar(next);
      c.setState({ je: next, jeNow: Date.now() });
    };
    var setSel = function (k, d) { var s = Object.assign({}, c.state.je.sel), n = Math.max(0, (s[k] || 0) + d); if (n > 0) s[k] = n; else delete s[k]; comHold({ sel: s }); };

    var degrau = function (qtdAtual, mudar, max, rotuloDe, ariaBase) {
      return { qty: qtdAtual, noDec: qtdAtual === 0, noInc: qtdAtual >= max,
        qtyLabel: qtdAtual + (qtdAtual === 1 ? ' selecionada' : ' selecionadas'),
        decLabel: 'Remover ' + ariaBase, incLabel: 'Adicionar ' + ariaBase, grupoLabel: 'Quantidade: ' + ariaBase,
        dec: function () { mudar(-1); }, inc: function () { mudar(1); } };
    };

    var provas = EV.provas.map(function (r) {
      var lote = loteAtual(r), seg = loteSeguinte(r, lote), ok = aberto && selecionavel(r) && !!lote;
      var d = destaque(r), vagas = restantes(r);
      var anterior = lote && r.lotes[r.lotes.indexOf(lote) - 1];
      var loteTxt = '', loteAnt = '';
      if (lote) {
        loteTxt = lote.nome + ' até ' + diaMes(ms(lote.ate)) + (seg ? ' · depois ' + brl(reais(seg.total)) : '');
        if (anterior && anterior.estado === 'sold-out') loteAnt = anterior.nome + ' esgotado.';
      }
      var selo = '', seloSit = '';
      if (r.estado === 'sold-out') { selo = 'Esgotada'; seloSit = 'esgotado'; }
      else if (r.estado === 'closed') { selo = 'Inscrições fechadas'; seloSit = 'encerrado'; }
      else if (r.estado === 'upcoming') { selo = EV.reg && EV.reg.abre ? 'Abre em ' + diaMes(ms(EV.reg.abre)) : 'Ainda não abriu'; seloSit = 'nao-aberto'; }
      else if (r.estado === 'cancelled') { selo = 'Cancelada'; seloSit = 'cancelado'; }
      else if (ok && r.capacidade && vagas / r.capacidade <= 0.1) { selo = 'Últimas vagas deste lote'; seloSit = 'ultima'; }
      var qtdRace = 0; r.tipos.forEach(function (t) { qtdRace += st.sel[r.id + '|' + t] || 0; });
      var tipos = r.tipos.map(function (t) {
        var k = r.id + '|' + t, q = st.sel[k] || 0;
        var nota = t === 'kids' ? 'De ' + r.idadeMin + ' a ' + r.idadeMax + ' anos · o responsável informa os dados' : t === 'acompanhante' ? 'Adulto que acompanha a criança' : t === 'pcd' ? 'Pode pedir documento na retirada do kit' : lote ? lote.nome : '';
        var o = degrau(q, function (d) { setSel(k, d); }, 0, '', r.nome + ', ' + (TIPOS[t] || t));
        o.noInc = !ok || total + 1 > lim || (vagas != null && qtdRace + 1 > vagas);          // limite da compra e vagas que restam na prova
        return Object.assign({ rot: TIPOS[t] || t, nota: nota, preco: ok ? brl(precoUn(r)) : '' }, o);
      });
      var unico = tipos.length === 1;
      return Object.assign({
        idNome: 'je-prova-' + r.id, nome: r.nome, big: d.big, unidade: d.unidade,
        largada: 'Largada ' + dataCurta(ms(r.inicio)) + ', ' + hora(ms(r.inicio)),
        lote: loteTxt, loteAnt: loteAnt, hasSelo: !!selo, selo: selo, seloSit: seloSit,
        sel: qtdRace > 0 ? 'true' : 'false', off: ok ? 'false' : 'true', destaque: qs.get('prova') === r.id ? 'true' : 'false',
        unico: unico && ok, multi: !unico && ok, tipos: tipos,
        preco: ok ? brl(precoUn(r)) : '', precoNota: ok && lote ? 'com taxa' : '', aPartir: 'a partir de',
        tiposNota: 'Escolha o tipo que vale para você. Alguns pedem documento na retirada do kit.'
      }, unico ? tipos[0] : {});
    });
    // com um tipo só, a linha da prova leva o degrau; o spread acima trouxe os campos do degrau (dec, inc, qty, ...)
    provas.forEach(function (p, i) { p.grupoLabel = 'Quantidade: ' + EV.provas[i].nome; });

    // produtos (DE-41): o mesmo bloco, as mesmas regras e o mesmo componente `.prd` do show e do jogo (previa/produtos.js)
    var P = PRD(), cat = P.catalogo(CTX_PRD()), ing = P.ingressosDeInscricoes(total);
    if (total === 0) c.__prdEntra = false; else if (c.__prdTinha === false) c.__prdEntra = true;       // o primeiro ingresso acaba de ser escolhido: o bloco entra; ao voltar, já está lá
    c.__prdTinha = total > 0;
    var mp = P.montar({ ctx: CTX_PRD(), cat: cat, est: st.prd, ing: ing, numero: '2', entra: !!c.__prdEntra, atual: function () { return c.state.je.prd; },
      atualizar: function (patch) { comHold({ prd: Object.assign({}, c.state.je.prd, patch) }); } });
    if (mp.res.mudou && !c.__prdPend) {                                                              // a seleção que não cabe mais (menos inscrições) é ajustada e explicada
      c.__prdPend = true;
      setTimeout(function () { c.__prdPend = false; comHold({ prd: Object.assign({}, c.state.je.prd, { sel: mp.res.sel, avisos: mp.res.avisos }) }); }, 0);
    }

    // cupom (microcopy ES-FL-07 a ES-FL-11)
    var aplicar = function () {
      var cod = (st.couponDraft || '').trim().toUpperCase();
      if (!cod) { comHold({ couponErr: 'Digite o cupom.' }); return; }
      if (cod === 'INGRESSE10' || cod === 'AMIGO10') { comHold({ coupon: cod, couponErr: '', couponDraft: '' }); IX.toast('Cupom aplicado: ' + cod + '.', 'ok'); }
      else if (cod === 'VENCIDO') comHold({ couponErr: 'Este cupom venceu em ' + diaMes(somaDias(agora(), -3)) + '.' });
      else if (cod === 'ESGOTADO') comHold({ couponErr: 'Este cupom já foi usado o máximo de vezes.' });
      else comHold({ couponErr: 'Este cupom não vale para esta prova. Confira o código ou tire a dúvida na página da prova.' });
    };

    // reserva
    var hasItems = total > 0;
    var left = st.holdEnd ? Math.max(0, st.holdEnd - now) : 0;
    var expired = hasItems && st.holdEnd > 0 && left === 0;
    var goNext = function () {
      if (!aberto) return;
      if (!hasItems) { IX.toast('Escolha pelo menos 1 inscrição para seguir.'); return; }
      if (expired) { IX.toast('Sua reserva expirou. Toque em “Reservar de novo”.'); return; }
      var rv = P.revalidar(CTX_PRD(), cat, st.prd, ing, {});                                          // 4.7: o que esgotou sai e a etapa não avança; o segundo toque segue
      if (rv.ajustou) {
        comHold({ prd: Object.assign({}, c.state.je.prd, { sel: rv.sel, avisos: rv.avisos, erroUsado: c.state.je.prd.erroUsado || rv.usouErro }) });
        if (window.IX && window.IX.revelar) window.IX.revelar('prd-aviso-0', { foco: true, espera: 80 });
        return;
      }
      IX.store.set('espCart', carrinhoDe(st));
      IX.store.del(P.chavePagErro);
      window.location.href = passoHref(2);
    };
    var fe = mensagemFechado();
    return Object.assign(cabecalho(1, eventoHref(), 'Voltar para a página da prova'), {
      espOn: true, espOff: false, jeEvento: EV.titulo, jeEventoHref: eventoHref(), jeParecidasHref: PARECIDAS,
      jeFechado: !aberto, jeFechadoTitulo: fe.t, jeFechadoTexto: fe.p, jeAberto: aberto, jePre: aberto && EV.situacao === 'pre',
      jeProvas: provas,
      atLimit: atLimit, limitMsg: 'Você chegou ao limite de ' + lim + ' inscrições por compra.' + (EV.grupo && EV.grupo.ativo ? ' Para mais vagas, use o botão de compra em grupo.' : ''),
      // cupom
      coupon: st.coupon, hasCoupon: !!st.coupon, noCoupon: !st.coupon, couponClosed: !st.coupon && !st.couponOpen && EV.situacao !== 'pre', couponOpenB: !st.coupon && (!!st.couponOpen || EV.situacao === 'pre'),
      openCoupon: function () { comHold({ couponOpen: true }); setTimeout(function () { var el = document.getElementById('cupom-in'); if (el) el.focus(); }, 50); },
      couponErr: st.couponErr, hasCouponErr: !!st.couponErr, couponInvalid: st.couponErr ? 'true' : 'false', couponDraft: st.couponDraft,
      typeCoupon: function (e) { comHold({ couponDraft: e.target.value, couponErr: '' }); },
      couponKey: function (e) { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } }, applyCoupon: aplicar,
      removeCoupon: function () { comHold({ coupon: '' }); },
      // grupo: só um botão, só onde o organizador habilitou; leva ao fluxo que já existe (DE-36)
      jeGrupo: aberto && !!(EV.grupo && EV.grupo.ativo), jeGrupoHref: EV.grupo && EV.grupo.url ? EV.grupo.url : '#',
      jeGrupoAria: 'Solicitar compra em grupo: ' + EV.titulo + '. Abre em uma nova aba',
      // resumo
      lines: calc.linhas, hasItems: hasItems, noItems: !hasItems, subtotal: brl(calc.subtotal), discount: brl(calc.desconto), fees: brl(calc.taxa), total: brl(calc.total),
      peopleLine: P.fraseProdutos(['inscrição', 'inscrições'], total, calc.produtos.n),
      holdOn: hasItems && st.holdEnd > 0, holdExpired: expired, holdState: expired ? 'expired' : left < 120000 ? 'urgent' : 'ok', holdLeft: expired ? '' : mmss(left),
      holdMsgA: expired ? 'Sua reserva expirou e as vagas voltaram para a venda.' : 'Suas vagas estão reservadas por',
      holdMsgB: expired ? '' : left < 120000 ? '— finalize agora para manter suas vagas.' : 'enquanto você finaliza.',
      renewHold: function () { var holdEnd = Date.now() + HOLD_MS; IX.store.set('espHold', { ev: ID, end: holdEnd }); c.setState({ je: Object.assign({}, st, { holdEnd: holdEnd }), jeNow: Date.now() }); IX.toast('Pronto, reservamos de novo por 20 minutos.', 'ok'); },
      goNext: goNext, ctaDisabled: aberto && hasItems && !expired ? 'false' : 'true',
      ctaLabel: hasItems ? 'Informar quem vai ' + v.verbo : 'Escolha sua prova', ctaShort: hasItems ? 'Informar quem vai ' + v.verbo : 'Escolher',
      cbarNote: hasItems ? (calc.produtos.n > 0 ? P.fraseProdutos(['inscrição', 'inscrições'], total, calc.produtos.n, ' e ') : total + (total === 1 ? ' inscrição' : ' inscrições') + ' · ver resumo') : 'Nenhuma inscrição escolhida',
      cbarTotal: hasItems ? brl(calc.total) : ''
    }, mp.vm, P.resumoVals({ produtos: calc.produtos.n > 0 ? { n: calc.produtos.n, total: calc.produtos.total, itens: calc.produtos.itens } : null }, P.hrefEditar(CTX_PRD())));
  }

  /* ---------------------------------------------------------------------------------------------------------------
     6. Telefone internacional (o componente de Checkout: bandeira, DDI e nome na lista; só a bandeira no campo)
     --------------------------------------------------------------------------------------------------------------- */
  var PAISES = (D && D.paises) || [{ c: 'BR', ddi: '55', nome: 'Brasil', g: [2, 5, 4] }];
  var paisPor = function (c) { return PAISES.filter(function (x) { return x.c === c; })[0] || PAISES[0]; };
  var maxNac = function (p) { return p.g.reduce(function (a, b) { return a + b; }, 0); };
  function fmtNac(p, d) {
    d = d.slice(0, maxNac(p));
    if (p.c === 'BR') { var g = d.length > 10 ? [2, 5, 4] : [2, 4, 4]; var a = d.slice(0, g[0]), b = d.slice(g[0], g[0] + g[1]), c = d.slice(g[0] + g[1]); return [a, b && (c ? b + '-' + c : b)].filter(Boolean).join(' '); }
    var out = [], i = 0; for (var j = 0; j < p.g.length; j++) { if (i >= d.length) break; out.push(d.slice(i, i + p.g[j])); i += p.g[j]; } return out.join(' ');
  }
  var fmtTel = function (p, nac) { return nac ? '+' + p.ddi + ' ' + fmtNac(p, nac) : ''; };
  var exTel = function (p) { var d = '1234567890123'.slice(0, maxNac(p)); return '+' + p.ddi + ' ' + (p.c === 'BR' ? '11 91234-5678' : fmtNac(p, d)); };
  function ddiDe(d, atual) {
    if (d.indexOf(atual.ddi) === 0) return atual;
    var melhor = null; PAISES.forEach(function (x) { if (d.indexOf(x.ddi) === 0 && (!melhor || x.ddi.length > melhor.ddi.length || (x.ddi === melhor.ddi && x.c === 'US'))) melhor = x; }); return melhor;
  }
  var nacDe = function (v, p) { var d = digits(v); return d.indexOf(p.ddi) === 0 ? d.slice(p.ddi.length) : d; };
  function lerTel(raw, atual) {
    var d = digits(raw);
    if (!d) return { p: atual, v: /\+/.test(raw) ? '+' : '' };
    if (/^\s*\+/.test(raw)) {
      var p = ddiDe(d, atual);
      if (p) return { p: p, v: fmtTel(p, d.slice(p.ddi.length)) || '+' + p.ddi };
      if (PAISES.some(function (x) { return x.ddi.indexOf(d) === 0; })) return { p: atual, v: '+' + d };
      return { p: atual, v: fmtTel(atual, d) };
    }
    return { p: atual, v: fmtTel(atual, d) };
  }
  var telOk = function (v, p) { return nacDe(v, p).length >= (p.c === 'BR' ? 10 : maxNac(p)); };

  /* ---------------------------------------------------------------------------------------------------------------
     7. E2 · Quem vai <verbo>
     Um cartão por inscrição. Primeira pergunta, por inscrição: Eu / Outra pessoa; em "Outra pessoa", preencher agora ou pedir que a
     pessoa preencha (link com prazo; o prazo e o botão de copiar estão em E4). Dados no mínimo, sem condição de saúde (escopo 4.4).
     askAt: 'titular' pode ficar para a pessoa; 'compra' é sempre pedido aqui (camiseta, telefone, adaptação, responsável de criança...).
     --------------------------------------------------------------------------------------------------------------- */
  var ehKids = function (ins) { var r = prova(ins.raceId); return !!(r && r.responsavel && ins.tipo === 'kids'); };
  function sigDe(insc) { return JSON.stringify(insc.map(function (x) { return x.raceId + '|' + x.tipo; })); }
  function estadoQuem() {
    var IX = ix(), cart = carrinho(), sig = sigDe(cart.insc);
    var salvo = IX.store.get('espQuemvai', null);
    salvo = salvo && salvo.ev === ID && salvo.sig === sig ? salvo : {};
    var hold = IX.store.get('espHold', null), holdEnd = hold && hold.ev === ID && hold.end > Date.now() ? hold.end : Date.now() + HOLD_MS;
    if (!hold || hold.ev !== ID || hold.end <= Date.now()) IX.store.set('espHold', { ev: ID, end: holdEnd });
    var cards = salvo.cards || cart.insc.map(function (x, i) { return { quem: i === 0 && !ehKids(x) ? 'eu' : 'outra', modo: 'agora', aberto: i === 0 || cart.insc.length <= 2 }; });
    return { cart: cart, holdEnd: holdEnd, cards: cards, f: salvo.f || {}, paisTel: salvo.paisTel || {}, errs: {}, telOpen: '', sem: !!IX.store.get('semPerguntas', false), aviso: '' };
  }
  /** As perguntas do produtor (no contrato real, `questions[]`; aqui derivadas dos dados da prova, já que o dado ainda não traz o campo). */
  function perguntasProdutor(r) {
    var q = [];
    if (EV.kit && EV.kit.itens.indexOf('bib') >= 0 && Number(EV.id) % 2 === 0) q.push({ id: 'nomePeito', rotulo: 'Nome no número de peito', tipo: 'texto', obrigatoria: false, ajuda: 'Até 12 caracteres.', maxlen: 12 });
    if (r.ondas && r.ondas.length > 1) {
      var dist = (r.metros || 0) / 1000;
      var fmtMin = function (m) { m = Math.round(m); return m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + 'h' + pad(m % 60) : Math.floor(m / 60) + 'h'); };
      var limites = r.ondas.map(function (o) { return o.ritmoMax ? (o.ritmoMax * dist) / 60 : null; });
      var ops = r.ondas.map(function (o, i) {
        var ate = limites[i], de = i > 0 ? limites[i - 1] : null;
        return { v: o.id, label: ate == null ? 'Mais de ' + fmtMin(de) : (de == null ? 'Até ' + fmtMin(ate) : 'De ' + fmtMin(de) + ' a ' + fmtMin(ate)) };
      });
      q.push({ id: 'tempo', rotulo: 'Seu tempo estimado', tipo: 'escolha', opcoes: ops, obrigatoria: true, ajuda: 'Cada grupo sai em um horário diferente. Escolha o que mais combina com você.' });
    }
    return q;
  }
  function faixaDe(r, idade) {
    var set = D && D.faixas && r.faixas && D.faixas[r.faixas];
    if (!set) return '';
    for (var i = 0; i < set.length; i++) if (idade >= set[i].min && (set[i].max == null || idade <= set[i].max)) return set[i].max == null ? set[i].min + '+ anos' : set[i].min + ' a ' + set[i].max + ' anos';
    return '';
  }
  function parseNasc(v) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || ''); if (!m) return null;
    var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900) return null;
    if (Date.UTC(y, mo - 1, d) > agora()) return null;
    return { d: d, m: mo, y: y };
  }
  function idadeNaProva(n, r) {
    var t = new Date(ms(r.inicio)), p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(t).forEach(function (x) { p[x.type] = +x.value; });
    var ref = EV.regraIdade === 'on_dec_31' ? { year: p.year, month: 12, day: 31 } : p;
    return ref.year - n.y - ((ref.month < n.m || (ref.month === n.m && ref.day < n.d)) ? 1 : 0);
  }
  var maskNasc = function (v) { var d = digits(v).slice(0, 8); return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3'); };
  var maskCpf = function (v) { var d = digits(v).slice(0, 11); return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2'); };
  function cpfOk(v) {
    var d = digits(v); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    var calc = function (n) { var s = 0; for (var i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); var r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  var nomeOk = function (v) { return (v || '').trim().split(/\s+/).filter(function (w) { return w.length > 1; }).length >= 2; };

  /** Os campos do cartão da inscrição `i`. `quem`/`modo` decidem o que aparece; `titular` vs `compra` é o askAt. */
  function camposDe(i, ins, cd, st) {
    var r = prova(ins.raceId), kid = ehKids(ins);
    var eu = cd.quem === 'eu' && !kid, depois = cd.quem === 'outra' && cd.modo === 'depois' && !kid;
    var L = [], ev = EV;
    var K = function (k) { return 'c' + i + '_' + k; };
    var add = function (secao, o) { o.key = o.key; o.secao = secao; L.push(o); };
    var generoRegra = (r.generos || []).filter(function (g) { return g === 'F' || g === 'M'; }).length > 0;
    var temCamiseta = ev.kit && ev.kit.itens.indexOf('shirt') >= 0 && ev.kit.camiseta;
    // 1. quem é
    if (!eu && !depois) {
      add('quem', { key: 'nome', tipo: 'texto', rotulo: kid ? 'Nome da criança' : 'Nome completo', ajuda: 'A inscrição é nominal. Escreva como está no documento que você leva na retirada do kit.', obrig: true, ac: 'name', quando: 'titular' });
      add('quem', { key: 'cpf', tipo: 'texto', rotulo: kid ? 'CPF da criança' : 'CPF', ajuda: 'Identifica quem vai participar. A inscrição é emitida neste CPF.', obrig: true, ph: '000.000.000-00', im: 'numeric', quando: 'titular' });
    }
    if (!depois) {
      add('quem', { key: 'nasc', tipo: 'texto', rotulo: 'Data de nascimento', ajuda: 'Usamos a data para colocar você na faixa etária certa.', obrig: true, ph: 'dd/mm/aaaa', im: 'numeric', quando: 'titular' });
      if (generoRegra) add('quem', { key: 'genero', tipo: 'escolha', rotulo: 'Gênero', ajuda: 'Usamos para colocar você na categoria certa da prova. Você pode escolher “Prefiro não dizer”.', obrig: true, quando: 'titular',
        opcoes: (ev.generos || ['F', 'M', 'NB', 'ND']).map(function (g) { return { v: g, label: GENEROS[g] || g }; }) });
    }
    if (!kid) add('quem', { key: 'tel', tipo: 'tel', rotulo: 'Telefone', ajuda: 'Escolha o país e digite o número. Usamos só para avisos sobre a prova.', obrig: true, quando: 'compra' });
    // 2. para a prova
    if (temCamiseta) {
      var d1 = ms(ev.retirada && ev.retirada.dias && ev.retirada.dias[0] ? ev.retirada.dias[0].data + 'T12:00:00-03:00' : ev.iso);
      add('prova', { key: 'camiseta', tipo: 'escolha', rotulo: 'Tamanho da camiseta', ajuda: 'Escolha com atenção: depois de ' + diaMes(somaDias(d1, -((ev.reg && ev.reg.prazoAtleta) || LINK_DIAS_PADRAO))) + ', não dá para trocar.', obrig: true, quando: 'compra',
        opcoes: ev.kit.camiseta.tamanhos.map(function (t) { return { v: t, label: t }; }) });
      if (ev.kit.camiseta.modelos && ev.kit.camiseta.modelos.length > 1) add('prova', { key: 'modelo', tipo: 'escolha', rotulo: 'Modelo da camiseta', ajuda: '', obrig: true, quando: 'compra',
        opcoes: ev.kit.camiseta.modelos.map(function (m) { return { v: m, label: m === 'feminino-babylook' ? 'Feminino (babylook)' : m === 'unissex' ? 'Unissex' : cap(m) }; }) });
    }
    if (!depois) add('prova', { key: 'equipe', tipo: 'texto', rotulo: 'Equipe ou assessoria', ajuda: 'Se você treina com uma equipe ou assessoria, escreva aqui. Pode deixar em branco.', obrig: false, ph: 'Nome da equipe ou assessoria', quando: 'titular' });
    // 3. segurança
    if (!depois) {
      add('seg', { key: 'emNome', tipo: 'texto', rotulo: 'Nome do contato de emergência', ajuda: 'Alguém que a organização possa avisar se acontecer algo com você na prova. Escolha uma pessoa que não vai participar com você.', obrig: true, ac: 'off', quando: 'titular' });
      add('seg', { key: 'emTel', tipo: 'tel', rotulo: 'Telefone do contato', ajuda: 'Escolha o país e digite o número.', obrig: true, quando: 'titular' });
    }
    add('seg', { key: 'adapt', tipo: 'texto', rotulo: 'Precisa de alguma adaptação?', ajuda: 'Conte só o que a organização precisa saber.', obrig: false, maxlen: 120, quando: 'compra' });
    // criança: responsável
    if (kid) {
      add('resp', { key: 'rNome', tipo: 'texto', rotulo: 'Nome do responsável', ajuda: '', obrig: true, ac: 'name', quando: 'compra' });
      add('resp', { key: 'rCpf', tipo: 'texto', rotulo: 'CPF do responsável', ajuda: '', obrig: true, ph: '000.000.000-00', im: 'numeric', quando: 'compra' });
      add('resp', { key: 'rTel', tipo: 'tel', rotulo: 'Telefone do responsável', ajuda: 'Escolha o país e digite o número.', obrig: true, quando: 'compra' });
    }
    // 4. pedido da organização
    if (!st.sem) perguntasProdutor(r).forEach(function (q) { add('org', Object.assign({ key: 'q_' + q.id, quando: 'compra' }, { tipo: q.tipo, rotulo: q.rotulo, ajuda: q.ajuda, obrig: q.obrigatoria, opcoes: q.opcoes, maxlen: q.maxlen })); });
    L.forEach(function (x) { x.id = K(x.key); x.fk = x.id; });
    return { L: L, eu: eu, depois: depois, kid: kid, race: r };
  }
  function quemVals(c, base) {
    var IX = ix(), st = c.state, je = st.je, cart = je.cart, v = vocab(), now = c.state.jeNow || Date.now();
    var f = je.f, errs = je.errs;
    var left = Math.max(0, je.holdEnd - now), expired = left === 0;
    var salvar = function (patch) {
      var n = Object.assign({}, c.state.je, patch);
      IX.store.set('espQuemvai', { ev: ID, sig: sigDe(cart.insc), cards: n.cards, f: n.f, paisTel: n.paisTel });
      c.setState({ je: n });
    };
    var setF = function (k, val) { var ne = Object.assign({}, errs); delete ne[k]; var nf = Object.assign({}, f); nf[k] = val; salvar({ f: nf, errs: ne }); };

    // CPF das outras inscrições da mesma prova (a regra de CPF repetido); "Eu" usa o CPF da conta
    var cpfDe = function (j) { var cd = je.cards[j], ins = cart.insc[j]; if (ehKids(ins)) return digits(f['c' + j + '_cpf']); if (cd.quem === 'eu') return CPF_CONTA; if (cd.modo === 'depois') return ''; return digits(f['c' + j + '_cpf']); };
    var erroCard = function (i, comMensagem) {
      var ins = cart.insc[i], cd = je.cards[i], def = camposDe(i, ins, cd, je), r = def.race, e = {};
      def.L.forEach(function (q) {
        var val = f[q.fk] || '';
        if (q.tipo === 'tel') {
          var pv = je.paisTel[q.fk] ? paisPor(je.paisTel[q.fk]) : (val.charAt(0) === '+' ? (ddiDe(digits(val), PAISES[0]) || PAISES[0]) : PAISES[0]);
          if (q.key === 'tel' && cd.quem === 'eu' && !val) return;                                // "Eu": telefone da conta
          if (!nacDe(val, pv)) { if (q.obrig) e[q.fk] = 'Digite um telefone.'; } else if (!telOk(val, pv)) e[q.fk] = 'Confira o telefone: o número parece incompleto.';
          return;
        }
        if (q.tipo === 'escolha') { if (q.obrig && !val) e[q.fk] = q.key === 'genero' ? 'Escolha uma opção.' : q.key === 'camiseta' ? 'Escolha o tamanho da camiseta.' : q.key === 'modelo' ? 'Escolha o modelo da camiseta.' : 'Escolha uma opção.'; return; }
        if (q.key === 'nome' || q.key === 'rNome' || q.key === 'emNome') { if (q.obrig && !nomeOk(val) && q.key !== 'emNome') e[q.fk] = 'Digite o nome completo.'; else if (q.key === 'emNome' && !val.trim()) e[q.fk] = 'Digite o nome de quem avisar.'; return; }
        if (q.key === 'cpf' || q.key === 'rCpf') {
          if (!cpfOk(val)) e[q.fk] = digits(val).length < 11 ? 'Confira o CPF: ele precisa ter 11 números.' : 'Confira o CPF: algum número está incorreto.';
          else if (q.key === 'cpf') for (var j = 0; j < cart.insc.length; j++) if (j !== i && cart.insc[j].raceId === ins.raceId && cpfDe(j) && cpfDe(j) === digits(val)) { e[q.fk] = 'Este CPF já tem inscrição nesta prova.'; e['!link' + q.fk] = 1; break; }
          return;
        }
        if (q.key === 'nasc') {
          var n = parseNasc(val);
          if (!n) { e[q.fk] = 'Confira a data de nascimento: use dia, mês e ano, como 28/04/1990.'; return; }
          var idade = idadeNaProva(n, r);
          if (r.idadeMin != null && idade < r.idadeMin) e[q.fk] = ehKids(ins) ? 'Esta prova é para crianças de ' + r.idadeMin + ' a ' + r.idadeMax + ' anos na data da prova. Confira a data de nascimento ou escolha outra prova.' : 'Esta prova é para quem tem ' + r.idadeMin + ' anos ou mais na data da prova. Confira a data de nascimento ou escolha outra prova.';
          else if (r.idadeMax != null && idade > r.idadeMax) e[q.fk] = ehKids(ins) ? 'Esta prova é para crianças de ' + r.idadeMin + ' a ' + r.idadeMax + ' anos na data da prova. Confira a data de nascimento ou escolha outra prova.' : 'Esta prova é para quem tem até ' + r.idadeMax + ' anos na data da prova. Confira a data de nascimento ou escolha outra prova.';
          return;
        }
        if (q.obrig && !val.trim()) e[q.fk] = 'Preencha este campo.';
      });
      // gênero e a regra da prova (descreve a regra, não a pessoa)
      var g = f['c' + i + '_genero'], regra = (r.generos || []).filter(function (x) { return x === 'F' || x === 'M'; });
      if (g && regra.length === 1 && regra[0] !== g && !e['c' + i + '_genero']) e['c' + i + '_genero'] = 'Nesta prova, a inscrição é para a categoria ' + (regra[0] === 'F' ? 'feminina' : 'masculina') + '. Confira o gênero informado ou escolha outra prova.';
      return e;
    };
    var todosErros = function () { var all = {}; for (var i = 0; i < cart.insc.length; i++) Object.assign(all, erroCard(i)); return all; };

    var cards = cart.insc.map(function (ins, i) {
      var cd = je.cards[i], def = camposDe(i, ins, cd, je), r = def.race;
      var errCard = erroCard(i);
      var nCpfLink = function (k) { return !!errCard['!link' + k]; };
      var nome = def.eu ? 'Pessoa Exemplo' : (f['c' + i + '_nome'] || '');
      var ok = Object.keys(errCard).filter(function (k) { return k.charAt(0) !== '!'; }).length === 0;
      var secoesDef = [
        { id: 'quem', titulo: def.kid ? 'Dados da criança' : 'Quem é', nota: '' },
        { id: 'prova', titulo: 'Para a prova', nota: '' },
        { id: 'seg', titulo: 'Segurança', nota: '' },
        { id: 'resp', titulo: 'Responsável pela inscrição', nota: '' },
        { id: 'org', titulo: 'Pedido pela organização da prova', nota: 'O que não tem “opcional” precisa ser respondido para seguir.' }
      ];
      var secoes = secoesDef.map(function (s) {
        var campos = def.L.filter(function (q) { return q.secao === s.id; }).map(function (q) {
          var val = f[q.fk] || '', er = errs[q.fk] || '';
          var o = { id: q.id, rotulo: q.rotulo, optTxt: q.obrig ? '' : '(opcional)', ajuda: q.ajuda || '', err: er, errB: er ? 'true' : 'false',
            isTexto: q.tipo === 'texto', isTel: q.tipo === 'tel', isEscolha: q.tipo === 'escolha', idAjuda: q.id + '_aj', inputmode: q.im || 'text', autocomplete: q.ac || 'off', maxlen: q.maxlen || 120, ph: q.ph || '',
            value: val, temLink: false, linkHref: '', linkTxt: '', temInfo: false, info: '' };
          if (q.key === 'cpf' && er && nCpfLink(q.fk)) { o.temLink = true; o.linkHref = 'Carteira.dc.html?esporte=' + ID + '&abrir=transferir'; o.linkTxt = 'Transferir inscrição'; }
          if (q.tipo === 'texto') {
            o.onInput = function (e) { var x = e.target.value; setF(q.fk, q.key === 'nasc' ? maskNasc(x) : (q.key === 'cpf' || q.key === 'rCpf') ? maskCpf(x) : x); };
            if (q.key === 'nasc') {
              var nn = parseNasc(val), g = f['c' + i + '_genero'];
              if (nn && !er && r.faixas && r.competitiva !== false) {
                var fx = faixaDe(r, idadeNaProva(nn, r)), gl = g === 'F' ? 'Feminino' : g === 'M' ? 'Masculino' : '';
                if (fx) { o.temInfo = true; o.info = 'Categoria nesta prova: ' + (gl ? gl + ', ' : '') + fx + '. Colocamos a inscrição nesta categoria com a data de nascimento e o gênero informados.'; }
              }
            }
          }
          if (q.tipo === 'escolha') {
            o.opcoes = q.opcoes.map(function (op, k) { return { id: q.id + '_' + k, name: q.id, label: op.label, on: val === op.v, pick: function () { setF(q.fk, op.v); } }; });
          }
          if (q.tipo === 'tel') {
            var pais = je.paisTel[q.fk] ? paisPor(je.paisTel[q.fk]) : (val.charAt(0) === '+' ? (ddiDe(digits(val), PAISES[0]) || PAISES[0]) : PAISES[0]);
            var pv = (q.key === 'tel' && def.eu && !val) ? TEL_CONTA : val;
            var abrir = function () { salvar({ telOpen: q.fk }); setTimeout(function () {
              var box = document.querySelector('#' + q.fk + '_flag'), lst = document.getElementById(q.fk + '_lista'); if (!box || !lst) return;
              if (window.IX && window.IX.revelar) window.IX.revelar(box.closest('.tel-box'), { ate: lst, foco: lst.querySelector('[aria-selected="true"]'), espera: 0 }); }, 60); };
            var fechar = function (voltar) { salvar({ telOpen: '' }); if (voltar) setTimeout(function () { var el = document.getElementById(q.fk + '_flag'); if (el) el.focus(); }, 30); };
            var trocar = function (x) { var ne = Object.assign({}, errs); delete ne[q.fk]; var nf = Object.assign({}, f); nf[q.fk] = fmtTel(x, nacDe(pv, pais)); var pt = Object.assign({}, je.paisTel); pt[q.fk] = x.c; salvar({ paisTel: pt, f: nf, errs: ne, telOpen: '' }); setTimeout(function () { var el = document.getElementById(q.fk); if (el) el.focus(); }, 30); };
            o.telOpen = je.telOpen === q.fk ? 'true' : 'false';
            o.value = pv; o.ph = exTel(pais); o.idFlag = q.fk + '_flag'; o.idLista = q.fk + '_lista';
            o.flagSrc = './assets/flags/' + pais.c.toLowerCase() + '.svg'; o.flagLabel = 'País do telefone: ' + pais.nome + ' +' + pais.ddi + '. Trocar país';
            o.toggle = function () { if (je.telOpen === q.fk) fechar(false); else abrir(); };
            o.onInput = function (e) { var rr = lerTel(e.target.value, pais); var ne = Object.assign({}, errs); delete ne[q.fk]; var pt = Object.assign({}, je.paisTel); pt[q.fk] = rr.p.c; var nf = Object.assign({}, f); nf[q.fk] = rr.v; salvar({ paisTel: pt, f: nf, errs: ne }); };
            o.paises = je.telOpen !== q.fk ? [] : PAISES.map(function (x) { return { c: x.c, ddi: x.ddi, nome: x.nome, flagSrc: './assets/flags/' + x.c.toLowerCase() + '.svg', on: x.c === pais.c ? 'true' : 'false', pick: function () { trocar(x); },
              key: function (e) {
                var li = e.currentTarget, ul = li.parentNode, itens = [].slice.call(ul.children), idx = itens.indexOf(li);
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); itens[(idx + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length].focus(); }
                else if (e.key === 'Home') { e.preventDefault(); itens[0].focus(); } else if (e.key === 'End') { e.preventDefault(); itens[itens.length - 1].focus(); }
                else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trocar(x); }
                else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); }
                else if (e.key.length === 1) { var t = e.key.toLowerCase(); var nx = itens.filter(function (el, j) { return j > idx && el.textContent.toLowerCase().replace(/^\+\d+/, '').indexOf(t) === 0; })[0] || itens.filter(function (el) { return el.textContent.toLowerCase().replace(/^\+\d+/, '').indexOf(t) === 0; })[0]; if (nx) nx.focus(); }
              } }; });
          }
          return o;
        });
        return { titulo: s.titulo, nota: s.nota, temNota: !!s.nota && campos.length > 0, campos: campos, _n: campos.length };
      }).filter(function (s) { return s._n > 0; });
      var iniciais = nome ? nome.trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') : String(i + 1);
      var rotuloSub = def.eu ? 'No seu nome · Pessoa Exemplo' : def.depois ? 'A pessoa preenche pelo link' : (nome ? nome : 'A preencher');
      var prazoLink = diaMes(somaDias(ms(EV.retirada && EV.retirada.dias && EV.retirada.dias[0] ? EV.retirada.dias[0].data + 'T12:00:00-03:00' : EV.iso), -((EV.reg && EV.reg.prazoAtleta) || LINK_DIAS_PADRAO)));
      return {
        idTit: 'je-at-' + i, idCorpo: 'je-at-c-' + i, iniciais: iniciais, aberto: cd.aberto ? 'true' : 'false', ok: ok ? 'true' : 'false',
        titulo: 'Inscrição ' + (i + 1) + ' · ' + ins.rn + ' · ' + ins.tipoRot, sub: rotuloSub,
        status: def.depois ? 'A preencher depois' : ok ? 'Completo' : 'Falta preencher', stOk: ok || def.depois, stFalta: !(ok || def.depois),
        alternar: function () { var cs = je.cards.map(function (x, j) { return j === i ? Object.assign({}, x, { aberto: !x.aberto }) : x; }); salvar({ cards: cs }); },
        temQuem: !def.kid, euOn: cd.quem === 'eu' ? 'true' : 'false', outraOn: cd.quem === 'outra' ? 'true' : 'false',
        pickEu: function () { var cs = je.cards.map(function (x, j) { return j === i ? Object.assign({}, x, { quem: 'eu' }) : x; }); salvar({ cards: cs, errs: {} }); },
        pickOutra: function () { var cs = je.cards.map(function (x, j) { return j === i ? Object.assign({}, x, { quem: 'outra' }) : x; }); salvar({ cards: cs, errs: {} }); },
        temModo: !def.kid && cd.quem === 'outra', agoraOn: cd.modo === 'agora' ? 'true' : 'false', depoisOn: cd.modo === 'depois' ? 'true' : 'false',
        pickAgora: function () { var cs = je.cards.map(function (x, j) { return j === i ? Object.assign({}, x, { modo: 'agora' }) : x; }); salvar({ cards: cs, errs: {} }); },
        pickDepois: function () { var cs = je.cards.map(function (x, j) { return j === i ? Object.assign({}, x, { modo: 'depois' }) : x; }); salvar({ cards: cs, errs: {} }); },
        isEu: def.eu, adiada: def.depois, adiadaNota: 'Nome e CPF: a pessoa preenche pelo link depois da compra. O link vale até ' + prazoLink + '.',
        secoes: secoes
      };
    });

    var continuar = function () {
      if (expired) { IX.toast('Sua reserva expirou. Volte e escolha de novo.'); return; }
      var e = todosErros();
      var chaves = Object.keys(e).filter(function (k) { return k.charAt(0) !== '!'; });
      if (chaves.length) {
        // abre os cartões com aviso e leva o foco ao primeiro campo com erro
        var abrirTudo = je.cards.map(function (cd, j) { var tem = Object.keys(erroCard(j)).some(function (k) { return k.charAt(0) !== '!'; }); return tem ? Object.assign({}, cd, { aberto: true }) : cd; });
        salvar({ errs: e, cards: abrirTudo, aviso: 'Faltam informações. Confira os avisos abaixo de cada campo.' });
        IX.toast('Faltam informações. Confira os avisos abaixo de cada campo.');
        setTimeout(function () {
          var primeiro = chaves[0], el = document.getElementById(primeiro) || document.getElementById(primeiro + '_0');
          if (el && window.IX && window.IX.revelar) window.IX.revelar(el, { foco: true, espera: 0 });
        }, 80);
        return;
      }
      IX.store.set('espQuemvai', { ev: ID, sig: sigDe(cart.insc), cards: je.cards, f: f, paisTel: je.paisTel });
      window.location.href = passoHref(3);
    };

    var lim = cart.insc.length;
    return Object.assign(base || {}, cabecalho(2, passoHref(1), 'Voltar para a escolha da prova'), {
      espOn: true, espOff: false, jeEvento: EV.titulo, rootStyle: 'min-height:100vh;background:var(--pagina-bg);--prog:50%',
      jeTituloQuem: 'Quem vai ' + v.verbo + '?', jeQuemPergunta: 'Quem vai ' + v.verbo + ' nesta inscrição?',
      jeLeadQuem: 'A inscrição é nominal. Cada dado diz para que serve; a organização da prova também pede algumas informações.',
      jeAviso: !!je.aviso && Object.keys(errs).length > 0, jeAvisoTexto: je.aviso, jeCards: cards,
      // resumo (mesmo formato do Checkout comum)
      lines: cart.lines || [], subtotal: brl(cart.subtotal), discount: brl(cart.discount), hasDiscount: cart.discount > 0, coupon: cart.coupon, fees: brl(cart.fees), total: brl(cart.total),
      lblSub: 'Inscrições', lblTaxa: 'Taxa de serviço', ingressosHref: passoHref(1),
      holdState: expired ? 'expired' : left < 120000 ? 'urgent' : 'ok', holdExpired: expired, holdLeft: expired ? '' : mmss(left),
      holdMsgA: expired ? 'Sua reserva expirou e as vagas voltaram para a venda.' : 'Vagas reservadas por', holdMsgB: expired ? '' : left < 120000 ? '— finalize agora.' : 'enquanto você preenche.',
      protectB: false, protectFmt: '', instLine: 'O pagamento é a próxima etapa',
      busy: false, pay: continuar, payDisabled: expired ? 'true' : 'false', payLabel: 'Ir para o pagamento', payShort: 'Ir para o pagamento',
      cbarNote: expired ? 'Reserva expirada' : 'Reservado por ' + mmss(left),
      simPerguntas: [[false, 'Com perguntas'], [true, 'Sem perguntas']].map(function (a) { return { label: a[1], on: je.sem === a[0] ? 'true' : 'false', pick: function () { IX.store.set('semPerguntas', a[0]); salvar({ sem: a[0], errs: {} }); } }; }),
      expireNow: function () { var h = Date.now() + 60000; IX.store.set('espHold', { ev: ID, end: h }); salvar({ holdEnd: h }); c.setState({ jeNow: Date.now() }); },
      expireAll: function () { var h = Date.now() - 1; IX.store.set('espHold', { ev: ID, end: h }); salvar({ holdEnd: h }); c.setState({ jeNow: Date.now() }); },
      _nInsc: lim
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     8. E3 · Como pagar (o acordeão de pagamento é o da tela comum; aqui, a recapitulação com Editar e os textos da inscrição)
     --------------------------------------------------------------------------------------------------------------- */
  function dadosAtletas() {
    var IX = ix(), pedido = IX.store.get('espOrder', null);
    // com o pedido fechado (E4), os dados vêm dele: o carrinho e as respostas já foram apagados
    if (pedido && pedido.ev === ID && PAG === 'pagamento' && (qs.get('etapa') !== '4' || !IX.store.get('espCart', null))) return pedido.atletas.map(function (a, i) {
      var r = prova(a.raceId);
      return { i: i, ins: { raceId: a.raceId, rn: a.rn, tipoRot: a.tipoRot }, race: r, cd: {}, nome: a.pend ? 'A definir' : (a.nome || 'A definir'), nomeCompleto: a.nome || '', pend: a.pend, camiseta: a.camiseta || '' };
    });
    var cart = carrinho(), sig = sigDe(cart.insc), q = IX.store.get('espQuemvai', null);
    q = q && q.ev === ID && q.sig === sig ? q : null;
    var cards = q ? q.cards : cart.insc.map(function (x, i) { return { quem: i === 0 && !ehKids(x) ? 'eu' : 'outra', modo: 'agora' }; });
    var f = q ? q.f : {};
    var primeiro = function (n) { var p = (n || '').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1].charAt(0).toUpperCase() + '.' : ''); };
    return cart.insc.map(function (ins, i) {
      var cd = cards[i], kid = ehKids(ins), nomeCompleto = '';
      var pend = false, nome = '';
      if (cd.quem === 'eu' && !kid) nome = 'Pessoa E. (você)', nomeCompleto = 'Pessoa Exemplo';
      else if (cd.modo === 'depois' && !kid) { nome = 'A definir'; pend = true; }
      else { nomeCompleto = (f['c' + i + '_nome'] || '').trim(); nome = nomeCompleto ? primeiro(nomeCompleto) : 'A definir'; pend = !nomeCompleto; }
      var r = prova(ins.raceId);
      return { i: i, ins: ins, race: r, cd: cd, nome: nome, nomeCompleto: nomeCompleto, pend: pend, camiseta: f['c' + i + '_camiseta'] || '' };
    });
  }
  function pagamentoVals(c, base) {
    var IX = ix(), st = c.state, v = vocab();
    var atl = dadosAtletas(), cart = carrinho(), done = st.stage === 'done';
    var etapa = qs.get('etapa');
    var pend = atl.filter(function (a) { return a.pend; });
    // o que o filme precisa saber
    var out = Object.assign(base, cabecalho(done ? 4 : 3, done ? 'Esportes.dc.html' : passoHref(2), done ? 'Voltar para o início da Ingresse Sports' : 'Voltar para quem vai ' + v.verbo), {
      espOn: true, espOff: false, jeEvento: EV.titulo, jeTituloQuem: 'Quem vai ' + v.verbo, jeEditarHref: passoHref(2),
      isDone: false, espDone: done,
      jeRecap: atl.map(function (a) { return { holder: a.nome, linha: 'Inscrição ' + (a.i + 1) + ' · ' + a.ins.rn + (a.camiseta ? ' · ' + a.camiseta : '') }; }),
      jeTemPend: pend.length > 0,
      jePendTxt: pend.length === 1 ? 'Uma inscrição fica como “Falta completar” na sua Carteira até a pessoa preencher os dados pelo link.' : pend.length + ' inscrições ficam como “Falta completar” na sua Carteira até as pessoas preencherem os dados pelo link.',
      protectB: false, lblSub: 'Inscrições', lblTaxa: 'Taxa de serviço', ingressosHref: passoHref(1),
      holdMsgA: base.holdExpired ? 'Sua reserva expirou e as vagas voltaram para a venda.' : 'Vagas reservadas por', holdMsgB: base.holdExpired ? '' : base.holdState === 'urgent' ? '— finalize agora.' : 'enquanto você paga.',
      backHref: passoHref(2), backAria: 'Voltar para quem vai ' + v.verbo
    });
    // textos do aviso de recusa e do Pix, com «vaga» e «inscrição» no lugar de «ingresso» (ES-FL-29 e ES-FL-30)
    out.txtRecusa = 'Suas vagas continuam reservadas. Você pode tentar de novo, pagar com Pix ou usar outro cartão.';
    out.txtPixSub = 'Aprovação na hora · inscrição confirmada em segundos';
    out.txtPixSaem = 'A inscrição é confirmada em segundos.';
    out.txtPixExpirou = 'O código Pix expirou e a inscrição não foi concluída. Gere um novo código para pagar. Sua reserva segue valendo.';
    if (done) Object.assign(out, largadaVals(c, base, atl));
    return out;
  }

  /* ---------------------------------------------------------------------------------------------------------------
     9. E4 · Sua largada
     --------------------------------------------------------------------------------------------------------------- */
  function faltam(t) {
    var d = t - agora();
    if (d <= 0) return 'É hoje';
    var h = Math.floor(d / 3600000);
    if (h < 48) return h <= 1 ? 'Falta 1 hora' : 'Faltam ' + h + ' horas';
    var dias = Math.floor(d / 86400000);
    return dias === 1 ? 'Falta 1 dia' : 'Faltam ' + dias + ' dias';
  }
  function retiradaTexto() {
    var ret = EV.retirada || {};
    if (ret.modo === 'correio') return 'Seu kit será enviado pelo correio para o endereço que você informar.' + (ret.correio && ret.correio.prazoDias ? ' Previsão de entrega: até ' + diaMesLongo(somaDias(ms(EV.iso), -ret.correio.prazoDias)) + '.' : '');
    if (!ret.dias || !ret.dias.length) return 'Ainda não temos a data de retirada do kit. A organização da prova ainda não a informou.';
    var a = ms(ret.dias[0].data + 'T12:00:00-03:00'), b = ms(ret.dias[ret.dias.length - 1].data + 'T12:00:00-03:00');
    var quando = ret.dias.length === 1 || a === b ? 'em ' + diaMesLongo(a) : 'de ' + fDia.format(new Date(a)) + ' a ' + diaMesLongo(b);
    var horas = ret.dias[0].das && ret.dias[0].ate ? ', das ' + hora(ms('2000-01-01T' + ret.dias[0].das + ':00-03:00')) + ' às ' + hora(ms('2000-01-01T' + ret.dias[0].ate + ':00-03:00')) : '';
    return 'Retire seu kit ' + quando + horas + (ret.local ? ', em ' + ret.local : '') + '. Leve um documento com foto.';
  }
  function largadaVals(c, base, atl) {
    var IX = ix(), v = vocab();
    var primeiraProva = atl[0].race;
    var t0 = ms(primeiraProva.inicio);
    var seed = parseInt(digits(c.state.orderId || '#IG-482130'), 10) || 482130;
    var numBase = 10000 + (seed % 89000);
    var prazoLink = somaDias(ms(EV.retirada && EV.retirada.dias && EV.retirada.dias[0] ? EV.retirada.dias[0].data + 'T12:00:00-03:00' : EV.iso), -((EV.reg && EV.reg.prazoAtleta) || LINK_DIAS_PADRAO));
    var pend = atl.filter(function (a) { return a.pend; });
    var bibs = atl.map(function (a, k) {
      var num = String(numBase + k);
      var nomeBib = a.pend ? 'A definir' : (a.nomeCompleto || a.nome);
      return {
        primeiro: k === 0 ? 'true' : 'false', pend: a.pend ? 'true' : 'false', temPend: a.pend, nome: nomeBib, dist: a.ins.rn, rotuloNum: 'Inscrição',
        digitos: num.split('').map(function (x) { return { c: x }; }), prova: EV.titulo, quando: dataCurta(ms(a.race.inicio)) + ' · ' + hora(ms(a.race.inicio)),
        aria: 'Inscrição ' + num + ': ' + nomeBib + ', ' + a.ins.rn + ', ' + EV.titulo + ', ' + dataCurta(ms(a.race.inicio)),
        sit: a.pend ? 'Falta completar' : 'Dados completos', completo: !a.pend,
        prazo: 'O link vale até ' + diaMes(prazoLink) + '.',
        copiar: function () { var url = 'https://ingresse.com/inscricao/' + num; var ok = function () { IX.toast('Link copiado.', 'ok'); }; if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, ok); else ok(); },
        reenviar: function () { IX.toast('Link enviado. Ele vale até ' + diaMes(prazoLink) + '.', 'ok'); }
      };
    });
    var qrMs = EV.qr ? ms(EV.qr) : 0;
    var temFacts = [];
    temFacts.push({ rot: 'Retirada do kit', txt: retiradaTexto(), temLink: false });
    // produtos do pedido (DE-41): como fato, com a retirada de cada um (junto do kit, pelo correio…)
    var pedidoPrd = IX.store.get('espOrder', null), prdDoPedido = (c.state.cart && c.state.cart.produtos) || (pedidoPrd && pedidoPrd.ev === ID && pedidoPrd.produtos) || null;
    if (prdDoPedido && prdDoPedido.n > 0) temFacts.push({ rot: 'Produtos', txt: prdDoPedido.itens.map(function (i) { return i.qty + '× ' + i.rotulo + ' · ' + brl(i.total) + (i.retirada ? '. ' + i.retirada : '.'); }).join(' '), temLink: false });
    if (EV.retirada && EV.retirada.terceiro) temFacts.push({ rot: 'Retirada por outra pessoa', txt: 'Outra pessoa pode retirar o seu kit' + (EV.retirada.exige && EV.retirada.exige.length ? ' com o documento e o comprovante de inscrição' : '') + '.', temLink: false });
    if (qrMs) temFacts.push({ rot: 'QR', txt: qrMs <= agora() ? 'Seu QR já está na Carteira.' : 'Seu QR fica na Carteira a partir de ' + dataLonga(qrMs) + ', às ' + hora(qrMs) + '. Avisamos você quando chegar.', temLink: false });
    var tr = EV.reg && EV.reg.transferencia;
    if (tr && tr.permitida) temFacts.push({ rot: 'Transferir', txt: 'Se não puder ir, você pode transferir a inscrição até ' + diaMes(somaDias(t0, -(tr.ateDias || 0))) + '.', temLink: true, linkHref: 'Carteira.dc.html?esporte=' + ID + '&abrir=transferir', linkTxt: 'Transferir inscrição' });
    temFacts.push({ rot: 'Cancelar', txt: 'Você pode cancelar a inscrição até ' + diaMesLongo(somaDias(agora(), ARREPENDIMENTO_DIAS)) + ', às 23h59.', temLink: true, linkHref: 'Carteira.dc.html?esporte=' + ID + '&abrir=cancelar', linkTxt: 'Cancelar inscrição' });
    if (EV.reg && EV.reg.saude === 'certificate') temFacts.push({ rot: 'Atestado', txt: 'Falta enviar o atestado. Envie o arquivo na Carteira antes da retirada do kit.', temLink: true, linkHref: 'Carteira.dc.html?esporte=' + ID, linkTxt: 'Enviar atestado' });
    if (EV.reg && EV.reg.saude === 'declaration') temFacts.push({ rot: 'Declaração', txt: 'Falta a sua confirmação para concluir a inscrição. Cada participante faz a própria, pelo link.', temLink: true, linkHref: 'Carteira.dc.html?esporte=' + ID, linkTxt: 'Concluir inscrição' });
    // agenda
    var fmtIcs = function (t) { return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ingresse//Prototipo//PT-BR', 'BEGIN:VEVENT', 'UID:' + (c.state.orderId || 'ig') + '@ingresse.com', 'DTSTAMP:' + fmtIcs(agora()), 'DTSTART:' + fmtIcs(t0), 'DTEND:' + fmtIcs(t0 + 4 * 3600000),
      'SUMMARY:' + EV.titulo, 'LOCATION:' + EV.local.replace(/,/g, '\\,'), 'DESCRIPTION:Sua inscrição está na Carteira Ingresse.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var convite = 'Vou ' + v.verbo + ' a ' + EV.titulo + ', ' + diaMes(t0) + '. As inscrições vão até ' + (EV.reg && EV.reg.fecha ? diaMes(ms(EV.reg.fecha)) : 'em breve') + ': ' + location.origin + '/' + eventoHref();
    var nIns = atl.length;
    return {
      orderId: c.state.orderId,
      jeFrase: 'Você está na largada da ' + EV.titulo + ': ' + dataLonga(t0) + ', às ' + hora(t0) + '.',
      jeMsg: nIns + (nIns === 1 ? ' inscrição já está' : ' inscrições já estão') + ' na sua Carteira. Mandamos o comprovante para pessoa@exemplo.com.',
      jeLargadaRotulo: nIns > 1 ? 'Primeira largada' : 'Largada', jeLargadaHora: hora(t0), jeLargadaQuando: dataCurta(t0), jeFaltam: faltam(t0),
      jeBibs: bibs, jeCarteiraHref: 'Carteira.dc.html?esporte=' + ID, jeTransferirHref: 'Carteira.dc.html?esporte=' + ID + '&abrir=transferir',
      icsHref: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), jeIcsNome: EV.slug + '.ics',
      jeConviteTitulo: convite,
      jeConvidar: function () {
        var data = { title: EV.titulo, text: convite };
        if (navigator.share) { navigator.share(data).catch(function () {}); return; }
        var ok = function () { IX.toast('Link copiado.', 'ok'); };
        if (navigator.clipboard) navigator.clipboard.writeText(convite).then(ok, ok); else ok();
      },
      jeHaPend: pend.length > 0, jePendTitulo: pend.length === 1 ? 'Faltam os dados de 1 participante.' : 'Faltam os dados de ' + pend.length + ' participantes.',
      jePendApoio: 'Envie o link para as pessoas preencherem os próprios dados. O link vale até ' + diaMes(prazoLink) + ', e a retirada do kit só vale com a inscrição completa.',
      jeEnviarPend: function () { IX.toast('Link enviado. Ele vale até ' + diaMes(prazoLink) + '.', 'ok'); },
      jeAgora: temFacts
    };
  }

  /* ---------------------------------------------------------------------------------------------------------------
     9b. Carteira esportiva: a inscrição (cartão de número de peito), o QR só a partir de qrDisponivelEm, os estados e as folhas de
     transferência e de cancelamento por arrependimento (escopo 4.6 e 4.7; microcopy ES-CW, ES-TR e ES-AR). Janela do arrependimento: valor provisório.
     --------------------------------------------------------------------------------------------------------------- */
  var SIT_ROT = { ok: 'Inscrição confirmada', falta: 'Faltam dados', cancelPedido: 'Cancelamento pedido', reembolso: 'Reembolso em andamento', cancelada: 'Cancelada', transf: 'Transferência pendente' };
  function pedidoCarteira() {
    var o = ix().store.get('espOrder', null);
    if (o && o.ev === ID && o.atletas && o.atletas.length) return o;
    // sem pedido (a tela aberta direto pela URL): duas inscrições, uma completa e uma pendente
    var r = EV.provas.filter(selecionavel)[0] || EV.provas[0];
    return { ev: ID, id: '#IG-482130', insc: [{ preco: precoUn(r) }, { preco: precoUn(r) }], produtos: qs.get('escolhidos') === '1' ? carrinhoDemo().produtos : null, atletas: [
      { n: 1, raceId: r.id, rn: r.nome, tipoRot: TIPOS[r.tipos[0]] || 'Geral', nome: 'Pessoa Exemplo', pend: false, camiseta: 'M', numero: '48213' },
      { n: 2, raceId: r.id, rn: r.nome, tipoRot: TIPOS[r.tipos[0]] || 'Geral', nome: '', pend: true, camiseta: '', numero: '48214' }] };
  }
  function estadoCarteira() {
    var abrir = qs.get('abrir');
    return { qr: qs.get('qr') === '1' ? 'lib' : 'trava', sit: qs.get('sit') || 'normal', janela: qs.get('janela') === 'fora' ? 'fora' : 'dentro', ov: {}, sheet: abrir === 'transferir' ? { t: 'transferir', n: 1 } : abrir === 'cancelar' ? { t: 'cancelar', n: 1 } : null, dest: '', err: '' };
  }
  function carteiraVals(c, base) {
    var IX = ix(), je = c.state.je, ped = pedidoCarteira(), v = vocab();
    var set = function (patch) { c.setState({ je: Object.assign({}, c.state.je, patch) }); };
    var qrMs = EV.qr ? ms(EV.qr) : 0;
    var qrLib = je.qr === 'lib' || (qrMs && qrMs <= agora());
    var provaCancel = je.sit === 'provaCancelada';
    var trans = EV.reg && EV.reg.transferencia;
    var janelaFim = somaDias(agora(), ARREPENDIMENTO_DIAS);
    var lista = ped.atletas.map(function (a, idx) {
      var n = idx + 1, r = prova(a.raceId) || EV.provas[0], t0 = ms(r.inicio);
      var k = je.ov[n] || (provaCancel ? 'cancelada' : (je.sit !== 'normal' && SIT_ROT[je.sit]) ? je.sit : (a.pend ? 'falta' : 'ok'));
      var ativo = k === 'ok' || k === 'falta';
      var digitos = String(a.numero || 48212 + n).split('').map(function (x) { return { c: x }; });
      var nome = a.pend ? 'A definir' : (a.nome || 'Pessoa Exemplo');
      var preco = (ped.insc && ped.insc[idx] && ped.insc[idx].preco) || precoUn(r);
      var podeCancelar = ativo && je.janela === 'dentro', foraJanela = ativo && je.janela === 'fora';
      var prazo = '';
      if (ativo) prazo = je.janela === 'dentro' ? 'Você pode cancelar até ' + diaMesLongo(janelaFim) + ', às 23h59.' : 'O prazo para cancelar terminou em ' + diaMes(somaDias(agora(), -1)) + '.' + (trans && trans.permitida ? ' Você ainda pode transferir a inscrição até ' + diaMes(somaDias(t0, -(trans.ateDias || 0))) + '.' : '');
      var ret = EV.retirada || {}, kit = ret.modo === 'correio' ? 'Pelo correio' : ret.dias && ret.dias.length ? diaMes(ms(ret.dias[0].data + 'T12:00:00-03:00')) + (ret.dias.length > 1 ? ' a ' + diaMes(ms(ret.dias[ret.dias.length - 1].data + 'T12:00:00-03:00')) : '') + ' · ' + (ret.local || '') : 'Ainda não informado';
      var prazoDados = diaMes(somaDias(ms(ret.dias && ret.dias[0] ? ret.dias[0].data + 'T12:00:00-03:00' : EV.iso), -((EV.reg && EV.reg.prazoAtleta) || LINK_DIAS_PADRAO)));
      return {
        n: n, idTit: 'je-cw-' + n, k: k, kb: { ok: 'ok', falta: 'pend', cancelPedido: 'refund', reembolso: 'refund', cancelada: 'cancel', transf: 'trans' }[k], status: SIT_ROT[k], pend: a.pend ? 'true' : 'false', nome: nome, nomeFato: nome, dist: a.rn, prova: EV.titulo, quando: dataCurta(t0) + ' · ' + hora(t0),
        digitos: digitos, aria: 'Inscrição ' + a.numero + ': ' + nome + ', ' + a.rn + ', ' + EV.titulo, kit: kit, temCamiseta: !!a.camiseta, camiseta: a.camiseta,
        qrLiberado: k === 'ok' && qrLib, qrUri: k === 'ok' && qrLib && window.IngresseQR ? (IngresseQR.uri('je' + n, 'INGRESSE-INSCRICAO-' + n) || '') : '',
        qrTrava: k === 'ok' && !qrLib && !!qrMs, qrTxt: qrMs ? 'O QR aparece a partir de ' + dataLonga(qrMs) + ', às ' + hora(qrMs) + '. Avisamos você quando ele estiver na Carteira. Antes disso, a retirada do kit é pelo documento e pelo CPF.' : '',
        faltam: k === 'falta', faltamTxt: 'Faltam dados desta inscrição' + (a.pend ? ': nome, CPF, nascimento e contato de emergência' : '') + '. Complete até ' + prazoDados + ' para poder retirar o kit.',
        reembolsoTxt: k === 'reembolso' || k === 'cancelPedido' || k === 'cancelada', reembolso: k === 'cancelada' && !provaCancel ? 'Inscrição cancelada. A vaga voltou para a venda.' : 'Reembolso em andamento. O valor volta na forma de pagamento original em até 10 dias úteis.',
        prazo: foraJanela || podeCancelar ? prazo : k === 'transf' ? 'A inscrição fica com você até a pessoa aceitar e completar os dados.' : '',
        podeTransferir: ativo && !!(trans && trans.permitida), podeCancelar: podeCancelar, podeReembolso: provaCancel && k === 'cancelada',
        abrirTransferir: function () { set({ sheet: { t: 'transferir', n: n }, dest: '', err: '' }); },
        abrirCancelar: function () { set({ sheet: { t: 'cancelar', n: n } }); },
        verReembolso: function () { var ov = Object.assign({}, je.ov); ov[n] = 'reembolso'; set({ ov: ov }); }
      };
    });
    var sh = je.sheet, shR = sh ? lista[sh.n - 1] : null, preco = sh ? ((ped.insc && ped.insc[sh.n - 1] && ped.insc[sh.n - 1].preco) || 0) : 0;
    var fecha = function () { set({ sheet: null, err: '' }); };
    var confirma = function () {
      if (!sh) return;
      var ov = Object.assign({}, je.ov);
      if (sh.t === 'transferir') {
        var d = (je.dest || '').trim();
        if (!(d.indexOf('@') > 0 || digits(d).length >= 10)) { set({ err: 'Digite um e-mail ou celular.' }); return; }
        ov[sh.n] = 'transf'; set({ ov: ov, sheet: null, err: '' }); IX.toast('Transferência enviada. Você pode desfazer até a pessoa aceitar.', 'ok');
      } else { ov[sh.n] = 'cancelPedido'; set({ ov: ov, sheet: null }); IX.toast('Inscrição cancelada. O valor volta em até 10 dias úteis.', 'ok'); }
    };
    var chips = function (arr, atual, key, patch) { return arr.map(function (x) { return { label: x[1], on: atual === x[0] ? 'true' : 'false', pick: function () { var p = {}; p[key] = x[0]; set(Object.assign(p, patch || {})); } }; }); };
    return Object.assign(base, PRD().pedidoVals(ped.produtos), {
      espOn: true, espOff: false, jeCwEvento: EV.titulo + ' · ' + dataCurta(ms(EV.iso)) + ' · ' + EV.cidade + ', ' + EV.uf,
      jeCwProvaCancelada: provaCancel, jeCwLista: lista,
      jeCwSheet: !!sh, jeCwKicker: sh ? (sh.t === 'transferir' ? 'Inscrição ' + sh.n + ' · ' + shR.dist : 'Inscrição ' + sh.n + ' · ' + shR.dist) : '',
      jeCwTitulo: sh ? (sh.t === 'transferir' ? 'Transferir inscrição' : 'Cancelar inscrição?') : '',
      jeCwTexto: sh ? (sh.t === 'transferir' ? 'A inscrição passa para outra pessoa, que precisa completar os próprios dados para participar.' : '') : '',
      jeCwTransfer: !!sh && sh.t === 'transferir', jeCwCancelar: !!sh && sh.t === 'cancelar',
      jeCwTexto2: 'A sua inscrição deixa de valer quando a pessoa aceitar. Você pode desfazer até lá.' + (trans && trans.taxa ? ' Taxa de transferência: ' + brl(reais(trans.taxa)) + ', definida pela organização.' : ' Não há taxa de transferência.'),
      jeCwDest: je.dest, jeCwErr: je.err, jeCwErrB: je.err ? 'true' : 'false',
      jeCwDigita: function (e) { set({ dest: e.target.value, err: '' }); },
      jeCwVolta: 'Você recebe ' + brl(preco) + ' na forma de pagamento original, em até 10 dias úteis.',
      jeCwPerde: 'A inscrição deixa de valer e a vaga volta para a venda. Se quiser voltar, o lote pode ter esgotado ou o preço pode ser outro.',
      jeCwVoltar: sh && sh.t === 'cancelar' ? 'Manter inscrição' : 'Voltar', jeCwCta: sh && sh.t === 'cancelar' ? 'Cancelar inscrição' : 'Transferir inscrição',
      jeCwFecha: fecha, jeCwParar: function (e) { e.stopPropagation(); }, jeCwConfirma: confirma,
      jeCwSimQr: chips([['trava', 'QR ainda não liberado'], ['lib', 'QR liberado']], je.qr, 'qr'),
      jeCwSimSit: chips([['normal', 'Normal'], ['cancelPedido', 'Cancelamento pedido'], ['reembolso', 'Reembolso em andamento'], ['cancelada', 'Cancelada'], ['transf', 'Transferência pendente'], ['provaCancelada', 'Prova cancelada']], je.sit, 'sit', { ov: {} }),
      jeCwSimJanela: chips([['dentro', 'Dentro do prazo'], ['fora', 'Fora do prazo']], je.janela, 'janela'),
      jeCwReset: function () { c.setState({ je: Object.assign(estadoCarteira(), { sheet: null }) }); }
    });
  }

  /* ---------------------------------------------------------------------------------------------------------------
     10. API: o subtipo de cada Component (o módulo .mjs o acrescenta ao fim do script da tela)
     --------------------------------------------------------------------------------------------------------------- */
  var API = {
    ativo: function () { return !!EV; },
    id: function () { return ID; },
    evento: function () { return EV; },
    vocab: vocab,
    /** Frases do filme (ES-SL-01 a ES-SL-04). */
    frases: function (pix, n) { return [pix ? 'Conferindo o Pix' : 'Confirmando o pagamento', n > 1 ? 'Emitindo suas inscrições' : 'Emitindo sua inscrição', 'Guardando na sua Carteira']; },
    numeroInscricoes: function () { return carrinho().insc.length; },
    /** o carrinho da inscrição (guardado ou, sem ele, o de exemplo); o módulo de produtos lê os produtos daqui nas etapas 2 e 3 */
    carrinho: carrinho,
    textoAprovado: 'Inscrição confirmada',
    animarPercurso: animarPercurso,
    /** estado inicial da tela (mesclado ao state do Component comum) */
    estado: function (pagina) {
      if (pagina === 'ingressos') return { je: estadoIngressos(), jeNow: Date.now() };
      if (pagina === 'checkout') return { je: estadoQuem(), jeNow: Date.now() };
      if (pagina === 'pagamento') {
        var IX = ix(), cart = carrinho(), hold = IX.store.get('espHold', null);
        var holdEnd = hold && hold.ev === ID && hold.end > Date.now() ? hold.end : Date.now() + HOLD_MS;
        if (!hold || hold.ev !== ID || hold.end <= Date.now()) IX.store.set('espHold', { ev: ID, end: holdEnd });
        var cartCompat = { day: 'dom', coupon: cart.coupon || '', lines: cart.lines, holders: cart.insc.map(function (x) { return { label: x.rn + ' · ' + x.tipoRot, meia: false }; }), subtotal: cart.subtotal, discount: cart.discount, fees: cart.fees, total: cart.total, totalIngressos: cart.totalIngressos, produtos: cart.produtos || null };
        var st = { cart: cartCompat, holdEnd: holdEnd, jeNow: Date.now() };
        if (qs.get('etapa') === '4') { st.stage = 'done'; st.orderId = '#IG-482130'; }
        return st;
      }
      if (pagina === 'carteira') return { je: estadoCarteira() };
      return {};
    },
    vals: function (pagina, comp, base) {
      if (pagina === 'ingressos') return ingressosVals(comp);
      if (pagina === 'checkout') return quemVals(comp, base);
      if (pagina === 'pagamento') return pagamentoVals(comp, base);
      if (pagina === 'carteira') return carteiraVals(comp, base);
      return base;
    },
    /** o que o Component faz depois de montar */
    montou: function (pagina, comp) {
      var v = vocab();
      if (pagina !== 'carteira') document.title = { ingressos: 'Escolha sua prova', checkout: 'Quem vai ' + v.verbo, pagamento: 'Como pagar' }[pagina] + ' — ' + EV.titulo + ' | Ingresse Sports';
      if (pagina === 'carteira') { document.title = 'Suas inscrições — ' + EV.titulo + ' | Ingresse Sports'; return; }
      animarPercurso(pagina === 'ingressos' ? 1 : pagina === 'checkout' ? 2 : (comp.state.stage === 'done' ? 4 : 3));
    },
    /** o que o Pagamento guarda quando o pedido fecha (depois de o filme trocar a tela) */
    fecharPedido: function (comp) {
      var IX = ix(), cart = carrinho();
      if (comp.__jeFechado || comp.state.stage !== 'done' || qs.get('etapa') === '4') return;
      comp.__jeFechado = true;
      var atl = dadosAtletas();
      IX.store.set('espOrder', { ev: ID, id: comp.state.orderId, at: Date.now(), total: cart.total, insc: cart.insc, produtos: cart.produtos || null,
        atletas: atl.map(function (a, k) { return { n: k + 1, raceId: a.ins.raceId, rn: a.ins.rn, tipoRot: a.ins.tipoRot, nome: a.nomeCompleto || (a.pend ? '' : a.nome), pend: a.pend, camiseta: a.camiseta, numero: String(10000 + ((parseInt(digits(comp.state.orderId), 10) || 482130) % 89000) + k) }; }) });
      var o = IX.store.get('order', null);
      if (o && o.id === comp.state.orderId) IX.store.del('order');      // o 'order' do comum é de shows; a inscrição vive em 'espOrder'
      ['espCart', 'espHold', 'espQuemvai'].forEach(function (k) { IX.store.del(k); });
    }
  };
  window.JornadaEsporte = API;
  window.JornadaEsporteUtil = { hora: hora, dataCurta: dataCurta, dataLonga: dataLonga, diaMes: diaMes, diaMesLongo: diaMesLongo, brl: brl, faltam: faltam, ms: ms, agora: agora, retiradaTexto: retiradaTexto, prova: prova, vocab: vocab, TIPOS: TIPOS, mmss: mmss };
  if (EV) root.setAttribute('data-esporte', ID);
})();
