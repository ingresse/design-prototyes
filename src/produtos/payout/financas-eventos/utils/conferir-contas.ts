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
 *   - a soma dos 48 eventos é igual à cascata do topo, e as partes do topo somam Seu dinheiro.
 * Sai com código 1 se alguma soma não fechar.
 */
import { conferirContas, eventosDoCenario, totalizar } from "../../components/financas/dados.ts";

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
}

if (erros.length) {
    console.error(`\n${erros.length} conta(s) não fecham:`);
    for (const erro of erros) console.error(`  - ${erro}`);
    process.exit(1);
}
console.log("\nTodas as contas fecham.");
