import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { useGuiaDeConfiguracao } from "../data/use-guia";
import { ROTA_ABERTURAS, useEtapas } from "../data/use-etapas";
import {
  definirPainelAberto,
  informarPainelVisivel,
  useEscolhaDoPainel,
  usePedidosDeExpandir,
} from "../data/visibilidade";
import { HOLOFOTE_FIXO, HolofoteDoGuia } from "./holofote-do-guia";
import { PainelDoGuia } from "./painel-do-guia";
import { GuiaNoCelular } from "./guia-no-celular";

export { PARAMETRO_NOVO_SETOR, ROTA_ABERTURAS } from "../data/use-etapas";

interface GuiaDeConfiguracaoProps {
  /** Evento em contexto: os passos da etapa "Configure o evento" são dele. */
  eventoId: string;
  /** Tela do evento: o painel aparece sozinho enquanto houver passo pendente (GDC-01). */
  telaDeEvento: boolean;
  /** Abre o modal de status do evento já com o destino escolhido. */
  abrirModalDeStatus: (status: "publicado") => void;
  /** Começa recolhido nesta tela, sem gravar a escolha (GDC-44). */
  recolher?: boolean;
  /** Shell com barra no topo: painel no canto superior direito, abaixo do botão "Guia" (GDC-16). */
  noTopo?: boolean;
  /** Gaveta do celular (menu do evento ou da organização) aberta: a barra do guia sai de cena (GDC-75). */
  gavetaAberta?: boolean;
}

/**
 * Monta o guia: o painel em acordeão, o holofote de apresentação e as ações de cada passo. Vive no
 * BackstageLayout. Nas telas do evento aparece sozinho (GDC-01); em qualquer tela, o botão "Guia"
 * abre e fecha (GDC-60).
 */
export function GuiaDeConfiguracao({
  eventoId,
  telaDeEvento,
  abrirModalDeStatus,
  recolher: recolherPelaTela = false,
  noTopo = false,
  gavetaAberta = false,
}: GuiaDeConfiguracaoProps) {
  const guia = useGuiaDeConfiguracao(eventoId);
  const escolha = useEscolhaDoPainel();
  const [folhaAberta, setFolhaAberta] = useState(false);
  // Ir para um passo fecha a folha do celular (GDC-72).
  const fecharFolha = useCallback(() => setFolhaAberta(false), []);
  const etapas = useEtapas({
    guiaDoEvento: guia,
    abrirModalDeStatus: telaDeEvento ? abrirModalDeStatus : undefined,
    aoIr: fecharFolha,
  });
  const [painel, setPainel] = useState<HTMLElement | null>(null);

  // Abaixo de 768 px (sem barra do topo), o guia vira a barra do pé com a folha (GDC-70).
  const celular = !useBreakpoint("md");
  const { pathname } = useLocation();
  // Telas de dados, formulário e operação abrem com o painel recolhido, para não cobrir a meta, os campos
  // ou a venda (GDC-44, GDC-77). As de operação e formulário também tiram a barra do celular (GDC-71).
  const telaDeOperacao = ROTAS_DE_OPERACAO.some((r) => pathname.startsWith(r));
  const recolher =
    recolherPelaTela ||
    telaDeOperacao ||
    ROTAS_DE_DADOS.some((r) => pathname.startsWith(r));
  const barraFixa = useBarraFixaNaTela(celular);
  // No meio de uma configuração, a barra do celular desce e sai; volta subindo ao terminar (GDC-71).
  const configurando =
    recolherPelaTela ||
    telaDeOperacao ||
    barraFixa ||
    ROTAS_DE_CONFIGURACAO.some((r) => pathname.startsWith(r));
  // Fora das telas do evento (BKS-06), o guia não mostra a etapa "Configure o evento", no desktop e no
  // celular: fica só com Organização e Crie o primeiro evento (GDC-73, GDC-78).
  const etapasDaTela = telaDeEvento ? etapas : etapas.filter((e) => e.id !== "evento");
  // No celular, evento realizado ou encerrado também fica sem os passos dele (GDC-76); a barra some
  // quando o que sobra acaba.
  const etapasNoCelular = guia.realizado ? etapasDaTela.filter((e) => e.id !== "evento") : etapasDaTela;
  const pendente = (celular ? etapasNoCelular : etapasDaTela).some((e) => !e.feita);

  // Sem escolha pelo botão, vale a regra do evento; com escolha, ela manda em todas as telas (GDC-60).
  // No celular não há botão: a barra fica enquanto houver passo pendente e o guia não foi fechado.
  const visivel = celular
    ? escolha !== false && pendente
    : (escolha ?? (telaDeEvento && guia.superficie === "painel"));
  useEffect(() => {
    informarPainelVisivel(visivel);
    return () => informarPainelVisivel(false);
  }, [visivel]);

  // Em tela de formulário, recolhido por padrão; expandir vale só para esta visita (GDC-44).
  const [abertoAqui, setAbertoAqui] = useState(false);
  const minimizado = recolher ? !abertoAqui : guia.minimizado;
  const alternarMinimizado = recolher
    ? () => setAbertoAqui((a) => !a)
    : guia.alternarMinimizado;

  // Abrir pelo botão traz o painel expandido.
  const pedidos = usePedidosDeExpandir();
  const ultimoPedido = useRef(pedidos);
  useEffect(() => {
    if (pedidos === ultimoPedido.current) return;
    ultimoPedido.current = pedidos;
    if (minimizado) alternarMinimizado();
  }, [pedidos, minimizado, alternarMinimizado]);

  // No topo (a partir de 640px) o painel não disputa o pé da tela com toasts e barras de salvar (GDC-16).
  const desktop = useBreakpoint("sm");
  const noPeDaTela = !(noTopo && desktop);
  useReservarEspacoDosToasts(
    noPeDaTela && visivel && !(celular && configurando) ? painel : null,
  );
  useSubirAcimaDaBarraFixa(noPeDaTela && visivel && !celular);

  // Mexeu no painel, o holofote sai de cena (GDC-14).
  const { concluirHolofote } = guia;
  // HOLOFOTE_FIXO (temporário): o holofote fica sempre que o painel está na tela e não sai no clique.
  const holofotePendente =
    (HOLOFOTE_FIXO || guia.holofotePendente) && visivel && !(celular && configurando);
  useEffect(() => {
    if (!painel || !holofotePendente || HOLOFOTE_FIXO) return;
    painel.addEventListener("click", concluirHolofote, { capture: true });
    return () =>
      painel.removeEventListener("click", concluirHolofote, { capture: true });
  }, [painel, holofotePendente, concluirHolofote]);

  // Fechar pelo X vale para a sessão; na tela do evento, também fecha o guia dele (GDC-10).
  const fechar = () => {
    definirPainelAberto(false);
    if (telaDeEvento) guia.fechar();
  };

  return (
    <>
      <AnimatePresence>
        {holofotePendente && (
          <HolofoteDoGuia onConcluir={concluirHolofote} noTopo={noTopo} />
        )}
      </AnimatePresence>
      {celular ? (
        visivel && (
          <GuiaNoCelular
            barraRef={setPainel}
            etapas={etapasNoCelular}
            escondido={configurando || gavetaAberta}
            folhaAberta={folhaAberta}
            onAlternarFolha={setFolhaAberta}
            onFechar={() => {
              setFolhaAberta(false);
              fechar();
            }}
          />
        )
      ) : (
        <AnimatePresence>
          {visivel && (
            <PainelDoGuia
              painelRef={setPainel}
              etapas={etapasDaTela}
              minimizado={minimizado}
              onAlternarMinimizado={alternarMinimizado}
              onFechar={fechar}
              noTopo={noTopo}
            />
          )}
        </AnimatePresence>
      )}
    </>
  );
}

/**
 * Telas de operação e de formulário (GDC-77): o painel abre recolhido no desktop e a barra do celular sai
 * de cena, como nas telas de um passo em andamento. Venda da bilheteria, passos da emissão de cortesia,
 * Pixel de rastreamento e Informações do evento. Se o guia deve aparecer nelas é decisão da área (Em aberto).
 */
const ROTAS_DE_OPERACAO = [
  "/backstage/bilheteria/vender",
  "/backstage/itens",
  "/backstage/destinatarios",
  "/backstage/verificacao",
  "/backstage/marketing/pixel",
  "/backstage/informacoes-evento",
  // Vincular itens da Passkey tem barra fixa no pé do celular (CHA-50): a do guia ficava por cima (23/11/2026).
  "/backstage/marketing/chave-de-acesso/vincular-itens",
];

/** Telas de dados (GDC-77): o painel abre recolhido no desktop; no celular a barra fica (a página reserva o fim). */
const ROTAS_DE_DADOS = ["/backstage/evento/visao-geral"];

/** Telas de um passo em andamento: a barra do guia no celular sai de cena nelas (GDC-71). */
const ROTAS_DE_CONFIGURACAO = [
  "/backstage/eventos/novo",
  "/backstage/catalogo/ingressos/novo",
  ROTA_ABERTURAS,
  "/backstage/ajustes",
];

/** Existe barra fixa de salvar, cancelar ou seleção (`data-barra-fixa`) visível na tela. */
function useBarraFixaNaTela(ativo: boolean): boolean {
  const [presente, setPresente] = useState(false);
  useEffect(() => {
    if (!ativo) return setPresente(false);
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      setPresente(
        [...document.querySelectorAll<HTMLElement>("[data-barra-fixa]")].some(
          (b) => b.getBoundingClientRect().height > 0,
        ),
      );
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    const observador = new MutationObserver(agendar);
    observador.observe(document.body, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [ativo]);
  return presente;
}

/**
 * O que sobra depois de fechar o guia, quando o passo atual trava a venda (GDC-43).
 * Sem X de propósito: um estado não se dispensa; resolvido o passo, o alerta some sozinho.
 */
export function AlertaDoGuia({ eventoId, onAcao }: { eventoId: string | undefined; /** Faz a ação ali mesmo (ex.: abre o painel da abertura); sem ela, navega para a tela do passo. */ onAcao?: () => void }) {
  const navigate = useNavigate();
  const guia = useGuiaDeConfiguracao(eventoId);
  const alerta =
    guia.superficie === "alerta" ? guia.passoDoAlerta?.alerta : undefined;
  if (!alerta) return null;
  return (
    <div role="status">
      <AlertFloating
        color="warning"
        title={alerta.titulo}
        description={alerta.descricao}
        confirmLabel={alerta.acao}
        onConfirm={() => (onAcao ? onAcao() : navigate(ROTA_ABERTURAS))}
      />
    </div>
  );
}

/**
 * Toasts (sonner, canto inferior direito) sobem para cima do painel enquanto ele está na tela,
 * em vez de cobri-lo. Só a partir de 640px: no celular o painel ocupa a largura e o toast fica por cima dele.
 */
function useReservarEspacoDosToasts(painel: HTMLElement | null) {
  useEffect(() => {
    if (!painel) return;
    const estilo = document.createElement("style");
    const atualizar = () => {
      const altura = Math.round(painel.getBoundingClientRect().height);
      estilo.textContent = `@media (min-width: 640px) { [data-sonner-toaster][data-y-position="bottom"][data-x-position="right"] { --offset-bottom: ${altura + 24 + 12}px !important; } }`;
      // Espaço que a página reserva no fim e que a barra de salvar fixa sobe, para o painel não cobrir ação (GDC-43).
      // Espaço que a página reserva no fim, para o painel não cobrir o último conteúdo (GDC-43).
      const desktop = window.matchMedia("(min-width: 640px)").matches;
      document.documentElement.style.setProperty(
        "--altura-do-guia",
        `${altura + (desktop ? 24 : 16) + 12}px`,
      );
    };
    atualizar();
    document.head.appendChild(estilo);
    const observador = new ResizeObserver(atualizar);
    observador.observe(painel);
    window.addEventListener("resize", atualizar);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", atualizar);
      estilo.remove();
      document.documentElement.style.removeProperty("--altura-do-guia");
    };
  }, [painel]);
}

/**
 * Barra fixa de salvar, cancelar ou seleção (`data-barra-fixa`) no pé da tela: o painel sobe junto,
 * para não ficar na frente dos botões (GDC-43). Mede a barra visível que chega perto do pé da tela e
 * guarda a altura em `--altura-barra-fixa`, que o painel soma à margem de baixo.
 */
function useSubirAcimaDaBarraFixa(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const raiz = document.documentElement;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      let altura = 0;
      for (const barra of document.querySelectorAll<HTMLElement>(
        "[data-barra-fixa]",
      )) {
        const r = barra.getBoundingClientRect();
        // Visível e encostada no pé da tela (presa pelo sticky ou terminando nele).
        if (
          r.height > 0 &&
          r.top < window.innerHeight &&
          r.bottom >= window.innerHeight - 4
        )
          altura = Math.max(altura, window.innerHeight - r.top);
      }
      raiz.style.setProperty("--altura-barra-fixa", `${Math.round(altura)}px`);
    };
    const agendar = () => {
      if (!quadro) quadro = requestAnimationFrame(medir);
    };
    medir();
    // A barra aparece, some e muda de altura (Surgir), e a página rola: mede de novo a cada mudança.
    const observador = new MutationObserver(agendar);
    observador.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    window.addEventListener("scroll", agendar, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", agendar);
    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", agendar, { capture: true });
      window.removeEventListener("resize", agendar);
      if (quadro) cancelAnimationFrame(quadro);
      raiz.style.removeProperty("--altura-barra-fixa");
    };
  }, [ativo]);
}
