import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { InputBase } from "@/components/base/input/input";
import { Surgir } from "@/components/foundations/transicao";
import type { Evento, Grupo, ItemDaAbertura, ProdutoDaOrganizacao, Sessao, TipoIngresso } from "@/plataforma";
import { paraBusca } from "../itens/components/escala";
import { formatar, useTextosItens } from "../itens/data/textos-itens";
import { dataEHora } from "./formatar-data";
import { ArvoreDeIngressos, useResumoDeIngressos, useSelecaoDeIngressos } from "./seletor-de-ingressos";

/*
 * Vínculos com itens do evento (Passkey, Cupons e Etiquetas; UI-LST-005): os ingressos usam a árvore
 * comum com escala (`ArvoreDeIngressos`: setores recolhidos, marcar sessão ou setor de uma vez,
 * "Selecionados", "Mostrar mais"). Por cima dela, o que a árvore não faz:
 *
 *   - lotes: marcar um ingresso marca todos os lotes dele; em "Conferir", "Escolher lotes" deixa só
 *     alguns (a árvore não desce até o lote);
 *   - combos e produtos, em abas próprias, com busca e "Mostrar mais";
 *   - "Conferir": o que foi escolhido, com contagem, lotes parciais listados e "Remover".
 *
 * O que se grava sai de `resultado()`: grupos inteiros (sem lote de fora), lotes, combos e produtos.
 */

const T = {
    ingressos: "Ingressos",
    combos: "Combos",
    produtos: "Produtos",
    conferir: "Conferir",
    tipo: "Tipo de item",
    buscarCombo: "Buscar combo",
    buscarProduto: "Buscar produto",
    nada: "Nada encontrado. Tente outro termo.",
    semCombos: "O evento ainda não tem combos.",
    semProdutos: "O evento ainda não tem produtos.",
    mostrarMais: { one: "Mostrar mais {n}", other: "Mostrar mais {n}" },
    nadaEscolhido: "Nenhum item escolhido ainda.",
    combosN: { one: "{n} combo", other: "{n} combos" },
    produtosN: { one: "{n} produto", other: "{n} produtos" },
    todosOsLotes: "Todos os lotes",
    escolherLotes: "Escolher lotes",
    fecharLotes: "Pronto",
    lotesDe: "Lotes de {ingresso}",
    ultimoLote: "Fica ao menos um lote. Para tirar o ingresso, use Remover.",
    remover: "Remover",
    removerItem: "Remover {item}",
    grupoNaSessao: "{grupo}, {data}",
    combo: "Combo",
    produto: "Produto",
    e: " e ",
};

const PASSO = 20;

export interface ItemSimples {
    id: string;
    nome: string;
    apoio?: string;
}

export interface VinculosIniciais {
    grupos?: Iterable<string>;
    ingressos?: Iterable<string>;
    lotes?: Iterable<string>;
    combos?: Iterable<string>;
    produtos?: Iterable<string>;
}

export interface ResultadoDosVinculos {
    /** Setores com todos os ingressos e todos os lotes marcados. */
    grupos: string[];
    /** Todos os lotes marcados, inclusive os dos grupos inteiros. */
    lotes: string[];
    /** Lotes marcados fora dos grupos inteiros. */
    lotesForaDosGrupos: string[];
    combos: string[];
    produtos: string[];
}

/** Combos do evento, com o preço de apoio. */
export const combosDoEvento = (evento: Evento, preco: (v: number) => string): ItemSimples[] => (evento.combos ?? []).map((c) => ({ id: c.id, nome: c.nome, apoio: preco(c.preco) }));

/** Produtos do evento (só os ativos, se pedido), com nome da biblioteca e preço de apoio. */
export function produtosDoEvento(evento: Evento, biblioteca: ProdutoDaOrganizacao[], preco: (v: number) => string, soAtivos = true): ItemSimples[] {
    const porId = new Map(biblioteca.map((p) => [p.id, p]));
    return (evento.produtos ?? []).flatMap((p) => {
        const b = porId.get(p.produtoId);
        if (!b || (soAtivos && !p.ativo)) return [];
        return [{ id: p.produtoId, nome: b.nome, apoio: preco(p.preco ?? b.precoBase) }];
    });
}

export type Vinculos = ReturnType<typeof useVinculos>;

/** O que está escolhido: ingressos (pela árvore comum), lotes de fora, combos e produtos. */
export function useVinculos(evento: Evento, iniciais: VinculosIniciais = {}) {
    // Uma vez só: ingresso com algum lote marcado entra; com só parte dos lotes, guarda quais.
    const [inicio] = useState(() => {
        const grupos = new Set(iniciais.grupos ?? []);
        const ingressos = new Set(iniciais.ingressos ?? []);
        const lotes = new Set(iniciais.lotes ?? []);
        const itens: ItemDaAbertura[] = [];
        const parciais = new Map<string, Set<string>>();
        for (const s of evento.sessoes)
            for (const g of s.grupos)
                for (const t of g.ingressos) {
                    if (grupos.has(g.id) || ingressos.has(t.id)) {
                        itens.push({ tipo: "ingresso", id: t.id });
                        continue;
                    }
                    const marcados = t.lotes.filter((l) => lotes.has(l.id));
                    if (marcados.length === 0) continue;
                    itens.push({ tipo: "ingresso", id: t.id });
                    if (marcados.length < t.lotes.length) parciais.set(t.id, new Set(marcados.map((l) => l.id)));
                }
        return { itens, parciais, combos: new Set(iniciais.combos ?? []), produtos: new Set(iniciais.produtos ?? []) };
    });
    const selecao = useSelecaoDeIngressos(evento, inicio.itens);
    const [lotesDe, setLotesDe] = useState(inicio.parciais);
    const [combos, setCombos] = useState(inicio.combos);
    const [produtos, setProdutos] = useState(inicio.produtos);
    const [alterado, setAlterado] = useState(false);

    // A árvore muda a seleção por dentro: seleção diferente da inicial conta como alteração.
    const primeira = useRef({ setores: selecao.setores, ingressos: selecao.ingressos });
    useEffect(() => {
        if (selecao.setores !== primeira.current.setores || selecao.ingressos !== primeira.current.ingressos) setAlterado(true);
    }, [selecao.setores, selecao.ingressos]);

    const marcado = (g: Grupo, t: TipoIngresso) => selecao.setores.has(g.id) || selecao.ingressos.has(t.id);

    const alternar = (setter: typeof setCombos) => (id: string, on: boolean) => {
        setAlterado(true);
        setter((a) => {
            const p = new Set(a);
            if (on) p.add(id);
            else p.delete(id);
            return p;
        });
    };

    /** Lotes escolhidos de um ingresso; todos os lotes tira a exceção. */
    const definirLotes = (t: TipoIngresso, ids: Set<string>) => {
        setAlterado(true);
        setLotesDe((m) => {
            const p = new Map(m);
            if (ids.size >= t.lotes.length) p.delete(t.id);
            else p.set(t.id, ids);
            return p;
        });
    };

    const remover = (g: Grupo, t: TipoIngresso) => {
        selecao.alternarIngresso(g, t, false);
        setLotesDe((m) => {
            if (!m.has(t.id)) return m;
            const p = new Map(m);
            p.delete(t.id);
            return p;
        });
    };

    const resultado = (): ResultadoDosVinculos => {
        const grupos: string[] = [];
        const lotes: string[] = [];
        const lotesForaDosGrupos: string[] = [];
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                const inteiro = selecao.setores.has(g.id);
                const doGrupo: string[] = [];
                let parcial = false;
                for (const t of g.ingressos) {
                    if (!inteiro && !selecao.ingressos.has(t.id)) continue;
                    const so = lotesDe.get(t.id);
                    if (so) parcial = true;
                    for (const l of t.lotes) if (!so || so.has(l.id)) doGrupo.push(l.id);
                }
                lotes.push(...doGrupo);
                if (inteiro && !parcial && g.ingressos.length > 0) grupos.push(g.id);
                else lotesForaDosGrupos.push(...doGrupo);
            }
        return { grupos, lotes, lotesForaDosGrupos, combos: [...combos], produtos: [...produtos] };
    };

    const vazio = selecao.total.ingressos === 0 && combos.size === 0 && produtos.size === 0;

    return {
        evento,
        selecao,
        lotesDe,
        combos,
        produtos,
        alterado,
        vazio,
        marcado,
        alternarCombo: alternar(setCombos),
        alternarProduto: alternar(setProdutos),
        definirLotes,
        remover,
        resultado,
    };
}

/** "60 ingressos em 7 grupos, 2 combos e 1 produto": o resumo do que foi escolhido. */
export function useResumoDosVinculos() {
    const resumir = useResumoDeIngressos();
    const { plural } = useTextosItens();
    return (v: Vinculos) => {
        const partes = [v.selecao.total.ingressos > 0 ? resumir(v.selecao.total.ingressos, v.selecao.total.setores) : ""];
        if (v.combos.size) partes.push(plural(T.combosN, v.combos.size));
        if (v.produtos.size) partes.push(plural(T.produtosN, v.produtos.size));
        const ok = partes.filter(Boolean);
        if (ok.length === 0) return resumir(0, 0);
        return ok.length === 1 ? ok[0] : `${ok.slice(0, -1).join(", ")}${T.e}${ok[ok.length - 1]}`;
    };
}

type Aba = "ingressos" | "combos" | "produtos" | "conferir";

/**
 * A escolha dos itens: abas Ingressos (a árvore comum), Combos e Produtos (as que o evento tiver) e,
 * com `comConferir`, a aba "Conferir". Sem moldura: quem usa põe no painel ou na página.
 */
export function SeletorDeVinculos({
    vinculos,
    rotulo,
    combos = [],
    produtos = [],
    comConferir = false,
    vazio,
}: {
    vinculos: Vinculos;
    /** Nome da árvore de ingressos para leitor de tela. */
    rotulo: string;
    combos?: ItemSimples[];
    produtos?: ItemSimples[];
    comConferir?: boolean;
    /** Evento sem nada para vincular. */
    vazio: ReactNode;
}) {
    const { numero } = useTextosItens();
    const temIngressos = vinculos.evento.sessoes.some((s) => s.grupos.some((g) => g.ingressos.length > 0));
    const abas: Aba[] = [...(temIngressos ? (["ingressos"] as const) : []), ...(combos.length ? (["combos"] as const) : []), ...(produtos.length ? (["produtos"] as const) : [])];
    if (comConferir && abas.length) abas.push("conferir");
    const [aba, setAba] = useState<Aba>(abas[0] ?? "ingressos");

    if (!temIngressos && !combos.length && !produtos.length) return <>{vazio}</>;

    const contagem: Record<Aba, number> = {
        ingressos: vinculos.selecao.total.ingressos,
        combos: vinculos.combos.size,
        produtos: vinculos.produtos.size,
        conferir: vinculos.selecao.total.ingressos + vinculos.combos.size + vinculos.produtos.size,
    };
    const NOMES: Record<Aba, string> = { ingressos: T.ingressos, combos: T.combos, produtos: T.produtos, conferir: T.conferir };

    return (
        <div className="flex flex-col gap-4">
            {abas.length > 1 && (
                <ButtonGroup
                    size="sm"
                    aria-label={T.tipo}
                    selectedKeys={new Set([aba])}
                    onSelectionChange={(k) => {
                        const v = [...k][0];
                        if (v) setAba(v as Aba);
                    }}
                    disallowEmptySelection
                    className="max-w-full overflow-x-auto"
                >
                    {abas.map((a) => (
                        <ButtonGroupItem key={a} id={a}>
                            {NOMES[a]}
                            {contagem[a] > 0 && <span className="ml-1 tabular-nums">{`(${numero(contagem[a])})`}</span>}
                        </ButtonGroupItem>
                    ))}
                </ButtonGroup>
            )}
            {aba === "ingressos" && temIngressos && <ArvoreDeIngressos evento={vinculos.evento} selecao={vinculos.selecao} rotulo={rotulo} />}
            {aba === "combos" && <ListaSimples itens={combos} marcados={vinculos.combos} onAlternar={vinculos.alternarCombo} buscar={T.buscarCombo} vazio={T.semCombos} />}
            {aba === "produtos" && <ListaSimples itens={produtos} marcados={vinculos.produtos} onAlternar={vinculos.alternarProduto} buscar={T.buscarProduto} vazio={T.semProdutos} />}
            {aba === "conferir" && <ConferenciaDeVinculos vinculos={vinculos} combos={combos} produtos={produtos} />}
        </div>
    );
}

/** Combos ou produtos: uma caixa por item (com nome acessível), busca a partir de 8 e "Mostrar mais". */
function ListaSimples({ itens, marcados, onAlternar, buscar, vazio }: { itens: ItemSimples[]; marcados: Set<string>; onAlternar: (id: string, on: boolean) => void; buscar: string; vazio: string }) {
    const { plural } = useTextosItens();
    const [busca, setBusca] = useState("");
    const [limite, setLimite] = useState(PASSO);
    const termo = paraBusca(busca.trim());
    const visiveis = useMemo(() => (termo ? itens.filter((i) => paraBusca(i.nome).includes(termo)) : itens), [itens, termo]);
    useEffect(() => setLimite(PASSO), [termo]);
    if (!itens.length) return <p className="text-sm text-tertiary">{vazio}</p>;
    return (
        <div className="flex flex-col gap-3">
            {itens.length > 8 && (
                <InputBase
                    size="sm"
                    icon={SearchLg}
                    aria-label={buscar}
                    placeholder={buscar}
                    value={busca}
                    onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                />
            )}
            {visiveis.length === 0 ? (
                <p role="status" className="py-2 text-sm text-tertiary">
                    {T.nada}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {visiveis.slice(0, limite).map((i) => (
                        <li key={i.id}>
                            <Checkbox size="sm" label={i.nome} hint={i.apoio} isSelected={marcados.has(i.id)} onChange={(on) => onAlternar(i.id, on)} />
                        </li>
                    ))}
                </ul>
            )}
            {visiveis.length > limite && (
                <div>
                    <Button color="link-color" size="sm" onClick={() => setLimite((n) => n + PASSO)}>
                        {plural(T.mostrarMais, Math.min(PASSO, visiveis.length - limite))}
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * O que foi escolhido, para conferir: resumo, cada ingresso com os lotes ("Todos os lotes" ou quais),
 * "Escolher lotes" e "Remover"; depois combos e produtos. Lista em blocos de 20 ("Mostrar mais").
 */
export function ConferenciaDeVinculos({ vinculos, combos = [], produtos = [] }: { vinculos: Vinculos; combos?: ItemSimples[]; produtos?: ItemSimples[] }) {
    const { plural } = useTextosItens();
    const resumir = useResumoDosVinculos();
    const [limite, setLimite] = useState(PASSO);
    const { evento, selecao, lotesDe } = vinculos;
    const variasSessoes = evento.sessoes.length > 1;

    // Só os primeiros `limite` ingressos escolhidos: com setores inteiros, não percorre o catálogo todo.
    const { linhas, total } = useMemo(() => {
        const out: { s: Sessao; g: Grupo; t: TipoIngresso }[] = [];
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                const inteiro = selecao.setores.has(g.id);
                if (!inteiro && !g.ingressos.some((t) => selecao.ingressos.has(t.id))) continue;
                for (const t of g.ingressos) {
                    if (!inteiro && !selecao.ingressos.has(t.id)) continue;
                    out.push({ s, g, t });
                    if (out.length >= limite) return { linhas: out, total: selecao.total.ingressos };
                }
            }
        return { linhas: out, total: selecao.total.ingressos };
    }, [evento, selecao.setores, selecao.ingressos, selecao.total.ingressos, limite]);

    const combosEscolhidos = combos.filter((c) => vinculos.combos.has(c.id));
    const produtosEscolhidos = produtos.filter((p) => vinculos.produtos.has(p.id));

    if (vinculos.vazio)
        return (
            <p role="status" className="py-4 text-sm text-tertiary">
                {T.nadaEscolhido}
            </p>
        );

    return (
        <div className="flex flex-col gap-4">
            <p role="status" className="text-sm font-medium text-secondary">
                {resumir(vinculos)}
            </p>
            {linhas.length > 0 && (
                <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary">
                    {linhas.map(({ s, g, t }) => (
                        <LinhaDoIngresso
                            key={t.id}
                            t={t}
                            apoio={variasSessoes ? formatar(T.grupoNaSessao, { grupo: g.nome, data: dataEHora(s.inicio) }) : g.nome}
                            lotes={lotesDe.get(t.id)}
                            onLotes={(ids) => vinculos.definirLotes(t, ids)}
                            onRemover={() => vinculos.remover(g, t)}
                        />
                    ))}
                </ul>
            )}
            {total > linhas.length && (
                <div>
                    <Button color="link-color" size="sm" onClick={() => setLimite((n) => n + PASSO)}>
                        {plural(T.mostrarMais, Math.min(PASSO, total - linhas.length))}
                    </Button>
                </div>
            )}
            {combosEscolhidos.length + produtosEscolhidos.length > 0 && (
                <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary">
                    {combosEscolhidos.map((c) => (
                        <LinhaSimples key={`c:${c.id}`} item={c} tipo={T.combo} onRemover={() => vinculos.alternarCombo(c.id, false)} />
                    ))}
                    {produtosEscolhidos.map((p) => (
                        <LinhaSimples key={`p:${p.id}`} item={p} tipo={T.produto} onRemover={() => vinculos.alternarProduto(p.id, false)} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function LinhaDoIngresso({ t, apoio, lotes, onLotes, onRemover }: { t: TipoIngresso; apoio: string; lotes?: Set<string>; onLotes: (ids: Set<string>) => void; onRemover: () => void }) {
    const { preco } = useTextosItens();
    const [aberto, setAberto] = useState(false);
    const escolhidos = lotes ? t.lotes.filter((l) => lotes.has(l.id)) : t.lotes;
    const textoLotes = !lotes ? T.todosOsLotes : escolhidos.map((l) => l.nome).join(", ");
    const marcados = new Set(escolhidos.map((l) => l.id));
    return (
        <li className="flex flex-col px-4 py-3">
            <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-primary">{t.nome}</span>
                    <span className="truncate text-sm text-tertiary">{apoio}</span>
                    <span className={lotes ? "text-sm font-medium text-brand-secondary" : "text-sm text-tertiary"}>{textoLotes}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    {t.lotes.length > 1 && (
                        <Button color="link-color" size="sm" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
                            {aberto ? T.fecharLotes : T.escolherLotes}
                        </Button>
                    )}
                    <Button color="link-gray" size="sm" aria-label={formatar(T.removerItem, { item: t.nome })} onClick={onRemover}>
                        {T.remover}
                    </Button>
                </div>
            </div>
            <Surgir visivel={aberto}>
                <fieldset className="mt-3 flex flex-col gap-3 rounded-lg bg-secondary_subtle p-3">
                    <legend className="sr-only">{formatar(T.lotesDe, { ingresso: t.nome })}</legend>
                    {t.lotes.map((l) => {
                        const ultimo = marcados.size === 1 && marcados.has(l.id);
                        return (
                            <Checkbox
                                key={l.id}
                                size="sm"
                                label={l.nome}
                                hint={ultimo ? T.ultimoLote : preco(l.preco)}
                                isSelected={marcados.has(l.id)}
                                isDisabled={ultimo}
                                onChange={(on) => {
                                    const p = new Set(marcados);
                                    if (on) p.add(l.id);
                                    else p.delete(l.id);
                                    onLotes(p);
                                }}
                            />
                        );
                    })}
                </fieldset>
            </Surgir>
        </li>
    );
}

function LinhaSimples({ item, tipo, onRemover }: { item: ItemSimples; tipo: string; onRemover: () => void }) {
    return (
        <li className="flex items-start gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-primary">{item.nome}</span>
                <span className="text-sm text-tertiary">{item.apoio ? `${tipo}, ${item.apoio}` : tipo}</span>
            </div>
            <Button color="link-gray" size="sm" aria-label={formatar(T.removerItem, { item: item.nome })} onClick={onRemover}>
                {T.remover}
            </Button>
        </li>
    );
}
