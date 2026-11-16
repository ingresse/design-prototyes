import { ArrowLeft, ArrowRight } from "@untitledui/icons";
import { Pagination } from "@/components/application/pagination/pagination-base";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/*
 * Pagination do DS, variante "Page minimal center aligned", como no Figma (Finanças - AWA):
 * Anterior · números · Próxima, com 16px de padding em todos os lados.
 *
 * Lacuna do DS: `PaginationPageMinimalCenter` traz "Previous" e "Next" fixos em inglês e padding
 * próprio. Como o DS não é editado por protótipo, esta é a mesma composição, com as mesmas peças
 * (`Pagination` base e `Button`), em português.
 */
export const Paginacao = ({ pagina, total, aoMudar }: { pagina: number; total: number; aoMudar: (pagina: number) => void }) => (
    <Pagination.Root page={pagina} total={total} onPageChange={aoMudar} className="flex w-full items-center justify-between gap-3 border-t border-secondary p-4">
        <div className="flex flex-1 justify-start">
            <Pagination.PrevTrigger asChild>
                <Button iconLeading={ArrowLeft} color="secondary" size="sm">
                    Anterior
                </Button>
            </Pagination.PrevTrigger>
        </div>
        <Pagination.Context>
            {({ pages }) => (
                <div className="flex justify-center gap-0.5">
                    {pages.map((p, i) =>
                        p.type === "page" ? (
                            <Pagination.Item
                                key={i}
                                value={p.value}
                                isCurrent={p.isCurrent}
                                className={({ isSelected }) =>
                                    cx(
                                        "flex size-9 cursor-pointer items-center justify-center rounded-lg p-3 text-sm font-medium text-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-secondary focus-visible:z-10 focus-visible:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2",
                                        isSelected && "bg-primary_hover text-secondary",
                                    )
                                }
                            >
                                {p.value}
                            </Pagination.Item>
                        ) : (
                            <Pagination.Ellipsis key={i} className="flex size-9 shrink-0 items-center justify-center text-tertiary">
                                &#8230;
                            </Pagination.Ellipsis>
                        ),
                    )}
                </div>
            )}
        </Pagination.Context>
        <div className="flex flex-1 justify-end">
            <Pagination.NextTrigger asChild>
                <Button iconTrailing={ArrowRight} color="secondary" size="sm">
                    Próxima
                </Button>
            </Pagination.NextTrigger>
        </div>
    </Pagination.Root>
);
