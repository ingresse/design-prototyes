/* ------------------------------------------------------------------ */
/*  Pedidos do grupo (ECO-74): os de todos os canais numa lista só.    */
/*                                                                     */
/*  Desde 21/11/2026 as linhas vêm do store (`@/plataforma/            */
/*  comissarios`, `Estado.pedidos`): pedidos do evento no banco        */
/*  atribuídos ao grupo (código do comissário, emissor da bilheteria,  */
/*  emissor da cortesia), cortesias registradas pelo Freepass e        */
/*  exemplos gerados do catálogo do evento. Ver ECO-82 a ECO-88.       */
/* ------------------------------------------------------------------ */

export type { PedidoDoGrupo } from "@/plataforma/comissarios";
