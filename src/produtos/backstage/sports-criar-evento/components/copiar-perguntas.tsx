import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchLg, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { EVENTOS_ANTERIORES, modalidadesDoEvento, perguntasDoEvento, rotuloDoEvento } from "../data/eventos-anteriores";
import { labelDe, TIPOS_DE_RESPOSTA } from "../data/opcoes";
import { podeVer, usePerfil } from "../data/perfil";
import { copiarPergunta, marcarEstoqueParaRevisar } from "../data/perguntas";
import { useVocabulario } from "../data/vocabulario";
import { useFormulario } from "./contexto";

/* ------------------------------------------------------------------ */
/*  v0.29: "Copiar de outro evento" no formulário de inscrição, no     */
/*  lugar de "Duplicar de outra categoria". 1) Busca e escolhe o       */
/*  evento (só os da organização; o admin vê todos). 2) Marca as       */
/*  perguntas (todas vêm marcadas). Entram para todas as categorias    */
/*  deste evento; as que têm quantidade por opção pedem revisão,       */
/*  porque o estoque é de cada evento.                                 */
/* ------------------------------------------------------------------ */

export function CopiarPerguntasDeOutroEvento({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    const { rascunho: r, atualizar } = useFormulario();
    const { t } = useVocabulario();
    const perfil = usePerfil();
    const [busca, setBusca] = useState("");
    const [eventoId, setEventoId] = useState<string | null>(null);
    const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

    const eventos = EVENTOS_ANTERIORES.filter((e) => podeVer(perfil, e.organizacaoId) && (!busca.trim() || rotuloDoEvento(e).toLowerCase().includes(busca.trim().toLowerCase())));
    const evento = EVENTOS_ANTERIORES.find((e) => e.id === eventoId) ?? null;
    const perguntas = useMemo(() => (evento ? perguntasDoEvento(evento, modalidadesDoEvento(evento)) : []), [evento]);
    const jaTem = (titulo: string) => r.perguntas.some((p) => p.titulo.trim().toLowerCase() === titulo.trim().toLowerCase());

    const fechar = () => {
        setBusca("");
        setEventoId(null);
        setMarcadas(new Set());
        onFechar();
    };
    const escolher = (id: string) => {
        setEventoId(id);
        const e = EVENTOS_ANTERIORES.find((x) => x.id === id)!;
        setMarcadas(new Set(perguntasDoEvento(e, modalidadesDoEvento(e)).filter((p) => !jaTem(p.titulo)).map((p) => p.id)));
    };
    const copiar = () => {
        const novas = marcarEstoqueParaRevisar(perguntas.filter((p) => marcadas.has(p.id)).map((p) => copiarPergunta(p, r)));
        atualizar((a) => ({ ...a, perguntas: [...a.perguntas, ...novas] }));
        const comEstoque = novas.filter((p) => p.opcoes.some((o) => o.aDefinir)).length;
        toast.success(
            `${novas.length === 1 ? "1 pergunta copiada" : `${novas.length} perguntas copiadas`} para ${t.todasAsDuas.toLowerCase()}${comEstoque ? ". Defina as quantidades das opções" : ""}`,
        );
        fechar();
    };

    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && fechar()} isDismissable>
            <Modal className="max-w-lg">
                <Dialog aria-label="Copiar perguntas de outro evento">
                    <div className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary_alt">
                        <div className="flex shrink-0 flex-col gap-4 px-5 pt-5 pb-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="text-md font-semibold text-primary">Copiar perguntas de outro evento</h2>
                                    <p className="text-sm text-tertiary">
                                        {evento
                                            ? `Entram para ${t.todasAsDuas.toLowerCase()}. Depois você ajusta onde cada uma aparece.`
                                            : "Escolha o evento de onde vêm as perguntas."}
                                    </p>
                                </div>
                                <ButtonUtility size="sm" color="tertiary" icon={XClose} onClick={fechar} tooltip="Fechar" />
                            </div>
                            {!evento && <Input aria-label="Buscar evento" icon={SearchLg} placeholder="Busque pelo nome do evento" value={busca} onChange={setBusca} />}
                            {evento && (
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="min-w-0 truncate font-medium text-secondary">{rotuloDoEvento(evento)}</span>
                                    <Button size="sm" color="link-color" onClick={() => setEventoId(null)}>
                                        Trocar evento
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto border-t border-secondary px-5 py-2">
                            {!evento ? (
                                eventos.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-tertiary">Nenhum evento encontrado.</p>
                                ) : (
                                    <ul className="flex flex-col gap-0.5">
                                        {eventos.map((e) => (
                                            <li key={e.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => escolher(e.id)}
                                                    className="w-full cursor-pointer rounded-lg p-3 text-left text-sm text-secondary outline-focus-ring transition duration-100 ease-linear hover:bg-secondary focus-visible:outline-2"
                                                >
                                                    {rotuloDoEvento(e)}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )
                            ) : (
                                <ul className="flex flex-col gap-0.5">
                                    {perguntas.map((p) => (
                                        <li key={p.id} className={cx("rounded-lg p-3 transition duration-100 ease-linear hover:bg-secondary")}>
                                            <Checkbox
                                                isSelected={marcadas.has(p.id)}
                                                onChange={(sim) =>
                                                    setMarcadas((s) => {
                                                        const n = new Set(s);
                                                        if (sim) n.add(p.id);
                                                        else n.delete(p.id);
                                                        return n;
                                                    })
                                                }
                                                label={p.titulo}
                                                hint={[
                                                    labelDe(TIPOS_DE_RESPOSTA, p.tipo),
                                                    p.opcoes.length ? `${p.opcoes.length} opções` : null,
                                                    jaTem(p.titulo) ? "já está no formulário" : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-secondary px-5 py-4">
                            <Button size="md" color="secondary" onClick={fechar}>
                                Cancelar
                            </Button>
                            <Button size="md" color="primary" isDisabled={!evento || marcadas.size === 0} onClick={copiar}>
                                Copiar{marcadas.size > 0 && evento ? ` (${marcadas.size})` : ""}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
