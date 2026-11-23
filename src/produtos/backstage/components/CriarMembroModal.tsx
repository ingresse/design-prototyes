import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { XClose } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { CheckboxSelect } from "./CheckboxSelect";
import { ModalDeConfirmacao } from "./modal-de-confirmacao";
import { addMembro, editarMembro, useCargos, useGrupos, useMembros, type Membro } from "./membros-store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 30;

/** O que falta no e-mail, para o erro começar pela ação (MEM-70). `null` quando está certo. */
function problemaDoEmail(email: string): string | null {
    if (EMAIL_REGEX.test(email)) return null;
    const arrobas = email.split("@").length - 1;
    if (arrobas === 0) return "falta o @";
    if (arrobas > 1) return "tem mais de um @";
    const [nome, dominio] = email.split("@");
    if (!nome) return "falta o nome antes do @";
    if (!dominio) return "falta o domínio";
    return "falta o final do domínio, como .com";
}

/**
 * Casca dos modais de Membros (MEM-75, MEM-76): o modal do DS preso ao topo da tela (cresce para baixo, sem
 * mudar de lugar enquanto a pessoa escolhe), em tela cheia no celular com o rodapé no pé. Com algo preenchido,
 * clicar fora não fecha e Esc, "Cancelar" e o X perguntam antes de descartar.
 */
export function CascaDoModalDeMembros({
    isOpen,
    titulo,
    alterado,
    onFechar,
    rodape,
    largura = "sm:max-w-[520px]",
    children,
}: {
    isOpen: boolean;
    titulo: string;
    alterado: boolean;
    onFechar: () => void;
    rodape: (pedirParaFechar: () => void) => ReactNode;
    largura?: string;
    children: ReactNode;
}) {
    const [perguntando, setPerguntando] = useState(false);
    useEffect(() => {
        if (!isOpen) setPerguntando(false);
    }, [isOpen]);
    const pedirParaFechar = () => (alterado ? setPerguntando(true) : onFechar());

    return (
        <>
            <ModalOverlay
                isOpen={isOpen}
                onOpenChange={(o) => !o && pedirParaFechar()}
                isDismissable={!alterado}
                className="max-sm:items-stretch max-sm:p-0 sm:items-start sm:pt-[8vh]"
            >
                <Modal className={cx("max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none", largura)}>
                    <Dialog className="items-stretch max-sm:min-h-full">
                        <div className="flex w-full flex-col rounded-2xl bg-primary shadow-xl ring-1 ring-secondary max-sm:min-h-dvh max-sm:rounded-none max-sm:ring-0">
                            <div className="flex items-start justify-between gap-3 px-6 pt-6">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    {titulo}
                                </AriaHeading>
                                <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={pedirParaFechar} className="-m-1" />
                            </div>
                            <div className="flex flex-col gap-5 px-6 pt-5 pb-6">{children}</div>
                            <div className="grid grid-cols-2 gap-3 px-6 pb-6 max-sm:sticky max-sm:bottom-0 max-sm:mt-auto max-sm:border-t max-sm:border-secondary max-sm:bg-primary max-sm:pt-4">
                                {rodape(pedirParaFechar)}
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
            <ModalDeConfirmacao
                aberto={perguntando}
                titulo="Descartar o que você preencheu?"
                descricao="O que você preencheu ainda não foi salvo."
                cancelar="Continuar editando"
                confirmar="Descartar"
                destrutiva
                onConfirmar={() => {
                    setPerguntando(false);
                    onFechar();
                }}
                onFechar={() => setPerguntando(false)}
            />
        </>
    );
}

interface CriarMembroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCriado?: (membros: Membro[]) => void;
    defaultCargoId?: string;
    /** Quando informado, o modal edita os cargos e grupos deste membro. */
    membro?: Membro;
}

const mesmoConjunto = (a: Set<string>, b: string[]) => a.size === new Set(b).size && b.every((x) => a.has(x));

export function CriarMembroModal({ isOpen, onClose, onCriado, defaultCargoId, membro }: CriarMembroModalProps) {
    const grupos = useGrupos();
    const todosCargos = useCargos();
    const membrosAtuais = useMembros();
    const editando = Boolean(membro);
    const emailsId = useId();
    const emailsHintId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [emails, setEmails] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [cargos, setCargos] = useState<Set<string>>(new Set());
    const [gruposSel, setGruposSel] = useState<Set<string>>(new Set());
    // Erros do que ficou no campo (e-mail com problema ou de quem já é membro, MEM-70).
    const [errosDoCampo, setErrosDoCampo] = useState<string[]>([]);
    // Os erros de "informe/selecione" só aparecem depois de tentar salvar (MEM-71).
    const [tentou, setTentou] = useState(false);
    // Clique em andamento fora do campo: o e-mail só vira chip depois de soltar, para nada mudar de lugar sob o ponteiro (MEM-75).
    const ponteiroPressionado = useRef(false);

    const cargosIniciais = useMemo(() => membro?.cargoIds ?? (defaultCargoId ? [defaultCargoId] : []), [membro, defaultCargoId]);

    useEffect(() => {
        if (isOpen) {
            setEmails([]);
            setInput("");
            setErrosDoCampo([]);
            setTentou(false);
            setCargos(new Set(cargosIniciais));
            setGruposSel(new Set(membro?.grupoIds ?? []));
        }
    }, [isOpen, cargosIniciais, membro]);

    useEffect(() => {
        if (!isOpen) return;
        const descer = () => (ponteiroPressionado.current = true);
        const subir = () => setTimeout(() => (ponteiroPressionado.current = false), 0);
        window.addEventListener("pointerdown", descer, true);
        window.addEventListener("pointerup", subir, true);
        window.addEventListener("pointercancel", subir, true);
        return () => {
            window.removeEventListener("pointerdown", descer, true);
            window.removeEventListener("pointerup", subir, true);
            window.removeEventListener("pointercancel", subir, true);
        };
    }, [isOpen]);

    const jaMembros = useMemo(() => new Set(membrosAtuais.map((m) => m.email.toLowerCase())), [membrosAtuais]);

    /**
     * Transforma o texto em chips. O que tem problema ou já é membro fica no campo, com o erro
     * abaixo, para a pessoa corrigir ali mesmo. Devolve a lista de chips e se algo ficou no campo.
     */
    const addEmails = (raw: string) => {
        const partes = raw
            .split(/[\s,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const set = new Set(emails);
        const ficam: string[] = [];
        const erros: string[] = [];
        for (const e of partes) {
            const problema = problemaDoEmail(e);
            if (problema) {
                ficam.push(e);
                erros.push(`Corrija o e-mail${partes.length > 1 ? ` ${e}` : ""}: ${problema}`);
            } else if (jaMembros.has(e)) {
                ficam.push(e);
                erros.push(`Já é membro: ${e}. Apague do campo ou edite o membro na lista.`);
            } else if (set.size < MAX_EMAILS) {
                set.add(e);
            }
        }
        setEmails([...set]);
        setInput(ficam.join(", "));
        setErrosDoCampo(erros);
        return { lista: [...set], comErro: erros.length > 0 };
    };
    const removeEmail = (e: string) => setEmails((prev) => prev.filter((x) => x !== e));

    const cargoOptions = useMemo(() => todosCargos.map((c) => ({ id: c.id, label: c.nome })), [todosCargos]);

    const alterado = editando
        ? !mesmoConjunto(cargos, membro?.cargoIds ?? []) || !mesmoConjunto(gruposSel, membro?.grupoIds ?? [])
        : emails.length > 0 || input.trim().length > 0 || !mesmoConjunto(cargos, cargosIniciais) || gruposSel.size > 0;

    const handleSalvar = () => {
        setTentou(true);
        // O que ficou digitado entra antes de validar (sem precisar de Enter).
        let lista = emails;
        if (!editando && input.trim()) {
            const r = addEmails(input);
            if (r.comErro) {
                requestAnimationFrame(() => inputRef.current?.focus());
                return;
            }
            lista = r.lista;
        }
        if (!editando && lista.length === 0) {
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
        }
        if (cargos.size === 0 || gruposSel.size === 0) return;
        if (membro) {
            editarMembro(membro.id, {
                cargoIds: [...cargos],
                grupoIds: [...gruposSel],
            });
            toast.success(`Membro "${membro.email}" atualizado`);
            onClose();
            return;
        }
        const novos: Membro[] = lista.map((email) => ({
            id: crypto.randomUUID(),
            email,
            cargoIds: [...cargos],
            grupoIds: [...gruposSel],
        }));
        novos.forEach(addMembro);
        toast.success(novos.length === 1 ? `Membro "${novos[0].email}" adicionado` : `${novos.length} membros adicionados`);
        onCriado?.(novos);
        onClose();
    };

    const erroDosEmails = errosDoCampo.length > 0 ? errosDoCampo : tentou && !editando && emails.length === 0 && !input.trim() ? ["Informe ao menos um e-mail."] : [];

    return (
        <CascaDoModalDeMembros
            isOpen={isOpen}
            titulo={editando ? "Editar membro" : "Adicionar membro"}
            alterado={alterado}
            onFechar={onClose}
            rodape={(pedirParaFechar) => (
                <>
                    <Button size="md" color="secondary" onClick={pedirParaFechar}>
                        Cancelar
                    </Button>
                    <Button size="md" color="primary" onClick={handleSalvar}>
                        {editando ? "Salvar alterações" : emails.length > 1 ? `Adicionar ${emails.length} membros` : "Adicionar"}
                    </Button>
                </>
            )}
        >
            {membro ? (
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-secondary">E-mail</span>
                    <p className="text-md break-all text-primary">{membro.email}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor={emailsId} isRequired isInvalid={erroDosEmails.length > 0}>
                        E-mails
                    </Label>
                    <div
                        className={cx(
                            "flex items-center rounded-lg bg-primary px-3 py-2.5 shadow-xs ring-1 ring-inset",
                            erroDosEmails.length > 0 ? "ring-error_subtle focus-within:ring-2 focus-within:ring-error" : "ring-primary focus-within:ring-2 focus-within:ring-brand",
                        )}
                        onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && input.trim()) {
                                e.preventDefault();
                                addEmails(input);
                            } else if (e.key === "Backspace" && !input && emails.length) {
                                removeEmail(emails[emails.length - 1]);
                            }
                        }}
                    >
                        <input
                            ref={inputRef}
                            id={emailsId}
                            autoFocus
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                if (errosDoCampo.length) setErrosDoCampo([]);
                            }}
                            onBlur={() => {
                                if (!input.trim()) return;
                                const texto = input;
                                // Saiu do campo clicando em outro controle: espera o clique terminar antes de criar os chips.
                                // O select abre ao soltar o botão (o campo perde o foco no meio do pointerup) ou ao apertar: no primeiro
                                // caso o ponteiro já está solto na volta do setTimeout; no segundo, espera soltar (em captura, porque o
                                // React Aria interrompe a propagação no gatilho).
                                if (!ponteiroPressionado.current) return void addEmails(texto);
                                // Os chips empurram o select já aberto: o "resize" faz a lista dele se reposicionar no fim da animação.
                                const converter = () => {
                                    addEmails(texto);
                                    setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
                                };
                                setTimeout(() => {
                                    if (!ponteiroPressionado.current) converter();
                                    else window.addEventListener("pointerup", () => setTimeout(converter, 0), { once: true, capture: true });
                                }, 0);
                            }}
                            onPaste={(e) => {
                                const text = e.clipboardData.getData("text");
                                if (/[\s,;]/.test(text)) {
                                    e.preventDefault();
                                    addEmails([input, text].filter(Boolean).join(","));
                                }
                            }}
                            placeholder="Um e-mail ou vários, separados por vírgula"
                            aria-invalid={erroDosEmails.length > 0 || undefined}
                            aria-describedby={emailsHintId}
                            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-placeholder"
                        />
                    </div>

                    <Surgir visivel={emails.length > 0} gap={6}>
                        <ul className="flex flex-wrap gap-1.5" aria-label="E-mails adicionados">
                            {emails.map((e) => (
                                <li key={e} className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-secondary py-0.5 pr-0.5 pl-2 text-sm text-secondary ring-1 ring-secondary">
                                    <span className="truncate">{e}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeEmail(e)}
                                        aria-label={`Remover ${e}`}
                                        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-tertiary hover:text-fg-secondary focus-visible:outline-2"
                                    >
                                        <XClose className="size-3.5" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Surgir>

                    <div id={emailsHintId} className="flex items-start justify-between gap-3">
                        {erroDosEmails.length > 0 ? (
                            <div className="flex flex-col gap-0.5" role="alert">
                                {erroDosEmails.map((erro, i) => (
                                    <HintText key={i} isInvalid>
                                        {erro}
                                    </HintText>
                                ))}
                            </div>
                        ) : (
                            <HintText>Até 30 e-mails por vez. Use o e-mail da conta Ingresse da pessoa.</HintText>
                        )}
                        <span className={cx("shrink-0 text-sm tabular-nums", emails.length >= MAX_EMAILS ? "text-error-primary" : "text-tertiary")}>
                            {emails.length}/{MAX_EMAILS}
                        </span>
                    </div>
                </div>
            )}

            <CheckboxSelect
                label="Cargo"
                required
                placeholder="Selecione os cargos"
                options={cargoOptions}
                selected={cargos}
                onChange={setCargos}
                hint="Define o que a pessoa pode fazer no Backstage."
                erro={tentou && cargos.size === 0 ? "Selecione ao menos um cargo." : undefined}
            />

            <CheckboxSelect
                label="Grupo"
                required
                placeholder="Selecione os grupos"
                options={grupos.map((g) => ({ id: g.id, label: g.nome }))}
                selected={gruposSel}
                onChange={setGruposSel}
                hint="Define em quais eventos a pessoa atua."
                erro={tentou && gruposSel.size === 0 ? "Selecione ao menos um grupo." : undefined}
            />
        </CascaDoModalDeMembros>
    );
}
