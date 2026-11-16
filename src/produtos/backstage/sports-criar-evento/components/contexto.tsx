import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { irParaCampo } from "../data/campos";
import { atualizarRascunho, useRascunho } from "../data/rascunho";
import type { Pendencia, Rascunho, SecaoId } from "../data/tipos";
import { avisos, errosPorCampo, validar } from "../data/validacao";
import { useVocabulario } from "../data/vocabulario";

/* ------------------------------------------------------------------ */
/*  Estado da tela compartilhado pelas seções                          */
/*  Erro aparece ao sair do campo (blur) ou ao tentar avançar ou       */
/*  publicar a seção (SCE-20). Até lá, o campo fica limpo.             */
/* ------------------------------------------------------------------ */

interface CategoriaAberta {
    modalidadeId: string;
    categoriaId: string;
}

interface Contexto {
    rascunho: Rascunho;
    salvando: boolean;
    atualizar: (fn: (r: Rascunho) => Rascunho) => void;
    pendencias: Pendencia[];
    /** Avisos que não impedem publicar (SCE-112, RN-12). */
    avisos: Pendencia[];
    /** Erro do campo, se já deve aparecer (tocado ou seção tentada). */
    erro: (campo: string, secao: SecaoId) => string | undefined;
    tocar: (campo: string) => void;
    /** Marca as seções como tentadas: todos os erros delas aparecem. */
    tentar: (secoes: SecaoId[]) => void;
    secoesTentadas: Set<SecaoId>;
    /** Data copiada que ainda pede revisão (RN-07). */
    revisar: (campo: string) => boolean;
    /** Tira o aviso "Revise esta data" (a pessoa editou o campo). */
    revisado: (campo: string) => void;
    categoriaAberta: CategoriaAberta | null;
    abrirCategoria: (c: CategoriaAberta | null) => void;
    /** v0.5: modalidade em edição no próprio cartão (id), ou null. */
    editandoNivel1: string | null;
    setEditandoNivel1: (id: string | null) => void;
    /** v0.5: perguntas abertas (linhas expandidas) no formulário. */
    perguntasAbertas: Set<string>;
    /** Abre a linha da pergunta (sem fechar as outras). */
    abrirPergunta: (id: string) => void;
    alternarPergunta: (id: string) => void;
    /** Leva até a pendência: troca de passo (assistente), abre o painel da categoria e rola até o campo. */
    irParaPendencia: (p: Pendencia) => void;
}

const Ctx = createContext<Contexto | null>(null);

export function useFormulario() {
    const c = useContext(Ctx);
    if (!c) throw new Error("useFormulario fora do ProvedorDoFormulario");
    return c;
}

export function ProvedorDoFormulario({
    children,
    /** Antes de rolar: no assistente, abre o passo da seção. Devolve true se a tela mudou (espera renderizar). */
    antesDeIr,
    inicial,
}: {
    /** Estado inicial da tela (ex.: abrir direto numa categoria). */
    inicial?: { categoria?: CategoriaAberta; editandoNivel1?: string };
    children: ReactNode;
    antesDeIr?: (secao: SecaoId) => boolean;
}) {
    const { rascunho, salvando } = useRascunho();
    const [tocados, setTocados] = useState<Set<string>>(new Set());
    const [secoesTentadas, setSecoesTentadas] = useState<Set<SecaoId>>(new Set());
    const [categoriaAberta, setCategoriaAberta] = useState<CategoriaAberta | null>(inicial?.categoria ?? null);

    const { t } = useVocabulario();
    const pendencias = useMemo(() => validar(rascunho, t), [rascunho, t]);
    const listaDeAvisos = useMemo(() => avisos(rascunho, t), [rascunho, t]);
    const [perguntasAbertas, setPerguntasAbertas] = useState<Set<string>>(new Set());
    const [editandoNivel1, setEditandoNivel1] = useState<string | null>(inicial?.editandoNivel1 ?? null);
    const abrirPergunta = useCallback((id: string) => setPerguntasAbertas((s) => (s.has(id) ? s : new Set(s).add(id))), []);
    const erros = useMemo(() => errosPorCampo(pendencias), [pendencias]);

    const erro = useCallback(
        (campo: string, secao: SecaoId) => (tocados.has(campo) || secoesTentadas.has(secao) ? erros[campo] : undefined),
        [erros, tocados, secoesTentadas],
    );
    const tocar = useCallback((campo: string) => setTocados((t) => (t.has(campo) ? t : new Set(t).add(campo))), []);
    const tentar = useCallback((secoes: SecaoId[]) => setSecoesTentadas((s) => new Set([...s, ...secoes])), []);
    const revisar = useCallback((campo: string) => rascunho.datasARevisar.includes(campo), [rascunho.datasARevisar]);
    const revisado = useCallback(
        (campo: string) => atualizarRascunho((r) => (r.datasARevisar.includes(campo) ? { ...r, datasARevisar: r.datasARevisar.filter((c) => c !== campo) } : r)),
        [],
    );

    const irParaPendencia = useCallback(
        (p: Pendencia) => {
            setSecoesTentadas((s) => new Set(s).add(p.secao));
            const mudouDeTela = antesDeIr?.(p.secao) ?? false;
            // v0.7/v0.8 (SCE-183): durante o fluxo de cópia, os campos de modalidade, categoria e lote estão na
            // revisão: só rola até o campo (ou até a seção), sem abrir a categoria nem a edição.
            if (rascunho.fluxoDeCopia && p.secao === "modalidades") {
                setCategoriaAberta(null);
                setTimeout(() => irParaCampo(p.campo) || irParaCampo("secao-modalidades"), mudouDeTela ? 140 : 16);
                return;
            }
            // Categoria abre em tela cheia; a pergunta abre a linha dela no formulário.
            const abrePainel =
                (!!p.categoria && categoriaAberta?.categoriaId !== p.categoria.categoriaId) || (!!p.pergunta && !perguntasAbertas.has(p.pergunta));
            setCategoriaAberta(p.categoria ?? null);
            if (p.pergunta) abrirPergunta(p.pergunta);
            // Nome, tipo e vagas da modalidade se editam no cabeçalho do cartão dela (v0.5).
            const daModalidade = /^campo-mod-(.+)-(nome|tipo|vagas)$/.exec(p.campo);
            const campoDeModalidade = !!daModalidade;
            if (daModalidade) setEditandoNivel1(daModalidade[1]);
            // Espera o passo renderizar e o painel deslizar antes de rolar até o campo.
            const espera = (mudouDeTela ? 120 : 0) + (abrePainel ? 380 : 0) + (campoDeModalidade || p.categoria ? 160 : 0);
            setTimeout(() => irParaCampo(p.campo), espera || 16);
        },
        [antesDeIr, categoriaAberta, perguntasAbertas, abrirPergunta, rascunho.fluxoDeCopia],
    );

    const valor: Contexto = {
        rascunho,
        salvando,
        atualizar: atualizarRascunho,
        pendencias,
        avisos: listaDeAvisos,
        erro,
        tocar,
        tentar,
        secoesTentadas,
        revisar,
        revisado,
        categoriaAberta,
        abrirCategoria: (c) => setCategoriaAberta(c),
        editandoNivel1,
        setEditandoNivel1,
        perguntasAbertas,
        abrirPergunta,
        alternarPergunta: (id) => setPerguntasAbertas((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id))),
        irParaPendencia,
    };
    return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
