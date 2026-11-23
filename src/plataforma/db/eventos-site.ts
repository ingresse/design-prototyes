/**
 * Eventos que vieram do site antigo (React, src/produtos/novo-site, removido em 23/11/2026 quando o site passou a ser a cópia
 * estática em public/novo-site). Ficam aqui só como dado da seed: são parte do mundo do banco (pedidos, carteiras e Backstage
 * apontam para eles pelo id). Não mude ids nem valores sem subir SEED_VERSAO em seed.ts.
 */
export interface EventoSiteLegado {
    id: string;
    titulo: string;
    artista?: string;
    /** AAAA-MM-DD */
    data: string;
    dataFim?: string;
    local: string;
    cidade: string;
    preco: number;
    cover?: string;
    categoria: string;
    tags: string[];
    descricao?: string[];
}

export const EVENTOS_SITE_LEGADO: EventoSiteLegado[] = 
[
    {
        "id": "village-anitta",
        "titulo": "Village 2026 · Anitta",
        "artista": "Anitta",
        "data": "2026-02-14",
        "local": "Camarote Village",
        "cidade": "Salvador",
        "preco": 890,
        "cover": "https://kraken.ingresse.com/event/posters/91169/large/1774865640.8354099.jpg",
        "categoria": "festival",
        "tags": [
            "carnaval",
            "anitta",
            "camarote"
        ]
    },
    {
        "id": "village-momo",
        "titulo": "Village 2026 · Baile do Momo",
        "artista": "Anitta",
        "data": "2026-02-15",
        "local": "Arena Village",
        "cidade": "Salvador",
        "preco": 690,
        "cover": "https://kraken.ingresse.com/event/posters/91683/large/1774435347.0555267.jpg",
        "categoria": "festival",
        "tags": [
            "carnaval",
            "baile do momo",
            "camarote"
        ]
    },
    {
        "id": "arena-brasileira",
        "titulo": "Arena Brasileira 2026",
        "artista": "Anitta",
        "data": "2026-03-21",
        "local": "Arena",
        "cidade": "São Paulo",
        "preco": 240,
        "cover": "https://kraken.ingresse.com/event/posters/88741/large/1777059599.2681417.jpg",
        "categoria": "festival",
        "tags": [
            "festival",
            "música brasileira"
        ]
    },
    {
        "id": "dom-fortaleza-bb",
        "titulo": "Turnê Dominguinho · Fortaleza",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-04-10",
        "local": "Centro de Eventos do Ceará",
        "cidade": "Fortaleza",
        "preco": 160,
        "cover": "https://kraken.ingresse.com/event/posters/94563/large/1779123707.2089734.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-fortaleza",
        "titulo": "Turnê Dominguinho · Fortaleza (2ª data)",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-04-11",
        "local": "Centro de Eventos do Ceará",
        "cidade": "Fortaleza",
        "preco": 160,
        "cover": "https://kraken.ingresse.com/event/posters/94463/large/1779123672.545349.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-uberlandia",
        "titulo": "Turnê Dominguinho · Uberlândia",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-04-18",
        "local": "Center Convention",
        "cidade": "Uberlândia",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94657/large/1779123761.921731.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-santos",
        "titulo": "Turnê Dominguinho · Santos",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-04-25",
        "local": "Mendes Convention Center",
        "cidade": "Santos",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94574/large/1779123830.2433288.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-campinas",
        "titulo": "Dominguinho em Campinas",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-05-02",
        "local": "Royal Palm Hall",
        "cidade": "Campinas",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94572/large/1779123884.4590633.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-portoalegre",
        "titulo": "Turnê Dominguinho · Porto Alegre",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-05-09",
        "local": "Pepsi On Stage",
        "cidade": "Porto Alegre",
        "preco": 170,
        "cover": "https://kraken.ingresse.com/event/posters/94501/large/1779123936.371687.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-natal",
        "titulo": "Turnê Dominguinho · Natal",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-05-16",
        "local": "Arena das Dunas",
        "cidade": "Natal",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94573/large/1779124002.883828.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-londrina",
        "titulo": "Turnê Dominguinho · Londrina",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-05-23",
        "local": "Londrina Convention",
        "cidade": "Londrina",
        "preco": 140,
        "cover": "https://kraken.ingresse.com/event/posters/95087/large/1779151236.5105138.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-ribeirao",
        "titulo": "Turnê Dominguinho · Ribeirão Preto",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-05-30",
        "local": "Vila Mix Ribeirão",
        "cidade": "Ribeirão Preto",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94789/large/1779137468.601717.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "dom-salvador",
        "titulo": "Turnê Dominguinho · Salvador",
        "artista": "Jota.pê, João Gomes e Mestrinho",
        "data": "2026-06-06",
        "local": "Concha Acústica TCA",
        "cidade": "Salvador",
        "preco": 160,
        "cover": "https://kraken.ingresse.com/event/posters/94506/large/1779137759.8814712.jpg",
        "categoria": "sertanejo",
        "tags": [
            "forró",
            "sertanejo",
            "mpb"
        ]
    },
    {
        "id": "alok",
        "titulo": "Alok",
        "artista": "Alok",
        "data": "2026-09-12",
        "local": "Allianz Parque",
        "cidade": "São Paulo",
        "preco": 180,
        "cover": "https://kraken.ingresse.com/event/posters/17008/large.jpg",
        "categoria": "eletronica",
        "tags": [
            "edm",
            "eletrônica",
            "open air"
        ]
    },
    {
        "id": "dedge-rio",
        "titulo": "D-Edge Rio apresenta Departamento",
        "artista": "Departamento",
        "data": "2026-06-25",
        "local": "D-Edge Rio",
        "cidade": "Rio de Janeiro",
        "preco": 90,
        "cover": "https://kraken.ingresse.com/event/posters/97708/large/1781044616.1797788.jpg",
        "categoria": "eletronica",
        "tags": [
            "techno",
            "house",
            "open bar"
        ]
    },
    {
        "id": "jardim-copa",
        "titulo": "Jardim da Copa 2026",
        "artista": "by Johnnie Walker",
        "data": "2026-06-27",
        "local": "Jockey Club",
        "cidade": "Rio de Janeiro",
        "preco": 150,
        "cover": "https://kraken.ingresse.com/event/posters/94311/large/1779136499.7231941.jpg",
        "categoria": "festival",
        "tags": [
            "copa",
            "festival",
            "open bar"
        ]
    },
    {
        "id": "doce-maravilha",
        "titulo": "Doce Maravilha · A Festa da Música Brasileira",
        "artista": "Caetano, Paulinho da Viola, Paralamas e mais",
        "data": "2026-08-07",
        "dataFim": "2026-08-09",
        "local": "Jockey Club Brasileiro",
        "cidade": "Rio de Janeiro",
        "preco": 110,
        "cover": "https://kraken.ingresse.com/event/posters/92149/large/1781884210.5202928.jpg",
        "categoria": "sertanejo",
        "tags": [
            "mpb",
            "samba",
            "ao ar livre"
        ],
        "descricao": [
            "A quarta edição do Doce Maravilha acontece nos dias 7, 8 e 9 de agosto, no Jockey Club Brasileiro, no Rio de Janeiro, reafirmando sua proposta de reunir diferentes gerações, regiões e sonoridades em torno de uma grande celebração da música brasileira.",
            "As atrações seguem ancoradas na mistura entre repertório, descoberta e invenção, unindo a experiência e o olhar atento de Nelson Motta para diferentes movimentos da música feita no país.",
            "Local: Jockey Club — Praça Santos Dumont, 31, Gávea. Abertura na sexta às 18h (entrada até 21h15, término 22h); sábado e domingo abertura às 12h (entrada até 20h30, término 22h).",
            "Classificação etária: 16 anos. Menores entre 5 e 15 anos só acompanhados dos pais ou responsáveis legais (com documento). Proibida a entrada de menores de 5 anos.",
            "Ingresso solidário: parte da arrecadação é destinada a institutos beneficentes parceiros do festival; vale para todas as pessoas, sem necessidade de comprovação e sem obrigatoriedade de levar alimento.",
            "Venda limitada a 4 ingressos por CPF, sendo até 2 meia-entrada. Taxa de conveniência de 10% nas vendas online; sem taxa nas vendas presenciais. Não serão permitidas transferências de ingressos online no dia do evento."
        ]
    },
    {
        "id": "camarote-liniker",
        "titulo": "Camarote Fanzone · Liniker — Bye Bye Caju",
        "artista": "Liniker",
        "data": "2026-07-11",
        "local": "Nubank Parque",
        "cidade": "São Paulo",
        "preco": 690,
        "cover": "https://kraken.ingresse.com/event/posters/89285/large/1778187266.1136427.jpg",
        "categoria": "festival",
        "tags": [
            "camarote",
            "open bar",
            "open food",
            "mpb"
        ],
        "descricao": [
            "O Camarote Fanzone convida o público a viver o show da Liniker, dentro da turnê “Bye Bye Caju”, no Nubank Parque, em uma apresentação que celebra afeto, potência artística e a maturidade musical de uma das vozes mais marcantes da música brasileira contemporânea.",
            "A turnê apresenta ao público o repertório do álbum CAJU, além de canções que atravessam a trajetória da artista, em um espetáculo intenso, sensível e carregado de emoção. No palco, Liniker entrega uma performance envolvente, que transforma o show em uma experiência profunda de conexão com o público.",
            "Com visão privilegiada para o palco e ambiente climatizado, o Camarote Fanzone oferece conforto e exclusividade para acompanhar cada momento da apresentação. O espaço conta com serviço completo de open bar e open food, atendimento dedicado e acesso organizado, garantindo uma experiência fluida do início ao fim do evento.",
            "O Camarote Fanzone é a escolha ideal para quem deseja vivenciar a turnê da Liniker de forma diferenciada, unindo música, conforto e hospitalidade em um dos principais palcos do país.",
            "Data: 11/07/2026 · Abertura dos portões: 15h00* · Show: 19h00*. Horário sujeito a alteração. Abertura de vendas dia 22/12 às 13h.",
            "OPEN BAR completíssimo: água e refrigerante durante todo o evento, a cerveja oficial do evento e JACK DANIEL’S.",
            "OPEN FOOD: buffet de entrada (snacks, canapés, pães, pastas, verrine) da abertura até o início do show; prato principal servido duas horas antes do show; açaí liberado a noite toda e sobremesas a partir de uma hora após o início do show. *Cardápio sujeito a alteração sem aviso prévio.",
            "Cobertura fotográfica: haverá fotógrafo oficial do camarote no evento. Ao adquirir o ingresso, você autoriza o uso da sua imagem.",
            "Classificação etária: +18. Menores de 18 anos somente acompanhados dos responsáveis.",
            "Contato: contato@soccerhospitality.com.br · SAC: (11) 94229-2687.",
            "Importante: o encerramento do acesso pelas catracas do E0 ocorre às 22h00. Chegue antes desse horário para garantir a entrada."
        ]
    },
    {
        "id": "rio-surf",
        "titulo": "Rio Surf Music Festival",
        "data": "2026-07-04",
        "local": "Praia da Macumba",
        "cidade": "Rio de Janeiro",
        "preco": 130,
        "cover": "https://kraken.ingresse.com/event/posters/91699/large/1778018804.1097233.jpg",
        "categoria": "festival",
        "tags": [
            "reggae",
            "surf",
            "ao ar livre"
        ]
    },
    {
        "id": "firezone",
        "titulo": "Camarote Firezone · Botafogo x Grêmio",
        "data": "2026-07-12",
        "local": "Maracanã",
        "cidade": "Rio de Janeiro",
        "preco": 320,
        "cover": "https://kraken.ingresse.com/event/posters/91843/large/1781274013.0050466.jpg",
        "categoria": "esportes",
        "tags": [
            "futebol",
            "camarote"
        ]
    },
    {
        "id": "bot-gre",
        "titulo": "Botafogo x Grêmio",
        "data": "2026-07-12",
        "local": "Estádio Nilton Santos",
        "cidade": "Rio de Janeiro",
        "preco": 60,
        "categoria": "esportes",
        "tags": [
            "futebol",
            "brasileirão"
        ]
    },
    {
        "id": "bah-for",
        "titulo": "Bahia x Fortaleza",
        "data": "2026-07-19",
        "local": "Arena Fonte Nova",
        "cidade": "Salvador",
        "preco": 50,
        "categoria": "esportes",
        "tags": [
            "futebol",
            "nordestão"
        ]
    },
    {
        "id": "ginga",
        "titulo": "Ginga BH · Full Open Bar",
        "data": "2026-06-26",
        "local": "Mansão Ginga",
        "cidade": "Belo Horizonte",
        "preco": 80,
        "cover": "https://kraken.ingresse.com/event/posters/92036/large/1781620538.9821115.jpg",
        "categoria": "eletronica",
        "tags": [
            "funk",
            "open bar",
            "festa"
        ]
    },
    {
        "id": "prainha",
        "titulo": "Prainha Club com Mr. Dan",
        "artista": "Mr. Dan",
        "data": "2026-06-29",
        "local": "Prainha",
        "cidade": "Rio de Janeiro",
        "preco": 70,
        "cover": "https://kraken.ingresse.com/event/posters/99266/large/1781100643.520255.jpg",
        "categoria": "festival",
        "tags": [
            "reggae",
            "pop",
            "praia"
        ]
    },
    {
        "id": "samba-bons",
        "titulo": "Samba Independente dos Bons Costumes",
        "data": "2026-07-02",
        "local": "Pedra do Sal",
        "cidade": "Rio de Janeiro",
        "preco": 40,
        "cover": "https://kraken.ingresse.com/event/posters/97574/large/1780073864.711198.jpg",
        "categoria": "sertanejo",
        "tags": [
            "samba",
            "pagode",
            "ao ar livre"
        ]
    },
    {
        "id": "encontrin",
        "titulo": "Encontrin das Quintas",
        "data": "2026-07-09",
        "local": "Quintal RJ",
        "cidade": "Rio de Janeiro",
        "preco": 0,
        "cover": "https://kraken.ingresse.com/event/posters/96274/large/1779478034.6552.jpg",
        "categoria": "sertanejo",
        "tags": [
            "pagode",
            "samba",
            "open bar"
        ]
    },
    {
        "id": "dominguinho",
        "titulo": "Turnê Dominguinho",
        "artista": "Jota.Pê, João Gomes, Mestrinho",
        "data": "2026-12-19",
        "local": "Classic Hall",
        "cidade": "Recife",
        "preco": 120,
        "categoria": "sertanejo",
        "tags": [
            "sertanejo",
            "forró",
            "ao ar livre"
        ]
    },
    {
        "id": "trap",
        "titulo": "Sem Medo · Trap Night",
        "artista": "MC Lørde, Dume",
        "data": "2026-06-26",
        "local": "Tokio Marine Hall",
        "cidade": "São Paulo",
        "preco": 110,
        "categoria": "rap",
        "tags": [
            "trap",
            "hip-hop",
            "drill"
        ]
    },
    {
        "id": "candle",
        "titulo": "Candlelight: Tributo ao Queen",
        "data": "2026-07-04",
        "local": "Teatro Santander",
        "cidade": "São Paulo",
        "preco": 130,
        "categoria": "teatro",
        "tags": [
            "clássico",
            "candlelight",
            "intimista"
        ]
    },
    {
        "id": "rock-roof",
        "titulo": "Rock in Roof",
        "artista": "Cassia & The Noise",
        "data": "2026-06-28",
        "local": "Mirante Vivo",
        "cidade": "São Paulo",
        "preco": 95,
        "categoria": "rock",
        "tags": [
            "rock",
            "indie",
            "ao ar livre"
        ]
    },
    {
        "id": "ideas",
        "titulo": "Ideas Come Alive",
        "artista": "João Martins",
        "data": "2026-07-18",
        "local": "Auditório Ibirapuera",
        "cidade": "São Paulo",
        "preco": 60,
        "categoria": "standup",
        "tags": [
            "palestra",
            "inovação"
        ]
    },
    {
        "id": "metal",
        "titulo": "Hellfire Open Air",
        "artista": "Vibra & convidados",
        "data": "2026-08-09",
        "local": "Arena Anhembi",
        "cidade": "São Paulo",
        "preco": 180,
        "categoria": "rock",
        "tags": [
            "metal",
            "rock",
            "ao ar livre"
        ]
    },
    {
        "id": "standup-noite",
        "titulo": "Stand-up: Noite de Outro Nível",
        "artista": "Leo Marçal",
        "data": "2026-07-02",
        "local": "Teatro Gazeta",
        "cidade": "São Paulo",
        "preco": 75,
        "categoria": "standup",
        "tags": [
            "comédia",
            "stand-up"
        ]
    },
    {
        "id": "nba",
        "titulo": "NBA Global Games",
        "data": "2026-10-10",
        "local": "Arena",
        "cidade": "São Paulo",
        "preco": 320,
        "categoria": "esportes",
        "tags": [
            "nba",
            "basquete"
        ]
    },
    {
        "id": "jazz",
        "titulo": "The Jazz Room: New Orleans",
        "data": "2026-07-08",
        "local": "Cine Theatro Brasil",
        "cidade": "Belo Horizonte",
        "preco": 82,
        "categoria": "teatro",
        "tags": [
            "jazz",
            "intimista"
        ]
    },
    {
        "id": "funk",
        "titulo": "Baile Eletrônico",
        "artista": "Departamento",
        "data": "2026-06-21",
        "local": "Laje SP",
        "cidade": "São Paulo",
        "preco": 40,
        "categoria": "eletronica",
        "tags": [
            "funk",
            "house"
        ]
    },
    {
        "id": "trap2",
        "titulo": "Drill Tape Live",
        "artista": "GMP",
        "data": "2026-08-01",
        "local": "Cine Joia",
        "cidade": "São Paulo",
        "preco": 85,
        "categoria": "rap",
        "tags": [
            "drill",
            "trap"
        ]
    }
];
