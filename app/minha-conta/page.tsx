"use client";

import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Camera,
  Lock,
  LogOut,
  MapPin,
  Phone,
  Save,
  Trash2,
  User,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  address: Record<string, string> | null;
}

export default function MinhaContaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Edit fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [address, setAddress] = useState<Record<string, string>>({});

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!sessionData.session) {
          router.push("/login?redirect=/minha-conta");
          return;
        }

        const userId = sessionData.session.user.id;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (cancelled) return;

        if (error || !data) {
          const userEmail = sessionData.session.user.email || "";
          const userName =
            sessionData.session.user.user_metadata?.full_name ||
            sessionData.session.user.user_metadata?.name ||
            "";

          const { error: insertError } = await supabase.from("profiles").insert({
            id: userId,
            full_name: userName,
            phone: null,
            birth_date: null,
            avatar_url: null,
            address: null,
          });

          if (cancelled) return;

          if (insertError) {
            setError(`Erro ao criar perfil: ${insertError.message}`);
            return;
          }

          const { data: newData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (cancelled) return;

          if (newData) {
            setProfile(newData);
            setFullName(newData.full_name || "");
            setPhone(newData.phone || "");
            setBirthDate(newData.birth_date || "");
            setAvatarPreview(newData.avatar_url || null);
            setAddress(newData.address || {});
          }
          return;
        }

        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setBirthDate(data.birth_date || "");
        setAvatarPreview(data.avatar_url || null);
        setAddress(data.address || {});
      } catch (e) {
        console.error("[minha-conta] checkAuth error:", e);
        setError("Erro ao carregar perfil. Tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();

    return () => { cancelled = true; };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");

    console.log("[minha-conta] Salvando perfil para user ID:", profile.id);
    console.log("[minha-conta] Dados:", { fullName, phone, birthDate, address });

    let avatarUrl = profile.avatar_url;
    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;
      console.log("[minha-conta] Fazendo upload do avatar:", filePath);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });
      if (uploadError) {
        console.log("[minha-conta] ERRO no upload do avatar:", uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
        console.log("[minha-conta] Avatar URL:", avatarUrl);
      }
    }

    console.log("[minha-conta] Atualizando perfil...");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        birth_date: birthDate || null,
        avatar_url: avatarUrl,
        address: Object.keys(address).length > 0 ? address : null,
      })
      .eq("id", profile.id);

    console.log("[minha-conta] Resultado do update:", updateError);

    setSaving(false);
    if (updateError) {
      console.log("[minha-conta] ERRO ao salvar perfil:", updateError);
      setError(`Erro ao salvar perfil: ${updateError.message}`);
    } else {
      console.log("[minha-conta] Perfil salvo com sucesso!");
      setMessage("Perfil atualizado com sucesso!");
      setProfile({ ...profile, full_name: fullName, phone, birth_date: birthDate, avatar_url: avatarUrl, address });
    }
  };

  const handleChangePassword = async () => {
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const { error: pwError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving(false);

    if (pwError) {
      setError(pwError.message);
    } else {
      setMessage("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") {
      setError('Digite "EXCLUIR" para confirmar.');
      return;
    }

    setSaving(true);
    const { error: deleteError } = await supabase.rpc("delete_user_account");
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-ar-red" />
        <p className="mt-4 text-sm" style={{ color: "#888888" }}>
          Carregando perfil...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-bebas text-4xl tracking-widest text-white">
          MINHA CONTA
        </h1>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.04] hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>

      {(message || error) && (
        <div
          className="mt-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: error ? "#E3061340" : "#44dd8840",
            backgroundColor: error ? "#E3061310" : "#44dd8810",
            color: error ? "#ff6b6b" : "#44dd88",
          }}
        >
          {error || message}
        </div>
      )}

      {/* Avatar */}
      <div className="mt-8 flex flex-col items-center">
        <div
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2"
          style={{ borderColor: "#C9A84C" }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10" style={{ color: "#888888" }} />
          )}
          <label
            htmlFor="avatar-edit"
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
          >
            <Camera className="h-5 w-5 text-white" />
          </label>
        </div>
        <input
          id="avatar-edit"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Profile form */}
      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-white/70">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#888888" }} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-ar-red/50 focus:ring-1 focus:ring-ar-red/20"
            />
          </div>
        </div>

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

        {/* Address */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: "#C9A84C" }} />
            <span className="text-xs font-medium text-white/70">Endereço</span>
          </div>
          <div className="mt-4 space-y-3">
            {["cep", "logradouro", "numero", "complemento", "bairro", "localidade", "uf"].map((field) => (
              <div key={field}>
                <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: "#888888" }}>
                  {field === "cep" ? "CEP" : field === "logradouro" ? "Rua" : field === "localidade" ? "Cidade" : field === "uf" ? "UF" : field}
                </label>
                <input
                  value={address[field] || ""}
                  onChange={(e) => setAddress({ ...address, [field]: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-ar-red/50"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="btn-premium-red flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      {/* Change password */}
      <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" style={{ color: "#8B5CF6" }} />
          <h2 className="font-montserrat text-sm font-bold text-white">Alterar Senha</h2>
        </div>
        <div className="mt-5 space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (mín. 8 caracteres)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-purple/50 focus:ring-1 focus:ring-ar-purple/20"
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Confirmar nova senha"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-ar-purple/50 focus:ring-1 focus:ring-ar-purple/20"
          />
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="btn-premium-purple flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Alterar Senha
          </button>
        </div>
      </div>

      {/* Delete account */}
      <div className="mt-12 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4" style={{ color: "#E30613" }} />
          <h2 className="font-montserrat text-sm font-bold text-white">Excluir Conta</h2>
        </div>
        <p className="mt-2 text-xs" style={{ color: "#888888" }}>
          Esta ação é irreversível e removerá todos os seus dados pessoais conforme a LGPD.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-500/10"
          >
            <AlertTriangle className="h-4 w-4" />
            Quero excluir minha conta
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs" style={{ color: "#ff6b6b" }}>
              Digite <strong>EXCLUIR</strong> para confirmar a exclusão definitiva da sua conta e dados.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="w-full rounded-xl border border-red-500/30 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-red-500/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/[0.04]"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {saving ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
