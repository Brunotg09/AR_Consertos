"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  EyeOff,
  Wrench,
  Cpu,
  Edit,
  X,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
import { servicesData, ServiceItem } from "@/data/services";

interface HiddenService {
  id: number;
  service_id: string;
  hidden_at: string;
}

export default function ServicosAdminPage() {
  const [hiddenServices, setHiddenServices] = useState<HiddenService[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "convencional" | "inverter">("all");
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // Local edits (simulated with state - would need a services table for persistence)
  const [localEdits, setLocalEdits] = useState<Record<string, { description?: string; price?: string }>>({});

  const fetchHiddenServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("hidden_services")
        .select("*");

      if (error) throw error;
      setHiddenServices(data || []);
    } catch (error) {
      console.error("Error fetching hidden services:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHiddenServices();
  }, [fetchHiddenServices]);

  const isServiceHidden = (serviceId: string) => {
    return hiddenServices.some((h) => h.service_id === serviceId);
  };

  const filteredServices = servicesData.filter((service) => {
    const matchesType = typeFilter === "all" || service.type === typeFilter;
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.category.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const hideService = async (service: ServiceItem) => {
    try {
      const { error } = await supabase
        .from("hidden_services")
        .insert([{ service_id: service.id }]);

      if (error) throw error;

      setHiddenServices([...hiddenServices, { id: 0, service_id: service.id, hidden_at: new Date().toISOString() }]);
      toast.success(`Serviço "${service.name}" ocultado`);
      setHideDialogOpen(false);
    } catch (error) {
      console.error("Error hiding service:", error);
      toast.error("Erro ao ocultar serviço");
    }
  };

  const unhideService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from("hidden_services")
        .delete()
        .eq("service_id", serviceId);

      if (error) throw error;

      setHiddenServices(hiddenServices.filter((h) => h.service_id !== serviceId));
      toast.success("Serviço reativado");
    } catch (error) {
      console.error("Error unhiding service:", error);
      toast.error("Erro ao reativar serviço");
    }
  };

  const openEditDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setLocalEdits({
      ...localEdits,
      [service.id]: localEdits[service.id] || {
        description: service.description,
        price: "",
      },
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedService) return;

    // Save to local state (in a real app, this would save to a database)
    toast.success(`Serviço "${selectedService.name}" atualizado localmente`);
    setEditDialogOpen(false);
  };

  const saveLocalEdit = (field: "description" | "price", value: string) => {
    if (!selectedService) return;
    setLocalEdits({
      ...localEdits,
      [selectedService.id]: {
        ...localEdits[selectedService.id],
        [field]: value,
      },
    });
  };

  const getDisplayDescription = (service: ServiceItem) => {
    return localEdits[service.id]?.description || service.description;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-white">Serviços</h1>
        <p className="mt-1 text-sm text-white/50">Gerencie o catálogo de serviços</p>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-white">{servicesData.length}</p>
          <p className="text-sm text-white/50">Total de serviços</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-[#E30613]">
            {servicesData.filter((s) => s.type === "convencional").length}
          </p>
          <p className="text-sm text-white/50">Convencional</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4">
          <p className="text-2xl font-bold text-[#8B5CF6]">
            {servicesData.filter((s) => s.type === "inverter").length}
          </p>
          <p className="text-sm text-white/50">Inverter</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => {
          const isHidden = isServiceHidden(service.id);

          return (
            <div
              key={service.id}
              className={`group relative overflow-hidden rounded-xl border ${
                isHidden ? "border-red-500/20 opacity-60" : "border-white/[0.06]"
              } bg-[#0f0f0f]`}
            >
              {/* Type Badge */}
              <div className="absolute right-2 top-2 z-10">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    service.type === "inverter"
                      ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                      : "bg-[#E30613]/20 text-[#E30613]"
                  }`}
                >
                  {service.type}
                </span>
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
                  {getDisplayDescription(service)}
                </p>

                {/* Badge */}
                <div className="mt-3">
                  <span className="text-[10px] tracking-wide text-[#C9A84C]">
                    {service.badgeGarantia}
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

                  {isHidden ? (
                    <button
                      onClick={() => unhideService(service.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400 transition-colors hover:bg-green-500/30"
                      title="Reativar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedService(service);
                        setHideDialogOpen(true);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E30613]/20 text-[#E30613] transition-colors hover:bg-[#E30613]/30"
                      title="Ocultar"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Services Summary */}
      {hiddenServices.length > 0 && (
        <div className="rounded-xl border border-[#E30613]/20 bg-[#E30613]/10 p-4">
          <div className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-[#E30613]" />
            <span className="text-sm text-[#E30613]">
              {hiddenServices.length} serviço(s) ocultado(s)
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Serviços ocultados não aparecem no catálogo público.
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-white/[0.06] bg-[#0f0f0f]">
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
                  <span className="text-xs text-white/50">{selectedService.category}</span>
                </div>
                <h3 className="mt-2 font-montserrat text-lg font-bold text-white">
                  {selectedService.name}
                </h3>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Descrição</Label>
                <Textarea
                  value={localEdits[selectedService.id]?.description || selectedService.description}
                  onChange={(e) => saveLocalEdit("description", e.target.value)}
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Preço Base (opcional)</Label>
                <Input
                  value={localEdits[selectedService.id]?.price || ""}
                  onChange={(e) => saveLocalEdit("price", e.target.value)}
                  placeholder="Preço definido ao executar"
                  className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                />
              </div>

              <div className="rounded-lg bg-yellow-500/10 p-3">
                <p className="text-xs text-yellow-400">
                  Nota: Edições locais são mantidas apenas nesta sessão. Para persistência real,
                  crie uma tabela de serviços personalizados no Supabase.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hide Confirmation */}
      <AlertDialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <AlertDialogContent className="border-white/[0.06] bg-[#0f0f0f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Ocultar Serviço</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja ocultar &quot;{selectedService?.name}&quot;? Ele não aparecerá
              mais no catálogo público.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-white/70">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedService && hideService(selectedService)}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              Ocultar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
