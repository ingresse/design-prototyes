import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Check, Copy01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { InputGroup } from "@/components/base/input/input-group";
import { Toggle } from "@/components/base/toggle/toggle";
import { configurarListaDeEspera, type Evento } from "@/plataforma";
import { BackstageLayout } from "../../components/Backstage";
import { AbasDeDivulgacao, CHAVE_DA_DIVULGACAO } from "../../components/abas-de-divulgacao";
import { useCatalogo } from "../../itens/data/catalogo";

/*
 * Lista de espera (LES): o produtor escolhe por onde o público entra na lista do evento. Duas entradas
 * independentes, as duas desligadas até ele ligar (LES-02):
 *   - quando esgotar: o botão "Entrar na lista de espera" no link de compra com tudo esgotado;
 *   - link de convite: uma página própria para divulgar, inclusive antes da venda abrir.
 * Cada interruptor grava na hora (LES-01). Quem se inscreve aparece no relatório Lista de usuários.
 */

const T = {
    titulo: "Lista de espera",
    subtitulo: "Receba o contato de quem quer ir ao evento quando os ingressos acabarem ou antes da venda abrir.",
    carregando: "Carregando...",
    entradas: "Por onde o público entra na lista",
    aoEsgotar: "Quando esgotar",
    aoEsgotarDica: 'Com todos os ingressos esgotados, o link de compra mostra "Entrar na lista de espera".',
    convite: "Link de convite",
    conviteDica: "Uma página para divulgar onde quiser. Recebe inscrições mesmo antes da venda abrir.",
    linkRotulo: "Link de convite",
    copiar: "Copiar",
    copiado: "Copiado",
    linkCopiado: "Link de convite copiado.",
    erroCopiar: "Não foi possível copiar. Selecione o link e copie manualmente.",
    garantia: "Entrar na lista não garante nem reserva ingresso: o público vê esse aviso antes de se inscrever.",
    encerrado: "O evento foi encerrado: a lista não recebe mais inscrições.",
    inscritos: (n: number) => (n === 0 ? "Ninguém na lista ainda" : n === 1 ? "1 pessoa na lista" : `${n.toLocaleString("pt-BR")} pessoas na lista`),
    verInscritos: "Ver inscritos",
    salvo: {
        aoEsgotar: (on: boolean) => (on ? "Lista de espera ligada para quando esgotar." : "Lista de espera desligada para quando esgotar."),
        convite: (on: boolean) => (on ? "Link de convite ligado." : "Link de convite desligado: a página avisa que a lista está fechada."),
    },
    erroSalvar: "Não foi possível salvar. Tente novamente.",
};

const semCampo = <T extends object, K extends keyof T>(o: T, k: K): T => {
    const { [k]: _, ...resto } = o;
    return resto as T;
};

export function ListaDeEspera() {
    const { evento, carregando } = useCatalogo();
    return (
        <BackstageLayout activeSection="marketing" activeItem="lista-de-espera" chaveDaTela={CHAVE_DA_DIVULGACAO}>
            <div className="flex min-w-0 flex-1 flex-col gap-8">
                <AbasDeDivulgacao ativa="lista-de-espera" />
                <h2 className="sr-only">{T.titulo}</h2>
                {carregando || !evento ? (
                    <div role="status" aria-label={T.carregando} className="flex flex-col gap-px overflow-hidden rounded-2xl ring-1 ring-secondary">
                        {[0, 1, 2].map((i) => (
                            <span key={i} aria-hidden="true" className="h-20 w-full animate-pulse bg-secondary motion-reduce:animate-none" />
                        ))}
                    </div>
                ) : (
                    <Configuracao key={evento.id} evento={evento} />
                )}
            </div>
        </BackstageLayout>
    );
}

function Configuracao({ evento }: { evento: Evento }) {
    const config = evento.configuracaoDaListaDeEspera;
    const encerrado = evento.status === "encerrado";
    const [salvando, setSalvando] = useState<"aoEsgotar" | "convite" | null>(null);
    // A tela responde na hora: o banco confirma depois (pode levar ~1 s) e, se falhar, volta ao que era (LES-01).
    const [otimista, setOtimista] = useState<Partial<Record<"aoEsgotar" | "convite", boolean>>>({});
    const ligado = (campo: "aoEsgotar" | "convite") => otimista[campo] ?? !!config?.[campo];
    // O valor otimista sai quando o banco chega ao mesmo valor; antes disso, a tela não pisca de volta.
    useEffect(() => {
        setOtimista((o) => {
            let n = o;
            for (const c of ["aoEsgotar", "convite"] as const) if (n[c] !== undefined && n[c] === !!config?.[c]) n = semCampo(n, c);
            return n;
        });
    }, [config?.aoEsgotar, config?.convite]);
    const [copiado, setCopiado] = useState(false);
    const reduzir = useReducedMotion();
    const link = `${location.origin}/e/${evento.slug}/lista-de-espera`;
    // O total bate com o relatório Lista de usuários do evento: inscrições reais e, no protótipo, as simuladas (LUS-09).
    const total = (evento.listaDeEspera?.length ?? 0) + (evento.listaDeUsuariosSimulada?.quantidade ?? 0);

    const alternar = async (campo: "aoEsgotar" | "convite", on: boolean) => {
        if (salvando === campo) return; // um clique por vez, sem esmaecer o interruptor
        setSalvando(campo);
        setOtimista((o) => ({ ...o, [campo]: on }));
        try {
            await configurarListaDeEspera(evento.id, { [campo]: on });
            toast.success(T.salvo[campo](on));
        } catch {
            // Falhou: o banco ainda tem o valor antigo, e o interruptor volta para ele.
            setOtimista((o) => semCampo(o, campo));
            toast.error(T.erroSalvar);
        } finally {
            setSalvando(null);
        }
    };

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            toast.error(T.erroCopiar);
        }
    };

    return (
        <section aria-label={T.entradas} className="flex flex-col divide-y divide-secondary rounded-2xl bg-primary ring-1 ring-secondary">
            {encerrado && <p className="px-5 py-4 text-sm text-tertiary md:px-6">{T.encerrado}</p>}

            <div className="px-5 py-5 md:px-6">
                <Toggle
                    size="md"
                    // O Toggle do DS é w-max: sem limite, o texto de apoio não quebra e sai do cartão em 390 px (LES-12).
                    className="max-w-full"
                    label={T.aoEsgotar}
                    hint={T.aoEsgotarDica}
                    isSelected={ligado("aoEsgotar")}
                    isDisabled={encerrado}
                    onChange={(on) => void alternar("aoEsgotar", on)}
                />
            </div>

            <div className="flex flex-col px-5 py-5 md:px-6">
                <Toggle
                    size="md"
                    className="max-w-full"
                    label={T.convite}
                    hint={T.conviteDica}
                    isSelected={ligado("convite")}
                    isDisabled={encerrado}
                    onChange={(on) => void alternar("convite", on)}
                />
                {/* O link entra e sai abrindo a altura, para as linhas de baixo deslizarem (UI-VIS-008); com
                    movimento reduzido, só esmaece. */}
                <AnimatePresence initial={false}>
                    {ligado("convite") && !encerrado && (
                        <motion.div
                            key="link"
                            initial={reduzir ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            animate={reduzir ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                            exit={reduzir ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.16, ease: "easeIn" } }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                        >
                            {/* Alinhado ao texto do interruptor (largura do interruptor md + espaço). */}
                            <div className="pt-4 md:pl-14">
                                <InputGroup
                                    label={T.linkRotulo}
                                    className="max-w-xl"
                                    trailingAddon={
                                        <Button color="secondary" size="md" iconLeading={copiado ? Check : Copy01} onClick={() => void copiar()}>
                                            {copiado ? T.copiado : T.copiar}
                                        </Button>
                                    }
                                >
                                    <InputBase value={link} readOnly aria-label={T.linkRotulo} onFocus={(e) => e.target.select()} />
                                </InputGroup>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Leitor de tela ouve a cópia: só trocar o texto do botão não é anunciado (UI-A11Y-002). */}
                <p className="sr-only" aria-live="polite">
                    {copiado ? T.linkCopiado : ""}
                </p>
            </div>

            <p className="px-5 py-4 text-sm text-tertiary md:px-6">{T.garantia}</p>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                <span className="text-sm font-semibold text-primary">{T.inscritos(total)}</span>
                <Button color="link-color" size="md" href="/backstage/relatorios/lista-de-usuarios?de=evento">
                    {T.verInscritos}
                </Button>
            </div>
        </section>
    );
}
