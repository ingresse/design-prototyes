import type { ReactNode } from "react";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import type { Servico } from "../data/servicos";
import { SeloServico } from "./selo-servico";

/**
 * Marca da oferta: selo do serviço (logo, ícone ou selo provisório) com nome e categoria.
 * Com `marca` (Uber), a linha diz o que se compra e traz o selo do desconto, sem repetir o parceiro.
 * `acao` entra alinhada à direita da linha. `semSelo` esconde o selo do desconto (ex.: no resumo do
 * checkout, que já mostra a linha do desconto).
 */
export function MarcaServico({ servico, acao, semSelo = false }: { servico: Servico; acao?: ReactNode; semSelo?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <SeloServico servico={servico} tamanho="md" />
            {servico.marca ? (
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-primary">{servico.marca.nome}</span>
                    {servico.marca.selo && !semSelo && (
                        <Badge color="success" type="pill-color" size="md">
                            {servico.marca.selo}
                        </Badge>
                    )}
                </div>
            ) : (
                <div className="flex flex-col">
                    <span className="text-lg font-semibold text-primary">{servico.parceiro}</span>
                    <span className="text-sm text-tertiary">{servico.categoria}</span>
                </div>
            )}
            {/* Ação discreta à direita (ex.: compartilhar a oferta) */}
            {acao && <div className="ml-auto shrink-0">{acao}</div>}
        </div>
    );
}

/** Título com o benefício principal, legenda opcional e vantagens (a marca fica em MarcaServico). */
export function ApresentacaoServico({ servico }: { servico: Servico }) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-primary sm:text-display-xs lg:text-display-sm">
                    {servico.titulo}
                    {(servico.chamada || servico.destaque) && (
                        <span className="block">
                            {servico.chamada} {servico.destaque && <span className="whitespace-nowrap text-brand-secondary">{servico.destaque}</span>}
                        </span>
                    )}
                </h2>
                {/* Legenda só quando acrescenta informação (Uber: onde compra e que não precisa de ingresso) */}
                {servico.legenda && <p className="text-md text-tertiary lg:text-lg">{servico.legenda}</p>}
            </div>

            <ul className="flex flex-col gap-3">
                {servico.beneficios.map(({ icone: Icone, texto }, i) => {
                    // O primeiro benefício (o desconto) em destaque: texto mais forte e ícone na cor da marca
                    const principal = servico.beneficioPrincipal && i === 0;
                    return (
                        <li key={texto} className="flex items-center gap-3">
                            <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-lg", principal ? "bg-brand-primary" : "bg-secondary")}>
                                <Icone className={cx("size-5", principal ? "text-fg-brand-primary" : "text-fg-primary")} aria-hidden="true" />
                            </span>
                            <span className={cx("text-md", principal ? "font-semibold text-primary" : "font-medium text-tertiary")}>{texto}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
