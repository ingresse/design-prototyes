import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { cx } from "@/utils/cx";
import { currencyFormatter, numberFormatter } from "../data/event";
import { NUMERO_DO_RELATORIO, PainelDoRelatorio } from "./visual-dos-relatorios";

export interface ChartPoint {
    data: string;
    quantidade: number;
    total: number;
}

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
}

type Medida = "total" | "quantidade";
const MEDIDAS: { id: Medida; rotulo: string }[] = [
    { id: "total", rotulo: "Valor" },
    { id: "quantidade", rotulo: "Ingressos" },
];

interface ChartTooltipPayloadEntry {
    value: number | string;
}

const ChartTooltip = ({ active, label, payload, medida }: { active?: boolean; label?: string; payload?: ChartTooltipPayloadEntry[]; medida: Medida }) => {
    if (!active || !payload || payload.length === 0) return null;
    const valor = Number(payload[0].value);
    return (
        <div className="rounded-lg bg-primary-solid px-3 py-2.5 shadow-xl ring-1 ring-secondary_alt">
            <p className="mb-1 text-xs text-white/70">{label}</p>
            <p className="font-mono text-sm font-semibold text-white tabular-nums">{medida === "total" ? currencyFormatter.format(valor) : `${numberFormatter.format(valor)} ingressos`}</p>
        </div>
    );
};

/* Uma série por vez: a marca é neutra, como nas referências, e acende sob o cursor. */
const COR_DA_BARRA = "var(--color-fg-quaternary)";
const COR_DA_BARRA_ATIVA = "var(--color-fg-primary)";
const FONTE_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** Eixo em moeda compacta ("R$ 800", "R$ 1,2 mil"): sem rótulos repetidos quando os valores são baixos. */
const MOEDA_COMPACTA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

/** Passo "redondo" (1, 2, 2,5, 5 × 10ⁿ) para cerca de 4 intervalos até o máximo. */
function passoRedondo(max: number, inteiro: boolean): number {
    const bruto = max / 4;
    const potencia = 10 ** Math.floor(Math.log10(bruto));
    const n = bruto / potencia;
    const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * potencia;
    return inteiro ? Math.max(1, Math.ceil(passo)) : passo;
}

/** Marcas do eixo calculadas aqui (e não pelo Recharts) para a largura do eixo caber no rótulo mais longo. */
function marcasDoEixo(max: number, inteiro: boolean): number[] {
    if (!(max > 0)) return [0];
    const passo = passoRedondo(max, inteiro);
    const n = Math.ceil(max / passo);
    return Array.from({ length: n + 1 }, (_, i) => i * passo);
}

/** Largura aproximada de um texto em fonte mono: ~0,62 em por caractere. */
const larguraMono = (texto: string, fontSize: number) => Math.ceil(texto.length * fontSize * 0.62);

/**
 * Valor ou ingressos por dia (REL-35, REL-204): um eixo só, com a troca "Valor / Ingressos" no
 * cabeçalho (antes eram dois eixos no mesmo gráfico). O total do período fica em destaque em cima.
 */
export const TransacionadoChartCard = ({
    data,
    title,
    subtitle,
    acumulado = false,
}: {
    data: ChartPoint[];
    title: string;
    subtitle: string;
    acumulado?: boolean;
}) => {
    const isMobile = useIsMobile();
    const fontSize = isMobile ? 10 : 11;
    const [medida, setMedida] = useState<Medida>("total");
    const [ativo, setAtivo] = useState<number | null>(null);

    // Variante acumulada: soma corrente de total e quantidade.
    const series = useMemo<ChartPoint[]>(() => {
        if (!acumulado) return data;
        let total = 0;
        let quantidade = 0;
        return data.map((p) => {
            total += p.total;
            quantidade += p.quantidade;
            return { data: p.data, total, quantidade };
        });
    }, [data, acumulado]);

    const formatarEixo = (v: number) => (medida === "total" ? MOEDA_COMPACTA.format(v) : numberFormatter.format(v));
    const marcas = useMemo(() => marcasDoEixo(Math.max(0, ...series.map((p) => p[medida])), medida === "quantidade"), [series, medida]);
    // O eixo tem a largura do rótulo mais longo (REL-216) ("R$ 100 mil", "R$ 3,8 mil"): nada cortado (antes, 56/44 px fixos).
    const larguraDoEixo = Math.max(...marcas.map((m) => larguraMono(formatarEixo(m), fontSize))) + 12;
    // O primeiro rótulo do eixo X fica centrado na primeira barra: a margem esquerda segura metade dele.
    const margemEsquerda = Math.ceil(larguraMono(series[0]?.data ?? "", fontSize) / 2);

    const soma = acumulado ? (series.at(-1)?.[medida] ?? 0) : data.reduce((s, p) => s + p[medida], 0);
    const formatar = (v: number) => (medida === "total" ? currencyFormatter.format(v) : numberFormatter.format(v));

    return (
        <PainelDoRelatorio
            titulo={title}
            subtitulo={subtitle}
            acoes={
                <ButtonGroup
                    size="sm"
                    aria-label="Medida do gráfico"
                    disallowEmptySelection
                    selectedKeys={[medida]}
                    onSelectionChange={(chaves) => {
                        const [primeira] = [...chaves];
                        if (primeira) setMedida(primeira as Medida);
                    }}
                >
                    {MEDIDAS.map((m) => (
                        <ButtonGroupItem key={m.id} id={m.id}>
                            {m.rotulo}
                        </ButtonGroupItem>
                    ))}
                </ButtonGroup>
            }
        >
            <div className="flex flex-col gap-0.5 px-5 pt-4">
                <span className="text-sm text-tertiary">{medida === "total" ? "Total transacionado no período" : "Ingressos vendidos no período"}</span>
                <span className={cx(NUMERO_DO_RELATORIO, "text-display-sm font-semibold")}>{formatar(soma)}</span>
            </div>

            <div className="h-[260px] w-full px-2 pt-2 pb-3 md:h-[320px] md:px-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={series}
                        margin={{ top: 16, right: 8, bottom: 0, left: margemEsquerda }}
                        onMouseMove={(e) => setAtivo(typeof e?.activeTooltipIndex === "number" ? e.activeTooltipIndex : null)}
                        onMouseLeave={() => setAtivo(null)}
                    >
                        <CartesianGrid stroke="var(--color-border-secondary)" strokeDasharray="2 4" strokeOpacity={0.6} vertical={false} />
                        <XAxis
                            dataKey="data"
                            tick={{ fill: "var(--color-text-tertiary)", fontSize, fontFamily: FONTE_MONO }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            interval={isMobile ? "preserveStartEnd" : "preserveStart"}
                            minTickGap={isMobile ? 24 : 16}
                        />
                        <YAxis
                            orientation="right"
                            tickFormatter={(v) => formatarEixo(Number(v))}
                            ticks={marcas}
                            domain={[0, marcas[marcas.length - 1] || 1]}
                            interval={0}
                            tick={{ fill: "var(--color-text-tertiary)", fontSize, fontFamily: FONTE_MONO }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={larguraDoEixo}
                        />
                        <Tooltip content={<ChartTooltip medida={medida} />} cursor={{ fill: "var(--color-bg-secondary)", radius: 4 }} />
                        <Bar dataKey={medida} name={medida === "total" ? "Valor" : "Ingressos"} radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 10 : 16} isAnimationActive={false}>
                            {series.map((p, i) => (
                                <Cell key={p.data} fill={ativo === i ? COR_DA_BARRA_ATIVA : COR_DA_BARRA} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </PainelDoRelatorio>
    );
};
