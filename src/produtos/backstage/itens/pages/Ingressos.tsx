import { createContext, type ReactNode, useContext, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from "motion/react";
import { Heading as AriaHeading } from "react-aria-components";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ChevronDown, Copy01, DotsVertical, Edit01, FaceId, Key01, Plus, QrCode01, SearchLg, Trash01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { Toggle } from "@/components/base/toggle/toggle";
import { DURACAO_TRANSICAO, Surgir, useTransicao } from "@/components/foundations/transicao";
import type { AberturaDeVendas, Evento, Grupo, Sessao, TipoIngresso } from "@/plataforma";
import { cx } from "@/utils/cx";
import { PARAMETRO_NOVO_SETOR } from "../../components/Backstage";
import { EstadoBadge, useResumoDasVendas } from "../components/comuns";
import { BotaoChaves, totalDeChaves } from "../components/VerChaves";
import { CampoDeIngresso } from "../components/campo-de-ingresso";
import { FormularioDoGrupo, type MotivoDoFechamento } from "../components/formulario-do-grupo";
import { FormularioDoIngresso, type RascunhoRapido } from "../components/formulario-do-ingresso";
import { FormularioDoLote } from "../components/formulario-do-lote";
import { SeletorDeLista } from "../components/SeletorDeLista";
import { SeletorDeDestino } from "../components/seletor-de-destino";
import { codigosDoEvento } from "../../components/passkeys-do-evento";
import { Alca, mover } from "../components/Alca";
import { BarraDeOcupacao } from "../../components/barra-de-ocupacao";
import { useArrastarNaGrade } from "../components/grade-arrastavel";
import { BarraDeFiltros, BotaoMostrarMais, LIMIAR_FERRAMENTAS, paraBusca, useMostrarMais } from "../components/escala";
import type { EstadoItem } from "../data/catalogo";
import {
    aberturasPorIngresso,
    comGrupoDuplicado,
    comIngresso,
    comIngressoDuplicado,
    estadoComAberturasDele,
    janelaDasAberturas,
    faixaDePreco,
    ofertaDoSetor,
    quantidadeDoIngresso,
    salvarSessoes,
    semSetor,
    useCatalogo,
    pendentesDoIngresso,
    vendidosDoIngresso,
    vendidosDoSetor,
    vendidosDoLote,
    pendentesDoLote,
} from "../data/catalogo";
import { formatar, useTextosItens } from "../data/textos-itens";

/* ------------------------------------------------------------------ */
/*  Ingressos (ITM-01 a ITM-19)                                        */
/*                                                                     */
/*  Setores como cartões (capacidade, acesso e a soma dos lotes        */
/*  conferida contra a capacidade); dentro de cada setor, os           */
/*  ingressos. A linha abre o ingresso, onde tudo se edita; o toggle   */
/*  da linha pausa ou volta a vender na hora.                          */
/* ------------------------------------------------------------------ */

const T = {
    titulo: "Ingressos",
    novoSetor: "Criar grupo de ingressos",
    vazioDica: "Depois os ingressos são criados aqui",
    descartarTitulo: "Descartar o que você digitou?",
    descartarDica: "O que você digitou ainda não foi salvo.",
    continuarEditando: "Continuar editando",
    descartar: "Descartar",
    maisAcoesGrupo: "Mais ações de {setor}",
    maisAcoesIngresso: "Mais ações de {ingresso}",
    duplicarGrupo: "Duplicar grupo",
    excluirGrupo: "Excluir grupo",
    excluirTitulo: "Excluir o grupo {grupo}?",
    excluirComIngressos: { one: "O ingresso dele também será excluído.", other: "Os {n} ingressos dele também serão excluídos." },
    grupoExcluido: "Grupo {grupo} excluído.",
    naoExcluiTitulo: "O grupo {grupo} tem vendas",
    naoExcluiDica: "Grupo com ingresso emitido ou em compra não pode ser excluído.",
    entendi: "Entendi",
    cancelar: "Cancelar",
    duplicarIngresso: "Duplicar ingresso",
    grupoDuplicado: "{grupo} criado. Os ingressos dele começam fora da venda.",
    grupoDuplicadoEmVarias: "{grupo} duplicado em {n} sessões. Os ingressos começam fora da venda.",
    ingressoDuplicado: "{ingresso} criado, fora da venda.",
    ingressoDuplicadoEmVarios: "{ingresso} duplicado em {n} grupos, fora da venda.",
    duplicarEm: "Duplicar {item} em",
    duplicarGrupoDica: "A cópia leva os ingressos e lotes, fora da venda. Na mesma sessão, entra logo abaixo do original; nas outras, no fim.",
    duplicarIngressoDica: "A cópia leva os lotes e as regras, fora da venda. No mesmo grupo, entra logo abaixo do original; nos outros, no fim.",
    duplicar: "Duplicar",
    ingressosNoGrupo: { one: "{n} ingresso", other: "{n} ingressos" },
    criarIngressoNoGrupo: "Criar ingresso",
    criarIngresso: "Criar ingresso",
    novoIngresso: "Novo ingresso",
    vincular: "Vincular",
    vincularNoLote: "Vincular Passkey no {lote}",
    vincularNoIngresso: "Vincular Passkey em {ingresso}",
    passkeysDoIngresso: "Passkeys de {ingresso}",
    passkeysDoIngressoDica: "Com Passkey vinculada ao ingresso, só quem tem uma delas compra qualquer lote dele. As Passkeys são criadas em Ingressos e produtos › Passkey.",
    passkeysDoIngressoSalvas: "Passkeys de {ingresso} salvas.",
    passkeysDoLote: "Passkeys do {lote}",
    contagemPasskeys: { one: "{n} Passkey", other: "{n} Passkeys" },
    passkeysDica: "Com Passkey vinculada, só quem tem uma delas compra este lote. As Passkeys são criadas em Ingressos e produtos › Passkey.",
    passkeysVazio: "Nenhuma Passkey neste evento. Crie em Ingressos e produtos › Passkey.",
    passkeysSalvas: "Passkeys do {lote} salvas.",
    passkey: "Passkey",
    preco: "Preço",
    emissoesEEstoque: "Emissões e estoque",
    faixa: "{min} até {max}",
    lotesNoIngresso: { one: "{n} lote", other: "{n} lotes" },
    deIngresso: " de {ingresso}",
    emissoes: "Emissões",
    aVendaDe: "À venda, {item}",
    editarIngresso: "Editar {ingresso}",
    criarLote: "Criar lote",
    loteVender: "À venda, {lote}",
    loteLigado: "{lote} à venda.",
    loteTrocado: "{lote} à venda. {anterior} parou de vender.",
    lotePausado: "{lote} parou de vender.",
    sincronizado: "Sincronizado",
    editarSetor: "Editar grupo {setor}",
    capacidadeEEmitidos: "Capacidade de {capacidade}, {emitidos} emitidos",
    abrirGrupo: "Abrir {setor}",
    fecharGrupo: "Fechar {setor}",
    semAbertura: "Sem abertura de vendas",
    encerradas: "Venda encerrada",
    vincularPasskey: "Vincular Passkey",
    grupos: { one: "{n} grupo", other: "{n} grupos" },
    sessoes: { one: "{n} sessão", other: "{n} sessões" },
    vendidosCurto: "{vendidos} de {total}",
    emitidosN: { one: "{n} emitido", other: "{n} emitidos" },
    percentualDe: "{pct} de {total}",
    ateMax: "até {max}",
    pendentesN: { one: "{n} pendente", other: "{n} pendentes" },
    disponiveisN: { one: "{n} disponível", other: "{n} disponíveis" },
    emitidosLegenda: "Emitidos",
    reservadosLegenda: "Reservados",
    ocupacaoDe: "{pct} de {total}",
    acessoPortao: "Entrada: {acesso}",
    tipoAcessoOpcoes: { qr: "Código QR", facial: "Reconhecimento facial" },
    aVenda: "À venda",
    ordemSalva: "Ordem salva. A compra já mostra a nova ordem.",
    desfazer: "Desfazer",
    pausado: "{ingresso} pausado. Ele para de vender na hora.",
    voltou: "{ingresso} voltou a vender.",
    setorVazio: "Nenhum ingresso neste grupo",
    setorVazioDica: "Sem ingresso, o grupo não aparece na compra.",
    buscar: "Buscar ingresso ou grupo",
    todosEstados: "Todos os estados",
    todasSessoes: "Todas as sessões",
    todosSetores: "Todos os grupos",
    nadaNoFiltro: "Nenhum ingresso encontrado",
    nadaNoFiltroDica: "Tente outro nome ou limpe os filtros.",
    limparFiltros: "Limpar filtros",
    abreEm: "Abre em {quando}",
    sessaoTitulo: { one: "{sessao}, {n} ingresso", other: "{sessao}, {n} ingressos" },
    sessaoComFim: "{dia}, das {inicio} às {fim}",
    sessaoSemFim: "{dia}, às {inicio}",
};


/** Ingressos criados agora pela criação rápida: entram na lista abrindo a altura (ITM-139). */
const ingressosNovos = new Set<string>();
/** Lotes criados agora na lista: entram abrindo a altura (ITM-140). */
const lotesNovos = new Set<string>();

/**
 * A criação de lote fica dentro da linha do ingresso, longe da página: o contexto leva o formulário aberto
 * (um por vez na tela toda) e a proteção do que foi digitado (ITM-133, ITM-140).
 */
const FormulariosDaLista = createContext<{
    criandoLote: string | null;
    abrirCriacaoDeLote: (tipoId: string) => void;
    fecharCriacaoDeLote: (tipoId: string) => void;
    protegido: (acao: () => void) => () => void;
    marcarAlterado: (v: boolean) => void;
} | null>(null);

/** Grupos sem caixa em volta (UI-VIS-019, ITM-152): só o espaço separa um grupo do anterior, sem linha (ITM-157). */
const DIVISAO_DE_GRUPOS = "not-first:pt-4";

/** Escala da lista (ITM-144): sessões e grupos em blocos com "Mostrar mais"; acima de tantos grupos na sessão, eles começam fechados. */
const PASSO_SESSOES = 20;
const PASSO_GRUPOS = 30;
const GRUPOS_ABERTOS_ATE = LIMIAR_FERRAMENTAS;
/** Buscando ou filtrando, quantos grupos achados abrem sozinhos. */
const GRUPOS_ABERTOS_NA_BUSCA = 3;

/**
 * Dados que toda linha usa, calculados uma vez na página e não em cada linha (UI-LST-002): vendidos,
 * pendentes, o estado com as aberturas, a quantidade de grupos e se a coluna Virada de lote aparece.
 */
const DadosDaLista = createContext<{
    vendidos: Map<string, number>;
    pendentes: Map<string, number>;
    aberturasDe: (tipoId: string) => AberturaDeVendas[] | undefined;
    totalDeGrupos: number;
    comVirada: boolean;
    /** Algum ingresso ou lote do evento tem Passkey: só então a coluna Passkey aparece (ITM-145). */
    comPasskey: boolean;
}>({ vendidos: new Map(), pendentes: new Map(), aberturasDe: () => undefined, totalDeGrupos: 0, comVirada: false, comPasskey: false });

/** Estados que a lista pode mostrar, na ordem do filtro (ITM-10, ITM-12). */
const ESTADOS: EstadoItem[] = ["a-venda", "agendado", "sem-abertura", "encerrado", "pausado", "esgotado", "sem-estoque"];

export function Ingressos() {
    const navigate = useNavigate();
    const { carregando, evento, vendidos, pendentes } = useCatalogo();
    const { t, plural, quando, diaLongo, hora } = useTextosItens();
    // "5 de dezembro de 2026, das 22:00 às 04:00". Sessão antiga sem fim: o do evento, se ele tem uma sessão só.
    const nomeDaSessao = (s: Sessao) => {
        const fim = s.fim ?? (evento?.sessoes.length === 1 ? evento.fim : undefined);
        return fim ? formatar(T.sessaoComFim, { dia: diaLongo(s.inicio), inicio: hora(s.inicio), fim: hora(fim) }) : formatar(T.sessaoSemFim, { dia: diaLongo(s.inicio), inicio: hora(s.inicio) });
    };
    // Criar e editar grupo são na própria lista, um formulário aberto por vez (ITM-131, ITM-132).
    const [criacao, setCriacao] = useState<{ sessaoId: string; vez: number; filtrosLimpos: boolean } | null>(null);
    const [editando, setEditando] = useState<string | null>(null);
    // Criação rápida de ingresso, dentro do grupo (ITM-139); um formulário aberto por vez na tela toda.
    const [criandoIngresso, setCriandoIngresso] = useState<{ grupoId: string; vez: number } | null>(null);
    // Criação de lote, com os lotes do ingresso abertos (ITM-140): o id do ingresso.
    const [criandoLote, setCriandoLote] = useState<string | null>(null);
    // O que foi digitado e não salvo não se perde em silêncio: fechar ou trocar de formulário pergunta antes (ITM-133).
    const alterado = useRef(false);
    const [descartar, setDescartar] = useState<(() => void) | null>(null);
    const protegido = (acao: () => void) => () => (alterado.current ? setDescartar(() => acao) : acao());
    // Ao fechar, o foco volta a quem abriu; ao remover, vai para o grupo vizinho (ITM-133).
    const focoDepois = useRef<(() => HTMLElement | null) | null>(null);
    const botaoEditar = (grupoId: string) => document.querySelector<HTMLElement>(`[data-editar-grupo="${grupoId}"]`);
    const acaoCriar = (id: string) => document.querySelector<HTMLElement>(`[data-criar-grupo="${id}"]`);
    // Grupos criados agora entram na lista com animação; os que já estavam, não.
    const [recemCriados, setRecemCriados] = useState<ReadonlySet<string>>(new Set());
    // Só um dos grupos novos puxa a tela (o criado agora, ou a cópia na sessão de origem), e a sessão dele abre.
    const [rolarPara, setRolarPara] = useState<{ grupoId: string; sessaoId: string } | null>(null);
    // Duplicar grupo com várias sessões: escolher em quais (ITM-135).
    const [destinoDoGrupo, setDestinoDoGrupo] = useState<{ grupo: Grupo; sessaoId: string } | null>(null);
    // Excluir grupo (ITM-168): sem vendas, confirma quando tem ingressos; com vendas, explica por que não dá.
    const [exclusao, setExclusao] = useState<{ grupo: Grupo; sessao: Sessao; comVendas: boolean } | null>(null);
    const [busca, setBusca] = useState("");
    const [estado, setEstado] = useState("todos");
    const [sessaoId, setSessaoId] = useState("todos");
    const [setorNome, setSetorNome] = useState("todos");
    // Cópia local para arrastar sem esperar o banco; grava ao soltar (ITM-08).
    const [local, setLocal] = useState<Sessao[]>([]);
    const localRef = useRef<Sessao[]>([]);
    localRef.current = local;
    useEffect(() => setLocal(evento?.sessoes ?? []), [evento?.sessoes]);

    const sessoes = local.length || !evento ? local : evento.sessoes;
    // Contagens, nomes e o índice de busca saem uma vez por catálogo, não a cada tecla (UI-LST-002).
    const contagem = useMemo(() => {
        let grupos = 0;
        let ingressos = 0;
        let comPasskey = false;
        for (const s of sessoes) {
            grupos += s.grupos.length;
            for (const g of s.grupos) {
                ingressos += g.ingressos.length;
                if (!comPasskey) comPasskey = g.ingressos.some((tp) => !!tp.chaves?.length || tp.lotes.some((l) => !!l.chaves?.length));
            }
        }
        return { grupos, ingressos, comPasskey };
    }, [sessoes]);
    const totalIngressos = contagem.ingressos;
    const nomesDeSetor = useMemo(() => [...new Set(sessoes.flatMap((s) => s.grupos.map((g) => g.nome)))], [sessoes]);
    const indiceDeBusca = useMemo(() => {
        const indice = new Map<string, string>();
        for (const s of sessoes)
            for (const g of s.grupos) {
                const doGrupo = paraBusca(g.nome);
                for (const tp of g.ingressos) indice.set(tp.id, `${paraBusca(tp.nome)} ${doGrupo}`);
            }
        return indice;
    }, [sessoes]);
    const porIngresso = useMemo(() => aberturasPorIngresso(evento?.aberturas), [evento?.aberturas]);
    const dados = useMemo(
        () => ({ vendidos, pendentes, aberturasDe: (id: string) => porIngresso.get(id), totalDeGrupos: contagem.grupos, comVirada: !!evento?.conjuntosSincronizados?.length, comPasskey: contagem.comPasskey }),
        [vendidos, pendentes, porIngresso, contagem.grupos, contagem.comPasskey, evento?.conjuntosSincronizados],
    );

    /** Abre a criação rápida na sessão. Limpa os filtros, senão o grupo novo (sem ingressos) ficaria escondido; o formulário avisa. */
    const abrirCriacao = (id: string) => {
        const comFiltro = filtrando;
        limparFiltros();
        setEditando(null);
        setCriandoIngresso(null);
        setCriandoLote(null);
        setCriacao((c) => ({ sessaoId: id, vez: (c?.vez ?? 0) + 1, filtrosLimpos: comFiltro }));
    };
    const abrirEdicao = (grupoId: string) => {
        setCriacao(null);
        setCriandoIngresso(null);
        setCriandoLote(null);
        setEditando(grupoId);
    };
    const abrirCriacaoDeIngresso = (grupoId: string) => {
        setCriacao(null);
        setEditando(null);
        setCriandoLote(null);
        setCriandoIngresso((c) => ({ grupoId, vez: (c?.vez ?? 0) + 1 }));
    };
    const abrirCriacaoDeLote = (tipoId: string) => {
        setCriacao(null);
        setEditando(null);
        setCriandoIngresso(null);
        setCriandoLote(tipoId);
    };
    const fecharCriacaoDeLote = (tipoId: string) => {
        setCriandoLote(null);
        focoDepois.current = () => document.querySelector<HTMLElement>(`[data-criar-lote="${tipoId}"]`);
    };
    const fecharCriacaoDeIngresso = (grupoId: string) => {
        setCriandoIngresso(null);
        focoDepois.current = () => document.querySelector<HTMLElement>(`[data-criar-ingresso="${grupoId}"]`);
    };
    /** "Mais opções": leva o que foi digitado para a página do ingresso, já no grupo (ITM-139). */
    const abrirPaginaDoIngresso = (grupoId: string, r?: RascunhoRapido) => {
        alterado.current = false;
        const q = new URLSearchParams({ setor: grupoId });
        if (r?.nome) q.set("nome", r.nome);
        if (r?.beneficio && r.beneficio !== "inteira") q.set("tipo", r.beneficio);
        if (r?.preco !== undefined) q.set("preco", String(r.preco));
        if (r?.quantidade) q.set("quantidade", String(r.quantidade));
        navigate(`/backstage/catalogo/ingressos/novo?${q.toString()}`);
    };
    /**
     * Duplica o grupo nas sessões escolhidas (padrão: a dele). As cópias entram com animação; a tela rola
     * até a da sessão de origem (ou a primeira) e abre a sessão dela (ITM-135).
     */
    const duplicarGrupo = async (grupo: Grupo, sessaoDeOrigem: string, destinos?: string[]) => {
        if (!evento) return;
        const antes = evento.sessoes;
        const { sessoes: prox, copias } = comGrupoDuplicado(evento, grupo.id, destinos);
        if (!copias.length) return;
        setRecemCriados((r) => new Set([...r, ...copias.map((c) => c.copia.id)]));
        const alvo = copias.find((c) => c.sessaoId === sessaoDeOrigem) ?? copias[0];
        setRolarPara({ grupoId: alvo.copia.id, sessaoId: alvo.sessaoId });
        try {
            await salvarSessoes(evento, prox);
            const msg = copias.length === 1 ? formatar(T.grupoDuplicado, { grupo: copias[0].copia.nome }) : formatar(T.grupoDuplicadoEmVarias, { grupo: grupo.nome, n: copias.length });
            toast.success(msg, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    const pedirDuplicarGrupo = (grupo: Grupo, sessaoId: string) => {
        if ((evento?.sessoes.length ?? 0) > 1) setDestinoDoGrupo({ grupo, sessaoId });
        else void duplicarGrupo(grupo, sessaoId);
    };
    const fecharCriacao = (id: string) => {
        setCriacao(null);
        focoDepois.current = () => acaoCriar(id);
    };
    const excluirGrupo = async (sessao: Sessao, grupo: Grupo) => {
        if (!evento) return;
        const antes = evento.sessoes;
        try {
            await salvarSessoes(evento, semSetor(evento, grupo.id));
            toast.success(formatar(T.grupoExcluido, { grupo: grupo.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
            alterado.current = false;
            fecharEdicao(sessao, grupo.id, "removido");
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    // Pedido de exclusão, do menu do grupo ou do formulário de edição: sem ingressos, exclui direto (com "Desfazer").
    const pedirExcluirGrupo = (sessao: Sessao, grupo: Grupo, comVendas: boolean) => {
        if (!comVendas && grupo.ingressos.length === 0) void excluirGrupo(sessao, grupo);
        else setExclusao({ grupo, sessao, comVendas });
    };
    const fecharEdicao = (sessao: Sessao, grupoId: string, motivo: MotivoDoFechamento) => {
        setEditando(null);
        if (motivo === "removido") {
            const i = sessao.grupos.findIndex((g) => g.id === grupoId);
            const vizinho = sessao.grupos[i + 1] ?? sessao.grupos[i - 1];
            focoDepois.current = () => (vizinho ? botaoEditar(vizinho.id) : null) ?? acaoCriar(sessao.id);
        } else focoDepois.current = () => botaoEditar(grupoId);
    };
    // Depois de o cartão ou o botão voltar à tela (e de o modal de descarte devolver o foco dele).
    useEffect(() => {
        const achar = focoDepois.current;
        if (!achar) return;
        let quadro = requestAnimationFrame(() => {
            quadro = requestAnimationFrame(() => {
                const alvo = achar();
                if (!alvo) return;
                focoDepois.current = null;
                alvo.focus();
            });
        });
        return () => cancelAnimationFrame(quadro);
    });

    // "Criar" no passo de grupos do guia de configuração chega com ?novoSetor=1 e abre a criação rápida na primeira sessão (GDC-11).
    const [parametros, setParametros] = useSearchParams();
    useEffect(() => {
        if (carregando || !parametros.has(PARAMETRO_NOVO_SETOR) || !sessoes.length) return;
        abrirCriacao(sessoes[0].id);
        setParametros((p) => {
            p.delete(PARAMETRO_NOVO_SETOR);
            return p;
        }, { replace: true });
    }, [carregando, parametros, sessoes.length]);

    // Filtro aplicado à árvore sessão > setor > ingressos (UI-LST-001). A busca é adiada: digitar não
    // espera a lista refazer (UI-LST-002); cada palavra precisa estar no nome do ingresso ou do grupo.
    const termo = paraBusca(useDeferredValue(busca).trim());
    const filtrando = !!termo || estado !== "todos" || sessaoId !== "todos" || setorNome !== "todos";
    const arvore = useMemo(() => {
        const palavras = termo.split(/\s+/).filter(Boolean);
        const casa = (tp: TipoIngresso) => {
            if (palavras.length) {
                const texto = indiceDeBusca.get(tp.id) ?? "";
                if (!palavras.every((p) => texto.includes(p))) return false;
            }
            return estado === "todos" || estadoComAberturasDele(tp, vendidos, porIngresso.get(tp.id)) === estado;
        };
        const out: { sessao: Sessao; setores: { setor: Grupo; ingressos: TipoIngresso[] }[] }[] = [];
        for (const s of sessoes) {
            if (sessaoId !== "todos" && s.id !== sessaoId) continue;
            const setores: { setor: Grupo; ingressos: TipoIngresso[] }[] = [];
            for (const g of s.grupos) {
                if (setorNome !== "todos" && g.nome !== setorNome) continue;
                const ingressos = palavras.length || estado !== "todos" ? g.ingressos.filter(casa) : g.ingressos;
                if (!filtrando || ingressos.length > 0) setores.push({ setor: g, ingressos });
            }
            if (!filtrando || setores.length > 0) out.push({ sessao: s, setores });
        }
        return out;
    }, [sessoes, sessaoId, setorNome, termo, estado, vendidos, filtrando, porIngresso, indiceDeBusca]);
    const visiveisNoFiltro = useMemo(() => arvore.reduce((n, a) => n + a.setores.reduce((m, x) => m + x.ingressos.length, 0), 0), [arvore]);
    // Sessões entram de 20 em 20 (ITM-144); filtro novo volta ao começo.
    const paginaDeSessoes = useMostrarMais(arvore, PASSO_SESSOES);

    /** Grava a ordem atual (a ordem do fluxo de compra), com "Desfazer". */
    const salvarOrdem = async (prox: Sessao[]) => {
        if (!evento) return;
        const antes = evento.sessoes;
        if (JSON.stringify(prox.map((s) => s.grupos.map((g) => [g.id, g.ingressos.map((i) => i.id)]))) === JSON.stringify(antes.map((s) => s.grupos.map((g) => [g.id, g.ingressos.map((i) => i.id)])))) return;
        try {
            await salvarSessoes(evento, prox);
            toast.success(T.ordemSalva, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
            setLocal(antes);
        }
    };
    const reordenarSetores = (sessaoId: string, grupos: Grupo[]) => setLocal((l) => l.map((s) => (s.id === sessaoId ? { ...s, grupos } : s)));
    const reordenarIngressos = (setorId: string, ingressos: TipoIngresso[]) =>
        setLocal((l) => l.map((s) => ({ ...s, grupos: s.grupos.map((g) => (g.id === setorId ? { ...g, ingressos } : g)) })));
    /** Teclado: move um passo e grava na hora. */
    const moverSetorPorTeclado = (sessaoId: string, i: number, delta: -1 | 1) => {
        const prox = localRef.current.map((s) => (s.id === sessaoId ? { ...s, grupos: mover(s.grupos, i, i + delta) } : s));
        setLocal(prox);
        salvarOrdem(prox);
    };
    const moverIngressoPorTeclado = (setorId: string, i: number, delta: -1 | 1) => {
        const prox = localRef.current.map((s) => ({ ...s, grupos: s.grupos.map((g) => (g.id === setorId ? { ...g, ingressos: mover(g.ingressos, i, i + delta) } : g)) }));
        setLocal(prox);
        salvarOrdem(prox);
    };
    // Arrastar só sem filtro: com a lista filtrada, a posição de cada item fica ambígua.
    const podeArrastar = !filtrando;
    const chaveFiltro = `${termo}|${estado}|${sessaoId}|${setorNome}`;
    useEffect(() => paginaDeSessoes.reiniciar(), [chaveFiltro]);

    const limparFiltros = () => {
        setBusca("");
        setEstado("todos");
        setSessaoId("todos");
        setSetorNome("todos");
    };


    return (
        // Rail, menu, título e abas ficam no LayoutDeItens: trocar de aba troca só este conteúdo.
        <DadosDaLista.Provider value={dados}>
        <FormulariosDaLista.Provider value={{ criandoLote, abrirCriacaoDeLote, fecharCriacaoDeLote, protegido, marcarAlterado: (v) => (alterado.current = v) }}>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <h2 className="sr-only">{T.titulo}</h2>

                {!carregando && (
                    <BarraDeFiltros
                        total={totalIngressos}
                        visiveis={visiveisNoFiltro}
                        busca={busca}
                        onBusca={setBusca}
                        placeholder={T.buscar}
                        onLimpar={limparFiltros}
                        filtros={[
                            { id: "estado", rotulo: "Estado", valor: estado, onChange: setEstado, opcoes: [{ id: "todos", label: T.todosEstados }, ...ESTADOS.map((e) => ({ id: e, label: t.estado[e] }))] },
                            // Sessão (com data e hora) e grupo têm busca quando passam de 8 opções (UI-LST-001).
                            ...(sessoes.length > 1
                                ? [
                                      {
                                          id: "sessao",
                                          rotulo: "Sessão",
                                          valor: sessaoId,
                                          onChange: setSessaoId,
                                          comBusca: sessoes.length > LIMIAR_FERRAMENTAS,
                                          opcoes: [{ id: "todos", label: T.todasSessoes }, ...sessoes.map((s) => ({ id: s.id, label: quando(s.inicio) }))],
                                      },
                                  ]
                                : []),
                            ...(nomesDeSetor.length > 1
                                ? [
                                      {
                                          id: "setor",
                                          rotulo: "Grupo",
                                          valor: setorNome,
                                          onChange: setSetorNome,
                                          comBusca: nomesDeSetor.length > LIMIAR_FERRAMENTAS,
                                          opcoes: [{ id: "todos", label: T.todosSetores }, ...nomesDeSetor.map((n) => ({ id: n, label: n }))],
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}

                {carregando ? (
                    <Esqueleto />
                ) : filtrando && visiveisNoFiltro === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <EmptyState size="sm">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{T.nadaNoFiltro}</EmptyState.Title>
                                <EmptyState.Description>{T.nadaNoFiltroDica}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button color="secondary" size="md" onClick={limparFiltros}>
                                    {T.limparFiltros}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <>
                    {paginaDeSessoes.visiveis.map(({ sessao, setores: setoresDaSessao }, idx) => {
                        // Muitos grupos na sessão: começam fechados, e o grupo abre pela linha (ITM-144).
                        // Até 8 grupos na sessão, todos abertos; acima disso, fechados. Filtrando, abrem os achados
                        // quando são até 8; senão, só os 3 primeiros (abrir mil grupos achados pesaria).
                        const abertoDeInicio = (i: number) =>
                            filtrando ? setoresDaSessao.length <= GRUPOS_ABERTOS_ATE || i < GRUPOS_ABERTOS_NA_BUSCA : sessao.grupos.length <= GRUPOS_ABERTOS_ATE;
                        const cartao = (setor: Grupo, ingressos: TipoIngresso[], i: number, alca?: ReactNode) => (
                            <CartaoDoSetor
                                evento={evento!}
                                setor={setor}
                                ingressos={ingressos}
                                abertoInicial={abertoDeInicio(i) || recemCriados.has(setor.id) || rolarPara?.grupoId === setor.id}
                                alca={alca}
                                arrastavel={podeArrastar}
                                onReordenar={(lista) => reordenarIngressos(setor.id, lista)}
                                onSoltar={() => salvarOrdem(localRef.current)}
                                onMoverPorTeclado={(i, d) => moverIngressoPorTeclado(setor.id, i, d)}
                                editando={editando === setor.id}
                                edicao={
                                    editando === setor.id && (
                                        <FormularioDoGrupo
                                            evento={evento!}
                                            sessaoId={sessao.id}
                                            grupo={setor}
                                            onAlterado={(v) => (alterado.current = v)}
                                            onPedirFechar={protegido(() => fecharEdicao(sessao, setor.id, "cancelado"))}
                                            onFechar={(motivo) => fecharEdicao(sessao, setor.id, motivo)}
                                            onExcluir={() => pedirExcluirGrupo(sessao, setor, vendidosDoSetor(setor, vendidos) > 0)}
                                        />
                                    )
                                }
                                onEditar={protegido(() => abrirEdicao(setor.id))}
                                onDuplicar={protegido(() => pedirDuplicarGrupo(setor, sessao.id))}
                                onExcluir={protegido(() => pedirExcluirGrupo(sessao, setor, vendidosDoSetor(setor, vendidos) > 0))}
                                criandoIngresso={criandoIngresso?.grupoId === setor.id}
                                formIngresso={
                                    criandoIngresso?.grupoId === setor.id && (
                                        <FormularioDoIngresso
                                            key={criandoIngresso.vez}
                                            evento={evento!}
                                            grupo={setor}
                                            onAlterado={(v) => (alterado.current = v)}
                                            onAntesDeCriar={(id) => ingressosNovos.add(id)}
                                            onPedirFechar={protegido(() => fecharCriacaoDeIngresso(setor.id))}
                                            onMaisOpcoes={(r) => abrirPaginaDoIngresso(setor.id, r)}
                                        />
                                    )
                                }
                                onNovoIngresso={protegido(() => abrirCriacaoDeIngresso(setor.id))}
                            />
                        );
                        // A ordem dos setores e dos ingressos é a ordem do fluxo de compra: alça no hover (ITM-08).
                        // Os grupos entram de 30 em 30 (ITM-144); arrastar reordena os que estão na tela.
                        const conteudo = (
                            <GruposDaSessao
                                grupos={podeArrastar ? sessao.grupos : setoresDaSessao.map((x) => x.setor)}
                                revelar={rolarPara?.sessaoId === sessao.id ? rolarPara.grupoId : undefined}
                            >
                                {(visiveis) =>
                                    podeArrastar ? (
                            <Reorder.Group as="div" axis="y" values={visiveis} onReorder={(grupos: Grupo[]) => reordenarSetores(sessao.id, [...grupos, ...sessao.grupos.slice(grupos.length)])} className="flex flex-col gap-6">
                                {visiveis.map((setor, i) => (
                                    <SetorArrastavel
                                        key={setor.id}
                                        setor={setor}
                                        entrar={recemCriados.has(setor.id)}
                                        rolar={rolarPara?.grupoId === setor.id}
                                        onEntrou={() =>
                                            setRecemCriados((r) => {
                                                const prox = new Set(r);
                                                prox.delete(setor.id);
                                                return prox;
                                            })
                                        }
                                        onSoltar={() => salvarOrdem(localRef.current)}
                                        render={(alca) => cartao(setor, setor.ingressos, i, alca)}
                                        onMoverPorTeclado={(d) => moverSetorPorTeclado(sessao.id, i, d)}
                                    />
                                ))}
                            </Reorder.Group>
                                    ) : (
                                        <div className="flex flex-col gap-6">
                                            {visiveis.map((setor, i) => (
                                                <div key={`${setor.id}-${chaveFiltro}`} className={DIVISAO_DE_GRUPOS}>{cartao(setor, setoresDaSessao.find((x) => x.setor.id === setor.id)?.ingressos ?? [], i)}</div>
                                            ))}
                                        </div>
                                    )
                                }
                            </GruposDaSessao>
                        );
                        // A sessão sempre aparece, com o "Novo grupo" dela: o grupo nasce na sessão em que se clicou.
                        const n = setoresDaSessao.reduce((s, x) => s + x.ingressos.length, 0);
                        const semGrupo = sessao.grupos.length === 0;
                        const criando = criacao?.sessaoId === sessao.id;
                        return (
                            <SessaoDaLista
                                key={`${sessao.id}-${chaveFiltro}`}
                                titulo={n === 0 ? nomeDaSessao(sessao) : plural(T.sessaoTitulo, n, { sessao: nomeDaSessao(sessao) })}
                                recolhivel={arvore.length > 1}
                                abertaInicial={idx < 2 || arvore.length <= 3}
                                forcarAberta={criando || rolarPara?.sessaoId === sessao.id}
                            >
                                {!semGrupo && conteudo}
                                {/* Campo retangular (ITM-130), sempre no fim da sessão: pontilhado e transparente, 44 px; o campo inteiro é o botão. Na sessão vazia, 88 px com a dica. O formato de ingresso fica para criar ingresso. */}
                                <Surgir visivel={!criando} gap={semGrupo ? 0 : 16}>
                                    <CampoDeIngresso formato="retangulo" altura={semGrupo ? 88 : 44} icone={Plus} dica={semGrupo ? T.vazioDica : undefined} data-criar-grupo={sessao.id} onPress={protegido(() => abrirCriacao(sessao.id))}>
                                        {T.novoSetor}
                                    </CampoDeIngresso>
                                </Surgir>
                                {/* Criação rápida (ITM-131): o mesmo retângulo, aberto, no fim da sessão, onde o grupo novo entra. */}
                                <Surgir visivel={criando && !!evento} gap={16}>
                                    {evento && criacao && criando && (
                                        <FormularioDoGrupo
                                            key={criacao.vez}
                                            evento={evento}
                                            sessaoId={sessao.id}
                                            nomeDaSessao={evento.sessoes.length > 1 ? nomeDaSessao(sessao) : undefined}
                                            filtrosLimpos={criacao.filtrosLimpos}
                                            onAlterado={(v) => (alterado.current = v)}
                                            onCriado={(g) => {
                                                setRecemCriados((r) => new Set(r).add(g.id));
                                                setRolarPara({ grupoId: g.id, sessaoId: sessao.id });
                                            }}
                                            onPedirFechar={protegido(() => fecharCriacao(sessao.id))}
                                            onFechar={() => fecharCriacao(sessao.id)}
                                        />
                                    )}
                                </Surgir>
                            </SessaoDaLista>
                        );
                    })}
                    <BotaoMostrarMais restantes={paginaDeSessoes.restantes} onClick={paginaDeSessoes.mostrarMais} passo={PASSO_SESSOES} unidade={T.sessoes} />
                    </>
                )}

            </div>

            {/* Duplicar grupo em outras sessões (ITM-135): escolher onde, já com a sessão dele marcada. */}
            {destinoDoGrupo && evento && (
                <SeletorDeDestino
                    titulo={formatar(T.duplicarEm, { item: destinoDoGrupo.grupo.nome })}
                    descricao={T.duplicarGrupoDica}
                    escolher="sessoes"
                    sessoes={evento.sessoes.map((s) => ({ id: s.id, rotulo: nomeDaSessao(s), grupos: s.grupos.map((g) => ({ id: g.id, nome: g.nome })) }))}
                    selecionados={[destinoDoGrupo.sessaoId]}
                    rotuloConfirmar={T.duplicar}
                    onFechar={() => setDestinoDoGrupo(null)}
                    onConfirmar={(ids) => {
                        const { grupo, sessaoId: origem } = destinoDoGrupo;
                        setDestinoDoGrupo(null);
                        void duplicarGrupo(grupo, origem, ids);
                    }}
                />
            )}

            {/* Excluir grupo (ITM-168): com vendas, só explica; sem, confirma (o grupo com ingressos leva os ingressos junto). */}
            <ModalOverlay isOpen={!!exclusao} onOpenChange={(v) => !v && setExclusao(null)} isDismissable>
                <Modal className="sm:max-w-[400px]">
                    <Dialog>
                        {exclusao && (
                            <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                                <div className="flex flex-col gap-1">
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        {formatar(exclusao.comVendas ? T.naoExcluiTitulo : T.excluirTitulo, { grupo: exclusao.grupo.nome })}
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">
                                        {exclusao.comVendas ? T.naoExcluiDica : plural(T.excluirComIngressos, exclusao.grupo.ingressos.length)}
                                    </p>
                                </div>
                                {exclusao.comVendas ? (
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <Button color="secondary" size="md" autoFocus onClick={() => setExclusao(null)}>
                                            {T.entendi}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <Button color="secondary" size="md" autoFocus onClick={() => setExclusao(null)}>
                                            {T.cancelar}
                                        </Button>
                                        <Button
                                            color="primary-destructive"
                                            size="md"
                                            onClick={() => {
                                                const { sessao, grupo } = exclusao;
                                                setExclusao(null);
                                                void excluirGrupo(sessao, grupo);
                                            }}
                                        >
                                            {T.excluirGrupo}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>

            {/* Descartar o que foi digitado (ITM-133): alerta sobre a lista, foco inicial em continuar. */}
            <ModalOverlay isOpen={!!descartar} onOpenChange={(v) => !v && setDescartar(null)} isDismissable>
                <Modal className="sm:max-w-[400px]">
                    <Dialog>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-border-secondary">
                            <div className="flex flex-col gap-1">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    {T.descartarTitulo}
                                </AriaHeading>
                                <p className="text-sm text-tertiary">{T.descartarDica}</p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button color="secondary" size="md" autoFocus onClick={() => setDescartar(null)}>
                                    {T.continuarEditando}
                                </Button>
                                <Button
                                    color="primary-destructive"
                                    size="md"
                                    onClick={() => {
                                        const acao = descartar;
                                        alterado.current = false;
                                        setDescartar(null);
                                        acao?.();
                                    }}
                                >
                                    {T.descartar}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </FormulariosDaLista.Provider>
        </DadosDaLista.Provider>
    );
}

/**
 * Grupos de uma sessão, de 30 em 30, com "Mostrar mais" (ITM-144): mil grupos não viram mil cartões de uma
 * vez. O grupo recém-criado ou duplicado que puxa a tela (`revelar`) entra na conta, mesmo depois dos 30.
 */
function GruposDaSessao({ grupos, revelar, children }: { grupos: Grupo[]; revelar?: string; children: (visiveis: Grupo[]) => ReactNode }) {
    const [limite, setLimite] = useState(PASSO_GRUPOS);
    useEffect(() => {
        if (!revelar) return;
        const i = grupos.findIndex((g) => g.id === revelar);
        if (i >= limite) setLimite(i + 1);
    }, [revelar, grupos]);
    const visiveis = grupos.length > limite ? grupos.slice(0, limite) : grupos;
    return (
        <>
            {children(visiveis)}
            <BotaoMostrarMais restantes={grupos.length - visiveis.length} onClick={() => setLimite((l) => l + PASSO_GRUPOS)} passo={PASSO_GRUPOS} unidade={T.grupos} />
        </>
    );
}


/** Sessão da lista: título e contagem; criar grupo é pelo campo no fim dela. Com várias, recolhível, e só as primeiras abrem (UI-LST-001). */
function SessaoDaLista({
    titulo,
    recolhivel,
    abertaInicial,
    forcarAberta,
    children,
}: {
    titulo: string;
    recolhivel: boolean;
    abertaInicial: boolean;
    /** Criando um grupo nela: abre a sessão recolhida. */
    forcarAberta?: boolean;
    children: ReactNode;
}) {
    const [aberta, setAberta] = useState(abertaInicial);
    useEffect(() => {
        if (forcarAberta) setAberta(true);
    }, [forcarAberta]);
    const visivel = !recolhivel || aberta;
    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0">
                    {recolhivel ? (
                        <button
                            type="button"
                            aria-expanded={aberta}
                            onClick={() => setAberta((a) => !a)}
                            className="flex w-full items-center gap-2 rounded-lg text-left text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2"
                        >
                            <ChevronDown className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-200 motion-reduce:transition-none", !aberta && "-rotate-90")} aria-hidden="true" />
                            {titulo}
                        </button>
                    ) : (
                        <span className="text-lg font-semibold text-primary">{titulo}</span>
                    )}
                </h2>
            </div>
            <Surgir visivel={visivel}>
                <div className="flex flex-col gap-4">{children}</div>
            </Surgir>
        </section>
    );
}


/** Setor dentro da lista arrastável: cria os controles de arrastar e entrega a alça ao cartão. */
function SetorArrastavel({
    setor,
    entrar,
    rolar,
    onEntrou,
    render,
    onSoltar,
    onMoverPorTeclado,
}: {
    setor: Grupo;
    /** Grupo recém-criado: entra abrindo a altura e a tela rola suave até ele (UI-VIS-008, ITM-131). */
    entrar?: boolean;
    /** Este é o grupo novo que puxa a tela (com várias cópias, só uma rola). */
    rolar?: boolean;
    /** Já entrou: não anima nem rola de novo se a lista remontar. */
    onEntrou?: () => void;
    render: (alca: ReactNode) => ReactNode;
    onSoltar: () => void;
    onMoverPorTeclado: (d: -1 | 1) => void;
}) {
    const controles = useDragControls();
    const reduzir = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    // A altura só fica cortada enquanto abre; depois, o contorno do cartão não pode ser cortado.
    const [abrindo, setAbrindo] = useState(!!entrar && !reduzir);
    // Rola junto com a entrada, para não perder a referência (ITM-131): com o formulário de criação logo
    // abaixo, a tela sobe a altura do grupo novo e o formulário fica parado onde estava, com o grupo
    // aparecendo acima dele; sem formulário (grupo duplicado), só garante o grupo novo à vista. Nos
    // dois, o topo do grupo novo nunca some sob a borda de cima.
    useLayoutEffect(() => {
        const cartao = ref.current;
        if (!entrar || !rolar || !cartao) return;
        const altura = (cartao.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
        // gap-6 entre os grupos, mais a linha e o respiro de cima do grupo (DIVISAO_DE_GRUPOS), quando há.
        const item = cartao.parentElement ? getComputedStyle(cartao.parentElement) : null;
        const vao = 24 + (item ? parseFloat(item.paddingTop) + parseFloat(item.borderTopWidth) : 0);
        const topo = cartao.getBoundingClientRect().top;
        // Folga do topo (barra do evento no celular) e do pé (o guia ocupa o rodapé no celular).
        const folgaTopo = 96;
        const folgaPe = window.innerWidth < 768 ? 160 : 24;
        const limite = window.innerHeight - folgaPe;
        const form = cartao.closest("section")?.querySelector("form");
        const maximo = topo - folgaTopo; // mais que isso, o topo do grupo novo some
        let delta: number;
        if (form) {
            const minimo = topo + altura + vao + form.getBoundingClientRect().height - limite; // menos que isso, o formulário sai pelo pé
            delta = Math.min(Math.max(altura + vao, minimo), maximo);
        } else {
            const fundo = topo + altura;
            delta = fundo > limite ? Math.min(fundo - limite, maximo) : topo < folgaTopo ? topo - folgaTopo : 0;
        }
        if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: reduzir ? "auto" : "smooth" });
    }, []);
    // Depois da entrada: solta o corte da altura (o contorno do cartão não pode ser cortado) e avisa que
    // já entrou, para não animar de novo se a lista remontar. Por tempo, e não por onAnimationComplete,
    // que não dispara dentro do Reorder.Item.
    useEffect(() => {
        if (!entrar) return;
        const t = window.setTimeout(
            () => {
                setAbrindo(false);
                onEntrou?.();
            },
            reduzir ? 0 : DURACAO_TRANSICAO * 1000 + 30,
        );
        return () => window.clearTimeout(t);
    }, []);
    return (
        <Reorder.Item as="div" value={setor} dragListener={false} dragControls={controles} onDragEnd={onSoltar} transition={{ duration: reduzir ? 0 : DURACAO_TRANSICAO }} className={cx("group/setor", DIVISAO_DE_GRUPOS)}>
            <motion.div
                ref={ref}
                initial={abrindo ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: DURACAO_TRANSICAO, ease: [0.16, 1, 0.3, 1] }}
                className={cx(abrindo && "overflow-hidden")}
            >
                {render(<Alca grupo="setor" nome={setor.nome} onPointerDown={(e) => controles.start(e)} onMover={onMoverPorTeclado} />)}
            </motion.div>
        </Reorder.Item>
    );
}

/**
 * Lista dos ingressos do grupo (ITM-153): um card por ingresso, na largura toda, um embaixo do outro, como o
 * exemplo do Victor (23/11/2026; antes grade de 1 a 3 colunas, ITM-152). `items-start`: abrir os lotes
 * de um card não estica o vizinho. `relative`: a grade é a referência de posição para arrastar.
 */
const GRADE = "relative grid grid-cols-1 items-start gap-3";
/** Área de toque de 44 px de altura nos botões de ícone de 32 px, sem mudar o desenho (UI-A11Y-005); na largura, só até a metade do vão de 4 px, para não invadir o vizinho. */
const ALVO_DE_TOQUE = "after:absolute after:-inset-x-0.5 after:-inset-y-1.5 after:content-['']";
/** Área de toque de 44 px em volta do toggle (WCAG 2.5.8), sem mudar o desenho. */
const TOQUE_DO_TOGGLE = "relative before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']";

function CartaoDoSetor({
    evento,
    setor,
    ingressos,
    abertoInicial,
    alca,
    arrastavel,
    onReordenar,
    onSoltar,
    onMoverPorTeclado,
    onEditar,
    onDuplicar,
    onExcluir,
    onNovoIngresso,
    editando = false,
    edicao,
    criandoIngresso = false,
    formIngresso,
}: {
    evento: Evento;
    setor: Grupo;
    /** Sessão com muitos grupos: o grupo começa fechado e abre pela linha (ITM-144). */
    abertoInicial: boolean;
    /** Editando: os ingressos sobem e o formulário do grupo abre no lugar do grupo (ITM-132). */
    editando?: boolean;
    edicao?: ReactNode;
    /** Criando ingresso neste grupo: o card de criar vira o formulário, abaixo da grade (ITM-139). */
    criandoIngresso?: boolean;
    formIngresso?: ReactNode;
    ingressos: TipoIngresso[];
    alca?: ReactNode;
    arrastavel: boolean;
    onReordenar: (lista: TipoIngresso[]) => void;
    onSoltar: () => void;
    onMoverPorTeclado: (i: number, d: -1 | 1) => void;
    onEditar: () => void;
    onDuplicar: () => void;
    /** Excluir grupo (ITM-168): quem chama decide entre excluir, confirmar ou explicar que há vendas. */
    onExcluir: () => void;
    onNovoIngresso: () => void;
}) {
    const { vendidos, pendentes } = useContext(DadosDaLista);
    const { numero, plural } = useTextosItens();
    const reduzir = useReducedMotion();
    const transicao = useTransicao();
    const oferta = ofertaDoSetor(setor);
    // Grupo com dezenas de ingressos mostra os primeiros e "Mostrar mais" (UI-LST-001).
    const { visiveis, restantes, mostrarMais } = useMostrarMais(ingressos);
    // Fechado, o grupo mostra só o cabeçalho: os ingressos nem existem na tela (ITM-144).
    const [aberto, setAberto] = useState(abertoInicial);
    useEffect(() => {
        if (criandoIngresso) setAberto(true);
    }, [criandoIngresso]);
    const emitidos = vendidosDoSetor(setor, vendidos) - setor.ingressos.reduce((n, t) => n + pendentesDoIngresso(t, pendentes), 0);
    const idDoConteudo = `grupo-${setor.id}-ingressos`;
    // Arrastar na grade (ITM-08, ITM-152): só sem filtro e com mais de um ingresso.
    const comAlca = arrastavel && visiveis.length > 1;
    const { grade, arrastando, iniciar } = useArrastarNaGrade({
        itens: visiveis,
        id: (tp) => tp.id,
        onReordenar: (prox) => onReordenar([...prox, ...ingressos.slice(prox.length)]),
        onSoltar,
    });
    // Ingresso criado agora (ITM-139): o card novo entra no fim da grade, acima do formulário. Se a grade cresce
    // (o card abriu uma linha nova), a tela rola essa diferença, para o formulário (com o foco) ficar parado.
    // Lido no render, antes de o card novo tirar o id do conjunto.
    const temNovo = visiveis.some((tp) => ingressosNovos.has(tp.id));
    const alturaDaGrade = useRef(0);
    useLayoutEffect(() => {
        const h = grade.current?.offsetHeight ?? 0;
        if (temNovo && alturaDaGrade.current > 0 && h > alturaDaGrade.current) window.scrollBy({ top: h - alturaDaGrade.current, behavior: reduzir ? "auto" : "smooth" });
        alturaDaGrade.current = h;
    });

    return (
        // O grupo é título e grade, sem caixa em volta: o card do ingresso é o único contêiner (UI-VIS-019).
        // Agrupador (ITM-164): fundo entre o da página e o dos cards, com 8 px de respiro.
        <article aria-labelledby={`setor-${setor.id}`} className="@container flex flex-col rounded-2xl bg-(--color-bg-agrupador) p-2">
            {/* Editando: o formulário no retângulo de borda contínua, como na criação (ITM-132). */}
            <Surgir visivel={editando}>{edicao}</Surgir>
            <Surgir visivel={!editando}>
                {/* A linha do grupo abre e fecha os ingressos (ITM-144); lápis, menu e alça ficam por cima. */}
                <header
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button, a, [role=button], [role=menuitem]")) return;
                        setAberto((a) => !a);
                    }}
                    className="flex cursor-pointer items-start justify-between gap-3 p-2"
                >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                        {alca && <div className="-ml-2">{alca}</div>}
                        <div className="flex min-w-0 flex-col gap-1">
                            {/* O ícone diz como as pessoas entram no grupo (código QR ou rosto), com o nome para leitor de tela. */}
                            <div className="flex min-w-0 items-center gap-2">
                                <ChevronDown
                                    className={cx("size-5 shrink-0 text-fg-quaternary transition-transform duration-200 motion-reduce:transition-none", !aberto && "-rotate-90")}
                                    aria-hidden="true"
                                />
                                {setor.tipoAcesso === "facial" ? (
                                    <FaceId className="size-5 shrink-0 text-fg-quaternary" role="img" aria-label={T.tipoAcessoOpcoes.facial} />
                                ) : (
                                    <QrCode01 className="size-5 shrink-0 text-fg-quaternary" role="img" aria-label={T.tipoAcessoOpcoes.qr} />
                                )}
                                <h3 id={`setor-${setor.id}`} className="min-w-0 text-lg font-semibold text-primary">
                                    <button
                                        type="button"
                                        aria-expanded={aberto}
                                        aria-controls={idDoConteudo}
                                        onClick={() => setAberto((a) => !a)}
                                        className="cursor-pointer rounded-md text-left break-words outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        {setor.nome}
                                    </button>
                                </h3>
                            </div>
                            {/* Dados do grupo numa frase por item, sem símbolo separador e com um denominador só (UI-TXT-010). */}
                            <p className="flex flex-wrap gap-x-5 gap-y-1 pl-7 text-sm text-tertiary">
                                <span>{plural(T.ingressosNoGrupo, setor.ingressos.length)}</span>
                                <span>{formatar(T.capacidadeEEmitidos, { capacidade: numero(setor.capacidade ?? oferta), emitidos: numero(Math.max(0, emitidos)) })}</span>
                                {/* O tipo de entrada está no ícone ao lado do nome; aqui só o portão, quando há. */}
                                {setor.acesso && <span>{formatar(T.acessoPortao, { acesso: setor.acesso })}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <ButtonUtility icon={Edit01} color="tertiary" className={ALVO_DE_TOQUE} tooltip={formatar(T.editarSetor, { setor: setor.nome })} data-editar-grupo={setor.id} onClick={onEditar} />
                        {/* Mais ações do grupo (ITM-135). */}
                        <Dropdown.Root>
                            <ButtonUtility icon={DotsVertical} color="tertiary" className={ALVO_DE_TOQUE} tooltip={formatar(T.maisAcoesGrupo, { setor: setor.nome })} />
                            <Dropdown.Popover className="w-52" placement="bottom end">
                                <Dropdown.Menu aria-label={formatar(T.maisAcoesGrupo, { setor: setor.nome })} onAction={(k) => (k === "duplicar" ? onDuplicar() : k === "excluir" && onExcluir())}>
                                    <Dropdown.Item id="duplicar" icon={Copy01} label={T.duplicarGrupo} />
                                    <Dropdown.Item id="excluir" icon={Trash01} label={T.excluirGrupo} />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </div>
                </header>

                <Surgir visivel={aberto}>
                    {/* Ingressos dentro do agrupador, sem linha-guia nem recuo (ITM-165; antes ITM-156). */}
                    <div
                        id={idDoConteudo}
                        className="mt-1 flex flex-col gap-4 px-px pt-1"
                    >
                        {ingressos.length > 0 ? (
                            <ul ref={grade} className={GRADE}>
                                {visiveis.map((tp, i) => (
                                    <CartaoDoIngresso
                                        key={tp.id}
                                        evento={evento}
                                        tipo={tp}
                                        arrastavel={comAlca}
                                        arrastando={arrastando === tp.id}
                                        alca={
                                            comAlca ? <Alca grupo="linha" nome={tp.nome} onPointerDown={iniciar(tp.id)} onMover={(d) => onMoverPorTeclado(i, d)} /> : undefined
                                        }
                                    />
                                ))}
                                {/* Criar ingresso (ITM-134, ITM-139, ITM-152): o card em formato de ingresso no fim da grade, com a altura
                                    da linha em que cai. Clicar abre a criação rápida abaixo da grade, onde o ingresso novo entra. */}
                                <AnimatePresence initial={false}>
                                    {!criandoIngresso && (
                                        <motion.li key="criar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transicao} className="self-stretch">
                                            <CampoDeIngresso icone={Plus} altura="preencher" data-criar-ingresso={setor.id} onPress={onNovoIngresso}>
                                                {T.criarIngressoNoGrupo}
                                            </CampoDeIngresso>
                                        </motion.li>
                                    )}
                                </AnimatePresence>
                            </ul>
                        ) : (
                            // Grupo sem ingresso: o campo na largura toda, com a dica.
                            <Surgir visivel={!criandoIngresso}>
                                <CampoDeIngresso icone={Plus} altura={76} dica={T.setorVazioDica} data-criar-ingresso={setor.id} onPress={onNovoIngresso}>
                                    {T.criarIngressoNoGrupo}
                                </CampoDeIngresso>
                            </Surgir>
                        )}
                        {restantes > 0 && <BotaoMostrarMais restantes={restantes} onClick={mostrarMais} />}
                        <Surgir visivel={criandoIngresso} gap={ingressos.length > 0 ? 16 : 0}>
                            {formIngresso}
                        </Surgir>
                    </div>
                </Surgir>
            </Surgir>
        </article>
    );
}

/**
 * Card do ingresso (ITM-152), estrutura no lugar das colunas: no alto, o nome (link, até duas linhas), o motivo
 * quando ligado e sem vender e os selos; à direita, o "À venda", o lápis e o menu. No corpo, preço e emissões
 * com a barra. Embaixo, os lotes, que abrem e fecham dentro do card.
 */
function CartaoDoIngresso({ evento, tipo, alca, arrastavel, arrastando }: { evento: Evento; tipo: TipoIngresso; alca?: ReactNode; arrastavel: boolean; arrastando: boolean }) {
    const navigate = useNavigate();
    const { vendidos, pendentes, aberturasDe, totalDeGrupos, comVirada } = useContext(DadosDaLista);
    const { t, preco, numero, quando, plural } = useTextosItens();
    const resumoVendas = useResumoDasVendas();
    const estado = estadoComAberturasDele(tipo, vendidos, aberturasDe(tipo.id));
    const janela = estado === "agendado" ? janelaDasAberturas(aberturasDe(tipo.id)) : null;
    const faixa = faixaDePreco(tipo);
    const endereco = `/backstage/catalogo/ingressos/${tipo.id}`;
    const abrir = () => navigate(endereco);
    // Lotes abertos dentro do card, sem entrar no ingresso (ITM-93, ITM-152).
    const [lotesAbertos, setLotesAbertos] = useState(false);
    const idDosLotes = `lotes-${tipo.id}`;
    // Seletor de Passkeys do ingresso inteiro, aberto pelo "Vincular Passkey" do menu.
    const [seletorDePasskey, setSeletorDePasskey] = useState(false);
    const vincularNoIngresso = async (ids: string[]) => {
        const antes = evento.sessoes;
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, chaves: ids.length ? ids : undefined }));
            toast.success(formatar(T.passkeysDoIngressoSalvas, { ingresso: tipo.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    // Passkeys editadas na consulta (ITM-33): todo o ingresso ou um lote, com "Desfazer".
    const salvarChaves = async (lugar: string, ids: string[]) => {
        if (lugar === "ingresso") return vincularNoIngresso(ids);
        const antes = evento.sessoes;
        const lote = tipo.lotes.find((l) => l.id === lugar);
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes: tipo.lotes.map((l) => (l.id === lugar ? { ...l, chaves: ids.length ? ids : undefined } : l)) }));
            toast.success(formatar(T.passkeysSalvas, { lote: lote?.nome ?? "" }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    // Sem abertura ou com a venda encerrada, o toggle mostra o status real: desligado, desativado e com o motivo
    // embaixo (ITM-157, ITM-159).
    const motivoDoToggle = estado === "sem-abertura" ? T.semAbertura : estado === "encerrado" ? T.encerradas : null;
    // Ligado e sem vender: o card diz o motivo, como o detalhe (UI-VIS-015, ITM-143, ITM-150).
    const apoio = [
        // "Sem abertura de vendas" e "Venda encerrada" ficam no canhoto, embaixo do "À venda" (ITM-157, ITM-159).
        janela?.janela === "agendado" ? formatar(T.abreEm, { quando: quando(janela.inicio) }) : null,
        resumoVendas(tipo.vendas) || null,
    ].filter(Boolean) as string[];
    // Selos só quando existem: estado fora do normal (Esgotado, Sem estoque), Passkey e lotes sincronizados (ITM-145).
    const comSeloDeEstado = estado === "esgotado" || estado === "sem-estoque";
    const comPasskeyNoIngresso = totalDeChaves(tipo) > 0;
    const sincronizado = comVirada && !!evento.conjuntosSincronizados?.some((c) => c.itens.some((i) => i.ingressoId === tipo.id));
    const emitidos = Math.max(0, vendidosDoIngresso(tipo, vendidos) - pendentesDoIngresso(tipo, pendentes));
    const total = quantidadeDoIngresso(tipo);

    // Duplicar o ingresso nos grupos escolhidos (padrão: o dele), fora da venda, e rolar até a cópia do
    // grupo de origem (ou a primeira) (ITM-136).
    // O grupo do ingresso só é procurado quando se duplica: com 300 mil ingressos, procurar em cada card pesa.
    const acharGrupoDeOrigem = () => evento.sessoes.flatMap((s) => s.grupos).find((g) => g.ingressos.some((x) => x.id === tipo.id));
    const [escolhendoDestino, setEscolhendoDestino] = useState(false);
    const reduzir = useReducedMotion();
    const duplicar = async (destinos?: string[]) => {
        const antes = evento.sessoes;
        const grupoDeOrigem = acharGrupoDeOrigem();
        const { sessoes: prox, copias } = comIngressoDuplicado(evento, tipo.id, destinos);
        if (!copias.length) return;
        const alvo = copias.find((c) => c.grupoId === grupoDeOrigem?.id) ?? copias[0];
        try {
            await salvarSessoes(evento, prox);
            const msg = copias.length === 1 ? formatar(T.ingressoDuplicado, { ingresso: copias[0].copia.nome }) : formatar(T.ingressoDuplicadoEmVarios, { ingresso: tipo.nome, n: copias.length });
            toast.success(msg, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
            requestAnimationFrame(() =>
                requestAnimationFrame(() => document.querySelector(`[data-ingresso="${alvo.copia.id}"]`)?.scrollIntoView({ block: "nearest", behavior: reduzir ? "auto" : "smooth" })),
            );
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    const pedirDuplicar = () => (totalDeGrupos > 1 ? setEscolhendoDestino(true) : void duplicar());

    const alternar = async (ativo: boolean) => {
        const antes = evento.sessoes;
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, ativo }));
            // Mesmo comportamento do toggle do detalhe: grava na hora e dá para desfazer (ITM-03, ITM-32).
            toast.success(formatar(ativo ? T.voltou : T.pausado, { ingresso: tipo.nome }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    // Criado agora pela criação rápida: entra com um fade, uma vez só (ITM-139, UI-VIS-008). A grade cuida da rolagem.
    const [entrando] = useState(() => ingressosNovos.delete(tipo.id) && !reduzir);

    return (
        <motion.li
            data-ingresso={tipo.id}
            data-item-da-grade={tipo.id}
            // Arrastando, os outros cards deslizam para o lugar novo; só a posição anima (abrir os lotes não distorce o card).
            layout={arrastavel && !reduzir ? "position" : false}
            initial={entrando ? { opacity: 0, scale: 0.96 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURACAO_TRANSICAO, ease: [0.16, 1, 0.3, 1] }}
            className={cx(
                "group/linha relative flex min-w-0 flex-col rounded-2xl bg-primary ring-1 ring-secondary transition-shadow duration-100 ease-linear",
                arrastando && "z-20 shadow-lg ring-2 ring-brand",
            )}
        >
            {/* Formato de ingresso (ITM-154): as informações à esquerda e o canhoto à direita (preço, "À venda" e ações),
                separados por um picote com os recortes nas bordas; no card estreito, o canhoto desce e o picote fica na
                horizontal. Os lotes abrem embaixo, na largura toda. */}
            <div className="@container">
                {/* O hover pinta as duas partes juntas, informações e canhoto (ITM-154). */}
                <div
                    className={cx(
                        "flex flex-col transition duration-100 ease-linear hover:bg-(--color-bg-cartao_hover) @min-[40rem]:flex-row",
                        tipo.lotes.length > 0 && lotesAbertos ? "rounded-t-2xl" : "rounded-2xl",
                    )}
                >
                    {/* O link do nome cobre esta parte (after:inset-0); alça, Passkey e o botão dos lotes ficam por cima (z-10). */}
                    <div
                        className={cx(
                            "relative flex min-w-0 flex-1 flex-col gap-4 p-4 outline-focus-ring has-[[data-linha]:focus-visible]:outline-2 has-[[data-linha]:focus-visible]:-outline-offset-2 md:p-5",
                            "rounded-t-2xl @min-[40rem]:rounded-tr-none",
                            !(tipo.lotes.length > 0 && lotesAbertos) && "@min-[40rem]:rounded-bl-2xl",
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {/* Alça (ITM-08, ITM-166): no toque, sempre visível, antes do nome. Com mouse (md+), entra antes do nome no hover
                                ou no foco e empurra o nome para a direita; fora dele, não ocupa espaço. */}
                            {alca && (
                                <div className="-my-1 -ml-2 shrink-0 md:-mr-3 md:ml-0 md:w-0 md:transition-[width,margin] md:duration-150 md:ease-out md:group-hover/linha:mr-0 md:group-hover/linha:-ml-2 md:group-hover/linha:w-8 md:has-focus-visible:mr-0 md:has-focus-visible:-ml-2 md:has-focus-visible:w-8 motion-reduce:transition-none">
                                    {alca}
                                </div>
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                {/* Nome em até duas linhas, com reticências; o nome inteiro fica no title. É link: abre em nova aba e copia o endereço (UI-NAV-003). */}
                                <Link to={endereco} data-linha title={tipo.nome} className="min-w-0 text-left outline-hidden after:absolute after:inset-0">
                                    <span className="line-clamp-2 text-md font-semibold break-words text-primary">{tipo.nome}</span>
                                </Link>
                                {apoio.map((linha) => (
                                    <span key={linha} className="text-sm text-tertiary">
                                        {linha}
                                    </span>
                                ))}
                                {(comSeloDeEstado || sincronizado) && (
                                    <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
                                        {comSeloDeEstado && <EstadoBadge estado={estado} />}
                                        {/* Virada de lote só com lotes sincronizados no evento (ITM-92, LSI-30). */}
                                        {sincronizado && (
                                            <Badge type="modern" color="gray" size="sm">
                                                {T.sincronizado}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Vendas (ITM-155): a peça da "Capacidade por grupo" da Visão geral. Em cima, a ocupação e os disponíveis;
                            a barra dividida em emitidos e reservados (os que estão sendo comprados agora); a legenda embaixo. */}
                        {(() => {
                            const reservados = pendentesDoIngresso(tipo, pendentes);
                            const disponiveis = Math.max(0, total - emitidos - reservados);
                            const ocupacao = total ? (emitidos + reservados) / total : 0;
                            return (
                                <div className="flex w-full min-w-0 flex-col gap-2 text-sm">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
                                        <span className="font-semibold text-primary">
                                            {formatar(T.ocupacaoDe, { pct: new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(ocupacao), total: numero(total) })}
                                        </span>
                                        <span className="text-tertiary">{plural(T.disponiveisN, disponiveis, { n: numero(disponiveis) })}</span>
                                    </div>
                                    <BarraDeOcupacao
                                        capacidade={total}
                                        comLegenda
                                        legendaComZerados
                                        segmentos={[
                                            { id: "emitidos", rotulo: T.emitidosLegenda, valor: emitidos, cor: "var(--color-utility-blue-500)" },
                                            { id: "reservados", rotulo: T.reservadosLegenda, valor: reservados, cor: "var(--color-utility-orange-500)" },
                                        ]}
                                    />
                                </div>
                            );
                        })()}
                        {/* Pé das informações: os lotes (ITM-93), que abrem embaixo do card, e "Vincular Passkey" quando o ingresso
                            ainda não tem Passkey, ou a contagem "N Passkeys" quando tem (ITM-158, ITM-160). */}
                        <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {tipo.lotes.length > 0 && (
                                <button
                                    type="button"
                                    aria-expanded={lotesAbertos}
                                    aria-controls={idDosLotes}
                                    onClick={() => setLotesAbertos((v) => !v)}
                                    className="relative z-10 -mx-1 flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-semibold text-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_hover focus-visible:outline-2"
                                >
                                    {plural(T.lotesNoIngresso, tipo.lotes.length)}
                                    <span className="sr-only">{formatar(T.deIngresso, { ingresso: tipo.nome })}</span>
                                    <ChevronDown className={cx("size-4 shrink-0 text-fg-quaternary transition-transform duration-200 motion-reduce:transition-none", lotesAbertos && "rotate-180")} aria-hidden="true" />
                                </button>
                            )}
                            {/* Passkey no mesmo lugar (ITM-160): com Passkey, a contagem abre a consulta, que também edita (ITM-33);
                                sem, "Vincular Passkey". Na extrema direita das informações, junto do picote. */}
                            <div className="ml-auto">
                            {comPasskeyNoIngresso ? (
                                <BotaoChaves noPe tipo={tipo} opcoes={codigosDoEvento(evento)} onSalvar={salvarChaves} />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSeletorDePasskey(true)}
                                    className="-mx-1 flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-semibold text-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_hover focus-visible:outline-2"
                                >
                                    <Key01 className="size-4 shrink-0 text-utility-blue-600" aria-hidden="true" />
                                    {T.vincularPasskey}
                                    <span className="sr-only">{formatar(T.deIngresso, { ingresso: tipo.nome })}</span>
                                </button>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Picote com os recortes (círculos da cor do agrupador nas bordas, ITM-164). Decorativo. */}
                    <div aria-hidden="true" className="relative mx-4 border-t border-dashed border-secondary @min-[40rem]:hidden md:mx-5">
                        <span className="absolute -top-2.5 -left-[1.625rem] size-5 rounded-full bg-(--color-bg-agrupador) md:-left-[1.875rem]" />
                        <span className="absolute -top-2.5 -right-[1.625rem] size-5 rounded-full bg-(--color-bg-agrupador) md:-right-[1.875rem]" />
                    </div>
                    <div aria-hidden="true" className="relative my-4 hidden border-l border-dashed border-secondary @min-[40rem]:block md:my-5">
                        <span className="absolute -top-[1.625rem] -left-2.5 size-5 rounded-full bg-(--color-bg-agrupador) md:-top-[1.875rem]" />
                        <span className="absolute -bottom-[1.625rem] -left-2.5 size-5 rounded-full bg-(--color-bg-agrupador) md:-bottom-[1.875rem]" />
                    </div>

                    {/* Canhoto: preço em destaque, "À venda" e as ações. */}
                    <div className="relative z-10 flex shrink-0 flex-col gap-3 p-4 md:p-5 @min-[40rem]:w-60 @min-[40rem]:justify-between">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-sm text-tertiary">{T.preco}</span>
                                <span className="text-xl font-semibold text-primary tabular-nums">{preco(faixa.min)}</span>
                                {faixa.min !== faixa.max && <span className="text-sm text-tertiary tabular-nums">{formatar(T.ateMax, { max: preco(faixa.max) })}</span>}
                            </div>
                            <div className="-mt-1 -mr-1 flex gap-1">
                                {/* Editar explícito: o nome também abre, mas o lápis diz que é para editar. */}
                                <ButtonUtility icon={Edit01} color="tertiary" size="sm" className={ALVO_DE_TOQUE} tooltip={formatar(T.editarIngresso, { ingresso: tipo.nome })} onClick={abrir} />
                                <Dropdown.Root>
                                    <ButtonUtility icon={DotsVertical} color="tertiary" size="sm" className={ALVO_DE_TOQUE} tooltip={formatar(T.maisAcoesIngresso, { ingresso: tipo.nome })} />
                                    <Dropdown.Popover className="w-52" placement="bottom end">
                                        <Dropdown.Menu
                                            aria-label={formatar(T.maisAcoesIngresso, { ingresso: tipo.nome })}
                                            onAction={(k) => (k === "duplicar" ? pedirDuplicar() : undefined)}
                                        >
                                            <Dropdown.Item id="duplicar" icon={Copy01} label={T.duplicarIngresso} />
                                        </Dropdown.Menu>
                                    </Dropdown.Popover>
                                </Dropdown.Root>
                            </div>
                        </div>
                        {/* "À venda" com o rótulo visível (ITM-09), numa linha própria do canhoto. Sem abertura de vendas, o toggle
                            mostra o status real: desligado e desativado, com o motivo embaixo (ITM-157). */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2">
                                <span className="text-sm font-medium text-secondary" aria-hidden="true">
                                    {T.aVenda}
                                </span>
                                <Toggle
                                    aria-label={formatar(T.aVendaDe, { item: tipo.nome })}
                                    aria-describedby={motivoDoToggle ? `motivo-${tipo.id}` : undefined}
                                    isSelected={motivoDoToggle ? false : tipo.ativo}
                                    isDisabled={!!motivoDoToggle}
                                    onChange={alternar}
                                    className={TOQUE_DO_TOGGLE}
                                />
                            </div>
                            {motivoDoToggle && (
                                <span id={`motivo-${tipo.id}`} className="px-1 text-sm text-tertiary">
                                    {motivoDoToggle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* Lotes: abrem embaixo do card, na largura toda (ITM-93, ITM-154), com a altura animada (Surgir respeita reduzir movimento). */}
                {tipo.lotes.length > 0 && (
                    <Surgir visivel={lotesAbertos}>
                        <div id={idDosLotes} className="border-t border-secondary">
                            <LotesDoIngresso evento={evento} tipo={tipo} />
                        </div>
                    </Surgir>
                )}
            </div>
            {/* Duplicar ingresso em outros grupos (ITM-136): escolher onde, já com o grupo dele marcado. */}
            {escolhendoDestino && (
                <SeletorDeDestino
                    titulo={formatar(T.duplicarEm, { item: tipo.nome })}
                    descricao={T.duplicarIngressoDica}
                    escolher="grupos"
                    sessoes={evento.sessoes.map((s) => ({
                        id: s.id,
                        rotulo: quando(s.inicio),
                        grupos: s.grupos.map((g) => ({ id: g.id, nome: g.nome, apoio: plural(T.ingressosNoGrupo, g.ingressos.length) })),
                    }))}
                    selecionados={[acharGrupoDeOrigem()?.id ?? ""].filter(Boolean)}
                    rotuloConfirmar={T.duplicar}
                    onFechar={() => setEscolhendoDestino(false)}
                    onConfirmar={(ids) => {
                        setEscolhendoDestino(false);
                        void duplicar(ids);
                    }}
                />
            )}
            {seletorDePasskey && (
                <SeletorDeLista
                    titulo={formatar(T.passkeysDoIngresso, { ingresso: tipo.nome })}
                    descricao={T.passkeysDoIngressoDica}
                    vazio={T.passkeysVazio}
                    opcoes={codigosDoEvento(evento).map((c) => ({ id: c, rotulo: c }))}
                    selecionados={tipo.chaves ?? []}
                    onFechar={() => setSeletorDePasskey(false)}
                    onConfirmar={(ids) => {
                        void vincularNoIngresso(ids);
                        setSeletorDePasskey(false);
                    }}
                />
            )}
        </motion.li>
    );
}

/**
 * Lotes de um ingresso, dentro do card (ITM-93, ITM-152): uma linha por lote com o nome, Esgotado quando for o
 * caso e o "À venda"; embaixo, preço, emissões e a Passkey do lote. Só um lote vende por vez (ITM-11): ligar um
 * desliga os outros. Grava na hora, com "Desfazer". Lote esgotado não liga.
 */
function LotesDoIngresso({ evento, tipo }: { evento: Evento; tipo: TipoIngresso }) {
    const { vendidos, pendentes, comPasskey } = useContext(DadosDaLista);
    const formularios = useContext(FormulariosDaLista);
    const criando = formularios?.criandoLote === tipo.id;
    const { t, preco, numero, plural } = useTextosItens();
    // Lote com o seletor de Passkeys aberto.
    const [seletorDoLote, setSeletorDoLote] = useState<string | null>(null);
    const loteDoSeletor = tipo.lotes.find((l) => l.id === seletorDoLote);

    const vincular = async (loteId: string, ids: string[]) => {
        const antes = evento.sessoes;
        const lote = tipo.lotes.find((l) => l.id === loteId);
        const lotes = tipo.lotes.map((l) => (l.id === loteId ? { ...l, chaves: ids.length ? ids : undefined } : l));
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes }));
            toast.success(formatar(T.passkeysSalvas, { lote: lote?.nome ?? "" }), { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };
    // O lote ligado é o que vende agora: o primeiro sem pausa e com saldo, como no detalhe do ingresso (ITM-22).
    const ligado = tipo.lotes.find((l) => !l.pausado && !(l.quantidade > 0 && vendidosDoLote(l, vendidos) >= l.quantidade));

    const vender = async (loteId: string, ligar: boolean) => {
        const antes = evento.sessoes;
        const lote = tipo.lotes.find((l) => l.id === loteId);
        if (!lote) return;
        const anterior = ligar && ligado && ligado.id !== loteId ? ligado : undefined;
        // Igual ao detalhe: ligar deixa só este lote sem pausa; desligar deixa nenhum vendendo.
        const lotes = tipo.lotes.map((l) => ({ ...l, pausado: ligar && l.id === loteId ? undefined : true }));
        try {
            await salvarSessoes(evento, comIngresso(evento, { ...tipo, lotes }));
            const msg = !ligar ? formatar(T.lotePausado, { lote: lote.nome }) : anterior ? formatar(T.loteTrocado, { lote: lote.nome, anterior: anterior.nome }) : formatar(T.loteLigado, { lote: lote.nome });
            toast.success(msg, { action: { label: T.desfazer, onClick: () => salvarSessoes(evento, antes) } });
        } catch {
            toast.error(t.erroAoSalvar);
        }
    };

    return (
        <>
            {/* Uma linha separa os lotes entre si (lista, sem caixa: o card já é o contêiner, UI-VIS-019). */}
            <ul className="flex flex-col">
                {tipo.lotes.map((l) => {
                    const vendidosLote = vendidosDoLote(l, vendidos);
                    const esgotado = l.quantidade > 0 && vendidosLote >= l.quantidade;
                    return (
                        <LinhaDoLote key={l.id} id={l.id} className="group/lote flex flex-col border-t border-secondary @min-[40rem]:flex-row">
                            {/* Lote na mesma grade do card (ITM-163): à esquerda, o lote e a Passkey (alinhada com a do ingresso); uma linha
                                vertical na altura do picote; à direita, na largura do canhoto, o "À venda" (alinhado com o do ingresso). */}
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 pt-3 pb-1 md:px-5 @min-[40rem]:pb-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium break-words text-primary">{l.nome}</span>
                                    {esgotado && <EstadoBadge lote estado="esgotado" />}
                                </div>
                                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    <div className="flex gap-1">
                                        <dt className="text-tertiary">{T.preco}</dt>
                                        <dd className="font-medium text-primary tabular-nums">{preco(l.preco)}</dd>
                                    </div>
                                    <div className="flex gap-1">
                                        <dt className="text-tertiary">{T.emissoes}</dt>
                                        <dd className="font-medium text-primary tabular-nums">
                                            {formatar(T.vendidosCurto, { vendidos: numero(Math.max(0, vendidosLote - pendentesDoLote(l, pendentes))), total: numero(l.quantidade) })}
                                        </dd>
                                    </div>
                                    {/* Passkey do lote (ITM-161): sempre visível, na extrema direita das informações, alinhada com a do
                                        ingresso (ITM-160, ITM-163): "Vincular Passkey" sem Passkey, a contagem com Passkey. */}
                                    <div className="ml-auto flex">
                                        <dt className="sr-only">{T.passkey}</dt>
                                        <dd>
                                            <button
                                                type="button"
                                                onClick={() => setSeletorDoLote(l.id)}
                                                aria-label={l.chaves?.length ? `${plural(T.contagemPasskeys, l.chaves.length)}, ${l.nome}` : formatar(T.vincularNoLote, { lote: l.nome })}
                                                className="-mx-1 flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-semibold whitespace-nowrap text-tertiary outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_hover focus-visible:outline-2"
                                            >
                                                <Key01 className="size-4 shrink-0 text-utility-blue-600" aria-hidden="true" />
                                                {l.chaves?.length ? plural(T.contagemPasskeys, l.chaves.length) : T.vincularPasskey}
                                            </button>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            {/* Linha vertical na mesma posição do picote do card (só quando o canhoto fica ao lado). */}
                            <div aria-hidden="true" className="hidden border-l border-dashed border-secondary @min-[40rem]:block" />
                            {/* "À venda" do lote, na largura do canhoto e com o mesmo recuo da faixa do ingresso. */}
                            <div className="flex items-center px-4 pt-1 pb-3 md:px-5 @min-[40rem]:w-60 @min-[40rem]:shrink-0 @min-[40rem]:py-3">
                                <div className="flex w-full items-center justify-between gap-3 @min-[40rem]:px-3">
                                    <span className="text-sm text-tertiary" aria-hidden="true">
                                        {T.aVenda}
                                    </span>
                                    <Toggle
                                        size="sm"
                                        aria-label={formatar(T.loteVender, { lote: l.nome })}
                                        isSelected={ligado?.id === l.id}
                                        isDisabled={esgotado}
                                        onChange={(on) => void vender(l.id, on)}
                                        className={TOQUE_DO_TOGGLE}
                                    />
                                </div>
                            </div>
                        </LinhaDoLote>
                    );
                })}
            </ul>
            {/* Criar lote (ITM-140): terciário no fim dos lotes, alinhado ao nome deles; abre o formulário no lugar dele. */}
            <div className="border-t border-secondary px-4 py-2 md:px-5">
                <Surgir visivel={!criando}>
                    <Button
                        color="tertiary"
                        size="sm"
                        iconLeading={Plus}
                        className="-ml-3 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
                        data-criar-lote={tipo.id}
                        onClick={formularios?.protegido(() => formularios.abrirCriacaoDeLote(tipo.id))}
                    >
                        {T.criarLote}
                    </Button>
                </Surgir>
                <Surgir visivel={criando}>
                    {criando && formularios && (
                        <div className="py-2">
                            <FormularioDoLote
                                evento={evento}
                                tipo={tipo}
                                onAlterado={formularios.marcarAlterado}
                                onAntesDeCriar={(id) => lotesNovos.add(id)}
                                onPedirFechar={formularios.protegido(() => formularios.fecharCriacaoDeLote(tipo.id))}
                            />
                        </div>
                    )}
                </Surgir>
            </div>
            {loteDoSeletor && (
                <SeletorDeLista
                    titulo={formatar(T.passkeysDoLote, { lote: loteDoSeletor.nome })}
                    descricao={T.passkeysDica}
                    vazio={T.passkeysVazio}
                    opcoes={codigosDoEvento(evento).map((c) => ({ id: c, rotulo: c }))}
                    selecionados={loteDoSeletor.chaves ?? []}
                    onFechar={() => setSeletorDoLote(null)}
                    onConfirmar={(ids) => {
                        void vincular(loteDoSeletor.id, ids);
                        setSeletorDoLote(null);
                    }}
                />
            )}
        </>
    );
}

/**
 * Linha de um lote. Criado agora na lista, entra abrindo a altura, uma vez só, e a tela rola a altura dele
 * junto, para o formulário de lote (com o foco) ficar parado onde estava (ITM-140, UI-VIS-008).
 */
function LinhaDoLote({ id, className, children }: { id: string; className: string; children: ReactNode }) {
    const reduzir = useReducedMotion();
    const [entrando, setEntrando] = useState(() => lotesNovos.delete(id) && !reduzir);
    const ref = useRef<HTMLLIElement>(null);
    useLayoutEffect(() => {
        if (!entrando) return;
        const altura = (ref.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
        if (altura > 0) window.scrollBy({ top: altura, behavior: "smooth" });
    }, []);
    useEffect(() => {
        if (!entrando) return;
        const t = window.setTimeout(() => setEntrando(false), DURACAO_TRANSICAO * 1000 + 30);
        return () => window.clearTimeout(t);
    }, []);
    return (
        <motion.li
            ref={ref}
            initial={entrando ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: DURACAO_TRANSICAO, ease: [0.16, 1, 0.3, 1] }}
            className={cx(entrando && "overflow-hidden")}
        >
            <div className={className}>{children}</div>
        </motion.li>
    );
}

function Esqueleto() {
    return (
        <div role="status" aria-label="Carregando ingressos" className="flex flex-col gap-4">
            <span aria-hidden="true" className="h-6 w-40 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
            <div aria-hidden="true" className="@container">
                <div className={GRADE}>
                    {[0, 1].map((i) => (
                        <div key={i} className="flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary">
                            <span className="h-5 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                            <span className="h-4 w-48 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
                            <span className="h-12 w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
