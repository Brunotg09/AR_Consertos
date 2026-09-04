"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  EyeOff,
  Wrench,
  Cpu,
  Edit,
  X,
  Save,
  Trash2,
  Loader2,
  DollarSign,
  Tag,
  Upload,
  Image as ImageIcon,
  Plus,
  ScanSearch,
} from "lucide-react";
import { useServices, ServiceItem } from "@/hooks/useServices";
import { servicesData } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { compressImageToWebP, deleteFromStorage, scanAndCleanStorage, processPendingImages } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryCombobox } from "@/components/category-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { services, loading, addService, updateService, deleteService } = useServices({ activeOnly: false });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "convencional" | "inverter">("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    type: "convencional" as "convencional" | "inverter",
    price: "",
    discount_percentage: "",
    badge_garantia: "",
    icon_name: "Wrench",
  });
  const [pricingModel, setPricingModel] = useState<"avulso" | "assinatura" | "ambos">("avulso");
  const [pricingIntervals, setPricingIntervals] = useState<{ value: string; label: string; days: number; price: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    servicesData.forEach((s) => cats.add(s.category));
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [services]);

  const filteredServices = services.filter((service) => {
    const matchesType = typeFilter === "all" || service.type === typeFilter;
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.category.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const closeEditDialog = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(new Map());
    setPendingFiles([]);
    setEditDialogOpen(false);
  };

  const openCreateDialog = () => {
    setSelectedService(null);
    setEditForm({
      name: "",
      description: "",
      category: "",
      type: "convencional",
      price: "",
      discount_percentage: "0",
      badge_garantia: "GARANTIA 90 DIAS",
      icon_name: "Wrench",
    });
    setPricingModel("avulso");
    setPricingIntervals([]);
    setImages([]);
    setPendingFiles([]);
    setPreviews(new Map());
    setEditDialogOpen(true);
  };

  const openEditDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setEditForm({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      type: service.type,
      price: service.price?.toString() || "",
      discount_percentage: service.discount_percentage?.toString() || "0",
      badge_garantia: service.badge_garantia || "GARANTIA 90 DIAS",
      icon_name: service.icon_name || "Wrench",
    });
    setPricingModel(service.pricing_config?.model || "avulso");
    setPricingIntervals(service.pricing_config?.intervals || []);
    setImages(service.images || []);
    setPendingFiles([]);
    setPreviews(new Map());
    setEditDialogOpen(true);
  };

  const addPendingFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: muito grande. Máx 10MB.`); return false; }
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: não é imagem.`); return false; }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => {
      const next = new Map(prev);
      valid.forEach((f) => next.set(f, URL.createObjectURL(f)));
      return next;
    });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addPendingFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addPendingFiles(e.dataTransfer.files);
  }, [addPendingFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeImage = async (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file) {
        const url = previews.get(file);
        if (url) URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) {
      toast.error("Preencha o nome do serviço.");
      return;
    }
    setSaving(true);

    // Compress + upload only pending files
    const folder = selectedService?.service_id || `new-${Date.now()}`;
    const finalImages = await processPendingImages(
      supabase, "service-images", folder, pendingFiles, images
    );

    // Clean up previews
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(new Map());
    setPendingFiles([]);

    if (selectedService) {
      // Update existing
      const pricingConfig = pricingModel === "avulso" ? null : { model: pricingModel, intervals: pricingIntervals };

      const { error } = await updateService(selectedService.id, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        type: editForm.type,
        price: editForm.price ? parseFloat(editForm.price) : null,
        discount_percentage: parseInt(editForm.discount_percentage) || 0,
        badge_garantia: editForm.badge_garantia,
        icon_name: editForm.icon_name,
        images: finalImages,
        pricing_config: pricingConfig,
      } as any);

      if (error) {
        toast.error("Erro ao salvar: " + error);
      } else {
        toast.success(`Serviço "${editForm.name}" atualizado com sucesso!`);
        setEditDialogOpen(false);
      }
    } else {
      // Create new
      const serviceType = editForm.type as "convencional" | "inverter";
      const pricingConfig = pricingModel === "avulso" ? null : { model: pricingModel, intervals: pricingIntervals };

      const { error } = await addService({
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        type: serviceType,
        price: editForm.price ? parseFloat(editForm.price) : null,
        discount_percentage: parseInt(editForm.discount_percentage) || 0,
        badge_garantia: editForm.badge_garantia,
        icon_name: editForm.icon_name || "Wrench",
        images: finalImages,
        active: true,
        sort_order: 0,
        pricing_config: pricingConfig,
      } as any);

      if (error) {
        toast.error("Erro ao criar: " + error);
        console.error("Create error details:", error);
      } else {
        toast.success(`Serviço "${editForm.name}" criado com sucesso!`);
        setEditDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    setSaving(true);

    // Remove images from storage
    for (const img of selectedService.images || []) {
      await deleteFromStorage(supabase, "service-images", img);
    }

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

  const scanStorage = async () => {
    setScanning(true);
    try {
      const allUrls = services.flatMap((s) => s.images || []);
      const removed = await scanAndCleanStorage(supabase, "service-images", "service-images", allUrls);
      if (removed === 0) {
        toast.success("Varredura OK: nenhuma imagem órfã encontrada.");
      } else {
        toast.success(`Varredura: ${removed} imagem(ns) órfã(s) removida(s).`);
      }
    } catch (error) {
      console.error("Error scanning service-images:", error);
      toast.error("Erro ao varrer storage de serviços.");
    } finally {
      setScanning(false);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-montserrat text-2xl font-bold text-white">Serviços</h1>
            <p className="mt-1 text-sm text-white/50">Gerencie o catálogo de serviços</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={scanStorage}
              disabled={scanning}
              variant="outline"
              className="rounded-xl border-white/10 text-white/70 hover:bg-white/[0.04]"
            >
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
              {scanning ? "Varrendo..." : "Varredura"}
            </Button>
            <Button
              onClick={openCreateDialog}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-3 text-center sm:p-4">
          <p className="text-lg font-bold text-white sm:text-2xl">{stats.total}</p>
          <p className="text-[10px] text-white/50 sm:text-sm">Total</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-3 text-center sm:p-4">
          <p className="text-lg font-bold text-[#E30613] sm:text-2xl">{stats.convencional}</p>
          <p className="text-[10px] text-white/50 sm:text-sm">Convencional</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-3 text-center sm:p-4">
          <p className="text-lg font-bold text-[#8B5CF6] sm:text-2xl">{stats.inverter}</p>
          <p className="text-[10px] text-white/50 sm:text-sm">Inverter</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-3 text-center sm:p-4">
          <p className="text-lg font-bold text-green-400 sm:text-2xl">{stats.active}</p>
          <p className="text-[10px] text-white/50 sm:text-sm">Ativos</p>
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
              {/* Image Preview */}
              <div className="relative h-40 w-full overflow-hidden bg-white/[0.02]">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[0]}
                    alt={service.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-white/20" />
                  </div>
                )}
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
              </div>

              <div className="p-4">
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
      <Dialog open={editDialogOpen} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle className="text-white">
               {selectedService ? "Editar Serviço" : "Novo Serviço"}
             </DialogTitle>
             <DialogDescription className="text-white/60">
               {selectedService
                 ? "Atualize as informações deste serviço"
                 : "Cadastre um novo serviço no catálogo"}
             </DialogDescription>
           </DialogHeader>

           {/* Service Type/ID Badge (edit only) */}
           {selectedService && (
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
           )}

            {/* Images Section */}
            <div className="space-y-2">
              <Label className="text-white/70">Imagens do Serviço</Label>
              <div
                className={`grid grid-cols-4 gap-2 ${dragOver ? "rounded-lg ring-2 ring-[#E30613]/60 p-1" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {images.map((img, idx) => (
                  <div key={`old-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                    <img src={img} alt={`Imagem ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {pendingFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-dashed border-emerald-400/40">
                    <img src={previews.get(file)} alt={`Nova ${idx + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-500/80 px-1 py-0.5 text-[8px] text-white">NOVA</span>
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition-colors hover:bg-white/[0.04]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Upload className="h-6 w-6 text-white/30" />
                </label>
              </div>
              <p className="text-[10px] text-white/40">
                Arraste e solte ou clique para adicionar · Conversão para WebP ao salvar · Máx. 200KB
              </p>
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
                <CategoryCombobox
                  value={editForm.category}
                  onChange={(value) =>
                    setEditForm({ ...editForm, category: value })
                  }
                  categories={allCategories}
                  placeholder="Selecione ou digite uma categoria..."
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

           <div className="space-y-2">
             <Label className="text-white/70">Tipo de Serviço</Label>
             <div className="flex gap-2">
               <button
                 type="button"
                 onClick={() => setEditForm({ ...editForm, type: "convencional" })}
                 className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                   editForm.type === "convencional"
                     ? "bg-[#E30613] text-white"
                     : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                 }`}
               >
                 <Wrench className="h-4 w-4" />
                 Convencional
               </button>
               <button
                 type="button"
                 onClick={() => setEditForm({ ...editForm, type: "inverter" })}
                 className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                   editForm.type === "inverter"
                     ? "bg-[#8B5CF6] text-white"
                     : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                 }`}
               >
                 <Cpu className="h-4 w-4" />
                 Inverter
               </button>
             </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Modelo de Cobrança</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPricingModel("avulso"); setPricingIntervals([]); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    pricingModel === "avulso"
                      ? "bg-[#E30613] text-white"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  Avulso
                </button>
                <button
                  type="button"
                  onClick={() => setPricingModel("assinatura")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    pricingModel === "assinatura"
                      ? "bg-[#3B82F6] text-white"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  Assinatura
                </button>
                <button
                  type="button"
                  onClick={() => setPricingModel("ambos")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    pricingModel === "ambos"
                      ? "bg-[#F59E0B] text-white"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  Ambos
                </button>
              </div>
              <p className="text-xs text-white/40">
                {pricingModel === "avulso" && "Serviço cobrado por atendimento individual."}
                {pricingModel === "assinatura" && "Disponível apenas via plano de assinatura mensal com visitas recorrentes."}
                {pricingModel === "ambos" && "O cliente pode escolher entre avulso ou assinatura mensal."}
              </p>
            </div>

            {pricingModel !== "avulso" && (
              <div className="col-span-full space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-blue-300">Intervalos de Visita</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const existing = pricingIntervals.map((i) => i.value);
                      const allOptions = [
                        { value: "7d", label: "A cada 7 dias", days: 7 },
                        { value: "15d", label: "A cada 15 dias", days: 15 },
                        { value: "1m", label: "A cada 1 mês", days: 30 },
                        { value: "2m", label: "A cada 2 meses", days: 60 },
                        { value: "3m", label: "A cada 3 meses", days: 90 },
                        { value: "6m", label: "A cada 6 meses", days: 180 },
                      ];
                      const available = allOptions.filter((o) => !existing.includes(o.value));
                      if (available.length > 0) {
                        setPricingIntervals([...pricingIntervals, { ...available[0], price: 0 }]);
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Adicionar intervalo
                  </button>
                </div>
                {pricingIntervals.length === 0 ? (
                  <p className="text-xs text-white/30">Nenhum intervalo configurado. Clique em "+ Adicionar intervalo".</p>
                ) : (
                  <div className="space-y-2">
                    {pricingIntervals.map((interval, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={interval.value}
                          onChange={(e) => {
                            const allOptions = [
                              { value: "7d", label: "A cada 7 dias", days: 7 },
                              { value: "15d", label: "A cada 15 dias", days: 15 },
                              { value: "1m", label: "A cada 1 mês", days: 30 },
                              { value: "2m", label: "A cada 2 meses", days: 60 },
                              { value: "3m", label: "A cada 3 meses", days: 90 },
                              { value: "6m", label: "A cada 6 meses", days: 180 },
                            ];
                            const selected = allOptions.find((o) => o.value === e.target.value);
                            if (selected) {
                              const updated = [...pricingIntervals];
                              updated[idx] = { ...selected, price: interval.price };
                              setPricingIntervals(updated);
                            }
                          }}
                          className="flex-1 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none"
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="7d" className="bg-[#1a1a1a]">A cada 7 dias</option>
                          <option value="15d" className="bg-[#1a1a1a]">A cada 15 dias</option>
                          <option value="1m" className="bg-[#1a1a1a]">A cada 1 mês</option>
                          <option value="2m" className="bg-[#1a1a1a]">A cada 2 meses</option>
                          <option value="3m" className="bg-[#1a1a1a]">A cada 3 meses</option>
                          <option value="6m" className="bg-[#1a1a1a]">A cada 6 meses</option>
                        </select>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={interval.price || ""}
                            onChange={(e) => {
                              const updated = [...pricingIntervals];
                              updated[idx] = { ...interval, price: parseFloat(e.target.value) || 0 };
                              setPricingIntervals(updated);
                            }}
                            placeholder="0,00"
                            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] pl-8 pr-2 py-2 text-sm text-white outline-none [color-scheme:dark]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPricingIntervals(pricingIntervals.filter((_, i) => i !== idx))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-white/30">
                  Defina as opções de frequência e o preço para cada intervalo. O cliente escolherá ao assinar.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-white/70">Ícone do Serviço</Label>
             <Select
               value={editForm.icon_name}
               onValueChange={(value) => setEditForm({ ...editForm, icon_name: value })}
             >
               <SelectTrigger className="rounded-xl border-white/10 bg-[#0f0f0f] text-white">
                 <SelectValue placeholder="Selecione um ícone" />
               </SelectTrigger>
               <SelectContent className="h-[300px] max-h-[300px] bg-[#0f0f0f] border-white/10 text-white" sideOffset={8}>
                 <SelectItem value="Wrench" className="pl-8">🔧 Wrench (Chave de Fenda)</SelectItem>
                 <SelectItem value="Cpu" className="pl-8">💻 Cpu (Eletrônica)</SelectItem>
                 <SelectItem value="Award" className="pl-8">🏆 Award (Garantia)</SelectItem>
                 <SelectItem value="Zap" className="pl-8">⚡ Zap (Energia)</SelectItem>
                 <SelectItem value="Settings" className="pl-8">⚙️ Settings (Configuração)</SelectItem>
                 <SelectItem value="WashingMachine" className="pl-8">🧺 WashingMachine (Lavadora)</SelectItem>
                 <SelectItem value="Refrigerator" className="pl-8">🧊 Refrigerator (Geladeira)</SelectItem>
                 <SelectItem value="Wine" className="pl-8">🍷 Wine (Vinhos)</SelectItem>
                 <SelectItem value="CupSoda" className="pl-8">🥤 CupSoda (Bebidas)</SelectItem>
                 <SelectItem value="Flame" className="pl-8">🔥 Flame (Fogo)</SelectItem>
                 <SelectItem value="CookingPot" className="pl-8">🍲 CookingPot (Cozinha)</SelectItem>
                 <SelectItem value="Coffee" className="pl-8">☕ Coffee (Café)</SelectItem>
                 <SelectItem value="Blender" className="pl-8">🧃 Blender (Mixer)</SelectItem>
                 <SelectItem value="ChefHat" className="pl-8">👨‍🍳 ChefHat (Chef)</SelectItem>
                 <SelectItem value="Scissors" className="pl-8">✂️ Scissors (Tesoura)</SelectItem>
                 <SelectItem value="Wind" className="pl-8">💨 Wind (Ventilador)</SelectItem>
                 <SelectItem value="Sparkles" className="pl-8">✨ Sparkles (Brilho)</SelectItem>
                 <SelectItem value="Hammer" className="pl-8">🔨 Hammer (Martelo)</SelectItem>
                 <SelectItem value="Construction" className="pl-8">🏗️ Construction (Construção)</SelectItem>
                 <SelectItem value="Droplet" className="pl-8">💧 Droplet (Água)</SelectItem>
                 <SelectItem value="Fan" className="pl-8">🌀 Fan (Ventilador)</SelectItem>
                 <SelectItem value="Radio" className="pl-8">📻 Radio (Rádio)</SelectItem>
                 <SelectItem value="Bike" className="pl-8">🚲 Bike (Bicicleta)</SelectItem>
                 <SelectItem value="Sun" className="pl-8">☀️ Sun (Sol)</SelectItem>
               </SelectContent>
           </Select>
            </div>

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
              {selectedService ? "Salvar" : "Criar"}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
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
