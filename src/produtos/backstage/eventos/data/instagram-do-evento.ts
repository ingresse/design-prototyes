/**
 * Perfil do Instagram do evento (EVT-168): aceita "@perfil", "perfil" ou o link do perfil (instagram.com/perfil) e devolve o
 * nome do perfil, sem @. `null` quando o texto não é um perfil válido (até 30 letras, números, ponto e sublinhado).
 */
export function lerInstagram(texto: string): string | null {
    let t = texto.trim();
    if (!t) return null;
    const link = t.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
    if (link) t = link[1];
    t = t.replace(/^@/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(t) && !/^\.|\.$|\.\./.test(t) ? t.toLowerCase() : null;
}
