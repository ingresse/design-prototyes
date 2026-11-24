import { Fragment, type ReactNode } from "react";
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
 *   De onde veio:  Vendido + Créditos − Taxas e custos − Devoluções = Líquido (somas de um lado, subtrações do outro)
 *   Até o saldo:   Líquido − Sacado − Saque agendado = Saldo total
 *                  Saldo total − Antecipável − Retido − Em processamento = Saldo disponível
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
    disponivel: "Saldo disponível",
    agendado: "Saque agendado",
    recebido: "Sacado",
};

/**
 * Padrão único para valor negativo, em todo o protótipo: sinal de menos (o `reais` já escreve "− R$")
 * e este token de cor. Vale para o que sai (taxas, devoluções, saídas do Extrato) e para saldo
 * negativo. Valor zerado fica neutro.
 */
export const COR_DO_NEGATIVO = "text-error-primary";

/** Glossário único: a definição curta de cada termo, igual em todo o protótipo. */
export const DEFINICAO: Record<Parte, string> = {
    vendido: "Total das vendas aprovadas, já com descontos. É o “Valor total c/ desconto” do relatório de vendas.",
    taxas: "Taxas e custos descontados das suas vendas.",
    creditos: "Bonificações e incentivos previstos no seu contrato.",
    ajustes: "Cancelamentos, reembolsos e contestações devolvidos aos compradores.",
    seuDinheiro: "O que é seu: vendido, mais créditos, menos taxas e devoluções.",
    processamento: "Vendas recentes, ainda em confirmação.",
    retido: "Reservado até o evento ou por segurança, com data de liberação.",
    aLiberar: "Valor com liberação futura, que você pode antecipar.",
    disponivel: "Pronto para saque.",
    agendado: "Saque solicitado, com pagamento na data marcada.",
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

/** Operador da linha de apoio: menor e mais apagado que o das contas. */
const OperadorMenor = ({ sinal }: { sinal: string }) => (
    <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center text-md font-medium text-quaternary">
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
    /** O bloco é uma subtração: valor na cor do negativo, sem sinal de menos (o operador entre os blocos já diz "menos"). Zero fica neutro. */
    sai?: boolean;
    /** "Ver detalhe" (painel lateral) ou o link do relatório de vendas, na página do evento. */
    acao?: ReactNode;
}

const Bloco = ({ parte, valor, legenda, leitura, resultado, sai, acao }: BlocoProps) => (
    <div className={cx("flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3 ring-1 ring-inset @6xl:p-4", resultado ? "bg-secondary ring-primary" : "bg-primary ring-secondary")}>
        <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
            <span>
                {leitura && <span className="sr-only">{leitura} </span>}
                {ROTULO_DA_PARTE[parte]}
            </span>
            <Dica termo={ROTULO_DA_PARTE[parte]} texto={DEFINICAO[parte]} />
        </span>
        <span className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl @6xl:text-display-xs" : "text-lg @6xl:text-xl", (sai ? valor > 0 : valor < 0) ? COR_DO_NEGATIVO : "text-primary")}>{reais(valor)}</span>
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
            <Operador sinal="+" />
            <Bloco parte="creditos" valor={totais.creditos} leitura="mais" acao={totais.creditos > 0 || creditoPendente ? verDetalhe("creditos") : undefined} />
            <Operador sinal="−" />
            <Bloco parte="taxas" valor={totais.taxas} leitura="menos" sai acao={totais.taxas > 0 ? verDetalhe("taxas") : undefined} />
            <Operador sinal="−" />
            <Bloco parte="ajustes" valor={totais.ajustes} leitura="menos" sai acao={totais.ajustes > 0 ? verDetalhe("ajustes") : undefined} />
            <Operador sinal="=" />
            <Bloco parte="seuDinheiro" valor={totais.seuDinheiro} leitura="igual a" resultado />
        </div>
    );
};

/* ---------------- onde está ---------------- */

/* Uma cor por parte, sempre a mesma na barra e na legenda. Vermelho fica só para valor negativo. */
export const COR_DA_PARTE: Record<ParteDaDistribuicao, string> = {
    processamento: "bg-utility-neutral-300",
    retido: "bg-utility-amber-500",
    aLiberar: "bg-utility-blue-500",
    disponivel: "bg-utility-green-500",
    agendado: "bg-utility-purple-500",
    recebido: "bg-utility-neutral-600",
};

/** Começa pelo que está na mão do produtor. "Sacado" vem por último e separado: já saiu, não é mais a receber. */
export const ORDEM_DAS_PARTES: ParteDaDistribuicao[] = ["disponivel", "aLiberar", "agendado", "retido", "processamento", "recebido"];
const JA_SAIU: ParteDaDistribuicao = "recebido";

/** Fatia do Líquido, com uma casa decimal: "7,7%". Abaixo de 0,1% diz "menos de 0,1%". */
const porcentagem = (valor: number, total: number) => {
    const fatia = total > 0 ? (valor / total) * 100 : 0;
    return fatia > 0 && fatia < 0.1 ? "menos de 0,1%" : `${fatia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

interface DistribuicaoProps {
    totais: Pick<Totais, ParteDaDistribuicao | "seuDinheiro">;
    /** Legenda de cada parte, só quando há dado novo (data, prazo). */
    detalhes: Partial<Record<ParteDaDistribuicao, string>>;
    /** Para onde cada bloco leva (Calendário ou Extrato). Sem destino, o bloco não tem link. */
    destinos?: Partial<Record<ParteDaDistribuicao, string>>;
}

/** O que ainda vai entrar no saldo disponível: é o "Total a liberar" do Calendário. */
const A_LIBERAR: ParteDaDistribuicao[] = ["aLiberar", "retido", "processamento"];

const SALDO_TOTAL = "Saldo total";
const DICA_DO_SALDO_TOTAL = "O que é seu e ainda não foi sacado nem agendado: o saldo disponível mais o que ainda vai liberar.";

interface PassoProps {
    rotulo: string;
    dica: string;
    valor: number;
    /** Como ler o bloco em voz alta: "menos", "igual a". */
    leitura?: string;
    resultado?: boolean;
    /** Cor do ponto, a mesma da barra. */
    cor?: string;
    legenda?: string;
    /** Do que o bloco é feito, quando soma mais de uma parte. */
    partes?: Array<{ parte: ParteDaDistribuicao; valor: number }>;
    acao?: ReactNode;
}

/** Um bloco da segunda conta (do Líquido ao Saldo disponível), com o mesmo desenho dos blocos da primeira. */
const Passo = ({ rotulo, dica, valor, leitura, resultado, cor, legenda, partes, acao }: PassoProps) => (
    <div className={cx("flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3 ring-1 ring-inset @6xl:p-4", resultado ? "bg-secondary ring-primary" : "bg-primary ring-secondary")}>
        <dt className="flex items-center gap-1.5 text-sm font-medium text-secondary">
            {cor && <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", cor)} />}
            <span>
                {leitura && <span className="sr-only">{leitura} </span>}
                {rotulo}
            </span>
            <Dica termo={rotulo} texto={dica} />
        </dt>
        <dd className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl @6xl:text-display-xs" : "text-lg @6xl:text-xl", valor < 0 ? COR_DO_NEGATIVO : "text-primary")}>{reais(valor)}</dd>
        {legenda && <dd className="text-xs text-tertiary">{legenda}</dd>}
        {partes && (
            <dd>
                <ul className="flex flex-col gap-1 border-t border-secondary pt-2">
                    {partes.map((p) => (
                        <li key={p.parte} className="flex items-center justify-between gap-2 text-xs text-tertiary">
                            <span className="flex min-w-0 items-center gap-1.5">
                                <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", COR_DA_PARTE[p.parte])} />
                                <span className="truncate">{ROTULO_DA_PARTE[p.parte]}</span>
                            </span>
                            <span className="whitespace-nowrap tabular-nums">{reais(p.valor)}</span>
                        </li>
                    ))}
                </ul>
            </dd>
        )}
        {acao && <dd className="mt-auto pt-1">{acao}</dd>}
    </div>
);

/**
 * Do Líquido ao Saldo disponível, em duas linhas:
 *   Líquido − Sacado − Saque agendado = Saldo total
 *   Saldo total − Antecipável − Retido − Em processamento = Saldo disponível   (linha de apoio)
 * A barra acima mostra as mesmas partes em proporção.
 */
export const Distribuicao = ({ totais, detalhes, destinos }: DistribuicaoProps) => {
    const aLiberar = A_LIBERAR.reduce((s, p) => s + totais[p], 0);
    // O que é do produtor e ainda não foi sacado nem agendado: o saldo disponível mais o que vai liberar.
    const saldoTotal = totais.disponivel + aLiberar;
    const ver = (rotulo: string, destino?: string) =>
        destino ? (
            <Button size="sm" color="link-gray" iconTrailing={ChevronRight} href={destino}>
                {rotulo}
            </Button>
        ) : undefined;
    return (
        <div className="flex flex-col gap-4 px-6 pb-5">
            <div className="flex flex-col gap-1 border-t border-secondary pt-4">
                <h3 className="text-sm font-semibold text-primary">Do líquido ao saldo total</h3>
                {/* Barra de proporção. Cada parte mostra, ao passar o mouse ou focar pelo teclado, o que é e
                    quanto vale. A área de toque é mais alta que a barra, para a parte fina não escapar do cursor. */}
                <div role="group" aria-label="Proporção de cada parte do líquido" className="flex w-full items-center gap-0.5">
                    {ORDEM_DAS_PARTES.filter((p) => totais[p] > 0).map((p) => (
                        <Tooltip key={p} title={tituloDeTooltip(ROTULO_DA_PARTE[p])} description={`${reais(totais[p])} · ${porcentagem(totais[p], totais.seuDinheiro)} do Líquido`} delay={0} closeDelay={0} arrow>
                            <TooltipTrigger
                                aria-label={`${ROTULO_DA_PARTE[p]}: ${reais(totais[p])}`}
                                className={cx("group flex h-6 min-w-2 cursor-default items-center rounded-full outline-focus-ring focus-visible:outline-2", p === JA_SAIU && "ml-2")}
                                style={{ flexGrow: totais[p], flexBasis: 0 }}
                            >
                                <span className={cx("h-2 w-full rounded-full transition duration-100 ease-linear group-hover:h-3 group-focus-visible:h-3", COR_DA_PARTE[p])} />
                            </TooltipTrigger>
                        </Tooltip>
                    ))}
                </div>
            </div>
            <dl className="flex items-stretch gap-2">
                <Passo rotulo={ROTULO_DA_PARTE.seuDinheiro} dica={DEFINICAO.seuDinheiro} valor={totais.seuDinheiro} legenda="O resultado da conta acima" />
                <Operador sinal="−" />
                <Passo rotulo={ROTULO_DA_PARTE.recebido} dica={DEFINICAO.recebido} valor={totais.recebido} leitura="menos" cor={COR_DA_PARTE.recebido} acao={totais.recebido > 0 ? ver("Ver saques", destinos?.recebido) : undefined} />
                <Operador sinal="−" />
                <Passo
                    rotulo={ROTULO_DA_PARTE.agendado}
                    dica={DEFINICAO.agendado}
                    valor={totais.agendado}
                    leitura="menos"
                    cor={COR_DA_PARTE.agendado}
                    legenda={detalhes.agendado}
                    acao={totais.agendado > 0 ? ver("Ver no extrato", destinos?.agendado) : undefined}
                />
                <Operador sinal="=" />
                <Passo rotulo={SALDO_TOTAL} dica={DICA_DO_SALDO_TOTAL} valor={saldoTotal} leitura="igual a" resultado legenda="Disponível e a liberar" />
            </dl>

            {/* Terceira linha, de apoio: tira do saldo total o que ainda vai liberar e chega ao Saldo disponível.
                Menos peso que as duas contas, menos o resultado, que é o número que o produtor pode sacar. */}
            <div className="flex flex-col gap-2 border-t border-secondary pt-4">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-medium text-tertiary">Do saldo total ao saldo disponível</h3>
                    {aLiberar > 0 && ver("Ver no calendário", destinos?.aLiberar)}
                </div>
                <dl className="flex items-stretch gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1">
                        <dt className="text-xs font-medium text-tertiary">{SALDO_TOTAL}</dt>
                        <dd className="text-md font-semibold whitespace-nowrap text-secondary tabular-nums">{reais(saldoTotal)}</dd>
                        <dd className="text-xs text-tertiary">O resultado da conta acima</dd>
                    </div>
                    {A_LIBERAR.map((parte) => (
                        <Fragment key={parte}>
                            <OperadorMenor sinal="−" />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1">
                                <dt className="flex items-center gap-1.5 text-xs font-medium text-tertiary">
                                    <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", COR_DA_PARTE[parte])} />
                                    <span>
                                        <span className="sr-only">menos </span>
                                        {ROTULO_DA_PARTE[parte]}
                                    </span>
                                    <Dica termo={ROTULO_DA_PARTE[parte]} texto={DEFINICAO[parte]} />
                                </dt>
                                <dd className="text-md font-semibold whitespace-nowrap text-secondary tabular-nums">{reais(totais[parte])}</dd>
                                {detalhes[parte] && <dd className="text-xs text-tertiary">{detalhes[parte]}</dd>}
                            </div>
                        </Fragment>
                    ))}
                    <OperadorMenor sinal="=" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1">
                        <dt className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                            <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", totais.disponivel < 0 ? "bg-utility-red-500" : COR_DA_PARTE.disponivel)} />
                            <span>
                                <span className="sr-only">igual a </span>
                                {ROTULO_DA_PARTE.disponivel}
                            </span>
                            <Dica termo={ROTULO_DA_PARTE.disponivel} texto={DEFINICAO.disponivel} />
                        </dt>
                        <dd className={cx("text-lg font-semibold whitespace-nowrap tabular-nums", totais.disponivel < 0 ? COR_DO_NEGATIVO : "text-primary")}>{reais(totais.disponivel)}</dd>
                        <dd className="text-xs text-tertiary">Pronto para saque</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
};
