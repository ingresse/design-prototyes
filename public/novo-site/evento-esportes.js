/* evento-esportes.js: variante esportiva de Evento.dc.html (Ingresse Sports, 28/10/2026; Mariana).
   Fonte: tools/previa/esportes/evento.js; o gerador (tools/previa/evento-esportes.mjs) copia para previa/evento-esportes.js.
   Documento: docs/produto/EVENTO-ESPORTIVO-PROTOTIPO.md.

   Ativação: Evento.dc.html?esporte=<id> (ids 2001 a 2183 de previa/dados/esportes.json) ou ?e=<slug>. Sem o parâmetro (ou com slug que não é de prova),
   este arquivo não faz nada: a Evento geral e a variante de futebol seguem como estão. O que ele faz quando ativo:
     - desliga o hero, o conteúdo e o painel da Evento geral (CSS no <head>, antes do primeiro quadro: tools/previa/evento-esportes.mjs) e monta no lugar
       os 15 blocos de docs/produto/INGRESSE-SPORTS-ESCOPO-E-IA.md §3.1, lidos do dado (nunca escritos à mão);
     - 11 estados (§3.3) pelo dado ou pela engrenagem (?estado=<chave>), 13 variações no painel;
     - botão de compra em grupo (DE-36), só com sport.grupo.ativo, que leva a sport.grupo.url;
     - barra fixa do celular, cabeçalho da vertical (data-marca="esportes", lockup preto) e trilha.
   Tudo local: nada de CDN. Só tokens do CSS (evento-esportes.css). Os textos vêm de docs/conteudo/INGRESSE-SPORTS-VOZ-E-MICROCOPY.md (IDs ES-xx no comentário);
   o que o microcopy não cobre está marcado com a palavra "provisório" no comentário e listado no documento (não aparece colchete na interface).
   Para outras telas (a etapa "Sua prova"): window.IngresseEsportes.grupo (rótulo, apoio, ativo(ev, estado), url(ev), html(ev, origem)). */
(function () {
  'use strict';
  if (window.__eeCarregado) return; // o motor de templates pode executar o <script> da helmet duas vezes
  window.__eeCarregado = true;

  var root = document.documentElement;
  var qs = new URLSearchParams(location.search);
  var QID = qs.get('esporte');
  var QSLUG = qs.get('e');
  var ehAtivo = !!(QID || (QSLUG && /-(19|20)\d\d$/.test(QSLUG)));

  /* ------------------------------------------------------------------ ícones (Untitled UI, traço 2, 24 px) */
  var IC = {
    award: 'M7.967 14.722 7 22l4.588-2.753c.15-.09.225-.135.305-.152a.5.5 0 0 1 .214 0c.08.017.155.062.305.152L17 22l-.966-7.279M19 9A7 7 0 1 1 5 9a7 7 0 0 1 14 0Z',
    chip: 'M9 2v2m6-2v2M9 20v2m6-2v2m5-13h2m-2 5h2M2 9h2m-2 5h2m4.8 6h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C20 17.72 20 16.88 20 15.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.72 4 16.88 4 15.2 4H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 6.28 4 7.12 4 8.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C6.28 20 7.12 20 8.8 20Zm1.8-5h2.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C15 14.24 15 13.96 15 13.4v-2.8c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C14.24 9 13.96 9 13.4 9h-2.8c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C9 9.76 9 10.04 9 10.6v2.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C9.76 15 10.04 15 10.6 15Z',
    backpack: 'M20 13v4.8c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C18.48 21 17.92 21 16.8 21H7.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C4 19.48 4 18.92 4 17.8V13m5-3h6m-5.714 4h5.428c2.133 0 3.199 0 4.021-.396a4 4 0 0 0 1.869-1.868C21 10.912 21 9.845 21 7.713c0-1.6 0-2.399-.297-3.016a3 3 0 0 0-1.401-1.4C18.685 3 17.885 3 16.286 3H7.714c-1.6 0-2.399 0-3.016.297a3 3 0 0 0-1.4 1.401C3 5.315 3 6.115 3 7.714c0 2.133 0 3.199.396 4.021a4 4 0 0 0 1.868 1.869C6.087 14 7.154 14 9.286 14Z',
    gift: 'M12 6v16m0-16H8.464c-.52 0-1.02-.21-1.389-.586A2.019 2.019 0 0 1 6.5 4c0-.53.207-1.04.575-1.414A1.947 1.947 0 0 1 8.465 2C11.214 2 12 6 12 6Zm0 0h3.536c.52 0 1.02-.21 1.389-.586A2.02 2.02 0 0 0 17.5 4c0-.53-.207-1.04-.575-1.414A1.947 1.947 0 0 0 15.535 2C12.786 2 12 6 12 6Zm8 5v7.8c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C18.48 22 17.92 22 16.8 22H7.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C4 20.48 4 19.92 4 18.8V11M2 7.6v1.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C2.76 11 3.04 11 3.6 11h16.8c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C22 10.24 22 9.96 22 9.4V7.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C21.24 6 20.96 6 20.4 6H3.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C2 6.76 2 7.04 2 7.6Z',
    file: 'M4 6.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C6.28 2 7.12 2 8.8 2h6.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C20 4.28 20 5.12 20 6.8v10.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C17.72 22 16.88 22 15.2 22H8.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C4 19.72 4 18.88 4 17.2V6.8Z',
    pin: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 22c4-4 8-7.582 8-12a8 8 0 1 0-16 0c0 4.418 4 8 8 12Z',
    clock: 'M12 6v6l4 2m6-2c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    calendar: 'M21 10H3m13-8v4M8 2v4m-.2 16h8.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.72 21 18.88 21 17.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 4 17.88 4 16.2 4H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.28 3 7.12 3 8.8v8.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 22 6.12 22 7.8 22Z',
    flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19',
    drop: 'M22 16a6 6 0 0 1-12 0c0-4.314 6-14 6-14s6 9.686 6 14ZM8 9a3 3 0 1 1-6 0c0-2.157 3-7 3-7s3 4.843 3 7Z',
    bus: 'M8.5 19v2.2c0 .28 0 .42-.055.527a.5.5 0 0 1-.218.218C8.12 22 7.98 22 7.7 22H5.8c-.28 0-.42 0-.527-.055a.5.5 0 0 1-.218-.218C5 21.62 5 21.48 5 21.2V19m14 0v2.2c0 .28 0 .42-.055.527a.5.5 0 0 1-.218.218C18.62 22 18.48 22 18.2 22h-1.9c-.28 0-.42 0-.527-.055a.5.5 0 0 1-.218-.218c-.055-.107-.055-.247-.055-.527V19M3 12h18M3 5.5h18m-14.5 10H8m8 0h1.5M7.8 19h8.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 16.72 21 15.88 21 14.2V6.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 2 17.88 2 16.2 2H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 4.28 3 5.12 3 6.8v7.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 19 6.12 19 7.8 19Z',
    car: 'M5 13h3M2 9l2 1 1.27-3.812c.263-.787.394-1.18.637-1.471a2 2 0 0 1 .803-.578C7.062 4 7.477 4 8.306 4h7.388c.829 0 1.244 0 1.597.139a2 2 0 0 1 .802.578c.243.29.374.684.636 1.471L20 10l2-1m-6 4h3M6.8 10h10.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C22 12.28 22 13.12 22 14.8v2.7c0 .465 0 .697-.038.89a2 2 0 0 1-1.572 1.572c-.193.038-.425.038-.89.038H19a2 2 0 0 1-2-2 .5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5 2 2 0 0 1-2 2h-.5c-.465 0-.697 0-.89-.038a2 2 0 0 1-1.572-1.572C2 18.197 2 17.965 2 17.5v-2.7c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C4.28 10 5.12 10 6.8 10Z',
    camera: 'M2 8.377c0-.35 0-.525.015-.673a3 3 0 0 1 2.69-2.69C4.851 5 5.035 5 5.404 5c.143 0 .214 0 .274-.004a2 2 0 0 0 1.735-1.25c.023-.056.044-.12.086-.246.042-.127.063-.19.086-.246a2 2 0 0 1 1.735-1.25C9.38 2 9.448 2 9.58 2h4.838c.133 0 .2 0 .26.004a2 2 0 0 1 1.735 1.25c.023.056.044.12.086.246.042.127.063.19.086.246a2 2 0 0 0 1.735 1.25c.06.004.131.004.273.004.37 0 .554 0 .702.015a3 3 0 0 1 2.69 2.69c.014.147.014.322.014.672V16.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C19.72 21 18.88 21 17.2 21H6.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C2 18.72 2 17.88 2 16.2V8.377Z M12 16.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    pack: 'M20.5 7.278 12 12m0 0L3.5 7.278M12 12v9.5m9-5.441V7.942c0-.343 0-.514-.05-.667a1 1 0 0 0-.215-.364c-.109-.119-.258-.202-.558-.368l-7.4-4.111c-.284-.158-.425-.237-.575-.267a1 1 0 0 0-.403 0c-.15.03-.292.11-.576.267l-7.4 4.11c-.3.167-.45.25-.558.369a1 1 0 0 0-.215.364C3 7.428 3 7.599 3 7.942v8.117c0 .342 0 .514.05.666a1 1 0 0 0 .215.364c.109.119.258.202.558.368l7.4 4.111c.284.158.425.237.576.268.133.027.27.027.402 0 .15-.031.292-.11.576-.268l7.4-4.11c.3-.167.45-.25.558-.369a.999.999 0 0 0 .215-.364c.05-.152.05-.324.05-.666ZM16.5 9.5l-9-5',
    heart: 'M11.993 5.136c-2-2.338-5.333-2.966-7.838-.826s-2.858 5.719-.89 8.25c1.635 2.105 6.585 6.544 8.207 7.98.182.162.272.242.378.274a.504.504 0 0 0 .286 0c.106-.032.197-.112.378-.273 1.623-1.437 6.573-5.876 8.208-7.98 1.967-2.532 1.658-6.133-.89-8.251-2.549-2.118-5.84-1.512-7.839.826Z',
    users: 'M22 21v-2a4.002 4.002 0 0 0-3-3.874M15.5 3.291a4.001 4.001 0 0 1 0 7.418M17 21c0-1.864 0-2.796-.305-3.53a4 4 0 0 0-2.164-2.165C13.796 15 12.864 15 11 15H8c-1.864 0-2.796 0-3.53.305a4 4 0 0 0-2.166 2.164C2 18.204 2 19.136 2 21M13.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    download: 'M21 15v1.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V15m14-5-5 5m0 0-5-5m5 5V3',
    ext: 'M21 9V3m0 0h-6m6 0-8 8m-3-6H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 7.28 3 8.12 3 9.8v6.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 21 6.12 21 7.8 21h6.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C19 18.72 19 17.88 19 16.2V14',
    chev: 'm6 9 6 6 6-6',
    check: 'M20 6 9 17l-5-5',
    alert: 'M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    info: 'M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z',
    hash: 'M4 8h16M4 16h16M8 3v18m8-18v18',
    tag: 'M8 8h.01M2 5.2v4.475c0 .489 0 .733.055.963.05.204.13.4.24.579.123.201.296.374.642.72l7.669 7.669c1.188 1.188 1.782 1.782 2.467 2.004a3 3 0 0 0 1.854 0c.685-.222 1.28-.816 2.467-2.004l2.212-2.212c1.188-1.188 1.782-1.782 2.004-2.467a3 3 0 0 0 0-1.854c-.222-.685-.816-1.28-2.004-2.467l-7.669-7.669c-.346-.346-.519-.519-.72-.642a2.001 2.001 0 0 0-.579-.24C10.409 2 10.165 2 9.676 2H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 3.52 2 4.08 2 5.2ZM8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z',
    bell: 'M9.354 21c.705.622 1.632 1 2.646 1s1.94-.378 2.646-1M18 8A6 6 0 1 0 6 8c0 3.09-.78 5.206-1.65 6.605-.735 1.18-1.102 1.771-1.089 1.936.015.182.054.252.2.36.133.099.732.099 1.928.099H18.61c1.196 0 1.795 0 1.927-.098.147-.11.186-.179.2-.361.014-.165-.353-.755-1.088-1.936C18.78 13.206 18 11.09 18 8Z',
    arrow: 'M5 12h14m0 0-7-7m7 7-7 7',
    share: 'M21 12v4.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V12m13-5-4-4m0 0L8 7m4-4v12',
    truck: 'M14 7h2.337c.245 0 .367 0 .482.028a1 1 0 0 1 .29.12c.1.061.187.148.36.32l4.062 4.063c.173.173.26.26.322.36.054.09.095.188.12.29.027.115.027.237.027.482V15.5c0 .466 0 .699-.076.883a1 1 0 0 1-.541.54c-.184.077-.417.077-.883.077m-5 0H14m0 0V7.2c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C12.48 4 11.92 4 10.8 4H5.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2 5.52 2 6.08 2 7.2V15a2 2 0 0 0 2 2m10 0h-4m0 0a3 3 0 1 1-6 0m6 0a3 3 0 1 0-6 0m16.5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
    hourglass: 'M12 12 7.727 8.44c-.635-.53-.952-.794-1.18-1.119a3 3 0 0 1-.444-.947C6 5.991 6 5.578 6 4.752V2m6 10 4.273-3.56c.635-.53.952-.794 1.18-1.119a3 3 0 0 0 .444-.947C18 5.991 18 5.578 18 4.752V2m-6 10-4.273 3.56c-.635.53-.952.794-1.18 1.119a3 3 0 0 0-.444.947C6 18.009 6 18.422 6 19.248V22m6-10 4.273 3.56c.635.53.952.794 1.18 1.119a3 3 0 0 1 .444.947c.103.383.103.796.103 1.622V22M4 2h16M4 22h16',
    // criados em casa (o catálogo do Untitled UI não tem): vão para o Bessa na lista do documento
    shirt: 'M8.5 3 3 6l1.8 4.2L8 9v11.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V9l3.2 1.2L21 6l-5.5-3a3.5 3.5 0 0 1-7 0Z',
    cup: 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Zm12 1.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2m4-2v2',
    cap: 'M4 15a8 8 0 0 1 16 0M3 15h18v3H3zM12 5V3',
    x: 'M18 6 6 18M6 6l12 12'
  };
  function ico(n, cls, tam) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (tam ? ' width="' + tam + '" height="' + tam + '"' : '') + '><path d="' + IC[n] + '"/></svg>';
  }
  // ícones do selo de situação (os mesmos de previa.js §3)
  var ICONES_SIT = {
    venda: '<path d="M3 9a2 2 0 0 0 0 4v3h18v-3a2 2 0 0 1 0-4V6H3v3Z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    pre: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    'nao-aberto': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    esgotado: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    cancelado: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    encerrado: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    adiado: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  /* ------------------------------------------------------------------ textos (docs/conteudo/INGRESSE-SPORTS-VOZ-E-MICROCOPY.md) */
  var T = {
    grupoRotulo: 'Solicitar compra em grupo',            // DE-36 (Wander, 27/10): vale no lugar de ES-EV-27 / ES-GR-01
    grupoApoio: 'Para grupos, clubes e assessorias.',     // ES-GR-02 (a Luíza ajusta ao rótulo novo: pendência)
    grupoNome: function (prova) { return 'Solicitar compra em grupo para ' + prova; }, // provisório: ES-GR-04 ajustado ao rótulo
    inscrever: 'Inscrever-me',                            // ES-EV-08
    escolher: 'Escolher minha prova',                     // ES-EV-07
    avisarVaga: 'Me avisar se abrir vaga',                // ES-EV-37
    avisarProxima: 'Me avisar da próxima edição',         // ES-EV-38
    parecidas: 'Ver provas parecidas',                    // ES-EV-37/38
    outras: 'Ver outras provas',                          // Helena 3.3, estado 10
    comoReembolso: 'Como funciona o reembolso',           // Helena 3.3, estado 10
    minhasOpcoes: 'Ver minhas opções',                    // ES-RE-08
    verResultados: 'Ver resultados', verFotos: 'Ver fotos', // ES-EV-39
    regulamento: 'Ler o regulamento (PDF)',               // ES-EV-28
    toastVaga: 'Pronto. Avisamos você se abrir vaga.',    // provisório: segue o tom de ES-TO-xx
    toastProxima: 'Pronto. Avisamos você quando as inscrições da próxima edição abrirem.', // provisório
    toastPdf: 'O regulamento é o PDF do organizador.',    // provisório (o protótipo não tem o arquivo)
    toastGrupo: 'O botão leva ao fluxo de compra em grupo que já existe.', // provisório (a URL de grupo do protótipo é de simulação)
    toastLink: 'Esta página ainda não está disponível.'   // padrão do site (ux.js)
  };

  /* ------------------------------------------------------------------ tabelas */
  var ROTULO_MOD = { corrida: 'Corrida', 'trail-run': 'Trail run', caminhada: 'Caminhada', 'corrida-de-aventura': 'Corrida de aventura', ciclismo: 'Ciclismo', 'mountain-bike': 'Mountain bike', triathlon: 'Triathlon', natacao: 'Natação', 'beach-tennis': 'Beach tennis', futevolei: 'Futevôlei', 'canoagem-va-a': "Canoagem Va'a", outras: 'Esportes' };
  // estilo de cymatics por modalidade (TOKENS-INGRESSE-SPORTS.md §2.5): um matiz só, muda a frequência e a simetria
  var ESTILO_MOD = { corrida: 'faixas', 'trail-run': 'trilha', caminhada: 'trilha', 'corrida-de-aventura': 'trilha', ciclismo: 'estrada', 'mountain-bike': 'estrada', triathlon: 'onda', natacao: 'onda', 'canoagem-va-a': 'onda', 'beach-tennis': 'quadra', futevolei: 'quadra' };
  var CYM = { faixas: [[11, 13], [2, 3], -0.8], trilha: [[9, 10], [3, 4], 0.45], estrada: [[7, 8], [1, 2], -0.6], onda: [[2, 3], [1, 2], 0.4], quadra: [[6, 7], [2, 3], 0.35], circuito: [[4, 5], [4, 5], 1.0] };
  var TERRENO = { 'terreno-rua': 'rua', 'terreno-trilha': 'trilha', 'terreno-montanha-e-subida': 'montanha e subida', 'terreno-praia': 'praia', 'terreno-agua-aberta': 'água aberta', 'terreno-piscina': 'piscina', 'terreno-misto': 'misto' };
  var TIPO = { geral: 'Geral', meia: 'Meia', estreante: 'Estreante', filiado: 'Filiado', kids: 'Kids', acompanhante: 'Acompanhante', beneficente: 'Beneficente', pcd: 'Pessoa com deficiência' };
  var TRI = { 'super-sprint': 'Super sprint', sprint: 'Sprint', olimpico: 'Olímpico', meio: 'Meio Ironman', longa: 'Longa distância' };
  // item do kit: [texto (ES-EV-19), ícone]
  var KIT = {
    bib: ['Número de peito', 'hash'], chip: ['Chip de cronometragem, que registra seu tempo', 'chip'], shirt: ['Camiseta', 'shirt'],
    medal: ['Medalha para quem completa a prova', 'award'], bag: ['Sacochila', 'backpack'], snack: ['Kit lanche', 'cup'], cap: ['Touca', 'cap'],
    plate: ['Plaqueta da bike', 'tag'], buff: ['Buff', 'tag'], gift: ['Brinde', 'gift'], material: ['Material de apoio', 'file']
  };
  var EXIGE = { 'documento-com-foto': 'documento com foto', 'comprovante-de-inscricao': 'comprovante de inscrição', autorizacao: 'autorização do titular' };
  // altitude aproximada da cidade (m): só para o "ponto mais alto" da altimetria de simulação
  var ALTITUDE = { 'São Paulo': 760, 'Belo Horizonte': 850, Curitiba: 934, 'Brasília': 1172, 'Rio de Janeiro': 5, Salvador: 8, Fortaleza: 21, Recife: 4, 'Porto Alegre': 10, 'Florianópolis': 3, 'Maceió': 5, 'Vitória': 3, 'Balneário Camboriú': 5, 'Goiânia': 749, Paraty: 5, 'Campos do Jordão': 1628, Gramado: 825, Campinas: 680, Bonito: 300, 'João Pessoa': 47, Natal: 30, Ubatuba: 5, Ilhabela: 5 };

  // estados da engrenagem: [chave, rótulo]; o rótulo é o texto do botão (tools/previa/telas.mjs usa os mesmos)
  var ESTADOS = [
    ['abertas', 'Inscrições abertas'], ['lote-esgotado', 'Lote esgotado'], ['lote-esgotado-intervalo', 'Lote esgotado, próximo fechado'],
    ['ultimas', 'Últimas vagas'], ['prova-esgotada', 'Prova esgotada'], ['evento-esgotado', 'Evento esgotado'], ['encerradas', 'Inscrições encerradas'],
    ['nao-abertas', 'Inscrições não abertas'], ['pre-venda', 'Pré-venda'], ['adiada', 'Adiada'], ['adiada-sem-data', 'Adiada sem data'],
    ['cancelada', 'Cancelada'], ['realizada', 'Prova realizada']
  ];
  var CHAVES = {}; ESTADOS.forEach(function (e) { CHAVES[e[0]] = 1; });

  /* ------------------------------------------------------------------ utilidades */
  var TZ0 = 'America/Sao_Paulo';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hashStr(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function sem(seed) { var a = seed >>> 0; return function () { a += 0x6D2B79F5; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function reduzido() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.getAttribute('data-motion') === 'reduce'; }
  function agora() { var L = window.IngresseLembretes; return L && L.relogio ? L.relogio.agora() : Date.now(); }
  var DIA = 864e5;

  var NF = new Intl.NumberFormat('pt-BR');
  function brl(c) { return 'R$ ' + NF.format(Math.ceil(c / 100)); } // sem centavos; arredonda para cima, como a Home
  function partes(iso, tz, o) { if (!iso || isNaN(Date.parse(iso))) return []; return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: tz || TZ0 }, o)).formatToParts(new Date(iso)); }
  function pt(ps, t) { var p = ps.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; }
  function semana3(iso, tz) { return cap(pt(partes(iso, tz, { weekday: 'short' }), 'weekday').replace('.', '')); }
  function diaMes(iso, tz) { var p = partes(iso, tz, { day: 'numeric', month: 'short' }); return pt(p, 'day') + ' ' + pt(p, 'month').replace('.', ''); } // 14 mar
  function diaMesExt(iso, tz) { var p = partes(iso, tz, { day: 'numeric', month: 'long' }); return pt(p, 'day') + ' de ' + pt(p, 'month'); } // 21 de março
  function diaSemExt(iso, tz) { var p = partes(iso, tz, { weekday: 'long', day: 'numeric', month: 'long' }); return cap(pt(p, 'weekday')) + ', ' + pt(p, 'day') + ' de ' + pt(p, 'month'); } // Domingo, 21 de março
  function hora(iso, tz) { var p = partes(iso, tz, { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }); var m = pt(p, 'minute'); return String(Number(pt(p, 'hour'))) + 'h' + (m === '00' ? '' : m); }
  function ano(iso, tz) { return pt(partes(iso, tz, { year: 'numeric' }), 'year'); }
  function hhmm(s) { var a = s.split(':'); return Number(a[0]) + 'h' + (a[1] === '00' ? '' : a[1]); }
  function diaUtc(ds, o) { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: 'UTC' }, o)).formatToParts(new Date(ds + 'T12:00:00Z')); }
  function lista(arr, e) { e = e || 'e'; return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' ' + e + ' ' + arr[arr.length - 1]; }
  function km(m) { var n = m / 1000; return Number.isInteger(n) ? String(n) : String(+n.toFixed(1)).replace('.', ','); }
  function minutos(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + 'h' + (m ? String(m).padStart(2, '0') : '') : m + ' min'; }
  function semOrg(n) { return String(n || '').replace(/\s*\(simulação\)\s*/i, '').trim(); }
  function localCurto(ev) { return String(ev.venue || '').split(' · ')[0]; }
  function agregadora(ev) {
    var m = ev.sport.modalities[0];
    return 'Esportes.dc.html?modalidade=' + encodeURIComponent(m); // a agregadora da modalidade, dentro do Ingresse Sports
  }
  function href(ev, prova) { return 'Ingressos.dc.html?esporte=' + ev.id + (prova ? '&prova=' + encodeURIComponent(prova) : ''); }
  function hrefEvento(e) { return 'Evento.dc.html?esporte=' + e.id; }
  function tituloLimpo(ev) { return ev.title || ev.name; }

  /* ------------------------------------------------------------------ dados */
  var DADOS = null;
  var S = { ev0: null, modo: 'auto', grupo: 'auto', prova: qs.get('prova') || null, rota: null, acc: {}, jaAnimou: {} };

  function carregar() {
    if (DADOS) return Promise.resolve(DADOS);
    return fetch('./dados/esportes.json').then(function (r) { if (!r.ok) throw new Error('esportes.json ' + r.status); return r.json(); }).then(function (d) { DADOS = d; return d; });
  }
  function achar(d) {
    var l = d.events;
    if (QID) { for (var i = 0; i < l.length; i++) if (String(l[i].id) === QID || l[i].slug === QID) return l[i]; return null; }
    for (var j = 0; j < l.length; j++) if (l[j].slug === QSLUG) return l[j];
    return null;
  }

  /* ------------------------------------------------------------------ estados (docs/produto/INGRESSE-SPORTS-ESCOPO-E-IA.md §3.3) */
  function passou(ev) { return Date.parse(ev.iso) < agora() && ev.situacao !== 'adiado' && ev.situacao !== 'cancelado'; }
  function estadoDoDado(ev) {
    var s = ev.situacao, sel = ev.selo && ev.selo.codigo;
    if (ev._realizada || passou(ev)) return 'realizada';
    if (s === 'cancelado') return 'cancelada';
    if (s === 'adiado') return 'adiada';
    if (s === 'encerrado') return 'encerradas';
    if (s === 'esgotado') return 'evento-esgotado';
    if (s === 'nao-aberto') return 'nao-abertas';
    if (s === 'pre') return 'pre-venda';
    if (sel === 'ultima-chance') return 'ultimas';
    if (sel === 'lote-esgotado') return 'lote-esgotado';
    if (ev.sport.races.some(function (r) { return r.status === 'sold-out'; })) return 'prova-esgotada';
    return 'abertas';
  }
  function iso(ms) { return new Date(ms).toISOString(); }
  // datas coerentes com o relógio do protótipo (o dado tem âncora em 27/10): lote aberto nunca vence antes de hoje
  function normalizar(ev) {
    var t = agora();
    ev.sport.races.forEach(function (r, ri) {
      var prev = t + (14 + 7 * ri) * DIA;
      r.lots.forEach(function (l, i) {
        if (l.status === 'open' || l.status === 'upcoming') { if (Date.parse(l.until) < prev) l.until = iso(prev); prev = Date.parse(l.until) + 30 * DIA; }
      });
    });
    var reg = ev.sport.registration;
    if (Date.parse(reg.closesAt) < t + 14 * DIA && Date.parse(ev.iso) > t + 20 * DIA) reg.closesAt = iso(Math.min(Date.parse(ev.iso) - 3 * DIA, t + 45 * DIA));
  }
  function abrirLotes(r) {
    var i = r.lots.findIndex(function (l) { return l.status === 'open'; });
    if (i < 0) i = r.lots.findIndex(function (l) { return l.status === 'upcoming'; });
    if (i < 0) i = r.lots.length - 1;
    r.lots.forEach(function (l, k) { l.status = k < i ? 'closed' : k === i ? 'open' : 'upcoming'; delete l.soldOutAt; delete l.access; });
    r.status = 'open';
  }
  function todasAs(ev, fn) { ev.sport.races.forEach(fn); }
  function simular(ev, chave) {
    var t = agora(), reg = ev.sport.registration;
    if (!ev.iso && ev.sport.lifecycleNotice) ev.iso = ev.sport.lifecycleNotice.previousStartsAt; // adiada sem data no dado: as outras simulações voltam à data anterior
    delete ev.sport.lifecycleNotice;
    ev.selo = null; ev.lifecycle = 'scheduled';
    var ate = function (st) { todasAs(ev, function (r) { r.status = st; r.lots.forEach(function (l) { l.status = st === 'sold-out' ? 'sold-out' : st === 'upcoming' ? 'upcoming' : 'closed'; }); }); };
    switch (chave) {
      case 'abertas': ev.situacao = 'venda'; normalizar(ev); todasAs(ev, abrirLotes); break;
      case 'lote-esgotado':
        ev.situacao = 'venda'; normalizar(ev); todasAs(ev, abrirLotes);
        todasAs(ev, function (r) {
          var i = r.lots.findIndex(function (l) { return l.status === 'open'; });
          if (i < 1 && r.lots.length > 1) { r.lots[0].status = 'sold-out'; r.lots[0].soldOutAt = iso(t - 2 * DIA); r.lots[1].status = 'open'; r.lots.forEach(function (l, k) { if (k > 1) l.status = 'upcoming'; }); }
          else if (i >= 1) { r.lots[i - 1].status = 'sold-out'; r.lots[i - 1].soldOutAt = iso(t - 2 * DIA); }
        });
        ev.selo = { codigo: 'lote-esgotado', rotulo: 'Lote esgotado', detalhe: null }; break;
      case 'lote-esgotado-intervalo':
        ev.situacao = 'venda'; normalizar(ev); todasAs(ev, abrirLotes);
        todasAs(ev, function (r) {
          var i = r.lots.findIndex(function (l) { return l.status === 'open'; });
          if (i < 0 || i + 1 >= r.lots.length) { if (r.lots.length > 1) i = r.lots.length - 2; else return; }
          r.lots.forEach(function (l, k) { if (k < i) l.status = 'closed'; });
          r.lots[i].status = 'sold-out'; r.lots[i].soldOutAt = iso(t - 2 * DIA);
          r.lots[i + 1].status = 'upcoming'; r.lots[i + 1].opensAt = iso(t + 3 * DIA + 2 * 36e5);
        });
        ev.selo = { codigo: 'lote-esgotado', rotulo: 'Lote esgotado', detalhe: null }; break;
      case 'ultimas':
        ev.situacao = 'venda'; normalizar(ev); todasAs(ev, abrirLotes);
        var r0 = ev.sport.races[0]; if (r0.capacity) { r0.sold = r0.capacity - Math.max(3, Math.round(r0.capacity * 0.06)); }
        ev.selo = { codigo: 'ultima-chance', rotulo: 'Última chance', detalhe: 'Inscrições até ' + diaMes(reg.closesAt, ev.tz) }; break;
      case 'prova-esgotada':
        ev.situacao = 'venda'; normalizar(ev); todasAs(ev, abrirLotes);
        if (ev.sport.races.length > 1) { var u = ev.sport.races[ev.sport.races.length - 1]; u.status = 'sold-out'; u.sold = u.capacity; u.lots.forEach(function (l) { l.status = 'sold-out'; }); }
        else { ev.situacao = 'esgotado'; ate('sold-out'); }
        break;
      case 'evento-esgotado': ev.situacao = 'esgotado'; ate('sold-out'); reg.closesBy = 'capacity'; break;
      case 'encerradas': ev.situacao = 'encerrado'; ate('closed'); reg.closesAt = iso(t - 3 * DIA); break;
      case 'nao-abertas':
        ev.situacao = 'nao-aberto'; ate('upcoming');
        if (Date.parse(reg.opensAt) < t + DIA) reg.opensAt = iso(t + 3 * DIA + 2 * 36e5); // 12h de Brasília, três dias adiante
        break;
      case 'pre-venda':
        ev.situacao = 'pre'; normalizar(ev);
        todasAs(ev, function (r) { abrirLotes(r); r.status = 'presale'; r.lots[r.lots.findIndex(function (l) { return l.status === 'open'; })].access = { kind: 'presale', audience: 'assessoria' }; });
        break;
      case 'adiada': case 'adiada-sem-data':
        ev.situacao = 'adiado'; ev.lifecycle = 'postponed'; ate('closed'); todasAs(ev, function (r) { r.status = 'suspended'; });
        ev.sport.lifecycleNotice = { kind: 'postponed', previousStartsAt: ev.iso, newStartsAt: chave === 'adiada' ? iso(Date.parse(ev.iso) + 75 * DIA) : null };
        break;
      case 'cancelada': ev.situacao = 'cancelado'; ev.lifecycle = 'cancelled'; ate('closed'); todasAs(ev, function (r) { r.status = 'cancelled'; }); ev.sport.lifecycleNotice = { kind: 'cancelled', previousStartsAt: ev.iso, newStartsAt: null }; break;
      case 'realizada':
        ev.situacao = 'encerrado'; ate('closed'); ev._realizada = true;
        var delta = (t - 21 * DIA) - Date.parse(ev.iso);
        ev.iso = iso(Date.parse(ev.iso) + delta);
        todasAs(ev, function (r) { r.startsAt = iso(Date.parse(r.startsAt) + delta); (r.waves || []).forEach(function (w) { w.at = iso(Date.parse(w.at) + delta); }); });
        reg.closesAt = iso(t - 25 * DIA);
        ev.sport.history = { resultados: '#', fotos: '#' };
        break;
    }
  }

  /* ------------------------------------------------------------------ modelo da página */
  function distRotulo(ev) { // 5, 10 e 21 km  |  Sprint e olímpico  |  Virtual · de 20 jan a 18 fev
    var rs = ev.sport.races, nomes = [], i, r;
    var tri = rs.filter(function (x) { return x.triFormat; });
    if (tri.length) { var ts = rs.map(function (x) { return TRI[x.triFormat] || x.name; }); return { texto: cap(lista(ts.map(function (s, k) { return k ? s.toLowerCase() : s; }))), unidade: '', tipo: 'tri' }; }
    var ds = rs.map(function (x) { return x.distanceM; }).filter(function (x) { return x; }).sort(function (a, b) { return a - b; });
    if (!ds.length) {
      var hs = rs.map(function (x) { return x.durationH; }).filter(Boolean);
      if (hs.length) return { texto: lista(hs.map(String)), unidade: ' h', tipo: 'horas' };
      return { texto: '', unidade: '', tipo: 'sem' };
    }
    var un = ds.filter(function (x, k) { return ds.indexOf(x) === k; });
    if (un.length > 3) return { texto: km(un[0]) + ' a ' + km(un[un.length - 1]), unidade: ' km', tipo: 'faixa', n: rs.length };
    return { texto: lista(un.map(km)), unidade: ' km', tipo: 'lista' };
  }
  function cheiaDeLote(r) { // 10% ou menos das vagas
    if (!r.capacity) return false;
    var left = r.capacity - r.sold;
    return r.status === 'open' && left > 0 && left / r.capacity <= 0.10;
  }
  function linhaDaProva(ev, r, estado) {
    var lots = r.lots, iCur = -1, k;
    for (k = 0; k < lots.length; k++) if (lots[k].status === 'open') { iCur = k; break; }
    var cur = iCur >= 0 ? lots[iCur] : null;
    var depois = lots.slice(iCur >= 0 ? iCur + 1 : 0).filter(function (l) { return l.status === 'upcoming'; })[0] || null;
    var esg = lots.filter(function (l) { return l.status === 'sold-out'; });
    var st = r.status, kind = st;
    if (st === 'open' && !cur && depois) kind = 'gap';
    var o = { r: r, kind: kind, cur: cur, depois: depois, preco: null, l1: '', l2: '', tag: '', acao: null };
    var tz = ev.tz;
    if (kind === 'open' || kind === 'presale') {
      o.preco = brl(cur ? cur.totalCents : r.fromCents);
      var anterior = iCur > 0 ? lots[iCur - 1] : null;
      if (kind === 'presale') o.l1 = (cur && cur.access && cur.access.audience === 'assessoria' ? 'Pré-venda para assessorias' : 'Pré-venda') + (cur ? ' · ' + cur.name + ' até ' + diaMes(cur.until, tz) : '');
      else if (anterior && anterior.status === 'sold-out') o.l1 = anterior.name + ' esgotado. Agora no ' + cur.name + ': ' + brl(cur.totalCents) + '.'; // ES-CA-12
      else if (cur) o.l1 = cur.name + ' até ' + diaMes(cur.until, tz); // ES-EV-12
      if (depois && kind !== 'presale') o.l2 = 'Sobe para ' + brl(depois.totalCents) + ' em ' + diaMes(iso(Date.parse(cur.until) + DIA), tz) + '.'; // ES-EV-13
      if (cheiaDeLote(r)) o.tag = 'Últimas vagas deste lote'; // ES-CA-10
      o.acao = 'inscrever';
    } else if (kind === 'gap') {
      var abre = depois.opensAt || (esg.length ? iso(Date.parse(esg[esg.length - 1].until) + DIA) : r.startsAt);
      o.tag = 'Lote esgotado'; o.l1 = 'O ' + depois.name + ' abre em ' + diaMes(abre, tz) + '.'; o.abreEm = abre; o.preco = brl(depois.totalCents); // o aviso é um só, no botão principal
    } else if (kind === 'upcoming') {
      o.preco = r.fromCents ? brl(r.fromCents) : null; o.l1 = ''; // o aviso é um só, no botão principal
    } else if (kind === 'sold-out') {
      o.tag = 'Esgotada'; o.acao = 'avisar-vaga';
      var livres = ev.sport.races.filter(function (x) { return x.status === 'open' || x.status === 'presale'; }).map(function (x) { return x.name; });
      if (livres.length) o.l1 = 'Há vagas em ' + lista(livres) + '.'; // "sugere outra distância" (Helena 3.3, estado 4)
    } else if (kind === 'closed') { o.tag = 'Inscrições fechadas'; }
    else if (kind === 'suspended') { o.tag = 'Inscrições suspensas'; }
    else if (kind === 'cancelled') { o.tag = 'Cancelada'; }
    return o;
  }
  function selecionavel(l) { return l.acao === 'inscrever'; }

  function modelo(ev, estado) {
    var vm = { ev: ev, estado: estado, tz: ev.tz, sp: ev.sport };
    vm.rows = ev.sport.races.map(function (r) { return linhaDaProva(ev, r, estado); });
    vm.dist = distRotulo(ev);
    vm.titulo = tituloLimpo(ev);
    vm.mod = ev.sport.modalities[0];
    vm.virtual = !!ev.sport.virtual;
    vm.venda = { abertas: 1, 'lote-esgotado': 1, 'lote-esgotado-intervalo': 1, ultimas: 1, 'prova-esgotada': 1, 'pre-venda': 1 }[estado] === 1;
    vm.temPreco = !!ev.fromCents && vm.venda && estado !== 'lote-esgotado-intervalo';
    var abertas = vm.rows.filter(selecionavel);
    vm.precoMin = abertas.length ? Math.min.apply(null, abertas.map(function (l) { return l.cur ? l.cur.totalCents : l.r.fromCents; })) : (ev.fromCents || null);
    // prova escolhida (a URL ou o clique): só vale se ainda dá para se inscrever nela
    var sel = S.prova && vm.rows.filter(function (l) { return l.r.id === S.prova && selecionavel(l); })[0];
    vm.sel = sel || null;
    var grupoDado = !!(ev.sport.grupo && ev.sport.grupo.ativo);
    var gLigado = S.grupo === 'auto' ? grupoDado : S.grupo === '1';
    vm.grupoAtivo = gLigado && vm.venda; // estados 1 a 3 (Helena 3.3; ES-GR-03); sem grupo habilitado o botão não existe, nem desativado
    vm.grupoUrl = ev.sport.grupo && ev.sport.grupo.url ? ev.sport.grupo.url : 'https://grupos.exemplo.test/pedido?evento=' + encodeURIComponent(ev.slug);
    return vm;
  }

  /* chip de situação, CTA, banner e linha do hero por estado */
  function chipDe(vm) {
    var ev = vm.ev, reg = ev.sport.registration, tz = ev.tz;
    switch (vm.estado) {
      case 'abertas': case 'lote-esgotado': case 'prova-esgotada': return { sit: 'venda', rotulo: 'Inscrições abertas' };
      case 'ultimas': return { sit: 'venda', rotulo: 'Últimas vagas' };
      case 'lote-esgotado-intervalo': return { sit: 'pre', rotulo: 'Lote esgotado' };
      case 'evento-esgotado': return { sit: 'esgotado', rotulo: 'Esgotada' };
      case 'encerradas': return { sit: 'encerrado', rotulo: 'Inscrições fechadas' };
      case 'nao-abertas': return { sit: 'nao-aberto', rotulo: reg.opensAt && Date.parse(reg.opensAt) > agora() ? 'Abre em ' + diaMes(reg.opensAt, TZ0) : 'Ainda não abriu' };
      case 'pre-venda': return { sit: 'pre', rotulo: 'Pré-venda' };
      case 'adiada': return { sit: 'adiado', rotulo: 'Adiada' };
      case 'cancelada': return { sit: 'cancelado', rotulo: 'Cancelada' };
      case 'realizada': return { sit: 'encerrado', rotulo: 'Prova realizada' };
    }
    return { sit: 'venda', rotulo: ev.situacaoRotulo };
  }
  function ctaDe(vm, paraBarra) {
    var ev = vm.ev, e = vm.estado, abertas = vm.rows.filter(selecionavel);
    var unica = vm.rows.length === 1 && abertas.length === 1;
    var sel = vm.sel;
    if (vm.venda && e !== 'lote-esgotado-intervalo') {
      if (sel) return { tipo: 'link', rotulo: T.inscrever, href: href(ev, sel.r.id), nome: 'Inscrever-me na prova de ' + sel.r.name };
      if (unica) return { tipo: 'link', rotulo: T.inscrever, href: href(ev, abertas[0].r.id), nome: 'Inscrever-me' };
      return { tipo: 'scroll', rotulo: T.escolher, alvo: 'ee-provas' };
    }
    var reg = ev.sport.registration;
    switch (e) {
      case 'lote-esgotado-intervalo': var g = vm.rows.filter(function (l) { return l.kind === 'gap'; })[0]; return { tipo: 'lembrete', id: 'esporte:' + ev.id + ':' + (g ? g.r.id : 'lote'), abreEm: g && g.abreEm, ev: ev, off: false };
      case 'nao-abertas': return { tipo: 'lembrete', id: 'esporte:' + ev.id, abreEm: reg.opensAt, ev: ev };
      case 'evento-esgotado': return { tipo: 'toast', rotulo: T.avisarVaga, toast: T.toastVaga, icone: 'bell' };
      case 'encerradas': case 'realizada': return { tipo: 'toast', rotulo: T.avisarProxima, toast: T.toastProxima, icone: 'bell' };
      case 'adiada': return { tipo: 'link', rotulo: T.parecidas, href: '#ee-parecidas', alvo: 'ee-parecidas' };
      case 'cancelada': return { tipo: 'link', rotulo: T.outras, href: '#ee-parecidas', alvo: 'ee-parecidas' };
    }
    return { tipo: 'scroll', rotulo: T.escolher, alvo: 'ee-provas' };
  }
  function ctaSecundaria(vm) {
    var e = vm.estado;
    if (e === 'evento-esgotado' || e === 'encerradas' || e === 'realizada') return { tipo: 'link', rotulo: T.parecidas, alvo: 'ee-parecidas' };
    if (e === 'adiada') return { tipo: 'link', rotulo: T.minhasOpcoes, href: 'Carteira.dc.html' };
    if (e === 'cancelada') return { tipo: 'link', rotulo: T.comoReembolso, alvo: 'ee-faq', abre: 'cancel' };
    return null;
  }

  function lembrete(c) { // c: { id, abreEm, ev }
    var L = window.IngresseLembretes;
    if (!L || !c.abreEm) return null;
    return L.abertura({ id: c.id, evento: c.ev.title || c.ev.name, praca: c.ev.city || '', abreEm: c.abreEm, href: hrefEvento(c.ev) });
  }

  /* ------------------------------------------------------------------ HTML dos botões */
  function btnHtml(c, cls, extra) {
    extra = extra || '';
    if (c.tipo === 'link' && c.alvo && (!c.href || c.href.charAt(0) === '#')) c = { tipo: 'scroll', rotulo: c.rotulo, alvo: c.alvo, abre: c.abre };
    if (c.tipo === 'link') return '<a class="' + cls + '" href="' + esc(c.href) + '"' + (c.nome ? ' aria-label="' + esc(c.nome) + '"' : '') + extra + '>' + esc(c.rotulo) + '</a>';
    if (c.tipo === 'scroll') return '<a class="' + cls + '" href="#' + c.alvo + '" data-ee-scroll="' + c.alvo + '"' + (c.abre ? ' data-ee-abre="' + c.abre + '"' : '') + extra + '>' + esc(c.rotulo) + '</a>';
    if (c.tipo === 'toast') return '<a class="' + cls + '" href="#" role="button" data-toast="' + esc(c.toast) + '" data-toast-kind="ok"' + extra + '><span class="ee-ic">' + ico(c.icone || 'bell') + '</span>' + esc(c.rotulo) + '</a>';
    if (c.tipo === 'lembrete') {
      var lb = lembrete(c);
      var on = lb && lb.avisarAtivo;
      return '<a class="' + cls + '" href="#" role="button" data-lembrete-id="' + esc(c.id) + '" data-track-lembrete="alternar" data-ee-lb aria-pressed="' + (on ? 'true' : 'false') + '"' + extra + '><span class="ee-ic">' + ico('bell') + '</span><span data-ee-lb-rotulo>' + esc(lb ? lb.avisarRotulo : 'Me avisar quando abrir') + '</span></a>';
    }
    return '';
  }
  function grupoBtn(vm, origem, cls) {
    return '<a class="' + (cls || 'bs') + ' ee-grupo-btn" href="' + esc(vm.grupoUrl) + '" target="_blank" rel="noopener" data-ee-grupo data-ee-origem="' + origem + '" data-track-grupo="clique" aria-label="' + esc(T.grupoNome(vm.titulo)) + '">' + esc(T.grupoRotulo) + ico('ext', 'ico-16') + '</a>';
  }

  /* ------------------------------------------------------------------ blocos */
  function secao(id, titulo, corpo, extra) {
    return '<section class="ee-sec" id="' + id + '" aria-labelledby="' + id + '-h"' + (extra || '') + '><h2 class="ee-h" id="' + id + '-h">' + esc(titulo) + '</h2>' + corpo + '</section>';
  }

  /* capa do hero (imagem QUADRADA da TicketSports, a mesma dos cartões; só no protótipo interno; pedido do Wander, 29/10/2026: «não disse para trocarmos tudo para imagens
     quadradas?»): quadrada em todo lugar, sem recorte; a distância vai na faixa preta de largura total sob a imagem (o mesmo dado do cartão). Sem capa, segue o pôster por código. */
  function capaHtml(ev, d, num) {
    var base = './assets/ticketsports/' + ev.capaCard.replace(/\.webp$/, '');
    var dist = d.tipo === 'tri' || d.tipo === 'sem' ? esc(d.tipo === 'tri' ? d.texto : (ROTULO_MOD[ev.sport.modalities[0]] || '')) : esc(d.texto) + '<span class="ee-capa-un">' + esc(d.unidade.trim()) + (d.tipo === 'faixa' ? ' · ' + d.n + ' provas' : '') + '</span>';
    return '<div class="ee-stage ee-stage--capa"><div class="ee-capa-box">' +
      '<img class="esp-capa ee-capa" src="' + base + '.webp" sizes="(max-width: 760px) 100vw, 480px" alt="" width="480" height="480" decoding="async">' +
      '<div class="ee-capa-km ilha"><span class="ee-capa-t">' + dist + '</span>' + (ev.sport.virtual ? '<span class="ee-capa-un">Virtual</span>' : '') + '</div></div></div>';
  }

  // 1. hero
  function htmlHero(vm) {
    var ev = vm.ev, sp = ev.sport, tz = ev.tz, chip = chipDe(vm), cta = ctaDe(vm), sec = ctaSecundaria(vm);
    var heroCls = vm.venda && vm.estado !== 'lote-esgotado-intervalo' ? 'bp bp-lg' : 'bp bp-lg bp-ghost';
    var d = vm.dist, num;
    if (d.tipo === 'tri') num = '<b class="ee-nome">' + esc(d.texto) + '</b>';
    else if (d.tipo === 'sem') num = '<b class="ee-nome">' + esc(ROTULO_MOD[vm.mod] || '') + '</b>';
    else num = '<b>' + esc(d.texto) + '</b><span>' + esc(d.unidade.trim()) + (d.tipo === 'faixa' ? ' · ' + d.n + ' provas' : '') + '</span>';
    if (vm.virtual) num += '<span class="ee-virtual">Virtual</span>';
    var circ = sp.circuit ? '<span class="tag tag-lg tag-outline ee-circ">Etapa ' + sp.circuit.etapa + ' de ' + sp.circuit.etapas + ' do ' + esc(sp.circuit.nome) + '</span>' : ''; // ES-EV-06
    var quando, onde, org = semOrg(sp.organizer.name);
    if (vm.virtual && sp.window) quando = 'De ' + diaMes(sp.window.from, tz) + ' a ' + diaMes(sp.window.until, tz);
    else if (vm.estado === 'adiada' && sp.lifecycleNotice && !sp.lifecycleNotice.newStartsAt) quando = 'Data a confirmar';
    else if (vm.estado === 'adiada' && sp.lifecycleNotice) quando = semana3(sp.lifecycleNotice.newStartsAt, tz) + ' ' + diaMes(sp.lifecycleNotice.newStartsAt, tz) + ' · ' + hora(sp.lifecycleNotice.newStartsAt, tz);
    else quando = semana3(ev.iso, tz) + ' ' + diaMes(ev.iso, tz) + ' · ' + hora(ev.iso, tz);
    var antes = vm.estado === 'adiada' && sp.lifecycleNotice ? ' <span class="ee-antes">· antes, ' + semana3(sp.lifecycleNotice.previousStartsAt, tz) + ' ' + diaMes(sp.lifecycleNotice.previousStartsAt, tz) + '</span>' : '';
    var linha = vm.virtual ? (sp.window ? 'Desafio virtual · em qualquer lugar' : '') : [diaSemExt(ev.iso, tz), ev.venue].join(' · '); // ES-EV-04
    if (vm.estado === 'adiada' && sp.lifecycleNotice) linha = (sp.lifecycleNotice.newStartsAt ? diaSemExt(sp.lifecycleNotice.newStartsAt, tz) : 'Data a confirmar') + ' · ' + ev.venue;
    onde = vm.virtual ? 'Em qualquer lugar' : '<a href="#ee-local">' + esc(ev.city) + (ev.state ? ', ' + esc(ev.state) : '') + '</a>';
    var preco = '';
    if (vm.temPreco) preco = '<span class="ev-price">a partir de <strong class="ee-num">' + brl(vm.precoMin) + '</strong></span>';
    else if (vm.estado === 'nao-abertas') {
      var lb = lembrete({ id: 'esporte:' + ev.id, abreEm: sp.registration.opensAt, ev: ev });
      preco = '<span class="ev-price" data-ee-abre-texto>' + (lb ? (lb.aberto ? 'As inscrições abriram' : 'As inscrições abrem ' + esc(lb.quando) + (lb.falta ? ' (' + esc(lb.falta) + ')' : '')) : '') + '</span>'; // ES-EV-36
    }
    var ate = ''; if (vm.estado === 'ultimas' && ev.selo && ev.selo.detalhe) ate = '<span class="ev-price">' + esc(ev.selo.detalhe) + '</span>'; // ES-EV-35
    var secBtn = sec ? btnHtml(sec, 'bp bp-lg bp-ghost') : '';
    return '<section class="ev-hero ee-hero ilha" data-ee-hero data-estado="' + vm.estado + '" aria-labelledby="ee-h1">' +
      '<canvas class="ev-hero-cym is-on" data-chave="' + esc(vm.titulo) + '" data-ee-cym aria-hidden="true"></canvas>' +
      '<div class="ee-hero-in">' +
        (ev.capaCard ? capaHtml(ev, d, num) : '') +
        (ev.capaCard ? '' : '<div class="ee-stage"><div class="ee-poster" role="img" aria-label="Pôster da prova: ' + esc((d.texto + d.unidade).trim() || vm.titulo) + '"><canvas data-ee-poster aria-hidden="true"></canvas><div class="ee-poster-num" aria-hidden="true">' + num + '</div></div></div>') +
        '<div class="ee-hero-info">' +
          '<nav class="ee-trilha" aria-label="Trilha da página">' + trilhaHtml(vm) + '</nav>' +
          '<div class="ee-tags"><span class="tag tag-lg ' + (chip.sit === 'venda' ? 'tag-brand' : 'on-dark') + '" data-sit="' + chip.sit + '"><svg class="ico sit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES_SIT[chip.sit] + '</svg>' + esc(chip.rotulo) + '</span><span class="tag tag-lg tag-outline">' + esc(ROTULO_MOD[vm.mod] || 'Esportes') + '</span>' + circ + '</div>' +
          '<h1 class="ev-title" id="ee-h1">' + esc(vm.titulo) + '</h1>' +
          (linha ? '<p class="ee-linha">' + esc(linha) + '</p>' : '') +
          '<div class="ev-facts">' +
            '<div><span class="ev-k">Quando</span><span class="ev-v">' + esc(quando) + antes + '</span></div>' +
            '<div><span class="ev-k">Onde</span><span class="ev-v">' + onde + '</span></div>' +
            '<div><span class="ev-k">Organização</span><span class="ev-v">' + esc(org) + ' · <a href="#ee-organizador">Ver mais provas</a></span></div>' + // ES-EV-05
          '</div>' +
          '<div class="ev-hero-cta">' + btnHtml(cta, heroCls) + secBtn + preco + ate + '</div>' +
        '</div>' +
      '</div></section>';
  }

  // banner de estado (uui-alert, anatomia do Untitled UI)
  function banner(tipo, titulo, texto, acoes) {
    var icone = tipo === 'warning' ? 'clock' : tipo === 'error' ? 'alert' : 'info';
    return '<div id="aviso-estado" class="uui-alert uui-alert--' + tipo + ' ee-aviso" role="status"><span class="uui-alert__icon">' + ico(icone, 'uui-ico') + '</span><div class="uui-alert__body">' + (titulo ? '<p class="uui-alert__title">' + esc(titulo) + '</p>' : '') + '<p class="uui-alert__text">' + texto + '</p>' + (acoes ? '<div class="uui-alert__actions">' + acoes + '</div>' : '') + '</div></div>';
  }
  function htmlBanner(vm) {
    var ev = vm.ev, tz = ev.tz, reg = ev.sport.registration, ln = ev.sport.lifecycleNotice, e = vm.estado;
    var t = esc(vm.titulo);
    if (e === 'cancelada') return banner('error', 'A ' + vm.titulo + ' foi cancelada.', 'Prova cancelada. Quem se inscreveu recebe o reembolso automático, em até <span data-exemplo="Prazo de exemplo">10 dias úteis</span>.', '<a href="#ee-faq" class="linkbtn" data-ee-scroll="ee-faq" data-ee-abre="cancel">' + esc(T.comoReembolso) + '</a>'); // ES-RE-01, ES-RE-02
    if (e === 'adiada') {
      var nova = ln && ln.newStartsAt ? 'Nova data: ' + diaMesExt(ln.newStartsAt, tz) + ', às ' + hora(ln.newStartsAt, tz) + '.' : 'A nova data ainda não foi definida.'; // provisório (sem data): ES-RE-07 só cobre o caso com data
      return banner('warning', null, 'Prova adiada. ' + nova + ' As inscrições estão suspensas. Quem já se inscreveu recebe um aviso com as opções.'); // ES-RE-07
    }
    if (e === 'encerradas') return banner('neutral', null, 'Inscrições encerradas em ' + diaMes(reg.closesAt, tz) + '. A prova acontece em ' + diaMes(ev.iso, tz) + '.'); // ES-EV-38
    if (e === 'realizada') return banner('neutral', null, 'Esta prova já aconteceu.'); // ES-EV-39
    if (e === 'evento-esgotado') return banner('neutral', null, 'Esta prova esgotou. Se abrir vaga, avisamos você.'); // ES-EV-37 (segunda frase: provisório)
    if (e === 'pre-venda') return banner('neutral', 'Inscrições em pré-venda', 'Exclusiva para quem tem código de acesso. Você informa o código ao escolher a prova.'); // ES-EV-40
    return '';
  }

  // 2. resumo em chips
  function chip(rot, val, cls) { return '<li class="ee-chip' + (cls ? ' ' + cls : '') + '"><span class="over">' + esc(rot) + '</span><span class="ee-chip__v">' + val + '</span></li>'; }
  function htmlResumo(vm) {
    var ev = vm.ev, sp = ev.sport, tz = ev.tz, reg = sp.registration, d = vm.dist, e = vm.estado, c = [];
    if (e === 'cancelada') return '';
    if (d.texto) c.push(chip('Distâncias', '<span class="ee-stat">' + esc(d.texto) + '</span>' + (d.unidade ? '<span class="ee-unit">' + esc(d.unidade.trim()) + '</span>' : ''), 'ee-chip--dist'));
    var terr = sp.terrain.map(function (t) { return TERRENO[t]; }).filter(Boolean);
    if (terr.length) c.push(chip('Terreno', esc(cap(lista(terr)))));
    if (!vm.virtual) {
      var hs = vm.sp.races.map(function (r) { return r.startsAt; }).sort();
      if (hs.length && e !== 'adiada') { var a = hora(hs[0], tz), b = hora(hs[hs.length - 1], tz); c.push(chip('Largada', '<span class="ee-stat">' + esc(a === b ? a : a + ' a ' + b) + '</span>')); }
    } else if (sp.window) c.push(chip('Período', esc('De ' + diaMes(sp.window.from, tz) + ' a ' + diaMes(sp.window.until, tz))));
    var gains = sp.races.map(function (r) { return r.elevationGainM; }).filter(Boolean).sort(function (x, y) { return x - y; });
    if (gains.length && !vm.virtual) c.push(chip('Altimetria', '<span class="ee-stat">D+ ' + (gains[0] === gains[gains.length - 1] ? gains[0] : gains[0] + ' a ' + gains[gains.length - 1]) + '</span><span class="ee-unit">m</span>'));
    if (vm.venda || e === 'nao-abertas') c.push(chip('Inscrições até', '<span class="ee-stat">' + esc(diaMes(reg.closesAt, tz)) + '</span>'));
    if (vm.temPreco) c.push(chip('A partir de', '<span class="ee-stat">' + esc(brl(vm.precoMin)) + '</span>'));
    if (vm.venda && reg.capacity && reg.left > 0) c.push(chip('Vagas', '<span class="ee-stat">' + esc(NF.format(Math.max(0, (e === 'ultimas' ? (reg.capacity - sp.races.reduce(function (s, r) { return s + (r.sold || 0); }, 0)) : reg.left)))) + '</span><span class="ee-unit">restantes</span>')); // só se o produtor informou limite (capacity)
    return '<ul class="ee-chips" aria-label="Resumo da prova">' + c.join('') + '</ul>';
  }

  // 3. provas e preços
  function htmlProvas(vm) {
    var ev = vm.ev, e = vm.estado;
    if (e === 'realizada') return '';
    var rows = vm.rows.map(function (l) {
      var r = l.r, sel = vm.sel && vm.sel.r.id === r.id, pode = selecionavel(l), cinza = l.kind === 'sold-out' || l.kind === 'cancelled' || l.kind === 'closed' || l.kind === 'suspended';
      var dTxt = r.distanceM ? km(r.distanceM) : '', dUn = r.distanceM ? 'km' : r.durationH ? 'h' : '';
      if (!dTxt && r.durationH) dTxt = String(r.durationH);
      if (r.triFormat) { dTxt = ''; dUn = ''; } // triathlon: o nome do formato é o dado principal (a soma dos trechos não é uma distância)
      var tri = r.triFormat ? TRI[r.triFormat] : '';
      var nomeRepete = r.distanceM && new RegExp('^' + dTxt.replace(',', '[,.]') + '\\s*km$', 'i').test(r.name);
      var nome = tri ? tri : nomeRepete ? '' : r.name;
      var det = [];
      if (!vm.virtual) det.push('Largada às ' + hora(r.startsAt, ev.tz) + (r.waves && r.waves.length > 1 ? ', em ' + r.waves.length + ' ondas' : '')); // ES-EV-12
      var cl = r.classification || {};
      if (cl.kind === 'dupla') det.push('Em dupla'); else if (cl.kind === 'equipe') det.push('Em equipe' + (cl.teamSize ? ' de ' + cl.teamSize + ' pessoas' : ''));
      if (r.types && r.types.indexOf('kids') >= 0 && r.ageMin != null) det.push('Para crianças de ' + r.ageMin + (r.ageMax ? ' a ' + r.ageMax : ' anos ou mais') + ' anos' + (r.requiresGuardian ? ', com responsável' : '')); // ES-EV-15
      if (r.legs) det.push((r.legs.swimM >= 1000 ? km(r.legs.swimM) + ' km' : r.legs.swimM + ' m') + ' de natação, ' + km(r.legs.bikeM) + ' km de bike e ' + km(r.legs.runM) + ' km de corrida');
      var tipos = (r.types || []).filter(function (t) { return TIPO[t]; });
      var tiposH = tipos.length > 1 || (tipos.length === 1 && tipos[0] !== 'geral') ? '<ul class="ee-tipos" aria-label="Tipos de inscrição">' + tipos.map(function (t) { return '<li class="tag tag-outline">' + esc(TIPO[t]) + '</li>'; }).join('') + '</ul>' : ''; // ES-EV-14
      var acao = '';
      if (l.acao === 'inscrever') acao = '<a class="bs ee-row__btn" href="' + esc(href(ev, r.id)) + '" aria-label="Inscrever-me na prova de ' + esc(r.name) + '">' + T.inscrever + '</a>';
      else if (l.acao === 'avisar-abrir') {
        var itemId = 'esporte:' + ev.id + ':' + r.id; var lb = lembrete({ id: itemId, abreEm: l.abreEm, ev: ev });
        acao = '<a class="bs ee-row__btn" href="#" role="button" data-lembrete-id="' + itemId + '" data-track-lembrete="alternar" data-ee-lb aria-pressed="' + (lb && lb.avisarAtivo ? 'true' : 'false') + '" aria-label="' + esc((lb ? lb.avisarRotulo : 'Me avisar quando abrir') + ': ' + r.name) + '"><span data-ee-lb-rotulo>' + esc(lb ? lb.avisarRotulo : 'Me avisar quando abrir') + '</span></a>';
      }
      else if (l.acao === 'avisar-vaga') acao = '<a class="bs ee-row__btn" href="#" role="button" data-toast="' + esc(T.toastVaga) + '" data-toast-kind="ok" aria-label="' + esc(T.avisarVaga + ': ' + r.name) + '">' + esc(T.avisarVaga) + '</a>';
      var radio = pode ? '<button type="button" class="ee-radio" role="radio" aria-checked="' + (sel ? 'true' : 'false') + '" data-ee-sel="' + r.id + '" aria-label="Escolher a prova de ' + esc(r.name) + '">' + ico('check', 'ee-radio__ic') + '</button>' : '<span class="ee-radio ee-radio--off" aria-hidden="true"></span>';
      var preco = l.preco && !cinza ? '<span class="ee-preco">' + esc(l.preco) + '</span>' : '';
      var tag = l.tag ? '<span class="tag tag-lg ' + (l.kind === 'sold-out' ? 'ee-esg' : 'tag-hot') + '"' + (l.kind === 'sold-out' ? ' data-sit="esgotado"' : l.kind === 'cancelled' ? ' data-sit="cancelado"' : l.kind === 'closed' || l.kind === 'suspended' ? ' data-sit="encerrado"' : '') + '>' + esc(l.tag) + '</span>' : '';
      return '<li class="ee-row" data-sel="' + (sel ? 'true' : 'false') + '" data-kind="' + l.kind + '" data-prova="' + r.id + '">' +
        radio +
        (dTxt ? '<div class="ee-km"><span class="ee-km__n">' + esc(dTxt) + '</span><span class="ee-km__u">' + dUn + '</span></div>' : '') +
        '<div class="ee-row__id">' + (nome ? '<span class="ee-row__nome' + (tri ? ' ee-row__nome--xl' : '') + (l.kind === 'cancelled' ? ' is-cancel' : '') + '">' + esc(nome) + '</span>' : '') + (det.length ? '<span class="ee-row__det">' + det.join(' · ') + '</span>' : '') + tiposH + '</div>' +
        '<div class="ee-row__lot">' + preco + tag + (l.l1 ? '<span class="ee-row__l1">' + esc(l.l1) + '</span>' : '') + (l.l2 ? '<span class="ee-row__l2">' + esc(l.l2) + '</span>' : '') + '</div>' +
        '<div class="ee-row__act">' + acao + '</div></li>';
    }).join('');
    var nota = '';
    if (vm.venda) nota = '<p class="ee-nota">Preço final, já com taxa. O total aparece antes do pagamento.</p>'; // texto padrão do site, ajustado: provisório
    return secao('ee-provas', 'Provas e preços', '<ul class="ee-rows" role="radiogroup" aria-label="Escolha a prova">' + rows + '</ul>' + nota); // ES-EV-11
  }

  // 4. data e largada (com o mapa)
  function mapa(ev) {
    var g = ev.geo; if (!g) return '';
    var q = encodeURIComponent((localCurto(ev) + ' ' + ev.city).trim());
    var src = 'https://maps.google.com/maps?ll=' + g.lat + ',' + g.lon + '&z=14&hl=pt-BR&output=embed';
    return '<div class="ee-mapa mapa-cinza"><iframe class="ee-mapa__frame" src="' + src + '" title="Mapa: ' + esc(localCurto(ev)) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' +
      '<svg class="ee-mapa__pin" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-5.6 7-12a7 7 0 1 0-14 0c0 6.4 7 12 7 12Z" fill="currentColor"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>' +
      '<a class="bs ee-mapa__abrir" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener" aria-label="Abrir ' + esc(localCurto(ev)) + ' no mapa">Abrir no mapa ' + ico('ext', 'ico-14') + '</a></div>';
  }
  function fato(k, v) { return '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>'; }
  function htmlLargada(vm) {
    var ev = vm.ev, sp = ev.sport, tz = ev.tz, f = [];
    if (vm.estado === 'realizada' || vm.estado === 'cancelada') { if (vm.virtual) return ''; }
    if (vm.virtual) {
      if (sp.window) f.push(fato('Período', esc('De ' + diaMesExt(sp.window.from, tz) + ' a ' + diaMesExt(sp.window.until, tz))));
      f.push(fato('Como participar', 'Faça a prova onde e quando quiser, dentro do período.')); // provisório: Helena 3.6 pede "como participar" no lugar da largada; o microcopy não escreveu
      return secao('ee-largada', 'Data e como participar', '<dl class="facts ee-facts">' + f.join('') + '</dl>');
    }
    var nova = vm.estado === 'adiada' && sp.lifecycleNotice ? sp.lifecycleNotice.newStartsAt : null;
    f.push(fato('Data', nova ? esc(diaSemExt(nova, tz)) + ' <span class="ee-antes">· antes, ' + esc(diaSemExt(sp.lifecycleNotice.previousStartsAt, tz)) + '</span>' : vm.estado === 'adiada' ? 'Data a confirmar' : esc(diaSemExt(ev.iso, tz))));
    var largs = sp.races.slice().sort(function (a, b) { return a.startsAt.localeCompare(b.startsAt); }).map(function (r) { return esc(r.name) + ' às ' + hora(r.startsAt, tz); });
    if (vm.estado !== 'adiada') f.push(fato('Largadas', largs.join(' · ')));
    var ondas = sp.races.filter(function (r) { return r.waves && r.waves.length > 1; })[0];
    if (ondas && vm.estado !== 'adiada') f.push(fato('Ondas de largada', ondas.waves.map(function (w) { return esc(w.label) + ' às ' + hora(w.at, tz) + (w.paceMaxSecPerKm ? ' (ritmo até ' + Math.floor(w.paceMaxSecPerKm / 60) + ':' + String(w.paceMaxSecPerKm % 60).padStart(2, '0') + ' min por km)' : ' (ritmo livre)'); }).join(' · ')));
    f.push(fato('Local', esc(ev.venue)));
    return secao('ee-local', 'Data e largada', '<dl class="facts ee-facts">' + f.join('') + '</dl>' + mapa(ev)); // bloco 4 (Helena 3.1); mapa em cinza (pedido de 27/10)
  }

  // 5. sobre a prova (modelo de abertura de ES-EV-16, preenchido pelo dado)
  function dias(ds) { // ["2027-06-03","2027-06-04"] -> "3 a 4 de junho"
    var a = ds[0], b = ds[ds.length - 1], pa = diaUtc(a, { day: 'numeric', month: 'long' }), pb = diaUtc(b, { day: 'numeric', month: 'long' });
    if (a === b) return pt(pa, 'day') + ' de ' + pt(pa, 'month');
    return pt(pa, 'month') === pt(pb, 'month') ? pt(pa, 'day') + ' a ' + pt(pb, 'day') + ' de ' + pt(pb, 'month') : pt(pa, 'day') + ' de ' + pt(pa, 'month') + ' a ' + pt(pb, 'day') + ' de ' + pt(pb, 'month');
  }
  function htmlSobre(vm) {
    var ev = vm.ev, sp = ev.sport, tz = ev.tz, d = vm.dist, aud = sp.audience, kp = sp.kitPickup, reg = sp.registration;
    if (vm.estado === 'cancelada') return '';
    var p = [];
    var perc = d.tipo === 'tri' ? 'percursos ' + d.texto.toLowerCase().replace(/^./, function (c) { return c; }) : d.tipo === 'sem' ? 'categorias para toda a família de ' + (ROTULO_MOD[vm.mod] || 'esporte').toLowerCase() : 'percursos de ' + d.texto + d.unidade;
    if (vm.virtual) p.push(esc(vm.titulo) + ' é uma prova virtual, com ' + esc(perc) + (sp.window ? ', de ' + esc(diaMesExt(sp.window.from, tz)) + ' a ' + esc(diaMesExt(sp.window.until, tz)) : '') + '.');
    else p.push(esc(vm.titulo) + ' tem ' + esc(perc) + '. ' + (ev.iso ? 'Acontece em ' + esc(diaMesExt(ev.iso, tz)) + ', com' : 'A data ainda será confirmada, com') + ' largada às ' + esc(hora(sp.races.map(function (r) { return r.startsAt; }).sort()[0], tz)) + ' em ' + esc(localCurto(ev)) + ', ' + esc(ev.city) + '.'); // ES-EV-16 (sem artigo: "no Orla" erra o gênero)
    if (aud.indexOf('estreantes') >= 0) p.push('É para quem está começando e para quem treina para melhorar o tempo.'); // ES-EV-16
    if (aud.indexOf('feminino') >= 0) p.push('É uma prova feminina.');
    if (aud.indexOf('kids') >= 0) { var rk = sp.races.filter(function (r) { return r.ageMin != null && r.types.indexOf('kids') >= 0; })[0]; if (rk) p.push('É para crianças de ' + rk.ageMin + (rk.ageMax ? ' a ' + rk.ageMax : '') + ' anos, com um responsável.'); }
    if (aud.indexOf('inclusivo') >= 0) p.push('Há inscrição para pessoas com deficiência.');
    if (vm.venda || vm.estado === 'nao-abertas') p.push('As inscrições vão até ' + esc(diaMesExt(reg.closesAt, tz)) + (kp && kp.days && kp.days.length ? ', e o kit é retirado de ' + esc(dias(kp.days.map(function (x) { return x.date; }))) : '') + '.');
    return secao('ee-sobre', 'Sobre a prova', '<p class="ee-texto">' + p.join(' ') + '</p>');
  }

  // 6. percurso e altimetria
  function perfil(ev, r) {
    if (!r.elevationGainM || !r.distanceM) return null;
    var rnd = sem(hashStr(ev.id + ':' + r.id)), N = 96, i;
    var fr = [1 + Math.floor(rnd() * 2), 2 + Math.floor(rnd() * 3), 5 + Math.floor(rnd() * 4)], am = [1, 0.45, 0.18], ph = [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283];
    var y = [];
    for (i = 0; i < N; i++) { var x = i / (N - 1); y.push(am[0] * Math.sin(6.283 * fr[0] * x + ph[0]) + am[1] * Math.sin(6.283 * fr[1] * x + ph[1]) + am[2] * Math.sin(6.283 * fr[2] * x + ph[2])); }
    var d0 = y[N - 1] - y[0]; for (i = 0; i < N; i++) y[i] -= d0 * (i / (N - 1)); // percurso de ida e volta ao mesmo ponto
    var asc = 0; for (i = 1; i < N; i++) asc += Math.max(0, y[i] - y[i - 1]);
    var s = r.elevationGainM / (asc || 1), mn = Math.min.apply(null, y), base = ALTITUDE[ev.city] != null ? ALTITUDE[ev.city] : 10;
    var el = y.map(function (v) { return Math.round(base + (v - mn) * s); });
    var hi = 0; for (i = 1; i < N; i++) if (el[i] > el[hi]) hi = i;
    var lo = Math.min.apply(null, el), mx = el[hi];
    var descida = 0; for (i = 1; i < N; i++) descida += Math.max(0, el[i - 1] - el[i]);
    var subida = 0; for (i = 1; i < N; i++) subida += Math.max(0, el[i] - el[i - 1]);
    var aid = (ev.sport.route && ev.sport.route.aidStations) || 0, marcos = [{ f: 0, t: 'Largada' }];
    if (r.distanceM >= 5000) for (i = 1; i <= aid; i++) marcos.push({ f: i / (aid + 1), t: 'Hidratação' });
    marcos.push({ f: 1, t: 'Chegada' });
    return { el: el, N: N, hi: hi, lo: lo, mx: mx, subida: Math.round(subida), descida: Math.round(descida), dist: r.distanceM, marcos: marcos, ganho: r.elevationGainM, base: base };
  }
  function grau(p, i) { var a = Math.max(0, i - 1), b = Math.min(p.N - 1, i + 1); var dm = (b - a) * (p.dist / (p.N - 1)); return dm ? (p.el[b] - p.el[a]) / dm * 100 : 0; }
  function textoCursor(p, i) {
    var g = grau(p, i), k = km(Math.round(i / (p.N - 1) * p.dist / 100) * 100);
    var r = Math.round(Math.abs(g));
    return 'km ' + k + ' · ' + p.el[i] + ' m · ' + (r < 1 ? 'plano' : (g > 0 ? 'subida de ' : 'descida de ') + r + '%');
  }
  function resumoAlt(p) {
    var a = p.el, t = Math.round(p.N / 3), q = [0, 1, 2].map(function (k) { return a[Math.min(p.N - 1, (k + 1) * t - 1)] - a[Math.min(p.N - 1, k * t)]; });
    return 'Perfil de altimetria: ' + p.ganho + ' m de subida e ' + p.descida + ' m de descida. O ponto mais alto fica no km ' + km(Math.round(p.hi / (p.N - 1) * p.dist / 100) * 100) + ', a ' + p.mx + ' m.'; // ES-EV-18, com o ponto mais alto como resumo
  }
  function svgAlt(p) {
    var N = p.N, lo = p.lo, hi = p.mx, span = Math.max(1, hi - lo), pad = span * 0.18, vmin = lo - pad * 0.4, vmax = hi + pad;
    var X = function (i) { return i / (N - 1) * 100; }, Y = function (v) { return 100 - (v - vmin) / (vmax - vmin) * 100; };
    var d = '', i; for (i = 0; i < N; i++) d += (i ? 'L' : 'M') + X(i).toFixed(2) + ' ' + Y(p.el[i]).toFixed(2);
    var area = d + 'L100 100L0 100Z';
    var grade = [0.25, 0.5, 0.75].map(function (f) { return '<line x1="0" x2="100" y1="' + (f * 100) + '" y2="' + (f * 100) + '" class="ee-alt__grade" vector-effect="non-scaling-stroke"/>'; }).join('');
    return { svg: '<svg class="ee-alt__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + grade + '<path d="' + area + '" class="ee-alt__area"/><path d="' + d + '" class="ee-alt__linha" vector-effect="non-scaling-stroke"/></svg>', X: X, Y: Y, vmin: vmin, vmax: vmax };
  }
  function rota(ev, r) { // arte do percurso: laço fechado, semente por prova
    var rnd = sem(hashStr('rota:' + ev.id + ':' + r.id)), n = 8, pts = [], i, cx = 260, cy = 100, a0 = rnd() * 6.283;
    var rx = 200, ry = 74;
    for (i = 0; i < n; i++) { var a = a0 + i / n * 6.283, k = 0.72 + rnd() * 0.42; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    var d = '', m = n;
    for (i = 0; i < m; i++) { // Catmull-Rom fechado -> Bézier
      var p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
      if (!i) d += 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return { d: d + 'Z', start: pts[0], pts: pts, cx: cx, cy: cy };
  }
  function pontoNaRota(rt, f) { // posição aproximada ao longo do laço pelos vértices (suficiente para a arte)
    var n = rt.pts.length, x = f * n, i = Math.floor(x) % n, t = x - Math.floor(x), a = rt.pts[i], b = rt.pts[(i + 1) % n];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function htmlPercurso(vm) {
    var ev = vm.ev, sp = ev.sport, route = sp.route;
    if (vm.virtual || !route || (!route.hasMap && !route.hasElevation) || vm.estado === 'cancelada' || vm.estado === 'realizada') return '';
    var rs = sp.races.filter(function (r) { return r.distanceM || r.durationH; });
    if (!rs.length) rs = sp.races;
    var atual = rs.filter(function (r) { return r.id === S.rota; })[0] || rs.filter(function (r) { return r.elevationGainM; })[0] || rs[0];
    S.rota = atual.id;
    var chips = rs.length > 1 ? '<div class="ee-rotas" role="radiogroup" aria-label="Prova do percurso">' + rs.map(function (r) { return '<button type="button" class="chip chip-sm" role="radio" aria-checked="' + (r.id === atual.id ? 'true' : 'false') + '" aria-pressed="' + (r.id === atual.id ? 'true' : 'false') + '" data-ee-rota="' + r.id + '">' + esc(r.name) + '</button>'; }).join('') + '</div>' : '';
    var p = route.hasElevation ? perfil(ev, atual) : null, corpo = '';
    var distTxt = atual.distanceM ? km(atual.distanceM) + ' km' : atual.durationH ? atual.durationH + ' h' : atual.name;
    var nums = '<ul class="ee-nums" aria-label="Números do percurso"><li><span class="over">Distância</span><span class="ee-stat">' + esc(distTxt) + '</span></li>' +
      (p ? '<li><span class="over">Subida (D+)</span><span class="ee-stat">' + p.ganho + '</span><span class="ee-unit">m</span></li><li><span class="over">Descida (D−)</span><span class="ee-stat">' + p.descida + '</span><span class="ee-unit">m</span></li><li><span class="over">Ponto mais alto</span><span class="ee-stat">' + p.mx + '</span><span class="ee-unit">m</span></li>' : '') + '</ul>';
    var arte = '';
    if (route.hasMap) {
      var rt = rota(ev, atual), mk = '<circle cx="' + rt.start[0].toFixed(1) + '" cy="' + rt.start[1].toFixed(1) + '" r="0"/>';
      var hid = ''; var nA = route.aidStations || 0, ii;
      var mrk = ''; for (ii = 1; ii <= nA && atual.distanceM >= 5000; ii++) { var q = pontoNaRota(rt, ii / (nA + 1)); mrk += '<span class="ee-mk" style="left:' + (q[0] / 520 * 100).toFixed(2) + '%;top:' + (q[1] / 200 * 100).toFixed(2) + '%" title="Hidratação" aria-hidden="true"></span>'; }
      var legenda = '<p class="ee-legenda"><span class="ee-leg"><span class="ee-mk ee-mk--flag" aria-hidden="true">' + ico('flag', '', 16) + '</span>Largada e chegada: ' + esc(localCurto(ev)) + '</span>' + (nA && atual.distanceM >= 5000 ? '<span class="ee-leg"><span class="ee-mk ee-mk--inline" aria-hidden="true"></span>' + nA + (nA > 1 ? ' pontos' : ' ponto') + ' de hidratação</span>' : '') + (route.loops > 1 ? '<span class="ee-leg">' + route.loops + ' voltas</span>' : '') + '</p>';
      arte = '<figure class="ee-arte"><div class="ee-arte__box" role="img" aria-label="Mapa do percurso de ' + esc(distTxt) + ', com largada e chegada em ' + esc(localCurto(ev)) + '"><svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><g class="ee-arte__curvas"><use href="#ee-rt-' + atual.id + '" transform="translate(' + rt.cx + ' ' + rt.cy + ') scale(.78) translate(-' + rt.cx + ' -' + rt.cy + ')"/><use href="#ee-rt-' + atual.id + '" transform="translate(' + rt.cx + ' ' + rt.cy + ') scale(.56) translate(-' + rt.cx + ' -' + rt.cy + ')"/></g><path id="ee-rt-' + atual.id + '" d="' + rt.d + '" class="ee-arte__rota" vector-effect="non-scaling-stroke"/></svg>' + mrk + '<span class="ee-mk ee-mk--flag" style="left:' + (rt.start[0] / 520 * 100).toFixed(2) + '%;top:' + (rt.start[1] / 200 * 100).toFixed(2) + '%" aria-hidden="true">' + ico('flag', '', 16) + '</span></div>' + '<figcaption>' + legenda + '</figcaption></figure>';
    }
    var alt = '';
    if (p) {
      var g = svgAlt(p), marcosH = p.marcos.map(function (m) { var i = Math.round(m.f * (p.N - 1)); return '<span class="ee-alt__mk" style="left:' + (g.X(i)).toFixed(2) + '%;top:' + (g.Y(p.el[i])).toFixed(2) + '%" title="' + m.t + '" aria-hidden="true"></span>'; }).join('');
      var yl = [p.mx, Math.round((p.mx + p.lo) / 2), p.lo].map(function (v, k) { return '<span class="ee-alt__y" style="top:' + (k * 50) + '%">' + v + ' m</span>'; }).join('');
      var kmx = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return '<span style="left:' + (f * 100) + '%">' + km(Math.round(f * p.dist / 100) * 100) + (f === 1 ? ' km' : '') + '</span>'; }).join('');
      var hiX = g.X(p.hi), hiY = g.Y(p.mx);
      alt = '<div class="ee-alt" data-ee-alt data-n="' + p.N + '" data-prova="' + atual.id + '">' +
        '<p class="ee-alt__leitura" data-ee-leitura>Ponto mais alto · ' + esc(textoCursor(p, p.hi)) + '</p>' +
        '<div class="ee-alt__area-box" role="slider" tabindex="0" aria-label="Altimetria da prova de ' + esc(distTxt) + '" aria-valuemin="0" aria-valuemax="' + (p.N - 1) + '" aria-valuenow="' + p.hi + '" aria-valuetext="' + esc(resumoAlt(p) + ' ' + textoCursor(p, p.hi)) + '" data-ee-slider>' +
          g.svg + '<span class="ee-alt__ylabels" aria-hidden="true">' + yl + '</span>' + marcosH +
          '<span class="ee-alt__cursor" data-ee-cursor style="left:' + hiX.toFixed(2) + '%" aria-hidden="true"><span class="ee-alt__dot" style="top:' + hiY.toFixed(2) + '%"></span></span>' +
        '</div>' +
        '<div class="ee-alt__x" aria-hidden="true">' + kmx + '</div>' +
        '<details class="ee-dados"><summary class="linkbtn">Ver dados</summary><table class="ee-tabela"><caption class="sr-only">Altitude por quilômetro</caption><thead><tr><th scope="col">Km</th><th scope="col">Altitude</th><th scope="col">Ponto</th></tr></thead><tbody>' +
          [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (f) { var i = Math.round(f * (p.N - 1)), mk = p.marcos.filter(function (m) { return Math.round(m.f * (p.N - 1)) === i; })[0]; return '<tr><td>' + km(Math.round(f * p.dist / 100) * 100) + '</td><td>' + p.el[i] + ' m</td><td>' + (mk ? mk.t : (i === p.hi ? 'Ponto mais alto' : '')) + '</td></tr>'; }).join('') + '</tbody></table></details></div>';
    }
    var apoio = '<p class="ee-apoio">Altimetria mostra quanto o percurso sobe e desce.</p>'; // ES-EV-17
    return secao('ee-percurso', 'Percurso e altimetria', apoio + chips + nums + '<div class="ee-percurso">' + arte + alt + '</div>');
  }

  // 7. kit e retirada
  function htmlKit(vm) {
    var ev = vm.ev, sp = ev.sport, kit = sp.kit, kp = sp.kitPickup || { mode: 'nenhuma', days: [] }, tz = ev.tz, reg = sp.registration;
    if (vm.estado === 'cancelada' || vm.estado === 'realizada' || !kit) return '';
    var itens = (kit.items || []).map(function (id) {
      var k = KIT[id]; if (!k) return '';
      var tx = esc(k[0]);
      if (id === 'shirt' && kit.shirt) tx += '<span class="ee-item__s">' + esc(cap(lista(kit.shirt.fits.map(function (x) { return x === 'feminino-babylook' ? 'feminino baby look' : x; }))) + ' · tamanhos ' + kit.shirt.sizes[0] + ' a ' + kit.shirt.sizes[kit.shirt.sizes.length - 1]) + '</span>';
      return '<li class="ee-item"><span class="ee-item__ic">' + ico(k[1]) + '</span><span>' + tx + '</span></li>';
    }).join('');
    var f = [];
    if (kp.mode === 'presencial' || kp.mode === 'ambos') {
      var hs = kp.days.map(function (x) { return hhmm(x.from) + ' às ' + hhmm(x.to); }), igual = hs.every(function (h) { return h === hs[0]; });
      var horas = igual ? 'das ' + hs[0].replace(' às ', ' às ') : kp.days.map(function (x) { return pt(diaUtc(x.date, { day: 'numeric' }), 'day') + ': ' + hhmm(x.from) + ' às ' + hhmm(x.to); }).join('; ');
      f.push(fato('Retirada do kit', esc('Retire seu kit de ' + dias(kp.days.map(function (x) { return x.date; })) + ', ' + horas + '.') + (kp.requires && kp.requires.indexOf('documento-com-foto') >= 0 ? ' Leve um documento com foto.' : '')));  // ES-EV-21
      if (kp.place) f.push(fato('Local da retirada', esc(String(kp.place.name).replace(/^Retirada do kit\s*·\s*/, ''))));
      var obrigatorio = kp.requiresCompleteRegistration && kp.days.length ? iso(Date.parse(kp.days[0].date + 'T12:00:00Z') - (reg.athleteDataDeadlineDays || 7) * DIA) : null;
      if (obrigatorio) f.push(fato('Dados da inscrição', 'Complete os dados da inscrição até ' + esc(diaMes(obrigatorio, 'UTC')) + ' para poder retirar o kit.')); // ES-CW-09
      if (kp.byThirdParty) f.push(fato('Retirada por outra pessoa', 'Outra pessoa pode retirar seu kit com ' + esc(lista((kp.requires || []).map(function (x) { return EXIGE[x] || x; }))) + '.')); // ES-EV-23
      else f.push(fato('Retirada por outra pessoa', 'A retirada é só pelo próprio participante.')); // provisório
      f.push(fato('Sem o QR na Carteira', 'Se o QR ainda não estiver na Carteira, leve um documento com foto: a retirada também pode ser pelo CPF.')); // ES-EV-24
    }
    if ((kp.mode === 'correio' || kp.mode === 'ambos') && kp.mailing) {
      var prev = iso(Date.parse(ev.iso) - kp.mailing.deadlineDaysBefore * DIA);
      f.push(fato('Kit pelo correio', 'Seu kit será enviado pelo correio para o endereço que você informar. Previsão de entrega: até ' + esc(diaMes(prev, tz)) + '.' + (kp.mailing.feeCents ? ' Frete: ' + esc(brl(kp.mailing.feeCents)) + '.' : ' Sem frete.'))); // ES-EV-25
    }
    return secao('ee-kit', 'O que está incluso na inscrição', '<ul class="ee-itens">' + itens + '</ul>' + (f.length ? '<dl class="facts ee-facts">' + f.join('') + '</dl>' : '')); // ES-EV-19
  }

  // 8. serviços da prova
  function htmlServicos(vm) {
    var ev = vm.ev, sp = ev.sport, r = sp.route, ex = sp.extras || [], s = [], tz = ev.tz;
    if (vm.estado === 'cancelada' || vm.estado === 'realizada') return '';
    if (r && r.aidStations && !vm.virtual) s.push(['drop', 'Hidratação no percurso', r.aidStations + (r.aidStations > 1 ? ' pontos' : ' ponto') + ' de hidratação.']);
    ex.forEach(function (x) {
      if (x.id === 'transporte-de-bike') s.push(['truck', 'Transporte da bike', brl(x.cents) + ' por bike, contratado até ' + x.deadlineDaysBefore + ' dias antes da prova.']);
      else if (x.id === 'camiseta-extra') s.push(['shirt', 'Camiseta extra', brl(x.cents) + '. Você escolhe ao se inscrever.']);
      else if (x.id === 'pacote-fotos') s.push(['camera', 'Pacote de fotos', brl(x.cents) + '. Você escolhe ao se inscrever.']);
      else if (x.id === 'jantar') s.push(['cup', 'Jantar da véspera', brl(x.cents) + '. Você escolhe ao se inscrever.']);
      else if (x.id === 'doacao') s.push(['heart', 'Doação à causa da prova', 'Valores de ' + lista((x.options || []).map(brl), 'ou') + '. Você escolhe ao se inscrever.']);
      else s.push(['gift', x.label, x.cents ? brl(x.cents) + '.' : '']);
    });
    if (!s.length) return '';
    return secao('ee-servicos', 'Serviços da prova', '<ul class="ee-serv">' + s.map(function (x) { return '<li class="ee-serv__i"><span class="ee-item__ic">' + ico(x[0]) + '</span><span><strong>' + esc(x[1]) + '</strong><span class="ee-item__s">' + esc(x[2]) + '</span></span></li>'; }).join('') + '</ul>');
  }

  // 9. grupos e assessorias (DE-36)
  function htmlGrupo(vm) {
    if (!vm.grupoAtivo) return '';
    return '<section class="ee-sec ee-grupo" id="ee-grupo" aria-labelledby="ee-grupo-h"><div class="ee-grupo__t"><h2 class="ee-h ee-h--card" id="ee-grupo-h">Grupos e assessorias</h2><p class="ee-grupo__a">' + esc(T.grupoApoio) + '</p></div>' + grupoBtn(vm, 'pagina', 'bs') + '</section>'; // ES-EV-27 com o rótulo de DE-36
  }

  // 10. regulamento e documentos
  function htmlRegras(vm) {
    var ev = vm.ev, sp = ev.sport, reg = sp.registration, rs = sp.races, f = [];
    if (vm.estado === 'cancelada') return '';
    var idades = rs.map(function (r) { return r.ageMin; }).filter(function (x) { return x != null; });
    if (idades.length) { var mi = Math.min.apply(null, idades); f.push(fato('Idade mínima', mi + ' anos')); }
    var gen = rs.every(function (r) { return r.classification && r.classification.genders && r.classification.genders.length === 1 && r.classification.genders[0] === 'F'; }) ? 'Só para mulheres' : '';
    if (gen) f.push(fato('Quem pode participar', gen));
    var cl = rs[0].classification || {};
    var cats = [];
    var cat = DADOS && DADOS.catalogos && DADOS.catalogos.faixasEtarias && cl.ageGroupSet && DADOS.catalogos.faixasEtarias[cl.ageGroupSet];
    if (cat) cats.push(cat.label.toLowerCase());
    if (cl.levels) cats.push('níveis ' + lista(cl.levels.map(function (x) { return x === 'iniciante' ? 'iniciante' : x === 'open' ? 'open' : x; })));
    if (cats.length) f.push(fato('Categorias', esc(cap(lista(cats)))));
    var cortes = rs.map(function (r) { return r.cutoffMin ? esc(r.name) + ' em ' + minutos(r.cutoffMin) : null; }).filter(Boolean);
    if (cortes.length) f.push(fato('Tempo limite', cortes.join(' · ')));
    var sa = reg.healthRequirement;
    f.push(fato('Saúde', sa === 'certificate' ? 'O organizador pede atestado médico.' : sa === 'declaration' ? 'O organizador pede uma declaração de aptidão, feita por cada participante.' : 'Esta prova não pede atestado.')); // ES-EV-29
    var pdf = '<a class="bs ee-pdf" href="#" role="button" data-toast="' + esc(T.toastPdf) + '" data-toast-kind="info">' + ico('file', 'ico-16') + esc(T.regulamento) + '</a>'; // ES-EV-28
    return secao('ee-regras', 'Regulamento e documentos', '<div class="ee-pdf-box">' + pdf + '</div><dl class="facts ee-facts">' + f.join('') + '</dl>');
  }

  // 11. perguntas frequentes (geradas dos campos)
  function faq(vm) {
    var ev = vm.ev, sp = ev.sport, reg = sp.registration, tz = ev.tz, kp = sp.kitPickup, rs = sp.races, q = [];
    var tr = reg.transfer;
    var idades = rs.map(function (r) { return r.ageMin; }).filter(function (x) { return x != null; });
    q.push(['Quem pode participar?', idades.length ? 'A partir de ' + Math.min.apply(null, idades) + ' anos' + (rs.some(function (r) { return r.types && r.types.indexOf('kids') >= 0; }) ? ', e a prova Kids é para crianças com responsável' : '') + '.' : null]);
    q.push(['Qual a idade mínima?', idades.length ? 'A idade mínima é de ' + Math.min.apply(null, idades) + ' anos.' : null]);
    if (!vm.virtual && kp && (kp.mode === 'presencial' || kp.mode === 'ambos') && kp.days.length) q.push(['Como retiro meu kit?', 'Retire seu kit de ' + dias(kp.days.map(function (x) { return x.date; })) + (kp.place ? ', em ' + kp.place.city : '') + '. Leve um documento com foto.']);
    if (kp && (kp.mode === 'presencial' || kp.mode === 'ambos')) q.push(['Outra pessoa pode retirar o meu kit?', kp.byThirdParty ? 'Pode, com ' + lista((kp.requires || []).map(function (x) { return EXIGE[x] || x; })) + '.' : null]);
    if (tr) q.push(['Posso transferir minha inscrição?', tr.allowed ? 'Sim, até ' + tr.untilDaysBefore + (tr.untilDaysBefore === 1 ? ' dia' : ' dias') + ' antes da prova. ' + (tr.feeCents ? 'A taxa de transferência é ' + brl(tr.feeCents) + ', definida pela organização.' : 'Não há taxa de transferência.') : 'A organização não permite transferir inscrições nesta prova.']); // ES-TR-03
    q.push(['Posso cancelar minha inscrição?', 'Sim, pela Carteira, dentro do prazo de cancelamento. Se o prazo já tiver terminado, ainda dá para transferir a inscrição.']); // provisório: a janela é do Jurídico (ES-AR-01, ES-AR-07)
    q.push(['O que acontece se a prova for adiada ou cancelada?', 'Se a prova for cancelada, você recebe o reembolso na forma de pagamento original, em até 10 dias úteis, sem precisar pedir. Se for adiada, você recebe um aviso com as opções.', 'cancel']); // ES-RE-03, ES-RE-07
    if (vm.grupoAtivo) q.push(['Posso ir com um grupo?', 'Pode. Use o botão ' + T.grupoRotulo + ', na página da prova.']);
    if (!vm.virtual) q.push(['Como chego ao local da largada?', 'A largada é em ' + localCurto(ev) + ', ' + ev.city + '. Veja o mapa em Data e largada.']);
    return q.filter(function (x) { return x[1]; });
  }
  function htmlFaq(vm) {
    var itens = faq(vm).map(function (x, i) {
      var id = 'ee-faq-' + i, aberto = !!S.acc[id];
      return '<div class="ee-acc" data-aberto="' + aberto + '"><h3 class="ee-acc__h"><button type="button" class="ee-acc__b" id="' + id + '-t" aria-expanded="' + aberto + '" aria-controls="' + id + '" data-ee-acc="' + id + '"' + (x[2] ? ' data-faq-chave="' + x[2] + '"' : '') + '><span>' + esc(x[0]) + '</span>' + ico('chev', 'ee-acc__ic') + '</button></h3><div class="ee-acc__c" id="' + id + '" role="region" aria-labelledby="' + id + '-t"' + (aberto ? '' : ' inert') + '><div class="ee-acc__in"><p>' + esc(x[1]) + '</p></div></div></div>';
    }).join('');
    return secao('ee-faq', 'Perguntas frequentes', '<div class="ee-faq">' + itens + '</div>'); // ES-EV-30, ES-EV-31
  }

  // 12. faz parte de, e organizador
  // «Outras etapas», «Mais provas de…» e «Provas parecidas»: o cartão de evento único, tipo prova (window.IngresseCartao.html, a MESMA marcação das listas; 30/10/2026)
  function cartaoMini(e, extra) {
    var d = distRotulo(e), capa = e.capaCard ? './assets/ticketsports/' + e.capaCard.replace(/\.webp$/, '') : '';
    var c = window.IngresseCartao.prova({ id: e.id, nome: extra ? extra + ' · ' + tituloLimpo(e) : tituloLimpo(e), iso: e.iso ? e.iso.slice(0, 10) : '', semData: !e.iso, vir: !!e.sport.virtual, kd: d.texto, ku: d.unidade.trim(), local: String(e.venue || '').split(' · ')[0], c: e.city || '',
      sit: e.situacao, ab: e.sport.registration && e.sport.registration.opensAt ? e.sport.registration.opensAt.slice(0, 10) : '', img: capa ? capa + '.webp' : './cymatics-cat/' + e.id + '.png', srcset: capa ? capa + '.webp 480w' : '' });
    return window.IngresseCartao.html('prova', c);
  }
  function htmlOrganizador(vm) {
    var ev = vm.ev, sp = ev.sport, out = '', outras, dados = DADOS ? DADOS.events : [];
    if (sp.circuit) {
      var etapas = dados.filter(function (e) { return e.sport.circuit && e.sport.circuit.id === sp.circuit.id && e.id !== ev.id; }).sort(function (a, b) { return a.sport.circuit.etapa - b.sport.circuit.etapa; });
      if (etapas.length) out += '<div class="ee-bl"><h3 class="ee-h3">Etapa ' + sp.circuit.etapa + ' de ' + sp.circuit.etapas + ' do ' + esc(sp.circuit.nome) + '</h3><p class="ee-apoio">Outras etapas do circuito.</p><div class="ee-cards">' + etapas.map(function (e) { return cartaoMini(e, 'Etapa ' + e.sport.circuit.etapa); }).join('') + '</div></div>'; // ES-EV-06, ES-EV-33
    }
    outras = dados.filter(function (e) { return e.id !== ev.id && e.sport.organizer.id === sp.organizer.id && (!sp.circuit || !e.sport.circuit || e.sport.circuit.id !== sp.circuit.id); }).sort(function (a, b) { return a.iso.localeCompare(b.iso); }).slice(0, 3);
    var nome = semOrg(sp.organizer.name);
    out += '<div class="ee-bl" id="ee-organizador"><h3 class="ee-h3">' + esc(nome) + '</h3>' + (outras.length ? '<p class="ee-apoio">Mais provas de ' + esc(nome) + '.</p><div class="ee-cards">' + outras.map(function (e) { return cartaoMini(e); }).join('') + '</div>' : '<p class="ee-apoio">Esta é a única prova de ' + esc(nome) + ' na Ingresse Sports por enquanto.</p>') + '</div>'; // ES-EV-33; frase sem outras provas: provisório
    return secao('ee-faz-parte', sp.circuit ? 'Faz parte de um circuito' : 'Organização', out);
  }

  // 13. resultados e fotos (só com link)
  function htmlHistorico(vm) {
    var h = vm.ev.sport.history; if (!h) return '';
    var b = [];
    if (h.resultados) b.push('<a class="bs" href="#" role="button" data-toast="' + esc(T.toastLink) + '">' + esc(T.verResultados) + '</a>');
    if (h.fotos) b.push('<a class="bs" href="#" role="button" data-toast="' + esc(T.toastLink) + '">' + esc(T.verFotos) + '</a>');
    return secao('ee-resultados', 'Resultados e fotos', '<div class="ee-botoes">' + b.join('') + '</div>'); // ES-EV-39: só se existirem
  }

  // 14. prova social (só dado real e acima do limiar: o dado de hoje não traz "inscritos na semana", então não aparece)
  function htmlSocial(vm) {
    var s = vm.ev.sport.social; if (!s || !(s.weekly >= 20)) return '';
    return '<p class="ee-social">' + esc(NF.format(s.weekly)) + ' pessoas se inscreveram esta semana</p>'; // ES-EV-34
  }

  // 15. provas parecidas
  function parecidas(vm) {
    var ev = vm.ev, sp = ev.sport, dados = DADOS ? DADOS.events : [], t0 = Date.parse(ev.iso);
    var pontos = dados.filter(function (e) { return e.id !== ev.id && (e.situacao === 'venda' || e.situacao === 'pre' || e.situacao === 'nao-aberto'); }).map(function (e) {
      var s = 0, a = e.sport;
      if (a.modalities[0] === sp.modalities[0]) s += 3;
      if (e.city && e.city === ev.city) s += 2;
      if (a.distanceBands.some(function (b) { return sp.distanceBands.indexOf(b) >= 0; })) s += 2;
      if (Math.abs(Date.parse(e.iso) - t0) < 45 * DIA) s += 1;
      return { e: e, s: s };
    }).filter(function (x) { return x.s >= 4; }).sort(function (a, b) { return b.s - a.s || a.e.iso.localeCompare(b.e.iso); }).slice(0, 3);
    return pontos.map(function (x) { return x.e; });
  }
  function htmlParecidas(vm) {
    var ev = vm.ev, cs = parecidas(vm), m = ROTULO_MOD[vm.mod] || 'esportes';
    var links = [
      '<a class="chip" href="' + esc(agregadora(ev)) + '">' + esc('Mais provas de ' + m.toLowerCase()) + '</a>',
      ev.city ? '<a class="chip" href="Esportes.dc.html?q=' + encodeURIComponent(ev.city) + '">' + esc('Provas em ' + ev.city) + '</a>' : '',
      '<a class="chip" href="Esportes.dc.html">Todas as provas da Ingresse Sports</a>'
    ].join('');
    return secao('ee-parecidas', 'Provas parecidas', (cs.length ? '<div class="ee-cards">' + cs.map(function (e) { return cartaoMini(e); }).join('') + '</div>' : '') + '<div class="ee-links">' + links + '</div>'); // ES-EV-33; bloco 15 (gerado)
  }

  /* barra do celular e cartão de compra */
  function htmlAside(vm) {
    var ev = vm.ev, cta = ctaDe(vm), e = vm.estado, sel = vm.sel, tz = ev.tz, reg = ev.sport.registration;
    var cls = vm.venda && e !== 'lote-esgotado-intervalo' ? 'bp bp-lg' : 'bp bp-lg bp-ink';
    var preco, nota = '';
    if (vm.temPreco) { preco = '<span class="ee-aside__ap">' + (sel ? esc(sel.r.name) : 'a partir de') + '</span><span class="ee-aside__preco">' + esc(brl(sel ? (sel.cur ? sel.cur.totalCents : sel.r.fromCents) : vm.precoMin)) + '</span>'; nota = 'Preço final, já com taxa.'; }
    else if (e === 'nao-abertas') { preco = '<span class="ee-aside__ap">Inscrições não abertas</span>'; nota = 'Abrem em ' + diaMes(reg.opensAt, TZ0) + ', às ' + hora(reg.opensAt, TZ0) + '.'; }
    else if (e === 'lote-esgotado-intervalo') { preco = '<span class="ee-aside__ap">Lote esgotado</span>'; nota = 'O próximo lote ainda não abriu.'; }
    else if (e === 'evento-esgotado') { preco = '<span class="ee-aside__ap">Esgotada</span>'; nota = 'Se abrir vaga, avisamos você.'; }
    else if (e === 'encerradas') { preco = '<span class="ee-aside__ap">Inscrições fechadas</span>'; nota = 'Encerraram em ' + diaMes(reg.closesAt, tz) + '.'; }
    else if (e === 'adiada') { preco = '<span class="ee-aside__ap">Prova adiada</span>'; nota = 'As inscrições estão suspensas.'; }
    else if (e === 'cancelada') { preco = '<span class="ee-aside__ap">Prova cancelada</span>'; nota = 'O reembolso é automático.'; }
    else if (e === 'realizada') { preco = '<span class="ee-aside__ap">Prova realizada</span>'; nota = ''; }
    else preco = '';
    var sec = ctaSecundaria(vm);
    return '<aside class="ee-aside" aria-label="Inscrição"><div class="ee-aside__card"><span class="over">Inscrição</span><div class="ee-aside__p">' + preco + '</div>' + (nota ? '<p class="ee-aside__n">' + esc(nota) + '</p>' : '') + btnHtml(cta, cls + ' ee-aside__cta', ' data-ee-cta-aside') + (sec ? btnHtml(sec, 'bs ee-aside__sec') : '') + (vm.grupoAtivo ? '<div class="ee-aside__g">' + grupoBtn(vm, 'pagina-lateral', 'bs') + '<span class="ee-aside__ga">' + esc(T.grupoApoio) + '</span></div>' : '') + '<button type="button" class="bs ee-aside__share" data-share="' + esc(vm.titulo) + '">' + ico('share', 'ico-16') + ' Compartilhar</button></div></aside>';
  }
  function htmlBarra(vm) {
    if (vm.estado === 'cancelada') return ''; // Helena 3.1: some em Cancelada
    var cta = ctaDe(vm), sel = vm.sel, e = vm.estado, reg = vm.ev.sport.registration, esq = '', cls = vm.venda && e !== 'lote-esgotado-intervalo' ? 'bp' : 'bp bp-ink';
    if (vm.temPreco) esq = '<span class="ee-mbar__ap">' + (sel ? esc(sel.r.name) : 'a partir de') + '</span><span class="ee-mbar__p">' + esc(brl(sel ? (sel.cur ? sel.cur.totalCents : sel.r.fromCents) : vm.precoMin)) + '</span>'; // ES-EV-09
    else esq = '<span class="ee-mbar__p ee-mbar__p--t">' + esc(chipDe(vm).rotulo) + '</span>';
    return '<div class="mbar ee-mbar" data-ee-mbar><div class="ee-mbar__t">' + esq + '</div>' + btnHtml(cta, cls + ' ee-mbar__cta', ' data-ee-cta-mbar') + '</div>';
  }

  /* ------------------------------------------------------------------ montagem */
  var raiz = null, painel = null, VM = null;
  function htmlPagina(vm) {
    var sociais = htmlSocial(vm);
    return htmlHero(vm) +
      '<div class="ee-in ee-corpo">' +
        '<div class="ee-topo">' + htmlBanner(vm) + htmlResumo(vm) + '</div>' +
        '<div class="ee-body"><main class="ee-main" id="ee-main">' +
          htmlProvas(vm) + htmlLargada(vm) + htmlSobre(vm) + htmlPercurso(vm) + htmlKit(vm) + htmlServicos(vm) + htmlGrupo(vm) + htmlRegras(vm) + htmlFaq(vm) + htmlOrganizador(vm) + htmlHistorico(vm) + sociais + htmlParecidas(vm) +
        '</main>' + htmlAside(vm) + '</div>' +
      '</div>' + htmlBarra(vm);
  }

  /* pôster por código: placa de Chladni (a mesma conta do previa.js), linhas brancas e um toque de vermelho; a distância fica por cima, em DOM */
  function cor(v, alvo) {
    var s = getComputedStyle(alvo || root).getPropertyValue(v).trim(), m = /^#([0-9a-f]{6})/i.exec(s);
    return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
  }
  function placa(cv, seed, estilo, modo) { // modo 'poster' (branco + vermelho) ou 'fundo' (a cor da vertical, bem fraca)
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    cv.width = w; cv.height = h;
    var E = CYM[estilo] || CYM.faixas, m = E[0][0] + (seed % (E[0][1] - E[0][0] + 1)), n = E[1][0] + ((seed >> 3) % (E[1][1] - E[1][0] + 1)); if (n === m) n += 1;
    var b = E[2] * (seed % 2 ? 1 : 0.9), ph = (seed % 97) * 0.37, i, j;
    var A = new Float32Array(w), C = new Float32Array(w), B = new Float32Array(h), D = new Float32Array(h);
    for (i = 0; i < w; i++) { var u = i / (w - 1); A[i] = Math.cos(n * Math.PI * u + ph); C[i] = Math.cos(m * Math.PI * u + ph); }
    for (j = 0; j < h; j++) { var v = j / (h - 1); B[j] = Math.cos(m * Math.PI * v); D[j] = Math.cos(n * Math.PI * v); }
    var ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, EPS = modo === 'poster' ? 0.05 : 0.075;
    var branco = cor('--color-sport-poster-fg', cv) || [250, 250, 250], verm = cor('--color-fg-brand', cv) || [255, 74, 64], ciano = cor('--color-sport-cymatics', cv) || [255, 39, 26];
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      var a = Math.abs(A[i] * B[j] + b * C[i] * D[j]); if (a >= EPS) continue;
      var k = 1 - a / EPS, o = (j * w + i) * 4, c, al;
      if (modo === 'poster') {
        var t = (i / w) * 0.6 + (j / h) * 0.4; // faixa diagonal em vermelho: ~18% das linhas
        c = t > 0.58 && t < 0.76 ? verm : branco; al = k * (c === verm ? 0.95 : 0.62);
      } else { c = ciano; al = k > 0.6 ? k * 0.2 : k * 0.12; }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.round(al * 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  function desenharArte() {
    if (!raiz || !VM) return;
    var seed = hashStr(String(VM.ev.id)), estilo = VM.virtual || VM.ev.sport.circuit ? 'circuito' : (ESTILO_MOD[VM.mod] || 'faixas');
    var p = raiz.querySelector('[data-ee-poster]'); if (p) placa(p, seed, estilo, 'poster');
    var f = raiz.querySelector('[data-ee-cym]'); if (f && f.clientWidth) placa(f, seed, estilo, 'fundo');
  }
  var roHero = null;
  function observarArte() {
    var h = raiz && raiz.querySelector('[data-ee-hero]'); if (!h || !window.ResizeObserver) return;
    if (roHero) roHero.disconnect();
    var t = 0; roHero = new ResizeObserver(function () { clearTimeout(t); t = setTimeout(desenharArte, 120); });
    roHero.observe(h);
  }

  /* troca de estado sem corte seco: cada bloco novo entra (8 px de baixo, 280 ms), cada bloco que sai vira um fantasma e se despede (8 px para cima, 160 ms) e o que continua mas
     mudou de lugar desliza (FLIP, só transform). O resto da página não se mexe. Tokens motion.*; movimento reduzido ou aba oculta: troca direta. */
  function movTok() {
    if (reduzido() || document.hidden) return null;
    var cs = getComputedStyle(root), n = function (v, d) { var x = parseFloat(cs.getPropertyValue(v)); return isNaN(x) ? d : x; }, e = function (v, d) { return cs.getPropertyValue(v).trim() || d; };
    return { fast: n('--motion-duration-fast', 160), base: n('--motion-duration-base', 280), st: n('--motion-stagger', 40), sm: n('--motion-distance-sm', 8), enter: e('--motion-ease-enter', 'ease-out'), exit: e('--motion-ease-exit', 'ease-in'), move: e('--motion-ease-move', 'ease-in-out') };
  }
  function blocosPagina() {
    var out = [];
    ['.ee-hero-info', '.ee-stage'].forEach(function (sel) { var n = raiz.querySelector(sel); if (n) out.push(n); });
    ['.ee-topo', '.ee-main'].forEach(function (sel) { var c = raiz.querySelector(sel); if (c) Array.prototype.forEach.call(c.children, function (n) { out.push(n); }); });
    return out;
  }
  function trocarPagina(html, animar) {
    var t = animar && raiz.animate ? movTok() : null;
    var velhos = t ? blocosPagina().map(function (n) { return { n: n, sig: n.outerHTML, r: n.getBoundingClientRect(), ref: n.offsetParent || raiz }; }) : null;
    raiz.innerHTML = html;
    if (!velhos) return;
    var pool = {};
    velhos.forEach(function (v) { (pool[v.sig] = pool[v.sig] || []).push(v); });
    blocosPagina().forEach(function (n) {
      var l = pool[n.outerHTML] && pool[n.outerHTML].shift();
      if (!l) { n.animate([{ opacity: 0, transform: 'translateY(' + t.sm + 'px)' }, { opacity: 1, transform: 'none' }], { duration: t.base, delay: Math.round(t.base * 0.4), easing: t.enter, fill: 'backwards' }); return; }
      var dy = l.r.top - n.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) n.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: t.base, easing: t.move });
    });
    Object.keys(pool).forEach(function (k) {
      pool[k].forEach(function (v) {
        if (!v.ref.isConnected) return;
        var rr = v.ref.getBoundingClientRect(), g = v.n.cloneNode(true);
        g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); });
        g.querySelectorAll('a,button,input,summary').forEach(function (x) { x.setAttribute('tabindex', '-1'); }); g.querySelectorAll('iframe,canvas').forEach(function (x) { x.remove(); }); g.setAttribute('aria-hidden', 'true'); // o mapa não pode ser recarregado no fantasma (pedido abortado)
        g.style.cssText = 'position:absolute;pointer-events:none;margin:0;z-index:1;top:' + (v.r.top - rr.top - v.ref.clientTop) + 'px;left:' + (v.r.left - rr.left - v.ref.clientLeft) + 'px;width:' + v.r.width + 'px';
        v.ref.appendChild(g);
        var a = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-' + t.sm + 'px)' }], { duration: t.fast, easing: t.exit, fill: 'both' });
        a.finished.then(function () { g.remove(); }, function () { g.remove(); });
      });
    });
  }
  function render(preservar) {
    if (!raiz || !S.ev0) return;
    var scrollY = window.scrollY, foco = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute('data-ee-foco') : null;
    var d = clone(S.ev0), estado = S.modo === 'auto' ? estadoDoDado(d) : S.modo;
    if (S.modo !== 'auto') simular(d, S.modo);
    if (estado === 'adiada-sem-data') estado = 'adiada';
    VM = modelo(d, estado);
    trocarPagina(htmlPagina(VM), !!preservar);
    raiz.setAttribute('data-estado', estado);
    document.title = VM.titulo + (VM.ev.iso ? ' ' + ano(VM.ev.iso, VM.tz) : '') + ': datas, distâncias e inscrição | Ingresse Sports'; // ES-EV-01
    desenharArte(); observarArte();
    animarAltimetria();
    if (preservar) window.scrollTo(0, scrollY);
    atualizarPainel();
    var u = new URL(location.href);
    if (S.modo === 'auto') u.searchParams.delete('estado'); else u.searchParams.set('estado', S.modo);
    if (S.grupo === 'auto') u.searchParams.delete('grupo'); else u.searchParams.set('grupo', S.grupo);
    if (S.prova) u.searchParams.set('prova', S.prova); else u.searchParams.delete('prova');
    try { history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  }

  /* trilha da página (a navegação do Ingresse Sports subiu para o cabeçalho; aqui fica só o caminho até a prova) */
  function trilhaHtml(vm) {
    var m = ROTULO_MOD[vm.mod] || 'Esportes';
    return '<ol><li><a href="Esportes.dc.html">Ingresse Sports</a></li><li><a href="' + esc(agregadora(vm.ev)) + '">' + esc(m) + '</a></li><li><span aria-current="page">' + esc(vm.titulo) + '</span></li></ol>';
  }

  /* cabeçalho do Ingresse Sports (tools/previa/esportes/cabecalho.css, o mesmo da Home): uma logo só, a navegação da vertical como principal e a volta sutil à Ingresse.
     O cabeçalho deste arquivo é o da Evento geral; aqui ele é refeito uma vez, com as mesmas classes e os mesmos destinos da Home. */
  function montarCabecalho() {
    var hdr = document.querySelector('#dc-root .hdr'), linha = hdr && hdr.querySelector('.hdr-row');
    if (!linha || linha.classList.contains('esp-hdr-row')) return;
    var logo = linha.querySelector('.hdr-logo'), lupa = linha.querySelector('.hdr-lupa'); if (!logo) return;
    var chev = '<svg class="ico ico-16" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
    linha.classList.add('esp-hdr-row');
    logo.insertAdjacentHTML('beforebegin', '<a href="Main.dc.html" class="esp-volta" aria-label="Voltar para a Ingresse">' + chev + '<span>Ingresse</span></a>');
    logo.classList.add('esp-hlogo'); logo.setAttribute('href', 'Esportes.dc.html'); logo.setAttribute('aria-label', 'Ingresse Sports, início');
    logo.innerHTML = '<span class="esp-logo" role="img" aria-label="Ingresse Sports"></span>';
    var ordem = ['corrida', 'trail-run', 'caminhada', 'corrida-de-aventura', 'ciclismo', 'mountain-bike', 'triathlon', 'natacao', 'beach-tennis', 'futevolei', 'canoagem-va-a'];
    var mod = VM && VM.mod ? VM.mod : (S.ev0 && S.ev0.sport ? S.ev0.sport.modalities[0] : ''); // a modalidade da prova fica marcada
    var itens = ordem.map(function (m) { return [ROTULO_MOD[m] || m, 'Esportes.dc.html?modalidade=' + m, m === mod]; });
    var nav = document.createElement('nav'); nav.className = 'esp-nav'; nav.setAttribute('aria-label', 'Ingresse Sports');
    nav.innerHTML = '<ul class="esp-sub-links"><li class="esp-volta-li"><a href="Main.dc.html" class="esp-sub-a esp-volta-m" aria-label="Voltar para a Ingresse">' + chev + 'Ingresse</a></li>' +
      itens.map(function (i) { return '<li><a href="' + i[1] + '" class="esp-sub-a"' + (i[2] ? ' aria-current="true"' : '') + '>' + esc(i[0]) + '</a></li>'; }).join('') + '</ul>';
    logo.insertAdjacentElement('afterend', nav);
    if (lupa) { lupa.setAttribute('href', 'Busca.dc.html?escopo=esportes'); lupa.setAttribute('aria-label', 'Buscar provas, eventos e cidades'); }
  }

  /* altimetria: o traço se desenha uma vez ao entrar na tela (ES-14 da direção); movimento reduzido: aparece pronta */
  function animarAltimetria() {
    var el = raiz && raiz.querySelector('.ee-alt__area-box'); if (!el) return;
    var chave = VM.ev.id + ':' + S.rota;
    if (S.jaAnimou[chave] || reduzido() || !el.animate || !window.IntersectionObserver) return;
    var svg = el.querySelector('.ee-alt__svg'); if (!svg) return;
    svg.style.clipPath = 'inset(0 100% 0 0)';
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect(); S.jaAnimou[chave] = 1;
      var cs = getComputedStyle(root), dur = parseFloat(cs.getPropertyValue('--motion-duration-slow')) || 480, ease = cs.getPropertyValue('--motion-ease-enter').trim() || 'ease-out';
      var a = svg.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: dur * 2, easing: ease, fill: 'forwards' });
      a.onfinish = function () { svg.style.clipPath = ''; try { a.cancel(); } catch (e) {} };
    }, { threshold: 0.3 });
    io.observe(el);
    setTimeout(function () { if (!S.jaAnimou[chave]) { svg.style.clipPath = ''; } }, 4000); // plano B: aba em segundo plano não observa
  }

  function moverCursor(box, idx) {
    var alt = box.closest('.ee-alt'); if (!alt) return;
    var ev = VM.ev, r = ev.sport.races.filter(function (x) { return x.id === alt.getAttribute('data-prova'); })[0], p = perfil(ev, r); if (!p) return;
    idx = Math.max(0, Math.min(p.N - 1, idx));
    var g = svgAlt(p), cur = box.querySelector('[data-ee-cursor]'), dot = cur.querySelector('.ee-alt__dot');
    cur.style.left = g.X(idx).toFixed(2) + '%'; dot.style.top = g.Y(p.el[idx]).toFixed(2) + '%';
    var tx = textoCursor(p, idx);
    alt.querySelector('[data-ee-leitura]').textContent = (idx === p.hi ? 'Ponto mais alto · ' : '') + tx;
    box.setAttribute('aria-valuenow', idx); box.setAttribute('aria-valuetext', tx);
    box.setAttribute('data-idx', idx);
  }

  /* lembretes: texto e estado dos botões "Me avisar quando abrir" sem refazer a página */
  function atualizarLembretes(tipo) {
    if (!raiz || !VM) return;
    var L = window.IngresseLembretes; if (!L) return;
    raiz.querySelectorAll('[data-lembrete-id]').forEach(function (b) {
      var s = L.tem(b.getAttribute('data-lembrete-id'));
      b.setAttribute('aria-pressed', s ? 'true' : 'false');
      var r = b.querySelector('[data-ee-lb-rotulo]'); if (r) r.textContent = s ? 'Aviso ativado' : 'Me avisar quando abrir';
    });
    var t = raiz.querySelector('[data-ee-abre-texto]');
    if (t && VM.estado === 'nao-abertas') {
      var lb = lembrete({ id: 'esporte:' + VM.ev.id, abreEm: VM.ev.sport.registration.opensAt, ev: VM.ev });
      if (lb) { if (lb.aberto) { render(true); return; } t.textContent = 'As inscrições abrem ' + lb.quando + (lb.falta ? ' (' + lb.falta + ')' : ''); }
    }
  }

  /* ------------------------------------------------------------------ painel de simulação (a engrenagem; uma só) */
  function montarPainel() {
    if (painel && painel.isConnected) return;
    var d = document.createElement('details'); d.className = 'proto ee-proto';
    var chips = ESTADOS.map(function (e) { return '<button type="button" class="chip chip-sm" data-ee-estado="' + e[0] + '" aria-pressed="false">' + esc(e[1]) + '</button>'; }).join('');
    var ex = exemplos().map(function (x) { return '<a class="chip chip-sm" href="' + hrefEvento(x.e) + '">' + esc(x.rot) + '</a>'; }).join('');
    d.innerHTML = '<summary>Protótipo · estado da prova</summary><div class="proto-in" role="group" aria-label="Estado da prova">' +
      '<div class="over">Estado da prova</div><button type="button" class="chip chip-sm" data-ee-estado="auto" aria-pressed="true">Como está no dado</button>' + chips +
      '<div class="over">Compra em grupo</div><button type="button" class="chip chip-sm" data-ee-grupo-chave="auto" aria-pressed="true">Como está no dado</button><button type="button" class="chip chip-sm" data-ee-grupo-chave="1" aria-pressed="false">Com grupo</button><button type="button" class="chip chip-sm" data-ee-grupo-chave="0" aria-pressed="false">Sem grupo</button>' +
      '<div class="over">Provas de exemplo</div>' + ex + '</div>';
    var wrap = document.querySelector('.ee-wrap') || raiz.parentNode; wrap.appendChild(d); painel = d;
  }
  function exemplos() {
    if (!DADOS) return [];
    var ev = DADOS.events, out = [];
    function um(rot, f) { var e = ev.filter(f)[0]; if (e && out.every(function (o) { return o.e.id !== e.id; })) out.push({ rot: rot, e: e }); }
    um('Corrida de rua', function (e) { return e.sport.modalities[0] === 'corrida' && e.situacao === 'venda' && e.sport.races.length >= 2 && e.sport.route && e.sport.grupo.ativo; });
    um('Trail run', function (e) { return e.sport.modalities[0] === 'trail-run' && e.situacao === 'venda'; });
    um('Triathlon', function (e) { return e.sport.modalities[0] === 'triathlon' && e.situacao === 'venda'; });
    um('Ciclismo', function (e) { return e.sport.modalities[0] === 'ciclismo' && e.situacao === 'venda'; });
    um('Natação', function (e) { return e.sport.modalities[0] === 'natacao' && e.situacao === 'venda'; });
    um('Beach tennis', function (e) { return e.sport.modalities[0] === 'beach-tennis' && e.situacao === 'venda'; });
    um('Corrida de aventura', function (e) { return e.sport.modalities[0] === 'corrida-de-aventura'; });
    um('Corrida Kids', function (e) { return e.sport.audience.indexOf('kids') >= 0 && e.situacao === 'venda'; });
    um('Desafio virtual', function (e) { return e.sport.virtual && e.situacao === 'venda'; });
    um('Etapa de circuito', function (e) { return e.sport.circuit && e.situacao === 'venda'; });
    um('Prova com selo Últimas vagas', function (e) { return e.selo && e.selo.codigo === 'ultima-chance'; });
    um('Prova com selo Lote esgotado', function (e) { return e.selo && e.selo.codigo === 'lote-esgotado'; });
    return out;
  }
  function atualizarPainel() {
    if (!painel) return;
    painel.querySelectorAll('[data-ee-estado]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ee-estado') === S.modo ? 'true' : 'false'); });
    painel.querySelectorAll('[data-ee-grupo-chave]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ee-grupo-chave') === S.grupo ? 'true' : 'false'); });
  }

  /* ------------------------------------------------------------------ interações */
  function rolarPara(id, abrir) {
    var alvo = document.getElementById(id); if (!alvo) return;
    var topo = alvo.getBoundingClientRect().top + window.scrollY - (document.querySelector('.hdr') ? document.querySelector('.hdr').offsetHeight : 0) - 16;
    window.scrollTo({ top: topo, behavior: reduzido() ? 'auto' : 'smooth' });
    if (abrir) {
      var b = alvo.querySelector('[data-faq-chave="' + abrir + '"]');
      if (b && b.getAttribute('aria-expanded') !== 'true') alternarAcc(b);
    }
  }
  function alternarAcc(b) {
    var id = b.getAttribute('data-ee-acc'), aberto = b.getAttribute('aria-expanded') === 'true', c = document.getElementById(id), acc = b.closest('.ee-acc');
    S.acc[id] = !aberto;
    b.setAttribute('aria-expanded', String(!aberto)); acc.setAttribute('data-aberto', String(!aberto));
    if (aberto) c.setAttribute('inert', ''); else c.removeAttribute('inert');
  }
  function aoClicar(e) {
    var t = e.target; if (!t.closest) return;
    var sel = t.closest('[data-ee-sel]');
    if (sel) { var id = sel.getAttribute('data-ee-sel'); S.prova = S.prova === id ? null : id; render(true); var novo = raiz.querySelector('[data-ee-sel="' + id + '"]'); if (novo) novo.focus({ preventScroll: true }); return; }
    var acc = t.closest('[data-ee-acc]'); if (acc) { alternarAcc(acc); return; }
    var sc = t.closest('[data-ee-scroll]');
    if (sc) { e.preventDefault(); rolarPara(sc.getAttribute('data-ee-scroll'), sc.getAttribute('data-ee-abre')); return; }
    var rt = t.closest('[data-ee-rota]'); if (rt) { S.rota = rt.getAttribute('data-ee-rota'); render(true); var b = raiz.querySelector('[data-ee-rota="' + S.rota + '"]'); if (b) b.focus({ preventScroll: true }); return; }
    var es = t.closest('[data-ee-estado]'); if (es) { var k = es.getAttribute('data-ee-estado'); S.modo = k === 'auto' || CHAVES[k] ? k : 'auto'; render(true); return; }
    var gc = t.closest('[data-ee-grupo-chave]'); if (gc) { S.grupo = gc.getAttribute('data-ee-grupo-chave'); render(true); return; }
    var gr = t.closest('[data-ee-grupo]');
    if (gr) { // a URL de grupo do protótipo é de simulação (.test): o botão avisa em vez de abrir uma aba sem destino
      var h = gr.getAttribute('href') || '';
      if (/\.(test|invalid|example)(\/|$)/.test(h.replace(/^https?:\/\//, '').split('/')[0]) || /exemplo\.test/.test(h)) { e.preventDefault(); if (window.IX && IX.toast) IX.toast(T.toastGrupo, 'info'); }
      return;
    }
  }
  function aoMover(e) {
    var box = e.target.closest && e.target.closest('[data-ee-slider]'); if (!box) return;
    if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0 && !box.matches(':hover')) return;
    var r = box.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, n = Number(box.closest('.ee-alt').getAttribute('data-n'));
    moverCursor(box, Math.round(f * (n - 1)));
  }
  function aoTeclar(e) {
    var box = e.target.closest && e.target.closest('[data-ee-slider]'); if (!box) return;
    var i = Number(box.getAttribute('aria-valuenow')), n = Number(box.closest('.ee-alt').getAttribute('data-n')), passo = e.shiftKey ? 10 : 1;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') i += passo; else if (k === 'ArrowLeft' || k === 'ArrowDown') i -= passo; else if (k === 'Home') i = 0; else if (k === 'End') i = n - 1; else return;
    e.preventDefault(); moverCursor(box, i);
  }

  /* saída suave: a Evento geral anima o hero e o conteúdo dela (movimento-compra.js); como aqui eles ficam escondidos, a tela esportiva esmaece junto */
  function saidaSuave() {
    if (!window.navigation || !window.navigation.addEventListener) return;
    window.navigation.addEventListener('navigate', function (e) {
      if (!raiz || reduzido() || !e.defaultPrevented || !raiz.animate) return;
      try {
        if (!/\/(Ingressos|Checkout|Pagamento)\.dc\.html$/.test(new URL(e.destination.url).pathname)) return;
        var cs = getComputedStyle(root), fast = parseFloat(cs.getPropertyValue('--motion-duration-fast')) || 160, sm = parseFloat(cs.getPropertyValue('--motion-distance-sm')) || 8;
        raiz.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(' + (-sm) + 'px)' }], { duration: fast, easing: cs.getPropertyValue('--motion-ease-exit').trim() || 'ease-in', fill: 'forwards' });
      } catch (x) {}
    });
  }
  function entradaSuave() {
    if (reduzido() || !raiz || !raiz.animate) return;
    var cs = getComputedStyle(root), base = parseFloat(cs.getPropertyValue('--motion-duration-base')) || 280, md = parseFloat(cs.getPropertyValue('--motion-distance-md')) || 16, ease = cs.getPropertyValue('--motion-ease-enter').trim() || 'ease-out';
    var alvos = [raiz.querySelector('.ee-hero-info'), raiz.querySelector('.ee-topo'), raiz.querySelector('.ee-main')].filter(Boolean);
    alvos.forEach(function (el, i) { try { el.animate([{ opacity: 0, transform: 'translateY(' + md + 'px)' }, { opacity: 1, transform: 'none' }], { duration: base, delay: i * 40, easing: ease, fill: 'backwards' }); } catch (x) {} });
  }

  /* ------------------------------------------------------------------ montagem no DOM do motor de templates */
  function marca() { if (root.getAttribute('data-marca') !== 'esportes') root.setAttribute('data-marca', 'esportes'); }
  function achaOnde() {
    var h = document.querySelector('#dc-root .hdr'); return h ? h.parentElement : null;
  }
  function montar() {
    var wrap = achaOnde(); if (!wrap) return false;
    wrap.classList.add('ee-wrap');
    if (!raiz || !raiz.isConnected) {
      raiz = document.createElement('div'); raiz.id = 'ee-root'; raiz.className = 'ee-root'; wrap.appendChild(raiz);
    }
    return true;
  }
  function falhou() { // prova que não existe: com ?esporte= mostra um estado vazio; com ?e= devolve a tela à Evento geral
    var ligar = qs.get('esporte');
    root.removeAttribute('data-ee'); var s = document.getElementById('ee-cedo'); if (s) s.remove();
    if (!ligar) return;
    root.setAttribute('data-ee', 'on');
    if (!montar()) return;
    raiz.innerHTML = '<div class="ee-in ee-vazio"><h1 class="ee-h">Não achamos esta prova.</h1><p class="ee-apoio">O endereço pode ter mudado. Veja as provas da Ingresse Sports.</p><a class="bp bp-lg" href="Esportes.dc.html">Ver todas as provas</a></div>';
  }
  function iniciar() {
    var tentativas = 0;
    carregar().then(function (d) {
      var ev = achar(d);
      if (!ev) { var esperar = function () { if (!document.querySelector('#dc-root .hdr') && tentativas++ < 60) return setTimeout(esperar, 100); falhou(); }; esperar(); return; }
      S.ev0 = ev;
      var m = qs.get('estado'); if (m && CHAVES[m]) S.modo = m;
      var g = qs.get('grupo'); if (g === '1' || g === '0') S.grupo = g;
      var tenta = function () {
        if (!montar()) { if (tentativas++ < 80) setTimeout(tenta, 100); return; }
        marca(); root.setAttribute('data-ee', 'on');
        montarCabecalho();
        montarPainel();
        render(false);
        entradaSuave();
      };
      tenta();
    }).catch(function (err) { try { console.error('evento-esportes:', err && err.stack || err); } catch (x) {} var f = function () { if (!document.querySelector('#dc-root .hdr') && tentativas++ < 60) return setTimeout(f, 100); falhou(); }; f(); });
  }

  /* API para as outras telas (a etapa "Sua prova" usa o mesmo botão de grupo) */
  window.IngresseEsportes = {
    carregar: carregar,
    grupo: {
      rotulo: T.grupoRotulo, apoio: T.grupoApoio,
      ativo: function (ev, estado) { var a = !!(ev && ev.sport && ev.sport.grupo && ev.sport.grupo.ativo); return a && { abertas: 1, 'lote-esgotado': 1, ultimas: 1, 'prova-esgotada': 1, 'pre-venda': 1 }[estado || 'abertas'] === 1; },
      url: function (ev) { return ev && ev.sport && ev.sport.grupo ? ev.sport.grupo.url : null; },
      html: function (ev, origem) { var u = ev.sport.grupo && ev.sport.grupo.url; if (!u) return ''; return grupoBtn({ grupoUrl: u, titulo: tituloLimpo(ev) }, origem || 'sua-prova', 'bs'); }
    },
    estadoDoDado: estadoDoDado
  };

  if (!ehAtivo) return;
  document.addEventListener('click', aoClicar);
  document.addEventListener('pointermove', aoMover);
  document.addEventListener('pointerdown', aoMover);
  document.addEventListener('keydown', aoTeclar);
  document.addEventListener('previa:lembretes', function (e) { atualizarLembretes(e.detail && e.detail.tipo); });
  // o previa.js refaz data-marca a partir da escolha guardada; na vertical ela vale sempre
  new MutationObserver(function () { if (root.getAttribute('data-ee') && root.getAttribute('data-marca') !== 'esportes') root.setAttribute('data-marca', 'esportes'); }).observe(root, { attributes: true, attributeFilter: ['data-marca'] });
  saidaSuave();
  setInterval(function () { if (VM && VM.estado === 'nao-abertas' && !document.hidden) atualizarLembretes('tick'); }, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
