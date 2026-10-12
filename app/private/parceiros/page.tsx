"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Users,
  UserCircle2,
  Star,
  Loader2,
} from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { maskCPF, maskPhone, validaCPF, CATEGORY_OPTIONS, PARTNER_CATEGORIES, maskCPFDisplay, maskCEP, fetchAddressByCep } from "@/lib/partner-utils";
import { cn } from "@/lib/utils";
import { compressImageToWebP } from "@/lib/imageUtils";

interface Partner {
  id: string;
  user_id: string | null;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  photo_url: string | null;
  categories: string[];
  bio: string | null;
  experience_years: number | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  average_rating: number | null;
  total_ratings: number;
  active: boolean;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  full_name: "",
  cpf: "",
  email: "",
  phone: "",
  photo_url: "",
  categories: [] as string[],
  bio: "",
  experience_years: "",
  address_street: "",
  address_number: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  address_zipcode: "",
  notes: "",
  login_email: "",
};

export default function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchPartners = useCallback(async () => {
    try {
      const data = await withTimeout(
        () => supabase.from("partners").select("*").order("full_name"),
        5000,
        null
      );
      setPartners(data?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filtered = partners.filter(
    (p) =>
      (!categoryFilter || (p.categories || []).includes(categoryFilter)) &&
      (p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.cpf.includes(search))
  );

  const openCreate = () => {
    setSelectedPartner(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Partner) => {
    setSelectedPartner(p);
    setFormData({
      full_name: p.full_name,
      cpf: p.cpf,
      email: p.email,
      phone: p.phone,
      photo_url: p.photo_url || "",
      categories: p.categories || [],
      bio: p.bio || "",
      experience_years: p.experience_years?.toString() || "",
      address_street: p.address_street || "",
      address_number: p.address_number || "",
      address_neighborhood: p.address_neighborhood || "",
      address_city: p.address_city || "",
      address_state: p.address_state || "",
      address_zipcode: p.address_zipcode || "",
      notes: p.notes || "",
      login_email: "",
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImageToWebP(file, 150, 600, 600);
      const path = `partners/${Date.now()}-${compressed.name}`;
      const { error } = await supabase.storage
        .from("service-order-photos")
        .upload(path, compressed);
      if (error) throw error;
      const { data } = supabase.storage.from("service-order-photos").getPublicUrl(path);
      setFormData((f) => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Foto enviada");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleCepBlur = async () => {
    const cep = formData.address_zipcode.replace(/\D/g, "");
    if (cep.length !== 8) return;
    const addr = await fetchAddressByCep(cep);
    if (!addr) return;
    setFormData((f) => ({
      ...f,
      address_street: f.address_street || addr.logradouro,
      address_neighborhood: f.address_neighborhood || addr.bairro,
      address_city: f.address_city || addr.localidade,
      address_state: f.address_state || addr.uf,
    }));
  };

  const handleSave = async () => {
    // Validações
    if (!formData.full_name.trim()) return toast.error("Nome é obrigatório");
    if (!validaCPF(formData.cpf)) return toast.error("CPF inválido");
    if (!formData.email.trim()) return toast.error("Email é obrigatório");
    if (!formData.phone.trim()) return toast.error("Telefone é obrigatório");
    if (formData.categories.length === 0) return toast.error("Selecione ao menos 1 categoria");

    setSaving(true);
    try {
      // Resolver vínculo de login (email → auth user id)
      let userId: string | null = selectedPartner?.user_id || null;
      const loginEmail = formData.login_email.trim().toLowerCase();
      if (loginEmail) {
        const { data: uid, error: uidError } = await withTimeout(
          () => supabase.rpc("find_user_id_by_email", { p_email: loginEmail }),
          5000,
          { data: null, error: new Error("Timeout") }
        );
        if (uidError) throw uidError;
        if (!uid) {
          toast.error(`Nenhum usuário cadastrado com o email "${loginEmail}". Cadastre o login primeiro.`);
          setSaving(false);
          return;
        }
        userId = uid as string;
      }

      // Foto opcional: se vazia e tem vínculo, puxa avatar do perfil
      let photoUrl = formData.photo_url;
      if (!photoUrl && userId) {
        const { data: profile } = await withTimeout(
          () => supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
          5000,
          { data: null, error: null }
        );
        photoUrl = profile?.avatar_url || "";
      }

      const payload = {
        full_name: formData.full_name.trim(),
        cpf: formData.cpf,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        photo_url: photoUrl,
        categories: formData.categories,
        bio: formData.bio || null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
        address_zipcode: formData.address_zipcode || null,
        notes: formData.notes || null,
        user_id: userId,
      };

      if (selectedPartner) {
        const { error } = await withTimeout(
          () => supabase.from("partners").update(payload).eq("id", selectedPartner.id),
          8000,
          { error: new Error("Timeout") }
        );
        if (error) throw error;
        toast.success("Parceiro atualizado!");
      } else {
        // Verificar CPF/email únicos
        const { data: existing } = await withTimeout(
          () =>
            supabase
              .from("partners")
              .select("id")
              .or(`cpf.eq.${formData.cpf},email.eq.${payload.email}`)
              .maybeSingle(),
          5000,
          null
        );
        if (existing) {
          toast.error("CPF ou email já cadastrado");
          return;
        }

        const { error } = await withTimeout(
          () => supabase.from("partners").insert(payload),
          8000,
          { error: new Error("Timeout") }
        );
        if (error) throw error;
        toast.success("Parceiro cadastrado!");
      }

      setDialogOpen(false);
      fetchPartners();
    } catch (err) {
      toast.error(selectedPartner ? "Erro ao atualizar" : "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedPartner) return;
    setSaving(true);
    const { error } = await withTimeout(
      () =>
        supabase
          .from("partners")
          .update({ active: !selectedPartner.active })
          .eq("id", selectedPartner.id),
      8000,
      { error: new Error("Timeout") }
    );
    setSaving(false);
    setDeleteDialogOpen(false);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(selectedPartner.active ? "Parceiro desativado" : "Parceiro reativado");
    fetchPartners();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-bebas text-4xl tracking-wide text-white">
          Parceiros ({partners.length})
        </h1>
        <Button onClick={openCreate} className="btn-premium-red">
          <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none [&_option]:bg-[#1a1a1a] [&_option]:text-white"
          style={{ colorScheme: "dark" }}
        >
          <option value="">Todas as categorias</option>
          {PARTNER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center text-white/40">
          Nenhum parceiro encontrado.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_url}
                  alt={p.full_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <UserCircle2 className="h-8 w-8 text-white/30" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-white">{p.full_name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      p.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-xs text-white/40">CPF: {maskCPFDisplay(p.cpf)}</p>
                <p className="mt-1 text-xs text-white/50">{(p.categories || []).join(", ")}</p>
                {p.average_rating != null && p.total_ratings > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#C9A84C]">
                    <Star className="h-3 w-3 fill-current" />
                    {p.average_rating} ({p.total_ratings})
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(p)}
                    className="text-xs"
                  >
                    <Edit className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Link href={`/private/parceiros/${p.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Users className="mr-1 h-3 w-3" /> Painel
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPartner(p);
                      setDeleteDialogOpen(true);
                    }}
                    className={cn(
                      "text-xs",
                      p.active ? "text-red-400" : "text-green-400"
                    )}
                  >
                    {p.active ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPartner ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Foto */}
            <div className="flex items-center gap-4">
              {formData.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.photo_url}
                  alt="Foto"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <UserCircle2 className="h-10 w-10 text-white/30" />
                </div>
              )}
              <label className="cursor-pointer text-sm text-[#C9A84C] hover:underline">
                {uploadingPhoto ? "Enviando..." : "Enviar foto (opcional)"}
                <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
              </label>
            </div>

            <div>
              <Label>Nome completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Nome do profissional"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>CPF *</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData((f) => ({ ...f, cpf: maskCPF(e.target.value) }))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div>
                <Label>Telefone / WhatsApp *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Categorias */}
            <div>
              <Label>Categorias que atende *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCategory(c.value)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                      formData.categories.includes(c.value)
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]"
                        : "border-white/10 text-white/50 hover:border-white/20"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Anos de experiência</Label>
              <Input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData((f) => ({ ...f, experience_years: e.target.value }))}
              />
            </div>

            <div>
              <Label>Endereço</Label>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Input
                    value={formData.address_zipcode}
                    onChange={(e) => setFormData((f) => ({ ...f, address_zipcode: maskCEP(e.target.value) }))}
                    onBlur={handleCepBlur}
                    placeholder="CEP (00000-000)"
                    maxLength={9}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    value={formData.address_street}
                    onChange={(e) => setFormData((f) => ({ ...f, address_street: e.target.value }))}
                    placeholder="Rua"
                  />
                </div>
                <div>
                  <Input
                    value={formData.address_number}
                    onChange={(e) => setFormData((f) => ({ ...f, address_number: e.target.value }))}
                    placeholder="Número"
                  />
                </div>
                <div>
                  <Input
                    value={formData.address_neighborhood}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, address_neighborhood: e.target.value }))
                    }
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <Input
                    value={formData.address_city}
                    onChange={(e) => setFormData((f) => ({ ...f, address_city: e.target.value }))}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Input
                    maxLength={2}
                    value={formData.address_state}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, address_state: e.target.value.toUpperCase() }))
                    }
                    placeholder="UF"
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                Preencha o CEP e saia do campo — rua, bairro, cidade e UF são preenchidos automaticamente.
              </p>
            </div>

            <div>
              <Label>Bio</Label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData((f) => ({ ...f, bio: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white focus:border-[#C9A84C] focus:outline-none"
                placeholder="Breve descrição do profissional..."
              />
            </div>

            <div>
              <Label>
                Email do login (vínculo ao painel do parceiro)
                {selectedPartner?.user_id && (
                  <span className="ml-2 text-[11px] font-normal text-[#22c55e]">✓ vinculado</span>
                )}
              </Label>
              <Input
                type="email"
                value={formData.login_email}
                onChange={(e) => setFormData((f) => ({ ...f, login_email: e.target.value }))}
                placeholder={selectedPartner?.user_id ? "Deixe vazio para manter o vínculo atual" : "email@do-parceiro.com (deve ter cadastro no site)"}
              />
              <p className="mt-1 text-[11px] text-white/40">
                O parceiro precisa ter uma conta cadastrada no site. Com esse email ele loga e acessa /parceiro.
              </p>
            </div>

            <div>
              <Label>Observações internas</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-premium-red">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPartner ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ativar/desativar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedPartner?.active ? "Desativar parceiro?" : "Reativar parceiro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPartner?.active
                ? `${selectedPartner?.full_name} não receberá novas ofertas de serviço.`
                : `${selectedPartner?.full_name} voltará a receber ofertas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
