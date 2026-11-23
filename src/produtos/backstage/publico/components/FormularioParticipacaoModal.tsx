import { useEffect, useState } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Surgir } from "@/components/foundations/transicao";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Toggle } from "@/components/base/toggle/toggle";
import { useProtecaoDeDescarte } from "./protecao-de-descarte";

export type LimiteSolicitacoes = "ilimitado" | "limitado";

/** Remove tudo que não for dígito. */
const apenasDigitos = (valor: string) => valor.replace(/\D/g, "");

/** Aplica máscara de milhares (pt-BR) a uma string numérica. */
const formatarMilhar = (valor: string) => {
    const digitos = apenasDigitos(valor);
    return digitos ? Number(digitos).toLocaleString("pt-BR") : "";
};

export interface FormularioParticipacaoDados {
    ativo: boolean;
    limite: LimiteSolicitacoes;
    quantidade?: number;
}

interface FormularioParticipacaoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSalvar: (dados: FormularioParticipacaoDados) => void;
    ativoInicial: boolean;
    limiteInicial: LimiteSolicitacoes;
    quantidadeInicial?: number;
    /** Total de pedidos já recebidos: o novo limite não pode ser menor. */
    solicitacoesRecebidas: number;
    /** Nome do evento do formulário, abaixo do título. */
    evento?: string;
    /** Formulário novo: o título muda, o salvar vira "Criar formulário" e o secundário volta à escolha do evento (PUB-106). */
    onVoltar?: () => void;
}

/** Modal "Novo formulário" / "Configurar formulário": liga e desliga o recebimento e define o limite de pedidos. */
export function FormularioParticipacaoModal({
    isOpen,
    onClose,
    onSalvar,
    ativoInicial,
    limiteInicial,
    quantidadeInicial,
    solicitacoesRecebidas,
    evento,
    onVoltar,
}: FormularioParticipacaoModalProps) {
    const novo = Boolean(onVoltar);
    const quantidadeFormatada = quantidadeInicial ? formatarMilhar(String(quantidadeInicial)) : "";
    const [recebimentoAtivo, setRecebimentoAtivo] = useState(ativoInicial);
    const [limite, setLimite] = useState<LimiteSolicitacoes>(limiteInicial);
    const [limiteQuantidade, setLimiteQuantidade] = useState(quantidadeFormatada);
    const [erroLimite, setErroLimite] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setRecebimentoAtivo(ativoInicial);
            setLimite(limiteInicial);
            setLimiteQuantidade(quantidadeFormatada);
            setErroLimite(null);
        }
    }, [isOpen, ativoInicial, limiteInicial, quantidadeFormatada]);

    // Formulário novo tem o evento escolhido para perder; o existente, só o que mudou (PUB-108).
    const alterado = novo || recebimentoAtivo !== ativoInicial || limite !== limiteInicial || (limite === "limitado" && limiteQuantidade !== quantidadeFormatada);
    const protecao = useProtecaoDeDescarte({
        aberto: isOpen,
        alterado,
        onFechar: onClose,
        titulo: novo ? "Descartar o novo formulário?" : "Descartar as alterações?",
        descricao: novo ? "O formulário não será criado." : "A configuração do formulário continua como estava.",
    });

    const handleSalvar = () => {
        if (limite === "limitado") {
            const quantidade = Number(apenasDigitos(limiteQuantidade));
            if (!apenasDigitos(limiteQuantidade) || quantidade === 0) {
                setErroLimite("Informe quantos pedidos o formulário aceita.");
                return;
            }
            if (quantidade < solicitacoesRecebidas) {
                const n = solicitacoesRecebidas.toLocaleString("pt-BR");
                setErroLimite(`Use ${n} ou mais: o formulário já recebeu ${n} ${solicitacoesRecebidas === 1 ? "pedido" : "pedidos"}.`);
                return;
            }
            onSalvar({ ativo: recebimentoAtivo, limite, quantidade });
        } else {
            onSalvar({ ativo: recebimentoAtivo, limite });
        }
        onClose();
    };

    return (
        // Modal do DS; o título (slot "title") dá o nome do diálogo para leitor de tela (PUB-103).
        <>
            <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && protecao.pedirParaFechar()} isDismissable={protecao.isDismissable}>
                <Modal className="max-w-[560px]">
                    <Dialog className="flex-col items-stretch justify-start overflow-hidden rounded-2xl bg-primary shadow-xl ring-1 ring-secondary">
                        <div className="flex items-start justify-between gap-4 px-6 pt-6">
                            <div className="flex min-w-0 flex-col gap-1">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    {novo ? "Novo formulário" : "Configurar formulário"}
                                </AriaHeading>
                                {evento && <p className="text-sm text-tertiary">{evento}</p>}
                            </div>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar" onClick={protecao.pedirParaFechar} />
                        </div>

                        <div className="flex flex-col gap-6 px-6 pt-5">
                            <div className="rounded-xl px-4 py-3 ring-1 ring-secondary">
                                <Toggle
                                    isSelected={recebimentoAtivo}
                                    onChange={setRecebimentoAtivo}
                                    label="Receber pedidos"
                                    hint={recebimentoAtivo ? "O formulário aceita pedidos." : "O formulário não aceita pedidos. Os já recebidos continuam na lista."}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <RadioGroup
                                    value={limite}
                                    onChange={(value) => {
                                        setLimite(value as LimiteSolicitacoes);
                                        setErroLimite(null);
                                    }}
                                    className="gap-3"
                                >
                                    <Label>Limite de pedidos</Label>
                                    <RadioButton value="ilimitado" label="Sem limite" hint="Aceita pedidos enquanto o recebimento estiver ligado." />
                                    <RadioButton value="limitado" label="Com limite" hint="Para de aceitar pedidos ao chegar na quantidade." />
                                </RadioGroup>
                                {/* Campo fora da opção, com rótulo visível; entra com a altura animada (PUB-107). */}
                                <Surgir visivel={limite === "limitado"} gap={12}>
                                    <div className="pr-0.5 pb-1 pl-6">
                                        <Input
                                            label="Quantidade de pedidos"
                                            isRequired
                                            type="text"
                                            inputMode="numeric"
                                            size="md"
                                            placeholder="Ex.: 500"
                                            value={limiteQuantidade}
                                            onChange={(value) => {
                                                setLimiteQuantidade(formatarMilhar(value));
                                                setErroLimite(null);
                                            }}
                                            isInvalid={!!erroLimite}
                                            hint={erroLimite ?? (solicitacoesRecebidas > 0 ? `Já ${solicitacoesRecebidas === 1 ? "chegou 1 pedido" : `chegaram ${solicitacoesRecebidas.toLocaleString("pt-BR")} pedidos`}.` : undefined)}
                                        />
                                    </div>
                                </Surgir>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 pt-8 pb-6">
                            <Button size="lg" color="secondary" className="flex-1" onClick={onVoltar ?? protecao.pedirParaFechar}>
                                {novo ? "Voltar" : "Cancelar"}
                            </Button>
                            <Button size="lg" color="primary" className="flex-1" onClick={handleSalvar}>
                                {novo ? "Criar formulário" : "Salvar"}
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
            {protecao.confirmacao}
        </>
    );
}
