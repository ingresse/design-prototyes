/* lugares-consulta.js: leitura de previa/dados/lugares.json: sugestão por texto, «lugar mais próximo» da geolocalização e «este evento é deste lugar?».
   Dona: Iara Menezes (dados e contrato). Contrato: docs/produto/LUGARES-DADOS.md. Pedido do Wander, 29/10/2026.
   Referência de uso para o Edu do Udi (window.IngresseLocal) e a Mariana (Busca): é código simples, sem dependência, em ES5 (o protótipo roda sem build).
   Funciona no navegador (window.IngresseLugares) e no Node (require/import: module.exports). O gerador copia este arquivo para previa/lugares-consulta.js.

     var L = IngresseLugares.criar(dados);          // dados = o JSON de previa/dados/lugares.json já lido
     L.sugerir('sao pa')                            // lugares que casam com o texto; texto vazio = sugestões iniciais
     L.mapaMaisProximo(-23.56, -46.65)              // { lugar, distanciaKm, dentroDoRaio }
     L.contem(evento, 'br-sp')                      // true se o evento é do lugar (ou de um filho dele); evento sem lugar (virtual) vale em todo lugar
     L.lugar(id), L.ancestrais(id), L.iniciais()

   Nada aqui chama rede nem pede permissão: quem pede a localização do aparelho é o IngresseLocal (só depois de um gesto da pessoa). */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.IngresseLugares = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Mesma normalização do restante do protótipo (busca-dados.mjs): sem acento, minúsculo, só letras e números. */
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var ORDEM_NIVEL = { cidade: 0, estado: 1, pais: 2, regiao: 3 };
  var RAD = Math.PI / 180;
  function km(lat1, lng1, lat2, lng2) { // haversine
    var dLat = (lat2 - lat1) * RAD, dLng = (lng2 - lng1) * RAD;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Nota (0 a 100) de uma chave normalizada contra o texto normalizado. `alias` = a chave não é o nome oficial. */
  function nota(chave, q, alias) {
    var d = alias ? 5 : 0; // o nome oficial vale um pouco mais que o apelido
    if (chave === q) return 100 - d;
    if (q.length < 3) return 0; // com 1 ou 2 letras só vale o apelido exato («sp», «rj»): «sp» não pode achar «Spain»
    if (chave.indexOf(q) === 0) return 80 - d;
    var palavras = chave.split(' ');
    var qs = q.split(' ');
    // cada palavra do texto é começo de alguma palavra da chave («rio de» acha «rio de janeiro»; «paulo sao» também)
    var todas = qs.every(function (t) { return palavras.some(function (w) { return w.indexOf(t) === 0; }); });
    if (todas) return 60 - d;
    if (q.length >= 3 && chave.indexOf(q) >= 0) return 30 - d;
    return 0;
  }

  function criar(dados) {
    var lista = dados.lugares;
    var porId = {};
    lista.forEach(function (l) { porId[l.id] = l; });
    var cidades = lista.filter(function (l) { return l.nivel === 'cidade'; });

    function lugar(id) { return porId[id] || null; }
    /** Do próprio lugar até a raiz: cidade, estado, região (Brasil), país, continente. */
    function ancestrais(id) {
      var out = [], x = porId[id];
      while (x) { out.push(x); x = x.pai ? porId[x.pai] : null; }
      return out;
    }
    function iniciais() { return dados.sugestoesIniciais.map(lugar).filter(Boolean); }

    function sugerir(texto, opcoes) {
      opcoes = opcoes || {};
      var limite = opcoes.limite || 8;
      var q = norm(texto);
      if (!q) return iniciais().slice(0, limite);
      var siglaUf = q.length === 2 ? q : null;
      var achados = [];
      lista.forEach(function (l) {
        if (opcoes.niveis && opcoes.niveis.indexOf(l.nivel) < 0) return;
        if (!l.eventosBusca && !opcoes.incluirSemEventos) return; // só encerrado ou cancelado: não se oferece
        var melhor = 0;
        for (var i = 0; i < l.chaves.length; i++) {
          var n = nota(l.chaves[i], q, i > 0);
          if (n > melhor) melhor = n;
        }
        // «sp»: a sigla do estado acha o estado (apelido exato) e, logo atrás, as cidades dele
        if (!melhor && siglaUf && l.nivel === 'cidade' && l.sigla && norm(l.sigla) === siglaUf) melhor = 35;
        if (melhor) achados.push({ l: l, n: melhor });
      });
      achados.sort(function (a, b) {
        return b.n - a.n || ORDEM_NIVEL[a.l.nivel] - ORDEM_NIVEL[b.l.nivel] || b.l.eventos - a.l.eventos || a.l.nome.localeCompare(b.l.nome, 'pt-BR');
      });
      return achados.slice(0, limite).map(function (x) { return x.l; });
    }

    /** O lugar (cidade) mais próximo de um ponto. `raioKm`: até onde a cidade ainda conta como «onde você está» (padrão 120 km). Fora do raio ainda devolve a mais próxima,
     *  com `dentroDoRaio: false`: o Edu decide se oferece «Mais perto: X (a N km)» ou abre a busca. Coordenada inválida: null. */
    function mapaMaisProximo(lat, lng, opcoes) {
      opcoes = opcoes || {};
      lat = Number(lat); lng = Number(lng);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      var raio = opcoes.raioKm || 120, melhor = null, dist = Infinity;
      for (var i = 0; i < cidades.length; i++) {
        var d = km(lat, lng, cidades[i].lat, cidades[i].lng);
        if (d < dist) { dist = d; melhor = cidades[i]; }
      }
      if (!melhor) return null;
      return { lugar: melhor, distanciaKm: Math.round(dist), dentroDoRaio: dist <= raio };
    }

    /** O evento é do lugar `id`? Aceita o evento do catálogo (`lugar`), o compacto das categorias (`lg`) ou qualquer um com `id`/`i` (o mapa `eventoLugar`).
     *  Sem lugar (virtual) = verdadeiro; id vazio ou «todos» = verdadeiro. */
    function lugarDoEvento(ev) {
      if (!ev) return null;
      if (ev.lugar) return ev.lugar;
      var cid = ev.lg || dados.eventoLugar[ev.id != null ? ev.id : ev.i];
      return cid && porId[cid] ? porId[cid] : null; // o lugar da cidade tem os mesmos campos: cidade (id), uf, regiao, pais, continente
    }
    function contem(ev, id) {
      if (!id || id === 'todos') return true;
      var l = lugarDoEvento(ev);
      if (!l) return true;
      var cidade = l.cidade || l.id;
      return cidade === id || l.uf === id || l.regiao === id || l.pais === id || l.continente === id;
    }

    return { dados: dados, lugar: lugar, ancestrais: ancestrais, iniciais: iniciais, sugerir: sugerir, mapaMaisProximo: mapaMaisProximo, contem: contem, norm: norm };
  }

  return { criar: criar, norm: norm };
});
