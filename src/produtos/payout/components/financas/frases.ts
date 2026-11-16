import type { ParteDaDistribuicao } from "./cascata";
import { calendario, compensacao, totalizar, type Evento } from "./dados";
import { dataComDia, reais } from "./formato";

/* Frases curtas, em linguagem de cliente, montadas a partir dos dados (briefing, seção 5). */

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios.replace("{n}", String(n)));

/** Uma linha para cada parte de "Seu dinheiro": quando entra, quando libera, quando cai. */
export function detalhesDaDistribuicao(eventos: Evento[]): Partial<Record<ParteDaDistribuicao, string>> {
    const t = totalizar(eventos);
    const emProcessamento = eventos.filter((e) => e.processamento > 0);
    const proximaRetida = calendario(eventos, ["retidoEvento", "retidoSeguranca"])[0];
    const proximaALiberar = calendario(eventos, ["aLiberar"])[0];
    const agendados = eventos.flatMap((e) => e.repasses.filter((r) => r.situacao === "agendado")).sort((a, b) => a.data.localeCompare(b.data));
    const pagos = eventos.flatMap((e) => e.repasses.filter((r) => r.situacao === "pago")).length;

    return {
        processamento:
            emProcessamento.length === 0
                ? "Nada em processamento"
                : emProcessamento.length === 1
                  ? emProcessamento[0].quandoProcessamento
                  : `${reais(emProcessamento[0].processamento)} entram até hoje, 18h`,
        retido: proximaRetida ? `Próxima liberação: ${dataComDia(proximaRetida.data)}` : "Nada retido",
        aLiberar: proximaALiberar ? `${reais(proximaALiberar.valor)} chegam em ${dataComDia(proximaALiberar.data)}` : "Nada a liberar",
        disponivel: t.disponivel > 0 ? "Para sacar agora" : t.disponivel < 0 ? "Compensado com o que você vai receber" : "Nada para sacar agora",
        agendado: agendados[0] ? `Cai na sua conta em ${dataComDia(agendados[0].data)}` : "Nenhum repasse agendado",
        recebido: pagos === 0 ? "Nenhum repasse pago ainda" : plural(pagos, "1 repasse pago", "{n} repasses pagos"),
    };
}

/** Frase de status do dinheiro do evento, para a lista de pastas. */
export function statusDoDinheiro(e: Evento): string {
    const proxima = e.liberacoes.slice().sort((a, b) => a.data.localeCompare(b.data))[0];
    if (e.disponivel < 0) {
        const abate = proxima ? ` · ${reais(proxima.valor)} abatem em ${dataComDia(proxima.data)}` : "";
        return `Saldo negativo de ${reais(-e.disponivel)}${abate}`;
    }
    const partes = [e.disponivel > 0 ? `${reais(e.disponivel)} disponíveis` : "Nada disponível agora"];
    if (proxima) partes.push(`${reais(proxima.valor)} chegam em ${dataComDia(proxima.data)}`);
    else if (e.recebido > 0) partes.push(`${reais(e.recebido)} já recebidos`);
    return partes.join(" · ");
}

/** Como o saldo negativo da organização é compensado, em uma frase. `null` se não há débito. */
export function fraseDeCompensacao(eventos: Evento[]): string | null {
    const c = compensacao(eventos);
    if (!c) return null;
    const lista = c.passos.map((p) => `${dataComDia(p.data)} (${reais(p.valor)})`);
    const quando = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}` : lista[0];
    const ultima = c.passos[c.passos.length - 1];
    if (!ultima) return "O valor é compensado com o próximo dinheiro que você receber.";
    const depois = c.sobra > 0 ? ` A partir de ${dataComDia(ultima.data)}, você volta a ter ${reais(c.sobra)} para sacar.` : "";
    return `O valor é compensado sozinho com as próximas liberações: ${quando}.${depois}`;
}
