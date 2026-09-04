"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, ArrowRight, RotateCcw, LogOut } from "lucide-react";

// Module-level flag: survives React Strict Mode remounts
const otpSentGlobal: Record<string, boolean> = {};

export default function VerificarEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectTo = searchParams.get("redirect") || "/minha-conta";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if already verified on mount
  useEffect(() => {
    if (!email) {
      router.push("/login");
      return;
    }

    const checkVerified = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email_2fa_enabled, two_fa_verified_at")
        .eq("id", user.id)
        .single();

      if (!profile?.email_2fa_enabled || profile?.two_fa_verified_at) {
        setVerified(true);
        router.push(redirectTo);
        router.refresh();
        return;
      }

      // Not verified — send OTP (only once per email)
      if (!otpSentGlobal[email]) {
        otpSentGlobal[email] = true;
        setResending(true);
        const { error: otpError } = await supabase.auth.signInWithOtp({ email });
        setResending(false);
        if (otpError) {
          if (otpError.message.includes("security purposes") || otpError.status === 429) {
            setOtpSent(true);
            setCooldown(30);
          } else {
            setError(`Erro ao enviar código: ${otpError.message}`);
          }
        } else {
          setOtpSent(true);
          setCooldown(60);
        }
      } else {
        setOtpSent(true);
      }
      inputRefs.current[0]?.focus();
    };

    checkVerified();
  }, [email, redirectTo, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === 6) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((d) => d === "");
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (token?: string) => {
    const code = token || otp.join("");
    if (code.length !== 6) {
      setError("Insira o código de 6 dígitos.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      setLoading(false);
      setError("Código inválido ou expirado. Clique em Reenviar para receber um novo código.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    // Mark 2FA as completed in database
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from("profiles")
        .update({ two_fa_verified_at: new Date().toISOString() })
        .eq("id", userData.user.id);
    }

    setVerified(true);
    setLoading(false);
    router.push(redirectTo);
    router.refresh();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError("");

    const { error: otpError } = await supabase.auth.signInWithOtp({ email });

    setResending(false);

    if (otpError) {
      if (otpError.message.includes("security purposes") || otpError.status === 429) {
        setCooldown(30);
        setError("Aguarde para reenviar o código.");
      } else {
        setError("Erro ao reenviar código. Tente novamente.");
      }
      return;
    }

    otpSentGlobal[email] = true;
    setCooldown(60);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  const handleLogout = async () => {
    delete otpSentGlobal[email];
    const { fullLogout } = await import("@/lib/logout");
    await fullLogout();
    router.push("/login");
  };

  if (verified) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
            <ShieldCheck className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="font-bebas text-4xl tracking-widest text-white">
            IDENTIDADE VERIFICADA
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#888888" }}>
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ar-gold/30 bg-ar-gold/10">
          <ShieldCheck className="h-8 w-8" style={{ color: "#C9A84C" }} />
        </div>
        <h1 className="font-bebas text-4xl tracking-widest text-white">
          VERIFICAR IDENTIDADE
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          {resending
            ? "Enviando código para..."
            : otpSent
              ? "Enviamos um código de 6 dígitos para"
              : "Preparando envio do código..."}
        </p>
        <p className="mt-1 text-sm font-medium text-white">{email}</p>
      </div>

      {error && (
        <div
          className="mt-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "#E3061340",
            backgroundColor: "#E3061310",
            color: "#ff6b6b",
          }}
        >
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="h-14 w-12 rounded-xl border border-white/10 bg-white/[0.03] text-center text-xl font-bold text-white outline-none transition-all focus:border-ar-gold/50 focus:ring-1 focus:ring-ar-gold/20"
            style={{ caretColor: "#C9A84C" }}
          />
        ))}
      </div>

      <button
        onClick={() => handleVerify()}
        disabled={loading || otp.some((d) => d === "")}
        className="btn-premium-red mt-8 flex w-full items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? "Verificando..." : "Verificar Código"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <div className="mt-6 text-center">
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-2 text-xs transition-colors hover:text-white disabled:opacity-40"
          style={{ color: "#888888" }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {resending
            ? "Reenviando..."
            : cooldown > 0
              ? `Reenviar em ${cooldown}s`
              : "Reenviar código"}
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-xs transition-colors hover:text-white"
          style={{ color: "#888888" }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
