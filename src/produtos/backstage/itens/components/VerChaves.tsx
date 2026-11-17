import { useMemo, useState } from "react";
import { Key01, SearchLg } from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import type { TipoIngresso } from "@/plataforma";
import { cx } from "@/utils/cx";
import { formatar, useTextosItens } from "../data/textos-itens";
import { BotaoMostrarMais, LIMIAR_FERRAMENTAS, paraBusca, useMostrarMais } from "./escala";

/* ------------------------------------------------------------------ */
/*  Passkeys de um ingresso, para consultar na lista           */
/*                                                                     */
/*  Só leitura: as chaves do ingresso inteiro e as de cada lote, com   */
/*  busca e "Mostrar mais" acima do limiar (UI-LST-001). Editar é no   */
/*  detalhe do ingresso.                                               */
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
    editar: "Editar no ingresso",
    fechar: "Fechar",
};

interface GrupoDeChaves {
    id: string;
    nome: string;
    chaves: string[];
}

const gruposDe = (tipo: TipoIngresso, todoIngresso: string): GrupoDeChaves[] =>
    [
        { id: "ingresso", nome: todoIngresso, chaves: tipo.chaves ?? [] },
        ...tipo.lotes.map((l) => ({ id: l.id, nome: l.nome, chaves: l.chaves ?? [] })),
    ].filter((g) => g.chaves.length > 0);

/** Total de chaves distintas do ingresso, somando as do ingresso e as dos lotes. */
export const totalDeChaves = (tipo: TipoIngresso) => new Set([...(tipo.chaves ?? []), ...tipo.lotes.flatMap((l) => l.chaves ?? [])]).size;

/** Até três lugares (ingresso e lotes) o detalhe vai na linha; acima disso, só o total. */
const MAX_TRECHOS = 3;

/** Coluna "Passkey" da linha do ingresso (dentro do `dl`): ícone e "N Passkeys" em azul; abre o slideout com o detalhe. Some sem chaves. */
export function BotaoChaves({ tipo, onEditar, className }: { tipo: TipoIngresso; onEditar: () => void; className?: string }) {
    const { plural, locale } = useTextosItens();
    const [aberto, setAberto] = useState(false);
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
        <div className={cx("flex flex-col", className)}>
            {/* No desktop o cabeçalho da tabela diz "Passkey"; o rótulo fica só para leitor de tela. */}
            <dt className="text-tertiary md:sr-only">{T.coluna}</dt>
            <dd>
                {/* Por cima do link da linha (z-10): abre o slideout sem abrir o ingresso. */}
                <button
                    type="button"
                    aria-label={formatar(T.botaoRotulo, { chaves: texto, ingresso: tipo.nome })}
                    onClick={() => setAberto(true)}
                    className="relative z-10 flex cursor-pointer items-center gap-1 rounded font-medium whitespace-nowrap text-utility-blue-600 outline-focus-ring transition duration-100 ease-linear hover:text-utility-blue-700 focus-visible:outline-2"
                >
                    <Key01 className="size-4 shrink-0" aria-hidden="true" />
                    {plural(T.contagem, total)}
                </button>
            </dd>
            {aberto && <VerChaves tipo={tipo} resumo={texto} onEditar={onEditar} onFechar={() => setAberto(false)} />}
        </div>
    );
}

function VerChaves({ tipo, resumo, onEditar, onFechar }: { tipo: TipoIngresso; resumo: string; onEditar: () => void; onFechar: () => void }) {
    const { plural, numero } = useTextosItens();
    const [busca, setBusca] = useState("");
    const termo = paraBusca(busca.trim());
    const grupos = useMemo(() => gruposDe(tipo, T.todoIngresso), [tipo]);
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
                    <GrupoDaLista key={g.id} grupo={g} titulo={plural(T.grupo, g.chaves.length, { grupo: g.nome })} />
                ))}
                {filtrados.length === 0 && <p className="text-sm text-tertiary">{T.nada}</p>}
                <span className="sr-only" role="status">
                    {termo ? numero(filtrados.reduce((n, g) => n + g.chaves.length, 0)) : ""}
                </span>
            </SlideoutMenu.Content>
            <SlideoutMenu.Footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button color="secondary" size="md" onClick={onFechar}>
                    {T.fechar}
                </Button>
                <Button color="primary" size="md" onClick={onEditar}>
                    {T.editar}
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}

function GrupoDaLista({ grupo, titulo }: { grupo: GrupoDeChaves; titulo: string }) {
    const { visiveis, restantes, mostrarMais } = useMostrarMais(grupo.chaves, 50);
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-secondary">{titulo}</h3>
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
