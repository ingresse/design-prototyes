import { CATALOGO, type CategoriaCandidata } from "./categorias-catalogo";
import { lerColecao, lerDoc, salvar } from "./db";
import type { Categoria, CriacaoDeEvento } from "./modelo";
import { agora, novoId } from "./regras";

/* ------------------------------------------------------------------ */
/*  Categorias de show ou festa                                        */
/*                                                                     */
/*  A pessoa escreve com as próprias palavras que tipo de evento é.    */
/*  Esse texto, o nome, a descrição e a leitura do banner (feita pelo  */
/*  Claude, ver ia-local/plugin.ts) viram um vetor no modelo do        */
/*  Hugging Face, comparado com o catálogo longo de candidatas         */
/*  (categorias-catalogo.ts). Citar a categoria no texto reforça.      */
/*                                                                     */
/*  Formação: nos 2 primeiros meses de criação (contados da primeira), */
/*  vale o catálogo inteiro e cada candidata usada entra na lista do   */
/*  banco. Depois, só a lista vale: o que não cabe nela fica sem       */
/*  categoria, e essas criações mostram o que falta.                   */
/* ------------------------------------------------------------------ */

export const MODELO_EMBEDDING = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
/** Dias de formação da lista, a partir da primeira criação. */
export const DIAS_DE_FORMACAO = 60;
/** Similaridade mínima para o evento cair numa categoria. */
export const LIMIAR = 0.6;
/** Reforço quando o texto escrito cita a categoria pelo nome ou por um termo dela. */
const REFORCO_NOME = 0.15;
const REFORCO_TERMO = 0.1;
/** Peso de cada parte no vetor do evento. O texto escrito sobre o tipo é o que mais diz. */
const PESOS = { texto: 0.45, banner: 0.25, nome: 0.15, descricao: 0.15 };

/* ---------------- vetores ---------------- */

const cosseno = (a: number[], b: number[]) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
};

const normalizar = (v: number[]) => {
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extrator: Promise<any> | null = null;
const cacheDeVetores = new Map<string, number[]>();

/** Embedding de um texto, no navegador. O modelo baixa do Hugging Face na primeira vez e fica em cache. */
export async function vetorDe(texto: string): Promise<number[]> {
    const chave = texto.trim();
    const pronto = cacheDeVetores.get(chave);
    if (pronto) return pronto;
    extrator ??= import("@xenova/transformers").then(({ pipeline, env }) => {
        env.allowLocalModels = false;
        return pipeline("feature-extraction", MODELO_EMBEDDING);
    });
    // Falhou (sem rede, por exemplo): a próxima chamada tenta de novo.
    const ext = await extrator.catch((e) => {
        extrator = null;
        throw e;
    });
    const saida = await ext(chave, { pooling: "mean", normalize: true });
    const v = Array.from(saida.data as Float32Array);
    cacheDeVetores.set(chave, v);
    return v;
}

export interface DadosParaClassificar {
    texto: string;
    nome?: string;
    /** Descrição em texto puro. Só o começo entra (o modelo lê até umas 128 palavras). */
    descricao?: string;
    bannerDescricao?: string;
}

/** Vetor do evento: média ponderada das partes que existem. */
export async function vetorDoEvento(d: DadosParaClassificar): Promise<number[] | null> {
    const partes = (
        [
            [d.texto, PESOS.texto],
            [d.bannerDescricao, PESOS.banner],
            [d.nome, PESOS.nome],
            [d.descricao?.slice(0, 600), PESOS.descricao],
        ] as const
    ).filter(([t]) => t?.trim());
    if (!partes.length) return null;
    const vetores = await Promise.all(partes.map(async ([t, peso]) => ({ v: await vetorDe(t!), peso })));
    const soma = new Array<number>(vetores[0].v.length).fill(0);
    for (const { v, peso } of vetores) v.forEach((x, i) => (soma[i] += peso * x));
    return normalizar(soma);
}

/* ---------------- catálogo ---------------- */

let vetoresDoCatalogo: Promise<Map<string, number[]>> | null = null;

/** Vetores pré-calculados (ia-local/vetores-catalogo.mjs). Candidata nova ou mudada é calculada aqui. */
function carregarCatalogo() {
    vetoresDoCatalogo ??= import("./categorias-catalogo-vetores.json").then(async ({ default: arquivo }) => {
        const gravados = (arquivo as { vetores: Record<string, { assinatura: string; vetor: number[] }> }).vetores;
        const mapa = new Map<string, number[]>();
        for (const c of CATALOGO) {
            const textos = [c.nome, ...c.termos];
            const gravado = gravados[c.id];
            if (gravado?.assinatura === textos.join("|")) mapa.set(c.id, gravado.vetor);
            else {
                const vs = await Promise.all(textos.map(vetorDe));
                mapa.set(c.id, normalizar(vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0))));
            }
        }
        return mapa;
    });
    return vetoresDoCatalogo;
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const soPalavras = (t: string) => ` ${semAcento(t).replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Quanto o texto escrito cita a candidata: pelo nome vale mais que por um termo. */
function reforco(texto: string, c: CategoriaCandidata) {
    const escrito = soPalavras(texto);
    if (escrito.includes(soPalavras(c.nome))) return REFORCO_NOME;
    return c.termos.some((t) => escrito.includes(soPalavras(t))) ? REFORCO_TERMO : 0;
}

/* ---------------- formação ---------------- */

const DIA = 24 * 60 * 60 * 1000;

export interface Formacao {
    /** Primeira criação; sem ela, a formação ainda não começou. */
    inicio: string | null;
    fim: string | null;
    aberta: boolean;
}

export function formacaoDe(criacoes: Pick<CriacaoDeEvento, "criadoEm">[], hoje = new Date()): Formacao {
    const primeira = criacoes.map((c) => c.criadoEm).sort()[0];
    if (!primeira) return { inicio: null, fim: null, aberta: true };
    const fim = new Date(new Date(primeira).getTime() + DIA * DIAS_DE_FORMACAO).toISOString();
    return { inicio: primeira, fim, aberta: hoje.toISOString() < fim };
}

/* ---------------- classificação ---------------- */

export interface Classificacao {
    /** Categoria escolhida (passou do limiar e pode ser usada agora). */
    categoria: CategoriaCandidata | null;
    /** A mais parecida, mesmo sem passar ou fora da lista. */
    maisParecida: CategoriaCandidata | null;
    similaridade: number;
    /** A categoria escolhida ainda não está na lista do banco: entra quando o evento for criado. */
    novaNaLista: boolean;
    vetor: number[] | null;
}

/**
 * Compara o evento com o catálogo. Na formação vale o catálogo inteiro; depois, só as categorias da
 * lista do banco.
 */
export async function classificar(d: DadosParaClassificar): Promise<Classificacao> {
    const vetor = await vetorDoEvento(d);
    if (!vetor) return { categoria: null, maisParecida: null, similaridade: 0, novaNaLista: false, vetor: null };
    const catalogo = await carregarCatalogo();
    const naLista = new Set(lerColecao("categorias").map((c) => c.id));
    const { aberta } = formacaoDe(lerColecao("criacoes"));

    const notas = CATALOGO.map((c) => ({ c, nota: cosseno(vetor, catalogo.get(c.id)!) + reforco(d.texto, c) })).sort((a, b) => b.nota - a.nota);
    const melhor = notas[0];
    const valendo = notas.find((n) => aberta || naLista.has(n.c.id));
    const passou = valendo && valendo.nota >= LIMIAR ? valendo : null;
    return {
        categoria: passou?.c ?? null,
        maisParecida: melhor.c,
        similaridade: Math.min(1, (passou ?? melhor).nota),
        novaNaLista: !!passou && !naLista.has(passou.c.id),
        vetor,
    };
}

/* ---------------- gravação ---------------- */

const LIMITE_DE_AMOSTRAS = 5;

/**
 * Grava a criação e, se ela caiu numa categoria, põe a categoria na lista (ou atualiza contagem e
 * amostras). Chamado ao criar o evento.
 */
export async function registrarCriacao(dados: DadosParaClassificar & { eventoId: string; produtora: string; nome: string }, c: Classificacao) {
    const criadoEm = agora();
    const criacao: CriacaoDeEvento = {
        id: novoId("criacao"),
        eventoId: dados.eventoId,
        produtora: dados.produtora,
        nome: dados.nome,
        texto: dados.texto.trim(),
        descricao: dados.descricao || undefined,
        bannerDescricao: dados.bannerDescricao || undefined,
        vetor: c.vetor?.map((x) => Math.round(x * 1e4) / 1e4),
        categoriaId: c.categoria?.id,
        similaridade: Math.round(c.similaridade * 100) / 100,
        maisParecidaId: c.maisParecida?.id,
        criadoEm,
    };
    await salvar("criacoes", criacao);
    if (!c.categoria) return criacao;

    const atual = lerDoc("categorias", c.categoria.id);
    const categoria: Categoria = {
        id: c.categoria.id,
        nome: c.categoria.nome,
        grupo: c.categoria.grupo,
        criacoes: (atual?.criacoes ?? 0) + 1,
        textos: [criacao.texto, ...(atual?.textos ?? [])].slice(0, LIMITE_DE_AMOSTRAS),
        exemplos: [dados.nome, ...(atual?.exemplos ?? [])].slice(0, LIMITE_DE_AMOSTRAS),
        primeiraEm: atual?.primeiraEm ?? criadoEm,
        ultimaEm: criadoEm,
    };
    await salvar("categorias", categoria);
    return criacao;
}

/* ---------------- banner ---------------- */

/**
 * Leitura do banner pelo Claude logado nesta máquina (ia-local/plugin.ts, só no `npm run dev`).
 * Sem a ponte ou com erro, devolve null e a classificação segue sem o banner.
 */
export async function lerBanner(dataUrl: string): Promise<string | null> {
    try {
        const res = await fetch("/api/ia-local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imagem: dataUrl }) });
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) return null;
        const r = (await res.json()) as { ok: boolean; descricao?: string };
        return r.ok && r.descricao ? r.descricao : null;
    } catch {
        return null;
    }
}

export { CATALOGO, type CategoriaCandidata };
