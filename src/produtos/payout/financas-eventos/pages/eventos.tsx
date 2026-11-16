import type { ReactNode } from "react";
import { parseDate } from "@internationalized/date";
import { Link, useSearchParams } from "react-router";
import { ChevronRight, Download01, SearchLg } from "@untitledui/icons";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { capaDoEvento } from "../../components/financas/capa";
import { Cascata, Distribuicao, NumeroGrande, Secao, type ParteComDetalhe } from "../../components/financas/cascata";
import { HOJE, calendario, eventosDoCenario, totalizar, type Evento } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, SemEventos, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { dataCurta, dataDoEvento, reais } from "../../components/financas/formato";
import { detalhesDaDistribuicao, fraseDeCompensacao, statusDoDinheiro } from "../../components/financas/frases";
import { PainelDoDetalhe } from "../../components/financas/painel-do-detalhe";
import { CabecalhoDaPagina, FinancasShell, useCenario, useParametro } from "../../components/financas/shell";
import { Paginacao } from "../components/paginacao";
import { SelosDoEvento } from "../components/selos-do-evento";
import { ORDENS, POR_PAGINA, SITUACOES, baixarRelatorio, filtrarEOrdenar, type Ordem, type Situacao } from "../utils/lista";

/*
 * Finanças · "Eventos como pastas" (direções B + D do briefing de 16/11/2026, ajustes v2).
 * Topo: a conta que fecha, para a organização inteira. Abaixo: todos os eventos como pastas, sem
 * colunas de valores, com busca, filtro, ordenação e paginação. O que explica o dinheiro de um
 * evento mora dentro da pasta, na página do evento.
 */

const ACOES: AcaoFinal[] = ["repasse", "antecipar", "eventos"];
const PARTES: ParteComDetalhe[] = ["taxas", "creditos", "ajustes"];

/* Atalhos de período da data do evento, contados a partir do "hoje" do protótipo. */
const hoje = parseDate(HOJE);
const PERIODOS = {
    proximos: { label: "Próximos eventos", value: { start: hoje, end: hoje.add({ years: 1 }) } },
    ultimos90: { label: "Últimos 90 dias", value: { start: hoje.subtract({ days: 90 }), end: hoje } },
    esteAno: { label: "Este ano", value: { start: hoje.set({ month: 1, day: 1 }), end: hoje.set({ month: 12, day: 31 }) } },
    anoPassado: { label: "Ano passado", value: { start: hoje.subtract({ years: 1 }).set({ month: 1, day: 1 }), end: hoje.subtract({ years: 1 }).set({ month: 12, day: 31 }) } },
};

/** Número de destaque do topo: rótulo, valor com centavos e, se houver dado novo, uma legenda. */
const Destaque = ({ rotulo, valor, cor, tamanho = "text-display-xs", legenda, children }: { rotulo: string; valor: number; cor: string; tamanho?: string; legenda?: string; children?: ReactNode }) => (
    <div className="flex min-w-0 flex-col gap-3 px-6 py-5">
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-secondary">{rotulo}</span>
            <NumeroGrande valor={valor} className={cx(tamanho, cor)} classeDosCentavos="text-lg" />
            {legenda && <span className="text-sm text-tertiary">{legenda}</span>}
        </div>
        {children}
    </div>
);

const PastaDoEvento = ({ evento, sufixo, lista }: { evento: Evento; sufixo: string; lista: string }) => (
    <li>
        <Link
            to={`/payout/financas-eventos/${evento.id}${sufixo}`}
            state={{ lista }}
            className="group flex items-center gap-4 px-6 py-4 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
            <Avatar size="md" rounded={false} src={capaDoEvento(evento.id)} alt="" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-md font-semibold text-primary">{evento.nome}</span>
                    <span className="text-sm text-tertiary">{dataDoEvento(evento.data)}</span>
                    <SelosDoEvento evento={evento} />
                </div>
                <span className={cx("text-sm", evento.disponivel < 0 ? "text-error-primary" : "text-secondary")}>{statusDoDinheiro(evento)}</span>
            </div>
            <ChevronRight className="size-5 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:text-fg-secondary" aria-hidden="true" />
        </Link>
    </li>
);

export function FinancasEventos() {
    const [cenario, setCenario] = useCenario();
    const [acaoAberta, setAcao] = useParametro("acao");
    const [detalheAberto, setDetalhe] = useParametro("detalhe");
    const [params, setParams] = useSearchParams();

    const eventos = eventosDoCenario(cenario);
    const totais = totalizar(eventos);
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const detalhe = PARTES.find((p) => p === detalheAberto) ?? null;
    const sufixo = cenario === "normal" ? "" : `?cenario=${cenario}`;
    const proximaALiberar = calendario(eventos, ["aLiberar"])[0];
    const compensa = fraseDeCompensacao(eventos);
    const negativos = eventos.filter((e) => e.disponivel < 0);

    /* ---- lista: busca, filtro, ordem e página ficam na URL, para o "voltar" do evento devolver a lista como estava ---- */
    const busca = params.get("busca") ?? "";
    const situacao = SITUACOES.find((s) => s.id === params.get("situacao"))?.id ?? "todos";
    const ordem = ORDENS.find((o) => o.id === params.get("ordem"))?.id ?? "data";
    const de = params.get("de") ?? undefined;
    const ate = params.get("ate") ?? undefined;
    const mudarLista = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        // Qualquer mudança de busca, filtro ou ordem volta para a primeira página.
        for (const [chave, valor] of Object.entries({ pagina: null, ...mudancas })) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudarLista({ busca: null, situacao: null, de: null, ate: null });

    const resultado = filtrarEOrdenar(eventos, { busca, situacao, ordem, de, ate });
    const paginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA));
    const pagina = Math.min(Math.max(1, Number(params.get("pagina")) || 1), paginas);
    const daPagina = resultado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    const comFiltro = situacao !== "todos" || Boolean(de || ate);
    const contagem = (n: number) => (n === 1 ? "1 evento" : `${n} eventos`);

    const conteudo = () => {
        if (acao) return <TelaFinal acao={acao} valor={acao === "repasse" ? totais.disponivel : acao === "antecipar" ? totais.aLiberar : undefined} aoVoltar={() => setAcao(null)} />;
        if (cenario === "carregando") return <Carregando />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        if (cenario === "sem-eventos") return <SemEventos aoIrParaEventos={() => setAcao("eventos")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu Disponível agora está negativo em ${reais(-totais.disponivel)}`}>
                        <p>
                            {negativos.length === 1 ? `O evento ${negativos[0].nome} teve` : `${negativos.length} eventos tiveram`} ajustes depois do último repasse, e você já recebeu o que estava disponível nos outros
                            eventos.
                        </p>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}

                <section aria-label="Resumo do seu dinheiro" className="grid grid-cols-[1.3fr_1fr_1fr] divide-x divide-secondary rounded-2xl bg-primary ring-1 ring-secondary">
                    <Destaque rotulo="Disponível agora" valor={totais.disponivel} tamanho="text-display-sm" cor={totais.disponivel < 0 ? "text-error-primary" : "text-success-primary"} />
                    <Destaque
                        rotulo="A liberar"
                        valor={totais.aLiberar}
                        cor="text-utility-blue-500"
                        legenda={proximaALiberar ? `Próximo: ${reais(proximaALiberar.valor)} em ${dataCurta(proximaALiberar.data)}` : undefined}
                    >
                        {totais.aLiberar > 0 && (
                            <Button size="sm" color="secondary" className="self-start" isDisabled={bloqueado} onClick={() => setAcao("antecipar")}>
                                Antecipar
                            </Button>
                        )}
                    </Destaque>
                    <Destaque rotulo="Já recebido" valor={totais.recebido} cor="text-primary" />
                </section>

                <Secao titulo="A conta de todos os eventos">
                    <Cascata totais={totais} aoAbrir={setDetalhe} aoVerRelatorio={() => toast("Aqui abriria o relatório de vendas de todos os eventos.")} />
                    <Distribuicao totais={totais} detalhes={detalhesDaDistribuicao(eventos)} />
                </Secao>

                <Secao
                    titulo="Seus eventos"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {resultado.length === eventos.length ? contagem(eventos.length) : `${resultado.length} de ${contagem(eventos.length)}`}
                        </Badge>
                    }
                    lateral={
                        <Button
                            size="sm"
                            color="secondary"
                            iconLeading={Download01}
                            isDisabled={resultado.length === 0}
                            onClick={() => {
                                baixarRelatorio(resultado);
                                toast.success(`Relatório baixado com ${contagem(resultado.length)}.`);
                            }}
                        >
                            Baixar relatório
                        </Button>
                    }
                >
                    <div className="flex flex-wrap items-center gap-3 border-b border-secondary px-6 py-4">
                        <div className="w-72">
                            <Input size="sm" icon={SearchLg} aria-label="Buscar evento pelo nome" placeholder="Buscar evento" value={busca} onChange={(valor) => mudarLista({ busca: valor })} />
                        </div>
                        <div className="w-60">
                            <Select size="sm" aria-label="Filtrar por situação" selectedKey={situacao} onSelectionChange={(chave) => mudarLista({ situacao: chave === "todos" ? null : (chave as Situacao) })} items={SITUACOES}>
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        </div>
                        <DateRangePicker
                            size="sm"
                            aria-label="Período da data do evento"
                            presets={PERIODOS}
                            value={de && ate ? { start: parseDate(de), end: parseDate(ate) } : null}
                            onChange={(periodo) => mudarLista({ de: periodo?.start.toString() ?? null, ate: periodo?.end.toString() ?? null })}
                        />
                        {(busca || comFiltro) && (
                            <Button size="sm" color="link-gray" onClick={limpar}>
                                Limpar filtros
                            </Button>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <span id="rotulo-ordem" className="text-sm text-tertiary">
                                Ordenar por
                            </span>
                            <div className="w-48">
                                <Select size="sm" aria-labelledby="rotulo-ordem" selectedKey={ordem} onSelectionChange={(chave) => mudarLista({ ordem: chave === "data" ? null : (chave as Ordem) })} items={ORDENS}>
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                        </div>
                    </div>

                    {resultado.length === 0 ? (
                        <div className="flex justify-center px-6 py-16">
                            <EmptyState size="sm">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                                </EmptyState.Header>
                                <EmptyState.Content>
                                    <EmptyState.Title>{busca ? "Nenhum evento encontrado" : "Nenhum evento com esse filtro"}</EmptyState.Title>
                                    {busca && <EmptyState.Description>Confira o nome ou limpe os filtros.</EmptyState.Description>}
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    <Button size="md" color="secondary" onClick={limpar}>
                                        Limpar filtros
                                    </Button>
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    ) : (
                        <ul className={cx("flex flex-col divide-y divide-secondary overflow-hidden", paginas === 1 && "rounded-b-2xl")}>
                            {daPagina.map((e) => (
                                <PastaDoEvento key={e.id} evento={e} sufixo={sufixo} lista={`?${params.toString()}`} />
                            ))}
                        </ul>
                    )}
                    {paginas > 1 && <Paginacao pagina={pagina} total={paginas} aoMudar={(p) => mudarLista({ pagina: p === 1 ? null : String(p) })} />}
                </Secao>
            </>
        );
    };

    const temDados = !acao && (cenario === "normal" || cenario === "negativo" || bloqueado);

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Finanças"
                acoes={
                    temDados && (
                        <Button size="md" color="primary" isDisabled={bloqueado || totais.disponivel <= 0} onClick={() => setAcao("repasse")}>
                            Solicitar repasse
                        </Button>
                    )
                }
            />
            {conteudo()}
            {temDados && <PainelDoDetalhe parte={detalhe} eventos={eventos} aoFechar={() => setDetalhe(null)} />}
        </FinancasShell>
    );
}
