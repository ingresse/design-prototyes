import { useState } from "react";
import { Eye } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Label } from "@/components/base/input/label";
import { TITULO_FORMULARIO } from "../data/opcoes";
import { perguntasDaCategoria } from "../data/perguntas";
import type { Pergunta, Presenca } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { useFormulario } from "./contexto";

/* ------------------------------------------------------------------ */
/*  Prévia: "Ver formulário como atleta de [modalidade, categoria]"    */
/*  (SCE-109). Mostra as perguntas daquela categoria, na ordem, com os */
/*  campos do DS. Opção com quantidade 0 não aparece (esgotada).       */
/* ------------------------------------------------------------------ */

export function PreviaDoFormulario() {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const opcoes = r.modalidades.flatMap((m, i) =>
        m.categorias.map((c) => ({ id: c.id, label: t.opcaoDaPrevia(m.nome.trim() || t.nivel1N(i + 1), c.nome.trim() || t.nivel2SemNome) })),
    );
    const [escolhida, setEscolhida] = useState<string | null>(null);
    const [aberta, setAberta] = useState(false);
    const atual = opcoes.find((o) => o.id === escolhida) ?? opcoes[0];

    if (opcoes.length === 0) return null;
    const perguntas = atual ? perguntasDaCategoria(r.perguntas, atual.id) : [];

    return (
        <>
            {/* "Pré-visualizar" no topo, como no formulário do AWA; a categoria se escolhe dentro do modal. */}
            <Button color="secondary" size="md" iconLeading={Eye} onClick={() => setAberta(true)}>
                Pré-visualizar
            </Button>

            <ModalOverlay isOpen={aberta} onOpenChange={setAberta} isDismissable>
                <Modal className="sm:max-w-lg">
                    <Dialog aria-label={`${TITULO_FORMULARIO}: ${atual?.label ?? ""}`}>
                        <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                            <div className="flex shrink-0 flex-col gap-4 px-6 pt-6 pb-4">
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="text-lg font-semibold text-primary">{TITULO_FORMULARIO}</h2>
                                    <p className="text-sm text-tertiary">Como o atleta vê, na ordem do formulário.</p>
                                </div>
                                <Select label={t.verComoAtleta} items={opcoes} selectedKey={atual?.id ?? null} onSelectionChange={(k) => k != null && setEscolhida(String(k))}>
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-5">
                                {perguntas.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t.semPerguntasNaPrevia}</p>
                                ) : (
                                    <div className="flex flex-col gap-5">
                                        {perguntas.map((p) => (
                                            <CampoDaPrevia key={p.id} pergunta={p} presenca={p.vinculos[atual!.id]!} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 justify-end border-t border-secondary px-6 py-4">
                                <Button color="secondary" size="md" onClick={() => setAberta(false)}>
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}

/** Um campo do formulário do atleta, como ele aparece. */
function CampoDaPrevia({ pergunta: p, presenca }: { pergunta: Pergunta; presenca: Presenca }) {
    const obrigatoria = presenca === "obrigatoria";
    const titulo = p.titulo.trim() || "Pergunta sem título";
    const opcoes = p.opcoes.filter((o) => o.quantidade !== 0).map((o) => ({ id: o.id, label: o.nome || "Opção sem nome" }));
    const dica = obrigatoria ? undefined : "Opcional";
    switch (p.tipo) {
        case "texto-longo":
            return <TextArea label={titulo} isRequired={obrigatoria} hint={dica} rows={3} />;
        case "lista-suspensa":
            return (
                <Select label={titulo} isRequired={obrigatoria} hint={dica} placeholder="Selecione" items={opcoes}>
                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
            );
        case "selecao-unica":
            return (
                <div className="flex flex-col gap-2">
                    <RadioGroup isRequired={obrigatoria}>
                        <Label isRequired={obrigatoria}>{titulo}</Label>
                        {opcoes.map((o) => (
                            <RadioButton key={o.id} value={o.id} label={o.label} />
                        ))}
                    </RadioGroup>
                    {dica && <p className="text-sm text-tertiary">{dica}</p>}
                </div>
            );
        case "multipla":
            return (
                <div role="group" aria-label={titulo} className="flex flex-col gap-2">
                    <Label isRequired={obrigatoria}>{titulo}</Label>
                    {opcoes.map((o) => (
                        <Checkbox key={o.id} label={o.label} />
                    ))}
                    {dica && <p className="text-sm text-tertiary">{dica}</p>}
                </div>
            );
        case "data":
            return <Input label={titulo} isRequired={obrigatoria} hint={dica} placeholder="dd/mm/aaaa" inputMode="numeric" />;
        case "numero":
            return <Input label={titulo} isRequired={obrigatoria} hint={dica} placeholder="0" inputMode="numeric" />;
        default:
            return <Input label={titulo} isRequired={obrigatoria} hint={dica} />;
    }
}
