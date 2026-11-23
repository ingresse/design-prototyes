/* previa.js: camada da PRÉVIA (não é do v5.3 do Marcelino). Carregado por último em cada tela.
   Não mexe na lógica dos componentes. Faz quatro coisas pequenas:
   1. Tema: ?tema=claro|escuro; sem escolha guardada, acompanha o sistema (direção §10.2.3).
   2. Movimento: ?movimento=reduzido marca <html data-motion="reduce"> (o teste real é a preferência do sistema).
      Com movimento reduzido, a rolagem dos carrosséis (scroller.js) vira direta.
   3. Selos de situação (pré-venda, esgotado, cancelado, encerrado, não aberto) nos cartões da Home e da Busca,
      a partir do campo `situacao` do catálogo sintético (/api/eventos). O v5.3 só conhece "Hoje", "Esta semana"
      e "Pré-venda" fixo; sem isto os estados do §5.5 da direção não apareceriam nas listas.
   4. Pausa: o foco por teclado dentro da vitrine também pausa (já era assim para o mouse).
   5. Raio e marca: ?raio=reto marca <html data-raio="reto"> (variante quadrada, DP-035) para comparar com o 8 px (DE-18);
      ?marca=esportes marca <html data-marca="esportes"> (azul da Ticket Sports, DE-23). Os dois ficam guardados no navegador.
   6. Hero do Evento: cymatics (placa de Chladni) discreto ao fundo, só em tela larga, desenhado em canvas (DE-18).
   7. Preferências: idioma (PT/EN/ES) e tema, raio e marca (opções de desenvolvedor). O menu da conta que as exibe é o módulo tools/previa/menu-conta.js
      (28/10/2026); o seletor de idioma e o botão de tema do cabeçalho do v5.3 ficam escondidos por CSS. */
(function () {
  // o motor de templates do v5.3 pode executar o <script> da helmet duas vezes: sem a guarda, cada clique cairia em dois manipuladores
  if (window.__previaCarregada) return;
  window.__previaCarregada = true;
  var root = document.documentElement;
  var qs = new URLSearchParams(location.search);

  /* ---------- 1. tema ---------- */
  function guardado() {
    try { return localStorage.getItem('prototipo-theme'); } catch (e) { return null; }
  }
  function aplicarTema(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A0A0A' : '#FFFFFF');
  }
  var pedido = qs.get('tema');
  if (pedido === 'escuro' || pedido === 'dark') aplicarTema('dark');
  else if (pedido === 'claro' || pedido === 'light') aplicarTema('light');
  else if (!guardado() && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) aplicarTema('dark');
  else aplicarTema(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  // o seletor de tema do v5.3 troca data-theme; manter a cor da barra do navegador em dia
  new MutationObserver(function () {
    var t = root.getAttribute('data-theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A0A0A' : '#FFFFFF');
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- 1b. raio (DE-18) e marca (DE-23): guardados no navegador, o parâmetro manda ---------- */
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  if (qs.get('raio') === 'reto' || qs.get('raio') === '8') gravar('previa-raio', qs.get('raio'));
  if ((qs.get('marca') === 'esportes' || qs.get('marca') === 'padrao') && !root.hasAttribute('data-marca-fixa')) gravar('previa-marca', qs.get('marca')); /* telas com marca fixa (Esportes, Login) usam ?marca= para outra coisa e não mexem na marca guardada */
  function aplicarRaio(v) { if (v === 'reto') root.setAttribute('data-raio', 'reto'); else root.removeAttribute('data-raio'); }
  function aplicarMarca(v) { if (root.hasAttribute('data-marca-fixa')) return; /* telas da Ingresse Sports (Esportes.dc.html) fixam a marca no <html> */ if (v === 'esportes') root.setAttribute('data-marca', 'esportes'); else root.removeAttribute('data-marca'); }
  aplicarRaio(ler('previa-raio'));
  aplicarMarca(ler('previa-marca'));

  /* ---------- 1c. superfícies do claro (30/10/2026; docs/design/SUPERFICIES-JOAQUIM.md): o gerador põe o modo da página em <html data-superficie> (chao, faixas ou editorial).
     ?superficie=editorial deixa tudo branco (guardado: vale para todas as telas); ?superficie=padrao volta ao desenho de cada página; ?superficie=chao|faixas força o modo só nesta visita.
     O escuro não muda em nenhum modo. ---------- */
  var superficiePadrao = root.getAttribute('data-superficie');
  if (qs.get('superficie') === 'editorial' || qs.get('superficie') === 'padrao') gravar('previa-superficie', qs.get('superficie'));
  function aplicarSuperficie(v) { if (v === 'editorial') root.setAttribute('data-superficie', 'editorial'); else if (superficiePadrao) root.setAttribute('data-superficie', superficiePadrao); else root.removeAttribute('data-superficie'); }
  aplicarSuperficie(ler('previa-superficie'));
  if (qs.get('superficie') === 'chao' || qs.get('superficie') === 'faixas') root.setAttribute('data-superficie', qs.get('superficie'));

  /* ---------- 2. movimento ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  if (qs.get('movimento') === 'reduzido') root.setAttribute('data-motion', 'reduce');
  var reduzido = function () { return mq.matches || root.getAttribute('data-motion') === 'reduce'; };
  var scrollByOrig = Element.prototype.scrollBy;
  Element.prototype.scrollBy = function (a) {
    // atenção: repassar `b` como undefined troca a sobrecarga (x, y) e a rolagem não acontece; usa arguments
    if (reduzido() && a && typeof a === 'object') { var o = {}; for (var k in a) o[k] = a[k]; o.behavior = 'auto'; return scrollByOrig.call(this, o); }
    return scrollByOrig.apply(this, arguments);
  };

  /* ---------- 2b. revelar (30/10/2026, pedido 30/10 A2): UMA função para toda ação que mostra conteúdo abaixo da dobra ----------
     «Gerar Pix», abrir um meio de pagamento no acordeão, o aviso de cartão recusado, o primeiro campo com erro (Quem vai e Como pagar,
     nos três fluxos), o aviso de produto esgotado, a lista de países do telefone e o «Editar produtos». Antes cada um rolava do seu
     jeito (scrollIntoView sem contar o cabeçalho fixo nem a barra de baixo do celular, ou não rolava).
     IX.revelar(alvo, { foco, ate, modo, espera })
       alvo  elemento ou id do bloco revelado (o topo dele fica logo abaixo do cabeçalho fixo)
       ate   elemento, id ou função: o fim que precisa caber acima da barra fixa de baixo (ex.: a lista de países); no modo 'inicio' ele
             tem prioridade sobre o topo (o «Copiar código» do Pix nunca sai da tela)
       foco  elemento, id ou true (= o próprio alvo); recebe foco com preventScroll (quem rola é esta função, uma vez só)
       modo  'inicio' leva o topo do alvo para baixo do cabeçalho; 'perto' (padrão) só rola o que faltar para ele aparecer inteiro
       espera ms depois do próximo quadro (o React monta o bloco depois do setState; o acordeão anima por 300 ms)
     Movimento reduzido: rolagem instantânea. */
  function revelar(alvo, o) {
    o = o || {};
    var pega = function (x) { return typeof x === 'function' ? x() : typeof x === 'string' ? document.getElementById(x) : x; };
    requestAnimationFrame(function () {
      setTimeout(function () {
        var el = pega(alvo); if (!el) return;
        var cab = document.querySelector('.hdr'), barra = document.querySelector('.cbar'), folga = 16;
        var cs = cab ? getComputedStyle(cab) : null;
        var hCab = cab && cs.display !== 'none' && (cs.position === 'sticky' || cs.position === 'fixed') ? Math.max(0, cab.getBoundingClientRect().bottom) : 0;
        var bs = barra ? getComputedStyle(barra) : null;
        var topoBarra = barra && bs.position === 'fixed' && bs.display !== 'none' ? barra.getBoundingClientRect().top : window.innerHeight;
        var r = el.getBoundingClientRect(), fim = pega(o.ate), rf = fim ? fim.getBoundingClientRect() : r;
        var paraTopo = r.top - (hCab + folga), paraFim = rf.bottom - (topoBarra - folga), d;
        if (o.modo === 'inicio') d = fim ? Math.max(paraTopo, paraFim) : paraTopo;
        else if (paraTopo < 0) d = paraTopo;                                  // começa acima da área visível: sobe até o topo
        else if (paraFim > 0) d = Math.min(paraFim, paraTopo);               // termina embaixo da barra: desce o que falta, sem o topo sumir sob o cabeçalho
        else d = 0;
        if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: reduzido() ? 'auto' : 'smooth' });
        var f = o.foco === true ? el : pega(o.foco);
        if (f && f.focus) f.focus({ preventScroll: true });
      }, o.espera == null ? 60 : o.espera);
    });
  }
  (window.IX || (window.IX = {})).revelar = revelar;

  /* ---------- 3. selos de situação ---------- */
  var ICONES = {
    venda: '<path d="M3 9a2 2 0 0 0 0 4v3h18v-3a2 2 0 0 1 0-4V6H3v3Z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    pre: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    'nao-aberto': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    esgotado: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    cancelado: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    encerrado: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M8 3v4M16 3v4"/>'
  };
  /* (30/10/2026) A sincronização dos selos dos cartões de evento pelo nome saiu: o cartão único (cartao-evento.js) calcula o estado a partir do dado, sem remendar o DOM.
     O catálogo (/api/eventos) continua aqui porque os pôsteres de cymatics (decorarCymatics e o observador de «assentar») leem `eventos` para achar o evento pelo id da imagem. */
  var eventos = null;
  function carregar() {
    if (!/\/(Main|Busca)\.dc\.html$/.test(location.pathname)) return;
    fetch('/api/eventos').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.events) return;
      eventos = d.events;
      agendar();
    }).catch(function () {});
  }

  /* selo do hero do Evento: o v5.3 só troca o texto ("Ingresse · à venda"); aqui o texto vira forma + ícone (§5.5) */
  var ROTULO_SIT = { 'à venda': 'venda', 'pré-venda': 'pre', 'venda não aberta': 'nao-aberto', 'não aberto': 'nao-aberto', 'esgotado': 'esgotado', 'cancelado': 'cancelado', 'encerrado': 'encerrado' };
  function decorarTagsEvento() {
    var tags = document.querySelectorAll('.ev-hero-info .tag-lg, .ev-title-m .tag-lg');
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      var m = [0, t.textContent.replace(/\s+/g, ' ').split('·').pop().trim()];
      var sit = m ? ROTULO_SIT[m[1].toLowerCase()] : null;
      if (!sit) {
        // selo que traz o próprio ícone e o próprio data-sit no modelo (Adiado, Alterado): tira o ícone que sobrou do estado anterior
        var velho = t.querySelector(':scope > svg.sit-ico:not([data-dc-tpl])');
        if (velho) velho.remove();
        continue;
      }
      if (t.getAttribute('data-sit') !== sit) t.setAttribute('data-sit', sit);
      var ico = t.querySelector(':scope > svg.sit-ico');
      if (!ico || ico.getAttribute('data-ico') !== sit) {
        if (ico) ico.remove();
        var holder = document.createElement('span');
        holder.innerHTML = '<svg class="ico sit-ico" data-ico="' + sit + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[sit] + '</svg>';
        t.insertBefore(holder.firstChild, t.firstChild);
      }
    }
  }


  /* ---------- 6. hero do Evento: cymatics discreto ao fundo ----------
     Placa de Chladni: F = cos(nπu+φ)·cos(mπv) + b·cos(mπu+φ)·cos(nπv); a linha nodal é onde |F| ≈ 0.
     Branco com um toque de vermelho, opacidade baixa e máscara que apaga o lado do texto: não atrapalha a leitura.
     Só a partir de 1024 px, sem loop (aparece em 1,8 s e fica); com movimento reduzido aparece já pronto. */
  var LARGA = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : { matches: true };
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  /* Estilos musicais: cada um é uma placa de Chladni com sua cara (frequência = densidade e ritmo, b = simetria, matiz = família do manual).
     m e n dão a faixa de frequência; a semente do evento escolhe dentro dela, então dois eventos do mesmo estilo não saem iguais. */
  var ESTILOS = {
    eletronica: { m: [13, 16], n: [7, 9], b: 1.0, hue: [8, 242, 249] },      // denso e regular, batida marcada
    pagode:     { m: [3, 4], n: [2, 3], b: -0.55, hue: [244, 126, 72] },    // largo e ondulado, roda de samba
    rock:       { m: [9, 10], n: [3, 4], b: 0.8, hue: [201, 104, 199] },     // cruzado e áspero
    jazz:       { m: [7, 8], n: [5, 6], b: 0.3, hue: [190, 220, 248] },     // fino e livre, quase sem simetria
    festival:   { m: [6, 7], n: [4, 5], b: 0.6, hue: [250, 204, 60] },      // médio e festivo, vários palcos
    reveillon:  { m: [2, 3], n: [2, 3], b: 1.0, hue: [255, 214, 120] },     // poucos anéis amplos, contagem e fogos
    // páginas de categoria (Categoria.dc.html): o matiz vem da cor da categoria (tools/previa/categorias.json); aqui só a frequência e a simetria
    pista:      { m: [4, 5], n: [4, 5], b: 1.0 },      // festa e balada: anéis concêntricos, pista de dança
    bola:       { m: [5, 6], n: [3, 4], b: 0.7 },      // futebol: gomos largos, de bola
    quadra:     { m: [6, 7], n: [2, 3], b: 0.35 },     // esportes: linhas de quadra
    faixas:     { m: [11, 13], n: [2, 3], b: -0.8 },   // corridas: faixas longas, de pista
    cortina:    { m: [2, 3], n: [1, 2], b: 0.4 },      // teatro: dobras largas, de cortina
    mesa:       { m: [4, 5], n: [3, 4], b: 0.9 },      // gastronomia: toalha, quadriculado macio
    ciranda:    { m: [3, 4], n: [3, 4], b: 0.55 },     // kids: roda, poucas voltas e redondas
    campus:     { m: [8, 9], n: [4, 5], b: 0.75 },     // universitário (MVP, 15/11/2026): grade animada, de pátio e arquibancada
    riso:       { m: [3, 4], n: [2, 3], b: -0.7 },     // stand-up (MVP): ondas largas e assimétricas, de gargalhada
    estandes:   { m: [5, 6], n: [5, 6], b: 0.15 },     // feiras e exposições (MVP): quadras regulares, de corredor de estandes
    // Ingresse Sports (direção de arte, 27/10/2026): um matiz só (250 ± 12, --color-sport-cymatics) e só a frequência e a simetria mudam por modalidade.
    // Fonte dos números: tokens-mvp.json › motion.cymatics.sport.* (faixas e quadra acima são os mesmos valores)
    trilha:     { m: [9, 10], n: [3, 4], b: 0.45 },    // trail, caminhada, aventura: irregular e áspero, de relevo
    estrada:    { m: [7, 8], n: [1, 2], b: -0.6 },     // ciclismo, mountain bike: fluxo longo, de roda
    onda:       { m: [2, 3], n: [1, 2], b: 0.4 },      // natação, canoagem, triatlo: dobras largas, de água
    circuito:   { m: [4, 5], n: [4, 5], b: 1.0 }       // circuitos e desafios virtuais: anéis concêntricos, de série
  };
  function estiloDe(texto) {
    var t = (texto || '').toLowerCase();
    if (/r[ée]veillon|virada|ano novo/.test(t)) return 'reveillon';
    if (/alok|solomun|boris|d-edge|eletr[ôo]nic|house|techno|rave|nave|moving|freak|victor lou/.test(t)) return 'eletronica';
    if (/sorriso|pagode|samba|forr[óo]|sertan|roda de|jant[ôo]/.test(t)) return 'pagode';
    if (/rock|metal|punk/.test(t)) return 'rock';
    if (/jazz|mpb|blues|bossa/.test(t)) return 'jazz';
    if (/primavera|festival|lollapalooza|rock in rio/.test(t)) return 'festival';
    return 'festival';
  }
  function desenharCymatics(cv, semente, estilo, cor) { // cor [r, g, b] opcional: a cor da categoria (sem o toque de vermelho)
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w; cv.height = h;
    var E_ = ESTILOS[estilo] || ESTILOS.festival;
    var m = E_.m[0] + (semente % (E_.m[1] - E_.m[0] + 1)), n = E_.n[0] + ((semente >> 3) % (E_.n[1] - E_.n[0] + 1)); if (n === m) n += 1;
    var b = E_.b * (semente % 2 ? 1 : 0.9), ph = (semente % 97) * 0.37, hue = cor || E_.hue;
    var A = new Float32Array(w), C = new Float32Array(w), B = new Float32Array(h), E = new Float32Array(h), i, j;
    for (i = 0; i < w; i++) { var u = i / (w - 1); A[i] = Math.cos(n * Math.PI * u + ph); C[i] = Math.cos(m * Math.PI * u + ph); }
    for (j = 0; j < h; j++) { var v = j / (h - 1); B[j] = Math.cos(m * Math.PI * v); E[j] = Math.cos(n * Math.PI * v); }
    var ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, EPS = 0.075;
    for (j = 0; j < h; j++) {
      for (i = 0; i < w; i++) {
        var a = Math.abs(A[i] * B[j] + b * C[i] * E[j]);
        if (a >= EPS) continue;
        var k = 1 - a / EPS, o = (j * w + i) * 4;
        // linha nodal no matiz do estilo (discreta: no máximo ~20 % de opacidade) e um toque de vermelho na borda
        if (k > 0.6) { d[o] = hue[0]; d[o + 1] = hue[1]; d[o + 2] = hue[2]; d[o + 3] = Math.round(k * (cor ? 51 : 54)); } // categoria: no máximo 20 % de opacidade
        else if (cor) { d[o] = hue[0]; d[o + 1] = hue[1]; d[o + 2] = hue[2]; d[o + 3] = Math.round(k * 30); } // borda na mesma cor, mais fraca
        else { d[o] = 255; d[o + 1] = 39; d[o + 2] = 26; d[o + 3] = Math.round(k * 40); }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  // o desenhador é um só: as páginas de categoria (categoria.js) o chamam por aqui, com a cor da categoria
  window.IngresseCym = { desenhar: function (cv, semente, estilo, cor) { desenharCymatics(cv, semente, estilo, cor); }, hash: hash, estilos: ESTILOS };
  function decorarCymatics() {
    // Evento (.ev-hero) e Home (.vit): cymatics discreto atrás do conteúdo, em tela larga.
    // Troca de evento (slide da Home) = a placa do estilo do novo evento entra por cima da anterior (crossfade) e a antiga sai.
    var herois = document.querySelectorAll('.ev-hero, .vit:not([data-cym])'); // .vit[data-cym]: hero de categoria, desenhado por categoria.js com a cor da categoria
    if (!LARGA.matches) return;
    for (var h = 0; h < herois.length; h++) {
      var hero = herois[h], home = hero.classList.contains('vit');
      var titulo = hero.querySelector(home ? '.vit-title' : '.ev-title');
      var apoio = hero.querySelector(home ? '.vit-info' : '.ev-hero-info');
      var texto = ((titulo ? titulo.textContent : '') + ' ' + (apoio ? apoio.textContent : '')).replace(/\s+/g, ' ').trim();
      var chave = (titulo ? titulo.textContent.trim() : '') || 'evento';
      var atual = hero.querySelector(':scope > canvas.ev-hero-cym:not(.is-out)');
      if (atual && atual.getAttribute('data-chave') === chave) continue;
      if (!titulo && atual) continue; // vitrine ainda sem título (re-render): mantém a placa de agora
      var estilo = estiloDe(texto);
      var cv = document.createElement('canvas');
      cv.className = 'ev-hero-cym';
      cv.setAttribute('aria-hidden', 'true');
      cv.setAttribute('data-chave', chave);
      cv.setAttribute('data-estilo', estilo);
      hero.insertBefore(cv, hero.firstChild);
      desenharCymatics(cv, hash(chave), estilo);
      if (window.ResizeObserver && !hero._obsCym) {
        hero._obsCym = new ResizeObserver((function (hr) { return function () { clearTimeout(hr._tc); hr._tc = setTimeout(function () { var c = hr.querySelector(':scope > canvas.ev-hero-cym:not(.is-out)'); if (c) desenharCymatics(c, hash(c.getAttribute('data-chave') || ''), c.getAttribute('data-estilo')); }, 120); }; })(hero));
        hero._obsCym.observe(hero);
      }
      if (atual) {
        atual.classList.remove('is-on'); atual.classList.add('is-out');
        setTimeout((function (c) { return function () { c.remove(); }; })(atual), 1100);
      }
      setTimeout((function (c) { return function () { c.classList.add('is-on'); }; })(cv), 60);
    }
  }

  /* ---------- 6b. capa do artista: cymatics discretíssimo atrás da foto e do texto ----------
     .art-capa (tools/previa/capa-artista.mjs): a mesma placa de Chladni do hero, no estilo do artista (data-estilo ou deduzido do gênero),
     em qualquer largura (a foto da banda fica por cima, à direita; a máscara em CSS enfraquece as linhas atrás do texto). */
  function decorarCapaArtista() {
    var capas = document.querySelectorAll('.art-capa');
    for (var c = 0; c < capas.length; c++) {
      var capa = capas[c];
      if (capa.querySelector(':scope > canvas.art-capa-cym')) continue;
      var nome = capa.getAttribute('data-artista') || 'artista';
      var estilo = capa.getAttribute('data-estilo') || estiloDe(nome + ' ' + (capa.getAttribute('data-genero') || ''));
      var cv = document.createElement('canvas');
      cv.className = 'art-capa-cym';
      cv.setAttribute('aria-hidden', 'true');
      cv.setAttribute('data-chave', nome);
      cv.setAttribute('data-estilo', estilo);
      capa.insertBefore(cv, capa.firstChild);
      desenharCymatics(cv, hash(nome), estilo);
      if (window.ResizeObserver) {
        new ResizeObserver((function (cp) { return function () { clearTimeout(cp._tc); cp._tc = setTimeout(function () { var k = cp.querySelector(':scope > canvas.art-capa-cym'); if (k) desenharCymatics(k, hash(k.getAttribute('data-chave') || ''), k.getAttribute('data-estilo')); }, 120); }; })(capa)).observe(capa);
      }
      setTimeout((function (k) { return function () { k.classList.add('is-on'); }; })(cv), 60);
    }
  }

  /* ---------- 8. cymatics: animação de carregamento nos pôsteres por código ----------
     O pôster cymatics (/cymatics/evt-N.png) "assenta" em 1,8 s quando entra na tela: linhas grossas e granuladas afinam até a figura
     final (a mesma conta do espécime e do servidor, então o último quadro é igual ao PNG e a troca não pisca). Sem movimento: nada. */
  var FAMC = { sertanejo: { hue: [244, 126, 72], m: 5, n: 2, b: -0.55 }, eletronica: { hue: [8, 242, 249], m: 9, n: 5, b: 1 }, rock: { hue: [201, 104, 199], m: 8, n: 3, b: 0.8 }, jazz: { hue: [190, 220, 248], m: 7, n: 5, b: 0.3 } };
  var GENC = { rock: 'rock', eletronica: 'eletronica', pop: 'sertanejo', mpb: 'jazz', samba: 'sertanejo', forro: 'sertanejo', jazz: 'jazz', futebol: 'eletronica', volei: 'eletronica', corrida: 'eletronica', drama: 'jazz', musical: 'rock', circo: 'sertanejo', jantar: 'sertanejo', exposicao: 'jazz', passeio: 'jazz' };
  function paramsCym(ev) {
    var fam = FAMC[GENC[ev.art.genre] || 'jazz'], seed = ev.art.seed;
    var m = Math.max(2, fam.m - 2 + (seed % 5)), n = Math.max(1, fam.n - 1 + ((seed >> 2) % 3));
    if (n === m) n += 1;
    return { m: m, n: n, b: fam.b * (seed % 2 ? 1 : 0.9), ph: (seed % 97) * 0.37, hue: fam.hue };
  }
  function animarPoster(img, ev) {
    var W = 480, H = 640, p = paramsCym(ev), i, j;
    var pai = img.parentElement;
    if (!pai || getComputedStyle(pai).position === 'static') pai.style.position = 'relative';
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'cym-load'; cv.setAttribute('aria-hidden', 'true');
    cv.style.left = img.offsetLeft + 'px'; cv.style.top = img.offsetTop + 'px'; cv.style.width = img.offsetWidth + 'px'; cv.style.height = img.offsetHeight + 'px';
    pai.appendChild(cv);
    var A = new Float32Array(W), C = new Float32Array(W), B = new Float32Array(H), E = new Float32Array(H);
    for (i = 0; i < W; i++) { var u = i / (W - 1); A[i] = Math.cos(p.n * Math.PI * u + p.ph); C[i] = Math.cos(p.m * Math.PI * u + p.ph); }
    for (j = 0; j < H; j++) { var v = j / (H - 1); B[j] = Math.cos(p.m * Math.PI * v); E[j] = Math.cos(p.n * Math.PI * v); }
    var ctx = cv.getContext('2d'), im = ctx.createImageData(W, H), d = im.data, RED = [255, 39, 26], BG = 10;
    function quadro(eps, grain) {
      for (j = 0; j < H; j++) {
        for (i = 0; i < W; i++) {
          var a = Math.abs(A[i] * B[j] + p.b * C[i] * E[j]), o = (j * W + i) * 4, k = 0, r = BG, g = BG, bl = BG;
          var ruido = grain > 0 ? 1 - grain * Math.random() : 1;
          if (a < eps * 0.45) { r = p.hue[0]; g = p.hue[1]; bl = p.hue[2]; k = ruido; }
          else if (a < eps) { r = RED[0]; g = RED[1]; bl = RED[2]; k = (1 - a / eps) * 0.55 * ruido; }
          d[o] = BG + (r - BG) * k; d[o + 1] = BG + (g - BG) * k; d[o + 2] = BG + (bl - BG) * k; d[o + 3] = 255;
        }
      }
      ctx.putImageData(im, 0, 0);
    }
    var dur = 1800, t0 = performance.now(), EPS = 0.085;
    (function passo() {
      var t = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      quadro(0.9 - (0.9 - EPS) * e, (1 - e) * 0.85);
      if (t < 1) setTimeout(passo, 24); else cv.remove();
    })();
  }
  var jaAnimou = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  var obsPoster = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      if (!en.isIntersecting) return;
      obsPoster.unobserve(en.target);
      var m = /\/cymatics\/evt-(\d+)\.png/.exec(en.target.getAttribute('src') || '');
      var ev = m && eventos && eventos.filter(function (x) { return String(x.id) === m[1]; })[0];
      if (ev && ev.art && !reduzido()) animarPoster(en.target, ev);
    });
  }, { threshold: 0.3 }) : null;
  function cymaticsDeCarregamento() {
    if (!obsPoster || !jaAnimou || !eventos) return;
    var imgs = document.querySelectorAll('img[src*="./cymatics/evt-"]');
    for (var i = 0; i < imgs.length; i++) {
      if (jaAnimou.has(imgs[i]) || imgs[i].closest('.vit')) continue; // a vitrine usa pôster real
      jaAnimou.add(imgs[i]);
      obsPoster.observe(imgs[i]);
    }
  }

  /* ---------- 7. preferências do protótipo: idioma e opções de desenvolvedor (tema, raio, marca) ----------
     O MENU da conta (avatar, notificações, idioma, opções de desenvolvedor) é um módulo só, tools/previa/menu-conta.{js,css,mjs}; ele desenha os botões
     com data-pv-lang e data-pv e este trecho aplica a escolha (e a Login usa o mesmo data-pv-lang). Botão de menu (role=menuitemradio) leva aria-checked; os demais, aria-pressed. */
  // os quatro idiomas do site (Wander, 03/11/2026): [código guardado, lang do <html>, nome, rótulo curto]; menu da conta, Login e rodapé usam esta lista
  var IDIOMAS = [['PT', 'pt-BR', 'Português (Brasil)', 'PT-BR', 'br'], ['PT-PT', 'pt-PT', 'Português (Portugal)', 'PT-PT', 'pt'], ['ES', 'es', 'Español', 'ES', 'es'], ['EN', 'en', 'English', 'EN', 'us']]; // [4] = bandeira (assets/flags): Brasil, Portugal, Espanha, Estados Unidos
  function idiomaAtual() { return ler('prototipo-lang') || 'PT'; }
  function marcarEscolha(el, ativo) { el.setAttribute(el.getAttribute('role') === 'menuitemradio' ? 'aria-checked' : 'aria-pressed', String(ativo)); }
  function aplicarIdioma(cod) {
    gravar('prototipo-lang', cod);
    for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i][0] === cod) root.setAttribute('lang', IDIOMAS[i][1]);
    var bs = document.querySelectorAll('[data-pv-lang]');
    for (var j = 0; j < bs.length; j++) marcarEscolha(bs[j], bs[j].getAttribute('data-pv-lang') === cod);
    var nome = IDIOMAS[0][2], band = IDIOMAS[0][4]; for (var k = 0; k < IDIOMAS.length; k++) if (IDIOMAS[k][0] === cod) { nome = IDIOMAS[k][2]; band = IDIOMAS[k][4]; }
    var ns = document.querySelectorAll('[data-pv-lang-nome]'); // o rótulo do seletor do rodapé mostra o idioma escolhido, com a bandeira
    for (var n = 0; n < ns.length; n++) ns[n].textContent = nome;
    var bd = document.querySelectorAll('[data-pv-lang-band]');
    for (var m = 0; m < bd.length; m++) bd[m].setAttribute('src', './assets/flags/' + band + '.svg');
  }
  var DEV = {
    tema: ['Tema', [['light', 'Claro'], ['dark', 'Escuro']], function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }],
    raio: ['Raio dos cantos', [['8', '8 px'], ['reto', 'Reto']], function () { return root.getAttribute('data-raio') === 'reto' ? 'reto' : '8'; }],
    superficie: ['Superfícies do claro', [['padrao', 'Chão cinza e faixas'], ['editorial', 'Tudo branco']], function () { return root.getAttribute('data-superficie') === 'editorial' ? 'editorial' : 'padrao'; }],
    marca: ['Marca', [['padrao', 'Ingresse'], ['esportes', 'Ingresse Sports (mesma cor da Ingresse)']], function () { return root.getAttribute('data-marca') === 'esportes' ? 'esportes' : 'padrao'; }],
    // provas da Ingresse Sports nas telas de descoberta (03/11/2026; esportes-interruptor-cedo.js): ocultas por padrão; o futebol continua
    esportes: ['Eventos esportivos', [['off', 'Ocultos'], ['on', 'Visíveis']], function () { return root.getAttribute('data-esportes') === 'on' ? 'on' : 'off'; }],
    // de onde vem o catálogo (03/11/2026; esportes-interruptor-cedo.js e tools/previa/bff/bff.mjs): mock fixo, sem base, ou o BFF de descoberta
    dados: ['Dados dos eventos', [['mock', 'Mock fixo'], ['bff', 'BFF (ingr-mock)']], function () { return root.getAttribute('data-dados') === 'bff' ? 'bff' : 'mock'; }]
  };
  // BFF escolhido mas indisponível: a página mostrou o mock fixo; avisa uma vez por carga, com o motivo
  (function () {
    var avisou = false;
    function conferir() {
      var m = root.getAttribute('data-dados-falha');
      if (avisou || m === null || !document.body) return;
      avisou = true;
      var msg = 'BFF indisponível (' + m + '). Mostrando o mock fixo.';
      if (window.console) console.warn('[prévia] ' + msg);
      (function tentar(n) { if (window.IX && IX.toast) IX.toast(msg); else if (n < 40) setTimeout(function () { tentar(n + 1); }, 100); })(0); // o toast da prévia (IX.toast, abaixo) fica pronto depois do DOMContentLoaded
    }
    if (window.MutationObserver) new MutationObserver(conferir).observe(root, { attributes: true, attributeFilter: ['data-dados-falha'] });
    document.addEventListener('DOMContentLoaded', conferir);
  })();
  function atualizarDev() {
    var bs = document.querySelectorAll('[data-pv]');
    for (var i = 0; i < bs.length; i++) {
      var par = bs[i].getAttribute('data-pv').split(':');
      if (DEV[par[0]]) marcarEscolha(bs[i], DEV[par[0]][2]() === par[1]);
    }
  }
  window.IngressePrefs = { idiomas: IDIOMAS, idioma: idiomaAtual, aplicarIdioma: aplicarIdioma, dev: DEV, atualizar: function () { aplicarIdioma(idiomaAtual()); atualizarDev(); } };
  // o rodapé (rodape.mjs) é desenhado pelo template DEPOIS deste script: quando o seletor de idioma dele aparece (ou é redesenhado), marca o idioma guardado
  (function () {
    var pendente = false;
    function conferir() { pendente = false; var n = document.querySelector('[data-pv-lang-nome]'); if (!n) return; var cod = idiomaAtual(), nome = IDIOMAS[0][2]; for (var i = 0; i < IDIOMAS.length; i++) if (IDIOMAS[i][0] === cod) nome = IDIOMAS[i][2]; if (n.textContent !== nome || !document.querySelector('.rp-idioma__op[data-pv-lang="' + cod + '"][aria-checked="true"]')) aplicarIdioma(cod); }
    if (window.MutationObserver) new MutationObserver(function () { if (!pendente) { pendente = true; requestAnimationFrame(conferir); } }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', conferir);
    // o seletor de idioma do rodapé flutua (não empurra a página): fecha com clique fora e com Esc, e o foco volta ao botão
    document.addEventListener('click', function (e) { var ab = document.querySelectorAll('details.rp-idioma[open]'); for (var i = 0; i < ab.length; i++) if (!ab[i].contains(e.target)) ab[i].open = false; });
    document.addEventListener('focusout', function (e) { var d = e.target.closest && e.target.closest('details.rp-idioma[open]'); if (d && e.relatedTarget && !d.contains(e.relatedTarget)) d.open = false; }); // saiu com Tab: fecha (Bessa, R2). Sem relatedTarget (clique no Safari, que não foca botão) não fecha: o clique fora já fecha
    document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; var d = document.querySelector('details.rp-idioma[open]'); if (d) { d.open = false; var s = d.querySelector('summary'); if (s) s.focus(); } });
    // Dropdown do Untitled UI (React Aria Menu): ao abrir, o foco vai ao item escolhido; setas, Home e End movem entre os itens (role=menuitemradio, tabindex=-1)
    document.addEventListener('toggle', function (e) { var d = e.target; if (!d.matches || !d.matches('details.rp-idioma') || !d.open) return; var it = d.querySelector('[role="menuitemradio"][aria-checked="true"]') || d.querySelector('[role="menuitemradio"]'); if (it) it.focus(); }, true);
    document.addEventListener('keydown', function (e) {
      var it = e.target.closest && e.target.closest('.rp-idioma__lista [role="menuitemradio"]'); if (!it) return;
      var todos = Array.prototype.slice.call(it.closest('[role="menu"]').querySelectorAll('[role="menuitemradio"]')), i = todos.indexOf(it), n = todos.length, alvo = -1;
      if (e.key === 'ArrowDown') alvo = (i + 1) % n; else if (e.key === 'ArrowUp') alvo = (i - 1 + n) % n; else if (e.key === 'Home') alvo = 0; else if (e.key === 'End') alvo = n - 1; else return;
      e.preventDefault(); todos[alvo].focus();
    });
  })();

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var li = t.closest('[data-pv-lang]');
    if (li) { aplicarIdioma(li.getAttribute('data-pv-lang')); var dt = li.closest('details'); if (dt) { dt.open = false; var sm = dt.querySelector('summary'); if (sm) sm.focus(); } return; }
    var dv = t.closest('[data-pv]');
    if (dv) {
      var par = dv.getAttribute('data-pv').split(':');
      if (par[0] === 'tema') { gravar('prototipo-theme', par[1]); aplicarTema(par[1]); }
      else if (par[0] === 'raio') { gravar('previa-raio', par[1]); aplicarRaio(par[1]); }
      else if (par[0] === 'marca') { gravar('previa-marca', par[1]); aplicarMarca(par[1]); }
      else if (par[0] === 'superficie') { gravar('previa-superficie', par[1]); aplicarSuperficie(par[1]); }
      else if (par[0] === 'esportes') { if (DEV.esportes[2]() !== par[1]) { gravar('previa-esportes', par[1]); location.reload(); return; } } // o catálogo é filtrado na chegada: recarrega
      else if (par[0] === 'dados') { if (DEV.dados[2]() !== par[1]) { gravar('previa-dados', par[1]); location.reload(); return; } } // a fonte é escolhida antes do app buscar o catálogo: recarrega
      atualizarDev();
      return;
    }
  }, true);

  var agendado = false;
  /* Artistas em alta (Home): o nome fica numa linha só. Reduz a fonte até caber (mínimo 14 px) e, se ainda não couber, corta com reticências. */
  function ajustarNomesArtistas() {
    var nomes = document.querySelectorAll('.art-nome');
    for (var i = 0; i < nomes.length; i++) {
      var a = nomes[i], cel = a.parentElement;
      if (!cel || !cel.clientWidth) continue;
      var alvo = parseFloat(a.getAttribute('data-fs') || '16'), tam = alvo, limite = cel.clientWidth;
      a.style.fontSize = tam + 'px';
      while (a.offsetWidth > limite && tam > 14) { tam -= 0.5; a.style.fontSize = tam + 'px'; }
    }
  }
  function agendar() {
    if (agendado) return;
    agendado = true;
    // rAF com plano B: em aba ou painel oculto o rAF não dispara, e as opções de desenvolvedor não apareceriam
    var feito = false;
    function rodar() {
      if (feito) return;
      feito = true;
      agendado = false;
      decorarTagsEvento(); decorarCymatics(); decorarCapaArtista(); cymaticsDeCarregamento(); ajustarNomesArtistas();
    }
    requestAnimationFrame(rodar);
    setTimeout(rodar, 120);
  }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var t = muts[i].target;
      if (t && t.closest && (t.closest('.sit') || t.closest('svg.sit-ico'))) continue;
      if (muts[i].addedNodes.length && muts[i].addedNodes[0].classList && muts[i].addedNodes[0].classList.contains('sit')) continue;
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', carregar); else carregar();
  agendar();
      return;
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  agendar();

  /* ---------- 3b. Busca: o v5.3 abre com "samba" digitado; no catálogo sintético isso dá zero resultado.
     Abre com o campo vazio (todos os eventos) ou com ?q=termo. */
  if (/\/Busca\.dc\.html$/.test(location.pathname)) {
    var tentativas = 0;
    (function preencher() {
      var campo = document.querySelector('input[type="search"]');
      // espera o motor de templates assumir o campo (data-dc-tpl); antes disso o oninput ainda aponta para onQuery, que não existe
      if (!campo || !campo.hasAttribute('data-dc-tpl')) { if (tentativas++ < 80) setTimeout(preencher, 100); return; }
      var alvo = qs.get('q') || '';
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(campo, alvo);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    })();
  }

  /* ---------- 8. opções de simulação: engrenagem que abre e fecha o painel dos cenários ---------- */
  // O <details class="proto"> do v5.3 abre e fecha sozinho; aqui só entra a suavidade (painel sobe e some com o tempo do movimento),
  // Esc e clique fora para fechar. Delegação no documento: o motor de templates pode refazer o nó.
  root.classList.add('proto-anim');
  function duracaoPainel(p) {
    var el = p.querySelector('.proto-in');
    if (!el) return 0;
    var d = getComputedStyle(el).transitionDuration.split(',')[0].trim();
    return (parseFloat(d) || 0) * (/ms$/.test(d) ? 1 : 1000);
  }
  function abrirPainel(p) {
    clearTimeout(p.__fecha);
    p.open = true;
    p.__aberto = true;
    var el = p.querySelector('.proto-in');
    if (el) void getComputedStyle(el).opacity; // fixa o estado fechado (opacity 0) antes de trocar a classe, sem depender de rAF (a aba em segundo plano não o dispara)
    p.classList.add('is-in');
  }
  function fecharPainel(p) {
    if (!p.open) return;
    p.__aberto = false;
    p.classList.remove('is-in');
    var ms = duracaoPainel(p);
    clearTimeout(p.__fecha);
    if (!ms) { p.open = false; return; }
    p.__fecha = setTimeout(function () { if (!p.__aberto) p.open = false; }, ms + 30);
  }
  document.addEventListener('click', function (e) {
    var sum = e.target.closest && e.target.closest('.proto > summary');
    if (sum) {
      e.preventDefault();
      var p = sum.parentNode;
      if (!sum.title) sum.title = 'Simulação';
      if (p.open && p.__aberto !== false) fecharPainel(p); else abrirPainel(p);
      return;
    }
    document.querySelectorAll('.proto[open]').forEach(function (p) { if (!p.contains(e.target)) fecharPainel(p); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.proto[open]').forEach(function (p) {
      fecharPainel(p);
      var sum = p.querySelector(':scope > summary');
      if (sum && p.contains(document.activeElement)) sum.focus();
    });
  });

  /* ---------- 4. foco por teclado pausa a vitrine ---------- */
  // (o v5.3 já pausa em onFocus/onBlur do carrossel; nada a fazer aqui, só registrado no LEIA-ME)

  /* ---------- 9. toast na anatomia do Untitled UI (Notification: ícone, título/texto, fechar) ----------
     Substitui o IX.toast do ux.js (v5.3), mantendo a API IX.toast(msg, kind) e o atributo data-toast.
     kind: 'ok' | 'info' (padrão) | 'warn' | 'erro'. Terceiro argumento opcional: título (a mensagem vira o texto).
     Ícones: CheckCircle, InfoCircle, AlertTriangle, AlertCircle e XClose do @untitledui/icons (24 px, traço 2).
     Fecha em 4 s, pausa com mouse ou foco dentro, botão de fechar de 48 px, aria-live (assertivo no erro). */
  (function () {
    var IX = window.IX;
    if (!IX) return;
    var ICO = {
      ok: '<path d="m7.5 12 3 3 6-6m5.5 3c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/>',
      info: '<path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/>',
      warn: '<path d="M12 9v4m0 4h.01M10.615 3.892 2.39 18.098c-.456.788-.684 1.182-.65 1.506a1 1 0 0 0 .406.705c.263.191.718.191 1.629.191h16.45c.91 0 1.365 0 1.628-.191a1 1 0 0 0 .407-.705c.034-.324-.195-.718-.65-1.506L13.383 3.892c-.454-.785-.681-1.178-.978-1.31a1 1 0 0 0-.813 0c-.296.132-.523.525-.978 1.31Z"/>',
      erro: '<path d="M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/>',
      fechar: '<path d="M18 6 6 18M6 6l12 12"/>'
    };
    var svg = function (k) { return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[k] + '</svg>'; };
    var host = null, timer = 0, parado = false;
    var duracao = 4000; // com ação ("Desfazer") o aviso fica 8 s
    function agendar() { clearTimeout(timer); timer = setTimeout(function () { if (host) host.classList.remove('is-on'); }, duracao); }
    function montar() {
      host = document.createElement('div');
      host.className = 'ix-toast';
      host.setAttribute('aria-atomic', 'true');
      host.innerHTML = '<span class="ix-toast__ic"></span><div class="ix-toast__body"><p class="ix-toast__title"></p><p class="ix-toast__txt"></p><button type="button" class="ix-toast__acao" hidden></button></div>' +
        '<button type="button" class="ix-toast__x" aria-label="Fechar aviso">' + svg('fechar') + '</button>';
      host.querySelector('.ix-toast__x').addEventListener('click', function () { clearTimeout(timer); host.classList.remove('is-on'); });
      host.addEventListener('mouseenter', function () { parado = true; clearTimeout(timer); });
      host.addEventListener('mouseleave', function () { parado = false; if (host.classList.contains('is-on')) agendar(); });
      host.addEventListener('focusin', function () { clearTimeout(timer); });
      host.addEventListener('focusout', function () { if (!host.contains(document.activeElement) && host.classList.contains('is-on') && !parado) agendar(); });
      document.body.appendChild(host);
    }
    var toast = function (msg, kind, titulo, acao) { // acao opcional: { rotulo, fn } (ação do Notification do Untitled UI: texto em link, "Desfazer")
      if (!host) montar();
      var k = ICO[kind] && kind !== 'fechar' ? kind : 'info';
      host.setAttribute('role', k === 'erro' ? 'alert' : 'status');
      host.setAttribute('aria-live', k === 'erro' ? 'assertive' : 'polite');
      host.dataset.kind = k;
      host.querySelector('.ix-toast__ic').innerHTML = svg(k);
      var t = host.querySelector('.ix-toast__title'), x = host.querySelector('.ix-toast__txt');
      // sem título, a mensagem ocupa o lugar do título (como no IconNotification do UUI com uma linha só)
      t.textContent = titulo || msg;
      x.textContent = titulo ? msg : '';
      x.hidden = !titulo;
      var bt = host.querySelector('.ix-toast__acao');
      if (acao && acao.fn) {
        bt.hidden = false; bt.textContent = acao.rotulo || 'Desfazer';
        bt.onclick = function () { clearTimeout(timer); host.classList.remove('is-on'); try { acao.fn(); } catch (e) {} };
      } else { bt.hidden = true; bt.onclick = null; }
      duracao = acao && acao.fn ? 8000 : 4000;
      host.classList.remove('is-on');
      void host.offsetWidth;
      host.classList.add('is-on');
      agendar();
    };
    // o motor de templates pode executar o ux.js de novo depois deste arquivo e devolver o toast do v5.3: o setter ignora a troca
    Object.defineProperty(IX, 'toast', { configurable: true, get: function () { return toast; }, set: function () {} });
  })();

  /* ---------- 9b. avatar com foto: se a imagem falha, ficam as iniciais (comportamento do Avatar do Untitled UI) ---------- */
  (function () {
    var seletor = '.uui-avatar__content > img';
    function falhou(img) { img.hidden = true; }
    // erro de imagem não borbulha: escuta na captura
    document.addEventListener('error', function (e) {
      var el = e.target;
      if (el && el.tagName === 'IMG' && el.matches && el.matches(seletor)) falhou(el);
    }, true);
    function varrer() {
      document.querySelectorAll(seletor).forEach(function (img) { if (img.complete && img.naturalWidth === 0) falhou(img); });
    }
    if (document.readyState === 'complete') varrer(); else window.addEventListener('load', varrer);
  })();

  /* ---------- 9c. capas dos cartões esportivos: fade quando a imagem termina de carregar (sem corte seco; movimento reduzido: o CSS troca por 120 ms) ----------
     O CSS (esportes.css, bloco esp-cartao) esconde .esp-capa só quando <html> tem .esp-capas-js; aqui marcamos data-ok no load (ou no erro, para não ficar invisível). */
  (function () {
    document.documentElement.classList.add('esp-capas-js');
    function ok(img) { if (img.hasAttribute('data-ok')) return; requestAnimationFrame(function () { img.setAttribute('data-ok', ''); }); }
    document.addEventListener('load', function (e) { var el = e.target; if (el && el.tagName === 'IMG' && el.classList && el.classList.contains('esp-capa')) ok(el); }, true);
    document.addEventListener('error', function (e) { var el = e.target; if (el && el.tagName === 'IMG' && el.classList && el.classList.contains('esp-capa')) ok(el); }, true);
    function varrer(raiz) { (raiz.querySelectorAll ? raiz.querySelectorAll('img.esp-capa:not([data-ok])') : []).forEach(function (img) { if (img.complete) ok(img); }); }
    // imagens que já estavam prontas (cache) quando o motor monta o cartão não disparam load: varre o que entra no documento
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('img.esp-capa')) { if (n.complete) ok(n); } else varrer(n); } }); }); }).observe(document.documentElement, { childList: true, subtree: true });
    varrer(document);
  })();
})();
