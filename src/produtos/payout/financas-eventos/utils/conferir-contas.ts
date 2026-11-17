/*
 * Verificação automática das contas de Finanças (ajustes v2, entregável 3).
 *
 *   node src/produtos/payout/financas-eventos/utils/conferir-contas.ts
 *
 * Confere, nos cenários com dados (normal, saldo negativo e bloqueado):
 *   - em cada evento, Vendido − Taxas e custos + Créditos − Ajustes = Seu dinheiro;
 *   - em cada evento, as partes (Em processamento, Retido, A liberar, Disponível agora, Agendado,
 *     Já recebido) somam Seu dinheiro;
 *   - calendário, ajustes, créditos, taxas e repasses de cada evento somam os totais do evento;
 *   - a soma dos 48 eventos é igual à conta do topo, e as partes do topo somam o Líquido;
 *   - o Calendário soma Em processamento + Retido + Antecipável (organização e cada evento);
 *   - no Extrato, saldo inicial + movimentos que afetam o Disponível = saldo final = Disponível do card;
 *   - em cada painel de detalhe, a soma das linhas é o valor do bloco.
 * Sai com código 1 se alguma soma não fechar.
 */
import { DIAS_DO_EXTRATO, HOJE, conferirContas, entradasDoCalendario, eventosDoCenario, extrato, resumoDoCalendario, somarDias, totalizar } from "../../components/financas/dados.ts";

const erros = conferirContas();
const reais = (v: number) => `R$ ${new Intl.NumberFormat("pt-BR").format(v)}`;

for (const cenario of ["normal", "negativo"] as const) {
    const eventos = eventosDoCenario(cenario);
    const t = totalizar(eventos);
    console.log(`\n${cenario}: ${eventos.length} eventos`);
    console.log(`  ${reais(t.vendido)} − ${reais(t.taxas)} + ${reais(t.creditos)} − ${reais(t.ajustes)} = ${reais(t.seuDinheiro)}`);
    console.log(
        `  ${reais(t.processamento)} + ${reais(t.retido)} + ${reais(t.aLiberar)} + ${reais(t.disponivel)} + ${reais(t.agendado)} + ${reais(t.recebido)} = ${reais(t.processamento + t.retido + t.aLiberar + t.disponivel + t.agendado + t.recebido)}`,
    );

    const resumo = resumoDoCalendario(entradasDoCalendario(eventos));
    console.log(`  Calendário: ${reais(resumo.em7)} + ${reais(resumo.em30)} + ${reais(resumo.depois)} = ${reais(t.processamento + t.retido + t.aLiberar)}`);
    for (const dias of [30, DIAS_DO_EXTRATO]) {
        const x = extrato(eventos, somarDias(HOJE, -dias), HOJE);
        console.log(`  Extrato ${dias} dias: ${reais(x.saldoInicial)} + ${x.linhas.length} movimentos = ${reais(x.saldoFinal)}`);
    }
}

if (erros.length) {
    console.error(`\n${erros.length} conta(s) não fecham:`);
    for (const erro of erros) console.error(`  - ${erro}`);
    process.exit(1);
}
console.log("\nTodas as contas fecham.");
