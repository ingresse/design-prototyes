import type { ReactNode } from "react";
import { ChevronRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { Totais } from "./dados";
import { reais, reaisComCentavos } from "./formato";

/*
 * Cascata que fecha: Vendido − Taxas e custos + Créditos − Ajustes = Seu dinheiro, e a
 * distribuição de "Seu dinheiro" logo abaixo. Usada no total da organização e em cada evento,
 * com os mesmos nomes e a mesma ordem.
 */

export type ParteDaCascata = "vendido" | "taxas" | "creditos" | "ajustes" | "seuDinheiro";
export type ParteDaDistribuicao = "processamento" | "retido" | "aLiberar" | "disponivel" | "agendado" | "recebido";
export type Parte = ParteDaCascata | ParteDaDistribuicao;

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

/** Número grande do topo: centavos menores, para o olho parar no valor inteiro. */
export const NumeroGrande = ({ valor, className, classeDosCentavos = "text-sm" }: { valor: number; className?: string; classeDosCentavos?: string }) => {
    const { principal, centavos } = reaisComCentavos(valor);
    return (
        <span className={cx("font-semibold whitespace-nowrap tabular-nums", className)}>
            {principal}
            <span className={classeDosCentavos}>{centavos}</span>
        </span>
    );
};

/** Cartão de seção com cabeçalho de margens iguais em cima e embaixo (briefing, seção 6). */
export const Secao = ({ titulo, descricao, lateral, children, className }: { titulo: string; descricao?: ReactNode; lateral?: ReactNode; children: ReactNode; className?: string }) => (
    <section className={cx("flex flex-col rounded-2xl bg-primary ring-1 ring-secondary", className)}>
        <header className="flex items-center justify-between gap-6 border-b border-secondary px-6 py-5">
            <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                {descricao && <p className="text-sm text-tertiary">{descricao}</p>}
            </div>
            {lateral && <div className="shrink-0">{lateral}</div>}
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
    nota: string;
    /** Como ler o bloco em voz alta: "menos", "mais", "igual a". */
    leitura?: string;
    resultado?: boolean;
    tom?: "erro";
    aoAbrir?: (parte: ParteDaCascata) => void;
}

const Bloco = ({ parte, valor, nota, leitura, resultado, tom, aoAbrir }: BlocoProps) => {
    const conteudo = (
        <>
            <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-secondary">
                    {leitura && <span className="sr-only">{leitura} </span>}
                    {ROTULO_DA_PARTE[parte]}
                </span>
                {aoAbrir && <ChevronRight className="size-4 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:text-fg-secondary" aria-hidden="true" />}
            </span>
            <NumeroGrande
                valor={valor}
                className={cx(resultado ? "text-xl min-[1400px]:text-display-xs" : "text-lg min-[1400px]:text-xl", tom === "erro" && valor !== 0 ? "text-error-primary" : "text-primary")}
            />
            <span className="text-xs text-tertiary">{nota}</span>
        </>
    );
    const classe = cx(
        "group flex min-w-0 flex-col gap-1 rounded-xl p-4 text-left ring-1 ring-inset",
        resultado ? "flex-[1.25] bg-secondary ring-primary" : "flex-1 bg-primary ring-secondary",
    );
    if (!aoAbrir) return <div className={classe}>{conteudo}</div>;
    return (
        <button
            type="button"
            onClick={() => aoAbrir(parte)}
            aria-label={`${ROTULO_DA_PARTE[parte]}: ${reais(valor)}. Ver o que compõe`}
            className={cx(classe, "cursor-pointer outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2", resultado && "hover:bg-secondary_hover")}
        >
            {conteudo}
        </button>
    );
};

interface CascataProps {
    totais: Pick<Totais, ParteDaCascata>;
    /** "em todos os eventos" ou "neste evento". */
    escopo: string;
    aoAbrir?: (parte: ParteDaCascata) => void;
}

export const Cascata = ({ totais, escopo, aoAbrir }: CascataProps) => (
    <div className="flex items-stretch gap-2 p-6">
        <Bloco parte="vendido" valor={totais.vendido} nota="Mesmo valor do seu relatório de vendas." aoAbrir={aoAbrir} />
        <Operador sinal="−" />
        <Bloco parte="taxas" valor={totais.taxas} leitura="menos" nota="Separadas do valor do ingresso." aoAbrir={aoAbrir} />
        <Operador sinal="+" />
        <Bloco parte="creditos" valor={totais.creditos} leitura="mais" nota="Valores somados pela Ingresse." aoAbrir={aoAbrir} />
        <Operador sinal="−" />
        <Bloco parte="ajustes" valor={totais.ajustes} leitura="menos" tom="erro" nota="O que mudou depois do fechamento." aoAbrir={aoAbrir} />
        <Operador sinal="=" />
        <Bloco parte="seuDinheiro" valor={totais.seuDinheiro} leitura="igual a" resultado nota={`Tudo o que é seu ${escopo}.`} aoAbrir={aoAbrir} />
    </div>
);

/* ---------------- distribuição de "Seu dinheiro" ---------------- */

/* Cor só com significado: verde para disponível, azul para a liberar, vermelho para negativo.
   O resto fica em tons neutros. */
const COR_DA_PARTE: Record<ParteDaDistribuicao, string> = {
    processamento: "bg-utility-neutral-400",
    retido: "bg-utility-neutral-500",
    aLiberar: "bg-utility-blue-500",
    disponivel: "bg-utility-green-500",
    agendado: "bg-utility-neutral-300",
    recebido: "bg-utility-neutral-600",
};

const ORDEM: ParteDaDistribuicao[] = ["processamento", "retido", "aLiberar", "disponivel", "agendado", "recebido"];

interface DistribuicaoProps {
    totais: Pick<Totais, ParteDaDistribuicao | "seuDinheiro">;
    /** Uma linha por parte: quando entra, quando libera, quando cai. */
    detalhes: Partial<Record<ParteDaDistribuicao, string>>;
    aoAbrir?: (parte: ParteDaDistribuicao) => void;
    aoSolicitar?: () => void;
    aoAntecipar?: () => void;
    /** Repasses pausados (cenário bloqueado): a ação aparece desligada. */
    repasseBloqueado?: boolean;
}

export const Distribuicao = ({ totais, detalhes, aoAbrir, aoSolicitar, aoAntecipar, repasseBloqueado }: DistribuicaoProps) => {
    const somaPositiva = ORDEM.reduce((s, p) => s + Math.max(totais[p], 0), 0);
    return (
        <div className="flex flex-col gap-5 px-6 pb-6">
            <div className="flex flex-col gap-2 border-t border-secondary pt-5">
                <p className="text-sm text-tertiary">
                    <span className="font-semibold text-secondary">{reais(totais.seuDinheiro)}</span> de Seu dinheiro, parte por parte. As seis partes somam esse valor.
                </p>
                {/* Barra de proporção: decorativa, os valores estão logo abaixo. */}
                <div aria-hidden="true" className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                    {somaPositiva > 0 &&
                        ORDEM.filter((p) => totais[p] > 0).map((p) => <span key={p} className={cx("h-full min-w-1 rounded-full", COR_DA_PARTE[p])} style={{ flexGrow: totais[p], flexBasis: 0 }} />)}
                </div>
            </div>
            <div className="-mx-4 grid grid-cols-6 divide-x divide-secondary">
                {ORDEM.map((parte) => {
                    const valor = totais[parte];
                    const negativo = valor < 0;
                    const cor = negativo ? "text-error-primary" : parte === "disponivel" ? "text-success-primary" : parte === "aLiberar" ? "text-utility-blue-500" : "text-primary";
                    const resumo = (
                        <>
                            <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                                <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", negativo ? "bg-utility-red-500" : COR_DA_PARTE[parte])} />
                                {ROTULO_DA_PARTE[parte]}
                            </span>
                            <span className={cx("text-lg font-semibold whitespace-nowrap tabular-nums", cor)}>{reais(valor)}</span>
                            <span className="text-xs text-tertiary">{detalhes[parte] ?? " "}</span>
                        </>
                    );
                    return (
                        <div key={parte} className="flex min-w-0 flex-col gap-3 px-4">
                            {aoAbrir ? (
                                <button
                                    type="button"
                                    onClick={() => aoAbrir(parte)}
                                    aria-label={`${ROTULO_DA_PARTE[parte]}: ${reais(valor)}. Ver o que compõe`}
                                    className="-m-2 flex cursor-pointer flex-col gap-1 rounded-lg p-2 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    {resumo}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-1">{resumo}</div>
                            )}
                            {parte === "disponivel" && aoSolicitar && (
                                <Button size="sm" color="secondary" className="self-start" isDisabled={valor <= 0 || repasseBloqueado} onClick={aoSolicitar}>
                                    Solicitar repasse
                                </Button>
                            )}
                            {parte === "aLiberar" && aoAntecipar && valor > 0 && (
                                <Button size="sm" color="secondary" className="self-start" isDisabled={repasseBloqueado} onClick={aoAntecipar}>
                                    Antecipar
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
