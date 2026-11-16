import { Badge } from "@/components/base/badges/badges";
import { selosDoEvento, type Evento, type Selo } from "../../components/financas/dados";

/* Selos de situação do evento. Vermelho só para o que tirou dinheiro; o resto fica neutro. */
const COR: Record<Selo, "error" | "gray"> = {
    "Saldo negativo": "error",
    "Ajuste recente": "error",
    "Evento em vendas": "gray",
};

export const SelosDoEvento = ({ evento }: { evento: Evento }) => (
    <>
        {selosDoEvento(evento).map((selo) => (
            <Badge key={selo} size="sm" type="pill-color" color={COR[selo]}>
                {selo}
            </Badge>
        ))}
    </>
);
