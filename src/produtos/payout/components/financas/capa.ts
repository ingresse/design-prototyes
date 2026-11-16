/*
 * Imagem do evento para o Avatar da lista. O protótipo não tem as capas reais: cada evento ganha
 * uma capa ilustrativa, sempre a mesma para o mesmo evento. É conteúdo (como uma foto), não estilo
 * de interface: por isso as cores não vêm dos tokens do DS. Ver NOTAS.md.
 */
export function capaDoEvento(id: string): string {
    let matiz = 0;
    for (const letra of id) matiz = (matiz * 31 + letra.charCodeAt(0)) % 360;
    const cor = (giro: number, saturacao: number, luz: number) => `hsl(${(matiz + giro) % 360} ${saturacao}% ${luz}%)`;
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>` +
        `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${cor(0, 70, 45)}'/><stop offset='1' stop-color='${cor(50, 75, 28)}'/></linearGradient></defs>` +
        `<rect width='80' height='80' fill='url(#g)'/>` +
        `<circle cx='58' cy='24' r='16' fill='${cor(20, 85, 68)}' opacity='.6'/>` +
        `<path d='M0 80V56Q20 40 40 54T80 48V80Z' fill='${cor(330, 60, 16)}' opacity='.75'/>` +
        `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
