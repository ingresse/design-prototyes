import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRinging01, CheckCircle, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { entrarNaListaDeEspera, lerSessao, type OrigemDaListaDeEspera } from "@/plataforma";

/*
 * Lista de espera (CART-084/085, LES): quem quer ir deixa nome, e-mail e celular. Não garante nem
 * reserva ingresso. Entra pelo botão do link de compra esgotado ou pelo link de convite, conforme o
 * produtor ligou em Backstage › Divulgação › Lista de espera. Aparece no relatório Lista de usuários (LUS).
 */

export type ResultadoDaListaDeEspera = "inscrito" | "ja-inscrito";

/** Formulário da lista, usado no modal do link de compra e na página de convite. */
export function FormularioDaListaDeEspera({
    eventoId,
    origem,
    rotuloEnviar = "Entrar na lista",
    onPronto,
    onFechada,
}: {
    eventoId: string;
    origem: OrigemDaListaDeEspera;
    rotuloEnviar?: string;
    onPronto: (r: ResultadoDaListaDeEspera) => void;
    /** A produção fechou a lista com a tela aberta: quem usa troca o formulário pelo estado fechado (LES-05). */
    onFechada: () => void;
}) {
    const sessao = lerSessao();
    const [nome, setNome] = useState(sessao?.nome ?? "");
    const [email, setEmail] = useState(sessao?.email ?? "");
    const [telefone, setTelefone] = useState("");
    const [tentou, setTentou] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const reduzir = useReducedMotion();

    const erroNome = nome.trim().length < 3 ? "Informe seu nome, com pelo menos 3 letras." : undefined;
    const erroEmail = !/^\S+@\S+\.\S+$/.test(email.trim()) ? "Informe um e-mail válido." : undefined;
    const erroTel = !/^\+?\d{10,15}$/.test(telefone.replace(/[\s()-]/g, "")) ? "Informe o celular com DDD." : undefined;

    const enviar = async () => {
        setTentou(true);
        setErro(null);
        if (erroNome || erroEmail || erroTel) return;
        setEnviando(true);
        try {
            const r = await entrarNaListaDeEspera(eventoId, { nome: nome.trim(), email: email.trim(), telefone: telefone.replace(/[\s()-]/g, "") }, origem);
            // A produção pode fechar a lista enquanto a pessoa preenche (LES-05): a tela vai para o estado fechado.
            if (r === "fechada") onFechada();
            else onPronto(r);
        } catch {
            // Ação primeiro, depois o fato; o que a pessoa preencheu fica (UI-TXT-005, UI-EST-002).
            setErro("Tente de novo. Não conseguimos registrar sua inscrição, e o que você preencheu continua aqui.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                void enviar();
            }}
        >
            <Input
                label="Nome"
                isRequired
                autoComplete="name"
                value={nome}
                onChange={setNome}
                isInvalid={tentou && !!erroNome}
                hint={tentou ? erroNome : undefined}
            />
            <Input
                label="E-mail"
                isRequired
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                isInvalid={tentou && !!erroEmail}
                hint={tentou ? erroEmail : undefined}
            />
            <Input
                label="Celular"
                isRequired
                inputMode="tel"
                autoComplete="tel"
                placeholder="+55 11 99999-0000"
                value={telefone}
                onChange={setTelefone}
                isInvalid={tentou && !!erroTel}
                hint={tentou ? erroTel : undefined}
            />
            <AnimatePresence initial={false}>
                {erro && (
                    <motion.p
                        key="erro"
                        role="alert"
                        initial={reduzir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={reduzir ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                        exit={reduzir ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.16, ease: "easeIn" } }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden text-sm text-error-primary"
                    >
                        {erro}
                    </motion.p>
                )}
            </AnimatePresence>
            <Button type="submit" color="primary" size="lg" isLoading={enviando} showTextWhileLoading>
                {rotuloEnviar}
            </Button>
        </form>
    );
}

/** Botão do link de compra esgotado (só aparece com "Quando esgotar" ligado, LES-02). */
export function ListaDeEspera({ eventoId }: { eventoId: string }) {
    const [aberto, setAberto] = useState(false);
    const [feito, setFeito] = useState<ResultadoDaListaDeEspera | null>(null);
    const [fechada, setFechada] = useState(false);

    // A produção fechou a lista enquanto o modal estava aberto: fecha o modal e o convite some (LES-05).
    if (fechada) return null;

    return (
        <>
            <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 ring-1 ring-border-secondary">
                <div className="flex items-start gap-3">
                    <BellRinging01 className="mt-0.5 size-5 shrink-0 text-fg-brand-primary" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-primary">Ingressos esgotados</span>
                        <span className="text-sm text-tertiary">Entre na lista de espera e avisamos se surgirem novos ingressos.</span>
                    </div>
                </div>
                <Button color="secondary" size="md" onClick={() => setAberto(true)}>
                    {feito ? "Você está na lista de espera" : "Entrar na lista de espera"}
                </Button>
            </div>
            <ModalOverlay isOpen={aberto} onOpenChange={setAberto} isDismissable>
                <Modal className="sm:max-w-[440px]">
                    <Dialog aria-label="Lista de espera">
                        <div className="relative flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <ButtonUtility
                                size="sm"
                                color="tertiary"
                                icon={XClose}
                                tooltip="Fechar"
                                onClick={() => setAberto(false)}
                                className="absolute top-4 right-4"
                            />
                            {feito ? (
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <CheckCircle className="size-10 text-fg-success-primary" aria-hidden="true" />
                                    <h2 className="text-lg font-semibold text-primary">
                                        {feito === "ja-inscrito" ? "Você já está na lista de espera" : "Você está na lista de espera"}
                                    </h2>
                                    <p className="text-sm text-tertiary">
                                        Se surgirem novos ingressos, avisamos por e-mail. A lista não garante nem reserva ingresso.
                                    </p>
                                    <Button color="primary" size="lg" onClick={() => setAberto(false)}>
                                        Entendi
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1 pr-8">
                                        <h2 className="text-lg font-semibold text-primary">Entrar na lista de espera</h2>
                                        <p className="text-sm text-tertiary">A lista não garante nem reserva ingresso.</p>
                                    </div>
                                    <FormularioDaListaDeEspera
                                        eventoId={eventoId}
                                        origem="esgotado"
                                        onPronto={setFeito}
                                        onFechada={() => {
                                            setAberto(false);
                                            setFechada(true);
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
