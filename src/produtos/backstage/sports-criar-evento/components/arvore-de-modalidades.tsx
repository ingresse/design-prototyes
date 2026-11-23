import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { formatarReais } from "../data/campos";
import { vagasDaCategoria } from "../data/modelos";
import { labelDe, TIPOS_DE_MODALIDADE } from "../data/opcoes";
import type { Categoria, Modalidade } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { resumoDaCategoria } from "./secao-modalidades";

/* ------------------------------------------------------------------ */
/*  Árvore Modalidade › Categoria para escolher o que copiar           */
/*  (SCE-159 e SCE-180). Usada no modal "Copiar de outro evento" e na  */
/*  etapa "Escolher o que trazer" da cópia guiada. Tudo começa         */
/*  marcado; desmarcar a modalidade desmarca as categorias dela;       */
/*  marcar uma categoria marca a modalidade.                           */
/* ------------------------------------------------------------------ */

export const lotesDaCategoria = (c: Categoria) => {
    const valores = c.lotes.map((l) => l.valor).filter((v): v is number => v != null);
    const lotes = c.lotes.length === 1 ? "1 lote" : `${c.lotes.length} lotes`;
    if (!valores.length) return lotes;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    return min === max ? `${lotes} de ${formatarReais(min)}` : `${lotes} de ${formatarReais(min)} a ${formatarReais(max)}`;
};

/**
 * Linha da árvore Modalidade › Categoria (v0.13, SCE-209): uma por linha, com o rótulo do nível (vocabulário da
 * variante) em selo, o nome e um detalhe discreto; a contagem fica à direita. Altura de ~36 px.
 */
export function ItemDaArvore({
    nivel,
    nome,
    detalhe,
    contagem,
    isSelected,
    isIndeterminate,
    isDisabled,
    ariaLabel,
    onChange,
}: {
    nivel: 1 | 2;
    nome: string;
    detalhe?: string;
    contagem?: string;
    isSelected: boolean;
    isIndeterminate?: boolean;
    isDisabled?: boolean;
    ariaLabel?: string;
    onChange: (sim: boolean) => void;
}) {
    const { t } = useVocabulario();
    return (
        <div className="flex min-h-9 items-center gap-3 py-1">
            <Checkbox
                aria-label={ariaLabel}
                isSelected={isSelected}
                isIndeterminate={isIndeterminate}
                isDisabled={isDisabled}
                onChange={onChange}
                className="min-w-0 flex-1 items-center"
                label={
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Badge type="pill-color" size="sm" color={nivel === 1 ? "brand" : "gray"} className="shrink-0">
                            {nivel === 1 ? t.nivel1.Um : t.nivel2.Um}
                        </Badge>
                        <span className={nivel === 1 ? "font-semibold text-primary" : "font-medium text-secondary"}>{nome}</span>
                        {detalhe && <span className="font-normal text-tertiary">{detalhe}</span>}
                    </span>
                }
            />
            {contagem && <span className="shrink-0 text-sm text-tertiary tabular-nums">{contagem}</span>}
        </div>
    );
}

export function useSelecaoDeModalidades(onMudar?: () => void, inicial: Modalidade[] = []) {
    const [modMarcadas, setModMarcadas] = useState<Set<string>>(() => new Set(inicial.map((m) => m.id)));
    const [catMarcadas, setCatMarcadas] = useState<Set<string>>(() => new Set(inicial.flatMap((m) => m.categorias.map((c) => c.id))));

    const marcarTudo = (ms: Modalidade[], sim: boolean) => {
        setModMarcadas(new Set(sim ? ms.map((m) => m.id) : []));
        setCatMarcadas(new Set(sim ? ms.flatMap((m) => m.categorias.map((c) => c.id)) : []));
    };
    const alternarModalidade = (m: Modalidade, sim: boolean) => {
        onMudar?.();
        setModMarcadas((s) => {
            const n = new Set(s);
            if (sim) n.add(m.id);
            else n.delete(m.id);
            return n;
        });
        setCatMarcadas((s) => {
            const n = new Set(s);
            for (const c of m.categorias) {
                if (sim) n.add(c.id);
                else n.delete(c.id);
            }
            return n;
        });
    };
    const alternarCategoria = (m: Modalidade, c: Categoria, sim: boolean) => {
        onMudar?.();
        setCatMarcadas((s) => {
            const n = new Set(s);
            if (sim) n.add(c.id);
            else n.delete(c.id);
            return n;
        });
        if (sim) setModMarcadas((s) => new Set(s).add(m.id));
    };
    /**
     * v0.17 (SCE-225): clique na caixa da modalidade em três estados. Desmarcada → só a modalidade (sem categorias);
     * só ela ou com parte das categorias → modalidade e todas as categorias; tudo marcado → desmarca tudo.
     */
    const cicloDaModalidade = (m: Modalidade) => {
        const marcada = modMarcadas.has(m.id);
        const todas = m.categorias.every((c) => catMarcadas.has(c.id));
        if (!marcada) {
            onMudar?.();
            setModMarcadas((s) => new Set(s).add(m.id));
            return;
        }
        alternarModalidade(m, !todas);
    };
    /** As modalidades marcadas, só com as categorias marcadas. */
    const escolhidas = (fontes: Modalidade[]) =>
        fontes.filter((m) => modMarcadas.has(m.id)).map((m) => ({ ...m, categorias: m.categorias.filter((c) => catMarcadas.has(c.id)) }));
    const todasMarcadas = (fontes: Modalidade[]) => fontes.length > 0 && fontes.every((m) => modMarcadas.has(m.id) && m.categorias.every((c) => catMarcadas.has(c.id)));

    return { modMarcadas, catMarcadas, marcarTudo, alternarModalidade, cicloDaModalidade, alternarCategoria, escolhidas, todasMarcadas };
}

export type SelecaoDeModalidades = ReturnType<typeof useSelecaoDeModalidades>;

export function ArvoreDeModalidades({
    fontes,
    selecao: s,
    rotulo,
    somenteCategorias,
}: {
    fontes: Modalidade[];
    selecao: SelecaoDeModalidades;
    rotulo: string;
    /** v0.17 (SCE-224): copiar só categorias. A modalidade de origem aparece só como informação, sem caixa de marcar. */
    somenteCategorias?: boolean;
}) {
    const { t } = useVocabulario();
    // v0.16 (SCE-217): com algo marcado, o atalho desmarca tudo; com nada marcado, marca tudo.
    const algumaMarcada = fontes.some((m) => s.modMarcadas.has(m.id) || m.categorias.some((c) => s.catMarcadas.has(c.id)));
    return (
        <div className="@container flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span id="arvore-rotulo" className="text-sm font-medium text-secondary">
                    {rotulo}
                </span>
                <Button color="link-color" size="sm" onClick={() => s.marcarTudo(fontes, !algumaMarcada)}>
                    {algumaMarcada ? "Desmarcar tudo" : "Marcar tudo"}
                </Button>
            </div>
            {/* Lista hierárquica, uma linha por item (v0.13): modalidade e, recuadas com a linha da árvore, as categorias. */}
            <ul role="group" aria-labelledby="arvore-rotulo" className="flex flex-col divide-y divide-secondary rounded-xl bg-primary px-4 py-1 ring-1 ring-secondary">
                {fontes.map((m) => {
                    const marcada = s.modMarcadas.has(m.id);
                    const k = m.categorias.filter((c) => s.catMarcadas.has(c.id)).length;
                    const n = m.categorias.length;
                    return (
                        <li key={m.id} className="flex flex-col py-1.5">
                            {somenteCategorias ? (
                                <div className="flex min-h-9 items-center gap-3 py-1">
                                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                        <Badge type="pill-color" size="sm" color="gray" className="shrink-0">
                                            {t.nivel1.Um}
                                        </Badge>
                                        <span className="font-semibold text-primary">{m.nome}</span>
                                        <span className="text-tertiary">{labelDe(TIPOS_DE_MODALIDADE, m.tipo)}</span>
                                    </span>
                                    <span className="shrink-0 text-sm text-tertiary tabular-nums">{k === 0 ? "Nenhuma marcada" : k === 1 ? "1 marcada" : `${k} marcadas`}</span>
                                </div>
                            ) : (
                            <ItemDaArvore
                                nivel={1}
                                nome={m.nome}
                                detalhe={[labelDe(TIPOS_DE_MODALIDADE, m.tipo), m.vagas ? `${m.vagas.toLocaleString("pt-BR")} vagas` : "vagas a definir"].filter(Boolean).join(", ")}
                                contagem={t.copiarNivel1Contagem(marcada ? k : 0, n)}
                                ariaLabel={t.marcarNivel1(m.nome)}
                                isSelected={marcada && k === n}
                                isIndeterminate={marcada && k < n}
                                onChange={() => s.cicloDaModalidade(m)}
                            />
                            )}
                            {!somenteCategorias && marcada && k === 0 && <p className="pl-7 text-sm text-warning-primary">{t.copiarNivel1SemNivel2}</p>}
                            <ul className={somenteCategorias ? "flex flex-col pl-2" : "ml-2 flex flex-col border-l border-secondary pl-5"}>
                                {m.categorias.map((c) => (
                                    <li key={c.id}>
                                        <ItemDaArvore
                                            nivel={2}
                                            nome={c.nome}
                                            detalhe={`${resumoDaCategoria(c)}, ${lotesDaCategoria(c).replace(/^\S/, (x) => x.toLowerCase())}${vagasDaCategoria(c) ? `, ${vagasDaCategoria(c).toLocaleString("pt-BR")} vagas` : ""}`}
                                            isSelected={s.catMarcadas.has(c.id)}
                                            onChange={(sim) => s.alternarCategoria(m, c, sim)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
