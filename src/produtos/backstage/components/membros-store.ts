import { useSyncExternalStore } from "react";
import {
    assinarBanco,
    lerDoc,
    salvar,
    type CargoDaOrganizacao,
    type GrupoDeMembros,
    type MembroDaOrganizacao,
    type NivelDePermissao,
    type PermissaoDoCargo,
} from "@/plataforma";
import { assinarOrganizacao, lerOrganizacoes, organizacaoAtualId, ORGANIZACAO_PADRAO, useOrganizacaoAtual, type OrganizacaoComEventos } from "../organizacoes/data/organizacao-atual";

/* ------------------------------------------------------------------ */
/*  Membros, grupos e cargos da organização em contexto (MEM).         */
/*                                                                     */
/*  Ficam no documento da organização no banco (`membros`,             */
/*  `gruposDeMembros`, `cargos`). Sem gravação, valem os de exemplo,   */
/*  feitos para cada organização: e-mails no domínio dela e grupos     */
/*  nos eventos dela. Trocar de organização troca a lista.             */
/*  Consumido por Membros, Cortesias e Equipe e comissários (operadores).*/
/* ------------------------------------------------------------------ */

export type PermissionLevel = NivelDePermissao;
export type FeaturePermission = PermissaoDoCargo;
export type Cargo = CargoDaOrganizacao;
export type Grupo = GrupoDeMembros;
export type Membro = MembroDaOrganizacao;

export interface EventoRef {
    id: string;
    nome: string;
}

/* ---- Cargos (entidades fixas) ---- */
export const CARGOS: Cargo[] = [
    { id: "administrador", nome: "Administrador", descricao: "Acesso total a membros, eventos, financeiro, relatórios e configurações da organização." },
    { id: "editor", nome: "Editor de eventos", descricao: "Pode criar e editar eventos e todo o seu conteúdo — ingressos, combos, produtos, cupons, passkeys e etiquetas — e visualizar relatórios." },
    { id: "financeiro", nome: "Financeiro", descricao: "Pode visualizar eventos, relatórios e saldos, e solicitar repasses." },
    { id: "financeiro-padrao", nome: "Financeiro (conta padrão)", descricao: "Pode visualizar eventos, relatórios e saldos, e solicitar repasses apenas para a conta padrão." },
    { id: "marketing", nome: "Marketing", descricao: "Pode gerenciar cupons, passkeys e etiquetas, e visualizar eventos e relatórios." },
    { id: "visualizador", nome: "Visualizador", descricao: "Pode visualizar eventos e seus detalhes, como ingressos, combos e cupons." },
    {
        id: "parceiro",
        nome: "Parceiro",
        descricao: "Não tem permissão geral. Os limites ficam em cada funcionalidade, como os itens e as quantidades de cortesias.",
        porFeature: true,
    },
    {
        // O cadastro de comissários saiu da organização em 12/11/2026: o grupo de Equipe e Comissários com o
        // canal Comissário é o comissário, e as pessoas dele recebem este cargo (ECO-24).
        id: "comissario",
        nome: "Comissário",
        descricao: "Aplicado às pessoas dos grupos com o canal Comissário, em Equipe e Comissários. Vendem pelo link e pelo cupom do grupo e acompanham as vendas no Freepass; o resto vem do grupo.",
        porFeature: true,
    },
];

/* ---- Funcionalidades do sistema (para construtor de cargos) ---- */
export const FEATURES: { id: string; nome: string; subitens: { id: string; nome: string }[] }[] = [
    {
        id: "eventos",
        nome: "Eventos",
        subitens: [
            { id: "info-evento", nome: "Informações do evento" },
            { id: "gestao-cotas", nome: "Gerenciamento de cotas (cortesia, bilheteria e PDV)" },
            { id: "itens", nome: "Itens" },
            { id: "ingressos", nome: "Ingressos" },
            { id: "combos", nome: "Combos" },
            { id: "produtos", nome: "Produtos" },
            { id: "abertura-vendas", nome: "Abertura de vendas" },
            { id: "estrategia-vendas", nome: "Estratégia de vendas" },
            { id: "lotes-sincronizados", nome: "Lotes sincronizados" },
            { id: "compras-grupo", nome: "Compras em grupo" },
            { id: "cortesias", nome: "Cortesias" },
            { id: "emissao-cortesias", nome: "Emissão de cortesias" },
            { id: "relatorios", nome: "Relatórios" },
            { id: "vendas", nome: "Vendas" },
            { id: "transacoes", nome: "Transações" },
            { id: "acesso", nome: "Acesso" },
            { id: "bordero", nome: "Borderô" },
            { id: "transferencias", nome: "Transferências" },
            { id: "questionarios", nome: "Questionários" },
            { id: "marketing", nome: "Marketing" },
            { id: "passkey", nome: "Passkey" },
            { id: "cupom-desconto", nome: "Cupom de desconto" },
            { id: "etiquetas", nome: "Etiquetas" },
            { id: "pixel-rastreamento", nome: "Pixel de rastreamento" },
            { id: "coleta-dados", nome: "Coleta de dados" },
            { id: "perguntas-ingresso", nome: "Perguntas por ingresso" },
        ],
    },
    {
        id: "financeiro",
        nome: "Financeiro",
        subitens: [
            { id: "saldos", nome: "Saldos" },
            { id: "repasses", nome: "Repasses" },
            { id: "operacoes", nome: "Operações" },
        ],
    },
    {
        id: "membros",
        nome: "Membros",
        subitens: [
            { id: "listar-membros", nome: "Listar membros" },
            { id: "criar-membros", nome: "Criar membros" },
            { id: "gerenciar-permissoes", nome: "Gerenciar permissões" },
        ],
    },
    {
        id: "relatorios-geral",
        nome: "Relatórios",
        subitens: [
            { id: "vendas-geral", nome: "Vendas" },
            { id: "financeiro-geral", nome: "Financeiro" },
            { id: "audience", nome: "Audience" },
        ],
    },
];

export function cargoById(id: string) {
    return CARGOS.find((c) => c.id === id) ?? estado.cargosCustom.find((c) => c.id === id);
}

/** Cargos padrão do sistema não podem ser editados nem excluídos. */
export const isCargoSistema = (id: string) => CARGOS.some((c) => c.id === id);

/* ------------------------------------------------------------------ */
/*  Exemplo por organização                                            */
/* ------------------------------------------------------------------ */

/** Domínio fictício da organização, para os e-mails de exemplo (ex.: d-edge.com.br). */
export const dominioDaOrganizacao = (orgId: string) => `${orgId.replace(/^org_/, "")}.com.br`;

/**
 * Grupos de exemplo com quem opera no evento (bilheteria, promoters, camarote). São os grupos que
 * Equipe e comissários oferece como origem de operadores (EO3-09): um cadastro só, o de Membros.
 */
const GRUPOS_DE_EXEMPLO = (dominio: string): Array<{ id: string; nome: string; emails: string[] }> => [
    { id: "m-bilheteria", nome: "Equipe de bilheteria", emails: [`ana.lima@${dominio}`, `bruno.costa@${dominio}`, `carla.mendes@${dominio}`, `diego.rocha@${dominio}`, `elisa.prado@${dominio}`, `felipe.nunes@${dominio}`] },
    { id: "m-promoters", nome: "Promoters", emails: ["gabi.promo@gmail.com", "henrique.eventos@gmail.com", "isa.noite@gmail.com", "joao.vip@gmail.com", "karen.lista@gmail.com", "leo.festas@gmail.com", "marina.rp@gmail.com", "nando.promo@gmail.com"] },
    { id: "m-camarote", nome: "Atendimento Camarote", emails: [`otavio.reis@${dominio}`, `paula.santos@${dominio}`, `rafael.dias@${dominio}`, `sofia.alves@${dominio}`] },
    { id: "m-producao", nome: "Produção", emails: ["tiago.moura@producao.com.br", "ursula.melo@producao.com.br", "vitor.lopes@producao.com.br", "wanda.ribeiro@producao.com.br", "yuri.campos@producao.com.br"] },
    { id: "m-pdv", nome: "PDV Portaria", emails: [`adriana.pdv@${dominio}`, `beto.pdv@${dominio}`, `cris.pdv@${dominio}`, `davi.pdv@${dominio}`, `edu.pdv@${dominio}`, `fabi.pdv@${dominio}`, `gui.pdv@${dominio}`] },
    { id: "m-hostess", nome: "Hostess", emails: ["helena.host@gmail.com", "iara.host@gmail.com", "julia.host@gmail.com"] },
    { id: "m-bar", nome: "Bar Central", emails: [`kleber.bar@${dominio}`, `luana.bar@${dominio}`, `mateus.bar@${dominio}`, `nina.bar@${dominio}`, `orlando.bar@${dominio}`] },
    { id: "m-seguranca", nome: "Segurança", emails: ["pedro.seg@seguranca.com.br", "quiteria.seg@seguranca.com.br", "renan.seg@seguranca.com.br", "silvia.seg@seguranca.com.br", "tadeu.seg@seguranca.com.br", "valeria.seg@seguranca.com.br", "wesley.seg@seguranca.com.br", "xavier.seg@seguranca.com.br", "yara.seg@seguranca.com.br"] },
    { id: "m-credenciamento", nome: "Credenciamento", emails: ["amanda.cred@producao.com.br", "breno.cred@producao.com.br", "caio.cred@producao.com.br", "daniela.cred@producao.com.br"] },
    { id: "m-influenciadores", nome: "Influenciadores", emails: ["bia.vibes@gmail.com", "duda.roles@gmail.com", "enzo.night@gmail.com", "fefe.agenda@gmail.com", "gui.festeiro@gmail.com", "lari.eventos@gmail.com"] },
    { id: "m-imprensa", nome: "Imprensa", emails: ["carlos.jornal@redacao.com.br", "denise.revista@redacao.com.br", "erick.portal@redacao.com.br"] },
    { id: "m-patrocinadores", nome: "Patrocinadores", emails: ["fabio.marca@parceiros.com.br", "gisele.marca@parceiros.com.br", "heitor.marca@parceiros.com.br", "ingrid.marca@parceiros.com.br", "jonas.marca@parceiros.com.br", "kelly.marca@parceiros.com.br", "lucas.marca@parceiros.com.br"] },
    { id: "m-artistas", nome: "Artistas e banda", emails: ["mano.vocal@producao.com.br", "nara.guitarra@producao.com.br", "otto.bateria@producao.com.br", "priscila.baixo@producao.com.br"] },
    { id: "m-backstage", nome: "Backstage", emails: ["rodrigo.palco@producao.com.br", "samara.palco@producao.com.br", "tulio.palco@producao.com.br", "vanessa.palco@producao.com.br", "william.palco@producao.com.br", "zeca.palco@producao.com.br"] },
    { id: "m-vip", nome: "Lista VIP", emails: ["alice.vip@gmail.com", "bernardo.vip@gmail.com", "cecilia.vip@gmail.com", "davi.vip@gmail.com", "eloisa.vip@gmail.com", "fabricio.vip@gmail.com", "giovana.vip@gmail.com", "hugo.vip@gmail.com", "isis.vip@gmail.com", "joaquim.vip@gmail.com"] },
    { id: "m-staff-extra", nome: "Staff extra", emails: ["kaio.staff@gmail.com", "lia.staff@gmail.com"] }
];

const membroId = (email: string) => `m-${email.replace(/[^a-z0-9]/gi, "-")}`;
export const GRUPO_TODOS = "g-todos";

/** Sem evento, a organização está começando: só quem a criou, no grupo padrão (MEM-40). */
function exemploDa(org: OrganizacaoComEventos) {
    const dominio = dominioDaOrganizacao(org.id);
    const admin: Membro = { id: "m-admin", email: `admin@${dominio}`, cargoIds: ["administrador"], grupoIds: [GRUPO_TODOS] };
    const todos: Grupo = { id: GRUPO_TODOS, nome: "Todos os eventos", eventoIds: [], membroIds: [admin.id], sistema: true };
    if (org.eventos.length === 0) return { membros: [admin], grupos: [todos] };
    const exemplos = GRUPOS_DE_EXEMPLO(dominio);
    const eventoIds = org.eventos.map((e) => e.id);
    return {
        membros: [
            admin,
            ...[...new Set(exemplos.flatMap((g) => g.emails))].map((email) => ({
                id: membroId(email),
                email,
                cargoIds: ["visualizador"],
                grupoIds: exemplos.filter((g) => g.emails.includes(email)).map((g) => g.id),
            })),
        ],
        grupos: [todos, ...exemplos.map((g) => ({ id: g.id, nome: g.nome, eventoIds, membroIds: g.emails.map(membroId) }))],
    };
}

/* ------------------------------------------------------------------ */
/*  Estado: espelho do banco para a organização em contexto            */
/* ------------------------------------------------------------------ */

interface Estado {
    orgId: string | null;
    eventos: EventoRef[];
    membros: Membro[];
    grupos: Grupo[];
    cargosCustom: Cargo[];
    cargos: Cargo[];
}

const VAZIO: Estado = { orgId: null, eventos: [], membros: [], grupos: [], cargosCustom: [], cargos: [...CARGOS] };
let estado: Estado = VAZIO;
let entradas: { org?: OrganizacaoComEventos; doc?: unknown; eventos?: string } = {};

/** Mesma escolha de `useOrganizacaoAtual`, fora do React. */
function orgEmContexto(): OrganizacaoComEventos | undefined {
    const todas = lerOrganizacoes();
    const id = organizacaoAtualId();
    return todas.find((o) => o.id === id) ?? todas.find((o) => o.id === ORGANIZACAO_PADRAO) ?? todas[0];
}

function recalcular() {
    const org = orgEmContexto();
    const doc = org ? lerDoc("organizacoes", org.id) : undefined;
    const chaveEventos = org ? org.eventos.map((e) => `${e.id}:${e.nome}`).join("|") : "";
    if (org?.id === entradas.org?.id && doc === entradas.doc && chaveEventos === entradas.eventos) return false;
    entradas = { org, doc, eventos: chaveEventos };
    if (!org) {
        estado = VAZIO;
        return true;
    }
    const exemplo = doc?.membros && doc.gruposDeMembros ? null : exemploDa(org);
    const idsDaOrg = new Set(org.eventos.map((e) => e.id));
    const grupos = (doc?.gruposDeMembros ?? exemplo!.grupos).map((g) =>
        // O grupo padrão cobre todo evento da organização, inclusive os criados depois (MEM-64).
        g.sistema ? { ...g, eventoIds: [...idsDaOrg] } : { ...g, eventoIds: g.eventoIds.filter((id) => idsDaOrg.has(id)) },
    );
    const cargosCustom = doc?.cargos ?? [];
    estado = {
        orgId: org.id,
        eventos: [...org.eventos].sort((a, b) => a.data.localeCompare(b.data)).map((e) => ({ id: e.id, nome: e.nome })),
        membros: doc?.membros ?? exemplo!.membros,
        grupos,
        cargosCustom,
        cargos: [...CARGOS, ...cargosCustom],
    };
    return true;
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const aoMudar = () => {
    if (recalcular()) notify();
};
let assinado = false;
const subscribe = (fn: () => void) => {
    if (!assinado) {
        assinado = true;
        assinarBanco(aoMudar);
        assinarOrganizacao(aoMudar);
        recalcular();
    }
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
};
const ler = () => {
    if (!assinado) subscribe(() => {});
    return estado;
};

/** Grava no documento da organização; o banco avisa e o espelho se refaz. */
function gravar(patch: Partial<Pick<Estado, "membros" | "grupos" | "cargosCustom">>) {
    const org = orgEmContexto();
    if (!org) return;
    const atual = ler();
    // Organização que só existe pelos eventos ganha o documento na primeira gravação (como em Ajustes).
    const { eventos: _e, ativos: _a, ...base } = org;
    const doc = lerDoc("organizacoes", org.id) ?? base;
    void salvar("organizacoes", {
        ...doc,
        membros: patch.membros ?? atual.membros,
        // O grupo padrão grava sem lista: os eventos dele são sempre os da organização.
        gruposDeMembros: (patch.grupos ?? atual.grupos).map((g) => (g.sistema ? { ...g, eventoIds: [] } : g)),
        cargos: patch.cargosCustom ?? atual.cargosCustom,
    });
}

/** Para leitores fora do React (espelhos): assinar e ler grupos e membros como estão agora. */
export const assinarMembros = subscribe;
export const lerMembros = () => {
    const { membros, grupos } = ler();
    return { membros, grupos };
};

/* ---- eventos da organização (selects, contagens) ---- */
export function useEventosDaOrganizacao(): EventoRef[] {
    return useSyncExternalStore(subscribe, () => ler().eventos);
}
export function eventoById(id: string): EventoRef | undefined {
    return ler().eventos.find((e) => e.id === id);
}
/** Eventos que o membro acessa: a soma dos eventos dos grupos dele. */
export function eventosDoMembro(m: Membro, grupos: Grupo[] = ler().grupos): number {
    const ids = new Set(grupos.filter((g) => m.grupoIds.includes(g.id)).flatMap((g) => g.eventoIds));
    return ids.size;
}
/** A organização dos membros ainda carregando (banco ou contexto). */
export function useMembrosCarregando() {
    return !useOrganizacaoAtual();
}

/* ---- quem está no Backstage ---- */
/**
 * O protótipo não tem login no Backstage: quem opera é o primeiro administrador da organização em
 * contexto (MEM-67). Emissor de cortesia, operador da bilheteria e autor de alteração vêm daqui.
 */
const membroLogadoDe = (membros: Membro[]) => membros.find((m) => m.cargoIds.includes("administrador")) ?? membros[0];
export const lerMembroLogado = (): Membro | undefined => membroLogadoDe(ler().membros);
export function useMembroLogado(): Membro | undefined {
    return useSyncExternalStore(subscribe, lerMembroLogado);
}
/** Nome de exibição a partir do e-mail ("joao.silva@…" → "Joao Silva"); membro não guarda nome. */
export const nomeDoMembro = (m: Pick<Membro, "email"> | undefined) =>
    (m?.email.split("@")[0] ?? "")
        .split(/[._-]+/)
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(" ");

/* ---- membros ---- */
export function useMembros() {
    return useSyncExternalStore(subscribe, () => ler().membros);
}
export function getMembro(id: string) {
    return ler().membros.find((m) => m.id === id);
}
export function addMembro(m: Membro) {
    const { membros, grupos } = ler();
    gravar({
        membros: [m, ...membros],
        grupos: grupos.map((g) => (m.grupoIds.includes(g.id) ? { ...g, membroIds: [...new Set([...g.membroIds, m.id])] } : g)),
    });
}
export function updateMembro(id: string, patch: Partial<Membro>) {
    gravar({ membros: ler().membros.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
}
/** Atualiza cargos/grupos de um membro e reflete a troca de grupos nos próprios grupos. */
export function editarMembro(id: string, patch: Pick<Membro, "cargoIds" | "grupoIds">) {
    const { membros, grupos } = ler();
    gravar({
        membros: membros.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        grupos: grupos.map((g) => {
            const tem = g.membroIds.includes(id);
            const deveTer = patch.grupoIds.includes(g.id);
            if (tem === deveTer) return g;
            return { ...g, membroIds: deveTer ? [...g.membroIds, id] : g.membroIds.filter((mid) => mid !== id) };
        }),
    });
}
export function removeMembros(ids: Set<string>) {
    const { membros, grupos } = ler();
    gravar({
        membros: membros.filter((m) => !ids.has(m.id)),
        grupos: grupos.map((g) => ({ ...g, membroIds: g.membroIds.filter((mid) => !ids.has(mid)) })),
    });
}

/* ---- grupos ---- */
export function useGrupos() {
    return useSyncExternalStore(subscribe, () => ler().grupos);
}
export function getGrupo(id: string) {
    return ler().grupos.find((g) => g.id === id);
}
export function addGrupo(g: Grupo) {
    const { membros, grupos } = ler();
    gravar({
        grupos: [g, ...grupos],
        membros: membros.map((m) => (g.membroIds.includes(m.id) ? { ...m, grupoIds: [...new Set([...m.grupoIds, g.id])] } : m)),
    });
}
export function updateGrupo(id: string, patch: Partial<Grupo>) {
    gravar({ grupos: ler().grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
}
/**
 * Edita nome, eventos e membros de um grupo e reflete a troca de membros nos próprios membros.
 * O grupo padrão mantém nome e eventos (cobre todos, MEM-64): só os membros mudam.
 */
export function editarGrupo(id: string, patch: Pick<Grupo, "nome" | "eventoIds" | "membroIds">) {
    const { membros, grupos } = ler();
    const atual = grupos.find((g) => g.id === id);
    if (!atual) return;
    const novo = atual.sistema ? { ...atual, membroIds: patch.membroIds } : { ...atual, ...patch };
    gravar({
        grupos: grupos.map((g) => (g.id === id ? novo : g)),
        membros: membros.map((m) => {
            const tem = m.grupoIds.includes(id);
            const deveTer = novo.membroIds.includes(m.id);
            if (tem === deveTer) return m;
            return { ...m, grupoIds: deveTer ? [...m.grupoIds, id] : m.grupoIds.filter((gid) => gid !== id) };
        }),
    });
}
/** Ação em lote: dá um cargo ou põe num grupo os membros escolhidos, sem tirar o que já têm. */
export function adicionarAosMembros(ids: Set<string>, alvo: { cargoId: string } | { grupoId: string }) {
    const { membros, grupos } = ler();
    if ("cargoId" in alvo) {
        gravar({ membros: membros.map((m) => (ids.has(m.id) && !m.cargoIds.includes(alvo.cargoId) ? { ...m, cargoIds: [...m.cargoIds, alvo.cargoId] } : m)) });
        return;
    }
    gravar({
        membros: membros.map((m) => (ids.has(m.id) && !m.grupoIds.includes(alvo.grupoId) ? { ...m, grupoIds: [...m.grupoIds, alvo.grupoId] } : m)),
        grupos: grupos.map((g) => (g.id === alvo.grupoId ? { ...g, membroIds: [...new Set([...g.membroIds, ...ids])] } : g)),
    });
}
export function removeGrupos(ids: Set<string>) {
    const { membros, grupos } = ler();
    gravar({
        grupos: grupos.filter((g) => g.sistema || !ids.has(g.id)),
        membros: membros.map((m) => ({ ...m, grupoIds: m.grupoIds.filter((gid) => !ids.has(gid)) })),
    });
}

/* ---- cargos (os padrão + os criados pela organização) ---- */
export function useCargos() {
    return useSyncExternalStore(subscribe, () => ler().cargos);
}
export function addCargo(c: Cargo) {
    gravar({ cargosCustom: [...ler().cargosCustom, c] });
}
export function updateCargo(id: string, patch: Partial<Cargo>) {
    gravar({ cargosCustom: ler().cargosCustom.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}
export function removeCargo(id: string) {
    const { cargosCustom, membros } = ler();
    gravar({
        cargosCustom: cargosCustom.filter((c) => c.id !== id),
        membros: membros.map((m) => ({ ...m, cargoIds: m.cargoIds.filter((cid) => cid !== id) })),
    });
}
