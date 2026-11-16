import type { ReactNode } from "react";
import { ChevronRight } from "@untitledui/icons";
import { TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { Totais } from "./dados";
import { reais, reaisComCentavos } from "./formato";

/*
 * A conta que fecha: Vendido − Taxas e custos + Créditos − Ajustes = Seu dinheiro, e logo abaixo
 * onde está "Seu dinheiro", parte por parte. A mesma conta, com os mesmos nomes e a mesma ordem,
 * no total da organização (topo de Finanças) e em cada evento.
 */

export type ParteDaCascata = "vendido" | "taxas" | "creditos" | "ajustes" | "seuDinheiro";
export type ParteDaDistribuicao = "processamento" | "retido" | "aLiberar" | "disponivel" | "agendado" | "recebido";
export type Parte = ParteDaCascata | ParteDaDistribuicao;
/** Partes da cascata que abrem o painel com a composição. */
export type ParteComDetalhe = "taxas" | "creditos" | "ajustes";

export const ROTULO_DA_PARTE: Record<Parte, string> = {
    vendido: "Vendido",
    taxas: "Taxas e custos",
    creditos: "Créditos",
    ajustes: "Ajustes",
    seuDinheiro: "Seu dinheiro",
    processamento: "Em processamento",
    retido: "Retido",
    aLiberar: "A liberar",
    disponivel: "Disponível agora",
    agendado: "Agendado",
    recebido: "Já recebido",
};

/** Número de destaque do topo: centavos menores, para o olho parar no valor inteiro. */
export const NumeroGrande = ({ valor, className, classeDosCentavos = "text-sm" }: { valor: number; className?: string; classeDosCentavos?: string }) => {
    const { principal, centavos } = reaisComCentavos(valor);
    return (
        <span className={cx("font-semibold whitespace-nowrap tabular-nums", className)}>
            {principal}
            <span className={classeDosCentavos}>{centavos}</span>
        </span>
    );
};

/**
 * Cartão de seção: `TableCard` do DS (título, selo ao lado do título e ações à direita).
 * `semCabecalho`: o título fica só para leitor de tela (topo de Finanças, onde a conta abre a página).
 * É um contêiner (`@container`): o que está dentro se ajusta à largura do cartão, não à da janela.
 */
export const Secao = ({ titulo, semCabecalho, selo, lateral, children, className }: { titulo: string; semCabecalho?: boolean; selo?: ReactNode; lateral?: ReactNode; children: ReactNode; className?: string }) => (
    <TableCard.Root role="region" aria-label={titulo} className={cx("@container", className)}>
        {!semCabecalho && <TableCard.Header title={titulo} badge={selo} contentTrailing={lateral} className="md:items-center" />}
        {children}
    </TableCard.Root>
);

/* ---------------- cascata ---------------- */

const Operador = ({ sinal }: { sinal: string }) => (
    <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center text-xl font-medium text-quaternary">
        {sinal}
    </span>
);

interface BlocoProps {
    parte: ParteDaCascata;
    valor: number;
    /** Só quando traz um dado novo: o rótulo já explica o bloco. */
    legenda?: string;
    /** Como ler o bloco em voz alta: "menos", "mais", "igual a". */
    leitura?: string;
    resultado?: boolean;
    tom?: "erro";
    /** Bloco clicável: abre a composição no painel lateral. */
    aoAbrir?: () => void;
    /** Ação própria dentro do bloco (o link do Vendido). */
    acao?: ReactNode;
}

const Bloco = ({ parte, valor, legenda, leitura, resultado, tom, aoAbrir, acao }: BlocoProps) => {
    const conteudo = (
        <>
            <span className="text-sm font-medium text-secondary">
                {leitura && <span className="sr-only">{leitura} </span>}
                {ROTULO_DA_PARTE[parte]}
            </span>
            <span className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl @6xl:text-display-xs" : "text-lg @6xl:text-xl", tom === "erro" && valor !== 0 ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
            {legenda && <span className="text-xs text-tertiary">{legenda}</span>}
            {aoAbrir && (
                <span className="mt-auto flex items-center gap-1 pt-1 text-sm font-semibold whitespace-nowrap text-tertiary transition duration-100 ease-linear group-hover:text-tertiary_hover">
                    Ver detalhe
                    <ChevronRight className="size-4" aria-hidden="true" />
                </span>
            )}
            {acao && <span className="mt-auto pt-1">{acao}</span>}
        </>
    );
    const classe = cx("group flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3 text-left ring-1 ring-inset @6xl:p-4", resultado ? "bg-secondary ring-primary" : "bg-primary ring-secondary");
    if (!aoAbrir) return <div className={classe}>{conteudo}</div>;
    return (
        <button
            type="button"
            onClick={aoAbrir}
            aria-label={`${ROTULO_DA_PARTE[parte]}: ${reais(valor)}. Ver detalhe`}
            className={cx(classe, "cursor-pointer outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2")}
        >
            {conteudo}
        </button>
    );
};

interface CascataProps {
    totais: Pick<Totais, ParteDaCascata>;
    /** Abre a composição de Taxas e custos, Créditos ou Ajustes. */
    aoAbrir: (parte: ParteComDetalhe) => void;
    aoVerRelatorio: () => void;
}

export const Cascata = ({ totais, aoAbrir, aoVerRelatorio }: CascataProps) => (
    <div className="flex items-stretch gap-2 px-6 py-5">
        <Bloco
            parte="vendido"
            valor={totais.vendido}
            acao={
                <Button size="sm" color="link-gray" className="text-left whitespace-normal" onClick={aoVerRelatorio}>
                    Ver no relatório de vendas
                </Button>
            }
        />
        <Operador sinal="−" />
        <Bloco parte="taxas" valor={totais.taxas} leitura="menos" aoAbrir={() => aoAbrir("taxas")} />
        <Operador sinal="+" />
        <Bloco parte="creditos" valor={totais.creditos} leitura="mais" legenda="Bonificações do contrato" aoAbrir={totais.creditos ? () => aoAbrir("creditos") : undefined} />
        <Operador sinal="−" />
        <Bloco parte="ajustes" valor={totais.ajustes} leitura="menos" tom="erro" legenda="Depois do fechamento" aoAbrir={totais.ajustes ? () => aoAbrir("ajustes") : undefined} />
        <Operador sinal="=" />
        <Bloco parte="seuDinheiro" valor={totais.seuDinheiro} leitura="igual a" resultado />
    </div>
);

/* ---------------- onde está "Seu dinheiro" ---------------- */

/* Uma cor por estado, sempre a mesma na barra e na legenda. Vermelho fica só para valor negativo. */
const COR_DA_PARTE: Record<ParteDaDistribuicao, string> = {
    processamento: "bg-utility-neutral-300",
    retido: "bg-utility-amber-500",
    aLiberar: "bg-utility-blue-500",
    disponivel: "bg-utility-green-500",
    agendado: "bg-utility-purple-500",
    recebido: "bg-utility-neutral-600",
};

const ORDEM: ParteDaDistribuicao[] = ["processamento", "retido", "aLiberar", "disponivel", "agendado", "recebido"];

interface DistribuicaoProps {
    totais: Pick<Totais, ParteDaDistribuicao | "seuDinheiro">;
    /** Legenda de cada parte, só quando há dado novo (data, prazo). */
    detalhes: Partial<Record<ParteDaDistribuicao, string>>;
    /**
     * Topo de Finanças: Disponível agora, A liberar e Já recebido viram os números de destaque
     * (os únicos com centavos) dentro da própria soma, em vez de se repetirem em cartões à parte.
     */
    destaque?: { aoAntecipar: () => void; bloqueado?: boolean };
}

const DESTAQUES: ParteDaDistribuicao[] = ["disponivel", "aLiberar", "recebido"];

const Rotulo = ({ parte, negativo }: { parte: ParteDaDistribuicao; negativo: boolean }) => (
    <dt className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-secondary">
        <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", negativo ? "bg-utility-red-500" : COR_DA_PARTE[parte])} />
        {ROTULO_DA_PARTE[parte]}
    </dt>
);

export const Distribuicao = ({ totais, detalhes, destaque }: DistribuicaoProps) => {
    const menores = destaque ? ORDEM.filter((p) => !DESTAQUES.includes(p)) : ORDEM;
    return (
        <div className="flex flex-col gap-4 px-6 pb-5">
            <div className="flex flex-col gap-3 border-t border-secondary pt-4">
                <h3 className="text-sm font-semibold text-primary">Onde está seu dinheiro</h3>
                {/* Barra de proporção: decorativa, os valores estão logo abaixo. */}
                <div aria-hidden="true" className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                    {ORDEM.filter((p) => totais[p] > 0).map((p) => (
                        <span key={p} className={cx("h-full min-w-1 rounded-full", COR_DA_PARTE[p])} style={{ flexGrow: totais[p], flexBasis: 0 }} />
                    ))}
                </div>
            </div>
            <dl className="flex flex-col gap-4">
                {destaque && (
                    <div className="-mx-4 grid grid-cols-3 divide-x divide-secondary">
                        {DESTAQUES.map((parte) => {
                            const valor = totais[parte];
                            const cor = valor < 0 ? "text-error-primary" : parte === "disponivel" ? "text-success-primary" : parte === "aLiberar" ? "text-utility-blue-500" : "text-primary";
                            return (
                                <div key={parte} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <Rotulo parte={parte} negativo={valor < 0} />
                                        <dd>
                                            <NumeroGrande valor={valor} className={cx(parte === "disponivel" ? "text-display-xs @6xl:text-display-sm" : "text-xl @6xl:text-display-xs", cor)} classeDosCentavos="text-md" />
                                        </dd>
                                        {detalhes[parte] && <dd className="text-xs text-tertiary">{detalhes[parte]}</dd>}
                                    </div>
                                    {parte === "aLiberar" && valor > 0 && (
                                        <dd className="shrink-0">
                                            <Button size="sm" color="secondary" isDisabled={destaque.bloqueado} onClick={destaque.aoAntecipar}>
                                                Antecipar
                                            </Button>
                                        </dd>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className={cx("-mx-4 grid divide-x divide-secondary", destaque ? "grid-cols-3 border-t border-secondary pt-4" : "grid-cols-6")}>
                    {menores.map((parte) => {
                        const valor = totais[parte];
                        const classeDoValor = cx("font-semibold whitespace-nowrap tabular-nums", valor < 0 ? "text-error-primary" : "text-primary");
                        return destaque ? (
                            // No topo, as três partes menores ficam em uma linha cada: rótulo e valor lado a lado.
                            <div key={parte} className="flex min-w-0 flex-col gap-0.5 px-4">
                                <div className="flex items-baseline justify-between gap-3">
                                    <Rotulo parte={parte} negativo={valor < 0} />
                                    <dd className={cx("text-md", classeDoValor)}>{reais(valor)}</dd>
                                </div>
                                {detalhes[parte] && <dd className="text-right text-xs text-tertiary">{detalhes[parte]}</dd>}
                            </div>
                        ) : (
                            <div key={parte} className="flex min-w-0 flex-col gap-1 px-4">
                                <Rotulo parte={parte} negativo={valor < 0} />
                                <dd className={cx("text-md @6xl:text-lg", classeDoValor)}>{reais(valor)}</dd>
                                {detalhes[parte] && <dd className="text-xs text-tertiary">{detalhes[parte]}</dd>}
                            </div>
                        );
                    })}
                </div>
            </dl>
        </div>
    );
};
