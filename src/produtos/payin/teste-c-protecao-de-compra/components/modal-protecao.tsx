import { type FC, useEffect, useRef, useState } from "react";
import { ActivityHeart, Bus, Home02, Scales02 } from "@untitledui/icons";
import {
  Dialog as AriaDialog,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { cx } from "@/utils/cx";
import chevronDown from "../assets/chevron-down.svg";
import glow from "../assets/glow.svg";
import icCheck from "../assets/ic-check.svg";
import ring144 from "../assets/ring-144.svg";
import ring192 from "../assets/ring-192.svg";
import ring240 from "../assets/ring-240.svg";
import ring96 from "../assets/ring-96.svg";
import shieldTickBranco from "../assets/shield-tick-branco.svg";
import { brl } from "../data/evento";
import { usePedido } from "../data/pedido-store";
import "./modal-protecao.css";

interface Cobertura {
  icone: FC<{ className?: string }>;
  titulo: string;
  casos: string[];
}

const COBERTURAS: Cobertura[] = [
  {
    icone: ActivityHeart,
    titulo: "Saúde",
    casos: [
      "Acidente, doença ou lesão",
      "Condição médica preexistente",
      "Infecção por COVID-19 e isolamento",
    ],
  },
  {
    icone: Bus,
    titulo: "Imprevistos no caminho",
    casos: ["Falha no transporte público", "Falha de veículo privado"],
  },
  {
    icone: Home02,
    titulo: "Emergências em casa",
    casos: ["Emergência doméstica", "Chamada de serviços de emergência"],
  },
  {
    icone: Scales02,
    titulo: "Documentos e questões judiciais",
    casos: ["Roubo de documentos", "Intimação judicial"],
  },
];

/** Depois de "Continuar com proteção" o modal fica na tela com o card verde antes de fechar (spec: ~600ms). */
const ESPERA_PROTEGIDO_MS = 600;

/**
 * Novo modal de proteção (v.5): a oferta abre sobre o checkout, antes dos meios de pagamento.
 * Não tem "X" nem fecha ao clicar fora ou no Esc: as saídas são "Continuar com proteção" e "Prefiro correr o risco".
 * Desktop: card central de 480px. Celular: folha ancorada no rodapé.
 * A sequência de entrada e as micro-interações estão em modal-protecao.css, seguindo o quadro "Animação & handoff" do Figma.
 */
export function ModalProtecao({
  aberto,
  onEscolher,
}: {
  aberto: boolean;
  onEscolher: (comProtecao: boolean) => void;
}) {
  return (
    <AriaModalOverlay
      isOpen={aberto}
      isDismissable={false}
      isKeyboardDismissDisabled
      className="tc-protecao fixed inset-0 z-50 flex min-h-dvh w-full items-end justify-center font-['Elza'] outline-hidden sm:items-center sm:p-8"
    >
      <div
        aria-hidden="true"
        className="tc-scrim absolute inset-0 bg-[rgba(10,10,10,0.7)]"
      />
      <Conteudo onEscolher={onEscolher} />
    </AriaModalOverlay>
  );
}

/** Conteúdo do modal. Fica num componente próprio para o estado (coberturas, protegido) zerar a cada abertura. */
function Conteudo({
  onEscolher,
}: {
  onEscolher: (comProtecao: boolean) => void;
}) {
  const { valorProtecao } = usePedido();
  const [coberturasAbertas, setCoberturasAbertas] = useState(false);
  const [protegido, setProtegido] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(espera.current), []);

  const continuarComProtecao = () => {
    if (protegido) return;
    setProtegido(true);
    espera.current = setTimeout(() => onEscolher(true), ESPERA_PROTEGIDO_MS);
  };

  return (
    <AriaModal
      data-coberturas={coberturasAbertas}
      className="tc-modal relative flex max-h-[calc(100dvh-56px)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_4px_-2px_rgba(0,0,0,0.04)] outline-hidden sm:max-h-full sm:max-w-[480px] sm:rounded-2xl"
    >
      <AriaDialog className="flex min-h-0 flex-1 flex-col outline-hidden">
        {/* Alça da folha (só no celular) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-2 z-10 mx-auto h-1 w-9 rounded-xs bg-[#d4d4d4] sm:hidden"
        />

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {/* overflow-clip: os deslocamentos da entrada (Y +8) não criam barra de rolagem passageira */}
          <div className="overflow-clip">
            <header className="flex flex-col items-center px-5 pt-10 sm:px-8 sm:pt-8">
              <div
                aria-hidden="true"
                className="tc-icone relative mb-3 size-12 shrink-0 sm:mb-4 sm:size-14"
              >
                <span className="tc-aneis absolute inset-0">
                  <img
                    src={ring96}
                    alt=""
                    className="absolute top-1/2 left-1/2 max-w-none -translate-1/2"
                  />
                  <img
                    src={ring144}
                    alt=""
                    className="absolute max-sm:opacity-[0.86] top-1/2 left-1/2 max-w-none -translate-1/2"
                  />
                  <img
                    src={ring192}
                    alt=""
                    className="absolute max-sm:opacity-[0.67] top-1/2 left-1/2 max-w-none -translate-1/2"
                  />
                  <img
                    src={ring240}
                    alt=""
                    className="absolute top-1/2 left-1/2 max-w-none -translate-1/2 max-sm:hidden"
                  />
                </span>
                {/* Pulsos: anel cinza de 160px (celular) / 200px (desktop), traço de 2px, que cresce e some */}
                <span className="absolute top-1/2 left-1/2 size-40 -translate-1/2 sm:size-[200px]">
                  <span className="tc-pulso absolute inset-0 rounded-full border-2 border-[rgba(115,115,115,0.12)]" />
                  <span className="tc-pulso tc-pulso-2 absolute inset-0 rounded-full border-2 border-[rgba(115,115,115,0.08)]" />
                </span>
                <span className="tc-escudo absolute inset-0">
                  <img
                    src={glow}
                    alt=""
                    className="absolute top-1/2 left-1/2 size-[92px] max-w-none -translate-1/2 sm:size-[108px]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full border-[7px] border-[#fff8f7] bg-[#fff1f0] sm:border-8">
                    {/* Escudo em SVG na página (mesmo desenho do asset shield-tick) para o check poder ser desenhado */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-[22px] sm:size-6"
                    >
                      <path
                        d="M20 13C20 18 16.5 20.5 12.34 21.95C12.1222 22.0238 11.8855 22.0203 11.67 21.94C7.5 20.5 4 18 4 13V6C4 5.73478 4.10536 5.48043 4.29289 5.29289C4.48043 5.10536 4.73478 5 5 5C7 5 9.5 3.8 11.24 2.28C11.4519 2.099 11.7214 1.99955 12 1.99955C12.2786 1.99955 12.5481 2.099 12.76 2.28C14.51 3.81 17 5 19 5C19.2652 5 19.5196 5.10536 19.7071 5.29289C19.8946 5.48043 20 5.73478 20 6V13Z"
                        stroke="#FF271A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        className="tc-check"
                        pathLength={1}
                        d="M9 12L11 14L15 10"
                        stroke="#FF271A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </div>

              <AriaHeading
                slot="title"
                className="tc-titulo relative w-full text-center text-[24px] leading-8 font-semibold tracking-[-0.24px] text-[#171717]"
              >
                Imprevistos acontecem.
                <br />
                Proteja sua compra.
              </AriaHeading>
            </header>

            <p className="tc-apoio relative px-5 pt-2 text-center text-[15px] leading-[22px] text-[#525252] sm:px-8 sm:text-md sm:leading-6">
              Se um imprevisto coberto te impedir de ir ao evento, você pode
              pedir o reembolso do valor pago.
            </p>

            <div className="tc-card relative px-5 pt-4 pb-3 sm:px-8 sm:pt-6 sm:pb-0">
              <div className="relative">
                <div
                  className={cx(
                    "tc-cartao relative overflow-hidden rounded-xl border shadow-xs",
                    protegido
                      ? "border-[#75e0a7] bg-[#f6fef9]"
                      : "border-[#e5e5e5] bg-white",
                  )}
                >
                  <p className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-sm text-[#525252]">
                      Valor da proteção
                    </span>
                    <span className="text-md font-semibold text-[#262626] tabular-nums">
                      {brl(valorProtecao)}
                    </span>
                  </p>

                  <button
                    type="button"
                    aria-expanded={coberturasAbertas}
                    aria-controls="coberturas-protecao"
                    onClick={() => setCoberturasAbertas((a) => !a)}
                    className="flex h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold text-[#c81f14] outline-focus-ring transition duration-100 ease-linear hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    Conheça as coberturas
                    <img
                      src={chevronDown}
                      alt=""
                      className={cx(
                        "tc-chevron",
                        coberturasAbertas && "rotate-180",
                      )}
                    />
                  </button>

                  <div
                    id="coberturas-protecao"
                    className="tc-coberturas"
                    data-aberto={coberturasAbertas}
                  >
                    <div>
                      {/* Desktop: duas colunas com os casos em lista */}
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 pt-1 pb-4 max-sm:hidden">
                        {COBERTURAS.map(({ icone: Icone, titulo, casos }) => (
                          <li key={titulo} className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-2.5">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs">
                                <Icone className="size-[18px] text-[#404040]" aria-hidden="true" />
                              </span>
                              <span className="flex-1 text-sm font-semibold text-[#171717]">
                                {titulo}
                              </span>
                            </span>
                            <ul className="flex flex-col gap-1.5">
                              {casos.map((caso) => (
                                <li
                                  key={caso}
                                  className="flex items-start gap-2 text-sm text-[#525252]"
                                >
                                  <img
                                    src={icCheck}
                                    alt=""
                                    className="shrink-0"
                                  />
                                  <span className="flex-1">{caso}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>

                      {/* Celular: uma coluna, casos em linha separados por "·" */}
                      <ul className="flex flex-col gap-3.5 px-4 pt-1 pb-4 sm:hidden">
                        {COBERTURAS.map(({ icone: Icone, titulo, casos }) => (
                          <li key={titulo} className="flex items-start gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs">
                              <Icone className="size-4 text-[#404040]" aria-hidden="true" />
                            </span>
                            <span className="flex-1 pt-1 text-sm text-[#525252]">
                              <span className="block font-semibold text-[#171717]">
                                {titulo}
                              </span>
                              {casos.join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="tc-picote pointer-events-none absolute inset-x-[15px] top-[51px] h-px"
                  />
                </div>

                {/* Recortes laterais do "ingresso", na altura do picote */}
                {["-left-2", "-right-2"].map((lado) => (
                  <span
                    key={lado}
                    aria-hidden="true"
                    className={cx(
                      "tc-recorte absolute top-[45px] size-4 rounded-full border bg-white",
                      lado,
                      protegido ? "border-[#75e0a7]" : "border-[#e5e5e5]",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="tc-acoes relative shrink-0">
          <div className="tc-rodape flex flex-col gap-1 bg-white px-5 pt-3 pb-4 sm:px-8 sm:pt-4">
            <button
              type="button"
              onClick={continuarComProtecao}
              className="relative flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-white/12 bg-[#ff271a] bg-clip-padding px-[18px] py-2.5 text-md font-semibold text-white shadow-xs-skeuomorphic outline-focus-ring transition duration-100 ease-linear hover:bg-[#c81f14] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span
                aria-hidden="true"
                className="tc-brilho pointer-events-none absolute inset-y-0 left-0"
              />
              <img src={shieldTickBranco} alt="" className="relative" />
              <span className="relative px-0.5">Continuar com proteção</span>
            </button>
            <button
              type="button"
              disabled={protegido}
              onClick={() => onEscolher(false)}
              className="w-full rounded-lg px-4 py-2.5 text-md font-semibold text-[#525252] outline-focus-ring transition duration-100 ease-linear hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Prefiro correr o risco
            </button>
          </div>
        </div>
      </AriaDialog>
    </AriaModal>
  );
}
