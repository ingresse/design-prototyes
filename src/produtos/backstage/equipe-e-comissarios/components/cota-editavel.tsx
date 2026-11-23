import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Edit01 } from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { BarraUso } from "./ui-cotas";

/* ------------------------------------------------------------------ */
/*  Cota editável no lugar (ECO-18): o lápis abre o campo; Enter ou    */
/*  clicar fora valida com loading simulado, Esc cancela. Sucesso      */
/*  mostra check por 3 s; erro fica no campo, como dica (ECO-91).      */
/* ------------------------------------------------------------------ */

const soNumero = (v: string) => Number(v.replace(/\D/g, "").slice(0, 6)) || 0;

/** Tempo simulado da validação no servidor e quanto tempo cada feedback fica na tela. */
const TEMPO_VALIDANDO = 900;
const TEMPO_SUCESSO = 3000;

type Estado = "exibindo" | "editando" | "validando" | "erro";

/**
 * Uso e barra da cota, com o lápis ao lado. Serve à linha de item (cota por item) e ao topo
 * do card (cota compartilhada); no topo o status fica à direita, para a barra seguir alinhada ao título.
 * O lápis abre um campo no lugar do uso; Enter ou clicar fora valida (com loading), e o resultado
 * aparece: check de sucesso, ou o erro no próprio campo (dica do Input do DS), até a pessoa mudar o
 * número ou cancelar com Esc (ECO-91). Antes era um tooltip feito à mão, que sumia em 15 s.
 */
export const CotaEditavel = ({
    variante = "item",
    nome,
    uso,
    cota,
    editando,
    onEditar,
    onCancelar,
    onSalvar,
}: {
    variante?: "item" | "topo";
    nome: string;
    uso: number;
    cota: number;
    editando: boolean;
    onEditar: () => void;
    onCancelar: () => void;
    onSalvar: (n: number) => void;
}) => {
    const [valor, setValor] = useState(cota);
    const [estado, setEstado] = useState<Estado>("exibindo");
    const [erro, setErro] = useState<{
        titulo: string;
        descricao: string;
    } | null>(null);
    const [sucesso, setSucesso] = useState(false);
    const tentado = useRef<number | null>(null);
    // Esc desmonta o campo; o blur que vem junto não deve validar.
    const cancelado = useRef(false);

    // Outra linha começou a editar: esta volta a exibir.
    useEffect(() => {
        if (!editando) {
            setEstado("exibindo");
            setErro(null);
        }
    }, [editando]);

    useEffect(() => {
        if (!sucesso) return;
        const t = setTimeout(() => setSucesso(false), TEMPO_SUCESSO);
        return () => clearTimeout(t);
    }, [sucesso]);

    const abrir = () => {
        setValor(cota);
        setErro(null);
        setSucesso(false);
        tentado.current = null;
        cancelado.current = false;
        setEstado("editando");
        onEditar();
    };

    const validar = () => {
        if (cancelado.current || estado === "validando") return;
        // Sem mudança: só fecha o campo.
        if (valor === cota) return onCancelar();
        // Mesmo valor que acabou de dar erro: não valida de novo.
        if (estado === "erro" && valor === tentado.current) return;

        tentado.current = valor;
        setErro(null);
        setEstado("validando");
        setTimeout(() => {
            if (valor <= 0) {
                setErro({
                    titulo: "Cota inválida",
                    descricao: "Informe uma quantidade maior que zero.",
                });
                return setEstado("erro");
            }
            if (valor < uso) {
                setErro({
                    titulo: "Cota menor que o já emitido",
                    descricao: `Informe ${uso} ou mais.`,
                });
                return setEstado("erro");
            }
            onSalvar(valor);
            setSucesso(true);
        }, TEMPO_VALIDANDO);
    };

    const teclas = (e: KeyboardEvent) => {
        if (e.key === "Enter") validar();
        if (e.key === "Escape") {
            cancelado.current = true;
            onCancelar();
        }
    };

    const noCampo = editando && estado !== "exibindo";

    const topo = variante === "topo";

    // Slot de status: loading ou sucesso (o erro fica no campo).
    const status = (
        <span className="relative flex size-5 shrink-0 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
                {noCampo && estado === "validando" && (
                    <motion.span key="validando" {...fade} className="flex">
                        <Spinner />
                    </motion.span>
                )}
                {!noCampo && sucesso && (
                    <motion.span key="sucesso" {...fade} className="flex">
                        <CheckCircle className="size-5 text-fg-success-secondary" aria-label="Cota atualizada" />
                    </motion.span>
                )}
            </AnimatePresence>
        </span>
    );

    const conteudo = (
        <AnimatePresence mode="wait" initial={false}>
            {noCampo ? (
                <motion.div key="campo" {...fade} className={topo ? "w-[167px]" : "min-w-[167px] flex-1"}>
                    <Input
                        size="sm"
                        inputMode="numeric"
                        aria-label={`Cota de ${nome}`}
                        value={valor ? String(valor) : ""}
                        placeholder="0"
                        onChange={(v) => {
                            setValor(soNumero(v));
                            if (estado === "erro") setEstado("editando");
                            setErro(null);
                        }}
                        onKeyDown={teclas}
                        onBlur={validar}
                        isReadOnly={estado === "validando"}
                        isInvalid={estado === "erro" && !!erro}
                        hint={estado === "erro" && erro ? `${erro.titulo}. ${erro.descricao}` : undefined}
                        wrapperClassName="bg-primary_alt"
                        autoFocus
                    />
                </motion.div>
            ) : topo ? (
                <motion.div key="uso" {...fade} className="flex items-center gap-3">
                    {/* Barra com largura fixa: um número grande alarga o texto, nunca encolhe a barra. No celular, mais curta, para caber em 390 px. */}
                    <BarraUso usadas={uso} total={cota} className="w-32 shrink-0 sm:w-60" />
                    <span className="flex items-center gap-1">
                        <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">
                            {uso} de {cota}
                        </span>
                        <ButtonUtility size="sm" color="tertiary" icon={Edit01} tooltip="Editar cota" aria-label="Editar cota do grupo" onClick={abrir} />
                    </span>
                </motion.div>
            ) : (
                <motion.div key="uso" {...fade} className="flex flex-1 items-center gap-1">
                    <span className="flex min-w-[131px] flex-1 flex-col gap-2">
                        {/* Nunca quebra: o número de referência fica sempre numa linha. */}
                        <span className="text-sm font-medium whitespace-nowrap text-secondary tabular-nums">
                            {uso} de {cota} emissões
                        </span>
                        <BarraUso usadas={uso} total={cota} />
                    </span>
                    <ButtonUtility size="sm" color="tertiary" icon={Edit01} tooltip="Editar cota" aria-label={`Editar cota de ${nome}`} onClick={abrir} />
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="flex items-center gap-2">
            {topo ? (
                <>
                    {conteudo}
                    {status}
                </>
            ) : (
                <>
                    {status}
                    {conteudo}
                </>
            )}
        </div>
    );
};

const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15, ease: "easeOut" },
} as const;

/** O LoadingIndicator do DS ("line-simple"), no tamanho do slot de status (ele começa em 32 px). */
const Spinner = () => (
    <span role="status" aria-label="Validando" className="flex size-5 [&_svg]:size-5">
        <LoadingIndicator size="sm" />
    </span>
);
