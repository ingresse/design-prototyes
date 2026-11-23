import { useCallback, useDeferredValue, useMemo, useState, type FC, type ReactNode } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Package, SearchLg, ShoppingCart01, Trash01 } from "@untitledui/icons";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { useNavegarNoPainel } from "../../components/painel";
import { BackstageLayout } from "../../components/Backstage";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { PainelDePassos } from "../../components/painel-de-passos";
import { AvisoDeEscala, BotaoMostrarMais, paraBusca, useMostrarMais } from "../../itens/components/escala";
import { CortesiaSelectionPanel } from "../components/CortesiaSelectionPanel";
import { MAX_SELECTIONS, type ComboEntry, type GroupSection, type ProductEntry, type SessionSection } from "../data/cortesia-items";
import { useCatalogoDeCortesia } from "../data/plataforma";
import { useAvisoAoSair, useRascunhoDaEmissao } from "../data/rascunho-da-emissao";

/** Etapas da emissão de cortesia, as mesmas nos três passos (COR-50). */
export const ETAPAS_DA_EMISSAO = ["Itens", "Destinatários", "Verificação final"];
export const TITULO_DA_EMISSAO = "Emitir cortesia";

/** Quantas sessões e quantos grupos aparecem antes do "Mostrar mais" (UI-LST-001). */
const PASSO_SESSOES = 20;
const PASSO_GRUPOS = 30;
const PASSO_INGRESSOS = 50;

export function SelecaoItens() {
    const navigate = useNavegarNoPainel();
    // Ingressos, produtos e combos do evento em contexto, do banco ou do catálogo simulado (COR-22, COR-54).
    const { sessoes: SESSIONS, produtos: PRODUCTS, combos: COMBOS } = useCatalogoDeCortesia();
    // O escolhido fica na sessão do navegador (COR-53): recarregar ou voltar não perde.
    const { rascunho, mudar, descartar, temAlgo } = useRascunhoDaEmissao();
    useAvisoAoSair(temAlgo);
    const selectedIds = useMemo(() => new Set(rascunho.itemIds), [rascunho.itemIds]);
    const setSelectedIds = useCallback((fn: (prev: Set<string>) => Set<string>) => mudar((atual) => ({ itemIds: [...fn(new Set(atual.itemIds))] })), [mudar]);

    const [searchQuery, setSearchQuery] = useState("");
    const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
    // Sessões e grupos nascem fechados (COR-55); guarda o que a pessoa abriu.
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
    const alternar = useCallback((id: string) => {
        setAbertos((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelection = useCallback(
        (id: string, isSelected: boolean) =>
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (isSelected) {
                    if (next.size >= MAX_SELECTIONS) return prev;
                    next.add(id);
                } else next.delete(id);
                return next;
            }),
        [setSelectedIds],
    );
    const removeManySelections = useCallback(
        (ids: string[]) =>
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const id of ids) next.delete(id);
                return next;
            }),
        [setSelectedIds],
    );
    const removeSelection = useCallback((id: string) => removeManySelections([id]), [removeManySelections]);

    const canAdvance = selectedIds.size > 0;
    const reachedLimit = selectedIds.size >= MAX_SELECTIONS;

    const handleAdvance = useCallback(() => {
        if (canAdvance) navigate("/backstage/destinatarios");
    }, [canAdvance, navigate]);

    // Voltar com algo escolhido pergunta antes de descartar (COR-53).
    const sair = useCallback(() => {
        descartar();
        navigate("/backstage/cortesias");
    }, [descartar, navigate]);
    const handleBack = useCallback(() => (temAlgo ? setConfirmandoDescarte(true) : sair()), [temAlgo, sair]);

    const query = paraBusca(useDeferredValue(searchQuery).trim());
    const buscando = query !== "";

    const filteredSessions = useMemo(() => {
        if (!query) return SESSIONS;
        const casa = (t: string) => paraBusca(t).includes(query);
        return SESSIONS.map((session) => ({
            ...session,
            groups: session.groups
                .map((group) => ({ ...group, tickets: group.tickets.filter((t) => casa(t.name) || casa(t.type) || casa(group.name) || casa(session.datetime)) }))
                .filter((g) => g.tickets.length > 0),
        })).filter((s) => s.groups.length > 0);
    }, [query, SESSIONS]);
    const filteredProducts = useMemo(() => (query ? PRODUCTS.filter((p) => paraBusca(p.name).includes(query)) : PRODUCTS), [query, PRODUCTS]);
    const filteredCombos = useMemo(
        () =>
            query ? COMBOS.filter((c) => paraBusca(c.name).includes(query) || paraBusca(c.subtitle).includes(query) || c.subItems.some((i) => paraBusca(i.name).includes(query))) : COMBOS,
        [query, COMBOS],
    );

    const sessoesVisiveis = useMostrarMais(filteredSessions, PASSO_SESSOES);
    // Com a busca, sessão e grupo abrem sozinhos (até 3 sessões, para não desenhar milhares de linhas).
    const abertoPelaBusca = buscando && filteredSessions.length <= 3;
    const estaAberto = (id: string) => abertoPelaBusca || abertos.has(id);

    const contagem = `${selectedIds.size} de ${MAX_SELECTIONS} cortesias selecionadas`;

    return (
        <BackstageLayout activeSection="cortesias" activeItem="emissao-cortesias">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <PainelDePassos
                    titulo={TITULO_DA_EMISSAO}
                    passos={ETAPAS_DA_EMISSAO}
                    atual={0}
                    lateral={
                        <CortesiaSelectionPanel
                            selectedIds={selectedIds}
                            onRemove={removeSelection}
                            onRemoveMany={removeManySelections}
                            className="max-h-[calc(100vh-22rem)] min-h-60"
                        />
                    }
                    resumoNoCelular={
                        // A contagem do escolhido fica no pé, junto do Avançar (COR-21).
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-primary" aria-live="polite">
                                {contagem}
                            </p>
                            {selectedIds.size > 0 && (
                                <Button size="sm" color="link-gray" iconLeading={Trash01} onClick={() => removeManySelections([...selectedIds])} className="min-h-11">
                                    Remover todos
                                </Button>
                            )}
                        </div>
                    }
                    rodapeFim={
                        <>
                            <Button size="md" color="secondary" iconLeading={ChevronLeft} onClick={handleBack}>
                                Voltar
                            </Button>
                            <Button size="md" color="primary" iconTrailing={ChevronRight} isDisabled={!canAdvance} onClick={handleAdvance}>
                                Avançar
                            </Button>
                        </>
                    }
                >
                    <AvisoDeEscala />
                    <section className="flex min-w-0 flex-col gap-4">
                        <Input icon={SearchLg} label="Buscar itens" placeholder="Busque por nome de grupo, item ou lote" value={searchQuery} onChange={setSearchQuery} />

                        {sessoesVisiveis.visiveis.map((session) => (
                            <Recolhivel
                                key={session.id}
                                icon={Calendar}
                                title={session.datetime}
                                contagem={contarNaSessao(session, selectedIds)}
                                total={session.groups.length}
                                rotuloDoTotal={(n) => (n === 1 ? "1 grupo" : `${n} grupos`)}
                                isOpen={estaAberto(`s:${session.id}`)}
                                onToggle={() => alternar(`s:${session.id}`)}
                            >
                                <GruposDaSessao
                                    session={session}
                                    selectedIds={selectedIds}
                                    onToggle={toggleSelection}
                                    reachedLimit={reachedLimit}
                                    estaAberto={estaAberto}
                                    alternar={alternar}
                                />
                            </Recolhivel>
                        ))}
                        <BotaoMostrarMais restantes={sessoesVisiveis.restantes} onClick={sessoesVisiveis.mostrarMais} passo={PASSO_SESSOES} />

                        {filteredCombos.length > 0 && (
                            <Recolhivel
                                icon={Package}
                                title="Combos"
                                contagem={filteredCombos.filter((c) => selectedIds.has(c.id)).length}
                                total={filteredCombos.length}
                                rotuloDoTotal={(n) => (n === 1 ? "1 combo" : `${n} combos`)}
                                isOpen={buscando || abertos.has("combos")}
                                onToggle={() => alternar("combos")}
                            >
                                <CombosContent combos={filteredCombos} selectedIds={selectedIds} onToggle={toggleSelection} reachedLimit={reachedLimit} />
                            </Recolhivel>
                        )}

                        {filteredProducts.length > 0 && (
                            <Recolhivel
                                icon={ShoppingCart01}
                                title="Produtos"
                                contagem={filteredProducts.filter((p) => selectedIds.has(p.id)).length}
                                total={filteredProducts.length}
                                rotuloDoTotal={(n) => (n === 1 ? "1 produto" : `${n} produtos`)}
                                isOpen={buscando || abertos.has("produtos")}
                                onToggle={() => alternar("produtos")}
                            >
                                <ProductsContent products={filteredProducts} selectedIds={selectedIds} onToggle={toggleSelection} reachedLimit={reachedLimit} />
                            </Recolhivel>
                        )}

                        {filteredSessions.length === 0 && filteredProducts.length === 0 && filteredCombos.length === 0 && (
                            <p role="status" className="rounded-lg bg-secondary px-4 py-8 text-center text-sm text-tertiary">
                                Nenhum item corresponde à busca.
                            </p>
                        )}
                    </section>
                </PainelDePassos>
            </div>
            <ModalDeConfirmacao
                aberto={confirmandoDescarte}
                titulo="Descartar a emissão?"
                descricao={`Os ${selectedIds.size === 1 ? "item escolhido" : `${selectedIds.size} itens escolhidos`}${rascunho.emails.length > 0 ? " e os e-mails" : ""} serão perdidos.`}
                confirmar="Descartar"
                cancelar="Continuar emitindo"
                destrutiva
                onConfirmar={sair}
                onFechar={() => setConfirmandoDescarte(false)}
            />
        </BackstageLayout>
    );
}

/** Quantos itens escolhidos há na sessão (os ids de ingresso começam com `c:<sessão>:`). */
function contarNaSessao(session: SessionSection, selecionados: Set<string>) {
    const prefixo = `c:${session.id}:`;
    let n = 0;
    for (const id of selecionados) if (id.startsWith(prefixo)) n++;
    return n;
}

/* ------------------------------------------------------------------ */
/*  Grupo recolhível                                                   */
/*                                                                     */
/*  Composto do DS com o desenho do Accordion (`application/accordion`:*/
/*  borda secundária, cabeçalho em botão com a seta, conteúdo que abre */
/*  deslizando a altura com o Surgir). Fica aqui porque o Accordion do */
/*  DS não deixa a tela abrir um item (a busca abre os grupos achados).*/
/* ------------------------------------------------------------------ */

interface RecolhivelProps {
    icon?: FC<{ className?: string }>;
    title: string;
    /** Itens escolhidos dentro dele. */
    contagem: number;
    total: number;
    rotuloDoTotal: (n: number) => string;
    isOpen: boolean;
    onToggle: () => void;
    nivel?: "sessao" | "grupo";
    children: ReactNode;
}

function Recolhivel({ icon: Icon, title, contagem, total, rotuloDoTotal, isOpen, onToggle, nivel = "sessao", children }: RecolhivelProps) {
    const reduzir = useReducedMotion();
    const grupo = nivel === "grupo";
    return (
        <div className={cx("flex flex-col overflow-hidden", grupo ? "rounded-lg ring-1 ring-secondary" : "rounded-xl bg-primary ring-1 ring-secondary")}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className={cx(
                    "flex min-h-11 items-center gap-3 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2",
                    grupo ? "px-3 py-2" : "px-4 py-3",
                )}
            >
                {Icon && <FeaturedIcon icon={Icon} color="gray" size="sm" theme="modern" />}
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cx("text-sm font-semibold text-primary", grupo && "font-medium")}>{title}</span>
                    <span className="text-sm text-tertiary">
                        {rotuloDoTotal(total)}
                        {contagem > 0 && <span className="font-medium text-brand-secondary">{`, ${contagem} ${contagem === 1 ? "escolhido" : "escolhidos"}`}</span>}
                    </span>
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={reduzir ? { duration: 0 } : { duration: 0.2 }} className="flex shrink-0">
                    <ChevronDown aria-hidden="true" className="size-4 text-fg-quaternary" />
                </motion.span>
            </button>
            {/* Abre e fecha deslizando a altura; fechado não desenha o conteúdo (UI-VIS-008, UI-LST-001). */}
            <Surgir visivel={isOpen}>
                <div className={cx("flex flex-col border-t border-secondary", grupo ? "gap-1 p-2" : "gap-3 p-3 md:p-4")}>{children}</div>
            </Surgir>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Conteúdo                                                           */
/* ------------------------------------------------------------------ */

interface ConteudoProps {
    selectedIds: Set<string>;
    onToggle: (id: string, isSelected: boolean) => void;
    reachedLimit: boolean;
}

function GruposDaSessao({
    session,
    estaAberto,
    alternar,
    ...props
}: ConteudoProps & { session: SessionSection; estaAberto: (id: string) => boolean; alternar: (id: string) => void }) {
    const grupos = useMostrarMais(session.groups, PASSO_GRUPOS);
    return (
        <>
            {grupos.visiveis.map((group, i) => {
                const chave = `g:${session.id}:${group.id ?? i}`;
                return (
                    <Recolhivel
                        key={chave}
                        nivel="grupo"
                        title={group.name}
                        contagem={group.tickets.filter((t) => props.selectedIds.has(t.id)).length}
                        total={group.tickets.length}
                        rotuloDoTotal={(n) => (n === 1 ? "1 ingresso" : `${n} ingressos`)}
                        isOpen={estaAberto(chave)}
                        onToggle={() => alternar(chave)}
                    >
                        <IngressosDoGrupo group={group} {...props} />
                    </Recolhivel>
                );
            })}
            <BotaoMostrarMais restantes={grupos.restantes} onClick={grupos.mostrarMais} passo={PASSO_GRUPOS} />
        </>
    );
}

function IngressosDoGrupo({ group, ...props }: ConteudoProps & { group: GroupSection }) {
    const ingressos = useMostrarMais(group.tickets, PASSO_INGRESSOS);
    return (
        <>
            {ingressos.visiveis.map((ticket) => (
                <LinhaDeEscolha key={ticket.id} id={ticket.id} label={ticket.name} hint={ticket.type} {...props} />
            ))}
            <BotaoMostrarMais restantes={ingressos.restantes} onClick={ingressos.mostrarMais} passo={PASSO_INGRESSOS} />
        </>
    );
}

function ProductsContent({ products, ...props }: ConteudoProps & { products: ProductEntry[] }) {
    return (
        <div className="flex flex-col gap-1">
            {products.map((product) => (
                <LinhaDeEscolha
                    key={product.id}
                    id={product.id}
                    label={
                        <span className="flex items-center gap-3">
                            <img src={product.imageUrl} alt="" className="size-9 shrink-0 rounded-md object-cover ring-1 ring-secondary" />
                            {product.name}
                        </span>
                    }
                    {...props}
                />
            ))}
        </div>
    );
}

function CombosContent({ combos, ...props }: ConteudoProps & { combos: ComboEntry[] }) {
    return (
        <div className="flex flex-col gap-1">
            {combos.map((combo) => (
                <LinhaDeEscolha
                    key={combo.id}
                    id={combo.id}
                    label={combo.name}
                    hint={
                        <span className="flex flex-col gap-1.5">
                            <span>{combo.subtitle}</span>
                            <ol className="flex flex-col gap-1">
                                {combo.subItems.map((item, i) => (
                                    <li key={`${combo.id}-${i}`} className="flex items-start gap-2 text-sm">
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-semibold text-secondary">{i + 1}</span>
                                        <span className="flex flex-col">
                                            <span>
                                                <span className="font-medium text-primary">{item.name}</span>
                                                {item.type && <span className="text-secondary">{`, ${item.type}`}</span>}
                                            </span>
                                            {item.date && <span>{item.date}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </span>
                    }
                    {...props}
                />
            ))}
        </div>
    );
}

/**
 * Uma escolha: o `Checkbox` do DS com `label` e `hint`, a linha inteira é o alvo (44 px no celular) e o
 * hover pinta a linha. Até 22/11/2026 a caixa ficava dentro de outro `<label>` e o clique marcava e
 * desmarcava na mesma hora (COR-25).
 */
function LinhaDeEscolha({ id, label, hint, selectedIds, onToggle, reachedLimit }: ConteudoProps & { id: string; label: ReactNode; hint?: ReactNode }) {
    const isSelected = selectedIds.has(id);
    const disabled = !isSelected && reachedLimit;
    return (
        <Checkbox
            isSelected={isSelected}
            isDisabled={disabled}
            onChange={(s: boolean) => onToggle(id, s)}
            label={label}
            hint={hint}
            className={cx(
                "w-full cursor-pointer rounded-md px-2 py-2 transition duration-100 ease-linear max-md:min-h-11 max-md:py-3",
                // A caixa do DS já fica com opacity-50 quando desativada; o texto acompanha.
                disabled ? "[&>div:last-child]:opacity-50" : "hover:bg-primary_hover",
            )}
        />
    );
}
