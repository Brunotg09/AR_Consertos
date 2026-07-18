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
} from "lucide-react";
import { supabase, withTimeout } from "@/lib/supabase";
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
import { generateOSPDF } from "@/lib/generateOSPDF";

// Types
interface Cliente {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  endereco: { cidade?: string; estado?: string } | null;
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
  payments: { date: string; amount: number; method: string; note?: string }[];
  amount_paid: number;
  scheduled_date: string | null;
  problem_description: string | null;
  diagnosis: string | null;
  completed_at: string | null;
  warranty_expires_at: string | null;
  product_category: string | null;
  product_condition: string | null;
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
          .select("id, nome, telefone, email, cpf, endereco")
          .order("nome"),
        8000,
        { data: [], error: null }
      );
      setClientes(result.data || []);
    } catch {
      setClientes([]);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
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

  useEffect(() => {
    fetchOrders();
    fetchClientes();
    fetchProducts();
  }, [fetchOrders, fetchClientes, fetchProducts]);

  // Filtered lists
  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.cliente?.nome?.toLowerCase().includes(searchLower) ||
      order.cliente?.telefone?.includes(search) ||
      order.cliente?.email?.toLowerCase().includes(searchLower)
    );
  });

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.telefone?.includes(clientSearch) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

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
      confirmado: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      em_andamento: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      concluido: "bg-green-500/20 text-green-400 border-green-500/30",
      cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

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

      // Create new client if needed
      if (!clienteId && showNewClientForm) {
        const { data: newClient, error: clientError } = await supabase
          .from("clientes")
          .insert([{
            nome: newClientForm.nome,
            telefone: newClientForm.telefone || null,
            email: newClientForm.email || null,
          }])
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

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          cliente_id: clienteId,
          status: "pendente",
          payment_method: orderPaymentMethod || null,
          total,
          notes: orderNotes || null,
        }])
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        service_type: item.serviceType || null,
        quantity: item.quantity,
        price: item.price,
        payment_method: orderPaymentMethod || null,
        payment_status: item.type === "produto" ? "pago" : "pendente",
        amount_paid: item.type === "produto" && item.price ? item.price * item.quantity : 0,
        product_category: item.type === "produto" ? products.find(p => p.id.toString() === item.id)?.category : null,
        product_condition: item.type === "produto" ? products.find(p => p.id.toString() === item.id)?.condition : null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Decrement stock for products
      for (const item of orderItems) {
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
    setCompleteServiceDialogOpen(true);
  };

  const handleCompleteService = async () => {
    if (!selectedItem || !selectedOrder) return;

    if (!serviceDiagnosis.trim()) {
      toast.error("Diagnóstico é obrigatório");
      return;
    }

    if (!servicePrice || parseFloat(servicePrice) <= 0) {
      toast.error("Preço do serviço é obrigatório");
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
          completed_at: completedAt.toISOString(),
          warranty_expires_at: warrantyExpires.toISOString(),
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

      toast.success("Serviço concluído");
      setCompleteServiceDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error completing service:", error);
      toast.error("Erro ao concluir serviço");
    }
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

  const handlePrintOS = (order: Order) => {
    const pdfData = {
      order_id: order.id,
      order_status: order.status,
      order_payment_method: order.payment_method,
      order_total: order.total,
      order_created_at: order.created_at,
      items: (order.items || []).map((item) => ({
        item_type: item.item_type,
        item_name: item.item_name,
        item_service_type: item.service_type,
        item_quantity: item.quantity,
        item_price: item.price,
        item_payment_status: item.payment_status,
        item_amount_paid: item.amount_paid,
        item_problem_description: item.problem_description,
        item_diagnosis: item.diagnosis,
        item_completed_at: item.completed_at,
        item_warranty_expires_at: item.warranty_expires_at,
        item_product_category: item.product_category,
        item_product_condition: item.product_condition,
      })),
    };

    generateOSPDF(pdfData, order.cliente?.nome || "Cliente");
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID, cliente, telefone..."
          className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white placeholder:text-white/30"
        />
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
                      {order.items?.map((item) => {
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

                              <div className="flex items-center gap-2">
                                {/* Payment Status */}
                                {item.item_type === "servico" && (
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
                                )}

                                {/* Actions */}
                                {item.item_type === "servico" && !isCompleted && item.price && (
                                  <button
                                    onClick={() => openCompleteServiceDialog(order, item)}
                                    className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400 hover:bg-green-500/30"
                                  >
                                    Concluir
                                  </button>
                                )}
                                {item.item_type === "servico" && !isPaid && item.price && (
                                  <button
                                    onClick={() => openPaymentDialog(order, item)}
                                    className="rounded bg-[#C9A84C]/20 px-2 py-1 text-xs text-[#C9A84C] hover:bg-[#C9A84C]/30"
                                  >
                                    Pagamento
                                  </button>
                                )}
                                {isCompleted && (
                                  <span className="text-xs text-green-400">
                                    Garantia até {format(new Date(item.warranty_expires_at!), "dd/MM/yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>

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
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className={`w-36 rounded-lg border-0 text-xs font-medium ${getStatusColor(order.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10">
                            <SelectItem value="pendente" className="text-white">Pendente</SelectItem>
                            <SelectItem value="confirmado" className="text-white">Confirmado</SelectItem>
                            <SelectItem value="em_andamento" className="text-white">Em Andamento</SelectItem>
                            <SelectItem value="concluido" className="text-white">Concluído</SelectItem>
                            <SelectItem value="cancelado" className="text-white text-red-400">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePrintOS(order)}
                          className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/70 hover:bg-white/[0.08]"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">Imprimir O.S.</span>
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
                          key={c.id}
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
                  placeholder="Buscar serviço..."
                  className="rounded-xl border-white/10 bg-white/[0.02] pl-10 text-white"
                />
              </div>

              {serviceSearch && filteredServices.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                  {filteredServices.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addServiceToOrder(s)}
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
                />
              </div>

              {productSearch && filteredProducts.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] p-2">
                  {filteredProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToOrder(p)}
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
              <Select value={orderPaymentMethod} onValueChange={setOrderPaymentMethod}>
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
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Concluir Serviço</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-[#E30613]/10 p-3">
                <p className="font-medium text-white">{selectedItem.item_name}</p>
                <p className="text-xs text-white/50">Serviço {selectedItem.service_type}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white/70">Diagnóstico *</Label>
                  <Textarea
                    value={serviceDiagnosis}
                    onChange={(e) => setServiceDiagnosis(e.target.value)}
                    placeholder="Descreva o diagnóstico do aparelho..."
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Preço do Serviço *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="0,00"
                    className="rounded-xl border-white/10 bg-white/[0.02] text-white"
                    required
                  />
                </div>

                <div className="rounded-lg bg-green-500/10 p-3">
                  <p className="text-xs text-green-400">
                    Ao concluir, o serviço receberá garantia de 90 dias automáticamenta calculada.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteServiceDialogOpen(false)}
              className="rounded-xl border-white/10 text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteService}
              className="rounded-xl bg-green-500 text-white hover:bg-green-500/90"
            >
              Concluir Serviço
            </Button>
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
