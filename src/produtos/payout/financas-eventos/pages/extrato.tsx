import { parseDate } from "@internationalized/date";
import { useSearchParams } from "react-router";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Download01, File06, Minus, SearchLg, Table as IconeDePlanilha } from "@untitledui/icons";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { FilterBar } from "@/components/application/filter-bar/filter-bar";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import { COR_DO_NEGATIVO, Secao } from "../../components/financas/cascata";
import { baixarCsv, dataDoCsv } from "../../components/financas/csv";
import {
    DIAS_DO_EXTRATO,
    HOJE,
    ROTULO_DO_MOVIMENTO,
    eventosDoCenario,
    extrato,
    fechamentos,
    somarDias,
    totalizar,
    type Extrato,
    type LinhaDoExtrato,
    type TipoDeMovimento,
} from "../../components/financas/dados";
import { Aviso, AvisoDeBloqueio, Carregando, ErroAoCarregar } from "../../components/financas/estados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";
import { fraseDeCompensacao } from "../../components/financas/frases";
import { CabecalhoDaPagina, FinancasShell, useCenario, useEventosEscolhidos } from "../../components/financas/shell";
import { Paginacao } from "../components/paginacao";
import { PainelDoMovimento } from "../components/painel-do-movimento";

/*
 * Extrato (ajustes v3, seção 4.2, refeito depois da crítica de design de 17/11).
 * Pergunta que responde: o que aconteceu com o meu dinheiro, e por que o meu Disponível mudou?
 * Lê-se como extrato de banco:
 *  - o resumo do período mostra três números: Entradas, Saídas e o Disponível no fim do período;
 *  - os movimentos vêm do mais recente para o mais antigo, agrupados por dia, com o Disponível no
 *    fim de cada dia. Por padrão só aparece o que mudou o Disponível.
 * O resumo não muda com os filtros; "Disponível após" é sempre o saldo da organização.
 */

const BASE = "/payout/financas-eventos";
const POR_PAGINA = 20;

type Filtro = "todos" | TipoDeMovimento | "repasse-pago";
const TIPOS: Array<{ id: Filtro; label: string }> = [
    { id: "todos", label: "Todos os tipos" },
    { id: "liberacao", label: "Liberações" },
    { id: "antecipacao", label: "Antecipações" },
    { id: "credito", label: "Créditos" },
    { id: "repasse", label: "Saques" },
    { id: "repasse-pago", label: "Saques pagos" },
    { id: "taxa", label: "Taxas e custos" },
    { id: "devolucao", label: "Devoluções" },
    { id: "venda", label: "Vendas" },
];
const noFiltro = (m: LinhaDoExtrato, f: Filtro) => f === "todos" || (f === "repasse-pago" ? m.situacao === "pago" : m.tipo === f);

type Sentido = "tudo" | "entradas" | "saidas";
const SENTIDOS: Array<{ id: Sentido; label: string }> = [
    { id: "tudo", label: "Tudo" },
    { id: "entradas", label: "Entradas" },
    { id: "saidas", label: "Saídas" },
];

/** Nome de cada tipo no resumo do período (plural). Repasse só entra quando um repasse não concluído volta. */
const NO_RESUMO: Record<TipoDeMovimento, string> = {
    venda: "Vendas",
    liberacao: "Liberações",
    taxa: "Taxas e custos",
    credito: "Créditos",
    devolucao: "Devoluções",
    repasse: "Saques",
    antecipacao: "Antecipações",
};

const hoje = parseDate(HOJE);
const dias = (n: number) => ({ start: hoje.subtract({ days: n }), end: hoje });
/** Período padrão: do primeiro dia do mês até hoje (01/11 a 17/11). */
const INICIO_DO_MES = hoje.set({ day: 1 }).toString();
const PERIODOS = {
    mes: { label: "Este mês", value: { start: hoje.set({ day: 1 }), end: hoje } },
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

/* ---------------- resumo do período ---------------- */

interface ParteDoResumoProps {
    rotulo: string;
    valor: number;
    cor?: string;
    resultado?: boolean;
    porTipo?: Array<{ tipo: TipoDeMovimento; valor: number }>;
    vazio?: string;
    rotuloDoTipo?: (tipo: TipoDeMovimento) => string;
}

const ParteDoResumo = ({ rotulo, valor, cor = "text-primary", resultado, porTipo, vazio, rotuloDoTipo = (t) => NO_RESUMO[t] }: ParteDoResumoProps) => (
    <div className={cx("flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3 ring-1 ring-inset @6xl:p-4", resultado ? "bg-secondary ring-primary" : "bg-primary ring-secondary")}>
        <dt className="text-sm font-medium text-secondary">
            {rotulo}
        </dt>
        <dd className="flex flex-col gap-2">
            <span className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl @6xl:text-display-xs" : "text-lg @6xl:text-xl", valor < 0 ? COR_DO_NEGATIVO : cor)}>{reais(valor)}</span>
            {porTipo &&
                (porTipo.length ? (
                    <ul className="flex flex-col gap-1 border-t border-secondary pt-2">
                        {porTipo.map((t) => (
                            <li key={t.tipo} className="flex items-baseline justify-between gap-3 text-xs text-tertiary">
                                <span>{rotuloDoTipo(t.tipo)}</span>
                                <span className="whitespace-nowrap tabular-nums">{reais(t.valor)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <span className="text-xs text-tertiary">{vazio}</span>
                ))}
        </dd>
    </div>
);

const ResumoDoPeriodo = ({ x }: { x: Extrato }) => (
    <Secao titulo={`Resumo de ${dataCurta(x.de)} a ${x.ate === HOJE ? "hoje" : dataCurta(x.ate)}`}>
        {/* Três números, sem operadores: sem o Disponível do início, "entradas − saídas" não dá o Disponível de hoje. */}
        <dl className="flex items-stretch gap-4 px-6 py-5">
            <ParteDoResumo
                rotulo="Entradas"
                valor={x.entradas}
                cor="text-success-primary"
                porTipo={x.porTipo.entradas}
                vazio="Nada entrou no período"
                rotuloDoTipo={(t) => (t === "repasse" ? "Saques não concluídos" : NO_RESUMO[t])}
            />
            <ParteDoResumo rotulo="Saídas" valor={-x.saidas || 0} porTipo={x.porTipo.saidas} vazio="Nada saiu no período" />
            <ParteDoResumo rotulo={x.ate === HOJE ? "Saldo disponível hoje" : `Saldo disponível em ${dataCurta(x.ate)}`} valor={x.saldoFinal} resultado />
        </dl>
    </Secao>
);

/* ---------------- movimentos por dia ---------------- */

/** Larguras das colunas de valor: as mesmas no cabeçalho, no dia e na linha, para os números alinharem. */
const COLUNA = "w-40 shrink-0 text-right";
const SETA = "size-5 shrink-0";

const Movimento = ({ m, aoAbrir }: { m: LinhaDoExtrato; aoAbrir: () => void }) => {
    const entrou = m.efeito > 0;
    const semEfeito = m.efeito === 0;
    return (
        <li>
            <button
                type="button"
                onClick={aoAbrir}
                className="flex w-full cursor-pointer items-center gap-4 px-6 py-3 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
                <FeaturedIcon size="sm" theme="light" color={entrou ? "success" : "gray"} icon={semEfeito ? Minus : entrou ? ArrowDownLeft : ArrowUpRight} />
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-primary">{m.titulo}</span>
                    <span className="truncate text-sm text-tertiary">
                        {ROTULO_DO_MOVIMENTO[m.tipo]} · {m.evento.nome}
                        {m.repasse && ` · ${m.repasse.conta}`}
                    </span>
                </span>
                <span className={cx(COLUNA, "text-sm font-semibold whitespace-nowrap tabular-nums", semEfeito ? "text-tertiary" : entrou ? "text-success-primary" : COR_DO_NEGATIVO)}>
                    <span className="sr-only">{semEfeito ? "Valor: " : entrou ? "Entrou: " : "Saiu: "}</span>
                    {m.valor > 0 ? "+ " : ""}
                    {reais(m.valor)}
                </span>
                <span className={cx(COLUNA, "text-sm whitespace-nowrap tabular-nums", semEfeito ? "text-tertiary" : m.apos < 0 ? COR_DO_NEGATIVO : "text-secondary")}>
                    {semEfeito ? (
                        m.semEfeito
                    ) : (
                        <>
                            <span className="sr-only">Saldo disponível após: </span>
                            {reais(m.apos)}
                        </>
                    )}
                </span>
                <ChevronRight aria-hidden="true" className={cx(SETA, "text-fg-quaternary")} />
            </button>
        </li>
    );
};

export function FinancasExtrato() {
    const [cenario, setCenario] = useCenario();
    const [params, setParams] = useSearchParams();

    // O filtro de eventos do topo de Finanças vale para a tela inteira.
    const { escolhidos: eventos } = useEventosEscolhidos();
    const bloqueado = cenario === "bloqueado";
    const comCenario = (rota: string) => `${rota}${cenario === "normal" ? "" : `${rota.includes("?") ? "&" : "?"}cenario=${cenario}`}`;
    const compensa = fraseDeCompensacao(eventos);

    // Período: `de`/`ate` na URL, ou o atalho `periodo=90` (usado pelos links que chegam aqui), ou o mês corrente.
    const limite = somarDias(HOJE, -DIAS_DO_EXTRATO);
    const de = [params.get("de") ?? (params.get("periodo") === "90" ? limite : INICIO_DO_MES), limite].sort()[1];
    const ate = [params.get("ate") ?? HOJE, HOJE].sort()[0];
    const busca = params.get("busca") ?? "";
    const filtro = TIPOS.find((t) => t.id === params.get("tipo"))?.id ?? "todos";
    const sentido = SENTIDOS.find((t) => t.id === params.get("sentido"))?.id ?? "tudo";
    const eventoId = params.get("evento") ?? "todos";
    const mudar = (mudancas: Record<string, string | null>) => {
        const novo = new URLSearchParams(params);
        for (const [chave, valor] of Object.entries({ pagina: null, ...mudancas })) {
            if (valor === null || valor === "") novo.delete(chave);
            else novo.set(chave, valor);
        }
        setParams(novo, { replace: true });
    };
    const limpar = () => mudar({ busca: null, tipo: null, evento: null, sentido: null });
    const comFiltro = Boolean(busca) || filtro !== "todos" || eventoId !== "todos" || sentido !== "tudo";

    const x = extrato(eventos, de, ate);
    const termo = simples(busca);
    const doFiltro = x.linhas.filter(
        (m) =>
            noFiltro(m, filtro) &&
            (sentido === "tudo" || (sentido === "entradas" ? m.efeito > 0 : m.efeito < 0)) &&
            (eventoId === "todos" || m.evento.id === eventoId) &&
            (!termo || simples(`${m.titulo} ${m.evento.nome} ${ROTULO_DO_MOVIMENTO[m.tipo]} ${m.repasse?.conta ?? ""}`).includes(termo)),
    );
    // Extrato é o histórico do Disponível: o que não mexeu nele (vendas em processamento, devolução que
    // saiu do Antecipável) fica de fora, a não ser que a pessoa peça ou filtre por um tipo.
    const semEfeito = doFiltro.filter((m) => m.efeito === 0).length;
    const mostrarSemEfeito = params.get("semefeito") === "1" || filtro !== "todos";
    // Do mais recente para o mais antigo, como no banco.
    const visiveis = (mostrarSemEfeito ? doFiltro : doFiltro.filter((m) => m.efeito !== 0)).slice().reverse();
    const totalDoPeriodo = mostrarSemEfeito ? x.linhas.length : x.linhas.filter((m) => m.efeito !== 0).length;
    const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
    const pagina = Math.min(Math.max(1, Number(params.get("pagina")) || 1), paginas);
    const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    const dias = [...new Set(daPagina.map((m) => m.data))].map((data) => ({ data, movimentos: daPagina.filter((m) => m.data === data) }));
    // Disponível no fim de cada dia: o saldo depois do último movimento do dia, com ou sem filtro.
    const fimDoDia = new Map(x.linhas.map((m) => [m.data, m.apos]));

    // O painel abre qualquer movimento dos últimos 90 dias, mesmo fora do período escolhido (links de outras telas).
    const aberto = extrato(eventos, limite, HOJE).linhas.find((m) => m.id === params.get("movimento")) ?? null;
    const eventosDoPeriodo = [...new Map(x.linhas.map((m) => [m.evento.id, m.evento.nome])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }));
    const temDados = cenario === "normal" || cenario === "negativo" || bloqueado;
    const meses = fechamentos(eventos);
    const quantos = (n: number) => (n === 1 ? "1 movimento" : `${n} movimentos`);

    const baixar = (formato: "csv" | "pdf") => {
        if (formato === "pdf") {
            toast(`Aqui baixaria o extrato em PDF, com o resumo do período e ${quantos(visiveis.length)}.`);
            return;
        }
        const emOrdem = visiveis.slice().reverse();
        baixarCsv("financas-extrato.csv", [
            ["Data", "Movimento", "Tipo", "Evento", "Valor", "Saldo disponível após"],
            [dataDoCsv(de), `Saldo disponível em ${dataCurta(de)}`, "", "", "", x.saldoInicial],
            ...emOrdem.map((m) => [dataDoCsv(m.data), m.titulo, ROTULO_DO_MOVIMENTO[m.tipo], m.evento.nome, m.valor, m.efeito === 0 ? (m.semEfeito ?? "") : m.apos]),
            [dataDoCsv(ate), `Saldo disponível em ${dataCurta(ate)}`, "", "", "", x.saldoFinal],
        ]);
        toast.success(`Extrato baixado com ${quantos(visiveis.length)}.`);
    };

    const conteudo = () => {
        if (cenario === "carregando") return <Carregando variante="lista" />;
        if (cenario === "erro") return <ErroAoCarregar aoTentar={() => setCenario("normal")} />;
        const semMovimentos = x.linhas.length === 0;
        return (
            <>
                {bloqueado && <AvisoDeBloqueio />}
                {compensa && (
                    <Aviso tom="erro" titulo={`Seu saldo disponível está negativo em ${reais(-totalizar(eventos).disponivel)}`}>
                        <p>Você não precisa pagar nada. {compensa}</p>
                    </Aviso>
                )}

                <ResumoDoPeriodo x={x} />

                <Secao
                    titulo="Movimentos"
                    selo={
                        <Badge size="sm" type="modern" color="gray">
                            {visiveis.length === totalDoPeriodo ? quantos(totalDoPeriodo) : `${visiveis.length} de ${quantos(totalDoPeriodo)}`}
                        </Badge>
                    }
                    lateral={
                            <ButtonGroup
                                size="sm"
                                aria-label="Mostrar entradas ou saídas"
                                selectedKeys={new Set([sentido])}
                                disallowEmptySelection
                                onSelectionChange={(chaves) => {
                                    const escolhido = [...chaves][0];
                                    if (escolhido) mudar({ sentido: escolhido === "tudo" ? null : String(escolhido) });
                                }}
                            >
                                {SENTIDOS.map((t) => (
                                    <ButtonGroupItem key={t.id} id={t.id}>
                                        {t.label}
                                    </ButtonGroupItem>
                                ))}
                            </ButtonGroup>
                    }
                >
                    <FilterBar.Root className="items-center border-b border-secondary px-6 py-4">
                        <FilterBar.Content className="items-center">
                            <div className="w-44">
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
                            {/* Campo com busca: uma organização pode ter dezenas de eventos. Vazio = todos os eventos. */}
                            <div className="w-52">
                                <Select.ComboBox
                                    size="sm"
                                    shortcut={false}
                                    // Lacuna do DS: o ComboBox não tem seta à direita e sempre abre com a lupa. Sem lupa e com a
                                    // seta (no espaço de `status`), o campo lê como o select ao lado, e não como uma busca.
                                    icon={<></>}
                                    status={<ChevronDown aria-hidden="true" className="pointer-events-none size-4 shrink-0 stroke-[2.25px] text-fg-quaternary" />}
                                    aria-label="Filtrar por evento"
                                    placeholder="Todos os eventos"
                                    popoverClassName="w-80"
                                    selectedKey={eventosDoPeriodo.some((e) => e.id === eventoId) ? eventoId : null}
                                    onSelectionChange={(chave) => mudar({ evento: chave ? String(chave) : null })}
                                    items={eventosDoPeriodo}
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select.ComboBox>
                            </div>
                            <div className="w-40">
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
                                    {semMovimentos && temDados && eventos.length === 0 && <EmptyState.Description>Liberações, saques e devoluções aparecem aqui.</EmptyState.Description>}
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
                        <>
                            <div aria-hidden="true" className="flex items-center gap-4 border-b border-secondary px-6 py-2 text-xs font-semibold text-quaternary">
                                <span className="flex-1">Movimento</span>
                                <span className={COLUNA}>Valor</span>
                                <span className={COLUNA}>Saldo disponível após</span>
                                <span className={SETA} />
                            </div>
                            <ol aria-label="Movimentos por dia, do mais recente para o mais antigo" className="flex flex-col">
                                {dias.map((dia) => (
                                    <li key={dia.data}>
                                        <div className="flex items-center gap-4 border-b border-secondary bg-secondary px-6 py-2">
                                            <h3 className="flex-1 text-sm font-semibold text-secondary">{dia.data === HOJE ? `Hoje, ${dataCurta(dia.data)}` : dataComDia(dia.data)}</h3>
                                            <span className="text-xs text-tertiary">Saldo disponível no fim do dia</span>
                                            <span className={cx(COLUNA, "text-sm font-semibold whitespace-nowrap tabular-nums", (fimDoDia.get(dia.data) ?? 0) < 0 ? COR_DO_NEGATIVO : "text-primary")}>{reais(fimDoDia.get(dia.data) ?? 0)}</span>
                                            <span className={SETA} />
                                        </div>
                                        <ul className="flex flex-col divide-y divide-secondary border-b border-secondary">
                                            {dia.movimentos.map((m) => (
                                                <Movimento key={m.id} m={m} aoAbrir={() => mudar({ movimento: m.id, pagina: pagina === 1 ? null : String(pagina) })} />
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                    {semEfeito > 0 && filtro === "todos" && sentido === "tudo" && (
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3 text-sm text-tertiary">
                            {mostrarSemEfeito
                                ? `A lista inclui ${quantos(semEfeito)} que não ${semEfeito === 1 ? "mudou" : "mudaram"} o saldo disponível.`
                                : `${semEfeito === 1 ? "1 movimento não mudou" : `${semEfeito} movimentos não mudaram`} o saldo disponível e não ${semEfeito === 1 ? "aparece" : "aparecem"} na lista: vendas em processamento e devoluções que saíram do Antecipável.`}
                            <Button size="sm" color="link-gray" onClick={() => mudar({ semefeito: mostrarSemEfeito ? null : "1" })}>
                                {mostrarSemEfeito ? "Ocultar" : "Mostrar na lista"}
                            </Button>
                        </p>
                    )}
                    {paginas > 1 && <Paginacao pagina={pagina} total={paginas} aoMudar={(p) => mudar({ pagina: p === 1 ? null : String(p) })} />}
                </Secao>

                {/* Conciliação por mês: cada linha fecha (início + entradas − saídas = fim) e o fim de um mês é o início do seguinte. */}
                {meses.length > 0 && (
                    <Secao titulo="Fechamento mensal" lateral={<span className="text-sm text-tertiary">O saldo no fim de um mês é o do início do seguinte</span>}>
                        <div aria-hidden="true" className="flex items-center gap-4 border-b border-secondary px-6 py-2 text-xs font-semibold text-quaternary">
                            <span className="flex-1">Mês</span>
                            <span className={COLUNA}>Saldo disponível no início</span>
                            <span className={COLUNA}>Entradas</span>
                            <span className={COLUNA}>Saídas</span>
                            <span className={COLUNA}>Saldo disponível no fim</span>
                            <span className="w-28 shrink-0" />
                        </div>
                        <ul className="flex flex-col divide-y divide-secondary">
                            {meses.map((m) => (
                                <li key={m.mes} className="flex items-center gap-4 px-6 py-3">
                                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                        <Button size="sm" color="link-gray" onClick={() => mudar({ de: m.de, ate: m.ate, periodo: null })}>
                                            {m.mes}
                                        </Button>
                                        {m.parcial && (
                                            <Badge size="sm" type="pill-color" color="gray">
                                                Até hoje
                                            </Badge>
                                        )}
                                    </span>
                                    <span className={cx(COLUNA, "text-sm whitespace-nowrap tabular-nums", m.saldoInicial < 0 ? COR_DO_NEGATIVO : "text-secondary")}>
                                        <span className="sr-only">Saldo disponível no início: </span>
                                        {reais(m.saldoInicial)}
                                    </span>
                                    <span className={cx(COLUNA, "text-sm font-medium whitespace-nowrap text-success-primary tabular-nums")}>
                                        <span className="sr-only">Entradas: </span>+ {reais(m.entradas)}
                                    </span>
                                    <span className={cx(COLUNA, "text-sm font-medium whitespace-nowrap tabular-nums", m.saidas > 0 ? COR_DO_NEGATIVO : "text-primary")}>
                                        <span className="sr-only">Saídas: </span>
                                        {reais(-m.saidas || 0)}
                                    </span>
                                    <span className={cx(COLUNA, "text-sm font-semibold whitespace-nowrap tabular-nums", m.saldoFinal < 0 ? COR_DO_NEGATIVO : "text-primary")}>
                                        <span className="sr-only">Saldo disponível no fim: </span>
                                        {reais(m.saldoFinal)}
                                    </span>
                                    <span className="flex w-28 shrink-0 justify-end">
                                        <Button size="sm" color="link-gray" iconLeading={Download01} aria-label={`Baixar o fechamento de ${m.mes} em PDF`} onClick={() => toast(`Aqui baixaria o fechamento de ${m.mes} em PDF.`)}>
                                            Baixar PDF
                                        </Button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Secao>
                )}
            </>
        );
    };

    return (
        <FinancasShell jornada="Jornada · Eventos como pastas">
            <CabecalhoDaPagina
                titulo="Finanças"
                aba="extrato"
                acoes={
                    temDados && (
                        <Dropdown.Root>
                            <Button size="md" color="secondary" iconLeading={Download01} iconTrailing={ChevronDown}>
                                Baixar extrato
                            </Button>
                            <Dropdown.Popover className="w-56" isNonModal>
                                <Dropdown.Menu aria-label="Formato do extrato" onAction={(chave) => baixar(chave as "csv" | "pdf")}>
                                    <Dropdown.Item id="pdf" label="PDF" icon={File06} />
                                    <Dropdown.Item id="csv" label="Planilha (CSV)" icon={IconeDePlanilha} />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    )
                }
            />
            {conteudo()}
            {temDados && <PainelDoMovimento movimento={aberto} aoFechar={() => mudar({ movimento: null, pagina: pagina === 1 ? null : String(pagina) })} />}
        </FinancasShell>
    );
}
