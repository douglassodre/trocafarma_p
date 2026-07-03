import { jsPDF } from "jspdf";

export const generateReceiptPDF = (ad, user) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;

        // --- Header ---
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Comprovante de Retirada", pageWidth / 2, 25, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Este documento autoriza a retirada do item abaixo.", pageWidth / 2, 32, { align: "center" });

        // Draw a line under header
        doc.setLineWidth(0.5);
        doc.line(margin, 38, pageWidth - margin, 38);

        let yPos = 50;

        // --- Item Details Section ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Detalhes do Item", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const itemDetails = [
            { label: "Descrição", value: ad.descricao_customizada },
            { label: "Código do Item", value: ad.item_codigo || "N/A" },
            { label: "Categoria", value: ad.categoria || "N/A" },
            { label: "Quantidade", value: `${ad.quantidade || "1"}` },
            { label: "Lote / Validade", value: `${ad.lote || "-"} / ${ad.data_vencimento ? new Date(ad.data_vencimento).toLocaleDateString() : "-"}` },
            // Handle the generic 'tipo' which might be EM_TRANSITO etc if passed directly, 
            // strictly speaking 'tipo' is usually PERMUTA/DOACAO here.
            { label: "Tipo de Transação", value: ad.tipo }
        ];

        itemDetails.forEach(item => {
            // Label bold
            doc.setFont("helvetica", "bold");
            doc.text(`${item.label}:`, margin, yPos);
            // Value normal, offset by ~35mm depending on long labels
            doc.setFont("helvetica", "normal");
            doc.text(`${item.value}`, margin + 35, yPos);
            yPos += 7;
        });

        yPos += 5; // Extra spacing

        // --- Provider / Location Section ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Local de Retirada (Fornecedor)", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const providerDetails = [
            { label: "Instituição", value: ad.instituicoes?.nome_fantasia || "Não informado" },
            { label: "Cidade / Estado", value: `${ad.cidade} - ${ad.estado}` },
            // Ideally we would have exact address, but for now we use what we have available on the ad object commonly
            // If 'endereco' isn't on ad, we might skip it or use a placeholder. 
            // Assuming ad might not have full address field visible in explore mock, so we keep it simple.
            { label: "Horário Sugerido", value: "Segunda a Sexta, 08h às 18h" }
        ];

        providerDetails.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(`${item.label}:`, margin, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(`${item.value}`, margin + 35, yPos);
            yPos += 7;
        });

        yPos += 10;
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // --- Authorization / Signature Section ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Autorização de Retirada", margin, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Autorizo a pessoa abaixo identificada a retirar os itens listados acima.", margin, yPos);
        yPos += 15;

        // Form Fields
        const drawField = (label, y) => {
            doc.text(label, margin, y);
            doc.line(margin, y + 8, pageWidth - margin, y + 8); // Underline for filling
        };

        drawField("Nome do Portador (Quem vai retirar):", yPos);
        yPos += 20;

        drawField("RG / CPF do Portador:", yPos);
        yPos += 20;

        drawField("Data e Hora da Retirada:", yPos);
        yPos += 20;

        // Signatures
        yPos += 10;

        // Box for signature 1
        doc.text("Assinatura do Responsável na Retirada:", margin, yPos);
        doc.line(margin, yPos + 15, pageWidth / 2 - 10, yPos + 15);

        // Box for signature 2 (Provider)
        doc.text("Visto do Fornecedor (Instituição):", pageWidth / 2 + 5, yPos);
        doc.line(pageWidth / 2 + 5, yPos + 15, pageWidth - margin, yPos + 15);

        // Footer
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado em ${date} às ${time} - TrocaFarma`, pageWidth / 2, pageWidth - 10, { align: "center", angle: 0 }); // Angle 0 is default used incorrectly in some examples, 'pageHeight' usually needed.
        // Actually text is x, y. let's put it at bottom of page.
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.text(`Gerado em ${date} às ${time} - TrocaFarma`, pageWidth / 2, pageHeight - 10, { align: "center" });

        // Save the PDF
        const filename = `comprovante_${ad.item_codigo || "retirada"}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("Erro ao gerar PDF: " + error.message);
    }
};
