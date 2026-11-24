import type { ReactNode } from "react";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { COR_DA_PARTE, COR_DO_NEGATIVO, NumeroGrande, Secao } from "./cascata";
import { HOJE, contaGeral, type Evento } from "./dados";
import { dataCurta, reais } from "./formato";

/*
 * Conta de relance (rodada 01 de validação com produtor, R01-01 e R01-03).
 * É a conta que o produtor faz de cabeça: "o total que eu vendi, o quanto eu já repassei, o quanto eu
 * tenho a resgatar e quando". Linha de cima: Total vendido − descontos − Total sacado − Saque agendado
 * = Saldo total. Linha de baixo: o Saldo total aberto em Saldo disponível (o maior número) e A liberar,
 * cada um com a data.
 * Termina no mesmo "Saldo total" do Resumo financeiro, para a tela não mostrar dois resultados
 * parecidos; o produtor leu esse nome sem ajuda e pediu o disponível em destaque e o total menor (E36).
 * O título usa o verbo do job dele: conferir. A legenda não fala em "Líquido", que ele lê como
 * "valor com desconto de ingresso".
 * A Visão geral e o Extrato usam este mesmo bloco, lendo de `contaGeral`: os totais são idênticos nas
 * duas abas, com e sem filtro. Não substitui o "Resumo financeiro", que abre cada parte em detalhe.
 */

const Operador = ({ sinal, leitura }: { sinal: string; leitura: string }) => (
    <>
        <span aria-hidden="true" className="flex w-4 shrink-0 items-center justify-center text-lg font-medium text-quaternary">
            {sinal}
        </span>
        <span className="sr-only">{leitura}</span>
    </>
);

const Termo = ({ rotulo, valor, apoio, resultado }: { rotulo: string; valor: number; apoio: string; resultado?: boolean }) => (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="text-sm font-medium text-tertiary">{rotulo}</dt>
        <dd className={cx("font-semibold whitespace-nowrap tabular-nums", resultado ? "text-xl text-primary" : "text-lg text-secondary")}>{reais(valor)}</dd>
        <dd className="text-xs text-tertiary">{apoio}</dd>
    </div>
);

interface ParteProps {
    rotulo: string;
    valor: number;
    quando: ReactNode;
    cor: string;
    /** O Saldo disponível: o maior número do bloco. */
    destaque?: "grande" | "medio";
    /** Ocupa duas colunas, sem o destaque. */
    largo?: boolean;
    acao?: ReactNode;
}

const Parte = ({ rotulo, valor, quando, cor, destaque, largo, acao }: ParteProps) => (
    <div className={cx("flex min-w-0 flex-col gap-1 rounded-xl p-4 ring-1 ring-inset", destaque ? "col-span-2 bg-secondary ring-primary" : "bg-primary ring-secondary", largo && "col-span-2")}>
        <dt className="flex items-center gap-2 text-sm font-medium text-secondary">
            <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", cor)} />
            {rotulo}
        </dt>
        <dd>
            {destaque === "grande" ? (
                <NumeroGrande valor={valor} className={cx("text-display-sm @6xl:text-display-md", valor < 0 ? COR_DO_NEGATIVO : "text-primary")} classeDosCentavos="text-xl" />
            ) : (
                <span className={cx("font-semibold whitespace-nowrap tabular-nums", destaque ? "text-display-xs" : "text-xl", valor < 0 ? COR_DO_NEGATIVO : "text-primary")}>{reais(valor)}</span>
            )}
        </dd>
        <dd className="text-sm text-tertiary">{quando}</dd>
        {acao && <dd className="pt-1">{acao}</dd>}
    </div>
);

interface ContaDeRelanceProps {
    eventos: Evento[];
    titulo: string;
    lateral?: ReactNode;
    /** Na Visão geral o Saldo disponível é o maior número da tela; no Extrato o bloco é de apoio. */
    variante?: "visao-geral" | "extrato";
    /** Rota de "Ver no calendário". */
    calendario: string;
}

export const ContaDeRelance = ({ eventos, titulo, lateral, variante = "visao-geral", calendario }: ContaDeRelanceProps) => {
    const c = contaGeral(eventos);
    const quando = (iso: string) => (iso === HOJE ? "hoje" : `em ${dataCurta(iso)}`);
    return (
        <Secao titulo={titulo} lateral={lateral}>
            <dl aria-label="Do total vendido ao saldo total" className="flex items-start gap-3 border-b border-secondary px-6 py-5">
                <Termo rotulo="Total vendido" valor={c.vendido} apoio="Valor total c/ desconto" />
                <Operador sinal={c.descontos < 0 ? "+" : "−"} leitura={c.descontos < 0 ? "mais" : "menos"} />
                <Termo rotulo="Taxas, devoluções e créditos" valor={Math.abs(c.descontos)} apoio="O que foi descontado e creditado" />
                <Operador sinal="−" leitura="menos" />
                <Termo rotulo="Total sacado" valor={c.sacado} apoio="Já caiu na sua conta" />
                <Operador sinal="−" leitura="menos" />
                <Termo
                    rotulo="Saque agendado"
                    valor={c.agendado}
                    apoio={c.proximoSaque ? `${c.proximoSaque.valor === c.agendado ? "Cai" : `${reais(c.proximoSaque.valor)} caem`} na conta ${quando(c.proximoSaque.data)}` : "Nenhum saque agendado"}
                />
                <Operador sinal="=" leitura="igual a" />
                <Termo rotulo="Saldo total" valor={c.saldoTotal} apoio="Saldo disponível + A liberar" resultado />
            </dl>
            <dl aria-label="O saldo total, entre o que já está disponível e o que ainda vai liberar" className="grid grid-cols-4 gap-4 px-6 py-5">
                <Parte
                    rotulo="Saldo disponível"
                    valor={c.disponivel}
                    cor={c.disponivel < 0 ? "bg-utility-red-500" : COR_DA_PARTE.disponivel}
                    destaque={variante === "visao-geral" ? "grande" : "medio"}
                    quando={c.disponivel > 0 ? "Pronto para saque" : c.disponivel < 0 ? "Negativo: sai das próximas liberações" : "Nada disponível agora"}
                />
                <Parte
                    rotulo="A liberar"
                    valor={c.aLiberar}
                    cor={COR_DA_PARTE.aLiberar}
                    largo
                    quando={c.proximaLiberacao ? `Próxima: ${reais(c.proximaLiberacao.valor)} ${quando(c.proximaLiberacao.data)}` : "Nenhuma liberação prevista"}
                    acao={
                        c.aLiberar > 0 && (
                            <Button size="sm" color="link-gray" href={calendario}>
                                Ver no calendário
                            </Button>
                        )
                    }
                />
            </dl>
        </Secao>
    );
};
