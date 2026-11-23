import { useEffect, useMemo, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { labelDe, type Opcao } from "../data/opcoes";

/* ------------------------------------------------------------------ */
/*  v0.29 (teste com a Maria Bruna, 18/11): tipo de modalidade com     */
/*  busca por proximidade. A lista é longa e o organizador digita do   */
/*  jeito dele ("21 km", "meia", "triathlon", "corida"): a busca       */
/*  ignora acento, espaço e "km", aceita um erro de digitação por      */
/*  palavra e, para distâncias, traz as mais próximas do número.       */
/* ------------------------------------------------------------------ */

const normalizar = (s: string) =>
    s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/(\d+)\s*(km|k|quilometros?)\b/g, "$1k")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const palavras = (s: string) => normalizar(s).split(" ").filter(Boolean);

/** Distância de edição (Levenshtein) entre duas palavras curtas. */
const distancia = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
};

const numeroDe = (s: string) => {
    const m = normalizar(s).match(/(\d+)k?/);
    return m ? Number(m[1]) : null;
};

/** Nota de proximidade: menor é melhor; `null` fica fora da lista. */
function proximidade(busca: string, opcao: Opcao): number | null {
    const q = normalizar(busca);
    if (!q) return 0;
    const rotulo = normalizar(opcao.label);
    if (rotulo.startsWith(q)) return 0;
    if (rotulo.includes(q)) return 1;
    const ps = palavras(opcao.label);
    let nota = 2;
    for (const t of palavras(busca)) {
        const tolerancia = t.length >= 5 ? 2 : t.length >= 4 ? 1 : 0;
        const melhor = Math.min(...ps.map((p) => (p.startsWith(t) ? 0 : distancia(t, p.slice(0, Math.max(t.length, 1))) <= tolerancia ? 1 : distancia(t, p) <= tolerancia ? 1 : 99)));
        if (melhor >= 99) {
            nota = -1;
            break;
        }
        nota += melhor;
    }
    if (nota >= 0) return nota;
    // Distância sem tipo igual: traz as mais próximas do número digitado (ex.: 20 → 21K).
    const n = numeroDe(busca);
    const m = numeroDe(opcao.label);
    if (n != null && m != null && Math.abs(n - m) <= Math.max(3, n * 0.5)) return 10 + Math.abs(n - m);
    return null;
}

export function CampoTipoDeModalidade({
    id,
    label,
    tooltip,
    opcoes,
    valor,
    onChange,
    erro,
    isRequired,
}: {
    id: string;
    label: string;
    tooltip?: string;
    opcoes: Opcao[];
    valor: string;
    onChange: (v: string) => void;
    erro?: string;
    isRequired?: boolean;
}) {
    const [texto, setTexto] = useState(labelDe(opcoes, valor));
    useEffect(() => setTexto(labelDe(opcoes, valor)), [valor, opcoes]);

    const escolhido = !!valor && texto === labelDe(opcoes, valor);
    const itens = useMemo(() => {
        if (escolhido) return opcoes;
        return opcoes
            .map((o) => ({ o, nota: proximidade(texto, o) }))
            .filter((x): x is { o: Opcao; nota: number } => x.nota != null)
            .sort((a, b) => a.nota - b.nota)
            .map((x) => x.o);
    }, [texto, opcoes, escolhido]);
    const semResultado = !!texto.trim() && !escolhido && itens.length === 0;

    return (
        <div id={id} data-erro={erro ? "" : undefined} className="min-w-0 scroll-mt-6">
            <ComboBox
                label={label}
                tooltip={tooltip}
                isRequired={isRequired}
                placeholder="Busque: 21K, meia maratona, triatlo…"
                icon={SearchLg}
                shortcut={false}
                allowsEmptyCollection
                defaultFilter={() => true}
                inputValue={texto}
                onInputChange={setTexto}
                selectedKey={valor || null}
                onSelectionChange={(k) => {
                    if (k == null) return;
                    onChange(String(k));
                    setTexto(labelDe(opcoes, String(k)));
                }}
                // Saiu sem escolher: volta para o tipo escolhido (ou vazio), sem deixar texto solto no campo.
                onBlur={() => setTexto(labelDe(opcoes, valor))}
                items={itens.map((o) => ({ id: o.id, label: o.label }))}
                status={semResultado ? "Nenhum tipo parecido. Escolha Outro" : undefined}
                isInvalid={!!erro}
                hint={erro}
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </ComboBox>
        </div>
    );
}
