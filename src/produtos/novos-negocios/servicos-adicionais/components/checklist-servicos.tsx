import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { CheckCircle, ChevronRight } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import { EVENTO, ROLE, SERVICOS, brl, type ServicoRole } from "../data/servicos";
import { lerContratados, type Contratado } from "../utils/contratados";
import { SeloServico } from "./selo-servico";

const BASE = "/novos-negocios/servicos-adicionais";

/** Palavra do lugar do evento nos textos: "caminho pro estádio" soa melhor que "pro jogo". */
const PALAVRA_CATEGORIA = {
    festival: "festival",
    show: "show",
    futebol: "estádio",
} as const;

/** Tipo do evento no título ("Seu jogo começa antes"): no futebol é "jogo", não "estádio". */
const TIPO_EVENTO = { festival: "festival", show: "show", futebol: "jogo" } as const;

/** Percentual de desconto da oferta ("5%"), para acompanhar a condição comercial configurada. */
const percentual = (id: ServicoRole["id"]) => `${Math.round(SERVICOS[id].desconto * 100)}%`;

/** Troca {evento}, {noEvento}, {tipo}, {categoria}, {valor}, {pacote} e {desconto} nos textos do Prepare seu rolê. */
export const preencher = (texto: string, contratado?: { id: ServicoRole["id"]; valor?: number }) => {
    const pacote = contratado?.valor != null ? SERVICOS[contratado.id].pacotes?.[contratado.valor] : undefined;
    return texto
        .replace("{evento}", EVENTO.nome)
        .replace("{noEvento}", EVENTO.noEvento)
        .replace("{categoria}", PALAVRA_CATEGORIA[EVENTO.categoria])
        .replace("{tipo}", TIPO_EVENTO[EVENTO.categoria])
        .replace(/\{desconto\}/g, contratado ? percentual(contratado.id) : "")
        .replace("{valor}", contratado?.valor != null ? brl(contratado.valor) : "")
        .replace("{pacote}", pacote ?? "");
};

/**
 * Prepare seu rolê: os serviços do evento agrupados pelo momento do dia, sem numeração nem linha
 * do tempo, para não parecer tarefa. Cada serviço é uma linha inteira clicável que abre a oferta:
 * o título puxa pelo benefício, em tom de conversa, e o selo e o apoio identificam o serviço. O que
 * já foi contratado nesta sessão vira status (selo com check, sem repetir a venda) e abre de novo
 * a confirmação.
 */
export function ChecklistServicos() {
    const contratados = lerContratados();
    return (
        <div className="flex flex-col gap-8">
            {ROLE.momentos.map((momento, i) => (
                // Entrada discreta, um momento depois do outro (parada com "reduzir movimento", ver pages/checklist.tsx)
                <motion.section
                    key={momento.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.35,
                        delay: 0.15 + i * 0.08,
                        ease: "easeOut",
                    }}
                    aria-labelledby={`momento-${momento.id}`}
                    className="flex flex-col gap-3"
                >
                    <h2 id={`momento-${momento.id}`} className="text-md font-semibold text-secondary">
                        {momento.titulo}
                    </h2>
                    <ul className="flex flex-col gap-3">
                        {momento.servicos.map((s) => (
                            <li key={s.id}>
                                <CartaoServico item={s} contratado={contratados[s.id]} />
                            </li>
                        ))}
                    </ul>
                </motion.section>
            ))}
        </div>
    );
}

function CartaoServico({ item, contratado }: { item: ServicoRole; contratado?: Contratado }) {
    const navigate = useNavigate();
    const servico = SERVICOS[item.id];
    const dados = contratado && { id: item.id, valor: contratado.valor };
    const titulo = dados ? preencher(item.status.titulo, dados) : preencher(item.titulo, { id: item.id });
    const apoio = dados ? preencher(item.status.apoio, dados) : preencher(item.apoio, { id: item.id });
    // Só serviços com benefício comercial real (hoje, o desconto da Uber) ganham o selo
    const destaque = !contratado && item.destaque && SERVICOS[item.id].desconto > 0 ? preencher(item.destaque, { id: item.id }) : null;

    const abrir = () =>
        navigate(
            contratado ? `${BASE}/${item.id}/confirmacao?valor=${contratado.valor}&forma=${contratado.forma}&de=checklist` : `${BASE}/${item.id}?de=checklist`,
        );

    return (
        <button
            type="button"
            onClick={abrir}
            aria-label={dados ? preencher(item.status.rotulo, dados) : preencher(item.rotulo, { id: item.id })}
            className={cx(
                "group flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 outline-focus-ring transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:gap-4",
                // Hover: o card sobe um pouco, ganha sombra e a borda escurece; o selo cresce de leve e a seta anda
                contratado
                    ? "bg-secondary ring-secondary"
                    : "bg-primary shadow-xs ring-secondary lg:hover:-translate-y-0.5 lg:hover:shadow-md lg:hover:ring-primary",
            )}
        >
            {/* Contratado: o selo ganha um check, e a linha deixa de ser oferta */}
            <span className="relative shrink-0">
                <SeloServico servico={servico} tamanho="md" className="transition duration-150 ease-out lg:group-hover:scale-105" />
                {contratado && (
                    <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full bg-primary">
                        <CheckCircle className="size-5 text-fg-success-primary" aria-hidden="true" />
                    </span>
                )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {/* O selo segue o texto e fica preso à última palavra: se o título quebrar, os dois descem juntos */}
                <span className="text-md font-semibold text-primary">
                    {destaque ? (
                        <>
                            {titulo.slice(0, titulo.lastIndexOf(" ") + 1)}
                            <span className="whitespace-nowrap">
                                {titulo.slice(titulo.lastIndexOf(" ") + 1)}
                                <Badge color="success" type="pill-color" size="sm" className="ml-2 inline-flex align-[2px]">
                                    {destaque}
                                </Badge>
                            </span>
                        </>
                    ) : (
                        titulo
                    )}
                </span>
                <span className="text-sm text-tertiary">{apoio}</span>
            </span>
            {contratado ? (
                <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-secondary">
                    <span className="hidden sm:inline">{item.status.acao}</span>
                    <ChevronRight className="size-5 text-fg-quaternary" aria-hidden="true" />
                </span>
            ) : (
                <ChevronRight
                    className="size-5 shrink-0 text-fg-quaternary transition duration-150 ease-out group-hover:translate-x-1 group-hover:text-fg-secondary"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
