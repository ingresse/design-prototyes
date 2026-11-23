import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronDown, FaceId, Package, QrCode01, SearchLg, Ticket02 } from "@untitledui/icons";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { InputBase } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { Surgir } from "@/components/foundations/transicao";
import { cx } from "@/utils/cx";
import { comboCategories, formatBRL, products, sessions, type ComboItem, type TicketItem, type TicketSession } from "../data/catalogo";
import type { Cart } from "../data/carrinho";
import { QuantityStepper } from "./QuantityStepper";

export type ItemsTab = "ingressos" | "produtos" | "combos";

const TABS: Array<{ id: ItemsTab; label: string }> = [
    { id: "ingressos", label: "Ingressos" },
    { id: "produtos", label: "Produtos" },
    { id: "combos", label: "Combos" },
];

interface ItemsStepProps {
    cart: Cart;
    onQuantityChange: (id: string, quantity: number) => void;
    /** Identificação pulada — ingressos com acesso por face não podem ser vendidos. */
    facialBlocked: boolean;
    /**
     * Quantos ingressos ainda cabem no limite do evento. `undefined` quando não
     * há limite: venda sem identificação, ou evento sem limite configurado.
     * Ao zerar, o + dos ingressos trava, em vez de deixar passar e acusar depois.
     */
    ingressosRestantes?: number;
}

const matches = (term: string, ...fields: string[]) => {
    const query = term.trim().toLowerCase();
    if (!query) return true;
    return fields.some((field) => field.toLowerCase().includes(query));
};

/*
  Direção do slide: o conteúdo novo entra do lado para onde o operador foi
  (aba, data ou agrupador à direita entra pela direita) e o antigo sai pelo
  lado oposto. Sem isso a troca pisca no lugar e não diz nada.
*/
const useDirection = (index: number) => {
    const previous = useRef(index);
    const direction = index >= previous.current ? 1 : -1;
    useEffect(() => {
        previous.current = index;
    }, [index]);
    return direction;
};

/** Chave da data de uma sessão: sessões no mesmo dia dividem o chip do carrossel. */
const dayKey = (session: { day: string; month: string; year: string }) => `dia-${session.year}-${session.month}-${session.day}`;

/** Itens agrupados pelo nome do grupo (Pista, Camarote…), na ordem do catálogo. */
const groupByName = <T extends { group: string }>(items: T[]) => {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const current = groups.get(item.group);
        if (current) current.push(item);
        else groups.set(item.group, [item]);
    }
    return [...groups.entries()].map(([name, entries]) => ({ name, items: entries }));
};

/** Quando a busca esvazia o agrupador escolhido, diz se há resultado nos outros. */
const emptyMessage = (others: number, here: string, one: string, many: (count: number) => string) =>
    others > 0 ? `Nenhum item ${here}. A busca encontrou resultados em ${others === 1 ? one : many(others)}.` : "Nenhum item encontrado para a busca.";

export function ItemsStep({ cart, onQuantityChange, facialBlocked, ingressosRestantes }: ItemsStepProps) {
    const [tab, setTab] = useState<ItemsTab>("ingressos");
    const [term, setTerm] = useState("");
    // A sessão do primeiro ingresso no carrinho: voltar do passo 3 reabre onde o operador estava.
    const sessaoDoCarrinho = sessions.find((session) => session.tickets.some((ticket) => cart[ticket.id]));
    const [dayId, setDayId] = useState(dayKey(sessaoDoCarrinho ?? sessions[0]));
    /* Horário escolhido em cada data: voltar a uma data reabre o horário que estava nela. */
    const [timeByDay, setTimeByDay] = useState<Record<string, string>>(() => (sessaoDoCarrinho ? { [dayKey(sessaoDoCarrinho)]: sessaoDoCarrinho.id } : {}));
    const [categoryId, setCategoryId] = useState(comboCategories.find((category) => !category.soldOut)?.id ?? comboCategories[0]?.id ?? "");
    /* Grupos abertos pelo operador (chave sessão + grupo). Com itens no carrinho ou com busca, o grupo já abre. */
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
    const alternar = (chave: string, aberto: boolean) =>
        setAbertos((atual) => {
            const proximo = new Set(atual);
            if (aberto) proximo.add(chave);
            else proximo.delete(chave);
            return proximo;
        });
    const isFiltering = term.trim().length > 0;
    // Movimento reduzido: as trocas só esmaecem, sem deslizar (WCAG 2.3.3).
    const reduzir = useReducedMotion();
    const desliza = (direcao: number) => (reduzir ? 0 : direcao);

    const direction = useDirection(TABS.findIndex((item) => item.id === tab));

    /*
      A busca filtra dentro de cada sessão; a escolha de data marca quais datas têm resultado e, quando
      o resultado está em outro horário, a lista "Também em" leva até ele (BIL-103).
    */
    const filteredSessions = useMemo(
        () =>
            sessions.map((session) => ({
                ...session,
                tickets: session.tickets.filter((ticket) => matches(term, ticket.name, ticket.group, ticket.lote, session.label)),
            })),
        [term],
    );
    const days = useMemo(() => {
        const byDay = new Map<string, typeof filteredSessions>();
        for (const session of filteredSessions) {
            const key = dayKey(session);
            byDay.set(key, [...(byDay.get(key) ?? []), session]);
        }
        return [...byDay.entries()].map(([id, daySessions]) => ({
            id,
            label: rotuloDoDia(daySessions[0]),
            weekday: daySessions[0].weekday,
            day: daySessions[0].day,
            month: daySessions[0].month,
            year: daySessions[0].year,
            soldOut: daySessions.every((session) => session.soldOut),
            sessions: daySessions,
        }));
    }, [filteredSessions]);
    const selectedDay = days.find((day) => day.id === dayId) ?? days[0];
    const selectedSession =
        selectedDay.sessions.find((session) => session.id === timeByDay[selectedDay.id]) ??
        selectedDay.sessions.find((session) => !session.soldOut) ??
        selectedDay.sessions[0];
    const dayDirection = useDirection(days.findIndex((day) => day.id === selectedDay.id));
    const timeDirection = useDirection(selectedDay.sessions.findIndex((session) => session.id === selectedSession.id));
    const ticketGroups = useMemo(() => groupByName(selectedSession.tickets), [selectedSession]);
    const outrasComResultado = isFiltering ? filteredSessions.filter((session) => session.id !== selectedSession.id && session.tickets.length > 0) : [];
    const irParaSessao = (sessionId: string) => {
        const session = sessions.find((item) => item.id === sessionId);
        if (!session) return;
        const dia = dayKey(session);
        setDayId(dia);
        setTimeByDay((atual) => ({ ...atual, [dia]: sessionId }));
    };

    const filteredCategories = useMemo(
        () =>
            comboCategories.map((category) => ({
                ...category,
                combos: category.combos.filter((item) => matches(term, item.name, item.group, category.name)),
            })),
        [term],
    );
    /* Evento sem combo à venda: não há agrupador (BIL-35). */
    const selectedCategory = filteredCategories.find((category) => category.id === categoryId) ?? filteredCategories[0];
    const categoryDirection = useDirection(filteredCategories.findIndex((category) => category.id === selectedCategory?.id));
    const comboGroups = useMemo(() => groupByName(selectedCategory?.combos ?? []), [selectedCategory]);
    const otherCategoriesWithResults = filteredCategories.filter((category) => category.id !== selectedCategory?.id && category.combos.length > 0).length;

    const visibleProducts = useMemo(() => products.filter((product) => matches(term, product.name)), [term]);

    const grupoAberto = (chave: string, quantidade: number) => isFiltering || quantidade > 0 || abertos.has(chave);

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Busca à esquerda e abas à direita, na mesma altura: as abas esticam até a altura do campo. */}
            <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-12">
                <div className="md:flex-1">
                    <InputBase
                        size="sm"
                        icon={SearchLg}
                        value={term}
                        aria-label="Buscar item"
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Busque por grupo, item ou lote"
                    />
                </div>
                <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as ItemsTab)} className="md:w-auto md:shrink-0">
                    <TabList type="button-border" size="sm" items={TABS} className="max-md:w-full md:h-full">
                        {(item) => <Tab {...item} className="max-md:min-h-11 max-md:flex-1 md:h-full md:py-0" />}
                    </TabList>
                </Tabs>
            </div>

            <div className="overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={desliza(direction)}>
                    <motion.div key={tab} custom={desliza(direction)} variants={SLIDE_FADE} initial="enter" animate="center" exit="exit" transition={TRANSICAO}>
                        {tab === "ingressos" && (
                            <div className="flex flex-col gap-4">
                                <EscolhaDeData days={days} selectedId={selectedDay.id} isFiltering={isFiltering} onSelect={setDayId} />

                                {/* A data nova traz os horários dela; trocar só o horário troca apenas a lista. */}
                                <AnimatePresence mode="wait" initial={false} custom={desliza(dayDirection)}>
                                    <motion.div
                                        key={selectedDay.id}
                                        custom={desliza(dayDirection)}
                                        variants={SLIDE_FADE}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={TRANSICAO}
                                        className="flex flex-col gap-4"
                                    >
                                        <TimeSelector
                                            sessions={selectedDay.sessions}
                                            selectedId={selectedSession.id}
                                            cart={cart}
                                            isFiltering={isFiltering}
                                            onSelect={(id) => setTimeByDay((current) => ({ ...current, [selectedDay.id]: id }))}
                                        />

                                        <AnimatePresence mode="wait" initial={false} custom={desliza(timeDirection)}>
                                            <motion.div
                                                key={selectedSession.id}
                                                custom={desliza(timeDirection)}
                                                variants={SLIDE_FADE}
                                                initial="enter"
                                                animate="center"
                                                exit="exit"
                                                transition={TRANSICAO}
                                                className="flex flex-col gap-3"
                                            >
                                                {ticketGroups.map((group) => {
                                                    const chave = `${selectedSession.id}:${group.name}`;
                                                    const quantidade = group.items.reduce((total, ticket) => total + (cart[ticket.id] ?? 0), 0);
                                                    return (
                                                        <GroupAccordion
                                                            key={group.name}
                                                            name={group.name}
                                                            total={group.items.length}
                                                            noCarrinho={quantidade}
                                                            isOpen={grupoAberto(chave, quantidade)}
                                                            onToggle={(aberto) => alternar(chave, aberto)}
                                                        >
                                                            {group.items.map((ticket) => (
                                                                <TicketRow
                                                                    key={ticket.id}
                                                                    ticket={ticket}
                                                                    cart={cart}
                                                                    facialBlocked={facialBlocked}
                                                                    ingressosRestantes={ingressosRestantes}
                                                                    onQuantityChange={onQuantityChange}
                                                                />
                                                            ))}
                                                        </GroupAccordion>
                                                    );
                                                })}
                                                {ticketGroups.length === 0 && (
                                                    <NoResults message={outrasComResultado.length > 0 ? "Nenhum item neste horário." : "Nenhum item encontrado para a busca."} />
                                                )}
                                                {outrasComResultado.length > 0 && <TambemEm sessoes={outrasComResultado} onIr={irParaSessao} />}
                                            </motion.div>
                                        </AnimatePresence>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        )}

                        {tab === "combos" && !selectedCategory && <NoResults message="Nenhum combo à venda neste evento." />}

                        {tab === "combos" && selectedCategory && (
                            <div className="flex flex-col gap-4">
                                {filteredCategories.length > 1 && (
                                    <ChipsQueQuebram
                                        items={filteredCategories}
                                        selectedId={selectedCategory.id}
                                        ariaLabel="Agrupador de combos"
                                        isEmpty={(category) => isFiltering && category.combos.length === 0}
                                        onSelect={setCategoryId}
                                        renderChip={(category) => (
                                            <>
                                                <span className="line-clamp-2 text-md font-semibold">{category.name}</span>
                                                {category.soldOut && <SoldOutTag />}
                                            </>
                                        )}
                                    />
                                )}

                                <AnimatePresence mode="wait" initial={false} custom={desliza(categoryDirection)}>
                                    <motion.div
                                        key={selectedCategory.id}
                                        custom={desliza(categoryDirection)}
                                        variants={SLIDE_FADE}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={TRANSICAO}
                                        className="flex flex-col gap-3"
                                    >
                                        {comboGroups.map((group) => {
                                            const chave = `${selectedCategory.id}:${group.name}`;
                                            const quantidade = group.items.reduce((total, item) => total + (cart[item.id] ?? 0), 0);
                                            return (
                                                <GroupAccordion
                                                    key={group.name}
                                                    name={group.name}
                                                    total={group.items.length}
                                                    noCarrinho={quantidade}
                                                    isOpen={grupoAberto(chave, quantidade)}
                                                    onToggle={(aberto) => alternar(chave, aberto)}
                                                >
                                                    {group.items.map((item) => (
                                                        <ComboRow key={item.id} combo={item} cart={cart} onQuantityChange={onQuantityChange} />
                                                    ))}
                                                </GroupAccordion>
                                            );
                                        })}
                                        {comboGroups.length === 0 && (
                                            <NoResults
                                                message={emptyMessage(otherCategoriesWithResults, "neste agrupador", "outro agrupador", (count) => `outros ${count} agrupadores`)}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        )}

                        {tab === "produtos" && (
                            <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-border-secondary">
                                <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                                    <Package className="size-5 text-fg-quaternary" aria-hidden="true" />
                                    <h2 className="text-md font-semibold text-primary">Produtos</h2>
                                </div>
                                {visibleProducts.map((product) => (
                                    <div key={product.id} className="flex items-center gap-3 border-b border-secondary px-4 py-3 last:border-b-0">
                                        {product.image ? (
                                            <img src={product.image} alt="" className="size-10 shrink-0 rounded-md object-cover ring-1 ring-border-secondary" />
                                        ) : (
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary ring-1 ring-border-secondary">
                                                <Package className="size-5 text-fg-quaternary" aria-hidden="true" />
                                            </span>
                                        )}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <p className="truncate text-sm font-semibold text-primary">{product.name}</p>
                                            <p className="text-sm font-semibold text-primary">{formatBRL(product.price)}</p>
                                        </div>
                                        <QuantityStepper
                                            label={product.name}
                                            value={cart[product.id] ?? 0}
                                            onChange={(quantity) => onQuantityChange(product.id, quantity)}
                                        />
                                    </div>
                                ))}
                                {visibleProducts.length === 0 && <NoResults message={products.length === 0 ? "Nenhum produto à venda neste evento." : undefined} />}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

/** "Sex, 2 out 2026": rótulo da data na escolha (sem separador). */
const rotuloDoDia = (session: TicketSession) => `${session.weekday.slice(0, 3)}, ${Number(session.day)} ${session.month.toLowerCase()} ${session.year}`;

/** Até tantas datas, os chips cabem quebrando linha; acima, a escolha vira um campo com busca. */
const MAX_CHIPS_DE_DATA = 6;

type Dia = { id: string; label: string; weekday: string; day: string; month: string; year: string; soldOut: boolean; sessions: Array<TicketSession> };

/**
 * Escolha da data (BIL-103): poucas datas, chips que quebram linha (sem rolagem para o lado,
 * UI-MOB-004); muitas, o ComboBox do DS com busca, que lista todas e diz quantos horários cada uma tem.
 */
const EscolhaDeData = ({ days, selectedId, isFiltering, onSelect }: { days: Dia[]; selectedId: string; isFiltering: boolean; onSelect: (id: string) => void }) => {
    const semResultado = (day: Dia) => isFiltering && day.sessions.every((session) => session.tickets.length === 0);
    if (days.length <= MAX_CHIPS_DE_DATA)
        return (
            <ChipsQueQuebram
                items={days}
                selectedId={selectedId}
                ariaLabel="Data da sessão"
                isEmpty={semResultado}
                onSelect={onSelect}
                chipClassName="w-[87px]"
                renderChip={(day, isSelected) => (
                    <>
                        <ChipCaption isSelected={isSelected}>{day.weekday}</ChipCaption>
                        <span className="text-md font-semibold">
                            {day.day} {day.month}
                        </span>
                        {day.soldOut ? <SoldOutTag /> : <ChipCaption isSelected={isSelected}>{day.year}</ChipCaption>}
                    </>
                )}
            />
        );
    const itens = days.map((day) => ({
        id: day.id,
        label: day.label,
        isDisabled: day.soldOut,
        supportingText: day.soldOut
            ? "Esgotado"
            : semResultado(day)
              ? "Sem resultado da busca"
              : day.sessions.length === 1
                ? "1 horário"
                : `${day.sessions.length} horários`,
    }));
    return (
        <Select.ComboBox
            size="sm"
            label="Data da sessão"
            placeholder="Busque a data, ex.: 12 out"
            shortcut={false}
            items={itens}
            selectedKey={selectedId}
            onSelectionChange={(key) => key && onSelect(String(key))}
        >
            {(item) => (
                <Select.Item id={item.id} supportingText={item.supportingText} isDisabled={item.isDisabled}>
                    {item.label}
                </Select.Item>
            )}
        </Select.ComboBox>
    );
};

/** A busca achou nos outros horários: cada um vira um atalho que leva até lá (BIL-103). */
const TambemEm = ({ sessoes, onIr }: { sessoes: TicketSession[]; onIr: (id: string) => void }) => {
    const [todas, setTodas] = useState(false);
    const visiveis = todas ? sessoes : sessoes.slice(0, 5);
    return (
        <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
            <p className="text-sm font-medium text-secondary">
                {sessoes.length === 1 ? "A busca também encontrou em outro horário:" : `A busca também encontrou em outros ${sessoes.length} horários:`}
            </p>
            <ul className="flex flex-col gap-1">
                {visiveis.map((session) => (
                    <li key={session.id}>
                        <Button size="sm" color="link-color" onClick={() => onIr(session.id)} className="min-h-11 md:min-h-0">
                            {`${session.shortDate}: ${session.tickets.length === 1 ? "1 item" : `${session.tickets.length} itens`}`}
                        </Button>
                    </li>
                ))}
            </ul>
            {!todas && sessoes.length > 5 && (
                <Button size="sm" color="link-gray" onClick={() => setTodas(true)} className="w-fit">
                    {`Mostrar mais ${sessoes.length - 5}`}
                </Button>
            )}
        </div>
    );
};

const TRANSICAO = { duration: 0.18, ease: "easeOut" } as const;

/*
  Variantes com `custom`: quem sai também recebe a direção da troca atual, e não
  a da troca anterior, que é o que ficaria gravado nas props do elemento que saiu.
*/
const SLIDE_FADE: Variants = {
    enter: (direction: number) => ({ opacity: 0, x: direction * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: direction * -24 }),
};

const NoResults = ({ message = "Nenhum item encontrado para a busca." }: { message?: string }) => (
    <p className="rounded-xl bg-primary px-4 py-8 text-center text-sm text-tertiary ring-1 ring-border-secondary">{message}</p>
);

const ChipCaption = ({ isSelected, children }: { isSelected: boolean; children: ReactNode }) => (
    <span className={cx("text-sm", isSelected ? "text-alpha-white/70" : "text-tertiary")}>{children}</span>
);

const SoldOutTag = () => <span className="rounded-md bg-tertiary px-1.5 text-sm text-secondary">Esgotado</span>;

interface ChipsProps<T extends { id: string; soldOut?: boolean }> {
    items: T[];
    selectedId: string;
    ariaLabel: string;
    /** Com busca ativa, os chips sem resultado ficam apagados. */
    isEmpty: (item: T) => boolean;
    onSelect: (id: string) => void;
    /** Largura do chip: fixa para datas, flexível para nomes. */
    chipClassName?: string;
    renderChip: (item: T, isSelected: boolean) => ReactNode;
}

/**
 * Chips de escolha única (datas ou agrupadores de combo) que quebram linha: nada rola para o lado
 * (UI-MOB-004). Até 22/11/2026 era um carrossel com setas.
 */
const ChipsQueQuebram = <T extends { id: string; soldOut?: boolean }>({ items, selectedId, ariaLabel, isEmpty, onSelect, chipClassName, renderChip }: ChipsProps<T>) => (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
                <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={item.soldOut}
                    onClick={() => onSelect(item.id)}
                    className={cx(
                        "flex min-h-[72px] min-w-[87px] max-w-[160px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
                        chipClassName,
                        /*
                          O chip escolhido inverte em relação à superfície: os tokens alpha
                          viram branco no dark, que é o chip claro do design, e preto no light.
                        */
                        isSelected ? "bg-alpha-black text-alpha-white" : "bg-secondary text-primary ring-1 ring-border-secondary",
                        item.soldOut && "cursor-not-allowed opacity-50",
                        isEmpty(item) && !isSelected && "opacity-50",
                    )}
                >
                    {renderChip(item, isSelected)}
                </button>
            );
        })}
    </div>
);

interface TimeSelectorProps {
    sessions: TicketSession[];
    selectedId: string;
    cart: Cart;
    /** Com busca ativa, os horários sem resultado ficam sinalizados. */
    isFiltering: boolean;
    onSelect: (id: string) => void;
}

/**
 * Horários da data escolhida, como no marketplace: abas sublinhadas com a
 * quantidade já no carrinho de cada horário. Horário esgotado fica riscado e
 * não pode ser escolhido.
 */
const TimeSelector = ({ sessions: daySessions, selectedId, cart, isFiltering, onSelect }: TimeSelectorProps) => (
    <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-secondary">Horários disponíveis</p>
        <Tabs
            selectedKey={selectedId}
            onSelectionChange={(key) => onSelect(String(key))}
            disabledKeys={daySessions.filter((session) => session.soldOut).map((session) => session.id)}
        >
            <TabList type="underline" size="sm" aria-label="Horário da sessão" className="flex-wrap">
                {daySessions.map((session) => {
                    const inCart = session.tickets.reduce((total, ticket) => total + (cart[ticket.id] ?? 0), 0);
                    return (
                        <Tab
                            key={session.id}
                            id={session.id}
                            className={cx(
                                "px-3 max-md:min-h-11",
                                session.soldOut && "cursor-not-allowed opacity-50",
                                isFiltering && session.tickets.length === 0 && session.id !== selectedId && "opacity-50",
                            )}
                        >
                            <span className={cx(session.soldOut && "line-through")}>{session.time}</span>
                            {session.soldOut && <span className="sr-only">esgotado</span>}
                            {inCart > 0 && (
                                <Badge size="md" type="pill-color" color="gray">
                                    {inCart}
                                </Badge>
                            )}
                        </Tab>
                    );
                })}
            </TabList>
        </Tabs>
    </div>
);

/**
 * Itens de um grupo, recolhíveis (composto do DS com o desenho do `accordion`: o Accordion do DS não
 * deixa a tela abrir um item, e a busca e o carrinho precisam abrir). O cabeçalho diz quantos itens há
 * e quantos já estão no carrinho; abre e fecha deslizando a altura (`Surgir`, com movimento reduzido só
 * esmaece). Com item no carrinho ou com busca, nasce aberto (BIL-103).
 */
const GroupAccordion = ({
    name,
    total,
    noCarrinho,
    isOpen,
    onToggle,
    children,
}: {
    name: string;
    total: number;
    noCarrinho: number;
    isOpen: boolean;
    onToggle: (aberto: boolean) => void;
    children: ReactNode;
}) => {
    const reduzir = useReducedMotion();
    return (
        <section className="overflow-hidden rounded-xl bg-primary ring-1 ring-border-secondary">
            <button
                type="button"
                onClick={() => onToggle(!isOpen)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-md font-semibold text-primary">{name}</span>
                    <span className="text-sm text-tertiary">{total === 1 ? "1 item" : `${total} itens`}</span>
                </span>
                {noCarrinho > 0 && (
                    <Badge size="md" type="pill-color" color="gray">
                        {`${noCarrinho} no carrinho`}
                    </Badge>
                )}
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={reduzir ? { duration: 0 } : TRANSICAO} className="flex shrink-0">
                    <ChevronDown className="size-5 text-fg-quaternary" aria-hidden="true" />
                </motion.span>
            </button>

            <Surgir visivel={isOpen}>
                <div className="border-t border-secondary">{children}</div>
            </Surgir>
        </section>
    );
};

const ROW = "flex flex-col gap-2 border-b border-secondary px-4 py-4 last:border-b-0";

interface TicketRowProps {
    ticket: TicketItem;
    cart: Cart;
    facialBlocked: boolean;
    ingressosRestantes?: number;
    onQuantityChange: (id: string, quantity: number) => void;
}

const TicketRow = ({ ticket, cart, facialBlocked, ingressosRestantes, onQuantityChange }: TicketRowProps) => {
    const isBlocked = facialBlocked && ticket.access === "facial";
    const AccessIcon = ticket.access === "facial" ? FaceId : QrCode01;

    return (
        <div className={cx(ROW, isBlocked && "opacity-50")}>
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-md font-semibold text-primary">{ticket.name}</p>
                {/* Deixa claro na lista por que o item não pode ser vendido. */}
                {isBlocked && (
                    <Badge size="md" type="pill-color" color="gray">
                        Bloqueado
                    </Badge>
                )}
            </div>
            <p className="text-sm text-tertiary">{ticket.lote}</p>
            {/* O tipo de acesso em texto, com o ícone neutro ao lado (WCAG 1.1.1); até 22/11/2026, só o ícone em vermelho. */}
            <p className="flex items-center gap-1.5 text-sm text-tertiary">
                <AccessIcon className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                {ticket.access === "facial" ? "Acesso por face" : "Acesso por QR code"}
            </p>
            {ticket.description && <p className="text-sm text-tertiary">{ticket.description}</p>}
            {isBlocked && <p className="text-sm text-tertiary">Acesso por face: indisponível sem identificação do comprador.</p>}
            <div className="flex items-center justify-between gap-3">
                <p className="text-md font-semibold text-primary">{formatBRL(ticket.price)}</p>
                <QuantityStepper
                    label={`${ticket.name}, ${ticket.group}`}
                    isDisabled={isBlocked}
                    value={isBlocked ? 0 : (cart[ticket.id] ?? 0)}
                    maxValue={ingressosRestantes === undefined ? undefined : (cart[ticket.id] ?? 0) + ingressosRestantes}
                    onChange={(quantity) => onQuantityChange(ticket.id, quantity)}
                />
            </div>
        </div>
    );
};

/** Combo: um bundle de ingressos. A composição mostra o que vai ser emitido. Não conta para o limite por documento. */
const ComboRow = ({ combo, cart, onQuantityChange }: { combo: ComboItem; cart: Cart; onQuantityChange: (id: string, quantity: number) => void }) => (
    <div className={ROW}>
        <div className="flex items-center gap-2">
            <Ticket02 className="size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
            <p className="text-md font-semibold text-primary">{combo.name}</p>
        </div>
        <ComboComposition entries={combo.composicao} />
        <p className="text-sm text-tertiary">{combo.description}</p>
        <div className="flex items-center justify-between gap-3">
            <p className="text-md font-semibold text-primary">{formatBRL(combo.price)}</p>
            <QuantityStepper label={combo.name} value={cart[combo.id] ?? 0} onChange={(quantity) => onQuantityChange(combo.id, quantity)} />
        </div>
    </div>
);

/** Composição do combo — recuo com fio vertical à esquerda, como no design. */
export const ComboComposition = ({ entries }: { entries: ComboItem["composicao"] }) => (
    <ul className="mt-1 flex flex-col gap-2 border-l border-primary pl-2">
        {entries.map((entry, index) => (
            <li key={index} className="flex gap-2 text-sm">
                <span className="shrink-0 text-tertiary">{entry.quantity}x</span>
                <span className="flex min-w-0 flex-col">
                    <span className="text-secondary">
                        {entry.ticketName}
                        {entry.loteName && <span className="text-tertiary">{`, ${entry.loteName}`}</span>}
                    </span>
                    <span className="text-quaternary">{entry.date}</span>
                </span>
            </li>
        ))}
    </ul>
);
