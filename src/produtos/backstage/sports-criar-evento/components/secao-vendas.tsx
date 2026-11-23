import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck01, ChevronDown, Edit01, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { HintText } from "@/components/base/input/hint-text";
import { Input, InputBase, TextField } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { useTransicao } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { CAMPO, irParaCampo } from "../data/campos";
import { vagasDaCategoria } from "../data/modelos";
import { TITULO_VENDAS } from "../data/opcoes";
import type { AberturaDeVendas, CanalDeVenda, ConfiguracaoDeVenda, Rascunho } from "../data/tipos";
import {
    aberturasDe,
    CANAIS,
    categoriasDaConfiguracao,
    estadoDaAbertura,
    listaDeCanais,
    nomeDoPublico,
    novaAbertura,
    novaConfiguracao,
    periodoCurto,
    SEGMENTACOES,
    todasAsCategorias,
    type EstadoDaAbertura,
} from "../data/vendas";
import { useVocabulario } from "../data/vocabulario";
import { ItemDaArvore, lotesDaCategoria } from "./arvore-de-modalidades";
import { CampoDataHora, CampoSelect, ErroDaLista, Secao, Vazio } from "./campos";
import { useFormulario } from "./contexto";
import { resumoDaCategoria } from "./secao-modalidades";

/* ------------------------------------------------------------------ */
/*  Passo 4: Aberturas de vendas (v0.51, SCE-306 a SCE-310)            */
/*  Modelo do AWA (orientação da Renata, 22/11/2026), com o desenho do */
/*  Backstage de Sports. Cada abertura é um cartão: nome e período no  */
/*  cabeçalho; em edição, uma linha por configuração com três          */
/*  seletores (Vender para, Modalidades e categorias, Canais) e Salvar;*/
/*  salva, a mesma linha mostra tudo o que foi escolhido, por extenso. */
/* ------------------------------------------------------------------ */

const COR_DO_ESTADO: Record<EstadoDaAbertura, "gray" | "blue" | "success"> = { rascunho: "gray", agendada: "blue", aberta: "success", encerrada: "gray" };

const setAberturas = (fn: (as: AberturaDeVendas[]) => AberturaDeVendas[]) => (r: Rascunho): Rascunho => ({ ...r, aberturas: fn(aberturasDe(r)) });
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function SecaoVendas() {
    const { rascunho: r, atualizar, erro } = useFormulario();
    const { t } = useVocabulario();
    const aberturas = aberturasDe(r);
    // Aberturas criadas agora e ainda não salvas: Cancelar remove.
    const [novas, setNovas] = useState<Set<string>>(new Set());

    const criar = () => {
        const nova = novaAbertura(r);
        atualizar(setAberturas((as) => [...as, nova]));
        setNovas((s) => new Set(s).add(nova.id));
        setTimeout(() => document.getElementById(`abertura-${nova.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    };

    if (!todasAsCategorias(r.modalidades).length)
        return (
            <Secao id="secao-vendas" titulo={TITULO_VENDAS}>
                <p className="text-sm text-tertiary">{t.vendaSemNivel2}</p>
            </Secao>
        );

    // v0.57 (SCE-319): um nível de contêiner só: título da etapa na página e os cartões das aberturas direto
    // embaixo (como a etapa Modalidades), sem a seção em volta.
    return (
        <section id="secao-vendas" className="flex scroll-mt-6 flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-lg font-semibold text-primary">{TITULO_VENDAS}</h2>
                    <p className="max-w-[65ch] text-sm text-tertiary">Quando, para quem, o que e por onde o público pode comprar.</p>
                </div>
                {aberturas.length > 0 && (
                    <Button color="secondary" size="md" iconLeading={Plus} onClick={criar}>
                        Nova abertura
                    </Button>
                )}
            </div>
            <div id={CAMPO.aberturas} className="flex scroll-mt-6 flex-col gap-4">
                {aberturas.length === 0 ? (
                    <div className="flex flex-col gap-2 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
                        <Vazio
                            icone={CalendarCheck01}
                            titulo="Nenhuma abertura de vendas"
                            descricao="Sem abertura, as inscrições não abrem. A primeira já vem com o mais comum: público geral, todas as categorias, pelo site."
                            acao={
                                <Button color="primary" size="md" iconLeading={Plus} onClick={criar}>
                                    Criar abertura
                                </Button>
                            }
                        />
                        <ErroDaLista erro={erro(CAMPO.aberturas, "vendas")} />
                    </div>
                ) : (
                    <ul className="flex flex-col gap-4">
                        <AnimatePresence initial={false}>
                            {aberturas.map((a) => (
                                <CartaoAbertura
                                    key={a.id}
                                    abertura={a}
                                    nova={novas.has(a.id)}
                                    onSalva={() =>
                                        setNovas((s) => {
                                            const n = new Set(s);
                                            n.delete(a.id);
                                            return n;
                                        })
                                    }
                                />
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Cartão da abertura                                                 */
/* ------------------------------------------------------------------ */

function CartaoAbertura({ abertura: a, nova, onSalva }: { abertura: AberturaDeVendas; nova: boolean; onSalva: () => void }) {
    const { rascunho: r, atualizar, pendencias, erro, tocar } = useFormulario();
    const transicao = useTransicao();
    const [editando, setEditando] = useState(nova);
    const [aberto, setAberto] = useState(true);
    const [antes, setAntes] = useState<AberturaDeVendas | null>(null);
    const nome = a.nome.trim() || "Abertura sem nome";
    const estado = estadoDaAbertura(a, r.publicado || !!r.simularPublicado);
    const daAbertura = pendencias.filter((p) => p.campo.startsWith(`campo-abertura-${a.id}-`));
    const e = (campo: string) => erro(campo, "vendas");

    const set = (m: Partial<AberturaDeVendas>) => atualizar(setAberturas((as) => as.map((x) => (x.id === a.id ? { ...x, ...m } : x))));
    const setConfig = (id: string, m: Partial<ConfiguracaoDeVenda>) => set({ configuracoes: a.configuracoes.map((c) => (c.id === id ? { ...c, ...m } : c)) });

    const editar = () => {
        setAntes(a);
        setEditando(true);
        setAberto(true);
    };
    const cancelar = () => {
        if (nova) atualizar(setAberturas((as) => as.filter((x) => x.id !== a.id)));
        else if (antes) atualizar(setAberturas((as) => as.map((x) => (x.id === a.id ? antes : x))));
        setEditando(false);
    };
    const salvar = () => {
        if (daAbertura.length) {
            daAbertura.forEach((p) => tocar(p.campo));
            irParaCampo(daAbertura[0].campo);
            toast.error(daAbertura.length === 1 ? "Falta 1 item para salvar a abertura" : `Faltam ${daAbertura.length} itens para salvar a abertura`);
            return;
        }
        setEditando(false);
        onSalva();
        toast.success(`${nome} salva.`);
    };
    const remover = () => {
        const lista = aberturasDe(r);
        atualizar(setAberturas((as) => as.filter((x) => x.id !== a.id)));
        toast(`${nome} excluída`, { action: { label: "Desfazer", onClick: () => atualizar((x) => ({ ...x, aberturas: lista })) } });
    };
    // v0.57 (SCE-321): excluir configuração com Desfazer.
    const removerConfig = (id: string) => {
        const lista = a.configuracoes;
        set({ configuracoes: a.configuracoes.filter((c) => c.id !== id) });
        toast("Configuração excluída", { action: { label: "Desfazer", onClick: () => set({ configuracoes: lista }) } });
    };

    return (
        <motion.li
            id={`abertura-${a.id}`}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={transicao}
            className={cx("scroll-mt-6 rounded-2xl bg-primary ring-1", editando ? "ring-2 ring-brand" : "ring-secondary")}
        >
            {/* Cabeçalho */}
            {editando ? (
                // v0.52 (SCE-312): em edição, o topo continua com cara de cabeçalho: nome como título editável e o período numa linha.
                <div className="flex flex-col gap-3 rounded-t-2xl border-b border-secondary bg-secondary/40 px-4 py-3.5">
                    <div id={CAMPO.aberturaNome(a.id)} className="flex flex-col gap-1">
                        <TextField aria-label="Nome da abertura" value={a.nome} onChange={(v) => set({ nome: v })} onBlur={() => tocar(CAMPO.aberturaNome(a.id))} isInvalid={!!e(CAMPO.aberturaNome(a.id))}>
                            <InputBase
                                size="sm"
                                icon={Edit01}
                                placeholder="Nome da abertura"
                                wrapperClassName="max-w-md bg-transparent shadow-none ring-transparent hover:ring-primary"
                                inputClassName="text-lg font-semibold text-primary"
                            />
                        </TextField>
                        {e(CAMPO.aberturaNome(a.id)) && <HintText isInvalid>{e(CAMPO.aberturaNome(a.id))}</HintText>}
                    </div>
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                        <span className="pt-2.5 text-sm text-tertiary">De</span>
                        <CampoDataHora
                            id={CAMPO.aberturaInicio(a.id)}
                            label="Começa em"
                            ocultarLabel
                            isRequired
                            valor={a.inicio}
                            onChange={(inicio) => set({ inicio })}
                            onBlur={() => tocar(CAMPO.aberturaInicio(a.id))}
                            erro={e(CAMPO.aberturaInicio(a.id))}
                            className="w-full sm:w-80"
                        />
                        <span className="pt-2.5 text-sm text-tertiary">até</span>
                        <CampoDataHora
                            id={CAMPO.aberturaFim(a.id)}
                            label="Termina em"
                            ocultarLabel
                            isRequired
                            valor={a.fim}
                            minimo={a.inicio || undefined}
                            onChange={(fim) => set({ fim })}
                            onBlur={() => tocar(CAMPO.aberturaFim(a.id))}
                            erro={e(CAMPO.aberturaFim(a.id))}
                            className="w-full sm:w-80"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                    <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded text-left outline-focus-ring focus-visible:outline-2">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-md font-semibold text-primary">{nome}</span>
                            <BadgeWithIcon type="pill-color" size="sm" color={COR_DO_ESTADO[estado.tipo]} iconLeading={CalendarCheck01}>
                                {estado.texto}
                            </BadgeWithIcon>
                            {daAbertura.length > 0 && (
                                <BadgeWithIcon type="pill-color" size="sm" color="error" iconLeading={CalendarCheck01}>
                                    {daAbertura.length === 1 ? "1 pendência" : `${daAbertura.length} pendências`}
                                </BadgeWithIcon>
                            )}
                        </span>
                        <span className="text-sm text-tertiary">{periodoCurto(a)}</span>
                    </button>
                    <ButtonUtility size="sm" color="tertiary" icon={Trash01} tooltip="Excluir abertura" aria-label={`Excluir ${nome}`} onClick={remover} />
                    <ButtonUtility size="sm" color="tertiary" icon={Edit01} tooltip="Editar" aria-label={`Editar ${nome}`} onClick={editar} />
                    <ButtonUtility size="sm" color="tertiary" icon={ChevronDown} tooltip={aberto ? "Recolher" : "Abrir"} aria-label={aberto ? `Recolher ${nome}` : `Abrir ${nome}`} onClick={() => setAberto((v) => !v)} className={cx("transition-transform", !aberto && "-rotate-90")} />
                </div>
            )}

            {/* Configurações */}
            <AnimatePresence initial={false}>
                {(aberto || editando) && (
                    <motion.div key="corpo" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transicao} className="@container overflow-hidden">
                        <ul className={cx("divide-y divide-secondary", !editando && "border-t border-secondary")}>
                            {/* v0.57 (SCE-321): a linha entra e sai deslizando, sem pulo. */}
                            <AnimatePresence initial={false}>
                                {a.configuracoes.map((c) => (
                                    <motion.li key={c.id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transicao} className="overflow-hidden">
                                        {editando ? (
                                            <LinhaEdicao abertura={a} config={c} set={(m) => setConfig(c.id, m)} onRemover={a.configuracoes.length > 1 ? () => removerConfig(c.id) : undefined} />
                                        ) : (
                                            <LinhaLeitura abertura={a} config={c} />
                                        )}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        </ul>
                        {editando && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary px-4 py-3">
                                <Button size="sm" color="link-gray" iconLeading={Plus} onClick={() => set({ configuracoes: [...a.configuracoes, novaConfiguracao(r.modalidades)] })}>
                                    Nova configuração
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button size="md" color="secondary" onClick={cancelar}>
                                        Cancelar
                                    </Button>
                                    <Button size="md" color="primary" onClick={salvar}>
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
}

/* ------------------------------------------------------------------ */
/*  Linha em leitura: tudo o que foi escolhido, por extenso (SCE-308)  */
/* ------------------------------------------------------------------ */

const Rotulo = ({ children }: { children: ReactNode }) => <span className="text-xs font-semibold text-tertiary uppercase">{children}</span>;

// v0.54 (SCE-314): duas colunas: à esquerda Vender para e Canais; à direita Modalidades e categorias.
const DUAS_COLUNAS = "grid items-start gap-x-6 gap-y-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]";

/** Linha da árvore só para leitura: o desenho do ItemDaArvore (selo do nível e nome), sem caixa de marcar. */
function LinhaDaArvore({ nivel, nome, contagem }: { nivel: 1 | 2; nome: string; contagem?: string }) {
    const { t } = useVocabulario();
    return (
        <div className="flex min-h-8 items-center gap-3 text-sm">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                <Badge type="pill-color" size="sm" color={nivel === 1 ? "brand" : "gray"} className="shrink-0">
                    {nivel === 1 ? t.nivel1.Um : t.nivel2.Um}
                </Badge>
                <span className={nivel === 1 ? "font-semibold text-primary" : "font-medium text-secondary"}>{nome}</span>
            </span>
            {contagem && <span className="shrink-0 text-tertiary tabular-nums">{contagem}</span>}
        </div>
    );
}

/** Na leitura, até 3 categorias por modalidade; o resto abre em "Ver as outras N" (SCE-320). */
const LIMITE_LEITURA = 8;

function LinhaLeitura({ abertura: a, config: c }: { abertura: AberturaDeVendas; config: ConfiguracaoDeVenda }) {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
    const marcadas = new Set(categoriasDaConfiguracao(c, r.modalidades));
    const grupos = r.modalidades.map((m) => ({ m, cats: m.categorias.filter((x) => !x.nova && marcadas.has(x.id)) })).filter((g) => g.cats.length > 0);
    return (
        <div className={cx("px-4 py-4", DUAS_COLUNAS)}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <Rotulo>Vender para</Rotulo>
                    <span className="text-sm font-medium text-primary">{nomeDoPublico(c.publico) || <span className="text-error-primary">A definir</span>}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <Rotulo>Canais de venda</Rotulo>
                    <span className="text-sm text-primary">{c.canais.length ? listaDeCanais(c.canais) : <span className="text-error-primary">A definir</span>}</span>
                </div>
            </div>
            {/* SCE-314: árvore aberta, só com o que está selecionado. */}
            <div className="flex min-w-0 flex-col gap-1.5">
                <Rotulo>{t.vendaCampoCategorias}</Rotulo>
                {grupos.length === 0 ? (
                    <span className="text-sm text-error-primary">Nenhuma selecionada</span>
                ) : (
                    <ul className="flex flex-col divide-y divide-secondary rounded-xl px-4 py-1 ring-1 ring-secondary">
                        {grupos.map(({ m, cats }) => {
                            const total = m.categorias.filter((x) => !x.nova).length;
                            const inteira = cats.length === total;
                            const aberta = expandidas.has(m.id);
                            const mostradas = aberta ? cats : cats.slice(0, LIMITE_LEITURA);
                            return (
                                <li key={m.id} className="flex flex-col py-1.5">
                                    {/* v0.57 (SCE-320): a contagem diz "todas (N)" quando a modalidade vai inteira. */}
                                    <LinhaDaArvore nivel={1} nome={m.nome.trim() || t.nivel1SemNome} contagem={inteira ? `todas (${total})` : `${cats.length} de ${total}`} />
                                    {/* v0.60 (SCE-327): as categorias sempre listadas, só pelo nome (também quando são todas). */}
                                    {(
                                        <ul className="ml-2 flex flex-col gap-1 border-l border-secondary py-1 pl-5">
                                            {mostradas.map((x) => (
                                                <li key={x.id} className="text-sm text-secondary">
                                                    {x.nome.trim() || t.nivel2SemNome}
                                                </li>
                                            ))}
                                            {cats.length > LIMITE_LEITURA && (
                                                <li>
                                                    <Button
                                                        size="sm"
                                                        color="link-color"
                                                        onClick={() =>
                                                            setExpandidas((s) => {
                                                                const n = new Set(s);
                                                                if (aberta) n.delete(m.id);
                                                                else n.add(m.id);
                                                                return n;
                                                            })
                                                        }
                                                    >
                                                        {aberta ? "Ver menos" : `Ver as outras ${cats.length - LIMITE_LEITURA}`}
                                                    </Button>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            <AvisoDeRepetidas abertura={a} config={c} />
        </div>
    );
}

/** v0.57 (SCE-322): a mesma categoria em outra configuração da abertura, com o mesmo público e um canal em comum. */
export const categoriasRepetidas = (a: AberturaDeVendas, c: ConfiguracaoDeVenda) => {
    const minhas = new Set(c.categorias);
    const repetidas = new Map<string, number>();
    a.configuracoes.forEach((o, i) => {
        if (o.id === c.id || !c.publico || o.publico !== c.publico || !o.canais.some((x) => c.canais.includes(x))) return;
        o.categorias.forEach((id) => minhas.has(id) && !repetidas.has(id) && repetidas.set(id, i + 1));
    });
    return repetidas;
};

function AvisoDeRepetidas({ abertura: a, config: c }: { abertura: AberturaDeVendas; config: ConfiguracaoDeVenda }) {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const rep = categoriasRepetidas(a, c);
    if (!rep.size) return null;
    const nomes = r.modalidades.flatMap((m) => m.categorias.filter((x) => rep.has(x.id)).map((x) => `${m.nome.trim()} › ${x.nome.trim() || t.nivel2SemNome}`));
    const numero = [...rep.values()][0];
    return (
        <p className="flex items-start gap-2 rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary md:col-span-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
                {nomes.slice(0, 3).join(", ")}
                {nomes.length > 3 ? ` e mais ${nomes.length - 3}` : ""} já {nomes.length === 1 ? "está" : "estão"} na configuração {numero}, para o mesmo público e canal. Tire de uma delas.
            </span>
        </p>
    );
}

/* ------------------------------------------------------------------ */
/*  Linha em edição (SCE-307, SCE-311, SCE-314)                         */
/* ------------------------------------------------------------------ */

function LinhaEdicao({ abertura: a, config: c, set, onRemover }: { abertura: AberturaDeVendas; config: ConfiguracaoDeVenda; set: (m: Partial<ConfiguracaoDeVenda>) => void; onRemover?: () => void }) {
    const { erro, tocar } = useFormulario();
    const { t } = useVocabulario();
    const idPublico = CAMPO.cfgPublico(a.id, c.id);
    const idCategorias = CAMPO.cfgCategorias(a.id, c.id);
    const idCanais = CAMPO.cfgCanais(a.id, c.id);
    return (
        <div className={cx("relative px-4 py-4", DUAS_COLUNAS)}>
            <div className="flex flex-col gap-4">
                <CampoSelect
                    id={idPublico}
                    label="Vender para"
                    isRequired
                    placeholder="Selecione o público"
                    opcoes={SEGMENTACOES.map((s) => ({ id: s.id, label: s.label }))}
                    valor={c.publico}
                    onChange={(publico) => {
                        set({ publico });
                        tocar(idPublico);
                    }}
                    erro={erro(idPublico, "vendas")}
                />
                <div id={idCanais} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
                    <Label isRequired>Canais de venda</Label>
                    <SeletorDeCanais
                        selecionados={c.canais}
                        invalido={!!erro(idCanais, "vendas")}
                        onChange={(canais) => {
                            set({ canais });
                            tocar(idCanais);
                        }}
                    />
                    {erro(idCanais, "vendas") && <HintText isInvalid>{erro(idCanais, "vendas")}</HintText>}
                </div>
                {onRemover && (
                    <div>
                        <Button size="sm" color="link-gray" iconLeading={Trash01} onClick={onRemover}>
                            Excluir configuração
                        </Button>
                    </div>
                )}
            </div>
            <div id={idCategorias} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
                <Label isRequired>{t.vendaCampoCategorias}</Label>
                <SeletorDeCategorias
                    selecionadas={c.categorias}
                    invalido={!!erro(idCategorias, "vendas")}
                    onChange={(categorias) => {
                        set({ categorias });
                        tocar(idCategorias);
                    }}
                />
                {erro(idCategorias, "vendas") && <HintText isInvalid>{erro(idCategorias, "vendas")}</HintText>}
                <AvisoDeRepetidas abertura={a} config={c} />
            </div>
        </div>
    );
}

/* Gatilho com aparência de campo do DS e lista em popover. */
function CampoComLista({ texto, vazio, invalido, children, largura = "w-(--trigger-width)" }: { texto: string; vazio: boolean; invalido?: boolean; children: ReactNode; largura?: string }) {
    return (
        <DialogTrigger>
            <AriaButton
                className={cx(
                    "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-primary px-3.5 text-left text-md shadow-xs ring-1 ring-primary outline-hidden ring-inset focus-visible:ring-2 focus-visible:ring-brand",
                    invalido && "ring-error_subtle",
                )}
            >
                <span className={cx("truncate", vazio ? "text-placeholder" : "text-primary")}>{texto}</span>
                <ChevronDown className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
            </AriaButton>
            <AriaPopover placement="bottom start" offset={6} className={cx("max-w-[calc(100vw-2rem)] min-w-72 rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt outline-hidden", largura)}>
                <AriaDialog className="outline-hidden">{children}</AriaDialog>
            </AriaPopover>
        </DialogTrigger>
    );
}

function SeletorDeCanais({ selecionados, invalido, onChange }: { selecionados: CanalDeVenda[]; invalido?: boolean; onChange: (v: CanalDeVenda[]) => void }) {
    return (
        <CampoComLista texto={selecionados.length ? listaDeCanais(selecionados) : "Selecione um ou mais"} vazio={!selecionados.length} invalido={invalido}>
            <ul className="flex flex-col gap-1 p-2">
                {CANAIS.map((x) => (
                    <li key={x.id} className="rounded-md px-2 py-2 hover:bg-primary_hover">
                        <Checkbox label={x.label} isSelected={selecionados.includes(x.id)} onChange={(v) => onChange(v ? [...selecionados, x.id] : selecionados.filter((s) => s !== x.id))} />
                    </li>
                ))}
            </ul>
        </CampoComLista>
    );
}

/** Modalidades e categorias: a árvore com busca e marcar/desmarcar todas, num popover (SCE-307). */
function SeletorDeCategorias({ selecionadas, invalido, onChange }: { selecionadas: string[]; invalido?: boolean; onChange: (v: string[]) => void }) {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const [busca, setBusca] = useState("");
    const todas = todasAsCategorias(r.modalidades);
    const marcadas = new Set(selecionadas.filter((id) => todas.some((c) => c.id === id)));
    const texto = !marcadas.size ? "Selecione uma ou mais" : marcadas.size === todas.length ? t.vendaTodasAsCategorias(todas.length) : t.vendaSelecionadas(marcadas.size);

    const q = normalizar(busca);
    const visiveis = r.modalidades
        .map((m) => {
            const cats = m.categorias.filter((x) => !x.nova);
            if (!q || normalizar(m.nome).includes(q)) return { m, cats };
            return { m, cats: cats.filter((x) => normalizar(x.nome).includes(q)) };
        })
        .filter((g) => g.cats.length > 0);
    const idsVisiveis = visiveis.flatMap((g) => g.cats.map((x) => x.id));
    const com = (ids: string[], sim: boolean) => {
        const n = new Set(marcadas);
        ids.forEach((id) => (sim ? n.add(id) : n.delete(id)));
        onChange([...n]);
    };

    return (
        // v0.52 (SCE-311): lista sempre aberta na edição, sem seletor.
        <div className={cx("overflow-hidden rounded-xl bg-primary ring-1", invalido ? "ring-error_subtle" : "ring-secondary")} aria-label={texto}>
            <div className="flex flex-col gap-2 border-b border-secondary bg-secondary/30 p-3">
                <Input aria-label={`Buscar ${t.nivel1.um} ou ${t.nivel2.um}`} placeholder={`Buscar ${t.nivel1.um} ou ${t.nivel2.um}`} icon={SearchLg} size="sm" value={busca} onChange={setBusca} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-tertiary tabular-nums">{texto}</span>
                    <span className="flex gap-1">
                        <Button size="sm" color="link-color" isDisabled={!idsVisiveis.length || idsVisiveis.every((id) => marcadas.has(id))} onClick={() => com(idsVisiveis, true)}>
                            {q ? "Marcar encontradas" : "Marcar todas"}
                        </Button>
                        <Button size="sm" color="link-gray" isDisabled={idsVisiveis.every((id) => !marcadas.has(id))} onClick={() => com(idsVisiveis, false)}>
                            {q ? "Desmarcar encontradas" : "Desmarcar todas"}
                        </Button>
                    </span>
                </div>
            </div>
            <ul className="max-h-[26rem] overflow-y-auto px-3 py-1">
                {visiveis.length === 0 && <li className="py-3 text-sm text-tertiary">Nada encontrado para "{busca.trim()}".</li>}
                {visiveis.map(({ m, cats }) => {
                    const k = cats.filter((x) => marcadas.has(x.id)).length;
                    return (
                        <li key={m.id} className="flex flex-col border-b border-secondary py-1.5 last:border-b-0">
                            <ItemDaArvore
                                nivel={1}
                                nome={m.nome.trim() || t.nivel1SemNome}
                                contagem={`${m.categorias.filter((x) => !x.nova && marcadas.has(x.id)).length} de ${m.categorias.filter((x) => !x.nova).length}`}
                                ariaLabel={`${m.nome}: marcar todas`}
                                isSelected={k === cats.length}
                                isIndeterminate={k > 0 && k < cats.length}
                                onChange={() => com(cats.map((x) => x.id), k < cats.length)}
                            />
                            <ul className="ml-2 flex flex-col border-l border-secondary pl-5">
                                {cats.map((x) => (
                                    <li key={x.id}>
                                        <ItemDaArvore
                                            nivel={2}
                                            nome={x.nome.trim() || t.nivel2SemNome}
                                            detalhe={`${resumoDaCategoria(x)}, ${lotesDaCategoria(x).replace(/^\S/, (y) => y.toLowerCase())}${vagasDaCategoria(x) ? `, ${vagasDaCategoria(x).toLocaleString("pt-BR")} vagas` : ""}`}
                                            isSelected={marcadas.has(x.id)}
                                            onChange={(sim) => com([x.id], sim)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
