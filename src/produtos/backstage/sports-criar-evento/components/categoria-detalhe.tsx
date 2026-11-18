import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, ArrowLeft, Check, CheckCircle, ClipboardCheck, Lightbulb02, Plus, Trash01, Users01 } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { AccordionComponent as Accordion } from "@/components/application/accordion/accordion";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Toggle } from "@/components/base/toggle/toggle";
import { DURACAO_TRANSICAO, Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { CAMPO, FORMATO_REAIS, irParaCampo } from "../data/campos";
import { novoLote, regrasDe, vagasDaCategoria } from "../data/modelos";
import { AJUDA, IDADE_CALCULADA_EM, LIMITE_NOME, SEXOS } from "../data/opcoes";
import type { Categoria, Modalidade, Pendencia } from "../data/tipos";
import { pendenciasDaCategoria, regraSugerida, textoDaRegraSugerida } from "../data/validacao";
import { useVocabulario } from "../data/vocabulario";
import { CampoDataHora, CampoNumero, CampoSelect, CampoTexto, CampoTextoLongo, ErroDaLista, Escolha } from "./campos";
import { useFormulario } from "./contexto";
import { comCategoria, comLote } from "./operacoes";

/* ------------------------------------------------------------------ */
/*  Categoria em tela cheia (v0.3, SCE-150)                            */
/*  Mesmo padrão do detalhe de ingresso do AWA                         */
/*  (backstage/itens/pages/IngressoDetalhe.tsx): voltar, título e      */
/*  resumo no topo; cartões de seção na largura toda (v0.4, SCE-158)  */
/*  (v0.18: Informações, Quem pode se inscrever, Para quem é a         */
/*  inscrição e Vagas, preço e lotes; sem Avançado); cada lote é um     */
/*  cartão com nome, preço e quantidade lado a lado e a lixeira; barra */
/*  fixa no rodapé. Sem meia tela.                                     */
/* ------------------------------------------------------------------ */

export function CategoriaDetalhe() {
    const { rascunho, categoriaAberta, abrirCategoria } = useFormulario();
    const m = rascunho.modalidades.find((x) => x.id === categoriaAberta?.modalidadeId);
    const c = m?.categorias.find((x) => x.id === categoriaAberta?.categoriaId);
    // Abre no topo, como uma página nova.
    useEffect(() => {
        document.getElementById("topo-da-categoria")?.scrollIntoView({ block: "start" });
    }, [categoriaAberta?.categoriaId]);
    if (!m || !c) return null;
    return <Detalhe modalidade={m} categoria={c} onFechar={() => abrirCategoria(null)} />;
}

/** Cartão de seção do detalhe (recriado do SecaoDoItem do AWA, que é de outro projeto). */
function SecaoDoDetalhe({ titulo, descricao, alerta, recolhida, children }: { titulo: string; descricao?: string; alerta?: boolean; recolhida?: boolean; children: ReactNode }) {
    const cabecalho = (
        <span className="flex flex-col gap-0.5">
            <span className="text-lg font-semibold text-primary">{titulo}</span>
            {descricao && <span className="max-w-[65ch] text-sm text-tertiary">{descricao}</span>}
        </span>
    );
    if (recolhida)
        return (
            <section className="rounded-2xl bg-primary ring-1 ring-secondary">
                <Accordion collapsible>
                    <Accordion.Item value="secao" className="rounded-2xl border-0 bg-primary" trigger={<span className="block py-1">{cabecalho}</span>}>
                        <div className="flex flex-col gap-5 py-2">{children}</div>
                    </Accordion.Item>
                </Accordion>
            </section>
        );
    return (
        <section className={cx("flex flex-col gap-5 rounded-2xl bg-primary p-5 ring-1 ring-secondary md:p-6", alerta && "ring-2 ring-fg-warning-secondary")}>
            <h2>{cabecalho}</h2>
            {children}
        </section>
    );
}

/** Nome do campo da pendência, em palavras (v0.25, critique UI-TXT-010): "Nome", "Idade" ou "Preço do 1º lote". */
function campoDaPendencia(c: Categoria, p: Pendencia, t: ReturnType<typeof useVocabulario>["t"]) {
    const lote = /^campo-lote-(.+)-(nome|valor|vagas|limite)$/.exec(p.campo);
    if (lote) {
        const i = c.lotes.findIndex((l) => l.id === lote[1]);
        const nome = c.lotes[i]?.nome.trim() || `${i + 1}º lote`;
        return `${{ nome: "Nome", valor: "Preço", vagas: "Quantidade", limite: "Data limite" }[lote[2]]} do ${nome}`;
    }
    const cat = /^campo-cat-(.+)-(nome|idade|vagas|maximo|lotes|pcd)$/.exec(p.campo);
    if (cat) return { nome: t.nomeDoNivel2, idade: "Idade", vagas: t.vagasDoNivel2, maximo: "Limite de compra", lotes: "Preço e lotes", pcd: "PCD" }[cat[2]]!;
    return "Campo";
}

/**
 * v0.18 (SCE-233): quem pode se inscrever, em linguagem natural. Sexo e idade valem juntos (segmentação combinada).
 * Ex.: "mulheres de 18 a 29 anos, com a idade contada em 31/12/2027."
 */
export function quemPodeSeInscrever(c: Categoria, largada: string, idadeDoEvento: number) {
    const quem = c.sexo === "feminino" ? "mulheres" : c.sexo === "masculino" ? "homens" : "atletas";
    const min = c.idadeMin ?? (idadeDoEvento > 0 ? idadeDoEvento : null);
    const max = c.idadeMax;
    const idade = min != null && max != null ? `de ${min} a ${max} anos` : min != null ? `com ${min} anos ou mais` : max != null ? `com até ${max} anos` : "de qualquer idade";
    const pcd = c.pcd ? ", PCD aprovados no formulário de participação" : "";
    const doEvento = c.idadeMin == null && idadeDoEvento > 0 ? " (idade mínima do evento)" : "";
    const ano = largada ? largada.slice(0, 4) : null;
    const contada =
        min == null && max == null
            ? ""
            : c.idadeEm === "dia-do-evento"
              ? ", com a idade contada no dia do evento"
              : c.idadeEm === "dia-da-compra"
                ? ", com a idade contada no dia da compra"
                : ano
                  ? `, com a idade contada em 31/12/${ano}`
                  : ", com a idade contada no final do ano do evento";
    return `${quem} ${idade}${doEvento}${pcd}${contada}.`;
}

/**
 * v0.16 (SCE-220): pendências da categoria no topo do detalhe, com o campo de cada uma e o atalho até ele.
 * Os lotes copiados ainda não revisados entram como aviso. Some sozinho quando tudo é resolvido.
 */
function PendenciasDaCategoria({ categoria: c, lista, aRevisar }: { categoria: Categoria; lista: Pendencia[]; aRevisar: number }) {
    const { t } = useVocabulario();
    const total = lista.length + aRevisar;
    return (
        <Surgir visivel={total > 0}>
            <section aria-live="polite" className="flex flex-col gap-3 rounded-xl bg-warning-primary p-4 ring-1 ring-fg-warning-secondary">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-warning-primary">
                    <AlertCircle className="size-5 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                    {t.pendenciasDoNivel2(total)}
                </h2>
                <p className="pl-7 text-sm text-warning-primary">{t.pendenciasDoNivel2Descricao}</p>
                <ul className="flex flex-col gap-1 pl-7">
                    {lista.map((p) => (
                        <li key={`${p.campo}-${p.texto}`}>
                            <button
                                type="button"
                                onClick={() => irParaCampo(p.campo)}
                                className="cursor-pointer rounded text-left text-sm text-secondary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2"
                            >
                                <span className="font-semibold text-primary">{campoDaPendencia(c, p, t)}:</span> {p.texto}
                            </button>
                        </li>
                    ))}
                    {c.lotes.map((l, i) =>
                        l.revisar ? (
                            <li key={`revisar-${l.id}`}>
                                <button
                                    type="button"
                                    onClick={() => irParaCampo(CAMPO.loteNome(l.id))}
                                    className="cursor-pointer rounded text-left text-sm text-secondary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2"
                                >
                                    <span className="font-semibold text-primary">{l.nome.trim() || `${i + 1}º lote`}:</span> lote copiado. Confira e confirme.
                                </button>
                            </li>
                        ) : null,
                    )}
                </ul>
            </section>
        </Surgir>
    );
}

function Detalhe({ modalidade: m, categoria: c, onFechar }: { modalidade: Modalidade; categoria: Categoria; onFechar: () => void }) {
    const { rascunho: r, atualizar, erro, tocar, pendencias, secoesTentadas, irParaPendencia } = useFormulario();
    const pendenciasDaTela = pendenciasDaCategoria(pendencias, c.id);
    const criando = !!c.nova;
    const regrasDoEvento = regrasDe(r);
    const limiteDoEvento = regrasDoEvento.limitePorComprador;
    const [confirmandoSaida, setConfirmandoSaida] = useState(false);
    // v0.16 (SCE-220): ao abrir, os campos com pendência já aparecem marcados (sem esperar sair do campo).
    // v0.17 (SCE-228): na criação, não: os erros aparecem ao sair do campo ou ao tentar salvar.
    useEffect(() => {
        if (c.nova) return;
        pendenciasDaCategoria(pendencias, c.id).forEach((p) => tocar(p.campo));
        // Só na abertura da categoria: o que for criado depois segue a regra normal (erro ao sair do campo).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.id]);
    const { t } = useVocabulario();
    const reduzir = useReducedMotion();
    const e = (campo: string) => erro(campo, "modalidades");
    const set = (fn: (c: Categoria) => Categoria) => atualizar(comCategoria(m.id, c.id, fn));
    const temFaixa = c.idadeMin != null || c.idadeMax != null;
    const nomeDaModalidade = m.nome.trim() || t.nivel1SemNome;
    const regra = regraSugerida(c);
    const perguntas = r.perguntas.filter((p) => p.vinculos[c.id]);
    const valores = c.lotes.map((l) => l.valor).filter((v): v is number => v != null);
    const resumo = valores.length ? `${c.lotes.length === 1 ? "1 lote" : `${c.lotes.length} lotes`}, a partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.min(...valores))}` : undefined;

    const configurarRegra = () => {
        if (!regra) return;
        if (regra.tipo === "sexo") set((x) => ({ ...x, sexo: regra.sexo! }));
        if (regra.tipo === "pcd") set((x) => ({ ...x, pcd: true }));
        if (regra.tipo === "idade" && (regra.idadeMin != null || regra.idadeMax != null)) set((x) => ({ ...x, idadeMin: regra.idadeMin ?? null, idadeMax: regra.idadeMax ?? null }));
        const alvo = regra.tipo === "idade" ? CAMPO.catIdade(c.id) : regra.tipo === "pcd" ? `campo-cat-${c.id}-pcd` : `campo-cat-${c.id}-sexo`;
        requestAnimationFrame(() => irParaCampo(alvo));
        if (regra.tipo !== "idade" || regra.idadeMin != null || regra.idadeMax != null) toast.success("Regra configurada. Confira o campo destacado.");
    };

    /** Sair sem salvar: tira a categoria nova do evento (e os vínculos que ela herdou) e volta para a lista. */
    const descartar = () => {
        atualizar((a) => ({
            ...a,
            modalidades: a.modalidades.map((x) => (x.id === m.id ? { ...x, categorias: x.categorias.filter((y) => y.id !== c.id) } : x)),
            perguntas: a.perguntas.map((p) => (p.vinculos[c.id] ? { ...p, vinculos: Object.fromEntries(Object.entries(p.vinculos).filter(([k]) => k !== c.id)) } : p)),
        }));
        setConfirmandoSaida(false);
        onFechar();
    };
    const voltar = () => (criando ? setConfirmandoSaida(true) : onFechar());

    const concluir = () => {
        const p = pendenciasDaCategoria(pendencias, c.id);
        if (criando) {
            if (p.length > 0) {
                p.forEach((x) => tocar(x.campo));
                toast.error(t.preenchaObrigatorios(p.length));
                requestAnimationFrame(() => irParaCampo(p[0].campo));
                return;
            }
            set((x) => ({ ...x, nova: undefined }));
            toast.success(t.nivel2Salva(c.nome.trim()));
            return onFechar();
        }
        if (p.length === 0) return onFechar();
        p.forEach((x) => tocar(x.campo));
        toast.error(t.faltamAjustes(p.length));
        requestAnimationFrame(() => irParaCampo(p[0].campo));
    };


    const alertaLotes = secoesTentadas.has("modalidades") && pendenciasDaCategoria(pendencias, c.id).some((p) => p.campo === CAMPO.catLotes(c.id) || c.lotes.some((l) => p.campo.includes(l.id)));

    return (
        <div id="topo-da-categoria" className="flex w-full min-w-0 flex-1 scroll-mt-6 flex-col gap-6">
            {/* Cabeçalho do detalhe (CabecalhoDoItem do AWA): voltar, título e resumo. */}
            <header className="flex flex-col gap-3">
                <Button color="tertiary" size="md" iconLeading={ArrowLeft} onClick={voltar} className="-ml-3 self-start">
                    {t.voltarParaNivel1(nomeDaModalidade)}
                </Button>
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className={cx(TITULO_PAGINA, "break-words")}>{c.nome.trim() || t.novaNivel2}</h1>
                    <p className="text-md text-tertiary">
                        {t.nivel1Nome(nomeDaModalidade)}
                        {resumo ? `, ${resumo}` : ""}
                    </p>
                </div>
            </header>

            {/* v0.4 (SCE-158): largura toda; campos lado a lado no desktop e cada lote numa linha só. */}
            <div className="flex w-full flex-col gap-4">
                {/* v0.17 (SCE-228): só para categoria que já existe; na criação, não há o que revisar. */}
                {!criando && <PendenciasDaCategoria categoria={c} lista={pendenciasDaTela} aRevisar={c.lotes.filter((l) => l.revisar).length} />}
                {/* v0.18 (SCE-232): quatro blocos, na ordem em que o organizador pensa a categoria, sem "Avançado":
                    o que é (nome), quem pode se inscrever (sexo e idade, regras combinadas), para quem é a inscrição
                    (atribuição e inscrições por pedido) e vagas, preço e lotes. Desconto legal e transferência saíram. */}
                <SecaoDoDetalhe titulo={t.informacoesDoNivel2}>
                    <div className="grid items-start gap-4 md:grid-cols-2">
                        <CampoTexto
                            id={CAMPO.catNome(c.id)}
                            label={t.nomeDoNivel2}
                            isRequired
                            limite={LIMITE_NOME}
                            placeholder={t.placeholderNivel2}
                            valor={c.nome}
                            onChange={(nome) => set((x) => ({ ...x, nome }))}
                            onBlur={() => tocar(CAMPO.catNome(c.id))}
                            erro={e(CAMPO.catNome(c.id))}
                        />
                        {/* v0.22 (SCE-245): limite de compra próprio, opcional, ao lado do nome (atributo da categoria). */}
                        <CampoNumero
                            id={CAMPO.catMaximo(c.id)}
                            label="Limite de compra nesta categoria (opcional)"
                            tooltip="Use quando esta categoria precisa de um limite menor que o do evento, por exemplo PCD, idoso ou cortesia."
                            placeholder={limiteDoEvento && limiteDoEvento > 1 ? `De 1 a ${limiteDoEvento}` : "1"}
                            semSetas
                            isDisabled={limiteDoEvento === 1}
                            valor={c.limiteComprador ?? null}
                            onChange={(limiteComprador) => set((x) => ({ ...x, limiteComprador }))}
                            onBlur={() => tocar(CAMPO.catMaximo(c.id))}
                            erro={e(CAMPO.catMaximo(c.id))}
                            // v0.23 (SCE-246): textos curtos; o limite do evento sempre à vista.
                            dica={
                                limiteDoEvento === 1
                                    ? "O evento já limita a 1 por comprador."
                                    : c.limiteComprador == null
                                      ? `Em branco, vale o limite do evento: ${limiteDoEvento ?? "?"} por comprador.`
                                      : `Até ${c.limiteComprador} por comprador nesta ${t.nivel2.um}. O evento permite até ${limiteDoEvento ?? "?"}.`
                            }
                        />
                        {/* v0.24 (SCE-248): descrição opcional, na largura toda, abaixo do nome e do limite. */}
                        <div className="md:col-span-2">
                            <CampoTextoLongo
                                id={`campo-cat-${c.id}-descricao`}
                                label="Descrição (opcional)"
                                placeholder="Ex.: para atletas com 60 anos ou mais; retirada do kit com documento com foto."
                                limite={1000}
                                valor={c.descricao ?? ""}
                                onChange={(descricao) => set((x) => ({ ...x, descricao }))}
                                dica="O atleta vê na escolha da inscrição."
                            />
                        </div>
                    </div>
                    {/* RN-12: o nome sugere uma regra que não está configurada. Não bloqueia. */}
                    <Surgir visivel={!!regra}>
                        <p role="status" className="flex flex-col gap-3 rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary sm:flex-row sm:items-center">
                            <span className="flex min-w-0 flex-1 items-start gap-2">
                                <Lightbulb02 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                {regra ? textoDaRegraSugerida(t, regra) : ""}
                            </span>
                            <Button color="secondary" size="sm" onClick={configurarRegra} className="self-start sm:self-auto">
                                Configurar
                            </Button>
                        </p>
                    </Surgir>
                </SecaoDoDetalhe>

                {/* SCE-233: sexo e idade são uma regra só (segmentação combinada): o atleta precisa atender às duas. */}
                <SecaoDoDetalhe titulo="Quem pode se inscrever">
                    {/* v0.18 (SCE-237): sexo e idade numa linha só, com os rótulos alinhados e a mesma altura de campo. */}
                    <div id={CAMPO.catIdade(c.id)} className="flex scroll-mt-6 flex-col gap-1.5">
                        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,9rem)_minmax(0,9rem)_minmax(0,15rem)]">
                            <div id={`campo-cat-${c.id}-sexo`} className="scroll-mt-6 sm:col-span-2 lg:col-span-1">
                                <Escolha label="Sexo" tooltip={AJUDA.sexo} size="md" valor={c.sexo} opcoes={SEXOS} onChange={(sexo) => set((x) => ({ ...x, sexo }))} />
                            </div>
                            <CampoNumero
                                id={`${CAMPO.catIdade(c.id)}-min`}
                                label="Idade mínima"
                                tooltip={t.ajudaFaixaEtaria}
                                placeholder="Ex.: 18"
                                semSetas
                                valor={c.idadeMin}
                                onChange={(idadeMin) => set((x) => ({ ...x, idadeMin }))}
                                onBlur={() => tocar(CAMPO.catIdade(c.id))}
                                isInvalid={!!e(CAMPO.catIdade(c.id))}
                            />
                            <CampoNumero
                                id={`${CAMPO.catIdade(c.id)}-max`}
                                label="Idade máxima"
                                placeholder="Ex.: 29"
                                semSetas
                                valor={c.idadeMax}
                                onChange={(idadeMax) => set((x) => ({ ...x, idadeMax }))}
                                onBlur={() => tocar(CAMPO.catIdade(c.id))}
                                isInvalid={!!e(CAMPO.catIdade(c.id))}
                            />
                            {/* Só com idade definida importa a data de cálculo (RN-03: padrão 31/12 do ano do evento). */}
                            {/* v0.25 (critique UI-VIS-008): entra e sai com fade, sem empurrar a linha. */}
                            <AnimatePresence initial={false}>
                                {temFaixa && (
                                    <motion.div
                                        key="idade-em"
                                        className="sm:col-span-2 lg:col-span-1"
                                        initial={{ opacity: 0, y: reduzir ? 0 : -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: reduzir ? 0.12 : DURACAO_TRANSICAO }}
                                    >
                                        <CampoSelect
                                            id={`campo-cat-${c.id}-idade-em`}
                                            label="Idade contada em"
                                            tooltip={AJUDA.idadeCalculadaEm}
                                            opcoes={IDADE_CALCULADA_EM}
                                            valor={c.idadeEm}
                                            onChange={(v) => set((x) => ({ ...x, idadeEm: v as Categoria["idadeEm"] }))}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <ErroDaLista erro={e(CAMPO.catIdade(c.id))} />
                    </div>

                    {/* v0.18 (SCE-236): PCD = segmentação por lista de documentos, alimentada pelo formulário de participação do evento. */}
                    <div id={`campo-cat-${c.id}-pcd`} className="flex scroll-mt-6 flex-col gap-3 border-t border-secondary pt-5">
                        <Toggle
                            size="sm"
                            label="Somente pessoas com deficiência (PCD)"
                            hint="O atleta pede a participação pelo formulário do evento e só se inscreve depois de aprovado."
                            isSelected={!!c.pcd}
                            // v0.19: ligar PCD sugere o limite de 1 por comprador (o mais comum), se ainda não houver limite próprio.
                            onChange={(pcd) => set((x) => ({ ...x, pcd, limiteComprador: pcd && x.limiteComprador == null ? 1 : x.limiteComprador }))}
                        />
                        <Surgir visivel={!!c.pcd}>
                            {r.formularioParticipacao ? (
                                <p className="flex items-start gap-2 rounded-lg bg-success-primary px-3 py-2.5 text-sm text-success-primary">
                                    <CheckCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <span>
                                        Formulário de participação ativo neste evento. Os pedidos chegam em Público › Formulário de participação; quem for aprovado entra na lista PCD e pode se inscrever nesta {t.nivel2.um}.
                                    </span>
                                </p>
                            ) : (
                                <div role="status" className="flex flex-col gap-3 rounded-lg bg-warning-primary px-3 py-2.5 text-sm text-warning-primary ring-1 ring-fg-warning-secondary sm:flex-row sm:items-center">
                                    <span className="flex min-w-0 flex-1 items-start gap-2">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                                        O formulário de participação deste evento está desativado. Sem ele, ninguém consegue pedir para participar como PCD.
                                    </span>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        className="self-start sm:self-auto"
                                        onClick={() => {
                                            atualizar((a) => ({ ...a, formularioParticipacao: true }));
                                            toast.success("Formulário de participação ativado para o evento todo");
                                        }}
                                    >
                                        Ativar no evento
                                    </Button>
                                </div>
                            )}
                        </Surgir>
                        <ErroDaLista erro={e(`campo-cat-${c.id}-pcd`)} />
                    </div>

                    {/* Resumo em linguagem natural: confirma a regra sem precisar ler os campos. */}
                    {/* v0.25 (critique UI-VIS-019): texto de apoio, sem caixa dentro do cartão. */}
                    <p aria-live="polite" className="flex items-start gap-2 border-t border-secondary pt-5 text-sm text-secondary">
                        <Users01 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                        <span>
                            <span className="font-semibold text-primary">Podem se inscrever: </span>
                            {quemPodeSeInscrever(c, r.largada, Number(r.idadeMinima) || 0)}
                        </span>
                    </p>
                </SecaoDoDetalhe>

                {/* Preço e lotes: o mesmo desenho dos lotes do ingresso no AWA. v0.21 (SCE-243): as vagas da categoria são a soma dos lotes. */}
                <div id={CAMPO.catLotes(c.id)} className="scroll-mt-6">
                    <SecaoDoDetalhe titulo="Preço e lotes" alerta={alertaLotes}>
                        <p className="max-w-[65ch] text-sm text-tertiary">
                            O lote vira sozinho quando esgota ou na data limite. Só um lote vende por vez. As vagas da {t.nivel2.um} são a soma das quantidades dos lotes
                            {vagasDaCategoria(c) > 0 ? <span className="font-medium text-secondary">: {vagasDaCategoria(c).toLocaleString("pt-BR")} vagas</span> : null}.
                        </p>
                        {/* v0.25 (critique UI-VIS-019): lotes em linhas separadas por divisória; só o lote a revisar tem fundo (é um objeto a conferir). */}
                        <ol className="flex flex-col divide-y divide-secondary border-y border-secondary">
                            <AnimatePresence initial={false}>
                                {c.lotes.map((l, i) => (
                                    <motion.li
                                        key={l.id}
                                        layout={!reduzir}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
                                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                                        transition={{ duration: reduzir ? 0.12 : DURACAO_TRANSICAO }}
                                        style={{ overflow: "hidden" }}
                                    >
                                        {/* v0.16 (SCE-221): lote a revisar com contorno de aviso; "Marcar como revisado" é botão, não link. */}
                                        <div className={cx("flex flex-col gap-3 py-4 transition-colors duration-200", l.revisar && "-mx-3 rounded-lg bg-warning-primary/40 px-3")}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-primary">{l.nome.trim() || `${i + 1}º lote`}</span>
                                                    {/* v0.8 (SCE-191): lote copiado a revisar; mexer em qualquer campo também marca como revisado. */}
                                                    {l.revisar && (
                                                        <>
                                                            <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                                                                Revisar
                                                            </BadgeWithIcon>
                                                            <Button
                                                                color="primary"
                                                                size="sm"
                                                                iconLeading={Check}
                                                                onClick={() => {
                                                                    atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, revisar: false })));
                                                                    toast.success(`${l.nome.trim() || `${i + 1}º lote`} revisado`);
                                                                }}
                                                            >
                                                                Confirmar
                                                            </Button>
                                                        </>
                                                    )}
                                                </span>
                                                <ButtonUtility
                                                    size="xs"
                                                    color="tertiary"
                                                    icon={Trash01}
                                                    tooltip={`Remover ${l.nome.trim() || "lote"}`}
                                                    onClick={() => set((x) => ({ ...x, lotes: x.lotes.filter((y) => y.id !== l.id) }))}
                                                />
                                            </div>
                                            <div className="grid items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                <CampoTexto
                                                    id={CAMPO.loteNome(l.id)}
                                                    label="Nome do lote"
                                                    isRequired
                                                    placeholder="Ex.: 1º lote"
                                                    valor={l.nome}
                                                    onChange={(nome) => atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, nome, revisar: false })))}
                                                    onBlur={() => tocar(CAMPO.loteNome(l.id))}
                                                    erro={e(CAMPO.loteNome(l.id))}
                                                />
                                                <CampoNumero
                                                    id={CAMPO.loteValor(l.id)}
                                                    label="Preço"
                                                    isRequired
                                                    placeholder="R$ 0,00"
                                                    formato={FORMATO_REAIS}
                                                    valor={l.valor}
                                                    onChange={(valor) => atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, valor, revisar: false })))}
                                                    onBlur={() => tocar(CAMPO.loteValor(l.id))}
                                                    erro={e(CAMPO.loteValor(l.id))}
                                                />
                                                <CampoNumero
                                                    id={CAMPO.loteVagas(l.id)}
                                                    label="Quantidade"
                                                    isRequired
                                                    placeholder="Ex.: 200"
                                                    valor={l.vagas}
                                                    onChange={(vagas) => atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, vagas, revisar: false })))}
                                                    onBlur={() => tocar(CAMPO.loteVagas(l.id))}
                                                    erro={e(CAMPO.loteVagas(l.id))}
                                                    dica="Inscrições neste lote"
                                                />
                                            <div className="border-t border-secondary pt-3 sm:col-span-3 sm:max-w-xs lg:col-span-1 lg:max-w-none lg:border-t-0 lg:pt-0">
                                                <CampoDataHora
                                                    id={CAMPO.loteLimite(l.id)}
                                                    label="Data limite"
                                                    valor={l.dataLimite}
                                                    dica="Opcional. Em branco, vira quando esgota."
                                                    onChange={(dataLimite) => {
                                                        atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, dataLimite, revisar: false })));
                                                    }}
                                                    onBlur={() => tocar(CAMPO.loteLimite(l.id))}
                                                    erro={e(CAMPO.loteLimite(l.id))}
                                                />
                                            </div>
                                            </div>
                                        </div>
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        </ol>
                        <ErroDaLista erro={e(CAMPO.catLotes(c.id))} />
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                color="secondary"
                                size="md"
                                iconLeading={Plus}
                                onClick={() => set((x) => ({ ...x, lotes: [...x.lotes, novoLote(x.lotes.length + 1, { valor: x.lotes.at(-1)?.valor ?? null })] }))}
                            >
                                Adicionar lote
                            </Button>
                        </div>
                    </SecaoDoDetalhe>
                </div>

                {/* Perguntas não se editam aqui (v0.3): só um aviso discreto quando a categoria já recebe perguntas. */}
                {perguntas.length > 0 && (
                    <div id={CAMPO.catPerguntas(c.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm text-tertiary">
                        <ClipboardCheck className="size-4 text-fg-quaternary" aria-hidden="true" />
                        <span>{perguntas.length === 1 ? "Recebe 1 pergunta do formulário." : `Recebe ${perguntas.length} perguntas do formulário.`}</span>
                        <Button color="link-color" size="sm" onClick={() => irParaPendencia({ secao: "inscricao", campo: "secao-inscricao", texto: "" })}>
                            Ver no formulário
                        </Button>
                    </div>
                )}

            </div>

            {/* Barra fixa no rodapé, com o fundo da página (UI-VIS-013), como a barra de salvar do AWA. */}
            <footer className="sticky bottom-0 z-20 mt-auto border-t border-secondary bg-primary_alt">
                <div className="flex flex-wrap items-center justify-end gap-3 py-3">
                    {criando ? (
                        <>
                            <p className="mr-auto text-sm text-tertiary">Campos com * são obrigatórios.</p>
                            <Button color="secondary" size="md" onClick={voltar}>
                                Cancelar
                            </Button>
                            <Button color="primary" size="md" onClick={concluir}>
                                {t.salvarNivel2}
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="mr-auto text-sm text-tertiary">Salvo automaticamente.</p>
                            <Button color="primary" size="md" onClick={concluir}>
                                {t.concluirNivel2}
                            </Button>
                        </>
                    )}
                </div>
            </footer>

            <ModalOverlay isOpen={confirmandoSaida} onOpenChange={(v) => !v && setConfirmandoSaida(false)} isDismissable>
                <Modal className="sm:max-w-md">
                    <Dialog aria-label={t.sairSemSalvarTitulo}>
                        <div className="flex w-full flex-col gap-5 rounded-2xl bg-primary p-6 shadow-xl ring-1 ring-secondary">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-primary">{t.sairSemSalvarTitulo}</h2>
                                <p className="text-sm text-tertiary">{t.sairSemSalvarTexto}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button size="md" color="secondary" onClick={() => setConfirmandoSaida(false)}>
                                    Continuar editando
                                </Button>
                                <Button size="md" color="primary-destructive" onClick={descartar}>
                                    Sair sem salvar
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
}
