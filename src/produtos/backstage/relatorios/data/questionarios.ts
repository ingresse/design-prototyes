import { useMemo } from "react";
import { useBanco, type Evento, type HistoricoVendas, type IngressoEmitido, type Pedido, type Pergunta, type TipoDePergunta } from "@/plataforma";
import { eventos as eventosDaOrganizacao, useEventoAtual, useEventosVersao } from "../../eventos/data/eventos";
import { useTodosOsEventos } from "../../components/escopo-dos-relatorios";
import { dataEHora } from "./event";

/* ------------------------------------------------------------------ */
/*  Respostas do questionário do evento em contexto (ou de todos os    */
/*  eventos da organização, BKS-27).                                   */
/*                                                                     */
/*  Perguntas: as do próprio evento (`Evento.perguntas`, editadas em   */
/*  Questionário). Respostas: o checkout ainda não grava respostas,    */
/*  então são geradas de forma determinística por tipo e opções, para  */
/*  ingressos coerentes com o catálogo e as vendas do evento (histórico */
/*  por lote, ~34% dos ingressos respondem, como `questionarios` do     */
/*  dataset), mais os ingressos reais emitidos no banco (portador e     */
/*  comprador reais, respostas fictícias).                              */
/* ------------------------------------------------------------------ */

export type TipoResposta = TipoDePergunta;

export const TIPO_RESPOSTA: Record<TipoDePergunta, { label: string }> = {
    "texto-curto": { label: "Texto curto" },
    "texto-longo": { label: "Texto longo" },
    "opcao-unica": { label: "Opção única" },
    multipla: { label: "Múltipla escolha" },
    numero: { label: "Número" },
    telefone: { label: "Telefone" },
    anexo: { label: "Anexo" },
};

export const ehEscolha = (tipo: TipoDePergunta) => tipo === "opcao-unica" || tipo === "multipla";
/** Respondidas com texto livre (editáveis num campo de texto). */
export const ehTextoLivre = (tipo: TipoDePergunta) => tipo === "texto-curto" || tipo === "texto-longo" || tipo === "numero" || tipo === "telefone";

/** Fração dos ingressos que responde o questionário (mesma do dataset dos relatórios). */
export const TAXA_DE_RESPOSTA = 0.34;
/** Até quantos ingressos fictícios por evento (o histórico pode ter dezenas de milhares). */
const MAXIMO_POR_EVENTO = 6000;

/* ------------------------------------------------------------------ */
/*  Estruturas                                                         */
/* ------------------------------------------------------------------ */

export interface Respondente {
    id: string;
    nome: string;
    email: string;
    /** Vazio quando a pessoa é real e o banco não tem o dado. */
    nascimento: string;
    documento: string;
    telefone: string;
    /** Pessoa do banco (comprador ou titular de um ingresso emitido). */
    real: boolean;
}

export interface OpcaoResposta {
    label: string;
    respostas: number;
}

/** Uma resposta: quem respondeu (portador do ingresso) + o valor (varia por tipo). */
export interface RespostaLinha {
    respondente: Respondente;
    data: string;
    /** opção única */
    opcao?: string;
    /** múltipla escolha */
    opcoesMultiplas?: string[];
    /** texto curto, texto longo, número e telefone */
    texto?: string;
    /** anexo */
    anexo?: { arquivo: string; tamanho: string };
}

export interface QuestionarioPergunta {
    /** Único no relatório: `<eventoId>:<perguntaId>` (no escopo "todos", perguntas de eventos diferentes não se misturam). */
    id: string;
    titulo: string;
    tipo: TipoResposta;
    eventoId: string;
    eventoNome: string;
    /** Ingressos vendidos que recebem a pergunta. */
    total: number;
    /** Quantos responderam (linhas). */
    respondidas: number;
    obrigatoria: boolean;
    /** Distribuição das opções (escolha), derivada das respostas. */
    opcoes?: OpcaoResposta[];
    respostas: RespostaLinha[];
}

/** Um ingresso que respondeu o questionário. */
export interface IngressoRespondido {
    id: string;
    eventoNome: string;
    grupo: string;
    ingresso: string;
    portador: Respondente;
    comprador: Respondente;
    ehComprador: boolean;
    data: string;
    real: boolean;
    /** Perguntas (ids do relatório) que valem para este ingresso, na ordem do formulário. */
    aplicaveis: string[];
    /** Respostas por pergunta (id do relatório); ausente = não respondeu. */
    respostas: Record<string, RespostaLinha>;
}

export interface Participante {
    respondente: Respondente;
    ingressos: IngressoRespondido[];
    /** Nº de respostas somando os ingressos. */
    respostas: number;
}

export interface RespostasDoQuestionario {
    perguntas: QuestionarioPergunta[];
    participantes: Participante[];
    /** Valor textual da resposta de um participante (todas as dele, "||"), para o filtro. */
    valor: (respondenteId: string, perguntaId: string) => string;
    /** Nenhum evento do escopo tem perguntas. */
    semPerguntas: boolean;
    todos: boolean;
    /** Muda quando o evento ou o escopo mudam (para limpar filtros). */
    chave: string;
}

/* ------------------------------------------------------------------ */
/*  Aleatório determinístico                                           */
/* ------------------------------------------------------------------ */

function makeRng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Taxa de resposta de uma pergunta opcional (60% a 90%, fixa por pergunta). */
export const taxaOpcional = (eventoId: string, perguntaId: string) => 0.6 + makeRng(hash(`${eventoId}:${perguntaId}:opcional`))() * 0.3;

/* ------------------------------------------------------------------ */
/*  Pessoas fictícias                                                  */
/* ------------------------------------------------------------------ */

const PRIMEIROS = [
    "Marina", "Rodrigo", "Camila", "Diego", "Beatriz", "Paulo", "Fernanda", "Lucas", "Ana", "Bruno",
    "Carla", "Felipe", "Juliana", "Rafael", "Patrícia", "Gustavo", "Larissa", "Thiago", "Mariana", "André",
    "Renata", "Vinícius", "Aline", "Marcelo", "Bianca", "Leonardo", "Tatiane", "Sabrina", "Eduardo", "Priscila",
    "Fábio", "Vanessa", "Ricardo", "Débora", "Márcio", "Letícia", "Gabriel", "Natália", "Henrique", "Isabela",
];
const ULTIMOS = [
    "Alves", "Nunes", "Torres", "Ferreira", "Lima", "Reis", "Martins", "Souza", "Oliveira", "Costa",
    "Rodrigues", "Almeida", "Barbosa", "Gomes", "Ribeiro", "Carvalho", "Araújo", "Cardoso", "Teixeira", "Moraes",
    "Pinto", "Cavalcanti", "Dias", "Freitas", "Monteiro", "Rocha", "Mendes", "Ramos", "Correia", "Batista",
];
const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com"];
const DDDS = [11, 11, 11, 21, 21, 31, 41, 51, 61, 71, 81, 85];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const telefone = (r: () => number) => `(${DDDS[Math.floor(r() * DDDS.length)]}) 9${pad(Math.floor(r() * 10000), 4)}-${pad(Math.floor(r() * 10000), 4)}`;
const cpf = (r: () => number) => Array.from({ length: 11 }, () => Math.floor(r() * 10)).join("");

function pessoa(id: string, r: () => number): Respondente {
    const pn = PRIMEIROS[Math.floor(r() * PRIMEIROS.length)];
    const un = ULTIMOS[Math.floor(r() * ULTIMOS.length)];
    const sufixo = r() < 0.4 ? String(Math.floor(r() * 99)) : "";
    return {
        id,
        nome: `${pn} ${un}`,
        email: `${semAcento(pn).toLowerCase()}.${semAcento(un).toLowerCase()}${sufixo}@${DOMINIOS[Math.floor(r() * DOMINIOS.length)]}`,
        nascimento: `${pad(1 + Math.floor(r() * 28))}/${pad(1 + Math.floor(r() * 12))}/${1965 + Math.floor(r() * 41)}`,
        documento: cpf(r),
        telefone: telefone(r),
        real: false,
    };
}

const pessoaReal = (nome: string, email: string): Respondente => ({ id: `real:${email.toLowerCase()}`, nome, email, nascimento: "", documento: "", telefone: "", real: true });

/* ------------------------------------------------------------------ */
/*  Respostas fictícias por tipo (texto guiado pelo título)            */
/* ------------------------------------------------------------------ */

const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

const EQUIPES = ["Assessoria Corre Junto", "Equipe Pace Livre", "Run Club Centro", "Time Força Total", "Sem equipe", "Grupo Amigos do Asfalto", "Clube Atlético Vila"];
const CIDADES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Campinas", "Santos", "Niterói", "Brasília", "Salvador", "Recife"];
const UFS = ["SP", "RJ", "MG", "PR", "RS", "SC", "DF", "BA", "PE"];
const PROFISSOES = ["Analista de sistemas", "Professora", "Engenheiro", "Autônomo", "Médica", "Advogado", "Estudante", "Designer", "Administradora"];
const SAUDE = ["Nenhuma", "Nenhuma", "Nenhuma", "Alergia a frutos do mar", "Asma controlada", "Intolerância à lactose", "Hipertensão controlada", "Alergia a dipirona"];
const CANAIS = ["Instagram", "Indicação de amigos", "Google", "Site da Ingresse", "TikTok", "Grupo de WhatsApp", "Já participei antes"];
const COMENTARIOS = [
    "Nada a declarar.",
    "Primeira vez no evento, muito animado!",
    "Gostaria de mais opções de alimentação no local.",
    "Vou com um grupo de amigos.",
    "Sem observações.",
    "Espero que a organização mantenha o padrão da última edição.",
    "Preciso de acessibilidade para cadeira de rodas.",
    "Ansioso para o dia!",
];
const CURTAS = ["Sim", "Não", "Não se aplica", "Ainda não sei", "Prefiro não informar"];
const EXTENSOES = ["pdf", "jpg", "png", "pdf"];

function textoDaResposta(p: Pergunta, portador: Respondente, r: () => number): string {
    const t = norm(p.titulo);
    const tem = (...w: string[]) => w.some((x) => t.includes(x));
    if (p.tipo === "telefone") return telefone(r);
    if (p.tipo === "numero") {
        if (tem("idade")) return String(18 + Math.floor(r() * 45));
        if (tem("peso")) return String(50 + Math.floor(r() * 60));
        if (tem("altura")) return String(150 + Math.floor(r() * 45));
        if (tem("calcado", "numeracao", "sapato", "tenis")) return String(34 + Math.floor(r() * 12));
        if (tem("tempo", "minuto")) return String(25 + Math.floor(r() * 90));
        if (tem("ano")) return String(2005 + Math.floor(r() * 20));
        if (tem("quant", "vezes", "particip", "edic")) return String(Math.floor(r() * 8));
        return String(1 + Math.floor(r() * 10));
    }
    if (tem("camis", "tamanho")) return pick(r, ["PP", "P", "M", "M", "G", "G", "GG", "XGG"]);
    if (tem("emergencia")) return `${pick(r, PRIMEIROS)} ${pick(r, ULTIMOS)}, ${telefone(r)}`;
    if (tem("equipe", "assessoria", "time", "clube")) return pick(r, EQUIPES);
    if (tem("nome")) return portador.nome;
    if (tem("instagram", "rede social", "@")) return `@${semAcento(portador.nome).toLowerCase().replace(/\s+/g, ".")}`;
    if (tem("e-mail", "email")) return portador.email;
    if (tem("cpf", "documento", "rg")) return cpf(r).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (tem("cidade", "onde mora")) return pick(r, CIDADES);
    if (tem("estado", "uf")) return pick(r, UFS);
    if (tem("empresa", "trabalh", "profiss", "cargo")) return pick(r, PROFISSOES);
    if (tem("alerg", "restri", "medica", "saude", "doenca", "condic")) return pick(r, SAUDE);
    if (tem("conheceu", "soube", "descobriu")) return pick(r, CANAIS);
    if (tem("sugest", "coment", "mensagem", "observ", "expectativ")) return pick(r, COMENTARIOS);
    return p.tipo === "texto-longo" ? pick(r, COMENTARIOS) : pick(r, CURTAS);
}

/** Pesos das opções de uma pergunta de escolha (fixos por pergunta). */
function pesosDasOpcoes(chave: string, n: number) {
    const r = makeRng(hash(`${chave}:pesos`));
    return Array.from({ length: n }, () => 0.4 + r() * 1.6);
}

interface EstadoDaPergunta {
    p: Pergunta;
    chave: string;
    pesos: number[];
    probs: number[];
    /** Chance de responder (1 se obrigatória). */
    taxa: number;
    contagem: Map<string, number>;
}

/** Opção ainda com estoque (estoque ausente = sem limite). */
const temEstoque = (e: EstadoDaPergunta, rotulo: string, estoque?: number) => estoque === undefined || (e.contagem.get(rotulo) ?? 0) < estoque;

function responder(e: EstadoDaPergunta, portador: Respondente, data: string, r: () => number): RespostaLinha | null {
    const { p } = e;
    const base: RespostaLinha = { respondente: portador, data };
    const opcoes = (p.opcoes ?? []).filter((o) => o.rotulo.trim());
    if (p.tipo === "opcao-unica") {
        const livres = opcoes.map((o, i) => ({ o, w: e.pesos[i] ?? 1 })).filter((x) => temEstoque(e, x.o.rotulo, x.o.estoque));
        if (!livres.length) return null;
        let x = r() * livres.reduce((s, l) => s + l.w, 0);
        let escolha = livres[livres.length - 1].o.rotulo;
        for (const l of livres) {
            if (x < l.w) {
                escolha = l.o.rotulo;
                break;
            }
            x -= l.w;
        }
        e.contagem.set(escolha, (e.contagem.get(escolha) ?? 0) + 1);
        return { ...base, opcao: escolha };
    }
    if (p.tipo === "multipla") {
        const livres = opcoes.map((o, i) => ({ o, prob: e.probs[i] ?? 0.4 })).filter((x) => temEstoque(e, x.o.rotulo, x.o.estoque));
        if (!livres.length) return null;
        let escolhidas = livres.filter((l) => r() < l.prob).map((l) => l.o.rotulo);
        if (!escolhidas.length) escolhidas = [livres.reduce((a, b) => (b.prob > a.prob ? b : a)).o.rotulo];
        for (const l of escolhidas) e.contagem.set(l, (e.contagem.get(l) ?? 0) + 1);
        return { ...base, opcoesMultiplas: escolhidas };
    }
    if (p.tipo === "anexo") {
        const slug = norm(p.titulo).replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((w) => w.length > 2).slice(0, 2).join("-") || "anexo";
        const primeiro = semAcento(portador.nome.split(" ")[0] ?? "").toLowerCase();
        const kb = 300 + Math.floor(r() * 2400);
        const tamanho = kb > 1024 ? `${(kb / 1024).toFixed(1).replace(".", ",")} MB` : `${kb} KB`;
        return { ...base, anexo: { arquivo: `${slug}-${primeiro}.${pick(r, EXTENSOES)}`, tamanho } };
    }
    return { ...base, texto: textoDaResposta(p, portador, r) };
}

/* ------------------------------------------------------------------ */
/*  Catálogo do evento × perguntas                                     */
/* ------------------------------------------------------------------ */

/** Ids dos tipos de ingresso que recebem alguma pergunta → perguntas (na ordem do formulário). */
function perguntasPorIngresso(perguntas: Pergunta[]) {
    const mapa = new Map<string, Pergunta[]>();
    for (const p of perguntas)
        for (const it of p.itens)
            if (it.tipo === "ingresso") {
                const lista = mapa.get(it.id) ?? [];
                lista.push(p);
                mapa.set(it.id, lista);
            }
    return mapa;
}

/**
 * Fração dos ingressos vendidos (histórico por lote) que recebe cada pergunta. Usada pelo
 * Relatório personalizado para escalar `questionarios` ao período, coerente com esta tela.
 */
export function fracoesDoQuestionario(evento: Evento, historico: HistoricoVendas | undefined) {
    const perguntas = evento.perguntas ?? [];
    const porTipo = new Map<string, number>();
    let total = 0;
    for (const s of evento.sessoes)
        for (const g of s.grupos)
            for (const t of g.ingressos)
                for (const l of t.lotes) {
                    const v = historico?.porLote[l.id] ?? 0;
                    porTipo.set(t.id, (porTipo.get(t.id) ?? 0) + v);
                    total += v;
                }
    const fracao = (ids: Set<string>) => (total ? [...ids].reduce((s, id) => s + (porTipo.get(id) ?? 0), 0) / total : ids.size ? 1 : 0);
    const comPergunta = new Set(perguntas.flatMap((p) => p.itens.filter((i) => i.tipo === "ingresso").map((i) => i.id)));
    return {
        fracaoComPergunta: fracao(comPergunta),
        perguntas: perguntas.map((p) => ({
            titulo: p.titulo,
            fracao: fracao(new Set(p.itens.filter((i) => i.tipo === "ingresso").map((i) => i.id))),
            taxa: p.obrigatoria ? 1 : taxaOpcional(evento.id, p.id),
        })),
    };
}

// Um formato de data só nos relatórios (T9): "26 nov 2026, 20:00".
const dataBr = dataEHora;

interface Gerado {
    perguntas: QuestionarioPergunta[];
    ingressos: IngressoRespondido[];
}

function gerarDoEvento(ev: Evento, historico: HistoricoVendas | undefined, emitidos: IngressoEmitido[], pedidos: Record<string, Pedido>, todos: boolean): Gerado {
    const perguntas = (ev.perguntas ?? []).filter((p) => p.titulo.trim());
    if (!perguntas.length) return { perguntas: [], ingressos: [] };
    const idDe = (p: Pergunta) => `${ev.id}:${p.id}`;
    const porIngresso = perguntasPorIngresso(perguntas);
    const estados = new Map<string, EstadoDaPergunta>(
        perguntas.map((p) => {
            const chave = idDe(p);
            const n = p.opcoes?.length ?? 0;
            const pesos = pesosDasOpcoes(chave, n);
            const rp = makeRng(hash(`${chave}:probs`));
            return [p.id, { p, chave, pesos, probs: pesos.map(() => 0.15 + rp() * 0.55), taxa: p.obrigatoria ? 1 : taxaOpcional(ev.id, p.id), contagem: new Map() }];
        }),
    );

    // Catálogo: tipos de ingresso com pergunta, pesados pelas vendas do histórico.
    const catalogo: { grupo: string; ingresso: string; tipoId: string; peso: number }[] = [];
    const vendidosPorTipo = new Map<string, number>();
    for (const s of ev.sessoes)
        for (const g of s.grupos)
            for (const t of g.ingressos) {
                const peso = t.lotes.reduce((n, l) => n + (historico?.porLote[l.id] ?? 0), 0);
                vendidosPorTipo.set(t.id, (vendidosPorTipo.get(t.id) ?? 0) + peso);
                if (porIngresso.has(t.id) && peso > 0) catalogo.push({ grupo: g.nome, ingresso: t.nome, tipoId: t.id, peso });
            }
    const pesoTotal = catalogo.reduce((s, c) => s + c.peso, 0);

    // Ingressos reais emitidos para tipos com pergunta.
    const reais = emitidos.filter((i) => i.eventoId === ev.id && i.status !== "cancelado" && porIngresso.has(i.ingressoId));
    const reaisPorTipo = new Map<string, number>();
    for (const i of reais) reaisPorTipo.set(i.ingressoId, (reaisPorTipo.get(i.ingressoId) ?? 0) + 1);

    const rotulo = (grupo: string, ingresso: string) => ({ eventoNome: ev.nome, grupo: todos ? `${grupo} (${ev.nome})` : grupo, ingresso });
    const ingressos: IngressoRespondido[] = [];
    const responderIngresso = (tipoId: string, portador: Respondente, data: string, r: () => number) => {
        const aplicaveis = porIngresso.get(tipoId) ?? [];
        const respostas: Record<string, RespostaLinha> = {};
        for (const p of aplicaveis) {
            const estado = estados.get(p.id)!;
            if (estado.taxa < 1 && r() >= estado.taxa) continue;
            const linha = responder(estado, portador, data, r);
            if (linha) respostas[idDe(p)] = linha;
        }
        return { aplicaveis: aplicaveis.map(idDe), respostas };
    };

    // Reais primeiro (portador e comprador do banco; respostas fictícias, o checkout ainda não pergunta).
    for (const i of reais) {
        const r = makeRng(hash(i.id));
        const pedido = pedidos[i.pedidoId];
        const portador = pessoaReal(i.titular.nome, i.titular.email);
        const comprador = pedido ? pessoaReal(pedido.comprador.nome, pedido.comprador.email) : portador;
        const data = dataBr(new Date(i.emitidoEm));
        ingressos.push({
            id: i.id,
            ...rotulo(i.rotulo.grupo, i.rotulo.ingresso),
            portador,
            comprador,
            ehComprador: comprador.id === portador.id,
            data,
            real: true,
            ...responderIngresso(i.ingressoId, portador, data, r),
        });
    }

    // Fictícios: ~34% dos ingressos vendidos dos tipos com pergunta, em pedidos de 1 a 3 ingressos.
    const quantidade = Math.min(MAXIMO_POR_EVENTO, Math.round(pesoTotal * TAXA_DE_RESPOSTA));
    if (quantidade > 0) {
        const r = makeRng(hash(`${ev.id}:questionario`));
        const serie = historico?.serie ?? [];
        const pesosDia = serie.map(([i]) => i);
        const somaDia = pesosDia.reduce((s, x) => s + x, 0);
        const hoje = new Date();
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - serie.length);
        const sortearDia = () => {
            if (!somaDia) return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
            let x = r() * somaDia;
            let i = 0;
            for (; i < pesosDia.length - 1; i++) {
                if (x < pesosDia[i]) break;
                x -= pesosDia[i];
            }
            return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i, 8 + Math.floor(r() * 15), Math.floor(r() * 60));
        };
        const sortearTipo = () => {
            let x = r() * pesoTotal;
            for (const c of catalogo) {
                if (x < c.peso) return c;
                x -= c.peso;
            }
            return catalogo[catalogo.length - 1];
        };
        let n = 0;
        let pessoas = 0;
        while (n < quantidade) {
            const comprador = pessoa(`${ev.id}:p${pessoas++}`, r);
            const qtd = Math.min(quantidade - n, r() < 0.55 ? 1 : r() < 0.7 ? 2 : 3);
            const data = dataBr(sortearDia());
            let anterior: Respondente | null = null;
            for (let j = 0; j < qtd; j++) {
                const c = sortearTipo();
                const portador: Respondente = j === 0 ? (r() < 0.75 ? comprador : pessoa(`${ev.id}:p${pessoas++}`, r)) : anterior && r() < 0.12 ? anterior : pessoa(`${ev.id}:p${pessoas++}`, r);
                anterior = portador;
                ingressos.push({
                    id: `${ev.id}:i${n}`,
                    ...rotulo(c.grupo, c.ingresso),
                    portador,
                    comprador,
                    ehComprador: portador.id === comprador.id,
                    data,
                    real: false,
                    ...responderIngresso(c.tipoId, portador, data, r),
                });
                n++;
            }
        }
    }

    // Agregado por pergunta.
    const resumo: QuestionarioPergunta[] = perguntas.map((p) => {
        const id = idDe(p);
        const respostas = ingressos.map((i) => i.respostas[id]).filter((l): l is RespostaLinha => !!l);
        const tipos = p.itens.filter((i) => i.tipo === "ingresso").map((i) => i.id);
        const total = tipos.reduce((s, t) => s + (vendidosPorTipo.get(t) ?? 0) + (reaisPorTipo.get(t) ?? 0), 0);
        let opcoes: OpcaoResposta[] | undefined;
        if (ehEscolha(p.tipo)) {
            const contagem = new Map<string, number>();
            for (const l of respostas) for (const o of l.opcao ? [l.opcao] : (l.opcoesMultiplas ?? [])) contagem.set(o, (contagem.get(o) ?? 0) + 1);
            opcoes = (p.opcoes ?? []).filter((o) => o.rotulo.trim()).map((o) => ({ label: o.rotulo, respostas: contagem.get(o.rotulo) ?? 0 }));
        }
        return { id, titulo: p.titulo, tipo: p.tipo, eventoId: ev.id, eventoNome: ev.nome, total, respondidas: respostas.length, obrigatoria: p.obrigatoria, opcoes, respostas };
    });

    return { perguntas: resumo, ingressos };
}

/** Texto de uma resposta (para filtro e busca). */
export function textoDaLinha(linha: RespostaLinha): string {
    if (linha.opcao) return linha.opcao;
    if (linha.opcoesMultiplas) return linha.opcoesMultiplas.join(" || ");
    if (linha.anexo) return linha.anexo.arquivo;
    return linha.texto ?? "";
}

export function montarRespostas(eventos: Evento[], historicos: Record<string, HistoricoVendas | undefined>, emitidos: IngressoEmitido[], pedidos: Record<string, Pedido>, todos: boolean): Omit<RespostasDoQuestionario, "chave"> {
    const gerados = eventos.map((ev) => gerarDoEvento(ev, historicos[ev.id], emitidos, pedidos, todos));
    const perguntas = gerados.flatMap((g) => g.perguntas);
    const ingressos = gerados.flatMap((g) => g.ingressos);

    // Participantes = portadores únicos (o mesmo e-mail real em eventos diferentes vira uma pessoa só).
    const porPessoa = new Map<string, Participante>();
    const indice = new Map<string, Map<string, string[]>>();
    for (const ing of ingressos) {
        const atual = porPessoa.get(ing.portador.id) ?? { respondente: ing.portador, ingressos: [], respostas: 0 };
        atual.ingressos.push(ing);
        for (const [pid, linha] of Object.entries(ing.respostas)) {
            atual.respostas++;
            const daPergunta = indice.get(pid) ?? new Map<string, string[]>();
            const lista = daPergunta.get(ing.portador.id) ?? [];
            lista.push(textoDaLinha(linha));
            daPergunta.set(ing.portador.id, lista);
            indice.set(pid, daPergunta);
        }
        porPessoa.set(ing.portador.id, atual);
    }
    const participantes = [...porPessoa.values()].filter((p) => p.respostas > 0);

    return {
        perguntas,
        participantes,
        valor: (respondenteId, perguntaId) => indice.get(perguntaId)?.get(respondenteId)?.join(" || ") ?? "",
        semPerguntas: perguntas.length === 0,
        todos,
    };
}

/** Respostas do questionário do evento em contexto, ou de todos os eventos da organização (BKS-27). */
export function useRespostasDoQuestionario(): RespostasDoQuestionario {
    const ctx = useEventoAtual();
    const todos = useTodosOsEventos();
    const { tabelas } = useBanco();
    const versao = useEventosVersao();
    return useMemo(() => {
        const ids = todos ? eventosDaOrganizacao.map((e) => e.id) : [ctx.id];
        const eventos = ids.map((id) => tabelas.eventos[id]).filter((e): e is Evento => !!e);
        const r = montarRespostas(eventos, tabelas.historico ?? {}, Object.values(tabelas.ingressos ?? {}), tabelas.pedidos ?? {}, todos);
        return { ...r, chave: `${todos}|${ids.join(",")}` };
    }, [ctx.id, todos, tabelas.eventos, tabelas.historico, tabelas.ingressos, tabelas.pedidos, versao]);
}
