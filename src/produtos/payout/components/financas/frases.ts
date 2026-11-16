import type { ParteDaDistribuicao } from "./cascata";
import { calendario, compensacao, type Evento, type TipoLiberacao } from "./dados";
import { dataComDia, dataCurta, reais } from "./formato";

/*
 * Frases curtas, em linguagem de cliente, montadas a partir dos dados.
 * Regra dos ajustes v2: o rótulo explica; a legenda só entra quando traz um dado novo (data,
 * prazo, motivo). Sem dado novo, a legenda fica vazia.
 */

/** "Libera em 13/01/2027" quando há uma liberação só; "Próximo: R$ 260.000 em 21/11" quando há mais. */
function proximaLiberacao(eventos: Evento[], tipos: TipoLiberacao[]): string | undefined {
    const lista = calendario(eventos, tipos);
    if (lista.length === 0) return undefined;
    if (lista.length === 1) return `Libera em ${dataCurta(lista[0].data)}`;
    return `Próximo: ${reais(lista[0].valor)} em ${dataCurta(lista[0].data)}`;
}

/** Legenda de cada parte de "Seu dinheiro": só o dado novo de cada uma. */
export function detalhesDaDistribuicao(eventos: Evento[]): Partial<Record<ParteDaDistribuicao, string>> {
    const emProcessamento = eventos.filter((e) => e.processamento > 0);
    const entraHoje = emProcessamento.filter((e) => e.previsaoProcessamento === "hoje").reduce((s, e) => s + e.processamento, 0);
    const agendados = eventos.flatMap((e) => e.repasses.filter((r) => r.situacao === "agendado")).sort((a, b) => a.data.localeCompare(b.data));

    let processamento: string | undefined;
    if (emProcessamento.length === 1) processamento = emProcessamento[0].previsaoProcessamento === "hoje" ? "Até hoje, 18h" : "Quando as parcelas forem pagas";
    else if (entraHoje > 0) processamento = `${reais(entraHoje)} até hoje, 18h`;

    return {
        processamento,
        retido: proximaLiberacao(eventos, ["retidoEvento", "retidoSeguranca"]),
        aLiberar: proximaLiberacao(eventos, ["aLiberar"]),
        agendado: agendados.length === 1 ? `Em ${dataCurta(agendados[0].data)}` : agendados[0] ? `Próximo: ${reais(agendados[0].valor)} em ${dataCurta(agendados[0].data)}` : undefined,
    };
}

/** Frase de status do dinheiro do evento, para a lista de pastas. */
export function statusDoDinheiro(e: Evento): string {
    const proxima = e.liberacoes.slice().sort((a, b) => a.data.localeCompare(b.data))[0];
    if (e.disponivel < 0) {
        const abate = proxima ? ` · ${reais(proxima.valor)} abatem em ${dataCurta(proxima.data)}` : "";
        return `Saldo negativo de ${reais(-e.disponivel)}${abate}`;
    }
    const partes = [e.disponivel > 0 ? `${reais(e.disponivel)} disponíveis` : "Nada disponível agora"];
    // Diz qual dinheiro é: "a liberar" e "retido" são partes diferentes no resto da tela.
    if (proxima) partes.push(proxima.tipo === "aLiberar" ? `${reais(proxima.valor)} a liberar em ${dataCurta(proxima.data)}` : `${reais(proxima.valor)} retidos até ${dataCurta(proxima.data)}`);
    else if (e.recebido > 0) partes.push(`${reais(e.recebido)} já recebidos`);
    return partes.join(" · ");
}

/** Como o Disponível agora negativo da organização é compensado, em uma frase. `null` se não há débito. */
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
