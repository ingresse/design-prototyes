import { type ReactNode, useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { Heading as AriaHeading, type Key, ToggleButton as AriaToggleButton, TreeItemContent as AriaTreeItemContent } from "react-aria-components";
import { Dialog, Modal, ModalOverlay, SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { CloseButton } from "@/components/base/buttons/close-button";
import { TreeView } from "@/components/application/tree-view/tree-view";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { CheckboxBase } from "@/components/base/checkbox/checkbox";
import { InputBase } from "@/components/base/input/input";
import type { Evento, Grupo, ItemDaAbertura, Sessao, TipoIngresso } from "@/plataforma";
import { cx } from "@/utils/cx";
import { paraBusca } from "../itens/components/escala";
import { formatar, useTextosItens } from "../itens/data/textos-itens";

/* ------------------------------------------------------------------ */
/*  Ingressos da abertura (ABV-04, ABV-11)                             */
/*                                                                     */
/*  Escala de 1 a milhares de setores com centenas de ingressos        */
/*  (UI-LST-001): sessão › setor › ingresso, setores recolhidos,       */
/*  marcar a sessão ou o setor inteiro de uma vez, busca por setor ou  */
/*  ingresso, filtro "Selecionados" e "Mostrar mais". Três peças:      */
/*  useSelecaoDeIngressos (o que está marcado), ArvoreDeIngressos      */
/*  (busca, filtro e árvore, sem moldura) e SeletorDeIngressos (a      */
/*  árvore num slideout, para quem escolhe só ingressos). O painel da  */
/*  abertura usa as duas primeiras (ABV-11).                           */
/*                                                                     */
/*  Marcar o setor marca os ingressos que ele tem agora; a abertura    */
/*  grava só ingressos. Ingresso criado depois não entra sozinho       */
/*  (decisão Victor, 08/11/2026).                                      */
/*                                                                     */
/*  Aguenta 1.000 grupos com 300 ingressos (ABV-14): acima de 3        */
/*  sessões, elas começam fechadas e entram de 30 em 30; grupos de 30  */
/*  em 30 e ingressos de 50 em 50; a busca usa um índice calculado uma */
/*  vez e abre só as 3 primeiras sessões e os 3 primeiros grupos.      */
/* ------------------------------------------------------------------ */

const T = {
    descricao: "Marque a sessão ou o grupo para incluir todos os ingressos dele. Ingressos criados depois não entram sozinhos.",
    buscar: "Buscar grupo ou ingresso",
    todos: "Todos",
    selecionados: "Selecionados",
    filtro: "Mostrar",
    sessao: "Sessão de {data}",
    parcial: "{item}, parte marcada",
    sessaoContagem: { one: "{n} grupo", other: "{n} grupos" },
    setorContagem: { one: "{n} ingresso", other: "{n} ingressos" },
    setorParcial: "{n} de {total}",
    mostrarSetores: { one: "Mostrar mais {n} grupo", other: "Mostrar mais {n} grupos" },
    mostrarSessoes: { one: "Mostrar mais {n} sessão", other: "Mostrar mais {n} sessões" },
    fechar: "Fechar",
    mostrarIngressos: { one: "Mostrar mais {n} ingresso", other: "Mostrar mais {n} ingressos" },
    nada: "Nada encontrado. Tente outro termo.",
    nadaSelecionado: "Nenhum grupo ou ingresso selecionado.",
    semIngressos: "O evento ainda não tem ingressos.",
    resumo: {
        nada: "Nenhum ingresso selecionado",
        ingressos: { one: "{n} ingresso", other: "{n} ingressos" },
        emSetores: { one: "{ingressos} em {n} grupo", other: "{ingressos} em {n} grupos" },
    },
    cancelar: "Cancelar",
    confirmar: "Confirmar",
};

const PASSO_SETORES = 30;
const PASSO_INGRESSOS = 50;
const PASSO_SESSOES = 30;
/** Até quantas sessões a árvore abre todas; acima disso, começam fechadas. A busca abre só as primeiras achadas. */
const SESSOES_ABERTAS_ATE = 3;
/** Quantos grupos a busca abre sozinha (os achados pelo nome de um ingresso). */
const GRUPOS_ABERTOS_PELA_BUSCA = 3;
/** Pai das linhas de primeiro nível, para contar o "Mostrar mais". */
const RAIZ = "raiz";
/** Pai das sessões, com várias sessões. */
const SESSOES = "sessoes";

/** Nomes já normalizados para a busca, calculados uma vez por evento (UI-LST-002). */
const indices = new WeakMap<Evento, { grupos: Map<string, string>; ingressos: Map<string, string> }>();
function indiceDe(evento: Evento) {
    let indice = indices.get(evento);
    if (!indice) {
        indice = { grupos: new Map(), ingressos: new Map() };
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                const nomeDoGrupo = paraBusca(g.nome);
                indice.grupos.set(g.id, nomeDoGrupo);
                for (const t of g.ingressos) indice.ingressos.set(t.id, `${paraBusca(t.nome)} ${nomeDoGrupo}`);
            }
        indices.set(evento, indice);
    }
    return indice;
}

interface SetorDaLista {
    setor: Grupo;
    sessaoId: string;
    /** Ingressos que casam com a busca; todos quando a busca não filtra por ingresso. */
    ingressos: TipoIngresso[];
    /** A busca achou ingressos dentro do setor: abre sozinho. */
    abertoPelaBusca: boolean;
}

/** Resumo da seleção em contagem: "60 ingressos em 7 setores". */
export function useResumoDeIngressos() {
    const { plural } = useTextosItens();
    return (ingressos: number, setores: number) =>
        ingressos === 0 ? T.resumo.nada : plural(T.resumo.emSetores, setores, { ingressos: plural(T.resumo.ingressos, ingressos) });
}

/** O que está marcado na árvore e as ações de marcar. Fica fora da árvore para quem a usa juntar com outras escolhas. */
export type SelecaoDeIngressos = ReturnType<typeof useSelecaoDeIngressos>;

export function useSelecaoDeIngressos(evento: Evento, itens: ItemDaAbertura[]) {
    // Por dentro, setor com todos os ingressos marcados vira um marcador só (não percorre 300 a cada clique).
    const [inicial] = useState(() => {
        const marcados = new Set(itens.filter((i) => i.tipo === "ingresso").map((i) => i.id));
        const completos = new Set<string>();
        for (const s of evento.sessoes)
            for (const g of s.grupos)
                if (g.ingressos.length > 0 && g.ingressos.every((t) => marcados.has(t.id))) {
                    completos.add(g.id);
                    for (const t of g.ingressos) marcados.delete(t.id);
                }
        return { completos, marcados };
    });
    const [setores, setSetores] = useState(inicial.completos);
    const [ingressos, setIngressos] = useState(inicial.marcados);

    /** Quantos ingressos do setor estão marcados um a um. */
    const marcadosNoSetor = (s: Grupo) => s.ingressos.reduce((n, t) => n + (ingressos.has(t.id) ? 1 : 0), 0);

    const alternarSetor = (s: Grupo, on: boolean) => {
        setSetores((a) => {
            const p = new Set(a);
            if (on) p.add(s.id);
            else p.delete(s.id);
            return p;
        });
        // Setor inteiro substitui os ingressos marcados um a um (e desmarcar limpa os dois).
        setIngressos((a) => {
            const p = new Set(a);
            for (const t of s.ingressos) p.delete(t.id);
            return p;
        });
    };

    const alternarIngresso = (s: Grupo, t: TipoIngresso, on: boolean) => {
        if (setores.has(s.id)) {
            // Desmarcar um ingresso de um setor inteiro: o setor vira seleção de ingressos.
            setSetores((a) => {
                const p = new Set(a);
                p.delete(s.id);
                return p;
            });
            setIngressos((a) => {
                const p = new Set(a);
                for (const x of s.ingressos) if (x.id !== t.id) p.add(x.id);
                return p;
            });
            return;
        }
        const marcados = marcadosNoSetor(s) + (on ? 1 : -1);
        if (on && marcados === s.ingressos.length) return alternarSetor(s, true);
        setIngressos((a) => {
            const p = new Set(a);
            if (on) p.add(t.id);
            else p.delete(t.id);
            return p;
        });
    };

    const alternarSessao = (sessaoId: string, on: boolean) => {
        const sessao = evento.sessoes.find((s) => s.id === sessaoId);
        if (!sessao) return;
        setSetores((a) => {
            const p = new Set(a);
            for (const g of sessao.grupos) {
                if (on) p.add(g.id);
                else p.delete(g.id);
            }
            return p;
        });
        setIngressos((a) => {
            const p = new Set(a);
            for (const g of sessao.grupos) for (const t of g.ingressos) p.delete(t.id);
            return p;
        });
    };

    const estadoDoSetor = (g: Grupo): "inteiro" | "parcial" | "nenhum" =>
        setores.has(g.id) ? "inteiro" : g.ingressos.some((t) => ingressos.has(t.id)) ? "parcial" : "nenhum";

    // Grava só ingressos: o setor marcado vira os ingressos que ele tem agora.
    const resultado = (): ItemDaAbertura[] => {
        const ids = new Set(ingressos);
        for (const s of evento.sessoes) for (const g of s.grupos) if (setores.has(g.id)) for (const t of g.ingressos) ids.add(t.id);
        return [...ids].map((id) => ({ tipo: "ingresso" as const, id }));
    };
    const total = useMemo(() => {
        let n = ingressos.size;
        let m = 0;
        for (const s of evento.sessoes)
            for (const g of s.grupos) {
                if (setores.has(g.id)) {
                    n += g.ingressos.length;
                    m++;
                } else if (g.ingressos.some((t) => ingressos.has(t.id))) m++;
            }
        return { ingressos: n, setores: m };
    }, [evento, setores, ingressos]);

    return { setores, ingressos, marcadosNoSetor, alternarSetor, alternarIngresso, alternarSessao, estadoDoSetor, resultado, total };
}

/**
 * Busca, filtro e a árvore sessão › setor › ingresso, sem moldura. Por padrão, uma coisa embaixo da outra;
 * quem precisa separar (o slideout deixa a busca fora da rolagem) passa `children` e posiciona as duas partes.
 */
export function ArvoreDeIngressos({
    evento,
    selecao,
    rotulo,
    children,
}: {
    evento: Evento;
    selecao: SelecaoDeIngressos;
    /** Nome da árvore para leitor de tela. */
    rotulo: string;
    children?: (partes: { ferramentas: ReactNode; arvore: ReactNode }) => ReactNode;
}) {
    const { dataCurta, numero, plural, locale } = useTextosItens();
    const { setores, ingressos, marcadosNoSetor, alternarSetor, alternarIngresso, alternarSessao, estadoDoSetor } = selecao;
    const variasSessoes = evento.sessoes.length > 1;
    // Duas sessões no mesmo dia teriam o mesmo rótulo: a hora entra para separar (UI-LST-001).
    const sessoesPorDia = useMemo(() => {
        const m = new Map<string, number>();
        for (const s of evento.sessoes) m.set(dataCurta(s.inicio), (m.get(dataCurta(s.inicio)) ?? 0) + 1);
        return m;
    }, [evento, dataCurta]);
    const rotuloDaSessao = (sessao: { inicio: string }) => {
        const data = dataCurta(sessao.inicio);
        const mesmoDia = (sessoesPorDia.get(data) ?? 0) > 1;
        const hora = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(sessao.inicio));
        return formatar(T.sessao, { data: mesmoDia ? `${data}, ${hora}` : data });
    };
    // Poucas sessões abrem todas; acima de 3, começam fechadas (UI-LST-001).
    const sessoesIniciais = () => (evento.sessoes.length <= SESSOES_ABERTAS_ATE ? evento.sessoes.map((s) => `s:${s.id}`) : []);

    // Chaves da árvore: "s:" sessão, "g:" setor, "t:" ingresso, "mais:" mostrar mais.
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set(sessoesIniciais()));
    /** Quantas linhas cada pai mostra (UI-LST-001). */
    const [limites, setLimites] = useState<Map<string, number>>(() => new Map());
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");
    const termo = paraBusca(useDeferredValue(busca).trim());

    // Lista achatada de setores, com o rótulo da sessão no primeiro setor de cada uma. Cada palavra da busca
    // precisa estar no nome do grupo (o grupo entra inteiro) ou no do ingresso com o do grupo.
    const lista = useMemo<SetorDaLista[]>(() => {
        const out: SetorDaLista[] = [];
        const indice = indiceDe(evento);
        const palavras = termo.split(/\s+/).filter(Boolean);
        const tem = (texto: string) => palavras.every((p) => texto.includes(p));
        for (const sessao of evento.sessoes) {
            for (const setor of sessao.grupos) {
                if (filtro === "selecionados" && !setores.has(setor.id) && !setor.ingressos.some((t) => ingressos.has(t.id))) continue;
                let doSetor = setor.ingressos;
                let abertoPelaBusca = false;
                if (palavras.length && !tem(indice.grupos.get(setor.id) ?? "")) {
                    doSetor = setor.ingressos.filter((t) => tem(indice.ingressos.get(t.id) ?? ""));
                    if (doSetor.length === 0) continue;
                    abertoPelaBusca = true;
                }
                out.push({ setor, sessaoId: sessao.id, ingressos: doSetor, abertoPelaBusca });
            }
        }
        return out;
        // A seleção só entra no filtro "Selecionados"; fora dele, marcar não refaz a lista.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evento, termo, filtro, filtro === "selecionados" ? setores : null, filtro === "selecionados" ? ingressos : null]);

    // Busca ou filtro novo: listas do começo. Buscando, abrem só as 3 primeiras sessões com resultado e os
    // 3 primeiros grupos achados pelo ingresso; sem busca, volta ao começo (UI-LST-002).
    useEffect(() => {
        if (!termo && filtro === "todos") setAbertos(new Set(sessoesIniciais()));
        else {
            const sessoesAchadas = [...new Set(lista.map((i) => i.sessaoId))].slice(0, SESSOES_ABERTAS_ATE).map((id) => `s:${id}`);
            // Com uma letra só, quase tudo casa: os grupos ficam fechados até a busca ter duas letras.
            const gruposAchados = termo.length < 2 ? [] : lista.filter((i) => i.abertoPelaBusca).slice(0, GRUPOS_ABERTOS_PELA_BUSCA).map((i) => `g:${i.setor.id}`);
            setAbertos(new Set([...sessoesAchadas, ...gruposAchados]));
        }
        setLimites(new Map());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termo, filtro]);

    const limite = (pai: string, passo: number) => limites.get(pai) ?? passo;
    const mostrarMais = (pai: string, passo: number) => setLimites((m) => new Map(m).set(pai, (m.get(pai) ?? passo) + passo));

    // Agrupa numa passada só (mil sessões não refiltram a lista mil vezes).
    const porSessao = useMemo(() => {
        const m = new Map<string, SetorDaLista[]>();
        for (const i of lista) {
            const l = m.get(i.sessaoId);
            if (l) l.push(i);
            else m.set(i.sessaoId, [i]);
        }
        return evento.sessoes.flatMap((sessao: Sessao) => (m.has(sessao.id) ? [{ sessao, setores: m.get(sessao.id)! }] : []));
    }, [evento, lista]);

    const acharIngresso = (id: string) => {
        for (const s of evento.sessoes) for (const g of s.grupos) for (const t of g.ingressos) if (t.id === id) return { g, t };
    };

    // Clique na linha: grupo abre e fecha; ingresso marca; "Mostrar mais" carrega o próximo bloco.
    const aoClicarNaLinha = (k: Key) => {
        const chave = String(k);
        if (chave.startsWith("mais:")) {
            const pai = chave.slice(5);
            return mostrarMais(pai, pai.startsWith("g:") ? PASSO_INGRESSOS : pai === SESSOES ? PASSO_SESSOES : PASSO_SETORES);
        }
        if (chave.startsWith("t:")) {
            const achado = acharIngresso(chave.slice(2));
            if (achado) alternarIngresso(achado.g, achado.t, !(setores.has(achado.g.id) || ingressos.has(achado.t.id)));
            return;
        }
        setAbertos((a) => {
            const p = new Set(a);
            if (p.has(chave)) p.delete(chave);
            else p.add(chave);
            return p;
        });
    };

    const renderSetores = (doPai: SetorDaLista[], pai: string) => {
        const n = limite(pai, PASSO_SETORES);
        const restantes = doPai.length - n;
        return (
            <>
                {doPai.slice(0, n).map((item) => {
                    const { setor } = item;
                    const estado = estadoDoSetor(setor);
                    const marcados = estado === "inteiro" ? setor.ingressos.length : estado === "parcial" ? marcadosNoSetor(setor) : 0;
                    const chave = `g:${setor.id}`;
                    const nIngressos = limite(chave, PASSO_INGRESSOS);
                    return (
                        <TreeView.Item key={setor.id} id={chave} textValue={setor.nome}>
                            <TreeView.ItemContent
                                icon={
                                    <Caixa
                                        rotulo={setor.nome}
                                        marcado={estado === "inteiro"}
                                        parcial={estado === "parcial"}
                                        onChange={(on) => alternarSetor(setor, on)}
                                    />
                                }
                                action={
                                    <Contagem>
                                        {estado === "parcial"
                                            ? formatar(T.setorParcial, { n: numero(marcados), total: numero(setor.ingressos.length) })
                                            : plural(T.setorContagem, setor.ingressos.length)}
                                    </Contagem>
                                }
                            >
                                {setor.nome}
                            </TreeView.ItemContent>
                            {/* Ingressos só existem na árvore com o setor aberto: mil setores fechados não pesam.
                                Fechado, entra só o primeiro (escondido), para a árvore saber que o setor abre. */}
                            {/* A chave segue o ingresso: a busca troca o primeiro, e a árvore não aceita trocar o id de uma linha. */}
                            {!abertos.has(chave) && item.ingressos[0] && <LinhaIngresso key={`oculta-${item.ingressos[0].id}`} t={item.ingressos[0]} marcado={false} onChange={() => {}} />}
                            {abertos.has(chave) && (
                                <>
                                    {item.ingressos.slice(0, nIngressos).map((t) => (
                                        <LinhaIngresso
                                            key={t.id}
                                            t={t}
                                            marcado={estado === "inteiro" || ingressos.has(t.id)}
                                            onChange={(on) => alternarIngresso(setor, t, on)}
                                        />
                                    ))}
                                    {item.ingressos.length > nIngressos && (
                                        <LinhaMostrarMais
                                            id={`mais:${chave}`}
                                            texto={plural(T.mostrarIngressos, Math.min(PASSO_INGRESSOS, item.ingressos.length - nIngressos))}
                                        />
                                    )}
                                </>
                            )}
                        </TreeView.Item>
                    );
                })}
                {restantes > 0 && <LinhaMostrarMais id={`mais:${pai}`} comSeta texto={plural(T.mostrarSetores, Math.min(PASSO_SETORES, restantes))} />}
            </>
        );
    };

    const temIngressos = evento.sessoes.some((s) => s.grupos.some((g) => g.ingressos.length > 0));
    if (!temIngressos) return <p className="text-sm text-tertiary">{T.semIngressos}</p>;

    const ferramentas = (
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
                <ButtonGroupItem id="selecionados">{T.selecionados}</ButtonGroupItem>
            </ButtonGroup>
        </div>
    );

    const arvore = (
        <>
            {lista.length > 0 && (
                <TreeView
                    aria-label={rotulo}
                    size="sm"
                    showConnectors
                    // A árvore não seleciona: a linha inteira abre e fecha o grupo (ou marca o
                    // ingresso) e a caixa à esquerda marca. Com seleção da árvore, o clique na
                    // linha marcaria em vez de abrir.
                    selectionMode="none"
                    expandedKeys={abertos}
                    onExpandedChange={(k) => setAbertos(new Set([...k].map(String)))}
                    onAction={aoClicarNaLinha}
                >
                    {variasSessoes
                        ? porSessao.slice(0, limite(SESSOES, PASSO_SESSOES)).map(({ sessao, setores: doGrupo }) => {
                              const marcadosNaSessao = doGrupo.filter((i) => estadoDoSetor(i.setor) !== "nenhum").length;
                              const inteira = doGrupo.length > 0 && sessao.grupos.every((g) => setores.has(g.id));
                              return (
                                  <TreeView.Item key={sessao.id} id={`s:${sessao.id}`} textValue={rotuloDaSessao(sessao)}>
                                      <TreeView.ItemContent
                                          icon={
                                              <Caixa
                                                  rotulo={rotuloDaSessao(sessao)}
                                                  marcado={inteira}
                                                  parcial={!inteira && marcadosNaSessao > 0}
                                                  onChange={(on) => alternarSessao(sessao.id, on)}
                                              />
                                          }
                                          action={<Contagem>{plural(T.sessaoContagem, sessao.grupos.length)}</Contagem>}
                                      >
                                          {rotuloDaSessao(sessao)}
                                      </TreeView.ItemContent>
                                      {abertos.has(`s:${sessao.id}`) ? (
                                          renderSetores(doGrupo, `s:${sessao.id}`)
                                      ) : (
                                          // Fechada, entra só um filho escondido: a seta continua visível e a árvore sabe que abre.
                                          <TreeView.Item key={`oculta-${doGrupo[0].setor.id}`} id={`g:${doGrupo[0].setor.id}`} textValue={doGrupo[0].setor.nome}>
                                              <TreeView.ItemContent>{doGrupo[0].setor.nome}</TreeView.ItemContent>
                                          </TreeView.Item>
                                      )}
                                  </TreeView.Item>
                              );
                          })
                        : renderSetores(lista, RAIZ)}
                    {/* Mil sessões não viram mil linhas: 30 por vez (ABV-14). */}
                    {variasSessoes && porSessao.length > limite(SESSOES, PASSO_SESSOES) && (
                        <LinhaMostrarMais id={`mais:${SESSOES}`} comSeta texto={plural(T.mostrarSessoes, Math.min(PASSO_SESSOES, porSessao.length - limite(SESSOES, PASSO_SESSOES)))} />
                    )}
                </TreeView>
            )}
            {lista.length === 0 && <p className="px-2 py-2 text-sm text-tertiary">{filtro === "selecionados" && !termo ? T.nadaSelecionado : T.nada}</p>}
        </>
    );

    if (children) return <>{children({ ferramentas, arvore })}</>;
    return (
        <div className="flex flex-col gap-3">
            {ferramentas}
            <div className="flex flex-col gap-1">{arvore}</div>
        </div>
    );
}

/** A árvore num slideout, para quem escolhe só ingressos (Questionário, Equipe e comissários). */
export function SeletorDeIngressos({
    titulo,
    evento,
    itens,
    onConfirmar,
    onFechar,
}: {
    titulo: string;
    evento: Evento;
    /** Ingressos já escolhidos. */
    itens: ItemDaAbertura[];
    onConfirmar: (itens: ItemDaAbertura[]) => void;
    onFechar: () => void;
}) {
    const resumir = useResumoDeIngressos();
    const selecao = useSelecaoDeIngressos(evento, itens);
    const temIngressos = evento.sessoes.some((s) => s.grupos.some((g) => g.ingressos.length > 0));
    const tituloId = useId();

    return (
        // Peças do painel lateral do DS montadas aqui para o painel ter o nome do título e o "Fechar" em
        // português (SEG-64): o SlideoutMenu pronto fixa "Slideout menu" e "Close".
        // Celular: tela cheia (UI-NAV-003). z-50: acima do cabeçalho fixo do Backstage no celular (z-30).
        <ModalOverlay isOpen isDismissable onOpenChange={(v) => !v && onFechar()} className="z-50 pl-0">
            <Modal>
                <Dialog aria-label={undefined} aria-labelledby={tituloId} className="gap-0">
            <header className="relative z-1 flex w-full flex-col gap-1 px-4 pt-6 pb-4 md:px-6">
                <AriaHeading id={tituloId} className="pr-8 text-lg font-semibold text-primary">
                    {titulo}
                </AriaHeading>
                <p className="text-sm text-tertiary">{T.descricao}</p>
                <CloseButton size="sm" label={T.fechar} className="absolute top-3 right-3 shrink-0" onPress={onFechar} />
            </header>

            {!temIngressos ? (
                <SlideoutMenu.Content>
                    <p className="text-sm text-tertiary">{T.semIngressos}</p>
                </SlideoutMenu.Content>
            ) : (
                <ArvoreDeIngressos evento={evento} selecao={selecao} rotulo={titulo}>
                    {({ ferramentas, arvore }) => (
                        <>
                            <div className="w-full px-4 pb-4 md:px-6">{ferramentas}</div>
                            <SlideoutMenu.Content className="gap-1 border-t border-secondary pt-3 pb-4">{arvore}</SlideoutMenu.Content>
                        </>
                    )}
                </ArvoreDeIngressos>
            )}

            <SlideoutMenu.Footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-tertiary" role="status">
                    {resumir(selecao.total.ingressos, selecao.total.setores)}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md" onClick={onFechar}>
                        {T.cancelar}
                    </Button>
                    <Button color="primary" size="md" onClick={() => onConfirmar(selecao.resultado())}>
                        {T.confirmar}
                    </Button>
                </div>
            </SlideoutMenu.Footer>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/**
 * Caixa de marcar dentro da linha. Mesmo padrão da seta do TreeView do DS: um botão do react-aria
 * dentro da linha segura o toque, então marcar não abre nem fecha o grupo. Desenho do CheckboxBase.
 */
function Caixa({ rotulo, marcado, parcial, onChange }: { rotulo: string; marcado: boolean; parcial?: boolean; onChange: (on: boolean) => void }) {
    return (
        // Botão de alternar (aria-pressed): o Button do react-aria não repassa role nem aria-checked.
        <AriaToggleButton
            aria-label={parcial ? formatar(T.parcial, { item: rotulo }) : rotulo}
            isSelected={marcado}
            onChange={() => onChange(!marcado)}
            className="flex shrink-0 items-center justify-center rounded outline-hidden"
        >
            {({ isFocusVisible }) => <CheckboxBase size="sm" isSelected={marcado || !!parcial} isIndeterminate={parcial} isFocusVisible={isFocusVisible} />}
        </AriaToggleButton>
    );
}

function LinhaIngresso({ t, marcado, onChange }: { t: TipoIngresso; marcado: boolean; onChange: (on: boolean) => void }) {
    return (
        <TreeView.Item id={`t:${t.id}`} textValue={t.nome}>
            <TreeView.ItemContent icon={<Caixa rotulo={t.nome} marcado={marcado} onChange={onChange} />}>{t.nome}</TreeView.ItemContent>
        </TreeView.Item>
    );
}

/** Contagem à direita da linha. */
function Contagem({ children }: { children: ReactNode }) {
    return <span className="shrink-0 text-sm text-tertiary tabular-nums">{children}</span>;
}

/** Linha "Mostrar mais" dentro da árvore, no nível dos irmãos e sem caixa de marcar. */
function LinhaMostrarMais({ id, texto, comSeta = false }: { id: string; texto: string; comSeta?: boolean }) {
    return (
        <TreeView.Item id={id} textValue={texto}>
            <AriaTreeItemContent>
                {({ level, isFocusVisible }) => (
                    <div
                        className={cx(
                            "flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 text-sm font-semibold text-brand-secondary -outline-offset-2 outline-focus-ring hover:bg-primary_hover hover:text-brand-secondary_hover",
                            isFocusVisible && "outline-2",
                        )}
                        // Alinha com o nome das linhas irmãs: 8 px + 24 px por nível, mais a caixa (e a seta, se houver).
                        style={{ paddingLeft: 8 + (level - 1) * 24 + 24 + (comSeta ? 24 : 0) }}
                    >
                        {texto}
                    </div>
                )}
            </AriaTreeItemContent>
        </TreeView.Item>
    );
}
