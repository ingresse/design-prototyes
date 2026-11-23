import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, Expand01, SearchLg, Settings01, XCircle } from "@untitledui/icons";
import { toast } from "sonner";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import documentoImg from "../components/assets/documento-identificacao.png";
import grafismo from "../components/assets/grafismo.svg";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { SemResultados } from "../../components/tabela";
import { DecisaoModal, JUSTIFICATIVAS } from "../components/DecisaoModal";
import { useSegmentacoesDaOrganizacao } from "../../components/segmentacoes-da-organizacao";
import { AnexoViewerModal } from "../components/AnexoViewerModal";
import { LaudoView } from "../components/LaudoView";
import { FormularioParticipacaoModal, type LimiteSolicitacoes } from "../components/FormularioParticipacaoModal";
import { salvarFormulario, useFormulariosDaOrganizacao } from "../data/formularios";
import { showSuccessToast, showNeutralToast } from "../utils/toast";
import {
    STATUS_META,
    decidirSolicitacao,
    formatarData,
    formatarDataHora,
    useSolicitacoesDoFormulario,
    type Anexo,
    type StatusSolicitacao,
} from "../data/solicitacoes";

const USUARIO_ATUAL_EMAIL = "thais.silva@vegasports.com.br";

const TABS: { id: StatusSolicitacao; label: string }[] = [
    { id: "pendente", label: "Pendente" },
    { id: "aprovada", label: "Aprovado" },
    { id: "rejeitada", label: "Reprovado" },
];

const MENSAGEM_LISTA_VAZIA: Record<StatusSolicitacao, string> = {
    pendente: "Não há pedidos pendentes",
    aprovada: "Não há pedidos aprovados",
    rejeitada: "Não há pedidos reprovados",
};

/** Mostra a scrollbar (classe is-scrolling) enquanto a área rola; esconde após parar. */
function useScrolling() {
    const [scrolling, setScrolling] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onScroll = () => {
        setScrolling(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setScrolling(false), 700);
    };
    return { scrolling, onScroll };
}

/** Data e hora da decisão; pedido pendente (ou decidido antes de gravar a hora) mostra só a data do pedido, sem hora inventada (PUB-98, PUB-109). */
const quandoDaDecisao = (s: { status: StatusSolicitacao; data: string; decididaEm?: string }) =>
    s.status !== "pendente" && s.decididaEm ? formatarDataHora(s.decididaEm) : formatarData(s.data);

const rotuloDecisao = (s: StatusSolicitacao) =>
    s === "pendente" ? "Pedido em" : s === "aprovada" ? "Aprovado em" : "Reprovado em";

/** Backstage → Público → Pedidos de participação. */
export function SolicitacoesParticipacao() {
    const navigate = useNavigate();
    const location = useLocation();
    const formularioId = (location.state as { formularioId?: string } | null)?.formularioId ?? null;
    // Sem formulário escolhido (entrada direta), abre o primeiro: o título é sempre o evento do formulário.
    // Sem nenhum formulário, a tela não tem o que mostrar: volta para a lista, com o "Novo formulário" (PUB-95, PUB-100).
    const { carregando: carregandoOrganizacao, formularios } = useFormulariosDaOrganizacao();
    const formulario = formularios.find((f) => f.id === formularioId) ?? formularios[0] ?? null;
    // Celular: uma coluna por vez (lista ou pedido), como em produção.
    const [detalheNoCelular, setDetalheNoCelular] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    // Pedidos deste formulário, gravados no evento; a primeira abertura grava os de exemplo (PUB-96, PUB-97).
    const { solicitacoes, prontas } = useSolicitacoesDoFormulario(formulario?.id ?? null);
    // Aprovar inclui o documento da pessoa na segmentação escolhida (SEG-51).
    const segs = useSegmentacoesDaOrganizacao();
    const [tab, setTab] = useState<StatusSolicitacao>("pendente");
    const [busca, setBusca] = useState("");
    const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
    const [decisao, setDecisao] = useState<"aprovar" | "rejeitar" | null>(null);
    const [visualizando, setVisualizando] = useState<Anexo | null>(null);
    const listaScroll = useScrolling();
    const detalheScroll = useScrolling();
    const cartaoRef = useRef<HTMLDivElement>(null);

    // Celular: ao trocar entre lista e pedido, o topo do cartão volta à vista se tiver ficado acima da tela (PUB-101).
    useEffect(() => {
        const cartao = cartaoRef.current;
        if (cartao && cartao.getBoundingClientRect().top < 0) cartao.scrollIntoView({ block: "start" });
    }, [detalheNoCelular]);

    // Trocar de formulário volta à aba Pendente, sem pedido escolhido.
    useEffect(() => {
        setSelecionadaId(null);
        setTab("pendente");
    }, [formulario?.id]);

    const query = busca.trim().toLowerCase();

    const lista = useMemo(
        () =>
            solicitacoes.filter((s) => {
                const matchTab = s.status === tab;
                const matchBusca =
                    !query || s.nome.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
                return matchTab && matchBusca;
            }),
        [solicitacoes, tab, query],
    );

    // Ao entrar, o primeiro pedido da aba já vem selecionado (PUB-45).
    useEffect(() => {
        if (lista.length > 0 && !solicitacoes.some((s) => s.id === selecionadaId)) setSelecionadaId(lista[0].id);
    }, [lista, solicitacoes, selecionadaId]);

    const contagem = useMemo(
        () => ({
            pendente: solicitacoes.filter((s) => s.status === "pendente").length,
            aprovada: solicitacoes.filter((s) => s.status === "aprovada").length,
            rejeitada: solicitacoes.filter((s) => s.status === "rejeitada").length,
        }),
        [solicitacoes],
    );

    const selecionada = solicitacoes.find((s) => s.id === selecionadaId) ?? null;

    // Os pedidos já estão na tela: trocar de pedido mostra o detalhe na hora, sem espera fixa (PUB-102).
    const selecionar = (id: string) => {
        setDetalheNoCelular(true);
        setSelecionadaId(id);
    };

    // A decisão grava no evento e sobrevive a sair da tela (PUB-98).
    const decidir = (id: string, status: StatusSolicitacao, segmento?: string, justificativa?: string) => {
        if (formulario) void decidirSolicitacao(formulario.id, id, { status, segmento, justificativa });
    };

    /** Confirma a decisão do modal (aprovar/rejeitar) e dispara o toast de feedback. */
    const confirmarDecisao = (opcaoId: string, textoLivre?: string) => {
        if (!selecionada || !decisao) return;
        const nome = selecionada.nome;
        if (decisao === "aprovar") {
            const alvo = segs.segmentacoes.find((o) => o.id === opcaoId);
            const seg = alvo?.nome;
            decidir(selecionada.id, "aprovada", seg);
            const digitos = selecionada.documento.replace(/\D/g, "");
            const doc = digitos.length === 11 ? { documento: digitos, tipo: "cpf" as const } : { documento: selecionada.documento.replace(/\s/g, "").toUpperCase(), tipo: "passaporte" as const };
            if (alvo && !alvo.documentos.some((d) => d.documento === doc.documento))
                void segs.gravar(segs.segmentacoes.map((x) => (x.id === alvo.id ? { ...x, documentos: [...x.documentos, doc], atualizadoEm: new Date().toISOString() } : x)));
            setTab("aprovada");
            showSuccessToast("Pedido aprovado", `${nome} entrou na segmentação ${seg}.`);
        } else {
            const just = textoLivre || JUSTIFICATIVAS.find((o) => o.id === opcaoId)?.label || "";
            decidir(selecionada.id, "rejeitada", undefined, just);
            setTab("rejeitada");
            showNeutralToast("Pedido reprovado", `Pedido de ${nome} reprovado. Motivo: ${just}.`);
        }
        setDecisao(null);
    };

    /** Salva as configurações (recebimento/limite) do formulário no store compartilhado. */
    const handleSalvarConfiguracao = ({ ativo, limite, quantidade }: { ativo: boolean; limite: LimiteSolicitacoes; quantidade?: number }) => {
        if (!formulario) return;
        void salvarFormulario(formulario.id, { ativo, limite, quantidadeLimite: quantidade });
        toast.success("Configuração salva", {
            description: ativo ? "O formulário aceita pedidos." : "O recebimento está desligado: o formulário não aceita pedidos.",
            duration: 2000,
        });
    };

    if (!carregandoOrganizacao && !formulario) return <Navigate to="/backstage/publico/formularios" replace />;

    const cabecalho = (
        <CabecalhoDaPagina
            voltar={{ rotulo: "Formulário de participação", onClick: () => navigate("/backstage/publico/formularios") }}
            titulo={formulario ? formulario.titulo : <span aria-hidden="true" className="block h-9 w-64 max-w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />}
            acoes={
                formulario && (
                    <Button size="md" color="secondary" iconLeading={Settings01} onClick={() => setIsConfigModalOpen(true)}>
                        Configurar formulário
                    </Button>
                )
            }
        />
    );

    // Carregando (organização ou pedidos): o cabeçalho já aparece; lista e detalhe pulsam no formato final, sem espera fixa (BKS-116, PUB-102).
    if (!formulario || !prontas) {
        return (
            <BackstageLayout showEventContext={false} showLayoutSwitcher={false} activeProducer="publico">
                <div className="flex min-w-0 flex-1 flex-col gap-6 md:h-[calc(100dvh-4.5rem)]">
                    {cabecalho}
                    <EsqueletoDosPedidos />
                </div>
            </BackstageLayout>
        );
    }

    return (
        <BackstageLayout showEventContext={false} showLayoutSwitcher={false} activeProducer="publico">
            <div className="flex min-w-0 flex-1 flex-col gap-6 md:h-[calc(100dvh-4.5rem)]">
            {/* Cabeçalho da página: voltar para a lista de formulários, título = evento do formulário. */}
            {cabecalho}
            {/* Desktop: lista e detalhe rolam cada um no seu lugar. Celular: sem altura fixa, rolam com a página (PUB-101);
                overflow-clip (e não hidden) para o rodapé de decisão poder grudar no pé da tela. */}
            <div ref={cartaoRef} className="flex min-w-0 scroll-mt-4 overflow-clip rounded-xl ring-1 ring-border-secondary md:min-h-0 md:flex-1 md:overflow-hidden">
                {/* Lista */}
                <aside className={cx("flex w-full shrink-0 flex-col border-secondary bg-primary md:h-full md:max-w-[420px] md:border-r", detalheNoCelular && "max-md:hidden")}>
                    <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as StatusSolicitacao)} className="md:min-h-0 md:flex-1">
                        <div className="flex flex-col gap-6 border-b border-secondary px-6 pt-6">
                            <Input
                                size="md"
                                icon={SearchLg}
                                aria-label="Buscar pedidos"
                                placeholder="Buscar por nome ou e-mail"
                                value={busca}
                                onChange={setBusca}
                            />
                            {/* Abas do DS: role tab, aria-selected, setas para navegar e foco visível (PUB-41). */}
                            <Tabs.List type="underline" size="sm" fullWidth aria-label="Status dos pedidos">
                                {TABS.map((t) => {
                                    const count = contagem[t.id];
                                    return (
                                        <Tabs.Item key={t.id} id={t.id} className="flex-1">
                                            {t.label}
                                            {count > 0 && (
                                                <Badge size="sm" type="pill-color" color={t.id === "pendente" ? STATUS_META[t.id].color : "gray"} className="-my-px">
                                                    {count > 999 ? "999+" : count}
                                                </Badge>
                                            )}
                                        </Tabs.Item>
                                    );
                                })}
                            </Tabs.List>
                        </div>

                        <Tabs.Panel id={tab} className="flex flex-col md:min-h-0 md:flex-1">
                            <div
                                className={cx("scroll-suave p-4 md:min-h-0 md:flex-1 md:overflow-y-auto", listaScroll.scrolling && "is-scrolling")}
                                onScroll={listaScroll.onScroll}
                            >
                                {/* Sem resultado e aba vazia: a peça comum, anunciada pelo leitor de tela (BKS-118, BKS-126, PUB-112). */}
                                {lista.length === 0 ? (
                                    query ? (
                                        <SemResultados texto="Nenhum pedido encontrado para essa busca." onLimpar={() => setBusca("")} />
                                    ) : (
                                        <SemResultados texto={MENSAGEM_LISTA_VAZIA[tab]} />
                                    )
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {lista.map((s) => {
                                            const ativo = s.id === selecionadaId;
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => selecionar(s.id)}
                                                    aria-current={ativo ? "true" : undefined}
                                                    className={cx(
                                                        "flex w-full items-start justify-between gap-3 px-4 py-4 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2",
                                                        ativo
                                                            ? "rounded-xl bg-secondary"
                                                            : "border-b border-secondary hover:rounded-xl hover:border-transparent hover:bg-secondary/40",
                                                    )}
                                                >
                                                    <div className="flex min-w-px flex-1 flex-col gap-1">
                                                        <span className="truncate text-md font-bold text-primary">{s.nome}</span>
                                                        <span className="truncate text-sm text-tertiary">{s.email}</span>
                                                    </div>
                                                    <span className="shrink-0 text-sm font-medium text-tertiary">{formatarData(s.data)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Tabs.Panel>
                    </Tabs>
                </aside>

                {/* Detalhe */}
                <section className={cx("relative flex min-w-px flex-1 flex-col overflow-clip bg-secondary md:h-full md:overflow-hidden", !detalheNoCelular && "max-md:hidden")}>
                    {/* Celular: volta para a lista de pedidos. */}
                    <div className="relative z-10 border-b border-secondary bg-primary px-4 py-2 md:hidden">
                        <Button color="tertiary" size="md" iconLeading={ArrowLeft} onClick={() => setDetalheNoCelular(false)} className="-ml-3">
                            Pedidos
                        </Button>
                    </div>
                    {/* Grafismo de fundo (decorativo) */}
                    <img
                        src={grafismo}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[1238px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
                    />
                    {!selecionada ? (
                        <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
                            <p className="text-sm text-tertiary">
                                {solicitacoes.length === 0 ? "Este formulário ainda não recebeu pedidos." : "Selecione um pedido."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Conteúdo rolável */}
                            <div
                                className={cx("scroll-suave relative z-10 md:min-h-0 md:flex-1 md:overflow-y-auto", detalheScroll.scrolling && "is-scrolling")}
                                onScroll={detalheScroll.onScroll}
                            >
                                <div className="w-full px-4 md:px-6">
                                    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 py-6">
                                        {/* Cabeçalho */}
                                        <div className="flex flex-col rounded-xl bg-primary ring-1 ring-secondary">
                                            <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                <div className="flex min-w-px flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="truncate text-lg font-semibold text-primary">
                                                            {selecionada.nome}
                                                        </h2>
                                                        <BadgeWithDot
                                                            size="md"
                                                            type="pill-color"
                                                            color={STATUS_META[selecionada.status].color}
                                                        >
                                                            {STATUS_META[selecionada.status].label}
                                                        </BadgeWithDot>
                                                    </div>
                                                    <span className="truncate text-sm text-tertiary">{selecionada.email}</span>
                                                </div>
                                                <span className="shrink-0 text-sm text-tertiary">
                                                    {rotuloDecisao(selecionada.status)} {quandoDaDecisao(selecionada)}
                                                </span>
                                            </div>
                                            {selecionada.status === "aprovada" && selecionada.segmento && (
                                                <div className="rounded-b-xl border-t border-secondary bg-secondary_subtle px-5 py-4">
                                                    <span className="text-md text-primary">
                                                        Adicionado em: {selecionada.segmento}
                                                    </span>
                                                </div>
                                            )}
                                            {selecionada.status === "rejeitada" && selecionada.justificativa && (
                                                <div className="rounded-b-xl border-t border-secondary bg-secondary_subtle px-5 py-4">
                                                    <span className="text-md text-primary">
                                                        Justificativa: {selecionada.justificativa}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Informações do participante */}
                                        <div className="flex flex-col rounded-xl bg-primary ring-1 ring-secondary">
                                            <div className="border-b border-secondary p-5">
                                                <h3 className="text-md font-semibold text-primary">Informações do participante</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
                                                <Campo label="Nome" valor={selecionada.nome} />
                                                <Campo label="CPF ou passaporte" valor={selecionada.documento} />
                                                <Campo label="E-mail" valor={selecionada.email} />
                                                <Campo label="Data de nascimento" valor={selecionada.nascimento} />
                                                <Campo label="Telefone" valor={selecionada.telefone} />
                                                <Campo label="Data do laudo" valor={selecionada.dataLaudo} />
                                            </div>
                                        </div>

                                        {/* Anexos */}
                                        <div className="flex flex-col rounded-xl bg-primary ring-1 ring-secondary">
                                            {/* O prazo de exclusão dos anexos saiu: não existe exclusão no protótipo (PUB-54 riscada). */}
                                            <div className="border-b border-secondary p-5">
                                                <h3 className="text-md font-semibold text-primary">Anexos ({selecionada.anexos.length})</h3>
                                            </div>
                                            <div className="flex flex-col">
                                                {selecionada.anexos.map((a, i) => (
                                                    <div
                                                        key={a.nome}
                                                        className={cx("flex flex-col gap-3 px-5 py-6", i > 0 && "border-t border-secondary")}
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <h4 className="text-md font-semibold text-primary">{a.nome}</h4>
                                                            <ButtonUtility
                                                                color="secondary"
                                                                size="xs"
                                                                icon={Expand01}
                                                                tooltip="Expandir"
                                                                aria-label={`Expandir ${a.nome}`}
                                                                onClick={() => setVisualizando(a)}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            aria-label={`Abrir ${a.nome} em tela cheia`}
                                                            onClick={() => setVisualizando(a)}
                                                            className="block overflow-hidden rounded-xl text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                                                        >
                                                            {a.tipo === "identificacao" ? (
                                                                <img
                                                                    src={documentoImg}
                                                                    alt={a.nome}
                                                                    className="h-[420px] w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full bg-white">
                                                                    <LaudoView />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rodapé */}
                            <div
                                className={cx(
                                    // Celular: gruda no pé da tela enquanto o pedido rola com a página (PUB-101).
                                    "relative z-10 flex shrink-0 items-center gap-4 border-t border-secondary bg-primary px-4 py-4 max-md:sticky max-md:bottom-0 md:px-6",
                                    selecionada.status === "pendente" ? "justify-end" : "justify-center",
                                )}
                            >
                                {selecionada.status === "pendente" ? (
                                    <div className="flex shrink-0 items-center gap-3">
                                        <Button color="secondary" size="md" iconLeading={XCircle} onClick={() => setDecisao("rejeitar")}>
                                            Reprovar
                                        </Button>
                                        <Button color="primary" size="md" iconLeading={CheckCircle} onClick={() => setDecisao("aprovar")}>
                                            Aprovar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-center">
                                        <span className="text-md font-semibold text-primary">
                                            {selecionada.status === "aprovada" ? "Aprovado por" : "Reprovado por"} {USUARIO_ATUAL_EMAIL}
                                        </span>
                                        <span className="text-sm text-tertiary">{quandoDaDecisao(selecionada)}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
            </div>

            <DecisaoModal
                isOpen={decisao !== null}
                variant={decisao ?? "aprovar"}
                pessoa={selecionada ? { nome: selecionada.nome, documento: selecionada.documento } : undefined}
                onClose={() => setDecisao(null)}
                onConfirmar={confirmarDecisao}
            />
            <AnexoViewerModal anexo={visualizando} onClose={() => setVisualizando(null)} />

            {formulario && (
                <FormularioParticipacaoModal
                    isOpen={isConfigModalOpen}
                    onClose={() => setIsConfigModalOpen(false)}
                    onSalvar={handleSalvarConfiguracao}
                    ativoInicial={formulario.ativo}
                    limiteInicial={formulario.limite}
                    quantidadeInicial={formulario.quantidadeLimite}
                    solicitacoesRecebidas={formulario.solicitacoesRecebidas}
                    evento={formulario.titulo}
                />
            )}
        </BackstageLayout>
    );
}

/** Carregando: linhas da lista e cartões do detalhe pulsando no formato final (BKS-116, PUB-102). */
function EsqueletoDosPedidos() {
    const bloco = "animate-pulse rounded-lg bg-secondary motion-reduce:animate-none";
    return (
        <div role="status" aria-label="Carregando pedidos" className="flex min-w-0 overflow-clip rounded-xl ring-1 ring-border-secondary md:min-h-0 md:flex-1">
            <div aria-hidden="true" className="flex w-full shrink-0 flex-col bg-primary md:max-w-[420px] md:border-r md:border-secondary">
                <div className="flex flex-col gap-6 border-b border-secondary px-6 pt-6 pb-3">
                    <span className={cx(bloco, "h-11 w-full")} />
                    <span className={cx(bloco, "h-6 w-full")} />
                </div>
                <div className="flex flex-col gap-1 p-4">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 border-b border-secondary px-4 py-4">
                            <div className="flex flex-1 flex-col gap-2">
                                <span className={cx(bloco, "h-5 w-2/3")} />
                                <span className={cx(bloco, "h-4 w-1/2")} />
                            </div>
                            <span className={cx(bloco, "h-4 w-20")} />
                        </div>
                    ))}
                </div>
            </div>
            <div aria-hidden="true" className="hidden min-w-px flex-1 bg-secondary px-6 md:block">
                <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 py-6">
                    <div className="flex flex-col gap-2 rounded-xl bg-primary p-5 ring-1 ring-secondary">
                        <span className={cx(bloco, "h-6 w-1/2")} />
                        <span className={cx(bloco, "h-4 w-1/3")} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl bg-primary p-5 ring-1 ring-secondary">
                        {Array.from({ length: 6 }, (_, i) => (
                            <span key={i} className={cx(bloco, "h-10")} />
                        ))}
                    </div>
                    <span className="h-64 rounded-xl bg-primary ring-1 ring-secondary" />
                </div>
            </div>
        </div>
    );
}

/** Campo de leitura (label + valor). */
function Campo({ label, valor }: { label: string; valor: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-sm text-tertiary">{label}</span>
            <span className="text-md text-primary">{valor}</span>
        </div>
    );
}
