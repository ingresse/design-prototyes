import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/*  Vocabulário dos dois níveis do catálogo (SCE-80 a SCE-84)          */
/*                                                                     */
/*  A nomenclatura está em definição: o protótipo troca os nomes dos   */
/*  níveis sem mudar a estrutura, para o teste com produtores e o time */
/*  TS. Toda frase que cita um nível sai daqui, inteira, com artigo,   */
/*  gênero e plural do substantivo da variante (como o                 */
/*  textos-criar-evento do AWA). Nenhuma tela escreve "modalidade" ou  */
/*  "categoria" por conta própria.                                     */
/*                                                                     */
/*  Nível 1: o agrupador (no código, `Modalidade`).                    */
/*  Nível 2: o que o atleta compra, com regras e lotes (`Categoria`).  */
/* ------------------------------------------------------------------ */

export type VarianteDeNomes = "modalidade-categoria" | "prova-categoria" | "percurso-categoria" | "categoria-modalidade";

export const VARIANTE_PADRAO: VarianteDeNomes = "modalidade-categoria";

interface Substantivo {
    um: string;
    muitos: string;
    genero: "f" | "m";
}

const MODALIDADE: Substantivo = { um: "modalidade", muitos: "modalidades", genero: "f" };
const CATEGORIA: Substantivo = { um: "categoria", muitos: "categorias", genero: "f" };
const PROVA: Substantivo = { um: "prova", muitos: "provas", genero: "f" };
const PERCURSO: Substantivo = { um: "percurso", muitos: "percursos", genero: "m" };

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Palavras que concordam com o gênero do substantivo. */
const concordancia = (g: "f" | "m") =>
    g === "f"
        ? { a: "a", as: "as", da: "da", das: "das", na: "na", nas: "nas", uma: "uma", nenhuma: "nenhuma", nesta: "nesta", desta: "desta", esta: "esta", outra: "outra", outras: "outras", nova: "nova", toda: "toda", todas: "todas", algumas: "algumas", primeira: "primeira", ela: "ela", removida: "removida", duplicada: "duplicada", criada: "criada", esgotada: "esgotada" }
        : { a: "o", as: "os", da: "do", das: "dos", na: "no", nas: "nos", uma: "um", nenhuma: "nenhum", nesta: "neste", desta: "deste", esta: "este", outra: "outro", outras: "outros", nova: "novo", toda: "todo", todas: "todos", algumas: "alguns", primeira: "primeiro", ela: "ele", removida: "removido", duplicada: "duplicado", criada: "criado", esgotada: "esgotado" };

/** Frases que mudam de sentido por variante (no legado, o 1º nível é o agrupador e o 2º é o que se compra). */
interface Explicacoes {
    subtituloDaSecao: string;
    ajudaDoTipo: string;
    placeholderNivel1: string;
    placeholderNivel2: string;
    /** Linha curta do seletor de protótipo. */
    descricaoDaVariante: string;
    /** Tour (RN-11): o que é cada nível, com exemplo. */
    tourNivel1: string;
    tourNivel2: string;
}

const montar = (n1: Substantivo, n2: Substantivo, ex: Explicacoes) => {
    const a1 = concordancia(n1.genero);
    const a2 = concordancia(n2.genero);
    const conta = (n: number, s: Substantivo) => (n === 1 ? `1 ${s.um}` : `${n} ${s.muitos}`);
    return {
        nivel1: { um: n1.um, muitos: n1.muitos, Um: maiuscula(n1.um), Muitos: maiuscula(n1.muitos) },
        nivel2: { um: n2.um, muitos: n2.muitos, Um: maiuscula(n2.um), Muitos: maiuscula(n2.muitos) },
        ...ex,

        /* Seção e passo */
        tituloDaSecao: `${maiuscula(n1.muitos)} e ${n2.muitos}`,
        tituloDosCartoes: maiuscula(n1.muitos),

        /* Nível 1 */
        vazioNivel1: `${maiuscula(a1.nenhuma)} ${n1.um} ainda`,
        vazioNivel1Descricao: `Crie ${a1.a} ${a1.primeira} ${n1.um}, como 5 km ou 10 km. Depois, ${a2.as} ${n2.muitos} e os lotes de cada ${a1.uma}.`,
        adicionarNivel1: `Adicionar ${n1.um}`,
        nivel1N: (i: number) => `${maiuscula(n1.um)} ${i}`,
        nivel1SemNome: `${maiuscula(n1.um)} sem nome`,
        nivel1Nome: (nome: string) => `${maiuscula(n1.um)} ${nome}`,
        nivel1Removida: (nome: string) => `${nome} ${a1.removida}`,
        nivel1Duplicada: (nome: string, qtdNivel2: number) => `${nome} ${a1.duplicada} com ${conta(qtdNivel2, n2)}`,
        removerNivel1: `Remover ${n1.um}`,
        duplicarNivel1: `Duplicar ${n1.um}`,
        tipoDoNivel1: `Tipo de ${n1.um}`,
        vagasDoNivel1: `Vagas ${a1.da} ${n1.um}`,
        ajudaVagasNivel1: `Total de inscrições aceitas ${a1.nesta} ${n1.um}, somando ${a2.todas} ${a2.as} ${n2.muitos}.`,

        novaNivel1: `${maiuscula(a1.nova)} ${n1.um}`,
        /* v0.5: editar no cartão, duplicar com escolha, ordem por arraste */
        editarNivel1: `Editar ${n1.um}`,
        confirmarAlteracoesNivel1: `Confirmar alterações ${a1.da} ${n1.um}?`,
        confirmarAlteracoesDescricao: (nome: string) => `Confira o que muda em ${nome}. ${maiuscula(a2.as)} ${n2.muitos} e os lotes não mudam.`,
        alteracoesSalvas: (nome: string) => `Alterações salvas em ${nome}`,
        duplicarNivel1Titulo: (nome: string) => `Duplicar ${n1.um} ${nome}`,
        duplicarNivel1Descricao: `Marque ${a2.as} ${n2.muitos} que vão para a cópia. Regras, vagas e lotes vêm junto.`,
        oQueLevar: "O que levar",
        somenteNivel2: `Somente ${a2.as} ${n2.muitos}`,
        somenteNivel2Dica: `${maiuscula(a2.as)} ${a2.nova}s ${n2.muitos} recebem só as perguntas marcadas para ${a2.todas}.`,
        nivel2EFormulario: `${maiuscula(n2.muitos)} e formulário de inscrição`,
        nivel2EFormularioDicaDuplicar: `${maiuscula(a2.as)} ${a2.nova}s ${n2.muitos} recebem as mesmas perguntas das originais, com a mesma obrigatoriedade.`,
        nivel2EFormularioDicaCopiar: `Trazemos as perguntas do evento ligadas ${a2.as === "as" ? "às" : "aos"} ${n2.muitos} marcad${a2.as}. As que têm quantidade disponível pedem revisão.`,
        nivel2Marcadas: (marcadas: number, total: number) => `${marcadas} de ${total} ${total === 1 ? n2.um : n2.muitos}`,
        ordemNivel1Titulo: `Confirmar alteração da ordem ${a1.das} ${n1.muitos}?`,
        ordemNivel1Texto: (nome: string) => `A ordem ${a1.da} ${n1.um} ${nome} no evento será alterada.`,
        ordemNivel2Titulo: `Confirmar alteração da ordem ${a2.das} ${n2.muitos}?`,
        ordemNivel2Texto: (nome: string, nomeNivel1: string) => `A ordem ${a2.da} ${n2.um} ${nome} dentro ${a1.da} ${n1.um} ${nomeNivel1} será alterada.`,
        criarNivel1: `Criar ${n1.um}`,
        // v0.4: ${n1.um} nova nasce sem ${n2.muitos} (a "Geral" automática saiu, RN-10 revogada).
        nivel1Criada: (nome: string) => `${nome} ${a1.criada}. Agora crie ${a2.as} ${n2.muitos}.`,
        criarNivel1Descricao: `Depois, você cria ${a2.as} ${n2.muitos} e os lotes no cartão ${a1.da} ${n1.um}.`,

        /* Nível 2 */
        listaNivel2: maiuscula(n2.muitos),
        nivel2De: (nomeNivel1: string) => `${maiuscula(n2.muitos)} de ${nomeNivel1}`,
        adicionarNivel2: `Adicionar ${n2.um}`,
        vazioNivel2: `${maiuscula(a2.nenhuma)} ${n2.um} ${a1.nesta} ${n1.um}`,
        vazioNivel2Descricao: `Crie ${a2.a} ${a2.primeira} ${n2.um}, como Geral, 60+ ou PCD, com regras e lotes próprios. Para publicar, ${a1.toda} ${n1.um} precisa de ao menos ${a2.uma}.`,
        criarPrimeiraNivel2: `Criar ${a2.a} ${a2.primeira} ${n2.um}`,
        nivel2SemNome: `${maiuscula(n2.um)} sem nome`,
        nivel2Nome: (nome: string) => `${maiuscula(n2.um)} ${nome}`,
        novaNivel2: `${maiuscula(a2.nova)} ${n2.um}`,
        nivel2Removida: (nome: string) => `${nome} ${a2.removida}`,
        removerNivel2: `Remover ${n2.um}`,
        duplicarNivel2: `Duplicar ${n2.um}`,
        editarNivel2: (nome: string) => `Editar ${nome}`,
        nomeDoNivel2: `Nome ${a2.da} ${n2.um}`,
        nomeDoNivel1: `Nome ${a1.da} ${n1.um}`,
        /* v0.7: cópia guiada (SCE-180 a SCE-184) */
        guiadaEscolherTitulo: "Escolher o que trazer",
        guiadaEscolherDescricao: `Marque ${a1.as} ${n1.muitos} e ${a2.as} ${n2.muitos} do evento copiado que entram neste evento. O que ficar desmarcado não é criado, e as perguntas do formulário deixam de aparecer ${a2.nas} ${n2.muitos} que saírem.`,
        guiadaRevisarTitulo: `Revisar ${n1.muitos}, ${n2.muitos} e lotes`,
        guiadaRevisarDescricao: "Os valores vêm da cópia. Confira cada lote e marque como revisado (mexer num campo também marca). A data limite é opcional: em branco, o lote vira quando esgota. Você pode deixar algo para depois.",
        guiadaRevisarNivel2: `Revisar ${a2.a} ${n2.um} e os lotes`,
        guiadaConfirmarTitulo: "Confirmar alterações?",
        guiadaConfirmarDescricao: `Confira o que mudou em relação à cópia. Depois, você segue para a lista de ${n1.muitos}.`,
        guiadaConcluida: `${maiuscula(n1.muitos)} e ${n2.muitos} conferid${a1.as}`,
        duplicarNivel2Titulo: (nome: string) => `Duplicar ${n2.um} ${nome}`,
        duplicarNivel1EscolherDescricao: `Marque ${a2.as} ${n2.muitos} que vão para a cópia e escolha se o formulário vem junto. No próximo passo, você revisa nomes e lotes.`,
        copiarNivel1EscolherDescricao: `Escolha o evento e marque ${a1.as} ${n1.muitos} e ${a2.as} ${n2.muitos} que você quer trazer. No próximo passo, você revisa nomes e lotes.`,
        desfazerCopia: "Desfazer a cópia",
        copiaDesfeita: "Cópia desfeita",
        ajustar: "Revisar",
        lotesParaRevisar: (n: number) => (n === 1 ? "1 lote para revisar" : `${n} lotes para revisar`),
        camposEmBranco: (n: number) => (n === 1 ? "1 campo em branco" : `${n} campos em branco`),
        vagasDoNivel2: `Vagas ${a2.da} ${n2.um}`,
        ajudaVagasNivel2: `Limite só ${a2.desta} ${n2.um}. Quando acabar, ${a2.ela} aparece como ${a2.esgotada}, mesmo que ${a1.a} ${n1.um} ainda tenha vagas.`,
        ajudaIdadeMinima: `Vale para ${a2.todas} ${a2.as} ${n2.muitos} do evento. A faixa etária de cada ${n2.um} precisa começar nesta idade ou depois.`,
        ajudaFaixaEtaria: `Idade mínima e máxima para se inscrever ${a2.nesta} ${n2.um}. Deixe em branco para não limitar.`,
        dicaMaximoPorPedido: `Quantas inscrições ${a2.desta} ${n2.um} cabem num pedido.`,
        faltamAjustes: (n: number) => (n === 1 ? `Falta 1 ajuste ${a2.nesta} ${n2.um}` : `Faltam ${n} ajustes ${a2.nesta} ${n2.um}`),

        colunaNivel2: maiuscula(n2.um),
        voltarParaNivel1: (nome: string) => `Voltar para ${nome}`,
        concluirNivel2: `Concluir ${n2.um}`,
        informacoesDoNivel2: `Informações ${a2.da} ${n2.um}`,
        menuInscricoes: "Inscrições",

        /* Mensagens de erro (dizem o motivo e como corrigir) */
        msgNomeNivel1: `Informe o nome ${a1.da} ${n1.um}`,
        msgNivel1Repetida: `Já existe ${a1.uma} ${n1.um} com esse nome`,
        msgTipoNivel1: `Escolha o tipo de ${n1.um}`,
        msgSemNivel1: `Adicione ao menos ${a1.uma} ${n1.um}`,
        msgNomeNivel2: `Informe o nome ${a2.da} ${n2.um}`,
        msgNivel2Repetida: `Já existe ${a2.uma} ${n2.um} com esse nome ${a1.nesta} ${n1.um}`,
        msgSemNivel2: `Adicione ao menos ${a2.uma} ${n2.um} ${a1.nesta} ${n1.um}`,
        msgSemLote: `Adicione ao menos um lote ${a2.nesta} ${n2.um}`,

        /* Contexto das pendências */
        contextoNivel1: (nome: string) => `${maiuscula(n1.um)} ${nome}`,
        contextoNivel2: (nomeNivel1: string, nomeNivel2: string) => `${nomeNivel1}, ${n2.um} ${nomeNivel2}`,

        /* Revisão, sucesso e início */
        semNivel2: `Sem ${n2.muitos}`,
        listaDeNivel2: (n: number, nomes: string) => `${n === 1 ? maiuscula(n2.um) : maiuscula(n2.muitos)}: ${nomes}`,
        sucesso: (evento: string, qtd1: number, qtd2: number) => `${evento} já aparece no site e aceita inscrições em ${conta(qtd1, n1)} e ${conta(qtd2, n2)}.`,
        /* Copiar ${n1.muitos} de outro evento (v0.4, SCE-159) */
        copiarNivel1DeOutroEvento: `Copiar de outro evento`,
        copiarNivel1Titulo: `Copiar ${n1.muitos} de outro evento`,
        copiarNivel1Descricao: `Escolha o evento e marque ${a1.as} ${n1.muitos} e ${a2.as} ${n2.muitos} que você quer trazer.`,
        copiarNivel1Escolha: `${maiuscula(n1.muitos)} e ${n2.muitos} para copiar`,
        copiarNivel1Botao: (n: number) => `Copiar ${conta(n, n1)}`,
        copiarNivel1Copiadas: (n: number, qtdNivel2: number, evento: string) =>
            `${n === 1 ? `1 ${n1.um} copiad${a1.a}` : `${n} ${n1.muitos} copiad${a1.as}`} de ${evento}, com ${conta(qtdNivel2, n2)}`,
        copiarNivel1NadaMarcado: `Marque ao menos ${a1.uma} ${n1.um} para copiar`,
        copiarNivel1SemNivel2: `${maiuscula(n1.muitos)} sem ${n2.muitos} marcad${a2.as} entram vazi${a1.as}; você cria ${a2.as} ${n2.muitos} depois.`,
        copiarNivel1Contagem: (marcadas: number, total: number) => `${marcadas} de ${total} ${total === 1 ? n2.um : n2.muitos}`,
        copiarNivel1Traz: `${maiuscula(a2.as)} ${n2.muitos} com regras (sexo, faixa etária, desconto), vagas e lotes (nome, preço e quantidade).`,
        copiarNivel1NaoTraz: `Inscritos, cupons e datas de venda: a data limite dos lotes fica em branco (opcional). Nome repetido ganha "(cópia)". Os lotes copiados vêm marcados para revisar.`,
        marcarNivel1: (nome: string) => `Copiar ${n1.um} ${nome}`,
        oQueACopiaTraz: `Copiamos ${n1.muitos}, ${n2.muitos}, lotes e perguntas do formulário. Datas de venda, inscritos e cupons não são copiados.`,

        /* Formulário de inscrição (perguntas) */
        todasAsDuas: `${maiuscula(a1.todas)} ${a1.as} ${n1.muitos} e ${n2.muitos}`,
        soEmAlgumas: `Só em ${a2.algumas} ${n2.muitos}`,
        ondeAparece: "Onde aparece",
        resumoDoVinculo: (qtd: number) => (qtd === 0 ? `Não aparece em ${a2.nenhuma} ${n2.um}` : `Em ${conta(qtd, n2)}`),
        marcarNivel1Inteira: (nome: string) => `${nome}: marcar ${a1.toda} ${a1.a} ${n1.um}`,
        perguntasDaNivel2: `Perguntas do formulário ${a2.desta} ${n2.um}`,
        perguntasDaNivel2Descricao: `Ligue o que ${a2.esta} ${n2.um} pergunta ao atleta. ${maiuscula(a2.nova)} ${n2.um} recebe sozinha as perguntas marcadas para ${a2.todas}.`,
        verComoAtleta: "Ver formulário como atleta de",
        escolhaNivel2DaPrevia: `${maiuscula(n1.um)} e ${n2.um}`,
        opcaoDaPrevia: (nomeNivel1: string, nomeNivel2: string) => `${nomeNivel1}, ${nomeNivel2}`,
        semPerguntasNaPrevia: `Nenhuma pergunta para ${a2.esta} ${n2.um}. O atleta só preenche o cadastro.`,
        /* v0.5: formulário em linhas recolhidas (SCE-170) */
        todasNivel2: `${maiuscula(a2.todas)} ${a2.as} ${n2.muitos}`,
        ajudaDoFormulario: `O que o atleta responde ao se inscrever, na ordem em que aparece. Clique sobre a pergunta para editar ou ver ${a1.as} ${n1.muitos} e ${a2.as} ${n2.muitos} vinculad${a2.as}.`,
        vinculoResumo: (qtdNivel2: number, qtdNivel1: number) => (qtdNivel2 === 0 ? `${maiuscula(a2.nenhuma)} ${n2.um}` : `${conta(qtdNivel2, n2)} em ${conta(qtdNivel1, n1)}`),
        nivel2Vinculadas: `${maiuscula(n2.muitos)} vinculad${a2.as}`,
        nivel2VinculadasDica: `Marque onde a pergunta aparece. Com "${maiuscula(a2.todas)} ${a2.as} ${n2.muitos}" marcado, ${a2.as} ${n2.muitos} criad${a2.as} depois também recebem a pergunta.`,
        colunaNivel1: maiuscula(n1.um),
        /* Duplicar de outra categoria (SCE-173) */
        duplicarDeOutraNivel2: `Duplicar de outr${a2.a} ${n2.um}`,
        duplicarDeOutraNivel2Descricao: `As perguntas escolhidas passam a aparecer também ${a2.nas} ${n2.muitos} de destino, com a mesma obrigatoriedade. É um vínculo: a pergunta continua uma só.`,
        nivel2DeOrigem: `${maiuscula(n2.um)} de origem`,
        nivel2DeDestino: `Vincular ${a2.as === "as" ? "às" : "aos"} ${n2.muitos}`,
        semPerguntasNaOrigem: `Nenhuma pergunta ${a2.nesta} ${n2.um}. Escolha outr${a2.a}.`,
        semOutraNivel2: `Não há outr${a2.a} ${n2.um} neste evento.`,
        msgEscolhaOrigem: `Escolha ${a2.a} ${n2.um} de origem`,
        msgEscolhaDestino: `Marque ao menos ${a2.uma} ${n2.um} de destino`,
        msgEscolhaPergunta: "Marque ao menos uma pergunta",
        perguntasVinculadas: (qtdPerguntas: number, qtdNivel2: number) =>
            `${qtdPerguntas === 1 ? "1 pergunta vinculada" : `${qtdPerguntas} perguntas vinculadas`} a ${conta(qtdNivel2, n2)}`,
        /* Quantidade disponível a revisar (SCE-172) */
        revisarQuantidade: "Revisar quantidade disponível",
        alertaRevisarQuantidade: (n: number) =>
            `${n === 1 ? "1 pergunta veio" : `${n} perguntas vieram`} de outro evento com opções sem quantidade disponível. O estoque é de cada evento: defina antes de publicar.`,
        avisoRevisarQuantidade: "Veio de outro evento: defina a quantidade disponível de cada opção",
        opcoesSemQuantidade: (n: number, total: number) => `${n} de ${total} ${total === 1 ? "opção" : "opções"} sem quantidade definida.`,

        /* Tour (RN-11) */
        tourIntro: `Em poucos passos: o evento, ${a1.as} ${n1.muitos} com ${a2.as} ${n2.muitos} e os lotes, e o formulário de inscrição.`,
        tourLote: `Lote é o preço e as vagas de cada fase da venda, dentro de cada ${n2.um}. Ex.: 1º lote de R$ 89,90 com 200 vagas. Ele vira sozinho quando esgota ou na data limite.`,
        tourFormulario: `As perguntas que o atleta responde ao se inscrever, como tamanho da camiseta e contato de emergência. Você escolhe em quais ${n2.muitos} cada pergunta aparece.`,

        /* Avisos que não impedem publicar */
        avisoNivel2SemPergunta: "Nenhuma pergunta no formulário",
        avisoPerguntaSemVinculo: `Não aparece em ${a2.nenhuma} ${n2.um}. Escolha onde ela aparece ou remova a pergunta`,
        avisoQuantidade: (soma: number, capacidade: number) =>
            `As quantidades somam ${soma.toLocaleString("pt-BR")}, mas ${a2.as} ${n2.muitos} desta pergunta aceitam até ${capacidade.toLocaleString("pt-BR")} inscrições. Atletas podem ficar sem opção`,
        avisoQuantidadeSemLimite: `As opções têm quantidade limitada e ${a2.as} ${n2.muitos} desta pergunta não têm limite de vagas. Atletas podem ficar sem opção`,

        /* RN-12: nome que sugere uma regra não configurada */
        alertaIdade: `O nome sugere uma faixa etária, mas ${a2.esta} ${n2.um} aceita qualquer idade.`,
        alertaSexo: (sexo: string) => `O nome sugere ${sexo}, mas ${a2.esta} ${n2.um} aceita atletas de qualquer sexo.`,
        alertaPcd: `O nome sugere PCD, mas ${a2.esta} ${n2.um} não tem o desconto PCD.`,
    };
};

export type Vocabulario = ReturnType<typeof montar>;

const AJUDA_DO_TIPO = "Classificação padrão da prova. Usamos para organizar resultados e para encontrar atletas que correm essa distância.";

export const VARIANTES: Record<VarianteDeNomes, { rotulo: string; t: Vocabulario }> = {
    "modalidade-categoria": {
        rotulo: "Modalidade e categoria (padrão)",
        t: montar(MODALIDADE, CATEGORIA, {
            subtituloDaSecao: "Cada modalidade é uma prova. As categorias dividem os atletas e têm os próprios lotes.",
            ajudaDoTipo: AJUDA_DO_TIPO,
            placeholderNivel1: "Ex.: 10 km",
            placeholderNivel2: "Ex.: Geral, 60+, Feminino 18–29",
            descricaoDaVariante: "Modalidade é a prova (5 km, 10 km); categoria é o público e as regras (Geral, 60+).",
            tourNivel1: "Modalidade é a prova que o atleta corre. Ex.: Corrida 5 km, Corrida 10 km.",
            tourNivel2: "Categoria divide os atletas de uma modalidade, com regras e lotes próprios. Ex.: Geral, 60+, PCD.",
        }),
    },
    "prova-categoria": {
        rotulo: "Prova e categoria",
        t: montar(PROVA, CATEGORIA, {
            subtituloDaSecao: "Cada prova é uma distância do evento. As categorias dividem os atletas e têm os próprios lotes.",
            ajudaDoTipo: AJUDA_DO_TIPO,
            placeholderNivel1: "Ex.: 10 km",
            placeholderNivel2: "Ex.: Geral, 60+, Feminino 18–29",
            descricaoDaVariante: "Prova é a distância (5 km, 10 km); categoria é o público e as regras.",
            tourNivel1: "Prova é a distância que o atleta corre. Ex.: Corrida 5 km, Corrida 10 km.",
            tourNivel2: "Categoria divide os atletas de uma prova, com regras e lotes próprios. Ex.: Geral, 60+, PCD.",
        }),
    },
    "percurso-categoria": {
        rotulo: "Percurso e categoria",
        t: montar(PERCURSO, CATEGORIA, {
            subtituloDaSecao: "Cada percurso é uma distância do evento. As categorias dividem os atletas e têm os próprios lotes.",
            ajudaDoTipo: "Classificação padrão do percurso. Usamos para organizar resultados e para encontrar atletas que correm essa distância.",
            placeholderNivel1: "Ex.: 10 km",
            placeholderNivel2: "Ex.: Geral, 60+, Feminino 18–29",
            descricaoDaVariante: "Percurso é a distância (5 km, 10 km); categoria é o público e as regras.",
            tourNivel1: "Percurso é a distância que o atleta corre. Ex.: Corrida 5 km, Corrida 10 km.",
            tourNivel2: "Categoria divide os atletas de um percurso, com regras e lotes próprios. Ex.: Geral, 60+, PCD.",
        }),
    },
    "categoria-modalidade": {
        rotulo: "Categoria e modalidade (legado TS)",
        t: montar(CATEGORIA, MODALIDADE, {
            subtituloDaSecao: "Cada categoria agrupa as modalidades de uma prova, como 10 km. A modalidade é o que o atleta compra: tem as regras e os próprios lotes.",
            ajudaDoTipo: "Classificação padrão da prova desta categoria. Usamos para organizar resultados e para encontrar atletas que correm essa distância.",
            placeholderNivel1: "Ex.: 10 km",
            placeholderNivel2: "Ex.: Geral, 60+, Feminino 18–29",
            descricaoDaVariante: "Como no painel legado: categoria agrupa (10 km); modalidade é o que o atleta compra, com as regras (Geral, 60+).",
            tourNivel1: "Categoria agrupa o que se vende de uma prova. Ex.: Corrida 5 km, Corrida 10 km.",
            tourNivel2: "Modalidade é o que o atleta compra dentro da categoria, com regras e lotes próprios. Ex.: Geral, 60+, PCD.",
        }),
    },
};

export const ehVariante = (v: string | null | undefined): v is VarianteDeNomes => !!v && Object.prototype.hasOwnProperty.call(VARIANTES, v);

/* Escolha da variante: fica no navegador (localStorage) e vale para o rascunho e as duas versões. */

const CHAVE = "sports-criar-evento-nomes";

const lerVariante = (): VarianteDeNomes => {
    try {
        const v = localStorage.getItem(CHAVE);
        return ehVariante(v) ? v : VARIANTE_PADRAO;
    } catch {
        return VARIANTE_PADRAO;
    }
};

let variante: VarianteDeNomes = typeof window === "undefined" ? VARIANTE_PADRAO : lerVariante();
const ouvintes = new Set<() => void>();

export function escolherVariante(v: VarianteDeNomes) {
    if (v === variante) return;
    variante = v;
    try {
        localStorage.setItem(CHAVE, v);
    } catch {
        /* sem armazenamento: vale só nesta aba */
    }
    ouvintes.forEach((o) => o());
}

const assinar = (o: () => void) => {
    ouvintes.add(o);
    return () => ouvintes.delete(o);
};

/** Variante escolhida e as frases dela. */
export function useVocabulario() {
    const v = useSyncExternalStore(assinar, () => variante, () => variante);
    return { variante: v, t: VARIANTES[v].t };
}
