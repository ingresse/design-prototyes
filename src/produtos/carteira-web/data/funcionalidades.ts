/* Chaves de funcionalidades do protótipo da Carteira web.
   Desligar uma chave volta a Carteira ao comportamento de antes da funcionalidade, sem apagar o código dela:
   para reativar, é só trocar para `true`. */

/**
 * Multiperfis (acesso aos perfis dos dependentes): troca de perfil no menu da conta, "Meus dependentes"
 * com habilitação de acesso, escolha de perfil ao sair/entrar, onboarding dos perfis e a Carteira filtrada
 * pelo perfil em uso. Desligado (false): a Carteira web mostra só a própria conta. O código fica guardado
 * (pages/meus-dependentes.tsx, pages/selecionar-perfil.tsx, components/perfis-onboarding.tsx etc.).
 */
export const MULTIPERFIS = false;
