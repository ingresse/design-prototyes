import type { FC } from "react";
import type { RastreamentoDoEvento } from "@/plataforma";
import { MarcaGoogleAds, MarcaMeta, MarcaTikTok, MarcaX } from "../components/marcas";

/*
 * As quatro plataformas da tela, na ordem e com os textos de produção (PIX-01). GA4 existe no modelo,
 * mas não tem linha (como em produção).
 */

export type CampoDoPixel = keyof Omit<RastreamentoDoEvento, "ga4">;

export interface CampoDaLinha {
    chave: CampoDoPixel;
    rotulo: string;
    placeholder: string;
    /** O rótulo de conversão do Google Ads aceita espaços; os IDs, não. */
    aceitaEspacos?: boolean;
}

export interface Link {
    rotulo: string;
    href: string;
}

export interface PlataformaDePixel {
    id: "meta" | "tiktok" | "x" | "google-ads";
    nome: string;
    /** Complemento apagado depois do nome ("Antigo Twitter"). */
    complemento?: string;
    marca: FC<{ className?: string }>;
    campos: CampoDaLinha[];
    instrucoes: { titulo: string; texto: string; introducao: string; links: Link[] };
}

const PAGINAS = "Para mais detalhes, acesse as páginas oficiais:";

export const PLATAFORMAS: PlataformaDePixel[] = [
    {
        id: "meta",
        nome: "Meta Pixel",
        marca: MarcaMeta,
        campos: [{ chave: "meta", rotulo: "ID do pixel", placeholder: "Ex.: 123456789012345" }],
        instrucoes: {
            titulo: "Instruções do Pixel Meta",
            texto: "O Pixel da Meta é um trecho de código JavaScript que você adiciona ao seu site para rastrear a atividade nele e otimizar o desempenho da publicidade.",
            introducao: PAGINAS,
            links: [
                { rotulo: "Como funciona?", href: "https://www.facebook.com/business/help/742478679120153" },
                { rotulo: "Como instalar?", href: "https://www.facebook.com/business/help/952192354843755" },
            ],
        },
    },
    {
        id: "tiktok",
        nome: "TikTok Pixel",
        marca: MarcaTikTok,
        campos: [{ chave: "tiktok", rotulo: "ID do pixel", placeholder: "Ex.: C1A2B3C4D5E6F7G8H9I0" }],
        instrucoes: {
            titulo: "Instruções do Pixel TikTok",
            texto: "O Pixel do TikTok é um código que você pode inserir no seu website e que permite o compartilhamento de eventos do website com o TikTok.",
            introducao: PAGINAS,
            links: [
                { rotulo: "Como funciona?", href: "https://ads.tiktok.com/help/article/get-started-pixel" },
                { rotulo: "Como instalar?", href: "https://ads.tiktok.com/help/article/standard-mode-pixel-installation" },
            ],
        },
    },
    {
        id: "x",
        nome: "X Pixel",
        complemento: "(Antigo Twitter)",
        marca: MarcaX,
        campos: [{ chave: "x", rotulo: "ID do pixel", placeholder: "Ex.: o1a2b" }],
        instrucoes: {
            titulo: "Instruções do Pixel X",
            texto: "O rastreamento de conversões permite medir o retorno sobre o investimento em anúncios ao acompanhar as ações que as pessoas realizam após visualizar ou interagir com seus anúncios no X.",
            introducao: "Para mais detalhes, acesse a página oficial, disponível apenas em inglês:",
            links: [{ rotulo: "Veja como funciona e como instalar", href: "https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites" }],
        },
    },
    {
        id: "google-ads",
        nome: "Google Ads",
        marca: MarcaGoogleAds,
        campos: [
            { chave: "googleAdsId", rotulo: "ID de conversão", placeholder: "AW-123456789" },
            { chave: "googleAdsRotulo", rotulo: "Rótulo de conversão", placeholder: "AbCdEfGhIjKlmNoPqr", aceitaEspacos: true },
        ],
        instrucoes: {
            titulo: "Instruções do Google Ads",
            texto: "O rastreamento de conversões do Google Ads permite medir as ações que as pessoas realizam no seu site após interagir com seus anúncios. Adicione o ID de conversão junto com o respectivo rótulo de conversão.",
            introducao: PAGINAS,
            links: [
                { rotulo: "Como funciona?", href: "https://support.google.com/google-ads/answer/1722022" },
                { rotulo: "Como instalar?", href: "https://support.google.com/google-ads/answer/6331314" },
            ],
        },
    },
];

export const LIMITE_DO_ID = 120;

/** Erro do campo (PIX-20, PIX-21): vazio vale; até 120 caracteres; IDs sem espaço. */
export function erroDoCampo(valor: string, campo: CampoDaLinha): string | undefined {
    const v = valor.trim();
    if (v.length > LIMITE_DO_ID) return `Use até ${LIMITE_DO_ID} caracteres no ID.`;
    if (!campo.aceitaEspacos && /\s/.test(v)) return "Tire os espaços do ID.";
    return undefined;
}
