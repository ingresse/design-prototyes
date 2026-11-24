import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { FC } from "react";
import { ChevronRight, ClockRewind, Ticket01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { AppShell } from "../../components/AppShell";
import { GradientFill } from "../../components/GradientFill";
import { StatusBar } from "../../components/StatusBar";
import { TrocaOnboarding } from "../../ingressos/components/TrocaOnboarding";
import { MULTIPERFIS } from "../../components/funcionalidades";
import { usePerfilAtivo } from "../../components/perfil-ativo";
import { PerfisOnboarding } from "../../perfil/components/perfis-onboarding";
import { BannerHub, LINK_HUB } from "../components/banner-hub";
import { useDependentes } from "../../perfil/data/dependentes";
import { juntarGrupos, useCarteiraAppDoBanco } from "../../ingressos/data/plataforma";
import festivalAurora from "../../assets/festival-aurora.svg";
import gopTun from "../../assets/gop-tun.svg";
import arenaBrasileira from "../../assets/arena-brasileira.svg";
import festivalVerao from "../../assets/festival-verao.svg";
import lollapalooza from "../../assets/lollapalooza.svg";
import reveillonCopacabana from "../../assets/reveillon-copacabana.svg";
import sambaIndependente from "../../assets/samba-independente.svg";
import saoSilvestre from "../../assets/sao-silvestre.svg";

/** Atalho do hub dispensado pelo X (some até limpar os dados do navegador). */
const BANNER_HUB_KEY = "ing-banner-hub-dispensado";

const ONBOARDING_KEY = "ing-onboarding-troca";
const ONBOARDING_PERFIS_KEY = "ing-onboarding-perfis";

interface Evento {
    id: string;
    title: string;
    date: string;
    local: string;
    qtd: number;
    gradient?: string;
}
interface GrupoMes {
    mes: string;
    eventos: Evento[];
}

const VEM_AI: GrupoMes[] = [
    {
        mes: "Abril 2026",
        eventos: [
            {
                id: "gop-tun",
                title: "Gop Tun Festival 2026",
                date: "11 de Abr 2026",
                local: "Audio • São Paulo/SP",
                qtd: 2,
                // Capa ilustrativa (arte original do protótipo, não é a capa oficial)
                gradient: gopTun,
            },
        ],
    },
    {
        mes: "Junho 2026",
        eventos: [
            {
                id: "arena",
                title: "ARENA BRASILEIRA 2026",
                date: "Sex, 19 jun • 15:00",
                local: "Parque Ibirapuera • São Paulo/SP",
                qtd: 2,
                gradient: arenaBrasileira,
            },
        ],
    },
    {
        mes: "Julho 2026",
        eventos: [
            {
                id: "samba-independente",
                title: "SAMBA INDEPENDENTE DOS BONS COSTUMES",
                date: "4 e 18 jul • 2026",
                local: "Fundição Progresso • Rio de Janeiro/RJ",
                qtd: 2,
                gradient: sambaIndependente,
            },
        ],
    },
    {
        mes: "Novembro 2026",
        eventos: [
            {
                id: "festival-aurora",
                title: "Festival Aurora 2026",
                date: "Sáb, 28 nov • 16:00",
                local: "Parque Villa-Lobos • São Paulo/SP",
                qtd: 4,
                gradient: festivalAurora,
            },
        ],
    },
    {
        mes: "Dezembro 2026",
        eventos: [
            {
                id: "reveillon-copacabana",
                title: "Réveillon Copacabana 2027",
                date: "Qui, 31 dez • 22:00",
                local: "Praia de Copacabana • Rio de Janeiro/RJ",
                qtd: 2,
                gradient: reveillonCopacabana,
            },
            {
                id: "sao-silvestre",
                title: "São Silvestre 2026",
                date: "Qui, 31 dez • 08:00",
                local: "Av. Paulista • São Paulo/SP",
                qtd: 2,
                gradient: saoSilvestre,
            },
        ],
    },
];

const PASSADOS: GrupoMes[] = [
    {
        mes: "Março 2025",
        eventos: [
            { id: "lolla", title: "Lollapalooza 2025", date: "Sex, 28 mar • 12:00", local: "Autódromo de Interlagos • São Paulo/SP", qtd: 2, gradient: lollapalooza },
        ],
    },
    {
        mes: "Janeiro 2024",
        eventos: [
            { id: "verao", title: "Festival de Verão 2024", date: "Sáb, 27 jan • 16:00", local: "Parque de Exposições • Salvador/BA", qtd: 4, gradient: festivalVerao },
        ],
    },
];

export function Carteira() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<"vem-ai" | "passados">("vem-ai");
    const [bannerHub, setBannerHub] = useState(() => {
        try {
            return !localStorage.getItem(BANNER_HUB_KEY);
        } catch {
            return true;
        }
    });
    // No perfil de um dependente: só os eventos com ingressos dele que essa conta pode acessar.
    const perfil = usePerfilAtivo();
    const doPerfil = (lista: GrupoMes[]) =>
        !perfil
            ? lista
            : lista
                  .map((g) => ({
                      ...g,
                      eventos: g.eventos.flatMap((e) => {
                          const itens = perfil.carteira.find((c) => c.eventId === e.id)?.itens ?? [];
                          return itens.length ? [{ ...e, qtd: itens.length }] : [];
                      }),
                  }))
                  .filter((g) => g.eventos.length > 0);
    const doBanco = useCarteiraAppDoBanco();
    const grupos = doPerfil(tab === "vem-ai" ? juntarGrupos(doBanco.vemAi, VEM_AI) : juntarGrupos(doBanco.passados, PASSADOS));

    // Onboardings ao entrar na Carteira (um por vez):
    // - troca de ingresso: 1ª vez, ou via ?onboarding=1
    // - perfis dos dependentes: para quem tem dependentes, depois do da troca; ou via ?onboarding=perfis
    const temDependentes = useDependentes().length > 0;
    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const [perfisOpen, setPerfisOpen] = useState(false);
    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get("onboarding");
        if (perfil) return;
        const abrir = (fn: (v: boolean) => void) => {
            const t = setTimeout(() => fn(true), 600);
            return () => clearTimeout(t);
        };
        if (MULTIPERFIS && param === "perfis") return abrir(setPerfisOpen);
        if (param === "1" || !localStorage.getItem(ONBOARDING_KEY)) return abrir(setOnboardingOpen);
        if (MULTIPERFIS && temDependentes && !localStorage.getItem(ONBOARDING_PERFIS_KEY)) return abrir(setPerfisOpen);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const fecharOnboarding = () => {
        localStorage.setItem(ONBOARDING_KEY, "1");
        setOnboardingOpen(false);
    };
    const fecharPerfis = () => {
        localStorage.setItem(ONBOARDING_PERFIS_KEY, "1");
        setPerfisOpen(false);
    };

    return (
        <AppShell activeTab="ingressos" scrollClassName="bg-secondary">
            <TrocaOnboarding isOpen={onboardingOpen} onClose={fecharOnboarding} />
            <PerfisOnboarding
                isOpen={perfisOpen}
                onClose={fecharPerfis}
                onAcessar={() => {
                    fecharPerfis();
                    navigate("/ingresse-app/perfil/dependentes");
                }}
            />
            <div className="min-h-full bg-secondary">
                <StatusBar tone="dark" />

                <div className="px-5 pt-4 pb-5">
                    <h1 className="text-xl font-bold text-primary">Carteira</h1>
                </div>

                {/* Tabs */}
                <div className="flex px-5">
                    <TabButton icon={Ticket01} label="Vem aí" active={tab === "vem-ai"} onClick={() => setTab("vem-ai")} />
                    <TabButton icon={ClockRewind} label="Passados" active={tab === "passados"} onClick={() => setTab("passados")} />
                </div>
                <div className="h-px bg-border-secondary" />

                {/* Eventos agrupados por mês */}
                <div className="flex flex-col gap-2 px-5 pt-5 pb-6">
                    {/* Atalho do hub "Prepare seu rolê" antes da primeira data, só em "Vem aí" (quem ainda vai a eventos) */}
                    {tab === "vem-ai" && bannerHub && grupos.length > 0 && (
                        <BannerHub
                            onAbrir={() => navigate(LINK_HUB)}
                            onDispensar={() => {
                                try {
                                    localStorage.setItem(BANNER_HUB_KEY, "1");
                                } catch {
                                    /* sem armazenamento: some só nesta visita */
                                }
                                setBannerHub(false);
                            }}
                        />
                    )}
                    {grupos.length === 0 && (
                        <div className="flex flex-col items-center pt-12 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-fg-quaternary ring-1 ring-border-secondary">
                                <Ticket01 className="size-6" />
                            </span>
                            <p className="mt-4 text-md font-semibold text-primary">Nenhum ingresso por aqui</p>
                            <p className="mt-1 text-sm text-tertiary">Os ingressos de {perfil?.nome.split(" ")[0]} aparecem aqui.</p>
                        </div>
                    )}
                    {grupos.map((grupo) => (
                        <section key={grupo.mes} className="pt-2">
                            <h2 className="pb-3 text-md font-bold text-primary">{grupo.mes}</h2>
                            <div className="flex flex-col gap-4">
                                {grupo.eventos.map((evento) => (
                                    <button
                                        key={evento.id}
                                        type="button"
                                        onClick={() => navigate(`/ingresse-app/ingressos/evento/${evento.id}`)}
                                        className="flex items-center gap-4 rounded-2xl bg-primary p-3 text-left ring-1 ring-border-secondary transition duration-100 ease-linear active:bg-secondary"
                                    >
                                        {evento.gradient ? (
                                            <div className="h-[96px] w-[72px] shrink-0 overflow-hidden rounded-xl">
                                                <GradientFill gradient={evento.gradient} />
                                            </div>
                                        ) : (
                                            <div className="flex h-[96px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-secondary text-fg-quaternary">
                                                <Ticket01 className="size-8" />
                                            </div>
                                        )}
                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <p className="truncate text-sm font-bold text-primary">{evento.title}</p>
                                            <p className="text-sm font-medium text-secondary">{evento.date}</p>
                                            <p className="truncate text-sm text-tertiary">{evento.local}</p>
                                            <p className="text-sm text-tertiary">
                                                {evento.id === "sao-silvestre" ? "1 inscrição" : `${evento.qtd} ${evento.qtd === 1 ? "ingresso" : "ingressos"}`}
                                            </p>
                                        </div>
                                        <ChevronRight className="size-5 shrink-0 text-fg-quaternary" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}

const TabButton = ({ icon: Icon, label, active, onClick }: { icon: FC<{ className?: string }>; label: string; active: boolean; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={cx(
            "-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 pb-3 text-sm font-semibold transition duration-100 ease-linear",
            active ? "border-fg-brand-primary text-brand-secondary" : "border-transparent text-tertiary",
        )}
    >
        <Icon className={cx("size-5", active ? "text-fg-brand-primary" : "text-fg-quaternary")} />
        <span>{label}</span>
    </button>
);
