import { Link } from "react-router";
import { FUNCIONALIDADES, type Funcionalidade } from "./grupos-do-evento";

/*
 * Atalhos de Ingressos e produtos (BKS-119): as funcionalidades que só mexem com ingressos e produtos,
 * em botões baixos entre o título e as abas (BKS-135). É por aqui que elas abrem (não há mais centrais): nome,
 * frase e ícone vêm de FUNCIONALIDADES (grupos-do-evento.ts), e as telas delas voltam para Ingressos e produtos.
 */

/** Na ordem do trabalho: quando e como vende, o que o comprador responde, quem vê e por quanto, como aparece. */
const IDS = ["abertura", "regras", "lotes-sincronizados", "questionario", "passkey", "cupons", "etiquetas"];

const funcionalidades: Funcionalidade[] = IDS.map((id) => FUNCIONALIDADES.find((f) => f.id === id)).filter((f): f is Funcionalidade => !!f);

export function AtalhosDosItens() {
    return (
        <nav aria-label="Funcionalidades dos ingressos e produtos" className="@container">
            {/* O cartão de antes (BKS-119) em versão compacta (BKS-135): 80 px de altura, nome e uma linha da frase, a
                ilustração de linha fina no canto. Grade sem rolagem lateral: 4 colunas quando a área passa de 768 px, 2
                abaixo disso; abaixo de 448 px, só o nome, na largura toda. O ícone fica no canto de cima à direita e o texto
                alinhado pelo topo, com o nome inteiro em até duas linhas; abaixo de 352 px, o nome em Text sm.
                A frase fica no `title` e para o leitor de tela. */}
            <ul className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4">
                {funcionalidades.map((f) => (
                    <li key={f.id} className="flex">
                        <Link
                            to={f.href}
                            title={f.descricao}
                            className="group relative isolate flex min-h-20 w-full cursor-pointer flex-col justify-start gap-0.5 overflow-hidden rounded-xl bg-brand-section px-4 py-3 outline-focus-ring transition-colors duration-150 ease-linear hover:bg-brand-section_subtle dark:hover:bg-secondary_hover @max-[22rem]:px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <f.icone
                                aria-hidden="true"
                                className="pointer-events-none absolute top-0.5 right-1 size-10 text-tertiary_on-brand transition-transform duration-200 ease-out group-hover:translate-y-0.5 group-hover:rotate-6 motion-reduce:transition-none [&_*]:[stroke-width:1.25px] [&_*]:[vector-effect:non-scaling-stroke]"
                            />
                            <span className="relative line-clamp-2 max-w-[85%] text-md font-semibold text-balance text-primary_on-brand @max-[28rem]:max-w-none @max-[22rem]:text-sm @max-[22rem]:tracking-tight">{f.nome}</span>
                            <span className="relative max-w-[72%] truncate text-sm text-secondary_on-brand @max-[28rem]:sr-only">{f.descricao}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
