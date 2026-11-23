import { type FC, type ReactNode, useEffect, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { cx } from "@/utils/cx";

/*
 * Listas e tabelas do Backstage (BKS-110 a BKS-118), as peças comuns:
 *
 *   <BarraDaLista busca={…} filtro={<ButtonGroup …/>} />
 *   <CartaoDaTabela>
 *       <CabecalhoDaTabela>…colunas (spans com largura)…</CabecalhoDaTabela>
 *       <ul className="divide-y divide-secondary"><LinhaDaTabela>…</LinhaDaTabela></ul>
 *       <RodapeDePaginacao {...paginacao} />
 *   </CartaoDaTabela>
 *
 * Tabela ou lista depende da largura do CARTÃO, não da tela: com 44rem (704 px) ou mais é tabela;
 * mais estreito, cada linha vira um bloco com o rótulo ao lado de cada valor (`Celula`). Nas linhas,
 * use as classes literais `@min-[44rem]:…` para o modo tabela (o Tailwind precisa delas no código).
 * Tabela larga (relatórios) usa a tabela-lista de `relatorios/components/TabelaLista.tsx`.
 */

/** Busca à esquerda (até 320 px) e filtros de status à direita; empilha no celular. */
export function BarraDaLista({
    busca,
    filtro,
    children,
    className,
}: {
    busca?: { valor: string; onChange: (v: string) => void; placeholder: string; rotulo?: string };
    /** Filtro de status: botões segmentados (ButtonGroup) do DS. */
    filtro?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        // Empilha pela largura da própria barra, não da tela: com o menu lateral aberto a barra é estreita
        // numa tela larga, e a busca ficava espremida ao lado dos filtros. Em linha, a busca tem no mínimo
        // 224 px e os filtros descem para a linha de baixo quando não cabem.
        <div className={cx("@container", className)}>
            <div className="flex flex-col gap-3 @min-[36rem]:flex-row @min-[36rem]:flex-wrap @min-[36rem]:items-center @min-[36rem]:justify-between">
                {busca && (
                    <InputBase
                        size="sm"
                        icon={SearchLg}
                        aria-label={busca.rotulo ?? busca.placeholder}
                        placeholder={busca.placeholder}
                        value={busca.valor}
                        onChange={(v: unknown) => busca.onChange(typeof v === "string" ? v : ((v as { target?: { value?: string } })?.target?.value ?? ""))}
                        wrapperClassName="w-full @min-[36rem]:max-w-80 @min-[36rem]:min-w-56 @min-[36rem]:flex-1"
                    />
                )}
                {(filtro || children) && (
                    <div className="flex flex-wrap items-center gap-3 @min-[36rem]:ml-auto">
                        {filtro}
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

/** O cartão da tabela: borda e fundo do DS; é o contêiner que decide tabela ou lista (@container). */
export function CartaoDaTabela({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cx("@container overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary", className)}>{children}</div>;
}

/**
 * Cabeçalho das colunas: só no modo tabela. Fundo suave, sm, terciário. Os filhos são as colunas,
 * com as mesmas larguras das células das linhas. Com ordenação (SortableHeader), passe `ordenavel`
 * para os botões ficarem acessíveis.
 */
export function CabecalhoDaTabela({ children, ordenavel = false, className }: { children: ReactNode; ordenavel?: boolean; className?: string }) {
    return (
        <div
            aria-hidden={ordenavel ? undefined : true}
            className={cx(
                "hidden items-center gap-4 border-b border-secondary bg-secondary_subtle px-5 py-3 text-sm font-medium whitespace-nowrap text-tertiary @min-[44rem]:flex md:px-6",
                className,
            )}
        >
            {children}
        </div>
    );
}

/** Linha: 12 px em cima e embaixo, recuo do cartão; reage ao mouse quando abre algo. */
export function LinhaDaTabela({
    children,
    interativa = false,
    selecionada = false,
    className,
}: {
    children: ReactNode;
    interativa?: boolean;
    selecionada?: boolean;
    className?: string;
}) {
    return (
        <li
            className={cx(
                "flex items-start gap-4 px-5 py-3 @min-[44rem]:items-center md:px-6",
                interativa && "transition duration-100 ease-linear hover:bg-primary_hover",
                selecionada && "bg-secondary_subtle",
                className,
            )}
        >
            {children}
        </li>
    );
}

/** Coluna principal: título em negrito e uma linha de apoio. */
export function TituloDaLinha({ titulo, apoio, className }: { titulo: ReactNode; apoio?: ReactNode; className?: string }) {
    return (
        <div className={cx("flex min-w-0 flex-1 flex-col", className)}>
            <span className="truncate text-sm font-semibold text-primary">{titulo}</span>
            {apoio && <span className="truncate text-sm text-tertiary">{apoio}</span>}
        </div>
    );
}

/** Um valor: no modo lista leva o rótulo ao lado; no modo tabela o rótulo vai para leitor de tela. Números à direita. */
export function Celula({ rotulo, children, numero = false, className }: { rotulo: string; children: ReactNode; numero?: boolean; className?: string }) {
    return (
        <div className={cx("flex items-baseline gap-1 text-sm text-primary @min-[44rem]:block", numero && "tabular-nums @min-[44rem]:text-right", className)}>
            <span className="text-tertiary @min-[44rem]:sr-only">{rotulo}: </span>
            {children}
        </div>
    );
}

/** Carregando: linhas pulsando no lugar da tabela. */
export function CarregandoTabela({ linhas = 3, rotulo = "Carregando..." }: { linhas?: number; rotulo?: string }) {
    return (
        <div role="status" aria-label={rotulo} className="flex flex-col gap-3">
            {Array.from({ length: linhas }, (_, i) => (
                <span key={i} aria-hidden="true" className="h-16 w-full animate-pulse rounded-xl bg-secondary motion-reduce:animate-none" />
            ))}
        </div>
    );
}

/** Lista vazia: o estado vazio do DS, centrado, com a ação principal. */
export function VazioDaTabela({ icone, titulo, texto, acao }: { icone: FC<{ className?: string }>; titulo: string; texto?: string; acao?: ReactNode }) {
    return (
        <div className="flex items-center justify-center py-16">
            <EmptyState size="sm">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={icone} color="gray" theme="modern" />
                </EmptyState.Header>
                <EmptyState.Content>
                    {/* O título do vazio do DS é um h1; a página já tem o seu (BKS-100), então ele vale como nível 2. */}
                    <EmptyState.Title role="heading" aria-level={2}>
                        {titulo}
                    </EmptyState.Title>
                    {texto && <EmptyState.Description>{texto}</EmptyState.Description>}
                </EmptyState.Content>
                {acao && <EmptyState.Footer>{acao}</EmptyState.Footer>}
            </EmptyState>
        </div>
    );
}

/** Busca ou filtro sem resultado, dentro do cartão: diz o que não achou e oferece limpar. */
export function SemResultados({ texto, onLimpar }: { texto: string; onLimpar?: () => void }) {
    // role="status": a busca ou o filtro sem resultado é anunciado pelo leitor de tela (BKS-126). A região
    // nasce vazia e recebe o texto logo depois, porque região viva que já nasce com texto nem sempre é lida.
    const [anuncio, setAnuncio] = useState("");
    useEffect(() => setAnuncio(texto), [texto]);
    return (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center md:px-6">
            <p role="status" className="min-h-5 text-sm text-tertiary">
                {anuncio}
            </p>
            {onLimpar && (
                <Button color="secondary" size="sm" onClick={onLimpar}>
                    Limpar busca
                </Button>
            )}
        </div>
    );
}
