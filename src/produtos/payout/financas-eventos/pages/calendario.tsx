import { useState } from "react";
import { parseDate } from "@internationalized/date";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, ChevronDown, ChevronRight, SearchLg } from "@untitledui/icons";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import { COR_DA_PARTE, NumeroGrande, Secao } from "../../components/financas/cascata";
import {
    GRUPO_DA_ENTRADA,
    HOJE,
    ROTULO_DA_ENTRADA,
    entradasDoCalendario,
    eventosDoCenario,
    resumoDoCalendario,
    semanasDoCalendario,
    somarDias,
    totalizar,
    type Entrada,
    type GrupoDeEntrada,
    type PeriodoDoCalendario,
    type TipoDeEntrada,
} from "../../components/financas/dados";
import { tituloDeTooltip } from "../../components/financas/dica";
import { AvisoDeBloqueio, Carregando, ErroAoCarregar, TelaFinal } from "../../components/financas/estados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";
import { CabecalhoDaPagina, FinancasShell, useCenario } from "../../components/financas/shell";

/*
 * Calendário de liberações (ajustes v3, seção 4.1, refeito depois da crítica de design de 17/11).
 * Pergunta que responde: quanto ainda vai entrar no meu Disponível, e quando?
 * De cima para baixo:
 *  - um número: o total a liberar (Em processamento + Retido + Antecipável da organização), com as
 *    faixas acumuladas (até 7 dias, até 30 dias) e o que não tem data;
 *  - o gráfico por semana, empilhado por tipo; clicar em uma semana filtra a lista;
 *  - a lista por dia: uma linha por dia, com o total; abre para mostrar os eventos.
 * O topo e o gráfico são sempre da organização inteira; os filtros mudam só a lista.
 */

const BASE = "/payout/financas-eventos";

type Filtro = "todos" | "antecipavel" | "retido" | "retido-evento" | "retido-seguranca" | "processamento";

const TIPOS: Array<{ id: Filtro; label: string; tipos?: TipoDeEntrada[] }> = [
    { id: "todos", label: "Todos os tipos" },
    { id: "antecipavel", label: "Antecipável", tipos: ["aLiberar"] },
    { id: "retido", label: "Retido", tipos: ["retidoEvento", "retidoSeguranca"] },
    { id: "retido-evento", label: "Retido até o evento", tipos: ["retidoEvento"] },
    { id: "retido-seguranca", label: "Retido por segurança", tipos: ["retidoSeguranca"] },
    { id: "processamento", label: "Em processamento", tipos: ["processamento"] },
];

const GRUPOS: Array<{ id: GrupoDeEntrada; rotulo: string }> = [
    { id: "aLiberar", rotulo: "Antecipável" },
    { id: "retido", rotulo: "Retido" },
    { id: "processamento", rotulo: "Em processamento" },
];

const hoje = parseDate(HOJE);
const PERIODOS = {
    em7: { label: "Próximos 7 dias", value: { start: hoje, end: hoje.add({ days: 7 }) } },
    em30: { label: "Próximos 30 dias", value: { start: hoje, end: hoje.add({ days: 30 }) } },
    em90: { label: "Próximos 90 dias", value: { start: hoje, end: hoje.add({ days: 90 }) } },
};
/** Fim do período "depois" quando ele vira filtro de data: longe o bastante para pegar tudo. */
const MUITO_DEPOIS = somarDias(HOJE, 730);

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const nomeDoMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
const quantos = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);
const ponto = (grupo: GrupoDeEntrada) => <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", COR_DA_PARTE[grupo])} />;

/* ---------------- topo: total a liberar ---------------- */

const Faixa = ({ rotulo, apoio, valor }: { rotulo: string; apoio: string; valor: number }) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1 border-l border-secondary pl-6">
        <dt className="text-sm font-medium text-secondary">{rotulo}</dt>
        <dd className="text-xl font-semibold whitespace-nowrap text-primary tabular-nums">{reais(valor)}</dd>
        <dd className="text-sm text-tertiary">{apoio}</dd>
    </div>
);

/* ---------------- gráfico por semana ---------------- */

const SEM_ANO = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

interface BarraProps {
    periodo: PeriodoDoCalendario;
    rotulo: string;
    maior: number;
    selecionada: boolean;
    apagada: boolean;
    aoEscolher: () => void;
}

/** Uma semana do gráfico: barra empilhada por tipo. Lacuna do DS: não há gráfico de barras pronto (só a base do Recharts). */
const Barra = ({ periodo, rotulo, maior, selecionada, apagada, aoEscolher }: BarraProps) => {
    const partes = GRUPOS.filter((g) => periodo.porGrupo[g.id] > 0);
    const descricao = partes.length ? partes.map((g) => `${g.rotulo}: ${reais(periodo.porGrupo[g.id])}`).join(" · ") : "Nenhuma liberação prevista";
    return (
        <Tooltip title={tituloDeTooltip(`${rotulo} · ${reais(periodo.total)}`)} description={descricao} delay={0} closeDelay={0} arrow>
            <TooltipTrigger
                aria-label={`${rotulo}: ${reais(periodo.total)}. ${descricao}. ${selecionada ? "Mostrando só este período" : "Filtrar a lista por este período"}`}
                aria-pressed={selecionada}
                isDisabled={periodo.total === 0}
                onPress={aoEscolher}
                className={cx(
                    "group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2 rounded-lg px-1 py-2 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 disabled:cursor-default disabled:hover:bg-transparent",
                    selecionada && "bg-secondary",
                    apagada && "opacity-50",
                )}
            >
                <span className={cx("text-xs font-semibold whitespace-nowrap tabular-nums", periodo.total ? "text-primary" : "text-quaternary")}>{periodo.total ? reais(periodo.total) : "—"}</span>
                <span className="flex h-28 w-full max-w-16 flex-col-reverse gap-0.5">
                    {partes.map((g) => (
                        <span key={g.id} className={cx("min-h-1 w-full rounded-xs", COR_DA_PARTE[g.id])} style={{ height: `${(periodo.porGrupo[g.id] / maior) * 100}%` }} />
                    ))}
                    {partes.length === 0 && <span className="h-px w-full bg-quaternary" />}
                </span>
                <span className="text-xs whitespace-nowrap text-tertiary">{rotulo}</span>
            </TooltipTrigger>
        </Tooltip>
    );
};

/* ---------------- lista por dia ---------------- */

interface DiaProps {
    titulo: string;
    itens: Entrada[];
    aberto: boolean;
    aoAlternar: () => void;
    rotaDoEvento: (id: string) => string;
}

/** Uma linha por dia: data, quantos eventos e o total. Abre para mostrar cada evento. */
const Dia = ({ titulo, itens, aberto, aoAlternar, rotaDoEvento }: DiaProps) => {
    const total = itens.reduce((s, i) => s + i.valor, 0);
    const grupos = GRUPOS.filter((g) => itens.some((i) => GRUPO_DA_ENTRADA[i.tipo] === g.id));
    const eventos = new Set(itens.map((i) => i.evento.id)).size;
    return (
        <li className="border-b border-secondary last:border-b-0">
            <button
                type="button"
                aria-expanded={aberto}
                onClick={aoAlternar}
                className="flex w-full cursor-pointer items-center gap-4 px-6 py-3 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
                {aberto ? <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" /> : <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />}
                <span className="w-32 shrink-0 text-sm font-semibold whitespace-nowrap text-primary">{titulo}</span>
                <span className="flex min-w-0 flex-1 items-center gap-3 text-sm text-tertiary">
                    <span className="truncate">{eventos === 1 ? itens[0].evento.nome : `${eventos} eventos`}</span>
                    {grupos.map((g) => (
                        <span key={g.id} className="flex shrink-0 items-center gap-1.5">
                            {ponto(g.id)}
                            {g.rotulo}
                        </span>
                    ))}
                </span>
                <span className="text-md font-semibold whitespace-nowrap text-primary tabular-nums">{reais(total)}</span>
            </button>
            {aberto && (
                <ul className="flex flex-col pb-2">
                    {itens.map((e) => (
                        <li key={`${e.evento.id}-${e.tipo}-${e.valor}`}>
                            <Link
                                to={rotaDoEvento(e.evento.id)}
                                className="flex items-center gap-4 py-2 pr-6 pl-15 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
                            >
                                <span className="flex w-32 shrink-0 items-center gap-1.5 text-sm text-tertiary">{ponto(GRUPO_DA_ENTRADA[e.tipo])}</span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium text-primary">{e.evento.nome}</span>
                                    <span className="truncate text-sm text-tertiary">
                                        {ROTULO_DA_ENTRADA[e.tipo]}
                                        {e.nota && ` · ${e.nota}`}
                                    </span>
                                </span>
                                <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">{reais(e.valor)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
};

export function FinancasCalendario() {
    const [cenario, setCenario] = useCenario();
    const [params, setParams] = useSearchParams();
    const [abertos, setAbertos] = useState<Set<string>>(new Set());

    const eventos = eventosDoCenario(cenario);
    const totais = totalizar(eventos);
    const bloqueado = cenario === "bloqueado";
    const comCenario = (rota: string) => `${rota}${cenario === "normal" ? "" : `${rota.includes("?") ? "&" : "?"}cenario=${cenario}`}`;
    const entradas = entradasDoCalendario(eventos);
    const resumo = resumoDoCalendario(entradas);
    const grafico = semanasDoCalendario(entradas);
    const periodos = [...grafico.semanas, ...(grafico.depois.total > 0 ? [grafico.depois] : [])];
    const maior = Math.max(1, ...periodos.map((p) => p.total));

    const eventoId = params.get("evento") ?? "todos";
    const filtro = TIPOS.find((t) => t.id === params.get("tipo")) ?? TIPOS[0];
    const de = params.get("de") ?? undefined;
    const ate = params.get("ate") ?? undefined;
    const antecipar = params.get("antecipar");
    const eventoParaAntecipar = eventos.find((e) => e.id === antecipar);
    const mudar = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        for (const [chave, valor] of Object.entries(mudancas)) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudar({ evento: null, tipo: null, de: null, ate: null });
    const comFiltro = eventoId !== "todos" || filtro.id !== "todos" || Boolean(de || ate);
    const eventosDoCalendario = [...new Map(entradas.map((e) => [e.evento.id, e.evento.nome])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }));

    const lista = entradas.filter(
        (e) => (eventoId === "todos" || e.evento.id === eventoId) && (!filtro.tipos || filtro.tipos.includes(e.tipo)) && (!(de || ate) || (e.data !== undefined && (!de || e.data >= de) && (!ate || e.data <= ate))),
    );

    // Mês › dia. O que não tem data (Pix parcelado) fica num grupo à parte, no fim.
    const meses: Array<{ mes: string; dias: Array<{ data: string; itens: Entrada[] }> }> = [];
    for (const e of lista.filter((x) => x.data)) {
        const mes = nomeDoMes(e.data!);
        let grupo = meses.find((m) => m.mes === mes);
        if (!grupo) meses.push((grupo = { mes, dias: [] }));
        let dia = grupo.dias.find((d) => d.data === e.data);
        if (!dia) grupo.dias.push((dia = { data: e.data!, itens: [] }));
        dia.itens.push(e);
    }
    const semData = lista.filter((x) => !x.data);
    const diasNaLista = meses.reduce((s, m) => s + m.dias.length, 0);
    const diasNoTotal = new Set(entradas.filter((e) => e.data).map((e) => e.data)).size;
    // Com um evento escolhido, a lista já é curta: abre tudo.
    const estaAberto = (chave: string) => eventoId !== "todos" || abertos.has(chave);
    const alternar = (chave: string) =>
        setAbertos((atual) => {
            const novo = new Set(atual);
            if (!novo.delete(chave)) novo.add(chave);
            return novo;
        });
    const rotaDoEvento = (id: string) => comCenario(`${BASE}/${id}`);

    const conteudo = () => {
        if (antecipar) return <TelaFinal acao="antecipar" evento={eventoParaAntecipar?.nome} valor={eventoParaAntecipar?.aLiberar ?? totais.aLiberar} aoVoltar={() => mudar({ antecipar: null })} />;
        if (cenario === "carregando") return <Carregando variante="lista" />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}

                <TableCard.Root role="region" aria-label="Total a liberar" className="@container flex flex-col">
                    <dl className="flex items-stretch gap-6 px-6 py-5">
                        <div className="flex min-w-0 flex-[1.4] flex-col gap-1">
                            <dt className="text-sm font-medium text-secondary">Total a liberar</dt>
                            <dd>
                                <NumeroGrande valor={grafico.total} className="text-display-sm text-primary" classeDosCentavos="text-xl" />
                            </dd>
                            <dd className="text-sm text-tertiary">Entra no seu Disponível nas datas abaixo</dd>
                        </div>
                        <Faixa rotulo={`Até ${dataCurta(resumo.limite7)}`} apoio="Próximos 7 dias" valor={resumo.em7} />
                        <Faixa rotulo={`Até ${dataCurta(resumo.limite30)}`} apoio="Próximos 30 dias" valor={resumo.em7 + resumo.em30} />
                        {resumo.semData > 0 && <Faixa rotulo="Sem data definida" apoio="Pix parcelado" valor={resumo.semData} />}
                    </dl>
                    {totais.aLiberar > 0 && (
                        <div className="flex items-center justify-between gap-4 border-t border-secondary px-6 py-3">
                            <span className="flex items-center gap-2 text-sm text-secondary">
                                {ponto("aLiberar")}
                                <span>
                                    Você pode antecipar <span className="font-semibold text-primary tabular-nums">{reais(totais.aLiberar)}</span>
                                </span>
                            </span>
                            <Button size="sm" color="secondary" isDisabled={bloqueado} onClick={() => mudar({ antecipar: "todos" })}>
                                Antecipar
                            </Button>
                        </div>
                    )}
                </TableCard.Root>

                {entradas.length > 0 && (
                    <Secao
                        titulo="Liberações por semana"
                        lateral={
                            <ul aria-label="Legenda" className="flex items-center gap-4 text-sm text-tertiary">
                                {GRUPOS.map((g) => (
                                    <li key={g.id} className="flex items-center gap-1.5">
                                        {ponto(g.id)}
                                        {g.rotulo}
                                    </li>
                                ))}
                            </ul>
                        }
                    >
                        <div role="group" aria-label="Total de cada semana. Escolha uma semana para filtrar a lista" className="flex items-stretch gap-1 px-5 py-4">
                            {periodos.map((p) => {
                                const fim = p.ate ?? MUITO_DEPOIS;
                                const selecionada = de === p.de && ate === fim;
                                return (
                                    <Barra
                                        key={p.de}
                                        periodo={p}
                                        rotulo={p.ate ? `${SEM_ANO(p.de)} a ${SEM_ANO(p.ate)}` : `Depois de ${SEM_ANO(somarDias(p.de, -1))}`}
                                        maior={maior}
                                        selecionada={selecionada}
                                        apagada={Boolean(de || ate) && !selecionada}
                                        aoEscolher={() => mudar(selecionada ? { de: null, ate: null } : { de: p.de, ate: fim })}
                                    />
                                );
                            })}
                        </div>
                    </Secao>
                )}

                <Secao
                    titulo="Próximas liberações"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {lista.length === entradas.length
                                ? `${quantos(entradas.length, "liberação", "liberações")}${diasNoTotal ? ` em ${quantos(diasNoTotal, "dia", "dias")}` : ""}`
                                : `${lista.length} de ${quantos(entradas.length, "liberação", "liberações")}`}
                        </Badge>
                    }
                    lateral={
                        diasNaLista > 1 && (
                            <Button
                                size="sm"
                                color="link-gray"
                                onClick={() => setAbertos(abertos.size ? new Set() : new Set([...meses.flatMap((m) => m.dias.map((d) => d.data)), "sem-data"]))}
                            >
                                {abertos.size ? "Recolher tudo" : "Abrir tudo"}
                            </Button>
                        )
                    }
                >
                    {entradas.length > 0 && (
                        <FilterBar.Root className="items-center border-b border-secondary px-6 py-4">
                            <FilterBar.Content className="items-center">
                                {/* Campo com busca, como no Extrato: a organização pode ter dezenas de eventos. Vazio = todos. */}
                                <div className="w-64">
                                    <Select.ComboBox
                                        size="sm"
                                        shortcut={false}
                                        icon={<></>}
                                        status={<ChevronDown aria-hidden="true" className="pointer-events-none size-4 shrink-0 stroke-[2.25px] text-fg-quaternary" />}
                                        aria-label="Filtrar por evento"
                                        placeholder="Todos os eventos"
                                        popoverClassName="w-80"
                                        selectedKey={eventosDoCalendario.some((e) => e.id === eventoId) ? eventoId : null}
                                        onSelectionChange={(chave) => mudar({ evento: chave ? String(chave) : null })}
                                        items={eventosDoCalendario}
                                    >
                                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                    </Select.ComboBox>
                                </div>
                                <div className="w-56">
                                    <Select size="sm" aria-label="Filtrar por tipo" selectedKey={filtro.id} onSelectionChange={(chave) => mudar({ tipo: chave === "todos" ? null : String(chave) })} items={TIPOS}>
                                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                    </Select>
                                </div>
                                <span id="rotulo-data-da-liberacao" className="text-sm text-tertiary">
                                    Data da liberação
                                </span>
                                <DateRangePicker
                                    size="sm"
                                    aria-labelledby="rotulo-data-da-liberacao"
                                    presets={PERIODOS}
                                    value={de && ate ? { start: parseDate(de), end: parseDate(ate) } : null}
                                    onChange={(periodo) => mudar({ de: periodo?.start.toString() ?? null, ate: periodo?.end.toString() ?? null })}
                                />
                                {comFiltro && (
                                    <Button size="sm" color="link-gray" onClick={limpar}>
                                        Limpar filtros
                                    </Button>
                                )}
                            </FilterBar.Content>
                        </FilterBar.Root>
                    )}

                    {lista.length === 0 ? (
                        <div className="flex justify-center px-6 py-16">
                            <EmptyState size="sm">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                                </EmptyState.Header>
                                <EmptyState.Content>
                                    <EmptyState.Title>{entradas.length === 0 ? "Nenhuma liberação prevista" : "Nenhuma liberação com esse filtro"}</EmptyState.Title>
                                    {entradas.length === 0 && <EmptyState.Description>Quando um evento começar a vender, as datas aparecem aqui.</EmptyState.Description>}
                                </EmptyState.Content>
                                {entradas.length > 0 && (
                                    <EmptyState.Footer>
                                        <Button size="md" color="secondary" onClick={limpar}>
                                            Limpar filtros
                                        </Button>
                                    </EmptyState.Footer>
                                )}
                            </EmptyState>
                        </div>
                    ) : (
                        <>
                            {meses.map(({ mes, dias }) => (
                                <section key={mes} aria-label={mes}>
                                    <h3 className="flex items-center justify-between gap-4 border-b border-secondary bg-secondary px-6 py-2 text-xs font-semibold text-quaternary">
                                        <span>{mes}</span>
                                        <span className="tabular-nums">{reais(dias.reduce((s, d) => s + d.itens.reduce((t, i) => t + i.valor, 0), 0))}</span>
                                    </h3>
                                    <ul className="flex flex-col border-b border-secondary last:border-b-0">
                                        {dias.map(({ data, itens }) => (
                                            <Dia key={data} titulo={data === HOJE ? `Hoje, ${dataCurta(data)}` : dataComDia(data)} itens={itens} aberto={estaAberto(data)} aoAlternar={() => alternar(data)} rotaDoEvento={rotaDoEvento} />
                                        ))}
                                    </ul>
                                </section>
                            ))}
                            {semData.length > 0 && (
                                <section aria-label="Sem data definida">
                                    <h3 className="flex items-center justify-between gap-4 border-y border-secondary bg-secondary px-6 py-2 text-xs font-semibold text-quaternary">
                                        <span>Sem data definida</span>
                                        <span className="tabular-nums">{reais(semData.reduce((s, i) => s + i.valor, 0))}</span>
                                    </h3>
                                    <ul className="flex flex-col">
                                        <Dia titulo="Sem data" itens={semData} aberto={estaAberto("sem-data")} aoAlternar={() => alternar("sem-data")} rotaDoEvento={rotaDoEvento} />
                                    </ul>
                                </section>
                            )}
                        </>
                    )}
                </Secao>
            </>
        );
    };

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Calendário de liberações"
                acima={
                    <Button size="sm" color="link-gray" iconLeading={ArrowLeft} className="self-start" href={comCenario(BASE)}>
                        Finanças
                    </Button>
                }
            />
            {conteudo()}
        </FinancasShell>
    );
}
