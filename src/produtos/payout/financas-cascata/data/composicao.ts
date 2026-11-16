import { ROTULO_DA_PARTE, type Parte } from "../../components/financas/cascata";
import { ROTULO_LIBERACAO, retido, seuDinheiro, totalizar, type Evento } from "../../components/financas/dados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";
import { fraseDeCompensacao } from "../../components/financas/frases";

/* O que compõe cada parte da cascata: uma explicação curta e o valor aberto por evento. */

export interface Linha {
    texto: string;
    detalhe?: string;
    valor?: number;
    tom?: "erro";
    /** Repasse pago: oferece o comprovante. */
    comprovante?: boolean;
}

export interface Grupo {
    evento: Evento;
    valor: number;
    linhas: Linha[];
}

export interface Composicao {
    parte: Parte;
    titulo: string;
    valor: number;
    explicacao: string;
    /** Observação depois da lista (ex.: eventos sem valor nesta parte). */
    rodape?: string;
    grupos: Grupo[];
    acao?: "repasse" | "antecipar";
}

const formula = (e: Evento) => {
    const partes = [`${reais(e.vendido)} vendido`, `− ${reais(e.taxas)} de taxas e custos`];
    if (e.creditos) partes.push(`+ ${reais(e.creditos)} de créditos`);
    if (e.ajustes) partes.push(`− ${reais(e.ajustes)} de ajustes`);
    return partes.join(" ");
};

export function compor(parte: Parte, eventos: Evento[]): Composicao {
    const t = totalizar(eventos);
    const base = { parte, titulo: ROTULO_DA_PARTE[parte] };
    const grupos = (valorDe: (e: Evento) => number, linhasDe: (e: Evento) => Linha[], incluirZerados = false): Grupo[] =>
        eventos.filter((e) => incluirZerados || valorDe(e) !== 0).map((e) => ({ evento: e, valor: valorDe(e), linhas: linhasDe(e) }));
    const semValor = (valorDe: (e: Evento) => number, frase: string) => (eventos.some((e) => valorDe(e) === 0) ? frase : undefined);

    switch (parte) {
        case "vendido":
            return {
                ...base,
                valor: t.vendido,
                explicacao: "Tudo o que foi vendido em ingressos nos seus eventos. É o mesmo valor do seu relatório de vendas, evento por evento.",
                grupos: grupos(
                    (e) => e.vendido,
                    (e) => [{ texto: "Igual ao relatório de vendas deste evento", detalhe: e.emVendas ? "Evento em vendas: o valor cresce a cada compra." : undefined }],
                    true,
                ),
            };
        case "taxas":
            return {
                ...base,
                valor: t.taxas,
                explicacao: "Taxas e custos da Ingresse sobre as vendas. Ficam sempre separados do valor do ingresso: o Vendido não muda por causa deles.",
                grupos: grupos(
                    (e) => e.taxas,
                    (e) => [{ texto: "Taxa sobre as vendas", detalhe: `Calculada sobre ${reais(e.vendido)} vendidos.` }],
                    true,
                ),
            };
        case "creditos":
            return {
                ...base,
                valor: t.creditos,
                explicacao: "Valores que a Ingresse somou ao seu dinheiro, como bonificações combinadas em contrato.",
                rodape: semValor((e) => e.creditos, "Os outros eventos não tiveram créditos."),
                grupos: grupos(
                    (e) => e.creditos,
                    (e) => e.creditosLista.map((c) => ({ texto: c.titulo, detalhe: `${c.motivo} Entrou em ${dataCurta(c.data)}.`, valor: c.valor })),
                ),
            };
        case "ajustes":
            return {
                ...base,
                valor: t.ajustes,
                explicacao: "O que mudou depois do fechamento do evento e tirou dinheiro: cancelamentos, contestações no cartão e custos de operação.",
                rodape: semValor((e) => e.ajustes, "Os outros eventos não tiveram ajustes."),
                grupos: grupos(
                    (e) => e.ajustes,
                    (e) => e.ajustesLista.map((a) => ({ texto: a.titulo, detalhe: `${a.motivo} Aconteceu em ${dataCurta(a.data)}.`, valor: a.valor, tom: "erro" as const })),
                ),
            };
        case "seuDinheiro":
            return {
                ...base,
                valor: t.seuDinheiro,
                explicacao: "O que é seu depois de taxas, créditos e ajustes. Parte já foi paga, parte está disponível e parte tem data para chegar: veja a distribuição logo abaixo da conta.",
                grupos: grupos(seuDinheiro, (e) => [{ texto: formula(e) }], true),
            };
        case "processamento":
            return {
                ...base,
                valor: t.processamento,
                explicacao: "Vendas que já aconteceram e ainda estão em confirmação. Elas já contam no Vendido e entram no seu saldo na data indicada.",
                rodape: semValor((e) => e.processamento, "Os outros eventos não têm nada em processamento."),
                grupos: grupos(
                    (e) => e.processamento,
                    (e) => [{ texto: e.quandoProcessamento ?? "", detalhe: e.motivoProcessamento }],
                ),
            };
        case "retido":
            return {
                ...base,
                valor: t.retido,
                explicacao: "Parte do dinheiro fica guardada para cobrir cancelamentos e contestações no cartão. O que não for usado é liberado na data indicada.",
                grupos: grupos(retido, (e) =>
                    e.liberacoes
                        .filter((l) => l.tipo !== "aLiberar")
                        .map((l) => ({ texto: `${ROTULO_LIBERACAO[l.tipo]} · libera em ${dataComDia(l.data)}`, detalhe: l.nota, valor: l.valor })),
                ),
            };
        case "aLiberar":
            return {
                ...base,
                valor: t.aLiberar,
                explicacao: "Dinheiro que já é seu e tem data para entrar no Disponível agora. Se precisar antes, você pode antecipar pagando uma taxa.",
                rodape: semValor((e) => e.aLiberar, "Os outros eventos não têm valores a liberar."),
                acao: t.aLiberar > 0 ? "antecipar" : undefined,
                grupos: grupos(
                    (e) => e.aLiberar,
                    (e) => e.liberacoes.filter((l) => l.tipo === "aLiberar").map((l) => ({ texto: `Chega em ${dataComDia(l.data)}`, valor: l.valor })),
                ),
            };
        case "disponivel": {
            const compensa = fraseDeCompensacao(eventos);
            return {
                ...base,
                valor: t.disponivel,
                explicacao:
                    t.disponivel > 0
                        ? "O que você pode sacar hoje. O total já desconta o evento que está com saldo negativo."
                        : (compensa ?? "Você não tem valor para sacar agora."),
                rodape: semValor((e) => e.disponivel, "Os outros eventos não têm valor disponível agora."),
                acao: t.disponivel > 0 ? "repasse" : undefined,
                grupos: grupos(
                    (e) => e.disponivel,
                    (e) =>
                        e.disponivel < 0
                            ? [
                                  {
                                      texto: "Saldo negativo",
                                      detalhe: `Você já recebeu ${reais(e.recebido)} deste evento. Depois disso, ${reais(e.ajustes)} em ajustes saíram da conta. ${
                                          t.disponivel > 0 ? "O valor já foi descontado do seu total disponível: não precisa pagar nada." : "Não precisa pagar nada."
                                      }`,
                                      tom: "erro" as const,
                                  },
                              ]
                            : [{ texto: "Pronto para sacar" }],
                ),
            };
        }
        case "agendado":
            return {
                ...base,
                valor: t.agendado,
                explicacao: "Repasses que você já pediu e têm data para cair na sua conta bancária.",
                rodape: eventos.every((e) => e.agendado === 0) ? "Você não tem repasses agendados." : undefined,
                grupos: grupos(
                    (e) => e.agendado,
                    (e) => e.repasses.filter((r) => r.situacao === "agendado").map((r) => ({ texto: `Cai na sua conta em ${dataComDia(r.data)}`, valor: r.valor })),
                ),
            };
        case "recebido":
            return {
                ...base,
                valor: t.recebido,
                explicacao: "Repasses que já caíram na sua conta bancária.",
                rodape: semValor((e) => e.recebido, "Os outros eventos ainda não tiveram repasse pago."),
                grupos: grupos(
                    (e) => e.recebido,
                    (e) => e.repasses.filter((r) => r.situacao === "pago").map((r) => ({ texto: `Repasse pago em ${dataCurta(r.data)}`, valor: r.valor, comprovante: true })),
                ),
            };
    }
}
