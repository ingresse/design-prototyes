import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CheckCircle, ChevronDown, Copy06, Edit01, ShoppingBag01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { formatarDataHora, formatarReais } from "../data/campos";
import { textoDoLocal } from "../data/locais";
import { ESPORTES, labelDe, MOEDA_PADRAO, MOEDAS, TIPOS_DE_MODALIDADE, TIPOS_DE_RESPOSTA, TITULO_FORMULARIO, TITULO_VENDAS } from "../data/opcoes";
import { chavesDe, contarNoAlvo, cuponsDe, vinculadosAoAlvo } from "../data/marketing";
import { aberturasComGruposSemModulo, aberturasDe, categoriasDaConfiguracao, destacarNoMenu, listaDeCanais, nomeDoPublico, periodoCurto } from "../data/vendas";
import { idsDasCategorias } from "../data/perguntas";
import { regrasDe } from "../data/modelos";
import { useVocabulario } from "../data/vocabulario";
import { temCopiaNoNome } from "../data/validacao";
import { textoPuro } from "./campo-descricao";
import { termoPorId } from "../data/termos";
import { IDADES_COM_CLASSIFICACAO } from "../../eventos/components/classificacao-indicativa";
import type { SecaoId } from "../data/tipos";
import { Secao } from "./campos";
import { useFormulario } from "./contexto";
import { quemPodeSeInscrever } from "./categoria-detalhe";
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
    const regras = regrasDe(r);
    const comLimite = r.modalidades.flatMap((m) => m.categorias.filter((c) => c.limiteComprador != null).map((c) => `${m.nome.trim() || "Sem nome"}, ${c.nome.trim() || "sem nome"}: até ${c.limiteComprador} por comprador`));

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
                    /* v0.17 (SCE-226): cartão de avisos em destaque, com fundo e contorno de aviso e a contagem no título. */
                    <Secao
                        className="bg-warning-primary ring-2 ring-fg-warning-secondary"
                        titulo={
                            <span className="flex items-center gap-2">
                                <AlertTriangle className="size-5 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                                {avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`}
                            </span>
                        }
                        descricao="Não impedem publicar, mas vale conferir antes. Toque em cada um para ir até o lugar."
                    >
                        <ListaDeAvisos />
                    </Secao>
                )}
                {/* v0.61 (SCE-328): o que a pessoa escolheu depende de algo desligado. Aviso: pode fazer depois. */}
                <NecessarioParaOEscolhido />
                {/* v0.61 (SCE-330): o básico está pronto; o resto é opcional, pelo menu do evento. */}
                <QuerFazerMais />
            </div>

            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <Secao titulo="Evento" acao={editar("evento", "Evento")}>
                <dl className="-my-3 divide-y divide-secondary">
                    <Linha rotulo="Nome">{r.nome || <NaoInformado />}</Linha>
                    <Linha rotulo="Esporte">{labelDe(ESPORTES, r.esporte) || <NaoInformado />}</Linha>
                    <Linha rotulo="Largada">{r.largada ? formatarDataHora(r.largada) : <NaoInformado />}</Linha>
                    <Linha rotulo="Término">{r.termino ? formatarDataHora(r.termino) : <NaoInformado />}</Linha>
                    <Linha rotulo="Idade mínima">{IDADES_COM_CLASSIFICACAO.find((i) => i.id === (r.idadeMinima || "0"))?.label}</Linha>
                    <Linha rotulo="Moeda">{labelDe(MOEDAS, r.moeda || MOEDA_PADRAO)}</Linha>
                    <Linha rotulo="Local">{local ?? <NaoInformado />}</Linha>
                    {/* Imagem é opcional: só aparece no resumo quando foi enviada (SCE-14). */}
                    {r.imagem && <Linha rotulo="Banner">{r.imagem.nome}</Linha>}
                    {r.percurso && <Linha rotulo="Percurso">{r.percurso.nome}</Linha>}
                    <Linha rotulo="E-mail de confirmação">
                        {[
                            "Com QR Code",
                            r.emailInfo?.trim() ? "com informações adicionais" : null,
                            r.emailBanner ? `com banner (${r.emailBanner.nome})` : null,
                        ]
                            .filter(Boolean)
                            .join(", ")}
                    </Linha>
                    <Linha rotulo="Termo de uso">{termoPorId(r.termoId)?.nome ?? <NaoInformado />}</Linha>
                    {/* v0.19 (SCE-240): regras da inscrição e as categorias com limite próprio. */}
                    <Linha rotulo="Regras da inscrição">
                        <span className="flex flex-col gap-0.5">
                            <span>{regras.variasPorCpf ? "Mais de uma inscrição para o mesmo atleta" : "Uma inscrição por atleta"}</span>
                            <span>{regras.atribuicao === "qualquer" ? "Permite compra para terceiros" : "Sem compra para terceiros"}</span>
                            <span>{regras.limitePorComprador ? `Limite de compra: ${regras.limitePorComprador} por comprador` : "Limite de compra: não informado"}</span>
                            <span>{regras.trocaDeTitularidade ? `Troca de titularidade de ${regras.trocaInicio ? formatarDataHora(regras.trocaInicio) : "início não informado"} a ${regras.trocaFim ? formatarDataHora(regras.trocaFim) : "fim não informado"}` : "Sem troca de titularidade"}</span>
                            {/* v0.29 (Bruna): uma categoria por linha, com o que é o número. */}
                            {comLimite.length > 0 && (
                                <span className="mt-1 flex flex-col gap-0.5">
                                    <span className="font-medium text-secondary">Categorias com limite de compra menor que o do evento</span>
                                    {comLimite.map((x) => (
                                        <span key={x}>{x}</span>
                                    ))}
                                </span>
                            )}
                        </span>
                    </Linha>
                    {r.descricao && <Linha rotulo="Descrição">{textoPuro(r.descricao).slice(0, 280)}{textoPuro(r.descricao).length > 280 ? "…" : ""}</Linha>}
                </dl>
            </Secao>

            <Secao titulo={t.tituloDaSecao} acao={editar("modalidades", t.tituloDaSecao)}>
                {r.modalidades.length === 0 ? (
                    <p className="text-sm text-tertiary">{t.vazioNivel1}.</p>
                ) : (
                    // v0.29 (Bruna): revisão completa, sem esconder configuração. Cada modalidade abre com as categorias,
                    // quem pode se inscrever, limite e os lotes (preço, quantidade e data limite).
                    <div className="-my-3 divide-y divide-secondary">
                        {r.modalidades.map((m, i) => (
                            <Expansivel
                                key={m.id}
                                titulo={m.nome || t.nivel1N(i + 1)}
                                resumo={[
                                    labelDe(TIPOS_DE_MODALIDADE, m.tipo),
                                    m.vagas ? `${m.vagas.toLocaleString("pt-BR")} vagas` : null,
                                    m.categorias.length === 1 ? `1 ${t.nivel2.um}` : `${m.categorias.length} ${t.nivel2.muitos}`,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            >
                                {m.descricao?.trim() && <p className="text-sm text-tertiary">{m.descricao}</p>}
                                {m.categorias.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t.semNivel2}</p>
                                ) : (
                                    m.categorias.map((c) => (
                                        <div key={c.id} className="flex flex-col gap-2 border-t border-secondary pt-3 first:border-t-0 first:pt-0">
                                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                                                {c.nome || "Sem nome"}
                                                {temCopiaNoNome(c.nome) && <SeloCopia />}
                                            </p>
                                            <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                                                <dt className="font-medium text-secondary">Quem pode se inscrever</dt>
                                                <dd className="text-tertiary">{maiuscula(quemPodeSeInscrever(c, r.largada, Number(r.idadeMinima || 0)))}</dd>
                                                <dt className="font-medium text-secondary">Limite de compra</dt>
                                                <dd className="text-tertiary">{c.limiteComprador != null ? `Até ${c.limiteComprador} por comprador` : `O do evento (${regras.limitePorComprador ?? "não informado"} por comprador)`}</dd>
                                                <dt className="font-medium text-secondary">Vagas</dt>
                                                <dd className="text-tertiary">{vagasTexto(c.lotes)}</dd>
                                                <dt className="font-medium text-secondary">Lotes</dt>
                                                <dd className="text-tertiary">
                                                    {c.lotes.length === 0 ? (
                                                        "Nenhum lote"
                                                    ) : (
                                                        <ul className="flex flex-col gap-0.5">
                                                            {c.lotes.map((l, k) => (
                                                                <li key={l.id}>
                                                                    {[
                                                                        l.nome || `${k + 1}º lote`,
                                                                        l.valor != null ? formatarReais(l.valor) : "preço não informado",
                                                                        l.vagas != null ? `${l.vagas.toLocaleString("pt-BR")} vagas` : "quantidade não informada",
                                                                        l.dataLimite ? `até ${formatarDataHora(l.dataLimite)}` : "até esgotar",
                                                                    ].join(", ")}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </dd>
                                                {/* v0.37: cupons e chaves ligados aos lotes da categoria. */}
                                                {contarNoAlvo(chavesDe(r), { categoria: c }) > 0 && (
                                                    <>
                                                        <dt className="font-medium text-secondary">Chaves de acesso</dt>
                                                        <dd className="text-tertiary">{vinculadosAoAlvo(chavesDe(r), { categoria: c }).map((x) => x.item.codigo).join(", ")} (oculta para o público)</dd>
                                                    </>
                                                )}
                                                {contarNoAlvo(cuponsDe(r), { categoria: c }) > 0 && (
                                                    <>
                                                        <dt className="font-medium text-secondary">Cupons de desconto</dt>
                                                        <dd className="text-tertiary">{vinculadosAoAlvo(cuponsDe(r), { categoria: c }).map((x) => x.item.codigo).join(", ")}</dd>
                                                    </>
                                                )}
                                            </dl>
                                        </div>
                                    ))
                                )}
                            </Expansivel>
                        ))}
                    </div>
                )}
            </Secao>

            <Secao titulo={TITULO_FORMULARIO} acao={editar("inscricao", TITULO_FORMULARIO)}>
                <dl className="-my-3 divide-y divide-secondary">
                    {r.perguntas.length === 0 ? (
                        <Linha rotulo="Perguntas">
                            {/* v0.17 (SCE-227): formulário vazio em destaque, como aviso (não impede publicar). */}
                            <span className="flex items-start gap-2 font-medium text-warning-primary">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" aria-hidden="true" />
                                Sem perguntas. O atleta se inscreve sem responder nada. Isso não impede publicar.
                            </span>
                        </Linha>
                    ) : (
                        // v0.29 (Bruna): cada pergunta abre com as opções e a quantidade de cada uma, e onde ela aparece.
                        r.perguntas.map((p, i) => {
                            const onde = r.modalidades.flatMap((m) =>
                                m.categorias.filter((c) => existentes.has(c.id) && p.vinculos[c.id]).map((c) => ({ id: c.id, texto: `${m.nome || "Sem nome"}, ${c.nome || "sem nome"}`, presenca: p.vinculos[c.id] })),
                            );
                            return (
                                <Expansivel
                                    key={p.id}
                                    titulo={`${i + 1}. ${p.titulo || "Pergunta sem título"}`}
                                    resumo={`${labelDe(TIPOS_DE_RESPOSTA, p.tipo)}. ${p.todas ? t.todasAsDuas : t.resumoDoVinculo(onde.length)}.`}
                                >
                                    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                                        {p.opcoes.length > 0 && (
                                            <>
                                                <dt className="font-medium text-secondary">Opções</dt>
                                                <dd className="text-tertiary">
                                                    <ul className="flex flex-col gap-0.5">
                                                        {p.opcoes.map((o, k) => (
                                                            <li key={o.id}>
                                                                {o.nome || `Opção ${k + 1}`}: {o.aDefinir ? "quantidade a definir" : o.quantidade != null ? `${o.quantidade.toLocaleString("pt-BR")} disponíveis` : "sem limite"}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </dd>
                                            </>
                                        )}
                                        <dt className="font-medium text-secondary">Aparece em</dt>
                                        <dd className="text-tertiary">
                                            {onde.length === 0 ? (
                                                "Nenhuma categoria"
                                            ) : (
                                                <ul className="flex flex-col gap-0.5">
                                                    {onde.map((x) => (
                                                        <li key={x.id}>
                                                            {x.texto}: {x.presenca === "obrigatoria" ? "obrigatória" : "opcional"}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </dd>
                                    </dl>
                                </Expansivel>
                            );
                        })
                    )}
                </dl>
            </Secao>

            {/* v0.51 (SCE-310): cada abertura com o período e uma linha por configuração. */}
            <Secao titulo={TITULO_VENDAS} acao={editar("vendas", TITULO_VENDAS)}>
                {aberturasDe(r).length === 0 ? (
                    <span className="flex items-start gap-2 text-sm font-medium text-error-primary">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        Nenhuma abertura de vendas. Sem ela, as inscrições não abrem.
                    </span>
                ) : (
                    <dl className="-my-3 divide-y divide-secondary">
                        {aberturasDe(r).map((a) => (
                            <Linha key={a.id} rotulo={a.nome.trim() || "Abertura sem nome"}>
                                <span className="flex flex-col gap-1">
                                    {temCopiaNoNome(a.nome) && (
                                        <span>
                                            <SeloCopia />
                                        </span>
                                    )}
                                    <span className="font-medium text-secondary">{periodoCurto(a)}</span>
                                    {a.configuracoes.map((c) => {
                                        const ids = new Set(categoriasDaConfiguracao(c, r.modalidades));
                                        const cats = r.modalidades.flatMap((m) => m.categorias.filter((x) => ids.has(x.id)).map((x) => `${m.nome.trim() || "Sem nome"} › ${x.nome.trim() || "sem nome"}`));
                                        return (
                                            <span key={c.id}>
                                                {nomeDoPublico(c.publico) || "Público a definir"}, {c.canais.length ? `por ${listaDeCanais(c.canais)}` : "sem canal"}: {cats.length ? cats.join(", ") : "nenhuma categoria"}
                                            </span>
                                        );
                                    })}
                                </span>
                            </Linha>
                        ))}
                    </dl>
                )}
            </Secao>

            {/* v0.29 (Bruna): o pagamento do evento à vista antes de publicar. Vem do contrato da organização no
                sistema financeiro; aqui só se lê. Valores de exemplo do protótipo. */}
            <Secao titulo="Pagamento" descricao="Definido no contrato da sua organização. Para mudar, fale com seu atendimento na Ticket Sports.">
                <dl className="-my-3 divide-y divide-secondary">
                    <Linha rotulo="Formas de pagamento">Pix e cartão de crédito</Linha>
                    <Linha rotulo="Parcelamento">Até 10 vezes no cartão</Linha>
                    <Linha rotulo="Boleto">Não aceito</Linha>
                    <Linha rotulo="Desconto por cartão (BIN)">Nenhum</Linha>
                </dl>
            </Secao>
            </div>
        </div>
    );
}

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const vagasTexto = (lotes: { vagas: number | null }[]) => {
    const total = lotes.reduce((n, l) => n + (l.vagas ?? 0), 0);
    return total > 0 ? `${total.toLocaleString("pt-BR")}, a soma dos lotes` : "Não informadas";
};

function NecessarioParaOEscolhido() {
    const { rascunho: r } = useFormulario();
    const aberturas = aberturasComGruposSemModulo(r);
    if (!aberturas.length) return null;
    const nomes = aberturas.map((a) => a.nome.trim() || "Abertura sem nome");
    return (
        // v0.69 (critique UI-VIS-019): um nível de contêiner; o aviso fica direto no cartão da seção.
        // Orienta para um evento sem falhas; não bloqueia: o módulo fica em outra parte do sistema e a abertura pode ser editada.
        <Secao titulo="Necessário para o que você escolheu" descricao="Não impede publicar. Você pode resolver agora ou depois.">
            <div className="flex flex-col items-start gap-3">
                <p className="flex items-start gap-2 text-sm text-secondary">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-secondary" aria-hidden="true" />
                    <span>
                        <strong className="font-semibold text-primary">Ative Grupos e assessorias para vender por Vendas em grupo.</strong> {nomes.join(", ")} {nomes.length === 1 ? "usa" : "usam"} esse canal. Até ativar, as vendas em grupo não acontecem. Se preferir, edite {nomes.length === 1 ? "a abertura" : "as aberturas"} e tire o canal.
                    </span>
                </p>
                <Button size="sm" color="secondary" iconTrailing={ArrowRight} onClick={() => destacarNoMenu("grupos")}>
                    Ativar Grupos e assessorias
                </Button>
            </div>
        </Secao>
    );
}

/** Opcionais depois do básico (SCE-330). Por enquanto só Produtos adicionais. */
function QuerFazerMais({ depoisDePublicar }: { depoisDePublicar?: boolean }) {
    const { rascunho: r } = useFormulario();
    const opcionais = [
        { id: "produtos" as const, icone: ShoppingBag01, titulo: "Produtos adicionais", texto: "Venda camiseta extra, medalha ou fotos junto com a inscrição.", feito: !!r.modulos?.produtos },
    ];
    return (
        <Secao
            titulo={depoisDePublicar ? "Quer fazer mais?" : "Quer fazer mais? (opcional)"}
            descricao={depoisDePublicar ? "Configure quando quiser pelo menu do evento." : "Seu evento já pode ser publicado. Se quiser, configure agora ou depois pelo menu do evento."}
        >
            {/* v0.69 (critique UI-VIS-019): linhas de lista com divisória, sem caixa dentro do cartão. */}
            <ul className="flex flex-col divide-y divide-secondary">
                {opcionais.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <FeaturedIcon icon={o.icone} color="gray" theme="modern" size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-semibold text-primary">{o.titulo}</span>
                            <span className="text-sm text-tertiary">{o.feito ? "Ativado." : o.texto}</span>
                        </span>
                        <Button size="sm" color="link-color" iconTrailing={ArrowRight} onClick={() => destacarNoMenu(o.id)}>
                            {o.feito ? "Ver" : "Configurar"}
                        </Button>
                    </li>
                ))}
            </ul>
        </Secao>
    );
}

const SeloCopia = () => (
    <BadgeWithIcon type="pill-color" color="warning" size="sm" iconLeading={AlertTriangle}>
        Nome com "cópia"
    </BadgeWithIcon>
);

/** Linha da revisão que abre e fecha (seta), com resumo de uma linha. */
function Expansivel({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
    // v0.55 (SCE-315): sinaliza "cópia" no nome, à vista sem abrir.
    const copia = temCopiaNoNome(titulo);
    const [aberto, setAberto] = useState(false);
    return (
        <div className="py-3">
            <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setAberto((v) => !v)}
                className="flex w-full cursor-pointer items-start gap-3 rounded-md text-left outline-focus-ring focus-visible:outline-2"
            >
                <ChevronDown className={cx("mt-0.5 size-5 shrink-0 text-fg-quaternary transition-transform duration-150 motion-reduce:transition-none", aberto && "rotate-180")} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-secondary">{titulo}</span>
                        {copia && <SeloCopia />}
                    </span>
                    <span className="text-sm text-tertiary">{resumo}</span>
                </span>
            </button>
            {aberto && <div className="mt-3 flex flex-col gap-3 pl-8 motion-safe:animate-in motion-safe:fade-in">{children}</div>}
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
                {/* v0.61 (SCE-330): o mesmo convite opcional depois de publicar. */}
                <div className="w-full text-left">
                    <QuerFazerMais depoisDePublicar />
                </div>
            </div>
        </div>
    );
}
