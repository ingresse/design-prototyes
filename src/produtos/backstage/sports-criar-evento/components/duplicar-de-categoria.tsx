import { useState } from "react";
import { toast } from "sonner";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Select } from "@/components/base/select/select";
import { labelDe, TIPOS_DE_RESPOSTA } from "../data/opcoes";
import { idsDasCategorias, presencaNa } from "../data/perguntas";
import type { Presenca } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { ErroDaLista } from "./campos";
import { ItemDaArvore } from "./arvore-de-modalidades";
import { resumoDaCategoria } from "./secao-modalidades";
import { useFormulario } from "./contexto";

/* ------------------------------------------------------------------ */
/*  Duplicar de outra categoria (v0.5, SCE-173)                        */
/*  No lugar de "Duplicar de outro evento" no formulário. 1) Escolhe   */
/*  a categoria de origem (Modalidade › Categoria) deste evento; as    */
/*  perguntas dela vêm marcadas. 2) Marca as categorias de destino.    */
/*  Confirmar liga as perguntas às de destino, com a mesma             */
/*  obrigatoriedade da origem: é vínculo, a pergunta continua uma só.  */
/* ------------------------------------------------------------------ */

export function DuplicarDeOutraCategoria({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const [origem, setOrigem] = useState<string | null>(null);
    const [perguntas, setPerguntas] = useState<Set<string>>(new Set());
    const [destinos, setDestinos] = useState<Set<string>>(new Set());
    const [erro, setErro] = useState<string>();

    const opcoes = r.modalidades.flatMap((m, i) =>
        m.categorias.map((c) => ({ id: c.id, label: `${m.nome.trim() || t.nivel1N(i + 1)} › ${c.nome.trim() || t.nivel2SemNome}` })),
    );
    const daOrigem = origem ? r.perguntas.filter((p) => p.vinculos[origem]) : [];
    const todosDestinos = idsDasCategorias(r.modalidades).filter((c) => c !== origem);

    const fechar = () => {
        setOrigem(null);
        setPerguntas(new Set());
        setDestinos(new Set());
        setErro(undefined);
        onFechar();
    };
    const escolherOrigem = (id: string) => {
        setOrigem(id);
        setErro(undefined);
        setPerguntas(new Set(r.perguntas.filter((p) => p.vinculos[id]).map((p) => p.id)));
        setDestinos((d) => {
            const n = new Set(d);
            n.delete(id);
            return n;
        });
    };
    const alternar = (set: (fn: (s: Set<string>) => Set<string>) => void, ids: string[], sim: boolean) => {
        setErro(undefined);
        set((s) => {
            const n = new Set(s);
            for (const id of ids) {
                if (sim) n.add(id);
                else n.delete(id);
            }
            return n;
        });
    };

    const vincular = () => {
        if (!origem) return setErro(t.msgEscolhaOrigem);
        const escolhidas = daOrigem.filter((p) => perguntas.has(p.id));
        if (escolhidas.length === 0) return setErro(t.msgEscolhaPergunta);
        if (destinos.size === 0) return setErro(t.msgEscolhaDestino);
        const antes = r.perguntas;
        const alvo = [...destinos];
        atualizar((a) => ({
            ...a,
            perguntas: a.perguntas.map((p) => {
                if (!perguntas.has(p.id) || !p.vinculos[origem]) return p;
                const presenca: Presenca = p.vinculos[origem];
                const vinculos = { ...p.vinculos, ...Object.fromEntries(alvo.map((c) => [c, presenca])) };
                const todas = idsDasCategorias(a.modalidades).every((c) => vinculos[c]);
                return { ...p, vinculos, todas: p.todas || todas };
            }),
        }));
        toast.success(t.perguntasVinculadas(escolhidas.length, alvo.length), { action: { label: "Desfazer", onClick: () => atualizar((a) => ({ ...a, perguntas: antes })) } });
        fechar();
    };

    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && fechar()} isDismissable>
            <Modal className="sm:max-w-2xl">
                <Dialog aria-label={t.duplicarDeOutraNivel2}>
                    <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex shrink-0 flex-col gap-4 px-6 pt-6 pb-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="text-lg font-semibold text-primary">{t.duplicarDeOutraNivel2}</h2>
                                    <p className="max-w-[65ch] text-sm text-tertiary">{t.duplicarDeOutraNivel2Descricao}</p>
                                </div>
                                <ButtonUtility size="sm" color="tertiary" icon={XClose} onClick={fechar} tooltip="Fechar" />
                            </div>
                            <Select
                                label={t.nivel2DeOrigem}
                                isRequired
                                placeholder="Selecione"
                                items={opcoes}
                                selectedKey={origem}
                                onSelectionChange={(k) => k != null && escolherOrigem(String(k))}
                                isInvalid={!origem && !!erro}
                                hint={!origem ? erro : undefined}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        </div>

                        {origem && (
                            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-secondary px-6 py-5">
                                <div role="group" aria-labelledby="dup-cat-perguntas" className="flex flex-col gap-3">
                                    <span id="dup-cat-perguntas" className="text-sm font-medium text-secondary">
                                        Perguntas
                                    </span>
                                    {daOrigem.length === 0 ? (
                                        <p className="text-sm text-tertiary">{t.semPerguntasNaOrigem}</p>
                                    ) : (
                                        daOrigem.map((p) => (
                                            <Checkbox
                                                key={p.id}
                                                label={p.titulo.trim() || "Pergunta sem título"}
                                                hint={`${labelDe(TIPOS_DE_RESPOSTA, p.tipo)}. ${presencaNa(p, origem) === "obrigatoria" ? "Obrigatória" : "Opcional"}.`}
                                                isSelected={perguntas.has(p.id)}
                                                onChange={(sim) => alternar(setPerguntas, [p.id], sim)}
                                            />
                                        ))
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 border-t border-secondary pt-5">
                                    <span id="dup-cat-destino" className="text-sm font-medium text-secondary">
                                        {t.nivel2DeDestino}
                                    </span>
                                    {/* v0.13 (SCE-209): a mesma lista hierárquica da cópia e das categorias vinculadas. */}
                                    <ul aria-labelledby="dup-cat-destino" className="flex flex-col divide-y divide-secondary rounded-xl bg-primary px-4 py-1 ring-1 ring-secondary">
                                        {r.modalidades.map((m, i) => {
                                            const ids = m.categorias.map((c) => c.id).filter((c) => c !== origem);
                                            if (!ids.length) return null;
                                            const k = ids.filter((c) => destinos.has(c)).length;
                                            const nome = m.nome.trim() || t.nivel1N(i + 1);
                                            return (
                                                <li key={m.id} className="flex flex-col py-1.5">
                                                    <ItemDaArvore
                                                        nivel={1}
                                                        nome={nome}
                                                        contagem={t.nivel2Marcadas(k, ids.length)}
                                                        ariaLabel={t.marcarNivel1Inteira(nome)}
                                                        isSelected={k === ids.length}
                                                        isIndeterminate={k > 0 && k < ids.length}
                                                        onChange={(sim) => alternar(setDestinos, ids, sim)}
                                                    />
                                                    <ul className="ml-2 flex flex-col border-l border-secondary pl-5">
                                                        {m.categorias
                                                            .filter((c) => c.id !== origem)
                                                            .map((c) => (
                                                                <li key={c.id}>
                                                                    <ItemDaArvore
                                                                        nivel={2}
                                                                        nome={c.nome.trim() || t.nivel2SemNome}
                                                                        detalhe={resumoDaCategoria(c)}
                                                                        isSelected={destinos.has(c.id)}
                                                                        onChange={(sim) => alternar(setDestinos, [c.id], sim)}
                                                                    />
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {todosDestinos.length === 0 && <p className="text-sm text-tertiary">{t.semOutraNivel2}</p>}
                                </div>
                            </div>
                        )}

                        <div className="flex shrink-0 flex-col gap-3 border-t border-secondary px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                            {origem && (
                                <div className="sm:mr-auto">
                                    <ErroDaLista erro={erro} />
                                </div>
                            )}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                <Button color="secondary" size="md" onClick={fechar}>
                                    Cancelar
                                </Button>
                                <Button color="primary" size="md" onClick={vincular}>
                                    {perguntas.size > 0 && origem ? (perguntas.size === 1 ? "Vincular 1 pergunta" : `Vincular ${perguntas.size} perguntas`) : "Vincular"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
