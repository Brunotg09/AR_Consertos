"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useFloatingWidget } from "@/components/FloatingWidget";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Camera,
  ArrowRight,
  Check,
  X,
} from "lucide-react";

interface AddressData {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  numero?: string;
  complemento?: string;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function CadastroPage() {
  const { trigger } = useFloatingWidget();
  const router = useRouter();

  useEffect(() => { trigger("help"); }, [trigger]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<AddressData>({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const strength = passwordStrength(password);
  const strengthLabels = ["Muito fraca", "Fraca", "Média", "Boa", "Forte", "Muito forte"];
  const strengthColors = ["#ff4444", "#ff6644", "#ffaa44", "#aadd44", "#44dd88", "#44dd88"];

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress({
          cep: cleanCep,
          logradouro: data.logradouro,
          bairro: data.bairro,
          localidade: data.localidade,
          uf: data.uf,
          numero: "",
          complemento: "",
        });
      }
    } catch {
      // ignore
    }
    setCepLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fullName = `${firstName} ${lastName}`.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Preencha nome e sobrenome.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!lgpdAccepted) {
      setError("Você precisa aceitar a Política de Privacidade.");
      return;
    }

    setLoading(true);

    // 1. Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
      setError("Erro ao criar conta. Tente novamente.");
      setLoading(false);
      return;
    }

    const userId = signUpData.user.id;

    // Check if session exists - try to get/establish a session
    // The RLS policies require auth.uid() to match the user id
    let hasSession = !!signUpData.session;

    if (!hasSession) {
      // Try to sign in with the credentials to get a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Email confirmation is required - tell user
        setError("Conta criada! Verifique seu email para confirmar o cadastro antes de fazer login.");
        setLoading(false);
        router.push("/login");
        return;
      }
    }

    // Wait a moment for the session to be fully established
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify we have a valid session before inserting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Erro ao estabelecer sessão. Tente fazer login manualmente.");
      setLoading(false);
      router.push("/login");
      return;
    }

    // Verify session user matches the signup user
    if (session.user.id !== userId) {
      console.error("Session user mismatch:", { sessionUserId: session.user.id, signupUserId: userId });
      setError("Erro de autenticação. Tente novamente.");
      setLoading(false);
      return;
    }

    console.log("Session established for user:", userId);

    // 2. Upload avatar if present
    let avatarUrl: string | null = null;
    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
      }
    }

    // 3. Insert profile - try RPC first, fallback to direct insert
    console.log("[cadastro] Chamando insert_profile RPC...");
    let { error: profileError } = await supabase.rpc('insert_profile', {
      p_id: userId,
      p_full_name: fullName,
      p_phone: phone ? phone.replace(/\D/g, "") : null,
      p_birth_date: birthDate || null,
      p_avatar_url: avatarUrl,
      p_address: Object.keys(address).length > 0 ? address : null,
    });

    console.log("[cadastro] insert_profile result:", profileError);

    // Fallback: if RPC failed (function doesn't exist), try direct insert
    if (profileError) {
      console.log("[cadastro] RPC falhou, tentando insert direto na tabela profiles...");
      const { error: directError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName,
        phone: phone ? phone.replace(/\D/g, "") : null,
        birth_date: birthDate || null,
        avatar_url: avatarUrl,
        address: Object.keys(address).length > 0 ? address : null,
      });
      console.log("[cadastro] Insert direto result:", directError);
      if (directError) {
        console.error("[cadastro] Profile error (both methods failed):", directError);
      } else {
        console.log("[cadastro] Perfil criado via insert direto!");
        profileError = null; // Clear the error since direct insert worked
      }
    }

    // 4. Profile criado com sucesso
    setLoading(false);
    console.log("[cadastro] Profile criado com sucesso!");
    router.push("/minha-conta");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-bebas text-4xl tracking-widest text-white">
          CRIAR CONTA
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Cadastre-se para agendar serviços e acompanhar seus consertos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5">
        {error && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#E3061340", backgroundColor: "#E3061310", color: "#ff6b6b" }}>
            {error}
          </div>
        )}

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2"
            style={{ borderColor: "#C9A84C" }}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8" style={{ color: "#888888" }} />
            )}
            <label
              htmlFor="avatar"
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
            >
              <Camera className="h-5 w-5 text-white" />
            </label>
          </div>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Nome */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Nome *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
                placeholder="Primeiro nome"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Sobrenome *</label>
            <div className="relative">
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 px-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
                placeholder="Sobrenome"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">E-mail *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="seu@email.com"
            />
          </div>
        </div>

        {/* Telefone */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="(79) 99944-6596"
            />
          </div>
        </div>

        {/* Data nascimento */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Data de nascimento</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
            />
          </div>
        </div>

        {/* CEP */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">CEP</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onBlur={handleCepBlur}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="00000-000"
            />
            {cepLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "#888888" }}>
                Buscando...
              </span>
            )}
          </div>
        </div>

        {/* Endereço preenchido */}
        {address.logradouro && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>Rua</label>
              <input
                value={address.logradouro}
                readOnly
                className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-white/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>Número</label>
                <input
                  value={address.numero || ""}
                  onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-ar-red/50"
                  placeholder="Nº"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>Complemento</label>
                <input
                  value={address.complemento || ""}
                  onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-ar-red/50"
                  placeholder="Apto, bloco..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>Bairro</label>
                <input value={address.bairro} readOnly className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-white/60" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>Cidade/UF</label>
                <input value={`${address.localidade} / ${address.uf}`} readOnly className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-white/60" />
              </div>
            </div>
          </div>
        )}

        {/* Senha */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Senha * (mín. 8 caracteres)</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="Crie uma senha forte"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#888888" }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Strength bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(strength / 5) * 100}%`,
                  backgroundColor: strengthColors[strength],
                }}
              />
            </div>
            <span className="text-[10px]" style={{ color: strengthColors[strength] }}>
              {strengthLabels[strength]}
            </span>
          </div>
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Confirmar senha *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
              placeholder="Repita a senha"
            />
            {confirmPassword && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {password === confirmPassword ? (
                  <Check className="h-4 w-4" style={{ color: "#44dd88" }} />
                ) : (
                  <X className="h-4 w-4" style={{ color: "#ff4444" }} />
                )}
              </span>
            )}
          </div>
        </div>

        {/* LGPD */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={lgpdAccepted}
            onChange={(e) => setLgpdAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-ar-red"
          />
          <span className="text-xs leading-relaxed" style={{ color: "#a0a0a0" }}>
            Li e aceito a{" "}
            <Link href="/politica-de-privacidade" className="text-white hover:underline">
              Política de Privacidade (LGPD)
            </Link>
            . Autorizo o tratamento dos meus dados pessoais para fins de cadastro e atendimento.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-premium-red flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? "Criando conta..." : "Criar Conta"}
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="text-center text-xs" style={{ color: "#888888" }}>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
