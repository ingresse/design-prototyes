import type { ReactNode } from "react";
import { Check } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface PainelDePassosProps {
    titulo: string;
    passos: string[];
    /** Índice do passo atual (0 a passos.length - 1). */
    atual: number;
    /** Conteúdo extra da coluna dos passos, abaixo da lista, só no desktop (ex.: resumo do carrinho, itens escolhidos). */
    lateral?: ReactNode;
    /** Resumo do passo na barra fixa do celular, acima das ações (ex.: total, "3 de 10 selecionadas"). */
    resumoNoCelular?: ReactNode;
    /** Ação secundária à esquerda do rodapé (ex.: "Pular identificação"). */
    rodapeInicio?: ReactNode;
    /** Ações à direita do rodapé (Voltar e a ação principal do passo). */
    rodapeFim?: ReactNode;
    children: ReactNode;
}

/**
 * Fluxo em etapas do Backstage (BIL-80, COR-50), o mesmo na venda do balcão e na emissão de cortesia.
 *
 * - Desktop: à esquerda, o título do fluxo e a lista numerada das etapas (a concluída com ✓, a atual
 *   destacada); à direita, a linha do título com o nome da etapa (reserva o canto do sino e do Guia,
 *   BKS-92), o conteúdo e o rodapé com as ações.
 * - Celular: o título, "Etapa X de N: <nome>" e, no pé, uma barra fixa com o resumo e as ações
 *   (UI-MOB-001), em todas as etapas. A barra é `data-barra-fixa`: o Guia sai do caminho (GDC-71).
 */
export function PainelDePassos({ titulo, passos, atual, lateral, resumoNoCelular, rodapeInicio, rodapeFim, children }: PainelDePassosProps) {
    const temRodape = Boolean(rodapeInicio || rodapeFim);
    return (
        <section className="flex w-full flex-1 gap-8 max-md:flex-col max-md:gap-4 md:min-h-[560px]">
            <aside className="w-[280px] shrink-0 rounded-xl bg-secondary p-5 max-md:w-full max-md:p-4">
                {/* Título, etapas e resumo acompanham a rolagem do conteúdo. */}
                <div className="flex flex-col gap-8 max-md:gap-2 md:sticky md:top-6">
                    {/* Sem `data-linha-do-titulo`: na coluna de 280 px o título não reserva o canto do sino (BKS-92), que fica na outra coluna. */}
                    <h1 className="text-display-xs leading-tight font-bold tracking-tight text-balance text-primary">{titulo}</h1>

                    <p className="text-sm text-tertiary md:hidden">
                        Etapa {atual + 1} de {passos.length}: <span className="font-semibold text-secondary">{passos[atual]}</span>
                    </p>

                    <ol className="flex flex-col gap-1 max-md:hidden">
                        {passos.map((passo, indice) => {
                            const concluido = indice < atual;
                            const corrente = indice === atual;
                            return (
                                <li
                                    key={passo}
                                    aria-current={corrente ? "step" : undefined}
                                    className={cx(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                                        corrente && "bg-tertiary font-semibold text-primary",
                                        concluido && "font-medium text-secondary",
                                        !corrente && !concluido && "text-quaternary",
                                    )}
                                >
                                    <span className="w-3 tabular-nums">{indice + 1}</span>
                                    <span className="min-w-0 flex-1">{passo}</span>
                                    {concluido && <Check className="size-4 shrink-0 text-fg-tertiary" aria-label="concluída" />}
                                </li>
                            );
                        })}
                    </ol>

                    {lateral && <div className="flex min-h-0 flex-col max-md:hidden">{lateral}</div>}
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-6 md:pt-5">
                {/* A linha do título da coluna do conteúdo: o nome da etapa, com o canto direito livre para o sino e o Guia (BKS-92). */}
                <div data-linha-do-titulo className="flex min-h-10 items-center max-md:hidden">
                    <h2 className="text-lg font-semibold text-primary">
                        <span className="sr-only">
                            Etapa {atual + 1} de {passos.length}:{" "}
                        </span>
                        {passos[atual]}
                    </h2>
                </div>

                <div className="flex flex-1 flex-col gap-6">{children}</div>

                {temRodape && (
                    <footer
                        data-barra-fixa
                        className={cx(
                            "flex gap-3 md:flex-row md:items-center md:justify-between",
                            // Celular: barra fixa no pé, na largura toda, com o resumo em cima e as ações embaixo (UI-MOB-001).
                            "max-md:sticky max-md:bottom-0 max-md:z-20 max-md:-mx-4 max-md:flex-col max-md:border-t max-md:border-secondary max-md:bg-primary max-md:px-4 max-md:pt-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
                        )}
                    >
                        {resumoNoCelular && <div className="md:hidden">{resumoNoCelular}</div>}
                        <div className="flex gap-3 max-md:flex-col md:flex-row max-md:[&>*]:w-full empty:hidden">{rodapeInicio}</div>
                        {/* No celular, as ações dividem a linha: Voltar à esquerda, a principal à direita, com 44 px de altura. */}
                        <div className="flex items-center gap-3 max-md:[&_button]:min-h-11 max-md:[&>*]:flex-1">{rodapeFim}</div>
                    </footer>
                )}
            </div>
        </section>
    );
}
