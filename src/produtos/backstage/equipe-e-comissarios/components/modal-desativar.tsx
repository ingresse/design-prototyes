import type { ReactNode } from "react";
import { ModalDeConfirmacao } from "../../components/modal-de-confirmacao";

interface Props {
    aberto: boolean;
    titulo: string;
    descricao: ReactNode;
    /** Texto do botão de confirmação, ex.: "Desativar grupo". */
    acao: string;
    onCancelar: () => void;
    onConfirmar: () => void;
}

/**
 * Confirmação de desativar, descartar ou deixar de ser comissário: a confirmação do Backstage
 * (`ModalDeConfirmacao`), com o fundo do DS (`bg-overlay`), título Text lg e botões à direita, como o
 * Registrar repasse (ECO-98). A ação é destrutiva pela forma. Reativar não passa por aqui: é direto pelo toggle.
 */
export function ModalDesativar({ aberto, titulo, descricao, acao, onCancelar, onConfirmar }: Props) {
    return <ModalDeConfirmacao aberto={aberto} titulo={titulo} descricao={descricao} confirmar={acao} cancelar="Cancelar" destrutiva onConfirmar={onConfirmar} onFechar={onCancelar} />;
}
