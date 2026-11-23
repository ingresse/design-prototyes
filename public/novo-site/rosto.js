/* rosto.js: M3 da jornada de compra de futebol. `window.IngresseRosto`: folha de cadastro de rosto (6 estados), estado do rosto por pessoa, banner, cartão de estado.
   Especificação: docs/produto/JORNADA-FUTEBOL-PROTOTIPO.md §3.2, §3.8 (itens 71 e 73), §4.6 · Textos: docs/conteudo/JORNADA-FUTEBOL-MICROCOPY.md (ids JF-…) · Dados: previa/dados/futebol-jornada.json (`conta`).
   Mapa de compatibilidade: docs/design/COMPATIBILIDADE-UNTITLED-UI.md, itens 71 (folha) e 73 (cartão de estado do rosto). CSS: ./rosto.css.

   ESTA CAPTURA É SIMULADA. O rosto é só um ESTADO (`cadastrado`, `pendente`, `em-analise`, `expirado`, `erro`) guardado em `jfConta` (IX.store, sessão do navegador; memória se não houver).
   A câmera do aparelho (`getUserMedia`) é opcional: o quadro NUNCA é copiado (nada de canvas, blob ou rede); ao tirar a foto o <video> congela e as trilhas são encerradas.
   Nada jurídico na folha: sem lei, termo, consentimento, LGPD, aceite, regulamento, biometria. A frase de motivo (JF-F-14) NÃO existe aqui até a Camila e o Renato validarem.

   API (contrato 4.6 + `abrir`, nome pedido pela coordenação; `abrirFolha` é o mesmo método):
     IngresseRosto.semear(perfil, params, conta?)        grava o estado inicial da conta (perfil, ?rosto=, ?deps=); só refaz quando a combinação de parâmetros muda
     IngresseRosto.estado(pessoaId)                       'cadastrado' | 'pendente' | 'em-analise' | 'expirado' | 'erro'
     IngresseRosto.marcar(pessoaId, estado, extra?)       muda o estado e emite `jf:rosto`
     IngresseRosto.abrir({ pessoa:{id,nome,tipo,idade}, estadoInicial, motivo, gatilho, facial, clube, prazo, capturaMs, validadeMs, aoConcluir(estado), aoFechar(), aoAdiar() }) → { fechar(), ir(estado, motivo), estado() }
     IngresseRosto.abrirDaUrl(opcoes?)                    lê ?rosto=, ?motivo=, ?abrir=rosto e abre a folha como o painel e os links pedem
     IngresseRosto.simular('concluir' | 'falhar' | 'expirar', motivo?)   para o painel de simulação (engrenagem) da M2
     IngresseRosto.montarBanner(el, { facial, aoMudar })  banner da etapa 1 (JF-1-04 a JF-1-09); devolve { atualizar(), destruir() }
     IngresseRosto.cartaoEstadoHtml({ estado, nome, tipo, id, acao })   marcação do cartão 73 (string)
     IngresseRosto.on(fn) / .off(fn)                      fn({ pessoaId, estado, anterior }); o mesmo evento sai no document como `jf:rosto`
     IngresseRosto.t(id, vars) · IngresseRosto.textos     textos por id (se `window.JF_TEXTOS` tiver o id, ele vence: um texto, um lugar)
   Depende de: IngresseModal (tools/previa/home/modal-uui.js). Opcionais: IX (ux.js: store e toast), IngresseQR (qr-ingresse.js). */
(function () {
  'use strict';
  if (window.IngresseRosto) return;

  /* ------------------------------------------------------------------ textos (ids do JORNADA-FUTEBOL-MICROCOPY.md; «novo» = ainda sem id da Luíza) */
  var PROPRIOS = {
    /* banner da etapa 1 */
    'JF-1-04': 'Neste jogo, você entra só com o rosto.',
    'JF-1-05': 'Para comprar, cadastre o rosto antes. Tenha em mãos um documento com foto e um celular com câmera.',
    'JF-1-06': 'Cadastrar rosto',
    'JF-1-07': 'Neste jogo, você entra só com o rosto. Você pode cadastrar agora ou depois, na Carteira.',
    'JF-1-08a': 'Cadastrar rosto',
    'JF-1-08b': 'Cadastrar depois',
    'JF-1-09': 'Rosto cadastrado',
    'JF-1-10': 'Cadastre seu rosto para comprar',
    /* folha */
    'JF-F-01t': 'Cadastre o rosto de {Nome}',
    'JF-F-01t-eu': 'Cadastre seu rosto',
    'JF-F-01': 'Você faz uma vez e vale para os próximos jogos do {clube}. Tenha em mãos um documento com foto (RG, CNH ou passaporte) e um celular com câmera.',
    'JF-F-01-sem-clube': 'Você faz uma vez e vale para os próximos jogos. Tenha em mãos um documento com foto (RG, CNH ou passaporte) e um celular com câmera.',
    'JF-F-01-btn': 'Cadastrar rosto',
    'JF-F-01-faq': 'Ver perguntas frequentes',
    'JF-F-02a': 'Abra o cadastro no celular.',
    'JF-F-02b': 'Tire a foto do rosto.',
    'JF-F-02c': 'Volte para a compra.',
    'JF-F-02-rotulo': 'Como funciona',
    'JF-F-03t': 'Aguardando o cadastro',
    'JF-F-03': 'Conclua o cadastro na aba que abrimos. Quando terminar, volte aqui.',
    'JF-F-03-btn': 'Abrir o cadastro de novo',
    'JF-F-04t': 'Rosto cadastrado',
    'JF-F-04': 'Agora você entra nos jogos só com o rosto.',
    'JF-F-04-btn': 'Voltar à compra',
    'JF-F-05t': 'Rosto já cadastrado',
    'JF-F-05': 'O rosto de {Nome} já está cadastrado. Você não precisa fazer de novo.',
    'JF-F-05-eu': 'Seu rosto já está cadastrado. Você não precisa fazer de novo.',
    'JF-F-06t': 'O tempo acabou',
    'JF-F-06': 'O cadastro precisa ser concluído em {minutos} minutos. Comece de novo: é rápido.',
    'JF-F-06-btn': 'Cadastrar de novo',
    'JF-F-07t': 'Não conseguimos cadastrar',
    'JF-F-07': 'Tente de novo. Tire a foto sem boné, sem óculos escuros e sem sombra no rosto.',
    'JF-F-07-btn': 'Tentar de novo',
    'JF-F-08a': 'Aguardando o cadastro.',
    'JF-F-08b': 'Cadastro concluído.',
    'JF-F-08c': 'O tempo acabou.',
    'JF-F-10b': 'Vou cadastrar depois',
    'JF-F-11': 'Você pode cadastrar na Carteira até {prazo}. Sem o cadastro, a entrada não é liberada.',
    'JF-F-11-sem-prazo': 'Você pode cadastrar na Carteira. Sem o cadastro, a entrada não é liberada.',
    'JF-F-13': 'Leva menos de 1 minuto e é feito no seu celular, com o seu documento.',
    'JF-F-15': 'Este rosto já está em outro ingresso para este jogo. Cada pessoa tem um ingresso por jogo.',
    'JF-F-16': 'Para tirar a foto, permita o uso da câmera.',
    'JF-F-17a': 'Não vimos um rosto na foto. Fique de frente e tente de novo.',
    'JF-F-17b': 'A foto está escura. Procure mais luz.',
    'JF-F-17c': 'Apareceu mais de uma pessoa na foto. Tire uma foto só de {Nome}.',
    'JF-C-04': '{Nome} · dependente, {idade} anos',
    /* cartão de estado do rosto (selo e frase) */
    'JF-2-06a': 'Rosto cadastrado',
    'JF-C-08b': 'Falta o rosto',
    'JF-2-10': 'Falta cadastrar o rosto de {Nome}. O ingresso só é emitido depois do cadastro.',
    'JF-2-11': 'Copiar link',
    'JF-2-12': 'Link copiado. Envie para {Nome} cadastrar o rosto.',
    'JF-2-13': '{Nome} ainda não tem conta na Ingresse. Envie o link para criar a conta e cadastrar o rosto.',
    'JF-E-12': 'Falta cadastrar o rosto de {Nome}, seu dependente.',
    /* ---- novos: ainda sem id da Luíza (listados em IngresseRosto.novos) ---- */
    'JF-N-eu-falta': 'Falta cadastrar o seu rosto.',
    'JF-N-selo-analise': 'Rosto em análise',
    'JF-N-selo-erro': 'Cadastro com erro',
    'JF-N-selo-convite': 'Convite enviado',
    'JF-N-analise': 'O cadastro do rosto de {Nome} está em análise.',
    'JF-N-analise-eu': 'O cadastro do seu rosto está em análise.',
    'JF-N-cancelar': 'Cancelar',
    'JF-N-camera-usar': 'Usar a câmera deste aparelho',
    'JF-N-camera-foto': 'Tirar foto',
    'JF-N-camera-celular': 'Continuar no celular',
    'JF-N-camera-pedindo': 'Estamos pedindo acesso à câmera.',
    'JF-N-camera-guia': 'Fique de frente, com o rosto dentro do oval e boa luz.',
    'JF-N-camera-previa': 'Prévia da câmera',
    'JF-N-camera-ausente': 'Este aparelho não tem câmera disponível. Continue pelo celular.',
    'JF-N-camera-tentar': 'Tentar de novo',
    'JF-N-qr-titulo': 'Continue no celular',
    'JF-N-qr-texto': 'Abra a câmera do celular e aponte para o código.',
    'JF-N-qr-alt': 'Código para continuar o cadastro no celular',
    'JF-N-erro-tremida': 'A foto saiu tremida. Segure o celular firme e tente de novo.',
    'JF-N-erro-coberta': 'O rosto estava coberto. Tire a foto sem boné, sem óculos escuros e sem máscara.',
    'JF-N-erro-formato': 'Não conseguimos ler a foto. Tire uma nova e tente de novo.',
    'JF-N-erro-envio': 'Não conseguimos enviar a foto. Confira a conexão e tente de novo.',
    'JF-N-erro-recusada': 'Não conseguimos aceitar a foto. Tire outra, de frente e com boa luz.'
  };
  var NOVOS = Object.keys(PROPRIOS).filter(function (k) { return /^JF-N-/.test(k); });

  function t(id, vars) {
    var ext = window.JF_TEXTOS && window.JF_TEXTOS[id]; // a M2 pode guardar um objeto {titulo, texto, botao} sob o mesmo id: aqui só vale texto simples
    var base = (typeof ext === 'string' && ext) || PROPRIOS[id] || '';
    vars = vars || {};
    return String(base)
      .replace(/\{([^{}|]+)\|([^{}]+)\}/g, function (m, a, b) { return Number(vars.n) === 1 ? a : b; })
      .replace(/\{(\w+)\}/g, function (m, k) { var v = vars[k] != null ? vars[k] : (vars[k.toLowerCase()] != null ? vars[k.toLowerCase()] : vars[k.charAt(0).toUpperCase() + k.slice(1)]); return v == null ? '' : String(v); })
      .replace(/\s+/g, ' ').trim();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ------------------------------------------------------------------ ícones (Untitled UI, 24 px, traço 2) */
  var ICO = {
    check: 'M20 6 9 17l-5-5',
    alerta: 'M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    relogio: 'M12 6v6l4 2m6-2c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    erro: 'M15 9l-6 6m0-6 6 6m7-3c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    celular: 'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-5 16h.01',
    camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    volta: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11'
  };
  function svg(d, cls) { return '<svg class="' + (cls || 'uui-ico') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>'; }

  /* ------------------------------------------------------------------ conta (jfConta): estado, nunca imagem */
  var memoria = null;
  var ouvintes = [];
  function IX() { return window.IX && window.IX.store ? window.IX : null; }
  function ler() {
    var c = IX() ? IX().store.get('jfConta', null) : memoria;
    return c && c.v === 1 ? c : null;
  }
  function gravar(c) { memoria = c; if (IX()) IX().store.set('jfConta', c); }
  function conta() {
    var c = ler();
    if (!c) { c = { v: 1, sig: '', rostos: {}, dependentes: [], convidados: {} }; gravar(c); }
    return c;
  }
  function emitir(detalhe) {
    ouvintes.slice().forEach(function (f) { try { f(detalhe); } catch (e) { /* um ouvinte quebrado não derruba os outros */ } });
    try { document.dispatchEvent(new CustomEvent('jf:rosto', { detail: detalhe })); } catch (e) {}
  }

  /* estado do dado (ok, pendente, aguardando, ja, feito, expirado, erro) -> estado interno */
  function interno(e) {
    if (e === 'ok' || e === 'ja' || e === 'feito' || e === 'cadastrado') return 'cadastrado';
    if (e === 'aguardando' || e === 'em-analise') return 'em-analise';
    if (e === 'expirado') return 'expirado';
    if (e === 'erro') return 'erro';
    return 'pendente';
  }
  /* 'c:<contato>' é «Outra pessoa» (e-mail, CPF ou passaporte): o rosto dela mora em `convidados`, não em `rostos` */
  function estado(id) {
    var c = conta();
    if (/^c:/.test(id)) { var k = (c.convidados || {})[id.slice(2)]; return k && k.rosto ? k.rosto : (k && k.conta === false ? 'pendente' : (k ? 'pendente' : 'cadastrado')); }
    var r = c.rostos[id]; return r ? r.estado : 'pendente';
  }
  function marcar(id, novo, extra) {
    var c = conta(), antes = estado(id);
    novo = interno(novo);
    if (/^c:/.test(id)) { var ct = id.slice(2); c.convidados[ct] = Object.assign({ conta: true }, c.convidados[ct] || {}, extra || {}, { rosto: novo }); }
    else c.rostos[id] = Object.assign({}, c.rostos[id] || {}, extra || {}, { estado: novo });
    gravar(c);
    if (antes !== novo) emitir({ pessoaId: id, estado: novo, anterior: antes });
  }

  function paramsDaUrl() {
    var p = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; }); } catch (e) {}
    return p;
  }
  var FALLBACK_CONTA = {
    dataDeReferencia: '2026-11-08',
    pessoa: { id: 'eu', nome: 'Pessoa E.', iniciais: 'PE' },
    rosto: { capturaSimuladaMs: 3000, validadeDaCapturaMin: 5 },
    dependentes: [
      { id: 'dep-pedro', nome: 'Pedro', nascimento: '2018-03-14', rosto: 'ok' },
      { id: 'dep-lia', nome: 'Lia', nascimento: '2020-06-02', rosto: 'pendente' },
      { id: 'dep-caio', nome: 'Caio', nascimento: '2014-02-20', rosto: 'ok' }
    ],
    contatos: [
      { email: 'ana@exemplo.test', conta: true, rosto: 'ok', nome: 'Ana' },
      { email: 'bia@exemplo.test', conta: true, rosto: 'pendente', nome: 'Bia' },
      { email: 'sem-conta@exemplo.test', conta: false, rosto: null, nome: null }
    ],
    perfis: { socio: { rosto: 'ok', deps: false }, geral: { rosto: 'pendente', deps: false }, visitante: { rosto: 'pendente', deps: false }, familia: { rosto: 'ok', deps: true }, pcd: { rosto: 'ok', deps: false } }
  };
  /* dados da Iara: window.JF_DADOS.conta (pacote da M2) ou o argumento; senão a cópia mínima acima (só para o espécime abrir sozinho) */
  function dadosDaConta(arg) { return arg || (window.JF_DADOS && window.JF_DADOS.conta) || (window.IngresseJornadaFutebol && window.IngresseJornadaFutebol.dadosConta && window.IngresseJornadaFutebol.dadosConta()) || FALLBACK_CONTA; }

  function semear(perfil, params, dadosConta) {
    params = params || paramsDaUrl();
    var d = dadosDaConta(dadosConta);
    var pf = (d.perfis && d.perfis[perfil || 'geral']) || { rosto: 'pendente', deps: false };
    var sig = [perfil || 'geral', params.rosto || '', params.deps || '', params.facial || ''].join('|');
    var c = conta();
    if (c.sig === sig) return c;
    c = { v: 1, sig: sig, rostos: {}, dependentes: [], convidados: {} };
    var eu = (d.pessoa && d.pessoa.id) || 'eu';
    c.rostos[eu] = { estado: interno(params.rosto || pf.rosto) }; // URL vence o perfil (precedência da especificação, 2.3)
    var quer = params.deps === '1' ? true : (params.deps === '0' ? false : !!pf.deps); // ?deps=1 com os três de exemplo, ?deps=0 sem nenhum (vale em qualquer perfil)
    if (quer) {
      (d.dependentes || []).forEach(function (x) {
        c.dependentes.push({ id: x.id, nome: x.nome, nascimento: x.nascimento, vinculo: x.vinculo || 'Filho(a)', semente: true });
        c.rostos[x.id] = { estado: interno(x.rosto) };
      });
    }
    (d.contatos || []).forEach(function (x) {
      c.convidados[x.email] = { conta: !!x.conta, nome: x.nome || null, rosto: x.rosto ? interno(x.rosto) : null };
    });
    c.referencia = d.dataDeReferencia || '2026-11-08';
    c.pessoa = { id: eu, nome: (d.pessoa && d.pessoa.nome) || 'Pessoa E.', iniciais: (d.pessoa && d.pessoa.iniciais) || 'PE' };
    c.capturaMs = (d.rosto && d.rosto.capturaSimuladaMs) || 3000;
    c.validadeMin = (d.rosto && d.rosto.validadeDaCapturaMin) || 5;
    gravar(c);
    return c;
  }

  /* ------------------------------------------------------------------ selo e cartão de estado do rosto (item 73) */
  var SELO = {
    cadastrado: { sit: 'rosto-ok', ico: 'check', txt: function () { return t('JF-2-06a'); } },
    falta:      { sit: 'rosto-falta', ico: 'alerta', txt: function () { return t('JF-C-08b'); } },
    'em-analise': { sit: 'rosto-analise', ico: 'relogio', txt: function () { return t('JF-N-selo-analise'); } },
    convite:    { sit: 'rosto-analise', ico: 'relogio', txt: function () { return t('JF-N-selo-convite'); } },
    erro:       { sit: 'rosto-erro', ico: 'erro', txt: function () { return t('JF-N-selo-erro'); } }
  };
  /* estado interno -> chave visual do cartão */
  function chaveVisual(e) { return e === 'cadastrado' ? 'cadastrado' : e === 'em-analise' ? 'em-analise' : e === 'erro' ? 'erro' : e === 'convite' ? 'convite' : 'falta'; }
  function seloHtml(chave, nome) {
    var s = SELO[chave] || SELO.falta;
    return '<span class="tag jf-selo" data-sit="' + s.sit + '">' + svg(ICO[s.ico], 'uui-ico sit-ico') + esc(s.txt(nome)) + '</span>';
  }
  /* cartão de estado do rosto: selo + frase + ação (.bs-sm). Nenhum botão aqui dentro de outro botão: o cartão mora ao lado do rádio, nunca dentro. */
  function cartaoEstadoHtml(o) {
    o = o || {};
    var ch = chaveVisual(o.estado), nome = o.nome || '', tipo = o.tipo || 'eu', frase = '', acao = '', acaoTxt = '', link = '';
    if (ch === 'falta' || ch === 'convite') {
      if (tipo === 'eu') frase = t('JF-N-eu-falta');
      else if (tipo === 'dependente') frase = t('JF-E-12', { Nome: nome });
      else frase = o.semConta ? t('JF-2-13', { Nome: nome }) : (ch === 'convite' ? t('JF-2-12', { Nome: nome }) : t('JF-2-10', { Nome: nome }));
      if (tipo === 'outra') { acao = 'link'; acaoTxt = t('JF-2-11'); } else { acao = 'cadastrar'; acaoTxt = t('JF-F-01-btn'); }
    } else if (ch === 'em-analise') {
      frase = tipo === 'eu' ? t('JF-N-analise-eu') : t('JF-N-analise', { Nome: nome });
    } else if (ch === 'erro') {
      frase = t('JF-F-07t') + '. ' + t('JF-F-07');
      acao = 'cadastrar'; acaoTxt = t('JF-F-07-btn');
    }
    if (o.acao === false) { acao = ''; }
    return '<div class="jf-rosto" data-estado="' + ch + '" data-tipo="' + esc(tipo) + '"' + (o.id ? ' data-pessoa="' + esc(o.id) + '"' : '') + '>' +
      seloHtml(ch, nome) +
      (frase ? '<p class="jf-rosto__t">' + esc(frase) + '</p>' : '') +
      (acao ? '<button type="button" class="bs bs-sm jf-rosto__acao" data-jf-acao="' + acao + '"' + (o.id ? ' data-pessoa="' + esc(o.id) + '"' : '') + '>' + esc(acaoTxt) + '</button>' : '') +
      '</div>';
  }

  /* ------------------------------------------------------------------ a folha (item 71) */
  var atual = null; // a folha aberta (só uma por vez)
  var contaEmbutidas = 0;

  var MOTIVOS = {
    'sem-rosto': function () { return t('JF-F-17a'); },
    escura: function () { return t('JF-F-17b'); },
    varios: function (p) { return t('JF-F-17c', { Nome: p.nome || '' }); },
    tremida: function () { return t('JF-N-erro-tremida'); },
    coberta: function () { return t('JF-N-erro-coberta'); },
    formato: function () { return t('JF-N-erro-formato'); },
    envio: function () { return t('JF-N-erro-envio'); },
    recusada: function () { return t('JF-N-erro-recusada'); },
    'outra-conta': function () { return t('JF-F-15'); }
  };
  var ESTADOS = { pendente: 'cadastrar', cadastrar: 'cadastrar', aguardando: 'aguardando', feito: 'feito', ok: 'ja', ja: 'ja', expirado: 'expirado', erro: 'erro' };

  function abrir(o) {
    o = o || {};
    if (!o.embutido && !window.IngresseModal) throw new Error('IngresseRosto: falta IngresseModal (home/modal-uui.js)');
    if (!o.embutido && atual) atual.fechar(false);
    var c0 = conta();
    var pessoa = Object.assign({ id: 'eu', nome: (c0.pessoa && c0.pessoa.nome) || 'Pessoa E.', tipo: 'eu' }, o.pessoa || {});
    var eu = pessoa.tipo === 'eu';
    var capturaMs = o.capturaMs != null ? o.capturaMs : (c0.capturaMs || 3000);
    var validadeMs = o.validadeMs != null ? o.validadeMs : (c0.validadeMin || 5) * 60000;
    var minutos = Math.round(validadeMs / 60000) || 5;
    var jg = contextoDoJogo();
    var facial = o.facial || paramsDaUrl().facial || jg.facial || 'antes';
    var inicial = ESTADOS[o.estadoInicial || 'pendente'] || 'cadastrar';
    var estadoAtual = null, motivo = o.motivo || paramsDaUrl().motivo || 'sem-rosto';
    o = Object.assign({ clube: jg.clube, prazo: undefined }, o);
    var timers = [], stream = null, camera = null, concluiu = false, fechada = false;
    var modal, corpo, rodape, anuncio, dialog;

    function limparTimers() { timers.forEach(clearTimeout); timers = []; }
    function apos(ms, fn) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function pararCamera() {
      if (stream) { try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {} }
      var v = corpo && corpo.querySelector('video');
      if (v) { try { v.srcObject = null; } catch (e) {} }
      stream = null;
    }
    function anunciar(txt) { if (anuncio) { anuncio.textContent = ''; setTimeout(function () { if (anuncio) anuncio.textContent = txt; }, 30); } }

    function botao(txt, cls, acao, extra) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = txt; b.setAttribute('data-jf-acao', acao);
      if (extra) Object.keys(extra).forEach(function (k) { b.setAttribute(k, extra[k]); });
      return b;
    }
    function link(txt, acao, href) {
      var a = document.createElement(href ? 'a' : 'button');
      if (href) { a.href = href; } else { a.type = 'button'; }
      a.className = 'linkbtn'; a.textContent = txt; a.setAttribute('data-jf-acao', acao);
      return a;
    }

    /* ---- corpo por estado ---- */
    function passosHtml() {
      var itens = [['celular', 'JF-F-02a'], ['camera', 'JF-F-02b'], ['volta', 'JF-F-02c']];
      return '<ol class="jf-passos" aria-label="' + esc(t('JF-F-02-rotulo')) + '">' + itens.map(function (i) {
        return '<li>' + svg(ICO[i[0]]) + '<span>' + esc(t(i[1])) + '</span></li>';
      }).join('') + '</ol>';
    }
    function qrHtml() {
      if (!window.IngresseQR) return '';
      return '<div class="jf-folha-qr"><div class="jf-folha-qr__txt"><strong>' + esc(t('JF-N-qr-titulo')) + '</strong><span>' + esc(t('JF-N-qr-texto')) + '</span></div>' +
        '<img class="jf-folha-qr__img" alt="' + esc(t('JF-N-qr-alt')) + '" width="160" height="160" data-jf-qr="INGRESSE-ROSTO-' + esc(pessoa.id) + '"></div>';
    }
    function preencherQr() {
      var img = corpo.querySelector('[data-jf-qr]');
      if (!img || !window.IngresseQR) return;
      var chave = 'jf-rosto-' + pessoa.id, valor = img.getAttribute('data-jf-qr');
      var uri = window.IngresseQR.uri(chave, valor);
      if (uri) img.src = uri;
      else window.IngresseQR.preparar(chave, valor).then(function (u) { if (u && img.isConnected) img.src = u; });
    }
    function tituloDe(est) {
      if (est === 'cadastrar') return eu ? t('JF-F-01t-eu') : t('JF-F-01t', { Nome: pessoa.nome });
      return t({ aguardando: 'JF-F-03t', feito: 'JF-F-04t', ja: 'JF-F-05t', expirado: 'JF-F-06t', erro: 'JF-F-07t' }[est]);
    }
    function descricaoDe() {
      if (pessoa.tipo === 'dependente') return t('JF-C-04', { Nome: pessoa.nome, idade: pessoa.idade != null ? pessoa.idade : '' }).replace(', anos', '');
      return '';
    }

    function render(est, opcoes) {
      opcoes = opcoes || {};
      limparTimers();
      if (est !== 'cadastrar' || !opcoes.camera) pararCamera();
      var anterior = estadoAtual;
      estadoAtual = est;
      camera = opcoes.camera || null;
      modal.titulo(tituloDe(est));
      modal.descricao(est === 'cadastrar' ? (o.clube ? t('JF-F-01', { clube: o.clube }) : t('JF-F-01-sem-clube')) : descricaoDe());
      if (est === 'cadastrar' && camera) modal.descricao(descricaoDe());
      var no = document.createElement('div');
      no.className = 'jf-folha__estado'; no.setAttribute('data-estado', est);
      if (camera) no.setAttribute('data-camera', camera);
      if (anterior) no.setAttribute('data-troca', '');
      var html = '';
      rodape.textContent = '';

      if (est === 'cadastrar' && !camera) {
        html += passosHtml();
        html += '<p class="jf-dica">' + esc(t('JF-F-07')).replace(/^Tente de novo\.\s*/, '') + '</p>';
        if (pessoa.tipo === 'dependente') html += '<p class="jf-apoio">' + esc(t('JF-F-13')) + '</p>';
        if (facial === 'depois') html += '<p class="jf-apoio">' + esc(o.prazo ? t('JF-F-11', { prazo: o.prazo }) : t('JF-F-11-sem-prazo')) + '</p>';
        html += qrHtml();
        no.innerHTML = html;
        var cab = document.createElement('div'); cab.className = 'jf-folha__links';
        cab.appendChild(link(t('JF-F-01-faq'), 'faq', '#'));
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) cab.appendChild(link(t('JF-N-camera-usar'), 'camera'));
        no.appendChild(cab);
        rodape.appendChild(botao(t('JF-F-01-btn'), 'bp', 'cadastrar'));
        if (facial === 'depois') rodape.appendChild(botao(t('JF-F-10b'), 'bs', 'depois'));
      } else if (est === 'cadastrar' && camera) {
        var f = camera;
        if (f === 'pedindo') {
          no.innerHTML = '<div class="jf-camera" data-fase="pedindo" role="status"><span class="spin" aria-hidden="true"></span><span>' + esc(t('JF-N-camera-pedindo')) + '</span></div>';
        } else if (f === 'ativa') {
          no.innerHTML = '<div class="jf-camera" data-fase="ativa"><video class="jf-camera__video" playsinline muted autoplay aria-label="' + esc(t('JF-N-camera-previa')) + '"></video>' +
            '<svg class="jf-camera__guia" viewBox="0 0 100 133" aria-hidden="true" focusable="false"><ellipse class="jf-camera__aro-fundo" cx="50" cy="64" rx="30" ry="40"/><ellipse class="jf-camera__aro" cx="50" cy="64" rx="30" ry="40"/></svg></div>' +
            '<p class="jf-dica">' + esc(t('JF-N-camera-guia')) + '</p>';
          var v = no.querySelector('video');
          if (v && stream) { v.srcObject = stream; var pl = v.play && v.play(); if (pl && pl.catch) pl.catch(function () {}); }
          rodape.appendChild(botao(t('JF-N-camera-foto'), 'bp', 'foto'));
          rodape.appendChild(botao(t('JF-N-camera-celular'), 'bs', 'celular'));
        } else {
          var txt = f === 'negada' ? t('JF-F-16') : t('JF-N-camera-ausente');
          no.innerHTML = '<div class="uui-alert uui-alert--warning" role="alert"><span class="uui-alert__icon">' + svg(ICO.alerta) + '</span><div class="uui-alert__body"><p class="uui-alert__text">' + esc(txt) + '</p></div></div>';
          if (f === 'negada') rodape.appendChild(botao(t('JF-N-camera-tentar'), 'bp', 'camera'));
          else rodape.appendChild(botao(t('JF-N-camera-celular'), 'bp', 'celular'));
          if (f === 'negada') rodape.appendChild(botao(t('JF-N-camera-celular'), 'bs', 'celular'));
        }
      } else if (est === 'aguardando') {
        if (estado(pessoa.id) === 'erro' || estado(pessoa.id) === 'expirado') marcar(pessoa.id, 'pendente');
        no.setAttribute('role', 'status');
        no.innerHTML = '<div class="jf-espera"><span class="spin" aria-hidden="true"></span><p>' + esc(t('JF-F-03')) + '</p></div>';
        rodape.appendChild(botao(t('JF-F-03-btn'), 'bp', 'reabrir'));
        rodape.appendChild(botao(t('JF-N-cancelar'), 'bs', 'cancelar'));
        anunciar(t('JF-F-08a'));
        apos(capturaMs, function () { ir('feito'); });
        apos(validadeMs, function () { ir('expirado'); });
      } else if (est === 'feito') {
        no.setAttribute('role', 'status');
        no.innerHTML = '<div class="jf-feito"><span class="jf-feito__selo" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><circle class="jf-feito__anel" cx="32" cy="32" r="30"/><circle class="jf-feito__fundo" cx="32" cy="32" r="29"/><path class="jf-feito__v" d="M20 33l8 8 16-17"/></svg></span><p>' + esc(t('JF-F-04')) + '</p></div>';
        rodape.appendChild(botao(t('JF-F-04-btn'), 'bp', 'voltar'));
        marcar(pessoa.id, 'cadastrado');
        concluiu = true;
        anunciar(t('JF-F-08b'));
      } else if (est === 'ja') {
        no.innerHTML = '<div class="jf-feito jf-feito--ja"><span class="jf-feito__selo" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><circle class="jf-feito__anel" cx="32" cy="32" r="30"/><circle class="jf-feito__fundo" cx="32" cy="32" r="29"/><path class="jf-feito__v" d="M20 33l8 8 16-17"/></svg></span><p>' + esc(eu ? t('JF-F-05-eu') : t('JF-F-05', { Nome: pessoa.nome })) + '</p></div>';
        rodape.appendChild(botao(t('JF-F-04-btn'), 'bp', 'voltar'));
        if (estado(pessoa.id) !== 'cadastrado') marcar(pessoa.id, 'cadastrado');
        concluiu = true;
      } else if (est === 'expirado') {
        no.innerHTML = '<p class="jf-apoio">' + esc(t('JF-F-06', { minutos: minutos, min: minutos })) + '</p>';
        rodape.appendChild(botao(t('JF-F-06-btn'), 'bp', 'cadastrar'));
        marcar(pessoa.id, 'expirado');
        anunciar(t('JF-F-08c'));
      } else if (est === 'erro') {
        no.setAttribute('role', 'alert');
        var causa = (MOTIVOS[motivo] || MOTIVOS['sem-rosto'])(pessoa);
        no.innerHTML = '<p class="jf-apoio jf-apoio--causa" data-motivo="' + esc(motivo) + '">' + esc(causa) + '</p><p class="jf-dica">' + esc(t('JF-F-07')) + '</p>';
        rodape.appendChild(botao(t('JF-F-07-btn'), 'bp', 'cadastrar'));
        marcar(pessoa.id, 'erro', { motivo: motivo });
      }

      corpo.querySelectorAll('.jf-folha__estado').forEach(function (n) { n.remove(); });
      corpo.appendChild(no);
      rodape.hidden = !rodape.children.length;
      if (est === 'cadastrar' && !camera) { preencherQr(); if (estado(pessoa.id) === 'expirado' || estado(pessoa.id) === 'erro') marcar(pessoa.id, 'pendente'); }
      if (anterior) { var h = dialog.querySelector('.uui-modal__titulo'); if (h) h.focus({ preventScroll: true }); }
    }

    function ir(est, mot) {
      if (fechada) return;
      if (mot) motivo = mot;
      render(ESTADOS[est] || est);
    }

    function abrirCamera() {
      var md = navigator.mediaDevices;
      render('cadastrar', { camera: 'pedindo' });
      if (!md || !md.getUserMedia) { render('cadastrar', { camera: 'indisponivel' }); return; }
      var p;
      try { p = md.getUserMedia({ video: { facingMode: 'user' }, audio: false }); } catch (e) { render('cadastrar', { camera: 'indisponivel' }); return; }
      p.then(function (s) {
        if (fechada || estadoAtual !== 'cadastrar' || camera !== 'pedindo') { s.getTracks().forEach(function (tr) { tr.stop(); }); return; }
        stream = s; render('cadastrar', { camera: 'ativa' });
      }, function (e) {
        if (fechada) return;
        var n = e && e.name;
        render('cadastrar', { camera: (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'NotReadableError' || n === 'OverconstrainedError') ? 'indisponivel' : 'negada' });
      });
    }

    function acao(a, gatilho) {
      if (a === 'cadastrar') ir('aguardando');
      else if (a === 'reabrir') ir('aguardando');
      else if (a === 'cancelar') ir('cadastrar');
      else if (a === 'celular') ir('aguardando');
      else if (a === 'camera') abrirCamera();
      else if (a === 'foto') {
        /* captura SIMULADA: congela o quadro no próprio <video> (nada é copiado) e encerra as trilhas */
        var v = corpo.querySelector('video');
        if (v) { try { v.pause(); } catch (e) {} }
        apos(450, function () { pararCamera(); ir('aguardando'); });
      } else if (a === 'depois') { if (o.aoAdiar) o.aoAdiar(pessoa); handle.fechar(true); }
      else if (a === 'voltar') handle.fechar(true);
    }

    function aoFecharFolha() {
      fechada = true; limparTimers(); pararCamera();
      if (estadoAtual === 'aguardando') marcar(pessoa.id, 'pendente'); // fechou no meio da espera: a captura não foi concluída
      if (!embutida && atual === handle) atual = null;
      if (o.aoFechar) o.aoFechar(estado(pessoa.id));
      if (concluiu && o.aoConcluir) o.aoConcluir(estado(pessoa.id));
    }
    function montarFolha(c) {
      modal = c; dialog = c.dialog; corpo = c.corpo; rodape = c.rodape;
      dialog.classList.add('jf-folha'); rodape.classList.add('jf-folha__rodape');
      anuncio = document.createElement('div'); anuncio.className = 'sr-only'; anuncio.setAttribute('role', 'status'); anuncio.setAttribute('aria-live', 'polite');
      corpo.appendChild(anuncio);
      corpo.classList.add('jf-folha__corpo');
      dialog.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-jf-acao]');
        if (!b || !dialog.contains(b)) return;
        if (b.getAttribute('data-jf-acao') === 'faq') return; // link sem destino: o ux.js do protótipo avisa
        e.preventDefault(); acao(b.getAttribute('data-jf-acao'), b);
      });
      if (o.cameraInicial && inicial === 'cadastrar') render('cadastrar', { camera: o.cameraInicial });
      else render(inicial);
    }
    var embutida = !!o.embutido;
    if (embutida) {
      /* a mesma folha dentro da página (espécime, teste e capturas): sem véu, sem foco preso, sem entrada animada */
      var uid = 'jf-rosto-emb-' + (++contaEmbutidas);
      var d = document.createElement('div'); d.className = 'uui-modal__dialog jf-folha-embutida'; d.setAttribute('role', 'group'); d.setAttribute('aria-labelledby', uid + '-t');
      d.innerHTML = '<div class="uui-modal__cab"><div class="uui-modal__txt"><h2 class="uui-modal__titulo" id="' + uid + '-t" tabindex="-1"></h2><p class="uui-modal__descricao" hidden></p></div></div><div class="uui-modal__corpo"></div><div class="uui-modal__rodape"></div>';
      var tit = d.querySelector('h2'), desc = d.querySelector('p');
      o.embutido.textContent = ''; o.embutido.appendChild(d);
      montarFolha({ el: d, dialog: d, corpo: d.querySelector('.uui-modal__corpo'), rodape: d.querySelector('.uui-modal__rodape'),
        titulo: function (x) { tit.textContent = x; }, descricao: function (x) { desc.textContent = x; desc.hidden = !x; }, fechar: function () { aoFecharFolha(); d.remove(); } });
    } else {
      window.IngresseModal.abrir({ id: 'jf-rosto', titulo: '', classe: 'jf-folha-modal', gatilho: o.gatilho, gatilhoSeletor: o.gatilhoSeletor, aoFechar: aoFecharFolha, montar: montarFolha });
    }
    var handle = {
      fechar: function (devolverFoco) { modal.fechar(devolverFoco !== false); },
      ir: ir, estado: function () { return estadoAtual; }, pessoa: pessoa, el: modal && modal.el
    };
    if (!embutida) atual = handle;
    return handle;
  }

  /* o que a M2 sabe do jogo (IngresseJornadaFutebol), sem depender dela: tudo opcional */
  function contextoDoJogo() {
    var J = window.IngresseJornadaFutebol, r = {};
    try { if (J && J.jogo) r.clube = (J.jogo() || {}).mandante; if (J && J.config) r.facial = (J.config() || {}).facial; } catch (e) {}
    return r;
  }

  function simular(a, mot) {
    if (!atual) return false;
    if (a === 'concluir') atual.ir('feito');
    else if (a === 'falhar') atual.ir('erro', mot || 'sem-rosto');
    else if (a === 'expirar') atual.ir('expirado');
    else return false;
    return true;
  }

  function abrirDaUrl(o) {
    var p = paramsDaUrl();
    if (p.abrir !== 'rosto') return null;
    return abrir(Object.assign({ estadoInicial: p.rosto || 'pendente', motivo: p.motivo || undefined, facial: p.facial || undefined }, o || {}));
  }

  /* ------------------------------------------------------------------ banner da etapa 1 (JF-1-04 a JF-1-09) */
  function montarBanner(el, o) {
    o = o || {};
    var vivo = true;
    function desenhar() {
      if (!vivo) return;
      var facial = o.facial || 'antes', est = estado(o.pessoaId || 'eu');
      el.textContent = '';
      if (facial === 'nao') return;
      if (est === 'cadastrado') {
        var p = document.createElement('p'); p.className = 'jf-banner jf-banner--ok';
        p.innerHTML = seloHtml('cadastrado');
        el.appendChild(p); return;
      }
      var box = document.createElement('div');
      box.className = 'uui-alert jf-banner'; box.setAttribute('data-facial', facial);
      var depois = facial === 'depois';
      box.innerHTML = '<span class="uui-alert__icon">' + svg(ICO.alerta) + '</span><div class="uui-alert__body">' +
        '<p class="uui-alert__title">' + esc(t('JF-1-04')) + '</p>' +
        '<p class="uui-alert__text">' + esc(depois ? t('JF-1-07').replace(t('JF-1-04'), '').trim() : t('JF-1-05')) + '</p>' +
        '<div class="uui-alert__actions"><button type="button" class="bs bs-sm" data-jf-acao="cadastrar">' + esc(t('JF-1-06')) + '</button>' +
        (depois ? '<button type="button" class="linkbtn" data-jf-acao="depois">' + esc(t('JF-1-08b')) + '</button>' : '') + '</div></div>';
      el.appendChild(box);
    }
    function clique(e) {
      var b = e.target.closest && e.target.closest('[data-jf-acao]');
      if (!b || !el.contains(b)) return;
      if (b.getAttribute('data-jf-acao') === 'cadastrar') {
        abrir({ pessoa: { id: o.pessoaId || 'eu', tipo: 'eu' }, gatilho: b, facial: o.facial, clube: o.clube, prazo: o.prazo, aoConcluir: function () { desenhar(); if (o.aoMudar) o.aoMudar(); }, aoAdiar: function () { if (o.aoAdiar) o.aoAdiar(); } });
      } else if (b.getAttribute('data-jf-acao') === 'depois') { if (o.aoAdiar) o.aoAdiar(); }
    }
    el.addEventListener('click', clique);
    ouvintes.push(desenhar);
    desenhar();
    return { atualizar: desenhar, destruir: function () { vivo = false; el.removeEventListener('click', clique); var i = ouvintes.indexOf(desenhar); if (i >= 0) ouvintes.splice(i, 1); el.textContent = ''; } };
  }

  window.IngresseRosto = {
    versao: '1.0', t: t, textos: PROPRIOS, novos: NOVOS, esc: esc, svg: svg, icones: ICO,
    semear: semear, estado: estado, marcar: marcar, conta: conta, dadosDaConta: dadosDaConta, lerParametros: paramsDaUrl,
    abrir: abrir, abrirFolha: abrir, abrirDaUrl: abrirDaUrl, simular: simular, aberta: function () { return atual; },
    montarBanner: montarBanner, cartaoEstadoHtml: cartaoEstadoHtml, seloHtml: seloHtml, chaveVisual: chaveVisual, interno: interno,
    on: function (f) { if (ouvintes.indexOf(f) < 0) ouvintes.push(f); }, off: function (f) { var i = ouvintes.indexOf(f); if (i >= 0) ouvintes.splice(i, 1); },
    _guardar: gravar
  };
})();
