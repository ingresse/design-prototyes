import { LinkExternal01, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import type { PlataformaDePixel } from "../data/plataformas";

/** Instruções da plataforma (PIX-04): o que é o pixel e as páginas oficiais, abertas em outra aba. */
export function ModalDeInstrucoes({ plataforma, onFechar }: { plataforma: PlataformaDePixel | null; onFechar: () => void }) {
    const p = plataforma;
    return (
        <ModalOverlay isOpen={!!p} onOpenChange={(o) => !o && onFechar()} isDismissable>
            <Modal>
                <Dialog aria-label={p?.instrucoes.titulo}>
                    {p && (
                        <div className="relative w-full max-w-lg rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={onFechar} className="absolute top-4 right-4" />
                            <div className="flex flex-col gap-4 pr-8">
                                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-fg-secondary">
                                    <p.marca className="size-6" />
                                </span>
                                <h2 className="text-lg font-semibold text-primary">{p.instrucoes.titulo}</h2>
                            </div>
                            <div className="mt-2 flex flex-col gap-4 text-sm text-tertiary">
                                <p>{p.instrucoes.texto}</p>
                                <p>{p.instrucoes.introducao}</p>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {p.instrucoes.links.map((l) => (
                                    <Button key={l.href} color="secondary" size="md" iconTrailing={LinkExternal01} href={l.href} target="_blank" rel="noreferrer">
                                        {l.rotulo}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
