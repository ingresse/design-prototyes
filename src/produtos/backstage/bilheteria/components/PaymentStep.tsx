import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import * as RadioGroups from "@/components/base/radio-groups/radio-groups";
import { Surgir } from "@/components/foundations/transicao";
import { AlertTriangle, ChevronDown, Coins01, Link01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { motion, useReducedMotion } from "motion/react";
import { formatBRL, type Buyer } from "../data/catalogo";
import { cartCount, cartLines, cartTotal, type Cart, type CartLine } from "../data/carrinho";
import { BuyerIdentity, BuyerNoAccount } from "./BuyerStep";
import { ComboComposition } from "./ItemsStep";
import { QuantityStepper } from "./QuantityStepper";

/**
 * Dois caminhos, não três: ou o comprador paga pelo checkout, ou não paga nada
 * aqui — e aí tanto faz se ele já pagou por fora ou se a emissão é sem custo,
 * porque o sistema faz a mesma coisa. A diferença vive no repasse, não na tela.
 */
export type PaymentMethod = "link" | "saldo";

/** Taxa de serviço aplicada sobre o subtotal. */
const SERVICE_FEE_RATE = 0.1;

interface PaymentStepProps {
    cart: Cart;
    buyer: Buyer | null;
    /** E-mail informado quando a conta não foi encontrada. */
    fallbackEmail?: string;
    /** Meio de pagamento escolhido — o estado vive na página, porque o botão de concluir fica no header no desktop. */
    method: PaymentMethod | null;
    onMethodChange: (method: PaymentMethod) => void;
    /** Conclui a venda com o meio de pagamento escolhido. */
    onSelectMethod: (method: PaymentMethod) => void;
    /** Com "Vender ingresso" no rodapé do painel de passos (BIL-80), o passo não mostra o botão. */
    semAcao?: boolean;
    onQuantityChange: (id: string, quantity: number) => void;
    /** Identificação pulada — link de pagamento indisponível. */
    linkBlocked: boolean;
    /** Taxa de serviço do evento (`Evento.taxaServico`), a mesma que a venda grava; sem ela, a opção não mostra valor. */
    taxa?: number;
}

/** Passo 3 — escolha do meio de pagamento e conferência do pedido. */
export function PaymentStep({
    cart,
    buyer,
    fallbackEmail,
    method,
    onMethodChange,
    onSelectMethod,
    semAcao = false,
    onQuantityChange,
    linkBlocked,
    taxa,
}: PaymentStepProps) {
    const lines = cartLines(cart);
    const subtotal = cartTotal(cart);
    const fee = subtotal * (taxa ?? SERVICE_FEE_RATE);
    // O que a produtora paga no "só a taxa": a taxa de serviço do evento sobre os itens, como a venda grava (BIL-92).
    const taxaDaProdutora = taxa === undefined ? null : Math.round(subtotal * taxa * 100) / 100;
    const count = cartCount(cart);

    return (
        <div className="flex w-full max-w-[800px] flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-xl bg-primary p-4 ring-1 ring-border-secondary md:p-5">
                <h2 className="text-sm font-medium text-secondary">Escolha como vai ser pago</h2>

                {/* Os dois meios são o grupo de rádio com ícone do DS (`radio-groups`): título, o que acontece e a escolha no cartão inteiro. */}
                <RadioGroups.IconSimple
                    aria-label="Meio de pagamento"
                    value={method}
                    onChange={(value) => onMethodChange(value as PaymentMethod)}
                    items={[
                        {
                            value: "link",
                            title: "Link de pagamento",
                            secondaryTitle: "",
                            icon: Link01,
                            disabled: linkBlocked,
                            description: linkBlocked
                                ? "Indisponível: sem identificação do comprador não há e-mail para onde enviar o link e os ingressos."
                                : `O comprador paga ${formatBRL(subtotal + fee)} pelo link.`,
                        },
                        {
                            value: "saldo",
                            title: "Cobrar só a taxa da bilheteria do produtor",
                            secondaryTitle: "",
                            icon: Coins01,
                            description:
                                taxaDaProdutora === null
                                    ? "O comprador não paga nada e os ingressos saem emitidos na hora. A produtora paga a taxa da bilheteria no fechamento."
                                    : `O comprador não paga nada e os ingressos saem emitidos na hora. A produtora paga ${formatBRL(taxaDaProdutora)} de taxa da bilheteria no fechamento.`,
                        },
                    ]}
                />
                {/*
                  O que interessa ao fechamento é verdadeiro e precisa estar escrito, mas não a cada
                  venda: fica recolhido, para o operador novo e para quando a dúvida aparecer.
                */}
                <ComoFunciona />

                {/* No desktop o aviso e a ação dividem a última linha do container. */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Sem cobrança do comprador o pedido já nasce pago: o aviso só cabe no link. */}
                    {method === "link" ? (
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-secondary" aria-hidden="true" />
                            <p className="text-sm font-medium text-secondary">O pedido será criado antes do pagamento</p>
                        </div>
                    ) : (
                        <span />
                    )}

                    {!semAcao && (
                        <Button
                            size="md"
                            color="primary"
                            isDisabled={!method}
                            onClick={() => method && onSelectMethod(method)}
                            className="w-full shrink-0 md:w-auto"
                        >
                            {method === "link" ? "Gerar link de pagamento" : "Emitir ingressos"}
                        </Button>
                    )}
                </div>
            </section>

            <section className="flex flex-col rounded-xl bg-primary ring-1 ring-border-secondary">
                <div className="flex flex-col gap-3 border-t border-secondary px-4 py-4 md:px-5">
                    {buyer ? (
                        <BuyerIdentity buyer={buyer} />
                    ) : fallbackEmail ? (
                        <BuyerNoAccount email={fallbackEmail} />
                    ) : (
                        <p className="text-sm text-tertiary">Venda sem identificação do comprador.</p>
                    )}

                    {fallbackEmail && (
                        <p className="text-sm text-tertiary">
                            Os ingressos vão para <strong className="font-semibold text-secondary">{fallbackEmail}</strong>. Peça que o
                            comprador crie uma conta Ingresse com esse mesmo e-mail para acessá-los na carteira.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-secondary px-4 pt-4 md:px-5">
                    <p className="text-sm text-tertiary">Itens</p>
                    <Badge size="md" type="modern" color="gray">
                        {count} {count === 1 ? "item" : "itens"}
                    </Badge>
                </div>

                <div className="flex flex-col gap-3 px-4 py-4 md:px-5">
                    {lines.map((line) => (
                        <ItemRow key={line.id} line={line} onQuantityChange={onQuantityChange} />
                    ))}
                </div>
            </section>
        </div>
    );
}

/** Linha do resumo. Combos trazem o próprio expander "Detalhes" com a composição. */
const ItemRow = ({ line, onQuantityChange }: { line: CartLine; onQuantityChange: (id: string, quantity: number) => void }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="flex flex-col rounded-lg bg-secondary">
            <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col">
                    <p className="text-sm font-semibold text-primary">{line.name}</p>
                    {line.meta && <p className="text-sm text-tertiary">{line.meta}</p>}
                    {line.date && <p className="text-sm text-quaternary">{line.date}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-semibold text-primary">{formatBRL(line.unitPrice)}</p>
                    <QuantityStepper label={line.name} value={line.quantity} onChange={(quantity) => onQuantityChange(line.id, quantity)} />
                </div>
            </div>

            {line.composicao && (
                <>
                    <Surgir visivel={showDetails}>
                        <div className="px-3 pb-3">
                            <ComboComposition entries={line.composicao} />
                        </div>
                    </Surgir>
                    <button
                        type="button"
                        onClick={() => setShowDetails((open) => !open)}
                        aria-expanded={showDetails}
                        aria-label={`Detalhes de ${line.name}`}
                        className="flex min-h-11 items-center justify-between gap-2 border-t border-secondary px-3 py-2.5 text-sm text-tertiary transition duration-100 ease-linear hover:text-secondary_hover"
                    >
                        Detalhes
                        <Seta aberta={showDetails} className="size-5" />
                    </button>
                </>
            )}
        </div>
    );
};

/**
 * O que o produtor paga no fechamento — a resposta que a apresentação do MVP
 * pediu por escrito, sem custar atenção nas 200 vendas seguintes.
 */
const ComoFunciona = () => {
    const [aberto, setAberto] = useState(false);

    return (
        <div className="flex flex-col">
            <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setAberto((open) => !open)}
                className="flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-tertiary transition duration-100 ease-linear hover:text-secondary_hover"
            >
                Como isso aparece no fechamento?
                <Seta aberta={aberto} className="size-4" />
            </button>

            <Surgir visivel={aberto}>
                <p className="pb-1 text-sm text-tertiary">
                    No fechamento, o produtor paga só a taxa da bilheteria. O valor do ingresso não é descontado do repasse. Use também
                    quando ele já recebeu por fora, em Pix, dinheiro ou maquininha própria.
                </p>
            </Surgir>
        </div>
    );
};

/** Seta de abrir e fechar: gira em 200 ms; com movimento reduzido, troca na hora. */
const Seta = ({ aberta, className }: { aberta: boolean; className?: string }) => {
    const reduzir = useReducedMotion();
    return (
        <motion.span animate={{ rotate: aberta ? 180 : 0 }} transition={reduzir ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }} className="flex">
            <ChevronDown className={className} aria-hidden="true" />
        </motion.span>
    );
};
