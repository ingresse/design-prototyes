import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight } from "@untitledui/icons";
import { motion, useReducedMotion } from "motion/react";
import { Surgir } from "@/components/foundations/transicao";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { useNavegarNoPainel } from "../../components/painel";
import { BackstageLayout } from "../../components/Backstage";
import { BuyerStep, type BuyerSearch } from "../components/BuyerStep";
import { ItemsStep } from "../components/ItemsStep";
import { OrderSuccess } from "../components/OrderSuccess";
import { PainelDePassos } from "../../components/painel-de-passos";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";
import { useEventoAtual } from "../../eventos/data/eventos";
import { AvisoDeEscala } from "../../itens/components/escala";
import { PaymentStep, type PaymentMethod } from "../components/PaymentStep";
import { ResumoPanel } from "../components/ResumoPanel";
import { SkipIdentificationModal } from "../components/SkipIdentificationModal";
import { cartCount, cartTicketCount, cartTotal, isTicket, type Cart } from "../data/carrinho";
import { addPedido, createPedido } from "../data/pedidos-store";
import { buscarCompradores, gravarVenda, linkDePagamento, useCatalogoDoBanco } from "../data/plataforma";
import { useMembroLogado } from "../../components/membros-store";
import { gerarIngressosCsv, gerarIngressosPdf } from "../utils/gerar-ingressos";
import type { Pedido } from "../data/pedidos";
import { EVENTO, formatBRL, isEmail, isValidEmail, type Buyer } from "../data/catalogo";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";

type Phase = "flow" | "processing" | "success";

/** Sem membro na organização (não deveria acontecer): o e-mail genérico da operação. */
const EMISSOR_PADRAO = "operacao@exemplo.com";

const STEP_TITLES = ["Comprador", "Itens", "Meio de pagamento"];
/** A etapa fica na URL (`?passo=`): o voltar do navegador volta uma etapa, não sai da venda (BIL-104). */
const PASSOS_NA_URL = ["comprador", "itens", "pagamento"] as const;

/** O que já foi feito na venda, guardado na sessão do navegador por evento (BIL-104). */
interface RascunhoDaVenda {
    term: string;
    search: BuyerSearch;
    skipped: boolean;
    cart: Cart;
    method: PaymentMethod | null;
}

const chaveDoRascunho = (eventoId: string) => `bilheteria:venda:v1:${eventoId}`;

function lerRascunho(eventoId: string): RascunhoDaVenda | null {
    try {
        const bruto = window.sessionStorage.getItem(chaveDoRascunho(eventoId));
        if (!bruto) return null;
        const r = JSON.parse(bruto) as RascunhoDaVenda;
        // Busca no meio do caminho não volta: volta o campo, sem resultado.
        if (r.search?.status === "searching") r.search = { status: "idle" };
        return r;
    } catch {
        return null;
    }
}

function gravarRascunho(eventoId: string, r: RascunhoDaVenda | null) {
    try {
        if (r) window.sessionStorage.setItem(chaveDoRascunho(eventoId), JSON.stringify(r));
        else window.sessionStorage.removeItem(chaveDoRascunho(eventoId));
    } catch {
        /* sem armazenamento: o rascunho vive só enquanto a tela está aberta */
    }
}

export function VenderIngressos() {
    const navigate = useNavegarNoPainel();
    // Ingressos à venda vêm do catálogo do evento em contexto (banco unificado).
    const { evento, sessoes, simulado } = useCatalogoDoBanco();
    const eventoId = useEventoAtual().id;
    // Operador (emissor) = o membro logado no Backstage (MEM-67).
    const emissor = useMembroLogado()?.email ?? EMISSOR_PADRAO;
    const [phase, setPhase] = useState<Phase>("flow");
    const [params, setParams] = useSearchParams();
    const step = Math.max(0, PASSOS_NA_URL.indexOf(params.get("passo") as (typeof PASSOS_NA_URL)[number]));
    const irPara = useCallback(
        (passo: number, replace = false) =>
            setParams(
                (atual) => {
                    const proximo = new URLSearchParams(atual);
                    proximo.set("passo", PASSOS_NA_URL[passo]);
                    return proximo;
                },
                { replace },
            ),
        [setParams],
    );

    // O feito volta da sessão do navegador (BIL-104): recarregar ou voltar não perde o carrinho.
    const [rascunho] = useState(() => lerRascunho(eventoId));
    const [term, setTerm] = useState(rascunho?.term ?? "");
    const [search, setSearch] = useState<BuyerSearch>(rascunho?.search ?? { status: "idle" });
    const [skipped, setSkipped] = useState(rascunho?.skipped ?? false);
    const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
    const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

    const [cart, setCart] = useState<Cart>(rascunho?.cart ?? {});
    const [method, setMethod] = useState<PaymentMethod | null>(rascunho?.method ?? null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    /** Pedido gerado ao concluir a venda — alimenta a tela de sucesso. */
    const [pedido, setPedido] = useState<Pedido | null>(null);

    const searchTimer = useRef<number | undefined>(undefined);

    const buyer: Buyer | null =
        search.status === "found"
            ? search.buyer
            : search.status === "multiple"
              ? (search.buyers.find((candidate) => candidate.id === search.selectedId) ?? null)
              : null;
    const fallbackEmail = search.status === "email-not-found" ? search.email : undefined;
    const total = cartTotal(cart);
    const count = cartCount(cart);
    const temAlgo = count > 0 || skipped || search.status !== "idle" || term.trim() !== "";

    // Guarda o feito na sessão enquanto a venda está aberta; concluída ou descartada, limpa.
    useEffect(() => {
        if (phase !== "flow") return;
        gravarRascunho(eventoId, temAlgo ? { term, search, skipped, cart, method } : null);
    }, [eventoId, phase, temAlgo, term, search, skipped, cart, method]);

    // Fechar a aba ou sair do site com a venda pela metade pergunta antes.
    useEffect(() => {
        if (phase !== "flow" || !temAlgo) return;
        const aviso = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", aviso);
        return () => window.removeEventListener("beforeunload", aviso);
    }, [phase, temAlgo]);

    /*
      O limite do evento é por documento, então só existe quando há documento:
      venda sem identificação passa direto, que é o caminho do pré-impresso.
      Ao esgotar, o + dos ingressos trava — nada de deixar somar e acusar depois.
    */
    const ingressosRestantes =
        skipped || EVENTO.limitePorDocumento <= 0 ? undefined : Math.max(0, EVENTO.limitePorDocumento - cartTicketCount(cart));

    // Etapa da URL sem o que ela precisa (ex.: abriu "?passo=pagamento" sem carrinho): volta até onde dá.
    const podeEstarEm = (passo: number) =>
        passo === 0 || ((skipped || Boolean(buyer) || search.status === "email-not-found") && (passo === 1 || count > 0));
    useEffect(() => {
        if (phase !== "flow" || podeEstarEm(step)) return;
        irPara(podeEstarEm(1) ? 1 : 0, true);
    });

    const canAdvance = useMemo(() => {
        if (step === 0) return skipped || Boolean(buyer) || search.status === "email-not-found";
        if (step === 1) return count > 0;
        return Boolean(method);
    }, [step, skipped, buyer, search.status, count, method]);

    const runSearch = useCallback(() => {
        const value = term.trim();
        if (!value) return;

        if (isEmail(value) && !isValidEmail(value)) {
            setSearch({ status: "invalid-email" });
            return;
        }

        setSearch({ status: "searching" });
        window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(() => {
            // Compradores da organização, nos pedidos do banco (BIL-20).
            const found = buscarCompradores(value, evento);
            if (found.length === 1) {
                setSearch({ status: "found", buyer: found[0] });
            } else if (found.length > 1) {
                setSearch({ status: "multiple", buyers: found, porNome: !isEmail(value) });
            } else if (isEmail(value)) {
                setSearch({ status: "email-not-found", email: value });
            } else {
                setSearch({ status: "document-not-found" });
            }
        }, 1200);
    }, [term, evento]);

    const resetFlow = useCallback(() => {
        gravarRascunho(eventoId, null);
        irPara(0, true);
        setTerm("");
        setSearch({ status: "idle" });
        setSkipped(false);
        setCart({});
        setMethod(null);
        setIsSummaryOpen(false);
        setPedido(null);
    }, [eventoId, irPara]);

    const handleQuantityChange = useCallback(
        (id: string, quantity: number) => {
            setCart((current) => {
                const next = { ...current };
                if (quantity <= 0) {
                    delete next[id];
                    return next;
                }

                /*
                  A trava mora aqui, não no input: o teto vale para o carrinho
                  inteiro, e cada campo só conhece a própria linha. Sem isso, o
                  ingresso que atingiu o limite parava, mas o vizinho continuava
                  somando por cima.
                */
                const limite = skipped ? 0 : EVENTO.limitePorDocumento;
                if (limite > 0 && isTicket(id)) {
                    const outros = cartTicketCount(current) - (current[id] ?? 0);
                    next[id] = Math.max(0, Math.min(quantity, limite - outros));
                    if (next[id] === 0) delete next[id];
                    return next;
                }

                next[id] = quantity;
                return next;
            });
        },
        [skipped],
    );

    const handleAdvance = useCallback(() => {
        if (!canAdvance || step >= 2) return;
        /*
          Chegando no meio de pagamento, o link já vem marcado: é o caminho que a
          bilheteria nova quer como padrão. Sem identificação ele não existe, e aí
          a única opção possível é que assume — o operador não escolhe duas vezes.
        */
        if (step === 1 && !method) setMethod(skipped ? "saldo" : "link");
        irPara(step + 1);
    }, [canAdvance, step, skipped, method, irPara]);

    /** No passo 3 a escolha do meio de pagamento já conclui a venda. */
    const handleSelectMethod = useCallback(
        (selectedMethod: PaymentMethod) => {
            setMethod(selectedMethod);
            setPhase("processing");
            const espera = new Promise((resolve) => window.setTimeout(resolve, 2200));
            const eventoId = evento?.id ?? "";
            Promise.all([gravarVenda({ eventoId, cart, buyer, fallbackEmail, tipo: selectedMethod }), espera])
                .then(([noBanco]) => {
                    const novoPedido = createPedido({
                        id: noBanco.id,
                        eventoId,
                        cart,
                        buyer,
                        fallbackEmail,
                        tipo: selectedMethod,
                        emissor,
                        paymentLink: linkDePagamento(noBanco.id),
                    });
                    addPedido(novoPedido);
                    setPedido(novoPedido);
                    gravarRascunho(eventoId, null);
                    setPhase("success");
                })
                .catch(() => {
                    toast.error("Não foi possível registrar a venda. Tente de novo.");
                    setPhase("flow");
                });
        },
        [cart, buyer, fallbackEmail, evento?.id, emissor, eventoId],
    );

    // Só o passo 1 volta para a lista, perguntando antes de descartar o feito (BIL-104); a tela de pedido emitido não tem "voltar".
    const sairDaVenda = useCallback(() => {
        gravarRascunho(eventoId, null);
        navigate("/backstage/bilheteria");
    }, [eventoId, navigate]);
    const handleBack = useCallback(() => {
        if (step === 0) {
            if (temAlgo) setConfirmandoDescarte(true);
            else sairDaVenda();
            return;
        }
        irPara(step - 1);
    }, [step, temAlgo, sairDaVenda, irPara]);

    /* --------------------------------------------------------------- */

    /* Rodapé do painel de passos (BIL-80, BIL-81): Voltar sempre; a ação principal muda por etapa. */
    const voltar = (
        <Button size="md" color="secondary" iconLeading={ChevronLeft} onClick={handleBack}>
            Voltar
        </Button>
    );
    const avancar = (
        <Button size="md" color="primary" iconTrailing={ChevronRight} isDisabled={!canAdvance} onClick={handleAdvance}>
            Avançar
        </Button>
    );
    const semItensAVenda = step === 1 && sessoes.length === 0;
    const rodapeInicio =
        step === 0 ? (
            <Button size="md" color="secondary" onClick={() => setIsSkipModalOpen(true)} isDisabled={EVENTO.identificacaoObrigatoria}>
                Pular identificação
            </Button>
        ) : undefined;
    const rodapeFim = (
        <>
            {voltar}
            {step < 2 && !semItensAVenda && avancar}
            {/* O botão diz o que acontece: gerar o link ou emitir os ingressos (BIL-105). Com o catálogo simulado, nada é gravado. */}
            {step === 2 && (
                <Button size="md" color="primary" isDisabled={!method || Boolean(simulado)} onClick={() => method && handleSelectMethod(method)}>
                    {method === "saldo" ? "Emitir ingressos" : "Gerar link de pagamento"}
                </Button>
            )}
        </>
    );
    /* No celular, a barra fixa leva o resumo da etapa (UI-MOB-001): no passo Itens, o carrinho recolhível e o total. */
    const resumoNoCelular =
        step === 1 && !semItensAVenda ? (
            <ResumoNoCelular
                cart={cart}
                total={total}
                count={count}
                isOpen={isSummaryOpen}
                onToggle={() => setIsSummaryOpen((open) => !open)}
                onRemove={(id) => handleQuantityChange(id, 0)}
                onRemoveAll={() => setCart({})}
            />
        ) : step === 2 ? (
            <p className="text-sm text-tertiary">
                {count === 1 ? "1 item" : `${count} itens`}, <span className="font-semibold text-primary">{formatBRL(total)}</span>
            </p>
        ) : undefined;

    return (
        <BackstageLayout activeSection="bilheteria" activeItem="bilheteria-online">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {phase !== "flow" && <CabecalhoDaPagina titulo="Vender ingressos" />}

                {phase === "processing" && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
                        <LoadingIndicator type="dot-circle" size="md" />
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-display-xs font-bold text-primary">Processando compra</p>
                            <p className="text-sm text-tertiary">Isso pode levar alguns segundos</p>
                        </div>
                    </div>
                )}

                {phase === "success" && (
                    <main className="flex flex-1 flex-col items-center gap-6">
                        <OrderSuccess
                            orderId={pedido?.id ?? ""}
                            channel={method === "link" ? "link" : "saldo"}
                            buyer={buyer}
                            fallbackEmail={fallbackEmail}
                            paymentLink={pedido?.paymentLink ?? ""}
                            onNewSale={() => {
                                resetFlow();
                                setPhase("flow");
                            }}
                            onManageOrders={() => navigate("/backstage/bilheteria")}
                            onDownload={(format) => {
                                if (!pedido) return;
                                if (format === "pdf") gerarIngressosPdf(pedido);
                                if (format === "csv") gerarIngressosCsv(pedido);
                                if (format === "zebra") toast("Impressão Zebra ainda não está disponível neste protótipo");
                            }}
                            onSend={(canal, destino) =>
                                toast.success(
                                    canal === "email"
                                        ? `${method === "link" ? "Link de pagamento" : "Ingressos"} enviado para ${destino}`
                                        : `${method === "link" ? "Link de pagamento" : "Ingressos"} enviado no WhatsApp ${destino}`,
                                )
                            }
                        />
                    </main>
                )}

                {phase === "flow" && (
                    <PainelDePassos
                        titulo="Vender ingressos"
                        passos={STEP_TITLES}
                        atual={step}
                        rodapeInicio={rodapeInicio}
                        rodapeFim={rodapeFim}
                        resumoNoCelular={resumoNoCelular}
                        lateral={
                            step === 1 && !semItensAVenda ? (
                                <ResumoPanel
                                    cart={cart}
                                    onRemove={(id) => handleQuantityChange(id, 0)}
                                    onRemoveAll={() => setCart({})}
                                    className="max-h-[calc(100vh-20rem)] min-h-[240px] overflow-y-auto"
                                />
                            ) : undefined
                        }
                    >
                        <AvisoDeEscala />
                        {step === 0 && (
                            <BuyerStep
                                term={term}
                                onTermChange={setTerm}
                                search={search}
                                onSearch={runSearch}
                                onSkip={() => setIsSkipModalOpen(true)}
                                onSelectBuyer={(buyerId) =>
                                    setSearch((current) => (current.status === "multiple" ? { ...current, selectedId: buyerId } : current))
                                }
                                semAcoes
                            />
                        )}

                        {semItensAVenda && (
                            <div className="flex w-full flex-col items-center gap-2 py-16 text-center">
                                <p className="text-lg font-semibold text-primary">Nenhum ingresso à venda neste evento</p>
                                <p className="text-sm text-tertiary">Crie ingressos em Ingressos e produtos e deixe pelo menos um ativo.</p>
                                <Button size="md" color="secondary" className="mt-2" onClick={() => navigate("/backstage/catalogo/ingressos")}>
                                    Ir para Ingressos
                                </Button>
                            </div>
                        )}

                        {step === 1 && !semItensAVenda && (
                            <ItemsStep
                                cart={cart}
                                facialBlocked={skipped}
                                onQuantityChange={handleQuantityChange}
                                ingressosRestantes={ingressosRestantes}
                            />
                        )}

                        {step === 2 && (
                            <PaymentStep
                                cart={cart}
                                buyer={buyer}
                                fallbackEmail={fallbackEmail}
                                method={method}
                                onMethodChange={setMethod}
                                onSelectMethod={handleSelectMethod}
                                onQuantityChange={handleQuantityChange}
                                linkBlocked={skipped}
                                taxa={evento?.taxaServico}
                                semAcao
                            />
                        )}
                    </PainelDePassos>
                )}

            </div>
            <SkipIdentificationModal
                isOpen={isSkipModalOpen}
                onClose={() => setIsSkipModalOpen(false)}
                onConfirm={() => {
                    setSkipped(true);
                    setSearch({ status: "idle" });
                    setTerm("");
                    setMethod("saldo");
                    irPara(1);
                }}
            />
            <ModalDeConfirmacao
                aberto={confirmandoDescarte}
                titulo="Descartar a venda?"
                descricao="O comprador e os itens escolhidos serão perdidos."
                confirmar="Descartar"
                cancelar="Continuar vendendo"
                destrutiva
                onConfirmar={sairDaVenda}
                onFechar={() => setConfirmandoDescarte(false)}
            />
        </BackstageLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Resumo do passo Itens na barra fixa do celular                     */
/* ------------------------------------------------------------------ */

interface ResumoNoCelularProps {
    cart: Cart;
    total: number;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
    onRemove: (id: string) => void;
    onRemoveAll: () => void;
}

const ResumoNoCelular = ({ cart, total, count, isOpen, onToggle, onRemove, onRemoveAll }: ResumoNoCelularProps) => {
    const reduzir = useReducedMotion();
    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-primary"
            >
                <span>
                    Resumo, {count === 1 ? "1 item" : `${count} itens`}: <span className="font-semibold">{formatBRL(total)}</span>{" "}
                    <span className="font-normal text-tertiary">mais taxas</span>
                </span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={reduzir ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }} className="flex">
                    <ChevronDown className="size-5 text-fg-quaternary" aria-hidden="true" />
                </motion.span>
            </button>
            {/* Abre deslizando a altura (UI-VIS-008). */}
            <Surgir visivel={isOpen}>
                <div className="max-h-[50vh] overflow-y-auto pb-2">
                    <ResumoPanel cart={cart} onRemove={onRemove} onRemoveAll={onRemoveAll} showTotal={false} className="min-h-0 ring-0" />
                </div>
            </Surgir>
        </div>
    );
};
