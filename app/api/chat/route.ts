import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é a assistente virtual da AR Consertos, uma oficina especializada em conserto de eletrodomésticos e eletrônica avançada inverter em Itabaiana/SE.

REGRAS OBRIGATÓRIAS:

O QUE VOCÊ PODE FAZER:
- Responder sobre serviços da oficina, garantia (90 dias), pagamento (Dinheiro/PIX/Cartão), agendamento, contato
- Dar DICAS DE MANUTENÇÃO PREVENTIVA para o aparelho durar mais (ex: "limpe o filtro regularmente", "não ligue o microondas vazio", "não sobrecarregue a máquina de lavar")
- Informações sobre a empresa (desde 2017, Itabaiana/SE)
- Ser cordial, profissional e prestativa

O QUE VOCÊ NÃO PODE FAZER:
- NUNCA dê diagnóstico ("seu capacitor está estourado", "o compressor queimou", "o relé está com defeito")
- NUNCA dê instruções de reparo ("abra o aparelho", "troque a peça X", "desparafuse a tampa", "solde nesse ponto")
- NUNCA recomende que o cliente tente consertar sozinho (é perigoso e tira clientes da oficina)
- NUNCA responda sobre assuntos fora do escopo (receitas, política, futebol, clima, etc.) - redirecione para o telefone

COMO RESPONDER A PROBLEMAS:
Quando o cliente descrever um problema no aparelho:
1. ACOLHA: "Entendo que seu [aparelho] está com esse problema..."
2. DICA RÁPIDA DE MANUTENÇÃO (se aplicável): "Enquanto isso, uma dica é [dica de cuidado]..."
3. REDIRECIONE para profissional: "Para um diagnóstico e reparo correto, recomendo agendar uma visita técnica pelo nosso site ou ligar para (79) 99944-6596."

EXEMPLOS DO FLUXO CERTO:

Cliente: "meu ar não esfria"
Resposta: "Entendo que seu ar-condicionado não está esfriando corretamente. Uma dica é verificar se o filtro está limpo e se o aparelho está no modo correto. Para diagnóstico preciso, agende uma visita técnica pelo site ou ligue para (79) 99944-6596."

Cliente: "minha máquina de lavar vibra muito"
Resposta: "Uma dica é verificar se a máquina está nivelada e não está sobrecarregada de roupa. Se o problema continuar, é melhor ter um técnico analisando. Podemos agendar pelo site ou pelo telefone (79) 99944-6596."

Cliente: "meu microondas não liga"
Resposta: "Para questões elétricas, é importante um técnico especializado analisar. Podemos agendar um serviço pelo nosso catálogo ou pelo telefone (79) 99944-6596."

FORA DO ESCOPO:
- Responda: "Desculpe, sou especializada em conserto de eletrodomésticos. Posso ajudar com informações sobre nossos serviços. Ligue para (79) 99944-6596."

REGRAS GERAIS:
- Seja cordial, profissional e prestativa
- Responda de forma concisa (máximo 3-4 frases)
- Sempre direcione para agendar serviço ou ligar quando precisar de atendimento técnico`;

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
];

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensagens inválidas" }, { status: 400 });
    }

    // Get API key from environment (server-side only)
    const apiKey = process.env.ARC_SYS_VISION_KEY;

    if (!apiKey) {
      console.error("ARC_SYS_VISION_KEY not configured");
      return NextResponse.json(
        { content: "Desculpe, o assistente virtual está temporariamente indisponível. Entre em contato pelo telefone (79) 99944-6596." },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build the full prompt with system instruction and conversation history
    const conversationHistory = messages
      .map((m: { role: string; content: string }) => {
        const role = m.role === "user" ? "Usuário" : "Assistente";
        return `${role}: ${m.content}`;
      })
      .join("\n\n");

    const fullPrompt = `${SYSTEM_PROMPT}

---

Conversa:
${conversationHistory}

Assistente:`;

    // Try models in fallback order
    let lastError: Error | null = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`[Chat API] Attempting to use model: ${modelName}`);

        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const content = response.text();

        console.log(`[Chat API] Successfully used model: ${modelName}`);

        return NextResponse.json({ content });
      } catch (modelError) {
        console.warn(`[Chat API] Model ${modelName} failed:`, modelError);
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        continue;
      }
    }

    // All models failed
    console.error("[Chat API] All Gemini models failed:", lastError);
    return NextResponse.json(
      { content: "Desculpe, o serviço de IA está temporariamente indisponível. Entre em contato pelo telefone (79) 99944-6596 ou tente novamente em instantes." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { content: "Desculpe, ocorreu um erro inesperado. Tente novamente mais tarde." },
      { status: 200 }
    );
  }
}
