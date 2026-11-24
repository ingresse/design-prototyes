import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronRight, Ticket01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { AppShell } from "../../components/AppShell";
import { GradientFill } from "../../components/GradientFill";
import { StatusBar } from "../../components/StatusBar";
import { LINK_OFERTA_UBER } from "../../components/ofertas";
import { OfertaUberSheet } from "../components/oferta-uber-sheet";
import arenaBackstage from "../../assets/arena-backstage.svg";
import arenaBrasileira from "../../assets/arena-brasileira.svg";
import mixedByMixed from "../../assets/mixed-by-mixed.svg";
import reveillonMilagres from "../../assets/reveillon-milagres.svg";
import seuJustino from "../../assets/seu-justino.svg";
import sunsetPraia from "../../assets/sunset-praia.svg";

/** Mostra a oferta da Uber uma vez só (premissa até o negócio definir a frequência); /ingresse-app/uber ou ?oferta=uber força. */
const OFERTA_UBER_KEY = "ing-oferta-uber";

interface EventoCard {
    id: string;
    title: string;
    date: string;
    gradient: string;
}

const EVENTOS_COPA: EventoCard[] = [
    { id: "arena1", title: "ARENA BRASILEIRA 2026", date: "Sáb, 13 de junho", gradient: arenaBrasileira },
    { id: "arena2", title: "ARENA Backstage Mirante", date: "Sáb, 13 de junho", gradient: arenaBackstage },
    { id: "justino", title: "Seu Justino - Copa do Mundo", date: "Sáb, 13 de junho", gradient: seuJustino },
];

const EM_ALTA: EventoCard[] = [
    { id: "reveillon", title: "Réveillon dos Milagres 2026", date: "Qui, 31 de dezembro", gradient: reveillonMilagres },
    { id: "sunset", title: "Sunset na Praia", date: "Ter, 29 de dezembro", gradient: sunsetPraia },
    { id: "mixed", title: "Mixed by Mixed", date: "Seg, 28 de dezembro", gradient: mixedByMixed },
];

export function Home() {
    const navigate = useNavigate();
    const [ofertaAberta, setOfertaAberta] = useState(false);
    useEffect(() => {
        // /ingresse-app/uber (atalho) ou ?oferta=uber abrem a oferta mesmo se já foi vista
        const forcar = window.location.pathname.endsWith("/uber") || new URLSearchParams(window.location.search).get("oferta") === "uber";
        if (!forcar && localStorage.getItem(OFERTA_UBER_KEY)) return;
        const t = setTimeout(() => setOfertaAberta(true), 700);
        return () => clearTimeout(t);
    }, []);
    const fecharOferta = () => {
        localStorage.setItem(OFERTA_UBER_KEY, "1");
        setOfertaAberta(false);
    };

    return (
        <AppShell activeTab="inicio">
            <OfertaUberSheet
                isOpen={ofertaAberta}
                onClose={fecharOferta}
                onAproveitar={() => {
                    fecharOferta();
                    navigate(LINK_OFERTA_UBER);
                }}
            />
            {/* Hero / carrossel */}
            <section className="relative flex h-[440px] flex-col">
                <GradientFill gradient="linear-gradient(180deg,#1e3a8a 0%,#1d4ed8 38%,#15803d 100%)" className="absolute inset-0 -z-10 size-full" />
                <StatusBar tone="light" />

                <div className="flex items-center justify-between px-5 pt-1 text-white">
                    <span className="flex items-center gap-2 font-extrabold tracking-wide">
                        <Ticket01 className="size-5" aria-hidden="true" />
                        INGRESSE
                    </span>
                    <button type="button" className="flex items-center gap-1.5 text-sm font-semibold">
                        <span aria-hidden="true">🇧🇷</span>
                        Brasil
                        <ChevronDown className="size-4" />
                    </button>
                </div>

                {/* Overlay inferior com título + CTA + dots */}
                <div className="mt-auto bg-gradient-to-t from-black/70 to-transparent px-5 pt-16 pb-5">
                    <h1 className="text-xl font-bold text-white drop-shadow">Arena Brasileira 2026</h1>
                    <Button size="lg" color="primary" className="mt-4 w-full rounded-full">
                        Ver mais
                    </Button>
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={cx("h-1.5 rounded-full bg-white transition-all", i === 0 ? "w-5" : "w-1.5 bg-white/40")} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Eventos de Copa */}
            <EventoRow title="Eventos de Copa" eventos={EVENTOS_COPA} />

            {/* Em alta */}
            <EventoRow title="Em alta" eventos={EM_ALTA} />
        </AppShell>
    );
}

const EventoRow = ({ title, eventos }: { title: string; eventos: EventoCard[] }) => (
    <section className="pt-6">
        <div className="flex items-center justify-between px-5">
            <h2 className="text-md font-bold text-primary">{title}</h2>
            <button type="button" aria-label="Ver todos" className="text-fg-quaternary">
                <ChevronRight className="size-5" />
            </button>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {eventos.map((evento) => (
                <button key={evento.id} type="button" className="flex w-40 shrink-0 flex-col text-left">
                    <div className="h-40 w-40 overflow-hidden rounded-2xl ring-1 ring-border-secondary ring-inset">
                        <GradientFill gradient={evento.gradient} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-primary">{evento.title}</p>
                    <p className="mt-0.5 text-xs text-tertiary">{evento.date}</p>
                </button>
            ))}
        </div>
    </section>
);
