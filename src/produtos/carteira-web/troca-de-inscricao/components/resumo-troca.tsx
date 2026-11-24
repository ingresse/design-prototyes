import type { ReactNode } from "react";
import { Ticket01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { TAXA, r2, type Lote, type Valores } from "../data/troca-store";
import { brlc } from "./carteira-ui";


/** Valores da troca na carteira, com os mesmos rótulos do Backstage e do e-mail. */
export function ResumoTroca({ pago, taxa, lote, f }: { pago: number; taxa: number; lote: Lote; f: Valores }) {
    const linhas: [string, string][] = [
        ["Valor já pago", `${brlc(pago)} e taxa de ${brlc(taxa)}`],
        [`Nova inscrição, ${lote.nome}`, `${brlc(lote.valor)} e taxa de ${brlc(r2(lote.valor * TAXA))}`],
        ["Diferença da inscrição", brlc(f.dif)],
        ["Diferença da taxa de serviço", brlc(f.dt)],
    ];
    return (
        <div className="flex flex-col">
            {[...linhas, ["Total a pagar", brlc(f.total)] as [string, string]].map(([a, b], i) => {
                const total = i === linhas.length;
                return (
                    <div key={a} className={cx("flex items-baseline justify-between gap-4 py-1.5 text-sm", total ? "mt-1 border-t border-secondary pt-3 text-md font-semibold text-primary" : "text-tertiary")}>
                        <span>{a}</span>
                        <span className={cx("text-right", !total && "text-secondary")}>{b}</span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Cartão "Resumo da troca" no modelo do Resumo da compra do AWA: a inscrição escolhida, o crédito da
 * inscrição atual, as diferenças e o total com a ação principal. O mesmo cartão aparece na escolha e
 * nas perguntas, para a pessoa não perder de vista quanto vai pagar.
 */
export function CartaoResumoTroca({
    pago,
    nomeDestino,
    lote,
    f,
    onRemover,
    acao,
    nota,
    rodape,
}: {
    pago: number;
    nomeDestino: string;
    lote: Lote;
    f: Valores;
    onRemover?: () => void;
    acao?: ReactNode;
    nota?: string;
    rodape?: ReactNode;
}) {
    return (
        <section id="resumo-troca" className="overflow-hidden rounded-2xl border border-secondary bg-primary">
            <p className="border-b border-secondary px-4 py-4 text-sm font-semibold">Resumo da troca</p>
            <div className="flex flex-col gap-3 border-b border-secondary px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                    Inscrições
                    <span className="h-px flex-1 border-t border-dashed border-secondary" aria-hidden="true" />
                    {onRemover && (
                        <button type="button" className="font-normal text-secondary underline" onClick={onRemover}>
                            Remover
                        </button>
                    )}
                </div>
                <div className="flex items-start gap-3">
                    <span className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-secondary px-2 text-sm font-semibold">
                        1 <Ticket01 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold">{nomeDestino}</span>
                        <span className="text-sm text-tertiary">{lote.nome}</span>
                    </span>
                    <span className="text-sm font-semibold">{brlc(lote.valor)}</span>
                </div>
            </div>
            <div className="flex flex-col gap-2 border-b border-secondary px-4 py-4 text-sm">
                <LinhaValor a="Valor da compra inicial" b={brlc(pago)} />
                <LinhaValor a="Crédito de troca" b={`- ${brlc(pago)}`} credito />
                <LinhaValor a="Diferença da inscrição" b={brlc(f.dif)} />
                <LinhaValor a="Diferença da taxa de serviço" b={brlc(f.dt)} />
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
                <span className="flex-1 text-lg font-bold">{brlc(f.total)}</span>
                {acao}
            </div>
            {nota && <p className="-mt-2 px-4 pb-4 text-xs text-tertiary">{nota}</p>}
            {rodape}
        </section>
    );
}

const LinhaValor = ({ a, b, credito }: { a: string; b: string; credito?: boolean }) => (
    <div className={cx("flex items-baseline justify-between gap-4", credito ? "text-success-primary" : "text-secondary")}>
        <span>{a}</span>
        <span className="text-right">{b}</span>
    </div>
);
