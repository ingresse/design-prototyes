import { HOJE } from "./dados";

/* Formatos do briefing (seção 5): moeda sem centavos, centavos só nos números grandes do topo;
   datas dd/mm, com dia da semana quando é data de evento ou de liberação. */

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** R$ 1.234.567 (negativo com sinal de menos tipográfico à frente). */
export function reais(valor: number): string {
    return `${valor < 0 ? "− " : ""}R$ ${inteiro.format(Math.abs(valor))}`;
}

/** Partes de um número grande do topo: "R$ 636.005" + ",00". */
export function reaisComCentavos(valor: number): { principal: string; centavos: string } {
    return { principal: reais(valor), centavos: ",00" };
}

const noMeioDia = (iso: string) => new Date(`${iso}T12:00:00`);
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** 21/11 (com o ano quando não é o ano de "hoje": 13/01/2027). */
export function dataCurta(iso: string): string {
    const d = noMeioDia(iso);
    const base = `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
    return iso.slice(0, 4) === HOJE.slice(0, 4) ? base : `${base}/${d.getFullYear()}`;
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** sáb, 21/11 */
export function dataComDia(iso: string): string {
    return `${DIAS[noMeioDia(iso).getDay()]}, ${dataCurta(iso)}`;
}

/** Data de evento sempre com o ano: sáb, 14/11/2026. */
export function dataDoEvento(iso: string): string {
    const d = noMeioDia(iso);
    return `${DIAS[d.getDay()]}, ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}
