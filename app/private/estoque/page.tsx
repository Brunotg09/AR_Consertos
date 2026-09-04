"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Upload,
  ImageIcon,
  Package,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressImageToWebP, deleteFromStorage, scanAndCleanStorage, processPendingImages } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  cost_price: number | null;
  margin_percentage: number | null;
  discount_percentage: number | null;
  stock: number;
  condition: string | null;
  images: string[] | null;
  active: boolean;
  created_at: string;
}

const PRODUCT_CONDITIONS = ["novo", "usado", "recondicionado"];

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    cost_price: "",
    margin_percentage: "0",
    discount_percentage: "0",
    stock: "",
    condition: "",
    active: true,
  });
  const [formImages, setFormImages] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const lowStockProducts = products.filter((p) => p.stock < 3 && p.active);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      price: "",
      cost_price: "",
      margin_percentage: "0",
      discount_percentage: "0",
      stock: "",
      condition: "",
      active: true,
    });
    setFormImages([]);
    setPendingFiles([]);
    setPreviews(new Map());
    setSelectedProduct(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const closeDialog = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(new Map());
    setPendingFiles([]);
    setEditDialogOpen(false);
    resetForm();
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "",
      description: product.description || "",
      price: product.price.toString(),
      cost_price: product.cost_price?.toString() || "",
      margin_percentage: product.margin_percentage?.toString() || "0",
      discount_percentage: product.discount_percentage?.toString() || "0",
      stock: product.stock.toString(),
      condition: product.condition || "",
      active: product.active,
    });
    setFormImages(product.images || []);
    setPendingFiles([]);
    setPreviews(new Map());
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
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
    setFormImages((prev) => prev.filter((_, i) => i !== index));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const finalImages = await processPendingImages(
        supabase, "products", "products", pendingFiles, formImages
      );

      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews(new Map());
      setPendingFiles([]);

      const price = formData.price ? parseFloat(formData.price) : 0;
      const costPrice = formData.cost_price ? parseFloat(formData.cost_price) : 0;
      const discountPct = formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0;

      // Always use manual price as the selling price
      const finalPriceValue = price;

      // Auto-calculate margin from price and cost
      const autoMargin = costPrice > 0 && price > 0 ? ((price - costPrice) / costPrice) * 100 : 0;

      const productData = {
        name: formData.name,
        category: formData.category || null,
        description: formData.description || null,
        price: finalPriceValue,
        cost_price: costPrice,
        margin_percentage: Math.round(autoMargin),
        discount_percentage: Math.round(discountPct),
        stock: parseInt(formData.stock, 10),
        condition: formData.condition || null,
        images: finalImages.length > 0 ? finalImages : null,
        active: formData.active,
      };

      if (selectedProduct) {
        // Update
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", selectedProduct.id);
        if (error) throw error;

        // Remove imagens antigas que nao estao mais no formulario
        const oldImages = selectedProduct.images || [];
        const keptImages = finalImages;
        const imagesToDelete = oldImages.filter((img) => !keptImages.includes(img));
        for (const img of imagesToDelete) {
          await deleteFromStorage(supabase, "products", img);
        }
        toast.success("Produto atualizado com sucesso");
      } else {
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
        toast.success("Produto criado com sucesso");
      }

      closeDialog();
      fetchProducts();
    } catch (error) {
      const err = error as { message?: string };
      const msg = err?.message || "Erro ao salvar produto";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", selectedProduct.id);
      if (error) throw error;

      // Remove imagens do storage
      const imgs = selectedProduct.images || [];
      for (const img of imgs) {
        await deleteFromStorage(supabase, "products", img);
      }

      toast.success(`Produto "${selectedProduct.name}" excluído`);
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      const err = error as { message?: string };
      const msg = err?.message || "Erro ao excluir produto";
      toast.error(msg);
    }
  };

  const scanStorage = async () => {
    setScanning(true);
    try {
      const allUrls = products.flatMap((p) => p.images || []);
      const removed = await scanAndCleanStorage(supabase, "products", "products", allUrls);
      if (removed === 0) {
        toast.success("Varredura OK: nenhuma imagem órfã encontrada.");
      } else {
        toast.success(`Varredura: ${removed} imagem(ns) órfã(s) removida(s).`);
      }
    } catch (error) {
      toast.error("Erro ao varrer storage de produtos.");
    } finally {
      setScanning(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Estoque</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie seus produtos</p>
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
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[#E30613]/20 bg-[#E30613]/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#E30613]" />
          <div>
            <p className="font-medium text-[#E30613]">Estoque baixo!</p>
            <p className="text-sm text-white/70">
              {lowStockProducts.length} produto(s) com menos de 3 unidades em estoque:{" "}
              {lowStockProducts.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produtos..."
          className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white placeholder:text-white/30"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="p-4 text-xs font-medium text-white/50">Produto</th>
                <th className="p-4 text-xs font-medium text-white/50">Categoria</th>
                <th className="p-4 text-xs font-medium text-white/50">Preço</th>
                <th className="p-4 text-xs font-medium text-white/50">Estoque</th>
                <th className="p-4 text-xs font-medium text-white/50">Condição</th>
                <th className="p-4 text-xs font-medium text-white/50">Status</th>
                <th className="p-4 text-xs font-medium text-white/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/50">
                    Carregando...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/50">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                            <Package className="h-5 w-5 text-white/30" />
                          </div>
                        )}
                        <span className="font-medium text-white">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-white/70">{product.category || "-"}</td>
                    <td className="p-4 text-sm font-medium text-white">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.stock < 3
                            ? "bg-[#E30613]/20 text-[#E30613]"
                            : product.stock < 10
                            ? "bg-[#C9A84C]/20 text-[#C9A84C]"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {product.stock} un.
                      </span>
                    </td>
                    <td className="p-4 text-sm text-white/70 capitalize">
                      {product.condition || "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditDialog(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                        >
                          <Edit className="h-4 w-4 text-white/70" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(product)}
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
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedProduct
                ? "Atualize as informações deste produto"
                : "Cadastre um novo produto no estoque"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Images */}
            <div className="space-y-3">
              <Label className="text-white/70">Imagens</Label>
              <div
                className={`flex flex-wrap gap-3 ${dragOver ? "rounded-lg ring-2 ring-[#E30613]/60 p-1" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {formImages.map((img, index) => (
                  <div key={`old-${index}`} className="relative">
                    <Image
                      src={img}
                      alt={`Imagem ${index + 1}`}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E30613]"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div key={`new-${index}`} className="relative">
                    <img
                      src={previews.get(file)}
                      alt={`Nova ${index + 1}`}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <span className="absolute bottom-0 left-0 rounded bg-emerald-500/80 px-1 py-0.5 text-[7px] text-white">NOVA</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E30613]"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/10 transition-colors hover:border-white/20">
                  <Upload className="h-5 w-5 text-white/30" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-white/40">Arraste e solte ou clique · WebP ao salvar · Máx. 200KB</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70">
                  Nome *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-white/70">
                  Categoria
                </Label>
                <CategoryCombobox
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  categories={allCategories}
                  placeholder="Selecione ou digite uma categoria..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/70">
                Descrição
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-white/70">
                  Preço de Venda *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="Digitado ou calculado"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-white/70">
                  Estoque *
                </Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition" className="text-white/70">
                  Condição
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                >
                  <SelectTrigger className="rounded-xl border-white/10 bg-white/[0.02] text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {PRODUCT_CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond} className="capitalize text-white">
                        {cond}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost / Margin / Discount — Admin only */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#C9A84C]" />
                <span className="text-xs font-medium text-white/70">Gestão de Custos e Margem (Admin)</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="text-white/70">
                    Valor de Custo (R$)
                  </Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margin_percentage" className="text-white/70">
                    % de Margem
                  </Label>
                  <Input
                    id="margin_percentage"
                    type="number"
                    min="0"
                    max="9999"
                    placeholder="0"
                    value={formData.margin_percentage}
                    onChange={(e) => setFormData({ ...formData, margin_percentage: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_percentage" className="text-white/70">
                    % de Desconto
                  </Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>

              {/* Computed breakdown */}
              {(formData.price && !isNaN(parseFloat(formData.price))) || (formData.cost_price && !isNaN(parseFloat(formData.cost_price))) ? (
                <div className="border-t border-white/[0.06] pt-3 space-y-2 text-sm">
                  {(() => {
                    const price = parseFloat(formData.price) || 0;
                    const cost = parseFloat(formData.cost_price) || 0;
                    const discount = parseFloat(formData.discount_percentage) || 0;

                    // Auto-calculate margin from price and cost
                    const autoMargin = cost > 0 && price > 0 ? ((price - cost) / cost) * 100 : 0;
                    const marginDisplay = cost > 0 && price > 0 ? autoMargin : (parseFloat(formData.margin_percentage) || 0);

                    const discountValue = price * (discount / 100);
                    const priceWithDiscount = price - discountValue;
                    const profit = cost > 0 ? price - cost : 0;

                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-white/50">Preço de Venda:</span>
                          <span className="text-white font-medium">{formatCurrency(price)}</span>
                        </div>
                        {cost > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-white/50">Valor de Custo:</span>
                              <span className="text-white font-medium">{formatCurrency(cost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Margem Calculada:</span>
                              <span className="text-[#8B5CF6] font-medium">{autoMargin > 0 ? `${autoMargin.toFixed(1)}%` : "—"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Lucro (Preço - Custo):</span>
                              <span className="text-green-400 font-medium">{formatCurrency(profit)}</span>
                            </div>
                          </>
                        )}
                        {discount > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-white/50">Desconto ({discount}%):</span>
                              <span className="text-[#C9A84C] font-medium">- {formatCurrency(discountValue)}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/[0.04] pt-1">
                              <span className="text-white/70 font-medium">Preço com Desconto:</span>
                              <span className="text-[#E30613] font-bold">{formatCurrency(priceWithDiscount)}</span>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : null}
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
                Produto ativo
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
                disabled={saving}
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
            <AlertDialogTitle className="text-white">Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir &quot;{selectedProduct?.name}&quot;? Esta ação não pode
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
