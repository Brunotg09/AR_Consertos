"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  EyeOff,
  Wrench,
  Cpu,
  Edit,
  X,
  Save,
  Plus,
  Trash2,
  Loader2,
  DollarSign,
  Tag,
} from "lucide-react";
import { useServices, ServiceItem } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

export default function ServicosAdminPage() {
  const { services, loading, updateService, deleteService } = useServices({ activeOnly: false });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "convencional" | "inverter">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    discount_percentage: "",
    badge_garantia: "",
  });
  const [saving, setSaving] = useState(false);

  const filteredServices = services.filter((service) => {
    const matchesType = typeFilter === "all" || service.type === typeFilter;
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.category.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const openEditDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setEditForm({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      price: service.price?.toString() || "",
      discount_percentage: service.discount_percentage?.toString() || "0",
      badge_garantia: service.badge_garantia || "GARANTIA 90 DIAS",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedService) return;
    setSaving(true);

    const { error } = await updateService(selectedService.id, {
      name: editForm.name,
      description: editForm.description,
      category: editForm.category,
      price: editForm.price ? parseFloat(editForm.price) : null,
      discount_percentage: parseInt(editForm.discount_percentage) || 0,
      badge_garantia: editForm.badge_garantia,
    });

    if (error) {
      toast.error("Erro ao salvar: " + error);
    } else {
      toast.success(`Serviço "${editForm.name}" atualizado com sucesso!`);
      setEditDialogOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    setSaving(true);

    const { error } = await deleteService(selectedService.id);

    if (error) {
      toast.error("Erro ao excluir: " + error);
    } else {
      toast.success(`Serviço "${selectedService.name}" excluído`);
      setDeleteDialogOpen(false);
    }
    setSaving(false);
  };

  const toggleActive = async (service: ServiceItem) => {
    const { error } = await updateService(service.id, { active: !service.active });
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(service.active ? "Serviço desativado" : "Serviço ativado");
    }
  };

  const stats = {
    total: services.length,
    convencional: services.filter((s) => s.type === "convencional").length,
    inverter: services.filter((s) => s.type === "inverter").length,
    active: services.filter((s) => s.active).length,
    inactive: services.filter((s) => !s.active).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Serviços</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie o catálogo de serviços</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviços..."
            className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setTypeFilter("all")}
            className={`rounded-xl ${
              typeFilter === "all"
                ? "bg-[#E30613] text-white"
                : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            }`}
          >
            Todos
          </Button>
          <Button
            onClick={() => setTypeFilter("convencional")}
            className={`rounded-xl ${
              typeFilter === "convencional"
                ? "bg-[#E30613] text-white"
                : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            }`}
          >
            <Wrench className="mr-2 h-4 w-4" />
            Convencional
          </Button>
          <Button
            onClick={() => setTypeFilter("inverter")}
            className={`rounded-xl ${
              typeFilter === "inverter"
                ? "bg-[#8B5CF6] text-white"
                : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            }`}
          >
            <Cpu className="mr-2 h-4 w-4" />
            Inverter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-white/50">Total</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-[#E30613]">{stats.convencional}</p>
          <p className="text-sm text-white/50">Convencional</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-[#8B5CF6]">{stats.inverter}</p>
          <p className="text-sm text-white/50">Inverter</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          <p className="text-sm text-white/50">Ativos</p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : (
        /* Services Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`group relative overflow-hidden rounded-xl border ${
                !service.active ? "border-red-500/20 opacity-60" : "border-white/[0.06]"
              } bg-[#0f0f0f]`}
            >
              {/* Type Badge */}
              <div className="absolute right-2 top-2 z-10 flex gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    service.type === "inverter"
                      ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                      : "bg-[#E30613]/20 text-[#E30613]"
                  }`}
                >
                  {service.type}
                </span>
                {!service.active && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    Inativo
                  </span>
                )}
              </div>

              <div className="p-4">
                {/* Icon */}
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                    service.type === "inverter"
                      ? "bg-[#8B5CF6]/10"
                      : "bg-[#E30613]/10"
                  }`}
                >
                  {service.type === "inverter" ? (
                    <Cpu className="h-6 w-6 text-[#8B5CF6]" />
                  ) : (
                    <Wrench className="h-6 w-6 text-[#E30613]" />
                  )}
                </div>

                {/* Content */}
                <h3 className="font-montserrat text-sm font-bold text-white">
                  {service.name}
                </h3>
                <p className="mt-1 text-xs text-white/50">{service.category}</p>
                <p className="mt-2 text-xs text-white/70 line-clamp-2">
                  {service.description}
                </p>

                {/* Price & Discount */}
                <div className="mt-3 flex items-center gap-3">
                  {service.price && (
                    <span className="flex items-center gap-1 text-sm font-bold text-green-400">
                      <DollarSign className="h-3 w-3" />
                      {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {service.discount_percentage > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#C9A84C]">
                      <Tag className="h-3 w-3" />
                      {service.discount_percentage}% OFF
                    </span>
                  )}
                </div>

                {/* Badge */}
                <div className="mt-2">
                  <span className="text-[10px] tracking-wide text-[#C9A84C]">
                    {service.badge_garantia}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => openEditDialog(service)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.08]"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>

                  <button
                    onClick={() => toggleActive(service)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      service.active
                        ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                    title={service.active ? "Desativar" : "Ativar"}
                  >
                    {service.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedService(service);
                      setDeleteDialogOpen(true);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-white/[0.06] bg-[#0f0f0f] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Serviço</DialogTitle>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4">
              <div className="rounded-lg bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedService.type === "inverter"
                        ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                        : "bg-[#E30613]/20 text-[#E30613]"
                    }`}
                  >
                    {selectedService.type}
                  </span>
                  <span className="text-xs text-white/50">{selectedService.service_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Nome *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Categoria</Label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Descrição</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Preço Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder="0.00"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Desconto (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.discount_percentage}
                    onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Badge Garantia</Label>
                  <Input
                    value={editForm.badge_garantia}
                    onChange={(e) => setEditForm({ ...editForm, badge_garantia: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editForm.name}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir &quot;{selectedService?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-white/70" disabled={saving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
