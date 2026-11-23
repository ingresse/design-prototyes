import { useId, useState, type Ref } from "react";
import { Check, ChevronDown, ChevronUp, Lock01 } from "@untitledui/icons";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type TargetAndTransition,
} from "motion/react";
import { IconLeftNumber } from "@/components/application/progress-steps/progress-step-base";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";
import { CampoDeParticulas } from "../../components/campo-de-particulas";
import { useCorDasParticulas } from "../utils/cor-das-particulas";
import type { Etapa, EtapaId } from "../data/use-etapas";

export const TITULO_DO_GUIA = "Guia de configuração";

interface PainelDoGuiaProps {
  etapas: Etapa[];
  minimizado: boolean;
  onAlternarMinimizado: () => void;
  onFechar: () => void;
  /* Prop comum e não forwardRef: o AnimatePresence do motion lê `ref` do filho e reclama no React 18. */
  painelRef?: Ref<HTMLElement>;
  /** Shell com barra no topo: a partir de 640px o painel fica no canto superior direito, abaixo do botão "Guia" (GDC-16). */
  noTopo?: boolean;
}

/* Sobe de fora da tela; sai pelo mesmo lado, mais rápido e acelerando (quem fecha quer a tela de volta). */
const PAINEL = {
  initial: { y: "120%" },
  animate: { y: 0 },
  exit: {
    y: "120%",
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as const },
  },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
};
/* No topo, desce um pouco de baixo da barra em vez de subir de fora da tela. */
const PAINEL_NO_TOPO = {
  initial: { y: -16, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: {
    y: -16,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

/* Recolher e reabrir: a mesma gaveta indo e voltando, tempos iguais. */
const RECOLHER = { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const };

interface Entrada {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
}
/* O título entra palavra a palavra, desfocado; as etapas descem em cascata. */
const PALAVRA: Entrada = {
  initial: { filter: "blur(8px)", opacity: 0 },
  animate: { filter: "blur(0px)", opacity: 1 },
};
const ETAPA: Entrada = {
  initial: { y: -12, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

/**
 * Guia de configuração (GDC-60): cabeçalho com progresso e as etapas em acordeão, uma aberta por
 * vez. Não bloqueia nada e não tem "próximo": cada passo lê o estado real.
 */
export function PainelDoGuia({
  etapas,
  minimizado,
  onAlternarMinimizado,
  onFechar,
  painelRef,
  noTopo = false,
}: PainelDoGuiaProps) {
  const reduzir = useReducedMotion();
  const corpoId = useId();
  const cor = useCorDasParticulas("faixa");
  const desktop = useBreakpoint("sm");

  const total = etapas.reduce((n, e) => n + e.passos.length, 0);
  const feitos = etapas.reduce(
    (n, e) => n + e.passos.filter((p) => p.status === "complete").length,
    0,
  );

  const entrar = (v: Entrada, atraso: number) =>
    reduzir
      ? {}
      : {
          initial: v.initial,
          animate: v.animate,
          transition: { duration: 0.4, delay: atraso },
        };

  return (
    <motion.aside
      ref={painelRef}
      aria-label={TITULO_DO_GUIA}
      className={cx(
        "fixed inset-x-4 bottom-[calc(1rem+var(--altura-barra-fixa,0px))] z-30 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-secondary bg-primary shadow-lg transition-[bottom] duration-200 ease-out motion-reduce:transition-none sm:inset-x-auto sm:right-6 sm:bottom-[calc(1.5rem+var(--altura-barra-fixa,0px))] sm:w-full sm:max-w-sm",
        // Abaixo da barra do topo (64 px) com 12 px de respiro, alinhado à direita como o botão "Guia".
        noTopo &&
          "sm:top-[calc(var(--bs-topo-do-guia,var(--bs-header-offset,64px))+0.75rem)] sm:bottom-auto sm:max-h-[calc(100dvh-var(--bs-header-offset,64px)-1.5rem)]",
      )}
      {...(reduzir ? {} : noTopo && desktop ? PAINEL_NO_TOPO : PAINEL)}
    >
      {/* Faixa: tem área para as partículas e é o que sobra quando o painel é recolhido. */}
      <div className="relative isolate flex shrink-0 flex-col gap-3 px-5 py-4">
        <CampoDeParticulas
          cor={cor}
          densidade={2}
          escala={3}
          parada={0}
          className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_right,transparent_0%,black_100%)]"
        />
        <div className="flex items-center justify-between gap-3">
          {/* Quebrado em palavras só para a entrada; o leitor de tela lê o aria-label do aside. */}
          <p className="text-md font-semibold text-primary" aria-hidden="true">
            {TITULO_DO_GUIA.split(" ").map((palavra, i) => (
              <motion.span
                key={`${palavra}-${i}`}
                className="mr-[0.25em] inline-block"
                {...entrar(PALAVRA, 0.12 + i * 0.07)}
              >
                {palavra}
              </motion.span>
            ))}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="mr-1.5 text-sm text-tertiary tabular-nums">
              {feitos} de {total}
            </span>
            <ButtonUtility
              size="sm"
              color="tertiary"
              icon={minimizado ? ChevronDown : ChevronUp}
              tooltip={minimizado ? "Expandir" : "Minimizar"}
              aria-expanded={!minimizado}
              aria-controls={corpoId}
              onClick={onAlternarMinimizado}
            />
            <CloseButton size="sm" label="Fechar guia" onPress={onFechar} />
          </div>
        </div>
        <BarraDeProgresso feitos={feitos} total={total} />
      </div>

      {/* initial={false}: o painel já entra na altura que tem. Recolhido, o corpo fica inerte para o Tab. */}
      <motion.div
        id={corpoId}
        className="min-h-0 overflow-hidden"
        initial={false}
        animate={{ height: minimizado ? 0 : "auto" }}
        transition={reduzir ? { duration: 0 } : RECOLHER}
        // React 18 só escreve `inert` como string; vazio liga, ausente desliga.
        {...(minimizado ? { inert: "" as unknown as boolean } : {})}
      >
        <AcordeaoDoGuia
          etapas={etapas}
          entrada={(i) => entrar(ETAPA, 0.22 + i * 0.08)}
        />
      </motion.div>
    </motion.aside>
  );
}

/** Progresso de todas as etapas juntas. */
export function BarraDeProgresso({
  feitos,
  total,
  className,
}: {
  feitos: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "h-1.5 overflow-hidden rounded-full bg-quaternary",
        className,
      )}
      role="progressbar"
      aria-label="Progresso do guia"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={feitos}
    >
      <div
        className="h-full rounded-full bg-fg-brand-primary transition-[width] duration-300 ease-out"
        style={{ width: `${total ? (feitos / total) * 100 : 0}%` }}
      />
    </div>
  );
}

/** Etapas em acordeão, uma aberta por vez (GDC-61); abre na primeira com pendência e desbloqueada (GDC-65). */
export function AcordeaoDoGuia({
  etapas,
  className,
  entrada,
}: {
  etapas: Etapa[];
  className?: string;
  entrada?: (i: number) => object;
}) {
  const reduzir = useReducedMotion();
  const corpoId = useId();
  const sugerida = etapas.find((e) => !e.feita && !e.bloqueada)?.id ?? null;
  const [escolhida, setEscolhida] = useState<EtapaId | null | undefined>(
    undefined,
  );
  const aberta = escolhida === undefined ? sugerida : escolhida;

  return (
    <ol
      className={cx(
        "flex max-h-[min(560px,calc(100dvh-12rem))] flex-col gap-1 overflow-y-auto border-t border-secondary p-2",
        className,
      )}
    >
      {etapas.map((etapa, i) => {
        const expandida = aberta === etapa.id && !etapa.bloqueada;
        const regiaoId = `${corpoId}-${etapa.id}`;
        return (
          <motion.li
            key={etapa.id}
            className={cx("rounded-xl", expandida && "bg-secondary")}
            {...entrada?.(i)}
          >
            <button
              type="button"
              disabled={etapa.bloqueada}
              aria-expanded={etapa.bloqueada ? undefined : expandida}
              aria-controls={etapa.bloqueada ? undefined : regiaoId}
              aria-label={
                etapa.bloqueada && etapa.motivo
                  ? `${etapa.rotulo}. ${etapa.motivo}`
                  : undefined
              }
              onClick={() => setEscolhida(expandida ? null : etapa.id)}
              className={cx(
                "flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                etapa.bloqueada ? "cursor-not-allowed" : "cursor-pointer",
                !expandida && !etapa.bloqueada && "hover:bg-primary_hover",
              )}
            >
              <span
                className={cx(
                  "min-w-0 flex-1 text-sm font-semibold",
                  etapa.bloqueada ? "text-quaternary" : "text-primary",
                )}
              >
                {etapa.rotulo}
              </span>
              {etapa.feita && (
                <Check
                  className="size-4 shrink-0 text-fg-success-secondary"
                  aria-label="concluída"
                />
              )}
              {etapa.bloqueada ? (
                <Lock01
                  className="size-4 shrink-0 text-fg-quaternary"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className={cx(
                    "size-4 shrink-0 text-fg-quaternary transition-transform duration-200 ease-out",
                    expandida && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              )}
            </button>

            <AnimatePresence initial={false}>
              {expandida && (
                <motion.div
                  id={regiaoId}
                  className="overflow-hidden"
                  initial={reduzir ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduzir ? undefined : { height: 0, opacity: 0 }}
                  transition={RECOLHER}
                >
                  <div className="flex flex-col gap-2 px-3 pb-3">
                    {etapa.descricao && (
                      <p className="truncate text-xs font-medium text-tertiary">
                        {etapa.descricao}
                      </p>
                    )}
                    <ol className="flex flex-col gap-1">
                      {etapa.passos.map((passo, n) => {
                        const atual = passo.status === "current";
                        return (
                          <li key={passo.id}>
                            <button
                              type="button"
                              disabled={passo.bloqueado}
                              onClick={passo.ir}
                              aria-label={
                                passo.bloqueado && passo.motivo
                                  ? `${passo.rotulo}. ${passo.motivo}`
                                  : passo.rotulo
                              }
                              className="group/linha relative -mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring enabled:cursor-pointer enabled:hover:bg-secondary_hover disabled:cursor-not-allowed"
                            >
                              {/* A ação vem antes no DOM para o passo ser sempre o último filho (sem o pb-8 do primitivo) e fica à direita por posição absoluta. */}
                              {atual && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm font-semibold text-brand-secondary underline underline-offset-2 group-hover/linha:text-brand-secondary_hover"
                                >
                                  {passo.acao}
                                </span>
                              )}
                              {/* O cadeado ocupa o lugar do número: passo bloqueado não tem posição na fila, tem um motivo. */}
                              {passo.bloqueado && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-1.5 left-2 z-20 flex size-8 items-center justify-center rounded-full bg-secondary ring-1 ring-secondary ring-inset"
                                >
                                  <Lock01 className="size-4 text-fg-quaternary" />
                                </span>
                              )}
                              <div className={atual ? "pr-24" : undefined}>
                                <IconLeftNumber
                                  step={n + 1}
                                  status={passo.status}
                                  title={passo.rotulo}
                                  description={undefined}
                                  connector={false}
                                  size="md"
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ol>
  );
}
