import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { SearchLg, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Surgir } from "@/components/foundations/transicao";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { SEGMENTACOES_PNE, useSegmentacoesDaOrganizacao } from "../../components/segmentacoes-da-organizacao";
import { useProtecaoDeDescarte } from "./protecao-de-descarte";

/** Antigo: a lista agora vem das segmentações da organização (SEG). Mantido para quem ainda importa. */
export const SEGMENTACOES = SEGMENTACOES_PNE;

export const JUSTIFICATIVAS = [
    { id: "ilegivel", label: "Documentação ilegível" },
    { id: "invalido", label: "Documento inválido" },
    { id: "inconsistente", label: "Dados inconsistentes" },
    { id: "laudo", label: "Laudo insuficiente" },
    { id: "outro", label: "Outro motivo" },
];

const MAX_MOTIVO = 60;

interface DecisaoModalProps {
    isOpen: boolean;
    variant: "aprovar" | "rejeitar";
    /** Quem está sendo aprovado ou reprovado: nome e documento no topo do modal (PUB-110). */
    pessoa?: { nome: string; documento: string };
    onClose: () => void;
    onConfirmar: (opcaoId: string, textoLivre?: string) => void;
}

/** Casca dos dois modais: modal do DS com o título ligado ao diálogo (slot "title"), para leitor de tela (PUB-103). */
function CascaDoModal({ isOpen, aoPedirParaFechar, isDismissable, children }: { isOpen: boolean; aoPedirParaFechar: () => void; isDismissable: boolean; children: ReactNode }) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && aoPedirParaFechar()} isDismissable={isDismissable}>
            <Modal className="max-w-[560px]">
                <Dialog className="max-h-[85dvh] flex-col items-stretch justify-start overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                    {children}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

/** Topo dos modais: título, quem está sendo decidido e o aviso de que a decisão não volta (PUB-110). */
function Topo({ titulo, pessoa, aviso, onFechar }: { titulo: string; pessoa?: DecisaoModalProps["pessoa"]; aviso: string; onFechar: () => void }) {
    return (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div className="flex min-w-0 flex-col gap-1">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                    {titulo}
                </AriaHeading>
                {pessoa && (
                    <p className="text-sm text-secondary">
                        <span className="font-semibold">{pessoa.nome}</span>, documento {pessoa.documento}
                    </p>
                )}
                <p className="text-sm text-tertiary">{aviso}</p>
            </div>
            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onFechar} />
        </div>
    );
}

/** Modal de decisão: aprovar (busca + lista de segmentações) ou reprovar (lista de justificativas). */
export function DecisaoModal({ isOpen, variant, pessoa, onClose, onConfirmar }: DecisaoModalProps) {
    // Segmentações gravadas na organização (SEG-50).
    const { opcoes } = useSegmentacoesDaOrganizacao();
    const [valor, setValor] = useState<string | null>(null);
    const [busca, setBusca] = useState("");
    const [justificativaLivre, setJustificativaLivre] = useState("");

    useEffect(() => {
        if (isOpen) {
            setValor(null);
            setBusca("");
            setJustificativaLivre("");
        }
    }, [isOpen, variant]);

    // Escolha feita ou motivo digitado: fechar sem querer pergunta antes (PUB-108).
    const protecao = useProtecaoDeDescarte({ aberto: isOpen, alterado: valor !== null || justificativaLivre.trim().length > 0, onFechar: onClose, descricao: "Nada foi decidido. O pedido continua pendente." });

    const segmentacoesFiltradas = useMemo(() => {
        const query = busca.trim().toLowerCase();
        if (!query) return opcoes;
        return opcoes.filter((s) => s.label.toLowerCase().includes(query));
    }, [busca, opcoes]);

    if (variant === "aprovar") {
        return (
            <>
                <CascaDoModal isOpen={isOpen} aoPedirParaFechar={protecao.pedirParaFechar} isDismissable={protecao.isDismissable}>
                    <Topo
                        titulo="Aprovar pedido"
                        pessoa={pessoa}
                        aviso="Escolha a segmentação em que a pessoa entra. A aprovação não pode ser desfeita."
                        onFechar={protecao.pedirParaFechar}
                    />

                    <div className="px-6 pt-5">
                        <Input size="md" icon={SearchLg} aria-label="Buscar segmentação" placeholder="Buscar segmentação" value={busca} onChange={setBusca} />
                    </div>

                    <div className="mt-4 max-h-[320px] min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-3">
                        {segmentacoesFiltradas.length === 0 ? (
                            <p role="status" className="px-2 py-6 text-center text-sm text-tertiary">
                                Nenhuma segmentação encontrada.
                            </p>
                        ) : (
                            <RadioGroup size="md" value={valor} onChange={setValor} className="gap-0" aria-label="Segmentação">
                                {segmentacoesFiltradas.map((seg) => (
                                    <RadioButton
                                        key={seg.id}
                                        value={seg.id}
                                        label={seg.label}
                                        className="cursor-pointer items-center rounded-lg px-2 py-3 transition duration-100 ease-linear hover:bg-secondary"
                                    />
                                ))}
                            </RadioGroup>
                        )}
                    </div>

                    <div className="flex gap-3 border-t border-secondary px-6 py-4">
                        <Button size="lg" color="secondary" className="flex-1" onClick={protecao.pedirParaFechar}>
                            Cancelar
                        </Button>
                        <Button size="lg" color="primary" className="flex-1" isDisabled={!valor} onClick={() => valor && onConfirmar(valor)}>
                            Aprovar pedido
                        </Button>
                    </div>
                </CascaDoModal>
                {protecao.confirmacao}
            </>
        );
    }

    const precisaJustificativaLivre = valor === "outro";
    const podeConfirmar = !!valor && (!precisaJustificativaLivre || justificativaLivre.trim().length > 0);

    return (
        <>
            <CascaDoModal isOpen={isOpen} aoPedirParaFechar={protecao.pedirParaFechar} isDismissable={protecao.isDismissable}>
                <Topo
                    titulo="Reprovar pedido"
                    pessoa={pessoa}
                    aviso="Escolha o motivo. Ele fica registrado no pedido. A reprovação não pode ser desfeita."
                    onFechar={protecao.pedirParaFechar}
                />

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-secondary px-6 py-3">
                    <RadioGroup size="md" value={valor} onChange={setValor} className="gap-0" aria-label="Motivo">
                        {JUSTIFICATIVAS.map((just) => (
                            <RadioButton
                                key={just.id}
                                value={just.id}
                                label={just.label}
                                className="cursor-pointer items-center rounded-lg px-2 py-3 transition duration-100 ease-linear hover:bg-secondary"
                            />
                        ))}
                    </RadioGroup>

                    {/* "Outro motivo": o campo entra com a altura animada; o contador fica sempre visível (PUB-111). */}
                    <Surgir visivel={precisaJustificativaLivre}>
                        <div className="pt-3 pr-0.5 pb-1 pl-2">
                            <Input
                                size="md"
                                label="Descreva o motivo"
                                isRequired
                                placeholder="Ex.: Laudo sem a assinatura do médico"
                                maxLength={MAX_MOTIVO}
                                value={justificativaLivre}
                                onChange={setJustificativaLivre}
                                hint={`${justificativaLivre.length}/${MAX_MOTIVO} caracteres`}
                            />
                        </div>
                    </Surgir>
                </div>

                <div className="flex gap-3 border-t border-secondary px-6 py-4">
                    <Button size="lg" color="secondary" className="flex-1" onClick={protecao.pedirParaFechar}>
                        Cancelar
                    </Button>
                    <Button
                        size="lg"
                        color="primary"
                        className="flex-1"
                        isDisabled={!podeConfirmar}
                        onClick={() => valor && onConfirmar(valor, precisaJustificativaLivre ? justificativaLivre.trim() : undefined)}
                    >
                        Reprovar pedido
                    </Button>
                </div>
            </CascaDoModal>
            {protecao.confirmacao}
        </>
    );
}
