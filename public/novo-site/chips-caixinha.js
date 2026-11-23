/* chips-caixinha.js: o «+» dos carrosséis com chips (.hd-chips: Descubra, Ingresse Sports, gêneros musicais, Esportes) é uma CAIXINHA de opções (pedido do Wander, 03/11/2026; revisto com a validação do Bessa, docs/design/CHIPS-CAIXINHA-VALIDACAO-BESSA.md).
   UM só movimento para todos os carrosséis:
     abrir  (+ → −): o «+» incha um pouco (pico a ~30 % do tempo e assenta com um quique) e o símbolo gira; os extras SAEM de dentro dele, em cascata curta (teto de 160 ms), e chegam ao lugar SEM passar do destino (o quique é no tamanho, não na posição);
                     a opacidade sobe só na primeira metade do voo (nunca dois textos legíveis ao mesmo tempo) e o 1.º extra fica por cima dos seguintes;
     fechar (− → +): o símbolo já gira no clique, os extras VOLTAM para dentro do «+» (ordem inversa, a partir do estado em que estiverem, mesmo no meio da abertura) e a altura do grupo começa a encolher junto; o extra ESCOLHIDO
                     (que fica à vista) desliza do lugar antigo para o novo; só depois o motor de templates tira os chips e o «+» faz um pulso curto.
   Só opacity, transform (translate, scale, rotate) e a altura do contêiner (com recorte vertical ligado só durante o movimento: `data-caixinha`, chips-caixinha.css).
   Movimento reduzido (tokens de duração a 0 ms, html[data-motion=reduce] ou prefers-reduced-motion): sem animação, o clique segue direto.
   Funciona sem tocar no estado das telas: a tela troca os chips pelo estado (`aria-expanded` do «+»); aqui só se observa o DOM. Na abertura, um MutationObserver anima os chips que acabaram de chegar; no fechamento, o clique é
   segurado na fase de captura, os extras animam de volta e o MESMO clique é reenviado (`__passa`), de modo que o estado muda depois do filme. */
(function () {
  'use strict';
  if (window.IngresseCaixinha) return;

  var root = document.documentElement;
  var mola = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // passa um pouco do alvo e assenta: só no TAMANHO
  var memoria = new WeakMap(); // grupo -> { aberto, ids }
  var CASCATA_MAX = 160; // ms: a cascata inteira nunca passa disto, com 3 ou com 9 extras

  function css(n, padrao) { var v = getComputedStyle(root).getPropertyValue(n).trim(); return v || padrao; }
  function ms(n, padrao) { var v = parseFloat(css(n, '')); return isNaN(v) ? padrao : v; }
  function tempos() {
    var reduz = root.getAttribute('data-motion') === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    return { reduz: reduz, base: ms('--motion-duration-base', 280), lento: ms('--motion-duration-slow', 480), passo: ms('--motion-stagger', 40), entra: css('--motion-ease-enter', 'ease-out'), sai: css('--motion-ease-exit', 'ease-in'), move: css('--motion-ease-move', 'ease-in-out') };
  }
  function pode(t, el) { return !t.reduz && t.lento > 0 && !document.hidden && el && el.animate; }
  function passoDe(t, n) { return n > 1 ? Math.min(t.passo, CASCATA_MAX / (n - 1)) : 0; }

  function maisDe(g) { return g.querySelector(':scope > .hd-mais'); }
  function extrasDe(g, mais) { var r = [], n = mais && mais.nextElementSibling; while (n) { r.push(n); n = n.nextElementSibling; } return r; }
  function centro(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function ate(origem, destino) { var a = centro(origem), b = centro(destino); return { dx: b.x - a.x, dy: b.y - a.y }; }
  function simbolo(mais) { return mais.querySelector('span'); }
  function cancelar(lista) { (lista || []).forEach(function (a) { try { a.cancel(); } catch (e) {} }); }

  /* o «+» incha um pouco (pico a ~30 %, assenta com a mola) e volta; `dur` acompanha a cascata dos chips */
  function pulso(mais, pico, dur) {
    mais.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
      { transform: 'scale(' + pico + ')', offset: 0.3, easing: mola },
      { transform: 'scale(1)' }
    ], { duration: dur, easing: 'linear' });
  }
  function gira(mais, de, ate_, dur, ease, fill) {
    var s = simbolo(mais); if (!s || !s.animate) return null;
    return s.animate([{ transform: 'rotate(' + de + 'deg)' }, { transform: 'rotate(' + ate_ + 'deg)' }], { duration: dur, easing: ease, fill: fill || 'none' });
  }

  /* a altura do grupo acompanha (segunda linha de chips): recorte vertical ligado só enquanto anima */
  function alturaAnim(g, h0, h1, dur, atraso, ease, fill) {
    if (h0 == null || Math.abs(h1 - h0) < 2) return null;
    g.setAttribute('data-caixinha', '');
    var a = g.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: dur, delay: atraso || 0, easing: ease, fill: fill || 'none' });
    var fim = function () { g.removeAttribute('data-caixinha'); };
    a.onfinish = fim; a.oncancel = fim;
    return a;
  }

  /* abrir: os chips novos saem de dentro do «+». Posição sem quique; o quique fica no tamanho; a opacidade sobe só na 1.ª metade */
  function abrir(g, mais, novos, t) {
    var n = novos.length, passo = passoDe(t, n);
    novos.forEach(function (el, i) {
      var d = ate(el, mais), atraso = i * passo, z = Math.min(n - i + 1, 9); // o 1.º extra fica por cima dos seguintes
      el.animate([{ translate: d.dx + 'px ' + d.dy + 'px' }, { translate: '0 0' }], { duration: t.lento, delay: atraso, easing: t.entra, fill: 'backwards' });
      el.animate([{ scale: '0.3' }, { scale: '1' }], { duration: t.lento, delay: atraso, easing: mola, fill: 'backwards' });
      el.animate([{ opacity: 0, zIndex: z }, { opacity: 1, zIndex: z, offset: 0.5 }, { opacity: 1, zIndex: z }], { duration: t.lento, delay: atraso, easing: 'ease-out', fill: 'both' });
    });
    pulso(mais, 1.14, t.lento + (n > 0 ? (n - 1) * passo : 0));
    gira(mais, -90, 0, t.lento, mola);
  }

  function ids(g, mais) { return extrasDe(g, mais).map(function (e) { return e.textContent.trim(); }); }

  function processar(g) {
    var mais = maisDe(g); if (!mais) { memoria.delete(g); return; }
    var aberto = mais.getAttribute('aria-expanded') === 'true';
    var antes = memoria.get(g) || { ids: [] }, agora = ids(g, mais), t = tempos();
    if (g.__abrindo && aberto) { // a pessoa clicou em «+»: os chips novos chegaram (o atributo e os chips podem vir em lotes diferentes)
      var novos = extrasDe(g, mais).filter(function (e) { return antes.ids.indexOf(e.textContent.trim()) < 0; });
      if (novos.length) {
        g.__abrindo = false;
        if (pode(t, mais)) {
          var h1 = g.getBoundingClientRect().height;
          alturaAnim(g, g.__h0, h1, t.lento, 60, t.move); // a altura começa um pouco depois: o espaço não abre antes dos chips
          abrir(g, mais, novos, t);
        }
        g.__h0 = null;
      }
    } else if (g.__fechou && !aberto) { // o filme de fechar terminou e a tela já tirou os chips
      g.__fechou = false;
      cancelar(g.__fantasmas); g.__fantasmas = null;
      cancelar(g.__simbolo); g.__simbolo = null;
      if (g.__alt) { try { g.__alt.cancel(); } catch (e) {} g.__alt = null; }
      if (pode(t, mais)) {
        pulso(mais, 1.1, t.lento * 0.75);
        gira(mais, 90, 180, t.base, t.entra);
        var esc = g.__escolhido; // o extra que ficou à vista: do lugar antigo para o novo
        if (esc) {
          var el = extrasDe(g, mais).filter(function (e) { return e.textContent.trim() === esc.texto; })[0];
          if (el) {
            var r = el.getBoundingClientRect(), dx = esc.r.left - r.left, dy = esc.r.top - r.top;
            if (Math.abs(dx) + Math.abs(dy) > 1) {
              var tr = el.style.transition; el.style.transition = 'none'; // a ficha recriada chega já preta, sem piscar de branco
              el.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], { duration: t.base, easing: t.entra });
              requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transition = tr; }); });
            }
          }
        }
      }
      g.__escolhido = null; g.__h0 = null;
    } else {
      cancelar(g.__fantasmas); g.__fantasmas = null;
    }
    memoria.set(g, { aberto: aberto, ids: agora });
  }

  /* fechar: segura o clique, os extras voltam para dentro do «+» (a partir do estado em que estiverem), depois o MESMO clique segue */
  document.addEventListener('click', function (e) {
    var mais = e.target.closest && e.target.closest('.hd-chips > .hd-mais'); if (!mais) return;
    var g = mais.parentNode, t = tempos();
    if (mais.__passa) { mais.__passa = false; return; }
    if (g.__fechando) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    g.__h0 = g.getBoundingClientRect().height;
    if (mais.getAttribute('aria-expanded') !== 'true') { g.__abrindo = true; setTimeout(function () { g.__abrindo = false; }, 1500); return; } // abrir: o clique segue e o observador anima o que chegar
    if (!pode(t, mais)) return; // fechar sem movimento: segue direto
    var todos = extrasDe(g, mais);
    var saem = todos.filter(function (el) { return el.getAttribute('aria-pressed') !== 'true'; }); // o extra escolhido continua à vista com o «+» fechado
    if (!saem.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    g.__fechando = true;
    var escolhido = todos.filter(function (el) { return el.getAttribute('aria-pressed') === 'true'; })[0];
    g.__escolhido = escolhido ? { texto: escolhido.textContent.trim(), r: escolhido.getBoundingClientRect() } : null;

    // o estado em que cada extra está AGORA (pode estar no meio da abertura): é o primeiro quadro do recuo
    var de = saem.map(function (el) { var cs = getComputedStyle(el); return { translate: cs.translate, scale: cs.scale, opacity: cs.opacity }; });
    saem.forEach(function (el) { el.getAnimations().forEach(function (a) { try { a.cancel(); } catch (x) {} }); });
    // altura final do grupo (sem os extras que saem), para a altura já começar a encolher junto com o recuo
    var h0 = g.getBoundingClientRect().height, antesDisplay = saem.map(function (el) { return el.style.display; });
    saem.forEach(function (el) { el.style.display = 'none'; });
    var h1 = g.getBoundingClientRect().height;
    saem.forEach(function (el, i) { el.style.display = antesDisplay[i]; });

    var dur = t.base * 0.7, passo = passoDe(t, saem.length);
    var fantasmas = saem.map(function (el, i) {
      var d = ate(el, mais);
      return el.animate([
        { translate: de[i].translate, scale: de[i].scale, opacity: de[i].opacity },
        { translate: d.dx + 'px ' + d.dy + 'px', scale: '0.3', opacity: 0 }
      ], { duration: dur, delay: (saem.length - 1 - i) * passo, easing: t.sai, fill: 'forwards' });
    });
    g.__fantasmas = fantasmas;
    g.__alt = alturaAnim(g, h0, h1, dur + (saem.length - 1) * passo, 0, t.move, 'forwards');
    g.__simbolo = [gira(mais, 0, 90, dur + (saem.length - 1) * passo, t.entra, 'forwards')].filter(Boolean); // o símbolo já gira no clique
    Promise.all(fantasmas.map(function (a) { return a.finished; })).then(function () {
      g.__fechando = false; g.__fechou = true; setTimeout(function () { g.__fechou = false; }, 1500); mais.__passa = true; mais.click();
    }).catch(function () {
      g.__fechando = false; cancelar(g.__fantasmas); g.__fantasmas = null; cancelar(g.__simbolo); g.__simbolo = null;
      if (g.__alt) { try { g.__alt.cancel(); } catch (x) {} g.__alt = null; }
    });
  }, true);

  /* o observador: depois de cada troca de chips, cada grupo tocado é processado uma vez */
  var pendentes = new Set(), agendado = false;
  function agendar(g) {
    pendentes.add(g);
    if (agendado) return; agendado = true;
    queueMicrotask(function () { agendado = false; var lote = Array.from(pendentes); pendentes.clear(); lote.forEach(function (x) { if (x.isConnected) processar(x); }); });
  }
  var obs = new MutationObserver(function (lista) {
    lista.forEach(function (m) {
      var alvo = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!alvo) return;
      var g = alvo.closest('.hd-chips'); if (g) agendar(g);
    });
  });
  function iniciar() {
    obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded'] });
    document.querySelectorAll('.hd-chips').forEach(agendar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  window.IngresseCaixinha = { processar: processar };
})();
