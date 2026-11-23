import type { ParteDaDistribuicao } from "./cascata";
import { calendario, compensacao, type Evento, type TipoLiberacao } from "./dados";
import { dataComDia, dataCurta, reais } from "./formato";

/*
 * Frases curtas, em linguagem de cliente, montadas a partir dos dados.
 * O rótulo explica; a legenda só entra quando traz um dado novo (data, prazo, motivo).
 */

/** "Libera em 13/01/2027" quando há uma liberação só; "R$ 260.000 em 21/11" (a próxima) quando há mais. */
function proximaLiberacao(eventos: Evento[], tipos: TipoLiberacao[]): string | undefined {
    const lista = calendario(eventos, tipos);
    if (lista.length === 0) return undefined;
    if (lista.length === 1) return `Libera em ${dataCurta(lista[0].data)}`;
    return `${reais(lista[0].valor)} em ${dataCurta(lista[0].data)}`;
}

/** Legenda de cada parte de "Líquido por situação": só o dado novo de cada uma. */
export function detalhesDaDistribuicao(eventos: Evento[]): Partial<Record<ParteDaDistribuicao, string>> {
    const emProcessamento = eventos.filter((e) => e.processamento > 0);
    const entraHoje = emProcessamento.filter((e) => e.previsaoProcessamento === "hoje").reduce((s, e) => s + e.processamento, 0);
    const agendados = eventos.flatMap((e) => e.repasses.filter((r) => r.situacao === "agendado")).sort((a, b) => a.data.localeCompare(b.data));

    let processamento: string | undefined;
    if (emProcessamento.length === 1) processamento = emProcessamento[0].previsaoProcessamento === "hoje" ? "Libera hoje" : "A cada parcela paga";
    else if (entraHoje > 0) processamento = `${reais(entraHoje)} liberam hoje`;

    return {
        processamento,
        retido: proximaLiberacao(eventos, ["retidoEvento", "retidoSeguranca"]),
        aLiberar: proximaLiberacao(eventos, ["aLiberar"]),
        agendado: agendados.length === 1 ? `Para ${dataCurta(agendados[0].data)}` : agendados[0] ? `${reais(agendados[0].valor)} em ${dataCurta(agendados[0].data)}` : undefined,
    };
}

/**
 * Linha de apoio do evento na lista "Saldo por evento": sempre a próxima liberação, no mesmo formato.
 * O saldo disponível não entra aqui: ele é o número em destaque à direita da linha.
 */
export function proximaLiberacaoDoEvento(e: Evento): string {
    const proxima = e.liberacoes.slice().sort((a, b) => a.data.localeCompare(b.data))[0];
    if (proxima) return `Próxima liberação: ${reais(proxima.valor)} em ${dataCurta(proxima.data)} · ${proxima.tipo === "aLiberar" ? "Antecipável" : "Retido"}`;
    if (e.processamento > 0) return `${reais(e.processamento)} em processamento`;
    if (e.recebido > 0) return `${reais(e.recebido)} sacados`;
    return "Sem liberações previstas";
}

/** Como o Disponível negativo da organização é compensado, em uma frase. `null` se não há débito. */
export function fraseDeCompensacao(eventos: Evento[]): string | null {
    const c = compensacao(eventos);
    if (!c) return null;
    const lista = c.passos.map((p) => `${dataComDia(p.data)} (${reais(p.valor)})`);
    const quando = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}` : lista[0];
    const ultima = c.passos[c.passos.length - 1];
    if (!ultima) return "O valor sai das suas próximas liberações.";
    const depois = c.sobra > 0 ? ` A partir de ${dataComDia(ultima.data)}, você volta a ter ${reais(c.sobra)} disponíveis.` : "";
    return `O valor sai das suas próximas liberações: ${quando}.${depois}`;
}
