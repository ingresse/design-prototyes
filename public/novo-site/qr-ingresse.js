/* qr-ingresse.js: QR Code do protótipo no modelo do Untitled UI («QR code, with custom options»): a biblioteca é a mesma do componente
   (qr-code-styling, MIT; vendor/qr-code-styling.js, tudo local), com opções próprias: cor da tinta nos módulos e nos cantos e o glifo da Ingresse no centro
   (imageSize 0,3 e margem 2; nível de correção H para o glifo não atrapalhar a leitura). Fundo SEMPRE branco, nos dois temas: o QR só lê com quiet zone clara.
   Os códigos são de verdade (leem no celular); os dados são sintéticos (ingresso: INGRESSE-TICKET-n; Pix: o Copia e Cola da própria tela).
   Uso:  IngresseQR.uri(chave, valor [, opcoes])  devolve o data URI do SVG ou '' enquanto ele é gerado (async, ~10 ms) e emite «previa:qr» quando fica pronto;
         IngresseQR.preparar(chave, valor [, opcoes])  devolve a Promise do data URI. Cache por chave; chave nova para valor novo. */
(function () {
  if (window.IngresseQR) return;
  var TINTA = '#0A0A0A';
  var cache = {}, pend = {};
  function opcoes(valor, extra) {
    return Object.assign({
      width: 512, height: 512, type: 'svg', data: String(valor), margin: 24,
      qrOptions: { errorCorrectionLevel: 'H' },
      image: './assets/brand/ingresse-glifo.svg',
      imageOptions: { imageSize: 0.3, margin: 2, hideBackgroundDots: true, saveAsBlob: true },
      dotsOptions: { color: TINTA, type: 'square' },
      cornersSquareOptions: { color: TINTA, type: 'square' },
      cornersDotOptions: { color: TINTA, type: 'square' },
      backgroundOptions: { color: '#FFFFFF' }
    }, extra || {});
  }
  function comoUri(blob) {
    return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = erro; r.readAsDataURL(blob); });
  }
  function preparar(chave, valor, extra) {
    if (cache[chave]) return Promise.resolve(cache[chave]);
    if (pend[chave]) return pend[chave];
    if (!window.QRCodeStyling) return Promise.resolve('');
    pend[chave] = new window.QRCodeStyling(opcoes(valor, extra)).getRawData('svg').then(comoUri).then(function (uri) {
      cache[chave] = uri; delete pend[chave];
      try { document.dispatchEvent(new CustomEvent('previa:qr', { detail: { chave: chave } })); } catch (e) {}
      return uri;
    }, function () { delete pend[chave]; return ''; });
    return pend[chave];
  }
  window.IngresseQR = {
    preparar: preparar,
    uri: function (chave, valor, extra) { if (cache[chave]) return cache[chave]; preparar(chave, valor, extra); return ''; }
  };
})();
