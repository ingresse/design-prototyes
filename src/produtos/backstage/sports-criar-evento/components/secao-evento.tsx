import { Mail01 } from "@untitledui/icons";
import { Label } from "@/components/base/input/label";
import { Select } from "@/components/base/select/select";
import { IDADES_COM_CLASSIFICACAO } from "../../eventos/components/classificacao-indicativa";
import { CAMPO } from "../data/campos";
import { ESPORTES, LIMITE_NOME } from "../data/opcoes";
import { useVocabulario } from "../data/vocabulario";
import { CampoLocal } from "./campo-local";
import { CampoImagemComRecorte, type RegrasDaImagem } from "./campos-de-arquivo";
import { CampoTermoDeUso } from "./campo-termo-de-uso";
import { CampoDataHora, CampoSelect, CampoTexto, Secao } from "./campos";
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
/** Percurso: o AWA não fixa proporção para o mapa; aqui, paisagem 4:3, que cabe no fluxo de compra. */
export const REGRAS_DO_PERCURSO: RegrasDaImagem = { proporcao: "4:3", recomendado: { largura: 1600, altura: 1200 }, minimo: { largura: 800, altura: 600 }, limite: 5 * 1024 * 1024 };

export function SecaoEvento() {
    const { rascunho: r, atualizar, erro, tocar, revisar, revisado } = useFormulario();
    const { t } = useVocabulario();
    const e = (campo: string) => erro(campo, "evento");
    return (
        <div id="secao-evento" className="flex scroll-mt-6 flex-col gap-6">
            <Secao className="@container" titulo="Informações da prova" descricao="O que o atleta vê primeiro na página de inscrição.">
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
                        valor={r.largada}
                        revisar={revisar(CAMPO.largada)}
                        onChange={(largada) => {
                            atualizar((a) => ({ ...a, largada }));
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
                        revisar={revisar(CAMPO.termino)}
                        dica="Quando a prova termina, depois da largada."
                        onChange={(termino) => {
                            atualizar((a) => ({ ...a, termino }));
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
                            hint="Livre: qualquer idade pode se inscrever."
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
                    {/* v0.10 (SCE-206): "Descrição" com o editor do "Sobre o evento" do AWA, na largura toda. */}
                    <div className="@lg:col-span-2 @4xl:col-span-3">
                        <CampoDescricao id={CAMPO.descricao} valor={r.descricao} onChange={(descricao) => atualizar((a) => ({ ...a, descricao }))} erro={e(CAMPO.descricao)} />
                    </div>
                </div>
            </Secao>

            <Secao className="@container" titulo="Imagens" descricao="As duas são opcionais. Depois de escolher, você ajusta o recorte.">
                {/* v0.10 (SCE-205): cartões compactos de uma linha, lado a lado, como o Banner e o Mapa do AWA. */}
                <div className="grid items-start gap-x-8 gap-y-6 @3xl:grid-cols-2">
                    <CampoImagemComRecorte
                        id={CAMPO.imagem}
                        label="Banner do evento"
                        titulo="Clique para adicionar um banner"
                        regras={REGRAS_DO_BANNER}
                        arquivo={r.imagem}
                        dica="A capa do evento na página de inscrição."
                        // v0.9 (SCE-204): sem configuração de QR Code no e-mail; o banner é o do e-mail de confirmação.
                        observacao={
                            <>
                                <Mail01 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                Este banner também vai no e-mail de confirmação que o atleta recebe ao se inscrever.
                            </>
                        }
                        onAplicar={(imagem) => atualizar((a) => ({ ...a, imagem }))}
                        onRemover={() => atualizar((a) => ({ ...a, imagem: null }))}
                    />
                    <CampoImagemComRecorte
                        id={CAMPO.percurso}
                        label="Imagem do percurso da prova"
                        titulo="Clique para adicionar a imagem do percurso"
                        regras={REGRAS_DO_PERCURSO}
                        arquivo={r.percurso}
                        dica="O mapa do percurso, com largada, chegada e pontos de apoio."
                        observacao="O atleta vê esta imagem durante a compra da inscrição."
                        onAplicar={(percurso) => atualizar((a) => ({ ...a, percurso }))}
                        onRemover={() => atualizar((a) => ({ ...a, percurso: null }))}
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
