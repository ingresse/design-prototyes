import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Copy06, File06 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { RadioGroupIconSimple } from "@/components/base/radio-groups/radio-group-icon-simple";
import { ComboBox } from "@/components/base/select/combobox";
import { Select } from "@/components/base/select/select";
import { Surgir } from "@/components/foundations/transicao";
import { ShellAwa } from "../components/shell-awa";
import { nomeDaOrganizacao, usePerfil } from "../data/perfil";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { comNomes, FerramentasDoPrototipo, ROTAS } from "../components/cabecalho";
import { Secao } from "../components/campos";
import { buscarEventos, copiarEvento, rotuloDoEvento, type EventoAnterior } from "../data/eventos-anteriores";
import { rascunhoVazio } from "../data/modelos";
import { useVocabulario } from "../data/vocabulario";
import { iniciarRascunho, temRascunhoEmAndamento, useRascunho } from "../data/rascunho";

/* ------------------------------------------------------------------ */
/*  Criar evento esportivo: escolher o início (SCE-01 a SCE-03)        */
/*  Do zero ou copiando um evento do organizador. A cópia traz         */
/*  modalidades, categorias, lotes e perguntas; datas de               */
/*  venda, inscritos e cupons ficam de fora (RN-07).                   */
/* ------------------------------------------------------------------ */

type Inicio = "zero" | "copia";

const OPCOES = [
    { value: "zero", title: "Do zero", secondaryTitle: "", description: "Formulário em branco, para um evento novo.", icon: File06 },
    { value: "copia", title: "Copiar de um evento", secondaryTitle: "", description: "Reaproveita a estrutura de um evento que você já fez.", icon: Copy06 },
];

export function EscolherInicio() {
    const navigate = useNavigate();
    const { rascunho } = useRascunho();
    const { variante } = useVocabulario();
    const emAndamento = temRascunhoEmAndamento(rascunho);
    const [inicio, setInicio] = useState<Inicio>("zero");
    const [evento, setEvento] = useState<EventoAnterior | null>(null);
    const [erro, setErro] = useState<string>();

    const continuar = () => {
        if (inicio === "copia" && !evento) {
            setErro("Escolha o evento que você quer copiar");
            toast.error("Escolha o evento para copiar");
            document.getElementById("campo-evento-copiado")?.querySelector("input")?.focus();
            return;
        }
        iniciarRascunho(inicio === "copia" && evento ? copiarEvento(evento.id) : rascunhoVazio());
        navigate(comNomes(ROTAS.a, variante));
    };

    return (
        <ShellAwa>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-8">
                <header className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <Button color="tertiary" size="md" iconLeading={ArrowLeft} className="-ml-3" onClick={() => navigate(ROTAS.eventos)}>
                            Seus eventos
                        </Button>
                        <FerramentasDoPrototipo />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className={TITULO_PAGINA}>Criar evento</h1>
                        <p className="max-w-[60ch] text-md text-tertiary">Comece do zero ou aproveite um evento que você já fez.</p>
                    </div>
                </header>

                {/* v0.4 (SCE-158): largura toda; as duas opções lado a lado e a busca do evento embaixo de "Copiar de um evento". */}
                <div className="flex w-full flex-col gap-6">
                    {/* Volta ao rascunho salvo (SCE-04). */}
                    {emAndamento && (
                        <Secao
                            titulo="Continuar de onde parou"
                            descricao={`${rascunho.nome.trim() || "Evento sem nome"}${rascunho.salvoEm ? `, salvo às ${rascunho.salvoEm}` : ""}.`}
                            acao={
                                <Button color="secondary" size="sm" onClick={() => navigate(comNomes(ROTAS.a, variante))}>
                                    Continuar rascunho
                                </Button>
                            }
                        />
                    )}

                    <Secao titulo="Como você quer começar?">
                        <RadioGroupIconSimple
                            aria-label="Como você quer começar"
                            size="md"
                            items={OPCOES}
                            value={inicio}
                            onChange={(v) => {
                                setInicio(v as Inicio);
                                setErro(undefined);
                            }}
                            className="grid gap-3 md:grid-cols-2"
                        />
                        <Surgir visivel={inicio === "copia"}>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="md:col-start-2">
                                    <BuscaDeEvento
                                        evento={evento}
                                        erro={erro}
                                        onEscolher={(e) => {
                                            setEvento(e);
                                            setErro(undefined);
                                        }}
                                    />
                                </div>
                            </div>
                        </Surgir>
                    </Secao>
                </div>

                <footer className="sticky bottom-0 z-20 mt-auto border-t border-secondary bg-primary_alt">
                    <div className="flex flex-wrap items-center justify-end gap-3 py-3">
                        <Button color="secondary" size="md" onClick={() => navigate(ROTAS.eventos)}>
                            Cancelar
                        </Button>
                        <Button color="primary" size="md" onClick={continuar}>
                            {inicio === "copia" ? "Copiar e continuar" : "Continuar"}
                        </Button>
                    </div>
                </footer>
            </div>
        </ShellAwa>
    );
}

/** Busca nos eventos do organizador (ComboBox do DS), com "Buscando…" e "Nenhum evento encontrado" no campo (UI-FRM-004). */
function BuscaDeEvento({ evento, erro, onEscolher }: { evento: EventoAnterior | null; erro?: string; onEscolher: (e: EventoAnterior | null) => void }) {
    const { t } = useVocabulario();
    const [texto, setTexto] = useState(evento ? rotuloDoEvento(evento) : "");
    const [resultados, setResultados] = useState<EventoAnterior[]>([]);
    const [buscando, setBuscando] = useState(true);
    const escolhido = !!evento && texto === rotuloDoEvento(evento);
    // RN-09: o organizador só busca nos eventos da própria organização; o admin, em todas.
    const perfil = usePerfil();

    useEffect(() => {
        if (escolhido) return;
        let ativo = true;
        setBuscando(true);
        const t = setTimeout(() => {
            buscarEventos(texto, perfil).then((r) => {
                if (!ativo) return;
                setResultados(r);
                setBuscando(false);
            });
        }, 200);
        return () => {
            ativo = false;
            clearTimeout(t);
        };
    }, [texto, perfil]);

    const vazio = !escolhido && !buscando && resultados.length === 0;
    const itens = (escolhido && evento ? [evento] : resultados).map((e) => ({
        id: e.id,
        label: e.nome,
        supportingText: [perfil === "admin" ? nomeDaOrganizacao(e.organizacaoId) : null, new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(e.largada))]
            .filter(Boolean)
            .join(", "),
    }));

    return (
        <div id="campo-evento-copiado" className="pt-2">
            <ComboBox
                label="Evento para copiar"
                isRequired
                placeholder="Busque pelo nome do evento"
                shortcut={false}
                allowsEmptyCollection
                menuTrigger="focus"
                defaultFilter={() => true}
                inputValue={texto}
                onInputChange={(v) => {
                    if (evento && (v === evento.nome || v === rotuloDoEvento(evento))) return setTexto(rotuloDoEvento(evento));
                    setTexto(v);
                    if (evento) onEscolher(null);
                }}
                selectedKey={evento?.id ?? null}
                onSelectionChange={(k) => {
                    if (k == null) return;
                    const e = resultados.find((r) => r.id === k) ?? (evento?.id === k ? evento : null);
                    if (!e) return;
                    onEscolher(e);
                    setTexto(rotuloDoEvento(e));
                }}
                items={itens}
                status={
                    buscando && !escolhido ? (
                        <>
                            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-secondary border-t-fg-brand-primary motion-reduce:animate-none" />
                            Buscando…
                        </>
                    ) : vazio ? (
                        "Nenhum evento encontrado"
                    ) : undefined
                }
                isInvalid={!!erro}
                hint={erro ?? t.oQueACopiaTraz}
            >
                {(item) => (
                    <Select.Item id={item.id} supportingText={item.supportingText}>
                        {item.label}
                    </Select.Item>
                )}
            </ComboBox>
        </div>
    );
}
