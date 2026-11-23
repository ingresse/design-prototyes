/* esportes-geo.js: «Perto de mim» do Ingresse Sports (pedido do Wander, 28/10/2026). Tudo local; nenhum serviço de terceiros.
   Fonte: tools/previa/esportes/geo.js; o gerador copia para previa/esportes-geo.js. Usado pela Home, pelas agregadoras e (depois) pela busca unificada: o escopo Sports lê a mesma fonte.

   REGRAS (docs/produto/ESPORTES-PROTOTIPO.md, «Perto de mim»):
   1. A Home e as listas mostram as ofertas NA HORA, com a estimativa por geo IP. No protótipo a estimativa é simulada: vale a cidade do cabeçalho (IngresseCidade),
      marcada como «aproximada pela sua rede». `estimar()` é o gancho ÚNICO que o Marcelino troca por geo IP real no servidor (devolve o mesmo formato).
   2. A localização precisa (navigator.geolocation) só é pedida DEPOIS de um gesto da pessoa (botão «Usar minha localização» ao lado das ofertas, com uma frase que
      diz para que serve). Nunca ao carregar a página: é a boa prática e evita o bloqueio permanente do navegador.
   3. Aceitou: a lista se atualiza (a tela anima) e mostra a distância em km. Negou, ignorou, falhou ou sem suporte: segue a estimativa e oferece «Escolher outra cidade»
      (o seletor do cabeçalho), sem insistir: depois de uma negativa o botão some nesta sessão.
   4. A escolha vale na sessão (IX.store «geo») e em todas as telas da vertical. Escolher uma cidade no cabeçalho descarta a localização precisa (a pessoa disse onde está).
   Evento no document: «previa:geo» (detail.tipo: precisa, negada, indisponivel, esquecida). */
(function () {
  'use strict';
  if (window.IngresseGeo) return;
  var CHAVE = 'geo';
  var memoria = null;
  function ler() { try { if (window.IX && IX.store) return IX.store.get(CHAVE, null); } catch (e) {} return memoria; }
  function gravar(v) { memoria = v; try { if (window.IX && IX.store) { if (v) IX.store.set(CHAVE, v); else IX.store.del(CHAVE); } } catch (e) {} }
  function emitir(tipo) { try { document.dispatchEvent(new CustomEvent('previa:geo', { detail: { tipo: tipo } })); } catch (e) {} }
  var suporta = function () { return !!(navigator.geolocation && navigator.geolocation.getCurrentPosition); };

  /** GANCHO PARA O SERVIDOR: troca por geo IP real. Devolve { origem: 'rede', nome, cidadeId, aproximada: true }; hoje simula a espera e usa a cidade do cabeçalho. */
  function estimar() {
    return new Promise(function (ok) {
      setTimeout(function () {
        var c = window.IngresseCidade && IngresseCidade.atual && IngresseCidade.atual();
        ok({ origem: 'rede', nome: c ? c.nome : '', cidadeId: c ? c.id : '', aproximada: true });
      }, 320);
    });
  }

  /** Pede a localização precisa. SÓ chamar a partir de um clique. Resolve { g: [lat, lon] }; rejeita com { motivo: 'negou' | 'tempo' | 'indisponivel' | 'sem-suporte' }. */
  function pedir() {
    return new Promise(function (ok, no) {
      if (!suporta()) { gravar(Object.assign({}, ler() || {}, { status: 'sem-suporte' })); emitir('indisponivel'); no({ motivo: 'sem-suporte' }); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        var g = [p.coords.latitude, p.coords.longitude];
        gravar({ status: 'precisa', g: g, em: Date.now() });
        emitir('precisa'); ok({ g: g });
      }, function (e) {
        var motivo = e && e.code === 1 ? 'negou' : e && e.code === 3 ? 'tempo' : 'indisponivel';
        gravar({ status: motivo === 'negou' ? 'negada' : 'indisponivel' });
        emitir(motivo === 'negou' ? 'negada' : 'indisponivel'); no({ motivo: motivo });
      }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
    });
  }

  /** Estado da sessão: { status: 'precisa' | 'negada' | 'indisponivel' | 'sem-suporte' | 'aproximada', g?, podePedir }. */
  function estado() {
    var s = ler() || {};
    var status = s.status === 'precisa' && s.g ? 'precisa' : s.status || 'aproximada';
    if (!suporta() && status !== 'precisa') status = 'sem-suporte';
    return { status: status, g: status === 'precisa' ? s.g : null, podePedir: status === 'aproximada' || status === 'indisponivel' };
  }
  function esquecer() { if (ler()) { gravar(null); emitir('esquecida'); } }
  document.addEventListener('previa:cidade', function () { var s = ler(); if (s && s.status === 'precisa') esquecer(); });
  window.IngresseGeo = { estimar: estimar, pedir: pedir, estado: estado, esquecer: esquecer };
})();
