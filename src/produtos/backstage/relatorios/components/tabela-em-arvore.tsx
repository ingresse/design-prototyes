import { Fragment, type ReactNode, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";
import { useSortableTable } from "../utils/useSortableTable";
import { useLinhaFilhaAnimada } from "./estado-dos-relatorios";
import { SortableHeader } from "./SortableHeader";
import { AbrirDaLinha, AlternarDaArvore, DetalhesDaLinha, linhaQueAbre, useLinhaAberta } from "./TabelaLista";

/*
 * Tabela em árvore dos relatórios (REL-185, REL-224, REL-226), a mesma do Detalhamento do borderô:
 * cabeçalho em fundo secundário, grupos que abrem pela linha e pelo botão da primeira célula, recuo
 * de 24 px por nível (16 px no celular), linhas finais em fundo suave e "Total geral" no fim. No celular só a última
 * coluna fica; a linha final abre os detalhes com todas. Os nós de topo ordenam pelo cabeçalho.
 */

export interface NoDaArvore {
    id: string;
    rotulo: string;
    /** Linha de apoio sob o rótulo (ex.: a data da sessão quando o rótulo é o nome do evento, REL-227). */
    apoio?: string;
    /** Um valor por coluna; `null` vira "-". */
    valores: (number | null)[];
    filhos?: NoDaArvore[];
}

export interface ColunaDaArvore {
    rotulo: string;
    /** Texto do valor (tabela e detalhes). */
    formatar: (valor: number) => string;
    /** Proporção em barra do DS (`ProgressBar`), com o texto ao lado. O valor vai de 0 a 100. */
    barra?: boolean;
}

const VAZIO = "-";

export function TabelaEmArvore({
    primeiraColuna,
    colunas,
    nos,
    total,
    ordenavel = true,
    larguraDaPrimeiraNoCelular = "w-[60%]",
    larguraDaPrimeira = "md:w-auto",
}: {
    primeiraColuna: string;
    colunas: ColunaDaArvore[];
    nos: NoDaArvore[];
    /** Valores da linha "Total geral"; sem ela, a tabela não tem total. */
    total?: (number | null)[];
    /** Nós de topo ordenáveis pelo cabeçalho (como no Borderô). Sem ordenação, o cabeçalho é só texto e quebra menos linha. */
    ordenavel?: boolean;
    larguraDaPrimeiraNoCelular?: string;
    /** Largura da primeira coluna no desktop (classe `md:`), para tabelas de muitas colunas não espremerem o rótulo. */
    larguraDaPrimeira?: string;
}) {
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
    const entrada = useLinhaFilhaAnimada();
    const celular = !useBreakpoint("md");
    const linha = useLinhaAberta<{ titulo: string; apoio: string; valores: (number | null)[] }>();
    const ultima = colunas.length - 1;
    // 24 px por nível (16 px no celular, para a árvore de cinco níveis do detalhamento caber em 390 px).
    const recuo = (nivel: number) => 16 + nivel * (celular ? 16 : 24);

    const acessores = useMemo(() => {
        const acc: Record<string, (n: NoDaArvore) => string | number> = { rotulo: (n) => n.rotulo };
        colunas.forEach((_, i) => {
            acc[`c${i}`] = (n) => n.valores[i] ?? -1;
        });
        return acc;
    }, [colunas]);
    const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(
        nos as unknown as Record<string, unknown>[],
        acessores as Partial<Record<string, (r: Record<string, unknown>) => string | number>>,
    );
    const ordenados = sorted as unknown as NoDaArvore[];

    const alternar = (id: string) =>
        setAbertos((antes) => {
            const proximo = new Set(antes);
            if (proximo.has(id)) proximo.delete(id);
            else proximo.add(id);
            return proximo;
        });

    const texto = (valor: number | null, i: number) => (valor === null ? VAZIO : colunas[i].formatar(valor));

    const celula = (valor: number | null, i: number, classeDoValor: string) => (
        <td key={i} className={cx("px-4 py-3.5 text-right text-sm whitespace-nowrap", i < ultima && "hidden md:table-cell", classeDoValor)}>
            {colunas[i].barra && valor !== null ? (
                <ProgressBar
                    value={Math.min(100, Math.max(0, valor))}
                    labelPosition="right"
                    valueFormatter={() => colunas[i].formatar(valor)}
                    className="min-w-12"
                />
            ) : (
                texto(valor, i)
            )}
        </td>
    );

    const linhas = (lista: NoDaArvore[], nivel: number, caminho: string[] = []): ReactNode[] =>
        lista.map((no) => {
            if (no.filhos?.length) {
                const aberto = abertos.has(no.id);
                const classeDoRotulo = nivel === 0 ? "font-bold text-primary" : "font-semibold text-secondary";
                const classeDoValor = nivel === 0 ? "font-semibold text-primary" : "font-medium text-secondary";
                return (
                    <Fragment key={no.id}>
                        {/* Linha de tabela, não botão (REL-226); as filhas entram com transição (REL-224). */}
                        <motion.tr
                            {...(nivel > 0 ? entrada : {})}
                            onClick={() => alternar(no.id)}
                            className={cx(
                                "cursor-pointer border-b border-secondary transition duration-100 ease-linear hover:bg-primary_hover",
                                nivel === 0 && "bg-primary",
                            )}
                        >
                            <td className="py-3.5 pr-4 text-sm" style={{ paddingLeft: recuo(nivel) }}>
                                <AlternarDaArvore aberto={aberto} onAlternar={() => alternar(no.id)}>
                                    <span className="flex min-w-0 flex-col">
                                        <span title={no.rotulo} className={cx("line-clamp-2 break-words", classeDoRotulo)}>
                                            {no.rotulo}
                                        </span>
                                        {no.apoio && <span className="text-sm font-normal text-tertiary tabular-nums">{no.apoio}</span>}
                                    </span>
                                </AlternarDaArvore>
                            </td>
                            {no.valores.map((v, i) => celula(v, i, classeDoValor))}
                        </motion.tr>
                        {aberto && linhas(no.filhos, nivel + 1, [...caminho, no.rotulo])}
                    </Fragment>
                );
            }
            const abrirDetalhes = () => linha.abrir({ titulo: no.rotulo, apoio: caminho.join(", "), valores: no.valores });
            return (
                <motion.tr
                    key={no.id}
                    {...(nivel > 0 ? entrada : {})}
                    {...linhaQueAbre(celular, abrirDetalhes)}
                    className={cx("border-b border-secondary", nivel > 0 ? "bg-secondary/60" : "bg-primary", celular && "hover:bg-primary_hover")}
                >
                    <td className="py-3 pr-4 text-sm text-tertiary" style={{ paddingLeft: recuo(nivel) }}>
                        <AbrirDaLinha ativa={celular} onAbrir={abrirDetalhes} className="line-clamp-2 break-words">
                            {no.rotulo}
                        </AbrirDaLinha>
                        {no.apoio && <span className="block text-sm text-tertiary tabular-nums">{no.apoio}</span>}
                    </td>
                    {no.valores.map((v, i) => celula(v, i, i === ultima ? "font-medium text-primary" : "text-tertiary"))}
                </motion.tr>
            );
        });

    return (
        <div className="overflow-x-auto overflow-y-clip">
            {/* Celular: larguras fixas (a primeira coluna e a última). Desktop: as colunas pela largura do conteúdo, com o
                cabeçalho quebrando linha, para seis colunas caberem no cartão sem rolar para o lado (REL-182). */}
            <table className="w-full table-fixed border-collapse md:table-auto">
                <colgroup>
                    <col className={cx(larguraDaPrimeiraNoCelular, larguraDaPrimeira)} />
                    {colunas.map((c, i) => (
                        <col key={c.rotulo} className={i < ultima ? "hidden md:table-column" : undefined} />
                    ))}
                </colgroup>
                <thead className="bg-secondary">
                    <tr className="border-b border-secondary text-left">
                        <th className="px-4 py-3 align-bottom text-sm font-semibold text-tertiary">
                            {ordenavel ? (
                                <SortableHeader label={primeiraColuna} sortKey="rotulo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                            ) : (
                                primeiraColuna
                            )}
                        </th>
                        {colunas.map((c, i) => (
                            <th
                                key={c.rotulo}
                                className={cx("px-4 py-3 text-right align-bottom text-sm font-semibold text-tertiary", i < ultima && "hidden md:table-cell")}
                            >
                                {ordenavel ? (
                                    <SortableHeader label={c.rotulo} align="right" sortKey={`c${i}`} activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                                ) : (
                                    c.rotulo
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {linhas(ordenados, 0)}
                    {total && (
                        <tr className="border-t-2 border-secondary bg-secondary">
                            <td className="px-4 py-3.5 text-sm font-bold text-primary">Total geral</td>
                            {total.map((v, i) => (
                                <td
                                    key={i}
                                    className={cx(
                                        "px-4 py-3.5 text-right text-sm font-bold whitespace-nowrap text-primary",
                                        i < ultima && "hidden md:table-cell",
                                    )}
                                >
                                    {texto(v, i)}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
            {linha.aberta && (
                <DetalhesDaLinha
                    titulo={linha.aberta.titulo}
                    subtitulo={linha.aberta.apoio || undefined}
                    grupos={[{ campos: colunas.map((c, i) => ({ rotulo: c.rotulo, valor: texto(linha.aberta!.valores[i] ?? null, i) })) }]}
                    onFechar={linha.fechar}
                />
            )}
        </div>
    );
}
