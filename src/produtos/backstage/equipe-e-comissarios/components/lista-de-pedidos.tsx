import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronRight, ShoppingBag01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { dataHora, moeda, textoComissao } from "../../comissarios/components/comuns";
import { DetalhesDaLinha } from "../../relatorios/components/TabelaLista";
import { CANAIS_GRUPO, ROTULO_CANAL, comissaoBruta, comissaoDaVenda, type CanalGrupo } from "../data/equipe";
import type { PedidoDoGrupo } from "../data/pedidos";
import { CampoDePessoa } from "./campo-de-pessoa";

const COR_CANAL: Record<CanalGrupo, "brand" | "blue" | "indigo" | "gray"> = { link: "brand", pdv: "indigo", bilheteria: "blue", cortesia: "gray" };

const CanalDoPedido = ({ canal }: { canal: CanalGrupo }) => (
    <Badge size="sm" type="pill-color" color={COR_CANAL[canal]}>
        {ROTULO_CANAL[canal]}
    </Badge>
);

const valorDoPedido = (p: PedidoDoGrupo) => (p.canal === "cortesia" ? "Cortesia" : moeda(p.valor));

/** Comissão do pedido: só vendas atribuídas ao comissário geram (ECO-16). */
function textoDaComissao(p: PedidoDoGrupo) {
    if (!p.venda) return "Sem comissão";
    if (p.venda.status === "cancelada") return "Estornada";
    if (p.venda.canal === "cortesia") return "Sem comissão";
    return moeda(comissaoDaVenda(p.venda));
}

/** Valor do pedido e, em grupo com comissário, a comissão logo abaixo (ECO-74, ECO-75). */
function ValorDoPedido({ p, comComissao }: { p: PedidoDoGrupo; comComissao: boolean }) {
    return (
        <>
            {p.status === "cancelado" ? (
                // O Badge do DS é flex (bloco): ml-auto o encosta na borda da coluna, alinhado com os valores (ECO-75).
                <Badge size="sm" type="pill-color" color="error" className="ml-auto w-max">
                    Cancelado
                </Badge>
            ) : (
                <span className="block font-medium text-primary">{valorDoPedido(p)}</span>
            )}
            {comComissao && (
                <span className={cx("block whitespace-nowrap text-tertiary", p.venda && p.venda.status !== "cancelada" && p.venda.canal !== "cortesia" && "text-secondary")}>
                    {p.venda && p.venda.status !== "cancelada" && p.venda.canal !== "cortesia" ? `${textoDaComissao(p)} de comissão` : textoDaComissao(p)}
                </span>
            )}
        </>
    );
}

/**
 * Pedidos do grupo em todos os canais (ECO-74): Comissário, PDV, Bilheteria online e Cortesia,
 * com filtros por pedido (uuid, por trecho), canal e vendedor. A coluna Comissão só aparece em
 * grupo com comissário.
 */
export function ListaDePedidos({
    pedidos,
    vendedores,
    comComissao,
    filtroVendedor,
    onFiltroVendedor,
}: {
    pedidos: PedidoDoGrupo[];
    /** Pessoas do grupo, com ou sem pedido (ECO-29). */
    vendedores: string[];
    comComissao: boolean;
    /** Controlado de fora quando o ranking "Por vendedor" também filtra. */
    filtroVendedor?: string;
    onFiltroVendedor?: (v: string) => void;
}) {
    const [buscaPedido, setBuscaPedido] = useState("");
    const [filtroCanal, setFiltroCanal] = useState<string>("todos");
    const [vendedorLocal, setVendedorLocal] = useState("todos");
    const vendedor = filtroVendedor ?? vendedorLocal;
    const setVendedor = onFiltroVendedor ?? setVendedorLocal;
    const canaisComPedido = CANAIS_GRUPO.filter((c) => pedidos.some((p) => p.canal === c));
    const variosVendedores = vendedores.length > 1;

    const filtrados = useMemo(() => {
        const termo = buscaPedido.trim().toLowerCase();
        return pedidos.filter(
            (p) =>
                (!termo || p.pedido.toLowerCase().includes(termo)) &&
                (filtroCanal === "todos" || p.canal === filtroCanal) &&
                (vendedor === "todos" || p.vendedor === vendedor),
        );
    }, [pedidos, buscaPedido, filtroCanal, vendedor]);
    // Busca, filtro ou tamanho novo voltam à página 1 (BKS-114).
    const paginacao = usePaginacao(filtrados, [buscaPedido, filtroCanal, vendedor]);
    // O detalhe tem endereço (`?pedido=<id>`, ECO-97): recarregar mantém o pedido aberto e o Voltar do navegador fecha.
    const [params, setParams] = useSearchParams();
    const aberta = pedidos.find((p) => p.id === params.get("pedido")) ?? null;
    const abrir = (p: PedidoDoGrupo) =>
        setParams((atual) => {
            const novo = new URLSearchParams(atual);
            novo.set("pedido", p.id);
            return novo;
        });
    const fechar = () =>
        setParams(
            (atual) => {
                const novo = new URLSearchParams(atual);
                novo.delete("pedido");
                return novo;
            },
            { replace: true },
        );
    const limpar = () => (setBuscaPedido(""), setFiltroCanal("todos"), setVendedor("todos"));

    return (
        <>
            <section className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-primary">Pedidos</h2>
                {pedidos.length === 0 ? (
                    <VazioDaTabela icone={ShoppingBag01} titulo="Nenhum pedido ainda" texto="O que as pessoas do grupo venderem ou emitirem nos canais aparece aqui." />
                ) : (
                    <>
                        <BarraDaLista busca={{ valor: buscaPedido, onChange: setBuscaPedido, placeholder: "Buscar pelo número do pedido", rotulo: "Buscar pedido" }}>
                            {canaisComPedido.length > 1 && (
                                <div className="w-full sm:w-48">
                                    <Select
                                        size="sm"
                                        aria-label="Canal"
                                        selectedKey={filtroCanal}
                                        onSelectionChange={(k) => k && setFiltroCanal(String(k))}
                                        items={[{ id: "todos", label: "Todos os canais" }, ...canaisComPedido.map((c) => ({ id: c, label: ROTULO_CANAL[c] }))]}
                                    >
                                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                    </Select>
                                </div>
                            )}
                            {variosVendedores && (
                                // Com busca: o grupo pode ter centenas de pessoas (ECO-94).
                                <div className="w-full sm:w-56">
                                    <CampoDePessoa
                                        size="sm"
                                        rotulo="Vendedor"
                                        placeholder="Buscar vendedor"
                                        valor={vendedor}
                                        onChange={setVendedor}
                                        opcoes={[{ id: "todos", label: "Todos os vendedores" }, ...vendedores.map((n) => ({ id: n, label: n }))]}
                                    />
                                </div>
                            )}
                        </BarraDaLista>

                        {/* Tabela-lista (BKS-115): no cartão estreito ficam item, comprador e valor; o toque abre o detalhe com todas as colunas. */}
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="min-w-0 flex-1">Item</span>
                                <span className="w-32">Pedido</span>
                                <span className="w-44">Canal</span>
                                <span className="w-40 text-right">{comComissao ? "Valor e comissão" : "Valor"}</span>
                                <span className="w-4" />
                            </CabecalhoDaTabela>
                            {filtrados.length === 0 ? (
                                <SemResultados texto="Nenhum pedido encontrado com esses filtros." onLimpar={limpar} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((p) => (
                                        <LinhaDaTabela key={p.id} interativa className="group relative items-center">
                                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                                <TituloDaLinha
                                                    titulo={
                                                        <button
                                                            type="button"
                                                            onClick={() => abrir(p)}
                                                            aria-label={`Pedido #${p.pedido.slice(0, 8)}: ${p.quantidade}× ${p.item}`}
                                                            className="text-left outline-hidden after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus-ring"
                                                        >
                                                            {p.quantidade}× {p.item}
                                                        </button>
                                                    }
                                                    apoio={
                                                        // Cartão estreito: comprador numa linha e canal na outra, sem cortar o nome (antes "Ana Ribeiro, comi…").
                                                        <>
                                                            <span className="block truncate">
                                                                {p.comprador}
                                                                {p.detalhe && <span className="hidden @min-[44rem]:inline">, {p.detalhe}</span>}
                                                            </span>
                                                            <span className="block truncate @min-[44rem]:hidden">
                                                                {ROTULO_CANAL[p.canal]}
                                                                {variosVendedores ? `, ${p.vendedor}` : ""}
                                                            </span>
                                                        </>
                                                    }
                                                />
                                                <Celula rotulo="Pedido" className="hidden @min-[44rem]:w-32">
                                                    <span className="block font-medium tabular-nums" title={p.pedido}>
                                                        #{p.pedido.slice(0, 8)}
                                                    </span>
                                                    <span className="block text-tertiary tabular-nums">{dataHora(p.data)}</span>
                                                </Celula>
                                                <Celula rotulo="Canal" className="hidden @min-[44rem]:w-44">
                                                    <span className="flex">
                                                        <CanalDoPedido canal={p.canal} />
                                                    </span>
                                                    {variosVendedores && <span className="block text-tertiary">{p.vendedor}</span>}
                                                </Celula>
                                                <Celula rotulo="Valor" numero className="hidden @min-[44rem]:flex @min-[44rem]:w-40 @min-[44rem]:flex-col @min-[44rem]:items-end">
                                                    <ValorDoPedido p={p} comComissao={comComissao} />
                                                </Celula>
                                                {/* Cartão estreito: o valor que importa à direita. */}
                                                <span className="flex shrink-0 flex-col items-end gap-1 text-right text-sm tabular-nums @min-[44rem]:hidden">
                                                    <ValorDoPedido p={p} comComissao={comComissao} />
                                                </span>
                                            </div>
                                            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:translate-x-0.5" />
                                        </LinhaDaTabela>
                                    ))}
                                </ul>
                            )}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </>
                )}
            </section>

            {aberta && (
                <DetalhesDaLinha
                    titulo={`Pedido #${aberta.pedido.slice(0, 8)}`}
                    subtitulo={dataHora(aberta.data)}
                    onFechar={fechar}
                    grupos={[
                        {
                            campos: [
                                { rotulo: "Número do pedido", valor: aberta.pedido },
                                { rotulo: "Comprador", valor: aberta.comprador },
                                { rotulo: "Item", valor: [`${aberta.quantidade}× ${aberta.item}`, aberta.detalhe].filter(Boolean).join(", ") },
                                { rotulo: "Canal", valor: ROTULO_CANAL[aberta.canal] },
                                { rotulo: "Vendedor", valor: aberta.vendedor },
                                ...(aberta.status === "cancelado" ? [{ rotulo: "Status", valor: "Cancelado" }] : []),
                            ],
                        },
                        {
                            titulo: "Valores",
                            campos: [
                                { rotulo: "Valor", valor: valorDoPedido(aberta) },
                                ...(aberta.venda && aberta.venda.desconto > 0 ? [{ rotulo: "Desconto do código", valor: moeda(aberta.venda.desconto * aberta.quantidade) }] : []),
                                ...(aberta.venda && (aberta.venda.acrescimo ?? 0) > 0 ? [{ rotulo: "Valor a mais (do comissário)", valor: moeda((aberta.venda.acrescimo ?? 0) * aberta.quantidade) }] : []),
                                ...(comComissao
                                    ? [
                                          {
                                              rotulo: "Comissão",
                                              valor: !aberta.venda
                                                  ? "Sem comissão neste canal"
                                                  : aberta.venda.status === "cancelada"
                                                    ? `Estornada: ${moeda(comissaoBruta(aberta.venda))} (pedido cancelado)`
                                                    : aberta.venda.canal === "cortesia"
                                                      ? "Cortesia não gera comissão"
                                                      : `${moeda(comissaoDaVenda(aberta.venda))} (${textoComissao({ tipo: aberta.venda.tipoAplicado, comissao: aberta.venda.comissaoAplicada })})`,
                                          },
                                      ]
                                    : []),
                            ],
                        },
                    ]}
                />
            )}
        </>
    );
}
