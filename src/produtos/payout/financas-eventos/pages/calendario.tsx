import { parseDate } from "@internationalized/date";
import { useSearchParams } from "react-router";
import { ArrowLeft, SearchLg } from "@untitledui/icons";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { Secao } from "../../components/financas/cascata";
import { HOJE, ROTULO_DA_ENTRADA, entradasDoCalendario, eventosDoCenario, resumoDoCalendario, somarDias, type Entrada, type TipoDeEntrada } from "../../components/financas/dados";
import { AvisoDeBloqueio, Carregando, ErroAoCarregar, TelaFinal } from "../../components/financas/estados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";
import { CabecalhoDaPagina, FinancasShell, useCenario } from "../../components/financas/shell";

/*
 * Calendário de liberações (ajustes v3, seção 4.1).
 * Pergunta que responde: quando o meu dinheiro entra no Disponível?
 * Resumo em três faixas (somam Em processamento + Retido + Antecipável da organização) e a lista
 * agrupada por mês e por dia. O resumo é sempre da organização inteira; os filtros mudam só a lista.
 */

const BASE = "/payout/financas-eventos";

type Filtro = "todos" | "antecipavel" | "retido" | "retido-evento" | "retido-seguranca" | "processamento";

/* "Retido" (os dois tipos juntos) existe porque a legenda de "Líquido por situação" abre o
   Calendário filtrado pelos dois de uma vez. */
const TIPOS: Array<{ id: Filtro; label: string; tipos?: TipoDeEntrada[] }> = [
    { id: "todos", label: "Todos os tipos" },
    { id: "antecipavel", label: "Antecipável", tipos: ["aLiberar"] },
    { id: "retido", label: "Retido (os dois tipos)", tipos: ["retidoEvento", "retidoSeguranca"] },
    { id: "retido-evento", label: "Retido até o evento", tipos: ["retidoEvento"] },
    { id: "retido-seguranca", label: "Retido por segurança", tipos: ["retidoSeguranca"] },
    { id: "processamento", label: "Em processamento", tipos: ["processamento"] },
];

const COR_DO_TIPO: Record<TipoDeEntrada, "gray" | "warning" | "blue"> = { processamento: "gray", retidoEvento: "warning", retidoSeguranca: "warning", aLiberar: "blue" };

const hoje = parseDate(HOJE);
const PERIODOS = {
    em7: { label: "Próximos 7 dias", value: { start: hoje, end: hoje.add({ days: 7 }) } },
    em30: { label: "Próximos 30 dias", value: { start: hoje, end: hoje.add({ days: 30 }) } },
    em90: { label: "Próximos 90 dias", value: { start: hoje, end: hoje.add({ days: 90 }) } },
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const nomeDoMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
const simples = (t: string) =>
    t
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();

const Faixa = ({ rotulo, valor, apoio }: { rotulo: string; valor: number; apoio: string }) => (
    <TableCard.Root className="flex flex-col gap-1 px-6 py-5">
        <span className="text-sm font-medium text-secondary">{rotulo}</span>
        <span className="text-display-xs font-semibold whitespace-nowrap text-primary tabular-nums">{reais(valor)}</span>
        <span className="text-sm text-tertiary">{apoio}</span>
    </TableCard.Root>
);

export function FinancasCalendario() {
    const [cenario, setCenario] = useCenario();
    const [params, setParams] = useSearchParams();

    const eventos = eventosDoCenario(cenario);
    const bloqueado = cenario === "bloqueado";
    const comCenario = (rota: string) => `${rota}${cenario === "normal" ? "" : `${rota.includes("?") ? "&" : "?"}cenario=${cenario}`}`;
    const entradas = entradasDoCalendario(eventos);
    const resumo = resumoDoCalendario(entradas);

    const busca = params.get("busca") ?? "";
    const filtro = TIPOS.find((t) => t.id === params.get("tipo")) ?? TIPOS[0];
    const de = params.get("de") ?? undefined;
    const ate = params.get("ate") ?? undefined;
    const antecipar = eventos.find((e) => e.id === params.get("antecipar"));
    const mudar = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        for (const [chave, valor] of Object.entries(mudancas)) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudar({ busca: null, tipo: null, de: null, ate: null });
    const comFiltro = Boolean(busca) || filtro.id !== "todos" || Boolean(de || ate);

    const termo = simples(busca);
    const lista = entradas.filter(
        (e) => (!termo || simples(e.evento.nome).includes(termo)) && (!filtro.tipos || filtro.tipos.includes(e.tipo)) && (!(de || ate) || (e.data !== undefined && (!de || e.data >= de) && (!ate || e.data <= ate))),
    );

    // Mês › dia › linhas. O que não tem data (Pix parcelado) fica num grupo à parte, no fim.
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

    const LinhaDaEntrada = ({ e }: { e: Entrada }) => (
        <li className="flex items-center gap-4 px-6 py-3">
            <span className="w-44 shrink-0">
                <Badge size="sm" type="pill-color" color={COR_DO_TIPO[e.tipo]}>
                    {ROTULO_DA_ENTRADA[e.tipo]}
                </Badge>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Button size="sm" color="link-gray" className="self-start text-left whitespace-normal" href={comCenario(`${BASE}/${e.evento.id}`)}>
                    {e.evento.nome}
                </Button>
                {e.nota && <span className="text-sm text-tertiary">{e.nota}</span>}
            </div>
            {e.tipo === "aLiberar" && (
                <Button size="sm" color="secondary" isDisabled={bloqueado} onClick={() => mudar({ antecipar: e.evento.id })}>
                    Antecipar
                </Button>
            )}
            <span className="w-28 shrink-0 text-right text-sm font-semibold whitespace-nowrap text-primary tabular-nums">{reais(e.valor)}</span>
        </li>
    );

    const conteudo = () => {
        if (antecipar) return <TelaFinal acao="antecipar" evento={antecipar.nome} valor={antecipar.aLiberar} aoVoltar={() => mudar({ antecipar: null })} />;
        if (cenario === "carregando") return <Carregando variante="lista" />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                <section aria-label="Quanto entra no Disponível, por prazo" className="grid grid-cols-3 gap-6">
                    <Faixa rotulo="Próximos 7 dias" valor={resumo.em7} apoio={`Até ${dataCurta(resumo.limite7)}`} />
                    <Faixa rotulo="Próximos 30 dias" valor={resumo.em30} apoio={`De ${dataCurta(somarDias(resumo.limite7, 1))} a ${dataCurta(resumo.limite30)}`} />
                    <Faixa
                        rotulo="Depois de 30 dias"
                        valor={resumo.depois}
                        apoio={`A partir de ${dataCurta(somarDias(resumo.limite30, 1))}${resumo.semData ? ` · inclui ${reais(resumo.semData)} sem data` : ""}`}
                    />
                </section>

                <Secao
                    titulo="Liberações"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {lista.length === entradas.length ? `${entradas.length} liberações` : `${lista.length} de ${entradas.length} liberações`}
                        </Badge>
                    }
                >
                    {entradas.length > 0 && (
                        <FilterBar.Root className="items-center border-b border-secondary px-6 py-4">
                            <FilterBar.Content className="items-center">
                                <div className="w-72">
                                    <Input size="sm" icon={SearchLg} aria-label="Buscar evento pelo nome" placeholder="Buscar evento" value={busca} onChange={(valor) => mudar({ busca: valor })} />
                                </div>
                                <div className="w-60">
                                    <Select size="sm" aria-label="Filtrar por tipo" selectedKey={filtro.id} onSelectionChange={(chave) => mudar({ tipo: chave === "todos" ? null : String(chave) })} items={TIPOS}>
                                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                    </Select>
                                </div>
                                <DateRangePicker
                                    size="sm"
                                    aria-label="Período da liberação"
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
                                    <h3 className="border-b border-secondary bg-secondary px-6 py-2 text-xs font-semibold text-quaternary">{mes}</h3>
                                    {dias.map(({ data, itens }) => (
                                        <div key={data} className="border-b border-secondary last:border-b-0">
                                            <div className="flex items-baseline justify-between gap-4 px-6 pt-4 pb-1">
                                                <span className="text-sm font-semibold text-primary">{data === HOJE ? `Hoje, ${dataCurta(data)}` : dataComDia(data)}</span>
                                                {itens.length > 1 && (
                                                    <span className="text-sm text-tertiary">
                                                        Total do dia: <span className="font-semibold text-secondary tabular-nums">{reais(itens.reduce((s, i) => s + i.valor, 0))}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <ul className="flex flex-col pb-2">
                                                {itens.map((e) => (
                                                    <LinhaDaEntrada key={`${e.evento.id}-${e.tipo}-${e.valor}`} e={e} />
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </section>
                            ))}
                            {semData.length > 0 && (
                                <section aria-label="Sem data definida">
                                    <h3 className="border-y border-secondary bg-secondary px-6 py-2 text-xs font-semibold text-quaternary">Sem data definida</h3>
                                    <ul className="flex flex-col py-2">
                                        {semData.map((e) => (
                                            <LinhaDaEntrada key={`${e.evento.id}-${e.tipo}`} e={e} />
                                        ))}
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
