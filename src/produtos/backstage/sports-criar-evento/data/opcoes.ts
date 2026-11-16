import type { Transferencia } from "@/plataforma";
import type { Vocabulario } from "./vocabulario";
import type { DescontoLegal, IdadeCalculadaEm, Presenca, SecaoId, Sexo, TipoDeResposta } from "./tipos";

/* ------------------------------------------------------------------ */
/*  Opções, ajudas (?) e mensagens da criação de evento esportivo      */
/*  Vocabulário: evento, inscrição, atleta, lote; os nomes dos níveis  */
/*  vêm de data/vocabulario.ts. Nunca ingresso, portador ou setor.     */
/* ------------------------------------------------------------------ */

export interface Opcao<T extends string = string> {
    id: T;
    label: string;
}

export const ESPORTES: Opcao[] = [
    { id: "corrida-de-rua", label: "Corrida de rua" },
    { id: "trail-run", label: "Trail run" },
    { id: "ciclismo-de-estrada", label: "Ciclismo de estrada" },
    { id: "mtb", label: "MTB" },
    { id: "triatlo", label: "Triatlo" },
    { id: "natacao", label: "Natação" },
    { id: "duatlo", label: "Duatlo" },
    { id: "caminhada", label: "Caminhada" },
    { id: "outro", label: "Outro" },
];

export const TIPOS_DE_MODALIDADE: Opcao[] = [
    { id: "3k", label: "3K" },
    { id: "5k", label: "5K" },
    { id: "10k", label: "10K" },
    { id: "21k", label: "21K – Meia maratona" },
    { id: "42k", label: "42K – Maratona" },
    { id: "triatlo-sprint", label: "Triatlo sprint" },
    { id: "triatlo-olimpico", label: "Triatlo olímpico" },
    { id: "trail-curto", label: "Trail curto" },
    { id: "trail-longo", label: "Trail longo" },
    { id: "mtb-xco", label: "MTB XCO" },
    { id: "mtb-maratona", label: "MTB maratona" },
    { id: "aguas-abertas", label: "Natação águas abertas" },
    { id: "kids", label: "Kids" },
    { id: "caminhada", label: "Caminhada" },
    { id: "outro", label: "Outro" },
];

export const SEXOS: Opcao<Sexo>[] = [
    { id: "todos", label: "Todos" },
    { id: "feminino", label: "Feminino" },
    { id: "masculino", label: "Masculino" },
];

/** RN-03: o padrão é o final do ano do evento, como nas federações. */
export const IDADE_CALCULADA_EM: Opcao<IdadeCalculadaEm>[] = [
    { id: "fim-do-ano", label: "Final do ano do evento" },
    { id: "dia-do-evento", label: "Dia do evento" },
    { id: "dia-da-compra", label: "Dia da compra" },
];

export const DESCONTOS: Opcao<DescontoLegal>[] = [
    { id: "nenhum", label: "Nenhum" },
    { id: "idoso", label: "Idoso 50%" },
    { id: "pcd", label: "PCD 40%" },
];

export const TRANSFERENCIAS: Opcao<Transferencia>[] = [
    { id: "sempre", label: "Sempre" },
    { id: "compra", label: "Só na compra" },
    { id: "nunca", label: "Nunca" },
];

export const TIPOS_DE_RESPOSTA: Opcao<TipoDeResposta>[] = [
    { id: "texto-curto", label: "Texto curto" },
    { id: "texto-longo", label: "Texto longo" },
    { id: "selecao-unica", label: "Seleção única" },
    { id: "lista-suspensa", label: "Lista suspensa" },
    { id: "multipla", label: "Múltipla escolha" },
    { id: "data", label: "Data" },
    { id: "numero", label: "Número" },
];

export const PRESENCAS: Opcao<Presenca | "nao">[] = [
    { id: "obrigatoria", label: "Obrigatória" },
    { id: "opcional", label: "Opcional" },
    { id: "nao", label: "Não aparece" },
];

/** Seções na ordem da tela (v0.2: sem "Kit e produtos"). O título da seção dos níveis vem do vocabulário. */
export const IDS_DAS_SECOES: SecaoId[] = ["evento", "modalidades", "inscricao"];

export const TITULO_FORMULARIO = "Formulário de inscrição";

export const secoes = (t: Vocabulario): { id: SecaoId; titulo: string }[] => [
    { id: "evento", titulo: "Evento" },
    { id: "modalidades", titulo: t.tituloDaSecao },
    { id: "inscricao", titulo: TITULO_FORMULARIO },
];

export const labelDe = <T extends string>(opcoes: Opcao<T>[], id: string) => opcoes.find((o) => o.id === id)?.label ?? "";

/** Ajudas do ícone (?) que não citam os níveis (as que citam ficam em data/vocabulario.ts). */
export const AJUDA = {
    idadeCalculadaEm:
        "Data usada para calcular a idade do atleta. Federações costumam usar o final do ano do evento: quem faz 18 até 31/12 já conta como 18.",
    descontoLegal: "Desconto previsto em lei (idoso 50%, PCD 40%). A taxa de serviço é cobrada proporcionalmente. Não soma com cupom: vale o maior.",
    transferencia: "Define se o atleta pode passar a inscrição para outra pessoa: sempre, só durante a compra ou nunca.",
};

/** Mensagens de erro que não citam os níveis: dizem o motivo e como corrigir (HintText do campo). */
export const MSG = {
    nomeDoEvento: "Informe o nome do evento",
    esporte: "Escolha o esporte",
    dataInvalida: "Informe uma data válida",
    dataPassada: "A data precisa ser futura",
    descricaoLonga: "Passou do limite. Use até 30.000 caracteres na descrição",
    terminoVazio: "Informe quando a prova termina",
    terminoAntes: "O término precisa ser depois da largada",
    idadeAbaixoDoEvento: (min: number) => `A idade mínima do evento é ${min} anos. Ajuste a faixa etária para começar em ${min} ou mais`,
    localVazio: "Busque e escolha o local da largada",
    localFalhou: "Não foi possível buscar agora. Tente de novo em instantes",
    maiorQueZero: "Informe um número maior que zero",
    /** v0.15: vagas da modalidade são obrigatórias (sem "Sem limite"). */
    vagasDaModalidade: "Informe as vagas da modalidade",
    faixaEtaria: "A idade mínima precisa ser menor ou igual à máxima",
    umOuMais: "Informe 1 ou mais",
    nomeDoLote: "Informe o nome do lote",
    valorInvalido: "Informe um valor válido",
    dataLimitePassada: "A data limite precisa ser futura",
    /** v0.8: lote copiado ou duplicado que ainda não foi revisado. Não impede publicar. */
    loteARevisar: "Lote copiado: confira quantidade, valor e data limite",
    faltaPreencher: "Falta preencher",
    textoDaPergunta: "Escreva a pergunta",
    opcaoVazia: "Dê um nome à opção",
    semOpcao: "Adicione ao menos uma opção",
    opcoesEsgotadas: "Todas as opções estão com quantidade 0. Aumente a quantidade ou deixe a pergunta opcional",
    revisarData: "Revise esta data",
};

export const LIMITE_NOME = 70;
/** Texto dos itens fora do escopo do protótipo (menus do AWA). */
export const FORA_DO_ESCOPO = "Fora do escopo do protótipo";

