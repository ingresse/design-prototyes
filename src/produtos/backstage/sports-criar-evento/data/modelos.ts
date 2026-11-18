import { termoPadrao } from "./termos";
import type { Categoria, Lote, Modalidade, Rascunho, RegrasDaInscricao } from "./tipos";

/* Fábricas: cada item nasce com o padrão que reduz digitação (RN-01, RN-03). */

let seq = 0;
export const novoId = (prefixo: string) => `${prefixo}-${Date.now().toString(36)}${(seq++).toString(36)}`;

export const novoLote = (n = 1, parcial: Partial<Lote> = {}): Lote => ({
    id: novoId("lote"),
    nome: `${n}º lote`,
    valor: null,
    vagas: null,
    dataLimite: "",
    ...parcial,
});

/** Categoria nova já vem com um lote (RN-01) e com a idade calculada no final do ano do evento (RN-03). */
export const novaCategoria = (parcial: Partial<Categoria> = {}): Categoria => ({
    id: novoId("cat"),
    nome: "",
    descricao: "",
    sexo: "todos",
    idadeMin: null,
    idadeMax: null,
    idadeEm: "fim-do-ano",
    desconto: "nenhum",
    semLimite: true,
    vagas: null,
    transferencia: "sempre",
    atleta: "qualquer",
    maxPorPedido: 1,
    limiteComprador: null,
    lotes: [novoLote(1)],
    ...parcial,
});

/**
 * Modalidade nova nasce sem categorias (v0.4: a "Geral" automática da RN-10 saiu). Enquanto é rascunho, pode ficar
 * vazia; para publicar, precisa de ao menos uma categoria com lote (pendência, SCE-13).
 */
export const novaModalidade = (parcial: Partial<Modalidade> = {}): Modalidade => ({
    id: novoId("mod"),
    nome: "",
    tipo: "",
    vagas: null,
    descricao: "",
    categorias: [],
    ...parcial,
});

/** Cópia profunda de uma categoria com ids novos (duplicar). */
export const duplicarCategoria = (c: Categoria, nome?: string): Categoria => ({
    ...c,
    id: novoId("cat"),
    nome: nome ?? c.nome,
    lotes: c.lotes.map((l) => ({ ...l, id: novoId("lote") })),
    // Chaves de acesso e cupons são vínculos externos: não vão para a cópia (como no AWA).
    chavesDeAcesso: undefined,
    cupons: undefined,
});

export const duplicarModalidade = (m: Modalidade, nome?: string): Modalidade => ({
    ...m,
    id: novoId("mod"),
    nome: nome ?? m.nome,
    categorias: m.categorias.map((c) => duplicarCategoria(c)),
});

/** v0.8 (SCE-191): lotes copiados ou duplicados começam "a revisar". */
export const marcarLotesParaRevisar = (ms: Modalidade[]): Modalidade[] =>
    ms.map((m) => ({ ...m, categorias: m.categorias.map((c) => ({ ...c, lotes: c.lotes.map((l) => ({ ...l, revisar: true })) })) }));

/** "10 km" → "10 km (cópia)", "10 km (cópia 2)"… sem repetir um nome que já existe. */
export const nomeDeCopia = (nome: string, existentes: string[]) => {
    const base = nome.trim() || "Sem nome";
    const usados = new Set(existentes.map((n) => n.trim().toLowerCase()));
    let candidato = `${base} (cópia)`;
    for (let i = 2; usados.has(candidato.toLowerCase()); i++) candidato = `${base} (cópia ${i})`;
    return candidato;
};

/** v0.19 (SCE-238): padrões das regras da inscrição, os mais comuns no esporte. */
export const REGRAS_PADRAO: RegrasDaInscricao = { variasPorCpf: false, atribuicao: "qualquer", limitePorComprador: 3, trocaDeTitularidade: false, trocaInicio: "", trocaFim: "" };
export const regrasDe = (r: Pick<Rascunho, "regras">): RegrasDaInscricao => ({ ...REGRAS_PADRAO, ...r.regras });

/** v0.21 (SCE-243): as vagas da categoria são a soma das quantidades dos lotes. */
export const vagasDaCategoria = (c: Pick<Categoria, "lotes">) => c.lotes.reduce((s, l) => s + (l.vagas ?? 0), 0);

export const rascunhoVazio = (): Rascunho => ({
    origem: "zero",
    nome: "",
    esporte: "",
    largada: "",
    local: null,
    imagem: null,
    termino: "",
    idadeMinima: "0",
    percurso: null,
    // v0.11: o termo padrão da organização entra sozinho no evento novo (SCE-207).
    termoId: termoPadrao()?.id ?? null,
    regras: { ...REGRAS_PADRAO },
    descricao: "",
    modalidades: [],
    // Do zero o formulário começa vazio (v0.3): perguntas só na etapa Formulário de inscrição.
    perguntas: [],
    datasARevisar: [],
    salvoEm: null,
    publicado: false,
});
