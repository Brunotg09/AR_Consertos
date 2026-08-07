"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  ImageIcon,
  X,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  link: string | null;
  active: boolean;
  sort_order: number;
  accent_color: string;
  cta_label: string;
  icon_name: string | null;
  created_at: string;
  updated_at: string | null;
}

function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const match = url.match(`/storage/v1/object/public/${bucket}/(.+)`);
  return match ? decodeURIComponent(match[1]) : null;
}

async function deleteFromStorage(bucket: string, url: string | null) {
  if (!url) return;
  const path = extractStoragePath(url, bucket);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    link: "",
    active: true,
    sort_order: 0,
    accent_color: "#E30613",
    cta_label: "Saiba Mais",
    icon_name: "" as string,
  });
  const [formImage, setFormImage] = useState("");

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Erro ao carregar banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      link: "",
      active: true,
      sort_order: 0,
      accent_color: "#E30613",
      cta_label: "Saiba Mais",
      icon_name: "",
    });
    setFormImage("");
    setSelectedBanner(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const closeDialog = () => {
    setEditDialogOpen(false);
    resetForm();
  };

  const openEditDialog = (banner: Banner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      link: banner.link || "",
      active: banner.active,
      sort_order: banner.sort_order,
      accent_color: banner.accent_color || "#E30613",
      cta_label: banner.cta_label || "Saiba Mais",
      icon_name: banner.icon_name || "",
    });
    setFormImage(banner.image_url || "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (banner: Banner) => {
    setSelectedBanner(banner);
    setDeleteDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

       const { error: uploadError } = await supabase.storage
         .from("banners")
         .upload(filePath, file);

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage
         .from("banners")
         .getPublicUrl(filePath);

      setFormImage(publicUrl);
      toast.success("Imagem enviada com sucesso");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formImage && !formData.icon_name) {
      toast.error("Imagem ou ícone é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const bannerData = {
        title: formData.title || null,
        subtitle: formData.subtitle || null,
        image_url: formImage || null,
        link: formData.link || null,
        active: formData.active,
        sort_order: formData.sort_order,
        accent_color: formData.accent_color,
        cta_label: formData.cta_label || "Saiba Mais",
        icon_name: formData.icon_name || null,
      };

       if (selectedBanner) {
         const { error } = await supabase
           .from("banners")
           .update(bannerData)
           .eq("id", selectedBanner.id);
         if (error) throw error;

         // Remove imagem antiga do storage se ela foi substituida
         const oldImage = selectedBanner.image_url;
         const newImage = formImage || null;
         if (oldImage && oldImage !== newImage) {
           await deleteFromStorage("banners", oldImage);
         }
         toast.success("Banner atualizado");
      } else {
        const { error } = await supabase.from("banners").insert([bannerData]);
        if (error) throw error;
        toast.success("Banner criado");
      }

      setEditDialogOpen(false);
      resetForm();
      fetchBanners();
     } catch (error) {
       const err = error as { message?: string };
       const msg = err?.message || "Erro ao salvar banner";
       console.error("Error saving banner:", error);
       toast.error(msg);
     } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBanner) return;

     try {
       const { error } = await supabase
         .from("banners")
         .delete()
         .eq("id", selectedBanner.id);

       if (error) throw error;

       // Remove imagem do storage
       await deleteFromStorage("banners", selectedBanner.image_url);

       toast.success("Banner removido");
       setDeleteDialogOpen(false);
       setSelectedBanner(null);
       fetchBanners();
     } catch (error) {
       const err = error as { message?: string };
       const msg = err?.message || "Erro ao excluir banner";
       console.error("Error deleting banner:", error);
       toast.error(msg);
     }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ active: !banner.active })
        .eq("id", banner.id);

      if (error) throw error;

      toast.success(banner.active ? "Banner desativado" : "Banner ativado");
      fetchBanners();
    } catch (error) {
      const err = error as { message?: string };
      const msg = err?.message || "Erro ao atualizar banner";
      console.error("Error toggling banner:", error);
      toast.error(msg);
    }
  };

  const moveOrder = async (banner: Banner, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];

    try {
      const { error: err1 } = await supabase
        .from("banners")
        .update({ sort_order: banner.sort_order })
        .eq("id", targetBanner.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("banners")
        .update({ sort_order: targetBanner.sort_order })
        .eq("id", banner.id);
      if (err2) throw err2;

      fetchBanners();
     } catch (error) {
       const err = error as { message?: string };
       const msg = err?.message || "Erro ao reordenar banners";
       console.error("Error reordering banners:", error);
       toast.error(msg);
     }
   };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Banners</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie os banners do carrossel da home</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Banner
        </Button>
      </div>

      {/* Banners Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 text-white/50">Nenhum banner cadastrado</p>
          <Button
            onClick={openCreateDialog}
            className="mt-4 rounded-xl bg-[#E30613] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro banner
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`group relative overflow-hidden rounded-xl border ${
                banner.active ? "border-white/[0.06]" : "border-white/[0.02] opacity-60"
              }`}
            >
              {/* Image or Icon */}
              <div
                className="aspect-[16/9] w-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: banner.image_url ? "transparent" : `${banner.accent_color || '#E30613'}15` }}
              >
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${banner.accent_color || '#E30613'}20`, color: banner.accent_color || '#E30613' }}
                  >
                    <span className="text-3xl font-bold">{(banner.icon_name || 'Wrench')[0]}</span>
                  </div>
                )}
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-montserrat text-lg font-bold text-white">
                      {banner.title || "Sem título"}
                    </h3>
                    {banner.subtitle && (
                      <p className="mt-1 text-xs text-white/70 line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.link && (
                      <p className="mt-1 text-xs truncate" style={{ color: banner.accent_color || '#E30613' }}>
                        {banner.link}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      banner.active
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {banner.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => moveOrder(banner, "up")}
                  disabled={index === 0}
                  className="flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveOrder(banner, "down")}
                  disabled={index === banners.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="absolute bottom-16 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEditDialog(banner)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <Edit className="h-4 w-4 text-white" />
                </button>
                <button
                  onClick={() => toggleActive(banner)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm transition-colors ${
                    banner.active
                      ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                      : "bg-green-500/20 hover:bg-green-500/30"
                  }`}
                >
                  {banner.active ? (
                    <X className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <Save className="h-4 w-4 text-green-400" />
                  )}
                </button>
                <button
                  onClick={() => openDeleteDialog(banner)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/20 backdrop-blur-sm transition-colors hover:bg-[#E30613]/30"
                >
                  <Trash2 className="h-4 w-4 text-[#E30613]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedBanner ? "Editar Banner" : "Novo Banner"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedBanner
                ? "Atualize as informações deste banner"
                : "Cadastre um novo banner para o carrossel da home"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Image Upload */}
            <div className="space-y-3">
              <Label className="text-white/70">
                Imagem {formData.icon_name ? "(opcional se usar ícone)" : "*"}
              </Label>
              <p className="text-[10px] text-white/40">
                Tamanho ideal: <strong className="text-white/60">1920x800px</strong> (proporção 2.4:1) · Formato WebP ou JPG · Máx. 200KB · Conteúdo importante no centro
              </p>

              {formImage ? (
                <div className="relative group">
                  <img
                    src={formImage}
                    alt="Preview"
                    className="aspect-[16/9] w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormImage("")}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#E30613]/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 transition-colors hover:border-white/20">
                  {uploading ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-white/30" />
                      <span className="mt-2 text-sm text-white/30">Clique para enviar</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/70">
                Título
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: CONSERTO DE ELETRODOMÉSTICOS"
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-white/70">
                Subtítulo
              </Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Ex: Linha branca, pequenos eletrodomésticos..."
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link" className="text-white/70">
                Link do Botão
              </Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="Ex: /servicos"
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order" className="text-white/70">
                Ordem
              </Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label htmlFor="icon_name" className="text-white/70">
                Ícone (quando não usa imagem)
              </Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger id="icon_name" className="rounded-xl border-white/10 bg-[#0f0f0f] text-white">
                  <SelectValue placeholder="Nenhum (usar imagem)" />
                </SelectTrigger>
                <SelectContent className="h-[300px] max-h-[300px] bg-[#0f0f0f] border-white/10 text-white" sideOffset={8}>
                  <SelectItem value="" className="pl-8">Nenhum (usar imagem)</SelectItem>
                  <SelectItem value="Wrench" className="pl-8">🔧 Wrench (Conserto)</SelectItem>
                  <SelectItem value="Cpu" className="pl-8">💻 Cpu (Eletrônica)</SelectItem>
                  <SelectItem value="Award" className="pl-8">🏆 Award (Garantia)</SelectItem>
                  <SelectItem value="Zap" className="pl-8">⚡ Zap (Energia)</SelectItem>
                  <SelectItem value="Settings" className="pl-8">⚙️ Settings (Config)</SelectItem>
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

            {/* Cor de Destaque */}
            <div className="space-y-2">
              <Label htmlFor="accent_color" className="text-white/70">
                Cor de Destaque
              </Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="accent_color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="#E30613"
                  className="flex-1 rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>
            </div>

            {/* Texto do Botão */}
            <div className="space-y-2">
              <Label htmlFor="cta_label" className="text-white/70">
                Texto do Botão
              </Label>
              <Input
                id="cta_label"
                value={formData.cta_label}
                onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                placeholder="Ex: Ver Serviços"
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.02]"
              />
              <Label htmlFor="active" className="text-white/70">
                Banner ativo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeDialog()}
                className="rounded-xl border-white/10 text-white/70"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || (!formImage && !formData.icon_name)}
                className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Banner</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir este banner? Esta ação não pode ser desfeita.
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
