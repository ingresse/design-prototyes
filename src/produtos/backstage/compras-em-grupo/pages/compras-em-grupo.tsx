import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Check, ChevronDown, Copy01, Download01, Edit01, Plus, ShoppingCart01, XClose, Users01 } from "@untitledui/icons";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Surgir } from "@/components/foundations/transicao";
import type { ComprasEmGrupo, Evento, SolicitacaoDeGrupo } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { dataEHora } from "../../components/formatar-data";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { useCatalogo } from "../../itens/data/catalogo";
import { useTextosItens } from "../../itens/data/textos-itens";
import { Assistente } from "../components/assistente";
import { ModalDeDecisao } from "../components/modal-de-decisao";
import { estadoDoModulo, linkDoFormulario, metricas, novoModulo, prazoDaCota, ROTULO_DO_ESTADO, salvarCompras, solicitacoesDeExemplo } from "../data/compras-em-grupo";

/*
 * Compras em grupo (compras-em-grupo/rules.md): o gêmeo do módulo `group-registration` de produção.
 * Uma tela por vez: sem catálogo, módulo por habilitar, assistente, formulário sem pedidos e a fila.
 */

const T = {
    titulo: "Compras em grupo",
    // O título é sempre o do menu (BKS-100); "Grupos e assessorias", título de produção nesta tela, virou subtítulo.
    subtituloFila: "Grupos e assessorias que pediram vagas pelo formulário.",
    subtitulo: "Receba pedidos de grupos e assessorias e aprove as vagas.",
    semCatalogoTitulo: "Antes de vender para grupos, você precisa criar seu catálogo",
    semCatalogoTexto: "Crie ingressos em Ingressos e produtos.",
    criarItens: "Criar itens para venda",
    habilitarTitulo: "Habilite o módulo de compras em grupo",
    habilitarTexto: "Crie um formulário para receber solicitações de compras em grupo, defina o que poderá ser comprado e por quanto tempo estará disponível.",
    habilitar: "Habilitar compras em grupo",
    comoFunciona: "Como funciona?",
    passosTitulo: "3 etapas para receber pedidos de criação de grupos de compra",
    passos: [
        ["Defina o período de recebimento", "Informe o período de disponibilidade do formulário de pedidos e a quantidade de participantes por grupo de compra."],
        ["Escolha o que será comprado", "Você decide o que poderá ser comprado por quem solicita uma compra em grupo."],
        ["Revise e pronto!", "Revise e finalize a configuração do formulário de pedidos, divulgue seu link e receba pedidos de compra em grupo."],
    ],
    vamos: "Vamos começar!",
    aguardandoTitulo: "Você já tem seu formulário, mas ainda não recebeu solicitações",
    tudoCerto: "Tudo certo com seu formulário!",
    oQueFazer: "O que você quer fazer agora?",
    desabilitar: "Desabilitar novas solicitações",
    reabilitar: "Habilitar novas solicitações",
    compartilhar: "Compartilhar",
    url: "URL:",
    copiarLink: "Copiar link",
    copiarLinkFormulario: "Copiar link do formulário",
    copiado: "Link copiado!",
    simular: "Simular pedidos de exemplo",
    simularDica: "Ferramenta do protótipo: cria pedidos fictícios para ver a fila.",
    editarFormulario: "Editar formulário",
    editarPeriodo: "Editar período e limites",
    editarItens: "Editar itens do formulário",
    desabilitarTitulo: "Desabilitar novas solicitações?",
    desabilitarTexto: "O formulário para de receber pedidos. Você pode habilitar de novo a qualquer momento.",
    desabilitarConfirmar: "Desabilitar",
    desabilitarCancelar: "Voltar",
    desabilitado: "Formulário desabilitado.",
    habilitado: "Formulário habilitado.",
    resumo: "Resumo das vagas do evento",
    mSolicitadas: "Vagas solicitadas",
    mAprovadas: "Total de vagas aprovadas",
    mAprovadasPct: "{p}% aprovadas",
    mPagas: "Pagas",
    mAPagar: "A pagar",
    mIniciadas: "Iniciadas",
    solicitacoes: "Solicitações",
    pendentesDe: "{n} inscrições pendentes de aprovação em {t} solicitações pendentes",
    nenhumaPendente: "Nenhuma solicitação pendente.",
    exportar: "Exportar",
    filtro: "Filtrar solicitações por status",
    filtros: { todas: "Todas", pendente: "Pendentes", aprovada: "Aprovadas", reprovada: "Reprovadas" },
    buscar: "Buscar por responsável ou grupo",
    colStatus: "Status",
    colGrupo: "Grupo",
    colResponsavel: "Responsável",
    colSolicitadas: "Solicitadas",
    colAprovadas: "Aprovadas",
    colPagas: "Pagas",
    expiraEm: "Expira em: {d}",
    expirouEm: "Expirou em: {d}",
    semEmail: "Sem e-mail cadastrado",
    reprovar: "Reprovar",
    aprovar: "Aprovar",
    revisar: "Revisar",
    reaprovar: "Aprovar",
    reprovarSol: "Reprovar a solicitação de {g}",
    aprovarSol: "Aprovar a solicitação de {g}",
    revisarSol: "Revisar a solicitação de {g}",
    reaprovarSol: "Aprovar a solicitação reprovada de {g}",
    selecionarPendentes: "Selecionar as pendentes da página",
    selecionar: "Selecionar a solicitação de {g}",
    lote: "Ações para as solicitações selecionadas",
    selecionadas: { one: "{n} solicitação selecionada", other: "{n} solicitações selecionadas" },
    aprovarSelecionadas: "Aprovar selecionadas",
    limpar: "Limpar seleção",
    loteTitulo: { one: "Aprovar {n} solicitação?", other: "Aprovar {n} solicitações?" },
    loteTexto: { one: "Aprova com as vagas pedidas: {v} no total. O prazo de compra segue a regra do formulário.", other: "Aprova cada uma com as vagas pedidas: {v} no total. O prazo de compra segue a regra do formulário." },
    loteFeito: { one: "{n} solicitação aprovada.", other: "{n} solicitações aprovadas." },
    loteErro: "Não foi possível aprovar as solicitações.",
    semResultados: "Nenhuma solicitação encontrada para essa busca ou filtro.",
    status: { pendente: "Pendente", aprovada: "Aprovada", reprovada: "Reprovada" },
};

const f = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function ComprasEmGrupoPagina() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="compras-em-grupo" activeItem="compras-em-grupo">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {/* Carregando: o cabeçalho já aparece e as linhas pulsam no lugar do conteúdo (BKS-116). */}
                {carregando || !evento ? (
                    <>
                        <CabecalhoDaPagina titulo={T.titulo} />
                        <CarregandoTabela rotulo="Carregando compras em grupo..." />
                    </>
                ) : (
                    <Modulo key={evento.id} evento={evento} />
                )}
            </div>
        </BackstageLayout>
    );
}

function Modulo({ evento }: { evento: Evento }) {
    const modulo = evento.comprasEmGrupo;
    // O assistente e o passo ficam no endereço (`?passo=N`, `&editando=1`): o Voltar do navegador volta um passo (CEG-74).
    const [params, setParams] = useSearchParams();
    const passo = params.get("passo");
    const assistente = passo != null ? { passo: Math.min(2, Math.max(0, Number(passo) || 0)), editando: params.has("editando") } : null;
    const setAssistente = (a: { passo: number; editando: boolean } | null) => setParams(a ? { passo: String(a.passo), ...(a.editando ? { editando: "1" } : {}) } : {});
    const [intro, setIntro] = useState(false);
    const temCatalogo = evento.sessoes.some((s) => s.grupos.some((g) => g.ingressos.length > 0));

    if (assistente)
        return (
            <Assistente
                evento={evento}
                modulo={modulo ?? novoModulo()}
                passo={assistente.passo}
                onPasso={(p) => setAssistente({ passo: p, editando: assistente.editando })}
                editando={assistente.editando}
                onSair={() => setAssistente(null)}
            />
        );

    if (!temCatalogo)
        return (
            <>
                <CabecalhoDaPagina titulo={T.titulo} subtitulo={T.subtitulo} />
                <Vazio icone={ShoppingCart01} titulo={T.semCatalogoTitulo} texto={T.semCatalogoTexto} acao={<Button color="primary" size="md" href="/backstage/catalogo/ingressos">{T.criarItens}</Button>} />
            </>
        );

    if (!modulo?.publicado)
        return (
            <>
                <CabecalhoDaPagina titulo={T.titulo} subtitulo={T.subtitulo} />
                {intro ? (
                    <section className="flex max-w-3xl flex-col gap-6 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
                        <h2 className="text-lg font-semibold text-primary">{T.passosTitulo}</h2>
                        <ol className="flex flex-col gap-4">
                            {T.passos.map(([t, d], i) => (
                                <li key={t} className="flex gap-4">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-sm font-semibold text-brand-secondary">{i + 1}</span>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-md font-semibold text-primary">{t}</span>
                                        <span className="text-sm text-tertiary">{d}</span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <div>
                            <Button color="primary" size="md" onClick={() => setAssistente({ passo: 0, editando: false })}>
                                {T.vamos}
                            </Button>
                        </div>
                    </section>
                ) : (
                    <Vazio
                        icone={Users01}
                        titulo={T.habilitarTitulo}
                        texto={T.habilitarTexto}
                        acao={
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button color="secondary" size="md" onClick={() => setIntro(true)}>
                                    {T.comoFunciona}
                                </Button>
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => setAssistente({ passo: 0, editando: false })}>
                                    {T.habilitar}
                                </Button>
                            </div>
                        }
                    />
                )}
            </>
        );

    return <Formulario evento={evento} modulo={modulo} onEditar={(passo) => setAssistente({ passo, editando: true })} />;
}

// Estados vazios do módulo: o vazio do DS com a ação principal (BKS-117).
const Vazio = VazioDaTabela;

function Formulario({ evento, modulo, onEditar }: { evento: Evento; modulo: ComprasEmGrupo; onEditar: (passo: number) => void }) {
    const { numero, plural } = useTextosItens();
    const estado = estadoDoModulo(modulo);
    const rotulo = ROTULO_DO_ESTADO[estado];
    const [copiado, setCopiado] = useState(false);
    const [desabilitando, setDesabilitando] = useState(false);
    const [filtro, setFiltro] = useState<"todas" | SolicitacaoDeGrupo["status"]>("todas");
    const [busca, setBusca] = useState("");
    const [decisao, setDecisao] = useState<{ tipo: "aprovar" | "reprovar"; solicitacao: SolicitacaoDeGrupo } | null>(null);
    const [selecao, setSelecao] = useState<Set<string>>(new Set());
    const [aprovandoLote, setAprovandoLote] = useState(false);
    const [gravandoLote, setGravandoLote] = useState(false);
    const link = linkDoFormulario(evento);
    const lista = modulo.solicitacoes;
    const m = metricas(lista);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            /* área de transferência bloqueada: o link continua visível */
        }
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const alternarRecebimento = async (ligar: boolean) => {
        await salvarCompras(evento, { ...modulo, habilitado: ligar });
        toast.success(ligar ? T.habilitado : T.desabilitado);
        setDesabilitando(false);
    };

    const botaoRecebimento = modulo.habilitado ? (
        <Button color="secondary" size="md" onClick={() => setDesabilitando(true)}>
            {T.desabilitar}
        </Button>
    ) : (
        <Button color="secondary" size="md" onClick={() => void alternarRecebimento(true)}>
            {T.reabilitar}
        </Button>
    );

    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const filtradas = useMemo(() => lista.filter((s) => (filtro === "todas" || s.status === filtro) && (!termo || s.grupo.toLocaleLowerCase("pt-BR").includes(termo) || s.responsavel.toLocaleLowerCase("pt-BR").includes(termo))), [lista, filtro, termo]);
    const paginacao = usePaginacao(filtradas, [filtro, termo]);
    const limpar = () => (setBusca(""), setFiltro("todas"));
    const contar = (st: SolicitacaoDeGrupo["status"]) => lista.filter((s) => s.status === st).length;
    const pendentesDaPagina = paginacao.visiveis.filter((s) => s.status === "pendente");
    // Só pendentes ficam selecionadas: decidir uma tira da seleção.
    const selecionadas = lista.filter((s) => s.status === "pendente" && selecao.has(s.id));
    const alternar = (id: string, on: boolean) =>
        setSelecao((a) => {
            const p = new Set(a);
            if (on) p.add(id);
            else p.delete(id);
            return p;
        });

    const aprovarLote = async () => {
        const agora = new Date();
        const ids = new Set(selecionadas.map((s) => s.id));
        setGravandoLote(true);
        try {
            await salvarCompras(evento, {
                ...modulo,
                solicitacoes: modulo.solicitacoes.map((s) =>
                    ids.has(s.id) ? { ...s, status: "aprovada" as const, aprovadas: s.solicitadas, motivo: undefined, decididaEm: agora.toISOString().slice(0, 16), validaAte: prazoDaCota(modulo, agora) } : s,
                ),
            });
            toast.success(plural(T.loteFeito, ids.size));
            setSelecao(new Set());
            setAprovandoLote(false);
        } catch {
            toast.error(T.loteErro);
        } finally {
            setGravandoLote(false);
        }
    };

    const exportar = () => {
        const linhas = [["Status", "Grupo", "Responsável", "E-mail", "Solicitadas", "Aprovadas", "Pagas"], ...filtradas.map((s) => [T.status[s.status], s.grupo, s.responsavel, s.email ?? "", s.solicitadas, s.aprovadas ?? "", s.pagas])];
        const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `solicitacoes-${evento.slug}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const badge = (
        <BadgeWithDot type="pill-color" color={rotulo.cor} size="md">
            {rotulo.rotulo}
        </BadgeWithDot>
    );

    const modais = (
        <>
            <ModalDeConfirmacao aberto={desabilitando} titulo={T.desabilitarTitulo} descricao={T.desabilitarTexto} confirmar={T.desabilitarConfirmar} cancelar={T.desabilitarCancelar} onConfirmar={() => void alternarRecebimento(false)} onFechar={() => setDesabilitando(false)} />
            <ModalDeConfirmacao
                aberto={aprovandoLote}
                titulo={plural(T.loteTitulo, selecionadas.length)}
                descricao={plural(T.loteTexto, selecionadas.length, { v: numero(selecionadas.reduce((n, s) => n + s.solicitadas, 0)) })}
                confirmar={T.aprovarSelecionadas}
                carregando={gravandoLote}
                onConfirmar={() => void aprovarLote()}
                onFechar={() => setAprovandoLote(false)}
            />
            {decisao && <ModalDeDecisao key={decisao.solicitacao.id + decisao.tipo} evento={evento} modulo={modulo} decisao={decisao} onFechar={() => setDecisao(null)} />}
        </>
    );

    // Formulário publicado, sem pedidos: a página "aguardando" é a confirmação da publicação (CEG-20).
    if (lista.length === 0)
        return (
            <>
                <CabecalhoDaPagina titulo={T.titulo} subtitulo={T.subtitulo} />
                <section className="flex max-w-3xl flex-col gap-6 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
                    <h2 className="text-lg font-semibold text-primary">{T.aguardandoTitulo}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        {badge}
                        <span className="text-sm text-secondary">{T.tudoCerto}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-secondary">{T.oQueFazer}</span>
                        <div className="flex flex-wrap gap-3">
                            {botaoRecebimento}
                            <Dropdown.Root>
                                <Button color="secondary" size="md" iconTrailing={ChevronDown}>
                                    {T.editarFormulario}
                                </Button>
                                <Dropdown.Popover placement="bottom start" className="w-60">
                                    <Dropdown.Menu aria-label={T.editarFormulario} onAction={(k) => onEditar(k === "itens" ? 1 : 0)}>
                                        <Dropdown.Item id="periodo" label={T.editarPeriodo} />
                                        <Dropdown.Item id="itens" label={T.editarItens} />
                                    </Dropdown.Menu>
                                </Dropdown.Popover>
                            </Dropdown.Root>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-secondary_subtle p-4 ring-1 ring-secondary">
                        <span className="text-sm font-semibold text-primary">{T.compartilhar}</span>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span className="min-w-0 flex-1 truncate text-sm text-secondary">
                                {T.url} {link}
                            </span>
                            <Button color="secondary" size="sm" iconLeading={copiado ? Check : Copy01} onClick={() => void copiar()}>
                                {copiado ? T.copiado : T.copiarLink}
                            </Button>
                        </div>
                    </div>
                    {/* Ferramenta de protótipo: em produção os pedidos chegam pelo formulário público. */}
                    <div className="flex flex-col items-start gap-1 border-t border-dashed border-secondary pt-4">
                        <Button color="link-gray" size="sm" onClick={() => void salvarCompras(evento, { ...modulo, solicitacoes: solicitacoesDeExemplo(modulo) })}>
                            {T.simular}
                        </Button>
                        <span className="text-sm text-tertiary">{T.simularDica}</span>
                    </div>
                </section>
                {modais}
            </>
        );

    const metricasCards: [string, number, string?][] = [
        [T.mSolicitadas, m.solicitadas],
        [T.mAprovadas, m.aprovadas, m.solicitadas ? f(T.mAprovadasPct, { p: Math.round((m.aprovadas / m.solicitadas) * 100) }) : undefined],
        [T.mPagas, m.pagas],
        [T.mAPagar, m.aPagar],
        [T.mIniciadas, m.iniciadas],
    ];

    return (
        <>
            {/* Selo ao lado do título e as ações do formulário no cabeçalho, em md (BKS-102, BKS-104, CEG-72). */}
            <CabecalhoDaPagina
                titulo={T.titulo}
                subtitulo={T.subtituloFila}
                selo={badge}
                acoes={
                    <>
                        <Button color="secondary" size="md" iconLeading={copiado ? Check : Copy01} onClick={() => void copiar()}>
                            {copiado ? T.copiado : T.copiarLinkFormulario}
                        </Button>
                        <Dropdown.Root>
                            <Button color="secondary" size="md" iconLeading={Edit01} iconTrailing={ChevronDown}>
                                {T.editarFormulario}
                            </Button>
                            <Dropdown.Popover placement="bottom start" className="w-60">
                                <Dropdown.Menu aria-label={T.editarFormulario} onAction={(k) => onEditar(k === "itens" ? 1 : 0)}>
                                    <Dropdown.Item id="periodo" label={T.editarPeriodo} />
                                    <Dropdown.Item id="itens" label={T.editarItens} />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                        {botaoRecebimento}
                    </>
                }
            />

            <ul aria-label={T.resumo} className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {metricasCards.map(([rot, v, extra]) => (
                    <li key={rot} className="flex flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary">
                        <span className="text-sm text-tertiary">{rot}</span>
                        <span className="text-display-xs font-semibold text-primary tabular-nums">{numero(v)}</span>
                        {extra && <span className="text-sm text-success-primary">{extra}</span>}
                    </li>
                ))}
            </ul>

            <section aria-labelledby="titulo-solicitacoes" className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col">
                        <h2 id="titulo-solicitacoes" className="text-lg font-semibold text-primary">
                            {T.solicitacoes}
                        </h2>
                        <span className="text-sm text-tertiary">{m.pendentes.length ? f(T.pendentesDe, { n: numero(m.pendentes.reduce((n, s) => n + s.solicitadas, 0)), t: numero(m.pendentes.length) }) : T.nenhumaPendente}</span>
                    </div>
                    <Button color="secondary" size="sm" iconLeading={Download01} onClick={exportar}>
                        {T.exportar}
                    </Button>
                </div>
                {/* Busca à esquerda e status à direita, em botões segmentados (BKS-111); a contagem aparece onde cabe. */}
                <BarraDaLista
                    busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }}
                    filtro={
                        <ButtonGroup size="sm" aria-label={T.filtro} selectedKeys={new Set([filtro])} onSelectionChange={(k) => setFiltro(([...k][0] as typeof filtro) ?? "todas")} disallowEmptySelection>
                            {(["todas", "pendente", "aprovada", "reprovada"] as const).map((id) => (
                                <ButtonGroupItem key={id} id={id}>
                                    {T.filtros[id]}
                                    <span className="hidden xl:inline">{` (${numero(id === "todas" ? lista.length : contar(id))})`}</span>
                                </ButtonGroupItem>
                            ))}
                        </ButtonGroup>
                    }
                />
                <CartaoDaTabela>
                    {/* Aprovação em lote (CEG-78): marcar pendentes e "Aprovar selecionadas", com as vagas pedidas. */}
                    <Surgir visivel={selecionadas.length > 0}>
                        <div role="toolbar" aria-label={T.lote} className="flex flex-wrap items-center gap-2 border-b border-secondary bg-secondary_subtle px-5 py-3 md:px-6">
                            <span className="mr-auto text-sm font-semibold text-primary">{plural(T.selecionadas, selecionadas.length)}</span>
                            <Button color="primary" size="sm" onClick={() => setAprovandoLote(true)}>
                                {T.aprovarSelecionadas}
                            </Button>
                            <ButtonUtility icon={XClose} color="tertiary" size="sm" tooltip={T.limpar} onClick={() => setSelecao(new Set())} />
                        </div>
                    </Surgir>
                    <CabecalhoDaTabela ordenavel className="flex">
                        <Checkbox
                            size="sm"
                            aria-label={T.selecionarPendentes}
                            isDisabled={pendentesDaPagina.length === 0}
                            isSelected={pendentesDaPagina.length > 0 && pendentesDaPagina.every((s) => selecao.has(s.id))}
                            isIndeterminate={pendentesDaPagina.some((s) => selecao.has(s.id)) && !pendentesDaPagina.every((s) => selecao.has(s.id))}
                            onChange={(on) =>
                                setSelecao((a) => {
                                    const p = new Set(a);
                                    pendentesDaPagina.forEach((s) => (on ? p.add(s.id) : p.delete(s.id)));
                                    return p;
                                })
                            }
                        />
                        <span aria-hidden="true" className="min-w-0 flex-1">
                            <span className="@min-[44rem]:hidden">{T.selecionarPendentes}</span>
                            <span className="hidden @min-[44rem]:inline">{T.colGrupo}</span>
                        </span>
                        <span aria-hidden="true" className="hidden w-24 @min-[44rem]:block">{T.colStatus}</span>
                        <span aria-hidden="true" className="hidden w-36 @min-[44rem]:block">{T.colResponsavel}</span>
                        <span aria-hidden="true" className="hidden w-20 text-right @min-[44rem]:block">{T.colSolicitadas}</span>
                        <span aria-hidden="true" className="hidden w-20 text-right @min-[44rem]:block">{T.colAprovadas}</span>
                        <span aria-hidden="true" className="hidden w-14 text-right @min-[44rem]:block">{T.colPagas}</span>
                        <span aria-hidden="true" className="hidden w-44 @min-[44rem]:block" />
                    </CabecalhoDaTabela>
                    {filtradas.length === 0 ? (
                        <SemResultados texto={T.semResultados} onLimpar={limpar} />
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {paginacao.visiveis.map((s) => {
                                const expirou = s.validaAte && s.validaAte < new Date().toISOString().slice(0, 16);
                                return (
                                    <LinhaDaTabela key={s.id} selecionada={selecao.has(s.id)} className="flex-wrap @min-[44rem]:flex-nowrap">
                                        {s.status === "pendente" ? (
                                            <Checkbox size="sm" aria-label={f(T.selecionar, { g: s.grupo })} isSelected={selecao.has(s.id)} onChange={(on) => alternar(s.id, on)} className="mt-0.5 @min-[44rem]:mt-0" />
                                        ) : (
                                            <span aria-hidden="true" className="w-4 shrink-0" />
                                        )}
                                        <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                                            <TituloDaLinha
                                                titulo={s.grupo}
                                                apoio={
                                                    s.status === "aprovada" && s.validaAte ? (
                                                        <span className={expirou ? "text-warning-primary" : undefined}>{f(expirou ? T.expirouEm : T.expiraEm, { d: dataEHora(s.validaAte) })}</span>
                                                    ) : undefined
                                                }
                                            />
                                            <div className="@min-[44rem]:w-24">
                                                <BadgeWithDot type="pill-color" size="sm" color={s.status === "aprovada" ? "success" : s.status === "reprovada" ? "error" : "warning"}>
                                                    {T.status[s.status]}
                                                </BadgeWithDot>
                                            </div>
                                            <Celula rotulo={T.colResponsavel} className="min-w-0 @min-[44rem]:w-36">
                                                <span className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate">{s.responsavel}</span>
                                                    <span className="truncate text-tertiary">{s.email ?? T.semEmail}</span>
                                                </span>
                                            </Celula>
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 @min-[44rem]:contents">
                                                <Celula rotulo={T.colSolicitadas} numero className="@min-[44rem]:w-20">
                                                    {numero(s.solicitadas)}
                                                </Celula>
                                                <Celula rotulo={T.colAprovadas} numero className="@min-[44rem]:w-20">
                                                    {s.aprovadas != null ? numero(s.aprovadas) : "—"}
                                                </Celula>
                                                <Celula rotulo={T.colPagas} numero className="@min-[44rem]:w-14">
                                                    {s.status === "aprovada" ? numero(s.pagas) : "—"}
                                                </Celula>
                                            </div>
                                        </div>
                                        {/* Ações com texto, que funcionam no toque (CEG-77); a reprovada pode ser aprovada (CEG-79). */}
                                        <div className="flex shrink-0 basis-full flex-wrap gap-2 pl-8 @min-[44rem]:w-44 @min-[44rem]:basis-auto @min-[44rem]:justify-end @min-[44rem]:pl-0">
                                            {s.status === "pendente" ? (
                                                <>
                                                    <Button color="secondary" size="sm" aria-label={f(T.reprovarSol, { g: s.grupo })} onClick={() => setDecisao({ tipo: "reprovar", solicitacao: s })}>
                                                        {T.reprovar}
                                                    </Button>
                                                    <Button color="secondary" size="sm" aria-label={f(T.aprovarSol, { g: s.grupo })} onClick={() => setDecisao({ tipo: "aprovar", solicitacao: s })}>
                                                        {T.aprovar}
                                                    </Button>
                                                </>
                                            ) : s.status === "reprovada" ? (
                                                <Button color="secondary" size="sm" aria-label={f(T.reaprovarSol, { g: s.grupo })} onClick={() => setDecisao({ tipo: "aprovar", solicitacao: s })}>
                                                    {T.reaprovar}
                                                </Button>
                                            ) : (
                                                <Button color="secondary" size="sm" aria-label={f(T.revisarSol, { g: s.grupo })} onClick={() => setDecisao({ tipo: "aprovar", solicitacao: s })}>
                                                    {T.revisar}
                                                </Button>
                                            )}
                                        </div>
                                    </LinhaDaTabela>
                                );
                            })}
                        </ul>
                    )}
                    <RodapeDePaginacao {...paginacao} />
                </CartaoDaTabela>
            </section>
            {modais}
        </>
    );
}
