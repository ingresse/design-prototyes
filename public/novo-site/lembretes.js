/* lembretes.js: relógio do protótipo, abertura de venda, lembretes "Me avisar quando abrir" e o sino do menu (pedido do Wander, 27/10/2026; Mariana).
   Fonte: tools/previa/lembretes.js; o gerador (tools/previa/lembretes.mjs) copia para previa/lembretes.js. Uma implementação só, para a Coleção (turnê),
   o Evento, o menu de todas as telas e, mais tarde, a página de confronto de futebol (aberturas por janela, EP-17): quem precisa de uma abertura de
   venda chama IngresseLembretes.abertura(...) e desenha o bloco `.ab` (tools/previa/lembretes.mjs, blocoAbertura).

   REGRAS (vindas da LP "Ensaios da Anitta", traduzidas para o nosso padrão; docs/produto/PAGINA-DE-TURNE.md):
   1. A abertura é um INSTANTE absoluto (ISO com fuso), igual para todo mundo; a hora é mostrada sempre no horário de Brasília, nunca no relógio do aparelho.
   2. O que o cartão MOSTRA (`anunciadoEm`, quando difere) pode ser diferente do que LIBERA o botão (`abreEm`): a promessa pública não muda quando a operação adianta.
   3. O botão "Ver ingressos" liga SOZINHO no horário: tudo é função do relógio, e a página se refaz a cada segundo (1 s no protótipo; a LP checa a cada minuto).
   4. `antecipaMs`: o botão libera 5 min ANTES do horário anunciado (ANTECIPA_MS), como na LP, por pedido da operação (decisão do Wander, 28/10/2026). O cartão segue mostrando o horário
      anunciado (a promessa pública não muda). Quem deriva a abertura do servidor (futebol: `futebol:`; inscrições esportivas: `esporte:`) fica de fora: SEM_ANTECIPACAO.

   RELÓGIO DO PROTÓTIPO: começa em 28/10/2026 10h (Brasília) e anda em tempo real; a engrenagem de cada tela o muda ("Agora", "+1 min", "Faltar 10 s", "Abrir").
   O deslocamento fica em IX.store ('relogio') e vale para todas as telas da mesma aba.

   LEMBRETES: IX.store ('lembretes'), lista de { id, evento, praca, abreEm, anunciadoEm, href, canal: 'whatsapp' | 'email', destino, criadoEm }. Sessão da aba, como o resto do
   IX.store; com conta de verdade vira registro no servidor. Conta: IX.store ('conta'); ausente = com conta (e-mail e WhatsApp cadastrados); false = sem conta.
   CANAL (decisão do Wander, 28/10/2026): WhatsApp primeiro (telefone SEMPRE internacional, com o seletor de país do checkout); depois o app (em breve); e-mail como alternativa.
   Quem não tem conta informa o contato uma vez na folha (IX.store 'contato') e os próximos avisos são de um toque.
   NOVAS do sino (IX.store 'sinoVistos'): a bolinha do sino conta as vendas que abriram e a pessoa ainda não viu; zera ao abrir o painel.
   Eventos no document: "previa:lembretes" (detail.tipo: criado, removido, abriu, relogio, conta, limpou). As telas se refazem com ele.

   Ganchos de tagueamento (sem analytics, só marcação): data-track-lembrete="criar|remover" no botão e no painel, data-track-sino="abrir". Tabela em docs/produto/PAGINA-DE-TURNE.md. */
(function () {
  if (window.IngresseLembretes) return; // o motor de templates pode executar o <script> da helmet duas vezes

  var LIMITE_COMPACTO = 4; // acima disto a lista do painel usa o item compacto
  var DEMO_INICIO = Date.parse('2026-10-28T10:00:00-03:00');
  var TZ = 'America/Sao_Paulo';
  var ANTECIPA_MS = 5 * 60 * 1000; // o botão libera 5 min antes do horário anunciado (LP "Ensaios da Anitta"; decisão do Wander)
  var SEM_ANTECIPACAO = ['futebol:', 'esporte:']; // a abertura vem do servidor: o botão libera no instante real
  var root = document.documentElement;

  /* ---------- armazenamento: IX.store (ux.js); sem ele, memória ---------- */
  var memoria = {};
  var store = {
    get: function (k, f) { if (window.IX && IX.store) return IX.store.get(k, f); return k in memoria ? memoria[k] : f; },
    set: function (k, v) { if (window.IX && IX.store) IX.store.set(k, v); else memoria[k] = v; }
  };
  function emitir(tipo, extra) {
    try { document.dispatchEvent(new CustomEvent('previa:lembretes', { detail: Object.assign({ tipo: tipo }, extra || {}) })); } catch (e) {}
  }

  /* ---------- relógio ---------- */
  function desloc() {
    var v = store.get('relogio', null);
    if (v && typeof v.d === 'number') return v.d;
    var d = DEMO_INICIO - Date.now();
    store.set('relogio', { d: d });
    return d;
  }
  function agora() { return Date.now() + desloc(); }
  var relogio = {
    agora: agora,
    reiniciar: function () { store.set('relogio', { d: DEMO_INICIO - Date.now() }); emitir('relogio'); },
    avancar: function (ms) { store.set('relogio', { d: desloc() + ms }); emitir('relogio'); },
    ajustarPara: function (instanteMs) { store.set('relogio', { d: instanteMs - Date.now() }); emitir('relogio'); }
  };

  /* ---------- texto de data e de contagem (sempre em Brasília) ---------- */
  var fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  function momento(ms) {
    var p = fmt.formatToParts(new Date(ms));
    var g = function (t) { var x = p.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
    var lm = function (s) { return s.replace('.', ''); };
    var wd = lm(g('weekday')), h = String(Number(g('hour'))), m = g('minute');
    return wd.charAt(0).toUpperCase() + wd.slice(1) + ' ' + g('day') + ' ' + lm(g('month')) + ' · ' + (m === '00' ? h + 'h' : h + 'h' + m);
  }
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function faltam(ms) {
    if (ms <= 0) return '';
    var d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    if (d >= 2) return 'em ' + d + ' dias';
    if (d === 1) return h ? 'em 1 dia e ' + h + ' h' : 'em 1 dia';
    if (ms >= 36e5) return 'em ' + h + ' h' + (m ? ' ' + m + ' min' : '');
    if (ms >= 6e4) return 'em ' + m + ' min ' + dois(s) + ' s';
    return 'em ' + Math.max(1, s) + ' s';
  }

  /* ---------- telefone internacional (o MESMO do checkout: bandeira, DDI e nome do país; paises.json e ./assets/flags) ---------- */
  var PAISES = [{"c": "BR", "ddi": "55", "nome": "Brasil", "g": [2, 5, 4]}, {"c": "DE", "ddi": "49", "nome": "Alemanha", "g": [3, 4, 4]}, {"c": "AO", "ddi": "244", "nome": "Angola", "g": [3, 3, 3]}, {"c": "AR", "ddi": "54", "nome": "Argentina", "g": [2, 4, 4]}, {"c": "AU", "ddi": "61", "nome": "Austrália", "g": [3, 3, 3]}, {"c": "BO", "ddi": "591", "nome": "Bolívia", "g": [4, 4]}, {"c": "CV", "ddi": "238", "nome": "Cabo Verde", "g": [3, 2, 2]}, {"c": "CA", "ddi": "1", "nome": "Canadá", "g": [3, 3, 4]}, {"c": "CL", "ddi": "56", "nome": "Chile", "g": [1, 4, 4]}, {"c": "CN", "ddi": "86", "nome": "China", "g": [3, 4, 4]}, {"c": "CO", "ddi": "57", "nome": "Colômbia", "g": [3, 3, 4]}, {"c": "EC", "ddi": "593", "nome": "Equador", "g": [2, 3, 4]}, {"c": "ES", "ddi": "34", "nome": "Espanha", "g": [3, 3, 3]}, {"c": "US", "ddi": "1", "nome": "Estados Unidos", "g": [3, 3, 4]}, {"c": "FR", "ddi": "33", "nome": "França", "g": [1, 2, 2, 2, 2]}, {"c": "IN", "ddi": "91", "nome": "Índia", "g": [5, 5]}, {"c": "IE", "ddi": "353", "nome": "Irlanda", "g": [2, 3, 4]}, {"c": "IL", "ddi": "972", "nome": "Israel", "g": [2, 3, 4]}, {"c": "IT", "ddi": "39", "nome": "Itália", "g": [3, 3, 4]}, {"c": "JP", "ddi": "81", "nome": "Japão", "g": [2, 4, 4]}, {"c": "MX", "ddi": "52", "nome": "México", "g": [2, 4, 4]}, {"c": "MZ", "ddi": "258", "nome": "Moçambique", "g": [2, 3, 4]}, {"c": "NL", "ddi": "31", "nome": "Países Baixos", "g": [1, 4, 4]}, {"c": "PY", "ddi": "595", "nome": "Paraguai", "g": [3, 3, 3]}, {"c": "PE", "ddi": "51", "nome": "Peru", "g": [3, 3, 3]}, {"c": "PT", "ddi": "351", "nome": "Portugal", "g": [3, 3, 3]}, {"c": "GB", "ddi": "44", "nome": "Reino Unido", "g": [4, 6]}, {"c": "CH", "ddi": "41", "nome": "Suíça", "g": [2, 3, 2, 2]}, {"c": "TR", "ddi": "90", "nome": "Turquia", "g": [3, 3, 4]}, {"c": "UY", "ddi": "598", "nome": "Uruguai", "g": [2, 3, 3]}, {"c": "VE", "ddi": "58", "nome": "Venezuela", "g": [3, 3, 4]}];
  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function paisPor(c) { for (var i = 0; i < PAISES.length; i++) if (PAISES[i].c === c) return PAISES[i]; return PAISES[0]; }
  function maxNac(p) { return p.g.reduce(function (a, b) { return a + b; }, 0); }
  function fmtNac(p, d) {
    d = d.slice(0, maxNac(p));
    if (p.c === 'BR') { var g = d.length > 10 ? [2, 5, 4] : [2, 4, 4]; var a = d.slice(0, g[0]), b = d.slice(g[0], g[0] + g[1]), c = d.slice(g[0] + g[1]); return [a, b && (c ? b + '-' + c : b)].filter(Boolean).join(' '); }
    var out = [], i = 0; for (var k = 0; k < p.g.length; k++) { if (i >= d.length) break; out.push(d.slice(i, i + p.g[k])); i += p.g[k]; } return out.join(' ');
  }
  function fmtTel(p, nac) { return nac ? '+' + p.ddi + ' ' + fmtNac(p, nac) : ''; }
  function exTel(p) { var d = '1234567890123'.slice(0, maxNac(p)); return '+' + p.ddi + ' ' + (p.c === 'BR' ? '11 91234-5678' : fmtNac(p, d)); }
  function ddiDe(d, atual) { // país pelo DDI digitado; o atual vence se o DDI for o mesmo (+1 vale para EUA e Canadá)
    if (d.indexOf(atual.ddi) === 0) return atual;
    var melhor = null; PAISES.forEach(function (x) { if (d.indexOf(x.ddi) === 0 && (!melhor || x.ddi.length > melhor.ddi.length || (x.ddi === melhor.ddi && x.c === 'US'))) melhor = x; }); return melhor;
  }
  function nacDe(v, p) { var d = digits(v); return d.indexOf(p.ddi) === 0 ? d.slice(p.ddi.length) : d; }
  function lerTel(raw, atual) { // com "+", o DDI define o país; sem "+", são números do país já escolhido
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
  function telOk(v, p) { return nacDe(v, p).length >= (p.c === 'BR' ? 10 : maxNac(p)); }
  function mascararTel(t) { var d = digits(t), m = /^\+\d+/.exec(t || ''); return d.length < 6 ? (t || '') : (m ? m[0] + ' ' : '') + '***** ' + d.slice(-4); }

  /* ---------- lembretes ---------- */
  var registro = {}; // id -> item (as telas registram o que podem avisar; o botão só carrega o id)
  function lista() { var l = store.get('lembretes', []); return Array.isArray(l) ? l : []; }
  function gravar(l) { store.set('lembretes', l); }
  function tem(id) { return lista().some(function (x) { return x.id === id; }); }
  function antecipaDe(item) {
    if (item.antecipaMs != null) return item.antecipaMs;
    var id = item.id || '';
    for (var i = 0; i < SEM_ANTECIPACAO.length; i++) if (id.indexOf(SEM_ANTECIPACAO[i]) === 0) return 0;
    return ANTECIPA_MS;
  }
  function liberaEm(item) { return Date.parse(item.abreEm) - antecipaDe(item); }
  function abertoAgora(item) { return agora() >= liberaEm(item); }

  /* contato: com conta, o cadastro (WhatsApp e e-mail); sem conta, o que a pessoa informou na folha (uma vez) */
  var TEL_CONTA = '+55 11 91234-5678';
  function conta() { var v = store.get('conta', undefined); if (v === false) return null; return v && v.email ? { email: v.email, telefone: v.telefone || TEL_CONTA } : { email: 'pessoa@exemplo.com', telefone: TEL_CONTA }; }
  function contato() { var c = store.get('contato', null); return c && typeof c === 'object' ? c : {}; }
  function destinoPadrao() {
    var c = conta();
    if (c) return c.telefone ? { canal: 'whatsapp', destino: c.telefone } : { canal: 'email', destino: c.email };
    var k = contato();
    if (k.whatsapp) return { canal: 'whatsapp', destino: k.whatsapp };
    if (k.email) return { canal: 'email', destino: k.email };
    return null;
  }
  function mascarar(email) {
    var i = (email || '').indexOf('@');
    return i < 2 ? (email || '') : email.slice(0, 2) + '***' + email.slice(i);
  }
  function viaTexto(it) {
    var canal = it.canal || 'email', dest = it.destino || it.email || '';
    return canal === 'whatsapp' ? 'Aviso por WhatsApp' + (dest ? ' para ' + mascararTel(dest) : '') : 'Aviso por e-mail' + (dest ? ' para ' + mascarar(dest) : '');
  }
  function noCanal(canal) { return canal === 'whatsapp' ? 'no WhatsApp' : 'por e-mail'; }

  function criar(item) {
    var d = item.canal && item.destino ? { canal: item.canal, destino: item.destino } : item.email ? { canal: 'email', destino: item.email } : (destinoPadrao() || { canal: 'whatsapp', destino: TEL_CONTA });
    var l = lista().filter(function (x) { return x.id !== item.id; });
    var novo = { id: item.id, evento: item.evento, praca: item.praca || '', abreEm: item.abreEm, anunciadoEm: item.anunciadoEm || '', href: item.href || 'Evento.dc.html', canal: d.canal, destino: d.destino, criadoEm: new Date(agora()).toISOString() };
    if (item.antecipaMs != null) novo.antecipaMs = item.antecipaMs;
    l.push(novo);
    gravar(l);
    sabidosAbertos[item.id] = abertoAgora(item);
    emitir('criado', { id: item.id });
  }
  function remover(id) {
    var l = lista(), achado = null;
    var novo = l.filter(function (x) { if (x.id === id) achado = x; return x.id !== id; });
    gravar(novo);
    delete sabidosAbertos[id];
    emitir('removido', { id: id });
    return achado;
  }

  /* NOVAS do sino: vendas que abriram e a pessoa ainda não viu (zera ao abrir o painel) */
  function vistos() { var v = store.get('sinoVistos', []); return Array.isArray(v) ? v : []; }
  function novasLista() { var v = vistos(); return lista().filter(function (x) { return abertoAgora(x) && v.indexOf(x.id) < 0; }); }
  function marcarVistos() { // vistos = o que está aberto agora (o relógio que volta tira da lista)
    var ab = lista().filter(abertoAgora).map(function (x) { return x.id; }), v = vistos();
    if (ab.length === v.length && ab.every(function (x) { return v.indexOf(x) >= 0; })) return;
    store.set('sinoVistos', ab);
  }
  function podarVistos() { var ab = lista().filter(abertoAgora).map(function (x) { return x.id; }), v = vistos(), n = v.filter(function (x) { return ab.indexOf(x) >= 0; }); if (n.length !== v.length) store.set('sinoVistos', n); }

  /* abertura(opts): tudo que o bloco `.ab` precisa, a partir do relógio. opts: id, evento, praca, abreEm, anunciadoEm?, antecipaMs?, href */
  function abertura(o) {
    var t = o.agora != null ? o.agora : agora();
    var abre = Date.parse(o.abreEm), anunc = o.anunciadoEm ? Date.parse(o.anunciadoEm) : abre;
    var ant = antecipaDe(o), libera = abre - ant;
    var aberto = t >= libera;
    var itemOn = lista().filter(function (x) { return x.id === o.id; })[0], on = !!itemOn;
    if (o.id) registro[o.id] = { id: o.id, evento: o.evento, praca: o.praca, abreEm: o.abreEm, anunciadoEm: o.anunciadoEm, antecipaMs: o.antecipaMs, href: o.href };
    return {
      id: o.id, aberto: aberto, aguardando: !aberto, estado: aberto ? 'aberto' : 'aguardando', libera: libera, antecipaMs: ant,
      iso: new Date(anunc).toISOString(), quando: momento(anunc), rotulo: 'A venda abre',
      falta: aberto ? '' : faltam(anunc - t), temFalta: !aberto && anunc - t > 0,
      avisarRotulo: on ? 'Aviso ativado' : 'Me avisar quando abrir', avisarPressed: on ? 'true' : 'false', avisarAtivo: on, avisarClasse: on ? 'bs-ink' : '', // ativado = variante preta do botão secundário (.bs-ink, a mesma de "Chamar a galera")
      avisarNome: (on ? 'Aviso ativado' : 'Me avisar quando abrir') + (o.praca ? ': ' + o.praca : ''),
      canal: itemOn ? itemOn.canal || 'email' : '', avisoNota: on ? 'Aviso ativado. Avisamos você ' + noCanal(itemOn.canal || 'email') + ' quando a venda abrir.' : '',
      href: o.href || 'Evento.dc.html'
    };
  }

  /* ---------- toast com ação (IX.toast ganhou o 4º argumento em previa.js) ---------- */
  function toast(msg, kind, titulo, acao) { if (window.IX && IX.toast) IX.toast(msg, kind, titulo, acao); }

  /* o nome da venda no toast: a praça do show («São Paulo»); no jogo e na prova, o jogo e a janela («Bahia x Fortaleza, Sócio Ouro · Prioridade 1»), nunca o nome da janela solto */
  function nomeDaVenda(item) {
    if (!item) return '';
    if (/^(futebol|esporte):/.test(String(item.id || '')) && item.evento) return item.evento + (item.praca ? ' (' + item.praca + ')' : '');
    return item.praca || '';
  }
  /* ---------- criar e desfazer ---------- */
  function ativar(item, gatilho) {
    var d = destinoPadrao();
    if (d) { confirmarCriar(item, d.canal, d.destino); return; } // conta, ou contato já informado: um toque
    abrirFolha({ item: item, gatilho: gatilho });
  }
  function confirmarCriar(item, canal, destino) {
    criar(Object.assign({}, item, { canal: canal, destino: destino }));
    toast('Avisamos ' + noCanal(canal) + ' quando a venda' + (nomeDaVenda(item) ? ' de ' + nomeDaVenda(item) : '') + ' abrir.', 'ok', 'Aviso ativado', { rotulo: 'Desfazer', fn: function () { remover(item.id); } });
  }
  function desativar(id) {
    var r = remover(id);
    if (!r) return;
    toast((nomeDaVenda(r) ? nomeDaVenda(r) + ': a' : 'A') + 'viso removido.', 'info', null, { rotulo: 'Desfazer', fn: function () { criar(r); } });
  }
  function alternar(item, gatilho) { if (tem(item.id)) desativar(item.id); else ativar(item, gatilho); }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-lembrete-id]') : null;
    if (!t) return;
    var id = t.getAttribute('data-lembrete-id');
    if (!id) return;
    e.preventDefault();
    e.stopPropagation(); // o toast genérico do ux.js e a transição entre telas não veem este clique
    var item = registro[id];
    if (item) alternar(item, t);
  }, true);

  /* ---------- DOM ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function icone(d, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ico ' + (cls || '')); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p);
    return s;
  }
  var D = {
    x: 'M18 6 6 18M6 6l12 12',
    trash: 'M16 6v-.8c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C14.48 2 13.92 2 12.8 2h-1.6c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C8 3.52 8 4.08 8 5.2V6M3 6h18m-2 0v11.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C16.72 22 15.88 22 14.2 22H9.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C5 19.72 5 18.88 5 17.2V6m5 5.5v5m4-5v5',
    check: 'M20 6 9 17l-5-5',
    chev: 'm6 9 6 6 6-6',
    mail: 'm2 7 8.165 5.715c.661.463.992.695 1.351.784a2 2 0 0 0 .968 0c.36-.09.69-.32 1.351-.784L22 7M6.8 20h10.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 17.72 22 16.88 22 15.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C19.72 4 18.88 4 17.2 4H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.28 2 7.12 2 8.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C4.28 20 5.12 20 6.8 20Z',
    // WhatsApp (provisório: balão de conversa) e App (celular): ícones estáticos de passagem; o Bessa escolhe os definitivos
    chat: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z',
    app: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM12 18h.01',
    bell: 'M9.354 21c.705.622 1.632 1 2.646 1s1.94-.378 2.646-1M18 8A6 6 0 1 0 6 8c0 3.09-.78 5.206-1.65 6.605-.735 1.18-1.102 1.771-1.089 1.936.015.182.054.252.2.36.133.099.732.099 1.928.099H18.61c1.196 0 1.795 0 1.927-.098.147-.11.186-.179.2-.361.014-.165-.353-.755-1.088-1.936C18.78 13.206 18 11.09 18 8Z'
  };
  var ICONE_CANAL = { whatsapp: D.chat, email: D.mail, app: D.app };
  var FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
  function reduzido() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; }
  function duracaoSaida(folha) { if (reduzido()) return 0; var v = parseFloat(getComputedStyle(root).getPropertyValue(folha ? '--motion-duration-fast' : '--motion-duration-instant')); return isNaN(v) ? (folha ? 160 : 80) : v; } // popover sai em 80 ms (instant), folha em 160 ms (fast)

  /* camada flutuante (painel do sino e folha do aviso): mora no <html>, fora do <body>, como o menu da conta e o seletor de cidade.
     Entra e sai com movimento (tokens motion.*; lembretes.css); com movimento reduzido some e aparece sem animar. */
  var camada = null, telAtual = null;
  function remover2(no) { if (no && no.parentNode) no.remove(); }
  function fecharCamada(devolverFoco) {
    if (!camada) return;
    var c = camada; camada = null; telAtual = null;
    if (c.timer) clearInterval(c.timer);
    document.removeEventListener('keydown', c.teclas, true);
    document.removeEventListener('click', c.fora, true);
    var d = duracaoSaida(c.no.getAttribute('data-modo') === 'folha' || !!c.scrim);
    no_sair(c.no, d); if (c.scrim) no_sair(c.scrim, d);
    if (c.gatilho) { c.gatilho.setAttribute('aria-expanded', 'false'); c.gatilho.removeAttribute('aria-controls'); if (devolverFoco !== false && document.contains(c.gatilho)) c.gatilho.focus(); }
    if (c.aoFechar) c.aoFechar();
  }
  function no_sair(no, d) {
    if (!d) { remover2(no); return; }
    no.removeAttribute('id'); no.setAttribute('data-saindo', 'true'); no.setAttribute('aria-hidden', 'true');
    setTimeout(function () { remover2(no); }, d + 20);
  }
  function ehFolha() { return window.matchMedia && matchMedia('(max-width: 640px)').matches; }
  function abrirCamada(o) {
    fecharCamada(false);
    var folha = ehFolha(), modal = o.modal || folha; // folha = celular; modal = com cortina (a folha do aviso é modal também no desktop)
    var no = el('div', 'sino-pop' + (o.classe ? ' ' + o.classe : ''));
    no.id = o.id;
    no.setAttribute('role', 'dialog');
    no.setAttribute('aria-label', o.rotulo);
    if (modal) no.setAttribute('aria-modal', 'true');
    no.setAttribute('data-modo', folha ? 'folha' : 'popover');
    no.setAttribute('tabindex', '-1');
    var c = { no: no, gatilho: o.gatilho, aoFechar: o.aoFechar, scrim: null, timer: 0 };
    if (modal) { c.scrim = el('div', 'sino-scrim'); c.scrim.setAttribute('aria-hidden', 'true'); root.appendChild(c.scrim); }
    root.appendChild(no);
    camada = c;
    o.montar(no, c);
    if (!folha && o.gatilho) {
      var r = o.gatilho.getBoundingClientRect(), w = no.offsetWidth;
      no.style.top = Math.round(r.bottom + 8) + 'px';
      no.style.left = Math.max(8, Math.min(Math.round(r.right - w), window.innerWidth - w - 8)) + 'px';
    }
    if (o.gatilho) { o.gatilho.setAttribute('aria-expanded', 'true'); o.gatilho.setAttribute('aria-controls', o.id); }
    c.teclas = function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (telAtual && telAtual.fechar(true)) return; fecharCamada(true); return; } // Esc com a lista de países aberta fecha só a lista
      if (e.key !== 'Tab') return;
      var fs = [].slice.call(no.querySelectorAll(FOCAVEIS)).filter(function (f) { return f.offsetParent !== null; });
      if (!fs.length) { e.preventDefault(); no.focus(); return; }
      var i = fs.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && (i === fs.length - 1 || i < 0)) { e.preventDefault(); fs[0].focus(); }
    };
    c.fora = function (e) {
      if (no.contains(e.target) || (o.gatilho && o.gatilho.contains(e.target))) return;
      if (e.target.closest && e.target.closest('.ix-toast')) return;
      fecharCamada(false);
    };
    document.addEventListener('keydown', c.teclas, true);
    document.addEventListener('click', c.fora, true);
    if (o.foco) o.foco(no); else no.focus();
    return c;
  }
  window.addEventListener('resize', function () { if (camada && camada.no.id === 'sino-pop') fecharCamada(false); });

  /* ---------- campo de telefone: bandeira, DDI e nome do país (mesmas classes e mesma lógica do checkout) ---------- */
  function campoTelefone(id) {
    var pais = PAISES[0], valor = '';
    var box = el('div', 'tel-box'); box.setAttribute('data-open', 'false');
    var flag = el('button', 'tel-flag'); flag.type = 'button'; flag.id = id + '-flag'; flag.setAttribute('aria-haspopup', 'listbox'); flag.setAttribute('aria-expanded', 'false');
    var img = el('img'); img.alt = ''; img.width = 24; img.height = 18;
    flag.appendChild(img);
    var chev = icone(D.chev); chev.setAttribute('width', '14'); chev.setAttribute('height', '14'); flag.appendChild(chev);
    var inp = el('input'); inp.type = 'tel'; inp.id = id; inp.name = 'whatsapp'; inp.inputMode = 'tel'; inp.autocomplete = 'tel';
    var ul = el('ul', 'tel-list'); ul.setAttribute('role', 'listbox'); ul.setAttribute('aria-label', 'País do telefone'); ul.id = id + '-lista';
    var itens = PAISES.map(function (x) {
      var li = el('li'); li.setAttribute('role', 'option'); li.tabIndex = -1; li.setAttribute('data-pais', x.c);
      var im = el('img'); im.alt = ''; im.width = 24; im.height = 18; im.src = './assets/flags/' + x.c.toLowerCase() + '.svg';
      li.appendChild(im); li.appendChild(el('span', 'tel-nome', x.nome)); li.appendChild(el('span', 'tel-ddi', '+' + x.ddi)); li.appendChild(icone(D.check, 'uui-ico tel-ok'));
      li.addEventListener('click', function () { trocar(x); });
      li.addEventListener('keydown', function (e) {
        var todos = [].slice.call(ul.children), i = todos.indexOf(li);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); todos[(i + (e.key === 'ArrowDown' ? 1 : -1) + todos.length) % todos.length].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); todos[0].focus(); } else if (e.key === 'End') { e.preventDefault(); todos[todos.length - 1].focus(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trocar(x); }
        else if (e.key.length === 1) { var t = e.key.toLowerCase(); var ini = function (n) { return n.textContent.toLowerCase().replace(/^\+\d+/, '').indexOf(t) === 0; }; var n = todos.filter(function (n2, j) { return j > i && ini(n2); })[0] || todos.filter(ini)[0]; if (n) n.focus(); }
      });
      ul.appendChild(li);
      return li;
    });
    box.appendChild(flag); box.appendChild(inp); box.appendChild(ul);
    function pintar() {
      img.src = './assets/flags/' + pais.c.toLowerCase() + '.svg';
      flag.setAttribute('aria-label', 'País do telefone: ' + pais.nome + ' +' + pais.ddi + '. Trocar país');
      inp.placeholder = exTel(pais);
      itens.forEach(function (li) { li.setAttribute('aria-selected', li.getAttribute('data-pais') === pais.c ? 'true' : 'false'); });
    }
    function abrir() {
      box.setAttribute('data-open', 'true'); flag.setAttribute('aria-expanded', 'true');
      var r = box.getBoundingClientRect();
      box.setAttribute('data-dir', r.bottom + Math.min(ul.scrollHeight, 320) + 12 > window.innerHeight ? 'cima' : 'baixo'); // sem espaço embaixo (folha no celular), a lista abre para cima
      setTimeout(function () { var s = ul.querySelector('[aria-selected="true"]'); if (s) s.focus({ preventScroll: true }); }, 60);
    }
    function fechar(voltar) {
      if (box.getAttribute('data-open') !== 'true') return false;
      box.setAttribute('data-open', 'false'); flag.setAttribute('aria-expanded', 'false');
      if (voltar) setTimeout(function () { flag.focus(); }, 30);
      return true;
    }
    function trocar(x) {
      var nac = nacDe(valor, pais); pais = x; valor = fmtTel(x, nac); inp.value = valor; pintar(); fechar(false); setTimeout(function () { inp.focus(); }, 30);
      if (api.aoMudar) api.aoMudar();
    }
    flag.addEventListener('click', function () { if (box.getAttribute('data-open') === 'true') fechar(false); else abrir(); });
    inp.addEventListener('input', function () {
      var r = lerTel(inp.value, pais); pais = r.p; valor = r.v; inp.value = valor; pintar();
      if (api.aoMudar) api.aoMudar();
    });
    pintar();
    var api = {
      box: box, input: inp, fechar: fechar,
      valor: function () { return valor; }, vazio: function () { return !nacDe(valor, pais); }, ok: function () { return telOk(valor, pais); },
      definir: function (v) { var r = lerTel(v, pais); pais = r.p; valor = r.v; inp.value = valor; pintar(); }
    };
    telAtual = api;
    return api;
  }

  /* ---------- folha do aviso (quem não tem conta): WhatsApp primeiro, e-mail como alternativa ---------- */
  var EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var T = {
    titulo: 'Onde avisamos você?',
    txtWa: function (praca) { return 'Enviamos uma mensagem no WhatsApp quando a venda' + (praca ? ' de ' + praca : '') + ' abrir.'; },
    txtEm: function (praca) { return 'Enviamos um e-mail quando a venda' + (praca ? ' de ' + praca : '') + ' abrir.'; },
    txtWaGeral: 'Enviamos uma mensagem no WhatsApp quando a venda dos seus lembretes abrir.',
    txtEmGeral: 'Enviamos um e-mail quando a venda dos seus lembretes abrir.',
    ajudaWa: 'Escolha o país e digite o número.',
    altParaEmail: 'Prefiro receber por e-mail', altParaWa: 'Prefiro receber no WhatsApp',
    erroWaVazio: 'Informe o número do WhatsApp para avisarmos você.', erroWaCurto: 'Confira o número: ele parece incompleto.',
    erroEmVazio: 'Informe o e-mail para avisarmos você.', erroEmFalta: 'Confira o e-mail: falta algo, como o @ ou o final.'
  };
  function abrirFolha(o) { // o: { item, gatilho } avisa um evento; sem item (vem do sino) só guarda o contato e passa os lembretes para ele
    var item = o.item, canal = 'whatsapp', tel = null, inpEmail = null, err = null;
    abrirCamada({
      id: 'sino-contato', classe: 'sino-contato', rotulo: T.titulo, gatilho: null, modal: true,
      montar: function (no) {
        var cab = el('div', 'sino-h');
        cab.appendChild(el('h2', 'sino-t', T.titulo));
        var fechar = el('button', 'sino-x');
        fechar.type = 'button'; fechar.setAttribute('aria-label', 'Fechar'); fechar.appendChild(icone(D.x));
        fechar.addEventListener('click', function () { fecharCamada(true); });
        cab.appendChild(fechar);
        no.appendChild(cab);
        var f = el('form', 'sino-form'); f.noValidate = true;
        var txt = el('p', 'sino-txt');
        var area = el('div', 'sino-campo');
        var alt = el('button', 'linkbtn sino-alt'); alt.type = 'button';
        var acoes = el('div', 'sino-acoes');
        var ok = el('button', 'bp', item ? 'Ativar aviso' : 'Salvar'); ok.type = 'submit'; ok.setAttribute('data-track-lembrete', 'criar');
        var cancel = el('button', 'bs', 'Cancelar'); cancel.type = 'button';
        cancel.addEventListener('click', function () { fecharCamada(true); });
        acoes.appendChild(ok); acoes.appendChild(cancel);
        function desenhar(animar) {
          telAtual = null; tel = null; inpEmail = null;
          while (area.firstChild) area.removeChild(area.firstChild);
          var campo = el('div', 'field');
          err = el('p', 'err', ''); err.id = 'sino-contato-err'; err.hidden = true;
          if (canal === 'whatsapp') {
            txt.textContent = item ? T.txtWa(item.praca) : T.txtWaGeral;
            var lb = el('label', null, 'WhatsApp'); lb.setAttribute('for', 'sino-contato-in');
            tel = campoTelefone('sino-contato-in');
            tel.input.setAttribute('aria-describedby', 'sino-contato-aj sino-contato-err'); tel.input.required = true;
            tel.aoMudar = limparErro;
            var aj = el('p', 'sino-ajuda', T.ajudaWa); aj.id = 'sino-contato-aj';
            campo.appendChild(lb); campo.appendChild(tel.box); campo.appendChild(aj); campo.appendChild(err);
            alt.textContent = T.altParaEmail;
          } else {
            txt.textContent = item ? T.txtEm(item.praca) : T.txtEmGeral;
            var lb2 = el('label', null, 'E-mail'); lb2.setAttribute('for', 'sino-contato-in');
            inpEmail = el('input'); inpEmail.type = 'email'; inpEmail.id = 'sino-contato-in'; inpEmail.name = 'email'; inpEmail.autocomplete = 'email'; inpEmail.inputMode = 'email'; inpEmail.placeholder = 'voce@exemplo.com'; inpEmail.required = true;
            inpEmail.setAttribute('aria-describedby', 'sino-contato-err');
            inpEmail.addEventListener('input', limparErro);
            campo.appendChild(lb2); campo.appendChild(inpEmail); campo.appendChild(err);
            alt.textContent = T.altParaWa;
          }
          area.appendChild(campo);
          if (animar) { area.removeAttribute('data-troca'); void area.offsetWidth; area.setAttribute('data-troca', 'true'); }
        }
        function limparErro() { if (err && !err.hidden) { err.hidden = true; (tel ? tel.input : inpEmail).removeAttribute('aria-invalid'); } }
        alt.addEventListener('click', function () { canal = canal === 'whatsapp' ? 'email' : 'whatsapp'; desenhar(true); (tel ? tel.input : inpEmail).focus(); });
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var campoEl = tel ? tel.input : inpEmail, msg = '', valor = '';
          if (canal === 'whatsapp') { if (tel.vazio()) msg = T.erroWaVazio; else if (!tel.ok()) msg = T.erroWaCurto; else valor = tel.valor(); }
          else { valor = inpEmail.value.trim(); if (!valor) msg = T.erroEmVazio; else if (!EMAIL_OK.test(valor)) msg = T.erroEmFalta; }
          if (msg) { err.hidden = false; err.textContent = msg; campoEl.setAttribute('aria-invalid', 'true'); campoEl.focus(); return; }
          var k = contato(); k[canal] = valor; store.set('contato', k);
          fecharCamada(true);
          if (item) { confirmarCriar(item, canal, valor); return; }
          var l = lista().map(function (x) { return Object.assign({}, x, { canal: canal, destino: valor }); });
          gravar(l); emitir('contato');
          toast('Avisamos ' + noCanal(canal) + ' quando a venda dos seus lembretes abrir.', 'ok', canal === 'whatsapp' ? 'WhatsApp salvo' : 'E-mail salvo');
          if (o.depois) o.depois();
          if (o.sino && document.contains(o.sino)) abrirPainel(o.sino);
        });
        f.appendChild(txt); f.appendChild(area); f.appendChild(alt); f.appendChild(acoes);
        desenhar(false);
        no.appendChild(f);
        f.addEventListener('click', function (e) { if (tel && !(e.target.closest && e.target.closest('.tel-box'))) tel.fechar(false); });
        no._foco = tel ? tel.input : inpEmail;
      },
      foco: function (no) { if (no._foco) no._foco.focus(); },
      aoFechar: function () { if (o.gatilho && document.contains(o.gatilho)) o.gatilho.focus(); }
    });
  }

  /* ---------- o sino do menu ---------- */
  function resumo() {
    var l = lista(), ab = l.filter(abertoAgora).length;
    return { n: l.length, abertos: ab, novas: novasLista().length };
  }
  var ultimaContagem = null, externos = [];
  function externosAbertos() { externos = externos.filter(function (x) { return document.contains(x.no); }); return externos.length > 0; }
  function painelAberto() { return !!(camada && camada.no.id === 'sino-pop'); }
  /* a contagem de NOVAS (vendas que abriram e ainda não foram vistas) alimenta a bolinha do avatar (tools/previa/menu-conta.js); zera ao abrir o painel de notificações.
     O sino do cabeçalho saiu (28/10): aqui só se mantém a contagem e o evento «novas». */
  function sincronizarSino() {
    if (painelAberto() || externosAbertos()) marcarVistos(); // com o painel aberto (do avatar ou de uma seção), tudo o que abre já é visto
    var nv = novasLista().length;
    if (nv !== ultimaContagem) { ultimaContagem = nv; emitir('novas', { n: nv }); }
  }

  function linhaCanal(c) { // c: { canal, nome, sub, estado, ativo, acao: {rotulo, fn} }
    var li = el('li', 'sino-canal');
    li.setAttribute('data-ativo', c.ativo ? 'true' : 'false'); li.setAttribute('data-canal', c.canal);
    li.appendChild(icone(ICONE_CANAL[c.canal], 'sino-canal-ic'));
    var tx = el('span', 'sino-canal-tx');
    tx.appendChild(el('span', 'sino-canal-n', c.nome));
    if (c.sub) tx.appendChild(el('span', 'sino-canal-sub', c.sub));
    li.appendChild(tx);
    if (c.acao) {
      var b = el('button', 'bs sino-canal-bt', c.acao.rotulo); b.type = 'button'; b.setAttribute('data-foco-id', 'canal:' + c.canal);
      b.setAttribute('aria-label', c.acao.nome || c.acao.rotulo); b.addEventListener('click', c.acao.fn); li.appendChild(b);
    } else li.appendChild(el('span', 'tag' + (c.ativo ? ' tag-ok' : '') + (c.estado === 'Em breve' ? ' tag-breve' : ''), c.estado));
    return li;
  }
  function assinatura() { return lista().map(function (x) { return x.id + (abertoAgora(x) ? '!' : '.') + (x.canal || '') + (x.destino || ''); }).sort().join('|') + '#' + JSON.stringify(contato()) + (conta() ? 'c' : 's'); }
  /* a cada segundo só os textos de contagem mudam (refazer o painel inteiro engoliria um clique entre o apertar e o soltar); a lista só é refeita se mudou */
  function atualizarPainel(no) {
    if (no._sig !== assinatura()) { montarPainel(no); return; }
    var itens = no.querySelectorAll('.sino-item[data-estado="aguardando"]');
    for (var i = 0; i < itens.length; i++) {
      var it = lista().filter(function (x) { return x.id === itens[i].getAttribute('data-id'); })[0];
      var f = itens[i].querySelector('.sino-falta');
      if (it && f) { var t = ' · ' + faltam(Date.parse(it.anunciadoEm || it.abreEm) - agora()); if (f.textContent !== t) f.textContent = t; }
    }
  }
  function canaisDoPainel(opts) {
    var c = conta(), k = contato(), d = destinoPadrao();
    var wa = c ? c.telefone : k.whatsapp, em = c ? c.email : k.email;
    var informar = function () { abrirFolha({ sino: opts.gatilho, depois: opts.depois }); };
    var cnl = el('section', 'sino-canais'); cnl.setAttribute('aria-label', 'Como avisamos');
    cnl.appendChild(el('p', 'over', 'Como avisamos'));
    var lc = el('ul', 'sino-canais-l');
    // WhatsApp primeiro; depois o app; o e-mail é a alternativa
    lc.appendChild(linhaCanal({ canal: 'whatsapp', nome: 'WhatsApp', sub: wa ? mascararTel(wa) : 'Informe seu número', estado: 'Ativo', ativo: !!(d && d.canal === 'whatsapp'),
      acao: !c && !(d && d.canal === 'whatsapp') ? { rotulo: 'Informar número', nome: 'Informar o número do WhatsApp', fn: informar } : (!c ? { rotulo: 'Trocar número', nome: 'Trocar o número do WhatsApp', fn: informar } : null) }));
    lc.appendChild(linhaCanal({ canal: 'app', nome: 'App', estado: 'Em breve', ativo: false }));
    lc.appendChild(linhaCanal({ canal: 'email', nome: 'E-mail', sub: em ? mascarar(em) : '', estado: d && d.canal === 'email' ? 'Ativo' : 'Alternativa', ativo: !!(d && d.canal === 'email') }));
    cnl.appendChild(lc);
    return cnl;
  }
  function montarPainel(no) { renderPainel(no, no._opts); }
  /* o painel de notificações é UMA função que desenha num contêiner qualquer: o popover/folha do sino (abaixo) e a seção «Notificações» do menu da conta usam a mesma.
     opts: { cabecalho (título, contador e fechar), fechar (função), gatilho (para devolver o foco), depois (depois de salvar o contato), novas (ids marcados como novos) } */
  function renderPainel(no, opts) {
    opts = opts || {};
    no._opts = opts;
    no._sig = assinatura();
    var foco = document.activeElement && no.contains(document.activeElement) ? document.activeElement.getAttribute('data-foco-id') : null;
    var focoTitulo = document.activeElement && document.activeElement.id === 'sino-t'; // o título recebe o foco ao abrir; refazer a lista não pode largá-lo no <body>
    var lista0 = lista().slice().sort(function (a, b) { var x = abertoAgora(a) ? 0 : 1, y = abertoAgora(b) ? 0 : 1; return x - y || Date.parse(a.abreEm) - Date.parse(b.abreEm); });
    var novasIds = opts.novas || [];
    while (no.firstChild) no.removeChild(no.firstChild);
    if (opts.cabecalho !== false) {
      var cab = el('div', 'sino-h');
      var t = el('h2', 'sino-t', 'Notificações'); t.id = 'sino-t'; t.tabIndex = -1; // MC-20 (Luíza): «Notificações» substitui «Lembretes» na interface
      cab.appendChild(t);
      if (lista0.length) cab.appendChild(el('span', 'sino-cont', String(lista0.length)));
      var fechar = el('button', 'sino-x'); fechar.type = 'button'; fechar.setAttribute('aria-label', 'Fechar notificações'); fechar.appendChild(icone(D.x));
      fechar.addEventListener('click', function () { if (opts.fechar) opts.fechar(); else fecharCamada(true); });
      cab.appendChild(fechar);
      no.appendChild(cab);
    }
    var corpo = el('div', 'sino-corpo');
    if (!lista0.length) {
      var vz = el('div', 'uui-empty-state sino-vazio'); vz.setAttribute('role', 'status');
      var ic = el('span', 'uui-empty-state__icon'); var sv = icone(D.bell, 'uui-ico'); ic.appendChild(sv); vz.appendChild(ic);
      var h = el('div', 'uui-empty-state__header');
      h.appendChild(el('p', 'uui-empty-state__title', 'Sem novidades por enquanto.')); // MC-21
      h.appendChild(el('p', 'uui-empty-state__text', 'Toque em “Me avisar quando abrir” em um evento e avisamos você.'));
      vz.appendChild(h); corpo.appendChild(vz);
    } else {
      var ul = el('ul', 'sino-lista'); ul.setAttribute('aria-label', 'Suas notificações');
      if (lista0.length > LIMITE_COMPACTO) ul.setAttribute('data-compacto', 'true'); // muitas notificações: item compacto (título, hora, Comprar e remover em ícone), não 160 px por linha
      var compacto = lista0.length > LIMITE_COMPACTO;
      lista0.forEach(function (it) {
        var aberto = abertoAgora(it);
        var li = el('li', 'sino-item'); li.setAttribute('data-estado', aberto ? 'aberto' : 'aguardando'); li.setAttribute('data-id', it.id);
        if (novasIds.indexOf(it.id) >= 0) li.setAttribute('data-nova', 'true');
        var tx = el('div', 'sino-item-tx');
        tx.appendChild(el('p', 'sino-evento', it.evento));
        if (it.praca) tx.appendChild(el('p', 'sino-praca', it.praca));
        var q = el('p', 'sino-quando');
        if (aberto) {
          var tg = el('span', 'tag tag-ok'); tg.appendChild(icone(D.check, 'sino-tag-ic')); tg.appendChild(document.createTextNode('Abriu')); q.appendChild(tg);
        } else {
          var base = Date.parse(it.anunciadoEm || it.abreEm);
          q.appendChild(document.createTextNode('A venda abre '));
          var tm = el('time', null, momento(base)); tm.setAttribute('datetime', new Date(base).toISOString()); q.appendChild(tm);
          var f = faltam(base - agora()); if (f) q.appendChild(el('span', 'sino-falta', ' · ' + f));
        }
        tx.appendChild(q);
        var cn = el('p', 'sino-via'); cn.appendChild(icone(ICONE_CANAL[it.canal || 'email'] || D.mail, 'sino-via-ic')); cn.appendChild(document.createTextNode(viaTexto(it)));
        tx.appendChild(cn);
        li.appendChild(tx);
        var ac = el('div', 'sino-item-ac');
        if (aberto) {
          var cp = el('a', 'bp', 'Comprar'); cp.href = it.href || 'Evento.dc.html'; cp.setAttribute('aria-label', 'Comprar: ' + it.evento + (it.praca ? ', ' + it.praca : '')); cp.setAttribute('data-foco-id', 'c:' + it.id); cp.setAttribute('data-track-select-item', it.id);
          ac.appendChild(cp);
        }
        var rm = el('button', 'bs', compacto ? '' : 'Remover'); rm.type = 'button'; rm.setAttribute('data-foco-id', 'r:' + it.id); rm.setAttribute('data-track-lembrete', 'remover');
        if (compacto) { rm.classList.add('sino-rm-ic'); rm.appendChild(icone(D.trash)); }
        rm.setAttribute('aria-label', 'Remover aviso: ' + it.evento + (it.praca ? ', ' + it.praca : '')); // MC-43
        rm.addEventListener('click', function () {
          var proximo = li.nextElementSibling || li.previousElementSibling;
          desativar(it.id);
          // o foco fica no painel: vai para o próximo item (ou para o título, se a lista esvaziou)
          var alvo = no.querySelector(proximo ? '[data-id="' + proximo.getAttribute('data-id') + '"] [data-foco-id^="r:"]' : '#sino-t');
          if (alvo) alvo.focus();
        });
        ac.appendChild(rm);
        li.appendChild(ac);
        ul.appendChild(li);
      });
      corpo.appendChild(ul);
    }
    corpo.appendChild(canaisDoPainel(opts));
    no.appendChild(corpo);
    if (foco) { var f2 = no.querySelector('[data-foco-id="' + foco + '"]'); if (f2) f2.focus(); }
    if (focoTitulo) { var t2 = no.querySelector('#sino-t'); if (t2) t2.focus(); }
  }
  function abrirPainel(gat) {
    var novasIds = novasLista().map(function (x) { return x.id; }); // o que era novo fica marcado no painel; a bolinha zera
    marcarVistos();
    abrirCamada({
      id: 'sino-pop', rotulo: 'Lembretes', gatilho: gat,
      montar: function (no, c) { no._opts = { cabecalho: true, fechar: function () { fecharCamada(true); }, gatilho: gat, novas: novasIds }; montarPainel(no); c.timer = setInterval(function () { if (camada && camada.no === no) atualizarPainel(no); }, 1000); },
      foco: function (no) { var h = no.querySelector('#sino-t'); if (h) h.focus(); }
    });
    sincronizarSino();
  }
  /* o painel de notificações abre pelo item «Notificações» do menu da conta (menu-conta.js), ancorado ao avatar: IngresseLembretes.abrirPainel(gatilho) */

  /* ---------- o relógio vigia as aberturas: quando um lembrete abre, o sino e a página sabem ---------- */
  var sabidosAbertos = {};
  function vigiar() {
    var mudou = false;
    lista().forEach(function (it) {
      var ab = abertoAgora(it);
      if (sabidosAbertos[it.id] === undefined) { sabidosAbertos[it.id] = ab; return; }
      if (ab && !sabidosAbertos[it.id]) {
        sabidosAbertos[it.id] = true; mudou = true;
        toast((nomeDaVenda(it) ? nomeDaVenda(it) + ': a' : 'A') + ' venda abriu.', 'ok', it.evento, { rotulo: 'Comprar', fn: function () { location.href = it.href || 'Evento.dc.html'; } });
        emitir('abriu', { id: it.id });
      } else if (!ab && sabidosAbertos[it.id]) { sabidosAbertos[it.id] = false; mudou = true; } // o relógio voltou
    });
    podarVistos();
    if (mudou) sincronizarSino();
  }

  /* painel de notificações num contêiner (o menu da conta usa): desenha a lista, os canais e o estado vazio; refaz sozinho quando algo muda e conta a contagem do segundo a segundo.
     Ao montar, as novas são marcadas como vistas (abrir a seção zera a bolinha). Devolve { atualizar, destruir }. opts: ver renderPainel (cabecalho padrão: false aqui). */
  function montarPainelEm(no, opts) {
    var o = Object.assign({ cabecalho: false }, opts || {}, { novas: novasLista().map(function (x) { return x.id; }) });
    marcarVistos();
    var h = { no: no };
    externos.push(h);
    renderPainel(no, o);
    h.timer = setInterval(function () { if (!document.contains(no)) { h.destruir(); return; } atualizarPainel(no); }, 1000);
    h.atualizar = function () { if (document.contains(no)) renderPainel(no, no._opts); };
    h.destruir = function () { clearInterval(h.timer); externos = externos.filter(function (x) { return x !== h; }); sincronizarSino(); };
    sincronizarSino();
    return h;
  }
  document.addEventListener('previa:lembretes', function () { externos.forEach(function (x) { if (document.contains(x.no)) renderPainel(x.no, x.no._opts); }); });
  /* contagem para o avatar: n = novas, texto = o que a bolinha mostra («9+» a partir de 10), aria = texto acessível («3 novas»), vazio = sem bolinha */
  function contagem() { var n = novasLista().length; return { n: n, texto: n > 9 ? '9+' : String(n), aria: n === 0 ? '' : n + (n === 1 ? ' nova' : ' novas'), vazio: n === 0 }; }
  /* itens para quem desenha a lista por conta própria */
  function itens() {
    var v = vistos();
    return lista().map(function (it) {
      var aberto = abertoAgora(it), base = Date.parse(it.anunciadoEm || it.abreEm);
      return { id: it.id, evento: it.evento, praca: it.praca, estado: aberto ? 'aberto' : 'aguardando', nova: aberto && v.indexOf(it.id) < 0, iso: new Date(base).toISOString(), quando: momento(base), falta: aberto ? '' : faltam(base - agora()), canal: it.canal || 'email', destino: it.destino || it.email || '', via: viaTexto(it), href: it.href || 'Evento.dc.html' };
    }).sort(function (a, b) { return (a.estado === 'aberto' ? 0 : 1) - (b.estado === 'aberto' ? 0 : 1) || Date.parse(a.iso) - Date.parse(b.iso); });
  }

  /* simulação (engrenagem): n vendas que já abriram e a pessoa não viu, para ver a bolinha do sino com vários números e o «9+» */
  function simularNovas(n) {
    var ja = lista().filter(function (x) { return x.id.indexOf('demo:') === 0; }).length;
    for (var i = 1; i <= n; i++) criar({ id: 'demo:' + (ja + i), evento: 'Evento de exemplo ' + (ja + i), praca: '', abreEm: new Date(agora() - 60000).toISOString(), href: 'Evento.dc.html' });
    sincronizarSino();
  }

  window.IngresseRelogio = relogio;
  window.IngresseLembretes = {
    agora: agora, relogio: relogio, abertura: abertura, momento: momento, faltam: faltam,
    registrar: function (it) { if (it && it.id) registro[it.id] = it; },
    lista: lista, tem: tem, criar: criar, remover: remover, alternar: alternar, conta: conta, contato: contato, liberaEm: liberaEm,
    definirConta: function (comConta) { store.set('conta', comConta ? { email: 'pessoa@exemplo.com', telefone: TEL_CONTA } : false); store.set('contato', {}); emitir('conta'); },
    limpar: function () { gravar([]); store.set('sinoVistos', []); store.set('contato', {}); sabidosAbertos = {}; emitir('limpou'); },
    resumo: resumo, novas: function () { return novasLista().length; }, marcarVistas: function () { marcarVistos(); sincronizarSino(); }, contagem: contagem, itens: itens,
    abrirPainel: abrirPainel, fecharPainel: function () { if (painelAberto()) fecharCamada(true); }, painelAberto: painelAberto, montarPainelEm: montarPainelEm, abrirContato: function (gatilho, depois) { abrirFolha({ sino: gatilho, depois: depois }); }, simularNovas: simularNovas, antecipaMs: ANTECIPA_MS
  };

  function iniciar() {
    lista().forEach(function (it) { sabidosAbertos[it.id] = abertoAgora(it); });
    sincronizarSino();
    new MutationObserver(function () { sincronizarSino(); }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('previa:lembretes', function () { sincronizarSino(); if (painelAberto()) montarPainel(camada.no); });
    setInterval(vigiar, 1000);
    emitir('pronto'); // as telas que chegaram antes deste script se refazem
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
