import { useState } from "react";
import { useNavigate } from "react-router";
import { Button as AriaButton } from "react-aria-components";
import { toast } from "sonner";
import { DotsVertical, Image01, LayoutGrid01, List, SearchLg } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase, TextField } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";
import { TITULO_PAGINA } from "../../components/titulo-pagina";
import { comNomes, FerramentasDoPrototipo, ROTAS } from "../components/cabecalho";
import { Vazio } from "../components/campos";
import { ShellAwa } from "../components/shell-awa";
import { FORA_DO_ESCOPO } from "../data/opcoes";
import { temRascunhoEmAndamento, useRascunho } from "../data/rascunho";
import { useVocabulario } from "../data/vocabulario";

/* ------------------------------------------------------------------ */
/*  Seus eventos (SCE-140): entrada do protótipo (v0.2+), fiel ao AWA     */
/*  Busca por nome ou ID, filtro, grade ou lista, cartões com capa,    */
/*  data, status e nome, e "Novo evento", que abre a criação (Do zero  */
/*  ou Copiar de um evento). Eventos de exemplo não abrem: são do AWA  */
/*  de hoje e ficam fora do escopo; o rascunho em andamento abre.      */
/* ------------------------------------------------------------------ */

type Status = "publico" | "privado" | "encerrado" | "rascunho";

interface CartaoDeEvento {
    id: string;
    nome: string;
    data: string;
    status: Status;
}

const EVENTOS: CartaoDeEvento[] = [
    { id: "a1f3", nome: "Corrida Noturna Floripa 2026", data: "2026-11-21", status: "publico" },
    { id: "b7c2", nome: "Meia Maratona de Joinville 2026", data: "2026-12-06", status: "publico" },
    { id: "c9d4", nome: "[Teste] Corrida de Natal Sul Run 2026", data: "2026-12-12", status: "privado" },
    { id: "d2e8", nome: "Trail Serra do Mar 2027", data: "2027-06-20", status: "publico" },
    { id: "e5f1", nome: "Corrida Noturna Floripa 2025", data: "2025-11-15", status: "encerrado" },
];

const STATUS: Record<Status, { label: string; cor: "success" | "gray" | "warning" | "brand" }> = {
    publico: { label: "Público", cor: "success" },
    privado: { label: "Privado", cor: "brand" },
    encerrado: { label: "Encerrado", cor: "gray" },
    rascunho: { label: "Rascunho", cor: "warning" },
};

const FILTROS = [
    { id: "todos", label: "Todos" },
    { id: "publico", label: "Públicos" },
    { id: "privado", label: "Privados" },
    { id: "rascunho", label: "Rascunhos" },
    { id: "encerrado", label: "Encerrados" },
];

/** "Sábado, 21 Nov 2026", como nos cartões do AWA. */
const dataPorExtenso = (iso: string) => {
    const d = new Date(`${iso.slice(0, 10)}T12:00`);
    const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    const semana = maiuscula(new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(d).replace("-feira", ""));
    const mes = maiuscula(new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", ""));
    return `${semana}, ${d.getDate()} ${mes} ${d.getFullYear()}`;
};

export function SeusEventos() {
    const navigate = useNavigate();
    const { variante } = useVocabulario();
    const { rascunho } = useRascunho();
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [visao, setVisao] = useState<"grade" | "lista">("grade");

    // O rascunho em andamento aparece primeiro e abre a criação de onde parou.
    const doRascunho: CartaoDeEvento[] = temRascunhoEmAndamento(rascunho)
        ? [{ id: "rascunho", nome: rascunho.nome.trim() || "Evento sem nome", data: rascunho.largada || new Date().toISOString(), status: "rascunho" }]
        : rascunho.publicado
          ? [{ id: "rascunho", nome: rascunho.nome.trim() || "Evento sem nome", data: rascunho.largada || new Date().toISOString(), status: "publico" }]
          : [];
    const termo = busca.trim().toLowerCase();
    const lista = [...doRascunho, ...EVENTOS].filter(
        (e) => (filtro === "todos" || e.status === filtro) && (!termo || e.nome.toLowerCase().includes(termo) || e.id.includes(termo)),
    );
    const destino = comNomes(ROTAS.a, variante);
    const abrir = (e: CartaoDeEvento) => (e.id === "rascunho" ? navigate(destino) : toast(FORA_DO_ESCOPO));

    return (
        <ShellAwa>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
                <header className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <h1 className={TITULO_PAGINA}>Seus eventos</h1>
                        <Button color="primary" size="md" onClick={() => navigate(comNomes(ROTAS.inicio, variante))}>
                            Novo evento
                        </Button>
                    </div>
                    <FerramentasDoPrototipo />
                    <p className="text-sm text-tertiary">
                        Protótipo v0.15 da criação de evento esportivo. Clique em "Novo evento" para começar; os eventos de exemplo não abrem.
                    </p>
                </header>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-96">
                        <TextField aria-label="Busque por nome ou ID de evento" value={busca} onChange={setBusca}>
                            <InputBase icon={SearchLg} placeholder="Busque por nome ou ID de evento" />
                        </TextField>
                    </div>
                    <div className="w-full sm:w-48">
                        <Select aria-label="Filtrar por status" items={FILTROS} selectedKey={filtro} onSelectionChange={(k) => k != null && setFiltro(String(k))}>
                            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                        </Select>
                    </div>
                    <ButtonGroup
                        size="md"
                        aria-label="Ver como"
                        className="ml-auto"
                        selectedKeys={new Set([visao])}
                        disallowEmptySelection
                        onSelectionChange={(k) => {
                            const v = [...k][0];
                            if (v) setVisao(String(v) as "grade" | "lista");
                        }}
                    >
                        <ButtonGroupItem id="grade" iconLeading={LayoutGrid01} aria-label="Grade" />
                        <ButtonGroupItem id="lista" iconLeading={List} aria-label="Lista" />
                    </ButtonGroup>
                </div>

                {lista.length === 0 ? (
                    <Vazio
                        icone={SearchLg}
                        titulo="Nenhum evento encontrado"
                        descricao="Confira o nome ou o ID, ou limpe os filtros."
                        acao={
                            <Button
                                color="secondary"
                                size="md"
                                onClick={() => {
                                    setBusca("");
                                    setFiltro("todos");
                                }}
                            >
                                Limpar filtros
                            </Button>
                        }
                    />
                ) : visao === "grade" ? (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                        {lista.map((e) => (
                            <li key={e.id} className="relative flex flex-col overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary">
                                <AriaButton onPress={() => abrir(e)} aria-label={`Abrir ${e.nome}`} className="flex cursor-pointer flex-col text-left outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2">
                                    <span className="flex aspect-[4/5] w-full items-center justify-center bg-secondary">
                                        <Image01 className="size-8 text-fg-quaternary" aria-hidden="true" />
                                    </span>
                                    <span className="flex flex-col gap-3 p-4">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="text-sm text-tertiary">{dataPorExtenso(e.data)}</span>
                                            <Badge type="pill-color" color={STATUS[e.status].cor} size="sm">
                                                {STATUS[e.status].label}
                                            </Badge>
                                        </span>
                                        <span className="line-clamp-2 text-md font-bold text-primary uppercase">{e.nome}</span>
                                    </span>
                                </AriaButton>
                                <span className="absolute top-3 right-3">
                                    <ButtonUtility icon={DotsVertical} color="secondary" size="sm" tooltip={FORA_DO_ESCOPO} aria-label={`Ações de ${e.nome}`} onClick={() => toast(FORA_DO_ESCOPO)} />
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="flex flex-col divide-y divide-secondary rounded-2xl bg-primary ring-1 ring-secondary">
                        {lista.map((e) => (
                            <li key={e.id}>
                                <AriaButton
                                    onPress={() => abrir(e)}
                                    className={cx("flex w-full cursor-pointer items-center gap-4 p-4 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2")}
                                >
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                                        <Image01 className="size-5 text-fg-quaternary" aria-hidden="true" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="truncate text-sm font-semibold text-primary uppercase">{e.nome}</span>
                                        <span className="text-sm text-tertiary">{dataPorExtenso(e.data)}</span>
                                    </span>
                                    <Badge type="pill-color" color={STATUS[e.status].cor} size="sm">
                                        {STATUS[e.status].label}
                                    </Badge>
                                </AriaButton>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ShellAwa>
    );
}
