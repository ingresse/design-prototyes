/* home-sorteio.js: «Sortear um evento», o sorteio da Home (pedido do Wander, 29/10/2026; Isadora Nogueira). Documento: docs/design/SORTEIO-DIRECAO-DE-ARTE.md
   O FLUXO (a gravação da LP de Réveillon que o Wander fez, reproduzida): UM CLIQUE e pronto:
     1. uma FAIXA vermelha abre no próprio bloco da busca, logo abaixo dos dois botões (a altura anima e empurra o resto da Home com suavidade): sai do próprio botão (recorte `clip-path`),
        gradiente que corre, brilho passando, duas estrelas girando nas pontas, rótulo pequeno em caixa alta «Sorteando…» e o NOME do evento em fonte grande, centrado, trocando em ritmo que desacelera;
     2. no pouso o rótulo vira «Sorteado», o nome faz pop de escala (1 → 1,06), clarão e 10 faíscas (a explosão da LP); a faixa segura 1,1 s;
     3. abre uma MODAL SIMPLES (o IngresseModal, o mesmo de «O que você curte ao vivo?») com o evento em destaque: pôster quadrado que «cai» no lugar com faíscas, nome, local e data em caixa alta (sem preço e sem selo de venda, 30/10/2026),
        «Ver evento» e «Sortear de novo» (reinicia a faixa); ao fechar a modal, a faixa se recolhe.
   RITMO (o da LP): 20 passos, o último é o sorteado; o passo i espera 60 + 340·(i/19)³ ms (≈ 3 s); micro-pausa de 220 ms antes do pouso.
   REGRAS DO PROTÓTIPO (divergências da LP, registradas no documento): sem sombra e sem `blur()` (o desfoque do nome vira deslocamento, opacidade, esticada vertical e máscara nas bordas do carretel);
     raio de 8 px; vermelho da marca (tokens do botão primário) sem passar de um tom que dê 4,5:1 com o branco; faíscas com o GLIFO da Ingresse (e a estrela da LP) no lugar da arte de Réveillon.
   SEMPRE sobre TODOS os eventos à venda ou em pré-venda (pool da Iara, sorteio-pool.json); nada da modal «O que você curte ao vivo?» entra; não existe estado «nenhum evento».
   MOVIMENTO REDUZIDO: sem faixa nem carretel nem faíscas; a modal abre direto com o resultado. Esc durante o giro pula a animação.
   ACESSIBILIDADE: a faixa é `aria-hidden`; UMA região `role="status"` `aria-live="polite"` (no bloco da busca) anuncia só o início («Sorteando um evento entre N.») e o resultado; o foco vai ao «Ver evento»;
     o botão fica `aria-disabled` durante o giro (continua na ordem de Tab); vibração curta no pouso quando o aparelho tem e o movimento não está reduzido. */
(function () {
  'use strict';
  if (window.IngresseSorteio) return;
  var M = window.IngresseModal;
  var CT = function () { return window.IngresseCatalogo; }; // o catálogo da Iara (catalogo-busca.js carrega depois deste arquivo: lê-se na hora de usar)
  if (!M) return;

  var T = {
    sorteando: 'Sorteando…', sorteado: 'Sorteado', anuncioInicio: function (n) { return 'Sorteando um evento entre ' + n + '.'; },
    tituloModal: 'Evento sorteado', verEvento: 'Ver evento', denovo: 'Sortear de novo',
    anuncioResultado: function (e) { return 'Sorteado: ' + e.nome + ', ' + e.data + ', ' + e.local + '.'; },
    erro: 'Não conseguimos sortear agora. Tente de novo.', tentar: 'Tentar de novo',
    // jogo de futebol sorteado: a palavra é «jogo» (guia de futebol), e a venda só de sócios tem o nome do selo do jogo, não «Pré-venda» (29/10/2026)
    tituloJogo: 'Jogo sorteado', verJogo: 'Ver jogo'
  };
  var PASSOS = 20;
  var ES = 'cubic-bezier(0.16, 1, 0.3, 1)'; // `es` da LP
  var ESTRELAS = [[279,210,["M153.656 207.766C172.766 204.736 183.236 192.636 197.746 181.636C222.336 168.276 247.566 156.176 272.736 143.756C275.776 142.276 281.466 139.456 276.096 139.966C257.266 139.366 188.626 167.386 228.686 127.996C245.706 97.3259 168.736 166.746 222.546 79.8959C230.636 65.5359 239.947 51.2159 248.596 36.6759C234.796 43.0959 205.376 93.6259 181.966 105.576C176.476 89.8759 189.607 65.0259 192.057 47.3559C202.247 13.0059 171.697 78.6459 165.876 84.5459C144.917 120.596 150.977 47.3059 148.456 35.2259C147.676 29.4259 148.516 -7.32406 145.656 1.30594C138.507 33.1259 137.366 150.486 106.956 57.2459C103.466 48.6359 99.7265 40.6359 101.196 53.6459C118.326 167.026 63.0665 49.9459 36.5965 27.5059C47.6065 55.2359 122.186 156.696 43.1865 102.916C83.3065 157.526 62.0565 144.146 12.7065 131.146C-15.5035 122.676 10.6065 135.476 20.7765 140.966C41.2765 152.326 60.9165 166.116 80.4865 179.026C99.7865 199.106 124.716 214.306 153.676 207.776L153.656 207.766Z"]],[248,236,["M13.53 0C38.99 38.93 91.33 144.51 118.33 50.4C118.95 48.28 119.57 45.94 120.19 43.86C120.77 41.92 121.26 40.77 121.55 40.95C121.94 41.27 121.89 42.72 121.94 43.48C121.99 45.96 121.89 49.36 121.85 52.15C120.12 120.83 139.21 128.74 196.28 91.98C199.33 90.05 202.53 87.97 205.67 85.95C207.25 85.02 209.14 83.55 210.44 83.34C210.89 83.41 209.94 84.64 208.01 86.67C159.23 133.89 146.82 169.44 208.07 209.93C217.57 216.41 226.54 221.78 236.5 227.87C239.39 229.65 242.85 231.67 245.47 233.46C246.86 234.41 247.52 235.02 247.09 235.06C246.69 235.31 239.71 232.41 236.69 231.07C159.7 194.72 91.45 185.41 16.34 227.93C12.34 230.06 8.36 232.27 4.48 234.21C2.1 235.39 0.26 236.16 0 235.8C0.19 233.85 10.76 225.24 13.81 222.02C90.37 153.83 53.04 77.43 13.52 0H13.53Z"]],[252,280,["M165.283 279.912C165.693 280.042 164.843 277.882 163.063 274.052C155.603 258.472 145.953 239.302 138.823 224.312C131.483 207.032 123.013 189.542 119.053 171.052C112.913 144.132 128.193 136.232 152.073 132.782C182.603 128.352 213.333 131.062 243.763 133.932C246.703 134.052 250.333 134.552 251.873 134.032C251.893 133.792 250.123 133.322 247.063 132.672C226.743 128.562 201.013 124.682 179.943 118.792C160.723 113.172 134.583 107.222 127.733 85.722C121.313 62.482 132.693 39.252 144.083 19.432C145.603 16.692 152.603 5.70196 149.753 7.75196C148.443 8.66196 145.583 11.552 144.023 13.222C130.003 28.112 116.103 43.842 96.7931 51.782C87.3231 55.922 76.8531 59.192 66.6631 55.822C53.2031 51.202 42.3131 41.162 33.4331 30.252C28.4431 24.222 22.9531 16.162 17.7331 8.43196C16.2031 6.26196 11.5431 -0.59804 11.1031 0.0419598C10.8931 0.81196 11.4831 2.00196 12.2131 4.06196C21.7431 27.162 36.6331 56.572 27.3931 82.042C23.7631 91.252 14.0931 95.822 5.28308 98.452C2.31308 99.462 0.363083 100.242 0.0230828 101.302C-0.446917 103.702 6.39308 107.192 8.45308 108.852C21.9831 117.992 32.6031 133.312 31.3231 150.092C31.1331 153.512 30.2531 157.312 29.7431 160.452C29.3731 162.922 29.2931 164.622 30.0531 165.382C30.8831 166.272 32.6731 165.862 35.4531 164.872C38.9531 163.572 42.6131 161.832 46.6431 160.772C59.5331 157.092 73.9731 159.712 84.5931 167.862C91.6231 173.012 97.4131 179.092 102.963 185.772C119.813 206.352 132.863 227.612 146.873 250.282C152.063 258.532 159.553 272.782 165.253 279.902H165.273L165.283 279.912Z"]],[234,276,["M128.671 173.965C144.671 171.435 153.441 161.295 165.591 152.085C186.181 140.905 207.301 130.765 228.381 120.365C230.921 119.125 235.691 116.765 231.201 117.195C215.431 116.695 157.961 140.155 191.501 107.175C205.751 81.4946 141.301 139.625 186.361 66.9046C193.131 54.8746 200.931 42.8946 208.171 30.7146C196.621 36.0946 171.981 78.3946 152.381 88.4046C147.781 75.2646 158.781 54.4546 160.831 39.6546C169.361 10.8946 143.781 65.8546 138.911 70.7946C121.361 100.975 126.431 39.6146 124.331 29.4946C123.681 24.6346 124.381 -6.13537 121.981 1.09463C115.991 27.7446 115.041 126.005 89.5712 47.9246C86.6412 40.7146 83.5212 34.0146 84.7412 44.9146C99.0912 139.855 52.8112 41.8246 30.6512 23.0246C39.8712 46.2446 102.321 131.195 36.1712 86.1646C69.7612 131.885 51.9712 120.685 10.6512 109.805C-12.9688 102.715 8.89116 113.435 17.4112 118.025C34.5712 127.535 51.0212 139.085 67.4012 149.895C83.5612 166.705 104.431 179.435 128.681 173.965H128.671Z","M104.381 101.815C88.3812 104.345 79.6112 114.485 67.4612 123.695C46.8712 134.875 25.7512 145.015 4.67116 155.415C2.13116 156.655 -2.63884 159.015 1.85116 158.585C17.6212 159.085 75.0912 135.625 41.5512 168.605C27.3012 194.285 91.7512 136.155 46.6912 208.875C39.9212 220.905 32.1212 232.885 24.8812 245.065C36.4312 239.685 61.0712 197.385 80.6712 187.375C85.2712 200.515 74.2712 221.325 72.2212 236.125C63.6912 264.885 89.2712 209.925 94.1412 204.985C111.691 174.805 106.621 236.165 108.721 246.285C109.371 251.145 108.671 281.915 111.071 274.685C117.061 248.035 118.011 149.775 143.481 227.855C146.411 235.065 149.531 241.765 148.311 230.865C133.961 135.925 180.241 233.955 202.401 252.755C193.181 229.535 130.731 144.585 196.881 189.615C163.291 143.895 181.081 155.095 222.401 165.975C246.021 173.065 224.161 162.345 215.641 157.755C198.481 148.245 182.031 136.695 165.651 125.885C149.491 109.075 128.621 96.3446 104.371 101.815H104.381Z"]]]; // os 4 desenhos de estrela da LP: [largura, altura, [caminhos]]
  var GLIFO = [84,64,["M77.0943 0.00123719C73.9268 -0.0602101 70.5945 1.51407 68.1368 3.94124C66.566 5.49217 64.4859 6.38684 62.6014 6.38684C60.7157 6.38684 59.2605 5.4553 58.6824 3.90806C57.7992 1.54602 55.5604 -0.0012207 52.4618 -0.0012207C49.3632 -0.0012207 46.1256 1.54479 43.7171 3.90806C42.1414 5.45407 40.0835 6.38684 38.1977 6.38684C36.3133 6.38684 34.8101 5.49217 34.2406 3.94124C33.3487 1.51407 31.0337 -0.0602101 27.8269 0.00123719C22.8475 0.097095 17.5225 4.19563 15.948 9.14091C14.3525 14.1501 17.1153 18.2032 22.1328 18.2032C25.0371 18.2032 28.0606 16.8452 30.4101 14.7314C32.131 13.1829 34.2935 12.2956 36.2653 12.2956C38.2383 12.2956 39.8264 13.1841 40.5484 14.7314C41.5337 16.8452 43.6815 18.2032 46.5845 18.2032C49.4875 18.2032 52.5122 16.8452 54.8617 14.7314C56.5826 13.1829 58.7451 12.2956 60.7169 12.2956C62.69 12.2956 64.278 13.1841 65.0001 14.7314C65.9854 16.8452 68.1331 18.2032 71.0361 18.2032C76.0548 18.2032 81.4328 14.1489 83.0713 9.14091C84.6913 4.19686 82.0109 0.097095 77.0943 0.00123719Z","M62.2228 42.4749C63.6682 37.9979 68.0965 34.2742 72.6035 33.4975C73.6196 33.3217 74.584 32.4799 74.8989 31.5054L77.4033 23.7458C77.765 22.625 77.1487 21.7168 76.0281 21.7168H14.8793C13.7575 21.7168 12.5557 22.625 12.194 23.7458L9.68957 31.5054C9.37467 32.4799 9.79536 33.323 10.6982 33.4975C14.7034 34.2742 16.7281 37.9979 15.2828 42.4749C13.8374 46.952 9.40911 50.6757 4.90208 51.4524C3.88603 51.6281 2.92165 52.4699 2.60674 53.4445L0.10352 61.2041C-0.258125 62.3249 0.358148 63.2331 1.47876 63.2331H62.6263C63.7481 63.2331 64.9499 62.3249 65.3116 61.2041L67.816 53.4445C68.1309 52.4699 67.7102 51.6269 66.8074 51.4524C62.8022 50.6757 60.7775 46.952 62.2228 42.4749Z"]]; // o glifo da Ingresse (previa/assets/brand/ingresse-glifo.svg): [largura, altura, [caminhos]]
  var NS = 'http://www.w3.org/2000/svg';
  var ultimo = null, ocupado = false, corrida = null, reiniciando = false, vivas = [];

  var el = M.el;
  function reduzido() {
    return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.getAttribute('data-motion') === 'reduce';
  }
  function tok(nome, padrao) { var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); return v || padrao; }
  function ms(nome, padrao) { var n = parseFloat(tok(nome, '')); return isFinite(n) ? n : padrao; }
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  var depois = function (fn, t) { var id = setTimeout(fn, t); if (corrida) corrida.timers.push(id); return id; };

  function svg(d, cls) { // d = [largura, altura, caminhos]; quadrado centrado no desenho
    var m = Math.max(d[0], d[1]);
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', (-(m - d[0]) / 2) + ' ' + (-(m - d[1]) / 2) + ' ' + m + ' ' + m); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    if (cls) s.setAttribute('class', cls);
    d[2].forEach(function (p) { var x = document.createElementNS(NS, 'path'); x.setAttribute('d', p); x.setAttribute('fill', 'currentColor'); s.appendChild(x); });
    return s;
  }
  var estrela = function (i, cls) { return svg(ESTRELAS[i % ESTRELAS.length], cls); };
  var faisca = function (k) { return k % 2 ? estrela(k >> 1) : svg(GLIFO); }; // 5 glifos da Ingresse e 5 estrelas da LP, alternados
  function estrelaSpan(i, cls) { var sp = el('span', cls); sp.setAttribute('aria-hidden', 'true'); sp.appendChild(estrela(i)); return sp; }

  /* ---- o universo: TODOS os eventos à venda ou em pré-venda (o pool da Iara) ---- */
  function universo() {
    var C = CT();
    if (!C || !C.pool) return Promise.reject(new Error('catálogo indisponível'));
    return C.pool({}).then(function (pool) {
      var lista = pool.filter(function (e) { return e.situacao === 'venda' || e.situacao === 'pre'; }).map(paraCartao);
      if (!lista.length) throw new Error('pool vazio');
      return lista;
    });
  }
  function paraCartao(e) {
    return { id: e.id, nome: e.nome, data: e.data, local: e.local + (e.cidade ? ' · ' + e.cidade + ', ' + e.uf : ''), img: e.capa, quadrada: !!e.capaQuadrada, iso: e.iso, situacao: e.situacao, href: e.href, jogo: e.grupo === 'futebol' };
  }
  /* o pôster é carregado ANTES do pouso, por um objeto Image mantido vivo (um <img> que entra e sai do DOM tem a requisição abortada) */
  function precarregar(src) {
    return new Promise(function (ok) { var i = new Image(); vivas.push(i); i.onload = i.onerror = function () { ok(); }; i.src = src; setTimeout(ok, 2500); });
  }

  function partes() {
    var r = document.querySelector('[data-hs-raiz]'); if (!r) return null;
    return { r: r, acoes: r.querySelector('.hb-acoes'), btn: r.querySelector('[data-hc-sortear]'), curte: r.querySelector('[data-hc-abrir]'), palco: r.querySelector('[data-hs-palco]'), dentro: r.querySelector('[data-hs-dentro]'), vivo: r.querySelector('[data-hs-vivo]') };
  }
  function anunciar(P, txt) { if (!P.vivo) return; P.vivo.textContent = ''; setTimeout(function () { P.vivo.textContent = txt; }, 30); }
  /* a faixa tem de aparecer inteira: rola só o que falta (suave; sem animação com movimento reduzido) */
  function garantirVisivel(P) {
    var fx = P.dentro.querySelector('.hs-faixa'), b = P.palco.getBoundingClientRect(), alvoBase = b.top + (fx ? fx.offsetHeight : 88) + 24 + 12, vh = window.innerHeight; // altura real da faixa (80 px no desktop, 88 px no celular) e as margens (24 em cima, 12 embaixo)
    var falta = alvoBase - (vh - 16);
    if (falta > 0) window.scrollTo({ top: window.scrollY + falta, behavior: reduzido() ? 'auto' : 'smooth' });
  }

  /* ---- a explosão (a da LP): clarão e 10 faíscas em elipse que giram 180° ---- */
  function explosao(host, o) {
    var n = o.n || 10; // faíscas; o.cx/o.cy (px dentro do host) trocam o centro (50 %) por um ponto, como a estrela da ponta
    var c = el('span', 'hs-explosao' + (o.classe ? ' ' + o.classe : '')); c.setAttribute('aria-hidden', 'true');
    if (o.cx != null) { c.style.inset = 'auto'; c.style.left = o.cx + 'px'; c.style.top = o.cy + 'px'; c.style.width = '0'; c.style.height = '0'; }
    if (o.clarao) {
      var f = el('span', 'hs-explosao__clarao' + (o.anel ? ' hs-explosao__clarao--anel' : '')); c.appendChild(f);
      f.animate([{ opacity: o.clarao, transform: 'scale(0.4)' }, { opacity: 0, transform: 'scale(' + (o.anel ? 2 : 2.4) + ')' }], { duration: o.anel ? 420 : 700, easing: 'ease-out', fill: 'forwards' });
    }
    for (var k = 0; k < n; k++) {
      var t = k / n * Math.PI * 2 + (o.fase || 0), x = o.rx * Math.cos(t), y = o.ry * Math.sin(t);
      var s = el('span', 'hs-explosao__faisca'); s.appendChild(faisca(k + (o.k0 || 0))); c.appendChild(s);
      s.animate([
        { transform: 'translate(0px, 0px) scale(0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + x / 2 + 'px, ' + y / 2 + 'px) scale(1.3) rotate(90deg)', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + x + 'px, ' + y + 'px) scale(0.9) rotate(180deg)', opacity: 0 }
      ], { duration: 950, easing: 'ease-out', fill: 'forwards' });
    }
    host.appendChild(c);
    setTimeout(function () { c.remove(); }, 1200);
  }

  /* ---- a faixa ---- */
  function abrirFaixa(P) {
    var f = P.dentro.querySelector('.hs-faixa'), nova = !f;
    if (nova) {
      f = el('div', 'hs-faixa'); f.setAttribute('aria-hidden', 'true');
      var brilho = el('span', 'hs-faixa__brilho');
      var le = estrelaSpan(0, 'hs-faixa__estrela hs-faixa__estrela--e'), ld = estrelaSpan(2, 'hs-faixa__estrela hs-faixa__estrela--d');
      var palco = el('div', 'hs-faixa__palco'), rot = el('p', 'hs-faixa__rotulo'), car = el('div', 'hs-faixa__carretel');
      palco.appendChild(rot); palco.appendChild(car);
      f.appendChild(brilho); f.appendChild(le); f.appendChild(ld); f.appendChild(palco);
      var velho = P.dentro.querySelector('.hs-erro'); if (velho) velho.remove();
      P.dentro.appendChild(f);
    }
    var rot2 = f.querySelector('.hs-faixa__rotulo'), car2 = f.querySelector('.hs-faixa__carretel');
    rot2.textContent = T.sorteando; f.setAttribute('data-fase', 'girando');
    [].slice.call(car2.children).forEach(function (n) { n.animate([{ transform: 'translateY(0%)', opacity: 1 }, { transform: 'translateY(-90%)', opacity: 0 }], { duration: ms('--motion-duration-fast', 160), easing: 'ease-out', fill: 'forwards' }).onfinish = function () { n.remove(); }; }); // «Sortear de novo»: o nome anterior sai com a mesma saída do carretel
    P.palco.classList.remove('is-recolhendo'); P.palco.removeAttribute('inert');
    P.palco.classList.add('is-aberto');
    // a faixa sai do botão: começa do tamanho (horizontal) do próprio botão «Sortear um evento» e abre até a largura do bloco, com a curva `es` da LP
    var rb = P.btn.getBoundingClientRect(), rf = f.getBoundingClientRect(), rad = tok('--radius-base', '8px');
    var de = 'inset(0px ' + Math.max(0, rf.right - rb.right) + 'px 0px ' + Math.max(0, rb.left - rf.left) + 'px round ' + rad + ')';
    f.getAnimations().forEach(function (a) { a.cancel(); });
    f.animate([{ clipPath: de, opacity: 0.6 }, { clipPath: 'inset(0px 0px 0px 0px round ' + rad + ')', opacity: 1 }], { duration: 450, easing: ES, fill: 'both' });
    return { el: f, rot: rot2, car: car2, le: f.querySelector('.hs-faixa__estrela--e'), ld: f.querySelector('.hs-faixa__estrela--d'), atual: null };
  }
  /* um passo do carretel: o nome novo entra por baixo e o antigo sai por cima; no lugar do desfoque da LP, esticada vertical (só transform e opacity) */
  function nomeNovo(fx, txt, dur) {
    var n = el('span', 'hs-faixa__nome'); n.appendChild(el('span', 'hs-faixa__nome-t', txt));
    if (fx.atual) {
      var vel = fx.atual; vel.animate([{ transform: 'translateY(0%) scaleY(1)', opacity: 1 }, { transform: 'translateY(-90%) scaleY(1.25)', opacity: 0 }], { duration: dur, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { vel.remove(); };
    }
    fx.car.appendChild(n);
    n.animate([{ transform: 'translateY(90%) scaleY(1.25)', opacity: 0 }, { transform: 'translateY(0%) scaleY(1)', opacity: 1 }], { duration: dur, easing: 'ease-out', fill: 'forwards' });
    fx.atual = n;
  }
  function recolher(P) {
    var f = P.dentro.querySelector('.hs-faixa');
    if (!f) { P.palco.classList.remove('is-aberto'); return; }
    P.palco.setAttribute('inert', '');
    if (reduzido()) { f.remove(); P.palco.classList.remove('is-aberto'); P.palco.removeAttribute('inert'); return; }
    f.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.97)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
    P.palco.classList.add('is-recolhendo'); P.palco.classList.remove('is-aberto');
    setTimeout(function () { if (!P.palco.classList.contains('is-aberto')) { f.remove(); P.palco.classList.remove('is-recolhendo'); } P.palco.removeAttribute('inert'); }, ms('--motion-duration-slow', 480) + 40);
  }

  /* ---- o sorteio ---- */
  function erro(P) {
    ocupado = false; if (corrida) corrida.timers.forEach(clearTimeout);
    P.btn.removeAttribute('aria-disabled'); if (P.curte) P.curte.removeAttribute('inert');
    var f = P.dentro.querySelector('.hs-faixa'); if (f) f.remove();
    var velho = P.dentro.querySelector('.hs-erro'); if (velho) velho.remove();
    var b = el('div', 'hs-erro'); b.appendChild(el('p', 'hs-erro__t', T.erro));
    var t = el('button', 'bs', T.tentar); t.type = 'button'; t.addEventListener('click', function () { b.remove(); recolher(P); sortear(); }); b.appendChild(t);
    P.dentro.appendChild(b); P.palco.classList.add('is-aberto'); anunciar(P, T.erro);
    setTimeout(function () { t.focus({ preventScroll: true }); garantirVisivel(P); }, ms('--motion-duration-slow', 480));
  }

  function sortear() {
    var P = partes();
    if (!P || ocupado || !P.btn) return;
    ocupado = true;
    P.btn.setAttribute('aria-disabled', 'true');
    corrida = { timers: [], alvo: null, P: P, fx: null, concluida: false };
    // a faixa abre NO CLIQUE (antes de o catálogo responder: ele já foi aquecido, mas nunca se espera por ele para dar resposta ao toque)
    if (!reduzido()) { if (P.curte) P.curte.setAttribute('inert', ''); corrida.fx = abrirFaixa(P); garantirVisivel(P); }
    var c = corrida;
    universo().then(function (lista) { if (corrida === c) iniciar(P, lista); }, function () { if (corrida === c) erro(P); });
  }

  function iniciar(P, lista) {
    var alvo = lista[rnd(lista.length)];
    if (lista.length > 1 && ultimo != null && alvo.id === ultimo) { var outros = lista.filter(function (e) { return e.id !== ultimo; }); alvo = outros[rnd(outros.length)]; }
    ultimo = alvo.id; corrida.alvo = alvo;
    var prontoImg = precarregar(alvo.img);
    anunciar(P, T.anuncioInicio(lista.length));

    if (reduzido()) { // sem faixa: o resultado direto, depois do mínimo para o anúncio
      depois(function () { prontoImg.then(function () { anunciar(P, T.anuncioResultado(alvo)); resultado(P, alvo); }); }, 350);
      return;
    }
    var fx = corrida.fx;
    var seq = [], prev = null;
    for (var i = 0; i < PASSOS - 1; i++) { var e = lista[rnd(lista.length)]; if (lista.length > 1 && prev && e.id === prev.id) e = lista[(lista.indexOf(e) + 1) % lista.length]; seq.push(e); prev = e; }
    if (lista.length > 1 && prev && prev.id === alvo.id) seq[seq.length - 1] = lista[(lista.indexOf(alvo) + 1) % lista.length];
    seq.push(alvo);
    var t = 0;
    seq.forEach(function (e, i) {
      var espera = 60 + 340 * Math.pow(i / (PASSOS - 1), 3);
      t += espera;
      var dur = i === PASSOS - 1 ? 220 : Math.min(110, Math.round(espera * 0.85)); // a troca nunca dura mais que o passo: uma linha legível por vez
      depois(function () {
        fx.le.replaceChildren(estrela(i % 4)); fx.ld.replaceChildren(estrela((i + 2) % 4)); // a forma das estrelas troca a cada passo, como na LP
        nomeNovo(fx, e.nome, dur);
      }, t);
    });
    var tPouso = t + 220; // micro-pausa: o nome sorteado fica parado um instante antes do pouso
    depois(function () { prontoImg.then(function () { if (corrida && !corrida.concluida) pouso(P, alvo, fx); }); }, tPouso);
  }

  function pouso(P, alvo, fx) {
    fx.el.setAttribute('data-fase', 'pousou'); fx.rot.textContent = T.sorteado;
    fx.atual.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
    // a explosão sai das DUAS estrelas das pontas (5 faíscas brancas cada, mais um anel de clarão) e para antes do nome (que ocupa o centro): o texto nunca fica sob uma faísca branca
    var rf = fx.el.getBoundingClientRect(), curto = rf.width < 520;
    [fx.le, fx.ld].forEach(function (st, i) {
      var rs = st.getBoundingClientRect();
      explosao(fx.el, { cx: rs.left - rf.left + rs.width / 2, cy: rs.top - rf.top + rs.height / 2, rx: curto ? 14 : 110, ry: curto ? 36 : 40, n: 5, k0: i * 5, fase: i ? 0.3 : 0, clarao: 0.35, anel: true, classe: 'hs-explosao--faixa' + (curto ? ' hs-explosao--curta' : '') });
    });
    if (navigator.vibrate) { try { navigator.vibrate([18, 40, 18]); } catch (x) {} }
    anunciar(P, T.anuncioResultado(alvo));
    depois(function () { resultado(P, alvo); }, 1100); // a LP segura 1,1 s no nome sorteado antes de abrir o evento
  }

  /* Esc pula a animação: pouso sem cerimônia e a modal já */
  function pular() {
    if (!corrida || corrida.concluida || !ocupado) return;
    var P = corrida.P, alvo = corrida.alvo; if (!alvo) return; corrida.timers.forEach(clearTimeout); corrida.timers = [];
    var f = P.dentro.querySelector('.hs-faixa'); if (f) f.setAttribute('data-fase', 'pousou');
    anunciar(P, T.anuncioResultado(alvo));
    resultado(P, alvo);
  }

  /* ---- a modal simples do resultado ---- */
  function resultado(P, e) {
    if (!corrida || corrida.concluida) return;
    corrida.concluida = true;
    P.btn.removeAttribute('aria-disabled'); if (P.curte) P.curte.removeAttribute('inert');
    var f = P.dentro.querySelector('.hs-faixa'); if (f) f.setAttribute('data-fase', 'repouso');
    var sem = reduzido();
    var m = M.abrir({
      id: 'hs-modal', classe: 'hs-modal', titulo: e.jogo ? T.tituloJogo : T.tituloModal, gatilho: P.btn, gatilhoSeletor: '[data-hc-sortear]',
      foco: function (mm) { return mm.dialog.querySelector('[data-hs-ver]'); },
      aoFechar: function () { if (reiniciando) return; recolher(P); ocupado = false; },
      montar: function (mm) {
        var c = mm.corpo, rod = mm.rodape;
        var pw = el('div', 'hs-res__poster'); pw.setAttribute('data-forma', 'quadrada');
        var im = el('img'); im.src = e.img; im.alt = ''; im.decoding = 'async'; pw.appendChild(im);
        // o texto no modelo do cartão de evento (título; linha fina; local e data em caixa alta), sem preço, sem selo de venda e sem pílula de data (pedido do Wander, 30/10/2026)
        var h = el('h3', 'hs-res__nome', e.nome);
        var meta = el('div', 'hs-res__meta');
        var loc = el('p', 'hs-res__local', window.IngresseCartao ? window.IngresseCartao.localCurto(e.local) : e.local);
        var dt = el('p', 'hs-res__data', window.IngresseCartao ? window.IngresseCartao.dataCartao(e.iso || e.data) : e.data);
        meta.appendChild(dt); meta.appendChild(loc); // data acima do local, como no cartão de evento (16/11/2026)
        [pw, h, meta].forEach(function (n) { c.appendChild(n); });
        var acoes = el('div', 'hc-acoes');
        var de = el('button', 'bs', T.denovo); de.type = 'button';
        var ver = el('a', 'bp', e.jogo ? T.verJogo : T.verEvento); ver.href = e.href || 'Evento.dc.html'; ver.setAttribute('data-hs-ver', '');
        acoes.appendChild(de); acoes.appendChild(ver); rod.appendChild(acoes);
        de.addEventListener('click', function () { reiniciando = true; mm.fechar(false); reiniciando = false; ocupado = false; sortear(); });
        if (!sem) coreografia(pw, [h, meta], h);
      }
    });
    return m;
  }
  /* o pôster «cai» no lugar (vem de cima, maior e inclinado, assenta com um leve quique), as faíscas saem do pôster, o texto sobe em cascata e o nome desce de 1,06 a 1 */
  function coreografia(pw, textos, nome) {
    var comeco = 120; // o véu e o painel entram primeiro (camada de movimento da navegação)
    pw.animate([
      { transform: 'translateY(-56px) scale(1.14) rotate(-3deg)', opacity: 0 },
      { transform: 'translateY(6px) scale(0.985) rotate(0.5deg)', opacity: 1, offset: 0.62 },
      { transform: 'none', opacity: 1 }
    ], { duration: 620, delay: comeco, easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)', fill: 'backwards' });
    setTimeout(function () { if (pw.isConnected) { var r = pw.getBoundingClientRect(); var cap = Math.max(120, (pw.parentNode.clientWidth / 2) - 36); explosao(pw, { rx: Math.min(cap, Math.max(120, r.width * 0.9)), ry: Math.max(120, r.height * 0.9), classe: 'hs-explosao--poster' }); } }, comeco + 340);
    var esc = ms('--motion-stagger', 40), dist = ms('--motion-distance-sm', 8), base = ms('--motion-duration-base', 280), ease = tok('--motion-ease-enter', 'cubic-bezier(0.2, 0.7, 0.2, 1)');
    textos.forEach(function (f, i) {
      f.animate([{ opacity: 0, transform: 'translateY(' + dist + 'px)' }, { opacity: 1, transform: 'none' }], { duration: base, delay: comeco + 300 + i * esc, easing: ease, fill: 'backwards' });
    });
    nome.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1.06)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 700, delay: comeco + 300 + esc, easing: 'ease-out', fill: 'backwards' });
  }

  /* o catálogo é aquecido antes do clique (a faixa tem de ter conteúdo já no primeiro quadro) */
  function aquecer() { if (CT() && CT().pool) CT().pool({}).catch(function () {}); }
  document.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest('[data-hc-sortear]')) aquecer(); }, true);
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('[data-hc-sortear]')) aquecer(); }, true);
  document.addEventListener('touchstart', function (e) { if (e.target.closest && e.target.closest('[data-hc-sortear]')) aquecer(); }, { capture: true, passive: true });
  if (window.requestIdleCallback) requestIdleCallback(aquecer, { timeout: 1500 }); else setTimeout(aquecer, 1200);
  window.addEventListener('load', function () { setTimeout(aquecer, 300); });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hc-sortear]');
    if (b) { e.preventDefault(); sortear(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ocupado && corrida && !corrida.concluida) pular(); });

  window.IngresseSorteio = { sortear: sortear, universo: universo, PASSOS: PASSOS, ocupado: function () { return ocupado; } };
})();
