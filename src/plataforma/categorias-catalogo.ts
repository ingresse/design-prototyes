import type { TipoEvento } from "./modelo";

/* ------------------------------------------------------------------ */
/*  Categorias e tags de evento                                        */
/*                                                                     */
/*  Categoria: uma por evento, escolhida pela pessoa num dropdown. São  */
/*  as 10 do mapa do Grupo e vão para a coleção `categorias` do banco  */
/*  pela seed. Futebol e evento esportivo já nascem com a sua.          */
/*                                                                     */
/*  Tags: várias por evento, em quatro grupos, achadas por embedding   */
/*  (ver categorias.ts). Os termos são como as pessoas escrevem, não   */
/*  como um catálogo descreveria: é o que aproxima o texto livre da    */
/*  tag certa.                                                         */
/*                                                                     */
/*  Mudou uma tag? Rodar                                               */
/*    node --experimental-strip-types ia-local/vetores-catalogo.mjs    */
/*  para regravar os vetores (categorias-catalogo-vetores.json).       */
/* ------------------------------------------------------------------ */

export interface CategoriaDoMapa {
    id: string;
    nome: string;
    /** Ordem no dropdown e na página. */
    ordem: number;
    /** Tipo de criação que usa a categoria. Futebol e esportivo têm a sua; show ou festa escolhe entre as outras. */
    tipo: TipoEvento;
    /** Palavras que, ditas no texto, sugerem a categoria quando o dropdown ainda está vazio. */
    termos?: string[];
}

/** As 10 categorias do mapa do Grupo. Ids sem colisão com as candidatas da versão anterior, que podem estar no banco. */
export const CATEGORIAS: CategoriaDoMapa[] = [
    { id: "shows", nome: "Shows", ordem: 1, tipo: "show", termos: ["show", "ao vivo", "turnê", "acústico", "apresentação"] },
    { id: "festivais", nome: "Festivais", ordem: 2, tipo: "show", termos: ["festival", "line-up", "lineup", "palcos"] },
    { id: "festas-e-baladas", nome: "Festas e Baladas", ordem: 3, tipo: "show", termos: ["festa", "balada", "baile", "rave", "night", "noitada", "bloco", "open bar", "after", "pista"] },
    { id: "universitario", nome: "Universitário", ordem: 4, tipo: "show", termos: ["universitária", "universitário", "atlética", "calourada", "intermed", "interfaculdades", "chopada", "faculdade"] },
    { id: "futebol", nome: "Futebol", ordem: 5, tipo: "futebol" },
    { id: "esportes", nome: "Esportes", ordem: 6, tipo: "esportivo" },
    { id: "artes-cenicas", nome: "Teatro", ordem: 7, tipo: "show", termos: ["teatro", "peça", "espetáculo", "espetáculo de dança", "balé"] },
    { id: "humor", nome: "Stand-up", ordem: 8, tipo: "show", termos: ["stand-up", "stand up", "comédia", "humor", "comediante", "humorista"] },
    { id: "kids-e-familia", nome: "Kids e Família", ordem: 9, tipo: "show", termos: ["infantil", "criança", "kids", "família", "crianças"] },
    { id: "feiras-e-exposicoes", nome: "Feiras e Exposições", ordem: 10, tipo: "show", termos: ["feira", "exposição", "expo", "mostra", "convenção", "congresso"] },
];

/**
 * Quando o texto cita mais de uma, vale a mais específica: "festa universitária" é Universitário,
 * "show no festival" é Festivais, "stand-up no bar" é Stand-up.
 */
export const ORDEM_DA_SUGESTAO = ["universitario", "kids-e-familia", "humor", "artes-cenicas", "feiras-e-exposicoes", "festivais", "festas-e-baladas", "shows"];

export type GrupoDeTag = "genero" | "ocasiao" | "sazonal" | "comodidade";

export interface GrupoDaTag {
    id: GrupoDeTag;
    nome: string;
    descricao: string;
    /** Só vale nestas categorias. Sem a lista, vale em todas. */
    categorias?: string[];
    /** Máximo de tags do grupo por evento. */
    maximo: number;
    /**
     * Só entra dita no texto, no nome, na descrição ou na leitura do banner: citada, ou com outras
     * palavras quase iguais a um termo (trecho com similaridade de 0,94). Ocasião, data e o que o evento
     * oferece não se adivinham pelo clima do texto: "bloco" não é Réveillon, e Open bar só existe se
     * alguém disse.
     */
    soCitada: boolean;
}

export const GRUPOS_DE_TAG: GrupoDaTag[] = [
    { id: "genero", nome: "Gênero musical", descricao: "Só em Shows, Festivais, Festas e Baladas e Universitário.", categorias: ["shows", "festivais", "festas-e-baladas", "universitario"], maximo: 3, soCitada: false },
    { id: "ocasiao", nome: "Ocasião", descricao: "O momento ou o motivo do evento, quando dito no texto ou no banner.", maximo: 2, soCitada: true },
    { id: "sazonal", nome: "Sazonais", descricao: "Datas e temporadas, quando ditas no texto ou no banner e com o evento perto da data.", maximo: 2, soCitada: true },
    { id: "comodidade", nome: "Comodidades", descricao: "Benefícios e serviços, quando ditos no texto ou no banner.", maximo: 4, soCitada: true },
];

export interface Tag {
    id: string;
    nome: string;
    grupo: GrupoDeTag;
    /** Como as pessoas escrevem. O nome entra junto. */
    termos: string[];
    /** Só vale nestas categorias (além da regra do grupo). */
    categorias?: string[];
    /** Achada esta, entra também a tag mais ampla (techno também é eletrônica). */
    inclui?: string[];
    /**
     * Sazonais: só vale com o evento dentro de uma destas janelas, `MM-DD` (todo ano, pode virar o ano)
     * ou `AAAA-MM-DD` (só naquele ano).
     */
    janelas?: [string, string][];
}

export const TAGS: Tag[] = [
    /* ---------------- Gênero musical ---------------- */
    { id: "pagode", nome: "Pagode", grupo: "genero", termos: ["roda de pagode", "grupo de pagode", "pagode anos 90", "pagodão", "cavaquinho e pandeiro"] },
    { id: "samba", nome: "Samba", grupo: "genero", termos: ["roda de samba", "samba de raiz", "samba e feijoada", "velha guarda", "escola de samba"] },
    { id: "choro", nome: "Choro", grupo: "genero", termos: ["roda de choro", "chorinho", "regional de choro", "seresta"] },
    { id: "sertanejo", nome: "Sertanejo", grupo: "genero", termos: ["show sertanejo", "dupla sertaneja", "sertanejo universitário", "feminejo", "modão"] },
    { id: "forro", nome: "Forró", grupo: "genero", termos: ["forró pé de serra", "sanfona", "xote e baião", "arrasta pé", "forró universitário"] },
    { id: "piseiro", nome: "Piseiro e brega", grupo: "genero", termos: ["piseiro", "pisadinha", "brega funk", "tecnobrega", "brega"] },
    { id: "axe", nome: "Axé", grupo: "genero", termos: ["axé music", "trio elétrico", "pagodão baiano", "arrocha", "swingueira"] },
    { id: "funk", nome: "Funk", grupo: "genero", termos: ["baile funk", "baile de favela", "funk carioca", "MCs", "pancadão", "fluxo"] },
    { id: "mpb", nome: "MPB", grupo: "genero", termos: ["música popular brasileira", "voz e violão", "bossa nova", "canções brasileiras"] },
    { id: "rock", nome: "Rock", grupo: "genero", termos: ["show de rock", "banda de rock", "rock nacional", "classic rock"] },
    { id: "indie", nome: "Indie e alternativo", grupo: "genero", termos: ["banda indie", "rock alternativo", "bandas autorais", "cena independente"] },
    { id: "metal", nome: "Metal", grupo: "genero", termos: ["heavy metal", "death metal", "thrash metal", "punk", "hardcore"] },
    { id: "pop", nome: "Pop", grupo: "genero", termos: ["música pop", "cantora pop", "pop internacional", "hits do momento"] },
    { id: "kpop", nome: "K-pop", grupo: "genero", termos: ["k-pop", "kpop", "música coreana", "grupo coreano", "idol"] },
    { id: "rap", nome: "Rap e trap", grupo: "genero", termos: ["rap", "hip hop", "trap", "drill", "batalha de rima"] },
    { id: "black", nome: "Black e R&B", grupo: "genero", termos: ["baile black", "charme", "R&B", "soul", "black music"] },
    { id: "reggae", nome: "Reggae", grupo: "genero", termos: ["reggae", "dub", "roots reggae", "surf music"] },
    { id: "latina", nome: "Latina e reggaeton", grupo: "genero", termos: ["reggaeton", "música latina", "salsa", "bachata", "perreo"] },
    { id: "eletronica", nome: "Eletrônica", grupo: "genero", termos: ["música eletrônica", "DJ set", "line-up de DJs", "EDM", "DJ convidado"] },
    { id: "techno", nome: "Techno", grupo: "genero", termos: ["festa techno", "techno industrial", "galpão techno", "tech house"], inclui: ["eletronica"] },
    { id: "house", nome: "House", grupo: "genero", termos: ["deep house", "house music", "afro house", "disco house"], inclui: ["eletronica"] },
    { id: "psytrance", nome: "Psytrance", grupo: "genero", termos: ["rave psicodélica", "psytrance", "trance", "festival psicodélico"], inclui: ["eletronica"] },
    { id: "gospel", nome: "Gospel", grupo: "genero", termos: ["louvor", "adoração", "banda de louvor", "música cristã"] },
    { id: "jazz", nome: "Jazz e blues", grupo: "genero", termos: ["jazz", "blues", "jazz instrumental", "big band"] },
    { id: "classica", nome: "Clássica", grupo: "genero", termos: ["orquestra", "concerto", "música erudita", "recital", "ópera", "candlelight"] },
    { id: "flashback", nome: "Flashback", grupo: "genero", termos: ["anos 80", "anos 90", "anos 2000", "festa ploc", "hits antigos"] },

    /* ---------------- Ocasião ---------------- */
    { id: "turne", nome: "Turnê", grupo: "ocasiao", termos: ["turnê", "tour", "nova turnê", "passa pela cidade"] },
    { id: "estreia", nome: "Estreia e lançamento", grupo: "ocasiao", termos: ["estreia", "pré-estreia", "lançamento do álbum", "lançamento de disco", "primeira vez na cidade"] },
    { id: "despedida", nome: "Despedida", grupo: "ocasiao", termos: ["último show", "turnê de despedida", "show de despedida", "despedida dos palcos"] },
    { id: "tributo", nome: "Tributo", grupo: "ocasiao", termos: ["tributo a", "tributo ao", "banda cover", "homenagem a", "homenagem ao", "homenagem à", "cover"] },
    { id: "aniversario", nome: "Aniversário", grupo: "ocasiao", termos: ["aniversário da casa", "aniversário da festa", "edição de aniversário", "comemoração de anos"] },
    { id: "formatura", nome: "Formatura", grupo: "ocasiao", termos: ["formatura", "baile de formatura", "colação de grau", "formandos"] },
    { id: "calourada", nome: "Calourada", grupo: "ocasiao", termos: ["calourada", "recepção dos calouros", "intermed", "interfaculdades", "atlética", "chopada"] },
    { id: "beneficente", nome: "Beneficente", grupo: "ocasiao", termos: ["evento beneficente", "show solidário", "arrecadação", "entrada solidária"] },
    { id: "sunset", nome: "Sunset", grupo: "ocasiao", termos: ["pôr do sol", "fim de tarde", "rooftop", "day party", "sunset party"] },
    { id: "after", nome: "After", grupo: "ocasiao", termos: ["after", "afterparty", "after hours", "festa de manhã", "até o sol nascer", "até amanhecer"] },
    { id: "casais", nome: "Casais", grupo: "ocasiao", termos: ["casal", "para casais", "encontro de casais", "noite romântica", "programa a dois", "romântico", "romântica"] },
    { id: "ar-livre", nome: "Ao ar livre", grupo: "ocasiao", termos: ["ao ar livre", "open air", "a céu aberto", "bloco de rua", "festa de rua", "na rua", "na praça", "no parque"] },
    { id: "classico", nome: "Clássico", grupo: "ocasiao", termos: ["clássico", "dérbi", "rivais", "jogo decisivo entre rivais"], categorias: ["futebol", "esportes"] },
    { id: "final", nome: "Final", grupo: "ocasiao", termos: ["grande final", "final do campeonato", "semifinal", "finalíssima"], categorias: ["futebol", "esportes"] },

    /* ---------------- Sazonais ---------------- */
    { id: "carnaval", nome: "Carnaval", grupo: "sazonal", termos: ["carnaval", "bloco de carnaval", "bloco de rua", "bloco", "folia", "foliões", "abadá", "pré-carnaval", "ensaio de bloco", "marchinhas", "baile do momo"], janelas: [["01-06", "03-15"]] },
    { id: "reveillon", nome: "Réveillon", grupo: "sazonal", termos: ["réveillon", "virada do ano", "passagem de ano", "ano novo", "queima de fogos"], janelas: [["12-26", "01-02"]] },
    { id: "festa-junina", nome: "Festa junina", grupo: "sazonal", termos: ["festa junina", "arraiá", "festa julina", "festa caipira", "arraial", "quadrilha", "são joão"], janelas: [["06-01", "07-31"]] },
    { id: "halloween", nome: "Halloween", grupo: "sazonal", termos: ["halloween", "dia das bruxas", "festa de terror", "festa à fantasia de terror"], janelas: [["10-20", "11-05"]] },
    { id: "natal", nome: "Natal", grupo: "sazonal", termos: ["natal", "papai noel", "festa de natal", "cantata de natal"], janelas: [["12-01", "12-26"]] },
    { id: "pascoa", nome: "Páscoa", grupo: "sazonal", termos: ["páscoa", "caça aos ovos", "coelho da páscoa"], janelas: [["03-15", "04-30"]] },
    { id: "dia-dos-namorados", nome: "Dia dos Namorados", grupo: "sazonal", termos: ["dia dos namorados", "noite romântica para casais"], janelas: [["06-05", "06-14"]] },
    { id: "dia-das-maes", nome: "Dia das Mães", grupo: "sazonal", termos: ["dia das mães", "homenagem às mães"], janelas: [["05-01", "05-15"]] },
    { id: "dia-dos-pais", nome: "Dia dos Pais", grupo: "sazonal", termos: ["dia dos pais", "homenagem aos pais"], janelas: [["08-01", "08-15"]] },
    { id: "dia-das-criancas", nome: "Dia das Crianças", grupo: "sazonal", termos: ["dia das crianças", "12 de outubro"], janelas: [["10-01", "10-15"]] },
    { id: "oktoberfest", nome: "Oktoberfest", grupo: "sazonal", termos: ["oktoberfest", "festa da cerveja", "festival cervejeiro", "festa alemã"], janelas: [["09-15", "10-31"]] },
    { id: "ferias", nome: "Férias", grupo: "sazonal", termos: ["férias escolares", "férias de julho", "temporada de férias"], janelas: [["12-15", "02-15"], ["07-01", "07-31"]] },
    { id: "verao", nome: "Verão", grupo: "sazonal", termos: ["verão", "temporada de verão", "festa na praia", "beach club", "pool party"], janelas: [["12-21", "03-20"]] },
    { id: "copa-do-mundo", nome: "Copa do Mundo", grupo: "sazonal", termos: ["copa do mundo", "jogo do brasil", "seleção brasileira", "jogo da seleção", "jogos da copa"], janelas: [["2026-06-11", "2026-07-19"], ["2030-06-08", "2030-07-21"]] },

    /* ---------------- Comodidades ---------------- */
    { id: "open-bar", nome: "Open bar", grupo: "comodidade", termos: ["open bar", "open de cerveja", "bebida liberada", "bebida à vontade", "open de drinks", "full open bar", "bebida inclusa", "open de chopp"] },
    { id: "open-food", nome: "Open food", grupo: "comodidade", termos: ["open food", "comida liberada", "buffet incluso", "open de comida"] },
    { id: "camarote", nome: "Camarote", grupo: "comodidade", termos: ["camarote", "frisa", "camarote open bar"] },
    { id: "area-vip", nome: "Área VIP", grupo: "comodidade", termos: ["área vip", "vip", "lounge", "pista premium"] },
    { id: "meet-and-greet", nome: "Meet & greet", grupo: "comodidade", termos: ["meet and greet", "meet & greet", "encontro com o artista", "foto com o artista"] },
    { id: "mesa", nome: "Mesa e bistrô", grupo: "comodidade", termos: ["mesa reservada", "bistrô", "mesa para grupo", "lugar sentado"] },
    { id: "estacionamento", nome: "Estacionamento", grupo: "comodidade", termos: ["estacionamento", "estacionamento no local", "valet"] },
    { id: "transfer", nome: "Transfer", grupo: "comodidade", termos: ["transfer", "excursão", "ônibus saindo de", "van até o evento"] },
    { id: "hospedagem", nome: "Hospedagem", grupo: "comodidade", termos: ["hospedagem", "pacote com hotel", "camping", "pacote com hospedagem"] },
    { id: "alimentacao", nome: "Praça de alimentação", grupo: "comodidade", termos: ["food trucks", "praça de alimentação", "comidinhas", "gastronomia no local"] },
    { id: "espaco-kids", nome: "Espaço kids", grupo: "comodidade", termos: ["espaço kids", "recreação infantil", "monitores para crianças", "brinquedos"] },
    { id: "acessivel", nome: "Acessível", grupo: "comodidade", termos: ["acessível", "acessibilidade", "libras", "audiodescrição", "cadeirantes"] },
    { id: "pet-friendly", nome: "Pet friendly", grupo: "comodidade", termos: ["pet friendly", "aceita pets", "pode levar cachorro", "cachorro", "pode levar o pet", "animais são bem-vindos"] },
];
