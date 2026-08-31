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
  muted: [163, 163, 163] as [number, number, number],    // Gray text
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
  let y = margin;

  const addHeader = () => {
    doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.rect(0, 0, pageW, 35, "F");

    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(empresaInfo.nome || "A.R CONSERTOS", margin, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 20);
    doc.text(`${empresaInfo.endereco || "Itabaiana/SE"} · ${empresaInfo.telefone || "(79) 99944-6596"}`, margin, 25);
    doc.text(empresaInfo.email || "@A.RCONSERTOS", margin, 30);

    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 18, { align: "right" });
    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 24, { align: "right" });
    doc.text(`Pedido: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin, 28, { align: "right" });
  };

  addHeader();
  y = 42;

  let sectionNum = 0;

  const addSectionTitle = (title: string) => {
    if (y > pageH - 12) { doc.addPage(); addHeader(); y = 42; }
    sectionNum += 1;
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${sectionNum}. ${title}`, margin, y);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 8;
  };

  const addField = (label: string, value: string | number | null | undefined, indent = 0) => {
    const indentX = margin + indent;
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const labelText = `${label}:`;
    doc.text(labelText, indentX, y);
    doc.setFont("helvetica", "normal");
    const valueText = value !== null && value !== undefined ? String(value) : "-";
    const valueX = indentX + 80;
    const maxW = pageW - margin - valueX;
    const lines = doc.splitTextToSize(valueText, maxW);
    doc.text(lines, valueX, y);
    y += lines.length * 4.5;
  };

  // ─── 2. DADOS DO CLIENTE ───
  addSectionTitle("DADOS DO CLIENTE");
  addField("Nome", cliente.nome);
  if (cliente.cpf) addField("CPF/CNPJ", cliente.cpf);
  addField("Telefone", cliente.telefone || cliente.whatsapp);
  if (cliente.email) addField("E-mail", cliente.email);
  if (cliente.endereco) addField("Endereço", cliente.endereco);
  y += 8;

  // ─── IDENTIFICAÇÃO DO EQUIPAMENTO / PRODUTO ───
  addSectionTitle("IDENTIFICAÇÃO DO EQUIPAMENTO / PRODUTO");
  order.items.forEach((item, idx) => {
    if (item.item_type === "produto") {
      addField("Produto", item.item_name, idx > 0 ? 0 : 0);
      addField("Categoria", item.item_product_category);
      addField("Condição", item.item_product_condition);
      addField("Quantidade", item.item_quantity);
      addField("Preço unitário", item.item_price ? `R$ ${Number(item.item_price).toFixed(2).replace(".", ",")}` : "-");
    } else {
      addField("Serviço", item.item_name, idx > 0 ? 0 : 0);
      addField("Tipo", item.item_service_type === "inverter" ? "Inverter" : "Convencional");
      addField("Descrição do problema", item.item_problem_description || "Não informado");
      addField("Data/hora solicitada", item.item_scheduled_date ? new Date(item.item_scheduled_date).toLocaleString("pt-BR") : "-");
    }
    y += 8;
  });

  // ─── 4. DIAGNÓSTICO ───
  const hasService = order.items.some(i => i.item_type === "servico");
  if (hasService) {
    addSectionTitle("DIAGNÓSTICO TÉCNICO");
    order.items.filter(i => i.item_type === "servico").forEach(item => {
      addField(`Item: ${item.item_name}`, "");
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const dx = margin;
      const lines = doc.splitTextToSize(item.item_diagnosis || "Não informado", pageW - margin * 2 - 60);
      doc.text(`Diagnóstico:`, dx, y);
      doc.text(lines, dx + 28, y);
      y += lines.length * 4 + 2;

      // Causa identificada
      const causaLines = doc.splitTextToSize("Causa identificada: " + (item.item_diagnosis || "A ser determinada"), pageW - margin * 2);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.text(causaLines, dx, y);
      y += causaLines.length * 3.5 + 2;
    });
    y += 8;
  }

  // ─── ORÇAMENTO ───
  addSectionTitle("ORÇAMENTO");

  const tableY = y;
  const tableData = order.items.map(item => {
    const isService = item.item_type === "servico";
    const valor = item.item_price ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}` : "-";
    const pgto = isService ? (item.item_payment_status || "Pendente") : "Pago na compra";
    return [
      item.item_name,
      isService ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional") : (item.item_product_condition || "Produto"),
      String(item.item_quantity),
      valor,
      pgto,
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [["Item", "Tipo", "Qtd", "Valor", "Pagamento"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.light,
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: "middle" as const,
      textColor: COLORS.dark,
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  y = doc.lastAutoTable?.finalY || tableY + 20;
  y += 8;

  // Valores
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 8;
  doc.text(`TOTAL: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 8;

  // Forma de pagamento
  doc.setFont("helvetica", "bold");
  doc.text("Forma de pagamento:", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(` ${order.order_payment_method ? order.order_payment_method.toUpperCase() : "N/A"}`, margin, y);
  y += 8;

  // ─── 6. AUTORIZAÇÃO ───
  const autSection = hasService ? 6 : sectionNum + 1;
  addSectionTitle(`${autSection}. AUTORIZAÇÃO DO CLIENTE`);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const authText = "Declaro que tive acesso ao orçamento e autorizo a execução do serviço conforme registrado nesta Ordem de Serviço. Estou ciente de que dados faltam e que o prazo começa a contar a partir da data de conclusão.";
  const authLines = doc.splitTextToSize(authText, pageW - margin * 2);
  doc.text(authLines, margin, y);
  y += authLines.length * 4 + 3;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Nome: ________________________________  CPF: ________________________________", margin, y);
  y += 5;
  doc.text("Assinatura: _________________________  Data: ___/___/_______  Hora: ___:___", margin, y);
  y += 8;

  // ─── 7. SERVIÇO REALIZADO ───
  const servSection = autSection + 1;
  addSectionTitle(`${servSection}. SERVIÇO REALIZADO`);
  const completedItems = order.items.filter(i => i.status === "concluido" || i.status === "pronta" || i.status === "entregue" || order.order_status === "concluido");
  completedItems.forEach(item => {
    addField("Item", item.item_name);
    addField("Descrição do serviço", item.item_diagnosis || "Servico realizado conforme diagnóstico");
    if (item.item_type === "servico") {
      addField("Data conclusão", item.item_completed_at ? new Date(item.item_completed_at).toLocaleDateString("pt-BR") : "-");
      addField("Técnico", "A.R Conserto");
    }
    y += 8;
  });
  if (y > pageH - 60) { doc.addPage(); addHeader(); y = 42; }
  // ─── TESTE FINAL (só serviços) ───
  if (hasService) {
    if (y > pageH - 60) { doc.addPage(); addHeader(); y = 42; }
    addSectionTitle("TESTE FINAL");
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
      y += 5;
    });
    y += 8;
  }

  // ─── GARANTIA ───
  addSectionTitle("CONDIÇÕES DE GARANTIA");

  // Garantia visual
  doc.setFillColor(245, 255, 245);
  doc.setDrawColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, "FD");
  y += 5;

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTIA", margin + 4, y);
  y += 5;

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Prazo: 90 (noventa) dias a partir da data de conclusão do serviço.", margin + 4, y);
  y += 8;
  doc.text("Cobertura: mesmo defeito reparado, peças substituídas e mão de obra.", margin + 4, y);
  y += 8;
  doc.text("Para acionar: apresente este documento ou informe o número da O.S.", margin + 4, y);
  y += 12;

  // Texto legal completo
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const legalText = "A A.R. Consertos observará a garantia legal aplicável aos serviços realizados, respeitando os direitos assegurados pelo Código de Defesa do Consumidor. Para serviços e produtos duráveis, será observado o prazo de 90 (noventa) dias previsto no art. 26, II, do Código de Defesa do Consumidor para reclamação de vícios aparentes ou de fácil constatação [Lei nº 8.078/1990]. Danos decorrentes de queda, impacto, mau uso, instalação inadequada, ligação elétrica inadequada, sobretensão, líquidos, umidade, oxidação, corrosão, intervenção ou reparo realizado por terceiros, ou outras causas externas, serão submetidos à avaliação técnica, sem prejuízo dos direitos assegurados pela legislação. Nenhum serviço adicional sujeito a cobrança será realizado sem prévia ciência e autorização do cliente. Esta condição de garantia não representa renúncia, exclusão ou limitação dos direitos assegurados ao consumidor pela legislação vigente.";
  const legalLines = doc.splitTextToSize(legalText, pageW - margin * 2);

  // Add more space between certificate box and legal text
  y += 8;

  // Add a subtle separator line
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.text(legalLines, margin, y);
  y += legalLines.length * 3.5 + 8;

  // ─── ENTREGA (só serviços) ───
  if (hasService) {
    if (y > pageH - 80) { doc.addPage(); addHeader(); y = 42; }
    addSectionTitle("ENTREGA DO EQUIPAMENTO");
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
      y += 5;
    });
    y += 8;
    const firstSvc = svcForEntrega[0];
    const entregaData = firstSvc?.entrega_data || null;
    const entregaHora = firstSvc?.entrega_hora || null;
    doc.text(`Data de entrega: ${entregaData || "___/___/_______"}  Hora: ${entregaHora || "___:___"}`, margin, y);
    y += 8;
  }
  y += 8;

  // ─── ASSINATURAS ───
  addSectionTitle("ASSINATURAS");
  const sigW = (pageW - margin * 2 - 10) / 2;

  doc.setLineDashPattern([0], 0);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 12, margin + sigW, y + 12);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Técnico Responsável", margin, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.text("A.R Conserto", margin, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.line(margin + sigW + 10, y + 12, margin + sigW * 2 + 10, y + 12);
  doc.text("Cliente", margin + sigW + 10, y + 16);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(cliente.nome, margin + sigW + 10, y + 20);

  y += 28;

  // ─── CANHOTO DESTACÁVEL ───
  if (y > pageH - 25) { doc.addPage(); addHeader(); y = margin + 10; }

  doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y + 3, pageW - margin * 2, 18, "FD");

  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO - RECORTAR", margin + 4, y + 8);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()}`, margin + 4, y + 13);
  doc.text(`Cliente: ${cliente.nome}`, margin + 4, y + 17);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin - 4, y + 13, { align: "right" });
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 4, y + 17, { align: "right" });

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
  let y = margin;

  const accent: [number, number, number] = item.item_type === "servico"
    ? (item.item_service_type === "inverter" ? [139, 92, 246] : COLORS.accent)
    : COLORS.gold;

  const isService = item.item_type === "servico";

  const addHeader = () => {
    doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.rect(0, 0, pageW, 35, "F");

    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(empresaInfo.nome || "A.R CONSERTOS", margin, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TÉCNICO ELETRODOMÉSTICOS · INVERTER", margin, 20);
    doc.text(`${empresaInfo.endereco || "Itabaiana/SE"} · ${empresaInfo.telefone || "(79) 99944-6596"}`, margin, 25);
    doc.text(empresaInfo.email || "@A.RCONSERTOS", margin, 30);

    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`O.S. #${order.order_id.slice(0, 8).toUpperCase()}`, pageW - margin, 18, { align: "right" });
    doc.setTextColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 24, { align: "right" });
    doc.text(`Pedido: ${new Date(order.order_created_at).toLocaleDateString("pt-BR")}`, pageW - margin, 28, { align: "right" });
  };

  addHeader();
  y = 42;

  let secCount = 0;

  const addSectionTitle = (title: string) => {
    secCount += 1;
    if (y > pageH - 12) { doc.addPage(); addHeader(); y = 42; }
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${secCount}. ${title}`, margin, y);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 8;
  };

  const addField = (label: string, value: string | number | null | undefined) => {
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const labelText = `${label}:`;
    doc.text(labelText, margin, y);
    doc.setFont("helvetica", "normal");
    const valueText = value !== null && value !== undefined ? String(value) : "-";
    const valueX = margin + 80;
    const maxW = pageW - margin - valueX;
    const lines = doc.splitTextToSize(valueText, maxW);
    doc.text(lines, valueX, y);
    y += lines.length * 4.5;
  };

  // ─── DADOS DO CLIENTE ───
  addSectionTitle("DADOS DO CLIENTE");
  addField("Nome", cliente.nome);
  if (cliente.cpf) addField("CPF/CNPJ", cliente.cpf);
  addField("Telefone", cliente.telefone || cliente.whatsapp);
  if (cliente.email) addField("E-mail", cliente.email);
  if (cliente.endereco) addField("Endereço", cliente.endereco);
  y += 8;

  // ─── IDENTIFICAÇÃO DO EQUIPAMENTO ───
  addSectionTitle("IDENTIFICAÇÃO DO EQUIPAMENTO");
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
    y += 8;
  }

  // ─── DIAGNÓSTICO ───
  const diagSectionNum = secCount;
  if (isService && item.item_diagnosis) {
    addSectionTitle("DIAGNÓSTICO TÉCNICO");
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const diagLines = doc.splitTextToSize(item.item_diagnosis, pageW - margin * 2);
    doc.text(diagLines, margin, y);
    y += diagLines.length * 4 + 2;
    y += 8;
  }

  // ─── ORÇAMENTO ───
  addSectionTitle("ORÇAMENTO");
  const tableY = y;
  const tableData = [[
    item.item_name,
    isService ? (item.item_service_type === "inverter" ? "Inverter" : "Convencional") : (item.item_product_condition || "Produto"),
    String(item.item_quantity),
    item.item_price ? `R$ ${Number(item.item_price * item.item_quantity).toFixed(2).replace(".", ",")}` : "-",
    isService ? (item.item_payment_status || "Pendente") : "Pago na compra",
  ]];

  autoTable(doc, {
    startY: tableY,
    head: [["Item", "Tipo", "Qtd", "Valor", "Pagamento"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.light,
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: "middle" as const,
      textColor: COLORS.dark,
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  y = doc.lastAutoTable?.finalY || tableY + 20;
  y += 8;

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 8;
  doc.text(`TOTAL: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 55, y);
  y += 8;

  // ─── AUTORIZAÇÃO ───
  addSectionTitle("AUTORIZAÇÃO DO CLIENTE");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const authText = "Declaro que tive acesso ao orçamento e autorizo a execução do serviço conforme registrado nesta Ordem de Serviço. Estou ciente de que o prazo de garantia começa a contar a partir da data de conclusão do serviço.";
  const authLines = doc.splitTextToSize(authText, pageW - margin * 2);
  doc.text(authLines, margin, y);
  y += authLines.length * 4 + 3;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Nome: ________________________________  CPF: ________________________________", margin, y);
  y += 5;
  doc.text("Assinatura: _________________________  Data: ___/___/_______  Hora: ___:___", margin, y);
  y += 8;

  // ─── SERVIÇO REALIZADO ───
  if (item.status === "concluido" || item.status === "pronta" || item.status === "entregue" || order.order_status === "concluido") {
    addSectionTitle("SERVIÇO REALIZADO");
    addField("Descrição do serviço", item.item_diagnosis || "Serviço realizado conforme diagnóstico");
    if (item.item_completed_at) {
      addField("Data conclusão", new Date(item.item_completed_at).toLocaleDateString("pt-BR"));
    }
    addField("Técnico", "A.R Conserto");
    y += 8;
  }
  if (y > pageH - 60) { doc.addPage(); addHeader(); y = 42; }
  // ─── TESTE FINAL (só serviços) ───
  if (isService) {
    if (y > pageH - 60) { doc.addPage(); addHeader(); y = 35; }
    addSectionTitle("TESTE FINAL");
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
      y += 5;
    });
    y += 8;
  }

  // ─── GARANTIA ───
  addSectionTitle("CONDIÇÕES DE GARANTIA");

  // Garantia visual
  doc.setFillColor(245, 255, 245);
  doc.setDrawColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, "FD");
  y += 5;

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE GARANTIA", margin + 4, y);
  y += 5;

  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Prazo: 90 (noventa) dias a partir da data de conclusão do serviço.", margin + 4, y);
  y += 8;
  doc.text("Cobertura: mesmo defeito reparado, peças substituídas e mão de obra.", margin + 4, y);
  y += 8;
  doc.text("Para acionar: apresente este documento ou informe o número da O.S.", margin + 4, y);
  y += 12;

  // Texto legal completo
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const legalText = "A A.R. Consertos observará a garantia legal aplicável aos serviços realizados, respeitando os direitos assegurados pelo Código de Defesa do Consumidor. Para serviços e produtos duráveis, será observado o prazo de 90 (noventa) dias previsto no art. 26, II, do Código de Defesa do Consumidor para reclamação de vícios aparentes ou de fácil constatação [Lei nº 8.078/1990]. Danos decorrentes de queda, impacto, mau uso, instalação inadequada, ligação elétrica inadequada, sobretensão, líquidos, umidade, oxidação, corrosão, intervenção ou reparo realizado por terceiros, ou outras causas externas, serão submetidos à avaliação técnica, sem prejuízo dos direitos assegurados pela legislação. Nenhum serviço adicional sujeito a cobrança será realizado sem prévia ciência e autorização do cliente. Esta condição de garantia não representa renúncia, exclusão ou limitação dos direitos assegurados ao consumidor pela legislação vigente.";
  const legalLines = doc.splitTextToSize(legalText, pageW - margin * 2);

  // Add more space between certificate box and legal text
  y += 8;

  // Add a subtle separator line
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.text(legalLines, margin, y);
  y += legalLines.length * 3.5 + 8;

  // ─── ENTREGA (só serviços) ───
  if (isService) {
    if (y > pageH - 80) { doc.addPage(); addHeader(); y = 35; }
    addSectionTitle("ENTREGA DO EQUIPAMENTO");
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
      y += 5;
    });
    y += 8;
    doc.text(`Data de entrega: ${item.entrega_data || "___/___/_______"}  Hora: ${item.entrega_hora || "___:___"}`, margin, y);
    y += 8;
  }

  // ─── ASSINATURAS ───
  addSectionTitle("ASSINATURAS");
  const sigW = (pageW - margin * 2 - 10) / 2;

  doc.setLineDashPattern([0], 0);
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 12, margin + sigW, y + 12);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.text("Técnico Responsável", margin, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text("A.R Consertos", margin, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.line(margin + sigW + 10, y + 12, margin + sigW * 2 + 10, y + 12);
  doc.text("Cliente", margin + sigW + 10, y + 16);
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.text(cliente.nome, margin + sigW + 10, y + 20);

  y += 28;

  // ─── CANHOTO ───
  if (y > pageH - 25) { doc.addPage(); addHeader(); y = margin + 10; }

  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(255, 245, 245);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y + 3, pageW - margin * 2, 18, "FD");

  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CANHOTO - RECORTAR", margin + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(6);
  doc.text(`O.S.: ${order.order_id.slice(0, 8).toUpperCase()} | Item: ${item.item_name}`, margin + 4, y + 13);
  doc.text(`Cliente: ${cliente.nome}`, margin + 4, y + 17);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin - 4, y + 13, { align: "right" });
  doc.text(`Total: R$ ${Number(order.order_total).toFixed(2).replace(".", ",")}`, pageW - margin - 4, y + 17, { align: "right" });

  const itemSufix = isService
    ? (item.item_service_type === "inverter" ? "INV" : "CONV")
    : "PROD";
  doc.save(`OS-${order.order_id.slice(0, 8).toUpperCase()}-${itemSufix}.pdf`);
}
