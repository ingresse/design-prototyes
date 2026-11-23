import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, BookOpen01, ChevronDown, Copy01, Plus, SearchLg, Trash01, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Toggle } from "@/components/base/toggle/toggle";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { useTransicao } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { CAMPO, irParaCampo } from "../data/campos";
import { FORA_DO_ESCOPO, labelDe, TIPOS_DE_RESPOSTA, TITULO_FORMULARIO } from "../data/opcoes";
import { BIBLIOTECA, comPresenca, daBiblioteca, idsDasCategorias, novaOpcao, novaPergunta, opcoesADefinir, precisaDefinirEstoque, presencaNa, temOpcoes } from "../data/perguntas";
import type { Pergunta, Presenca, TipoDeResposta } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { CampoNumero, CampoSelect, CampoTexto, ErroDaLista } from "./campos";
import { useFormulario } from "./contexto";
import { CopiarPerguntasDeOutroEvento } from "./copiar-perguntas";
import { ItemDaArvore } from "./arvore-de-modalidades";
import { resumoDaCategoria } from "./secao-modalidades";
import { mover } from "./operacoes";
import { PreviaDoFormulario } from "./previa-formulario";
import { Alca, ProvedorDeOrdem, useOrdem } from "./reordenar";

/* ------------------------------------------------------------------ */
/*  Passo 3: Formulário de inscrição (v0.5, SCE-170 a SCE-174)         */
/*  Uma linha recolhida por pergunta (como o questionário do legado    */
/*  TS, no desenho do AWA): alça de arraste, número, título, tipo,     */
/*  onde aparece, "Obrigatória" e os avisos. Abrir a linha edita ali   */
/*  mesmo, na largura toda: título, tipo, obrigatória, opções com a    */
/*  quantidade disponível e as categorias vinculadas, agrupadas por    */
/*  modalidade. Perguntas com estoque vindas de outro evento pedem     */
/*  revisão (SCE-172). Sem modal de pergunta e sem quadro.             */
/* ------------------------------------------------------------------ */

const AJUDA_QUANTIDADE = "Quantas vezes a opção pode ser escolhida. Em branco, sem limite; nas opções que vieram de outro evento, defina um número ou escolha Sem limite. Quando acabar, a opção some do formulário.";

export function SecaoFormulario() {
    return (
        <ProvedorDeOrdem>
            <Conteudo />
        </ProvedorDeOrdem>
    );
}

function Conteudo() {
    const { rascunho: r, atualizar, abrirPergunta } = useFormulario();
    const { t } = useVocabulario();
    const ordem = useOrdem();
    const [duplicando, setDuplicando] = useState(false);
    const [biblioteca, setBiblioteca] = useState(false);
    const temCategorias = idsDasCategorias(r.modalidades).length > 0;
    const aRevisar = r.perguntas.filter(precisaDefinirEstoque);

    const nova = () => {
        const p = novaPergunta(r);
        atualizar((a) => ({ ...a, perguntas: [...a.perguntas, p] }));
        abrirPergunta(p.id);
        requestAnimationFrame(() => irParaCampo(CAMPO.perguntaTexto(p.id)));
    };
    const revisar = () => {
        aRevisar.forEach((p) => abrirPergunta(p.id));
        setTimeout(() => irParaCampo(CAMPO.perguntaOpcoes(aRevisar[0].id)), 320);
    };

    return (
        <section id="secao-inscricao" className="@container flex w-full scroll-mt-6 flex-col gap-6">
            <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-semibold text-primary">{TITULO_FORMULARIO}</h2>
                    <p className="max-w-[65ch] text-sm text-tertiary">{t.ajudaDoFormulario}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {/* Diretório de perguntas do evento: visível, fora do escopo do protótipo. */}
                    <Button size="md" color="link-gray" iconLeading={BookOpen01} onClick={() => toast(FORA_DO_ESCOPO)}>
                        Gerenciar perguntas do evento
                    </Button>
                    {r.perguntas.length > 0 && temCategorias && <PreviaDoFormulario />}
                </div>
            </div>

            {/*
              v0.16 (SCE-222): barra fixa no topo, como uma linha congelada: as ações de adicionar pergunta e o aviso
              do estoque vindo de outro evento continuam à vista ao rolar a lista. No celular, fica abaixo da barra do menu.
            */}
            <div className="sticky top-14 z-20 -mx-1 flex flex-col gap-3 border-b border-secondary bg-primary_alt px-1 py-3 lg:top-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="md" color="primary" iconLeading={Plus} onClick={nova}>
                        Nova pergunta
                    </Button>
                    <Button size="md" color="secondary" iconLeading={BookOpen01} onClick={() => setBiblioteca(true)}>
                        Perguntas prontas
                    </Button>
                    {/* v0.29: copiar perguntas de outro evento (no lugar de "Duplicar de outra categoria"). */}
                    <Button size="md" color="secondary" iconLeading={Copy01} onClick={() => setDuplicando(true)}>
                        Copiar de outro evento
                    </Button>
                </div>
                {/* Estoque vindo de outro evento: aviso com atalho para as perguntas (SCE-172). */}
                {aRevisar.length > 0 && (
                    <div role="status" className="flex flex-col gap-3 rounded-xl bg-warning-primary px-4 py-3 ring-1 ring-fg-warning-secondary @2xl:flex-row @2xl:items-center">
                        <span className="flex min-w-0 flex-1 items-start gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                            <span className="max-w-[80ch] text-sm text-warning-primary">{t.alertaRevisarQuantidade(aRevisar.length)}</span>
                        </span>
                        <Button size="sm" color="secondary" onClick={revisar} className="self-start @2xl:self-auto">
                            {aRevisar.length === 1 ? "Abrir para revisar" : `Abrir as ${aRevisar.length} para revisar`}
                        </Button>
                    </div>
                )}
            </div>

            {r.perguntas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-secondary px-6 py-10 text-center">
                    <p className="text-sm font-medium text-secondary">Nenhuma pergunta adicionada</p>
                    <p className="text-sm text-tertiary">Use uma pergunta pronta, copie de outro evento ou crie a sua, nos botões acima.</p>
                </div>
            ) : (
                <Reorder.Group
                    as="ol"
                    axis="y"
                    values={r.perguntas}
                    onReorder={(perguntas) => atualizar((a) => ({ ...a, perguntas }))}
                    className="flex flex-col overflow-visible rounded-xl bg-primary ring-1 ring-border-secondary"
                >
                    {r.perguntas.map((p, i) => (
                        <LinhaPergunta key={p.id} pergunta={p} indice={i} total={r.perguntas.length} ordem={ordem} />
                    ))}
                </Reorder.Group>
            )}

            <PerguntasProntas aberto={biblioteca} onFechar={() => setBiblioteca(false)} />
            <CopiarPerguntasDeOutroEvento aberto={duplicando} onFechar={() => setDuplicando(false)} />
        </section>
    );
}

/** Onde a pergunta aparece, em poucas palavras: "Todas as categorias" ou "3 categorias em 2 modalidades". */
export function useResumoDoVinculo() {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    return (p: Pergunta) => {
        if (p.todas) return t.todasNivel2;
        const mods = r.modalidades.filter((m) => m.categorias.some((c) => p.vinculos[c.id]));
        const cats = mods.reduce((n, m) => n + m.categorias.filter((c) => p.vinculos[c.id]).length, 0);
        return t.vinculoResumo(cats, mods.length);
    };
}

/** Linha da pergunta: recolhida mostra o resumo; aberta, edita a pergunta ali mesmo. */
function LinhaPergunta({ pergunta: p, indice, total, ordem }: { pergunta: Pergunta; indice: number; total: number; ordem: ReturnType<typeof useOrdem> }) {
    const { rascunho: r, atualizar, pendencias, avisos, perguntasAbertas, alternarPergunta } = useFormulario();
    const { t } = useVocabulario();
    const transicao = useTransicao();
    const controles = useDragControls();
    const resumo = useResumoDoVinculo();
    const aberta = perguntasAbertas.has(p.id);
    const titulo = p.titulo.trim() || "Pergunta sem título";
    const qtdPendencias = pendencias.filter((x) => x.pergunta === p.id).length;
    const qtdAvisos = avisos.filter((x) => x.pergunta === p.id && !precisaDefinirEstoque(p)).length;
    const ligadas = idsDasCategorias(r.modalidades).filter((c) => p.vinculos[c]);
    const obrigatoria = ligadas.length ? ligadas.every((c) => p.vinculos[c] === "obrigatoria") : p.padrao === "obrigatoria";
    const emParte = !obrigatoria && ligadas.some((c) => p.vinculos[c] === "obrigatoria");
    const setPerguntas = (fn: (ps: Pergunta[]) => Pergunta[]) => atualizar((a) => ({ ...a, perguntas: fn(a.perguntas) }));
    const textoDaOrdem = { titulo: "Confirmar alteração da ordem das perguntas?", texto: `A ordem da pergunta ${titulo} no formulário será alterada.` };

    const remover = () => {
        const antes = r.perguntas;
        setPerguntas((ps) => ps.filter((x) => x.id !== p.id));
        toast(`"${titulo}" removida`, { action: { label: "Desfazer", onClick: () => setPerguntas(() => antes) } });
    };
    const duplicar = () => {
        const sufixo = Date.now().toString(36);
        const copia: Pergunta = { ...p, id: `${p.id}-c${sufixo}`, titulo: `${p.titulo} (cópia)`, opcoes: p.opcoes.map((o, i) => ({ ...o, id: `${o.id}-c${i}${sufixo}` })) };
        setPerguntas((ps) => {
            const n = [...ps];
            n.splice(indice + 1, 0, copia);
            return n;
        });
    };

    return (
        <Reorder.Item
            as="li"
            value={p}
            id={CAMPO.pergunta(p.id)}
            dragListener={false}
            dragControls={controles}
            onDragStart={() => ordem.iniciar(textoDaOrdem)}
            onDragEnd={ordem.terminar}
            whileDrag={{ backgroundColor: "var(--color-bg-primary)", boxShadow: "0 8px 24px rgba(16,24,40,0.12)", zIndex: 20 }}
            className="relative scroll-mt-48 border-b border-secondary last:border-b-0"
        >
            {/* v0.15 (SCE-215): a linha toda abre e fecha; alça, duplicar e excluir continuam com a ação deles. */}
            <div
                className="flex cursor-pointer items-center gap-2 py-2 pr-3 pl-2 transition duration-100 ease-linear hover:bg-primary_hover"
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    alternarPergunta(p.id);
                }}
            >
                <Alca
                    controles={controles}
                    rotulo={titulo}
                    podeSubir={indice > 0}
                    podeDescer={indice < total - 1}
                    onMover={(d) => ordem.moverComTeclado(textoDaOrdem, () => setPerguntas((ps) => mover(ps, p.id, d)))}
                />
                <button
                    type="button"
                    onClick={() => alternarPergunta(p.id)}
                    aria-expanded={aberta}
                    aria-controls={`corpo-${p.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left outline-focus-ring focus-visible:outline-2"
                >
                    <span className="w-6 shrink-0 text-sm text-quaternary tabular-nums">{indice + 1}.</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{titulo}</span>
                            {obrigatoria && (
                                <Badge type="pill-color" color="gray" size="sm">
                                    Obrigatória
                                </Badge>
                            )}
                            {emParte && (
                                <Badge type="pill-color" color="gray" size="sm">
                                    Obrigatória em parte
                                </Badge>
                            )}
                            {precisaDefinirEstoque(p) && (
                                <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                                    {t.revisarQuantidade}
                                </BadgeWithIcon>
                            )}
                            {qtdPendencias > 0 && (
                                <BadgeWithIcon type="pill-color" color="error" size="sm" iconLeading={AlertCircle}>
                                    {qtdPendencias === 1 ? "1 pendência" : `${qtdPendencias} pendências`}
                                </BadgeWithIcon>
                            )}
                            {qtdPendencias === 0 && qtdAvisos > 0 && (
                                <BadgeWithIcon type="pill-color" color="gray" size="sm" iconLeading={AlertCircle}>
                                    {qtdAvisos === 1 ? "1 aviso" : `${qtdAvisos} avisos`}
                                </BadgeWithIcon>
                            )}
                        </span>
                        <span className="text-sm text-tertiary">
                            {labelDe(TIPOS_DE_RESPOSTA, p.tipo)}. {resumo(p)}.
                        </span>
                    </span>
                    <ChevronDown className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-200", aberta && "rotate-180")} aria-hidden="true" />
                </button>
                <ButtonUtility size="sm" color="tertiary" icon={Copy01} tooltip="Duplicar pergunta" aria-label={`Duplicar ${titulo}`} onClick={duplicar} />
                <ButtonUtility size="sm" color="tertiary" icon={Trash01} tooltip="Excluir pergunta" aria-label={`Excluir ${titulo}`} onClick={remover} />
            </div>

            <AnimatePresence initial={false}>
                {aberta && (
                    <motion.div
                        key="corpo"
                        id={`corpo-${p.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                        exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                        transition={transicao}
                        style={{ overflow: "hidden" }}
                    >
                        <EdicaoDaPergunta pergunta={p} />
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
}

/** Corpo da linha aberta: campos da pergunta, opções com quantidade e categorias vinculadas, lado a lado no desktop. */
function EdicaoDaPergunta({ pergunta: p }: { pergunta: Pergunta }) {
    const { rascunho: r, atualizar, erro, tocar } = useFormulario();
    const { t } = useVocabulario();
    const e = (campo: string) => erro(campo, "inscricao");
    const set = (fn: (p: Pergunta) => Pergunta) => atualizar((a) => ({ ...a, perguntas: a.perguntas.map((x) => (x.id === p.id ? fn(x) : x)) }));
    const ligadas = idsDasCategorias(r.modalidades).filter((c) => p.vinculos[c]);
    const obrigatoria = ligadas.length ? ligadas.every((c) => p.vinculos[c] === "obrigatoria") : p.padrao === "obrigatoria";
    const mudarTipo = (tipo: TipoDeResposta) => set((x) => ({ ...x, tipo, opcoes: temOpcoes(tipo) && x.opcoes.length === 0 ? [novaOpcao(), novaOpcao()] : x.opcoes }));
    const mudarOpcao = (id: string, mudanca: Partial<Pergunta["opcoes"][number]>) => set((x) => ({ ...x, opcoes: x.opcoes.map((o) => (o.id === id ? { ...o, ...mudanca } : o)) }));
    const aDefinir = opcoesADefinir(p);
    const [confirmarSemLimite, setConfirmarSemLimite] = useState(false);
    // "Marcar como revisada": as opções ainda sem quantidade ficam sem limite (depois de confirmar).
    const revisarTudo = () => {
        set((x) => ({ ...x, opcoes: x.opcoes.map((o) => (o.aDefinir ? { ...o, quantidade: null, aDefinir: false } : o)) }));
        setConfirmarSemLimite(false);
    };

    return (
        // v0.6 (SCE-175): campos e opções em cima; "Categorias vinculadas" embaixo, na largura toda.
        <div className="flex flex-col gap-6 border-t border-secondary bg-secondary/30 px-4 py-5 @4xl:pl-16">
            <div className="flex min-w-0 flex-col gap-5 @5xl:max-w-4xl">
                <div className="grid items-start gap-4 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <CampoTexto
                        id={CAMPO.perguntaTexto(p.id)}
                        label="Título da pergunta"
                        isRequired
                        placeholder="Ex.: Qual o tamanho da sua camiseta?"
                        valor={p.titulo}
                        onChange={(titulo) => set((x) => ({ ...x, titulo }))}
                        onBlur={() => tocar(CAMPO.perguntaTexto(p.id))}
                        erro={e(CAMPO.perguntaTexto(p.id))}
                    />
                    <CampoSelect id={`campo-pergunta-${p.id}-tipo`} label="Tipo da resposta" isRequired opcoes={TIPOS_DE_RESPOSTA} valor={p.tipo} onChange={(v) => mudarTipo(v as TipoDeResposta)} />
                </div>
                <Toggle
                    size="sm"
                    label="Resposta obrigatória"
                    hint="Vale para todas as categorias em que a pergunta aparece."
                    isSelected={obrigatoria}
                    onChange={(sim) => {
                        const padrao: Presenca = sim ? "obrigatoria" : "opcional";
                        set((x) => ({ ...comPresenca(x, ligadas, padrao), todas: x.todas, padrao }));
                    }}
                />

                {temOpcoes(p.tipo) && (
                    <div id={CAMPO.perguntaOpcoes(p.id)} className="flex scroll-mt-48 flex-col gap-2">
                        {/* v0.12 (SCE-208): o aviso só sai quando toda opção tem número ou "Sem limite". */}
                        {aDefinir.length > 0 && (
                            <div role="status" className="mb-1 flex flex-col gap-3 rounded-lg bg-warning-primary px-3 py-2.5">
                                <span className="flex min-w-0 flex-1 items-start gap-2 text-sm text-warning-primary">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <span>
                                        {t.avisoRevisarQuantidade}. {t.opcoesSemQuantidade(aDefinir.length, p.opcoes.length)}
                                    </span>
                                </span>
                                {confirmarSemLimite ? (
                                    <div className="flex flex-col gap-2 rounded-md bg-primary p-3 ring-1 ring-secondary">
                                        <p className="text-sm text-secondary">
                                            {aDefinir.length === 1 ? "A opção sem quantidade fica sem limite." : `As ${aDefinir.length} opções sem quantidade ficam sem limite.`} Confirmar?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button size="sm" color="secondary" onClick={() => setConfirmarSemLimite(false)}>
                                                Cancelar
                                            </Button>
                                            <Button size="sm" color="primary" onClick={revisarTudo}>
                                                Confirmar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button size="sm" color="secondary" onClick={() => setConfirmarSemLimite(true)} className="self-start">
                                        Marcar como revisada
                                    </Button>
                                )}
                            </div>
                        )}
                        <div className="flex gap-3 pr-11">
                            <span className="flex-1 text-sm font-medium text-secondary" aria-hidden="true">
                                Opções
                            </span>
                            <Label className="w-36" tooltip={AJUDA_QUANTIDADE}>
                                Quantidade disponível
                            </Label>
                        </div>
                        {/* v0.29 (Bruna): opções em ordem livre, arrastando pela alça (ou setas do teclado na alça). */}
                        <Reorder.Group as="ul" axis="y" values={p.opcoes} onReorder={(opcoes) => set((x) => ({ ...x, opcoes }))} className="flex flex-col gap-2">
                            {p.opcoes.map((o, i) => (
                                <LinhaDaOpcao
                                    key={o.id}
                                    opcao={o}
                                    rotulo={`Opção ${o.nome || i + 1}`}
                                    podeSubir={i > 0}
                                    podeDescer={i < p.opcoes.length - 1}
                                    onMover={(d) => set((x) => ({ ...x, opcoes: mover(x.opcoes, o.id, d) }))}
                                >
                                    <CampoTexto
                                        id={CAMPO.opcaoNome(o.id)}
                                        label={`Opção ${i + 1}`}
                                        ocultarLabel
                                        className="flex-1"
                                        placeholder={`Opção ${i + 1}`}
                                        valor={o.nome}
                                        onChange={(nome) => mudarOpcao(o.id, { nome })}
                                        onBlur={() => tocar(CAMPO.opcaoNome(o.id))}
                                        erro={e(CAMPO.opcaoNome(o.id))}
                                    />
                                    <div className="flex w-36 shrink-0 flex-col gap-1">
                                        <CampoNumero
                                            id={`campo-opcao-${o.id}-quantidade`}
                                            label={`Quantidade disponível da opção ${o.nome || i + 1}`}
                                            ocultarLabel
                                            placeholder={o.aDefinir ? "Defina" : "Sem limite"}
                                            valor={o.quantidade}
                                            // Um número define a opção; apagar o número de uma opção copiada volta a "a definir".
                                            onChange={(quantidade) => mudarOpcao(o.id, { quantidade, aDefinir: quantidade == null ? !!o.copiada : false })}
                                        />
                                        {o.aDefinir && (
                                            <span className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-warning-primary">
                                                A definir
                                                <Button color="link-color" size="sm" onClick={() => mudarOpcao(o.id, { quantidade: null, aDefinir: false })}>
                                                    Sem limite
                                                </Button>
                                            </span>
                                        )}
                                    </div>
                                    {/* v0.29 (Bruna): duplicar a opção logo abaixo dela. */}
                                    <ButtonUtility
                                        icon={Copy01}
                                        color="tertiary"
                                        size="sm"
                                        tooltip={`Duplicar opção ${o.nome || i + 1}`}
                                        className="mt-1.5"
                                        onClick={() =>
                                            set((x) => {
                                                const k = x.opcoes.findIndex((y) => y.id === o.id);
                                                const copia = { ...novaOpcao(o.nome ? `${o.nome} (cópia)` : "", o.quantidade), aDefinir: o.aDefinir };
                                                return { ...x, opcoes: [...x.opcoes.slice(0, k + 1), copia, ...x.opcoes.slice(k + 1)] };
                                            })
                                        }
                                    />
                                    <ButtonUtility
                                        icon={Trash01}
                                        color="tertiary"
                                        size="sm"
                                        tooltip={`Remover opção ${o.nome || i + 1}`}
                                        className="mt-1.5"
                                        onClick={() => set((x) => ({ ...x, opcoes: x.opcoes.filter((y) => y.id !== o.id) }))}
                                    />
                                </LinhaDaOpcao>
                            ))}
                        </Reorder.Group>
                        <ErroDaLista erro={e(CAMPO.perguntaOpcoes(p.id))} />
                        <Button color="link-color" size="sm" iconLeading={Plus} className="self-start" onClick={() => set((x) => ({ ...x, opcoes: [...x.opcoes, novaOpcao()] }))}>
                            Adicionar opção
                        </Button>
                    </div>
                )}
            </div>

            <CategoriasVinculadas pergunta={p} onMudar={set} />
        </div>
    );
}

/** Categorias vinculadas: árvore Modalidade › Categoria com marcar tudo (geral e por modalidade), como o legado TS, no DS do AWA. */
function CategoriasVinculadas({ pergunta: p, onMudar }: { pergunta: Pergunta; onMudar: (fn: (p: Pergunta) => Pergunta) => void }) {
    const { rascunho: r, erro } = useFormulario();
    const { t } = useVocabulario();
    const todosIds = idsDasCategorias(r.modalidades);
    const marcadas = todosIds.filter((c) => presencaNa(p, c) !== "nao");
    const tudo = todosIds.length > 0 && marcadas.length === todosIds.length;
    // Com todas marcadas, a pergunta passa a valer para "todas" (as criadas depois também recebem, SCE-105).
    const ligar = (ids: string[], sim: boolean) =>
        onMudar((x) => {
            const y = comPresenca(x, ids, sim ? x.padrao : "nao");
            return { ...y, todas: todosIds.every((c) => presencaNa(y, c) !== "nao") };
        });

    return (
        <div id={CAMPO.perguntaVinculo(p.id)} className="flex min-w-0 scroll-mt-48 flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-primary">{t.nivel2Vinculadas}</span>
                <span className="max-w-[65ch] text-sm text-tertiary">{t.nivel2VinculadasDica}</span>
            </div>
            {r.modalidades.length === 0 ? (
                <p className="text-sm text-tertiary">{t.vazioNivel1}.</p>
            ) : (
                <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
                    <div className="border-b border-secondary bg-secondary/40 px-4 py-3">
                        <Checkbox
                            label={<span className="font-semibold text-primary">{t.todasNivel2}</span>}
                            hint={t.nivel2Marcadas(marcadas.length, todosIds.length)}
                            isSelected={tudo}
                            isIndeterminate={marcadas.length > 0 && !tudo}
                            onChange={(sim) => ligar(sim ? todosIds.filter((c) => presencaNa(p, c) === "nao") : todosIds, sim)}
                        />
                    </div>
                    <ul className="flex flex-col divide-y divide-secondary">
                        {r.modalidades.map((m, i) => {
                            const ids = m.categorias.map((c) => c.id);
                            const k = ids.filter((c) => presencaNa(p, c) !== "nao").length;
                            const nome = m.nome.trim() || t.nivel1N(i + 1);
                            return (
                                <li key={m.id} className="flex flex-col px-4 py-1.5">
                                    {/* v0.13 (SCE-209): lista hierárquica, uma linha por item, com o rótulo do nível em selo. */}
                                    <ItemDaArvore
                                        nivel={1}
                                        nome={nome}
                                        contagem={ids.length ? t.nivel2Marcadas(k, ids.length) : t.semNivel2}
                                        ariaLabel={t.marcarNivel1Inteira(nome)}
                                        isDisabled={ids.length === 0}
                                        isSelected={ids.length > 0 && k === ids.length}
                                        isIndeterminate={k > 0 && k < ids.length}
                                        onChange={(sim) => ligar(ids, sim)}
                                    />
                                    {ids.length > 0 && (
                                        <ul className="ml-2 flex flex-col border-l border-secondary pl-5">
                                            {m.categorias.map((c) => (
                                                <li key={c.id}>
                                                    <ItemDaArvore
                                                        nivel={2}
                                                        nome={c.nome.trim() || t.nivel2SemNome}
                                                        detalhe={resumoDaCategoria(c)}
                                                        isSelected={presencaNa(p, c.id) !== "nao"}
                                                        onChange={(sim) => ligar([c.id], sim)}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            <ErroDaLista erro={erro(CAMPO.perguntaVinculo(p.id), "inscricao")} />
        </div>
    );
}

/** Perguntas prontas: seletor com busca e marcação, como "Adicionar pergunta" do AWA (ingressos/components/AdicionarPerguntaModal.tsx). */
function PerguntasProntas({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [busca, setBusca] = useState("");
    const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
    const filtradas = BIBLIOTECA.filter((b) => b.titulo.toLowerCase().includes(busca.trim().toLowerCase()));
    const jaTem = (titulo: string) => r.perguntas.some((p) => p.titulo.toLowerCase().startsWith(titulo.toLowerCase().slice(0, 12)));
    const fechar = () => {
        setBusca("");
        setMarcadas(new Set());
        onFechar();
    };
    const adicionar = () => {
        const novas = BIBLIOTECA.filter((b) => marcadas.has(b.id)).map((b) => daBiblioteca(b.id, r));
        atualizar((a) => ({ ...a, perguntas: [...a.perguntas, ...novas] }));
        toast.success(`${novas.length === 1 ? "1 pergunta adicionada" : `${novas.length} perguntas adicionadas`} para ${t.todasAsDuas.toLowerCase()}`);
        fechar();
    };
    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && fechar()} isDismissable>
            <Modal className="max-w-lg">
                <Dialog aria-label="Perguntas prontas">
                    <div className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary_alt">
                        <div className="flex shrink-0 flex-col gap-4 px-5 pt-5 pb-4">
                            <div className="flex items-start justify-between">
                                <FeaturedIcon icon={BookOpen01} color="gray" theme="modern" size="md" />
                                <ButtonUtility size="sm" color="tertiary" icon={XClose} onClick={fechar} tooltip="Fechar" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-md font-semibold text-primary">Perguntas prontas</h2>
                                <p className="text-sm text-tertiary">Entram para {t.todasAsDuas.toLowerCase()}. Depois você ajusta onde cada uma aparece.</p>
                            </div>
                            <Input aria-label="Buscar pergunta" icon={SearchLg} placeholder="Buscar pergunta" value={busca} onChange={setBusca} />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto border-t border-secondary px-5 py-2">
                            {filtradas.length === 0 ? (
                                <p className="py-8 text-center text-sm text-tertiary">Nenhuma pergunta encontrada.</p>
                            ) : (
                                <ul className="flex flex-col gap-0.5">
                                    {filtradas.map((b) => (
                                        <li key={b.id} className={cx("rounded-lg p-3 transition duration-100 ease-linear hover:bg-secondary")}>
                                            <Checkbox
                                                isSelected={marcadas.has(b.id)}
                                                onChange={(sim) =>
                                                    setMarcadas((s) => {
                                                        const n = new Set(s);
                                                        if (sim) n.add(b.id);
                                                        else n.delete(b.id);
                                                        return n;
                                                    })
                                                }
                                                label={b.titulo}
                                                hint={jaTem(b.titulo) ? `${b.descricao}. Já está no formulário` : b.descricao}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-secondary px-5 py-4">
                            <Button size="md" color="secondary" onClick={fechar}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary" isDisabled={marcadas.size === 0} onClick={adicionar}>
                                Adicionar{marcadas.size > 0 ? ` (${marcadas.size})` : ""}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/** v0.29: uma opção da pergunta, arrastável pela alça (mesma alça das perguntas e categorias). */
function LinhaDaOpcao({
    opcao,
    rotulo,
    podeSubir,
    podeDescer,
    onMover,
    children,
}: {
    opcao: Pergunta["opcoes"][number];
    rotulo: string;
    podeSubir: boolean;
    podeDescer: boolean;
    onMover: (d: -1 | 1) => void;
    children: ReactNode;
}) {
    const controles = useDragControls();
    return (
        <Reorder.Item value={opcao} dragListener={false} dragControls={controles} className="flex items-start gap-3 rounded-lg bg-primary">
            <Alca controles={controles} rotulo={rotulo} onMover={onMover} podeSubir={podeSubir} podeDescer={podeDescer} className="mt-2.5 size-6" />
            {children}
        </Reorder.Item>
    );
}
