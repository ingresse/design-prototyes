import { BackstageLayout } from "../../components/Backstage";
import { ConfiguracoesDeIngressos } from "../components/configuracoes-de-ingressos";
import { useCatalogo } from "../data/catalogo";
import { AbasDeItens } from "../../components/abas-de-itens";

/**
 * Regras de compra e acesso (ITM-66): página própria, aberta pelo atalho de Ingressos e produtos (BKS-119),
 * com "Ingressos e produtos" para voltar. O formulário ocupa a largura toda da página (ITM-151; antes 732 px centralizado, ITM-147).
 */
export function Configuracoes() {
    const { carregando, evento } = useCatalogo();
    return (
        <BackstageLayout activeSection="itens" activeItem="catalogo-configuracoes">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <AbasDeItens ativa="configuracoes" />
                <div className="flex w-full flex-col">
                    {carregando || !evento ? (
                        <span role="status" aria-label="Carregando regras" className="h-96 w-full animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" />
                    ) : (
                        <ConfiguracoesDeIngressos evento={evento} />
                    )}
                </div>
            </div>
        </BackstageLayout>
    );
}
