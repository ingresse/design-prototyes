import type { FC } from "react";
import {
    Announcement01,
    BarChartSquare02,
    CalendarDate,
    ClipboardCheck,
    Home02,
    Link01,
    Key01,
    ShieldTick,
    ShoppingCart01,
    Tag01,
    Ticket01,
    Users01,
    UsersPlus,
} from "@untitledui/icons";

/*
 * Menu do evento (BKS-07) e as funcionalidades que abrem pelos atalhos de Ingressos e produtos
 * (BKS-119). Desde 22/11/2026 não há mais centrais de cartões (Regras de venda, Divulgação):
 * o que é de ingresso e produto abre por Ingressos e produtos; Divulgação é uma página com abas.
 */

export interface Funcionalidade {
    id: string;
    nome: string;
    descricao: string;
    icone: FC<{ className?: string }>;
    href: string;
}

/** Nome, frase e ícone de cada funcionalidade: um lugar só para os atalhos e as telas. */
export const FUNCIONALIDADES: Funcionalidade[] = [
    {
        id: "abertura",
        nome: "Aberturas de vendas",
        descricao: "Quando cada item começa a vender.",
        icone: CalendarDate,
        href: "/backstage/catalogo/aberturas-de-vendas",
    },
    {
        id: "regras",
        nome: "Regras de compra e acesso",
        descricao: "Limites por pessoa e forma de entrada.",
        icone: ShieldTick,
        href: "/backstage/catalogo/configuracoes",
    },
    {
        id: "lotes-sincronizados",
        nome: "Lotes sincronizados",
        descricao: "Lotes que viram juntos.",
        icone: Link01,
        href: "/backstage/vendas/lotes-sincronizados",
    },
    { id: "questionario", nome: "Questionário", descricao: "Perguntas na hora da compra.", icone: ClipboardCheck, href: "/backstage/catalogo/questionario" },
    { id: "passkey", nome: "Passkey", descricao: "Ingressos só para quem tem o código.", icone: Key01, href: "/backstage/marketing/chave-de-acesso" },
    { id: "cupons", nome: "Cupons", descricao: "Descontos por código.", icone: Ticket01, href: "/backstage/marketing/cupons" },
    { id: "etiquetas", nome: "Etiquetas", descricao: "Selos como “Últimos ingressos”.", icone: Tag01, href: "/backstage/marketing/etiquetas" },
];

/** Opção do menu do evento. */
export interface OpcaoDoMenuDoEvento {
    id: string;
    nome: string;
    icone: FC<{ className?: string }>;
    href: string;
}

/**
 * Menu do evento (BKS-07), sete opções, todas com destino direto. Desde 22/11/2026: Compras em grupo
 * entrou no lugar da central Regras de venda (o resto dela já abre pelos atalhos de Ingressos e
 * produtos), e Divulgação virou uma página com as abas Lista de espera e Pixel de rastreamento.
 * Informações do evento abre pelo "Editar informações" da Visão geral. Financeiro saiu em 21/11/2026.
 */
export const MENU_DO_EVENTO: OpcaoDoMenuDoEvento[] = [
    { id: "visao-geral", nome: "Visão geral", icone: Home02, href: "/backstage/evento/visao-geral" },
    { id: "itens", nome: "Ingressos e produtos", icone: ShoppingCart01, href: "/backstage/catalogo/ingressos" },
    { id: "compras-em-grupo", nome: "Compras em grupo", icone: Users01, href: "/backstage/vendas/compras-em-grupo" },
    { id: "equipe-e-comissarios", nome: "Equipe e comissários", icone: UsersPlus, href: "/backstage/evento/equipe" },
    { id: "cortesias", nome: "Bilheteria e cortesias", icone: Ticket01, href: "/backstage/cortesias" },
    { id: "marketing", nome: "Divulgação", icone: Announcement01, href: "/backstage/marketing/lista-de-espera" },
    // Os relatórios moram na organização (BKS-26): daqui, abrem dentro do evento, só com ele e sem voltar (BKS-90).
    { id: "relatorios", nome: "Relatórios", icone: BarChartSquare02, href: "/backstage/relatorios/vendas-por-grupo?de=evento" },
];

/** Telas que abrem pelos atalhos de Ingressos e produtos (BKS-119): marcam essa opção no menu. */
const ITENS_DOS_ATALHOS = new Set([
    "catalogo-aberturas",
    "catalogo-configuracoes",
    "catalogo-questionario",
    "lotes-sincronizados",
    "chave-de-acesso",
    "cupons",
    "etiquetas",
]);

/** Tela (seção e item que ela diz ser) → opção do menu que fica marcada. */
export function opcaoDaTela(secao?: string, item?: string): string | undefined {
    if (!secao) return undefined;
    if ((item && ITENS_DOS_ATALHOS.has(item)) || secao === "questionario") return "itens";
    if (secao === "bilheteria") return "cortesias";
    // Informações do evento abre pela Visão geral ("Editar informações"), que fica marcada.
    if (secao === "informacoes-evento") return "visao-geral";
    return secao;
}
