import type { Transferencia } from "@/plataforma";
import type { LocalEncontrado } from "./locais";

/* ------------------------------------------------------------------ */
/*  Rascunho do evento esportivo (SCE)                                 */
/*                                                                     */
/*  Modalidade, categoria e lote equivalem, na plataforma, a grupo,    */
/*  tipo de ingresso e lote (`@/plataforma/modelo.ts`). Aqui o         */
/*  vocabulário é o do esporte: a tela nunca fala em ingresso.          */
/* ------------------------------------------------------------------ */

/** Arquivo enviado (imagens e termo). `url`: a prévia (nas imagens, o recorte aplicado). */
export interface Arquivo {
    nome: string;
    tamanho: number;
    url?: string;
    /** Imagem enviada antes do recorte, para ajustar de novo (endereço temporário do navegador). */
    original?: string;
}


export interface Lote {
    id: string;
    nome: string;
    /** Em reais. `null` = vazio. */
    valor: number | null;
    vagas: number | null;
    /** ISO local `AAAA-MM-DDTHH:mm`; vazio = sem data limite. */
    dataLimite: string;
    /** v0.8 (SCE-191): lote copiado ou duplicado, ainda não revisado. Sinaliza, mas não impede publicar. */
    revisar?: boolean;
}

export type Sexo = "todos" | "feminino" | "masculino";
export type IdadeCalculadaEm = "fim-do-ano" | "dia-do-evento" | "dia-da-compra";
export type DescontoLegal = "nenhum" | "idoso" | "pcd";

/** v0.19 (SCE-238): políticas do evento (valem para todas as categorias). */
export interface RegrasDaInscricao {
    /** Permite mais de uma inscrição para o mesmo atleta (CPF) no evento. Não = inscrição nominal. */
    variasPorCpf: boolean;
    /** Quem pode ser o atleta: quem compra ou outra pessoa, ou somente quem compra. */
    atribuicao: "qualquer" | "comprador";
    /** Inscrições por comprador no evento (soma de todos os pedidos). */
    limitePorComprador: number | null;
    /** Troca de titularidade pela carteira, depois da compra, dentro de um período (v0.20, SCE-241). */
    trocaDeTitularidade: boolean;
    /** ISO local; em branco até ser informado (não vem na cópia). */
    trocaInicio: string;
    trocaFim: string;
    /** v0.25: o fim foi sugerido (véspera da largada) e acompanha o início até a pessoa editar. */
    trocaFimSugerido?: boolean;
}

export interface Categoria {
    id: string;
    /** v0.17 (SCE-228): categoria em criação, ainda não salva ("Salvar categoria" tira a marca; sair sem salvar descarta). */
    nova?: boolean;
    nome: string;
    /** v0.24 (SCE-248): descrição opcional para o atleta (até 1.000 caracteres), como na modalidade e no ingresso do AWA. */
    descricao?: string;
    sexo: Sexo;
    idadeMin: number | null;
    idadeMax: number | null;
    idadeEm: IdadeCalculadaEm;
    /** v0.18 (SCE-235): desconto legal saiu do MVP (iniciativa futura); o campo fica fora da tela. */
    desconto: DescontoLegal;
    semLimite: boolean;
    vagas: number | null;
    /** v0.18 (SCE-235): fora da tela; a transferência passa a ser configuração do evento (troca de titularidade). */
    transferencia: Transferencia;
    /** v0.18 (SCE-234): quem pode ser o atleta. Ausente em rascunhos antigos: "qualquer". */
    atleta?: "qualquer" | "comprador";
    /** v0.19 (SCE-239): limite por comprador só desta categoria; vazio = vale o limite do evento. */
    limiteComprador?: number | null;
    /** v0.18 (SCE-236): somente PCD aprovados no formulário de participação do evento (segmentação por lista de documentos). */
    pcd?: boolean;
    maxPorPedido: number | null;
    lotes: Lote[];
    /**
     * v0.6 (SCE-176): chaves de acesso (passkeys) e cupons vinculados à categoria. Não vêm na cópia (RN-07)
     * nem na duplicação; no protótipo, só a cópia de evento semeia alguns, como demonstração (ver Em aberto).
     */
    chavesDeAcesso?: number;
    cupons?: number;
}

export interface Modalidade {
    id: string;
    nome: string;
    tipo: string;
    /** v0.15 (SCE-212): sempre um número maior que zero; o backstage não tem estoque ilimitado de modalidade. `null` = ainda não informado. */
    vagas: number | null;
    /** v0.23 (SCE-247): descrição opcional para o atleta (até 1.000 caracteres), como a descrição do ingresso no AWA. */
    descricao?: string;
    categorias: Categoria[];
}

export type TipoDeResposta = "texto-curto" | "texto-longo" | "selecao-unica" | "lista-suspensa" | "multipla" | "data" | "numero";

/** Como a pergunta aparece numa categoria. Sem vínculo = não aparece. */
export type Presenca = "obrigatoria" | "opcional";

export interface OpcaoDePergunta {
    id: string;
    nome: string;
    /** Quantidade disponível. `null` = sem limite (padrão), salvo quando `aDefinir`. */
    quantidade: number | null;
    /**
     * v0.12 (SCE-208): opção que veio de outro evento com estoque. A quantidade vem vazia (o estoque é de cada
     * evento) e fica "a definir" até a pessoa digitar um número ou escolher "Sem limite".
     */
    aDefinir?: boolean;
    /** A opção veio de outro evento com estoque: apagar o número volta a "a definir" (não vira "sem limite" sozinha). */
    copiada?: boolean;
}

/**
 * Pergunta do formulário de inscrição (SCE-100). `todas`: vale para todas as categorias, e as que
 * forem criadas depois herdam a pergunta com a presença `padrao` (SCE-105). `vinculos`: presença
 * por categoria (id da categoria); categoria sem entrada = a pergunta não aparece.
 */
export interface Pergunta {
    id: string;
    titulo: string;
    tipo: TipoDeResposta;
    opcoes: OpcaoDePergunta[];
    todas: boolean;
    padrao: Presenca;
    vinculos: Record<string, Presenca>;
}

export interface Rascunho {
    origem: "zero" | "copia";
    /** Nome do evento copiado, para o aviso no topo. */
    copiadoDe?: string;
    nome: string;
    esporte: string;
    /** ISO local `AAAA-MM-DDTHH:mm`. */
    largada: string;
    /** Local da largada escolhido na busca (nome, endereço completo, cidade). */
    local: LocalEncontrado | null;
    /** Opcional (SCE-14). */
    imagem: Arquivo | null;
    /** v0.9 (SCE-200): fim da prova, ISO local; depois da largada. */
    termino: string;
    /** v0.9 (SCE-201): idade mínima do evento, nas faixas da classificação indicativa do AWA ("0" = livre). */
    idadeMinima: string;
    /** v0.9 (SCE-202): imagem do percurso (o "Mapa" do AWA), recortada. Opcional. */
    percurso: Arquivo | null;
    /** v0.26 (SCE-257): e-mail de confirmação (sempre com QR Code): texto adicional e banner próprio, opcionais. */
    emailInfo?: string;
    emailBanner?: Arquivo | null;
    /** v0.11 (SCE-207): termo de uso do evento, um dos termos ativos da organização (data/termos.ts). */
    termoId: string | null;
    /** v0.25: o término foi sugerido (largada + 4 h) e acompanha a largada até a pessoa editar. */
    terminoSugerido?: boolean;
    /** v0.19 (SCE-238): regras gerais da inscrição, do evento inteiro. Ausente em rascunhos antigos: REGRAS_PADRAO. */
    regras?: RegrasDaInscricao;
    /** v0.18 (SCE-236): formulário de participação do evento (pedidos PCD) ativo. */
    formularioParticipacao?: boolean;
    descricao: string;
    modalidades: Modalidade[];
    /** Na ordem do formulário. */
    perguntas: Pergunta[];
    /** Campos de data copiados que a pessoa ainda não revisou (id do campo). Somem ao editar (RN-07). */
    datasARevisar: string[];
    /** v0.8 (SCE-190): fluxo de cópia em dois passos aberto na etapa Modalidades (ausente: etapa normal). */
    fluxoDeCopia?: FluxoDeCopia;
    /** Hora do último salvamento automático (HH:MM). */
    salvoEm: string | null;
    publicado: boolean;
}

export type SecaoId = "evento" | "modalidades" | "inscricao";

/** Um problema que impede publicar: diz onde está (seção, campo) e o que fazer. */
export interface Pendencia {
    secao: SecaoId;
    /** Id do campo na tela (wrapper com `id`), usado para rolar e focar. */
    campo: string;
    /** Mensagem do campo, a mesma do HintText. */
    texto: string;
    /** Contexto curto para a lista de pendências (ex.: "10 km, categoria 60+"). */
    contexto?: string;
    /** Campo dentro do painel de uma categoria: abrir o painel antes de rolar. */
    categoria?: { modalidadeId: string; categoriaId: string };
    /** Campo dentro do painel de uma pergunta. */
    pergunta?: string;
    /** v0.8: lote copiado a revisar. Sinaliza, mas não impede publicar. */
    ajuste?: boolean;
}

/**
 * Fluxo de cópia em dois passos (SCE-190): "1 Escolher o que trazer › 2 Revisar". Serve para a cópia do evento
 * inteiro (início), "Copiar de outro evento", duplicar modalidade e duplicar categoria (só o passo 2).
 */
export interface FluxoDeCopia {
    tipo: "evento" | "outro-evento" | "duplicar-modalidade" | "duplicar-categoria" | "categorias-de-outro-evento";
    etapa: "escolher" | "revisar";
    /** Duplicar modalidade: a modalidade de origem. */
    origemId?: string;
    /** v0.16 (SCE-216): copiar categorias de outro evento: a modalidade que recebe as cópias. */
    destinoId?: string;
    /** O que a revisão mostra: modalidades e, se só algumas, as categorias. */
    escopo?: { modalidades: string[]; categorias?: string[] };
    /** Como o escopo ficou ao entrar na revisão, para o antes → depois. */
    original?: Modalidade[];
    /** Estado antes da cópia, para "Desfazer a cópia". Ausente na cópia do evento inteiro. */
    antes?: Pick<Rascunho, "modalidades" | "perguntas">;
}
