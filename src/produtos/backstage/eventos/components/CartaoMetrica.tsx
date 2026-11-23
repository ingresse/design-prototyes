import { Fragment, useState, type FC, type PointerEvent } from "react";
import { ArrowDown, ArrowUp } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { formatar, useTextosEventos } from "../data/textos-eventos";
import type { Ritmo } from "../data/vendas";
import { Sparkline } from "./Sparkline";

interface CartaoMetricaProps {
    icon: FC<{ className?: string }>;
    label: string;
    /** Total acumulado, já formatado. */
    valor: string;
    ritmo: Ritmo;
    /** Ritmo já formatado (ex.: "R$ 7K", "27"). */
    ritmoValor: string;
    /**
     * Frase inteira do ritmo com `{valor}` no lugar do número (ex.: "{valor} por dia"), para a
     * tradução poder mover o número (UI-TXT-009). Faturamento e contagens acumulam por dia;
     * ticket médio é um valor por ingresso, e dizer "R$ 271 por dia" seria mentira.
     */
    ritmoFrase: string;
    /** Cartão "de gráfico": curva mais alta, com as datas no eixo x. */
    grafico?: boolean;
    /** Formata o valor de um dia, para o tooltip do gráfico. */
    formatarDia?: (valor: number) => string;
}

/**
 * Big number com a leitura de tendência junto.
 *
 * Tudo no cartão olha os últimos 7 dias: o total, a curva dia a dia e a
 * média por dia, comparada com os 7 dias anteriores.
 */
type Formato = (iso: string, opcoes: Intl.DateTimeFormatOptions) => string;

/** Formata uma data ISO (AAAA-MM-DD) no idioma da pessoa, ao meio-dia para o fuso não mudar o dia. */
const formatoDe =
    (locale: string): Formato =>
    (iso, opcoes) =>
        new Intl.DateTimeFormat(locale, opcoes).format(new Date(`${iso.slice(0, 10)}T12:00:00`));

/** Dia e mês curtos ("2 de nov."), para o eixo e o tooltip. */
const DIA_MES: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/**
 * As duas pontas de um período, sem repetir o que é igual: "2" e "8 de nov."; "26 de out." e
 * "1 de nov."; com ano quando atravessa a virada. Cada ponta formatada pelo idioma.
 */
const pontas = (fmt: Formato, de: string, ate: string) => {
    const mesmoAno = de.slice(0, 4) === ate.slice(0, 4);
    const mesmoMes = mesmoAno && de.slice(5, 7) === ate.slice(5, 7);
    const comAno: Intl.DateTimeFormatOptions = { ...DIA_MES, year: "numeric" };
    return {
        de: fmt(de, mesmoMes ? { day: "numeric" } : mesmoAno ? DIA_MES : comAno),
        ate: fmt(ate, mesmoAno ? DIA_MES : comAno),
    };
};

/** Põe em destaque o `{valor}` dentro de uma frase já traduzida. */
const comValor = (frase: string, valor: string) =>
    frase.split("{valor}").map((parte, i, todas) => (
        <Fragment key={i}>
            <span className="font-normal text-tertiary">{parte}</span>
            {i < todas.length - 1 && valor}
        </Fragment>
    ));

/** Início, dois pontos intermediários e fim: legível sem amontoar num cartão estreito. */
function indicesDoEixo(total: number) {
    const ultimo = total - 1;
    return [...new Set([0, Math.round(ultimo / 3), Math.round((ultimo * 2) / 3), ultimo])];
}

/** Ancora pela borda perto das extremidades para o texto não vazar do cartão. */
const ancora = (pct: number) => (pct < 12 ? "translateX(0)" : pct > 88 ? "translateX(-100%)" : "translateX(-50%)");

/** Tons de uma mesma cor, do mais forte ao mais claro, um por evento (EVT-162). */
const TONS = [1, 0.7, 0.5, 0.35, 0.25];
const tom = (cor: string, i: number) => `color-mix(in oklab, ${cor} ${Math.round((TONS[i] ?? TONS[TONS.length - 1]) * 100)}%, transparent)`;

function GraficoDiario({
    serie,
    datas,
    pilhas,
    stroke,
    formatar: formatarValor,
    fmt,
}: {
    serie: number[];
    datas: string[];
    /** Por evento: cada barra empilha os eventos em tons da mesma cor (EVT-162). Sem isso, uma barra por dia. */
    pilhas?: { id: string; nome: string; serie: number[] }[];
    stroke: string;
    formatar: (v: number) => string;
    fmt: Formato;
}) {
    // Barras (EVT-161): uma por dia, do zero até o valor. Com vários eventos, empilhadas por evento (EVT-162);
    // o dia em foco ganha uma faixa de fundo.
    const total = serie.length;
    const ultimo = total - 1;
    const [indice, setIndice] = useState(ultimo);
    // Centro da barra i, em % da largura: cada dia ocupa uma faixa igual.
    const pct = (i: number) => ((i + 0.5) / total) * 100;
    const max = Math.max(1, ...serie);
    const empilhado = !!pilhas && pilhas.length > 1;
    const camadas = empilhado ? pilhas! : [{ id: "total", nome: "", serie }];

    const aoMover = (e: PointerEvent<HTMLDivElement>) => {
        const caixa = e.currentTarget.getBoundingClientRect();
        const proporcao = Math.min(0.9999, Math.max(0, (e.clientX - caixa.left) / caixa.width));
        setIndice(Math.floor(proporcao * total));
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2" onPointerMove={aoMover} onPointerLeave={() => setIndice(ultimo)}>
                {/* Tooltip sempre visível; por padrão mostra o último dia. */}
                <div className="relative h-9">
                    <div
                        className="absolute top-0 rounded-lg bg-primary-solid px-3 py-2 text-sm whitespace-nowrap text-white shadow-lg"
                        style={{ left: `${pct(indice)}%`, transform: ancora(pct(indice)) }}
                    >
                        {/* Data e valor separados pela estrutura, não por símbolo (UI-TXT-010). */}
                        <span className="mr-2 text-white/70">{fmt(datas[indice], DIA_MES)}</span>
                        <span className="font-semibold tabular-nums">{formatarValor(serie[indice])}</span>
                    </div>
                </div>

                <div className="relative flex h-[92px] items-end gap-1.5 border-b border-secondary" aria-hidden="true">
                    {serie.map((v, i) => (
                        <span key={datas[i] ?? i} className={cx("flex h-full flex-1 flex-col-reverse rounded-t-sm", i === indice && "bg-secondary")}>
                            {camadas.map((c, k) => {
                                const valor = empilhado ? (c.serie[i] ?? 0) : v;
                                return (
                                    <span
                                        key={c.id}
                                        className={cx("w-full shrink-0", k === camadas.length - 1 && "rounded-t-sm")}
                                        style={{
                                            height: `${(valor / max) * 100}%`,
                                            minHeight: !empilhado && valor > 0 ? 3 : undefined,
                                            backgroundColor: empilhado ? tom(stroke, k) : stroke,
                                            opacity: empilhado || i === indice ? 1 : 0.4,
                                        }}
                                    />
                                );
                            })}
                        </span>
                    ))}
                </div>

                <div className="relative h-5 text-sm text-quaternary tabular-nums" aria-hidden="true">
                    {/* Mês só nas pontas ("1 de nov.", 3, 5, "7 de nov."): cabe no cartão estreito sem sobrepor. */}
                    {indicesDoEixo(serie.length).map((i) => (
                        <span key={i} className="absolute top-0 whitespace-nowrap" style={{ left: `${pct(i)}%`, transform: ancora(pct(i)) }}>
                            {fmt(datas[i], i === 0 || i === ultimo ? DIA_MES : { day: "numeric" })}
                        </span>
                    ))}
                </div>
            </div>

            {/* Legenda dos eventos, com o valor do dia em foco: a cor nunca é o único jeito de saber quem é quem. */}
            {empilhado && (
                <ul className="flex flex-col gap-1">
                    {camadas.map((c, k) => (
                        <li key={c.id} className="flex min-w-0 items-center gap-2 text-sm">
                            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tom(stroke, k) }} />
                            <span className="min-w-0 flex-1 truncate text-tertiary" title={c.nome}>
                                {c.nome}
                            </span>
                            <span className="shrink-0 font-medium text-secondary tabular-nums">{formatarValor(c.serie[indice] ?? 0)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Bloco que pulsa no esqueleto. */
const Pulso = ({ className }: { className: string }) => <span aria-hidden="true" className={cx("block animate-pulse rounded bg-secondary motion-reduce:animate-none", className)} />;

/**
 * Esqueleto do cartão de gráfico: os mesmos blocos, nas mesmas alturas (rótulo, valor e período, tooltip,
 * curva, eixo e rodapé), para a tela não pular quando os números chegam (UI-EST-007).
 */
export function EsqueletoDaMetrica() {
    return (
        <div aria-hidden="true" className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary">
            <div className="flex h-5 items-center gap-2">
                <Pulso className="size-5 rounded-full" />
                <Pulso className="h-3.5 w-32" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex h-[2.375rem] items-center">
                    <Pulso className="h-8 w-36" />
                </div>
                <div className="flex h-5 items-center">
                    <Pulso className="h-3.5 w-28" />
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="h-9" />
                <Pulso className="h-[92px] w-full rounded-lg" />
                <div className="flex h-5 items-center">
                    <Pulso className="h-3 w-full" />
                </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-secondary pt-3">
                <div className="flex h-5 items-center">
                    <Pulso className="h-3.5 w-36" />
                </div>
                <div className="flex h-5 items-center">
                    <Pulso className="h-3.5 w-48" />
                </div>
            </div>
        </div>
    );
}

export function CartaoMetrica({ icon: Icon, label, valor, ritmo, ritmoValor, ritmoFrase, grafico = false, formatarDia = String }: CartaoMetricaProps) {
    const { t, locale } = useTextosEventos();
    const fmt = formatoDe(locale);

    /* Oscilação de menos de 3% é ruído de série diária, não tendência. */
    const relevante = ritmo.variacao !== null && Math.abs(ritmo.variacao) >= 0.03;
    const subindo = (ritmo.variacao ?? 0) > 0;
    // A curva é verde e só fica vermelha quando a queda é relevante (EVT-158; decisão do Victor em 22/11/2026, que
    // desfez a EVT-143).
    const corLinha = relevante && !subindo ? "var(--color-fg-error-secondary)" : "var(--color-fg-success-secondary)";

    const { datas } = ritmo;
    const fim = datas.at(-1);
    const periodo = fim ? formatar(t.metricas.periodo, { intervalo: formatar(t.metricas.intervalo, pontas(fmt, datas[0], fim)) }) : null;
    const anteriores = ritmo.datasAnteriores;
    // "26 de out. a 1 de nov.": o período anterior entra na frase da comparação.
    const semanaAnterior = anteriores.length ? formatar(t.metricas.intervalo, pontas(fmt, anteriores[0], anteriores[anteriores.length - 1])) : null;
    const percentual = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(Math.abs(ritmo.variacao ?? 0));

    return (
        <section className={cx("flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-border-secondary")}>
            <div className="flex items-center gap-2">
                <Icon className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                <h3 className="text-sm font-medium text-tertiary">{label}</h3>
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-display-sm font-bold text-primary tabular-nums">{valor}</p>
                {periodo && <p className="text-sm text-tertiary">{periodo}</p>}
            </div>

            {grafico && ritmo.serie.length > 1 ? (
                <GraficoDiario serie={ritmo.serie} datas={ritmo.datas} pilhas={ritmo.porEvento} stroke={corLinha} formatar={formatarDia} fmt={fmt} />
            ) : (
                <Sparkline values={ritmo.serie} stroke={corLinha} />
            )}

            <div className={cx("flex flex-col gap-1 border-t border-secondary pt-3", grafico && "shrink-0")}>
                <span className="text-sm font-semibold text-primary tabular-nums">{comValor(ritmoFrase, ritmoValor)}</span>

                {/* A régua da comparação fica escrita: sem ela o % não quer dizer nada. */}
                {relevante ? (
                    <span className={cx("flex items-center gap-1 text-sm font-medium", subindo ? "text-success-primary" : "text-error-primary")}>
                        {subindo ? (
                            <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                            <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />
                        )}
                        {semanaAnterior
                            ? formatar(subindo ? t.metricas.acima : t.metricas.abaixo, { percentual, periodo: semanaAnterior })
                            : formatar(subindo ? t.metricas.acimaDaSemanaAnterior : t.metricas.abaixoDaSemanaAnterior, { percentual })}
                    </span>
                ) : (
                    <span className="text-sm text-tertiary">{semanaAnterior ? formatar(t.metricas.estavel, { periodo: semanaAnterior }) : t.metricas.estavelSemanaAnterior}</span>
                )}
            </div>
        </section>
    );
}
