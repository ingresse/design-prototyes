import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { useMapasDaOrganizacao } from "../../components/mapas-da-organizacao";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Button as AriaButton, ComboBox as AriaComboBox, Input as AriaInput, ListBox as AriaListBox } from "react-aria-components";
import { AtSign, ChevronDown, PlayCircle, Plus, RefreshCw01, Tag01, Trash01, XClose } from "@untitledui/icons";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { HintText } from "@/components/base/input/hint-text";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { Tag, TagGroup, TagList } from "@/components/base/tags/tags";
import { Popover } from "@/components/base/select/popover";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir, useTransicao } from "@/components/foundations/transicao";
import { atualizarEvento, useColecao, useDoc, type ConfiguracoesAvancadas, type EntradaDoLocal, type Evento as EventoDoBanco, type Modalidade, type TipoEvento } from "@/plataforma";
import { categoriaDoEvento, categoriasDoTipo, doMapa, GRUPO_POR_ID, registrarCriacao, TAG_POR_ID, TAGS, tagsValidas, type ContextoDasTags } from "@/plataforma/categorias";
import { cx } from "@/utils/cx";
import { BackstageLayout, prepararGuiaDoEventoNovo } from "../../components/Backstage";
import { DescricaoRica, paragrafosDoHtml } from "../../components/descricao-rica";
import { useOrganizacaoAtual } from "../../organizacoes/data/organizacao-atual";
import { AVANCADO_PADRAO } from "../data/configuracoes-avancadas";
import { CronogramaDeSessoes, temCronograma, type SessaoExtra } from "../components/cronograma-de-sessoes";
import { fimEfetivo, PeriodoDoEvento } from "../components/periodo-do-evento";
import { IDADES_COM_CLASSIFICACAO } from "../components/classificacao-indicativa";
import { criarEvento, useEventoAtual } from "../data/eventos";
import { useTagsDoEvento } from "../data/tags-do-evento";
import { CaixaDeEnvio, CampoBanner, CampoBannerCompacto, exportarRecorte, useBannerNaColuna, type BannerDoEvento, type ImagemDoBanner, type Recorte } from "../components/campo-banner";
import { CampoEntradas, entradasParaGravar, entradasRepetidas } from "../components/campo-entradas";
import { lerVideo } from "../data/video-do-evento";
import { lerInstagram } from "../data/instagram-do-evento";
import { buscarLocais, useOpcoesEvento, type LocalEncontrado, type Opcao } from "../data/opcoes-evento";
import { CampoOpcaoDaOrganizacao, CONTORNO_DE_ERRO } from "../components/campo-opcao-da-organizacao";
import { TIPOS_DE_EVENTO, tipoDeEvento } from "../data/tipos-evento";
import { formatar, useTextos, vocabularioDe } from "../data/textos-criar-evento";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { protegerTrocaDeEvento } from "../../components/troca-de-evento";
import { vendasDoEvento } from "../data/vendas";

/* ------------------------------------------------------------------ */
/*  Criar evento por tipo (EVT-50 a EVT-66)                            */
/*                                                                     */
/*  O tipo vem do menu "Criar evento" em Eventos (`?tipo=`). Tela      */
/*  cheia: são ~20 campos. Só Partida (futebol) e Modalidade           */
/*  (esportivo) mudam os campos, e o esportivo troca o vocabulário     */
/*  (inscrição, participante, largada).                                */
/*  Descrições na tela só dizem o que a especificação diz: regra de    */
/*  negócio não confirmada não aparece como texto de ajuda.            */
/* ------------------------------------------------------------------ */

const MODALIDADES: Opcao[] = [
    { id: "corrida", label: "Corrida" },
    { id: "natacao", label: "Natação" },
    { id: "trilha", label: "Trilha" },
    { id: "ciclismo", label: "Ciclismo" },
];

/** Idade mínima com as caixas da classificação indicativa (EVT-94). */
const IDADES: Opcao[] = IDADES_COM_CLASSIFICACAO;



interface Imagem {
    nome: string;
    url: string;
    dataUrl: string;
}

interface Formulario {
    tipo: TipoEvento;
    campeonatoId: string;
    mandanteId: string;
    visitanteId: string;
    programaMembrosId: string;
    modalidade: Modalidade | "";
    /** Show ou festa: categoria escolhida no dropdown (EVT-97). */
    categoriaId: string;
    /** Show ou festa: o que a pessoa escreveu sobre o evento, no campo aberto. As tags saem daqui (EVT-97). */
    categoriaEscrito: string;
    /** Tags tiradas pelo X no campo: somem até a próxima busca e, sem busca nova, não são gravadas. */
    tagsRemovidas: string[];
    /** Edição (EVT-127): tags do evento, escolhidas na busca do catálogo ou adicionadas pela leitura automática. */
    tagsEscolhidas: string[];
    /** Das escolhidas, as que a leitura automática adicionou (mostram o ícone de automática). */
    tagsAutomaticas: string[];
    nome: string;
    /** O nome foi digitado: para de seguir a sugestão "Mandante x Visitante". */
    nomeEditado: boolean;
    /** Local escolhido na busca de endereço (nome e cidade vêm da API). */
    local: LocalEncontrado | null;
    /** ISO local `AAAA-MM-DDTHH:mm`. */
    inicio: string;
    fim: string;
    /** O fim foi preenchido pela sugestão (início + 4 h) e ainda segue o início. */
    fimSugerido: boolean;
    /** Sessões além da primeira (a primeira é o início). O id dá a cada linha uma chave estável para animar a saída. */
    /** Sessões criadas pela pessoa (dia, início e fim); vazio = uma sessão só, no início do evento (EVT-89). */
    sessoesExtras: SessaoExtra[];
    /** Com mais de um dia: direto, com início e fim gerais, ou em sessões, só com os horários delas (EVT-98). */
    formato: "continuo" | "sessoes";
    moeda: string;
    idadeMinima: string;
    descricao: string;
    banner: ImagemDoBanner | null;
    /** Parte da imagem que vira o banner (EVT-81). */
    recorteBanner: Recorte | null;
    /** Banners depois do principal, na ordem (EVT-164). O principal são `banner` e `recorteBanner`, que a leitura das tags usa. */
    bannersExtras: BannerDoEvento[];
    /** Link do vídeo opcional, como a pessoa colou (EVT-165). */
    video: string;
    /** Instagram do evento, como a pessoa escreveu (@perfil ou link), opcional (EVT-168). */
    instagram: string;
    /** Entradas (portões) do local, opcionais (EVT-166). */
    entradas: EntradaDoLocal[];
    mapaTipo: "imagem" | "assentos";
    mapaImagem: Imagem | null;
    mapaId: string;
    avancado: ConfiguracoesAvancadas;
}

const INICIAL: Omit<Formulario, "tipo"> = {
    campeonatoId: "",
    mandanteId: "",
    visitanteId: "",
    programaMembrosId: "",
    modalidade: "",
    categoriaId: "",
    categoriaEscrito: "",
    tagsRemovidas: [],
    tagsEscolhidas: [],
    tagsAutomaticas: [],
    nome: "",
    nomeEditado: false,
    local: null,
    inicio: "",
    fim: "",
    fimSugerido: false,
    sessoesExtras: [],
    formato: "continuo",
    moeda: "BRL",
    idadeMinima: "0",
    descricao: "",
    banner: null,
    recorteBanner: null,
    bannersExtras: [],
    video: "",
    instagram: "",
    entradas: [],
    mapaTipo: "imagem",
    mapaImagem: null,
    mapaId: "",
    avancado: AVANCADO_PADRAO,
};


const lerComoDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
    });

type Erros = Partial<Record<"mandante" | "visitante" | "modalidade" | "categoria" | "nome" | "local" | "entradas" | "inicio" | "fim" | "descricao" | "video" | "instagram" | "sessoes" | "mapa", string>>;

/** Evento em sessões (num dia só ou em vários): vale o horário das sessões, não o geral (EVT-98). */
const emSessoes = (f: Formulario) => !!f.inicio && !!f.fim && f.formato === "sessoes";

/** Índices das sessões com problema (vazia ou fora dos dias do evento). */
const sessoesInvalidas = (f: Formulario) =>
    new Set(
        emSessoes(f)
            ? f.sessoesExtras.flatMap(({ valor: s }, i) => (!s || s.slice(0, 10) < f.inicio.slice(0, 10) || s.slice(0, 10) > f.fim.slice(0, 10) ? [i] : []))
            : [],
    );

/** Fim de uma sessão em ISO local: no mesmo dia, ou no seguinte se o horário de fim é antes do início. */
const fimDaSessao = (s: SessaoExtra) => {
    if (!s.fim) return s.valor;
    if (s.fim > s.valor.slice(11, 16)) return `${s.valor.slice(0, 10)}T${s.fim}`;
    const d = new Date(`${s.valor.slice(0, 10)}T12:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${s.fim}`;
};

function validar(f: Formulario): Erros {
    const e: Erros = {};
    if (f.tipo === "futebol") {
        if (!f.mandanteId) e.mandante = "Escolha o time mandante.";
        if (!f.visitanteId) e.visitante = "Escolha o time visitante.";
        else if (f.visitanteId === f.mandanteId) e.visitante = "Escolha outro time: o visitante não pode ser o mandante.";
    }
    if (f.tipo === "esportivo" && !f.modalidade) e.modalidade = "Escolha a modalidade.";
    if (f.tipo === "show" && !f.categoriaId) e.categoria = "Escolha a categoria.";
    if (!f.nome.trim()) e.nome = "Dê um nome ao evento.";
    if (!f.local) e.local = "Busque e escolha o local do evento.";
    if (entradasRepetidas(f.entradas).size > 0) e.entradas = "Dê um nome diferente a cada entrada do local.";
    if (f.video.trim() && !lerVideo(f.video)) e.video = "Cole um link do YouTube ou do Vimeo.";
    if (f.instagram.trim() && !lerInstagram(f.instagram)) e.instagram = "Use o @ do perfil ou o link do Instagram.";
    if (!paragrafosDoHtml(f.descricao).length) e.descricao = "Conte o que vai acontecer no evento.";
    if (!f.inicio) e.inicio = "Escolha quando o evento acontece.";
    // Em sessões não há horário geral: o que vale é ter ao menos uma sessão (EVT-98).
    if (!emSessoes(f)) {
        if (!f.fim) e.fim = "Informe quando o evento termina.";
        // Num dia só, fim antes do início termina no dia seguinte (EVT-129); igual ao início, não.
        else if (f.inicio && fimEfetivo(f.inicio, f.fim) <= f.inicio) e.fim = "Escolha um fim depois do início.";
    }
    const ruins = sessoesInvalidas(f);
    if (emSessoes(f) && f.sessoesExtras.length === 0) e.sessoes = f.tipo === "esportivo" ? "Adicione ao menos uma largada." : "Adicione ao menos uma sessão.";
    else if (ruins.size > 0) {
        e.sessoes = f.sessoesExtras.some((s) => !s.valor)
            ? "Preencha a data das sessões destacadas ou remova as vazias."
            : "Mova as sessões destacadas para dentro do período do evento.";
    }
    if (f.mapaTipo === "assentos" && !f.mapaId) e.mapa = "Escolha o mapa de assentos ou envie uma imagem.";
    return e;
}

export function CriarEvento() {
    const [params] = useSearchParams();
    const tipo = tipoDeEvento(params.get("tipo"));
    // EVT-51: sem tipo válido não há o que criar; volta para Eventos, onde o menu escolhe o tipo.
    if (!tipo) return <Navigate to="/backstage/eventos" replace />;
    // O tipo se troca no próprio formulário, sem perder o que é comum (EVT-163): a URL só acompanha.
    return <FormularioDeEvento tipo={tipo.id} titulo={tipo.titulo} />;
}

/* ------------------------------------------------------------------ */
/*  Editar evento (EVT-120 a EVT-127): o mesmo formulário da criação,  */
/*  preenchido com o evento em contexto, em Informações do evento.     */
/* ------------------------------------------------------------------ */

/** Recorte da imagem inteira: a capa gravada já é o recorte 4:5 (EVT-81). */
const RECORTE_INTEIRO: Recorte = { unit: "%", x: 0, y: 0, width: 100, height: 100 };

const escaparHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Num dia só, o formulário guarda o fim no mesmo dia e o mostra como "dia seguinte" quando é antes do
 * início (EVT-129). Evento gravado que termina na madrugada seguinte volta assim para o formulário.
 */
function fimNoFormulario(inicio: string, fim: string, varias: boolean) {
    if (varias || !inicio || !fim) return fim;
    const mesmoDia = `${inicio.slice(0, 10)}T${fim.slice(11, 16)}`;
    return fimEfetivo(inicio, mesmoDia) === fim && fim.slice(0, 10) !== inicio.slice(0, 10) ? mesmoDia : fim;
}

/** Formulário a partir do evento gravado (EVT-121). */
function formularioDoEvento(e: EventoDoBanco): Formulario {
    const sessoes = [...e.sessoes].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const varias = sessoes.length > 1;
    const primeira = sessoes[0];
    const ultimaFim = sessoes.at(-1)?.fim;
    return {
        ...INICIAL,
        tipo: e.tipo ?? "show",
        campeonatoId: e.partida?.campeonatoId ?? "",
        mandanteId: e.partida?.mandanteId ?? "",
        visitanteId: e.partida?.visitanteId ?? "",
        programaMembrosId: e.partida?.programaMembrosId ?? "",
        modalidade: e.modalidade ?? "",
        categoriaId: e.categoria ?? "",
        categoriaEscrito: e.categoriaTexto ?? "",
        tagsEscolhidas: e.tags ?? [],
        nome: e.nome,
        nomeEditado: true,
        local: { id: `local-${e.id}`, nome: e.local, cidade: e.cidade ?? "" },
        inicio: primeira?.inicio ?? e.data.slice(0, 16),
        fim: fimNoFormulario(primeira?.inicio ?? e.data.slice(0, 16), (e.fim ?? ultimaFim ?? primeira?.fim ?? "").slice(0, 16), varias),
        formato: varias ? "sessoes" : "continuo",
        sessoesExtras: varias ? sessoes.map((s, i) => ({ id: i + 1, valor: s.inicio.slice(0, 16), fim: s.fim?.slice(11, 16) ?? "" })) : [],
        moeda: e.moeda ?? "BRL",
        idadeMinima: String(e.idadeMinima ?? 0),
        descricao: e.vitrine?.descricaoHtml ?? (e.vitrine?.descricao ?? []).map((p) => `<p>${escaparHtml(p)}</p>`).join(""),
        banner: e.capa ? { nome: "Capa atual", url: e.capa } : null,
        recorteBanner: e.capa ? RECORTE_INTEIRO : null,
        bannersExtras: (e.bannersAdicionais ?? []).map((url, i) => ({ imagem: { nome: `Banner ${i + 2} atual`, url }, recorte: RECORTE_INTEIRO })),
        video: e.video?.url ?? "",
        instagram: e.instagram ? `@${e.instagram}` : "",
        entradas: e.entradas ?? [],
        mapaTipo: e.mapa?.tipo ?? "imagem",
        mapaImagem: e.mapa?.tipo === "imagem" && e.mapa.url ? { nome: "Mapa atual", url: e.mapa.url, dataUrl: e.mapa.url } : null,
        mapaId: e.mapa?.tipo === "assentos" ? e.mapa.mapaId : "",
        avancado: e.avancado ?? AVANCADO_PADRAO,
    };
}

/**
 * Grava a edição no banco (EVT-122, EVT-124). As sessões do formulário ocupam as sessões gravadas na
 * ordem: cada uma guarda o id e o catálogo (grupos e ingressos) e só troca horário. Sessão a mais
 * nasce vazia; sessão a menos só sai se não tiver ingresso, senão a gravação para com um aviso.
 */
async function salvarEdicao({
    evento,
    f,
    ordenadas,
    inicioDoEvento,
    fimDoEvento,
    categoriaId,
    tagsDoEvento,
    inicial,
}: {
    evento: EventoDoBanco;
    f: Formulario;
    ordenadas: SessaoExtra[];
    inicioDoEvento: string;
    fimDoEvento: string;
    categoriaId?: string;
    tagsDoEvento?: string[];
    inicial: Formulario;
}) {
    const horarios = ordenadas.length ? ordenadas.map((s) => ({ inicio: s.valor, fim: fimDaSessao(s) })) : [{ inicio: f.inicio, fim: fimEfetivo(f.inicio, f.fim) }];
    const gravadas = [...evento.sessoes].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const sobrando = gravadas.slice(horarios.length);
    if (sobrando.some((s) => s.grupos.some((g) => g.ingressos.length > 0))) {
        toast.error("Não dá para tirar uma sessão que já tem ingressos. Mude o horário dela em vez de removê-la.");
        throw new Error("sessao-com-ingressos");
    }
    const sessoes = horarios.map((h, i) => {
        const atual = gravadas[i];
        return atual ? { ...atual, inicio: h.inicio.slice(0, 16), fim: h.fim?.slice(0, 16) } : { id: `${evento.id}-s${gravadas.length + i + 1}`, inicio: h.inicio.slice(0, 16), fim: h.fim?.slice(0, 16), grupos: [] };
    });
    // Capa só muda se a pessoa trocou a imagem ou o recorte (EVT-81).
    const capaMudou = f.banner?.url !== inicial.banner?.url || JSON.stringify(f.recorteBanner) !== JSON.stringify(inicial.recorteBanner);
    const capa = !capaMudou ? evento.capa : f.banner && f.recorteBanner ? await exportarRecorte(f.banner, f.recorteBanner) : undefined;
    // Banners já gravados (imagem inteira, sem novo recorte) voltam como estão; os outros viram o recorte (EVT-164).
    const gravados = new Set([evento.capa, ...(evento.bannersAdicionais ?? [])]);
    const bannersAdicionais = await Promise.all(
        f.bannersExtras.map((b) => (gravados.has(b.imagem.url) && JSON.stringify(b.recorte) === JSON.stringify(RECORTE_INTEIRO) ? b.imagem.url : exportarRecorte(b.imagem, b.recorte))),
    );
    await atualizarEvento(evento.id, {
        nome: f.nome.trim(),
        local: f.local!.nome,
        cidade: f.local!.cidade || undefined,
        capa,
        bannersAdicionais: bannersAdicionais.length ? bannersAdicionais : undefined,
        video: lerVideo(f.video) ?? undefined,
        instagram: lerInstagram(f.instagram) ?? undefined,
        entradas: entradasParaGravar(f.entradas).length ? entradasParaGravar(f.entradas) : undefined,
        sessoes,
        modalidade: f.tipo === "esportivo" ? (f.modalidade as Modalidade) : undefined,
        categoria: categoriaId,
        // As tags da edição são as do campo Tags (EVT-127).
        tags: f.tipo === "show" ? f.tagsEscolhidas : tagsDoEvento,
        fim: fimDoEvento,
        data: inicioDoEvento.slice(0, 16),
        moeda: f.moeda,
        idadeMinima: Number(f.idadeMinima),
        mapa: f.mapaTipo === "assentos" ? { tipo: "assentos", mapaId: f.mapaId } : { tipo: "imagem", url: f.mapaImagem?.dataUrl },
        partida:
            f.tipo === "futebol"
                ? { campeonatoId: f.campeonatoId || undefined, mandanteId: f.mandanteId, visitanteId: f.visitanteId, programaMembrosId: f.programaMembrosId || undefined }
                : undefined,
        avancado: f.avancado,
        vitrine: { ...evento.vitrine, descricao: paragrafosDoHtml(f.descricao), descricaoHtml: f.descricao },
    });
}

/** Informações do evento: edita as informações básicas do evento em contexto (EVT-120). */
export function EditarEvento({ cabecalho }: { cabecalho?: ReactNode }) {
    const eventoAtual = useEventoAtual();
    const doc = useDoc("eventos", eventoAtual.id);
    if (!doc) return <BackstageLayout activeSection="informacoes-evento" activeItem="informacoes-gerais">{null}</BackstageLayout>;
    // Trocar de evento remonta o formulário com os dados do outro.
    return <FormularioDeEvento key={doc.id} tipo={doc.tipo ?? "show"} titulo="Informações do evento" evento={doc} cabecalho={cabecalho} />;
}

function FormularioDeEvento({ tipo, titulo, evento, cabecalho }: { tipo: TipoEvento; titulo: string; evento?: EventoDoBanco; cabecalho?: ReactNode }) {
    const navigate = useNavigate();
    const [, setParams] = useSearchParams();
    const organizacao = useOrganizacaoAtual();
    const opcoes = useOpcoesEvento();
    // Mapas de assentos: os mapas interativos da organização, publicados e não arquivados (MAP-30).
    const mapasDaOrg = useMapasDaOrganizacao().mapas.filter((m) => m.status !== "rascunho").map((m) => ({ id: m.id, label: m.nome, supportingText: `${m.assentos.toLocaleString("pt-BR")} assentos` }));
    const editando = !!evento;
    // Na edição, a base é o evento gravado; depois de salvar, passa a ser o que foi salvo (EVT-123).
    const [inicial, setInicial] = useState<Formulario>(() => (evento ? formularioDoEvento(evento) : { ...INICIAL, tipo }));
    const [f, setF] = useState<Formulario>(inicial);
    const [tentou, setTentou] = useState(false);
    const [confirmarSaida, setConfirmarSaida] = useState(false);
    // Para onde a pessoa ia quando a confirmação abriu (link do menu, por exemplo); sem destino, é o Cancelar/voltar.
    const [destinoDaSaida, setDestinoDaSaida] = useState<string | null>(null);
    // Já descartou e está saindo: a proteção não pergunta de novo.
    const saindo = useRef(false);
    // Troca de evento pela shell esperando a confirmação (EVT-149): descartar segue com ela.
    const [trocaPendente, setTrocaPendente] = useState<(() => void) | null>(null);
    // Salvar com vendas pede confirmação do efeito para quem já comprou (EVT-150).
    const [confirmarSalvar, setConfirmarSalvar] = useState(false);
    // Cronograma fechado até a pessoa pedir; com sessões já marcadas, fica aberto (EVT-89).
    const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((atual) => ({ ...atual, [k]: v }));
    const setAvancado = <K extends keyof ConfiguracoesAvancadas>(k: K, v: ConfiguracoesAvancadas[K]) => setF((a) => ({ ...a, avancado: { ...a.avancado, [k]: v } }));

    const { t, locale } = useTextos();
    // Vocabulário por tipo (Ingresse Sports: "largada" e "participante"; ver domain-context).
    const voc = vocabularioDe(t, f.tipo);
    const itemDoCronograma = f.tipo === "esportivo" ? "largada" : "sessão";
    const erros = useMemo(() => (tentou ? validar(f) : {}), [f, tentou]);
    // Show ou festa: categoria no dropdown, com as do mapa do Grupo que o banco tem (EVT-97).
    const todasAsCategorias = useColecao("categorias");
    const opcoesDeCategoria = useMemo(() => categoriasDoTipo(doMapa(todasAsCategorias), "show").map((c) => ({ id: c.id, label: c.nome })), [todasAsCategorias]);
    const descricaoEmTexto = useMemo(() => paragrafosDoHtml(f.descricao).join("\n\n"), [f.descricao]);
    // Tags do show ou festa, na criação e na edição (EVT-97, EVT-127): sem campo aberto, a leitura usa nome,
    // descrição e banner e só adiciona tags ao campo Tags (EVT-128).
    const tags = useTagsDoEvento({
        ativo: f.tipo === "show",
        texto: "",
        nome: f.nome,
        descricao: descricaoEmTexto,
        banner: f.banner,
        recorte: f.recorteBanner,
        semTextoAberto: true,
    });
    const lerTags = () => void tags.ler();
    // Lê ao abrir a tela e 1,2 s depois de parar de mexer no nome, na descrição ou no banner, sem esperar
    // sair do campo (EVT-128). O texto vai pela ref do hook, então só o atraso depende disto.
    const lerTagsRef = useRef(tags.ler);
    lerTagsRef.current = tags.ler;
    useEffect(() => {
        if (f.tipo !== "show") return;
        const espera = window.setTimeout(() => void lerTagsRef.current(), 1200);
        return () => window.clearTimeout(espera);
    }, [f.tipo, f.nome, descricaoEmTexto, f.banner?.url, f.recorteBanner]);
    const procurandoTags = tags.estado.status === "lendo";
    // Categoria que a leitura sugere porque o texto a cita ("balada"): só com o dropdown vazio, e a pessoa troca.
    const [categoriaSugerida, setCategoriaSugerida] = useState<string | null>(null);
    useEffect(() => {
        if (tags.estado.status !== "pronto") return;
        const resultado = tags.estado.resultado;
        // A leitura só acrescenta tags válidas que ainda não estão no campo e que a pessoa não tirou (EVT-128).
        setF((a) => {
            const categoriaId = !a.categoriaId && resultado.categoriaSugerida ? resultado.categoriaSugerida : a.categoriaId;
            if (categoriaId !== a.categoriaId) setCategoriaSugerida(categoriaId);
            const contexto = { categoriaId: categoriaId || undefined, inicio: a.inicio || undefined, fim: a.fim || undefined, removidas: a.tagsRemovidas };
            const novas = tagsValidas(resultado.tags, contexto)
                .map((t) => t.id)
                .filter((id) => !a.tagsEscolhidas.includes(id));
            if (!novas.length && categoriaId === a.categoriaId) return a;
            return { ...a, categoriaId, tagsEscolhidas: [...a.tagsEscolhidas, ...novas], tagsAutomaticas: [...a.tagsAutomaticas, ...novas] };
        });
    }, [tags.estado]);
    const [criando, setCriando] = useState(false);
    const ruins = useMemo(() => (tentou ? sessoesInvalidas(f) : new Set<number>()), [f, tentou]);
    const times = opcoes.dados?.times ?? [];
    const nomeDoTime = (id: string) => times.find((t) => t.id === id)?.label;
    // Na criação, só trocar o tipo não conta como preenchido: o tipo veio do menu e não há o que perder (EVT-163).
    const preenchido = JSON.stringify(editando ? f : { ...f, tipo: inicial.tipo }) !== JSON.stringify(inicial);

    // EVT-163: o tipo é o primeiro campo da criação e se troca sem perder o que é comum. Os campos que só
    // existem num tipo ficam guardados no formulário (voltar ao tipo os traz de volta) e só o que vale para o
    // tipo escolhido é gravado. A URL acompanha (`?tipo=`), sem entrar no histórico.
    const [trocaDeTipo, setTrocaDeTipo] = useState<{ de: TipoEvento; para: TipoEvento } | null>(null);
    const trocarTipo = (para: TipoEvento) => {
        if (editando || para === f.tipo) return;
        setTrocaDeTipo({ de: f.tipo, para });
        setF((a) => ({ ...a, tipo: para }));
        setParams({ tipo: para }, { replace: true });
    };
    // Tipo trocado pela URL (outro item do menu "Criar evento") segue o mesmo caminho, sem remontar.
    useEffect(() => {
        if (!editando && tipo !== f.tipo) trocarTipo(tipo);
    }, [tipo]);
    const tituloDaTela = editando ? titulo : (tipoDeEvento(f.tipo)?.titulo ?? titulo);
    const temDadosDoTipo = (tipoAnterior: TipoEvento) =>
        tipoAnterior === "futebol"
            ? !!(f.mandanteId || f.visitanteId || f.campeonatoId || f.programaMembrosId)
            : tipoAnterior === "show"
              ? !!(f.categoriaId || f.tagsEscolhidas.length)
              : !!f.modalidade;
    const avisoDoTipo = editando
        ? t.trocaDeTipo.soNaCriacao
        : trocaDeTipo && trocaDeTipo.para === f.tipo
          ? [t.trocaDeTipo.pede[f.tipo], temDadosDoTipo(trocaDeTipo.de) && t.trocaDeTipo.guarda[trocaDeTipo.de], t.trocaDeTipo.continua].filter(Boolean).join(" ")
          : undefined;

    // Próximo obrigatório que falta, na ordem em que aparece na tela (EVT-93). Calculado sempre, sem esperar o clique em Criar.
    const pendencias = validar(f);
    const ORDEM: (keyof Erros)[] = ["nome", "mandante", "visitante", "modalidade", "categoria", "inicio", "fim", "sessoes", "local", "entradas", "descricao", "video", "instagram", "mapa"];
    const campoPendente = ORDEM.find((k) => pendencias[k]);
    const proximaPendencia = campoPendente ? { campo: campoPendente, texto: pendencias[campoPendente]! } : null;
    const irParaCampo = (campo: keyof Erros) => {
        const alvo: Partial<Record<keyof Erros, string>> = { nome: "nome-do-evento", categoria: "campo-categoria", inicio: "campo-quando", fim: "campo-quando", local: "campo-local", entradas: "campo-entradas", descricao: "campo-sobre", video: "campo-video", instagram: "campo-instagram", sessoes: "campo-quando" };
        const el = alvo[campo] ? document.getElementById(alvo[campo]!) : null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el?.matches("input, textarea, button") ? el : el?.querySelector<HTMLElement>("input, button"))?.focus({ preventScroll: true });
    };
    const transicao = useTransicao();

    // EVT-54: no futebol, o nome segue "Mandante x Visitante" até a pessoa digitar outro.
    useEffect(() => {
        if (f.tipo !== "futebol" || f.nomeEditado) return;
        const m = nomeDoTime(f.mandanteId);
        const v = nomeDoTime(f.visitanteId);
        const sugestao = m && v ? formatar(t.sugestaoDeNome, { mandante: m, visitante: v }) : "";
        if (sugestao !== f.nome) set("nome", sugestao);
    }, [f.tipo, f.mandanteId, f.visitanteId, f.nomeEditado, times.length]);

    // EVT-64: com algo preenchido, sair pede confirmação. Na edição, "Descartar alterações" volta ao gravado (EVT-123).
    const sair = () => {
        setDestinoDaSaida(null);
        setTrocaPendente(null);
        if (preenchido) setConfirmarSaida(true);
        else if (!editando) navigate("/backstage/eventos");
    };
    const descartar = () => {
        setConfirmarSaida(false);
        if (trocaPendente) {
            // Troca de evento: o formulário remonta com o outro evento (EVT-149).
            const seguir = trocaPendente;
            setTrocaPendente(null);
            seguir();
        } else if (destinoDaSaida) {
            // Saída por um link (menu, rail): descarta e segue para onde a pessoa ia (EVT-138).
            saindo.current = true;
            navigate(destinoDaSaida);
        } else if (editando) {
            setF(inicial);
            setTentou(false);
        } else navigate("/backstage/eventos");
    };

    // EVT-138: o que foi preenchido também fica protegido fora do Cancelar. Links da tela (rail da organização,
    // menu do evento, gaveta do celular) pedem a mesma confirmação; recarregar ou fechar a aba, o aviso do navegador.
    const preenchidoRef = useRef(preenchido);
    preenchidoRef.current = preenchido;
    useEffect(() => {
        const aoClicar = (e: MouseEvent) => {
            if (!preenchidoRef.current || saindo.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const link = (e.target as Element | null)?.closest?.("a[href]");
            if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            const destino = `${url.pathname}${url.search}${url.hash}`;
            if (destino === `${window.location.pathname}${window.location.search}`) return;
            e.preventDefault();
            e.stopPropagation();
            setTrocaPendente(null);
            setDestinoDaSaida(destino);
            setConfirmarSaida(true);
        };
        const aoDescarregar = (e: BeforeUnloadEvent) => {
            if (!preenchidoRef.current || saindo.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        // Captura: chega antes do Link do router, que navegaria no próprio clique.
        document.addEventListener("click", aoClicar, true);
        window.addEventListener("beforeunload", aoDescarregar);
        return () => {
            document.removeEventListener("click", aoClicar, true);
            window.removeEventListener("beforeunload", aoDescarregar);
        };
    }, []);

    // EVT-149: trocar de evento pela shell (rail, barra do celular) com alteração pergunta antes, como os links.
    // Antes, o formulário remontava com o outro evento e as alterações sumiam sem aviso.
    useEffect(() => {
        if (!editando) return;
        return protegerTrocaDeEvento((seguir) => {
            if (!preenchidoRef.current) return false;
            setDestinoDaSaida(null);
            setTrocaPendente(() => seguir);
            setConfirmarSaida(true);
            return true;
        });
    }, [editando]);

    // EVT-150: evento com vendas avisa o efeito de mudar nome, data, local ou moeda para quem já comprou.
    const vendidos = useMemo(() => {
        const v = evento ? vendasDoEvento(evento.id) : null;
        return v ? v.sessoes.reduce((t, s) => t + s.vendas.ingresse + s.vendas.bilheteria + s.vendas.cortesia, 0) : 0;
    }, [evento?.id]);
    const nomeMudou = editando && f.nome.trim() !== inicial.nome.trim();
    const efeitosParaQuemComprou = !editando || vendidos === 0
        ? []
        : [
              nomeMudou && "O link de compra muda com o nome, e o link já divulgado para de funcionar.",
              (f.inicio !== inicial.inicio || f.fim !== inicial.fim || JSON.stringify(f.sessoesExtras) !== JSON.stringify(inicial.sessoesExtras)) &&
                  "A data e o horário mudam para quem já tem ingresso.",
              f.local?.nome !== inicial.local?.nome && "O local muda para quem já tem ingresso.",
              f.moeda !== inicial.moeda && "A moeda muda para as próximas vendas.",
          ].filter((e): e is string => !!e);
    const textoDeVendidos = vendidos === 1 ? "1 ingresso já foi vendido" : `${vendidos.toLocaleString("pt-BR")} ingressos já foram vendidos`;

    // Banner: sem limite de tamanho (o que vai para o evento é o recorte em 1080 × 1350, EVT-81). O recorte se faz no modal do DS.
    const bannerNaColuna = useBannerNaColuna();
    // Vários banners (EVT-164): o primeiro é o principal, guardado em `banner` e `recorteBanner` (a capa e a leitura das tags).
    const banners: BannerDoEvento[] = [...(f.banner && f.recorteBanner ? [{ imagem: f.banner, recorte: f.recorteBanner }] : []), ...f.bannersExtras];
    const propsDoBanner = {
        banners,
        validar: (file: File) => {
            const ok = ["image/png", "image/jpeg"].includes(file.type);
            if (!ok) toast.error("Escolha uma imagem PNG ou JPG para o banner.");
            return ok;
        },
        onChange: (lista: BannerDoEvento[]) =>
            setF((a) => ({ ...a, banner: lista[0]?.imagem ?? null, recorteBanner: lista[0]?.recorte ?? null, bannersExtras: lista.slice(1) })),
    };

    const criar = async (efeitoConfirmado = false) => {
        setTentou(true);
        const e = validar(f);
        if (Object.keys(e).length > 0) {
            // Sem toast: os campos marcados e a instrução da barra já dizem o que falta (EVT-60, EVT-93).
            requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-erro]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
            return;
        }
        // Com vendas, mudar nome, data, local ou moeda pede confirmação do efeito (EVT-150).
        if (evento && !efeitoConfirmado && efeitosParaQuemComprou.length > 0) {
            setConfirmarSalvar(true);
            return;
        }
        setConfirmarSalvar(false);
        setCriando(true);
        // As tags são as do campo Tags (EVT-127). Na criação, a leitura ainda roda para guardar o vetor do
        // evento (registro para recalibrar as tags); ela não muda o que vai gravado.
        const leitura = f.tipo === "show" && !evento ? await tags.garantir() : null;
        // Futebol e esportivo nascem com a categoria deles; show ou festa vale a do dropdown.
        const categoriaId = f.tipo === "show" ? f.categoriaId : categoriaDoEvento({ tipo: f.tipo });
        // Em sessões, o evento começa na primeira e termina no fim da última; direto, uma sessão só, no início (EVT-89, EVT-98).
        const ordenadas = emSessoes(f) ? [...f.sessoesExtras].sort((a, b) => a.valor.localeCompare(b.valor)) : [];
        const inicioDoEvento = ordenadas[0]?.valor ?? f.inicio;
        const fimDoEvento = ordenadas.length ? ordenadas.map(fimDaSessao).sort().at(-1)! : fimEfetivo(f.inicio, f.fim);
        const tagsDoEvento = f.tipo === "show" ? f.tagsEscolhidas : undefined;

        if (evento) {
            try {
                await salvarEdicao({ evento, f, ordenadas, inicioDoEvento, fimDoEvento, categoriaId, tagsDoEvento, inicial });
                setTentou(false);
                setInicial(f);
                toast.success("Informações do evento salvas.");
            } catch {
                /* o aviso já saiu (sessão com ingressos); o formulário fica como está para a pessoa ajustar */
            } finally {
                setCriando(false);
            }
            return;
        }
        const novo = criarEvento({
            nome: f.nome.trim(),
            data: new Date(inicioDoEvento).toISOString(),
            sessoes: (ordenadas.length ? ordenadas.map((s) => s.valor) : [f.inicio]).map((v) => new Date(v).toISOString()),
            // O fim de cada sessão fica gravado: a lista de ingressos mostra "das 22:00 às 04:00" (ITM-81).
            fimDasSessoes: Object.fromEntries(ordenadas.length ? ordenadas.map((s) => [s.valor, fimDaSessao(s)]) : [[f.inicio, fimEfetivo(f.inicio, f.fim)]]),
            local: f.local!.nome,
            cidade: f.local!.cidade,
            produtor: organizacao?.nome ?? "",
            // Texto puro em parágrafos para quem só lê `vitrine.descricao`; o rich text vai junto (EVT-86).
            descricao: paragrafosDoHtml(f.descricao).join("\n\n") || undefined,
            // A capa é o recorte, não a imagem enviada (EVT-81).
            capa: f.banner && f.recorteBanner ? await exportarRecorte(f.banner, f.recorteBanner) : undefined,
            extras: {
                tipo: f.tipo,
                // Os outros banners, recortados como o principal, na ordem (EVT-164).
                bannersAdicionais: f.bannersExtras.length ? await Promise.all(f.bannersExtras.map((b) => exportarRecorte(b.imagem, b.recorte))) : undefined,
                video: lerVideo(f.video) ?? undefined,
                instagram: lerInstagram(f.instagram) ?? undefined,
                entradas: entradasParaGravar(f.entradas).length ? entradasParaGravar(f.entradas) : undefined,
                modalidade: f.tipo === "esportivo" ? (f.modalidade as Modalidade) : undefined,
                categoria: categoriaId,
                tags: tagsDoEvento,
                fim: fimDoEvento,
                moeda: f.moeda,
                // Limites não se definem na criação: nasce ilimitado e se ajusta em Itens › Configurações de ingressos (EVT-57).
                limites: { geral: null, porCategoria: {} },
                idadeMinima: Number(f.idadeMinima),
                mapa: f.mapaTipo === "assentos" ? { tipo: "assentos", mapaId: f.mapaId } : { tipo: "imagem", url: f.mapaImagem?.dataUrl },
                partida:
                    f.tipo === "futebol"
                        ? { campeonatoId: f.campeonatoId || undefined, mandanteId: f.mandanteId, visitanteId: f.visitanteId, programaMembrosId: f.programaMembrosId || undefined }
                        : undefined,
                avancado: f.avancado,
                ...(f.descricao ? { vitrine: { descricao: paragrafosDoHtml(f.descricao), descricaoHtml: f.descricao } } : {}),
            },
        });
        // A criação fica guardada (texto, banner, vetor) para recalibrar as tags com eventos reais.
        if (f.tipo === "show")
            void registrarCriacao(
                { eventoId: novo.id, produtora: organizacao?.nome ?? "", nome: f.nome.trim(), texto: "", descricao: descricaoEmTexto, bannerDescricao: tags.bannerDescricao ?? undefined, categoriaId, tags: tagsDoEvento ?? [] },
                leitura?.vetor ?? null,
            );
        // Sem toast: quem anuncia o evento criado é o holofote do guia de configuração, que só toca aqui (EVT-10, GDC-14).
        prepararGuiaDoEventoNovo(novo.id);
        navigate("/backstage/catalogo/ingressos");
    };

    const carregando = opcoes.status === "carregando";
    const listaVazia = carregando ? "Carregando…" : "Selecione";
    // Listas da organização aceitam opção nova digitada (EVT-132).
    const listaDaOrganizacao = carregando ? "Carregando…" : "Selecione ou digite para adicionar";

    const conteudoDoLayout = editando
        ? { activeSection: "informacoes-evento" as const, activeItem: "informacoes-gerais" as const }
        : { activeProducer: "eventos", showEventContext: false };

    return (
        <BackstageLayout {...conteudoDoLayout}>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-8">
                {/* Criar: "Eventos" para voltar e, embaixo, o título da tela (EVT-85). Editar: "Visão geral" para voltar, de onde a tela abre (EVT-120, BKS-07). */}
                <div className="flex flex-col gap-4">
                    <CabecalhoDaPagina voltar={editando ? { rotulo: "Visão geral", href: "/backstage/evento/visao-geral" } : { rotulo: "Eventos", onClick: sair }} titulo={tituloDaTela} />
                    {cabecalho}
                </div>

                {/* Alert do DS, não um aviso feito à mão (UI-DS-001). O erro começa pelo que fazer (EVT-46). */}
                <Surgir visivel={opcoes.status === "erro"} gap={24}>
                    <div role="alert">
                        <AlertFloating
                            color="error"
                            title="Tente carregar as listas de novo"
                            description="Times, moedas e políticas não carregaram."
                            confirmLabel="Tentar de novo"
                            onConfirm={opcoes.recarregar}
                        />
                    </div>
                </Surgir>

                {/* Banner à esquerda, fixo ao rolar; à direita, os blocos do formulário empilhados em cartões (EVT-85). */}
                <div className="grid items-start gap-8 lg:max-w-[1736px] lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-9">
                    {bannerNaColuna && (
                        // Gruda abaixo da barra do topo, quando ela existe (`--bs-header-offset`); antes o topo do banner sumia sob ela.
                        <div
                            className={cx(
                                "lg:sticky lg:top-[calc(var(--bs-header-offset,0px)+1.5rem)]",
                                // Em Informações do evento a imagem tem largura fixa de 340 px (EVT-131); na criação, a largura sai da altura da tela.
                                editando ? "lg:w-[340px]" : "lg:w-[min(34vw,calc((100dvh-var(--bs-header-offset,0px)-23.5rem)*0.8))]",
                            )}
                        >
                            {/* A largura sai da altura: banner e as opções embaixo dele cabem na tela, acima da barra de Criar evento.
                                O formulário estica até 1920 px de tela e fica à mesma distância do banner que a margem da direita. */}
                            <CampoBanner {...propsDoBanner} />
                        </div>
                    )}

                    <div className="flex min-w-0 flex-col gap-6">
                    {/* Abaixo do desktop, o banner vem antes, como no desktop, numa caixa enxuta (EVT-80). */}
                    {!bannerNaColuna && <CampoBannerCompacto {...propsDoBanner} />}

                    {/* O que aparece na página do evento, num cartão só (EVT-85). */}
                    {/* Na edição, o h1 já diz "Informações do evento": a seção vira "Página do evento", o que ela edita (UI-VIS-014). */}
                    <Secao titulo={editando ? "Página do evento" : "Informações do evento"}>
                    <div className="flex min-w-0 flex-col gap-8">
                        {/* Tipo de evento, antes do nome (EVT-163): veio do menu "Criar evento" e se troca aqui se a pessoa
                            escolheu errado. Na edição, aparece travado: trocar o tipo de um evento criado fica em aberto. */}
                        <div className="flex flex-col gap-1.5">
                            <CampoSelect
                                label="Tipo de evento"
                                isRequired
                                opcoes={TIPOS_DE_EVENTO.map((x) => ({ id: x.id, label: x.label }))}
                                valor={f.tipo}
                                onChange={(v) => trocarTipo(v as TipoEvento)}
                                isDisabled={editando}
                                className="sm:max-w-xs"
                            />
                            {/* O aviso da troca ocupa a largura do cartão, não só a do campo, para não virar um bloco de quatro linhas. */}
                            <p aria-live="polite" className="max-w-[65ch] text-sm text-tertiary empty:hidden">
                                {avisoDoTipo}
                            </p>
                        </div>

                        {/* Nome num campo do DS. */}
                        <div className="flex gap-4" data-erro={erros.nome ? "" : undefined}>
                            <div className="min-w-0 flex-1" onBlur={lerTags}>
                                <Input
                                    id="nome-do-evento"
                                    label="Nome do evento"
                                    isRequired
                                    // Ao abrir a tela, o cursor já está no nome (EVT-87).
                                    autoFocus
                                    value={f.nome}
                                    onChange={(v) => setF((a) => ({ ...a, nome: v, nomeEditado: v.length > 0 }))}
                                    placeholder={f.tipo === "futebol" ? "Mandante x Visitante" : f.tipo === "esportivo" ? "Ex.: Corrida Noturna 10K" : "Ex.: Festa de Réveillon"}
                                    isInvalid={!!erros.nome}
                                    hint={
                                        erros.nome ??
                                        // Evento com vendas: o nome troca o link de compra já divulgado (EVT-150, EVT-122).
                                        (nomeMudou && vendidos > 0
                                            ? "O link de compra muda com o nome, e o link já divulgado para de funcionar."
                                            : f.tipo === "futebol" && !f.nomeEditado
                                              ? "Preenchido com os times; dá para editar."
                                              : undefined)
                                    }
                                />
                            </div>
                        </div>

                        {/* Futebol: a partida vem depois do nome, uma linha por campo; mandante e visitante lado a lado. */}
                        {f.tipo === "futebol" && (
                            <>
                                <div className="flex gap-4">
                                    <div className="min-w-0 flex-1">
                                        <Grade>
                                            {/* Times da organização: a própria, os que os eventos dela usam e os que ela acrescentar (EVT-132). */}
                                            <CampoOpcaoDaOrganizacao
                                                label="Time mandante"
                                                isRequired
                                                opcoes={times}
                                                valor={f.mandanteId}
                                                onChange={(v) => set("mandanteId", v)}
                                                onAdicionar={(nome) => opcoes.adicionar("times", nome)}
                                                placeholder={listaDaOrganizacao}
                                                isDisabled={carregando}
                                                erro={erros.mandante}
                                            />
                                            <CampoOpcaoDaOrganizacao
                                                label="Time visitante"
                                                isRequired
                                                opcoes={times.filter((t) => t.id !== f.mandanteId)}
                                                valor={f.visitanteId}
                                                onChange={(v) => set("visitanteId", v)}
                                                onAdicionar={(nome) => opcoes.adicionar("times", nome)}
                                                placeholder={listaDaOrganizacao}
                                                isDisabled={carregando}
                                                erro={erros.visitante}
                                            />
                                        </Grade>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="min-w-0 flex-1 sm:max-w-xs">
                                        <CampoOpcaoDaOrganizacao
                                            label="Campeonato"
                                            hint="Opcional"
                                            opcoes={opcoes.dados?.campeonatos ?? []}
                                            valor={f.campeonatoId}
                                            onChange={(v) => set("campeonatoId", v)}
                                            onAdicionar={(nome) => opcoes.adicionar("campeonatos", nome)}
                                            placeholder={listaDaOrganizacao}
                                            isDisabled={carregando}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="min-w-0 flex-1 sm:max-w-xs">
                                        <CampoOpcaoDaOrganizacao
                                            label="Programa de membros"
                                            hint="Opcional"
                                            opcoes={opcoes.dados?.programasMembros ?? []}
                                            valor={f.programaMembrosId}
                                            onChange={(v) => set("programaMembrosId", v)}
                                            onAdicionar={(nome) => opcoes.adicionar("programasMembros", nome)}
                                            placeholder={listaDaOrganizacao}
                                            isDisabled={carregando}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Esportivo: modalidade logo depois do nome, como as outras linhas. */}
                        {f.tipo === "esportivo" && (
                            <div className="flex gap-4">
                                <div className="min-w-0 flex-1 sm:max-w-xs">
                                    <CampoSelect
                                        label="Modalidade"
                                        isRequired
                                        opcoes={MODALIDADES}
                                        valor={f.modalidade}
                                        onChange={(v) => set("modalidade", v as Modalidade)}
                                        placeholder="Selecione"
                                        erro={erros.modalidade}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Show ou festa: logo depois do nome, a categoria (dropdown) e, com as próprias palavras, como é o
                            evento. As tags saem desse texto, do nome, da descrição e do banner (EVT-97). */}
                        {f.tipo === "show" && (
                            <>
                                <div className="flex gap-4">
                                    <div id="campo-categoria" className="min-w-0 flex-1 sm:max-w-xs">
                                        <CampoSelect
                                            label="Categoria"
                                            isRequired
                                            opcoes={opcoesDeCategoria}
                                            valor={f.categoriaId}
                                            onChange={(v) => {
                                                setCategoriaSugerida(null);
                                                set("categoriaId", v);
                                            }}
                                            placeholder="Selecione"
                                            hint={categoriaSugerida && f.categoriaId === categoriaSugerida ? "Sugerida pelo nome ou pela descrição. Pode trocar." : undefined}
                                            erro={erros.categoria}
                                        />
                                    </div>
                                </div>
                                {/* O campo aberto "Como é o evento" saiu: as tags ficam no campo Tags, abaixo de Sobre o evento (EVT-127). */}
                            </>
                        )}

                        {/* Quando e onde, como na página: ícone e informação. */}
                        <dl className="flex flex-col gap-5">
                            <LinhaDaPagina titulo="Quando">
                                {/* Dias como passagem de ida e volta, depois os horários (EVT-88). */}
                                <div id="campo-quando" data-erro={erros.inicio || erros.fim || erros.sessoes ? "" : undefined}>
                                    <PeriodoDoEvento
                                        inicio={f.inicio}
                                        fim={f.fim}
                                        onChange={(inicio, fim) =>
                                            // Sessões fora do novo período saem junto.
                                            setF((a) => ({ ...a, inicio, fim, fimSugerido: false, sessoesExtras: a.sessoesExtras.filter((x) => x.valor.slice(0, 10) >= inicio.slice(0, 10) && x.valor.slice(0, 10) <= fim.slice(0, 10)) }))
                                        }
                                        erroInicio={erros.inicio}
                                        erroFim={erros.fim}
                                        semHorarios={emSessoes(f)}
                                        avisoAoAplicar={(d1, d2) => {
                                            // Encurtar os dias tira as sessões que ficam fora: avisa antes do Aplicar.
                                            if (f.formato !== "sessoes") return null;
                                            const fora = f.sessoesExtras.filter((x) => x.valor.slice(0, 10) < d1 || x.valor.slice(0, 10) > d2).length;
                                            if (!fora) return null;
                                            const nome = f.tipo === "esportivo" ? (fora === 1 ? "largada fica" : "largadas ficam") : fora === 1 ? "sessão fica" : "sessões ficam";
                                            return `${fora} ${nome} fora destes dias e ${fora === 1 ? "sai" : "saem"} ao aplicar.`;
                                        }}
                                        escolhaDeFormato={
                                            // Com os dias escolhidos (um ou vários): um horário geral ou sessões, cada um com os horários que fazem sentido (EVT-98).
                                            !!f.inicio && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-sm font-medium text-secondary">Como o evento acontece</span>
                                                    <Escolha
                                                        rotulo="Como o evento acontece"
                                                        valor={f.formato}
                                                        opcoes={[
                                                            { id: "continuo", label: temCronograma(f.inicio, f.fim) ? "Direto, do início ao fim" : "Um horário" },
                                                            { id: "sessoes", label: f.tipo === "esportivo" ? "Em largadas" : "Em sessões" },
                                                        ]}
                                                        onChange={(v) => set("formato", v as Formulario["formato"])}
                                                    />
                                                </div>
                                            )
                                        }
                                        complemento={
                                        <Surgir visivel={emSessoes(f)} gap={16}>
                                            <div className="flex flex-col gap-3">
                                                <CronogramaDeSessoes
                                                    inicio={f.inicio}
                                                    fim={f.fim}
                                                    sessoes={f.sessoesExtras}
                                                    onChange={(sessoesExtras) => set("sessoesExtras", sessoesExtras)}
                                                    item={itemDoCronograma}
                                                />
                                                {erros.sessoes && <p className="text-sm text-error-primary">{erros.sessoes}</p>}
                                            </div>
                                        </Surgir>
                                        }
                                    />
                                </div>
                            </LinhaDaPagina>
                            <LinhaDaPagina titulo="Onde">
                                <div id="campo-local" data-erro={erros.local ? "" : undefined}>
                                    <CampoLocal valor={f.local} onChange={(v) => set("local", v)} erro={erros.local} />
                                </div>
                            </LinhaDaPagina>
                            {/* Entradas do local, opcionais, logo depois dele (EVT-166). */}
                            <LinhaDaPagina titulo="Entradas">
                                <CampoEntradas entradas={f.entradas} onChange={(v) => set("entradas", v)} mostrarErros={tentou} />
                            </LinhaDaPagina>
                        </dl>


                        {/* Sobre o evento: rótulo do mesmo tamanho e a formatação dentro da caixa (EVT-86). */}
                        <div
                            id="campo-sobre"
                            className="flex gap-4"
                            data-erro={erros.descricao ? "" : undefined}
                            // A barra de formatação e o texto ficam no mesmo bloco: só conta sair do bloco inteiro.
                            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && lerTags()}
                        >
                            <DescricaoRica
                                label="Sobre o evento"
                                isRequired
                                valor={f.descricao}
                                onChange={(html) => set("descricao", html)}
                                placeholder="Conte o que vai acontecer, a programação e o que está incluso."
                                erro={erros.descricao}
                            />
                        </div>

                        {/* Tags logo abaixo de Sobre o evento, na criação e na edição (EVT-127). */}
                        {f.tipo === "show" && (
                            <CampoDeTags
                                // O catálogo da busca depende da categoria e da data: mudar uma delas remonta o campo.
                                key={`${f.categoriaId}|${f.inicio}|${f.fim}`}
                                escolhidas={f.tagsEscolhidas}
                                automaticas={f.tagsAutomaticas}
                                contexto={{ categoriaId: f.categoriaId || undefined, inicio: f.inicio || undefined, fim: f.fim || undefined }}
                                buscando={procurandoTags}
                                onAdicionar={(id) => setF((a) => ({ ...a, tagsEscolhidas: [...a.tagsEscolhidas, id], tagsRemovidas: a.tagsRemovidas.filter((x) => x !== id) }))}
                                onRemover={(id) =>
                                    setF((a) => ({
                                        ...a,
                                        tagsEscolhidas: a.tagsEscolhidas.filter((x) => x !== id),
                                        tagsAutomaticas: a.tagsAutomaticas.filter((x) => x !== id),
                                        // Tirada não volta pela leitura automática (EVT-128).
                                        tagsRemovidas: [...new Set([...a.tagsRemovidas, id])],
                                    }))
                                }
                            />
                        )}

                        {/* Vídeo opcional, por link do YouTube ou do Vimeo (EVT-165). */}
                        <div id="campo-video" className="sm:max-w-md" data-erro={erros.video ? "" : undefined}>
                            <Input
                                label="Vídeo"
                                icon={PlayCircle}
                                type="url"
                                inputMode="url"
                                autoComplete="off"
                                value={f.video}
                                onChange={(v) => set("video", v)}
                                placeholder="Link do YouTube ou do Vimeo"
                                isInvalid={!!erros.video}
                                hint={
                                    erros.video ??
                                    (lerVideo(f.video)
                                        ? `Vídeo do ${lerVideo(f.video)!.origem === "youtube" ? "YouTube" : "Vimeo"}. Aparece na página do evento, depois dos banners.`
                                        : "Opcional. Cole o link de um vídeo do YouTube ou do Vimeo.")
                                }
                            />
                        </div>

                        {/* Instagram do evento, opcional (EVT-168): a página do evento no site convida a seguir o perfil. */}
                        <div id="campo-instagram" className="sm:max-w-md" data-erro={erros.instagram ? "" : undefined}>
                            <Input
                                label="Instagram do evento"
                                icon={AtSign}
                                autoComplete="off"
                                value={f.instagram}
                                onChange={(v) => set("instagram", v)}
                                placeholder="@perfil ou link do Instagram"
                                isInvalid={!!erros.instagram}
                                hint={
                                    erros.instagram ??
                                    (lerInstagram(f.instagram)
                                        ? `@${lerInstagram(f.instagram)}. A página do evento no site convida a seguir esse perfil.`
                                        : "Opcional. O perfil do evento ou da produtora no Instagram.")
                                }
                            />
                        </div>
                    </div>
                    </Secao>

                {/* O que não aparece na página, mas define como o evento vende (EVT-85). */}
                <section aria-labelledby="detalhes-do-evento" className="flex flex-col gap-6 pt-4 pb-6">
                    <div className="flex flex-col gap-1">
                        <h2 id="detalhes-do-evento" className="text-lg font-semibold text-primary">
                            Detalhes do evento
                        </h2>
                    </div>

                    {/* Empilhados, um embaixo do outro. */}
                    <div className="flex flex-col gap-6">
                        <Secao titulo="Venda">
                            <Grade>
                                <CampoSelect
                                    label="Moeda"
                                    isRequired
                                    opcoes={opcoes.dados?.moedas ?? []}
                                    valor={f.moeda}
                                    onChange={(v) => set("moeda", v)}
                                    placeholder={listaVazia}
                                    isDisabled={carregando}
                                />
                                <CampoSelect label="Idade mínima" opcoes={IDADES} valor={f.idadeMinima} onChange={(v) => set("idadeMinima", v)} />
                            </Grade>
                            {/* Das configurações avançadas, só a política fica na criação; o resto está em Itens › Configurações de ingressos (EVT-84). */}
                            <CampoOpcaoDaOrganizacao
                                label="Política"
                                opcoes={opcoes.dados?.politicas ?? []}
                                valor={f.avancado.politicaId ?? ""}
                                onChange={(v) => setAvancado("politicaId", v)}
                                onAdicionar={(nome) => opcoes.adicionar("politicas", nome)}
                                permiteVazio={false}
                                placeholder={listaDaOrganizacao}
                                isDisabled={carregando}
                            />
                        </Secao>

                        <Secao titulo="Mapa">
                            <div className="flex flex-col gap-3" data-erro={erros.mapa ? "" : undefined}>
                                <Escolha
                                    rotulo="Origem do mapa"
                                    valor={f.mapaTipo}
                                    opcoes={[
                                        { id: "imagem", label: "Enviar imagem" },
                                        { id: "assentos", label: "Mapa de assentos" },
                                    ]}
                                    onChange={(v) => set("mapaTipo", v as Formulario["mapaTipo"])}
                                />
                                {/* Troca deslizando: um encolhe enquanto o outro cresce (UI-VIS-008). */}
                                <div className="flex flex-col">
                                    <Surgir visivel={f.mapaTipo === "imagem"}>
                                        <CampoImagem
                                            rotulo="Mapa"
                                            hint="PNG ou JPG, com setores e acessos."
                                            arquivo={f.mapaImagem}
                                            onEscolher={(img) => set("mapaImagem", img)}
                                            onRemover={() => set("mapaImagem", null)}
                                        />
                                    </Surgir>
                                    <Surgir visivel={f.mapaTipo === "assentos"}>
                                        <CampoSelect
                                            label="Mapa de assentos"
                                            isRequired
                                            hint="Mapas cadastrados para a organização."
                                            opcoes={mapasDaOrg}
                                            valor={f.mapaId}
                                            onChange={(v) => set("mapaId", v)}
                                            placeholder={listaVazia}
                                            isDisabled={carregando}
                                            erro={erros.mapa}
                                        />
                                    </Surgir>
                                </div>
                            </div>
                        </Secao>
                    </div>
                </section>
                    </div>
                </div>

                {/* Mesmo fundo da página (UI-VIS-013); a borda separa do conteúdo que rola por baixo. */}
                <footer data-barra-fixa className="sticky bottom-0 z-20 mt-auto border-t border-secondary bg-primary_alt">
                    {/* No celular, a instrução numa linha e os dois botões lado a lado, na largura toda; a partir de sm,
                        tudo numa linha, com os botões à direita (EVT-139). Antes, em 390 px, a barra quebrava em três
                        linhas desalinhadas. */}
                    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                        {/* Uma instrução por vez: o próximo campo obrigatório que falta, na ordem da tela (EVT-93). */}
                        <p aria-live="polite" className="min-w-0 truncate text-sm text-tertiary sm:mr-auto sm:whitespace-normal">
                            {proximaPendencia ? (
                                <button
                                    type="button"
                                    onClick={() => irParaCampo(proximaPendencia.campo)}
                                    className="cursor-pointer text-left font-medium text-secondary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                                >
                                    {proximaPendencia.texto}
                                </button>
                            ) : editando ? (
                                preenchido ? "Alterações prontas para salvar." : "Nenhuma alteração."
                            ) : (
                                "Tudo pronto para criar o evento."
                            )}
                        </p>
                        <div className="grid shrink-0 grid-cols-2 gap-3 sm:flex">
                            {editando ? (
                                <>
                                    <Button color="secondary" size="md" onClick={sair} isDisabled={!preenchido}>
                                        Descartar alterações
                                    </Button>
                                    <Button color="primary" size="md" onClick={() => criar()} isLoading={criando} showTextWhileLoading isDisabled={!preenchido}>
                                        Salvar alterações
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button color="secondary" size="md" onClick={sair}>
                                        Cancelar
                                    </Button>
                                    <Button color="primary" size="md" onClick={() => criar()} isLoading={criando} showTextWhileLoading>
                                        Criar evento
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </footer>
            </div>

            <ModalOverlay isOpen={confirmarSaida} onOpenChange={setConfirmarSaida} isDismissable>
                <Modal className="sm:max-w-[400px]">
                    <Dialog>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{editando ? "Descartar as alterações?" : "Descartar o evento?"}</h2>
                                <p className="text-sm text-tertiary">
                                    {editando
                                        ? trocaPendente
                                            ? "Trocar de evento descarta as alterações não salvas deste."
                                            : destinoDaSaida
                                              ? "As alterações não salvas serão perdidas."
                                              : "O evento volta a ter as informações que estão salvas."
                                        : "O que você preencheu será perdido. O evento ainda não foi criado."}
                                </p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button
                                    color="secondary"
                                    size="md"
                                    onClick={() => {
                                        setConfirmarSaida(false);
                                        setTrocaPendente(null);
                                    }}
                                >
                                    Continuar editando
                                </Button>
                                <Button color="primary-destructive" size="md" onClick={descartar}>
                                    Descartar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>

            {/* EVT-150: com vendas, salvar diz antes o que muda para quem já comprou. */}
            <ModalOverlay isOpen={confirmarSalvar} onOpenChange={setConfirmarSalvar} isDismissable>
                <Modal className="sm:max-w-[440px]">
                    <Dialog aria-labelledby="titulo-salvar-com-vendas">
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-2">
                                <h2 id="titulo-salvar-com-vendas" className="text-lg font-semibold text-primary">
                                    Salvar com vendas no evento?
                                </h2>
                                <p className="text-sm text-tertiary">{textoDeVendidos}. Ao salvar:</p>
                                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
                                    {efeitosParaQuemComprou.map((efeito) => (
                                        <li key={efeito}>{efeito}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" onClick={() => setConfirmarSalvar(false)}>
                                    Continuar editando
                                </Button>
                                <Button color="primary" size="md" onClick={() => void criar(true)} isLoading={criando} showTextWhileLoading>
                                    Salvar alterações
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </BackstageLayout>
    );
}

/* ---------------- peças ---------------- */


/** Linha de informação da página do evento: ícone, título curto e o campo que edita a informação. */
/* O título fica só para leitor de tela: o rótulo do campo já diz o que é, e o ícone desce até a altura do campo (abaixo do rótulo). */
const LinhaDaPagina = ({ icone, titulo, children }: { icone: FC<{ className?: string }>; titulo: string; children: ReactNode }) => (
    <div className="flex gap-4">
        <div className="min-w-0 flex-1">
            <dt className="sr-only">{titulo}</dt>
            <dd className="min-w-0">{children}</dd>
        </div>
    </div>
);

/** Data e hora por extenso no idioma da pessoa. */
const formatarDataHora = (v: string, locale: string) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(d);
};

const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Tags do evento na edição (EVT-127): as escolhidas ficam dentro do campo, como selos só com o nome e o
 * X, e a busca no catálogo de tags (nome e termos) segue ao lado delas. Clicar no campo (ou na seta) abre a
 * lista com todas as tags que valem para o evento, para escolher sem digitar; digitar filtra a lista
 * (EVT-160). Escolher adiciona e limpa a busca. Durante a leitura automática, o texto de apoio mostra só o spin e "Buscando…" (EVT-128).
 * Montado com peças do DS (Label, Tag, Popover, Select.Item, HintText): o TagSelect do DS repassa `ref`
 * como prop, o que não funciona no React 18 deste projeto (a lista abria no canto da tela).
 */
function CampoDeTags({
    escolhidas,
    automaticas,
    contexto,
    buscando,
    onAdicionar,
    onRemover,
}: {
    escolhidas: string[];
    automaticas: string[];
    contexto: ContextoDasTags;
    buscando: boolean;
    onAdicionar: (id: string) => void;
    onRemover: (id: string) => void;
}) {
    const [texto, setTexto] = useState("");
    // A caixa é a âncora da lista: a lista abre logo abaixo do campo, na largura dele.
    const caixaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const busca = semAcento(texto.trim());
    // Só as tags que valem para a categoria e a data do evento (CAT-18), pelo nome ou pelos termos, sem acento.
    const sugestoes = useMemo(
        () =>
            TAGS.filter((t) => !escolhidas.includes(t.id))
                .filter((t) => tagsValidas([{ id: t.id }], { ...contexto, removidas: [] }).length > 0)
                .filter((t) => !busca || semAcento(t.nome).includes(busca) || t.termos.some((x) => semAcento(x).includes(busca)))
                .map((t) => ({ id: t.id, label: t.nome, supportingText: GRUPO_POR_ID.get(t.grupo)?.nome })),
        [escolhidas, contexto.categoriaId, contexto.inicio, contexto.fim, busca],
    );
    const selos = escolhidas.map((id) => ({ id, nome: TAG_POR_ID.get(id)?.nome ?? id }));

    return (
        // As tags ficam dentro da caixa do campo, como selos só com o nome e o X, e a busca segue ao lado delas.
        // A lista de selos fica fora do ComboBox: duas coleções no mesmo ComboBox quebram o react-aria.
        <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <div
                ref={caixaRef}
                onClick={() => inputRef.current?.focus()}
                className="relative flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg bg-primary py-2 pr-11 pl-3 shadow-xs ring-1 ring-primary ring-inset transition duration-100 ease-linear focus-within:ring-2 focus-within:ring-brand"
            >
                {selos.length > 0 && (
                    <TagGroup label="Tags do evento" size="md" onRemove={(keys) => [...keys].forEach((k) => onRemover(String(k)))} className="contents">
                        <TagList className="contents" items={selos}>
                            {(t) => (
                                <Tag id={t.id} textValue={t.nome}>
                                    {t.nome}
                                </Tag>
                            )}
                        </TagList>
                    </TagGroup>
                )}
                <AriaComboBox
                    aria-label="Buscar tag"
                    allowsEmptyCollection
                    // Abre ao focar ou clicar no campo, sem precisar digitar (EVT-160).
                    menuTrigger="focus"
                    inputValue={texto}
                    onInputChange={setTexto}
                    selectedKey={null}
                    defaultFilter={() => true}
                    onSelectionChange={(k) => {
                        if (k == null) return;
                        onAdicionar(String(k));
                        setTexto("");
                    }}
                    className="min-w-32 flex-1"
                >
                    <AriaInput
                        ref={inputRef}
                        placeholder={selos.length ? "Adicionar tag" : "Busque uma tag"}
                        // Apagar com o campo vazio tira a última tag, como num campo de selos comum.
                        onKeyDown={(e) => {
                            if (e.key === "Backspace" && !texto && escolhidas.length) onRemover(escolhidas[escolhidas.length - 1]);
                        }}
                        className="w-full bg-transparent text-md text-primary outline-hidden placeholder:text-placeholder"
                    />
                    {/* Seta do ComboBox do DS: abre e fecha a lista de tags. */}
                    <AriaButton
                        aria-label="Ver tags"
                        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2"
                    >
                        <ChevronDown className="size-5" aria-hidden="true" />
                    </AriaButton>
                    {/* Como no ComboBox do DS: a lista recebe os itens direto e só abre com resultado; rola quando são muitas. */}
                    {sugestoes.length > 0 && (
                        <Popover size="md" triggerRef={caixaRef} placement="bottom start">
                            <AriaListBox items={sugestoes} className="size-full outline-hidden">
                                {(item) => (
                                    <Select.Item id={item.id} supportingText={item.supportingText}>
                                        {item.label}
                                    </Select.Item>
                                )}
                            </AriaListBox>
                        </Popover>
                    )}
                </AriaComboBox>
            </div>
            {/* Só durante a leitura automática: spin e "Buscando…"; fora dela, sem texto de apoio. */}
            {buscando && (
                <HintText className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-secondary border-t-fg-brand-primary motion-reduce:animate-none" />
                    Buscando…
                </HintText>
            )}
        </div>
    );
}


/** Seção do formulário: título e, se precisar, subtítulo (UI-VIS-014). */
const Secao = ({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) => (
    <section className="flex flex-col gap-5 rounded-2xl bg-primary p-5 ring-1 ring-secondary md:p-6">
        <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
            {descricao && <p className="max-w-[65ch] text-sm text-tertiary">{descricao}</p>}
        </div>
        {children}
    </section>
);

const Grade = ({ children }: { children: ReactNode }) => <div className="grid gap-4 md:grid-cols-2">{children}</div>;

/**
 * Local com a busca de endereço (API; no protótipo, simulada). Um campo só: o resultado já traz o
 * nome do local e a cidade (EVT-65). Busca com resultados dinâmicos (UI-FRM-004): a lista abre só
 * com resultados; "Buscando…" e "Nenhum local encontrado" ficam dentro do campo; escolher um local
 * leva a linha inteira para o campo ("Allianz Parque, São Paulo, SP"), sem nada no hint.
 */
const CampoLocal = ({ valor, onChange, erro }: { valor: LocalEncontrado | null; onChange: (v: LocalEncontrado | null) => void; erro?: string }) => {
    const { t } = useTextos();
    const textoDe = (l: LocalEncontrado) => formatar(t.localECidade, { local: l.nome, cidade: l.cidade });
    const [texto, setTexto] = useState(valor ? textoDe(valor) : "");
    const [resultados, setResultados] = useState<LocalEncontrado[]>(valor ? [valor] : []);
    const [buscando, setBuscando] = useState(false);
    const escolhido = valor && texto === textoDe(valor);

    useEffect(() => {
        if (escolhido) return;
        let ativo = true;
        if (texto.trim().length < 2) {
            setResultados([]);
            setBuscando(false);
            return;
        }
        setBuscando(true);
        const tempo = setTimeout(() => {
            buscarLocais(texto).then((r) => {
                if (!ativo) return;
                setResultados(r);
                setBuscando(false);
            });
        }, 200);
        return () => {
            ativo = false;
            clearTimeout(tempo);
        };
    }, [texto]);

    const vazio = !escolhido && texto.trim().length >= 2 && !buscando && resultados.length === 0;
    return (
        // Com erro, o contorno do campo fica como o do Input (o ComboBox do DS só pinta o texto de apoio).
        <div className={erro ? CONTORNO_DE_ERRO : undefined}>
        <ComboBox
            label="Local"
            isRequired
            placeholder="Busque pelo nome do local ou endereço"
            shortcut={false}
            // Com resultados vindos da API, o ComboBox abre quando a lista chega; sem resultado, não abre.
            allowsEmptyCollection
            // Quem filtra é a API: o ComboBox mostra os resultados como vieram.
            defaultFilter={() => true}
            inputValue={texto}
            onInputChange={(v) => {
                // Ao escolher, o ComboBox escreve o nome do item no campo: isso não desfaz a escolha (EVT-83).
                if (valor && (v === valor.nome || v === textoDe(valor))) return setTexto(textoDe(valor));
                setTexto(v);
                if (valor) onChange(null);
            }}
            selectedKey={valor?.id ?? null}
            onSelectionChange={(k) => {
                // `null` vem do próprio ComboBox quando a lista muda; limpar é só apagando o texto.
                if (k == null) return;
                const l = resultados.find((r) => r.id === k) ?? (valor?.id === k ? valor : null);
                if (!l) return;
                onChange(l);
                setTexto(textoDe(l));
            }}
            // O local escolhido continua na lista: tirar o item selecionado da coleção fazia o ComboBox apagar a escolha (EVT-83).
            items={(escolhido && valor ? [valor] : resultados).map((r) => ({ id: r.id, label: r.nome, supportingText: r.cidade }))}
            status={
                buscando ? (
                    <>
                        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-secondary border-t-fg-brand-primary motion-reduce:animate-none" />
                        {t.buscando}
                    </>
                ) : vazio ? (
                    t.nenhumLocal
                ) : undefined
            }
            isInvalid={!!erro}
            hint={erro}
        >
            {(item) => (
                <Select.Item id={item.id} supportingText={item.supportingText} icon={item.icon}>
                    {item.label}
                </Select.Item>
            )}
        </ComboBox>
        </div>
    );
};

interface CampoSelectProps {
    label: string;
    opcoes: Opcao[];
    valor: string;
    onChange: (v: string) => void;
    placeholder?: string;
    hint?: string;
    erro?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    ocultarLabel?: boolean;
    /** Campo opcional: mostra o × para voltar ao vazio (UI-FRM-003). */
    limpavel?: boolean;
    /** Ícone dentro do campo, à esquerda (o do Select do DS). */
    icone?: FC;
    className?: string;
}

const CampoSelect = ({ label, opcoes, valor, onChange, placeholder, hint, erro, isRequired, isDisabled, ocultarLabel, limpavel, icone, className }: CampoSelectProps) => {
    const { t } = useTextos();
    return (
    <div data-erro={erro ? "" : undefined} className={cx("relative", erro && CONTORNO_DE_ERRO, className)}>
        <Select
            label={ocultarLabel ? undefined : label}
            aria-label={ocultarLabel ? label : undefined}
            placeholder={placeholder}
            icon={icone}
            items={opcoes}
            selectedKey={valor || null}
            onSelectionChange={(k) => k != null && onChange(String(k))}
            isRequired={isRequired}
            isDisabled={isDisabled}
            isInvalid={!!erro}
            hint={erro ?? hint}
        >
            {(item) => (
                <Select.Item id={item.id} supportingText={item.supportingText} icon={item.icon}>
                    {item.label}
                </Select.Item>
            )}
        </Select>
        {/* × dentro do campo, antes da seta: aparece só com algo escolhido (UI-FRM-003). */}
        {limpavel && valor && !isDisabled && (
            <button
                type="button"
                aria-label={formatar(t.limparCampo, { campo: label })}
                onClick={() => onChange("")}
                className={cx(
                    "absolute right-9 flex size-7 items-center justify-center rounded-md text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2",
                    // Centro do gatilho (40 px): rótulo 20 px + 6 px de espaço + 6 px.
                    ocultarLabel ? "top-1.5" : "top-8",
                )}
            >
                <XClose className="size-4" />
            </button>
        )}
    </div>
    );
};

/** Escolha entre poucas opções (ButtonGroup do DS). */
const Escolha = ({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: string; opcoes: Opcao[]; onChange: (v: string) => void }) => (
    <ButtonGroup
        size="sm"
        aria-label={rotulo}
        selectedKeys={new Set([valor])}
        onSelectionChange={(keys) => {
            const v = [...keys][0];
            if (v) onChange(String(v));
        }}
        disallowEmptySelection
    >
        {opcoes.map((o) => (
            <ButtonGroupItem key={o.id} id={o.id}>
                {o.label}
            </ButtonGroupItem>
        ))}
    </ButtonGroup>
);

/**
 * Envio de imagem com pré-visualização, como o banner: a imagem inteira, sem corte, e embaixo o nome,
 * trocar e remover. Sem limite de tamanho (EVT-63).
 */
const CampoImagem = ({
    label,
    rotulo,
    hint,
    arquivo,
    onEscolher,
    onRemover,
}: {
    label?: string;
    /** Nome usado nos avisos quando não há label visível. */
    rotulo?: string;
    hint: string;
    arquivo: Imagem | null;
    onEscolher: (img: Imagem) => void;
    onRemover: () => void;
}) => {
    const { t } = useTextos();
    const nome = label ?? rotulo ?? "";
    const entrada = useRef<HTMLInputElement>(null);
    const escolher = async (file: File) => {
        // Só PNG ou JPG, como o banner (EVT-63).
        if (!["image/png", "image/jpeg"].includes(file.type)) {
            toast.error(`Escolha uma imagem PNG ou JPG para o ${nome.toLowerCase() || "campo"}.`);
            return;
        }
        onEscolher({ nome: file.name, url: URL.createObjectURL(file), dataUrl: await lerComoDataUrl(file) });
    };
    return (
        <div className="flex flex-col gap-1.5">
            {label && <span className="text-sm font-medium text-secondary">{label}</span>}
            <input
                ref={entrada}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void escolher(file);
                }}
            />
            <Surgir visivel={!!arquivo}>
                <div className="flex flex-col gap-3">
                    {/* A imagem inteira, sem corte: o mapa precisa mostrar todos os setores. */}
                    <div className="flex justify-center overflow-hidden rounded-2xl bg-primary_alt ring-1 ring-secondary ring-inset">
                        <img src={arquivo?.url} alt={nome ? `Pré-visualização: ${nome}` : ""} className="max-h-96 w-auto max-w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm text-tertiary">{arquivo?.nome}</span>
                        <div className="flex shrink-0 items-center gap-1">
                            <ButtonUtility icon={RefreshCw01} color="tertiary" size="sm" tooltip="Trocar imagem" onClick={() => entrada.current?.click()} />
                            <ButtonUtility icon={Trash01} color="tertiary" size="sm" tooltip={formatar(t.removerCampo, { campo: nome })} onClick={onRemover} />
                        </div>
                    </div>
                </div>
            </Surgir>
            {/* Vazio: a mesma caixa de envio do banner, o único desenho de envio de imagem da criação (EVT-140). */}
            <Surgir visivel={!arquivo}>
                <CaixaDeEnvio titulo={`Enviar o ${nome.toLowerCase()}`} dica={hint} onClique={() => entrada.current?.click()} onSoltar={(file) => void escolher(file)} />
            </Surgir>
        </div>
    );
};
