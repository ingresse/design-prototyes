import { agoraIsoLocal, CAMPO } from "./campos";
import { regrasDe, vagasDaCategoria } from "./modelos";
import { MSG } from "./opcoes";
import { idsDasCategorias, precisaDefinirEstoque, temOpcoes } from "./perguntas";
import type { Categoria, Pendencia, Pergunta, Rascunho, SecaoId } from "./tipos";
import type { Vocabulario } from "./vocabulario";

/* ------------------------------------------------------------------ */
/*  Validação (SCE-20 a SCE-39)                                        */
/*  Uma lista de pendências serve aos dois usos: o erro de cada campo  */
/*  (HintText) e a lista "Falta para abrir as inscrições" (RN-06).     */
/* ------------------------------------------------------------------ */

const vazio = (s: string) => s.trim() === "";
const chave = (s: string) => s.trim().toLowerCase();
const nomeOu = (s: string, padrao: string) => (vazio(s) ? padrao : s.trim());

export function validar(r: Rascunho, t: Vocabulario): Pendencia[] {
    const p: Pendencia[] = [];
    const agora = agoraIsoLocal();
    const add = (secao: SecaoId, campo: string, texto: string, extra: Partial<Pendencia> = {}) => p.push({ secao, campo, texto, ...extra });

    /* 1. Evento */
    if (vazio(r.nome)) add("evento", CAMPO.nome, MSG.nomeDoEvento);
    if (!r.esporte) add("evento", CAMPO.esporte, MSG.esporte);
    if (!r.largada) add("evento", CAMPO.largada, MSG.dataInvalida);
    else if (r.largada <= agora) add("evento", CAMPO.largada, MSG.dataPassada);
    // v0.10 (SCE-206): descrição de até 30.000 caracteres (contados sem as marcações).
    if (r.descricao && r.descricao.replace(/<[^>]*>/g, "").length > 30000) add("evento", CAMPO.descricao, MSG.descricaoLonga);
    // v0.9 (SCE-200): término da prova, depois da largada.
    if (!r.termino) add("evento", CAMPO.termino, MSG.terminoVazio);
    else if (r.largada && r.termino <= r.largada) add("evento", CAMPO.termino, MSG.terminoAntes);
    const idadeDoEvento = Number(r.idadeMinima) || 0;
    if (!r.local) add("evento", CAMPO.local, MSG.localVazio);
    // v0.19 (SCE-238): regras da inscrição do evento.
    const regras = regrasDe(r);
    // v0.20 (SCE-242): inscrição única por atleta e sem compra para outro atleta: o limite só pode ser 1.
    const limiteUnico = !regras.variasPorCpf && regras.atribuicao === "comprador";
    if (!(regras.limitePorComprador && regras.limitePorComprador >= 1)) add("evento", CAMPO.limitePorComprador, MSG.limiteDoEvento);
    else if (limiteUnico && regras.limitePorComprador > 1) add("evento", CAMPO.limitePorComprador, MSG.limiteUnico);
    // v0.20 (SCE-241): período da troca de titularidade, dentro do evento (futuro e até a largada).
    if (regras.trocaDeTitularidade) {
        if (!regras.trocaInicio) add("evento", CAMPO.trocaInicio, MSG.trocaInicioVazio);
        else if (regras.trocaInicio <= agora) add("evento", CAMPO.trocaInicio, MSG.dataPassada);
        if (!regras.trocaFim) add("evento", CAMPO.trocaFim, MSG.trocaFimVazio);
        else if (regras.trocaInicio && regras.trocaFim <= regras.trocaInicio) add("evento", CAMPO.trocaFim, MSG.trocaFimAntes);
        else if (r.largada && regras.trocaFim > r.largada) add("evento", CAMPO.trocaFim, MSG.trocaDepoisDaLargada);
    }
    // Imagem é opcional: não entra nas pendências de publicar (SCE-14).

    /* 2. Modalidades e categorias (RN-01) */
    if (r.modalidades.length === 0) add("modalidades", CAMPO.modalidades, t.msgSemNivel1);
    const nomesDeModalidade = new Set<string>();
    for (const m of r.modalidades) {
        const mod = vazio(m.nome) ? t.nivel1SemNome : t.contextoNivel1(m.nome.trim());
        if (vazio(m.nome)) add("modalidades", CAMPO.modNome(m.id), t.msgNomeNivel1, { contexto: mod });
        else if (nomesDeModalidade.has(chave(m.nome))) add("modalidades", CAMPO.modNome(m.id), t.msgNivel1Repetida, { contexto: mod });
        nomesDeModalidade.add(chave(m.nome));
        if (!m.tipo) add("modalidades", CAMPO.modTipo(m.id), t.msgTipoNivel1, { contexto: mod });
        if (!(m.vagas && m.vagas > 0)) add("modalidades", CAMPO.modVagas(m.id), m.vagas == null ? MSG.vagasDaModalidade : MSG.maiorQueZero, { contexto: `${mod}, vagas` });
        if (m.categorias.length === 0) add("modalidades", CAMPO.modCategorias(m.id), t.msgSemNivel2, { contexto: mod });

        const nomesDeCategoria = new Set<string>();
        for (const c of m.categorias) {
            const ctx = t.contextoNivel2(nomeOu(m.nome, t.nivel1SemNome), nomeOu(c.nome, "sem nome"));
            const cat = { contexto: ctx, categoria: { modalidadeId: m.id, categoriaId: c.id } };
            if (vazio(c.nome)) add("modalidades", CAMPO.catNome(c.id), t.msgNomeNivel2, cat);
            else if (nomesDeCategoria.has(chave(c.nome))) add("modalidades", CAMPO.catNome(c.id), t.msgNivel2Repetida, cat);
            nomesDeCategoria.add(chave(c.nome));
            if (c.idadeMin != null && c.idadeMax != null && c.idadeMin > c.idadeMax) add("modalidades", CAMPO.catIdade(c.id), MSG.faixaEtaria, cat);
            // v0.9 (SCE-201): a faixa da categoria respeita a idade mínima do evento (sem faixa, vale a do evento).
            else if (idadeDoEvento > 0 && ((c.idadeMin != null && c.idadeMin < idadeDoEvento) || (c.idadeMax != null && c.idadeMax < idadeDoEvento)))
                add("modalidades", CAMPO.catIdade(c.id), MSG.idadeAbaixoDoEvento(idadeDoEvento), cat);
            // v0.21 (SCE-243): sem campo de vagas na categoria; as vagas são a soma dos lotes (cada lote já exige quantidade).
            // v0.19 (SCE-239): limite próprio da categoria é opcional; o do evento é o teto.
            if (c.limiteComprador != null) {
                if (!(c.limiteComprador >= 1)) add("modalidades", CAMPO.catMaximo(c.id), MSG.umOuMais, { ...cat, contexto: `${ctx}, limite por comprador` });
                else if (regras.limitePorComprador && c.limiteComprador > regras.limitePorComprador)
                    add("modalidades", CAMPO.catMaximo(c.id), MSG.limiteAcimaDoEvento(regras.limitePorComprador), { ...cat, contexto: `${ctx}, limite por comprador` });
            }
            if (c.lotes.length === 0) add("modalidades", CAMPO.catLotes(c.id), t.msgSemLote, cat);
            if (c.pcd && !r.formularioParticipacao) add("modalidades", `campo-cat-${c.id}-pcd`, MSG.formularioPcdInativo, cat);
            for (const l of c.lotes) {
                const lote = { ...cat, contexto: `${ctx}, ${nomeOu(l.nome, "lote sem nome")}` };
                if (vazio(l.nome)) add("modalidades", CAMPO.loteNome(l.id), MSG.nomeDoLote, lote);
                if (l.valor == null || Number.isNaN(l.valor) || l.valor < 0) add("modalidades", CAMPO.loteValor(l.id), MSG.valorInvalido, lote);
                if (!(l.vagas && l.vagas > 0)) add("modalidades", CAMPO.loteVagas(l.id), MSG.maiorQueZero, { ...lote, contexto: `${lote.contexto}, vagas` });
                if (l.dataLimite && l.dataLimite <= agora) add("modalidades", CAMPO.loteLimite(l.id), MSG.dataLimitePassada, lote);
            }
        }
    }

    /* 3. Formulário de inscrição */
    const existentes = new Set(idsDasCategorias(r.modalidades));
    for (const q of r.perguntas) {
        const ctx = { contexto: `Pergunta ${nomeOu(q.titulo, "sem título")}`, pergunta: q.id };
        if (vazio(q.titulo)) add("inscricao", CAMPO.perguntaTexto(q.id), MSG.textoDaPergunta, ctx);
        if (temOpcoes(q.tipo)) {
            if (q.opcoes.length === 0) add("inscricao", CAMPO.perguntaOpcoes(q.id), MSG.semOpcao, ctx);
            for (const o of q.opcoes) if (vazio(o.nome)) add("inscricao", CAMPO.opcaoNome(o.id), MSG.opcaoVazia, ctx);
            // Bloqueante só isto: obrigatória em alguma categoria com todas as opções esgotadas (SCE-111).
            const obrigatoria = Object.entries(q.vinculos).some(([c, v]) => existentes.has(c) && v === "obrigatoria");
            if (obrigatoria && q.opcoes.length > 0 && q.opcoes.every((o) => o.quantidade === 0)) add("inscricao", CAMPO.perguntaOpcoes(q.id), MSG.opcoesEsgotadas, ctx);
        }
    }

    return p;
}

/** Primeiro erro de cada campo, para o HintText. */
export const errosPorCampo = (pendencias: Pendencia[]) => {
    const e: Record<string, string> = {};
    for (const p of pendencias) e[p.campo] ??= p.texto;
    return e;
};

export const pendenciasDaSecao = (pendencias: Pendencia[], secao: SecaoId) => pendencias.filter((p) => p.secao === secao);

/** Pendências de uma categoria (para o selo na linha da categoria). */
export const pendenciasDaCategoria = (pendencias: Pendencia[], categoriaId: string) => pendencias.filter((p) => p.categoria?.categoriaId === categoriaId);

/* ------------------------------------------------------------------ */
/*  Avisos: não impedem publicar (SCE-112, RN-12)                      */
/* ------------------------------------------------------------------ */

const ehNumero = (v: number | null) => v != null && !Number.isNaN(v);

/** RN-12: o nome da categoria sugere uma regra que não está configurada. */
export function regraSugerida(c: Categoria): { tipo: "idade" | "sexo" | "pcd"; idadeMin?: number; idadeMax?: number; sexo?: "feminino" | "masculino" } | null {
    const nome = c.nome.toLowerCase();
    const semFaixa = c.idadeMin == null && c.idadeMax == null;
    if (semFaixa) {
        const mais = /(\d{1,2})\s*\+|\+\s*(\d{1,2})|(\d{1,2})\s*anos\s*ou\s*mais/.exec(nome);
        if (mais) return { tipo: "idade", idadeMin: Number(mais[1] ?? mais[2] ?? mais[3]) };
        const faixa = /(\d{1,2})\s*(?:a|-|–|até)\s*(\d{1,2})/.exec(nome);
        if (faixa) return Number(faixa[1]) <= Number(faixa[2]) ? { tipo: "idade", idadeMin: Number(faixa[1]), idadeMax: Number(faixa[2]) } : { tipo: "idade" };
        const ate = /até\s*(\d{1,2})/.exec(nome);
        if (ate) return { tipo: "idade", idadeMax: Number(ate[1]) };
        if (/idos|\banos\b|master|sênior|senior/.test(nome)) return { tipo: "idade" };
    }
    if (c.sexo === "todos") {
        if (/feminin|mulher/.test(nome)) return { tipo: "sexo", sexo: "feminino" };
        if (/masculin|homem|homens/.test(nome)) return { tipo: "sexo", sexo: "masculino" };
    }
    // v0.18 (SCE-236): PCD é regra de quem pode se inscrever (lista aprovada pelo formulário de participação).
    if (/\bpcd\b|deficien/.test(nome) && !c.pcd) return { tipo: "pcd" };
    return null;
}

export const textoDaRegraSugerida = (t: Vocabulario, regra: NonNullable<ReturnType<typeof regraSugerida>>) =>
    regra.tipo === "idade" ? t.alertaIdade : regra.tipo === "sexo" ? t.alertaSexo(regra.sexo!) : t.alertaPcd;

/** Quantas inscrições cabem nas categorias em que a pergunta aparece (Infinity = sem limite). */
const capacidade = (r: Rascunho, q: Pergunta) => {
    let total = 0;
    for (const m of r.modalidades) {
        const ligadas = m.categorias.filter((c) => q.vinculos[c.id]);
        if (!ligadas.length) continue;
        const somaCategorias = ligadas.reduce((s, c) => s + vagasDaCategoria(c), 0);
        const daModalidade = m.vagas ?? 0;
        total += Math.min(somaCategorias, daModalidade);
    }
    return total;
};

export function avisos(r: Rascunho, t: Vocabulario): Pendencia[] {
    const lista: Pendencia[] = [];
    for (const m of r.modalidades)
        for (const c of m.categorias) {
            const cat = { categoria: { modalidadeId: m.id, categoriaId: c.id }, contexto: t.contextoNivel2(nomeOu(m.nome, t.nivel1SemNome), nomeOu(c.nome, "sem nome")) };
            // v0.8 (SCE-191): lote copiado ou duplicado ainda não revisado.
            for (const l of c.lotes)
                if (l.revisar) lista.push({ secao: "modalidades", campo: CAMPO.loteNome(l.id), texto: MSG.loteARevisar, ajuste: true, ...cat, contexto: `${cat.contexto}, ${nomeOu(l.nome, "lote sem nome")}` });
            const regra = regraSugerida(c);
            if (regra) lista.push({ secao: "modalidades", campo: CAMPO.catNome(c.id), texto: textoDaRegraSugerida(t, regra), ...cat });
            if (r.perguntas.length > 0 && !r.perguntas.some((q) => q.vinculos[c.id])) lista.push({ secao: "inscricao", campo: CAMPO.catPerguntas(c.id), texto: t.avisoNivel2SemPergunta, ...cat });
        }
    const existentes = new Set(idsDasCategorias(r.modalidades));
    // v0.17 (SCE-227): formulário sem nenhuma pergunta é aviso (não impede publicar).
    if (r.perguntas.length === 0) lista.push({ secao: "inscricao", campo: "secao-inscricao", texto: t.avisoFormularioVazio });
    for (const q of r.perguntas) {
        const ctx = { contexto: `Pergunta ${nomeOu(q.titulo, "sem título")}`, pergunta: q.id };
        // v0.5 (SCE-172): estoque de opção que veio de outro evento pede revisão (não impede publicar).
        if (precisaDefinirEstoque(q)) lista.push({ secao: "inscricao", campo: CAMPO.perguntaOpcoes(q.id), texto: t.avisoRevisarQuantidade, ...ctx });
        if (existentes.size && !Object.keys(q.vinculos).some((c) => existentes.has(c)))
            lista.push({ secao: "inscricao", campo: CAMPO.perguntaVinculo(q.id), texto: t.avisoPerguntaSemVinculo, ...ctx });
        else if (temOpcoes(q.tipo) && q.opcoes.length && q.opcoes.every((o) => ehNumero(o.quantidade)) && q.opcoes.some((o) => (o.quantidade ?? 0) > 0)) {
            const soma = q.opcoes.reduce((s, o) => s + (o.quantidade ?? 0), 0);
            const cap = capacidade(r, q);
            if (cap === Infinity) lista.push({ secao: "inscricao", campo: CAMPO.perguntaOpcoes(q.id), texto: t.avisoQuantidadeSemLimite, ...ctx });
            else if (soma < cap) lista.push({ secao: "inscricao", campo: CAMPO.perguntaOpcoes(q.id), texto: t.avisoQuantidade(soma, cap), ...ctx });
        }
    }
    return lista;
}
