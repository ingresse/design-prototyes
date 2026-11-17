import { Badge } from "@/components/base/badges/badges";
import { selosDoEvento, type Evento, type Selo } from "../../components/financas/dados";

/* Selos de situação do evento. Vermelho só para saldo negativo; devolução recente é aviso. */
const COR: Record<Selo, "error" | "warning" | "gray"> = {
    "Saldo negativo": "error",
    "Devolução recente": "warning",
    "Em vendas": "gray",
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
