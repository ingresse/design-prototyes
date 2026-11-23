import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Download01, Key01, Plus, Upload01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { BackstageLayout } from "../../components/Backstage";
import { CabecalhoDaFuncionalidade } from "../../components/cabecalho-da-funcionalidade";
import { CabecalhoDaPagina } from "../../components/cabecalho-da-pagina";
import { CampoNumero } from "../../components/campo-numero";
import { CampoDeCodigos, ComoCriarCodigos, ExemplosDeCodigos, exemplosDoGerador, lerLista, validarCodigos } from "../../components/como-criar-codigos";
import { useProtecaoDoPreenchido } from "../../components/painel-lateral";
import { gerarCodigos, LIMITE_DE_PASSKEYS_NO_EVENTO, usePasskeysDoEvento } from "../../components/passkeys-do-evento";
import { CarregandoTabela, VazioDaTabela } from "../../components/tabela";
import { useTextosItens } from "../../itens/data/textos-itens";
import { ImportarPlanilhaModal } from "../components/ImportarPlanilhaModal";
import {
    apagarRascunho,
    lerRascunho,
    MODELO_CSV,
    RASCUNHO_VAZIO,
    rascunhoAlterado,
    ROTA_CRIAR_PASSKEY,
    ROTA_LISTA_DE_PASSKEYS,
    ROTA_PASSKEY,
    ROTA_VINCULAR_ITENS,
    salvarRascunho,
    semCabecalho,
    type RascunhoDaPasskey,
} from "../data/rascunho";

/*
 * Passkey (chave-de-acesso/rules.md): sem Passkey, o vazio (CHA-01); com `?criar=1`, a criação
 * (CHA-10 a CHA-19, CHA-40). O passo "como criar" é o mesmo dos Cupons (`ComoCriarCodigos`).
 */

const T = {
    titulo: "Passkey",
    vazioTitulo: "Crie Passkeys para liberar ingressos ocultos",
    vazioTexto: "Com a Passkey, só quem tem o código ou chega por um link especial vê os itens ocultos.",
    criarPasskey: "Criar Passkey",
    criarEVincular: "Criar e vincular itens",
    comoCriar: "Escolha como quer criar suas Passkeys",
    automatico: "Criar automaticamente",
    automaticoDica: "Geramos os códigos com letras e números, sem símbolos e sem diferenciar maiúsculas de minúsculas.",
    manual: "Criar manualmente",
    manualDica: "Digite ou importe os seus códigos: só letras e números, sem espaço, acento ou símbolo.",
    limite: "Limite de uso (opcional)",
    limiteDica: "Quantas vezes cada Passkey pode ser usada.",
    ilimitado: "Ilimitado",
    quantidade: "Quantidade",
    quantidadePlaceholder: "Até 5.000",
    erroQuantidade: "Use até {n}: o evento pode ter no máximo 5 mil Passkeys.",
    prefixo: "Prefixo (opcional)",
    prefixoPlaceholder: "Ex.: sorteio",
    exemplos: "Exemplos dos códigos que serão gerados",
    seraoGeradas: { one: "{n} Passkey será criada.", other: "{n} Passkeys serão criadas." },
    passkeys: "Passkeys",
    passkeysPlaceholder: "Insira até 1.000 Passkeys separadas por vírgula.",
    importar: "Importar de planilha",
    modelo: "Baixar modelo de importação",
    descartarTitulo: "Descartar as Passkeys?",
    descartarTexto: "As Passkeys preenchidas ainda não foram criadas.",
};

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_MANUAL = 1000;

export function ChaveDeAcesso() {
    const [params] = useSearchParams();
    const criando = params.has("criar");
    const navigate = useNavigate();
    const { carregando, evento, passkeys } = usePasskeysDoEvento();

    // Evento que já tem Passkeys entra pela lista (CHA-02).
    if (!criando && !carregando && passkeys.length > 0) return <Navigate to={ROTA_LISTA_DE_PASSKEYS} replace />;

    return (
        <BackstageLayout activeSection="itens" activeItem="chave-de-acesso">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
                {carregando || !evento ? (
                    <>
                        <CabecalhoDaFuncionalidade titulo={T.titulo} />
                        <CarregandoTabela />
                    </>
                ) : criando ? (
                    <Criacao key={evento.id} eventoId={evento.id} codigosDoEvento={passkeys.map((p) => p.codigo)} />
                ) : (
                    <>
                        <CabecalhoDaFuncionalidade titulo={T.titulo} />
                        <VazioDaTabela
                            icone={Key01}
                            titulo={T.vazioTitulo}
                            texto={T.vazioTexto}
                            acao={
                                <Button color="primary" size="md" iconLeading={Plus} onClick={() => navigate(ROTA_CRIAR_PASSKEY)}>
                                    {T.criarPasskey}
                                </Button>
                            }
                        />
                    </>
                )}
            </div>
        </BackstageLayout>
    );
}

function Criacao({ eventoId, codigosDoEvento }: { eventoId: string; codigosDoEvento: string[] }) {
    const navigate = useNavigate();
    const { numero, plural } = useTextosItens();
    const [r, setR] = useState<RascunhoDaPasskey>(() => lerRascunho(eventoId) ?? RASCUNHO_VAZIO);
    const [importando, setImportando] = useState(false);
    const existentes = useMemo(() => new Set(codigosDoEvento), [codigosDoEvento.join(",")]);
    const mudar = (patch: Partial<RascunhoDaPasskey>) => setR((a) => ({ ...a, ...patch }));
    const alterado = rascunhoAlterado(r);

    // O rascunho fica na sessão: recarregar ou voltar de Vincular itens devolve o que foi preenchido (CHA-40).
    useEffect(() => {
        if (alterado) salvarRascunho(eventoId, r);
    }, [r, alterado, eventoId]);

    // Voltar: para a lista (com Passkeys) ou para o vazio; com algo preenchido, pergunta antes (UI-NAV-002).
    const destino = existentes.size > 0 ? ROTA_LISTA_DE_PASSKEYS : ROTA_PASSKEY;
    const protecao = useProtecaoDoPreenchido({
        alterado,
        avisarAoRecarregar: false,
        titulo: T.descartarTitulo,
        descricao: T.descartarTexto,
        onFechar: () => {
            apagarRascunho(eventoId);
            navigate(destino);
        },
    });

    const cabe = Math.max(0, LIMITE_DE_PASSKEYS_NO_EVENTO - existentes.size);
    const erroQuantidade = r.quantidade != null && r.quantidade > cabe ? T.erroQuantidade.replace("{n}", numero(cabe)) : undefined;
    const manual = useMemo(() => validarCodigos(lerLista(r.texto), existentes, MAX_MANUAL), [r.texto, existentes]);
    const valido = r.metodo === "automatico" ? !!r.quantidade && r.quantidade >= 1 && !erroQuantidade : r.metodo === "manual" ? !manual.bloqueia : false;

    const baixarModelo = () => {
        const url = URL.createObjectURL(new Blob(["﻿" + MODELO_CSV], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "Modelo de importação de Passkeys.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    /** Monta os códigos e segue para o vínculo; a gravação acontece ao salvar os itens (CHA-22). */
    const criarEVincular = () => {
        if (!valido) return;
        const codigos = r.metodo === "automatico" ? gerarCodigos(r.quantidade!, r.prefixo, existentes) : manual.validos;
        const limite = (r.metodo === "automatico" ? r.limite : r.limiteManual) ?? null;
        navigate(ROTA_VINCULAR_ITENS, { state: { codigos, limite } });
    };

    const limite = (valor: number | undefined, onChange: (v: number | undefined) => void) => (
        <CampoNumero label={T.limite} placeholder={T.ilimitado} valor={valor} vazio minimo={1} onChange={onChange} hint={T.limiteDica} />
    );

    return (
        <>
            <CabecalhoDaPagina
                voltar={{ rotulo: T.titulo, onClick: protecao.pedirParaFechar }}
                titulo={T.titulo}
                acoes={
                    <Button size="md" color="primary" isDisabled={!valido} onClick={criarEVincular}>
                        {T.criarEVincular}
                    </Button>
                }
            />

            <div className="flex w-full max-w-3xl flex-col gap-4">
                <h2 className="text-lg font-semibold text-primary">{T.comoCriar}</h2>
                <ComoCriarCodigos
                    rotulo={T.comoCriar}
                    metodo={r.metodo}
                    onMetodo={(metodo) => mudar({ metodo })}
                    opcoes={[
                        {
                            id: "automatico",
                            titulo: T.automatico,
                            dica: T.automaticoDica,
                            conteudo: (
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        {limite(r.limite, (v) => mudar({ limite: v }))}
                                        <CampoNumero
                                            label={T.quantidade}
                                            isRequired
                                            placeholder={T.quantidadePlaceholder}
                                            valor={r.quantidade}
                                            vazio
                                            minimo={1}
                                            onChange={(v) => mudar({ quantidade: v })}
                                            isInvalid={!!erroQuantidade}
                                            hint={erroQuantidade ?? (r.quantidade ? plural(T.seraoGeradas, r.quantidade) : undefined)}
                                        />
                                        <Input label={T.prefixo} placeholder={T.prefixoPlaceholder} value={r.prefixo} onChange={(prefixo) => mudar({ prefixo })} maxLength={20} />
                                    </div>
                                    <ExemplosDeCodigos titulo={T.exemplos} exemplos={exemplosDoGerador(r.prefixo, ALFABETO, (base) => Math.max(4, 8 - base.length))} />
                                </div>
                            ),
                        },
                        {
                            id: "manual",
                            titulo: T.manual,
                            dica: T.manualDica,
                            conteudo: (
                                <div className="flex flex-col gap-4">
                                    <div className="sm:max-w-56">{limite(r.limiteManual, (v) => mudar({ limiteManual: v }))}</div>
                                    <CampoDeCodigos
                                        rotulo={T.passkeys}
                                        placeholder={T.passkeysPlaceholder}
                                        texto={r.texto}
                                        onTexto={(texto) => mudar({ texto })}
                                        existentes={existentes}
                                        limite={MAX_MANUAL}
                                        nome={{ one: "Passkey", other: "Passkeys" }}
                                        feminino
                                        acoes={
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button size="sm" color="secondary" iconLeading={Upload01} onClick={() => setImportando(true)}>
                                                    {T.importar}
                                                </Button>
                                                <Button size="sm" color="link-color" iconLeading={Download01} onClick={baixarModelo}>
                                                    {T.modelo}
                                                </Button>
                                            </div>
                                        }
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </div>

            <ImportarPlanilhaModal
                isOpen={importando}
                onClose={() => setImportando(false)}
                onImport={(codigos) => {
                    setImportando(false);
                    // A planilha soma ao que já foi digitado (antes, substituía).
                    const novos = semCabecalho(codigos);
                    mudar({ texto: [...lerLista(r.texto), ...novos].join(", ") });
                }}
            />
            {protecao.confirmacao}
        </>
    );
}
