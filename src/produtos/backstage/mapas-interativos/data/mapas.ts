
/*
 * Mapas interativos da organização (MAP). Sem mapas gravados, valem os três de exemplo que a criação
 * de evento já oferece (Arena, Teatro e Estádio), para as duas telas mostrarem a mesma coisa.
 */

export const LIMITE_DO_NOME = 120;

/** Os mapas e a gravação ficam no componente compartilhado, porque a criação de evento também usa. */
export { MAPAS_INICIAIS, useMapasDaOrganizacao as useMapas } from "../../components/mapas-da-organizacao";

/** "Atualizado em 14 out 2026, 16:20": o formato de data do Backstage (MAP-33, T9). */
export const atualizadoEm = (iso: string) => {
    const d = new Date(iso);
    const mes = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", "");
    const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
    return `Atualizado em ${String(d.getDate()).padStart(2, "0")} ${mes} ${d.getFullYear()}, ${hora}`;
};
