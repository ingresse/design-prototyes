import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger } from "react-aria-components";
import { toast } from "sonner";
import { Bank, DotsVertical, Download01, Eye, EyeOff, InfoCircle, Plus, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Repasse } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { AssistenteDeRepasse } from "../components/assistente-de-repasse";
import { dataCurtaFin, descricaoDaConta, podeCancelar, reais, ROTULO_DO_STATUS, STATUS_AGENDADOS, useFinancas, type SaldoDoEvento } from "../data/financas";

/*
 * Finanças (financas/rules.md): o gêmeo de `/payouts` do app de repasses de produção (cashout).
 * Os números do topo, "Seu saldo por evento" e "Suas solicitações"; pedir repasse abre o assistente.
 */

/**
 * Dica "i" (FIN-46): botão com nome ("Sobre o saldo disponível"), alvo de 28 px e explicação num popover
 * que abre no toque, no clique e no teclado (Enter/Espaço), e fecha com Esc ou tocando fora.
 */
const Dica = ({ rotulo, texto }: { rotulo: string; texto: string }) => (
    <AriaDialogTrigger>
        <ButtonUtility icon={InfoCircle} color="tertiary" size="xs" aria-label={rotulo} className="-my-1.5" />
        <Dropdown.Popover placement="top" className="w-72 max-w-[calc(100vw-2rem)]">
            <AriaDialog aria-label={rotulo} className="p-3 text-sm text-secondary outline-hidden">
                {texto}
            </AriaDialog>
        </Dropdown.Popover>
    </AriaDialogTrigger>
);

const pluralPtBr = new Intl.PluralRules("pt-BR");
/** "1 evento selecionado" / "2 eventos selecionados" (FIN-56). */
const eventosSelecionados = (n: number) => `${n} ${pluralPtBr.select(n) === "one" ? "evento selecionado" : "eventos selecionados"}`;

const csv = (nome: string, linhas: (string | number)[][]) => {
    const texto = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
};

const valorBR = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Financas() {
    const { carregando, saldos, contas, repasses, gravar } = useFinancas();
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const [aba, setAba] = useState<"eventos" | "solicitacoes">("eventos");
    const [mostrarRepassado, setMostrarRepassado] = useState(false);
    const [periodo, setPeriodo] = useState("30");

    const comSaldo = saldos.filter((s) => s.total >= 0.01);

    /*
     * O assistente de repasse mora no endereço (FIN-49): `?passo=1..3`. Abrir e avançar empilham uma
     * entrada no histórico, com a profundidade e os eventos escolhidos no estado da entrada; voltar um
     * passo é o voltar do navegador, e sair volta tantas entradas quantas o assistente empilhou.
     */
    const doAssistente = (location.state as { repasse?: { profundidade: number; eventos: string[] } } | null)?.repasse;
    const passoNaUrl = params.get("passo");
    const passo = passoNaUrl ? Math.min(Math.max(Math.round(Number(passoNaUrl)) || 1, 1), 3) - 1 : null;
    const eventosDoAssistente = doAssistente?.eventos ? comSaldo.filter((s) => doAssistente.eventos.includes(s.eventoId)) : comSaldo;
    const profundidade = doAssistente?.profundidade ?? 0;
    const estadoDoPasso = (prof: number) => ({ repasse: { profundidade: prof, eventos: eventosDoAssistente.map((s) => s.eventoId) } });
    const abrirAssistente = (lista: SaldoDoEvento[]) => navigate({ search: "?passo=1" }, { state: { repasse: { profundidade: 1, eventos: lista.map((s) => s.eventoId) } } });
    const irParaPasso = (n: number) => navigate({ search: `?passo=${n + 1}` }, { state: estadoDoPasso(profundidade + 1) });
    const substituirPasso = (n: number) => navigate({ search: `?passo=${n + 1}` }, { replace: true, state: estadoDoPasso(profundidade) });
    // Volta uma entrada quando a anterior é o passo anterior (o assistente a empilhou); aberto por link, só troca o passo.
    const voltarPasso = () => (passo && profundidade > 1 ? navigate(-1) : substituirPasso(Math.max((passo ?? 0) - 1, 0)));
    const fecharAssistente = () => (profundidade > 0 ? navigate(-profundidade) : navigate({ search: "" }, { replace: true }));
    const recomecarAssistente = () => (profundidade > 1 ? navigate(-(profundidade - 1)) : substituirPasso(0));
    const totalPodeRepassar = saldos.reduce((n, s) => n + s.total, 0);
    // "Em andamento" = pedidos ainda não pagos: em análise, pendentes ou agendados (FIN-48).
    const agendados = repasses.filter((r) => STATUS_AGENDADOS.includes(r.status));
    const hoje = new Date().toISOString().slice(0, 10);
    const proximo = agendados.map((r) => r.dataPrevista).filter((d) => d >= hoje).sort()[0];
    const dias = periodo === "todos" ? Infinity : Number(periodo);
    const desde = Date.now() - dias * 86_400_000;
    const repassado = repasses.filter((r) => r.status === "pago" && new Date(r.solicitadoEm).getTime() >= desde).reduce((n, r) => n + r.valorTransferido, 0);

    return (
        <BackstageLayout activeProducer="financas" showEventContext={false} showLayoutSwitcher={false}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                {carregando ? (
                    // Carregando: o cabeçalho já aparece; cartões e linhas pulsam no lugar (BKS-116).
                    <>
                        <CabecalhoDaPagina titulo="Finanças" />
                        <div aria-hidden="true" className="grid gap-4 md:grid-cols-3">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="h-24 animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" />
                            ))}
                        </div>
                        <CarregandoTabela rotulo="Carregando repasses..." />
                    </>
                ) : passo !== null ? (
                    <AssistenteDeRepasse
                        eventos={eventosDoAssistente}
                        contas={contas}
                        repasses={repasses}
                        gravar={gravar}
                        passo={passo}
                        irPara={irParaPasso}
                        substituirPasso={substituirPasso}
                        voltarPasso={voltarPasso}
                        onFechar={fecharAssistente}
                        onRecomecar={recomecarAssistente}
                    />
                ) : (
                    <>
                        <CabecalhoDaPagina titulo="Finanças" />

                        <div className="grid gap-4 lg:grid-cols-2">
                            <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
                                {/* No celular, "Novo repasse" desce para baixo do valor: lado a lado não cabe em 390 px (UI-MOB-005). */}
                                <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <span className="flex items-center gap-1 text-sm text-tertiary">
                                            Você pode repassar até <Dica rotulo="Sobre o valor que você pode repassar" texto="Este valor é a soma do seu saldo disponível com o saldo a liberar, não considerando taxas. Ele representa o total que você pode solicitar hoje" />
                                        </span>
                                        <span className="text-display-sm font-semibold text-primary tabular-nums">{reais(totalPodeRepassar)}</span>
                                    </div>
                                    {/* Sem saldo, o motivo fica escrito ao lado do botão, não só num tooltip (FIN-11). */}
                                    <div className="flex flex-col items-start gap-1.5 sm:items-end">
                                        <Button color="primary" size="sm" iconLeading={Plus} isDisabled={!comSaldo.length} aria-describedby={comSaldo.length ? undefined : "motivo-novo-repasse"} onClick={() => abrirAssistente(comSaldo)}>
                                            Novo repasse
                                        </Button>
                                        {!comSaldo.length && (
                                            <p id="motivo-novo-repasse" className="text-sm text-tertiary">
                                                Sem saldo disponível para repasse.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <dl className="flex flex-col gap-2 border-t border-secondary pt-3 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <dt className="flex items-center gap-1 text-tertiary">
                                            Disponível <Dica rotulo="Sobre o saldo disponível" texto="Este valor está disponível conforme suas vendas e plano de repasse e já pode ser transferido." />
                                        </dt>
                                        <dd className="font-medium text-primary tabular-nums">{reais(saldos.reduce((n, s) => n + s.disponivel, 0))}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="flex items-center gap-1 text-tertiary">
                                            Saldo a liberar <Dica rotulo="Sobre o saldo a liberar" texto="Esse valor ainda não está disponível para repasse, mas pode ser antecipado mediante cobrança de taxa." />
                                        </dt>
                                        <dd className="font-medium text-primary tabular-nums">{reais(saldos.reduce((n, s) => n + s.aLiberar, 0))}</dd>
                                    </div>
                                </dl>
                            </section>
                            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                <section className="flex min-w-0 flex-col gap-3 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
                                    <span className="flex items-center gap-1 text-sm text-tertiary">
                                        Repasses em andamento <Dica rotulo="Sobre os repasses em andamento" texto="Repasses já pedidos que ainda não foram pagos: em análise, pendentes ou agendados para a data de pagamento." />
                                    </span>
                                    <span className="text-display-xs font-semibold text-primary tabular-nums">{reais(agendados.reduce((n, r) => n + r.valorSolicitado, 0))}</span>
                                    <dl className="flex flex-col gap-1 border-t border-secondary pt-3 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-tertiary">Solicitações em andamento</dt>
                                            <dd className="text-primary tabular-nums">{agendados.length}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-tertiary">Próximo pagamento</dt>
                                            <dd className="text-primary">{dataCurtaFin(proximo)}</dd>
                                        </div>
                                    </dl>
                                </section>
                                <section className="flex min-w-0 flex-col gap-3 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
                                    <span className="flex items-center gap-1 text-sm text-tertiary">
                                        {periodo === "todos" ? "Total já repassado" : `Repassado nos últimos ${periodo} dias`}
                                        <Dica rotulo="Sobre o valor já repassado" texto="Valor transferido para a sua conta em repasses concluídos no período selecionado." />
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="text-display-xs font-semibold text-primary tabular-nums">{mostrarRepassado ? reais(repassado) : "R$ ••••••"}</span>
                                        <ButtonUtility icon={mostrarRepassado ? EyeOff : Eye} color="tertiary" size="xs" tooltip={mostrarRepassado ? "Esconder valor" : "Mostrar valor"} onClick={() => setMostrarRepassado((v) => !v)} />
                                    </span>
                                </section>
                            </div>
                        </div>

                        <section className="flex flex-col gap-4">
                            <Tabs selectedKey={aba} onSelectionChange={(k) => setAba(k as typeof aba)}>
                                <Tabs.List type="button-border" size="sm" aria-label="Finanças">
                                    <Tabs.Item id="eventos">Seu saldo por evento</Tabs.Item>
                                    <Tabs.Item id="solicitacoes">Suas solicitações</Tabs.Item>
                                </Tabs.List>
                            </Tabs>
                            {aba === "eventos" ? (
                                <SaldoPorEvento saldos={saldos} onRepassar={abrirAssistente} />
                            ) : (
                                <Solicitacoes
                                    repasses={repasses}
                                    contas={contas}
                                    saldos={saldos}
                                    periodo={periodo}
                                    onPeriodo={setPeriodo}
                                    gravar={gravar}
                                    onNovoRepasse={comSaldo.length ? () => abrirAssistente(comSaldo) : undefined}
                                    onVerSaldos={() => setAba("eventos")}
                                />
                            )}
                        </section>
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}

function SaldoPorEvento({ saldos, onRepassar }: { saldos: SaldoDoEvento[]; onRepassar: (l: SaldoDoEvento[]) => void }) {
    const navigate = useNavigate();
    const [busca, setBusca] = useState("");
    // Dois filtros exclusivos, cada um num select do DS (FIN-55): quando é o evento e se tem saldo.
    const [quando, setQuando] = useState<"todos" | "futuros" | "passados">("todos");
    const [comOuSem, setComOuSem] = useState<"todos" | "com" | "sem">("todos");
    const [sel, setSel] = useState<Set<string>>(new Set());
    const semMovimento = useReducedMotion();
    const termo = busca.trim().toLowerCase();
    const agora = new Date().toISOString();
    const lista = saldos.filter(
        (s) =>
            (!termo || s.nome.toLowerCase().includes(termo) || s.eventoId.toLowerCase().includes(termo)) &&
            (quando !== "futuros" || s.data >= agora) &&
            (quando !== "passados" || s.data < agora) &&
            (comOuSem !== "com" || s.total >= 0.01) &&
            (comOuSem !== "sem" || s.total < 0.01),
    );
    const selecionados = saldos.filter((s) => sel.has(s.eventoId));
    const paginacao = usePaginacao(lista, [termo, quando, comOuSem]);
    const limpar = () => (setBusca(""), setQuando("todos"), setComOuSem("todos"));

    const relatorio = (tipo: "saldo" | "futuro") => {
        if (!selecionados.length) return void toast.error("Selecione ao menos um evento para gerar o relatório.");
        const data = new Date().toISOString().slice(0, 10);
        if (tipo === "saldo") csv(`balance_report_${data}.csv`, [["ID do Evento", "Nome do Evento", "Data do Evento", "Saldo disponível", "Saldo a liberar", "Total do evento"], ...selecionados.map((s) => [s.eventoId, s.nome, s.data.slice(0, 10), valorBR(s.disponivel), valorBR(s.aLiberar), valorBR(s.total)])]);
        else csv(`future_availability_report_${data}.csv`, [["ID do Evento", "Nome do Evento", "Data do Evento", "Disponibilização", "Valor disponivel acumulado"], ...selecionados.map((s) => [s.eventoId, s.nome, s.data.slice(0, 10), s.data.slice(0, 10), valorBR(s.total)])]);
        toast.success(selecionados.length === 1 ? "Relatório de 1 evento gerado." : `Relatório de ${selecionados.length} eventos gerado.`);
    };

    return (
        <>
            <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: "Buscar eventos...", rotulo: "Buscar eventos" }}>
                <NativeSelect
                    aria-label="Data do evento"
                    size="sm"
                    value={quando}
                    onChange={(e) => setQuando(e.target.value as typeof quando)}
                    options={[
                        { label: "Todos os eventos", value: "todos" },
                        { label: "Eventos futuros", value: "futuros" },
                        { label: "Eventos passados", value: "passados" },
                    ]}
                    className="w-full sm:w-44"
                />
                <NativeSelect
                    aria-label="Saldo disponível"
                    size="sm"
                    value={comOuSem}
                    onChange={(e) => setComOuSem(e.target.value as typeof comOuSem)}
                    options={[
                        { label: "Com e sem saldo", value: "todos" },
                        { label: "Com saldo disponível", value: "com" },
                        { label: "Sem saldo disponível", value: "sem" },
                    ]}
                    className="w-full sm:w-52"
                />
                <Dropdown.Root>
                    <Button color="secondary" size="sm" iconLeading={Download01}>
                        Relatórios
                    </Button>
                    <Dropdown.Popover className="w-80" placement="bottom end">
                        <Dropdown.Menu aria-label="Relatório dos eventos selecionados" onAction={(k) => relatorio(k as "saldo" | "futuro")}>
                            <Dropdown.Item id="saldo" label={`Relatório de saldo por evento (${selecionados.length})`} />
                            <Dropdown.Item id="futuro" label={`Relatório de disponibilidade futura (${selecionados.length})`} />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </BarraDaLista>
            {saldos.length === 0 ? (
                // Vazio com diagnóstico e ação (FIN-16).
                <VazioDaTabela
                    icone={Bank}
                    titulo="Esta organização ainda não tem eventos"
                    texto="O saldo de cada evento aparece aqui, com o que já pode ser repassado. Crie um evento em Eventos para começar a vender."
                    acao={
                        <Button color="primary" size="md" onClick={() => navigate("/backstage/eventos")}>
                            Ver eventos
                        </Button>
                    }
                />
            ) : (
                <CartaoDaTabela>
                    {/* O cabeçalho fica também no cartão estreito, por causa do "selecionar todos"; lá as colunas saem e cada linha leva os rótulos. */}
                    <CabecalhoDaTabela ordenavel className="flex">
                        <Checkbox
                            size="sm"
                            aria-label="Selecionar todos os eventos"
                            isSelected={lista.length > 0 && lista.every((s) => sel.has(s.eventoId))}
                            isIndeterminate={lista.some((s) => sel.has(s.eventoId)) && !lista.every((s) => sel.has(s.eventoId))}
                            isDisabled={lista.length === 0}
                            onChange={(on) => setSel(on ? new Set(lista.map((s) => s.eventoId)) : new Set())}
                        />
                        <span aria-hidden="true" className="min-w-0 flex-1">
                            Evento
                        </span>
                        <span aria-hidden="true" className="hidden w-32 text-right @min-[44rem]:block">
                            Total do evento
                        </span>
                        <span aria-hidden="true" className="hidden w-32 text-right @min-[44rem]:block">
                            Saldo disponível
                        </span>
                        <span aria-hidden="true" className="hidden w-32 text-right @min-[44rem]:block">
                            Saldo a liberar
                        </span>
                        <span aria-hidden="true" className="hidden w-8 @min-[44rem]:block" />
                    </CabecalhoDaTabela>
                    {lista.length === 0 ? (
                        <SemResultados texto="Nenhum evento encontrado para essa busca ou filtro." onLimpar={limpar} />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map((s) => (
                                <LinhaDaTabela key={s.eventoId} selecionada={sel.has(s.eventoId)}>
                                    <Checkbox
                                        size="sm"
                                        aria-label={`Selecionar ${s.nome}`}
                                        isSelected={sel.has(s.eventoId)}
                                        onChange={(on) =>
                                            setSel((x) => {
                                                const p = new Set(x);
                                                on ? p.add(s.eventoId) : p.delete(s.eventoId);
                                                return p;
                                            })
                                        }
                                        className="mt-0.5 @min-[44rem]:mt-0"
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <img src={s.capa} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                                            <TituloDaLinha titulo={s.nome} apoio={`${dataCurtaFin(s.data)}, ID ${s.eventoId}`} />
                                        </div>
                                        <Celula rotulo="Total do evento" numero className="@min-[44rem]:w-32">
                                            {reais(s.total)}
                                        </Celula>
                                        <Celula rotulo="Saldo disponível" numero className="@min-[44rem]:w-32">
                                            {reais(s.disponivel)}
                                        </Celula>
                                        <Celula rotulo="Saldo a liberar" numero className="@min-[44rem]:w-32">
                                            {reais(s.aLiberar)}
                                        </Celula>
                                    </div>
                                    <div className="flex w-8 shrink-0 justify-end">{s.total >= 0.01 && <ButtonUtility icon={Plus} color="tertiary" size="sm" tooltip="Novo repasse" onClick={() => onRepassar([s])} />}</div>
                                </LinhaDaTabela>
                            ))}
                        </ul>
                    )}
                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            )}
            {/* Barra de seleção presa ao pé da lista (sticky), na largura do conteúdo, e não da tela; entra e sai deslizando (FIN-56). */}
            <AnimatePresence initial={false}>
                {selecionados.length > 0 && (
                    <motion.div
                        role="toolbar"
                        aria-label="Eventos selecionados"
                        initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={semMovimento ? { opacity: 0 } : { opacity: 0, y: 16 }}
                        transition={{ duration: semMovimento ? 0 : 0.2, ease: "easeOut" }}
                        className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-2xl bg-primary p-3 shadow-xl ring-1 ring-secondary"
                    >
                        <span className="px-2 text-sm font-semibold text-primary">{eventosSelecionados(selecionados.length)}</span>
                        <Button color="link-gray" size="sm" onClick={() => setSel(new Set())}>
                            Limpar seleção
                        </Button>
                        <Button color="primary" size="sm" className="ml-auto" isDisabled={!selecionados.some((s) => s.total >= 0.01)} onClick={() => onRepassar(selecionados.filter((s) => s.total >= 0.01))}>
                            Solicitar repasse em massa
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function Solicitacoes({
    repasses,
    contas,
    saldos,
    periodo,
    onPeriodo,
    gravar,
    onNovoRepasse,
    onVerSaldos,
}: {
    repasses: Repasse[];
    contas: ReturnType<typeof useFinancas>["contas"];
    saldos: SaldoDoEvento[];
    periodo: string;
    onPeriodo: (p: string) => void;
    gravar: ReturnType<typeof useFinancas>["gravar"];
    /** Só quando há saldo para repassar. */
    onNovoRepasse?: () => void;
    onVerSaldos: () => void;
}) {
    const [busca, setBusca] = useState("");
    const [detalhe, setDetalhe] = useState<Repasse | null>(null);
    const [cancelando, setCancelando] = useState<Repasse | null>(null);
    const dias = periodo === "todos" ? Infinity : Number(periodo);
    const desde = Date.now() - dias * 86_400_000;
    const termo = busca.trim().toLowerCase();
    const conta = (id: string) => contas.find((c) => c.id === id);
    const lista = useMemo(
        () =>
            repasses
                .filter((r) => new Date(r.solicitadoEm).getTime() >= desde || STATUS_AGENDADOS.includes(r.status))
                .filter((r) => !termo || (conta(r.contaId)?.titular ?? "").toLowerCase().includes(termo) || r.solicitante.toLowerCase().includes(termo) || dataCurtaFin(r.concluidoEm).includes(termo))
                .sort((a, b) => b.solicitadoEm.localeCompare(a.solicitadoEm)),
        [repasses, desde, termo, contas],
    );
    const paginacao = usePaginacao(lista, [termo, periodo]);
    // Limpar volta a busca e mostra todo o período: o padrão (30 dias) pode continuar vazio.
    const limpar = () => (setBusca(""), onPeriodo("todos"));
    const conclusao = (r: Repasse) => (["pago", "rejeitado", "falhou", "cancelado"].includes(r.status) ? dataCurtaFin(r.concluidoEm) : "-");

    return (
        <>
            {/* Busca à esquerda e período à direita, na barra comum (BKS-111). */}
            <BarraDaLista busca={{ valor: busca, onChange: setBusca, placeholder: "Buscar favorecido, solicitante ou data", rotulo: "Buscar solicitações por favorecido, solicitante ou data de pagamento" }}>
                <NativeSelect
                    aria-label="Período"
                    size="sm"
                    value={periodo}
                    onChange={(e) => onPeriodo(e.target.value)}
                    options={[
                        { label: "Últimos 30 dias", value: "30" },
                        { label: "Últimos 60 dias", value: "60" },
                        { label: "Últimos 90 dias", value: "90" },
                        { label: "Todos", value: "todos" },
                    ]}
                    className="w-full sm:w-44"
                />
            </BarraDaLista>
            {repasses.length === 0 ? (
                // Vazio com diagnóstico e ação (FIN-28): com saldo, pedir o repasse; sem saldo, ver o saldo por evento.
                <VazioDaTabela
                    icone={Bank}
                    titulo="Você ainda não solicitou nenhum repasse"
                    texto={
                        onNovoRepasse
                            ? "Você já tem saldo para repassar. Os repasses pedidos aparecem aqui, com o status de cada um."
                            : "Ainda não há saldo disponível para repasse. Veja quanto cada evento vai liberar em Seu saldo por evento."
                    }
                    acao={
                        onNovoRepasse ? (
                            <Button color="primary" size="md" iconLeading={Plus} onClick={onNovoRepasse}>
                                Novo repasse
                            </Button>
                        ) : (
                            <Button color="secondary" size="md" onClick={onVerSaldos}>
                                Ver saldo por evento
                            </Button>
                        )
                    }
                />
            ) : (
                <CartaoDaTabela>
                    <CabecalhoDaTabela>
                        <span className="min-w-0 flex-1">Favorecido</span>
                        <span className="w-28 text-right">Valor líquido</span>
                        <span className="w-24">Solicitação</span>
                        <span className="w-24">Conclusão</span>
                        <span className="w-24">Status</span>
                        <span className="w-8" />
                    </CabecalhoDaTabela>
                    {lista.length === 0 ? (
                        <SemResultados texto="Nenhum repasse encontrado para essa busca ou período." onLimpar={limpar} />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map((r) => {
                                const c = conta(r.contaId);
                                const st = ROTULO_DO_STATUS[r.status];
                                return (
                                    <LinhaDaTabela key={r.id}>
                                        <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-fg-secondary">
                                                    {c?.tipo === "pix" ? <span className="text-xs font-semibold">Pix</span> : <Bank className="size-4" aria-hidden="true" />}
                                                </span>
                                                <TituloDaLinha titulo={c?.titular ?? "Conta removida"} apoio={`Solicitado por ${r.solicitante.includes("@ingresse") ? "Atendimento Financeiro" : r.solicitante}`} />
                                            </div>
                                            <Celula rotulo="Valor líquido" numero className="font-semibold @min-[44rem]:w-28">
                                                {reais(r.valorTransferido)}
                                            </Celula>
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 @min-[44rem]:contents">
                                                <Celula rotulo="Solicitação" className="text-tertiary @min-[44rem]:w-24">
                                                    {dataCurtaFin(r.solicitadoEm)}
                                                </Celula>
                                                <Celula rotulo="Conclusão" className="text-tertiary @min-[44rem]:w-24">
                                                    {conclusao(r)}
                                                </Celula>
                                            </div>
                                            <div className="@min-[44rem]:w-24">
                                                <Badge type="pill-color" color={st.cor} size="sm">
                                                    {st.rotulo}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex w-8 shrink-0 justify-end">
                                            <Dropdown.Root>
                                                <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" tooltip="Mais opções" />
                                                <Dropdown.Popover className="w-48" placement="bottom end">
                                                    <Dropdown.Menu
                                                        aria-label="Mais opções"
                                                        disabledKeys={[...(r.status === "pago" ? [] : ["comprovante"]), ...(podeCancelar(r) ? [] : ["cancelar"])]}
                                                        onAction={(k) => {
                                                            if (k === "detalhes") setDetalhe(r);
                                                            else if (k === "comprovante") comprovante(r, c?.titular ?? "");
                                                            else setCancelando(r);
                                                        }}
                                                    >
                                                        <Dropdown.Item id="detalhes" label="Ver detalhes" />
                                                        <Dropdown.Item id="comprovante" label="Baixar comprovante" />
                                                        <Dropdown.Item id="cancelar" label="Cancelar" />
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </div>
                                    </LinhaDaTabela>
                                );
                            })}
                        </ul>
                    )}
                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            )}
            {detalhe && <DetalhesDoRepasse repasse={detalhe} conta={conta(detalhe.contaId)} saldos={saldos} onFechar={() => setDetalhe(null)} />}
            <ModalDeConfirmacao
                aberto={!!cancelando}
                titulo="Cancelar solicitação de repasse"
                descricao="Tem certeza de que deseja cancelar esta solicitação de repasse? Após o cancelamento, o valor voltará para o seu saldo disponível e não haverá cobrança financeira."
                confirmar="Cancelar solicitação"
                destrutiva
                onConfirmar={async () => {
                    if (!cancelando) return;
                    await gravar({ repasses: repasses.map((r) => (r.id === cancelando.id ? { ...r, status: "cancelado", concluidoEm: new Date().toISOString() } : r)) });
                    toast.success("A solicitação de repasse foi cancelada com sucesso.");
                    setCancelando(null);
                }}
                onFechar={() => setCancelando(null)}
            />
        </>
    );
}

/** Comprovante de um repasse pago: no protótipo, um texto simples para baixar (em produção, PDF). */
function comprovante(r: Repasse, titular: string) {
    const texto = [
        "Comprovante de Transferência",
        reais(r.valorTransferido),
        `Realizado em ${dataCurtaFin(r.concluidoEm)}`,
        "",
        "De: Ingresse - Ingressos para Eventos S.A",
        `Para: ${titular}`,
        `ID da transação: ${r.id}`,
        r.descricao ? `Descrição: ${r.descricao}` : "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante_repasse_${r.idDeControle ?? ""}${r.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function DetalhesDoRepasse({ repasse: r, conta, saldos, onFechar }: { repasse: Repasse; conta?: ReturnType<typeof useFinancas>["contas"][number]; saldos: SaldoDoEvento[]; onFechar: () => void }) {
    const st = ROTULO_DO_STATUS[r.status];
    const linhas: [string, string | undefined][] = [
        ["ID", r.id],
        ["Motivo", ["rejeitado", "falhou"].includes(r.status) ? r.motivo : undefined],
        ["Solicitação", dataCurtaFin(r.solicitadoEm)],
        ["Previsão de pagamento", STATUS_AGENDADOS.includes(r.status) ? dataCurtaFin(r.dataPrevista) : undefined],
        ["Conclusão", ["rejeitado", "pago", "cancelado"].includes(r.status) ? dataCurtaFin(r.concluidoEm) : undefined],
        ["Conta favorecida", conta ? `${conta.titular}, ${descricaoDaConta(conta)}` : "Conta removida"],
    ];
    return (
        <ModalOverlay isOpen onOpenChange={(o) => !o && onFechar()} isDismissable>
            <Modal>
                <Dialog aria-label="Detalhes do repasse">
                    <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col gap-5 overflow-y-auto rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onFechar} className="absolute top-4 right-4" />
                        <h2 className="pr-8 text-lg font-semibold text-primary">Detalhes do repasse</h2>
                        <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold text-primary">Informações do repasse</h3>
                            <dl className="grid gap-3 rounded-xl bg-secondary_subtle p-4 text-sm ring-1 ring-secondary sm:grid-cols-2">
                                <div className="flex flex-col">
                                    <dt className="text-tertiary">Status</dt>
                                    <dd>
                                        <Badge type="pill-color" color={st.cor} size="sm">
                                            {st.rotulo}
                                        </Badge>
                                    </dd>
                                </div>
                                {linhas
                                    .filter(([, v]) => v)
                                    .map(([k, v]) => (
                                        <div key={k} className="flex min-w-0 flex-col">
                                            <dt className="text-tertiary">{k}</dt>
                                            <dd className="break-words text-primary">{v}</dd>
                                        </div>
                                    ))}
                            </dl>
                        </section>
                        <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold text-primary">{`Eventos (${r.liquidacoes.length})`}</h3>
                            <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary">
                                {r.liquidacoes.map((l) => {
                                    const s = saldos.find((x) => x.eventoId === l.eventoId);
                                    return (
                                        <li key={l.eventoId} className="flex items-center gap-3 p-3 text-sm">
                                            {s && <img src={s.capa} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />}
                                            <span className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate font-medium text-primary">{s?.nome ?? l.eventoId}</span>
                                                <span className="text-xs text-tertiary">{s ? `${dataCurtaFin(s.data)}, ID ${l.eventoId}` : `ID ${l.eventoId}`}</span>
                                            </span>
                                            <span className="text-primary tabular-nums">{reais(l.valor)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                        <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold text-primary">Valores</h3>
                            <dl className="flex flex-col gap-1.5 text-sm">
                                {(
                                    [
                                        ["Subtotal", r.valorSolicitado],
                                        ["Taxa de antecipação", r.taxaAntecipacao],
                                        ["Taxa de agendamento", r.taxaTransferencia],
                                    ] as const
                                ).map(([k, v]) => (
                                    <div key={k} className="flex justify-between">
                                        <dt className="text-tertiary">{k}</dt>
                                        <dd className="text-primary tabular-nums">{reais(v)}</dd>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t border-secondary pt-2 font-semibold">
                                    <dt className="text-primary">Total</dt>
                                    <dd className="text-primary tabular-nums">{reais(r.valorTransferido)}</dd>
                                </div>
                            </dl>
                        </section>
                        {r.status === "pago" && (
                            <p className="text-sm text-tertiary">
                                Para mais informações acesse o{" "}
                                <Button color="link-color" size="sm" onClick={() => comprovante(r, conta?.titular ?? "")}>
                                    comprovante do repasse
                                </Button>
                            </p>
                        )}
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
