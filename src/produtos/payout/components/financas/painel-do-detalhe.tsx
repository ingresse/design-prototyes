import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { ROTULO_DA_PARTE, type ParteComDetalhe } from "./cascata";
import { composicaoDasTaxas, totalizar, type Evento, type Lancamento } from "./dados";
import { dataCurta, dataDoEvento, reais } from "./formato";

/*
 * Painel lateral com o que compõe Taxas e custos, Créditos ou Ajustes. Vale para um evento (a
 * lista tem um evento só) ou para a organização inteira (lançamentos agrupados por evento).
 * A lista termina com o total, que repete o número do bloco: o detalhe fecha com a conta.
 */

const APOIO: Record<ParteComDetalhe, string> = {
    taxas: "Cobradas sobre o Vendido.",
    creditos: "Bonificações combinadas em contrato.",
    ajustes: "O que mudou depois do fechamento do evento.",
};

const LinhaDeValor = ({ titulo, detalhe, valor, tom }: { titulo: string; detalhe?: string; valor: number; tom?: "erro" }) => (
    <li className="flex items-baseline justify-between gap-4 py-4">
        <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-primary">{titulo}</span>
            {detalhe && <span className="text-sm text-tertiary">{detalhe}</span>}
        </div>
        <span className={cx("shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums", tom === "erro" ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
    </li>
);

interface PainelDoDetalheProps {
    parte: ParteComDetalhe | null;
    /** Um evento (página do evento) ou todos (topo de Finanças). */
    eventos: Evento[];
    aoFechar: () => void;
}

export function PainelDoDetalhe({ parte, eventos, aoFechar }: PainelDoDetalheProps) {
    if (!parte) return null;
    const totais = totalizar(eventos);
    const valor = totais[parte];
    const umEvento = eventos.length === 1;
    const lancamentos = (e: Evento): Lancamento[] => (parte === "creditos" ? e.creditosLista : e.ajustesLista);
    const comLancamentos = eventos.filter((e) => parte !== "taxas" && lancamentos(e).length > 0);
    const tom = parte === "ajustes" ? ("erro" as const) : undefined;

    return (
        <SlideoutMenu isOpen isDismissable onOpenChange={(aberto) => !aberto && aoFechar()} className="z-50">
            <SlideoutMenu.Header onClose={aoFechar} className="flex flex-col gap-1 pb-5">
                <h2 className="pr-8 text-sm font-medium text-secondary">{ROTULO_DA_PARTE[parte]}</h2>
                <p className={cx("text-display-xs font-semibold tabular-nums", tom === "erro" && valor ? "text-error-primary" : "text-primary")}>{reais(valor)}</p>
                <p className="text-sm text-tertiary">
                    {umEvento ? eventos[0].nome : "Todos os eventos"} · {APOIO[parte]}
                </p>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="gap-0 border-t border-secondary pb-6">
                {parte === "taxas" ? (
                    <ul className="flex flex-col divide-y divide-secondary">
                        {composicaoDasTaxas(totais).map((t) => (
                            <LinhaDeValor key={t.titulo} titulo={t.titulo} detalhe={t.detalhe} valor={t.valor} />
                        ))}
                    </ul>
                ) : umEvento ? (
                    <ul className="flex flex-col divide-y divide-secondary">
                        {lancamentos(eventos[0]).map((l) => (
                            <LinhaDeValor key={l.titulo} titulo={l.titulo} detalhe={`${dataCurta(l.data)} · ${l.motivo}`} valor={l.valor} tom={tom} />
                        ))}
                    </ul>
                ) : (
                    <ul className="flex flex-col divide-y divide-secondary">
                        {comLancamentos.map((e) => (
                            <li key={e.id} className="flex flex-col pt-4">
                                <span className="text-sm font-semibold text-primary">{e.nome}</span>
                                <span className="text-xs text-tertiary">{dataDoEvento(e.data)}</span>
                                <ul className="flex flex-col">
                                    {lancamentos(e).map((l) => (
                                        <LinhaDeValor key={l.titulo} titulo={l.titulo} detalhe={`${dataCurta(l.data)} · ${l.motivo}`} valor={l.valor} tom={tom} />
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-primary py-4">
                    <span className="text-sm font-semibold text-primary">Total</span>
                    <span className={cx("text-md font-semibold whitespace-nowrap tabular-nums", tom === "erro" && valor ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
                </div>
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="flex justify-end">
                <Button size="md" color="secondary" onClick={aoFechar}>
                    Fechar
                </Button>
            </SlideoutMenu.Footer>
        </SlideoutMenu>
    );
}
