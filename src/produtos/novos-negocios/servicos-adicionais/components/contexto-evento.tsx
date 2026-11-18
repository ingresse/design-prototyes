import { CalendarDate, MarkerPin01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { EVENTO, type Evento } from "../data/servicos";
import { FaixaBrilho, useBrilhoUnico } from "./mosaico-oferta";

/**
 * Card do evento (Figma "Card_ingresso", da Lista de espera): pôster, nome, local e data.
 * Nas ofertas ligadas a um evento (Meep), fica no lugar do mosaico no desktop, para deixar
 * claro onde o serviço vale. `contagem`: mostra "Faltam N dias" acima do nome (só no Prepare seu rolê).
 */
export function CardEvento({ contagem = false, evento = EVENTO }: { contagem?: boolean; evento?: Evento }) {
    const brilho = useBrilhoUnico();
    return (
        <aside aria-label="Evento" className="flex flex-col rounded-xl bg-primary p-6 shadow-sm ring-1 ring-secondary">
            {/* Pôster com o mesmo brilho de vidro do mosaico (a cada 15 s) */}
            <div className="relative isolate overflow-hidden rounded-2xl">
                {evento.poster ? (
                    <img src={evento.poster} alt={`Pôster de ${evento.nome}`} className="aspect-[3/4] w-full object-cover" />
                ) : (
                    // Sem pôster: o degradê do evento com o nome, como nos cards da Carteira
                    <div role="img" aria-label={evento.nome} className="flex aspect-[3/4] w-full items-end p-6" style={{ background: evento.fundo }}>
                        <span className="text-display-sm font-bold text-white">{evento.nome}</span>
                    </div>
                )}
                {brilho.vez != null && <FaixaBrilho key={brilho.vez} aoTerminar={brilho.acabou} />}
            </div>
            {contagem && evento.contagem && (
                <Badge color="brand" type="pill-color" size="md" className="mt-4">
                    {evento.contagem}
                </Badge>
            )}
            <h2 className={contagem ? "pt-2 pb-2 text-display-xs font-bold text-primary" : "pt-4 pb-2 text-display-xs font-bold text-primary"}>{evento.nome}</h2>
            <div className="flex flex-col gap-1.5 text-sm text-tertiary">
                <span className="flex items-center gap-2">
                    <MarkerPin01 className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    {evento.local}
                </span>
                <span className="flex items-center gap-2">
                    <CalendarDate className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    {evento.dataCompleta}
                </span>
            </div>
        </aside>
    );
}

/**
 * Imagem do evento para o topo do mobile (e a faixa dele atrás do header fixo): o pôster
 * desfocado, como no header dos eventos, para dar a identidade sem brigar com o logo e os textos.
 */
export function FundoEvento({ evento = EVENTO }: { evento?: Evento }) {
    if (!evento.poster) return <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: evento.fundo }} />;
    return <img src={evento.poster} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full scale-110 object-cover blur-[12px]" />;
}

/**
 * Topo do mobile nas ofertas ligadas a um evento: a imagem do evento com nome, data e local
 * embaixo, em branco sobre um escurecido. O card da oferta sobe por cima dela.
 */
export function TopoEvento({ contagem = false, evento = EVENTO }: { contagem?: boolean; evento?: Evento }) {
    return (
        <>
            <FundoEvento evento={evento} />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
            {/* Mesmos dados do card do desktop: nome, local e data, com os ícones */}
            <div className="flex h-full flex-col items-start justify-end gap-2 px-4 pb-10 text-white">
                {contagem && evento.contagem && (
                    <Badge color="brand" type="pill-color" size="sm">
                        {evento.contagem}
                    </Badge>
                )}
                <p className="text-lg font-bold">{evento.nome}</p>
                <div className="flex flex-col gap-1.5 text-sm text-white/80">
                    <span className="flex items-center gap-2">
                        <MarkerPin01 className="size-4 shrink-0" aria-hidden="true" />
                        {evento.local}
                    </span>
                    <span className="flex items-center gap-2">
                        <CalendarDate className="size-4 shrink-0" aria-hidden="true" />
                        {evento.dataCompleta}
                    </span>
                </div>
            </div>
        </>
    );
}
