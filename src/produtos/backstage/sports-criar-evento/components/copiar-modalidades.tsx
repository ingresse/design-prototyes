import { useState } from "react";
import { Check, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { EVENTOS_ANTERIORES, modalidadesDoEvento, perguntasDoEvento, rotuloDoEvento } from "../data/eventos-anteriores";
import { duplicarModalidade, marcarLotesParaRevisar, nomeDeCopia } from "../data/modelos";
import { nomeDaOrganizacao, podeVer, usePerfil } from "../data/perfil";
import { herdarPerguntas, trazerPerguntas } from "../data/perguntas";
import type { Modalidade, Pergunta } from "../data/tipos";
import { useVocabulario } from "../data/vocabulario";
import { ErroDaLista } from "./campos";
import { useFormulario } from "./contexto";
import { ArvoreDeModalidades, useSelecaoDeModalidades } from "./arvore-de-modalidades";
import { entrarNaRevisao } from "./copia-guiada";

/* ------------------------------------------------------------------ */
/*  Copiar de outro evento: passo 1 do fluxo de cópia (v0.8, SCE-192)  */
/*  Na página, não mais em modal (era SCE-159/SCE-171). Escolhe o      */
/*  evento (organizador só vê os da própria organização; admin vê      */
/*  todos, RN-09), marca modalidades e categorias (tudo marcado) e o   */
/*  que levar ("Categorias e formulário de inscrição" ou "Somente as   */
/*  categorias"). Vêm regras, vagas e lotes (a revisar); não vêm       */
/*  inscritos, cupons nem datas de venda (RN-07). "Confirmar e         */
/*  continuar" acrescenta as cópias e abre a revisão (passo 2);        */
/*  "Cancelar" volta para a lista sem mudar nada.                      */
/* ------------------------------------------------------------------ */

const dataCurta = (e: (typeof EVENTOS_ANTERIORES)[number]) => rotuloDoEvento(e).split(" – ")[1];

// Modalidades de cada evento como entram na cópia, geradas uma vez: a seleção usa os ids delas.
// Ao copiar, duplicarModalidade cria ids novos, então copiar duas vezes do mesmo evento não repete id.
// As perguntas do evento de origem também ficam no cache, ligadas aos ids dessas categorias.
const cache = new Map<string, { modalidades: Modalidade[]; perguntas: Pergunta[] }>();
const origemDe = (id: string | null) => {
    const e = EVENTOS_ANTERIORES.find((x) => x.id === id);
    if (!e) return { modalidades: [], perguntas: [] };
    if (!cache.has(e.id)) {
        const modalidades = modalidadesDoEvento(e);
        cache.set(e.id, { modalidades, perguntas: perguntasDoEvento(e, modalidades) });
    }
    return cache.get(e.id)!;
};

export function EscolherDeOutroEvento({ onCancelar }: { onCancelar: () => void }) {
    const { atualizar } = useFormulario();
    const { t } = useVocabulario();
    const perfil = usePerfil();
    const [texto, setTexto] = useState("");
    const [eventoId, setEventoId] = useState<string | null>(null);
    const [erro, setErro] = useState<string>();
    const [levar, setLevar] = useState<"categorias" | "formulario">("formulario");
    const selecao = useSelecaoDeModalidades(() => setErro(undefined));

    // RN-09: o organizador vê só os eventos da própria organização; o administrador, os de todas.
    const visiveis = EVENTOS_ANTERIORES.filter((e) => podeVer(perfil, e.organizacaoId));
    const filtrados = visiveis.filter((e) => !texto.trim() || rotuloDoEvento(e).toLowerCase().includes(texto.trim().toLowerCase()) || eventoId === e.id);
    const evento = EVENTOS_ANTERIORES.find((e) => e.id === eventoId) ?? null;
    const fontes = origemDe(eventoId).modalidades;

    const escolher = (id: string | null) => {
        setEventoId(id);
        setErro(undefined);
        // Tudo vem marcado; a pessoa desmarca o que não quer.
        selecao.marcarTudo(origemDe(id).modalidades, true);
    };

    const confirmar = () => {
        if (!evento) {
            setErro("Escolha o evento de onde copiar");
            document.getElementById("copiar-mod-evento")?.querySelector("input")?.focus();
            return;
        }
        const escolhidas = fontes.filter((m) => selecao.modMarcadas.has(m.id));
        if (escolhidas.length === 0) return setErro(t.copiarNivel1NadaMarcado);
        const deOutroEvento = origemDe(evento.id).perguntas;
        atualizar((a) => {
            const nomes = a.modalidades.map((m) => m.nome);
            const dePara: Record<string, string> = {};
            const novas = marcarLotesParaRevisar(
                escolhidas.map((m) => {
                    // Nome repetido no evento ganha "(cópia)", como em duplicar.
                    const repetido = nomes.some((n) => n.trim().toLowerCase() === m.nome.trim().toLowerCase());
                    const nome = repetido ? nomeDeCopia(m.nome, nomes) : m.nome;
                    nomes.push(nome);
                    const origem = m.categorias.filter((c) => selecao.catMarcadas.has(c.id));
                    const nova = duplicarModalidade({ ...m, categorias: origem }, nome);
                    origem.forEach((c, i) => (dePara[c.id] = nova.categorias[i].id));
                    return nova;
                }),
            );
            const idsNovos = novas.flatMap((m) => m.categorias.map((c) => c.id));
            // As perguntas deste evento marcadas para todas valem também para as novas (SCE-105).
            const herdadas = herdarPerguntas(a.perguntas, idsNovos);
            const depois = { ...a, modalidades: [...a.modalidades, ...novas], perguntas: levar === "formulario" ? trazerPerguntas(herdadas, deOutroEvento, dePara) : herdadas };
            return entrarNaRevisao(depois, { modalidades: novas.map((m) => m.id) }, { modalidades: a.modalidades, perguntas: a.perguntas });
        });
    };

    return (
        <>
            <p className="max-w-[65ch] text-sm text-tertiary">
                {t.copiarNivel1EscolherDescricao} {perfil === "admin" ? "Como administrador, você vê os eventos de todas as organizações." : "Só os eventos da sua organização."}
            </p>
            <div id="copiar-mod-evento" className="max-w-xl">
                <ComboBox
                    label="Evento de origem"
                    isRequired
                    placeholder="Busque pelo nome do evento"
                    shortcut={false}
                    menuTrigger="focus"
                    defaultFilter={() => true}
                    allowsEmptyCollection
                    inputValue={texto}
                    onInputChange={(v) => {
                        setTexto(v);
                        if (eventoId) escolher(null);
                    }}
                    selectedKey={eventoId}
                    onSelectionChange={(k) => {
                        if (k == null) return;
                        const e = visiveis.find((x) => x.id === k);
                        if (!e) return;
                        escolher(e.id);
                        setTexto(e.nome);
                    }}
                    items={filtrados.map((e) => ({
                        id: e.id,
                        label: e.nome,
                        supportingText: perfil === "admin" ? `${nomeDaOrganizacao(e.organizacaoId)}, ${dataCurta(e)}` : dataCurta(e),
                    }))}
                    status={filtrados.length === 0 ? "Nenhum evento encontrado" : undefined}
                    isInvalid={!evento && !!erro}
                    hint={!evento ? erro : undefined}
                >
                    {(item) => (
                        <Select.Item id={item.id} supportingText={item.supportingText}>
                            {item.label}
                        </Select.Item>
                    )}
                </ComboBox>
            </div>

            {evento && (
                <>
                    <ArvoreDeModalidades fontes={fontes} selecao={selecao} rotulo={t.copiarNivel1Escolha} />
                    <div className="grid gap-6 @3xl:grid-cols-2">
                        <div className="flex flex-col gap-3">
                            <span id="copiar-mod-levar" className="text-sm font-medium text-secondary">
                                {t.oQueLevar}
                            </span>
                            <RadioGroup aria-labelledby="copiar-mod-levar" value={levar} onChange={(v) => setLevar(v as "categorias" | "formulario")}>
                                <RadioButton value="formulario" label={t.nivel2EFormulario} hint={t.nivel2EFormularioDicaCopiar} />
                                <RadioButton value="categorias" label={t.somenteNivel2} hint={t.somenteNivel2Dica} />
                            </RadioGroup>
                        </div>
                        {/* O que vem e o que não vem (RN-07) */}
                        <div className="grid content-start gap-3 rounded-xl bg-secondary p-4 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 font-semibold text-secondary">
                                    <Check className="size-4 text-fg-success-primary" aria-hidden="true" />
                                    Copiamos
                                </span>
                                <p className="text-tertiary">{t.copiarNivel1Traz}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 font-semibold text-secondary">
                                    <XClose className="size-4 text-fg-quaternary" aria-hidden="true" />
                                    Não copiamos
                                </span>
                                <p className="text-tertiary">{t.copiarNivel1NaoTraz}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="flex flex-col gap-3 border-t border-secondary pt-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="sm:mr-auto">{evento && <ErroDaLista erro={erro} />}</div>
                <Button size="md" color="secondary" onClick={onCancelar}>
                    Cancelar
                </Button>
                <Button size="md" color="primary" onClick={confirmar}>
                    Confirmar e continuar
                </Button>
            </div>
        </>
    );
}
