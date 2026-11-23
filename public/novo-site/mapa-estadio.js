/* mapa-estadio.js: mapa do estádio, grade de assentos e lista de setores da jornada de compra de futebol (M1; Isadora Nogueira e Edu do Udi, 29/10/2026).
   Especificação: docs/produto/JORNADA-FUTEBOL-PROTOTIPO.md (3.1, 3.8 item 70, 3.10, 4.6, 5.2). Compatibilidade Untitled UI: COMPATIBILIDADE-UNTITLED-UI.md, item 70. CSS: ./mapa-estadio.css (só tokens).

   O módulo NÃO sabe de preço por perfil, de plano, de carrinho nem de rosto: recebe estados prontos por setor e por assento e devolve escolhas.

   window.IngresseMapaEstadio
     .montarMapa(el, {                                      alias: .montar(el, opcoes)
        estadio:    { viewBox:[x,y,w,h], campo:{x,y,w,h,linhas?[]}, setores:[{ id, d, rotulo:{x,y}, ordem, caixa?, sigla?, nome?, tipo? }] }    (saída de gerar-mapa.mjs: gerarMapa)
        setores:    [{ id, nome, tipo, estado, motivo?, preco?, livres?, portao?, qtdEscolhida?, oculto?, escolhivel? }]
                    estado: 'com-lugares' | 'poucos' | 'esgotado' | 'plano' | 'direito' | 'visitante'   (o «escolhido» vem de `selecionado`)
                    preco em reais (o menor tipo do setor, «a partir de»); livres só se houver dado real; oculto: o setor nem aparece (perfil visitante: sem cinza)
        selecionado: id | null,        dica?: false, legenda?: false (a camada que já tem a sua desliga as do componente),        destaque?: [ids] (os outros ficam esmaecidos: filtro «Lugares acessíveis»),
        estadoMapa?: 'ok' | 'lento' | 'falha'   (E-22: troca o desenho pelo aviso e pela saída para a lista),
        aoEscolher(setorId), aoFechar()  (Esc com o painel aberto), aoFalhar(motivo), aoMudarZoom(nivel),
        rotulos?: { … }  (textos, ver ROTULOS: o M2 passa os de JF_TEXTOS), formatarPreco?(reais), telaCheia?: true|false (botão «Ampliar mapa» em IngresseModal)
     }) → { atualizar(parcial), focar(id), zoom(+1 | -1 | 0), destruir(), el }
     .montarAssentos(el, {
        setor: { id, nome, portao?, pares? }, assentos: [{ id, fileira, numero, estado:'livre'|'indisponivel', papel:'cadeira'|'acessivel'|'acompanhante' }]  (gerar-mapa.mjs: expandirAssentos),
        escolhidos: [ids], max: n (quantos ainda cabem neste setor, já descontados os de outros setores), limiteMotivo?, preco: reais | (assento) => reais, tomados?: [ids],
        aoAlternar(assentoId, escolhido), aoEncontrar(n, { ids, fileira, de, ate } | null), aoVerOutrosSetores(), rotulos?, formatarPreco?
     }) → { atualizar(parcial), focar(id), zoom(), destruir(), el }
     .montarLista(el, { setores, selecionado, aoEscolher(id), rotulos?, formatarPreco? }) → { atualizar, focar, destruir, el }   (a alternativa ao mapa: tabela; vira cartões em quadro estreito)
   Eventos (CustomEvent, borbulham no `el`): jf-mapa:escolher {setor} · jf-mapa:fechar · jf-mapa:bloqueado {setor, motivo} · jf-mapa:zoom {nivel}
                                              jf-assentos:alternar {id, escolhido, escolhidos} · jf-assentos:encontrar {n, ids} · jf-assentos:limite {max} · jf-assentos:tomado {id}
   Regiões vivas: uma por componente, só para resultados (escolha, zoom por botão, lugares encontrados, limite, assento tomado). */
(function () {
  'use strict';
  if (window.IngresseMapaEstadio) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  /* ------------------------------------------------------------------ textos (do microcopy da Luíza; o M2 sobrescreve por `rotulos`) */
  var ROTULOS = {
    mapa: 'Mapa do estádio', setoresSvg: 'Setores do estádio', zoom: 'Zoom do mapa',
    dicaToque: 'Toque num setor para ver os ingressos dele.', dicaMouse: 'Clique num setor para ver os ingressos dele.',
    ampliar: 'Ampliar', reduzir: 'Reduzir', restaurar: 'Restaurar', ampliarMapa: 'Ampliar mapa', concluir: 'Concluir',
    estados: { 'com-lugares': 'Com lugares', poucos: 'Poucos lugares', esgotado: 'Esgotado', plano: 'Não vale para o seu plano', direito: 'Exige direito validado', visitante: 'Torcida visitante', escolhido: 'Escolhido' },
    tipos: { cadeira: 'Cadeira', arquibancada: 'Arquibancada', geral: 'Geral', camarote: 'Camarote', visitante: 'Torcida visitante', pcd: 'Lugares acessíveis' },
    motivos: { direito: 'Para comprar ingresso de acessibilidade, o direito é conferido antes da compra.' },
    legenda: 'Legenda do mapa', legendaEstados: 'Situação do setor', legendaTipos: 'Tipo de setor',
    aPartirDe: function (p) { return 'a partir de ' + p; },
    livres: function (n) { return n === 1 ? '1 lugar livre' : n + ' lugares livres'; },
    portao: function (p) { return /^port/i.test(p) ? p : 'Portão ' + p; },
    setorLabel: function (nome) { return 'Setor ' + nome; },
    escolhidoAnuncio: function (s) { return s; },
    mapaLento: 'O mapa está demorando para carregar. Veja os setores em lista.', verLista: 'Ver setores em lista',
    mapaFalha: 'Não foi possível carregar o mapa agora. Veja os setores em lista ou tente de novo.', tentarDeNovo: 'Tentar de novo',
    zoomAnuncio: function (pct) { return 'Mapa em ' + pct + '%.'; },
    /* assentos */
    grade: function (setor) { return 'Assentos do setor ' + setor; },
    campo: 'Lado do campo', quantos: 'Quantos ingressos', menosIngresso: 'Menos ingressos', maisIngresso: 'Mais ingressos', encontrar: 'Encontrar lugares', irFileira: 'Ir para a fileira', todasFileiras: 'Escolha a fileira',
    fileira: 'Fileira', assento: 'Assento',
    seatLivre: 'Livre', seatEscolhido: 'Escolhido por você', seatIndisponivel: 'Indisponível', seatAcessivel: 'Assento acessível', seatAcompanhante: 'Acompanhante',
    seatNome: function (f, n, setor, preco, st, papel) { return 'Fileira ' + f + ', assento ' + n + ', ' + setor + (preco ? ', ' + preco : '') + ', ' + st + (papel ? ', ' + papel : ''); },
    seatDisp: 'disponível', seatReservado: 'reservado por você', seatIndisp: 'indisponível',
    acessivelApoio: 'Assento acessível: o assento do acompanhante fica ao lado.', incluirAcompanhante: 'Incluir acompanhante',
    encontramos: function (n, f, a, b) { return 'Encontramos ' + n + (n === 1 ? ' lugar' : ' lugares lado a lado') + ': fileira ' + f + (n === 1 ? ', assento ' + a + '.' : ', assentos ' + a + ' a ' + b + '.'); },
    semJuntos: function (n) { return 'Não há ' + n + ' lugares lado a lado neste setor. Reduza a quantidade, escolha outro setor ou separe os lugares.'; },
    verOutrosSetores: 'Ver outros setores', escolherSeparados: 'Escolher lugares separados',
    escolhaAnuncio: function (f, n, qtd, max) { return 'Assento escolhido: fileira ' + f + ', assento ' + n + '. ' + qtd + ' de ' + max + '.'; },
    retiradoAnuncio: function (f, n, qtd, max) { return 'Assento retirado: fileira ' + f + ', assento ' + n + '. ' + qtd + ' de ' + max + '.'; },
    limite: function (max) { return 'Limite atingido: ' + max + (max === 1 ? ' ingresso' : ' ingressos') + ' por pessoa.'; },
    tomado: function (n, f) { return 'O assento ' + n + ', fileira ' + f + ', acabou de ser escolhido por outra pessoa. Seus outros lugares continuam reservados.'; },
    escolherOutro: 'Escolher outro lugar',
    /* lista */
    lista: 'Setores', colSetor: 'Setor', colSituacao: 'Situação', colPreco: 'A partir de', colPortao: 'Portão', colLugares: 'Lugares', ver: 'Ver ingressos', escolhidoNaLista: 'Escolhido', semLugares: 'Sem lugares'
  };
  function mesclar(base, extra) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    if (extra) for (k in extra) o[k] = (extra[k] && typeof extra[k] === 'object' && typeof base[k] === 'object') ? mesclar(base[k], extra[k]) : extra[k];
    return o;
  }

  /* ------------------------------------------------------------------ ícones (24 px, traço 2): do @untitledui/icons, e três desenhos nossos (cadeira, degraus, acessível) */
  var ICO = {
    mais: ['M12 5v14m-7-7h14'], menos: ['M5 12h14'],
    zoomIn: ['m21 21-4.35-4.35M11 8v6m-3-3h6m5 0a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'], zoomOut: ['m21 21-4.35-4.35M8 11h6m5 0a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'],
    reset: ['M2 10s2.005-2.732 3.634-4.362A9 9 0 1 1 12 21a9.004 9.004 0 0 1-8.648-6.5M2 10V4m0 6h6'], maximizar: ['m14 10 7-7m0 0h-6m6 0v6m-11 5-7 7m0 0h6m-6 0v-6'],
    check: ['M20 6 9 17l-5-5'],
    cadeado: ['M17 10V8A5 5 0 0 0 7 8v2m5 4.5v2M8.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 18.72 20 17.88 20 16.2v-1.4c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.72 10 16.88 10 15.2 10H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 12.28 4 13.12 4 14.8v1.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C6.28 21 7.12 21 8.8 21Z'],
    bandeira: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19'],
    estrela: ['M11.283 3.453c.23-.467.345-.7.502-.775a.5.5 0 0 1 .43 0c.157.075.272.308.502.775l2.187 4.43c.068.138.102.207.152.26a.502.502 0 0 0 .155.114c.067.03.143.042.295.064l4.891.715c.515.075.773.113.892.238a.5.5 0 0 1 .133.41c-.023.172-.21.353-.582.716l-3.54 3.446c-.11.108-.165.162-.2.226a.5.5 0 0 0-.06.183c-.009.072.004.148.03.3l.835 4.867c.088.514.132.77.05.922a.5.5 0 0 1-.349.253c-.17.032-.4-.09-.862-.332l-4.373-2.3c-.136-.07-.204-.107-.276-.12a.498.498 0 0 0-.192 0c-.072.013-.14.05-.276.12l-4.373 2.3c-.461.243-.692.364-.862.332a.5.5 0 0 1-.348-.253c-.083-.152-.039-.409.05-.922l.834-4.867c.026-.152.039-.228.03-.3a.5.5 0 0 0-.06-.184c-.035-.063-.09-.117-.2-.225L3.16 10.4c-.373-.363-.56-.544-.582-.716a.5.5 0 0 1 .132-.41c.12-.125.377-.163.892-.238l4.891-.715c.152-.022.228-.034.295-.064a.5.5 0 0 0 .155-.113c.05-.054.084-.123.152-.26l2.187-4.43Z'],
    pessoas: ['M22 21v-2a4.002 4.002 0 0 0-3-3.874M15.5 3.291a4.001 4.001 0 0 1 0 7.418M17 21c0-1.864 0-2.796-.305-3.53a4 4 0 0 0-2.164-2.165C13.796 15 12.864 15 11 15H8c-1.864 0-2.796 0-3.53.305a4 4 0 0 0-2.166 2.164C2 18.204 2 19.136 2 21M13.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
    alerta: ['M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z'],
    /* desenhos nossos: o Untitled UI não tem equivalente */
    cadeira: ['M8 3.5h8a1 1 0 0 1 1 1V11H7V4.5a1 1 0 0 1 1-1Z', 'M4.5 11h15v4h-15Z', 'M7 15v5.5M17 15v5.5'],
    degraus: ['M3 20v-4h5v-4h5V8h5V4h3', 'M3 20h18'],
    acessivel: ['M10 7.5v6h5.5l2.5 5', 'M7.2 12.4A5.4 5.4 0 1 0 15 19', 'M10 4.4h.01']
  };
  var TIPO_ICONE = { cadeira: 'cadeira', arquibancada: 'degraus', geral: 'pessoas', camarote: 'estrela', visitante: 'bandeira', pcd: 'acessivel' };


  /* a camada da jornada fala `ok`, `fora` e códigos de motivo; o componente fala os estados do espécime. Aceita os dois. */
  var ALIAS_ESTADO = { ok: 'com-lugares', fora: 'com-lugares' };
  function normalizarSetor(s, R) {
    var n = {}, k;
    for (k in s) n[k] = s[k];
    if (ALIAS_ESTADO[n.estado]) { if (n.estado === 'fora') n.oculto = true; n.estado = ALIAS_ESTADO[n.estado]; }
    if (n.disabled === true && n.escolhivel == null) n.escolhivel = false;
    if (n.motivo && !/\s/.test(n.motivo)) n.motivo = (R.motivos && R.motivos[n.motivo]) || '';     // código sem frase: o rótulo do estado já diz o que é
    return n;
  }

  function ns(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag), k;
    if (attrs) for (k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function h(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    if (attrs) for (k in attrs) { if (attrs[k] == null || attrs[k] === false) continue; if (k === 'texto') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  /* ícone em <svg> de 24 px (botões, avisos, legenda); `classe` entra no svg */
  function icone(nome, classe) {
    return ns('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', 'class': 'jf-ico' + (classe ? ' ' + classe : '') }, ICO[nome].map(function (d) { return ns('path', { d: d }); }));
  }
  /* o mesmo desenho dentro de outro <svg>, centrado em (0,0), com tamanho fixo em pixels de tela (o chamador aplica a escala) */
  function iconeCentrado(nome) {
    var g = ns('g', { 'class': 'jf-mapa__ico-g', transform: 'translate(-12 -12)' }, ICO[nome].map(function (d) { return ns('path', { d: d }); }));
    if (nome === 'acessivel') g.appendChild(ns('circle', { cx: 10, cy: 4.4, r: 1.3 }));
    return g;
  }
  function limpar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function emitir(el, nome, detalhe) { el.dispatchEvent(new CustomEvent(nome, { bubbles: true, detail: detalhe })); }
  function ms(token, padrao) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    var n = parseFloat(v);
    if (isNaN(n)) return padrao;
    return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n;
  }
  function preferenciaReduzida() { return document.documentElement.getAttribute('data-motion') === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function bezier(x1, y1, x2, y2) {
    function c(t, a, b) { return 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t; }
    return function (x) { var lo = 0, hi = 1, t = x; for (var i = 0; i < 24; i++) { var v = c(t, x1, x2); if (Math.abs(v - x) < 1e-4) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return c(t, y1, y2); };
  }
  var EASE_MOVE = bezier(0.4, 0, 0.2, 1);
  var ESTADOS_TRAVADOS = { esgotado: 1, plano: 1, direito: 1, visitante: 1 };
  var SEM_FORMA = {};   // marcador
  function brl(n) { return 'R$ ' + Number(n).toLocaleString('pt-BR'); }


  /* ------------------------------------------------------------------ geometria (UMA implementação: o gerar-mapa.mjs carrega este arquivo e chama `geometria`) */
  function arred2(n) { return Math.round(n * 100) / 100; }
  function num2(n) { return String(arred2(n)); }
  /** Sigla de leitura no mapa (2 a 4 letras): a do esquema, ou derivada do nome e do tipo. */
  function siglaDoSetor(s) {
    if (s.sigla) return s.sigla;
    if (s.tipo === 'visitante') return 'VIS';
    if (s.tipo === 'camarote') return 'CAM';
    if (s.tipo === 'pcd') return 'ACE';
    var abrevia = { Nordeste: 'NE', Noroeste: 'NO', Sudeste: 'SE', Sudoeste: 'SO', Superior: 'S', Inferior: 'I', Norte: 'N', Sul: 'S', Leste: 'L', Oeste: 'O' };
    var palavras = String(s.nome || s.id).split(/\s+/).filter(function (p) { return !/^(de|da|do|das|dos|e)$/i.test(p); });
    if (/^Canto$/i.test(palavras[1] || '') && palavras[2]) return abrevia[palavras[2]] || palavras[2].slice(0, 2).toUpperCase();   // cantos: a direção («Canto Nordeste» → NE)
    var sig = palavras.map(function (p, i) { return i === 0 ? p[0].toUpperCase() : (abrevia[p] || p[0].toUpperCase()); }).join('');
    if (palavras[0] && /^Cadeira$/i.test(palavras[0])) sig = 'C' + palavras.slice(1).map(function (p) { return abrevia[p] || p[0].toUpperCase(); }).join('');
    return sig.slice(0, 4);
  }
  /** Linhas do campo (caminhos SVG, escala do campo de 105 × 68 m). */
  function linhasDoCampo(c) {
    var mx = c.w / 105, my = c.h / 68, cx = c.x + c.w / 2, cy = c.y + c.h / 2, r = 9.15 * mx, L = [];
    L.push('M' + num2(c.x) + ' ' + num2(c.y) + 'H' + num2(c.x + c.w) + 'V' + num2(c.y + c.h) + 'H' + num2(c.x) + 'Z');
    L.push('M' + num2(cx) + ' ' + num2(c.y) + 'V' + num2(c.y + c.h));
    L.push('M' + num2(cx - r) + ' ' + num2(cy) + 'a' + num2(r) + ' ' + num2(r) + ' 0 1 0 ' + num2(2 * r) + ' 0a' + num2(r) + ' ' + num2(r) + ' 0 1 0 ' + num2(-2 * r) + ' 0Z');
    [-1, 1].forEach(function (lado) {
      var bx = lado < 0 ? c.x : c.x + c.w, d = -lado, gA = 16.5 * mx, gH = 40.32 * my, pA = 5.5 * mx, pH = 18.32 * my;
      L.push('M' + num2(bx) + ' ' + num2(cy - gH / 2) + 'h' + num2(d * gA) + 'v' + num2(gH) + 'h' + num2(-d * gA));
      L.push('M' + num2(bx) + ' ' + num2(cy - pH / 2) + 'h' + num2(d * pA) + 'v' + num2(pH) + 'h' + num2(-d * pA));
      L.push('M' + num2(bx + d * 11 * mx) + ' ' + num2(cy) + 'h0.01');
    });
    return L;
  }
  /** Normaliza o estádio (a entrada de `estadios[id]` do futebol-jornada.json, ou a saída de gerar-mapa.mjs) na geometria que o componente desenha:
   *  caixa por setor (do `retangulo`), sigla, linhas do campo e viewBox do CONTEÚDO (caixa dos setores mais 12), não o nominal. */
  function geometria(esq) {
    if (esq && esq._jf) return esq;
    var c = esq.campo;
    var setores = esq.setores.map(function (s) {
      var ret = s.retangulo;
      var caixa = s.caixa || (ret ? { x: ret[0], y: ret[1], w: arred2(ret[2] - ret[0]), h: arred2(ret[3] - ret[1]) } : { x: s.rotulo.x - 50, y: s.rotulo.y - 50, w: 100, h: 100 });
      return { id: s.id, nome: s.nome, sigla: siglaDoSetor(s), tipo: s.tipo, lado: s.lado, anel: s.anel, ordem: s.ordem, assento: s.assento, d: s.d, rotulo: s.rotulo, caixa: caixa };
    }).sort(function (a, b) { return a.ordem - b.ordem; });
    var xs = [c.x, c.x + c.w], ys = [c.y, c.y + c.h];
    setores.forEach(function (s) { xs.push(s.caixa.x, s.caixa.x + s.caixa.w); ys.push(s.caixa.y, s.caixa.y + s.caixa.h); });
    var pad = 12, x0 = Math.min.apply(null, xs) - pad, y0 = Math.min.apply(null, ys) - pad;
    var viewBox = [arred2(x0), arred2(y0), arred2(Math.max.apply(null, xs) + pad - x0), arred2(Math.max.apply(null, ys) + pad - y0)];
    return { _jf: true, nome: esq.nome, viewBox: viewBox, viewBoxNominal: esq.viewBoxNominal || esq.viewBox, campo: { x: c.x, y: c.y, w: c.w, h: c.h, linhas: c.linhas && c.linhas.length ? c.linhas : linhasDoCampo(c) }, setores: setores };
  }

  /* =========================================================================================================== */
  /*  MAPA DO ESTÁDIO                                                                                            */
  /* =========================================================================================================== */
  function montarMapa(raiz, opcoes) {
    var o = opcoes || {};
    var R = mesclar(ROTULOS, o.rotulos);
    var fmt = o.formatarPreco || brl;
    var id = 'jfm' + (++uid);
    var geo = geometria(o.estadio);
    var vb = geo.viewBox;
    var porId = {};            // dados por setor (mutável)
    var geoPorId = {};
    var st = { selecionado: o.selecionado || null, destaque: o.destaque ? arr2set(o.destaque) : null, foco: null, k: 1, tx: 0, ty: 0, estadoMapa: o.estadoMapa || 'ok', arrastou: false, anima: null, esc: 1, base: 1, _escAnterior: null };
    var nos = {};              // elementos por setor
    var ordemIds = [];
    var ouvintes = [];
    var vivoTimer = null;

    function arr2set(a) { var s = {}; a.forEach(function (x) { s[x] = 1; }); return s; }
    function aoOuvir(alvo, tipo, fn, opt) { alvo.addEventListener(tipo, fn, opt); ouvintes.push([alvo, tipo, fn, opt]); }

    /* ---------- estrutura ---------- */
    limpar(raiz);
    var raizMapa = h('div', { 'class': 'jf-mapa', role: 'group', 'aria-label': R.mapa, 'data-zoom': '1', 'data-estado-mapa': 'ok' });
    var dica = h('p', { 'class': 'jf-mapa__dica', id: id + '-dica' });
    function textoDica() { return (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? R.dicaToque : R.dicaMouse; }
    dica.textContent = textoDica();
    if (o.dica !== false) raizMapa.setAttribute('aria-describedby', id + '-dica');
    function botao(acao, rotulo, ic) {
      var b = h('button', { type: 'button', 'class': 'bs bs-icone jf-mapa__btn', 'data-acao': acao, 'aria-label': rotulo });
      b.appendChild(icone(ic));
      return b;
    }
    var bMais = botao('mais', R.ampliar, 'zoomIn'), bMenos = botao('menos', R.reduzir, 'zoomOut'), bReset = botao('reset', R.restaurar, 'reset');
    var bCheia = (o.telaCheia !== false && window.IngresseModal && !o._dentroDaModal) ? botao('cheia', R.ampliarMapa, 'maximizar') : null;
    var zoomBox = h('div', { 'class': 'jf-mapa__zoom', role: 'group', 'aria-label': R.zoom }, [bMais, bMenos, bReset, bCheia]);
    var barra = h('div', { 'class': 'jf-mapa__barra' }, [o.dica === false ? null : dica, zoomBox]);
    var quadro = h('div', { 'class': 'jf-mapa__quadro' });
    var aviso = h('div', { 'class': 'jf-mapa__aviso', hidden: true });
    var detalhe = h('p', { 'class': 'jf-mapa__detalhe', 'aria-hidden': 'true' });
    var legendaBox = h('div', { 'class': 'jf-mapa__legendas' });
    var vivo = h('p', { 'class': 'sr-only', role: 'status', 'aria-live': 'polite' });
    if (!o.compacto) raizMapa.appendChild(barra);
    raizMapa.appendChild(quadro); raizMapa.appendChild(aviso);
    if (!o.compacto) { raizMapa.appendChild(detalhe); if (o.legenda !== false) raizMapa.appendChild(legendaBox); }
    raizMapa.appendChild(vivo);
    raiz.appendChild(raizMapa);

    function anunciar(txt) {
      vivo.textContent = '';
      clearTimeout(vivoTimer);
      vivoTimer = setTimeout(function () { vivo.textContent = txt; }, 30);   // texto novo a cada vez: o leitor lê de novo mesmo se a frase repetir
    }

    /* ---------- dados ---------- */
    function indexar() {
      porId = {};
      (o.setores || []).forEach(function (s) { porId[s.id] = normalizarSetor(s, R); });
    }
    indexar();
    geo.setores.forEach(function (g) { geoPorId[g.id] = g; });
    ordemIds = geo.setores.slice().sort(function (a, b) { return a.ordem - b.ordem; }).map(function (g) { return g.id; });
    function visiveis() { return ordemIds.filter(function (i) { return porId[i] && !porId[i].oculto; }); }
    /* «escolhido» (vermelho com visto): o setor aberto e todo setor em que a pessoa já escolheu ingresso; o `aria-pressed` fica só com o aberto */
    function estadoDe(s) { return (st.selecionado === s.id || s.estado === 'escolhido' || s.qtdEscolhida > 0) ? 'escolhido' : (s.estado || 'com-lugares'); }
    function travado(s) { if (s.escolhivel === false) return true; if (s.escolhivel === true) return false; return !!ESTADOS_TRAVADOS[s.estado || 'com-lugares']; }

    function nomeAcessivel(s) {
      var partes = [R.setorLabel(s.nome || (geoPorId[s.id] && geoPorId[s.id].nome) || s.id)];
      var est = s.estado || 'com-lugares';
      partes.push(R.estados[est].toLowerCase());
      if (!ESTADOS_TRAVADOS[est]) {
        if (s.livres != null) partes.push(R.livres(s.livres));
        if (s.preco != null) partes.push(R.aPartirDe(fmt(s.preco)));
        if (s.portao) partes.push(R.portao(s.portao));
      }
      if (s.motivo) partes.push(s.motivo);
      if (s.qtdEscolhida) partes.push(s.qtdEscolhida + (s.qtdEscolhida === 1 ? ' ingresso escolhido' : ' ingressos escolhidos'));
      return partes.join(', ') + '.';
    }

    /* ---------- SVG ---------- */
    var svg = ns('svg', { 'class': 'jf-mapa__svg', viewBox: vb.join(' '), role: 'group', 'aria-label': R.setoresSvg, focusable: 'false', tabindex: '-1', preserveAspectRatio: 'xMidYMid meet' });
    var defs = ns('defs');
    var patHach = ns('pattern', { id: id + '-hachura', patternUnits: 'userSpaceOnUse', width: 8, height: 8, patternTransform: 'rotate(45)' }, [ns('line', { x1: 0, y1: 0, x2: 0, y2: 8, 'class': 'jf-mapa__pat-linha' })]);
    var patPontos = ns('pattern', { id: id + '-pontos', patternUnits: 'userSpaceOnUse', width: 8, height: 8 }, [ns('circle', { cx: 4, cy: 4, r: 1, 'class': 'jf-mapa__pat-ponto' })]);
    defs.appendChild(patHach); defs.appendChild(patPontos);
    var cena = ns('g', { 'class': 'jf-mapa__cena' });
    var gCampo = ns('g', { 'class': 'jf-mapa__campo', 'aria-hidden': 'true' });
    var c = geo.campo;
    gCampo.appendChild(ns('rect', { 'class': 'jf-mapa__gramado', x: c.x, y: c.y, width: c.w, height: c.h }));
    var faixas = 10;
    for (var f = 0; f < faixas; f += 2) gCampo.appendChild(ns('rect', { 'class': 'jf-mapa__faixa', x: c.x + (c.w / faixas) * f, y: c.y, width: c.w / faixas, height: c.h }));
    gCampo.appendChild(ns('path', { 'class': 'jf-mapa__linhas', d: (c.linhas && c.linhas.length ? c.linhas.join(' ') : 'M' + c.x + ' ' + c.y + 'h' + c.w + 'v' + c.h + 'h' + (-c.w) + 'zM' + (c.x + c.w / 2) + ' ' + c.y + 'v' + c.h) }));
    var gSetores = ns('g', { 'class': 'jf-mapa__setores' });
    var gRotulos = ns('g', { 'class': 'jf-mapa__rotulos', 'aria-hidden': 'true' });
    geo.setores.slice().sort(function (a, b) { return a.ordem - b.ordem; }).forEach(function (g) {
      var no = ns('g', { 'class': 'jf-mapa__setor', 'data-id': g.id, role: 'button', tabindex: '-1', 'aria-pressed': 'false' });
      var onda = ns('path', { 'class': 'jf-mapa__onda', d: g.d, 'aria-hidden': 'true' });
      var corpo = ns('path', { 'class': 'jf-mapa__corpo', d: g.d });
      var tex = ns('path', { 'class': 'jf-mapa__tex', d: g.d, 'aria-hidden': 'true' });
      var cx = g.rotulo.x, cy = g.rotulo.y, cb = g.caixa || { x: cx - 50, y: cy - 50, w: 100, h: 100 };
      var placa = ns('rect', { 'class': 'jf-mapa__placa', 'aria-hidden': 'true' });
      var risco = ns('path', { 'class': 'jf-mapa__risco', d: 'M' + (cb.x + 14) + ' ' + (cb.y + 14) + 'L' + (cb.x + cb.w - 14) + ' ' + (cb.y + cb.h - 14), 'aria-hidden': 'true' });
      var ico = ns('g', { 'class': 'jf-mapa__ico', 'aria-hidden': 'true' });
      var sigla = ns('text', { 'class': 'jf-mapa__sigla', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'aria-hidden': 'true' });
      var n1 = ns('text', { 'class': 'jf-mapa__nome', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'aria-hidden': 'true' });
      var n2 = ns('text', { 'class': 'jf-mapa__nome', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'aria-hidden': 'true' });
      var preco = ns('text', { 'class': 'jf-mapa__preco', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'aria-hidden': 'true' });
      var selo = ns('g', { 'class': 'jf-mapa__selo', 'aria-hidden': 'true' }, [ns('circle', { r: 12 }), ns('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' })]);
      [onda, corpo, tex, placa, risco].forEach(function (x) { no.appendChild(x); });
      // o texto fica num grupo à parte (acima de todos os setores): o botão do setor não tem texto visível próprio, o nome acessível é o `aria-label` (Label in Name, WCAG 2.5.3)
      var rot = ns('g', { 'class': 'jf-mapa__rotulo', 'data-id': g.id, 'aria-hidden': 'true' });
      [ico, sigla, n1, n2, preco, selo].forEach(function (x) { rot.appendChild(x); });
      gSetores.appendChild(no); gRotulos.appendChild(rot);
      nos[g.id] = { g: no, rot: rot, corpo: corpo, tex: tex, placa: placa, risco: risco, ico: ico, sigla: sigla, n1: n1, n2: n2, preco: preco, selo: selo, icoNome: null, geo: g, cb: cb };
    });
    cena.appendChild(gCampo); cena.appendChild(gSetores); cena.appendChild(gRotulos);
    svg.appendChild(defs); svg.appendChild(cena);
    quadro.appendChild(svg);

    /* ---------- aparência por estado ---------- */
    function aplicar() {
      geo.setores.forEach(function (g) {
        var no = nos[g.id], s = porId[g.id];
        if (!s || s.oculto) { no.g.setAttribute('display', 'none'); no.rot.setAttribute('display', 'none'); no.g.setAttribute('tabindex', '-1'); return; }
        no.g.removeAttribute('display'); no.rot.removeAttribute('display');
        var est = estadoDe(s), trav = travado(s);
        no.g.setAttribute('data-estado', est);
        no.g.setAttribute('data-tipo', s.tipo || g.tipo || 'geral');
        no.g.setAttribute('aria-pressed', st.selecionado === s.id ? 'true' : 'false');
        if (trav) no.g.setAttribute('aria-disabled', 'true'); else no.g.removeAttribute('aria-disabled');
        no.g.setAttribute('aria-label', nomeAcessivel(s) + (st.selecionado === s.id ? ' ' + R.estados.escolhido + '.' : ''));
        no.g.setAttribute('data-destaque', st.destaque ? (st.destaque[s.id] ? 'sim' : 'nao') : 'sim');
        no.rot.setAttribute('data-estado', est); no.rot.setAttribute('data-destaque', no.g.getAttribute('data-destaque'));
        var tex = est === 'poucos' ? 'url(#' + id + '-hachura)' : est === 'visitante' ? 'url(#' + id + '-pontos)' : 'none';
        no.tex.setAttribute('fill', tex);
        no.icoNome = est === 'escolhido' ? 'check' : (est === 'plano' || est === 'direito') ? 'cadeado' : est === 'esgotado' ? null : TIPO_ICONE[s.tipo || g.tipo] || null;
        limpar(no.ico);
        if (no.icoNome) no.ico.appendChild(iconeCentrado(no.icoNome));
        var q = s.qtdEscolhida || 0;
        no.selo.setAttribute('display', q > 0 ? 'inline' : 'none');
        no.selo.querySelector('text').textContent = String(q);
      });
      rolagemRoving();
      layoutRotulos();
    }

    function rolagemRoving() {
      var vis = visiveis();
      if (!vis.length) return;
      var alvo = (st.foco && vis.indexOf(st.foco) >= 0) ? st.foco : (st.selecionado && vis.indexOf(st.selecionado) >= 0 ? st.selecionado : vis[0]);
      st.foco = alvo;
      Object.keys(nos).forEach(function (k) { nos[k].g.setAttribute('tabindex', k === alvo ? '0' : '-1'); });
    }

    /* ---------- texto no mapa: sempre 14 px na tela, qualquer zoom; o que cabe depende do tamanho do setor na tela ---------- */
    var FS = 16, LH = 18;    // texto de apoio de 16 px na tela (mínimo do protótipo) e a altura de linha
    function palavrasEmDuasLinhas(nome, maxChars) {
      var p = nome.split(/\s+/), l1 = '', l2 = '';
      p.forEach(function (w) { if ((l1 + ' ' + w).trim().length <= maxChars && !l2) l1 = (l1 + ' ' + w).trim(); else l2 = (l2 + ' ' + w).trim(); });
      if (!l2 || l2.length > maxChars || l1.length > maxChars) return null;
      return [l1, l2];
    }
    function layoutRotulos() {
      var esc = st.base * st.k;      // pixels de tela por unidade do desenho
      st._escAnterior = esc;
      geo.setores.forEach(function (g) {
        var no = nos[g.id], s = porId[g.id];
        if (!s || s.oculto) return;
        var est = estadoDe(s), cb = no.cb;
        var w = cb.w * esc, hh = cb.h * esc;
        var temPreco = s.preco != null && est !== 'esgotado' && est !== 'visitante-oculto';
        var mostraIco = !!no.icoNome && hh >= 82 && w >= 46;
        var nome = s.nome || g.nome || g.id;
        var duas = (w >= 118 && hh >= 108) ? palavrasEmDuasLinhas(nome, Math.floor((w - 16) / 10)) : null;
        var mostraPreco = temPreco && hh >= 62 && w >= 74;
        var texto = w >= 34 && hh >= 26;
        var corpoH = (mostraIco ? 24 : 0) + (duas ? 2 * LH : LH) + (mostraPreco ? LH + 2 : 0);
        var y = -corpoH / 2, cx = g.rotulo.x, cy = g.rotulo.y;
        var largTxt = Math.max(mostraIco ? 20 : 0, mostraPreco ? fmt(s.preco).length * 9.8 : 0, texto ? (duas ? Math.max(duas[0].length, duas[1].length) : (g.sigla || nome.slice(0, 3)).length) * 10 : 0) + 14;
        no.placa.setAttribute('x', cx - largTxt / 2 / esc); no.placa.setAttribute('y', cy - (corpoH / 2 + 4) / esc);
        no.placa.setAttribute('width', largTxt / esc); no.placa.setAttribute('height', (corpoH + 8) / esc); no.placa.setAttribute('rx', 4 / esc);
        no.placa.setAttribute('display', texto ? 'inline' : 'none');
        function pos(t, linhas, off) { t.setAttribute('x', cx); t.setAttribute('y', cy + off / esc); t.setAttribute('font-size', FS / esc); }
        no.ico.setAttribute('display', mostraIco ? 'inline' : 'none');
        if (mostraIco) { no.ico.setAttribute('transform', 'translate(' + cx + ' ' + (cy + (y + 10) / esc) + ') scale(' + (20 / 24 / esc) + ')'); y += 24; }
        var oculta = function (t) { t.setAttribute('display', 'none'); };
        var exibe = function (t) { t.removeAttribute('display'); };
        oculta(no.sigla); oculta(no.n1); oculta(no.n2); oculta(no.preco);
        if (texto) {
          if (duas) {
            no.n1.textContent = duas[0]; no.n2.textContent = duas[1];
            pos(no.n1, 1, y + LH / 2); pos(no.n2, 1, y + LH * 1.5); exibe(no.n1); exibe(no.n2); y += 2 * LH;
          } else {
            no.sigla.textContent = g.sigla || nome.slice(0, 3).toUpperCase();
            pos(no.sigla, 1, y + LH / 2); exibe(no.sigla); y += LH;
          }
          if (mostraPreco) { no.preco.textContent = fmt(s.preco); pos(no.preco, 1, y + 2 + LH / 2); exibe(no.preco); }
        }
        no.selo.setAttribute('display', (s.qtdEscolhida > 0 && w >= 40) ? 'inline' : 'none');
        no.selo.querySelector('circle').setAttribute('r', 12);
        no.selo.querySelector('text').setAttribute('font-size', 16);
        no.selo.setAttribute('transform', 'translate(' + (cb.x + cb.w - (4 + 12) / esc) + ' ' + (cb.y + (4 + 12) / esc) + ') scale(' + (1 / esc) + ')');
      });
      // trama da hachura e dos pontos: 8 px e traço de 2 px na tela
      var p = 8 / esc;
      [patHach, patPontos].forEach(function (pt) { pt.setAttribute('width', p); pt.setAttribute('height', p); });
      var ln = patHach.firstChild; ln.setAttribute('y2', p); ln.setAttribute('stroke-width', 2 / esc);
      var pt = patPontos.firstChild; pt.setAttribute('cx', p / 2); pt.setAttribute('cy', p / 2); pt.setAttribute('r', 1.25 / esc);
    }

    /* ---------- escala e transformação ---------- */
    function medir() {
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      st.base = Math.min(r.width / vb[2], r.height / vb[3]);
      return true;
    }
    function limites(k) {
      var lx = (vb[0] + vb[2]) * (1 - k), ux = vb[0] * (1 - k), ly = (vb[1] + vb[3]) * (1 - k), uy = vb[1] * (1 - k);
      return { lx: lx, ux: ux, ly: ly, uy: uy };
    }
    function prender(v) {
      var k = Math.max(1, Math.min(4, v.k)), l = limites(k);
      return { k: k, tx: Math.max(l.lx, Math.min(l.ux, v.tx)), ty: Math.max(l.ly, Math.min(l.uy, v.ty)) };
    }
    function pintar() {
      cena.setAttribute('transform', 'translate(' + st.tx + ' ' + st.ty + ') scale(' + st.k + ')');
      var ativo = st.k > 1.001;
      raizMapa.setAttribute('data-zoom', String(Math.round(st.k * 100) / 100));
      quadro.setAttribute('data-zoom-ativo', ativo ? 'sim' : 'nao');
      bMais.disabled = st.k >= 3.999; bMenos.disabled = st.k <= 1.001; bReset.disabled = !ativo && Math.abs(st.tx) < 0.5 && Math.abs(st.ty) < 0.5;
      [bMais, bMenos, bReset].forEach(function (b) { if (b.disabled && document.activeElement === b) { var alt = !bMais.disabled ? bMais : !bMenos.disabled ? bMenos : null; if (alt) alt.focus(); } });
      var nova = st.base * st.k;
      if (!st._escAnterior || Math.abs(nova - st._escAnterior) > 1e-4) layoutRotulos();
    }
    function irPara(alvo, animar) {
      alvo = prender(alvo);
      if (st.anima) { cancelAnimationFrame(st.anima.raf); st.anima = null; }
      var dur = animar && !preferenciaReduzida() ? ms('--motion-duration-slow', 480) : 0;
      var de = { k: st.k, tx: st.tx, ty: st.ty };
      var nivelAntes = st.k;
      if (!dur) { st.k = alvo.k; st.tx = alvo.tx; st.ty = alvo.ty; pintar(); if (alvo.k !== nivelAntes) avisarZoom(); return; }
      // o texto e a trama já nascem na escala de chegada (seguem o desenho enquanto ele cresce)
      var t0 = null;
      function passo(t) {
        if (t0 == null) t0 = t;
        var p = Math.min(1, (t - t0) / dur), e = EASE_MOVE(p);
        st.k = de.k + (alvo.k - de.k) * e; st.tx = de.tx + (alvo.tx - de.tx) * e; st.ty = de.ty + (alvo.ty - de.ty) * e;
        pintar();
        if (p < 1) st.anima = { raf: requestAnimationFrame(passo) }; else { st.anima = null; if (alvo.k !== nivelAntes) avisarZoom(); }
      }
      st.anima = { raf: requestAnimationFrame(passo) };
    }
    function avisarZoom() {
      emitir(raizMapa, 'jf-mapa:zoom', { nivel: st.k });
      if (o.aoMudarZoom) o.aoMudarZoom(st.k);
    }
    function ponto(clientX, clientY) {   // coordenadas do espaço do viewBox
      var m = svg.getScreenCTM();
      if (!m) return { x: vb[0] + vb[2] / 2, y: vb[1] + vb[3] / 2 };
      var p = svg.createSVGPoint(); p.x = clientX; p.y = clientY;
      var q = p.matrixTransform(m.inverse());
      return { x: q.x, y: q.y };
    }
    function zoomEm(fator, cx, cy, animar) {
      var k2 = Math.max(1, Math.min(4, st.k * fator));
      var tx = cx - (cx - st.tx) * k2 / st.k, ty = cy - (cy - st.ty) * k2 / st.k;
      irPara({ k: k2, tx: tx, ty: ty }, animar);
    }
    function zoomCentro(fator, anunciarNivel) {
      var r = svg.getBoundingClientRect();
      var p = ponto(r.left + r.width / 2, r.top + r.height / 2);
      zoomEm(fator, p.x, p.y, true);
      if (anunciarNivel) { var k2 = Math.max(1, Math.min(4, st.k * fator)); anunciar(R.zoomAnuncio(Math.round(k2 * 100))); }
    }
    function resetar() { irPara({ k: 1, tx: 0, ty: 0 }, true); anunciar(R.zoomAnuncio(100)); }
    function verSetor(idSetor) {   // traz o setor para dentro do quadro, sem mudar o zoom
      if (st.k <= 1.001) return;
      var g = geoPorId[idSetor]; if (!g) return;
      var cb = nos[idSetor].cb, m = 24;
      var x0 = st.tx + st.k * cb.x, x1 = st.tx + st.k * (cb.x + cb.w), y0 = st.ty + st.k * cb.y, y1 = st.ty + st.k * (cb.y + cb.h);
      var tx = st.tx, ty = st.ty;
      if (x0 < vb[0] + m) tx += vb[0] + m - x0; else if (x1 > vb[0] + vb[2] - m) tx -= x1 - (vb[0] + vb[2] - m);
      if (y0 < vb[1] + m) ty += vb[1] + m - y0; else if (y1 > vb[1] + vb[3] - m) ty -= y1 - (vb[1] + vb[3] - m);
      if (tx !== st.tx || ty !== st.ty) irPara({ k: st.k, tx: tx, ty: ty }, false);
    }

    /* ---------- escolha ---------- */
    function escolher(idSetor) {
      var s = porId[idSetor]; if (!s || s.oculto) return;
      if (travado(s)) {
        var mot = s.motivo || (R.estados[s.estado] || '');
        mostrarDetalhe(idSetor);
        anunciar(R.setorLabel(s.nome || idSetor) + ': ' + mot);
        emitir(raizMapa, 'jf-mapa:bloqueado', { setor: idSetor, motivo: mot });
        return;
      }
      st.selecionado = idSetor; st.foco = idSetor;
      aplicar(); mostrarDetalhe(idSetor);
      var livres = s.livres != null ? s.livres : null;
      anunciar(R.setorLabel(s.nome || idSetor) + ' escolhido.' + (livres != null ? ' ' + R.livres(livres) + (s.preco != null ? ', ' : '.') : ' ') + (s.preco != null ? R.aPartirDe(fmt(s.preco)) + '.' : ''));
      emitir(raizMapa, 'jf-mapa:escolher', { setor: idSetor });
      if (o.aoEscolher) o.aoEscolher(idSetor);
    }
    function fecharPainel() {
      if (!st.selecionado) return;
      var antes = st.selecionado;
      st.selecionado = null; st.foco = antes;
      aplicar(); mostrarDetalhe(antes);
      emitir(raizMapa, 'jf-mapa:fechar', { setor: antes });
      if (o.aoFechar) o.aoFechar(antes);
      focar(antes);
    }
    function mostrarDetalhe(idSetor) {
      var s = idSetor && porId[idSetor];
      limpar(detalhe);
      if (!s || s.oculto) { detalhe.removeAttribute('data-estado'); detalhe.textContent = ''; return; }
      var est = estadoDe(s);
      detalhe.setAttribute('data-estado', est);
      var partes = [s.nome || idSetor, R.estados[est]];
      if (!ESTADOS_TRAVADOS[s.estado || 'com-lugares']) {
        if (s.preco != null) partes.push(R.aPartirDe(fmt(s.preco)));
        if (s.livres != null) partes.push(R.livres(s.livres));
        if (s.portao) partes.push(R.portao(s.portao));
      }
      if (s.motivo) partes.push(s.motivo);
      detalhe.textContent = partes.join(' · ');
    }
    function focar(idSetor) {
      var no = nos[idSetor]; if (!no || no.g.getAttribute('display') === 'none') return;
      st.foco = idSetor;
      Object.keys(nos).forEach(function (k) { nos[k].g.setAttribute('tabindex', k === idSetor ? '0' : '-1'); });
      no.g.focus({ preventScroll: true });
    }

    /* ---------- eventos ---------- */
    function setorDe(alvo) { var n = alvo.closest && alvo.closest('.jf-mapa__setor'); return n ? n.getAttribute('data-id') : null; }
    aoOuvir(svg, 'click', function (e) {
      if (st.arrastou) { st.arrastou = false; return; }
      var i = setorDe(e.target); if (i) { focar(i); escolher(i); }
    });
    aoOuvir(svg, 'mouseover', function (e) { var i = setorDe(e.target); if (i) mostrarDetalhe(i); });
    aoOuvir(svg, 'mouseout', function (e) { if (!e.relatedTarget || !svg.contains(e.relatedTarget)) mostrarDetalhe(st.selecionado); });
    aoOuvir(svg, 'focusin', function (e) {
      var i = setorDe(e.target); if (!i) return;
      st.foco = i; rolagemRoving(); mostrarDetalhe(i); verSetor(i);
    });
    aoOuvir(svg, 'focusout', function (e) { if (!e.relatedTarget || !svg.contains(e.relatedTarget)) mostrarDetalhe(st.selecionado); });
    aoOuvir(raizMapa, 'keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var noSetor = setorDe(e.target);
      var vis = visiveis();
      if (noSetor && vis.length) {
        var i = vis.indexOf(noSetor), alvo = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') alvo = vis[(i + 1) % vis.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') alvo = vis[(i - 1 + vis.length) % vis.length];
        else if (e.key === 'Home') alvo = vis[0];
        else if (e.key === 'End') alvo = vis[vis.length - 1];
        if (alvo) { e.preventDefault(); focar(alvo); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(noSetor); return; }
      }
      if (e.key === 'Escape' && st.selecionado) { e.preventDefault(); e.stopPropagation(); fecharPainel(); return; }
      if (e.target.closest && e.target.closest('.jf-mapa__zoom') && (e.key === 'Enter' || e.key === ' ')) return;   // botões: o clique nativo
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomCentro(1.6, true); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomCentro(1 / 1.6, true); }
      else if (e.key === '0') { e.preventDefault(); resetar(); }
    });
    aoOuvir(bMais, 'click', function () { zoomCentro(1.6, true); });
    aoOuvir(bMenos, 'click', function () { zoomCentro(1 / 1.6, true); });
    aoOuvir(bReset, 'click', resetar);
    if (bCheia) aoOuvir(bCheia, 'click', abrirTelaCheia);

    /* roda com Ctrl (e a pinça do trackpad, que chega como Ctrl + roda) */
    aoOuvir(quadro, 'wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var p = ponto(e.clientX, e.clientY);
      zoomEm(Math.exp(-e.deltaY * 0.01), p.x, p.y, false);
    }, { passive: false });

    /* arrastar (um dedo ou o mouse, com zoom) e pinça (dois dedos) */
    var ptrs = {};
    function nPtr() { return Object.keys(ptrs).length; }
    var gesto = null;
    aoOuvir(quadro, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
      if (st.anima) { cancelAnimationFrame(st.anima.raf); st.anima = null; }
      if (nPtr() === 2) { var a = ptrs[Object.keys(ptrs)[0]], b = ptrs[Object.keys(ptrs)[1]]; gesto = { tipo: 'pinca', d: Math.hypot(a.x - b.x, a.y - b.y), k: st.k, tx: st.tx, ty: st.ty, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; st.arrastou = true; }
      else if (nPtr() === 1) gesto = { tipo: 'arrasto', tx: st.tx, ty: st.ty, x0: e.clientX, y0: e.clientY, capturou: false };
    });
    aoOuvir(quadro, 'pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p || !gesto) return;
      p.x = e.clientX; p.y = e.clientY;
      if (gesto.tipo === 'pinca' && nPtr() >= 2) {
        var ks = Object.keys(ptrs), a = ptrs[ks[0]], b = ptrs[ks[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var k2 = Math.max(1, Math.min(4, gesto.k * d / gesto.d));
        var pm0 = ponto(gesto.mx, gesto.my);
        // o ponto sob os dedos no início fica sob os dedos agora
        var tx0 = pm0.x - (pm0.x - gesto.tx) * k2 / gesto.k, ty0 = pm0.y - (pm0.y - gesto.ty) * k2 / gesto.k;
        var dx = (mx - gesto.mx) / st.base, dy = (my - gesto.my) / st.base;
        var v = prender({ k: k2, tx: tx0 + dx, ty: ty0 + dy });
        st.k = v.k; st.tx = v.tx; st.ty = v.ty; pintar();
        e.preventDefault();
      } else if (gesto.tipo === 'arrasto' && st.k > 1.001) {
        var ddx = e.clientX - gesto.x0, ddy = e.clientY - gesto.y0;
        if (!gesto.capturou && Math.hypot(ddx, ddy) > 4) { gesto.capturou = true; st.arrastou = true; try { quadro.setPointerCapture(e.pointerId); } catch (x) { /* sem captura */ } quadro.setAttribute('data-arrastando', 'sim'); }
        if (gesto.capturou) {
          var v2 = prender({ k: st.k, tx: gesto.tx + ddx / st.base, ty: gesto.ty + ddy / st.base });
          st.tx = v2.tx; st.ty = v2.ty; pintar();
        }
      }
    });
    function soltou(e) {
      if (!ptrs[e.pointerId]) return;
      delete ptrs[e.pointerId];
      if (nPtr() === 0) { gesto = null; quadro.removeAttribute('data-arrastando'); setTimeout(function () { st.arrastou = false; }, 0); }
      else if (nPtr() === 1) { var k0 = Object.keys(ptrs)[0], p = ptrs[k0]; gesto = { tipo: 'arrasto', tx: st.tx, ty: st.ty, x0: p.x, y0: p.y, capturou: true }; }
      if (nPtr() === 0 && st.k !== undefined) avisarZoom();
    }
    aoOuvir(quadro, 'pointerup', soltou); aoOuvir(quadro, 'pointercancel', soltou);

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (medir()) { st._escAnterior = null; var l = prender({ k: st.k, tx: st.tx, ty: st.ty }); st.tx = l.tx; st.ty = l.ty; pintar(); } });
      ro.observe(quadro);
    }

    /* ---------- legenda: amostra do mesmo desenho, com forma, ícone e texto ---------- */
    var legendaSvgDefs = null;
    function amostra(est, tipo, icoNome) {
      var sv = ns('svg', { 'class': 'jf-mapa__amostra', viewBox: '0 0 36 24', width: 36, height: 24, 'aria-hidden': 'true', focusable: 'false' });
      var g = ns('g', { 'class': 'jf-mapa__setor jf-mapa__setor--amostra', 'data-estado': est, 'data-tipo': tipo || 'geral', 'data-destaque': 'sim' });
      g.appendChild(ns('path', { 'class': 'jf-mapa__corpo', d: 'M3 1.5h30l2 2v17l-2 2H3l-2-2v-17z' }));
      var tex = ns('path', { 'class': 'jf-mapa__tex', d: 'M3 1.5h30l2 2v17l-2 2H3l-2-2v-17z', fill: est === 'poucos' ? 'url(#' + id + '-l-hachura)' : est === 'visitante' ? 'url(#' + id + '-l-pontos)' : 'none' });
      g.appendChild(tex);
      if (est === 'esgotado') g.appendChild(ns('path', { 'class': 'jf-mapa__risco', d: 'M7 5L29 19' }));
      if (icoNome && (est === 'poucos' || est === 'visitante')) g.appendChild(ns('rect', { 'class': 'jf-mapa__placa', x: 9, y: 4, width: 18, height: 16, rx: 3 }));
      if (icoNome) { var gi = ns('g', { 'class': 'jf-mapa__ico', transform: 'translate(18 12) scale(' + (16 / 24) + ')' }); gi.appendChild(iconeCentrado(icoNome)); g.appendChild(gi); }
      sv.appendChild(g);
      return sv;
    }
    function legenda() {
      limpar(legendaBox);
      var presentes = {}, tipos = {};
      Object.keys(porId).forEach(function (k) { var s = porId[k]; if (s.oculto) return; presentes[s.estado === 'escolhido' ? 'com-lugares' : (s.estado || 'com-lugares')] = 1; if (estadoDe(s) === 'escolhido') presentes.escolhido = 1; tipos[s.tipo || (geoPorId[k] && geoPorId[k].tipo)] = 1; });
      var defsL = ns('svg', { 'class': 'jf-mapa__defs-legenda', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' }, [ns('defs', null, [
        ns('pattern', { id: id + '-l-hachura', patternUnits: 'userSpaceOnUse', width: 8, height: 8, patternTransform: 'rotate(45)' }, [ns('line', { x1: 0, y1: 0, x2: 0, y2: 8, 'class': 'jf-mapa__pat-linha', 'stroke-width': 2 })]),
        ns('pattern', { id: id + '-l-pontos', patternUnits: 'userSpaceOnUse', width: 8, height: 8 }, [ns('circle', { cx: 4, cy: 4, r: 1.25, 'class': 'jf-mapa__pat-ponto' })])
      ])]);
      legendaBox.appendChild(defsL);
      var ordemEst = ['com-lugares', 'poucos', 'esgotado', 'plano', 'direito', 'visitante', 'escolhido'];
      var ulE = h('ul', { 'class': 'jf-mapa__legenda', 'aria-label': R.legendaEstados });
      ordemEst.forEach(function (e) {
        if (!presentes[e]) return;
        var ic = e === 'escolhido' ? 'check' : (e === 'plano' || e === 'direito') ? 'cadeado' : e === 'visitante' ? 'bandeira' : null;
        ulE.appendChild(h('li', { 'class': 'jf-mapa__legenda-item', 'data-estado': e }, [amostra(e, null, ic), h('span', { texto: R.estados[e] })]));
      });
      var ulT = h('ul', { 'class': 'jf-mapa__legenda jf-mapa__legenda--tipos', 'aria-label': R.legendaTipos });
      ['cadeira', 'arquibancada', 'geral', 'camarote', 'pcd', 'visitante'].forEach(function (t) {
        if (!tipos[t] || (t === 'visitante' && presentes.visitante)) return;
        var sv = ns('svg', { 'class': 'jf-mapa__amostra jf-mapa__amostra--tipo', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': 'true', focusable: 'false' });
        var gi = ns('g', { 'class': 'jf-mapa__ico', transform: 'translate(12 12)' }); gi.appendChild(iconeCentrado(TIPO_ICONE[t])); sv.appendChild(gi);
        ulT.appendChild(h('li', { 'class': 'jf-mapa__legenda-item' }, [sv, h('span', { texto: R.tipos[t] })]));
      });
      var wrap = h('div', { 'class': 'jf-mapa__legenda-grupo', role: 'group', 'aria-label': R.legenda }, [ulE, ulT]);
      legendaBox.appendChild(wrap);
    }

    /* ---------- tela cheia (o mesmo mapa, em IngresseModal) ---------- */
    function abrirTelaCheia() {
      var interno = null;
      window.IngresseModal.abrir({
        id: id + '-modal', titulo: R.mapa, classe: 'jf-mapa-modal', gatilho: bCheia, rotuloFechar: 'Fechar',
        montar: function (c) {
          var alvo = h('div', { 'class': 'jf-mapa-modal__corpo' });
          c.corpo.appendChild(alvo);
          var op2 = mesclar(o, {});
          op2.estadio = geo; op2.setores = Object.keys(porId).map(function (k) { return porId[k]; }); op2.selecionado = st.selecionado; op2._dentroDaModal = true;
          op2.aoEscolher = function (i) { escolher(i); };
          op2.aoFechar = function () { fecharPainel(); };
          interno = montarMapa(alvo, op2);
          var b = h('button', { type: 'button', 'class': 'bp' }, [R.concluir]);
          b.addEventListener('click', function () { c.fechar(true); });
          c.rodape.appendChild(b);
        },
        aoFechar: function () { if (interno) interno.destruir(); },
        foco: function (c) { return c.corpo.querySelector('.jf-mapa__setor[tabindex="0"]'); }
      });
    }

    /* ---------- estado do mapa (E-22) ---------- */
    function pintarEstadoMapa() {
      var em = st.estadoMapa;
      raizMapa.setAttribute('data-estado-mapa', em);
      limpar(aviso);
      if (em === 'ok') { aviso.hidden = true; quadro.hidden = false; zoomBox.hidden = false; return; }
      quadro.hidden = true; zoomBox.hidden = true; aviso.hidden = false;
      var texto = em === 'lento' ? R.mapaLento : R.mapaFalha;
      var botoes = [];
      var bl = h('button', { type: 'button', 'class': 'bs bs-sm', 'data-acao': 'ver-lista' }, [R.verLista]);
      bl.addEventListener('click', function () { if (o.aoFalhar) o.aoFalhar(em); emitir(raizMapa, 'jf-mapa:falha', { motivo: em }); });
      botoes.push(bl);
      if (em === 'falha') {
        var bt = h('button', { type: 'button', 'class': 'bp bp-sm', 'data-acao': 'tentar' }, [R.tentarDeNovo]);
        bt.addEventListener('click', function () { st.estadoMapa = 'ok'; pintarEstadoMapa(); medir(); st._escAnterior = null; pintar(); aplicar(); });
        botoes.push(bt);
      }
      aviso.appendChild(h('div', { 'class': 'uui-alert uui-alert--warning', role: 'status' }, [
        h('span', { 'class': 'uui-alert__icon' }, [icone('alerta', 'uui-ico')]),
        h('div', { 'class': 'uui-alert__body' }, [h('p', { 'class': 'uui-alert__text', texto: texto }), h('div', { 'class': 'uui-alert__actions' }, botoes)])
      ]));
    }

    /* ---------- partida ---------- */
    legenda();
    pintarEstadoMapa();
    medir();
    aplicar();
    pintar();
    mostrarDetalhe(st.selecionado);
    requestAnimationFrame(function () { if (medir()) { st._escAnterior = null; pintar(); aplicar(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (medir()) { st._escAnterior = null; pintar(); } });

    return {
      el: raizMapa,
      atualizar: function (p) {
        p = p || {};
        if (p.setores) { o.setores = p.setores; indexar(); }
        if ('selecionado' in p) st.selecionado = p.selecionado;
        if ('destaque' in p) st.destaque = p.destaque ? arr2set(p.destaque) : null;
        if (p.estadoMapa) { st.estadoMapa = p.estadoMapa; pintarEstadoMapa(); }
        if (p.rotulos) R = mesclar(R, p.rotulos);
        legenda(); aplicar(); mostrarDetalhe(st.selecionado);
      },
      focar: focar,
      zoom: function (d) { if (d === 0) resetar(); else zoomCentro(d > 0 ? 1.6 : 1 / 1.6, true); return st.k; },
      destruir: function () {
        ouvintes.forEach(function (x) { x[0].removeEventListener(x[1], x[2], x[3]); });
        ouvintes = []; if (ro) ro.disconnect(); if (st.anima) cancelAnimationFrame(st.anima.raf); clearTimeout(vivoTimer);
        limpar(raiz);
      }
    };
  }

  /* =========================================================================================================== */
  /*  GRADE DE ASSENTOS                                                                                          */
  /* =========================================================================================================== */
  function montarAssentos(raiz, opcoes) {
    var o = opcoes || {};
    var R = mesclar(ROTULOS, o.rotulos);
    var fmt = o.formatarPreco || brl;
    var id = 'jfa' + (++uid);
    var setor = o.setor || { id: 's', nome: 'Setor' };
    var st = { escolhidos: (o.escolhidos || []).slice(), max: o.max != null ? o.max : 4, tomados: {}, n: 1, foco: null, vizinhos: {} };
    (o.tomados || []).forEach(function (t) { st.tomados[t] = 1; });
    var assentos = [], porId = {}, fileiras = [], porFileira = {};
    var ouvintes = [], vivoTimer = null;
    function aoOuvir(alvo, tipo, fn, opt) { alvo.addEventListener(tipo, fn, opt); ouvintes.push([alvo, tipo, fn, opt]); }

    function indexar() {
      assentos = o.assentos || []; porId = {}; fileiras = []; porFileira = {};
      assentos.forEach(function (a) {
        porId[a.id] = a;
        if (!porFileira[a.fileira]) { porFileira[a.fileira] = []; fileiras.push(a.fileira); }
        porFileira[a.fileira].push(a);
      });
      fileiras.forEach(function (f) { porFileira[f].sort(function (a, b) { return a.numero - b.numero; }); });
    }
    indexar();
    var colunas = fileiras.length ? porFileira[fileiras[0]].length : 0;
    var corredor = colunas >= 16 ? Math.floor(colunas / 2) : (setor.pares ? 6 : 0);    // o corredor do meio (depois do assento N): só desenho, não quebra a numeração
    function precoDe(a) { var p = typeof o.preco === 'function' ? o.preco(a) : o.preco; return p == null ? null : p; }
    function livre(a) { return a.estado === 'livre' && !st.tomados[a.id]; }
    function escolhido(a) { return st.escolhidos.indexOf(a.id) >= 0; }
    function estadoTexto(a) { return escolhido(a) ? R.seatReservado : livre(a) ? R.seatDisp : R.seatIndisp; }
    function papelTexto(a) { return a.papel === 'acessivel' ? R.seatAcessivel.toLowerCase() : a.papel === 'acompanhante' ? R.seatAcompanhante.toLowerCase() : ''; }
    function nomeSeat(a) { var p = precoDe(a); return R.seatNome(a.fileira, a.numero, setor.nome, p != null ? fmt(p) : '', estadoTexto(a), papelTexto(a)); }

    limpar(raiz);
    var raizA = h('div', { 'class': 'jf-assentos', 'data-setor': setor.id });
    /* topo: quantidade, encontrar e ir para a fileira */
    var nome = h('span', { 'class': 'over jf-assentos__rotulo', id: id + '-q', texto: R.quantos });
    var bMenos = h('button', { type: 'button', 'class': 'step', 'aria-label': R.menosIngresso, 'data-acao': 'menos' }, ['−']);
    var nBox = h('span', { 'class': 'qtd__n', 'aria-live': 'off', 'data-n': '1' }, ['1']);
    var bMais = h('button', { type: 'button', 'class': 'step', 'aria-label': R.maisIngresso, 'data-acao': 'mais' }, ['+']);
    var qtd = h('div', { 'class': 'qtd', role: 'group', 'aria-labelledby': id + '-q' }, [bMenos, nBox, bMais]);
    var bEnc = h('button', { type: 'button', 'class': 'bs bs-sm jf-assentos__encontrar-btn', 'data-acao': 'encontrar' }, [R.encontrar]);
    var campoQ = h('div', { 'class': 'jf-assentos__quantos' }, [nome, qtd]);
    var enc = h('div', { 'class': 'jf-assentos__encontrar', role: 'group', 'aria-label': R.encontrar }, [campoQ, bEnc]);
    var sel = h('select', { 'class': 'jf-assentos__select', id: id + '-f', 'aria-label': R.irFileira });
    var optPh = h('option', { value: '', texto: R.todasFileiras }); sel.appendChild(optPh);
    var campoF = h('div', { 'class': 'field jf-assentos__fileira' }, [h('label', { 'for': id + '-f', texto: R.irFileira }), sel]);
    var topo = h('div', { 'class': 'jf-assentos__topo' }, [enc, campoF]);
    var aviso = h('div', { 'class': 'jf-assentos__aviso', hidden: true });
    var quadro = h('div', { 'class': 'jf-assentos__quadro', tabindex: '-1' });
    var campoBarra = h('div', { 'class': 'jf-assentos__campo', 'aria-hidden': 'true' }, [R.campo]);
    var grade = h('div', { 'class': 'jf-assentos__grade', role: 'grid', 'aria-label': R.grade(setor.nome), 'aria-rowcount': String(fileiras.length + 1), 'aria-colcount': String(colunas + 1) });
    var legendaA = h('ul', { 'class': 'jf-assentos__legenda', 'aria-label': R.legenda });
    var vivo = h('p', { 'class': 'sr-only', role: 'status', 'aria-live': 'polite' });
    quadro.appendChild(campoBarra); quadro.appendChild(grade);
    [topo, aviso, quadro, legendaA, vivo].forEach(function (x) { raizA.appendChild(x); });
    raiz.appendChild(raizA);

    function anunciar(t) { vivo.textContent = ''; clearTimeout(vivoTimer); vivoTimer = setTimeout(function () { vivo.textContent = t; }, 30); }
    var botoes = {};   // por id
    function montarGrade() {
      limpar(grade); botoes = {};
      var cab = h('div', { role: 'row', 'class': 'jf-assentos__linha jf-assentos__linha--cab', 'aria-rowindex': '1' }, [h('span', { role: 'columnheader', 'class': 'jf-assentos__rot jf-assentos__rot--canto' }, [h('span', { 'class': 'sr-only', texto: R.fileira })])]);
      for (var c = 1; c <= colunas; c++) cab.appendChild(h('span', { role: 'columnheader', 'class': 'jf-assentos__num', 'aria-label': R.assento + ' ' + c, 'data-corredor': corredor && c === corredor + 1 ? 'sim' : null }, [String(c)]));
      grade.appendChild(cab);
      fileiras.forEach(function (f, ri) {
        var linha = h('div', { role: 'row', 'class': 'jf-assentos__linha', 'aria-rowindex': String(ri + 2), 'data-fileira': f }, [h('span', { role: 'rowheader', 'class': 'jf-assentos__rot', 'aria-label': R.fileira + ' ' + f }, [f])]);
        porFileira[f].forEach(function (a) {
          var b = h('button', { type: 'button', 'class': 'jf-assento', 'data-id': a.id, 'data-papel': a.papel || 'cadeira', tabindex: '-1' });
          var forma = h('span', { 'class': 'jf-assento__forma', 'aria-hidden': 'true' });
          b.appendChild(forma);
          var cel = h('div', { role: 'gridcell', 'class': 'jf-assentos__cel', 'aria-colindex': String(a.numero + 1), 'data-corredor': corredor && a.numero === corredor + 1 ? 'sim' : null }, [b]);
          linha.appendChild(cel);
          botoes[a.id] = b;
        });
        grade.appendChild(linha);
      });
    }
    function icoSeat(b, nomeIco) {
      var forma = b.firstChild;
      limpar(forma);
      if (nomeIco) forma.appendChild(icone(nomeIco));
    }
    function pintarSeat(a) {
      var b = botoes[a.id]; if (!b) return;
      var esc = escolhido(a), lv = livre(a);
      var est = esc ? 'escolhido' : lv ? 'livre' : 'indisponivel';
      b.setAttribute('data-estado', est);
      b.setAttribute('aria-pressed', esc ? 'true' : 'false');
      if (!lv && !esc) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      b.setAttribute('aria-label', nomeSeat(a));
      b.setAttribute('data-vizinho', st.vizinhos[a.id] ? 'sim' : 'nao');
      b.setAttribute('title', a.fileira + a.numero + (precoDe(a) != null ? ' · ' + fmt(precoDe(a)) : ''));
      var forma = b.firstChild, atual = forma.getAttribute('data-ico') || '';
      var queIco = esc ? 'check' : a.papel === 'acessivel' ? 'acessivel' : a.papel === 'acompanhante' ? 'pessoas' : '';
      if (!esc && !lv) { if (atual !== 'vazio') { limpar(forma); forma.setAttribute('data-ico', 'vazio'); } }       // indisponível: só o risco (o número está no nome acessível)
      else if (!esc && !queIco) { if (atual !== 'num') { limpar(forma); forma.textContent = String(a.numero); forma.setAttribute('data-ico', 'num'); } }
      else if (atual !== queIco) { limpar(forma); forma.setAttribute('data-ico', queIco); forma.appendChild(icone(queIco)); }
      if (!esc && lv && !queIco && forma.textContent !== String(a.numero)) forma.textContent = String(a.numero);
    }
    function pintarTudo() {
      assentos.forEach(pintarSeat);
      // roving: o primeiro escolhido, senão o primeiro livre
      var alvo = (st.foco && botoes[st.foco]) ? st.foco : (st.escolhidos[0] && botoes[st.escolhidos[0]] ? st.escolhidos[0] : (assentos.filter(livre)[0] || assentos[0] || {}).id);
      st.foco = alvo;
      Object.keys(botoes).forEach(function (k) { botoes[k].setAttribute('tabindex', k === alvo ? '0' : '-1'); });
      nBox.textContent = String(st.n); nBox.setAttribute('data-n', String(st.n));
      bMenos.disabled = st.n <= 1; bMais.disabled = st.n >= Math.max(1, st.max);
      var tem = st.escolhidos.length;
      raizA.setAttribute('data-escolhidos', String(tem));
    }
    function legendaMontar() {
      limpar(legendaA);
      var itens = [['livre', R.seatLivre, null], ['escolhido', R.seatEscolhido, 'check'], ['indisponivel', R.seatIndisponivel, null]];
      if (setor.pares) { itens.push(['acessivel', R.seatAcessivel, 'acessivel']); itens.push(['acompanhante', R.seatAcompanhante, 'pessoas']); }
      itens.forEach(function (it) {
        var forma = h('span', { 'class': 'jf-assento__forma jf-assento__forma--amostra', 'data-estado': (it[0] === 'acessivel' || it[0] === 'acompanhante') ? 'livre' : it[0], 'aria-hidden': 'true' });
        if (it[2]) forma.appendChild(icone(it[2]));
        legendaA.appendChild(h('li', { 'class': 'jf-assentos__legenda-item' }, [forma, h('span', { texto: it[1] })]));
      });
    }
    function selectFileiras() {
      limpar(sel); sel.appendChild(optPh);
      fileiras.forEach(function (f) { sel.appendChild(h('option', { value: f, texto: R.fileira + ' ' + f })); });
    }

    /* ---------- avisos (uui-alert) ---------- */
    function mostrarAviso(variante, texto, acoes, foco) {
      limpar(aviso); aviso.hidden = false;
      var ic = variante === 'success' ? 'check' : 'alerta';
      var corpo = [h('p', { 'class': 'uui-alert__text', texto: texto })];
      if (acoes && acoes.length) corpo.push(h('div', { 'class': 'uui-alert__actions' }, acoes));
      var al = h('div', { 'class': 'uui-alert uui-alert--' + variante, role: variante === 'warning' && foco ? 'alert' : 'status', tabindex: foco ? '-1' : null }, [
        h('span', { 'class': 'uui-alert__icon' }, [icone(ic, 'uui-ico')]), h('div', { 'class': 'uui-alert__body' }, corpo)]);
      aviso.appendChild(al);
      if (foco) al.focus({ preventScroll: false });
      return al;
    }
    function limparAviso() { limpar(aviso); aviso.hidden = true; }
    function botaoAviso(txt, fn, primario) {
      var b = h('button', { type: 'button', 'class': 'linkbtn' }, [txt]);
      b.addEventListener('click', fn);
      return b;
    }

    /* ---------- escolha ---------- */
    function alternar(a, origem) {
      if (!a) return;
      var esc = escolhido(a);
      if (!esc && !livre(a)) { anunciar(nomeSeat(a)); return; }
      if (!esc && st.escolhidos.length >= st.max) {
        var m = o.limiteMotivo || R.limite(st.max);
        mostrarAviso('warning', m, null, false); anunciar(m);
        emitir(raizA, 'jf-assentos:limite', { max: st.max }); return;
      }
      if (esc) st.escolhidos.splice(st.escolhidos.indexOf(a.id), 1); else st.escolhidos.push(a.id);
      pintarTudo();
      limparAviso();
      var qtd = st.escolhidos.filter(function (i) { return porId[i]; }).length;
      anunciar((!esc ? R.escolhaAnuncio : R.retiradoAnuncio)(a.fileira, a.numero, qtd, st.max));
      if (!esc && a.papel === 'acessivel') {
        var viz = porFileira[a.fileira].filter(function (x) { return x.numero === a.numero + 1 && x.papel === 'acompanhante'; })[0];
        if (viz && livre(viz) && !escolhido(viz) && st.escolhidos.length < st.max) {
          mostrarAviso('neutral', R.acessivelApoio, [botaoAviso(R.incluirAcompanhante, function () { alternar(viz, 'acompanhante'); botoes[viz.id].focus(); })], false);
        }
      }
      emitir(raizA, 'jf-assentos:alternar', { id: a.id, escolhido: !esc, escolhidos: st.escolhidos.slice() });
      if (o.aoAlternar) o.aoAlternar(a.id, !esc);
    }

    /* ---------- encontrar lugares juntos ---------- */
    function melhorBloco(n) {
      var melhor = null, meio = (colunas + 1) / 2;
      fileiras.forEach(function (f, ri) {
        var l = porFileira[f], i = 0;
        while (i < l.length) {
          if (!livre(l[i]) && !(escolhido(l[i]))) { i++; continue; }
          var j = i;
          while (j < l.length && (livre(l[j]) || escolhido(l[j])) && !(corredor && l[j].numero === corredor + 1 && j > i)) j++;   // o corredor separa
          var run = l.slice(i, j);
          for (var s = 0; s + n <= run.length; s++) {
            if (setor.pares && run[s].papel !== 'acessivel') continue;
            var centro = (run[s].numero + run[s + n - 1].numero) / 2;
            var nota = ri * 1.2 + Math.abs(centro - meio) * 0.8;
            if (!melhor || nota < melhor.nota) melhor = { nota: nota, lugares: run.slice(s, s + n), fileira: f };
          }
          i = j === i ? i + 1 : j;
        }
      });
      return melhor;
    }
    function encontrar(n) {
      n = Math.min(n, Math.max(1, st.max));
      var m = melhorBloco(n);
      if (!m) {
        var al = mostrarAviso('warning', R.semJuntos(n), [
          botaoAviso(R.verOutrosSetores, function () { emitir(raizA, 'jf-assentos:outros', {}); if (o.aoVerOutrosSetores) o.aoVerOutrosSetores(); }),
          botaoAviso(R.escolherSeparados, function () { limparAviso(); var p = assentos.filter(livre)[0]; if (p) { st.foco = p.id; pintarTudo(); botoes[p.id].focus(); } })
        ], false);
        anunciar(R.semJuntos(n));
        emitir(raizA, 'jf-assentos:encontrar', { n: n, ids: null });
        if (o.aoEncontrar) o.aoEncontrar(n, null);
        return null;
      }
      var ids = m.lugares.map(function (a) { return a.id; });
      // troca a escolha deste setor pelo bloco encontrado
      var antes = st.escolhidos.slice();
      antes.forEach(function (i) { if (ids.indexOf(i) < 0) { st.escolhidos.splice(st.escolhidos.indexOf(i), 1); if (o.aoAlternar) o.aoAlternar(i, false); } });
      ids.forEach(function (i) { if (st.escolhidos.indexOf(i) < 0) { st.escolhidos.push(i); if (o.aoAlternar) o.aoAlternar(i, true); } });
      st.vizinhos = {};
      pintarTudo();
      var a = m.lugares[0], b = m.lugares[m.lugares.length - 1];
      var t = R.encontramos(m.lugares.length, m.fileira, a.numero, b.numero);
      mostrarAviso('success', t, null, false); anunciar(t);
      botoes[a.id].scrollIntoView({ block: 'nearest', inline: 'center', behavior: preferenciaReduzida() ? 'auto' : 'smooth' });
      emitir(raizA, 'jf-assentos:encontrar', { n: n, ids: ids, fileira: m.fileira, de: a.numero, ate: b.numero });
      if (o.aoEncontrar) o.aoEncontrar(n, { ids: ids, fileira: m.fileira, de: a.numero, ate: b.numero });
      return ids;
    }

    /* ---------- assento tomado por outra pessoa (E-01): o lugar vira indisponível, os outros ficam, e o aviso diz o que fazer ---------- */
    function tomar(ids) {
      var primeiro = null, perdidos = 0;
      ids.forEach(function (i) {
        var a = porId[i]; if (!a || st.tomados[i]) return;
        st.tomados[i] = 1; primeiro = primeiro || a;
        var estava = st.escolhidos.indexOf(i);
        if (estava >= 0) { st.escolhidos.splice(estava, 1); perdidos++; if (o.aoAlternar) o.aoAlternar(i, false); }
        emitir(raizA, 'jf-assentos:tomado', { id: i });
      });
      if (!primeiro) return;
      // vizinhos livres mais próximos, na mesma fileira (primeiro) e nas fileiras vizinhas
      st.vizinhos = {};
      var l = porFileira[primeiro.fileira], pos = l.indexOf(primeiro), sugest = [];
      for (var d = 1; d <= 3 && sugest.length < 3; d++) { [pos - d, pos + d].forEach(function (p) { if (l[p] && livre(l[p]) && sugest.length < 3) sugest.push(l[p]); }); }
      sugest.forEach(function (a) { st.vizinhos[a.id] = 1; });
      pintarTudo();
      var t = R.tomado(primeiro.numero, primeiro.fileira);
      var acoes = [
        botaoAviso(R.escolherOutro, function () { var p = sugest[0] || assentos.filter(livre)[0]; if (p) { st.foco = p.id; pintarTudo(); botoes[p.id].focus(); } }),
        botaoAviso(R.encontrar, function () { encontrar(Math.max(1, st.n)); })
      ];
      mostrarAviso('warning', t, acoes, true);
      anunciar(t);
    }

    /* ---------- teclado e clique ---------- */
    function celula(b) { return b && b.closest ? b.closest('.jf-assento') : null; }
    function idDe(b) { var x = celula(b); return x ? x.getAttribute('data-id') : null; }
    aoOuvir(grade, 'click', function (e) { var i = idDe(e.target); if (i) { st.foco = i; alternar(porId[i], 'clique'); } });
    aoOuvir(grade, 'focusin', function (e) {
      var i = idDe(e.target); if (!i) return; st.foco = i;
      Object.keys(botoes).forEach(function (k) { botoes[k].setAttribute('tabindex', k === i ? '0' : '-1'); });
    });
    function irPara(f, num) { var a = porFileira[f] && porFileira[f][num]; if (a) { st.foco = a.id; botoes[a.id].focus(); } }
    aoOuvir(grade, 'keydown', function (e) {
      var i = idDe(e.target); if (!i) return;
      var a = porId[i], l = porFileira[a.fileira], pos = l.indexOf(a), ri = fileiras.indexOf(a.fileira);
      var k = e.key, feito = true;
      if (k === 'ArrowRight') irPara(a.fileira, Math.min(l.length - 1, pos + 1));
      else if (k === 'ArrowLeft') irPara(a.fileira, Math.max(0, pos - 1));
      else if (k === 'ArrowDown') irPara(fileiras[Math.min(fileiras.length - 1, ri + 1)], pos);
      else if (k === 'ArrowUp') irPara(fileiras[Math.max(0, ri - 1)], pos);
      else if (k === 'Home') irPara(a.fileira, 0);
      else if (k === 'End') irPara(a.fileira, l.length - 1);
      else if (k === 'PageDown') irPara(fileiras[Math.min(fileiras.length - 1, ri + 3)], pos);
      else if (k === 'PageUp') irPara(fileiras[Math.max(0, ri - 3)], pos);
      else feito = false;     // Enter e Espaço: o clique nativo do botão
      if (feito) e.preventDefault();
    });
    aoOuvir(bMenos, 'click', function () { st.n = Math.max(1, st.n - 1); pintarTudo(); });
    aoOuvir(bMais, 'click', function () { st.n = Math.min(Math.max(1, st.max), st.n + 1); pintarTudo(); });
    aoOuvir(bEnc, 'click', function () { encontrar(st.n); });
    aoOuvir(sel, 'change', function () {
      var f = sel.value; if (!f) return;
      var p = porFileira[f].filter(livre)[0] || porFileira[f][0];
      st.foco = p.id; pintarTudo(); botoes[p.id].focus();
    });

    montarGrade(); selectFileiras(); legendaMontar(); pintarTudo();
    if (st.n > Math.max(1, st.max)) st.n = Math.max(1, st.max);

    return {
      el: raizA,
      atualizar: function (p) {
        p = p || {};
        var refazer = false;
        if (p.assentos) { o.assentos = p.assentos; indexar(); refazer = true; }
        if (p.escolhidos) st.escolhidos = p.escolhidos.slice();
        if (p.max != null) { st.max = p.max; if (st.n > Math.max(1, st.max)) st.n = Math.max(1, st.max); }
        if ('limiteMotivo' in p) o.limiteMotivo = p.limiteMotivo;
        if (p.preco != null) o.preco = p.preco;
        if (p.tomados) tomar(p.tomados.filter(function (i) { return !st.tomados[i]; }));
        if (refazer) { montarGrade(); selectFileiras(); }
        pintarTudo();
      },
      focar: function (i) { if (botoes[i]) { st.foco = i; pintarTudo(); botoes[i].focus(); } },
      encontrar: encontrar,
      zoom: function () { return false; },
      destruir: function () { ouvintes.forEach(function (x) { x[0].removeEventListener(x[1], x[2], x[3]); }); ouvintes = []; clearTimeout(vivoTimer); limpar(raiz); }
    };
  }

  /* =========================================================================================================== */
  /*  LISTA DE SETORES (a alternativa ao mapa: mesmo conteúdo, em tabela; cartões em quadro estreito)             */
  /* =========================================================================================================== */
  var SIT = { 'com-lugares': 'pre', poucos: 'adiado', esgotado: 'esgotado', plano: 'nao-aberto', direito: 'nao-aberto', visitante: 'encerrado', escolhido: 'venda' };   // chaves que o selo único já tem
  var SIT_ICO = { 'com-lugares': null, poucos: 'alerta', esgotado: null, plano: 'cadeado', direito: 'cadeado', visitante: 'bandeira', escolhido: 'check' };
  function montarLista(raiz, opcoes) {
    var o = opcoes || {};
    var R = mesclar(ROTULOS, o.rotulos);
    var fmt = o.formatarPreco || brl;
    var id = 'jfl' + (++uid);
    var st = { selecionado: o.selecionado || null };
    var linhas = {}, ouvintes = [];
    function aoOuvir(alvo, tipo, fn) { alvo.addEventListener(tipo, fn); ouvintes.push([alvo, tipo, fn]); }
    limpar(raiz);
    var tabela = h('div', { 'class': 'jf-lista', role: 'table', 'aria-label': R.lista });
    var cab = h('div', { role: 'row', 'class': 'jf-lista__cab' }, ['colSetor', 'colSituacao', 'colPreco', 'colPortao', 'colLugares'].map(function (c) { return h('span', { role: 'columnheader', 'class': 'jf-lista__col jf-lista__col--' + c.slice(3).toLowerCase(), texto: R[c] }); }));
    var corpo = h('div', { role: 'rowgroup', 'class': 'jf-lista__corpo' });
    tabela.appendChild(cab); tabela.appendChild(corpo);
    var envolve = h('div', { 'class': 'jf-lista-wrap' }, [tabela]);
    raiz.appendChild(envolve);
    var setores = (o.setores || []).map(function (x) { return normalizarSetor(x, R); });
    function travado(s) { if (s.escolhivel === false) return true; if (s.escolhivel === true) return false; return !!ESTADOS_TRAVADOS[s.estado || 'com-lugares']; }
    function pintar() {
      limpar(corpo); linhas = {};
      var lista = setores.filter(function (s) { return !s.oculto; }).sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
      lista.forEach(function (s) {
        var est = st.selecionado === s.id ? 'escolhido' : (s.estado || 'com-lugares');
        var trav = travado(s), trava = !!ESTADOS_TRAVADOS[s.estado || 'com-lugares'];
        var b = h('button', { type: 'button', 'class': 'jf-lista__ver', 'data-id': s.id, 'aria-pressed': st.selecionado === s.id ? 'true' : 'false', 'aria-disabled': trav ? 'true' : null, 'aria-describedby': id + '-' + s.id + '-m' });
        b.appendChild(h('span', { 'class': 'jf-lista__nome', texto: s.nome }));
        var tag = h('span', { 'class': 'tag', 'data-sit': SIT[est] });
        if (SIT_ICO[est]) tag.appendChild(icone(SIT_ICO[est], 'sit-ico'));
        tag.appendChild(document.createTextNode(R.estados[est]));
        var motivo = h('span', { 'class': 'jf-lista__motivo', id: id + '-' + s.id + '-m', texto: s.motivo || '' });
        var celNome = h('span', { role: 'rowheader', 'class': 'jf-lista__cel jf-lista__cel--setor' }, [b, motivo]);
        var celSit = h('span', { role: 'cell', 'class': 'jf-lista__cel jf-lista__cel--situacao', 'data-rotulo': R.colSituacao }, [tag]);
        var celPreco = h('span', { role: 'cell', 'class': 'jf-lista__cel jf-lista__cel--preco', 'data-rotulo': R.colPreco, texto: (!trava && s.preco != null) ? fmt(s.preco) : '—' });
        var celPortao = h('span', { role: 'cell', 'class': 'jf-lista__cel jf-lista__cel--portao', 'data-rotulo': R.colPortao, texto: (!trava && s.portao) ? s.portao.replace(/^Portão\s*/i, '') : '—' });
        var celLug = h('span', { role: 'cell', 'class': 'jf-lista__cel jf-lista__cel--lugares', 'data-rotulo': R.colLugares, texto: s.livres != null && !trava ? R.livres(s.livres) : '—' });
        var linha = h('div', { role: 'row', 'class': 'jf-lista__linha', 'data-estado': est, 'data-id': s.id, 'data-tipo': s.tipo || null }, [celNome, celSit, celPreco, celPortao, celLug]);
        corpo.appendChild(linha); linhas[s.id] = { linha: linha, b: b };
      });
    }
    aoOuvir(corpo, 'click', function (e) {
      var b = e.target.closest && e.target.closest('.jf-lista__ver'); if (!b) return;
      var i = b.getAttribute('data-id'), s = setores.filter(function (x) { return x.id === i; })[0];
      if (travado(s)) { emitir(raiz, 'jf-mapa:bloqueado', { setor: i, motivo: s.motivo || R.estados[s.estado] }); return; }
      st.selecionado = i; pintar(); if (linhas[i]) linhas[i].b.focus();
      emitir(raiz, 'jf-mapa:escolher', { setor: i }); if (o.aoEscolher) o.aoEscolher(i);
    });
    pintar();
    return {
      el: tabela,
      atualizar: function (p) { p = p || {}; if (p.setores) setores = p.setores.map(function (x) { return normalizarSetor(x, R); }); if ('selecionado' in p) st.selecionado = p.selecionado; pintar(); },
      focar: function (i) { if (linhas[i]) linhas[i].b.focus(); },
      destruir: function () { ouvintes.forEach(function (x) { x[0].removeEventListener(x[1], x[2]); }); limpar(raiz); }
    };
  }

  /* expande o bloco `assentos` do dado (cadeias de 0 e 1 por fileira) quando o M2 passa o JSON cru */
  function expandirAssentos(bloco) {
    var out = [];
    bloco.fileiras.forEach(function (f, i) {
      for (var n = 1; n <= bloco.porFileira; n++) {
        out.push({ id: f + '-' + n, fileira: f, numero: n, estado: bloco.mapa[i].charAt(n - 1) === '1' ? 'indisponivel' : 'livre', papel: bloco.pares ? (n % 2 === 1 ? 'acessivel' : 'acompanhante') : 'cadeira' });
      }
    });
    return out;
  }

  window.IngresseMapaEstadio = { versao: '1.0', montarMapa: montarMapa, montar: montarMapa, montarAssentos: montarAssentos, montarLista: montarLista, expandirAssentos: expandirAssentos, geometria: geometria, siglaDoSetor: siglaDoSetor, linhasDoCampo: linhasDoCampo, rotulos: ROTULOS, icones: ICO };
})();
