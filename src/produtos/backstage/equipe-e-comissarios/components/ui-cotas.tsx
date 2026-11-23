/* ------------------------------------------------------------------ */
/*  Peças compartilhadas pelas telas da Equipe de operação.            */
/*                                                                     */
/*  Tudo composto do DS e no tema do Backstage (EO3-01): sem tema,     */
/*  cor ou fonte próprios, sem forçar o tema escuro.                   */
/* ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { Calendar } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";

/** Contêiner das telas do fluxo. Antes aplicava tema próprio; hoje só organiza o conteúdo. */
export const TemaCotas = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cx("flex min-w-0 flex-1 flex-col", className)}>{children}</div>
);

/* O cabeçalho das telas é o `CabecalhoDaPagina` do Backstage (BKS-100); o antigo `CabecalhoCotas` saiu. */

/* --------------------------- Barra de uso ------------------------------ */

/** Uso da cota: a barra de progresso do DS. */
export const BarraUso = ({ usadas, total, className }: { usadas: number; total: number; className?: string }) => (
    <ProgressBarBase value={total > 0 ? Math.min(usadas, total) : 0} max={Math.max(total, 1)} className={className} />
);

/* ------------------------------ Seções --------------------------------- */

/** Título de seção (Text lg Semibold) com apoio em Text sm tertiary (UI-VIS-018). */
export const TituloSecao = ({ children, apoio }: { children: ReactNode; apoio?: string }) => (
    <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold text-primary">{children}</h2>
        {apoio && <p className="text-sm text-tertiary">{apoio}</p>}
    </div>
);

/** Bloco de uma sessão do evento, com a data no topo. Sem rótulo (produtos) fica sem cabeçalho. */
export const CardSessao = ({ rotulo, children }: { rotulo?: string; children: ReactNode; fundo?: "escuro" | "medio" }) => (
    <section className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary ring-inset">
        {rotulo && (
            <header className="flex items-center gap-3 border-b border-secondary px-4 py-3">
                <Calendar className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-primary">{rotulo}</h3>
            </header>
        )}
        <div className="flex flex-col gap-1 p-4">{children}</div>
    </section>
);

/** Tipo do item (Ingresso, Produto, Combo): o Badge do DS. */
export const BadgeTipo = ({ children }: { children: ReactNode }) => (
    <Badge size="sm" type="pill-color" color="gray" className="shrink-0">
        {children}
    </Badge>
);

/** Grupo desativado: o Badge do DS, no lugar da opacidade (UI-A11Y-001). */
export const BadgeInativo = () => <BadgeTipo>Inativo</BadgeTipo>;
