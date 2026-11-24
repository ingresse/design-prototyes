import type { ReactNode } from "react";
import { parseDate } from "@internationalized/date";
import { Link, useSearchParams } from "react-router";
import { Calendar, ChevronRight, Download01, SearchLg } from "@untitledui/icons";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { capaDoEvento } from "../../components/financas/capa";
import { COR_DO_NEGATIVO, Cascata, Distribuicao, PARTES_COM_DETALHE, Secao } from "../../components/financas/cascata";
import { HOJE, ROTULO_DA_ENTRADA, quitado, entradasDoCalendario, eventosDoCenario, motivoDoNegativo, movimentos, totalizar, type Entrada, type Evento } from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar, TelaFinal, type AcaoFinal } from "../../components/financas/estados";
import { dataComDia, dataCurta, dataDoEvento, reais } from "../../components/financas/formato";
import { detalhesDaDistribuicao, fraseDeCompensacao, proximaLiberacaoDoEvento } from "../../components/financas/frases";
import { Linha, Lista, Vazio } from "../../components/financas/linha";
import { PainelDoDetalhe } from "../../components/financas/painel-do-detalhe";
import { ContaDeRelance } from "../../components/financas/relance";
import { CabecalhoDaPagina, FinancasShell, useCenario, useEventosEscolhidos, useParametro, usePeriodo } from "../../components/financas/shell";
import { Paginacao } from "../components/paginacao";
import { SelosDoEvento } from "../components/selos-do-evento";
import { ORDENS, POR_PAGINA, SITUACOES, baixarRelatorio, filtrarEOrdenar, type Ordem, type Situacao } from "../utils/lista";

/*
 * Finanças · a fonte da verdade do produtor (ajustes v3, 17/11/2026).
 * De cima para baixo: "Resumo financeiro" (as duas contas;
 * de onde veio o Líquido e como ele chega ao Saldo disponível), "Últimos movimentos" e "Próximos movimentos" (portas para o
 * Calendário e o Extrato) e "Saldo por evento" (as pastas, com busca, filtro, ordenação e paginação).
 */

const ACOES: AcaoFinal[] = ["repasse", "antecipar", "eventos"];

/* Atalhos de período da data do evento, contados a partir do "hoje" do protótipo. */
const hoje = parseDate(HOJE);
const PERIODOS = {
    proximos: { label: "Próximos eventos", value: { start: hoje, end: hoje.add({ years: 1 }) } },
    ultimos90: { label: "Últimos 90 dias", value: { start: hoje.subtract({ days: 90 }), end: hoje } },
    esteAno: { label: "Este ano", value: { start: hoje.set({ month: 1, day: 1 }), end: hoje.set({ month: 12, day: 31 }) } },
    anoPassado: { label: "Ano passado", value: { start: hoje.subtract({ years: 1 }).set({ month: 1, day: 1 }), end: hoje.subtract({ years: 1 }).set({ month: 12, day: 31 }) } },
};

const BASE = "/payout/financas-eventos";

/**
 * "Últimos movimentos" e "Próximos movimentos" mostram três linhas e um pedaço da quarta, com rolagem
 * dentro do bloco: dá para ver mais sem sair da Visão geral, e a linha cortada avisa que há mais.
 */
const NA_ROLAGEM = 8;
const ROLAGEM = "max-h-68 overflow-y-auto overscroll-contain";

interface ProximoMovimento {
    data?: string;
    tipo: Entrada["tipo"];
    valor: number;
    itens: Entrada[];
    /** Saque já solicitado, com pagamento marcado: o valor cai na conta bancária nesta data. */
    saque?: { evento: Evento; conta: string };
}

/**
 * Próximos movimentos: as liberações (uma linha por data e tipo; vários eventos na mesma data e tipo
 * viram uma linha só) e os saques agendados, em ordem de data.
 */
function proximosMovimentos(eventos: Evento[], quantos: number): ProximoMovimento[] {
    const grupos: ProximoMovimento[] = [];
    for (const e of entradasDoCalendario(eventos)) {
        if (!e.data) continue;
        const grupo = grupos.find((g) => g.data === e.data && g.tipo === e.tipo);
        if (grupo) {
            grupo.valor += e.valor;
            grupo.itens.push(e);
        } else grupos.push({ data: e.data, tipo: e.tipo, valor: e.valor, itens: [e] });
    }
    for (const evento of eventos) {
        for (const r of evento.repasses) if (r.situacao === "agendado") grupos.push({ data: r.data, tipo: "processamento", valor: r.valor, itens: [], saque: { evento, conta: r.conta } });
    }
    return grupos.sort((a, b) => a.data!.localeCompare(b.data!)).slice(0, quantos);
}

const TIPO_NO_CALENDARIO: Record<Entrada["tipo"], string> = { processamento: "processamento", retidoEvento: "retido-evento", retidoSeguranca: "retido-seguranca", aLiberar: "antecipavel" };

/** Largura da coluna de saldo: a mesma na linha de total e em cada evento, para os números alinharem. */
const COLUNA_DE_SALDO = "w-44 shrink-0 text-right";

/**
 * Linha de um evento, lida como conta de banco: o saldo disponível é o número mais forte, à direita;
 * nome, data e selos identificam; a linha de apoio diz sempre a próxima liberação.
 */
const PastaDoEvento = ({ evento, sufixo, lista }: { evento: Evento; sufixo: string; lista: string }) => {
    const encerrado = quitado(evento);
    // R01-05: a linha diz por que o saldo está negativo, em vez de só mostrar o número em vermelho.
    const motivo = motivoDoNegativo(evento);
    return (
        <li className={cx(evento.disponivel < 0 && "bg-error-primary")}>
            <Link
                to={`/payout/financas-eventos/${evento.id}${sufixo}`}
                state={{ lista }}
                className="group flex items-center gap-4 px-6 py-4 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
                <Avatar size="sm" rounded={false} src={capaDoEvento(evento.id)} alt="" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={cx("text-sm font-semibold", encerrado ? "text-secondary" : "text-primary")}>{evento.nome}</span>
                        <span className="text-sm text-tertiary">{dataDoEvento(evento.data)}</span>
                        <SelosDoEvento evento={evento} />
                    </div>
                    {motivo && (
                        <span className="text-sm font-medium text-error-primary">
                            Saldo negativo por {motivo.causa === "devolucao-recente" ? "devolução recente" : "devolução"}: {reais(motivo.valor)} devolvidos{motivo.causa === "devolucao-recente" ? ` até ${dataCurta(motivo.data)}` : ""}, depois do último saque.
                        </span>
                    )}
                    <span className="truncate text-sm text-tertiary">{proximaLiberacaoDoEvento(evento)}</span>
                </div>
                <span className={cx(COLUNA_DE_SALDO, "flex flex-col")}>
                    <span className="text-xs text-tertiary">Saldo disponível</span>
                    <span className={cx("text-md font-semibold whitespace-nowrap tabular-nums", evento.disponivel < 0 ? COR_DO_NEGATIVO : evento.disponivel === 0 ? "text-tertiary" : "text-primary")}>{reais(evento.disponivel)}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:text-fg-secondary" aria-hidden="true" />
            </Link>
        </li>
    );
};

export function FinancasEventos() {
    const [cenario, setCenario] = useCenario();
    const [acaoAberta, setAcao] = useParametro("acao");
    const [detalheAberto, setDetalhe] = useParametro("detalhe");
    const [params, setParams] = useSearchParams();

    // O filtro de eventos da página aplica-se a todos os dados: cards, Resumo financeiro, Líquido por
    // situação, próximas liberações, últimos movimentos e a lista "Saldo por evento".
    const { escolhidos: eventos, filtrado } = useEventosEscolhidos();
    const escopo = eventos;
    const totais = totalizar(eventos);
    const daOrganizacao = totais;
    const bloqueado = cenario === "bloqueado";
    const acao = ACOES.find((a) => a === acaoAberta);
    const detalhe = PARTES_COM_DETALHE.find((p) => p === detalheAberto) ?? null;
    const sufixo = cenario === "normal" ? "" : `?cenario=${cenario}`;
    const compensa = fraseDeCompensacao(eventos);
    const negativos = eventos.filter((e) => e.disponivel < 0);
    const comCenario = (rota: string) => `${rota}${cenario === "normal" ? "" : `${rota.includes("?") ? "&" : "?"}cenario=${cenario}`}`;
    // O período do topo vale para os movimentos; os totais do Resumo são sempre acumulados até hoje (R01-02).
    const periodo = usePeriodo();
    const noPeriodo = (data?: string) => !periodo.ativo || (data !== undefined && data >= periodo.de! && data <= periodo.ate!);
    const doPeriodo = periodo.ativo ? ` de ${dataCurta(periodo.de!)} a ${dataCurta(periodo.ate!)}` : "";
    const proximas = proximosMovimentos(eventos, periodo.ativo ? 999 : NA_ROLAGEM)
        .filter((g) => noPeriodo(g.data))
        .slice(0, NA_ROLAGEM);
    const ultimos = movimentos(eventos)
        .filter((m) => m.efeito !== 0 && noPeriodo(m.data))
        .slice(-NA_ROLAGEM)
        .reverse();

    /* ---- lista: busca, filtro, ordem e página ficam na URL, para o "voltar" do evento devolver a lista como estava ---- */
    const busca = params.get("busca") ?? "";
    const situacao = SITUACOES.find((s) => s.id === params.get("situacao"))?.id ?? "todos";
    const ordem = ORDENS.find((o) => o.id === params.get("ordem"))?.id ?? ORDENS[0].id;
    // A data do evento usa parâmetros próprios: `de`/`ate` são do período do topo (R01-02).
    const de = params.get("evde") ?? undefined;
    const ate = params.get("evate") ?? undefined;
    const mudarLista = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        // Qualquer mudança de busca, filtro ou ordem volta para a primeira página.
        for (const [chave, valor] of Object.entries({ pagina: null, ...mudancas })) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudarLista({ busca: null, situacao: null, evde: null, evate: null });

    const resultado = filtrarEOrdenar(eventos, { busca, situacao, ordem, de, ate });
    const paginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA));
    const pagina = Math.min(Math.max(1, Number(params.get("pagina")) || 1), paginas);
    const daPagina = resultado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    const comFiltro = situacao !== "todos" || Boolean(de || ate);
    const contagem = (n: number) => (n === 1 ? "1 evento" : `${n} eventos`);
    const totalDoResultado = resultado.reduce((soma, e) => soma + e.disponivel, 0);

    const conteudo = () => {
        if (acao) return <TelaFinal acao={acao} valor={acao === "repasse" ? totais.disponivel : acao === "antecipar" ? totais.aLiberar : undefined} aoVoltar={() => setAcao(null)} />;
        if (cenario === "carregando") return <Carregando />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu saldo disponível está negativo em ${reais(-daOrganizacao.disponivel)}`}>
                        <p>
                            {negativos.length === 1 ? `O evento ${negativos[0].nome} teve` : `${negativos.length} eventos tiveram`} devoluções depois do último saque, e o saldo disponível dos outros eventos já foi sacado.
                        </p>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}

                <ContaDeRelance
                    eventos={escopo}
                    titulo="Confira a conta"
                    lateral={<span className="text-sm text-tertiary">Acumulado de {filtrado ? contagem(escopo.length) : "todos os eventos"}, até hoje</span>}
                    calendario={comCenario(`${BASE}/calendario`)}
                />

                <Secao titulo="Resumo financeiro" lateral={<span className="text-sm text-tertiary">Acumulado de {filtrado ? contagem(escopo.length) : "todos os eventos"}, até hoje</span>}>
                    <Cascata totais={totais} aoAbrir={setDetalhe} creditoPendente={escopo.some((e) => e.creditoPendente)} />
                    <Distribuicao
                        totais={totais}
                        detalhes={detalhesDaDistribuicao(escopo)}
                        destinos={{
                            processamento: comCenario(`${BASE}/calendario?tipo=processamento`),
                            retido: comCenario(`${BASE}/calendario?tipo=retido`),
                            aLiberar: comCenario(`${BASE}/calendario`),
                            disponivel: comCenario(`${BASE}?situacao=disponivel`),
                            agendado: comCenario(`${BASE}/extrato?tipo=repasse&periodo=90`),
                            recebido: comCenario(`${BASE}/extrato?tipo=repasse-pago&periodo=90`),
                        }}
                    />
                </Secao>

                <div className="grid grid-cols-2 items-start gap-6">
                    <Secao
                        titulo="Últimos movimentos"
                        lateral={
                            <Button size="sm" color="link-gray" href={comCenario(`${BASE}/extrato`)}>
                                Ver extrato
                            </Button>
                        }
                    >
                        {ultimos.length === 0 ? (
                            <Vazio>{periodo.ativo ? `Nenhum movimento${doPeriodo}.` : "Nenhum movimento ainda. Liberações, saques e devoluções aparecem aqui."}</Vazio>
                        ) : (
                            <div className={ROLAGEM}>
                            <Lista>
                                {ultimos.map((m) => (
                                    <Linha
                                        key={m.id}
                                        quando={m.data === HOJE ? "Hoje" : dataComDia(m.data)}
                                        titulo={m.titulo}
                                        detalhe={m.evento.nome}
                                        valor={`${m.valor > 0 ? "+ " : ""}${reais(m.valor)}`}
                                        corDoValor={m.valor > 0 ? "text-success-primary" : m.valor < 0 ? COR_DO_NEGATIVO : "text-primary"}
                                        para={comCenario(`${BASE}/extrato?periodo=90&movimento=${m.id}`)}
                                    />
                                ))}
                            </Lista>
                            </div>
                        )}
                    </Secao>
                    <Secao
                        titulo="Próximos movimentos"
                        lateral={
                            <Button size="sm" color="link-gray" href={comCenario(`${BASE}/calendario`)}>
                                Ver calendário
                            </Button>
                        }
                    >
                        {proximas.length === 0 ? (
                            <Vazio>{periodo.ativo ? `Nenhum movimento previsto${doPeriodo}.` : "Nenhum movimento previsto. Liberações e saques agendados aparecem aqui."}</Vazio>
                        ) : (
                            <div className={ROLAGEM}>
                            <Lista>
                                {proximas.map((g) =>
                                    g.saque ? (
                                        <Linha
                                            key={`saque-${g.data}-${g.saque.evento.id}`}
                                            quando={dataComDia(g.data!)}
                                            titulo="Saque agendado"
                                            detalhe={`${g.saque.evento.nome} · cai na conta ${g.saque.conta.replace("Conta de terceiro · ", "")}`}
                                            valor={reais(g.valor)}
                                            para={comCenario(`${BASE}/extrato?tipo=repasse&periodo=90`)}
                                        />
                                    ) : (
                                        <Linha
                                            key={`${g.data}-${g.tipo}`}
                                            quando={g.data === HOJE ? "Hoje" : dataComDia(g.data!)}
                                            titulo={`${ROTULO_DA_ENTRADA[g.tipo]} libera`}
                                            detalhe={g.itens.length === 1 ? g.itens[0].evento.nome : `${g.itens.length} eventos`}
                                            valor={`+ ${reais(g.valor)}`}
                                            corDoValor="text-success-primary"
                                            para={g.itens.length === 1 ? comCenario(`${BASE}/${g.itens[0].evento.id}`) : comCenario(`${BASE}/calendario?tipo=${TIPO_NO_CALENDARIO[g.tipo]}`)}
                                        />
                                    ),
                                )}
                            </Lista>
                            </div>
                        )}
                    </Secao>
                </div>

                <Secao
                    id="seus-eventos"
                    titulo="Saldo por evento"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {resultado.length === eventos.length ? contagem(eventos.length) : `${resultado.length} de ${contagem(eventos.length)}`}
                        </Badge>
                    }
                    lateral={
                        <div className="flex items-center gap-3">
                            {eventos.length > 0 && (
                                <>
                                    <span id="rotulo-ordem" className="text-sm text-tertiary">
                                        Ordenar por
                                    </span>
                                    <div className="w-64">
                                        <Select size="sm" aria-labelledby="rotulo-ordem" selectedKey={ordem} onSelectionChange={(chave) => mudarLista({ ordem: chave === ORDENS[0].id ? null : (chave as Ordem) })} items={ORDENS}>
                                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                        </Select>
                                    </div>
                                </>
                            )}
                            <Button
                                size="sm"
                                color="secondary"
                                iconLeading={Download01}
                                isDisabled={resultado.length === 0}
                                onClick={() => {
                                    baixarRelatorio(resultado);
                                    toast.success(`Saldos de ${contagem(resultado.length)} baixados.`.replace("1 evento baixados", "1 evento baixado"));
                                }}
                            >
                                Baixar saldos por evento
                            </Button>
                        </div>
                    }
                >
                    {eventos.length > 0 && (
                        <FilterBar.Root className="items-center border-b border-secondary px-6 py-4">
                            <FilterBar.Content className="items-center">
                                <div className="w-52">
                                    <Input size="sm" icon={SearchLg} aria-label="Buscar evento pelo nome" placeholder="Buscar evento" value={busca} onChange={(valor) => mudarLista({ busca: valor })} />
                                </div>
                                <div className="w-52">
                                    <Select size="sm" aria-label="Filtrar por situação" selectedKey={situacao} onSelectionChange={(chave) => mudarLista({ situacao: chave === "todos" ? null : (chave as Situacao) })} items={SITUACOES}>
                                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                    </Select>
                                </div>
                                {/* Lacuna do DS: o seletor de datas não aceita texto próprio no campo vazio ("Selecione as datas"). */}
                                <span id="rotulo-data" className="text-sm text-tertiary">
                                    Data do evento
                                </span>
                                <DateRangePicker
                                    size="sm"
                                    aria-labelledby="rotulo-data"
                                    presets={PERIODOS}
                                    value={de && ate ? { start: parseDate(de), end: parseDate(ate) } : null}
                                    onChange={(periodo) => mudarLista({ evde: periodo?.start.toString() ?? null, evate: periodo?.end.toString() ?? null })}
                                />
                                {(busca || comFiltro) && (
                                    <Button size="sm" color="link-gray" onClick={limpar}>
                                        Limpar filtros
                                    </Button>
                                )}
                            </FilterBar.Content>
                        </FilterBar.Root>
                    )}

                    {eventos.length === 0 ? (
                        <div className="flex justify-center px-6 py-16">
                            <EmptyState size="sm">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={Calendar} color="gray" theme="modern" />
                                </EmptyState.Header>
                                <EmptyState.Content>
                                    <EmptyState.Title>Você ainda não tem eventos com vendas</EmptyState.Title>
                                    <EmptyState.Description>Quando um evento começar a vender, os valores aparecem aqui.</EmptyState.Description>
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    <Button size="md" color="primary" onClick={() => setAcao("eventos")}>
                                        Ir para Eventos
                                    </Button>
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    ) : resultado.length === 0 ? (
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
                        <>
                            {/* Total do resultado (todas as páginas): filtrar por situação mostra quanto esses eventos somam. */}
                            <div className="flex items-center gap-4 border-b border-secondary bg-secondary px-6 py-2">
                                <span className="flex-1 text-sm font-semibold text-secondary">Total de {contagem(resultado.length)}</span>
                                <span className={cx(COLUNA_DE_SALDO, "flex flex-col")}>
                                    <span className="text-xs text-tertiary">Saldo disponível</span>
                                    <span className={cx("text-md font-semibold whitespace-nowrap tabular-nums", totalDoResultado < 0 ? COR_DO_NEGATIVO : "text-primary")}>{reais(totalDoResultado)}</span>
                                </span>
                                <span aria-hidden="true" className="size-5 shrink-0" />
                            </div>
                            <ul className="flex flex-col divide-y divide-secondary">
                                {daPagina.map((e) => (
                                    <PastaDoEvento key={e.id} evento={e} sufixo={sufixo} lista={`?${params.toString()}`} />
                                ))}
                            </ul>
                        </>
                    )}
                    {paginas > 1 && <Paginacao pagina={pagina} total={paginas} aoMudar={(p) => mudarLista({ pagina: p === 1 ? null : String(p) })} />}
                </Secao>
            </>
        );
    };

    const temDados = !acao && (cenario === "normal" || cenario === "negativo" || bloqueado || cenario === "sem-eventos");

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Finanças"
                aba={acao ? undefined : "visao-geral"}
                acoes={
                    temDados && (
                        <Button size="md" color="primary" isDisabled={bloqueado || totais.disponivel <= 0} onClick={() => setAcao("repasse")}>
                            Solicitar saque
                        </Button>
                    )
                }
            />
            {conteudo()}
            {temDados && <PainelDoDetalhe parte={detalhe} eventos={escopo} aoFechar={() => setDetalhe(null)} />}
        </FinancasShell>
    );
}
