import { parseDate } from "@internationalized/date";
import { useSearchParams } from "react-router";
import { ArrowLeft, Download01, SearchLg } from "@untitledui/icons";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { Table } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { Secao } from "../../components/financas/cascata";
import { baixarCsv, dataDoCsv } from "../../components/financas/csv";
import { DIAS_DO_EXTRATO, HOJE, ROTULO_DO_MOVIMENTO, eventosDoCenario, extrato, somarDias, totalizar, type LinhaDoExtrato, type TipoDeMovimento } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar } from "../../components/financas/estados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";
import { fraseDeCompensacao } from "../../components/financas/frases";
import { CabecalhoDaPagina, FinancasShell, useCenario } from "../../components/financas/shell";
import { Paginacao } from "../components/paginacao";
import { PainelDoMovimento } from "../components/painel-do-movimento";

/*
 * Extrato (ajustes v3, seção 4.2).
 * Pergunta que responde: o que aconteceu com o meu dinheiro, e por que o meu Disponível mudou?
 * Começa no Disponível do início do período, mostra cada movimento com o Disponível depois dele e
 * termina no Disponível do fim do período (hoje: o mesmo número do card). Os filtros escondem
 * linhas, mas "Disponível após" é sempre o saldo da organização depois daquele movimento.
 */

const BASE = "/payout/financas-eventos";
const POR_PAGINA = 20;

type Filtro = "todos" | TipoDeMovimento | "repasse-pago" | "repasse-agendado";
const TIPOS: Array<{ id: Filtro; label: string }> = [
    { id: "todos", label: "Todos os movimentos" },
    { id: "venda", label: "Vendas" },
    { id: "liberacao", label: "Liberações" },
    { id: "taxa", label: "Taxas e custos" },
    { id: "credito", label: "Créditos" },
    { id: "devolucao", label: "Devoluções" },
    { id: "repasse", label: "Repasses" },
    { id: "repasse-pago", label: "Repasses pagos" },
    { id: "repasse-agendado", label: "Repasses agendados" },
    { id: "antecipacao", label: "Antecipações" },
];
const noFiltro = (m: LinhaDoExtrato, f: Filtro) => f === "todos" || (f === "repasse-pago" ? m.situacao === "pago" : f === "repasse-agendado" ? m.situacao === "agendado" : m.tipo === f);

const COR_DO_TIPO: Record<TipoDeMovimento, "gray" | "blue" | "warning" | "success" | "error" | "purple"> = {
    venda: "gray",
    liberacao: "blue",
    taxa: "warning",
    credito: "success",
    devolucao: "error",
    repasse: "purple",
    antecipacao: "blue",
};

const hoje = parseDate(HOJE);
const dias = (n: number) => ({ start: hoje.subtract({ days: n }), end: hoje });
/** Período padrão: do mesmo dia do mês passado até hoje (17/10 a 17/11). */
const UM_MES_ATRAS = hoje.subtract({ months: 1 }).toString();
const PERIODOS = {
    d7: { label: "Últimos 7 dias", value: dias(7) },
    d30: { label: "Últimos 30 dias", value: { start: hoje.subtract({ months: 1 }), end: hoje } },
    d90: { label: "Últimos 90 dias", value: dias(DIAS_DO_EXTRATO) },
};
const simples = (t: string) =>
    t
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

type Linha = { id: string; saldo: "inicial" | "final"; data: string; valor: number } | (LinhaDoExtrato & { saldo?: undefined });

export function FinancasExtrato() {
    const [cenario, setCenario] = useCenario();
    const [params, setParams] = useSearchParams();

    const eventos = eventosDoCenario(cenario);
    const bloqueado = cenario === "bloqueado";
    const comCenario = (rota: string) => `${rota}${cenario === "normal" ? "" : `${rota.includes("?") ? "&" : "?"}cenario=${cenario}`}`;
    const compensa = fraseDeCompensacao(eventos);

    // Período: `de`/`ate` na URL, ou o atalho `periodo=90` (usado pelos links que chegam aqui), ou 30 dias.
    const limite = somarDias(HOJE, -DIAS_DO_EXTRATO);
    const de = [params.get("de") ?? (params.get("periodo") === "90" ? limite : UM_MES_ATRAS), limite].sort()[1];
    const ate = [params.get("ate") ?? HOJE, HOJE].sort()[0];
    const busca = params.get("busca") ?? "";
    const filtro = TIPOS.find((t) => t.id === params.get("tipo"))?.id ?? "todos";
    const eventoId = params.get("evento") ?? "todos";
    const mudar = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        for (const [chave, valor] of Object.entries({ pagina: null, ...mudancas })) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudar({ busca: null, tipo: null, evento: null });
    const comFiltro = Boolean(busca) || filtro !== "todos" || eventoId !== "todos";

    const x = extrato(eventos, de, ate);
    const termo = simples(busca);
    const visiveis = x.linhas.filter((m) => noFiltro(m, filtro) && (eventoId === "todos" || m.evento.id === eventoId) && (!termo || simples(`${m.titulo} ${m.evento.nome} ${ROTULO_DO_MOVIMENTO[m.tipo]}`).includes(termo)));
    const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
    const pagina = Math.min(Math.max(1, Number(params.get("pagina")) || 1), paginas);
    const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    // Saldo inicial no topo da primeira página; saldo final no fim da última.
    const linhas: Linha[] = [
        ...(pagina === 1 ? [{ id: "saldo-inicial", saldo: "inicial" as const, data: de, valor: x.saldoInicial }] : []),
        ...daPagina,
        ...(pagina === paginas ? [{ id: "saldo-final", saldo: "final" as const, data: ate, valor: x.saldoFinal }] : []),
    ];
    const aberto = x.linhas.find((m) => m.id === params.get("movimento")) ?? null;
    const eventosDoPeriodo = [{ id: "todos", label: "Todos os eventos" }, ...[...new Map(x.linhas.map((m) => [m.evento.id, m.evento.nome])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }))];
    const temDados = cenario === "normal" || cenario === "negativo" || bloqueado;

    const baixar = () => {
        baixarCsv("financas-extrato.csv", [
            ["Data", "Movimento", "Tipo", "Evento", "Valor", "Disponível após"],
            [dataDoCsv(de), `Disponível em ${dataCurta(de)}`, "", "", "", x.saldoInicial],
            ...visiveis.map((m) => [dataDoCsv(m.data), m.titulo, ROTULO_DO_MOVIMENTO[m.tipo], m.evento.nome, m.valor, m.efeito === 0 ? (m.semEfeito ?? "") : m.apos]),
            [dataDoCsv(ate), `Disponível em ${dataCurta(ate)}`, "", "", "", x.saldoFinal],
        ]);
        toast.success(`Extrato baixado com ${visiveis.length === 1 ? "1 movimento" : `${visiveis.length} movimentos`}.`);
    };

    const conteudo = () => {
        if (cenario === "carregando") return <Carregando variante="lista" />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        const semMovimentos = x.linhas.length === 0;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu Disponível está negativo em ${reais(-totalizar(eventos).disponivel)}`}>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}
                <Secao
                    titulo="Movimentos"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {visiveis.length === x.linhas.length ? `${x.linhas.length} movimentos` : `${visiveis.length} de ${x.linhas.length} movimentos`}
                        </Badge>
                    }
                >
                    <FilterBar.Root className="items-center border-b border-secondary px-6 py-4">
                        <FilterBar.Content className="items-center">
                            <div className="w-64">
                                <Input size="sm" icon={SearchLg} aria-label="Buscar movimento" placeholder="Buscar movimento" value={busca} onChange={(valor) => mudar({ busca: valor })} />
                            </div>
                            <DateRangePicker
                                size="sm"
                                aria-label="Período do extrato"
                                presets={PERIODOS}
                                minValue={parseDate(limite)}
                                maxValue={hoje}
                                value={{ start: parseDate(de), end: parseDate(ate) }}
                                onChange={(periodo) => periodo && mudar({ de: periodo.start.toString(), ate: periodo.end.toString(), periodo: null })}
                            />
                            <div className="w-56">
                                <Select size="sm" aria-label="Filtrar por evento" selectedKey={eventosDoPeriodo.some((e) => e.id === eventoId) ? eventoId : "todos"} onSelectionChange={(chave) => mudar({ evento: chave === "todos" ? null : String(chave) })} items={eventosDoPeriodo}>
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                            <div className="w-56">
                                <Select size="sm" aria-label="Filtrar por tipo de movimento" selectedKey={filtro} onSelectionChange={(chave) => mudar({ tipo: chave === "todos" ? null : String(chave) })} items={TIPOS}>
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                            {comFiltro && (
                                <Button size="sm" color="link-gray" onClick={limpar}>
                                    Limpar filtros
                                </Button>
                            )}
                        </FilterBar.Content>
                    </FilterBar.Root>

                    {visiveis.length === 0 ? (
                        <div className="flex justify-center px-6 py-16">
                            <EmptyState size="sm">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                                </EmptyState.Header>
                                <EmptyState.Content>
                                    <EmptyState.Title>{semMovimentos ? "Nenhum movimento neste período" : "Nenhum movimento com esse filtro"}</EmptyState.Title>
                                    {semMovimentos && temDados && eventos.length === 0 && <EmptyState.Description>Vendas, liberações e repasses aparecem aqui.</EmptyState.Description>}
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    {semMovimentos ? (
                                        de > limite && (
                                            <Button size="md" color="secondary" onClick={() => mudar({ de: limite, ate: HOJE, periodo: null })}>
                                                Ver últimos 90 dias
                                            </Button>
                                        )
                                    ) : (
                                        <Button size="md" color="secondary" onClick={limpar}>
                                            Limpar filtros
                                        </Button>
                                    )}
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    ) : (
                        <Table aria-label="Extrato" onRowAction={(chave) => !String(chave).startsWith("saldo-") && mudar({ movimento: String(chave), pagina: String(pagina) })}>
                            <Table.Header>
                                <Table.Head id="data" label="Data" isRowHeader />
                                <Table.Head id="movimento" label="Movimento" />
                                <Table.Head id="evento" label="Evento" />
                                <Table.Head id="valor" label="Valor" className="text-right" />
                                <Table.Head id="apos" label="Disponível após" className="text-right" />
                            </Table.Header>
                            <Table.Body items={linhas}>
                                {(linha) =>
                                    linha.saldo ? (
                                        <Table.Row id={linha.id} className="bg-secondary">
                                            <Table.Cell className="whitespace-nowrap">{dataCurta(linha.data)}</Table.Cell>
                                            <Table.Cell>
                                                <span className="font-semibold text-primary">Disponível em {dataCurta(linha.data)}</span>
                                            </Table.Cell>
                                            <Table.Cell />
                                            <Table.Cell />
                                            <Table.Cell className="text-right">
                                                <span className={cx("font-semibold tabular-nums", linha.valor < 0 ? "text-error-primary" : "text-primary")}>{reais(linha.valor)}</span>
                                            </Table.Cell>
                                        </Table.Row>
                                    ) : (
                                        <Table.Row id={linha.id} className="cursor-pointer">
                                            <Table.Cell className="whitespace-nowrap">{linha.data === HOJE ? "Hoje" : dataComDia(linha.data)}</Table.Cell>
                                            <Table.Cell>
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <Badge size="sm" type="pill-color" color={COR_DO_TIPO[linha.tipo]}>
                                                        {ROTULO_DO_MOVIMENTO[linha.tipo]}
                                                    </Badge>
                                                    <span className="font-medium text-primary">{linha.titulo}</span>
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>{linha.evento.nome}</Table.Cell>
                                            <Table.Cell className="text-right">
                                                <span className={cx("font-medium whitespace-nowrap tabular-nums", linha.tipo === "repasse" || linha.tipo === "venda" ? "text-primary" : linha.valor > 0 ? "text-success-primary" : "text-error-primary")}>
                                                    {linha.valor > 0 ? "+ " : ""}
                                                    {reais(linha.valor)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell className="text-right">
                                                {linha.efeito === 0 ? (
                                                    <span className="flex flex-col items-end">
                                                        <span aria-hidden="true">—</span>
                                                        <span className="text-xs text-tertiary">{linha.semEfeito}</span>
                                                    </span>
                                                ) : (
                                                    <span className={cx("font-medium whitespace-nowrap tabular-nums", linha.apos < 0 ? "text-error-primary" : "text-primary")}>{reais(linha.apos)}</span>
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                    )
                                }
                            </Table.Body>
                        </Table>
                    )}
                    {paginas > 1 && <Paginacao pagina={pagina} total={paginas} aoMudar={(p) => mudar({ pagina: p === 1 ? null : String(p) })} />}
                </Secao>
            </>
        );
    };

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Extrato"
                acima={
                    <Button size="sm" color="link-gray" iconLeading={ArrowLeft} className="self-start" href={comCenario(BASE)}>
                        Finanças
                    </Button>
                }
                acoes={
                    temDados && (
                        <Button size="md" color="secondary" iconLeading={Download01} onClick={baixar}>
                            Baixar extrato
                        </Button>
                    )
                }
            />
            {conteudo()}
            {temDados && <PainelDoMovimento movimento={aberto} aoFechar={() => mudar({ movimento: null, pagina: pagina === 1 ? null : String(pagina) })} />}
        </FinancasShell>
    );
}
