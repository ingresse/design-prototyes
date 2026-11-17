/* ------------------------------------------------------------------ */
/*  Catálogo de categorias candidatas de show ou festa                 */
/*                                                                     */
/*  Lista longa de propósito: o embedding de cada criação é comparado  */
/*  com estas candidatas, e a lista de categorias do banco fica só com */
/*  as que os eventos reais usarem (ver categorias.ts). Os termos são  */
/*  como as pessoas escrevem, não como um catálogo descreveria: é o    */
/*  que aproxima o texto livre da candidata certa.                     */
/*                                                                     */
/*  Para mudar: editar aqui e rodar `node ia-local/vetores-catalogo.mjs` */
/*  para regravar os vetores (categorias-catalogo-vetores.json).       */
/* ------------------------------------------------------------------ */

export interface CategoriaCandidata {
    id: string;
    nome: string;
    /** Grupo do catálogo, para a página de categorias organizar as candidatas. */
    grupo: "Música" | "Festas" | "Palco" | "Família" | "Gastronomia" | "Datas" | "Outros";
    /** Como as pessoas escrevem sobre esse tipo de evento. O nome entra junto. */
    termos: string[];
}

export const CATALOGO: CategoriaCandidata[] = [
    /* ---------------- Música ---------------- */
    { id: "pagode", nome: "Pagode", grupo: "Música", termos: ["roda de pagode", "grupo de pagode", "pagode anos 90", "pagodão", "pagode com cavaquinho e pandeiro"] },
    { id: "samba", nome: "Samba", grupo: "Música", termos: ["roda de samba", "samba de raiz", "samba e feijoada", "velha guarda do samba", "escola de samba"] },
    { id: "sertanejo", nome: "Sertanejo", grupo: "Música", termos: ["show sertanejo", "dupla sertaneja", "sertanejo universitário", "feminejo", "modão", "música sertaneja"] },
    { id: "funk", nome: "Funk", grupo: "Música", termos: ["baile funk", "baile de favela", "MCs de funk", "funk carioca", "fluxo", "pancadão"] },
    { id: "forro", nome: "Forró", grupo: "Música", termos: ["forró pé de serra", "trio de forró com sanfona", "xote e baião", "forró universitário", "arrasta pé"] },
    { id: "axe", nome: "Axé", grupo: "Música", termos: ["axé music", "trio elétrico", "pagodão baiano", "arrocha", "swingueira"] },
    { id: "mpb", nome: "MPB", grupo: "Música", termos: ["música popular brasileira", "show de mpb", "voz e violão", "bossa nova", "canções brasileiras"] },
    { id: "choro", nome: "Choro", grupo: "Música", termos: ["roda de choro", "regional de choro", "chorinho", "seresta"] },
    { id: "rock", nome: "Rock", grupo: "Música", termos: ["show de rock", "banda de rock", "rock nacional", "rock clássico", "classic rock"] },
    { id: "indie", nome: "Indie e alternativo", grupo: "Música", termos: ["banda indie", "rock alternativo", "bandas autorais", "cena independente", "lançamento de disco"] },
    { id: "punk", nome: "Punk e hardcore", grupo: "Música", termos: ["punk rock", "hardcore", "show de punk", "emo", "pós punk"] },
    { id: "metal", nome: "Metal", grupo: "Música", termos: ["heavy metal", "show de metal", "death metal", "thrash metal", "metal fest"] },
    { id: "pop", nome: "Pop", grupo: "Música", termos: ["show pop", "música pop", "cantora pop", "pop internacional", "k-pop"] },
    { id: "rap", nome: "Rap e trap", grupo: "Música", termos: ["show de rap", "hip hop", "trap", "batalha de rima", "rapper"] },
    { id: "reggae", nome: "Reggae", grupo: "Música", termos: ["show de reggae", "dub", "roots reggae", "reggae jamaicano"] },
    { id: "jazz", nome: "Jazz e blues", grupo: "Música", termos: ["show de jazz", "jazz instrumental", "blues", "quarteto de jazz", "big band"] },
    { id: "classica", nome: "Música clássica", grupo: "Música", termos: ["concerto", "orquestra sinfônica", "música erudita", "recital de piano", "ópera"] },
    { id: "gospel", nome: "Gospel", grupo: "Música", termos: ["show gospel", "louvor", "adoração", "banda de louvor", "música cristã", "culto"] },
    { id: "black", nome: "Black e R&B", grupo: "Música", termos: ["baile black", "charme", "R&B", "soul", "funk soul", "black music"] },
    { id: "piseiro", nome: "Piseiro e brega", grupo: "Música", termos: ["piseiro", "pisadinha", "brega funk", "tecnobrega", "brega"] },
    { id: "eletronica", nome: "Música eletrônica", grupo: "Música", termos: ["festa de música eletrônica", "DJ set", "line-up de DJs", "eletrônica"] },
    { id: "techno", nome: "Techno", grupo: "Música", termos: ["festa techno", "techno industrial", "after de techno", "galpão techno", "tech house"] },
    { id: "house", nome: "House", grupo: "Música", termos: ["deep house", "house music", "sunset house", "afro house"] },
    { id: "psytrance", nome: "Psytrance e rave", grupo: "Música", termos: ["rave", "psytrance", "trance", "festival psicodélico", "rave ao ar livre"] },
    { id: "tributo", nome: "Tributo e cover", grupo: "Música", termos: ["banda cover", "show tributo", "tributo a", "cover de", "covers clássicos"] },
    { id: "festival-musica", nome: "Festival de música", grupo: "Música", termos: ["festival com várias bandas", "festival de música", "line-up de artistas", "vários palcos"] },
    { id: "infantil-musica", nome: "Show infantil", grupo: "Família", termos: ["show infantil", "música para crianças", "show para bebês", "cantigas infantis"] },

    /* ---------------- Festas ---------------- */
    { id: "open-bar", nome: "Open bar", grupo: "Festas", termos: ["festa open bar", "open de cerveja", "open bar de drinks", "bebida liberada", "open bar premium"] },
    { id: "universitaria", nome: "Festa universitária", grupo: "Festas", termos: ["calourada", "festa universitária", "intermed", "interfaculdades", "festa de atlética", "chopada"] },
    { id: "balada", nome: "Balada", grupo: "Festas", termos: ["balada", "night", "festa em clube", "boate", "noite na pista"] },
    { id: "tematica", nome: "Festa temática", grupo: "Festas", termos: ["festa temática", "festa à fantasia", "festa anos 2000", "festa anos 80", "festa ploc", "flashback"] },
    { id: "lgbt", nome: "Festa LGBTQIA+", grupo: "Festas", termos: ["festa lgbt", "festa gay", "drag queens", "festa queer", "parada"] },
    { id: "sunset", nome: "Sunset e rooftop", grupo: "Festas", termos: ["sunset", "pôr do sol", "rooftop", "festa no terraço", "fim de tarde"] },
    { id: "praia", nome: "Festa na praia", grupo: "Festas", termos: ["festa na praia", "beach club", "festa na areia", "pool party", "festa na piscina"] },
    { id: "barco", nome: "Festa no barco", grupo: "Festas", termos: ["festa no barco", "boat party", "passeio de barco com festa", "lancha"] },
    { id: "after", nome: "After", grupo: "Festas", termos: ["after", "afterparty", "festa de manhã", "after hours"] },
    { id: "baile", nome: "Baile", grupo: "Festas", termos: ["baile de gala", "baile de máscaras", "baile de debutante", "baile dançante", "salão de dança"] },
    { id: "rodeio", nome: "Rodeio e festa do peão", grupo: "Festas", termos: ["rodeio", "festa do peão", "montaria em touro", "campeonato de laço", "arena country"] },
    { id: "cervejeira", nome: "Festa da cerveja", grupo: "Gastronomia", termos: ["oktoberfest", "festa da cerveja", "chope", "cerveja artesanal", "festival cervejeiro"] },

    /* ---------------- Datas ---------------- */
    { id: "reveillon", nome: "Réveillon", grupo: "Datas", termos: ["réveillon", "virada do ano", "ano novo", "queima de fogos", "festa de fim de ano"] },
    { id: "carnaval", nome: "Carnaval", grupo: "Datas", termos: ["carnaval", "bloco de rua", "pré carnaval", "ensaio de bloco", "marchinhas", "bateria de escola de samba"] },
    { id: "junina", nome: "Festa junina", grupo: "Datas", termos: ["festa junina", "arraiá", "festa julina", "quadrilha", "festa caipira", "são joão"] },
    { id: "natal", nome: "Natal", grupo: "Datas", termos: ["natal", "papai noel", "festa de natal", "cantata de natal"] },
    { id: "halloween", nome: "Halloween", grupo: "Datas", termos: ["halloween", "festa de terror", "dia das bruxas", "festa à fantasia de halloween"] },
    { id: "dia-das-maes", nome: "Datas comemorativas", grupo: "Datas", termos: ["dia das mães", "dia dos namorados", "dia dos pais", "aniversário da cidade"] },

    /* ---------------- Palco ---------------- */
    { id: "stand-up", nome: "Stand-up", grupo: "Palco", termos: ["stand up comedy", "show de comédia", "show de humor", "comediante", "solo de comédia"] },
    { id: "improviso", nome: "Comédia de improviso", grupo: "Palco", termos: ["improviso", "teatro de improviso", "cenas improvisadas", "impro"] },
    { id: "teatro", nome: "Teatro", grupo: "Palco", termos: ["peça de teatro", "espetáculo teatral", "drama", "comédia teatral", "monólogo"] },
    { id: "musical", nome: "Musical", grupo: "Palco", termos: ["teatro musical", "musical da broadway", "espetáculo musical", "musical brasileiro"] },
    { id: "danca", nome: "Dança", grupo: "Palco", termos: ["espetáculo de dança", "balé", "dança contemporânea", "companhia de dança", "sapateado"] },
    { id: "circo", nome: "Circo", grupo: "Palco", termos: ["circo", "espetáculo circense", "palhaços", "acrobatas", "malabaristas"] },
    { id: "magica", nome: "Mágica e ilusionismo", grupo: "Palco", termos: ["show de mágica", "mágico", "ilusionista", "hipnose"] },
    { id: "poesia", nome: "Sarau e poesia", grupo: "Palco", termos: ["sarau", "slam de poesia", "leitura de poesia", "batalha de poesia"] },
    { id: "palestra", nome: "Palestra e talk", grupo: "Outros", termos: ["palestra", "talk show", "bate papo com", "podcast ao vivo", "conferência"] },

    /* ---------------- Família ---------------- */
    { id: "teatro-infantil", nome: "Teatro infantil", grupo: "Família", termos: ["teatro para crianças", "peça infantil", "teatro de bonecos", "contação de histórias", "musical infantil"] },
    { id: "festa-infantil", nome: "Festa infantil", grupo: "Família", termos: ["festa infantil", "personagens infantis", "brinquedos infláveis", "oficinas para crianças", "recreação infantil"] },
    { id: "familia", nome: "Programa em família", grupo: "Família", termos: ["para toda a família", "passeio em família", "parque", "evento família"] },

    /* ---------------- Gastronomia ---------------- */
    { id: "food-festival", nome: "Festival gastronômico", grupo: "Gastronomia", termos: ["festival gastronômico", "food trucks", "comida de rua", "festival de hambúrguer", "feira gastronômica"] },
    { id: "vinho", nome: "Vinhos e degustação", grupo: "Gastronomia", termos: ["degustação de vinhos", "vinhos e queijos", "harmonização", "enoturismo", "wine"] },
    { id: "doces", nome: "Doces e chocolates", grupo: "Gastronomia", termos: ["festival do chocolate", "doces artesanais", "feira de doces", "confeitaria"] },
    { id: "feijoada", nome: "Feijoada e almoço", grupo: "Gastronomia", termos: ["feijoada", "almoço com show", "churrasco", "festa do churrasco", "brunch"] },

    /* ---------------- Outros ---------------- */
    { id: "feira", nome: "Feira e exposição", grupo: "Outros", termos: ["feira", "exposição", "feira de artesanato", "bazar", "expo"] },
    { id: "religioso", nome: "Encontro religioso", grupo: "Outros", termos: ["retiro", "conferência cristã", "encontro de jovens da igreja", "missa", "congresso religioso"] },
    { id: "geek", nome: "Geek e games", grupo: "Outros", termos: ["evento geek", "cosplay", "games", "anime", "campeonato de e-sports"] },
    { id: "beneficente", nome: "Beneficente", grupo: "Outros", termos: ["evento beneficente", "show solidário", "arrecadação", "entrada solidária", "leilão beneficente"] },
    { id: "formatura", nome: "Formatura", grupo: "Outros", termos: ["formatura", "baile de formatura", "colação de grau", "festa de formandos"] },
    { id: "cinema", nome: "Cinema", grupo: "Outros", termos: ["sessão de cinema", "cinema ao ar livre", "pré estreia", "mostra de filmes"] },
    { id: "bem-estar", nome: "Bem-estar", grupo: "Outros", termos: ["yoga", "meditação", "retiro de bem estar", "sound healing", "ioga ao ar livre"] },
];
