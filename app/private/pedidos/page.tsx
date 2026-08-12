"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Wrench,
  Package,
  User,
  Phone,
  Mail,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  QrCode,
  Camera,
  Upload,
  ImagePlus,
} from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useServices } from "@/hooks/useServices";
import { generateOSPDF, generateSingleItemOSPDF, PDFCliente, PDFOrder, PDFOrderItem } from "@/lib/generateOSPDF";

// Types
interface Cliente {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  endereco: { cidade?: string; estado?: string } | null;
  user_id: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  condition: string | null;
  images: string[] | null;
}

interface OrderItem {
  id: number;
  order_id: string;
  item_type: "servico" | "produto";
  item_id: string;
  item_name: string;
  service_type: "convencional" | "inverter" | null;
  quantity: number;
  price: number | null;
  payment_method: string | null;
  payment_status: string;
  status: string;
  payments: { date: string; amount: number; method: string; note?: string }[];
  amount_paid: number;
  scheduled_date: string | null;
  problem_description: string | null;
  diagnosis: string | null;
  completed_at: string | null;
  warranty_expires_at: string | null;
  product_category: string | null;
  product_condition: string | null;
  product_images: string[] | null;
  teste_equipamento_ligado?: boolean;
  teste_funcao_principal?: boolean;
  teste_funcoes_secundarias?: boolean;
  teste_pecas_substituidas?: boolean;
  teste_funcionando_normalmente?: boolean;
  entrega_equipamento_entregue?: boolean;
  entrega_acessorios_conferidos?: boolean;
  entrega_equipamento_testado?: boolean;
  entrega_pagamento_registrado?: boolean;
  entrega_os_enviada?: boolean;
  entrega_garantia_disponibilizada?: boolean;
  entrega_data?: string | null;
  entrega_hora?: string | null;
}

interface Order {
  id: string;
  cliente_id: number | null;
  user_id: string | null;
  status: string;
  payment_method: string | null;
  payment_confirmed: boolean;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  items?: OrderItem[];
}

// WhatsApp notification simulator
function sendWhatsAppNotification(phone: string | null, message: string) {
  const timestamp = new Date().toISOString();
  console.log("=".repeat(60));
  console.log(`[WhatsApp Simulation] ${timestamp}`);
  console.log(`To: ${phone || "N/A"}`);
  console.log(`Message: ${message}`);
  console.log("=".repeat(60));

  toast.success("Notificação WhatsApp simulada", {
    description: `Mensagem seria enviada para ${phone || "cliente"}`,
  });
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "servico" | "produto">("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Dialogs
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteOrderDialogOpen, setDeleteOrderDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [completeServiceDialogOpen, setCompleteServiceDialogOpen] = useState(false);

  // Selected items
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);

  // Form states
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [newClientForm, setNewClientForm] = useState({ nome: "", telefone: "", email: "" });
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [orderItems, setOrderItems] = useState<{
    type: "servico" | "produto";
    id: string;
    name: string;
    serviceType?: "convencional" | "inverter";
    quantity: number;
    price: number | null;
    productStock?: number;
  }[]>([]);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderScheduledDate, setOrderScheduledDate] = useState("");

  const [saving, setSaving] = useState(false);

  // Services from Supabase
  const { services: servicesData } = useServices({ activeOnly: true });

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // Complete service form
  const [serviceDiagnosis, setServiceDiagnosis] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [testeFinal, setTesteFinal] = useState<{
    equipamentoLigado: boolean;
    funcaoPrincipal: boolean;
    funcoesSecundarias: boolean;
    pecasSubstituidas: boolean;
    funcionandoNormalmente: boolean;
  }>({
    equipamentoLigado: false,
    funcaoPrincipal: false,
    funcoesSecundarias: false,
    pecasSubstituidas: false,
    funcionandoNormalmente: false,
  });

  const [entregaEquipamento, setEntregaEquipamento] = useState<{
    equipamentoEntregue: boolean;
    acessoriosConferidos: boolean;
    equipamentoTestado: boolean;
    pagamentoRegistrado: boolean;
    osEnviada: boolean;
    garantiaDisponibilizada: boolean;
    dataEntrega: string;
    horaEntrega: string;
  }>({
    equipamentoEntregue: false,
    acessoriosConferidos: false,
    equipamentoTestado: false,
    pagamentoRegistrado: false,
    osEnviada: false,
    garantiaDisponibilizada: false,
    dataEntrega: "",
    horaEntrega: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          *,
          cliente:clientes(id, nome, telefone, email, cpf, endereco)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orderIds = (ordersData || []).map((o) => o.id);

      let allItems: OrderItem[] = [];
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);
        allItems = itemsData || [];
      }

      const ordersWithItems = (ordersData || []).map((order) => ({
        ...order,
        items: allItems.filter((item) => item.order_id === order.id),
      }));

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const result = await withTimeout(
        () => supabase
          .from("clientes")
          .select("id, nome, telefone, email, cpf, endereco, user_id")
          .order("nome"),
        8000,
        { data: [], error: null }
      );
      setClientes(result.data || []);
    } catch {
      setClientes([]);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      const { data } = await withTimeout(
        () => supabase
          .from("products")
          .select("id, name, price, stock, category, condition, images")
          .eq("active", true)
          .order("name"),
        8000,
        { data: null, error: null }
      );
      setProducts(data || []);
    } catch {
      setProducts([]);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const { data } = await withTimeout(
        () => supabase
          .from("profiles")
          .select("id, full_name, phone"),
        8000,
        { data: null, error: null }
      );
      setProfiles(data || []);
    } catch {
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchClientes();
    fetchProductos();
    fetchProfiles();
  }, [fetchOrders, fetchClientes, fetchProductos, fetchProfiles]);

  // Filtered lists
  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      order.id.toLowerCase().includes(searchLower) ||
      order.cliente?.nome?.toLowerCase().includes(searchLower) ||
      order.cliente?.telefone?.includes(search) ||
      order.cliente?.email?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;
    if (typeFilter === "all") return true;

    const hasServico = (order.items || []).some((i) => i.item_type === "servico");
    const hasProduto = (order.items || []).some((i) => i.item_type === "produto");

    if (typeFilter === "servico") return hasServico;
    if (typeFilter === "produto") return hasProduto;
    return true;
  });

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.telefone?.includes(clientSearch) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProfiles = profiles.filter((p) =>
    (p.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
     p.phone?.includes(clientSearch))
  );

  const selectProfileAsClient = (profile: { id: string; full_name: string; phone: string | null }) => {
    const existing = clientes.find((c) => c.user_id === profile.id);
    if (existing) {
      setSelectedCliente(existing);
    } else {
      setSelectedCliente({
        id: 0,
        nome: profile.full_name,
        telefone: profile.phone,
        email: null,
        cpf: null,
        endereco: null,
        user_id: profile.id,
      });
    }
    setClientSearch("");
  };

  const filteredServices = servicesData.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.category?.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      aguardando_orcamento: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      orcamento_enviado: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      confirmado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      pronta: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      entregue: "bg-teal-500/20 text-teal-400 border-teal-500/30",
      concluido: "bg-green-500/20 text-green-400 border-green-500/30",
      cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      aguardando_orcamento: "Aguardando Orçamento",
      orcamento_enviado: "Orçamento Enviado",
      confirmado: "Confirmado",
      em_andamento: "Em Andamento",
      pronta: "Pronta",
      entregue: "Entregue",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  const STATUS_FLOW = [
    "pendente",
    "aguardando_orcamento",
    "orcamento_enviado",
    "confirmado",
    "em_andamento",
    "pronta",
    "entregue",
    "concluido",
  ] as const;

  const FINALIZED_STATUSES = ["concluido", "cancelado", "confirmado", "pronta", "entregue"];

  const getItemBorderColor = (item: OrderItem) => {
    if (item.item_type === "produto") return "border-l-[#C9A84C]";
    if (item.service_type === "inverter") return "border-l-[#8B5CF6]";
    return "border-l-[#E30613]";
  };

  const getPaymentSummary = (items: OrderItem[]) => {
    let totalPago = 0;
    let totalPendente = 0;

    items.forEach((item) => {
      const price = item.price || 0;
      if (item.payment_status === "pago") {
        totalPago += price * item.quantity;
      } else {
        totalPago += item.amount_paid || 0;
        totalPendente += (price * item.quantity) - (item.amount_paid || 0);
      }
    });

    return { totalPago, totalPendente };
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      const oldStatus = order?.status;

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Handle stock for products when confirming
      if (newStatus === "confirmado" && order?.items) {
        for (const item of order.items) {
          if (item.item_type === "produto") {
            await supabase.rpc("managed_decrement_stock", {
              product_id: parseInt(item.item_id),
              qty: item.quantity
            });
          }
        }
      }

      // WhatsApp notifications
      if ((newStatus === "em_andamento" || newStatus === "concluido") && order?.cliente) {
        const statusMsg = newStatus === "em_andamento"
          ? `Olá! Seu aparelho ${order.items?.[0]?.item_name || "está em manutenção"} está em andamento. Em breve entraremos em contato com mais detalhes.`
          : `Olá! Seu aparelho ${order.items?.[0]?.item_name || "está pronto"} está pronto! Pode retirar quando quiser.`;
        sendWhatsAppNotification(order.cliente.telefone, statusMsg);
      }

      toast.success(`Status atualizado para ${getStatusLabel(newStatus)}`);
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const updateItemStatus = async (item: OrderItem, newStatus: string) => {
    try {
      const updates: Record<string, any> = { status: newStatus };

      if (newStatus === "concluido" && !item.completed_at) {
        const completedAt = new Date();
        const warrantyExpires = new Date(completedAt);
        warrantyExpires.setDate(warrantyExpires.getDate() + 90);
        updates.completed_at = completedAt.toISOString();
        updates.warranty_expires_at = warrantyExpires.toISOString();
      }

      const { error } = await supabase
        .from("order_items")
        .update(updates)
        .eq("id", item.id);

      if (error) throw error;

      // Update order status based on all items — use LOWEST status
      const order = orders.find((o) => o.id === item.order_id);
      if (order?.items) {
        const updatedItems = order.items.map((i) =>
          i.id === item.id ? { ...i, status: newStatus } : i
        );
        
        const statusPriority = [...STATUS_FLOW] as string[];
        
        // Filter out cancelled items
        const activeItems = updatedItems.filter((i) => i.status !== "cancelado");
        const allCancelled = activeItems.length === 0;
        
        let orderStatus = "pendente";
        
        if (allCancelled) {
          orderStatus = "cancelado";
        } else {
          // Use LOWEST status among active items
          orderStatus = "concluido";
          for (const currItem of activeItems) {
            const itemStatus = currItem.status || "pendente";
            if (statusPriority.indexOf(itemStatus) < statusPriority.indexOf(orderStatus)) {
              orderStatus = itemStatus;
            }
          }
        }

        await supabase
          .from("orders")
          .update({ status: orderStatus, updated_at: new Date().toISOString() })
          .eq("id", item.order_id);
      }

      toast.success(`Item atualizado para ${getStatusLabel(newStatus)}`);
      fetchOrders();
    } catch (error) {
      console.error("Error updating item status:", error);
      toast.error("Erro ao atualizar status do item");
    }
  };

  // Create order
  const addServiceToOrder = (service: typeof servicesData[0]) => {
    setOrderItems([
      ...orderItems,
      {
        type: "servico",
        id: service.service_id,
        name: service.name,
        serviceType: service.type,
        quantity: 1,
        price: service.price || null,
      },
    ]);
    setServiceSearch("");
  };

  const addProductToOrder = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Produto sem estoque");
      return;
    }
    setOrderItems([
      ...orderItems,
      {
        type: "produto",
        id: product.id.toString(),
        name: product.name,
        quantity: 1,
        price: product.price,
        productStock: product.stock,
      },
    ]);
    setProductSearch("");
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const parseItemsInput = (text: string, type: "servico" | "produto") => {
    if (!text.trim()) return;
    const parts = text.split(/[,\/]/).map((s) => s.trim()).filter(Boolean);
    const newItems: typeof orderItems = parts.map((name) => ({
      type,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      quantity: 1,
      price: null,
    }));
    setOrderItems([...orderItems, ...newItems]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const item = orderItems[index];
    if (item.type === "produto" && item.productStock && quantity > item.productStock) {
      toast.error(`Máximo disponível: ${item.productStock}`);
      return;
    }
    setOrderItems(
      orderItems.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const handleCreateOrder = async () => {
    if (!selectedCliente && !showNewClientForm) {
      toast.error("Selecione ou cadastre um cliente");
      return;
    }
    if (orderItems.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setSaving(true);
    try {
      let clienteId = selectedCliente?.id;
      let userId = selectedCliente?.user_id || null;

      // Create new client if needed (from form or from profile)
      if (!clienteId || clienteId === 0) {
        const clientData = clienteId === 0
          ? { nome: selectedCliente!.nome, telefone: selectedCliente!.telefone, user_id: selectedCliente!.user_id }
          : { nome: newClientForm.nome, telefone: newClientForm.telefone || null, email: newClientForm.email || null };

        const { data: newClient, error: clientError } = await supabase
          .from("clientes")
          .insert([clientData])
          .select("id")
          .single();

        if (clientError) throw clientError;
        clienteId = newClient.id;
      }

      // Calculate total
      const total = orderItems.reduce((sum, item) => {
        if (item.type === "produto" && item.price) {
          return sum + item.price * item.quantity;
        }
        return sum;
      }, 0);

      // Create order with both cliente_id and user_id
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          cliente_id: clienteId,
          user_id: userId,
          status: "pendente",
          payment_method: orderPaymentMethod || null,
          total,
          notes: orderNotes || null,
        }])
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create custom services/products in DB and get real IDs
      const resolvedItems: typeof orderItems = [];
      for (const item of orderItems) {
        if (item.id.startsWith("custom-")) {
          if (item.type === "servico") {
            const serviceId = `svc_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const { data: newService, error: svcError } = await supabase
              .from("services")
              .insert([{
                service_id: serviceId,
                name: item.name,
                type: "convencional",
                active: false,
              }])
              .select("service_id")
              .single();
            if (svcError) throw svcError;
            resolvedItems.push({ ...item, id: newService.service_id });
          } else {
            const { data: newProduct, error: prodError } = await supabase
              .from("products")
              .insert([{
                name: item.name,
                price: 0,
                stock: 0,
                active: false,
              }])
              .select("id")
              .single();
            if (prodError) throw prodError;
            resolvedItems.push({ ...item, id: newProduct.id.toString() });
          }
        } else {
          resolvedItems.push(item);
        }
      }

      // Create order items
      const itemsToInsert = resolvedItems.map((item) => ({
        order_id: order.id,
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        service_type: item.serviceType || null,
        quantity: item.quantity,
        price: item.price,
        payment_method: orderPaymentMethod || null,
        payment_status: "pendente",
        amount_paid: 0,
        product_category: item.type === "produto" ? products.find(p => p.id.toString() === item.id)?.category : null,
        product_condition: item.type === "produto" ? products.find(p => p.id.toString() === item.id)?.condition : null,
        scheduled_date: orderScheduledDate || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Decrement stock for products
      for (const item of resolvedItems) {
        if (item.type === "produto") {
          await supabase.rpc("managed_decrement_stock", {
            product_id: parseInt(item.id),
            qty: item.quantity
          });
        }
      }

      toast.success("Pedido criado com sucesso");
      setNewOrderDialogOpen(false);
      resetNewOrderForm();
      fetchOrders();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao criar pedido");
    } finally {
      setSaving(false);
    }
  };

  const resetNewOrderForm = () => {
    setSelectedCliente(null);
    setClientSearch("");
    setNewClientForm({ nome: "", telefone: "", email: "" });
    setShowNewClientForm(false);
    setServiceSearch("");
    setProductSearch("");
    setOrderItems([]);
    setOrderPaymentMethod("");
    setOrderNotes("");
    setOrderScheduledDate("");
  };

  // Payment handling
  const openPaymentDialog = (order: Order, item: OrderItem) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setPaymentAmount("");
    setPaymentMethod("");
    setPaymentNote("");
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedItem || !selectedOrder) return;

    const maxPayment = (selectedItem.price || 0) * selectedItem.quantity - (selectedItem.amount_paid || 0);
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (amount > maxPayment) {
      toast.error(`Valor máximo: ${formatCurrency(maxPayment)}`);
      return;
    }

    if (!paymentMethod) {
      toast.error("Selecione o método de pagamento");
      return;
    }

    try {
      const newPayment = {
        date: new Date().toISOString(),
        amount,
        method: paymentMethod,
        note: paymentNote || undefined,
      };

      const newPayments = [...(selectedItem.payments || []), newPayment];
      const newAmountPaid = (selectedItem.amount_paid || 0) + amount;
      const totalPrice = (selectedItem.price || 0) * selectedItem.quantity;
      const newPaymentStatus = newAmountPaid >= totalPrice ? "pago" : "pago_parcial";

      const { error } = await supabase
        .from("order_items")
        .update({
          payments: newPayments,
          amount_paid: newAmountPaid,
          payment_status: newPaymentStatus,
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      toast.success("Pagamento registrado");
      setPaymentDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Erro ao registrar pagamento");
    }
  };

  // Complete service
  const openCompleteServiceDialog = (order: Order, item: OrderItem) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setServiceDiagnosis(item.diagnosis || "");
    setServicePrice(item.price?.toString() || "");
    setServicePhotos(item.product_images || []);

    if (item.completed_at) {
      setTesteFinal({
        equipamentoLigado: item.teste_equipamento_ligado || false,
        funcaoPrincipal: item.teste_funcao_principal || false,
        funcoesSecundarias: item.teste_funcoes_secundarias || false,
        pecasSubstituidas: item.teste_pecas_substituidas || false,
        funcionandoNormalmente: item.teste_funcionando_normalmente || false,
      });
      setEntregaEquipamento({
        equipamentoEntregue: item.entrega_equipamento_entregue || false,
        acessoriosConferidos: item.entrega_acessorios_conferidos || false,
        equipamentoTestado: item.entrega_equipamento_testado || false,
        pagamentoRegistrado: item.entrega_pagamento_registrado || false,
        osEnviada: item.entrega_os_enviada || false,
        garantiaDisponibilizada: item.entrega_garantia_disponibilizada || false,
        dataEntrega: item.entrega_data || "",
        horaEntrega: item.entrega_hora || "",
      });
    } else {
      setTesteFinal({
        equipamentoLigado: false,
        funcaoPrincipal: false,
        funcoesSecundarias: false,
        pecasSubstituidas: false,
        funcionandoNormalmente: false,
      });
      setEntregaEquipamento({
        equipamentoEntregue: false,
        acessoriosConferidos: false,
        equipamentoTestado: false,
        pagamentoRegistrado: false,
        osEnviada: false,
        garantiaDisponibilizada: false,
        dataEntrega: new Date().toISOString().split("T")[0],
        horaEntrega: new Date().toTimeString().slice(0, 5),
      });
    }

    setCompleteServiceDialogOpen(true);
  };

  // Save diagnosis/price/photos WITHOUT completing
  const handleSaveServiceDetails = async () => {
    if (!selectedItem || !selectedOrder) return;

    if (!serviceDiagnosis.trim()) {
      toast.error("Preencha o diagnóstico");
      return;
    }

    if (!servicePrice || parseFloat(servicePrice) <= 0) {
      toast.error("Preencha o preço do serviço");
      return;
    }

    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          diagnosis: serviceDiagnosis,
          price: parseFloat(servicePrice),
          product_images: servicePhotos.length > 0 ? servicePhotos : null,
          teste_equipamento_ligado: testeFinal.equipamentoLigado,
          teste_funcao_principal: testeFinal.funcaoPrincipal,
          teste_funcoes_secundarias: testeFinal.funcoesSecundarias,
          teste_pecas_substituidas: testeFinal.pecasSubstituidas,
          teste_funcionando_normalmente: testeFinal.funcionandoNormalmente,
          entrega_equipamento_entregue: entregaEquipamento.equipamentoEntregue,
          entrega_acessorios_conferidos: entregaEquipamento.acessoriosConferidos,
          entrega_equipamento_testado: entregaEquipamento.equipamentoTestado,
          entrega_pagamento_registrado: entregaEquipamento.pagamentoRegistrado,
          entrega_os_enviada: entregaEquipamento.osEnviada,
          entrega_garantia_disponibilizada: entregaEquipamento.garantiaDisponibilizada,
          entrega_data: entregaEquipamento.dataEntrega || null,
          entrega_hora: entregaEquipamento.horaEntrega || null,
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      // Update order total
      const orderTotal = (selectedOrder.items || [])
        .filter(i => i.id !== selectedItem.id)
        .reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
        + parseFloat(servicePrice) * selectedItem.quantity;

      await supabase
        .from("orders")
        .update({ total: orderTotal })
        .eq("id", selectedOrder.id);

      toast.success("Dados salvos com sucesso");
      setCompleteServiceDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error saving service details:", error);
      toast.error("Erro ao salvar dados");
    }
  };

  // Complete service (mark as done)
  const handleCompleteService = async () => {
    if (!selectedItem || !selectedOrder) return;

    if (!serviceDiagnosis.trim()) {
      toast.error("Preencha o diagnóstico antes de concluir");
      return;
    }

    if (!servicePrice || parseFloat(servicePrice) <= 0) {
      toast.error("Preencha o preço antes de concluir");
      return;
    }

    try {
      const completedAt = new Date();
      const warrantyExpires = new Date(completedAt);
      warrantyExpires.setDate(warrantyExpires.getDate() + 90);

      const { error } = await supabase
        .from("order_items")
        .update({
          diagnosis: serviceDiagnosis,
          price: parseFloat(servicePrice),
          product_images: servicePhotos.length > 0 ? servicePhotos : null,
          completed_at: completedAt.toISOString(),
          warranty_expires_at: warrantyExpires.toISOString(),
          teste_equipamento_ligado: testeFinal.equipamentoLigado,
          teste_funcao_principal: testeFinal.funcaoPrincipal,
          teste_funcoes_secundarias: testeFinal.funcoesSecundarias,
          teste_pecas_substituidas: testeFinal.pecasSubstituidas,
          teste_funcionando_normalmente: testeFinal.funcionandoNormalmente,
          entrega_equipamento_entregue: entregaEquipamento.equipamentoEntregue,
          entrega_acessorios_conferidos: entregaEquipamento.acessoriosConferidos,
          entrega_equipamento_testado: entregaEquipamento.equipamentoTestado,
          entrega_pagamento_registrado: entregaEquipamento.pagamentoRegistrado,
          entrega_os_enviada: entregaEquipamento.osEnviada,
          entrega_garantia_disponibilizada: entregaEquipamento.garantiaDisponibilizada,
          entrega_data: entregaEquipamento.dataEntrega || null,
          entrega_hora: entregaEquipamento.horaEntrega || null,
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      // Update order total
      const orderTotal = (selectedOrder.items || [])
        .filter(i => i.id !== selectedItem.id)
        .reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
        + parseFloat(servicePrice) * selectedItem.quantity;

      await supabase
        .from("orders")
        .update({ total: orderTotal })
        .eq("id", selectedOrder.id);

      toast.success("Serviço concluído com sucesso");
      setCompleteServiceDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error completing service:", error);
      toast.error("Erro ao concluir serviço");
    }
  };

  // Upload photo for service
  const handleUploadServicePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (servicePhotos.length >= 4) {
      toast.error("Máximo de 4 fotos por serviço");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const filePath = `service-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setServicePhotos([...servicePhotos, urlData.publicUrl]);
        toast.success("Foto adicionada");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemoveServicePhoto = (index: number) => {
    setServicePhotos(servicePhotos.filter((_, i) => i !== index));
  };

  // Delete handlers
  const openDeleteOrderDialog = (order: Order) => {
    setSelectedOrder(order);
    setDeleteOrderDialogOpen(true);
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Restore stock for products
      for (const item of selectedOrder.items || []) {
        if (item.item_type === "produto") {
          await supabase.rpc("managed_increment_stock", {
            product_id: parseInt(item.item_id),
            qty: item.quantity
          });
        }
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Pedido removido");
      setDeleteOrderDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Erro ao remover pedido");
    }
  };

  const formatAddress = (addr: unknown): string | null => {
    if (!addr) return null;
    if (typeof addr === "string") return addr;
    const a = addr as Record<string, string>;
    const parts = [a.rua, a.numero, a.bairro, a.cidade, a.estado].filter(Boolean);
    const cep = a.cep ? `CEP: ${a.cep}` : null;
    return [...parts, cep].filter(Boolean).join(", ") || null;
  };

  const handlePrintOS = (order: Order) => {
    const pdfOrder: PDFOrder = {
      order_id: order.id,
      order_status: order.status,
      order_payment_method: order.payment_method,
      order_total: order.total,
      order_created_at: order.created_at,
      order_notes: order.notes || null,
      order_updated_at: order.updated_at || null,
      items: (order.items || []).map((item) => ({
        item_type: item.item_type,
        item_name: item.item_name,
        item_service_type: item.service_type,
        item_quantity: item.quantity,
        item_price: item.price,
        item_payment_status: item.payment_status,
        item_amount_paid: item.amount_paid,
        item_scheduled_date: item.scheduled_date || null,
        item_problem_description: item.problem_description,
        item_diagnosis: item.diagnosis,
        item_completed_at: item.completed_at,
        item_warranty_expires_at: item.warranty_expires_at,
        item_product_category: item.product_category,
        item_product_condition: item.product_condition,
        item_product_images: item.product_images || null,
        status: item.status || null,
        teste_equipamento_ligado: item.teste_equipamento_ligado,
        teste_funcao_principal: item.teste_funcao_principal,
        teste_funcoes_secundarias: item.teste_funcoes_secundarias,
        teste_pecas_substituidas: item.teste_pecas_substituidas,
        teste_funcionando_normalmente: item.teste_funcionando_normalmente,
        entrega_equipamento_entregue: item.entrega_equipamento_entregue,
        entrega_acessorios_conferidos: item.entrega_acessorios_conferidos,
        entrega_equipamento_testado: item.entrega_equipamento_testado,
        entrega_pagamento_registrado: item.entrega_pagamento_registrado,
        entrega_os_enviada: item.entrega_os_enviada,
        entrega_garantia_disponibilizada: item.entrega_garantia_disponibilizada,
        entrega_data: item.entrega_data,
        entrega_hora: item.entrega_hora,
      })),
    };

    const pdfCliente: PDFCliente = {
      nome: order.cliente?.nome || "Cliente não informado",
      cpf: order.cliente?.cpf || null,
      telefone: order.cliente?.telefone || null,
      whatsapp: null,
      email: order.cliente?.email || null,
      endereco: formatAddress(order.cliente?.endereco),
      forma_atendimento: null,
    };

    generateOSPDF(pdfOrder, pdfCliente, {
      nome: "A.R CONSERTOS",
      cnpj: "",
      endereco: "",
      telefone: "",
      email: "",
      site: "",
    });
  };

  const handlePrintItemOS = (order: Order, item: OrderItem) => {
    const pdfOrder: PDFOrder = {
      order_id: order.id,
      order_status: order.status,
      order_payment_method: order.payment_method,
      order_total: order.total,
      order_created_at: order.created_at,
      order_notes: order.notes || null,
      order_updated_at: order.updated_at || null,
      items: [],
    };

    const pdfItem: PDFOrderItem = {
      item_type: item.item_type,
      item_name: item.item_name,
      item_service_type: item.service_type,
      item_quantity: item.quantity,
      item_price: item.price,
      item_payment_status: item.payment_status,
      item_amount_paid: item.amount_paid,
      item_scheduled_date: item.scheduled_date || null,
      item_problem_description: item.problem_description,
      item_diagnosis: item.diagnosis,
      item_completed_at: item.completed_at,
      item_warranty_expires_at: item.warranty_expires_at,
      item_product_category: item.product_category,
      item_product_condition: item.product_condition,
      item_product_images: item.product_images || null,
      status: item.status || null,
      teste_equipamento_ligado: item.teste_equipamento_ligado,
      teste_funcao_principal: item.teste_funcao_principal,
      teste_funcoes_secundarias: item.teste_funcoes_secundarias,
      teste_pecas_substituidas: item.teste_pecas_substituidas,
      teste_funcionando_normalmente: item.teste_funcionando_normalmente,
      entrega_equipamento_entregue: item.entrega_equipamento_entregue,
      entrega_acessorios_conferidos: item.entrega_acessorios_conferidos,
      entrega_equipamento_testado: item.entrega_equipamento_testado,
      entrega_pagamento_registrado: item.entrega_pagamento_registrado,
      entrega_os_enviada: item.entrega_os_enviada,
      entrega_garantia_disponibilizada: item.entrega_garantia_disponibilizada,
      entrega_data: item.entrega_data,
      entrega_hora: item.entrega_hora,
    };

    const pdfCliente: PDFCliente = {
      nome: order.cliente?.nome || "Cliente não informado",
      cpf: order.cliente?.cpf || null,
      telefone: order.cliente?.telefone || null,
      whatsapp: null,
      email: order.cliente?.email || null,
      endereco: formatAddress(order.cliente?.endereco),
      forma_atendimento: null,
    };

    generateSingleItemOSPDF(pdfOrder, pdfItem, pdfCliente, {
      nome: "A.R CONSERTOS",
      cnpj: "",
      endereco: "",
      telefone: "",
      email: "",
      site: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-white">Pedidos</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie seus pedidos e ordens de serviço</p>
        </div>
        <Button
          onClick={() => setNewOrderDialogOpen(true)}
          className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Pedido
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, cliente, telefone..."
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
            Geral
          </Button>
          <Button
            onClick={() => setTypeFilter("servico")}
            className={`rounded-xl ${
              typeFilter === "servico"
                ? "bg-[#E30613] text-white"
                : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            }`}
          >
            <Wrench className="mr-1 h-3 w-3" />
            Serviços
          </Button>
          <Button
            onClick={() => setTypeFilter("produto")}
            className={`rounded-xl ${
              typeFilter === "produto"
                ? "bg-[#C9A84C] text-black"
                : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            }`}
          >
            <Package className="mr-1 h-3 w-3" />
            Produtos
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E30613] border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-12 text-center">
            <p className="text-white/50">Nenhum pedido encontrado</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const paymentSummary = getPaymentSummary(order.items || []);
            const isExpanded = expandedOrder === order.id;

            return (
              <div
                key={order.id}
                className="rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden"
              >
                {/* Order Card Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-white/[0.02]"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E30613]/10">
                      <span className="text-xs font-bold text-[#E30613]">
                        #{order.id.slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {order.cliente?.nome || "Cliente não vinculado"}
                      </p>
                      <p className="text-xs text-white/50">
                        {format(new Date(order.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Payment Summary */}
                    <div className="hidden sm:block text-right">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">{formatCurrency(paymentSummary.totalPago)}</span>
                      </div>
                      {paymentSummary.totalPendente > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-yellow-400" />
                          <span className="text-yellow-400">Pendente {formatCurrency(paymentSummary.totalPendente)}</span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    <button className="text-white/50 transition-transform">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-4">
                    {/* Client Info */}
                    {order.cliente && (
                      <div className="mb-4 flex flex-wrap gap-4 rounded-lg bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <User className="h-4 w-4" />
                          {order.cliente.nome}
                        </div>
                        {order.cliente.telefone && (
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Phone className="h-4 w-4" />
                            {order.cliente.telefone}
                          </div>
                        )}
                        {order.cliente.email && (
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Mail className="h-4 w-4" />
                            {order.cliente.email}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-3">
                      {(order.items || [])
                        .filter((item) => typeFilter === "all" || item.item_type === typeFilter)
                        .map((item) => {
                        const itemTotal = (item.price || 0) * item.quantity;
                        const itemPaid = item.amount_paid || 0;
                        const isPaid = item.payment_status === "pago";
                        const isPartial = item.payment_status === "pago_parcial";
                        const isCompleted = item.completed_at && item.item_type === "servico";

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border-l-4 bg-white/[0.02] p-3 ${getItemBorderColor(item)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  item.item_type === "servico"
                                    ? item.service_type === "inverter" ? "bg-[#8B5CF6]/20" : "bg-[#E30613]/20"
                                    : "bg-[#C9A84C]/20"
                                }`}>
                                  {item.item_type === "servico" ? (
                                    <Wrench className={`h-4 w-4 ${
                                      item.service_type === "inverter" ? "text-[#8B5CF6]" : "text-[#E30613]"
                                    }`} />
                                  ) : (
                                    <Package className="h-4 w-4 text-[#C9A84C]" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{item.item_name}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                                    <span>
                                      {item.item_type === "servico"
                                        ? item.service_type === "inverter" ? "Inverter" : "Convencional"
                                        : item.product_condition || "Produto"}
                                    </span>
                                    <span>x{item.quantity}</span>
                                    <span className="text-white">
                                      {item.price ? formatCurrency(itemTotal) : "Preço a definir"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Item Status */}
                                <Select
                                  value={item.status || "pendente"}
                                  onValueChange={(value) => updateItemStatus(item, value)}
                                >
                                  <SelectTrigger
                                    className="h-6 w-auto min-w-[90px] rounded-full border-0 px-2 py-0 text-[10px] font-bold"
                                    style={{
                                      backgroundColor: `${getStatusColor(item.status || "pendente").split(" ")[0].replace("bg-", "").replace("/20", "")}20`,
                                      color: getStatusColor(item.status || "pendente").split(" ")[1].replace("text-", ""),
                                    }}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                                    <SelectItem value="pendente" className="text-white text-xs">Pendente</SelectItem>
                                    <SelectItem value="aguardando_orcamento" className="text-white text-xs">Aguardando Orçamento</SelectItem>
                                    <SelectItem value="orcamento_enviado" className="text-white text-xs">Orçamento Enviado</SelectItem>
                                    <SelectItem value="confirmado" className="text-white text-xs">Confirmado</SelectItem>
                                    <SelectItem value="em_andamento" className="text-white text-xs">Em Andamento</SelectItem>
                                    <SelectItem value="pronta" className="text-white text-xs">Pronta</SelectItem>
                                    <SelectItem value="entregue" className="text-white text-xs">Entregue</SelectItem>
                                    <SelectItem value="concluido" className="text-white text-xs">Concluído</SelectItem>
                                    <SelectItem value="cancelado" className="text-white text-xs text-red-400">Cancelado</SelectItem>
                                  </SelectContent>
                                </Select>

                                {/* Payment Status */}
                                <>
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                      <CheckCircle className="h-3 w-3" />
                                      Pago
                                    </span>
                                  ) : isPartial ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
                                      Pago {formatCurrency(itemPaid)} | Falta {formatCurrency(itemTotal - itemPaid)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                                      <Clock className="h-3 w-3" />
                                      Pendente
                                    </span>
                                  )}
                                </>

                                {/* Actions */}
                                {item.item_type === "servico" && !isCompleted && (
                                  <button
                                    onClick={() => openCompleteServiceDialog(order, item)}
                                    className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
                                  >
                                    {item.price ? "Editar Dados" : "Incluir Dados"}
                                  </button>
                                )}
                                {item.item_type === "servico" && isCompleted && (
                                  <button
                                    onClick={() => openCompleteServiceDialog(order, item)}
                                    className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
                                  >
                                    Editar
                                  </button>
                                )}
                                {item.item_type === "produto" && !isCompleted && (
                                  <button
                                    onClick={() => openCompleteServiceDialog(order, item)}
                                    className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
                                  >
                                    {item.price ? "Editar Dados" : "Incluir Dados"}
                                  </button>
                                )}
                                {item.item_type === "produto" && isCompleted && (
                                  <button
                                    onClick={() => openCompleteServiceDialog(order, item)}
                                    className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
                                  >
                                    Editar
                                  </button>
                                )}
                                {!isPaid && item.price && (
                                  <button
                                    onClick={() => openPaymentDialog(order, item)}
                                    className="rounded bg-[#C9A84C]/20 px-2 py-1 text-xs text-[#C9A84C] hover:bg-[#C9A84C]/30"
                                  >
                                    Pagamento
                                  </button>
                                )}
                                {/* O.S. individual */}
                                <button
                                  onClick={() => handlePrintItemOS(order, item)}
                                  className="rounded bg-white/[0.06] px-2 py-1 text-xs text-white/60 hover:bg-white/[0.1] hover:text-white"
                                  title="Gerar O.S. deste item"
                                >
                                  📄 O.S.
                                </button>
                                {isCompleted && (
                                  <span className="text-xs text-green-400">
                                    Garantia até {format(new Date(item.warranty_expires_at!), "dd/MM/yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Service Photos */}
                            {item.item_type === "servico" && item.product_images && item.product_images.length > 0 && (
                              <div className="mt-2 flex gap-1.5">
                                {item.product_images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Foto ${idx + 1}`}
                                    className="h-14 w-14 rounded-lg object-cover border border-white/10"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Payment History */}
                            {item.payments && item.payments.length > 0 && (
                              <div className="mt-2 space-y-1 border-t border-white/[0.04] pt-2">
                                {item.payments.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatCurrency(p.amount)}</span>
                                    <span className="capitalize">{p.method}</span>
                                    <span>{format(new Date(p.date), "dd/MM HH:mm")}</span>
                                    {p.note && <span className="text-white/30">({p.note})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Status Change */}
                        <Select
                          value={order.status || "pendente"}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className={`w-36 rounded-lg border-0 text-xs font-medium ${getStatusColor(order.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10">
                            <SelectItem value="pendente" className="text-white">Pendente</SelectItem>
                            <SelectItem value="aguardando_orcamento" className="text-white">Aguardando Orçamento</SelectItem>
                            <SelectItem value="orcamento_enviado" className="text-white">Orçamento Enviado</SelectItem>
                            <SelectItem value="confirmado" className="text-white">Confirmado</SelectItem>
                            <SelectItem value="em_andamento" className="text-white">Em Andamento</SelectItem>
                            <SelectItem value="pronta" className="text-white">Pronta</SelectItem>
                            <SelectItem value="entregue" className="text-white">Entregue</SelectItem>
                            <SelectItem value="concluido" className="text-white">Concluído</SelectItem>
                            <SelectItem value="cancelado" className="text-white text-red-400">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintOS(order)}
                          className="flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">O.S. Geral</span>
                        </button>
                        <button
                          onClick={() => openDeleteOrderDialog(order)}
                          className="flex items-center gap-1 rounded-lg bg-[#E30613]/10 px-3 py-2 text-sm text-[#E30613] hover:bg-[#E30613]/20"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remover</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Order Dialog */}
      <Dialog open={newOrderDialogOpen} onOpenChange={setNewOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Pedido</DialogTitle>
            <DialogDescription className="text-white/60">
              Crie um novo pedido para um cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-3">
              <Label className="text-white/70">Cliente</Label>

              {!showNewClientForm ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente existente..."
                      className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                    />
                  </div>

                  {clientSearch && filteredClientes.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                      {filteredClientes.slice(0, 5).map((c) => (
                        <button
                          key={`cli-${c.id}`}
                          onClick={() => {
                            setSelectedCliente(c);
                            setClientSearch("");
                          }}
                          className={`w-full rounded-lg p-2 text-left transition-colors ${
                            selectedCliente?.id === c.id
                              ? "bg-[#E30613]/20 border border-[#E30613]/30"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <p className="text-sm text-white">{c.nome}</p>
                          <p className="text-xs text-white/50">{c.telefone || c.email}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {clientSearch && filteredProfiles.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                      <p className="px-2 py-1 text-[10px] text-white/30 uppercase">Perfis cadastrados</p>
                      {filteredProfiles.slice(0, 5).map((p) => {
                        const hasCliente = clientes.some((c) => c.user_id === p.id);
                        return (
                          <button
                            key={`prof-${p.id}`}
                            onClick={() => selectProfileAsClient(p)}
                            className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <div>
                              <p className="text-sm text-white">{p.full_name}</p>
                              <p className="text-xs text-white/50">{p.phone}</p>
                            </div>
                            {hasCliente ? (
                              <span className="text-[10px] text-green-400">Vinculado</span>
                            ) : (
                              <span className="text-[10px] text-[#C9A84C]">Criar cliente</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedCliente && (
                    <div className="flex items-center justify-between rounded-lg bg-[#E30613]/10 p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#E30613]" />
                        <span className="text-white">{selectedCliente.nome}</span>
                      </div>
                      <button
                        onClick={() => setSelectedCliente(null)}
                        className="text-white/50 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setShowNewClientForm(true)}
                    className="w-full rounded-lg border border-dashed border-white/20 py-2 text-sm text-white/50 hover:border-white/40 hover:text-white"
                  >
                    + Cadastrar novo cliente
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Novo Cliente</span>
                    <button
                      onClick={() => {
                        setShowNewClientForm(false);
                        setNewClientForm({ nome: "", telefone: "", email: "" });
                      }}
                      className="text-white/50 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    value={newClientForm.nome}
                    onChange={(e) => setNewClientForm({ ...newClientForm, nome: e.target.value })}
                    placeholder="Nome *"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newClientForm.telefone}
                      onChange={(e) => setNewClientForm({ ...newClientForm, telefone: e.target.value })}
                      placeholder="Telefone"
                      className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                    />
                    <Input
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      placeholder="Email"
                      className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add Services */}
            <div className="space-y-3">
              <Label className="text-white/70">Serviços</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Buscar ou digitar serviço..."
                  className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && serviceSearch.trim()) {
                      e.preventDefault();
                      parseItemsInput(serviceSearch, "servico");
                      setServiceSearch("");
                    }
                  }}
                />
              </div>

              {serviceSearch && filteredServices.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                  {filteredServices.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { addServiceToOrder(s); setServiceSearch(""); }}
                      className="flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="text-left">
                        <p className="text-sm text-white">{s.name}</p>
                        <p className="text-xs text-white/50">{s.category}</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        s.type === "inverter" ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "bg-[#E30613]/20 text-[#E30613]"
                      }`}>
                        {s.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Products */}
            <div className="space-y-3">
              <Label className="text-white/70">Produtos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && productSearch.trim()) {
                      e.preventDefault();
                      parseItemsInput(productSearch, "produto");
                      setProductSearch("");
                    }
                  }}
                />
              </div>

              {productSearch && filteredProducts.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                  {filteredProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { addProductToOrder(p); setProductSearch(""); }}
                      disabled={p.stock <= 0}
                      className="flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      <div className="text-left">
                        <p className="text-sm text-white">{p.name}</p>
                        <p className="text-xs text-white/50">{formatCurrency(p.price)}</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        p.stock <= 0 ? "bg-red-500/20 text-red-400" :
                        p.stock < 3 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>
                        {p.stock} un.
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/70">Itens do Pedido</Label>
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`flex items-center justify-between rounded-lg border-l-4 bg-white/[0.02] p-3 ${
                        item.type === "produto" ? "border-l-[#C9A84C]" :
                        item.serviceType === "inverter" ? "border-l-[#8B5CF6]" : "border-l-[#E30613]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === "servico" ? (
                          <Wrench className={`h-4 w-4 ${
                            item.serviceType === "inverter" ? "text-[#8B5CF6]" : "text-[#E30613]"
                          }`} />
                        ) : (
                          <Package className="h-4 w-4 text-[#C9A84C]" />
                        )}
                        <div>
                          <p className="text-sm text-white">{item.name}</p>
                          <p className="text-xs text-white/50">
                            {item.type === "servico" ? item.serviceType : "Produto"} x {item.quantity}
                            {item.price && ` = ${formatCurrency(item.price * item.quantity)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-6 w-6 rounded bg-white/[0.04] text-white/50 disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            disabled={item.type === "produto" && item.productStock !== undefined && item.quantity >= item.productStock}
                            className="h-6 w-6 rounded bg-white/[0.04] text-white/50 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeOrderItem(index)}
                          className="h-6 w-6 rounded bg-[#E30613]/20 text-[#E30613]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-white/70">Método de Pagamento</Label>
              <Select value={orderPaymentMethod || undefined} onValueChange={setOrderPaymentMethod}>
                <SelectTrigger className="rounded-xl border-white/10 bg-white/[0.02] text-white">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="dinheiro" className="text-white">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Dinheiro
                    </div>
                  </SelectItem>
                  <SelectItem value="pix" className="text-white">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" /> PIX
                    </div>
                  </SelectItem>
                  <SelectItem value="cartao" className="text-white">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Cartão
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/70">Observações</Label>
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Observações do pedido..."
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label className="text-white/70">Data de Início</Label>
              <Input
                type="date"
                value={orderScheduledDate}
                onChange={(e) => setOrderScheduledDate(e.target.value)}
                className="rounded-xl border-white/10 bg-white/[0.02] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewOrderDialogOpen(false);
                resetNewOrderForm();
              }}
              className="rounded-xl border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={saving}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              {saving ? "Criando..." : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Pagamento</DialogTitle>
            <DialogDescription className="text-white/60">
              Registre um novo pagamento para este item
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-white/[0.02] p-3">
                <p className="font-medium text-white">{selectedItem.item_name}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/50">
                  <span>Total: {formatCurrency((selectedItem.price || 0) * selectedItem.quantity)}</span>
                  <span>|</span>
                  <span>Pago: {formatCurrency(selectedItem.amount_paid || 0)}</span>
                  <span>|</span>
                  <span className="text-[#C9A84C]">
                    Falta: {formatCurrency((selectedItem.price || 0) * selectedItem.quantity - (selectedItem.amount_paid || 0))}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white/70">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Máximo: ${formatCurrency((selectedItem.price || 0) * selectedItem.quantity - (selectedItem.amount_paid || 0))}`}
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Método</Label>
                  <Select value={paymentMethod || undefined} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="rounded-xl border-white/10 bg-white/[0.02] text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      <SelectItem value="dinheiro" className="text-white">Dinheiro</SelectItem>
                      <SelectItem value="pix" className="text-white">PIX</SelectItem>
                      <SelectItem value="cartao" className="text-white">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Observação (opcional)</Label>
                  <Input
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Ex: Entrada, Pagamento parcial..."
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPayment}
              className="rounded-xl bg-[#E30613] text-white hover:bg-[#E30613]/90"
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Service Dialog */}
      <Dialog open={completeServiceDialogOpen} onOpenChange={setCompleteServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedItem?.item_type === "produto" ? "Dados do Produto" : (selectedItem?.completed_at ? "Editar Serviço" : "Dados do Serviço")}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedItem?.item_type === "produto"
                ? "Preencha os detalhes do produto"
                : (selectedItem?.completed_at
                  ? "Atualize os dados deste serviço concluído"
                  : "Preencha os detalhes do serviço")}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className={`rounded-lg p-3 ${selectedItem.item_type === "produto" ? "bg-[#C9A84C]/10" : "bg-[#E30613]/10"}`}>
                <p className="font-medium text-white">{selectedItem.item_name}</p>
                <p className="text-xs text-white/50">{selectedItem.item_type === "produto" ? "Produto" : `Serviço ${selectedItem.service_type}`}</p>
              </div>

              <div className="space-y-3">
                {/* Diagnóstico */}
                <div className="space-y-2">
                  <Label className="text-white/70">Diagnóstico *</Label>
                  <Textarea
                    value={serviceDiagnosis}
                    onChange={(e) => setServiceDiagnosis(e.target.value)}
                    placeholder="Descreva o diagnóstico do aparelho..."
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                    rows={3}
                  />
                </div>

                {/* Preço */}
                <div className="space-y-2">
                  <Label className="text-white/70">Preço do Serviço *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="0,00"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                  />
                </div>

                {/* Fotos */}
                <div className="space-y-2">
                  <Label className="text-white/70">Fotos do Aparelho</Label>
                  <div className="flex flex-wrap gap-2">
                    {servicePhotos.map((photo, idx) => (
                      <div key={idx} className="relative h-20 w-20">
                        <img
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="h-full w-full rounded-lg object-cover border border-white/10"
                        />
                        <button
                          onClick={() => handleRemoveServicePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {servicePhotos.length < 4 && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 hover:border-white/40 transition-colors">
                        {uploadingPhoto ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5 text-white/40" />
                            <span className="mt-1 text-[9px] text-white/40">Foto</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadServicePhoto}
                          disabled={uploadingPhoto}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30">Máximo 4 fotos</p>
                </div>

                {/* TESTE FINAL - só para serviços prontos/concluídos */}
                {selectedItem.item_type === "servico" && ["pronta", "concluido", "entregue"].includes(selectedItem.status || "pendente") && (
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <h4 className="font-semibold text-white mb-3">TESTE FINAL</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { key: "equipamentoLigado", label: "Equipamento ligado após reparo" },
                      { key: "funcaoPrincipal", label: "Função principal testada" },
                      { key: "funcoesSecundarias", label: "Funções secundárias testadas" },
                      { key: "pecasSubstituidas", label: "Peças substituídas testadas" },
                      { key: "funcionandoNormalmente", label: "Equipamento funcionando normalmente" },
                    ].map((item) => {
                      const key = item.key as keyof typeof testeFinal;
                      return (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testeFinal[key]}
                            onChange={(e) => setTesteFinal(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="h-4 w-4 rounded border-white/30 bg-white/[0.02] text-green-500 focus:ring-green-500"
                          />
                          <span className="text-xs text-white/80">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* ENTREGA DO EQUIPAMENTO - só para serviços prontos/concluídos */}
                {selectedItem.item_type === "servico" && ["pronta", "concluido", "entregue"].includes(selectedItem.status || "pendente") && (
                <div className="rounded-lg bg-green-500/10 p-3">
                  <h4 className="font-semibold text-white mb-3">ENTREGA DO EQUIPAMENTO</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
                    {[
                      { key: "equipamentoEntregue", label: "Equipamento entregue" },
                      { key: "acessoriosConferidos", label: "Acessórios conferidos" },
                      { key: "equipamentoTestado", label: "Equipamento testado" },
                      { key: "pagamentoRegistrado", label: "Pagamento registrado" },
                      { key: "osEnviada", label: "O.S. enviada ao cliente" },
                      { key: "garantiaDisponibilizada", label: "Garantia disponibilizada" },
                    ].map((item) => {
                      const key = item.key as keyof typeof entregaEquipamento;
                      return (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!entregaEquipamento[key]}
                            onChange={(e) => setEntregaEquipamento(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="h-4 w-4 rounded border-white/30 bg-white/[0.02] text-[#C9A84C] focus:ring-[#C9A84C]"
                          />
                          <span className="text-xs text-white/80">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/70">Data de entrega</Label>
                      <input
                        type="date"
                        value={entregaEquipamento.dataEntrega}
                        onChange={(e) => setEntregaEquipamento(prev => ({ ...prev, dataEntrega: e.target.value }))}
                        className="w-full rounded-xl border-white/10 bg-white/[0.02] p-2 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/70">Hora</Label>
                      <input
                        type="time"
                        value={entregaEquipamento.horaEntrega}
                        onChange={(e) => setEntregaEquipamento(prev => ({ ...prev, horaEntrega: e.target.value }))}
                        className="w-full rounded-xl border-white/10 bg-white/[0.02] p-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
                )}

                {!selectedItem.completed_at && selectedItem.item_type === "servico" && (
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <p className="text-xs text-blue-400">
                      Salve os dados primeiro. TESTE FINAL e ENTREGA aparecem quando o serviço estiver Pronto ou Concluído.
                    </p>
                  </div>
                )}
                {!selectedItem.completed_at && selectedItem.item_type === "produto" && (
                  <div className="rounded-lg bg-[#C9A84C]/10 p-3">
                    <p className="text-xs text-[#C9A84C]">
                      Preencha os dados do produto e clique em &quot;Salvar Dados&quot;.
                    </p>
                  </div>
                )}
                {selectedItem.completed_at && (
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <p className="text-xs text-green-400">
                      Serviço já concluído. Edite os dados se necessário.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCompleteServiceDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveServiceDetails}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-600/90"
            >
              Salvar Dados
            </Button>
            {!selectedItem?.completed_at && (
              <Button
                onClick={handleCompleteService}
                className="rounded-xl bg-green-500 text-white hover:bg-green-500/90"
              >
                Concluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation */}
      <AlertDialog open={deleteOrderDialogOpen} onOpenChange={setDeleteOrderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Pedido</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir este pedido? O estoque de produtos será restaurado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-white/70">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
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
