import { useState, type ReactNode } from "react";
import { Download01, SearchLg } from "@untitledui/icons";
import { toast } from "sonner";
import { AccordionComponent as Accordion } from "@/components/application/accordion/accordion";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";
import { ROTULO_DA_PARTE, type ParteComDetalhe } from "./cascata";
import { baixarCsv, dataDoCsv } from "./csv";
import { ROTULO_DA_TAXA, composicaoDasTaxas, totalizar, type Evento, type Lancamento, type LinhaDeTaxa, type TipoDeCredito, type TipoDeDevolucao, type TipoDeTaxa } from "./dados";
import { dataCurta, dataDoEvento, reais } from "./formato";

/*
 * Painel lateral de "Ver detalhe" (ajustes v3, seção 5): o que compõe Vendido, Taxas e custos,
 * Créditos ou Devoluções. Vale para um evento (a lista tem um evento só) ou para a organização.
 * Em todos, o total do topo é o valor do bloco e a soma das linhas fecha com ele (conferido em
 * `conferirContas`). No fim, "Baixar detalhe" (CSV).
 */

const TITULO: Record<ParteComDetalhe, string> = { vendido: "Vendido por evento", taxas: "Taxas e custos", creditos: "Créditos", ajustes: "Devoluções" };

const ROTULO_DO_CREDITO: Record<TipoDeCredito, string> = { bonificacao: "Bonificação de custo", rebate: "Rebate", luvas: "Luvas", ajuste: "Ajuste a crédito" };
const ROTULO_DA_DEVOLUCAO: Record<TipoDeDevolucao, string> = { cancelamento: "Cancelamento", reembolso: "Reembolso parcial", contestacao: "Contestação no cartão", suspenso: "Ingresso suspenso" };
const ORIGEM = { disponivel: "Saiu do Disponível", antecipavel: "Saiu do Antecipável" };
const ORDEM_DAS_TAXAS: TipoDeTaxa[] = ["pagamentos", "servico", "juros", "pre-impressos", "cortesias", "operacao"];

const numero = new Intl.NumberFormat("pt-BR");
const unidades = (t: Pick<LinhaDeTaxa, "quantidade" | "unitario">) => (t.quantidade ? `${numero.format(t.quantidade)} × ${t.unitario}` : undefined);

/** Linha do painel: o que é à esquerda (com detalhe opcional), valor à direita. */
const LinhaDeValor = ({ titulo, detalhe, valor, tom, extra }: { titulo: ReactNode; detalhe?: ReactNode; valor: number; tom?: "erro"; extra?: ReactNode }) => (
    <li className="flex items-baseline justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-primary">{titulo}</span>
            {detalhe && <span className="text-sm text-tertiary">{detalhe}</span>}
            {extra}
        </div>
        <span className={cx("shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums", tom === "erro" ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
    </li>
);

/** Cabeçalho de um grupo (tipo) com o subtotal. */
const Grupo = ({ titulo, valor, children }: { titulo: string; valor: number; children: ReactNode }) => (
    <section className="flex flex-col pt-4">
        <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-semibold text-primary">{titulo}</h3>
            <span className="text-sm font-semibold whitespace-nowrap text-secondary tabular-nums">{reais(valor)}</span>
        </div>
        <ul className="flex flex-col divide-y divide-secondary">{children}</ul>
    </section>
);

const avisoDeProva = (o_que: string, evento: Evento) => toast(`Aqui abriria ${o_que} de ${evento.nome}.`);

/* ---------------- Vendido por evento (só na organização) ---------------- */

const Vendido = ({ eventos }: { eventos: Evento[] }) => {
    const [busca, setBusca] = useState("");
    const simples = (t: string) =>
        t
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase();
    const lista = eventos
        .filter((e) => e.vendido > 0 && simples(e.nome).includes(simples(busca.trim())))
        .sort((a, b) => b.vendido - a.vendido);
    return (
        <>
            <p className="pt-4 text-sm text-tertiary">Cada valor é igual ao “Valor total c/ desconto” do relatório de vendas do evento.</p>
            <div className="pt-4">
                <Input size="sm" icon={SearchLg} aria-label="Buscar evento pelo nome" placeholder="Buscar evento" value={busca} onChange={setBusca} />
            </div>
            {lista.length === 0 ? (
                <p className="py-6 text-sm text-tertiary">Nenhum evento encontrado. Confira o nome.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-secondary pt-1">
                    {lista.map((e) => (
                        <LinhaDeValor
                            key={e.id}
                            titulo={e.nome}
                            detalhe={dataDoEvento(e.data)}
                            valor={e.vendido}
                            extra={
                                <Button size="sm" color="link-gray" className="self-start" onClick={() => avisoDeProva("o relatório de vendas", e)}>
                                    Ver relatório de vendas
                                </Button>
                            }
                        />
                    ))}
                </ul>
            )}
        </>
    );
};

/* ---------------- Taxas e custos ---------------- */

const Taxas = ({ eventos }: { eventos: Evento[] }) => {
    const porEvento = eventos.map((e) => ({ evento: e, linhas: composicaoDasTaxas(e) }));
    if (eventos.length === 1) {
        return (
            <ul className="flex flex-col divide-y divide-secondary pt-1">
                {ORDEM_DAS_TAXAS.flatMap((tipo) => porEvento[0].linhas.filter((l) => l.tipo === tipo)).map((l) => (
                    <LinhaDeValor key={l.titulo} titulo={l.titulo} detalhe={unidades(l) ?? (l.data ? `${dataCurta(l.data)} · ${l.motivo}` : l.tipo === "servico" ? "Assumida por você neste evento" : undefined)} valor={l.valor} />
                ))}
            </ul>
        );
    }
    // Organização: um grupo por tipo, que abre a lista por evento.
    const grupos = ORDEM_DAS_TAXAS.map((tipo) => {
        const itens = porEvento.flatMap(({ evento, linhas }) => linhas.filter((l) => l.tipo === tipo).map((l) => ({ evento, linha: l })));
        return { tipo, itens, valor: itens.reduce((s, i) => s + i.linha.valor, 0), quantidade: itens.reduce((s, i) => s + (i.linha.quantidade ?? 0), 0), unitario: itens[0]?.linha.unitario };
    }).filter((g) => g.itens.length > 0);
    return (
        <Accordion type="multiple" className="space-y-2 pt-4">
            {grupos.map((g) => (
                <Accordion.Item
                    key={g.tipo}
                    value={g.tipo}
                    trigger={
                        <span className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                            <span className="flex min-w-0 flex-col">
                                <span className="text-sm font-semibold text-primary">{ROTULO_DA_TAXA[g.tipo]}</span>
                                <span className="text-xs text-tertiary">
                                    {unidades(g) ?? (g.tipo === "servico" ? "Só nos eventos em que você assumiu a taxa" : g.itens.length === 1 ? "1 evento" : `${g.itens.length} eventos`)}
                                </span>
                            </span>
                            <span className="text-sm font-semibold whitespace-nowrap text-primary tabular-nums">{reais(g.valor)}</span>
                        </span>
                    }
                >
                    <ul className="flex flex-col divide-y divide-secondary">
                        {g.itens
                            .slice()
                            .sort((a, b) => b.linha.valor - a.linha.valor)
                            .map(({ evento, linha }) => (
                                <LinhaDeValor
                                    key={`${evento.id}-${linha.titulo}`}
                                    titulo={evento.nome}
                                    detalhe={unidades(linha) ?? (linha.data ? `${dataCurta(linha.data)} · ${linha.titulo.replace("Custo de operação · ", "")}` : undefined)}
                                    valor={linha.valor}
                                />
                            ))}
                    </ul>
                </Accordion.Item>
            ))}
        </Accordion>
    );
};

/* ---------------- Créditos ---------------- */

const Creditos = ({ eventos }: { eventos: Evento[] }) => {
    const umEvento = eventos.length === 1;
    const todos = eventos.flatMap((e) => e.creditosLista.map((l) => ({ evento: e, l })));
    const pendentes = eventos.filter((e) => e.creditoPendente);
    const tipos: TipoDeCredito[] = ["bonificacao", "rebate", "luvas", "ajuste"];
    return (
        <>
            {todos.length === 0 && <p className="pt-4 text-sm text-tertiary">Nenhum crédito {umEvento ? "neste evento" : "nos seus eventos"} até agora.</p>}
            {tipos.map((tipo) => {
                const itens = todos.filter((i) => i.l.credito === tipo).sort((a, b) => b.l.data.localeCompare(a.l.data));
                if (itens.length === 0) return null;
                return (
                    <Grupo key={tipo} titulo={ROTULO_DO_CREDITO[tipo]} valor={itens.reduce((s, i) => s + i.l.valor, 0)}>
                        {itens.map(({ evento, l }) => (
                            <LinhaDeValor
                                key={`${evento.id}-${l.titulo}`}
                                titulo={
                                    <span className="flex flex-wrap items-center gap-2">
                                        {l.titulo}
                                        {tipo === "rebate" && (
                                            <Badge size="sm" type="pill-color" color="success">
                                                Creditado
                                            </Badge>
                                        )}
                                    </span>
                                }
                                detalhe={`${dataCurta(l.data)}${umEvento ? "" : ` · ${evento.nome}`} · ${l.motivo}`}
                                valor={l.valor}
                                extra={
                                    l.verba && (
                                        <span className="flex flex-col gap-1 pt-1">
                                            <ProgressBarBase value={l.verba.usado} max={l.verba.total} />
                                            <span className="text-xs text-tertiary">
                                                {l.titulo} · {reais(l.verba.usado)} de {reais(l.verba.total)} usados
                                            </span>
                                        </span>
                                    )
                                }
                            />
                        ))}
                    </Grupo>
                );
            })}
            {/* Rebate que depende da nota fiscal: aparece à parte e não soma no total. */}
            {pendentes.map((e) => (
                <div key={e.id} className="mt-4 flex flex-col gap-1 rounded-xl bg-secondary p-4">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                        {reais(e.creditoPendente!.valor)} aguardando sua nota fiscal
                        <Badge size="sm" type="pill-color" color="warning">
                            Aguardando nota fiscal
                        </Badge>
                    </span>
                    <span className="text-sm text-tertiary">
                        {umEvento ? "" : `${e.nome} · `}
                        {e.creditoPendente!.motivo} Não entra no total acima.
                    </span>
                </div>
            ))}
        </>
    );
};

/* ---------------- Devoluções ---------------- */

const Devolucoes = ({ eventos }: { eventos: Evento[] }) => {
    const umEvento = eventos.length === 1;
    const todas = eventos.flatMap((e) => e.ajustesLista.map((l) => ({ evento: e, l })));
    const tipos: TipoDeDevolucao[] = ["cancelamento", "reembolso", "contestacao", "suspenso"];
    return (
        <>
            {tipos.map((tipo) => {
                const itens = todas.filter((i) => i.l.devolucao === tipo).sort((a, b) => b.l.data.localeCompare(a.l.data));
                if (itens.length === 0) return null;
                return (
                    <Grupo key={tipo} titulo={ROTULO_DA_DEVOLUCAO[tipo]} valor={itens.reduce((s, i) => s + i.l.valor, 0)}>
                        {itens.map(({ evento, l }) => (
                            <LinhaDeValor
                                key={`${evento.id}-${l.titulo}`}
                                titulo={umEvento ? l.titulo : evento.nome}
                                detalhe={
                                    <>
                                        {dataCurta(l.data)} · {ORIGEM[l.origem ?? "disponivel"]}
                                        <br />
                                        {l.motivo}
                                    </>
                                }
                                valor={l.valor}
                                tom="erro"
                                extra={
                                    <Button size="sm" color="link-gray" className="self-start" onClick={() => avisoDeProva("o relatório de transações", evento)}>
                                        Ver no relatório de transações
                                    </Button>
                                }
                            />
                        ))}
                    </Grupo>
                );
            })}
        </>
    );
};

/* ---------------- CSV ---------------- */

function linhasDoCsv(parte: ParteComDetalhe, eventos: Evento[]): Array<Array<string | number>> {
    if (parte === "vendido") return [["Evento", "Data do evento", "Vendido"], ...eventos.filter((e) => e.vendido > 0).map((e) => [e.nome, dataDoCsv(e.data), e.vendido])];
    if (parte === "taxas") {
        return [
            ["Tipo", "Evento", "Quantidade", "Valor"],
            ...eventos.flatMap((e) => composicaoDasTaxas(e).map((l) => [l.tipo === "operacao" ? l.titulo : ROTULO_DA_TAXA[l.tipo], e.nome, l.quantidade ?? "", l.valor])),
        ];
    }
    const lista = (e: Evento): Lancamento[] => (parte === "creditos" ? e.creditosLista : e.ajustesLista);
    return [
        ["Tipo", "Data", "Evento", "Motivo", parte === "ajustes" ? "De onde saiu" : "Situação", "Valor"],
        ...eventos.flatMap((e) =>
            lista(e).map((l) => [
                parte === "creditos" ? ROTULO_DO_CREDITO[l.credito ?? "ajuste"] : ROTULO_DA_DEVOLUCAO[l.devolucao ?? "cancelamento"],
                dataDoCsv(l.data),
                e.nome,
                l.motivo,
                parte === "ajustes" ? ORIGEM[l.origem ?? "disponivel"] : "Creditado",
                l.valor,
            ]),
        ),
    ];
}

/* ---------------- painel ---------------- */

interface PainelDoDetalheProps {
    parte: ParteComDetalhe | null;
    /** Um evento (página do evento) ou todos (topo de Finanças). */
    eventos: Evento[];
    aoFechar: () => void;
}

export function PainelDoDetalhe({ parte, eventos, aoFechar }: PainelDoDetalheProps) {
    if (!parte) return null;
    const valor = totalizar(eventos)[parte];
    const erro = parte === "ajustes" && valor > 0;
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(aberto) => !aberto && aoFechar()} className="z-50">
            <SlideoutMenu.Header onClose={aoFechar} className="flex flex-col gap-1 pb-5">
                <h2 className="pr-8 text-sm font-medium text-secondary">{TITULO[parte]}</h2>
                <p className={cx("text-display-xs font-semibold tabular-nums", erro ? "text-error-primary" : "text-primary")}>{reais(valor)}</p>
                <p className="text-sm text-tertiary">{eventos.length === 1 ? eventos[0].nome : "Todos os eventos"}</p>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="gap-0 border-t border-secondary pb-6">
                {parte === "vendido" && <Vendido eventos={eventos} />}
                {parte === "taxas" && <Taxas eventos={eventos} />}
                {parte === "creditos" && <Creditos eventos={eventos} />}
                {parte === "ajustes" && <Devolucoes eventos={eventos} />}
                <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-primary py-4">
                    <span className="text-sm font-semibold text-primary">Total de {ROTULO_DA_PARTE[parte]}</span>
                    <span className={cx("text-md font-semibold whitespace-nowrap tabular-nums", erro ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
                </div>
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex justify-between gap-3">
                <Button
                    size="md"
                    color="secondary"
                    iconLeading={Download01}
                    onClick={() => {
                        baixarCsv(`financas-${parte === "ajustes" ? "devolucoes" : parte}.csv`, linhasDoCsv(parte, eventos));
                        toast.success("Detalhe baixado.");
                    }}
                >
                    Baixar detalhe
                </Button>
                <Button size="md" color="secondary" onClick={aoFechar}>
                    Fechar
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
