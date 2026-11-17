import type { FC } from "react";
import festivalAurora from "../assets/festival-aurora.svg";
import showPalco from "../assets/show-palco.svg";
import meepSimbolo from "../assets/meep-simbolo.png";
import uberLogo from "../assets/uber-logo.svg";
import { IconlyCalendario, IconlyCamera, IconlyCarteira, IconlyComida, IconlyCartao, IconlyDesconto, IconlyEnviar, IconlyEscudo, IconlyImagem, IconlyRaio } from "../components/icones-iconly";

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

export type ServicoId = "uber" | "uber-evento" | "meep" | "fotos" | "seguro";

export interface Beneficio {
    icone: FC<{ className?: string }>;
    texto: string;
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

export const EVENTO = {
    nome: "Festival Aurora 2026",
    /** Nome sem o ano, para títulos curtos (a data já aparece no card do evento). */
    nomeCurto: "Festival Aurora",
    dataLabel: "Sáb, 12 dez · 16h",
    local: "Parque Villa-Lobos, São Paulo",
    dataCompleta: "Sábado, 12 de dezembro de 2026 · 16h",
    contagem: "Faltam 3 dias",
    /** Arte larga: fundo desfocado do header. */
    cover: showPalco,
    /** Pôster 3:4 do card do evento. */
    poster: festivalAurora,
};

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
        titulo: `O melhor jeito de ir pro ${EVENTO.nomeCurto}`,
        legenda: "Pague menos e vá e volte sem se preocupar.",
        descricao: `Crédito\u00a0Uber com desconto para ir e voltar do ${EVENTO.nome}.`,
        compartilhar: {
            rotulo: "Compartilhar com a galera",
            titulo: "Coisa boa a gente divide",
            legenda: `Manda pra quem vai com você pro ${EVENTO.nome}. Todo mundo pode comprar crédito\u00a0Uber com 5% off.`,
            mensagem: `Achei crédito\u00a0Uber com 5% de desconto na Ingresse pra ir pro ${EVENTO.nome}. Dá uma olhada:`,
        },
    },
    meep: {
        id: "meep",
        parceiro: "Meep",
        simbolo: meepSimbolo,
        categoria: "Consumo no evento",
        marca: { nome: "Consumo antecipado Meep" },
        evento: true,
        titulo: "Menos filas, mais rolê",
        legenda: "Recarregue antes de sair de casa e chegue só pra curtir.",
        descricao: "Antecipe sua recarga e use o saldo para consumir no evento.",
        beneficios: [
            { icone: IconlyComida, texto: "Use nos bares, comidas e lojas" },
            { icone: IconlyCarteira, texto: "Você decide quanto vai gastar" },
        ],
        pergunta: "Quanto deseja recarregar?",
        item: "Saldo Meep",
        valores: [50, 100, 150],
        valorDestaque: { valor: 100, selo: "Mais escolhido" },
        desconto: 0,
        outroValor: true,
        minimo: 10,
        maximo: 1000,
        cta: "Carregar meu saldo",
        compartilhar: {
            rotulo: "Compartilhar com a galera",
            titulo: "Avisa quem vai com você",
            legenda: `Assim todo mundo antecipa a recarga pro ${EVENTO.nome}.`,
            mensagem: `Dá pra antecipar a recarga pro ${EVENTO.nome} por aqui:`,
        },
        aviso: "O que sobrar do saldo pode ser devolvido depois do evento.",
        condicoes: [
            `Use o saldo para consumir no ${EVENTO.nome}.`,
            "Você usa o saldo com um cartão ou uma pulseira, conforme o formato do evento.",
            "Pedidos de devolução do saldo seguem as regras e prazos da Meep.",
        ],
        destino: { rotulo: "CPF do cadastro Meep", valor: USUARIO.cpf },
        confirmacao: {
            titulo: "Tudo certo com seu saldo",
            descricao: `Agora é só usar seu saldo no ${EVENTO.nome}.`,
            passos: ["Use o saldo com um cartão ou uma pulseira, conforme o formato do evento.", "Acompanhe o saldo pelo app da Meep."],
        },
    },
    fotos: {
        id: "fotos",
        parceiro: "Fotos do rolê",
        iconeSelo: IconlyCamera,
        corSelo: "bg-utility-purple-600",
        categoria: "Fotografia",
        titulo: "Suas fotos do rolê, feitas por fotógrafos profissionais",
        descricao: "Garanta as fotos que os fotógrafos fizerem de você durante o evento.",
        beneficios: [
            { icone: IconlyCamera, texto: "Fotógrafos profissionais circulando no evento" },
            { icone: IconlyImagem, texto: "Fotos em alta, sem marca d'água" },
            { icone: IconlyEnviar, texto: "Receba por e-mail em até 48 horas" },
        ],
        pergunta: "Escolha o pacote",
        item: "Fotos do rolê",
        valores: [29, 49, 79],
        pacotes: { 29: "5 fotos", 49: "15 fotos", 79: "Todas as suas" },
        desconto: 0,
        outroValor: false,
        minimo: 29,
        maximo: 79,
        cta: "Garantir minhas fotos",
        condicoes: [
            "As fotos são encontradas por reconhecimento facial a partir da selfie enviada depois da compra.",
            "Se nenhuma foto sua for encontrada, o valor é devolvido.",
        ],
        destino: { rotulo: "E-mail que recebe as fotos", valor: USUARIO.email },
        confirmacao: {
            titulo: "Fotos garantidas",
            descricao: "Depois do evento, enviamos suas fotos por e-mail.",
            passos: ["Envie uma selfie pelo link que mandamos por e-mail para encontrarmos suas fotos.", "Em até 48 horas depois do evento, as fotos chegam no seu e-mail."],
        },
    },
    seguro: {
        id: "seguro",
        parceiro: "Seguro de celular",
        iconeSelo: IconlyEscudo,
        corSelo: "bg-utility-blue-600",
        categoria: "Proteção",
        titulo: "Curta o rolê sem medo de perder o celular",
        descricao: "Proteja seu celular contra roubo e quebra durante o evento.",
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
            "O plano Completo também cobre quebra acidental da tela.",
            "Em caso de sinistro, abra o pedido em até 48 horas pelo e-mail que enviamos.",
        ],
        destino: { rotulo: "E-mail da apólice", valor: USUARIO.email },
        confirmacao: {
            titulo: "Celular protegido",
            descricao: "Enviamos a apólice para o seu e-mail.",
            passos: ["Guarde o e-mail com a apólice: ele traz o número do seguro.", "Se algo acontecer, abra o pedido em até 48 horas pelo link do e-mail."],
        },
    },
};

/** Ofertas com página própria (cada uma aberta pelo link de uma comunicação). */
export const INDIVIDUAIS: ServicoId[] = ["uber", "uber-evento", "meep"];

/** Momentos do Checklist do rolê: a vitrine organiza os serviços pela hora em que a pessoa precisa deles. */
export const MOMENTOS: { id: string; titulo: string; servicos: ServicoId[] }[] = [
    { id: "antes", titulo: "Antes de sair", servicos: ["seguro"] },
    { id: "caminho", titulo: "Ida e volta", servicos: ["uber"] },
    { id: "evento", titulo: "No evento", servicos: ["meep", "fotos"] },
];

/** Serviços do Checklist do rolê, na ordem dos momentos. Cada um abre a própria página de contratação. */
export const CHECKLIST: ServicoId[] = MOMENTOS.flatMap((m) => m.servicos);

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor a pagar depois do desconto, arredondado em centavos. */
export const valorFinal = (servico: Servico, valor: number) => Math.round(valor * (1 - servico.desconto) * 100) / 100;
