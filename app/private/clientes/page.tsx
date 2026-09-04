"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Link2,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
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
import { RefreshCw } from "lucide-react";

interface Cliente {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  endereco: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | null;
  user_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [matchingProfiles, setMatchingProfiles] = useState<Profile[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [subCounts, setSubCounts] = useState<Record<number, number>>({});

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    notes: "",
  });

  const fetchClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    if (clientes.length === 0) return;
    const fetchSubCounts = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("client_id")
        .in("status", ["active", "paused"]);
      if (!data) return;
      const counts: Record<number, number> = {};
      data.forEach((sub: any) => {
        if (sub.client_id) {
          counts[sub.client_id] = (counts[sub.client_id] || 0) + 1;
        }
      });
      setSubCounts(counts);
    };
    fetchSubCounts();
  }, [clientes]);

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone?.includes(search) ||
      c.cpf?.includes(search)
  );

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      cpf: "",
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      notes: "",
    });
    setSelectedCliente(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const openEditDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cpf: cliente.cpf || "",
      rua: cliente.endereco?.rua || "",
      numero: cliente.endereco?.numero || "",
      bairro: cliente.endereco?.bairro || "",
      cidade: cliente.endereco?.cidade || "",
      estado: cliente.endereco?.estado || "",
      cep: cliente.endereco?.cep || "",
      notes: cliente.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDeleteDialogOpen(true);
  };

  const openLinkDialog = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setLinkDialogOpen(true);
    setMatchingProfiles([]);
    setSearchingProfiles(true);

    try {
      // Search for profiles with similar name, phone, or email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .or(`full_name.ilike.%${cliente.nome}%`);

      // Also get user_private emails
      const { data: privateData } = await supabase
        .from("user_private")
        .select("id, email");

      // Merge profiles with emails from user_private
      const profilesWithEmails: Profile[] = (profiles || []).map((p) => {
        const privateInfo = privateData?.find((priv) => priv.id === p.id);
        return {
          ...p,
          email: privateInfo?.email,
        };
      });

      // Filter by matching criteria
      const filtered = profilesWithEmails.filter((p) => {
        const nameMatch = p.full_name?.toLowerCase().includes(cliente.nome.toLowerCase());
        const phoneMatch = cliente.telefone && p.phone === cliente.telefone;
        const emailMatch = cliente.email && p.email?.toLowerCase() === cliente.email.toLowerCase();
        return nameMatch || phoneMatch || emailMatch;
      });

      setMatchingProfiles(filtered);
    } catch (error) {
    } finally {
      setSearchingProfiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const clienteData = {
        nome: formData.nome,
        telefone: formData.telefone || null,
        email: formData.email || null,
        cpf: formData.cpf || null,
        endereco: {
          rua: formData.rua || null,
          numero: formData.numero || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
        },
        notes: formData.notes || null,
      };

      if (selectedCliente) {
        // Update
        const { error } = await supabase
          .from("clientes")
          .update(clienteData)
          .eq("id", selectedCliente.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("clientes").insert([clienteData]);
        if (error) throw error;
      }

      setEditDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      alert("Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", selectedCliente.id);
      if (error) throw error;

      setDeleteDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
    } catch (error) {
      alert("Erro ao excluir cliente");
    }
  };

  const handleLinkProfile = async (profileId: string) => {
    if (!selectedCliente) return;

    try {
      // Fetch the profile data to also fill client info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      // Also get email from user_private
      const { data: privateData } = await supabase
        .from("user_private")
        .select("email")
        .eq("id", profileId)
        .single();

      // Map profile address to cliente format
      const profileAddress = profile?.address as Record<string, string> | null;
      const endereco = profileAddress ? {
        rua: profileAddress.logradouro || null,
        numero: profileAddress.numero || null,
        bairro: profileAddress.bairro || null,
        cidade: profileAddress.localidade || null,
        estado: profileAddress.uf || null,
        cep: profileAddress.cep || null,
      } : null;

      // Update client with profile data + link
      const updateData: Record<string, unknown> = {
        user_id: profileId,
      };

      if (profile?.full_name) updateData.nome = profile.full_name;
      if (profile?.phone) updateData.telefone = profile.phone;
      if (privateData?.email) updateData.email = privateData.email;
      if (endereco) updateData.endereco = endereco;

      const { error } = await supabase
        .from("clientes")
        .update(updateData)
        .eq("id", selectedCliente.id);

      if (error) throw error;

      setLinkDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
      toast.success("Perfil vinculado e dados atualizados");
    } catch (error) {
      alert("Erro ao vincular perfil");
    }
  };

  const handleUnlinkProfile = async (cliente: Cliente) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ user_id: null })
        .eq("id", cliente.id);
      if (error) throw error;
      fetchClientes();
    } catch (error) {
      alert("Erro ao desvincular perfil");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie seus clientes</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email, telefone ou CPF..."
          className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white placeholder:text-white/30"
        />
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="p-4 text-xs font-medium text-white/50">Cliente</th>
                <th className="p-4 text-xs font-medium text-white/50">Contato</th>
                <th className="p-4 text-xs font-medium text-white/50">CPF</th>
                <th className="p-4 text-xs font-medium text-white/50">Cidade</th>
                <th className="p-4 text-xs font-medium text-white/50">Conta Vinculada</th>
                <th className="p-4 text-xs font-medium text-white/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/50">
                    Carregando...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/50">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                          <span className="text-sm font-bold text-[#8B5CF6]">
                            {cliente.nome[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{cliente.nome}</p>
                          <p className="text-xs text-white/50">
                            Desde {format(new Date(cliente.created_at), "MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm">
                        {cliente.telefone && (
                          <span className="text-white/70">{cliente.telefone}</span>
                        )}
                        {cliente.email && (
                          <span className="text-white/50">{cliente.email}</span>
                        )}
                        {!cliente.telefone && !cliente.email && (
                          <span className="text-white/30">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-white/70">{cliente.cpf || "-"}</td>
                    <td className="p-4 text-sm text-white/70">
                      {cliente.endereco?.cidade || "-"}
                      {cliente.endereco?.estado && `/${cliente.endereco.estado}`}
                    </td>
                    <td className="p-4">
                      {cliente.user_id ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
                            <Link2 className="h-3 w-3" />
                            Vinculado
                          </span>
                          <button
                            onClick={() => handleUnlinkProfile(cliente)}
                            className="text-xs text-white/50 hover:text-white"
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openLinkDialog(cliente)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-medium text-[#8B5CF6] transition-colors hover:bg-[#8B5CF6]/20"
                        >
                          <Link2 className="h-3 w-3" />
                          Vincular Conta
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {subCounts[cliente.id] != null && subCounts[cliente.id] > 0 && (
                          <a
                            href={`/private/assinaturas?client=${cliente.id}`}
                            className="flex items-center gap-1 rounded-lg bg-[#3B82F6]/10 px-2 py-1 text-xs font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/20"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {subCounts[cliente.id]} {subCounts[cliente.id] === 1 ? "assinatura" : "assinaturas"}
                          </a>
                        )}
                        <button
                          onClick={() => openEditDialog(cliente)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                        >
                          <Edit className="h-4 w-4 text-white/70" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(cliente)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/10 transition-colors hover:bg-[#E30613]/20"
                        >
                          <Trash2 className="h-4 w-4 text-[#E30613]" />
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedCliente ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-4 rounded-xl border border-white/[0.06] p-4">
              <h3 className="text-sm font-medium text-white/70">Informações Pessoais</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-white/70">
                    Nome *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-white/70">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-white/70">
                    Telefone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 rounded-xl border border-white/[0.06] p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-white/70">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>

              {/* Row 1: Rua + Número */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rua" className="text-white/70">
                    Rua
                  </Label>
                  <Input
                    id="rua"
                    value={formData.rua}
                    onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-white/70">
                    Número
                  </Label>
<Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="rounded-xl border-white/10 bg-white/[0.02] text-white max-w-[100px]"
                    />
                </div>
              </div>

              {/* Row 2: Bairro + Cidade */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-white/70">
                    Bairro
                  </Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-white/70">
                    Cidade
                  </Label>
<Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="rounded-xl border-white/10 bg-white/[0.02] text-white max-w-[150px]"
                    />
                </div>
              </div>

              {/* Row 3: Estado + CEP */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-white/70">
                    Estado
                  </Label>
<Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      placeholder="SE"
                      maxLength={2}
                      className="rounded-xl border-white/10 bg-white/[0.02] text-white uppercase max-w-[80px]"
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-white/70">
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white/70">
                Observações
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais sobre o cliente..."
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="rounded-xl border-white/10 text-white/70"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Profile Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Vincular Conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Buscando perfis compatíveis com &quot;{selectedCliente?.nome}&quot;...
            </p>

            {searchingProfiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
              </div>
            ) : matchingProfiles.length > 0 ? (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {matchingProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleLinkProfile(profile.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] p-3 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20">
                      <span className="text-sm font-bold text-[#8B5CF6]">
                        {profile.full_name?.[0].toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{profile.full_name}</p>
                      <div className="flex gap-3 text-xs text-white/50">
                        {profile.phone && <span>{profile.phone}</span>}
                        {profile.email && <span>{profile.email}</span>}
                      </div>
                    </div>
                    <Link2 className="h-4 w-4 text-[#8B5CF6]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-white/30" />
                <p className="text-sm text-white/50">
                  Nenhum perfil compatível encontrado.
                </p>
                <p className="text-xs text-white/30">
                  O cliente pode não ter uma conta ainda.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline"
              onClick={() => setLinkDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir &quot;{selectedCliente?.nome}&quot;? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-white/70">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
