import { useEffect, useState, type FC } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, ChevronDown, ChevronRight, ClipboardCheck, Copy01, Copy06, Edit01, Flag01, HelpCircle, Key01, Lightbulb02, Plus, Ticket01, Trash01, Users01, Zap } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Surgir, useTransicao } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { CAMPO, formatarDataHora, formatarReais, irParaCampo } from "../data/campos";
import { duplicarCategoria, novaCategoria, novaModalidade, nomeDeCopia, vagasDaCategoria } from "../data/modelos";
import { labelDe, MSG, SEXOS, TIPOS_DE_MODALIDADE, TIPOS_DE_RESPOSTA } from "../data/opcoes";
import { copiarVinculos, herdarPerguntas } from "../data/perguntas";
import type { Categoria, Modalidade, Pendencia, Rascunho } from "../data/tipos";
import { pendenciasDaCategoria, regraSugerida } from "../data/validacao";
import { useVocabulario, type Vocabulario } from "../data/vocabulario";
import { CampoSelect, CampoTexto, CampoTextoLongo, CampoVagas, ErroDaLista, Vazio } from "./campos";

/** v0.23 (SCE-247): limite da descrição da modalidade, o mesmo da descrição do ingresso no AWA. */
const LIMITE_DESCRICAO_MODALIDADE = 1000;
import { useFormulario } from "./contexto";
import { entrarNaRevisao, FluxoDeCopia } from "./copia-guiada";
import { comModalidade, inserirDepois, mover } from "./operacoes";
import { Alca, ProvedorDeOrdem, useOrdem } from "./reordenar";

/* ------------------------------------------------------------------ */
/*  Passo 2: Modalidades e categorias (v0.3 a v0.5, SCE-150 a SCE-166) */
/*  Mesmo padrão da tela de Ingressos do AWA                           */
/*  (backstage/ingressos/pages/Ingressos.tsx): título e ações no topo, */
/*  cada modalidade é um cartão largo com resumo em linha, que abre a  */
/*  tabela das categorias (com os lotes por baixo) e termina em        */
/*  "+ Nova categoria". Colunas da tabela por container query (@3xl).  */
/*  v0.5: sem "Editar modalidades" (cada cartão tem Editar, no próprio */
/*  cabeçalho, Duplicar e Excluir); ordem por arraste com confirmação; */
/*  coluna "Emissões e estoque" no lugar de "Vagas".                   */
/* ------------------------------------------------------------------ */

// Larguras só com a tabela (cartão ≥ 768 px); empilhado, cada valor ocupa o que precisa.
const COL = { preco: "@3xl:w-36", emissoes: "@3xl:w-48", vinculos: "@3xl:w-36", acoes: "@3xl:w-28" };

/** Explicação de emitidas e pendentes, a partir do texto do detalhe de ingresso do AWA (itens/pages/IngressoDetalhe.tsx). */
const AJUDA_EMISSOES =
    "Emitidas: inscrições pagas. Pendentes: em pagamento ou reservadas; seguram a vaga por 15 minutos e, sem pagamento, voltam para disponíveis. As duas contam no estoque.";

/** No rascunho ainda não há inscrições: emitidas e pendentes são zero. */
const emissoes = (semLimite: boolean, vagas: number | null, emitidas = 0) =>
    semLimite ? `${emitidas.toLocaleString("pt-BR")} emitidas, sem limite` : `${emitidas.toLocaleString("pt-BR")} de ${(vagas ?? 0).toLocaleString("pt-BR")}`;

export function SecaoModalidades() {
    const { rascunho: r } = useFormulario();
    // v0.7/v0.8 (SCE-180, SCE-190): fluxo de cópia em dois passos, dentro da própria etapa.
    if (r.fluxoDeCopia) return <FluxoDeCopia />;
    return (
        <ProvedorDeOrdem>
            <Lista />
        </ProvedorDeOrdem>
    );
}

/** Id da modalidade de uma pendência (campo da modalidade ou de categoria/lote dela). */
const modalidadeDaPendencia = (p: Pendencia) => p.categoria?.modalidadeId ?? /^campo-mod-(.+)-(nome|tipo|vagas|categorias)$/.exec(p.campo)?.[1];

/**
 * Onde está o erro, em palavras (v0.25, critique UI-TXT-010): o campo ("Preço do 1º lote") e, numa linha de apoio,
 * onde ele fica ("Na categoria Geral, modalidade 10 km").
 */
function localDaPendencia(r: Rascunho, p: Pendencia, t: Vocabulario) {
    const m = r.modalidades.find((x) => x.id === modalidadeDaPendencia(p));
    const c = m?.categorias.find((x) => x.id === p.categoria?.categoriaId);
    const lote = /^campo-lote-(.+)-(nome|valor|vagas|limite)$/.exec(p.campo);
    const cat = /^campo-cat-(.+)-(nome|idade|vagas|maximo|lotes|pcd)$/.exec(p.campo);
    const mod = /^campo-mod-(.+)-(nome|tipo|vagas|categorias)$/.exec(p.campo);
    let campo: string = t.tituloDaSecao;
    if (lote) {
        const l = c?.lotes.find((x) => x.id === lote[1]);
        campo = `${{ nome: "Nome", valor: "Preço", vagas: "Quantidade", limite: "Data limite" }[lote[2]]} do ${l?.nome.trim() || "lote sem nome"}`;
    } else if (cat) campo = { nome: "Nome", idade: "Idade", vagas: "Vagas", maximo: "Limite de compra", lotes: "Lotes", pcd: "PCD" }[cat[2]]!;
    else if (mod) campo = { nome: "Nome", tipo: t.tipoDoNivel1, vagas: "Vagas", categorias: t.listaNivel2 }[mod[2]]!;
    const nomeMod = m ? m.nome.trim() || t.nivel1SemNome : null;
    const nomeCat = c ? c.nome.trim() || t.nivel2SemNome : null;
    const onde = nomeCat ? `Na ${t.nivel2.um} ${nomeCat}, ${t.nivel1.um} ${nomeMod}` : nomeMod ? `Na ${t.nivel1.um} ${nomeMod}` : null;
    return { campo, onde };
}

/** v0.15 (SCE-213): lista do que impede de continuar, no topo da etapa, com o lugar de cada erro e o atalho até ele. */
function ResumoDeErros({ erros }: { erros: Pendencia[] }) {
    const { rascunho: r, irParaPendencia } = useFormulario();
    const { t } = useVocabulario();
    return (
        <section id="resumo-de-erros" tabIndex={-1} aria-labelledby="resumo-de-erros-titulo" className="flex scroll-mt-6 flex-col gap-3 rounded-xl bg-error-primary p-4 ring-1 ring-error_subtle outline-none">
            <h3 id="resumo-de-erros-titulo" className="flex items-center gap-2 text-sm font-semibold text-error-primary">
                <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
                {erros.length === 1 ? "Corrija 1 item para continuar" : `Corrija ${erros.length} itens para continuar`}
            </h3>
            <ul className="flex flex-col gap-1 pl-7">
                {erros.map((p) => (
                    <li key={`${p.campo}-${p.texto}`}>
                        <button
                            type="button"
                            onClick={() => irParaPendencia(p)}
                            className="cursor-pointer rounded text-left text-sm text-secondary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2"
                        >
                            {(() => {
                                const { campo, onde } = localDaPendencia(r, p, t);
                                return (
                                    <span className="flex flex-col">
                                        <span>
                                            <span className="font-semibold text-primary">{campo}:</span> {p.texto}
                                        </span>
                                        {onde && <span className="text-tertiary">{onde}</span>}
                                    </span>
                                );
                            })()}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Lista() {
    const { rascunho: r, atualizar, erro, pendencias, secoesTentadas } = useFormulario();
    const { t } = useVocabulario();
    const ordem = useOrdem();
    // v0.16 (SCE-219): toda modalidade abre mostrando as categorias; a pessoa ainda pode recolher. Guarda só as recolhidas.
    const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
    // Erros que impedem continuar, depois da primeira tentativa (SCE-213).
    const erros = secoesTentadas.has("modalidades") ? pendencias.filter((p) => p.secao === "modalidades") : [];
    const comErro = erros.map(modalidadeDaPendencia).filter((x): x is string => !!x).join("|");
    // Abre os cartões das modalidades com erro, para os selos ficarem à vista.
    useEffect(() => {
        if (comErro) setRecolhidas((s) => new Set([...s].filter((id) => !comErro.split("|").includes(id))));
    }, [comErro]);
    const [criando, setCriando] = useState(false);
    const alternar = (id: string) => setRecolhidas((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id)));
    const vazio = r.modalidades.length === 0;

    const acoes = (
        <>
            <Button size="md" color="secondary" iconLeading={Copy06} onClick={() => atualizar((a) => ({ ...a, fluxoDeCopia: { tipo: "outro-evento", etapa: "escolher" } }))}>
                {t.copiarNivel1DeOutroEvento}
            </Button>
            <Button size="md" color="primary" iconLeading={Plus} onClick={() => setCriando(true)}>
                {t.criarNivel1}
            </Button>
        </>
    );

    return (
        <section id="secao-modalidades" className="@container flex w-full scroll-mt-6 flex-col gap-6">
            <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-semibold text-primary">{t.tituloDaSecao}</h2>
                    <p className="max-w-[65ch] text-sm text-tertiary">{t.subtituloDaSecao}</p>
                </div>
                {/* v0.5: sem modalidades, as ações ficam só no estado vazio (sem botão repetido). */}
                {!vazio && <div className="flex shrink-0 flex-wrap items-center gap-3">{acoes}</div>}
            </div>

            {erros.length > 0 && <ResumoDeErros erros={erros} />}

            {vazio ? (
                <div id={CAMPO.modalidades} className="flex scroll-mt-6 flex-col gap-2 rounded-2xl bg-primary py-10 ring-1 ring-secondary">
                    <Vazio icone={Flag01} titulo={t.vazioNivel1} descricao={t.vazioNivel1Descricao} acao={<div className="flex flex-wrap justify-center gap-3">{acoes}</div>} />
                    <div className="flex justify-center">
                        <ErroDaLista erro={erro(CAMPO.modalidades, "modalidades")} />
                    </div>
                </div>
            ) : (
                <Reorder.Group as="div" axis="y" values={r.modalidades} onReorder={(modalidades) => atualizar((a) => ({ ...a, modalidades }))} className="flex flex-col gap-4">
                    {r.modalidades.map((m, i) => (
                        <CartaoModalidade
                            key={m.id}
                            modalidade={m}
                            indice={i}
                            total={r.modalidades.length}
                            aberta={!recolhidas.has(m.id)}
                            onAlternar={() => alternar(m.id)}
                            ordem={ordem}
                        />
                    ))}
                </Reorder.Group>
            )}

            <NovaModalidadeModal aberto={criando} onFechar={() => setCriando(false)} onCriada={(id) => setRecolhidas((s) => (s.delete(id), new Set(s)))} />
        </section>
    );
}

/** Regras da categoria: só o que difere do padrão (UI-TXT-010). */
export function resumoDaCategoria(c: Categoria) {
    const partes: string[] = [];
    if (c.sexo !== "todos") partes.push(labelDe(SEXOS, c.sexo));
    if (c.pcd) partes.push("PCD");
    if (c.idadeMin != null && c.idadeMax != null) partes.push(`${c.idadeMin} a ${c.idadeMax} anos`);
    else if (c.idadeMin != null) partes.push(`${c.idadeMin} anos ou mais`);
    else if (c.idadeMax != null) partes.push(`até ${c.idadeMax} anos`);
    const texto = partes.length ? partes.join(", ") : "Todos os atletas";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const lotesDe = (c: Categoria) => (c.lotes.length === 1 ? "1 lote" : `${c.lotes.length} lotes`);

/** (?) com a explicação de emitidas e pendentes, no título da coluna. */
function AjudaEmissoes() {
    return (
        <Tooltip title="Emissões e estoque" description={AJUDA_EMISSOES}>
            <TooltipTrigger aria-label="O que são emitidas e pendentes" className="inline-flex align-middle text-fg-quaternary transition duration-100 ease-linear hover:text-fg-secondary">
                <HelpCircle className="size-4" />
            </TooltipTrigger>
        </Tooltip>
    );
}

/** Cartão da modalidade (GrupoCard do AWA): alça de arraste, resumo em linha, ações, tabela das categorias e "+ Nova categoria". */
function CartaoModalidade({
    modalidade: m,
    indice,
    total,
    aberta,
    onAlternar,
    ordem,
}: {
    modalidade: Modalidade;
    indice: number;
    total: number;
    aberta: boolean;
    onAlternar: () => void;
    ordem: ReturnType<typeof useOrdem>;
}) {
    const { rascunho: r, atualizar, abrirCategoria, erro, editandoNivel1, setEditandoNivel1, avisos, pendencias, secoesTentadas } = useFormulario();
    const errosDaModalidade = secoesTentadas.has("modalidades") ? pendencias.filter((p) => p.secao === "modalidades" && modalidadeDaPendencia(p) === m.id).length : 0;
    const ajustes = avisos.filter((a) => a.ajuste && a.categoria?.modalidadeId === m.id).length;
    const { t } = useVocabulario();
    const transicao = useTransicao();
    const controles = useDragControls();
    const [abrindo, setAbrindo] = useState(false);
    const [lotesAbertos, setLotesAbertos] = useState<Set<string>>(new Set());
    const titulo = m.nome.trim() || t.nivel1N(indice + 1);
    const vazia = m.categorias.length === 0;
    const editando = editandoNivel1 === m.id;
    const textoDaOrdem = { titulo: t.ordemNivel1Titulo, texto: t.ordemNivel1Texto(titulo) };

    const remover = () => {
        const antes = r.modalidades;
        atualizar((a) => ({ ...a, modalidades: a.modalidades.filter((x) => x.id !== m.id) }));
        toast(t.nivel1Removida(titulo), { action: { label: "Desfazer", onClick: () => atualizar((a) => ({ ...a, modalidades: antes })) } });
    };
    // v0.16 (SCE-216): copia categorias de outro evento para dentro desta modalidade (fluxo de cópia em dois passos).
    const copiarCategorias = () => atualizar((a) => ({ ...a, fluxoDeCopia: { tipo: "categorias-de-outro-evento", etapa: "escolher", destinoId: m.id } }));
    const novaCat = () => {
        // v0.17 (SCE-228): nasce marcada como nova; só fica no evento depois de "Salvar categoria".
        const c = { ...novaCategoria({ nome: "" }), nova: true };
        // Abre antes de gravar: a limpeza de categorias novas abandonadas (SCE-228) já a encontra aberta.
        abrirCategoria({ modalidadeId: m.id, categoriaId: c.id });
        atualizar((a) => ({ ...comModalidade(m.id, (x) => ({ ...x, categorias: [...x.categorias, c] }))(a), perguntas: herdarPerguntas(a.perguntas, [c.id]) }));
    };

    return (
        <Reorder.Item
            as="div"
            value={m}
            id={`modalidade-${m.id}`}
            dragListener={false}
            dragControls={controles}
            onDragStart={() => ordem.iniciar(textoDaOrdem)}
            onDragEnd={ordem.terminar}
            whileDrag={{ boxShadow: "0 12px 32px rgba(16,24,40,0.14)", zIndex: 20 }}
            className="relative flex flex-col rounded-xl bg-primary ring-1 ring-border-secondary"
        >
            {editando ? (
                <EdicaoDaModalidade modalidade={m} titulo={titulo} onFechar={() => setEditandoNivel1(null)} />
            ) : (
                /* Cabeçalho da modalidade; a alça aparece no hover, colada na borda esquerda (como no AWA). */
                <div className="group/alca relative flex items-center gap-1 pr-3">
                    <Alca
                        flutuante
                        controles={controles}
                        rotulo={titulo}
                        podeSubir={indice > 0}
                        podeDescer={indice < total - 1}
                        onMover={(d) => ordem.moverComTeclado(textoDaOrdem, () => atualizar((a) => ({ ...a, modalidades: mover(a.modalidades, m.id, d) })))}
                    />
                    <button
                        type="button"
                        onClick={onAlternar}
                        aria-expanded={aberta}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-tl-xl px-4 py-4 text-left outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                        <Flag01 className="size-5 shrink-0 text-fg-secondary" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-semibold text-primary">{titulo}</span>
                                {errosDaModalidade > 0 && (
                                    <BadgeWithIcon type="pill-color" color="error" size="sm" iconLeading={AlertCircle}>
                                        {errosDaModalidade === 1 ? "1 erro" : `${errosDaModalidade} erros`}
                                    </BadgeWithIcon>
                                )}
                                {ajustes > 0 && (
                                    <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                                        {ajustes === 1 ? `${t.ajustar}: 1 lote` : `${t.ajustar}: ${ajustes} lotes`}
                                    </BadgeWithIcon>
                                )}
                            </span>
                            <Surgir visivel={!!m.descricao?.trim()}>
                                <span className="line-clamp-1 max-w-[80ch] text-sm text-tertiary">{m.descricao?.trim()}</span>
                            </Surgir>
                            <span className="flex flex-wrap gap-x-5 gap-y-0.5 text-sm text-tertiary">
                                <span>
                                    Tipo: <span className="text-secondary">{labelDe(TIPOS_DE_MODALIDADE, m.tipo) || "a definir"}</span>
                                </span>
                                <span>
                                    Emissões: <span className="text-secondary">{m.vagas ? emissoes(false, m.vagas) : "vagas a definir"}</span>
                                </span>
                                <span>
                                    Pendentes: <span className="text-secondary">0</span>
                                </span>
                                <span>
                                    {t.listaNivel2}: <span className="text-secondary">{m.categorias.length}</span>
                                </span>
                            </span>
                        </span>
                    </button>
                    <ButtonUtility icon={Edit01} color="tertiary" size="sm" tooltip={t.editarNivel1} aria-label={`${t.editarNivel1} ${titulo}`} onClick={() => setEditandoNivel1(m.id)} />
                    <ButtonUtility icon={Copy01} color="tertiary" size="sm" tooltip={t.duplicarNivel1} aria-label={`${t.duplicarNivel1} ${titulo}`} onClick={() => atualizar((a) => ({ ...a, fluxoDeCopia: { tipo: "duplicar-modalidade", etapa: "escolher", origemId: m.id } }))} />
                    <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={t.removerNivel1} aria-label={`${t.removerNivel1} ${titulo}`} onClick={remover} />
                    <button
                        type="button"
                        onClick={onAlternar}
                        aria-label={aberta ? `Recolher ${titulo}` : `Abrir ${titulo}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-tertiary hover:text-fg-secondary focus-visible:outline-2"
                    >
                        <ChevronDown className={cx("size-5 transition-transform duration-200", aberta && "rotate-180")} />
                    </button>
                </div>
            )}

            {/* Sem categorias (modalidade nova), o cartão mostra o estado vazio, aberto ou não (v0.4). */}
            {vazia && (
                <div id={CAMPO.modCategorias(m.id)} className="flex scroll-mt-6 flex-col gap-2 border-t border-secondary py-6">
                    <Vazio
                        icone={Users01}
                        titulo={t.vazioNivel2}
                        descricao={t.vazioNivel2Descricao}
                        acao={
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button color="secondary" size="md" iconLeading={Copy06} onClick={copiarCategorias}>
                                    {t.copiarNivel2DeOutroEvento}
                                </Button>
                                <Button color="secondary" size="md" iconLeading={Plus} onClick={novaCat}>
                                    {t.criarPrimeiraNivel2}
                                </Button>
                            </div>
                        }
                    />
                    <div className="flex justify-center">
                        <ErroDaLista erro={erro(CAMPO.modCategorias(m.id), "modalidades")} />
                    </div>
                </div>
            )}

            <AnimatePresence initial={false}>
                {aberta && !vazia && (
                    <motion.div
                        key="conteudo"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={transicao}
                        onAnimationStart={() => setAbrindo(true)}
                        onAnimationComplete={() => setAbrindo(false)}
                        className={abrindo ? "overflow-hidden" : "overflow-visible"}
                    >
                        {/* Cabeçalho das colunas (cartão a partir de 768 px; menor, cada linha empilha) */}
                        <div className="hidden items-center gap-3 border-y border-secondary bg-secondary/40 px-4 py-2.5 @3xl:flex">
                            <span className="flex-1 pl-8 text-xs font-semibold text-tertiary">{t.colunaNivel2}</span>
                            <span className={cx("shrink-0 text-xs font-semibold text-tertiary", COL.preco)}>Preço</span>
                            <span className={cx("flex shrink-0 items-center gap-1 text-xs font-semibold text-tertiary", COL.emissoes)}>
                                Emissões e estoque
                                <AjudaEmissoes />
                            </span>
                            <span className={cx("shrink-0 text-xs font-semibold text-tertiary", COL.vinculos)}>Vínculos</span>
                            <span className={cx("shrink-0 text-right text-xs font-semibold text-tertiary", COL.acoes)}>Ações</span>
                        </div>
                        <Reorder.Group
                            as="div"
                            axis="y"
                            values={m.categorias}
                            onReorder={(categorias) => atualizar(comModalidade(m.id, (x) => ({ ...x, categorias })))}
                            className="border-t border-secondary @3xl:border-t-0"
                        >
                            {m.categorias.map((c, i) => (
                                <LinhaCategoria
                                    key={c.id}
                                    modalidade={m}
                                    nomeDaModalidade={titulo}
                                    categoria={c}
                                    indice={i}
                                    lotesAbertos={lotesAbertos.has(c.id)}
                                    onAlternarLotes={() => setLotesAbertos((s) => (s.has(c.id) ? (s.delete(c.id), new Set(s)) : new Set(s).add(c.id)))}
                                    ordem={ordem}
                                />
                            ))}
                        </Reorder.Group>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rodapé do cartão (visível sempre que já há categoria), como "+ Novo ingresso" */}
            {!vazia && (
                <div className={cx("flex flex-wrap items-center rounded-b-xl", !aberta && "border-t border-secondary")}>
                    <button
                        type="button"
                        onClick={novaCat}
                        className="flex items-center gap-2 rounded-bl-xl px-4 py-3.5 text-left text-sm font-semibold text-brand-secondary outline-focus-ring transition duration-100 ease-linear hover:bg-tertiary hover:text-brand-secondary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        {t.novaNivel2}
                    </button>
                    <button
                        type="button"
                        onClick={copiarCategorias}
                        className="flex items-center gap-2 px-4 py-3.5 text-left text-sm font-semibold text-tertiary outline-focus-ring transition duration-100 ease-linear hover:bg-tertiary hover:text-secondary focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                        <Copy06 className="size-4" aria-hidden="true" />
                        {t.copiarNivel2DeOutroEvento}
                    </button>
                </div>
            )}

        </Reorder.Item>
    );
}

/** Linha da categoria (IngressoRow do AWA): alça, abre os lotes; colunas de regras, preço e emissões; ações Editar, Duplicar e Excluir. */
function LinhaCategoria({
    modalidade: m,
    nomeDaModalidade,
    categoria: c,
    indice,
    lotesAbertos,
    onAlternarLotes,
    ordem,
}: {
    modalidade: Modalidade;
    nomeDaModalidade: string;
    categoria: Categoria;
    indice: number;
    lotesAbertos: boolean;
    onAlternarLotes: () => void;
    ordem: ReturnType<typeof useOrdem>;
}) {
    const { rascunho: r, atualizar, pendencias, avisos, abrirCategoria, secoesTentadas } = useFormulario();
    const [escolhendoDestino, setEscolhendoDestino] = useState(false);
    const tentou = secoesTentadas.has("modalidades");
    const { t } = useVocabulario();
    const transicao = useTransicao();
    const controles = useDragControls();
    const nome = c.nome.trim() || t.nivel2SemNome;
    const ajustes = avisos.filter((a) => a.ajuste && a.categoria?.categoriaId === c.id).length;
    const qtd = pendenciasDaCategoria(pendencias, c.id).length;
    const regra = regraSugerida(c);
    const valores = c.lotes.map((l) => l.valor).filter((v): v is number => v != null);
    const setCategorias = (fn: (cs: Categoria[]) => Categoria[]) => atualizar(comModalidade(m.id, (x) => ({ ...x, categorias: fn(x.categorias) })));
    const editar = () => abrirCategoria({ modalidadeId: m.id, categoriaId: c.id });
    const textoDaOrdem = { titulo: t.ordemNivel2Titulo, texto: t.ordemNivel2Texto(nome, nomeDaModalidade) };

    const remover = () => {
        const antes = m.categorias;
        setCategorias((cs) => cs.filter((x) => x.id !== c.id));
        toast(t.nivel2Removida(nome), { action: { label: "Desfazer", onClick: () => setCategorias(() => antes) } });
    };
    // v0.8 (SCE-194): duplicar categoria vai direto para a revisão (passo 2), com os lotes a revisar.
    // v0.16 (SCE-218): com mais de uma modalidade no evento, pergunta antes em qual modalidade a cópia entra.
    const duplicarEm = (destinoId: string) => {
        const destino = r.modalidades.find((x) => x.id === destinoId) ?? m;
        const mesma = destino.id === m.id;
        const repetido = destino.categorias.some((x) => x.nome.trim().toLowerCase() === c.nome.trim().toLowerCase());
        const base = duplicarCategoria(c, mesma || repetido ? nomeDeCopia(c.nome, destino.categorias.map((x) => x.nome)) : c.nome);
        const copia = { ...base, lotes: base.lotes.map((l) => ({ ...l, revisar: true })) };
        // A cópia leva os vínculos das perguntas (SCE-105).
        atualizar((a) =>
            entrarNaRevisao(
                {
                    ...comModalidade(destino.id, (x) => ({ ...x, categorias: mesma ? inserirDepois(x.categorias, c.id, copia) : [...x.categorias, copia] }))(a),
                    perguntas: copiarVinculos(a.perguntas, { [c.id]: copia.id }),
                    fluxoDeCopia: { tipo: "duplicar-categoria", etapa: "revisar" },
                },
                { modalidades: [destino.id], categorias: [copia.id] },
                { modalidades: a.modalidades, perguntas: a.perguntas },
            ),
        );
    };
    const duplicar = () => (r.modalidades.length > 1 ? setEscolhendoDestino(true) : duplicarEm(m.id));

    return (
        <Reorder.Item
            as="div"
            value={c}
            dragListener={false}
            dragControls={controles}
            onDragStart={() => ordem.iniciar(textoDaOrdem)}
            onDragEnd={ordem.terminar}
            whileDrag={{ backgroundColor: "var(--color-bg-primary)", boxShadow: "0 8px 24px rgba(16,24,40,0.12)", zIndex: 20 }}
            className="relative"
        >
            <div className="group/alca relative flex flex-col gap-2 border-b border-secondary px-4 py-3.5 @3xl:flex-row @3xl:items-center @3xl:gap-3">
                <Alca
                    flutuante
                    controles={controles}
                    rotulo={nome}
                    podeSubir={indice > 0}
                    podeDescer={indice < m.categorias.length - 1}
                    onMover={(d) => ordem.moverComTeclado(textoDaOrdem, () => setCategorias((cs) => mover(cs, c.id, d)))}
                />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                        type="button"
                        onClick={onAlternarLotes}
                        aria-label={lotesAbertos ? `Recolher lotes de ${nome}` : `Ver lotes de ${nome}`}
                        aria-expanded={lotesAbertos}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-secondary focus-visible:outline-2"
                    >
                        <ChevronRight className={cx("size-4 transition-transform duration-200", lotesAbertos && "rotate-90")} />
                    </button>
                    <button type="button" onClick={editar} className="flex min-w-0 flex-col rounded text-left outline-focus-ring focus-visible:outline-2">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{nome}</span>
                            {qtd > 0 && (
                                <BadgeWithIcon type="pill-color" color={tentou ? "error" : "warning"} size="sm" iconLeading={AlertCircle}>
                                    {tentou ? (qtd === 1 ? "1 erro" : `${qtd} erros`) : qtd === 1 ? "1 pendência" : `${qtd} pendências`}
                                </BadgeWithIcon>
                            )}
                            {qtd === 0 && ajustes > 0 && (
                                <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                                    {t.ajustar}
                                </BadgeWithIcon>
                            )}
                            {qtd === 0 && ajustes === 0 && regra && (
                                <BadgeWithIcon type="pill-color" color="gray" size="sm" iconLeading={Lightbulb02}>
                                    Revisar regra
                                </BadgeWithIcon>
                            )}
                        </span>
                        {/* v0.7 (SCE-185): sem a coluna Regras; as regras ficam no detalhe da categoria. */}
                        <span className="truncate text-sm text-tertiary">{lotesDe(c)}</span>
                    </button>
                </div>
                <div className={cx("flex shrink-0 flex-col pl-8 @3xl:pl-0", COL.preco)}>
                    <span className="text-sm text-secondary">{valores.length ? formatarReais(Math.min(...valores)) : "a definir"}</span>
                    {valores.length > 1 && <span className="text-xs text-tertiary">até {formatarReais(Math.max(...valores))}</span>}
                </div>
                <div className={cx("flex shrink-0 flex-col pl-8 @3xl:pl-0", COL.emissoes)}>
                    <span className="text-sm text-secondary">
                        <span className="@3xl:hidden">Emissões: </span>
                        {emissoes(false, vagasDaCategoria(c))}
                    </span>
                </div>
                <div className={cx("flex shrink-0 pl-8 @3xl:pl-0", COL.vinculos)}>
                    <Vinculos categoria={c} />
                </div>
                <div className={cx("flex shrink-0 items-center gap-0.5 pl-6 @3xl:justify-end @3xl:pl-0", COL.acoes)}>
                    <ButtonUtility size="xs" color="tertiary" icon={Edit01} tooltip="Editar" aria-label={t.editarNivel2(nome)} onClick={editar} />
                    <ButtonUtility size="xs" color="tertiary" icon={Copy01} tooltip={t.duplicarNivel2} aria-label={`${t.duplicarNivel2} ${nome}`} onClick={duplicar} />
                    <ButtonUtility size="xs" color="tertiary" icon={Trash01} tooltip={t.removerNivel2} aria-label={`${t.removerNivel2} ${nome}`} onClick={remover} />
                </div>
            </div>

            {/* Lotes (quando aberto), como os lotes por baixo do ingresso no AWA */}
            <AnimatePresence initial={false}>
                {lotesAbertos && (
                    <motion.div key="lotes" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transicao} className="overflow-hidden">
                        {c.lotes.map((l, i) => (
                            <div key={l.id} className="flex flex-col gap-1 border-b border-secondary py-3 pr-4 pl-12 @3xl:flex-row @3xl:items-center @3xl:gap-3 @3xl:pl-16">
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm text-primary">{l.nome.trim() || `${i + 1}º lote`}</span>
                                        {i === 0 && (
                                            <BadgeWithIcon size="sm" type="pill-color" color="blue" iconLeading={Zap}>
                                                Vende primeiro
                                            </BadgeWithIcon>
                                        )}
                                        {l.revisar && (
                                            <BadgeWithIcon size="sm" type="pill-color" color="warning" iconLeading={AlertTriangle}>
                                                Revisar
                                            </BadgeWithIcon>
                                        )}
                                    </span>
                                    <span className="text-sm text-tertiary">
                                        {l.dataLimite ? `Até ${formatarDataHora(l.dataLimite)}` : "Vira quando esgota"}
                                    </span>
                                </div>
                                <span className={cx("shrink-0 text-sm text-secondary", COL.preco)}>{l.valor != null ? formatarReais(l.valor) : "a definir"}</span>
                                <span className={cx("shrink-0 text-sm text-secondary", COL.emissoes)}>{l.vagas ? emissoes(false, l.vagas) : "a definir"}</span>
                                <span className={cx("hidden shrink-0 @3xl:block", COL.vinculos)} />
                                <span className={cx("hidden shrink-0 @3xl:block", COL.acoes)} />
                            </div>
                        ))}
                        {c.lotes.length === 0 && <p className="border-b border-secondary py-3 pl-16 text-sm text-tertiary">Nenhum lote. Abra para adicionar.</p>}
                    </motion.div>
                )}
            </AnimatePresence>
            <DestinoDaDuplicacao
                aberto={escolhendoDestino}
                nomeDaCategoria={nome}
                atualId={m.id}
                onFechar={() => setEscolhendoDestino(false)}
                onConfirmar={(id) => {
                    setEscolhendoDestino(false);
                    duplicarEm(id);
                }}
            />
        </Reorder.Item>
    );
}

/* ------------------------------------------------------------------ */
/*  Vínculos da categoria (v0.6, SCE-176): formulário (perguntas),     */
/*  chaves de acesso (o nome do AWA para passkey, itens/ e catalogo/)  */
/*  e cupons. Um indicador por tipo, só com quantidade > 0; o tooltip  */
/*  (hover e foco) diz a quantidade.                                   */
/* ------------------------------------------------------------------ */

const plural = (n: number, um: string, muitos: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : muitos}`;

function Vinculos({ categoria: c }: { categoria: Categoria }) {
    const { rascunho: r } = useFormulario();
    const [listaAberta, setListaAberta] = useState(false);
    const perguntas = r.perguntas.filter((p) => p.vinculos[c.id]).length;
    const itens: { icone: FC<{ className?: string }>; n: number; texto: string }[] = [
        { icone: ClipboardCheck, n: perguntas, texto: plural(perguntas, "pergunta do formulário", "perguntas do formulário") },
        { icone: Key01, n: c.chavesDeAcesso ?? 0, texto: plural(c.chavesDeAcesso ?? 0, "chave de acesso", "chaves de acesso") },
        { icone: Ticket01, n: c.cupons ?? 0, texto: plural(c.cupons ?? 0, "cupom", "cupons") },
    ].filter((x) => x.n > 0);
    if (!itens.length) return <span className="text-sm text-quaternary">Nenhum</span>;
    return (
        <ul className="flex flex-wrap items-center gap-1" aria-label={`Vínculos: ${itens.map((x) => x.texto).join(", ")}`}>
            {itens.map(({ icone: Icone, n, texto }) => (
                <li key={texto}>
                    <Tooltip title={texto} description={Icone === ClipboardCheck ? "Clique para ver a lista" : undefined}>
                        <TooltipTrigger
                            aria-label={Icone === ClipboardCheck ? `${texto}: ver a lista` : texto}
                            // v0.17 (SCE-223): o indicador do formulário abre a lista das perguntas vinculadas.
                            onPress={Icone === ClipboardCheck ? () => setListaAberta(true) : undefined}
                            className="flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-secondary outline-focus-ring transition duration-100 ease-linear ring-inset hover:bg-primary_hover focus-visible:outline-2"
                        >
                            <Icone className="size-3.5 text-fg-quaternary" aria-hidden="true" />
                            {n}
                        </TooltipTrigger>
                    </Tooltip>
                </li>
            ))}
            <PerguntasDaCategoria categoria={c} aberto={listaAberta} onFechar={() => setListaAberta(false)} />
        </ul>
    );
}

/* ------------------------------------------------------------------ */
/*  Perguntas vinculadas à categoria (v0.17, SCE-223)                  */
/*  Clicar no indicador do formulário (coluna Vínculos) abre a lista,  */
/*  na ordem do formulário, com o tipo de resposta e se é obrigatória. */
/*  "Editar" leva ao Formulário de inscrição com a pergunta aberta.    */
/* ------------------------------------------------------------------ */

function PerguntasDaCategoria({ categoria: c, aberto, onFechar }: { categoria: Categoria; aberto: boolean; onFechar: () => void }) {
    const { rascunho: r, irParaPendencia } = useFormulario();
    const { t } = useVocabulario();
    const vinculadas = r.perguntas.filter((p) => p.vinculos[c.id]);
    const nome = c.nome.trim() || t.nivel2SemNome;
    const editar = (perguntaId: string) => {
        onFechar();
        irParaPendencia({ secao: "inscricao", campo: CAMPO.perguntaTexto(perguntaId), texto: "", pergunta: perguntaId });
    };
    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-xl">
                <Dialog aria-label={`Perguntas de ${nome}`}>
                    <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex shrink-0 flex-col gap-1 px-6 pt-6 pb-4">
                            <h2 className="text-lg font-semibold text-primary">Perguntas de {nome}</h2>
                            <p className="text-sm text-tertiary">
                                {vinculadas.length === 1 ? "1 pergunta do formulário aparece" : `${vinculadas.length} perguntas do formulário aparecem`} na inscrição desta {t.nivel2.um}, nesta ordem.
                            </p>
                        </div>
                        <ol className="min-h-0 flex-1 divide-y divide-secondary overflow-y-auto border-y border-secondary">
                            {vinculadas.map((p, i) => (
                                <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                                    <span className="w-5 shrink-0 text-sm text-tertiary tabular-nums">{i + 1}.</span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-primary">{p.titulo.trim() || "Pergunta sem título"}</span>
                                            <BadgeWithIcon type="pill-color" color={p.vinculos[c.id] === "obrigatoria" ? "brand" : "gray"} size="sm" iconLeading={ClipboardCheck}>
                                                {p.vinculos[c.id] === "obrigatoria" ? "Obrigatória" : "Opcional"}
                                            </BadgeWithIcon>
                                        </span>
                                        <span className="text-sm text-tertiary">{labelDe(TIPOS_DE_RESPOSTA, p.tipo)}</span>
                                    </span>
                                    <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => editar(p.id)}>
                                        Editar
                                    </Button>
                                </li>
                            ))}
                        </ol>
                        <div className="flex shrink-0 justify-end px-6 py-4">
                            <Button size="md" color="secondary" onClick={onFechar}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/* ------------------------------------------------------------------ */
/*  Editar modalidade no próprio cartão (v0.5, SCE-161)                */
/*  Nome, tipo e vagas viram campos com Cancelar e Salvar. Salvar com  */
/*  mudança abre "Confirmar alterações da modalidade?" com antes →     */
/*  depois só do que mudou; sem mudança, só fecha.                     */
/* ------------------------------------------------------------------ */

const vagasTexto = (vagas: number | null) => (vagas ? vagas.toLocaleString("pt-BR") : "Não informado");

function EdicaoDaModalidade({ modalidade: m, titulo, onFechar }: { modalidade: Modalidade; titulo: string; onFechar: () => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [nome, setNome] = useState(m.nome);
    const [tipo, setTipo] = useState(m.tipo);
    const [vagas, setVagas] = useState<number | null>(m.vagas);
    const [descricao, setDescricao] = useState(m.descricao ?? "");
    const [confirmando, setConfirmando] = useState(false);
    const repetida = r.modalidades.some((x) => x.id !== m.id && x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erros = {
        nome: !nome.trim() ? t.msgNomeNivel1 : repetida ? t.msgNivel1Repetida : undefined,
        tipo: !tipo ? t.msgTipoNivel1 : undefined,
        vagas: vagas == null ? MSG.vagasDaModalidade : !(vagas > 0) ? MSG.maiorQueZero : undefined,
    };
    const mudancas = [
        nome.trim() !== m.nome.trim() && { rotulo: "Nome", antes: m.nome.trim() || "Sem nome", depois: nome.trim() },
        tipo !== m.tipo && { rotulo: t.tipoDoNivel1, antes: labelDe(TIPOS_DE_MODALIDADE, m.tipo) || "Não informado", depois: labelDe(TIPOS_DE_MODALIDADE, tipo) },
        vagas !== m.vagas && { rotulo: "Vagas", antes: vagasTexto(m.vagas), depois: vagasTexto(vagas) },
        descricao.trim() !== (m.descricao ?? "").trim() && { rotulo: "Descrição", antes: (m.descricao ?? "").trim() || "Sem descrição", depois: descricao.trim() || "Sem descrição" },
    ].filter((x): x is { rotulo: string; antes: string; depois: string } => !!x);

    const salvar = () => {
        if (erros.nome || erros.tipo || erros.vagas) {
            requestAnimationFrame(() => irParaCampo(erros.nome ? CAMPO.modNome(m.id) : erros.tipo ? CAMPO.modTipo(m.id) : CAMPO.modVagas(m.id)));
            return;
        }
        if (mudancas.length === 0) return onFechar();
        setConfirmando(true);
    };
    const confirmar = () => {
        atualizar(comModalidade(m.id, (x) => ({ ...x, nome: nome.trim(), tipo, vagas, descricao: descricao.trim() })));
        toast.success(t.alteracoesSalvas(nome.trim()));
        setConfirmando(false);
        onFechar();
    };

    return (
        <div role="group" aria-label={`${t.editarNivel1} ${titulo}`} className="flex flex-col gap-4 rounded-t-xl bg-secondary/40 p-4">
            {/* Erros aparecem na hora: só se edita o que já existe, então um erro aqui é um dado de fato inválido. */}
            <div className="grid items-start gap-4 @2xl:grid-cols-3">
                <CampoTexto id={CAMPO.modNome(m.id)} label="Nome" isRequired autoFocus placeholder={t.placeholderNivel1} valor={nome} onChange={setNome} erro={erros.nome} />
                <CampoSelect id={CAMPO.modTipo(m.id)} label={t.tipoDoNivel1} tooltip={t.ajudaDoTipo} isRequired opcoes={TIPOS_DE_MODALIDADE} valor={tipo} onChange={setTipo} erro={erros.tipo} />
                {/* v0.15 (SCE-212): vagas da modalidade sempre com número, sem "Sem limite". */}
                <CampoVagas
                    id={CAMPO.modVagas(m.id)}
                    label={t.vagasDoNivel1}
                    tooltip={t.ajudaVagasNivel1}
                    semLimitePermitido={false}
                    semLimite={false}
                    vagas={vagas}
                    onChange={(_s, v) => setVagas(v)}
                    erro={erros.vagas}
                />
                <div className="@2xl:col-span-3">
                    <CampoTextoLongo
                        id={`campo-mod-${m.id}-descricao`}
                        label="Descrição (opcional)"
                        placeholder="Ex.: percurso plano pela orla, largada às 7h, kit com camiseta e medalha."
                        limite={LIMITE_DESCRICAO_MODALIDADE}
                        valor={descricao}
                        onChange={setDescricao}
                        dica="O atleta vê na escolha da inscrição."
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3">
                <Button size="sm" color="secondary" onClick={onFechar}>
                    Cancelar
                </Button>
                <Button size="sm" color="primary" onClick={salvar}>
                    Salvar
                </Button>
            </div>

            <ModalOverlay isOpen={confirmando} onOpenChange={(v) => !v && setConfirmando(false)} isDismissable>
                <Modal className="sm:max-w-md">
                    <Dialog aria-label={t.confirmarAlteracoesNivel1}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{t.confirmarAlteracoesNivel1}</h2>
                                <p className="text-sm text-tertiary">{t.confirmarAlteracoesDescricao(titulo)}</p>
                            </div>
                            <dl className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary">
                                {mudancas.map((x) => (
                                    <div key={x.rotulo} className="flex flex-col gap-0.5 px-4 py-3">
                                        <dt className="text-sm font-medium text-secondary">{x.rotulo}</dt>
                                        <dd className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="text-tertiary line-through">{x.antes}</span>
                                            <span aria-hidden="true" className="text-fg-quaternary">
                                                →
                                            </span>
                                            <span className="sr-only">passa a ser</span>
                                            <span className="font-semibold text-primary">{x.depois}</span>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            <div className="grid grid-cols-2 gap-3">
                                <Button size="md" color="secondary" onClick={() => setConfirmando(false)}>
                                    Cancelar
                                </Button>
                                <Button size="md" color="primary" onClick={confirmar}>
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
}

/** Criar modalidade: modal pequeno, como "Criar ingresso" do AWA (ingressos/components/CriarIngressoModal.tsx). */
function NovaModalidadeModal({ aberto, onFechar, onCriada }: { aberto: boolean; onFechar: () => void; onCriada: (id: string) => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState("");
    const [vagas, setVagas] = useState<number | null>(null);
    const [descricao, setDescricao] = useState("");
    const [tentou, setTentou] = useState(false);
    const repetida = r.modalidades.some((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    const erros = {
        nome: !nome.trim() ? t.msgNomeNivel1 : repetida ? t.msgNivel1Repetida : undefined,
        tipo: !tipo ? t.msgTipoNivel1 : undefined,
        vagas: vagas == null ? MSG.vagasDaModalidade : !(vagas > 0) ? MSG.maiorQueZero : undefined,
    };
    const fechar = () => {
        setNome("");
        setTipo("");
        setVagas(null);
        setDescricao("");
        setTentou(false);
        onFechar();
    };
    const criar = () => {
        setTentou(true);
        if (erros.nome || erros.tipo || erros.vagas) {
            requestAnimationFrame(() => irParaCampo(erros.nome ? "nova-mod-nome" : erros.tipo ? "nova-mod-tipo" : "nova-mod-vagas"));
            return;
        }
        // v0.4: nasce sem categorias (a "Geral" automática da RN-10 saiu); o cartão mostra o estado vazio.
        const m = novaModalidade({ nome: nome.trim(), tipo, vagas, descricao: descricao.trim() });
        atualizar((a) => ({ ...a, modalidades: [...a.modalidades, m] }));
        onCriada(m.id);
        toast.success(t.nivel1Criada(nome.trim()));
        fechar();
    };
    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && fechar()} isDismissable>
            <Modal className="sm:max-w-120">
                <Dialog aria-label={t.criarNivel1}>
                    <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                        <div className="flex flex-col gap-0.5">
                            <h2 className="text-lg font-semibold text-primary">{t.criarNivel1}</h2>
                            <p className="text-sm text-tertiary">{t.criarNivel1Descricao}</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <CampoTexto id="nova-mod-nome" label="Nome" isRequired autoFocus placeholder={t.placeholderNivel1} valor={nome} onChange={setNome} erro={tentou ? erros.nome : undefined} />
                            <CampoSelect id="nova-mod-tipo" label={t.tipoDoNivel1} tooltip={t.ajudaDoTipo} isRequired opcoes={TIPOS_DE_MODALIDADE} valor={tipo} onChange={setTipo} erro={tentou ? erros.tipo : undefined} />
                            <CampoVagas
                                id="nova-mod-vagas"
                                label={t.vagasDoNivel1}
                                tooltip={t.ajudaVagasNivel1}
                                semLimitePermitido={false}
                                semLimite={false}
                                vagas={vagas}
                                onChange={(_s, v) => setVagas(v)}
                                erro={tentou ? erros.vagas : undefined}
                            />
                            <CampoTextoLongo
                                id="nova-mod-descricao"
                                label="Descrição (opcional)"
                                placeholder="Ex.: percurso plano pela orla, largada às 7h, kit com camiseta e medalha."
                                limite={LIMITE_DESCRICAO_MODALIDADE}
                                valor={descricao}
                                onChange={setDescricao}
                                dica="O atleta vê na escolha da inscrição."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button size="md" color="secondary" onClick={fechar}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary" onClick={criar}>
                                {t.criarNivel1}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/* ------------------------------------------------------------------ */
/*  Duplicar categoria em outra modalidade (v0.16, SCE-218)            */
/*  Com mais de uma modalidade no evento, "Duplicar" pergunta onde a   */
/*  cópia entra; a modalidade atual vem escolhida. Na mesma, a cópia   */
/*  ganha "(cópia)"; em outra, mantém o nome se ele não se repete lá.  */
/* ------------------------------------------------------------------ */

function DestinoDaDuplicacao({
    aberto,
    nomeDaCategoria,
    atualId,
    onFechar,
    onConfirmar,
}: {
    aberto: boolean;
    nomeDaCategoria: string;
    atualId: string;
    onFechar: () => void;
    onConfirmar: (modalidadeId: string) => void;
}) {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const [destino, setDestino] = useState(atualId);
    useEffect(() => {
        if (aberto) setDestino(atualId);
    }, [aberto, atualId]);
    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-md">
                <Dialog aria-label={t.duplicarNivel2EmQual}>
                    <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-semibold text-primary">{t.duplicarNivel2EmQual}</h2>
                            <p className="text-sm text-tertiary">{t.duplicarNivel2EmQualDescricao(nomeDaCategoria)}</p>
                        </div>
                        {/* v0.25 (critique UI-LST-002): com muitas modalidades, lista com busca no lugar dos botões de opção. */}
                        {r.modalidades.length > 8 ? (
                            <CampoSelect
                                id="duplicar-destino"
                                label={t.nivel1.Um}
                                opcoes={r.modalidades.map((x, i) => ({ id: x.id, label: `${x.nome.trim() || t.nivel1N(i + 1)}${x.id === atualId ? ` (${t.nivel1.um} atual)` : ""}` }))}
                                valor={destino}
                                onChange={setDestino}
                            />
                        ) : (
                            <RadioGroup aria-label={t.duplicarNivel2EmQual} value={destino} onChange={setDestino}>
                                {r.modalidades.map((x, i) => (
                                    <RadioButton
                                        key={x.id}
                                        value={x.id}
                                        label={x.nome.trim() || t.nivel1N(i + 1)}
                                        // v0.25 (critique UI-TXT-010): em frase, sem símbolos separando.
                                        hint={`${[labelDe(TIPOS_DE_MODALIDADE, x.tipo) || null, `${x.categorias.length} ${x.categorias.length === 1 ? t.nivel2.um : t.nivel2.muitos}`].filter(Boolean).join(", ")}${x.id === atualId ? `. ${t.duplicarNivel2Atual} atual` : ""}`}
                                    />
                                ))}
                            </RadioGroup>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Button size="md" color="secondary" onClick={onFechar}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary" onClick={() => onConfirmar(destino)}>
                                Duplicar
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
