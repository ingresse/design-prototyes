import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CheckCircle, Copy06, Edit01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { formatarDataHora, formatarReais } from "../data/campos";
import { textoDoLocal } from "../data/locais";
import { ESPORTES, labelDe, TIPOS_DE_MODALIDADE, TIPOS_DE_RESPOSTA, TITULO_FORMULARIO } from "../data/opcoes";
import { idsDasCategorias } from "../data/perguntas";
import { useVocabulario } from "../data/vocabulario";
import { textoPuro } from "./campo-descricao";
import { termoPorId } from "../data/termos";
import { IDADES_COM_CLASSIFICACAO } from "../../eventos/components/classificacao-indicativa";
import type { SecaoId } from "../data/tipos";
import { Secao } from "./campos";
import { useFormulario } from "./contexto";
import { ListaDeAvisos, ListaDePendencias, StatusDaSecao } from "./pendencias";
import { ROTAS } from "./cabecalho";

/* Passo 5 do assistente: o que falta, o resumo de cada seção e "Editar" que volta ao passo. */

const Linha = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
    <div className="grid gap-0.5 py-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        <dt className="text-sm font-medium text-secondary">{rotulo}</dt>
        <dd className="max-w-[65ch] text-sm text-tertiary sm:col-span-2 xl:col-span-3">{children}</dd>
    </div>
);

const NaoInformado = () => <span className="text-tertiary">Não informado</span>;

export function Revisao({ onEditar }: { onEditar: (s: SecaoId) => void }) {
    const { rascunho: r, pendencias, avisos } = useFormulario();
    const { t } = useVocabulario();
    const existentes = new Set(idsDasCategorias(r.modalidades));
    const editar = (s: SecaoId, nome: string) => (
        <div className="flex items-center gap-3">
            <StatusDaSecao secao={s} />
            <Button color="tertiary" size="sm" iconLeading={Edit01} aria-label={`Editar ${nome}`} onClick={() => onEditar(s)}>
                Editar
            </Button>
        </div>
    );
    const local = r.local ? textoDoLocal(r.local) : null;

    return (
        // v0.4 (SCE-158): largura toda. No desktop, o resumo das seções à esquerda e, fixos à direita, o que falta e os avisos.
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
                <Secao
                    id="lista-pendencias"
                    titulo={pendencias.length ? "Falta para abrir as inscrições" : "Pronto para publicar"}
                    descricao={pendencias.length ? "Toque em cada item para ir até o campo." : undefined}
                >
                    <ListaDePendencias />
                </Secao>
                {avisos.length > 0 && (
                    <Secao titulo="Avisos" descricao="Não impedem publicar, mas vale conferir.">
                        <ListaDeAvisos />
                    </Secao>
                )}
            </div>

            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <Secao titulo="Evento" acao={editar("evento", "Evento")}>
                <dl className="-my-3 divide-y divide-secondary">
                    <Linha rotulo="Nome">{r.nome || <NaoInformado />}</Linha>
                    <Linha rotulo="Esporte">{labelDe(ESPORTES, r.esporte) || <NaoInformado />}</Linha>
                    <Linha rotulo="Largada">{r.largada ? formatarDataHora(r.largada) : <NaoInformado />}</Linha>
                    <Linha rotulo="Término">{r.termino ? formatarDataHora(r.termino) : <NaoInformado />}</Linha>
                    <Linha rotulo="Idade mínima">{IDADES_COM_CLASSIFICACAO.find((i) => i.id === (r.idadeMinima || "0"))?.label}</Linha>
                    <Linha rotulo="Local">{local ?? <NaoInformado />}</Linha>
                    {/* Imagem é opcional: só aparece no resumo quando foi enviada (SCE-14). */}
                    {r.imagem && <Linha rotulo="Banner">{r.imagem.nome}</Linha>}
                    {r.percurso && <Linha rotulo="Percurso">{r.percurso.nome}</Linha>}
                    <Linha rotulo="Termo de uso">{termoPorId(r.termoId)?.nome ?? <NaoInformado />}</Linha>
                    {r.descricao && <Linha rotulo="Descrição">{textoPuro(r.descricao).slice(0, 280)}{textoPuro(r.descricao).length > 280 ? "…" : ""}</Linha>}
                </dl>
            </Secao>

            <Secao titulo={t.tituloDaSecao} acao={editar("modalidades", t.tituloDaSecao)}>
                {r.modalidades.length === 0 ? (
                    <p className="text-sm text-tertiary">{t.vazioNivel1}.</p>
                ) : (
                    <dl className="-my-3 divide-y divide-secondary">
                        {r.modalidades.map((m, i) => {
                            const valores = m.categorias.flatMap((c) => c.lotes.map((l) => l.valor)).filter((v): v is number => v != null);
                            return (
                                <Linha key={m.id} rotulo={m.nome || t.nivel1N(i + 1)}>
                                    <span className="flex flex-col gap-0.5">
                                        <span>
                                            {[labelDe(TIPOS_DE_MODALIDADE, m.tipo), m.vagas ? `${m.vagas.toLocaleString("pt-BR")} vagas` : null].filter(Boolean).join(", ")}
                                        </span>
                                        <span>
                                            {m.categorias.length === 0
                                                ? t.semNivel2
                                                : t.listaDeNivel2(m.categorias.length, m.categorias.map((c) => c.nome || "sem nome").join(", "))}
                                        </span>
                                        {valores.length > 0 && (
                                            <span>
                                                Lotes de {formatarReais(Math.min(...valores))} a {formatarReais(Math.max(...valores))}
                                            </span>
                                        )}
                                    </span>
                                </Linha>
                            );
                        })}
                    </dl>
                )}
            </Secao>

            <Secao titulo={TITULO_FORMULARIO} acao={editar("inscricao", TITULO_FORMULARIO)}>
                <dl className="-my-3 divide-y divide-secondary">
                    {r.perguntas.length === 0 ? (
                        <Linha rotulo="Perguntas">Sem perguntas</Linha>
                    ) : (
                        r.perguntas.map((p, i) => {
                            const n = Object.keys(p.vinculos).filter((c) => existentes.has(c)).length;
                            return (
                                <Linha key={p.id} rotulo={`${i + 1}. ${p.titulo || "Pergunta sem título"}`}>
                                    {labelDe(TIPOS_DE_RESPOSTA, p.tipo)}. {p.todas ? t.todasAsDuas : t.resumoDoVinculo(n)}.
                                </Linha>
                            );
                        })
                    )}
                </dl>
            </Secao>
            </div>
        </div>
    );
}

/** Depois de publicar: mensagem clara e o próximo passo, sem confete. */
export function Sucesso() {
    const { rascunho: r } = useFormulario();
    const { t } = useVocabulario();
    const navigate = useNavigate();
    const categorias = r.modalidades.reduce((n, m) => n + m.categorias.length, 0);
    return (
        <div className="flex flex-1 flex-col items-center justify-center py-12">
            <div className="flex max-w-xl flex-col items-center gap-6 text-center">
                <FeaturedIcon icon={CheckCircle} color="success" theme="light" size="xl" />
                <div className="flex flex-col gap-2">
                    <h1 className={TITULO_PAGINA}>Inscrições abertas</h1>
                    <p className="text-md text-tertiary">
                        {t.sucesso(r.nome || "O evento", r.modalidades.length, categorias)}
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-primary">Próximo passo</p>
                    <p className="text-sm text-tertiary">Divulgue o link de inscrição e acompanhe os inscritos no painel do evento.</p>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="lg" onClick={() => navigate(ROTAS.eventos)}>
                        Ir para Seus eventos
                    </Button>
                    <Button
                        color="primary"
                        size="lg"
                        iconLeading={Copy06}
                        onClick={() => {
                            void navigator.clipboard?.writeText(`https://ticketsports.com.br/e/${encodeURIComponent((r.nome || "evento").toLowerCase().replace(/\s+/g, "-"))}`).catch(() => undefined);
                            toast.success("Link de inscrição copiado");
                        }}
                    >
                        Copiar link de inscrição
                    </Button>
                </div>
                <Button color="link-gray" size="sm" onClick={() => navigate(ROTAS.inicio)}>
                    Criar outro evento
                </Button>
            </div>
        </div>
    );
}
