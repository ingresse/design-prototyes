/* ------------------------------------------------------------------ */
/*  Modelo único da plataforma Ingresse (gêmeo para protótipo)         */
/*                                                                     */
/*  Backstage, site, link de compra, checkout e carteiras leem e       */
/*  gravam estes tipos no mesmo banco (src/plataforma/db). Cada        */
/*  produto pode ter o próprio tipo de tela, mas converte a partir     */
/*  daqui num adaptador dentro do produto.                             */
/* ------------------------------------------------------------------ */

import type { Condicoes as CondicoesDoComissario, Repasse as RepasseAoComissario, VendaAtribuida } from "./comissarios";
import type { GrupoEquipe } from "./equipe";

export type EventoStatus = "rascunho" | "privado" | "publicado" | "encerrado";

/** Hierarquia de venda: sessão > grupo (setor) > ingresso > lote. */
export interface Lote {
    id: string;
    nome: string;
    /** Preço de face em reais. */
    preco: number;
    /** Quantidade ofertada neste lote. Vendidos são derivados dos ingressos emitidos. */
    quantidade: number;
    /** Pausado pelo produtor: não vende e o próximo lote não abre por causa dele. */
    pausado?: boolean;
    /** ISO local: o lote para de vender nesta data, mesmo com saldo. */
    dataLimite?: string;
    /** Códigos de Passkey (Marketing) que liberam este lote. */
    chaves?: string[];
}

/** Onde um item pode ser vendido. */
export type CanalVenda = "site" | "link" | "app" | "bilheteria";

/** Quem pode comprar: qualquer pessoa ou só quem tem uma Passkey. */
export type PublicoVenda = "todos" | "chave";

/** Quando, onde e para quem um item vende. Tudo opcional: sem regra, vende enquanto estiver ativo. */
export interface RegrasDeVenda {
    /** ISO local de início das vendas. Vazio: começa quando o evento for publicado ou ficar privado. */
    inicio?: string;
    /** ISO local de fim das vendas. Vazio: até o início do evento. */
    fim?: string;
    /** Vazio ou ausente: todos os canais. */
    canais?: CanalVenda[];
    publico?: PublicoVenda;
    /** Máximo deste item por pedido. `null` ou ausente: sem limite. */
    limitePorPedido?: number | null;
    /** Mínimo deste item por pedido. Ausente: 1. */
    minimoPorPedido?: number;
}

/** Transferência do ingresso para outra pessoa. */
export type Transferencia = "sempre" | "nunca" | "compra";
/** Quem pode portar o ingresso. Com dependentes, a transferência vira "nunca". */
export type Portador = "usuario" | "dependentes";
/** Quem paga as taxas de venda. */
export type PagadorDeTaxas = "comprador" | "organizacao";
/** O que o item vendido é: ingresso, check-in ou pacote. */
export type ItemVendido = "ingresso" | "checkin" | "pacote";
/** Como as pessoas entram no setor. */
export type TipoAcesso = "qr" | "facial";

export type Beneficio = "inteira" | "meia-entrada";

/** Como o ingresso passa de um lote para o próximo. Sem valor, "individual" (o padrão). */
export type ViradaDeLote = "individual" | "em-conjunto" | "manual";

export interface TipoIngresso {
    id: string;
    nome: string;
    /** Tipo de virada de lote. Ainda não se escolhe: todo ingresso usa o padrão, "individual". */
    virada?: ViradaDeLote;
    descricao?: string;
    beneficio?: Beneficio;
    /** Desligado no Backstage: não aparece para venda. */
    ativo: boolean;
    lotes: Lote[];
    vendas?: RegrasDeVenda;
    /** `false`: não aparece na página do evento; vende só pelo link direto ou com chave. Padrão: visível. */
    visivel?: boolean;
    /** Antigo: as perguntas agora ficam em `Evento.perguntas`, com os itens em cada uma. */
    perguntas?: string[];
    /** Padrão: "ingresso". */
    itemVendido?: ItemVendido;
    /** Padrão: "sempre". Portador com dependentes força "nunca"; segmentação força "compra". */
    transferencia?: Transferencia;
    portador?: Portador;
    /** Ids de ingressos: só compra quem adquirir um deles. */
    vendaVinculada?: string[];
    /** Ids das segmentações de Público da organização que podem comprar. */
    segmentos?: string[];
    /** Padrão: "comprador". */
    taxas?: PagadorDeTaxas;
    /** Códigos de Passkey (Marketing) que liberam o ingresso inteiro. */
    chaves?: string[];
}

export interface Grupo {
    id: string;
    nome: string;
    /** Portão ou acesso exibido no ingresso. */
    acesso?: string;
    /** Lotação do setor. A soma dos lotes dos ingressos do setor é conferida contra ela. */
    capacidade?: number;
    /** Como as pessoas entram: código QR ou reconhecimento facial. */
    tipoAcesso?: TipoAcesso;
    ingressos: TipoIngresso[];
}

/** Produto da biblioteca da organização: reaproveitado entre eventos. */
export interface ProdutoDaOrganizacao {
    id: string;
    nome: string;
    descricao?: string;
    /** URL ou caminho da imagem. */
    imagem?: string;
    /** Preço sugerido; cada evento pode vender por outro. */
    precoBase: number;
    /** Regras de venda do produto (quantidade por pedido), iguais em todos os eventos. */
    vendas?: RegrasDeVenda;
    criadoEm: string;
}

/** Produto vendido num evento: escolhido da biblioteca, com preço e estoque do evento. */
export interface ProdutoNoEvento {
    produtoId: string;
    /** Preço no evento. Ausente: usa o preço base da organização. */
    preco?: number;
    estoque: number;
    ativo: boolean;
    /** Ausente: sempre permitir. */
    transferencia?: Transferencia;
    /** Antigo: as regras agora são do produto na organização. Não é mais lido nem editado. */
    vendas?: RegrasDeVenda;
    visivel?: boolean;
    /** Códigos de Passkey (Marketing) que liberam o produto. */
    chaves?: string[];
}

/** Um item dentro de um combo, com a quantidade. */
export interface ItemDoCombo {
    tipo: "ingresso" | "produto";
    /** Id do tipo de ingresso ou do produto da organização. */
    id: string;
    quantidade: number;
}

/** Pacote de itens já existentes do evento, vendidos juntos pelo preço do combo. */
export interface Combo {
    id: string;
    nome: string;
    descricao?: string;
    preco: number;
    itens: ItemDoCombo[];
    /** Limite próprio de combos à venda. `null` ou ausente: só o estoque dos itens limita. */
    limite?: number | null;
    ativo: boolean;
    vendas?: RegrasDeVenda;
    visivel?: boolean;
    /** Códigos de Passkey (Marketing) que liberam o combo. */
    chaves?: string[];
}

/** Passkey do evento (Marketing, CHA): o código e o uso; o que ela libera fica em `chaves` de cada item. */
export interface Passkey {
    /** Só letras e números, em maiúsculas (não distingue caixa). */
    codigo: string;
    ativa: boolean;
    /** `null`: ilimitado. */
    limite: number | null;
    usos: number;
    criadaEm: string;
}

export interface Sessao {
    id: string;
    /** ISO local, sem fuso (ex.: 2026-10-03T22:00). */
    inicio: string;
    /** Fim da sessão (ISO local). Pode cair no dia seguinte. Sessões antigas não têm. */
    fim?: string;
    grupos: Grupo[];
}

/** Dados só de vitrine (site). Opcionais: o site completa com padrões. */
export interface Vitrine {
    artista?: string;
    categoria?: string;
    tags?: string[];
    descricao?: string[];
    /** A mesma descrição em rich text (HTML do editor do DS), escrita na criação do evento. `descricao` segue em texto puro para quem só lê parágrafos. */
    descricaoHtml?: string;
}

/** Tipo escolhido ao criar o evento. Muda os campos e o vocabulário (esportivo: inscrição, largada). */
export type TipoEvento = "futebol" | "show" | "esportivo";
export type Modalidade = "corrida" | "natacao" | "trilha" | "ciclismo";
export type CategoriaLimite = "inteira" | "meia-entrada" | "gratuidade" | "convidado" | "socio-torcedor" | "ingresso" | "combo" | "produto";

/** Limite de compra por usuário. `null` = ilimitado. Categoria sem valor segue só o geral. */
export interface LimitesPorUsuario {
    geral: number | null;
    porCategoria: Partial<Record<CategoriaLimite, number | null>>;
}

/** Jogo de futebol. Os ids vêm das listas do back-end (campeonatos, times, programas). */
export interface Partida {
    campeonatoId?: string;
    mandanteId: string;
    visitanteId: string;
    programaMembrosId?: string;
}

export type MapaDoEvento = { tipo: "imagem"; url?: string } | { tipo: "assentos"; mapaId: string };

/** Vídeo opcional da página do evento: link do YouTube ou do Vimeo (EVT-165). */
export interface VideoDoEvento {
    url: string;
    origem: "youtube" | "vimeo";
}

/** Entrada (portão) do local do evento, cadastrada na criação (EVT-166). Os grupos de ingressos a oferecem em "Acesso na portaria". */
export interface EntradaDoLocal {
    id: string;
    nome: string;
}

export interface ConfiguracoesAvancadas {
    /** Um pedido pode ter ingressos de grupos diferentes. */
    comprasEntreGrupos: boolean;
    /** Estoque devolvido de lote esgotado (pedido não pago): volta ao lote de origem ou soma ao lote ativo. */
    estoqueDevolvido: "lote-origem" | "lote-ativo";
    trocaDeSetor: boolean;
    reservaNaCompra: boolean;
    limiteBilheteriaOnline: "sem-limite" | "aplicar";
    politicaId?: string;
    acessoFacialId?: string;
    qrCodeNoEmail: boolean;
}

/** Opção de lista da criação de evento acrescentada pela organização (time, campeonato, programa, política). */
export interface OpcaoDaOrganizacao {
    id: string;
    nome: string;
}

/** Listas da criação de evento que cada organização completa com as suas opções. */
export interface OpcoesDeEventoDaOrganizacao {
    campeonatos?: OpcaoDaOrganizacao[];
    times?: OpcaoDaOrganizacao[];
    programasMembros?: OpcaoDaOrganizacao[];
    politicas?: OpcaoDaOrganizacao[];
}

/** Marco da curva de vendas na Visão geral do evento: o que aconteceu num dia. */
export interface MarcoDoEvento {
    id: string;
    /** ISO curto (AAAA-MM-DD). */
    data: string;
    tipo: "lote" | "atracao" | "marketing" | "externo";
    titulo: string;
    descricao?: string;
}

/** Conta da produtora no Backstage. Cada evento pertence a uma. */
export interface Organizacao {
    id: string;
    nome: string;
    /** Até 2 letras, mostradas no avatar. */
    sigla: string;
    criadoEm: string;
    /** Biblioteca de produtos. Ausente: a organização ainda não salvou a sua (usa a inicial). */
    produtos?: ProdutoDaOrganizacao[];
    /** Ajustes: ingressos dos eventos podem ser atribuídos direto a um CPF ou passaporte, sem conta (ORG-43). */
    atribuicaoADocumentos?: boolean;
    /** Etiquetas de destaque, compartilhadas entre os eventos (Marketing). */
    etiquetas?: Etiqueta[];
    /** Termos de uso que o comprador aceita (Ajustes › Termos de uso, TDU). */
    termosDeUso?: TermoDeUso[];
    /** Mapas interativos da organização (Ajustes › Mapas interativos, MAP). Ausente: os de exemplo. */
    mapas?: MapaInterativo[];
    /** Segmentações do público (Público › Segmentações, SEG). Ausente: as de exemplo. */
    segmentacoes?: Segmentacao[];
    /** Contas que recebem repasses (Finanças, FIN). Ausente: a conta do contrato de exemplo. */
    contasFavorecidas?: ContaFavorecida[];
    /** Repasses pedidos (Finanças, FIN). Ausente: o histórico de exemplo. */
    repasses?: Repasse[];
    /** Quem acessa o Backstage da organização (Membros, MEM). Ausente: os de exemplo. */
    membros?: MembroDaOrganizacao[];
    /** Grupos de membros: em quais eventos cada um entra (MEM). Ausente: os de exemplo. */
    gruposDeMembros?: GrupoDeMembros[];
    /** Cargos criados pela organização; os padrão ficam no código (MEM-61). */
    cargos?: CargoDaOrganizacao[];
    /** Quando a organização recebeu os grupos-comissário de exemplo (COM-107). Ausente: ainda não recebeu. */
    equipeSemeadaEm?: string;
    /** Opções que a organização acrescentou nas listas da criação de evento (EVT). Ausente: só as padrão e as que os eventos dela já usam. */
    opcoesDeEvento?: OpcoesDeEventoDaOrganizacao;
}

/** Nível de acesso de um cargo a uma funcionalidade. */
export type NivelDePermissao = "none" | "viewer" | "editor" | "admin";

export interface PermissaoDoCargo {
    featureId: string;
    nome: string;
    level: NivelDePermissao;
    /** Sub-itens com nível próprio (ex.: tipos de relatório). */
    subitens?: { id: string; nome: string; level: NivelDePermissao }[];
}

/** Cargo (MEM): o que a pessoa pode fazer. */
export interface CargoDaOrganizacao {
    id: string;
    nome: string;
    descricao: string;
    permissions?: PermissaoDoCargo[];
    /** Ações concedidas no formato "recurso:acao" (catálogo real). */
    acoes?: string[];
    /** Sem permissão explícita: configurado por funcionalidade (ex.: Cortesias). */
    porFeature?: boolean;
}

/** Grupo de membros (MEM): em quais eventos da organização as pessoas entram. */
export interface GrupoDeMembros {
    id: string;
    nome: string;
    eventoIds: string[];
    membroIds: string[];
    /** "Todos os eventos": cobre todo evento da organização, inclusive os criados depois; não se exclui. */
    sistema?: boolean;
}

/** Membro (MEM): uma pessoa, por e-mail, com cargos e grupos. */
export interface MembroDaOrganizacao {
    id: string;
    email: string;
    cargoIds: string[];
    grupoIds: string[];
}

/** Conta que recebe repasses (FIN): Pix ou conta bancária; a do contrato não paga taxa extra. */
export interface ContaFavorecida {
    id: string;
    titular: string;
    tipo: "pix" | "corrente" | "poupanca";
    chavePix?: string;
    documento?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
    padraoDoContrato: boolean;
    criadaEm: string;
}

export type StatusDoRepasse = "analisando" | "pendente" | "agendado" | "pago" | "cancelado" | "rejeitado" | "falhou";

/** Pedido de repasse (FIN): de um ou mais eventos para uma conta, numa modalidade com data e taxa. */
export interface Repasse {
    id: string;
    contaId: string;
    solicitante: string;
    /** Quanto sai de cada evento. */
    liquidacoes: { eventoId: string; valor: number }[];
    /** Valor bruto pedido. */
    valorSolicitado: number;
    taxaAntecipacao: number;
    taxaTransferencia: number;
    /** Valor líquido que chega na conta. */
    valorTransferido: number;
    modalidade: "basic" | "express";
    status: StatusDoRepasse;
    /** ISO. */
    solicitadoEm: string;
    /** "AAAA-MM-DD": data prevista do pagamento. */
    dataPrevista: string;
    concluidoEm?: string;
    motivo?: string;
    descricao?: string;
    idDeControle?: string;
}

/** Segmentação (SEG): quem entra num grupo do público, por idade, lista de documentos ou documento no checkout. */
export interface Segmentacao {
    id: string;
    nome: string;
    descricao?: string;
    idadeMinima?: number;
    idadeMaxima?: number;
    /** Lista manual: CPF (11 dígitos) ou passaporte. */
    documentos: { documento: string; tipo: "cpf" | "passaporte" }[];
    /** Documento que o comprador apresenta no checkout. */
    documentoNoCheckout: "nenhum" | "cie";
    atualizadoEm: string;
}

/** Mapa interativo (MAP): desenhado no editor, vinculado aos eventos com assento marcado. */
export interface MapaInterativo {
    id: string;
    nome: string;
    /** Nunca publicado, publicado, ou publicado com alterações em rascunho. */
    status: "rascunho" | "publicado" | "publicado-com-rascunho";
    arquivado: boolean;
    assentos: number;
    atualizadoEm: string;
}

/** Termo de uso da organização (TDU): o comprador vê o nome e aceita o texto. */
export interface TermoDeUso {
    id: string;
    nome: string;
    /** HTML do editor, até 5.000 caracteres de texto. */
    texto: string;
    /** Associado sozinho a eventos novos; só um por organização. */
    padrao: boolean;
    ativo: boolean;
    criadoEm: string;
}

/** Item vendido numa abertura: ingresso, produto do evento ou combo. */
/** Só o que foi marcado: ingresso criado depois num setor não entra sozinho (decisão Victor, 08/11/2026). */
export interface ItemDaAbertura {
    tipo: "ingresso" | "produto" | "combo";
    id: string;
}

/** Uma linha da abertura: para quem, quais itens e onde. */
/** Formato antigo (até 08/11/2026): público, itens e canais por configuração. Só para ler dados salvos. */
export interface ConfiguracaoDeAbertura {
    id: string;
    publico: string[];
    itens: ItemDaAbertura[];
    canais: CanalVenda[];
}

/** Quando os itens vendem: nome, início, fim e os ingressos, produtos e combos incluídos. */
export interface AberturaDeVendas {
    id: string;
    /** Aparece para o comprador. */
    nome: string;
    /** "AAAA-MM-DDTHH:mm", hora local do evento. */
    inicio: string;
    fim: string;
    itens?: ItemDaAbertura[];
    /** Antigo: lido por `itensDaAbertura` e apagado na próxima gravação. */
    configuracoes?: ConfiguracaoDeAbertura[];
}

/** Pixels do evento, carregados na página de compra (PIX). Vazio ou ausente: não configurado. */
export interface RastreamentoDoEvento {
    meta?: string;
    tiktok?: string;
    x?: string;
    googleAdsId?: string;
    googleAdsRotulo?: string;
    /** Existe no modelo de produção, sem campo na tela. */
    ga4?: string;
}

/** Onde um cupom vale: um lote de ingresso ou um combo (CUP). */
export interface VinculoDoCupom {
    tipo: "lote" | "combo";
    id: string;
}

/** Cupom de desconto do evento (CUP). Limites ausentes: ilimitado. */
export interface Cupom {
    id: string;
    /** Só letras e números, em maiúsculas; único no evento. */
    codigo: string;
    ativo: boolean;
    tipoDesconto: "percentual" | "fixo";
    /** Percentual: 0 a 100. Fixo: em reais. */
    valor: number;
    /** Itens que já receberam o desconto. */
    usos: number;
    /** Itens com desconto em todo o evento. */
    limiteItens?: number;
    /** Vezes que cada pessoa pode usar. */
    limitePorComprador?: number;
    /** Itens da compra que recebem o desconto (os de maior valor). */
    limiteItensPorCompra?: number;
    /** "AAAA-MM-DDTHH:mm", hora local do evento. */
    inicio: string;
    /** Ausente: não expira. */
    fim?: string;
    vinculos: VinculoDoCupom[];
    criadoEm: string;
}

/** Onde uma etiqueta aparece, num evento (ETQ). */
export interface VinculoDaEtiqueta {
    eventoId: string;
    tipo: "grupo" | "lote" | "combo" | "produto";
    id: string;
}

/** Etiqueta de destaque ("Últimos ingressos"): é da organização; os vínculos são por evento (ETQ). */
export interface Etiqueta {
    id: string;
    /** Até 30 caracteres, único na organização. */
    nome: string;
    vinculos: VinculoDaEtiqueta[];
    criadoEm: string;
}

/** Item de um conjunto de lotes sincronizados (LSI): um ingresso, a partir do lote em que estava na criação. */
export interface ItemSincronizado {
    ingressoId: string;
    /** Lote vigente quando o conjunto foi criado: a virada 1 fecha este lote e abre o seguinte. */
    loteInicialId: string;
}

/** Conjunto de lotes sincronizados (LSI): os ingressos viram de lote juntos, pela soma das vendas. */
export interface ConjuntoSincronizado {
    id: string;
    nome: string;
    itens: ItemSincronizado[];
    /** Gatilho de cada virada (número da virada → total de vendas que a dispara). Ausente: "Aguardando". */
    gatilhos: Record<number, number>;
    criadoEm: string;
}

/** Pedido de vagas de um gestor de grupo ou assessoria (CEG). */
export interface SolicitacaoDeGrupo {
    id: string;
    grupo: string;
    tipoDeGrupo: "assessoria" | "amigos" | "empresa" | "corrida" | "escola" | "outros";
    descricao?: string;
    responsavel: string;
    email?: string;
    telefone?: string;
    cnpj?: string;
    solicitadas: number;
    status: "pendente" | "aprovada" | "reprovada";
    /** Vagas aprovadas (cota). */
    aprovadas?: number;
    /** Vagas já usadas pelo grupo: pagas e em pagamento. */
    pagas: number;
    iniciadas: number;
    motivo?: string;
    solicitadaEm: string;
    decididaEm?: string;
    /** Até quando o gestor pode comprar com as vagas aprovadas. */
    validaAte?: string;
}

/** Compras em grupo do evento (CEG): o formulário de pedidos e a fila de solicitações. */
export interface ComprasEmGrupo {
    /** Formulário publicado (o assistente terminou). */
    publicado: boolean;
    /** Recebendo novas solicitações (desabilitar só para de receber). */
    habilitado: boolean;
    minimo?: number;
    maximo?: number;
    /** "AAAA-MM-DDTHH:mm", hora local do evento. */
    inicio?: string;
    fim?: string;
    prazo: { tipo: "data"; data?: string } | { tipo: "dias"; dias?: number };
    /** Ingressos que o grupo pode comprar. */
    itens: string[];
    solicitacoes: SolicitacaoDeGrupo[];
}

/** Tipos de resposta do questionário (QST). */
export type TipoDePergunta = "texto-curto" | "texto-longo" | "opcao-unica" | "multipla" | "numero" | "telefone" | "anexo";

export interface OpcaoDaPergunta {
    id: string;
    rotulo: string;
    /** Quantas pessoas podem escolher. Ausente: sem limite. 0: esgotada. */
    estoque?: number;
}

/** Item que recebe a pergunta: só o que foi marcado; ingresso criado depois não entra sozinho. */
export interface ItemDaPergunta {
    tipo: "ingresso" | "combo";
    id: string;
}

/**
 * Pergunta do questionário do evento. Respondida por ingresso ou combo comprado, na compra e na
 * transferência. Quais podem mudar na Carteira, e quando, fica em `Evento.edicaoNaCarteira`.
 */
export interface Pergunta {
    id: string;
    titulo: string;
    tipo: TipoDePergunta;
    obrigatoria: boolean;
    /** Só em "opcao-unica" e "multipla". */
    opcoes?: OpcaoDaPergunta[];
    itens: ItemDaPergunta[];
}

/** Edição das respostas na Carteira: geral do evento, com janela e perguntas escolhidas. */
export interface EdicaoNaCarteira {
    /** "AAAA-MM-DDTHH:mm", hora local do evento. */
    inicio: string;
    fim: string;
    /** Ids das perguntas que podem mudar. */
    perguntas: string[];
}

/** Pedido recebido pelo formulário de participação do evento (Público, PUB-96). Dados fictícios. */
export interface SolicitacaoDeParticipacao {
    id: string;
    nome: string;
    /** CPF ("123.456.789-01") ou passaporte. */
    documento: string;
    email: string;
    cid: string;
    telefone: string;
    /** Data de nascimento (DD/MM/AAAA). */
    nascimento: string;
    /** Data do laudo médico (DD/MM/AAAA). */
    dataLaudo: string;
    /** Data da solicitação (AAAA-MM-DD). */
    data: string;
    status: "pendente" | "aprovada" | "rejeitada";
    /** Segmentação em que a pessoa entrou (ao aprovar). */
    segmento?: string;
    /** Motivo informado ao reprovar. */
    justificativa?: string;
    /** Quando foi aprovada ou reprovada (ISO). */
    decididaEm?: string;
}

/**
 * Equipe e Comissários do evento (ECO), gravada no próprio evento. As vendas e os pedidos dos grupos
 * não ficam aqui: são lidos dos pedidos do evento (`Pedido.comissario`, bilheteria e cortesia) e
 * completados com exemplos gerados do catálogo (`comissarios.ts`).
 */
export interface EquipeDoEvento {
    grupos: GrupoEquipe[];
    /** Pagamentos de comissão registrados pela organização (COM-40). */
    repasses: RepasseAoComissario[];
    /** Cortesias emitidas pelo Freepass e registradas fora de pedido (`registrarCortesias`, ECO-81). */
    cortesias?: VendaAtribuida[];
    /** Condição do comissário na hora da venda, por id de pedido do banco (congelada na primeira leitura). */
    condicoes?: Record<string, CondicoesDoComissario>;
    /** Os grupos de exemplo da equipe já entraram (ECO-06). */
    exemplos?: boolean;
}

export interface Evento {
    id: string;
    /** Usado no link de compra: /e/<slug>. */
    slug: string;
    nome: string;
    /** Nome da organização, congelado para vitrine e listagens. */
    produtora: string;
    /** Organização dona do evento. Eventos antigos sem o campo usam `organizacaoDoEvento()`. */
    organizacaoId?: string;
    status: EventoStatus;
    capa?: string;
    /** Banners além da capa, na ordem (EVT-164). A capa continua sendo o banner principal; quem só lê `capa` não muda. */
    bannersAdicionais?: string[];
    /** Vídeo opcional da página do evento (EVT-165). */
    video?: VideoDoEvento;
    local: string;
    /** Entradas (portões) do local, opcionais (EVT-166). */
    entradas?: EntradaDoLocal[];
    cidade?: string;
    /** Início da primeira sessão (ISO local). Duplicado aqui para listagens. */
    data: string;
    sessoes: Sessao[];
    /** Produtos da organização escolhidos para este evento. */
    /** Passkeys do evento (Marketing). Ausente: nenhuma. */
    passkeys?: Passkey[];
    produtos?: ProdutoNoEvento[];
    combos?: Combo[];
    aberturas?: AberturaDeVendas[];
    /** Questionário do evento, na ordem em que aparece para quem compra. */
    perguntas?: Pergunta[];
    /** Cupons de desconto (Marketing). */
    cupons?: Cupom[];
    /** Pixels de rastreamento (Marketing). */
    rastreamento?: RastreamentoDoEvento;
    /** Conjuntos de lotes sincronizados (Configurações de venda). */
    conjuntosSincronizados?: ConjuntoSincronizado[];
    /** Compras em grupo (Configurações de venda). Ausente: módulo nunca habilitado. */
    comprasEmGrupo?: ComprasEmGrupo;
    /** Equipe e Comissários do evento (ECO). Ausente: nenhum grupo ainda. */
    equipe?: EquipeDoEvento;
    /** Formulário de participação do evento (Público, PUB). Ausente: o evento não tem formulário. */
    formularioDeParticipacao?: { ativo: boolean; limite: "ilimitado" | "limitado"; quantidadeLimite?: number; criadoEm: string };
    /** Pedidos do formulário de participação (PUB-96). Ausente: ainda não gravados; a primeira abertura grava os de exemplo. */
    solicitacoesDeParticipacao?: SolicitacaoDeParticipacao[];
    /** Simulação da Lista de usuários (LUS-09): inscrições fictícias geradas a partir desta marca. Ausente: sem simulação. */
    listaDeUsuariosSimulada?: { quantidade: number; criadaEm: string };
    /** Quem entrou na lista de espera (CART-084/085; relatório Lista de usuários). `origem`: pelo botão do link de compra esgotado ou pelo link de convite (LES-04). Inscrições antigas não têm. */
    listaDeEspera?: { id: string; nome: string; email: string; telefone: string; inscritoEm: string; origem?: OrigemDaListaDeEspera }[];
    /** Configuração da lista de espera (Backstage › Marketing › Lista de espera, LES). Ausente: as duas entradas desligadas. */
    configuracaoDaListaDeEspera?: ConfiguracaoDaListaDeEspera;
    /** `null` ou ausente: desligada. */
    edicaoNaCarteira?: EdicaoNaCarteira | null;
    /** Alíquota da taxa de serviço sobre o preço de face (0.1 = 10%). */
    taxaServico: number;
    /* Campos da criação por tipo. Opcionais: eventos antigos e da seed não têm. */
    tipo?: TipoEvento;
    modalidade?: Modalidade;
    /** Categoria do evento (id da coleção `categorias`). Show ou festa escolhe no dropdown; futebol e esportivo nascem com a sua. */
    categoria?: string;
    /** Tags do evento (ids do catálogo em categorias-catalogo.ts), achadas por embedding na criação do show ou festa. */
    tags?: string[];
    /** O que a pessoa escreveu sobre o show ou festa, no campo aberto da criação. */
    categoriaTexto?: string;
    /** Fim do evento (ISO local). */
    fim?: string;
    /** Código ISO da moeda (ex.: BRL). */
    moeda?: string;
    limites?: LimitesPorUsuario;
    /** Idade mínima em anos; 0 = livre. */
    idadeMinima?: number;
    mapa?: MapaDoEvento;
    partida?: Partida;
    avancado?: ConfiguracoesAvancadas;
    vitrine?: Vitrine;
    /** Marcos e anotações da Visão geral (EVT). Ausente: a tela deriva os iniciais dos dados do evento. */
    marcos?: MarcoDoEvento[];
    criadoEm: string;
    atualizadoEm: string;
}

export interface Usuario {
    id: string;
    nome: string;
    email: string;
}

/** saldo: a produtora paga a taxa pelo saldo dela e o comprador não paga (bilheteria). */
export type MetodoPagamento = "pix" | "credito" | "debito" | "dinheiro" | "saldo" | "cortesia";
export type PedidoStatus = "aguardando-pagamento" | "pago" | "cancelado";
export type Canal = "site" | "link" | "app" | "bilheteria" | "cortesia";

/** Uma linha do carrinho. Ingresso aponta para o catálogo; produto só tem nome. */
export interface ItemPedido {
    tipo: "ingresso" | "produto";
    nome: string;
    detalhe?: string;
    sessaoId?: string;
    grupoId?: string;
    ingressoId?: string;
    loteId?: string;
    /** Produto do evento (id na biblioteca da organização), quando a linha é um produto (cortesia). */
    produtoId?: string;
    /** Combo do evento: na linha do combo e nos ingressos que vieram dentro dele (cortesia). */
    comboId?: string;
    /** Linha cancelada sozinha (produto ou combo de cortesia); o pedido continua. */
    cancelado?: boolean;
    quantidade: number;
    face: number;
    taxa: number;
}

/** Para quem vai cada ingresso do pedido. */
export interface Atribuicao {
    /** Índice da linha em `itens`. */
    item: number;
    nome: string;
    email: string;
}

/** Por onde a pessoa entrou na lista de espera (LES). */
export type OrigemDaListaDeEspera = "esgotado" | "convite";

/** Lista de espera do evento (LES): cada entrada liga sozinha; as duas começam desligadas. */
export interface ConfiguracaoDaListaDeEspera {
    /** Com todos os ingressos esgotados, o link de compra mostra "Entrar na lista de espera". */
    aoEsgotar: boolean;
    /** O link de convite (`/e/<slug>/lista-de-espera`) recebe inscrições, inclusive antes da venda abrir. */
    convite: boolean;
    atualizadoEm: string;
}

export interface Pedido {
    id: string;
    eventoId: string;
    comprador: Usuario;
    canal: Canal;
    itens: ItemPedido[];
    atribuicoes: Atribuicao[];
    subtotal: number;
    taxas: number;
    total: number;
    status: PedidoStatus;
    pagamento?: { metodo: MetodoPagamento; parcelas?: number; pagoEm: string };
    /** Cobranças do checkout que não são do catálogo (proteção de compra, juros do parcelamento). */
    adicionais?: { protecao: number; juros: number };
    /** Envio feito pelo Backstage (cortesias): agrupa os pedidos de vários destinatários. */
    envio?: { id: string; nome: string; emissor: string };
    /** Cupom aplicado (CUP): o desconto já saiu do total. `itens` = unidades que receberam desconto. */
    cupom?: { id: string; codigo: string; desconto: number; itens: number };
    /** Venda pela bilheteria do Backstage: o que a gestão mostra além do pedido (BIL). */
    bilheteria?: DadosDaBilheteria;
    /** Venda pelo código de um comissário (ECO): o grupo da equipe, o código usado e a pessoa que vendeu. */
    comissario?: { grupoId: string; comissarioId: string; codigo: string; vendedor?: string };
    /** Passkeys (CHA) que liberaram itens deste pedido. `contadas`: o uso já somou em `Evento.passkeys` (um por pedido pago). */
    passkeys?: { codigos: string[]; contadas?: boolean };
    /** Alterações feitas depois da compra pelo Backstage (Pedidos, PED): troca de item, formulário, transferência. */
    alteracoes?: AlteracaoDoPedido[];
    criadoEm: string;
    atualizadoEm: string;
}

/** Alteração pós-compra registrada no pedido (PED): quem fez, quando e o que virou o quê. */
export interface AlteracaoDoPedido {
    id: string;
    tipo: "troca-item" | "formulario" | "transferencia";
    /** Nome de quem fez (o membro logado no Backstage). */
    autor: string;
    /** ISO. */
    em: string;
    descricao: string;
    /** Ingressos emitidos afetados. */
    ingressoIds: string[];
    mudancas?: { escopo?: string; de: string; para: string }[];
    /** Valor cobrado pela alteração, quando houve. */
    valor?: number;
    /** Motivo e chamado informados pelo operador. */
    motivo?: string;
}

/** Gestão da bilheteria: cobrança, quem emitiu e os reenvios do link. */
export interface DadosDaBilheteria {
    /** Link de pagamento para o comprador, ou só a taxa paga pelo saldo da produtora. */
    tipo: "link" | "saldo";
    emissor: string;
    /** Comprador sem conta: o ingresso espera o cadastro. */
    contaPendente?: boolean;
    /** O link venceu sem pagamento. */
    expirado?: boolean;
    /** Data e hora legíveis do último reenvio. */
    reenviadoEm?: string;
    envios?: { canal: "email" | "whatsapp"; destino: string; at: string }[];
}

export type IngressoEmitidoStatus = "valido" | "transferido" | "utilizado" | "cancelado";

/** Ingresso que existe na carteira de alguém. */
export interface IngressoEmitido {
    id: string;
    pedidoId: string;
    eventoId: string;
    sessaoId: string;
    grupoId: string;
    ingressoId: string;
    loteId: string;
    /** Rótulos congelados na emissão: o catálogo pode mudar depois. */
    rotulo: { evento: string; grupo: string; ingresso: string; lote: string; acesso?: string };
    /** Emitido dentro de um combo (id do combo no evento). */
    comboId?: string;
    titular: { nome: string; email: string };
    codigo: string;
    status: IngressoEmitidoStatus;
    /** Respostas do questionário do evento (id da pergunta → resposta). Editadas em Pedidos (PED). */
    respostas?: Record<string, string>;
    emitidoEm: string;
    atualizadoEm: string;
}

/** Canal de venda como o Backstage agrupa nas métricas. */
export type CanalMetrica = "online" | "bilheteria" | "cortesia";

/**
 * Vendas anteriores ao gêmeo, consolidadas por evento (um documento por evento, id = eventoId).
 * Dá aos eventos da seed um passado de vendas sem gravar milhares de pedidos. Entra no estoque
 * (vendidos por lote) e nas métricas do Backstage junto com os pedidos reais.
 */
export interface HistoricoVendas {
    id: string;
    eventoId: string;
    /** Meta de faturamento definida pela produtora (R$). */
    meta: number;
    /** Ingressos vendidos por lote. Soma com os emitidos no estoque. */
    porLote: Record<string, number>;
    /** Parte de porLote vendida por canal. */
    porCanal: Record<CanalMetrica, number>;
    pagamentos: { tipo: string; qtd: number }[];
    /**
     * Uma linha por dia: [ingressos, produtos, faturamento]. A última linha é ontem: o histórico
     * acompanha o relógio para o protótipo não envelhecer.
     */
    serie: [number, number, number][];
}

/**
 * Cada show ou festa criado, com o que a pessoa escreveu no campo aberto, o que o Claude leu do banner
 * e o vetor. Guardado para recalibrar as tags com eventos reais.
 */
export interface CriacaoDeEvento {
    id: string;
    eventoId: string;
    produtora: string;
    nome: string;
    /** O que a pessoa escreveu sobre o evento. */
    texto: string;
    /** Descrição em texto puro. */
    descricao?: string;
    /** Leitura do banner pelo Claude, em uma frase. */
    bannerDescricao?: string;
    /** Embedding (modelo do Hugging Face) do texto, nome, descrição e banner. */
    vetor?: number[];
    /** Categoria escolhida no dropdown. */
    categoriaId?: string;
    /** Tags gravadas no evento. */
    tags?: string[];
    criadoEm: string;
}

/** Categoria do mapa do Grupo (categorias-catalogo.ts), gravada pela seed. Uma por evento. */
export interface Categoria {
    id: string;
    nome: string;
    /** Ordem no dropdown e na página. */
    ordem: number;
    /** Tipo de criação que usa a categoria: futebol e esportivo têm a sua; show ou festa escolhe entre as outras. */
    tipo: TipoEvento;
}

/** Coleções do banco e o tipo de cada uma. */
export interface Colecoes {
    eventos: Evento;
    pedidos: Pedido;
    ingressos: IngressoEmitido;
    usuarios: Usuario;
    historico: HistoricoVendas;
    organizacoes: Organizacao;
    criacoes: CriacaoDeEvento;
    categorias: Categoria;
}

export type NomeColecao = keyof Colecoes;
export const COLECOES: NomeColecao[] = ["eventos", "pedidos", "ingressos", "usuarios", "historico", "organizacoes", "criacoes", "categorias"];
