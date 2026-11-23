/* local.js: o ESTADO ÚNICO do lugar onde a pessoa quer ver os eventos (pedido do Wander, 29/10/2026; Edu do Udi). Uma implementação, todas as telas.
   Contrato e uso: docs/design/LOCALIZACAO-SISTEMA.md. Interface: tools/previa/local/local-ui.js (modal, combobox, primeira visita) e tools/previa/cidade-cabecalho.js (botão do cabeçalho).

   window.IngresseLocal = {
     get()                 -> { id, nivel: 'pais'|'regiao'|'estado'|'cidade', nome, pais, regiao, uf, cidade, lat, lng, origem: 'geo'|'escolha'|'padrao' }   (sempre existe: o padrão do protótipo é São Paulo)
     set(lugar|id, origem) grava (localStorage `ingresse-local`, try/catch), vale entre telas e abas, dispara `ingresse:local` (e o antigo `previa:cidade`)
     limpar()              volta ao padrão (São Paulo, origem 'padrao')
     contem(evento)        hierárquico: país inclui tudo dentro dele, região inclui os estados, estado inclui as cidades. Aceita { uf|state, cidade|city, pais } ou { venue: 'Casa · Cidade, UF' }
     sugerir(texto, {limite}) lugares que casam com o texto (sem acento, sem caixa, alias, erro simples), com rótulo, nível e nº de eventos; precisa dos dados (pronto())
     iniciais()            as sugestões iniciais, as que têm mais eventos
     recentes()            os últimos lugares escolhidos (ids -> lugares)
     pedirGeo()            pede a localização do navegador e a leva ao lugar conhecido mais próximo (sem API externa); Promise<lugar>, rejeita com 'negada'|'indisponivel'|'tempo'|'erro'
     visto()               já houve decisão neste navegador (há lugar guardado)?
     pronto()              Promise dos dados de dados/lugares.json (hierarquia país > região > estado > cidade)
     lugares()             a lista inteira (depois de pronto())
   Dados e consulta: previa/dados/lugares.json e previa/lugares-consulta.js (IngresseLugares, da Iara; docs/produto/LUGARES-DADOS.md): a hierarquia, as sugestões, «o lugar mais próximo» e o mapa evento -> cidade. Este arquivo só guarda o ESTADO e a escolha.
   }
   Parâmetro de URL para testes e auditores (não trava no pedido de permissão): ?local=<id do lugar> (ex.: br-ba, br-ba-salvador, pt), ?local=nenhum (mantém o padrão e não pergunta) e ?local=pedir (esquece o lugar e refaz a primeira visita).
   Compatibilidade: window.IngresseCidade (lista, atual, explicita, definir, registrar) vira uma fachada deste estado, para as telas que ainda leem a cidade. */
(function () {
  'use strict';
  if (window.IngresseLocal) return;

  var CHAVE = 'ingresse-local', CHAVE_REC = 'ingresse-local-recentes';
  var PADRAO = { id: 'br-sp-sao-paulo', nivel: 'cidade', nome: 'São Paulo', pais: 'Brasil', regiao: 'Sudeste', uf: 'SP', cidade: 'São Paulo', lat: -23.55, lng: -46.63, origem: 'padrao' };
  var NIVEIS = { continente: 'continente', pais: 'país', regiao: 'região', estado: 'estado', distrito: 'distrito', cidade: 'cidade' };
  var memoria = {}; // quando o localStorage não deixa (janela privada), vale até recarregar

  function ler(k) { try { var v = localStorage.getItem(k); return v === null ? (memoria[k] === undefined ? null : memoria[k]) : v; } catch (e) { return memoria[k] === undefined ? null : memoria[k]; } }
  function gravar(k, v) { memoria[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function apagar(k) { delete memoria[k]; try { localStorage.removeItem(k); } catch (e) {} }
  var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };

  /* ---------- dados (a consulta é a IngresseLugares, da Iara) ---------- */
  var dados = null, porId = {}, Q = null, promessa = null;
  function indexar(d) {
    dados = d && d.lugares ? d : { lugares: [], sugestoesIniciais: [], eventoLugar: {} };
    porId = {}; dados.lugares.forEach(function (l) { porId[l.id] = l; });
    Q = window.IngresseLugares && dados.lugares.length ? window.IngresseLugares.criar(dados) : null;
  }
  function pronto() {
    if (!promessa) promessa = fetch('./dados/lugares.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) { indexar(d); aplicarParametroComDados(); return dados; });
    return promessa;
  }

  /* ---------- o lugar guardado ---------- */
  function nomeDe(id) { return id && porId[id] ? porId[id].nome : ''; }
  function paraLugar(l, origem) { // o retrato que se guarda: nomes (não ids) de país e região, `uf` = a sigla («SP»)
    return { id: l.id, nivel: l.nivel, nome: l.nome, pais: nomeDe(l.pais) || l.pais || 'Brasil', regiao: l.nivel === 'regiao' ? l.nome : (nomeDe(l.regiao) || ''), uf: l.sigla && l.nivel !== 'pais' ? l.sigla : '', cidade: l.nivel === 'cidade' ? l.nome : '', lat: l.lat, lng: l.lng, origem: origem };
  }
  function lerGuardado() {
    var v = ler(CHAVE);
    if (!v) return null;
    try { var o = JSON.parse(v); return o && o.id && o.nivel ? o : null; } catch (e) { return null; }
  }
  var atual = lerGuardado() || Object.assign({}, PADRAO);
  function get() { return atual; }
  function visto() { return !!ler(CHAVE); }

  function disparar(antes) {
    try { document.dispatchEvent(new CustomEvent('ingresse:local', { detail: { lugar: atual, antes: antes } })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('previa:cidade', { detail: { id: atual.id, nome: atual.nome } })); } catch (e) {} // o evento antigo, para as telas que ainda o ouvem
  }
  function set(l, origem) {
    if (typeof l === 'string') l = porId[l];
    if (!l) return null;
    var novo = l.origem ? Object.assign({}, l) : paraLugar(l, origem || 'escolha');
    if (origem) novo.origem = origem;
    var antes = atual, mudou = !(antes && antes.id === novo.id && antes.origem === novo.origem);
    atual = novo;
    gravar(CHAVE, JSON.stringify(novo));
    if (novo.origem !== 'padrao') recentePor(novo.id);
    if (mudou) disparar(antes);
    return atual;
  }
  function limpar() { var antes = atual; atual = Object.assign({}, PADRAO); gravar(CHAVE, JSON.stringify(atual)); if (antes.id !== atual.id || antes.origem !== atual.origem) disparar(antes); return atual; }
  function esquecer() { apagar(CHAVE); atual = Object.assign({}, PADRAO); }

  /* ---------- recentes ---------- */
  function listaRec() { try { var a = JSON.parse(ler(CHAVE_REC) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function recentePor(id) { var a = listaRec().filter(function (x) { return x !== id; }); a.unshift(id); gravar(CHAVE_REC, JSON.stringify(a.slice(0, 5))); }
  function recentes() { return listaRec().map(function (id) { return porId[id]; }).filter(Boolean).map(enriquecer); }

  /* ---------- contem: a hierarquia ---------- */
  function cidadeDoVenue(venue) {
    var v = (String(venue || '').split(' · ').pop() || '').trim(), m = /^(.+),\s*([A-Z]{2})$/.exec(v);
    return m ? { cidade: m[1].trim(), uf: m[2] } : null;
  }
  /* o lugar (cidade) do evento: pelo mapa da Iara (id do evento), senão pela cidade e a sigla que o evento traz ({ uf|state, cidade|city } ou { venue: 'Casa · Cidade, UF' }) */
  function lugarDoEvento(e) {
    if (!dados) return null;
    if (e.lg && porId[e.lg]) return porId[e.lg];
    var id0 = e.id != null ? e.id : e.i, cid0 = id0 != null && dados.eventoLugar ? dados.eventoLugar[id0] : null;
    if (cid0 && porId[cid0]) return porId[cid0]; // o mapa evento -> cidade da Iara manda; sem id, vale o nome da cidade e a sigla
    var cv = e.venue ? cidadeDoVenue(e.venue) : null;
    var uf = e.uf || e.state || e.u || (cv && cv.uf) || '', cidade = e.cidade || e.city || e.c || (cv && cv.cidade) || '';
    var id = e.id != null ? e.id : e.i, cid = id != null && dados.eventoLugar ? dados.eventoLugar[id] : null;
    if (!uf && !cidade) return cid && porId[cid] ? porId[cid] : null; // sem nome de cidade: vale o mapa evento -> cidade da Iara
    var achada = null;
    dados.lugares.forEach(function (l) { if (!achada && l.nivel === 'cidade' && norm(l.nome) === norm(cidade) && (!uf || !l.sigla || l.sigla === uf) && (e.pais ? true : (l.pais === 'br' || !uf))) achada = l; });
    if (achada) return achada;
    // cidade que não está na lista: vale pelo estado
    dados.lugares.forEach(function (l) { if (!achada && l.nivel === 'estado' && uf && l.sigla === uf && l.pais === 'br') achada = l; });
    return achada;
  }
  function contem(e, lugar) {
    lugar = lugar || atual;
    if (!e || !lugar) return false;
    if (Q) {
      var l = lugarDoEvento(e);
      if (!l) return true; // sem lugar (evento virtual): vale em todo lugar, como na consulta da Iara
      return Q.contem({ lugar: l }, lugar.id);
    }
    // os dados ainda não chegaram: a regra por nome (cidade, sigla do estado)
    var cv = e.venue ? cidadeDoVenue(e.venue) : null;
    var uf = e.uf || e.state || e.u || (cv && cv.uf) || '', cidade = e.cidade || e.city || e.c || (cv && cv.cidade) || '';
    if (lugar.nivel === 'pais') return norm(lugar.nome) === 'brasil' ? true : false;
    if (lugar.nivel === 'estado') return !!uf && uf === lugar.uf;
    if (lugar.nivel === 'cidade') return norm(cidade) === norm(lugar.cidade || lugar.nome) && (!lugar.uf || !uf || uf === lugar.uf);
    return true;
  }

  /* ---------- sugestões (IngresseLugares.sugerir: sem acento, sem caixa, alias, sigla; sem evento não se oferece) ---------- */
  function enriquecer(l) { // rótulo e contexto são da Iara: «Cidade · SP, Brasil», «Estado · Brasil», «Região · Brasil», «Continente»
    var ctx = l.contexto || NIVEIS[l.nivel] || '', n = l.eventosBusca != null ? l.eventosBusca : l.eventos || 0;
    return { id: l.id, nome: l.nome, nivel: l.nivel, tipo: l.tipo || l.nivel, nivelRotulo: l.rotulo || NIVEIS[l.nivel], contexto: ctx, rotulo: l.nome + ' · ' + ctx, eventos: n, uf: l.sigla || '', pais: nomeDe(l.pais) };
  }
  // «bahai» (troca de letras) não casa por prefixo: um segundo passo tolera o erro simples nos nomes
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var ant2 = null, ant = [], i, j;
    for (j = 0; j <= b.length; j++) ant[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i], menor = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) cur[j] = Math.min(cur[j], ant2[j - 2] + 1);
        if (cur[j] < menor) menor = cur[j];
      }
      if (menor > max) return max + 1;
      ant2 = ant; ant = cur;
    }
    return ant[b.length];
  }
  function sugerir(texto, o) {
    o = o || {};
    var q = norm(texto), limite = o.limite || 8;
    if (!q || !Q) return [];
    var lista = Q.sugerir(texto, { limite: limite }), ids = {};
    lista.forEach(function (l) { ids[l.id] = 1; });
    if (lista.length < limite && q.length >= 4) { // tolera erro de digitação (1 troca em nomes de até 6 letras, 2 nas maiores), só em quem ainda não apareceu e tem evento
      var m = q.length >= 7 ? 2 : 1, extra = [];
      dados.lugares.forEach(function (l) {
        if (ids[l.id] || !(l.eventosBusca || l.eventos)) return;
        var perto = (l.chaves || []).some(function (k) { return lev(q, k, m) <= m || k.split(' ').some(function (p) { return p.length >= 4 && lev(q, p, m) <= m; }); });
        if (perto) extra.push(l);
      });
      extra.sort(function (a, b) { return (b.eventosBusca || 0) - (a.eventosBusca || 0); });
      lista = lista.concat(extra).slice(0, limite);
    }
    return lista.map(enriquecer);
  }
  function iniciais() { return Q ? Q.iniciais().map(enriquecer).sort(function (a, b) { return b.eventos - a.eventos; }) : []; }

  /* ---------- localização do aparelho -> o lugar conhecido mais próximo (IngresseLugares.mapaMaisProximo, sem API externa) ---------- */
  var RAIO_ESTADO = 600; // km: fora do raio da cidade, vale o estado se a cidade mais próxima ainda está perto; senão o país
  function maisProximo(lat, lng) {
    if (!Q) return null;
    var r = Q.mapaMaisProximo(lat, lng, { raioKm: 120 });
    if (!r) return null;
    if (r.dentroDoRaio) return r.lugar;
    var estado = r.lugar.pai ? porId[r.lugar.pai] : null;
    if (estado && estado.nivel === 'estado' && r.distanciaKm <= RAIO_ESTADO) return estado;
    var pais = r.lugar.pais ? porId[r.lugar.pais] : null;
    return pais && r.distanciaKm <= 1500 ? pais : null; // longe de tudo o que se conhece (Japão, por exemplo): sem palpite, a pessoa escolhe
  }
  function pedirGeo() {
    return new Promise(function (ok, no) {
      if (!navigator.geolocation) { no('indisponivel'); return; }
      var feito = false;
      var fim = function (f, v) { if (feito) return; feito = true; clearTimeout(t); f(v); };
      var t = setTimeout(function () { fim(no, 'tempo'); }, 20000); // o aviso do navegador pode ficar sem resposta
      var ler1 = function () {
        navigator.geolocation.getCurrentPosition(function (p) {
          pronto().then(function () {
            var l = maisProximo(p.coords.latitude, p.coords.longitude);
            if (!l) { fim(no, 'erro'); return; }
            fim(ok, set(l, 'geo'));
          });
        }, function (e) { fim(no, e && e.code === 1 ? 'negada' : e && e.code === 3 ? 'tempo' : 'erro'); }, { timeout: 12000, maximumAge: 600000 });
      };
      try {
        if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (s) { if (s.state === 'denied') fim(no, 'negada'); else ler1(); }, ler1);
        else ler1();
      } catch (e) { ler1(); }
    });
  }

  /* ---------- parâmetro de URL (testes e auditores) ---------- */
  var param = null;
  try { param = new URLSearchParams(location.search).get('local'); } catch (e) {}
  if (param === 'nenhum') { if (!visto()) { gravar(CHAVE, JSON.stringify(PADRAO)); atual = Object.assign({}, PADRAO); } }
  else if (param === 'pedir') { esquecer(); }
  var idParam = param && param !== 'nenhum' && param !== 'pedir' ? param : null;
  if (idParam) pronto(); // ?local=<id>: carrega os dados já, para o lugar ser aplicado mesmo sem a modal
  function aplicarParametroComDados() { if (idParam && porId[idParam]) { var id = idParam; idParam = null; set(porId[id], 'escolha'); } }

  window.addEventListener('storage', function (e) { if (e.key === CHAVE) { var novo = lerGuardado() || Object.assign({}, PADRAO), antes = atual; if (novo.id !== atual.id || novo.origem !== atual.origem) { atual = novo; disparar(antes); } } });

  window.IngresseLocal = {
    get: get, set: set, limpar: limpar, contem: contem, sugerir: sugerir, iniciais: iniciais, recentes: recentes, pedirGeo: pedirGeo, visto: visto, pronto: pronto,
    lugares: function () { return dados ? dados.lugares : []; },
    cidadesDe: function (l) { // nomes das cidades com evento dentro do lugar (para quem filtra por cidade, como ?cidade= da Busca)
      l = l || atual; if (!dados) return l.nivel === 'cidade' ? [l.nome] : [];
      return dados.lugares.filter(function (x) { if (x.nivel !== 'cidade' || !(x.eventosBusca || x.eventos)) return false; var c = x, ok = false; while (c && !ok) { ok = c.id === l.id; c = c.pai ? porId[c.pai] : null; } return ok; }).map(function (x) { return x.nome; });
    }, porId: function (id) { return porId[id] || null; }, enriquecer: enriquecer, norm: norm, NIVEIS: NIVEIS, PADRAO: PADRAO,
    pedirParametro: function () { return param === 'pedir'; }, semPergunta: function () { return param === 'nenhum' || (param && param !== 'pedir'); }
  };

  /* ---------- fachada para quem ainda lê «cidade» (Home, Busca, Categoria, Esportes): uma fonte só, o IngresseLocal ---------- */
  window.IngresseCidade = {
    lista: function () { return []; },
    atual: function () { return { id: atual.id, nome: atual.nome, uf: atual.uf, nivel: atual.nivel }; },
    explicita: function () { return atual.origem !== 'padrao' && atual.nivel === 'cidade'; }, // a cidade deixou de ser filtro automático das buscas: só vale quando a pessoa escolheu uma cidade
    definir: function (id) { if (id) { var l = porId[id]; if (l) set(l, 'escolha'); } else limpar(); },
    registrar: function () {}
  };
})();
