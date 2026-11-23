import { BarraDeOcupacao } from "../../components/barra-de-ocupacao";
import { CANAL_COR, CANAL_LABEL, type Canal } from "../data/vendas";

interface OcupacaoBarProps {
    porCanal: Record<Canal, number>;
    capacidade: number;
    className?: string;
    /** Mostra a legenda com a contagem por canal. */
    withLegend?: boolean;
}

const ORDEM: Canal[] = ["ingresse", "bilheteria", "cortesia"];

/** Barra de ocupação segmentada por canal de venda (a peça comum `BarraDeOcupacao`, ITM-155). */
export function OcupacaoBar({ porCanal, capacidade, className, withLegend }: OcupacaoBarProps) {
    return (
        <BarraDeOcupacao
            className={className}
            capacidade={capacidade}
            comLegenda={withLegend}
            segmentos={ORDEM.map((canal) => ({ id: canal, rotulo: CANAL_LABEL[canal], valor: porCanal[canal], cor: CANAL_COR[canal] }))}
        />
    );
}
