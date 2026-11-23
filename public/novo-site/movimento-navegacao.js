/* movimento-navegacao.js: transição entre telas do protótipo, sem corte seco (Isadora Nogueira, 27/10/2026).
   Fonte: tools/previa/movimento-navegacao.js; o gerador copia para previa/movimento-navegacao.js e embute o primeiro pedaço
   (movimento-navegacao-cedo.js) no <head> de cada tela. Documento: docs/design/MOVIMENTO-NAVEGACAO.md.

   O que existe aqui é uma base reutilizável: PADRÕES (como uma navegação sai, o que a tela nova espera e como ela entra) e REGRAS
   (qual clique usa qual padrão). A fase 1 liga uma regra só: o campo de busca do menu usa o padrão "campo-busca". Na fase 2 o time
   acrescenta regras (por exemplo { todos: true, padrao: 'conteudo' }) sem mexer no resto.

   Como funciona (cada navegação é um par saída + chegada, ligado por um registro em sessionStorage "mov:nav"):
   - SAÍDA (tela que parte, 160 ms): ao clicar, o conteúdo se despede (opacidade e 8 px) e o cabeçalho FICA. Antes de sair, a tela guarda
     o registro: padrão, cor de fundo, posição do elemento clicado e uma "ponte" (cópia estática do cabeçalho). Só então navega.
   - PONTE (movimento-navegacao-cedo.js, inline no <head>): no primeiro quadro da tela nova, antes de qualquer script do motor de
     templates, pinta o fundo e a cópia do cabeçalho. O cabeçalho não pisca nos 80 a 150 ms em que a página nova ainda está vazia.
   - PORTÃO: a tela nova fica escondida (visibility) até estar montada, estilizada, com a fonte pronta e com o que o padrão espera
     (na Busca: campo assumido pelo motor, catálogo carregado, sem esqueleto, primeiros pôsteres decodificados).
   - ENTRADA (280 ms): na mesma volta de script em que o portão abre, a ponte sai de cena e a coreografia começa: o elemento clicado
     continua como o mesmo elemento (a pílula vira o campo, deslizando do lugar antigo para o novo), o resto chega escalonado em 40 ms.

   Só anima transform e opacity. Duração, distância e easing vêm só dos tokens motion.* de :root. Em movimento reduzido
   (prefers-reduced-motion ou data-motion="reduce") os tokens valem 0: nada anima, a navegação é imediata; o portão e a ponte continuam
   (evitam o flash sem estilo e o cabeçalho que some, que não são movimento).
   Convive com movimento-compra.js: Evento, Ingressos e Checkout entre si continuam com ele; o resto é daqui. */
(function () {
  if (window.MovNav) return; // o motor de templates pode executar o <script> da helmet duas vezes
  var root = document.documentElement;
  var pagina = root.getAttribute('data-pagina') || '';

  var CHAVE = 'mov:nav';
  var VALIDADE = 6000; // ms: depois disso o registro é de outra visita
  var FLUXO_COMPRA = /\/(Evento|Ingressos|Checkout|Pagamento)\.dc\.html$/; // movimento-compra.js é o dono destas entre si

  /* ---------- tokens (motion.* de :root). Em movimento reduzido valem 0: as funções devolvem 0 e nada anima ---------- */
  function tok(nome) { return getComputedStyle(root).getPropertyValue(nome).trim(); }
  function num(nome, padrao) {
    var v = tok(nome);
    if (v === '') return padrao;
    var x = parseFloat(v);
    if (isNaN(x)) return padrao;
    return /ms$/.test(v) ? x : /s$/.test(v) ? x * 1000 : x;
  }
  function T() {
    return {
      instant: num('--motion-duration-instant', 80), fast: num('--motion-duration-fast', 160), base: num('--motion-duration-base', 280), slow: num('--motion-duration-slow', 480),
      stagger: num('--motion-stagger', 40),
      sm: num('--motion-distance-sm', 8), md: num('--motion-distance-md', 16), lg: num('--motion-distance-lg', 32),
      enter: tok('--motion-ease-enter') || 'cubic-bezier(.2,.7,.2,1)',
      exit: tok('--motion-ease-exit') || 'cubic-bezier(.4,0,1,1)',
      move: tok('--motion-ease-move') || 'cubic-bezier(.4,0,.2,1)'
    };
  }
  var mqReduzido = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduzido() { return mqReduzido.matches || root.getAttribute('data-motion') === 'reduce'; }
  var temWAAPI = typeof Element !== 'undefined' && !!Element.prototype.animate;

  var trilha = []; // marcos de tempo (ms desde o início da navegação nesta tela): MovNav.trilha, para medir e ajustar
  function marco(nome) { trilha.push([nome, Math.round(performance.now())]); }
  var vivas = []; // animações de saída/entrada (para desfazer ao voltar do bfcache)
  function anima(el, quadros, opcoes) {
    if (!el || !temWAAPI || !(opcoes.duration > 0)) return null;
    var a = el.animate(quadros, opcoes);
    vivas.push(a);
    return a;
  }
  function translada(dx, dy) { return 'translate(' + dx + 'px,' + dy + 'px)'; }

  /* ---------- estrutura da página montada (a mesma âncora do movimento-compra.js) ---------- */
  function embrulho() {
    var h = document.querySelector('#dc-root > .sc-host') || document.getElementById('dc-root');
    return h ? h.firstElementChild : null;
  }
  function montada() {
    var w = embrulho();
    return !!w && w.children.length >= 2 && !!w.querySelector(':scope > .hdr');
  }
  function cabecalho() { var w = embrulho(); return w ? w.querySelector(':scope > .hdr') : null; }
  /* tudo o que fica abaixo do cabeçalho (o cabeçalho é o que dá continuidade; o conteúdo é o que troca) */
  function conteudo() {
    var w = embrulho(), a = [];
    if (!w) return a;
    for (var i = 0; i < w.children.length; i++) {
      var f = w.children[i];
      if (f.matches('.hdr, script, style, link, template')) continue;
      a.push(f);
    }
    return a;
  }

  /* =============================================================================================================
     0. API: padrões e regras
     ============================================================================================================= */
  var padroes = {};
  var regras = [];
  /* padrao(nome, definicao). Tudo é opcional:
       ponte: { fica: [seletores do que o cabeçalho novo também tem (logotipo, conta…); o elemento clicado já conta] }  (omitir = sem ponte)
                O que NÃO está em `fica` (cidade, trilha…) se despede (`instant`, 80 ms) quando a ponte sai; o que está some já, porque o real está embaixo.
       guardar(ctx, dados)  roda na tela que parte, antes de sair: guarda em `dados` o que a chegada vai precisar (posição, textos)
       saida(ctx)           roda na tela que parte: anima a despedida e devolve os ms até navegar (0 = já)
       pronto(ctx)          roda na tela nova, várias vezes: true quando a tela está pronta para aparecer
       entrada(ctx)         roda na tela nova, na volta de script em que o portão abre: a coreografia
       depois(ctx)          roda logo depois da entrada (foco, por exemplo)
     ctx = { t (tokens), reg (registro), dados, ancora (o link clicado, só na saída), url, anima, translada, ... } */
  function padrao(nome, def) { padroes[nome] = def; }
  /* regra({ seletor?, para?, de?, todos?, padrao }): o primeiro clique que casa usa o padrão.
       seletor: o link clicado casa com este seletor CSS     para: RegExp testada no pathname do destino
       de: nome da página de onde se sai ('home', 'busca'…)  todos: true = qualquer link interno para uma tela .dc.html */
  function regra(r) { regras.push(r); }

  function dono(u) {
    // Evento, Ingressos e Checkout entre si: movimento-compra.js. Não animar duas vezes.
    return FLUXO_COMPRA.test(location.pathname) && FLUXO_COMPRA.test(u.pathname);
  }
  function achar(a, u) {
    for (var i = 0; i < regras.length; i++) {
      var r = regras[i];
      if (r.de && r.de !== pagina) continue;
      if (r.seletor && !a.matches(r.seletor)) continue;
      if (r.para && !r.para.test(u.pathname)) continue;
      if (!r.seletor && !r.para && !r.todos) continue;
      return r;
    }
    return null;
  }

  /* =============================================================================================================
     1. Ponte: cópia estática do cabeçalho (caixas absolutas, mesma hierarquia, texto por posição medida)
     ============================================================================================================= */
  var CAIXA = ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'opacity', 'overflowX', 'overflowY'];
  var TEXTO = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'fontFeatureSettings'];

  // o que o cabeçalho de chegada também tem: logotipo e conta. [origem, equivalente na chegada]: o botão "Pessoa ▾" da Carteira vira o círculo da conta
  var FICA_PADRAO = ['.hdr-logo', '.avatar-hdr', ['.acct-btn', '.avatar-hdr']];
  function capturarPonte(hdr, fica, clicado) {
    if (!hdr) return null;
    var marcar = clicado ? [clicado] : [], seletorDe = [];
    if (clicado) seletorDe.push('');
    FICA_PADRAO.concat(fica || []).forEach(function (s) { var so = typeof s === 'string' ? s : s[0], sr = typeof s === 'string' ? s : s[1]; Array.prototype.forEach.call(hdr.querySelectorAll(so), function (e) { marcar.push(e); seletorDe.push(sr); }); });
    var r0 = hdr.getBoundingClientRect();
    if (r0.height < 1 || r0.bottom <= 0 || r0.top >= window.innerHeight) return null;
    var n = 0;

    function copiar(el, pai, origemX, origemY) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      var r = el.getBoundingClientRect();
      var tag = el.tagName;
      var c, i;
      if (tag === 'svg' || tag === 'SVG' || el instanceof SVGElement) {
        if (el.tagName.toLowerCase() !== 'svg') return null; // só a raiz do svg é filha do cabeçalho; o resto vem junto com o cloneNode
        c = el.cloneNode(true);
        var tira = [c].concat(Array.prototype.slice.call(c.querySelectorAll('*')));
        tira.forEach(function (x) { x.removeAttribute('data-dc-tpl'); });
        c.style.cssText = 'position:absolute;left:' + (r.left - origemX) + 'px;top:' + (r.top - origemY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px;stroke:' + cs.stroke + ';fill:' + cs.fill + ';stroke-width:' + cs.strokeWidth + ';color:' + cs.color + ';opacity:' + cs.opacity;
        n++;
        return c;
      }
      if (tag === 'IMG') {
        var texto = null;
        try { texto = sessionStorage.getItem('mov:svg:' + (el.getAttribute('src') || '')); } catch (x) {}
        if (texto && /<svg/i.test(texto)) {
          // logotipo em svg: embutido como marcação (sem imagem para decodificar, aparece no primeiro quadro)
          var tmp = document.createElement('div');
          tmp.innerHTML = texto.replace(/^\s*<\?xml[^>]*\?>/, '');
          var sv = tmp.querySelector('svg');
          if (sv) {
            sv.removeAttribute('id');
            // object-fit/object-position da imagem viram preserveAspectRatio (no celular o logotipo é só o glifo: cover, canto esquerdo)
            var xp = /^0%|left/.test(cs.objectPosition) ? 'xMin' : /^100%|right/.test(cs.objectPosition) ? 'xMax' : 'xMid';
            sv.setAttribute('preserveAspectRatio', xp + 'YMid ' + (cs.objectFit === 'cover' ? 'slice' : 'meet'));
            sv.setAttribute('style', 'position:absolute;left:' + (r.left - origemX) + 'px;top:' + (r.top - origemY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px;opacity:' + cs.opacity + ';filter:' + cs.filter);
            n++;
            return sv;
          }
        }
        c = document.createElement('img');
        c.src = el.currentSrc || el.src;
        c.alt = '';
        c.style.cssText = 'position:absolute;left:' + (r.left - origemX) + 'px;top:' + (r.top - origemY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px;object-fit:' + cs.objectFit + ';object-position:' + cs.objectPosition + ';opacity:' + cs.opacity + ';filter:' + cs.filter;
        n++;
        return c;
      }
      c = document.createElement('div');
      var st = c.style;
      st.position = 'absolute'; st.boxSizing = 'border-box';
      st.left = (r.left - origemX) + 'px'; st.top = (r.top - origemY) + 'px'; st.width = r.width + 'px'; st.height = r.height + 'px'; st.margin = '0';
      CAIXA.forEach(function (p) { st[p] = cs[p]; });
      TEXTO.forEach(function (p) { st[p] = cs[p]; });
      st.fontFamily = '"ElzaPonte",' + cs.fontFamily; // nome próprio: ver movimento-navegacao-cedo.js
      var mi = marcar.indexOf(el);
      if (mi > -1) {
        // o seletor e o retângulo antigos: na chegada, só "fica" se o equivalente real está no mesmo lugar e do mesmo tamanho
        c.setAttribute('data-mov-fica', seletorDe[mi]);
        c.setAttribute('data-mov-r', [r.left, r.top, r.width, r.height].join(','));
      }
      n++;
      var bx = r.left + parseFloat(cs.borderLeftWidth || 0), by = r.top + parseFloat(cs.borderTopWidth || 0);
      for (i = 0; i < el.childNodes.length; i++) {
        var no = el.childNodes[i];
        if (no.nodeType === 1) {
          var f = copiar(no, c, bx, by);
          if (f) c.appendChild(f);
        } else if (no.nodeType === 3 && /\S/.test(no.nodeValue)) {
          var rg = document.createRange();
          rg.selectNodeContents(no);
          var rr = rg.getBoundingClientRect();
          if (rr.width < 0.5) continue;
          var sp = document.createElement('span');
          sp.textContent = no.nodeValue.replace(/\s+/g, ' ').trim();
          sp.style.cssText = 'position:absolute;white-space:nowrap;left:' + (rr.left - bx) + 'px;top:' + (rr.top - by) + 'px;width:' + (rr.width + 1) + 'px;height:' + rr.height + 'px;line-height:' + rr.height + 'px';
          c.appendChild(sp);
          n++;
        }
      }
      if (tag === 'INPUT' && (el.type === 'search' || el.type === 'text')) {
        // campo de texto: o que se vê é o valor digitado ou, vazio, o placeholder (não são nós de texto)
        var vt = el.value || el.getAttribute('placeholder') || '';
        if (vt) {
          var bl = parseFloat(cs.borderLeftWidth || 0), brd = parseFloat(cs.borderRightWidth || 0), bt = parseFloat(cs.borderTopWidth || 0), bb = parseFloat(cs.borderBottomWidth || 0);
          var pl = parseFloat(cs.paddingLeft || 0), pr = parseFloat(cs.paddingRight || 0), sv = document.createElement('span');
          sv.textContent = vt;
          sv.style.cssText = 'position:absolute;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;left:' + pl + 'px;top:0;width:' + Math.max(0, r.width - bl - brd - pl - pr) + 'px;height:' + (r.height - bt - bb) + 'px;line-height:' + (r.height - bt - bb) + 'px;color:' + (el.value ? cs.color : getComputedStyle(el, '::placeholder').color);
          c.appendChild(sv);
          n++;
        }
      }
      return c;
    }
    var raiz = copiar(hdr, null, r0.left, r0.top);
    if (!raiz) return null;
    var cs0 = getComputedStyle(hdr);
    return { html: raiz.outerHTML, top: r0.top, w: r0.width, h: r0.height, n: n, fundo: cs0.backgroundColor };
  }

  /* junta à ponte do cabeçalho a cópia de um elemento da tela, no lugar dele. A ponte passa a cobrir a janela toda (a do cabeçalho tem a altura
     dele e cortaria o elemento); o cabeçalho vai num embrulho no seu lugar. A cópia extra não tem data-mov-fica: some quando a tela abre. */
  function juntarPonte(ponte, el) {
    if (!el) return ponte;
    var pb = capturarPonte(el, [], null), r = el.getBoundingClientRect();
    if (!pb) return ponte;
    var cab = '<div style="position:absolute;left:0;top:' + ponte.top + 'px;width:' + ponte.w + 'px;height:' + ponte.h + 'px">' + ponte.html + '</div>';
    var ext = '<div style="position:absolute;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px">' + pb.html + '</div>';
    return { html: cab + ext, top: 0, w: window.innerWidth, h: window.innerHeight, n: ponte.n + pb.n, fundo: ponte.fundo };
  }

  /* aquecimento: guarda em sessionStorage, uma vez por visita, o que a ponte precisa para nascer completa no primeiro quadro da tela nova
     (as duas fontes em base64 e os logotipos svg do cabeçalho). Sem isso a ponte funciona, mas o logotipo e o texto em negrito chegam
     50 ms depois dela. Roda em ociosidade; falhar não muda nada. */
  function paraBase64(buf) {
    var b = new Uint8Array(buf), s = '', i;
    for (i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function aquecer() {
    try {
      var tarefas = [];
      [['mov:fonte400', './fontes/Elza-Regular.woff2'], ['mov:fonte600', './fontes/Elza-Semibold.woff2']].forEach(function (f) {
        if (sessionStorage.getItem(f[0])) return;
        tarefas.push(fetch(f[1]).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (b) { if (b) sessionStorage.setItem(f[0], paraBase64(b)); }));
      });
      Array.prototype.forEach.call(document.querySelectorAll('.hdr img'), function (i) {
        var src = i.getAttribute('src') || '';
        if (!/\.svg(\?|$)/.test(src) || sessionStorage.getItem('mov:svg:' + src)) return;
        tarefas.push(fetch(i.currentSrc || src).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (/<svg/i.test(t)) sessionStorage.setItem('mov:svg:' + src, t); }));
      });
      Promise.all(tarefas).catch(function () {});
    } catch (e) {}
  }
  setTimeout(function () { (window.requestIdleCallback || setTimeout)(aquecer); }, 700);

  /* =============================================================================================================
     2. Saída: registro, despedida do conteúdo, navegação
     ============================================================================================================= */
  var saindo = false;

  function fundoDaPagina() {
    var cores = [document.body, root], i, c;
    for (i = 0; i < cores.length; i++) {
      c = cores[i] ? getComputedStyle(cores[i]).backgroundColor : '';
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    return '';
  }
  var gravouRegistro = false;
  function gravar(reg) { gravouRegistro = true; try { sessionStorage.setItem(CHAVE, JSON.stringify(reg)); } catch (e) {} }
  function lerRegistro() {
    try {
      var j = sessionStorage.getItem(CHAVE);
      if (!j) return null;
      sessionStorage.removeItem(CHAVE); // vale uma vez
      var o = JSON.parse(j);
      if (!o || o.v !== 1 || Date.now() - o.t > VALIDADE || (o.para && o.para !== location.pathname) || !padroes[o.padrao]) return null;
      return o;
    } catch (e) { return null; }
  }

  /* despedida padrão do conteúdo: some e sobe 8 px (para quem avança) */
  function sairConteudo(ctx, dy) {
    var t = ctx.t, alvos = conteudo(), iniciou = false;
    alvos.forEach(function (el) {
      var a = anima(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, dy === undefined ? -t.sm : dy) }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      if (a) iniciou = true;
    });
    return iniciou ? t.fast : 0;
  }

  /* despedida do conteúdo menos um elemento (a barra de busca da Home): em cada nível do caminho até ele, o que está ao lado se despede */
  function sairExceto(ctx, manter) {
    var t = ctx.t, alvos = [], iniciou = false;
    conteudo().forEach(function (el) {
      if (!el.contains(manter)) { alvos.push(el); return; }
      for (var no = manter; no && no !== el; no = no.parentElement) {
        Array.prototype.forEach.call(no.parentElement.children, function (f) { if (f !== no && !f.matches('script, style, link, template')) alvos.push(f); });
      }
    });
    alvos.forEach(function (el) {
      if (anima(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' })) iniciou = true;
    });
    return iniciou ? t.fast : 0;
  }

  function navegar(a, u, r) {
    var def = padroes[r.padrao];
    var red = reduzido();
    var ctx = { t: T(), ancora: a, url: u, regra: r, anima: anima, translada: translada, dados: {}, sairConteudo: function (dy) { return sairConteudo(ctx, dy); } };
    var reg = { v: 1, t: Date.now(), padrao: r.padrao, de: pagina, para: u.pathname, bg: fundoDaPagina(), red: red, ponte: null, dados: ctx.dados };
    try { if (def.ponte) reg.ponte = capturarPonte(cabecalho(), def.ponte.fica, a); } catch (e) { reg.ponte = null; }
    // ponte.extra(ctx): um elemento da tela (fora do cabeçalho) que também precisa estar na ponte (a barra de busca da Home, que o campo da Busca assume)
    try { if (reg.ponte && def.ponte && def.ponte.extra) reg.ponte = juntarPonte(reg.ponte, def.ponte.extra(ctx)); } catch (e) {}
    try { if (def.guardar) def.guardar(ctx, ctx.dados); } catch (e) {}
    reg.poster = ctx.dados.poster || null;
    gravar(reg);
    var espera = 0;
    if (!red) { try { espera = (def.saida ? def.saida(ctx) : sairConteudo(ctx)) || 0; } catch (e) { espera = 0; } }
    // navega quando a despedida termina: o navegador congela a tela antiga no instante em que a nova começa a pintar
    var ir = function () { saindo = true; location.href = u.href; };
    if (espera > 0) setTimeout(ir, espera); else ir();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || !/\.dc\.html$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return; // âncora ou a mesma tela
    if (saindo) { e.preventDefault(); return; }
    var r = achar(a, u);
    if (!r || dono(u) || !padroes[r.padrao]) return;
    e.preventDefault();
    saindo = true;
    try { navegar(a, u, r); } catch (x) { location.href = u.href; } // se algo falhar, vale a navegação normal
  }, true);

  /* saída sem clique nosso (botão Voltar, URL digitada, recarregar, navegação feita por script): não dá para despedir o conteúdo,
     mas o cabeçalho e o fundo ainda viajam. O registro genérico não tem destino (para: null) e vale para a próxima tela nossa em 6 s. */
  window.addEventListener('pagehide', function () {
    if (gravouRegistro) return;
    try {
      var hdr = cabecalho();
      gravar({ v: 1, t: Date.now(), padrao: 'conteudo', de: pagina, para: null, bg: fundoDaPagina(), red: reduzido(), ponte: hdr ? capturarPonte(hdr, [], null) : null, dados: {} });
    } catch (e) {}
  });

  /* voltar do cache de páginas (botão Voltar do navegador): a tela volta como estava ao sair, ou seja, apagada */
  window.addEventListener('pageshow', function (e) {
    saindo = false;
    gravouRegistro = false;
    if (!e.persisted) return;
    vivas.forEach(function (a) { try { a.cancel(); } catch (x) {} });
    vivas = [];
    var t = T();
    conteudo().forEach(function (el) { anima(el, [{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' }); });
  });

  /* =============================================================================================================
     3. Chegada: portão, ponte, entrada
     ============================================================================================================= */
  // theme, base, ux e ds vêm do v5.3 e a identidade por último; o motor de templates os (re)insere no <head> depois de montar,
  // então só vale quando todos existem, carregaram e a lista parou de mudar (senão aparece o v5.3 sem a identidade por 1 ou 2 quadros)
  var ESPERADOS = ['theme.css', 'base.css', 'ux.css', 'ds.css', 'identidade-v1.css'];
  var ESTAVEL = 16; // ms sem mudar a lista de estilos (com o portão fechado, um quadro basta; 40 ms custavam 50 ms de espera real)
  var assinatura = '', desde = 0;
  function estilosProntos() {
    var ls = document.querySelectorAll('link[rel="stylesheet"]');
    var achados = {}, i, j, sig = '';
    for (i = 0; i < ls.length; i++) {
      if (!ls[i].sheet) return false;
      for (j = 0; j < ESPERADOS.length; j++) if (ls[i].href.indexOf(ESPERADOS[j]) > -1) achados[ESPERADOS[j]] = true;
      sig += ls[i].href + '|';
    }
    for (j = 0; j < ESPERADOS.length; j++) if (!achados[ESPERADOS[j]]) return false;
    if (!tok('--motion-duration-base') && !reduzido()) return false; // tokens da identidade já valem
    if (sig !== assinatura) { assinatura = sig; desde = Date.now(); return false; }
    return Date.now() - desde >= ESTAVEL;
  }

  /* entrada escalonada de uma lista [{ el, n, so }]: opacidade 0 -> 1 e 16 px -> 0 (ou só opacidade), 40 ms por degrau */
  function entrarLista(ctx, lista, opc) {
    var t = ctx.t, o = opc || {};
    var dx = o.dx || 0, dy = o.dy === undefined ? t.md : o.dy;
    lista.forEach(function (it) {
      var quadros = it.so === 'opacidade' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: translada(dx, dy) }, { opacity: 1, transform: 'none' }];
      anima(it.el, quadros, { duration: it.so === 'opacidade' ? t.fast : t.base, delay: Math.min(it.n || 0, 4) * t.stagger + (it.atraso || 0), easing: t.enter, fill: 'backwards' });
    });
  }

  /* o elemento clicado e o da tela nova são o mesmo: parte do lugar e do tamanho antigos e assenta no novo (só transform) */
  function fluir(ctx, el, de, opc) {
    var t = ctx.t, o = opc || {};
    if (!el || !de || !(t.base > 0)) return null;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var dx = de.x - r.left, dy = de.y - r.top;
    var sx = de.w / r.width, sy = de.h / r.height;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.005 && Math.abs(sy - 1) < 0.005) return null;
    el.style.transformOrigin = '0 0';
    // o campo parte de dentro da área do cabeçalho (sticky, com z-index): durante o voo fica acima dele, senão o cabeçalho o cobre
    var antes = { p: el.style.position, z: el.style.zIndex };
    if (o.acima) {
      var h = cabecalho(), zh = h ? parseInt(getComputedStyle(h).zIndex, 10) : NaN;
      // z-index vale em item de flex/grid sem mudar `position` (mudar o position re-ancora filhos absolutos e quebra o layout do campo)
      var pd = el.parentElement ? getComputedStyle(el.parentElement).display : '';
      if (getComputedStyle(el).position === 'static' && !/flex|grid/.test(pd)) el.style.position = 'relative';
      el.style.zIndex = String((isNaN(zh) ? 10 : zh) + 1);
    }
    var solta = function () { el.style.transformOrigin = ''; if (o.acima) { el.style.position = antes.p; el.style.zIndex = antes.z; } };
    /* "abrir" (campo da Busca): o campo NÃO escala, porque escalar achata o texto (de um ícone de 48 px a 640 px, o placeholder e o botão
       nasciam a 7% da largura; de uma barra de 74 px a 46 px, a altura encolhia 38%). Ele parte do tamanho e do lugar de quem foi clicado
       (a lupa do menu ou a barra grande da Home) e assenta no tamanho dele, com o conteúdo reflowando de verdade, enquanto desliza (transform).
       Anima largura e altura de UM elemento por 280 ms, só neste padrão (o resto do motor só anima transform e opacity); a margem inferior
       compensa a altura para a página abaixo não se mexer. Vindo de um ícone, o que há dentro do campo aparece quando ele já tem espaço
       (40% do trajeto) e o glifo da lupa parte do centro do ícone. */
    var cs = getComputedStyle(el);
    if (o.abrir && cs.boxSizing === 'border-box') {
      var icone = de.w <= o.abrir;
      var filho = el.firstElementChild, gl = filho ? filho.getBoundingClientRect().width : 0;
      // o glifo da lupa parte do centro do ícone (o padding do campo é !important: não dá para animá-lo, então o glifo é quem desliza)
      var gx = icone && gl ? (de.w - gl) / 2 - parseFloat(cs.borderLeftWidth || 0) - parseFloat(cs.paddingLeft) : 0;
      // data-mov-abre (movimento-navegacao.css): tira o flex-basis !important do campo (no celular ele valia 100% e a largura não animava),
      // esconde o que passa da borda e impede o glifo de encolher a 0
      el.setAttribute('data-mov-abre', '');
      // com o campo no tamanho antigo o contêiner (que centraliza) o põe em outro lugar: mede onde ele fica e desliza a partir daí
      var w0 = el.style.width, m0 = el.style.maxWidth, h0 = el.style.height;
      el.style.width = de.w + 'px'; el.style.maxWidth = de.w + 'px'; el.style.height = de.h + 'px';
      var rm = el.getBoundingClientRect();
      el.style.width = w0; el.style.maxWidth = m0; el.style.height = h0;
      var solta2 = function () { el.removeAttribute('data-mov-abre'); solta(); };
      var aa = anima(el, [{ transform: translada(de.x - rm.left, de.y - rm.top), width: de.w + 'px', maxWidth: de.w + 'px', height: de.h + 'px', marginBottom: (r.height - de.h) + 'px' }, { transform: 'none', width: r.width + 'px', maxWidth: r.width + 'px', height: r.height + 'px', marginBottom: '0px' }], { duration: o.duracao || t.base, easing: t.move, fill: 'backwards' });
      if (!aa) { solta2(); return null; }
      if (filho && gx) anima(filho, [{ transform: translada(gx, 0) }, { transform: 'none' }], { duration: o.duracao || t.base, easing: t.move, fill: 'backwards' });
      if (icone) Array.prototype.forEach.call(el.children, function (f, i) {
        if (i === 0) return; // o glifo da lupa fica à vista o tempo todo
        anima(f, [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: o.duracao || t.base, easing: t.enter, fill: 'backwards' });
      });
      aa.finished.then(solta2, solta2);
      aa.abriu = true;
      aa.icone = icone;
      return aa;
    }
    var a = anima(el, [{ transform: translada(dx, dy) + ' scale(' + sx + ',' + sy + ')' }, { transform: 'none' }], { duration: o.duracao || t.base, easing: t.move, fill: 'backwards' });
    if (a) a.finished.then(solta, solta); else solta();
    return a;
  }

  /* a ponte sai de cena. O que tem equivalente real na tela nova (data-mov-fica e o que está dentro) some já; o que não tem se despede em
     160 ms. Os recipientes (cabeçalho, linha) não pintam nada que o real não pinte igual: ficam escondidos, sem animar. */
  function equivalenteIgual(no) {
    var sel = no.getAttribute('data-mov-fica');
    if (!sel) return true; // o elemento clicado: o padrão cuida dele (voa para o lugar novo)
    var real = document.querySelector(sel), r0 = (no.getAttribute('data-mov-r') || '').split(',').map(parseFloat);
    if (!real || r0.length < 4) return false;
    var r = real.getBoundingClientRect();
    // mesmo tamanho = o mesmo elemento (um deslocamento de poucos px é imperceptível); tamanho diferente = outro desenho (glifo -> logotipo)
    return Math.abs(r.width - r0[2]) < 2 && Math.abs(r.height - r0[3]) < 2 && Math.abs(r.left - r0[0]) < 24 && Math.abs(r.top - r0[1]) < 24;
  }
  function entregarPonte(ctx) {
    var p = document.getElementById('mov-ponte');
    if (!p) return;
    var t = ctx.t;
    var raiz = (p.shadowRoot || p).firstElementChild;
    var fim = function () {
      if (p.parentNode) p.remove();
      var f = document.getElementById('mov-ponte-fonte');
      if (f) f.remove();
    };
    var saem = [], trocados = [];
    (function varrer(no) {
      if (no.hasAttribute && no.hasAttribute('data-mov-fica')) {
        if (equivalenteIgual(no)) return; // o real assume
        saem.push(no); // o equivalente real mudou de lugar ou de tamanho (ou não existe): a cópia se despede
        var real = document.querySelector(no.getAttribute('data-mov-fica') || '#sem-seletor');
        if (real && ctx.t.fast > 0) trocados.push(real); // e o real chega em fade, para não pesar em cima do que está saindo
        return;
      }
      if (no.querySelector && no.querySelector('[data-mov-fica]')) { // recipiente: desce
        Array.prototype.forEach.call(no.childNodes, function (f) {
          if (f.nodeType === 1) varrer(f); else if (f.nodeType === 3) return;
        });
        return;
      }
      saem.push(no);
    })(raiz);
    saem = saem.filter(function (n) { return n !== raiz; });
    if (!saem.length || !(t.fast > 0)) { fim(); return; }
    p.style.visibility = 'hidden';
    var ultima = null;
    saem.forEach(function (el) {
      el.style.visibility = 'visible';
      ultima = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.instant, easing: t.exit, fill: 'forwards' });
    });
    trocados.forEach(function (el) { anima(el, [{ opacity: 0 }, { opacity: 1 }], { duration: t.instant, easing: t.enter, fill: 'backwards' }); });
    if (ultima) ultima.finished.then(fim, fim); else fim();
  }

  /* ---------- páginas: o que cada tela espera para aparecer e quem entra primeiro (vale para qualquer padrão que chegue nela) ---------- */
  var paginas = {};
  /* pagina(nome, { pronto(ctx), alvos(ctx) }): nome = valor de <html data-pagina>.
       pronto: true quando a tela está pronta para aparecer (dados chegaram, sem esqueleto, imagens da 1ª tela decodificadas)
       alvos: [{ el, n, so }] que entram em cascata (omitido = o genérico: filhos de main e blocos abaixo do cabeçalho, só os da 1ª tela) */
  function pagina_(nome, def) { paginas[nome] = def; }
  function alvosGenericos() {
    var a = [], n = 0, vh = window.innerHeight, h = cabecalho(), base = h ? h.getBoundingClientRect().bottom : 0;
    conteudo().forEach(function (el) {
      (el.matches('main') ? Array.prototype.slice.call(el.children) : [el]).forEach(function (x) {
        var r = x.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || !r.height) return;
        // bloco de largura total colado no cabeçalho (vitrine, hero): só opacidade (sobe 16 px abriria uma fresta de fundo)
        var colado = Math.abs(r.top - base) < 3 && r.width >= window.innerWidth - 1;
        a.push({ el: x, n: n++, so: colado ? 'opacidade' : undefined });
      });
    });
    return a;
  }
  function alvosDaPagina(ctx) {
    var d = paginas[pagina];
    return d && d.alvos ? d.alvos(ctx) : alvosGenericos();
  }
  function imagensProntas(imgs, desdeObj, teto) {
    var ok = imgs.every(function (i) { return i && i.complete && i.naturalWidth > 0; });
    if (ok) return true;
    if (!desdeObj.t) desdeObj.t = Date.now();
    return Date.now() - desdeObj.t > teto;
  }
  var esperaImg = {};

  function limparPoster(t) {
    var ov = document.getElementById('mov-ponte-poster');
    if (!ov || (ov.getAnimations && ov.getAnimations().length)) return;
    var fim = function () { if (ov.parentNode) ov.remove(); };
    if (t.fast > 0 && temWAAPI) { var a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' }); a.finished.then(fim, fim); } else fim();
  }
  function guardarTema() {
    try {
      var tema = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var c = fundoDaPagina();
      if (c) localStorage.setItem('mov:bg:' + tema, c);
    } catch (e) {}
  }

  function chegar() {
    var reg = lerRegistro();
    if (root.hasAttribute('data-mov-dona')) reg = null; // chegada do movimento-compra.js: a entrada é dele
    else if (!reg && root.hasAttribute('data-mov-nav')) reg = { v: 1, padrao: 'direta', dados: {}, ponte: null };
    if (!reg) {
      // chegada que é do movimento-compra.js, ou script anterior falhou: nada a fazer; por garantia, limpa.
      var s = document.getElementById('mov-ponte'); if (s) s.remove();
      root.removeAttribute('data-mov-nav-gate');
      root.removeAttribute('data-mov-nav');
      if (!root.hasAttribute('data-mov-bgcompra')) root.style.removeProperty('background-color');
      setTimeout(guardarTema, 800);
      if (root.hasAttribute('data-mov-bgcompra')) {
        // o fundo foi pintado pelo pedaço cedo; sai quando o portão do movimento-compra.js abre (ou a tela está montada e não há portão)
        (function soltar() {
          if (root.hasAttribute('data-mov-gate') || !montada()) { setTimeout(soltar, 30); return; }
          requestAnimationFrame(function () { requestAnimationFrame(function () { root.removeAttribute('data-mov-bgcompra'); root.style.removeProperty('background-color'); }); });
        })();
      }
      return;
    }
    var def = padroes[reg.padrao];
    var ctx = { t: T(), reg: reg, dados: reg.dados || {}, anima: anima, translada: translada, entrarLista: function (l, o) { return entrarLista(ctx, l, o); }, fluir: function (el, de, o) { return fluir(ctx, el, de, o); }, conteudo: conteudo, cabecalho: cabecalho, alvos: function () { return alvosDaPagina(ctx); }, embrulho: embrulho };
    var liberada = false;

    function liberar() {
      if (liberada) return;
      liberada = true;
      marco('liberada');
      ctx.t = T();
      var red = reduzido();
      try { if (def.preparar) def.preparar(ctx); } catch (e) {}
      cuidarDeTodas(); // imagens que ainda carregam quando a tela abre entram em fade, não pipocam
      root.removeAttribute('data-mov-nav-gate');
      entregarPonte(ctx);
      if (!red) { try { if (def.entrada) def.entrada(ctx); } catch (e) {} }
      limparPoster(ctx.t);
      try { if (def.depois) def.depois(ctx); } catch (e) {}
      root.style.removeProperty('background-color');
      // as transições do CSS voltam 2 quadros depois (ver o pedaço cedo)
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.removeAttribute('data-mov-nav'); var pg2 = document.getElementById('mov-nav-portao'); if (pg2) pg2.remove(); }); });
      setTimeout(guardarTema, 800);
    }

    var limite = Date.now() + 1500;
    (function tentar() {
      if (liberada) return;
      var m = montada(), e = m && estilosProntos();
      if (m && !trilha.some(function (x) { return x[0] === 'montada'; })) marco('montada');
      if (e && !trilha.some(function (x) { return x[0] === 'estilos'; })) marco('estilos');
      var ok = m && e;
      if (ok && paginas[pagina] && paginas[pagina].pronto) { try { ok = !!paginas[pagina].pronto(ctx); } catch (x) { ok = true; } }
      if (ok && def.pronto) { try { ok = !!def.pronto(ctx); } catch (x) { ok = true; } }
      if (ok) {
        marco('pronta');
        var esperar = function () { requestAnimationFrame(function () { liberar(); }); setTimeout(liberar, 60); };
        // só a Elza importa (400 e 600): document.fonts.ready também espera fontes que a tela não usa e custava 120 ms no Evento
        if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 16px Elza'), document.fonts.load('600 16px Elza')]).then(esperar, esperar); else esperar();
        return;
      }
      if (Date.now() > limite) { liberar(); return; }
      setTimeout(tentar, 8);
    })();
    setTimeout(liberar, 1600); // rede de segurança: a página nunca fica escondida
  }

  /* =============================================================================================================
     4. Padrões genéricos
     ============================================================================================================= */
  /* "conteudo": o cabeçalho fica, o conteúdo sai (160 ms) e o novo chega em cascata (280 ms, 40 ms por degrau) */
  padrao('conteudo', {
    ponte: {},
    saida: function (ctx) { return ctx.sairConteudo(); },
    entrada: function (ctx) { ctx.entrarLista(ctx.alvos()); }
  });
  /* "direta": chegada sem registro (primeira abertura, URL digitada): sem ponte; a tela inteira aparece em 160 ms, sem flash sem estilo */
  padrao('direta', {
    entrada: function (ctx) { var w = ctx.embrulho(); if (w) ctx.entrarLista([{ el: w, n: 0, so: 'opacidade' }]); }
  });

  /* "poster-hero": o pôster do cartão clicado fica na tela, no lugar dele, enquanto o resto se despede; na tela do Evento ele voa para o
     lugar do pôster do hero (transform) e se dissolve nele. O pôster real do hero nunca anima (LCP): quem voa é a cópia da ponte. */
  function posterDe(a) {
    var imgs = a.querySelectorAll('img'), i, melhor = null;
    for (i = 0; i < imgs.length; i++) {
      var r = imgs[i].getBoundingClientRect();
      if (r.width < 60 || r.height < r.width * 1.1) continue; // pôster é retrato
      if (!melhor || r.width * r.height > melhor.r.width * melhor.r.height) melhor = { el: imgs[i], r: r };
    }
    return melhor;
  }
  padrao('poster-hero', {
    ponte: {},
    guardar: function (ctx, dados) {
      var p = posterDe(ctx.ancora);
      if (!p || p.r.bottom < 0 || p.r.top > window.innerHeight) return;
      var cs = getComputedStyle(p.el), h = cabecalho();
      var zh = h ? parseInt(getComputedStyle(h).zIndex, 10) : NaN;
      dados.poster = { x: p.r.left, y: p.r.top, w: p.r.width, h: p.r.height, src: p.el.currentSrc || p.el.src, r: cs.borderTopLeftRadius, z: isNaN(zh) ? 1 : Math.max(1, zh - 1) };
      ctx.poster = dados.poster;
    },
    saida: function (ctx) {
      var d = ctx.dados.poster;
      if (d) {
        // a cópia do pôster cobre o original: o cartão esmaece por baixo e o pôster fica
        var im = document.createElement('img');
        im.id = 'mov-ponte-poster';
        im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.src = d.src;
        im.style.cssText = 'position:fixed;left:' + d.x + 'px;top:' + d.y + 'px;width:' + d.w + 'px;height:' + d.h + 'px;object-fit:cover;border-radius:' + d.r + ';z-index:' + d.z + ';pointer-events:none;margin:0;max-width:none';
        document.body.appendChild(im);
      }
      return ctx.sairConteudo();
    },
    entrada: function (ctx) {
      var t = ctx.t, ov = document.getElementById('mov-ponte-poster'), d = ctx.dados.poster;
      var alvo = document.querySelector('.ev-hero .ev-poster, .ev-poster');
      if (ov && d && alvo && t.base > 0) {
        var r = alvo.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) {
          var tr = translada(r.left - d.x, r.top - d.y) + ' scale(' + (r.width / d.w) + ',' + (r.height / d.h) + ')';
          ov.style.transformOrigin = '0 0';
          ov.style.borderRadius = getComputedStyle(alvo).borderTopLeftRadius;
          // voa em `base` (move) e se dissolve no último terço, para a troca de imagem não aparecer como corte
          var a = ov.animate([{ transform: 'none', opacity: 1, offset: 0 }, { transform: tr, opacity: 1, offset: 0.65 }, { transform: tr, opacity: 0, offset: 1 }], { duration: t.base + t.fast / 2, easing: t.move, fill: 'forwards' });
          vivas.push(a);
          var fim = function () { if (ov.parentNode) ov.remove(); };
          a.finished.then(fim, fim);
        }
      }
      ctx.entrarLista(ctx.alvos().filter(function (x) { return !x.el.matches('.ev-poster, .ev-tilt, .ev-stage'); }));
    }
  });

  /* =============================================================================================================
     5. Padrão "campo-busca": a pílula do menu vira o campo da Busca
     ============================================================================================================= */
  function ret(r) { return { x: r.left, y: r.top, w: r.width, h: r.height }; }
  function visiveisDaGrade(max) {
    var cs = document.querySelectorAll('.res-grid > a.card, .bu-grade > a.card'), a = [];
    for (var i = 0; i < cs.length && a.length < max; i++) if (cs[i].getBoundingClientRect().top < window.innerHeight) a.push(cs[i]);
    return a;
  }
  padrao('campo-busca', {
    ponte: { extra: function (ctx) { return ctx.ancora.closest ? ctx.ancora.closest('.hb-bar') : null; } }, // na Home, a barra grande também fica na ponte
    guardar: function (ctx, dados) {
      // origem: a lupa do menu ou, na Home, a barra grande de busca (o botão Buscar e o Enter nela são o clique)
      var barra = ctx.ancora.closest ? ctx.ancora.closest('.hb-bar') : null, origem = barra || ctx.ancora, campoOrigem = barra ? barra.querySelector('input') : null;
      dados.campo = ret(origem.getBoundingClientRect());
      dados.dica = campoOrigem ? (campoOrigem.getAttribute('placeholder') || '') : (ctx.ancora.textContent || '').replace(/\s+/g, ' ').trim();
      dados.hover = origem.matches(':hover'); // o mouse está em cima: o campo novo herda a borda de hover até o fim da entrada
    },
    // a barra da Home NÃO se despede: fica onde está até o campo da Busca assumir o lugar dela; o resto da tela some
    saida: function (ctx) { var barra = ctx.ancora.closest ? ctx.ancora.closest('.hb-bar') : null; return barra ? sairExceto(ctx, barra) : ctx.sairConteudo(); },
    preparar: function (ctx) {
      var campo = document.querySelector('.hdr-search input[type="search"]');
      if (campo && ctx.dados.dica && !campo.getAttribute('placeholder')) campo.setAttribute('placeholder', ctx.dados.dica);
    },
    entrada: function (ctx) {
      var t = ctx.t, form = document.querySelector('.hdr-search');
      // a pílula do menu é o campo da Busca: parte do lugar e do tamanho dela
      var voo = ctx.fluir(form, ctx.dados.campo, { acima: true, abrir: 96 }); // ícone (lupa) -> o campo abre; pílula larga -> o campo desliza e escala
      if (form && ctx.dados.hover) {
        form.setAttribute('data-mov-hover', '');
        var solta = function () { form.removeAttribute('data-mov-hover'); };
        if (voo) voo.finished.then(solta, solta); else solta();
      }
      // o botão Buscar chega depois do campo
      var bt = form ? form.querySelector('.bp') : null;
      if (bt && !(voo && voo.abriu)) anima(bt, [{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, delay: t.stagger, easing: t.enter, fill: 'backwards' });
      // o resto escalona: trilha e título, filtros, cartões (alvos da página Busca)
      ctx.entrarLista(ctx.alvos());
    },
    depois: function () {
      var campo = document.querySelector('.hdr-search input[type="search"]');
      if (!campo) return;
      try {
        void campo.offsetWidth; // o portão acabou de abrir: força o estilo para o campo deixar de estar em visibility:hidden antes de focar
        campo.focus({ preventScroll: true });
        var n = campo.value.length;
        campo.setSelectionRange(n, n);
      } catch (e) {}
    }
  });

  /* =============================================================================================================
     5b. Páginas
     ============================================================================================================= */
  // Categoria (Categoria.dc.html): pronta quando o catálogo da categoria chegou (sem esqueleto) e o pôster do destaque e os primeiros cartões estão decodificados
  pagina_('categoria', {
    pronto: function () {
      var m = document.querySelector('main.cat');
      if (!m) return false;
      var est = m.getAttribute('data-cat-estado');
      if (est === 'carregando' || !est) return false;
      var imgs = [], p = document.querySelector('.cat-hero .vit-poster img');
      if (p) imgs.push(p);
      Array.prototype.slice.call(document.querySelectorAll('.cat-grade > a.card img'), 0, 4).forEach(function (i) { imgs.push(i); });
      return imagensProntas(imgs, esperaImg, 320);
    }
  });
  // Esportes (Esportes.dc.html, Home da Ingresse Sports e agregadoras): pronta quando o catálogo esportivo chegou (sem esqueleto) e os primeiros pôsteres estão decodificados
  pagina_('esportes', {
    pronto: function () {
      var m = document.querySelector('main.esp');
      if (!m) return false;
      var est = m.getAttribute('data-esp-estado');
      if (est === 'carregando' || !est) return false;
      var imgs = [];
      Array.prototype.slice.call(document.querySelectorAll('main.esp .ev-card img'), 0, 4).forEach(function (i) { if (i.getBoundingClientRect().top < window.innerHeight) imgs.push(i); });
      return imagensProntas(imgs, esperaImg, 320);
    }
  });
  // Busca: pronta quando o motor assumiu o campo, o valor é o de ?q=, o esqueleto saiu e os pôsteres da 1ª tela estão decodificados
  pagina_('busca', {
    pronto: function () {
      var campo = document.querySelector('.hdr-search input[type="search"]');
      if (!campo || !campo.hasAttribute('data-dc-tpl')) return false;
      if (campo.value !== (new URLSearchParams(location.search).get('q') || '')) return false;
      if (document.querySelector('.res-grid[aria-busy="true"], .esp-grade[aria-busy="true"]')) return false;
      if (!document.querySelector('.res-grid a.card, .bu-grade a.card') && !document.querySelector('main .card h2, main .uui-empty-state, main .esp-vazio, main .esp-grade .sk')) return false; // Busca única: provas (.esp-grade), vazios e o erro do catálogo também valem
      return imagensProntas(visiveisDaGrade(8).map(function (c) { return c.querySelector('img'); }).filter(Boolean), esperaImg, 320);
    },
    alvos: function (ctx) {
      var lista = [], main = document.querySelector('#dc-root main');
      if (!main) return lista;
      var filhos = main.children, i;
      var voando = ctx && ctx.reg && ctx.reg.padrao === 'campo-busca'; // o campo voa da pílula: ele mesmo não entra em cascata
      for (i = 0; i < filhos.length; i++) {
        if (filhos[i].querySelector(':scope > .flt, :scope > aside')) continue; // a linha dos filtros e da grade é tratada abaixo
        if (voando && filhos[i].querySelector('.hdr-search')) continue;
        lista.push({ el: filhos[i], n: Math.min(i, 2) });
      }
      var aside = main.querySelector('aside');
      if (aside) lista.push({ el: aside, n: 2 });
      visiveisDaGrade(8).forEach(function (c, k) { lista.push({ el: c, n: 2 + k }); });
      var vazio = main.querySelector('section > .card');
      if (vazio) lista.push({ el: vazio, n: 2 });
      return lista;
    }
  });
  // Evento (chegando de fora da compra): o texto do hero, o corpo e o cartão de compra entram; o pôster do hero nunca anima
  pagina_('evento', {
    alvos: function () {
      var w = embrulho(), a = [];
      if (!w) return a;
      var hero = w.querySelector(':scope > .ev-hero'); if (hero) a.push({ el: hero, n: 0, so: 'opacidade' });
      var info = w.querySelector('.ev-hero-info'); if (info) a.push({ el: info, n: 0 });
      var tm = w.querySelector('.ev-title-m'); if (tm) a.push({ el: tm, n: 1 });
      var main = w.querySelector(':scope > div > main'), aside = w.querySelector(':scope > div > aside'), i;
      if (main) for (i = 0; i < main.children.length && i < 3; i++) if (!main.children[i].matches('.ev-title-m')) a.push({ el: main.children[i], n: Math.min(i + 1, 4) });
      if (aside) a.push({ el: aside, n: 2 });
      return a;
    }
  });

  /* =============================================================================================================
     5c. Trocas dentro da tela: o que sai esmaece, o que entra chega em cascata, o que está abaixo desliza
     ============================================================================================================= */
  /* troca({ gatilho, evento?, texto?, so?, alvo, filhos?, proprio?, semFantasma?, acrescenta?, eixo?, max? }):
       quando um elemento que casa com `gatilho` recebe o evento (click por padrão; 'change' para select), a região `alvo` vai mudar.
       Antes de o app tratar o evento, guarda (1) uma cópia da região (fantasma, inerte, na mesma posição) e (2) a posição de cada bloco da
       tela. Assim que o DOM muda (MutationObserver, antes do quadro): o fantasma esmaece e sobe 8 px em 160 ms; os `filhos` novos (ou a
       própria região, com `proprio`) entram em 280 ms, 80 ms depois, escalonados em 40 ms; e **os blocos que mudaram de lugar deslizam**
       do lugar antigo para o novo (a página abaixo não salta). Não depende de como a tela troca (nós novos ou textos no lugar).
       acrescenta: a lista só cresce; o que já estava fica e só o novo entra.   semFantasma: não guarda cópia (região grande demais).
       eixo(gatilho): -1 ou 1 troca o sentido para horizontal (ingresso anterior, próximo). Só transform e opacity. */
  var trocas = [];
  var trocando = false;
  function troca(def) { trocas.push(def); }

  function zAbaixoDoCabecalho() {
    var h = cabecalho(), z = h ? parseInt(getComputedStyle(h).zIndex, 10) : NaN;
    return isNaN(z) ? 1 : Math.max(1, z - 1);
  }
  function visivelNaJanela(r) { return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; }
  function ehFantasma(el) { return !!(el.closest && el.closest('[data-mov-fantasma]')); }

  /* posição de cada bloco da tela (os 4 primeiros níveis abaixo do embrulho), para deslizar o que mudar de lugar */
  function fotoDosBlocos() {
    var w = embrulho(), lista = [], mapa = new Map();
    if (!w) return null;
    // o que já está em animação (o campo voando, a cascata de entrada) tem retângulo que muda a cada quadro: fica de fora, com os seus filhos
    var animados = new Set();
    document.getAnimations().forEach(function (a) { var t = a.effect && a.effect.target; if (t && a.playState === 'running') animados.add(t); });
    var emAnimacao = function (el) { for (var n = el; n && n !== w; n = n.parentElement) if (animados.has(n)) return true; return false; };
    (function descer(el, nivel) {
      for (var i = 0; i < el.children.length && lista.length < 300; i++) {
        var f = el.children[i];
        if (f.matches('script, style, link, template, .hdr') || ehFantasma(f) || emAnimacao(f)) continue;
        var cs = getComputedStyle(f);
        if (cs.position === 'fixed' || cs.position === 'sticky' || cs.display === 'none') continue;
        var r = f.getBoundingClientRect();
        if (r.height <= 0) continue;
        lista.push(f);
        mapa.set(f, r.top);
        if (nivel < 4) descer(f, nivel + 1);
      }
    })(w, 0);
    return { lista: lista, topo: mapa };
  }
  function deslizarBlocos(foto, t, ignorar) {
    if (!foto) return;
    var acum = new Map();
    foto.lista.forEach(function (el) {
      if (!el.isConnected) return;
      if (ignorar.some(function (g) { return g && (g === el || g.contains(el)); })) return; // o que entra ou sai tem animação própria
      var pai = el.parentElement, base = acum.has(pai) ? acum.get(pai) : 0;
      var d = foto.topo.get(el) - el.getBoundingClientRect().top; // quanto o bloco já "andou" no layout, em px (positivo = estava mais abaixo)
      // o transform do pai já carrega o filho: só o que sobra é do filho (d medido depois do layout, sem transform ainda aplicado)
      var efetivo = d - base;
      acum.set(el, base + (Math.abs(efetivo) > 0.5 ? efetivo : 0));
      if (Math.abs(efetivo) > 0.5) vivas.push(el.animate([{ transform: translada(0, efetivo) }, { transform: 'none' }], { duration: t.base, easing: t.move }));
    });
  }

  /* o alvo real: o fantasma (cópia na mesma posição do DOM) também casa com o seletor */
  function acharAlvo(seletor) {
    var l = document.querySelectorAll(seletor), i;
    for (i = 0; i < l.length; i++) if (!ehFantasma(l[i])) return l[i];
    return null;
  }
  function itensDe(novo, def) {
    if (def.proprio) return novo ? [novo] : [];
    if (!novo) return [];
    return Array.prototype.slice.call(novo.querySelectorAll(def.filhos || ':scope > *')).filter(function (e) { return visivelNaJanela(e.getBoundingClientRect()); }).slice(0, def.max || 12);
  }
  function entrarItens(itens, tt, atraso, dx) {
    itens.forEach(function (el, i) {
      vivas.push(el.animate([{ opacity: 0, transform: translada(dx || 0, dx ? 0 : tt.md) }, { opacity: 1, transform: 'none' }], { duration: tt.base, delay: atraso + Math.min(i, 4) * tt.stagger, easing: tt.enter, fill: 'backwards' }));
    });
  }

  /* a lista só cresce ("Ver mais"): o que já estava fica; só os nós novos entram */
  function acrescentar(def, velho, t) {
    var antes = Array.prototype.slice.call(velho.querySelectorAll(def.filhos || ':scope > *'));
    var foto = fotoDosBlocos();
    trocando = true;
    var feito = false;
    var mo = new MutationObserver(function () {
      if (feito) return;
      feito = true;
      mo.disconnect();
      trocando = false;
      var tt = T(), novo = acharAlvo(def.alvo) || velho;
      var novos = Array.prototype.slice.call(novo.querySelectorAll(def.filhos || ':scope > *')).filter(function (e) { return antes.indexOf(e) < 0; });
      entrarItens(novos.slice(0, 12), tt, 0);
      deslizarBlocos(foto, tt, [novo]);
    });
    mo.observe(document.getElementById('dc-root') || document.body, { subtree: true, childList: true });
    setTimeout(function () { if (!feito) { mo.disconnect(); trocando = false; } }, 250);
  }

  function iniciarTroca(def, gat) {
    if (trocando || reduzido() || !temWAAPI) return;
    var t = T();
    if (!(t.base > 0)) return;
    var velho = acharAlvo(def.alvo);
    if (def.acrescenta) { if (velho) acrescentar(def, velho, t); return; }
    var foto = fotoDosBlocos();
    var g = null;
    if (velho && !def.semFantasma) {
      var r = velho.getBoundingClientRect();
      if (visivelNaJanela(r)) {
        g = velho.cloneNode(true);
        Array.prototype.concat.call([g], Array.prototype.slice.call(g.querySelectorAll('*'))).forEach(function (x) { x.removeAttribute('data-dc-tpl'); x.removeAttribute('id'); x.removeAttribute('name'); });
        g.setAttribute('aria-hidden', 'true');
        g.setAttribute('inert', '');
        g.setAttribute('data-mov-fantasma', '');
        g.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;box-sizing:border-box;pointer-events:none;z-index:' + zAbaixoDoCabecalho();
        velho.parentNode.appendChild(g);
        g.scrollLeft = velho.scrollLeft; g.scrollTop = velho.scrollTop;
      }
    }
    var sinal = def.eixo ? (def.eixo(gat) || 0) : 0;
    trocando = true;
    var feito = false;
    var limpar = function () { trocando = false; if (g && g.parentNode) g.remove(); mo.disconnect(); };
    var mo = new MutationObserver(function (ms) {
      var real = ms.some(function (m) { return !(g && (g.contains(m.target) || m.target === g)); });
      if (!real || feito) return;
      feito = true;
      var tt = T();
      var novo = acharAlvo(def.alvo);
      if (g) {
        var saida = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: sinal ? translada(-sinal * tt.md, 0) : translada(0, -tt.sm) }], { duration: tt.fast, easing: tt.exit, fill: 'forwards' });
        vivas.push(saida);
        saida.finished.then(limpar, limpar);
      } else setTimeout(limpar, tt.base + 6 * tt.stagger + 120);
      entrarItens(itensDe(novo, def), tt, g ? Math.round(tt.fast / 2) : 0, sinal ? sinal * tt.md : 0);
      deslizarBlocos(foto, tt, [novo, g]);
    });
    mo.observe(document.getElementById('dc-root') || document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src', 'class', 'aria-pressed', 'aria-expanded', 'aria-selected', 'data-open', 'style', 'hidden', 'open'] });
    setTimeout(function () { if (!feito) limpar(); }, 250); // nada mudou: o fantasma sai sem animar
  }
  ['click', 'change'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (!e.target || !e.target.closest) return;
      for (var i = 0; i < trocas.length; i++) {
        var d = trocas[i];
        if ((d.evento || 'click') !== ev) continue;
        if (d.so && !d.so.test(pagina)) continue;
        var gat = e.target.closest(d.gatilho);
        if (gat && d.texto && !d.texto.test(((gat.textContent || '') + ' ' + (gat.getAttribute('aria-label') || '')).trim())) continue;
        if (gat) { try { iniciarTroca(d.dinamico ? (d.dinamico(gat) || d) : d, gat); } catch (x) { trocando = false; } return; }
      }
    }, true);
  });

  // ---- Home: os botões da descoberta trocam o carrossel; o "+" acrescenta fichas; a cidade troca as seções
  troca({ so: /^home$/, gatilho: '.hd-chips .chip:not(.hd-mais)', alvo: '.sec-1 .ev-scroll', filhos: ':scope > *' });
  // o «+» dos carrosséis com chips (Home, Busca, Esportes) é uma caixinha: os extras saem de dentro dele e voltam; é o chips-caixinha.js, não a troca desta camada (3/11/2026)
  troca({ so: /^home$/, gatilho: '.cid-pop [role="option"]', alvo: '#dc-root main', filhos: ':scope > section', semFantasma: true, max: 5 });
  // ---- Busca: filtros, fichas, ordenação, "Ver mais" e o painel de filtros no celular
  // Busca única (busca-unica.mjs): trocar de escopo (aba do segmentado ou botão de ponte) é a troca maior: o painel inteiro (filtros e lista) se despede e o novo chega em cascata
  troca({ so: /^busca$/, gatilho: '.bu-seg [role="tab"], .bu-ponte-b', alvo: '#bu-painel', filhos: '.flt, .bu-grade > a.card, .bu-grade > .card' });
  troca({ so: /^busca$/, gatilho: '.flt input[type="checkbox"], .chip[aria-pressed], .chip[aria-label]', alvo: '.res-grid:not([aria-busy]), .esp-grade:not([aria-busy])', filhos: ':scope > a.card, :scope > .card' });
  troca({ so: /^busca$/, evento: 'change', gatilho: 'select', alvo: '.res-grid:not([aria-busy]), .esp-grade:not([aria-busy])', filhos: ':scope > a.card, :scope > .card' });
  troca({ so: /^busca$/, gatilho: '.bu-mais', acrescenta: true, alvo: '.res-grid:not([aria-busy]), .esp-grade:not([aria-busy])', filhos: ':scope > a.card, :scope > .card' });
  troca({ so: /^busca$/, gatilho: 'section button.bs', texto: /^Ver (mais )?\d+/, acrescenta: true, alvo: '.res-grid:not([aria-busy])', filhos: ':scope > a.card, :scope > .card' });
  // ---- Coleção, Venue: filtros e mapa
  troca({ so: /^colecao$/, gatilho: '.chip:not(.tur-praca)', alvo: '.tur-lista', filhos: ':scope > *' });
  troca({ so: /^colecao$/, gatilho: 'button.bs[aria-pressed]', texto: /mapa/i, alvo: '#dc-root section > div.card[style*="260px"]', proprio: true });
  troca({ so: /^venue$/, gatilho: '.chip', alvo: '#dc-root main section > div.card:has(> a)', filhos: ':scope > a' });
  // ---- Ingressos: abas Setores / Mapa e cupom
  troca({ so: /^ingressos$/, gatilho: '.seg button', alvo: '#dc-root main > section:last-of-type > div:last-child', proprio: true });
  troca({ so: /^ingressos$/, gatilho: '#cupom .linkbtn', alvo: '#cupom', proprio: true });
  // ---- Checkout: "Definir depois" / "Preencher agora"
  troca({ so: /^checkout$/, gatilho: 'main button', texto: /Definir depois|Preencher agora/, alvo: '#dc-root main > section.card:not(#pagamento)', proprio: true });
  // ---- Carteira: Próximos / Passados e ingresso anterior / próximo
  troca({ so: /^carteira$/, gatilho: '[role="tab"]', alvo: '#dc-root main', filhos: ':scope > *:nth-child(n+3)' });
  troca({ so: /^carteira$/, gatilho: 'button[aria-label="Ingresso anterior"], button[aria-label="Próximo ingresso"]', alvo: 'article.tk', proprio: true, eixo: function (g) { return /anterior/i.test(g.getAttribute('aria-label') || '') ? -1 : 1; } });

  /* =============================================================================================================
     5d. Superfícies: menus, folhas, tema, imagens e a busca ao vivo
     ============================================================================================================= */
  /* ---- menus e folhas: entram com opacidade e deslocamento; saem mais rápido. Observa o documento inteiro (o menu da conta mora no <html>). */
  function ehMenu(n) { return n.nodeType === 1 && n.matches && n.matches('.pv-menu, nav.menu, .cid-pop'); } // menu da conta (previa.js), o da Carteira e o popover da cidade (cidade-cabecalho.js)
  function ehVeu(n) { return n.nodeType === 1 && n.matches && n.matches('button.scrim'); }
  function painelDaFolha(n) { // o [role=dialog] de uma folha (não o menu da conta) e o véu que o envolve
    if (n.nodeType !== 1 || !n.querySelector || ehMenu(n) || n.hasAttribute('data-mov-fantasma')) return null;
    var d = n.matches('[role="dialog"]') ? n : n.querySelector('[role="dialog"]:not(.pv-menu)');
    if (!d || d.classList.contains('pv-menu')) return null;
    var v = d.parentElement;
    while (v && v !== n.parentElement && getComputedStyle(v).position !== 'fixed') v = v.parentElement;
    return { painel: d, veu: v && getComputedStyle(v).position === 'fixed' ? v : null };
  }
  function entrarSobreposicao(n) {
    var t = T();
    if (!(t.fast > 0) || !temWAAPI) return;
    if (ehVeu(n)) { vivas.push(n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' })); return; }
    if (ehMenu(n)) {
      n.style.transformOrigin = '100% 0';
      vivas.push(n.animate([{ opacity: 0, transform: translada(0, -t.sm) }, { opacity: 1, transform: 'none' }], { duration: t.fast, easing: t.enter, fill: 'backwards' }));
      return;
    }
    var f = painelDaFolha(n);
    if (!f) return;
    var r = f.painel.getBoundingClientRect();
    var embaixo = r.bottom >= window.innerHeight - 1; // folha ancorada embaixo (celular): sobe de baixo
    if (f.veu) vivas.push(f.veu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.base, easing: t.enter, fill: 'backwards' }));
    vivas.push(f.painel.animate([{ opacity: 0, transform: translada(0, embaixo ? t.lg : t.md) }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: f.veu ? Math.round(t.fast / 2) : 0, easing: t.enter, fill: 'backwards' }));
  }
  function sairSobreposicao(n, pai) {
    var t = T();
    if (!(t.fast > 0) || !temWAAPI) return;
    var veu = ehVeu(n), menu = ehMenu(n), f = menu || veu ? null : painelDaFolha(n);
    if (!menu && !f && !veu) return;
    var g = n.cloneNode(true);
    Array.prototype.concat.call([g], Array.prototype.slice.call(g.querySelectorAll('*'))).forEach(function (x) { x.removeAttribute('data-dc-tpl'); x.removeAttribute('id'); });
    g.setAttribute('aria-hidden', 'true'); g.setAttribute('inert', ''); g.setAttribute('data-mov-fantasma', '');
    g.style.pointerEvents = 'none';
    (pai && pai.isConnected ? pai : document.documentElement).appendChild(g);
    var fim = function () { if (g.parentNode) g.remove(); };
    var a;
    if (veu) {
      a = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.instant, easing: t.exit, fill: 'forwards' });
    } else if (menu) {
      g.style.transformOrigin = '100% 0';
      a = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, -t.sm) }], { duration: t.instant, easing: t.exit, fill: 'forwards' });
    } else {
      var p2 = f.painel.matches('[role="dialog"]') ? g.matches('[role="dialog"]') ? g : g.querySelector('[role="dialog"]') : null;
      a = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
      if (p2 && p2 !== g) p2.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: translada(0, t.sm) }], { duration: t.fast, easing: t.exit, fill: 'forwards' });
    }
    vivas.push(a);
    a.finished.then(fim, fim);
  }
  var sobreposicoesLigadas = false;
  function ligarSobreposicoes() {
    if (sobreposicoesLigadas) return;
    sobreposicoesLigadas = true;
    new MutationObserver(function (ms) {
      if (reduzido() || root.hasAttribute('data-mov-nav-gate')) return;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], j, n;
        if (m.type !== 'childList') continue;
        for (j = 0; j < m.addedNodes.length; j++) { n = m.addedNodes[j]; if (n.nodeType === 1 && !n.hasAttribute('data-mov-fantasma') && (ehMenu(n) || ehVeu(n) || (n.querySelector && n.querySelector('[role="dialog"]')) || n.getAttribute('role') === 'dialog')) entrarSobreposicao(n); }
        for (j = 0; j < m.removedNodes.length; j++) { n = m.removedNodes[j]; if (n.nodeType === 1 && !n.hasAttribute('data-mov-fantasma') && (ehMenu(n) || ehVeu(n) || (n.querySelector && n.querySelector('[role="dialog"]')) || n.getAttribute('role') === 'dialog')) sairSobreposicao(n, m.target); }
      }
    }).observe(root, { childList: true, subtree: true });
  }

  /* ---- tema: a troca claro/escuro acontece em 1 a 4 quadros; a classe liga a transição de cores (movimento-navegacao.css) no mesmo
     recálculo de estilo em que o data-theme muda, então ela parte das cores antigas. Em movimento reduzido os tokens valem 0. */
  var temaLigado = false;
  function ligarTema() {
    if (temaLigado) return;
    temaLigado = true;
    var anterior = root.getAttribute('data-theme'), fim = 0;
    new MutationObserver(function () {
      var atual = root.getAttribute('data-theme');
      if (atual === anterior) return;
      anterior = atual;
      if (reduzido() || root.hasAttribute('data-mov-nav')) return;
      root.setAttribute('data-mov-tema', '');
      clearTimeout(fim);
      fim = setTimeout(function () { root.removeAttribute('data-mov-tema'); }, T().base + 80);
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---- imagens: pôster e foto que terminam de carregar depois de a tela abrir entram com opacidade (160 ms) em vez de pipocar.
     A animação nasce pausada no primeiro quadro (sem tocar no style do app) e toca quando a imagem decodifica. */
  var imagensLigadas = false;
  function cuidarDeTodas() { if (!reduzido()) Array.prototype.forEach.call(document.querySelectorAll('#dc-root img'), cuidarDaImagem); }
  function cuidarDaImagem(img) {
    if (!img || img.tagName !== 'IMG' || ehFantasma(img) || img.closest('#mov-ponte, #mov-ponte-poster')) return;
    if (img.complete && img.naturalWidth > 0) return;
    var t = T();
    if (!(t.fast > 0) || !temWAAPI) return;
    if (img.__movAnim) { try { img.__movAnim.cancel(); } catch (e) {} }
    var a = img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.fast, easing: t.enter, fill: 'backwards' });
    a.pause();
    img.__movAnim = a;
    var toca = function () { img.removeEventListener('load', toca); img.removeEventListener('error', erro); if (a.playState === 'paused') a.play(); };
    var erro = function () { img.removeEventListener('load', toca); img.removeEventListener('error', erro); try { a.cancel(); } catch (e) {} };
    img.addEventListener('load', toca);
    img.addEventListener('error', erro);
    setTimeout(toca, 2500); // rede de segurança: a imagem nunca fica invisível
  }
  function ligarImagens() {
    if (imagensLigadas) return;
    imagensLigadas = true;
    var raiz = document.getElementById('dc-root');
    if (!raiz) return;
    cuidarDeTodas();
    new MutationObserver(function (ms) {
      if (reduzido()) return;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], j;
        if (m.type === 'attributes') { cuidarDaImagem(m.target); continue; }
        for (j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') cuidarDaImagem(n);
          else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('img'), cuidarDaImagem);
        }
      }
    }).observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  /* ---- busca ao vivo: a lista trocava a cada tecla. A tecla entra no campo na hora; a lista espera 100 ms de pausa (e é entregue na hora
     se a pessoa fizer outra coisa) e então troca uma vez, com a animação de troca. Só na Busca. */
  var buscaPendente = null, buscaLiberando = false;
  function entregarBusca() {
    if (!buscaPendente) return;
    var campo = buscaPendente.campo;
    clearTimeout(buscaPendente.timer);
    buscaPendente = null;
    if (!campo.isConnected) return;
    buscaLiberando = true;
    try {
      iniciarTroca({ alvo: '.res-grid:not([aria-busy])', filhos: ':scope > a.card, :scope > .card' }, campo);
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    } finally { buscaLiberando = false; }
  }
  if (pagina === 'busca') {
    document.addEventListener('input', function (e) {
      var campo = e.target;
      // só a digitação de verdade: o `input` que o previa.js dispara ao montar (e o que este módulo reentrega) passam direto
      if (buscaLiberando || !e.isTrusted || !campo || campo.type !== 'search' || e.isComposing || reduzido() || !temWAAPI) return;
      e.stopImmediatePropagation(); // o app só vê a pausa
      if (buscaPendente) clearTimeout(buscaPendente.timer);
      buscaPendente = { campo: campo, timer: setTimeout(entregarBusca, 100) };
    }, true);
    ['click', 'change', 'submit', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { if (buscaPendente && !(ev === 'keydown' && e.key !== 'Enter')) entregarBusca(); }, true);
    });
  }

  function ligarSuperficies() { ligarSobreposicoes(); ligarTema(); ligarImagens(); }
  // ligam depois que a tela abre (a abertura tem o seu próprio portão e entrada)
  (function esperarAbrir() {
    if (!root.hasAttribute('data-mov-nav-gate') && montada()) { setTimeout(ligarSuperficies, 300); return; }
    setTimeout(esperarAbrir, 60);
  })();

  /* =============================================================================================================
     6. Regras ligadas na fase 1
     ============================================================================================================= */
  regra({ seletor: 'a.hdr-search', para: /\/Busca\.dc\.html$/, padrao: 'campo-busca' });
  // Home: o botão Buscar do bloco de busca (e o Enter no campo, que clica nele) leva ao campo central da Busca
  regra({ seletor: 'a.hb-ir', para: /\/Busca\.dc\.html$/, padrao: 'campo-busca' });
  // fase 2: o cartão de evento vira o hero do Evento; todo o resto usa o padrão genérico
  regra({ seletor: 'a:has(img)', para: /\/Evento\.dc\.html$/, padrao: 'poster-hero' });
  regra({ todos: true, padrao: 'conteudo' });

  window.MovNav = { padrao: padrao, regra: regra, pagina: pagina_, paginas: paginas, troca: troca, tokens: T, reduzido: reduzido, anima: anima, entrarLista: entrarLista, fluir: fluir, capturarPonte: capturarPonte, regras: regras, padroes: padroes, trilha: trilha };

  chegar();
})();
