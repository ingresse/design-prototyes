import { Fragment, type ReactNode, useDeferredValue, useId, useMemo, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay, SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { InputBase } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { formatar, useTextosItens } from "../data/textos-itens";
import { BotaoMostrarMais, LIMIAR_FERRAMENTAS, paraBusca, useMostrarMais } from "./escala";

/* ------------------------------------------------------------------ */
/*  Seletor de muitos itens (UI-LST-001, UI-LST-002)                   */
/*                                                                     */
/*  Para produtos, combos, Passkeys, venda vinculada e         */
/*  segmentações. Mesmo padrão do seletor de ingressos da abertura:    */
/*  slideout (tela cheia no celular, UI-NAV-001 e UI-NAV-003), busca,  */
/*  "N de M", "Selecionar todos do filtro", Todos ou Selecionados,     */
/*  "Mostrar mais" e resumo no rodapé. Com poucos itens, só a lista.   */
/* ------------------------------------------------------------------ */

export interface OpcaoDeLista {
    id: string;
    rotulo: string;
    /** Contexto que diferencia itens parecidos (setor, sessão). */
    apoio?: string;
    /** Segunda linha de apoio (ex.: preço e quantos restam). Não entra na busca; como função, só é calculada para as linhas na tela (milhares de opções). */
    detalhe?: string | (() => string);
    /** Já escolhida antes e fora do alcance desta escolha: aparece marcada e desabilitada, com o motivo (ex.: "Já no evento"). */
    fixa?: string;
    /** Imagem ou ícone à esquerda do nome. */
    midia?: ReactNode;
    /** Título do bloco em que a opção aparece (ex.: Ingressos, Produtos); opções do mesmo bloco ficam juntas. */
    secao?: string;
}

const T = {
    buscar: "Buscar",
    contagem: "{visiveis} de {total}",
    selecionarTodos: "Selecionar todos os {n} do filtro",
    limpar: "Limpar seleção",
    filtro: "Mostrar",
    todos: "Todos",
    soSelecionados: "Selecionados",
    selecionados: { one: "{n} selecionado", other: "{n} selecionados" },
    nada: "Nada encontrado. Tente outro termo.",
    nadaSelecionado: "Nada selecionado.",
    cancelar: "Cancelar",
    confirmar: "Confirmar",
};

/**
 * Busca, "N de M", "Selecionar todos do filtro", Todos ou Selecionados e a lista com "Mostrar mais", sem
 * moldura e com a seleção controlada por quem usa. Por padrão, uma coisa embaixo da outra; o slideout passa
 * `children` para deixar as ferramentas fora da rolagem. Usada também no painel da abertura (ABV-11).
 */
export function ListaDeOpcoes({
    opcoes,
    marcados,
    onMarcados,
    vazio,
    children,
}: {
    opcoes: OpcaoDeLista[];
    marcados: Set<string>;
    onMarcados: (proximos: Set<string>) => void;
    vazio: string;
    children?: (partes: { ferramentas: ReactNode; lista: ReactNode }) => ReactNode;
}) {
    const { numero } = useTextosItens();
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");
    const termo = paraBusca(useDeferredValue(busca).trim());
    const muitas = opcoes.length > LIMIAR_FERRAMENTAS;
    // O texto de busca de cada opção sai uma vez, não a cada tecla (UI-LST-002).
    const indice = useMemo(() => opcoes.map((o) => paraBusca(`${o.rotulo} ${o.apoio ?? ""}`)), [opcoes]);
    const filtradas = useMemo(() => {
        // Cada palavra precisa aparecer no nome ou no contexto ("pista 18 out").
        const palavras = termo.split(/\s+/).filter(Boolean);
        let lista = palavras.length ? opcoes.filter((_, i) => palavras.every((p) => indice[i].includes(p))) : opcoes;
        if (filtro === "selecionados") lista = lista.filter((o) => marcados.has(o.id) || !!o.fixa);
        return lista;
        // A seleção só refaz a lista no filtro "Selecionados".
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opcoes, indice, termo, filtro, filtro === "selecionados" ? marcados : null]);
    const marcaveis = useMemo(() => filtradas.filter((o) => !o.fixa), [filtradas]);
    const { visiveis, restantes, mostrarMais } = useMostrarMais(filtradas, 50);

    const alternar = (id: string, on: boolean) => {
        const prox = new Set(marcados);
        if (on) prox.add(id);
        else prox.delete(id);
        onMarcados(prox);
    };

    if (opcoes.length === 0) return <p className="text-sm text-tertiary">{vazio}</p>;

    const ferramentas = muitas ? (
        <div className="flex w-full flex-col gap-3">
            <InputBase
                size="sm"
                icon={SearchLg}
                aria-label={T.buscar}
                placeholder={T.buscar}
                value={busca}
                onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
            />
            <ButtonGroup
                size="sm"
                aria-label={T.filtro}
                selectedKeys={new Set([filtro])}
                onSelectionChange={(keys) => {
                    const v = [...keys][0];
                    if (v) setFiltro(v as typeof filtro);
                }}
                disallowEmptySelection
            >
                <ButtonGroupItem id="todos">{T.todos}</ButtonGroupItem>
                <ButtonGroupItem id="selecionados">{T.soSelecionados}</ButtonGroupItem>
            </ButtonGroup>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-tertiary tabular-nums" role="status">
                    {formatar(T.contagem, { visiveis: numero(filtradas.length), total: numero(opcoes.length) })}
                </span>
                <span className="flex gap-3">
                    {filtro === "todos" && marcaveis.length > 0 && (
                        <Button color="link-color" size="sm" onClick={() => onMarcados(new Set([...marcados, ...marcaveis.map((o) => o.id)]))}>
                            {formatar(T.selecionarTodos, { n: numero(marcaveis.length) })}
                        </Button>
                    )}
                    {marcados.size > 0 && (
                        <Button color="link-gray" size="sm" onClick={() => onMarcados(new Set())}>
                            {T.limpar}
                        </Button>
                    )}
                </span>
            </div>
        </div>
    ) : null;

    const lista = (
        <>
            <ul className="flex flex-col gap-1">
                {visiveis.map((o, i) => (
                    <Fragment key={o.id}>
                        {/* Blocos (Ingressos, Produtos): o título aparece onde o bloco começa. */}
                        {o.secao && o.secao !== visiveis[i - 1]?.secao && (
                            <li aria-hidden="true" className={cx("px-2 pb-1 text-sm font-semibold text-primary", i > 0 && "pt-4")}>
                                {o.secao}
                            </li>
                        )}
                        <li>
                            {/* A linha inteira marca e desmarca, com o cursor de clique; a fixa fica marcada e desabilitada, com o motivo. */}
                            <Checkbox
                                label={
                                    o.midia ? (
                                        <span className="flex min-w-0 items-center gap-3">
                                            {o.midia}
                                            <span className="min-w-0">{o.rotulo}</span>
                                        </span>
                                    ) : (
                                        o.rotulo
                                    )
                                }
                                aria-label={o.midia ? o.rotulo : undefined}
                                hint={
                                    o.apoio || o.detalhe || o.fixa ? (
                                        <>
                                            {o.apoio && <span className="block">{o.apoio}</span>}
                                            {(o.fixa || o.detalhe) && <span className="block">{o.fixa ?? (typeof o.detalhe === "function" ? o.detalhe() : o.detalhe)}</span>}
                                        </>
                                    ) : undefined
                                }
                                isSelected={!!o.fixa || marcados.has(o.id)}
                                isDisabled={!!o.fixa}
                                onChange={(on) => alternar(o.id, on)}
                                className="w-full cursor-pointer rounded-lg px-2 py-2 transition duration-100 ease-linear hover:bg-primary_hover"
                            />
                        </li>
                    </Fragment>
                ))}
            </ul>
            {filtradas.length === 0 && <p className="px-2 py-2 text-sm text-tertiary">{filtro === "selecionados" && !termo ? T.nadaSelecionado : T.nada}</p>}
            <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} passo={50} />
        </>
    );

    if (children) return <>{children({ ferramentas, lista })}</>;
    return (
        <div className="flex flex-col gap-3">
            {ferramentas}
            <div className="flex flex-col gap-1">{lista}</div>
        </div>
    );
}

export function SeletorDeLista({
    titulo,
    descricao,
    opcoes,
    selecionados: inicial,
    vazio,
    rotuloConfirmar = T.confirmar,
    exigeSelecao = false,
    salvando = false,
    acaoExtra,
    onConfirmar,
    onFechar,
}: {
    titulo: string;
    descricao?: string;
    opcoes: OpcaoDeLista[];
    selecionados: string[];
    /** Texto quando não há nenhuma opção (ex.: "Crie Passkeys em Ingressos e produtos › Passkey."). */
    vazio: string;
    /** Texto do botão principal (padrão "Confirmar"); diga a ação, ex.: "Duplicar". */
    rotuloConfirmar?: string;
    /** Sem nada marcado, o botão principal fica desabilitado (ex.: escolher destino). */
    exigeSelecao?: boolean;
    /** Gravando: o botão principal mostra o carregando e o painel não fecha. */
    salvando?: boolean;
    /** Ação secundária no rodapé, à esquerda (ex.: "Criar produto na organização"). */
    acaoExtra?: ReactNode;
    onConfirmar: (ids: string[]) => void;
    onFechar: () => void;
}) {
    const { plural } = useTextosItens();
    const [marcados, setMarcados] = useState(() => new Set(inicial));
    const tituloId = useId();
    const fechar = () => !salvando && onFechar();

    return (
        // Peças do painel lateral do DS montadas aqui para o painel ter o nome do título e o "Fechar" em português
        // (SEG-64): o SlideoutMenu pronto fixa "Slideout menu" e "Close".
        // z-50: acima do cabeçalho fixo do Backstage; pl-0: tela cheia no celular (UI-NAV-003).
        <ModalOverlay isOpen isDismissable={!salvando} onOpenChange={(v) => !v && fechar()} className="z-50 pl-0">
            <Modal>
                <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
            <header className="relative z-1 flex w-full flex-col gap-1 px-4 pt-6 pb-4 md:px-6">
                <AriaHeading id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                    {titulo}
                </AriaHeading>
                {descricao && <p className="text-sm text-tertiary">{descricao}</p>}
                <CloseButton size="sm" label="Fechar" className="absolute top-3 right-3 shrink-0" onPress={fechar} />
            </header>

            {opcoes.length === 0 ? (
                <SlideoutMenu.Content>
                    <p className="text-sm text-tertiary">{vazio}</p>
                </SlideoutMenu.Content>
            ) : (
                <ListaDeOpcoes opcoes={opcoes} marcados={marcados} onMarcados={setMarcados} vazio={vazio}>
                    {({ ferramentas, lista }) => (
                        <>
                            {ferramentas && <div className="w-full px-4 pb-4 md:px-6">{ferramentas}</div>}
                            <SlideoutMenu.Content className="gap-1 border-t border-secondary pt-3 pb-4">{lista}</SlideoutMenu.Content>
                        </>
                    )}
                </ListaDeOpcoes>
            )}

            <SlideoutMenu.Footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-tertiary" role="status">
                        {plural(T.selecionados, marcados.size)}
                    </span>
                    {acaoExtra}
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md" onClick={fechar} isDisabled={salvando}>
                        {T.cancelar}
                    </Button>
                    <Button color="primary" size="md" isLoading={salvando} isDisabled={exigeSelecao && marcados.size === 0} onClick={() => onConfirmar([...marcados])}>
                        {rotuloConfirmar}
                    </Button>
                </div>
            </SlideoutMenu.Footer>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
