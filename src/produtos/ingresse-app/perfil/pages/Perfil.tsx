import { MULTIPERFIS } from "../../components/funcionalidades";
import { PerfilClassico } from "./perfil-classico";
import { PerfilMultiperfis } from "./perfil-multiperfis";

/** Perfil do app: a versão com multiperfis (troca de perfil) só com a chave ligada. */
export const Perfil = MULTIPERFIS ? PerfilMultiperfis : PerfilClassico;
