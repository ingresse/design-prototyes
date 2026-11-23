import { useEffect, useMemo, useState } from "react";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { CONTORNO_DE_ERRO } from "../../eventos/components/campo-opcao-da-organizacao";

/* ------------------------------------------------------------------ */
/*  Escolher uma pessoa do grupo com busca (ECO-94)                    */
/*                                                                     */
/*  O ComboBox do DS: digitar filtra por nome ou e-mail. Usado no      */
/*  Responsável do canal Comissário e no filtro de vendedor dos        */
/*  pedidos, que com centenas de pessoas não cabem num Select.          */
/* ------------------------------------------------------------------ */

export interface OpcaoDePessoa {
    id: string;
    label: string;
    supportingText?: string;
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CampoDePessoa({
    label,
    rotulo,
    placeholder,
    opcoes,
    valor,
    onChange,
    hint,
    isInvalid = false,
    isRequired = false,
    size = "md",
}: {
    label?: string;
    /** Nome para leitor de tela, quando não há `label` visível. */
    rotulo?: string;
    placeholder: string;
    opcoes: OpcaoDePessoa[];
    valor: string | null;
    onChange: (id: string) => void;
    hint?: string;
    isInvalid?: boolean;
    isRequired?: boolean;
    size?: "sm" | "md";
}) {
    const escolhida = opcoes.find((o) => o.id === valor);
    const [texto, setTexto] = useState(escolhida?.label ?? "");
    const [digitando, setDigitando] = useState(false);

    // Fora da digitação, o campo mostra o nome da pessoa escolhida.
    useEffect(() => {
        if (!digitando) setTexto(escolhida?.label ?? "");
    }, [escolhida?.label, digitando]);

    const itens = useMemo(() => {
        const termo = semAcento(texto.trim());
        if (!digitando || !termo) return opcoes;
        const achadas = opcoes.filter((o) => semAcento(`${o.label} ${o.supportingText ?? ""}`).includes(termo));
        // A escolhida fica na coleção: sem ela, o ComboBox apagaria a escolha (mesmo cuidado de EVT-132).
        return escolhida && !achadas.includes(escolhida) ? [escolhida, ...achadas] : achadas;
    }, [opcoes, texto, digitando, escolhida]);

    return (
        <div className={isInvalid ? CONTORNO_DE_ERRO : undefined}>
            <ComboBox
                label={label}
                aria-label={label ? undefined : rotulo}
                size={size}
                placeholder={placeholder}
                shortcut={false}
                isRequired={isRequired}
                isInvalid={isInvalid}
                hint={hint}
                allowsEmptyCollection
                // Quem filtra é o campo (acima), por nome e e-mail.
                defaultFilter={() => true}
                inputValue={texto}
                onInputChange={(v) => {
                    setTexto(v);
                    setDigitando(v !== escolhida?.label);
                }}
                selectedKey={valor}
                onSelectionChange={(k) => {
                    if (k === null) return;
                    onChange(String(k));
                    setDigitando(false);
                }}
                onBlur={() => setDigitando(false)}
                items={itens}
            >
                {(item) => (
                    <Select.Item id={item.id} supportingText={item.supportingText}>
                        {item.label}
                    </Select.Item>
                )}
            </ComboBox>
        </div>
    );
}
