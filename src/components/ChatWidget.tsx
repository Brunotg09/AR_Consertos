"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, User, Bot, HeadphonesIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id?: string;
  sender: "user" | "bot" | "admin";
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

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [waitingAdmin, setWaitingAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize or load session for logged-in users
  const initSession = useCallback(async () => {
    if (!user) return;

    try {
      // Check for existing session
      const { data: existingSession } = await supabase
        .from("chat_sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .neq("status", "encerrado")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        setSession(existingSession as ChatSession);

        // Load last 20 messages
        const { data: history } = await supabase
          .from("chat_messages")
          .select("id, sender, content, created_at")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true })
          .limit(20);

        if (history && history.length > 0) {
          setMessages(history as Message[]);
        }

        if (existingSession.status === "aguardando_admin") {
          setWaitingAdmin(true);
        }

        // Subscribe to realtime updates
        subscribeToSession(existingSession.id);
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from("chat_sessions")
          .insert([{ user_id: user.id, status: "bot" }])
          .select("id, status")
          .single();

        if (!error && newSession) {
          setSession(newSession as ChatSession);
          subscribeToSession(newSession.id);
        }
      }
    } catch (err) {
      console.error("Error initializing chat session:", err);
    }
  }, [user]);

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

          // If admin joined, update status
          if (newMessage.sender === "admin") {
            setWaitingAdmin(false);
            setSession((prev) => prev ? { ...prev, status: "com_admin" } : null);
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
            addBotMessage("Nenhum atendente disponível no momento. Continuando com assistente automático.");
          } else if (updated.status === "encerrado") {
            addBotMessage("Atendimento encerrado. Obrigado pelo contato com a AR Consertos!");
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  const addBotMessage = useCallback((content: string) => {
    const botMsg: Message = { sender: "bot", content };
    setMessages((prev) => [...prev, botMsg]);
  }, []);

  // Initialize chat when opened
  useEffect(() => {
    if (open && user && !session) {
      initSession();
      addBotMessage("Olá! Sou a assistente virtual da AR Consertos. Como posso ajudar?");
    } else if (open && !user && messages.length === 0) {
      addBotMessage("Olá! Sou a assistente virtual da AR Consertos. Como posso ajudar?");
    }
  }, [open, user, session, initSession, addBotMessage, messages.length]);

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
    setLoading(true);

    // Add user message locally
    const userMsg: Message = { sender: "user", content: userMessage };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.sender !== "admin")
            .concat(userMsg)
            .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content })),
        }),
      });

      const data = await response.json();
      const botResponse: Message = { sender: "bot", content: data.content };
      setMessages((prev) => [...prev, botResponse]);

      // Save to Supabase for logged-in users
      if (user && session) {
        await supabase.from("chat_messages").insert([
          { session_id: session.id, sender: "user", content: userMessage },
          { session_id: session.id, sender: "bot", content: data.content },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", content: "Desculpe, o serviço de IA está temporariamente indisponível. Entre em contato pelo telefone (79) 99944-6596 ou tente novamente em instantes." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Send message directly (when admin is active)
  const sendMessageDirect = async (content: string) => {
    const userMsg: Message = { sender: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    if (session) {
      await supabase.from("chat_messages").insert([
        { session_id: session.id, sender: "user", content },
      ]);
    }
  };

  // Handle FAQ click
  const handleFAQClick = (faq: (typeof QUICK_FAQS)[0]) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", content: faq.question },
      { sender: "bot", content: faq.answer },
    ]);

    if (user && session) {
      supabase.from("chat_messages").insert([
        { session_id: session.id, sender: "user", content: faq.question },
        { session_id: session.id, sender: "bot", content: faq.answer },
      ]);
    }
  };

  // Request admin
  const requestAdmin = async () => {
    if (!session) return;

    setWaitingAdmin(true);
    await supabase
      .from("chat_sessions")
      .update({ status: "aguardando_admin" })
      .eq("id", session.id);

    const waitingMsg = "Aguardando um atendente humano... A IA continua disponível enquanto isso.";
    setMessages((prev) => [...prev, { sender: "bot", content: waitingMsg }]);
    setShowAdminRequest(false);

    await supabase.from("chat_messages").insert([
      { session_id: session.id, sender: "bot", content: waitingMsg },
    ]);

    setSession((prev) => prev ? { ...prev, status: "aguardando_admin" } : null);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const msg = input.trim();
    setInput("");

    // If admin is active or waiting, send directly to Supabase
    if (session && (session.status === "com_admin" || session.status === "aguardando_admin")) {
      await sendMessageDirect(msg);
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
          className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f0f] shadow-2xl"
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
          <div className="flex-1 overflow-y-auto p-4">
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
                      Atendente
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

          {/* Admin request button */}
          {canUseAdmin && !showAdminRequest && !waitingAdmin && session?.status === "bot" && (
            <div className="border-t border-white/[0.06] p-2">
              <button
                onClick={() => setShowAdminRequest(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C]/10 px-3 py-2 text-sm text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/20"
              >
                <HeadphonesIcon className="h-4 w-4" />
                Falar com atendente
              </button>
            </div>
          )}

          {/* Admin confirmation */}
          {showAdminRequest && (
            <div className="border-t border-white/[0.06] p-3">
              <p className="mb-2 text-xs text-white/70">Deseja falar com um atendente humano?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdminRequest(false)}
                  className="flex-1 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"
                >
                  Cancelar
                </button>
                <button
                  onClick={requestAdmin}
                  className="flex-1 rounded-lg bg-[#C9A84C] px-3 py-1.5 text-xs font-medium text-black"
                >
                  Sim, chamar
                </button>
              </div>
            </div>
          )}

          {/* Input */}
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
        </div>
      )}
    </>
  );
}
