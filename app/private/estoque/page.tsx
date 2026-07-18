"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
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
      console.error("Error fetching products:", error);
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

  const lowStockProducts = products.filter((p) => p.stock < 3 && p.active);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      price: "",
      stock: "",
      condition: "",
      active: true,
    });
    setFormImages([]);
    setSelectedProduct(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "",
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      condition: product.condition || "",
      active: product.active,
    });
    setFormImages(product.images || []);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setFormImages([...formImages, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormImages(formImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        category: formData.category || null,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        condition: formData.condition || null,
        images: formImages.length > 0 ? formImages : null,
        active: formData.active,
      };

      if (selectedProduct) {
        // Update
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", selectedProduct.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
      }

      setEditDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Erro ao salvar produto");
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

      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Erro ao excluir produto");
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
        <Button
          onClick={openCreateDialog}
          className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
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
                          <img
                            src={product.images[0]}
                            alt={product.name}
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Images */}
            <div className="space-y-3">
              <Label className="text-white/70">Imagens</Label>
              <div className="flex flex-wrap gap-3">
                {formImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img}
                      alt={`Imagem ${index + 1}`}
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
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/10 transition-colors hover:border-white/20">
                  {uploading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                  ) : (
                    <Upload className="h-5 w-5 text-white/30" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
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
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
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
                  Preço *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
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
