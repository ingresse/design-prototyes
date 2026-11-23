import type { ReactNode } from "react";
import { Tag01 } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { CampoNumero } from "../../components/campo-numero";
import { CampoData, CampoHora } from "../../components/campos-de-data-e-hora";
import { CampoPreco } from "../../itens/components/comuns";
import type { ErrosDasRegras, RegrasDoCupom } from "../data/cupons";

/*
 * Regras do cupom (passo 2 da criação e "Editar cupom"): Desconto, Limite de uso e Período de validade,
 * com os textos de produção. `restrito`: cupom já usado, sem Desconto nem Data inicial (CUP-14).
 */

const T = {
    desconto: "Desconto",
    percentual: "Percentual",
    fixo: "Valor fixo",
    valor: "Valor do desconto",
    limites: "Limite de uso",
    porItens: "Por itens",
    porItensDica: "Quantos itens, em todo o evento, podem receber este desconto.",
    porComprador: "Por comprador",
    porCompradorDica: "Quantas vezes cada pessoa pode usar este cupom.",
    porCompra: "Por itens da compra",
    porCompraDica: "Em quantos itens da compra o desconto pode ser aplicado.",
    ilimitado: "Ilimitado",
    validade: "Período de validade",
    dataInicial: "Data inicial",
    horaInicial: "Hora inicial",
    dataFinal: "Data final (opcional)",
    horaFinal: "Hora final",
};

const Secao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
    <section className="flex flex-col gap-4">
        <h3 className="text-md font-semibold text-primary">{titulo}</h3>
        {children}
    </section>
);

export function FormularioDeRegras({
    regras,
    onChange,
    erros,
    mostrarErros,
    restrito = false,
}: {
    regras: RegrasDoCupom;
    onChange: (r: RegrasDoCupom) => void;
    erros: ErrosDasRegras;
    mostrarErros: boolean;
    restrito?: boolean;
}) {
    const mudar = (patch: Partial<RegrasDoCupom>) => onChange({ ...regras, ...patch });
    const erro = (k: keyof ErrosDasRegras) => (mostrarErros ? erros[k] : undefined);

    return (
        <div className="flex flex-col gap-8">
            {!restrito && (
                <Secao titulo={T.desconto}>
                    <ButtonGroup
                        size="sm"
                        aria-label={T.desconto}
                        selectedKeys={new Set([regras.tipoDesconto])}
                        onSelectionChange={(k) => {
                            const v = [...k][0] as RegrasDoCupom["tipoDesconto"] | undefined;
                            // Trocar o tipo limpa o valor, como em produção.
                            if (v && v !== regras.tipoDesconto) mudar({ tipoDesconto: v, valor: undefined });
                        }}
                        disallowEmptySelection
                    >
                        <ButtonGroupItem id="percentual">{T.percentual}</ButtonGroupItem>
                        <ButtonGroupItem id="fixo">{T.fixo}</ButtonGroupItem>
                    </ButtonGroup>
                    <div className="sm:max-w-60">
                        {regras.tipoDesconto === "percentual" ? (
                            <CampoNumero
                                label={T.valor}
                                isRequired
                                icon={Tag01}
                                placeholder="0%"
                                valor={regras.valor}
                                vazio
                                onChange={(v) => mudar({ valor: v == null ? undefined : Math.min(v, 999) })}
                                isInvalid={!!erro("valor")}
                                hint={erro("valor") ?? (regras.valor != null ? `${regras.valor}% de desconto` : undefined)}
                            />
                        ) : (
                            <CampoPreco label={T.valor} isRequired opcional valor={regras.valor} onChange={(v) => mudar({ valor: v })} isInvalid={!!erro("valor")} hint={erro("valor")} placeholder="0,00" />
                        )}
                    </div>
                </Secao>
            )}

            <Secao titulo={T.limites}>
                <div className="grid gap-4 sm:grid-cols-3">
                    <CampoNumero label={T.porItens} placeholder={T.ilimitado} valor={regras.limiteItens} vazio minimo={1} onChange={(v) => mudar({ limiteItens: v })} hint={T.porItensDica} />
                    <CampoNumero
                        label={T.porComprador}
                        placeholder={T.ilimitado}
                        valor={regras.limitePorComprador}
                        vazio
                        minimo={1}
                        onChange={(v) => mudar({ limitePorComprador: v })}
                        isInvalid={!!erros.limitePorComprador}
                        hint={erros.limitePorComprador ?? T.porCompradorDica}
                    />
                    <CampoNumero label={T.porCompra} placeholder={T.ilimitado} valor={regras.limiteItensPorCompra} vazio minimo={1} onChange={(v) => mudar({ limiteItensPorCompra: v })} hint={T.porCompraDica} />
                </div>
            </Secao>

            <Secao titulo={T.validade}>
                {!restrito && (
                    <div className="grid grid-cols-[1fr_auto] gap-3 sm:max-w-md">
                        <CampoData label={T.dataInicial} isRequired valor={regras.inicioData} onChange={(v) => mudar({ inicioData: v })} isInvalid={!!erro("inicio")} hint={erro("inicio")} />
                        <div className="w-28">
                            <CampoHora label={T.horaInicial} valor={regras.inicioHora} onChange={(v) => mudar({ inicioHora: v })} />
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-3 sm:max-w-md">
                    <CampoData label={T.dataFinal} valor={regras.fimData} minimo={regras.inicioData || undefined} onChange={(v) => mudar({ fimData: v })} isInvalid={!!erros.fim} hint={erros.fim} />
                    <div className="w-28">
                        <CampoHora label={T.horaFinal} valor={regras.fimHora} onChange={(v) => mudar({ fimHora: v })} />
                    </div>
                </div>
            </Secao>
        </div>
    );
}
