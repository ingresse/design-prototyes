import { useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { useNavigate } from "react-router";
import { SearchLg, Users01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Table } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { CarregandoTabela, SemResultados } from "../../components/tabela";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";
import { setEventoAtual, useEventoAtual } from "../../eventos/data/eventos";
import { BotaoMostrarMais, paraBusca, useMostrarMais } from "../../itens/components/escala";
import { RelatorioPageHeader } from "../../relatorios/components/RelatorioPageHeader";
import { ListaDaTabela } from "../../relatorios/components/TabelaLista";
import { MetricaDoRelatorio, PainelDeMetricas } from "../../relatorios/components/visual-dos-relatorios";
import { moeda, numero, plural, textoComissao } from "../components/comuns";
import { totaisDosPedidos, useComissariosDaOrganizacao, type Comissario, type PedidoDoGrupo, type Repasse, type Totais } from "../data/comissarios";

/* ------------------------------------------------------------------ */
/*  Relatório de Comissários (COM-110 a COM-115, ECO-26)               */
/*                                                                     */
/*  O antigo painel de Comissários da organização, sem cadastro: o     */
/*  comissário é um grupo de Equipe e Comissários com o canal          */
/*  Comissário. Soma os grupos-comissário dos eventos do escopo        */
/*  ("Todos os eventos" ou o evento escolhido no topo dos Relatórios). */
/*  Cada linha soma os mesmos pedidos que o grupo lista (banco +       */
/*  exemplos), e as métricas somam as linhas (COM-116).                */
/* ------------------------------------------------------------------ */

type ColunaOrdenavel = "nome" | "evento" | "receita" | "comissao" | "aRepassar";

interface Linha {
    /** Comissário num evento: a mesma pessoa aparece uma vez por evento em "Todos os eventos". */
    chave: string;
    c: Comissario;
    eventoId: string;
    evento: string;
    pedidos: PedidoDoGrupo[];
    repasses: Repasse[];
    t: Totais;
}

const valorDaColuna = (l: Linha, col: ColunaOrdenavel): string | number =>
    col === "nome" ? l.c.nome : col === "evento" ? l.evento : col === "receita" ? l.t.receita : col === "comissao" ? l.t.comissao : l.t.aRepassar;

export function RelatorioComissarios() {
    const navigate = useNavigate();
    const todos = useTodosOsEventos();
    const eventoAtual = useEventoAtual();
    const { carregando, organizacao, comissarios, estado } = useComissariosDaOrganizacao();
    const [busca, setBusca] = useState("");
    // Um jeito só de ordenar, o dos relatórios: clique no cabeçalho da coluna (REL-237, COM-120). Padrão: mais vendas.
    const [ordem, setOrdem] = useState<SortDescriptor>({ column: "receita", direction: "descending" });

    const linhas = useMemo<Linha[]>(() => {
        const nomeDoEvento = (id: string) => organizacao?.eventos?.find((e) => e.id === id)?.nome ?? "Evento";
        return estado.vinculos
            .filter((v) => (todos || v.eventoId === eventoAtual.id) && comissarios.some((c) => c.id === v.comissarioId))
            .map((v) => {
                const c = comissarios.find((x) => x.id === v.comissarioId)!;
                // Cada linha é o comissário NAQUELE evento: os pedidos do grupo (os mesmos da aba Pedidos) e os repasses dele.
                const pedidos = estado.pedidos.filter((x) => x.grupoId === v.grupoId);
                const repasses = estado.repasses.filter((x) => x.comissarioId === c.id && x.eventoId === v.eventoId);
                return { chave: `${c.id}:${v.eventoId}`, c, eventoId: v.eventoId, evento: nomeDoEvento(v.eventoId), pedidos, repasses, t: totaisDosPedidos(pedidos, repasses) };
            });
    }, [estado, comissarios, organizacao, todos, eventoAtual.id]);

    const geral = useMemo(() => totaisDosPedidos(linhas.flatMap((l) => l.pedidos), linhas.flatMap((l) => l.repasses)), [linhas]);

    const termo = paraBusca(busca.trim());
    const ordenadas = useMemo(() => {
        const filtradas = termo ? linhas.filter((l) => paraBusca(`${l.c.nome} ${l.c.codigo} ${l.c.email} ${l.evento}`).includes(termo)) : linhas;
        const col = ordem.column as ColunaOrdenavel;
        const dir = ordem.direction === "ascending" ? 1 : -1;
        const porOrdem = [...filtradas].sort((a, b) => {
            const va = valorDaColuna(a, col);
            const vb = valorDaColuna(b, col);
            return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR")) * dir;
        });
        // Desativados no fim (o grupo desativado é o comissário pausado).
        return [...porOrdem.filter((l) => l.c.ativo), ...porOrdem.filter((l) => !l.c.ativo)];
    }, [linhas, termo, ordem]);
    const { visiveis, restantes, mostrarMais } = useMostrarMais(ordenadas);
    // Posição por vendas, por linha (comissário num evento). Antes a chave era só a pessoa: em "Todos os eventos", quem vende em
    // mais de um evento ficava com a mesma posição em todas as linhas. Lá, a posição sai: a mesma pessoa aparece uma vez por evento.
    const ranking = useMemo(() => new Map([...linhas].sort((a, b) => b.t.receita - a.t.receita).map((l, i) => [l.chave, i + 1])), [linhas]);
    const mostraPosicao = !todos && ordem.column === "receita" && ordem.direction === "descending";

    const abrir = (l: Linha) => {
        setEventoAtual(l.eventoId);
        navigate(`/backstage/evento/equipe/${l.c.id}?aba=pedidos`);
    };
    const abrirPorChave = (chave: string) => {
        const l = linhas.find((x) => x.chave === chave);
        if (l) abrir(l);
    };

    return (
        <BackstageLayout activeSection="relatorios" activeItem="relatorio-comissarios">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <RelatorioPageHeader title="Comissários" withFilters={false} />
                {carregando ? (
                    <CarregandoTabela linhas={5} rotulo="Carregando comissários" />
                ) : linhas.length === 0 ? (
                    // Vazio do DS (BKS-117): num evento, a ação leva à Equipe e Comissários dele (COM-115, COM-119).
                    <div className="rounded-2xl bg-primary px-6 py-12 ring-1 ring-secondary">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={Users01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{todos ? "Nenhum comissário na organização" : "Nenhum comissário neste evento"}</EmptyState.Title>
                                <EmptyState.Description>Um grupo vira comissário quando o canal Comissário é configurado em Equipe e Comissários, no menu do evento.</EmptyState.Description>
                            </EmptyState.Content>
                            {!todos && (
                                <EmptyState.Footer>
                                    <Button size="md" onClick={() => navigate("/backstage/evento/equipe")}>
                                        Abrir Equipe e Comissários
                                    </Button>
                                </EmptyState.Footer>
                            )}
                        </EmptyState>
                    </div>
                ) : (
                    <>
                        {/* O painel de métricas comum dos relatórios (REL-221). */}
                        <PainelDeMetricas rotulo="Resumo dos comissários" className="xl:grid-cols-4">
                            <MetricaDoRelatorio
                                rotulo="Comissários ativos"
                                // Pessoas, não linhas: quem vende em mais de um evento conta uma vez.
                                valor={numero(new Set(linhas.filter((l) => l.c.ativo).map((l) => (l.c.email || l.c.nome).toLowerCase())).size)}
                                apoio={`Em ${plural(linhas.length, "grupo", "grupos")} com o canal Comissário`}
                                destaque
                            />
                            <MetricaDoRelatorio rotulo="Vendido por comissários" valor={moeda(geral.receita)} apoio={plural(geral.vendidos, "ingresso", "ingressos")} />
                            <MetricaDoRelatorio rotulo="Comissão gerada" valor={moeda(geral.comissao)} apoio={geral.estornado > 0 ? `${moeda(geral.estornado)} estornados em cancelamentos` : undefined} />
                            <MetricaDoRelatorio rotulo="A repassar" valor={moeda(geral.aRepassar)} apoio={`${moeda(geral.repassado)} já repassados`} />
                        </PainelDeMetricas>

                        <section className="flex flex-col overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary">
                            <div className="flex flex-col gap-3 border-b border-secondary px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                                <div className="w-full md:max-w-xs">
                                    <Input icon={SearchLg} aria-label="Buscar comissário" placeholder="Nome, código, e-mail ou evento" value={busca} onChange={setBusca} />
                                </div>
                            </div>
                            {ordenadas.length === 0 ? (
                                <SemResultados texto="Nenhum comissário encontrado com esse nome, código, e-mail ou evento." onLimpar={() => setBusca("")} />
                            ) : (
                                <>
                                    {/* Tabela do DS (REL-237): ordena pelo cabeçalho; a linha abre o grupo do comissário. */}
                                    <div className="hidden md:block">
                                        <Table aria-label="Comissários" size="sm" sortDescriptor={ordem} onSortChange={setOrdem} onRowAction={(key) => abrirPorChave(String(key))}>
                                            <Table.Header>
                                                <Table.Head id="nome" label="Comissário" isRowHeader allowsSorting className="w-full" />
                                                {todos ? <Table.Head id="evento" label="Evento" allowsSorting /> : null}
                                                <Table.Head id="receita" label="Vendido" allowsSorting className="[&>div]:justify-end" />
                                                <Table.Head id="comissao" label="Comissão" allowsSorting className="[&>div]:justify-end" />
                                                <Table.Head id="aRepassar" label="A repassar" allowsSorting className="[&>div]:justify-end" />
                                            </Table.Header>
                                            <Table.Body items={visiveis.map((l) => ({ ...l, id: l.chave }))}>
                                                {(l) => (
                                                    <Table.Row id={l.chave} className="cursor-pointer">
                                                        <Table.Cell>
                                                            <div className="flex items-start gap-2">
                                                                {mostraPosicao && l.c.ativo && <span className="w-6 shrink-0 font-medium text-quaternary tabular-nums">{ranking.get(l.chave)}º</span>}
                                                                <div className="flex min-w-0 flex-col">
                                                                    <span className="truncate font-medium text-primary">{l.c.nome}</span>
                                                                    <span>
                                                                        {l.c.codigo}, {textoComissao(l.c.padrao)}
                                                                    </span>
                                                                </div>
                                                                {!l.c.ativo && (
                                                                    <Badge size="sm" type="pill-color" color="gray">
                                                                        Grupo inativo
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </Table.Cell>
                                                        {todos ? <Table.Cell className="min-w-48">{l.evento}</Table.Cell> : null}
                                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">
                                                            <span className="block font-medium text-primary">{moeda(l.t.receita)}</span>
                                                            <span>{plural(l.t.vendidos, "ingresso", "ingressos")}</span>
                                                        </Table.Cell>
                                                        <Table.Cell className="text-right whitespace-nowrap tabular-nums">{moeda(l.t.comissao)}</Table.Cell>
                                                        <Table.Cell className={cx("text-right font-medium whitespace-nowrap tabular-nums", l.t.aRepassar > 0 ? "text-primary" : "text-tertiary")}>{moeda(l.t.aRepassar)}</Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </Table.Body>
                                        </Table>
                                    </div>
                                    <ListaDaTabela
                                        rotulo="Comissários"
                                        itens={visiveis}
                                        chave={(l) => l.chave}
                                        titulo={(l) => l.c.nome}
                                        apoio={(l) => (todos ? l.evento : l.c.codigo)}
                                        destaque={(l) => (
                                            <>
                                                <span className="font-medium">{moeda(l.t.receita)}</span>
                                                <span className="text-tertiary">{moeda(l.t.aRepassar)} a repassar</span>
                                            </>
                                        )}
                                        onAbrir={abrir}
                                    />
                                    {restantes > 0 && (
                                        <div className="border-t border-secondary p-4">
                                            <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} />
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}
