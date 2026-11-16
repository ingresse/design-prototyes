import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, Lightbulb02, Plus, Trash01 } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { AccordionComponent as Accordion } from "@/components/application/accordion/accordion";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Label } from "@/components/base/input/label";
import { DURACAO_TRANSICAO, Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { CAMPO, FORMATO_REAIS, irParaCampo } from "../data/campos";
import { novoLote } from "../data/modelos";
import { AJUDA, DESCONTOS, IDADE_CALCULADA_EM, LIMITE_NOME, SEXOS, TRANSFERENCIAS } from "../data/opcoes";
import type { Categoria, Modalidade } from "../data/tipos";
import { pendenciasDaCategoria, regraSugerida, textoDaRegraSugerida } from "../data/validacao";
import { useVocabulario } from "../data/vocabulario";
import { CampoDataHora, CampoNumero, CampoSelect, CampoTexto, CampoVagas, ErroDaLista } from "./campos";
import { useFormulario } from "./contexto";
import { comCategoria, comLote } from "./operacoes";

/* ------------------------------------------------------------------ */
/*  Categoria em tela cheia (v0.3, SCE-150)                            */
/*  Mesmo padrão do detalhe de ingresso do AWA                         */
/*  (backstage/itens/pages/IngressoDetalhe.tsx): voltar, título e      */
/*  resumo no topo; cartões de seção na largura toda (v0.4, SCE-158)  */
/*  (Informações, Preço e lotes, Avançado recolhido); cada lote é um   */
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

function Detalhe({ modalidade: m, categoria: c, onFechar }: { modalidade: Modalidade; categoria: Categoria; onFechar: () => void }) {
    const { rascunho: r, atualizar, erro, tocar, pendencias, secoesTentadas, irParaPendencia } = useFormulario();
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
        if (regra.tipo === "pcd") set((x) => ({ ...x, desconto: "pcd" }));
        if (regra.tipo === "idade" && (regra.idadeMin != null || regra.idadeMax != null)) set((x) => ({ ...x, idadeMin: regra.idadeMin ?? null, idadeMax: regra.idadeMax ?? null }));
        const alvo = regra.tipo === "idade" ? CAMPO.catIdade(c.id) : regra.tipo === "sexo" ? `campo-cat-${c.id}-sexo` : `campo-cat-${c.id}-desconto`;
        requestAnimationFrame(() => irParaCampo(alvo));
        if (regra.tipo !== "idade" || regra.idadeMin != null || regra.idadeMax != null) toast.success("Regra configurada. Confira o campo destacado.");
    };

    const concluir = () => {
        const p = pendenciasDaCategoria(pendencias, c.id);
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
                <Button color="tertiary" size="md" iconLeading={ArrowLeft} onClick={onFechar} className="-ml-3 self-start">
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
                <SecaoDoDetalhe titulo={t.informacoesDoNivel2}>
                    <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <CampoTexto
                        className="md:col-span-2"
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
                        <CampoSelect id={`campo-cat-${c.id}-sexo`} label="Sexo" opcoes={SEXOS} valor={c.sexo} onChange={(v) => set((x) => ({ ...x, sexo: v as Categoria["sexo"] }))} />
                        <CampoSelect
                            id={`campo-cat-${c.id}-desconto`}
                            label="Desconto legal"
                            tooltip={AJUDA.descontoLegal}
                            opcoes={DESCONTOS}
                            valor={c.desconto}
                            onChange={(v) => set((x) => ({ ...x, desconto: v as Categoria["desconto"] }))}
                        />
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
                    {/* Faixa etária (3/4) e vagas (1/4) lado a lado no desktop. */}
                    <div className="grid items-start gap-4 lg:grid-cols-4">
                    <div id={CAMPO.catIdade(c.id)} role="group" aria-labelledby={`${CAMPO.catIdade(c.id)}-rotulo`} className="flex scroll-mt-6 flex-col gap-1.5 lg:col-span-3">
                        <Label id={`${CAMPO.catIdade(c.id)}-rotulo`} tooltip={t.ajudaFaixaEtaria}>
                            Faixa etária
                        </Label>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                            <CampoNumero
                                id={`${CAMPO.catIdade(c.id)}-min`}
                                label="Idade mínima"
                                placeholder="Ex.: 18"
                                valor={c.idadeMin}
                                onChange={(idadeMin) => set((x) => ({ ...x, idadeMin }))}
                                onBlur={() => tocar(CAMPO.catIdade(c.id))}
                                isInvalid={!!e(CAMPO.catIdade(c.id))}
                            />
                            <CampoNumero
                                id={`${CAMPO.catIdade(c.id)}-max`}
                                label="Idade máxima"
                                placeholder="Ex.: 29"
                                valor={c.idadeMax}
                                onChange={(idadeMax) => set((x) => ({ ...x, idadeMax }))}
                                onBlur={() => tocar(CAMPO.catIdade(c.id))}
                                isInvalid={!!e(CAMPO.catIdade(c.id))}
                            />
                            {/* Só com faixa definida importa a data de cálculo (RN-03: padrão final do ano). */}
                            {temFaixa && (
                                <CampoSelect
                                    id={`campo-cat-${c.id}-idade-em`}
                                    label="Idade calculada em"
                                    tooltip={AJUDA.idadeCalculadaEm}
                                    isRequired
                                    className="col-span-2 md:col-span-1"
                                    opcoes={IDADE_CALCULADA_EM}
                                    valor={c.idadeEm}
                                    onChange={(v) => set((x) => ({ ...x, idadeEm: v as Categoria["idadeEm"] }))}
                                />
                            )}
                        </div>
                        <ErroDaLista erro={e(CAMPO.catIdade(c.id))} />
                    </div>
                    <div className="md:max-w-xs lg:max-w-none">
                        <CampoVagas
                            id={CAMPO.catVagas(c.id)}
                            label={t.vagasDoNivel2}
                            tooltip={t.ajudaVagasNivel2}
                            semLimite={c.semLimite}
                            vagas={c.vagas}
                            onChange={(semLimite, vagas) => set((x) => ({ ...x, semLimite, vagas }))}
                            onBlur={() => tocar(CAMPO.catVagas(c.id))}
                            erro={e(CAMPO.catVagas(c.id))}
                        />
                    </div>
                    </div>
                </SecaoDoDetalhe>

                {/* Preço e lotes: o mesmo desenho dos lotes do ingresso no AWA. */}
                <div id={CAMPO.catLotes(c.id)} className="scroll-mt-6">
                    <SecaoDoDetalhe titulo="Preço e lotes" alerta={alertaLotes}>
                        <p className="max-w-[65ch] text-sm text-tertiary">O lote vira sozinho quando esgota ou na data limite. Só um lote vende por vez.</p>
                        <ol className="flex flex-col gap-3">
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
                                        <div className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-secondary">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-primary">{l.nome.trim() || `${i + 1}º lote`}</span>
                                                    {/* v0.8 (SCE-191): lote copiado a revisar; mexer em qualquer campo também marca como revisado. */}
                                                    {l.revisar && (
                                                        <>
                                                            <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
                                                                Revisar
                                                            </BadgeWithIcon>
                                                            <Button color="link-color" size="sm" iconLeading={Check} onClick={() => atualizar(comLote(m.id, c.id, l.id, (y) => ({ ...y, revisar: false })))}>
                                                                Marcar como revisado
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

                {/* Opcional e raro: único bloco recolhido, como "Avançado" no ingresso do AWA. */}
                <SecaoDoDetalhe titulo="Avançado" descricao="Já vem preenchido. Mude só se precisar." recolhida>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <CampoSelect
                            id={`campo-cat-${c.id}-transferencia`}
                            label="Transferência"
                            tooltip={AJUDA.transferencia}
                            opcoes={TRANSFERENCIAS}
                            valor={c.transferencia}
                            onChange={(v) => set((x) => ({ ...x, transferencia: v as Categoria["transferencia"] }))}
                        />
                        <CampoNumero
                            id={CAMPO.catMaximo(c.id)}
                            label="Máximo por pedido"
                            isRequired
                            dica={t.dicaMaximoPorPedido}
                            valor={c.maxPorPedido}
                            onChange={(maxPorPedido) => set((x) => ({ ...x, maxPorPedido }))}
                            onBlur={() => tocar(CAMPO.catMaximo(c.id))}
                            erro={e(CAMPO.catMaximo(c.id))}
                        />
                    </div>
                </SecaoDoDetalhe>
            </div>

            {/* Barra fixa no rodapé, com o fundo da página (UI-VIS-013), como a barra de salvar do AWA. */}
            <footer className="sticky bottom-0 z-20 mt-auto border-t border-secondary bg-primary_alt">
                <div className="flex flex-wrap items-center justify-end gap-3 py-3">
                    <p className="mr-auto text-sm text-tertiary">Salvo automaticamente.</p>
                    <Button color="primary" size="md" onClick={concluir}>
                        {t.concluirNivel2}
                    </Button>
                </div>
            </footer>
        </div>
    );
}
