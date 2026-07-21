"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, User, Bot, HeadphonesIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id?: string;
  sender: "user" | "bot" | "admin";
  admin_id?: string | null;
  content: string;
  created_at?: string;
}

interface ChatSession {
  id: string;
  status: "bot" | "aguardando_admin" | "com_admin" | "encerrado";
}

const QUICK_FAQS = [
  { question: "Qual o prazo de garantia?", answer: "Todos os nossos serviços têm garantia de 90 dias, conforme o certificado emitido na conclusão do reparo." },
  { question: "Como agendar um serviço?", answer: "Para agendar, navegue pelo nosso catálogo de serviços, escolha o que precisa, adicione ao carrinho e finalize o checkout. Você também pode ligar para (79) 99944-6596." },
  { question: "Quais formas de pagamento?", answer: "Aceitamos Dinheiro, PIX e Cartão (débito ou crédito)." },
];

const HUMAN_KEYWORDS = [
  "falar com humano", "falar com atendente", "atendente humano",
  "quero um humano", "pessoa real", "suporte humano", "atendimento humano",
  "humano", "atendente", "pessoa"
];

const FAQ_RESPONSES = [
  {
    keywords: ["garantia", "prazo de garantia", "quanto tempo de garantia", "garantia do serviço", "tem garantia"],
    answer: "Todos os nossos serviços têm garantia de 90 dias, conforme o certificado emitido na conclusão do reparo."
  },
  {
    keywords: ["pagamento", "formas de pagamento", "como pago", "aceita pix", "aceita cartão", "aceita dinheiro", "paga com", "meio de pagamento"],
    answer: "Aceitamos Dinheiro, PIX e Cartão (débito ou crédito)."
  },
  {
    keywords: ["agendar", "agendamento", "como agendar", "marcar serviço", "quero agendar", "agendar visita"],
    answer: "Para agendar, navegue pelo nosso catálogo de serviços, escolha o que precisa, adicione ao carrinho e finalize o checkout. Você também pode ligar para (79) 99944-6596."
  },
  {
    keywords: ["telefone", "contato", "ligar", "número", "whatsapp", "falar com vocês", "como falar"],
    answer: "Nosso telefone é (79) 99944-6596. Também estamos no Instagram @A.RCONSERTOS."
  },
  {
    keywords: ["endereço", "localização", "onde fica", "local", "bairro", "rua"],
    answer: "Estamos localizados em Itabaiana/SE. Para mais detalhes de localização, entre em contato pelo telefone (79) 99944-6596."
  },
  {
    keywords: ["horário", "funcionamento", "hora", "aberto", "abre", "fecha", "dias"],
    answer: "Funcionamos de segunda a sábado. Para horários específicos, ligue para (79) 99944-6596."
  },
  {
    keywords: ["orçamento", "quanto custa", "preço", "valor", "quanto é", "cotação", "custa quanto"],
    answer: "Para solicitar um orçamento, adicione o serviço desejado ao carrinho e finalize o checkout, ou entre em contato pelo telefone (79) 99944-6596."
  },
  {
    keywords: ["prazo", "quanto tempo", "demora", "quando fica pronto", "tempo de reparo"],
    answer: "O prazo varia conforme o serviço e a complexidade do reparo. Para informações mais precisas, entre em contato pelo telefone (79) 99944-6596."
  },
  {
    keywords: ["linha branca", "geladeira", "máquina de lavar", "microondas", "fogão", "cooktop", "congelador", "lava louça", "secadora"],
    answer: "Trabalhamos com conserto de toda linha branca: geladeira, máquina de lavar, microondas, fogão, cooktop e mais. Navegue pelo nosso catálogo de serviços para ver todas as opções."
  },
  {
    keywords: ["ar condicionado", "ar ", "inverter", "climatização", "higienização de ar", "ar frio", "ar quente", "split"],
    answer: "Somos especialistas em ar-condicionado, incluindo inverter. Oferecemos instalação, manutenção, limpeza e higienização. Confira nossos serviços no catálogo."
  },
  {
    keywords: ["inversor solar", "energia solar", "inversor", "fonte chaveada", "no-break"],
    answer: "Também trabalhamos com eletrônica avançada: inversores solares, fontes chaveadas e inversores de energia. Entre em contato para mais informações."
  },
  {
    keywords: ["higienização", "limpeza", "limpar", "higienizar", "lavagem"],
    answer: "Realizamos higienização de máquinas de lavar e ar-condicionado. É um serviço importante para manter o funcionamento correto e a qualidade do ar. Agende pelo catálogo ou ligue para (79) 99944-6596."
  },
  {
    keywords: ["desde quando", "antigo", "experiência", "história", "tempo de mercado"],
    answer: "A AR Consertos funciona desde 2017, com experiência em eletrodomésticos convencionais e eletrônica inverter avançada."
  },
  {
    keywords: ["obrigado", "valeu", "agradeço", "brigado"],
    answer: "De nada! Fico à disposição. Se precisar de mais alguma informação, é só chamar!"
  },
  {
    keywords: ["oi", "olá", "bom dia", "boa tarde", "boa noite", "hello", "hi", "e aí"],
    answer: "Olá! Sou a assistente virtual da AR Consertos. Em que posso te ajudar? Posso te ajudar com informações sobre nossos serviços, garantia, formas de pagamento ou agendamento."
  },
  {
    keywords: ["quem é você", "o que você faz", "quem é a ar", "o que é a ar"],
    answer: "Sou a assistente virtual da AR Consertos, uma oficina especializada em conserto de eletrodomésticos e eletrônica avançada em Itabaiana/SE, funcionando desde 2017."
  },
  {
    keywords: ["sair", "tchau", "adeus", "até mais", "falou"],
    answer: "Até mais! Ficamos à disposição. Ligue para (79) 99944-6596 se precisar de ajuda."
  },
];

const normalizeText = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "");

const findLocalResponse = (message: string): string | null => {
  const normalized = normalizeText(message);
  const words = normalized.split(/\s+/);

  for (const faq of FAQ_RESPONSES) {
    const match = faq.keywords.some((kw) => {
      const normalizedKw = normalizeText(kw);
      const kwParts = normalizedKw.split(/\s+/);

      if (kwParts.length === 1) {
        return words.includes(kwParts[0]);
      }

      return normalized.includes(normalizedKw);
    });
    if (match) return faq.answer;
  }
  return null;
};

const detectHumanRequest = (message: string) => {
  const normalized = normalizeText(message);
  const words = normalized.split(/\s+/);

  return HUMAN_KEYWORDS.some(keyword => {
    const normalizedKw = normalizeText(keyword);
    const kwParts = normalizedKw.split(/\s+/);

    if (kwParts.length === 1) {
      return words.includes(kwParts[0]);
    }

    return normalized.includes(normalizedKw);
  });
};

const MAX_GEMINI_PER_DAY = 5;
const MAX_BOT_PER_DAY = 15;
const STORAGE_KEY = "baa2cj2kmcbah2ytsc";
const XOR_KEY = 0x5A;

const xorEncrypt = (text: string) =>
  Array.from(text).map((c) => String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY)).join("");

const getDailyCounts = () => {
  const today = new Date().toDateString();
  const empty = { date: today, gemini: 0, bot: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(xorEncrypt(raw));
    if (data.date !== today) return empty;
    return data;
  } catch {
    return empty;
  }
};

const incrementGeminiCount = () => {
  const data = getDailyCounts();
  const updated = { ...data, gemini: data.gemini + 1 };
  localStorage.setItem(STORAGE_KEY, xorEncrypt(JSON.stringify(updated)));
  return updated;
};

const incrementBotCount = () => {
  const data = getDailyCounts();
  const updated = { ...data, bot: data.bot + 1 };
  localStorage.setItem(STORAGE_KEY, xorEncrypt(JSON.stringify(updated)));
  return updated;
};

const canCallGemini = () => getDailyCounts().gemini < MAX_GEMINI_PER_DAY;
const canUseBot = () => getDailyCounts().bot < MAX_BOT_PER_DAY;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [waitingAdmin, setWaitingAdmin] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [adminName, setAdminName] = useState<string>("Atendente");
  const sessionLoadingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to realtime updates
  const subscribeToSession = useCallback((sessionId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // If admin joined, update status and fetch name
          if (newMessage.sender === "admin") {
            setWaitingAdmin(false);
            setSession((prev) => prev ? { ...prev, status: "com_admin" } : null);
            // Fetch admin name
            if (newMessage.admin_id) {
              supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newMessage.admin_id)
                .single()
                .then(({ data }) => {
                  if (data) setAdminName(data.full_name);
                });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as ChatSession;
          setSession(updated);

          if (updated.status === "bot") {
            setWaitingAdmin(false);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Initialize or load session for logged-in users
  const initSession = useCallback(async () => {
    if (!user || sessionLoadingRef.current) return;
    sessionLoadingRef.current = true;

    try {
      // Check for existing active session (not encerrado)
      const { data: existingSession } = await supabase
        .from("chat_sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .neq("status", "encerrado")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        // Keep session open and load messages (don't close "bot" sessions)
        setSession(existingSession as ChatSession);

        const { data: history } = await supabase
          .from("chat_messages")
          .select("id, sender, content, created_at")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (history && history.length > 0) {
          setMessages(history as Message[]);
        }

        if (existingSession.status === "aguardando_admin") {
          setWaitingAdmin(true);
        }

        subscribeToSession(existingSession.id);
      } else {
        // No active session — check for recent encerrado (within 24h)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentClosed } = await supabase
          .from("chat_sessions")
          .select("id, status, updated_at")
          .eq("user_id", user.id)
          .eq("status", "encerrado")
          .gte("updated_at", twentyFourHoursAgo)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentClosed) {
          const { data: history } = await supabase
            .from("chat_messages")
            .select("id, sender, content, created_at")
            .eq("session_id", recentClosed.id)
            .order("created_at", { ascending: true })
            .limit(50);

          if (history && history.length > 0) {
            setMessages(history as Message[]);
          }

          setSession({ id: recentClosed.id, status: "encerrado" });
        }
        // If nothing found, leave empty — FAQ shows
      }
    } catch (err) {
      console.error("Error initializing chat session:", err);
    } finally {
      sessionLoadingRef.current = false;
    }
  }, [user, subscribeToSession]);

  // Initialize chat when opened (logged-in users)
  useEffect(() => {
    if (open && user && !session && !sessionLoadingRef.current) {
      initSession();
    }
  }, [open, user, session, initSession]);

  // Cleanup realtime subscription
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Send message to AI
  const sendToAI = async (userMessage: string) => {
    // Mostra msg do usuário imediatamente
    if (user && session) {
      await supabase.from("chat_messages").insert([
        { session_id: session.id, sender: "user", content: userMessage },
      ]);
    } else {
      setMessages((prev) => [...prev, { sender: "user", content: userMessage }]);
    }

    setLoading(true);

    try {
      // 1. Detecção de humano PRIMEIRO — não chama IA nem FAQ
      if (detectHumanRequest(userMessage)) {
        incrementBotCount();
        await delay(1500);
        const humanMsg = "Entendi que você deseja falar com um atendente humano. Clique no botão abaixo para conectarmos você com nossa equipe.";
        if (user && session) {
          await supabase.from("chat_messages").insert([
            { session_id: session.id, sender: "bot", content: humanMsg },
          ]);
        } else {
          setMessages((prev) => [...prev, { sender: "bot", content: humanMsg }]);
        }
        setShowAdminRequest(true);
        return;
      }

      // 2. Resposta local (FAQ) — não chama IA
      const localResponse = findLocalResponse(userMessage);

      if (localResponse) {
        incrementBotCount();
        await delay(1500);
        if (user && session) {
          await supabase.from("chat_messages").insert([
            { session_id: session.id, sender: "bot", content: localResponse },
          ]);
        } else {
          setMessages((prev) => [...prev, { sender: "bot", content: localResponse }]);
        }
        return;
      }

      // 3. Nenhum match — chama Gemini
      if (!canCallGemini()) {
        await delay(1500);
        const limitMsg = "Você atingiu o limite de consultas à IA por hoje. Para falar com um atendente, ligue para (79) 99944-6596.";
        if (user && session) {
          await supabase.from("chat_messages").insert([
            { session_id: session.id, sender: "bot", content: limitMsg },
          ]);
        } else {
          setMessages((prev) => [...prev, { sender: "bot", content: limitMsg }]);
        }
        return;
      }

      incrementGeminiCount();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.sender !== "admin")
            .concat({ sender: "user", content: userMessage })
            .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content })),
        }),
      });

      const data = await response.json();

      if (user && session) {
        const { error } = await supabase.from("chat_messages").insert([
          { session_id: session.id, sender: "bot", content: data.content },
        ]);
        if (error) {
          console.error("[Chat] Supabase insert error:", error);
          setMessages((prev) => [...prev, { sender: "bot", content: data.content }]);
        }
      } else {
        setMessages((prev) => [...prev, { sender: "bot", content: data.content }]);
      }
    } catch (error) {
      console.error("[Chat] Error sending message:", error);
      setMessages((prev) => [...prev, { sender: "bot", content: "Desculpe, o serviço de IA está temporariamente indisponível. Entre em contato pelo telefone (79) 99944-6596 ou tente novamente em instantes." }]);
    } finally {
      setLoading(false);
    }
  };

  // Send message directly (when admin is active)
  const sendMessageDirect = async (content: string) => {
    if (session) {
      // Logged in: only insert to Supabase, realtime handles local state
      const { error } = await supabase.from("chat_messages").insert([
        { session_id: session.id, sender: "user", content },
      ]);
      if (error) {
        console.error("Supabase insert error:", error);
        setMessages((prev) => [...prev, { sender: "user", content }]);
      }
    } else {
      // Anonymous: add locally only
      setMessages((prev) => [...prev, { sender: "user", content }]);
    }
  };

  // Handle FAQ click
  const handleFAQClick = async (faq: (typeof QUICK_FAQS)[0]) => {
    if (user && session) {
      // Logged in: only insert to Supabase, realtime handles local state
      const { error } = await supabase.from("chat_messages").insert([
        { session_id: session.id, sender: "user", content: faq.question },
        { session_id: session.id, sender: "bot", content: faq.answer },
      ]);
      if (error) {
        console.error("Supabase insert error:", error);
        setMessages((prev) => [
          ...prev,
          { sender: "user", content: faq.question },
          { sender: "bot", content: faq.answer },
        ]);
      }
    } else {
      // Anonymous: add locally only
      setMessages((prev) => [
        ...prev,
        { sender: "user", content: faq.question },
        { sender: "bot", content: faq.answer },
      ]);
    }
  };

  // Request admin
  const requestAdmin = async () => {
    setShowAdminRequest(false);
    setShowAdminButton(false);

    // Anonymous user: show message to login or call
    if (!user) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", content: "Para falar com um atendente humano, faça login na sua conta ou ligue diretamente para (79) 99944-6596. Estamos à disposição!" },
      ]);
      return;
    }

    // Logged in but no session: create one first
    if (!session) {
      const { data: newSession, error } = await supabase
        .from("chat_sessions")
        .insert([{ user_id: user.id, status: "aguardando_admin" }])
        .select("id, status")
        .single();

      if (error || !newSession) {
        console.error("[Chat] Error creating session:", error);
        return;
      }

      setSession(newSession as ChatSession);
      subscribeToSession(newSession.id);

      await supabase.from("chat_messages").insert([
        { session_id: newSession.id, sender: "bot", content: "Aguardando um atendente humano... Suas mensagens serão salvas e respondidas quando o atendente entrar." },
      ]);

      setWaitingAdmin(true);
      return;
    }

    // Session exists: update to aguardando_admin
    setWaitingAdmin(true);

    await supabase
      .from("chat_sessions")
      .update({ status: "aguardando_admin" })
      .eq("id", session.id);

    await supabase.from("chat_messages").insert([
      { session_id: session.id, sender: "bot", content: "Aguardando um atendente humano... Suas mensagens serão salvas e respondidas quando o atendente entrar." },
    ]);

    setSession((prev) => prev ? { ...prev, status: "aguardando_admin" } : null);
  };

  // Reset chat — start new conversation
  const resetChat = async () => {
    if (!user) return;

    setMessages([]);
    setWaitingAdmin(false);
    setShowAdminRequest(false);
    setShowAdminButton(false);

    // Create new session directly
    const { data: newSession, error } = await supabase
      .from("chat_sessions")
      .insert([{ user_id: user.id, status: "bot" }])
      .select("id, status")
      .single();

    if (!error && newSession) {
      setSession(newSession as ChatSession);
      subscribeToSession(newSession.id);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!canUseBot() && !canCallGemini()) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", content: "Você atingiu o limite de mensagens diárias. Deseja falar com um atendente humano?" },
      ]);
      setShowAdminRequest(true);
      return;
    }

    const msg = input.trim();
    setInput("");

    // If admin is active or waiting, send directly to Supabase
    if (session && (session.status === "com_admin" || session.status === "aguardando_admin")) {
      await sendMessageDirect(msg);
      if (session.status === "aguardando_admin") {
        setMessages((prev) => [...prev, { sender: "bot", content: "Sua mensagem foi salva. O atendente verá assim que entrar." }]);
      }
    } else {
      await sendToAI(msg);
    }
  };

  const canUseAdmin = user && session && session.status !== "encerrado";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          background: "linear-gradient(135deg, #E30613 0%, #b91c1c 100%)",
          boxShadow: "0 4px 20px rgba(227, 6, 19, 0.4)",
        }}
        aria-label="Abrir chat"
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 flex h-[32rem] w-96 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111] shadow-2xl sm:right-6"
          style={{
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-white/[0.06] p-4"
            style={{ background: "linear-gradient(135deg, #E30613 0%, #b91c1c 100%)" }}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <span className="font-montserrat text-sm font-bold text-white">AR Consertos</span>
            </div>
            {session && (
              <span className="text-xs text-white/70 capitalize">
                {session.status === "com_admin" ? "Atendente" : "Assistente"}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="chat-scroll flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #111" }}>
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-center text-xs text-white/50">Perguntas frequentes:</p>
                {QUICK_FAQS.map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => handleFAQClick(faq)}
                    className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/[0.06]"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`mb-3 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    msg.sender === "user"
                      ? "rounded-br-sm bg-[#E30613] text-white"
                      : msg.sender === "admin"
                      ? "rounded-bl-sm bg-[#C9A84C]/20 text-[#C9A84C]"
                      : "rounded-bl-sm bg-white/[0.06] text-white/90"
                  }`}
                >
                  {msg.sender === "admin" && (
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[#C9A84C]">
                      <HeadphonesIcon className="h-3 w-3" />
                      {adminName}
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            {waitingAdmin && (
              <div className="rounded-lg bg-[#C9A84C]/10 p-2 text-center text-xs text-[#C9A84C]">
                Aguardando atendente...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Admin confirmation */}
          {showAdminRequest && !waitingAdmin && (
            <div className="border-t border-white/[0.06] p-3">
              <p className="mb-2 text-xs text-white/70">Deseja falar com um atendente humano?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdminRequest(false)}
                  className="flex-1 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"
                >
                  Não, obrigado
                </button>
                <button
                  onClick={() => { setShowAdminRequest(false); setShowAdminButton(true); }}
                  className="flex-1 rounded-lg bg-[#C9A84C] px-3 py-1.5 text-xs font-medium text-black"
                >
                  Sim
                </button>
              </div>
            </div>
          )}

          {/* Admin button (shown after user confirms) */}
          {showAdminButton && !waitingAdmin && session?.status !== "com_admin" && (
            <div className="border-t border-white/[0.06] p-2">
              <button
                onClick={() => { setShowAdminButton(false); requestAdmin(); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C]/10 px-3 py-2 text-sm text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/20"
              >
                <HeadphonesIcon className="h-4 w-4" />
                Falar com atendente
              </button>
            </div>
          )}

          {/* Input */}
          {session?.status === "encerrado" ? (
            <div className="border-t border-white/[0.06] p-3">
              <button
                onClick={resetChat}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E30613]/20 px-3 py-2.5 text-sm font-medium text-[#E30613] transition-colors hover:bg-[#E30613]/30"
              >
                <MessageCircle className="h-4 w-4" />
                Iniciar nova conversa
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/[0.06] p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#E30613]/50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E30613] text-white transition-colors hover:bg-[#E30613]/80 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
