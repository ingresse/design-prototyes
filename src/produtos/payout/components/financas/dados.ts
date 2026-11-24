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

/** "Hoje" do protótipo: terça, 17/11/2026. */
export const HOJE = "2026-11-17";
/** Mesmo padrão dos relatórios do evento: "Atualizado em dd/mm/aaaa, hh:mm". */
export const ATUALIZADO_EM = "17/11/2026, 09:30";
export const ORGANIZACAO = { nome: "Arena Produções", sigla: "AP", curto: "Arena" };

export type Cenario = "normal" | "negativo" | "bloqueado" | "carregando" | "erro" | "sem-eventos";

/** `muda` diz, na barra do protótipo, o que o cenário altera na tela (para quem conduz a entrevista). */
export const CENARIOS: Array<{ id: Cenario; rotulo: string; muda: string }> = [
    { id: "normal", rotulo: "Normal", muda: "Dados do briefing. Dois eventos têm saldo negativo, mas o total é positivo." },
    { id: "negativo", rotulo: "Total negativo", muda: "O saldo disponível dos outros eventos já foi sacado: o total da organização fica negativo." },
    { id: "bloqueado", rotulo: "Bloqueado", muda: "Saques pausados: saque e antecipação desligados." },
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

export type TipoDeDevolucao = "cancelamento" | "reembolso" | "contestacao" | "suspenso";
export type TipoDeCredito = "bonificacao" | "rebate" | "luvas" | "ajuste";

export interface Lancamento {
    data: string;
    titulo: string;
    motivo: string;
    valor: number;
    /** Devolução: que tipo é e de onde o valor saiu. */
    devolucao?: TipoDeDevolucao;
    origem?: "disponivel" | "antecipavel";
    /** Crédito: que tipo é. Bonificação de custo traz o uso da verba do contrato. */
    credito?: TipoDeCredito;
    verba?: { usado: number; total: number };
}

export type Modalidade = "Básico" | "Expresso" | "Turbo";
/** Taxa de transferência de cada modalidade (valores ilustrativos, ver NOTAS.md). */
export const TAXA_DA_MODALIDADE: Record<Modalidade, number> = { Básico: 0, Expresso: 10, Turbo: 25 };
export const CONTA_DA_ORGANIZACAO = "Itaú ···4521";
export const CONTA_DE_TERCEIRO = "Conta de terceiro · Bradesco ···8830";

export interface Repasse {
    data: string;
    valor: number;
    situacao: "agendado" | "pago" | "falhou";
    nota?: string;
    /** Conta de destino (banco e final da conta). */
    conta: string;
    modalidade: Modalidade;
    /** Agendado: quando o repasse foi solicitado (é quando o valor sai do Disponível). */
    pedidoEm?: string;
}

/** Antecipação já feita: o valor saiu do Antecipável; o líquido (valor − taxa) entrou no Disponível. */
export interface Antecipacao {
    data: string;
    valor: number;
    taxa: number;
}

export interface PodeMudar {
    titulo: string;
    texto: string;
    /** Data até quando isso ainda pode acontecer. */
    ate?: string;
}

export type Selo = "Saldo negativo" | "Devolução recente" | "Em vendas" | "Totalmente sacado";

/** Quitado: tudo o que era do produtor já foi repassado. Não há nada para entrar, sair ou acompanhar. */
export const quitado = (e: Evento) => e.processamento + e.retidoEvento + e.retidoSeguranca + e.aLiberar + e.agendado === 0 && e.disponivel === 0;

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
    /** Devoluções (valores devolvidos aos compradores). O campo se chama `ajustes` por herança da v2. */
    ajustesLista: Lancamento[];
    /** Créditos (somaram dinheiro). */
    creditosLista: Lancamento[];
    repasses: Repasse[];
    podeMudar: PodeMudar[];
    /** Custos lançados à parte (ex.: custo de operação depois do fechamento). Fazem parte de Taxas e custos. */
    custosExtras?: Lancamento[];
    /** Taxa de serviço assumida pelo produtor (em vez de cobrada do comprador). */
    servicoAssumido?: boolean;
    /** Rebate que ainda depende da nota fiscal do produtor: não soma em Créditos. */
    creditoPendente?: { valor: number; motivo: string };
    /** Liberações que já aconteceram (para o Extrato): o valor entrou no Disponível nesta data. */
    liberadas?: Liberacao[];
    antecipacoes?: Antecipacao[];
}

/** Prazo máximo de contestação no cartão, contado da última compra possível (a data do evento). */
const DIAS_DE_CONTESTACAO = 120;

export function somarDias(iso: string, dias: number): string {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

/** Regra 2 dos ajustes v3: até a liberação do retido, a contestação sai do retido; depois, do disponível. */
const contestacoes = (dataDoEvento: string): PodeMudar => {
    const liberaRetido = somarDias(dataDoEvento, 60);
    const [, mes, dia] = liberaRetido.split("-");
    const quando = `${dia}/${mes}${liberaRetido.slice(0, 4) === HOJE.slice(0, 4) ? "" : `/${liberaRetido.slice(0, 4)}`}`;
    return {
        titulo: "Contestações no cartão",
        texto:
            liberaRetido > HOJE
                ? `Podem acontecer até 120 dias depois do evento. Até ${quando}, contestações saem do Retido. Depois disso, saem do seu saldo disponível.`
                : "Podem acontecer até 120 dias depois do evento. O Retido já foi liberado: se acontecerem, saem do seu saldo disponível.",
        ate: somarDias(dataDoEvento, DIAS_DE_CONTESTACAO),
    };
};

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
        creditosLista: [
            { data: "2026-11-15", credito: "rebate", titulo: "Rebate por meta de vendas", motivo: "Regra do contrato: 0,5% do Vendido ao passar de R$ 2.000.000 em vendas.", valor: 12_000 },
        ],
        repasses: [
            { data: "2026-11-24", valor: 600_000, situacao: "agendado", conta: CONTA_DA_ORGANIZACAO, modalidade: "Básico", pedidoEm: "2026-11-12" },
            { data: "2026-10-20", valor: 750_000, situacao: "pago", conta: CONTA_DA_ORGANIZACAO, modalidade: "Expresso" },
        ],
        liberadas: [
            { data: "2026-10-18", tipo: "aLiberar", valor: 750_000 },
            { data: "2026-11-05", tipo: "aLiberar", valor: 1_000_400 },
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
                devolucao: "contestacao",
                origem: "disponivel",
                titulo: "Contestação no cartão",
                motivo: "Um comprador contestou a compra com o banco. O valor foi devolvido a ele.",
                valor: 3_200,
            },
        ],
        creditosLista: [],
        servicoAssumido: true,
        repasses: [
            {
                data: "2026-11-10",
                valor: 123_480,
                situacao: "falhou",
                nota: "O banco recusou a transferência: os dados da conta não conferem. O valor voltou para o seu saldo disponível.",
                conta: CONTA_DA_ORGANIZACAO,
                modalidade: "Expresso",
            },
            { data: "2026-09-30", valor: 820_000, situacao: "pago", conta: CONTA_DA_ORGANIZACAO, modalidade: "Básico" },
        ],
        liberadas: [
            { data: "2026-09-28", tipo: "aLiberar", valor: 820_000 },
            { data: "2026-10-01", tipo: "aLiberar", valor: 126_680 },
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
        creditoPendente: { valor: 3_250, motivo: "Rebate de 0,5% do Vendido. Entra em Créditos quando você enviar a nota fiscal." },
        repasses: [],
        liberadas: [{ data: "2026-11-05", tipo: "aLiberar", valor: 125_325 }],
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
        // Regra 4 dos ajustes v3: o custo de operação (R$ 8.000) é Taxas e custos, não Devoluções.
        taxas: 12_500,
        creditos: 5_000,
        ajustes: 22_000,
        processamento: 0,
        retidoEvento: 0,
        retidoSeguranca: 5_700,
        aLiberar: 0,
        disponivel: -25_200,
        agendado: 0,
        recebido: 290_000,
        liberacoes: [{ data: "2026-11-26", tipo: "retidoSeguranca", valor: 5_700, nota: "Reduz o saldo negativo deste evento." }],
        ajustesLista: [
            {
                data: "2026-10-12",
                devolucao: "cancelamento",
                origem: "disponivel",
                titulo: "Cancelamentos depois do saque",
                motivo: "Compradores cancelaram ingressos depois que o saque de 05/10 já tinha sido pago.",
                valor: 18_000,
            },
            {
                data: "2026-10-14",
                devolucao: "reembolso",
                origem: "disponivel",
                titulo: "Reembolso parcial de meia-entrada",
                motivo: "Diferença devolvida a compradores que comprovaram meia-entrada depois da compra.",
                valor: 4_000,
            },
        ],
        custosExtras: [
            { data: "2026-10-20", titulo: "Custo de operação · equipe extra", motivo: "Equipe extra contratada para o dia do evento, lançada depois do fechamento.", valor: 8_000 },
        ],
        creditosLista: [
            {
                data: "2026-10-08",
                credito: "bonificacao",
                titulo: "Equipe de portaria",
                motivo: "Custo de equipe bonificado pela verba do seu contrato.",
                valor: 5_000,
                verba: { usado: 5_000, total: 10_000 },
            },
        ],
        repasses: [{ data: "2026-10-05", valor: 290_000, situacao: "pago", conta: CONTA_DE_TERCEIRO, modalidade: "Turbo" }],
        liberadas: [{ data: "2026-10-03", tipo: "aLiberar", valor: 290_000 }],
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
    tipoDoCredito?: TipoDeCredito;
    ajustes?: Lancamento[];
    servicoAssumido?: boolean;
    antecipacoes?: Antecipacao[];
    /** O repasse saiu antes dos ajustes: o evento fica com saldo negativo no valor deles. */
    negativo?: boolean;
}

/** O Extrato do protótipo cobre os últimos 90 dias. */
export const DIAS_DO_EXTRATO = 90;

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
        liberacoes.push({ data: somarDias(s.data, 60), tipo: "retidoSeguranca", valor: retidoSeguranca, nota: s.negativo ? "Reduz o saldo negativo deste evento." : undefined });
    }

    const livre = seu - processamento - retidoEvento - retidoSeguranca - aLiberar;
    const sacado = s.sacado ?? (emVendas ? 0 : 100);
    const recebido = s.negativo ? livre + ajustes : sacado === 100 ? livre : emMilhar((livre * sacado) / 100);

    const podeMudar: PodeMudar[] = [];
    if (emVendas) podeMudar.push({ titulo: "Novas vendas e cancelamentos", texto: "O Vendido muda a cada compra ou cancelamento, sempre igual ao seu relatório de vendas.", ate: s.data });
    if (diasDepois <= DIAS_DE_CONTESTACAO) podeMudar.push(contestacoes(s.data));

    const semente = [...s.id].reduce((t, letra) => t + letra.charCodeAt(0), 0);
    const modalidade = (["Básico", "Expresso", "Turbo"] as const)[semente % 3];
    const disponivel = livre - recebido;
    const dataDoRepasse = emVendas ? somarDias(HOJE, -20) : somarDias(s.data, 7);
    // Para o Extrato: o que foi repassado nos últimos 90 dias entrou no Disponível dois dias antes; e o
    // que está disponível hoje, em evento recente, entrou nos últimos dias.
    const liberadas: Liberacao[] = [];
    if (recebido > 0 && dataDoRepasse >= somarDias(HOJE, -DIAS_DO_EXTRATO + 3)) liberadas.push({ data: somarDias(dataDoRepasse, -2), tipo: "aLiberar", valor: recebido });
    if (disponivel > 0 && (emVendas || diasDepois < 60)) liberadas.push({ data: somarDias(HOJE, -(3 + (semente % 20))), tipo: "aLiberar", valor: disponivel });
    const creditoPorTipo: Record<TipoDeCredito, Pick<Lancamento, "titulo" | "motivo">> = {
        rebate: { titulo: "Rebate por meta de vendas", motivo: "Regra do contrato: percentual do Vendido ao atingir a meta de vendas do evento." },
        bonificacao: { titulo: "Equipe de portaria", motivo: "Custo de equipe bonificado pela verba do seu contrato." },
        luvas: { titulo: "Luvas de renovação", motivo: "Valor combinado na renovação do contrato." },
        ajuste: { titulo: "Ajuste a crédito", motivo: "Correção de uma taxa cobrada a mais." },
    };
    const tipoDoCredito = s.tipoDoCredito ?? "rebate";

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
        disponivel,
        agendado: 0,
        recebido,
        previsaoProcessamento: processamento ? "hoje" : undefined,
        liberacoes,
        ajustesLista,
        creditosLista: creditos
            ? [
                  {
                      data: somarDias(s.data, 5),
                      credito: tipoDoCredito,
                      ...creditoPorTipo[tipoDoCredito],
                      valor: creditos,
                      verba: tipoDoCredito === "bonificacao" ? { usado: creditos, total: creditos + 2_000 } : undefined,
                  },
              ]
            : [],
        repasses: recebido > 0 ? [{ data: dataDoRepasse, valor: recebido, situacao: "pago", conta: CONTA_DA_ORGANIZACAO, modalidade }] : [],
        podeMudar,
        servicoAssumido: s.servicoAssumido,
        liberadas,
        antecipacoes: s.antecipacoes,
    };
}

const SEMENTES: Semente[] = [
    // 2025
    { id: "verao-salvador-2025", nome: "Festival de Verão Salvador", data: "2025-01-25", mil: 1850, credito: 15_000 },
    { id: "bloco-lua-cheia", nome: "Bloco da Lua Cheia Rio de Janeiro", data: "2025-02-22", mil: 420 },
    { id: "baile-olinda", nome: "Baile de Carnaval de Olinda", data: "2025-03-01", mil: 610 },
    { id: "sertanejo-goiania", nome: "Sertanejo na Arena Goiânia", data: "2025-03-29", mil: 890 },
    { id: "rock-gerais", nome: "Rock das Gerais Belo Horizonte", data: "2025-04-19", mil: 540, servicoAssumido: true },
    { id: "rodeio-ouro-2025", nome: "Rodeio de Ouro Ribeirão Preto", data: "2025-05-17", mil: 1200 },
    { id: "sao-joao-serra-2025", nome: "São João da Serra Campina Grande", data: "2025-06-21", mil: 1480, credito: 10_000, tipoDoCredito: "bonificacao" },
    { id: "arraia-capital-2025", nome: "Arraiá da Capital Brasília", data: "2025-06-28", mil: 330 },
    { id: "inverno-campos-2025", nome: "Festival de Inverno Campos do Jordão", data: "2025-07-12", mil: 760 },
    { id: "samba-laje-2025", nome: "Samba na Laje Rio de Janeiro", data: "2025-08-09", mil: 280 },
    { id: "pagode-parque-2025", nome: "Pagode do Parque Curitiba", data: "2025-08-30", mil: 365 },
    { id: "eletro-sunset-2025", nome: "Eletro Sunset Florianópolis", data: "2025-09-13", mil: 920 },
    { id: "oktober-serra-2025", nome: "Oktober da Serra Blumenau", data: "2025-10-11", mil: 1050 },
    { id: "halloween-fabrica-2025", nome: "Halloween na Fábrica São Paulo", data: "2025-10-31", mil: 240 },
    { id: "forro-antigas-2025", nome: "Forró das Antigas Fortaleza", data: "2025-11-15", mil: 310 },
    { id: "reveillon-mar-aberto-2026", nome: "Réveillon Mar Aberto Recife", data: "2025-12-31", mil: 2100, credito: 20_000, tipoDoCredito: "luvas" },
    // 2026, já encerrados
    { id: "sol-maior", nome: "Festival Sol Maior Salvador", data: "2026-01-17", mil: 1640 },
    { id: "ensaio-verao", nome: "Ensaio de Verão Porto Seguro", data: "2026-01-31", mil: 480 },
    { id: "bloco-vem-comigo-2026", nome: "Bloco Vem Comigo São Paulo", data: "2026-02-14", mil: 720 },
    { id: "carnaval-ladeiras-2026", nome: "Carnaval das Ladeiras Ouro Preto", data: "2026-02-16", mil: 560 },
    { id: "baile-aurora", nome: "Baile da Aurora Recife", data: "2026-02-17", mil: 390 },
    { id: "sertanejo-londrina", nome: "Sertanejo Universitário Londrina", data: "2026-03-21", mil: 450 },
    { id: "trap-praca", nome: "Trap na Praça Belo Horizonte", data: "2026-04-11", mil: 270, servicoAssumido: true },
    { id: "raizes-samba", nome: "Festival Raízes do Samba Rio de Janeiro", data: "2026-04-25", mil: 830 },
    { id: "micareta-vale", nome: "Micareta do Vale Feira de Santana", data: "2026-05-02", mil: 990 },
    { id: "rodeio-ouro-2026", nome: "Rodeio de Ouro Ribeirão Preto 2026", data: "2026-05-16", mil: 1320 },
    { id: "sao-joao-serra-2026", nome: "São João da Serra Campina Grande 2026", data: "2026-06-20", mil: 1560, credito: 10_000, tipoDoCredito: "ajuste" },
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
                devolucao: "contestacao",
                origem: "antecipavel",
                titulo: "Contestação no cartão",
                motivo: "Um comprador contestou a compra com o banco. O valor foi devolvido a ele antes de ser liberado para você.",
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
                devolucao: "cancelamento",
                origem: "disponivel",
                titulo: "Cancelamentos depois do saque",
                motivo: "Compradores cancelaram ingressos depois que o saque de 24/10 já tinha sido pago.",
                valor: 11_500,
            },
            {
                data: "2026-11-03",
                devolucao: "suspenso",
                origem: "disponivel",
                titulo: "Ingressos suspensos",
                motivo: "Ingressos suspensos para análise. Pode voltar ao seu líquido se o ingresso for liberado.",
                valor: 2_500,
            },
        ],
    },
    { id: "halloween-fabrica-2026", nome: "Halloween na Fábrica São Paulo 2026", data: "2026-10-31", mil: 290, sacado: 60 },
    { id: "vozes-norte", nome: "Festival Vozes do Norte Belém", data: "2026-11-07", mil: 640, sacado: 50 },
    // em vendas
    { id: "forro-antigas-2026", nome: "Forró das Antigas Fortaleza 2026", data: "2026-11-28", mil: 340 },
    { id: "natal-iluminado", nome: "Natal Iluminado Gramado", data: "2026-12-19", mil: 450 },
    { id: "reveillon-mar-aberto-2027", nome: "Réveillon Mar Aberto Recife 2027", data: "2026-12-31", mil: 1900, sacado: 40 },
    { id: "verao-salvador-2027", nome: "Festival de Verão Salvador 2027", data: "2027-01-23", mil: 1300, sacado: 30, antecipacoes: [{ data: "2026-11-08", valor: 80_000, taxa: 1_600 }] },
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
            repasses: [{ data: DATA_DO_SAQUE_TOTAL, valor: e.disponivel, situacao: "pago" as const, conta: CONTA_DA_ORGANIZACAO, modalidade: "Básico" as const }, ...e.repasses.filter((r) => r.situacao !== "falhou")],
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
    aLiberar: "Antecipável",
};

/** Selos de situação do evento na lista (no máximo os três do briefing). */
export function selosDoEvento(e: Evento): Selo[] {
    const selos: Selo[] = [];
    if (e.disponivel < 0) selos.push("Saldo negativo");
    // "Recente": ajuste nos últimos 30 dias.
    if (e.ajustesLista.some((a) => a.data >= somarDias(HOJE, -30))) selos.push("Devolução recente");
    if (e.emVendas) selos.push("Em vendas");
    if (quitado(e) && e.recebido > 0) selos.push("Totalmente sacado");
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

/* ---------------- taxas e custos, por tipo ---------------- */

export type TipoDeTaxa = "cortesias" | "pre-impressos" | "pagamentos" | "servico" | "juros" | "operacao";

export interface LinhaDeTaxa {
    tipo: TipoDeTaxa;
    titulo: string;
    valor: number;
    /** Quantidade e preço unitário, quando a taxa é por unidade ("312 × R$ 0,99"). */
    quantidade?: number;
    unitario?: string;
    /** Custo lançado à parte, com data. */
    data?: string;
    motivo?: string;
}

export const ROTULO_DA_TAXA: Record<TipoDeTaxa, string> = {
    cortesias: "Emissão de cortesias",
    "pre-impressos": "Pré-impressos",
    pagamentos: "Processamento de pagamentos",
    servico: "Taxa de serviço",
    juros: "Juros de parcelamento",
    operacao: "Custo de operação",
};

/**
 * O que compõe Taxas e custos de um evento. As proporções são ilustrativas (ver NOTAS.md); as
 * quantidades são sempre múltiplos que dão valor inteiro em reais, e "Processamento de pagamentos"
 * fecha a conta: a soma das linhas é sempre igual a Taxas e custos do evento.
 */
export function composicaoDasTaxas(e: Pick<Evento, "vendido" | "taxas" | "servicoAssumido" | "custosExtras">): LinhaDeTaxa[] {
    const mil = e.vendido / 1000;
    const cortesias = Math.ceil(mil / 200) * 100; // × R$ 0,99 = R$ 99 a cada 100
    const preImpressos = Math.round(mil / 5) * 25; // × R$ 0,32 = R$ 8 a cada 25
    const juros = mil * 2;
    const servico = e.servicoAssumido ? mil * 3 : 0;
    const extras = e.custosExtras ?? [];
    const valorDasCortesias = (cortesias / 100) * 99;
    const valorDosPreImpressos = (preImpressos / 25) * 8;
    const pagamentos = e.taxas - extras.reduce((t, c) => t + c.valor, 0) - valorDasCortesias - valorDosPreImpressos - juros - servico;
    const linhas: LinhaDeTaxa[] = [
        { tipo: "pagamentos", titulo: ROTULO_DA_TAXA.pagamentos, valor: pagamentos },
        { tipo: "juros", titulo: ROTULO_DA_TAXA.juros, valor: juros },
        { tipo: "pre-impressos", titulo: ROTULO_DA_TAXA["pre-impressos"], valor: valorDosPreImpressos, quantidade: preImpressos, unitario: "R$ 0,32" },
        { tipo: "cortesias", titulo: ROTULO_DA_TAXA.cortesias, valor: valorDasCortesias, quantidade: cortesias, unitario: "R$ 0,99" },
    ];
    if (servico) linhas.push({ tipo: "servico", titulo: ROTULO_DA_TAXA.servico, valor: servico });
    for (const c of extras) linhas.push({ tipo: "operacao", titulo: c.titulo, valor: c.valor, data: c.data, motivo: c.motivo });
    return linhas;
}

/* ---------------- calendário de liberações ---------------- */

export type TipoDeEntrada = TipoLiberacao | "processamento";

/** Uma entrada futura no Disponível. Sem `data`: Pix parcelado, entra conforme as parcelas são pagas. */
export interface Entrada {
    data?: string;
    tipo: TipoDeEntrada;
    valor: number;
    evento: Evento;
    nota?: string;
}

export const ROTULO_DA_ENTRADA: Record<TipoDeEntrada, string> = {
    processamento: "Em processamento",
    retidoEvento: "Retido até o evento",
    retidoSeguranca: "Retido por segurança",
    aLiberar: "Antecipável",
};

/** Tudo o que ainda vai entrar no Disponível, em ordem de data. A soma é Em processamento + Retido + Antecipável. */
export function entradasDoCalendario(eventos: Evento[]): Entrada[] {
    const entradas: Entrada[] = [];
    for (const e of eventos) {
        if (e.processamento > 0) {
            entradas.push(
                e.previsaoProcessamento === "hoje"
                    ? { data: HOJE, tipo: "processamento", valor: e.processamento, evento: e, nota: "Libera hoje" }
                    : { tipo: "processamento", valor: e.processamento, evento: e, nota: "Pix parcelado: libera a cada parcela paga" },
            );
        }
        for (const l of e.liberacoes) {
            // O porquê do Retido aparece em toda linha, não só na página do evento.
            const nota = l.tipo === "retidoEvento" ? "Libera depois do evento" : l.tipo === "retidoSeguranca" ? (l.nota ?? "Reservado para contestações no cartão. O que sobrar libera nesta data.") : l.nota;
            entradas.push({ ...l, nota, evento: e });
        }
    }
    // Sem data vai para o fim.
    return entradas.sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999") || b.valor - a.valor);
}

export interface ResumoDoCalendario {
    em7: number;
    em30: number;
    depois: number;
    /** Parte de `depois` que não tem data (Pix parcelado). */
    semData: number;
    limite7: string;
    limite30: string;
}

/** Três faixas que não se sobrepõem: até 7 dias, de 8 a 30 dias e depois de 30 dias. Somam o calendário inteiro. */
export function resumoDoCalendario(entradas: Entrada[]): ResumoDoCalendario {
    const limite7 = somarDias(HOJE, 7);
    const limite30 = somarDias(HOJE, 30);
    const r = { em7: 0, em30: 0, depois: 0, semData: 0, limite7, limite30 };
    for (const e of entradas) {
        if (!e.data) {
            r.depois += e.valor;
            r.semData += e.valor;
        } else if (e.data <= limite7) r.em7 += e.valor;
        else if (e.data <= limite30) r.em30 += e.valor;
        else r.depois += e.valor;
    }
    return r;
}

/** Como o Calendário agrupa os tipos: os dois retidos contam juntos, com a cor do Retido da legenda. */
export type GrupoDeEntrada = "processamento" | "retido" | "aLiberar";
export const GRUPO_DA_ENTRADA: Record<TipoDeEntrada, GrupoDeEntrada> = { processamento: "processamento", retidoEvento: "retido", retidoSeguranca: "retido", aLiberar: "aLiberar" };

export interface PeriodoDoCalendario {
    /** Primeiro e último dia (ISO). O último período ("depois") não tem fim. */
    de: string;
    ate?: string;
    porGrupo: Record<GrupoDeEntrada, number>;
    total: number;
}

export interface SemanasDoCalendario {
    semanas: PeriodoDoCalendario[];
    /** Tudo o que tem data depois da última semana. */
    depois: PeriodoDoCalendario;
    /** O que não tem data (Pix parcelado): fora do gráfico. */
    semData: number;
    total: number;
}

/**
 * As próximas semanas a partir de hoje (hoje + 6 dias, e assim por diante), para o gráfico do
 * Calendário. Semanas + depois + sem data = o calendário inteiro (`conferirContas`).
 */
export function semanasDoCalendario(entradas: Entrada[], quantas = 8): SemanasDoCalendario {
    const vazio = (de: string, ate?: string): PeriodoDoCalendario => ({ de, ate, porGrupo: { processamento: 0, retido: 0, aLiberar: 0 }, total: 0 });
    const semanas = Array.from({ length: quantas }, (_, i) => vazio(somarDias(HOJE, i * 7), somarDias(HOJE, i * 7 + 6)));
    const depois = vazio(somarDias(HOJE, quantas * 7));
    let semData = 0;
    for (const e of entradas) {
        if (!e.data) {
            semData += e.valor;
            continue;
        }
        const periodo = semanas.find((s) => e.data! >= s.de && e.data! <= s.ate!) ?? depois;
        periodo.porGrupo[GRUPO_DA_ENTRADA[e.tipo]] += e.valor;
        periodo.total += e.valor;
    }
    return { semanas, depois, semData, total: semanas.reduce((s, x) => s + x.total, 0) + depois.total + semData };
}

/* ---------------- extrato ---------------- */

export type TipoDeMovimento = "venda" | "liberacao" | "taxa" | "credito" | "devolucao" | "repasse" | "antecipacao";

export const ROTULO_DO_MOVIMENTO: Record<TipoDeMovimento, string> = {
    venda: "Venda",
    liberacao: "Liberação",
    taxa: "Taxa ou custo",
    credito: "Crédito",
    devolucao: "Devolução",
    repasse: "Saque",
    antecipacao: "Antecipação",
};

export type Prova = "vendas" | "transacoes" | "comprovante" | "contrato" | "calendario";

export interface Movimento {
    id: string;
    data: string;
    tipo: TipoDeMovimento;
    /** O que foi, em uma linha ("Vendas do dia · 312 ingressos"). */
    titulo: string;
    evento: Evento;
    /** Valor do movimento, com sinal: positivo entrou, negativo saiu. */
    valor: number;
    /** Quanto o movimento mudou o Disponível. Zero: não mexeu no Disponível ("—"). */
    efeito: number;
    /** Por que o Disponível não mudou ("Saiu do antecipável"). */
    semEfeito?: string;
    /** Situação do repasse. */
    situacao?: "pago" | "agendado" | "falhou" | "devolvido";
    /** Painel de detalhe: o que foi, o efeito em cada parte e o link de prova. */
    descricao: string;
    partes: Array<{ parte: string; valor: number }>;
    prova: Prova;
    repasse?: Repasse;
    antecipacao?: Antecipacao;
}

const ROTULO_DA_DEVOLUCAO_CURTO: Record<TipoDeDevolucao, string> = { cancelamento: "Cancelamento", reembolso: "Reembolso parcial", contestacao: "Contestação no cartão", suspenso: "Ingresso suspenso" };

/**
 * Todos os movimentos dos últimos 90 dias, do mais antigo para o mais recente. Saem dos dados de
 * cada evento: o Extrato não tem números próprios, só conta em ordem o que os eventos já dizem.
 */
export function movimentos(eventos: Evento[]): Movimento[] {
    const inicio = somarDias(HOJE, -DIAS_DO_EXTRATO);
    const lista: Movimento[] = [];
    const incluir = (m: Omit<Movimento, "id">) => {
        if (m.data >= inicio && m.data <= HOJE) lista.push({ ...m, id: `${m.evento.id}-${m.tipo}-${m.data}-${lista.length}` });
    };
    for (const e of eventos) {
        const mil = e.vendido / 1000;
        if (e.emVendas) {
            // Vendas dos últimos três dias. As de hoje são o que está em processamento (quando entra hoje).
            [mil * 20, mil * 17, mil * 23].forEach((valor, dias) => {
                const ingressos = Math.round(valor / 140);
                incluir({
                    data: somarDias(HOJE, -dias),
                    tipo: "venda",
                    titulo: `Vendas do dia · ${ingressos} ingressos`,
                    evento: e,
                    valor,
                    efeito: 0,
                    semEfeito: "Em processamento",
                    descricao: `${ingressos} ingressos vendidos neste dia. As vendas entram primeiro em Em processamento e depois seguem para Retido e Antecipável.`,
                    partes: [{ parte: "Em processamento", valor }],
                    prova: "vendas",
                });
            });
        }
        for (const l of e.liberadas ?? []) {
            const de = l.tipo === "aLiberar" ? "Antecipável" : "Retido";
            incluir({
                data: l.data,
                tipo: "liberacao",
                titulo: `${de} liberado`,
                evento: e,
                valor: l.valor,
                efeito: l.valor,
                descricao: `O valor chegou à data de liberação e passou de ${de} para o saldo disponível.`,
                partes: [
                    { parte: de, valor: -l.valor },
                    { parte: "Saldo disponível", valor: l.valor },
                ],
                prova: "calendario",
            });
        }
        for (const c of e.custosExtras ?? []) {
            incluir({
                data: c.data,
                tipo: "taxa",
                titulo: c.titulo,
                evento: e,
                valor: -c.valor,
                efeito: -c.valor,
                descricao: c.motivo,
                partes: [{ parte: "Saldo disponível", valor: -c.valor }],
                prova: "contrato",
            });
        }
        for (const c of e.creditosLista) {
            incluir({
                data: c.data,
                tipo: "credito",
                titulo: c.titulo,
                evento: e,
                valor: c.valor,
                efeito: c.valor,
                descricao: c.motivo,
                partes: [{ parte: "Saldo disponível", valor: c.valor }],
                prova: "contrato",
            });
        }
        for (const d of e.ajustesLista) {
            const doDisponivel = d.origem !== "antecipavel";
            incluir({
                data: d.data,
                tipo: "devolucao",
                titulo: d.devolucao ? ROTULO_DA_DEVOLUCAO_CURTO[d.devolucao] : d.titulo,
                evento: e,
                valor: -d.valor,
                efeito: doDisponivel ? -d.valor : 0,
                semEfeito: doDisponivel ? undefined : "Saiu do Antecipável",
                descricao: d.motivo,
                partes: [{ parte: doDisponivel ? "Saldo disponível" : "Antecipável", valor: -d.valor }],
                prova: "transacoes",
            });
        }
        for (const a of e.antecipacoes ?? []) {
            incluir({
                data: a.data,
                tipo: "antecipacao",
                titulo: "Antecipação",
                evento: e,
                valor: a.valor - a.taxa,
                efeito: a.valor - a.taxa,
                descricao: "Você antecipou parte do Antecipável. O valor líquido, já sem a taxa da antecipação, entrou no saldo disponível.",
                partes: [
                    { parte: "Antecipável", valor: -a.valor },
                    { parte: "Saldo disponível", valor: a.valor - a.taxa },
                ],
                prova: "comprovante",
                antecipacao: a,
            });
        }
        for (const r of e.repasses) {
            if (r.situacao === "pago") {
                incluir({
                    data: r.data,
                    tipo: "repasse",
                    titulo: "Saque pago",
                    evento: e,
                    valor: -r.valor,
                    efeito: -r.valor,
                    situacao: "pago",
                    descricao: "O saque foi pago na conta de destino.",
                    partes: [
                        { parte: "Saldo disponível", valor: -r.valor },
                        { parte: "Sacado", valor: r.valor },
                    ],
                    prova: "comprovante",
                    repasse: r,
                });
            } else if (r.situacao === "agendado") {
                incluir({
                    data: r.pedidoEm ?? HOJE,
                    tipo: "repasse",
                    titulo: "Saque solicitado",
                    evento: e,
                    valor: -r.valor,
                    efeito: -r.valor,
                    situacao: "agendado",
                    descricao: "O valor saiu do saldo disponível quando você solicitou o saque e espera a data de pagamento.",
                    partes: [
                        { parte: "Saldo disponível", valor: -r.valor },
                        { parte: "Saque agendado", valor: r.valor },
                    ],
                    prova: "comprovante",
                    repasse: r,
                });
            } else {
                incluir({
                    data: r.data,
                    tipo: "repasse",
                    titulo: "Saque solicitado",
                    evento: e,
                    valor: -r.valor,
                    efeito: -r.valor,
                    situacao: "falhou",
                    descricao: "O valor saiu do saldo disponível quando você solicitou o saque.",
                    partes: [{ parte: "Saldo disponível", valor: -r.valor }],
                    prova: "comprovante",
                    repasse: r,
                });
                incluir({
                    data: somarDias(r.data, 1),
                    tipo: "repasse",
                    titulo: "Saque não concluído",
                    evento: e,
                    valor: r.valor,
                    efeito: r.valor,
                    situacao: "devolvido",
                    descricao: r.nota ?? "O saque não foi concluído e o valor voltou para o seu saldo disponível.",
                    partes: [{ parte: "Saldo disponível", valor: r.valor }],
                    prova: "comprovante",
                    repasse: r,
                });
            }
        }
    }
    // Do mais antigo para o mais recente; no mesmo dia, o que entra vem antes do que sai.
    return lista.sort((a, b) => a.data.localeCompare(b.data) || b.efeito - a.efeito);
}

export interface LinhaDoExtrato extends Movimento {
    /** Disponível da organização depois deste movimento. */
    apos: number;
}

export interface Extrato {
    de: string;
    ate: string;
    saldoInicial: number;
    saldoFinal: number;
    /** Tudo o que entrou no Disponível no período (sem o repasse não concluído que saiu e voltou no período). */
    entradas: number;
    /** Tudo o que saiu do Disponível no período, como número positivo. */
    saidas: number;
    /** Entradas e saídas por tipo de movimento, do maior para o menor. */
    porTipo: { entradas: Array<{ tipo: TipoDeMovimento; valor: number }>; saidas: Array<{ tipo: TipoDeMovimento; valor: number }> };
    linhas: LinhaDoExtrato[];
}

/**
 * Extrato de um período: o Disponível no começo, cada movimento com o Disponível depois dele, e o
 * Disponível no fim. Conta de trás para a frente a partir do Disponível de hoje, e de novo para a
 * frente: as duas contas têm de dar o mesmo número (`conferirContas`).
 * O resumo (entradas e saídas) fecha a mesma conta: inicial + entradas − saídas = final.
 */
export function extrato(eventos: Evento[], de: string, ate: string): Extrato {
    const todos = movimentos(eventos);
    const hoje = totalizar(eventos).disponivel;
    const saldoFinal = hoje - todos.filter((m) => m.data > ate).reduce((s, m) => s + m.efeito, 0);
    const doPeriodo = todos.filter((m) => m.data >= de && m.data <= ate);
    const saldoInicial = saldoFinal - doPeriodo.reduce((s, m) => s + m.efeito, 0);
    let corrente = saldoInicial;
    const linhas = doPeriodo.map((m) => ({ ...m, apos: (corrente += m.efeito) }));
    // Repasse não concluído: o valor saiu e voltou. Com as duas pontas no período, ele não conta nem
    // como saída nem como entrada no resumo (o saldo não muda); na lista, as duas linhas continuam.
    const voltou = new Set(doPeriodo.filter((m) => m.situacao === "devolvido").map((m) => m.repasse));
    const anulados = new Set(doPeriodo.filter((m) => m.situacao === "falhou" && voltou.has(m.repasse)).map((m) => m.repasse));
    const agrupar = (sinal: 1 | -1) => {
        const mapa = new Map<TipoDeMovimento, number>();
        for (const m of doPeriodo) if (m.efeito * sinal > 0 && !(m.repasse && anulados.has(m.repasse))) mapa.set(m.tipo, (mapa.get(m.tipo) ?? 0) + m.efeito * sinal);
        return [...mapa.entries()].map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);
    };
    const porTipo = { entradas: agrupar(1), saidas: agrupar(-1) };
    const total = (itens: Array<{ valor: number }>) => itens.reduce((s, i) => s + i.valor, 0);
    return { de, ate, saldoInicial, saldoFinal, entradas: total(porTipo.entradas), saidas: total(porTipo.saidas), porTipo, linhas };
}

/** Repasse já solicitado que ainda vai ser pago: o valor já saiu do Disponível e espera a data. */
export interface RepasseAgendado {
    evento: Evento;
    repasse: Repasse;
    /** Id do movimento "Repasse solicitado" no Extrato, quando ele está nos últimos 90 dias. */
    movimento?: string;
}

export function repassesAgendados(eventos: Evento[]): RepasseAgendado[] {
    const doExtrato = movimentos(eventos);
    return eventos
        .flatMap((evento) => evento.repasses.filter((r) => r.situacao === "agendado").map((repasse) => ({ evento, repasse, movimento: doExtrato.find((m) => m.repasse === repasse)?.id })))
        .sort((a, b) => a.repasse.data.localeCompare(b.repasse.data));
}

export interface ComposicaoDoRepasse {
    linhas: Array<{ id: string; titulo: string; data?: string; valor: number }>;
    total: number;
}

/**
 * De onde veio o valor de um repasse: os movimentos mais recentes do evento que mexeram no Disponível
 * (desde o repasse anterior), até cobrir o valor, mais o que já estava disponível antes (ou menos o
 * que ficou no Disponível).
 * A soma das linhas é sempre o valor do repasse (`conferirContas`).
 */
export function composicaoDoRepasse(evento: Evento, repasse: Repasse): ComposicaoDoRepasse {
    const quando = (r: Repasse) => r.pedidoEm ?? r.data;
    const anterior = evento.repasses
        .filter((r) => r !== repasse && r.situacao !== "falhou" && quando(r) < quando(repasse))
        .map(quando)
        .sort()
        .pop();
    // Do movimento mais recente para trás, até cobrir o valor do repasse: o que veio antes já estava no Disponível.
    const linhas: ComposicaoDoRepasse["linhas"] = [];
    let coberto = 0;
    for (const m of movimentos([evento]).reverse()) {
        if (coberto >= repasse.valor) break;
        if (m.tipo === "repasse" || m.efeito === 0 || m.data > quando(repasse) || (anterior && m.data <= anterior)) continue;
        linhas.unshift({ id: m.id, titulo: m.titulo, data: m.data, valor: m.efeito });
        coberto += m.efeito;
    }
    const resto = repasse.valor - linhas.reduce((s, l) => s + l.valor, 0);
    if (resto > 0) linhas.unshift({ id: "antes", titulo: "Já estava no saldo disponível do evento", valor: resto });
    if (resto < 0) linhas.push({ id: "ficou", titulo: "Ficou no saldo disponível do evento", valor: resto });
    return { linhas, total: repasse.valor };
}

export type PassoDoGrafico = "dia" | "semana" | "mes";

export interface RecorteDoCalendario {
    passo: PassoDoGrafico;
    periodos: PeriodoDoCalendario[];
    /** Soma das barras: tudo o que libera entre `de` e `ate`. */
    total: number;
}

/**
 * O gráfico do Calendário para um período escolhido no filtro de data. O passo acompanha o tamanho
 * do período: até 14 dias, uma barra por dia; até 12 semanas, uma por semana (contadas a partir do
 * primeiro dia); acima disso, uma por mês. O que não tem data fica de fora, como na lista filtrada.
 */
export function recorteDoCalendario(entradas: Entrada[], de: string, ate: string): RecorteDoCalendario {
    const dias = Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000) + 1;
    const passo: PassoDoGrafico = dias <= 14 ? "dia" : dias <= 84 ? "semana" : "mes";
    const periodos: PeriodoDoCalendario[] = [];
    const novo = (inicio: string, fim: string) => periodos.push({ de: inicio, ate: fim > ate ? ate : fim, porGrupo: { processamento: 0, retido: 0, aLiberar: 0 }, total: 0 });
    if (passo === "mes") {
        let [ano, mes] = [Number(de.slice(0, 4)), Number(de.slice(5, 7))];
        for (let inicio = de; inicio <= ate; ) {
            novo(inicio, new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10));
            mes += 1;
            if (mes === 13) [ano, mes] = [ano + 1, 1];
            inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
        }
    } else {
        const tamanho = passo === "dia" ? 1 : 7;
        for (let inicio = de; inicio <= ate; inicio = somarDias(inicio, tamanho)) novo(inicio, somarDias(inicio, tamanho - 1));
    }
    for (const e of entradas) {
        if (!e.data) continue;
        const periodo = periodos.find((p) => e.data! >= p.de && e.data! <= p.ate!);
        if (!periodo) continue;
        periodo.porGrupo[GRUPO_DA_ENTRADA[e.tipo]] += e.valor;
        periodo.total += e.valor;
    }
    return { passo, periodos, total: periodos.reduce((s, p) => s + p.total, 0) };
}

/* ---------------- fechamento mensal ---------------- */

const NOME_DO_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface Fechamento extends Extrato {
    /** "Novembro de 2026". */
    mes: string;
    /** O mês ainda não terminou: o fechamento vai até hoje. */
    parcial: boolean;
}

/**
 * Fechamento de cada mês inteiro dentro dos 90 dias do Extrato, mais o mês corrente até hoje, do
 * mais recente para o mais antigo. Cada um fecha (início + entradas − saídas = fim) e o fim de um
 * mês é o início do seguinte (`conferirContas`).
 */
export function fechamentos(eventos: Evento[]): Fechamento[] {
    const limite = somarDias(HOJE, -DIAS_DO_EXTRATO);
    const lista: Fechamento[] = [];
    let ano = Number(HOJE.slice(0, 4));
    let mes = Number(HOJE.slice(5, 7));
    for (;;) {
        const de = `${ano}-${String(mes).padStart(2, "0")}-01`;
        if (de < limite) break;
        const ultimoDia = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
        const ate = ultimoDia > HOJE ? HOJE : ultimoDia;
        lista.push({ ...extrato(eventos, de, ate), mes: `${NOME_DO_MES[mes - 1]} de ${ano}`, parcial: ultimoDia > HOJE });
        mes -= 1;
        if (mes === 0) {
            mes = 12;
            ano -= 1;
        }
    }
    return lista;
}

/* ---------------- registro (rastreabilidade) ---------------- */

/** Membros da organização que podem pedir repasse e antecipação (nomes fictícios). */
const MEMBROS = ["Marina Duarte", "Rafael Antunes", "Camila Prado"];

export interface Registro {
    /** Código para citar no atendimento e bater com o comprovante ("RP-482913"). */
    codigo: string;
    /** Quem pediu, e quando (data ISO e hora "14:32"). */
    solicitante: string;
    data: string;
    hora: string;
}

/** Número estável a partir de um texto: o mesmo repasse tem sempre o mesmo código. */
const semente = (texto: string) => [...texto].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1_000_003, 7);

/** Código, solicitante e horário de um repasse ou de uma antecipação. Dados ilustrativos (NOTAS.md). */
export function registro(prefixo: "SQ" | "AN", evento: Evento, data: string, valor: number): Registro {
    const n = semente(`${prefixo}-${evento.id}-${data}-${valor}`);
    return {
        codigo: `${prefixo}-${String(100_000 + (n % 900_000))}`,
        solicitante: MEMBROS[n % MEMBROS.length],
        data,
        hora: `${String(9 + (n % 9)).padStart(2, "0")}:${String((n * 7) % 60).padStart(2, "0")}`,
    };
}
export const registroDoRepasse = (evento: Evento, r: Repasse) => registro("SQ", evento, r.pedidoEm ?? somarDias(r.data, r.situacao === "pago" ? -2 : 0), r.valor);
export const registroDaAntecipacao = (evento: Evento, a: Antecipacao) => registro("AN", evento, a.data, a.valor);

/* ---------------- verificação ---------------- */

/**
 * Confere as contas em todos os cenários e devolve o que não fecha (lista vazia = tudo certo):
 *  - as duas regras de soma de cada evento e as listas de cada evento contra os seus totais;
 *  - o total da organização (a conta do topo) contra a soma dos 48 eventos;
 *  - o Calendário: as liberações somam Em processamento + Retido + Antecipável (organização e evento);
 *  - o Extrato: saldo inicial + movimentos que afetam o Disponível = saldo final = Disponível do card;
 *    o resumo (inicial + entradas − saídas = final), os agendados e a composição de cada repasse;
 *  - cada painel de detalhe: a soma das linhas é o valor do bloco;
 *  - os cards do topo e os itens da legenda saem do mesmo total.
 */
export function conferirContas(): string[] {
    const erros: string[] = [];
    const partes = (e: Pick<Evento, (typeof CAMPOS)[number]>) => e.processamento + e.retidoEvento + e.retidoSeguranca + e.aLiberar + e.disponivel + e.agendado + e.recebido;
    const soma = <T,>(itens: T[], valor: (item: T) => number) => itens.reduce((s, i) => s + valor(i), 0);
    for (const cenario of ["normal", "negativo", "bloqueado"] as const) {
        const eventos = eventosDoCenario(cenario);
        if (eventos.length !== TOTAL_DE_EVENTOS) erros.push(`${cenario}: ${eventos.length} eventos, eram para ser ${TOTAL_DE_EVENTOS}`);
        if (new Set(eventos.map((e) => e.id)).size !== eventos.length) erros.push(`${cenario}: há eventos com o mesmo id`);
        for (const e of eventos) {
            const onde = `${cenario}/${e.id}`;
            if (partes(e) !== seuDinheiro(e)) erros.push(`${onde}: as partes somam ${partes(e)}, o Líquido é ${seuDinheiro(e)}`);
            for (const c of CAMPOS) if (!Number.isInteger(e[c]) || (c !== "disponivel" && e[c] < 0)) erros.push(`${onde}: ${c} = ${e[c]}`);
            const doTipo = (tipo: TipoLiberacao) => soma(e.liberacoes.filter((l) => l.tipo === tipo), (l) => l.valor);
            for (const tipo of ["retidoEvento", "retidoSeguranca", "aLiberar"] as const) {
                if (doTipo(tipo) !== e[tipo]) erros.push(`${onde}: calendário de ${tipo} soma ${doTipo(tipo)}, o evento tem ${e[tipo]}`);
            }
            if (e.liberacoes.some((l) => l.data <= HOJE)) erros.push(`${onde}: liberação com data que já passou`);
            // Calendário do evento: tudo o que ainda entra no Disponível.
            if (soma(entradasDoCalendario([e]), (x) => x.valor) !== e.processamento + retido(e) + e.aLiberar) erros.push(`${onde}: o calendário não soma Em processamento + Retido + Antecipável`);
            // Painéis de detalhe do evento.
            if (soma(e.ajustesLista, (l) => l.valor) !== e.ajustes) erros.push(`${onde}: a lista de devoluções não soma Devoluções`);
            if (e.ajustesLista.some((l) => !l.devolucao || !l.origem)) erros.push(`${onde}: devolução sem tipo ou sem origem`);
            if (soma(e.creditosLista, (l) => l.valor) !== e.creditos) erros.push(`${onde}: a lista de créditos não soma Créditos`);
            if (e.creditosLista.some((l) => !l.credito)) erros.push(`${onde}: crédito sem tipo`);
            const taxas = composicaoDasTaxas(e);
            if (soma(taxas, (t) => t.valor) !== e.taxas) erros.push(`${onde}: a composição das taxas soma ${soma(taxas, (t) => t.valor)}, Taxas e custos é ${e.taxas}`);
            if (taxas.some((t) => !Number.isInteger(t.valor) || t.valor <= 0)) erros.push(`${onde}: linha de taxa com valor inválido`);
            const repasses = (s: Repasse["situacao"]) => soma(e.repasses.filter((r) => r.situacao === s), (r) => r.valor);
            if (repasses("pago") !== e.recebido) erros.push(`${onde}: repasses pagos somam ${repasses("pago")}, Repassado é ${e.recebido}`);
            if (repasses("agendado") !== e.agendado) erros.push(`${onde}: repasses agendados não somam Agendado`);
            if (e.repasses.some((r) => r.situacao === "pago" && r.data > HOJE)) erros.push(`${onde}: repasse pago com data no futuro`);
        }
        // As duas linhas da tela: Líquido − Sacado − Saque agendado = Saldo total; Saldo total − A liberar = Saldo disponível.
        for (const e of eventos) {
            const aLiberar = e.aLiberar + e.retidoEvento + e.retidoSeguranca + e.processamento;
            if (seuDinheiro(e) - e.recebido - e.agendado - aLiberar !== e.disponivel) erros.push(`${cenario}/${e.id}: Líquido − Sacado − Saque agendado − A liberar não dá o Saldo disponível`);
        }
        // O topo (total da organização) contra a soma evento a evento.
        const t = totalizar(eventos);
        const liquidoDosEventos = soma(eventos, seuDinheiro);
        if (t.seuDinheiro !== liquidoDosEventos) erros.push(`${cenario}: o Líquido do topo é ${t.seuDinheiro}, a soma dos eventos é ${liquidoDosEventos}`);
        if (partes(t) !== t.seuDinheiro) erros.push(`${cenario}: as partes do topo somam ${partes(t)}, o Líquido é ${t.seuDinheiro}`);
        if (t.vendido - t.taxas + t.creditos - t.ajustes !== t.seuDinheiro) erros.push(`${cenario}: a conta do topo não fecha`);
        // Painéis de detalhe da organização: a soma das linhas é o valor do bloco.
        if (soma(eventos, (e) => soma(composicaoDasTaxas(e), (x) => x.valor)) !== t.taxas) erros.push(`${cenario}: o painel de Taxas e custos não soma o bloco`);
        if (soma(eventos, (e) => soma(e.creditosLista, (l) => l.valor)) !== t.creditos) erros.push(`${cenario}: o painel de Créditos não soma o bloco`);
        if (soma(eventos, (e) => soma(e.ajustesLista, (l) => l.valor)) !== t.ajustes) erros.push(`${cenario}: o painel de Devoluções não soma o bloco`);
        if (soma(eventos, (e) => e.vendido) !== t.vendido) erros.push(`${cenario}: o painel de Vendido por evento não soma o bloco`);
        // Calendário da organização e o resumo em três faixas.
        const entradas = entradasDoCalendario(eventos);
        const aEntrar = t.processamento + t.retido + t.aLiberar;
        if (t.seuDinheiro - t.recebido - t.agendado - aEntrar !== t.disponivel) erros.push(`${cenario}: Líquido − Sacado − Saque agendado − A liberar (${aEntrar}) não dá o Saldo disponível do topo`);
        if (soma(entradas, (x) => x.valor) !== aEntrar) erros.push(`${cenario}: o Calendário soma ${soma(entradas, (x) => x.valor)}, eram ${aEntrar}`);
        const resumo = resumoDoCalendario(entradas);
        if (resumo.em7 + resumo.em30 + resumo.depois !== aEntrar) erros.push(`${cenario}: as três faixas do Calendário não somam o total`);
        const semanas = semanasDoCalendario(entradas);
        if (semanas.total !== aEntrar) erros.push(`${cenario}: o gráfico por semana do Calendário soma ${semanas.total}, eram ${aEntrar}`);
        if (semanas.semData !== resumo.semData) erros.push(`${cenario}: o "sem data" do gráfico e o do resumo do Calendário não batem`);
        for (const s of [...semanas.semanas, semanas.depois]) if (s.porGrupo.processamento + s.porGrupo.retido + s.porGrupo.aLiberar !== s.total) erros.push(`${cenario}: semana de ${s.de} não soma os seus tipos`);
        // Extrato: 30 dias (padrão) e 90 dias.
        for (const dias of [30, DIAS_DO_EXTRATO]) {
            const x = extrato(eventos, somarDias(HOJE, -dias), HOJE);
            const afetam = soma(x.linhas, (l) => l.efeito);
            if (x.saldoInicial + afetam !== x.saldoFinal) erros.push(`${cenario}: Extrato de ${dias} dias: ${x.saldoInicial} + ${afetam} ≠ ${x.saldoFinal}`);
            if (x.saldoFinal !== t.disponivel) erros.push(`${cenario}: Extrato de ${dias} dias termina em ${x.saldoFinal}, o Disponível do card é ${t.disponivel}`);
            const ultima = x.linhas[x.linhas.length - 1];
            if (ultima && ultima.apos !== x.saldoFinal) erros.push(`${cenario}: Extrato de ${dias} dias: a última linha fica em ${ultima.apos}, o saldo final é ${x.saldoFinal}`);
            if (x.linhas.some((l) => !Number.isInteger(l.apos))) erros.push(`${cenario}: Extrato de ${dias} dias com saldo quebrado`);
            if (x.saldoInicial + x.entradas - x.saidas !== x.saldoFinal) erros.push(`${cenario}: Extrato de ${dias} dias: o resumo não fecha (${x.saldoInicial} + ${x.entradas} − ${x.saidas} ≠ ${x.saldoFinal})`);
        }
        // Gráfico com filtro de data: as barras somam o que a lista filtrada mostra, em qualquer passo (dia, semana, mês).
        for (const dias of [0, 7, 30, 60, 400]) {
            const ate = somarDias(HOJE, dias);
            const naLista = soma(entradas.filter((x) => x.data && x.data >= HOJE && x.data <= ate), (x) => x.valor);
            const recorte = recorteDoCalendario(entradas, HOJE, ate);
            if (recorte.total !== naLista) erros.push(`${cenario}: o gráfico de ${dias} dias soma ${recorte.total}, a lista do mesmo período soma ${naLista}`);
        }
        // Fechamentos mensais: cada um fecha, o fim de um é o início do seguinte e o último termina no card.
        const meses = fechamentos(eventos);
        meses.forEach((m, i) => {
            if (m.saldoInicial + m.entradas - m.saidas !== m.saldoFinal) erros.push(`${cenario}: o fechamento de ${m.mes} não fecha`);
            const anterior = meses[i + 1];
            if (anterior && anterior.saldoFinal !== m.saldoInicial) erros.push(`${cenario}: ${anterior.mes} termina em ${anterior.saldoFinal} e ${m.mes} começa em ${m.saldoInicial}`);
        });
        if (meses[0] && meses[0].saldoFinal !== t.disponivel) erros.push(`${cenario}: o fechamento do mês corrente não termina no Disponível do card`);
        // Agendados do Extrato somam o Agendado da legenda; a composição de cada repasse soma o repasse.
        if (soma(repassesAgendados(eventos), (a) => a.repasse.valor) !== t.agendado) erros.push(`${cenario}: os repasses agendados do Extrato não somam Agendado`);
        for (const e of eventos) {
            for (const r of e.repasses) {
                const c = composicaoDoRepasse(e, r);
                if (soma(c.linhas, (l) => l.valor) !== r.valor) erros.push(`${cenario}/${e.id}: a composição do repasse de ${r.data} não soma ${r.valor}`);
            }
        }
        // Cards do topo = itens da legenda: os dois leem o mesmo total; o que pode divergir é o Retido.
        if (t.retido !== t.retidoEvento + t.retidoSeguranca) erros.push(`${cenario}: Retido da legenda ≠ retido até o evento + retido por segurança`);
        // Rodada 01: a conta geral fecha e é a mesma na Visão geral e no Extrato, com e sem filtro de evento.
        for (const escopo of [eventos, ...eventos.slice(0, 6).map((e) => [e])]) {
            const c = contaGeral(escopo);
            const onde = `${cenario}/${escopo.length === 1 ? escopo[0].id : "todos"}`;
            if (c.vendido - c.descontos - c.sacado !== c.aReceber) erros.push(`${onde}: Vendido − descontos − Sacado ≠ A receber`);
            if (c.vendido - c.descontos - c.sacado - c.agendado !== c.saldoTotal || c.disponivel + c.aLiberar !== c.saldoTotal) erros.push(`${onde}: a conta de relance não chega ao Saldo total (${c.saldoTotal})`);
            if (c.disponivel + c.agendado + c.aLiberar !== c.aReceber) erros.push(`${onde}: Saldo disponível + Saque agendado + A liberar = ${c.disponivel + c.agendado + c.aLiberar}, A receber é ${c.aReceber}`);
            for (const de of [somarDias(HOJE, -DIAS_DO_EXTRATO), `${HOJE.slice(0, 8)}01`]) {
                const sq = saquesDoPeriodo(escopo, { de, ate: HOJE });
                if (sq.antes < 0) erros.push(`${onde}: saques pagos desde ${de} (${sq.pagos}) passam do Total sacado (${sq.total})`);
                if (sq.antes + sq.pagos + sq.depois !== c.sacado) erros.push(`${onde}: os saques do período não chegam ao Total sacado`);
            }
            const ent = entradasDoCalendario(escopo);
            const meses = mesesDoCalendario(ent);
            const semData = ent.filter((e) => !e.data).reduce((s, e) => s + e.valor, 0);
            if (meses.reduce((s, m) => s + m.total, 0) + semData !== c.aLiberar) erros.push(`${onde}: os meses do Calendário não somam o A liberar`);
            if (meses.some((m) => m.de.slice(0, 7) !== m.ate!.slice(0, 7))) erros.push(`${onde}: há barra do Calendário cobrindo dois meses`);
        }
    }
    return erros;
}

/* ---------------- rodada 01 (validação com produtor): conta geral, saques do período, calendário por mês e por dia ---------------- */

/**
 * A conta que o produtor faz de cabeça ("vendido menos pago") com o que falta para ela fechar.
 * Vendido − descontos − Sacado − Saque agendado = Saldo total, e Saldo total = Saldo disponível + A liberar.
 * A Visão geral e o Extrato leem daqui: os totais não têm como divergir entre as abas (R01-01).
 */
export interface ContaGeral {
    vendido: number;
    /** Taxas e custos + Devoluções − Créditos: o que separa o Vendido do Líquido. */
    descontos: number;
    liquido: number;
    sacado: number;
    /** Líquido − Sacado: o que ainda vai para o produtor (inclui o saque agendado). */
    aReceber: number;
    /** Líquido − Sacado − Saque agendado = Saldo disponível + A liberar. O mesmo "Saldo total" do Resumo financeiro. */
    saldoTotal: number;
    disponivel: number;
    agendado: number;
    /** Em processamento + Retido + Antecipável. */
    aLiberar: number;
    proximaLiberacao: { data: string; valor: number } | null;
    proximoSaque: { data: string; valor: number } | null;
}

export function contaGeral(eventos: Evento[]): ContaGeral {
    const t = totalizar(eventos);
    const comData = entradasDoCalendario(eventos).filter((e) => e.data);
    const primeira = comData[0]?.data;
    const agendados = repassesAgendados(eventos);
    const diaDoSaque = agendados[0]?.repasse.data;
    return {
        vendido: t.vendido,
        descontos: t.taxas + t.ajustes - t.creditos,
        liquido: t.seuDinheiro,
        sacado: t.recebido,
        aReceber: t.seuDinheiro - t.recebido,
        saldoTotal: t.seuDinheiro - t.recebido - t.agendado,
        disponivel: t.disponivel,
        agendado: t.agendado,
        aLiberar: t.processamento + t.retido + t.aLiberar,
        proximaLiberacao: primeira ? { data: primeira, valor: comData.filter((e) => e.data === primeira).reduce((s, e) => s + e.valor, 0) } : null,
        proximoSaque: diaDoSaque ? { data: diaDoSaque, valor: agendados.filter((a) => a.repasse.data === diaDoSaque).reduce((s, a) => s + a.repasse.valor, 0) } : null,
    };
}

/**
 * Como os saques do período do Extrato chegam ao Total sacado da Visão geral (R01-01-b):
 * sacado antes do período + pagos no período + pagos depois do período = Total sacado.
 * O saque agendado já saiu do Saldo disponível, mas ainda não conta como Sacado.
 */
export interface SaquesDoPeriodo {
    antes: number;
    pagos: number;
    depois: number;
    agendados: number;
    total: number;
}

export function saquesDoPeriodo(eventos: Evento[], x: Pick<Extrato, "de" | "ate">): SaquesDoPeriodo {
    const pagos = movimentos(eventos).filter((m) => m.tipo === "repasse" && m.situacao === "pago" && m.efeito < 0);
    const soma = (itens: Movimento[]) => itens.reduce((s, m) => s - m.efeito, 0);
    const noPeriodo = soma(pagos.filter((m) => m.data >= x.de && m.data <= x.ate));
    const depois = soma(pagos.filter((m) => m.data > x.ate));
    const total = totalizar(eventos).recebido;
    const agendados = movimentos(eventos)
        .filter((m) => m.tipo === "repasse" && m.situacao === "agendado" && m.data >= x.de && m.data <= x.ate)
        .reduce((s, m) => s - m.efeito, 0);
    return { antes: total - noPeriodo - depois, pagos: noPeriodo, depois, agendados, total };
}

const fimDoMes = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).toISOString().slice(0, 10);
const periodoVazio = (de: string, ate: string): PeriodoDoCalendario => ({ de, ate, porGrupo: { processamento: 0, retido: 0, aLiberar: 0 }, total: 0 });
function preencher(periodos: PeriodoDoCalendario[], entradas: Entrada[]) {
    for (const e of entradas) {
        if (!e.data) continue;
        const periodo = periodos.find((p) => e.data! >= p.de && e.data! <= p.ate!);
        if (!periodo) continue;
        periodo.porGrupo[GRUPO_DA_ENTRADA[e.tipo]] += e.valor;
        periodo.total += e.valor;
    }
    return periodos;
}

/**
 * Gráfico do Calendário por mês corrido (R01-06): uma barra por mês, de hoje até a última liberação
 * (ou o período do filtro). Nenhuma barra cobre dois meses; mês sem liberação aparece zerado.
 * O primeiro mês começa hoje: o que já liberou está no Extrato.
 */
export function mesesDoCalendario(entradas: Entrada[], de?: string, ate?: string): PeriodoDoCalendario[] {
    const inicio = de && de > HOJE ? de : HOJE;
    const comData = entradas.filter((e) => e.data && e.data >= inicio && (!ate || e.data <= ate));
    const fim = ate ?? comData.reduce((maior, e) => (e.data! > maior ? e.data! : maior), inicio);
    if (fim < inicio) return [];
    const periodos: PeriodoDoCalendario[] = [];
    // No máximo 24 barras: um período muito longo não cabe no gráfico.
    for (let dia = inicio; dia <= fim && periodos.length < 24; dia = somarDias(fimDoMes(dia), 1)) periodos.push(periodoVazio(dia, fimDoMes(dia) > fim ? fim : fimDoMes(dia)));
    return preencher(periodos, comData);
}

/** Gráfico do Calendário por dia, dentro de um mês só (`mes` = "2026-11"): do primeiro dia válido ao último, com os dias zerados. */
export function diasDoCalendario(entradas: Entrada[], mes: string, de?: string, ate?: string): PeriodoDoCalendario[] {
    const primeiro = [`${mes}-01`, HOJE, de ?? HOJE].sort().pop()!;
    const ultimo = [fimDoMes(`${mes}-01`), ate ?? "9999-12-31"].sort()[0];
    const periodos: PeriodoDoCalendario[] = [];
    for (let dia = primeiro; dia <= ultimo; dia = somarDias(dia, 1)) periodos.push(periodoVazio(dia, dia));
    return preencher(periodos, entradas);
}

/** Por que o saldo disponível de um evento está negativo (R01-05). Hoje a única causa nos dados é devolução. */
export interface MotivoDoNegativo {
    causa: "devolucao-recente" | "devolucao";
    valor: number;
    data: string;
}

export function motivoDoNegativo(e: Evento): MotivoDoNegativo | null {
    if (e.disponivel >= 0 || e.ajustesLista.length === 0) return null;
    const recentes = e.ajustesLista.filter((a) => a.data >= somarDias(HOJE, -30));
    const base = recentes.length ? recentes : e.ajustesLista;
    return { causa: recentes.length ? "devolucao-recente" : "devolucao", valor: base.reduce((s, a) => s + a.valor, 0), data: base.reduce((maior, a) => (a.data > maior ? a.data : maior), base[0].data) };
}

// `import.meta.env` só existe dentro do Vite; no Node (script de verificação) fica indefinido.
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) for (const erro of conferirContas()) console.error(`[finanças] ${erro}`);
