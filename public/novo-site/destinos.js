/* destinos.js: destinos de navegação do protótipo e o «Ir para…» da engrenagem (pedido do Wander, 28/10/2026; Mariana).
   Carregado em TODAS as telas (tools/previa/destinos.mjs põe o <script> no início da helmet). Faz duas coisas, sem mudar o comportamento normal do site:

   1. window.IngresseDestinos: a tabela única que diz para onde cada TIPO de elemento leva. As telas (Home, Categoria, Busca…) chamam
      IngresseDestinos.evento(e) em vez de apontar sempre para Evento.dc.html (o show do Sorriso Maroto, a única página de evento de show):
        - jogo de futebol            -> Evento.dc.html?jogo=<id>   (a página de confronto; sem página própria, o jogo-modelo da mesma situação)
        - prova ou evento esportivo  -> Evento.dc.html?esporte=<id> (sem página própria, a prova-modelo)
        - categoria de entretenimento-> Categoria.dc.html?c=<slug>  (esportes e corridas vão para Esportes.dc.html)
        - estilo musical             -> Busca.dc.html?tags=<id do gênero> (a Busca filtra pela folksonomia; o título e o filtro "Gênero musical" saem da tag)
        - «Ver todos» de artistas    -> Busca.dc.html?escopo=artistas[&q=] (a lista de artistas: cartões, não eventos); de locais -> ?escopo=locais
        - turnê                      -> Colecao.dc.html
        - show de entretenimento     -> Evento.dc.html (o padrão)
      IngresseDestinos.compra(href) devolve o destino do botão «Comprar ingressos» do cartão de evento a partir do destino acima (Ingressos, Ingressos?esporte=, Ingressos?jogo=).
   2. «Ir para…»: dentro da engrenagem (o painel .proto) de qualquer tela, grupos recolhidos com links para TODAS as variantes (eventos, coleções, categorias, busca).
      A engrenagem é criada aqui nas telas que ainda não têm uma (Artista, Venue, Busca, Categoria, Esportes, Ingressos…). Só links: nenhum controle muda o site.

   O texto do painel é de protótipo (não é texto de produto). Mapa completo: docs/design/NAVEGACAO-DESTINOS-PROTOTIPO.md. */
(function () {
  if (window.IngresseDestinos) return;

  /* ---------- tabela ---------- */
  // Todo jogo de futebol tem página própria (29/10/2026): previa/dados/futebol-confronto.json é a fonte única dos jogos (o gerador também os põe no catálogo, na Categoria e no sorteio)
  var JOGOS_COM_PAGINA = [32, 42, 45, 3001, 3002, 3003, 3004, 3005, 3010, 3011, 3012];
  for (var gi = 1125; gi <= 1160; gi++) JOGOS_COM_PAGINA.push(gi);
  // jogo sem página própria: o jogo-modelo da mesma situação (a página mostra aquele estado da venda)
  var JOGO_MODELO = { venda: '3001', pre: '3001', 'nao-aberto': '3002', esgotado: '3012', encerrado: '3005', cancelado: '3001&ciclo=cancelado', adiado: '3001&ciclo=adiado' };
  // evento esportivo do catálogo geral (/api/eventos, ids < 1000) sem página própria: a prova-modelo parecida (previa/dados/esportes.json, ids 2001 a 2183)
  var ESPORTE_MODELO = { 33: 2167, 49: 2168, 35: 2030, 44: 2062 }; // vôlei -> futevôlei; Corrida do Farol -> Corrida Farol Prata; Meia Maratona Orla Leste -> Meia Maratona Eco Celeste (não aberta)

  function tem(lista, x) { return lista && lista.indexOf(x) >= 0; }
  function jogo(id) { return 'Evento.dc.html?jogo=' + id; }
  function esporte(id) { return 'Evento.dc.html?esporte=' + id; }
  function categoria(slug) {
    if (slug === 'esportes') return 'Esportes.dc.html';
    if (slug === 'corridas') return 'Esportes.dc.html?modalidade=corrida';
    return 'Categoria.dc.html?c=' + slug;
  }
  function estilo(id) { return 'Busca.dc.html?tags=' + id; }
  function artistas(q) { return 'Busca.dc.html?escopo=artistas' + (q ? '&q=' + encodeURIComponent(q) : ''); } // a lista de artistas (cartões), não eventos
  function locais(q) { return 'Busca.dc.html?escopo=locais' + (q ? '&q=' + encodeURIComponent(q) : ''); } // a lista de locais
  /** Para onde leva um evento do catálogo. Aceita o formato da API (id, cats, situacao, m, jogo), o da Categoria (i, k, s, m, j) e o da Busca (id, cats, sit). */
  function evento(e) {
    if (!e) return 'Evento.dc.html';
    var id = Number(e.id != null ? e.id : e.i);
    var cats = e.cats || e.k || [];
    var sit = e.situacao || e.sit || e.s || 'venda';
    // modo BFF (Opções de desenvolvedor › Dados dos eventos): evento do BFF (ids do site atual, 89 mil para cima; os do protótipo ficam abaixo de 4000) abre a página do Evento com os dados dele
    if (id >= 10000 && document.documentElement.getAttribute('data-dados') === 'bff') return 'Evento.dc.html?bff=' + id;
    if (tem(JOGOS_COM_PAGINA, id)) return jogo(id);
    if (e.m || e.jogo || e.j || tem(cats, 'futebol')) return jogo(JOGO_MODELO[sit] || JOGO_MODELO.venda);
    if (id >= 2001 && id <= 2183) return esporte(id);
    if (ESPORTE_MODELO[id]) return esporte(ESPORTE_MODELO[id]);
    if (tem(cats, 'esportes') || tem(cats, 'corridas')) return esporte(2001);
    return 'Evento.dc.html';
  }

  /** A jornada de COMPRA a partir da página do evento (botão 2 do cartão de evento, 30/10/2026): show -> Ingressos.dc.html; prova -> Ingressos.dc.html?esporte=<id>; jogo -> Ingressos.dc.html?jogo=<id>
   *  (a jornada de futebol da Mariana); turnê e coleção ficam na Coleção. Só o id vai junto: os parâmetros de simulação (agora, ciclo, quem…) do destino do «Ver detalhes» não entram na compra. */
  function compra(href) {
    href = String(href || '');
    if (!/^Evento\.dc\.html/.test(href)) return href || 'Ingressos.dc.html';
    var m = /[?&](esporte|jogo)=(\d+)/.exec(href);
    return 'Ingressos.dc.html' + (m ? '?' + m[1] + '=' + m[2] : '');
  }

  /* ---------- «Ir para…»: os grupos da engrenagem ---------- */
  var V04 = 'Evento.dc.html?jogo=42&quem=socio&plano=socio-prata&agora=2027-03-08T12:00:00-03:00';
  var V05 = 'Evento.dc.html?jogo=42&quem=logada&agora=2027-03-04T12:00:00-03:00';
  var V06 = 'Evento.dc.html?jogo=42&agora=2027-03-04T12:00:00-03:00';
  var V08 = 'Evento.dc.html?jogo=42&quem=socio&agora=2027-03-03T04:48:00-03:00';
  var GRUPOS = [
    { t: 'Eventos', sub: [
      { t: 'Show', links: [['Sorriso Maroto (padrão)', 'Evento.dc.html']] },
      { t: 'Evento esportivo', links: [
        ['Corrida de rua', esporte(2001)], ['Trail run', esporte(2082)], ['Ciclismo', esporte(2116)], ['Triathlon', esporte(2133)], ['Natação', esporte(2145)],
        ['Beach tennis', esporte(2159)], ['Corrida de aventura', esporte(2153)], ['Corrida kids', esporte(2049)], ['Desafio virtual', esporte(2111)], ['Etapa de circuito', esporte(2069)],
        ['Últimas vagas', esporte(2008)], ['Prova esgotada', esporte(2019)], ['Prova cancelada', esporte(2017)], ['Prova adiada', esporte(2015)], ['Com grupos', esporte(2001) + '&grupo=1'] ] },
      { t: 'Evento de futebol', links: [
        ['Jogo padrão (42)', jogo(42) + '&agora=agora'], ['V04 · sócio, janela aberta', V04], ['V05 · logada, venda de sócios', V05], ['V06 · anônima, venda de sócios', V06], ['V08 · contador abaixo de 24 h', V08],
        ['Só a geral aberta', jogo(3001)], ['Sócios esgotado', jogo(3002)], ['Torcida visitante', jogo(3003)], ['Jogo hoje, vendas encerradas', jogo(3004)], ['Jogo realizado', jogo(3005)],
        ['Bahia x Fortaleza', jogo(3011)], ['Adiado', jogo(42) + '&ciclo=adiado'], ['Cancelado', jogo(42) + '&ciclo=cancelado'] ] }
    ] },
    { t: 'Coleções', sub: [
      { t: 'Turnê', links: [['Turnê com 4 praças', 'Colecao.dc.html'], ['Turnê com 30 praças', 'Colecao.dc.html?pracas=30']] },
      { t: 'Estilo musical', links: [['Samba e pagode', estilo('samba-pagode')], ['Sertanejo', estilo('sertanejo')], ['Funk', estilo('funk')], ['Pop', estilo('pop')], ['Rock', estilo('rock')], ['Eletrônica', estilo('eletronica')], ['Forró', estilo('forro')], ['MPB', estilo('mpb')], ['Rap e trap', estilo('rap')], ['Axé', estilo('axe')], ['Arrocha', estilo('arrocha')], ['Jazz e blues', estilo('jazz-blues')], ['Tribal', estilo('tribal')]] },
      { t: 'Circuito esportivo', links: [['Circuito Pulso', 'Esportes.dc.html?circuito=circuito-pulso'], ['Circuito Orla Aberta', 'Esportes.dc.html?circuito=circuito-orla-aberta'], ['Todos os circuitos', 'Esportes.dc.html?formato=circuito']] }
    ] },
    { t: 'Categorias de entretenimento', links: [
      ['Shows', categoria('shows')], ['Festivais', categoria('festivais')], ['Festa e balada', categoria('baladas')], ['Música eletrônica', categoria('musica-eletronica')],
      ['Futebol', categoria('futebol')], ['Teatro', categoria('teatro')], ['Gastronomia', categoria('gastronomia')], ['Kids', categoria('infantil')]] },
    { t: 'Categorias esportivas', links: [
      ['Ingresse Sports', 'Esportes.dc.html'], ['Corrida', 'Esportes.dc.html?modalidade=corrida'], ['Trail run', 'Esportes.dc.html?modalidade=trail-run'], ['Ciclismo', 'Esportes.dc.html?modalidade=ciclismo'],
      ['Triathlon', 'Esportes.dc.html?modalidade=triathlon'], ['Natação', 'Esportes.dc.html?modalidade=natacao'], ['Beach tennis', 'Esportes.dc.html?modalidade=beach-tennis'],
      ['Corrida de 10 km', 'Esportes.dc.html?modalidade=corrida&distancia=10k'], ['Aceita grupos', 'Esportes.dc.html?servico=aceita-grupos&mes=2027-03'],
      ['Sem resultado', 'Esportes.dc.html?modalidade=corrida&distancia=21k&mes=2027-03&publico=kids']] },
    { t: 'Busca', sub: [
      { t: 'Busca', links: [
        ['Busca geral', 'Busca.dc.html'], ['Busca com resultado', 'Busca.dc.html?q=pagode'], ['Busca Ingresse Sports', 'Busca.dc.html?escopo=esportes&q=meia%20maratona'],
        ['Sem resultado', 'Busca.dc.html?q=zzzxyz'], ['Sem resultado em Sports', 'Busca.dc.html?escopo=esportes&q=samba']] },
      { t: 'Artistas e locais', links: [
        ['Artistas e locais nos resultados', 'Busca.dc.html?q=Sorriso'], ['Todos os artistas', artistas()], ['Todos os locais', locais()],
        ['Artistas de funk', 'Busca.dc.html?escopo=artistas&tags=funk'], ['Sem artista', artistas('zzzxyz')]] },
      { t: 'Serviços e ajuda', links: [
        ['Ingressos (Meus ingressos e eventos)', 'Busca.dc.html?q=ingressos'], ['Reembolso', 'Busca.dc.html?q=reembolso'], ['Dependentes (sem tela)', 'Busca.dc.html?q=dependentes'], ['Atendimento', 'Busca.dc.html?q=atendimento']] }
    ] },
    { t: 'Jornada de compra', sub: [
      { t: 'Produtos na compra (show)', links: [
        ['Show com produtos', 'Ingressos.dc.html?escolhidos=1'], ['Show sem produtos', 'Ingressos.dc.html?produtos=0&escolhidos=1'], ['Show com esgotado', 'Ingressos.dc.html?produtos=esgotado&escolhidos=1'],
        ['Show com obrigatório', 'Ingressos.dc.html?produtos=obrigatorio&escolhidos=1'], ['Show com prazo vencido', 'Ingressos.dc.html?produtos=prazo&escolhidos=1'], ['Show com erro de estoque', 'Ingressos.dc.html?produtos=erro&escolhidos=1'] ] },
      { t: 'Produtos na compra (esporte e jogo)', links: [
        ['Corrida com camiseta e doação', 'Ingressos.dc.html?esporte=2001&escolhidos=1'], ['Pedal com transporte', 'Ingressos.dc.html?esporte=2116&escolhidos=1'], ['Triathlon completo', 'Ingressos.dc.html?esporte=2134&escolhidos=1'],
        ['Prova virtual com kit obrigatório', 'Ingressos.dc.html?esporte=2111&escolhidos=1'], ['Prova sem produtos', 'Ingressos.dc.html?esporte=2180&escolhidos=1'],
        ['Jogo em casa', 'Ingressos.dc.html?jogo=42&escolhidos=1'], ['Jogo da torcida visitante', 'Ingressos.dc.html?jogo=3003&escolhidos=1'] ] },
      { t: 'Etapas seguintes com produtos', links: [
        ['Quem vai com produtos', 'Checkout.dc.html?escolhidos=1'], ['Como pagar com produtos', 'Pagamento.dc.html?escolhidos=1'], ['Como pagar com erro de estoque', 'Pagamento.dc.html?escolhidos=1&produtos=erro'] ] }
    ] },
    { t: 'Jornada de compra de futebol', sub: [
      { t: 'Perfis', links: [
        ['Torcedor geral (rosto pendente)', 'Ingressos.dc.html?jogo=3011&perfil=geral'], ['Sócio Ouro', 'Ingressos.dc.html?jogo=3011&perfil=socio&plano=socio-ouro'],
        ['Sócio, plano que não vale no setor', 'Ingressos.dc.html?jogo=3011&perfil=socio&plano=socio-prata&setor=cad-leste-inf'], ['Sócio, venda por abrir (relógio)', 'Ingressos.dc.html?jogo=3010&perfil=socio&agora=2026-10-30T10:00:00-03:00'],
        ['Torcida visitante', 'Ingressos.dc.html?jogo=3011&perfil=visitante'], ['Família, com dependentes', 'Ingressos.dc.html?jogo=3011&perfil=familia'], ['Acessibilidade, com acompanhante', 'Ingressos.dc.html?jogo=3011&perfil=pcd'],
        ['Qualquer jogo (sem mapa próprio)', 'Ingressos.dc.html?jogo=42'] ] },
      { t: 'Mapa e setores', links: [
        ['Assento marcado (principal)', 'Ingressos.dc.html?jogo=3011&mapa=assento'], ['Mapa ilustrativo', 'Ingressos.dc.html?jogo=3011&mapa=ilustrativo'], ['Setor sem assento (lista)', 'Ingressos.dc.html?jogo=3011&mapa=livre'],
        ['Setor numerado aberto', 'Ingressos.dc.html?jogo=3011&setor=cad-leste-inf'], ['Setor esgotado', 'Ingressos.dc.html?jogo=3011&setor=cad-leste-sup'],
        ['Mapa demora', 'Ingressos.dc.html?jogo=3011&estado=mapa-lento'], ['Mapa falha', 'Ingressos.dc.html?jogo=3011&estado=mapa-falha'] ] },
      { t: 'Rosto (folha)', links: [
        ['Cadastrar', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=pendente&abrir=rosto'], ['Aguardando', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=aguardando&abrir=rosto'], ['Rosto cadastrado', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=feito&abrir=rosto'],
        ['Já cadastrado', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=ja&abrir=rosto'], ['Expirado', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=expirado&abrir=rosto'], ['Erro (foto escura)', 'Ingressos.dc.html?jogo=3011&perfil=geral&rosto=erro&motivo=escura&abrir=rosto'],
        ['Rosto depois (Carteira)', 'Ingressos.dc.html?jogo=3011&perfil=geral&facial=depois'], ['Jogo sem rosto', 'Ingressos.dc.html?jogo=3011&perfil=geral&facial=nao'] ] },
      { t: 'Reserva e lugares', links: [
        ['Reserva acabando', 'Ingressos.dc.html?jogo=3011&escolhidos=1&estado=reserva-acabando'], ['Reserva acabou', 'Ingressos.dc.html?jogo=3011&escolhidos=1&estado=reserva-acabou'],
        ['Assento tomado', 'Ingressos.dc.html?jogo=3011&perfil=geral&escolhidos=1&estado=assento-tomado'], ['Reserva em outro aparelho', 'Ingressos.dc.html?jogo=3011&escolhidos=1&estado=outro-aparelho'], ['Limite de meia', 'Ingressos.dc.html?jogo=3011&estado=meia-limite&escolhidos=1'] ] },
      { t: 'Quem vai, pagar e pronto', links: [
        ['Dependentes (Pedro, Lia, Caio)', 'Checkout.dc.html?jogo=3011&perfil=familia&escolhidos=1'], ['Convidado sem rosto', 'Checkout.dc.html?jogo=3011&perfil=geral&escolhidos=1&estado=convidado-sem-rosto'],
        ['Cadastro de dependente', 'Checkout.dc.html?jogo=3011&perfil=familia&escolhidos=1&abrir=dependente'], ['Como pagar', 'Pagamento.dc.html?jogo=3011&perfil=socio&escolhidos=1'],
        ['Pronto (você está no jogo)', 'Pagamento.dc.html?jogo=3011&perfil=socio&escolhidos=1&etapa=4'], ['Jogo adiado durante a compra', 'Ingressos.dc.html?jogo=3011&escolhidos=1&ciclo=adiado'] ] },
      { t: 'Carteira do jogo', links: [
        ['Entrada pelo rosto', 'Carteira.dc.html?jogo=3011&perfil=socio&escolhidos=1'], ['Rosto pendente', 'Carteira.dc.html?jogo=3011&perfil=socio&escolhidos=1&sit=rosto-pendente'],
        ['Ingresso de dependente', 'Carteira.dc.html?jogo=3011&perfil=familia&escolhidos=1'], ['Entrada por QR', 'Carteira.dc.html?jogo=3011&facial=nao&entrada=qr&qr=1&escolhidos=1'] ] }
    ] },
    { t: 'Outras telas', links: [
      ['Home', 'Main.dc.html'], ['Artista', 'Artista.dc.html'], ['Local', 'Venue.dc.html'], ['Carteira', 'Carteira.dc.html'], ['Ingressos', 'Ingressos.dc.html'], ['Entrar', 'Login.dc.html']] }
  ];

  window.IngresseDestinos = { jogo: jogo, esporte: esporte, categoria: categoria, estilo: estilo, artistas: artistas, locais: locais, evento: evento, compra: compra, colecao: function () { return 'Colecao.dc.html'; }, grupos: GRUPOS };

  /* ---------- engrenagem ---------- */
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function atual() { return (location.pathname.split('/').pop() || 'Main.dc.html') + location.search; }
  function chip(par, aqui) {
    var cur = par[1] === aqui;
    return '<a class="chip chip-sm' + (cur ? ' is-on' : '') + '" href="' + esc(par[1]) + '"' + (cur ? ' aria-current="page"' : '') + '>' + esc(par[0]) + '</a>';
  }
  function lista(g, aqui) {
    if (!g.sub) return '<div class="ir-lista">' + g.links.map(function (p) { return chip(p, aqui); }).join('') + '</div>';
    return '<div class="ir-lista">' + g.sub.map(function (s) { return '<span class="over">' + esc(s.t) + '</span>' + s.links.map(function (p) { return chip(p, aqui); }).join(''); }).join('') + '</div>';
  }
  function temAqui(g, aqui) {
    var ls = g.sub ? g.sub.reduce(function (a, s) { return a.concat(s.links); }, []) : g.links;
    return ls.some(function (p) { return p[1] === aqui; });
  }
  function bloco() {
    var aqui = atual();
    var d = el('div', 'ir'); d.setAttribute('data-ir-para', '');
    var corpo = GRUPOS.map(function (g) {
      return '<details class="ir-g" name="ir-g"' + (temAqui(g, aqui) ? ' open' : '') + '><summary>' + esc(g.t) + '</summary>' + lista(g, aqui) + '</details>';
    }).join('');
    d.innerHTML = '<details class="ir-raiz"><summary>Ir para…</summary><div class="ir-corpo">' + corpo + '</div></details>';
    return d;
  }
  function engrenagem() {
    if (!document.body) return;
    var dentro = document.querySelector('.proto .proto-in');
    if (!dentro) {
      if (document.querySelector('.proto')) return; // existe, mas o painel ainda não foi montado pelo motor de templates
      var p = el('details', 'proto'); p.setAttribute('data-ir-engrenagem', '');
      p.innerHTML = '<summary>Simulação</summary><div class="proto-in" role="group" aria-label="Simulação"></div>';
      document.body.appendChild(p); dentro = p.querySelector('.proto-in');
    }
    document.querySelectorAll('.proto .proto-in').forEach(function (painel) {
      var meu = painel.querySelector(':scope > [data-ir-para]');
      if (!meu) { meu = bloco(); painel.insertBefore(meu, painel.firstChild); }
      else if (painel.firstChild !== meu) painel.insertBefore(meu, painel.firstChild); // sempre o primeiro grupo do painel
    });
  }
  var agendado = 0;
  function agendar() { if (agendado) return; agendado = setTimeout(function () { agendado = 0; engrenagem(); }, 60); }
  function iniciar() {
    engrenagem();
    // o motor de templates refaz partes do corpo e outros módulos acrescentam grupos: o «Ir para…» é reposto (barato: só age se faltar ou sair do primeiro lugar)
    new MutationObserver(agendar).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
