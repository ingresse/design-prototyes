import { ArrowLeft, SearchLg } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";

/**
 * Pedido que não existe no endereço (PED-75, PED-112): o estado vazio do DS, com a saída.
 *
 * O detalhe e os três fluxos mostram o mesmo desenho. Até 22/11/2026 cada um tinha um texto solto
 * com um botão embaixo, e o produto da organização usava o vazio do DS sem ação nenhuma.
 */
export function PedidoNaoEncontrado({ onVoltar }: { onVoltar: () => void }) {
    return (
        <div className="flex min-w-0 flex-1 items-center justify-center py-16">
            <EmptyState size="sm">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>Pedido não encontrado</EmptyState.Title>
                    <EmptyState.Description>Confira o endereço ou busque o pedido pelo nome do comprador na lista.</EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer>
                    <Button size="md" color="secondary" iconLeading={ArrowLeft} onClick={onVoltar}>
                        Voltar para pedidos
                    </Button>
                </EmptyState.Footer>
            </EmptyState>
        </div>
    );
}
