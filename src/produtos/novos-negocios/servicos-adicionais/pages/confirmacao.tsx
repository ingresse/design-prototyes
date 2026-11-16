import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { CheckCircle, Copy01, LinkExternal01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";
import { useForceLightTheme } from "../../utils/use-force-light-theme";
import { FundoPagina } from "../components/fundo-pagina";
import { Topo } from "../components/topo";
import { brl, type Servico } from "../data/servicos";
import { lerPedido, nomeItem, totalPedido, type ItemPedido } from "../utils/pedido";

/**
 * Confirmação da compra. Sem vínculo com evento: nada de card do evento nem sugestão de
 * outro serviço (não há garantia de que a pessoa tenha ingresso).
 * Quando o serviço tem resgate (Uber), mostra o código para copiar e o CTA que abre o app
 * do parceiro — duas alternativas na mesma tela, não etapas. Os outros mostram os passos.
 */
export function ConfirmacaoServico() {
    useForceLightTheme();
    const navigate = useNavigate();
    const { servico: id } = useParams();
    const [params] = useSearchParams();
    const pedido = lerPedido(id, params);
    const forma = params.get("forma") === "cartao" ? "Cartão de crédito" : "Pix";

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (!pedido) return <Navigate to="/novos-negocios/servicos-adicionais" replace />;

    const { servico } = pedido;

    return (
        <FundoPagina>
            <Topo comEvento={false} />
            <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pt-8 pb-16 lg:pt-12">
                <section className="flex flex-col items-center gap-5 rounded-2xl bg-primary p-6 text-center shadow-xs ring-1 ring-secondary lg:p-8">
                    <FeaturedIcon icon={CheckCircle} color="success" theme="light" size="xl" />
                    <div className="flex flex-col gap-2">
                        <h1 className="text-display-xs font-bold text-primary">{servico.confirmacao.titulo}</h1>
                        <p className="text-md text-tertiary">{servico.confirmacao.descricao.replace("{valor}", brl(pedido.valor))}</p>
                    </div>

                    <dl className="flex w-full flex-col gap-2 rounded-xl bg-secondary p-4 text-left text-md">
                        <div className="flex justify-between gap-3">
                            <dt className="text-tertiary">{nomeItem(pedido)}</dt>
                            <dd className="text-secondary tabular-nums">{brl(pedido.valor)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-tertiary">Pago com {forma}</dt>
                            <dd className="font-semibold text-primary tabular-nums">{brl(totalPedido(pedido))}</dd>
                        </div>
                    </dl>

                    <ComoUsar item={pedido} forma={forma} />
                </section>

                {/* Serviços sem resgate (Meep, fotos, seguro) seguem com o "Concluir" */}
                {!servico.resgate && (
                    <Button size="lg" color="primary" className="w-full" onClick={() => navigate("/novos-negocios/servicos-adicionais")}>
                        Concluir
                    </Button>
                )}
            </main>
        </FundoPagina>
    );
}

/** Como usar um item: resgate (código + app do parceiro) ou passos numerados. */
function ComoUsar({ item, forma }: { item: ItemPedido; forma: string }) {
    const { servico, valor } = item;
    if (servico.resgate) return <Resgate servico={servico} resgate={servico.resgate} codigo={codigoResgate(valor, forma)} />;
    if (!servico.confirmacao.passos) return null;
    return <Passos passos={servico.confirmacao.passos} />;
}

/** Passo a passo numerado. */
function Passos({ passos }: { passos: string[] }) {
    return (
        <ol className="flex w-full flex-col gap-3 text-left">
            {passos.map((p, i) => (
                <li key={p} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tertiary text-xs font-semibold text-primary">{i + 1}</span>
                    <span className="text-md text-secondary">{p}</span>
                </li>
            ))}
        </ol>
    );
}

/** Código ilustrativo no formato XXXX-XXXX, estável para a mesma compra (valor + forma). */
function codigoResgate(valor: number, forma: string) {
    const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let semente = (valor * 7919 + forma.length * 104729) >>> 0;
    let codigo = "";
    for (let i = 0; i < 8; i++) {
        semente = (semente * 1103515245 + 12345) >>> 0;
        codigo += ALFABETO[(semente >>> 16) % ALFABETO.length];
    }
    return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

/**
 * Código de resgate (copiar) + CTA principal para o app do parceiro, só no celular (no desktop
 * fica só o código), e o passo a passo do resgate manual no app embaixo. Ativar pelo app
 * resgata o código: depois disso, nenhum dos dois caminhos permite uma nova ativação.
 */
function Resgate({ servico, resgate, codigo }: { servico: Servico; resgate: NonNullable<Servico["resgate"]>; codigo: string }) {
    const [copiado, setCopiado] = useState(false);
    const [ativando, setAtivando] = useState(false);
    const [ativado, setAtivado] = useState(false);

    const copiar = () => {
        navigator.clipboard?.writeText(codigo).catch(() => {});
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
    };

    // Protótipo: simula a ida ao app (resgate.link) e a volta com o crédito ativado
    const ativar = () => {
        setAtivando(true);
        window.setTimeout(() => {
            setAtivando(false);
            setAtivado(true);
        }, 1200);
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-2 text-left">
                <span className="text-sm font-medium text-secondary">Seu código de resgate</span>
                {/* Mobile: código em cima e botão embaixo; a partir de sm, lado a lado */}
                <div className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-secondary sm:flex-row sm:items-center sm:pl-4">
                    <span className={cx("flex-1 text-center text-xl font-semibold tracking-wider whitespace-nowrap text-primary tabular-nums sm:text-left", ativado && "text-quaternary line-through")}>
                        {codigo}
                    </span>
                    <Button size="md" color="secondary" className="w-full sm:w-auto" iconLeading={copiado ? CheckCircle : Copy01} isDisabled={ativado} onClick={copiar}>
                        {copiado ? "Código copiado!" : "Copiar código"}
                    </Button>
                </div>
            </div>

            {/* O CTA de ativar só existe no celular: a ativação acontece no app da Uber, e no desktop não
                há como ativar pelo navegador. No desktop fica só o código, com a orientação de onde usar */}
            {ativado ? (
                <p role="status" className="flex items-center justify-center gap-2 rounded-xl bg-success-primary p-3 text-md font-semibold text-success-primary">
                    <CheckCircle className="size-5" aria-hidden="true" />
                    Crédito ativado na {servico.parceiro}
                </p>
            ) : (
                <Button size="xl" color="primary" className="w-full lg:hidden" iconTrailing={LinkExternal01} isLoading={ativando} showTextWhileLoading onClick={ativar}>
                    {resgate.cta}
                </Button>
            )}

            {ativado ? (
                <p className="text-sm text-tertiary">O código já foi resgatado e não pode ser usado de novo.</p>
            ) : (
                // Passo a passo do resgate manual, depois do CTA. No celular é a alternativa ao botão;
                // no desktop, o único caminho
                <div className="flex flex-col gap-4 text-left">
                    {/* Divider de ponta a ponta do card (anula o padding da seção) */}
                    <span aria-hidden="true" className="-mx-6 mt-2 mb-1 border-t border-secondary lg:-mx-8" />
                    <p className="text-md font-semibold text-primary">
                        <span className="lg:hidden">{resgate.passosTitulo}</span>
                        <span className="hidden lg:inline">{resgate.passosTituloDesktop}</span>
                    </p>
                    <Passos passos={resgate.passos} />
                </div>
            )}
        </div>
    );
}
