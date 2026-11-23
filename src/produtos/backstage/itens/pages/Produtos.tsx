import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PauseCircle, PlayCircle, Plus, ShoppingBag01, Trash01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { ProdutoDaOrganizacao, ProdutoNoEvento } from "@/plataforma";
import { type OpcaoDeLista, SeletorDeLista } from "../components/SeletorDeLista";
import { estadoDoProduto, precoDoProduto, produtosDo, salvarProdutosDoEvento, useCatalogo, type EstadoItem, type ProdutoNoCatalogo } from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";
import { EstadoBadge } from "../components/comuns";
import { AcoesEmLote, CaixaDeSelecao, paraBusca, useSelecao } from "../components/escala";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";

/* ------------------------------------------------------------------ */
/*  Produtos do evento (ITM)                                           */
/*                                                                     */
/*  O produto é da organização (biblioteca); o evento escolhe quais    */
/*  vende, com preço e estoque próprios. A lista mostra cada produto   */
/*  inteiro numa linha; o detalhe edita tudo a partir dele.            */
/* ------------------------------------------------------------------ */

/** Textos desta tela (UI-TXT-009): frases inteiras, plural por Intl.PluralRules. */
const TEXTOS = {
    titulo: "Produtos",
    produtosNoEvento: { one: "{n} produto neste evento", other: "{n} produtos neste evento" },
    adicionar: "Adicionar produtos",
    listaDeProdutos: "Produtos do evento",
    carregando: "Carregando produtos",
    vazioTitulo: "Nenhum produto neste evento",
    vazioDica: "Escolha produtos da biblioteca da organização. Para um produto novo, crie antes na organização.",
    disponiveis: { one: "{n} disponível", other: "{n} disponíveis" },
    abrir: "Abrir {nome}",
    buscar: "Buscar produto",
    filtroEstado: "Filtrar por estado",
    todos: "Todos",
    nenhumNoFiltro: "Nenhum produto encontrado.",
    colProduto: "Produto",
    colPreco: "Preço",
    colDisponivel: "Disponível",
    colEstado: "Estado",
    lote: {
        pausar: "Pausar",
        voltar: "Voltar a vender",
        remover: "Remover do evento",
        pausados: { one: "{n} produto pausado.", other: "{n} produtos pausados." },
        voltaram: { one: "{n} produto voltou a vender.", other: "{n} produtos voltaram a vender." },
        removidos: { one: "{n} produto removido do evento.", other: "{n} produtos removidos do evento." },
        confirmarTitulo: { one: "Remover {n} produto do evento?", other: "Remover {n} produtos do evento?" },
        confirmarDica: { one: "Ele continua na biblioteca da organização.", other: "Eles continuam na biblioteca da organização." },
        cancelar: "Cancelar",
        confirmar: "Remover",
    },
    modal: {
        titulo: "Adicionar produtos",
        dica: "Os produtos entram pausados e sem estoque. Eles começam a vender quando você definir o estoque e ligar a venda em cada um.",
        buscar: "Buscar produto",
        buscarPlaceholder: "Buscar por nome",
        jaNoEvento: "Já no evento",
        nenhum: "Nenhum produto com esse nome.",
        contagem: "{visiveis} de {total}",
        selecionarTodos: { one: "Selecionar {n} da busca", other: "Selecionar todos os {n} da busca" },
        limparSelecao: "Limpar seleção",
        bibliotecaVazia: "A biblioteca da organização ainda não tem produtos.",
        selecionados: { zero: "Nenhum selecionado", one: "{n} selecionado", other: "{n} selecionados" },
        criarNovo: "Criar produto na organização",
        cancelar: "Cancelar",
        confirmar: "Adicionar",
        adicionados: { one: "{n} produto adicionado ao evento.", other: "{n} produtos adicionados ao evento." },
    },
};

type Plural = { zero?: string; one: string; other: string };

function usePlural() {
    const { locale, numero } = useTextosItens();
    const regras = useMemo(() => new Intl.PluralRules(locale), [locale]);
    return (frase: Plural, n: number) => formatar(n === 0 ? (frase.zero ?? frase.other) : regras.select(n) === "one" ? frase.one : frase.other, { n: numero(n) });
}

export function Produtos() {
    const navigate = useNavigate();
    const plural = usePlural();
    const { t } = useTextosItens();
    const { carregando, evento, biblioteca } = useCatalogo();
    const [adicionando, setAdicionando] = useState(false);
    const [busca, setBusca] = useState("");
    const [estado, setEstado] = useState<EstadoItem | "todos">("todos");
    const [confirmarRemocao, setConfirmarRemocao] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const selecao = useSelecao();

    const produtos = useMemo(() => produtosDo(evento, biblioteca), [evento, biblioteca]);
    const vazio = !carregando && produtos.length === 0;
    // Com um produto só, nada de seleção nem ações em lote (UI-LST-001).
    const comSelecao = produtos.length > 1;

    const filtrados = useMemo(() => {
        const q = paraBusca(busca.trim());
        return produtos.filter((p) => (!q || paraBusca(p.produto.nome).includes(q)) && (estado === "todos" || estadoDoProduto(p.noEvento) === estado));
    }, [produtos, busca, estado]);
    // Busca, filtro ou tamanho mudou: volta à página 1 (BKS-114).
    const paginacao = usePaginacao(filtrados, [busca, estado]);

    // Mudou a busca ou o filtro: esquece a seleção, que era de outro recorte.
    const aoFiltrar = (aplicar: () => void) => {
        aplicar();
        selecao.limpar();
    };
    const limparBusca = () =>
        aoFiltrar(() => {
            setBusca("");
            setEstado("todos");
        });

    // Só os estados que um produto pode ter (pausado, sem estoque, à venda) e que aparecem na lista.
    const opcoesDeEstado: { id: EstadoItem | "todos"; label: string }[] = [
        { id: "todos", label: TEXTOS.todos },
        ...(["a-venda", "pausado", "sem-estoque"] as const).filter((id) => produtos.some((p) => estadoDoProduto(p.noEvento) === id)).map((id) => ({ id, label: t.estado[id] })),
    ];

    /** Grava a lista nova de uma vez só, avisa com plural e limpa a seleção. */
    const emLote = async (proxima: ProdutoNoEvento[], aviso: Plural) => {
        if (!evento) return;
        const n = selecao.tamanho;
        setSalvando(true);
        try {
            await salvarProdutosDoEvento(evento, proxima);
            toast.success(plural(aviso, n));
            selecao.limpar();
            setConfirmarRemocao(false);
        } catch {
            toast.error(t.erroAoSalvar);
        } finally {
            setSalvando(false);
        }
    };
    const definirAtivo = (ativo: boolean) =>
        emLote(
            (evento?.produtos ?? []).map((p) => (selecao.tem(p.produtoId) ? { ...p, ativo } : p)),
            ativo ? TEXTOS.lote.voltaram : TEXTOS.lote.pausados,
        );
    const removerSelecionados = () =>
        emLote(
            (evento?.produtos ?? []).filter((p) => !selecao.tem(p.produtoId)),
            TEXTOS.lote.removidos,
        );

    const botaoAdicionar = (
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setAdicionando(true)} isDisabled={carregando}>
            {TEXTOS.adicionar}
        </Button>
    );

    return (
        // Rail, menu, título e abas ficam no LayoutDeItens: trocar de aba troca só este conteúdo.
        <>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {/* A ação da aba fica abaixo das abas, à esquerda, com a contagem ao lado (BKS-25). Vazio, os dois saem: o estado vazio já diz e já tem a ação. */}
                <h2 className="sr-only">{TEXTOS.titulo}</h2>
                {carregando ? (
                    <span aria-hidden="true" className="h-4 w-40 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                ) : (
                    !vazio && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {botaoAdicionar}
                            <p className="text-sm text-tertiary">{plural(TEXTOS.produtosNoEvento, produtos.length)}</p>
                        </div>
                    )
                )}

                {/* Lista do Backstage (BKS-110 a BKS-118): barra, cartão, linhas, paginação e estados. */}
                <section aria-label={TEXTOS.listaDeProdutos} className="flex flex-col gap-4">
                    {carregando ? (
                        <CarregandoTabela rotulo={TEXTOS.carregando} />
                    ) : vazio ? (
                        <VazioDaTabela icone={ShoppingBag01} titulo={TEXTOS.vazioTitulo} texto={TEXTOS.vazioDica} acao={botaoAdicionar} />
                    ) : (
                        <>
                            <BarraDaLista
                                busca={{ valor: busca, onChange: (v) => aoFiltrar(() => setBusca(v)), placeholder: TEXTOS.buscar }}
                                filtro={
                                    opcoesDeEstado.length > 2 && (
                                        <ButtonGroup
                                            size="sm"
                                            aria-label={TEXTOS.filtroEstado}
                                            selectedKeys={new Set([estado])}
                                            onSelectionChange={(k) => aoFiltrar(() => setEstado(([...k][0] as EstadoItem | "todos") ?? "todos"))}
                                            disallowEmptySelection
                                        >
                                            {opcoesDeEstado.map((o) => (
                                                <ButtonGroupItem key={o.id} id={o.id}>
                                                    {o.label}
                                                </ButtonGroupItem>
                                            ))}
                                        </ButtonGroup>
                                    )
                                }
                            />
                            <CartaoDaTabela>
                                <CabecalhoDaTabela>
                                    {comSelecao && <span className="w-4 shrink-0" />}
                                    <span className="min-w-0 flex-1">{TEXTOS.colProduto}</span>
                                    <span className="w-28 text-right">{TEXTOS.colPreco}</span>
                                    <span className="w-32 text-right">{TEXTOS.colDisponivel}</span>
                                    <span className="w-32">{TEXTOS.colEstado}</span>
                                </CabecalhoDaTabela>
                                {filtrados.length === 0 ? (
                                    <SemResultados texto={TEXTOS.nenhumNoFiltro} onLimpar={limparBusca} />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {paginacao.visiveis.map((p) => (
                                            <LinhaDoProduto
                                                key={p.produto.id}
                                                item={p}
                                                onAbrir={() => navigate(`/backstage/catalogo/produtos/${p.produto.id}`)}
                                                selecao={comSelecao ? { marcado: selecao.tem(p.produto.id), onChange: (on) => selecao.alternar(p.produto.id, on) } : undefined}
                                            />
                                        ))}
                                    </ul>
                                )}
                                <RodapeDePaginacao {...paginacao} />
                            </CartaoDaTabela>
                        </>
                    )}
                </section>

                {comSelecao && (
                    <AcoesEmLote
                        selecionados={selecao.tamanho}
                        totalDoFiltro={filtrados.length}
                        onSelecionarTodos={() => selecao.definir(filtrados.map((p) => p.produto.id))}
                        onLimpar={selecao.limpar}
                    >
                        <Button color="secondary" size="sm" iconLeading={PauseCircle} onClick={() => definirAtivo(false)} isDisabled={salvando}>
                            {TEXTOS.lote.pausar}
                        </Button>
                        <Button color="secondary" size="sm" iconLeading={PlayCircle} onClick={() => definirAtivo(true)} isDisabled={salvando}>
                            {TEXTOS.lote.voltar}
                        </Button>
                        <Button color="secondary-destructive" size="sm" iconLeading={Trash01} onClick={() => setConfirmarRemocao(true)} isDisabled={salvando}>
                            {TEXTOS.lote.remover}
                        </Button>
                    </AcoesEmLote>
                )}
            </div>

            <ModalOverlay isOpen={confirmarRemocao} onOpenChange={(v) => !salvando && setConfirmarRemocao(v)} isDismissable={!salvando}>
                <Modal className="sm:max-w-[400px]">
                    <Dialog aria-label={plural(TEXTOS.lote.confirmarTitulo, selecao.tamanho)}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{plural(TEXTOS.lote.confirmarTitulo, selecao.tamanho)}</h2>
                                <p className="text-sm text-tertiary">{plural(TEXTOS.lote.confirmarDica, selecao.tamanho)}</p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" onClick={() => setConfirmarRemocao(false)} isDisabled={salvando}>
                                    {TEXTOS.lote.cancelar}
                                </Button>
                                <Button color="primary-destructive" size="md" onClick={removerSelecionados} isLoading={salvando}>
                                    {TEXTOS.lote.confirmar}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <AdicionarProdutos aberto={adicionando} onFechar={() => setAdicionando(false)} />
        </>
    );
}

/**
 * Uma linha da tabela (BKS-113): imagem e nome, preço, disponível e estado. O nome é o botão que abre
 * o produto e cobre a linha inteira; a caixa de seleção fica por cima. Estreito, vira bloco com rótulos.
 */
function LinhaDoProduto({
    item,
    onAbrir,
    selecao,
}: {
    item: ProdutoNoCatalogo;
    onAbrir: () => void;
    /** Só com mais de um produto no evento. */
    selecao?: { marcado: boolean; onChange: (on: boolean) => void };
}) {
    const { preco } = useTextosItens();
    const plural = usePlural();
    const { produto, noEvento } = item;

    return (
        <LinhaDaTabela
            interativa
            selecionada={selecao?.marcado}
            className="relative outline-focus-ring -outline-offset-2 has-[.abrir-linha:focus-visible]:outline-2"
        >
            {selecao && (
                <div className="flex h-10 items-center">
                    <CaixaDeSelecao rotulo={produto.nome} marcado={selecao.marcado} onChange={selecao.onChange} />
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <ImagemDoProduto produto={produto} />
                    <TituloDaLinha
                        titulo={
                            <button
                                type="button"
                                onClick={onAbrir}
                                aria-label={formatar(TEXTOS.abrir, { nome: produto.nome })}
                                className="abrir-linha max-w-full cursor-pointer truncate text-left outline-hidden after:absolute after:inset-0"
                            >
                                {produto.nome}
                            </button>
                        }
                    />
                </div>
                <Celula rotulo={TEXTOS.colPreco} numero className="font-semibold @min-[44rem]:w-28">
                    {preco(precoDoProduto(item))}
                </Celula>
                <Celula rotulo={TEXTOS.colDisponivel} numero className="@min-[44rem]:w-32">
                    {plural(TEXTOS.disponiveis, Math.max(0, noEvento.estoque))}
                </Celula>
                <Celula rotulo={TEXTOS.colEstado} className="items-center @min-[44rem]:w-32">
                    <EstadoBadge estado={estadoDoProduto(noEvento)} />
                </Celula>
            </div>
        </LinhaDaTabela>
    );
}

function ImagemDoProduto({ produto }: { produto: ProdutoDaOrganizacao }) {
    return (
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
            {produto.imagem ? (
                <img src={produto.imagem} alt="" aria-hidden="true" className="size-full object-cover" />
            ) : (
                <ShoppingBag01 className="size-5 text-fg-quaternary" aria-hidden="true" />
            )}
        </span>
    );
}

/**
 * Seletor de produtos da biblioteca (padrão "Add products"): o mesmo slideout de escolher em lista do catálogo
 * (`SeletorDeLista`, ITM-35): busca, marca vários e adiciona de uma vez. Os que já estão no evento aparecem
 * marcados e desabilitados, com "Já no evento".
 */
function AdicionarProdutos({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    const navigate = useNavigate();
    const plural = usePlural();
    const { t, preco } = useTextosItens();
    const { evento, biblioteca } = useCatalogo();
    const [salvando, setSalvando] = useState(false);
    const noEvento = useMemo(() => new Set((evento?.produtos ?? []).map((p) => p.produtoId)), [evento]);
    const opcoes = useMemo<OpcaoDeLista[]>(
        () =>
            biblioteca.map((p) => ({
                id: p.id,
                rotulo: p.nome,
                detalhe: preco(p.precoBase),
                midia: <ImagemDoProduto produto={p} />,
                fixa: noEvento.has(p.id) ? TEXTOS.modal.jaNoEvento : undefined,
            })),
        [biblioteca, noEvento, preco],
    );

    const adicionar = async (ids: string[]) => {
        if (!evento || ids.length === 0) return;
        // Entram pausados e sem estoque, pelo preço base: só vendem quando o produtor definir estoque e ligar.
        const novos: ProdutoNoEvento[] = ids.filter((id) => !noEvento.has(id)).map((produtoId) => ({ produtoId, estoque: 0, ativo: false }));
        setSalvando(true);
        try {
            await salvarProdutosDoEvento(evento, [...(evento.produtos ?? []), ...novos]);
            toast.success(plural(TEXTOS.modal.adicionados, novos.length));
            onFechar();
        } catch {
            toast.error(t.erroAoSalvar);
        } finally {
            setSalvando(false);
        }
    };

    if (!aberto) return null;
    return (
        <SeletorDeLista
            titulo={TEXTOS.modal.titulo}
            descricao={TEXTOS.modal.dica}
            opcoes={opcoes}
            selecionados={[]}
            vazio={TEXTOS.modal.bibliotecaVazia}
            rotuloConfirmar={TEXTOS.modal.confirmar}
            exigeSelecao
            salvando={salvando}
            acaoExtra={
                <Button color="link-color" size="sm" onClick={() => navigate("/backstage/produtos/novo")}>
                    {TEXTOS.modal.criarNovo}
                </Button>
            }
            onConfirmar={(ids) => void adicionar(ids)}
            onFechar={onFechar}
        />
    );
}
