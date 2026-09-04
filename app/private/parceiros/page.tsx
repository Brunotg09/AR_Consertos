"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Users,
  UserPlus,
  X,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Partner {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string | null;
  address: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  tech_count?: number;
}

export default function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    notes: "",
  });

  // Tech states
  const [techDialogOpen, setTechDialogOpen] = useState(false);
  const [selectedPartnerForTech, setSelectedPartnerForTech] = useState<Partner | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [techForm, setTechForm] = useState({ cpf: "" });
  const [savingTech, setSavingTech] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch tech count for each partner
      const partnersWithCount = await Promise.all(
        (data || []).map(async (p) => {
          const { count } = await supabase
            .from("partner_technicians")
            .select("*", { count: "exact", head: true })
            .eq("partner_id", p.id);
          return { ...p, tech_count: count || 0 };
        })
      );

      setPartners(partnersWithCount);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filteredPartners = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cnpj.includes(search) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      notes: "",
    });
    setSelectedPartner(null);
  };

  const fetchTechnicians = useCallback(async (partnerId: string) => {
    setLoadingTechs(true);
    try {
      const { data, error } = await supabase
        .from("partner_technicians")
        .select("*, profiles:user_id(full_name, user_private:user_private(email))")
        .eq("partner_id", partnerId);

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
    } finally {
      setLoadingTechs(false);
    }
  }, []);

  const openTechDialog = (partner: Partner) => {
    setSelectedPartnerForTech(partner);
    setTechForm({ cpf: "" });
    setUserSearch("");
    setUserSearchResults([]);
    setSelectedUser(null);
    setTechDialogOpen(true);
    fetchTechnicians(partner.id);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, user_private:user_private(email)")
        .ilike("full_name", `%${query}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddTech = async () => {
    if (!selectedPartnerForTech || !selectedUser) return;
    if (!techForm.cpf) {
      toast.error("Informe o CPF do técnico.");
      return;
    }

    setSavingTech(true);
    try {
      const { error } = await supabase.from("partner_technicians").insert({
        partner_id: selectedPartnerForTech.id,
        user_id: selectedUser.id,
        cpf: techForm.cpf.replace(/\D/g, ""),
      });

      if (error) throw error;

      toast.success("Técnico adicionado com sucesso!");
      setTechForm({ cpf: "" });
      setSelectedUser(null);
      setUserSearch("");
      setUserSearchResults([]);
      fetchTechnicians(selectedPartnerForTech.id);
      fetchPartners();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Este técnico já está vinculado a este parceiro.");
      } else {
        toast.error(error.message || "Erro ao adicionar técnico.");
      }
    } finally {
      setSavingTech(false);
    }
  };

  const handleRemoveTech = async (techId: string) => {
    if (!selectedPartnerForTech) return;
    try {
      const { error } = await supabase
        .from("partner_technicians")
        .delete()
        .eq("id", techId);

      if (error) throw error;
      toast.success("Técnico removido!");
      fetchTechnicians(selectedPartnerForTech.id);
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover técnico.");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      cnpj: partner.cnpj,
      email: partner.email,
      phone: partner.phone || "",
      rua: partner.address?.rua || "",
      numero: partner.address?.numero || "",
      bairro: partner.address?.bairro || "",
      cidade: partner.address?.cidade || "",
      estado: partner.address?.estado || "",
      cep: partner.address?.cep || "",
      notes: partner.notes || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cnpj || !formData.email) {
      toast.error("Preencha nome, CNPJ e email.");
      return;
    }

    setSaving(true);

    const address = {
      rua: formData.rua || null,
      numero: formData.numero || null,
      bairro: formData.bairro || null,
      cidade: formData.cidade || null,
      estado: formData.estado || null,
      cep: formData.cep || null,
    };

    try {
      if (selectedPartner) {
        // Update
        const { error } = await supabase
          .from("partners")
          .update({
            name: formData.name,
            cnpj: formData.cnpj,
            email: formData.email,
            phone: formData.phone || null,
            address,
            notes: formData.notes || null,
          })
          .eq("id", selectedPartner.id);

        if (error) throw error;
        toast.success("Parceiro atualizado com sucesso!");
      } else {
        // Create
        const { error } = await supabase.from("partners").insert({
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email,
          phone: formData.phone || null,
          address,
          notes: formData.notes || null,
        });

        if (error) throw error;
        toast.success("Parceiro criado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar parceiro.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPartner) return;

    try {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", selectedPartner.id);

      if (error) throw error;
      toast.success("Parceiro removido com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover parceiro.");
    }
  };

  const toggleActive = async (partner: Partner) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({ active: !partner.active })
        .eq("id", partner.id);

      if (error) throw error;
      toast.success(partner.active ? "Parceiro desativado." : "Parceiro ativado.");
      fetchPartners();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status.");
    }
  };

  const formatCnpj = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 14);
    return nums
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/\/(\d{4})(\d)/, "$1-$2");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bebas text-3xl tracking-wide text-white">
            PARCEIROS
          </h1>
          <p className="text-sm text-white/50">
            Gerencie as empresas terceirizadas parceiras
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#E30613] hover:bg-[#E30613]/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Parceiro
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-white/30"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E30613]/10">
              <Building2 className="h-5 w-5 text-[#E30613]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{partners.length}</p>
              <p className="text-xs text-white/50">Total de Parceiros</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
              <Building2 className="h-5 w-5 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {partners.filter((p) => p.active).length}
              </p>
              <p className="text-xs text-white/50">Ativos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
              <Users className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {partners.reduce((acc, p) => acc + (p.tech_count || 0), 0)}
              </p>
              <p className="text-xs text-white/50">Técnicos Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">CNPJ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Técnicos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50">Criado em</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E30613]/10">
                          <Building2 className="h-4 w-4 text-[#E30613]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{partner.name}</p>
                          {partner.notes && (
                            <p className="text-xs text-white/40 truncate max-w-[200px]">{partner.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white/70">{partner.cnpj}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-white/60">
                          <Mail className="h-3 w-3" />
                          {partner.email}
                        </div>
                        {partner.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-white/60">
                            <Phone className="h-3 w-3" />
                            {partner.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2 py-0.5 text-xs font-medium text-[#8B5CF6]">
                        <Users className="h-3 w-3" />
                        {partner.tech_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(partner)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          partner.active
                            ? "bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20"
                            : "bg-white/5 text-white/40 hover:bg-white/10"
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${partner.active ? "bg-[#22c55e]" : "bg-white/40"}`} />
                        {partner.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/40">
                        {format(new Date(partner.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/private/parceiros/${partner.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6]/10 px-3 py-1.5 text-xs font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/20"
                        >
                          Painel
                        </Link>
                        <button
                          onClick={() => openDeleteDialog(partner)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[#E30613]/10 hover:text-[#E30613]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedPartner ? "Editar Parceiro" : "Novo Parceiro"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/70">Nome da Empresa *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Razão Social"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">CNPJ *</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Telefone / WhatsApp</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Rua / Logradouro</Label>
              <Input
                value={formData.rua}
                onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                placeholder="Rua Exemplo"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Número</Label>
              <Input
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="123"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Bairro</Label>
              <Input
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Centro"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Cidade</Label>
              <Input
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="São Paulo"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Estado</Label>
              <Input
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                placeholder="SP"
                maxLength={2}
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">CEP</Label>
              <Input
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                placeholder="00000-000"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label className="text-white/70">Observações</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas internas sobre o parceiro"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#E30613] hover:bg-[#E30613]/90"
            >
              {saving ? "Salvando..." : selectedPartner ? "Salvar Alterações" : "Criar Parceiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover Parceiro</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja remover <strong className="text-white">{selectedPartner?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#E30613] hover:bg-[#E30613]/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Technician Dialog */}
      <Dialog open={techDialogOpen} onOpenChange={setTechDialogOpen}>
        <DialogContent className="max-w-2xl border-white/[0.06] bg-[#0f0f0f]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Técnicos - {selectedPartnerForTech?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Add Tech Form */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <h4 className="mb-3 text-sm font-medium text-white">Adicionar Técnico</h4>

            {selectedUser ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                  <Users className="h-4 w-4 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{selectedUser.full_name}</p>
                  <p className="text-xs text-white/40">{selectedUser.user_private?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearch("");
                    setTechForm({ cpf: "" });
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Buscar usuário por nome..."
                  className="pl-10 border-white/10 bg-white/[0.03] text-white"
                />
                {userSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/10 bg-[#1a1a1a] shadow-lg">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setUserSearch("");
                          setUserSearchResults([]);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                          <Users className="h-3.5 w-3.5 text-[#8B5CF6]" />
                        </div>
                        <div>
                          <p className="text-sm text-white">{user.full_name}</p>
                          <p className="text-xs text-white/40">{user.user_private?.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedUser && (
              <div className="flex gap-3">
                <Input
                  value={techForm.cpf}
                  onChange={(e) => setTechForm({ ...techForm, cpf: e.target.value })}
                  placeholder="CPF"
                  className="flex-1 border-white/10 bg-white/[0.03] text-white"
                />
                <Button
                  onClick={handleAddTech}
                  disabled={savingTech}
                  className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90"
                >
                  {savingTech ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            )}
          </div>

          {/* Tech List */}
          <div className="mt-4">
            <h4 className="mb-3 text-sm font-medium text-white">
              Técnicos Cadastrados ({technicians.length})
            </h4>
            {loadingTechs ? (
              <div className="py-4 text-center text-sm text-white/40">Carregando...</div>
            ) : technicians.length === 0 ? (
              <div className="py-4 text-center text-sm text-white/40">
                Nenhum técnico cadastrado para este parceiro.
              </div>
            ) : (
              <div className="space-y-2">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tech.profiles?.full_name || "Sem nome"}
                      </p>
                      <p className="text-xs text-white/40">{tech.profiles?.user_private?.email}</p>
                      <p className="text-xs text-white/40">CPF: {tech.cpf}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTech(tech.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-[#E30613]/10 hover:text-[#E30613]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
