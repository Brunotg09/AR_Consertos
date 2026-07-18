import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Você é a assistente virtual da AR Consertos, uma oficina especializada em conserto de eletrodomésticos e eletrônica avançada inverter em Itabaiana/SE.

Suas responsabilidades:
- Responder perguntas sobre serviços de conserto (linha branca, pequenos eletrodomésticos, climatização, ar-condicionado inverter, inversores solares, fontes chaveadas)
- Informar sobre garantia: todos os serviços têm 90 dias de garantia
- Explicar formas de pagamento: Dinheiro, PIX e Cartão
- Ajudar com agendamento: o cliente deve navegar pelo catálogo de serviços, adicionar ao carrinho e fazer checkout
- Fornecer contato: telefone (79) 99944-6596, Instagram @A.RCONSERTOS
- Ser cordial, profissional e prestativo
- Responder de forma concisa (máximo 3-4 frases)

Informações sobre a empresa:
- Localização: Itabaiana/SE
- Funcionamento desde 2017
- Especialidades: eletrodomésticos convencionais e eletrônica inverter avançada
- Serviço de higienização de máquinas de lavar e ar-condicionado

Se não souber responder algo específico sobre um pedido ou atendimento, sugira que o cliente entre em contato pelo telefone ou agende um serviço pelo site.`;

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
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
