import { cx } from "@/utils/cx";
import type { Servico } from "../data/servicos";
import { MarcaParceiro } from "./marca-parceiro";

/** Selo do serviço: símbolo oficial colorido (Meep), logo oficial em fundo preto (Uber) ou o selo provisório. */
const CAIXA = { sm: "size-10 rounded-lg", md: "size-12 rounded-xl", lg: "size-[72px] rounded-xl" };
const LOGO = { sm: "h-3", md: "h-3.5", lg: "h-5" };
const SIMBOLO = { sm: "size-6", md: "size-8", lg: "size-11" };
const ICONE = { sm: "size-5", md: "size-6", lg: "size-8" };

export function SeloServico({ servico, tamanho = "sm", className }: { servico: Servico; tamanho?: "sm" | "md" | "lg"; className?: string }) {
    // Símbolo oficial colorido (Meep): selo claro com borda, sem inverter as cores
    if (servico.simbolo) {
        return (
            <span className={cx("flex shrink-0 items-center justify-center bg-primary ring-1 ring-secondary ring-inset", CAIXA[tamanho], className)}>
                <img src={servico.simbolo} alt="" className={SIMBOLO[tamanho]} />
            </span>
        );
    }
    if (!servico.logo && servico.iconeSelo) {
        const Icone = servico.iconeSelo;
        return (
            <span className={cx("flex shrink-0 items-center justify-center text-white", servico.corSelo ?? "bg-utility-purple-600", CAIXA[tamanho], className)}>
                <Icone className={ICONE[tamanho]} />
            </span>
        );
    }
    if (!servico.logo) return <MarcaParceiro id={servico.id} nome={servico.parceiro} tamanho={tamanho === "sm" ? "sm" : "md"} />;
    return (
        <span className={cx("flex shrink-0 items-center justify-center bg-black", CAIXA[tamanho], className)}>
            <img src={servico.logo} alt="" className={cx("w-auto invert", LOGO[tamanho])} />
        </span>
    );
}
