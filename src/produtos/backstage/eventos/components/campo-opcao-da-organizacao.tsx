import { useEffect, useMemo, useState } from "react";
import { Plus } from "@untitledui/icons";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import type { Opcao } from "../data/opcoes-evento";

/* ------------------------------------------------------------------ */
/*  Campo de lista da organização (EVT-132)                            */
/*                                                                     */
/*  Escolhe numa lista (times, campeonatos, programas, políticas) e,   */
/*  quando o que a pessoa digitou não está nela, oferece "Adicionar".  */
/*  A opção nova é gravada na organização e volta nas próximas vezes.  */
/* ------------------------------------------------------------------ */

const NOVA = "__nova__";

/**
 * Erro no ComboBox e no Select do DS com o mesmo desenho do Input do DS: contorno `error_subtle` e, com foco,
 * `ring-2 ring-error`. Os dois do DS só pintam o texto de apoio de vermelho; o campo ficava com o contorno
 * normal ao lado de Inputs com contorno de erro. Vai no elemento em volta do campo, só quando há erro.
 */
export const CONTORNO_DE_ERRO =
    "[&_[role=group]]:ring-error_subtle [&_[role=group]:focus-within]:ring-2 [&_[role=group]:focus-within]:ring-error [&_button[aria-haspopup]]:ring-error_subtle [&_button[aria-haspopup][data-focused]]:ring-2 [&_button[aria-haspopup][data-focused]]:ring-error [&_button[aria-haspopup][aria-expanded=true]]:ring-2 [&_button[aria-haspopup][aria-expanded=true]]:ring-error";

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface CampoOpcaoDaOrganizacaoProps {
    label: string;
    opcoes: Opcao[];
    valor: string;
    onChange: (id: string) => void;
    /** Grava a opção nova na organização e devolve o id (ou `null` se não gravou). */
    onAdicionar: (nome: string) => Promise<string | null>;
    placeholder?: string;
    hint?: string;
    erro?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    /** Apagar o texto volta ao vazio (campo opcional). `false` em campo com padrão, como a política (EVT-68). */
    permiteVazio?: boolean;
}

export function CampoOpcaoDaOrganizacao({ label, opcoes, valor, onChange, onAdicionar, placeholder, hint, erro, isRequired, isDisabled, permiteVazio = true }: CampoOpcaoDaOrganizacaoProps) {
    const selecionada = opcoes.find((o) => o.id === valor);
    const [texto, setTexto] = useState(selecionada?.label ?? "");
    const [gravando, setGravando] = useState(false);

    // Valor trocado de fora (descartar, sugestão) ou opção recém-gravada que chegou do banco: o campo mostra o nome.
    useEffect(() => {
        if (!valor) setTexto((t) => (opcoes.some((o) => o.label === t) ? "" : t));
        else if (selecionada) setTexto(selecionada.label);
    }, [valor, selecionada?.label]);

    const digitado = texto.trim();
    const mostrandoEscolhida = !!selecionada && texto === selecionada.label;
    const rotuloNovo = `Adicionar “${digitado}”`;
    const itens = useMemo(() => {
        const filtradas = mostrandoEscolhida || !digitado ? opcoes : opcoes.filter((o) => semAcento(o.label).includes(semAcento(digitado)));
        // A escolhida fica na coleção: sem ela, o ComboBox apagaria a escolha (mesmo cuidado do campo Local, EVT-83).
        const comEscolhida = selecionada && !filtradas.includes(selecionada) ? [selecionada, ...filtradas] : filtradas;
        const existe = opcoes.some((o) => semAcento(o.label) === semAcento(digitado));
        const lista: Opcao[] = comEscolhida.map((o) => ({ id: o.id, label: o.label, supportingText: o.supportingText }));
        if (digitado && !existe && !mostrandoEscolhida) lista.push({ id: NOVA, label: rotuloNovo, icon: Plus });
        return lista;
    }, [opcoes, digitado, mostrandoEscolhida, selecionada, rotuloNovo]);

    return (
        <div className={erro ? CONTORNO_DE_ERRO : undefined}>
        <ComboBox
            label={label}
            isRequired={isRequired}
            isDisabled={isDisabled || gravando}
            placeholder={placeholder}
            shortcut={false}
            allowsEmptyCollection
            // Quem filtra é o campo (acima), para incluir a linha "Adicionar".
            defaultFilter={() => true}
            inputValue={texto}
            onInputChange={(v) => {
                if (v === rotuloNovo) return;
                setTexto(v);
                // Apagar o texto limpa a escolha (campo opcional); nos outros, sair do campo devolve o nome.
                if (!v.trim() && valor && permiteVazio && !isRequired) onChange("");
            }}
            selectedKey={valor || null}
            onSelectionChange={(k) => {
                if (k == null) return;
                if (k === NOVA) {
                    const nome = digitado;
                    setTexto(nome);
                    setGravando(true);
                    void onAdicionar(nome)
                        .then((id) => id && onChange(id))
                        .finally(() => setGravando(false));
                    return;
                }
                const o = opcoes.find((x) => x.id === k);
                if (!o) return;
                onChange(o.id);
                setTexto(o.label);
            }}
            items={itens}
            isInvalid={!!erro}
            hint={erro ?? hint}
        >
            {(item) => (
                <Select.Item id={item.id} supportingText={item.supportingText} icon={item.icon}>
                    {item.label}
                </Select.Item>
            )}
        </ComboBox>
        </div>
    );
}
