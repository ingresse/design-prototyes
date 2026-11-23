import { useDeferredValue, useMemo, useState, type Key, type ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import { ToggleButton as AriaToggleButton } from "react-aria-components";
import { TreeView } from "@/components/application/tree-view/tree-view";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CheckboxBase } from "@/components/base/checkbox/checkbox";
import { InputBase } from "@/components/base/input/input";
import { formatar, useTextosItens } from "../data/textos-itens";
import { LIMIAR_FERRAMENTAS, paraBusca } from "./escala";

/* ------------------------------------------------------------------ */
/*  Destino de uma duplicação (ITM-135, ITM-136; UI-LST-003)            */
/*                                                                     */
/*  Árvore do DS com sessões e grupos. Escolher grupos (duplicar       */
/*  ingresso): a sessão marca todos os grupos dela, com estado         */
/*  parcial; a linha da sessão abre e fecha. Escolher sessões          */
/*  (duplicar grupo): a linha da sessão marca, e os grupos dela        */
/*  aparecem ao abrir, só para conferir. Linhas com 44 px e cursor de  */
/*  clique; filhos só existem com a sessão aberta e entram de 50 em    */
/*  50, para mil sessões ou grupos não pesarem.                        */
/* ------------------------------------------------------------------ */

export interface GrupoDeDestino {
    id: string;
    nome: string;
    apoio?: string;
}
export interface SessaoDeDestino {
    id: string;
    rotulo: string;
    grupos: GrupoDeDestino[];
}

const PASSO = 50;
const T = {
    buscar: "Buscar sessão ou grupo",
    nada: "Nada encontrado. Tente outro termo.",
    cancelar: "Cancelar",
    grupos: { one: "{n} grupo", other: "{n} grupos" },
    sessoes: { one: "{n} sessão", other: "{n} sessões" },
    marcadosGrupos: { one: "{n} grupo escolhido", other: "{n} grupos escolhidos" },
    marcadasSessoes: { one: "{n} sessão escolhida", other: "{n} sessões escolhidas" },
    parcial: "{item}, parte dos grupos escolhida",
    mostrarMais: { one: "Mostrar mais {n}", other: "Mostrar mais {n}" },
    semGrupo: "Sem grupos nesta sessão",
};

export function SeletorDeDestino({
    titulo,
    descricao,
    sessoes,
    escolher,
    selecionados,
    rotuloConfirmar,
    onConfirmar,
    onFechar,
}: {
    titulo: string;
    descricao?: string;
    sessoes: SessaoDeDestino[];
    /** O que se marca: grupos (duplicar ingresso) ou sessões (duplicar grupo). */
    escolher: "grupos" | "sessoes";
    selecionados: string[];
    rotuloConfirmar: string;
    onConfirmar: (ids: string[]) => void;
    onFechar: () => void;
}) {
    const { plural, numero } = useTextosItens();
    const [marcados, setMarcados] = useState(() => new Set(selecionados));
    // Abre já a sessão do que veio marcado, para o destino atual aparecer.
    const [abertos, setAbertos] = useState<Set<string>>(() => {
        if (escolher !== "grupos") return new Set();
        const daOrigem = sessoes.find((s) => s.grupos.some((g) => selecionados.includes(g.id)));
        return new Set(daOrigem ? [`s:${daOrigem.id}`] : []);
    });
    const [limites, setLimites] = useState<Record<string, number>>({});
    const limite = (pai: string) => limites[pai] ?? PASSO;
    const mostrarMais = (pai: string) => setLimites((l) => ({ ...l, [pai]: limite(pai) + PASSO }));
    const [busca, setBusca] = useState("");
    const termo = paraBusca(useDeferredValue(busca).trim());

    const totalDeGrupos = sessoes.reduce((n, s) => n + s.grupos.length, 0);
    const umaSessao = sessoes.length === 1;
    const comBusca = (escolher === "grupos" ? totalDeGrupos : sessoes.length) > LIMIAR_FERRAMENTAS;

    // Sessão que bate na busca mostra todos os grupos; senão, só os grupos que batem.
    const lista = useMemo(() => {
        if (!termo) return sessoes;
        return sessoes
            .map((s) => (paraBusca(s.rotulo).includes(termo) ? s : { ...s, grupos: s.grupos.filter((g) => paraBusca(g.nome).includes(termo)) }))
            .filter((s) => paraBusca(s.rotulo).includes(termo) || s.grupos.length > 0);
    }, [sessoes, termo]);
    // Buscando, as sessões que sobraram abrem sozinhas.
    const abertas = termo ? new Set(lista.map((s) => `s:${s.id}`)) : abertos;

    const alternar = (ids: string[], on: boolean) =>
        setMarcados((a) => {
            const p = new Set(a);
            ids.forEach((id) => (on ? p.add(id) : p.delete(id)));
            return p;
        });
    const alternarAbertura = (chave: string) =>
        setAbertos((a) => {
            const p = new Set(a);
            if (p.has(chave)) p.delete(chave);
            else p.add(chave);
            return p;
        });

    const aoClicarNaLinha = (k: Key) => {
        const chave = String(k);
        if (chave.startsWith("mais:")) return mostrarMais(chave.slice(5));
        if (chave.startsWith("g:")) {
            if (escolher !== "grupos") return; // na escolha de sessões, o grupo é só para conferir
            const id = chave.slice(2);
            return alternar([id], !marcados.has(id));
        }
        if (chave.startsWith("s:")) {
            const id = chave.slice(2);
            // Escolhendo sessões, a linha marca; escolhendo grupos, a linha abre e fecha.
            if (escolher === "sessoes") return alternar([id], !marcados.has(id));
            return alternarAbertura(chave);
        }
    };

    const linhaDoGrupo = (g: GrupoDeDestino) => (
        <TreeView.Item key={g.id} id={`g:${g.id}`} textValue={g.nome}>
            <TreeView.ItemContent
                className="min-h-11"
                icon={escolher === "grupos" ? <Caixa rotulo={g.nome} marcado={marcados.has(g.id)} onChange={(on) => alternar([g.id], on)} /> : undefined}
                action={g.apoio ? <Contagem>{g.apoio}</Contagem> : undefined}
            >
                {g.nome}
            </TreeView.ItemContent>
        </TreeView.Item>
    );

    const gruposDaSessao = (s: SessaoDeDestino) => {
        const pai = `s:${s.id}`;
        if (s.grupos.length === 0)
            return (
                <TreeView.Item id={`vazio:${s.id}`} textValue={T.semGrupo} isDisabled>
                    <TreeView.ItemContent className="min-h-11">{T.semGrupo}</TreeView.ItemContent>
                </TreeView.Item>
            );
        // Fechada, entra só um filho escondido: a seta aparece e a árvore sabe que abre (mil grupos não pesam).
        if (!abertas.has(pai)) return linhaDoGrupo(s.grupos[0]);
        const n = limite(pai);
        return (
            <>
                {s.grupos.slice(0, n).map(linhaDoGrupo)}
                {s.grupos.length > n && <LinhaMostrarMais id={`mais:${pai}`} texto={plural(T.mostrarMais, Math.min(PASSO, s.grupos.length - n))} />}
            </>
        );
    };

    const nSessoes = limite("raiz");
    const marcadosNa = (s: SessaoDeDestino) => s.grupos.filter((g) => marcados.has(g.id)).length;

    return (
        <SlideoutMenu
            isOpen
            isDismissable
            onOpenChange={(v) => !v && onFechar()}
            // z-50: acima do cabeçalho fixo do Backstage; pl-0: tela cheia no celular (UI-NAV-003).
            className="z-50 pl-0"
            dialogClassName="gap-0"
        >
            <SlideoutMenu.Header onClose={onFechar} className="flex flex-col gap-1 pb-4">
                <h2 className="pr-8 text-lg font-semibold text-primary">{titulo}</h2>
                {descricao && <p className="text-sm text-tertiary">{descricao}</p>}
            </SlideoutMenu.Header>

            {comBusca && (
                <div className="px-4 pb-4 md:px-6">
                    <InputBase
                        size="sm"
                        icon={SearchLg}
                        aria-label={T.buscar}
                        placeholder={T.buscar}
                        value={busca}
                        onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                    />
                </div>
            )}

            <SlideoutMenu.Content className="gap-1 border-t border-secondary pt-3 pb-4">
                {lista.length > 0 ? (
                    <TreeView
                        aria-label={titulo}
                        // Cursor de clique na árvore inteira, inclusive no vão de 2 px entre as linhas.
                        className="cursor-pointer"
                        size="sm"
                        showConnectors
                        // A árvore não seleciona: a caixa marca e a linha faz a ação dela (marcar ou abrir).
                        selectionMode="none"
                        expandedKeys={abertas}
                        onExpandedChange={(k) => setAbertos(new Set([...k].map(String)))}
                        onAction={aoClicarNaLinha}
                    >
                        {escolher === "grupos" && umaSessao
                            ? lista[0].grupos.slice(0, nSessoes).map(linhaDoGrupo)
                            : lista.slice(0, nSessoes).map((s) => {
                                  const n = marcadosNa(s);
                                  const inteira = escolher === "grupos" ? s.grupos.length > 0 && n === s.grupos.length : marcados.has(s.id);
                                  const parcial = escolher === "grupos" && !inteira && n > 0;
                                  return (
                                      <TreeView.Item key={s.id} id={`s:${s.id}`} textValue={s.rotulo}>
                                          <TreeView.ItemContent
                                              className="min-h-11"
                                              icon={
                                                  <Caixa
                                                      rotulo={parcial ? formatar(T.parcial, { item: s.rotulo }) : s.rotulo}
                                                      marcado={inteira}
                                                      parcial={parcial}
                                                      desabilitada={escolher === "grupos" && s.grupos.length === 0}
                                                      onChange={(on) => (escolher === "grupos" ? alternar(s.grupos.map((g) => g.id), on) : alternar([s.id], on))}
                                                  />
                                              }
                                              action={<Contagem>{plural(T.grupos, s.grupos.length)}</Contagem>}
                                          >
                                              {s.rotulo}
                                          </TreeView.ItemContent>
                                          {gruposDaSessao(s)}
                                      </TreeView.Item>
                                  );
                              })}
                        {(escolher === "grupos" && umaSessao ? lista[0].grupos.length : lista.length) > nSessoes && (
                            <LinhaMostrarMais
                                id="mais:raiz"
                                texto={plural(T.mostrarMais, Math.min(PASSO, (escolher === "grupos" && umaSessao ? lista[0].grupos.length : lista.length) - nSessoes))}
                            />
                        )}
                    </TreeView>
                ) : (
                    <p className="px-2 py-2 text-sm text-tertiary">{T.nada}</p>
                )}
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-tertiary tabular-nums" role="status">
                    {plural(escolher === "grupos" ? T.marcadosGrupos : T.marcadasSessoes, marcados.size, { n: numero(marcados.size) })}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md" onClick={onFechar}>
                        {T.cancelar}
                    </Button>
                    <Button color="primary" size="md" isDisabled={marcados.size === 0} onClick={() => onConfirmar([...marcados])}>
                        {rotuloConfirmar}
                    </Button>
                </div>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}

/** Caixa de marcar dentro da linha da árvore (composta do DS): botão de alternar com a caixa do Checkbox. */
function Caixa({ rotulo, marcado, parcial, desabilitada, onChange }: { rotulo: string; marcado: boolean; parcial?: boolean; desabilitada?: boolean; onChange: (on: boolean) => void }) {
    return (
        // Área de toque de 44 px em volta da caixa, sem mudar o desenho (WCAG 2.5.8).
        <AriaToggleButton
            aria-label={rotulo}
            isSelected={marcado}
            isDisabled={desabilitada}
            onChange={() => onChange(!marcado)}
            className="relative flex shrink-0 cursor-pointer items-center justify-center rounded outline-hidden before:absolute before:-inset-3 before:content-[''] disabled:cursor-not-allowed"
        >
            {({ isFocusVisible }) => <CheckboxBase size="sm" isSelected={marcado || !!parcial} isIndeterminate={parcial} isDisabled={desabilitada} isFocusVisible={isFocusVisible} />}
        </AriaToggleButton>
    );
}

function Contagem({ children }: { children: ReactNode }) {
    return <span className="shrink-0 text-sm font-normal text-tertiary tabular-nums">{children}</span>;
}

function LinhaMostrarMais({ id, texto }: { id: string; texto: string }) {
    return (
        <TreeView.Item id={id} textValue={texto}>
            <TreeView.ItemContent className="min-h-11">
                <span className="text-sm font-semibold text-brand-secondary">{texto}</span>
            </TreeView.ItemContent>
        </TreeView.Item>
    );
}
