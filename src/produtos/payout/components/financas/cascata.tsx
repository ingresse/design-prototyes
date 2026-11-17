import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "@untitledui/icons";
import { TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import type { Totais } from "./dados";
import { Dica, tituloDeTooltip } from "./dica";
import { reais, reaisComCentavos } from "./formato";

/*
 * A equação que a tela inteira conta (ajustes v3):
 *   De onde veio:  Vendido − Taxas e custos + Créditos − Devoluções = Líquido
 *   Onde está:     Líquido = Em processamento + Retido + Antecipável + Disponível + Agendado + Repassado
 * A mesma conta, com os mesmos nomes e a mesma ordem, na organização e em cada evento.
 * Os nomes internos (ajustes, seuDinheiro, aLiberar, recebido) vêm da v2; o que o produtor lê está
 * em ROTULO_DA_PARTE.
 */

export type ParteDaCascata = "vendido" | "taxas" | "creditos" | "ajustes" | "seuDinheiro";
export type ParteDaDistribuicao = "processamento" | "retido" | "aLiberar" | "disponivel" | "agendado" | "recebido";
export type Parte = ParteDaCascata | ParteDaDistribuicao;
/** Partes da cascata que abrem o painel com a composição. */
export type ParteComDetalhe = "vendido" | "taxas" | "creditos" | "ajustes";
export const PARTES_COM_DETALHE: ParteComDetalhe[] = ["vendido", "taxas", "creditos", "ajustes"];

export const ROTULO_DA_PARTE: Record<Parte, string> = {
    vendido: "Vendido",
    taxas: "Taxas e custos",
    creditos: "Créditos",
    ajustes: "Devoluções",
    seuDinheiro: "Líquido",
    processamento: "Em processamento",
    retido: "Retido",
    aLiberar: "Antecipável",
    disponivel: "Disponível",
    agendado: "Agendado",
    recebido: "Repassado",
};

/** Glossário único: a definição curta de cada termo, igual em todo o protótipo. */
export const DEFINICAO: Record<Parte, string> = {
    vendido: "Total das vendas aprovadas, já com descontos. É o “Valor total c/ desconto” do relatório de vendas.",
    taxas: "Taxas e custos descontados das suas vendas.",
    creditos: "Bonificações e incentivos previstos no seu contrato.",
    ajustes: "Cancelamentos, reembolsos e contestações devolvidos aos compradores.",
    seuDinheiro: "O que é seu: vendido, menos taxas e devoluções, mais créditos.",
    processamento: "Vendas recentes, ainda em confirmação.",
    retido: "Reservado até o evento ou por segurança, com data de liberação.",
    aLiberar: "Valor com liberação futura, que você pode antecipar.",
    disponivel: "Pronto para repasse.",
    agendado: "Repasse solicitado, com pagamento na data marcada.",
    recebido: "Já pago na sua conta bancária.",
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
 * É um contêiner (`@container`): o que está dentro se ajusta à largura do cartão, não à da janela.
 */
export const Secao = ({ titulo, selo, lateral, children, className, id }: { titulo: string; selo?: ReactNode; lateral?: ReactNode; children: ReactNode; className?: string; id?: string }) => (
    <TableCard.Root id={id} role="region" aria-label={titulo} className={cx("@container scroll-mt-16", className)}>
        <TableCard.Header title={titulo} badge={selo} contentTrailing={lateral} className="md:items-center" />
        {children}
    </TableCard.Root>
);

/* ---------------- de onde veio ---------------- */

const Operador = ({ sinal }: { sinal: string }) => (
    <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center text-xl font-medium text-quaternary">
        {sinal}
    </span>
);

interface BlocoProps {
    parte: ParteDaCascata;
    valor: number;
    /** Só quando traz um dado novo: o rótulo já diz o que é o bloco. */
    legenda?: string;
    /** Como ler o bloco em voz alta: "menos", "mais", "igual a". */
    leitura?: string;
    resultado?: boolean;
    tom?: "erro";
    /** "Ver detalhe" (painel lateral) ou o link do relatório de vendas, na página do evento. */
    acao?: ReactNode;
}

const Bloco = ({ parte, valor, legenda, leitura, resultado, tom, acao }: BlocoProps) => (
    <div className={cx("flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3 ring-1 ring-inset @6xl:p-4", resultado ? "bg-secondary ring-primary" : "bg-primary ring-secondary")}>
        <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
            <span>
                {leitura && <span className="sr-only">{leitura} </span>}
                {ROTULO_DA_PARTE[parte]}
            </span>
            <Dica termo={ROTULO_DA_PARTE[parte]} texto={DEFINICAO[parte]} />
        </span>
        <span className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl @6xl:text-display-xs" : "text-lg @6xl:text-xl", tom === "erro" && valor !== 0 ? "text-error-primary" : "text-primary")}>{reais(valor)}</span>
        {legenda && <span className="text-xs text-tertiary">{legenda}</span>}
        {acao && <span className="mt-auto pt-1">{acao}</span>}
    </div>
);

interface CascataProps {
    totais: Pick<Totais, ParteDaCascata>;
    /** Abre a composição de Vendido (só na organização), Taxas e custos, Créditos ou Devoluções. */
    aoAbrir: (parte: ParteComDetalhe) => void;
    /** Página do evento: o Vendido leva direto ao relatório de vendas do evento. */
    aoVerRelatorio?: () => void;
    /** Há crédito esperando nota fiscal: o bloco abre mesmo com R$ 0. */
    creditoPendente?: boolean;
}

export const Cascata = ({ totais, aoAbrir, aoVerRelatorio, creditoPendente }: CascataProps) => {
    const verDetalhe = (parte: ParteComDetalhe) => (
        <Button size="sm" color="link-gray" iconTrailing={ChevronRight} aria-label={`Ver detalhe de ${ROTULO_DA_PARTE[parte]}`} onClick={() => aoAbrir(parte)}>
            Ver detalhe
        </Button>
    );
    return (
        <div className="flex items-stretch gap-2 px-6 py-5">
            <Bloco
                parte="vendido"
                valor={totais.vendido}
                legenda={aoVerRelatorio ? "Valor total c/ desconto no relatório" : undefined}
                acao={
                    aoVerRelatorio ? (
                        <Button size="sm" color="link-gray" className="text-left whitespace-normal" onClick={aoVerRelatorio}>
                            Ver no relatório de vendas
                        </Button>
                    ) : totais.vendido > 0 ? (
                        verDetalhe("vendido")
                    ) : undefined
                }
            />
            <Operador sinal="−" />
            <Bloco parte="taxas" valor={totais.taxas} leitura="menos" acao={totais.taxas > 0 ? verDetalhe("taxas") : undefined} />
            <Operador sinal="+" />
            <Bloco parte="creditos" valor={totais.creditos} leitura="mais" acao={totais.creditos > 0 || creditoPendente ? verDetalhe("creditos") : undefined} />
            <Operador sinal="−" />
            <Bloco parte="ajustes" valor={totais.ajustes} leitura="menos" tom="erro" acao={totais.ajustes > 0 ? verDetalhe("ajustes") : undefined} />
            <Operador sinal="=" />
            <Bloco parte="seuDinheiro" valor={totais.seuDinheiro} leitura="igual a" resultado />
        </div>
    );
};

/* ---------------- onde está ---------------- */

/* Uma cor por parte, sempre a mesma na barra e na legenda. Vermelho fica só para valor negativo. */
const COR_DA_PARTE: Record<ParteDaDistribuicao, string> = {
    processamento: "bg-utility-neutral-300",
    retido: "bg-utility-amber-500",
    aLiberar: "bg-utility-blue-500",
    disponivel: "bg-utility-green-500",
    agendado: "bg-utility-purple-500",
    recebido: "bg-utility-neutral-600",
};

export const ORDEM_DAS_PARTES: ParteDaDistribuicao[] = ["processamento", "retido", "aLiberar", "disponivel", "agendado", "recebido"];

/** Fatia do Líquido, com uma casa decimal: "7,7%". Abaixo de 0,1% diz "menos de 0,1%". */
const porcentagem = (valor: number, total: number) => {
    const fatia = total > 0 ? (valor / total) * 100 : 0;
    return fatia > 0 && fatia < 0.1 ? "menos de 0,1%" : `${fatia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

interface DistribuicaoProps {
    totais: Pick<Totais, ParteDaDistribuicao | "seuDinheiro">;
    /** Legenda de cada parte, só quando há dado novo (data, prazo). */
    detalhes: Partial<Record<ParteDaDistribuicao, string>>;
    /** Para onde cada item leva (Calendário, Extrato ou lista de eventos filtrada). Sem destino, o item não é clicável. */
    destinos?: Partial<Record<ParteDaDistribuicao, string>>;
}

export const Distribuicao = ({ totais, detalhes, destinos }: DistribuicaoProps) => (
    <div className="flex flex-col gap-4 px-6 pb-5">
        <div className="flex flex-col gap-1 border-t border-secondary pt-4">
            <h3 className="text-sm font-semibold text-primary">Líquido por situação</h3>
            {/* Barra de proporção. Cada parte mostra, ao passar o mouse ou focar pelo teclado, o que é e
                quanto vale. A área de toque é mais alta que a barra, para a parte fina não escapar do cursor. */}
            <div role="group" aria-label="Proporção de cada situação no líquido" className="flex w-full items-center gap-0.5">
                {ORDEM_DAS_PARTES.filter((p) => totais[p] > 0).map((p) => (
                    <Tooltip key={p} title={tituloDeTooltip(ROTULO_DA_PARTE[p])} description={`${reais(totais[p])} · ${porcentagem(totais[p], totais.seuDinheiro)} do Líquido`} delay={0} closeDelay={0} arrow>
                        <TooltipTrigger
                            aria-label={`${ROTULO_DA_PARTE[p]}: ${reais(totais[p])}`}
                            className="group flex h-6 min-w-2 cursor-default items-center rounded-full outline-focus-ring focus-visible:outline-2"
                            style={{ flexGrow: totais[p], flexBasis: 0 }}
                        >
                            <span className={cx("h-2 w-full rounded-full transition duration-100 ease-linear group-hover:h-3 group-focus-visible:h-3", COR_DA_PARTE[p])} />
                        </TooltipTrigger>
                    </Tooltip>
                ))}
            </div>
        </div>
        {/* Legenda: serve para conferir que as seis partes somam o Líquido. Degrau menor da escala de tipo. */}
        <dl className="-mx-2 grid grid-cols-6 divide-x divide-secondary">
            {ORDEM_DAS_PARTES.map((parte) => {
                const valor = totais[parte];
                const conteudo = (
                    <>
                        <dt className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-secondary">
                            <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", valor < 0 ? "bg-utility-red-500" : COR_DA_PARTE[parte])} />
                            {ROTULO_DA_PARTE[parte]}
                        </dt>
                        <dd className={cx("text-md font-semibold whitespace-nowrap tabular-nums", valor < 0 ? "text-error-primary" : "text-primary")}>{reais(valor)}</dd>
                        {detalhes[parte] && <dd className="text-xs text-tertiary">{detalhes[parte]}</dd>}
                    </>
                );
                const destino = destinos?.[parte];
                return (
                    <div key={parte} className="min-w-0 px-2">
                        {destino ? (
                            <Link
                                to={destino}
                                title={DEFINICAO[parte]}
                                className="flex h-full flex-col gap-1 rounded-lg p-2 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                {conteudo}
                            </Link>
                        ) : (
                            <div className="flex flex-col gap-1 p-2">{conteudo}</div>
                        )}
                    </div>
                );
            })}
        </dl>
    </div>
);
