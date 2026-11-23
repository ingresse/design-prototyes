import { useEffect, useMemo, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { SearchLg, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { useProtecaoDeDescarte } from "./protecao-de-descarte";

export interface EventoDisponivel {
    id: string;
    titulo: string;
    /** Data do evento, já formatada ("26 nov 2026, 20:00"). */
    data?: string;
}

/** Eventos da organização que ainda não têm formulário (PUB-94); vêm de quem abre o modal. */

interface SelecionarEventoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinuar: (eventoId: string) => void;
    eventos: EventoDisponivel[];
    /** Evento já escolhido (volta do modal de configuração, PUB-106). */
    eventoInicial?: string | null;
}

/** Modal "Novo formulário": seleção do evento que utilizará o formulário. */
export function SelecionarEventoModal({ isOpen, onClose, onContinuar, eventos, eventoInicial = null }: SelecionarEventoModalProps) {
    const [busca, setBusca] = useState("");
    const [eventoId, setEventoId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setBusca("");
            setEventoId(eventoInicial);
        }
    }, [isOpen, eventoInicial]);
    const protecao = useProtecaoDeDescarte({ aberto: isOpen, alterado: eventoId !== null, onFechar: onClose, titulo: "Descartar o novo formulário?", descricao: "O formulário não será criado." });

    const eventosFiltrados = useMemo(() => {
        const query = busca.trim().toLowerCase();
        if (!query) return eventos;
        return eventos.filter((e) => e.titulo.toLowerCase().includes(query) || (e.data ?? "").toLowerCase().includes(query));
    }, [busca, eventos]);

    return (
        // Modal do DS; o título (slot "title") dá o nome do diálogo para leitor de tela (PUB-103).
        <>
            <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && protecao.pedirParaFechar()} isDismissable={protecao.isDismissable}>
                <Modal className="max-w-[560px]">
                    <Dialog className="max-h-[85dvh] flex-col items-stretch justify-start overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex items-start justify-between gap-4 px-6 pt-6">
                            <div className="flex flex-col gap-1">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Escolha o evento do formulário
                                </AriaHeading>
                                <p className="text-sm text-tertiary">
                                    Cada evento tem um formulário. Aparecem os eventos que ainda não têm formulário e não terminaram.
                                </p>
                            </div>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={protecao.pedirParaFechar} />
                        </div>

                        <div className="px-6 pt-5">
                            <Input
                                size="md"
                                icon={SearchLg}
                                aria-label="Buscar evento"
                                placeholder="Buscar por nome ou data"
                                value={busca}
                                onChange={setBusca}
                            />
                        </div>

                        <div className="mt-4 max-h-[320px] min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-3">
                            {eventosFiltrados.length === 0 ? (
                                <p role="status" className="px-2 py-6 text-center text-sm text-tertiary">
                                    {eventos.length === 0 ? "Todos os eventos em andamento já têm formulário." : "Nenhum evento encontrado."}
                                </p>
                            ) : (
                                <RadioGroup size="md" value={eventoId} onChange={setEventoId} className="gap-0" aria-label="Evento">
                                    {eventosFiltrados.map((evento) => (
                                        <RadioButton
                                            key={evento.id}
                                            value={evento.id}
                                            label={evento.titulo}
                                            hint={evento.data}
                                            className="cursor-pointer rounded-lg px-2 py-3 transition duration-100 ease-linear hover:bg-secondary"
                                        />
                                    ))}
                                </RadioGroup>
                            )}
                        </div>

                        <div className="flex gap-3 border-t border-secondary px-6 py-4">
                            <Button size="lg" color="secondary" className="flex-1" onClick={protecao.pedirParaFechar}>
                                Cancelar
                            </Button>
                            <Button
                                size="lg"
                                color="primary"
                                className="flex-1"
                                isDisabled={!eventoId}
                                onClick={() => eventoId && onContinuar(eventoId)}
                            >
                                Continuar
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
            {protecao.confirmacao}
        </>
    );
}
