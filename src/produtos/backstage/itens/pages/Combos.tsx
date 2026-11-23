import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Package, PauseCircle, PlayCircle, Plus, Trash01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { Combo, Evento, ItemDoCombo, ProdutoDaOrganizacao, Sessao } from "@/plataforma";
import { EstadoBadge } from "../components/comuns";
import { AcoesEmLote, CaixaDeSelecao, paraBusca, useSelecao } from "../components/escala";
import { RodapeDePaginacao, usePaginacao } from "../../components/rodape-de-paginacao";
import { BarraDaLista, CabecalhoDaTabela, CarregandoTabela, CartaoDaTabela, Celula, LinhaDaTabela, SemResultados, TituloDaLinha, VazioDaTabela } from "../../components/tabela";
import { acharIngresso, disponivelDoCombo, estadoDoCombo, ingressosDo, nomeDoItem, produtosDo, salvarCombos, somaAvulsa, useCatalogo, type EstadoItem } from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";

/* ------------------------------------------------------------------ */
/*  Combos do evento: pacotes de ingressos e produtos já existentes,   */
/*  vendidos juntos pelo preço do combo.                               */
/*                                                                     */
/*  Lista do Backstage (BKS-110 a BKS-118): busca, filtro de estado em */
/*  botões segmentados, tabela que vira blocos no estreito, paginação  */
/*  acima de 10 e seleção com ações em lote.                           */
/* ------------------------------------------------------------------ */

/** Textos da lista de combos (UI-TXT-009). Plural por Intl.PluralRules. */
const TEXTOS = {
    titulo: "Combos",
    subtitulo: { one: "1 combo neste evento.", other: "{n} combos neste evento." },
    subtituloVazio: "Pacotes de ingressos e produtos vendidos juntos, com preço próprio.",
    criar: "Criar combo",
    lista: "Combos do evento",
    disponiveis: { zero: "Nenhum", one: "1 disponível", other: "{n} disponíveis" },
    economia: "{valor} a menos que avulso",
    vazio: "Nenhum combo ainda",
    vazioDica: "Junte ingressos e produtos num pacote com preço próprio.",
    semItens: "Primeiro crie ingressos ou adicione produtos",
    semItensDica: "O combo junta itens que o evento já vende. Crie ingressos ou adicione produtos ao evento para montar o primeiro.",
    irParaIngressos: "Criar ingressos",
    irParaProdutos: "Adicionar produtos",
    semItensNoCombo: "Nenhum item no combo",
    buscar: "Buscar por nome ou item do combo",
    estado: "Filtrar por estado",
    todos: "Todos",
    nenhumNoFiltro: "Nenhum combo encontrado.",
    colCombo: "Combo",
    colPreco: "Preço",
    colDisponivel: "Disponível",
    colEstado: "Estado",
    abrir: "Abrir {nome}",
    lote: {
        pausar: "Pausar",
        voltarAVender: "Voltar a vender",
        excluir: "Excluir",
        pausados: { one: "1 combo pausado.", other: "{n} combos pausados." },
        voltaram: { one: "1 combo voltou a vender.", other: "{n} combos voltaram a vender." },
        excluidos: { one: "1 combo excluído.", other: "{n} combos excluídos." },
        tituloExcluirUm: "Excluir {nome}?",
        tituloExcluir: { one: "Excluir 1 combo?", other: "Excluir {n} combos?" },
        dicaExcluir: "Os itens dos combos continuam à venda separadamente.",
        dicaExcluirUm: "Os itens do combo continuam à venda separadamente.",
        cancelar: "Cancelar",
        confirmar: { one: "Excluir combo", other: "Excluir {n} combos" },
    },
};

/** Contexto que diferencia ingressos de mesmo nome (UI-LST-001). */
const TEXTOS_CONTEXTO = {
    setorESessao: "{setor}, sessão de {sessao}",
    comContexto: "{nome} ({contexto})",
    composicao: "{n} {nome}",
};

type Plural = { zero?: string; one: string; other: string };

/**
 * Escolhe a forma do plural e preenche {n} e as outras variáveis da frase. Zero usa a forma
 * própria, se houver, ou a do plural ("0 disponíveis"): no pt-BR o Intl trata 0 como singular.
 */
export function usePlural() {
    const { locale, numero } = useTextosItens();
    return useMemo(() => {
        const regras = new Intl.PluralRules(locale);
        return (frase: Plural, n: number, vars: Record<string, string | number> = {}) =>
            formatar(n === 0 ? (frase.zero ?? frase.other) : regras.select(n) === "one" ? frase.one : frase.other, { ...vars, n: numero(n) });
    }, [locale, numero]);
}

/**
 * Contexto dos ingressos do evento: o setor e, se o evento tem mais de uma sessão, a data curta da
 * sessão ("Pista, sessão de 18 de out."). Duas sessões no mesmo dia levam a hora junto.
 */
export function contextoDosIngressos(ev: Evento | undefined, locale: string) {
    const sessoes: Sessao[] = ev?.sessoes ?? [];
    const dia = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const diaHora = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const dias = sessoes.map((s) => dia.format(new Date(s.inicio)));
    const contagem = new Map<string, number>();
    dias.forEach((d) => contagem.set(d, (contagem.get(d) ?? 0) + 1));
    const rotulos = new Map(sessoes.map((s, i) => [s.id, (contagem.get(dias[i]) ?? 0) > 1 ? diaHora.format(new Date(s.inicio)) : dias[i]]));
    const variasSessoes = sessoes.length > 1;
    return {
        variasSessoes,
        rotuloDaSessao: (sessaoId: string) => rotulos.get(sessaoId) ?? "",
        contexto: (setor: string, sessaoId: string) => (variasSessoes ? formatar(TEXTOS_CONTEXTO.setorESessao, { setor, sessao: rotulos.get(sessaoId) ?? "" }) : setor),
    };
}

/** Nome de um item do combo e o contexto que o diferencia (setor e sessão, nos ingressos). */
export function useRotuloDoItem() {
    const { locale } = useTextosItens();
    return useMemo(
        () => (itens: ItemDoCombo[], ev: Evento | undefined, biblioteca: ProdutoDaOrganizacao[]) => {
            const ctx = contextoDosIngressos(ev, locale);
            return itens.map((i) => {
                if (i.tipo !== "ingresso") return { nome: nomeDoItem(i, ev, biblioteca).nome, contexto: "" };
                const achado = acharIngresso(ev, i.id);
                return achado ? { nome: achado.tipo.nome, contexto: ctx.contexto(achado.setor.nome, achado.sessao.id) } : { nome: nomeDoItem(i, ev, biblioteca).nome, contexto: "" };
            });
        },
        [locale],
    );
}

/**
 * Composição do combo em uma frase: "2 Inteira e 1 Copo oficial". Lista do idioma, com vírgulas
 * e "e", sem símbolo separador (UI-TXT-010). Ingressos de mesmo nome levam o setor e, com várias
 * sessões, a sessão: "1 Inteira (Pista, sessão de 18 de out.) e 1 Inteira (Camarote, ...)".
 */
export function useComposicao() {
    const { locale, numero } = useTextosItens();
    const rotulos = useRotuloDoItem();
    return useMemo(() => {
        const lista = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
        return (c: Pick<Combo, "itens">, ev: Evento | undefined, biblioteca: ProdutoDaOrganizacao[]) => {
            const nomes = rotulos(c.itens, ev, biblioteca);
            const repetido = (nome: string) => nomes.filter((x) => x.nome === nome).length > 1;
            return lista.format(
                c.itens.map((i, idx) => {
                    const { nome, contexto } = nomes[idx];
                    const rotulo = repetido(nome) && contexto ? formatar(TEXTOS_CONTEXTO.comContexto, { nome, contexto }) : nome;
                    return formatar(TEXTOS_CONTEXTO.composicao, { n: numero(i.quantidade), nome: rotulo });
                }),
            );
        };
    }, [locale, numero, rotulos]);
}

export function Combos() {
    const navigate = useNavigate();
    const plural = usePlural();
    const rotuloDoItem = useRotuloDoItem();
    const { t } = useTextosItens();
    const { carregando, evento, biblioteca, vendidos } = useCatalogo();
    const combos = useMemo(() => evento?.combos ?? [], [evento]);
    // Sem ingresso nem produto não há o que juntar: o vazio aponta onde criar primeiro.
    const temItens = ingressosDo(evento).length > 0 || produtosDo(evento, biblioteca).length > 0;
    const criar = () => navigate("/backstage/catalogo/combos/novo");

    /* ---------- busca, filtro e página ---------- */
    const [busca, setBusca] = useState("");
    const [estado, setEstado] = useState<"todos" | EstadoItem>("todos");
    const linhas = useMemo(
        () =>
            combos.map((combo) => ({
                combo,
                estado: estadoDoCombo(combo, evento, vendidos),
                // Busca pelo nome do combo e pelos itens, com setor e sessão dos ingressos.
                busca: paraBusca([combo.nome, ...rotuloDoItem(combo.itens, evento, biblioteca).map((r) => `${r.nome} ${r.contexto}`)].join(" ")),
            })),
        [combos, evento, vendidos, biblioteca, rotuloDoItem],
    );
    const termo = paraBusca(busca.trim());
    const filtrados = useMemo(() => linhas.filter((l) => (!termo || l.busca.includes(termo)) && (estado === "todos" || l.estado === estado)), [linhas, termo, estado]);
    // Busca, filtro ou tamanho mudou: volta à página 1 (BKS-114).
    const paginacao = usePaginacao(filtrados, [termo, estado]);
    // Só os estados que aparecem na lista.
    const opcoesDeEstado = [
        { id: "todos", label: TEXTOS.todos },
        ...(Object.keys(t.estado) as EstadoItem[]).filter((e) => linhas.some((l) => l.estado === e)).map((e) => ({ id: e, label: t.estado[e] })),
    ];
    const limparFiltros = () => {
        setBusca("");
        setEstado("todos");
    };

    /* ---------- seleção e ações em lote ---------- */
    const comSelecao = combos.length > 1;
    const selecao = useSelecao();
    const selecionados = combos.filter((c) => selecao.tem(c.id));
    const [confirmarExclusao, setConfirmarExclusao] = useState(false);
    const [gravando, setGravando] = useState(false);

    // Cada ação em lote é uma gravação só, com a lista inteira de combos.
    const aplicar = async (proxima: Combo[], feito: Plural, n: number) => {
        if (!evento) return false;
        setGravando(true);
        try {
            await salvarCombos(evento, proxima);
            toast.success(plural(feito, n));
            selecao.limpar();
            return true;
        } catch {
            toast.error(t.erroAoSalvar);
            return false;
        } finally {
            setGravando(false);
        }
    };
    const pausar = () =>
        aplicar(
            combos.map((c) => (selecao.tem(c.id) ? { ...c, ativo: false } : c)),
            TEXTOS.lote.pausados,
            selecionados.filter((c) => c.ativo).length,
        );
    const voltarAVender = () =>
        aplicar(
            combos.map((c) => (selecao.tem(c.id) ? { ...c, ativo: true } : c)),
            TEXTOS.lote.voltaram,
            selecionados.filter((c) => !c.ativo).length,
        );
    const excluir = async () => {
        if (await aplicar(combos.filter((c) => !selecao.tem(c.id)), TEXTOS.lote.excluidos, selecionados.length)) setConfirmarExclusao(false);
    };

    return (
        // Rail, menu, título e abas ficam no LayoutDeItens: trocar de aba troca só este conteúdo.
        <>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {/* A ação da aba fica abaixo das abas, à esquerda, com a contagem ao lado (BKS-25). Vazio, o estado vazio diz e tem a ação. */}
                <h2 className="sr-only">{TEXTOS.titulo}</h2>
                {carregando ? (
                    <span aria-hidden="true" className="h-4 w-40 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                ) : (
                    combos.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {/* Sem itens no evento, criar combo levaria a uma tela sem o que escolher (UI-EST-005). */}
                            {temItens && (
                                <Button size="md" color="primary" iconLeading={Plus} onClick={criar}>
                                    {TEXTOS.criar}
                                </Button>
                            )}
                            <p className="text-sm text-tertiary">{plural(TEXTOS.subtitulo, combos.length)}</p>
                        </div>
                    )
                )}

                <section aria-label={TEXTOS.lista} className="flex flex-col gap-4">
                    {carregando ? (
                        <CarregandoTabela />
                    ) : combos.length === 0 ? (
                        <VazioDaTabela
                            icone={Package}
                            titulo={temItens ? TEXTOS.vazio : TEXTOS.semItens}
                            texto={temItens ? TEXTOS.vazioDica : TEXTOS.semItensDica}
                            acao={
                                temItens ? (
                                    <Button size="md" color="primary" iconLeading={Plus} onClick={criar}>
                                        {TEXTOS.criar}
                                    </Button>
                                ) : (
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                        <Button size="md" color="secondary" onClick={() => navigate("/backstage/catalogo/produtos")}>
                                            {TEXTOS.irParaProdutos}
                                        </Button>
                                        <Button size="md" color="primary" onClick={() => navigate("/backstage/catalogo/ingressos")}>
                                            {TEXTOS.irParaIngressos}
                                        </Button>
                                    </div>
                                )
                            }
                        />
                    ) : (
                        <>
                            <BarraDaLista
                                busca={{ valor: busca, onChange: setBusca, placeholder: TEXTOS.buscar }}
                                filtro={
                                    opcoesDeEstado.length > 2 && (
                                        <ButtonGroup
                                            size="sm"
                                            aria-label={TEXTOS.estado}
                                            selectedKeys={new Set([estado])}
                                            onSelectionChange={(k) => setEstado(([...k][0] as "todos" | EstadoItem) ?? "todos")}
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
                                    <span className="min-w-0 flex-1">{TEXTOS.colCombo}</span>
                                    <span className="w-52 text-right">{TEXTOS.colPreco}</span>
                                    <span className="w-32 text-right">{TEXTOS.colDisponivel}</span>
                                    <span className="w-28">{TEXTOS.colEstado}</span>
                                </CabecalhoDaTabela>
                                {filtrados.length === 0 ? (
                                    <SemResultados texto={TEXTOS.nenhumNoFiltro} onLimpar={limparFiltros} />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-secondary">
                                        {paginacao.visiveis.map(({ combo }) => (
                                            <LinhaDoCombo
                                                key={combo.id}
                                                combo={combo}
                                                onAbrir={() => navigate(`/backstage/catalogo/combos/${combo.id}`)}
                                                selecao={comSelecao ? { marcado: selecao.tem(combo.id), onChange: (on) => selecao.alternar(combo.id, on) } : null}
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
                        selecionados={selecionados.length}
                        totalDoFiltro={filtrados.length}
                        onSelecionarTodos={() => selecao.definir(filtrados.map((l) => l.combo.id))}
                        onLimpar={selecao.limpar}
                    >
                        {selecionados.some((c) => c.ativo) && (
                            <Button color="secondary" size="sm" iconLeading={PauseCircle} onClick={pausar} isDisabled={gravando}>
                                {TEXTOS.lote.pausar}
                            </Button>
                        )}
                        {selecionados.some((c) => !c.ativo) && (
                            <Button color="secondary" size="sm" iconLeading={PlayCircle} onClick={voltarAVender} isDisabled={gravando}>
                                {TEXTOS.lote.voltarAVender}
                            </Button>
                        )}
                        <Button color="secondary-destructive" size="sm" iconLeading={Trash01} onClick={() => setConfirmarExclusao(true)} isDisabled={gravando}>
                            {TEXTOS.lote.excluir}
                        </Button>
                    </AcoesEmLote>
                )}
            </div>

            <ModalOverlay isOpen={confirmarExclusao} onOpenChange={(v) => !v && !gravando && setConfirmarExclusao(false)} isDismissable={!gravando}>
                <Modal className="sm:max-w-[400px]">
                    <Dialog>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 slot="title" className="text-lg font-semibold break-words text-primary">
                                    {selecionados.length === 1 ? formatar(TEXTOS.lote.tituloExcluirUm, { nome: selecionados[0].nome }) : plural(TEXTOS.lote.tituloExcluir, selecionados.length)}
                                </h2>
                                <p className="text-sm text-tertiary">{selecionados.length === 1 ? TEXTOS.lote.dicaExcluirUm : TEXTOS.lote.dicaExcluir}</p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" onClick={() => setConfirmarExclusao(false)} isDisabled={gravando}>
                                    {TEXTOS.lote.cancelar}
                                </Button>
                                <Button color="primary-destructive" size="md" onClick={excluir} isLoading={gravando}>
                                    {plural(TEXTOS.lote.confirmar, selecionados.length)}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}

/**
 * Uma linha da tabela por combo (BKS-113): nome e composição, preço (e a economia), disponível e
 * estado. O nome é o botão que abre o combo e cobre a linha; a caixa de seleção fica por cima.
 */
function LinhaDoCombo({ combo, onAbrir, selecao }: { combo: Combo; onAbrir: () => void; selecao: { marcado: boolean; onChange: (on: boolean) => void } | null }) {
    const { evento, biblioteca, vendidos } = useCatalogo();
    const { preco } = useTextosItens();
    const plural = usePlural();
    const composicao = useComposicao();
    const avulso = somaAvulsa(combo, evento, biblioteca, vendidos);
    const economia = avulso - combo.preco;

    return (
        <LinhaDaTabela interativa selecionada={selecao?.marcado} className="relative outline-focus-ring -outline-offset-2 has-[.abrir-linha:focus-visible]:outline-2">
            {selecao && (
                <div className="flex h-5 items-center">
                    <CaixaDeSelecao rotulo={combo.nome} marcado={selecao.marcado} onChange={selecao.onChange} />
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2 @min-[44rem]:flex-row @min-[44rem]:items-center @min-[44rem]:gap-4">
                <TituloDaLinha
                    titulo={
                        <button
                            type="button"
                            onClick={onAbrir}
                            aria-label={formatar(TEXTOS.abrir, { nome: combo.nome })}
                            className="abrir-linha max-w-full cursor-pointer truncate text-left outline-hidden after:absolute after:inset-0"
                        >
                            {combo.nome}
                        </button>
                    }
                    // A composição quebra linha em vez de cortar: é o que diferencia combos parecidos.
                    apoio={<span className="whitespace-normal break-words">{combo.itens.length ? composicao(combo, evento, biblioteca) : TEXTOS.semItensNoCombo}</span>}
                />
                {/* A economia cabe numa linha na coluna (não quebra em três). */}
                <Celula rotulo={TEXTOS.colPreco} numero className="flex-wrap @min-[44rem]:w-52">
                    <span className="font-semibold @min-[44rem]:block">{preco(combo.preco)}</span>
                    {economia > 0 && <span className="whitespace-nowrap text-success-primary @min-[44rem]:block">{formatar(TEXTOS.economia, { valor: preco(economia) })}</span>}
                </Celula>
                <Celula rotulo={TEXTOS.colDisponivel} numero className="@min-[44rem]:w-32">
                    {plural(TEXTOS.disponiveis, disponivelDoCombo(combo, evento, vendidos))}
                </Celula>
                <Celula rotulo={TEXTOS.colEstado} className="items-center @min-[44rem]:w-28">
                    <EstadoBadge estado={estadoDoCombo(combo, evento, vendidos)} />
                </Celula>
            </div>
        </LinhaDaTabela>
    );
}
