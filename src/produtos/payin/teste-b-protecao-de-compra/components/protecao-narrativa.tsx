import { ShieldOff, ShieldTick } from "@untitledui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { brl } from "../data/evento";
import { type EscolhaProtecao, usePedido } from "../data/pedido-store";

/** Perguntas do gancho; a primeira se repete no fim do trilho para o ciclo recomeçar sem salto. */
const PERGUNTAS = [
    "o carro quebrar no caminho?",
    "você passar mal?",
    "o transporte te deixar na mão?",
    "rolar uma urgência em casa?",
    "roubarem seus documentos?",
];

/* Tempos do Figma (frame Checkout, linha do tempo de 13s em loop):
   cada pergunta fica 2s parada e sobe 72px em 0,5s; o brilho cruza o botão a cada 2,6s. */
const CICLO_S = 13;
const PASSO_PX = 72;
const TRILHO_Y = [0, 0, -72, -72, -144, -144, -216, -216, -288, -288, -360, -360];
const TRILHO_TEMPOS = [0, 0.1538, 0.1923, 0.3462, 0.3846, 0.5385, 0.5769, 0.7308, 0.7692, 0.9231, 0.9615, 1];
const CURVA = [0.5, 0, 0.5, 1] as const;
const TRILHO_CURVAS = ["linear", "easeInOut", CURVA, "easeInOut", CURVA, "easeInOut", CURVA, "easeInOut", CURVA, "easeInOut", "linear"] as const;
const BRILHO_S = 2.6;

/** "E se, no dia do show…": as perguntas sobem uma a uma, em loop. */
function Gancho() {
    const semMovimento = useReducedMotion();

    return (
        <div className="flex flex-col justify-center bg-[#1a1a1a] p-7 max-md:rounded-t-[11px] md:w-[304px] md:shrink-0">
            <div className="flex flex-col gap-3">
                <p className="text-xs leading-4 font-semibold tracking-[1px] text-[#a3a3a3]">E SE, NO DIA DO SHOW…</p>
                <p className="sr-only">{PERGUNTAS.join(" ")}</p>
                <div aria-hidden="true" className="relative h-[72px] overflow-hidden">
                    <motion.div
                        className="absolute top-0 left-0 w-full max-w-[248px] text-[26px] leading-8 font-bold text-white"
                        initial={{ y: 0 }}
                        animate={semMovimento ? { y: 0 } : { y: TRILHO_Y }}
                        transition={
                            semMovimento ? { duration: 0 } : { duration: CICLO_S, times: TRILHO_TEMPOS, ease: [...TRILHO_CURVAS], repeat: Infinity }
                        }
                    >
                        {[...PERGUNTAS, PERGUNTAS[0]].map((pergunta, i) => (
                            <p key={i} style={{ height: PASSO_PX }}>
                                {pergunta}
                            </p>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

/** Oferta: título, texto com o link das coberturas e as duas saídas. O brilho passa sobre o botão principal. */
function Oferta({ onVerCoberturas, onEscolher }: { onVerCoberturas: () => void; onEscolher: (escolha: EscolhaProtecao) => void }) {
    const { valorProtecao } = usePedido();
    const semMovimento = useReducedMotion();

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="flex items-start gap-3.5">
                <span className="flex size-[52px] shrink-0 items-center justify-center rounded-lg bg-utility-green-50">
                    <ShieldTick className="size-[26px] text-utility-green-600" aria-hidden="true" />
                </span>
                <h2 className="flex min-h-12 flex-1 items-center text-lg leading-6 font-semibold text-primary">
                    <span>
                        Imprevistos acontecem. <span className="whitespace-nowrap">Proteja sua compra.</span>
                    </span>
                </h2>
            </div>

            <p className="text-[13px] leading-[18px] text-[#464646]">
                Se uma situação coberta ocorrer e impedir sua ida, você pode solicitar o reembolso.{" "}
                <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={onVerCoberturas}
                    className="rounded-xs text-sm leading-[18px] font-bold text-[#c81f14] underline [text-underline-position:from-font] outline-focus-ring transition duration-100 ease-linear hover:text-[#a8170e] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Conheça as coberturas!
                </button>
            </p>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => onEscolher("com")}
                    className="relative w-full overflow-hidden rounded-lg bg-[#ff271a] px-3 py-2 text-sm font-semibold text-white shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#e01d12] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <span className="relative tabular-nums">Continuar com proteção · {brl(valorProtecao)}</span>
                    {!semMovimento && (
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0"
                            initial={{ x: "0%" }}
                            animate={{ x: "122%" }}
                            transition={{ duration: BRILHO_S, ease: CURVA, repeat: Infinity }}
                        >
                            <span className="absolute inset-y-0 -left-[70px] w-[70px] bg-linear-to-r from-white/0 via-white/[0.22] to-white/0" />
                        </motion.span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onEscolher("sem")}
                    className="self-center rounded-xs text-sm font-semibold text-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Prefiro correr o risco
                </button>
            </div>
        </div>
    );
}

/** Depois da escolha, o bloco encolhe para uma linha que confirma a decisão. Quem recusou ainda pode aceitar por aqui; quem aceitou revê a escolha pelo resumo. */
function Escolhido({ onEscolher }: { onEscolher: (escolha: EscolhaProtecao) => void }) {
    const { protecao, valorProtecao } = usePedido();
    const comProtecao = protecao === "com";
    const Icone = comProtecao ? ShieldTick : ShieldOff;
    const botao =
        "shrink-0 rounded-xs max-sm:ml-[54px] text-sm font-semibold outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2";

    return (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 p-4">
            <span
                className={
                    comProtecao
                        ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-utility-green-50"
                        : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary"
                }
            >
                <Icone className={comProtecao ? "size-5 text-utility-green-600" : "size-5 text-fg-quaternary"} aria-hidden="true" />
            </span>
            <p className="flex min-w-[200px] flex-1 flex-col text-sm text-tertiary">
                <span className="font-semibold text-primary">
                    {comProtecao ? "Compra protegida" : "Imprevistos acontecem. Sua compra está sem proteção."}
                </span>
                {!comProtecao && <span>Se um imprevisto impedir sua ida, você não poderá solicitar o reembolso.</span>}
            </p>
            {!comProtecao && (
                <button type="button" onClick={() => onEscolher("com")} className={`${botao} text-[#c81f14] tabular-nums hover:text-[#a8170e]`}>
                    Proteger por {brl(valorProtecao)}
                </button>
            )}
        </div>
    );
}

/**
 * Teste B: a oferta de proteção fica dentro do checkout, acima dos meios de pagamento, e trava o pagamento até a escolha.
 * À esquerda (no celular, em cima) o gancho escuro com as perguntas em loop; à direita a oferta com o brilho no botão.
 */
export function ProtecaoNarrativa({ onVerCoberturas }: { onVerCoberturas: () => void }) {
    const { protecao, escolherProtecao } = usePedido();
    const semMovimento = useReducedMotion();
    const transicao = semMovimento ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

    return (
        <section aria-label="Proteção de compra" className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-primary">
            {/* Sem initial={false}: ele faria as perguntas e o brilho nascerem já no último quadro, sem animar */}
            <AnimatePresence mode="wait">
                {protecao === null ? (
                    <motion.div key="oferta" className="flex flex-col md:flex-row" exit={{ opacity: 0 }} transition={transicao}>
                        <Gancho />
                        <Oferta onVerCoberturas={onVerCoberturas} onEscolher={escolherProtecao} />
                    </motion.div>
                ) : (
                    <motion.div key="escolhido" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transicao}>
                        <Escolhido onEscolher={escolherProtecao} />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
