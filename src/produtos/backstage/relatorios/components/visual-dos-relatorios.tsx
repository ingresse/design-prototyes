import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

/*
 * Linguagem visual dos relatórios (REL-200 a REL-205), inspirada em painéis densos e monocromáticos:
 * cartões escuros sem divisória no cabeçalho, números grandes em fonte mono com algarismos
 * tabulares, barras de pontos para proporções e grades de quadrados para composição.
 * Cores só por token do DS; a cor de série é usada só nas marcas, nunca no texto.
 */

/** Número de destaque: mono, algarismos tabulares, sem quebrar. */
export const NUMERO_DO_RELATORIO = "font-mono tabular-nums tracking-tight whitespace-nowrap text-primary";

/** Cartão de um bloco do relatório: título, subtítulo opcional e ações à direita, sem linha embaixo. */
export function PainelDoRelatorio({
    titulo,
    subtitulo,
    acoes,
    children,
    className,
}: {
    titulo: string;
    subtitulo?: string;
    acoes?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cx("flex min-w-0 flex-col overflow-clip rounded-2xl bg-primary ring-1 ring-secondary ring-inset", className)}>
            <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="text-md font-semibold text-primary">{titulo}</h3>
                    {subtitulo && <p className="text-sm text-tertiary">{subtitulo}</p>}
                </div>
                {acoes}
            </header>
            {children}
        </section>
    );
}

/**
 * Painel de métricas (REL-221): o único desenho de métrica dos relatórios. Um painel só, dividido em
 * células por linhas finas; o número manda e o rótulo explica. Até 22/11/2026 havia três desenhos
 * (este em Vendas, o `MetricsIcon03` com ícone nos outros e a faixa de Comissários).
 */
export function PainelDeMetricas({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
    return (
        <section aria-label={rotulo} className={cx("grid grid-cols-1 gap-px overflow-clip rounded-2xl bg-secondary ring-1 ring-secondary ring-inset sm:grid-cols-2 xl:grid-cols-3", className)}>
            {children}
        </section>
    );
}

/** Célula do painel de métricas: rótulo, número em mono, complemento ao lado do número e apoio embaixo (texto ou barra). */
export function MetricaDoRelatorio({
    rotulo,
    valor,
    complemento,
    apoio,
    destaque,
    children,
}: {
    rotulo: string;
    valor: string;
    /** Texto curto em mono ao lado do número (ex.: "1.045 de 2.640"). */
    complemento?: string;
    /** Linha de apoio embaixo do número. */
    apoio?: ReactNode;
    destaque?: boolean;
    children?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5 bg-primary px-5 py-5">
            <span className="text-sm text-tertiary">{rotulo}</span>
            <div className="flex min-w-0 items-baseline gap-2">
                <span className={cx(NUMERO_DO_RELATORIO, "font-semibold", destaque ? "text-display-xs" : "text-xl")}>{valor}</span>
                {complemento && <span className="truncate font-mono text-sm text-tertiary tabular-nums">{complemento}</span>}
            </div>
            {apoio && <span className="text-sm text-tertiary">{apoio}</span>}
            {children}
        </div>
    );
}

/**
 * Barra de pontos (REL-202): a proporção em pontos acesos e apagados, como num visor. O número vai ao
 * lado, em texto; a barra é só a marca.
 */
export function BarraDePontos({ valor, total, pontos = 24, className }: { valor: number; total: number; pontos?: number; className?: string }) {
    const fracao = total > 0 ? Math.min(1, Math.max(0, valor / total)) : 0;
    const acesos = Math.round(fracao * pontos);
    return (
        <div role="img" aria-label={`${Math.round(fracao * 100)}%`} className={cx("flex min-w-0 items-center gap-[3px]", className)}>
            {Array.from({ length: pontos }, (_, i) => (
                <span key={i} aria-hidden="true" className={cx("size-1.5 shrink-0 rounded-full", i < acesos ? "bg-fg-primary" : "bg-quaternary")} />
            ))}
        </div>
    );
}

export interface FatiaDaGrade {
    id: string;
    nome: string;
    valor: number;
    /** Cor da marca (token do DS). */
    cor: string;
}

/**
 * Grade de quadrados (REL-203): composição em 100 quadrados, um por ponto percentual, na ordem das
 * fatias. Substitui a pizza: dá para contar e comparar sem ler ângulos.
 */
export function GradeDeQuadrados({ fatias, colunas = 20, className }: { fatias: FatiaDaGrade[]; colunas?: number; className?: string }) {
    const total = fatias.reduce((s, f) => s + f.valor, 0) || 1;
    // Distribui os 100 quadrados pelo maior resto, para a soma fechar em 100.
    const brutos = fatias.map((f) => (f.valor / total) * 100);
    const inteiros = brutos.map(Math.floor);
    let falta = 100 - inteiros.reduce((s, n) => s + n, 0);
    brutos
        .map((b, i) => ({ i, resto: b - Math.floor(b) }))
        .sort((a, b) => b.resto - a.resto)
        .forEach(({ i }) => {
            if (falta > 0) {
                inteiros[i]++;
                falta--;
            }
        });
    const quadrados = fatias.flatMap((f, i) => Array.from({ length: inteiros[i] }, () => f));

    return (
        <div
            role="img"
            aria-label={fatias.map((f, i) => `${f.nome}: ${inteiros[i]}%`).join(", ")}
            className={cx("grid gap-[3px]", className)}
            style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}
        >
            {quadrados.map((f, i) => (
                <span key={i} aria-hidden="true" title={f.nome} className="aspect-square rounded-[3px]" style={{ background: f.cor }} />
            ))}
        </div>
    );
}
