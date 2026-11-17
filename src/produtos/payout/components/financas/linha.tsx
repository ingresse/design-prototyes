import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "@/utils/cx";

/*
 * Linha de lista com data à esquerda, o que é no meio e valor à direita, com divisor entre linhas.
 * Usada no calendário, nos repasses, nas devoluções, nas próximas liberações e nos últimos movimentos.
 * Lacuna do DS: não há linha de lista com data, descrição e valor.
 */

interface LinhaProps {
    quando: ReactNode;
    titulo: ReactNode;
    detalhe?: ReactNode;
    valor?: string;
    corDoValor?: string;
    extra?: ReactNode;
    /** Linha inteira clicável: leva a esta rota. */
    para?: string;
}

export const Linha = ({ quando, titulo, detalhe, valor, corDoValor = "text-primary", extra, para }: LinhaProps) => {
    const conteudo = (
        <>
            <span className="w-36 shrink-0 text-sm font-medium whitespace-nowrap text-secondary">{quando}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-primary">{titulo}</span>
                {detalhe && <span className="text-sm text-tertiary">{detalhe}</span>}
                {extra}
            </div>
            {valor && <span className={cx("text-sm font-semibold whitespace-nowrap tabular-nums", corDoValor)}>{valor}</span>}
        </>
    );
    return (
        <li>
            {para ? (
                <Link to={para} className="flex items-baseline gap-4 px-6 py-4 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2">
                    {conteudo}
                </Link>
            ) : (
                <div className="flex items-baseline gap-4 px-6 py-4">{conteudo}</div>
            )}
        </li>
    );
};

export const Lista = ({ children }: { children: ReactNode }) => <ul className="flex flex-col divide-y divide-secondary">{children}</ul>;
export const Vazio = ({ children }: { children: ReactNode }) => <p className="px-6 py-5 text-sm text-tertiary">{children}</p>;
