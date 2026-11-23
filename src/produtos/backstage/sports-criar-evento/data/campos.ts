/* Ids dos campos na tela: o wrapper de cada campo tem este id, para rolar e focar no erro. */

export const CAMPO = {
    nome: "campo-nome",
    esporte: "campo-esporte",
    largada: "campo-largada",
    local: "campo-local",
    imagem: "campo-imagem",
    termino: "campo-termino",
    idadeMinima: "campo-idade-minima",
    percurso: "campo-percurso",
    termoDeUso: "campo-termo-de-uso",
    limitePorComprador: "campo-limite-por-comprador",
    emailInfo: "campo-email-info",
    emailBanner: "campo-email-banner",
    trocaInicio: "campo-troca-inicio",
    trocaFim: "campo-troca-fim",
    descricao: "campo-descricao",
    modalidades: "campo-modalidades",
    modNome: (id: string) => `campo-mod-${id}-nome`,
    modTipo: (id: string) => `campo-mod-${id}-tipo`,
    modVagas: (id: string) => `campo-mod-${id}-vagas`,
    modCategorias: (id: string) => `campo-mod-${id}-categorias`,
    catNome: (id: string) => `campo-cat-${id}-nome`,
    catIdade: (id: string) => `campo-cat-${id}-idade`,
    catVagas: (id: string) => `campo-cat-${id}-vagas`,
    catMaximo: (id: string) => `campo-cat-${id}-maximo`,
    catLotes: (id: string) => `campo-cat-${id}-lotes`,
    loteNome: (id: string) => `campo-lote-${id}-nome`,
    loteValor: (id: string) => `campo-lote-${id}-valor`,
    loteVagas: (id: string) => `campo-lote-${id}-vagas`,
    loteLimite: (id: string) => `campo-lote-${id}-limite`,
    catPerguntas: (id: string) => `campo-cat-${id}-perguntas`,
    pergunta: (id: string) => `campo-pergunta-${id}`,
    perguntaTexto: (id: string) => `campo-pergunta-${id}-texto`,
    perguntaOpcoes: (id: string) => `campo-pergunta-${id}-opcoes`,
    perguntaVinculo: (id: string) => `campo-pergunta-${id}-vinculo`,
    opcaoNome: (id: string) => `campo-opcao-${id}-nome`,
    aberturas: "campo-aberturas",
    aberturaNome: (id: string) => `campo-abertura-${id}-nome`,
    aberturaInicio: (id: string) => `campo-abertura-${id}-inicio`,
    aberturaFim: (id: string) => `campo-abertura-${id}-fim`,
    cfgPublico: (a: string, c: string) => `campo-abertura-${a}-config-${c}-publico`,
    cfgCategorias: (a: string, c: string) => `campo-abertura-${a}-config-${c}-categorias`,
    cfgCanais: (a: string, c: string) => `campo-abertura-${a}-config-${c}-canais`,
};

/** Rola até o campo e põe o foco no controle dele (não no ícone de ajuda do rótulo), sem pular a rolagem. */
export function irParaCampo(id: string) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Em ordem: campo de texto, segmento de data, gatilho de lista, depois qualquer botão.
    const alvos = [
        "input:not([type=hidden]):not([tabindex='-1']):not([disabled]), textarea",
        "[role=spinbutton]",
        "button[aria-haspopup]",
        "button:not([disabled])",
    ];
    const alvo = el.matches("input, textarea") ? el : alvos.map((s) => el.querySelector<HTMLElement>(s)).find(Boolean);
    alvo?.focus({ preventScroll: true });
    return true;
}

/** Hora atual em HH:MM no idioma da pessoa. */
export const horaAgora = () => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());

/** Agora em ISO local `AAAA-MM-DDTHH:mm`, para comparar com os campos de data. */
export const agoraIsoLocal = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const formatarDataHora = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(d);
};

/* v0.69 (SCE-340): os valores seguem a moeda do evento (Informações da prova › Moeda); o rascunho avisa a troca. */
let moedaDoEvento = "BRL";
export const definirMoeda = (moeda?: string) => {
    moedaDoEvento = moeda || "BRL";
};

/** Valor na moeda do evento (o nome ficou do tempo em que só havia real). */
export const formatarReais = (v: number | null) =>
    v == null ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: moedaDoEvento }).format(v);

/** Formato dos campos de valor; `currency` é lido na hora, então acompanha a moeda do evento. */
export const FORMATO_REAIS: Intl.NumberFormatOptions = {
    style: "currency",
    get currency() {
        return moedaDoEvento;
    },
};

/** Símbolo da moeda do evento ("R$", "US$", "€"…), para rótulos como "Desconto (R$)". */
export const simboloDaMoeda = () =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: moedaDoEvento }).formatToParts(0).find((p) => p.type === "currency")?.value ?? moedaDoEvento;
