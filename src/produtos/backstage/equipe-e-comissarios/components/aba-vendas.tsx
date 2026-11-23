import { useMemo, useState } from "react";
import type { PessoaDoComissario } from "@/plataforma/comissarios";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, TituloDaLinha } from "../../components/tabela";
import { FaixaDeMetricas, Metrica, Secao, moeda, numero, plural } from "../../comissarios/components/comuns";
import {
    CANAIS,
    CANAL_LABEL,
    canaisLigados,
    geraComissao,
    limiteDoCanal,
    totaisDosPedidos,
    type GrupoEquipe,
    type Totais,
    type VendaAtribuida,
} from "../data/equipe";
import type { PedidoDoGrupo } from "../data/pedidos";
import { ListaDePedidos } from "./lista-de-pedidos";

/**
 * Aba Pedidos do grupo com comissário (ECO-70 a ECO-74): métricas, venda por canal, por vendedor e
 * os pedidos de todos os canais do grupo. Todo número soma exatamente os pedidos listados (ECO-87).
 */
export function AbaVendas({
    pedidos,
    t,
    grupo,
    variosVendedores,
    pessoas = [],
    link,
    codigo,
}: {
    /** Linhas que contam para o comissário (mantido para quem chama; os números saem de `pedidos`). */
    vendas: VendaAtribuida[];
    /** Pedidos de todos os canais do grupo (ECO-74). */
    pedidos: PedidoDoGrupo[];
    /** `totaisDosPedidos(pedidos, repasses)`. */
    t: Totais;
    grupo: GrupoEquipe;
    variosVendedores: boolean;
    /** Pessoas do grupo-comissário, com o código de cada uma (ranking por vendedor, ECO-29). */
    pessoas?: PessoaDoComissario[];
    link: string;
    codigo: string;
}) {
    // "Por vendedor" filtra a lista de pedidos pela pessoa (ECO-29).
    const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
    // O filtro por vendedor lista todas as pessoas do grupo, com ou sem venda (ECO-29).
    const vendedores = pessoas.length > 0 ? pessoas.map((p) => p.nome) : [...new Set(pedidos.map((v) => v.vendedor))].sort((a, b) => a.localeCompare(b));
    const cortesias = t.cortesias;
    // Canais do grupo que contam para o comissário: link, PDV e Bilheteria com comissão, e Cortesia.
    const ligados = canaisLigados(grupo);
    const ativos = new Set<string>([
        ...(ligados.includes("link") ? ["online"] : []),
        ...(ligados.some((c) => (c === "pdv" || c === "bilheteria") && geraComissao(grupo, c, grupo.canais[c])) ? ["bilheteria"] : []),
        ...(ligados.includes("cortesia") ? ["cortesia"] : []),
    ]);
    const temCortesia = ligados.includes("cortesia");
    // "Por vendedor", do maior vendido para o menor, com a paginação do DS acima de 10 (ECO-89).
    const ranking = useMemo(
        () =>
            pessoas
                .map((p) => ({ p, t: totaisDosPedidos(pedidos.filter((x) => x.vendedor === p.nome), []) }))
                .sort((a, b) => b.t.receita - a.t.receita)
                .map((x, i) => ({ ...x, posicao: i + 1 })),
        [pessoas, pedidos],
    );
    const paginacao = usePaginacao(ranking);
    const cota = temCortesia && grupo.canais.cortesia ? limiteDoCanal(grupo.canais.cortesia) : null;

    return (
        <>
            <FaixaDeMetricas>
                <Metrica rotulo="Vendido" valor={moeda(t.receita)} apoio={plural(t.vendidos, "ingresso", "ingressos")} />
                <Metrica
                    rotulo="Cortesias enviadas"
                    valor={temCortesia && cota ? `${numero(cortesias)} de ${numero(cota)}` : numero(cortesias)}
                    apoio={temCortesia ? (cota ? "Cota do canal Cortesia" : "Sem limite no canal Cortesia") : "Canal Cortesia desligado"}
                />
                <Metrica rotulo="Comissão gerada" valor={moeda(t.comissao)} apoio={t.cancelados > 0 ? `${plural(t.cancelados, "ingresso cancelado", "ingressos cancelados")}, ${moeda(t.estornado)} estornados` : undefined} />
                <Metrica rotulo="A repassar" valor={moeda(t.aRepassar)} apoio={`${moeda(t.repassado)} já repassados`} destaque={t.aRepassar > 0} />
            </FaixaDeMetricas>

            <Secao titulo="Venda por canal">
                <dl className="grid gap-4 sm:grid-cols-3">
                    {CANAIS.map((canal) => (
                        <div key={canal} className="flex flex-col gap-1">
                            <dt className="text-sm text-tertiary">{canal === "bilheteria" ? "PDV e bilheteria" : CANAL_LABEL[canal]}</dt>
                            <dd className="text-lg font-semibold text-primary tabular-nums">
                                {canal === "cortesia" ? plural(t.porCanal.cortesia.quantidade, "cortesia", "cortesias") : moeda(t.porCanal[canal].receita)}
                            </dd>
                            <dd className="text-sm text-tertiary">
                                {!ativos.has(canal)
                                    ? canal === "online"
                                        ? "Link desligado"
                                        : canal === "bilheteria"
                                          ? t.porCanal.bilheteria.quantidade > 0
                                              ? `${plural(t.porCanal.bilheteria.quantidade, "ingresso", "ingressos")}, sem comissão`
                                              : "Sem canal com comissão"
                                          : "Canal desligado"
                                    : canal === "online"
                                      ? `Link e cupom ${codigo}`
                                      : canal === "bilheteria"
                                        ? plural(t.porCanal.bilheteria.quantidade, "ingresso", "ingressos")
                                        : "Sem comissão"}
                            </dd>
                        </div>
                    ))}
                </dl>
                {ligados.includes("link") && (
                    <div className="flex flex-col gap-0.5 border-t border-secondary pt-5">
                        <p className="text-sm font-semibold text-primary">Link de venda</p>
                        <p className="text-sm break-all text-tertiary">{link}</p>
                    </div>
                )}
            </Secao>

            {pessoas.length > 1 && (
                <section className="flex flex-col gap-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="text-lg font-semibold text-primary">Por vendedor</h2>
                        <p className="max-w-[65ch] text-sm text-tertiary">
                            Cada pessoa vende pelo próprio código; o do grupo é do responsável. A comissão é do grupo. Escolha uma pessoa para ver só os pedidos dela.
                        </p>
                    </div>
                    <CartaoDaTabela>
                        <CabecalhoDaTabela>
                            <span className="w-6 shrink-0" />
                            <span className="min-w-0 flex-1">Vendedor</span>
                            <span className="w-28">Código</span>
                            <span className="w-20 text-right">Ingressos</span>
                            <span className="w-28 text-right">Vendido</span>
                            <span className="w-28 text-right">Comissão</span>
                        </CabecalhoDaTabela>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map(({ p, t: tp, posicao }) => {
                                    const ativo = filtroVendedor === p.nome;
                                    return (
                                        // Clicar na pessoa filtra os pedidos por ela; de novo, limpa (ECO-29).
                                        <LinhaDaTabela key={p.email} interativa selecionada={ativo} className="relative">
                                            <span className="w-6 shrink-0 text-sm font-medium text-quaternary tabular-nums">{posicao}º</span>
                                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                                <TituloDaLinha
                                                    titulo={
                                                        <button
                                                            type="button"
                                                            aria-pressed={ativo}
                                                            onClick={() => setFiltroVendedor(ativo ? "todos" : p.nome)}
                                                            className="text-left outline-hidden after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus-ring"
                                                        >
                                                            {p.nome}
                                                        </button>
                                                    }
                                                    apoio={p.papel === "responsavel" ? "Responsável" : "Vendedor"}
                                                />
                                                <Celula rotulo="Código" className="text-secondary @min-[44rem]:w-28">
                                                    {p.codigo ?? "Sem código"}
                                                </Celula>
                                                <Celula rotulo="Ingressos" numero className="@min-[44rem]:w-20">
                                                    {numero(tp.vendidos)}
                                                </Celula>
                                                <Celula rotulo="Vendido" numero className="@min-[44rem]:w-28 @min-[44rem]:font-medium">
                                                    {moeda(tp.receita)}
                                                </Celula>
                                                <Celula rotulo="Comissão" numero className="@min-[44rem]:w-28">
                                                    {moeda(tp.comissao)}
                                                </Celula>
                                            </div>
                                        </LinhaDaTabela>
                                    );
                                })}
                        </ul>
                        <RodapeDePaginacao {...paginacao} />
                    </CartaoDaTabela>
                </section>
            )}

            <ListaDePedidos pedidos={pedidos} vendedores={vendedores} comComissao filtroVendedor={filtroVendedor} onFiltroVendedor={setFiltroVendedor} />
        </>
    );
}
