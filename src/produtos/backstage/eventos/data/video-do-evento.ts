import type { VideoDoEvento } from "@/plataforma";

/*
 * Vídeo opcional da página do evento (EVT-165): só o link do YouTube ou do Vimeo. Arquivo de vídeo
 * ficou de fora: o banco do protótipo guarda tudo no navegador, e um vídeo curto já passa do espaço
 * que ele tem; o link também dispensa conversão e hospedagem.
 */

const YOUTUBE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO = /^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i;

/** Lê o link colado: devolve o vídeo com a origem, ou `null` se não for do YouTube nem do Vimeo. */
export function lerVideo(texto: string): VideoDoEvento | null {
    const url = texto.trim();
    if (YOUTUBE.test(url)) return { url, origem: "youtube" };
    if (VIMEO.test(url)) return { url, origem: "vimeo" };
    return null;
}
