/*
 * Dados de exemplo dos protótipos de pesquisa de Finanças (briefing de 16/11/2026, seção 3).
 *
 * NÃO altere um valor sem refazer as contas. As duas regras de soma de cada evento:
 *   Seu dinheiro = Vendido − Taxas e custos + Créditos − Ajustes
 *   Seu dinheiro = Em processamento + Retido até o evento + Retido por segurança + A liberar
 *                  + Disponível + Agendado + Já recebido
 * `conferirContas()` roda no desenvolvimento e acusa no console qualquer soma que não feche.
 */

/** "Hoje" do protótipo: segunda, 16/11/2026. */
export const HOJE = "2026-11-16";
export const ORGANIZACAO = { nome: "Arena Produções", sigla: "AP", curto: "Arena" };

export type Cenario = "normal" | "negativo" | "bloqueado" | "carregando" | "erro" | "sem-eventos";

export const CENARIOS: Array<{ id: Cenario; rotulo: string }> = [
    { id: "normal", rotulo: "Normal" },
    { id: "negativo", rotulo: "Saldo negativo" },
    { id: "bloqueado", rotulo: "Bloqueado" },
    { id: "carregando", rotulo: "Carregando" },
    { id: "erro", rotulo: "Erro" },
    { id: "sem-eventos", rotulo: "Sem eventos" },
];

export type TipoLiberacao = "retidoEvento" | "retidoSeguranca" | "aLiberar";

export interface Liberacao {
    data: string;
    tipo: TipoLiberacao;
    valor: number;
    /** Complemento em linguagem de cliente (ex.: "abate o saldo negativo"). */
    nota?: string;
}

export interface Lancamento {
    data: string;
    titulo: string;
    motivo: string;
    valor: number;
}

export interface Repasse {
    data: string;
    valor: number;
    situacao: "agendado" | "pago" | "falhou";
    nota?: string;
}

export interface PodeMudar {
    titulo: string;
    texto: string;
    /** Data até quando isso ainda pode acontecer. */
    ate?: string;
}

export type Selo = "Saldo negativo" | "Ajuste recente" | "Evento em vendas";

export interface Evento {
    id: string;
    nome: string;
    data: string;
    emVendas: boolean;
    vendido: number;
    taxas: number;
    creditos: number;
    ajustes: number;
    processamento: number;
    retidoEvento: number;
    retidoSeguranca: number;
    aLiberar: number;
    disponivel: number;
    agendado: number;
    recebido: number;
    /** Por que está em processamento e quando entra no saldo. */
    motivoProcessamento?: string;
    quandoProcessamento?: string;
    liberacoes: Liberacao[];
    /** Ajustes depois do fechamento (tiraram dinheiro). */
    ajustesLista: Lancamento[];
    /** Créditos (somaram dinheiro). */
    creditosLista: Lancamento[];
    repasses: Repasse[];
    podeMudar: PodeMudar[];
}

/** Prazo máximo de contestação no cartão, contado da última compra possível (a data do evento). */
const DIAS_DE_CONTESTACAO = 120;

export function somarDias(iso: string, dias: number): string {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

const contestacoes = (dataDoEvento: string): PodeMudar => ({
    titulo: "Contestações no cartão",
    texto: "Um comprador pode contestar a compra no cartão de 90 a 120 dias depois de comprar. Se acontecer, o valor sai do retido por segurança e aparece aqui como ajuste.",
    ate: somarDias(dataDoEvento, DIAS_DE_CONTESTACAO),
});

const EVENTOS_BASE: Evento[] = [
    {
        id: "carnaval",
        nome: "Carnaval na Cidade de São Paulo",
        data: "2026-11-14",
        emVendas: false,
        vendido: 2_400_000,
        taxas: 36_000,
        creditos: 12_000,
        ajustes: 0,
        processamento: 48_000,
        retidoEvento: 0,
        retidoSeguranca: 45_600,
        aLiberar: 520_000,
        disponivel: 412_400,
        agendado: 600_000,
        recebido: 750_000,
        motivoProcessamento: "Vendas das últimas horas, ainda em confirmação de pagamento.",
        quandoProcessamento: "Entra no seu saldo até hoje, 18h",
        liberacoes: [
            { data: "2026-11-21", tipo: "aLiberar", valor: 260_000 },
            { data: "2026-12-05", tipo: "aLiberar", valor: 260_000 },
            { data: "2027-01-13", tipo: "retidoSeguranca", valor: 45_600 },
        ],
        ajustesLista: [],
        creditosLista: [{ data: "2026-11-10", titulo: "Bonificação por meta de vendas", motivo: "Crédito combinado em contrato ao atingir a meta de vendas do evento.", valor: 12_000 }],
        repasses: [
            { data: "2026-11-24", valor: 600_000, situacao: "agendado" },
            { data: "2026-10-20", valor: 750_000, situacao: "pago" },
        ],
        podeMudar: [contestacoes("2026-11-14")],
    },
    {
        id: "ivete",
        nome: "Ivete Clareou Turnê",
        data: "2026-09-19",
        emVendas: false,
        vendido: 980_000,
        taxas: 14_700,
        creditos: 0,
        ajustes: 3_200,
        processamento: 0,
        retidoEvento: 0,
        retidoSeguranca: 18_620,
        aLiberar: 0,
        disponivel: 123_480,
        agendado: 0,
        recebido: 820_000,
        liberacoes: [{ data: "2026-11-18", tipo: "retidoSeguranca", valor: 18_620 }],
        ajustesLista: [
            {
                data: "2026-11-02",
                titulo: "Contestação no cartão",
                motivo: "Um comprador contestou a compra com o banco depois do fechamento do evento. O valor foi devolvido a ele.",
                valor: 3_200,
            },
        ],
        creditosLista: [],
        repasses: [
            {
                data: "2026-11-10",
                valor: 123_480,
                situacao: "falhou",
                nota: "O banco recusou a transferência: os dados da conta não conferem. O valor voltou para o seu Disponível agora.",
            },
            { data: "2026-09-30", valor: 820_000, situacao: "pago" },
        ],
        podeMudar: [contestacoes("2026-09-19")],
    },
    {
        id: "numanice",
        nome: "Numanice São Paulo",
        data: "2026-12-12",
        emVendas: true,
        vendido: 650_000,
        taxas: 9_750,
        creditos: 0,
        ajustes: 0,
        processamento: 15_000,
        retidoEvento: 187_575,
        retidoSeguranca: 12_350,
        aLiberar: 300_000,
        disponivel: 125_325,
        agendado: 0,
        recebido: 0,
        motivoProcessamento: "Compras no Pix parcelado com parcelas em aberto.",
        quandoProcessamento: "Entra quando as parcelas forem pagas",
        liberacoes: [
            { data: "2026-11-19", tipo: "aLiberar", valor: 150_000 },
            { data: "2026-12-03", tipo: "aLiberar", valor: 150_000 },
            { data: "2026-12-13", tipo: "retidoEvento", valor: 187_575, nota: "Libera logo após o evento." },
            { data: "2027-02-10", tipo: "retidoSeguranca", valor: 12_350 },
        ],
        ajustesLista: [],
        creditosLista: [],
        repasses: [],
        podeMudar: [
            {
                titulo: "Novas vendas e cancelamentos",
                texto: "O evento ainda está em vendas. O Vendido cresce a cada compra e diminui se houver cancelamento, sempre igual ao seu relatório de vendas.",
                ate: "2026-12-12",
            },
            contestacoes("2026-12-12"),
        ],
    },
    {
        id: "arraial",
        nome: "Arraial Estrelado São Paulo",
        data: "2026-09-27",
        emVendas: false,
        vendido: 300_000,
        taxas: 4_500,
        creditos: 5_000,
        ajustes: 30_000,
        processamento: 0,
        retidoEvento: 0,
        retidoSeguranca: 5_700,
        aLiberar: 0,
        disponivel: -25_200,
        agendado: 0,
        recebido: 290_000,
        liberacoes: [{ data: "2026-11-26", tipo: "retidoSeguranca", valor: 5_700, nota: "Abate o saldo negativo deste evento." }],
        ajustesLista: [
            {
                data: "2026-10-12",
                titulo: "Cancelamentos depois do repasse",
                motivo: "Compradores cancelaram ingressos depois que o repasse de 05/10 já tinha sido pago. O valor foi devolvido a eles.",
                valor: 22_000,
            },
            {
                data: "2026-10-08",
                titulo: "Custo de operação · equipe extra",
                motivo: "Equipe extra contratada para o dia do evento, cobrada depois do fechamento.",
                valor: 8_000,
            },
        ],
        creditosLista: [{ data: "2026-10-08", titulo: "Bonificação de equipe", motivo: "Crédito da Ingresse referente à equipe do evento.", valor: 5_000 }],
        repasses: [{ data: "2026-10-05", valor: 290_000, situacao: "pago" }],
        podeMudar: [contestacoes("2026-09-27")],
    },
];

/**
 * Cenário "Saldo negativo": a organização já sacou tudo o que tinha disponível (repasse pago em
 * 13/11) e só restou o débito do Arraial. O Disponível agora total fica em −R$ 25.200 e as somas
 * continuam fechando, porque o valor só mudou de "Disponível" para "Já recebido".
 */
const DATA_DO_SAQUE_TOTAL = "2026-11-13";

export function eventosDoCenario(cenario: Cenario): Evento[] {
    if (cenario === "sem-eventos") return [];
    if (cenario !== "negativo") return EVENTOS_BASE;
    return EVENTOS_BASE.map((e) => {
        if (e.disponivel <= 0) return e;
        return {
            ...e,
            disponivel: 0,
            recebido: e.recebido + e.disponivel,
            repasses: [{ data: DATA_DO_SAQUE_TOTAL, valor: e.disponivel, situacao: "pago" as const }, ...e.repasses.filter((r) => r.situacao !== "falhou")],
        };
    });
}

/* ---------------- contas ---------------- */

export const seuDinheiro = (e: Pick<Evento, "vendido" | "taxas" | "creditos" | "ajustes">) => e.vendido - e.taxas + e.creditos - e.ajustes;
export const retido = (e: Pick<Evento, "retidoEvento" | "retidoSeguranca">) => e.retidoEvento + e.retidoSeguranca;

export interface Totais {
    vendido: number;
    taxas: number;
    creditos: number;
    ajustes: number;
    seuDinheiro: number;
    processamento: number;
    retidoEvento: number;
    retidoSeguranca: number;
    retido: number;
    aLiberar: number;
    disponivel: number;
    agendado: number;
    recebido: number;
}

const CAMPOS = ["vendido", "taxas", "creditos", "ajustes", "processamento", "retidoEvento", "retidoSeguranca", "aLiberar", "disponivel", "agendado", "recebido"] as const;

export function totalizar(eventos: Evento[]): Totais {
    const t = Object.fromEntries(CAMPOS.map((c) => [c, 0])) as Record<(typeof CAMPOS)[number], number>;
    for (const e of eventos) for (const c of CAMPOS) t[c] += e[c];
    return { ...t, seuDinheiro: seuDinheiro(t), retido: retido(t) };
}

export interface LiberacaoDoEvento extends Liberacao {
    evento: Evento;
}

/** Calendário de liberações de vários eventos, da mais próxima para a mais distante. */
export function calendario(eventos: Evento[], tipos?: TipoLiberacao[]): LiberacaoDoEvento[] {
    return eventos
        .flatMap((e) => e.liberacoes.map((l) => ({ ...l, evento: e })))
        .filter((l) => !tipos || tipos.includes(l.tipo))
        .sort((a, b) => a.data.localeCompare(b.data));
}

export const ROTULO_LIBERACAO: Record<TipoLiberacao, string> = {
    retidoEvento: "Retido até o evento",
    retidoSeguranca: "Retido por segurança",
    aLiberar: "A liberar",
};

/** Selos de situação do evento na lista (no máximo os três do briefing). */
export function selosDoEvento(e: Evento): Selo[] {
    const selos: Selo[] = [];
    if (e.disponivel < 0) selos.push("Saldo negativo");
    // "Recente": ajuste nos últimos 30 dias.
    if (e.ajustesLista.some((a) => a.data >= somarDias(HOJE, -30))) selos.push("Ajuste recente");
    if (e.emVendas) selos.push("Evento em vendas");
    return selos;
}

/* ---------------- frases prontas ---------------- */

export interface Compensacao {
    /** Liberações que cobrem o saldo negativo, em ordem. */
    passos: LiberacaoDoEvento[];
    /** Quanto sobra para sacar depois da última liberação da lista. */
    sobra: number;
}

/**
 * Como um Disponível agora negativo é compensado: as próximas liberações da organização entram
 * no saldo em ordem de data até cobrir o débito. Suposição do protótipo (ver NOTAS.md).
 */
export function compensacao(eventos: Evento[]): Compensacao | null {
    let saldo = totalizar(eventos).disponivel;
    if (saldo >= 0) return null;
    const passos: LiberacaoDoEvento[] = [];
    for (const l of calendario(eventos)) {
        passos.push(l);
        saldo += l.valor;
        if (saldo >= 0) break;
    }
    return { passos, sobra: saldo };
}

/** Confere as duas regras de soma de cada evento, em todos os cenários. Só no desenvolvimento. */
export function conferirContas() {
    for (const cenario of ["normal", "negativo"] as const) {
        for (const e of eventosDoCenario(cenario)) {
            const distribuido = e.processamento + e.retidoEvento + e.retidoSeguranca + e.aLiberar + e.disponivel + e.agendado + e.recebido;
            if (distribuido !== seuDinheiro(e)) console.error(`[finanças] ${cenario}/${e.id}: distribuição ${distribuido} ≠ seu dinheiro ${seuDinheiro(e)}`);
            const soma = (tipo: TipoLiberacao) => e.liberacoes.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
            for (const tipo of ["retidoEvento", "retidoSeguranca", "aLiberar"] as const) {
                if (soma(tipo) !== e[tipo]) console.error(`[finanças] ${cenario}/${e.id}: calendário de ${tipo} soma ${soma(tipo)} ≠ ${e[tipo]}`);
            }
            const lista = (itens: Lancamento[]) => itens.reduce((s, l) => s + l.valor, 0);
            if (lista(e.ajustesLista) !== e.ajustes) console.error(`[finanças] ${cenario}/${e.id}: ajustes não fecham`);
            if (lista(e.creditosLista) !== e.creditos) console.error(`[finanças] ${cenario}/${e.id}: créditos não fecham`);
            const repasses = (s: Repasse["situacao"]) => e.repasses.filter((r) => r.situacao === s).reduce((t, r) => t + r.valor, 0);
            if (repasses("pago") !== e.recebido) console.error(`[finanças] ${cenario}/${e.id}: repasses pagos ≠ já recebido`);
            if (repasses("agendado") !== e.agendado) console.error(`[finanças] ${cenario}/${e.id}: repasses agendados ≠ agendado`);
        }
    }
}

if (import.meta.env.DEV) conferirContas();
