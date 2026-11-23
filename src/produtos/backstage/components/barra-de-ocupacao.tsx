import { cx } from "@/utils/cx";

export interface SegmentoDaOcupacao {
    id: string;
    rotulo: string;
    valor: number;
    /** Cor do segmento e do ponto da legenda (token do DS, `var(--color-…)`). */
    cor: string;
}

/**
 * Barra de ocupação segmentada, com a legenda (ponto, rótulo e contagem) embaixo: a peça da "Capacidade por
 * grupo" da Visão geral (EVT-92), usada também no card do ingresso (ITM-155). O que falta para a capacidade
 * fica no fundo da barra. Na legenda, só os segmentos com valor (ou todos, com `legendaComZerados`).
 */
export function BarraDeOcupacao({
    segmentos,
    capacidade,
    className,
    comLegenda = false,
    legendaComZerados = false,
}: {
    segmentos: SegmentoDaOcupacao[];
    capacidade: number;
    className?: string;
    comLegenda?: boolean;
    /** Mostra na legenda também os segmentos sem valor (ex.: "Reservados 0" no card do ingresso, ITM-155). */
    legendaComZerados?: boolean;
}) {
    const largura = (valor: number) => `${capacidade ? Math.min(100, (valor / capacidade) * 100) : 0}%`;

    return (
        <div className={cx("flex flex-col gap-1.5", className)}>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-quaternary" aria-hidden="true">
                {segmentos.map((s) => (
                    <span key={s.id} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: largura(s.valor), background: s.cor }} />
                ))}
            </div>

            {comLegenda && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {segmentos
                        .filter((s) => legendaComZerados || s.valor > 0)
                        .map((s) => (
                            <li key={s.id} className="flex items-center gap-1.5 text-sm text-tertiary">
                                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: s.cor }} />
                                {s.rotulo}
                                <span className="font-medium text-secondary tabular-nums">{s.valor.toLocaleString("pt-BR")}</span>
                            </li>
                        ))}
                </ul>
            )}
        </div>
    );
}
