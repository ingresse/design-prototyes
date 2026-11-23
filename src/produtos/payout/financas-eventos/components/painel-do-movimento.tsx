import { toast } from "sonner";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { COR_DO_NEGATIVO } from "../../components/financas/cascata";
import { ROTULO_DO_MOVIMENTO, TAXA_DA_MODALIDADE, composicaoDoRepasse, registroDaAntecipacao, registroDoRepasse, type LinhaDoExtrato, type Prova, type Registro } from "../../components/financas/dados";
import { dataComDia, dataCurta, reais } from "../../components/financas/formato";

/*
 * Painel lateral de um movimento do Extrato (ajustes v3, seção 4.2): o que foi, de onde veio, o
 * efeito em cada parte e o link de prova. É aqui, e só aqui, que aparecem a taxa da antecipação
 * e a taxa de transferência do repasse. O repasse mostra também de onde veio o valor: os
 * movimentos do evento que formaram aquele Disponível.
 */

const PROVA: Record<Prova, { rotulo: string; aviso: string }> = {
    vendas: { rotulo: "Ver no relatório de vendas", aviso: "o relatório de vendas" },
    transacoes: { rotulo: "Ver no relatório de transações", aviso: "o relatório de transações" },
    comprovante: { rotulo: "Baixar comprovante", aviso: "o comprovante" },
    contrato: { rotulo: "Ver regra do contrato", aviso: "a regra do contrato" },
    calendario: { rotulo: "Ver no relatório de vendas", aviso: "o relatório de vendas" },
};

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-4 py-3">
        <dt className="text-sm text-tertiary">{rotulo}</dt>
        <dd className="text-right text-sm font-medium text-primary">{children}</dd>
    </div>
);

const solicitadoPor = (r: Registro) => `${r.solicitante} · ${dataCurta(r.data)} às ${r.hora}`;

export function PainelDoMovimento({ movimento, aoFechar }: { movimento: LinhaDoExtrato | null; aoFechar: () => void }) {
    if (!movimento) return null;
    const m = movimento;
    const taxaDoRepasse = m.repasse ? TAXA_DA_MODALIDADE[m.repasse.modalidade] : 0;
    // Só o repasse que saiu do Disponível tem origem a mostrar; o valor que voltou (não concluído) não.
    const origem = m.repasse && m.efeito < 0 ? composicaoDoRepasse(m.evento, m.repasse) : null;
    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(aberto) => !aberto && aoFechar()} className="z-50">
            <SlideoutMenu.Header onClose={aoFechar} className="flex flex-col gap-1 pb-5">
                <span className="self-start">
                    <Badge size="sm" type="pill-color" color="gray">
                        {ROTULO_DO_MOVIMENTO[m.tipo]}
                    </Badge>
                </span>
                <h2 className="pr-8 text-md font-semibold text-primary">{m.titulo}</h2>
                <p className={cx("text-display-xs font-semibold tabular-nums", m.efeito > 0 ? "text-success-primary" : m.valor < 0 ? COR_DO_NEGATIVO : "text-primary")}>
                    {m.valor > 0 ? "+ " : ""}
                    {reais(m.valor)}
                </p>
                <p className="text-sm text-tertiary">
                    {dataComDia(m.data)} · {m.evento.nome}
                </p>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="gap-0 border-t border-secondary pb-6">
                <section className="flex flex-col gap-1 py-4">
                    <h3 className="text-sm font-semibold text-primary">O que foi</h3>
                    <p className="text-sm text-tertiary">{m.descricao}</p>
                </section>

                <section className="flex flex-col border-t border-secondary pt-4">
                    <h3 className="text-sm font-semibold text-primary">O que mudou no seu líquido</h3>
                    <dl className="flex flex-col divide-y divide-secondary">
                        {m.partes.map((p) => (
                            <Campo key={p.parte} rotulo={p.parte}>
                                <span className={cx("tabular-nums", p.valor > 0 ? "text-success-primary" : p.valor < 0 ? COR_DO_NEGATIVO : "text-primary")}>
                                    {p.valor > 0 ? "+ " : ""}
                                    {reais(p.valor)}
                                </span>
                            </Campo>
                        ))}
                        <Campo rotulo="Saldo disponível depois deste movimento">
                            <span className={cx("tabular-nums", m.apos < 0 && COR_DO_NEGATIVO)}>{reais(m.apos)}</span>
                        </Campo>
                    </dl>
                </section>

                {m.repasse && (
                    <section className="flex flex-col border-t border-secondary pt-4">
                        <h3 className="text-sm font-semibold text-primary">Saque</h3>
                        <dl className="flex flex-col divide-y divide-secondary">
                            <Campo rotulo="Código">{registroDoRepasse(m.evento, m.repasse).codigo}</Campo>
                            <Campo rotulo="Solicitado por">{solicitadoPor(registroDoRepasse(m.evento, m.repasse))}</Campo>
                            <Campo rotulo="Conta de destino">
                                <span className="flex flex-wrap items-center justify-end gap-2">
                                    {m.repasse.conta.replace("Conta de terceiro · ", "")}
                                    {m.repasse.conta.startsWith("Conta de terceiro") && (
                                        <Badge size="sm" type="pill-color" color="warning">
                                            Conta de terceiro
                                        </Badge>
                                    )}
                                </span>
                            </Campo>
                            <Campo rotulo="Modalidade">{m.repasse.modalidade}</Campo>
                            <Campo rotulo="Valor do saque">{reais(m.repasse.valor)}</Campo>
                            <Campo rotulo="Taxa de transferência">{taxaDoRepasse ? reais(taxaDoRepasse) : "Sem taxa"}</Campo>
                            <Campo rotulo={m.situacao === "pago" ? "Valor creditado na conta" : "Valor a creditar na conta"}>{reais(m.repasse.valor - taxaDoRepasse)}</Campo>
                            {m.situacao === "agendado" && <Campo rotulo="Pagamento previsto">{dataCurta(m.repasse.data)}</Campo>}
                        </dl>
                    </section>
                )}

                {origem && (
                    <section className="flex flex-col border-t border-secondary pt-4">
                        <h3 className="text-sm font-semibold text-primary">De onde veio este valor</h3>
                        <dl className="flex flex-col divide-y divide-secondary">
                            {origem.linhas.map((l) => (
                                <Campo key={l.id} rotulo={l.data ? `${l.titulo} · ${dataCurta(l.data)}` : l.titulo}>
                                    <span className={cx("tabular-nums", l.valor < 0 && COR_DO_NEGATIVO)}>
                                        {l.valor > 0 ? "+ " : ""}
                                        {reais(l.valor)}
                                    </span>
                                </Campo>
                            ))}
                            <Campo rotulo="Valor do saque">
                                <span className="font-semibold tabular-nums">{reais(origem.total)}</span>
                            </Campo>
                        </dl>
                    </section>
                )}

                {m.antecipacao && (
                    <section className="flex flex-col border-t border-secondary pt-4">
                        <h3 className="text-sm font-semibold text-primary">Antecipação</h3>
                        <dl className="flex flex-col divide-y divide-secondary">
                            <Campo rotulo="Código">{registroDaAntecipacao(m.evento, m.antecipacao).codigo}</Campo>
                            <Campo rotulo="Solicitado por">{solicitadoPor(registroDaAntecipacao(m.evento, m.antecipacao))}</Campo>
                            <Campo rotulo="Valor antecipado">{reais(m.antecipacao.valor)}</Campo>
                            <Campo rotulo="Taxa da antecipação">{reais(m.antecipacao.taxa)}</Campo>
                            <Campo rotulo="Valor que entrou no saldo disponível">{reais(m.antecipacao.valor - m.antecipacao.taxa)}</Campo>
                        </dl>
                    </section>
                )}
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex justify-between gap-3">
                <Button size="md" color="secondary" onClick={() => toast(`Aqui abriria ${PROVA[m.prova].aviso} de ${m.evento.nome}.`)}>
                    {PROVA[m.prova].rotulo}
                </Button>
                <Button size="md" color="secondary" onClick={aoFechar}>
                    Fechar
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
