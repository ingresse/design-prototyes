import { createContext, useContext, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { DragControls } from "motion/react";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { Rascunho } from "../data/tipos";
import { useFormulario } from "./contexto";

/* ------------------------------------------------------------------ */
/*  Reordenar por arraste (v0.5, SCE-164), como a tela de Ingressos do */
/*  AWA (backstage/ingressos/pages/Ingressos.tsx): alça ⠿ que aparece  */
/*  no hover, arraste com o Reorder do motion e, ao soltar com a ordem */
/*  mudada, o modal "Confirmar alteração da ordem…". Cancelar volta a  */
/*  ordem de antes. Teclado: foco na alça e seta para cima ou para     */
/*  baixo move um passo e pede a mesma confirmação.                    */
/* ------------------------------------------------------------------ */

/** O que mudou de lugar, para o texto do modal. */
export interface Reordenacao {
    titulo: string;
    texto: ReactNode;
}

interface Ctx {
    iniciar: (r: Reordenacao) => void;
    terminar: () => void;
    /** Teclado: guarda a ordem, aplica o passo e pede confirmação. */
    moverComTeclado: (r: Reordenacao, aplicar: () => void) => void;
}

const OrdemCtx = createContext<Ctx | null>(null);

export const useOrdem = () => {
    const c = useContext(OrdemCtx);
    if (!c) throw new Error("useOrdem fora do ProvedorDeOrdem");
    return c;
};

/** Assinatura da ordem (modalidades › categorias e perguntas), para saber se o arraste mudou algo. */
const assinatura = (r: Pick<Rascunho, "modalidades" | "perguntas">) =>
    `${r.modalidades.map((m) => `${m.id}:${m.categorias.map((c) => c.id).join(",")}`).join("|")}#${r.perguntas.map((p) => p.id).join(",")}`;

export function ProvedorDeOrdem({ children }: { children: ReactNode }) {
    const { rascunho, atualizar } = useFormulario();
    const atual = useRef(rascunho);
    atual.current = rascunho;
    const antes = useRef<Pick<Rascunho, "modalidades" | "perguntas"> | null>(null);
    const contexto = useRef<Reordenacao | null>(null);
    const [pendente, setPendente] = useState<Reordenacao | null>(null);

    const limpar = () => {
        antes.current = null;
        contexto.current = null;
        setPendente(null);
    };
    const valor: Ctx = {
        iniciar: (r) => {
            antes.current = { modalidades: atual.current.modalidades, perguntas: atual.current.perguntas };
            contexto.current = r;
        },
        terminar: () => {
            // Espera o último onReorder chegar ao rascunho antes de comparar.
            requestAnimationFrame(() => {
                if (antes.current && contexto.current && assinatura(antes.current) !== assinatura(atual.current)) setPendente(contexto.current);
                else limpar();
            });
        },
        moverComTeclado: (r, aplicar) => {
            antes.current = { modalidades: atual.current.modalidades, perguntas: atual.current.perguntas };
            contexto.current = r;
            aplicar();
            requestAnimationFrame(() => setPendente(r));
        },
    };
    const cancelar = () => {
        const a = antes.current;
        if (a) atualizar((r) => ({ ...r, modalidades: a.modalidades, perguntas: a.perguntas }));
        limpar();
    };

    return (
        <OrdemCtx.Provider value={valor}>
            {children}
            <ModalOverlay isOpen={!!pendente} onOpenChange={(v) => !v && cancelar()} isDismissable>
                <Modal className="sm:max-w-md">
                    <Dialog aria-label={pendente?.titulo ?? "Confirmar ordem"}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-lg font-semibold text-primary">{pendente?.titulo}</h2>
                                <p className="text-sm text-tertiary">{pendente?.texto}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button size="md" color="secondary" onClick={cancelar}>
                                    Cancelar
                                </Button>
                                <Button size="md" color="primary" onClick={limpar}>
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </OrdemCtx.Provider>
    );
}

/** Ícone ⠿ com 2 colunas de pontos (o mesmo da tela de Ingressos do AWA). */
export function GripVertical({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
        </svg>
    );
}

/**
 * Alça de arraste. `flutuante`: colada na borda esquerda e só no hover do grupo (`group/alca`), como no AWA;
 * senão, fica no fluxo (linhas de pergunta). Sempre focável: setas do teclado movem o item.
 */
export function Alca({
    controles,
    rotulo,
    onMover,
    podeSubir,
    podeDescer,
    flutuante,
    className,
}: {
    controles: DragControls;
    rotulo: string;
    onMover: (direcao: -1 | 1) => void;
    podeSubir: boolean;
    podeDescer: boolean;
    flutuante?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            aria-label={`${rotulo}. Arraste ou use as setas para cima e para baixo para mudar a ordem`}
            title="Arraste para mudar a ordem"
            onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                e.preventDefault();
                controles.start(e);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === "ArrowUp" && podeSubir) {
                    e.preventDefault();
                    onMover(-1);
                }
                if (e.key === "ArrowDown" && podeDescer) {
                    e.preventDefault();
                    onMover(1);
                }
            }}
            className={cx(
                "flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-secondary focus-visible:outline-2 active:cursor-grabbing",
                flutuante
                    ? "absolute top-1/2 -left-3 z-10 -translate-y-1/2 bg-tertiary p-1 text-fg-secondary opacity-0 shadow-sm ring-1 ring-border-secondary group-hover/alca:opacity-100 focus-visible:opacity-100"
                    : "size-6",
                className,
            )}
        >
            <GripVertical className="size-4" />
        </button>
    );
}
