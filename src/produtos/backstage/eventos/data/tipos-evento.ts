import type { FC } from "react";
import musicTicket from "@/assets/iconly/music-ticket.json";
import sportTicket from "@/assets/iconly/sport-ticket.json";
import starMedal from "@/assets/iconly/star-medal.json";
import { iconeAnimado } from "@/components/foundations/icone-animado";
import type { TipoEvento } from "@/plataforma";

/* Ícones animados do Iconly Pro, estilo Light (UI-DS-008): Sport ticket (4370), Music ticket (4366),
   Star medal (2985). O Iconly não tem bola de futebol nem corrida animadas. */

/** Tipos de evento oferecidos no "Criar evento" (EVT-50) e no campo "Tipo de evento" da criação (EVT-163). A ordem é a do menu.
    O id `show` continua: só o rótulo virou "Entretenimento" (EVT-167), porque cabem N tipos de evento além de show e festa. */
export const TIPOS_DE_EVENTO: { id: TipoEvento; label: string; titulo: string; icon: FC<{ className?: string }> }[] = [
    { id: "futebol", label: "Futebol", titulo: "Criar evento de futebol", icon: iconeAnimado(sportTicket) },
    { id: "show", label: "Entretenimento", titulo: "Criar evento de entretenimento", icon: iconeAnimado(musicTicket) },
    { id: "esportivo", label: "Evento esportivo", titulo: "Criar evento esportivo", icon: iconeAnimado(starMedal) },
];

export const tipoDeEvento = (id: string | null) => TIPOS_DE_EVENTO.find((t) => t.id === id);
