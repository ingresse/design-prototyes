import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { Surgir } from "@/components/foundations/transicao";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { IDADES_COM_CLASSIFICACAO } from "../../eventos/components/classificacao-indicativa";
import { agoraIsoLocal, CAMPO } from "../data/campos";
import { ESPORTES, LIMITE_NOME, MOEDA_PADRAO, MOEDAS } from "../data/opcoes";
import { regrasDe } from "../data/modelos";
import type { RegrasDaInscricao } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { CampoLocal } from "./campo-local";
import { CampoImagemComRecorte, type RegrasDaImagem } from "./campos-de-arquivo";
import { CampoTermoDeUso } from "./campo-termo-de-uso";
import { CampoDataHora, CampoNumero, CampoSelect, CampoTexto, CampoTextoLongo, Secao } from "./campos";
import { CampoDescricao } from "./campo-descricao";
import { useFormulario } from "./contexto";

/*
 * Passo 1: Evento (v0.9, SCE-200 a SCE-204). Três cartões na largura toda (grade por container query):
 * - Informações da prova: nome e esporte; largada, término e idade mínima; local; descrição (editor, v0.10).
 * - Imagens: banner (4:5, também no e-mail de confirmação) e imagem do percurso (o "Mapa" do AWA), com recorte.
 * - Termo de uso: um dos termos ativos da organização, com o padrão já escolhido (v0.11).
 */

/** Banner: a proporção e o tamanho do recorte do Criar evento do AWA (1080 × 1350, 4:5). */
export const REGRAS_DO_BANNER: RegrasDaImagem = { proporcao: "4:5", recomendado: { largura: 1080, altura: 1350 }, minimo: { largura: 540, altura: 675 }, limite: 5 * 1024 * 1024 };
/** v0.26 (SCE-257): banner do e-mail de confirmação, 16:9 como no AWA. */
export const REGRAS_DO_BANNER_DO_EMAIL: RegrasDaImagem = { proporcao: "16:9", recomendado: { largura: 1200, altura: 675 }, minimo: { largura: 600, altura: 338 }, limite: 5 * 1024 * 1024 };
/** Percurso: o AWA não fixa proporção para o mapa; aqui, paisagem 4:3, que cabe no fluxo de compra. */
export const REGRAS_DO_PERCURSO: RegrasDaImagem = { proporcao: "4:3", recomendado: { largura: 1600, altura: 1200 }, minimo: { largura: 800, altura: 600 }, limite: 5 * 1024 * 1024 };

export function SecaoEvento() {
    const { rascunho: r, atualizar, erro, tocar, revisar, revisado } = useFormulario();
    const { t } = useVocabulario();
    const e = (campo: string) => erro(campo, "evento");
    return (
        <div id="secao-evento" className="flex scroll-mt-6 flex-col gap-6">
            <Secao className="@container" titulo="Informações da prova">
                <div className="grid items-start gap-x-6 gap-y-4 @lg:grid-cols-2 @4xl:grid-cols-3">
                    <CampoTexto
                        className="@lg:col-span-2"
                        id={CAMPO.nome}
                        label="Nome do evento"
                        isRequired
                        limite={LIMITE_NOME}
                        placeholder="Ex.: Corrida Noturna Floripa 2026"
                        valor={r.nome}
                        onChange={(nome) => atualizar((a) => ({ ...a, nome }))}
                        onBlur={() => tocar(CAMPO.nome)}
                        erro={e(CAMPO.nome)}
                    />
                    <CampoSelect
                        id={CAMPO.esporte}
                        label="Esporte"
                        isRequired
                        opcoes={ESPORTES}
                        valor={r.esporte}
                        onChange={(esporte) => atualizar((a) => ({ ...a, esporte }))}
                        onBlur={() => tocar(CAMPO.esporte)}
                        erro={e(CAMPO.esporte)}
                    />
                    <CampoDataHora
                        id={CAMPO.largada}
                        label="Data e horário da largada"
                        isRequired
                        minimo={agoraIsoLocal()}
                        valor={r.largada}
                        revisar={revisar(CAMPO.largada)}
                        onChange={(largada) => {
                            // v0.25 (critique UI-FRM-008): término sugerido 4 h depois da largada; acompanha até a pessoa editar.
                            atualizar((a) => ({
                                ...a,
                                largada,
                                ...(largada && (!a.termino || a.terminoSugerido) ? { termino: somarHoras(largada, 4), terminoSugerido: true } : {}),
                            }));
                            revisado(CAMPO.largada);
                        }}
                        onBlur={() => tocar(CAMPO.largada)}
                        erro={e(CAMPO.largada)}
                    />
                    <CampoDataHora
                        id={CAMPO.termino}
                        label="Data e horário de término"
                        isRequired
                        valor={r.termino}
                        // v0.16 (SCE-215): o calendário abre no mês da largada; os dias antes dela ficam desabilitados.
                        minimo={r.largada || undefined}
                        revisar={revisar(CAMPO.termino)}
                        dica={r.terminoSugerido ? "Sugerido 4 h depois da largada. Ajuste se precisar." : "Quando a prova termina, depois da largada."}
                        onChange={(termino) => {
                            atualizar((a) => ({ ...a, termino, terminoSugerido: false }));
                            revisado(CAMPO.termino);
                        }}
                        onBlur={() => tocar(CAMPO.termino)}
                        erro={e(CAMPO.termino)}
                    />
                    {/* Idade mínima como no Criar evento do AWA: faixas da classificação indicativa (EVT-94). */}
                    <div id={CAMPO.idadeMinima} className="flex min-w-0 scroll-mt-6 flex-col gap-1.5">
                        <Label id="idade-minima-rotulo" tooltip={t.ajudaIdadeMinima}>
                            Idade mínima
                        </Label>
                        <Select
                            aria-labelledby="idade-minima-rotulo"
                            items={IDADES_COM_CLASSIFICACAO}
                            selectedKey={r.idadeMinima || "0"}
                            onSelectionChange={(k) => k != null && atualizar((a) => ({ ...a, idadeMinima: String(k) }))}
                        >
                            {(item) => (
                                <Select.Item id={item.id} icon={item.icon}>
                                    {item.label}
                                </Select.Item>
                            )}
                        </Select>
                    </div>
                    <div className="@lg:col-span-2">
                        <CampoLocal id={CAMPO.local} valor={r.local} onChange={(local) => atualizar((a) => ({ ...a, local }))} onBlur={() => tocar(CAMPO.local)} erro={e(CAMPO.local)} />
                    </div>
                    {/* v0.68 (SCE-337): moeda do evento, como no AWA; vem sempre em Real brasileiro. */}
                    <CampoSelect
                        id="moeda"
                        label="Moeda"
                        isRequired
                        opcoes={MOEDAS}
                        valor={r.moeda || MOEDA_PADRAO}
                        onChange={(moeda) => atualizar((a) => ({ ...a, moeda }))}
                        tooltip="Moeda em que os preços dos lotes são cobrados."
                    />
                    {/* v0.10 (SCE-206): "Descrição" com o editor do "Sobre o evento" do AWA, na largura toda. */}
                    <div className="@lg:col-span-2 @4xl:col-span-3">
                        <CampoDescricao id={CAMPO.descricao} valor={r.descricao} onChange={(descricao) => atualizar((a) => ({ ...a, descricao }))} erro={e(CAMPO.descricao)} />
                    </div>
                </div>
            </Secao>

            {/* v0.19 (SCE-238): políticas do evento num lugar só, já com os padrões mais comuns do esporte. */}
            <RegrasDaInscricaoCartao />

            <Secao className="@container" titulo="Imagens" descricao="Depois de escolher, você ajusta o recorte.">
                {/* v0.10 (SCE-205): cartões compactos de uma linha, lado a lado, como o Banner e o Mapa do AWA. */}
                <div className="grid items-start gap-x-8 gap-y-6 @3xl:grid-cols-2">
                    <CampoImagemComRecorte
                        id={CAMPO.imagem}
                        label="Banner do evento (opcional)"
                        titulo="Clique para escolher"
                        regras={REGRAS_DO_BANNER}
                        arquivo={r.imagem}
                        dica="A capa do evento na página de inscrição."
                        // v0.9 (SCE-204): sem configuração de QR Code no e-mail; o banner é o do e-mail de confirmação.
                        onAplicar={(imagem) => atualizar((a) => ({ ...a, imagem }))}
                        onRemover={() => atualizar((a) => ({ ...a, imagem: null }))}
                    />
                    <CampoImagemComRecorte
                        id={CAMPO.percurso}
                        label="Imagem do percurso da prova (opcional)"
                        titulo="Clique para escolher"
                        regras={REGRAS_DO_PERCURSO}
                        arquivo={r.percurso}
                        dica="O mapa do percurso, com largada, chegada e pontos de apoio."
                        observacao="O atleta vê esta imagem durante a compra da inscrição."
                        onAplicar={(percurso) => atualizar((a) => ({ ...a, percurso }))}
                        onRemover={() => atualizar((a) => ({ ...a, percurso: null }))}
                    />
                </div>
            </Secao>

            {/* v0.26 (SCE-257): e-mail de confirmação. No esporte o QR Code vai sempre (sem a escolha "Não incluir" do AWA);
                o organizador só personaliza com um texto e um banner próprios, opcionais. */}
            <Secao className="@container" titulo="E-mail de confirmação" descricao="Deixe o e-mail de inscrição confirmada com a cara do seu evento: inclua um recado e uma imagem.">
                <div className="grid items-start gap-x-8 gap-y-6 @3xl:grid-cols-2">
                    <CampoTextoLongo
                        id={CAMPO.emailInfo}
                        label="Informações adicionais (opcional)"
                        placeholder="Ex.: entre no grupo de WhatsApp da prova; retirada do kit no sábado, das 9h às 18h."
                        limite={500}
                        compacto
                        valor={r.emailInfo ?? ""}
                        onChange={(emailInfo) => atualizar((a) => ({ ...a, emailInfo }))}
                        dica="Aparece abaixo do QR Code."
                    />
                    <CampoImagemComRecorte
                        id={CAMPO.emailBanner}
                        label="Banner do e-mail (opcional)"
                        titulo="Clique para escolher"
                        regras={REGRAS_DO_BANNER_DO_EMAIL}
                        arquivo={r.emailBanner ?? null}
                        dica="Imagem própria do e-mail, diferente do banner do evento. Ex.: instruções de retirada do kit."
                        observacao={
                            <>
                                <Mail01 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                Aparece no corpo do e-mail, logo abaixo dos detalhes da inscrição.
                            </>
                        }
                        onAplicar={(emailBanner) => atualizar((a) => ({ ...a, emailBanner }))}
                        onRemover={() => atualizar((a) => ({ ...a, emailBanner: null }))}
                    />
                </div>
            </Secao>

            {/* v0.11 (SCE-207): termo de uso da organização, em texto, escolhido numa lista (como Políticas › Termos de uso do AWA). */}
            <Secao className="@container" titulo="Termo de uso">
                <div className="@3xl:max-w-3xl">
                    <CampoTermoDeUso id={CAMPO.termoDeUso} termoId={r.termoId} onEscolher={(termoId) => atualizar((a) => ({ ...a, termoId }))} />
                </div>
            </Secao>
        </div>
    );
}

/** ISO local + horas, em ISO local. */
const somarHoras = (iso: string, horas: number) => {
    const d = new Date(iso);
    d.setHours(d.getHours() + horas);
    const p2 = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

/** Véspera da largada (mesmo horário), em ISO local; sugestão do fim da troca de titularidade. */
const vesperaDe = (iso: string) => {
    const d = new Date(iso);
    d.setDate(d.getDate() - 1);
    const p2 = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

/**
 * v0.19 a v0.25 (SCE-238, SCE-241, SCE-242, SCE-249): regras da inscrição do evento. Valem para todas as categorias;
 * a categoria pode ter um limite de compra menor (SCE-239). Padrões: uma inscrição por atleta, permite comprar para
 * outro atleta, limite de 3 por comprador, sem troca de titularidade. Liga e desliga em Toggle (critique UI-DS-003).
 */
function RegrasDaInscricaoCartao() {
    const { rascunho: r, atualizar, erro, tocar, pendencias, irParaPendencia } = useFormulario();
    const regras = regrasDe(r);
    const e = (campo: string) => erro(campo, "evento");
    // Inscrição única por atleta + sem compra para outro atleta: o comprador só inscreve a si mesmo, uma vez.
    const limiteUnico = !regras.variasPorCpf && regras.atribuicao === "comprador";
    // Categorias com limite próprio acima do limite do evento (critique: avisar no ponto da mudança).
    const categoriasAcima = pendencias.filter((p) => /^campo-cat-.+-maximo$/.test(p.campo));
    const set = (mudanca: Partial<RegrasDaInscricao>) =>
        atualizar((a) => {
            const antes = regrasDe(a);
            const novas = { ...antes, ...mudanca };
            // Ao entrar na combinação que exige 1, o limite já vira 1 (a pessoa ainda pode editar e vê o motivo no erro).
            const virouUnico = !novas.variasPorCpf && novas.atribuicao === "comprador" && !(!antes.variasPorCpf && antes.atribuicao === "comprador");
            if (virouUnico) novas.limitePorComprador = 1;
            // Fim da troca sugerido na véspera da largada; acompanha o início até a pessoa editar o fim.
            if ("trocaInicio" in mudanca && novas.trocaInicio && (!antes.trocaFim || antes.trocaFimSugerido) && a.largada) {
                const vespera = vesperaDe(a.largada);
                if (vespera > novas.trocaInicio) {
                    novas.trocaFim = vespera;
                    novas.trocaFimSugerido = true;
                }
            }
            if ("trocaFim" in mudanca) novas.trocaFimSugerido = false;
            return { ...a, regras: novas };
        });
    return (
        <Secao className="@container" titulo="Regras da inscrição" descricao="Valem para o evento inteiro e já vêm com o mais comum.">
            {/* v0.28 (SCE-259): uma regra abaixo da outra; o texto de apoio quebra linha dentro da largura. */}
            <div className="flex max-w-3xl flex-col gap-6">
                <Toggle
                    size="sm"
                    className="w-full"
                    label="Permitir mais de uma inscrição para o mesmo atleta"
                    hint="Ligado: o mesmo CPF pode ter mais de uma inscrição. Desligado: uma inscrição por CPF no evento."
                    isSelected={regras.variasPorCpf}
                    onChange={(variasPorCpf) => set({ variasPorCpf })}
                />
                <Toggle
                    size="sm"
                    className="w-full"
                    label="Permitir compra para terceiros"
                    hint="Ligado: o comprador pode inscrever outras pessoas. Desligado: só inscreve a si mesmo."
                    isSelected={regras.atribuicao === "qualquer"}
                    onChange={(sim) => set({ atribuicao: sim ? "qualquer" : "comprador" })}
                />
                <div className="flex flex-col gap-2">
                    <CampoNumero
                        id={CAMPO.limitePorComprador}
                        label="Limite de compra"
                        tooltip="Uma categoria pode ter um limite menor, por exemplo PCD ou cortesia."
                        isRequired
                        semSetas
                        className="max-w-xs"
                        valor={regras.limitePorComprador}
                        onChange={(limitePorComprador) => set({ limitePorComprador })}
                        onBlur={() => tocar(CAMPO.limitePorComprador)}
                        erro={e(CAMPO.limitePorComprador)}
                        dica={limiteUnico ? "Precisa ser 1: uma inscrição por atleta e sem compra para terceiros." : "Inscrições por pessoa neste evento, somando todos os pedidos."}
                    />
                    <Surgir visivel={categoriasAcima.length > 0}>
                        <p className="flex flex-wrap items-center gap-x-2 text-sm text-warning-primary">
                            {categoriasAcima.length === 1 ? "1 categoria tem limite maior que este." : `${categoriasAcima.length} categorias têm limite maior que este.`}
                            <Button color="link-color" size="sm" onClick={() => categoriasAcima[0] && irParaPendencia(categoriasAcima[0])}>
                                Ajustar
                            </Button>
                        </p>
                    </Surgir>
                </div>
                <div className="flex flex-col gap-4">
                    <Toggle
                        size="sm"
                        className="w-full"
                        label="Permitir troca de titularidade depois da compra"
                        hint="O atleta passa a inscrição para outra pessoa pela carteira, no período abaixo."
                        isSelected={regras.trocaDeTitularidade}
                        onChange={(trocaDeTitularidade) => set({ trocaDeTitularidade })}
                    />
                    {/* SCE-241: período sempre visível; desabilitado quando a troca não é permitida. */}
                    <div className="grid items-start gap-4 sm:grid-cols-2 sm:pl-14">
                        <CampoDataHora
                            id={CAMPO.trocaInicio}
                            label="Troca permitida a partir de"
                            isRequired={regras.trocaDeTitularidade}
                            desabilitado={!regras.trocaDeTitularidade}
                            valor={regras.trocaInicio}
                            // v0.29 (Bruna): dias passados nem aparecem para escolher.
                            minimo={agoraIsoLocal()}
                            maximo={r.largada || undefined}
                            onChange={(trocaInicio) => set({ trocaInicio })}
                            onBlur={() => tocar(CAMPO.trocaInicio)}
                            erro={regras.trocaDeTitularidade ? e(CAMPO.trocaInicio) : undefined}
                        />
                        <CampoDataHora
                            id={CAMPO.trocaFim}
                            label="Troca permitida até"
                            isRequired={regras.trocaDeTitularidade}
                            desabilitado={!regras.trocaDeTitularidade}
                            valor={regras.trocaFim}
                            minimo={regras.trocaInicio || agoraIsoLocal()}
                            maximo={r.largada || undefined}
                            dica={regras.trocaDeTitularidade ? (regras.trocaFimSugerido ? "Sugerido na véspera da largada. Ajuste se precisar." : "Até a largada, no máximo.") : undefined}
                            onChange={(trocaFim) => set({ trocaFim })}
                            onBlur={() => tocar(CAMPO.trocaFim)}
                            erro={regras.trocaDeTitularidade ? e(CAMPO.trocaFim) : undefined}
                        />
                    </div>
                </div>
            </div>
        </Secao>
    );
}
