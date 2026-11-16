import { Fragment, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle, Flag01, Plus, Trash01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { cx } from "@/utils/cx";
import { CAMPO, FORMATO_REAIS, formatarDataHora, formatarReais, horaAgora } from "../data/campos";
import { duplicarModalidade, marcarLotesParaRevisar, nomeDeCopia, novoLote } from "../data/modelos";
import { labelDe, MSG, TIPOS_DE_MODALIDADE } from "../data/opcoes";
import { copiarVinculos, herdarPerguntas } from "../data/perguntas";
import { salvarAgora } from "../data/rascunho";
import type { FluxoDeCopia as Fluxo, Lote, Modalidade, Rascunho } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { ArvoreDeModalidades, useSelecaoDeModalidades } from "./arvore-de-modalidades";
import { CampoDataHora, CampoNumero, CampoTexto, CampoVagas, ErroDaLista } from "./campos";
import { useFormulario } from "./contexto";
import { EscolherDeOutroEvento } from "./copiar-modalidades";
import { comCategoria, comLote, comModalidade, inserirDepois } from "./operacoes";

/* ------------------------------------------------------------------ */
/*  Fluxo de cópia em dois passos (v0.7 e v0.8, SCE-180 a SCE-195)     */
/*  "1 Escolher o que trazer › 2 Revisar modalidades, categorias e     */
/*  lotes", dentro da etapa Modalidades (A e B), é o padrão para:      */
/*  - a cópia do evento inteiro (início): escolhe nas modalidades já   */
/*    copiadas;                                                         */
/*  - "Copiar de outro evento": escolhe o evento, o que trazer e se o  */
/*    formulário vem junto (copiar-modalidades.tsx);                    */
/*  - duplicar modalidade: as categorias dela e o formulário;          */
/*  - duplicar categoria: vai direto para a revisão.                    */
/*  Na revisão, todo lote copiado começa "Revisar"; dá para marcar     */
/*  como revisado (lote, categoria ou tudo), editar ou excluir.        */
/* ------------------------------------------------------------------ */

/** Só as modalidades (e categorias) do escopo da revisão. */
export const escopar = (ms: Modalidade[], escopo?: Fluxo["escopo"]): Modalidade[] =>
    escopo
        ? ms.filter((m) => escopo.modalidades.includes(m.id)).map((m) => (escopo.categorias ? { ...m, categorias: m.categorias.filter((c) => escopo.categorias!.includes(c.id)) } : m))
        : ms;

/** Abre o passo 2 (revisão) para o escopo, guardando o original (antes → depois) e o estado anterior (desfazer). */
export function entrarNaRevisao(r: Rascunho, escopo: NonNullable<Fluxo["escopo"]>, antes?: Fluxo["antes"]): Rascunho {
    return {
        ...r,
        fluxoDeCopia: { ...(r.fluxoDeCopia ?? { tipo: "evento" }), etapa: "revisar", escopo, original: structuredClone(escopar(r.modalidades, escopo)), antes },
    };
}

export function FluxoDeCopia() {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const f = r.fluxoDeCopia!;
    const origem = r.modalidades.find((m) => m.id === f.origemId);
    const categoriaDuplicada = f.tipo === "duplicar-categoria" ? escopar(r.modalidades, f.escopo)[0]?.categorias[0] : undefined;
    const cancelar = () => atualizar((a) => ({ ...a, fluxoDeCopia: undefined }));

    const titulo =
        f.tipo === "evento"
            ? t.tituloDaSecao
            : f.tipo === "outro-evento"
              ? t.copiarNivel1Titulo
              : f.tipo === "duplicar-modalidade"
                ? t.duplicarNivel1Titulo(origem?.nome.trim() || t.nivel1SemNome)
                : t.duplicarNivel2Titulo(categoriaDuplicada?.nome.trim() || t.nivel2SemNome);
    const passos = f.tipo === "duplicar-categoria" ? [t.guiadaRevisarNivel2] : [t.guiadaEscolherTitulo, t.guiadaRevisarTitulo];
    const atual = f.etapa === "escolher" ? 1 : passos.length;

    return (
        <section id="secao-modalidades" className="@container flex w-full scroll-mt-6 flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                {/* Onde a pessoa está: "1 Escolher o que trazer › 2 Revisar" (duplicar categoria: só a revisão). */}
                <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-label="Passos da cópia">
                    {passos.map((p, i) => (
                        <li key={p} className="flex items-center gap-2" aria-current={atual === i + 1 ? "step" : undefined}>
                            {i > 0 && <span aria-hidden="true" className="h-px w-6 bg-border-secondary" />}
                            <span
                                className={cx(
                                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                                    atual === i + 1 ? "bg-brand-solid text-white" : atual > i + 1 ? "bg-success-solid text-white" : "bg-secondary text-tertiary",
                                )}
                            >
                                {atual > i + 1 ? <CheckCircle className="size-4" aria-hidden="true" /> : i + 1}
                            </span>
                            <span className={atual === i + 1 ? "font-semibold text-primary" : "text-tertiary"}>{p}</span>
                        </li>
                    ))}
                </ol>
            </div>
            {f.etapa === "revisar" ? (
                <RevisarCopia />
            ) : f.tipo === "evento" ? (
                <EscolherDoEvento />
            ) : f.tipo === "outro-evento" ? (
                <EscolherDeOutroEvento onCancelar={cancelar} />
            ) : origem ? (
                <EscolherDaModalidade modalidade={origem} onCancelar={cancelar} />
            ) : null}
        </section>
    );
}

/* ---------------- Passo 1: cópia do evento inteiro ---------------- */

function EscolherDoEvento() {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [erro, setErro] = useState<string>();
    const selecao = useSelecaoDeModalidades(() => setErro(undefined), r.modalidades);

    const confirmar = () => {
        const escolhidas = selecao.escolhidas(r.modalidades);
        if (escolhidas.length === 0) return setErro(t.copiarNivel1NadaMarcado);
        const ficam = new Set(escolhidas.flatMap((m) => m.categorias.map((c) => c.id)));
        atualizar((a) =>
            entrarNaRevisao(
                {
                    ...a,
                    modalidades: escolhidas,
                    // O que não vem também sai do formulário: os vínculos das categorias desmarcadas somem.
                    perguntas: a.perguntas.map((p) => ({ ...p, vinculos: Object.fromEntries(Object.entries(p.vinculos).filter(([c]) => ficam.has(c))) })),
                },
                { modalidades: escolhidas.map((m) => m.id) },
            ),
        );
        requestAnimationFrame(() => document.getElementById("secao-modalidades")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    return (
        <>
            <p className="max-w-[65ch] text-sm text-tertiary">{t.guiadaEscolherDescricao}</p>
            <ArvoreDeModalidades fontes={r.modalidades} selecao={selecao} rotulo={t.copiarNivel1Escolha} />
            <div className="flex flex-col gap-3 border-t border-secondary pt-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="sm:mr-auto">
                    <ErroDaLista erro={erro} />
                </div>
                <Button size="md" color="primary" onClick={confirmar}>
                    Confirmar e continuar
                </Button>
            </div>
        </>
    );
}

/* ---------------- Passo 1: duplicar modalidade ---------------- */

function EscolherDaModalidade({ modalidade: m, onCancelar }: { modalidade: Modalidade; onCancelar: () => void }) {
    const { atualizar } = useFormulario();
    const { t } = useVocabulario();
    const selecao = useSelecaoDeModalidades(undefined, [m]);
    const [levar, setLevar] = useState<"categorias" | "formulario">("formulario");

    const confirmar = () => {
        atualizar((a) => {
            const origem = m.categorias.filter((c) => selecao.catMarcadas.has(c.id));
            const [copia] = marcarLotesParaRevisar([duplicarModalidade({ ...m, categorias: origem }, nomeDeCopia(m.nome, a.modalidades.map((x) => x.nome)))]);
            const dePara = Object.fromEntries(origem.map((c, i) => [c.id, copia.categorias[i].id]));
            const depois = {
                ...a,
                modalidades: inserirDepois(a.modalidades, m.id, copia),
                // Com o formulário: as mesmas perguntas das originais (SCE-105). Sem: só as marcadas para todas.
                perguntas: levar === "formulario" ? copiarVinculos(a.perguntas, dePara) : herdarPerguntas(a.perguntas, Object.values(dePara)),
            };
            return entrarNaRevisao(depois, { modalidades: [copia.id] }, { modalidades: a.modalidades, perguntas: a.perguntas });
        });
    };

    return (
        <>
            <p className="max-w-[65ch] text-sm text-tertiary">{t.duplicarNivel1EscolherDescricao}</p>
            <div className="grid gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <ArvoreDeModalidades fontes={[m]} selecao={selecao} rotulo={t.listaNivel2} />
                <div className="flex flex-col gap-3">
                    <span id="dup-mod-levar" className="text-sm font-medium text-secondary">
                        {t.oQueLevar}
                    </span>
                    <RadioGroup aria-labelledby="dup-mod-levar" value={levar} onChange={(v) => setLevar(v as "categorias" | "formulario")}>
                        <RadioButton value="formulario" label={t.nivel2EFormulario} hint={t.nivel2EFormularioDicaDuplicar} />
                        <RadioButton value="categorias" label={t.somenteNivel2} hint={t.somenteNivel2Dica} />
                    </RadioGroup>
                </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-secondary pt-4 sm:flex-row sm:justify-end">
                <Button size="md" color="secondary" onClick={onCancelar}>
                    Cancelar
                </Button>
                <Button size="md" color="primary" onClick={confirmar}>
                    Confirmar e continuar
                </Button>
            </div>
        </>
    );
}

/* ---------------- Passo 2: revisar ---------------- */

const vazio = (s: string) => !s.trim();

/** Campos obrigatórios em branco no escopo (nomes, vagas da modalidade, quantidade e valor). A data limite é opcional. */
export function camposEmBranco(ms: Modalidade[]) {
    let n = 0;
    for (const m of ms) {
        if (vazio(m.nome)) n++;
        if (!(m.vagas && m.vagas > 0)) n++;
        for (const c of m.categorias) {
            if (vazio(c.nome)) n++;
            for (const l of c.lotes) {
                if (vazio(l.nome)) n++;
                if (!l.vagas) n++;
                if (l.valor == null) n++;
            }
        }
    }
    return n;
}

const lotesARevisar = (ms: Modalidade[]) => ms.reduce((n, m) => n + m.categorias.reduce((k, c) => k + c.lotes.filter((l) => l.revisar).length, 0), 0);

/** "Falta preencher" no lugar da dica: aviso, não erro. */
const Falta = ({ children }: { children?: ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 font-medium text-warning-primary">
        <AlertTriangle className="size-4 shrink-0 text-fg-warning-primary" aria-hidden="true" />
        {children ?? MSG.faltaPreencher}
    </span>
);

/** Rótulo visível só quando a tabela empilha (cartão estreito); com a tabela, o cabeçalho das colunas faz esse papel. */
const RotuloEstreito = ({ children }: { children: ReactNode }) => (
    <span aria-hidden="true" className="text-sm font-medium text-secondary @4xl:hidden">
        {children}
    </span>
);

const COLUNAS_DO_LOTE = "@4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_15rem_10.5rem]";

function RevisarCopia() {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [confirmando, setConfirmando] = useState(false);
    const f = r.fluxoDeCopia!;
    const visiveis = escopar(r.modalidades, f.escopo);
    const aRevisar = lotesARevisar(visiveis);
    const emBranco = camposEmBranco(visiveis);
    const mudancas = diferencas(f.original ?? [], visiveis);
    const idsDoEscopo = new Set(visiveis.flatMap((m) => m.categorias.flatMap((c) => c.lotes.map((l) => l.id))));

    const marcarRevisados = (ids: Set<string>) =>
        atualizar((a) => ({ ...a, modalidades: a.modalidades.map((m) => ({ ...m, categorias: m.categorias.map((c) => ({ ...c, lotes: c.lotes.map((l) => (ids.has(l.id) ? { ...l, revisar: false } : l)) })) })) }));
    const concluir = () => {
        atualizar((a) => ({ ...a, fluxoDeCopia: undefined }));
        setConfirmando(false);
        toast.success(t.guiadaConcluida);
        requestAnimationFrame(() => document.getElementById("secao-modalidades")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    const desfazer = () => {
        const antes = f.antes;
        if (!antes) return;
        atualizar((a) => ({ ...a, ...antes, fluxoDeCopia: undefined }));
        toast(t.copiaDesfeita);
    };

    return (
        <>
            <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-start @3xl:justify-between">
                <p className="max-w-[65ch] text-sm text-tertiary">{t.guiadaRevisarDescricao}</p>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {aRevisar > 0 ? (
                        <BadgeWithIcon type="pill-color" color="warning" size="md" iconLeading={AlertTriangle}>
                            {t.lotesParaRevisar(aRevisar)}
                        </BadgeWithIcon>
                    ) : (
                        <BadgeWithIcon type="pill-color" color="success" size="md" iconLeading={CheckCircle}>
                            Todos os lotes revisados
                        </BadgeWithIcon>
                    )}
                    {emBranco > 0 && (
                        <Badge type="pill-color" color="gray" size="md">
                            {t.camposEmBranco(emBranco)}
                        </Badge>
                    )}
                    {aRevisar > 0 && (
                        <Button size="sm" color="secondary" iconLeading={Check} onClick={() => marcarRevisados(idsDoEscopo)}>
                            Marcar todos como revisados
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {visiveis.map((m) => (
                    <BlocoDaModalidade key={m.id} modalidade={m} onMarcar={marcarRevisados} nomeFixo={f.tipo === "duplicar-categoria"} />
                ))}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-secondary pt-4 sm:flex-row sm:items-center sm:justify-end">
                {f.antes && (
                    <Button size="md" color="link-gray" onClick={desfazer} className="sm:mr-auto">
                        {t.desfazerCopia}
                    </Button>
                )}
                <Button
                    size="md"
                    color="secondary"
                    onClick={() => {
                        salvarAgora();
                        toast.success(`Rascunho salvo às ${horaAgora()}. Ao voltar, você continua desta revisão.`);
                    }}
                >
                    Salvar e continuar depois
                </Button>
                <Button size="md" color="primary" onClick={() => (mudancas.length ? setConfirmando(true) : concluir())}>
                    Salvar e continuar
                </Button>
            </div>

            <ModalOverlay isOpen={confirmando} onOpenChange={(v) => !v && setConfirmando(false)} isDismissable>
                <Modal className="sm:max-w-xl">
                    <Dialog aria-label={t.guiadaConfirmarTitulo}>
                        <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                            <div className="flex shrink-0 flex-col gap-1 px-6 pt-6 pb-4">
                                <h2 className="text-lg font-semibold text-primary">{t.guiadaConfirmarTitulo}</h2>
                                <p className="text-sm text-tertiary">{t.guiadaConfirmarDescricao}</p>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-4">
                                <ListaDeMudancas mudancas={mudancas} />
                            </div>
                            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-secondary px-6 py-4">
                                <Button size="md" color="secondary" onClick={() => setConfirmando(false)}>
                                    Voltar e editar
                                </Button>
                                <Button size="md" color="primary" onClick={concluir}>
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}

/** Modalidade: bloco com rótulo "Modalidade", nome em destaque e o tipo; as categorias ficam aninhadas embaixo. */
function BlocoDaModalidade({ modalidade: m, onMarcar, nomeFixo }: { modalidade: Modalidade; onMarcar: (ids: Set<string>) => void; nomeFixo?: boolean }) {
    const { atualizar } = useFormulario();
    const { t } = useVocabulario();
    const pendentes = lotesARevisar([m]);
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl bg-primary ring-1 ring-border-secondary">
            <div className="flex flex-col gap-2 border-b border-secondary bg-secondary/60 px-5 py-4">
                <span className="text-xs font-semibold tracking-wide text-tertiary uppercase">{t.nivel1.Um}</span>
                <div className="flex flex-wrap items-start gap-3">
                    <Flag01 className="mt-2.5 size-5 shrink-0 text-fg-secondary" aria-hidden="true" />
                    {/* Duplicar categoria: a modalidade é a de sempre, só para contexto (não se edita aqui). */}
                    {nomeFixo ? (
                        <span className="mt-2 text-md font-semibold text-primary">{m.nome.trim() || t.nivel1SemNome}</span>
                    ) : (
                    <CampoTexto
                        id={CAMPO.modNome(m.id)}
                        label={t.nomeDoNivel1}
                        ocultarLabel
                        className="w-full max-w-md [&_input]:text-md [&_input]:font-semibold"
                        valor={m.nome}
                        onChange={(nome) => atualizar(comModalidade(m.id, (x) => ({ ...x, nome })))}
                        dica={vazio(m.nome) ? <Falta /> : undefined}
                    />
                    )}
                    {m.tipo && (
                        <Badge type="modern" color="gray" size="md" className="mt-2">
                            {labelDe(TIPOS_DE_MODALIDADE, m.tipo)}
                        </Badge>
                    )}
                    {pendentes > 0 && (
                        <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle} className="mt-2.5">
                            {`${t.ajustar}: ${pendentes === 1 ? "1 lote" : `${pendentes} lotes`}`}
                        </BadgeWithIcon>
                    )}
                    {/* v0.14/v0.15 (SCE-211, SCE-212): vagas da modalidade na revisão, sempre com número (sem "Sem limite"). */}
                    <div className="w-full @2xl:ml-auto @2xl:w-48">
                        {nomeFixo ? (
                            <p className="flex flex-col gap-0.5 text-sm">
                                <span className="font-medium text-secondary">Vagas</span>
                                <span className="text-tertiary">{vagasDaModalidade(m.vagas)}</span>
                            </p>
                        ) : (
                            <CampoVagas
                                id={CAMPO.modVagas(m.id)}
                                label="Vagas"
                                tooltip={t.ajudaVagasNivel1}
                                semLimitePermitido={false}
                                semLimite={false}
                                vagas={m.vagas}
                                onChange={(_s, vagas) => atualizar(comModalidade(m.id, (x) => ({ ...x, vagas })))}
                                // Sem número (a origem não tinha): "Falta preencher", como os outros campos; zero: erro.
                                dica={m.vagas == null ? <Falta /> : undefined}
                                erro={m.vagas != null && !(m.vagas > 0) ? MSG.maiorQueZero : undefined}
                            />
                        )}
                    </div>
                </div>
            </div>
            {m.categorias.length === 0 && <p className="px-5 py-4 text-sm text-tertiary">{t.vazioNivel2}. Você cria depois, na lista.</p>}
            <div className="flex flex-col gap-4 p-4 @3xl:p-5">
                {m.categorias.map((c) => (
                    <BlocoDaCategoria key={c.id} modalidade={m} categoriaId={c.id} onMarcar={onMarcar} />
                ))}
            </div>
        </div>
    );
}

/** Categoria: sub-bloco recuado com rótulo "Categoria" e a tabela dos lotes (cabeçalho das colunas uma vez só). */
function BlocoDaCategoria({ modalidade: m, categoriaId, onMarcar }: { modalidade: Modalidade; categoriaId: string; onMarcar: (ids: Set<string>) => void }) {
    const { atualizar } = useFormulario();
    const { t } = useVocabulario();
    const c = m.categorias.find((x) => x.id === categoriaId)!;
    const pendentes = c.lotes.filter((l) => l.revisar);
    return (
        <div className="flex flex-col gap-3 rounded-xl border-l-4 border-brand bg-secondary/30 py-3 pr-3 pl-4 ring-1 ring-secondary">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-xs font-semibold tracking-wide text-tertiary uppercase">{t.nivel2.Um}</span>
                    <CampoTexto
                        id={CAMPO.catNome(c.id)}
                        label={t.nomeDoNivel2}
                        ocultarLabel
                        className="w-full max-w-sm"
                        valor={c.nome}
                        onChange={(nome) => atualizar(comCategoria(m.id, c.id, (x) => ({ ...x, nome })))}
                        dica={vazio(c.nome) ? <Falta /> : undefined}
                    />
                </div>
                {pendentes.length > 1 && (
                    <Button size="sm" color="link-color" iconLeading={Check} onClick={() => onMarcar(new Set(pendentes.map((l) => l.id)))} className="mt-6">
                        {`Marcar os ${pendentes.length} lotes como revisados`}
                    </Button>
                )}
            </div>

            {c.lotes.length === 0 ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Falta>{t.msgSemLote}</Falta>
                    <Button size="sm" color="link-color" iconLeading={Plus} onClick={() => atualizar(comCategoria(m.id, c.id, (x) => ({ ...x, lotes: [novoLote(1)] })))}>
                        Adicionar lote
                    </Button>
                </div>
            ) : (
                <div role="table" aria-label={`Lotes de ${c.nome.trim() || t.nivel2SemNome}`} className="flex flex-col">
                    {/* Cabeçalho das colunas, uma vez só (tabela larga); empilhado, cada campo mostra o rótulo. */}
                    <div role="row" className={cx("hidden gap-3 border-b border-secondary pb-2 text-xs font-semibold text-tertiary @4xl:grid", COLUNAS_DO_LOTE)}>
                        <span role="columnheader">Lote</span>
                        <span role="columnheader">Quantidade</span>
                        <span role="columnheader">Valor</span>
                        <span role="columnheader">Data limite (opcional)</span>
                        <span role="columnheader">Status</span>
                    </div>
                    {c.lotes.map((l) => (
                        <LinhaDoLote key={l.id} modalidade={m} categoriaId={c.id} lote={l} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LinhaDoLote({ modalidade: m, categoriaId, lote: l }: { modalidade: Modalidade; categoriaId: string; lote: Lote }) {
    const { atualizar } = useFormulario();
    // Mexer em qualquer campo marca o lote como revisado (SCE-191); o botão faz o mesmo sem mudar nada.
    const set = (mudanca: Partial<Lote>) => atualizar(comLote(m.id, categoriaId, l.id, (x) => ({ ...x, ...mudanca, revisar: false })));
    const nome = l.nome.trim() || "lote";
    const remover = () => {
        const antes = m.categorias.find((c) => c.id === categoriaId)?.lotes ?? [];
        atualizar(comCategoria(m.id, categoriaId, (x) => ({ ...x, lotes: x.lotes.filter((y) => y.id !== l.id) })));
        toast(`${nome.charAt(0).toUpperCase()}${nome.slice(1)} removido`, {
            action: { label: "Desfazer", onClick: () => atualizar(comCategoria(m.id, categoriaId, (x) => ({ ...x, lotes: antes }))) },
        });
    };
    return (
        <div role="row" className={cx("grid items-start gap-3 border-b border-secondary py-3 last:border-b-0 @lg:grid-cols-2", COLUNAS_DO_LOTE)}>
            <div role="cell" className="flex flex-col gap-1.5">
                <RotuloEstreito>Lote</RotuloEstreito>
                <CampoTexto id={CAMPO.loteNome(l.id)} label="Lote" ocultarLabel placeholder="Ex.: 1º lote" valor={l.nome} onChange={(nome) => set({ nome })} dica={vazio(l.nome) ? <Falta /> : undefined} />
            </div>
            <div role="cell" className="flex flex-col gap-1.5">
                <RotuloEstreito>Quantidade</RotuloEstreito>
                <CampoNumero id={CAMPO.loteVagas(l.id)} label="Quantidade" ocultarLabel placeholder="Ex.: 200" valor={l.vagas} onChange={(vagas) => set({ vagas })} dica={!l.vagas ? <Falta /> : undefined} />
            </div>
            <div role="cell" className="flex flex-col gap-1.5">
                <RotuloEstreito>Valor</RotuloEstreito>
                <CampoNumero
                    id={CAMPO.loteValor(l.id)}
                    label="Valor"
                    ocultarLabel
                    placeholder="R$ 0,00"
                    formato={FORMATO_REAIS}
                    valor={l.valor}
                    onChange={(valor) => set({ valor })}
                    dica={l.valor == null ? <Falta /> : undefined}
                />
            </div>
            <div role="cell" className="flex flex-col gap-1.5">
                <RotuloEstreito>Data limite (opcional)</RotuloEstreito>
                <CampoDataHora id={CAMPO.loteLimite(l.id)} label="Data limite" ocultarLabel valor={l.dataLimite} onChange={(dataLimite) => set({ dataLimite })} />
            </div>
            <div role="cell" className="flex items-center gap-1 @4xl:min-h-10">
                {l.revisar ? (
                    <>
                        <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                            Revisar
                        </BadgeWithIcon>
                        <ButtonUtility size="sm" color="tertiary" icon={Check} tooltip="Marcar como revisado" aria-label={`Marcar ${nome} como revisado`} onClick={() => set({})} />
                    </>
                ) : (
                    <BadgeWithIcon type="pill-color" color="success" size="sm" iconLeading={CheckCircle}>
                        Revisado
                    </BadgeWithIcon>
                )}
                <ButtonUtility size="sm" color="tertiary" icon={Trash01} tooltip="Excluir lote" aria-label={`Excluir ${nome}`} onClick={remover} className="ml-auto" />
            </div>
        </div>
    );
}

/* ---------------- Antes → depois ---------------- */

interface Mudanca {
    /** Modalidade › Categoria › Lote (o que existir). */
    caminho: string[];
    campo: string;
    antes: string;
    depois: string;
}

const textoOu = (s: string) => s.trim() || "Em branco";
const vagasDaModalidade = (vagas: number | null) => (vagas ? vagas.toLocaleString("pt-BR") : "Em branco");
const numeroOu = (n: number | null) => (n == null ? "Em branco" : n.toLocaleString("pt-BR"));
const reaisOu = (n: number | null) => (n == null ? "Em branco" : formatarReais(n));
const dataOu = (s: string) => (s ? formatarDataHora(s) : "Sem data limite");

function diferencas(antes: Modalidade[], depois: Modalidade[]): Mudanca[] {
    const lista: Mudanca[] = [];
    const add = (caminho: string[], campo: string, a: string, d: string) => a !== d && lista.push({ caminho, campo, antes: a, depois: d });
    for (const m of depois) {
        const m0 = antes.find((x) => x.id === m.id);
        if (!m0) continue;
        const mod = m.nome.trim() || m0.nome;
        add([mod], "Nome", textoOu(m0.nome), textoOu(m.nome));
        add([mod], "Vagas", vagasDaModalidade(m0.vagas), vagasDaModalidade(m.vagas));
        for (const c of m.categorias) {
            const c0 = m0.categorias.find((x) => x.id === c.id);
            if (!c0) continue;
            const cat = c.nome.trim() || c0.nome;
            add([mod, cat], "Nome", textoOu(c0.nome), textoOu(c.nome));
            for (const l0 of c0.lotes) {
                const l = c.lotes.find((x) => x.id === l0.id);
                if (!l) {
                    lista.push({ caminho: [mod, cat, l0.nome.trim() || "Lote"], campo: "Lote", antes: "Na cópia", depois: "Removido" });
                    continue;
                }
                const lote = [mod, cat, l.nome.trim() || l0.nome];
                add(lote, "Nome", textoOu(l0.nome), textoOu(l.nome));
                add(lote, "Quantidade", numeroOu(l0.vagas), numeroOu(l.vagas));
                add(lote, "Valor", reaisOu(l0.valor), reaisOu(l.valor));
                add(lote, "Data limite", dataOu(l0.dataLimite), dataOu(l.dataLimite));
            }
        }
    }
    return lista;
}

function ListaDeMudancas({ mudancas }: { mudancas: Mudanca[] }) {
    // Agrupa pelo caminho (Modalidade › Categoria › Lote), na ordem em que aparecem.
    const grupos: { caminho: string[]; itens: Mudanca[] }[] = [];
    for (const x of mudancas) {
        const chave = x.caminho.join(" › ");
        const g = grupos.find((y) => y.caminho.join(" › ") === chave);
        if (g) g.itens.push(x);
        else grupos.push({ caminho: x.caminho, itens: [x] });
    }
    return (
        <dl className="flex flex-col gap-4">
            {grupos.map((g) => (
                <Fragment key={g.caminho.join("›")}>
                    <div className="flex flex-col gap-1.5">
                        <dt className="text-sm font-semibold text-primary">{g.caminho.join(" › ")}</dt>
                        {g.itens.map((x) => (
                            <dd key={x.campo} className="flex flex-wrap items-center gap-2 pl-3 text-sm">
                                <span className="text-secondary">{x.campo}:</span>
                                <span className="text-tertiary line-through">{x.antes}</span>
                                <span aria-hidden="true" className="text-fg-quaternary">
                                    →
                                </span>
                                <span className="sr-only">passa a ser</span>
                                <span className="font-semibold text-primary">{x.depois}</span>
                            </dd>
                        ))}
                    </div>
                </Fragment>
            ))}
        </dl>
    );
}
