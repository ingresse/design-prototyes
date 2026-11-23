import { lerColecao, lerDoc, salvar, salvarVarios } from "./db";
import type { Atribuicao, Canal, ConfiguracaoDaListaDeEspera, DadosDaBilheteria, Evento, EventoStatus, IngressoEmitido, ItemPedido, MetodoPagamento, OrigemDaListaDeEspera, Pedido, Sessao, SolicitacaoDeGrupo, Usuario } from "./modelo";
import { agora, codigoIngresso, dataDoEvento, idDaOrganizacao, loteAtual, novoId, organizacaoDoEvento, slugificar, vendidosPorLote } from "./regras";

/* Ações de negócio. As telas chamam estas funções; nenhuma tela monta documento do banco na mão. */

/* ---------------- eventos ---------------- */

export interface NovoEvento {
    nome: string;
    produtora: string;
    /** Organização dona; sem ela, deriva do nome da produtora. */
    organizacaoId?: string;
    local: string;
    cidade?: string;
    /** ISO local da primeira sessão. */
    data: string;
    capa?: string;
    /** Início de cada sessão (ISO local). Sem lista, uma sessão em `data`. */
    sessoes?: string[];
    /** Fim de cada sessão (ISO local), pela chave do início dela (ISO local). */
    fimDasSessoes?: Record<string, string>;
    descricao?: string;
    extras?: Pick<Evento, "tipo" | "modalidade" | "categoria" | "tags" | "categoriaTexto" | "fim" | "moeda" | "limites" | "idadeMinima" | "mapa" | "partida" | "avancado" | "vitrine" | "bannersAdicionais" | "video" | "entradas">;
}

const slugLivre = (base: string, id: string) => {
    const usados = new Set(lerColecao("eventos").filter((e) => e.id !== id).map((e) => e.slug));
    let slug = slugificar(base);
    for (let n = 2; usados.has(slug); n++) slug = `${slugificar(base)}-${n}`;
    return slug;
};

/** Monta o evento em rascunho, com uma sessão e nenhum ingresso (sem gravar). */
export function montarEvento(input: NovoEvento): Evento {
    const id = novoId("ev");
    const inicios = (input.sessoes?.length ? input.sessoes : [input.data]).map((s) => s.slice(0, 16)).sort();
    const data = inicios[0];
    const e: Evento = {
        id,
        slug: slugLivre(input.nome, id),
        nome: input.nome,
        produtora: input.produtora,
        organizacaoId: input.organizacaoId ?? idDaOrganizacao(input.produtora),
        status: "rascunho",
        // Sem upload de imagem no Backstage: capa fotográfica estável pelo id, igual em todas as telas.
        capa: input.capa ?? `https://picsum.photos/seed/${id}/600/800`,
        local: input.local,
        cidade: input.cidade,
        data,
        sessoes: inicios.map((inicio, i) => ({ id: `${id}-s${i + 1}`, inicio, ...(input.fimDasSessoes?.[inicio] ? { fim: input.fimDasSessoes[inicio].slice(0, 16) } : {}), grupos: [] })),
        taxaServico: 0.1,
        ...(input.descricao ? { vitrine: { descricao: input.descricao.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) } } : {}),
        ...input.extras,
        criadoEm: agora(),
        atualizadoEm: agora(),
    };
    return e;
}

export const criarEvento = (input: NovoEvento) => salvar("eventos", montarEvento(input));

export async function atualizarEvento(id: string, patch: Partial<Omit<Evento, "id">>) {
    const atual = lerDoc("eventos", id);
    if (!atual) return;
    const prox = { ...atual, ...patch };
    if (patch.nome && patch.nome !== atual.nome) prox.slug = slugLivre(patch.nome, id);
    if (patch.sessoes) prox.data = dataDoEvento(patch.sessoes, prox.data);
    return salvar("eventos", prox);
}

export const salvarCatalogo = (id: string, sessoes: Sessao[]) => atualizarEvento(id, { sessoes });

/** Encerrado é terminal. */
export async function alterarStatusEvento(id: string, status: EventoStatus) {
    const atual = lerDoc("eventos", id);
    if (!atual || atual.status === "encerrado") return;
    return salvar("eventos", { ...atual, status });
}

/* ---------------- pedidos ---------------- */

export interface NovoPedido {
    eventoId: string;
    comprador: Usuario;
    canal: Canal;
    itens: ItemPedido[];
    atribuicoes: Atribuicao[];
    envio?: Pedido["envio"];
    /** Cupom aplicado no link de compra (CUP). */
    cupom?: Pedido["cupom"];
}

const soma = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) * 100) / 100;

export async function criarPedido(input: NovoPedido): Promise<Pedido> {
    const subtotal = soma(input.itens.map((i) => i.face * i.quantidade));
    const taxas = soma(input.itens.map((i) => i.taxa * i.quantidade));
    const p: Pedido = {
        id: novoId("ped"),
        ...input,
        subtotal,
        taxas,
        // O desconto do cupom sai do total (CUP); taxas continuam sobre o preço de face.
        total: Math.max(0, soma([subtotal, taxas]) - (input.cupom?.desconto ?? 0)),
        status: "aguardando-pagamento",
        criadoEm: agora(),
        atualizadoEm: agora(),
    };
    if (!lerDoc("usuarios", input.comprador.id)) await salvar("usuarios", input.comprador);
    return salvar("pedidos", p);
}

/**
 * Aprova o pagamento e emite um ingresso por unidade comprada. Quem não foi
 * atribuído a outra pessoa fica com o comprador. Idempotente: pedido já pago não emite de novo.
 */
export async function pagarPedido(
    id: string,
    metodo: MetodoPagamento,
    opcoes: { parcelas?: number; protecao?: number; juros?: number } = {},
): Promise<IngressoEmitido[]> {
    const { parcelas, protecao = 0, juros = 0 } = opcoes;
    const p = lerDoc("pedidos", id);
    if (!p) throw new Error("Pedido não encontrado");
    if (p.status === "pago") return lerColecao("ingressos").filter((i) => i.pedidoId === id);
    const ev = lerDoc("eventos", p.eventoId);
    // Cupom: o limite do evento conta as unidades com desconto (CART-052).
    if (ev && p.cupom) {
        const cupom = p.cupom;
        await salvar("eventos", { ...ev, cupons: (ev.cupons ?? []).map((c) => (c.id === cupom.id ? { ...c, usos: c.usos + cupom.itens } : c)) });
    }

    const emitidos: IngressoEmitido[] = [];
    p.itens.forEach((item, idx) => {
        if (item.tipo !== "ingresso" || !item.sessaoId || !item.grupoId || !item.ingressoId || !item.loteId) return;
        const grupo = ev?.sessoes.find((s) => s.id === item.sessaoId)?.grupos.find((g) => g.id === item.grupoId);
        const doItem = p.atribuicoes.filter((a) => a.item === idx);
        for (let n = 0; n < item.quantidade; n++) {
            const titular = doItem[n] ?? { nome: p.comprador.nome, email: p.comprador.email };
            emitidos.push({
                id: novoId("ing"),
                pedidoId: p.id,
                eventoId: p.eventoId,
                sessaoId: item.sessaoId,
                grupoId: item.grupoId,
                ingressoId: item.ingressoId,
                loteId: item.loteId,
                rotulo: { evento: ev?.nome ?? "Evento", grupo: grupo?.nome ?? "", ingresso: item.nome, lote: item.detalhe ?? "", acesso: grupo?.acesso },
                titular: { nome: titular.nome, email: titular.email.toLowerCase() },
                codigo: codigoIngresso(),
                status: "valido",
                emitidoEm: agora(),
                atualizadoEm: agora(),
            });
        }
    });

    await salvarVarios({
        pedidos: [
            {
                ...p,
                status: "pago",
                pagamento: { metodo, parcelas, pagoEm: agora() },
                adicionais: { protecao, juros },
                total: soma([p.subtotal, p.taxas, protecao, juros]),
            },
        ],
        ingressos: emitidos,
    });
    return emitidos;
}

/** Cancela o pedido e os ingressos dele; o estoque volta. Pedido já cancelado não muda. */
export async function cancelarPedido(id: string) {
    const p = lerDoc("pedidos", id);
    if (!p || p.status === "cancelado") return;
    const ingressos = lerColecao("ingressos")
        .filter((i) => i.pedidoId === id && i.status === "valido")
        .map((i) => ({ ...i, status: "cancelado" as const, atualizadoEm: agora() }));
    await salvarVarios({ pedidos: [{ ...p, status: "cancelado", atualizadoEm: agora() }], ingressos });
}

/** Anota no pedido da bilheteria o que a gestão mostra (tipo, emissor, link vencido, reenvios). */
export async function anotarPedidoDaBilheteria(id: string, patch: Partial<DadosDaBilheteria>) {
    const p = lerDoc("pedidos", id);
    if (!p) return;
    await salvar("pedidos", { ...p, bilheteria: { tipo: "link", emissor: "Bilheteria", ...p.bilheteria, ...patch }, atualizadoEm: agora() });
}

/** Cancela um ingresso só; o pedido continua. */
export async function cancelarIngresso(id: string) {
    const i = lerDoc("ingressos", id);
    if (!i || i.status !== "valido") return;
    await salvar("ingressos", { ...i, status: "cancelado", atualizadoEm: agora() });
}

/**
 * Item de cortesia: um ingresso (pela posição no catálogo), um produto do evento ou um combo do evento.
 * `nome` do produto e `detalhe` do combo são os rótulos que a tela já mostra; sem eles, a ação
 * procura na biblioteca da organização.
 */
export type ItemDeCortesia =
    | { sessaoId: string; grupoId: string; ingressoId: string }
    | { produtoId: string; nome?: string }
    | { comboId: string; detalhe?: string };

/**
 * Cortesias: um pedido por destinatário, sem cobrança, já pago no método "cortesia". Cada ingresso
 * sai no lote atual e emite na hora, na carteira do e-mail. Produto vira uma linha do pedido; combo
 * vira uma linha do combo mais os ingressos dele, emitidos com `comboId`.
 */
export async function emitirCortesias(input: {
    eventoId: string;
    envio: NonNullable<Pedido["envio"]>;
    emails: string[];
    itens: ItemDeCortesia[];
}): Promise<Pedido[]> {
    const ev = lerDoc("eventos", input.eventoId);
    if (!ev) throw new Error("Evento não encontrado");
    const vendidos = vendidosPorLote(lerColecao("ingressos"), lerColecao("historico"));
    const biblioteca = lerDoc("organizacoes", organizacaoDoEvento(ev))?.produtos ?? [];
    const linhaDeIngresso = (sessaoId: string, grupoId: string, ingressoId: string, quantidade: number, comboId?: string): ItemPedido[] => {
        const tipo = ev.sessoes.find((s) => s.id === sessaoId)?.grupos.find((g) => g.id === grupoId)?.ingressos.find((t) => t.id === ingressoId);
        const lote = tipo && (loteAtual(tipo, vendidos) ?? tipo.lotes[tipo.lotes.length - 1]);
        return tipo && lote ? [{ tipo: "ingresso", nome: tipo.nome, detalhe: lote.nome, sessaoId, grupoId, ingressoId, loteId: lote.id, ...(comboId ? { comboId } : {}), quantidade, face: 0, taxa: 0 }] : [];
    };
    const posicaoDoIngresso = (id: string) => {
        for (const s of ev.sessoes) for (const g of s.grupos) if (g.ingressos.some((t) => t.id === id)) return { sessaoId: s.id, grupoId: g.id };
        return null;
    };
    const itens: ItemPedido[] = input.itens.flatMap((ref): ItemPedido[] => {
        if ("produtoId" in ref) {
            const noEvento = ev.produtos?.find((p) => p.produtoId === ref.produtoId);
            if (!noEvento) return [];
            const nome = ref.nome ?? biblioteca.find((b) => b.id === ref.produtoId)?.nome ?? "Produto";
            return [{ tipo: "produto", nome, detalhe: "Produto", produtoId: ref.produtoId, quantidade: 1, face: 0, taxa: 0 }];
        }
        if ("comboId" in ref) {
            const combo = ev.combos?.find((c) => c.id === ref.comboId);
            if (!combo) return [];
            const ingressos = combo.itens.flatMap((i) => {
                if (i.tipo !== "ingresso") return [];
                const pos = posicaoDoIngresso(i.id);
                return pos ? linhaDeIngresso(pos.sessaoId, pos.grupoId, i.id, i.quantidade, combo.id) : [];
            });
            return [{ tipo: "produto", nome: combo.nome, detalhe: ref.detalhe ?? "Combo", comboId: combo.id, quantidade: 1, face: 0, taxa: 0 }, ...ingressos];
        }
        return linhaDeIngresso(ref.sessaoId, ref.grupoId, ref.ingressoId, 1);
    });
    const pedidos: Pedido[] = [];
    for (const email of input.emails) {
        const e = email.trim().toLowerCase();
        const comprador = lerColecao("usuarios").find((u) => u.email === e) ?? { id: `u_${slugificar(e)}`, nome: e.split("@")[0], email: e };
        const p = await criarPedido({ eventoId: input.eventoId, comprador, canal: "cortesia", itens, atribuicoes: [], envio: input.envio });
        const emitidos = await pagarPedido(p.id, "cortesia");
        // Ingresso que veio dentro de um combo leva o id do combo (o relatório mostra o combo numa linha só).
        const doCombo: IngressoEmitido[] = [];
        let n = 0;
        for (const item of itens) {
            if (item.tipo !== "ingresso" || !item.loteId) continue;
            for (let k = 0; k < item.quantidade; k++, n++) if (item.comboId && emitidos[n]) doCombo.push({ ...emitidos[n], comboId: item.comboId });
        }
        if (doCombo.length) await salvarVarios({ ingressos: doCombo });
        pedidos.push(p);
    }
    return pedidos;
}

/**
 * Cancela uma linha de produto ou combo de um pedido de cortesia; no combo, cancela também os
 * ingressos dele. O pedido continua.
 */
export async function cancelarItemDeCortesia(pedidoId: string, indice: number) {
    const p = lerDoc("pedidos", pedidoId);
    const item = p?.itens[indice];
    if (!p || !item || item.tipo === "ingresso" || item.cancelado) return;
    const ingressos = item.comboId
        ? lerColecao("ingressos")
              .filter((i) => i.pedidoId === pedidoId && i.comboId === item.comboId && i.status === "valido")
              .map((i) => ({ ...i, status: "cancelado" as const, atualizadoEm: agora() }))
        : [];
    await salvarVarios({ pedidos: [{ ...p, itens: p.itens.map((x, i) => (i === indice ? { ...x, cancelado: true } : x)), atualizadoEm: agora() }], ingressos });
}

/** Renomeia um envio de cortesias em todos os pedidos dele. */
export async function renomearEnvio(envioId: string, nome: string) {
    const docs = lerColecao("pedidos").filter((p) => p.envio?.id === envioId);
    await salvarVarios({ pedidos: docs.map((p) => ({ ...p, envio: { ...p.envio!, nome }, atualizadoEm: agora() })) });
}

/** Transferência simples: muda o titular, mantém o código antigo inválido. */
export async function transferirIngresso(id: string, para: { nome: string; email: string }) {
    const i = lerDoc("ingressos", id);
    if (!i || i.status !== "valido") return;
    const novo: IngressoEmitido = { ...i, id: novoId("ing"), titular: { nome: para.nome, email: para.email.toLowerCase() }, codigo: codigoIngresso(), emitidoEm: agora(), atualizadoEm: agora() };
    await salvarVarios({ ingressos: [{ ...i, status: "transferido" }, novo] });
    return novo;
}

/** Lista de espera está recebendo inscrições por esta entrada? Ausente a configuração, as duas estão desligadas (LES-02). */
export const listaDeEsperaAberta = (ev: Pick<Evento, "configuracaoDaListaDeEspera" | "status">, origem: OrigemDaListaDeEspera) =>
    ev.status !== "encerrado" && !!(origem === "esgotado" ? ev.configuracaoDaListaDeEspera?.aoEsgotar : ev.configuracaoDaListaDeEspera?.convite);

/**
 * Lista de espera (CART-085, LES): registra o interesse uma vez por e-mail no evento, com a origem. Não
 * reserva ingresso. Recusa quando a entrada está desligada no Backstage (LES-05).
 */
export async function entrarNaListaDeEspera(
    eventoId: string,
    dados: { nome: string; email: string; telefone: string },
    origem: OrigemDaListaDeEspera = "esgotado",
): Promise<"inscrito" | "ja-inscrito" | "fechada"> {
    const ev = lerDoc("eventos", eventoId);
    if (!ev || !listaDeEsperaAberta(ev, origem)) return "fechada";
    const lista = ev.listaDeEspera ?? [];
    if (lista.some((x) => x.email.toLowerCase() === dados.email.toLowerCase())) return "ja-inscrito";
    await salvar("eventos", { ...ev, listaDeEspera: [{ id: novoId("esp"), ...dados, inscritoEm: new Date().toISOString().slice(0, 19), origem }, ...lista] });
    return "inscrito";
}

/** Liga ou desliga uma entrada da lista de espera do evento (Backstage, LES-01). */
export async function configurarListaDeEspera(eventoId: string, patch: Partial<Pick<ConfiguracaoDaListaDeEspera, "aoEsgotar" | "convite">>) {
    const ev = lerDoc("eventos", eventoId);
    if (!ev) return;
    const atual = ev.configuracaoDaListaDeEspera ?? { aoEsgotar: false, convite: false, atualizadoEm: agora() };
    return atualizarEvento(eventoId, { configuracaoDaListaDeEspera: { ...atual, ...patch, atualizadoEm: agora() } });
}

/** Pedido de vagas de um gestor de grupo pelo formulário público (CEG-70). */
export async function pedirVagasDeGrupo(eventoId: string, pedido: Omit<SolicitacaoDeGrupo, "id" | "status" | "pagas" | "iniciadas" | "solicitadaEm">) {
    const ev = lerDoc("eventos", eventoId);
    if (!ev?.comprasEmGrupo) return;
    const nova: SolicitacaoDeGrupo = { ...pedido, id: novoId("sol"), status: "pendente", pagas: 0, iniciadas: 0, solicitadaEm: new Date().toISOString().slice(0, 16) };
    return salvar("eventos", { ...ev, comprasEmGrupo: { ...ev.comprasEmGrupo, solicitacoes: [nova, ...ev.comprasEmGrupo.solicitacoes] } });
}

/* ---------------- alterações pós-compra (Pedidos, PED) ---------------- */

type AlteracaoNova = Omit<import("./modelo").AlteracaoDoPedido, "id" | "em">;

const comAlteracao = (p: Pedido, alteracao: AlteracaoNova): Pedido => ({
    ...p,
    alteracoes: [...(p.alteracoes ?? []), { ...alteracao, id: novoId("alt"), em: agora() }],
    atualizadoEm: agora(),
});

/** Registra no pedido uma alteração feita pelo Backstage (ex.: a transferência, que já grava o ingresso). */
export async function registrarAlteracaoNoPedido(pedidoId: string, alteracao: AlteracaoNova) {
    const p = lerDoc("pedidos", pedidoId);
    if (!p) return;
    return salvar("pedidos", comAlteracao(p, alteracao));
}

/**
 * Troca de item (PED): cada ingresso emitido passa para outro tipo de ingresso do evento, no lote atual,
 * com código novo (o antigo deixa de valer). O pedido ganha a linha do item novo com o valor pago da
 * unidade antiga (o total pago não muda; a diferença da troca é cobrada à parte) e registra a alteração.
 */
export async function trocarItemDoPedido(
    pedidoId: string,
    trocas: { ingressoEmitidoId: string; para: { sessaoId: string; grupoId: string; ingressoId: string }; respostas?: Record<string, string> }[],
    alteracao: Omit<AlteracaoNova, "tipo" | "ingressoIds">,
) {
    const p = lerDoc("pedidos", pedidoId);
    const ev = p && lerDoc("eventos", p.eventoId);
    if (!p || !ev) return;
    const vendidos = vendidosPorLote(lerColecao("ingressos"), lerColecao("historico"));
    const itens = p.itens.map((l) => ({ ...l }));
    const ingressos: IngressoEmitido[] = [];
    for (const t of trocas) {
        const i = lerDoc("ingressos", t.ingressoEmitidoId);
        const grupo = ev.sessoes.find((s) => s.id === t.para.sessaoId)?.grupos.find((g) => g.id === t.para.grupoId);
        const tipo = grupo?.ingressos.find((x) => x.id === t.para.ingressoId);
        const lote = tipo && (loteAtual(tipo, vendidos) ?? tipo.lotes[tipo.lotes.length - 1]);
        if (!i || i.pedidoId !== pedidoId || i.status !== "valido" || !grupo || !tipo || !lote) continue;
        const origem = itens.find((l) => l.tipo === "ingresso" && l.ingressoId === i.ingressoId && l.loteId === i.loteId && l.quantidade > 0);
        const face = origem?.face ?? 0;
        const taxa = origem?.taxa ?? 0;
        if (origem) origem.quantidade -= 1;
        const igual = itens.find((l) => l.tipo === "ingresso" && l.loteId === lote.id && l.ingressoId === tipo.id && l.face === face && l.taxa === taxa);
        if (igual) igual.quantidade += 1;
        else itens.push({ tipo: "ingresso", nome: tipo.nome, detalhe: lote.nome, ...t.para, loteId: lote.id, quantidade: 1, face, taxa });
        ingressos.push({
            ...i,
            ...t.para,
            loteId: lote.id,
            rotulo: { ...i.rotulo, grupo: grupo.nome, ingresso: tipo.nome, lote: lote.nome, acesso: grupo.acesso },
            codigo: codigoIngresso(),
            ...(t.respostas ? { respostas: t.respostas } : {}),
            atualizadoEm: agora(),
        });
    }
    if (ingressos.length === 0) return;
    // Linha que zerou sai do pedido; as atribuições acompanham o novo índice.
    const novoIndice = new Map<number, number>();
    const restantes = itens.filter((l, idx) => {
        if (l.quantidade <= 0) return false;
        novoIndice.set(idx, novoIndice.size);
        return true;
    });
    const atribuicoes = p.atribuicoes.flatMap((a) => (novoIndice.has(a.item) ? [{ ...a, item: novoIndice.get(a.item)! }] : []));
    const pedido = comAlteracao({ ...p, itens: restantes, atribuicoes }, { ...alteracao, tipo: "troca-item", ingressoIds: ingressos.map((i) => i.id) });
    await salvarVarios({ pedidos: [pedido], ingressos });
    return pedido;
}

/** Edição das respostas do questionário de um ingresso emitido (PED), com a alteração registrada no pedido. */
export async function editarFormularioDoIngresso(ingressoEmitidoId: string, respostas: Record<string, string>, alteracao: Omit<AlteracaoNova, "tipo" | "ingressoIds">) {
    const i = lerDoc("ingressos", ingressoEmitidoId);
    const p = i && lerDoc("pedidos", i.pedidoId);
    if (!i || !p || i.status !== "valido") return;
    await salvarVarios({
        ingressos: [{ ...i, respostas: { ...i.respostas, ...respostas }, atualizadoEm: agora() }],
        pedidos: [comAlteracao(p, { ...alteracao, tipo: "formulario", ingressoIds: [i.id] })],
    });
}

/* ---------------- origem do pedido no link de compra ---------------- */

/** Cria o pedido com o código de comissário (ECO) e as Passkeys (CHA) que liberaram itens dele. */
export const criarPedidoComOrigem = (input: NovoPedido & { comissario?: Pedido["comissario"]; passkeys?: Pedido["passkeys"] }) => criarPedido(input as NovoPedido);

let contandoPasskeys = false;
/**
 * Pedido pago com Passkey soma um uso em cada Passkey dele (CHA), uma vez só (`passkeys.contadas`).
 * Roda a cada mudança do banco: o pagamento acontece no checkout, que não conhece Passkey.
 */
export async function contarUsosDasPasskeys() {
    if (contandoPasskeys) return;
    const pagos = lerColecao("pedidos").filter((p) => p.status === "pago" && p.passkeys?.codigos.length && !p.passkeys.contadas);
    if (pagos.length === 0) return;
    const eventos = new Map<string, Evento>();
    for (const p of pagos) {
        const ev = eventos.get(p.eventoId) ?? lerDoc("eventos", p.eventoId);
        if (!ev) continue;
        const codigos = new Set(p.passkeys!.codigos);
        eventos.set(ev.id, { ...ev, passkeys: (ev.passkeys ?? []).map((k) => (codigos.has(k.codigo) ? { ...k, usos: k.usos + 1 } : k)) });
    }
    // A gravação avisa os assinantes na hora: a trava evita contar de novo antes de marcar o pedido.
    contandoPasskeys = true;
    const gravacoes = [
        ...pagos.map((p) => salvar("pedidos", { ...p, passkeys: { ...p.passkeys!, contadas: true } })),
        ...[...eventos.values()].map((ev) => salvar("eventos", ev)),
    ];
    contandoPasskeys = false;
    await Promise.all(gravacoes);
}
