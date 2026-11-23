import { agoraIsoLocal, CAMPO } from "./campos";
import { LOCAL_POR_ID } from "./locais";
import { marcarLotesParaRevisar, novaCategoria, novaModalidade, novoLote, rascunhoVazio } from "./modelos";
import { daBiblioteca, marcarEstoqueParaRevisar, novaOpcao, novaPergunta } from "./perguntas";
import { podeVer, type Perfil } from "./perfil";
import { termoValido } from "./termos";
import type { Categoria, DescontoLegal, Modalidade, Rascunho, Sexo } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Eventos anteriores do organizador (mock) e a cópia (RN-07)         */
/*  A cópia traz local, modalidades, categorias, lotes e perguntas.    */
/*  Não traz datas de venda (data limite dos lotes), inscritos nem      */
/*  cupons. A largada vem para o mesmo dia no próximo ano possível e    */
/*  fica marcada "Revise esta data" até a pessoa editar.                */
/* ------------------------------------------------------------------ */

/** Categoria de um evento anterior: só o que difere do padrão (regras, vagas e preços próprios). */
export interface CategoriaAnterior {
    nome: string;
    sexo?: Sexo;
    idadeMin?: number;
    idadeMax?: number;
    desconto?: DescontoLegal;
    /** Sem `vagas`: sem limite próprio (usa as da modalidade). */
    vagas?: number;
    /** Preço do 1º e do 2º lote, quando diferente do da modalidade (ex.: kit premium). */
    precos?: [number, number];
}

export interface ModalidadeAnterior {
    nome: string;
    tipo: string;
    vagas: number;
    precos: [number, number];
    categorias: CategoriaAnterior[];
}

export interface EventoAnterior {
    id: string;
    /** Organização dona do evento (RN-09). */
    organizacaoId: string;
    nome: string;
    /** ISO local da largada. */
    largada: string;
    esporte: string;
    localId: string;
    descricao: string;
    /** v0.11: termo de uso escolhido no evento de origem (da organização). */
    termoId?: string;
    modalidades: ModalidadeAnterior[];
}

/* Atalhos das categorias mais comuns nos eventos de corrida (nomes como os organizadores usam). */
const GERAL: CategoriaAnterior = { nome: "Geral" };
const SESSENTA: CategoriaAnterior = { nome: "60+", idadeMin: 60, desconto: "idoso" };
const PCD: CategoriaAnterior = { nome: "PCD", desconto: "pcd", vagas: 30 };

export const EVENTOS_ANTERIORES: EventoAnterior[] = [
    {
        id: "corrida-noturna-floripa-2025",
        organizacaoId: "sul-run",
        nome: "Corrida Noturna Floripa 2025",
        largada: "2025-11-15T20:00",
        esporte: "corrida-de-rua",
        localId: "trapiche-beira-mar",
        termoId: "termo-provas-noturnas",
        descricao: "Largada à noite na Beira-Mar Norte, com percurso plano e iluminado. Kit com camiseta, número de peito e medalha.",
        modalidades: [
            {
                nome: "5 km",
                tipo: "5k",
                vagas: 600,
                precos: [89.9, 109.9],
                categorias: [GERAL, SESSENTA, PCD, { nome: "Feminino 18–29", sexo: "feminino", idadeMin: 18, idadeMax: 29 }],
            },
            {
                nome: "10 km",
                tipo: "10k",
                vagas: 900,
                precos: [99.9, 119.9],
                categorias: [
                    GERAL,
                    { nome: "Feminino 30–39", sexo: "feminino", idadeMin: 30, idadeMax: 39 },
                    { nome: "Masculino 30–39", sexo: "masculino", idadeMin: 30, idadeMax: 39 },
                    SESSENTA,
                    { nome: "Kit premium", vagas: 150, precos: [149.9, 169.9] },
                ],
            },
        ],
    },
    {
        id: "meia-maratona-joinville-2025",
        organizacaoId: "sul-run",
        nome: "Meia Maratona de Joinville 2025",
        largada: "2025-08-10T07:00",
        esporte: "corrida-de-rua",
        localId: "rua-do-principe",
        descricao: "Percurso de 21 km pelo centro de Joinville, com opção de 5 km para quem está começando.",
        modalidades: [
            {
                nome: "21 km",
                tipo: "21k",
                vagas: 1200,
                precos: [139.9, 159.9],
                categorias: [GERAL, { nome: "Elite", vagas: 40 }, SESSENTA, PCD],
            },
            {
                nome: "5 km",
                tipo: "5k",
                vagas: 500,
                precos: [79.9, 89.9],
                categorias: [GERAL, { nome: "Juvenil 14–17", idadeMin: 14, idadeMax: 17 }, SESSENTA],
            },
        ],
    },
    {
        id: "trail-serra-do-mar-2025",
        organizacaoId: "sul-run",
        nome: "Trail Serra do Mar 2025",
        largada: "2025-06-22T06:30",
        esporte: "trail-run",
        localId: "estrada-graciosa",
        // Termo inativo hoje na organização: a cópia cai no padrão (SCE-207).
        termoId: "termo-grupos-assessorias",
        descricao: "Trilhas na Serra do Mar com dois percursos: curto para iniciantes e longo para quem quer subir a serra.",
        modalidades: [
            {
                nome: "Trail 12 km",
                tipo: "trail-curto",
                vagas: 300,
                precos: [149.9, 169.9],
                categorias: [{ nome: "Feminino", sexo: "feminino" }, { nome: "Masculino", sexo: "masculino" }],
            },
            {
                nome: "Trail 30 km",
                tipo: "trail-longo",
                vagas: 200,
                precos: [219.9, 249.9],
                categorias: [{ nome: "Feminino", sexo: "feminino" }, { nome: "Masculino", sexo: "masculino" }, { nome: "Master 50+", idadeMin: 50 }],
            },
        ],
    },
    {
        id: "maratona-sp-2025",
        organizacaoId: "liga-corrida",
        nome: "Maratona Paulista 2025",
        largada: "2025-09-07T06:00",
        esporte: "corrida-de-rua",
        localId: "parque-ibirapuera",
        descricao: "42 km pelas avenidas de São Paulo, com 21 km e 10 km no mesmo dia.",
        modalidades: [
            {
                nome: "42 km",
                tipo: "42k",
                vagas: 3000,
                precos: [229.9, 259.9],
                categorias: [
                    GERAL,
                    { nome: "Elite feminino", sexo: "feminino", vagas: 30 },
                    { nome: "Elite masculino", sexo: "masculino", vagas: 30 },
                    SESSENTA,
                    { ...PCD, vagas: 60 },
                ],
            },
            { nome: "21 km", tipo: "21k", vagas: 4000, precos: [169.9, 189.9], categorias: [GERAL, SESSENTA, { ...PCD, vagas: 80 }] },
            {
                nome: "10 km",
                tipo: "10k",
                vagas: 5000,
                precos: [119.9, 139.9],
                categorias: [GERAL, SESSENTA, { ...PCD, vagas: 100 }, { nome: "Kit premium", vagas: 500, precos: [179.9, 199.9] }],
            },
        ],
    },
    {
        id: "desafio-mantiqueira-2025",
        organizacaoId: "trilhas-brasil",
        nome: "Desafio Mantiqueira 2025",
        largada: "2025-07-13T07:00",
        esporte: "trail-run",
        localId: "estrada-graciosa",
        descricao: "Trail na serra com 15 km e 35 km.",
        modalidades: [
            { nome: "Trail 15 km", tipo: "trail-curto", vagas: 400, precos: [179.9, 199.9], categorias: [GERAL, { nome: "Master 40+", idadeMin: 40 }, SESSENTA] },
            {
                nome: "Trail 35 km",
                tipo: "trail-longo",
                vagas: 250,
                precos: [259.9, 289.9],
                categorias: [{ nome: "Feminino", sexo: "feminino" }, { nome: "Masculino", sexo: "masculino" }, { nome: "Master 40+", idadeMin: 40 }],
            },
        ],
    },
];

export const rotuloDoEvento = (e: EventoAnterior) =>
    `${e.nome} – ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(e.largada))}`;

/** Busca nos eventos que o perfil pode ver (RN-09; simula a API: ~500 ms). */
export function buscarEventos(texto: string, perfil: Perfil): Promise<EventoAnterior[]> {
    const t = texto.trim().toLowerCase();
    return new Promise((resolve) =>
        setTimeout(() => resolve(EVENTOS_ANTERIORES.filter((e) => podeVer(perfil, e.organizacaoId) && (!t || rotuloDoEvento(e).toLowerCase().includes(t)))), 500),
    );
}

/**
 * Perguntas de um evento anterior (para copiar), já ligadas às categorias de `modalidades`:
 * - Tamanho da camiseta (estoque por tamanho) e Contato de emergência, obrigatórias em todas as categorias;
 * - Equipe ou assessoria, opcional, só nas categorias abertas a todos (sem sexo nem faixa etária);
 * - Tamanho do corta-vento (estoque), só no "Kit premium", se houver; senão no 10 km (ou na 1ª modalidade).
 */
export function perguntasDoEvento(_e: EventoAnterior, modalidades: Modalidade[]) {
    const r = { modalidades };
    const camiseta = daBiblioteca("camiseta", r);
    const quantidades = [40, 120, 200, 160, 60, 20, 40, 120, 160, 100, 40, 20];
    camiseta.opcoes = camiseta.opcoes.map((o, i) => ({ ...o, quantidade: quantidades[i] ?? null }));
    const abertas = modalidades.flatMap((m) => m.categorias).filter((c) => c.sexo === "todos" && c.idadeMin == null && c.idadeMax == null);
    const equipe = novaPergunta(r, {
        titulo: "Equipe ou assessoria",
        tipo: "texto-curto",
        todas: false,
        padrao: "opcional",
        vinculos: Object.fromEntries(abertas.map((c) => [c.id, "opcional" as const])),
    });
    // Só na categoria "Kit premium", se existir; senão, em todas as categorias do 10 km (ou da 1ª modalidade).
    const premium = modalidades.flatMap((m) => m.categorias).filter((c) => /kit premium/i.test(c.nome));
    const alvo = premium.length ? premium : (modalidades.find((m) => /10\s*km/i.test(m.nome)) ?? modalidades[0])?.categorias ?? [];
    const cortaVento = novaPergunta(r, {
        titulo: "Tamanho do corta-vento",
        tipo: "lista-suspensa",
        todas: false,
        padrao: "opcional",
        opcoes: ["P", "M", "G", "GG"].map((t) => novaOpcao(t, 100)),
        vinculos: Object.fromEntries(alvo.map((c) => [c.id, "opcional" as const])),
    });
    return [camiseta, daBiblioteca("emergencia", r), equipe, cortaVento];
}

/** Mesmo dia e hora, no primeiro ano em que a data fica no futuro. */
const proximaData = (iso: string) => {
    const agora = agoraIsoLocal();
    let ano = Number(iso.slice(0, 4));
    let candidato = iso;
    while (candidato <= agora) {
        ano += 1;
        candidato = `${ano}${iso.slice(4)}`;
    }
    return candidato;
};

/**
 * Modalidades de um evento anterior como entram na cópia (RN-07): cada categoria com as regras, as vagas e dois
 * lotes (nome, preço e quantidade). A data limite dos lotes é data de venda: não vem, fica em branco para revisar.
 * Ids novos a cada chamada.
 */
export function modalidadesDoEvento(e: EventoAnterior): Modalidade[] {
    return e.modalidades.map((m) =>
        novaModalidade({
            nome: m.nome,
            tipo: m.tipo,
            vagas: m.vagas,
            categorias: m.categorias.map((c) => {
                const precos = c.precos ?? m.precos;
                // Lotes cabem nas vagas da categoria (ou ficam em 200 e 300 sem limite próprio).
                const [v1, v2] = c.vagas ? [Math.ceil(c.vagas / 2), Math.floor(c.vagas / 2)] : [200, 300];
                const categoria: Partial<Categoria> = {
                    nome: c.nome,
                    sexo: c.sexo ?? "todos",
                    idadeMin: c.idadeMin ?? null,
                    idadeMax: c.idadeMax ?? null,
                    desconto: c.desconto ?? "nenhum",
                    // v0.18: a categoria PCD de origem vira a regra "Somente PCD" (o desconto legal saiu do MVP).
                    pcd: c.desconto === "pcd",
                    semLimite: !c.vagas,
                    vagas: c.vagas ?? null,
                    lotes: [novoLote(1, { valor: precos[0], vagas: v1 }), novoLote(2, { valor: precos[1], vagas: v2 })],
                };
                return novaCategoria(categoria);
            }),
        }),
    );
}

export function copiarEvento(id: string): Rascunho {
    const e = EVENTOS_ANTERIORES.find((x) => x.id === id);
    if (!e) return rascunhoVazio();
    const modalidades = marcarLotesParaRevisar(modalidadesDoEvento(e));
    // v0.46 (SCE-294): cupons e chaves de acesso nunca vêm de outro evento (RN-07): a cópia começa sem nenhum.
    return {
        ...rascunhoVazio(),
        origem: "copia",
        copiadoDe: e.nome,
        // O ano sai do nome: "Corrida Noturna Floripa 2025" vira "Corrida Noturna Floripa 2026".
        nome: e.nome.replace(/\b(20\d\d)\b/, proximaData(e.largada).slice(0, 4)),
        esporte: e.esporte,
        // v0.16 (SCE-215): largada e término não vêm na cópia; os campos ficam em branco com "Insira a data".
        largada: "",
        termino: "",
        local: LOCAL_POR_ID(e.localId),
        descricao: e.descricao,
        // v0.11: mantém o termo do evento de origem se ainda está ativo na organização; senão, o padrão.
        termoId: termoValido(e.termoId),
        modalidades,
        // Estoque das opções é de cada evento: as perguntas com quantidade pedem revisão (SCE-172).
        perguntas: marcarEstoqueParaRevisar(perguntasDoEvento(e, modalidades)),
        // A data limite dos lotes é data de venda: não vem (RN-07) e fica vazia (opcional: vira quando esgota).
        // A largada vem para o próximo ano e pede revisão até a pessoa mexer nela.
        datasARevisar: [CAMPO.largada, CAMPO.termino],
        // v0.8 (SCE-190): a etapa Modalidades começa pelo fluxo de cópia; todo lote copiado começa "a revisar".
        fluxoDeCopia: { tipo: "evento", etapa: "escolher" },
    };
}
