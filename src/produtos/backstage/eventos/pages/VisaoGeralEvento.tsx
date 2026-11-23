import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { BarChartSquare02, CalendarDate, Edit05, Globe01, Plus, Ticket01, Trash01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { MetricChangeIndicator } from "@/components/application/metrics/metrics";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { Select } from "@/components/base/select/select";
import { useTransicao } from "@/components/foundations/transicao";
import { useDoc } from "@/plataforma";
import { cx } from "@/utils/cx";
import { BackstageLayout, estadoDoEvento, useAbrirModalDeStatus } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CampoData } from "../../components/campos-de-data-e-hora";
import { OcupacaoBar } from "../components/OcupacaoBar";
import { Sparkline } from "../components/Sparkline";
import { useEventoAtual, type Evento } from "../data/eventos";
import { TIPO_MARCO_COR, TIPO_MARCO_LABEL, useMarcos, type Marco, type TipoMarco } from "../data/marcos";
import { brl, brlCompacto, HOJE, numero, useResumoDoEvento, type ResumoEvento, type Sessao } from "../data/vendas";

/** Informações do evento saiu do menu (BKS-07): abre por aqui. */
const EditarInformacoes = () => (
    <Button color="secondary" size="md" iconLeading={Edit05} href="/backstage/informacoes-evento">
        Editar informações
    </Button>
);

const TIPOS = (Object.keys(TIPO_MARCO_LABEL) as TipoMarco[]).map((id) => ({ id, label: TIPO_MARCO_LABEL[id] }));

/* ---------------- formatação (UI-TXT-009) ---------------- */

const ANO_ATUAL = HOJE.getFullYear();

/** "14 out" ou, com ano, "14 out 2026": `Intl` no lugar do "10-14" (EVT-151). */
function diaMes(iso: string, comAno = false) {
    const partes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", ...(comAno ? { year: "numeric" } : {}) }).formatToParts(
        new Date(`${iso.slice(0, 10)}T12:00:00`),
    );
    const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value.replace(".", "") ?? "";
    return [parte("day"), parte("month"), comAno ? parte("year") : ""].filter(Boolean).join(" ");
}

const PLURAL = new Intl.PluralRules("pt-BR");
/** "Faltam 12 dias.", "Falta 1 dia.", "É hoje." ou "Evento realizado." (EVT-45, EVT-152). */
const fase = (dias: number) => (dias < 0 ? "Evento realizado." : dias === 0 ? "É hoje." : PLURAL.select(dias) === "one" ? "Falta 1 dia." : `Faltam ${numero(dias)} dias.`);

const pct = (valor: number) => `${Math.round(valor * 100)}%`;

/** Camada 2 — o painel operacional de um evento. */
export function VisaoGeralEvento() {
    const evento = useEventoAtual();
    const resumo = useResumoDoEvento(evento);

    if (!resumo.vendas) {
        return (
            <BackstageLayout activeSection="visao-geral" activeItem="visao-geral">
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <CabecalhoDaPagina titulo="Visão geral" subtitulo={`${evento.dataLabel}. ${fase(resumo.diasParaEvento)}`} acoes={<EditarInformacoes />} />
                    <SemVendas evento={evento} />
                </div>
            </BackstageLayout>
        );
    }

    return (
        <BackstageLayout activeSection="visao-geral" activeItem="visao-geral">
            <PainelDoEvento evento={evento} resumo={resumo} />
        </BackstageLayout>
    );
}

/* ---------------- sem vendas (EVT-43) ---------------- */

/**
 * Sem vendas: o motivo, lido do estado do evento (o mesmo do Guia), e a ação que resolve (EVT-43).
 * Antes era só "Este evento ainda não tem vendas para acompanhar.", sem dizer por quê.
 */
function SemVendas({ evento }: { evento: Evento }) {
    const doc = useDoc("eventos", evento.id);
    const abrirModalDeStatus = useAbrirModalDeStatus();
    const estado = estadoDoEvento(doc, !doc);
    const caso: { icone: typeof Ticket01; titulo: string; texto: string; acao?: ReactNode } =
        estado.ingressos === "nenhum"
            ? {
                  icone: Ticket01,
                  titulo: "Nenhuma venda ainda",
                  texto: "O evento ainda não tem ingressos. Crie os ingressos para começar a vender.",
                  acao: (
                      <Button size="md" iconLeading={Plus} href="/backstage/catalogo/ingressos">
                          Criar ingressos
                      </Button>
                  ),
              }
            : estado.abertura === "nenhum"
              ? {
                    icone: CalendarDate,
                    titulo: "Nenhuma venda ainda",
                    texto: "Nada está programado para entrar à venda. Programe a abertura de vendas dos ingressos.",
                    acao: (
                        <Button size="md" iconLeading={CalendarDate} href="/backstage/catalogo/aberturas-de-vendas">
                            Programar abertura
                        </Button>
                    ),
                }
              : evento.status === "rascunho"
                ? {
                      icone: Globe01,
                      titulo: "Nenhuma venda ainda",
                      texto: "O evento está em rascunho e não vende. Publique para começar a vender.",
                      acao: (
                          <Button size="md" iconLeading={Globe01} onClick={() => abrirModalDeStatus()}>
                              Publicar evento
                          </Button>
                      ),
                  }
                : {
                      icone: BarChartSquare02,
                      titulo: "Nenhuma venda ainda",
                      texto: "Os ingressos estão à venda. O faturamento, a ocupação e o ritmo aparecem aqui depois do primeiro pedido pago.",
                      acao: (
                          <Button size="md" color="secondary" href="/backstage/catalogo/ingressos">
                              Ver ingressos e produtos
                          </Button>
                      ),
                  };
    return (
        <section className="flex justify-center rounded-xl bg-primary px-4 py-12 ring-1 ring-border-secondary">
            <EmptyState size="sm">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={caso.icone} color="gray" theme="modern" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{caso.titulo}</EmptyState.Title>
                    <EmptyState.Description>{caso.texto}</EmptyState.Description>
                </EmptyState.Content>
                {caso.acao && <EmptyState.Footer>{caso.acao}</EmptyState.Footer>}
            </EmptyState>
        </section>
    );
}

/* ---------------- painel com vendas ---------------- */

function PainelDoEvento({ evento, resumo }: { evento: Evento; resumo: ResumoEvento }) {
    const vendas = resumo.vendas!;
    const { realizado } = resumo;
    // Marcos no evento, no banco; sem lista gravada, os iniciais saem dos dados do evento (EVT-134).
    const { marcos, adicionar, remover, restaurar } = useMarcos(evento.id, vendas.aberturaISO);
    const ambientes = [...new Set(vendas.sessoes.map((s) => s.ambiente))];
    const totalPagamentos = vendas.pagamentos.reduce((total, p) => total + p.qtd, 0);
    // Só dias fechados, até ontem (EVT-147): hoje ainda não acabou e a curva despencava a zero.
    const serieGrafico = resumo.serieFechada.slice(-60);
    const inicioGrafico = serieGrafico[0]?.dataISO;
    const fimGrafico = serieGrafico.at(-1)?.dataISO;
    const marcosNoGrafico = inicioGrafico && fimGrafico ? marcos.filter((m) => m.data >= inicioGrafico && m.data <= fimGrafico) : [];
    const maiorDia = serieGrafico.reduce<(typeof serieGrafico)[number] | undefined>((maior, d) => (!maior || d.ingressos > maior.ingressos ? d : maior), undefined);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            <CabecalhoDaPagina
                titulo="Visão geral"
                acoes={<EditarInformacoes />}
                subtitulo={`${evento.dataLabel}. ${fase(resumo.diasParaEvento)}`}
                selo={
                    <Badge size="sm" type="pill-color" color={resumo.ocupacao >= 0.7 ? "success" : resumo.ocupacao >= 0.4 ? "warning" : "error"}>
                        {pct(resumo.ocupacao)} de ocupação
                    </Badge>
                }
            />

            <FaturamentoEMeta resumo={resumo} />

            {/* Capacidade por setor */}
            <section className="flex flex-col rounded-xl bg-primary ring-1 ring-border-secondary">
                <header className="flex flex-col gap-0.5 border-b border-secondary px-5 py-4">
                    <h2 className="text-md font-semibold text-primary">Capacidade por grupo</h2>
                    <p className="text-sm text-tertiary">
                        {vendas.sessoes.length} {vendas.sessoes.length === 1 ? "grupo" : "grupos"} em {ambientes.length === 1 ? ambientes[0] : `${ambientes.length} sessões`}. A
                        barra divide a venda por canal.
                    </p>
                </header>

                {ambientes.map((ambiente) => (
                    <div key={ambiente} className="flex flex-col">
                        {ambientes.length > 1 && <p className="border-b border-secondary bg-secondary px-5 py-2 text-sm font-medium text-secondary">{ambiente}</p>}
                        {vendas.sessoes
                            .filter((s) => s.ambiente === ambiente)
                            .map((sessao) => (
                                <SessaoLinha key={sessao.id} sessao={sessao} />
                            ))}
                    </div>
                ))}
            </section>

            {/* Velocidade de vendas. Evento realizado: sem "ritmo atual", o total e o ticket médio (EVT-146). */}
            <section className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-md font-semibold text-primary">{realizado ? "Vendas por dia" : "Velocidade de vendas"}</h2>
                    <p className="text-sm text-tertiary">
                        Ingressos por dia, até ontem.{marcosNoGrafico.length > 0 && " As linhas marcam os marcos e anotações."}
                    </p>
                </div>

                {realizado ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Metrica titulo="Ingressos vendidos" valor={numero(resumo.vendidos)} />
                        <Metrica titulo="Ticket médio" valor={brl(resumo.ticketMedio)} />
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Metrica
                            titulo="Últimos 7 dias"
                            valor={`${numero(resumo.ritmo7)} por dia`}
                            variacao={<Variacao valor={resumo.variacaoRitmo} />}
                            serie={resumo.sparkline.slice(-7)}
                        />
                        <Metrica
                            titulo="Últimos 30 dias"
                            valor={`${numero(resumo.sparkline.reduce((t, v) => t + v, 0) / Math.max(1, resumo.sparkline.length))} por dia`}
                            serie={resumo.sparkline}
                        />
                        <Metrica titulo="Ticket médio" valor={brl(resumo.ticketMedio)} />
                    </div>
                )}

                {serieGrafico.length === 0 ? (
                    <p className="text-sm text-tertiary">As vendas de hoje entram no gráfico amanhã, quando o dia fechar.</p>
                ) : (
                    <div
                        className="h-[220px] w-full text-tertiary"
                        role="img"
                        aria-label={`Ingressos por dia, de ${diaMes(inicioGrafico!, true)} a ${diaMes(fimGrafico!, true)}.${maiorDia ? ` O maior dia foi ${diaMes(maiorDia.dataISO)}, com ${numero(maiorDia.ingressos)} ingressos.` : ""}`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={serieGrafico} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} className="[&_.recharts-text]:text-sm">
                                <defs>
                                    <linearGradient id="grad-velocidade" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--color-utility-brand-500)" stopOpacity={0.35} />
                                        <stop offset="90%" stopColor="var(--color-utility-brand-500)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-neutral-100" />
                                <XAxis dataKey="dataISO" tickFormatter={(v: string) => diaMes(v)} tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} fill="currentColor" />
                                <YAxis tickLine={false} axisLine={false} width={44} fill="currentColor" />
                                {/* Os marcos na curva, na cor do tipo (EVT-153). */}
                                {marcosNoGrafico.map((m) => (
                                    <ReferenceLine key={m.id} x={m.data} stroke={TIPO_MARCO_COR[m.tipo]} strokeDasharray="4 4" strokeWidth={1.5} />
                                ))}
                                <Tooltip
                                    cursor={{ stroke: "var(--color-utility-brand-600)", strokeWidth: 2 }}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null;
                                        const doDia = marcos.filter((m) => m.data === label);
                                        return (
                                            <div className="max-w-64 rounded-lg bg-primary-solid px-3 py-2 shadow-lg">
                                                <p className="text-sm font-semibold text-white">{diaMes(String(label), true)}</p>
                                                <p className="text-sm text-tooltip-supporting-text">{numero(Number(payload[0].value))} ingressos</p>
                                                {doDia.map((m) => (
                                                    <p key={m.id} className="mt-1 text-sm text-tooltip-supporting-text">
                                                        {TIPO_MARCO_LABEL[m.tipo]}: {m.titulo}
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    }}
                                />
                                <Area type="monotone" dataKey="ingressos" stroke="var(--color-utility-brand-500)" strokeWidth={2} fill="url(#grad-velocidade)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            <MarcosEAnotacoes marcos={marcos} adicionar={adicionar} remover={remover} restaurar={restaurar} />

            {/* Métodos de pagamento: duas colunas já no celular (eram quatro cartões empilhados em 390 px). */}
            <section className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-md font-semibold text-primary">Métodos de pagamento</h2>
                    <p className="text-sm text-tertiary">Distribuição das transações confirmadas</p>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {vendas.pagamentos.map((pagamento) => (
                        <Metrica
                            key={pagamento.tipo}
                            titulo={pagamento.tipo}
                            valor={numero(pagamento.qtd)}
                            apoio={`${pct(totalPagamentos ? pagamento.qtd / totalPagamentos : 0)} das transações`}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

/* ---------------- faturamento contra a meta (EVT-23) ---------------- */

/**
 * Faturamento contra a meta, com a projeção no ritmo atual (EVT-23). Sem meta, só o faturamento, sem
 * barra nem porcentagem (EVT-154): antes saíam "Meta R$ 0", "Infinity%" e "NaN%". Evento realizado: o
 * resultado contra a meta, sem projeção (EVT-146). Barra do DS (ProgressBar).
 */
function FaturamentoEMeta({ resumo }: { resumo: ResumoEvento }) {
    const { faturamento, meta, projecao, realizado } = resumo;
    const temMeta = meta > 0;
    const atingido = temMeta ? faturamento / meta : 0;
    const daProjecao = temMeta ? projecao / meta : 0;
    // Âmbar quando a projeção fica abaixo da meta (DECIDIDO "Desempenho e tendência").
    const abaixo = temMeta && !realizado && projecao < meta;
    return (
        <section aria-labelledby="titulo-faturamento" className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                    <h2 id="titulo-faturamento" className="text-sm text-tertiary">
                        {realizado ? "Faturamento final" : "Faturamento confirmado"}
                    </h2>
                    <p className="text-display-sm font-bold text-primary tabular-nums">{brl(faturamento)}</p>
                </div>
                {temMeta && (
                    <div className="flex flex-col items-end gap-0.5">
                        <p className="text-sm text-tertiary">Meta de {brlCompacto(meta)}</p>
                        <p className="text-sm font-semibold text-secondary tabular-nums">{pct(atingido)} atingido</p>
                    </div>
                )}
            </div>

            {temMeta ? (
                <>
                    <div className="relative" aria-hidden="true">
                        <ProgressBarBase value={Math.min(faturamento, meta)} min={0} max={meta} className="h-2.5 rounded-full" progressClassName="rounded-full" />
                        {/* Marcador da projeção, explicado no texto abaixo. */}
                        {!realizado && (
                            <span className="absolute -inset-y-1 w-0.5 rounded-full bg-fg-primary" style={{ left: `calc(${Math.min(100, daProjecao * 100)}% - 1px)` }} />
                        )}
                    </div>
                    <p className="text-sm text-tertiary">
                        {realizado ? (
                            <>
                                O evento fechou com <strong className="font-semibold text-secondary">{pct(atingido)} da meta</strong>.
                            </>
                        ) : (
                            <>
                                No ritmo atual, a projeção para o dia do evento é <strong className="font-semibold text-secondary">{brlCompacto(projecao)}</strong>,{" "}
                                <strong className={cx("font-semibold", abaixo ? "text-warning-primary" : "text-success-primary")}>{pct(daProjecao)} da meta</strong>. O
                                traço na barra marca a projeção.
                            </>
                        )}
                    </p>
                </>
            ) : (
                <p className="text-sm text-tertiary">Este evento não tem meta de faturamento para comparar.</p>
            )}
        </section>
    );
}

/* ---------------- marcos e anotações (EVT-27) ---------------- */

const MSG_ERRO_SALVAR = "Não foi possível salvar a anotação. Tente de novo.";
const MSG_ERRO_REMOVER = "Não foi possível remover a anotação. Tente de novo.";

/**
 * Marcos e anotações (EVT-27, EVT-148): campos do DS com rótulo (data com calendário), a lista entra e sai
 * deslizando a altura, e salvar ou remover mostram o toast com "Desfazer"; a falha de gravação vira toast
 * de erro, e o formulário fica como estava.
 */
function MarcosEAnotacoes({
    marcos,
    adicionar,
    remover,
    restaurar,
}: {
    marcos: Marco[];
    adicionar: (m: Omit<Marco, "id">) => Promise<Marco>;
    remover: (id: string) => Promise<void>;
    restaurar: (m: Marco) => Promise<void>;
}) {
    const transicao = useTransicao();
    const [tipo, setTipo] = useState<TipoMarco>("lote");
    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [data, setData] = useState(HOJE.toISOString().slice(0, 10));
    const [salvando, setSalvando] = useState(false);

    const salvar = async () => {
        if (!titulo.trim() || !data) return;
        setSalvando(true);
        try {
            const novo = await adicionar({ data, tipo, titulo: titulo.trim(), descricao: descricao.trim() || undefined });
            setTitulo("");
            setDescricao("");
            toast.success("Anotação salva.", { action: { label: "Desfazer", onClick: () => void remover(novo.id).catch(() => toast.error(MSG_ERRO_REMOVER)) } });
        } catch {
            toast.error(MSG_ERRO_SALVAR);
        } finally {
            setSalvando(false);
        }
    };

    const tirar = async (marco: Marco) => {
        try {
            await remover(marco.id);
            toast.success("Anotação removida.", { action: { label: "Desfazer", onClick: () => void restaurar(marco).catch(() => toast.error(MSG_ERRO_SALVAR)) } });
        } catch {
            toast.error(MSG_ERRO_REMOVER);
        }
    };

    return (
        <section className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-md font-semibold text-primary">Marcos e anotações</h2>
                <p className="text-sm text-tertiary">Registre o que causou cada pico ou queda: virada de lote, anúncio de atração, ação de marketing, evento externo.</p>
            </div>

            <form
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-[11rem_12rem_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
                onSubmit={(e) => {
                    e.preventDefault();
                    void salvar();
                }}
            >
                <CampoData label="Data" valor={data} onChange={setData} />
                <Select label="Tipo" selectedKey={tipo} onSelectionChange={(k) => setTipo(String(k) as TipoMarco)} items={TIPOS}>
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
                <Input label="Título" value={titulo} onChange={setTitulo} placeholder="Ex.: virou o lote 5" />
                <Input label="Descrição" value={descricao} onChange={setDescricao} placeholder="Opcional" />
                <Button type="submit" size="md" color="primary" iconLeading={Plus} isDisabled={!titulo.trim() || !data} isLoading={salvando} showTextWhileLoading className="md:col-span-2 md:justify-self-start xl:col-span-1">
                    Salvar
                </Button>
            </form>

            {marcos.length === 0 ? (
                <p className="text-sm text-tertiary">Nenhuma anotação ainda.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-border-secondary">
                    <AnimatePresence initial={false}>
                        {marcos.map((marco) => (
                            <motion.li
                                key={marco.id}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={transicao}
                                className="overflow-hidden"
                            >
                                <div className="flex items-start gap-3 py-3">
                                    <span className="w-20 shrink-0 text-sm text-tertiary tabular-nums">{diaMes(marco.data, marco.data.slice(0, 4) !== String(ANO_ATUAL))}</span>
                                    <Badge size="sm" type="modern" color="gray">
                                        {TIPO_MARCO_LABEL[marco.tipo]}
                                    </Badge>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <p className="text-sm font-medium text-primary">{marco.titulo}</p>
                                        {marco.descricao && <p className="text-sm text-tertiary">{marco.descricao}</p>}
                                    </div>
                                    <ButtonUtility size="sm" color="tertiary" icon={Trash01} tooltip="Remover anotação" onClick={() => void tirar(marco)} />
                                </div>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            )}
        </section>
    );
}

/* ---------------- peças ---------------- */

const SessaoLinha = ({ sessao }: { sessao: Sessao }) => {
    const vendidos = sessao.vendas.ingresse + sessao.vendas.bilheteria + sessao.vendas.cortesia;
    const ocupacao = sessao.capacidade ? vendidos / sessao.capacidade : 0;
    const restante = sessao.capacidade - vendidos;

    return (
        <div className="flex flex-col gap-2 border-b border-secondary px-5 py-4 last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary">{sessao.nome}</h3>
                <span className="flex items-baseline gap-3 text-sm tabular-nums">
                    <span className={cx("font-semibold", ocupacao < 0.35 ? "text-error-primary" : "text-primary")}>{pct(ocupacao)}</span>
                    <span className="text-tertiary">{numero(restante)} disponíveis</span>
                </span>
            </div>
            <OcupacaoBar porCanal={sessao.vendas} capacidade={sessao.capacidade} withLegend />
        </div>
    );
};

/** Variação do ritmo contra os 7 dias anteriores: seta, sinal e valor (DECIDIDO "Desempenho e tendência"), só a partir de 5% (EVT-26). */
const Variacao = ({ valor }: { valor: number }) => {
    if (Math.abs(valor) < 0.05) return null;
    return (
        <span className="flex items-center gap-1">
            <MetricChangeIndicator type="simple" trend={valor > 0 ? "positive" : "negative"} value={`${valor > 0 ? "+" : "−"}${Math.round(Math.abs(valor) * 100)}%`} />
            <span className="sr-only">contra os 7 dias anteriores</span>
        </span>
    );
};

/**
 * Um desenho de métrica para a tela (UI-DS-009): a anatomia do MetricsSimple do DS (rótulo, valor e
 * indicador de variação do DS), sem o menu de ações dele, e sem cartão cinza dentro do cartão (UI-VIS-019).
 */
const Metrica = ({ titulo, valor, variacao, serie, apoio }: { titulo: string; valor: string; variacao?: ReactNode; serie?: number[]; apoio?: string }) => (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl p-4 ring-1 ring-secondary ring-inset">
        <h3 className="text-sm font-medium text-tertiary">{titulo}</h3>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-display-xs font-semibold text-primary tabular-nums">{valor}</p>
            {variacao}
        </div>
        {apoio && <p className="text-sm text-tertiary tabular-nums">{apoio}</p>}
        {serie && <Sparkline values={serie} stroke="var(--color-utility-brand-500)" />}
    </div>
);
