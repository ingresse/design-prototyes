/* cartao-evento.js: o MODELO do cartão de evento (`.ev-card`), parte do navegador (Isadora Nogueira e Edu do Udi; pedido do Wander, 30/10/2026).
   Copiado para previa/cartao-evento.js e carregado em todas as telas que têm cartão de evento (tools/previa/cartao-evento.mjs).
   A MARCAÇÃO é uma só, por tipo, em tools/previa/cartao-evento.mjs (cartaoEventoHtml); o CSS é um só, tools/previa/cartao-evento.css.
   Este arquivo é a única função que transforma o dado de cada tela no que a marcação lê (campos `c*`): texto do cartão no modelo «Halloween Secreto» (título; local e data
   em caixa alta), estado que muda a ação, os dois destinos (ver detalhes e comprar), os nomes acessíveis. Nenhuma tela monta texto de cartão por conta própria.

   REGRAS (docs/design/PEDIDO-30-10-CARDS.md, docs/design/CARDS-COMPONENTE.md):
     - o cartão NÃO mostra preço («a partir de», «ver preços») nem selo de venda, de fase, de distância ao usuário ou de proximidade («À venda», «Inscrições abertas», «a 1 km»,
       «Torcida visitante», «SEMIFINAL», «Esta semana», «Hoje», «Pré-venda»);
     - só os estados que mudam a ação ficam, como rótulo discreto: Esgotado, Cancelado, Adiado, Encerrado, Venda não aberta (ou «Abre em …»);
     - dois destinos: o cartão inteiro leva à página do evento («Ver detalhes de {evento}»); o botão leva à jornada de compra do tipo («Comprar ingressos para {evento}»).

   API (window.IngresseCartao):
     evento(ev, live, ctx)    evento do catálogo de qualquer tipo: jogo (`m`) pelo confronto, o resto por catalogo()
     catalogo(ev, ctx)        evento do catálogo (/api/eventos, formato da Busca e da Categoria também) -> campos c*; jogo (`m`) e prova vão pelos seus tipos
     fixo(e, live)            evento fixo do v5.3 (nome, data em texto, local, imagem)
     prova(p, opc)            prova do Ingresse Sports (formato normalizado de esportes-logica.js)
     jogo(v)                  saída de IngresseJogo.vista(): jogo de futebol
     circuito(c)              coleção esportiva (circuito) ou turnê
     agenda(x)                linha de agenda de Artista e de Local
     html(tipo, c)            o cartão como HTML (telas que montam texto em JavaScript): o mesmo modelo das telas em template
     dataCartao(x)            a data do cartão: «SAB - 15 DE OUT - 2026», «DE 15 A 17 DE OUT - 2026» (iso, texto, lista ou { ini, fim })
     localCurto(venue)        «Hotel Londres, Belo Horizonte»
   Variante «revenda»: catalogo/evento(ev, live, { revenda: true }) troca só o botão 2 («Compre na revenda», nova aba); o resto do cartão é o mesmo.
   Cada função devolve só os campos `c*`; a tela faz { ...item, ...IngresseCartao.xxx(...) }. */
(function () {
  if (window.IngresseCartao) return;

    var MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  /* data-cartao.js: a ÚNICA função que escreve a data do cartão de evento (pedido do Wander, 16/11/2026; Edu do Udi).
   Vai para o navegador embutida em previa/cartao-evento.js (marcador @@DATA_CARTAO@@ em tools/previa/cartao-evento.js, trocado por tools/previa/cartao-evento.mjs)
   e roda no Node para o teste (tools/testar-data-cartao.mjs): é o mesmo arquivo nos dois lugares, sem cópia da lógica.

   Formato (caixa alta, sem ponto, hífen com espaços; dia da semana com 3 letras sem acento; mês com 3 letras; dia com dois dígitos):
     uma data ........................ SAB - 15 DE OUT - 2026
     mais de uma data, mesmo mês ..... DE 15 A 17 DE OUT - 2026
     cruza meses ..................... DE 30 DE OUT A 02 DE NOV - 2026
     cruza anos ...................... DE 30 DE DEZ - 2026 A 02 DE JAN - 2027
   Datas não contíguas (sessões em dias soltos) também são «mais de uma data»: do primeiro ao último dia.

   Entradas aceitas por IngresseDataCartao.formatar(entrada):
     «2026-10-15», «2026-10-15T21:00:00-03:00» (lidos como estão escritos, no fuso do evento; não há conversão de fuso)
     lista de datas ............ ['2026-10-15', '2026-10-17']  ou  [{ iso: '…' }, …]
     intervalo ................. { ini: '2026-10-15', fim: '2026-10-17' }  (também { iso, isoFim })
     texto do v5.3 ............. «Sáb 17 out · 15h», «Hoje · 17h», «Sáb 5 e dom 6 dez», «5 mar a 3 abr»  (o ano vem do dia da semana; sem ele, do ano da data de referência)
   Sem entrada reconhecível devolve '' (quem chama põe «Data a confirmar»). Texto que não é data volta como veio. */
(function (g) {
  var SEM3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  var MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var MES_RE = '(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)';
  var SEM_RE = '(?:(dom|seg|ter|qua|qui|sex|s[áa]b)\\w*\\.?\\s+)?';
  var SEM_IDX = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 };

  function dd(n) { return (n < 10 ? '0' : '') + n; }
  function dt(a, m, d) { return { a: a, m: m, d: d }; }
  function chave(p) { return p.a * 10000 + p.m * 100 + p.d; }
  function porIso(x) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x || '').trim()); return m ? dt(+m[1], +m[2], +m[3]) : null; }
  function semana(p) { return SEM3[new Date(Date.UTC(p.a, p.m - 1, p.d, 12)).getUTCDay()]; }

  /** Uma data: SAB - 15 DE OUT - 2026 */
  function unica(p) { return semana(p) + ' - ' + dd(p.d) + ' DE ' + MES3[p.m - 1] + ' - ' + p.a; }

  /** Do primeiro ao último dia (já em ordem). */
  function intervalo(i, f) {
    if (chave(i) > chave(f)) { var t = i; i = f; f = t; }
    if (chave(i) === chave(f)) return unica(i);
    if (i.a !== f.a) return 'DE ' + dd(i.d) + ' DE ' + MES3[i.m - 1] + ' - ' + i.a + ' A ' + dd(f.d) + ' DE ' + MES3[f.m - 1] + ' - ' + f.a;
    if (i.m !== f.m) return 'DE ' + dd(i.d) + ' DE ' + MES3[i.m - 1] + ' A ' + dd(f.d) + ' DE ' + MES3[f.m - 1] + ' - ' + f.a;
    return 'DE ' + dd(i.d) + ' A ' + dd(f.d) + ' DE ' + MES3[i.m - 1] + ' - ' + i.a;
  }

  /** O ano de «Sáb 17 out» (o v5.3 não traz o ano): o que bate com o dia da semana entre o da referência, o seguinte e o anterior; sem dia da semana, o da referência. */
  function anoPorSemana(d, m, sem, ref) {
    var a0 = ref.getFullYear(), cand = [a0, a0 + 1, a0 - 1];
    if (sem >= 0) for (var i = 0; i < cand.length; i++) if (new Date(Date.UTC(cand[i], m - 1, d, 12)).getUTCDay() === sem) return cand[i];
    return a0;
  }
  function semIdx(s) { return s ? SEM_IDX[s.toLowerCase()] : -1; }
  function mesIdx(s) { return MES3.indexOf(s.toUpperCase()) + 1; }

  /** Texto do v5.3 -> lista de datas (1 ou mais); null se não for data. */
  function porTexto(x, ref) {
    var m, i, f;
    if (/^hoje/i.test(x)) return [dt(ref.getFullYear(), ref.getMonth() + 1, ref.getDate())];
    // «5 mar a 3 abr» / «De 5 mar a 3 abr de 2027»: dois meses
    m = new RegExp('(?:de\\s+)?' + SEM_RE + '(\\d{1,2})\\s+' + MES_RE + '\\s+(?:a|at[ée])\\s+' + SEM_RE + '(\\d{1,2})\\s+' + MES_RE + '(?:\\s+(?:de\\s+)?(\\d{4}))?', 'i').exec(x);
    if (m) {
      var m1 = mesIdx(m[3]), m2 = mesIdx(m[6]);
      var vira = m2 < m1 ? 1 : 0; // «30 dez a 2 jan»: o fim cai no ano seguinte
      var a1 = m[7] ? +m[7] - vira : anoPorSemana(+m[2], m1, semIdx(m[1]), ref);
      return [dt(a1, m1, +m[2]), dt(a1 + vira, m2, +m[5])];
    }
    // «Sáb 5 e dom 6 dez», «5 a 7 dez»: dois dias do mesmo mês (e: dias soltos; a: seguidos)
    m = new RegExp('(?:de\\s+)?' + SEM_RE + '(\\d{1,2})\\s+(?:e|a)\\s+' + SEM_RE + '(\\d{1,2})\\s+' + MES_RE + '(?:\\s+(?:de\\s+)?(\\d{4}))?', 'i').exec(x);
    if (m) {
      var mm = mesIdx(m[5]), aa = m[6] ? +m[6] : anoPorSemana(+m[2], mm, semIdx(m[1]), ref);
      return [dt(aa, mm, +m[2]), dt(aa, mm, +m[4])];
    }
    // «Sáb 17 out · 15h», «17 out 2026»
    m = new RegExp(SEM_RE + '(\\d{1,2})\\s+' + MES_RE + '(?:\\s+(\\d{4}))?', 'i').exec(x);
    if (m) { var m3 = mesIdx(m[3]); return [dt(m[4] ? +m[4] : anoPorSemana(+m[2], m3, semIdx(m[1]), ref), m3, +m[2])]; }
    return null;
  }

  /** Qualquer entrada -> lista de datas lidas; [] se nada foi reconhecido. */
  function ler(entrada, ref) {
    var out = [], p;
    if (entrada == null || entrada === '') return out;
    if (Array.isArray(entrada)) { entrada.forEach(function (e) { out = out.concat(ler(e, ref)); }); return out; }
    if (typeof entrada === 'object') {
      if (entrada.ini != null || entrada.fim != null) return ler([entrada.ini, entrada.fim], ref);
      if (entrada.iso != null) return ler([entrada.iso, entrada.isoFim], ref);
      return out;
    }
    var s = String(entrada).trim();
    p = porIso(s);
    if (p) return [p];
    return porTexto(s, ref) || out;
  }

  /** A data do cartão. `ref`: data de referência para «Hoje» e para texto sem ano (padrão: agora; o teste fixa). */
  function formatar(entrada, ref) {
    ref = ref || new Date();
    var l = ler(entrada, ref);
    if (!l.length) {
      var t = typeof entrada === 'string' ? entrada.trim() : '';
      return t;
    }
    var min = l[0], max = l[0];
    l.forEach(function (p) { if (chave(p) < chave(min)) min = p; if (chave(p) > chave(max)) max = p; });
    return intervalo(min, max);
  }

  var api = { formatar: formatar, unica: unica, intervalo: intervalo, ler: ler };
  if (typeof module === 'object' && module.exports) module.exports = api; else g.IngresseDataCartao = api;
})(typeof window !== 'undefined' ? window : globalThis);

  var contador = 0;
  /* a MARCAÇÃO de cada tipo, gerada por tools/previa/cartao-evento.mjs (a mesma função das telas em template): quem monta HTML no navegador (o Evento esportivo) usa html() */
  var MODELOS = {"show":"<article class=\"ev-card\" data-tipo=\"show\" data-situacao=\"{{e.cSit}}\" data-quieto=\"{{e.cQuieto}}\" data-ini=\"{{e.cIni}}\" data-sem-sincronia=\"1\">\n          <div class=\"ev-card__caixa\">\n            <a class=\"ev-card__link\" href=\"{{e.cHref}}\" target=\"{{e.cTarget}}\" rel=\"{{e.cRel}}\" aria-label=\"{{e.cAria}}\">\n            <span class=\"ev-card__midia\">\n              <img class=\"ev-card__img\" src=\"{{e.cImg}}\" alt=\"\" loading=\"lazy\" decoding=\"async\" width=\"810\" height=\"1080\">\n              <span class=\"ev-card__ver ilha\" aria-hidden=\"true\">Ver detalhes</span>\n            </span>\n            <span class=\"ev-card__corpo\">\n              <sc-if value=\"{{e.cTemEstado}}\" hint-placeholder-val=\"{{false}}\"><span class=\"tag ev-card__estado\" data-sit=\"{{e.cSit}}\"><span class=\"ev-ic\" data-i=\"{{e.cEstadoIcone}}\" aria-hidden=\"true\"></span>{{e.cEstado}}</span></sc-if>\n              <h3 class=\"ev-card__titulo\">{{e.cNome}}</h3>\n              <span class=\"ev-card__meta\"><span class=\"ev-card__data\">{{e.cData}}</span><span class=\"ev-card__local\">{{e.cLocal}}</span></span>\n            </span>\n            </a>\n            <sc-if value=\"{{e.cCtaTem}}\" hint-placeholder-val=\"{{true}}\"><a class=\"bs bs-ink ev-card__cta\" href=\"{{e.cCtaHref}}\" target=\"{{e.cCtaTarget}}\" rel=\"{{e.cCtaRel}}\" aria-label=\"{{e.cCtaAria}}\"><span class=\"ev-card__cta-t\">{{e.cCtaRotulo}}</span><svg class=\"ico ev-card__seta\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 17 17 7M8 7h9v9\"/></svg></a></sc-if>\n          </div>\n        </article>","prova":"<article class=\"ev-card\" data-tipo=\"prova\" data-situacao=\"{{e.cSit}}\" data-quieto=\"{{e.cQuieto}}\" data-ini=\"{{e.cIni}}\" data-sem-sincronia=\"1\">\n          <div class=\"ev-card__caixa\">\n            <a class=\"ev-card__link\" href=\"{{e.cHref}}\" target=\"{{e.cTarget}}\" rel=\"{{e.cRel}}\" aria-label=\"{{e.cAria}}\">\n            <span class=\"ev-card__midia\">\n              <img class=\"ev-card__img esp-capa\" src=\"{{e.cImg}}\" srcset=\"{{e.cSrcset}}\" sizes=\"(max-width: 640px) 78vw, 18rem\" alt=\"\" loading=\"lazy\" decoding=\"async\" width=\"480\" height=\"480\">\n              <span class=\"ev-card__ver ilha\" aria-hidden=\"true\">Ver detalhes</span>\n            </span>\n            <span class=\"ev-card__corpo\">\n              <sc-if value=\"{{e.cTemEstado}}\" hint-placeholder-val=\"{{false}}\"><span class=\"tag ev-card__estado\" data-sit=\"{{e.cSit}}\"><span class=\"ev-ic\" data-i=\"{{e.cEstadoIcone}}\" aria-hidden=\"true\"></span>{{e.cEstado}}</span></sc-if>\n              <h3 class=\"ev-card__titulo\">{{e.cNome}}</h3>\n              <span class=\"ev-card__meta\"><span class=\"ev-card__data\">{{e.cData}}</span><span class=\"ev-card__local\">{{e.cLocal}}</span></span>\n            </span>\n            </a>\n            <sc-if value=\"{{e.cCtaTem}}\" hint-placeholder-val=\"{{true}}\"><a class=\"bs bs-ink ev-card__cta\" href=\"{{e.cCtaHref}}\" target=\"{{e.cCtaTarget}}\" rel=\"{{e.cCtaRel}}\" aria-label=\"{{e.cCtaAria}}\"><span class=\"ev-card__cta-t\">{{e.cCtaRotulo}}</span><svg class=\"ico ev-card__seta\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 17 17 7M8 7h9v9\"/></svg></a></sc-if>\n          </div>\n        </article>","jogo":"<article class=\"ev-card\" data-tipo=\"jogo\" data-situacao=\"{{e.cSit}}\" data-quieto=\"{{e.cQuieto}}\" data-ini=\"{{e.cIni}}\" data-jogo=\"{{e.cJogoId}}\" data-sem-sincronia=\"1\">\n          <div class=\"ev-card__caixa\">\n            <a class=\"ev-card__link\" href=\"{{e.cHref}}\" target=\"{{e.cTarget}}\" rel=\"{{e.cRel}}\" aria-label=\"{{e.cAria}}\">\n            <span class=\"ev-card__midia ev-card__placa ilha\">\n              <sc-if value=\"{{e.cTemArte}}\" hint-placeholder-val=\"{{true}}\"><span class=\"ev-card__fundo\" aria-hidden=\"true\"><img src=\"{{e.cArte}}\" alt=\"\" loading=\"lazy\" decoding=\"async\" width=\"576\" height=\"768\"></span></sc-if>\n              <span class=\"ev-card__faixa\" aria-hidden=\"true\">\n                <sc-if value=\"{{e.cE1Tem}}\" hint-placeholder-val=\"{{true}}\"><img class=\"ev-card__escudo\" src=\"{{e.cE1Src}}\" alt=\"{{e.cE1Alt}}\" width=\"64\" height=\"64\"></sc-if><sc-if value=\"{{e.cE1Mon}}\" hint-placeholder-val=\"{{false}}\"><span class=\"ev-card__escudo ev-card__mono\">{{e.cE1Mono}}</span></sc-if>\n                <span class=\"ev-card__x\">x</span>\n                <sc-if value=\"{{e.cE2Tem}}\" hint-placeholder-val=\"{{true}}\"><img class=\"ev-card__escudo\" src=\"{{e.cE2Src}}\" alt=\"{{e.cE2Alt}}\" width=\"64\" height=\"64\"></sc-if><sc-if value=\"{{e.cE2Mon}}\" hint-placeholder-val=\"{{false}}\"><span class=\"ev-card__escudo ev-card__mono\">{{e.cE2Mono}}</span></sc-if>\n              </span>\n              <sc-if value=\"{{e.cTemCamp}}\" hint-placeholder-val=\"{{true}}\"><span class=\"ev-card__camp\">{{e.cCamp}}</span></sc-if>\n              <span class=\"ev-card__apaga\" aria-hidden=\"true\"></span>\n              <span class=\"ev-card__ver ilha\" aria-hidden=\"true\">Ver detalhes</span>\n            </span>\n            <span class=\"ev-card__corpo\">\n              <sc-if value=\"{{e.cTemEstado}}\" hint-placeholder-val=\"{{false}}\"><span class=\"tag ev-card__estado\" data-sit=\"{{e.cSit}}\"><span class=\"ev-ic\" data-i=\"{{e.cEstadoIcone}}\" aria-hidden=\"true\"></span>{{e.cEstado}}</span></sc-if>\n              <h3 class=\"ev-card__titulo\">{{e.cNome}}</h3>\n              <span class=\"ev-card__meta\"><span class=\"ev-card__data\">{{e.cData}}</span><span class=\"ev-card__local\">{{e.cLocal}}</span></span>\n            </span>\n            </a>\n            <sc-if value=\"{{e.cCtaTem}}\" hint-placeholder-val=\"{{true}}\"><a class=\"bs bs-ink ev-card__cta\" href=\"{{e.cCtaHref}}\" target=\"{{e.cCtaTarget}}\" rel=\"{{e.cCtaRel}}\" aria-label=\"{{e.cCtaAria}}\"><span class=\"ev-card__cta-t\">{{e.cCtaRotulo}}</span><svg class=\"ico ev-card__seta\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 17 17 7M8 7h9v9\"/></svg></a></sc-if>\n          </div>\n        </article>","turne":"<article class=\"ev-card\" data-tipo=\"turne\" data-situacao=\"{{e.cSit}}\" data-quieto=\"{{e.cQuieto}}\" data-ini=\"{{e.cIni}}\" data-sem-sincronia=\"1\">\n          <div class=\"ev-card__caixa\">\n            <a class=\"ev-card__link\" href=\"{{e.cHref}}\" target=\"{{e.cTarget}}\" rel=\"{{e.cRel}}\" aria-label=\"{{e.cAria}}\">\n            <span class=\"ev-card__midia\">\n              <img class=\"ev-card__img esp-capa\" src=\"{{e.cImg}}\" srcset=\"{{e.cSrcset}}\" sizes=\"(max-width: 640px) 78vw, 20rem\" alt=\"\" loading=\"lazy\" decoding=\"async\" width=\"480\" height=\"480\">\n              <span class=\"ev-card__ver ilha\" aria-hidden=\"true\">Ver detalhes</span>\n            </span>\n            <span class=\"ev-card__corpo\">\n              <sc-if value=\"{{e.cTemEstado}}\" hint-placeholder-val=\"{{false}}\"><span class=\"tag ev-card__estado\" data-sit=\"{{e.cSit}}\"><span class=\"ev-ic\" data-i=\"{{e.cEstadoIcone}}\" aria-hidden=\"true\"></span>{{e.cEstado}}</span></sc-if>\n              <h3 class=\"ev-card__titulo\">{{e.cNome}}</h3>\n              <span class=\"ev-card__meta\"><span class=\"ev-card__data\">{{e.cData}}</span><span class=\"ev-card__local\">{{e.cLocal}}</span></span>\n            </span>\n            </a>\n            <sc-if value=\"{{e.cCtaTem}}\" hint-placeholder-val=\"{{true}}\"><a class=\"bs bs-ink ev-card__cta\" href=\"{{e.cCtaHref}}\" target=\"{{e.cCtaTarget}}\" rel=\"{{e.cCtaRel}}\" aria-label=\"{{e.cCtaAria}}\"><span class=\"ev-card__cta-t\">{{e.cCtaRotulo}}</span><svg class=\"ico ev-card__seta\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 17 17 7M8 7h9v9\"/></svg></a></sc-if>\n          </div>\n        </article>"};
  /* os RÓTULOS do cartão: um mapa só, definido em tools/previa/cartao-evento.mjs (ROTULOS); aqui nenhum texto de cartão é escrito à mão */
  var R = {"ver":"Ver detalhes","verAria":"Ver detalhes de {n}","externo":", abre em outro site","novaAba":", abre em nova aba","revendaUrl":"https://revenda.ingresse.com","cta":{"show":["Comprar ingressos","Comprar ingressos para {n}"],"prova":["Inscrever-se","Inscrever-se em {n}"],"jogo":["Escolher setor","Escolher setor para {n}"],"turne":["Ver datas e comprar","Ver datas e comprar ingressos de {n}"],"circuito":["Ver etapas","Ver as etapas de {n}"],"revenda":["Compre na revenda","Compre na revenda ingressos de {n}"],"nao-aberto":["Avisar quando abrir","Avisar quando abrir a venda de {n}"],"esgotado":["Entrar na fila","Entrar na fila de {n}"]},"estado":{"comum":{"esgotado":"Esgotado","cancelado":"Cancelado","adiado":"Adiado","encerrado":"Encerrado","nao-aberto":"Venda não aberta"},"prova":{"esgotado":"Esgotada","cancelado":"Cancelada","adiado":"Adiada","encerrado":"Inscrições fechadas","nao-aberto":"Ainda não abriu"},"provaAbreEm":"Abre em {d}","jogoEncerrado":"Jogo realizado"},"data":{"semData":"Data a confirmar","novaData":"Nova data a confirmar","virtual":"Desafio virtual","qualquerLugar":"Em qualquer lugar"}};
  function t(modelo, n, d) { return String(modelo).replace('{n}', n == null ? '' : n).replace('{d}', d == null ? '' : d); }

  /* ---------- datas ----------
     UMA função escreve a data de todo cartão: IngresseDataCartao.formatar (tools/previa/data-cartao.js, embutida aqui no lugar de @@DATA_CARTAO@@; o teste roda o mesmo arquivo no Node).
     «SAB - 15 DE OUT - 2026»; mais de uma data: «DE 15 A 17 DE OUT - 2026» (cruzando meses ou anos, os dois lados completos). Pedido do Wander, 16/11/2026. */
  /** A data do cartão: aceita iso, texto do v5.3, lista de datas ou { ini, fim } (ver data-cartao.js); sem data, «Data a confirmar». */
  function dataCartao(x, ref) { return window.IngresseDataCartao.formatar(x, ref) || R.data.semData; }
  /** O que a data do cartão lê num evento do catálogo: várias datas (`datas`) ou o fim do intervalo (`isoFim`, `fim`, `endsAt`) quando o dado traz; senão, a data de início. */
  function dataDe(ev, ini) {
    var fim = ev.isoFim || ev.fim || ev.endsAt;
    if (ev.datas && ev.datas.length) return ev.datas;
    return fim && ini ? { ini: ini, fim: fim } : ini;
  }

  /* ---------- local: «Arena Aurora · São Paulo, SP» -> «Arena Aurora, São Paulo» ---------- */
  function localCurto(v) {
    v = String(v || '').trim();
    if (!v) return '';
    var p = v.split(' · ');
    if (p.length < 2) return v;
    var resto = p.slice(1).join(', ').replace(/,\s*[A-Z]{2}$/, '');
    return p[0] + ', ' + resto;
  }

  /* ---------- estado (só o que muda a ação) e os dois destinos ---------- */
  var ICONE_ESTADO = { 'nao-aberto': 'nao-aberto', esgotado: 'esgotado', cancelado: 'cancelado', encerrado: 'encerrado', adiado: 'adiado' };
  function sitNormal(s) { return s === 'ainda' ? 'nao-aberto' : (ICONE_ESTADO[s] ? s : (s === 'esgotada' ? 'esgotado' : '')); }

  /** Destino da jornada de compra a partir da página do evento: show -> Ingressos; prova -> Ingressos?esporte=; jogo -> Ingressos?jogo=; turnê -> Coleção. */
  function compraDe(href) {
    if (window.IngresseDestinos && window.IngresseDestinos.compra) return window.IngresseDestinos.compra(href);
    return /^Evento\.dc\.html/.test(href || '') ? 'Ingressos.dc.html' : href || 'Ingressos.dc.html';
  }


  /** O que todo cartão tem em comum. `d`: { tipo, oferta, nome, href, sit, estado (rótulo do estado, se a tela sabe um melhor), local, data, img, srcset, externo, ini, rotuloExtra }.
   *  `tipo` é o desenho (show, prova, jogo, turne); `oferta` é o que o botão diz (show, prova, jogo, turne). */
  function base(d) {
    var tipo = d.tipo, oferta = d.oferta || tipo;
    var sit = sitNormal(d.sit);
    var estado = sit ? (d.estado || R.estado[tipo === 'prova' ? 'prova' : 'comum'][sit]) : '';
    var href = d.href || 'Evento.dc.html';
    var out = {
      cTipo: tipo, cEhShow: tipo === 'show', cEhProva: tipo === 'prova', cEhJogo: tipo === 'jogo', cEhTurne: tipo === 'turne', cSit: sit, cEstado: estado, cTemEstado: !!estado, cEstadoIcone: sit ? ICONE_ESTADO[sit] : '',
      cQuieto: sit === 'cancelado' || sit === 'encerrado' ? '1' : '0',
      cNome: d.nome, cHref: href, cTarget: d.externo ? '_blank' : '_self', cRel: d.externo ? 'noopener' : '',
      cLocal: d.local || '', cData: d.data || '',
      cImg: d.img || '', cSrcset: d.srcset || '', cTemSrcset: !!d.srcset,
      cIni: d.ini ? 'true' : 'false', cId: 'evc' + (++contador),
      cAria: t(R.verAria, d.nome) + (estado ? ', ' + estado.toLowerCase() : '') + (d.externo ? R.externo : '')
    };
    // botão 2: o que muda com o estado. Encerrado, cancelado e adiado: só «Ver detalhes» (não há compra).
    var rot = '', aria = '', alvo = href;
    if (!sit) { var c = R.cta[oferta] || R.cta.show; rot = c[0]; aria = t(c[1], d.nome); alvo = d.externo ? href : (oferta === 'turne' ? href.replace(/#.*$/, '') + '#datas' : compraDe(href)); }
    else if (R.cta[sit]) { rot = R.cta[sit][0]; aria = t(R.cta[sit][1], d.nome); }
    if (rot && d.externo) aria += R.externo;
    out.cCtaTem = !!rot; out.cCtaRotulo = rot; out.cCtaAria = aria; out.cCtaHref = alvo;
    out.cCtaTarget = out.cTarget; out.cCtaRel = out.cRel;
    // variante «revenda» (parâmetro, não outro componente): o botão 2 vira «Compre na revenda» e abre a Revenda Oficial em nova aba; estados sem compra (cancelado, encerrado, adiado) seguem sem botão
    if (d.revenda && (!sit || sit === 'esgotado')) {
      out.cCtaTem = true; out.cCtaRotulo = R.cta.revenda[0]; out.cCtaAria = t(R.cta.revenda[1], d.nome) + R.novaAba; out.cCtaHref = R.revendaUrl;
      out.cCtaTarget = '_blank'; out.cCtaRel = 'noopener noreferrer';
    }
    return out;
  }

  /* ---------- show, festival, teatro (evento do catálogo) ---------- */
  function catalogo(ev, ctx) {
    ctx = ctx || {};
    var D = window.IngresseDestinos;
    var href = ctx.href || ev.href || (D ? D.evento(ev) : 'Evento.dc.html');
    var turne = /^Colecao\.dc\.html/.test(href);
    var iso = ev.iso || '';
    return base({
      tipo: 'show', oferta: turne ? 'turne' : (/[?&]esporte=/.test(href) ? 'prova' : 'show'), nome: ev.name || ev.nome, href: href, sit: ev.situacao || ev.sit,
      local: localCurto(ev.venue), data: dataCartao(dataDe(ev, iso || ev.date)), img: ev.img, externo: !!ev.ext, ini: ctx.ini, revenda: !!ctx.revenda
    });
  }

  /** Evento do catálogo de qualquer tipo: jogo de futebol (tem `m`; precisa da tabela de times, `live.fut`) vira cartão de jogo; o resto, cartão de evento. */
  function evento(ev, live, ctx) {
    var J = window.IngresseJogo;
    if (ev.m && J && live && live.fut) return jogo(J.vista(J.deApi(ev, live.fut)));
    return catalogo(ev, ctx);
  }

  /** Evento fixo do v5.3 (Home): a situação vem do catálogo, se o nome bater; senão, à venda. */
  function fixo(e, live) {
    var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    var achado = live && live.events ? live.events.filter(function (x) { return norm(x.name) === norm(e.name); })[0] : null;
    var href = e.href || (window.IngresseDestinos ? window.IngresseDestinos.evento(achado || e) : 'Evento.dc.html');
    var turne = /^Colecao\.dc\.html/.test(href);
    return base({ tipo: 'show', oferta: turne ? 'turne' : 'show', nome: e.name, href: href, sit: achado ? achado.situacao : 'venda', local: localCurto(e.venue), data: dataCartao(dataDe(achado || e, achado && achado.iso ? achado.iso : e.date)), img: e.img });
  }

  /* ---------- prova (Ingresse Sports) ----------
     p: { id, nome, iso, semData, vir, ks, kd, ku, local, c (cidade), sit, sl, sd, ab, nv, img, srcset }; a distância da PROVA é conteúdo do evento (não é proximidade): fica na linha da data. */
  function prova(p, opc) {
    opc = opc || {};
    var dist = (p.kd || '') + (p.ku ? ' ' + p.ku : '');
    var data;
    if (p.vir) { // desafio virtual: «5 mar a 3 abr» é um intervalo; o ano vem da data de início da prova
      var janela = (p.ks || '').replace(/^Virtual · /, '');
      data = janela ? dataCartao(janela, /^\d{4}/.test(p.iso || '') ? new Date(+p.iso.slice(0, 4), 0, 1) : undefined) : R.data.virtual;
    }
    else if (p.semData || !p.iso) data = R.data.semData;
    else data = dataCartao(dataDe(p, p.iso)) + (dist ? ' · ' + dist : '');
    if (p.vir && dist) data = data + ' · ' + dist;
    var sit = p.sit === 'venda' || p.sit === 'pre' ? '' : p.sit;
    var estado = '';
    if (sit === 'nao-aberto') estado = p.ab ? t(R.estado.provaAbreEm, '', dataCurta(p.ab)) : R.estado.prova['nao-aberto'];
    var local = p.vir ? R.data.qualquerLugar : [p.local, p.c].filter(Boolean).join(', ');
    var href = p.href || 'Evento.dc.html?esporte=' + p.id;
    var o = base({ tipo: 'prova', oferta: 'prova', nome: p.nome, href: href, sit: sit, estado: estado, local: local, data: data, img: p.img, srcset: p.srcset, ini: opc.ini });
    return o;
  }
  function dataCurta(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? (+m[3]) + ' ' + MES3[+m[2] - 1] : ''; }

  /* ---------- jogo de futebol: o que IngresseJogo.vista() devolve ---------- */
  function jogo(v) {
    var sit = sitNormal(v.sit);
    var estado = sit === 'nao-aberto' ? (v.selo || '') : (sit === 'encerrado' ? v.selo || R.estado.jogoEncerrado : '');
    var data = sit === 'adiado' ? R.data.novaData : (v.iso ? dataCartao(v.iso) : R.data.semData);
    var o = base({ tipo: 'jogo', oferta: 'jogo', nome: v.nome, href: v.href, sit: sit, estado: estado, local: localCurto(v.local), data: data, ini: v.ini === 'true' });
    o.cJogoId = v.id;
    o.cArte = v.arte || ''; o.cTemArte = !!v.temArte;
    o.cE1Src = v.c1src; o.cE1Mono = v.c1mono; o.cE1Alt = v.c1alt; o.cE1Tem = !!v.c1tem; o.cE1Mon = !!v.c1mon;
    o.cE2Src = v.c2src; o.cE2Mono = v.c2mono; o.cE2Alt = v.c2alt; o.cE2Tem = !!v.c2tem; o.cE2Mon = !!v.c2mon;
    o.cCamp = v.camp || ''; o.cTemCamp = !!v.camp;
    return o;
  }

  /* ---------- circuito esportivo e turnê (coleção) ---------- */
  function circuito(c) {
    var href = c.href;
    var quando = c.datas && c.datas.length ? dataCartao(c.datas) : (c.quando || ''); // as etapas são «mais de uma data»: do primeiro ao último dia
    var data = (c.etapas ? c.etapas + (quando ? ' · ' : '') : '') + quando;
    var o = base({ tipo: 'turne', oferta: 'turne', nome: c.nome, href: href, sit: '', local: c.locais || '', data: data, img: c.img, srcset: c.srcset });
    o.cCtaHref = href; // o circuito é uma lista de etapas: o botão leva às etapas
    o.cCtaRotulo = R.cta.circuito[0]; o.cCtaAria = t(R.cta.circuito[1], c.nome);
    o.cEsporte = true;
    return o;
  }

  /* ---------- linha de agenda (Artista e Local): evento com título, local, data e imagem opcionais ---------- */
  function agenda(x) {
    return base({ tipo: 'show', oferta: 'show', nome: x.nome, href: x.href || 'Evento.dc.html', sit: x.sit || '', local: localCurto(x.local), data: dataCartao(dataDe(x, x.iso || x.data)), img: x.img });
  }

  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** O cartão como HTML (para telas que montam texto em JavaScript): o MESMO modelo das telas em template, com os campos `c*` de uma das funções acima. */
  function html(tipo, c) {
    var t = MODELOS[tipo] || MODELOS.show;
    t = t.replace(/<sc-if value="\{\{e\.(\w+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, function (_, k, corpo) { return c[k] ? corpo : ''; });
    return t.replace(/\{\{e\.(\w+)\}\}/g, function (_, k) { return esc(c[k] == null ? '' : c[k]); });
  }

  window.IngresseCartao = { html: html, evento: evento, catalogo: catalogo, fixo: fixo, prova: prova, jogo: jogo, circuito: circuito, agenda: agenda, dataCartao: dataCartao, localCurto: localCurto, compraDe: compraDe };

  /* ---------- fade da capa ao carregar (a prova nasce com a placa e a imagem entra por opacidade) e entrada de cartões novos ---------- */
  function ok(img) { if (!img.hasAttribute('data-ok')) img.setAttribute('data-ok', ''); }
  document.addEventListener('load', function (e) { var el = e.target; if (el && el.tagName === 'IMG' && el.classList && el.classList.contains('ev-card__img')) ok(el); }, true);
  document.addEventListener('error', function (e) { var el = e.target; if (el && el.tagName === 'IMG' && el.classList && el.classList.contains('ev-card__img')) { el.setAttribute('data-erro', ''); ok(el); } }, true);
  function varrer(raiz) { var l = raiz.querySelectorAll ? raiz.querySelectorAll('img.ev-card__img:not([data-ok])') : []; for (var i = 0; i < l.length; i++) if (l[i].complete) ok(l[i]); }
  function iniciar() {
    varrer(document);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches('img.ev-card__img')) { if (n.complete) ok(n); } else varrer(n); } }); });
    }).observe(document.body, { childList: true, subtree: true });
    document.documentElement.classList.add('ev-card-js');
  }
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
