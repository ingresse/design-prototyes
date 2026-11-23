import { useCallback, useEffect, useMemo, useState } from "react";
import { lerDoc, salvar, slugificar, type OpcaoDaOrganizacao, type OpcoesDeEventoDaOrganizacao, type Organizacao } from "@/plataforma";
import { lerOrganizacoes, useOrganizacaoAtual, type OrganizacaoComEventos } from "../../organizacoes/data/organizacao-atual";

/* ------------------------------------------------------------------ */
/*  Listas da criação de evento                                        */
/*                                                                     */
/*  Em produção vêm do back-end. Aqui, uma chamada simulada com        */
/*  atraso, para a tela tratar carregando e erro como fará de verdade. */
/*                                                                     */
/*  Times, campeonatos, programas de membros e políticas são da        */
/*  organização em contexto (EVT-132): um conjunto neutro, sem nome de */
/*  clube, mais o que os eventos dela já usam e o que ela acrescentou  */
/*  (gravado na organização, `opcoesDeEvento`).                        */
/* ------------------------------------------------------------------ */

export interface Opcao {
    id: string;
    label: string;
    supportingText?: string;
    /** Ícone do item, mostrado na lista e no campo depois de escolher (ex.: classificação indicativa). */
    icon?: import("react").FC;
}

export interface OpcoesEvento {
    campeonatos: Opcao[];
    times: Opcao[];
    programasMembros: Opcao[];
    moedas: Opcao[];
    politicas: Opcao[];
    acessoFacial: Opcao[];
    mapasDeAssentos: Opcao[];
}

/** Listas que a organização completa com as suas opções. */
export type ListaDaOrganizacao = keyof OpcoesDeEventoDaOrganizacao;

/** Padrão de toda organização, sem nome de clube nem de outra organização. */
const SIMULADO: OpcoesEvento = {
    campeonatos: [
        { id: "campeonato-estadual", label: "Campeonato estadual" },
        { id: "campeonato-nacional", label: "Campeonato nacional" },
        { id: "copa-nacional", label: "Copa nacional" },
        { id: "amistoso", label: "Amistoso" },
    ],
    // O time da casa é a própria organização (entra em `opcoesDaOrganizacao`); os adversários, ela acrescenta.
    times: [{ id: "a-definir", label: "A definir" }],
    programasMembros: [{ id: "programa-da-organizacao", label: "Programa de membros da organização" }],
    moedas: [
        { id: "BRL", label: "Real (R$)", supportingText: "BRL" },
        { id: "USD", label: "Dólar americano (US$)", supportingText: "USD" },
        { id: "EUR", label: "Euro (€)", supportingText: "EUR" },
    ],
    politicas: [
        { id: "politica-padrao", label: "Política padrão da organização" },
        { id: "politica-sem-reembolso", label: "Sem reembolso após a compra" },
        { id: "politica-meia-entrada", label: "Meia-entrada e gratuidades" },
    ],
    acessoFacial: [
        { id: "nenhum", label: "Não usar acesso por face" },
        { id: "servico-facial-a", label: "Serviço de gestão facial A (exemplo)" },
        { id: "servico-facial-b", label: "Serviço de gestão facial B (exemplo)" },
    ],
    mapasDeAssentos: [
        { id: "mapa-arena-exemplo", label: "Arena Exemplo", supportingText: "4 setores" },
        { id: "mapa-teatro-exemplo", label: "Teatro Exemplo", supportingText: "Plateia e balcão" },
        { id: "mapa-estadio-exemplo", label: "Estádio Exemplo", supportingText: "Arquibancadas e cadeiras" },
    ],
};

/**
 * Nomes das opções da lista fixa de antes (até 21/11/2026). Só dão nome a um id que um evento da
 * própria organização já gravou; nunca entram como opção numa organização que não os usou.
 */
const ROTULOS_ANTIGOS: Record<string, string> = {
    "brasileirao-2026": "Brasileirão 2026",
    "copa-do-brasil-2026": "Copa do Brasil 2026",
    "copa-do-nordeste-2026": "Copa do Nordeste 2026",
    "estadual-2026": "Campeonato Estadual 2026",
    bahia: "Bahia",
    botafogo: "Botafogo",
    fortaleza: "Fortaleza",
    gremio: "Grêmio",
    "time-exemplo-a": "Time Exemplo A",
    "time-exemplo-b": "Time Exemplo B",
    "socio-botafogo": "Sócio Botafogo",
    "socio-bahia": "Sócio Bahia",
    "programa-exemplo": "Programa de membros (exemplo)",
};

/** Id sem nome conhecido vira um rótulo legível ("time-da-casa" → "Time da casa"). */
const rotuloDoId = (id: string) => {
    const t = id.replace(/^org-/, "").replace(/[-_]+/g, " ").trim();
    return t ? t[0].toUpperCase() + t.slice(1) : id;
};

/** Id da opção que representa a própria organização como time da casa. */
const idDoTimeDaCasa = (orgId: string) => `time-${orgId.replace(/^org_/, "")}`;

/**
 * As quatro listas da organização: padrão + acrescentadas por ela + usadas nos eventos dela (nessa
 * ordem, sem repetir id). O nome de uma opção usada e não acrescentada vem da lista antiga ou do id.
 */
export function opcoesDaOrganizacao(org: OrganizacaoComEventos | undefined): Pick<OpcoesEvento, ListaDaOrganizacao> {
    const salvas = org?.opcoesDeEvento ?? {};
    const usadas: Record<ListaDaOrganizacao, string[]> = { campeonatos: [], times: [], programasMembros: [], politicas: [] };
    for (const e of org?.eventos ?? []) {
        if (e.partida) {
            usadas.times.push(e.partida.mandanteId, e.partida.visitanteId);
            if (e.partida.campeonatoId) usadas.campeonatos.push(e.partida.campeonatoId);
            if (e.partida.programaMembrosId) usadas.programasMembros.push(e.partida.programaMembrosId);
        }
        if (e.avancado?.politicaId) usadas.politicas.push(e.avancado.politicaId);
    }
    const montar = (lista: ListaDaOrganizacao, extras: Opcao[] = []): Opcao[] => {
        const vistos = new Set<string>();
        const fora: Opcao[] = [];
        const add = (o: Opcao) => {
            if (!o.id || vistos.has(o.id)) return;
            vistos.add(o.id);
            fora.push(o);
        };
        [...extras, ...SIMULADO[lista]].forEach(add);
        (salvas[lista] ?? []).forEach((o) => add({ id: o.id, label: o.nome }));
        usadas[lista].forEach((id) => add({ id, label: ROTULOS_ANTIGOS[id] ?? rotuloDoId(id) }));
        return fora;
    };
    return {
        campeonatos: montar("campeonatos"),
        times: montar("times", org ? [{ id: idDoTimeDaCasa(org.id), label: org.nome }] : []),
        programasMembros: montar("programasMembros"),
        politicas: montar("politicas"),
    };
}

/**
 * Acrescenta uma opção a uma lista da organização e devolve o id. Nome que já existe na lista
 * (sem diferenciar maiúsculas) devolve o id existente, sem gravar de novo.
 */
export async function adicionarOpcaoDaOrganizacao(orgId: string, lista: ListaDaOrganizacao, nome: string): Promise<string | null> {
    const limpo = nome.trim().replace(/\s+/g, " ");
    if (!limpo || !orgId) return null;
    const comEventos = lerOrganizacoes().find((o) => o.id === orgId);
    const existentes = opcoesDaOrganizacao(comEventos)[lista];
    const igual = existentes.find((o) => o.label.toLocaleLowerCase("pt-BR") === limpo.toLocaleLowerCase("pt-BR"));
    if (igual) return igual.id;
    const base = `org-${slugificar(limpo)}`;
    let id = base;
    for (let n = 2; existentes.some((o) => o.id === id); n++) id = `${base}-${n}`;
    // Organização que só existe pelos eventos (banco antigo) nasce no banco aqui.
    const atual: Organizacao | undefined =
        lerDoc("organizacoes", orgId) ?? (comEventos ? { id: comEventos.id, nome: comEventos.nome, sigla: comEventos.sigla, criadoEm: comEventos.criadoEm } : undefined);
    if (!atual) return null;
    const opcoes = atual.opcoesDeEvento ?? {};
    const nova: OpcaoDaOrganizacao = { id, nome: limpo };
    await salvar("organizacoes", { ...atual, opcoesDeEvento: { ...opcoes, [lista]: [...(opcoes[lista] ?? []), nova] } });
    return id;
}

/** Chamada simulada ao back-end. */
const buscarOpcoes = () => new Promise<OpcoesEvento>((resolve) => setTimeout(() => resolve(SIMULADO), 600));

let cache: OpcoesEvento | null = null;

/**
 * Listas da criação de evento para a organização em contexto. `dados` já traz as listas da
 * organização; `adicionar` grava uma opção nova nela.
 */
export function useOpcoesEvento() {
    const organizacao = useOrganizacaoAtual();
    const [estado, setEstado] = useState<{ status: "carregando" | "pronto" | "erro"; dados: OpcoesEvento | null }>(
        cache ? { status: "pronto", dados: cache } : { status: "carregando", dados: null },
    );
    const carregar = useCallback(() => {
        setEstado((e) => ({ ...e, status: "carregando" }));
        buscarOpcoes()
            .then((dados) => {
                cache = dados;
                setEstado({ status: "pronto", dados });
            })
            .catch(() => setEstado({ status: "erro", dados: null }));
    }, []);
    useEffect(() => {
        if (!cache) carregar();
    }, [carregar]);
    const dados = useMemo(() => (estado.dados ? { ...estado.dados, ...opcoesDaOrganizacao(organizacao) } : null), [estado.dados, organizacao]);
    const orgId = organizacao?.id ?? "";
    const adicionar = useCallback((lista: ListaDaOrganizacao, nome: string) => adicionarOpcaoDaOrganizacao(orgId, lista, nome), [orgId]);
    return { ...estado, dados, recarregar: carregar, adicionar };
}

/* ---------------- busca de endereço ---------------- */

export interface LocalEncontrado {
    id: string;
    nome: string;
    cidade: string;
}

/** Locais de exemplo. Em produção, a API de busca de endereço responde (EVT-65). */
const LOCAIS_SIMULADOS: LocalEncontrado[] = [
    { id: "allianz-parque", nome: "Allianz Parque", cidade: "São Paulo, SP" },
    { id: "mercado-pago-hall", nome: "Mercado Pago Hall", cidade: "São Paulo, SP" },
    { id: "parque-ibirapuera", nome: "Parque Ibirapuera", cidade: "São Paulo, SP" },
    { id: "maracana", nome: "Maracanã", cidade: "Rio de Janeiro, RJ" },
    { id: "nilton-santos", nome: "Estádio Nilton Santos", cidade: "Rio de Janeiro, RJ" },
    { id: "jockey-club-rj", nome: "Jockey Club Brasileiro", cidade: "Rio de Janeiro, RJ" },
    { id: "fonte-nova", nome: "Arena Fonte Nova", cidade: "Salvador, BA" },
    { id: "arena-gremio", nome: "Arena do Grêmio", cidade: "Porto Alegre, RS" },
    { id: "laroc-club", nome: "Laroc Club", cidade: "Valinhos, SP" },
    { id: "classic-hall", nome: "Classic Hall", cidade: "Recife, PE" },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Chamada simulada à API de busca de endereço: a partir de 2 letras, por nome do local ou cidade. */
export const buscarLocais = (q: string) =>
    new Promise<LocalEncontrado[]>((resolve) => {
        const termo = semAcento(q.trim());
        setTimeout(() => resolve(termo.length < 2 ? [] : LOCAIS_SIMULADOS.filter((l) => semAcento(`${l.nome} ${l.cidade}`).includes(termo)).slice(0, 6)), 300);
    });
