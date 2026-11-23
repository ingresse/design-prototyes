import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/* ------------------------------------------------------------------ */
/*  Tabela-lista (UI-MOB-005)                                          */
/*                                                                     */
/*  No celular, a tabela vira lista: cada linha mostra o essencial     */
/*  (título, uma linha de apoio e o valor que importa) e o toque abre  */
/*  os detalhes com todas as colunas. Sem rolagem horizontal. No       */
/*  desktop, a tabela continua (a página esconde uma e mostra a outra  */
/*  com `hidden md:block` e `md:hidden`).                              */
/* ------------------------------------------------------------------ */

export interface CampoDoDetalhe {
    rotulo: string;
    valor: ReactNode;
}

export interface GrupoDoDetalhe {
    titulo?: string;
    campos: CampoDoDetalhe[];
}

/**
 * Painel lateral dos relatórios, sobre o `SlideoutMenu` do DS (REL-225): título, subtítulo, conteúdo que
 * rola e "Fechar" no rodapé. Tela cheia no celular (UI-NAV-003). Todos os detalhes dos relatórios abrem nele.
 */
export function PainelLateral({ titulo, subtitulo, children, onFechar }: { titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode; onFechar: () => void }) {
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(v) => !v && onFechar()} className="z-50 pl-0" dialogClassName="gap-0">
            <SlideoutMenu.Header onClose={onFechar} className="flex flex-col gap-1 pb-4">
                <h2 className="pr-8 text-lg font-semibold text-primary">{titulo}</h2>
                {subtitulo && <div className="text-sm text-tertiary">{subtitulo}</div>}
            </SlideoutMenu.Header>
            <SlideoutMenu.Content className="gap-0 border-t border-secondary">{children}</SlideoutMenu.Content>
            <SlideoutMenu.Footer className="flex justify-end">
                <Button color="secondary" size="md" onClick={onFechar} className="w-full sm:w-auto">
                    Fechar
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}

/** Painel com todos os campos de uma linha. */
export function DetalhesDaLinha({ titulo, subtitulo, grupos, onFechar }: { titulo: ReactNode; subtitulo?: ReactNode; grupos: GrupoDoDetalhe[]; onFechar: () => void }) {
    return (
        <PainelLateral titulo={titulo} subtitulo={subtitulo} onFechar={onFechar}>
                <div className="flex flex-col divide-y divide-secondary">
                    {grupos.map((g, i) => (
                        <section key={g.titulo ?? i} className="flex flex-col gap-3 py-5">
                            {g.titulo && <h3 className="text-md font-semibold text-primary">{g.titulo}</h3>}
                            <dl className="flex flex-col gap-3">
                                {g.campos.map((c) => (
                                    <div key={c.rotulo} className="flex flex-col gap-0.5">
                                        <dt className="text-sm text-tertiary">{c.rotulo}</dt>
                                        <dd className="text-sm font-medium break-words text-primary">{c.valor}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
        </PainelLateral>
    );
}

/**
 * Lista do celular. Cada linha é um botão: título e apoio à esquerda, destaque à direita e a seta.
 * Linha sem `onAbrir` (tudo já cabe nela) não ganha seta nem clique.
 */
export function ListaDaTabela<T>({
    itens,
    chave,
    titulo,
    apoio,
    destaque,
    inicio,
    onAbrir,
    rotulo,
    vazio,
    className,
}: {
    itens: T[];
    chave: (item: T) => string;
    titulo: (item: T) => ReactNode;
    apoio?: (item: T) => ReactNode;
    destaque?: (item: T) => ReactNode;
    /** Elemento à esquerda (avatar, cor da série). */
    inicio?: (item: T) => ReactNode;
    onAbrir?: (item: T) => void;
    /** Nome da lista para leitor de tela. */
    rotulo: string;
    vazio?: ReactNode;
    className?: string;
}) {
    if (itens.length === 0) return vazio ? <p className={cx("px-4 py-12 text-center text-sm text-tertiary md:hidden", className)}>{vazio}</p> : null;
    return (
        <ul aria-label={rotulo} className={cx("flex flex-col divide-y divide-secondary md:hidden", className)}>
            {itens.map((item) => {
                const conteudo = (
                    <>
                        {inicio?.(item)}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium text-primary">{titulo(item)}</span>
                            {apoio && <span className="truncate text-sm text-tertiary">{apoio(item)}</span>}
                        </span>
                        {destaque && <span className="flex shrink-0 flex-col items-end gap-1 text-right text-sm text-primary tabular-nums">{destaque(item)}</span>}
                        {onAbrir && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />}
                    </>
                );
                return (
                    <li key={chave(item)}>
                        {onAbrir ? (
                            <button
                                type="button"
                                onClick={() => onAbrir(item)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left outline-focus-ring transition duration-100 ease-linear -outline-offset-2 hover:bg-primary_hover focus-visible:outline-2"
                            >
                                {conteudo}
                            </button>
                        ) : (
                            <div className="flex w-full items-center gap-3 px-4 py-3">{conteudo}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** Linha aberta nos detalhes: guarda o item e fecha. */
export function useLinhaAberta<T>() {
    const [aberta, setAberta] = useState<T | null>(null);
    return { aberta, abrir: (item: T) => setAberta(item), fechar: () => setAberta(null) };
}

/**
 * Linha final de uma tabela em árvore: no celular as colunas somem, então o clique na linha abre os
 * detalhes. A linha continua linha de tabela (sem `role="button"`, REL-226); o teclado usa o botão da
 * primeira célula (`AbrirDaLinha`). No desktop (`ativa` falso), nada abre: todas as colunas estão na tela.
 */
export function linhaQueAbre(ativa: boolean, abrir: () => void) {
    if (!ativa) return {};
    return { onClick: abrir, style: { cursor: "pointer" } };
}

/** Rótulo da linha final: botão que abre os detalhes no celular (`ativa`); texto no desktop. */
export function AbrirDaLinha({ ativa, onAbrir, children, className }: { ativa: boolean; onAbrir: () => void; children: ReactNode; className?: string }) {
    if (!ativa) return <span className={className}>{children}</span>;
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onAbrir();
            }}
            className={cx("rounded-sm text-left outline-focus-ring focus-visible:outline-2", className)}
        >
            {children}
        </button>
    );
}

/**
 * Abre e fecha um grupo da árvore. Fica na primeira célula: a linha continua linha de tabela, e o
 * botão leva o `aria-expanded` (REL-226). O clique em qualquer ponto da linha também alterna.
 */
export function AlternarDaArvore({ aberto, onAlternar, children, className }: { aberto: boolean; onAlternar: () => void; children: ReactNode; className?: string }) {
    return (
        <button
            type="button"
            aria-expanded={aberto}
            onClick={(e) => {
                e.stopPropagation();
                onAlternar();
            }}
            className={cx("flex w-full min-w-0 items-center gap-2 rounded-sm text-left outline-focus-ring focus-visible:outline-2", className)}
        >
            <ChevronDown aria-hidden="true" className={cx("size-4 shrink-0 text-fg-quaternary transition-transform duration-150 motion-reduce:transition-none", aberto && "rotate-180")} />
            {children}
        </button>
    );
}
