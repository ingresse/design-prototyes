import { useEffect, useRef, useState, type ReactNode } from "react";
import { getLocalTimeZone, parseDate, today, type CalendarDate } from "@internationalized/date";
import type { DateValue, RangeValue } from "react-aria-components";
import { DateRangePicker as AriaDateRangePicker, Dialog as AriaDialog, Group as AriaGroup, Popover as AriaPopover } from "react-aria-components";
import { Calendar } from "@untitledui/icons";
import { RangeCalendar } from "@/components/application/date-picker/range-calendar";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";

/*
 * Quando o evento acontece, no jeito de passagem de ida e volta (EVT-88): primeiro o intervalo de
 * dias num calendário de dois meses (o RangeCalendar do DS), depois os horários de início e de fim.
 * Valores em ISO local `AAAA-MM-DDTHH:mm`, como o resto do formulário.
 */

const HORA_INICIO_PADRAO = "20:00";

/** Distância mínima entre o fim do calendário (com o Aplicar) e a borda de baixo da tela, ou o topo da barra de ações fixa. */
const MARGEM_DA_BORDA = 24;

/** Altura ocupada embaixo por elementos fixos (a barra "Cancelar / Criar evento"): o calendário precisa ficar acima dela. */
function ocupadoEmbaixo() {
    let topo = window.innerHeight;
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        const estilo = getComputedStyle(el);
        if (estilo.position !== "fixed" && estilo.position !== "sticky") continue;
        const r = el.getBoundingClientRect();
        // Só faixas que encostam na borda de baixo e ocupam boa parte da largura.
        if (r.height > 0 && r.bottom >= window.innerHeight - 1 && r.width > window.innerWidth / 2 && r.top > window.innerHeight / 2) topo = Math.min(topo, r.top);
    }
    return window.innerHeight - topo;
}
/** Altura do calendário de dois meses com o rodapé, até a primeira abertura medir a real. */
const ALTURA_ESTIMADA = 460;

/**
 * O relógio do campo de hora é o ícone nativo do navegador: sem `color-scheme`, ele fica escuro
 * sobre o fundo escuro. Dizer o tema ao navegador deixa o ícone com contraste nos dois (EVT-88).
 */
export const HORA_COM_CONTRASTE = "[color-scheme:light] dark:[color-scheme:dark]";

const dia = (iso: string) => iso.slice(0, 10);
const hora = (iso: string) => iso.slice(11, 16);
const juntar = (d: string, h: string) => (d && h ? `${d}T${h}` : d ? `${d}T${h || HORA_INICIO_PADRAO}` : "");

/**
 * Fim sugerido para um intervalo novo: num dia só, 4 h depois (passando da meia-noite, termina no dia
 * seguinte, EVT-129); em dias diferentes, o mesmo horário do início.
 */
function horaFimSugerida(inicioDia: string, fimDia: string, horaInicio: string) {
    if (inicioDia !== fimDia) return horaInicio;
    const [h, m] = horaInicio.split(":").map(Number);
    const minutos = (h * 60 + m + 240) % (24 * 60);
    return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

const diaSeguinte = (d: string) => {
    const data = new Date(`${d}T12:00`);
    data.setDate(data.getDate() + 1);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

/** Um dia só e o fim antes do início: termina no dia seguinte, como nas sessões (EVT-129). */
export const terminaNoDiaSeguinte = (inicio: string, fim: string) => !!inicio && !!fim && dia(inicio) === dia(fim) && !!hora(fim) && hora(fim) < hora(inicio);

/** Fim de verdade do evento: no dia seguinte quando termina depois da meia-noite (EVT-129). */
export const fimEfetivo = (inicio: string, fim: string) => (terminaNoDiaSeguinte(inicio, fim) ? `${diaSeguinte(dia(fim))}T${hora(fim)}` : fim);

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Data de um dia do calendário: o número vem da célula e o mês e o ano, do rótulo da grade ("novembro de 2026"). */
function dataDaCelula(celula: Element): CalendarDate | null {
    const [mes, , ano] = (celula.closest('[role="grid"]')?.getAttribute("aria-label") ?? "").toLowerCase().split(" ");
    const m = MESES.indexOf(mes) + 1;
    const d = Number(celula.textContent?.trim());
    if (!m || !d || !Number(ano)) return null;
    return parseDate(`${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

const formatarDia = (d: CalendarDate | string) => {
    const data = typeof d === "string" ? new Date(`${d}T12:00`) : d.toDate(getLocalTimeZone());
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(data).replace(/\./g, "");
};

interface PeriodoDoEventoProps {
    inicio: string;
    fim: string;
    onChange: (inicio: string, fim: string) => void;
    erroInicio?: string;
    erroFim?: string;
    /** Entre os dias e os horários: a escolha entre evento direto e em sessões, quando há mais de um dia (EVT-98). */
    escolhaDeFormato?: ReactNode;
    /** Evento em sessões: sem horário geral, só os das sessões (EVT-98). */
    semHorarios?: boolean;
    /** Depois dos horários, no mesmo fundo: as sessões, no evento em sessões (EVT-98). */
    complemento?: ReactNode;
    /** Aviso antes de aplicar outros dias: o que fica fora deles e sai (ex.: sessões). */
    avisoAoAplicar?: (primeiroDia: string, ultimoDia: string) => string | null;
}

export function PeriodoDoEvento({ inicio, fim, onChange, erroInicio, erroFim, escolhaDeFormato, semHorarios = false, avisoAoAplicar, complemento }: PeriodoDoEventoProps) {
    const valor: RangeValue<DateValue> | null = inicio && fim ? { start: parseDate(dia(inicio)), end: parseDate(dia(fim)) } : null;
    // Rascunho do calendário: só vale ao aplicar, como na escolha de ida e volta.
    const [rascunho, setRascunho] = useState<RangeValue<DateValue> | null>(valor);
    // Primeiro clique sem o segundo: o calendário de intervalo não confirma nada sozinho, então guardamos
    // o dia clicado. Aplicar só com ele vale como evento de um dia (EVT-88).
    const [diaUnico, setDiaUnico] = useState<DateValue | null>(null);
    // Já houve o primeiro clique e falta o segundo.
    const ancorado = useRef(false);
    // O último toque foi num dia do calendário. Com o primeiro dia marcado, o calendário fecha o
    // intervalo até o dia sob o cursor quando se toca fora dele (no Aplicar, por exemplo): esse
    // fechamento não é escolha da pessoa e é ignorado, e Aplicar vale como um dia só.
    const tocouNoDia = useRef(false);

    /** Toque (ou Enter/Espaço) num dia: o primeiro marca o dia único; o segundo fecha o intervalo. */
    const marcarDia = (alvo: EventTarget) => {
        const celula = (alvo as HTMLElement).closest?.('[role="gridcell"]');
        tocouNoDia.current = !!celula;
        if (!celula || celula.getAttribute("aria-disabled") === "true") return;
        if (ancorado.current) {
            ancorado.current = false;
            return;
        }
        const data = dataDaCelula(celula);
        if (!data) return;
        ancorado.current = true;
        setDiaUnico(data);
    };
    const [aberto, setAberto] = useState(false);
    // Campo e calendário, para garantir que o Aplicar nunca fique fora da tela.
    const campoRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLElement>(null);
    const alturaDoCalendario = useRef(ALTURA_ESTIMADA);
    // Aberto, mede a altura real do calendário para as próximas aberturas.
    useEffect(() => {
        if (!aberto) return;
        const id = requestAnimationFrame(() => {
            const h = popoverRef.current?.getBoundingClientRect().height;
            if (h) alturaDoCalendario.current = h;
        });
        return () => cancelAnimationFrame(id);
    }, [aberto]);

    /**
     * Abre o calendário sempre abaixo do campo e inteiro na tela: se não cabe o calendário mais a margem,
     * a página rola suave antes de abrir (com ele aberto, a rolagem fica travada) e o campo sobe.
     */
    const abrir = () => {
        const campo = campoRef.current;
        if (!campo) return setAberto(true);
        const falta = campo.getBoundingClientRect().bottom + 8 + alturaDoCalendario.current + MARGEM_DA_BORDA + ocupadoEmbaixo() - window.innerHeight;
        if (falta <= 0) return setAberto(true);
        // Rola o contêiner que de fato rola (a página ou a área de conteúdo do Backstage).
        let alvo: HTMLElement | null = campo.parentElement;
        while (alvo && !(alvo.scrollHeight > alvo.clientHeight && /(auto|scroll)/.test(getComputedStyle(alvo).overflowY))) alvo = alvo.parentElement;
        const rolavel = (alvo ?? document.scrollingElement ?? document.documentElement) as HTMLElement;
        // Rolagem suave (sem movimento para quem pediu menos animação); o calendário abre quando ela termina.
        const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let aberta = false;
        const abrirUmaVez = () => {
            if (aberta) return;
            aberta = true;
            requestAnimationFrame(() => setAberto(true));
        };
        (rolavel === document.documentElement ? window : rolavel).addEventListener("scrollend", abrirUmaVez, { once: true });
        // Sem o evento "scrollend" (navegador antigo) ou sem ter o que rolar, abre mesmo assim.
        setTimeout(abrirUmaVez, reduzir ? 0 : 600);
        rolavel.scrollBy({ top: falta, behavior: reduzir ? "auto" : "smooth" });
    };

    const aplicar = () => {
        const intervalo = diaUnico ? { start: diaUnico, end: diaUnico } : rascunho;
        if (!intervalo) return;
        const d1 = intervalo.start.toString();
        const d2 = intervalo.end.toString();
        const h1 = hora(inicio) || HORA_INICIO_PADRAO;
        // Horário de fim já escolhido continua; senão, a sugestão.
        const h2 = hora(fim) && valor && d1 === dia(inicio) && d2 === dia(fim) ? hora(fim) : horaFimSugerida(d1, d2, h1);
        onChange(juntar(d1, h1), juntar(d2, h2));
        setAberto(false);
    };

    // Os dias que o Aplicar vai gravar, para avisar antes o que fica fora deles.
    const intervaloAplicavel = diaUnico ? { start: diaUnico, end: diaUnico } : rascunho;
    const aviso = intervaloAplicavel && avisoAoAplicar ? avisoAoAplicar(intervaloAplicavel.start.toString(), intervaloAplicavel.end.toString()) : null;

    const resumo = valor ? (dia(inicio) === dia(fim) ? formatarDia(dia(inicio)) : `${formatarDia(dia(inicio))} até ${formatarDia(dia(fim))}`) : null;
    const instrucao = diaUnico
        ? `${formatarDia(diaUnico as CalendarDate)}, um dia só. Para um período, clique no último dia.`
        : !rascunho
        ? "Clique no primeiro e depois no último dia do evento"
        : rascunho.start.compare(rascunho.end) === 0
          ? `${formatarDia(rascunho.start as CalendarDate)}, evento de um dia só`
          : `${formatarDia(rascunho.start as CalendarDate)} até ${formatarDia(rascunho.end as CalendarDate)}`;

    return (
        <div className="flex flex-col gap-4">
            <AriaDateRangePicker
                aria-label="Dias do evento"
                shouldCloseOnSelect={false}
                minValue={today(getLocalTimeZone())}
                value={rascunho}
                onChange={(v) => {
                    // Fechado por um toque fora dos dias: não é o segundo dia, fica o dia único.
                    if (!tocouNoDia.current) {
                        // O calendário soltou o primeiro dia: o próximo toque num dia recomeça.
                        ancorado.current = false;
                        return;
                    }
                    // Segundo clique num dia: o intervalo está completo.
                    setRascunho(v);
                    setDiaUnico(null);
                }}
                isOpen={aberto}
                onOpenChange={(a) => {
                    if (a) abrir();
                    else setAberto(false);
                    if (a) {
                        setRascunho(valor);
                        setDiaUnico(null);
                        ancorado.current = false;
                    }
                }}
                isInvalid={!!erroInicio && !inicio}
                className="flex flex-col gap-1.5"
            >
                <span className="text-sm font-medium text-secondary">
                    Dias do evento <span className="text-brand-tertiary">*</span>
                </span>
                <AriaGroup ref={campoRef}>
                    <Button
                        size="md"
                        color="secondary"
                        iconLeading={Calendar}
                        className={cx("w-full justify-start", !!erroInicio && !inicio && "ring-error_subtle")}
                    >
                        {resumo ? <span className="inline-block first-letter:uppercase">{resumo}</span> : <span className="text-placeholder">Escolha o primeiro e o último dia</span>}
                    </Button>
                </AriaGroup>
                {erroInicio && !inicio && <p className="text-sm text-error-primary">{erroInicio}</p>}
                <AriaPopover
                    ref={popoverRef}
                    placement="bottom start"
                    // Sempre abaixo do campo: quem garante o espaço é a rolagem antes de abrir.
                    shouldFlip={false}
                    offset={8}
                    className={({ isEntering, isExiting }) =>
                        cx("z-50 will-change-transform", isEntering && "duration-150 ease-out animate-in fade-in", isExiting && "duration-100 ease-in animate-out fade-out")
                    }
                >
                    <AriaDialog
                        aria-label="Escolher os dias do evento"
                        onPointerDownCapture={(e) => marcarDia(e.target)}
                        onKeyDownCapture={(e) => (e.key === "Enter" || e.key === " " ? marcarDia(e.target) : undefined)} className="flex max-w-[calc(100vw-1rem)] flex-col overflow-auto rounded-2xl bg-primary shadow-xl ring ring-secondary_alt focus:outline-hidden">
                        {/* Primeiro clique marca a ida; o segundo, a volta. Valor e mínimo vêm do picker. */}
                        {/* Toques capturados no diálogo: o dia do calendário para a propagação (usePress). */}
                        <RangeCalendar />
                        {/* Sem quebra de linha: o texto muda a cada clique e não pode empurrar os botões (o clique em Aplicar se perdia). */}
                        <div className="flex items-center gap-3 border-t border-secondary p-4">
                            <p className={cx("min-w-0 flex-1 text-sm first-letter:uppercase", aviso ? "text-warning-primary" : "text-secondary")} aria-live="polite">
                                {aviso ?? instrucao}
                            </p>
                            <div className="flex shrink-0 gap-3">
                                <Button size="sm" color="secondary" onClick={() => setAberto(false)}>
                                    Cancelar
                                </Button>
                                <Button size="sm" color="primary" isDisabled={!rascunho && !diaUnico} onClick={aplicar}>
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    </AriaDialog>
                </AriaPopover>
            </AriaDateRangePicker>

            {/* Escolhidos os dias, o resto do período fica num fundo próprio: formato, horários ou sessões (EVT-98). */}
            <Surgir visivel={!!valor} gap={16}>
            <div className="flex flex-col gap-4 rounded-xl bg-secondary p-4">
            {escolhaDeFormato}

            {/* Os horários vêm depois dos dias, como na passagem; em sessões, saem deslizando (UI-VIS-008). */}
            <Surgir visivel={!!valor && !semHorarios} gap={16}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        label={inicio ? `Começa às (${formatarDia(dia(inicio))})` : "Começa às"}
                        type="time"
                        inputClassName={HORA_COM_CONTRASTE}
                        isRequired
                        value={hora(inicio)}
                        onChange={(h) => onChange(juntar(dia(inicio), h), fim)}
                        isInvalid={!!erroInicio && !!inicio}
                        hint={inicio ? erroInicio : undefined}
                    />
                    <Input
                        // Passando da meia-noite num dia só, o rótulo já mostra o dia seguinte (EVT-129).
                        label={fim ? `Termina às (${formatarDia(dia(fimEfetivo(inicio, fim)))})` : "Termina às"}
                        type="time"
                        inputClassName={HORA_COM_CONTRASTE}
                        isRequired
                        value={hora(fim)}
                        onChange={(h) => onChange(inicio, juntar(dia(fim), h))}
                        isInvalid={!!erroFim}
                        hint={erroFim ?? (terminaNoDiaSeguinte(inicio, fim) ? "Termina no dia seguinte." : undefined)}
                    />
                </div>
            </Surgir>
            {complemento}
            </div>
            </Surgir>
        </div>
    );
}
