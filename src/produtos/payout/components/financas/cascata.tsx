import type { ReactNode } from "react";
import { ChevronRight } from "@untitledui/icons";
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

/** Cartão de seção: título, selo opcional ao lado do título e ações à direita. */
export const Secao = ({ titulo, selo, lateral, children, className }: { titulo: string; selo?: ReactNode; lateral?: ReactNode; children: ReactNode; className?: string }) => (
    <section className={cx("flex flex-col rounded-2xl bg-primary ring-1 ring-secondary", className)}>
        <header className="flex min-h-18 items-center justify-between gap-6 border-b border-secondary px-6 py-4">
            <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                {selo}
            </div>
            {lateral && <div className="flex shrink-0 items-center gap-3">{lateral}</div>}
        </header>
        {children}
    </section>
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
            <span className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl min-[1400px]:text-display-xs" : "text-lg min-[1400px]:text-xl", tom === "erro" && valor !== 0 ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
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
    const classe = cx("group flex min-w-0 flex-col gap-1 rounded-xl p-3 text-left ring-1 ring-inset min-[1400px]:p-4", resultado ? "flex-[1.25] bg-secondary ring-primary" : "flex-1 bg-primary ring-secondary");
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
    <div className="flex items-stretch gap-2 p-6">
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
}

export const Distribuicao = ({ totais, detalhes }: DistribuicaoProps) => (
    <div className="flex flex-col gap-5 px-6 pb-6">
        <div className="flex flex-col gap-3 border-t border-secondary pt-5">
            <h3 className="text-sm font-semibold text-primary">Onde está seu dinheiro</h3>
            {/* Barra de proporção: decorativa, os valores estão logo abaixo. */}
            <div aria-hidden="true" className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                {ORDEM.filter((p) => totais[p] > 0).map((p) => (
                    <span key={p} className={cx("h-full min-w-1 rounded-full", COR_DA_PARTE[p])} style={{ flexGrow: totais[p], flexBasis: 0 }} />
                ))}
            </div>
        </div>
        <dl className="-mx-4 grid grid-cols-6 divide-x divide-secondary">
            {ORDEM.map((parte) => {
                const valor = totais[parte];
                const negativo = valor < 0;
                return (
                    <div key={parte} className="flex min-w-0 flex-col gap-1 px-4">
                        <dt className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-secondary">
                            <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", negativo ? "bg-utility-red-500" : COR_DA_PARTE[parte])} />
                            {ROTULO_DA_PARTE[parte]}
                        </dt>
                        <dd className={cx("text-md font-semibold whitespace-nowrap tabular-nums min-[1400px]:text-lg", negativo ? "text-error-primary" : "text-primary")}>{reais(valor)}</dd>
                        {detalhes[parte] && <dd className="text-xs text-tertiary">{detalhes[parte]}</dd>}
                    </div>
                );
            })}
        </dl>
    </div>
);
