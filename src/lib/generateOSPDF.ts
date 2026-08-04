"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFOrderItem {
  item_type: string;
  item_name: string;
  item_service_type: string | null;
  item_quantity: number;
  item_price: number | null;
  item_payment_status: string | null;
  item_amount_paid: number | null;
  item_problem_description: string | null;
  item_diagnosis: string | null;
  item_completed_at: string | null;
  item_warranty_expires_at: string | null;
  item_product_category: string | null;
  item_product_condition: string | null;
}

export interface PDFOrder {
  order_id: string;
  order_status: string;
  order_payment_method: string | null;
  order_total: number;
  order_created_at: string;
  items: PDFOrderItem[];
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generateOSPDF(order: PDFOrder, clienteName: string = "Cliente") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const red = hexToRgb("#E30613");
  const purple = hexToRgb("#8B5CF6");
  const gold = hexToRgb("#C9A84C");
  const dark = hexToRgb("#1a1a1a");
  const white: [number, number, number] = [255, 255, 255];

  // --- CABEÇALHO ---
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(0, 0, pageW, 35, "F");

  // Logo placeholder (texto)
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("A.R CONSERTO", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 20);
  doc.text("Itabaiana/SE · (79) 99944-6596", margin, 25);
  doc.text("@A.RCONSERTOS", margin, 30);

  // Número da O.S.
  doc.setTextColor(red[0], red[1], red[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 18, { align: "right" });
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 24, { align: "right" });
  doc.text(`Pedido: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin, 28, { align: "right" });

  // --- DADOS DO CLIENTE ---
  let y = 42;
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", margin, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${clienteName}`, margin, y);
  y += 5;
  doc.text(`Status do pedido: ${order.order_status.toUpperCase()}`, margin, y);
  y += 5;
  doc.text(`Forma de pagamento: ${(order.order_payment_method || "N/A").toUpperCase()}`, margin, y);
  y += 5;
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, margin, y);
  y += 10;

  // --- TABELA DE ITENS ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITENS DO PEDIDO", margin, y);
  y += 6;

  const tableBody = order.items.map((item) => {
    const isService = item.item_type === "servico";
    const tipo = isService
      ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional")
      : (item.item_product_condition || "Produto");
    const valor = item.item_price ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}` : "-";
    const pgto = isService
      ? (item.item_payment_status || "Pendente")
      : "Pago na compra";
    return [
      item.item_name,
      tipo,
      item.item_quantity,
      valor,
      pgto,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Item", "Tipo/Condição", "Qtd", "Valor", "Pagamento"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: dark,
      textColor: white,
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const tipo = data.cell.raw as string;
        if (tipo === "Inverter") {
          data.cell.styles.fillColor = [purple[0], purple[1], purple[2]];
          data.cell.styles.textColor = [purple[0], purple[1], purple[2]];
        } else if (tipo === "Convencional") {
          data.cell.styles.fillColor = [red[0], red[1], red[2]];
          data.cell.styles.textColor = [red[0], red[1], red[2]];
        } else {
          data.cell.styles.fillColor = [gold[0], gold[1], gold[2]];
          data.cell.styles.textColor = [gold[0], gold[1], gold[2]];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  y = doc.lastAutoTable?.finalY || y + 30;
  y += 8;

  // --- CERTIFICADO DE GARANTIA ---
  if (y > pageH - 70) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(240, 248, 240);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, "F");
  doc.setDrawColor(68, 221, 136);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, "S");

  doc.setTextColor(34, 139, 34);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTIA — 90 DIAS", margin + 4, y + 7);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Todos os serviços de conserto possuem garantia de 90 dias a partir da data de conclusão. " +
    "Cobertura: mesmo defeito reparado, peças substituídas e mão de obra. Não cobre: mau uso, " +
    "quedas, infiltração ou intervenção de terceiros.",
    margin + 4,
    y + 13,
    { maxWidth: pageW - margin * 2 - 8 }
  );
  doc.text(
    "Para acionar a garantia, apresente este documento ou informe o número da O.S.",
    margin + 4,
    y + 24
  );

  y += 34;

  // --- ASSINATURAS ---
  if (y > pageH - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS", margin, y);
  y += 8;

  const sigW = (pageW - margin * 2 - 10) / 2;

  // Técnico
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y + 15, margin + sigW, y + 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Técnico Responsável", margin, y + 20);
  doc.text("A.R Conserto", margin, y + 24);

  // Cliente
  doc.line(margin + sigW + 10, y + 15, margin + sigW * 2 + 10, y + 15);
  doc.text("Cliente", margin + sigW + 10, y + 20);
  doc.text(clienteName, margin + sigW + 10, y + 24);

  y += 32;

  // --- CANHOTO DESTACÁVEL ---
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(red[0], red[1], red[2]);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  y += 4;
  doc.setFillColor(255, 245, 245);
  doc.rect(margin, y, pageW - margin * 2, 22, "F");
  doc.setDrawColor(red[0], red[1], red[2]);
  doc.rect(margin, y, pageW - margin * 2, 22, "S");

  doc.setTextColor(red[0], red[1], red[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO — RECORTAR", margin + 4, y + 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()}`, margin + 4, y + 12);
  doc.text(`Cliente: ${clienteName}`, margin + 4, y + 17);
  doc.text(`Data: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin - 4, y + 12, { align: "right" });
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 4, y + 17, { align: "right" });

  doc.save(`OS-${order.order_id.slice(0, 8).toUpperCase()}.pdf`);
}

export function generateSingleItemOSPDF(
  order: PDFOrder,
  item: PDFOrderItem,
  clienteName: string = "Cliente"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const red = hexToRgb("#E30613");
  const purple = hexToRgb("#8B5CF6");
  const gold = hexToRgb("#C9A84C");
  const dark = hexToRgb("#1a1a1a");
  const white: [number, number, number] = [255, 255, 255];

  const isService = item.item_type === "servico";
  const accent = isService
    ? (item.item_service_type === "inverter" ? purple : red)
    : gold;

  // --- CABEÇALHO ---
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(0, 0, pageW, 35, "F");

  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("A.R CONSERTO", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 20);
  doc.text("Itabaiana/SE · (79) 99944-6596", margin, 25);
  doc.text("@A.RCONSERTOS", margin, 30);

  // Número da O.S.
  doc.setTextColor(red[0], red[1], red[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 18, { align: "right" });
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 24, { align: "right" });
  doc.text(`Item: ${item.item_name}`, pageW - margin, 28, { align: "right" });

  // --- DADOS DO CLIENTE ---
  let y = 42;
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", margin, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${clienteName}`, margin, y);
  y += 5;
  doc.text(`Status: ${order.order_status.toUpperCase()}`, margin, y);
  y += 5;
  doc.text(`Pagamento: ${(order.order_payment_method || "N/A").toUpperCase()}`, margin, y);
  y += 10;

  // --- DADOS DO ITEM ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO SERVIÇO/PRODUTO", margin, y);
  y += 6;

  // Box colorido do item
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.roundedRect(margin, y, pageW - margin * 2, isService ? 48 : 35, 2, 2, "F");

  y += 6;
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Item: ${item.item_name}`, margin + 4, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const tipo = isService
    ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional")
    : (item.item_product_condition || "Produto");
  doc.text(`Tipo: ${tipo}`, margin + 4, y);
  y += 5;
  doc.text(`Quantidade: ${item.item_quantity}`, margin + 4, y);
  y += 5;

  const valor = item.item_price
    ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}`
    : "Preço a definir";
  doc.text(`Valor: ${valor}`, margin + 4, y);
  y += 5;

  const pgto = isService
    ? (item.item_payment_status || "Pendente")
    : "Pago na compra";
  doc.text(`Pagamento: ${pgto}`, margin + 4, y);

  if (isService) {
    y += 5;
    doc.text(`Problema: ${item.item_problem_description || "Não informado"}`, margin + 4, y);
  }

  y += 10;

  // --- DIAGNÓSTICO (se serviço) ---
  if (isService && item.item_diagnosis) {
    if (y > pageH - 50) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNÓSTICO", margin, y);
    y += 6;

    doc.setFillColor(240, 248, 255);
    doc.roundedRect(margin, y, pageW - margin * 2, 20, 2, 2, "F");
    doc.setDrawColor(100, 150, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageW - margin * 2, 20, 2, 2, "S");

    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(item.item_diagnosis, margin + 4, y + 7, { maxWidth: pageW - margin * 2 - 8 });

    y += 26;
  }

  // --- CERTIFICADO DE GARANTIA (se serviço concluído) ---
  if (isService && item.item_completed_at && item.item_warranty_expires_at) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(240, 248, 240);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, "F");
    doc.setDrawColor(68, 221, 136);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, "S");

    doc.setTextColor(34, 139, 34);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE GARANTIA — 90 DIAS", margin + 4, y + 7);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Concluído em: ${new Date(item.item_completed_at).toLocaleDateString("pt-BR")} | ` +
      `Garantia até: ${new Date(item.item_warranty_expires_at).toLocaleDateString("pt-BR")}`,
      margin + 4,
      y + 13
    );
    doc.text(
      "Cobertura: mesmo defeito reparado, peças substituídas e mão de obra.",
      margin + 4,
      y + 18
    );

    y += 28;
  }

  // --- ASSINATURAS ---
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS", margin, y);
  y += 8;

  const sigW = (pageW - margin * 2 - 10) / 2;

  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y + 15, margin + sigW, y + 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Técnico Responsável", margin, y + 20);
  doc.text("A.R Conserto", margin, y + 24);

  doc.line(margin + sigW + 10, y + 15, margin + sigW * 2 + 10, y + 15);
  doc.text("Cliente", margin + sigW + 10, y + 20);
  doc.text(clienteName, margin + sigW + 10, y + 24);

  y += 32;

  // --- CANHOTO ---
  if (y > pageH - 30) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(red[0], red[1], red[2]);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  y += 4;
  doc.setFillColor(255, 245, 245);
  doc.rect(margin, y, pageW - margin * 2, 18, "F");
  doc.setDrawColor(red[0], red[1], red[2]);
  doc.rect(margin, y, pageW - margin * 2, 18, "S");

  doc.setTextColor(red[0], red[1], red[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO — RECORTAR", margin + 4, y + 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()} | Item: ${item.item_name}`, margin + 4, y + 12);
  doc.text(`Cliente: ${clienteName}`, margin + 4, y + 16);

  const itemSufix = isService
    ? (item.item_service_type === "inverter" ? "INV" : "CONV")
    : "PROD";
  doc.save(`OS-${order.order_id.slice(0, 8).toUpperCase()}-${itemSufix}.pdf`);
}
