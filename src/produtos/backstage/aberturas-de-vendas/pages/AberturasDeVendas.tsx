import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus01, Copy01, DotsVertical, Edit01, Plus, Trash01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { AberturaDeVendas, Evento, ItemDaAbertura, ProdutoDaOrganizacao } from "@/plataforma";
import { itensDaAbertura } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { paraBusca } from "../../itens/components/escala";
import { type OpcaoDeLista } from "../../itens/components/SeletorDeLista";
import { useResumoDeIngressos } from "../../components/seletor-de-ingressos";
import { PainelDaAbertura } from "../../components/painel-da-abertura";
import { novoId, produtosDo, salvarAberturas, useCatalogo } from "../../itens/data/catalogo";
import { formatar, useTextosItens } from "../../itens/data/textos-itens";
import { AbasDeItens } from "../../components/abas-de-itens";

/* ------------------------------------------------------------------ */
/*  Aberturas de vendas (ABV)                                          */
/*                                                                     */
/*  Quando os itens do evento vendem. Cada abertura tem nome, início,  */
/*  fim e os ingressos, produtos e combos incluídos. Lê e grava no     */
/*  evento (`Evento.aberturas`). Criar e editar acontecem num painel   */
/*  só, com nome, período e itens (ABV-11); duplicar e excluir gravam  */
/*  na hora.                                                           */
/* ------------------------------------------------------------------ */

type TipoDeItem = "ingresso" | "produto" | "combo";
const TIPOS: TipoDeItem[] = ["ingresso", "produto", "combo"];

const T = {
    titulo: "Aberturas de vendas",
    subtitulo: "Quando cada ingresso, produto e combo vende.",
    nova: "Nova abertura",
    buscar: "Buscar abertura",
    filtro: "Filtrar por estado",
    todas: "Todas",
    nada: "Nenhuma abertura encontrada.",
    colAbertura: "Abertura",
    colEstado: "Estado",
    colItens: "Itens",
    opcoes: "Opções de {nome}",
    contagemItens: { ingresso: { one: "{n} ingresso", other: "{n} ingressos" }, produto: { one: "{n} produto", other: "{n} produtos" }, combo: { one: "{n} combo", other: "{n} combos" } },
    vazio: "Nenhuma abertura programada",
    vazioDica: "Crie a primeira abertura para os ingressos, produtos e combos começarem a vender.",
    carregando: "Carregando aberturas",
    estados: { aberta: "Aberta agora", agendada: "Agendada", encerrada: "Encerrada" },
    periodo: "De {inicio} até {fim}",
    duplicar: "Duplicar {nome}",
    duplicarAcao: "Duplicar",
    excluirAcao: "Excluir",
    editar: "Editar {nome}",
    excluir: "Excluir {nome}",
    duplicada: "{nome} duplicada.",
    copia: "Cópia de {nome}",
    salvo: "Alterações salvas.",
    erro: "Tente de novo: não foi possível salvar.",
    semItens: "Escolha os itens: sem eles, esta abertura não vende nada.",
    abrir: "Abrir {nome}",
    grupos: {
        ingresso: { rotulo: "Ingressos", vazio: "Nenhum ingresso", botao: "Escolher ingressos", seletor: "Ingressos de {nome}", seletorVazio: "" },
        produto: { rotulo: "Produtos", vazio: "Nenhum produto", botao: "Escolher produtos", seletor: "Produtos de {nome}", seletorVazio: "O evento ainda não vende produtos." },
        combo: { rotulo: "Combos", vazio: "Nenhum combo", botao: "Escolher combos", seletor: "Combos de {nome}", seletorVazio: "O evento ainda não tem combos." },
    } satisfies Record<TipoDeItem, { rotulo: string; vazio: string; botao: string; seletor: string; seletorVazio: string }>,
    ingressoApoio: "{setor}, sessão de {sessao}",
    ingressoApoioUnico: "{setor}",
    confirmar: {
        titulo: "Excluir {nome}?",
        dica: "Os itens dela deixam de vender neste período. Esta ação não pode ser desfeita.",
        cancelar: "Cancelar",
        excluir: "Excluir",
        excluida: "{nome} excluída.",
    },
};

type Estado = keyof typeof T.estados;
const COR: Record<Estado, "success" | "blue" | "gray"> = { aberta: "success", agendada: "blue", encerrada: "gray" };

const estadoDa = (a: AberturaDeVendas, agora = new Date()): Estado =>
    new Date(a.inicio) > agora ? "agendada" : new Date(a.fim) < agora ? "encerrada" : "aberta";

/** Itens do evento por tipo, como opções do seletor, com contexto para nomes repetidos (UI-LST-001). */
function opcoesDeItens(evento: Evento | undefined, biblioteca: ProdutoDaOrganizacao[], dataCurta: (iso: string) => string): Record<TipoDeItem, OpcaoDeLista[]> {
    if (!evento) return { ingresso: [], produto: [], combo: [] };
    const variasSessoes = evento.sessoes.length > 1;
    return {
        ingresso: evento.sessoes.flatMap((s) =>
            s.grupos.flatMap((g) =>
                g.ingressos.map((t) => ({
                    id: t.id,
                    rotulo: t.nome,
                    apoio: variasSessoes ? formatar(T.ingressoApoio, { setor: g.nome, sessao: dataCurta(s.inicio) }) : formatar(T.ingressoApoioUnico, { setor: g.nome }),
                })),
            ),
        ),
        produto: produtosDo(evento, biblioteca).map(({ produto }) => ({ id: produto.id, rotulo: produto.nome })),
        combo: (evento.combos ?? []).map((c) => ({ id: c.id, rotulo: c.nome })),
    };
}


export function AberturasDeVendas() {
    const { carregando, evento, biblioteca } = useCatalogo();
    const { dataCurta, dataLonga } = useTextosItens();
    const aberturas = useMemo(() => [...(evento?.aberturas ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio)), [evento?.aberturas]);
    const opcoes = useMemo(() => opcoesDeItens(evento, biblioteca, dataCurta), [evento, biblioteca, dataCurta]);
    const rotuloDe = useMemo(() => {
        const m = new Map(TIPOS.flatMap((tipo) => opcoes[tipo].map((o) => [`${tipo}:${o.id}`, o.apoio ? `${o.rotulo} (${o.apoio})` : o.rotulo] as const)));
        return m;
    }, [opcoes]);
    /** Setor de cada ingresso, para o resumo "N ingressos em M setores". */
    const setorDoIngresso = useMemo(() => new Map((evento?.sessoes ?? []).flatMap((s) => s.grupos.flatMap((g) => g.ingressos.map((t) => [t.id, g.id] as const)))), [evento?.sessoes]);

    // Painel da abertura (ABV-11): sem abertura, cria uma nova.
    const [painel, setPainel] = useState<{ abertura?: AberturaDeVendas } | null>(null);
    const [excluir, setExcluir] = useState<AberturaDeVendas | null>(null);
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState<Estado | "todas">("todas");
    const termo = paraBusca(busca.trim());
    const filtradas = useMemo(
        () => aberturas.filter((a) => (!termo || paraBusca(a.nome).includes(termo)) && (filtro === "todas" || estadoDa(a) === filtro)),
        [aberturas, termo, filtro],
    );
    // Busca, filtro ou tamanho mudou: volta à página 1 (BKS-114).
    const paginacao = usePaginacao(filtradas, [termo, filtro]);
    const limparBusca = () => (setBusca(""), setFiltro("todas"));
    // Filtro só com os estados que aparecem na lista (e mais de um).
    const estadosNaLista = (Object.keys(T.estados) as Estado[]).filter((e) => aberturas.some((a) => estadoDa(a) === e));

    const gravar = async (lista: AberturaDeVendas[], mensagem = T.salvo) => {
        if (!evento) return false;
        try {
            await salvarAberturas(evento, lista);
            toast.success(mensagem);
            return true;
        } catch {
            toast.error(T.erro);
            return false;
        }
    };

    const duplicar = (a: AberturaDeVendas) => {
        const { configuracoes: _antigas, ...resto } = a;
        const copia = { ...resto, id: novoId("abv"), nome: formatar(T.copia, { nome: a.nome }), itens: itensDaAbertura(a) };
        void gravar([...aberturas, copia], formatar(T.duplicada, { nome: a.nome }));
    };

    return (
        <BackstageLayout activeSection="itens" activeItem="catalogo-aberturas">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <AbasDeItens
                    ativa="aberturas"
                    acoes={
                        aberturas.length > 0 && (
                            <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel({})}>
                                {T.nova}
                            </Button>
                        )
                    }
                />

                {/* Lista do Backstage (BKS-110 a BKS-118): barra, cartão, linhas, paginação e estados. */}
                {carregando ? (
                    <CarregandoTabela rotulo={T.carregando} linhas={2} />
                ) : aberturas.length === 0 ? (
                    <VazioDaTabela
                        icone={CalendarPlus01}
                        titulo={T.vazio}
                        texto={T.vazioDica}
                        acao={
                            <Button color="primary" size="md" iconLeading={Plus} onClick={() => setPainel({})}>
                                {T.nova}
                            </Button>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                        <BarraDaLista
                            busca={{ valor: busca, onChange: setBusca, placeholder: T.buscar }}
                            filtro={
                                estadosNaLista.length > 1 && (
                                    <ButtonGroup
                                        size="sm"
                                        aria-label={T.filtro}
                                        selectedKeys={new Set([filtro])}
                                        onSelectionChange={(k) => setFiltro(([...k][0] as Estado | "todas") ?? "todas")}
                                        disallowEmptySelection
                                    >
                                        <ButtonGroupItem id="todas">{T.todas}</ButtonGroupItem>
                                        {estadosNaLista.map((e) => (
                                            <ButtonGroupItem key={e} id={e}>
                                                {T.estados[e]}
                                            </ButtonGroupItem>
                                        ))}
                                    </ButtonGroup>
                                )
                            }
                        />
                        <CartaoDaTabela>
                            <CabecalhoDaTabela>
                                <span className="min-w-0 flex-1">{T.colAbertura}</span>
                                <span className="w-32">{T.colEstado}</span>
                                <span className="w-60">{T.colItens}</span>
                                <span className="w-17" />
                            </CabecalhoDaTabela>
                            {filtradas.length === 0 ? (
                                <SemResultados texto={T.nada} onLimpar={limparBusca} />
                            ) : (
                                <ul className="flex flex-col divide-y divide-secondary">
                                    {paginacao.visiveis.map((a) => (
                                        <LinhaDaAbertura
                                            key={a.id}
                                            abertura={a}
                                            rotuloDe={rotuloDe}
                                            setorDoIngresso={setorDoIngresso}
                                            onEditar={() => setPainel({ abertura: a })}
                                            onDuplicar={() => duplicar(a)}
                                            onExcluir={() => setExcluir(a)}
                                        />
                                    ))}
                                </ul>
                            )}
                            <RodapeDePaginacao {...paginacao} />
                        </CartaoDaTabela>
                    </div>
                )}
            </div>

            {painel && evento && <PainelDaAbertura evento={evento} biblioteca={biblioteca} abertura={painel.abertura} onFechar={() => setPainel(null)} />}

            <ModalOverlay isOpen={!!excluir} onOpenChange={(v) => !v && setExcluir(null)} isDismissable>
                <Modal className="sm:max-w-[400px]">
                    <Dialog aria-label={excluir ? formatar(T.confirmar.titulo, { nome: excluir.nome }) : undefined}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{excluir && formatar(T.confirmar.titulo, { nome: excluir.nome })}</h2>
                                <p className="text-sm text-tertiary">{T.confirmar.dica}</p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" onClick={() => setExcluir(null)}>
                                    {T.confirmar.cancelar}
                                </Button>
                                <Button
                                    color="primary-destructive"
                                    size="md"
                                    onClick={async () => {
                                        if (!excluir) return;
                                        if (await gravar(aberturas.filter((a) => a.id !== excluir.id), formatar(T.confirmar.excluida, { nome: excluir.nome }))) setExcluir(null);
                                    }}
                                >
                                    {T.confirmar.excluir}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

        </BackstageLayout>
    );
}

/**
 * Uma linha por abertura (BKS-113): nome e período, estado, os itens incluídos e as ações. O nome e o
 * lápis abrem o painel da abertura, com os itens (ABV-11); ⋮ duplica e exclui. Estreito, vira bloco com rótulos.
 */
function LinhaDaAbertura({
    abertura,
    rotuloDe,
    setorDoIngresso,
    onEditar,
    onDuplicar,
    onExcluir,
}: {
    abertura: AberturaDeVendas;
    rotuloDe: Map<string, string>;
    setorDoIngresso: Map<string, string>;
    onEditar: () => void;
    onDuplicar: () => void;
    onExcluir: () => void;
}) {
    const { quando, locale, plural } = useTextosItens();
    const resumirIngressos = useResumoDeIngressos();
    const estado = estadoDa(abertura);
    const itens = itensDaAbertura(abertura);
    const ingressos = itens.filter((i) => i.tipo === "ingresso");
    /**
     * Resumo dos itens: até 5 nomes; acima disso, a contagem por tipo, com ingressos em setores
     * ("60 ingressos em 7 setores"), que escala para milhares (UI-LST-002).
     */
    const resumo = (() => {
        if (itens.length === 0) return undefined;
        const lista = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
        if (itens.length <= 5) return lista.format(itens.map((i) => rotuloDe.get(`${i.tipo}:${i.id}`) ?? i.id));
        return lista.format(
            TIPOS.flatMap((tipo) => {
                const n = itens.filter((i) => i.tipo === tipo).length;
                if (!n) return [];
                if (tipo === "ingresso") return [resumirIngressos(ingressos.length, new Set(ingressos.map((i) => setorDoIngresso.get(i.id) ?? i.id)).size)];
                return [plural(T.contagemItens[tipo], n)];
            }),
        );
    })();
    const nome = abertura.nome;

    return (
        <LinhaDaTabela>
            <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                {/* O nome abre o painel da abertura, onde também se escolhem os itens (ABV-11). */}
                <button
                    type="button"
                    onClick={onEditar}
                    aria-label={formatar(T.abrir, { nome })}
                    className="flex min-w-0 flex-1 cursor-pointer rounded-md text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {/* O período quebra linha em vez de cortar no celular (M6). */}
                    <TituloDaLinha titulo={nome} apoio={<span className="whitespace-normal">{formatar(T.periodo, { inicio: quando(abertura.inicio), fim: quando(abertura.fim) })}</span>} />
                </button>
                <Celula rotulo={T.colEstado} className="items-center @min-[44rem]:w-32">
                    <Badge size="sm" type="pill-color" color={COR[estado]}>
                        {T.estados[estado]}
                    </Badge>
                </Celula>
                <Celula rotulo={T.colItens} className="@min-[44rem]:w-60">
                    {resumo ? <span className="break-words">{resumo}</span> : <span className="text-warning-primary">{T.semItens}</span>}
                </Celula>
            </div>
            <div className="flex shrink-0 gap-1 @min-[44rem]:w-17 @min-[44rem]:justify-end">
                <ButtonUtility size="sm" color="tertiary" icon={Edit01} tooltip={formatar(T.editar, { nome })} onClick={onEditar} />
                <Dropdown.Root>
                    <ButtonUtility size="sm" color="tertiary" icon={DotsVertical} tooltip={formatar(T.opcoes, { nome })} />
                    <Dropdown.Popover className="w-56" placement="bottom end">
                        <Dropdown.Menu
                            aria-label={formatar(T.opcoes, { nome })}
                            onAction={(k) => {
                                if (k === "duplicar") onDuplicar();
                                else if (k === "excluir") onExcluir();
                            }}
                        >
                            <Dropdown.Item id="duplicar" icon={Copy01} label={T.duplicarAcao} />
                            <Dropdown.Item id="excluir" icon={Trash01} label={T.excluirAcao} />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </div>
        </LinhaDaTabela>
    );
}
