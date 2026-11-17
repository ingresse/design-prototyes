import { useEffect, useRef, useState } from "react";
import { Input, type InputProps } from "@/components/base/input/input";

/*
 * Campo de número inteiro do Backstage (BKS-74). Usa o Input do DS como texto com teclado numérico
 * (`inputMode="numeric"`), não o `type="number"` do navegador, que muda o valor com a rolagem do mouse.
 * Enquanto a pessoa digita, o texto é dela: dá para apagar tudo e digitar 0. Só os dígitos valem.
 */

const textoDe = (v: number | null | undefined) => (v == null ? "" : String(v));

type CampoNumeroProps = Omit<InputProps, "value" | "onChange" | "type" | "inputMode" | "defaultValue"> & {
    /** Valor em uso; vazio (`null`/`undefined`) mostra o campo vazio. */
    valor: number | null | undefined;
    /** Recebe o número digitado, ou `undefined` quando o campo fica vazio e `vazio` é permitido. */
    onChange: (v: number | undefined) => void;
    /** Menor valor aceito (padrão 0). Abaixo dele, o valor não muda e o campo volta ao sair. */
    minimo?: number;
    /** O campo pode ficar vazio (ex.: "sem limite"). Sem isso, apagar tudo vale só durante a digitação. */
    vazio?: boolean;
};

export function CampoNumero({ valor, onChange, minimo = 0, vazio = false, onFocus, onBlur, ...props }: CampoNumeroProps) {
    const [texto, setTexto] = useState(textoDe(valor));
    const editando = useRef(false);

    // Mudança de fora (descartar, trocar de item) aparece no campo; durante a digitação, vale o texto.
    useEffect(() => {
        if (!editando.current) setTexto(textoDe(valor));
    }, [valor]);

    return (
        <Input
            {...props}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={texto}
            onFocus={(e) => {
                editando.current = true;
                onFocus?.(e);
            }}
            onBlur={(e) => {
                editando.current = false;
                // Ao sair, o campo mostra o valor que valeu (ex.: apagou tudo num campo que não pode ficar vazio).
                setTexto(textoDe(valor));
                onBlur?.(e);
            }}
            onChange={(t) => {
                const digitos = t.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
                setTexto(digitos);
                if (digitos === "") {
                    if (vazio) onChange(undefined);
                    return;
                }
                const n = Number(digitos);
                if (n >= minimo) onChange(n);
            }}
        />
    );
}
