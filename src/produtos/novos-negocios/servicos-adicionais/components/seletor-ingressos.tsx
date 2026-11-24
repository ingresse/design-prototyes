import { Checkbox as AriaCheckbox, CheckboxGroup as AriaCheckboxGroup, Label as AriaLabel } from "react-aria-components";
import { CheckboxBase } from "@/components/base/checkbox/checkbox";
import { cx } from "@/utils/cx";
import { brl, type Servico } from "../data/servicos";

/**
 * Proteção de compra: no lugar dos valores, a lista dos ingressos da pessoa, com caixa de seleção.
 * Nenhum vem marcado: a pessoa escolhe. Cada card mostra só o nome do ingresso, no formato da tela de ingressos
 * ("Festival Aurora | Pista | (28/11)"), e, à direita, o preço da proteção (`percentual` do valor).
 * Selecionado, o card ganha a borda vermelha da marca.
 */
export function SeletorIngressos({ servico, selecionados, onChange }: { servico: Servico; selecionados: string[]; onChange: (ids: string[]) => void }) {
    const percentual = servico.percentual ?? 0;
    return (
        <AriaCheckboxGroup value={selecionados} onChange={onChange} className="flex flex-col gap-4">
            <AriaLabel className="text-lg font-semibold text-primary">{servico.pergunta}</AriaLabel>
            <div className="flex flex-col gap-2">
                {servico.ingressos?.map((ingresso) => (
                    <AriaCheckbox
                        key={ingresso.id}
                        value={ingresso.id}
                        className={({ isSelected, isFocusVisible }) =>
                            cx(
                                "flex cursor-pointer items-start gap-3 rounded-xl bg-primary px-4 py-3.5 outline-focus-ring transition duration-100 ease-linear ring-inset",
                                // Selecionado: borda vermelha da marca, como os valores das outras ofertas
                                isSelected ? "ring-2 ring-fg-brand-primary" : "ring-1 ring-secondary hover:bg-primary_hover",
                                isFocusVisible && "outline-2 outline-offset-2",
                            )
                        }
                    >
                        {({ isSelected, isFocusVisible }) => (
                            <>
                                {/* Caixa alinhada à primeira linha (o nome) */}
                                <span className="flex h-6 items-center">
                                    <CheckboxBase size="md" isSelected={isSelected} isFocusVisible={isFocusVisible} />
                                </span>
                                {/* Só o nome do ingresso, como na lista de ingressos do desktop (FESTIVAL AURORA | PISTA | (28/11)):
                                    os ingressos que a pessoa já tem na Carteira */}
                                <span className="min-w-0 flex-1 text-md text-primary uppercase">{ingresso.nome}</span>
                                <span className="text-md text-primary tabular-nums">{brl(ingresso.valor * percentual)}</span>
                            </>
                        )}
                    </AriaCheckbox>
                ))}
            </div>
        </AriaCheckboxGroup>
    );
}
