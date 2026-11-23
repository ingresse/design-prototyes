import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { Dialog as AriaDialog, DialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { NumberParser } from "@internationalized/number";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Check, ChevronDown, EyeOff, Lock01, XClose, ChevronRight, ClipboardCheck, Copy01, Copy06, Edit01, Flag01, HelpCircle, Key01, Lightbulb02, Plus, Ticket01, Trash01, Users01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Toggle } from "@/components/base/toggle/toggle";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { Surgir, useTransicao } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { CAMPO, FORMATO_REAIS, formatarDataHora, formatarReais, irParaCampo } from "../data/campos";
import { duplicarCategoria, novaCategoria, novaModalidade, nomeDeCopia, vagasDaCategoria } from "../data/modelos";
import { labelDe, MSG, SEXOS, TIPOS_DE_MODALIDADE, TIPOS_DE_RESPOSTA } from "../data/opcoes";
import { CampoTipoDeModalidade } from "./campo-tipo-de-modalidade";
import { comPresenca, copiarVinculos, herdarPerguntas, presencaNa } from "../data/perguntas";
import type { Categoria, Modalidade, Pendencia, Presenca, Rascunho } from "../data/tipos";
import { pendenciasDaCategoria, regraSugerida } from "../data/validacao";
import { useVocabulario, type Vocabulario } from "../data/vocabulario";
import { AVISO_LOTE_BLOQUEADO, loteComVendasIniciadas, statusDeVenda, type TipoDeStatusDeVenda } from "../data/vendas";
import { CampoNumero, CampoSelect, CampoTexto, CampoTextoLongo, CampoVagas, ErroDaLista, Vazio } from "./campos";

/** v0.23 (SCE-247): limite da descrição da modalidade, o mesmo da descrição do ingresso no AWA. */
const LIMITE_DESCRICAO_MODALIDADE = 1000;
import { useFormulario } from "./contexto";
import { entrarNaRevisao, FluxoDeCopia } from "./copia-guiada";
import { comModalidade, inserirDepois, mover } from "./operacoes";
import { Alca, ProvedorDeOrdem, useOrdem } from "./reordenar";
import { AtalhoMarketing } from "./atalho-marketing";
import { loteOculto } from "../data/marketing";

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
const COL = { preco: "@3xl:w-28", emissoes: "@3xl:w-28", venda: "@3xl:w-36", vinculos: "@3xl:w-40", acoes: "@3xl:w-24" };

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

const nomeDoLote = (l: Categoria["lotes"][number], i: number) => l.nome.trim() || `${i + 1}º lote`;
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
                            {/* v0.69 (critique UI-FRM-005): o toggle tem rótulo visível na coluna. */}
                            <span className="w-11 shrink-0 text-xs font-semibold whitespace-nowrap text-tertiary">À venda</span>
                            <span className="flex-1 pl-8 text-xs font-semibold text-tertiary">{t.colunaNivel2}</span>
                            <span className={cx("shrink-0 text-xs font-semibold text-tertiary", COL.preco)}>Preço</span>
                            <span className={cx("flex shrink-0 items-center gap-1 text-xs font-semibold text-tertiary", COL.emissoes)}>
                                Emissões e estoque
                                <AjudaEmissoes />
                            </span>
                            <span className={cx("shrink-0 text-xs font-semibold text-tertiary", COL.venda)}>Venda</span>
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
    const setLote = (loteId: string, mudanca: Partial<Categoria["lotes"][number]>) => {
        const antes = m.categorias;
        setCategorias((cs) => cs.map((x) => (x.id === c.id ? { ...x, lotes: x.lotes.map((y) => (y.id === loteId ? { ...y, ...mudanca } : y)) } : x)));
        toast("Lote atualizado.", { action: { label: "Desfazer", onClick: () => setCategorias(() => antes) } });
    };
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
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const pausarCategoria = (ativa: boolean) => setCategorias((cs) => cs.map((x) => (x.id === c.id ? { ...x, ativa } : x)));
    const pausarLote = (loteId: string, ativo: boolean) =>
        setCategorias((cs) => cs.map((x) => (x.id === c.id ? { ...x, lotes: x.lotes.map((y) => (y.id === loteId ? { ...y, ativo } : y)) } : x)));
    const faixaDePreco = valores.length ? (valores.length > 1 && Math.max(...valores) !== Math.min(...valores) ? `${formatarReais(Math.min(...valores))} a ${formatarReais(Math.max(...valores))}` : formatarReais(valores[0])) : "preço a definir";
    const textoDeEmissoes = emissoes(false, vagasDaCategoria(c), statusDeVenda(r, c).tipo === "esgotada" ? vagasDaCategoria(c) : 0);
    // v0.66 (SCE-335) e v0.69 (SCE-339): edição rápida de preço e quantidade; travada depois que as vendas do lote começam.
    const edicaoDoPreco = (l: Categoria["lotes"][number], i: number) => (
        <EdicaoRapida
            rotulo={`Preço do ${nomeDoLote(l, i)}`}
            valor={l.valor}
            texto={l.valor != null ? formatarReais(l.valor) : "a definir"}
            formato={FORMATO_REAIS}
            bloqueado={loteComVendasIniciadas(r, c, l.id)}
            validar={(v) => (v == null || v < 0 ? `Informe um valor de ${formatarReais(0)} ou mais` : undefined)}
            onSalvar={(valor) => setLote(l.id, { valor, revisar: false })}
        />
    );
    const edicaoDaQuantidade = (l: Categoria["lotes"][number], i: number) => (
        <EdicaoRapida
            rotulo={`Quantidade do ${nomeDoLote(l, i)}`}
            valor={l.vagas}
            texto={l.vagas ? emissoes(false, l.vagas) : "a definir"}
            bloqueado={loteComVendasIniciadas(r, c, l.id)}
            validar={(v) => (v == null || v < 1 ? "Informe 1 ou mais" : v < EMITIDAS_NO_RASCUNHO ? `Informe ${EMITIDAS_NO_RASCUNHO} ou mais: já foram emitidas ${EMITIDAS_NO_RASCUNHO}` : undefined)}
            onSalvar={(vagas) => setLote(l.id, { vagas, revisar: false })}
        />
    );
    const selos = (
        <>
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
        </>
    );

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
            <div className="group/alca relative flex items-center gap-3 border-b border-secondary px-4 py-3.5">
                <Alca
                    flutuante
                    controles={controles}
                    rotulo={nome}
                    podeSubir={indice > 0}
                    podeDescer={indice < m.categorias.length - 1}
                    onMover={(d) => ordem.moverComTeclado(textoDaOrdem, () => setCategorias((cs) => mover(cs, c.id, d)))}
                />
                {/* v0.58 (SCE-324): ativa ou pausada, antes do nome, como o ingresso no AWA. */}
                <AtivaOuPausada nome={nome} ativa={c.ativa !== false} feminino={t.nivel2.genero === "f"} onChange={pausarCategoria} />
                <div className={cx("flex min-w-0 flex-1 items-center gap-3", c.ativa === false && "opacity-60")}>
                    <button
                        type="button"
                        onClick={onAlternarLotes}
                        aria-label={lotesAbertos ? `Recolher lotes de ${nome}` : `Ver lotes de ${nome}`}
                        aria-expanded={lotesAbertos}
                        className="hidden size-5 shrink-0 items-center justify-center rounded text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-secondary focus-visible:outline-2 @3xl:flex"
                    >
                        <ChevronRight className={cx("size-4 transition-transform duration-200", lotesAbertos && "rotate-90")} />
                    </button>
                    {/* Desktop: o nome abre a edição da categoria. */}
                    <button type="button" onClick={editar} className="hidden min-w-0 flex-col rounded text-left outline-focus-ring focus-visible:outline-2 @3xl:flex">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{nome}</span>
                            {selos}
                        </span>
                        {/* v0.29 (Bruna): quem pode se inscrever à vista na lista, para conferir a regra logo depois de
                            duplicar (ex.: a cópia virou PCD, mas a regra ainda é a do original). Clicar abre para editar. */}
                        <span className="truncate text-sm text-tertiary">
                            {resumoDaCategoria(c)}, {lotesDe(c)}
                        </span>
                    </button>
                    {/* v0.59 (SCE-325): oculta por chave de acesso: só o ícone, explicação no tooltip (mouse, foco e toque). */}
                    <span className="hidden @3xl:flex">
                        <SeloOculta lotes={c.lotes.map((l) => l.id)} />
                    </span>
                    {/* v0.69 (critique UI-MOB-005): no celular, tabela-lista: nome, apoio e estado de venda; o toque abre os detalhes. */}
                    <button
                        type="button"
                        onClick={() => setDetalhesAbertos(true)}
                        aria-label={`Ver detalhes de ${nome}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded text-left outline-focus-ring focus-visible:outline-2 @3xl:hidden"
                    >
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-primary">{nome}</span>
                                {selos}
                            </span>
                            <span className="text-sm text-tertiary">
                                {lotesDe(c)} · {faixaDePreco}
                            </span>
                            <SeloDeVenda categoria={c} compacto />
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    </button>
                </div>
                <div className={cx("hidden shrink-0 flex-col @3xl:flex", COL.preco)}>
                    <span className="text-sm text-secondary">{valores.length ? formatarReais(Math.min(...valores)) : "a definir"}</span>
                    {valores.length > 1 && <span className="text-xs text-tertiary">até {formatarReais(Math.max(...valores))}</span>}
                </div>
                <div className={cx("hidden shrink-0 flex-col @3xl:flex", COL.emissoes)}>
                    {/* Na simulação de evento publicado (SCE-264), a esgotada mostra as vagas todas emitidas. */}
                    <span className="text-sm text-secondary">{textoDeEmissoes}</span>
                </div>
                <div className={cx("hidden shrink-0 @3xl:flex", COL.venda)}>
                    <SeloDeVenda categoria={c} />
                </div>
                <div className={cx("hidden shrink-0 @3xl:flex", COL.vinculos)}>
                    <Vinculos categoria={c} />
                </div>
                <div className={cx("hidden shrink-0 items-center justify-end gap-0.5 @3xl:flex", COL.acoes)}>
                    <ButtonUtility size="xs" color="tertiary" icon={Edit01} tooltip="Editar" aria-label={t.editarNivel2(nome)} onClick={editar} />
                    <ButtonUtility size="xs" color="tertiary" icon={Copy01} tooltip={t.duplicarNivel2} aria-label={`${t.duplicarNivel2} ${nome}`} onClick={duplicar} />
                    <ButtonUtility size="xs" color="tertiary" icon={Trash01} tooltip={t.removerNivel2} aria-label={`${t.removerNivel2} ${nome}`} onClick={remover} />
                </div>
            </div>

            {/* Lotes (quando aberto), como os lotes por baixo do ingresso no AWA. No celular, ficam nos detalhes. */}
            <div className="hidden @3xl:block">
                <AnimatePresence initial={false}>
                    {lotesAbertos && (
                        <motion.div key="lotes" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transicao} className="overflow-hidden">
                            {c.lotes.map((l, i) => (
                                <div key={l.id} className="flex items-center gap-3 border-b border-secondary py-3 pr-4 pl-16">
                                    {/* v0.58 (SCE-324): lote ativo ou pausado, antes do nome, como no AWA. */}
                                    <AtivaOuPausada nome={nomeDoLote(l, i)} ativa={l.ativo !== false} feminino={false} onChange={(ativo) => pausarLote(l.id, ativo)} />
                                    <div className={cx("flex min-w-0 flex-1 flex-col", l.ativo === false && "opacity-60")}>
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm text-primary">{nomeDoLote(l, i)}</span>
                                            <SeloOculta lotes={[l.id]} />
                                            {l.revisar && (
                                                <BadgeWithIcon size="sm" type="pill-color" color="warning" iconLeading={AlertTriangle}>
                                                    Revisar
                                                </BadgeWithIcon>
                                            )}
                                        </span>
                                        <span className="text-sm text-tertiary">{l.dataLimite ? `Até ${formatarDataHora(l.dataLimite)}` : "Vira quando esgota"}</span>
                                    </div>
                                    {/* v0.66 (SCE-335): preço e quantidade do lote editáveis na própria linha, pelo lápis. */}
                                    <span className={cx("shrink-0", COL.preco)}>{edicaoDoPreco(l, i)}</span>
                                    <span className={cx("shrink-0", COL.emissoes)}>{edicaoDaQuantidade(l, i)}</span>
                                    {/* v0.59 (SCE-326): o estado do lote fica na coluna Venda, no mesmo estilo da categoria. */}
                                    <span className={cx("flex shrink-0", COL.venda)}>
                                        <EstadoDoLote categoria={c} lote={l} />
                                    </span>
                                    {/* v0.37 (SCE-279, SCE-280): cupom e chave também no lote (só nele). */}
                                    <span className={cx("flex shrink-0 flex-col items-start gap-1", COL.vinculos)}>
                                        <AtalhoMarketing recurso="cupom" alvo={{ categoria: c, lote: l }} />
                                        <AtalhoMarketing recurso="chave" alvo={{ categoria: c, lote: l }} />
                                    </span>
                                    <span className={cx("shrink-0", COL.acoes)} />
                                </div>
                            ))}
                            {c.lotes.length === 0 && <p className="border-b border-secondary py-3 pl-16 text-sm text-tertiary">Nenhum lote. Abra para adicionar.</p>}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {detalhesAbertos && (
                <DetalhesDaCategoria
                    categoria={c}
                    nome={nome}
                    nomeDaModalidade={nomeDaModalidade}
                    selos={selos}
                    faixaDePreco={faixaDePreco}
                    textoDeEmissoes={textoDeEmissoes}
                    onPausarCategoria={pausarCategoria}
                    onPausarLote={pausarLote}
                    edicaoDoPreco={edicaoDoPreco}
                    edicaoDaQuantidade={edicaoDaQuantidade}
                    onEditar={() => {
                        setDetalhesAbertos(false);
                        editar();
                    }}
                    onDuplicar={() => {
                        setDetalhesAbertos(false);
                        duplicar();
                    }}
                    onRemover={() => {
                        setDetalhesAbertos(false);
                        remover();
                    }}
                    onFechar={() => setDetalhesAbertos(false)}
                />
            )}
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
    const texto = perguntas ? plural(perguntas, "pergunta do formulário", "perguntas do formulário") : "Nenhuma pergunta do formulário";
    // v0.36 (SCE-278): os três indicadores sempre visíveis, nesta ordem, mesmo com zero (zero fica apagado).
    // v0.37 (SCE-279, SCE-280): cupom e chave são atalhos: abrem o que está ligado à categoria (todos os lotes) para gerenciar.
    return (
        // v0.49 (SCE-297): um abaixo do outro, cada um com o que é.
        <ul className="flex flex-col items-start gap-1" aria-label="Vínculos">
            <li>
                <Tooltip title={texto} description="Clique para escolher as perguntas desta categoria">
                    <TooltipTrigger
                        aria-label={`${texto}: escolher perguntas`}
                        // v0.44 (SCE-291): abre sempre, mesmo com zero: é o atalho para incluir perguntas.
                        onPress={() => setListaAberta(true)}
                        className={cx(
                            "flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium ring-1 ring-secondary outline-focus-ring transition duration-100 ease-linear ring-inset hover:bg-primary_hover focus-visible:outline-2",
                            perguntas > 0 ? "text-secondary" : "text-quaternary",
                        )}
                    >
                        <ClipboardCheck className={cx("size-3.5", perguntas > 0 ? "text-fg-quaternary" : "text-fg-quaternary opacity-50")} aria-hidden="true" />
                        {perguntas} {perguntas === 1 ? "pergunta" : "perguntas"}
                    </TooltipTrigger>
                </Tooltip>
            </li>
            <li>
                <AtalhoMarketing recurso="cupom" alvo={{ categoria: c }} />
            </li>
            <li>
                <AtalhoMarketing recurso="chave" alvo={{ categoria: c }} />
            </li>
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
    const { rascunho: r, atualizar, irParaPendencia } = useFormulario();
    const { t } = useVocabulario();
    const nome = c.nome.trim() || t.nivel2SemNome;
    const modalidade = r.modalidades.find((m) => m.categorias.some((x) => x.id === c.id));
    // v0.44 (SCE-291): atalho como o de cupons: todas as perguntas do evento, marcadas as que aparecem aqui.
    const [antes, setAntes] = useState(r.perguntas);
    useEffect(() => {
        if (aberto) setAntes(r.perguntas);
    }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
    const marcadas = r.perguntas.filter((p) => presencaNa(p, c.id) !== "nao").length;
    const mudar = (id: string, estado: Presenca | "nao") => atualizar((x) => ({ ...x, perguntas: x.perguntas.map((p) => (p.id === id ? comPresenca(p, [c.id], estado) : p)) }));
    const todas = (ligar: boolean) => atualizar((x) => ({ ...x, perguntas: x.perguntas.map((p) => (ligar ? (presencaNa(p, c.id) === "nao" ? comPresenca(p, [c.id], p.padrao) : p) : comPresenca(p, [c.id], "nao"))) }));
    const cancelar = () => {
        atualizar((x) => ({ ...x, perguntas: antes }));
        onFechar();
    };
    const editar = (perguntaId: string) => {
        onFechar();
        irParaPendencia({ secao: "inscricao", campo: CAMPO.perguntaTexto(perguntaId), texto: "", pergunta: perguntaId });
    };
    return (
        // v0.57 (SCE-317): fechar (X, Esc, clique fora) mantém; só "Cancelar" desfaz.
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && onFechar()} isDismissable>
            <Modal className="sm:max-w-xl">
                <Dialog aria-label={`Perguntas de ${nome}`}>
                    <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex shrink-0 flex-col gap-1 px-6 pt-6 pb-4">
                            <h2 className="text-lg font-semibold text-primary">Perguntas do formulário</h2>
                            <p className="text-sm text-tertiary">
                                {modalidade?.nome ?? ""} › {nome} · {marcadas} de {r.perguntas.length} aparecem na inscrição. Marque para incluir.
                            </p>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-y border-secondary px-6 py-5">
                            {r.perguntas.length === 0 ? (
                                <p className="py-4 text-center text-sm text-tertiary">O formulário do evento ainda não tem perguntas. Crie no passo Formulário de inscrição.</p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" color="secondary" isDisabled={marcadas === r.perguntas.length} onClick={() => todas(true)}>
                                            Marcar todas
                                        </Button>
                                        <Button size="sm" color="secondary" isDisabled={marcadas === 0} onClick={() => todas(false)}>
                                            Desmarcar todas
                                        </Button>
                                    </div>
                                    <ol className="flex flex-col divide-y divide-secondary rounded-xl px-4 ring-1 ring-secondary">
                                        {r.perguntas.map((p, i) => {
                                            const presenca = presencaNa(p, c.id);
                                            const ligada = presenca !== "nao";
                                            return (
                                                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                                                    <span className="w-5 shrink-0 text-sm text-tertiary tabular-nums">{i + 1}.</span>
                                                    <Checkbox
                                                        className="min-w-0 flex-1"
                                                        isSelected={ligada}
                                                        onChange={(v) => mudar(p.id, v ? p.padrao : "nao")}
                                                        label={<span className="font-semibold text-primary">{p.titulo.trim() || "Pergunta sem título"}</span>}
                                                        hint={`${labelDe(TIPOS_DE_RESPOSTA, p.tipo)} · ${p.padrao === "obrigatoria" ? "obrigatória" : "opcional"}`}
                                                    />
                                                    <ButtonUtility size="xs" color="tertiary" icon={Edit01} tooltip="Editar no formulário" aria-label={`Editar ${p.titulo} no formulário`} onClick={() => editar(p.id)} />
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </>
                            )}
                        </div>
                        <div className="flex shrink-0 justify-end gap-3 px-6 py-4">
                            <Button size="md" color="secondary" onClick={cancelar}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary" onClick={onFechar}>
                                Concluir
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
                <CampoTipoDeModalidade id={CAMPO.modTipo(m.id)} label={t.tipoDoNivel1} tooltip={t.ajudaDoTipo} isRequired opcoes={TIPOS_DE_MODALIDADE} valor={tipo} onChange={setTipo} erro={erros.tipo} />
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
                                umaLinha
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
                            <CampoTipoDeModalidade id="nova-mod-tipo" label={t.tipoDoNivel1} tooltip={t.ajudaDoTipo} isRequired opcoes={TIPOS_DE_MODALIDADE} valor={tipo} onChange={setTipo} erro={tentou ? erros.tipo : undefined} />
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
                                umaLinha
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

/* ------------------------------------------------------------------ */
/*  Estado de venda da categoria (v0.30, SCE-263): à venda, programada, */
/*  não programada, esgotada ou encerrada, com a data de apoio.         */
/*  "Não programada" leva ao passo Abertura de vendas.                  */
/* ------------------------------------------------------------------ */

const ESTILO_DO_SELO: Record<TipoDeStatusDeVenda, { cor: "success" | "blue" | "gray" | "error" | "warning"; ponto: string }> = {
    "a-venda": { cor: "success", ponto: "bg-fg-success-secondary" },
    programada: { cor: "blue", ponto: "bg-utility-blue-500" },
    "nao-programada": { cor: "warning", ponto: "bg-fg-warning-secondary" },
    esgotada: { cor: "error", ponto: "bg-fg-error-secondary" },
    encerrada: { cor: "gray", ponto: "bg-fg-quaternary" },
    pausada: { cor: "gray", ponto: "bg-fg-quaternary" },
};

function SeloDeVenda({ categoria: c, compacto, semRotulo }: { categoria: Categoria; compacto?: boolean; semRotulo?: boolean }) {
    const { rascunho: r, irParaPendencia } = useFormulario();
    const s = statusDeVenda(r, c);
    const estilo = ESTILO_DO_SELO[s.tipo];
    // v0.69: na linha do celular, só o selo (o toque abre os detalhes; nada de botão dentro de botão).
    if (compacto)
        return (
            <span className="flex">
                <Badge type="pill-color" size="sm" color={estilo.cor}>
                    <span className={cx("mr-1.5 size-1.5 rounded-full", estilo.ponto)} aria-hidden="true" />
                    {s.rotulo}
                </Badge>
            </span>
        );
    return (
        <span className="flex flex-col items-start gap-0.5">
            {!semRotulo && <span className="sr-only">Venda:</span>}
            <Badge type="pill-color" size="sm" color={estilo.cor}>
                <span className={cx("mr-1.5 size-1.5 rounded-full", estilo.ponto, s.tipo === "a-venda" && "animate-pulse motion-reduce:animate-none")} aria-hidden="true" />
                {s.rotulo}
            </Badge>
            {s.tipo === "nao-programada" ? (
                <button
                    type="button"
                    className="rounded text-xs font-semibold text-brand-secondary underline underline-offset-2 outline-focus-ring hover:text-brand-secondary_hover focus-visible:outline-2"
                    onClick={() => irParaPendencia({ secao: "vendas", campo: CAMPO.aberturas, texto: "" })}
                >
                    Programar
                </button>
            ) : (
                s.detalhe && <span className="text-xs text-tertiary">{s.detalhe}</span>
            )}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Selo "Oculta" (v0.41, SCE-288): item com chave de acesso ativa só  */
/*  aparece para quem tem a chave ou o link. Curto, roxo, com olho     */
/*  riscado; o detalhe fica no tooltip.                                */
/* ------------------------------------------------------------------ */

function SeloOculta({ lotes, comTexto }: { lotes: string[]; comTexto?: boolean }) {
    const { rascunho: r } = useFormulario();
    const ocultos = lotes.filter((id) => loteOculto(r, id)).length;
    if (!ocultos) return null;
    const titulo = lotes.length === 1 ? "Oculto: só com chave de acesso" : ocultos === lotes.length ? "Oculta: só com chave de acesso" : `${ocultos} de ${lotes.length} lotes ocultos: só com chave`;
    const explicacao = "Não aparece para o público. Só quem digita a chave de acesso ou abre o link dela vê e compra.";
    // v0.69: no celular (detalhes), o texto aparece por escrito: o toque não abre tooltip.
    if (comTexto)
        return (
            <p className="flex items-start gap-2 text-sm text-secondary">
                <EyeOff className="mt-0.5 size-4 shrink-0 text-utility-purple-500" aria-hidden="true" />
                <span>
                    <span className="font-semibold text-primary">{titulo}.</span> {explicacao}
                </span>
            </p>
        );
    return (
        <Tooltip title={titulo} description="Não aparece para o público. Só quem digita a chave de acesso ou abre o link dela vê e compra.">
            <TooltipTrigger className="flex size-6 shrink-0 items-center justify-center rounded-md text-utility-purple-500 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2" aria-label={titulo}>
                <EyeOff className="size-4" aria-hidden="true" />
            </TooltipTrigger>
        </Tooltip>
    );
}

/** Estado do lote na coluna Venda (SCE-326): pausado, esgotado, vende primeiro / à venda ou aguarda a virada. */
function EstadoDoLote({ categoria: c, lote: l }: { categoria: Categoria; lote: Categoria["lotes"][number] }) {
    const { rascunho: r } = useFormulario();
    const publicado = r.publicado || !!r.simularPublicado;
    const ativos = c.lotes.filter((x) => x.ativo !== false);
    const esgotado = statusDeVenda(r, c).tipo === "esgotada" && ativos[ativos.length - 1]?.id === l.id;
    const [rotulo, ponto] =
        l.ativo === false || c.ativa === false
            ? ["Pausado", "bg-fg-quaternary"]
            : esgotado
              ? ["Esgotado", "bg-fg-error-secondary"]
              : ativos[0]?.id === l.id
                ? [publicado ? "À venda" : "Vende primeiro", publicado ? "bg-fg-success-secondary" : "bg-utility-blue-500"]
                : ["Aguarda virada", "bg-fg-quaternary"];
    return (
        <span className="flex items-center gap-1.5 text-sm text-secondary">
            <span className={cx("size-1.5 shrink-0 rounded-full", ponto)} aria-hidden="true" />
            {rotulo}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Ativa ou pausada (v0.58, SCE-324): toggle antes do nome, como no    */
/*  AWA (ingresso e lote). Desligar para a venda na hora, com toast e  */
/*  Desfazer (ITM-03).                                                  */
/* ------------------------------------------------------------------ */

function AtivaOuPausada({ nome, ativa, feminino, onChange, comRotulo }: { nome: string; ativa: boolean; feminino: boolean; onChange: (v: boolean) => void; comRotulo?: boolean }) {
    const { rascunho: r } = useFormulario();
    const publicado = r.publicado || !!r.simularPublicado;
    const a = feminino ? "a" : "o";
    const mudar = (v: boolean) => {
        onChange(v);
        // v0.69 (critique UI-TXT-001): no rascunho nada vende ainda; o aviso diz o efeito na publicação.
        const texto = publicado
            ? v
                ? `${nome} voltou a vender.`
                : `${nome} pausad${a}. Para de vender na hora.`
            : v
              ? `${nome} vai vender quando o evento for publicado.`
              : `${nome} pausad${a}. Não vende quando o evento for publicado.`;
        toast(texto, { action: { label: "Desfazer", onClick: () => onChange(!v) } });
    };
    return (
        // Sem Tooltip em volta: o toggle já é o controle (nada de botão dentro de botão). O estado vai no nome acessível.
        // v0.69 (critique UI-FRM-005): rótulo visível: "À venda" no cabeçalho da tabela; nos detalhes, ao lado do toggle.
        <span className={cx("flex shrink-0", comRotulo ? "items-center" : "w-14 flex-col items-start gap-1 @3xl:w-11")}>
            <Toggle size="sm" aria-label={`${nome}: ${ativa ? "à venda" : "pausad" + a}`} isSelected={ativa} onChange={mudar} label={comRotulo ? (ativa ? "À venda" : `Pausad${a}`) : undefined} />
            {/* No celular a tabela não tem cabeçalho: o estado fica escrito embaixo do toggle. */}
            {!comRotulo && (
                <span className="text-xs whitespace-nowrap text-tertiary @3xl:hidden" aria-hidden="true">
                    {ativa ? "À venda" : `Pausad${a}`}
                </span>
            )}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Edição rápida de preço e quantidade do lote (v0.66, SCE-335)        */
/*  Como o "editar estoque" do Backstage: lápis ao lado do valor (no    */
/*  hover no desktop; sempre visível no toque); o valor vira campo com  */
/*  Salvar e Cancelar; Enter salva, Esc cancela; erro no próprio campo. */
/* ------------------------------------------------------------------ */

/** No evento em criação ainda não há inscrições; com o evento publicado, viria das emissões do lote. */
const EMITIDAS_NO_RASCUNHO = 0;

function EdicaoRapida({
    rotulo,
    valor,
    texto,
    formato,
    bloqueado,
    validar,
    onSalvar,
}: {
    rotulo: string;
    valor: number | null;
    texto: string;
    formato?: Intl.NumberFormatOptions;
    bloqueado?: boolean;
    validar: (v: number | null) => string | undefined;
    onSalvar: (v: number) => void;
}) {
    const ancora = useRef<HTMLSpanElement>(null);
    const [editando, setEditando] = useState(false);
    const [rascunho, setRascunho] = useState<number | null>(valor);
    // O NumberField confirma o número ao sair do campo ou no Enter; a ref guarda o último valor confirmado.
    const atual = useRef<number | null>(valor);
    const [erro, setErro] = useState<string>();
    const id = `edicao-${rotulo.replace(/\W+/g, "-")}`;
    const abrir = () => {
        atual.current = valor;
        setRascunho(valor);
        setErro(undefined);
        setEditando(true);
        // O campo já abre com o foco e o valor selecionado, pronto para digitar.
        setTimeout(() => {
            const campo = document.querySelector<HTMLInputElement>(`[data-edicao="${id}"] input`);
            campo?.focus();
            campo?.select();
        }, 60);
    };
    const salvar = () => {
        // Lê o que está escrito no campo (o NumberField só confirma ao sair dele).
        const campo = document.querySelector<HTMLInputElement>(`[data-edicao="${id}"] input`);
        const texto = campo?.value.trim() ?? "";
        const lido = campo ? (texto ? new NumberParser("pt-BR", formato ?? {}).parse(texto) : null) : atual.current;
        const v = lido != null && Number.isNaN(lido) ? null : lido;
        const e = validar(v);
        if (e) return setErro(e);
        if (v !== valor && v != null) onSalvar(v);
        setEditando(false);
    };
    // v0.69 (SCE-339): com as vendas do lote iniciadas, o valor fica fixo e o cadeado explica por quê.
    if (bloqueado)
        return (
            <span className="flex items-center gap-1">
                <span className="text-sm text-secondary">{texto}</span>
                <Tooltip title="Vendas iniciadas" description={AVISO_LOTE_BLOQUEADO}>
                    <TooltipTrigger aria-label={`${rotulo}: não pode mudar. ${AVISO_LOTE_BLOQUEADO}`} className="flex size-7 items-center justify-center rounded-md text-fg-quaternary outline-focus-ring focus-visible:outline-2">
                        <Lock01 className="size-4" aria-hidden="true" />
                    </TooltipTrigger>
                </Tooltip>
            </span>
        );
    // v0.69 (critique UI-VIS-008): a edição abre num balão ancorado no valor; a linha não muda de altura.
    return (
        <span ref={ancora} className="group/edicao flex items-center gap-1">
            <span className="text-sm text-secondary">{texto}</span>
            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={Edit01}
                tooltip={`Editar ${rotulo.toLowerCase()}`}
                aria-label={`Editar ${rotulo.toLowerCase()}`}
                onClick={abrir}
                className={cx("opacity-100 transition-opacity @3xl:opacity-0 @3xl:group-hover/edicao:opacity-100 @3xl:focus-visible:opacity-100", editando && "@3xl:opacity-100")}
            />
            <AriaPopover
                triggerRef={ancora}
                isOpen={editando}
                onOpenChange={setEditando}
                placement="bottom start"
                offset={6}
                className={({ isEntering, isExiting }) =>
                    cx(
                        "z-50 w-72 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary_alt outline-hidden",
                        isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-0.5 motion-reduce:slide-in-from-top-0",
                        isExiting && "duration-100 ease-in animate-out fade-out",
                    )
                }
            >
                <AriaDialog aria-label={rotulo} className="outline-hidden">
                    <form
                        data-edicao={id}
                        className="flex flex-col gap-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            salvar();
                        }}
                    >
                        <CampoNumero id={id} label={rotulo} valor={rascunho} onChange={(v) => ((atual.current = Number.isNaN(v) ? null : v), setRascunho(v), setErro(undefined))} formato={formato} erro={erro} semSetas />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" color="secondary" onClick={() => setEditando(false)}>
                                Cancelar
                            </Button>
                            <Button size="sm" color="primary" type="submit" iconLeading={Check}>
                                Salvar
                            </Button>
                        </div>
                    </form>
                </AriaDialog>
            </AriaPopover>
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Detalhes da categoria no celular (v0.69, critique UI-MOB-005)      */
/*  A linha da tabela-lista abre o painel em tela cheia com tudo o     */
/*  que a tabela mostra no desktop: venda, preço, emissões, vínculos,  */
/*  lotes (pausar, editar preço e quantidade, estado, cupom e chave)   */
/*  e as ações da categoria.                                           */
/* ------------------------------------------------------------------ */

function DetalhesDaCategoria({
    categoria: c,
    nome,
    nomeDaModalidade,
    selos,
    faixaDePreco,
    textoDeEmissoes,
    onPausarCategoria,
    onPausarLote,
    edicaoDoPreco,
    edicaoDaQuantidade,
    onEditar,
    onDuplicar,
    onRemover,
    onFechar,
}: {
    categoria: Categoria;
    nome: string;
    nomeDaModalidade: string;
    selos: ReactNode;
    faixaDePreco: string;
    textoDeEmissoes: string;
    onPausarCategoria: (v: boolean) => void;
    onPausarLote: (loteId: string, v: boolean) => void;
    edicaoDoPreco: (l: Categoria["lotes"][number], i: number) => ReactNode;
    edicaoDaQuantidade: (l: Categoria["lotes"][number], i: number) => ReactNode;
    onEditar: () => void;
    onDuplicar: () => void;
    onRemover: () => void;
    onFechar: () => void;
}) {
    const { t } = useVocabulario();
    const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
        <div className="flex flex-col gap-1">
            <dt className="text-sm text-tertiary">{rotulo}</dt>
            <dd className="text-sm text-primary">{children}</dd>
        </div>
    );
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(v) => !v && onFechar()} className="z-50 pl-0" dialogClassName="gap-0">
            <SlideoutMenu.Header onClose={onFechar} className="flex flex-col gap-1 pb-4">
                <h2 className="flex flex-wrap items-center gap-2 pr-8 text-lg font-semibold text-primary">
                    {nome}
                    {selos}
                </h2>
                <p className="text-sm text-tertiary">
                    {nomeDaModalidade} · {resumoDaCategoria(c)}
                </p>
            </SlideoutMenu.Header>
            <SlideoutMenu.Content className="gap-0 border-t border-secondary">
                <section className="flex flex-col gap-4 py-5">
                    <h3 className="text-md font-semibold text-primary">Venda</h3>
                    <AtivaOuPausada nome={nome} ativa={c.ativa !== false} feminino={t.nivel2.genero === "f"} onChange={onPausarCategoria} comRotulo />
                    <dl className="flex flex-col gap-3">
                        <Campo rotulo="Estado">
                            <SeloDeVenda categoria={c} semRotulo />
                        </Campo>
                        <Campo rotulo="Preço">{faixaDePreco}</Campo>
                        <Campo rotulo="Emissões e estoque">{textoDeEmissoes}</Campo>
                    </dl>
                    <SeloOculta lotes={c.lotes.map((l) => l.id)} comTexto />
                </section>
                <section className="flex flex-col gap-3 border-t border-secondary py-5">
                    <h3 className="text-md font-semibold text-primary">Vínculos</h3>
                    <Vinculos categoria={c} />
                </section>
                <section className="flex flex-col gap-3 border-t border-secondary py-5">
                    <h3 className="text-md font-semibold text-primary">Lotes</h3>
                    {c.lotes.length === 0 && <p className="text-sm text-tertiary">Nenhum lote. Toque em "Editar categoria" para adicionar.</p>}
                    <ol className="flex flex-col divide-y divide-secondary">
                        {c.lotes.map((l, i) => (
                            <li key={l.id} className="flex flex-col gap-3 py-4 first:pt-0">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-primary">{nomeDoLote(l, i)}</span>
                                    {l.revisar && (
                                        <BadgeWithIcon size="sm" type="pill-color" color="warning" iconLeading={AlertTriangle}>
                                            Revisar
                                        </BadgeWithIcon>
                                    )}
                                </span>
                                <span className="-mt-2 text-sm text-tertiary">{l.dataLimite ? `Até ${formatarDataHora(l.dataLimite)}` : "Vira quando esgota"}</span>
                                <AtivaOuPausada nome={nomeDoLote(l, i)} ativa={l.ativo !== false} feminino={false} onChange={(v) => onPausarLote(l.id, v)} comRotulo />
                                <dl className="grid grid-cols-2 gap-3">
                                    <Campo rotulo="Preço">{edicaoDoPreco(l, i)}</Campo>
                                    <Campo rotulo="Emissões e estoque">{edicaoDaQuantidade(l, i)}</Campo>
                                    <Campo rotulo="Venda">
                                        <EstadoDoLote categoria={c} lote={l} />
                                    </Campo>
                                </dl>
                                <SeloOculta lotes={[l.id]} comTexto />
                                <div className="flex flex-wrap gap-2">
                                    <AtalhoMarketing recurso="cupom" alvo={{ categoria: c, lote: l }} />
                                    <AtalhoMarketing recurso="chave" alvo={{ categoria: c, lote: l }} />
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer className="flex flex-col gap-3">
                <Button color="primary" size="md" iconLeading={Edit01} onClick={onEditar} className="w-full">
                    Editar {t.nivel2.um}
                </Button>
                <div className="grid grid-cols-2 gap-3">
                    <Button color="secondary" size="md" iconLeading={Copy01} onClick={onDuplicar}>
                        {t.duplicarNivel2}
                    </Button>
                    <Button color="secondary-destructive" size="md" iconLeading={Trash01} onClick={onRemover}>
                        Excluir
                    </Button>
                </div>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
