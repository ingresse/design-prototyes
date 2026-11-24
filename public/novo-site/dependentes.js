/* dependentes.js: M3 da jornada de compra de futebol. `window.IngresseDependentes`: dependentes da conta, cadastro rápido, cartão de pessoa e a etapa «Quem vai».
   Especificação: docs/produto/JORNADA-FUTEBOL-PROTOTIPO.md §3.3, §3.8 (itens 72 e 73), §4.6, D1 a D3 · Textos: docs/conteudo/JORNADA-FUTEBOL-MICROCOPY.md (JF-2-…, JF-E-…).
   Mapa de compatibilidade: docs/design/COMPATIBILIDADE-UNTITLED-UI.md, itens 72 (cartão de pessoa) e 73 (cartão de estado do rosto). CSS: ./rosto.css. Carregar depois de rosto.js.
   Nada aqui grava imagem nem envia dado: dependentes e rostos são ESTADO em `jfConta` (IX.store; memória se não houver). Nada jurídico na interface.

   API:
     IngresseDependentes.listar(ref?)                                  [{ id, nome, email, nascimento, vinculo, idade, rosto }] (idade na data do jogo)
     IngresseDependentes.elegiveis(regras, jogo, ctx?)                 [{ id, nome, idade, rosto, ok, motivo, motivoId }] ctx: { atribuidos:{depId:n}, atual:n, jaTem:[depId] }
     IngresseDependentes.adicionar(dep) / .remover(id)                 persistem em jfConta e emitem `jf:dependentes`
     IngresseDependentes.abrirCadastro({ gatilho, regras, jogo, aoSalvar(dep), aoFechar() })   modal de cadastro rápido (nome, e-mail, nascimento, vínculo), sem sair da compra
     IngresseDependentes.abrirGerenciar({ gatilho, regras, jogo, emUso(id)→bool, aoMudar() })  «Seus dependentes»: lista, remover, adicionar
     IngresseDependentes.cartaoHtml(pessoa, { modo:'radio'|'estatico', selecionado, desabilitado, motivo, facial })   marcação do cartão 72 (string)
     IngresseDependentes.montar(el, opcoes) → { atualizar({ingressos}), titulares(), resumo(), cadastrarPendentes(), abrirIngresso(n), destruir() }
        opcoes: { ingressos:[{ n, setor, setorId, fileira, assento, tipo, gratuito }], titulares:[{ n, tipo:'eu'|'dependente'|'outra', pessoaId, contato }],
                  config (bloco do jogo; senão IngresseJornadaFutebol.config()), jogo, facial:'antes'|'depois'|'nao', regras, estado (?estado=), contaEmail,
                  aoMudar(titulares, resumo), aoResponsavel({ n, setorId }), aoCadastrarRosto(pessoa) }
        resumo: { total, escolhidos, ok, pendencias:[{ n, pessoaId, nome, tipo, podeAqui }], bloqueios:[{ n, id, texto }], botao:{ acao:'pagar'|'cadastrar'|'bloqueado', rotulo, motivo } }
     Eventos no document: `jf:dependentes` { lista }, `jf:titulares` { titulares, resumo }, `jf:responsavel` { n, setorId } (a M2 leva à etapa 1 para incluir o ingresso do responsável). */
(function () {
  'use strict';
  if (window.IngresseDependentes) return;
  var R = window.IngresseRosto;
  if (!R) throw new Error('IngresseDependentes: carregue rosto.js antes');
  var t = R.t, esc = R.esc, svg = R.svg, ICO = R.icones;

  /* ------------------------------------------------------------------ textos desta etapa (ids da Luíza; JF-N-… ainda sem id) */
  Object.assign(R.textos, {
    'JF-2-03a': 'Ingresso {n} · {setor} · Fileira {fileira} · Assento {assento} · {tipo}',
    'JF-2-03b': 'Ingresso {n} · {setor} · {tipo}',
    'JF-2-04': 'Quem vai usar este ingresso?',
    'JF-2-05a': 'Meu ingresso', 'JF-2-05b': 'Outra pessoa', 'JF-2-05c': 'Meu dependente',
    'JF-2-06': 'Você, {Nome}',
    'JF-2-07': 'E-mail, CPF ou passaporte de quem vai',
    'JF-2-08': 'A pessoa precisa de conta na Ingresse e do rosto cadastrado.',
    'JF-2-14': 'Escolha o dependente',
    'JF-2-16': 'Adicionar dependente', 'JF-2-17': 'Gerenciar dependentes',
    'JF-2-18': '{n} de {total} ingressos com pessoa escolhida',
    'JF-2-19': 'Ir para o pagamento',
    'JF-2-20': 'Seus dependentes',
    'JF-2-21': 'Você ainda não tem dependentes. Adicione quem vai ao jogo com você.',
    'JF-2-22a': 'Nome completo', 'JF-2-22b': 'Data de nascimento',
    'JF-2-23': 'Use o documento de quem vai entrar no jogo.',
    'JF-2-24': 'Salvar dependente',
    'JF-2-25': '{Nome} foi adicionado aos seus dependentes.',
    'JF-2-26': 'Digite o nome completo.',
    'JF-2-27': 'Confira a data de nascimento: ela parece incompleta.',
    'JF-2-29': 'Para este jogo, dependentes têm menos de {idade} anos.',
    'JF-2-30': '{Nome} saiu dos seus dependentes.',
    'JF-2-30b': '{Nome} tem ingresso neste pedido. Escolha outra pessoa antes de remover.',
    'JF-2-35': 'Escolha quem vai usar cada ingresso para continuar. {n} sem pessoa.',
    'JF-2-36': 'Falta cadastrar o rosto de {n} {pessoa|pessoas} para continuar.',
    'JF-2-37': 'Trocar pessoa',
    'JF-E-13': 'Este ingresso não vale para a idade de {Nome}. Escolha outro tipo de ingresso ou outra pessoa.',
    'JF-E-14a': '{Nome} já tem ingresso para este jogo.',
    'JF-E-14b': '{Nome} já está em outro ingresso deste pedido. Escolha outro dependente.',
    'JF-E-15': 'O ingresso de {Nome} só sai com o ingresso de um responsável no mesmo setor.',
    'JF-E-15-btn': 'Incluir ingresso do responsável',
    'JF-E-20': '{Nome} já tem ingresso para este jogo. Escolha outra pessoa.',
    /* novos, ainda sem id da Luíza */
    'JF-N-buscar': 'Buscar',
    'JF-N-completo': 'Completo', 'JF-N-falta-rosto': 'Falta rosto', 'JF-N-falta-titular': 'Falta titular',
    'JF-N-busca-vazia': 'Digite o e-mail, o CPF ou o passaporte de quem vai.',
    'JF-N-busca-invalida': 'Confira o e-mail ou o CPF: ele parece incompleto.',
    'JF-N-proprio': 'Este ingresso é para outra pessoa. Para você, escolha «Meu ingresso».',
    'JF-N-dup': '{Nome} já está em outro ingresso deste pedido. Escolha outra pessoa.',
    'JF-N-eu-dup': 'Você já está em outro ingresso deste pedido. Escolha outra pessoa.',
    'JF-N-vinculo': 'Vínculo',
    'JF-N-vinculo-ph': 'Escolha o vínculo',
    'JF-N-vinculo-erro': 'Escolha o vínculo.',
    'JF-N-dep-dup': 'Este dependente já está nos seus dependentes.',
    'JF-N-dep-max': 'Você chegou ao limite de {n} dependentes.',
    'JF-N-remover': 'Remover',
    'JF-N-link-rotulo': 'Link para copiar'
  });
  ['JF-N-buscar', 'JF-N-completo', 'JF-N-falta-rosto', 'JF-N-falta-titular', 'JF-N-busca-vazia', 'JF-N-busca-invalida', 'JF-N-proprio', 'JF-N-dup', 'JF-N-eu-dup', 'JF-N-vinculo', 'JF-N-vinculo-ph', 'JF-N-vinculo-erro', 'JF-N-dep-dup', 'JF-N-dep-max', 'JF-N-remover', 'JF-N-link-rotulo']
    .forEach(function (k) { if (R.novos.indexOf(k) < 0) R.novos.push(k); });
  var VINCULOS = ['Filho(a)', 'Neto(a)', 'Sobrinho(a)', 'Enteado(a)', 'Irmão(ã)', 'Afilhado(a)', 'Outro'];

  /* ------------------------------------------------------------------ datas e idades */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function idadeEm(nasc, ref) {
    var n = String(nasc || '').split('-').map(Number), r = String(ref || '').split('-').map(Number);
    if (n.length < 3 || r.length < 3 || n.some(isNaN) || r.some(isNaN)) return null;
    var a = r[0] - n[0];
    if (r[1] < n[1] || (r[1] === n[1] && r[2] < n[2])) a--;
    return a;
  }
  function deBR(txt) { // dd/mm/aaaa -> aaaa-mm-dd (ou null se não existir)
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(txt || '').trim());
    if (!m) return null;
    var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || y < 1900) return null;
    return y + '-' + m[2] + '-' + m[1];
  }
  function referencia(o) {
    var j = (o && o.jogo) || (window.IngresseJornadaFutebol && window.IngresseJornadaFutebol.jogo && window.IngresseJornadaFutebol.jogo());
    if (j && j.quando) { var d = new Date(j.quando); if (!isNaN(d)) return iso(d); }
    return R.conta().referencia || '2026-11-08';
  }
  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : (p[0][1] || ''))).toUpperCase();
  }
  function slug(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ------------------------------------------------------------------ regras do jogo (aceita o desenho da Iara e o do spec em inglês) */
  function regrasDe(cfg) {
    cfg = cfg || {};
    var r = (cfg.regras && cfg.regras.dependentes) || (cfg.rules && cfg.rules.dependents) || cfg.dependentes || (cfg.idadeMax != null || cfg.maxAge != null ? cfg : {});
    function pega(a, b, d) { return r[a] != null ? r[a] : (r[b] != null ? r[b] : d); }
    return { permitido: pega('permitido', 'allowed', true) !== false, idadeMax: pega('idadeMax', 'maxAge', 12), exigeRosto: pega('exigeRosto', 'requireFacial', true) !== false,
      responsavelMesmoSetor: pega('responsavelMesmoSetor', 'guardianSameSector', true) !== false, maxDependentes: pega('maxDependentes', 'maxDependents', null) };
  }
  function configDoJogo(o) {
    if (o && o.config) return o.config;
    var J = window.IngresseJornadaFutebol;
    try { if (J && J.config) return J.config() || {}; } catch (e) {}
    return {};
  }

  /* ------------------------------------------------------------------ dependentes da conta */
  function emitirDeps() {
    try { document.dispatchEvent(new CustomEvent('jf:dependentes', { detail: { lista: listar() } })); } catch (e) {}
  }
  function listar(ref) {
    var c = R.conta(), r = ref || referencia();
    return (c.dependentes || []).map(function (d) {
      return { id: d.id, nome: d.nome, email: d.email || '', nascimento: d.nascimento, vinculo: d.vinculo, idade: idadeEm(d.nascimento, r), rosto: R.estado(d.id) };
    });
  }
  function adicionar(dep) {
    var c = R.conta();
    dep = Object.assign({ id: 'dep-' + slug(dep.nome) + '-' + Date.now().toString(36) }, dep);
    c.dependentes.push({ id: dep.id, nome: dep.nome, email: dep.email || '', nascimento: dep.nascimento, vinculo: dep.vinculo });
    c.rostos[dep.id] = { estado: 'pendente' };
    R._guardar(c);
    emitirDeps();
    return dep;
  }
  function remover(id) {
    var c = R.conta();
    c.dependentes = (c.dependentes || []).filter(function (d) { return d.id !== id; });
    delete c.rostos[id];
    R._guardar(c);
    emitirDeps();
  }
  function elegiveis(regras, jogo, ctx) {
    regras = regras && regras.idadeMax != null ? regras : regrasDe(regras);
    ctx = ctx || {};
    var ref = referencia({ jogo: jogo }), atribuidos = ctx.atribuidos || {}, jaTem = ctx.jaTem || [];
    return listar(ref).map(function (d) {
      var ok = true, motivo = '', id = '';
      if (d.idade != null && d.idade >= regras.idadeMax) { ok = false; id = 'JF-E-13'; motivo = t('JF-E-13', { Nome: d.nome }); }
      else if (jaTem.indexOf(d.id) >= 0) { ok = false; id = 'JF-E-14a'; motivo = t('JF-E-14a', { Nome: d.nome }); }
      else if (atribuidos[d.id] != null && atribuidos[d.id] !== ctx.atual) { ok = false; id = 'JF-E-14b'; motivo = t('JF-E-14b', { Nome: d.nome }); }
      return { id: d.id, nome: d.nome, idade: d.idade, rosto: d.rosto, vinculo: d.vinculo, ok: ok, motivo: motivo, motivoId: id };
    });
  }

  /* ------------------------------------------------------------------ cartão de pessoa (item 72) */
  function rostoRotulo(e) { return e === 'cadastrado' ? 'cadastrado' : e === 'em-analise' ? 'em análise' : e === 'erro' ? 'com erro' : 'não cadastrado'; }
  function cartaoHtml(p, o) {
    o = o || {};
    var radio = o.modo !== 'estatico', tipo = p.tipo || 'dependente', nome = p.nome || '', facial = o.facial || 'antes';
    var sRosto = (facial === 'nao' || o.semSelo) ? '' : R.seloHtml(R.chaveVisual(p.rosto || 'pendente'), nome);
    var linha = tipo === 'dependente' ? (p.idade != null ? p.idade + ' anos · dependente' : 'dependente') : (p.contato || '');
    var titulo = tipo === 'eu' ? t('JF-2-06', { Nome: nome }) : nome;
    var rotulo = nome + (p.idade != null ? ', ' + p.idade + ' anos' : '') + (facial === 'nao' ? '' : ', rosto ' + rostoRotulo(p.rosto || 'pendente'));
    if (tipo === 'eu') rotulo = titulo + (facial === 'nao' ? '' : ', rosto ' + rostoRotulo(p.rosto || 'pendente'));
    var av = '<span class="uui-avatar uui-avatar--md" role="img" aria-label="' + esc(nome) + '"><span class="uui-avatar__content">' + esc(p.iniciais || iniciais(nome)) + '</span></span>';
    var idm = 'jf-m-' + esc(p.id || nome);
    var corpo = '<span class="pay-t jf-pessoa__t"><strong>' + esc(titulo) + '</strong>' + (linha ? '<small>' + esc(linha) + '</small>' : '') +
      (o.motivo ? '<small class="jf-pessoa__motivo" id="' + idm + '">' + esc(o.motivo) + '</small>' : '') + '</span>';
    if (!radio) return '<div class="jf-pessoa jf-pessoa--estatico" data-tipo="' + esc(tipo) + '" data-id="' + esc(p.id || '') + '">' + av + corpo + sRosto + '</div>';
    var sel = !!o.selecionado, dis = !!o.desabilitado;
    return '<button type="button" class="pay jf-pessoa" role="radio" aria-checked="' + sel + '" data-tipo="' + esc(tipo) + '" data-id="' + esc(p.id) + '" data-foco="dep-' + esc(p.id) + '"' +
      ' tabindex="' + (o.tabindex != null ? o.tabindex : (sel ? 0 : -1)) + '"' + (dis ? ' aria-disabled="true"' : '') + ' aria-label="' + esc(rotulo) + '"' + (o.motivo ? ' aria-describedby="' + idm + '"' : '') + '>' +
      '<span class="pay-dot" aria-hidden="true"></span>' + av + corpo + sRosto + '</button>';
  }

  /* ------------------------------------------------------------------ modais: cadastro rápido e «Seus dependentes» */
  function toast(msg, tipo) { if (window.IX && window.IX.toast) window.IX.toast(msg, tipo || 'ok'); }

  function abrirCadastro(o) {
    o = o || {};
    var regras = regrasDe(o.regras || configDoJogo(o)), ref = referencia(o), erros = {};
    var modal, form;
    var m = window.IngresseModal.abrir({
      id: 'jf-dep', titulo: t('JF-2-16'), descricao: t('JF-2-23'), classe: 'jf-folha-modal', gatilho: o.gatilho,
      aoFechar: function () { if (o.aoFechar) o.aoFechar(); },
      foco: '#jf-dep-nome',
      montar: function (c) {
        modal = c; c.dialog.classList.add('jf-dep');
        c.corpo.innerHTML =
          '<form class="jf-form" id="jf-dep-form" novalidate>' +
          campo('nome', t('JF-2-22a'), '<input id="jf-dep-nome" name="nome" type="text" autocomplete="off" aria-describedby="jf-dep-nome-e">') +
          campo('email', 'E-mail', '<input id="jf-dep-email" name="email" type="email" inputmode="email" autocomplete="off" placeholder="nome@exemplo.com" aria-describedby="jf-dep-email-e">') +
          campo('nasc', t('JF-2-22b'), '<input id="jf-dep-nasc" name="nasc" type="text" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" maxlength="10" aria-describedby="jf-dep-nasc-e">') +
          campo('vinc', t('JF-N-vinculo'), '<select id="jf-dep-vinc" name="vinc" aria-describedby="jf-dep-vinc-e"><option value="">' + esc(t('JF-N-vinculo-ph')) + '</option>' + VINCULOS.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select>') +
          '<div class="jf-form__geral err" id="jf-dep-geral" aria-live="polite" hidden></div></form>';
        form = c.corpo.querySelector('form');
        c.rodape.classList.add('jf-folha__rodape');
        var salvar = document.createElement('button'); salvar.type = 'submit'; salvar.className = 'bp'; salvar.setAttribute('form', 'jf-dep-form'); salvar.textContent = t('JF-2-24');
        c.rodape.appendChild(salvar);
        var nasc = form.querySelector('#jf-dep-nasc');
        nasc.addEventListener('input', function () { // máscara dd/mm/aaaa
          var d = nasc.value.replace(/\D/g, '').slice(0, 8), s = d;
          if (d.length > 4) s = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4); else if (d.length > 2) s = d.slice(0, 2) + '/' + d.slice(2);
          nasc.value = s;
        });
        form.addEventListener('input', function (e) { var f = e.target.closest('.field'); if (f && f.getAttribute('data-err') === 'true') marcarErro(f.getAttribute('data-campo'), ''); });
        form.addEventListener('submit', function (e) { e.preventDefault(); enviar(); });
      }
    });
    function campo(k, rotulo, controle) {
      return '<div class="field" data-campo="' + k + '" data-err="false"><label for="jf-dep-' + (k === 'vinc' ? 'vinc' : k) + '">' + esc(rotulo) + '</label>' + controle + '<span class="err" id="jf-dep-' + k + '-e" aria-live="polite"></span></div>';
    }
    function marcarErro(k, txt) {
      var f = form.querySelector('[data-campo="' + k + '"]'), e = f.querySelector('.err'), i = f.querySelector('input,select');
      f.setAttribute('data-err', txt ? 'true' : 'false'); e.textContent = txt;
      if (txt) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
    }
    function enviar() {
      var nome = form.nome.value.trim().replace(/\s+/g, ' '), email = form.email.value.trim().toLowerCase(), nascTxt = form.nasc.value, vinc = form.vinc.value, e = {};
      var palavras = nome.split(' ').filter(function (p) { return p.length > 1; });
      if (palavras.length < 2) e.nome = t('JF-2-26');
      if (!email) e.email = 'O e-mail é obrigatório.'; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'E-mail inválido.';
      var nascISO = deBR(nascTxt);
      if (!nascISO || nascISO > ref) e.nasc = t('JF-2-27');
      else if (idadeEm(nascISO, ref) >= regras.idadeMax) e.nasc = t('JF-2-29', { idade: regras.idadeMax });
      if (!vinc) e.vinc = t('JF-N-vinculo-erro');
      var geral = '';
      if (!e.nome && !e.nasc && listar(ref).some(function (d) { return slug(d.nome) === slug(nome) && d.nascimento === nascISO; })) e.nome = t('JF-N-dep-dup');
      if (!Object.keys(e).length && regras.maxDependentes != null && listar(ref).length >= regras.maxDependentes) geral = t('JF-N-dep-max', { n: regras.maxDependentes });
      ['nome', 'email', 'nasc', 'vinc'].forEach(function (k) { marcarErro(k, e[k] || ''); });
      var g = form.querySelector('#jf-dep-geral'); g.hidden = !geral; g.textContent = geral;
      var primeiro = ['nome', 'email', 'nasc', 'vinc'].filter(function (k) { return e[k]; })[0];
      if (primeiro) { form.querySelector('[data-campo="' + primeiro + '"] input, [data-campo="' + primeiro + '"] select').focus(); return; }
      if (geral) return;
      var dep = adicionar({ nome: nome, email: email, nascimento: nascISO, vinculo: vinc });
      toast(t('JF-2-25', { Nome: nome.split(' ')[0] }), 'ok');
      modal.fechar(false);
      if (o.aoSalvar) o.aoSalvar(Object.assign({ idade: idadeEm(nascISO, ref), rosto: 'pendente' }, dep));
    }
    return m;
  }

  function abrirGerenciar(o) {
    o = o || {};
    var corpo, modal, aviso = '';
    function desenhar() {
      var lista = listar(referencia(o)), regras = regrasDe(o.regras || configDoJogo(o));
      var h = '';
      if (aviso) h += '<div class="uui-alert uui-alert--warning" role="alert"><span class="uui-alert__icon">' + svg(ICO.alerta) + '</span><div class="uui-alert__body"><p class="uui-alert__text">' + esc(aviso) + '</p></div></div>';
      if (!lista.length) h += '<p class="jf-apoio">' + esc(t('JF-2-21')) + '</p>';
      else h += '<ul class="jf-deps-lista">' + lista.map(function (d) {
        return '<li>' + cartaoHtml({ id: d.id, nome: d.nome, tipo: 'dependente', idade: d.idade, rosto: d.rosto }, { modo: 'estatico', facial: o.facial }) +
          '<button type="button" class="bs bs-sm" data-jf-acao="remover" data-id="' + esc(d.id) + '" aria-label="' + esc(t('JF-N-remover') + ' ' + d.nome) + '">' + esc(t('JF-N-remover')) + '</button></li>';
      }).join('') + '</ul>';
      corpo.innerHTML = h;
      void regras;
    }
    modal = window.IngresseModal.abrir({
      id: 'jf-deps', titulo: t('JF-2-20'), classe: 'jf-folha-modal', gatilho: o.gatilho,
      montar: function (c) {
        corpo = c.corpo; c.rodape.classList.add('jf-folha__rodape');
        var add = document.createElement('button'); add.type = 'button'; add.className = 'bp'; add.textContent = t('JF-2-16');
        c.rodape.appendChild(add);
        add.addEventListener('click', function () { abrirCadastro({ gatilho: add, regras: o.regras, jogo: o.jogo, aoSalvar: function () { aviso = ''; desenhar(); if (o.aoMudar) o.aoMudar(); } }); });
        c.corpo.addEventListener('click', function (e) {
          var b = e.target.closest('[data-jf-acao="remover"]'); if (!b) return;
          var id = b.getAttribute('data-id'), d = listar(referencia(o)).filter(function (x) { return x.id === id; })[0];
          if (o.emUso && o.emUso(id)) { aviso = t('JF-2-30b', { Nome: d ? d.nome : '' }); desenhar(); return; }
          remover(id); aviso = ''; toast(t('JF-2-30', { Nome: d ? d.nome : '' }), 'ok'); desenhar();
          var prox = corpo.querySelector('[data-jf-acao="remover"]'); (prox || add).focus();
          if (o.aoMudar) o.aoMudar();
        });
        desenhar();
      }
    });
    return modal;
  }

  /* ------------------------------------------------------------------ contato de «Outra pessoa» */
  function normalizaContato(txt) {
    var s = String(txt || '').trim();
    if (!s) return { erro: 'vazio' };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { contato: s.toLowerCase(), tipo: 'email' };
    var d = s.replace(/[.\-\s]/g, '');
    if (/^\d{11}$/.test(d) && !/^(\d)\1{10}$/.test(d)) return { contato: d, tipo: 'cpf' };
    if (/^[A-Za-z]{1,2}\d{5,8}$/.test(d)) return { contato: d.toUpperCase(), tipo: 'passaporte' };
    return { erro: 'invalido' };
  }
  function nomeDoContato(c) {
    if (c.tipo === 'email') { var p = c.contato.split('@')[0].split(/[._\-+0-9]/)[0] || c.contato; return p.charAt(0).toUpperCase() + p.slice(1); }
    return 'Pessoa do ' + (c.tipo === 'cpf' ? 'CPF' : 'passaporte') + ' final ' + c.contato.slice(-2);
  }
  function resolveContato(c) {
    var cv = R.conta().convidados || {}, k = cv[c.contato];
    if (k) return { conta: k.conta !== false, nome: k.nome || (k.conta === false ? c.contato : nomeDoContato(c)), rosto: k.rosto || (k.conta === false ? null : 'pendente'), convite: !!k.convite };
    return { conta: true, nome: nomeDoContato(c), rosto: 'cadastrado', convite: false };
  }
  function linkDoConvite(contato) { return 'https://exemplo.test/ingresse/rosto?c=' + encodeURIComponent(String(contato).replace(/[^a-z0-9]/gi, '').slice(0, 24)); }

  /* ------------------------------------------------------------------ a etapa «Quem vai» */
  function montar(el, o) {
    o = o || {};
    var cfg = configDoJogo(o), regras = regrasDe(o.regras || cfg);
    var facial = o.facial || cfg.facial || 'antes';
    var params = R.lerParametros();
    var flag = o.estado !== undefined ? o.estado : params.estado;
    var contaEmail = (o.contaEmail || 'pessoa@exemplo.com').toLowerCase();
    var ingressos = (o.ingressos || []).slice();
    var vivo = true, seq = Math.random().toString(36).slice(2, 7);
    var st = [];
    var cena = null; // { n, chave } foco a restaurar

    function novo(i, ini) {
      ini = ini || {};
      var modo = ini.tipo === 'eu' || ini.tipo === 'dependente' || ini.tipo === 'outra' ? ini.tipo : null;
      return { n: ingressos[i] && ingressos[i].n || i + 1, modo: modo, depId: modo === 'dependente' ? ini.pessoaId : null, contato: modo === 'outra' ? (ini.contato || (ini.pessoaId || '').replace(/^c:/, '')) : null,
        busca: modo === 'outra' && ini.contato ? ini.contato : '', buscaErro: '', aberto: false, link: '', bloqueioDito: '' };
    }
    function iniciar() {
      st = ingressos.map(function (x, i) { return novo(i, (o.titulares || [])[i]); });
      if (st.length && !st.some(function (s) { return s.modo; }) && !(flag === 'titular-ja-tem' || R.conta().pessoa && R.conta().pessoa.temIngressoNoJogo)) st[0].modo = 'eu';
      if (flag === 'convidado-sem-rosto' && st.length) { var u = st[st.length - 1]; u.modo = 'outra'; u.contato = 'bia@exemplo.test'; u.busca = u.contato; }
      if (st.length) st[0].aberto = true;
    }
    iniciar();

    function contaNome() { var c = R.conta(); return (c.pessoa && c.pessoa.nome) || 'Pessoa E.'; }
    function jaTemEu() { var c = R.conta(); return flag === 'titular-ja-tem' || !!(c.pessoa && c.pessoa.temIngressoNoJogo); }
    function jaTemDep() { var l = listar(referencia(o)); return flag === 'dependente-ja-tem' && l.length ? [l[0].id] : []; }
    function atribuidosAte(idx, incluir) {
      var m = {}; st.forEach(function (s, i) { if (s.modo === 'dependente' && s.depId && (incluir ? true : i !== idx)) m[s.depId] = s.n; }); return m;
    }

    function pessoaDe(s) {
      if (s.modo === 'eu') return { id: R.conta().pessoa ? R.conta().pessoa.id : 'eu', nome: contaNome(), tipo: 'eu', contato: contaEmail, rosto: R.estado('eu'), iniciais: (R.conta().pessoa && R.conta().pessoa.iniciais) || 'PE' };
      if (s.modo === 'dependente') {
        var d = listar(referencia(o)).filter(function (x) { return x.id === s.depId; })[0];
        return d ? { id: d.id, nome: d.nome, tipo: 'dependente', idade: d.idade, rosto: d.rosto } : null;
      }
      if (s.modo === 'outra' && s.contato) {
        var r = resolveContato({ contato: s.contato, tipo: /@/.test(s.contato) ? 'email' : /^\d{11}$/.test(s.contato) ? 'cpf' : 'passaporte' });
        return { id: 'c:' + s.contato, nome: r.nome, tipo: 'outra', contato: s.contato, semConta: !r.conta, rosto: r.rosto || 'pendente', convite: r.convite };
      }
      return null;
    }

    function avaliar() {
      var lista = st.map(function (s, i) {
        var ing = ingressos[i] || {}, r = { n: s.n, i: i, completo: false, faltaTitular: false, faltaRosto: false, podeAqui: false, bloqueio: null, pessoa: null };
        var p = pessoaDe(s);
        if (!s.modo || !p) { r.faltaTitular = true; return r; }
        r.pessoa = p;
        var antes = st.slice(0, i).some(function (x, j) { var q = pessoaDe(x); return q && q.id === p.id; });
        if (s.modo === 'eu') {
          if (jaTemEu()) r.bloqueio = { id: 'JF-E-20', texto: t('JF-E-20', { Nome: contaNome() }) };
          else if (antes) r.bloqueio = { id: 'JF-N-eu-dup', texto: t('JF-N-eu-dup') };
        } else if (s.modo === 'dependente') {
          var el0 = elegiveis(regras, o.jogo, { atribuidos: atribuidosAte(i, false), atual: s.n, jaTem: jaTemDep() }).filter(function (x) { return x.id === p.id; })[0];
          if (el0 && !el0.ok) r.bloqueio = { id: el0.motivoId, texto: el0.motivo };
          else if (regras.responsavelMesmoSetor && ing.gratuito) {
            var tem = st.some(function (x, j) { return x.modo === 'eu' && !jaTemEu() && (ingressos[j] || {}).setorId === ing.setorId; });
            if (!tem) r.bloqueio = { id: 'JF-E-15', texto: t('JF-E-15', { Nome: p.nome }), acao: 'responsavel' };
          }
        } else if (s.modo === 'outra' && antes) r.bloqueio = { id: 'JF-N-dup', texto: t('JF-N-dup', { Nome: p.nome }) };
        var exige = s.modo === 'dependente' ? regras.exigeRosto : true;
        r.faltaRosto = facial !== 'nao' && exige && p.rosto !== 'cadastrado';
        r.podeAqui = s.modo !== 'outra';
        r.completo = !r.bloqueio && !r.faltaRosto;
        return r;
      });
      var faltam = lista.filter(function (x) { return x.faltaTitular; });
      var bloq = lista.filter(function (x) { return x.bloqueio; });
      var pend = lista.filter(function (x) { return x.faltaRosto && !x.bloqueio; });
      var escolhidos = lista.length - faltam.length;
      var botao;
      if (faltam.length) botao = { acao: 'bloqueado', rotulo: t('JF-2-19'), motivo: t('JF-2-35', { n: faltam.length }) };
      else if (bloq.length) botao = { acao: 'bloqueado', rotulo: t('JF-2-19'), motivo: bloq[0].bloqueio.texto };
      else if (facial === 'antes' && pend.length) {
        var aqui = pend.filter(function (x) { return x.podeAqui; });
        if (aqui.length) botao = { acao: 'cadastrar', rotulo: t('JF-F-01-btn'), motivo: t('JF-2-36', { n: pend.length }) };
        else botao = { acao: 'bloqueado', rotulo: t('JF-2-19'), motivo: t('JF-2-10', { Nome: pend[0].pessoa.nome }) };
      } else botao = { acao: 'pagar', rotulo: t('JF-2-19'), motivo: '' };
      return { lista: lista, resumo: {
        total: lista.length, escolhidos: escolhidos, ok: botao.acao === 'pagar',
        pendencias: pend.map(function (x) { return { n: x.n, pessoaId: x.pessoa.id, nome: x.pessoa.nome, tipo: x.pessoa.tipo, podeAqui: x.podeAqui }; }),
        bloqueios: bloq.map(function (x) { return { n: x.n, id: x.bloqueio.id, texto: x.bloqueio.texto }; }),
        botao: botao } };
    }

    /* ---- marcação ---- */
    function tituloIng(i) {
      var g = ingressos[i] || {}, v = { n: st[i].n, setor: g.setor || '', fileira: g.fileira || '', assento: g.assento || '', tipo: g.tipo || '' };
      return g.fileira ? t('JF-2-03a', v) : t('JF-2-03b', v);
    }
    function painelEu(s, a) {
      var p = a.pessoa;
      return cartaoHtml(p, { modo: 'estatico', facial: facial, semSelo: true }) + (facial === 'nao' ? '' : R.cartaoEstadoHtml({ estado: p.rosto, nome: p.nome, tipo: 'eu', id: p.id }));
    }
    function painelOutra(s, a, i) {
      var p = a.pessoa, h = '', idc = 'jf-' + seq + '-c-' + i, ide = idc + '-e', ida = idc + '-a';
      h += '<div class="field jf-busca-campo" data-err="' + (s.buscaErro ? 'true' : 'false') + '"><label for="' + idc + '">' + esc(t('JF-2-07')) + '</label>' +
        '<div class="jf-busca"><input id="' + idc + '" data-foco="busca-' + i + '" type="text" inputmode="email" autocomplete="off" value="' + esc(s.busca) + '" aria-describedby="' + ida + (s.buscaErro ? ' ' + ide : '') + '"' + (s.buscaErro ? ' aria-invalid="true"' : '') + '>' +
        '<button type="button" class="bs" data-jf-acao="buscar" data-i="' + i + '" data-foco="buscar-' + i + '">' + esc(t('JF-N-buscar')) + '</button></div>' +
        '<span class="jf-qv-ajuda" id="' + ida + '">' + esc(t('JF-2-08')) + '</span><span class="err" id="' + ide + '" aria-live="polite">' + esc(s.buscaErro) + '</span></div>';
      if (p) {
        var chave = p.semConta ? 'falta' : (p.rosto === 'cadastrado' ? 'cadastrado' : (p.convite ? 'convite' : 'falta'));
        h += '<div class="jf-qv-resultado">' + cartaoHtml({ id: p.id, nome: p.nome, tipo: 'outra', contato: p.contato, rosto: p.rosto, iniciais: iniciais(p.nome) }, { modo: 'estatico', facial: facial === 'nao' ? 'nao' : 'antes', semSelo: true });
        if (facial !== 'nao') h += R.cartaoEstadoHtml({ estado: chave, nome: p.nome, tipo: 'outra', id: 'c:' + p.contato, semConta: p.semConta, acao: chave !== 'cadastrado' });
        if (s.link) h += '<div class="jf-linkbox"><label for="jf-' + seq + '-l-' + i + '">' + esc(t('JF-N-link-rotulo')) + '</label><input id="jf-' + seq + '-l-' + i + '" class="jf-link" data-foco="link-' + i + '" readonly value="' + esc(s.link) + '"></div>';
        h += '<button type="button" class="linkbtn" data-jf-acao="trocar" data-i="' + i + '" data-foco="trocar-' + i + '">' + esc(t('JF-2-37')) + '</button></div>';
      }
      return h;
    }
    function painelDep(s, a, i) {
      var els = elegiveis(regras, o.jogo, { atribuidos: atribuidosAte(i, false), atual: s.n, jaTem: jaTemDep() });
      var h = '<div class="jf-pessoas-bloco"><p class="jf-sub" id="jf-' + seq + '-d-' + i + '">' + esc(t('JF-2-14')) + '</p>';
      if (!els.length) {
        h += '<div class="uui-alert"><span class="uui-alert__icon">' + svg(ICO.alerta) + '</span><div class="uui-alert__body"><p class="uui-alert__text">' + esc(t('JF-2-21')) + '</p></div></div>';
      } else {
        var algum = els.some(function (x) { return x.id === s.depId; }), primeiroOk = !algum ? els.filter(function (x) { return x.ok; })[0] : null;
        h += '<div class="jf-pessoas" role="radiogroup" aria-labelledby="jf-' + seq + '-d-' + i + '" data-i="' + i + '">' + els.map(function (x) {
          var sel = x.id === s.depId, tab = sel ? 0 : (primeiroOk && primeiroOk.id === x.id ? 0 : -1);
          return cartaoHtml({ id: x.id, nome: x.nome, tipo: 'dependente', idade: x.idade, rosto: x.rosto }, { selecionado: sel, desabilitado: !x.ok && !sel, motivo: !x.ok && !sel ? x.motivo : '', tabindex: tab, facial: facial === 'nao' || !regras.exigeRosto ? 'nao' : 'antes' });
        }).join('') + '</div>';
      }
      h += '<div class="jf-links"><button type="button" class="linkbtn" data-jf-acao="adicionar-dep" data-i="' + i + '" data-foco="add-' + i + '">' + esc(t('JF-2-16')) + '</button>' +
        '<button type="button" class="linkbtn" data-jf-acao="gerenciar-dep" data-i="' + i + '" data-foco="ger-' + i + '">' + esc(t('JF-2-17')) + '</button></div>';
      if (a.pessoa && facial !== 'nao' && regras.exigeRosto) h += R.cartaoEstadoHtml({ estado: a.pessoa.rosto, nome: a.pessoa.nome, tipo: 'dependente', id: a.pessoa.id });
      return h + '</div>';
    }
    function alertaBloqueio(s, a, i) {
      if (!a.bloqueio) { s.bloqueioDito = ''; return ''; }
      var novo = s.bloqueioDito !== a.bloqueio.texto; s.bloqueioDito = a.bloqueio.texto;
      return '<div class="uui-alert uui-alert--error jf-bloqueio"' + (novo ? ' role="alert"' : '') + ' data-bloqueio="' + esc(a.bloqueio.id) + '"><span class="uui-alert__icon">' + svg(ICO.erro) + '</span><div class="uui-alert__body"><p class="uui-alert__text">' + esc(a.bloqueio.texto) + '</p>' +
        (a.bloqueio.acao === 'responsavel' ? '<div class="uui-alert__actions"><button type="button" class="bs bs-sm" data-jf-acao="responsavel" data-i="' + i + '">' + esc(t('JF-E-15-btn')) + '</button></div>' : '') + '</div></div>';
    }
    function ingressoHtml(s, a, i) {
      var idh = 'jf-' + seq + '-h-' + i, idc = 'jf-' + seq + '-b-' + i;
      var chave = a.faltaTitular || a.bloqueio ? 'titular' : (a.faltaRosto ? 'rosto' : 'ok');
      var selo = chave === 'ok' ? '<span class="tag jf-selo" data-sit="venda">' + svg(ICO.check, 'uui-ico sit-ico') + esc(t('JF-N-completo')) + '</span>'
        : chave === 'rosto' ? '<span class="tag jf-selo" data-sit="rosto-falta">' + svg(ICO.alerta, 'uui-ico sit-ico') + esc(t('JF-N-falta-rosto')) + '</span>'
        : '<span class="tag jf-selo" data-sit="adiado">' + svg(ICO.alerta, 'uui-ico sit-ico') + esc(t('JF-N-falta-titular')) + '</span>';
      var ops = [['eu', 'JF-2-05a'], ['outra', 'JF-2-05b'], ['dependente', 'JF-2-05c']].filter(function (x) { return x[0] !== 'dependente' || regras.permitido; });
      var eu0 = st.some(function (x, j) { return j !== i && x.modo === 'eu'; }), euBloq = jaTemEu() || eu0;
      var euMotivo = jaTemEu() ? t('JF-E-20', { Nome: contaNome() }) : (eu0 ? t('JF-N-eu-dup') : '');
      var radios = ops.map(function (x) {
        var dis = x[0] === 'eu' && euBloq && s.modo !== 'eu', idr = 'jf-' + seq + '-r-' + i + '-' + x[0];
        return '<label class="fac jf-op"' + (dis ? ' data-desabilitado="true"' : '') + '><input type="radio" name="jf-' + seq + '-q-' + i + '" id="' + idr + '" value="' + x[0] + '" data-i="' + i + '" data-foco="q-' + i + '-' + x[0] + '"' + (s.modo === x[0] ? ' checked' : '') + (dis ? ' aria-disabled="true" aria-describedby="' + idr + '-m"' : '') + '> <span>' + esc(t(x[1])) + '</span>' +
          (dis ? '<small class="jf-op__motivo" id="' + idr + '-m">' + esc(euMotivo) + '</small>' : '') + '</label>';
      }).join('');
      var corpo = '<fieldset class="jf-titular"><legend>' + esc(t('JF-2-04')) + '</legend><div class="jf-titular__ops">' + radios + '</div></fieldset>';
      if (s.modo === 'eu') corpo += '<div class="jf-qv-painel" data-modo="eu">' + painelEu(s, a) + '</div>';
      else if (s.modo === 'outra') corpo += '<div class="jf-qv-painel" data-modo="outra">' + painelOutra(s, a, i) + '</div>';
      else if (s.modo === 'dependente') corpo += '<div class="jf-qv-painel" data-modo="dependente">' + painelDep(s, a, i) + '</div>';
      corpo += alertaBloqueio(s, a, i);
      return '<section class="card jf-qvi" data-n="' + s.n + '" data-i="' + i + '" data-estado="' + chave + '" data-aberto="' + !!s.aberto + '" aria-labelledby="' + idh + '">' +
        '<h2 class="jf-qvi__h" id="' + idh + '"><button type="button" class="jf-qvi__cab" aria-expanded="' + !!s.aberto + '" aria-controls="' + idc + '" data-jf-acao="alternar" data-i="' + i + '" data-foco="cab-' + i + '">' +
        '<span class="jf-qvi__t">' + esc(tituloIng(i)) + '</span>' + selo + svg('m6 9 6 6 6-6', 'ico jf-qvi__seta') + '</button></h2>' +
        '<div class="acd jf-qvi__acd" id="' + idc + '" role="group" aria-labelledby="' + idh + '" data-aberto="' + !!s.aberto + '"' + (s.aberto ? '' : ' inert') + '><div class="acd__in"><div class="jf-qvi__corpo">' + corpo + '</div></div></div></section>';
    }

    var raiz = document.createElement('div'); raiz.className = 'jf-qv'; raiz.setAttribute('data-facial', facial);
    var contagem = document.createElement('p'); contagem.className = 'jf-contagem'; contagem.setAttribute('role', 'status'); contagem.setAttribute('aria-live', 'polite');
    var area = document.createElement('div'); area.className = 'jf-qv__area';
    raiz.appendChild(contagem); raiz.appendChild(area);
    el.textContent = ''; el.appendChild(raiz);
    var ultimaContagem = '', ultimoResumo = null;

    function desenhar(foco) {
      if (!vivo) return;
      var ativo = document.activeElement, chave = foco || (ativo && raiz.contains(ativo) ? ativo.getAttribute('data-foco') : null);
      var av = avaliar(), r = av.resumo;
      // os incompletos com erro abrem sozinhos
      av.lista.forEach(function (a, i) { if (a.bloqueio && !st[i].aberto) st[i].aberto = true; });
      var h = '';
      if (facial === 'antes' && r.pendencias.length) {
        var aqui = r.pendencias.some(function (x) { return x.podeAqui; });
        h += '<div class="uui-alert uui-alert--warning jf-faixa"><span class="uui-alert__icon">' + svg(ICO.alerta) + '</span><div class="uui-alert__body"><p class="uui-alert__text">' + esc(t('JF-2-36', { n: r.pendencias.length })) + '</p>' +
          (aqui ? '<div class="uui-alert__actions"><button type="button" class="bs bs-sm" data-jf-acao="cadastrar-pendentes" data-foco="faixa">' + esc(t('JF-F-01-btn')) + '</button></div>' : '') + '</div></div>';
      }
      h += '<div class="jf-qv-ingressos">' + av.lista.map(function (a, i) { return ingressoHtml(st[i], a, i); }).join('') + '</div>';
      area.innerHTML = h;
      var txt = t('JF-2-18', { n: r.escolhidos, total: r.total });
      if (txt !== ultimaContagem) { contagem.textContent = txt; ultimaContagem = txt; }
      if (chave) { var alvo = raiz.querySelector('[data-foco="' + chave + '"]'); if (alvo) alvo.focus({ preventScroll: true }); }
      var texto = JSON.stringify(r);
      if (texto !== ultimoResumo) { ultimoResumo = texto; avisar(av); }
      var linkIn = raiz.querySelector('.jf-link'); if (linkIn && linkIn.getAttribute('data-sel') !== '1') { linkIn.setAttribute('data-sel', '1'); try { linkIn.focus(); linkIn.select(); } catch (e) {} }
    }
    function titularesDe(av) {
      return av.lista.map(function (a, i) {
        var p = a.pessoa;
        return { n: a.n, tipo: st[i].modo, pessoaId: p ? p.id : null, nome: p ? p.nome : '', contato: p && p.contato || null, rosto: p ? p.rosto : null, ok: a.completo, completo: a.completo, motivo: a.bloqueio ? a.bloqueio.texto : (a.faltaTitular ? t('JF-2-35', { n: 1 }) : '') };
      });
    }
    function avisar(av) {
      av = av || avaliar();
      var tit = titularesDe(av);
      try { document.dispatchEvent(new CustomEvent('jf:titulares', { detail: { titulares: tit, resumo: av.resumo } })); } catch (e) {}
      if (o.aoMudar) o.aoMudar(tit, av.resumo);
    }

    /* ---- ações ---- */
    function pessoaParaFolha(p) { return { id: p.id, nome: p.nome, tipo: p.tipo, idade: p.idade }; }
    function cadastrarRosto(p, gatilho) {
      if (o.aoCadastrarRosto) o.aoCadastrarRosto(p);
      R.abrir({ pessoa: pessoaParaFolha(p), gatilho: gatilho, facial: facial, clube: (o.jogo && o.jogo.mandante) || (window.IngresseJornadaFutebol && window.IngresseJornadaFutebol.jogo && (window.IngresseJornadaFutebol.jogo() || {}).mandante) || '', prazo: o.prazo,
        aoFechar: function () { desenhar(); } });
    }
    function buscar(i) {
      var s = st[i], campo = raiz.querySelector('#jf-' + seq + '-c-' + i);
      s.busca = campo ? campo.value : s.busca;
      var c = normalizaContato(s.busca);
      s.link = '';
      if (c.erro) { s.buscaErro = c.erro === 'vazio' ? t('JF-N-busca-vazia') : t('JF-N-busca-invalida'); s.contato = null; desenhar('busca-' + i); return; }
      if (c.contato === contaEmail) { s.buscaErro = t('JF-N-proprio'); s.contato = null; desenhar('busca-' + i); return; }
      var cv = R.conta(); if (!cv.convidados[c.contato]) { var r0 = resolveContato(c); cv.convidados[c.contato] = { conta: true, nome: r0.nome, rosto: 'cadastrado' }; R._guardar(cv); }
      s.buscaErro = ''; s.contato = c.contato; s.busca = s.busca.trim();
      desenhar('trocar-' + i);
    }
    function copiarLink(i, gatilho) {
      var s = st[i], p = pessoaDe(s); if (!p) return;
      var link = linkDoConvite(s.contato), nome = p.nome;
      function marcarConvite() { var cv = R.conta(); cv.convidados[s.contato] = Object.assign({}, cv.convidados[s.contato], { convite: true }); R._guardar(cv); }
      function ok() { marcarConvite(); s.link = ''; toast(t('JF-2-12', { Nome: nome }), 'ok'); desenhar('trocar-' + i); }
      function falha() { marcarConvite(); s.link = link; toast(t('JF-2-12', { Nome: nome }), 'ok'); desenhar('link-' + i); }
      if (p.semConta) { /* sem conta: o link serve para criar a conta e cadastrar o rosto; o mesmo caminho */ }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(ok, falha); else falha();
      } catch (e) { falha(); }
      void gatilho;
    }
    function escolherModo(i, modo) {
      var s = st[i]; if (s.modo === modo) return;
      s.modo = modo; s.buscaErro = '';
      if (modo !== 'dependente') s.depId = null;
      if (modo !== 'outra') { s.contato = null; s.link = ''; }
      desenhar('q-' + i + '-' + modo);
    }
    function escolherDep(i, id) { st[i].depId = id; desenhar('dep-' + id); }

    function clique(e) {
      var b = e.target.closest && e.target.closest('[data-jf-acao],.jf-pessoa[role="radio"]');
      if (!b || !raiz.contains(b)) return;
      if (b.matches('.jf-pessoa[role="radio"]')) {
        if (b.getAttribute('aria-disabled') === 'true') return;
        escolherDep(+b.closest('.jf-pessoas').getAttribute('data-i'), b.getAttribute('data-id')); return;
      }
      var a = b.getAttribute('data-jf-acao'), i = +b.getAttribute('data-i');
      if (a === 'alternar') {
        var sec = b.closest('.jf-qvi'), aberto = b.getAttribute('aria-expanded') !== 'true', acd = sec.querySelector('.acd');
        st[i].aberto = aberto; b.setAttribute('aria-expanded', String(aberto)); sec.setAttribute('data-aberto', String(aberto)); acd.setAttribute('data-aberto', String(aberto));
        if (aberto) acd.removeAttribute('inert'); else acd.setAttribute('inert', '');
      } else if (a === 'buscar') buscar(i);
      else if (a === 'trocar') { st[i].contato = null; st[i].busca = ''; st[i].link = ''; st[i].buscaErro = ''; desenhar('busca-' + i); }
      else if (a === 'adicionar-dep') abrirCadastro({ gatilho: b, regras: regras, jogo: o.jogo, aoSalvar: function (dep) { st[i].depId = dep.id; desenhar('dep-' + dep.id); } });
      else if (a === 'gerenciar-dep') abrirGerenciar({ gatilho: b, regras: regras, jogo: o.jogo, facial: facial, emUso: function (id) { return st.some(function (x) { return x.modo === 'dependente' && x.depId === id; }); }, aoMudar: function () { desenhar(); } });
      else if (a === 'cadastrar-pendentes') ctrl.cadastrarPendentes(b);
      else if (a === 'responsavel') {
        var ing = ingressos[i] || {};
        try { document.dispatchEvent(new CustomEvent('jf:responsavel', { detail: { n: st[i].n, setorId: ing.setorId } })); } catch (er) {}
        if (o.aoResponsavel) o.aoResponsavel({ n: st[i].n, setorId: ing.setorId });
      } else if (a === 'cadastrar') {
        var p = pessoaDe(st[+b.closest('.jf-qvi').getAttribute('data-i')]);
        if (p) cadastrarRosto(p, b);
      } else if (a === 'link') copiarLink(+b.closest('.jf-qvi').getAttribute('data-i'), b);
    }
    function muda(e) {
      var r = e.target; if (!r.matches || !r.matches('.jf-titular input[type="radio"]')) return;
      if (r.getAttribute('aria-disabled') === 'true') { desenhar(); return; }
      escolherModo(+r.getAttribute('data-i'), r.value);
    }
    function tecla(e) {
      var campo = e.target.closest && e.target.closest('.jf-busca input');
      if (campo && e.key === 'Enter') { e.preventDefault(); buscar(+campo.id.split('-').pop()); return; }
      var rd = e.target.closest && e.target.closest('.jf-pessoa[role="radio"]');
      if (!rd) return;
      var grupo = rd.closest('.jf-pessoas'), itens = [].slice.call(grupo.querySelectorAll('.jf-pessoa[role="radio"]')), k = itens.indexOf(rd), n = k;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (k + 1) % itens.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (k - 1 + itens.length) % itens.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = itens.length - 1; else return;
      e.preventDefault();
      itens[n].focus();
      if (itens[n].getAttribute('aria-disabled') !== 'true') itens[n].click();
    }
    function aoRosto() { desenhar(); }
    raiz.addEventListener('click', clique); raiz.addEventListener('change', muda); raiz.addEventListener('keydown', tecla);
    R.on(aoRosto);

    var ctrl = {
      el: raiz,
      atualizar: function (n) {
        if (n && n.ingressos) {
          ingressos = n.ingressos.slice();
          var velho = st; st = ingressos.map(function (x, i) { var s = velho[i] || novo(i); s.n = x.n || i + 1; return s; });
        }
        desenhar();
      },
      titulares: function () { return titularesDe(avaliar()); },
      resumo: function () { return avaliar().resumo; },
      cadastrarPendentes: function (gatilho) {
        var av = avaliar(), a = av.lista.filter(function (x) { return x.faltaRosto && !x.bloqueio && x.podeAqui; })[0];
        if (!a) return null;
        st[a.i].aberto = true; desenhar();
        return cadastrarRosto(a.pessoa, gatilho || raiz.querySelector('[data-jf-acao="cadastrar-pendentes"]'));
      },
      abrirIngresso: function (n) {
        var i = st.findIndex(function (s) { return s.n === n; }); if (i < 0) return;
        st[i].aberto = true; desenhar('cab-' + i);
        var sec = raiz.querySelectorAll('.jf-qvi')[i]; if (sec && window.IX && window.IX.revelar) window.IX.revelar(sec, { espera: 0 }); // previa.js, seção 2b
      },
      destruir: function () { vivo = false; R.off(aoRosto); raiz.removeEventListener('click', clique); raiz.removeEventListener('change', muda); raiz.removeEventListener('keydown', tecla); el.textContent = ''; }
    };
    desenhar();
    Promise.resolve().then(function () { if (vivo && o.aoMudar) { var av = avaliar(); o.aoMudar(titularesDe(av), av.resumo); } });
    return ctrl;
  }

  window.IngresseDependentes = { versao: '1.0', listar: listar, elegiveis: elegiveis, adicionar: adicionar, remover: remover, abrirCadastro: abrirCadastro, abrirGerenciar: abrirGerenciar, cartaoHtml: cartaoHtml, montar: montar, idadeEm: idadeEm, regrasDe: regrasDe, normalizaContato: normalizaContato };
})();
