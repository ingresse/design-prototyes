import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { buscarLocais, textoDoLocal, type LocalEncontrado } from "../data/locais";
import { MSG } from "../data/opcoes";

/* ------------------------------------------------------------------ */
/*  Local da largada: busca de endereço, como no Criar evento do AWA   */
/*  (CampoLocal, EVT-65 e EVT-83). Um campo só (ComboBox do DS):       */
/*  digitar o nome do lugar ou o endereço lista as sugestões; ao       */
/*  escolher, a linha inteira (nome, endereço e cidade) vai para o     */
/*  campo, sem nada no hint (UI-FRM-004). Para editar, digita de novo:  */
/*  a escolha sai e a busca recomeça. "Buscando…" e "Nenhum local      */
/*  encontrado" ficam dentro do campo; a orientação e o erro da busca  */
/*  ficam no HintText.                                                 */
/* ------------------------------------------------------------------ */

export function CampoLocal({
    id,
    valor,
    onChange,
    onBlur,
    erro,
}: {
    id: string;
    valor: LocalEncontrado | null;
    onChange: (v: LocalEncontrado | null) => void;
    onBlur?: () => void;
    erro?: string;
}) {
    const [texto, setTexto] = useState(valor ? textoDoLocal(valor) : "");
    const [resultados, setResultados] = useState<LocalEncontrado[]>(valor ? [valor] : []);
    const [buscando, setBuscando] = useState(false);
    const [falhou, setFalhou] = useState(false);
    const [tentativa, setTentativa] = useState(0);
    const escolhido = !!valor && texto === textoDoLocal(valor);

    useEffect(() => {
        if (escolhido) return;
        let ativo = true;
        setFalhou(false);
        if (texto.trim().length < 2) {
            setResultados([]);
            setBuscando(false);
            return;
        }
        setBuscando(true);
        const tempo = setTimeout(() => {
            buscarLocais(texto)
                .then((r) => ativo && setResultados(r))
                .catch(() => ativo && (setResultados([]), setFalhou(true)))
                .finally(() => ativo && setBuscando(false));
        }, 250);
        return () => {
            ativo = false;
            clearTimeout(tempo);
        };
    }, [texto, tentativa]);

    const vazio = !escolhido && !falhou && texto.trim().length >= 2 && !buscando && resultados.length === 0;
    const dica = falhou
        ? MSG.localFalhou
        : vazio
          ? "Tente só o nome do lugar ou a rua com a cidade (ex.: Beira-Mar Norte, Florianópolis)."
          : !escolhido && !texto
            ? "Busque pelo nome do lugar (parque, praça, arena) ou pelo endereço."
            : undefined;

    return (
        <div id={id} data-erro={erro || falhou ? "" : undefined} className="min-w-0 scroll-mt-6">
            <ComboBox
                label="Local da largada"
                isRequired
                placeholder="Ex.: Trapiche da Beira-Mar Norte"
                shortcut={false}
                // Com resultados da API, a lista abre quando eles chegam; sem resultado, não abre.
                allowsEmptyCollection
                // Quem filtra é a API: a lista mostra os resultados como vieram.
                defaultFilter={() => true}
                inputValue={texto}
                onInputChange={(v) => {
                    // Ao escolher, o ComboBox escreve o nome do item no campo: isso não desfaz a escolha (EVT-83).
                    if (valor && (v === valor.nome || v === textoDoLocal(valor))) return setTexto(textoDoLocal(valor));
                    setTexto(v);
                    if (valor) onChange(null);
                }}
                selectedKey={valor?.id ?? null}
                onSelectionChange={(k) => {
                    // `null` vem do próprio ComboBox quando a lista muda; limpar é apagando o texto.
                    if (k == null) return;
                    const l = resultados.find((r) => r.id === k) ?? (valor?.id === k ? valor : null);
                    if (!l) return;
                    onChange(l);
                    setTexto(textoDoLocal(l));
                }}
                onBlur={onBlur}
                // O local escolhido continua na lista: tirá-lo da coleção fazia o ComboBox apagar a escolha (EVT-83).
                items={(escolhido && valor ? [valor] : resultados).map((r) => ({ id: r.id, label: r.nome, supportingText: `${r.endereco}, ${r.cidade}` }))}
                status={
                    buscando ? (
                        <>
                            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-secondary border-t-fg-brand-primary motion-reduce:animate-none" />
                            Buscando…
                        </>
                    ) : vazio ? (
                        "Nenhum local encontrado"
                    ) : undefined
                }
                isInvalid={!!erro || falhou}
                hint={falhou ? dica : (erro ?? dica)}
            >
                {(item) => (
                    <Select.Item id={item.id} supportingText={item.supportingText}>
                        {item.label}
                    </Select.Item>
                )}
            </ComboBox>
            {falhou && (
                <Button color="link-color" size="sm" className="mt-1.5" onClick={() => setTentativa((t) => t + 1)}>
                    Tentar de novo
                </Button>
            )}
        </div>
    );
}
