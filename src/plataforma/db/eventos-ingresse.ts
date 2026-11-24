import type { Evento, Grupo, HistoricoVendas, RegrasDeVenda, Sessao, TipoIngresso } from "../modelo";
import { idDaOrganizacao } from "../regras";

/* ------------------------------------------------------------------ */
/*  Eventos reais do ingresse.com (raspagem leve de 24/11/2026)        */
/*  e, no fim, eventos para as categorias que estavam vazias no site.  */
/*                                                                     */
/*  Nome, capa, local, cidade, datas e o começo da descrição vêm da    */
/*  página pública de cada evento. Ingressos, preços, lotes e o que já */
/*  foi vendido são do protótipo: cada evento mostra um jeito de data  */
/*  e uma condição de compra diferente (lista no fim do arquivo).      */
/*  Não há dado de comprador. Mudou algo aqui? Suba SEED_VERSAO.       */
/* ------------------------------------------------------------------ */

const CRIADO = "2026-11-24T12:00:00.000Z";

type Lote = [nome: string, preco: number, quantidade: number, vendidos?: number];
interface DefIngresso {
    nome: string;
    beneficio?: "inteira" | "meia-entrada";
    descricao?: string;
    lotes: Lote[];
    vendas?: RegrasDeVenda;
}
interface DefGrupo {
    nome: string;
    acesso?: string;
    ingressos: DefIngresso[];
}
interface DefEvento {
    id: string;
    nome: string;
    produtora: string;
    capa: string;
    local: string;
    cidade: string;
    categoria: string;
    tags: string[];
    artista?: string;
    descricao: string[];
    /** [início, fim] em ISO local. */
    sessoes: [string, string][];
    /** Grupos de cada sessão (índice da sessão). Sem função: os mesmos grupos em todas. */
    grupos: DefGrupo[] | ((sessao: number, inicio: string) => DefGrupo[]);
    instagram?: string;
    listaDeEsperaAoEsgotar?: boolean;
    tipo?: Evento["tipo"];
    taxaServico?: number;
}

const MEIA = "Estudantes, pessoas com deficiência, idosos e jovens de baixa renda, com documento na entrada.";
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Monta o Evento e devolve também os vendidos por lote (vão para o histórico, que o estoque soma). */
function montar(d: DefEvento): { evento: Evento; vendidos: Record<string, number> } {
    const vendidos: Record<string, number> = {};
    const sessoes: Sessao[] = d.sessoes.map(([inicio, fim], si) => {
        const sid = `${d.id}-s${si + 1}`;
        const defs = typeof d.grupos === "function" ? d.grupos(si, inicio) : d.grupos;
        const grupos: Grupo[] = defs.map((g) => {
            const gid = `${sid}-${slug(g.nome)}`;
            const ingressos: TipoIngresso[] = g.ingressos.map((t) => {
                const tid = `${gid}-${slug(t.nome)}`;
                return {
                    id: tid,
                    nome: t.nome,
                    beneficio: t.beneficio ?? "inteira",
                    descricao: t.descricao ?? (t.beneficio === "meia-entrada" ? MEIA : undefined),
                    ativo: true,
                    ...(t.vendas ? { vendas: t.vendas } : {}),
                    lotes: t.lotes.map(([nome, preco, quantidade, v], li) => {
                        const id = `${tid}-l${li + 1}`;
                        if (v) vendidos[id] = Math.min(v, quantidade);
                        return { id, nome, preco, quantidade };
                    }),
                };
            });
            const capacidade = ingressos.reduce((t, i) => t + i.lotes.reduce((s, l) => s + l.quantidade, 0), 0);
            return { id: gid, nome: g.nome, acesso: g.acesso, tipoAcesso: "qr", capacidade, ingressos };
        });
        return { id: sid, inicio, fim, grupos };
    });
    const evento: Evento = {
        id: d.id,
        slug: slug(d.nome),
        nome: d.nome,
        produtora: d.produtora,
        organizacaoId: idDaOrganizacao(d.produtora),
        status: "publicado",
        capa: d.capa,
        local: d.local,
        cidade: d.cidade,
        data: sessoes[0].inicio,
        sessoes,
        taxaServico: d.taxaServico ?? 0.1,
        // Classificação é obrigatória: 18 anos em todos (desde 24/11/2026).
        idadeMinima: 18,
        tipo: d.tipo ?? "show",
        categoria: d.categoria,
        tags: d.tags,
        vitrine: { artista: d.artista, categoria: d.categoria, tags: d.tags, descricao: d.descricao },
        ...(d.instagram ? { instagram: d.instagram } : {}),
        ...(d.listaDeEsperaAoEsgotar ? { configuracaoDaListaDeEspera: { aoEsgotar: true, convite: false, atualizadoEm: CRIADO } } : {}),
        criadoEm: CRIADO,
        atualizadoEm: CRIADO,
    };
    return { evento, vendidos };
}

/** Histórico mínimo para os vendidos entrarem no estoque (e o Backstage contar as vendas). */
function historicoDe(evento: Evento, porLote: Record<string, number>): HistoricoVendas {
    let total = 0;
    let face = 0;
    for (const s of evento.sessoes) for (const g of s.grupos) for (const t of g.ingressos) for (const l of t.lotes) {
        const q = porLote[l.id] ?? 0;
        total += q;
        face += q * l.preco;
    }
    const dias = 21;
    const serie = Array.from({ length: dias }, (_, d): [number, number, number] => {
        const q = d === dias - 1 ? total - Math.round(total / dias) * (dias - 1) : Math.round(total / dias);
        return [q, 0, Math.round((q * face) / Math.max(1, total))];
    });
    return {
        id: evento.id,
        eventoId: evento.id,
        meta: Math.round((face * 1.6) / 1000) * 1000,
        porLote,
        porCanal: { online: Math.round(total * 0.92), bilheteria: total - Math.round(total * 0.92), cortesia: 0 },
        pagamentos: [
            { tipo: "Cartão de crédito", qtd: Math.round(total * 0.4) },
            { tipo: "Pix", qtd: Math.round(total * 0.2) },
        ],
        serie,
    };
}

const K = "https://kraken.ingresse.com/event/posters";

/** Sessões de um dia por data, das `hora` às `horaFim` (fim no dia seguinte se for menor). */
const noite = (dia: string, hora: string, horaFim: string): [string, string] => {
    const d = new Date(`${dia}T12:00`);
    if (horaFim <= hora) d.setDate(d.getDate() + 1);
    return [`${dia}T${hora}`, `${d.toISOString().slice(0, 10)}T${horaFim}`];
};
const datas = (de: string, ate: string) => {
    const out: string[] = [];
    const d = new Date(`${de}T12:00`);
    const f = new Date(`${ate}T12:00`);
    while (d <= f) {
        out.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return out;
};

const DEFS: DefEvento[] = [
    // 1. Data única, sem meia-entrada, limite por pedido e mesa para grupos.
    {
        id: "ig-110645",
        nome: "Natal da Prelude 2026",
        produtora: "Prelude",
        capa: `${K}/110645/xLarge/1795091259.626628.jpg`,
        local: "Copacabana Palace, A Belmond Hotel",
        cidade: "Rio de Janeiro",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "bons-drinks"],
        descricao: [
            "Entre 1998 e 2004, a Prelude foi uma casa no Rio. A noite de sexta-feira tinha cartão de sócio e não tinha flyer: o convite chegava por telefone, por um amigo, e todo mundo sabia onde a sexta ia terminar.",
            "A Prelude volta para uma noite de Natal no Copacabana Palace.",
        ],
        sessoes: [noite("2026-12-18", "21:00", "04:00")],
        grupos: [
            { nome: "Salão", acesso: "Entrada Av. Atlântica", ingressos: [{ nome: "Individual", lotes: [["Lote único", 650, 400, 250]], vendas: { limitePorPedido: 4 } }] },
            { nome: "Mesas", acesso: "Entrada Av. Atlântica", ingressos: [{ nome: "Mesa para 4", descricao: "Mesa reservada com 4 acessos e uma garrafa.", lotes: [["Lote único", 3400, 30, 22]], vendas: { limitePorPedido: 1 } }] },
        ],
    },
    // 2. Muitas sessões: dia e noite por 9 dias (réveillon). Primeiro lote esgotado em todas, meia-entrada.
    {
        id: "ig-95977",
        nome: "Réveillon Mil Sorrisos 2027",
        produtora: "Grupo Fábrica",
        capa: `${K}/95977/xLarge/1779748078.0501845.jpg`,
        local: "Mil Sorrisos",
        cidade: "Japaratinga",
        categoria: "festivais",
        tags: ["festival", "ao-ar-livre", "sertanejo", "pagode"],
        artista: "Luan Santana, Nattan, João Gomes, Thiaguinho, Pedro Sampaio, Menos é Mais",
        descricao: [
            "De 27 a 31 de dezembro, Japaratinga volta a ser o cenário de uma das viradas de ano mais desejadas do Brasil.",
            "O Mil Sorrisos reúne música, praia, encontros e experiências em um destino paradisíaco do litoral alagoano, com cinco dias de celebração cercados pelas belezas naturais da Costa dos Corais.",
            "Atrações: Luan Santana, Nattan, João Gomes, Thiaguinho, Pedro Sampaio, Menos é Mais, Léo Foguete, Felipe Amorim e mais.",
        ],
        sessoes: [
            ...datas("2026-12-26", "2027-01-03").map((d): [string, string] => [`${d}T09:00`, `${d}T17:00`]),
            ...datas("2026-12-27", "2026-12-31").map((d): [string, string] => (d === "2026-12-31" ? noite(d, "21:00", "06:00") : noite(d, "19:00", "04:00"))),
        ].sort((a, b) => a[0].localeCompare(b[0])),
        grupos: (_si, inicio) => [
            {
                nome: inicio.slice(11) >= "18:00" ? "Noite" : "Bar da Praia",
                acesso: inicio.slice(11) >= "18:00" ? "Eventos noturnos" : "Almar",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 380, 200, 200], ["2º lote", 450, 400, 120], ["3º lote", 520, 400]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 190, 60, 60], ["2º lote", 225, 120, 30]] },
                ],
            },
            { nome: "Open Bar", acesso: "Eventos noturnos", ingressos: [{ nome: "Open bar", descricao: "Open bar premium e área coberta com vista para o mar.", lotes: [["1º lote", 980, 150, 150], ["2º lote", 1150, 150, 40]] }] },
        ],
    },
    // 3. Sessão diária por uma semana, a virada (31/12) esgotada e com lista de espera.
    {
        id: "ig-104956",
        nome: "Semana de Réveillon Tawa Beach 2027",
        produtora: "Tawa",
        capa: `${K}/104956/xLarge/1787147766.8311744.jpg`,
        local: "Tawa Beach",
        cidade: "Armação dos Búzios",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "ao-ar-livre", "por-do-sol"],
        descricao: [
            "A virada não é apenas a chegada de um novo ano. É o instante em que o tempo se renova e histórias inesquecíveis começam a ser escritas.",
            "No Réveillon TAWA, a chegada de 2027 ganha o cenário perfeito, de frente para o mar da Ferradura.",
        ],
        sessoes: datas("2026-12-26", "2027-01-03").map((d) => (d === "2026-12-31" ? noite(d, "21:00", "06:00") : noite(d, "15:00", "23:00"))),
        grupos: (si) => {
            const virada = si === 5;
            return [
                { nome: "Pista", acesso: "Rua Ana Horta", ingressos: [{ nome: "Inteira", lotes: virada ? [["Lote único", 890, 600, 600]] : [["1º lote", 220, 300, 140], ["2º lote", 280, 300]] }] },
                { nome: "Bangalô", acesso: "Rua Ana Horta", ingressos: [{ nome: "Bangalô para 6", descricao: "Espaço reservado na areia com serviço de bar.", lotes: virada ? [["Lote único", 9000, 12, 12]] : [["Lote único", 2400, 12, 5]] }] },
            ];
        },
        listaDeEsperaAoEsgotar: true,
    },
    // 4. Noite de club: lote promocional esgotado, lote atual à venda, meia-entrada.
    {
        id: "ig-110128",
        nome: "MOVING D-EDGE SP pres.: Beatric, Cesar Nardini, Ehlla, Jay Mariani",
        produtora: "D-EDGE",
        capa: `${K}/110128/xLarge/1793824758.4304566.jpg`,
        local: "D-EDGE",
        cidade: "São Paulo",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "na-pista"],
        artista: "Beatric, Cesar Nardini, Ehlla, Jay Mariani",
        descricao: ["MOVING, 26.11.2026, das 22h às 6h. Pista 1: Dogghaüz Showcase com Ehlla, Cesar Nardini, Jay Mariani e Beatric.", "Evento para maiores de 18 anos."],
        sessoes: [noite("2026-11-26", "22:00", "06:00")],
        instagram: "dedgesp",
        grupos: [
            {
                nome: "Pista",
                acesso: "Av. Mário de Andrade, 141",
                ingressos: [
                    { nome: "Inteira", lotes: [["Promocional", 40, 150, 150], ["1º lote", 70, 400, 210], ["2º lote", 90, 300]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 35, 150, 60]] },
                ],
            },
        ],
    },
    // 5. Lista gratuita com vendas encerradas antes da noite e ingresso pago.
    {
        id: "ig-110220",
        nome: "Crema Club apresenta: Apollorabbit, Jack Rosset e XAV",
        produtora: "Crema Club",
        capa: `${K}/110220/xLarge/1792941136.0118682.jpg`,
        local: "Crema Club",
        cidade: "São Paulo",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "na-pista"],
        artista: "Apollorabbit, Jack Rosset, XAV",
        descricao: ["Crema Club apresenta Apollorabbit, Jack Rosset e XAV. R. Cristóvão Gonçalves, 84, Pinheiros."],
        sessoes: [noite("2026-11-27", "21:00", "05:00")],
        grupos: [
            {
                nome: "Pista",
                acesso: "R. Cristóvão Gonçalves, 84",
                ingressos: [
                    { nome: "Lista amiga (até 23h)", descricao: "Gratuito para entrar até 23h.", lotes: [["Lista", 0, 200, 80]], vendas: { fim: "2026-11-27T18:00", limitePorPedido: 2 } },
                    { nome: "Inteira", lotes: [["1º lote", 60, 300, 90], ["2º lote", 80, 200]] },
                ],
            },
        ],
    },
    // 6. Duas noites: a primeira esgotada, a segunda à venda. Lista de espera ligada.
    {
        id: "ig-107273",
        nome: "D-EDGE RIO 3 anos",
        produtora: "D-EDGE",
        capa: `${K}/107273/xLarge/1791378846.0903084.jpg`,
        local: "D-EDGE Rio",
        cidade: "Rio de Janeiro",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "na-pista"],
        descricao: ["Três anos de D-EDGE no Rio: duas noites de pista no armazém da Rodrigues Alves."],
        instagram: "dedgeclubrio",
        sessoes: [noite("2026-11-27", "23:00", "07:00"), noite("2026-11-28", "23:00", "07:00")],
        grupos: (si) => [
            {
                nome: "Pista",
                acesso: "Av. Rodrigues Alves, 293",
                ingressos: [
                    { nome: "Inteira", lotes: si === 0 ? [["1º lote", 90, 300, 300], ["2º lote", 120, 300, 300]] : [["1º lote", 90, 300, 300], ["2º lote", 120, 300, 110]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: si === 0 ? [["Lote único", 60, 120, 120]] : [["Lote único", 60, 120, 70]] },
                ],
            },
        ],
        listaDeEsperaAoEsgotar: true,
    },
    // 7. Esgotado por completo, com lista de espera.
    {
        id: "ig-109893",
        nome: "Primavera na Cidade: This Is Lorelei + Mannequin Pussy",
        produtora: "Primavera Sound",
        capa: `${K}/109893/xLarge/1795102573.7654107.jpg`,
        local: "Cine Joia",
        cidade: "São Paulo",
        categoria: "shows",
        tags: ["indie", "show", "pop"],
        artista: "This Is Lorelei, Mannequin Pussy",
        descricao: [
            "O Primavera na Cidade leva apresentações internacionais exclusivas às casas de shows mais icônicas de São Paulo, além dos limites de Interlagos.",
            "No dia 4 de dezembro, o Cine Joia recebe This Is Lorelei e Mannequin Pussy.",
        ],
        sessoes: [noite("2026-12-04", "19:00", "23:30")],
        grupos: [
            {
                nome: "Pista",
                acesso: "Praça Carlos Gomes, 82",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 260, 700, 700]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 130, 300, 300]] },
                ],
            },
        ],
        listaDeEsperaAoEsgotar: true,
    },
    // 8. Festival de dois dias: passaporte e ingresso por dia, área vip, meia-entrada.
    {
        id: "ig-93986",
        nome: "Primavera Sound São Paulo 2026",
        produtora: "Primavera Sound",
        capa: `${K}/93986/xLarge/1795102643.323842.jpg`,
        local: "Autódromo de Interlagos",
        cidade: "São Paulo",
        categoria: "festivais",
        tags: ["festival", "indie", "eletronica", "ao-ar-livre"],
        artista: "The Strokes, Gorillaz, FKA twigs, Lily Allen",
        descricao: [
            "A edição 2026 do Primavera Sound marca o retorno do festival ao Brasil, ocupando o Autódromo de Interlagos, em São Paulo, nos dias 5 e 6 de dezembro.",
            "O evento tem a assinatura da Bonus Track, em coprodução com Primavera Sound, e é apresentado por Heineken.",
        ],
        sessoes: [["2026-12-05T12:30", "2026-12-06T01:00"], ["2026-12-06T12:30", "2026-12-07T00:00"]],
        grupos: [
            {
                nome: "Pista",
                acesso: "Portão 7",
                ingressos: [
                    { nome: "Inteira", lotes: [["2º lote", 795, 3000, 2600], ["3º lote", 895, 3000]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["2º lote", 398, 1200, 1100], ["3º lote", 448, 1200]] },
                ],
            },
            { nome: "Primavera Lounge", acesso: "Portão 1", ingressos: [{ nome: "Lounge", descricao: "Área elevada com bares exclusivos, banheiros e vista para os palcos principais.", lotes: [["Lote único", 1990, 800, 520]] }] },
        ],
    },
    // 9. Semanal: toda quinta, quatro datas, open chopp até 22h30.
    {
        id: "ig-110083",
        nome: "Encontrin das Quintas",
        produtora: "Villa Planetário",
        capa: `${K}/110083/xLarge/1792515304.6798937.jpg`,
        local: "Villa, Planetário Gávea",
        cidade: "Rio de Janeiro",
        categoria: "festas-e-baladas",
        tags: ["pagode", "samba", "role-em-grupo"],
        artista: "Di Propósito",
        descricao: [
            "O pagode que você ama em formato intimista de roda, reunindo os amigos com a energia lá em cima todas as quintas, às 21h.",
            "Open chopp até 22h30. Entrada proibida para menores de 18 anos.",
        ],
        sessoes: ["2026-11-26", "2026-12-03", "2026-12-10", "2026-12-17"].map((d) => noite(d, "21:00", "02:00")),
        grupos: [
            {
                nome: "Pista",
                acesso: "Rua Vice-Gov. Rubens Berardo, 100",
                ingressos: [
                    { nome: "Inteira com open chopp", lotes: [["1º lote", 70, 250, 120], ["2º lote", 90, 200]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 35, 80, 20]] },
                ],
            },
        ],
    },
    // 10. Semanal com vendas que ainda não abriram para as datas de dezembro.
    {
        id: "ig-110086",
        nome: "Gávea Samba Clube",
        produtora: "Villa Planetário",
        capa: `${K}/110086/xLarge/1792519674.9726045.jpg`,
        local: "Villa, Planetário Gávea",
        cidade: "Rio de Janeiro",
        categoria: "festas-e-baladas",
        tags: ["samba", "pagode"],
        descricao: ["Vem fazer parte do nosso clube! Sexta, das 22h às 5h, com a roda do Gávea Samba Clube."],
        sessoes: ["2026-11-27", "2026-12-04", "2026-12-11", "2026-12-18"].map((d) => noite(d, "22:00", "05:00")),
        grupos: (si) => [
            {
                nome: "Pista",
                acesso: "Rua Vice-Gov. Rubens Berardo, 100",
                ingressos: [
                    {
                        nome: "Inteira",
                        lotes: [["1º lote", 60, 300, si === 0 ? 180 : 0], ["2º lote", 80, 200]],
                        // As datas de dezembro abrem vendas aos poucos (venda não aberta no site).
                        ...(si >= 2 ? { vendas: { inicio: si === 2 ? "2026-12-01T12:00" : "2026-12-08T12:00" } } : {}),
                    },
                ],
            },
        ],
    },
    // 11. Data única à tarde, camarote open bar e pista com virada de lote.
    {
        id: "ig-105225",
        nome: "Rio de Alegria com Saulo Fernandes",
        produtora: "Ilha Itanhangá",
        capa: `${K}/105225/xLarge/1787760766.1304305.jpg`,
        local: "Ilha Itanhangá",
        cidade: "Rio de Janeiro",
        categoria: "shows",
        tags: ["axe", "show", "ao-ar-livre"],
        artista: "Saulo Fernandes",
        descricao: ["Quando a música toca a alma, a alegria vira encontro. No dia 28 de novembro, Saulo Fernandes traz toda a sua energia e a força de suas canções para um dia especial no Rio."],
        sessoes: [["2026-11-28T15:00", "2026-11-28T23:00"]],
        grupos: [
            {
                nome: "Pista",
                acesso: "Estrada da Barra da Tijuca, 793",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 160, 800, 800], ["2º lote", 190, 800, 340], ["3º lote", 220, 800]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 80, 300, 300], ["2º lote", 95, 300, 90]] },
                ],
            },
            { nome: "Camarote Open Bar", acesso: "Entrada VIP", ingressos: [{ nome: "Open bar", descricao: "Open bar, open food e vista para o palco.", lotes: [["1º lote", 480, 300, 210]] }] },
        ],
    },
    // 12. Futebol: setores do estádio, meia-entrada e visitante.
    {
        id: "ig-110576",
        nome: "Fortaleza x Criciúma",
        produtora: "Fortaleza Esporte Clube",
        capa: `${K}/110576/xLarge/1795092483.1654377.jpg`,
        local: "Arena Castelão",
        cidade: "Fortaleza",
        categoria: "futebol",
        tags: ["futebol"],
        descricao: ["Fortaleza e Criciúma se enfrentam na Arena Castelão."],
        sessoes: [["2026-11-28T20:00", "2026-11-28T22:00"]],
        grupos: [
            {
                nome: "Arquibancada Norte",
                acesso: "Portão Norte",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 60, 8000, 5200]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 30, 3000, 2100]] },
                ],
            },
            {
                nome: "Cadeira Central",
                acesso: "Portão Oeste",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 120, 3000, 1400]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 60, 1000, 600]] },
                ],
            },
            { nome: "Visitante", acesso: "Portão Sul", ingressos: [{ nome: "Inteira", lotes: [["Lote único", 80, 1500, 300]], vendas: { limitePorPedido: 4 } }] },
        ],
        tipo: "futebol",
    },
    // 13. Vendas ainda não abertas (abrem em 01/12).
    {
        id: "ig-109777",
        nome: "Sorriso Eu Gosto no Pagode: Recife",
        produtora: "Sorriso Maroto",
        capa: `${K}/109777/xLarge/1791393840.1137729.jpg`,
        local: "Área Externa do Centro de Convenções",
        cidade: "Recife",
        categoria: "shows",
        tags: ["pagode", "samba", "show"],
        artista: "Sorriso Maroto",
        descricao: [
            "A roda de samba do Sorriso Maroto vai rodar o Brasil. Na roda, o Sorriso canta Exaltasamba, Soweto, Só Pra Contrariar, Raça Negra, Fundo de Quintal, convidados surpresa e claro, Sorriso Maroto.",
            "Palco 360º.",
        ],
        sessoes: [["2026-12-12T15:00", "2026-12-12T23:00"]],
        grupos: [
            {
                nome: "Pista",
                acesso: "Av. dos Reitores, s/n",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 140, 2000], ["2º lote", 170, 2000]], vendas: { inicio: "2026-12-01T10:00" } },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 70, 800]], vendas: { inicio: "2026-12-01T10:00" } },
                ],
            },
            { nome: "Área VIP", acesso: "Av. dos Reitores, s/n", ingressos: [{ nome: "VIP", lotes: [["1º lote", 320, 500]], vendas: { inicio: "2026-12-01T10:00" } }] },
        ],
        instagram: "sorrisomaroto",
    },
    // 14. Show com um setor esgotado e outro à venda.
    {
        id: "ig-109672",
        nome: "Fresno: 10 anos de A Sinfonia de Tudo Que Há com Nova Orquestra",
        produtora: "Fundição Progresso",
        capa: `${K}/109672/xLarge/1791221515.989479.jpg`,
        local: "Fundição Progresso",
        cidade: "Rio de Janeiro",
        categoria: "shows",
        tags: ["rock", "show"],
        artista: "Fresno, Nova Orquestra",
        descricao: [
            "A Fresno volta ao Rio de Janeiro no dia 28 de novembro para um show sinfônico com a Nova Orquestra na Fundição Progresso.",
            "O repertório passa por diferentes fases da carreira e celebra o disco A Sinfonia de Tudo Que Há, que completa 10 anos em 2026.",
        ],
        sessoes: [noite("2026-11-28", "21:00", "00:30")],
        grupos: [
            {
                nome: "Pista",
                acesso: "Rua dos Arcos, 24",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 180, 1200, 1200], ["2º lote", 220, 800, 800]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 90, 600, 600]] },
                ],
            },
            {
                nome: "Mezanino",
                acesso: "Rua dos Arcos, 24",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 280, 400, 260]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 140, 120, 70]] },
                ],
            },
        ],
    },
    // 15. Festa full open bar, só inteira (sem meia), ingresso nominal e limite de 2 por pedido.
    {
        id: "ig-110130",
        nome: "Balbúrdia: Ready to Duck Off?",
        produtora: "Balbúrdia",
        capa: `${K}/110130/xLarge/1792608551.852635.jpg`,
        local: "Espaço Balbúrdia",
        cidade: "São Paulo",
        categoria: "festas-e-baladas",
        tags: ["funk", "open-bar", "na-pista"],
        descricao: [
            "De volta a São Paulo, o pato mais cool do Rio te espera para mais uma noite de muita Balbúrdia. Full open bar e open Duckz shot bar.",
            "Ingressos pessoais e nominais. Classificação 18 anos.",
        ],
        sessoes: [noite("2026-11-28", "22:00", "06:00")],
        grupos: [{ nome: "Pista Open Bar", acesso: "Entrada principal", ingressos: [{ nome: "Full open bar", lotes: [["2º lote", 220, 600, 470], ["3º lote", 260, 600]], vendas: { limitePorPedido: 2 } }] }],
    },
    // 16. Turnê: três setores com preços diferentes.
    {
        id: "ig-99255",
        nome: "Turnê Dominguinho: Belo Horizonte",
        produtora: "Banco do Brasil",
        capa: `${K}/99255/xLarge/1781565319.5635138.jpg`,
        local: "Mineirinho",
        cidade: "Belo Horizonte",
        categoria: "shows",
        tags: ["mpb", "forro", "show"],
        artista: "João Gomes, Jota.pê, Mestrinho",
        descricao: ["A Turnê Dominguinho, de João Gomes, Jota.pê e Mestrinho, chega a Belo Horizonte no Mineirinho."],
        sessoes: [["2026-12-05T19:00", "2026-12-05T23:30"]],
        grupos: [
            {
                nome: "Pista Premium",
                acesso: "Portão A",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 280, 1500, 1500], ["2º lote", 320, 1500, 600]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 140, 500, 500], ["2º lote", 160, 500, 120]] },
                ],
            },
            {
                nome: "Pista",
                acesso: "Portão B",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 180, 3000, 2100]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 90, 1000, 700]] },
                ],
            },
            { nome: "Cadeira Superior", acesso: "Portão C", ingressos: [{ nome: "Inteira", lotes: [["Lote único", 220, 2000, 800]] }] },
        ],
    },
    // 17. Festival de um dia em estádio.
    {
        id: "ig-103810",
        nome: "Festival Repique: Ribeirão Preto 2026",
        produtora: "Festival Repique",
        capa: `${K}/103810/xLarge/1785169899.6537557.jpg`,
        local: "Estádio Francisco de Palma Travassos",
        cidade: "Ribeirão Preto",
        categoria: "festivais",
        tags: ["samba", "pagode", "festival"],
        descricao: ["O Festival Repique reúne os maiores nomes do samba e do pagode em um dia inteiro de roda em Ribeirão Preto."],
        sessoes: [["2026-12-05T14:00", "2026-12-06T02:00"]],
        grupos: [
            {
                nome: "Pista",
                acesso: "Portão 1",
                ingressos: [
                    { nome: "Inteira", lotes: [["1º lote", 150, 4000, 4000], ["2º lote", 180, 4000, 1600]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["1º lote", 75, 1500, 1500], ["2º lote", 90, 1500, 300]] },
                ],
            },
            { nome: "Camarote Repique", acesso: "Portão 3", ingressos: [{ nome: "Open bar", lotes: [["1º lote", 420, 800, 380]] }] },
        ],
    },
    // 18. Semana de réveillon com passaporte para as 5 noites e noite avulsa.
    {
        id: "ig-103695",
        nome: "Semana de Réveillon Privilège Búzios 2027",
        produtora: "Privilège",
        capa: `${K}/103695/xLarge/1783979980.214305.jpg`,
        local: "Privilège Búzios",
        cidade: "Armação dos Búzios",
        categoria: "festas-e-baladas",
        tags: ["eletronica", "na-pista"],
        descricao: ["Cinco noites de réveillon na Privilège, em Búzios, com a virada mais disputada da Rua das Pedras."],
        sessoes: datas("2026-12-27", "2026-12-31").map((d) => noite(d, "23:00", "06:00")),
        grupos: (si) => [
            {
                nome: "Pista",
                acesso: "Rua das Pedras",
                ingressos: [
                    { nome: "Inteira", lotes: si === 4 ? [["Virada", 650, 1500, 900]] : [["1º lote", 180, 800, 400], ["2º lote", 220, 800]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: si === 4 ? [["Virada", 325, 400, 200]] : [["1º lote", 90, 300, 100]] },
                ],
            },
            { nome: "Camarote", acesso: "Rua das Pedras", ingressos: [{ nome: "Camarote open bar", lotes: si === 4 ? [["Virada", 1800, 200, 200]] : [["1º lote", 600, 200, 60]] }] },
        ],
        listaDeEsperaAoEsgotar: true,
    },

    /* ---------- Categorias que estavam vazias no site (desde 24/11/2026) ----------
       Reais do ingresse.com quando havia (Arena Kids, corrida social, mototour, réveillon no MAM); os demais são fictícios do
       protótipo, com a arte gerada do site como capa (/novo-site/cymatics). */
    // Kids e Família (reais): área kids nos jogos, com ingresso de criança e de acompanhante.
    {
        id: "ig-110564",
        nome: "Botafogo x Bahia: Star Arena Kids",
        produtora: "Star Hospitality",
        capa: `${K}/110564/xLarge/1794718173.3820722.jpg`,
        local: "Estádio Nilton Santos",
        cidade: "Rio de Janeiro",
        categoria: "kids-e-familia",
        tags: ["kids", "pra-familia", "futebol"],
        descricao: ["Espaço kids no Nilton Santos para assistir a Botafogo x Bahia em família: recreação, monitores e lanche para as crianças."],
        sessoes: [["2026-11-28T19:00", "2026-11-28T23:30"]],
        grupos: [
            {
                nome: "Arena Kids",
                acesso: "Portão Leste",
                ingressos: [
                    { nome: "Criança (3 a 12 anos)", descricao: "Com recreação e lanche.", lotes: [["Lote único", 120, 150, 60]], vendas: { limitePorPedido: 4 } },
                    { nome: "Acompanhante adulto", lotes: [["Lote único", 180, 150, 70]], vendas: { limitePorPedido: 2 } },
                ],
            },
        ],
    },
    {
        id: "ig-110569",
        nome: "Esquadrão Arena Kids: Bahia x Atlético-MG",
        produtora: "Esporte Clube Bahia",
        capa: `${K}/110569/xLarge/1794774723.6446073.jpg`,
        local: "Arena Fonte Nova",
        cidade: "Salvador",
        categoria: "kids-e-familia",
        tags: ["kids", "pra-familia", "futebol"],
        descricao: ["A área kids do Esquadrão na Fonte Nova: monitores, brincadeiras e visão do campo para a criançada torcer com segurança."],
        sessoes: [["2026-12-02T20:30", "2026-12-03T00:00"]],
        grupos: [
            {
                nome: "Arena Kids",
                acesso: "Portão 2",
                ingressos: [
                    { nome: "Criança (3 a 12 anos)", lotes: [["Lote único", 90, 120, 120]] },
                    { nome: "Acompanhante adulto", lotes: [["Lote único", 140, 120, 120]] },
                ],
            },
        ],
        listaDeEsperaAoEsgotar: true,
    },
    // Kids e Família (fictício): teatro infantil com várias sessões no fim de semana.
    {
        id: "pt-kids-1",
        nome: "O Pequeno Príncipe: o musical",
        produtora: "Cia. Estrela Guia",
        capa: "/novo-site/cymatics/evt-150.png",
        local: "Teatro Bradesco",
        cidade: "São Paulo",
        categoria: "kids-e-familia",
        tags: ["kids", "pra-familia", "musical", "teatro"],
        descricao: ["Um musical para toda a família sobre amizade, cuidado e as coisas que só se vê com o coração.", "Duração de 70 minutos. Recomendado a partir de 4 anos."],
        sessoes: ["2026-11-28", "2026-11-29", "2026-12-05", "2026-12-06"].flatMap((d): [string, string][] => [[`${d}T11:00`, `${d}T12:10`], [`${d}T16:00`, `${d}T17:10`]]),
        grupos: [
            {
                nome: "Plateia",
                acesso: "Entrada principal",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 120, 300, 110]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 60, 150, 60]] },
                ],
            },
            { nome: "Frisas", acesso: "Entrada principal", ingressos: [{ nome: "Frisa para 4", lotes: [["Lote único", 400, 10, 4]] }] },
        ],
    },
    // Esportes (real): corrida social semanal.
    {
        id: "ig-110631",
        nome: "On Gop Run no Luci Bar",
        produtora: "On Running",
        capa: `${K}/110631/xLarge/1795041732.979483.jpg`,
        local: "Luci Bar",
        cidade: "São Paulo",
        categoria: "esportes",
        tags: ["corrida", "role-em-grupo"],
        descricao: ["Corrida social de 5 km com saída e chegada no Luci Bar, toda terça. Depois da corrida, música e drinks para quem correu."],
        sessoes: ["2026-11-24", "2026-12-01", "2026-12-08", "2026-12-15"].map((d): [string, string] => [`${d}T20:00`, `${d}T22:30`]),
        grupos: [{ nome: "Largada", acesso: "Luci Bar", ingressos: [{ nome: "Inscrição", descricao: "Gratuita, com kit de boas-vindas para os 100 primeiros.", lotes: [["Lote único", 0, 150, 90]], vendas: { limitePorPedido: 1 } }] }],
        tipo: "esportivo",
    },
    // Esportes (fictício): corrida de rua com kit e categorias de distância.
    {
        id: "pt-esporte-1",
        nome: "Corrida Noturna do Ibirapuera",
        produtora: "Circuito Pé na Pista",
        capa: "/novo-site/cymatics/evt-2016.png",
        local: "Parque Ibirapuera",
        cidade: "São Paulo",
        categoria: "esportes",
        tags: ["corrida", "ao-ar-livre"],
        descricao: ["5 e 10 km pelas alamedas do Ibirapuera iluminadas à noite. Retirada do kit no dia anterior, no portão 3."],
        sessoes: [["2026-12-12T19:30", "2026-12-12T22:00"]],
        grupos: [
            {
                nome: "5 km",
                acesso: "Portão 3",
                ingressos: [
                    { nome: "Inscrição", lotes: [["1º lote", 99, 800, 800], ["2º lote", 119, 800, 220]] },
                    { nome: "60+", beneficio: "meia-entrada", descricao: "Pessoas com 60 anos ou mais.", lotes: [["Lote único", 50, 200, 40]] },
                ],
            },
            { nome: "10 km", acesso: "Portão 3", ingressos: [{ nome: "Inscrição", lotes: [["1º lote", 129, 600, 600], ["2º lote", 149, 600, 180]] }] },
        ],
        tipo: "esportivo",
    },
    // Teatro (fictício): temporada com sessões de quinta a domingo.
    {
        id: "pt-teatro-1",
        nome: "Antes que a Luz se Apague",
        produtora: "Cia. Paralelo",
        capa: "/novo-site/cymatics/evt-160.png",
        local: "Teatro Faap",
        cidade: "São Paulo",
        categoria: "artes-cenicas",
        tags: ["teatro", "cultura", "bom-pra-date"],
        descricao: ["Drama sobre duas irmãs que se reencontram na última noite da casa da família. Temporada de dezembro, de quinta a domingo.", "Duração de 90 minutos. Não recomendado para menores de 14 anos."],
        sessoes: ["2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06", "2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13"].map((d): [string, string] => {
            const dom = new Date(`${d}T12:00`).getDay() === 0;
            return dom ? [`${d}T18:00`, `${d}T19:30`] : [`${d}T21:00`, `${d}T22:30`];
        }),
        grupos: [
            {
                nome: "Plateia",
                acesso: "Rua Alagoas, 903",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 110, 280, 120]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 55, 120, 50]] },
                ],
            },
            { nome: "Balcão", acesso: "Rua Alagoas, 903", ingressos: [{ nome: "Inteira", lotes: [["Lote único", 70, 100, 30]] }] },
        ],
    },
    {
        id: "pt-teatro-2",
        nome: "Hamlet em Concreto",
        produtora: "Grupo Galpão Sul",
        capa: "/novo-site/cymatics/evt-161.png",
        local: "Sesc Pompeia",
        cidade: "São Paulo",
        categoria: "artes-cenicas",
        tags: ["teatro", "cultura", "alternativo"],
        descricao: ["Uma montagem de Hamlet entre as estruturas de concreto do Sesc Pompeia, com o público em pé e a cena em movimento."],
        sessoes: [["2026-12-18T20:00", "2026-12-18T22:00"], ["2026-12-19T20:00", "2026-12-19T22:00"]],
        grupos: [
            {
                nome: "Galpão",
                acesso: "Rua Clélia, 93",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 60, 200]], vendas: { inicio: "2026-12-01T17:00" } },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 30, 100]], vendas: { inicio: "2026-12-01T17:00" } },
                ],
            },
        ],
    },
    // Stand-up (fictício): noite de comédia, temporada semanal e solo esgotado.
    {
        id: "pt-humor-1",
        nome: "Comédia na Laje: noite de stand-up",
        produtora: "Laje Comedy",
        capa: "/novo-site/cymatics/evt-170.png",
        local: "Laje Comedy Club",
        cidade: "São Paulo",
        categoria: "humor",
        tags: ["stand-up", "comedia", "role-em-grupo"],
        descricao: ["Quatro comediantes, uma hora e meia de stand-up e mesas pertinho do palco. Toda sexta, às 21h."],
        sessoes: ["2026-11-27", "2026-12-04", "2026-12-11", "2026-12-18"].map((d): [string, string] => [`${d}T21:00`, `${d}T22:30`]),
        grupos: [
            {
                nome: "Mesas",
                acesso: "Rua Augusta, 1200",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 80, 120, 70]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 40, 40, 20]] },
                ],
            },
        ],
    },
    {
        id: "pt-humor-2",
        nome: "Tudo Errado: o solo",
        produtora: "Riso Produções",
        capa: "/novo-site/cymatics/evt-171.png",
        local: "Teatro Gazeta",
        cidade: "São Paulo",
        categoria: "humor",
        tags: ["stand-up", "comedia"],
        descricao: ["Solo de stand-up sobre dar tudo errado com estilo. Última apresentação do ano em São Paulo."],
        sessoes: [["2026-12-09T21:00", "2026-12-09T22:20"]],
        grupos: [
            {
                nome: "Plateia",
                acesso: "Av. Paulista, 900",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 120, 400, 400]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 60, 150, 150]] },
                ],
            },
        ],
        listaDeEsperaAoEsgotar: true,
    },
    {
        id: "pt-humor-3",
        nome: "Stand-up no Rio: Humor de Esquina",
        produtora: "Humor de Esquina",
        capa: "/novo-site/cymatics/evt-172.png",
        local: "Teatro Clara Nunes",
        cidade: "Rio de Janeiro",
        categoria: "humor",
        tags: ["stand-up", "comedia"],
        descricao: ["Seis comediantes cariocas numa noite só, com o melhor do humor de esquina."],
        sessoes: [["2026-12-05T20:00", "2026-12-05T22:00"], ["2026-12-05T22:30", "2026-12-06T00:30"]],
        grupos: [{ nome: "Plateia", acesso: "Shopping da Gávea, 3º piso", ingressos: [{ nome: "Inteira", lotes: [["1º lote", 70, 300, 300], ["2º lote", 90, 300, 80]] }, { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 45, 100, 30]] }] }],
    },
    // Universitário (fictício): intercursos e calourada com open bar.
    {
        id: "pt-uni-1",
        nome: "Intermed Sudeste 2026: festa de encerramento",
        produtora: "Liga Universitária Sudeste",
        capa: "/novo-site/cymatics/evt-180.png",
        local: "Espaço das Américas",
        cidade: "São Paulo",
        categoria: "universitario",
        tags: ["universitario", "open-bar", "funk", "na-pista"],
        descricao: ["A festa de encerramento dos jogos: open bar, três atrações e a premiação das atléticas. Apresente a carteirinha na entrada."],
        sessoes: [["2026-12-12T22:00", "2026-12-13T06:00"]],
        grupos: [
            {
                nome: "Pista Open Bar",
                acesso: "Portão 1",
                ingressos: [
                    { nome: "Atleta (com pulseira)", descricao: "Para atletas inscritos nos jogos.", lotes: [["Lote único", 90, 1500, 1100]] },
                    { nome: "Universitário", lotes: [["2º lote", 160, 2000, 1200], ["3º lote", 190, 1500]] },
                ],
            },
            { nome: "Camarote das Atléticas", acesso: "Portão 3", ingressos: [{ nome: "Camarote open bar", lotes: [["Lote único", 320, 300, 210]] }] },
        ],
    },
    {
        id: "pt-uni-2",
        nome: "Calourada Federal Rio",
        produtora: "DCE Federal Rio",
        capa: "/novo-site/cymatics/evt-181.png",
        local: "Marina da Glória",
        cidade: "Rio de Janeiro",
        categoria: "universitario",
        tags: ["universitario", "na-pista", "role-em-grupo"],
        descricao: ["A calourada que abre o semestre na Marina da Glória: pista ao ar livre, pagode no fim de tarde e funk até de manhã."],
        sessoes: [["2026-12-06T18:00", "2026-12-07T04:00"]],
        grupos: [{ nome: "Pista", acesso: "Av. Infante Dom Henrique, s/n", ingressos: [{ nome: "Inteira", lotes: [["1º lote", 60, 1000, 1000], ["2º lote", 80, 1000, 400]] }, { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 40, 500, 200]] }] }],
    },
    // Feiras e Exposições (fictício): feira de dois dias e exposição com horário marcado.
    {
        id: "pt-feira-1",
        nome: "Feira Mão na Massa: design e gastronomia autoral",
        produtora: "Mão na Massa",
        capa: "/novo-site/cymatics/evt-190.png",
        local: "Pavilhão da Bienal",
        cidade: "São Paulo",
        categoria: "feiras-e-exposicoes",
        tags: ["feira", "gastronomia", "pra-familia"],
        descricao: ["Dois dias com 200 expositores de design, moda e comida autoral, oficinas para crianças e música ao vivo."],
        sessoes: [["2026-12-12T10:00", "2026-12-12T20:00"], ["2026-12-13T10:00", "2026-12-13T19:00"]],
        grupos: [
            {
                nome: "Entrada",
                acesso: "Portão 3 do parque",
                ingressos: [
                    { nome: "Inteira", lotes: [["Lote único", 30, 3000, 900]] },
                    { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 15, 1500, 300]] },
                    { nome: "Criança até 10 anos", descricao: "Gratuito, com um adulto.", lotes: [["Lote único", 0, 800, 200]], vendas: { limitePorPedido: 3 } },
                ],
            },
        ],
    },
    {
        id: "pt-feira-2",
        nome: "Exposição Mundo Pixel: a história dos videogames",
        produtora: "Mundo Pixel",
        capa: "/novo-site/cymatics/evt-191.png",
        local: "Centro de Eventos Fiergs",
        cidade: "Porto Alegre",
        categoria: "feiras-e-exposicoes",
        tags: ["exposicao", "kids", "pra-familia", "cultura"],
        descricao: ["Mais de 300 consoles e fliperamas jogáveis, do Atari ao realidade virtual. Entrada com horário marcado, a cada hora."],
        sessoes: ["2026-12-10", "2026-12-11", "2026-12-12"].flatMap((d): [string, string][] => ["10:00", "13:00", "16:00"].map((h): [string, string] => [`${d}T${h}`, `${d}T${String(Number(h.slice(0, 2)) + 3).padStart(2, "0")}:00`])),
        grupos: [{ nome: "Exposição", acesso: "Av. Assis Brasil, 8787", ingressos: [{ nome: "Inteira", lotes: [["Lote único", 50, 250, 90]] }, { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["Lote único", 25, 100, 40]] }] }],
    },
    // Turismo (real): mototour diário no Vidigal.
    {
        id: "ig-110371",
        nome: "Partiu Mototour no Vidigal",
        produtora: "Partiu Mototour",
        capa: `${K}/110371/xLarge/1793753282.7869425.jpg`,
        local: "Mirante do Arvrão",
        cidade: "Rio de Janeiro",
        categoria: "shows",
        tags: ["turismo", "ao-ar-livre", "cultura"],
        descricao: ["Viva o Rio de um jeito diferente: o Vidigal em uma experiência de mototour com guia, segurança e muita paisagem e cultura. Embarque no Leblon."],
        sessoes: datas("2026-11-25", "2026-11-30").map((d): [string, string] => [`${d}T08:00`, `${d}T11:00`]),
        grupos: [{ nome: "Passeio", acesso: "Embarque no Leblon", ingressos: [{ nome: "Passeio com guia", descricao: "Capacete, guia e seguro inclusos.", lotes: [["Lote único", 150, 12, 5]], vendas: { limitePorPedido: 4 } }] }],
    },
    // Museus (real): réveillon no Museu de Arte Moderna.
    {
        id: "ig-104464",
        nome: "Welcome Rio 2027 no Museu de Arte Moderna",
        produtora: "Welcome Rio",
        capa: `${K}/104464/xLarge/1785620707.5384789.jpg`,
        local: "Museu de Arte Moderna do Rio de Janeiro",
        cidade: "Rio de Janeiro",
        categoria: "festivais",
        tags: ["museu", "festival", "eletronica", "ao-ar-livre"],
        descricao: ["O primeiro dia de 2027 nos jardins do Museu de Arte Moderna do Rio, de frente para a Baía de Guanabara."],
        sessoes: [["2027-01-01T16:00", "2027-01-02T02:00"]],
        grupos: [{ nome: "Jardins do MAM", acesso: "Av. Infante Dom Henrique, 85", ingressos: [{ nome: "Inteira", lotes: [["2º lote", 390, 1500, 900], ["3º lote", 450, 1500]] }, { nome: "Meia-entrada", beneficio: "meia-entrada", lotes: [["2º lote", 195, 500, 260]] }] }],
    },
];

const MONTADOS = DEFS.map(montar);

/** Eventos reais (ingresse.com) com catálogo do protótipo: datas e condições de compra variadas. */
export const EVENTOS_INGRESSE: Evento[] = MONTADOS.map((m) => m.evento);

/** Vendas anteriores desses eventos (o que deixa lotes e setores esgotados). */
export const HISTORICO_INGRESSE: HistoricoVendas[] = MONTADOS.filter((m) => Object.keys(m.vendidos).length).map((m) => historicoDe(m.evento, m.vendidos));

/*
 * O que cada evento mostra:
 *  - Data única: Natal da Prelude (sem meia, limite por pedido, mesa), Saulo Fernandes, Fortaleza x Criciúma (setores), Fresno (setor esgotado),
 *    Balbúrdia (só inteira, 2 por pedido), Dominguinho (3 setores), Crema (lista gratuita que fecha antes), MOVING (lote promocional esgotado).
 *  - Duas datas: D-EDGE Rio (primeira noite esgotada), Primavera Sound (festival de 2 dias, lounge).
 *  - Semana ou mais: Mil Sorrisos (dia e noite, 14 sessões), Tawa (diária, virada esgotada), Privilège (5 noites, camarote da virada esgotado).
 *  - Semanal: Encontrin das Quintas (toda quinta), Gávea Samba Clube (toda sexta, dezembro com vendas ainda não abertas).
 *  - Vendas não abertas: Sorriso Eu Gosto no Pagode Recife (abrem 01/12).
 *  - Esgotado com lista de espera: Primavera na Cidade.
 */
