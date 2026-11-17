import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls, useReducedMotion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { Heading as AriaHeading } from "react-aria-components";
import { toast } from "sonner";
import { ChevronDown, Edit01, FaceId, Key01, LayersTwo01, Plus, QrCode01, SearchLg, Ticket01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import { DURACAO_TRANSICAO, Surgir } from "@/components/foundations/transicao";
import type { Evento, Grupo, Sessao, TipoIngresso } from "@/plataforma";
import { cx } from "@/utils/cx";
import { AlertaDoGuia, PARAMETRO_NOVO_SETOR } from "../../components/Backstage";
import { EstadoBadge, useResumoDasVendas } from "../components/comuns";
import { BotaoChaves, totalDeChaves } from "../components/VerChaves";
import { SeletorDeLista } from "../components/SeletorDeLista";
import { CHAVES_DE_EXEMPLO } from "../data/exemplos";
import { Alca, mover } from "../components/Alca";
import { AvisoDeEscala, BarraDeFiltros, BotaoMostrarMais, paraBusca, useMostrarMais } from "../components/escala";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import type { EstadoItem } from "../data/catalogo";
import {
    comIngresso,
    comSetor,
    estadoComAbertura,
    janelaDoIngresso,
    faixaDePreco,
    ofertaDoSetor,
    quantidadeDoIngresso,
    salvarSessoes,
    semSetor,
    setorNovo,
    useCatalogo,
    pendentesDoIngresso,
    vendidosDoIngresso,
    vendidosDoSetor,
    vendidosDoLote,
    pendentesDoLote,
} from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";

/* ------------------------------------------------------------------ */
/*  Ingressos (ITM-01 a ITM-19)                                        */
/*                                                                     */
/*  Setores como cartões (capacidade, acesso e a soma dos lotes        */
/*  conferida contra a capacidade); dentro de cada setor, os           */
/*  ingressos. A linha abre o ingresso, onde tudo se edita; o toggle   */
/*  da linha pausa ou volta a vender na hora.                          */
/* ------------------------------------------------------------------ */

const T = {
    titulo: "Ingressos",
    novoSetor: "Novo grupo",
    criarIngresso: "Criar ingresso",
    novoIngresso: "Novo ingresso",
    virada: "Virada de lote",
    viradaDoLote: "Ao atingir estoque",
    vincular: "Vincular",
    vincularNoLote: "Vincular Passkey no {lote}",
    vincularNoIngresso: "Vincular Passkey em {ingresso}",
    passkeysDoIngresso: "Passkeys de {ingresso}",
    passkeysDoIngressoDica: "Com Passkey vinculada ao ingresso, só quem tem uma delas compra qualquer lote dele. As Passkeys são criadas em Marketing › Passkey.",
    passkeysDoIngressoSalvas: "Passkeys de {ingresso} salvas.",
    passkeysDoLote: "Passkeys do {lote}",
    contagemPasskeys: { one: "{n} Passkey", other: "{n} Passkeys" },
    passkeysDica: "Com Passkey vinculada, só quem tem uma delas compra este lote. As Passkeys são criadas em Marketing › Passkey.",
    passkeysVazio: "Nenhuma Passkey neste evento. Crie em Marketing › Passkey.",
    passkeysSalvas: "Passkeys do {lote} salvas.",
    passkey: "Passkey",
    preco: "Preço",
    emissoesEEstoque: "Emissões e estoque",
    ate: "até {preco}",
    editarIngresso: "Editar {ingresso}",
    verLotes: "Ver lotes de {ingresso}",
    loteVender: "À venda, {lote}",
    loteLigado: "{lote} à venda.",
    loteTrocado: "{lote} à venda. {anterior} parou de vender.",
    lotePausado: "{lote} parou de vender.",
    viradaTipos: { individual: "Individual", "em-conjunto": "Em conjunto", manual: "Manual" },
    editarSetor: "Editar grupo {setor}",
    capacidade: "Capacidade de {n}",
    emissoes: "Emissões",
    emissoesDoSetor: "{emitidos} de {oferta}",
    vendidosCurto: "{vendidos} de {total}",
    setorCriado: "Grupo {setor} criado. Agora crie os ingressos dele.",
    setorRemovido: "Grupo {setor} removido.",
    acessoPortao: "Entrada: {acesso}",
    tipoAcessoRotulo: "Como as pessoas entram",
    tipoAcessoDica: "Vale para todos os ingressos deste grupo.",
    tipoAcessoOpcoes: { qr: "Código QR", facial: "Reconhecimento facial" },
    tipoAcessoErro: "Escolha como as pessoas entram neste grupo.",
    vender: "Vender {ingresso}",
    aVenda: "À venda",
    ordemSalva: "Ordem salva. A compra já mostra a nova ordem.",
    desfazer: "Desfazer",
    pausado: "{ingresso} pausado. Ele para de vender na hora.",
    voltou: "{ingresso} voltou a vender.",
    setorVazio: "Nenhum ingresso neste grupo",
    setorVazioDica: "Sem ingresso, o grupo não aparece na compra.",
    vazioTitulo: "Crie o primeiro grupo",
    vazioDica: "Como Pista ou Camarote. Depois, crie os ingressos dele.",
    buscar: "Buscar ingresso ou grupo",
    todosEstados: "Todos os estados",
    todasSessoes: "Todas as sessões",
    todosSetores: "Todos os grupos",
    nadaNoFiltro: "Nenhum ingresso encontrado",
    nadaNoFiltroDica: "Tente outro nome ou limpe os filtros.",
    limparFiltros: "Limpar filtros",
    abreEm: "Abre em {quando}",
    sessaoTitulo: { one: "{sessao}, {n} ingresso", other: "{sessao}, {n} ingressos" },
    sessaoComFim: "{dia}, das {inicio} às {fim}",
    sessaoSemFim: "{dia}, às {inicio}",
};


/** Estados que a lista pode mostrar, na ordem do filtro (ITM-10, ITM-12). */
const ESTADOS: EstadoItem[] = ["a-venda", "agendado", "sem-abertura", "encerrado", "pausado", "esgotado", "sem-estoque"];

export function Ingressos() {
    const navigate = useNavigate();
    const { carregando, evento, vendidos } = useCatalogo();
    const { t, plural, quando, diaLongo, hora } = useTextosItens();
    // "5 de dezembro de 2026, das 22:00 às 04:00". Sessão antiga sem fim: o do evento, se ele tem uma sessão só.
    const nomeDaSessao = (s: Sessao) => {
        const fim = s.fim ?? (evento?.sessoes.length === 1 ? evento.fim : undefined);
        return fim ? formatar(T.sessaoComFim, { dia: diaLongo(s.inicio), inicio: hora(s.inicio), fim: hora(fim) }) : formatar(T.sessaoSemFim, { dia: diaLongo(s.inicio), inicio: hora(s.inicio) });
    };
    const [modalSetor, setModalSetor] = useState<{ sessaoId: string; setor?: Grupo } | null>(null);
    const [busca, setBusca] = useState("");
    const [estado, setEstado] = useState("todos");
    const [sessaoId, setSessaoId] = useState("todos");
    const [setorNome, setSetorNome] = useState("todos");
    // Cópia local para arrastar sem esperar o banco; grava ao soltar (ITM-08).
    const [local, setLocal] = useState<Sessao[]>([]);
    const localRef = useRef<Sessao[]>([]);
    localRef.current = local;
    useEffect(() => setLocal(evento?.sessoes ?? []), [evento?.sessoes]);

    const sessoes = local.length || !evento ? local : evento.sessoes;
    const setores = sessoes.flatMap((s) => s.grupos);
    const todosIngressos = setores.flatMap((g) => g.ingressos);
    const totalIngressos = todosIngressos.length;
    const nomesDeSetor = [...new Set(setores.map((g) => g.nome))];

    // "Criar" no passo de setores do guia de configuração chega com ?novoSetor=1 e abre o modal (GDC-11).
    const [parametros, setParametros] = useSearchParams();
    useEffect(() => {
        if (carregando || !parametros.has(PARAMETRO_NOVO_SETOR) || !sessoes.length) return;
        setModalSetor({ sessaoId: sessoes[0].id });
        setParametros((p) => {
            p.delete(PARAMETRO_NOVO_SETOR);
            return p;
        }, { replace: true });
    }, [carregando, parametros, sessoes.length]);

    // Filtro aplicado à árvore sessão > setor > ingressos (UI-LST-001).
    const termo = paraBusca(busca.trim());
    const filtrando = !!termo || estado !== "todos" || sessaoId !== "todos" || setorNome !== "todos";
    const arvore = useMemo(
        () =>
            sessoes
                .filter((s) => sessaoId === "todos" || s.id === sessaoId)
                .map((s) => ({
                    sessao: s,
                    setores: s.grupos
                        .filter((g) => setorNome === "todos" || g.nome === setorNome)
                        .map((g) => ({
                            setor: g,
                            ingressos: g.ingressos.filter(
                                (tp) => (!termo || paraBusca(`${tp.nome} ${g.nome}`).includes(termo)) && (estado === "todos" || estadoComAbertura(tp, vendidos, evento?.aberturas) === estado),
                            ),
                        }))
                        .filter((x) => !filtrando || x.ingressos.length > 0),
                }))
                .filter((x) => !filtrando || x.setores.length > 0),
        [sessoes, sessaoId, setorNome, termo, estado, vendidos, filtrando, evento?.aberturas],
    );
    const filtrados = arvore.flatMap((a) => a.setores.flatMap((x) => x.ingressos));

    /** Grava a ordem atual (a ordem do fluxo de compra), com "Desfazer". */
    const salvarOrdem = async (prox: Sessao[]) => {
        if (!evento) return;
        const antes = evento.sessoes;
        if (JSON.stringify(prox.map((s) => s.grupos.map((g) => [g.id, g.ingressos.map((i) => i.id)]))) === JSON.stringify(antes.map((s) => s.grupos.map((g) => [g.id, g.ingressos.map((i) => i.id)])))) return;
        try {
            await salvarSessoes(evento, prox);
            toast.success(T.ordemSalva, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
            setLocal(antes);
        }
    };
    const reordenarSetores = (sessaoId: string, grupos: Grupo[]) => setLocal((l) => l.map((s) => (s.id === sessaoId ? { ...s, grupos } : s)));
    const reordenarIngressos = (setorId: string, ingressos: TipoIngresso[]) =>
        setLocal((l) => l.map((s) => ({ ...s, grupos: s.grupos.map((g) => (g.id === setorId ? { ...g, ingressos } : g)) })));
    /** Teclado: move um passo e grava na hora. */
    const moverSetorPorTeclado = (sessaoId: string, i: number, delta: -1 | 1) => {
        const prox = localRef.current.map((s) => (s.id === sessaoId ? { ...s, grupos: mover(s.grupos, i, i + delta) } : s));
        setLocal(prox);
        salvarOrdem(prox);
    };
    const moverIngressoPorTeclado = (setorId: string, i: number, delta: -1 | 1) => {
        const prox = localRef.current.map((s) => ({ ...s, grupos: s.grupos.map((g) => (g.id === setorId ? { ...g, ingressos: mover(g.ingressos, i, i + delta) } : g)) }));
        setLocal(prox);
        salvarOrdem(prox);
    };
    // Arrastar só sem filtro: com a lista filtrada, a posição de cada item fica ambígua.
    const podeArrastar = !filtrando;
    const chaveFiltro = `${termo}|${estado}|${sessaoId}|${setorNome}`;

    const limparFiltros = () => {
        setBusca("");
        setEstado("todos");
        setSessaoId("todos");
        setSetorNome("todos");
    };


    return (
        // Rail, menu, título e abas ficam no LayoutDeItens: trocar de aba troca só este conteúdo.
        <>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <h2 className="sr-only">{T.titulo}</h2>

                <AlertaDoGuia eventoId={evento?.id} />

                <AvisoDeEscala />

                {!carregando && (
                    <BarraDeFiltros
                        total={totalIngressos}
                        visiveis={filtrados.length}
                        busca={busca}
                        onBusca={setBusca}
                        placeholder={T.buscar}
                        onLimpar={limparFiltros}
                        filtros={[
                            { id: "estado", rotulo: "Estado", valor: estado, onChange: setEstado, opcoes: [{ id: "todos", label: T.todosEstados }, ...ESTADOS.map((e) => ({ id: e, label: t.estado[e] }))] },
                            ...(sessoes.length > 1
                                ? [{ id: "sessao", rotulo: "Sessão", valor: sessaoId, onChange: setSessaoId, opcoes: [{ id: "todos", label: T.todasSessoes }, ...sessoes.map((s) => ({ id: s.id, label: quando(s.inicio) }))] }]
                                : []),
                            ...(nomesDeSetor.length > 1
                                ? [{ id: "setor", rotulo: "Grupo", valor: setorNome, onChange: setSetorNome, opcoes: [{ id: "todos", label: T.todosSetores }, ...nomesDeSetor.map((n) => ({ id: n, label: n }))] }]
                                : []),
                        ]}
                    />
                )}

                {carregando ? (
                    <Esqueleto />
                ) : filtrando && filtrados.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{T.nadaNoFiltro}</EmptyState.Title>
                                <EmptyState.Description>{T.nadaNoFiltroDica}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="secondary" size="md" onClick={limparFiltros}>
                                    {T.limparFiltros}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    arvore.map(({ sessao, setores: setoresDaSessao }, idx) => {
                        const cartao = (setor: Grupo, ingressos: TipoIngresso[], alca?: ReactNode) => (
                            <CartaoDoSetor
                                evento={evento!}
                                setor={setor}
                                ingressos={ingressos}
                                alca={alca}
                                arrastavel={podeArrastar}
                                onReordenar={(lista) => reordenarIngressos(setor.id, lista)}
                                onSoltar={() => salvarOrdem(localRef.current)}
                                onMoverPorTeclado={(i, d) => moverIngressoPorTeclado(setor.id, i, d)}
                                onEditar={() => setModalSetor({ sessaoId: sessao.id, setor })}
                                onNovoIngresso={() => navigate(`/backstage/catalogo/ingressos/novo?setor=${setor.id}`)}
                            />
                        );
                        // A ordem dos setores e dos ingressos é a ordem do fluxo de compra: alça no hover (ITM-08).
                        const conteudo = podeArrastar ? (
                            <Reorder.Group as="div" axis="y" values={sessao.grupos} onReorder={(grupos: Grupo[]) => reordenarSetores(sessao.id, grupos)} className="flex flex-col gap-4">
                                {sessao.grupos.map((setor, i) => (
                                    <SetorArrastavel
                                        key={setor.id}
                                        setor={setor}
                                        onSoltar={() => salvarOrdem(localRef.current)}
                                        render={(alca) => cartao(setor, setor.ingressos, alca)}
                                        onMoverPorTeclado={(d) => moverSetorPorTeclado(sessao.id, i, d)}
                                    />
                                ))}
                            </Reorder.Group>
                        ) : (
                            setoresDaSessao.map(({ setor, ingressos }) => <div key={`${setor.id}-${chaveFiltro}`}>{cartao(setor, ingressos)}</div>)
                        );
                        // A sessão sempre aparece, com o "Novo grupo" dela: o grupo nasce na sessão em que se clicou.
                        const n = setoresDaSessao.reduce((s, x) => s + x.ingressos.length, 0);
                        const semGrupo = sessao.grupos.length === 0;
                        return (
                            <SessaoDaLista
                                key={`${sessao.id}-${chaveFiltro}`}
                                titulo={n === 0 ? nomeDaSessao(sessao) : plural(T.sessaoTitulo, n, { sessao: nomeDaSessao(sessao) })}
                                recolhivel={arvore.length > 1}
                                abertaInicial={idx < 2 || arvore.length <= 3}
                                // Sessão vazia: o botão fica só no vazio, para não aparecer duas vezes.
                                acao={
                                    semGrupo ? null : (
                                        <Button color="secondary" size="sm" iconLeading={Plus} onClick={() => setModalSetor({ sessaoId: sessao.id })}>
                                            {T.novoSetor}
                                        </Button>
                                    )
                                }
                            >
                                {semGrupo ? (
                                    // Vazio horizontal, como o do grupo sem ingresso: texto à esquerda e o botão à direita,
                                    // no mesmo canto em que ele fica quando a sessão já tem grupo.
                                    <div className="flex flex-col gap-3 rounded-2xl bg-primary px-5 py-4 ring-1 ring-secondary sm:flex-row sm:items-center md:px-6">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <LayersTwo01 className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                            <div className="flex min-w-0 flex-col">
                                                <p className="text-sm font-semibold text-primary">{T.vazioTitulo}</p>
                                                <p className="text-sm text-tertiary">{T.vazioDica}</p>
                                            </div>
                                        </div>
                                        <Button color="secondary" size="sm" iconLeading={Plus} onClick={() => setModalSetor({ sessaoId: sessao.id })} className="self-start sm:self-center">
                                            {T.novoSetor}
                                        </Button>
                                    </div>
                                ) : (
                                    conteudo
                                )}
                            </SessaoDaLista>
                        );
                    })
                )}

            </div>

            {evento && modalSetor && (
                <ModalSetor
                    evento={evento}
                    sessaoId={modalSetor.sessaoId}
                    nomeDaSessao={evento.sessoes.length > 1 ? nomeDaSessao(evento.sessoes.find((x) => x.id === modalSetor.sessaoId) ?? evento.sessoes[0]) : undefined}
                    setor={modalSetor.setor}
                    onFechar={() => setModalSetor(null)}
                />
            )}
        </>
    );
}


/** Sessão da lista: título, contagem e "Novo grupo". Com várias, recolhível, e só as primeiras abrem (UI-LST-001). */
function SessaoDaLista({ titulo, acao, recolhivel, abertaInicial, children }: { titulo: string; acao: ReactNode; recolhivel: boolean; abertaInicial: boolean; children: ReactNode }) {
    const [aberta, setAberta] = useState(abertaInicial);
    const visivel = !recolhivel || aberta;
    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0">
                    {recolhivel ? (
                        <button
                            type="button"
                            aria-expanded={aberta}
                            onClick={() => setAberta((a) => !a)}
                            className="flex w-full items-center gap-2 rounded-lg text-left text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2"
                        >
                            <ChevronDown className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-200 motion-reduce:transition-none", !aberta && "-rotate-90")} aria-hidden="true" />
                            {titulo}
                        </button>
                    ) : (
                        <span className="text-lg font-semibold text-primary">{titulo}</span>
                    )}
                </h2>
                {acao}
            </div>
            <Surgir visivel={visivel}>
                <div className="flex flex-col gap-4">{children}</div>
            </Surgir>
        </section>
    );
}


/** Setor dentro da lista arrastável: cria os controles de arrastar e entrega a alça ao cartão. */
function SetorArrastavel({ setor, render, onSoltar, onMoverPorTeclado }: { setor: Grupo; render: (alca: ReactNode) => ReactNode; onSoltar: () => void; onMoverPorTeclado: (d: -1 | 1) => void }) {
    const controles = useDragControls();
    const reduzir = useReducedMotion();
    return (
        <Reorder.Item as="div" value={setor} dragListener={false} dragControls={controles} onDragEnd={onSoltar} transition={{ duration: reduzir ? 0 : DURACAO_TRANSICAO }} className="group/setor">
            {render(<Alca grupo="setor" nome={setor.nome} onPointerDown={(e) => controles.start(e)} onMover={onMoverPorTeclado} />)}
        </Reorder.Item>
    );
}

function IngressoArrastavel({ tipo, children, onSoltar, onMoverPorTeclado }: { tipo: TipoIngresso; children: (alca: ReactNode) => ReactNode; onSoltar: () => void; onMoverPorTeclado: (d: -1 | 1) => void }) {
    const controles = useDragControls();
    const reduzir = useReducedMotion();
    return (
        <Reorder.Item value={tipo} dragListener={false} dragControls={controles} onDragEnd={onSoltar} transition={{ duration: reduzir ? 0 : DURACAO_TRANSICAO }} className="group/linha border-b border-secondary bg-primary last:border-b-0">
            {children(<Alca grupo="linha" nome={tipo.nome} onPointerDown={(e) => controles.start(e)} onMover={onMoverPorTeclado} />)}
        </Reorder.Item>
    );
}

function CartaoDoSetor({
    evento,
    setor,
    ingressos,
    alca,
    arrastavel,
    onReordenar,
    onSoltar,
    onMoverPorTeclado,
    onEditar,
    onNovoIngresso,
}: {
    evento: Evento;
    setor: Grupo;
    ingressos: TipoIngresso[];
    alca?: ReactNode;
    arrastavel: boolean;
    onReordenar: (lista: TipoIngresso[]) => void;
    onSoltar: () => void;
    onMoverPorTeclado: (i: number, d: -1 | 1) => void;
    onEditar: () => void;
    onNovoIngresso: () => void;
}) {
    const { vendidos, pendentes } = useCatalogo();
    const { numero } = useTextosItens();
    const oferta = ofertaDoSetor(setor);
    // Setor com dezenas de ingressos mostra os primeiros e "Mostrar mais" (UI-LST-001).
    const { visiveis, restantes, mostrarMais } = useMostrarMais(ingressos);

    return (
        <article aria-labelledby={`setor-${setor.id}`} className="flex flex-col rounded-2xl bg-primary ring-1 ring-secondary">
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 md:px-6">
                <div className="flex min-w-0 items-start gap-2">
                {alca && <div className="-ml-3 md:-ml-4">{alca}</div>}
                <div className="flex min-w-0 flex-col gap-1">
                    {/* O ícone diz como as pessoas entram no grupo (código QR ou rosto), com o nome para leitor de tela. */}
                    <div className="flex min-w-0 items-center gap-2">
                        {setor.tipoAcesso === "facial" ? (
                            <FaceId className="size-5 shrink-0 text-fg-quaternary" role="img" aria-label={T.tipoAcessoOpcoes.facial} />
                        ) : (
                            <QrCode01 className="size-5 shrink-0 text-fg-quaternary" role="img" aria-label={T.tipoAcessoOpcoes.qr} />
                        )}
                        <h3 id={`setor-${setor.id}`} className="min-w-0 text-lg font-semibold text-primary">
                            {setor.nome}
                        </h3>
                    </div>
                    {/* Dados do setor em linhas próprias, sem símbolo separador (UI-TXT-010). */}
                    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-tertiary">
                        <div className="flex gap-1">
                            <dt>{T.emissoes}:</dt>
                            <dd className="text-secondary">{formatar(T.emissoesDoSetor, { emitidos: numero(vendidosDoSetor(setor, vendidos) - setor.ingressos.reduce((n, t) => n + pendentesDoIngresso(t, pendentes), 0)), oferta: numero(oferta) })}</dd>
                        </div>
                        <div>
                            <dt className="sr-only">Capacidade</dt>
                            <dd>{formatar(T.capacidade, { n: numero(setor.capacidade ?? oferta) })}</dd>
                        </div>
                        {/* O tipo de entrada está no ícone ao lado do nome; aqui só o portão, quando há. */}
                        {setor.acesso && (
                            <div>
                                <dt className="sr-only">Acesso</dt>
                                <dd>{formatar(T.acessoPortao, { acesso: setor.acesso })}</dd>
                            </div>
                        )}
                    </dl>
                </div>
                </div>
                <ButtonUtility icon={Edit01} color="tertiary" tooltip={formatar(T.editarSetor, { setor: setor.nome })} onClick={onEditar} />
            </header>

            {/* Cabeçalho da tabela: nomes das colunas uma vez só, para tudo alinhar (ITM-93). */}
            {ingressos.length > 0 && <CabecalhoDaTabela comAlca={arrastavel} />}

            {arrastavel && visiveis.length > 1 ? (
                <Reorder.Group as="ul" axis="y" values={visiveis} onReorder={(prox: TipoIngresso[]) => onReordenar([...prox, ...ingressos.slice(prox.length)])} className="flex flex-col border-t border-secondary md:border-t-0">
                    {visiveis.map((tp, i) => (
                        <IngressoArrastavel key={tp.id} tipo={tp} onSoltar={onSoltar} onMoverPorTeclado={(d) => onMoverPorTeclado(i, d)}>
                            {(a) => <LinhaDoIngresso evento={evento} tipo={tp} alca={a} />}
                        </IngressoArrastavel>
                    ))}
                </Reorder.Group>
            ) : (
                <ul className={cx("flex flex-col border-t border-secondary", ingressos.length > 0 && "md:border-t-0")}>
                    {visiveis.map((tp) => (
                        <li key={tp.id} className="border-b border-secondary last:border-b-0">
                            {/* Sem alça (um ingresso só), o espaço dela fica: a caixa e o nome alinham com os outros setores. */}
                            <LinhaDoIngresso evento={evento} tipo={tp} alca={arrastavel ? <span aria-hidden="true" className="block size-8 shrink-0" /> : undefined} />
                        </li>
                    ))}
                    {/* Vazio em linha: diz que não há ingresso e já oferece criar o primeiro. */}
                    {ingressos.length === 0 && (
                        <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center md:px-6">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <Ticket01 className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                <div className="flex min-w-0 flex-col">
                                    <p className="text-sm font-semibold text-primary">{T.setorVazio}</p>
                                    <p className="text-sm text-tertiary">{T.setorVazioDica}</p>
                                </div>
                            </div>
                            <Button color="secondary" size="sm" iconLeading={Plus} onClick={onNovoIngresso} className="self-start sm:self-center">
                                {T.novoIngresso}
                            </Button>
                        </li>
                    )}
                </ul>
            )}

            {restantes > 0 && (
                <div className="border-t border-secondary px-5 py-3 md:px-6">
                    <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} />
                </div>
            )}
            {/* Grupo vazio: o botão fica só no vazio, para não aparecer duas vezes. */}
            {ingressos.length > 0 && (
                <div className="px-3 pb-3 md:px-4">
                    <Button color="tertiary" size="sm" iconLeading={Plus} onClick={onNovoIngresso}>
                        {T.novoIngresso}
                    </Button>
                </div>
            )}
        </article>
    );
}

/**
 * Colunas da tabela de ingressos do grupo, com largura fixa no desktop: o cabeçalho, as linhas dos
 * ingressos e as dos lotes usam as mesmas, e tudo alinha (ITM-93).
 */
const COLUNA = { passkey: "md:w-28", virada: "md:w-32", preco: "md:w-28", emissoes: "md:w-36", aVenda: "md:w-14", acoes: "md:w-9" };
/** Recuo das linhas: igual em cabeçalho, ingresso e lote. */
const LINHA = "flex gap-3 px-5 md:px-6";
/** Espaço da alça de arrastar, quando há: cabeçalho e lotes guardam o mesmo lugar. */
const ESPACO_DA_ALCA = "-ml-3 w-8 shrink-0 md:-ml-4";
/** Espaço da seta dos lotes (size-7 + gap-1 - ml-1): o nome do lote começa onde começa o do ingresso. */
const RECUO_DO_NOME = "pl-7";

/** Cabeçalho da tabela do grupo, só no desktop; no celular cada valor leva o próprio rótulo. */
function CabecalhoDaTabela({ comAlca }: { comAlca: boolean }) {
    return (
        <div aria-hidden="true" className={cx(LINHA, "hidden items-center border-t border-secondary bg-secondary_subtle py-3 text-sm font-medium whitespace-nowrap text-tertiary md:flex")}>
            {comAlca && <span className={ESPACO_DA_ALCA} />}
            <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="min-w-0 flex-1">Nome</span>
                <span className={COLUNA.passkey}>{T.passkey}</span>
                <span className={COLUNA.virada}>{T.virada}</span>
                <span className={COLUNA.preco}>{T.preco}</span>
                <span className={COLUNA.emissoes}>{T.emissoesEEstoque}</span>
                <span className={COLUNA.aVenda}>{T.aVenda}</span>
                <span className={COLUNA.acoes} />
            </div>
        </div>
    );
}

/** Um valor da linha: rótulo visível só no celular (no desktop, o cabeçalho da tabela diz). */
const Celula = ({ rotulo, className, children }: { rotulo: string; className: string; children: ReactNode }) => (
    <div className={cx("flex min-w-0 flex-col", className)}>
        <dt className="text-tertiary md:sr-only">{rotulo}</dt>
        <dd className="text-primary">{children}</dd>
    </div>
);

function LinhaDoIngresso({ evento, tipo, alca }: { evento: Evento; tipo: TipoIngresso; alca?: ReactNode }) {
    const navigate = useNavigate();
    const { vendidos, pendentes } = useCatalogo();
    const { t, preco, numero, quando } = useTextosItens();
    const resumoVendas = useResumoDasVendas();
    const estado = estadoComAbertura(tipo, vendidos, evento.aberturas);
    const janela = estado === "agendado" ? janelaDoIngresso(tipo.id, evento.aberturas) : null;
    const faixa = faixaDePreco(tipo);
    const abrir = () => navigate(`/backstage/catalogo/ingressos/${tipo.id}`);
    // Lotes abertos na própria lista, sem entrar no ingresso (ITM-93).
    const [lotesAbertos, setLotesAbertos] = useState(false);
    // Seletor de Passkeys do ingresso inteiro, aberto pelo "Vincular" da linha.
    const [seletorDePasskey, setSeletorDePasskey] = useState(false);
    const vincularNoIngresso = async (ids: string[]) => {
        const antes = evento.sessoes;
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, chaves: ids.length ? ids : undefined }));
            toast.success(formatar(T.passkeysDoIngressoSalvas, { ingresso: tipo.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    const apoio = [janela?.janela === "agendado" ? formatar(T.abreEm, { quando: quando(janela.inicio) }) : null, resumoVendas(tipo.vendas) || null].filter(Boolean) as string[];

    const alternar = async (ativo: boolean) => {
        const antes = evento.sessoes;
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, ativo }));
            // Mesmo comportamento do toggle do detalhe: grava na hora e dá para desfazer (ITM-03, ITM-32).
            toast.success(formatar(ativo ? T.voltou : T.pausado, { ingresso: tipo.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    return (
        <div className="flex flex-col">
            <div className={cx(LINHA, "relative items-start py-3 transition duration-100 ease-linear outline-focus-ring hover:bg-primary_hover has-[[data-linha]:focus-visible]:outline-2 has-[[data-linha]:focus-visible]:-outline-offset-2 md:items-center")}>
                {alca && <div className={cx(ESPACO_DA_ALCA, "-mt-1 flex items-center md:mt-0")}>{alca}</div>}
                <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    {/* O botão do nome cobre a linha (after:inset-0); seta, Passkey, toggle e lápis ficam por cima (z-10). */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {/* Seta à esquerda do nome, sem quebrar; o badge vem depois e pode descer. */}
                            <span className="-ml-1 flex min-w-0 items-center gap-1">
                                {tipo.lotes.length > 0 ? (
                                    <button
                                        type="button"
                                        aria-expanded={lotesAbertos}
                                        aria-label={formatar(T.verLotes, { ingresso: tipo.nome })}
                                        onClick={() => setLotesAbertos((v) => !v)}
                                        className="relative z-10 flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2"
                                    >
                                        <ChevronDown className={cx("size-4 transition-transform duration-200 motion-reduce:transition-none", !lotesAbertos && "-rotate-90")} aria-hidden="true" />
                                    </button>
                                ) : (
                                    <span aria-hidden="true" className="size-7 shrink-0" />
                                )}
                                {/* Nome em até duas linhas, com reticências; o nome inteiro fica no title. */}
                                <button type="button" data-linha onClick={abrir} title={tipo.nome} className="min-w-0 text-left outline-hidden after:absolute after:inset-0">
                                    <span className="line-clamp-2 text-md font-semibold break-words text-primary">{tipo.nome}</span>
                                </button>
                            </span>
                            {/* Badge só quando foge do normal: À venda e Pausado o toggle já diz (ITM-10); "Sem abertura de vendas" e "Agendado" não aparecem na lista. */}
                            {estado !== "a-venda" && estado !== "pausado" && estado !== "sem-abertura" && estado !== "agendado" && <EstadoBadge estado={estado} />}
                        </div>
                        {apoio.length > 0 && (
                            <div className={cx("flex min-w-0 flex-col gap-0.5", RECUO_DO_NOME)}>
                                {apoio.map((linha) => (
                                    <span key={linha} className="truncate text-sm text-tertiary">
                                        {linha}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <dl className={cx("grid grid-cols-2 gap-3 text-sm md:flex md:items-center md:gap-4", RECUO_DO_NOME, "md:pl-0")}>
                        {/* Passkey: com Passkey, a contagem abre o slideout (ITM-33); sem, "Vincular" abre o seletor do ingresso e grava na hora. */}
                        {totalDeChaves(tipo) ? (
                            <BotaoChaves tipo={tipo} onEditar={abrir} className={COLUNA.passkey} />
                        ) : (
                            <Celula rotulo={T.passkey} className={COLUNA.passkey}>
                                <button
                                    type="button"
                                    onClick={() => setSeletorDePasskey(true)}
                                    aria-label={formatar(T.vincularNoIngresso, { ingresso: tipo.nome })}
                                    className="relative z-10 flex cursor-pointer items-center gap-1 rounded font-medium whitespace-nowrap text-utility-blue-600 outline-focus-ring transition duration-100 ease-linear hover:text-utility-blue-700 focus-visible:outline-2"
                                >
                                    <Key01 className="size-4 shrink-0" aria-hidden="true" />
                                    {T.vincular}
                                </button>
                            </Celula>
                        )}
                        {/* Virada de lote: o padrão é "individual" (ITM-92). */}
                        <Celula rotulo={T.virada} className={COLUNA.virada}>
                            <Badge type="modern" color="gray" size="sm">
                                {T.viradaTipos[tipo.virada ?? "individual"]}
                            </Badge>
                        </Celula>
                        <Celula rotulo={T.preco} className={COLUNA.preco}>
                            <span className="font-medium tabular-nums">{preco(faixa.min)}</span>
                            {faixa.min !== faixa.max && <span className="block text-tertiary tabular-nums">{formatar(T.ate, { preco: preco(faixa.max) })}</span>}
                        </Celula>
                        <Celula rotulo={T.emissoesEEstoque} className={COLUNA.emissoes}>
                            <span className="font-medium tabular-nums">
                                {formatar(T.vendidosCurto, { vendidos: numero(vendidosDoIngresso(tipo, vendidos) - pendentesDoIngresso(tipo, pendentes)), total: numero(quantidadeDoIngresso(tipo)) })}
                            </span>
                        </Celula>
                    </dl>
                    <div className={cx("flex items-center justify-between gap-3 md:contents", RECUO_DO_NOME, "md:pl-0")}>
                        <div className={cx("relative z-10 flex items-center gap-3", COLUNA.aVenda)}>
                            <span className="text-sm text-tertiary md:hidden" aria-hidden="true">
                                {T.aVenda}
                            </span>
                            {/* Área de toque de 44 px em volta do toggle (WCAG 2.5.8), sem mudar o desenho. */}
                            <Toggle aria-label={formatar(T.vender, { ingresso: tipo.nome })} isSelected={tipo.ativo} onChange={alternar} className="relative before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']" />
                        </div>
                        {/* Editar à direita, explícito: o clique na linha também abre, mas não é óbvio. */}
                        <div className={cx("relative z-10 flex md:justify-end", COLUNA.acoes)}>
                            <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip={formatar(T.editarIngresso, { ingresso: tipo.nome })} onClick={abrir} />
                        </div>
                    </div>
                </div>
            </div>
            <Surgir visivel={lotesAbertos}>
                <LotesDoIngresso evento={evento} tipo={tipo} comAlca={!!alca} />
            </Surgir>
            {seletorDePasskey && (
                <SeletorDeLista
                    titulo={formatar(T.passkeysDoIngresso, { ingresso: tipo.nome })}
                    descricao={T.passkeysDoIngressoDica}
                    vazio={T.passkeysVazio}
                    opcoes={CHAVES_DE_EXEMPLO.map((c) => ({ id: c, rotulo: c }))}
                    selecionados={tipo.chaves ?? []}
                    onFechar={() => setSeletorDePasskey(false)}
                    onConfirmar={(ids) => {
                        void vincularNoIngresso(ids);
                        setSeletorDePasskey(false);
                    }}
                />
            )}
        </div>
    );
}

/**
 * Lotes de um ingresso abertos na lista (ITM-93): nome, virada ("Ao atingir estoque"), preço, emissões de
 * quantidade e o "À venda" de cada lote, nas colunas do cabeçalho. Só um lote vende por vez (ITM-11): ligar
 * um desliga os outros. Grava na hora, com "Desfazer". Lote esgotado não liga.
 */
function LotesDoIngresso({ evento, tipo, comAlca }: { evento: Evento; tipo: TipoIngresso; comAlca: boolean }) {
    const { vendidos, pendentes } = useCatalogo();
    const { t, preco, numero, plural } = useTextosItens();
    // Lote com o seletor de Passkeys aberto.
    const [seletorDoLote, setSeletorDoLote] = useState<string | null>(null);
    const loteDoSeletor = tipo.lotes.find((l) => l.id === seletorDoLote);

    const vincular = async (loteId: string, ids: string[]) => {
        const antes = evento.sessoes;
        const lote = tipo.lotes.find((l) => l.id === loteId);
        const lotes = tipo.lotes.map((l) => (l.id === loteId ? { ...l, chaves: ids.length ? ids : undefined } : l));
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes }));
            toast.success(formatar(T.passkeysSalvas, { lote: lote?.nome ?? "" }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    // O lote ligado é o que vende agora: o primeiro sem pausa e com saldo, como no detalhe do ingresso (ITM-22).
    const ligado = tipo.lotes.find((l) => !l.pausado && !(l.quantidade > 0 && vendidosDoLote(l, vendidos) >= l.quantidade));

    const vender = async (loteId: string, ligar: boolean) => {
        const antes = evento.sessoes;
        const lote = tipo.lotes.find((l) => l.id === loteId);
        if (!lote) return;
        const anterior = ligar && ligado && ligado.id !== loteId ? ligado : undefined;
        // Igual ao detalhe: ligar deixa só este lote sem pausa; desligar deixa nenhum vendendo.
        const lotes = tipo.lotes.map((l) => ({ ...l, pausado: ligar && l.id === loteId ? undefined : true }));
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes }));
            const msg = !ligar ? formatar(T.lotePausado, { lote: lote.nome }) : anterior ? formatar(T.loteTrocado, { lote: lote.nome, anterior: anterior.nome }) : formatar(T.loteLigado, { lote: lote.nome });
            toast.success(msg, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    return (
        <>
        {/* Sem linha entre o ingresso e os lotes dele, nem entre os lotes: a linha separa só ingressos diferentes. */}
        <ul className="-mt-1 flex flex-col pb-1">
            {tipo.lotes.map((l) => {
                const vendidosLote = vendidosDoLote(l, vendidos);
                const esgotado = l.quantidade > 0 && vendidosLote >= l.quantidade;
                return (
                    <li key={l.id} className={cx(LINHA, "items-start py-3 md:items-center")}>
                        {comAlca && <span aria-hidden="true" className={ESPACO_DA_ALCA} />}
                        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-4">
                            <div className={cx("flex min-w-0 flex-1 flex-wrap items-center gap-2", RECUO_DO_NOME)}>
                                <span className="text-sm font-medium text-primary">{l.nome}</span>
                                {esgotado && <EstadoBadge lote estado="esgotado" />}
                            </div>
                            <dl className={cx("grid grid-cols-2 gap-3 text-sm md:flex md:items-center md:gap-4", RECUO_DO_NOME, "md:pl-0")}>
                                {/* Passkey do lote direto na lista: "Vincular" (ou a contagem) abre o seletor e grava na hora. */}
                                <Celula rotulo={T.passkey} className={COLUNA.passkey}>
                                    <button
                                        type="button"
                                        onClick={() => setSeletorDoLote(l.id)}
                                        aria-label={l.chaves?.length ? `${plural(T.contagemPasskeys, l.chaves.length)}, ${l.nome}` : formatar(T.vincularNoLote, { lote: l.nome })}
                                        className="flex cursor-pointer items-center gap-1 rounded font-medium whitespace-nowrap text-utility-blue-600 outline-focus-ring transition duration-100 ease-linear hover:text-utility-blue-700 focus-visible:outline-2"
                                    >
                                        <Key01 className="size-4 shrink-0" aria-hidden="true" />
                                        {l.chaves?.length ? plural(T.contagemPasskeys, l.chaves.length) : T.vincular}
                                    </button>
                                </Celula>
                                <Celula rotulo={T.virada} className={COLUNA.virada}>
                                    <span className="text-tertiary">{T.viradaDoLote}</span>
                                </Celula>
                                <Celula rotulo={T.preco} className={COLUNA.preco}>
                                    <span className="font-medium tabular-nums">{preco(l.preco)}</span>
                                </Celula>
                                <Celula rotulo={T.emissoesEEstoque} className={COLUNA.emissoes}>
                                    <span className="font-medium tabular-nums">
                                        {formatar(T.vendidosCurto, { vendidos: numero(Math.max(0, vendidosLote - pendentesDoLote(l, pendentes))), total: numero(l.quantidade) })}
                                    </span>
                                </Celula>
                            </dl>
                            <div className={cx("flex items-center gap-3 md:contents", RECUO_DO_NOME, "md:pl-0")}>
                                <div className={cx("relative flex items-center gap-3", COLUNA.aVenda)}>
                                    <span className="text-sm text-tertiary md:hidden" aria-hidden="true">
                                        {T.aVenda}
                                    </span>
                                    <Toggle
                                        size="sm"
                                        aria-label={formatar(T.loteVender, { lote: l.nome })}
                                        isSelected={ligado?.id === l.id}
                                        isDisabled={esgotado}
                                        onChange={(on) => void vender(l.id, on)}
                                        className="relative before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']"
                                    />
                                </div>
                                <span aria-hidden="true" className={cx("hidden md:block", COLUNA.acoes)} />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
        {loteDoSeletor && (
            <SeletorDeLista
                titulo={formatar(T.passkeysDoLote, { lote: loteDoSeletor.nome })}
                descricao={T.passkeysDica}
                vazio={T.passkeysVazio}
                opcoes={CHAVES_DE_EXEMPLO.map((c) => ({ id: c, rotulo: c }))}
                selecionados={loteDoSeletor.chaves ?? []}
                onFechar={() => setSeletorDoLote(null)}
                onConfirmar={(ids) => {
                    void vincular(loteDoSeletor.id, ids);
                    setSeletorDoLote(null);
                }}
            />
        )}
        </>
    );
}

/** Criar ou editar setor: nome único na sessão, acesso e capacidade. Remover só sem ingressos. */
function ModalSetor({ evento, sessaoId: sessaoInicial, nomeDaSessao, setor, onFechar }: { evento: Evento; sessaoId: string; nomeDaSessao?: string; setor?: Grupo; onFechar: () => void }) {
    const { t } = useTextosItens();
    // A sessão vem do "Novo grupo" em que se clicou: no modal, não se escolhe.
    const sessaoId = sessaoInicial;
    const [nome, setNome] = useState(setor?.nome ?? "");
    const [acesso, setAcesso] = useState(setor?.acesso ?? "");
    const [capacidade, setCapacidade] = useState(setor?.capacidade != null ? String(setor.capacidade) : "");
    // Reconhecimento facial só existe no futebol: nos outros eventos o grupo entra por código QR, sem escolha (ITM-89).
    const futebol = evento.tipo === "futebol";
    const [tipoAcesso, setTipoAcesso] = useState<Grupo["tipoAcesso"]>(futebol ? setor?.tipoAcesso : "qr");
    const [tentou, setTentou] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const sessao = evento.sessoes.find((s) => s.id === sessaoId);
    const repetido = !!sessao?.grupos.some((g) => g.id !== setor?.id && g.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erroNome = !nome.trim() ? "Dê um nome ao grupo." : repetido ? "Escolha outro nome: já existe um grupo com esse nome nesta sessão." : undefined;
    // Capacidade é obrigatória (ITM-04): número inteiro maior que zero.
    const capacidadeNum = Math.round(Number(capacidade));
    const erroCapacidade = !capacidade.trim() || !(capacidadeNum > 0) ? "Informe a lotação do grupo." : undefined;

    const salvar = async () => {
        setTentou(true);
        if (erroNome || erroCapacidade || !tipoAcesso) return;
        setSalvando(true);
        const base = setor ?? setorNovo(nome);
        const prox: Grupo = { ...base, nome: nome.trim(), tipoAcesso, acesso: acesso.trim() || undefined, capacidade: capacidadeNum };
        try {
            await salvarSessoes(evento, comSetor(evento, sessaoId, prox));
            toast.success(setor ? t.salvo : formatar(T.setorCriado, { setor: prox.nome }));
            onFechar();
        } catch {
            toast.error(t.erroAoSalvar);
            setSalvando(false);
        }
    };

    const remover = async () => {
        if (!setor) return;
        try {
            const antes = evento.sessoes;
            await salvarSessoes(evento, semSetor(evento, setor.id));
            toast.success(formatar(T.setorRemovido, { setor: setor.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
            onFechar();
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    return (
        <ModalOverlay isOpen onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-[480px]">
                <Dialog>
                    <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                        <div className="flex flex-col gap-1">
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">{setor ? "Editar grupo" : "Novo grupo"}</AriaHeading>
                            {nomeDaSessao && <p className="text-sm font-medium text-secondary">{nomeDaSessao}</p>}
                            <p className="text-sm text-tertiary">Grupo reúne ingressos com entrada e lotação próprias, como Pista ou Camarote.</p>
                        </div>
                        <Input label="Nome do grupo" isRequired value={nome} onChange={setNome} placeholder="Ex.: Pista" isInvalid={tentou && !!erroNome} hint={tentou ? erroNome : undefined} />
                        {/* Obrigatório no futebol: o tipo de acesso define como a portaria valida os ingressos do grupo. */}
                        {futebol && (
                        <div className="flex flex-col gap-2">
                            <RadioGroup aria-label={T.tipoAcessoRotulo} value={tipoAcesso ?? null} onChange={(v) => setTipoAcesso(v as Grupo["tipoAcesso"])}>
                                <span className="text-sm font-medium text-secondary">
                                    {T.tipoAcessoRotulo}
                                    <span className="text-brand-tertiary"> *</span>
                                </span>
                                <RadioButton value="qr" label={T.tipoAcessoOpcoes.qr} />
                                <RadioButton value="facial" label={T.tipoAcessoOpcoes.facial} />
                            </RadioGroup>
                            <span className={cx("text-sm", tentou && !tipoAcesso ? "text-error-primary" : "text-tertiary")}>{tentou && !tipoAcesso ? T.tipoAcessoErro : T.tipoAcessoDica}</span>
                        </div>
                        )}
                        <Input label="Acesso na portaria" value={acesso} onChange={setAcesso} placeholder="Ex.: Portão A" hint="Aparece no ingresso. Opcional." />
                        <Input
                            label="Capacidade"
                            inputMode="numeric"
                            autoComplete="off"
                            isRequired
                            value={capacidade}
                            onChange={(v) => setCapacidade(v.replace(/\D/g, "").slice(0, 9))}
                            placeholder="Ex.: 1200"
                            isInvalid={tentou && !!erroCapacidade}
                            hint={tentou && erroCapacidade ? erroCapacidade : "Lotação do grupo. A soma dos lotes é conferida contra ela."}
                        />
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {setor ? (
                                setor.ingressos.length === 0 ? (
                                    <Button color="tertiary-destructive" size="md" onClick={remover}>
                                        Remover grupo
                                    </Button>
                                ) : (
                                    <span className="text-sm text-tertiary">Para remover o grupo, remova antes os ingressos dele.</span>
                                )
                            ) : (
                                <span />
                            )}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                <Button color="secondary" size="md" onClick={onFechar}>
                                    Cancelar
                                </Button>
                                <Button color="primary" size="md" onClick={salvar} isLoading={salvando}>
                                    {setor ? "Salvar grupo" : "Criar grupo"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function Esqueleto() {
    return (
        <div role="status" aria-label="Carregando ingressos" className="flex flex-col gap-4">
            {[0, 1].map((i) => (
                <div key={i} aria-hidden="true" className="flex flex-col gap-3 rounded-2xl bg-primary p-6 ring-1 ring-secondary">
                    <span className="h-5 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                    <span className="h-4 w-64 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                    <span className="mt-2 h-14 w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
                    <span className="h-14 w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
                </div>
            ))}
        </div>
    );
}
