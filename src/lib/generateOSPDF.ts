"use client";

export interface PDFOrderItem {
  item_type: string;
  item_name: string;
  item_service_type: string | null;
  item_quantity: number;
  item_price: number | null;
  item_payment_status: string | null;
  item_amount_paid: number | null;
  item_scheduled_date: string | null;
  item_problem_description: string | null;
  item_diagnosis: string | null;
  item_completed_at: string | null;
  item_warranty_expires_at: string | null;
  item_product_category: string | null;
  item_product_condition: string | null;
  item_product_images: string[] | null;
  status: string | null;
  teste_equipamento_ligado?: boolean;
  teste_funcao_principal?: boolean;
  teste_funcoes_secundarias?: boolean;
  teste_pecas_substituidas?: boolean;
  teste_funcionando_normalmente?: boolean;
  entrega_equipamento_entregue?: boolean;
  entrega_acessorios_conferidos?: boolean;
  entrega_equipamento_testado?: boolean;
  entrega_pagamento_registrado?: boolean;
  entrega_os_enviada?: boolean;
  entrega_garantia_disponibilizada?: boolean;
  entrega_data?: string | null;
  entrega_hora?: string | null;
}

export interface PDFOrder {
  order_id: string;
  order_status: string;
  order_payment_method: string | null;
  order_total: number;
  order_created_at: string;
  order_notes: string | null;
  order_updated_at: string | null;
  items: PDFOrderItem[];
}

export interface PDFCliente {
  nome: string;
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  forma_atendimento: string | null;
}

// Color palette - professional blues and grays, accent red/gold
const COLORS = {
  primary: [30, 58, 138] as [number, number, number],    // Indigo 700 - headers
  accent: [227, 6, 19] as [number, number, number],       // Brand red
  gold: [201, 168, 76] as [number, number, number],      // Gold
  dark: [26, 26, 26] as [number, number, number],        // Near black - text
  light: [248, 249, 252] as [number, number, number],    // Light gray - backgrounds
  border: [226, 232, 240] as [number, number, number],   // Border gray
  success: [34, 197, 94] as [number, number, number],    // Green
  warning: [245, 158, 16] as [number, number, number],   // Orange
  muted: [140, 140, 140] as [number, number, number],    // Gray text
};

export async function generateOSPDF(
  order: PDFOrder,
  cliente: PDFCliente,
  empresaInfo: { nome: string; cnpj: string; endereco: string; telefone: string; email: string; site: string }
) {
  const [{ jsPDF: JsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const headerHeight = 35;
  const contentTop = 43;
  const marginBottom = 20;
  const maxContentY = pageH - marginBottom;
  let y = contentTop;

  const addHeader = () => {
    doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.rect(0, 0, pageW, headerHeight, "F");

    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(empresaInfo.nome || "A.R CONSERTOS", margin, 12);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 18);
    doc.text(`${empresaInfo.endereco || "Itabaiana/SE"} · ${empresaInfo.telefone || "(79) 99944-6596"}`, margin, 23);
    doc.text(empresaInfo.email || "@A.RCONSERTOS", margin, 28);

    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 16, { align: "right" });
    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 22, { align: "right" });
    doc.text(`Pedido: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin, 27, { align: "right" });
  };

  addHeader();

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > maxContentY) {
      doc.addPage();
      addHeader();
      y = contentTop;
      return true;
    }
    return false;
  };

  let sectionNum = 0;

  const addSectionTitle = (title: string, minContentHeight = 16) => {
    ensureSpace(minContentHeight);
    sectionNum += 1;
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${sectionNum}. ${title}`, margin, y);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 7;
  };

  const addField = (label: string, value: string | number | null | undefined, indent = 0) => {
    const indentX = margin + indent;
    const valueText = value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "-";
    const valueX = indentX + 75;
    const maxW = pageW - margin - valueX;
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(valueText, maxW);
    const lineH = 4.2;
    const neededH = Math.max(lines.length * lineH, lineH) + 1.5;

    ensureSpace(neededH);

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, indentX, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, valueX, y);
    y += neededH;
  };

  // ─── 1. DADOS DO CLIENTE ───
  addSectionTitle("DADOS DO CLIENTE", 28);
  addField("Nome", cliente.nome);
  if (cliente.cpf) addField("CPF/CNPJ", cliente.cpf);
  addField("Telefone", cliente.telefone || cliente.whatsapp);
  if (cliente.email) addField("E-mail", cliente.email);
  if (cliente.endereco) addField("Endereço", cliente.endereco);
  y += 5;

  // ─── 2. IDENTIFICAÇÃO DO EQUIPAMENTO / PRODUTO ───
  addSectionTitle("IDENTIFICAÇÃO DO EQUIPAMENTO / PRODUTO", 28);
  order.items.forEach((item) => {
    ensureSpace(20);
    if (item.item_type === "produto") {
      addField("Produto", item.item_name);
      addField("Categoria", item.item_product_category);
      addField("Condição", item.item_product_condition);
      addField("Quantidade", item.item_quantity);
      addField("Preço unitário", item.item_price ? `R$ ${Number(item.item_price).toFixed(2).replace(".", ",")}` : "-");
    } else {
      addField("Serviço", item.item_name);
      addField("Tipo", item.item_service_type === "inverter" ? "Inverter" : "Convencional");
      addField("Descrição do problema", item.item_problem_description || "Não informado");
      addField("Data/hora solicitada", item.item_scheduled_date ? new Date(item.item_scheduled_date).toLocaleString("pt-BR") : "-");
    }
    y += 4;
  });
  y += 3;

  // ─── 3. DIAGNÓSTICO TÉCNICO ───
  const hasService = order.items.some(i => i.item_type === "servico");
  if (hasService) {
    addSectionTitle("DIAGNÓSTICO TÉCNICO", 24);
    order.items.filter(i => i.item_type === "servico").forEach(item => {
      ensureSpace(18);
      addField("Item", item.item_name);
      doc.setFontSize(8);
      const dx = margin;
      const lines = doc.splitTextToSize(item.item_diagnosis || "Não informado", pageW - margin * 2 - 28);
      const neededH = lines.length * 4 + 3;
      ensureSpace(neededH);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.text("Diagnóstico:", dx, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, dx + 28, y);
      y += neededH;
    });
    y += 4;
  }

  // ─── 4. ORÇAMENTO ───
  addSectionTitle("ORÇAMENTO", 30);

  const tableData = order.items.map(item => {
    const isSvc = item.item_type === "servico";
    const valor = item.item_price ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}` : "-";
    const pgto = isSvc ? (item.item_payment_status || "Pendente") : "Pago na compra";
    return [
      item.item_name,
      isSvc ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional") : (item.item_product_condition || "Produto"),
      String(item.item_quantity),
      valor,
      pgto,
    ];
  });

  ensureSpace(25);
  autoTable(doc, {
    startY: y,
    head: [["Item", "Tipo", "Qtd", "Valor", "Pagamento"]],
    body: tableData,
    theme: "grid",
    margin: { top: contentTop, bottom: marginBottom, left: margin, right: margin },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.light,
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "middle" as const,
      textColor: COLORS.dark,
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader();
      }
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;

  ensureSpace(20);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Forma de pagamento:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(` ${order.order_payment_method ? order.order_payment_method.toUpperCase() : "A combinar"}`, margin + 35, y);
  y += 7;

  // ─── 5. AUTORIZAÇÃO DO CLIENTE ───
  addSectionTitle("AUTORIZAÇÃO DO CLIENTE", 28);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const authText = "Declaro que tive acesso ao orçamento e autorizo a execução do serviço conforme registrado nesta Ordem de Serviço. Estou ciente de que o prazo de garantia começa a contar a partir da data de conclusão do serviço.";
  const authLines = doc.splitTextToSize(authText, pageW - margin * 2);
  doc.text(authLines, margin, y);
  y += authLines.length * 3.8 + 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Nome: ________________________________  CPF: ________________________________", margin, y);
  y += 5;
  doc.text("Assinatura: _________________________  Data: ___/___/_______  Hora: ___:___", margin, y);
  y += 7;

  // ─── 6. SERVIÇO REALIZADO ───
  const completedItems = order.items.filter(i => i.status === "concluido" || i.status === "pronto" || i.status === "entregue" || order.order_status === "concluido");
  if (completedItems.length > 0) {
    addSectionTitle("SERVIÇO REALIZADO", 24);
    completedItems.forEach(item => {
      ensureSpace(18);
      addField("Item", item.item_name);
      addField("Descrição do serviço", item.item_diagnosis || "Serviço realizado conforme diagnóstico");
      if (item.item_type === "servico") {
        addField("Data conclusão", item.item_completed_at ? new Date(item.item_completed_at).toLocaleDateString("pt-BR") : "-");
        addField("Técnico", "A.R Consertos");
      }
      y += 3;
    });
    y += 4;
  }

  // ─── 7. TESTE FINAL (só serviços) ───
  if (hasService) {
    addSectionTitle("TESTE FINAL", 35);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    const svcItems = order.items.filter(i => i.item_type === "servico");
    const tests = [
      { label: "Equipamento ligado após reparo", key: "teste_equipamento_ligado" },
      { label: "Função principal testada", key: "teste_funcao_principal" },
      { label: "Funções secundárias testadas", key: "teste_funcoes_secundarias" },
      { label: "Peças substituídas testadas", key: "teste_pecas_substituidas" },
      { label: "Equipamento funcionando normalmente", key: "teste_funcionando_normalmente" },
    ];
    tests.forEach(t => {
      const checked = svcItems.some(i => (i as PDFOrderItem)[t.key as keyof PDFOrderItem] === true);
      doc.text(`[${checked ? "X" : " "}] ${t.label}`, margin, y);
      y += 4.5;
    });
    y += 5;
  }

  // ─── 8. CONDIÇÕES DE GARANTIA ───
  addSectionTitle("CONDIÇÕES DE GARANTIA", 45);

  const certBoxH = 25;
  ensureSpace(certBoxH + 4);
  doc.setFillColor(245, 255, 245);
  doc.setDrawColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, pageW - margin * 2, certBoxH, 2.5, 2.5, "FD");

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTIA", margin + 4, y + 5);

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Prazo: 90 (noventa) dias a partir da data de conclusão do serviço.", margin + 4, y + 10);
  doc.text("Cobertura: mesmo defeito reparado, peças substituídas e mão de obra.", margin + 4, y + 14.5);
  doc.text("Para acionar: apresente este documento ou informe o número da O.S.", margin + 4, y + 19);
  y += certBoxH + 4;

  const legalText = "A A.R. Consertos observará a garantia legal aplicável aos serviços realizados, respeitando os direitos assegurados pelo Código de Defesa do Consumidor [Lei nº 8.078/1990, art. 26, II - prazo de 90 dias]. Danos decorrentes de queda, impacto, mau uso, instalação inadequada, ligação elétrica inadequada, sobretensão, líquidos, umidade, oxidação, intervenção ou reparo por terceiros serão submetidos à avaliação técnica. Nenhum serviço adicional com custo será realizado sem prévia autorização.";
  const legalLines = doc.splitTextToSize(legalText, pageW - margin * 2);
  const legalH = legalLines.length * 3.3 + 4;

  ensureSpace(legalH + 3);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 3.5;

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.text(legalLines, margin, y);
  y += legalH + 2;

  // ─── 9. ENTREGA DO EQUIPAMENTO (só serviços) ───
  if (hasService) {
    addSectionTitle("ENTREGA DO EQUIPAMENTO", 38);
    const svcForEntrega = order.items.filter(i => i.item_type === "servico");
    const entregaChecks = [
      { label: "Equipamento entregue", key: "entrega_equipamento_entregue" },
      { label: "Acessórios conferidos", key: "entrega_acessorios_conferidos" },
      { label: "Equipamento testado", key: "entrega_equipamento_testado" },
      { label: "Pagamento registrado", key: "entrega_pagamento_registrado" },
      { label: "Ordem de Serviço enviada ao cliente", key: "entrega_os_enviada" },
      { label: "Condições de garantia disponibilizadas", key: "entrega_garantia_disponibilizada" },
    ];
    doc.setFontSize(7);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    entregaChecks.forEach(item => {
      const checked = svcForEntrega.some(i => (i as PDFOrderItem)[item.key as keyof PDFOrderItem] === true);
      doc.text(`[${checked ? "X" : " "}] ${item.label}`, margin, y);
      y += 4.5;
    });
    y += 2;
    const firstSvc = svcForEntrega[0];
    const entregaData = firstSvc?.entrega_data || null;
    const entregaHora = firstSvc?.entrega_hora || null;
    doc.text(`Data de entrega: ${entregaData || "___/___/_______"}  Hora: ${entregaHora || "___:___"}`, margin, y);
    y += 6;
  }

  // ─── 10. ASSINATURAS ───
  addSectionTitle("ASSINATURAS", 28);
  ensureSpace(24);
  const sigW = (pageW - margin * 2 - 10) / 2;

  doc.setLineDashPattern([0], 0);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 10, margin + sigW, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Técnico Responsável", margin, y + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.text("A.R Consertos", margin, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.line(margin + sigW + 10, y + 10, margin + sigW * 2 + 10, y + 10);
  doc.text("Cliente", margin + sigW + 10, y + 14);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(cliente.nome, margin + sigW + 10, y + 18);

  y += 24;

  // ─── 11. CANHOTO DESTACÁVEL ───
  ensureSpace(28);
  doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2.5, 2], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin, y + 3, pageW - margin * 2, 17, "FD");

  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO - RECORTAR", margin + 4, y + 7.5);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()}`, margin + 4, y + 12);
  doc.text(`Cliente: ${cliente.nome}`, margin + 4, y + 16);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin - 4, y + 12, { align: "right" });
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 4, y + 16, { align: "right" });

  // ─── NUMERAÇÃO DE PÁGINAS E RODAPÉ (com margem bottom fixa) ───
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 11, pageW - margin, pageH - 11);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(
      "A.R Consertos · Documento de controle e garantia do cliente",
      margin,
      pageH - 6
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW - margin,
      pageH - 6,
      { align: "right" }
    );
  }

  doc.save(`OS-${order.order_id.slice(0, 8).toUpperCase()}.pdf`);
}

export async function generateSingleItemOSPDF(
  order: PDFOrder,
  item: PDFOrderItem,
  cliente: PDFCliente,
  empresaInfo: { nome: string; cnpj: string; endereco: string; telefone: string; email: string; site: string }
) {
  const [{ jsPDF: JsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const headerHeight = 35;
  const contentTop = 43;
  const marginBottom = 20;
  const maxContentY = pageH - marginBottom;
  let y = contentTop;

  const accent: [number, number, number] = item.item_type === "servico"
    ? (item.item_service_type === "inverter" ? [139, 92, 246] : COLORS.accent)
    : COLORS.gold;

  const isService = item.item_type === "servico";

  const addHeader = () => {
    doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.rect(0, 0, pageW, headerHeight, "F");

    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(empresaInfo.nome || "A.R CONSERTOS", margin, 12);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 18);
    doc.text(`${empresaInfo.endereco || "Itabaiana/SE"} · ${empresaInfo.telefone || "(79) 99944-6596"}`, margin, 23);
    doc.text(empresaInfo.email || "@A.RCONSERTOS", margin, 28);

    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 16, { align: "right" });
    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 22, { align: "right" });
    doc.text(`Pedido: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin, 27, { align: "right" });
  };

  addHeader();

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > maxContentY) {
      doc.addPage();
      addHeader();
      y = contentTop;
      return true;
    }
    return false;
  };

  let secCount = 0;

  const addSectionTitle = (title: string, minContentHeight = 16) => {
    ensureSpace(minContentHeight);
    secCount += 1;
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${secCount}. ${title}`, margin, y);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 7;
  };

  const addField = (label: string, value: string | number | null | undefined) => {
    const valueText = value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "-";
    const valueX = margin + 75;
    const maxW = pageW - margin - valueX;
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(valueText, maxW);
    const lineH = 4.2;
    const neededH = Math.max(lines.length * lineH, lineH) + 1.5;

    ensureSpace(neededH);

    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, valueX, y);
    y += neededH;
  };

  // ─── 1. DADOS DO CLIENTE ───
  addSectionTitle("DADOS DO CLIENTE", 28);
  addField("Nome", cliente.nome);
  if (cliente.cpf) addField("CPF/CNPJ", cliente.cpf);
  addField("Telefone", cliente.telefone || cliente.whatsapp);
  if (cliente.email) addField("E-mail", cliente.email);
  if (cliente.endereco) addField("Endereço", cliente.endereco);
  y += 5;

  // ─── 2. IDENTIFICAÇÃO DO EQUIPAMENTO ───
  addSectionTitle("IDENTIFICAÇÃO DO EQUIPAMENTO", 28);
  addField("Item", item.item_name);
  addField("Tipo", isService ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional") : (item.item_product_condition || "Produto"));
  addField("Categoria", item.item_product_category);
  addField("Quantidade", item.item_quantity);
  const valor = item.item_price
    ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}`
    : "Preço a definir";
  addField("Valor", valor);
  addField("Pagamento", isService ? (item.item_payment_status || "Pendente") : "Pago na compra");

  if (isService) {
    addField("Defeito informado pelo cliente", item.item_problem_description || "Não informado");
    addField("Data/hora solicitada", item.item_scheduled_date ? new Date(item.item_scheduled_date).toLocaleString("pt-BR") : "-");
  }
  y += 4;

  // ─── 3. DIAGNÓSTICO ───
  if (isService && item.item_diagnosis) {
    addSectionTitle("DIAGNÓSTICO TÉCNICO", 22);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const diagLines = doc.splitTextToSize(item.item_diagnosis, pageW - margin * 2);
    const neededH = diagLines.length * 4 + 3;
    ensureSpace(neededH);
    doc.text(diagLines, margin, y);
    y += neededH + 4;
  }

  // ─── 4. ORÇAMENTO ───
  addSectionTitle("ORÇAMENTO", 30);
  const tableData = [[
    item.item_name,
    isService ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional") : (item.item_product_condition || "Produto"),
    String(item.item_quantity),
    item.item_price ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}` : "-",
    isService ? (item.item_payment_status || "Pendente") : "Pago na compra",
  ]];

  ensureSpace(25);
  autoTable(doc, {
    startY: y,
    head: [["Item", "Tipo", "Qtd", "Valor", "Pagamento"]],
    body: tableData,
    theme: "grid",
    margin: { top: contentTop, bottom: marginBottom, left: margin, right: margin },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.light,
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "middle" as const,
      textColor: COLORS.dark,
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader();
      }
    },
  });

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;

  ensureSpace(20);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 7;

  // ─── 5. AUTORIZAÇÃO ───
  addSectionTitle("AUTORIZAÇÃO DO CLIENTE", 28);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const authText = "Declaro que tive acesso ao orçamento e autorizo a execução do serviço conforme registrado nesta Ordem de Serviço. Estou ciente de que o prazo de garantia começa a contar a partir da data de conclusão do serviço.";
  const authLines = doc.splitTextToSize(authText, pageW - margin * 2);
  doc.text(authLines, margin, y);
  y += authLines.length * 3.8 + 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Nome: ________________________________  CPF: ________________________________", margin, y);
  y += 5;
  doc.text("Assinatura: _________________________  Data: ___/___/_______  Hora: ___:___", margin, y);
  y += 7;

  // ─── 6. SERVIÇO REALIZADO ───
  if (item.status === "concluido" || item.status === "pronto" || item.status === "entregue" || order.order_status === "concluido") {
    addSectionTitle("SERVIÇO REALIZADO", 24);
    addField("Descrição do serviço", item.item_diagnosis || "Serviço realizado conforme diagnóstico");
    if (item.item_completed_at) {
      addField("Data conclusão", new Date(item.item_completed_at).toLocaleDateString("pt-BR"));
    }
    addField("Técnico", "A.R Consertos");
    y += 4;
  }

  // ─── 7. TESTE FINAL (só serviços) ───
  if (isService) {
    addSectionTitle("TESTE FINAL", 35);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    const singleTests = [
      { label: "Equipamento ligado após reparo", key: "teste_equipamento_ligado" },
      { label: "Função principal testada", key: "teste_funcao_principal" },
      { label: "Funções secundárias testadas", key: "teste_funcoes_secundarias" },
      { label: "Peças substituídas testadas", key: "teste_pecas_substituidas" },
      { label: "Equipamento funcionando normalmente", key: "teste_funcionando_normalmente" },
    ];
    singleTests.forEach(t => {
      const checked = (item as PDFOrderItem)[t.key as keyof PDFOrderItem] === true;
      doc.text(`[${checked ? "X" : " "}] ${t.label}`, margin, y);
      y += 4.5;
    });
    y += 5;
  }

  // ─── 8. CONDIÇÕES DE GARANTIA ───
  addSectionTitle("CONDIÇÕES DE GARANTIA", 45);

  const certBoxH = 25;
  ensureSpace(certBoxH + 4);
  doc.setFillColor(245, 255, 245);
  doc.setDrawColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, pageW - margin * 2, certBoxH, 2.5, 2.5, "FD");

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTIA", margin + 4, y + 5);

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Prazo: 90 (noventa) dias a partir da data de conclusão do serviço.", margin + 4, y + 10);
  doc.text("Cobertura: mesmo defeito reparado, peças substituídas e mão de obra.", margin + 4, y + 14.5);
  doc.text("Para acionar: apresente este documento ou informe o número da O.S.", margin + 4, y + 19);
  y += certBoxH + 4;

  const legalText = "A A.R. Consertos observará a garantia legal aplicável aos serviços realizados, respeitando os direitos assegurados pelo Código de Defesa do Consumidor [Lei nº 8.078/1990, art. 26, II - prazo de 90 dias]. Danos decorrentes de queda, impacto, mau uso, instalação inadequada, ligação elétrica inadequada, sobretensão, líquidos, umidade, oxidação, intervenção ou reparo por terceiros serão submetidos à avaliação técnica. Nenhum serviço adicional com custo será realizado sem prévia autorização.";
  const legalLines = doc.splitTextToSize(legalText, pageW - margin * 2);
  const legalH = legalLines.length * 3.3 + 4;

  ensureSpace(legalH + 3);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 3.5;

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.text(legalLines, margin, y);
  y += legalH + 2;

  // ─── 9. ENTREGA (só serviços) ───
  if (isService) {
    addSectionTitle("ENTREGA DO EQUIPAMENTO", 38);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    const singleEntrega = [
      { label: "Equipamento entregue", key: "entrega_equipamento_entregue" },
      { label: "Acessórios conferidos", key: "entrega_acessorios_conferidos" },
      { label: "Equipamento testado", key: "entrega_equipamento_testado" },
      { label: "Pagamento registrado", key: "entrega_pagamento_registrado" },
      { label: "Ordem de Serviço enviada ao cliente", key: "entrega_os_enviada" },
      { label: "Condições de garantia disponibilizadas", key: "entrega_garantia_disponibilizada" },
    ];
    singleEntrega.forEach(ent => {
      const checked = (item as PDFOrderItem)[ent.key as keyof PDFOrderItem] === true;
      doc.text(`[${checked ? "X" : " "}] ${ent.label}`, margin, y);
      y += 4.5;
    });
    y += 2;
    doc.text(`Data de entrega: ${item.entrega_data || "___/___/_______"}  Hora: ${item.entrega_hora || "___:___"}`, margin, y);
    y += 6;
  }

  // ─── 10. ASSINATURAS ───
  addSectionTitle("ASSINATURAS", 28);
  ensureSpace(24);
  const sigW = (pageW - margin * 2 - 10) / 2;

  doc.setLineDashPattern([0], 0);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 10, margin + sigW, y + 10);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Técnico Responsável", margin, y + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text("A.R Consertos", margin, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.line(margin + sigW + 10, y + 10, margin + sigW * 2 + 10, y + 10);
  doc.text("Cliente", margin + sigW + 10, y + 14);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(cliente.nome, margin + sigW + 10, y + 18);

  y += 24;

  // ─── 11. CANHOTO ───
  ensureSpace(28);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2.5, 2], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin, y + 3, pageW - margin * 2, 17, "FD");

  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO - RECORTAR", margin + 4, y + 7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(6.8);
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()} | Item: ${item.item_name}`, margin + 4, y + 12);
  doc.text(`Cliente: ${cliente.nome}`, margin + 4, y + 16);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin - 4, y + 12, { align: "right" });
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 4, y + 16, { align: "right" });

  // ─── NUMERAÇÃO DE PÁGINAS E RODAPÉ (com margem bottom fixa) ───
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 11, pageW - margin, pageH - 11);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(
      "A.R Consertos · Documento de controle e garantia do cliente",
      margin,
      pageH - 6
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW - margin,
      pageH - 6,
      { align: "right" }
    );
  }

  const itemSufix = isService
    ? (item.item_service_type === "inverter" ? "INV" : "CONV")
    : "PROD";
  doc.save(`OS-${order.order_id.slice(0, 8).toUpperCase()}-${itemSufix}.pdf`);
}
