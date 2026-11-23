import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Minus, Plus, Printer, XClose } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

const EVENT_NAME = "{Nome do evento muito longo e com várias linhas de texto}";
const TICKET_GROUP = "{Grupo do ingresso}";
const EVENT_ADDRESS = "{Endereço do evento}";
const ORDER_ID = "e35c58f8-d300-49c6-9b4e-efa6b63e9a4d";
const SERIE = "020583";

/**
 * Pré-visualização do PDF de ingressos gerado ao final da venda.
 * A moldura reproduz o visualizador de PDF do navegador do mockup.
 */
export function IngressoPdf() {
    const navigate = useNavigate();
    const [zoom, setZoom] = useState(100);

    // Título da aba do navegador (antes ficava o do app, "Multi-Date Ticket Selection Flow").
    useEffect(() => {
        const anterior = document.title;
        document.title = `Ingresso em PDF, pedido ${SERIE}`;
        return () => {
            document.title = anterior;
        };
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-tertiary print:bg-white">
            {/* Moldura do visualizador com as peças do DS; só Imprimir, zoom e Fechar, que funcionam (BIL-70). */}
            <header className="flex items-center gap-2 border-b border-secondary bg-primary px-4 py-2 print:hidden">
                <h1 className="min-w-0 flex-1 truncate text-md font-medium text-primary">ingressos-pedido-{SERIE}.pdf</h1>
                <div className="flex items-center gap-1 max-md:hidden">
                    <ButtonUtility size="sm" color="tertiary" icon={Minus} tooltip="Diminuir zoom" isDisabled={zoom <= 50} onClick={() => setZoom((z) => Math.max(50, z - 10))} />
                    <span className="min-w-12 text-center text-sm text-secondary tabular-nums">{zoom}%</span>
                    <ButtonUtility size="sm" color="tertiary" icon={Plus} tooltip="Aumentar zoom" isDisabled={zoom >= 200} onClick={() => setZoom((z) => Math.min(200, z + 10))} />
                </div>
                {/* Imprimir abre a impressão do navegador, que também salva em PDF. */}
                <ButtonUtility size="sm" color="tertiary" icon={Printer} tooltip="Imprimir ou salvar em PDF" onClick={() => window.print()} />
                <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Fechar visualização" onClick={() => navigate(-1)} />
            </header>

            {/* mx-auto em vez de justify-center: a folha mais larga que a tela rola até a borda esquerda (390 px). */}
            <div className="flex flex-1 overflow-auto p-6 max-md:p-4 print:p-0">
                <div style={{ width: 595 * (zoom / 100), minHeight: 842 * (zoom / 100) }} className="mx-auto shrink-0 bg-white shadow-2xl print:shadow-none">
                    <div
                        style={{
                            width: 595,
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: "top left",
                        }}
                        className="relative text-black"
                    >
                        <div className="px-[61px] pt-[75px]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="w-[178px]">
                                    <p className="text-[13px] font-bold leading-[1.35]">{EVENT_NAME}</p>
                                    <p className="mt-1.5 text-[8px] leading-[11px]">{TICKET_GROUP}</p>
                                    <p className="mt-1.5 text-[8px] leading-[11px]">{EVENT_ADDRESS}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold leading-none">03 JUL</p>
                                    <p className="text-[9px] leading-none">14:00</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <p className="text-[9px] font-bold">Festa da May</p>
                                <p className="mt-1 text-[6px] tracking-wide">25.74672.702058137.223552.01</p>
                            </div>

                            {/* Arte do ingresso — bloco decorativo do modelo de impressão. */}
                            <div className="mt-10 w-[178px]">
                                <div className="relative h-[132px] rounded-t-sm bg-linear-to-br from-[#ff8a7d] to-[#ff271a]">
                                    <span className="absolute -top-px left-1/2 size-6 -translate-x-1/2 rounded-full bg-white" />
                                    <div className="absolute inset-x-4 bottom-4 h-16 rounded-t-[999px] bg-black" />
                                    <div className="absolute bottom-16 left-6 size-7 rounded-full bg-black" />
                                    <div className="absolute bottom-16 left-16 size-7 rounded-full bg-black" />
                                    <div className="absolute bottom-16 right-6 size-7 rounded-full bg-black" />
                                </div>

                                <div className="flex items-start justify-between gap-3 pt-2">
                                    <div className="text-[5.5px] leading-[8px]">
                                        <p className="font-bold">DADOS DA COMPRA</p>
                                        <p>13/06/2026 - 11:35</p>
                                        <p>R$ 120 / R$ 0,00</p>
                                        <p>São Paulo</p>
                                    </div>
                                    <div className="text-[5.5px] leading-[8px]">
                                        <p className="font-bold">SÉRIE</p>
                                        <p>{SERIE}</p>
                                    </div>
                                    <QrPlaceholder />
                                </div>
                            </div>

                            <div className="pt-6 pb-10 text-[6px] leading-[11px]">
                                <p className="font-bold">PEDIDO</p>
                                <p>{ORDER_ID}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** QR code fictício — o código real é gerado no backend. */
const QrPlaceholder = () => {
    const cells = Array.from({ length: 100 }, (_, index) => (index * 7 + (index % 5) * 13) % 3 !== 0);
    return (
        <div className="grid size-10 shrink-0 grid-cols-10 gap-0 bg-white p-0.5" aria-label="QR code do ingresso">
            {cells.map((filled, index) => (
                <span key={index} className={filled ? "bg-black" : "bg-white"} />
            ))}
        </div>
    );
};
