/* Chaves de funcionalidades do protótipo do app.
   Desligar uma chave volta o app ao comportamento de antes da funcionalidade, sem apagar o código dela:
   para reativar, é só trocar para `true`. */

/**
 * Multiperfis (acesso aos perfis dos dependentes): habilitar o acesso ao perfil de um dependente,
 * trocar de perfil no Perfil (com confirmação), selecionar o perfil ao entrar, onboarding dos perfis
 * na Carteira, aba Perfil com a foto/iniciais do perfil em uso e a Carteira/ingressos filtrados pelo
 * perfil ativo.
 *
 * Desligado (false): o app volta à versão de antes dessa feature — Perfil e Dependentes clássicos,
 * dependentes com avatar na atribuição de ingresso e sem troca de perfil. O código fica guardado em
 * perfil/pages/perfil-multiperfis.tsx, perfil/pages/dependentes-multiperfis.tsx, habilitar-acesso,
 * selecionar-perfil e perfil/components (onboarding, sheets).
 */
export const MULTIPERFIS = false;
