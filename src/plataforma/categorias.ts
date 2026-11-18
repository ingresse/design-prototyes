import { CATEGORIAS, GRUPOS_DE_TAG, ORDEM_DA_SUGESTAO, TAGS, type CategoriaDoMapa, type GrupoDeTag, type Tag } from "./categorias-catalogo";
import { salvar } from "./db";
import type { Categoria, CriacaoDeEvento, Evento } from "./modelo";
import { agora, novoId } from "./regras";

/* ------------------------------------------------------------------ */
/*  Categorias e tags de evento                                        */
/*                                                                     */
/*  Categoria: uma por evento, escolhida pela pessoa (dropdown). As 10 */
/*  do mapa do Grupo estão na coleção `categorias` (seed).             */
/*                                                                     */
/*  Tags: o texto aberto, o nome, a descrição e a leitura do banner    */
/*  (feita pelo Claude, ver ia-local/plugin.ts) viram um vetor no      */
/*  modelo do Hugging Face, comparado com cada tag do catálogo.        */
/*  Embedding do evento inteiro erra fácil em tags curtas (calourada   */
/*  saía "Oktoberfest"), então a tag entra de três jeitos:             */
/*  - citada no que foi escrito (nome ou termo, plural vale);          */
/*  - dita com outras palavras: um trecho de 2 a 5 palavras do texto   */
/*    quase igual a um termo de 2+ palavras (similaridade 0,94),       */
/*    "bebida inclusa" é Open bar;                                     */
/*  - só no gênero musical, pelo evento inteiro com nota alta e folga. */
/*  As sazonais só valem com o evento perto da data.                   */
/* ------------------------------------------------------------------ */

export const MODELO_EMBEDDING = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
/** Sem citação, a tag entra só com esta similaridade... */
export const LIMIAR_SEM_CITACAO = 0.74;
/** ...e com esta folga sobre a segunda mais parecida do mesmo grupo. */
export const FOLGA_SEM_CITACAO = 0.05;
/** Trecho do texto quase igual a um termo de várias palavras: conta como dito. Abaixo disso o modelo confunde ("até o sol nascer" com "pôr do sol" dá 0,93). */
export const LIMIAR_DO_TRECHO = 0.94;
/** Peso de cada parte no vetor do evento. O texto escrito sobre o evento é o que mais diz. */
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

export interface DadosParaLer {
    texto: string;
    nome?: string;
    /** Descrição em texto puro. Só o começo entra no vetor (o modelo lê até umas 128 palavras). */
    descricao?: string;
    bannerDescricao?: string;
}

/** Vetor do evento: média ponderada das partes que existem. */
export async function vetorDoEvento(d: DadosParaLer): Promise<number[] | null> {
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

/* ---------------- catálogo de tags ---------------- */

let vetoresDasTags: Promise<Map<string, number[]>> | null = null;
let vetoresDosTermos: Promise<Map<string, number[]>> | null = null;

/** Termos de 2+ palavras das tags que só entram ditas: é com eles que os trechos do texto são comparados. */
export const termosLongos = (t: Tag) => (GRUPO_POR_ID.get(t.grupo)?.soCitada ? t.termos.filter((x) => x.trim().split(/\s+/).length >= 2) : []);

/** Vetores dos termos longos (pré-calculados em ia-local/vetores-catalogo.mjs). Termo novo é calculado aqui. */
function carregarTermos() {
    vetoresDosTermos ??= import("./categorias-catalogo-vetores.json").then(async ({ default: arquivo }) => {
        const gravados = (arquivo as { termos?: Record<string, number[]> }).termos ?? {};
        const mapa = new Map<string, number[]>();
        for (const termo of new Set(TAGS.flatMap(termosLongos))) mapa.set(termo, gravados[termo] ?? (await vetorDe(termo)));
        return mapa;
    });
    return vetoresDosTermos;
}

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "com", "na", "no", "nas", "nos", "em", "para", "pra", "um", "uma", "que", "por", "ao", "à", "the"]);

/** Trechos de 2 a 5 palavras do texto, sem começar ou terminar em palavra vazia ("bebida inclusa", "levar o cachorro"). */
function trechos(texto: string) {
    const w = texto.toLowerCase().replace(/[^\p{L}\p{N}&\s-]+/gu, " ").split(/\s+/).filter(Boolean);
    const out = new Set<string>();
    for (let n = 2; n <= 5; n++)
        for (let i = 0; i + n <= w.length; i++) {
            const s = w.slice(i, i + n);
            if (!PALAVRAS_VAZIAS.has(s[0]) && !PALAVRAS_VAZIAS.has(s[n - 1])) out.add(s.join(" "));
        }
    return [...out].slice(0, 80);
}

/** Vetores pré-calculados (ia-local/vetores-catalogo.mjs). Tag nova ou mudada é calculada aqui. */
function carregarTags() {
    vetoresDasTags ??= import("./categorias-catalogo-vetores.json").then(async ({ default: arquivo }) => {
        const gravados = (arquivo as { vetores: Record<string, { assinatura: string; vetor: number[] }> }).vetores;
        const mapa = new Map<string, number[]>();
        for (const t of TAGS) {
            const textos = [t.nome, ...t.termos];
            const gravado = gravados[t.id];
            if (gravado?.assinatura === textos.join("|")) mapa.set(t.id, gravado.vetor);
            else {
                const vs = await Promise.all(textos.map(vetorDe));
                mapa.set(t.id, normalizar(vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0))));
            }
        }
        return mapa;
    });
    return vetoresDasTags;
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const soPalavras = (t: string) => ` ${semAcento(t).replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Singular da palavra, o bastante para "casais" bater com "casal" e "blocos" com "bloco". */
function singular(p: string) {
    if (p.length <= 3) return p;
    if (p.length > 4 && p.endsWith("oes")) return p.slice(0, -3) + "ao";
    if (p.length > 4 && p.endsWith("aes")) return p.slice(0, -3) + "ao";
    if (p.length > 4 && p.endsWith("ais")) return p.slice(0, -3) + "al";
    if (p.length > 4 && p.endsWith("eis")) return p.slice(0, -3) + "el";
    if (p.endsWith("ns")) return p.slice(0, -2) + "m";
    if (p.length > 4 && /[rz]es$/.test(p)) return p.slice(0, -2);
    if (p.endsWith("s") && !p.endsWith("ss")) return p.slice(0, -1);
    return p;
}

/** Palavras sem acento e no singular, entre espaços, para achar termo como palavra inteira. */
const formaDeBusca = (t: string) => ` ${soPalavras(t).trim().split(" ").map(singular).join(" ")} `;

/** O texto cita a tag (ou a categoria) pelo nome ou por um termo, como palavra inteira; plural vale. */
const cita = (escrito: string, nomes: string[]) => nomes.some((x) => escrito.includes(formaDeBusca(x)));

/* ---------------- leitura das tags ---------------- */

export interface TagLida {
    id: string;
    /** Similaridade do evento com a tag (0 a 1). */
    nota: number;
    /** Dita no que foi escrito (texto, nome, descrição ou banner): citada ou com outras palavras quase iguais a um termo. */
    citada: boolean;
}

export interface LeituraDeTags {
    /** Todas as que passaram, de todos os grupos. A categoria escolhida filtra depois (`tagsValidas`). */
    tags: TagLida[];
    vetor: number[] | null;
    /** Categoria que o texto cita ("balada", "stand-up", "festa universitária"), para sugerir com o dropdown vazio. */
    categoriaSugerida?: string;
}

/** Lê as tags do evento: citação, trecho quase igual a um termo, ou (gênero) embedding com nota alta e folga. */
export async function lerTags(d: DadosParaLer): Promise<LeituraDeTags> {
    const vetor = await vetorDoEvento(d);
    if (!vetor) return { tags: [], vetor: null };
    const [vetores, termos] = await Promise.all([carregarTags(), carregarTermos()]);
    const escrito = formaDeBusca([d.texto, d.nome, d.descricao, d.bannerDescricao].filter(Boolean).join(" "));
    // Trechos do que a pessoa escreveu e do nome (a descrição é longa demais para isso).
    const vetoresDosTrechos = await Promise.all(trechos([d.texto, d.nome].filter(Boolean).join(". ")).map(vetorDe));
    const ditaComOutrasPalavras = (t: Tag) =>
        termosLongos(t).some((termo) => vetoresDosTrechos.some((v) => cosseno(v, termos.get(termo)!) >= LIMIAR_DO_TRECHO));

    const achadas = new Map<string, TagLida>();
    for (const g of GRUPOS_DE_TAG) {
        const notas = TAGS.filter((t) => t.grupo === g.id)
            .map((t) => ({ t, nota: cosseno(vetor, vetores.get(t.id)!), citada: cita(escrito, [t.nome, ...t.termos]) || ditaComOutrasPalavras(t) }))
            .sort((a, b) => b.nota - a.nota);
        for (const [i, n] of notas.entries()) {
            const folga = n.nota - (notas[i + 1]?.nota ?? 0);
            const pelaLeitura = !g.soCitada && i === 0 && n.nota >= LIMIAR_SEM_CITACAO && folga >= FOLGA_SEM_CITACAO;
            if (n.citada || pelaLeitura) achadas.set(n.t.id, { id: n.t.id, nota: arredondar(n.nota), citada: n.citada });
        }
    }
    // Techno também é eletrônica: a tag mais ampla entra junto, com a nota dela.
    for (const a of [...achadas.values()]) {
        for (const id of TAG_POR_ID.get(a.id)?.inclui ?? []) {
            if (!achadas.has(id)) achadas.set(id, { id, nota: arredondar(cosseno(vetor, vetores.get(id)!)), citada: false });
        }
    }
    const categoriaSugerida = ORDEM_DA_SUGESTAO.find((id) => cita(escrito, CATEGORIA_POR_ID.get(id)?.termos ?? []));
    return { tags: [...achadas.values()], vetor, categoriaSugerida };
}

const arredondar = (x: number) => Math.round(x * 100) / 100;

export interface ContextoDasTags {
    categoriaId?: string;
    /** Início e fim do evento (ISO). Sem início ainda, a sazonal dita aparece; com a data, só dentro da janela. */
    inicio?: string;
    fim?: string;
    /** Tags que a pessoa tirou no campo. */
    removidas?: string[];
}

/**
 * Tags que valem para o evento, com o máximo por grupo (citadas primeiro, depois pela nota).
 * Gênero musical só em eventos de entretenimento; Clássico e Final só em futebol e esportes; sazonais
 * só com o evento dentro da janela da data.
 */
export function tagsValidas<T extends { id: string; nota?: number; citada?: boolean }>(tags: T[], contexto: ContextoDasTags): T[] {
    const porGrupo = new Map<GrupoDeTag, T[]>();
    for (const l of tags) {
        const t = TAG_POR_ID.get(l.id);
        if (!t || contexto.removidas?.includes(t.id) || !valeNaCategoria(t, contexto.categoriaId) || !valeNaData(t, contexto)) continue;
        porGrupo.set(t.grupo, [...(porGrupo.get(t.grupo) ?? []), l]);
    }
    return GRUPOS_DE_TAG.flatMap((g) =>
        (porGrupo.get(g.id) ?? []).sort((a, b) => Number(!!b.citada) - Number(!!a.citada) || (b.nota ?? 0) - (a.nota ?? 0)).slice(0, g.maximo),
    );
}

function valeNaCategoria(t: Tag, categoriaId: string | undefined) {
    const doGrupo = GRUPO_POR_ID.get(t.grupo)?.categorias;
    // Sem categoria escolhida ainda, mostra tudo: a escolha filtra depois.
    if (!categoriaId) return true;
    return (!doGrupo || doGrupo.includes(categoriaId)) && (!t.categorias || t.categorias.includes(categoriaId));
}

const DIA = 24 * 60 * 60 * 1000;

/** O evento toca alguma janela da tag? Olha dia a dia do início ao fim (até 60 dias). Sem data ainda, vale. */
export function valeNaData(t: Tag, { inicio, fim }: Pick<ContextoDasTags, "inicio" | "fim">) {
    if (!t.janelas) return true;
    if (!inicio) return true;
    const comeco = new Date(inicio.slice(0, 10) + "T12:00:00");
    const final = fim ? new Date(fim.slice(0, 10) + "T12:00:00") : comeco;
    if (Number.isNaN(comeco.getTime())) return false;
    for (let n = 0, d = comeco.getTime(); n <= 60; n++, d += DIA) {
        const iso = new Date(d).toISOString().slice(0, 10);
        if (t.janelas.some((j) => naJanela(iso, j))) return true;
        if (d >= final.getTime()) break;
    }
    return false;
}

function naJanela(iso: string, [de, ate]: [string, string]) {
    // Com ano: só aquele período.
    if (de.length === 10) return iso >= de && iso <= ate;
    // Sem ano: todo ano, e a janela pode virar o ano (26/12 a 02/01).
    const md = iso.slice(5);
    return de <= ate ? md >= de && md <= ate : md >= de || md <= ate;
}

/* ---------------- consultas ---------------- */

export const TAG_POR_ID = new Map(TAGS.map((t) => [t.id, t]));
export const GRUPO_POR_ID = new Map(GRUPOS_DE_TAG.map((g) => [g.id, g]));
export const CATEGORIA_POR_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

/** Só as categorias do mapa: a coleção pode ter documentos da lista anterior, com ids que não estão no mapa. */
export const doMapa = (categorias: Categoria[]) => categorias.filter((c) => CATEGORIA_POR_ID.has(c.id) && typeof c.ordem === "number");

/** Categorias que a criação de um tipo oferece no dropdown. */
export const categoriasDoTipo = (categorias: Categoria[], tipo: Evento["tipo"]) => categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.ordem - b.ordem);

/* ---------------- eventos que já existiam ---------------- */

/** Categoria da vitrine do novo site para a categoria do mapa. */
const DA_VITRINE: Record<string, string> = {
    eletronica: "festas-e-baladas",
    sertanejo: "shows",
    rock: "shows",
    rap: "shows",
    teatro: "artes-cenicas",
    festival: "festivais",
    standup: "humor",
};

/**
 * Categoria do evento. Os criados agora gravam a sua; os da seed e os de antes do mapa saem do tipo
 * (futebol, esportivo) ou da categoria da vitrine.
 */
export function categoriaDoEvento(e: Pick<Evento, "categoria" | "tipo" | "vitrine">): string | undefined {
    if (e.categoria && CATEGORIA_POR_ID.has(e.categoria)) return e.categoria;
    if (e.tipo === "futebol") return "futebol";
    if (e.tipo === "esportivo") return "esportes";
    const v = e.vitrine;
    if (v?.categoria === "esportes") return v.tags?.some((t) => soPalavras(t) === " futebol ") ? "futebol" : "esportes";
    return v?.categoria ? DA_VITRINE[v.categoria] : undefined;
}

/**
 * Tags do evento. Os criados agora gravam as suas; os da seed saem das tags soltas da vitrine,
 * quando batem com o nome ou um termo de uma tag do catálogo.
 */
export function tagsDoEvento(e: Pick<Evento, "tags" | "categoria" | "tipo" | "vitrine" | "data" | "fim">): string[] {
    if (e.tags) return e.tags;
    const soltas = (e.vitrine?.tags ?? []).map(soPalavras);
    const achadas = TAGS.filter((t) => [t.nome, ...t.termos].some((x) => soltas.includes(soPalavras(x)))).map((t) => ({ id: t.id, citada: true }));
    const comAmplas = [...achadas, ...achadas.flatMap((a) => (TAG_POR_ID.get(a.id)?.inclui ?? []).map((id) => ({ id, citada: false })))];
    const unicas = [...new Map(comAmplas.map((a) => [a.id, a])).values()];
    return tagsValidas(unicas, { categoriaId: categoriaDoEvento(e), inicio: e.data, fim: e.fim }).map((t) => t.id);
}

/* ---------------- gravação ---------------- */

/** Grava a criação: o que foi escrito, a leitura do banner, o vetor e o resultado. Chamado ao criar o evento. */
export async function registrarCriacao(dados: DadosParaLer & { eventoId: string; produtora: string; nome: string; categoriaId?: string; tags: string[] }, vetor: number[] | null) {
    const criacao: CriacaoDeEvento = {
        id: novoId("criacao"),
        eventoId: dados.eventoId,
        produtora: dados.produtora,
        nome: dados.nome,
        texto: dados.texto.trim(),
        descricao: dados.descricao || undefined,
        bannerDescricao: dados.bannerDescricao || undefined,
        vetor: vetor?.map((x) => Math.round(x * 1e4) / 1e4),
        categoriaId: dados.categoriaId,
        tags: dados.tags,
        criadoEm: agora(),
    };
    await salvar("criacoes", criacao);
    return criacao;
}

/* ---------------- banner ---------------- */

/**
 * Leitura do banner pelo Claude logado nesta máquina (ia-local/plugin.ts, só no `npm run dev`).
 * Sem a ponte ou com erro, devolve null e a leitura segue sem o banner.
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

export { CATEGORIAS, GRUPOS_DE_TAG, TAGS, type CategoriaDoMapa, type GrupoDeTag, type Tag };
