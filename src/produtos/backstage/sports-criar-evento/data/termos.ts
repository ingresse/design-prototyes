import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/*  Termos de uso da organização (v0.11, SCE-207)                      */
/*  Como no AWA: os termos são da organização (Ajustes › Termos de     */
/*  uso), em texto formatado de até 5.000 caracteres; cada um ativo ou */
/*  inativo, e um só é o padrão, que entra sozinho nos eventos novos.  */
/*  Regra de Sports: toda organização de Sports nasce com "Termos de   */
/*  Compra" cadastrado, ativo e padrão (nas outras BUs, nasce sem      */
/*  termo). O texto é o de                                            */
/*  PM-Esportes/iniciativas/experiencia-dedicada-sports/artefatos/     */
/*  2026-11-16-termo-de-uso-padrao-ts.md, sem alteração.               */
/*  No protótipo, a lista fica na sessão do navegador.                 */
/* ------------------------------------------------------------------ */

export interface TermoDeUso {
    id: string;
    /** Visto pelo atleta. */
    nome: string;
    /** Texto formatado (HTML do editor). */
    html: string;
    ativo: boolean;
    padrao: boolean;
}

export const LIMITE_DO_TERMO = 5000;

/** "Termos de Compra": o termo com que toda organização de Sports nasce (texto da Renata, 16/11/2026). */
export const TERMOS_DE_COMPRA_HTML = "<p>Ticket Sports by Ingresse é plataforma de vendas dos ingressos / inscrições on-line. Não temos responsabilidade e poder sobre organização e ocorrências relativas a este evento.</p><p>Declaro que:</p><p>1. Estarei presente neste evento por minha livre e espontânea vontade, isentando de quaisquer responsabilidades os ORGANIZADORES e as empresas envolvidas, em meu nome e de meus herdeiros;</p><p>2. Isento organizadores e empresas envolvidas no evento de qualquer responsabilidade sobre objetos deixados por mim em guarda-volumes, chapelaria ou locais indicados pela organização do evento;</p><p>3. Estou ciente que: a) o valor pago não será devolvido em caso de não participação no evento, b) a política de cancelamento e/ou substituições / troca de participantes deverá seguir o determinado pelo organizador do evento e constante do Regulamento e/ou página do evento, c) mesmo nos casos em que o organizador autorize o cancelamento, o valor da taxa de serviço (inscrição) não será restituído e a TICKET AGORA se reserva ao direito de cobrar também a taxa de cancelamento, que não se confunde com a taxa de inscrição e que tem o valor de R$ 14,90 (catorze reais e noventa centavos) ;</p><p>4. Estou de acordo com cobrança de valor adicional da TAXA DE SERVIÇO para cada novo ingresso / inscrição adquirido(a) no sistema, caso haja a respectiva taxa;</p><p>5. Estou ciente que ingressos / inscrições podem encerrar-se a qualquer momento, sob definição da empresa organizadora;</p><p>6. Confirmo que, para garantir meu ingresso / inscrição é necessário efetuar o pagamento do valor total do mesmo, e que, caso não seja pago ou pago em valor divergente (ainda que em valor maior ao devido), o ingresso/inscrição será(ão) cancelado(s) automaticamente no sistema e a vaga liberada;</p><p>7. É de minha responsabilidade obter todas as informações sobre o evento, tais como: data, local e horário;</p><p>8. Estou fisica e mentalmente apto a participar deste evento, nas condições propostas pela organização;</p><p>9. Autorizo a utilização por parte do organizador, patrocinadores e Ticket Sports de qualquer dado, fotografia, filme ou outra gravação contendo imagens de minha participação neste evento, em qualquer mídia seja impressa ou eletrônica, incluindo na Internet, para qualquer fim e por tempo indeterminado;</p><p>10. Autorizo recebimento de e-mails, SMS e WhatsApp, bem como qualquer meio digital de comunicação, do ORGANIZADOR e Ticket Sports e seus parceiros divulgando informações, notícias e serviços;</p><p>11. Na realização do cadastro, compra de ingressos ou inscrições para terceiros, tenho a autorização deste(s) participante(s), me responsabilizo pela legitimidade de dados fornecidos e garanto que o mesmo tem total ciência desta declaração e do respectivo REGULAMENTO do evento;</p><p>12. Estou ciente que, caso seja autorizado qualquer tipo de estorno, poderá ser cobrada a taxa e/ou custos do processo de reembolso, conforme o nosso termo de compra.</p><p>13. Estou totalmente ciente e concordo com o REGULAMENTO ou REGRAS GERAIS deste Evento, bem como do Termo de Uso e Política de Privacidade da plataforma Ticket Sports.</p>";

const INICIAIS: TermoDeUso[] = [
    { id: "termo-termos-de-compra", nome: "Termos de Compra", html: TERMOS_DE_COMPRA_HTML, ativo: true, padrao: true },
    {
        id: "termo-provas-noturnas",
        nome: "Termo para provas noturnas",
        html: "<p>Declaro estar ciente de que a prova acontece no período noturno e de que é obrigatório o uso de item refletivo ou luz de sinalização durante todo o percurso.</p><p>Declaro que seguirei as orientações da equipe de staff nos trechos com tráfego liberado.</p>",
        ativo: true,
        padrao: false,
    },
    {
        id: "termo-grupos-assessorias",
        nome: "Vagas de grupos e assessorias",
        html: "<p>Inscrições feitas por grupos e assessorias seguem o regulamento próprio enviado ao responsável pelo grupo.</p>",
        ativo: false,
        padrao: false,
    },
];

const CHAVE = "sports-criar-evento-termos";

const ler = (): TermoDeUso[] => {
    try {
        const bruto = sessionStorage.getItem(CHAVE);
        return bruto ? (JSON.parse(bruto) as TermoDeUso[]) : INICIAIS;
    } catch {
        return INICIAIS;
    }
};

let termos: TermoDeUso[] = typeof window === "undefined" ? INICIAIS : ler();
const ouvintes = new Set<() => void>();
const mudar = (novos: TermoDeUso[]) => {
    termos = novos;
    try {
        sessionStorage.setItem(CHAVE, JSON.stringify(novos));
    } catch {
        /* sem armazenamento: vale só nesta aba */
    }
    ouvintes.forEach((o) => o());
};

export const termoPadrao = () => termos.find((t) => t.padrao && t.ativo) ?? termos.find((t) => t.ativo) ?? null;
export const termoPorId = (id: string | null | undefined) => termos.find((t) => t.id === id) ?? null;

/** O termo do evento, se ainda está ativo na organização; senão, o padrão da organização. */
export const termoValido = (id: string | null | undefined) => {
    const t = termoPorId(id);
    return t?.ativo ? t.id : (termoPadrao()?.id ?? null);
};

let seq = 0;
/** Cadastra o termo na organização (ativo). Com `padrao`, ele passa a ser o padrão e substitui o anterior. */
export function criarTermo(nome: string, html: string, padrao: boolean): string {
    const id = `termo-${Date.now().toString(36)}${(seq++).toString(36)}`;
    mudar([...termos.map((t) => (padrao ? { ...t, padrao: false } : t)), { id, nome, html, ativo: true, padrao }]);
    return id;
}

const assinar = (o: () => void) => {
    ouvintes.add(o);
    return () => ouvintes.delete(o);
};

/** Termos da organização (todos; a tela filtra os ativos). */
export const useTermos = () => useSyncExternalStore(assinar, () => termos, () => termos);
