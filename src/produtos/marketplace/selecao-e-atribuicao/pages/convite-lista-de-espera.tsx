import { useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, CheckCircle, Hourglass03, MarkerPin01, SearchLg } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { listaDeEsperaAberta, useBanco, useColecao, vendeNoLink, type Evento } from "@/plataforma";
import { FormularioDaListaDeEspera, type ResultadoDaListaDeEspera } from "../components/lista-de-espera";

/*
 * Link de convite da lista de espera (LES-03): `/e/<slug>/lista-de-espera`. O produtor liga em
 * Backstage › Divulgação › Lista de espera e divulga onde quiser, inclusive antes da venda abrir. Quem se
 * inscreve registra interesse com a organização; não recebe mensagens sobre a lista e não tem ingresso
 * reservado. Com o convite desligado (ou o evento encerrado), a página diz que a lista está fechada.
 */

/** Título da página: o degrau de título (Display xs, negrito), acima do nome do evento (UI-VIS-018). */
const TITULO = "text-display-xs leading-tight font-bold tracking-tight text-balance text-primary";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dataDoEvento = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

export function ConviteListaDeEspera() {
    const { slug } = useParams();
    const { modo } = useBanco();
    const evento = useColecao("eventos").find((e) => e.slug === slug);
    // A inscrição foi recusada porque a produção fechou a lista com a página aberta (LES-05).
    const [recusada, setRecusada] = useState(false);

    if (modo === "carregando") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-primary">
                <LoadingIndicator type="line-spinner" size="md" label="Carregando evento" />
            </div>
        );
    }
    if (!evento) {
        return (
            <Aviso
                icone={SearchLg}
                titulo="Não encontramos este evento"
                texto="Confira o link com quem enviou. Ele pode ter sido digitado errado ou o evento foi removido."
            />
        );
    }
    if (recusada || !listaDeEsperaAberta(evento, "convite")) return <ListaFechada evento={evento} />;
    return <Convite evento={evento} onFechada={() => setRecusada(true)} />;
}

function ListaFechada({ evento }: { evento: Evento }) {
    return (
        <Aviso
            icone={Hourglass03}
            titulo="Esta lista não está recebendo inscrições"
            texto={`A organização de ${evento.nome} fechou a lista de espera por este link.`}
            acao={
                vendeNoLink(evento.status) ? (
                    <Button size="md" color="primary" href={`/e/${evento.slug}`}>
                        Ver ingressos
                    </Button>
                ) : undefined
            }
        />
    );
}

function Convite({ evento, onFechada }: { evento: Evento; onFechada: () => void }) {
    const [feito, setFeito] = useState<ResultadoDaListaDeEspera | null>(null);
    const reduzir = useReducedMotion();
    const data = dataDoEvento(evento.data);
    const local = [evento.local, evento.cidade].filter(Boolean).join(" · ");

    return (
        <main className="min-h-screen bg-secondary px-4 py-8 md:py-16">
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
                <header className="flex items-center gap-4">
                    {evento.capa && <img src={evento.capa} alt="" className="size-20 shrink-0 rounded-xl object-cover" />}
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-md font-semibold break-words text-primary">{evento.nome}</p>
                        {data && (
                            <span className="flex items-center gap-1.5 text-sm text-tertiary">
                                <Calendar className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                {data}
                            </span>
                        )}
                        {local && (
                            <span className="flex items-center gap-1.5 text-sm text-tertiary">
                                <MarkerPin01 className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                {local}
                            </span>
                        )}
                    </div>
                </header>

                {/* O cartão acompanha a altura do conteúdo (formulário, erro, confirmação) em vez de pular; a troca
                    de conteúdo esmaece e sobe 8 px. Com movimento reduzido, só esmaece e a altura muda direto (UI-VIS-008). */}
                <motion.section
                    layout={!reduzir}
                    transition={{ layout: { duration: 0.2, ease: "easeOut" } }}
                    style={{ borderRadius: 16 }}
                    className="bg-primary p-5 ring-1 ring-secondary md:p-6"
                >
                    <motion.div
                        key={feito ? "feito" : "form"}
                        layout={reduzir ? false : "position"}
                        initial={{ opacity: 0, y: reduzir ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {feito ? (
                            <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
                                <CheckCircle className="size-10 text-fg-success-primary" aria-hidden="true" />
                                <h1 className={TITULO}>{feito === "ja-inscrito" ? "Você já está na lista" : "Você está na lista!"}</h1>
                                <p className="text-sm text-tertiary">
                                    Seu interesse ficou registrado com a organização do evento. A lista não garante nem reserva ingresso.
                                </p>
                                {vendeNoLink(evento.status) && (
                                    <Button size="md" color="secondary" href={`/e/${evento.slug}`}>
                                        Ver ingressos
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1">
                                    <h1 className={TITULO}>Quer viver essa experiência de perto?</h1>
                                    <p className="text-sm text-tertiary">
                                        Entre na lista de espera e mostre para a organização que esse evento combina com você.
                                    </p>
                                </div>
                                <FormularioDaListaDeEspera eventoId={evento.id} origem="convite" onPronto={setFeito} onFechada={onFechada} />
                                {/* Subgrupo separado por linha, sem caixa própria: um nível de contêiner (UI-VIS-019). */}
                                <div className="flex flex-col gap-1 border-t border-secondary pt-5">
                                    <span className="text-sm font-semibold text-primary">Como funciona?</span>
                                    <span className="text-sm text-tertiary">
                                        Seu interesse fica registrado com a organização. Não enviamos mensagens sobre a lista, e entrar nela não garante nem
                                        reserva ingresso.
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.section>
            </div>
        </main>
    );
}

function Aviso({ icone, titulo, texto, acao }: { icone: typeof SearchLg; titulo: string; texto: string; acao?: ReactNode }) {
    return (
        // overflow-x-clip: os círculos decorativos do estado vazio do DS passam de 390 px e rolariam a página de lado.
        <div className="flex min-h-screen items-center justify-center overflow-x-clip bg-primary px-4">
            <EmptyState size="md">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={icone} color="gray" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{titulo}</EmptyState.Title>
                    <EmptyState.Description>{texto}</EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer>
                    {acao ?? (
                        <Button size="md" color="secondary" href="/novo-site/home">
                            Ver outros eventos
                        </Button>
                    )}
                </EmptyState.Footer>
            </EmptyState>
        </div>
    );
}
