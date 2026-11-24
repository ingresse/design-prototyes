/* conta.js: área logada do novo site (design-prototypes, 24/11/2026). Recria as páginas da conta do site_next (src/app/my-purchases, profile,
   payment-methods, verified-devices, privacy-and-security, facial) no visual do MVP. Estilos: conta.css.

   Cada página tem <main class="ct" data-tela="…">: compras | dados | dependentes | pagamentos | dispositivos | seguranca | facial.
   Dados:
     - Quem está logado: a sessão da plataforma (localStorage 'plataforma:sessao:v1', a mesma do link de compra e das carteiras) ou a conta do
       site (Pessoa Exemplo, pessoa@exemplo.com, a do menu da conta).
     - Minhas compras: os pedidos dessa pessoa no banco do Backstage (ponte-backstage.js), com o evento de cada um.
     - O resto (dados, endereço, cartões, dispositivos, senha, facial) é estado do protótipo neste navegador (localStorage 'conta:*'). Nada sai daqui. */
(function () {
  'use strict';
  var main = document.querySelector('main.ct[data-tela]');
  if (!main) return;
  var TELA = main.getAttribute('data-tela');
  document.documentElement.setAttribute('data-area', 'conta');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ler(k, padrao) { try { var v = localStorage.getItem('conta:' + k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem('conta:' + k, JSON.stringify(v)); } catch (e) { /* só nesta visita */ } }
  function avisar(msg, tipo) { if (window.IX && IX.toast) IX.toast(msg, tipo || 'ok'); }
  function reais(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function dataHora(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ', ' + SEMANA[d.getDay()] + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function dataCurta(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', ''); }
  var ICO = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    celular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    computador: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    rosto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="9.5" cy="10" r=".6"/><circle cx="14.5" cy="10" r=".6"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>',
  };

  function conta() {
    var s = null; try { s = JSON.parse(localStorage.getItem('plataforma:sessao:v1') || 'null'); } catch (e) {}
    var base = s && s.email ? { nome: s.nome, email: s.email } : { nome: 'Pessoa Exemplo', email: 'pessoa@exemplo.com' };
    return Object.assign({ nascimento: '1994-06-12', nacionalidade: 'BRA', documento: '', ddi: '+55', celular: '(11) 99876-5432' }, base, ler('dados', {}));
  }

  /* ---------- casca: título e menu da conta (o HeaderMenu do site_next) ---------- */
  var NAV = [
    ['Carteira.dc.html', 'Carteira', 'carteira'],
    ['Compras.dc.html', 'Minhas compras', 'compras'],
    ['Conta.dc.html', 'Meus dados', 'dados'],
    ['Dependentes.dc.html', 'Dependentes', 'dependentes'],
    ['Pagamentos.dc.html', 'Formas de pagamento', 'pagamentos'],
    ['Dispositivos.dc.html', 'Dispositivos verificados', 'dispositivos'],
    ['Seguranca.dc.html', 'Privacidade e segurança', 'seguranca'],
  ];
  function casca(titulo, sub) {
    var nav = NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[2] === TELA ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a>'; }).join('');
    main.innerHTML = '<div class="ct-topo"><h1 class="disp ct-titulo">' + esc(titulo) + '</h1>' + (sub ? '<p class="ct-sub">' + esc(sub) + '</p>' : '') +
      (TELA === 'facial' ? '' : '<nav class="ct-nav" aria-label="Minha conta">' + nav + '</nav>') + '</div><div class="ct-corpo" data-corpo></div>';
    return main.querySelector('[data-corpo]');
  }
  function bloco(t, s, extra) { return '<section class="ct-bloco"><div class="ct-bloco__topo"><div><h2 class="ct-bloco__t">' + esc(t) + '</h2>' + (s ? '<p class="ct-bloco__s">' + esc(s) + '</p>' : '') + '</div>' + (extra || '') + '</div>'; }

  /* diálogo nativo: confirmar(opções) -> Promise<boolean> */
  function dialogo(html) {
    var d = document.createElement('dialog'); d.className = 'ct-dialogo'; d.innerHTML = html; document.body.appendChild(d);
    d.addEventListener('close', function () { setTimeout(function () { d.remove(); }, 0); });
    d.showModal(); return d;
  }
  function confirmar(o) {
    return new Promise(function (ok) {
      var d = dialogo('<form method="dialog"><h2>' + esc(o.titulo) + '</h2>' + (o.texto || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
        (o.alerta ? '<div class="ct-aviso ct-aviso--alerta">' + ICO.info + '<span>' + esc(o.alerta) + '</span></div>' : '') +
        '<div class="ct-acoes"><button class="bs" value="nao">' + esc(o.nao || 'Cancelar') + '</button><button class="bp" value="sim">' + esc(o.sim) + '</button></div></form>');
      d.addEventListener('close', function () { ok(d.returnValue === 'sim'); });
    });
  }

  /* campos: html e validação */
  function campo(id, rotulo, valor, o) {
    o = o || {};
    var attrs = (o.tipo ? ' type="' + o.tipo + '"' : ' type="text"') + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
      (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + (o.desabilitado ? ' disabled' : '') + (o.max ? ' maxlength="' + o.max + '"' : '');
    var ctl = o.opcoes
      ? '<select id="' + id + '" name="' + id + '"' + (o.desabilitado ? ' disabled' : '') + '><option value="">Selecione</option>' + o.opcoes.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (p[0] === valor ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>'
      : '<input id="' + id + '" name="' + id + '" value="' + esc(valor) + '"' + attrs + '>';
    return '<div class="field' + (o.inteiro ? ' ct-inteiro' : '') + '" data-campo="' + id + '"><label for="' + id + '">' + esc(rotulo) + '</label>' + ctl + (o.dica ? '<p class="ct-dica">' + o.dica + '</p>' : '') + '</div>';
  }
  function erro(form, id, msg) {
    var f = form.querySelector('[data-campo="' + id + '"]'); if (!f) return;
    var e = f.querySelector('.err'); if (e) e.remove();
    f.removeAttribute('data-err');
    var inp = f.querySelector('input, select'); if (inp) inp.removeAttribute('aria-invalid');
    if (msg) { f.setAttribute('data-err', 'true'); var p = document.createElement('p'); p.className = 'err'; p.id = id + '-err'; p.textContent = msg; f.appendChild(p); if (inp) { inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', p.id); } }
  }
  function cpfValido(v) {
    var d = String(v).replace(/\D/g, ''); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i); if (((s * 10) % 11) % 10 !== Number(d[t])) return false; }
    return true;
  }
  function mascara(inp, tipo) {
    inp.addEventListener('input', function () {
      var d = inp.value.replace(/\D/g, '');
      if (tipo === 'cpf') d = d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      else if (tipo === 'cep') d = d.slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
      else if (tipo === 'cartao') d = d.slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
      else if (tipo === 'validade') d = d.slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');
      else if (tipo === 'cvv') d = d.slice(0, 4);
      inp.value = d;
    });
  }

  /* ================================================================== Minhas compras */
  function telaCompras() {
    var corpo = casca('Minhas compras', 'Seus pedidos, a forma de pagamento e o que ainda dá para fazer com cada um.');
    corpo.innerHTML = '<div class="ct-lista" data-lista><div class="ct-vazio"><div class="ct-giro" aria-hidden="true"></div><span>Carregando suas compras</span></div></div>';
    var api = window.__ponteBackstageApi;
    if (!api || !api.banco) { corpo.innerHTML = '<div class="ct-vazio"><strong>Não foi possível carregar suas compras.</strong><span>Tente de novo em instantes.</span></div>'; return; }
    var eu = conta();
    api.banco().then(function (b) {
      b = b || { pedidos: [], eventos: [], ingressos: [] };
      var evs = {}; (b.eventos || []).forEach(function (e) { evs[e.id] = e; });
      var reemb = ler('reembolsos', {});
      var lista = (b.pedidos || []).filter(function (p) { return p.comprador && String(p.comprador.email).toLowerCase() === eu.email.toLowerCase(); })
        .sort(function (a, z) { return a.criadoEm < z.criadoEm ? 1 : -1; });
      var filtro = 'todas';
      function situacao(p) {
        if (reemb[p.id]) return { k: 'reembolsada', t: 'Reembolsada', c: 'info' };
        if (p.status === 'pago') return { k: 'aprovada', t: 'Aprovada', c: 'ok' };
        if (p.status === 'aguardando-pagamento') return { k: 'pendente', t: 'Pendente', c: 'espera' };
        return { k: 'cancelada', t: 'Cancelada', c: '' };
      }
      var METODO = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', dinheiro: 'Dinheiro', cortesia: 'Cortesia', saldo: 'Saldo' };
      function desenhar() {
        var alvo = corpo.querySelector('[data-lista]');
        var vis = lista.filter(function (p) { var s = situacao(p).k; return filtro === 'todas' || s === filtro || (filtro === 'cancelada' && s === 'reembolsada'); });
        var filtros = [['todas', 'Todas'], ['aprovada', 'Aprovadas'], ['pendente', 'Pendentes'], ['cancelada', 'Canceladas e reembolsadas']];
        var html = '<div class="ct-filtros" role="group" aria-label="Filtrar compras">' + filtros.map(function (f) { return '<button type="button" data-filtro="' + f[0] + '" aria-pressed="' + (f[0] === filtro) + '">' + f[1] + '</button>'; }).join('') + '</div>';
        if (!vis.length) html += '<div class="ct-vazio"><strong>' + (lista.length ? 'Nenhuma compra neste filtro.' : 'Sem compras no momento.') + '</strong>' + (lista.length ? '' : '<span>Quando você comprar ingressos, eles aparecem aqui.</span><a class="bp" style="width:auto" href="Main.dc.html">Explorar eventos</a>') + '</div>';
        vis.forEach(function (p) {
          var e = evs[p.eventoId] || {}, s = situacao(p);
          var qtd = (p.itens || []).reduce(function (t, i) { return t + (i.tipo === 'ingresso' ? i.quantidade : 0); }, 0);
          var pag = p.pagamento ? (METODO[p.pagamento.metodo] || 'Outros') + (p.pagamento.parcelas > 1 ? ' em ' + p.pagamento.parcelas + 'x' : '') : (p.status === 'aguardando-pagamento' ? 'Pix aguardando pagamento' : 'Pagamento não concluído');
          var dentroDe7 = Date.now() - Date.parse(p.criadoEm) < 7 * 864e5;
          var eventoFuturo = e.data ? Date.parse(e.data) > Date.now() : false;
          var acoes = '';
          if (s.k === 'aprovada') {
            acoes += '<a class="bs" href="Carteira.dc.html">Ver ingressos</a>';
            if (eventoFuturo) acoes += dentroDe7
              ? '<button type="button" class="bs" data-reembolso="' + esc(p.id) + '">Pedir reembolso</button>'
              : '<span class="ct-dica-bloqueio" tabindex="0" data-dica="O prazo de 7 dias para pedir reembolso já passou, por isso essa opção está desativada."><button type="button" class="bs" disabled>Pedir reembolso</button></span>';
          } else if (s.k === 'pendente') acoes += '<a class="bp" href="/comprar/' + encodeURIComponent(p.eventoId) + '">Pagar agora</a>';
          html += '<article class="ct-compra">' +
            (e.capa ? '<img class="ct-compra__capa" src="' + esc(e.capa) + '" alt="" loading="lazy">' : '<span class="ct-compra__capa" aria-hidden="true"></span>') +
            '<div class="ct-compra__corpo"><h2 class="ct-compra__nome"><a href="Evento.dc.html?ev=' + encodeURIComponent(p.eventoId) + '">' + esc(e.nome || 'Evento') + '</a></h2>' +
            '<p class="ct-compra__linha">Realizada em ' + esc(dataHora(p.criadoEm)) + '</p>' +
            '<p class="ct-compra__valor">' + qtd + (qtd === 1 ? ' item' : ' itens') + ' por ' + (p.cupom ? '<s>' + reais(p.subtotal + p.taxas) + '</s>' : '') + reais(p.total) + '</p>' +
            '<p class="ct-compra__linha">' + esc(pag) + '</p>' +
            '<p class="ct-compra__linha">Pedido ' + esc(p.id) + '</p></div>' +
            '<div class="ct-compra__lado"><span class="ct-selo' + (s.c ? ' ct-selo--' + s.c : '') + '">' + s.t + '</span>' + acoes + '</div>' +
            '<p class="ct-compra__ajuda">Precisa de ajuda com essa compra? <a href="#" data-toast="A central de ajuda abre em outra aba no site da Ingresse.">Fale com a Ingresse</a></p>' +
            '</article>';
        });
        alvo.innerHTML = html;
      }
      corpo.addEventListener('click', function (ev) {
        var f = ev.target.closest('[data-filtro]'); if (f) { filtro = f.getAttribute('data-filtro'); desenhar(); return; }
        var r = ev.target.closest('[data-reembolso]'); if (!r) return;
        var p = lista.filter(function (x) { return x.id === r.getAttribute('data-reembolso'); })[0]; if (!p) return;
        var parcelado = p.pagamento && p.pagamento.parcelas > 1;
        confirmar({
          titulo: 'Confirmar reembolso',
          texto: ['Ao confirmar, sua compra é cancelada e o valor volta para a forma de pagamento usada.', 'Os ingressos saem da sua carteira.', 'Valor: ' + reais(p.total)],
          alerta: 'Esta ação não pode ser desfeita. Seus ingressos serão cancelados e o valor reembolsado.' + (parcelado ? ' O estorno de compras parceladas segue o prazo da operadora do cartão.' : ''),
          sim: 'Confirmar reembolso', nao: 'Cancelar',
        }).then(function (sim) {
          if (!sim) return;
          reemb[p.id] = new Date().toISOString(); gravar('reembolsos', reemb);
          desenhar(); avisar('Reembolso solicitado. O valor volta em até 10 dias úteis.');
        });
      });
      desenhar();
    });
  }

  /* ================================================================== Meus dados */
  var PAISES = [['BRA', 'Brasil'], ['ARG', 'Argentina'], ['PRT', 'Portugal'], ['ESP', 'Espanha'], ['USA', 'Estados Unidos'], ['URY', 'Uruguai'], ['MEX', 'México']];
  // CEP -> estado e cidade (protótipo: as faixas mais comuns; nada é consultado fora)
  var CEPS = [[1000000, 5999999, 'SP', 'São Paulo'], [8000000, 8499999, 'SP', 'São Paulo'], [13000000, 13149999, 'SP', 'Campinas'], [20000000, 23799999, 'RJ', 'Rio de Janeiro'], [30000000, 31999999, 'MG', 'Belo Horizonte'], [40000000, 42599999, 'BA', 'Salvador'], [50000000, 52999999, 'PE', 'Recife'], [60000000, 61599999, 'CE', 'Fortaleza'], [70000000, 72799999, 'DF', 'Brasília'], [80000000, 82999999, 'PR', 'Curitiba'], [88000000, 88099999, 'SC', 'Florianópolis'], [90000000, 91999999, 'RS', 'Porto Alegre']];
  function cepParaLocal(cep) { var n = Number(String(cep).replace(/\D/g, '')); for (var i = 0; i < CEPS.length; i++) if (n >= CEPS[i][0] && n <= CEPS[i][1]) return { uf: CEPS[i][2], cidade: CEPS[i][3] }; return null; }

  function formEditavel(raiz, desenharCampos, validar, salvar) {
    var editando = false;
    function render() {
      raiz.querySelector('[data-campos]').innerHTML = desenharCampos(editando);
      raiz.querySelector('[data-botoes]').innerHTML = editando ? '<button type="button" class="bs" data-cancelar>Cancelar</button><button type="submit" class="bp">Salvar</button>' : '<button type="button" class="bs" data-editar>Editar</button>';
      raiz.querySelectorAll('[data-mascara]').forEach(function (i) { mascara(i, i.getAttribute('data-mascara')); });
      if (editando) { var p = raiz.querySelector('input:not([disabled]), select:not([disabled])'); if (p) p.focus(); }
      if (raiz.__aoRender) raiz.__aoRender(editando);
    }
    raiz.addEventListener('click', function (e) {
      if (e.target.closest('[data-editar]')) { editando = true; render(); }
      else if (e.target.closest('[data-cancelar]')) { editando = false; render(); }
    });
    raiz.addEventListener('submit', function (e) {
      e.preventDefault();
      var dados = {}; new FormData(raiz).forEach(function (v, k) { dados[k] = String(v).trim(); });
      var erros = validar(dados), primeiro = null;
      Object.keys(erros).forEach(function (k) { erro(raiz, k, erros[k]); if (erros[k] && !primeiro) primeiro = k; });
      raiz.querySelectorAll('[data-campo]').forEach(function (f) { var k = f.getAttribute('data-campo'); if (!erros[k]) erro(raiz, k, ''); });
      if (primeiro) { var i = raiz.querySelector('#' + primeiro); if (i) i.focus(); return; }
      salvar(dados); editando = false; render(); avisar('Dados atualizados com sucesso!');
    });
    render();
  }

  /* Recorte da foto de perfil: o mesmo modal do upload de banner do Backstage (campo-banner.tsx, Cropper do DS), aqui em JS puro.
     Quadrado (a foto aparece redonda; o círculo é o guia), começa no maior quadrado centralizado; arrasta para mover, puxa um canto
     para redimensionar, setas do teclado movem. Clicar fora não fecha (arrastar até a borda e soltar fora descartava). Sai em 256 px. */
  function recortarFoto(arquivo) {
    return new Promise(function (resolver) {
      var url = URL.createObjectURL(arquivo), feito = false;
      var d = dialogo('<div class="ct-recorte-modal"><div class="ct-recorte-modal__topo"><span class="ct-recorte-modal__ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg></span>' +
        '<div><h2>Recortar foto</h2><p>Arraste a área para escolher o que aparece. A foto fica redonda no menu e no ingresso.</p></div>' +
        '<button type="button" class="ct-recorte-modal__x" aria-label="Fechar" data-fechar><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="ct-recorte-palco"><div class="ct-recorte"><img alt="" draggable="false"><div class="ct-recorte__sel" tabindex="0" role="group" aria-label="Área do recorte. Use as setas para mover.">' +
        '<span class="ct-recorte__alca" data-canto="nw"></span><span class="ct-recorte__alca" data-canto="ne"></span><span class="ct-recorte__alca" data-canto="sw"></span><span class="ct-recorte__alca" data-canto="se"></span></div></div></div>' +
        '<div class="ct-acoes"><button type="button" class="bs" data-fechar>Cancelar</button><button type="button" class="bp" data-aplicar>Aplicar recorte</button></div></div>');
      d.classList.add('ct-dialogo--recorte');
      d.addEventListener('cancel', function () { /* Esc fecha */ });
      d.addEventListener('click', function (e) { if (e.target === d) e.stopPropagation(); }); // fora não fecha
      var caixa = d.querySelector('.ct-recorte'), img = caixa.querySelector('img'), sel = caixa.querySelector('.ct-recorte__sel');
      var r = { x: 0, y: 0, l: 0 }, W = 0, H = 0, MIN = 48;
      function pintar() { sel.style.left = r.x + 'px'; sel.style.top = r.y + 'px'; sel.style.width = sel.style.height = r.l + 'px'; }
      function limitar() { r.l = Math.max(Math.min(MIN, W, H), Math.min(r.l, W, H)); r.x = Math.min(Math.max(0, r.x), W - r.l); r.y = Math.min(Math.max(0, r.y), H - r.l); }
      img.onload = function () {
        W = img.clientWidth; H = img.clientHeight; r.l = Math.min(W, H); r.x = (W - r.l) / 2; r.y = (H - r.l) / 2; pintar();
      };
      img.src = url;
      var gesto = null;
      caixa.addEventListener('pointerdown', function (e) {
        var alca = e.target.closest('.ct-recorte__alca');
        if (!alca && !e.target.closest('.ct-recorte__sel')) return;
        e.preventDefault(); caixa.setPointerCapture(e.pointerId); sel.focus({ preventScroll: true });
        gesto = { canto: alca ? alca.getAttribute('data-canto') : null, x0: e.clientX, y0: e.clientY, r0: { x: r.x, y: r.y, l: r.l } };
      });
      caixa.addEventListener('pointermove', function (e) {
        if (!gesto) return;
        var dx = e.clientX - gesto.x0, dy = e.clientY - gesto.y0, o = gesto.r0, c = gesto.canto;
        if (!c) { r.x = o.x + dx; r.y = o.y + dy; r.l = o.l; limitar(); pintar(); return; }
        // redimensiona preso ao canto oposto, sempre quadrado
        var sx = c.indexOf('e') >= 0 ? 1 : -1, sy = c.indexOf('s') >= 0 ? 1 : -1;
        var ax = sx > 0 ? o.x : o.x + o.l, ay = sy > 0 ? o.y : o.y + o.l; // âncora
        var l = Math.max(sx * dx, sy * dy) + o.l;
        var maxX = sx > 0 ? W - ax : ax, maxY = sy > 0 ? H - ay : ay;
        l = Math.max(Math.min(MIN, W, H), Math.min(l, maxX, maxY));
        r.l = l; r.x = sx > 0 ? ax : ax - l; r.y = sy > 0 ? ay : ay - l; pintar();
      });
      function soltar() { gesto = null; }
      caixa.addEventListener('pointerup', soltar); caixa.addEventListener('pointercancel', soltar);
      sel.addEventListener('keydown', function (e) {
        var p = e.shiftKey ? 20 : 4, m = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[e.key];
        if (!m) return; e.preventDefault(); r.x += m[0]; r.y += m[1]; limitar(); pintar();
      });
      window.addEventListener('resize', function redimensionar() {
        if (!document.contains(d)) { window.removeEventListener('resize', redimensionar); return; }
        var k = img.clientWidth / (W || 1); W = img.clientWidth; H = img.clientHeight; r.x *= k; r.y *= k; r.l *= k; limitar(); pintar();
      });
      function fechar(v) { if (feito) return; feito = true; d.close(); URL.revokeObjectURL(url); resolver(v); }
      d.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', function () { fechar(null); }); });
      d.addEventListener('close', function () { fechar(null); });
      d.querySelector('[data-aplicar]').addEventListener('click', function () {
        var k = img.naturalWidth / W, c = document.createElement('canvas'); c.width = c.height = 256;
        c.getContext('2d').drawImage(img, r.x * k, r.y * k, r.l * k, r.l * k, 0, 0, 256, 256);
        fechar(c.toDataURL('image/jpeg', 0.85));
      });
    });
  }

  function telaDados() {
    var corpo = casca('Meus dados', 'Seus dados aparecem nos ingressos e ajudam a confirmar que é você na entrada.');
    var eu = conta(), foto = ler('foto', './assets/pessoas/pessoa-exemplo.jpg');
    corpo.innerHTML =
      bloco('Foto de perfil', 'Aparece no seu ingresso e no menu da conta.') +
      '<div class="ct-foto"><img src="' + esc(foto) + '" alt="Sua foto de perfil" data-foto><div class="ct-acoes"><label class="bs" style="width:auto;cursor:pointer">Trocar foto<input type="file" accept="image/*" hidden data-arquivo></label>' +
      (ler('foto', null) ? '<button type="button" class="bs" data-tirar-foto>Remover</button>' : '') + '</div></div></section>' +
      '<form class="ct-bloco" data-form-pessoais novalidate><div class="ct-bloco__topo"><div><h2 class="ct-bloco__t">Dados pessoais</h2><p class="ct-bloco__s">E-mail e celular são os da sua conta e não mudam por aqui.</p></div><div class="ct-acoes" data-botoes></div></div><div class="ct-grade" data-campos></div></form>' +
      '<form class="ct-bloco" data-form-endereco novalidate><div class="ct-bloco__topo"><div><h2 class="ct-bloco__t">Meu endereço</h2><p class="ct-bloco__s">Usado na nota fiscal e quando o evento pede endereço.</p></div><div class="ct-acoes" data-botoes></div></div><div class="ct-grade" data-campos></div></form>';

    var arq = corpo.querySelector('[data-arquivo]');
    arq.addEventListener('change', function () {
      var f = arq.files && arq.files[0]; arq.value = ''; // limpa: escolher o mesmo arquivo de novo também abre o recorte
      if (!f) return;
      if (!/^image\//.test(f.type)) { avisar('Escolha um arquivo de imagem.', 'erro'); return; }
      recortarFoto(f).then(function (url) {
        if (!url) return;
        gravar('foto', url); document.dispatchEvent(new CustomEvent('conta:foto'));
        telaDados(); avisar('Foto atualizada.');
      });
    });
    corpo.addEventListener('click', function (e) { if (e.target.closest('[data-tirar-foto]')) { try { localStorage.removeItem('conta:foto'); } catch (x) {} document.dispatchEvent(new CustomEvent('conta:foto')); telaDados(); avisar('Foto removida.'); } });

    var fp = corpo.querySelector('[data-form-pessoais]');
    formEditavel(fp, function (ed) {
      var d = conta(), bra = (fp.__nac || d.nacionalidade) === 'BRA', semDoc = !d.documento;
      return campo('nome', 'Nome completo', d.nome, { desabilitado: !ed, autocomplete: 'name' }) +
        campo('nacionalidade', 'País de nacionalidade', d.nacionalidade, { opcoes: PAISES, desabilitado: !ed }) +
        campo('documento', bra ? 'CPF' : 'Passaporte', d.documento, { desabilitado: !ed || !semDoc, placeholder: bra ? '000.000.000-00' : 'Número do passaporte', inputmode: bra ? 'numeric' : 'text', dica: semDoc ? '' : 'Para trocar o documento, fale com a Ingresse.' }).replace('<input ', bra ? '<input data-mascara="cpf" ' : '<input ') +
        campo('nascimento', 'Data de nascimento', d.nascimento, { tipo: 'date', desabilitado: !ed }) +
        campo('email', 'E-mail', d.email, { tipo: 'email', desabilitado: true }) +
        '<div class="ct-grade" style="grid-template-columns:5rem minmax(0,1fr);gap:var(--space-3)">' + campo('ddi', 'DDI', d.ddi, { desabilitado: true }) + campo('celular', 'Celular', d.celular, { desabilitado: true }) + '</div>';
    }, function (v) {
      var e = {};
      if (!v.nome) e.nome = 'Obrigatório';
      if (!v.nacionalidade) e.nacionalidade = 'Obrigatório';
      var d = conta();
      if (!d.documento) { if (!v.documento) e.documento = 'Obrigatório'; else if (v.nacionalidade === 'BRA' && !cpfValido(v.documento)) e.documento = 'CPF inválido'; }
      if (!v.nascimento) e.nascimento = 'Obrigatório';
      return e;
    }, function (v) {
      var atual = ler('dados', {});
      atual.nome = v.nome; atual.nacionalidade = v.nacionalidade; atual.nascimento = v.nascimento; if (v.documento && !conta().documento) atual.documento = v.documento;
      gravar('dados', atual);
    });
    fp.addEventListener('change', function (e) { if (e.target.id === 'nacionalidade') { fp.__nac = e.target.value; var doc = fp.querySelector('[data-campo="documento"] label'); if (doc) doc.textContent = e.target.value === 'BRA' ? 'CPF' : 'Passaporte'; } });

    var fe = corpo.querySelector('[data-form-endereco]');
    formEditavel(fe, function (ed) {
      var a = Object.assign({ pais: 'BRA', cep: '', uf: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '' }, ler('endereco', {}));
      return campo('pais', 'País', a.pais, { opcoes: PAISES, desabilitado: !ed }) +
        campo('cep', 'CEP', a.cep, { desabilitado: !ed, placeholder: '00000-000', inputmode: 'numeric', dica: '<a class="ct-link" href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener noreferrer">Não sabe seu CEP?</a>' }).replace('<input ', '<input data-mascara="cep" ') +
        campo('uf', 'Estado', a.uf, { desabilitado: true, placeholder: 'Preenchido pelo CEP' }) +
        campo('cidade', 'Cidade', a.cidade, { desabilitado: true, placeholder: 'Preenchida pelo CEP' }) +
        campo('bairro', 'Bairro', a.bairro, { desabilitado: !ed }) +
        campo('rua', 'Endereço', a.rua, { desabilitado: !ed, placeholder: 'Rua, avenida…', autocomplete: 'address-line1' }) +
        campo('numero', 'Número', a.numero, { desabilitado: !ed, inputmode: 'numeric' }) +
        campo('complemento', 'Complemento (opcional)', a.complemento, { desabilitado: !ed, placeholder: 'Apartamento, bloco…' });
    }, function (v) {
      var e = {}, bra = v.pais === 'BRA';
      if (!v.pais) e.pais = 'Obrigatório';
      if (bra && !v.cep) e.cep = 'Obrigatório'; else if (bra && v.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
      if (!v.bairro) e.bairro = 'Obrigatório';
      if (!v.rua) e.rua = 'Obrigatório';
      if (!v.numero) e.numero = 'Obrigatório';
      return e;
    }, function (v) {
      var l = cepParaLocal(v.cep) || {};
      gravar('endereco', { pais: v.pais, cep: v.cep, uf: l.uf || '', cidade: l.cidade || '', bairro: v.bairro, rua: v.rua, numero: v.numero, complemento: v.complemento });
    });
    fe.addEventListener('input', function (e) {
      if (e.target.id !== 'cep') return;
      var l = cepParaLocal(e.target.value);
      fe.querySelector('#uf').value = l ? l.uf : ''; fe.querySelector('#cidade').value = l ? l.cidade : '';
    });
  }

  /* ================================================================== Dependentes */
  function telaDependentes() {
    var corpo = casca('Dependentes', 'Pessoas que vão com você e usam ingressos comprados na sua conta, como filhos menores de idade.');
    var D = window.IngresseDependentes;
    function desenhar() {
      var lista = D && D.listar ? D.listar() : ler('dependentes', []);
      var html = bloco('Seus dependentes', lista.length ? lista.length + (lista.length === 1 ? ' pessoa cadastrada' : ' pessoas cadastradas') : 'Ninguém cadastrado ainda', '<div class="ct-acoes"><button type="button" class="bp" data-add>Adicionar dependente</button></div>');
      if (!lista.length) html += '<div class="ct-vazio"><strong>Nenhum dependente.</strong><span>Cadastre quem vai com você para atribuir ingressos na hora da compra.</span></div>';
      else html += '<div class="ct-cartoes">' + lista.map(function (p) {
        return '<div class="ct-disp"><div class="ct-disp__topo"><span class="ct-disp__ico">' + ICO.rosto + '</span>' +
          (p.rosto === 'ok' || p.rosto === true ? '<span class="ct-selo ct-selo--ok">Facial cadastrada</span>' : '<span class="ct-selo">Sem facial</span>') + '</div>' +
          '<div><p class="ct-disp__nome">' + esc(p.nome) + '</p><p class="ct-disp__meta">' + esc([p.vinculo, p.idade != null ? p.idade + ' anos' : ''].filter(Boolean).join(', ')) + '</p>' + (p.email ? '<p class="ct-disp__meta">' + esc(p.email) + '</p>' : '') + '</div>' +
          '<div class="ct-acoes"><button type="button" class="bs" data-remover="' + esc(p.id) + '">Remover</button></div></div>';
      }).join('') + '</div>';
      corpo.innerHTML = html + '</section>';
    }
    corpo.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]'), rem = e.target.closest('[data-remover]');
      if (add && D && D.abrirCadastro) D.abrirCadastro({ gatilho: add, aoSalvar: function () { desenhar(); } /* o cadastro já grava e avisa; gravar aqui duplicava o dependente */, aoFechar: function () {} });
      if (rem) {
        var nome = (rem.closest('.ct-disp').querySelector('.ct-disp__nome') || {}).textContent;
        confirmar({ titulo: 'Remover dependente', texto: ['Remover ' + nome + ' da sua conta? Os ingressos que já estão no nome dessa pessoa continuam valendo.'], sim: 'Remover', nao: 'Cancelar' }).then(function (ok) {
          if (!ok) return; if (D && D.remover) D.remover(rem.getAttribute('data-remover')); desenhar(); avisar('Dependente removido.');
        });
      }
    });
    if (D) document.addEventListener('jf:dependentes', desenhar);
    desenhar();
  }

  /* ================================================================== Formas de pagamento */
  var MAX_CARTOES = 3;
  function bandeira(num) {
    var d = String(num).replace(/\D/g, '');
    if (/^4/.test(d)) return 'visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'master'; if (/^3[47]/.test(d)) return 'amex';
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6504|6505|6516)/.test(d)) return 'elo'; if (/^(38|60)/.test(d)) return 'hipercard'; if (/^3(0[0-5]|[68])/.test(d)) return 'diners';
    return 'cartão';
  }
  var NOME_BANDEIRA = { visa: 'Visa', master: 'Mastercard', amex: 'Amex', elo: 'Elo', hipercard: 'Hipercard', diners: 'Diners', 'cartão': 'Cartão' };
  function cartoes() { return ler('cartoes', [{ id: 'c1', bandeira: 'visa', final: '4242', titular: 'PESSOA EXEMPLO', validade: '08/29', principal: true }, { id: 'c2', bandeira: 'master', final: '5454', titular: 'PESSOA EXEMPLO', validade: '03/28', principal: false }]); }
  /* Cartão de crédito do Untitled UI (shared-assets/credit-card, estilos "brand-dark" e "gray-dark"), portado para HTML.
     Desenhado no tamanho original (316 x 190) e reduzido por escala, como o componente faz com a prop width. É ilustração:
     o número, o titular e a validade que valem para leitura estão no texto ao lado. */
  var LOGO_MASTER = '<svg width="30" height="19" viewBox="0 0 30 19" fill="none"><path fill-rule="evenodd" d="M14.9053 16.4393C13.3266 17.77 11.2787 18.5733 9.04092 18.5733C4.04776 18.5733 0 14.5737 0 9.64C0 4.70625 4.04776 0.706665 9.04092 0.706665C11.2787 0.706665 13.3266 1.51 14.9053 2.84072C16.484 1.51 18.5319 0.706665 20.7697 0.706665C25.7629 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7629 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z" fill="#ED0006"/><path fill-rule="evenodd" d="M14.9053 16.4393C16.8492 14.8007 18.0818 12.3626 18.0818 9.64C18.0818 6.91739 16.8492 4.47925 14.9053 2.84072C16.484 1.50999 18.5319 0.706665 20.7697 0.706665C25.7628 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7628 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z" fill="#F9A000"/><path fill-rule="evenodd" d="M14.9053 16.4393C16.8492 14.8008 18.0818 12.3627 18.0818 9.64007C18.0818 6.91748 16.8492 4.47936 14.9053 2.84082C12.9614 4.47936 11.7288 6.91748 11.7288 9.64007C11.7288 12.3627 12.9614 14.8008 14.9053 16.4393Z" fill="#FF5E00"/></svg>';
  var PAYPASS = '<svg width="20" height="24" viewBox="0 0 20 24" fill="none"><path d="M15.1429 1.28571C17.0236 4.54326 18.0138 8.23849 18.0138 12C18.0138 15.7615 17.0236 19.4567 15.1429 22.7143M10.4286 3.64285C11.8956 6.18374 12.6679 9.06602 12.6679 12C12.6679 14.934 11.8956 17.8162 10.4286 20.3571M5.92859 5.80713C6.98933 7.66394 7.54777 9.77022 7.54777 11.9143C7.54777 14.0583 6.98933 16.1646 5.92859 18.0214M1.42859 8.14285C2.19306 9.29983 2.59834 10.6362 2.59834 12C2.59834 13.3638 2.19306 14.7002 1.42859 15.8571" stroke="currentColor" stroke-width="2.57143" stroke-linecap="round"/></svg>';
  function cartaoVisual(c) {
    var nome = NOME_BANDEIRA[c.bandeira] || 'Cartão';
    var logo = c.bandeira === 'master' ? LOGO_MASTER : '<span class="ct-cc__marca">' + esc(nome) + '</span>';
    return '<span class="ct-cc ct-cc--' + (c.bandeira === 'master' ? 'cinza' : c.bandeira === 'visa' ? 'azul' : 'marca') + '" aria-hidden="true"><span class="ct-cc__face">' +
      '<span class="ct-cc__topo"><span class="ct-cc__emissor">' + esc(nome) + '</span>' + PAYPASS + '</span>' +
      '<span class="ct-cc__base"><span class="ct-cc__dados"><span class="ct-cc__linha"><span>' + esc(c.titular) + '</span><span>' + esc(c.validade) + '</span></span>' +
      '<span class="ct-cc__num">\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + esc(c.final) + '</span></span>' +
      '<span class="ct-cc__tipo">' + logo + '</span></span></span></span>';
  }
  /* Ilustração animada do banner (Iconly Motion "Card wallet", Lottie). Toca em laço; em movimento reduzido fica parada num quadro. */
  var cacheArte = {};
  function animarArte(el, tentativa) {
    if (!el) return;
    if (!window.lottie) { if ((tentativa || 0) < 50) setTimeout(function () { animarArte(el, (tentativa || 0) + 1); }, 100); return; }
    var url = el.getAttribute('data-lottie-auto');
    if (!cacheArte[url]) cacheArte[url] = fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    cacheArte[url].then(function (dados) {
      if (!dados || !document.contains(el)) return;
      var parado = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.getAttribute('data-motion') === 'reduce';
      var anim = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: !parado, autoplay: !parado, animationData: JSON.parse(JSON.stringify(dados)), rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      if (parado) anim.addEventListener('DOMLoaded', function () { anim.goToAndStop(45, true); });
    });
  }
  function telaPagamentos() {
    var corpo = casca('Formas de pagamento', 'Cartões salvos para comprar mais rápido. Nenhuma informação sensível fica guardada.');
    function desenhar() {
      var cs = cartoes(), cheio = cs.length >= MAX_CARTOES;
      corpo.innerHTML = '<div class="ct-banner"><div><h2>Compre com 1 clique</h2><p>Com cartões salvos, a compra fica ainda mais rápida. Nenhuma informação sensível é armazenada.</p>' +
        '<button type="button" class="bp" data-add' + (cheio ? ' disabled aria-describedby="ct-max"' : '') + '>Adicionar cartão</button></div><span class="ct-banner__arte" aria-hidden="true" data-lottie-auto="./assets/icones/cartao-carteira.json"></span></div>' +
        '<div class="ct-aviso" id="ct-max">' + ICO.info + '<span>Você pode cadastrar até três cartões. Para adicionar outro, remova um dos cadastrados.</span></div>' +
        '<div class="ct-lista">' + (cs.length ? cs.map(function (c) {
          return '<div class="ct-cartao">' + cartaoVisual(c) +
            '<div><p class="ct-cartao__num">' + esc(NOME_BANDEIRA[c.bandeira] || 'Cartão') + ' final ' + esc(c.final) + '</p><p class="ct-cartao__meta">' + esc(c.titular) + '. Validade ' + esc(c.validade) + '</p></div>' +
            (c.principal ? '<span class="ct-selo ct-selo--ok">Principal</span>' : '<span></span>') +
            '<div class="ct-menu"><button type="button" class="ct-menu__bt" aria-haspopup="menu" aria-expanded="false" aria-label="Opções do cartão final ' + esc(c.final) + '" data-menu="' + c.id + '">' + ICO.mais + '</button>' +
            '<div class="ct-menu__lista" role="menu" hidden>' + (c.principal ? '' : '<button type="button" role="menuitem" data-principal="' + c.id + '">Tornar principal</button>') + '<button type="button" role="menuitem" data-perigo data-excluir="' + c.id + '">Excluir cartão</button></div></div></div>';
        }).join('') : '<div class="ct-vazio"><strong>Nenhum cartão salvo.</strong><span>Adicione um cartão para comprar com 1 clique.</span></div>') + '</div>';
      animarArte(corpo.querySelector('[data-lottie-auto]'));
    }
    function fecharMenus() { corpo.querySelectorAll('.ct-menu__lista').forEach(function (m) { m.hidden = true; }); corpo.querySelectorAll('[data-menu]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); }
    document.addEventListener('click', function (e) { if (!e.target.closest('.ct-menu')) fecharMenus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenus(); });
    corpo.addEventListener('click', function (e) {
      var m = e.target.closest('[data-menu]');
      if (m) { var l = m.nextElementSibling, abrir = l.hidden; fecharMenus(); l.hidden = !abrir; m.setAttribute('aria-expanded', String(abrir)); if (abrir) l.querySelector('button').focus(); return; }
      var pr = e.target.closest('[data-principal]');
      if (pr) { var id = pr.getAttribute('data-principal'); gravar('cartoes', cartoes().map(function (c) { return Object.assign({}, c, { principal: c.id === id }); })); desenhar(); avisar('Cartão principal atualizado.'); return; }
      var ex = e.target.closest('[data-excluir]');
      if (ex) {
        var idx = ex.getAttribute('data-excluir'); fecharMenus();
        confirmar({ titulo: 'Excluir cartão', texto: ['Tem certeza que deseja excluir esse cartão? Essa ação não pode ser desfeita.'], sim: 'Sim, excluir', nao: 'Não, cancelar' }).then(function (ok) {
          if (!ok) return; var resto = cartoes().filter(function (c) { return c.id !== idx; }); if (resto.length && !resto.some(function (c) { return c.principal; })) resto[0].principal = true;
          gravar('cartoes', resto); desenhar(); avisar('Cartão excluído.');
        });
        return;
      }
      if (e.target.closest('[data-add]')) adicionar();
    });
    function adicionar() {
      var d = dialogo('<form method="dialog" novalidate data-form-cartao><h2>Adicionar cartão</h2><p>Podemos fazer uma cobrança de baixo valor para verificar o cartão. Ela é estornada na hora. Nenhuma informação sensível fica guardada.</p>' +
        campo('numero', 'Número do cartão', '', { placeholder: '0000 0000 0000 0000', inputmode: 'numeric', autocomplete: 'cc-number' }).replace('<input ', '<input data-mascara="cartao" ') +
        '<div class="ct-grade">' + campo('validade', 'Validade', '', { placeholder: 'MM/AA', inputmode: 'numeric', autocomplete: 'cc-exp' }).replace('<input ', '<input data-mascara="validade" ') +
        campo('cvv', 'Código de segurança', '', { placeholder: '123', inputmode: 'numeric', autocomplete: 'cc-csc' }).replace('<input ', '<input data-mascara="cvv" ') + '</div>' +
        campo('titular', 'Nome impresso no cartão', '', { placeholder: 'Nome completo', autocomplete: 'cc-name' }) +
        campo('cpf', 'CPF do titular', '', { placeholder: '000.000.000-00', inputmode: 'numeric' }).replace('<input ', '<input data-mascara="cpf" ') +
        '<div class="ct-acoes"><button type="button" class="bs" value="nao" data-fechar>Cancelar</button><button type="submit" class="bp">Adicionar</button></div></form>');
      var f = d.querySelector('form');
      f.querySelectorAll('[data-mascara]').forEach(function (i) { mascara(i, i.getAttribute('data-mascara')); });
      f.querySelector('[data-fechar]').addEventListener('click', function () { d.close(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = {}; new FormData(f).forEach(function (x, k) { v[k] = String(x).trim(); });
        var er = {}, num = v.numero.replace(/\D/g, '');
        if (!num) er.numero = 'O número do cartão é obrigatório.'; else if (num.length < 13) er.numero = 'Número do cartão inválido.';
        if (!v.validade) er.validade = 'A validade é obrigatória.'; else { var mm = Number(v.validade.slice(0, 2)), aa = Number(v.validade.slice(3, 5)); if (!/^\d{2}\/\d{2}$/.test(v.validade) || mm < 1 || mm > 12) er.validade = 'Validade inválida.'; else if (new Date(2000 + aa, mm, 0) < new Date()) er.validade = 'Cartão vencido.'; }
        if (!v.cvv) er.cvv = 'O código de segurança é obrigatório.'; else if (v.cvv.length < 3) er.cvv = 'Código inválido.';
        if (!v.titular) er.titular = 'O nome é obrigatório.'; else if (!/^[A-Za-zÀ-ÿ ]+$/.test(v.titular)) er.titular = 'Use só letras e espaços.';
        if (!v.cpf) er.cpf = 'O CPF é obrigatório.'; else if (!cpfValido(v.cpf)) er.cpf = 'CPF inválido.';
        ['numero', 'validade', 'cvv', 'titular', 'cpf'].forEach(function (k) { erro(f, k, er[k] || ''); });
        var p1 = ['numero', 'validade', 'cvv', 'titular', 'cpf'].filter(function (k) { return er[k]; })[0];
        if (p1) { f.querySelector('#' + p1).focus(); return; }
        // só bandeira, final, titular e validade ficam (como no site: nada sensível)
        var cs = cartoes(); cs.push({ id: 'c' + Date.now(), bandeira: bandeira(num), final: num.slice(-4), titular: v.titular.toUpperCase(), validade: v.validade, principal: !cs.length });
        gravar('cartoes', cs); d.close(); desenhar(); avisar('Cartão adicionado.');
      });
      setTimeout(function () { f.querySelector('#numero').focus(); }, 30);
    }
    desenhar();
  }

  /* ================================================================== Dispositivos verificados */
  var MAX_DISPOSITIVOS = 15;
  function esteDispositivo() {
    var ua = navigator.userAgent, movel = /Mobi|Android|iPhone|iPad/.test(ua);
    var so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Navegador';
    var nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return { id: 'este', nome: so + (nav ? ' com ' + nav : ''), tipo: movel ? 'mobile' : 'desktop', em: new Date().toISOString(), atual: true };
  }
  function telaDispositivos() {
    var corpo = casca('Dispositivos verificados', 'Aparelhos em que você confirmou sua identidade. Remova os que não usa mais.');
    function lista() { return [esteDispositivo()].concat(ler('dispositivos', [{ id: 'd1', nome: 'iPhone com Safari', tipo: 'mobile', em: '2026-11-02T21:14:00' }, { id: 'd2', nome: 'Windows com Chrome', tipo: 'desktop', em: '2026-09-18T10:02:00' }, { id: 'd3', nome: 'Android com Chrome', tipo: 'mobile', em: '2026-06-07T16:40:00' }])); }
    function desenhar() {
      var l = lista();
      corpo.innerHTML = '<div class="ct-aviso">' + ICO.info + '<span>Você pode verificar até ' + MAX_DISPOSITIVOS + ' dispositivos. Hoje são ' + l.length + '.</span></div>' +
        '<div class="ct-cartoes">' + l.map(function (d) {
          return '<div class="ct-disp"><div class="ct-disp__topo"><span class="ct-disp__ico">' + (d.tipo === 'mobile' ? ICO.celular : ICO.computador) + '</span>' + (d.atual ? '<span class="ct-selo ct-selo--ok">Este dispositivo</span>' : '') + '</div>' +
            '<div><p class="ct-disp__nome">' + esc(d.nome) + '</p><p class="ct-disp__meta">Verificado em ' + esc(dataCurta(d.em)) + '</p></div>' +
            (d.atual ? '' : '<div class="ct-acoes"><button type="button" class="bs" data-remover="' + esc(d.id) + '">Remover</button></div>') + '</div>';
        }).join('') + '</div>';
    }
    corpo.addEventListener('click', function (e) {
      var r = e.target.closest('[data-remover]'); if (!r) return;
      var id = r.getAttribute('data-remover'), d = lista().filter(function (x) { return x.id === id; })[0];
      confirmar({ titulo: 'Remover dispositivo', texto: ['Remover ' + (d ? d.nome : 'este dispositivo') + '? Na próxima vez que você entrar por ele, vamos pedir a confirmação de novo.'], sim: 'Remover', nao: 'Cancelar' }).then(function (ok) {
        if (!ok) return; gravar('dispositivos', lista().filter(function (x) { return !x.atual && x.id !== id; })); desenhar(); avisar('Dispositivo removido com sucesso!');
      });
    });
    desenhar();
  }

  /* ================================================================== Privacidade e segurança */
  var REGRAS = [['8 caracteres ou mais', function (s) { return s.length >= 8; }], ['Uma letra maiúscula', function (s) { return /[A-Z]/.test(s); }], ['Uma letra minúscula', function (s) { return /[a-z]/.test(s); }], ['Um número', function (s) { return /\d/.test(s); }], ['Um caractere especial', function (s) { return /[!@#$%^&*(),.?":{}|<>_\-]/.test(s); }]];
  function telaSeguranca() {
    var corpo = casca('Privacidade e segurança', 'Sua senha, o reconhecimento facial e os documentos que valem para a sua conta.');
    var aberta = false;
    function desenhar() {
      var rosto = ler('facial', null);
      corpo.innerHTML =
        '<form class="ct-bloco" data-form-senha novalidate><div class="ct-bloco__topo"><div><h2 class="ct-bloco__t">Senha</h2><p class="ct-bloco__s">' + (ler('senhaEm', null) ? 'Alterada em ' + esc(dataCurta(ler('senhaEm'))) + '.' : 'Use uma senha que você não usa em outros sites.') + '</p></div>' +
        (aberta ? '' : '<button type="button" class="bs" style="width:auto" data-abrir>Alterar senha</button>') + '</div>' +
        (aberta ? '<div class="ct-grade ct-grade--3">' + campo('atual', 'Senha atual', '', { tipo: 'password', autocomplete: 'current-password' }) + campo('nova', 'Nova senha', '', { tipo: 'password', autocomplete: 'new-password' }) + campo('repete', 'Repita a nova senha', '', { tipo: 'password', autocomplete: 'new-password' }) + '</div>' +
          '<ul class="ct-regras" data-regras aria-label="A nova senha precisa ter">' + REGRAS.map(function (r) { return '<li>' + r[0] + '</li>'; }).join('') + '</ul>' +
          '<div class="ct-acoes"><button type="button" class="bs" data-fechar>Cancelar</button><button type="submit" class="bp">Salvar nova senha</button></div>' : '') + '</form>' +
        '<section class="ct-bloco"><div class="ct-bloco__topo"><div><h2 class="ct-bloco__t">Reconhecimento facial</h2><p class="ct-bloco__s">' + (rosto ? 'Cadastrado em ' + esc(dataCurta(rosto)) + '. Você entra nos eventos com reconhecimento facial sem mostrar o ingresso.' : 'Cadastre seu rosto uma vez e entre nos eventos com reconhecimento facial sem mostrar o ingresso.') + '</p></div>' +
        (rosto ? '<span class="ct-selo ct-selo--ok">Cadastrado</span>' : '<a class="bp" style="width:auto" href="Facial.dc.html">Cadastrar rosto</a>') + '</div></section>' +
        '<section class="ct-bloco"><div class="ct-doc"><div><h2 class="ct-bloco__t">Política de privacidade</h2><p>A Ingresse usa estatísticas de visita (cookies) para melhorar sua navegação. Saiba como tratamos seus dados na política de privacidade.</p></div><a class="bs" style="width:auto" href="#" data-toast="A política de privacidade abre em outra aba no site da Ingresse.">Ler documento</a></div>' +
        '<hr class="ct-sep"><div class="ct-doc"><div><h2 class="ct-bloco__t">Termos de serviço</h2><p>As regras de uso da Ingresse, atualizadas pela última vez em 9 de agosto de 2023.</p></div><a class="bs" style="width:auto" href="#" data-toast="Os termos de serviço abrem em outra aba no site da Ingresse.">Ler documento</a></div></section>';
      var f = corpo.querySelector('[data-form-senha]');
      if (aberta) {
        var nova = f.querySelector('#nova');
        nova.addEventListener('input', function () { var li = f.querySelectorAll('[data-regras] li'); REGRAS.forEach(function (r, i) { li[i].toggleAttribute('data-ok', r[1](nova.value)); }); });
        setTimeout(function () { f.querySelector('#atual').focus(); }, 30);
      }
    }
    corpo.addEventListener('click', function (e) {
      if (e.target.closest('[data-abrir]')) { aberta = true; desenhar(); }
      else if (e.target.closest('[data-fechar]')) { aberta = false; desenhar(); }
    });
    corpo.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-form-senha]'); if (!f) return; e.preventDefault();
      var v = { atual: f.querySelector('#atual').value, nova: f.querySelector('#nova').value, repete: f.querySelector('#repete').value }, er = {};
      if (!v.atual) er.atual = 'A senha atual é obrigatória.'; else if (v.atual.length < 8) er.atual = 'A senha tem pelo menos 8 caracteres.';
      if (!v.nova) er.nova = 'A nova senha é obrigatória.'; else { var falta = REGRAS.filter(function (r) { return !r[1](v.nova); }).map(function (r) { return r[0].toLowerCase(); }); if (falta.length) er.nova = 'Falta: ' + falta.join(', ') + '.'; else if (v.nova === v.atual) er.nova = 'Use uma senha diferente da atual.'; }
      if (!v.repete) er.repete = 'Repita a nova senha.'; else if (v.repete !== v.nova) er.repete = 'As senhas não coincidem.';
      ['atual', 'nova', 'repete'].forEach(function (k) { erro(f, k, er[k] || ''); });
      var p1 = ['atual', 'nova', 'repete'].filter(function (k) { return er[k]; })[0];
      if (p1) { f.querySelector('#' + p1).focus(); return; }
      gravar('senhaEm', new Date().toISOString()); aberta = false; desenhar(); avisar('Senha atualizada com sucesso!');
    });
    desenhar();
  }

  /* ================================================================== Cadastro facial */
  var FAQ = [
    ['O que é biometria facial?', 'Biometria facial é uma tecnologia que reconhece características únicas do rosto de uma pessoa. A partir desses traços, é criado um código exclusivo, que permite distinguir uma pessoa de outra com precisão.'],
    ['Quando devo me cadastrar?', 'O quanto antes. Assim, se aparecer um evento com reconhecimento facial, você já estará pronto para garantir seu ingresso. Alguns eventos exigem o cadastro facial. Ele também traz mais segurança e praticidade: só você usa seu ingresso e não precisa levar nada além do seu rosto para entrar.'],
    ['Quem pode se cadastrar?', 'Qualquer pessoa. Se você vai a jogos de futebol, o cadastro é ainda mais importante: a Lei Geral do Esporte exige reconhecimento facial em estádios com mais de 20 mil pessoas.'],
    ['O que preciso para me cadastrar?', 'Você vai precisar de:<ul><li>Uma conta na Ingresse</li><li>Um documento com foto, como RG ou CNH</li><li>Um celular com câmera para capturar seus dados biométricos</li></ul>'],
    ['Sempre que for a um evento preciso cadastrar meu rosto?', 'Não. O cadastro é feito uma única vez. Depois, você usa o reconhecimento em qualquer evento com essa tecnologia, desde que o ingresso tenha sido comprado pela Ingresse.'],
    ['Já tenho conta na Ingresse. E agora?', 'É só entrar na sua conta e completar o cadastro com os dados biométricos. Tenha em mãos um documento com foto (RG ou CNH) e o celular.'],
  ];
  function telaFacial() {
    var corpo = casca('Cadastro facial', '');
    corpo.innerHTML =
      '<section class="ct-facial"><div><h2>Cadastre seu rosto</h2><p>Entre nos eventos usando só o seu rosto. Sem ingresso na mão nem aplicativo aberto: é só chegar.</p>' +
      '<button type="button" class="bp" data-cadastrar>' + (ler('facial', null) ? 'Ver meu cadastro' : 'Cadastrar agora') + '</button>' +
      '<div class="ct-pilulas"><span>Mais agilidade</span><span>Mais segurança</span><span>Cadastro único</span></div></div><div class="ct-facial__arte" aria-hidden="true">' + ICO.rosto + '</div></section>' +
      '<section class="ct-bloco"><h2 class="ct-bloco__t">Como funciona</h2><div class="ct-passos">' +
      [['Entre na sua conta', 'Seus ingressos ficam ligados ao seu rosto pela sua conta da Ingresse.'], ['Cadastre seu rosto', 'Com a tecnologia de uma empresa parceira, o reconhecimento é ativado de forma rápida e segura.'], ['Vá ao evento', 'Compre ingressos compatíveis e entre usando só o seu rosto, sem papel nem aplicativo.']]
        .map(function (p, i) { return '<div class="ct-passo"><b>' + (i + 1) + '</b><h3>' + p[0] + '</h3><p>' + p[1] + '</p></div>'; }).join('') + '</div></section>' +
      '<section class="ct-bloco"><h2 class="ct-bloco__t">Perguntas frequentes</h2><div class="ct-faq">' + FAQ.map(function (q) { return '<details><summary>' + q[0] + '</summary><div>' + q[1] + '</div></details>'; }).join('') + '</div></section>';
    corpo.addEventListener('click', function (e) { if (e.target.closest('[data-cadastrar]')) fluxo(); });
    function fluxo() {
      var d = dialogo('<div data-passo></div>'), alvo = d.querySelector('[data-passo]'), t = 0;
      function passo(nome) {
        clearTimeout(t);
        var P = {
          inicio: ['Cadastro do rosto', 'Para cadastrar seu rosto, usamos a tecnologia de uma empresa parceira. Uma nova aba vai abrir: conclua o processo por lá e volte para esta página.', '<button class="bs" data-x>Agora não</button><button class="bp" data-ir>Cadastrar rosto</button>'],
          aguardando: ['Aguardando o cadastro', 'Conclua o cadastro na aba que abriu para continuar.', '<button class="bs" data-x>Cancelar</button>'],
          pronto: ['Rosto cadastrado', 'Agora você entra nos eventos com reconhecimento facial de forma rápida e segura.', '<a class="bp" href="Carteira.dc.html">Ver meus ingressos</a>'],
          ja: ['Rosto já cadastrado', 'Seu rosto já está cadastrado. É só comprar ingressos de eventos com reconhecimento facial para entrar com ele.', '<button class="bs" data-refazer>Cadastrar de novo</button><button class="bp" data-x>Fechar</button>'],
        }[nome];
        alvo.innerHTML = '<h2>' + P[0] + '</h2><p>' + P[1] + '</p>' + (nome === 'aguardando' ? '<div class="ct-giro" role="status" aria-label="Aguardando"></div>' : '') + '<div class="ct-acoes">' + P[2] + '</div>';
        if (nome === 'aguardando') t = setTimeout(function () { gravar('facial', new Date().toISOString()); passo('pronto'); var b = corpo.querySelector('[data-cadastrar]'); if (b) b.textContent = 'Ver meu cadastro'; }, 2500); // protótipo: o parceiro conclui sozinho
        var foco = alvo.querySelector('.bp, .bs'); if (foco) foco.focus();
      }
      alvo.addEventListener('click', function (e) {
        if (e.target.closest('[data-x]')) d.close();
        else if (e.target.closest('[data-ir]')) passo('aguardando');
        else if (e.target.closest('[data-refazer]')) passo('inicio');
      });
      d.addEventListener('close', function () { clearTimeout(t); });
      passo(ler('facial', null) ? 'ja' : 'inicio');
    }
  }

  var TELAS = { compras: telaCompras, dados: telaDados, dependentes: telaDependentes, pagamentos: telaPagamentos, dispositivos: telaDispositivos, seguranca: telaSeguranca, facial: telaFacial };
  function iniciar() { (TELAS[TELA] || telaCompras)(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
