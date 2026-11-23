import { type ReactNode, useMemo, useState } from "react";
import { Key01, SearchLg } from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import type { TipoIngresso } from "@/plataforma";
import { cx } from "@/utils/cx";
import { formatar, useTextosItens } from "../data/textos-itens";
import { BotaoMostrarMais, LIMIAR_FERRAMENTAS, paraBusca, useMostrarMais } from "./escala";
import { SeletorDeLista } from "./SeletorDeLista";

/* ------------------------------------------------------------------ */
/*  Passkeys de um ingresso, para consultar e editar na lista (ITM-33) */
/*                                                                     */
/*  As chaves do ingresso inteiro e as de cada lote, com busca e       */
/*  "Mostrar mais" acima do limiar (UI-LST-001). Cada lugar tem        */
/*  "Editar"; os lugares sem chave ficam embaixo, com "Vincular". O    */
/*  seletor abre no lugar do slideout (um por vez) e volta para ele.   */
/* ------------------------------------------------------------------ */

const T = {
    botao: { one: "{n} Passkey", other: "{n} Passkeys" },
    coluna: "Passkey",
    contagem: { one: "{n} Passkey", other: "{n} Passkeys" },
    /** Primeiro trecho do detalhe, com a palavra "Passkey": "2 Passkeys no ingresso". */
    primeiro: { one: "{n} Passkey {onde}", other: "{n} Passkeys {onde}" },
    /** Trechos seguintes, sem repetir a palavra: "1 no 1º lote". */
    seguinte: "{n} {onde}",
    noIngresso: "no ingresso",
    noLote: "no {lote}",
    /** Com muitos lotes, o detalhe não cabe na linha: só o total e quantos lotes. */
    emLotes: { one: "{chaves} em {n} lote", other: "{chaves} em {n} lotes" },
    /** Começa pelo texto visível (WCAG 2.5.3) e diz de qual ingresso. */
    botaoRotulo: "{chaves}, {ingresso}",
    titulo: "Passkeys de {ingresso}",
    dica: "Só quem tem uma destas Passkeys compra o ingresso ou o lote.",
    todoIngresso: "Todo o ingresso",
    grupo: { one: "{grupo}, {n} Passkey", other: "{grupo}, {n} Passkeys" },
    buscar: "Buscar Passkey",
    nada: "Nenhuma Passkey com esse termo.",
    editar: "Editar",
    editarEm: "Editar Passkeys em {lugar}",
    vincular: "Vincular",
    vincularEm: "Vincular Passkey em {lugar}",
    semChave: "Sem Passkey",
    fechar: "Fechar",
    seletorDoIngresso: "Passkeys de {ingresso}",
    seletorDoLote: "Passkeys do {lote}",
    seletorDicaIngresso: "Com Passkey vinculada ao ingresso, só quem tem uma delas compra qualquer lote dele. As Passkeys são criadas em Ingressos e produtos › Passkey.",
    seletorDicaLote: "Com Passkey vinculada, só quem tem uma delas compra este lote. As Passkeys são criadas em Ingressos e produtos › Passkey.",
    seletorVazio: "Nenhuma Passkey neste evento. Crie em Ingressos e produtos › Passkey.",
};

/** Onde a Passkey vale: "ingresso" (todo o ingresso) ou o id de um lote. */
export type LugarDaChave = string;

interface GrupoDeChaves {
    id: string;
    nome: string;
    chaves: string[];
}

const lugaresDe = (tipo: TipoIngresso, todoIngresso: string): GrupoDeChaves[] => [
    { id: "ingresso", nome: todoIngresso, chaves: tipo.chaves ?? [] },
    ...tipo.lotes.map((l) => ({ id: l.id, nome: l.nome, chaves: l.chaves ?? [] })),
];
const gruposDe = (tipo: TipoIngresso, todoIngresso: string): GrupoDeChaves[] => lugaresDe(tipo, todoIngresso).filter((g) => g.chaves.length > 0);

/** Total de chaves distintas do ingresso, somando as do ingresso e as dos lotes. */
export const totalDeChaves = (tipo: TipoIngresso) => new Set([...(tipo.chaves ?? []), ...tipo.lotes.flatMap((l) => l.chaves ?? [])]).size;

/** Até três lugares (ingresso e lotes) o detalhe vai na linha; acima disso, só o total. */
const MAX_TRECHOS = 3;

/** Coluna "Passkey" da linha do ingresso (dentro do `dl`): ícone e "N Passkeys" em azul; abre o slideout com o detalhe. Some sem chaves. */
export function BotaoChaves({
    tipo,
    opcoes,
    onSalvar,
    className,
    selo,
    noPe,
}: {
    tipo: TipoIngresso;
    /** Passkeys do evento que podem ser vinculadas. */
    opcoes: string[];
    /** Grava as Passkeys de um lugar (todo o ingresso ou um lote). */
    onSalvar: (lugar: LugarDaChave, ids: string[]) => Promise<void> | void;
    className?: string;
    /** No card do ingresso (ITM-152): vira selo, sem o rótulo de coluna e fora de lista de definição. */
    selo?: boolean;
    /** No pé do card do ingresso, no lugar de "Vincular Passkey" e com o mesmo desenho dele (ITM-160). */
    noPe?: boolean;
}) {
    const { plural, locale } = useTextosItens();
    const [aberto, setAberto] = useState(false);
    // Lugar com o seletor aberto: o seletor ocupa o lugar do slideout e, ao fechar, ele volta.
    const [editando, setEditando] = useState<LugarDaChave | null>(null);
    const total = totalDeChaves(tipo);
    if (!total) return null;
    const grupos = gruposDe(tipo, T.todoIngresso);
    const lotesComChave = grupos.filter((g) => g.id !== "ingresso").length;
    const texto =
        grupos.length > MAX_TRECHOS
            ? plural(T.emLotes, lotesComChave, { chaves: plural(T.botao, total) })
            : new Intl.ListFormat(locale, { type: "conjunction" }).format(
                  grupos.map((g, i) => {
                      const onde = g.id === "ingresso" ? T.noIngresso : formatar(T.noLote, { lote: g.nome });
                      return i === 0 ? plural(T.primeiro, g.chaves.length, { onde }) : formatar(T.seguinte, { n: g.chaves.length, onde });
                  }),
              );
    return (
        <Envoltorio
            selo={selo || noPe}
            className={className}
            botao={
                // Por cima do link da linha (z-10): abre o slideout sem abrir o ingresso.
                <button
                    type="button"
                    aria-label={formatar(T.botaoRotulo, { chaves: texto, ingresso: tipo.nome })}
                    onClick={() => setAberto(true)}
                    className={cx(
                        "relative z-10 flex cursor-pointer items-center whitespace-nowrap outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                        noPe
                            ? "-mx-1 gap-1.5 rounded-md px-1 py-0.5 text-sm font-semibold text-tertiary hover:text-tertiary_hover"
                            : "gap-1 rounded font-medium text-utility-blue-600 hover:text-utility-blue-700",
                    )}
                >
                    <Key01 className={cx("size-4 shrink-0", noPe && "text-utility-blue-600")} aria-hidden="true" />
                    {plural(T.contagem, total)}
                </button>
            }
        >
            {aberto && !editando && <VerChaves tipo={tipo} resumo={texto} onEditar={setEditando} onFechar={() => setAberto(false)} />}
            {aberto && editando && (
                <SeletorDeLista
                    titulo={
                        editando === "ingresso"
                            ? formatar(T.seletorDoIngresso, { ingresso: tipo.nome })
                            : formatar(T.seletorDoLote, { lote: tipo.lotes.find((l) => l.id === editando)?.nome ?? "" })
                    }
                    descricao={editando === "ingresso" ? T.seletorDicaIngresso : T.seletorDicaLote}
                    vazio={T.seletorVazio}
                    opcoes={opcoes.map((c) => ({ id: c, rotulo: c }))}
                    selecionados={(editando === "ingresso" ? tipo.chaves : tipo.lotes.find((l) => l.id === editando)?.chaves) ?? []}
                    onFechar={() => setEditando(null)}
                    onConfirmar={(ids) => {
                        void onSalvar(editando, ids);
                        setEditando(null);
                    }}
                />
            )}
        </Envoltorio>
    );
}

/**
 * Na coluna da tabela, o botão fica dentro do `dl` da linha (o cabeçalho diz "Passkey" no desktop; o rótulo
 * fica para leitor de tela). No card (ITM-152), é um selo solto, sem rótulo de coluna.
 */
function Envoltorio({ selo, className, botao, children }: { selo?: boolean; className?: string; botao: ReactNode; children: ReactNode }) {
    if (selo)
        return (
            <span className={cx("inline-flex", className)}>
                {botao}
                {children}
            </span>
        );
    return (
        <div className={cx("flex flex-col", className)}>
            <dt className="text-tertiary @min-[58rem]:sr-only">{T.coluna}</dt>
            <dd>{botao}</dd>
            {children}
        </div>
    );
}

function VerChaves({ tipo, resumo, onEditar, onFechar }: { tipo: TipoIngresso; resumo: string; onEditar: (lugar: LugarDaChave) => void; onFechar: () => void }) {
    const { plural, numero } = useTextosItens();
    const [busca, setBusca] = useState("");
    const termo = paraBusca(busca.trim());
    const grupos = useMemo(() => gruposDe(tipo, T.todoIngresso), [tipo]);
    const semChave = useMemo(() => lugaresDe(tipo, T.todoIngresso).filter((g) => g.chaves.length === 0), [tipo]);
    const total = grupos.reduce((n, g) => n + g.chaves.length, 0);
    const filtrados = useMemo(
        () => (termo ? grupos.map((g) => ({ ...g, chaves: g.chaves.filter((c) => paraBusca(c).includes(termo)) })).filter((g) => g.chaves.length) : grupos),
        [grupos, termo],
    );

    return (
        <SlideoutMenu
            isOpen
            isDismissable
            onOpenChange={(v) => !v && onFechar()}
            // Celular: tela cheia (UI-NAV-003); z-50, acima do cabeçalho fixo do Backstage.
            className="z-50 pl-0"
            dialogClassName="gap-0"
        >
            <SlideoutMenu.Header onClose={onFechar} className="flex flex-col gap-1 pb-4">
                <h2 className="pr-8 text-lg font-semibold text-primary">{formatar(T.titulo, { ingresso: tipo.nome })}</h2>
                {/* Onde estão as chaves, em uma frase: "2 Passkeys no ingresso e 1 no 1º lote". */}
                <p className="text-sm text-secondary first-letter:uppercase">{resumo}.</p>
                <p className="text-sm text-tertiary">{T.dica}</p>
            </SlideoutMenu.Header>
            <SlideoutMenu.Content className="gap-5 border-t border-secondary pt-4 pb-4">
                {total > LIMIAR_FERRAMENTAS && (
                    <InputBase
                        size="sm"
                        icon={SearchLg}
                        aria-label={T.buscar}
                        placeholder={T.buscar}
                        value={busca}
                        onChange={(v: unknown) => setBusca(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                    />
                )}
                {filtrados.map((g) => (
                    <GrupoDaLista key={g.id} grupo={g} titulo={plural(T.grupo, g.chaves.length, { grupo: g.nome })} onEditar={() => onEditar(g.id)} />
                ))}
                {filtrados.length === 0 && <p className="text-sm text-tertiary">{T.nada}</p>}
                {/* Lugares sem Passkey, para vincular sem sair daqui. */}
                {!termo && semChave.length > 0 && (
                    <section className="flex flex-col gap-1 border-t border-secondary pt-4">
                        <h3 className="text-sm font-medium text-secondary">{T.semChave}</h3>
                        <ul className="flex flex-col">
                            {semChave.map((g) => (
                                <li key={g.id} className="flex min-h-9 items-center justify-between gap-3">
                                    <span className="text-sm text-tertiary">{g.nome}</span>
                                    <Button color="link-color" size="sm" iconLeading={Key01} aria-label={formatar(T.vincularEm, { lugar: g.nome })} onClick={() => onEditar(g.id)}>
                                        {T.vincular}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <span className="sr-only" role="status">
                    {termo ? numero(filtrados.reduce((n, g) => n + g.chaves.length, 0)) : ""}
                </span>
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button color="secondary" size="md" onClick={onFechar}>
                    {T.fechar}
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}

function GrupoDaLista({ grupo, titulo, onEditar }: { grupo: GrupoDeChaves; titulo: string; onEditar: () => void }) {
    const { visiveis, restantes, mostrarMais } = useMostrarMais(grupo.chaves, 50);
    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-secondary">{titulo}</h3>
                <Button color="link-color" size="sm" aria-label={formatar(T.editarEm, { lugar: grupo.nome })} onClick={onEditar}>
                    {T.editar}
                </Button>
            </div>
            {/* Códigos em grade que quebra linha: sem rolagem horizontal (UI-MOB-004). */}
            <ul className="flex flex-wrap gap-2">
                {visiveis.map((c) => (
                    <li key={c} className="rounded-md bg-secondary px-2 py-1 font-mono text-sm text-primary ring-1 ring-secondary ring-inset">
                        {c}
                    </li>
                ))}
            </ul>
            <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} passo={50} />
        </section>
    );
}
