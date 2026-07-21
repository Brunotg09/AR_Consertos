"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  Send,
  User,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  HeadphonesIcon,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatSession {
  id: string;
  user_id: string;
  admin_id?: string | null;
  status: "bot" | "aguardando_admin" | "com_admin" | "encerrado";
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    phone: string | null;
  };
}

interface Message {
  id: string;
  session_id: string;
  sender: "user" | "bot" | "admin";
  admin_id?: string | null;
  content: string;
  read_by_admin: boolean;
  created_at: string;
}

interface AdminProfile {
  id: string;
  full_name: string;
}

export default function AdminChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"ativas" | "pendentes" | "encerradas">("ativas");
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Count of waiting sessions
  const waitingCount = sessions.filter((s) => s.status === "aguardando_admin").length;

  const fetchSessions = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("chat_sessions")
        .select(
          `
          id,
          user_id,
          status,
          created_at,
          updated_at,
          profiles:user_id (full_name, phone)
        `
        )
        .or(`status.neq.encerrado,and(status.eq.encerrado,updated_at.gte.${twentyFourHoursAgo})`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setSessions((data || []) as unknown as ChatSession[]);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === "ativas") return s.status === "aguardando_admin" || s.status === "com_admin";
    if (filter === "pendentes") return s.status === "aguardando_admin";
    if (filter === "encerradas") return s.status === "encerrado";
    return true;
  });

  useEffect(() => {
    fetchSessions();

    // Subscribe to new sessions
    const channel = supabase
      .channel("admin-chat-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_sessions",
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  // Load messages when session selected
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", selectedSession.id)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        setMessages(data || []);

        // Fetch admin names for messages
        const adminIds = Array.from(new Set((data || []).filter((m) => m.admin_id).map((m) => m.admin_id as string)));
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", adminIds);
          if (!cancelled && profiles) {
            const names: Record<string, string> = {};
            profiles.forEach((p) => { names[p.id] = p.full_name; });
            setAdminNames((prev) => ({ ...prev, ...names }));
          }
        }

        await supabase
          .from("chat_messages")
          .update({ read_by_admin: true })
          .eq("session_id", selectedSession.id)
          .eq("read_by_admin", false);
      } catch (e) {
        console.error("[chat] loadMessages error:", e);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const msgChannel = supabase
      .channel(`admin-messages:${selectedSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${selectedSession.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read (skip admin's own messages)
          if (newMsg.sender !== "admin") {
            supabase
              .from("chat_messages")
              .update({ read_by_admin: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${selectedSession.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const updated = payload.new as ChatSession;
          setSelectedSession((prev) => prev ? { ...prev, status: updated.status } : null);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(msgChannel);
    };
  }, [selectedSession?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join session
  const handleJoinSession = async (session: ChatSession) => {
    // Block if another admin already joined
    if (session.admin_id && session.admin_id !== user?.id) {
      alert("Esta sessão já está sendo atendida por outro atendente.");
      return;
    }

    // Insert message with admin_id
    await supabase.from("chat_messages").insert([
      {
        session_id: session.id,
        sender: "admin",
        admin_id: user?.id,
        content: "Olá! Sou o atendente da AR Consertos. Como posso ajudar?",
      },
    ]);

    // Update status and save admin_id
    await supabase
      .from("chat_sessions")
      .update({ status: "com_admin", admin_id: user?.id })
      .eq("id", session.id);

    setSelectedSession({ ...session, status: "com_admin", admin_id: user?.id });
    fetchSessions();
  };

  // End session
  const handleEndSession = async () => {
    if (!selectedSession) return;

    // Add farewell to local state immediately so admin sees it
    const farewellMsg: Message = {
      id: crypto.randomUUID(),
      session_id: selectedSession.id,
      sender: "admin",
      content: "Atendimento encerrado. Obrigado pelo contato com a AR Consertos!",
      read_by_admin: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, farewellMsg]);

    // Insert to Supabase (for user's realtime)
    await supabase.from("chat_messages").insert([
      {
        session_id: selectedSession.id,
        sender: "admin",
        content: "Atendimento encerrado. Obrigado pelo contato com a AR Consertos!",
      },
    ]);

    // Update status
    await supabase
      .from("chat_sessions")
      .update({ status: "encerrado" })
      .eq("id", selectedSession.id);

    setSelectedSession(null);
    setMessages([]);
    fetchSessions();
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedSession || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      // Only insert to Supabase — realtime handles local state
      await supabase.from("chat_messages").insert([
        { session_id: selectedSession.id, sender: "admin", admin_id: user?.id, content },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      bot: "bg-white/10 text-white/50",
      aguardando_admin: "bg-[#E30613]/20 text-[#E30613] animate-pulse",
      com_admin: "bg-[#C9A84C]/20 text-[#C9A84C]",
      encerrado: "bg-white/5 text-white/30",
    };

    const labels: Record<string, string> = {
      bot: "Bot",
      aguardando_admin: "Aguardando",
      com_admin: "Em atendimento",
      encerrado: "Encerrado",
    };

    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[400px] gap-4">
      {/* Sessions List */}
      <div className={`${selectedSession ? "hidden" : "flex"} w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f0f] md:flex md:w-80`}>
        {/* Header with badge */}
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <h2 className="font-montserrat text-lg font-bold text-white">Conversas</h2>
          {waitingCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E30613] px-1.5 text-xs font-bold text-white animate-pulse">
              {waitingCount}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1 border-b border-white/[0.06] p-2">
          {([
            { key: "ativas" as const, label: "Ativas" },
            { key: "pendentes" as const, label: "Pendentes" },
            { key: "encerradas" as const, label: "Encerradas" },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                  : "text-white/50 hover:bg-white/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/50" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/50">
              {filter === "ativas" && "Nenhuma conversa ativa"}
              {filter === "pendentes" && "Nenhuma conversa pendente"}
              {filter === "encerradas" && "Nenhuma conversa encerrada"}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() =>
                  session.status === "aguardando_admin"
                    ? handleJoinSession(session)
                    : setSelectedSession(session)
                }
                className={`flex w-full items-center gap-3 border-b border-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.02] ${
                  selectedSession?.id === session.id ? "bg-white/[0.04]" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    session.status === "aguardando_admin"
                      ? "bg-[#E30613]/20 animate-pulse"
                      : "bg-white/[0.04]"
                  }`}
                >
                  <User className="h-5 w-5 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-white">
                      {session.profiles?.full_name || "Cliente"}
                    </p>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    {format(new Date(session.updated_at), "dd/MM HH:mm")}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedSession ? "flex" : "hidden"} flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f0f] md:flex`}>
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="md:hidden rounded-lg p-1.5 hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-5 w-5 text-white/70" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
                  <User className="h-5 w-5 text-white/70" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    {selectedSession.profiles?.full_name || "Cliente"}
                  </p>
                  <p className="text-xs text-white/50">
                    {selectedSession.profiles?.phone || "Sem telefone"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedSession.status)}
                {selectedSession.status === "com_admin" && (
                  <button
                    onClick={handleEndSession}
                    className="rounded-lg bg-[#E30613]/20 px-3 py-1.5 text-sm text-[#E30613] transition-colors hover:bg-[#E30613]/30"
                  >
                    Encerrar Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="chat-scroll flex-1 overflow-y-auto p-4 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #111" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${
                    msg.sender === "admin" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      msg.sender === "user"
                        ? "rounded-br-sm bg-white/[0.06] text-white"
                        : msg.sender === "admin"
                        ? "rounded-bl-sm bg-[#C9A84C]/20 text-white"
                        : "rounded-bl-sm bg-[#8B5CF6]/10 text-[#8B5CF6]"
                    }`}
                  >
                    {msg.sender === "bot" && (
                      <div className="mb-1 flex items-center gap-1 text-xs font-medium">
                        <Bot className="h-3 w-3" />
                        Assistente IA
                      </div>
                    )}
                    {msg.sender === "admin" && (
                      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[#C9A84C]">
                        <HeadphonesIcon className="h-3 w-3" />
                        {msg.admin_id ? (adminNames[msg.admin_id] || "Atendente") : "Atendente"}
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className="mt-1 text-[10px] opacity-50">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-white/[0.06] p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#C9A84C]/50"
                disabled={selectedSession.status !== "com_admin" || sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || selectedSession.status !== "com_admin"}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A84C] text-black transition-colors hover:bg-[#C9A84C]/80 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <MessageCircle className="h-12 w-12 text-white/20" />
            <div>
              <p className="text-lg font-medium text-white">Selecione uma conversa</p>
              <p className="mt-1 text-sm text-white/50">
                {waitingCount > 0
                  ? `${waitingCount} conversa(s) aguardando atendimento`
                  : "Nenhuma conversa pendente"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
