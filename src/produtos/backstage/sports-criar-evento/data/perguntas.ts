import type { Modalidade, OpcaoDePergunta, Pergunta, Presenca, Rascunho, TipoDeResposta } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Perguntas do formulário de inscrição (SCE-100 a SCE-115)           */
/*  Biblioteca de perguntas prontas, herança das perguntas "todas" e   */
/*  a presença de cada pergunta em cada categoria.                     */
/* ------------------------------------------------------------------ */

let seq = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

export const TIPOS_COM_OPCOES: TipoDeResposta[] = ["selecao-unica", "lista-suspensa", "multipla"];
export const temOpcoes = (t: TipoDeResposta) => TIPOS_COM_OPCOES.includes(t);

export const novaOpcao = (nome = "", quantidade: number | null = null): OpcaoDePergunta => ({ id: id("opc"), nome, quantidade });

/** Ids das categorias que existem hoje no rascunho. */
export const idsDasCategorias = (modalidades: Modalidade[]) => modalidades.flatMap((m) => m.categorias.map((c) => c.id));

/** Pergunta nova: por padrão vale para todas as categorias, opcional (SCE-104). */
export const novaPergunta = (r: Pick<Rascunho, "modalidades">, parcial: Partial<Pergunta> = {}): Pergunta => {
    const base: Pergunta = { id: id("perg"), titulo: "", tipo: "texto-curto", opcoes: [], todas: true, padrao: "opcional", vinculos: {}, ...parcial };
    return base.todas ? { ...base, vinculos: Object.fromEntries(idsDasCategorias(r.modalidades).map((c) => [c, base.padrao])) } : base;
};

/** Presença da pergunta numa categoria. */
export const presencaNa = (p: Pergunta, categoriaId: string): Presenca | "nao" => p.vinculos[categoriaId] ?? "nao";

/** Muda a presença numa categoria. Tirar de uma categoria desfaz o "todas". */
export const comPresenca = (p: Pergunta, categoriaIds: string[], estado: Presenca | "nao"): Pergunta => {
    const vinculos = { ...p.vinculos };
    for (const c of categoriaIds) {
        if (estado === "nao") delete vinculos[c];
        else vinculos[c] = estado;
    }
    return { ...p, vinculos, todas: estado === "nao" ? false : p.todas };
};

/** Herança (SCE-105): categorias novas recebem as perguntas marcadas como "todas". */
export const herdarPerguntas = (perguntas: Pergunta[], novasCategorias: string[]): Pergunta[] =>
    perguntas.map((p) => (p.todas ? { ...p, vinculos: { ...p.vinculos, ...Object.fromEntries(novasCategorias.map((c) => [c, p.padrao])) } } : p));

/** Duplicar categoria ou modalidade copia os vínculos da original para a cópia (SCE-105). */
export const copiarVinculos = (perguntas: Pergunta[], deParaCategoria: Record<string, string>): Pergunta[] =>
    perguntas.map((p) => {
        const extra: Record<string, Presenca> = {};
        for (const [de, para] of Object.entries(deParaCategoria)) if (p.vinculos[de]) extra[para] = p.vinculos[de];
        return Object.keys(extra).length ? { ...p, vinculos: { ...p.vinculos, ...extra } } : p;
    });

/** Perguntas que aparecem para o atleta de uma categoria, na ordem do formulário. */
export const perguntasDaCategoria = (perguntas: Pergunta[], categoriaId: string) => perguntas.filter((p) => !!p.vinculos[categoriaId]);

/** A pergunta tem opção com quantidade disponível (estoque) definida. */
export const temEstoque = (p: Pergunta) => temOpcoes(p.tipo) && p.opcoes.some((o) => o.quantidade != null);

/**
 * Pergunta com estoque vinda de outro evento (SCE-172, v0.12 SCE-208): as quantidades não vêm (o estoque é de
 * cada evento); cada opção fica "a definir" até receber um número ou "Sem limite".
 */
export const zerarEstoqueCopiado = (p: Pergunta): Pergunta =>
    temEstoque(p) ? { ...p, opcoes: p.opcoes.map((o) => ({ ...o, quantidade: null, aDefinir: true, copiada: true })) } : p;
export const marcarEstoqueParaRevisar = (ps: Pergunta[]): Pergunta[] => ps.map(zerarEstoqueCopiado);

/** Opções ainda sem quantidade definida (a pergunta pede revisão enquanto houver alguma). */
export const opcoesADefinir = (p: Pergunta) => (temOpcoes(p.tipo) ? p.opcoes.filter((o) => o.aDefinir) : []);
export const precisaDefinirEstoque = (p: Pergunta) => opcoesADefinir(p).length > 0;

/**
 * Traz perguntas de outro evento para as categorias copiadas (SCE-171). `dePara` liga a categoria de origem à
 * nova. Pergunta com o mesmo título e tipo de uma que já existe aqui só ganha os vínculos (não duplica, e o
 * estoque continua o deste evento); as outras entram como cópia, só nas categorias novas, e as com estoque
 * pedem revisão.
 */
export function trazerPerguntas(atuais: Pergunta[], deOutroEvento: Pergunta[], dePara: Record<string, string>): Pergunta[] {
    let resultado = [...atuais];
    for (const fonte of deOutroEvento) {
        const vinculos: Record<string, Presenca> = {};
        for (const [de, para] of Object.entries(dePara)) if (fonte.vinculos[de]) vinculos[para] = fonte.vinculos[de];
        if (!Object.keys(vinculos).length) continue;
        const igual = resultado.find((p) => p.tipo === fonte.tipo && p.titulo.trim().toLowerCase() === fonte.titulo.trim().toLowerCase());
        if (igual) {
            resultado = resultado.map((p) => (p.id === igual.id ? { ...p, vinculos: { ...p.vinculos, ...vinculos } } : p));
            continue;
        }
        const nova: Pergunta = {
            id: id("perg"),
            titulo: fonte.titulo,
            tipo: fonte.tipo,
            padrao: fonte.padrao,
            todas: false,
            opcoes: fonte.opcoes.map((o) => novaOpcao(o.nome, o.quantidade)),
            vinculos,
        };
        resultado.push(zerarEstoqueCopiado(nova));
    }
    return resultado;
}

/* ---------------- biblioteca ---------------- */

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG"];

export interface PerguntaPronta {
    id: string;
    titulo: string;
    descricao: string;
    criar: (r: Pick<Rascunho, "modalidades">) => Pergunta;
}

export const BIBLIOTECA: PerguntaPronta[] = [
    {
        id: "camiseta",
        titulo: "Tamanho da camiseta",
        descricao: "Masculina e feminina, do PP ao XG",
        criar: (r) =>
            novaPergunta(r, {
                titulo: "Tamanho da camiseta",
                tipo: "lista-suspensa",
                padrao: "obrigatoria",
                opcoes: [...TAMANHOS.map((t) => novaOpcao(`Masculina ${t}`)), ...TAMANHOS.map((t) => novaOpcao(`Feminina ${t}`))],
            }),
    },
    {
        id: "emergencia",
        titulo: "Contato de emergência",
        descricao: "Nome e telefone",
        criar: (r) => novaPergunta(r, { titulo: "Contato de emergência (nome e telefone)", tipo: "texto-curto", padrao: "obrigatoria" }),
    },
    {
        id: "sangue",
        titulo: "Tipo sanguíneo",
        descricao: "A+, A−, B+, B−, AB+, AB−, O+, O−",
        criar: (r) =>
            novaPergunta(r, {
                titulo: "Tipo sanguíneo",
                tipo: "lista-suspensa",
                opcoes: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Não sei"].map((t) => novaOpcao(t)),
            }),
    },
    {
        id: "equipe",
        titulo: "Equipe ou assessoria",
        descricao: "Texto curto, opcional",
        criar: (r) => novaPergunta(r, { titulo: "Equipe ou assessoria", tipo: "texto-curto" }),
    },
    {
        id: "retirada",
        titulo: "Data de retirada do kit",
        descricao: "Dias e horários com quantidade",
        criar: (r) =>
            novaPergunta(r, {
                titulo: "Quando você vai retirar o kit?",
                tipo: "selecao-unica",
                padrao: "obrigatoria",
                opcoes: [novaOpcao("Sexta, das 10h às 20h", 800), novaOpcao("Sábado, das 9h às 18h", 800)],
            }),
    },
    {
        id: "aceite",
        titulo: "Aceite do regulamento",
        descricao: "Caixa de marcar obrigatória",
        criar: (r) =>
            novaPergunta(r, { titulo: "Aceite do regulamento", tipo: "multipla", padrao: "obrigatoria", opcoes: [novaOpcao("Li e aceito o regulamento do evento")] }),
    },
];

export const daBiblioteca = (idPronta: string, r: Pick<Rascunho, "modalidades">) => BIBLIOTECA.find((b) => b.id === idPronta)!.criar(r);

/** Cópia de uma pergunta de outro evento: vale para todas as categorias deste evento, com a presença da original. */
export const copiarPergunta = (p: Pergunta, r: Pick<Rascunho, "modalidades">): Pergunta =>
    novaPergunta(r, { titulo: p.titulo, tipo: p.tipo, padrao: p.padrao, opcoes: p.opcoes.map((o) => novaOpcao(o.nome, o.quantidade)) });
