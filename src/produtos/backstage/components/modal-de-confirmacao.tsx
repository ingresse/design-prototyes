import type { FC, ReactNode } from "react";
import { AlertTriangle, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/*
 * Confirmação de ação: título, consequência, Voltar e a ação. Destrutiva (excluir, desvincular) usa
 * o vermelho; sem `onConfirmar`, vira aviso de um botão só ("Entendi"). Enquanto grava, não fecha.
 */
export function ModalDeConfirmacao({
    aberto,
    titulo,
    descricao,
    confirmar,
    cancelar = "Voltar",
    destrutiva = false,
    icone = AlertTriangle,
    carregando = false,
    onConfirmar,
    onFechar,
}: {
    aberto: boolean;
    titulo: string;
    descricao: ReactNode;
    confirmar: string;
    cancelar?: string;
    destrutiva?: boolean;
    icone?: FC<{ className?: string }>;
    carregando?: boolean;
    onConfirmar?: () => void;
    onFechar: () => void;
}) {
    const fechar = () => !carregando && onFechar();
    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(o) => !o && fechar()} isDismissable={!carregando}>
            <Modal>
                <Dialog aria-label={titulo}>
                    <div className="relative w-full max-w-md rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={fechar} isDisabled={carregando} className="absolute top-4 right-4" />
                        <div className="flex flex-col gap-4">
                            <FeaturedIcon icon={icone} color={destrutiva ? "error" : "gray"} theme="light" size="lg" />
                            <div className="flex flex-col gap-1 pr-8">
                                <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
                                <div className="text-sm text-tertiary">{descricao}</div>
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            {onConfirmar ? (
                                <>
                                    <Button size="lg" color="secondary" onClick={fechar} isDisabled={carregando}>
                                        {cancelar}
                                    </Button>
                                    <Button size="lg" color={destrutiva ? "primary-destructive" : "primary"} onClick={onConfirmar} isLoading={carregando} showTextWhileLoading>
                                        {confirmar}
                                    </Button>
                                </>
                            ) : (
                                <Button size="lg" color="primary" onClick={fechar}>
                                    {confirmar}
                                </Button>
                            )}
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
