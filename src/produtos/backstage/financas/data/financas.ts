import { lerDoc, salvar, type ContaFavorecida, type Repasse, type StatusDoRepasse } from "@/plataforma";
import { useResumos } from "../../eventos/data/vendas";
import { useOrganizacaoAtual } from "../../organizacoes/data/organizacao-atual";

/*
 * Finanças (FIN): as regras do app de repasses de produção (`ingresse/cashout`) sobre os dados do
 * protótipo. O saldo de cada evento vem do faturamento (o mesmo de Eventos e Relatórios), menos as
 * taxas e o que já foi pedido em repasses. Evento que já aconteceu tem tudo liberado; evento futuro
 * tem parte liberada e o resto "a liberar", que pode ser antecipado com taxa.
 */

/** Parte do faturamento que vira saldo da produtora (o resto são taxas da plataforma e do meio de pagamento). */
const LIQUIDO = 0.9;
/** Evento futuro: parte já liberada pelo plano de repasse (D+N da transação). */
const LIBERADO_ANTES_DO_EVENTO = 0.55;
/** Taxa de antecipação do contrato, em % (padrão de produção quando o contrato não tem). */
export const TAXA_ANTECIPACAO = 1.9;
/** Taxa extra para outras contas, em % do valor pedido. */
export const TAXA_OUTRAS_CONTAS = 0.5;
/** Repasse no próximo dia útil (Express). */
export const TAXA_EXPRESS = 12;

const STATUS_QUE_RESERVAM: StatusDoRepasse[] = ["analisando", "pendente", "agendado", "pago"];
export const STATUS_AGENDADOS: StatusDoRepasse[] = ["analisando", "pendente", "agendado"];

export const ROTULO_DO_STATUS: Record<StatusDoRepasse, { rotulo: string; cor: "success" | "blue" | "warning" | "error" }> = {
    pago: { rotulo: "Pago", cor: "success" },
    pendente: { rotulo: "Pendente", cor: "blue" },
    agendado: { rotulo: "Agendado", cor: "blue" },
    analisando: { rotulo: "Analisando", cor: "warning" },
    falhou: { rotulo: "Falhou", cor: "error" },
    rejeitado: { rotulo: "Rejeitado", cor: "error" },
    cancelado: { rotulo: "Cancelado", cor: "error" },
};

export interface SaldoDoEvento {
    eventoId: string;
    nome: string;
    capa: string;
    data: string;
    disponivel: number;
    aLiberar: number;
    /** "Total do evento": o máximo que dá para pedir hoje. */
    total: number;
}

const centavos = (v: number) => Math.floor(v * 100) / 100;
const hojeISO = () => new Date().toISOString().slice(0, 10);

/* ---------------------------- dados de exemplo ---------------------------- */

const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const CONTAS_INICIAIS: ContaFavorecida[] = [
    { id: "conta-contrato", titular: "Produtora (conta do contrato)", tipo: "pix", chavePix: "12.345.678/0001-90", documento: "12.345.678/0001-90", padraoDoContrato: true, criadaEm: dia(-200) },
];

/** Histórico de exemplo: dois repasses pagos e um em análise, do primeiro evento da organização. */
export const repassesIniciais = (eventoId?: string): Repasse[] =>
    eventoId
        ? [
              { id: "rep-ex-1", contaId: "conta-contrato", solicitante: "financeiro@produtora.com", liquidacoes: [{ eventoId, valor: 8200 }], valorSolicitado: 8200, taxaAntecipacao: 0, taxaTransferencia: 0, valorTransferido: 8200, modalidade: "basic", status: "pago", solicitadoEm: dia(-26), dataPrevista: dia(-22).slice(0, 10), concluidoEm: dia(-22) },
              { id: "rep-ex-2", contaId: "conta-contrato", solicitante: "financeiro@produtora.com", liquidacoes: [{ eventoId, valor: 5400 }], valorSolicitado: 5400, taxaAntecipacao: 0, taxaTransferencia: 12, valorTransferido: 5388, modalidade: "express", status: "pago", solicitadoEm: dia(-9), dataPrevista: dia(-8).slice(0, 10), concluidoEm: dia(-8) },
              { id: "rep-ex-3", contaId: "conta-contrato", solicitante: "financeiro@produtora.com", liquidacoes: [{ eventoId, valor: 3000 }], valorSolicitado: 3000, taxaAntecipacao: 0, taxaTransferencia: 0, valorTransferido: 3000, modalidade: "basic", status: "analisando", solicitadoEm: dia(-1), dataPrevista: proximaQuinta(new Date(Date.now() - 86_400_000)) },
          ]
        : [];

/* --------------------------------- saldo --------------------------------- */

export function useFinancas() {
    const org = useOrganizacaoAtual();
    const resumos = useResumos();
    const contas = org?.contasFavorecidas ?? CONTAS_INICIAIS;
    const repasses = org?.repasses ?? repassesIniciais(resumos[0]?.evento.id);

    const saldos: SaldoDoEvento[] = resumos
        .map((r) => {
            const passou = new Date(r.evento.data) < new Date();
            const liquido = r.faturamento * LIQUIDO;
            const liberado = passou ? liquido : liquido * LIBERADO_ANTES_DO_EVENTO;
            const antecipavel = liquido - liberado;
            const pedido = repasses
                .filter((p) => STATUS_QUE_RESERVAM.includes(p.status))
                .reduce((n, p) => n + p.liquidacoes.filter((l) => l.eventoId === r.evento.id).reduce((m, l) => m + l.valor, 0), 0);
            const liquidoAposPedidos = liberado - pedido;
            const disponivel = centavos(Math.max(liquidoAposPedidos, 0));
            const aLiberar = centavos(Math.max(antecipavel + Math.min(liquidoAposPedidos, 0), 0));
            return { eventoId: r.evento.id, nome: r.evento.nome, capa: r.evento.cover, data: r.evento.data, disponivel, aLiberar, total: centavos(disponivel + aLiberar) };
        })
        .sort((a, b) => b.data.localeCompare(a.data));

    const gravar = async (patch: { contasFavorecidas?: ContaFavorecida[]; repasses?: Repasse[] }) => {
        if (!org) return;
        const { eventos: _e, ativos: _a, ...base } = org;
        const doc = lerDoc("organizacoes", org.id) ?? base;
        // A primeira gravação materializa os exemplos, para não sumirem.
        await salvar("organizacoes", { ...doc, contasFavorecidas: contas, repasses, ...patch });
    };

    return { carregando: !org, saldos, contas, repasses, gravar };
}

/* ------------------------------ datas e taxas ------------------------------ */

const ehDiaUtil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6;
const somarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Basic: hoje + 2 dias (+3 depois do meio-dia), indo para a quinta-feira seguinte. */
export function proximaQuinta(agora = new Date()): string {
    let d = somarDias(agora, agora.getHours() >= 12 ? 3 : 2);
    while (d.getDay() !== 4) d = somarDias(d, 1);
    return d.toISOString().slice(0, 10);
}

/** Express: próximo dia útil (dois, depois do meio-dia ou fora de dia útil). */
export function proximoDiaUtil(agora = new Date()): string {
    let faltam = agora.getHours() >= 12 || !ehDiaUtil(agora) ? 2 : 1;
    let d = agora;
    while (faltam > 0) {
        d = somarDias(d, 1);
        if (ehDiaUtil(d)) faltam--;
    }
    return d.toISOString().slice(0, 10);
}

export interface OpcaoDeRepasse {
    modalidade: "express" | "basic";
    data: string;
    taxa: number;
    disponivel: boolean;
    motivo?: string;
}

/**
 * As modalidades que a produtora pode escolher, na ordem da tela: próximo dia útil (com taxa) e
 * quinta-feira (sem taxa). O repasse no mesmo dia (turbo) foi descontinuado e saiu da tela (FIN-47).
 */
export function opcoesDeRepasse(valor: number, outraConta: boolean): OpcaoDeRepasse[] {
    const extra = outraConta ? (valor * TAXA_OUTRAS_CONTAS) / 100 : 0;
    const basic = proximaQuinta();
    const express = proximoDiaUtil();
    const taxaExpress = TAXA_EXPRESS + extra;
    return [
        {
            modalidade: "express",
            data: express,
            taxa: taxaExpress,
            disponivel: valor > taxaExpress && express < basic,
            motivo: "Opção indisponível. O valor informado não cobre a taxa de repasse ou torna esta opção pouco vantajosa. Ajuste o valor ou selecione outra forma de repasse.",
        },
        { modalidade: "basic", data: basic, taxa: extra, disponivel: true },
    ];
}

/** Taxa de antecipação: só sobre o que passa do disponível de cada evento. */
export const taxaDeAntecipacao = (valores: Record<string, number>, saldos: SaldoDoEvento[]) =>
    centavos(Object.entries(valores).reduce((n, [id, v]) => n + (Math.max(0, v - (saldos.find((s) => s.eventoId === id)?.disponivel ?? 0)) * TAXA_ANTECIPACAO) / 100, 0));

/* -------------------------------- formatação -------------------------------- */

export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "05 nov 2026". */
export const dataCurtaFin = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso.length === 10 ? `${iso}T12:00` : iso);
    return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("pt-BR", { month: "short" }).replace(".", "")} ${d.getFullYear()}`;
};

/** "Hoje, 21 nov 2026", "Amanhã, 22 nov 2026" ou "26 nov 2026": o mesmo formato das datas da página (T9). */
export const dataPorExtenso = (iso: string) => {
    const texto = dataCurtaFin(iso);
    if (iso === hojeISO()) return `Hoje, ${texto}`;
    if (iso === somarDias(new Date(), 1).toISOString().slice(0, 10)) return `Amanhã, ${texto}`;
    return texto;
};

/** Pode cancelar: ainda não agendado no banco nem concluído, e o pagamento não é hoje (FIN-27). */
export const podeCancelar = (r: Repasse) => !["agendado", "rejeitado", "falhou", "cancelado", "pago"].includes(r.status) && r.dataPrevista !== hojeISO();

export const descricaoDaConta = (c: ContaFavorecida) => (c.tipo === "pix" ? `Chave Pix ${c.chavePix}` : `${c.banco}, agência ${c.agencia}, conta ${c.conta}`);

/** "Pix", "Conta corrente" ou "Conta poupança". */
export const tipoDaConta = (c: ContaFavorecida) => (c.tipo === "pix" ? "Pix" : c.tipo === "corrente" ? "Conta corrente" : "Conta poupança");
