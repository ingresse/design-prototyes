import { useState } from "react";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { type ContaGeral, type Extrato, type LinhaDoExtrato, type SaquesDoPeriodo } from "../../components/financas/dados";
import { dataCurta, reais } from "../../components/financas/formato";

/*
 * Exportação do Extrato (rodada 01 de validação com produtor, R01-07).
 * A produtora lança os saques no sistema dela: o arquivo precisa ter as mesmas colunas e os mesmos
 * totais da tela, e dizer para quem, quando e quanto foi pago em cada saque.
 * Antes de baixar, o painel mostra o que vai no arquivo. O Excel sai de verdade (planilha .csv que o
 * Excel abre); o PDF é simulado, como as outras ações de download do protótipo.
 */

export type FormatoDeExportacao = "excel" | "pdf";

/** As colunas da planilha, na ordem. As seis primeiras são as da tela; as três últimas valem para saques. */
export const COLUNAS_DA_EXPORTACAO = ["Data", "Movimento", "Tipo", "Evento", "Valor", "Saldo disponível após", "Pago para (conta)", "Situação do saque", "Solicitado em"];

const SITUACAO: Record<NonNullable<LinhaDoExtrato["situacao"]>, string> = { pago: "Pago", agendado: "Agendado", falhou: "Não concluído", devolvido: "Voltou ao saldo" };
export const situacaoDoSaque = (m: LinhaDoExtrato) => (m.situacao ? SITUACAO[m.situacao] : "");

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-tertiary">{rotulo}</dt>
        <dd className="text-right text-sm font-medium text-primary tabular-nums">{children}</dd>
    </div>
);

interface PainelDeExportacaoProps {
    formato: FormatoDeExportacao | null;
    x: Extrato;
    /** Os movimentos que estão na tela, com os filtros da lista. */
    linhas: LinhaDoExtrato[];
    conta: ContaGeral;
    saques: SaquesDoPeriodo;
    escopo: string;
    aoExportar: (formato: FormatoDeExportacao) => void;
    aoFechar: () => void;
}

export function PainelDeExportacao({ formato: inicial, x, linhas, conta, saques, escopo, aoExportar, aoFechar }: PainelDeExportacaoProps) {
    const [formato, setFormato] = useState<FormatoDeExportacao>(inicial ?? "excel");
    if (!inicial) return null;
    const dosSaques = linhas.filter((m) => m.tipo === "repasse" && m.repasse);
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(aberto) => !aberto && aoFechar()} className="z-50">
            <SlideoutMenu.Header onClose={aoFechar} className="flex flex-col gap-1 pb-5">
                <h2 className="pr-8 text-md font-semibold text-primary">Exportar extrato</h2>
                <p className="text-sm text-tertiary">
                    {dataCurta(x.de)} a {dataCurta(x.ate)} · {escopo} · {linhas.length === 1 ? "1 movimento" : `${linhas.length} movimentos`}
                </p>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="gap-0 border-t border-secondary pb-6">
                <section className="flex flex-col gap-2 py-4">
                    <h3 id="rotulo-formato" className="text-sm font-semibold text-primary">
                        Formato
                    </h3>
                    <ButtonGroup
                        size="sm"
                        aria-labelledby="rotulo-formato"
                        selectedKeys={new Set([formato])}
                        disallowEmptySelection
                        onSelectionChange={(chaves) => {
                            const escolhido = [...chaves][0];
                            if (escolhido) setFormato(escolhido as FormatoDeExportacao);
                        }}
                    >
                        <ButtonGroupItem id="excel">Excel</ButtonGroupItem>
                        <ButtonGroupItem id="pdf">PDF</ButtonGroupItem>
                    </ButtonGroup>
                    <p className="text-sm text-tertiary">{formato === "excel" ? "Planilha para abrir no Excel e lançar no seu sistema." : "Documento para guardar ou enviar, com o resumo no topo."}</p>
                </section>

                <section className="flex flex-col gap-2 border-t border-secondary py-4">
                    <h3 className="text-sm font-semibold text-primary">Colunas do arquivo</h3>
                    <ul className="flex flex-wrap gap-2">
                        {COLUNAS_DA_EXPORTACAO.map((c) => (
                            <li key={c}>
                                <Badge size="sm" type="modern" color="gray">
                                    {c}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                    <p className="text-sm text-tertiary">As seis primeiras são as da tela. As três últimas dizem para quem e quando cada saque foi pago.</p>
                </section>

                <section className="flex flex-col border-t border-secondary pt-4">
                    <h3 className="text-sm font-semibold text-primary">Totais que vão no arquivo</h3>
                    <dl className="flex flex-col divide-y divide-secondary">
                        <Campo rotulo={`Saldo disponível em ${dataCurta(x.de)}`}>{reais(x.saldoInicial)}</Campo>
                        <Campo rotulo="Entradas do período">{reais(x.entradas)}</Campo>
                        <Campo rotulo="Saídas do período">{reais(-x.saidas || 0)}</Campo>
                        <Campo rotulo={`Saldo disponível em ${dataCurta(x.ate)}`}>{reais(x.saldoFinal)}</Campo>
                        <Campo rotulo="Saques pagos no período">{reais(saques.pagos)}</Campo>
                        <Campo rotulo="Total vendido (até hoje)">{reais(conta.vendido)}</Campo>
                        <Campo rotulo="Total sacado (até hoje)">{reais(conta.sacado)}</Campo>
                        <Campo rotulo="A liberar (até hoje)">{reais(conta.aLiberar)}</Campo>
                    </dl>
                </section>

                <section className="flex flex-col border-t border-secondary pt-4">
                    <h3 className="text-sm font-semibold text-primary">Saques do período: para quem, quando e quanto</h3>
                    {dosSaques.length === 0 ? (
                        <p className="py-3 text-sm text-tertiary">Nenhum saque nos movimentos exportados.</p>
                    ) : (
                        <ul className="flex flex-col divide-y divide-secondary">
                            {dosSaques.map((m) => (
                                <li key={m.id} className="flex items-baseline justify-between gap-4 py-2.5">
                                    <span className="flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-primary">
                                            {dataCurta(m.data)} · {m.repasse!.conta}
                                        </span>
                                        <span className="truncate text-sm text-tertiary">
                                            {situacaoDoSaque(m)} · {m.evento.nome}
                                        </span>
                                    </span>
                                    <span className="text-sm font-semibold whitespace-nowrap text-primary tabular-nums">{reais(Math.abs(m.valor))}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex justify-end gap-3">
                <Button size="md" color="secondary" onClick={aoFechar}>
                    Cancelar
                </Button>
                <Button size="md" color="primary" onClick={() => aoExportar(formato)}>
                    {formato === "excel" ? "Exportar em Excel" : "Exportar em PDF"}
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
