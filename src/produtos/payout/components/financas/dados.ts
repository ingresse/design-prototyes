/*
 * Dados de exemplo dos protótipos de pesquisa de Finanças (briefing de 16/11/2026, seção 3).
 *
 * NÃO altere um valor sem refazer as contas. As duas regras de soma de cada evento:
 *   Seu dinheiro = Vendido − Taxas e custos + Créditos − Ajustes
 *   Seu dinheiro = Em processamento + Retido até o evento + Retido por segurança + A liberar
 *                  + Disponível + Agendado + Já recebido
 * `conferirContas()` devolve a lista do que não fecha (vazia quando está tudo certo). Roda no
 * desenvolvimento, com aviso no console, e pelo script `financas-eventos/utils/conferir-contas.ts`.
 *
 * Este arquivo não importa nada, de propósito: assim o script roda direto no Node.
 */

/** "Hoje" do protótipo: segunda, 16/11/2026. */
export const HOJE = "2026-11-16";
export const ORGANIZACAO = { nome: "Arena Produções", sigla: "AP", curto: "Arena" };

export type Cenario = "normal" | "negativo" | "bloqueado" | "carregando" | "erro" | "sem-eventos";

/** `muda` diz, na barra do protótipo, o que o cenário altera na tela (para quem conduz a entrevista). */
export const CENARIOS: Array<{ id: Cenario; rotulo: string; muda: string }> = [
    { id: "normal", rotulo: "Normal", muda: "Dados do briefing. Dois eventos têm saldo negativo, mas o total é positivo." },
    { id: "negativo", rotulo: "Total negativo", muda: "O disponível dos outros eventos já foi recebido: o total da organização fica negativo." },
    { id: "bloqueado", rotulo: "Bloqueado", muda: "Repasses pausados: repasse e antecipação desligados." },
    { id: "carregando", rotulo: "Carregando", muda: "Tela esperando os dados." },
    { id: "erro", rotulo: "Erro", muda: "Os dados não carregaram." },
    { id: "sem-eventos", rotulo: "Sem eventos", muda: "Organização sem nenhum evento com vendas." },
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
    /** Quando o valor em processamento entra no disponível: hoje até 18h ou conforme as parcelas do Pix. */
    previsaoProcessamento?: "hoje" | "parcelas";
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
    texto: "Compras contestadas pelo comprador. Podem acontecer até 120 dias depois da compra.",
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
        previsaoProcessamento: "hoje",
        liberacoes: [
            { data: "2026-11-21", tipo: "aLiberar", valor: 260_000 },
            { data: "2026-12-05", tipo: "aLiberar", valor: 260_000 },
            { data: "2027-01-13", tipo: "retidoSeguranca", valor: 45_600 },
        ],
        ajustesLista: [],
        creditosLista: [{ data: "2026-11-15", titulo: "Bonificação por meta de vendas", motivo: "Crédito combinado em contrato ao atingir a meta de vendas do evento.", valor: 12_000 }],
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
        previsaoProcessamento: "parcelas",
        liberacoes: [
            { data: "2026-11-19", tipo: "aLiberar", valor: 150_000 },
            { data: "2026-12-03", tipo: "aLiberar", valor: 150_000 },
            { data: "2026-12-13", tipo: "retidoEvento", valor: 187_575, nota: "Libera logo depois do evento." },
            { data: "2027-02-10", tipo: "retidoSeguranca", valor: 12_350 },
        ],
        ajustesLista: [],
        creditosLista: [],
        repasses: [],
        podeMudar: [
            {
                titulo: "Novas vendas e cancelamentos",
                texto: "O Vendido muda a cada compra ou cancelamento, sempre igual ao seu relatório de vendas.",
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

/* ---------------- os outros 44 eventos da organização ---------------- */

/*
 * A Arena Produções tem 48 eventos: os 4 do briefing (acima, escritos à mão) e 44 gerados a partir
 * de uma semente (nome, data e vendido). O resto é calculado com as mesmas proporções dos eventos
 * do briefing, sempre em números inteiros, para as duas regras de soma fecharem:
 *   Taxas e custos = 1,5% do Vendido · Retido por segurança = 1,9% do Vendido, libera 60 dias
 *   depois do evento · evento em vendas tem processamento (2%), retido até o evento e a liberar.
 */
interface Semente {
    id: string;
    nome: string;
    data: string;
    /** Vendido, em milhares de reais. */
    mil: number;
    /** Quanto do que já podia ser sacado foi sacado, em % (padrão: tudo, ou nada se está em vendas). */
    sacado?: number;
    credito?: number;
    ajustes?: Lancamento[];
    /** O repasse saiu antes dos ajustes: o evento fica com saldo negativo no valor deles. */
    negativo?: boolean;
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
const emMilhar = (valor: number) => Math.floor(valor / 1000) * 1000;

function gerar(s: Semente): Evento {
    const vendido = s.mil * 1000;
    const taxas = s.mil * 15;
    const creditos = s.credito ?? 0;
    const ajustesLista = s.ajustes ?? [];
    const ajustes = ajustesLista.reduce((t, a) => t + a.valor, 0);
    const seu = vendido - taxas + creditos - ajustes;
    const diasDepois = diasEntre(s.data, HOJE);
    const emVendas = diasDepois < 0;
    const liberacoes: Liberacao[] = [];

    let processamento = 0;
    let retidoEvento = 0;
    let aLiberar = 0;
    if (emVendas) {
        processamento = s.mil * 20;
        retidoEvento = emMilhar(seu * 0.3);
        aLiberar = emMilhar(seu * 0.25);
        const primeira = emMilhar(aLiberar / 2);
        const folga = ([...s.id].reduce((t, letra) => t + letra.charCodeAt(0), 0) % 6) * 2;
        liberacoes.push(
            { data: somarDias(HOJE, 8 + folga), tipo: "aLiberar", valor: primeira },
            { data: somarDias(HOJE, 22 + folga), tipo: "aLiberar", valor: aLiberar - primeira },
            { data: somarDias(s.data, 1), tipo: "retidoEvento", valor: retidoEvento, nota: "Libera logo depois do evento." },
        );
    } else if (diasDepois < 14) {
        aLiberar = emMilhar(seu * 0.3);
        const primeira = emMilhar(aLiberar / 2);
        liberacoes.push({ data: somarDias(s.data, 21), tipo: "aLiberar", valor: primeira }, { data: somarDias(s.data, 35), tipo: "aLiberar", valor: aLiberar - primeira });
    }
    const retidoSeguranca = diasDepois < 60 ? s.mil * 19 : 0;
    if (retidoSeguranca) {
        liberacoes.push({ data: somarDias(s.data, 60), tipo: "retidoSeguranca", valor: retidoSeguranca, nota: s.negativo ? "Abate o saldo negativo deste evento." : undefined });
    }

    const livre = seu - processamento - retidoEvento - retidoSeguranca - aLiberar;
    const sacado = s.sacado ?? (emVendas ? 0 : 100);
    const recebido = s.negativo ? livre + ajustes : sacado === 100 ? livre : emMilhar((livre * sacado) / 100);

    const podeMudar: PodeMudar[] = [];
    if (emVendas) podeMudar.push({ titulo: "Novas vendas e cancelamentos", texto: "O Vendido muda a cada compra ou cancelamento, sempre igual ao seu relatório de vendas.", ate: s.data });
    if (diasDepois <= DIAS_DE_CONTESTACAO) podeMudar.push(contestacoes(s.data));

    return {
        id: s.id,
        nome: s.nome,
        data: s.data,
        emVendas,
        vendido,
        taxas,
        creditos,
        ajustes,
        processamento,
        retidoEvento,
        retidoSeguranca,
        aLiberar,
        disponivel: livre - recebido,
        agendado: 0,
        recebido,
        previsaoProcessamento: processamento ? "hoje" : undefined,
        liberacoes,
        ajustesLista,
        creditosLista: creditos ? [{ data: somarDias(s.data, 5), titulo: "Bonificação por meta de vendas", motivo: "Crédito combinado em contrato ao atingir a meta de vendas do evento.", valor: creditos }] : [],
        repasses: recebido > 0 ? [{ data: emVendas ? somarDias(HOJE, -20) : somarDias(s.data, 7), valor: recebido, situacao: "pago" }] : [],
        podeMudar,
    };
}

const SEMENTES: Semente[] = [
    // 2025
    { id: "verao-salvador-2025", nome: "Festival de Verão Salvador", data: "2025-01-25", mil: 1850, credito: 15_000 },
    { id: "bloco-lua-cheia", nome: "Bloco da Lua Cheia Rio de Janeiro", data: "2025-02-22", mil: 420 },
    { id: "baile-olinda", nome: "Baile de Carnaval de Olinda", data: "2025-03-01", mil: 610 },
    { id: "sertanejo-goiania", nome: "Sertanejo na Arena Goiânia", data: "2025-03-29", mil: 890 },
    { id: "rock-gerais", nome: "Rock das Gerais Belo Horizonte", data: "2025-04-19", mil: 540 },
    { id: "rodeio-ouro-2025", nome: "Rodeio de Ouro Ribeirão Preto", data: "2025-05-17", mil: 1200 },
    { id: "sao-joao-serra-2025", nome: "São João da Serra Campina Grande", data: "2025-06-21", mil: 1480, credito: 10_000 },
    { id: "arraia-capital-2025", nome: "Arraiá da Capital Brasília", data: "2025-06-28", mil: 330 },
    { id: "inverno-campos-2025", nome: "Festival de Inverno Campos do Jordão", data: "2025-07-12", mil: 760 },
    { id: "samba-laje-2025", nome: "Samba na Laje Rio de Janeiro", data: "2025-08-09", mil: 280 },
    { id: "pagode-parque-2025", nome: "Pagode do Parque Curitiba", data: "2025-08-30", mil: 365 },
    { id: "eletro-sunset-2025", nome: "Eletro Sunset Florianópolis", data: "2025-09-13", mil: 920 },
    { id: "oktober-serra-2025", nome: "Oktober da Serra Blumenau", data: "2025-10-11", mil: 1050 },
    { id: "halloween-fabrica-2025", nome: "Halloween na Fábrica São Paulo", data: "2025-10-31", mil: 240 },
    { id: "forro-antigas-2025", nome: "Forró das Antigas Fortaleza", data: "2025-11-15", mil: 310 },
    { id: "reveillon-mar-aberto-2026", nome: "Réveillon Mar Aberto Recife", data: "2025-12-31", mil: 2100, credito: 20_000 },
    // 2026, já encerrados
    { id: "sol-maior", nome: "Festival Sol Maior Salvador", data: "2026-01-17", mil: 1640 },
    { id: "ensaio-verao", nome: "Ensaio de Verão Porto Seguro", data: "2026-01-31", mil: 480 },
    { id: "bloco-vem-comigo-2026", nome: "Bloco Vem Comigo São Paulo", data: "2026-02-14", mil: 720 },
    { id: "carnaval-ladeiras-2026", nome: "Carnaval das Ladeiras Ouro Preto", data: "2026-02-16", mil: 560 },
    { id: "baile-aurora", nome: "Baile da Aurora Recife", data: "2026-02-17", mil: 390 },
    { id: "sertanejo-londrina", nome: "Sertanejo Universitário Londrina", data: "2026-03-21", mil: 450 },
    { id: "trap-praca", nome: "Trap na Praça Belo Horizonte", data: "2026-04-11", mil: 270 },
    { id: "raizes-samba", nome: "Festival Raízes do Samba Rio de Janeiro", data: "2026-04-25", mil: 830 },
    { id: "micareta-vale", nome: "Micareta do Vale Feira de Santana", data: "2026-05-02", mil: 990 },
    { id: "rodeio-ouro-2026", nome: "Rodeio de Ouro Ribeirão Preto 2026", data: "2026-05-16", mil: 1320 },
    { id: "sao-joao-serra-2026", nome: "São João da Serra Campina Grande 2026", data: "2026-06-20", mil: 1560, credito: 10_000 },
    { id: "arraia-capital-2026", nome: "Arraiá da Capital Brasília 2026", data: "2026-06-27", mil: 350 },
    { id: "inverno-campos-2026", nome: "Festival de Inverno Campos do Jordão 2026", data: "2026-07-11", mil: 810 },
    { id: "pagode-parque-2026", nome: "Pagode do Parque Curitiba 2026", data: "2026-08-08", mil: 400, sacado: 80 },
    { id: "eletro-sunset-2026", nome: "Eletro Sunset Florianópolis 2026", data: "2026-08-29", mil: 1010, sacado: 90 },
    { id: "samba-laje-2026", nome: "Samba na Laje Rio de Janeiro 2026", data: "2026-09-05", mil: 300 },
    // 2026, encerrados há menos de 60 dias (ainda com retido por segurança)
    { id: "festa-primavera", nome: "Festa da Primavera Holambra", data: "2026-10-03", mil: 260, sacado: 70 },
    {
        id: "oktober-serra-2026",
        nome: "Oktober da Serra Blumenau 2026",
        data: "2026-10-10",
        mil: 1180,
        sacado: 85,
        ajustes: [
            {
                data: "2026-10-28",
                titulo: "Contestação no cartão",
                motivo: "Um comprador contestou a compra com o banco depois do fechamento do evento. O valor foi devolvido a ele.",
                valor: 4_600,
            },
        ],
    },
    {
        id: "sunset-cais",
        nome: "Sunset no Cais Porto Alegre",
        data: "2026-10-17",
        mil: 520,
        negativo: true,
        ajustes: [
            {
                data: "2026-10-30",
                titulo: "Cancelamentos depois do repasse",
                motivo: "Compradores cancelaram ingressos depois que o repasse de 24/10 já tinha sido pago. O valor foi devolvido a eles.",
                valor: 14_000,
            },
        ],
    },
    { id: "halloween-fabrica-2026", nome: "Halloween na Fábrica São Paulo 2026", data: "2026-10-31", mil: 290, sacado: 60 },
    { id: "vozes-norte", nome: "Festival Vozes do Norte Belém", data: "2026-11-07", mil: 640, sacado: 50 },
    // em vendas
    { id: "forro-antigas-2026", nome: "Forró das Antigas Fortaleza 2026", data: "2026-11-28", mil: 340 },
    { id: "natal-iluminado", nome: "Natal Iluminado Gramado", data: "2026-12-19", mil: 450 },
    { id: "reveillon-mar-aberto-2027", nome: "Réveillon Mar Aberto Recife 2027", data: "2026-12-31", mil: 1900, sacado: 40 },
    { id: "verao-salvador-2027", nome: "Festival de Verão Salvador 2027", data: "2027-01-23", mil: 1300, sacado: 30 },
    { id: "bloco-vem-comigo-2027", nome: "Bloco Vem Comigo São Paulo 2027", data: "2027-02-06", mil: 380 },
    { id: "carnaval-ladeiras-2027", nome: "Carnaval das Ladeiras Ouro Preto 2027", data: "2027-02-08", mil: 220 },
    { id: "rodeio-ouro-2027", nome: "Rodeio de Ouro Ribeirão Preto 2027", data: "2027-05-15", mil: 180 },
];

/** Os 48 eventos da organização. */
const EVENTOS: Evento[] = [...EVENTOS_BASE, ...SEMENTES.map(gerar)];
export const TOTAL_DE_EVENTOS = 48;

/**
 * Cenário "Saldo negativo": a organização já sacou tudo o que tinha disponível (repasse pago em
 * 13/11) e só restaram os débitos dos eventos com saldo negativo. O Disponível agora total fica negativo e as somas
 * continuam fechando, porque o valor só mudou de "Disponível" para "Já recebido".
 */
const DATA_DO_SAQUE_TOTAL = "2026-11-13";

export function eventosDoCenario(cenario: Cenario): Evento[] {
    if (cenario === "sem-eventos") return [];
    if (cenario !== "negativo") return EVENTOS;
    return EVENTOS.map((e) => {
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

/** O que compõe Taxas e custos, sempre nas mesmas proporções do Vendido (suposição, ver NOTAS.md). */
export function composicaoDasTaxas(e: Pick<Evento, "vendido" | "taxas">): Array<{ titulo: string; detalhe: string; valor: number }> {
    const servico = (e.vendido * 10) / 1000;
    const pagamentos = (e.vendido * 4) / 1000;
    return [
        { titulo: "Taxa de serviço", detalhe: "Pelo uso da plataforma de vendas.", valor: servico },
        { titulo: "Processamento de pagamentos", detalhe: "Custo de cartão e Pix de cada compra.", valor: pagamentos },
        { titulo: "Emissão de cortesias", detalhe: "Ingressos de cortesia emitidos para o evento.", valor: e.taxas - servico - pagamentos },
    ];
}

/**
 * Confere as contas em todos os cenários e devolve o que não fecha (lista vazia = tudo certo):
 * as duas regras de soma de cada evento, as listas de cada evento contra os seus totais, e o total
 * da organização (a cascata do topo) contra a soma dos 48 eventos.
 */
export function conferirContas(): string[] {
    const erros: string[] = [];
    const partes = (e: Pick<Evento, (typeof CAMPOS)[number]>) => e.processamento + e.retidoEvento + e.retidoSeguranca + e.aLiberar + e.disponivel + e.agendado + e.recebido;
    for (const cenario of ["normal", "negativo", "bloqueado"] as const) {
        const eventos = eventosDoCenario(cenario);
        if (eventos.length !== TOTAL_DE_EVENTOS) erros.push(`${cenario}: ${eventos.length} eventos, eram para ser ${TOTAL_DE_EVENTOS}`);
        if (new Set(eventos.map((e) => e.id)).size !== eventos.length) erros.push(`${cenario}: há eventos com o mesmo id`);
        for (const e of eventos) {
            const onde = `${cenario}/${e.id}`;
            if (partes(e) !== seuDinheiro(e)) erros.push(`${onde}: as partes somam ${partes(e)}, seu dinheiro é ${seuDinheiro(e)}`);
            for (const c of CAMPOS) if (!Number.isInteger(e[c]) || (c !== "disponivel" && e[c] < 0)) erros.push(`${onde}: ${c} = ${e[c]}`);
            const soma = (tipo: TipoLiberacao) => e.liberacoes.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0);
            for (const tipo of ["retidoEvento", "retidoSeguranca", "aLiberar"] as const) {
                if (soma(tipo) !== e[tipo]) erros.push(`${onde}: calendário de ${tipo} soma ${soma(tipo)}, o evento tem ${e[tipo]}`);
            }
            if (e.liberacoes.some((l) => l.data <= HOJE)) erros.push(`${onde}: liberação com data que já passou`);
            const lista = (itens: Lancamento[]) => itens.reduce((s, l) => s + l.valor, 0);
            if (lista(e.ajustesLista) !== e.ajustes) erros.push(`${onde}: a lista de ajustes não soma Ajustes`);
            if (lista(e.creditosLista) !== e.creditos) erros.push(`${onde}: a lista de créditos não soma Créditos`);
            if (composicaoDasTaxas(e).reduce((s, t) => s + t.valor, 0) !== e.taxas) erros.push(`${onde}: a composição das taxas não soma Taxas e custos`);
            const repasses = (s: Repasse["situacao"]) => e.repasses.filter((r) => r.situacao === s).reduce((t, r) => t + r.valor, 0);
            if (repasses("pago") !== e.recebido) erros.push(`${onde}: repasses pagos somam ${repasses("pago")}, já recebido é ${e.recebido}`);
            if (repasses("agendado") !== e.agendado) erros.push(`${onde}: repasses agendados não somam Agendado`);
            if (e.repasses.some((r) => r.situacao === "pago" && r.data > HOJE)) erros.push(`${onde}: repasse pago com data no futuro`);
        }
        // O topo (total da organização) contra a soma evento a evento.
        const t = totalizar(eventos);
        const somaDosEventos = eventos.reduce((s, e) => s + seuDinheiro(e), 0);
        if (t.seuDinheiro !== somaDosEventos) erros.push(`${cenario}: Seu dinheiro do topo é ${t.seuDinheiro}, a soma dos eventos é ${somaDosEventos}`);
        if (partes(t) !== t.seuDinheiro) erros.push(`${cenario}: as partes do topo somam ${partes(t)}, Seu dinheiro é ${t.seuDinheiro}`);
        if (t.vendido - t.taxas + t.creditos - t.ajustes !== t.seuDinheiro) erros.push(`${cenario}: a cascata do topo não fecha`);
    }
    return erros;
}

// `import.meta.env` só existe dentro do Vite; no Node (script de verificação) fica indefinido.
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) for (const erro of conferirContas()) console.error(`[finanças] ${erro}`);
