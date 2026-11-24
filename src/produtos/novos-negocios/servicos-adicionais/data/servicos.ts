import type { FC } from "react";
import festivalAurora from "../assets/festival-aurora.svg";
import gopTun from "../assets/gop-tun.svg";
import showPalco from "../assets/show-palco.svg";
import uberLogo from "../assets/uber-logo.svg";
import { IconlyCadeado, IconlyRemedio, IconlyCalendario, IconlyCamera, IconlyCarteira, IconlyComida, IconlyCartao, IconlyDesconto, IconlyEnviar, IconlyEscudo, IconlyImagem, IconlyRaio } from "../components/icones-iconly";

/**
 * Serviços adicionais — configuração das ofertas.
 *
 * Cada serviço é só dado: a mesma estrutura de página (contexto do evento, apresentação,
 * benefícios, seleção de valor, resumo e condições) monta qualquer oferta. Um serviço novo
 * (seguro, estacionamento, entrada expressa...) entra aqui sem tela nova, e a futura página
 * com vários serviços ("Checklist do Rolê") pode reaproveitar os mesmos blocos.
 *
 * TODOS os valores, descontos e condições são ILUSTRATIVOS — não são condições comerciais
 * confirmadas com os parceiros.
 */

export type ServicoId = "uber" | "uber-evento" | "meep" | "fotos" | "seguro" | "ressaca" | "guarda-volumes" | "protecao";

export interface Beneficio {
    icone: FC<{ className?: string }>;
    texto: string;
    /** Parte final do benefício que vira link e abre o modal de coberturas (Proteção de compra). */
    link?: string;
}

/** Ingresso que pode ser protegido (Proteção de compra): o preço é `percentual` do valor. */
export interface IngressoProtegivel {
    id: string;
    /** Nome do ingresso, como na lista da tela de ingressos. */
    nome: string;
    /** Pessoa a quem o ingresso está atribuído. */
    titular: string;
    valor: number;
}

/** Grupo de situações cobertas, no modal "O que a proteção cobre" (o mesmo de produção). */
export interface GrupoCobertura {
    titulo: string;
    itens: string[];
}

export interface Servico {
    id: ServicoId;
    parceiro: string;
    /** Logo oficial do parceiro; sem ela, a página usa o selo provisório com o nome. */
    logo?: string;
    /** Símbolo oficial colorido do parceiro (ex.: Meep), em selo claro com borda, sem inverter as cores. */
    simbolo?: string;
    /** Sem logo de parceiro: ícone no selo, no lugar do nome (ex.: câmera nas fotos). */
    iconeSelo?: FC<{ className?: string }>;
    /** Cor de fundo do selo com ícone (classe de token). */
    corSelo?: string;
    categoria: string;
    /**
     * Linha da marca na oferta, no lugar de parceiro + categoria: o que se compra e um selo curto
     * (ex.: "Crédito Uber" + "5% off"), para não repetir a marca e já mostrar o desconto.
     */
    marca?: { nome: string; selo?: string };
    /** Serviço que só existe dentro de um evento (Meep): a oferta mostra o evento no lugar do mosaico. */
    evento?: boolean;
    /** Título da oferta. `chamada` vem na linha de baixo e termina no `destaque`, em cor de marca. */
    titulo: string;
    chamada?: string;
    destaque?: string;
    /** Legenda curta abaixo do título, só quando acrescenta informação. */
    legenda?: string;
    descricao: string;
    beneficios: Beneficio[];
    /** Destaca o primeiro benefício (o desconto) acima dos outros. */
    beneficioPrincipal?: boolean;
    pergunta: string;
    /** Nome do que se compra, usado no resumo ("Crédito Uber", "Saldo Meep"). */
    item: string;
    valores: number[];
    /** Valor que já vem selecionado, com um selo de prova social em cima (ex.: 100 + "Mais escolhido"). */
    valorDestaque?: { valor: number; selo: string };
    /** Nome de cada opção quando não é crédito, e sim um pacote (ex.: 49 → "15 fotos"). */
    pacotes?: Record<number, string>;
    /** Fração de desconto sobre o valor (0.05 = 5%). 0 = sem desconto. */
    desconto: number;
    /** Mostra a opção "Outro valor" (serviços de crédito ou recarga: Uber e Meep; pacotes não têm). */
    outroValor: boolean;
    minimo: number;
    maximo: number;
    cta: string;
    /** Com valor escolhido, o CTA vira este texto + o preço ("Comprar por R$ 47,50"); antes, fica `cta`. */
    ctaComPreco?: string;
    /**
     * Compartilhar a oferta: botão só com ícone na linha da marca (`rotulo` = tooltip/leitor de
     * tela), que abre modal (desktop) ou bottom sheet (mobile) com `titulo` e `legenda`.
     * `mensagem` vai antes do link no WhatsApp e em "Mais opções" (provisória).
     */
    compartilhar?: { rotulo: string; titulo: string; legenda: string; mensagem: string };
    /**
     * Proteção de compra: no lugar dos valores, a pessoa escolhe quais ingressos proteger. Cada um
     * custa `percentual` do próprio valor (0.1 = 10%, configurável por evento).
     */
    ingressos?: IngressoProtegivel[];
    percentual?: number;
    /** Situações cobertas, abertas pelo link do benefício (`Beneficio.link`). */
    coberturas?: { titulo: string; descricao: string; grupos: GrupoCobertura[] };
    /** Aviso curto exibido junto da seleção de valor. */
    aviso?: string;
    condicoes: string[];
    /** Conta que recebe o crédito, mostrada no checkout. */
    destino: { rotulo: string; valor: string };
    parcelamento?: string;
    confirmacao: { titulo: string; descricao: string; passos?: string[] };
    /**
     * Resgate por código + link do app do parceiro (Uber). As duas são alternativas, não etapas:
     * usar uma invalida a outra. No protótipo o código é ilustrativo e a ativação é simulada.
     */
    /** Passo a passo do resgate manual vem depois do CTA; o título muda no celular (alternativa ao botão) e no desktop. */
    resgate?: { cta: string; link: string; passosTitulo: string; passosTituloDesktop: string; passos: string[] };
}

/** Evento mostrado no hub e nas ofertas de evento. Sem pôster, o card usa o degradê `fundo`. */
export interface Evento {
    nome: string;
    /** Nome sem o ano, para títulos curtos (a data já aparece no card do evento). */
    nomeCurto: string;
    /** Nome curto já com a preposição certa, para títulos ("Tem mais pra viver no Aurora"); evita erro de gênero ("no Anitta"). */
    noEvento: string;
    /** "pro Festival Aurora", "pro Gop Tun": textos de ida ("O melhor jeito de ir pro…"). */
    proEvento: string;
    /** "do Festival Aurora", "do Gop Tun": textos de volta ("ir e voltar do…"). */
    doEvento: string;
    dataLabel: string;
    /** Data curta do nome dos ingressos ("Festival Aurora | Pista | (28/11)"). */
    dataCurta?: string;
    local: string;
    dataCompleta: string;
    /** Contagem até o evento; sem ela (evento sem data futura no mock), o selo não aparece. */
    contagem?: string;
    /** Tipo do evento: define a palavra de {categoria} nos textos do Prepare seu rolê. */
    categoria: "festival" | "show" | "futebol";
    /** Arte larga: fundo desfocado do header. */
    cover?: string;
    /** Pôster 3:4 do card do evento. */
    poster?: string;
    /** Degradê do evento (CSS), quando não há pôster. */
    fundo?: string;
}

export const EVENTO = {
    nome: "Festival Aurora 2026",
    /** Nome sem o ano, para títulos curtos (a data já aparece no card do evento). */
    nomeCurto: "Festival Aurora",
    /** Nome curto já com a preposição certa, para títulos ("Tem mais pra viver no Aurora"); evita erro de gênero ("no Anitta"). */
    noEvento: "no Aurora",
    proEvento: "pro Festival Aurora",
    doEvento: "do Festival Aurora",
    dataLabel: "Sáb, 28 nov · 16h",
    dataCurta: "28/11",
    local: "Parque Villa-Lobos, São Paulo",
    dataCompleta: "Sábado, 28 de novembro de 2026 · 16h",
    contagem: "Faltam 10 dias",
    categoria: "festival" as Evento["categoria"],
    /** Arte larga: fundo desfocado do header. */
    cover: showPalco,
    /** Pôster 3:4 do card do evento. */
    poster: festivalAurora,
};

/** Gop Tun Festival 2026 (mesmo evento das Carteiras), com capa ilustrativa (arte original, não a oficial). */
export const GOP_TUN: Evento = {
    nome: "Gop Tun Festival 2026",
    nomeCurto: "Gop Tun",
    noEvento: "no Gop Tun",
    proEvento: "pro Gop Tun",
    doEvento: "do Gop Tun",
    dataLabel: "Sáb, 11 abr · 16h",
    dataCurta: "11/04",
    local: "Audio, São Paulo",
    dataCompleta: "Sábado, 11 de abril de 2026 · 16h",
    // Fictício, como o resto do protótipo: a contagem não acompanha a data do mock
    contagem: "Faltam 10 dias",
    categoria: "festival",
    poster: gopTun,
};

/**
 * Hub por evento (?evento= na rota /checklist): o evento e os serviços disponíveis nele. Cada
 * evento tem os seus; o hub só mostra os que estão aqui. Aberto pelo hub, todo serviço é do evento
 * (a página da oferta mostra o evento e os textos trocam {evento}, {proEvento} etc.).
 */
export const HUBS: Record<string, { evento: Evento; servicos: ServicoId[] }> = {
    "festival-aurora": { evento: EVENTO, servicos: ["protecao", "seguro", "uber-evento", "ressaca", "meep", "guarda-volumes", "fotos"] },
    "gop-tun": { evento: GOP_TUN, servicos: ["protecao", "seguro", "uber-evento", "ressaca", "meep", "guarda-volumes", "fotos"] },
};
/** Evento do hub quando o endereço não diz qual: o Gop Tun (o Aurora segue em ?evento=festival-aurora). */
export const HUB_PADRAO = "gop-tun";

export const USUARIO = { nome: "Mariana Costa", email: "mariana.costa@email.com", cpf: "***.482.317-**" };

/** Crédito Uber genérico: sem vínculo com evento (mosaico de fotos e copy de rolê em geral). */
const UBER: Servico = {
    id: "uber",
    parceiro: "Uber",
    logo: uberLogo,
    categoria: "Transporte",
    marca: { nome: "Crédito\u00a0Uber", selo: "5% off" },
    titulo: "Menos na corrida, mais pro rolê",
    legenda: "Compre crédito\u00a0Uber com desconto e aproveite o rolê do começo ao fim com segurança.",
    descricao: "Compre créditos para usar em viagens pelo app da Uber.",
    beneficios: [
        { icone: IconlyDesconto, texto: "R$ 5 de desconto a cada R$ 100" },
        { icone: IconlyCartao, texto: "Pague no Pix ou parcele no cartão" },
    ],
    pergunta: "Escolha o valor do crédito",
    item: "Crédito\u00a0Uber",
    valores: [50, 100, 150],
    // Teste: o valor do meio já vem selecionado. "Mais escolhido" é ilustrativo até termos o dado
    valorDestaque: { valor: 100, selo: "Mais escolhido" },
    desconto: 0.05,
    outroValor: true,
    minimo: 20,
    maximo: 500,
    cta: "Comprar crédito\u00a0Uber",
    compartilhar: {
        rotulo: "Compartilhar com a galera",
        titulo: "Coisa boa a gente divide",
        legenda: "Manda pra quem vai com você. Todo mundo pode comprar crédito\u00a0Uber com 5% off.",
        mensagem: "Achei crédito\u00a0Uber com 5% de desconto na Ingresse. Dá uma olhada:",
    },
    condicoes: [
        "O crédito vai para a conta Uber ligada ao seu e-mail.",
        "Válido por 30 dias depois da compra, em viagens dentro do Brasil.",
        "Não pode ser trocado por dinheiro nem transferido para outra conta.",
    ],
    destino: { rotulo: "Conta Uber que recebe o crédito", valor: USUARIO.email },
    parcelamento: "em até 2x sem juros no cartão",
    confirmacao: {
        titulo: "Tudo certo com seu crédito\u00a0Uber",
        // Aceita {valor} (valor do crédito); aqui não usa, porque o valor já aparece no resumo logo abaixo
        descricao: "Agora é só ativar com o código abaixo no app da Uber.",
    },
    resgate: {
        cta: "Ativar crédito na Uber",
        // Ilustrativo: na integração, vem o link de resgate do crédito comprado
        link: "https://m.uber.com/ul/?action=applyPromo",
        passosTitulo: "Resgate direto no app da Uber",
        passosTituloDesktop: "Como resgatar no app da Uber",
        passos: ["Copie o código acima", "No app da Uber, abra Conta e toque em Carteira", "Toque em Adicionar saldo e depois em Gift Card", "Cole o código e toque em Adicionar"],
    },
};

export const SERVICOS: Record<ServicoId, Servico> = {
    uber: UBER,
    // Crédito Uber ligado a um evento: mesma oferta e o mesmo resgate, com o evento no lugar do
    // mosaico (como a Meep) e a copy puxando a ida e a volta daquele evento
    "uber-evento": {
        ...UBER,
        id: "uber-evento",
        categoria: "Transporte para o evento",
        evento: true,
        titulo: "O melhor jeito de ir {proEvento}",
        legenda: "Pague menos e vá e volte sem se preocupar.",
        descricao: "Crédito\u00a0Uber com desconto para ir e voltar {doEvento}.",
        compartilhar: {
            rotulo: "Compartilhar com a galera",
            titulo: "Coisa boa a gente divide",
            legenda: "Manda pra quem vai com você {proEvento}. Todo mundo pode comprar crédito\u00a0Uber com 5% off.",
            mensagem: "Achei crédito\u00a0Uber com 5% de desconto na Ingresse pra ir {proEvento}. Dá uma olhada:",
        },
    },
    meep: {
        id: "meep",
        parceiro: "Meep",
        // Sem o logo da Meep (marca pouco conhecida): o selo mostra comida, que diz pra que serve o saldo
        iconeSelo: IconlyComida,
        corSelo: "bg-utility-orange-600",
        categoria: "Comida e bebida no evento",
        marca: { nome: "Consumo antecipado" },
        evento: true,
        titulo: "Chegue com saldo pra comer e beber",
        legenda: "Compre antes de sair de casa e use nos bares e comidas {doEvento}.",
        descricao: "Compre antes de sair de casa o saldo pra comer e beber no evento.",
        beneficios: [
            { icone: IconlyComida, texto: "Use nos bares, comidas e lojas" },
            { icone: IconlyCarteira, texto: "Você decide quanto vai gastar" },
        ],
        pergunta: "Quanto você quer de saldo?",
        item: "Saldo pra comer e beber",
        valores: [50, 100, 150],
        valorDestaque: { valor: 100, selo: "Mais escolhido" },
        desconto: 0,
        outroValor: true,
        minimo: 10,
        maximo: 1000,
        cta: "Comprar meu saldo",
        compartilhar: {
            rotulo: "Compartilhar com a galera",
            titulo: "Avisa quem vai com você",
            legenda: "Assim todo mundo chega com saldo pra comer e beber {noEvento}.",
            mensagem: "Dá pra comprar saldo pra comer e beber {noEvento} por aqui:",
        },
        aviso: "O que sobrar do saldo pode ser devolvido depois do evento.",
        condicoes: [
            "Use o saldo pra comprar comida e bebida {noEvento}.",
            "No evento, informe seu CPF em qualquer caixa e retire o cartão com o saldo.",
            "Pedidos de devolução do saldo seguem as regras e prazos da Meep.",
        ],
        destino: { rotulo: "CPF pra retirar o cartão no evento", valor: USUARIO.cpf },
        confirmacao: {
            titulo: "Tudo certo com seu saldo",
            // A pessoa já tem o saldo: no evento, o CPF em qualquer caixa retira o cartão carregado
            descricao: "Você já tem saldo pra comer e beber {noEvento}. Pra usar, é só retirar o cartão em qualquer caixa.",
            passos: [
                "No evento, vá a qualquer caixa e informe seu CPF.",
                "Retire o cartão, que já vem com o seu saldo.",
                "Use nos bares e comidas e acompanhe o saldo pelo app da Meep.",
            ],
        },
    },
    // Proteção de compra: vendida no checkout do ingresso e, como serviço adicional, depois da compra
    // (Figma "Serviço adicional: Proteção de compra"). Preço e regras ILUSTRATIVOS: 10% de cada ingresso,
    // reembolso de 100% do valor do ingresso em imprevistos cobertos, cada pedido analisado.
    protecao: {
        id: "protecao",
        parceiro: "Proteção de compra",
        iconeSelo: IconlyEscudo,
        corSelo: "bg-utility-indigo-600",
        categoria: "Reembolso",
        marca: { nome: "Proteção de compra" },
        evento: true,
        titulo: "Se não der pra ir, o dinheiro volta",
        legenda: "Proteja seus ingressos {doEvento} e receba 100% do valor de volta se um imprevisto te impedir de ir.",
        descricao: "Proteja seus ingressos e receba 100% do valor de volta se um imprevisto te impedir de ir.",
        beneficios: [
            { icone: IconlyCarteira, texto: "Reembolso de 100% do valor do ingresso" },
            { icone: IconlyEscudo, texto: "Cobre vários imprevistos.", link: "Veja\u00a0quais" },
        ],
        pergunta: "Quais ingressos você quer proteger?",
        item: "Proteção de compra",
        valores: [],
        ingressos: [
            // Nome como na tela de ingressos: evento | setor | (data)
            { id: "pista-1", nome: "{nomeCurto} | Pista | ({dataCurta})", titular: "Camila Ferreira Rocha", valor: 240 },
            { id: "pista-2", nome: "{nomeCurto} | Pista Premium | ({dataCurta})", titular: "Mariana Costa", valor: 240 },
        ],
        percentual: 0.1,
        desconto: 0,
        outroValor: false,
        minimo: 0,
        maximo: 0,
        cta: "Proteger meus ingressos",
        ctaComPreco: "Proteger por",
        compartilhar: {
            rotulo: "Compartilhar com a galera",
            titulo: "Avisa quem vai com você",
            legenda: "Assim todo mundo protege o ingresso {doEvento} contra imprevistos.",
            mensagem: "Dá pra proteger o ingresso {doEvento} contra imprevistos por aqui:",
        },
        coberturas: {
            titulo: "O que a proteção cobre",
            descricao: "Se uma destas situações te impedir de ir ao evento, você pode pedir o reembolso. Cada pedido é analisado conforme as regras da proteção.",
            grupos: [
                { titulo: "Saúde", itens: ["Acidente, doença ou lesão", "Condição médica preexistente", "Infecção por COVID-19 e isolamento"] },
                { titulo: "Imprevistos no caminho", itens: ["Falha no transporte público", "Falha de veículo privado"] },
                { titulo: "Emergências em casa", itens: ["Emergência doméstica", "Chamada de serviços de emergência"] },
                { titulo: "Documentos e questões judiciais", itens: ["Roubo de documentos", "Intimação judicial"] },
            ],
        },
        condicoes: [
            "A proteção custa 10% do valor de cada ingresso protegido.",
            "Se um imprevisto coberto te impedir de ir, peça o reembolso em Minhas Compras.",
            "Cada pedido de reembolso é analisado conforme as regras da proteção.",
        ],
        destino: { rotulo: "Pedido de reembolso", valor: "Em Minhas Compras, se precisar" },
        confirmacao: {
            titulo: "Tudo certo com sua\u00a0proteção",
            descricao: "Seus ingressos {doEvento} estão protegidos. Agora é só curtir.",
            passos: [
                "Se não puder ir, abra o pedido em Minhas Compras.",
                "Toque em \u201cPedir reembolso\u201d e conte o que aconteceu.",
                "Depois da análise, o valor dos ingressos volta pra você.",
            ],
        },
    },
    fotos: {
        id: "fotos",
        parceiro: "Fotos do rolê",
        iconeSelo: IconlyCamera,
        corSelo: "bg-utility-purple-600",
        categoria: "Fotografia",
        titulo: "Curta. As fotos {doEvento} vêm depois",
        legenda: "Fotógrafos profissionais circulam pelo evento e você encontra as suas com uma selfie.",
        descricao: "Fique com as fotos que os fotógrafos fizerem de você {noEvento}.",
        beneficios: [
            { icone: IconlyCamera, texto: "Fotógrafos profissionais circulando no evento" },
            { icone: IconlyImagem, texto: "Fotos em alta, sem marca d'água" },
            { icone: IconlyEnviar, texto: "Receba por e-mail em até 48 horas" },
        ],
        pergunta: "Escolha o pacote",
        item: "Fotos do rolê",
        valores: [29, 49, 79],
        pacotes: { 29: "5 fotos", 49: "15 fotos", 79: "Todas as fotos" },
        desconto: 0,
        outroValor: false,
        minimo: 29,
        maximo: 79,
        cta: "Garantir minhas fotos",
        condicoes: [
            "Depois da compra, envie uma selfie pra encontrarmos suas fotos.",
            "As fotos chegam por e-mail em até 48h depois {doEvento}.",
            "Se nenhuma foto sua for encontrada, o valor é devolvido.",
        ],
        destino: { rotulo: "E-mail que recebe as fotos", valor: USUARIO.email },
        confirmacao: {
            titulo: "Seu pacote de fotos tá garantido",
            descricao: "Envie sua selfie e receba as fotos {doEvento} por e-mail em até 48h depois do evento.",
            passos: ["Envie uma selfie pelo link que mandamos por e-mail para encontrarmos suas fotos.", "Em até 48 horas depois do evento, as fotos chegam no seu e-mail."],
        },
    },
    seguro: {
        id: "seguro",
        parceiro: "Seguro de celular",
        iconeSelo: IconlyEscudo,
        corSelo: "bg-utility-blue-600",
        categoria: "Proteção",
        titulo: "Celular no seguro, cabeça {noEvento}",
        legenda: "Seguro contra roubo e furto, do dia do evento até 7 dias depois.",
        descricao: "Contrate um seguro de celular pensado pro dia {doEvento}.",
        beneficios: [
            { icone: IconlyEscudo, texto: "Cobertura contra roubo e furto" },
            { icone: IconlyCalendario, texto: "Proteção do dia do evento até 7 dias depois" },
            { icone: IconlyRaio, texto: "Contratação na hora, sem vistoria" },
        ],
        pergunta: "Escolha a proteção",
        item: "Seguro de celular",
        valores: [19, 29, 39],
        pacotes: { 19: "Roubo", 29: "Roubo e furto", 39: "Completo" },
        desconto: 0,
        outroValor: false,
        minimo: 19,
        maximo: 39,
        cta: "Proteger meu celular",
        condicoes: [
            "A cobertura vale do dia {doEvento} até 7 dias depois.",
            "O plano Completo também cobre quebra acidental da tela.",
            "Se precisar acionar o seguro, abra o pedido em até 48 horas pelo e-mail que enviamos.",
        ],
        destino: { rotulo: "E-mail da apólice", valor: USUARIO.email },
        confirmacao: {
            titulo: "Celular no seguro {proEvento}",
            descricao: "A apólice foi enviada pro seu e-mail.",
            passos: ["Guarde o e-mail com a apólice: ele traz o número do seguro.", "Se algo acontecer, abra o pedido em até 48 horas pelo link do e-mail."],
        },
    },
    // Ilustrativo: marca fictícia, para ver o hub com mais serviços. Remédio isento de prescrição tem
    // regras de publicidade (Anvisa) e a venda pode exigir farmácia parceira: validar antes de sair do protótipo.
    ressaca: {
        id: "ressaca",
        parceiro: "Amanhã",
        iconeSelo: IconlyRemedio,
        corSelo: "bg-utility-emerald-600",
        categoria: "Cuidado pós-evento",
        titulo: "Pensando no dia depois {doEvento}?",
        descricao: "Compre pelo app e retire no posto Amanhã, perto da saída {doEvento}, quando for embora.",
        beneficios: [
            { icone: IconlyRemedio, texto: "Retirada no posto perto da saída" },
            { icone: IconlyCartao, texto: "Pagamento já feito pelo app" },
            { icone: IconlyCalendario, texto: "Pacotes de 1, 2 ou 4 doses" },
        ],
        pergunta: "Quantas doses você quer levar?",
        item: "Remédio Amanhã",
        valores: [15, 25, 45],
        pacotes: { 15: "1 dose", 25: "Kit 2 doses", 45: "Kit 4 doses" },
        desconto: 0,
        outroValor: false,
        minimo: 15,
        maximo: 45,
        cta: "Comprar remédio",
        condicoes: [
            "Retirada só no dia {doEvento}, no posto Amanhã perto da saída, com o código.",
            "Leia a bula e use conforme orientação. Se os sintomas persistirem, procure um médico.",
        ],
        destino: { rotulo: "E-mail que recebe o código de retirada", valor: USUARIO.email },
        confirmacao: {
            titulo: "Seu kit pro dia seguinte tá separado",
            descricao: `Na saída {doEvento}, mostre o código no posto Amanhã. Enviamos o código pra ${USUARIO.email}.`,
            passos: ["Na saída do evento, vá ao posto Amanhã.", "Mostre o código e retire seu kit."],
        },
    },
    // Ilustrativo: marca fictícia; regras de uso do armário (reabrir, horário) não definidas.
    "guarda-volumes": {
        id: "guarda-volumes",
        parceiro: "Tranca",
        iconeSelo: IconlyCadeado,
        corSelo: "bg-utility-amber-600",
        categoria: "Guarda-volumes",
        titulo: "Mãos livres {noEvento}",
        descricao: "Reserve um armário antes e retire a chave ou o código no guarda-volumes Tranca, no dia {doEvento}.",
        beneficios: [
            { icone: IconlyCadeado, texto: "Armário garantido antes de chegar" },
            { icone: IconlyCalendario, texto: "Vale pelo dia inteiro do evento" },
            { icone: IconlyRaio, texto: "Tamanhos P, M e G pro que você levar" },
        ],
        pergunta: "Qual tamanho de armário você quer?",
        item: "Guarda-volumes",
        valores: [30, 45, 60],
        pacotes: { 30: "Armário P", 45: "Armário M", 60: "Armário G" },
        desconto: 0,
        outroValor: false,
        minimo: 30,
        maximo: 60,
        cta: "Reservar armário",
        condicoes: [
            "Retire a chave ou o código no guarda-volumes mostrando sua reserva.",
            "Retire seus itens até o fim {doEvento}.",
            "Itens proibidos {noEvento} também não podem ser guardados.",
        ],
        destino: { rotulo: "E-mail que recebe a reserva", valor: USUARIO.email },
        confirmacao: {
            titulo: "Armário reservado {proEvento}!",
            descricao: `Enviamos a reserva pra ${USUARIO.email}. Ao chegar {noEvento}, mostre a reserva na Tranca.`,
            passos: ["Ao chegar, vá ao guarda-volumes Tranca.", "Mostre a reserva e retire a chave ou o código."],
        },
    },
};

/** Ofertas com página própria (cada uma aberta pelo link de uma comunicação). */
export const INDIVIDUAIS: ServicoId[] = ["uber", "uber-evento", "meep", "protecao"];

/**
 * Prepare seu rolê (rota /checklist): os serviços de UM evento, a partir do ingresso. Agrupados
 * pelo momento do dia, sem numeração (não é tarefa). O título de cada card puxa pelo benefício, em
 * tom de conversa; o apoio e o selo identificam o serviço. Depois de contratado, vira `status`.
 * `{valor}`, `{pacote}`, `{desconto}`, `{evento}`, `{noEvento}` ("no Aurora"), `{tipo}` (festival, show ou jogo) e `{categoria}` (festival, show ou estádio) são
 * trocados na tela. Os títulos das seções são neutros, iguais para festival, show e futebol.
 */
export interface ServicoRole {
    id: ServicoId;
    titulo: string;
    apoio: string;
    /** Nome acessível do card. */
    rotulo: string;
    /** Outros serviços que ocupam este card quando o evento não tem o principal (ex.: Uber geral no lugar da do evento). */
    equivalentes?: ServicoId[];
    /**
     * Benefício comercial em destaque (selo verde ao lado do título), só quando existe de verdade
     * (ex.: o desconto da Uber, "{desconto} off", lido da oferta). Os outros cards não têm selo.
     */
    destaque?: string;
    /** Depois de contratar; `rotulo` é o nome acessível do card nesse estado. */
    status: { titulo: string; apoio: string; acao: string; rotulo: string };
}

export const ROLE = {
    titulo: "Tem mais pra viver {noEvento}",
    /** Emoji de festa depois do título (decorativo, escondido do leitor de tela). */
    emoji: "🎉",
    apoio: "A parte mais difícil já foi: garantir o ingresso. Agora vem a parte boa.",
    voltar: "Ver outros serviços",
    /** Compartilhar o hub com quem vai junto (mesmo padrão das ofertas, SAD-08). */
    compartilhar: {
        rotulo: "Compartilhar com a galera",
        titulo: "Passa a dica pra galera",
        legenda: "Manda pra quem vai com você. Cada um escolhe e contrata o que quiser {noEvento}.",
        mensagem: "Olha o que dá pra deixar resolvido {proEvento}. Cada um contrata o que quiser, vê aí 👇",
    },
    momentos: [
        {
            id: "antes",
            titulo: "Antes do grande dia",
            servicos: [
                {
                    id: "protecao",
                    titulo: "Se não der pra ir, o dinheiro volta",
                    apoio: "Proteja sua compra de imprevistos",
                    rotulo: "Ver oferta de proteção de compra dos ingressos",
                    status: { titulo: "Ingressos protegidos", apoio: "{valor} · reembolso em Minhas Compras", acao: "Ver detalhes", rotulo: "Proteção de compra contratada. Ver detalhes" },
                },
                {
                    id: "seguro",
                    titulo: "Mais tranquilidade pra curtir",
                    apoio: "Seguro de celular contra roubo e furto",
                    rotulo: "Ver oferta de seguro de celular contra roubo e furto",
                    status: { titulo: "Celular no seguro, pode curtir", apoio: "{pacote} · de 28/11 a 5/12", acao: "Ver detalhes", rotulo: "Seguro de celular contratado. Ver detalhes" },
                },
            ],
        },
        {
            id: "caminho",
            titulo: "Na ida e na volta",
            servicos: [
                {
                    id: "uber-evento",
                    // Em evento sem a oferta da Uber do evento, o card abre a oferta geral
                    equivalentes: ["uber"],
                    titulo: "Economize no caminho pro {categoria}",
                    apoio: "Compre crédito\u00a0Uber com desconto",
                    rotulo: "Ver oferta de crédito Uber com {desconto} de desconto",
                    destaque: "{desconto} off",
                    status: { titulo: "Crédito comprado! É só resgatar", apoio: "{valor} · o código tá na confirmação", acao: "Ver código", rotulo: "Crédito Uber de {valor} comprado. Ver código" },
                },
                {
                    id: "ressaca",
                    titulo: "Pensando no dia seguinte?",
                    apoio: "Remédio Amanhã, retirado na saída",
                    rotulo: "Ver oferta do remédio Amanhã, com retirada na saída do evento",
                    status: { titulo: "Kit separado pro dia seguinte", apoio: "{pacote} · retire no posto da saída", acao: "Ver código", rotulo: "Remédio Amanhã comprado. Ver código de retirada" },
                },
            ],
        },
        {
            id: "evento",
            titulo: "Hora de aproveitar",
            servicos: [
                {
                    id: "meep",
                    titulo: "Chegue com saldo pra comer e beber",
                    apoio: "Consumo antecipado",
                    rotulo: "Ver oferta de saldo pra comer e beber",
                    status: { titulo: "Saldo pronto pro {categoria}!", apoio: "{valor} pra comer e beber", acao: "Ver saldo", rotulo: "Saldo de {valor} pra comer e beber comprado. Ver saldo" },
                },
                {
                    id: "guarda-volumes",
                    titulo: "Mochila guardada, mãos livres",
                    apoio: "Guarda-volumes com reserva antecipada",
                    rotulo: "Ver oferta de guarda-volumes com reserva antecipada",
                    status: { titulo: "Armário reservado, pode ir leve", apoio: "{pacote} · reserva no seu e-mail", acao: "Ver reserva", rotulo: "Armário reservado. Ver reserva" },
                },
                {
                    id: "fotos",
                    titulo: "Viva o evento. As fotos vêm depois.",
                    apoio: "Fotos profissionais, achadas por selfie",
                    rotulo: "Ver oferta de fotos profissionais do {categoria}",
                    // O protótipo não sabe se a selfie já foi enviada: mostra o passo que falta (está na confirmação)
                    status: { titulo: "Falta só a sua selfie", apoio: "Ela é usada pra encontrar suas fotos", acao: "Enviar selfie", rotulo: "Pacote de fotos comprado. Enviar selfie" },
                },
            ],
        },
    ] satisfies { id: string; titulo: string; servicos: ServicoRole[] }[],
};

/** Serviços do Prepare seu rolê, na ordem dos momentos. Cada um abre a própria página de contratação. */
export const CHECKLIST: ServicoId[] = ROLE.momentos.flatMap((m) => m.servicos.map((s) => s.id));

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor a pagar depois do desconto, arredondado em centavos. */
export const valorFinal = (servico: Servico, valor: number) => Math.round(valor * (1 - servico.desconto) * 100) / 100;

/** Troca os campos do evento ({evento}, {nomeCurto}, {noEvento}, {proEvento}, {doEvento}) num texto. */
export const textoDoEvento = (texto: string, evento: Evento) =>
    texto
        .replace(/\{evento\}/g, evento.nome)
        .replace(/\{nomeCurto\}/g, evento.nomeCurto)
        .replace(/\{noEvento\}/g, evento.noEvento)
        .replace(/\{proEvento\}/g, evento.proEvento)
        .replace(/\{doEvento\}/g, evento.doEvento)
        .replace(/\{dataCurta\}/g, evento.dataCurta ?? "");

/** O serviço com os textos já do evento (todas as strings, inclusive condições, confirmação e compartilhar). */
export function servicoNoEvento(servico: Servico, evento: Evento): Servico {
    const troca = (v: unknown): unknown =>
        typeof v === "string" ? textoDoEvento(v, evento) : Array.isArray(v) ? v.map(troca) : v && typeof v === "object" && !("$$typeof" in v) && typeof v !== "function" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "function" ? x : troca(x)])) : v;
    return troca(servico) as Servico;
}
