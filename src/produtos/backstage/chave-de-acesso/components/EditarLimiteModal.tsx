import { useEffect, useState } from "react";
import { Edit01, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { CampoNumero } from "../../components/campo-numero";

/*
 * Editar o limite de uso das Passkeys selecionadas (CHA-35, CHA-43): vazio = ilimitado; o novo limite
 * não pode ficar abaixo do maior uso entre elas (o mesmo que a edição na linha, CHA-33).
 */

const TITULO = "Editar limite de uso";

interface EditarLimiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Maior uso entre as Passkeys selecionadas. */
    usoMaximo?: number;
    /** Novo limite. `null` = ilimitado (campo vazio). */
    onSave: (limit: number | null) => void;
}

export function EditarLimiteModal({ isOpen, onClose, usoMaximo = 0, onSave }: EditarLimiteModalProps) {
    const [valor, setValor] = useState<number | undefined>();
    const [tentou, setTentou] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setValor(undefined);
            setTentou(false);
        }
    }, [isOpen]);

    const erro = valor != null && valor < usoMaximo ? `Use ${usoMaximo.toLocaleString("pt-BR")} ou mais: uma das Passkeys já foi usada ${usoMaximo.toLocaleString("pt-BR")} vezes.` : undefined;

    const salvar = () => {
        setTentou(true);
        if (erro) return;
        onSave(valor ?? null);
    };

    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal>
                <Dialog aria-label={TITULO}>
                    <div className="relative w-full max-w-md rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                        <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onClose} className="absolute top-4 right-4" />
                        <div className="flex flex-col gap-4">
                            <FeaturedIcon icon={Edit01} color="gray" theme="light" size="lg" />
                            <div className="flex flex-col gap-1 pr-8">
                                <h2 className="text-lg font-semibold text-primary">{TITULO}</h2>
                                <p className="text-sm text-tertiary">Ao atingir o limite, a Passkey para de funcionar, mas os itens continuam ocultos.</p>
                            </div>
                        </div>

                        <form
                            noValidate
                            className="mt-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                salvar();
                            }}
                        >
                            <CampoNumero label="Limite de uso" placeholder="Ilimitado" valor={valor} vazio minimo={1} onChange={setValor} isInvalid={tentou && !!erro} hint={tentou && erro ? erro : "Deixe vazio para não ter limite."} />
                        </form>

                        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button size="lg" color="secondary" onClick={onClose}>
                                Voltar
                            </Button>
                            <Button size="lg" color="primary" onClick={salvar}>
                                Salvar novo limite
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
