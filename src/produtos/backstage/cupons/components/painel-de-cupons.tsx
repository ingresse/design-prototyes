import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Download01, Upload01 } from "@untitledui/icons";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { FileTrigger } from "@/components/base/file-upload-trigger/file-upload-trigger";
import { Input } from "@/components/base/input/input";
import { novoId, type Cupom, type Evento } from "@/plataforma";
import { combosDoEvento, SeletorDeVinculos, useResumoDosVinculos, useVinculos } from "../../components/arvore-de-vinculos";
import { CampoNumero } from "../../components/campo-numero";
import { CampoDeCodigos, ComoCriarCodigos, ExemplosDeCodigos, lerLista, validarCodigos, type MetodoDeCriacao } from "../../components/como-criar-codigos";
import { PainelLateral, useProtecaoDoPreenchido } from "../../components/painel-lateral";
import { useTextosItens } from "../../itens/data/textos-itens";
import {
    exemplosDoPrefixo,
    fimDasRegras,
    gerarCodigos,
    inicioDasRegras,
    lerArquivoDeCodigos,
    LIMITE_AUTOMATICO,
    LIMITE_MANUAL,
    MODELO_CSV,
    regrasDoCupom,
    salvarCupons,
    validarRegras,
    type RegrasDoCupom,
} from "../data/cupons";
import { FormularioDeRegras } from "./formulario-de-regras";

/*
 * Painel lateral dos cupons (cupons/rules.md): criar em três etapas (como criar, regras, ingressos),
 * com "Etapa N de 3" e nada gravado até "Criar cupons" (CUP-60); editar as regras de um cupom; editar
 * ou adicionar vínculos. Título em português (E9) e proteção do preenchido (CUP-63).
 */

export type PainelDeCupom = { tipo: "criar" } | { tipo: "regras"; id: string } | { tipo: "vinculos"; ids: string[]; modo: "substituir" | "adicionar" };

const T = {
    etapa: "Etapa {n} de 3",
    comoCriar: "Como quer criar os seus cupons?",
    automatico: "Criar automaticamente",
    automaticoDica: "Geramos os códigos com letras e números, sem símbolos e sem diferenciar maiúsculas de minúsculas.",
    quantidade: "Quantidade",
    quantidadePlaceholder: "Até 5.000",
    erroQuantidade: "A quantidade máxima por criação automática é 5.000 cupons.",
    seraoGerados: { one: "{n} cupom será criado.", other: "{n} cupons serão criados." },
    prefixo: "Prefixo (opcional)",
    prefixoPlaceholder: "Ex.: sorteio",
    exemplos: "Exemplos dos cupons que serão gerados",
    manual: "Criar manualmente",
    manualDica: "Digite ou importe os seus códigos: só letras e números, sem espaço, acento ou símbolo.",
    cupons: "Cupons",
    cuponsPlaceholder: "Insira aqui até 1.000 cupons separados por vírgula.",
    importar: "Importar cupons",
    modelo: "Baixar modelo de importação",
    arquivoGrande: "Número de cupons acima do limite permitido",
    arquivoGrandeTexto: "O arquivo enviado tinha mais de 1.000 cupons. Para garantir o funcionamento correto, apenas os 1.000 primeiros foram importados.",
    erroArquivo: "Erro ao processar o arquivo. Verifique o formato e tente novamente.",
    proxima: "Continuar",
    regrasTitulo: "Quais são as regras do cupom?",
    vinculosTitulo: "Quais ingressos fazem parte deste cupom?",
    arvore: "Ingressos do cupom",
    criarCupons: { one: "Criar cupom", other: "Criar {n} cupons" },
    criados: { one: "Cupom criado.", other: "{n} cupons criados." },
    erroCriar: "Erro ao criar cupons. Tente novamente.",
    associar: "Associar ingressos",
    associados: "Ingressos associados com sucesso!",
    erroAssociar: "Erro ao associar ingressos. Tente novamente.",
    semIngressos: "Nenhum ingresso encontrado para este evento",
    editarTitulo: "Editar regras do cupom",
    restrito: "Este cupom já foi utilizado. Nesse caso, somente os limites de uso e a data final podem ser alterados.",
    salvarRegras: "Salvar regras",
    erroAtualizar: "Erro ao atualizar cupons. Tente novamente.",
    regrasSalvas: "Regras do cupom salvas.",
    cancelar: "Cancelar",
    voltar: "Voltar",
    descartarTitulo: "Descartar o que você preencheu?",
    descartarTexto: "Os cupons ainda não foram criados.",
    descartarEdicao: "As alterações ainda não foram salvas.",
};

export function PainelDeCupons({ painel, evento, onFechar }: { painel: PainelDeCupom; evento: Evento; onFechar: () => void }) {
    if (painel.tipo === "criar") return <CriarCupons evento={evento} onFechar={onFechar} />;
    if (painel.tipo === "regras") return <EditarRegras evento={evento} cupom={(evento.cupons ?? []).find((c) => c.id === painel.id)} onFechar={onFechar} />;
    return <EditarVinculos evento={evento} ids={painel.ids} modo={painel.modo} onFechar={onFechar} />;
}

const Rodape = ({ children, apoio }: { children: ReactNode; apoio?: ReactNode }) => (
    <SlideoutMenu.Footer className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-tertiary" role="status">
            {apoio}
        </span>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">{children}</div>
    </SlideoutMenu.Footer>
);

/** Criar: três etapas no mesmo painel; tudo fica na memória até "Criar cupons". */
function CriarCupons({ evento, onFechar }: { evento: Evento; onFechar: () => void }) {
    const { numero, plural, preco } = useTextosItens();
    const resumir = useResumoDosVinculos();
    const cupons = evento.cupons ?? [];
    const existentes = useMemo(() => new Set(cupons.map((c) => c.codigo)), [cupons]);
    const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
    // Etapa 1
    const [metodo, setMetodo] = useState<MetodoDeCriacao | null>(null);
    const [quantidade, setQuantidade] = useState<number>();
    const [prefixo, setPrefixo] = useState("");
    const [texto, setTexto] = useState("");
    const [avisoArquivo, setAvisoArquivo] = useState(false);
    const [codigos, setCodigos] = useState<string[]>([]);
    // Etapa 2
    const [regras, setRegras] = useState<RegrasDoCupom>(() => regrasDoCupom());
    const [tentouRegras, setTentouRegras] = useState(false);
    // Etapa 3
    const vinculos = useVinculos(evento);
    const combos = useMemo(() => combosDoEvento(evento, preco), [evento, preco]);
    const [gravando, setGravando] = useState(false);

    const alterado = !!metodo || vinculos.alterado;
    const protecao = useProtecaoDoPreenchido({ alterado, onFechar, titulo: T.descartarTitulo, descricao: T.descartarTexto });

    const manual = useMemo(() => validarCodigos(lerLista(texto), existentes, LIMITE_MANUAL), [texto, existentes]);
    const erroQuantidade = quantidade != null && quantidade > LIMITE_AUTOMATICO ? T.erroQuantidade : undefined;
    const metodoValido = metodo === "automatico" ? !!quantidade && quantidade >= 1 && !erroQuantidade : metodo === "manual" ? !manual.bloqueia : false;
    const errosRegras = validarRegras(regras);

    const importar = async (arquivos: FileList | null) => {
        const f = arquivos?.[0];
        if (!f) return;
        try {
            const { codigos: lidos, passou } = lerArquivoDeCodigos(await f.text());
            // O arquivo soma ao que já foi digitado.
            setTexto([...lerLista(texto), ...lidos].join(", "));
            setAvisoArquivo(passou);
        } catch {
            toast.error(T.erroArquivo);
        }
    };

    const baixarModelo = () => {
        const url = URL.createObjectURL(new Blob(["﻿" + MODELO_CSV], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "Modelo de importação de cupons.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const avancar = () => {
        if (etapa === 1) {
            if (!metodoValido) return;
            setCodigos(metodo === "automatico" ? gerarCodigos(quantidade!, prefixo, existentes) : manual.validos);
            setEtapa(2);
        } else if (etapa === 2) {
            setTentouRegras(true);
            if (Object.keys(errosRegras).length) return;
            setEtapa(3);
        }
    };

    const criar = async () => {
        const r = vinculos.resultado();
        const vinc = [...r.lotes.map((id) => ({ tipo: "lote" as const, id })), ...r.combos.map((id) => ({ tipo: "combo" as const, id }))];
        const agora = new Date().toISOString();
        const novos: Cupom[] = codigos.map((codigo) => ({
            id: novoId("cup"),
            codigo,
            ativo: true,
            tipoDesconto: regras.tipoDesconto,
            valor: regras.valor!,
            usos: 0,
            limiteItens: regras.limiteItens,
            limitePorComprador: regras.limitePorComprador,
            limiteItensPorCompra: regras.limiteItensPorCompra,
            inicio: inicioDasRegras(regras),
            fim: fimDasRegras(regras),
            vinculos: vinc,
            criadoEm: agora,
        }));
        setGravando(true);
        try {
            // Mais novo primeiro, como a lista de produção.
            await salvarCupons(evento, [...novos.reverse(), ...cupons]);
            toast.success(plural(T.criados, novos.length));
            onFechar();
        } catch {
            toast.error(T.erroCriar);
        } finally {
            setGravando(false);
        }
    };

    const titulo = etapa === 1 ? T.comoCriar : etapa === 2 ? T.regrasTitulo : T.vinculosTitulo;

    return (
        <PainelLateral titulo={titulo} subtitulo={T.etapa.replace("{n}", String(etapa))} aoFechar={protecao.pedirParaFechar} fechaClicandoFora={protecao.fechaClicandoFora} largura="md:max-w-[682px]">
            <SlideoutMenu.Content className="pb-6">
                {etapa === 1 && (
                    <ComoCriarCodigos
                        rotulo={T.comoCriar}
                        metodo={metodo}
                        onMetodo={setMetodo}
                        opcoes={[
                            {
                                id: "automatico",
                                titulo: T.automatico,
                                dica: T.automaticoDica,
                                conteudo: (
                                    <div className="flex flex-col gap-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <CampoNumero
                                                label={T.quantidade}
                                                isRequired
                                                placeholder={T.quantidadePlaceholder}
                                                valor={quantidade}
                                                vazio
                                                minimo={1}
                                                onChange={setQuantidade}
                                                isInvalid={!!erroQuantidade}
                                                hint={erroQuantidade ?? (quantidade ? plural(T.seraoGerados, quantidade) : undefined)}
                                            />
                                            <Input label={T.prefixo} placeholder={T.prefixoPlaceholder} value={prefixo} onChange={setPrefixo} maxLength={20} />
                                        </div>
                                        <ExemplosDeCodigos titulo={T.exemplos} exemplos={exemplosDoPrefixo(prefixo)} />
                                    </div>
                                ),
                            },
                            {
                                id: "manual",
                                titulo: T.manual,
                                dica: T.manualDica,
                                conteudo: (
                                    <CampoDeCodigos
                                        rotulo={T.cupons}
                                        placeholder={T.cuponsPlaceholder}
                                        texto={texto}
                                        onTexto={setTexto}
                                        existentes={existentes}
                                        limite={LIMITE_MANUAL}
                                        nome={{ one: "cupom", other: "cupons" }}
                                        acoes={
                                            <>
                                                {avisoArquivo && <AlertFloating color="warning" title={T.arquivoGrande} description={T.arquivoGrandeTexto} onClose={() => setAvisoArquivo(false)} dismissLabel="Fechar" />}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <FileTrigger acceptedFileTypes={[".csv", ".txt", "text/csv", "text/plain"]} onSelect={(f) => void importar(f)}>
                                                        <Button color="secondary" size="sm" iconLeading={Upload01}>
                                                            {T.importar}
                                                        </Button>
                                                    </FileTrigger>
                                                    <Button color="link-color" size="sm" iconLeading={Download01} onClick={baixarModelo}>
                                                        {T.modelo}
                                                    </Button>
                                                </div>
                                            </>
                                        }
                                    />
                                ),
                            },
                        ]}
                    />
                )}
                {etapa === 2 && <FormularioDeRegras regras={regras} onChange={setRegras} erros={errosRegras} mostrarErros={tentouRegras} />}
                {etapa === 3 && <SeletorDeVinculos vinculos={vinculos} rotulo={T.arvore} combos={combos} comConferir vazio={<p className="py-6 text-center text-sm text-tertiary">{T.semIngressos}</p>} />}
            </SlideoutMenu.Content>
            <Rodape apoio={etapa === 3 ? resumir(vinculos) : etapa === 2 ? plural(T.seraoGerados, codigos.length) : undefined}>
                <Button color="secondary" size="md" onClick={() => (etapa === 1 ? protecao.pedirParaFechar() : setEtapa((etapa - 1) as 1 | 2))}>
                    {etapa === 1 ? T.cancelar : T.voltar}
                </Button>
                {etapa < 3 ? (
                    <Button color="primary" size="md" isDisabled={etapa === 1 && !metodoValido} onClick={avancar}>
                        {T.proxima}
                    </Button>
                ) : (
                    <Button color="primary" size="md" isDisabled={vinculos.vazio} isLoading={gravando} showTextWhileLoading onClick={() => void criar()}>
                        {plural(T.criarCupons, codigos.length, { n: numero(codigos.length) })}
                    </Button>
                )}
            </Rodape>
            {protecao.confirmacao}
        </PainelLateral>
    );
}

/** "Editar cupom": as regras, com o aviso de cupom já usado. */
function EditarRegras({ evento, cupom, onFechar }: { evento: Evento; cupom?: Cupom; onFechar: () => void }) {
    const [inicial] = useState(() => regrasDoCupom(cupom));
    const [regras, setRegras] = useState<RegrasDoCupom>(inicial);
    const [tentou, setTentou] = useState(false);
    const [gravando, setGravando] = useState(false);
    const restrito = !!cupom && cupom.usos > 0;
    const erros = validarRegras(regras, restrito);
    const protecao = useProtecaoDoPreenchido({ alterado: JSON.stringify(regras) !== JSON.stringify(inicial), onFechar, titulo: T.descartarTitulo, descricao: T.descartarEdicao });

    const gravar = async () => {
        setTentou(true);
        if (!cupom || Object.keys(erros).length) return;
        setGravando(true);
        try {
            const limites = { limiteItens: regras.limiteItens, limitePorComprador: regras.limitePorComprador, limiteItensPorCompra: regras.limiteItensPorCompra, fim: fimDasRegras(regras) };
            const editado: Cupom = restrito ? { ...cupom, ...limites } : { ...cupom, ...limites, tipoDesconto: regras.tipoDesconto, valor: regras.valor!, inicio: inicioDasRegras(regras) };
            await salvarCupons(evento, (evento.cupons ?? []).map((c) => (c.id === cupom.id ? editado : c)));
            toast.success(T.regrasSalvas);
            onFechar();
        } catch {
            toast.error(T.erroAtualizar);
        } finally {
            setGravando(false);
        }
    };

    return (
        <PainelLateral titulo={T.editarTitulo} subtitulo={cupom?.codigo} aoFechar={protecao.pedirParaFechar} fechaClicandoFora={protecao.fechaClicandoFora} largura="md:max-w-[682px]">
            <SlideoutMenu.Content className="pb-6">
                {restrito && <AlertFloating color="warning" title="Cupom já utilizado" description={T.restrito} />}
                <FormularioDeRegras regras={regras} onChange={setRegras} erros={erros} mostrarErros={tentou} restrito={restrito} />
            </SlideoutMenu.Content>
            <Rodape>
                <Button color="secondary" size="md" onClick={protecao.pedirParaFechar}>
                    {T.cancelar}
                </Button>
                <Button color="primary" size="md" isLoading={gravando} showTextWhileLoading onClick={() => void gravar()}>
                    {T.salvarRegras}
                </Button>
            </Rodape>
            {protecao.confirmacao}
        </PainelLateral>
    );
}

/** "Editar vínculos" (troca tudo) ou "Novas associações" (só adiciona): lotes e combos onde o desconto vale. */
function EditarVinculos({ evento, ids, modo, onFechar }: { evento: Evento; ids: string[]; modo: "substituir" | "adicionar"; onFechar: () => void }) {
    const { preco } = useTextosItens();
    const resumir = useResumoDosVinculos();
    const cupons = evento.cupons ?? [];
    const alvo = cupons.filter((c) => ids.includes(c.id));
    const [iniciais] = useState(() => {
        const v = modo === "substituir" && alvo.length === 1 ? alvo[0].vinculos : [];
        return { lotes: v.filter((x) => x.tipo === "lote").map((x) => x.id), combos: v.filter((x) => x.tipo === "combo").map((x) => x.id) };
    });
    const vinculos = useVinculos(evento, iniciais);
    const combos = useMemo(() => combosDoEvento(evento, preco), [evento, preco]);
    const [gravando, setGravando] = useState(false);
    const protecao = useProtecaoDoPreenchido({ alterado: vinculos.alterado, onFechar, titulo: T.descartarTitulo, descricao: T.descartarEdicao });

    const associar = async () => {
        const r = vinculos.resultado();
        const novos = [...r.lotes.map((id) => ({ tipo: "lote" as const, id })), ...r.combos.map((id) => ({ tipo: "combo" as const, id }))];
        setGravando(true);
        try {
            await salvarCupons(
                evento,
                cupons.map((c) => {
                    if (!ids.includes(c.id)) return c;
                    if (modo === "substituir") return { ...c, vinculos: novos };
                    const ja = new Set(c.vinculos.map((v) => `${v.tipo}:${v.id}`));
                    return { ...c, vinculos: [...c.vinculos, ...novos.filter((v) => !ja.has(`${v.tipo}:${v.id}`))] };
                }),
            );
            toast.success(T.associados);
            onFechar();
        } catch {
            toast.error(T.erroAssociar);
        } finally {
            setGravando(false);
        }
    };

    return (
        <PainelLateral titulo={T.vinculosTitulo} subtitulo={alvo.length === 1 ? alvo[0].codigo : undefined} aoFechar={protecao.pedirParaFechar} fechaClicandoFora={protecao.fechaClicandoFora} largura="md:max-w-[682px]">
            <SlideoutMenu.Content className="pb-6">
                <SeletorDeVinculos vinculos={vinculos} rotulo={T.arvore} combos={combos} comConferir vazio={<p className="py-6 text-center text-sm text-tertiary">{T.semIngressos}</p>} />
            </SlideoutMenu.Content>
            <Rodape apoio={resumir(vinculos)}>
                <Button color="secondary" size="md" onClick={protecao.pedirParaFechar}>
                    {T.cancelar}
                </Button>
                <Button color="primary" size="md" isDisabled={vinculos.vazio && modo === "adicionar"} isLoading={gravando} showTextWhileLoading onClick={() => void associar()}>
                    {T.associar}
                </Button>
            </Rodape>
            {protecao.confirmacao}
        </PainelLateral>
    );
}
