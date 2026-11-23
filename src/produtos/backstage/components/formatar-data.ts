/*
 * Data e hora no formato do Backstage (UI-TXT-010, como MAP-33 e REL-227): "2 out 2026, 23:00", sem
 * "de", sem ponto no mês e sem separadores soltos ("•", "às"). Um formatador `Intl` só.
 */

const COM_HORA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const SEM_HORA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

const limpar = (f: Intl.DateTimeFormat, iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return f
        .formatToParts(d)
        .map((p) => (p.type === "month" ? p.value.replace(".", "") : p.type === "literal" ? p.value.replace(/ de /g, " ") : p.value))
        .join("");
};

/** "2 out 2026, 23:00" */
export const dataEHora = (iso: string) => limpar(COM_HORA, iso);

/** "2 out 2026" */
export const dataSemHora = (iso: string) => limpar(SEM_HORA, iso);
