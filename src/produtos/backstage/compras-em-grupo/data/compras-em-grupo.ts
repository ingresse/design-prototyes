import { atualizarEvento, novoId, type ComprasEmGrupo, type Evento, type SolicitacaoDeGrupo } from "@/plataforma";

/*
 * Compras em grupo (CEG), as regras de produção (ACE-074, ACE-075): a produtora define o período, o
 * mínimo e o máximo de pessoas por pedido, o prazo para comprar e os ingressos; gestores pedem vagas
 * pelo link e a produtora aprova uma cota ou reprova. A cota nunca fica abaixo do que já foi usado.
 */

export const salvarCompras = (evento: Evento, comprasEmGrupo: ComprasEmGrupo) => atualizarEvento(evento.id, { comprasEmGrupo });

export const novoModulo = (): ComprasEmGrupo => ({ publicado: false, habilitado: true, prazo: { tipo: "data" }, itens: [], solicitacoes: [] });

export type EstadoDoModulo = "agendado" | "disponivel" | "encerrado" | "desativado";

/** Estado do formulário: desativado pela produtora, antes do início, dentro do período ou depois do fim. */
export function estadoDoModulo(m: ComprasEmGrupo, agora = new Date()): EstadoDoModulo {
    if (!m.habilitado) return "desativado";
    const t = agora.toISOString().slice(0, 16);
    if (m.inicio && t < m.inicio) return "agendado";
    if (m.fim && t > m.fim) return "encerrado";
    return "disponivel";
}

export const ROTULO_DO_ESTADO: Record<EstadoDoModulo, { rotulo: string; cor: "success" | "warning" | "gray" }> = {
    agendado: { rotulo: "Agendado", cor: "warning" },
    disponivel: { rotulo: "Disponível", cor: "success" },
    encerrado: { rotulo: "Encerrado", cor: "gray" },
    desativado: { rotulo: "Desativado", cor: "gray" },
};

export const TIPOS_DE_GRUPO: Record<SolicitacaoDeGrupo["tipoDeGrupo"], string> = {
    assessoria: "Assessoria esportiva",
    amigos: "Amigos e familiares",
    empresa: "Empresa",
    corrida: "Equipe de corrida",
    escola: "Grupo escolar ou faculdade",
    outros: "Outros",
};

/** Link público do formulário de pedidos. */
export const linkDoFormulario = (evento: Evento) => `${location.origin}/grupos/${evento.slug}`;

/** Prazo da cota a partir da regra do módulo: data fixa ou N dias depois da aprovação. */
export function prazoDaCota(m: ComprasEmGrupo, aprovadaEm: Date): string | undefined {
    if (m.prazo.tipo === "data") return m.prazo.data;
    if (!m.prazo.dias) return undefined;
    const d = new Date(aprovadaEm.getTime() + m.prazo.dias * 86_400_000);
    return d.toISOString().slice(0, 16);
}

export interface ErrosDoPeriodo {
    minimo?: string;
    maximo?: string;
    inicio?: string;
    fim?: string;
    prazo?: string;
}

/** Passo 1 (ACE-074): mínimo e máximo ≥ 1 e máximo ≥ mínimo; início antes do fim; prazo informado. */
export function validarPeriodo(m: ComprasEmGrupo): ErrosDoPeriodo {
    const e: ErrosDoPeriodo = {};
    if (m.minimo == null) e.minimo = "Informe o mínimo de pessoas.";
    else if (m.minimo < 1) e.minimo = "O mínimo precisa ser maior que zero.";
    if (m.maximo == null) e.maximo = "Informe o máximo de pessoas.";
    else if (m.minimo != null && m.maximo < m.minimo) e.maximo = "O máximo precisa ser maior ou igual ao mínimo.";
    if (!m.inicio) e.inicio = "Informe a data de início.";
    if (!m.fim) e.fim = "Informe a data de fim.";
    else if (m.inicio && m.fim <= m.inicio) e.fim = "O fim precisa ser depois do início.";
    if (m.prazo.tipo === "data" && !m.prazo.data) e.prazo = "Informe a data limite para as compras.";
    if (m.prazo.tipo === "dias" && !(m.prazo.dias && m.prazo.dias > 0)) e.prazo = "Informe a quantidade de dias.";
    return e;
}

/** Métricas da fila: solicitadas, aprovadas, pagas, a pagar e iniciadas. */
export function metricas(lista: SolicitacaoDeGrupo[]) {
    const aprovadasLista = lista.filter((s) => s.status === "aprovada");
    const solicitadas = lista.reduce((n, s) => n + s.solicitadas, 0);
    const aprovadas = aprovadasLista.reduce((n, s) => n + (s.aprovadas ?? 0), 0);
    const pagas = aprovadasLista.reduce((n, s) => n + s.pagas, 0);
    const iniciadas = aprovadasLista.reduce((n, s) => n + s.iniciadas, 0);
    return { solicitadas, aprovadas, pagas, aPagar: Math.max(0, aprovadas - pagas), iniciadas, pendentes: lista.filter((s) => s.status === "pendente") };
}

/** Pedidos de exemplo, só para o protótipo mostrar a fila (ferramenta de protótipo, CEG-60). */
export function solicitacoesDeExemplo(m: ComprasEmGrupo): SolicitacaoDeGrupo[] {
    const min = m.minimo ?? 10;
    const max = m.maximo ?? 200;
    const q = (f: number) => Math.max(min, Math.min(max, Math.round(min + (max - min) * f)));
    const dia = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 16);
    const base = (s: Partial<SolicitacaoDeGrupo> & Pick<SolicitacaoDeGrupo, "grupo" | "responsavel" | "tipoDeGrupo">): SolicitacaoDeGrupo => ({
        id: novoId("sol"),
        solicitadas: q(0.3),
        status: "pendente",
        pagas: 0,
        iniciadas: 0,
        solicitadaEm: dia(2),
        ...s,
    });
    return [
        base({ grupo: "Corredores da Orla", responsavel: "Renata Alves", email: "renata@exemplo.com", tipoDeGrupo: "assessoria", solicitadas: q(0.4), cnpj: "12.345.678/0001-90" }),
        base({ grupo: "Turma 3º B", responsavel: "Paulo Lima", email: "paulo@exemplo.com", tipoDeGrupo: "escola", solicitadas: q(0.2), solicitadaEm: dia(1) }),
        base({ grupo: "Amigos do Cerrado", responsavel: "Júlia Nunes", tipoDeGrupo: "amigos", solicitadas: q(0.05), solicitadaEm: dia(0) }),
        base({ grupo: "Equipe Pace Alto", responsavel: "Marcos Dias", email: "marcos@exemplo.com", tipoDeGrupo: "corrida", status: "aprovada", aprovadas: q(0.5), pagas: Math.round(q(0.5) * 0.6), iniciadas: Math.round(q(0.5) * 0.2), solicitadas: q(0.5), decididaEm: dia(3), validaAte: prazoDaCota(m, new Date(Date.now() - 3 * 86_400_000)), solicitadaEm: dia(5) }),
        base({ grupo: "Time Vendas Sul", responsavel: "Carla Souza", email: "carla@exemplo.com", tipoDeGrupo: "empresa", status: "reprovada", motivo: "Grupo fora do perfil do evento.", solicitadas: q(0.8), decididaEm: dia(4), solicitadaEm: dia(6) }),
    ];
}
