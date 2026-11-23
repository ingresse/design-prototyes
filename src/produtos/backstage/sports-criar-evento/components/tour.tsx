import { useEffect, useState, type FC } from "react";
import { Calendar, CalendarCheck01, CheckCircle, ClipboardCheck, Flag01, Rocket01, Tag01 } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import { TITULO_FORMULARIO, TITULO_VENDAS } from "../data/opcoes";
import { useVocabulario } from "../data/vocabulario";

/* ------------------------------------------------------------------ */
/*  Tour guiado no primeiro acesso (RN-11, SCE-130)                    */
/*  v0.62: 7 telas curtas no fluxo de hoje (como funciona, os 5 passos */
/*  e os lotes). Pular, Anterior, Próximo e Concluir.      */
/*  Lembra que a pessoa já viu (localStorage); "Rever tour" na Ajuda   */
/*  reabre. Modal do DS: foco preso, Esc fecha, setas trocam o passo.  */
/* ------------------------------------------------------------------ */

const CHAVE = "sports-criar-evento-tour-visto";

const jaViu = () => {
    try {
        return localStorage.getItem(CHAVE) === "1";
    } catch {
        return false;
    }
};
const marcarVisto = () => {
    try {
        localStorage.setItem(CHAVE, "1");
    } catch {
        /* sem armazenamento: o tour volta na próxima visita */
    }
};

/** Abre sozinho no primeiro acesso; `abrir` reabre pelo "Rever tour". */
export function useTour() {
    const [aberto, setAberto] = useState(false);
    useEffect(() => {
        if (!jaViu()) setAberto(true);
    }, []);
    return {
        aberto,
        abrir: () => setAberto(true),
        fechar: () => {
            marcarVisto();
            setAberto(false);
        },
    };
}

export function Tour({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
    const { t } = useVocabulario();
    const [passo, setPasso] = useState(0);
    // v0.62 (SCE-331): o fluxo de hoje, uma ideia por passo, em uma ou duas frases.
    const passos: { icone: FC<{ className?: string }>; titulo: string; texto: string }[] = [
        { icone: Rocket01, titulo: "Como funciona", texto: t.tourIntro },
        { icone: CalendarCheck01, titulo: "Evento", texto: "Nome, esporte, data da largada, local e as regras da inscrição." },
        { icone: Flag01, titulo: t.tituloDaSecao, texto: t.tourNiveis },
        { icone: Tag01, titulo: "Lotes", texto: t.tourLote },
        { icone: ClipboardCheck, titulo: TITULO_FORMULARIO, texto: t.tourFormulario },
        { icone: Calendar, titulo: TITULO_VENDAS, texto: t.tourVendas },
        { icone: CheckCircle, titulo: "Revisar e publicar", texto: "Confira tudo e publique. Produtos adicionais e outros extras você ativa quando quiser, pelo menu do evento." },
    ];
    const atual = passos[passo];
    const ultimo = passo === passos.length - 1;
    const fechar = () => {
        setPasso(0);
        onFechar();
    };

    return (
        <ModalOverlay isOpen={aberto} onOpenChange={(v) => !v && fechar()} isDismissable>
            <Modal className="sm:max-w-md">
                <Dialog aria-label="Tour: como criar o evento">
                    <div
                        className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary"
                        onKeyDown={(e) => {
                            if (e.key === "ArrowRight" && !ultimo) setPasso((p) => p + 1);
                            if (e.key === "ArrowLeft" && passo > 0) setPasso((p) => p - 1);
                        }}
                    >
                        <FeaturedIcon icon={atual.icone} color="brand" theme="modern" size="lg" />
                        <div className="flex flex-col gap-1" aria-live="polite">
                            <p className="text-sm text-tertiary">
                                Passo {passo + 1} de {passos.length}
                            </p>
                            <h2 className="text-lg font-semibold text-primary">{atual.titulo}</h2>
                            <p className="text-md text-tertiary">{atual.texto}</p>
                        </div>
                        <div className="flex gap-1.5" aria-hidden="true">
                            {passos.map((_, i) => (
                                <span key={i} className={cx("h-1.5 flex-1 rounded-full", i <= passo ? "bg-brand-solid" : "bg-quaternary")} />
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button color="tertiary" size="md" onClick={fechar} className="mr-auto">
                                Pular
                            </Button>
                            {passo > 0 && (
                                <Button color="secondary" size="md" onClick={() => setPasso((p) => p - 1)}>
                                    Anterior
                                </Button>
                            )}
                            <Button color="primary" size="md" autoFocus onClick={() => (ultimo ? fechar() : setPasso((p) => p + 1))}>
                                {ultimo ? "Concluir" : "Próximo"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
