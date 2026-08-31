"use client";

import { useState, useRef, useMemo } from "react";
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
} from "lucide-react";
import { useServices, ServiceItem } from "@/hooks/useServices";
import { servicesData } from "@/data/services";
import { supabase } from "@/lib/supabase";
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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
    setImages([]);
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
    setImages(service.images || []);
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages = [...images];
    const folder = selectedService?.service_id || `new-${Date.now()}`;

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${folder}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("service-images")
        .upload(filePath, file, { upsert: true });

      if (error) {
        toast.error("Erro ao upload: " + error.message);
      } else {
        const { data } = supabase.storage
          .from("service-images")
          .getPublicUrl(filePath);
        newImages.push(data.publicUrl);
      }
    }

    setImages(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = async (index: number) => {
    const imageUrl = images[index];

    // Try to extract path from URL and delete from storage
    if (imageUrl.includes("service-images")) {
      const urlParts = imageUrl.split("service-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split("?")[0];
        await supabase.storage.from("service-images").remove([filePath]);
      }
    }

    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return;
    setSaving(true);

    if (selectedService) {
      // Update existing
      const { error } = await updateService(selectedService.id, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        type: editForm.type,
        price: editForm.price ? parseFloat(editForm.price) : null,
        discount_percentage: parseInt(editForm.discount_percentage) || 0,
        badge_garantia: editForm.badge_garantia,
        icon_name: editForm.icon_name,
        images: images,
      });

      if (error) {
        toast.error("Erro ao salvar: " + error);
      } else {
        toast.success(`Serviço "${editForm.name}" atualizado com sucesso!`);
        setEditDialogOpen(false);
      }
    } else {
      // Create new
      const serviceType = editForm.type as "convencional" | "inverter";
      const { error } = await addService({
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        type: serviceType,
        price: editForm.price ? parseFloat(editForm.price) : null,
        discount_percentage: parseInt(editForm.discount_percentage) || 0,
        badge_garantia: editForm.badge_garantia,
        icon_name: editForm.icon_name || "Wrench",
        images: images,
         active: true,
        sort_order: 0,
      });

      if (error) {
        toast.error("Erro ao criar: " + error);
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
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
           <h1 className="font-montserrat text-2xl font-bold text-white">Serviços</h1>
           <p className="mt-1 text-sm text-white/50">Gerencie o catálogo de serviços</p>
         </div>
         <Button
           onClick={openCreateDialog}
           className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
         >
           <Plus className="mr-2 h-4 w-4" />
           Novo Serviço
         </Button>
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
             <div className="grid grid-cols-4 gap-2">
               {images.map((img, idx) => (
                 <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                   <img src={img} alt={`Imagem ${idx + 1}`} className="h-full w-full object-cover" />
                   <button
                     onClick={() => removeImage(idx)}
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
                 {uploading ? (
                   <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                 ) : (
                   <Upload className="h-6 w-6 text-white/30" />
                 )}
               </label>
             </div>
             <p className="text-[10px] text-white/40">
               Formatos: JPG, PNG, WebP. Tamanho máximo: 5MB por imagem.
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
