import type { FC } from "react";
import { ActivityHeart, Bus, Home02, Scales02 } from "@untitledui/icons";

export interface Cobertura {
    icone: FC<{ className?: string }>;
    titulo: string;
    casos: string[];
}

/** Situações cobertas pela proteção de compra, usadas no modal da oferta e no modal "O que a proteção cobre". */
export const COBERTURAS: Cobertura[] = [
    {
        icone: ActivityHeart,
        titulo: "Saúde",
        casos: ["Acidente, doença ou lesão", "Condição médica preexistente", "Infecção por COVID-19 e isolamento"],
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
